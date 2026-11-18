'use strict'

const { FILES, SECTIONS, approvedDocuments, fail, documentAnchor } = require('./parse-config')

function buildLlms(config, processed, sha) {
  const docs = approvedDocuments(config)
  const entries = new Map(processed.map(doc => [doc.path, doc]))
  if (entries.size !== docs.length || processed.length !== docs.length || docs.some(doc => !entries.has(doc.path))) {
    fail('Generierung', 'missing_or_duplicate_input', { sha, notify: config.monitoring.notifyOnError })
  }
  const indexed = docs.filter(doc => doc.includeInIndex && doc.publicUrl)
  const full = docs.filter(doc => doc.includeFullText)
  const heading = '# ' + config.site.name + ' – ' + config.site.tagline
  const index = [heading, '> ' + config.site.description]
  const text = [heading, '> ' + config.site.description,
    '## Unternehmensübersicht\n\n' + config.site.organisation + ' · ' + config.site.language + '\n\n' + config.site.baseUrl]
  const chapters = SECTIONS.filter(section => full.some(doc => doc.section === section))
  const sectionsForIndex = []
  const groups = []

  for (const section of SECTIONS) {
    const sectionLinks = indexed.filter(doc => doc.section === section)
    if (sectionLinks.length === 0) continue
    const indexSection = SECTIONS.indexOf(section) >= 10 ? 'Optional' : section
    const row = groups.at(-1)
    if (row?.section === indexSection) row.docs.push(...sectionLinks)
    else groups.push({ section: indexSection, docs: sectionLinks })
  }
  for (const { section, docs: group } of groups) {
    sectionsForIndex.push(section)
    index.push('## ' + section + '\n\n' + group.map(doc =>
      '- [' + doc.title + '](' + doc.publicUrl + '): ' + doc.description).join('\n'))
  }

  if (chapters.length) {
    text.push('## Themenübersicht\n\n' + chapters.map(section => '- ' + section).join('\n'))
  }
  const manifest = []
  for (const section of chapters) {
    text.push('## ' + section)
    for (const doc of full.filter(entry => entry.section === section)) {
      const anchor = documentAnchor(doc.path)
      const { sourceTitle, text: body } = entries.get(doc.path)
      const chapter = '<a id="' + anchor + '"></a>\n\n### ' + sourceTitle + '\n\n' + body +
        (doc.publicUrl ? '\n\n**Öffentliche Quelle:** ' + doc.publicUrl : '')
      text.push(chapter)
      manifest.push({ path: doc.path, anchor, bytes: Buffer.byteLength(chapter, 'utf8') })
    }
  }
  return {
    outputs: {
      [FILES[0]]: index.join('\n\n') + '\n',
      [FILES[1]]: text.join('\n\n') + '\n',
    },
    manifest,
    indexedPaths: indexed.map(doc => doc.path),
    indexedUrls: indexed.map(doc => ({ path: doc.path, url: doc.publicUrl })),
    indexSections: sectionsForIndex,
    fullSections: chapters,
    warnings: processed.flatMap(doc => doc.warnings.map(type => ({ file: doc.path, type }))),
  }
}

module.exports = { buildLlms }
