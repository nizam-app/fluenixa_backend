const { User } = require('../auth/user.model')
const { Device } = require('../devices/device.model')
const { Notification } = require('../notifications/notification.model')
const { Offer } = require('../offers/offer.model')
const { ServiceRequest } = require('../requests/serviceRequest.model')
const { Trip } = require('../trips/trip.model')
const cloudinary = require('../../services/cloudinary')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')

function pickProfileUpdates(body, role) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    updates.name = body.name.trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    updates.email = body.email.trim().toLowerCase()
  }

  if (role === 'organizer' && Object.prototype.hasOwnProperty.call(body, 'organizationType')) {
    updates.organizationType = body.organizationType ? String(body.organizationType).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'providerType')) {
    updates.providerType = body.providerType ? String(body.providerType).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'contactPerson')) {
    updates.contactPerson = body.contactPerson ? String(body.contactPerson).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'companyDescription')) {
    updates.companyDescription = body.companyDescription
      ? String(body.companyDescription).trim()
      : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'companyName')) {
    updates.companyName = body.companyName ? String(body.companyName).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'siret')) {
    updates.siret = body.siret ? String(body.siret).trim() : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'iban')) {
    updates.iban = body.iban ? String(body.iban).trim().replace(/\s+/g, '') : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'bic')) {
    updates.bic = body.bic ? String(body.bic).trim().replace(/\s+/g, '') : undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'billingAddress')) {
    updates.billingAddress = body.billingAddress || undefined
  }

  if (role === 'provider' && Object.prototype.hasOwnProperty.call(body, 'billing')) {
    updates.billing = body.billing || undefined
  }

  return updates
}

async function applyUserAvatar(user, buffer) {
  if (!cloudinary.isConfigured()) {
    throw new HttpError(
      'Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      503,
    )
  }

  const previousPublicId = user.avatarPublicId
  const result = await cloudinary.uploadBuffer(buffer, {
    folder: 'flunexia/avatars',
    publicId: `user-${user._id}`,
  })

  user.avatar = result.secure_url
  user.avatarPublicId = result.public_id

  if (previousPublicId && previousPublicId !== result.public_id) {
    cloudinary.destroy(previousPublicId).catch(() => {})
  }
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

  if (updates.email && updates.email !== req.user.email) {
    const taken = await User.findOne({ email: updates.email })
    if (taken && String(taken._id) !== String(req.user._id)) {
      throw new HttpError('Email is already in use', 409)
    }
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

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError('Image file is required (multipart field "image")', 400)
  }

  const user = await User.findById(req.user._id)
  if (!user) throw new HttpError('User not found', 404)

  await applyUserAvatar(user, req.file.buffer)
  await user.save()

  res.json({
    success: true,
    user,
  })
})

const deleteAccount = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    throw new HttpError('Admin accounts cannot be deleted via this endpoint', 403)
  }

  const user = await User.findById(req.user._id).select('+passwordHash avatarPublicId')
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new HttpError('Password is incorrect', 401)
  }

  const userId = user._id

  if (user.role === 'organizer') {
    const trips = await Trip.find({ organizer: userId }).select('_id imagePublicId')
    for (const trip of trips) {
      if (trip.imagePublicId) {
        cloudinary.destroy(trip.imagePublicId).catch(() => {})
      }
    }
    await Trip.deleteMany({ organizer: userId })
    await ServiceRequest.deleteMany({ organizer: userId })
  }

  if (user.role === 'provider') {
    await Offer.deleteMany({ provider: userId })
  }

  await Notification.deleteMany({ user: userId })
  await Device.deleteMany({ user: userId })

  if (user.avatarPublicId) {
    cloudinary.destroy(user.avatarPublicId).catch(() => {})
  }

  await user.deleteOne()

  res.json({
    success: true,
    message: 'Account deleted',
  })
})

module.exports = {
  deleteAccount,
  getProfile,
  updatePassword,
  updateProfile,
  uploadAvatar,
}
