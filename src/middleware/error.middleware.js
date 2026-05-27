const mongoose = require('mongoose')

function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'
  let details = error.details

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400
    details = Object.values(error.errors).map((err) => ({
      path: err.path,
      message: err.message,
    }))
    message = details.map((d) => `${d.path}: ${d.message}`).join('; ') || 'Validation failed'
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400
    message = `Invalid ${error.path}`
  } else if (error?.code === 11000) {
    statusCode = 409
    const duplicateField = Object.keys(error.keyValue || {})[0] || 'field'
    message = `Duplicate value for ${duplicateField}`
  }

  const body = {
    success: false,
    message,
  }

  if (details) body.details = details
  if (process.env.NODE_ENV !== 'production' && error.stack) body.stack = error.stack

  res.status(statusCode).json(body)
}

module.exports = { errorHandler, notFound }
