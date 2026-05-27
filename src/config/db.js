const mongoose = require('mongoose')

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required')
  }

  mongoose.set('strictQuery', true)

  await mongoose.connect(uri)

  console.log(`MongoDB connected: ${mongoose.connection.name}`)

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error', error)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
  })
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

module.exports = { connectDatabase, disconnectDatabase }
