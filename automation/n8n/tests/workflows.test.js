'use strict'

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { buildWorkflow, errorWorkflow } = require('../build-workflows')

const repo = path.resolve(__dirname, '../../..')
const read = file => readFileSync(path.join(repo, file), 'utf8')
const build = JSON.parse(read('automation/n8n/build-llms-workflow.json'))
const errors = JSON.parse(read('automation/n8n/error-workflow.json'))
const sha = '3'.repeat(40)
const tree = '4'.repeat(40)
const filenames = ['llms.txt', 'llms-full.txt']
const executions = [build, errors]
const sandbox = [
  'Object.getPrototypeOf = () => ({})',
  'Reflect.getPrototypeOf = () => ({})',
  'Object.setPrototypeOf = () => false',
  'Reflect.setPrototypeOf = () => false',
  'Object.defineProperty = () => ({})',
  'Object.defineProperties = () => ({})',
  'Object.freeze(Object)',
].join('\n')

function fixture(options = {}) {
  const config = JSON.parse(read('config/llms-config.json'))
  const company = config.documents.find(doc => doc.path === 'knowledge/company.md')
  const cloud = config.documents.find(doc => doc.path === 'knowledge/cloud.md')
  company.approved = cloud.approved = options.approved !== false
  company.publicUrl = 'https://mniconsult.ch/'
  Object.assign(config.deployment, { enabled: true, remoteDirectory: '/web', privateDirectory: '/workspace',
    providerRenameVerified: true, allowFirstInstallation: Boolean(options.first) })
  config.monitoring.singleWriterVerified = true
  const original = Object.fromEntries(filenames.map(file => ['/web/' + file, Buffer.from('# Alter Stand – ' + file + '\n')]))
  const remote = new Map(options.first ? [] : Object.entries(original))
  if (options.pending) remote.set('/workspace/mni-llms-pending-3.json', Buffer.from('{}'))
  const events = []
  const log = []
  const byName = new Map(build.nodes.map(node => [node.name, node]))
  const runData = new Map()
  const mode = options.mode ?? 'trigger'
  let probes = 0

  const context = (input, index = 0) => ({
    Buffer,
    console: { log: message => log.push(message) },
    $input: { all: () => input, first: () => input[0] },
    $: name => ({
      first: () => runData.get(name)[0],
      all: () => runData.get(name),
      get item() { return runData.get(name)[input[index].pairedItem?.item ?? index] },
      get isExecuted() { return runData.has(name) },
    }),
    $mode: mode,
    $execution: { id: '41', mode: mode === 'manual' ? 'test' : 'production' },
    $json: input[index]?.json,
    helpers: {
      getBinaryDataBuffer: async (itemIndex, field) => input[itemIndex].binary[field],
    },
  })
  const evaluate = (value, input, index) => typeof value === 'string' && value.startsWith('={{ ')
    ? vm.runInNewContext(value.slice(4, -3), context(input, index)) : value
  const reply = (i, statusCode, type, data) => ({
    json: { statusCode, headers: { 'content-type': type } },
    pairedItem: { item: i }, binary: { data: Buffer.from(data || '') },
  })

  function http(node, input) {
    const json = value => JSON.stringify(value)
    return input.map((item, index) => {
      const url = new URL(evaluate(node.parameters.url, input, index))
      events.push(['http', node.parameters.method, url.pathname, url.search])
      if (url.hostname === 'api.github.com') {
        const githubPath = url.pathname
        if (githubPath.endsWith('/commits/main')) {
          return reply(index, 200, 'application/json', json({sha, commit: {tree: {sha: tree}}}))
        }
        if (githubPath.endsWith('/git/trees/' + tree)) {
          assert.equal(url.searchParams.get('recursive'), '1')
          const entries = ['config/llms-config.json', company.path, cloud.path].map(file => ({
            path: file, type: 'blob', mode: file === cloud.path && options.symlink ? '120000' : '100644', sha,
            size: Buffer.byteLength(file.startsWith('config/') ? json(config) : read(file)),
          }))
          return reply(index, 200, 'application/json', json({sha: tree, truncated: Boolean(options.truncatedTree), tree: entries}))
        }
        assert.equal(url.searchParams.get('ref'), sha)
        if (githubPath.endsWith('/config/llms-config.json')) return reply(index, 200, 'application/json', json(config))
        const filename = githubPath.slice(githubPath.indexOf('/knowledge/') + 1)
        if (options.missingDocument && filename.endsWith('/cloud.md')) return reply(index, 404)
        if (options.retry && filename.endsWith('/cloud.md') && probes++ === 0) return reply(index, 503)
        return reply(index, 200, 'text/plain', read(filename) + (options.wrongSize ? 'x' : ''))
      }
      if (node.parameters.method === 'HEAD') return reply(index, 200, 'text/html')
      const live = '/web' + url.pathname
      if (options.publicMismatch && url.search.includes('-publish') && live.endsWith('/llms-full.txt')) {
        return reply(index, 200, 'text/plain', 'CDN: alter Text')
      }
      const fromCache = options.rollbackOriginMismatch && url.search.includes('-rollback')
      const data = fromCache ? original[live] : remote.get(live)
      return data ? reply(index, 200, 'text/plain; charset=utf-8', data) : reply(index, 404)
    })
  }

  function ftp(node, input) {
    const param = node.parameters
    const result = (json, index, binary) => ({json, pairedItem: {item: index}, ...(binary && {binary})})
    return input.flatMap((item, index) => {
      const field = field => evaluate(param[field], input, index)
      const name = field('path') ?? field('oldPath')
      const target = field('newPath')
      assert.equal(mode, 'trigger')
      assert.ok(name?.startsWith('/web') || name?.startsWith('/workspace'))
      events.push(['sftp', param.operation, name, target])
      const failed = () => result({error: 'Fixture non-production error'}, index)
      switch (param.operation) {
        case 'list': {
          const listing = [...remote.keys()].filter(file => path.dirname(file) === name)
            .map(file => result({name: path.basename(file), type: '-', path: file}, index))
          return listing.length ? listing : [{json: {}}]
        }
        case 'download': {
          if (!remote.has(name)) return failed()
          if (options.badStage && name.endsWith('.staging')) {
            return result(item.json, index, {data: Buffer.from('schadhafte Übertragung')})
          }
          return result(item.json, index, {data: remote.get(name)})
        }
        case 'upload': {
          if (options.stageUploadError && name.endsWith('llms-full.txt.41.staging')) return failed()
          if (options.restoreUploadError && name.endsWith('llms-full.txt.41.restore')) return failed()
          remote.set(name, param.binaryData ? item.binary.data : Buffer.from(item.json.content))
          return result(item.json, index)
        }
        case 'rename': {
          if (!remote.has(name)) return failed()
          if (options.activationError && name.endsWith('llms-full.txt.41.staging')) return failed()
          if (options.restoreError && name.endsWith('llms.txt.41.restore')) return failed()
          if (options.rollbackOriginMismatch && name.endsWith('llms.txt.41.restore')) return result({success: true}, index)
          remote.set(target, remote.get(name))
          remote.delete(name)
          return result({success: true}, index)
        }
        case 'delete': {
          if (!remote.delete(name)) return failed()
          return result({success: true}, index)
        }
        default: throw new Error('Unexpected FTP operation ' + param.operation)
      }
    })
  }

  async function run() {
    const initial = mode === 'manual' ? 'Manueller Start' : 'Täglicher Zeitplan'
    const pending = [[initial, [{json: {}}]]]
    while (pending.length) {
      const [name, input] = pending.shift()
      assert.equal(runData.has(name), false, 'Node executes at most once')
      const node = byName.get(name)
      let output = input
      let port = 0
      switch (node.type.split('.').at(-1)) {
        case 'manualTrigger': case 'scheduleTrigger': case 'wait': break
        case 'code': {
          // The runner uses a hardened VM context. Binary access is modelled by the n8n helper.
          output = await vm.runInNewContext(sandbox + '\n(async function() {\n' + node.parameters.jsCode + '\n})()',
            context(input), { filename: name })
          break
        }
        case 'if': {
          assert.equal(input.length, 1)
          port = evaluate(node.parameters.conditions.conditions[0].leftValue, input, 0) ? 0 : 1
          break
        }
        case 'httpRequest': output = http(node, input); break
        case 'ftp': output = ftp(node, input); break
        case 'convertToFile':
          output = input.map((item, index) => ({ json: {}, binary: { data: Buffer.from(item.json.content) }, pairedItem: {item: index} }))
          break
        default: throw new Error('Unexpected runtime node ' + node.type)
      }
      runData.set(name, output)
      const targets = build.connections[name]?.main[port] || []
      for (const { node } of targets) pending.push([node, output])
    }
    return [...runData.values()].at(-1)[0].json
  }
  return { run, runData, events, remote, original, log, config }
}

