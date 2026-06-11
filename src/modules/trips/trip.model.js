const mongoose = require('mongoose')

const NEED_TYPES = ['Transport', 'Activity', 'Restaurant', 'Hotel', 'Other Service']
const TRIP_STATUSES = ['draft', 'published', 'scheduled', 'in_progress', 'completed', 'cancelled']
const BOOKING_MODES = ['multi_provider', 'bundled']

const serviceNeedDetailSchema = new mongoose.Schema(
  {
    needType: { type: String, trim: true, maxlength: 80 },
    pickup: { type: String, trim: true, maxlength: 180 },
    destination: { type: String, trim: true, maxlength: 180 },
    venueName: { type: String, trim: true, maxlength: 200 },
    details: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
)

const servicePlanStepSchema = new mongoose.Schema(
  {
    serviceDate: { type: String, trim: true, maxlength: 32 },
    timeFrom: { type: String, trim: true, maxlength: 16 },
    timeTo: { type: String, trim: true, maxlength: 16 },
    needs: { type: [serviceNeedDetailSchema], default: [] },
  },
  { _id: false },
)

const servicePlanSchema = new mongoose.Schema(
  {
    serviceDate: { type: String, trim: true, maxlength: 32 },
    timeFrom: { type: String, trim: true, maxlength: 16 },
    timeTo: { type: String, trim: true, maxlength: 16 },
    needs: { type: [serviceNeedDetailSchema], default: [] },
    steps: { type: [servicePlanStepSchema], default: [] },
  },
  { _id: false },
)

const itineraryLegSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 120 },
    detail: { type: String, trim: true, maxlength: 240 },
    type: { type: String, trim: true, maxlength: 80 },
    date: { type: String, trim: true, maxlength: 32 },
    time: { type: String, trim: true, maxlength: 16 },
    pickup: { type: String, trim: true, maxlength: 180 },
    destination: { type: String, trim: true, maxlength: 180 },
    location: { type: String, trim: true, maxlength: 180 },
    durationDays: { type: Number, min: 0, max: 365 },
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
    budgetEstimate: {
      type: Number,
      min: 0,
    },
    budgetCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 3,
      default: 'EUR',
    },
    bookingMode: {
      type: String,
      enum: BOOKING_MODES,
      default: 'multi_provider',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    joinedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    entryFee: {
      type: Number,
      min: 0,
    },
    entryFeeCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 3,
      default: 'EUR',
    },
    tripNote: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    itinerary: {
      type: [itineraryLegSchema],
      default: [],
    },
    servicePlan: {
      type: servicePlanSchema,
      default: undefined,
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

module.exports = { BOOKING_MODES, NEED_TYPES, TRIP_STATUSES, Trip }
