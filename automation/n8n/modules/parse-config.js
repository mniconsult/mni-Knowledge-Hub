'use strict'

const SITE = 'https://mniconsult.ch'
const API = 'https://api.github.com/repos/mniconsult/mni-Knowledge-Hub'
const CONFIG_PATH = 'config/llms-config.json'
const FILES = ['llms.txt', 'llms-full.txt']
const SECTIONS = [
  'Unternehmen', 'KI und Innovation', 'Projektmanagement', 'Microsoft Project',
  'Cloud Computing', 'Cyber Security', 'NewLifeVision', 'Academy und Mentoring',
  'Services', 'Podcasts und Blog', 'FAQ und Use Cases', 'Glossar',
]
const INTERNAL = new Set(['knowledge/avatar.md', 'knowledge/roadmap.md', 'knowledge/index.md'])
const DOCUMENT_PATH = /^knowledge\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u
const SHA = /^[a-f0-9]{40}$/u
const ERROR_STEPS = ['GitHub-Commit', 'GitHub-Baum', 'Konfiguration', 'GitHub-Dokumente', 'Markdown',
  'Generierung', 'Validierung', 'Öffentliche Referenz', 'SFTP-Vorprüfung', 'SFTP-Staging',
  'SFTP-Backup', 'SFTP-Aktivierung', 'Öffentliche Verifikation', 'SFTP-Abschluss', 'Monitoring']

function fail(step, type, details = {}) {
  const { file, sha, deployment = 'blocked', rollback = 'not-needed', notify = true } = details
  throw new Error('MNI_PHASE6 ' + JSON.stringify({
    step, type, file: DOCUMENT_PATH.test(file) || FILES.includes(file) || file === CONFIG_PATH ? file : null,
    sha: SHA.test(sha) ? sha : null, deployment, rollback, notify,
  }))
}

