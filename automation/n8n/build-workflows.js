'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { API, FILES } = require('./modules/parse-config')

const root = __dirname
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const expr = source => '={{ ' + source + ' }}'
const items = source => 'return ' + source + '.map(json => ({json}))'
const ref = (name, accessor = 'first().json') => '$(' + JSON.stringify(name) + ').' + accessor
const id = name => createHash('sha256').update(name).digest('hex').slice(0, 32)
  .replace(/^(........)(....)(....)(....)(............)$/u, '$1-$2-$3-$4-$5')

const dependencies = {
  'github-content': ['parse-config'],
  'process-markdown': ['parse-config', 'vendor/js-yaml.cjs'],
  'build-llms': ['parse-config'],
  'validate-output': ['parse-config', 'github-content'],
  'deployment': ['parse-config'],
  'monitoring': ['parse-config'],
}

function bundle(modules) {
  if (!modules.length) return ''
  const sources = new Map()
  function add(name) {
    if (sources.has(name)) return
    const vendor = name.endsWith('.cjs')
    const filename = vendor ? name : name + '.js'
    const source = read('modules/' + filename).replace(/\n\/\/# sourceMappingURL=[^\n]+/u, '')
    sources.set(name, source.trimEnd().replace(/\brequire\(/gu, 'loadModule('))
    for (const dep of dependencies[name] || []) add(dep)
  }
  for (const name of modules) add(name)
  const factories = [...sources].map(([name, source]) =>
    JSON.stringify('./' + name) + ': (module, exports, loadModule) => {\n' + source + '\n}')
  return '// Erstellt mit node automation/n8n/build-workflows.js\n' +
    'const embedded = {\n' + factories.join(',\n') + '\n};\n' +
    'const loaded = Object.create(null);\n' +
    'function loadModule(name) {\n' +
    '  if (!loaded[name]) {\n' +
    '    const module = { exports: {} };\n' +
    '    embedded[name](module, module.exports, loadModule);\n' +
    '    loaded[name] = module.exports;\n' +
    '  }\n' +
    '  return loaded[name];\n' +
    '}\n'
}

const settings = {
  timezone: 'Europe/Zurich', executionOrder: 'v1',
  saveDataErrorExecution: 'none', saveDataSuccessExecution: 'none', saveManualExecutions: true,
}

function workflow(name) {
  const nodes = []
  const connections = {}
  const docs = []
  const steps = new Map()
  function node(name, type, typeVersion, parameters, doc, extra = {}) {
    if (steps.has(name)) throw new Error('Duplicate node: ' + name)
    steps.set(name, { column: 0, lane: doc.lane || 0 })
    nodes.push({ parameters, id: id(name), name, type: 'n8n-nodes-base.' + type,
      typeVersion, position: [0, 0], ...extra })
    docs.push({ name, type, input: doc.input, output: doc.output, credential: doc.credential || '—',
      behavior: doc.behavior })
    return name
  }
  function link(from, to, output = 0) {
    const main = (connections[from] ||= { main: [] }).main
    while (main.length <= output) main.push([])
    main[output].push({ node: to, type: 'main', index: 0 })
    return to
  }
  function code(name, source, doc, modules = []) {
    return node(name, 'code', 2, { mode: 'runOnceForAllItems', language: 'javaScript',
      jsCode: bundle(modules) + source.trim() + '\n' }, doc)
  }
  function yesNo(name, condition, doc) {
    return node(name, 'if', 2.3, { conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
      conditions: [{ id: id(name + '-condition'), leftValue: expr(condition), rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true } }],
      combinator: 'and',
    }, options: {} }, doc)
  }
  function http(name, options) {
    const github = options.github
    const headerValues = [{ name: 'Cache-Control', value: 'no-cache' }]
    if (github) {
      headerValues.push({ name: 'Accept', value: options.accept }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' })
    }
    return node(name, 'httpRequest', 4.4, {
      method: options.method || 'GET', url: expr('$json.url'),
      ...(github && { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' }),
      sendHeaders: true, headerParameters: { parameters: headerValues },
      options: {
        timeout: 15000, redirect: { redirect: { followRedirects: false } },
        batching: { batch: { batchSize: 1, batchInterval: 300 } },
        response: { response: { fullResponse: true, neverError: true,
          responseFormat: options.method === 'HEAD' ? 'text' : 'file', outputPropertyName: 'data' } },
      },
    }, { input: options.input, output: 'HTTP-Status, Header und Antwort', credential: github ? 'GitHub Header Auth' : '—',
      behavior: '15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung.' },
    { onError: 'continueRegularOutput' })
  }
  function sftp(name, operation, parameters, doc) {
    return node(name, 'ftp', 1.1, { protocol: 'sftp', operation, ...parameters, options: { timeout: 10000 } },
      { ...doc, credential: 'SFTP' }, { onError: 'continueRegularOutput', ...(operation === 'list' && { alwaysOutputData: true }) })
  }
  function finish() {
    // Longest path layout keeps the shared branches to the right of every predecessor.
    for (let i = 0; i < nodes.length; i++) {
      for (const [from, { main }] of Object.entries(connections)) {
        for (const { node: to } of main.flat()) {
          steps.get(to).column = Math.max(steps.get(to).column, steps.get(from).column + 1)
        }
      }
    }
    const taken = new Set()
    for (const node of nodes) {
      const { column, lane } = steps.get(node.name)
      let row = lane
      while (taken.has(column + ':' + row)) row++
      taken.add(column + ':' + row)
      node.position = [column * 248, row * 154]
    }
    return { data: { name, nodes, connections, settings: { ...settings }, active: false, pinData: {} }, docs }
  }
  return { node, link, code, yesNo, http, sftp, finish }
}

function gitFetch(w, label, input, step, accept, complete) {
  let previous
  for (let attempt = 0; attempt < 3; attempt++) {
    const suffix = ' · ' + (attempt + 1)
    const http = w.http(label + ' abrufen' + suffix, { github: true, accept, input: 'GitHub-URL je Item' })
    const evaluate = w.code(label + ' prüfen' + suffix, `
const {fail} = loadModule('./parse-config')
const {responseDecision, decodeUtf8, decodeGitHub} = loadModule('./github-content')
const results = $input.all()
const requests = ${ref(input, 'all()')}.map(item => item.json)
const byIndex = new Map(results.map(item => [item.pairedItem?.item, item.json]))
const sha = requests[0]?.sha
const reject = (type, file) => fail(${JSON.stringify(step)}, type, {file, sha, notify: requests[0]?.notify})
if (results.length !== requests.length || byIndex.size !== requests.length) reject('incomplete_http_response')
let delay = 0
for (const [i, request] of requests.entries()) {
  if (!byIndex.has(i)) reject('incomplete_http_response', request.path)
  const result = responseDecision(byIndex.get(i), ${attempt}, Date.now())
  if (!result.ok && result.retryIn === null) reject(result.type, request.path)
  if (!result.ok) delay = Math.max(delay, result.retryIn)
}
if (delay) return [{json: {retry: true, delay}}]
const rows = []
for (const [i, result] of results.entries()) {
  const request = requests[result.pairedItem.item]
  if (!result.binary?.data) reject('missing_http_body', request.path)
  let bytes
  try { bytes = await this.helpers.getBinaryDataBuffer(i, 'data') }
  catch { reject('unreadable_http_body', request.path) }
  let text
  if (request.path) {
    text = decodeGitHub(bytes, result.json.headers || {}, request.path, request.limit, sha, request.notify, request.source)
  } else {
    if (bytes.length > request.limit) reject('github_response_too_large')
    try { text = decodeUtf8(bytes) } catch { reject('github_response_invalid_utf8') }
  }
  rows.push({path: request.path || null, text})
}
return [{json: {retry: false, rows}}]
`, { input: 'Komplette HTTP-Antworten', output: 'UTF-8-Quellen oder Retry-Signal',
      behavior: 'Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen.' },
    ['parse-config', 'github-content'])
    w.link(http, evaluate)
    if (attempt === 2) {
      w.link(previous, http)
      w.link(evaluate, complete)
      break
    }
    const retry = w.yesNo(label + ' erneut versuchen?' + suffix, '$json.retry', {
      input: 'Status und Wartezeit', output: 'Retry oder bestätigte Quellen', behavior: 'Nur transiente Fehler wiederholen.',
    })
    const wait = w.node(label + ' Backoff' + suffix, 'wait', 1.1, {
      resume: 'timeInterval', amount: expr('$json.delay'), unit: 'seconds',
    }, { input: 'Wartezeit', output: 'Retry-Signal', behavior: 'Maximal 30 s vor dem nächsten Versuch.', lane: 1 })
    const restore = w.code(label + ' Anfragen wiederholen' + suffix, items(ref(input, 'all()') + '.map(item => item.json)'), {
      input: 'Retry-Signal', output: 'Unveränderte Anfragen', behavior: 'Behält die ursprünglichen URLs und den Commit bei.', lane: 1,
    })
    w.link(previous || input, http)
    w.link(evaluate, retry)
    w.link(retry, wait)
    w.link(retry, complete, 1)
    w.link(wait, restore)
    previous = restore
  }
}

const readPublic = `
const {decodeUtf8} = loadModule('./github-content')
const results = $input.all()
const references = {}
const seen = new Set()
let invalidMapping = results.length !== FILES.length
for (const [i, item] of results.entries()) {
  const name = FILES[item.pairedItem?.item]
  if (!name || seen.has(name)) { invalidMapping = true; continue }
  seen.add(name)
  const {statusCode: status, headers, error} = item.json
  references[name] = {status: error ? 0 : status, text: null}
  if (status === 200 && /^text\\/plain(?:;|$)/iu.test(String(headers?.['content-type'])) && item.binary?.data) {
    try {
      const bytes = await this.helpers.getBinaryDataBuffer(i, 'data')
      if (bytes.length <= 20000000) references[name].text = decodeUtf8(bytes)
    } catch { /* The validation gate handles unreadable delivery. */ }
  }
}
if (invalidMapping) for (const name of FILES) delete references[name]
`

function buildWorkflow() {
  const w = workflow('MNI | Knowledge Hub | LLM Build & Publish')
  const manual = w.node('Manueller Start', 'manualTrigger', 1, {}, {
    input: 'Manueller Start', output: 'Testlauf', behavior: 'SFTP bleibt für diesen Startpfad gesperrt.', lane: 1,
  })
  const schedule = w.node('Täglicher Zeitplan', 'scheduleTrigger', 1.2, {
    rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 4, triggerAtMinute: 15 }] },
  }, { input: 'Trigger nach Veröffentlichung', output: 'Geplanter Lauf', behavior: 'Täglich 04:15 Uhr Europe/Zurich. Deaktiviert ausgeliefert.' },
  { disabled: true })
  for (const [trigger, scheduled] of [[manual, false], [schedule, true]]) {
    w.link(trigger, w.code(scheduled ? 'Zeitplan kennzeichnen' : 'Testlauf kennzeichnen', `
return [{json: {scheduled: ${scheduled} && $execution.mode === 'production', limit: 2097152,
  url: ${JSON.stringify(API + '/commits/main')}}}]
`, { input: 'Startsignal', output: 'GitHub-URL und Laufmodus', behavior: 'Produktiver Zeitplan plus Produktionsmodus für die SFTP-Freigabe erforderlich.',
      lane: scheduled ? 0 : 1 }))
    w.link(scheduled ? 'Zeitplan kennzeichnen' : 'Testlauf kennzeichnen', 'GitHub-Commit vorbereiten')
  }
  const commitRequest = w.code('GitHub-Commit vorbereiten', 'return $input.all()', {
    input: 'Modus und Ref-URL', output: 'Ein Request-Item', behavior: 'Ein Startpfad pro Ausführung.',
  })
  const treeRequest = w.code('GitHub-Baum vorbereiten', `
const {API, SHA, fail} = loadModule('./parse-config')
let commit
try { commit = JSON.parse($input.first().json.rows[0].text) } catch { fail('GitHub-Commit', 'invalid_branch_response') }
const sha = commit?.sha
const tree = commit?.commit?.tree?.sha
if (typeof sha !== 'string' || !SHA.test(sha) || typeof tree !== 'string' || !SHA.test(tree)) {
  fail('GitHub-Commit', 'invalid_branch_response')
}
const scheduled = ${ref(commitRequest)}.scheduled
return [{json: {sha, scheduled, tree, limit: 2097152, url: API + '/git/trees/' + tree + '?recursive=1'}}]
`, { input: 'Commit-Antwort für main', output: 'Unveränderlicher Commit und Baum-URL', behavior: 'Prüft Commit-SHA und zugehörige Baum-SHA.' }, ['parse-config'])
  gitFetch(w, 'GitHub-Commit', commitRequest, 'GitHub-Commit', 'application/vnd.github+json', treeRequest)
  const configRequest = w.code('GitHub-Konfiguration vorbereiten', `
const {API, CONFIG_PATH: path} = loadModule('./parse-config')
const {treeSources, requireSource} = loadModule('./github-content')
const {sha, tree, scheduled} = ${ref(treeRequest)}
const sources = treeSources($input.first().json.rows[0].text, tree, sha)
const limit = 262144
const source = requireSource(sources, path, limit, sha)
return [{json: {sha, scheduled, sources, path, source, limit, url: API + '/contents/' + path + '?ref=' + sha}}]
`, { input: 'Vollständiger Baum des gepinnten Commits', output: 'Bestätigte reguläre Datei und Config-URL',
    behavior: 'Fehlende Einträge, Symlinks, Submodule und abgeschnittene Bäume sperren den Abruf.' }, ['parse-config', 'github-content'])
  gitFetch(w, 'GitHub-Baum', treeRequest, 'GitHub-Baum', 'application/vnd.github+json', configRequest)
  const config = w.code('Konfiguration validieren', `
const {parseConfig, approvedDocuments} = loadModule('./parse-config')
const {sha, scheduled} = ${ref(configRequest)}
const config = parseConfig($input.first().json.rows[0].text, sha)
return [{json: {sha, scheduled, config, approved: approvedDocuments(config)}}]
`, { input: 'Konfigurationsinhalt am gepinnten Commit', output: 'Validierte Konfiguration und sortierte Freigaben', behavior: 'Fehlende, doppelte oder unzulässige Einträge stoppen den Lauf.' }, ['parse-config'])
  gitFetch(w, 'GitHub-Konfiguration', configRequest, 'Konfiguration', 'application/vnd.github.raw+json', config)
  const hasDocs = w.yesNo('Freigegebene Dokumente vorhanden?', '$json.approved.length > 0', {
    input: 'Sortierte Freigaben', output: 'Abruf oder Abschlussbericht', behavior: 'Ohne explizite Freigabe sind keine Dokumentabfragen und keine SFTP-Schritte erreichbar.',
  })
  w.link(config, hasDocs)
  const empty = w.code('Ohne Freigabe beenden', `
const {sha, config} = $input.first().json
const report = {status: 'no-approved-documents', sha, documents: config.documents.length, approved: 0, deployed: false}
console.log(JSON.stringify(report))
return [{json: report}]
`, { input: 'Leere Freigabeliste', output: 'Strukturierter Status', behavior: 'Beendet den Lauf regulär ohne Dateien.', lane: 1 })
  w.link(hasDocs, empty, 1)
  const docRequests = w.code('GitHub-Dokumente vorbereiten', `
const {API, fail} = loadModule('./parse-config')
const {requireSource} = loadModule('./github-content')
const {sha, config, approved} = $input.first().json
const {sources} = ${ref(configRequest)}
const limit = config.generation.maximumSourceBytes
const notify = config.monitoring.notifyOnError
const requests = approved.map(({path}) => ({path, sha, notify, limit,
  source: requireSource(sources, path, limit, sha, notify), url: API + '/contents/' + path + '?ref=' + sha}))
if (requests.reduce((total, request) => total + request.source.size, 0) > 40000000) {
  fail('GitHub-Dokumente', 'total_source_size_exceeded', {sha, notify})
}
return requests.map(json => ({json}))
`, { input: 'Freigaben und bestätigte Baum-Einträge', output: 'Eine URL je regulärem freigegebenem Dokument',
    behavior: 'Prüft Dateityp und Grösse vor Abruf. Ausschliesslich gepinnte Quellen bis insgesamt 40 MB.' }, ['parse-config', 'github-content'])
  w.link(hasDocs, docRequests)
  const process = w.code('Markdown aufbereiten', `
const {fail} = loadModule('./parse-config')
const {processMarkdown} = loadModule('./process-markdown')
const {sha, approved, config} = ${ref(config)}
const rows = new Map($input.first().json.rows.map(row => [row.path, row.text]))
if (rows.size !== approved.length || approved.some(doc => !rows.has(doc.path))) {
  fail('GitHub-Dokumente', 'missing_or_duplicate_source', {sha, notify: config.monitoring.notifyOnError})
}
try {
  return [{json: {processed: approved.map(doc => processMarkdown(rows.get(doc.path), doc, config.documents, sha))}}]
} catch (error) {
  if (typeof error.message === 'string' && error.message.startsWith('MNI_PHASE6 ')) {
    const detail = JSON.parse(error.message.slice('MNI_PHASE6 '.length))
    fail(detail.step, detail.type, {...detail, notify: config.monitoring.notifyOnError})
  }
  fail('Markdown', 'processing_failed', {sha, notify: config.monitoring.notifyOnError})
}
`, { input: 'Sämtliche dekodierten Quellen', output: 'Aufbereitete Dokumente und Linkhinweise', behavior: 'Striktes YAML, Markdown-Hierarchie, interne Bereiche und Querverweise.' }, ['parse-config', 'process-markdown'])
  gitFetch(w, 'GitHub-Dokumente', docRequests, 'GitHub-Dokumente', 'application/vnd.github.raw+json', process)
  const generate = w.code('Beide LLM-Dateien generieren', `
const {buildLlms} = loadModule('./build-llms')
const {config, sha} = ${ref(config)}
return [{json: buildLlms(config, $input.first().json.processed, sha)}]
`, { input: 'Geprüfte Dokumente und Konfiguration', output: 'Index, Volltext, Manifest', behavior: 'Reproduzierbare Reihenfolge und keine Laufzeitdaten in den Dateien.' }, ['build-llms'])
  w.link(process, generate)
  const validate = w.code('Ausgaben validieren', `
const {validateOutput} = loadModule('./validate-output')
const {config, sha} = ${ref(config)}
const report = validateOutput(config, $input.first().json, sha)
return [{json: report}]
`, { input: 'Dateitexte und Manifest', output: 'JSON-Qualitätsbericht', behavior: 'Struktur, Grössen, URLs, Secrets, Freigaben und Vollständigkeit müssen stimmen.' }, ['validate-output'])
  w.link(generate, validate)
  const baselineRequests = w.code('Öffentliche Referenzen vorbereiten', `
const {publicRequests} = loadModule('./deployment')
const {config} = ${ref(config)}
${items("publicRequests(config, String($execution.id), 'baseline')")}
`, { input: 'Qualitätsbericht und Deployment-Konfiguration', output: 'Zwei öffentliche URLs', behavior: 'Feste Ziele mit Cache-Busting.' }, ['deployment'])
  w.link(validate, baselineRequests)
  const httpBaseline = w.http('Öffentliche Referenzen abrufen', { input: 'Zwei Referenz-URLs' })
  w.link(baselineRequests, httpBaseline)
  const compare = w.code('Öffentliche Referenzen vergleichen', `
const {FILES} = loadModule('./parse-config')
const {comparePublic} = loadModule('./validate-output')
const {deploymentDecision} = loadModule('./deployment')
${readPublic}
const {config, sha, scheduled} = ${ref(config)}
const build = ${ref(generate)}
const validation = ${ref(validate)}
const comparison = comparePublic(config, build, references, sha)
const decision = deploymentDecision(config, validation, comparison, scheduled)
return [{json: {references, comparison, decision}}]
`, { input: 'Öffentliche Antworten, Kandidaten und Qualitätsbericht', output: 'Grössenvergleich, Änderungsstatus und Freigabegründe', behavior: '404/200-Mix, geringe Grösse oder fehlende Freigabe blockieren den Upload.' },
  ['parse-config', 'validate-output', 'deployment'])
  w.link(httpBaseline, compare)
  const gate = w.yesNo('Deployment freigegeben?', '$json.decision.enabled', {
    input: 'Sicherheitsentscheid', output: 'SFTP-Vorprüfung oder Trockenlauf', behavior: 'Handstarts bleiben auch bei aktiviertem Deployment trocken.',
  })
  const dry = w.code('Trockenlauf oder Vergleich abschliessen', `
const {sha, approved, config} = ${ref(config)}
const {comparison, decision} = $input.first().json
const validation = ${ref(validate)}
const report = {status: comparison.changed ? 'not-deployed' : 'up-to-date', sha,
  documents: config.documents.length, approved: approved.length, validation, comparison, reasons: decision.reasons, deployed: false}
if (config.deployment.enabled && !decision.reasons.includes('manual_test')) {
  const {fail} = loadModule('./parse-config')
  if (comparison.reasons.length) fail('Öffentliche Referenz', comparison.reasons[0], {sha, notify: config.monitoring.notifyOnError})
  if (!validation.publishable) fail('Validierung', 'missing_public_index_or_full_text', {sha, notify: config.monitoring.notifyOnError})
}
console.log(JSON.stringify(report))
return [{json: report}]
`, { input: 'Vergleich und Freigabegründe', output: 'Strukturierter Laufbericht', behavior: 'Keine SFTP-Zugriffe. Aktive Schutzsperren bei geplantem Deployment werden gemeldet.', lane: 1 }, ['parse-config'])
  w.link(compare, gate)
  w.link(gate, dry, 1)
  addDeployment(w, { config, generate, validate, compare, gate })
  return w.finish()
}

