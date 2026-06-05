const express = require('express')
const { loadEnv } = require('../../config/env')
const { requireAuth } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { buildImageUploader, handleMulterError } = require('../../middleware/upload')
const { validate } = require('../../middleware/validate')
const {
  deleteAccountSchema,
  updatePasswordSchema,
  updateProfileSchema,
} = require('./user.schemas')
const {
  deleteAccount,
  getProfile,
  updatePassword,
  updateProfile,
  uploadAvatar,
} = require('./user.controller')

const env = loadEnv()
const imageUploader = buildImageUploader({ maxBytes: env.maxUploadBytes })

const router = express.Router()

router.use(requireAuth)

router.get('/me', getProfile)
router.patch('/me', writeLimiter, validate({ body: updateProfileSchema }), updateProfile)
router.patch('/me/password', writeLimiter, validate({ body: updatePasswordSchema }), updatePassword)
router.post(
  '/me/avatar',
  writeLimiter,
  imageUploader.single('image'),
  handleMulterError,
  uploadAvatar,
)
router.delete('/me', writeLimiter, validate({ body: deleteAccountSchema }), deleteAccount)

module.exports = router
