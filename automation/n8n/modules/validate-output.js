'use strict'

const { FILES, SECTIONS, approvedDocuments, fail, isPublicUrl, documentAnchor } = require('./parse-config')
const { decodeUtf8 } = require('./github-content')

function structuralMarkdown(text) {
  let fence
  return text.split('\n').map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined
      return ' '.repeat(line.length)
    }
    if (!marker) return line
    fence = marker[1]
    return ' '.repeat(line.length)
  }).join('\n')
}

function identifiers(text) {
  return [...text.matchAll(/^<a id="(mni-[a-z0-9-]+)"><\/a>$/gmu)]
}

function validateOutput(config, build, sha) {
  const reject = (type, file) => fail('Validierung', type, { file, sha, notify: config.monitoring.notifyOnError })
  const docs = approvedDocuments(config)
  const indexed = docs.filter(doc => doc.includeInIndex && doc.publicUrl)
  const full = docs.filter(doc => doc.includeFullText)
  const sizes = {}
  if (!build.outputs || Object.keys(build.outputs).length !== FILES.length) reject('missing_output')
  for (const file of FILES) {
    const text = build.outputs[file]
    if (typeof text !== 'string' || !text.trim() || !text.endsWith('\n') || !text.startsWith('# mniConsult – Transform. Innovate. Live.\n\n')) reject('invalid_output_structure', file)
    const bytes = Buffer.from(text, 'utf8')
    if (bytes.length > config.generation.maximumOutputBytes) reject('output_too_large', file)
    if (decodeUtf8(bytes) !== text || text.includes('\uFFFD')) reject('invalid_utf8', file)
    if (/\b(?:TODO|TBD|Lorem ipsum|Beispieltext)\b|\[(?:Platzhalter|XX)\]/u.test(text)) reject('placeholder', file)
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b|\b(?:password|passwort|api[_ -]?key|access[_ -]?token)\s*[:=]\s*["']?[^\s"',]{12,}/iu.test(text)) reject('suspected_secret', file)
    for (const match of text.matchAll(/\b(?:https?|ftp|file|sftp):\/\/[^\s<>\x60\]\)"']+/giu)) {
      if (!isPublicUrl(match[0].replace(/[.,;!?]+$/u, ''))) reject('unsafe_url', file)
    }
    sizes[file] = bytes.length
  }
  const [index, text] = FILES.map(file => build.outputs[file])
  const sections = value => [...value.matchAll(/^## (.+)$/gmu)].map(match => match[1])
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const indexSections = [...new Set(SECTIONS.filter(section => indexed.some(doc => doc.section === section))
    .map(section => SECTIONS.indexOf(section) >= 10 ? 'Optional' : section))]
  const fullSections = SECTIONS.filter(section => full.some(doc => doc.section === section))
  const structure = structuralMarkdown(text)
  if (!same(sections(index), indexSections) ||
      !same(sections(structure), ['Unternehmensübersicht', ...(full.length ? ['Themenübersicht'] : []), ...fullSections])) reject('invalid_sections')
  const urls = [...index.matchAll(/^- \[[^\]\n]+\]\(([^)\s]+)\): .+$/gmu)].map(match => match[1])
  if (!same(urls, indexed.map(doc => doc.publicUrl)) || !same(build.indexedPaths, indexed.map(doc => doc.path))) reject('invalid_index_links', FILES[0])

  const anchors = identifiers(structure)
  if (!same(anchors.map(anchor => anchor[1]), full.map(doc => documentAnchor(doc.path))) ||
      !same(build.manifest.map(entry => entry.path), full.map(doc => doc.path))) reject('invalid_document_manifest', FILES[1])
  for (let i = 0; i < anchors.length; i++) {
    const remainder = text.slice(anchors[i].index, anchors[i + 1]?.index ?? text.length)
    const chapter = remainder.replace(/\n\n## [^\n]+\n\n$/u, '').trimEnd()
    if (Buffer.byteLength(chapter, 'utf8') !== build.manifest[i].bytes) reject('incomplete_document', FILES[1])
  }
  return { status: 'validated', sizes, indexed: indexed.length, full: full.length,
    warnings: build.warnings, publishable: indexed.length > 0 && full.length > 0 }
}

function comparePublic(config, build, references, sha) {
  const missing = FILES.filter(file => references[file]?.status === 404)
  const report = {}
  for (const file of FILES) {
    const item = references[file]
    const reject = type => fail('Öffentliche Referenz', type, { file, sha, notify: config.monitoring.notifyOnError })
    if (item?.status === 404) {
      report[file] = { status: 404, previousBytes: null, changed: true, sizeRatio: null }
      continue
    }
    if (item?.status !== 200 || typeof item.text !== 'string' || !item.text.trim()) reject('baseline_unavailable')
    const previousBytes = Buffer.byteLength(item.text, 'utf8')
    const sizeRatio = Buffer.byteLength(build.outputs[file], 'utf8') / previousBytes
    report[file] = { status: 200, previousBytes, changed: item.text !== build.outputs[file], sizeRatio }
  }
  const reasons = []
  if (missing.length === 1) reasons.push('mixed_public_state')
  if (missing.length === FILES.length && !config.deployment.allowFirstInstallation) reasons.push('first_installation_disabled')
  if (FILES.some(file => report[file].sizeRatio !== null && report[file].sizeRatio < config.monitoring.minimumSizeRatio)) {
    reasons.push('minimum_size_ratio')
  }
  return { files: report, firstInstallation: missing.length === FILES.length, reasons,
    changed: FILES.some(file => report[file].changed) }
}

module.exports = { validateOutput, comparePublic }
