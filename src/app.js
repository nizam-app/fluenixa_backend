const path = require('path')
const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')

const { loadEnv } = require('./config/env')
const adminRoutes = require('./modules/admin/admin.routes')
const authRoutes = require('./modules/auth/auth.routes')
const contactRoutes = require('./modules/contact/contact.routes')
const deviceRoutes = require('./modules/devices/device.routes')
const mobileRoutes = require('./modules/mobile/mobile.routes')
const notificationRoutes = require('./modules/notifications/notification.routes')
const offerRoutes = require('./modules/offers/offer.routes')
const requestRoutes = require('./modules/requests/request.routes')
const tripRoutes = require('./modules/trips/trip.routes')
const userRoutes = require('./modules/users/user.routes')
const { clientPlatform } = require('./middleware/clientPlatform')
const { errorHandler, notFound } = require('./middleware/error.middleware')

function createApp() {
  const env = loadEnv()
  const app = express()

  app.locals.env = env

  if (env.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors({
      origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  )

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'))
  }

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(clientPlatform)

  app.use('/uploads', express.static(path.resolve(env.uploadDir)))

  app.get('/api/v1/health', (req, res) => {
    res.json({
      success: true,
      service: 'flunexia-api',
      status: 'ok',
      environment: env.nodeEnv,
      clients: ['web', 'ios', 'android'],
      timestamp: new Date().toISOString(),
    })
  })

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/users', userRoutes)
  app.use('/api/v1/trips', tripRoutes)
  app.use('/api/v1/requests', requestRoutes)
  app.use('/api/v1/offers', offerRoutes)
  app.use('/api/v1/admin', adminRoutes)
  app.use('/api/v1/contact', contactRoutes)
  app.use('/api/v1/mobile', mobileRoutes)
  app.use('/api/v1/notifications', notificationRoutes)
  app.use('/api/v1/devices', deviceRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
