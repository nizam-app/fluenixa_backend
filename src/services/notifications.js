const { Notification } = require('../modules/notifications/notification.model')
const { User } = require('../modules/auth/user.model')
const { sendNotificationEmail } = require('./email')

async function notifyUser(userId, payload) {
  if (!userId) return null

  const notification = await Notification.create({
    user: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    trip: payload.trip,
    request: payload.request,
    offer: payload.offer,
    metadata: payload.metadata,
  })

  const user =
    payload.recipient ||
    (await User.findById(userId).select('name email role'))

  if (user?.email) {
    sendNotificationEmail({
      user,
      type: payload.type,
      title: payload.title,
      body: payload.body,
    }).catch((error) => {
      console.error('[notifications] email failed:', error?.message || error)
    })
  }

  return notification
}

module.exports = { notifyUser }
