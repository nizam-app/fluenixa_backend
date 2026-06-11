const multer = require('multer')
const { HttpError } = require('../utils/httpError')

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
])

/**
 * Builds a multer uploader that keeps the file in memory so the controller
 * can stream the buffer directly to an external service (e.g. Cloudinary).
 */
function buildImageUploader({ maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter(req, file, cb) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        cb(new HttpError(`Unsupported image type: ${file.mimetype}`, 415))
        return
      }
      cb(null, true)
    },
  })
}

function buildDocumentUploader({ maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter(req, file, cb) {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
        cb(new HttpError(`Unsupported document type: ${file.mimetype}`, 415))
        return
      }
      cb(null, true)
    },
  })
}

function handleMulterError(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded image is too large' : err.message
    next(new HttpError(message, 400))
    return
  }
  next(err)
}

module.exports = { buildDocumentUploader, buildImageUploader, handleMulterError }
