const { ZodError } = require('zod')
const { HttpError } = require('../utils/httpError')

function validate(schemas) {
  const targets = Object.keys(schemas).filter((key) => ['body', 'query', 'params'].includes(key))

  return function validateMiddleware(req, res, next) {
    try {
      for (const target of targets) {
        const parsed = schemas[target].parse(req[target])
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
