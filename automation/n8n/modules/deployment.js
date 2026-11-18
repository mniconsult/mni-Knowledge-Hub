'use strict'

const { FILES, fail } = require('./parse-config')

const PENDING_PREFIX = 'mni-llms-pending-'

function deploymentDecision(config, report, comparison, scheduled) {
  const reasons = [...comparison.reasons]
  if (!report.publishable) reasons.push('missing_public_index_or_full_text')
  if (!comparison.changed) reasons.push('up_to_date')
  if (!scheduled) reasons.push('manual_test')
  if (!config.deployment.enabled) reasons.push('deployment_disabled')
  return { enabled: reasons.length === 0, reasons }
}

function publicRequests(config, id, phase) {
  const { publicLlmsUrl, publicLlmsFullUrl } = config.deployment
  return [publicLlmsUrl, publicLlmsFullUrl].map((url, i) => ({
    file: FILES[i], url: url + '?mni_check=' + encodeURIComponent(id + '-' + phase),
  }))
}

function deploymentPaths(config, executionId, sha) {
  if (!/^[a-z0-9-]{1,64}$/iu.test(executionId)) fail('SFTP-Vorprüfung', 'invalid_execution_id', { sha })
  const { remoteDirectory, privateDirectory, temporarySuffix } = config.deployment
  return {
    remoteDirectory,
    privateDirectory,
    marker: privateDirectory + '/' + PENDING_PREFIX + executionId + '.json',
    files: FILES.map(file => ({
      file,
      live: remoteDirectory + '/' + file,
      staging: privateDirectory + '/' + file + '.' + executionId + temporarySuffix,
      backup: privateDirectory + '/' + file + '.' + executionId + '.bak',
      restore: privateDirectory + '/' + file + '.' + executionId + '.restore',
    })),
  }
}

function listing(items, path) {
  if (!items.length || items.some(item => item.error ||
      (Object.keys(item).length && (typeof item.name !== 'string' || typeof item.type !== 'string' ||
        item.path !== path + '/' + item.name)))) return null
  return items.filter(item => item.name)
}

function inspectRemote(items, path, firstInstallation, rollback = false) {
  const files = listing(items, path)
  if (!files) return { ok: false, stale: null, present: [] }
  const present = []
  for (const file of FILES) {
    const matches = files.filter(entry => entry.name === file)
    if (matches.length > 1 || matches.some(entry => entry.type !== '-')) return { ok: false, stale: file, present }
    if (matches.length) present.push(file)
    if (!rollback && (matches.length === 0) !== firstInstallation) return { ok: false, stale: file, present }
  }
  return { ok: true, stale: null, present }
}

function operationResult(items, files, check = () => true) {
  if (items.length !== files.length) return { ok: false, file: null }
  const bad = items.findIndex((item, index) => item.json.error || !check(item, index))
  return { ok: bad === -1, file: bad < 0 ? null : files[bad] }
}

function compareDelivery(responses, expected) {
  const file = FILES.find(name => expected[name] === null
    ? responses[name]?.status !== 404
    : responses[name]?.status !== 200 || responses[name]?.text !== expected[name])
  return { ok: !file, file: file || null }
}

function recoveryResult(operations, delivery) {
  if (!operations.ok) return 'manual-recovery-required'
  return delivery.ok ? 'restored' : 'verification-failed'
}

module.exports = {
  PENDING_PREFIX, deploymentDecision, publicRequests, deploymentPaths,
  listing, inspectRemote, operationResult, compareDelivery, recoveryResult,
}
