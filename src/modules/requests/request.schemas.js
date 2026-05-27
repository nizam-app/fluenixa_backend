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

const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
})

const listRequestsQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  needType: z.enum(NEED_TYPES).optional(),
  trip: objectId.optional(),
})

const requestIdParamsSchema = z.object({ id: objectId })
const requestNestedParamsSchema = z.object({ requestId: objectId })

module.exports = {
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamsSchema,
  requestNestedParamsSchema,
  updateRequestStatusSchema,
}
