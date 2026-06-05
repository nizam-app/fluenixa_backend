const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { paginateQuery, parsePagination } = require('../../utils/pagination')
const { Notification } = require('./notification.model')

const listNotifications = asyncHandler(async (req, res) => {
  const query = { user: req.user._id }
  if (req.query.read === 'true') query.read = true
  if (req.query.read === 'false') query.read = false

  const pagination = parsePagination(req.query, { defaultLimit: 30 })
  const { items, meta } = await paginateQuery(Notification, query, {
    page: pagination.page,
    limit: pagination.limit,
    skip: pagination.skip,
    sort: { createdAt: -1 },
  })

  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false })

  res.json({
    success: true,
    count: items.length,
    unreadCount,
    pagination: meta,
    notifications: items,
  })
})

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true },
  )

  if (!notification) throw new HttpError('Notification not found', 404)

  res.json({ success: true, notification })
})

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } },
  )

  res.json({
    success: true,
    updated: result.modifiedCount,
  })
})

module.exports = {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
}
