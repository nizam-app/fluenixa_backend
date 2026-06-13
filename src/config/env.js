const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET']

const PLACEHOLDER_SECRETS = new Set([
  'replace-this-with-a-long-random-secret',
  'change-this-bootstrap-key',
  'changeme',
  'secret',
])

function loadEnv() {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const nodeEnv = process.env.NODE_ENV || 'development'
  const port = Number(process.env.PORT || 5000)
  const jwtSecret = process.env.JWT_SECRET

  // Refuse to boot in production with weak or placeholder secrets.
  if (nodeEnv === 'production') {
    if (PLACEHOLDER_SECRETS.has(jwtSecret) || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be a strong unique value (>=32 chars) in production')
    }
    if (
      process.env.ADMIN_BOOTSTRAP_KEY &&
      PLACEHOLDER_SECRETS.has(process.env.ADMIN_BOOTSTRAP_KEY)
    ) {
      throw new Error('ADMIN_BOOTSTRAP_KEY must be replaced with a strong unique value in production')
    }
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    // Comma-separated. Include mobile dev origins when testing native apps, e.g.
    // http://localhost:5173,capacitor://localhost,http://localhost:8081
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY || '',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
    trustProxy: process.env.TRUST_PROXY === 'true',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
    brevoApiKey: process.env.BREVO_API_KEY || '',
    brevoFromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@flunexia.org',
    brevoFromName: process.env.BREVO_FROM_NAME || 'Flunexia',
    appUrl: process.env.APP_URL || '',
    contactInboxEmail: (process.env.CONTACT_INBOX_EMAIL || 'contact@flunexia.fr').trim().toLowerCase(),
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  }
}

module.exports = { loadEnv }
