const { z } = require('zod')
const mongoose = require('mongoose')
const { NEED_TYPES, TRIP_STATUSES } = require('./trip.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const isoDate = z.coerce.date({ error: 'Must be a valid date' })

const itineraryStopSchema = z.object({
  label: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(240).optional(),
  type: z.string().trim().max(80).optional(),
})

const baseTripFields = {
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().trim().min(1, 'Description is required').max(3000),
  location: z.string().trim().min(1, 'Location is required').max(180),
  startDate: isoDate,
  endDate: isoDate.optional(),
  participants: z.coerce.number().int().min(1).max(100000),
  needTypes: z.array(z.enum(NEED_TYPES)).optional().default([]),
  status: z.enum(TRIP_STATUSES).optional(),
  image: z.string().trim().max(2048).optional(),
  accessibility: z.string().trim().max(120).optional(),
  itinerary: z.array(itineraryStopSchema).optional(),
}

const createTripSchema = z
  .object(baseTripFields)
  .refine(
    (value) => !value.endDate || !value.startDate || value.endDate >= value.startDate,
    { path: ['endDate'], message: 'endDate cannot be before startDate' },
  )

const updateTripSchema = z
  .object({
    title: baseTripFields.title.optional(),
    description: baseTripFields.description.optional(),
    location: baseTripFields.location.optional(),
    startDate: baseTripFields.startDate.optional(),
    endDate: baseTripFields.endDate,
    participants: baseTripFields.participants.optional(),
    needTypes: baseTripFields.needTypes,
    status: baseTripFields.status,
    image: baseTripFields.image,
    accessibility: baseTripFields.accessibility,
    itinerary: baseTripFields.itinerary,
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) => value[key] !== undefined),
    { message: 'At least one field must be provided' },
  )
  .refine(
    (value) => !value.endDate || !value.startDate || value.endDate >= value.startDate,
    { path: ['endDate'], message: 'endDate cannot be before startDate' },
  )

const listTripsQuerySchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
  needType: z.enum(NEED_TYPES).optional(),
  q: z.string().trim().min(1).optional(),
})

const tripIdParamsSchema = z.object({ id: objectId })

module.exports = {
  createTripSchema,
  listTripsQuerySchema,
  tripIdParamsSchema,
  updateTripSchema,
}
