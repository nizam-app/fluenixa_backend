const mongoose = require('mongoose')

const DEVICE_PLATFORMS = ['ios', 'android', 'web']

const deviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    platform: {
      type: String,
      enum: DEVICE_PLATFORMS,
      required: true,
    },
    appVersion: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
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

deviceSchema.index({ user: 1, token: 1 }, { unique: true })

const Device = mongoose.model('Device', deviceSchema)

module.exports = { DEVICE_PLATFORMS, Device }
