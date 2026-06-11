const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } = require('../../constants/providerDocuments')

const USER_ROLES = ['admin', 'organizer', 'provider']
const USER_STATUSES = ['active', 'pending', 'suspended']

const providerDocumentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 200, required: true },
    category: { type: String, enum: DOCUMENT_CATEGORIES, default: 'other' },
    url: { type: String, trim: true, required: true },
    publicId: { type: String, trim: true },
    mimeType: { type: String, trim: true, maxlength: 120 },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const userSchema = new mongoose.Schema(
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
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    organizationType: {
      type: String,
      trim: true,
    },
    providerType: {
      type: String,
      trim: true,
    },
    providerTypes: {
      type: [String],
      default: [],
    },
    pendingProviderTypes: {
      type: [String],
      default: [],
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    companyDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    siret: {
      type: String,
      trim: true,
      maxlength: 14,
    },
    iban: {
      type: String,
      trim: true,
      maxlength: 34,
    },
    bic: {
      type: String,
      trim: true,
      maxlength: 11,
    },
    billingAddress: {
      line1: { type: String, trim: true, maxlength: 200 },
      line2: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 120 },
      postalCode: { type: String, trim: true, maxlength: 20 },
      country: { type: String, trim: true, maxlength: 80, default: 'France' },
    },
    billing: {
      chorusProReady: { type: Boolean, default: false },
      chorusServiceCode: { type: String, trim: true, maxlength: 100 },
      legalEntityId: { type: String, trim: true, maxlength: 100 },
      paymentTerms: { type: String, trim: true, maxlength: 200 },
      notes: { type: String, trim: true, maxlength: 1000 },
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
    },
    avatar: {
      type: String,
      trim: true,
    },
    avatarPublicId: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    documents: {
      type: [providerDocumentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash')) {
    return
  }

  this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
})

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}

const User = mongoose.model('User', userSchema)

module.exports = { User, USER_ROLES, USER_STATUSES }
