const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { NEED_TYPES, TRIP_STATUSES, Trip } = require('./trip.model')
const cloudinary = require('../../services/cloudinary')

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'description',
  'location',
  'startDate',
  'endDate',
  'participants',
  'needTypes',
  'status',
  'image',
  'accessibility',
  'itinerary',
]

function assertOrganizerOwnsTrip(user, trip) {
  if (user.role !== 'organizer') return
  if (String(trip.organizer._id || trip.organizer) !== String(user._id)) {
    throw new HttpError('You can only manage your own trips', 403)
  }
}

function getTripQueryForUser(user) {
  if (user.role === 'admin') return {}
  if (user.role === 'organizer') return { organizer: user._id }
  return { status: { $in: ['published', 'scheduled', 'in_progress'] } }
}

function pickAllowedUpdates(body) {
  return ALLOWED_UPDATE_FIELDS.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      acc[field] = body[field]
    }
    return acc
  }, {})
}

function buildTripFilters({ status, needType, q }, baseQuery) {
  const query = { ...baseQuery }
  if (status) query.status = status
  if (needType) query.needTypes = needType
  if (q) query.$text = { $search: q }
  return query
}

function trimStringFields(payload) {
  if (typeof payload.title === 'string') payload.title = payload.title.trim()
  if (typeof payload.description === 'string') payload.description = payload.description.trim()
  if (typeof payload.location === 'string') payload.location = payload.location.trim()
  if (typeof payload.image === 'string') payload.image = payload.image.trim()
  if (typeof payload.accessibility === 'string') payload.accessibility = payload.accessibility.trim()
  return payload
}

const listTrips = asyncHandler(async (req, res) => {
  const baseQuery = getTripQueryForUser(req.user)
  const query = buildTripFilters(req.query, baseQuery)

  const trips = await Trip.find(query)
    .populate('organizer', 'name email role organizationType')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    count: trips.length,
    trips,
  })
})

const createTrip = asyncHandler(async (req, res) => {
  const payload = trimStringFields({ ...req.body })

  const trip = await Trip.create({
    ...payload,
    organizer: req.user._id,
  })

  const populatedTrip = await trip.populate('organizer', 'name email role organizationType')

  res.status(201).json({
    success: true,
    trip: populatedTrip,
  })
})

const getTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate('organizer', 'name email role organizationType')
  if (!trip) throw new HttpError('Trip not found', 404)

  if (req.user.role === 'provider' && !['published', 'scheduled', 'in_progress'].includes(trip.status)) {
    throw new HttpError('Trip not found', 404)
  }

  assertOrganizerOwnsTrip(req.user, trip)

  res.json({
    success: true,
    trip,
  })
})

const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) throw new HttpError('Trip not found', 404)

  assertOrganizerOwnsTrip(req.user, trip)

  const updates = trimStringFields(pickAllowedUpdates(req.body))

  if (Object.prototype.hasOwnProperty.call(updates, 'status') && !TRIP_STATUSES.includes(updates.status)) {
    throw new HttpError('Invalid trip status', 400)
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'needTypes')) {
    const invalid = updates.needTypes.find((value) => !NEED_TYPES.includes(value))
    if (invalid) throw new HttpError(`Invalid need type: ${invalid}`, 400)
  }

  const effectiveStart = updates.startDate ?? trip.startDate
  if (updates.endDate && effectiveStart && new Date(updates.endDate) < new Date(effectiveStart)) {
    throw new HttpError('endDate cannot be before startDate', 400)
  }

  Object.assign(trip, updates)
  await trip.save()
  await trip.populate('organizer', 'name email role organizationType')

  res.json({
    success: true,
    trip,
  })
})

const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  if (!trip) throw new HttpError('Trip not found', 404)

  assertOrganizerOwnsTrip(req.user, trip)

  const previousPublicId = trip.imagePublicId
  await trip.deleteOne()
  if (previousPublicId) {
    cloudinary.destroy(previousPublicId).catch(() => {})
  }

  res.json({
    success: true,
    message: 'Trip deleted',
  })
})

const uploadTripImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError('Image file is required (multipart field "image")', 400)
  }

  if (!cloudinary.isConfigured()) {
    throw new HttpError(
      'Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      503,
    )
  }

  const trip = await Trip.findById(req.params.id)
  if (!trip) throw new HttpError('Trip not found', 404)

  assertOrganizerOwnsTrip(req.user, trip)

  const previousPublicId = trip.imagePublicId

  const result = await cloudinary.uploadBuffer(req.file.buffer, {
    folder: 'flunexia/trips',
    publicId: `trip-${trip._id}`,
  })

  trip.image = result.secure_url
  trip.imagePublicId = result.public_id
  await trip.save()
  await trip.populate('organizer', 'name email role organizationType')

  // Best-effort: clean up any previous Cloudinary asset that lived under a
  // different public_id (e.g. legacy /uploads/* paths have no publicId set).
  if (previousPublicId && previousPublicId !== result.public_id) {
    cloudinary.destroy(previousPublicId).catch(() => {})
  }

  res.json({
    success: true,
    trip,
  })
})

module.exports = { createTrip, deleteTrip, getTrip, listTrips, updateTrip, uploadTripImage }
