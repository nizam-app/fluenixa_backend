const crypto = require('crypto')
const { loadEnv } = require('../../config/env')
const { sendWelcomeEmail } = require('../../services/email')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { signAuthToken } = require('../../utils/jwt')
const { PasswordReset } = require('./passwordReset.model')
const { User } = require('./user.model')
const {
  applyProviderServiceSelection,
  normalizeProviderTypes,
} = require('../../constants/providerTypes')

const RESET_TTL_MS = 60 * 60 * 1000

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

function buildAuthResponse(user) {
  return {
    token: signAuthToken(user),
    user: user.toJSON(),
  }
}

async function deliverWelcomeEmail(signupEmail, user, { pendingApproval = false } = {}) {
  try {
    const emailResult = await sendWelcomeEmail(
      { name: user.name, role: user.role, email: signupEmail },
      { pendingApproval, email: signupEmail },
    )
    if (!emailResult.sent) {
      console.warn(
        '[auth] welcome email not sent:',
        signupEmail,
        emailResult.reason || 'unknown',
        emailResult.detail || '',
      )
    }
    return {
      welcomeEmailSent: emailResult.sent === true,
      welcomeEmailSentTo: signupEmail,
      welcomeEmailError: emailResult.sent ? null : emailResult.reason || 'send_failed',
    }
  } catch (error) {
    console.error('[auth] welcome email failed:', signupEmail, error?.message || error)
    return {
      welcomeEmailSent: false,
      welcomeEmailSentTo: signupEmail,
      welcomeEmailError: 'send_failed',
    }
  }
}

const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    name,
    accountType,
    role,
    organizationType,
    providerType,
    providerTypes,
    contactPerson,
    companyDescription,
  } = req.body
  const selectedRole = (accountType || role || '').toLowerCase()

  if (selectedRole !== 'organizer' && selectedRole !== 'provider') {
    throw new HttpError('Please select Organizer or Supplier', 400)
  }

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new HttpError('An account with this email already exists', 409)
  }

  const user = await User.create({
    email,
    name: (name || email.split('@')[0]).trim(),
    passwordHash: password,
    role: selectedRole,
    organizationType: selectedRole === 'organizer' ? organizationType : undefined,
    contactPerson: selectedRole === 'provider' && contactPerson ? contactPerson.trim() : undefined,
    companyDescription:
      selectedRole === 'provider' && companyDescription ? companyDescription.trim() : undefined,
  })

  let registrationMeta = { requiresApproval: false, approvalMessage: null, issueToken: true }

  if (selectedRole === 'provider') {
    const requestedTypes = normalizeProviderTypes(
      providerTypes?.length ? providerTypes : providerType ? [providerType] : ['Transport'],
    )
    registrationMeta = applyProviderServiceSelection(user, requestedTypes, { isRegistration: true })
    await user.save()
  }

  const signupEmail = String(email).trim().toLowerCase()
  const welcomeDelivery = await deliverWelcomeEmail(signupEmail, user, {
    pendingApproval: registrationMeta.requiresApproval,
  })

  res.status(201).json({
    success: true,
    requiresApproval: registrationMeta.requiresApproval,
    message: registrationMeta.approvalMessage,
    ...welcomeDelivery,
    ...(registrationMeta.issueToken
      ? buildAuthResponse(user)
      : { user: user.toJSON() }),
  })
})

const bootstrapAdmin = asyncHandler(async (req, res) => {
  const env = loadEnv()
  const { email, password, name, bootstrapKey } = req.body

  if (env.adminBootstrapKey && bootstrapKey !== env.adminBootstrapKey) {
    throw new HttpError('Invalid admin bootstrap key', 403)
  }

  if (env.isProduction && !env.adminBootstrapKey) {
    throw new HttpError('ADMIN_BOOTSTRAP_KEY is required in production', 500)
  }

  const adminCount = await User.countDocuments({ role: 'admin' })
  if (adminCount > 0) {
    throw new HttpError('Admin bootstrap is already complete', 409)
  }

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new HttpError('An account with this email already exists', 409)
  }

  const user = await User.create({
    email,
    name: (name || 'Flunexia Admin').trim(),
    passwordHash: password,
    role: 'admin',
    status: 'active',
  })

  res.status(201).json({
    success: true,
    ...buildAuthResponse(user),
  })
})

const login = asyncHandler(async (req, res) => {
  const { email, password, accountType, role } = req.body
  const selectedRole = (accountType || role || '').toLowerCase()

  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError('Invalid email or password', 401)
  }

  if (user.status !== 'active') {
    if (user.status === 'pending' && user.role === 'provider') {
      throw new HttpError(
        'Your supplier account is pending platform administrator approval.',
        403,
      )
    }
    throw new HttpError('This account is not active', 403)
  }

  if (selectedRole && selectedRole !== user.role) {
    throw new HttpError('This account is registered with a different role', 403)
  }

  res.json({
    success: true,
    ...buildAuthResponse(user),
  })
})

const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON(),
  })
})

function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out',
  })
}

const forgotPassword = asyncHandler(async (req, res) => {
  const env = loadEnv()
  const user = await User.findOne({ email: req.body.email })

  const payload = {
    success: true,
    message:
      'If an account exists for this email, password reset instructions have been sent.',
  }

  if (user && user.status === 'active') {
    const token = createResetToken()
    await PasswordReset.deleteMany({ user: user._id, usedAt: null })
    await PasswordReset.create({
      user: user._id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    })

    if (!env.isProduction) {
      payload.resetToken = token
      payload.expiresIn = '1h'
      payload.note = 'resetToken is only returned in non-production environments (no email service yet)'
    }
  }

  res.json(payload)
})

const resetPassword = asyncHandler(async (req, res) => {
  const record = await PasswordReset.findOne({
    tokenHash: hashResetToken(req.body.token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })

  if (!record) {
    throw new HttpError('Invalid or expired reset token', 400)
  }

  const user = await User.findById(record.user)
  if (!user || user.status !== 'active') {
    throw new HttpError('Invalid or expired reset token', 400)
  }

  user.passwordHash = req.body.newPassword
  await user.save()

  record.usedAt = new Date()
  await record.save()
  await PasswordReset.deleteMany({ user: user._id })

  res.json({
    success: true,
    message: 'Password has been reset. You can log in with your new password.',
  })
})

const resendWelcome = asyncHandler(async (req, res) => {
  const signupEmail = String(req.body.email).trim().toLowerCase()
  const user = await User.findOne({ email: signupEmail })

  if (!user) {
    res.json({
      success: true,
      message: 'If an account exists for this email, a welcome email has been sent.',
      welcomeEmailSent: false,
    })
    return
  }

  const pendingApproval = user.status === 'pending' && user.role === 'provider'
  const welcomeDelivery = await deliverWelcomeEmail(signupEmail, user, { pendingApproval })

  res.json({
    success: true,
    message: welcomeDelivery.welcomeEmailSent
      ? `Welcome email sent to ${signupEmail}.`
      : 'Welcome email could not be sent. Try again later or contact support.',
    ...welcomeDelivery,
  })
})

module.exports = {
  bootstrapAdmin,
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  resendWelcome,
  resetPassword,
}