function addDeployment(w, core) {
  const cfg = ref(core.config)
  const report = ref(core.validate)
  const bundleFiles = ref(core.generate)
  const comparison = ref(core.compare)
  const urlItems = w.code('Öffentliche Indexlinks vorbereiten', `
const build = ${bundleFiles}
return build.indexedUrls.map(entry => ({json: entry}))
`, { input: 'Freigegebene Indexeinträge', output: 'Eine URL je Indexeintrag', behavior: 'Nur explizit bestätigte Katalog-URLs werden geprüft.' })
  w.link(core.gate, urlItems)
  const urlCheck = w.http('Öffentliche Indexlinks abrufen', { method: 'HEAD', input: 'Freigegebene öffentliche URLs' })
  w.link(urlItems, urlCheck)
  const plan = w.code('Deployment planen', `
const {fail} = loadModule('./parse-config')
const {deploymentPaths} = loadModule('./deployment')
const {config, sha} = ${cfg}
const requests = ${ref(urlItems, 'all()')}.map(item => item.json)
const response = $input.all()
if (response.length !== requests.length) fail('Öffentliche Verifikation', 'missing_index_url_response', {sha})
const indexes = new Set()
for (const item of response) {
  const i = item.pairedItem?.item
  const path = requests[i]?.path
  if (!path || indexes.has(i) || item.json.error || item.json.statusCode !== 200) {
    fail('Öffentliche Verifikation', 'index_url_unavailable', {sha, file: path, notify: config.monitoring.notifyOnError})
  }
  indexes.add(i)
}
if ($mode !== 'trigger') fail('SFTP-Vorprüfung', 'invalid_execution_mode', {sha})
const executionId = String($execution.id)
const paths = deploymentPaths(config, executionId, sha)
return [{json: {paths, executionId, sha, first: ${comparison}.comparison.firstInstallation}}]
`, { input: 'Erreichbarkeit aller Indexlinks', output: 'Lauf-ID, Commit und Remote-Pfade', behavior: 'Nur direkte HTTP-200-Antworten und echte Trigger-Ausführungen.' }, ['parse-config', 'deployment'])
  w.link(urlCheck, plan)
  const planned = ref(plan)
  const guarded = source => expr('$mode === "trigger" && String($execution.id) === ' + planned +
    '.executionId && (' + source + ') ? (' + source + ') : (() => { throw new Error("SFTP path unavailable for this execution") })()')
  const context = `
const {config, sha} = ${cfg}
const {paths, first} = ${planned}
const {fail, FILES} = loadModule('./parse-config')
const reject = (step, type, file, state = {}) => fail(step, type,
  {sha, file, notify: config.monitoring.notifyOnError, ...state})
`
  const checkedStage = (name, source, doc) => w.code(name, context + source, doc,
    ['parse-config', 'deployment', 'github-content'])
  const list = (name, field) => w.sftp(name, 'list', { path: guarded(planned + '.paths.' + field), recursive: false }, {
    input: 'Festgelegtes Verzeichnis aus dem Plan', output: 'Direkte SFTP-Verzeichniseinträge',
    behavior: 'Verzeichnis muss existieren. Verbindungsfehler als Daten.',
  })
  const privateList = list('Privates SFTP-Verzeichnis lesen', 'privateDirectory')
  w.link(plan, privateList)
  const privateCheck = checkedStage('SFTP-Wiederherstellungssperre prüfen', `
const {listing, PENDING_PREFIX} = loadModule('./deployment')
const entries = listing($input.all().map(item => item.json), paths.privateDirectory)
if (!entries) reject('SFTP-Vorprüfung', 'private_directory_unavailable')
if (entries.some(entry => entry.name.startsWith(PENDING_PREFIX))) {
  reject('SFTP-Vorprüfung', 'previous_deployment_pending', null,
    {deployment: 'blocked', rollback: 'manual-recovery-required'})
}
const reservedNames = new Set(paths.files.flatMap(file => [file.staging, file.backup, file.restore]).concat(paths.marker))
if (entries.some(entry => reservedNames.has(entry.path))) reject('SFTP-Vorprüfung', 'private_file_collision')
return [{json: {ok: true}}]
`, { input: 'Inhalt des privaten Verzeichnisses', output: 'Freie Dateinamen und fehlende Sperrdateien', behavior: 'Offener Wiederherstellungsfall blockiert neue Veröffentlichungen.' })
  w.link(privateList, privateCheck)

  const remoteList = list('Öffentliches SFTP-Verzeichnis lesen', 'remoteDirectory')
  w.link(privateCheck, remoteList)
  const remoteCheck = checkedStage('SFTP-Bestand prüfen', `
const {inspectRemote} = loadModule('./deployment')
const result = inspectRemote($input.all().map(item => item.json), paths.remoteDirectory, first)
if (!result.ok) reject('SFTP-Vorprüfung', 'public_directory_inconsistent', result.stale)
return [{json: {first}}]
`, { input: 'Öffentliches Verzeichnis und HTTP-Referenzstatus', output: 'Bestätigter Installationsmodus', behavior: 'Nur reguläre Dateien. Beide vorhanden oder beide ausdrücklich erwartet abwesend.' })
  w.link(remoteList, remoteCheck)
  const firstGate = w.yesNo('Erstinstallation?', '$json.first', {
    input: 'Bestätigter Installationsmodus', output: 'Staging oder Backup', behavior: 'Bei Aktualisierung werden vorhandene Bytes gesichert.',
  })
  w.link(remoteCheck, firstGate)
  const prepareExisting = w.code('SFTP-Bestand für Sicherung vorbereiten', items(planned + '.paths.files'), {
    input: 'Dateipfade', output: 'Zwei Original- und Sicherungspfade', behavior: 'Feste Dateireihenfolge.',
  })
  w.link(firstGate, prepareExisting, 1)
  const download = (name, param) => w.sftp(name, 'download', { path: guarded(param), binaryPropertyName: 'data' }, {
    input: 'Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade', output: 'Binärdatei je Item',
    behavior: 'Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet.',
  })
  const upload = (name, param) => w.sftp(name, 'upload', { path: guarded(param), binaryData: true, binaryPropertyName: 'data' }, {
    input: 'Binärdatei und passender SFTP-Pfad', output: 'Übertragungsergebnis je Item',
    behavior: 'Ziel im privaten Verzeichnis. Bei Fehlern kein automatischer Upload-Retry.',
  })
  const rename = (name, from, to) => w.sftp(name, 'rename', { oldPath: guarded(from), newPath: guarded(to) }, {
    input: 'Quell- und Zielpfad je Datei', output: 'Rename-Ergebnis je Datei',
    behavior: 'SFTP-Rename ohne Create Directories. Unsichere Antworten werden als mögliche Teilaktivierung behandelt.',
  })
  const erase = (name, param) => w.sftp(name, 'delete', { path: guarded(param) }, {
    input: 'Exakte SFTP-Dateipfade', output: 'Löschstatus je Datei',
    behavior: 'Einzeldatei, keine Verzeichnisse oder rekursiven Löschungen.',
  })
  const downloadExisting = download('SFTP-Originale herunterladen', '$json.live')
  w.link(prepareExisting, downloadExisting)

  function binaryVerify(name, step, type, source, field, nextSource) {
    return checkedStage(name, `
const {operationResult} = loadModule('./deployment')
const rows = $input.all()
const values = ${source}
const status = operationResult(rows, FILES, item => Boolean(item.binary?.data))
if (!status.ok) reject(${JSON.stringify(step)}, ${JSON.stringify(type)}, status.file)
for (const [i, item] of rows.entries()) {
  const bytes = await this.helpers.getBinaryDataBuffer(i, 'data')
  if (!Buffer.from(values[FILES[i]], 'utf8').equals(bytes)) {
    reject(${JSON.stringify(step)}, 'byte_comparison_failed', FILES[i])
  }
}
${nextSource || 'return [{json: {ok: true}}]'}
`, { input: 'SFTP-Binärdateien und ' + field, output: 'Bestätigte Bytes beider Dateien', behavior: 'Geprüft werden sämtliche Bytes. Fehlende Dateien und Lese-/Übertragungsfehler blockieren.' })
  }

  const previousBytes = 'Object.fromEntries(FILES.map(file => [file, ' + comparison + '.references[file].text]))'
  const originalCheck = binaryVerify('SFTP-Originale mit HTTP vergleichen', 'SFTP-Backup', 'original_download_failed',
    previousBytes, 'öffentliche Referenzen',
    'return rows.map((item, i) => ({json: paths.files[i], binary: item.binary, pairedItem: {item: i}}))')
  w.link(downloadExisting, originalCheck)
  const backupUpload = upload('SFTP-Sicherungen hochladen', '$json.backup')
  w.link(originalCheck, backupUpload)

  function prepareDownload(name, step, type) {
    return checkedStage(name, `
const {operationResult} = loadModule('./deployment')
const result = operationResult($input.all(), FILES)
if (!result.ok) reject(${JSON.stringify(step)}, ${JSON.stringify(type)}, result.file)
${items('paths.files')}
`, { input: 'Zwei Upload-Ergebnisse', output: 'Zwei private Prüfpfade', behavior: 'Jeder Upload muss erfolgreich sein. Pfade stammen aus dem Laufplan.' })
  }
  const backupRead = prepareDownload('SFTP-Sicherungsprüfung vorbereiten', 'SFTP-Backup', 'backup_upload_failed')
  w.link(backupUpload, backupRead)
  const backupDownload = download('SFTP-Sicherungen zurücklesen', '$json.backup')
  w.link(backupRead, backupDownload)
  const backupCheck = binaryVerify('SFTP-Sicherungen bytegenau prüfen', 'SFTP-Backup', 'backup_download_failed',
    previousBytes, 'öffentliche Referenzen',
    'return rows.map((item, i) => ({json: paths.files[i], binary: item.binary, pairedItem: {item: i}}))')
  w.link(backupDownload, backupCheck)
  const restoreUpload = upload('SFTP-Rollback-Kopien hochladen', '$json.restore')
  w.link(backupCheck, restoreUpload)
  const restoreRead = prepareDownload('SFTP-Rollback-Kopien zum Rücklesen vorbereiten', 'SFTP-Backup', 'restore_copy_upload_failed')
  w.link(restoreUpload, restoreRead)
  const restoreDownload = download('SFTP-Rollback-Kopien zurücklesen', '$json.restore')
  w.link(restoreRead, restoreDownload)
  const restoreCheck = binaryVerify('SFTP-Rollback-Kopien bytegenau prüfen', 'SFTP-Backup', 'restore_copy_download_failed',
    previousBytes, 'öffentliche Referenzen')
  w.link(restoreDownload, restoreCheck)

  const stagePrepare = w.code('Staging-Dateien vorbereiten', `
const build = ${bundleFiles}
return ${planned}.paths.files.map(file => ({json: {...file, content: build.outputs[file.file]}}))
`, { input: 'Validierte Dateien und private Staging-Pfade', output: 'Zwei Text-Items', behavior: 'Erstinstallation oder vollständig gesicherte Aktualisierung.' })
  w.link(firstGate, stagePrepare)
  w.link(restoreCheck, stagePrepare)
  const convert = w.node('Textdateien in Binärdaten umwandeln', 'convertToFile', 1.1, {
    operation: 'toText', sourceProperty: 'content', binaryPropertyName: 'data',
    options: { fileName: expr('$json.file'), encoding: 'utf8', addBOM: false },
  }, { input: 'Text-Items', output: 'Zwei UTF-8-Binärdateien', behavior: 'Ohne BOM, mit festen Dateinamen.' })
  w.link(stagePrepare, convert)
  const stageUpload = upload('SFTP-Staging hochladen', '$("Staging-Dateien vorbereiten").item.json.staging')
  w.link(convert, stageUpload)
  const stageRead = prepareDownload('SFTP-Staging-Prüfung vorbereiten', 'SFTP-Staging', 'staging_upload_failed')
  w.link(stageUpload, stageRead)
  const stageDownload = download('SFTP-Staging zurücklesen', '$json.staging')
  w.link(stageRead, stageDownload)
  const stageCheck = binaryVerify('SFTP-Staging bytegenau prüfen', 'SFTP-Staging', 'staging_download_failed',
    bundleFiles + '.outputs', 'generierte Dateien')
  w.link(stageDownload, stageCheck)
  const markerPrepare = checkedStage('SFTP-Transaktionsmarker vorbereiten', `
const content = JSON.stringify({sha, first, files: paths.files}, null, 2) + '\\n'
return [{json: {content}}]
`, { input: 'Bestätigte Sicherungen und Staging-Dateien', output: 'Marker mit Commit und Pfaden', behavior: 'Marker bleibt bei Aktivierungs- oder Wiederherstellungsfehlern stehen.' })
  w.link(stageCheck, markerPrepare)
  const marker = w.sftp('SFTP-Transaktionsmarker schreiben', 'upload', {
    path: guarded(planned + '.paths.marker'), binaryData: false, fileContent: expr('$json.content'),
  }, { input: 'Marker als UTF-8-Text', output: 'SFTP-Schreibstatus', behavior: 'Persistente Wiederherstellungssperre im privaten Verzeichnis.' })
  w.link(markerPrepare, marker)
  const readMarker = download('SFTP-Transaktionsmarker zurücklesen', planned + '.paths.marker')
  const markerUploaded = checkedStage('SFTP-Marker-Upload prüfen', `
const row = $input.first().json
if (row.error || typeof row.content !== 'string') reject('SFTP-Staging', 'marker_upload_failed')
return [{json: {ok: true}}]
`, { input: 'Upload-Status des Markers', output: 'Freigabe zum Rücklesen', behavior: 'Fehler verhindern jede Live-Änderung.' })
  w.link(marker, markerUploaded)
  w.link(markerUploaded, readMarker)
  const activationPrepare = checkedStage('SFTP-Aktivierung vorbereiten', `
const row = $input.first()
if (row.json.error || !row.binary?.data) reject('SFTP-Staging', 'marker_download_failed')
const marker = await this.helpers.getBinaryDataBuffer(0, 'data')
if (!Buffer.from(${ref(markerPrepare)}.content, 'utf8').equals(marker)) reject('SFTP-Staging', 'marker_mismatch')
${items('paths.files')}
`, { input: 'Zurückgelesener Marker und Pfade', output: 'Zwei Rename-Items', behavior: 'Erst nach Bytegleichheit des persistenten Markers erfolgt die Aktivierung.' })
  w.link(readMarker, activationPrepare)
  const activation = rename('Beide SFTP-Dateien aktivieren', '$json.staging', '$json.live')
  w.link(activationPrepare, activation)

  const activationCheck = checkedStage('SFTP-Rename-Ergebnisse prüfen', `
const {operationResult} = loadModule('./deployment')
const result = operationResult($input.all(), FILES, item => item.json.success === true)
return [{json: {ok: result.ok, file: result.file, type: 'activation_failed', step: 'SFTP-Aktivierung'}}]
`, { input: 'Rename-Ergebnis je Datei', output: 'Erfolg oder Rollback-Grund', behavior: 'Bei einem Fehler oder unvollständiger Antwort können bereits Änderungen wirksam sein.' })
  w.link(activation, activationCheck)
  const canVerify = w.yesNo('Beide SFTP-Renames bestätigt?', '$json.ok', {
    input: 'Rename-Status', output: 'Öffentliche Prüfung oder Rollback', behavior: 'Teilaktivierungen gehen direkt in den Rollback.',
  })
  w.link(activationCheck, canVerify)
  const publishRequests = checkedStage('Öffentliche Verifikation vorbereiten', `
const {publicRequests} = loadModule('./deployment')
${items("publicRequests(config, String($execution.id), 'publish')")}
`, { input: 'Bestätigte Renames und feste URLs', output: 'Zwei neue HTTP-Requests', behavior: 'Eindeutige URL-Abfrage pro Phase.' })
  w.link(canVerify, publishRequests)
  const publishHttp = w.http('Beide öffentlich ausgelieferten Dateien abrufen', { input: 'Zwei öffentliche Prüf-URLs' })
  w.link(publishRequests, publishHttp)
  const publicCheck = checkedStage('Öffentliche Dateien bytegenau prüfen', `
const {compareDelivery} = loadModule('./deployment')
${readPublic}
const result = compareDelivery(references, ${bundleFiles}.outputs)
return [{json: {ok: result.ok, type: 'public_content_mismatch', file: result.file, step: 'Öffentliche Verifikation'}}]
`, { input: 'Tatsächliche öffentliche Antworten und Kandidaten', output: 'Vergleich für beide Dateien', behavior: 'Erfolg nur bei HTTP 200 und exakter UTF-8-Übereinstimmung beider Dateien.' })
  w.link(publishHttp, publicCheck)
  const deliveryOk = w.yesNo('Beide öffentlichen Dateien bestätigt?', '$json.ok', {
    input: 'Öffentliche Byteprüfung', output: 'Erfolgspfad oder Rollback', behavior: 'Auch fehlende oder veraltete CDN-Antworten lösen den Rollback aus.',
  })
  w.link(publicCheck, deliveryOk)
  const clear = erase('SFTP-Transaktionsmarker entfernen', planned + '.paths.marker')
  w.link(deliveryOk, clear)
  const success = checkedStage('Veröffentlichung protokollieren', `
const row = $input.first().json
if (row.success !== true || row.error) reject('SFTP-Abschluss', 'marker_cleanup_failed', null,
  {deployment: 'published-marker-pending', rollback: 'not-needed'})
const validation = ${report}
const result = {status: 'published', sha, deployment: 'published', firstInstallation: first,
  sizes: validation.sizes, indexed: validation.indexed, full: validation.full, rollback: 'not-needed'}
console.log(JSON.stringify(result))
return [{json: {result, notify: config.monitoring.notifyOnSuccess}}]
`, { input: 'Status des letzten SFTP-Schritts', output: 'Strukturierter Erfolgsbericht', behavior: 'Erfolg nach Verifikation beider URLs und bestätigtem Entfernen des Markers.' })
  w.link(clear, success)
  addMail(w, success, 'Erfolg', 'MNI Knowledge Hub – Veröffentlichung', true)

  const rollback = checkedStage('Rollback-Ursache erfassen', `
const {step, type, file} = $input.first().json
const cause = {step, type, file}
console.log(JSON.stringify({sha, deployment: 'rollback-started', ...cause}))
return [{json: {first, cause}}]
`, { input: 'Aktivierungs- oder HTTP-Fehler', output: 'Sanitisierter Grund und Installationsmodus', behavior: 'Bei Fehlern nach einem ersten Rename erfolgt eine Wiederherstellung beider Dateien.', lane: 2 })
  w.link(canVerify, rollback, 1)
  w.link(deliveryOk, rollback, 1)
  const restoreFirst = w.yesNo('Erstinstallation zurücksetzen?', '$json.first', {
    input: 'Installationsmodus', output: 'Neu angelegte Dateien erfassen oder Backup wiederherstellen',
    behavior: 'Bestehende Dateien werden aus geprüften Rollback-Kopien wiederhergestellt. Sicherungen bleiben erhalten.', lane: 2,
  })
  w.link(rollback, restoreFirst)
  const restorePrepare = w.code('SFTP-Rollback-Renames vorbereiten', items(planned + '.paths.files'), {
    input: 'Dateiplan und verifizierte Rollback-Kopien', output: 'Zwei Wiederherstellungs- und Live-Pfade',
    behavior: 'Verwendet die separate .restore-Datei. Die .bak-Datei bleibt als Sicherung verfügbar.', lane: 2,
  })
  w.link(restoreFirst, restorePrepare, 1)
  const restore = rename('SFTP-Rollback-Kopien aktivieren', '$json.restore', '$json.live')
  w.link(restorePrepare, restore)
  const restoreList = list('SFTP-Bestand nach Erstinstallation lesen', 'remoteDirectory')
  w.link(restoreFirst, restoreList)
  const restoreInspect = checkedStage('Neu angelegte Dateien für Rollback prüfen', `
const {inspectRemote} = loadModule('./deployment')
const state = inspectRemote($input.all().map(item => item.json), paths.remoteDirectory, true, true)
return [{json: {ok: state.ok, file: state.stale, files: state.present, deleteNeeded: state.ok && state.present.length > 0}}]
`, { input: 'Live-Verzeichnis nach fehlgeschlagener Erstinstallation', output: 'Liste neu vorhandener regulärer Zieldateien', behavior: 'Unerwartete Dateitypen oder List-Fehler verlangen manuelle Prüfung.', lane: 2 })
  w.link(restoreList, restoreInspect)
  const needsDelete = w.yesNo('Neu angelegte Dateien vorhanden?', '$json.deleteNeeded', {
    input: 'Zu löschende Pfade', output: 'Gezielte Löschung oder Verifikation', behavior: 'Löschung ausschliesslich für bestätigte und vor dem Lauf fehlende Zieldateien.', lane: 2,
  })
  w.link(restoreInspect, needsDelete)

  const inspectNewPrepare = checkedStage('Neu angelegte Dateien zum Rücklesen vorbereiten', `
const candidates = $input.first().json.files
${items('paths.files.filter(entry => candidates.includes(entry.file))')}
`, { input: 'Reguläre neu vorhandene Zieldateien', output: 'SFTP-Lesepfade', behavior: 'Liest bei Wiederherstellung nur betroffene Dateinamen.', lane: 2 })
  w.link(needsDelete, inspectNewPrepare)
  const inspectNewDownload = download('Neu angelegte SFTP-Dateien zurücklesen', '$json.live')
  w.link(inspectNewPrepare, inspectNewDownload)
  const inspectNew = checkedStage('Eigentum der neuen Dateien prüfen', `
const rows = $input.all()
const expected = ${ref(inspectNewPrepare, 'all()')}.map(item => item.json)
let ok = rows.length === expected.length
for (const [i, row] of rows.entries()) {
  if (!ok || row.json.error || !row.binary?.data || !expected[i]) { ok = false; break }
  try {
    const buffer = await this.helpers.getBinaryDataBuffer(i, 'data')
    if (!Buffer.from(${bundleFiles}.outputs[expected[i].file], 'utf8').equals(buffer)) { ok = false; break }
  } catch { ok = false; break }
}
return [{json: {ok, files: expected}}]
`, { input: 'Live-Bytes und Kandidaten des laufenden Deployments', output: 'Löschfreigabe für eigene Dateien', behavior: 'Bei abweichenden Bytes ist keine automatische Löschung erlaubt.', lane: 2 })
  w.link(inspectNewDownload, inspectNew)
  const ownFiles = w.yesNo('Nur eigene Dateien zum Löschen?', '$json.ok', {
    input: 'Vergleich mit den übertragenen Kandidaten', output: 'Löschen oder Prüfung ohne Löschung', behavior: 'Fremde und unlesbare Dateien bleiben erhalten.', lane: 2,
  })
  w.link(inspectNew, ownFiles)
  const deletePrepare = w.code('Rollback-Löschpfade vorbereiten', items('$input.first().json.files'), {
    input: 'Bestätigte eigene Zieldateien', output: 'Löschpfade je Datei', behavior: 'Menge wurde per Bytevergleich geprüft.', lane: 2,
  })
  w.link(ownFiles, deletePrepare)
  const removeNew = erase('Neue Dateien nach fehlgeschlagener Erstinstallation entfernen', '$json.live')
  w.link(deletePrepare, removeNew)
  const restoreStatus = checkedStage('SFTP-Rollback-Ergebnisse auswerten', `
const {operationResult} = loadModule('./deployment')
const rows = $input.all()
const expected = first && $("Rollback-Löschpfade vorbereiten").isExecuted
  ? $("Rollback-Löschpfade vorbereiten").all().map(item => item.json.file) : FILES
const outcome = first && !$("Rollback-Löschpfade vorbereiten").isExecuted
  ? {ok: rows.length === 1 && rows[0].json.ok === true, file: rows[0]?.json.file || null}
  : operationResult(rows, expected, item => item.json.success === true)
return [{json: {...outcome, first}}]
`, { input: 'Wiederherstellung, Löschung oder Sperre', output: 'Operationsergebnis und Installationsmodus',
    behavior: 'Auch bei Fehlern werden die SFTP- und HTTP-Zustände geprüft.', lane: 2 })
  for (const [node, output] of [[restore, 0], [needsDelete, 1], [ownFiles, 1], [removeNew, 0]]) {
    w.link(node, restoreStatus, output)
  }
  const verifyFirst = w.yesNo('Abwesenheit nach Rollback prüfen?', '$json.first', {
    input: 'Installationsmodus und Operationsergebnis', output: 'Live-Verzeichnis oder Dateien prüfen',
    behavior: 'Erstinstallation erwartet beide Dateien abwesend. Aktualisierung erwartet beide Originale.', lane: 2,
  })
  w.link(restoreStatus, verifyFirst)
  const verifyEmpty = list('SFTP-Verzeichnis nach Rollback prüfen', 'remoteDirectory')
  w.link(verifyFirst, verifyEmpty)
  const validateEmpty = checkedStage('SFTP-Abwesenheit nach Rollback bestätigen', `
const {inspectRemote} = loadModule('./deployment')
const state = inspectRemote($input.all().map(item => item.json), paths.remoteDirectory, true)
return [{json: {ok: state.ok, file: state.stale}}]
`, { input: 'Aktuelles SFTP-Verzeichnis', output: 'Abwesenheit beider Zieldateien',
    behavior: 'Eine HTTP-404-Antwort alleine reicht für eine bestätigte Wiederherstellung nicht aus.', lane: 2 })
  w.link(verifyEmpty, validateEmpty)
  const verifyFiles = w.code('SFTP-Rollback-Volltexte vorbereiten', items(planned + '.paths.files'), {
    input: 'Dateiplan', output: 'Zwei Live-Pfade', behavior: 'Prüft beide Zieldateien unabhängig vom HTTP-Cache.', lane: 2,
  })
  w.link(verifyFirst, verifyFiles, 1)
  const verifyDownloads = download('SFTP-Live-Dateien nach Rollback herunterladen', '$json.live')
  w.link(verifyFiles, verifyDownloads)
  const validateRestored = checkedStage('SFTP-Originale nach Rollback bytegenau prüfen', `
const {operationResult} = loadModule('./deployment')
const rows = $input.all()
const status = operationResult(rows, FILES, item => Boolean(item.binary?.data))
if (!status.ok) return [{json: status}]
const originals = ${previousBytes}
for (const [index, file] of FILES.entries()) {
  try {
    const bytes = await this.helpers.getBinaryDataBuffer(index, 'data')
    if (Buffer.from(originals[file], 'utf8').equals(bytes)) continue
  } catch { /* Restore remains unconfirmed. */ }
  return [{json: {ok: false, file}}]
}
return [{json: {ok: true, file: null}}]
`, { input: 'Wiederhergestellte Live-Bytes und ursprüngliche Referenz', output: 'Bytevergleich beider Originale',
    behavior: 'SFTP-Lesefehler oder abweichende Originale verwerfen die Verifikation.', lane: 2 })
  w.link(verifyDownloads, validateRestored)
  const rollbackRequests = checkedStage('Öffentliche Rollback-Prüfung vorbereiten', `
const {publicRequests} = loadModule('./deployment')
const origin = $input.first().json
return publicRequests(config, String($execution.id), 'rollback').map(request => ({json: {...request, origin}}))
`, { input: 'Verifikation am SFTP-Ursprung und feste URLs', output: 'Zwei öffentliche HTTP-Requests',
    behavior: 'Prüft auch uneindeutige Rename- und Delete-Antworten.', lane: 2 })
  w.link(validateEmpty, rollbackRequests)
  w.link(validateRestored, rollbackRequests)
  const rollbackHttp = w.http('Öffentlichen Rollback-Zustand abrufen', { input: 'Zwei Rollback-Prüf-URLs' })
  w.link(rollbackRequests, rollbackHttp)
  const restoreVerify = checkedStage('Rollback verifizieren und Fehler melden', `
const {compareDelivery, recoveryResult} = loadModule('./deployment')
${readPublic}
const status = ${ref(restoreStatus)}
const origin = ${ref(rollbackRequests)}.origin
const delivery = compareDelivery(references, Object.fromEntries(FILES.map(file => [file,
  first ? null : ${comparison}.references[file].text])))
const rollback = recoveryResult(status, {ok: origin.ok && delivery.ok})
const cause = ${ref(rollback)}.cause
reject(cause.step, cause.type, cause.file || status.file || origin.file || delivery.file,
  {deployment: 'failed-marker-pending', rollback})
`, { input: 'Beide öffentlichen Ergebnisse und der Stand vor dem Lauf', output: 'Sanitisierter Fehler einschliesslich Rollback-Ergebnis', behavior: 'Marker bleibt zur Betreiberprüfung erhalten. Der Lauf schlägt auch nach erfolgreichem Rollback fehl.', lane: 2 })
  w.link(rollbackHttp, restoreVerify)
}