test('Workflow-Exporte sind reproduzierbar, inaktiv und intern vollständig verbunden', () => {
  assert.deepEqual(build, buildWorkflow().data)
  assert.deepEqual(errors, errorWorkflow(build).data)
  assert.equal(build.nodes.find(node => node.type.endsWith('.scheduleTrigger')).disabled, true)
  for (const workflow of executions) {
    assert.equal(workflow.active, false)
    const names = new Set(workflow.nodes.map(node => node.name))
    assert.equal(names.size, workflow.nodes.length)
    assert.equal(new Set(workflow.nodes.map(node => node.id)).size, workflow.nodes.length)
    const allowed = new Set(['manualTrigger', 'scheduleTrigger', 'httpRequest', 'code', 'wait', 'if',
      'convertToFile', 'ftp', 'errorTrigger', 'emailSend'])
    for (const node of workflow.nodes) {
      assert.ok(node.type.startsWith('n8n-nodes-base.') && allowed.has(node.type.split('.').at(-1)))
      assert.equal(node.credentials, undefined)
      if (node.type.endsWith('.emailSend')) assert.equal(node.disabled, true)
      if (node.type.endsWith('.code')) new vm.Script('(async function() {\n' + node.parameters.jsCode + '\n})()')
      if (node.type.endsWith('.ftp')) {
        assert.equal(node.parameters.protocol, 'sftp')
        assert.equal(node.retryOnFail, undefined)
        const key = node.parameters.operation === 'rename' ? 'oldPath' : 'path'
        assert.match(node.parameters[key], /\$mode === "trigger"/u)
      }
    }
    const nodes = new Map(workflow.nodes.map(node => [node.name, node]))
    const roots = workflow.nodes.filter(node => node.type.endsWith('Trigger')).map(node => node.name)
    const terminals = new Set(workflow === build
      ? ['Ohne Freigabe beenden', 'Trockenlauf oder Vergleich abschliessen', 'Erfolgsbericht ausgeben',
        'Rollback verifizieren und Fehler melden']
      : ['Fehlerbericht ausgeben'])
    const visited = new Set()
    const active = new Set()
    function visit(name) {
      assert.ok(!active.has(name), 'Zyklus bei ' + name)
      if (visited.has(name)) return
      active.add(name)
      const outputs = workflow.connections[name]?.main || []
      const expected = terminals.has(name) ? 0 : nodes.get(name).type.endsWith('.if') ? 2 : 1
      assert.equal(outputs.length, expected, name)
      for (const output of outputs) {
        assert.ok(output.length, 'Fehlender Ausgang bei ' + name)
        assert.equal(output.length, new Set(output.map(connection => connection.node)).size)
        for (const connection of output) {
          assert.equal(connection.type, 'main')
          visit(connection.node)
        }
      }
      active.delete(name)
      visited.add(name)
    }
    for (const [from, { main }] of Object.entries(workflow.connections)) {
      assert.ok(names.has(from))
      assert.ok(main.flat().every(connection => names.has(connection.node) && connection.index === 0))
    }
    roots.forEach(visit)
    assert.deepEqual(visited, names)
  }
})

