const express = require('express')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  createUser,
  getStats,
  listOffers,
  listRequests,
  listTrips,
  listUsers,
  updateUserStatus,
} = require('./admin.controller')
const {
  createUserSchema,
  listOffersQuerySchema,
  listRequestsQuerySchema,
  listTripsQuerySchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} = require('./admin.schemas')

const router = express.Router()

router.use(requireAuth, requireRoles('admin'))

router.get('/stats', getStats)
router
  .route('/users')
  .get(validate({ query: listUsersQuerySchema }), listUsers)
  .post(writeLimiter, validate({ body: createUserSchema }), createUser)
router.patch(
  '/users/:id/status',
  writeLimiter,
  validate({ params: userIdParamsSchema, body: updateUserStatusSchema }),
  updateUserStatus,
)
router.get('/trips', validate({ query: listTripsQuerySchema }), listTrips)
router.get('/requests', validate({ query: listRequestsQuerySchema }), listRequests)
router.get('/offers', validate({ query: listOffersQuerySchema }), listOffers)

module.exports = router
