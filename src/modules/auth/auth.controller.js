const { loadEnv } = require('../../config/env')
const { asyncHandler } = require('../../utils/asyncHandler')
const { HttpError } = require('../../utils/httpError')
const { signAuthToken } = require('../../utils/jwt')
const { User } = require('./user.model')

function buildAuthResponse(user) {
  return {
    token: signAuthToken(user),
    user: user.toJSON(),
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
    providerType: selectedRole === 'provider' ? providerType : undefined,
  })

  res.status(201).json({
    success: true,
    ...buildAuthResponse(user),
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

module.exports = { bootstrapAdmin, getMe, login, logout, register }
