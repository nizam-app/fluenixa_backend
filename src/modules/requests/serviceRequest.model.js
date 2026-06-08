const mongoose = require('mongoose')
const { NEED_TYPES } = require('../trips/trip.model')

const REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled']

const serviceRequestSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    needType: {
      type: String,
      enum: NEED_TYPES,
      required: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    messages: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        body: {
          type: String,
          trim: true,
          maxlength: 3000,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    acceptedOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
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

serviceRequestSchema.index({ organizer: 1, trip: 1, needType: 1 })
serviceRequestSchema.index({ provider: 1, status: 1 })

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema)

module.exports = { REQUEST_STATUSES, ServiceRequest }
