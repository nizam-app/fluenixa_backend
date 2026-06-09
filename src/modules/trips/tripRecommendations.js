const { User } = require('../auth/user.model')
const {
  NEED_TYPE_TO_PROVIDER_SERVICE,
  PROVIDER_SERVICE_TO_NEED_TYPE,
  getApprovedProviderTypes,
} = require('../../constants/providerTypes')

function mapProviderForClient(provider) {
  const doc = provider.toJSON ? provider.toJSON() : provider
  const rating = typeof doc.rating === 'number' ? doc.rating : null
  const approvedTypes = getApprovedProviderTypes(doc)
  return {
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    providerType: doc.providerType || approvedTypes[0] || null,
    providerTypes: approvedTypes,
    pendingProviderTypes: doc.pendingProviderTypes || [],
    avatar: doc.avatar || null,
    rating,
    reviewCount: doc.reviewCount || 0,
    badge: rating !== null && rating >= 4.8 ? 'TOP' : null,
  }
}

async function findRecommendedProvidersForTrip(trip, { limit = 8 } = {}) {
  const needTypes = trip.needTypes || []
  const providerServices = [
    ...new Set(
      needTypes
        .map((need) => NEED_TYPE_TO_PROVIDER_SERVICE[need] || need)
        .filter(Boolean),
    ),
  ]

  const query = { role: 'provider', status: 'active' }
  if (providerServices.length) {
    query.$or = [
      { providerTypes: { $in: providerServices } },
      { providerType: { $in: providerServices } },
      {
        providerType: {
          $in: providerServices
            .map((service) => PROVIDER_SERVICE_TO_NEED_TYPE[service])
            .filter(Boolean),
        },
      },
    ]
  }

  const providers = await User.find(query)
    .select('name email providerType providerTypes pendingProviderTypes avatar rating reviewCount')
    .sort({ rating: -1, name: 1 })
    .limit(limit)

  return providers.map(mapProviderForClient)
}

module.exports = {
  findRecommendedProvidersForTrip,
  mapProviderForClient,
  NEED_TYPE_TO_PROVIDER_SERVICE,
  PROVIDER_SERVICE_TO_NEED_TYPE,
}