test('Ein SMTP-Versand ohne Annahmebestätigung wird nicht als gesendet protokolliert', async () => {
  const node = errors.nodes.find(node => node.name === 'Fehlerbericht ausgeben')
  const runReport = async response => {
    const rows = await vm.runInNewContext('(async function() {\n' + node.parameters.jsCode + '\n})()', {
      $: () => ({first: () => ({json: {result: {}, shouldSend: true}})}),
      $input: {first: () => ({json: response})},
      console: {log() {}},
    })
    return rows[0].json.notification
  }
  assert.equal(await runReport({shouldSend: true}), 'failed')
  assert.equal(await runReport({accepted: []}), 'failed')
  assert.equal(await runReport({accepted: ['fixture@example.test']}), 'sent')
})

test('Lauf ohne Freigaben fordert nur Commit, Baum und Konfiguration an', async () => {
  const f = fixture({approved: false, mode: 'manual'})
  assert.equal((await f.run()).status, 'no-approved-documents')
  assert.equal(f.events.length, 3)
})

test('SFTP-Pfadausdrücke sperren manuelle und abweichende Ausführungen', () => {
  const node = build.nodes.find(node => node.name === 'Privates SFTP-Verzeichnis lesen')
  const source = node.parameters.path.slice(4, -3)
  const plan = {executionId: '41', paths: {privateDirectory: '/workspace'}}
  const base = {$: () => ({first: () => ({json: plan})}), $execution: {id: '41'}}
  assert.equal(vm.runInNewContext(source, {...base, $mode: 'trigger'}), '/workspace')
  assert.throws(() => vm.runInNewContext(source, {...base, $mode: 'manual'}), /SFTP path unavailable/u)
  assert.throws(() => vm.runInNewContext(source, {...base, $mode: 'trigger', $execution: {id: '42'}}), /SFTP path unavailable/u)
})

test('Abgeschnittene Bäume und Symlinks sperren GitHub-Inhaltsanfragen', async () => {
  for (const [options, error] of [[{truncatedTree: true}, /invalid_git_tree/u],
    [{symlink: true}, /invalid_source_entry.*knowledge\/cloud.md/u]]) {
    const f = fixture(options)
    await assert.rejects(f.run(), error)
    assert.ok(f.events.every(([, , pathname]) => !pathname.includes('/contents/knowledge/')))
  }
})

