const mongoose = require('mongoose')
const { ServiceRequest } = require('../requests/serviceRequest.model')
const { Trip } = require('../trips/trip.model')
const { recordAudit } = require('../../services/audit')
const { notifyUser } = require('../../services/notifications')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { paginateQuery, parsePagination } = require('../../utils/pagination')
const { OFFER_STATUSES, Offer } = require('./offer.model')

const AUTO_REJECT_REASON = 'Another offer was selected for this request.'
const TRIP_SUMMARY_FIELDS =
  'title location startDate endDate participants status needTypes description image'

function populateOffer(query) {
  return query
    .populate('provider', 'name email role providerType avatar rating reviewCount')
    .populate({
      path: 'request',
      populate: [
        { path: 'trip', select: TRIP_SUMMARY_FIELDS },
        { path: 'organizer', select: 'name email role organizationType avatar' },
      ],
    })
}

function assertCanViewRequest(user, request) {
  if (user.role === 'admin') return
  if (user.role === 'organizer' && String(request.organizer) === String(user._id)) return
  if (user.role === 'provider') {
    if (request.provider && String(request.provider) !== String(user._id)) {
      throw new HttpError('Request not found', 404)
    }
    return
  }
  throw new HttpError('Request not found', 404)
}

function assertCanViewOffer(user, offer) {
  const request = offer.request
  if (user.role === 'admin') return
  if (user.role === 'provider' && String(offer.provider._id || offer.provider) === String(user._id)) return
  if (user.role === 'organizer' && String(request.organizer._id || request.organizer) === String(user._id)) return
  throw new HttpError('Offer not found', 404)
}

function getOfferQueryForUser(user) {
  if (user.role === 'admin') return {}
  if (user.role === 'provider') return { provider: user._id }
  return {}
}

const listOffers = asyncHandler(async (req, res) => {
  const { status, request, requestStatus } = req.query
  const query = getOfferQueryForUser(req.user)

  if (status) query.status = status

  if (requestStatus) {
    const requestIds = await ServiceRequest.find({ status: requestStatus }).distinct('_id')
    if (request) {
      query.request = requestIds.some((id) => String(id) === String(request)) ? request : { $in: [] }
    } else {
      query.request = { $in: requestIds }
    }
  } else if (request) {
    query.request = request
  }

  const pagination = parsePagination(req.query)

  if (pagination.enabled && req.user.role !== 'organizer') {
    const { items, meta } = await paginateQuery(Offer, query, {
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      sort: { createdAt: -1 },
      populate: (q) => populateOffer(q),
    })

    return res.json({
      success: true,
      count: items.length,
      pagination: meta,
      offers: items,
    })
  }

  const offers = await populateOffer(Offer.find(query)).sort({ createdAt: -1 })
  const visibleOffers =
    req.user.role === 'organizer'
      ? offers.filter(
          (offer) =>
            offer.request &&
            String(offer.request.organizer._id || offer.request.organizer) === String(req.user._id),
        )
      : offers

  const slice =
    pagination.enabled && req.user.role === 'organizer'
      ? visibleOffers.slice(pagination.skip, pagination.skip + pagination.limit)
      : visibleOffers

  res.json({
    success: true,
    count: slice.length,
    ...(pagination.enabled && {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: visibleOffers.length,
        totalPages: Math.ceil(visibleOffers.length / pagination.limit) || 0,
        hasMore: pagination.skip + slice.length < visibleOffers.length,
      },
    }),
    offers: slice,
  })
})

const getOffer = asyncHandler(async (req, res) => {
  const offer = await populateOffer(Offer.findById(req.params.id))
  if (!offer) throw new HttpError('Offer not found', 404)

  assertCanViewOffer(req.user, offer)

  res.json({
    success: true,
    offer,
  })
})

const listOffersForRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.requestId)
  if (!request) throw new HttpError('Request not found', 404)

  assertCanViewRequest(req.user, request)

  const query = { request: request._id }
  if (req.user.role === 'provider') query.provider = req.user._id

  const offers = await populateOffer(Offer.find(query)).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: offers.length,
    offers,
  })
})

