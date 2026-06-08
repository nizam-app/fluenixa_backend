const express = require('express')
const { validate } = require('../../middleware/validate')
const { getDestinationImage, streamDestinationImage } = require('./utils.controller')
const { destinationImageQuerySchema } = require('./utils.schemas')

const router = express.Router()

router.get(
  '/destination-image',
  validate({ query: destinationImageQuerySchema }),
  getDestinationImage,
)

router.get(
  '/destination-image/proxy',
  validate({ query: destinationImageQuerySchema }),
  streamDestinationImage,
)

module.exports = router
