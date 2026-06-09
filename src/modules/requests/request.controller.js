const { User } = require('../auth/user.model')
const { Trip } = require('../trips/trip.model')
const { Offer } = require('../offers/offer.model')
const { recordAudit, listAuditForRequest } = require('../../services/audit')
const { notifyUser } = require('../../services/notifications')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { paginateQuery, parsePagination } = require('../../utils/pagination')
const {
  attachOfferCounts,
  enrichRequestWithDisplayStatus,
} = require('../../utils/requestDisplayStatus')
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
    .populate('provider', 'name email role providerType avatar companyName')
    .populate('acceptedOffer')
    .populate('messages.author', 'name email role avatar')
}

async function enrichRequestsList(requests) {
  const offerCountsMap = await attachOfferCounts(requests, Offer)
  return requests.map((request) => enrichRequestWithDisplayStatus(request, offerCountsMap))
}

async function resolveProviderId(providerId) {
  if (!providerId) return undefined

  const provider = await User.findById(providerId)
  if (!provider || provider.role !== 'provider' || provider.status !== 'active') {
    throw new HttpError('Provider not found', 404)
  }
  return provider._id
}

function getNotificationRecipientsForRequest(request, actorId, extraProviderIds = []) {
  const recipients = new Set()
  const organizerId = String(request.organizer._id || request.organizer)
  const providerId = request.provider ? String(request.provider._id || request.provider) : null

  if (organizerId !== String(actorId)) recipients.add(organizerId)
  if (providerId && providerId !== String(actorId)) recipients.add(providerId)
  for (const id of extraProviderIds) {
    if (id && String(id) !== String(actorId)) recipients.add(String(id))
  }

  return [...recipients]
}

async function getActiveOfferProviderIds(requestId) {
  const offers = await Offer.find({
    request: requestId,
    status: { $in: ['submitted', 'accepted'] },
  }).select('provider')
  return offers.map((offer) => offer.provider)
}

async function providerCanMessageOnRequest(user, request) {
  if (user.role !== 'provider') return false
  if (!['pending', 'accepted', 'completed'].includes(request.status)) return false

  if (request.provider && String(request.provider._id || request.provider) === String(user._id)) {
    return true
  }

  const offer = await Offer.findOne({
    request: request._id,
    provider: user._id,
    status: { $in: ['submitted', 'accepted'] },
  }).select('_id')

  return Boolean(offer)
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
      requests: await enrichRequestsList(items),
    })
  }

  const requests = await populateRequest(ServiceRequest.find(query)).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: requests.length,
    requests: await enrichRequestsList(requests),
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

  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'created',
    summary: `${req.body.needType} request created`,
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: trip._id,
  })

  const populatedRequest = await populateRequest(ServiceRequest.findById(request._id))
  const enriched = enrichRequestWithDisplayStatus(
    populatedRequest,
    { [String(request._id)]: { total: 0, submitted: 0 } },
  )

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
    request: enriched,
  })
})

const getRequest = asyncHandler(async (req, res) => {
  const request = await populateRequest(ServiceRequest.findById(req.params.id))
  if (!request) throw new HttpError('Request not found', 404)

  assertOrganizerOwnsRequest(req.user, request)
  if (!providerCanAccessRequest(req.user, request)) throw new HttpError('Request not found', 404)

  const offerCountsMap = await attachOfferCounts([request], Offer)

  res.json({
    success: true,
    request: enrichRequestWithDisplayStatus(request, offerCountsMap),
  })
})

const updateRequest = asyncHandler(async (req, res) => {
  const request = await populateRequest(ServiceRequest.findById(req.params.id))
  if (!request) throw new HttpError('Request not found', 404)

  const isAdmin = req.user.role === 'admin'
  if (!isAdmin) assertOrganizerOwnsRequest(req.user, request)

  if (!isAdmin && !['pending', 'accepted'].includes(request.status)) {
    throw new HttpError('This request can no longer be edited', 400)
  }

  const changes = {}
  if (req.body.message !== undefined) {
    changes.message = { from: request.message, to: req.body.message.trim() }
    request.message = req.body.message.trim()
  }
  if (req.body.needType !== undefined && isAdmin) {
    changes.needType = { from: request.needType, to: req.body.needType }
    request.needType = req.body.needType
  }
  if (req.body.provider !== undefined && isAdmin) {
    const provider = await resolveProviderId(req.body.provider)
    changes.provider = {
      from: request.provider?._id || request.provider || null,
      to: provider || null,
    }
    request.provider = provider
  }

  if (Object.keys(changes).length === 0) {
    throw new HttpError('No valid fields to update', 400)
  }

  await request.save()

  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'updated',
    summary: isAdmin ? 'Request updated by administrator' : 'Request updated by organizer',
    changes,
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: request.trip._id || request.trip,
  })

  const recipients = getNotificationRecipientsForRequest(request, req.user._id)
  for (const recipientId of recipients) {
    await notifyUser(recipientId, {
      type: 'request_modified',
      title: 'Request updated',
      body: `The ${request.needType} request was modified`,
      trip: request.trip._id || request.trip,
      request: request._id,
    })
  }

  const offerCountsMap = await attachOfferCounts([request], Offer)

  res.json({
    success: true,
    request: enrichRequestWithDisplayStatus(request, offerCountsMap),
  })
})

