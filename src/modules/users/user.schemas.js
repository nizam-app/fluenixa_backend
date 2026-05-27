const { z } = require('zod')

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120).optional(),
    organizationType: z.string().trim().max(120).nullable().optional(),
    providerType: z.string().trim().max(120).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.organizationType !== undefined ||
      value.providerType !== undefined,
    { message: 'At least one field must be provided' },
  )

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(200),
})

module.exports = { updatePasswordSchema, updateProfileSchema }
