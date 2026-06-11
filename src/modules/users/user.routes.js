const express = require('express')
const { loadEnv } = require('../../config/env')
const { requireAuth } = require('../../middleware/auth.middleware')
const { writeLimiter } = require('../../middleware/rateLimit')
const { buildDocumentUploader, buildImageUploader, handleMulterError } = require('../../middleware/upload')
const { validate } = require('../../middleware/validate')
const {
  deleteAccountSchema,
  documentIdParamsSchema,
  providerIdParamsSchema,
  updatePasswordSchema,
  updateProfileSchema,
} = require('./user.schemas')
const {
  deleteAccount,
  deleteDocument,
  getProfile,
  getProviderProfile,
  updatePassword,
  updateProfile,
  uploadAvatar,
  uploadDocument,
} = require('./user.controller')

const env = loadEnv()
const imageUploader = buildImageUploader({ maxBytes: env.maxUploadBytes })
const documentUploader = buildDocumentUploader({ maxBytes: env.maxUploadBytes })

const router = express.Router()

router.use(requireAuth)

router.get('/providers/:id', validate({ params: providerIdParamsSchema }), getProviderProfile)
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
router.post(
  '/me/documents',
  writeLimiter,
  documentUploader.single('file'),
  handleMulterError,
  uploadDocument,
)
router.delete(
  '/me/documents/:documentId',
  writeLimiter,
  validate({ params: documentIdParamsSchema }),
  deleteDocument,
)
router.delete('/me', writeLimiter, validate({ body: deleteAccountSchema }), deleteAccount)

module.exports = router
