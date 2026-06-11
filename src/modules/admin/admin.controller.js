const { User, USER_ROLES, USER_STATUSES } = require('../auth/user.model')
const { Offer } = require('../offers/offer.model')
const { ServiceRequest } = require('../requests/serviceRequest.model')
const { TRIP_STATUSES, Trip } = require('../trips/trip.model')
const {
  applyProviderServiceSelection,
  normalizeProviderTypes,
} = require('../../constants/providerTypes')
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

function pickAdminUserUpdates(body) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    updates.name = body.name.trim()
  }
  if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
    updates.rating = body.rating
  }
  if (Object.prototype.hasOwnProperty.call(body, 'reviewCount')) {
    updates.reviewCount = body.reviewCount
  }
  if (Object.prototype.hasOwnProperty.call(body, 'organizationType')) {
    updates.organizationType = body.organizationType ? String(body.organizationType).trim() : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'providerType')) {
    updates.providerType = body.providerType ? String(body.providerType).trim() : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'providerTypes')) {
    updates.providerTypes = normalizeProviderTypes(body.providerTypes)
  }
  if (Object.prototype.hasOwnProperty.call(body, 'contactPerson')) {
    updates.contactPerson = body.contactPerson ? String(body.contactPerson).trim() : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'companyDescription')) {
    updates.companyDescription = body.companyDescription
      ? String(body.companyDescription).trim()
      : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'companyName')) {
    updates.companyName = body.companyName ? String(body.companyName).trim() : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'siret')) {
    updates.siret = body.siret ? String(body.siret).trim() : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'iban')) {
    updates.iban = body.iban ? String(body.iban).trim().replace(/\s+/g, '') : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'bic')) {
    updates.bic = body.bic ? String(body.bic).trim().replace(/\s+/g, '') : undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'billingAddress')) {
    updates.billingAddress = body.billingAddress || undefined
  }
  if (Object.prototype.hasOwnProperty.call(body, 'billing')) {
    updates.billing = body.billing || undefined
  }

  return updates
}

const updateUser = asyncHandler(async (req, res) => {
  const updates = pickAdminUserUpdates(req.body)
  if (Object.keys(updates).length === 0) {
    throw new HttpError('No applicable fields to update', 400)
  }

  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError('User not found', 404)

  if (user.role === 'provider' && updates.providerTypes) {
    applyProviderServiceSelection(user, updates.providerTypes)
    delete updates.providerTypes
  }

  Object.assign(user, updates)
  await user.save()

  res.json({
    success: true,
    user,
  })
})

const updateUserDocumentStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user || user.role !== 'provider') {
    throw new HttpError('Supplier not found', 404)
  }

  const doc = user.documents.id(req.params.documentId)
  if (!doc) {
    throw new HttpError('Document not found', 404)
  }

  doc.status = req.body.status
  await user.save()

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
  updateUserDocumentStatus,
  updateUserStatus,
}
