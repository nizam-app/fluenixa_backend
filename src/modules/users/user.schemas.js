const { z } = require('zod')

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email must be valid')
  .max(180)

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120).optional(),
    email: emailField.optional(),
    organizationType: z.string().trim().max(120).nullable().optional(),
    providerType: z.string().trim().max(120).nullable().optional(),
    contactPerson: z.string().trim().max(120).nullable().optional(),
    companyDescription: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.organizationType !== undefined ||
      value.providerType !== undefined ||
      value.contactPerson !== undefined ||
      value.companyDescription !== undefined,
    { message: 'At least one field must be provided' },
  )

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(200),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to delete your account'),
})

module.exports = { deleteAccountSchema, updatePasswordSchema, updateProfileSchema }
