const { recordAudit } = require('../../services/audit')
const { formatServiceNeedMessage } = require('../../utils/servicePlan')
const { ServiceRequest } = require('./serviceRequest.model')

function buildBundledRequestMessage(trip) {
  const types = (trip.needTypes || []).join(', ')
  const lines = [
    'Full package request — one provider handles all services for this group booking.',
    types && `Services needed: ${types}.`,
  ].filter(Boolean)
  return lines.join('\n\n')
}

async function createTripRequest({ trip, organizer, needType, message }) {
  const request = await ServiceRequest.create({
    trip: trip._id,
    organizer: organizer._id,
    needType,
    message: message?.trim() || undefined,
  })

  await recordAudit({
    entityType: 'request',
    entityId: request._id,
    action: 'created',
    summary: `${needType} request created`,
    actor: organizer._id,
    actorRole: organizer.role,
    request: request._id,
    trip: trip._id,
  })

  return request
}

/**
 * Opens service request(s) for a trip when the organizer publishes.
 * Idempotent: skips need types that already have a request on this trip.
 */
async function openRequestsForTrip({ trip, organizer, message }) {
  const needTypes = trip.needTypes || []
  if (needTypes.length === 0) return []

  const existing = await ServiceRequest.find({ trip: trip._id }).select('needType')
  if (existing.length > 0 && trip.bookingMode === 'bundled') {
    return []
  }

  const existingNeedTypes = new Set(existing.map((item) => item.needType))
  const created = []

  if (trip.bookingMode === 'bundled') {
    const primaryType = needTypes.includes('Hotel') ? 'Hotel' : needTypes[0]
    const bundledMessage = buildBundledRequestMessage(trip)
    const fullMessage = [bundledMessage, message?.trim()].filter(Boolean).join('\n\n')

    const request = await createTripRequest({
      trip,
      organizer,
      needType: primaryType,
      message: fullMessage,
    })
    created.push(request)
    return created
  }

  for (const needType of needTypes) {
    if (existingNeedTypes.has(needType)) continue

    const planMessage = formatServiceNeedMessage(trip.servicePlan, needType)
    const requestMessage = [planMessage, message?.trim()].filter(Boolean).join('\n\n') || undefined

    const request = await createTripRequest({
      trip,
      organizer,
      needType,
      message: requestMessage,
    })
    created.push(request)
  }

  return created
}

module.exports = { openRequestsForTrip }
