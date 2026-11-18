'use strict'

const assert = require('node:assert/strict')
const { readFileSync, readdirSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const { parseConfig, approvedDocuments, fail } = require('../modules/parse-config')
const { decodeGitHub, decodeUtf8, responseDecision } = require('../modules/github-content')
const { processMarkdown, stripFrontmatter } = require('../modules/process-markdown')
const { buildLlms } = require('../modules/build-llms')
const { validateOutput, comparePublic } = require('../modules/validate-output')
const { deploymentDecision, deploymentPaths, inspectRemote, operationResult,
  compareDelivery, recoveryResult } = require('../modules/deployment')
const { errorReport } = require('../modules/monitoring')

const sha = '7'.repeat(40)
const repo = path.resolve(__dirname, '../../..')
const read = filename => readFileSync(path.join(repo, filename), 'utf8')
const load = () => parseConfig(read('config/llms-config.json'), sha)
const parse = config => parseConfig(JSON.stringify(config), sha)
const selected = (config, name) => config.documents.find(doc => doc.path === 'knowledge/' + name + '.md')
const activate = (config, name, url = null) => Object.assign(selected(config, name), { approved: true, publicUrl: url })
const processDocs = (config, override = {}) => approvedDocuments(config)
  .map(doc => processMarkdown(override[doc.path] ?? read(doc.path), doc, config.documents, sha))
const build = config => buildLlms(config, processDocs(config), sha)
const references = (status, text = null) => ({ 'llms.txt': { status, text }, 'llms-full.txt': { status, text } })

test('Produktionskatalog enthält alle Knowledge-Dateien und keine Freigabe', () => {
  const config = load()
  const docs = readdirSync(path.join(repo, 'knowledge')).filter(file => file.endsWith('.md'))
  assert.deepEqual(config.documents.map(doc => doc.path).sort(), docs.map(doc => 'knowledge/' + doc).sort())
  assert.equal(docs.length, 17)
  assert.equal(config.deployment.enabled, false)
  assert.equal(config.deployment.remoteDirectory, null)
  assert.equal(config.deployment.privateDirectory, null)
  assert.equal(config.monitoring.minimumSizeRatio, 0.5)
  assert.deepEqual(approvedDocuments(config), [])
  for (const doc of config.documents) {
    assert.equal(doc.publicUrl, null)
    assert.equal(stripFrontmatter(read(doc.path)).data.title, doc.title)
  }
})

test('Fehlerhafte JSON-, Typ- und Schemastrukturen werden abgelehnt', () => {
  for (const invalid of ['{', 'null', '[]', '{}']) assert.throws(() => parseConfig(invalid, sha), /Konfiguration/)
  const config = load()
  config.generation.includeUnapproved = true
  assert.throws(() => parse(config), /invalid_config/)
  config.generation.includeUnapproved = false
  config.documents[0].approved = 'false'
  assert.throws(() => parse(config), /invalid_boolean/)
})

test('Doppelte Pfade, Reihenfolgen und URLs werden abgelehnt', () => {
  const config = load()
  config.documents.unshift({ ...config.documents[0], order: 999 })
  assert.throws(() => parse(config), /duplicate_document_path_or_order/)
  config.documents.shift()
  config.documents[0].order = config.documents[1].order
  assert.throws(() => parse(config), /duplicate_document_path_or_order/)
  const duplicate = load()
  activate(duplicate, 'company', 'https://mniconsult.ch')
  activate(duplicate, 'cloud', 'https://mniconsult.ch/')
  assert.throws(() => parse(duplicate), /duplicate_public_url/)
})

test('Traversal, interne Freigaben und gefährliche URL-Formate werden abgelehnt', () => {
  for (const filename of ['knowledge/../company.md', 'knowledge/%2E%2E/file.md', '/knowledge/company.md', 'knowledge/company.txt']) {
    const config = load()
    config.documents[0].path = filename
    assert.throws(() => parse(config), /invalid_document_path/)
  }
  for (const name of ['avatar', 'roadmap', 'index']) {
    const config = load()
    activate(config, name).includeFullText = true
    assert.throws(() => parse(config), /forbidden_approval/)
  }
  for (const url of ['http://mniconsult.ch/', 'https://mniconsult.ch.evil.test/', 'https://mniconsult.ch@evil.test/',
    'https://mniconsult.ch/private', 'https://127.0.0.1/', 'https://mniconsult.ch/?token=x']) {
    const config = load()
    activate(config, 'company', url)
    assert.throws(() => parse(config), /invalid_public_url/)
  }
})

test('SFTP-Freigabe benötigt geprüften Schreiber, getrennte Pfade und Rename-Abnahme', () => {
  const config = load()
  config.deployment.enabled = true
  assert.throws(() => parse(config), /deployment_prerequisites/)
  Object.assign(config.deployment, { remoteDirectory: '/web', privateDirectory: '/web/private', providerRenameVerified: true })
  config.monitoring.singleWriterVerified = true
  assert.throws(() => parse(config), /deployment_prerequisites/)
  config.deployment.privateDirectory = '/private'
  assert.equal(parse(config).deployment.enabled, true)
})

test('UTF-8, Raw und Base64 werden geprüft, inklusive Grössengrenze', () => {
  const name = 'knowledge/company.md'
  const bytes = Buffer.from('Zürich – Cloud · Bühne 🙂', 'utf8')
  const body = { type: 'file', path: name, sha, encoding: 'base64', size: bytes.length, content: bytes.toString('base64') }
  const wrapped = data => decodeGitHub(Buffer.from(JSON.stringify(data)), { 'content-type': 'application/json' }, name, 100, sha)
  assert.equal(wrapped(body), 'Zürich – Cloud · Bühne 🙂')
  assert.equal(decodeGitHub(bytes, { 'content-type': 'text/plain' }, name, 100, sha), bytes.toString('utf8'))
  for (const change of [{ path: 'knowledge/cloud.md' }, { size: bytes.length - 1 }, { encoding: 'none' }, { content: body.content + '!' }]) {
    assert.throws(() => wrapped({ ...body, ...change }), /source_invalid_or_too_large/)
  }
  assert.throws(() => decodeGitHub(bytes, {}, name, bytes.length - 1, sha), /source_invalid_or_too_large/)
  assert.throws(() => decodeUtf8(Buffer.from([0xc3, 0x28])), /invalid_utf8/)
})

test('GitHub-Fehler werden klassifiziert und Backoff bleibt begrenzt', () => {
  for (const statusCode of [401, 403, 404]) {
    assert.deepEqual(responseDecision({ statusCode }, 0, 0),
      { ok: false, type: 'github_http_' + statusCode, retryIn: null })
  }
  assert.deepEqual(responseDecision({ statusCode: 200 }, 0, 0), { ok: true })
  assert.equal(responseDecision({ statusCode: 503 }, 0, 0).retryIn, 1)
  assert.equal(responseDecision({ statusCode: 503 }, 1, 0).retryIn, 2)
  assert.equal(responseDecision({ statusCode: 503 }, 2, 0).retryIn, null)
  assert.equal(responseDecision({ statusCode: 429 }, 0, 0).retryIn, null)
  assert.equal(responseDecision({ statusCode: 429, headers: { 'retry-after': '6' } }, 0, 0).retryIn, 6)
  assert.equal(responseDecision({ statusCode: 429, headers: { 'retry-after': '120' } }, 0, 0).retryIn, null)
  assert.equal(responseDecision({ statusCode: 403,
    headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '7' } }, 0, 0).retryIn, 7)
  assert.equal(responseDecision({ error: 'Timeout' }, 0, 0).retryIn, 1)
})