function isPublicUrl(value) {
  return typeof value === 'string' &&
    /^https:\/\/(?:mniconsult\.ch|tiviva\.blog)(?:\/[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)?)*\/?(?:#[A-Za-z0-9_-]+)?$/u.test(value) &&
    !/[\r\n]/u.test(value) &&
    !/\/(?:wp-admin|wp-json|wp-login\.php|\.well-known|private|intern|staging|backup)(?:[\/#]|$)/iu.test(value)
}

function keys(value, names, check) {
  check(value && typeof value === 'object' && !Array.isArray(value))
  check(Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name)))
}

function parseConfig(source, sha) {
  let config
  const check = (ok, type = 'invalid_config', file) => {
    if (!ok) fail('Konfiguration', type, { sha, file })
  }
  try { config = JSON.parse(source) } catch { check(false, 'invalid_json') }

  keys(config, ['schemaVersion', 'site', 'repository', 'generation', 'deployment', 'monitoring', 'documents'], check)
  const { site, repository, generation, deployment, monitoring, documents } = config
  const line = value => typeof value === 'string' && value.length <= 1000 &&
    value.length > 0 && value.trim() === value && !/[\p{Cc}\p{Cf}\[\]<>\\]/u.test(value)
  const integer = (value, max) => Number.isSafeInteger(value) && value > 0 && value <= max
  keys(site, ['name', 'organisation', 'baseUrl', 'language', 'tagline', 'description'], check)
  check(config.schemaVersion === '1.0' && site.name === 'mniConsult' &&
    site.organisation === 'mniConsult GmbH' && site.baseUrl === SITE && site.language === 'de-CH' &&
    site.tagline === 'Transform. Innovate. Live.' && line(site.description))
  keys(repository, ['owner', 'name', 'branch'], check)
  check(repository.owner === 'mniconsult' && repository.name === 'mni-Knowledge-Hub' && repository.branch === 'main')

  keys(generation, ['llmsTxt', 'llmsFullTxt', 'deterministic', 'includeUnapproved', 'stripFrontmatter',
    'preserveMarkdown', 'maximumOutputBytes', 'maximumSourceBytes'], check)
  check(generation.llmsTxt === true && generation.llmsFullTxt === true && generation.deterministic === true &&
    generation.stripFrontmatter === true && generation.preserveMarkdown === true && generation.includeUnapproved === false)
  check(integer(generation.maximumOutputBytes, 20000000) && integer(generation.maximumSourceBytes, 10000000))

  keys(deployment, ['enabled', 'method', 'remoteDirectory', 'privateDirectory', 'temporarySuffix', 'backupEnabled',
    'verifyPublicUrls', 'publicLlmsUrl', 'publicLlmsFullUrl', 'allowFirstInstallation', 'providerRenameVerified'], check)
  const directory = value => value === null || (typeof value === 'string' && value.length <= 240 &&
    /^\/(?:[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)(?:\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)*$/u.test(value) && !/[\r\n]/u.test(value))
  check(deployment.method === 'sftp' && deployment.backupEnabled === true && deployment.verifyPublicUrls === true &&
    directory(deployment.remoteDirectory) && directory(deployment.privateDirectory) &&
    typeof deployment.temporarySuffix === 'string' && /^\.[a-z][a-z0-9-]{0,19}$/u.test(deployment.temporarySuffix) &&
    !/[\r\n]/u.test(deployment.temporarySuffix) && !['.bak', '.pending', '.restore'].includes(deployment.temporarySuffix))
  check(deployment.publicLlmsUrl === SITE + '/' + FILES[0] && deployment.publicLlmsFullUrl === SITE + '/' + FILES[1])
  for (const key of ['enabled', 'allowFirstInstallation', 'providerRenameVerified']) check(typeof deployment[key] === 'boolean')
  keys(monitoring, ['notifyOnError', 'notifyOnSuccess', 'preventConcurrentDeployment', 'minimumSizeRatio', 'singleWriterVerified'], check)
  for (const key of ['notifyOnError', 'notifyOnSuccess', 'singleWriterVerified']) check(typeof monitoring[key] === 'boolean')
  check(monitoring.preventConcurrentDeployment === true && Number.isFinite(monitoring.minimumSizeRatio) &&
    monitoring.minimumSizeRatio >= 0 && monitoring.minimumSizeRatio <= 1)
  if (deployment.enabled) {
    const { remoteDirectory, privateDirectory } = deployment
    check(remoteDirectory && privateDirectory && privateDirectory !== remoteDirectory &&
      !privateDirectory.startsWith(remoteDirectory + '/') && !remoteDirectory.startsWith(privateDirectory + '/') &&
      deployment.providerRenameVerified && monitoring.singleWriterVerified, 'deployment_prerequisites')
  }

  check(Array.isArray(documents) && documents.length > 0 && documents.length <= 100, 'invalid_catalogue')
  const paths = new Set()
  const orders = new Set()
  const indexUrls = new Set()
  for (const doc of documents) {
    keys(doc, ['path', 'title', 'section', 'order', 'approved', 'includeInIndex', 'includeFullText', 'publicUrl', 'description'], check)
    const { path, order, publicUrl } = doc
    check(typeof path === 'string' && DOCUMENT_PATH.test(path) && !/[\r\n]/u.test(path), 'invalid_document_path')
    check(integer(order, 100000) && SECTIONS.includes(doc.section) && line(doc.title) && line(doc.description), 'invalid_catalogue', path)
    check(!paths.has(path) && !orders.has(order), 'duplicate_document_path_or_order', path)
    for (const key of ['approved', 'includeInIndex', 'includeFullText']) check(typeof doc[key] === 'boolean', 'invalid_boolean', path)
    check(!doc.approved || (!INTERNAL.has(path) && (doc.includeInIndex || doc.includeFullText)), 'forbidden_approval', path)
    check(publicUrl === null || (isPublicUrl(publicUrl) && !publicUrl.includes('#')), 'invalid_public_url', path)
    if (doc.approved && doc.includeInIndex && publicUrl) {
      const canonical = publicUrl.replace(/\/$/u, '')
      check(!indexUrls.has(canonical), 'duplicate_public_url', path)
      indexUrls.add(canonical)
    }
    paths.add(path)
    orders.add(order)
  }
  return config
}

function documentAnchor(path) {
  return 'mni-' + path.slice('knowledge/'.length, -'.md'.length)
}

function approvedDocuments(config) {
  return config.documents.filter(doc => doc.approved).sort((a, b) =>
    SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || a.order - b.order)
}

module.exports = { SITE, API, CONFIG_PATH, FILES, SECTIONS, DOCUMENT_PATH, SHA, ERROR_STEPS, fail, isPublicUrl, parseConfig, approvedDocuments, documentAnchor }
