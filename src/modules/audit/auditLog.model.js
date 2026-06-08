const mongoose = require('mongoose')

const AUDIT_ENTITY_TYPES = ['request', 'offer', 'trip']
const AUDIT_ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'message_added',
  'deleted',
  'offer_accepted',
  'offer_rejected',
]

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorRole: {
      type: String,
      trim: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v
        return ret
      },
    },
  },
)

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

module.exports = { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, AuditLog }
