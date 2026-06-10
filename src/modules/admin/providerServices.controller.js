const { User } = require('../auth/user.model')
const { syncPrimaryProviderType } = require('../../constants/providerTypes')
const { sendWelcomeEmail } = require('../../services/email')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')

const approveProviderServices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user || user.role !== 'provider') throw new HttpError('Supplier not found', 404)

  const pending = user.pendingProviderTypes || []
  if (!pending.length) {
    throw new HttpError('No pending supplier services to approve', 400)
  }

  user.providerTypes = [...new Set([...(user.providerTypes || []), ...pending])]
  user.pendingProviderTypes = []
  syncPrimaryProviderType(user)
  user.status = 'active'
  await user.save()

  let welcomeEmailSent = false
  try {
    const emailResult = await sendWelcomeEmail(user)
    welcomeEmailSent = emailResult.sent === true
    if (!emailResult.sent) {
      console.warn('[admin] welcome email not sent:', user.email, emailResult.reason || 'unknown', emailResult.detail || '')
    }
  } catch (error) {
    console.error('[admin] welcome email failed:', user.email, error?.message || error)
  }

  res.json({
    success: true,
    message: 'Supplier services approved.',
    welcomeEmailSent,
    user,
  })
})

module.exports = { approveProviderServices }