test('Raw-Inhalte müssen die Dateigrösse aus dem gepinnten Baum einhalten', async () => {
  const f = fixture({wrongSize: true})
  await assert.rejects(f.run(), /source_invalid_or_too_large/u)
  assert.equal(f.runData.has('Beide LLM-Dateien generieren'), false)
})

test('Manueller Lauf erzeugt beide Dateien, selbst mit aktiver Konfiguration ohne SFTP', async () => {
  const f = fixture({mode: 'manual', retry: true})
  const result = await f.run()
  assert.equal(result.status, 'not-deployed')
  assert.equal(result.validation.full, 2)
  assert.equal(result.validation.indexed, 1)
  assert.ok(result.reasons.includes('manual_test'))
  assert.ok(f.runData.has('GitHub-Dokumente Backoff · 1'))
  assert.equal(f.events.filter(([type]) => type === 'sftp').length, 0)
})

test('Fehlende GitHub-Dokumente brechen ab, ohne Ausgaben oder SFTP zu erreichen', async () => {
  const f = fixture({missingDocument: true})
  await assert.rejects(f.run(), /github_http_404.*knowledge\/cloud.md/u)
  assert.equal(f.runData.has('Beide LLM-Dateien generieren'), false)
  assert.ok(f.events.every(([type]) => type === 'http'))
})

test('Geplanter Lauf verifiziert Sicherung, Staging, Marker und veröffentlicht beide Dateien', async () => {
  const f = fixture()
  const result = await f.run()
  assert.equal(result.status, 'published')
  assert.equal(result.notification, 'disabled')
  const generated = f.runData.get('Beide LLM-Dateien generieren')[0].json.outputs
  for (const file of filenames) {
    assert.deepEqual(f.remote.get('/web/' + file), Buffer.from(generated[file]))
    assert.deepEqual(f.remote.get('/workspace/' + file + '.41.bak'), f.original['/web/' + file])
  }
  assert.equal(f.remote.has('/workspace/mni-llms-pending-41.json'), false)
  assert.ok(f.log.some(line => line.includes('"status":"published"')))
})

test('Fehler beim Vorbereiten der SFTP-Dateien lassen die Live-Dateien unberührt', async () => {
  for (const [options, error] of [[{stageUploadError: true}, /staging_upload_failed/u],
    [{badStage: true}, /byte_comparison_failed/u], [{restoreUploadError: true}, /restore_copy_upload_failed/u]]) {
    const f = fixture(options)
    await assert.rejects(f.run(), error)
    assert.deepEqual(Object.fromEntries([...f.remote].filter(([key]) => key.startsWith('/web/'))), f.original)
    assert.equal(f.events.some(([, op]) => op === 'rename'), false)
  }
})

test('Fehler beim zweiten Rename und HTTP-Fehler stellen den vorherigen Stand wieder her', async () => {
  for (const options of [{activationError: true}, {publicMismatch: true}]) {
    const f = fixture(options)
    await assert.rejects(f.run(), /failed-marker-pending.*restored/u)
    assert.deepEqual(Object.fromEntries([...f.remote].filter(([key]) => key.startsWith('/web/'))), f.original)
    assert.equal(f.remote.has('/workspace/mni-llms-pending-41.json'), true)
    for (const file of filenames) {
      assert.deepEqual(f.remote.get('/workspace/' + file + '.41.bak'), f.original['/web/' + file])
    }
  }
})

test('Rollback gilt erst nach bestätigtem SFTP-Ursprung trotz alter HTTP-Cacheantwort', async () => {
  const f = fixture({activationError: true, rollbackOriginMismatch: true})
  await assert.rejects(f.run(), /verification-failed/u)
  assert.equal(f.remote.has('/workspace/mni-llms-pending-41.json'), true)
})

test('Fehler beim Rollback und alter Transaktionsmarker sperren weitere Veröffentlichungen', async () => {
  const broken = fixture({activationError: true, restoreError: true})
  await assert.rejects(broken.run(), /manual-recovery-required/u)
  assert.equal(broken.remote.has('/workspace/mni-llms-pending-41.json'), true)
  const pending = fixture({pending: true})
  await assert.rejects(pending.run(), /previous_deployment_pending/u)
  assert.equal(pending.events.some(([, op]) => op === 'upload'), false)
})

test('Erstinstallation erlaubt zwei 404 und Rollback entfernt nur die eigenen Dateien', async () => {
  const ok = fixture({first: true})
  assert.equal((await ok.run()).firstInstallation, true)
  const bad = fixture({first: true, activationError: true})
  await assert.rejects(bad.run(), /failed-marker-pending.*restored/u)
  assert.equal([...bad.remote.keys()].filter(key => key.startsWith('/web/')).length, 0)
  assert.equal(bad.events.filter(([, op, name]) => op === 'delete' && name.startsWith('/web/')).length, 1)
})
