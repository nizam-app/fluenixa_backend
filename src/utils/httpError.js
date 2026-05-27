class HttpError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message)
    this.statusCode = statusCode
    if (details) this.details = details
  }
}

function httpError(message, statusCode = 500, details) {
  return new HttpError(message, statusCode, details)
}

module.exports = { HttpError, httpError }
