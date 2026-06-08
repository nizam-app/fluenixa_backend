const { z } = require('zod')
const mongoose = require('mongoose')
const { NEED_TYPES } = require('../trips/trip.model')
const { REQUEST_STATUSES } = require('./serviceRequest.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const createRequestSchema = z
  .object({
    trip: objectId.optional(),
    tripId: objectId.optional(),
    needType: z.enum(NEED_TYPES),
    message: z.string().trim().max(3000).optional(),
    provider: objectId.optional(),
    providerId: objectId.optional(),
  })
  .refine((value) => Boolean(value.trip || value.tripId), {
    path: ['trip'],
    message: 'Trip id is required',
  })

const updateRequestSchema = z
  .object({
    message: z.string().trim().max(3000).optional(),
    needType: z.enum(NEED_TYPES).optional(),
    provider: objectId.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

const addRequestMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message is required').max(3000),
})

const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
})

const listRequestsQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  needType: z.enum(NEED_TYPES).optional(),
  trip: objectId.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const requestIdParamsSchema = z.object({ id: objectId })
const requestNestedParamsSchema = z.object({ requestId: objectId })

module.exports = {
  addRequestMessageSchema,
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamsSchema,
  requestNestedParamsSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
}
