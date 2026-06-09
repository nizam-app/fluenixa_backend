const { Notification } = require('../modules/notifications/notification.model')
const { User } = require('../modules/auth/user.model')
const { sendNotificationEmail } = require('./email')

function normalizeUserId(userRef) {
  if (!userRef) return null
  if (typeof userRef === 'string') return userRef
  if (userRef._id) return userRef._id
  return userRef
}

async function resolveRecipient(userRef, explicitRecipient) {
  if (explicitRecipient?.email) return explicitRecipient
  if (userRef?.email) {
    return {
      _id: normalizeUserId(userRef),
      name: userRef.name,
      email: userRef.email,
      role: userRef.role,
    }
  }

  const userId = normalizeUserId(userRef)
  if (!userId) return null
  return User.findById(userId).select('name email role')
}

async function notifyUser(userRef, payload = {}) {
  const userId = normalizeUserId(userRef)
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

  const user = await resolveRecipient(userRef, payload.recipient)
  if (!user?.email) {
    console.warn('[notifications] no email for user', String(userId), payload.type)
    return notification
  }

  try {
    const emailResult = await sendNotificationEmail({
      user,
      type: payload.type,
      title: payload.title,
      body: payload.body,
    })

    if (!emailResult.sent) {
      console.error(
        '[notifications] email not sent:',
        payload.type,
        'to',
        user.email,
        emailResult.reason || 'unknown',
        emailResult.detail || '',
      )
    }
  } catch (error) {
    console.error('[notifications] email failed:', user.email, error?.message || error)
  }

  return notification
}

module.exports = { notifyUser }
