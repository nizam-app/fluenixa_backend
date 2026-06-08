const { AuditLog } = require('../modules/audit/auditLog.model')

async function recordAudit(entry) {
  return AuditLog.create({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    summary: entry.summary,
    changes: entry.changes,
    actor: entry.actor,
    actorRole: entry.actorRole,
    request: entry.request,
    trip: entry.trip,
  })
}

async function listAuditForRequest(requestId) {
  return AuditLog.find({ request: requestId })
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
}

module.exports = { listAuditForRequest, recordAudit }
