const DISPLAY_STATUSES = [
  'pending',
  'offers_received',
  'under_negotiation',
  'confirmed',
  'completed',
  'cancelled',
]

const DISPLAY_STATUS_LABELS = {
  pending: 'Pending',
  offers_received: 'Offers Received',
  under_negotiation: 'Under Negotiation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Canceled',
}

function getRequestDisplayStatus(request, offerCounts = {}) {
  const status = request?.status
  const submitted = offerCounts.submitted ?? 0
  const total = offerCounts.total ?? submitted

  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed') return 'completed'
  if (status === 'accepted') return 'confirmed'
  if (status === 'rejected') return 'cancelled'

  if (status === 'pending') {
    if (submitted >= 2) return 'under_negotiation'
    if (total > 0) return 'offers_received'
    return 'pending'
  }

  return 'pending'
}

async function attachOfferCounts(requests, Offer) {
  if (!requests.length) return {}

  const ids = requests.map((r) => r._id)
  const rows = await Offer.aggregate([
    { $match: { request: { $in: ids } } },
    {
      $group: {
        _id: '$request',
        total: { $sum: 1 },
        submitted: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] },
        },
      },
    },
  ])

  return Object.fromEntries(rows.map((row) => [String(row._id), { total: row.total, submitted: row.submitted }]))
}

function enrichRequestWithDisplayStatus(request, offerCountsMap = {}) {
  const counts = offerCountsMap[String(request._id)] || { total: 0, submitted: 0 }
  const displayStatus = getRequestDisplayStatus(request, counts)
  const json = typeof request.toJSON === 'function' ? request.toJSON() : { ...request }
  return {
    ...json,
    displayStatus,
    displayStatusLabel: DISPLAY_STATUS_LABELS[displayStatus],
    offerCounts: counts,
  }
}

module.exports = {
  DISPLAY_STATUSES,
  DISPLAY_STATUS_LABELS,
  attachOfferCounts,
  enrichRequestWithDisplayStatus,
  getRequestDisplayStatus,
}
