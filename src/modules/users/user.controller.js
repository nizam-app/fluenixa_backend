const { User } = require('../auth/user.model')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')

function pickProfileUpdates(body, role) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    updates.name = body.name.trim()
  }

  if (role === 'organizer' && Object.prototype.hasOwnProperty.call(body, 'organizationType')) {
    updates.organizationType = body.organizationType ? String(body.organizationType).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'providerType')) {
    updates.providerType = body.providerType ? String(body.providerType).trim() : undefined
  }

  return updates
}

const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON(),
  })
})

const updateProfile = asyncHandler(async (req, res) => {
  const updates = pickProfileUpdates(req.body, req.user.role)

  if (Object.keys(updates).length === 0) {
    throw new HttpError('No applicable fields to update for this role', 400)
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  })

  res.json({
    success: true,
    user,
  })
})

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new HttpError('Current password is incorrect', 401)
  }

  user.passwordHash = newPassword
  await user.save()

  res.json({
    success: true,
    message: 'Password updated',
  })
})

module.exports = { getProfile, updatePassword, updateProfile }
