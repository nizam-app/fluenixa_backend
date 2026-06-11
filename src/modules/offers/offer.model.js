const mongoose = require('mongoose')

const OFFER_STATUSES = ['submitted', 'accepted', 'rejected', 'withdrawn']
const OFFER_TIERS = ['standard', 'recommended']

const offerSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: 'submitted',
      index: true,
    },
    tier: {
      type: String,
      enum: OFFER_TIERS,
      default: 'standard',
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    attachment: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
      fileName: { type: String, trim: true, maxlength: 200 },
      mimeType: { type: String, trim: true, maxlength: 120 },
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

offerSchema.index({ request: 1, provider: 1 }, { unique: true })

const Offer = mongoose.model('Offer', offerSchema)

module.exports = { OFFER_STATUSES, OFFER_TIERS, Offer }
