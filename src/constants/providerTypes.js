const { HttpError } = require('../utils/httpError')

const PROVIDER_SERVICE_TYPES = [
  'Transport',
  'Accommodation',
  'Food & Catering',
  'Guide & Tour',
  'Equipment',
]

const PROVIDER_SERVICE_TO_NEED_TYPE = {
  Transport: 'Transport',
  Accommodation: 'Hotel',
  'Food & Catering': 'Restaurant',
  'Guide & Tour': 'Activity',
  Equipment: 'Other Service',
}

const NEED_TYPE_TO_PROVIDER_SERVICE = Object.fromEntries(
  Object.entries(PROVIDER_SERVICE_TO_NEED_TYPE).map(([service, need]) => [need, service]),
)

function normalizeProviderTypes(values) {
  if (!values) return []
  const list = Array.isArray(values) ? values : [values]
  const normalized = []
  for (const value of list) {
    const trimmed = String(value || '').trim()
    if (!trimmed || !PROVIDER_SERVICE_TYPES.includes(trimmed)) continue
    if (!normalized.includes(trimmed)) normalized.push(trimmed)
  }
  return normalized
}

function getApprovedProviderTypes(user) {
  if (!user) return []
  if (Array.isArray(user.providerTypes) && user.providerTypes.length) {
    return normalizeProviderTypes(user.providerTypes)
  }
  if (user.providerType) return normalizeProviderTypes([user.providerType])
  return []
}

function syncPrimaryProviderType(user) {
  const approved = getApprovedProviderTypes(user)
  user.providerType = approved[0] || user.pendingProviderTypes?.[0] || undefined
}

function applyProviderServiceSelection(user, desiredTypes, { isRegistration = false } = {}) {
  const types = normalizeProviderTypes(desiredTypes)
  if (!types.length) {
    throw new HttpError('Select at least one supplier service', 400)
  }

  const approved = new Set(getApprovedProviderTypes(user))

  if (isRegistration) {
    if (types.length === 1) {
      user.providerTypes = types
      user.pendingProviderTypes = []
      user.providerType = types[0]
      user.status = 'active'
      return {
        requiresApproval: false,
        approvalMessage: null,
        issueToken: true,
      }
    }

    user.providerTypes = []
    user.pendingProviderTypes = types
    user.providerType = types[0]
    user.status = 'pending'
    return {
      requiresApproval: true,
      approvalMessage:
        'Your supplier account includes multiple services and is pending platform administrator approval.',
      issueToken: false,
    }
  }

  const desiredSet = new Set(types)
  const nextApproved = [...approved].filter((type) => desiredSet.has(type))
  const newlyRequested = types.filter((type) => !approved.has(type))

  user.providerTypes = nextApproved
  user.pendingProviderTypes = [
    ...new Set([
      ...(user.pendingProviderTypes || []).filter((type) => desiredSet.has(type)),
      ...newlyRequested,
    ]),
  ]
  syncPrimaryProviderType(user)

  if (newlyRequested.length > 0) {
    return {
      requiresApproval: true,
      approvalMessage: 'New service types were submitted for administrator approval.',
      issueToken: true,
    }
  }

  user.pendingProviderTypes = (user.pendingProviderTypes || []).filter((type) => desiredSet.has(type))

  if (nextApproved.length === 0 && user.pendingProviderTypes.length > 0) {
    return {
      requiresApproval: true,
      approvalMessage: 'Your service selection is pending administrator approval.',
      issueToken: true,
    }
  }

  return {
    requiresApproval: false,
    approvalMessage: null,
    issueToken: true,
  }
}

module.exports = {
  PROVIDER_SERVICE_TYPES,
  PROVIDER_SERVICE_TO_NEED_TYPE,
  NEED_TYPE_TO_PROVIDER_SERVICE,
  normalizeProviderTypes,
  getApprovedProviderTypes,
  syncPrimaryProviderType,
  applyProviderServiceSelection,
}
