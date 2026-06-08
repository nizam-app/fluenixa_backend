const { z } = require('zod')

const destinationImageQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query is required').max(200),
})

module.exports = { destinationImageQuerySchema }
