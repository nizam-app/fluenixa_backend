const express = require('express')
const { loadEnv } = require('../../config/env')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { buildImageUploader, handleMulterError } = require('../../middleware/upload')
const { validate } = require('../../middleware/validate')
const {
  createTripSchema,
  listTripsQuerySchema,
  tripIdParamsSchema,
  updateTripSchema,
} = require('./trip.schemas')
const {
  createTrip,
  deleteTrip,
  duplicateTrip,
  getRecommendedProviders,
  getTrip,
  listTrips,
  updateTrip,
  uploadTripImage,
} = require('./trip.controller')
const { buildParseTripCreateRequest } = require('./tripCreate.middleware')

const env = loadEnv()
const imageUploader = buildImageUploader({
  maxBytes: env.maxUploadBytes,
})
const parseTripCreateRequest = buildParseTripCreateRequest(imageUploader)

const router = express.Router()

router.use(requireAuth)

router
  .route('/')
  .get(validate({ query: listTripsQuerySchema }), listTrips)
  .post(
    requireRoles('organizer'),
    writeLimiter,
    parseTripCreateRequest,
    validate({ body: createTripSchema }),
    createTrip,
  )

router
  .route('/:id')
  .get(validate({ params: tripIdParamsSchema }), getTrip)
  .patch(
    requireRoles('organizer', 'admin'),
    writeLimiter,
    validate({ params: tripIdParamsSchema, body: updateTripSchema }),
    updateTrip,
  )
  .delete(
    requireRoles('organizer', 'admin'),
    writeLimiter,
    validate({ params: tripIdParamsSchema }),
    deleteTrip,
  )

router.post(
  '/:id/duplicate',
  requireRoles('organizer'),
  writeLimiter,
  validate({ params: tripIdParamsSchema }),
  duplicateTrip,
)

router.get(
  '/:id/recommended-providers',
  validate({ params: tripIdParamsSchema }),
  getRecommendedProviders,
)

router.post(
  '/:id/image',
  requireRoles('organizer', 'admin'),
  writeLimiter,
  validate({ params: tripIdParamsSchema }),
  imageUploader.single('image'),
  handleMulterError,
  uploadTripImage,
)

module.exports = router
