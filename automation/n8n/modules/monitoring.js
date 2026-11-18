'use strict'

const { SHA, CONFIG_PATH, FILES, DOCUMENT_PATH, ERROR_STEPS } = require('./parse-config')

const WORKFLOW = 'MNI | Knowledge Hub | LLM Build & Publish'
const STATES = ['blocked', 'failed-marker-pending', 'published-marker-pending']
const ROLLBACK = ['not-needed', 'restored', 'verification-failed', 'manual-recovery-required']

function errorReport(event, timestamp, allowedNodes) {
  const { execution, trigger, workflow } = event ?? {}
  const raw = execution?.error?.message || trigger?.error?.message
  let details = {}
  if (typeof raw === 'string' && raw.length <= 2048) {
    const match = /MNI_PHASE6 (\{[^\n]{1,900}\})/u.exec(raw)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = parsed
      } catch { /* Keep the generic event. */ }
    }
  }
  const known = workflow?.name === WORKFLOW
  const last = execution?.lastNodeExecuted
  const safe = typeof details.type === 'string' && /^[a-z0-9_]{1,64}$/u.test(details.type)
  const report = {
    timestamp,
    workflow: known ? WORKFLOW : 'Unbekannter Workflow',
    step: ERROR_STEPS.includes(details.step) ? details.step : allowedNodes.includes(last) ? last : 'Trigger oder Ausführung',
    errorType: safe ? details.type : 'n8n_execution_error',
    file: typeof details.file === 'string' && (details.file === CONFIG_PATH || FILES.includes(details.file) || DOCUMENT_PATH.test(details.file))
      ? details.file : null,
    sha: typeof details.sha === 'string' && SHA.test(details.sha) ? details.sha : null,
    deployment: STATES.includes(details.deployment) ? details.deployment : 'unknown',
    rollback: ROLLBACK.includes(details.rollback) ? details.rollback : 'unknown',
  }
  return { result: report, notify: known && details.notify !== false }
}

module.exports = { errorReport }
