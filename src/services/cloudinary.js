const cloudinary = require('cloudinary').v2

let configured = false

function configureFromEnv() {
  const {
    CLOUDINARY_URL,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env

  // The SDK auto-detects CLOUDINARY_URL on import; calling config() merges in
  // the `secure` flag and returns the active config so we can validate it.
  if (CLOUDINARY_URL) {
    const active = cloudinary.config({ secure: true })
    configured = Boolean(active.cloud_name && active.api_key && active.api_secret)
    return
  }

  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    })
    configured = true
    return
  }

  configured = false
}

configureFromEnv()

function isConfigured() {
  return configured
}

/**
 * Uploads an in-memory image buffer to Cloudinary.
 * Returns the upload result (secure_url, public_id, width, height, ...).
 */
function uploadBuffer(buffer, { folder = 'flunexia/trips', publicId, resourceType = 'image' } = {}) {
  return new Promise((resolve, reject) => {
    if (!configured) {
      reject(new Error('Cloudinary is not configured'))
      return
    }
    const options = {
      folder,
      resource_type: resourceType,
      overwrite: true,
    }
    if (resourceType === 'image') {
      options.transformation = [{ quality: 'auto', fetch_format: 'auto' }]
    }
    if (publicId) options.public_id = publicId

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
    stream.end(buffer)
  })
}

function uploadDocumentBuffer(buffer, { folder = 'flunexia/documents', publicId, mimeType } = {}) {
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image'
  return uploadBuffer(buffer, { folder, publicId, resourceType })
}

async function destroy(publicId, { resourceType = 'image' } = {}) {
  if (!configured || !publicId) return null
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
  } catch {
    return null
  }
}

module.exports = { isConfigured, uploadBuffer, uploadDocumentBuffer, destroy }
