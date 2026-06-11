const { getApprovedProviderTypes } = require('../constants/providerTypes')

function maskIban(iban) {
  if (!iban || typeof iban !== 'string') return null
  const compact = iban.replace(/\s+/g, '')
  if (compact.length < 4) return null
  return `•••• ${compact.slice(-4)}`
}

function formatBillingAddress(address) {
  if (!address) return null
  const parts = [address.line1, address.postalCode, address.city, address.country].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function mapDocumentForViewer(doc, { includeStatus = false } = {}) {
  const json = doc.toJSON ? doc.toJSON() : doc
  const mapped = {
    _id: json._id,
    label: json.label,
    category: json.category,
    url: json.url,
    mimeType: json.mimeType || null,
    uploadedAt: json.uploadedAt || json.createdAt || null,
  }
  if (includeStatus) mapped.status = json.status
  return mapped
}

function mapDocumentsForOrganizer(documents = []) {
  return documents
    .filter((doc) => doc.status === 'approved')
    .map((doc) => mapDocumentForViewer(doc))
}

function toPublicProviderProfile(user, { viewerRole = 'organizer' } = {}) {
  const approvedTypes = getApprovedProviderTypes(user)
  const documents =
    viewerRole === 'admin'
      ? (user.documents || []).map((doc) => mapDocumentForViewer(doc, { includeStatus: true }))
      : mapDocumentsForOrganizer(user.documents || [])

  return {
    _id: user._id,
    name: user.name,
    avatar: user.avatar || null,
    providerType: user.providerType || approvedTypes[0] || null,
    providerTypes: approvedTypes,
    companyName: user.companyName || null,
    companyDescription: user.companyDescription || null,
    contactPerson: user.contactPerson || null,
    siret: user.siret || null,
    ibanMasked: maskIban(user.iban),
    billingAddress: user.billingAddress || null,
    billingAddressLabel: formatBillingAddress(user.billingAddress),
    status: user.status,
    rating: typeof user.rating === 'number' ? user.rating : null,
    reviewCount: user.reviewCount || 0,
    documents,
    documentsApprovedCount: (user.documents || []).filter((doc) => doc.status === 'approved').length,
  }
}

module.exports = {
  formatBillingAddress,
  mapDocumentForViewer,
  maskIban,
  toPublicProviderProfile,
}
