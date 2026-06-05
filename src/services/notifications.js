const { Notification } = require('../modules/notifications/notification.model')

async function notifyUser(userId, payload) {
  if (!userId) return null

  return Notification.create({
    user: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    trip: payload.trip,
    request: payload.request,
    offer: payload.offer,
    metadata: payload.metadata,
  })
}

module.exports = { notifyUser }
