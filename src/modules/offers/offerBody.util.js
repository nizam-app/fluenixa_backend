/**
 * Normalizes offer create fields from multipart/form-data (all strings).
 */
function normalizeOfferCreateBody(body) {
  const out = { ...body }

  if (out.price !== undefined && out.price !== null && out.price !== '') {
    out.price = Number(out.price)
  }

  if (out.attachmentLabel === '') delete out.attachmentLabel

  return out
}

module.exports = { normalizeOfferCreateBody }
