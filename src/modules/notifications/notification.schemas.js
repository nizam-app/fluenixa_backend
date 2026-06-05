const { z } = require('zod')
const mongoose = require('mongoose')

const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), { message: 'Invalid id' })

const listNotificationsQuerySchema = z.object({
  read: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const notificationIdParamsSchema = z.object({ id: objectId })

module.exports = {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
}
