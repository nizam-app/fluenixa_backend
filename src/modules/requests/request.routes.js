const express = require('express')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  createOffer,
  listOffersForRequest,
} = require('../offers/offer.controller')
const { createOfferSchema } = require('../offers/offer.schemas')
const {
  createRequest,
  getRequest,
  listRequests,
  updateRequestStatus,
} = require('./request.controller')
const {
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamsSchema,
  requestNestedParamsSchema,
  updateRequestStatusSchema,
} = require('./request.schemas')

const router = express.Router()

router.use(requireAuth)

router
  .route('/')
  .get(validate({ query: listRequestsQuerySchema }), listRequests)
  .post(
    requireRoles('organizer'),
    writeLimiter,
    validate({ body: createRequestSchema }),
    createRequest,
  )

router.get('/:id', validate({ params: requestIdParamsSchema }), getRequest)

router.patch(
  '/:id/status',
  requireRoles('organizer', 'provider', 'admin'),
  writeLimiter,
  validate({ params: requestIdParamsSchema, body: updateRequestStatusSchema }),
  updateRequestStatus,
)

router
  .route('/:requestId/offers')
  .get(validate({ params: requestNestedParamsSchema }), listOffersForRequest)
  .post(
    requireRoles('provider'),
    writeLimiter,
    validate({ params: requestNestedParamsSchema, body: createOfferSchema }),
    createOffer,
  )

module.exports = router
