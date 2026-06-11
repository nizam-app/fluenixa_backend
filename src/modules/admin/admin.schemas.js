const { z } = require('zod')
const mongoose = require('mongoose')
const { DOCUMENT_STATUSES } = require('../../constants/providerDocuments')
const { PROVIDER_SERVICE_TYPES } = require('../../constants/providerTypes')
const { USER_ROLES, USER_STATUSES } = require('../auth/user.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(200),
  role: z.enum(USER_ROLES),
  organizationType: z.string().trim().max(120).optional(),
  providerType: z.string().trim().max(120).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  companyDescription: z.string().trim().max(2000).optional(),
  status: z.enum(USER_STATUSES).optional(),
})

const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
})

const billingAddressSchema = z
  .object({
    line1: z.string().trim().max(200).nullable().optional(),
    line2: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    postalCode: z.string().trim().max(20).nullable().optional(),
    country: z.string().trim().max(80).nullable().optional(),
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

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    reviewCount: z.coerce.number().int().min(0).optional(),
    providerType: z.enum(PROVIDER_SERVICE_TYPES).nullable().optional(),
    providerTypes: z.array(z.enum(PROVIDER_SERVICE_TYPES)).optional(),
    organizationType: z.string().trim().max(120).nullable().optional(),
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
    (value) => Object.keys(value).some((key) => value[key] !== undefined),
    { message: 'At least one field must be provided' },
  )

const updateUserDocumentSchema = z.object({
  status: z.enum(DOCUMENT_STATUSES),
})

const userDocumentParamsSchema = z.object({
  id: objectId,
  documentId: objectId,
})

const listUsersQuerySchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  q: z.string().trim().min(1).optional(),
})

const listTripsQuerySchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().min(1).optional(),
})

const listRequestsQuerySchema = z.object({
  status: z.string().trim().optional(),
  needType: z.string().trim().optional(),
  trip: objectId.optional(),
})

const listOffersQuerySchema = z.object({
  status: z.string().trim().optional(),
  request: objectId.optional(),
  provider: objectId.optional(),
})

const userIdParamsSchema = z.object({ id: objectId })

module.exports = {
  createUserSchema,
  listOffersQuerySchema,
  listRequestsQuerySchema,
  listTripsQuerySchema,
  listUsersQuerySchema,
  updateUserDocumentSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userDocumentParamsSchema,
  userIdParamsSchema,
}
