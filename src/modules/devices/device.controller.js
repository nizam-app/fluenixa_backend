const { asyncHandler } = require('../../utils/asyncHandler')
const { Device } = require('./device.model')

const registerDevice = asyncHandler(async (req, res) => {
  const { token, platform, appVersion } = req.body

  const device = await Device.findOneAndUpdate(
    { user: req.user._id, token },
    {
      user: req.user._id,
      token,
      platform,
      appVersion,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  res.status(201).json({
    success: true,
    device,
  })
})

const unregisterDevice = asyncHandler(async (req, res) => {
  await Device.deleteOne({ user: req.user._id, token: req.body.token })

  res.json({
    success: true,
    message: 'Device unregistered',
  })
})

const listDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ user: req.user._id }).sort({ updatedAt: -1 })

  res.json({
    success: true,
    count: devices.length,
    devices,
  })
})

module.exports = { listDevices, registerDevice, unregisterDevice }
