/**
 * Normalizes trip create/update fields from multipart/form-data (all strings).
 */
function normalizeTripCreateBody(body) {
  const out = { ...body }

  if (out.image === '') delete out.image

  if (out.openRequests !== undefined && out.openRequests !== null && out.openRequests !== '') {
    if (typeof out.openRequests === 'string') {
      out.openRequests = out.openRequests.toLowerCase() === 'true'
    }
  }

  for (const field of ['needTypes', 'itinerary', 'servicePlan']) {
    if (out[field] === undefined || out[field] === null || out[field] === '') continue
    if (Array.isArray(out[field])) continue
    if (typeof out[field] === 'string') {
      try {
        out[field] = JSON.parse(out[field])
      } catch {
        if (field === 'needTypes') out[field] = [out[field]]
      }
    }
  }

  return out
}

module.exports = { normalizeTripCreateBody }
