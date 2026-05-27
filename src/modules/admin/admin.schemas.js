const { z } = require('zod')
const mongoose = require('mongoose')
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
  status: z.enum(USER_STATUSES).optional(),
})

const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
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
  updateUserStatusSchema,
  userIdParamsSchema,
}