function addMail(w, source, label, subject, productionOnly) {
  const prefix = label === 'Fehler' ? 'Fehler' : 'Erfolgs'
  const settingsName = w.code(prefix + 'benachrichtigung konfigurieren', `
const {result, notify} = $input.first().json
// In n8n nach dem Import konfigurieren. Ausschliesslich die Betreiber-Mailadressen.
const mail = { enabled: false, from: '', to: '' }
const address = value => /^[A-Za-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/u.test(value)
const shouldSend = Boolean(notify && mail.enabled && ${productionOnly ? "$mode === 'trigger'" : "$mode === 'error'"})
if (shouldSend && (!address(mail.from) || !address(mail.to))) throw new Error('MNI SMTP: ungültige Mailkonfiguration')
return [{json: {result, mail, shouldSend}}]
`, { input: 'Bereinigter Ergebnisbericht und Versandwunsch', output: 'Entscheid und SMTP-Adressen',
    behavior: 'Standardmässig aus. Manuelle Tests senden keine E-Mails.' })
  w.link(source, settingsName)
  const mailGate = w.yesNo(prefix + 'meldung senden?', '$json.shouldSend', {
    input: 'Freigabewert', output: 'SMTP oder Abschlussbericht', behavior: 'Versand nur bei ausdrücklicher Konfiguration und passendem Ausführungsmodus.',
  })
  w.link(settingsName, mailGate)
  const email = w.node(label + ' per E-Mail melden', 'emailSend', 2.1, {
    resource: 'email', operation: 'send', fromEmail: expr('$json.mail.from'), toEmail: expr('$json.mail.to'),
    subject, emailFormat: 'text', text: expr('JSON.stringify($json.result, null, 2)'), options: { appendAttribution: false },
  }, { input: 'Bereinigter JSON-Bericht', output: 'SMTP-Zustellstatus', credential: 'SMTP',
    behavior: 'Deaktiviert ausgeliefert. Nur bereinigte Meldungen. SMTP-Fehler bleiben erkennbar.' },
  { disabled: true, onError: 'continueRegularOutput' })
  w.link(mailGate, email)
  const finish = w.code(prefix + 'bericht ausgeben', `
const {result, shouldSend} = ${ref(settingsName)}
const response = $input.first().json
const confirmed = !response.error && Array.isArray(response.accepted) && response.accepted.length > 0
const notification = shouldSend ? (confirmed ? 'sent' : 'failed') : 'disabled'
const report = {...result, notification}
console.log(JSON.stringify(report))
return [{json: report}]
`, { input: 'Bericht und optionaler SMTP-Status', output: 'Bereinigter Abschlussbericht',
    behavior: 'Fehler beim SMTP-Versand werden im Ergebnis ausgewiesen. Der Deployment-Status bleibt erhalten.' })
  w.link(mailGate, finish, 1)
  w.link(email, finish)
}

