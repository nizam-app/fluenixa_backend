const { z } = require('zod')

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email must be valid')
  .max(180)

const billingAddressSchema = z
  .object({
    line1: z.string().trim().max(200).optional(),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().max(120).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(80).optional(),
  })
  .optional()

const billingSchema = z
  .object({
    chorusProReady: z.boolean().optional(),
    chorusServiceCode: z.string().trim().max(100).nullable().optional(),
    legalEntityId: z.string().trim().max(100).nullable().optional(),
    paymentTerms: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .optional()

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120).optional(),
    email: emailField.optional(),
    organizationType: z.string().trim().max(120).nullable().optional(),
    providerType: z.string().trim().max(120).nullable().optional(),
    contactPerson: z.string().trim().max(120).nullable().optional(),
    companyDescription: z.string().trim().max(2000).nullable().optional(),
    companyName: z.string().trim().max(200).nullable().optional(),
    siret: z.string().trim().max(14).nullable().optional(),
    iban: z.string().trim().max(34).nullable().optional(),
    bic: z.string().trim().max(11).nullable().optional(),
    billingAddress: billingAddressSchema,
    billing: billingSchema,
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.organizationType !== undefined ||
      value.providerType !== undefined ||
      value.contactPerson !== undefined ||
      value.companyDescription !== undefined ||
      value.companyName !== undefined ||
      value.siret !== undefined ||
      value.iban !== undefined ||
      value.bic !== undefined ||
      value.billingAddress !== undefined ||
      value.billing !== undefined,
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
