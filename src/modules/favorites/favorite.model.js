const mongoose = require('mongoose')

const favoriteSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

favoriteSchema.index({ organizer: 1, provider: 1 }, { unique: true })

const Favorite = mongoose.model('Favorite', favoriteSchema)

module.exports = { Favorite }
