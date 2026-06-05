const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const { listDevices, registerDevice, unregisterDevice } = require('./device.controller')
const { registerDeviceSchema, unregisterDeviceSchema } = require('./device.schemas')

const router = express.Router()

router.use(requireAuth)

router.get('/', listDevices)
router.post('/register', writeLimiter, validate({ body: registerDeviceSchema }), registerDevice)
router.post(
  '/unregister',
  writeLimiter,
  validate({ body: unregisterDeviceSchema }),
  unregisterDevice,
)

module.exports = router
