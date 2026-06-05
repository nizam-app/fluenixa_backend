const { z } = require('zod')
const mongoose = require('mongoose')
const { OFFER_STATUSES, OFFER_TIERS } = require('./offer.model')

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
  tier: z.enum(OFFER_TIERS).optional(),
})

const updateOfferStatusSchema = z
  .object({
    status: z.enum(OFFER_STATUSES).optional(),
    tier: z.enum(OFFER_TIERS).optional(),
    rejectionReason: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.status !== undefined || value.tier !== undefined, {
    message: 'At least one of status or tier must be provided',
  })

const updateOfferSchema = z
  .object({
    description: z.string().trim().min(1, 'Description is required').max(3000).optional(),
    price: z.coerce.number().nonnegative('Price must be 0 or greater').optional(),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be a 3-letter ISO code')
      .toUpperCase()
      .optional(),
  })
  .refine(
    (value) =>
      value.description !== undefined ||
      value.price !== undefined ||
      value.currency !== undefined,
    { message: 'At least one of description, price, or currency must be provided' },
  )

const listOffersQuerySchema = z.object({
  status: z.enum(OFFER_STATUSES).optional(),
  request: objectId.optional(),
  requestStatus: z.enum(['pending', 'accepted', 'rejected', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const offerIdParamsSchema = z.object({ id: objectId })

module.exports = {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdParamsSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
}
