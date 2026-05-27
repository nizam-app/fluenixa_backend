const mongoose = require('mongoose')

const CONTACT_ROLES = ['organizer', 'supplier', 'other']
const CONTACT_STATUSES = ['new', 'in_review', 'resolved', 'archived']

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    role: {
      type: String,
      enum: CONTACT_ROLES,
      default: 'other',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: CONTACT_STATUSES,
      default: 'new',
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v
        delete ret.ipAddress
        delete ret.userAgent
        return ret
      },
    },
  },
)

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema)

module.exports = { CONTACT_ROLES, CONTACT_STATUSES, ContactMessage }
