const mongoose = require('mongoose')

const passwordResetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema)

module.exports = { PasswordReset }
