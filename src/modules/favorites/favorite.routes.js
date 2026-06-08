const express = require('express')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  addFavorite,
  listFavorites,
  providerIdParamsSchema,
  removeFavorite,
} = require('./favorite.controller')

const router = express.Router()

router.use(requireAuth, requireRoles('organizer'))

router.get('/', listFavorites)
router.post(
  '/:providerId',
  writeLimiter,
  validate({ params: providerIdParamsSchema }),
  addFavorite,
)
router.delete(
  '/:providerId',
  writeLimiter,
  validate({ params: providerIdParamsSchema }),
  removeFavorite,
)

module.exports = router
