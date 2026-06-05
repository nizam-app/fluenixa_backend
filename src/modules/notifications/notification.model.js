const mongoose = require('mongoose')

const NOTIFICATION_TYPES = [
  'offer_received',
  'offer_accepted',
  'offer_rejected',
  'offer_withdrawn',
  'request_created',
  'request_status',
  'trip_updated',
  'system',
]

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
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

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = { NOTIFICATION_TYPES, Notification }