function errorWorkflow(main) {
  const w = workflow('MNI | Knowledge Hub | Error Monitoring')
  const trigger = w.node('Workflow-Fehler empfangen', 'errorTrigger', 1, {}, {
    input: 'n8n-Fehlerereignis', output: 'Ausführung und Workflow-Kontext',
    behavior: 'In den Einstellungen des Build-Workflows zuordnen. n8n löst ihn bei automatischen Fehlern aus.',
  })
  const sanitize = w.code('Fehlermeldung bereinigen', `
const {errorReport} = loadModule('./monitoring')
const report = errorReport($input.first().json, new Date().toISOString(), ${JSON.stringify(main.nodes.map(node => node.name))})
console.log(JSON.stringify(report.result))
return [{json: report}]
`, { input: 'n8n-Ereignis', output: 'Zeitpunkt, Workflow, Schritt, Fehlertyp, Datei, SHA, Deployment und Rollback',
    behavior: 'Verarbeitet nur erwartete Felder und verzichtet auf Rohfehler, Stacktraces und Quellinhalte.' }, ['monitoring'])
  w.link(trigger, sanitize)
  addMail(w, sanitize, 'Fehler', 'MNI Knowledge Hub – Fehler', false)
  return w.finish()
}

function writeOrCheck(name, value, check) {
  const filename = path.join(root, name)
  if (!check) fs.writeFileSync(filename, value)
  else if (read(name) !== value) throw new Error(name + ' is out of date')
}

