const mongoose = require('mongoose')

const NEED_TYPES = ['Transport', 'Activity', 'Restaurant', 'Hotel', 'Other Service']
const TRIP_STATUSES = ['draft', 'published', 'scheduled', 'in_progress', 'completed', 'cancelled']

const itineraryStopSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    detail: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    type: {
      type: String,
      trim: true,
      maxlength: 80,
    },
  },
  { _id: false },
)

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    participants: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    needTypes: {
      type: [String],
      enum: NEED_TYPES,
      default: [],
    },
    status: {
      type: String,
      enum: TRIP_STATUSES,
      default: 'draft',
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    image: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    accessibility: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    itinerary: {
      type: [itineraryStopSchema],
      default: [],
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

tripSchema.index({ title: 'text', description: 'text', location: 'text' })

// Cascade delete: remove dependent ServiceRequests (and their Offers via hook).
async function cascadeDeleteRelations(tripId) {
  if (!tripId) return
  const { ServiceRequest } = require('../requests/serviceRequest.model')
  const { Offer } = require('../offers/offer.model')

  const requests = await ServiceRequest.find({ trip: tripId }).select('_id')
  const requestIds = requests.map((r) => r._id)

  if (requestIds.length > 0) {
    await Offer.deleteMany({ request: { $in: requestIds } })
    await ServiceRequest.deleteMany({ _id: { $in: requestIds } })
  }
}

tripSchema.post('deleteOne', { document: true, query: false }, async function cascadeOnDocDelete() {
  await cascadeDeleteRelations(this._id)
})

tripSchema.pre('deleteMany', async function cascadeOnDeleteMany(next) {
  try {
    const trips = await this.model.find(this.getFilter()).select('_id')
    this._tripIdsForCascade = trips.map((t) => t._id)
    next()
  } catch (error) {
    next(error)
  }
})

tripSchema.post('deleteMany', async function cascadeOnDeleteManyDone() {
  const ids = this._tripIdsForCascade || []
  for (const id of ids) {
    await cascadeDeleteRelations(id)
  }
})

const Trip = mongoose.model('Trip', tripSchema)

module.exports = { NEED_TYPES, TRIP_STATUSES, Trip }
