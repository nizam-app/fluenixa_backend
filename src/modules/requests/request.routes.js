const express = require('express')
const { loadEnv } = require('../../config/env')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { buildDocumentUploader } = require('../../middleware/upload')
const { validate } = require('../../middleware/validate')
const {
  createOffer,
  listOffersForRequest,
} = require('../offers/offer.controller')
const { buildParseOfferCreateRequest } = require('../offers/offerCreate.middleware')
const { createOfferSchema } = require('../offers/offer.schemas')

const env = loadEnv()
const offerAttachmentUploader = buildDocumentUploader({ maxBytes: env.maxUploadBytes })
const parseOfferCreateRequest = buildParseOfferCreateRequest(offerAttachmentUploader)
const {
  addRequestMessage,
  createRequest,
  deleteRequest,
  getRequest,
  getRequestHistory,
  listRequests,
  updateRequest,
  updateRequestStatus,
} = require('./request.controller')
const {
  addRequestMessageSchema,
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamsSchema,
  requestNestedParamsSchema,
  updateRequestSchema,
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
router.get('/:id/history', validate({ params: requestIdParamsSchema }), getRequestHistory)

router.patch(
  '/:id',
  requireRoles('organizer', 'admin'),
  writeLimiter,
  validate({ params: requestIdParamsSchema, body: updateRequestSchema }),
  updateRequest,
)

router.post(
  '/:id/messages',
  requireRoles('organizer', 'provider', 'admin'),
  writeLimiter,
  validate({ params: requestIdParamsSchema, body: addRequestMessageSchema }),
  addRequestMessage,
)

router.delete(
  '/:id',
  requireRoles('organizer', 'admin'),
  writeLimiter,
  validate({ params: requestIdParamsSchema }),
  deleteRequest,
)

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
    validate({ params: requestNestedParamsSchema }),
    parseOfferCreateRequest,
    validate({ body: createOfferSchema }),
    createOffer,
  )

module.exports = router
