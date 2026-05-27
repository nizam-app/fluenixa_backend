const jwt = require('jsonwebtoken')

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }
  return process.env.JWT_SECRET
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  )
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret())
}

module.exports = { signAuthToken, verifyAuthToken }
