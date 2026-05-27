require('dotenv').config()

const { createApp } = require('./app')
const { loadEnv } = require('./config/env')
const { connectDatabase, disconnectDatabase } = require('./config/db')

async function startServer() {
  try {
    const env = loadEnv()
    await connectDatabase(env.mongoUri)

    const app = createApp()
    const server = app.listen(env.port, () => {
      console.log(`API server listening on port ${env.port} (${env.nodeEnv})`)
    })

    const shutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully`)
      server.close(async () => {
        await disconnectDatabase()
        process.exit(0)
      })
      setTimeout(() => {
        console.error('Forcing shutdown after 10s')
        process.exit(1)
      }, 10000).unref()
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  } catch (error) {
    console.error('Failed to start API server')
    console.error(error)
    process.exit(1)
  }
}

startServer()
