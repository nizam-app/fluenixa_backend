const { z } = require('zod')
const mongoose = require('mongoose')
const { OFFER_STATUSES } = require('./offer.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const createOfferSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(3000),
  price: z.coerce.number().nonnegative('Price must be 0 or greater'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase()
    .optional(),
})

const updateOfferStatusSchema = z.object({
  status: z.enum(OFFER_STATUSES),
})

const listOffersQuerySchema = z.object({
  status: z.enum(OFFER_STATUSES).optional(),
  request: objectId.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const offerIdParamsSchema = z.object({ id: objectId })

module.exports = {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdParamsSchema,
  updateOfferStatusSchema,
}
