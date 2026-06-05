const { z } = require('zod')
const { DEVICE_PLATFORMS } = require('./device.model')

const registerDeviceSchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.enum(DEVICE_PLATFORMS),
  appVersion: z.string().trim().max(40).optional(),
})

const unregisterDeviceSchema = z.object({
  token: z.string().trim().min(1).max(512),
})

module.exports = { registerDeviceSchema, unregisterDeviceSchema }
