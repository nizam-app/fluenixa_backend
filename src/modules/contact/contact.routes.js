const express = require('express')
const { requireAuth, requireRoles } = require('../../middleware/auth.middleware')
const { contactLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  contactIdParamsSchema,
  createContactMessageSchema,
  listContactMessagesQuerySchema,
  updateContactStatusSchema,
} = require('./contact.schemas')
const {
  createContactMessage,
  listContactMessages,
  updateContactStatus,
} = require('./contact.controller')

const router = express.Router()

router.post(
  '/',
  contactLimiter,
  validate({ body: createContactMessageSchema }),
  createContactMessage,
)

router.use(requireAuth, requireRoles('admin'))

router.get('/', validate({ query: listContactMessagesQuerySchema }), listContactMessages)
router.patch(
  '/:id/status',
  validate({ params: contactIdParamsSchema, body: updateContactStatusSchema }),
  updateContactStatus,
)

module.exports = router
