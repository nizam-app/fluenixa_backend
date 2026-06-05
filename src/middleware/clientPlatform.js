const CLIENT_PLATFORMS = new Set(['web', 'ios', 'android', 'mobile'])

function clientPlatform(req, res, next) {
  const raw = (req.headers['x-client-platform'] || req.headers['x-flunexia-client'] || '')
    .toString()
    .trim()
    .toLowerCase()

  req.clientPlatform = CLIENT_PLATFORMS.has(raw) ? raw : 'unknown'
  next()
}

module.exports = { CLIENT_PLATFORMS, clientPlatform }
