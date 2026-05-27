const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { validate } = require('../../middleware/validate')
const { updatePasswordSchema, updateProfileSchema } = require('./user.schemas')
const { getProfile, updatePassword, updateProfile } = require('./user.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/me', getProfile)
router.patch('/me', validate({ body: updateProfileSchema }), updateProfile)
router.patch('/me/password', validate({ body: updatePasswordSchema }), updatePassword)

module.exports = router
