const { User } = require('../auth/user.model')

const NEED_TO_PROVIDER_TYPE = {
  Transport: 'Transport',
  Activity: 'Activity',
  Restaurant: 'Restaurant',
  Hotel: 'Hotel',
  'Other Service': 'Other Service',
}

function mapProviderForClient(provider) {
  const doc = provider.toJSON ? provider.toJSON() : provider
  const rating = typeof doc.rating === 'number' ? doc.rating : null
  return {
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    providerType: doc.providerType,
    avatar: doc.avatar || null,
    rating,
    reviewCount: doc.reviewCount || 0,
    badge: rating !== null && rating >= 4.8 ? 'TOP' : null,
  }
}

async function findRecommendedProvidersForTrip(trip, { limit = 8 } = {}) {
  const needTypes = trip.needTypes || []
  const providerTypes = [
    ...new Set(needTypes.map((need) => NEED_TO_PROVIDER_TYPE[need]).filter(Boolean)),
  ]

  const query = { role: 'provider', status: 'active' }
  if (providerTypes.length) {
    query.providerType = { $in: providerTypes }
  }

  const providers = await User.find(query)
    .select('name email providerType avatar rating reviewCount')
    .sort({ rating: -1, name: 1 })
    .limit(limit)

  return providers.map(mapProviderForClient)
}

module.exports = { findRecommendedProvidersForTrip, mapProviderForClient, NEED_TO_PROVIDER_TYPE }
