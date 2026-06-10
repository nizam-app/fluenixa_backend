const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { authLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  bootstrapAdminSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendWelcomeSchema,
  resetPasswordSchema,
} = require('./auth.schemas')
const {
  bootstrapAdmin,
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  resendWelcome,
  resetPassword,
} = require('./auth.controller')

const router = express.Router()

router.post('/register', authLimiter, validate({ body: registerSchema }), register)
router.post('/bootstrap-admin', authLimiter, validate({ body: bootstrapAdminSchema }), bootstrapAdmin)
router.post('/login', authLimiter, validate({ body: loginSchema }), login)
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPassword,
)
router.post(
  '/resend-welcome',
  authLimiter,
  validate({ body: resendWelcomeSchema }),
  resendWelcome,
)
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPassword,
)
router.get('/me', requireAuth, getMe)
router.post('/logout', requireAuth, logout)

module.exports = router