function catalogue(title, rows) {
  return '### ' + title + '\n\n| Node | Typ | Eingabe | Ausgabe | Credential | Parameter und Fehlerverhalten |\n' +
    '| --- | --- | --- | --- | --- | --- |\n' + rows.map(row => '| ' +
      [row.name, row.type, row.input, row.output, row.credential, row.behavior].join(' | ') + ' |').join('\n')
}

function main(check) {
  const build = buildWorkflow()
  const errors = errorWorkflow(build.data)
  for (const [name, workflow] of [['build-llms-workflow.json', build], ['error-workflow.json', errors]]) {
    writeOrCheck(name, JSON.stringify(workflow.data, null, 2) + '\n', check)
  }
  const readme = read('README.md')
  const start = '<!-- node-catalogue:start -->'
  const end = '<!-- node-catalogue:end -->'
  if (!readme.includes(start) || !readme.includes(end)) throw new Error('Node catalogue markers are missing')
  const nodes = catalogue('Build und Deployment', build.docs) + '\n\n' + catalogue('Fehlerüberwachung', errors.docs)
  writeOrCheck('README.md', readme.slice(0, readme.indexOf(start) + start.length) + '\n\n' + nodes +
    '\n\n' + readme.slice(readme.indexOf(end)), check)
}

if (require.main === module) main(process.argv.includes('--check'))

module.exports = { buildWorkflow, errorWorkflow }
