'use strict'

const { fail, SHA, CONFIG_PATH } = require('./parse-config')

function decodeUtf8(bytes) {
  const decoded = bytes.toString('utf8')
  if (!Buffer.from(decoded, 'utf8').equals(bytes) || decoded.includes('\u0000')) throw new Error('invalid_utf8')
  return decoded
}

function treeSources(text, expectedTree, commit) {
  try {
    const data = JSON.parse(text)
    if (data?.sha !== expectedTree || data.truncated !== false || !Array.isArray(data.tree)) throw new Error()
    const sources = new Map()
    for (const entry of data.tree) {
      if (entry?.path !== CONFIG_PATH && !/^knowledge\//u.test(entry?.path)) continue
      if (typeof entry.path !== 'string' || sources.has(entry.path)) throw new Error()
      sources.set(entry.path, { type: entry.type, mode: entry.mode, sha: entry.sha, size: entry.size })
    }
    return Object.fromEntries(sources)
  } catch {
    fail('GitHub-Baum', 'invalid_git_tree', { sha: commit })
  }
}

function requireSource(sources, path, limit, sha, notify = true) {
  const step = path === CONFIG_PATH ? 'Konfiguration' : 'GitHub-Dokumente'
  const source = sources[path]
  if (!source) fail(step, 'missing_source', { file: path, sha, notify })
  if (source.type !== 'blob' || !['100644', '100755'].includes(source.mode) ||
      typeof source.sha !== 'string' || !SHA.test(source.sha) ||
      !Number.isSafeInteger(source.size) || source.size < 1 || source.size > limit) {
    fail(step, 'invalid_source_entry', { file: path, sha, notify })
  }
  return { blobSha: source.sha, size: source.size }
}

function decodeGitHub(bytes, headers, path, limit, sha, notify = true, source) {
  const step = path === CONFIG_PATH ? 'Konfiguration' : 'GitHub-Dokumente'
  try {
    if (bytes.length > Math.ceil(limit * 1.45) + 4096) throw new Error('source_too_large')
    const contentType = String(headers['content-type'] || '').toLowerCase()
    // Contents REST metadata and raw JSON files can both have a JSON media type.
    const decoded = decodeUtf8(bytes)
    if (contentType.includes('json') && /^\s*\{/u.test(decoded)) {
      const data = JSON.parse(decoded)
      if (Object.hasOwn(data, 'encoding') || Object.hasOwn(data, 'content')) {
        if (data.type !== 'file' || data.path !== path || data.encoding !== 'base64' ||
            typeof data.content !== 'string' || !Number.isSafeInteger(data.size) || data.size < 1 ||
            data.size > limit || !SHA.test(data.sha) ||
            (source && (data.sha !== source.blobSha || data.size !== source.size))) throw new Error('invalid_contents_response')
        const encoded = data.content.replace(/[\r\n]/gu, '')
        const file = Buffer.from(encoded, 'base64')
        if (file.toString('base64') !== encoded || file.length !== data.size) throw new Error('invalid_base64')
        return decodeUtf8(file)
      }
    }
    if (!bytes.length || bytes.length > limit || (source && bytes.length !== source.size)) throw new Error('invalid_source_size')
    if (/^(?:text\/html|application\/xhtml\+xml)/u.test(contentType)) throw new Error('unexpected_media_type')
    return decoded
  } catch {
    fail(step, 'source_invalid_or_too_large', { file: path, sha, notify })
  }
}

function responseDecision(response, attempt, now) {
  const { statusCode: status, headers = {}, error } = response
  if (status === 200 && !error) return { ok: true }
  const header = headers['retry-after']
  const limited = status === 429 || (status === 403 && (header !== undefined || headers['x-ratelimit-remaining'] === '0'))
  const transient = limited || status === 408 || (status >= 500 && status <= 599) || Boolean(error && !status)
  const numeric = /^\d+$/u.test(String(header)) ? Number(header) : NaN
  const defaultDelay = limited && String(headers['x-ratelimit-remaining']) !== '0' ? 60 : 0
  const requested = header === undefined ? defaultDelay :
    Number.isFinite(numeric) ? numeric : Math.ceil((Date.parse(header) - now) / 1000)
  const reset = String(headers['x-ratelimit-remaining']) === '0'
    ? Math.ceil(Number(headers['x-ratelimit-reset']) - now / 1000) : 0
  const delay = Math.max(2 ** attempt, requested, reset)
  const type = limited ? 'github_rate_limited' : status ? 'github_http_' + status : 'github_transport'
  return { ok: false, type, retryIn: transient && attempt < 2 && delay <= 30 ? delay : null }
}

module.exports = { treeSources, requireSource, decodeUtf8, decodeGitHub, responseDecision }
