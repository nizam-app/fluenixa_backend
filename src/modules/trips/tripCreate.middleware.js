const { handleMulterError } = require('../../middleware/upload')
const { normalizeTripCreateBody } = require('./tripBody.util')

/**
 * JSON create passes through. multipart/form-data is parsed with optional field "image".
 */
function buildParseTripCreateRequest(imageUploader) {
  return function parseTripCreateRequest(req, res, next) {
    if (!req.is('multipart/form-data')) {
      return next()
    }

    imageUploader.single('image')(req, res, (err) => {
      if (err) {
        handleMulterError(err, req, res, next)
        return
      }
      req.body = normalizeTripCreateBody(req.body)
      next()
    })
  }
}

module.exports = { buildParseTripCreateRequest }
