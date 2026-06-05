const { ZodError } = require('zod')
const { HttpError } = require('../utils/httpError')

function validate(schemas) {
  const targets = Object.keys(schemas).filter((key) => ['body', 'query', 'params'].includes(key))

  return function validateMiddleware(req, res, next) {
    try {
      for (const target of targets) {
        const value = req[target]
        if (target === 'body' && value === undefined) {
          const contentType = req.headers['content-type'] || ''
          if (contentType.includes('multipart/form-data')) {
            throw new HttpError(
              'Could not read multipart body. Ensure the API server supports multipart on this route, or send JSON without a file.',
              400,
            )
          }
        }
        const parsed = schemas[target].parse(value)
        req[target] = parsed
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        }))
        const message = details.map((d) => `${d.path}: ${d.message}`).join('; ')
        next(new HttpError(message || 'Invalid request payload', 400, details))
        return
      }
      next(error)
    }
  }
}

module.exports = { validate }