const createOffer = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.requestId)
  if (!request) throw new HttpError('Request not found', 404)

  if (request.status !== 'pending') {
    throw new HttpError('Offers can only be submitted for pending requests', 400)
  }

  if (request.provider && String(request.provider) !== String(req.user._id)) {
    throw new HttpError('This request is assigned to another provider', 403)
  }

  try {
    const offer = await Offer.create({
      request: request._id,
      provider: req.user._id,
      description: req.body.description.trim(),
      price: req.body.price,
      currency: req.body.currency || 'EUR',
      tier: req.body.tier || 'standard',
    })

    const populatedOffer = await populateOffer(Offer.findById(offer._id))
    const trip = await Trip.findById(request.trip).select('title')

    await notifyUser(request.organizer, {
      type: 'offer_received',
      title: 'New offer received',
      body: `${req.user.name} submitted an offer${trip ? ` for ${trip.title}` : ''}`,
      trip: request.trip,
      request: request._id,
      offer: offer._id,
    })

    await recordAudit({
      entityType: 'offer',
      entityId: offer._id,
      action: 'created',
      summary: 'Offer submitted',
      actor: req.user._id,
      actorRole: req.user.role,
      request: request._id,
      trip: request.trip,
    })

    res.status(201).json({
      success: true,
      offer: populatedOffer,
    })
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError('You have already submitted an offer for this request', 409)
    }
    throw error
  }
})

async function applyAcceptedOffer(offer) {
  const requestId = offer.request._id || offer.request
  const session = await mongoose.startSession()
  let autoRejectedOffers = []

  try {
    await session.withTransaction(async () => {
      offer.status = 'accepted'
      await offer.save({ session })

      const rejectResult = await Offer.updateMany(
        { request: requestId, _id: { $ne: offer._id }, status: 'submitted' },
        { $set: { status: 'rejected', rejectionReason: AUTO_REJECT_REASON } },
        { session },
      )

      if (rejectResult.modifiedCount) {
        autoRejectedOffers = await Offer.find(
          { request: requestId, status: 'rejected', rejectionReason: AUTO_REJECT_REASON },
          null,
          { session },
        )
      }

      await ServiceRequest.findByIdAndUpdate(
        requestId,
        {
          status: 'accepted',
          provider: offer.provider,
          acceptedOffer: offer._id,
        },
        { session },
      )
    })
  } catch (error) {
    if (error?.codeName === 'IllegalOperation' || /Transaction/i.test(error?.message || '')) {
      offer.status = 'accepted'
      await offer.save()
      await Offer.updateMany(
        { request: requestId, _id: { $ne: offer._id }, status: 'submitted' },
        { $set: { status: 'rejected', rejectionReason: AUTO_REJECT_REASON } },
      )
      autoRejectedOffers = await Offer.find({
        request: requestId,
        status: 'rejected',
        rejectionReason: AUTO_REJECT_REASON,
        _id: { $ne: offer._id },
      })
      await ServiceRequest.findByIdAndUpdate(requestId, {
        status: 'accepted',
        provider: offer.provider,
        acceptedOffer: offer._id,
      })
    } else {
      throw error
    }
  } finally {
    session.endSession()
  }

  return autoRejectedOffers
}

