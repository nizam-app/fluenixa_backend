const { z } = require('zod')
const { PROVIDER_SERVICE_TYPES } = require('../../constants/providerTypes')

const providerTypesField = z
  .array(z.enum(PROVIDER_SERVICE_TYPES))
  .min(1, 'Select at least one supplier service')
  .max(PROVIDER_SERVICE_TYPES.length)
  .optional()

const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Email must be valid')

const passwordField = z
  .string({ error: 'Password is required' })
  .min(6, 'Password must be at least 6 characters')
  .max(200, 'Password is too long')

const accountTypeField = z.enum(['organizer', 'provider'], {
  error: 'Please select Organizer or Supplier',
})

const registerSchema = z
  .object({
    email: emailField,
    password: passwordField,
    name: z.string().trim().min(1).max(120).optional(),
    accountType: accountTypeField.optional(),
    role: accountTypeField.optional(),
    organizationType: z.string().trim().max(120).optional(),
    providerType: z.enum(PROVIDER_SERVICE_TYPES).optional(),
    providerTypes: providerTypesField,
    contactPerson: z.string().trim().max(120).optional(),
    companyDescription: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Boolean(value.accountType || value.role), {
    message: 'accountType is required',
    path: ['accountType'],
  })

const loginSchema = z.object({
  email: emailField,
  password: passwordField,
  accountType: z.string().trim().toLowerCase().optional(),
  role: z.string().trim().toLowerCase().optional(),
})

const bootstrapAdminSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(1).max(120).optional(),
  bootstrapKey: z.string().trim().min(1).optional(),
})

const forgotPasswordSchema = z.object({
  email: emailField,
})

const resendWelcomeSchema = z.object({
  email: emailField,
})

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: passwordField,
})

module.exports = {
  bootstrapAdminSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendWelcomeSchema,
  resetPasswordSchema,
}