test('Vollständiges YAML, interne Abschnitte, Links und Markdown-Struktur', () => {
  const config = load()
  const company = activate(config, 'company')
  activate(config, 'cloud')
  const markdown = read(company.path).split('\n---\n')[0].replace(/^description: .+$/mu, 'description: >-\n  Mehrzeilige\n  Beschreibung.') +
    '\n---\n\n# mniConsult Zürich\n\n## Übersicht\n\n- [Cloud Computing](cloud.md)\n- [Interne Roadmap](roadmap.md)\n' +
    '\n| A | B |\n| --- | --- |\n| C | D |\n\n<!-- Technik -->\n<!-- mni:internal:start -->\nInterne Daten\n<!-- mni:internal:end -->\n' +
    '\n~~~md\n## Beispiel im Code\n~~~\n'
  assert.equal(stripFrontmatter(markdown).data.description, 'Mehrzeilige Beschreibung.')
  const entry = processMarkdown(markdown, company, config.documents, sha)
  assert.match(entry.text, /^#### Übersicht/mu)
  assert.match(entry.text, /\[Cloud Computing\]\(#mni-cloud\)/u)
  assert.match(entry.text, /\| C \| D \|/u)
  assert.doesNotMatch(entry.text, /Interne Daten|Interne Roadmap|Technik/u)
  const output = buildLlms(config, processDocs(config, { [company.path]: markdown }), sha)
  assert.equal(validateOutput(config, output, sha).full, 2)
})

test('Nicht lesbares Frontmatter, fehlender Inhalt und unsichere Links stoppen', () => {
  const config = load()
  const doc = activate(config, 'company')
  assert.throws(() => processMarkdown('---\ntitle: [\n---\n# Name\nText\n', doc, config.documents, sha), /invalid_frontmatter/)
  const header = read(doc.path).split('\n---\n')[0]
  assert.throws(() => processMarkdown(header + '\n---\n\n# Titel\n', doc, config.documents, sha), /incomplete_markdown/)
  assert.throws(() => processMarkdown(read(doc.path) + '\n[Link](https://mniconsult.ch/private)\n', doc, config.documents, sha), /unsafe_link/)
  assert.throws(() => processMarkdown(read(doc.path) + '\n[<img>](https://mniconsult.ch/)\n', doc, config.documents, sha), /unsupported_markup/)
  assert.throws(() => processMarkdown(read(doc.path).replace(/^---\n/u, '---\ndraft: "true"\n'), doc, config.documents, sha), /internal_metadata/)
  assert.throws(() => processMarkdown(read(doc.path) + '\n<!-- mni:internal:start -->\nInhalt\n', doc, config.documents, sha), /incomplete_markdown/)
  assert.throws(() => buildLlms(config, [], sha), /missing_or_duplicate_input/)
})

test('Beide Ausgaben bleiben bei gleichen Quellen byteidentisch', () => {
  const config = load()
  activate(config, 'company', 'https://mniconsult.ch/')
  activate(config, 'cloud')
  const output = build(config)
  assert.deepEqual(buildLlms(config, processDocs(config).reverse(), '9'.repeat(40)), output)
  assert.match(output.outputs['llms.txt'], /^## Unternehmen/mu)
  assert.doesNotMatch(output.outputs['llms.txt'], /Cloud Computing für KMU/u)
  assert.match(output.outputs['llms-full.txt'], /\[Cloud Computing\]\(#mni-cloud\)|id="mni-cloud"/u)
  assert.doesNotMatch(output.outputs['llms-full.txt'], /internal_metadata|id="mni-avatar"|\nlast_updated:/u)
  assert.deepEqual(validateOutput(config, output, sha).publishable, true)
  const all = load()
  for (const doc of all.documents) doc.approved = doc.includeFullText
  assert.equal(validateOutput(all, build(all), sha).full, 14)
})

test('Validierung erkennt fehlende, abgeschnittene, doppelte und unerlaubte Ausgaben', () => {
  const config = load()
  activate(config, 'company', 'https://mniconsult.ch/')
  const original = build(config)
  const file = 'llms-full.txt'
  const check = (text, error) => {
    const copy = structuredClone(original)
    copy.outputs[file] = text
    assert.throws(() => validateOutput(config, copy, sha), error)
  }
  check(undefined, /invalid_output_structure/)
  check(original.outputs[file].slice(0, -15) + '\n', /incomplete_document/)
  check(original.outputs[file] + '\n<a id="mni-company"></a>\n', /invalid_document_manifest/)
  check(original.outputs[file] + '\nTODO\n', /placeholder/)
  check(original.outputs[file] + '\nhttps://127.0.0.1/\n', /unsafe_url/)
  config.generation.maximumOutputBytes = 10
  check(original.outputs[file], /output_too_large/)
})

test('Öffentlicher 404-Status, Grössenschutz und Trockenlaufentscheidung', () => {
  const config = load()
  activate(config, 'company', 'https://mniconsult.ch/')
  const output = build(config)
  const report = validateOutput(config, output, sha)
  const comparison = comparePublic(config, output, references(200, 'g'.repeat(100000)), sha)
  assert.ok(comparison.reasons.includes('minimum_size_ratio'))
  assert.deepEqual(comparePublic(config, output, references(404), sha).reasons, ['first_installation_disabled'])
  config.deployment.allowFirstInstallation = true
  let missing = comparePublic(config, output, references(404), sha)
  assert.equal(missing.firstInstallation, true)
  assert.equal(deploymentDecision(config, report, missing, false).enabled, false)
  config.deployment.enabled = true
  assert.equal(deploymentDecision(config, report, missing, true).enabled, true)
  missing = references(404)
  missing['llms.txt'] = { status: 200, text: 'alt' }
  assert.deepEqual(comparePublic(config, output, missing, sha).reasons, ['mixed_public_state'])
  assert.throws(() => comparePublic(config, output, references(503), sha), /baseline_unavailable/)
})

test('SFTP-Pfade, Antwortfehler und Rollback sind eindeutig', () => {
  const config = load()
  Object.assign(config.deployment, { remoteDirectory: '/web', privateDirectory: '/private' })
  const { files, marker } = deploymentPaths(config, 'execution-12', sha)
  assert.equal(marker, '/private/mni-llms-pending-execution-12.json')
  assert.ok(files.every(file => file.backup !== file.restore && file.restore.endsWith('.restore')))
  const list = files.map(entry => ({ name: entry.file, path: entry.live, type: '-' }))
  assert.equal(inspectRemote(list, '/web', false).ok, true)
  assert.equal(inspectRemote([{ ...list[0], type: 'l' }], '/web', true).ok, false)
  assert.equal(inspectRemote([{}], '/web', true).ok, true)
  assert.equal(inspectRemote([{}], '/web', false).ok, false)
  assert.equal(inspectRemote([{ error: 'not connected' }], '/web', true).ok, false)
  const operations = operationResult([{json: {success: true}}, {json: {error: 'rename failed'}}],
    files.map(entry => entry.file), item => item.json.success)
  assert.deepEqual(operations, { ok: false, file: 'llms-full.txt' })
  const delivery = compareDelivery(references(200, 'alt'), { 'llms.txt': 'alt', 'llms-full.txt': 'alt' })
  assert.equal(recoveryResult(operations, delivery), 'manual-recovery-required')
  assert.equal(recoveryResult({ ok: true }, delivery), 'restored')
  assert.equal(recoveryResult({ ok: true }, compareDelivery(references(404), { 'llms.txt': 'alt', 'llms-full.txt': 'alt' })), 'verification-failed')
})

test('Error-Bericht sanitisiert unkontrollierte Werte und unterdrückte Benachrichtigung', () => {
  let error
  try {
    fail('SFTP-Aktivierung', 'activation_failed', { sha, file: 'llms-full.txt',
      deployment: 'failed-marker-pending', rollback: 'restored', notify: false })
  } catch (caught) { error = caught }
  const event = { workflow: { name: 'MNI | Knowledge Hub | LLM Build & Publish' },
    execution: { lastNodeExecuted: 'unsafe.test', error: { message: error.message, stack: 'sensitive' } } }
  const report = errorReport(event, '2026-11-18T12:00:00.000Z', [])
  assert.deepEqual(report, { notify: false, result: {
    timestamp: '2026-11-18T12:00:00.000Z', workflow: event.workflow.name, step: 'SFTP-Aktivierung',
    errorType: 'activation_failed', file: 'llms-full.txt', sha, deployment: 'failed-marker-pending', rollback: 'restored',
  } })
  event.execution.error.message = 'Authorization: Bearer private'
  const fallback = errorReport(event, 'time', [])
  assert.equal(fallback.result.errorType, 'n8n_execution_error')
  assert.doesNotMatch(JSON.stringify(fallback), /Authorization|private|unsafe/u)
})
