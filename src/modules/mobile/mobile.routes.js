const express = require('express')
const { requireAuth } = require('../../middleware/auth.middleware')
const { getDashboard, getMobileConfig, getMobileHelp } = require('./mobile.controller')

const router = express.Router()

router.get('/config', getMobileConfig)
router.get('/help', getMobileHelp)
router.get('/dashboard', requireAuth, getDashboard)

module.exports = router
