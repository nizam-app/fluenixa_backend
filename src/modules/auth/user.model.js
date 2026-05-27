const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const USER_ROLES = ['admin', 'organizer', 'provider']
const USER_STATUSES = ['active', 'pending', 'suspended']

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
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
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
