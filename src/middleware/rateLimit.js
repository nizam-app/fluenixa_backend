const rateLimit = require('express-rate-limit')

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler(req, res) {
      res.status(429).json({ success: false, message })
    },
  })
}

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again in 15 minutes',
})

const contactLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many contact submissions, please try again later',
})

const writeLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many requests, slow down and try again shortly',
})

module.exports = { authLimiter, contactLimiter, writeLimiter }
