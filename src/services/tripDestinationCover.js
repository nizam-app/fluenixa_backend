const cloudinary = require('./cloudinary')
const { fetchImageBuffer, resolveDestinationImage } = require('./destinationImage')

async function applyDestinationCoverToTrip(trip) {
  if (!trip?.location?.trim()) return false
  if (!cloudinary.isConfigured()) return false

  const resolved = await resolveDestinationImage(trip.location.trim(), {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  })

  if (!resolved?.url) return false

  const buffer = await fetchImageBuffer(resolved.url)
  if (!buffer?.length) return false

  const previousPublicId = trip.imagePublicId
  const result = await cloudinary.uploadBuffer(buffer, {
    folder: 'flunexia/trips',
    publicId: `trip-${trip._id}`,
  })

  trip.image = result.secure_url
  trip.imagePublicId = result.public_id
  await trip.save()

  if (previousPublicId && previousPublicId !== result.public_id) {
    cloudinary.destroy(previousPublicId).catch(() => {})
  }

  return true
}

module.exports = { applyDestinationCoverToTrip }
