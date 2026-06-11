const { z } = require('zod')
const mongoose = require('mongoose')
const { NEED_TYPES, TRIP_STATUSES, BOOKING_MODES } = require('./trip.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const isoDate = z.coerce.date({ error: 'Must be a valid date' })

const legacyItineraryStopSchema = z.object({
  label: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(240).optional(),
  type: z.string().trim().max(80).optional(),
})

const transferLegSchema = z
  .object({
    type: z.literal('transfer'),
    date: z.string().trim().max(32).optional(),
    time: z.string().trim().max(16).optional(),
    pickup: z.string().trim().max(180).optional(),
    destination: z.string().trim().max(180).optional(),
  })
  .refine(
    (value) => Boolean(value.pickup?.length || value.destination?.length),
    { message: 'Transfer leg requires pickup and/or destination' },
  )

const stayLegSchema = z.object({
  type: z.literal('stay'),
  location: z.string().trim().min(1).max(180),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  detail: z.string().trim().max(240).optional(),
})

const itineraryStopSchema = z.union([
  transferLegSchema,
  stayLegSchema,
  legacyItineraryStopSchema,
])

const serviceNeedDetailSchema = z.object({
  needType: z.string().trim().min(1).max(80),
  pickup: z.string().trim().max(180).optional(),
  destination: z.string().trim().max(180).optional(),
  venueName: z.string().trim().max(200).optional(),
  details: z.string().trim().max(500).optional(),
})

const servicePlanStepSchema = z.object({
  serviceDate: z.string().trim().max(32).optional(),
  timeFrom: z.string().trim().max(16).optional(),
  timeTo: z.string().trim().max(16).optional(),
  needs: z.array(serviceNeedDetailSchema).optional().default([]),
})

const servicePlanSchema = z
  .object({
    serviceDate: z.string().trim().max(32).optional(),
    timeFrom: z.string().trim().max(16).optional(),
    timeTo: z.string().trim().max(16).optional(),
    needs: z.array(serviceNeedDetailSchema).optional().default([]),
    steps: z.array(servicePlanStepSchema).optional().default([]),
  })
  .optional()

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
  budgetEstimate: z.coerce.number().min(0).max(100_000_000).optional(),
  budgetCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, 'Currency must be a 3-letter ISO code')
    .optional()
    .default('EUR'),
  bookingMode: z.enum(BOOKING_MODES).optional().default('multi_provider'),
  category: z.string().trim().max(80).optional(),
  joinedCount: z.coerce.number().int().min(0).max(100_000).optional().default(0),
  entryFee: z.coerce.number().min(0).max(100_000_000).optional(),
  entryFeeCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, 'Currency must be a 3-letter ISO code')
    .optional()
    .default('EUR'),
  tripNote: z.string().trim().max(240).optional(),
  itinerary: z.array(itineraryStopSchema).optional(),
  servicePlan: servicePlanSchema,
  openRequests: z.coerce.boolean().optional().default(false),
}

const capacityRefine = (value) =>
  value.joinedCount === undefined ||
  value.participants === undefined ||
  value.joinedCount <= value.participants

const createTripSchema = z
  .object(baseTripFields)
  .refine(
    (value) => !value.endDate || !value.startDate || value.endDate >= value.startDate,
    { path: ['endDate'], message: 'endDate cannot be before startDate' },
  )
  .refine(capacityRefine, {
    path: ['joinedCount'],
    message: 'joinedCount cannot exceed participants',
  })

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
    budgetEstimate: baseTripFields.budgetEstimate,
    budgetCurrency: baseTripFields.budgetCurrency,
    bookingMode: baseTripFields.bookingMode,
    category: baseTripFields.category,
    joinedCount: baseTripFields.joinedCount,
    entryFee: baseTripFields.entryFee,
    entryFeeCurrency: baseTripFields.entryFeeCurrency,
    tripNote: baseTripFields.tripNote,
    itinerary: baseTripFields.itinerary,
    servicePlan: baseTripFields.servicePlan,
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
  .refine(capacityRefine, {
    path: ['joinedCount'],
    message: 'joinedCount cannot exceed participants',
  })

const listTripsQuerySchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
  needType: z.enum(NEED_TYPES).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const tripIdParamsSchema = z.object({ id: objectId })

module.exports = {
  createTripSchema,
  listTripsQuerySchema,
  tripIdParamsSchema,
  updateTripSchema,
}
