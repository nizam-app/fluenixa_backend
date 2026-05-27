const { z } = require('zod')
const mongoose = require('mongoose')
const { CONTACT_ROLES, CONTACT_STATUSES } = require('./contact.model')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const createContactMessageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Email must be valid'),
  role: z.enum(CONTACT_ROLES).optional(),
  message: z.string().trim().min(5, 'Message is too short').max(3000),
})

const updateContactStatusSchema = z.object({
  status: z.enum(CONTACT_STATUSES),
})

const listContactMessagesQuerySchema = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  q: z.string().trim().min(1).optional(),
})

const contactIdParamsSchema = z.object({ id: objectId })

module.exports = {
  contactIdParamsSchema,
  createContactMessageSchema,
  listContactMessagesQuerySchema,
  updateContactStatusSchema,
}
