const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require('./notification.controller')
const {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
} = require('./notification.schemas')

const router = express.Router()

router.use(requireAuth)

router.get('/', validate({ query: listNotificationsQuerySchema }), listNotifications)
router.patch('/read-all', markAllNotificationsRead)
router.patch(
  '/:id/read',
  validate({ params: notificationIdParamsSchema }),
  markNotificationRead,
)

module.exports = router
