const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { authLimiter } = require('../../middleware/rateLimit')
const { validate } = require('../../middleware/validate')
const {
  bootstrapAdminSchema,
  loginSchema,
  registerSchema,
} = require('./auth.schemas')
const { bootstrapAdmin, getMe, login, logout, register } = require('./auth.controller')

const router = express.Router()

router.post('/register', authLimiter, validate({ body: registerSchema }), register)
router.post('/bootstrap-admin', authLimiter, validate({ body: bootstrapAdminSchema }), bootstrapAdmin)
router.post('/login', authLimiter, validate({ body: loginSchema }), login)
router.get('/me', requireAuth, getMe)
router.post('/logout', requireAuth, logout)

module.exports = router
