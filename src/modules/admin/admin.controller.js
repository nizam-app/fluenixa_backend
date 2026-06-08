const { User, USER_ROLES, USER_STATUSES } = require('../auth/user.model')
const { Offer } = require('../offers/offer.model')
const { ServiceRequest } = require('../requests/serviceRequest.model')
const { TRIP_STATUSES, Trip } = require('../trips/trip.model')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const {
  attachOfferCounts,
  enrichRequestWithDisplayStatus,
} = require('../../utils/requestDisplayStatus')

function buildTextFilter(q, fields) {
  if (!q) return {}
  const regex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return { $or: fields.map((field) => ({ [field]: regex })) }
}

function populateTrip(query) {
  return query.populate('organizer', 'name email role organizationType status')
}

function populateRequest(query) {
  return query
    .populate('trip', 'title location startDate participants status needTypes')
    .populate('organizer', 'name email role organizationType status')
    .populate('provider', 'name email role providerType status')
    .populate('acceptedOffer')
}

function populateOffer(query) {
  return query
    .populate('provider', 'name email role providerType status')
    .populate({
      path: 'request',
      populate: [
        { path: 'trip', select: 'title location startDate participants status needTypes' },
        { path: 'organizer', select: 'name email role organizationType status' },
        { path: 'provider', select: 'name email role providerType status' },
      ],
    })
}

async function countByModelField(Model, field, values) {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }])
  const counts = Object.fromEntries(values.map((value) => [value, 0]))
  for (const row of rows) {
    if (row._id) counts[row._id] = row.count
  }
  return counts
}

const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalTrips,
    totalRequests,
    totalOffers,
    usersByRole,
    usersByStatus,
    tripsByStatus,
    requestsByStatus,
    offersByStatus,
  ] = await Promise.all([
    User.countDocuments(),
    Trip.countDocuments(),
    ServiceRequest.countDocuments(),
    Offer.countDocuments(),
    countByModelField(User, 'role', USER_ROLES),
    countByModelField(User, 'status', USER_STATUSES),
    countByModelField(Trip, 'status', TRIP_STATUSES),
    countByModelField(ServiceRequest, 'status', ['pending', 'accepted', 'rejected', 'completed', 'cancelled']),
    countByModelField(Offer, 'status', ['submitted', 'accepted', 'rejected', 'withdrawn']),
  ])

  res.json({
    success: true,
    stats: {
      users: totalUsers,
      organizers: usersByRole.organizer,
      providers: usersByRole.provider,
      admins: usersByRole.admin,
      trips: totalTrips,
      requests: totalRequests,
      offers: totalOffers,
      pendingRequests: requestsByStatus.pending,
      submittedOffers: offersByStatus.submitted,
      usersByRole,
      usersByStatus,
      tripsByStatus,
      requestsByStatus,
      offersByStatus,
    },
  })
})

const listUsers = asyncHandler(async (req, res) => {
  const { role, status, q } = req.query
  const query = buildTextFilter(q, ['name', 'email'])

  if (role) query.role = role
  if (status) query.status = status

  const users = await User.find(query).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: users.length,
    users,
  })
})

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, organizationType, providerType, status } = req.body

  const existingUser = await User.findOne({ email })
  if (existingUser) throw new HttpError('An account with this email already exists', 409)

  const user = await User.create({
    name: name.trim(),
    email,
    passwordHash: password,
    role,
    organizationType: role === 'organizer' ? organizationType : undefined,
    providerType: role === 'provider' ? providerType : undefined,
    status: status || 'active',
  })

  res.status(201).json({
    success: true,
    user,
  })
})

const updateUser = asyncHandler(async (req, res) => {
  const updates = { ...req.body }
  if (updates.name) updates.name = updates.name.trim()

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })

  if (!user) throw new HttpError('User not found', 404)

  res.json({
    success: true,
    user,
  })
})

const updateUserStatus = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id) && req.body.status !== 'active') {
    throw new HttpError('You cannot suspend your own admin account', 400)
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true },
  )

  if (!user) throw new HttpError('User not found', 404)

  res.json({
    success: true,
    user,
  })
})

const listTrips = asyncHandler(async (req, res) => {
  const { status, q } = req.query
  const query = buildTextFilter(q, ['title', 'description', 'location'])

  if (status) {
    if (!TRIP_STATUSES.includes(status)) throw new HttpError('Invalid trip status', 400)
    query.status = status
  }

  const trips = await populateTrip(Trip.find(query)).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: trips.length,
    trips,
  })
})

const listRequests = asyncHandler(async (req, res) => {
  const { status, needType, trip } = req.query
  const query = {}

  if (status) query.status = status
  if (needType) query.needType = needType
  if (trip) query.trip = trip

  const requests = await populateRequest(ServiceRequest.find(query)).sort({ createdAt: -1 })
  const offerCountsMap = await attachOfferCounts(requests, Offer)

  res.json({
    success: true,
    count: requests.length,
    requests: requests.map((request) => enrichRequestWithDisplayStatus(request, offerCountsMap)),
  })
})

const listOffers = asyncHandler(async (req, res) => {
  const { status, request, provider } = req.query
  const query = {}

  if (status) query.status = status
  if (request) query.request = request
  if (provider) query.provider = provider

  const offers = await populateOffer(Offer.find(query)).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: offers.length,
    offers,
  })
})

module.exports = {
  createUser,
  getStats,
  listOffers,
  listRequests,
  listTrips,
  listUsers,
  updateUser,
  updateUserStatus,
}
