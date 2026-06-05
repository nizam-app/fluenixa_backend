const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function parsePagination(query, { defaultLimit = DEFAULT_LIMIT } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit),
  )
  const skip = (page - 1) * limit
  const enabled = query.page !== undefined || query.limit !== undefined

  return { page, limit, skip, enabled }
}

function paginationMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  }
}

async function paginateQuery(Model, filter, { page, limit, skip, sort, populate }) {
  const query = Model.find(filter).sort(sort).skip(skip).limit(limit)
  if (populate) populate(query)

  const [items, total] = await Promise.all([query, Model.countDocuments(filter)])

  return {
    items,
    meta: paginationMeta({ page, limit, total }),
  }
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  paginateQuery,
  paginationMeta,
  parsePagination,
}