const updateOfferStatus = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id).populate('request')
  if (!offer) throw new HttpError('Offer not found', 404)

  assertCanViewOffer(req.user, offer)

  if (req.user.role === 'provider') {
    if (String(offer.provider) !== String(req.user._id)) {
      throw new HttpError('Offer not found', 404)
    }
    if (req.body.status !== 'withdrawn') {
      throw new HttpError('Providers can only withdraw their own offers', 403)
    }
  }

  if (req.user.role === 'organizer') {
    if (String(offer.request.organizer) !== String(req.user._id)) {
      throw new HttpError('Offer not found', 404)
    }
    if (req.body.status && !['accepted', 'rejected'].includes(req.body.status)) {
      throw new HttpError('Organizers can only accept or reject offers', 403)
    }
  }

  const newStatus = req.body.status

  if (req.body.tier && req.user.role === 'organizer') {
    offer.tier = req.body.tier
  }

  let autoRejectedOffers = []

  if (newStatus === 'accepted') {
    autoRejectedOffers = await applyAcceptedOffer(offer)
  } else if (newStatus) {
    if (newStatus === 'rejected' && req.user.role === 'organizer' && req.body.rejectionReason) {
      offer.rejectionReason = req.body.rejectionReason.trim()
    }
    offer.status = newStatus
    await offer.save()
  } else if (req.body.tier) {
    await offer.save()
  }

  const populatedOffer = await populateOffer(Offer.findById(offer._id))

  if (newStatus === 'accepted') {
    await recordAudit({
      entityType: 'offer',
      entityId: offer._id,
      action: 'offer_accepted',
      summary: 'Offer accepted',
      actor: req.user._id,
      actorRole: req.user.role,
      request: offer.request._id,
      trip: offer.request.trip,
    })

    await notifyUser(offer.provider, {
      type: 'offer_accepted',
      title: 'Offer accepted',
      body: 'Your offer was accepted by the organizer',
      trip: offer.request.trip,
      request: offer.request._id,
      offer: offer._id,
    })

    for (const rejected of autoRejectedOffers) {
      await recordAudit({
        entityType: 'offer',
        entityId: rejected._id,
        action: 'offer_rejected',
        summary: AUTO_REJECT_REASON,
        actor: req.user._id,
        actorRole: req.user.role,
        request: offer.request._id,
        trip: offer.request.trip,
      })
      await notifyUser(rejected.provider, {
        type: 'offer_rejected',
        title: 'Offer declined',
        body: AUTO_REJECT_REASON,
        trip: offer.request.trip,
        request: offer.request._id,
        offer: rejected._id,
      })
    }
  } else if (newStatus === 'rejected') {
    await recordAudit({
      entityType: 'offer',
      entityId: offer._id,
      action: 'offer_rejected',
      summary: 'Offer rejected by organizer',
      actor: req.user._id,
      actorRole: req.user.role,
      request: offer.request._id,
      trip: offer.request.trip,
    })
    const populatedForNotify = populatedOffer || (await populateOffer(Offer.findById(offer._id)))
    const feedback =
      populatedForNotify?.rejectionReason ||
      'Your offer was not selected for this request'
    await notifyUser(offer.provider, {
      type: 'offer_rejected',
      title: 'Offer declined',
      body: feedback,
      trip: offer.request.trip,
      request: offer.request._id,
      offer: offer._id,
      metadata: populatedForNotify?.rejectionReason
        ? { rejectionReason: populatedForNotify.rejectionReason }
        : undefined,
    })
  } else if (newStatus === 'withdrawn') {
    await notifyUser(offer.request.organizer, {
      type: 'offer_withdrawn',
      title: 'Offer withdrawn',
      body: 'A provider withdrew their offer',
      trip: offer.request.trip,
      request: offer.request._id,
      offer: offer._id,
    })
  }

  res.json({
    success: true,
    offer: populatedOffer,
  })
})

const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id)
  if (!offer) throw new HttpError('Offer not found', 404)

  if (String(offer.provider) !== String(req.user._id)) {
    throw new HttpError('Offer not found', 404)
  }

  if (offer.status !== 'submitted') {
    throw new HttpError('Only pending (submitted) offers can be updated', 400)
  }

  const request = await ServiceRequest.findById(offer.request)
  if (!request || request.status !== 'pending') {
    throw new HttpError('This request is no longer open for proposals', 400)
  }

  if (req.body.description !== undefined) {
    offer.description = req.body.description.trim()
  }
  if (req.body.price !== undefined) {
    offer.price = req.body.price
  }
  if (req.body.currency !== undefined) {
    offer.currency = req.body.currency
  }

  await offer.save()

  const populatedOffer = await populateOffer(Offer.findById(offer._id))
  const trip = await Trip.findById(request.trip).select('title')

  await notifyUser(request.organizer, {
    type: 'offer_updated',
    title: 'Offer updated',
    body: `${req.user.name} updated their offer${trip ? ` for ${trip.title}` : ''}`,
    trip: request.trip,
    request: request._id,
    offer: offer._id,
  })

  await recordAudit({
    entityType: 'offer',
    entityId: offer._id,
    action: 'updated',
    summary: 'Offer updated by provider',
    actor: req.user._id,
    actorRole: req.user.role,
    request: request._id,
    trip: request.trip,
  })

  res.json({
    success: true,
    offer: populatedOffer,
  })
})

module.exports = {
  OFFER_STATUSES,
  createOffer,
  getOffer,
  listOffers,
  listOffersForRequest,
  updateOffer,
  updateOfferStatus,
}
