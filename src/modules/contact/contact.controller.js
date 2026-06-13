const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { sendContactFormEmail } = require('../../services/email')
const { ContactMessage } = require('./contact.model')

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip
}

const createContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.create({
    name: req.body.name.trim(),
    email: req.body.email,
    role: req.body.role || 'other',
    message: req.body.message.trim(),
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent']?.slice(0, 500),
  })

  const emailResult = await sendContactFormEmail({
    name: message.name,
    email: message.email,
    role: message.role,
    message: message.message,
    messageId: String(message._id),
  })

  if (!emailResult.sent) {
    console.warn('[contact] inbox email not delivered:', emailResult.reason, emailResult.detail || '')
  }

  res.status(201).json({
    success: true,
    message: 'Thanks for reaching out, we will get back to you soon',
    contact: message.toJSON(),
    emailDelivered: emailResult.sent,
  })
})

const listContactMessages = asyncHandler(async (req, res) => {
  const { status, q } = req.query
  const query = {}

  if (status) query.status = status
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(safe, 'i')
    query.$or = [{ name: regex }, { email: regex }, { message: regex }]
  }

  const messages = await ContactMessage.find(query).sort({ createdAt: -1 })

  res.json({
    success: true,
    count: messages.length,
    messages,
  })
})

const updateContactStatus = asyncHandler(async (req, res) => {
  const updated = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true },
  )

  if (!updated) throw new HttpError('Contact message not found', 404)

  res.json({
    success: true,
    contact: updated,
  })
})

module.exports = { createContactMessage, listContactMessages, updateContactStatus }
