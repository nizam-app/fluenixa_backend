const express = require('express')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  listOffersQuerySchema,
  offerIdParamsSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
} = require('./offer.schemas')
const { getOffer, listOffers, updateOffer, updateOfferStatus } = require('./offer.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/', validate({ query: listOffersQuerySchema }), listOffers)
router.get('/:id', validate({ params: offerIdParamsSchema }), getOffer)
router.patch(
  '/:id',
  requireRoles('provider'),
  writeLimiter,
  validate({ params: offerIdParamsSchema, body: updateOfferSchema }),
  updateOffer,
)
router.patch(
  '/:id/status',
  requireRoles('organizer', 'provider', 'admin'),
  writeLimiter,
  validate({ params: offerIdParamsSchema, body: updateOfferStatusSchema }),
  updateOfferStatus,
)

module.exports = router
