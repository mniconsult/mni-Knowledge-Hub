'use strict'

const yaml = require('./vendor/js-yaml.cjs')
const { DOCUMENT_PATH, fail, isPublicUrl, documentAnchor } = require('./parse-config')

function stripFrontmatter(source) {
  const input = source.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n')
  const match = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*\n/u.exec(input)
  if (!match || match[1].length > 16384) throw new Error('invalid_frontmatter')
  const data = yaml.load(match[1], { schema: yaml.CORE_SCHEMA })
  const textFields = ['title', 'description', 'language', 'owner', 'last_updated', 'category']
  if (!data || !textFields.every(key => Object.hasOwn(data, key) && typeof data[key] === 'string' && data[key].trim()) ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(data.last_updated) || data.language !== 'de-CH' ||
      data.owner !== 'mniConsult GmbH' || !['string', 'number'].includes(typeof data.version) ||
      !['keywords', 'related_documents'].every(key => Array.isArray(data[key]) &&
        data[key].every(entry => typeof entry === 'string' && entry.trim()))) throw new Error('invalid_frontmatter')
  if (['internal', 'draft'].some(key => Object.hasOwn(data, key) && data[key] !== false) ||
      (Object.hasOwn(data, 'visibility') && data.visibility !== 'public')) throw new Error('internal_metadata')
  return { data, body: input.slice(match[0].length) }
}

function reviseLinks(line, doc, catalogue, warnings) {
  // The repository uses inline links. Refuse other destination syntaxes until reviewed.
  if (/^\s*\[[^\]]+\]:|!?\[[^\]]+\]\s*\[|!\[[^\]]*\]\(/u.test(line)) throw new Error('unsupported_link')
  const links = /\[([^\]\n]+)\]\(([^()\s]+)\)/gu
  const residual = line.replace(links, '$1')
  if (/\]\s*\(|<(?!https:\/\/)[A-Za-z/!]|<(?:[^ <>]+@[^ <>]+)>/u.test(residual)) throw new Error('unsupported_markup')
  return line.replace(links, (syntax, label, destination) => {
    if (isPublicUrl(destination)) return syntax
    if (/^#[a-zA-Z0-9_-]+$/u.test(destination)) {
      warnings.push('local_anchor_relinked')
      return '[' + label + '](#' + documentAnchor(doc.path) + ')'
    }
    const relative = /^(?:\.\/)?([a-z0-9-]+\.md)(?:#[a-zA-Z0-9_-]+)?$/u.exec(destination)
    const path = relative && 'knowledge/' + relative[1]
    if (path && DOCUMENT_PATH.test(path)) {
      const target = catalogue.find(candidate => candidate.path === path)
      if (target?.approved && target.includeFullText) {
        if (destination.includes('#')) warnings.push('local_anchor_relinked')
        return '[' + label + '](#' + documentAnchor(path) + ')'
      }
      if (target?.approved && target.publicUrl) return '[' + label + '](' + target.publicUrl + ')'
      if (!target) warnings.push('unknown_internal_link')
      return target ? '' : label
    }
    if (/^\.\.\/(?:README\.md|llms\.txt)$/u.test(destination)) return label
    throw new Error('unsafe_link')
  })
}

function processMarkdown(source, doc, catalogue, sha) {
  try {
    const { body } = stripFrontmatter(source)
    const content = []
    const warnings = []
    let fence
    let currentH1
    let comment = false
    let internal = false
    for (const line of body.split('\n')) {
      if (!fence && !comment && /^\s*<!--\s*(?:mni:)?internal:(?:start|end)\s*-->\s*$/iu.test(line)) {
        const opening = /internal:start/iu.test(line)
        if (opening === internal) throw new Error('invalid_internal_section')
        internal = opening
        continue
      }
      if (internal) continue
      if (fence) {
        content.push(line)
        const ending = /^ {0,3}(`{3,}|~{3,})[ \t]*$/u.exec(line)
        if (ending && ending[1][0] === fence[0] && ending[1].length >= fence.length) fence = undefined
        continue
      }
      const opening = !comment && /^ {0,3}(`{3,}|~{3,}).*$/u.exec(line)
      if (opening) {
        fence = opening[1]
        content.push(line)
        continue
      }
      let remaining = line
      let visible = ''
      while (remaining) {
        const next = remaining.indexOf(comment ? '-->' : '<!--')
        if (next === -1) {
          if (!comment) visible += remaining
          break
        }
        if (!comment) visible += remaining.slice(0, next)
        remaining = remaining.slice(next + (comment ? 3 : 4))
        comment = !comment
      }
      if (/^ {0,3}(?:={2,}|-{2,})\s*$/u.test(visible) && content.at(-1)?.trim() &&
          !/^\s*[-#*|>]/u.test(content.at(-1))) throw new Error('unsupported_setext_heading')
      const heading = /^ {0,3}(#{1,6})[ \t]+(.+)$/u.exec(visible)
      if (heading) {
        if (heading[1].length === 1) {
          if (currentH1 || content.some(entry => entry.trim())) throw new Error('invalid_document_heading')
          currentH1 = reviseLinks(heading[2].replace(/[ \t]+#+[ \t]*$/u, ''), doc, catalogue, warnings).trim()
          continue
        }
        visible = '#'.repeat(Math.min(6, heading[1].length + 2)) + ' ' + heading[2]
      }
      const revised = reviseLinks(visible, doc, catalogue, warnings)
      if (!/^\s*[-*+]\s*$/u.test(revised) || /^\s*[-*+]\s*$/u.test(visible)) content.push(revised)
    }
    if (fence || comment || internal || !currentH1 || !content.join('\n').trim()) throw new Error('incomplete_markdown')
    return { path: doc.path, sourceTitle: currentH1, text: content.join('\n').trim(), warnings }
  } catch (error) {
    const types = ['invalid_frontmatter', 'internal_metadata', 'unsupported_link', 'unsupported_markup',
      'unsafe_link', 'invalid_internal_section', 'unsupported_setext_heading',
      'invalid_document_heading', 'incomplete_markdown']
    fail('Markdown', types.includes(error.message) ? error.message : 'invalid_frontmatter', { file: doc.path, sha })
  }
}

module.exports = { documentAnchor, stripFrontmatter, processMarkdown }