const addRequestMessage = asyncHandler(async (req, res) => {
  const request = await populateRequest(ServiceRequest.findById(req.params.id))
  if (!request) throw new HttpError('Request not found', 404)

  const isAdmin = req.user.role === 'admin'
  const isOrganizer =
    req.user.role === 'organizer' &&
    String(request.organizer._id || request.organizer) === String(req.user._id)
  const isProvider = await providerCanMessageOnRequest(req.user, request)

  if (!isAdmin && !isOrganizer && !isProvider) {
    throw new HttpError('You cannot add messages to this request', 403)
  }

  request.messages.push({
    author: req.user._id,
    body: req.body.body.trim(),
  })
  await request.save()
  await request.populate('messages.author', 'name email role avatar')

  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'message_added',
    summary: 'New message posted',
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: request.trip._id || request.trip,
  })

  const offerProviderIds = await getActiveOfferProviderIds(request._id)
  const recipients = getNotificationRecipientsForRequest(request, req.user._id, offerProviderIds)
  if (recipients.length === 0) {
    console.warn('[notifications] message posted with no email recipients', String(request._id))
  }
  for (const recipientId of recipients) {
    await notifyUser(recipientId, {
      type: 'request_message',
      title: 'New message on request',
      body: `${req.user.name}: ${req.body.body.trim().slice(0, 180)}`,
      trip: request.trip._id || request.trip,
      request: request._id,
    })
  }

  const offerCountsMap = await attachOfferCounts([request], Offer)

  res.status(201).json({
    success: true,
    request: enrichRequestWithDisplayStatus(request, offerCountsMap),
  })
})

const getRequestHistory = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
  if (!request) throw new HttpError('Request not found', 404)

  assertOrganizerOwnsRequest(req.user, request)
  if (!providerCanAccessRequest(req.user, request) && req.user.role !== 'admin') {
    throw new HttpError('Request not found', 404)
  }

  const history = await listAuditForRequest(request._id)

  res.json({
    success: true,
    count: history.length,
    history,
  })
})

const deleteRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
  if (!request) throw new HttpError('Request not found', 404)

  if (req.user.role !== 'admin') {
    assertOrganizerOwnsRequest(req.user, request)
    if (!['pending', 'cancelled', 'rejected'].includes(request.status)) {
      throw new HttpError('Only pending or cancelled requests can be deleted', 400)
    }
  }

  await Offer.deleteMany({ request: request._id })
  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'deleted',
    summary: 'Request deleted',
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: request.trip,
  })
  await request.deleteOne()

  res.json({
    success: true,
    message: 'Request deleted',
  })
})

const updateRequestStatus = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate('organizer', 'name email')
    .populate('provider', 'name email')
  if (!request) throw new HttpError('Request not found', 404)

  if (req.user.role !== 'admin') {
    assertOrganizerOwnsRequest(req.user, request)
  }

  if (req.user.role === 'provider') {
    if (!request.provider || String(request.provider._id || request.provider) !== String(req.user._id)) {
      throw new HttpError('You can only update requests assigned to you', 403)
    }
    if (!['completed', 'cancelled'].includes(req.body.status)) {
      throw new HttpError('Providers can only mark assigned requests completed or cancelled', 403)
    }
  }

  const previousStatus = request.status
  request.status = req.body.status
  await request.save()

  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'status_changed',
    summary: `Status changed from ${previousStatus} to ${req.body.status}`,
    changes: { status: { from: previousStatus, to: req.body.status } },
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: request.trip,
  })

  const populatedRequest = await populateRequest(ServiceRequest.findById(request._id))
  const offerCountsMap = await attachOfferCounts([populatedRequest], Offer)

  if (previousStatus !== req.body.status) {
    const statusLabels = {
      completed: 'Request completed',
      cancelled: 'Request canceled',
      rejected: 'Request rejected',
      accepted: 'Request confirmed',
      pending: 'Request reopened',
    }
    const title = statusLabels[req.body.status] || 'Request status updated'
    const body = `${request.needType} request is now ${req.body.status.replace('_', ' ')}`

    const recipients = getNotificationRecipientsForRequest(request, req.user._id)
    for (const recipientId of recipients) {
      await notifyUser(recipientId, {
        type: 'request_status',
        title,
        body,
        trip: request.trip,
        request: request._id,
      })
    }
  }

  res.json({
    success: true,
    request: enrichRequestWithDisplayStatus(populatedRequest, offerCountsMap),
  })
})

module.exports = {
  REQUEST_STATUSES,
  addRequestMessage,
  createRequest,
  deleteRequest,
  getRequest,
  getRequestHistory,
  listRequests,
  updateRequest,
  updateRequestStatus,
}
