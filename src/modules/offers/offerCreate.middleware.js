const { handleMulterError } = require('../../middleware/upload')
const { normalizeOfferCreateBody } = require('./offerBody.util')

/**
 * JSON create passes through. multipart/form-data is parsed with optional field "attachment".
 */
function buildParseOfferCreateRequest(documentUploader) {
  return function parseOfferCreateRequest(req, res, next) {
    if (!req.is('multipart/form-data')) {
      return next()
    }

    documentUploader.single('attachment')(req, res, (err) => {
      if (err) {
        handleMulterError(err, req, res, next)
        return
      }
      req.body = normalizeOfferCreateBody(req.body)
      next()
    })
  }
}

module.exports = { buildParseOfferCreateRequest }
