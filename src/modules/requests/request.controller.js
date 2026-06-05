const { User } = require('../auth/user.model')
const { Trip } = require('../trips/trip.model')
const { notifyUser } = require('../../services/notifications')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { paginateQuery, parsePagination } = require('../../utils/pagination')
const { REQUEST_STATUSES, ServiceRequest } = require('./serviceRequest.model')

function assertOrganizerOwnsRequest(user, request) {
  if (user.role !== 'organizer') return
  if (String(request.organizer._id || request.organizer) !== String(user._id)) {
    throw new HttpError('You can only manage requests for your own trips', 403)
  }
}

function providerCanAccessRequest(user, request) {
  if (user.role !== 'provider') return true
  if (request.provider && String(request.provider._id || request.provider) !== String(user._id)) {
    return false
  }
  return ['pending', 'accepted', 'completed'].includes(request.status)
}

function getRequestQueryForUser(user) {
  if (user.role === 'admin') return {}
  if (user.role === 'organizer') return { organizer: user._id }
  return {
    status: { $in: ['pending', 'accepted', 'completed'] },
    $or: [{ provider: user._id }, { provider: { $exists: false } }, { provider: null }],
  }
}

function populateRequest(query) {
  return query
    .populate(
      'trip',
      'title location startDate endDate participants status needTypes description image accessibility budgetEstimate budgetCurrency',
    )
    .populate('organizer', 'name email role organizationType avatar')
    .populate('provider', 'name email role providerType avatar')
    .populate('acceptedOffer')
}

async function resolveProviderId(providerId) {
  if (!providerId) return undefined

  const provider = await User.findById(providerId)
  if (!provider || provider.role !== 'provider' || provider.status !== 'active') {
    throw new HttpError('Provider not found', 404)
  }
  return provider._id
}

const listRequests = asyncHandler(async (req, res) => {
  const query = getRequestQueryForUser(req.user)
  const { status, needType, trip } = req.query

  if (status) query.status = status
  if (needType) query.needType = needType
  if (trip) query.trip = trip

  const pagination = parsePagination(req.query)

  if (pagination.enabled) {
    const { items, meta } = await paginateQuery(ServiceRequest, query, {
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      sort: { createdAt: -1 },
      populate: (q) => populateRequest(q),
    })

    return res.json({
      success: true,
      count: items.length,
      pagination: meta,
      requests: items,
    })
  }

  const requests = await populateRequest(ServiceRequest.find(query)).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: requests.length,
    requests,
  })
})

const createRequest = asyncHandler(async (req, res) => {
  const tripId = req.body.trip || req.body.tripId
  const providerInput = req.body.provider || req.body.providerId

  const trip = await Trip.findById(tripId)
  if (!trip) throw new HttpError('Trip not found', 404)

  if (String(trip.organizer) !== String(req.user._id)) {
    throw new HttpError('You can only create requests for your own trips', 403)
  }

  if (!trip.needTypes.includes(req.body.needType)) {
    throw new HttpError('Request need type must be included in the trip needTypes', 400)
  }

  const provider = await resolveProviderId(providerInput)

  const request = await ServiceRequest.create({
    trip: trip._id,
    organizer: req.user._id,
    provider,
    needType: req.body.needType,
    message: req.body.message ? req.body.message.trim() : undefined,
  })

  const populatedRequest = await populateRequest(ServiceRequest.findById(request._id))

  if (provider) {
    await notifyUser(provider, {
      type: 'request_created',
      title: 'New service request',
      body: `${req.body.needType} request on ${trip.title}`,
      trip: trip._id,
      request: request._id,
    })
  }

  res.status(201).json({
    success: true,
    request: populatedRequest,
  })
})

const getRequest = asyncHandler(async (req, res) => {
  const request = await populateRequest(ServiceRequest.findById(req.params.id))
  if (!request) throw new HttpError('Request not found', 404)

  assertOrganizerOwnsRequest(req.user, request)
  if (!providerCanAccessRequest(req.user, request)) throw new HttpError('Request not found', 404)

  res.json({
    success: true,
    request,
  })
})

const updateRequestStatus = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
  if (!request) throw new HttpError('Request not found', 404)

  assertOrganizerOwnsRequest(req.user, request)

  if (req.user.role === 'provider') {
    if (!request.provider || String(request.provider) !== String(req.user._id)) {
      throw new HttpError('You can only update requests assigned to you', 403)
    }
    if (!['completed', 'cancelled'].includes(req.body.status)) {
      throw new HttpError('Providers can only mark assigned requests completed or cancelled', 403)
    }
  }

  const previousStatus = request.status
  request.status = req.body.status
  await request.save()

  const populatedRequest = await populateRequest(ServiceRequest.findById(request._id))

  if (req.body.status === 'completed' && previousStatus !== 'completed') {
    await notifyUser(request.organizer, {
      type: 'request_status',
      title: 'Request completed',
      body: `${request.needType} request marked completed`,
      trip: request.trip,
      request: request._id,
    })
  }

  res.json({
    success: true,
    request: populatedRequest,
  })
})

module.exports = {
  REQUEST_STATUSES,
  createRequest,
  getRequest,
  listRequests,
  updateRequestStatus,
}
