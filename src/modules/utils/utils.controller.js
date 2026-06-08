const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { fetchImageBuffer, resolveDestinationImage } = require('../../services/destinationImage')

const getDestinationImage = asyncHandler(async (req, res) => {
  const result = await resolveDestinationImage(req.query.q, {
    googlePlacesApiKey:
      process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  })

  res.json({
    success: true,
    query: req.query.q,
    image: result,
  })
})

const streamDestinationImage = asyncHandler(async (req, res) => {
  const result = await resolveDestinationImage(req.query.q, {
    googlePlacesApiKey:
      process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  })

  if (!result?.url) {
    throw new HttpError(result?.message || 'No image found for this destination', 404)
  }

  const buffer = await fetchImageBuffer(result.url)
  if (!buffer?.length) {
    throw new HttpError('Could not fetch destination image', 502)
  }

  res.set({
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'public, max-age=86400',
  })
  res.send(buffer)
})

module.exports = { getDestinationImage, streamDestinationImage }
