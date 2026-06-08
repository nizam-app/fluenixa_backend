const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { paginateQuery, parsePagination } = require('../../utils/pagination')
const { NEED_TYPES, TRIP_STATUSES, Trip } = require('./trip.model')
const { findRecommendedProvidersForTrip } = require('./tripRecommendations')
const { assertCanViewTrip, assertOrganizerOwnsTrip } = require('./tripVisibility')
const cloudinary = require('../../services/cloudinary')
const { applyDestinationCoverToTrip } = require('../../services/tripDestinationCover')
const { enrichTrip, enrichTrips } = require('../../utils/tripSerialization')

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
  'budgetEstimate',
  'budgetCurrency',
  'bookingMode',
  'category',
  'joinedCount',
  'entryFee',
  'entryFeeCurrency',
  'tripNote',
  'itinerary',
]

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
  if (typeof payload.category === 'string') payload.category = payload.category.trim()
  if (typeof payload.tripNote === 'string') payload.tripNote = payload.tripNote.trim()
  return payload
}

async function applyTripCoverImage(trip, buffer) {
  if (!cloudinary.isConfigured()) {
    throw new HttpError(
      'Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      503,
    )
  }

  const previousPublicId = trip.imagePublicId
  const result = await cloudinary.uploadBuffer(buffer, {
    folder: 'flunexia/trips',
    publicId: `trip-${trip._id}`,
  })

  trip.image = result.secure_url
  trip.imagePublicId = result.public_id

  if (previousPublicId && previousPublicId !== result.public_id) {
    cloudinary.destroy(previousPublicId).catch(() => {})
  }
}

const listTrips = asyncHandler(async (req, res) => {
  const baseQuery = getTripQueryForUser(req.user)
  const query = buildTripFilters(req.query, baseQuery)
  const pagination = parsePagination(req.query)

  if (pagination.enabled) {
    const { items, meta } = await paginateQuery(Trip, query, {
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      sort: { createdAt: -1 },
      populate: (q) => q.populate('organizer', 'name email role organizationType avatar'),
    })

    return res.json({
      success: true,
      count: items.length,
      pagination: meta,
      trips: enrichTrips(items),
    })
  }

  const trips = await Trip.find(query)
    .populate('organizer', 'name email role organizationType avatar')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    count: trips.length,
    trips: enrichTrips(trips),
  })
})

const createTrip = asyncHandler(async (req, res) => {
  const payload = trimStringFields({ ...req.body })

  if (!req.file && payload.image) {
    delete payload.image
  }

  const trip = await Trip.create({
    ...payload,
    organizer: req.user._id,
  })

  if (req.file) {
    try {
      await applyTripCoverImage(trip, req.file.buffer)
      await trip.save()
    } catch (err) {
      await trip.deleteOne()
      throw err
    }
  } else if (trip.location?.trim()) {
    try {
      await applyDestinationCoverToTrip(trip)
    } catch (err) {
      console.warn('[trips] destination cover on create failed:', err?.message || err)
    }
  }

  const populatedTrip = await trip.populate('organizer', 'name email role organizationType avatar')

  res.status(201).json({
    success: true,
    trip: enrichTrip(populatedTrip),
  })
})

const getTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate(
    'organizer',
    'name email role organizationType avatar',
  )
  assertCanViewTrip(req.user, trip)

  if (!trip.image && trip.location?.trim()) {
    try {
      await applyDestinationCoverToTrip(trip)
    } catch (err) {
      console.warn('[trips] destination cover on get failed:', err?.message || err)
    }
  }

  res.json({
    success: true,
    trip: enrichTrip(trip),
  })
})

const getRecommendedProviders = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
  assertCanViewTrip(req.user, trip)

  const providers = await findRecommendedProvidersForTrip(trip)

  res.json({
    success: true,
    count: providers.length,
    providers,
  })
})

const duplicateTrip = asyncHandler(async (req, res) => {
  const source = await Trip.findById(req.params.id)
  if (!source) throw new HttpError('Trip not found', 404)

  assertOrganizerOwnsTrip(req.user, source)

  const copy = await Trip.create({
    title: `${source.title} (copy)`.slice(0, 160),
    description: source.description,
    location: source.location,
    startDate: source.startDate,
    endDate: source.endDate,
    participants: source.participants,
    needTypes: source.needTypes,
    status: 'draft',
    organizer: req.user._id,
    image: source.image,
    accessibility: source.accessibility,
    budgetEstimate: source.budgetEstimate,
    budgetCurrency: source.budgetCurrency,
    bookingMode: source.bookingMode,
    category: source.category,
    joinedCount: 0,
    entryFee: source.entryFee,
    entryFeeCurrency: source.entryFeeCurrency,
    tripNote: source.tripNote,
    itinerary: source.itinerary,
  })

  const populatedTrip = await copy.populate('organizer', 'name email role organizationType avatar')

  res.status(201).json({
    success: true,
    trip: enrichTrip(populatedTrip),
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

  const effectiveParticipants = updates.participants ?? trip.participants
  const effectiveJoined = updates.joinedCount ?? trip.joinedCount
  if (effectiveJoined > effectiveParticipants) {
    throw new HttpError('joinedCount cannot exceed participants', 400)
  }

  Object.assign(trip, updates)
  await trip.save()
  await trip.populate('organizer', 'name email role organizationType avatar')

  res.json({
    success: true,
    trip: enrichTrip(trip),
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

  const trip = await Trip.findById(req.params.id)
  if (!trip) throw new HttpError('Trip not found', 404)

  assertOrganizerOwnsTrip(req.user, trip)

  await applyTripCoverImage(trip, req.file.buffer)
  await trip.save()
  await trip.populate('organizer', 'name email role organizationType avatar')

  res.json({
    success: true,
    trip: enrichTrip(trip),
  })
})

module.exports = {
  createTrip,
  deleteTrip,
  duplicateTrip,
  getRecommendedProviders,
  getTrip,
  listTrips,
  updateTrip,
  uploadTripImage,
}
