const { User } = require('../modules/auth/user.model')
const { HttpError } = require('../utils/httpError')
const { verifyAuthToken } = require('../utils/jwt')

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      throw new HttpError('Authentication token is required', 401)
    }

    const payload = verifyAuthToken(token)
    const user = await User.findById(payload.sub)

    if (!user || user.status !== 'active') {
      throw new HttpError('User is not authorized', 401)
    }

    req.user = user
    next()
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      next(new HttpError('Authentication token has expired', 401))
      return
    }
    if (error?.name === 'JsonWebTokenError') {
      next(new HttpError('Authentication token is invalid', 401))
      return
    }
    if (error instanceof HttpError) {
      next(error)
      return
    }
    error.statusCode = error.statusCode || 401
    next(error)
  }
}

function requireRoles(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      next(new HttpError('Authentication is required', 401))
      return
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError('You do not have permission to access this resource', 403))
      return
    }

    next()
  }
}

module.exports = { requireAuth, requireRoles }
