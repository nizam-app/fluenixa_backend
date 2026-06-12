const UI_TO_API_NEED = {
  Transportation: 'Transport',
  Accommodation: 'Hotel',
  Restaurants: 'Restaurant',
  'Guided Tours': 'Activity',
  'Activities & Leisure': 'Activity',
  Tickets: 'Other Service',
  'Shuttles & Transfers': 'Transport',
  'Educational Activities': 'Activity',
  Events: 'Other Service',
  Other: 'Other Service',
  Transport: 'Transport',
  'Food & Catering': 'Restaurant',
  'Guide & Tour': 'Activity',
  Equipment: 'Other Service',
}

const LEGACY_NEED_TYPE_KEYS = {
  Transport: 'Transportation',
  'Food & Catering': 'Restaurants',
  'Guide & Tour': 'Guided Tours',
  Equipment: 'Other',
}

const SERVICE_LABELS = {
  Transportation: 'Transportation',
  Accommodation: 'Accommodation',
  Restaurants: 'Restaurants',
  'Guided Tours': 'Guided Tours',
  'Activities & Leisure': 'Activities & Leisure',
  Tickets: 'Tickets',
  'Shuttles & Transfers': 'Shuttles & Transfers',
  'Educational Activities': 'Educational Activities',
  Events: 'Events',
  Other: 'Other',
}

function normalizeNeedTypeKey(needType) {
  if (!needType) return needType
  return LEGACY_NEED_TYPE_KEYS[needType] || needType
}

function getServicePlanSteps(servicePlan) {
  if (!servicePlan) return []
  if (servicePlan.steps?.length) return servicePlan.steps
  if (servicePlan.needs?.length) {
    return [
      {
        serviceDate: servicePlan.serviceDate,
        timeFrom: servicePlan.timeFrom,
        timeTo: servicePlan.timeTo,
        needs: servicePlan.needs,
      },
    ]
  }
  return []
}

function findServiceNeedsInStep(step, apiNeedType) {
  if (!step?.needs?.length) return []
  return step.needs.filter((item) => {
    const key = normalizeNeedTypeKey(item.needType)
    const mapped = UI_TO_API_NEED[key] || UI_TO_API_NEED[item.needType] || item.needType
    return mapped === apiNeedType || item.needType === apiNeedType
  })
}

function formatServicePlanSchedule(step) {
  const parts = []
  if (step.serviceDate) parts.push(`Date: ${step.serviceDate}`)
  if (step.timeFrom || step.timeTo) {
    parts.push(`Time: ${step.timeFrom || '—'} to ${step.timeTo || '—'}`)
  }
  return parts.join(' · ')
}

function formatNeedLines(need) {
  if (!need) return []
  const key = normalizeNeedTypeKey(need.needType)
  const label = SERVICE_LABELS[key] || need.needType
  const lines = []
  if (need.pickup || need.destination) {
    lines.push(`${label}: ${[need.pickup, need.destination].filter(Boolean).join(' → ')}`)
  }
  if (need.venueName) {
    lines.push(`${label}: ${need.venueName}`)
  }
  if (need.details) {
    lines.push(`${label}: ${need.details}`)
  }
  return lines
}

function formatServiceNeedMessage(servicePlan, apiNeedType) {
  const steps = getServicePlanSteps(servicePlan)
  if (!steps.length) return ''

  const blocks = []
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const needs = findServiceNeedsInStep(step, apiNeedType)
    if (!needs.length && !step.serviceDate) continue

    const lines = []
    const schedule = formatServicePlanSchedule(step)
    if (schedule) lines.push(schedule)
    for (const need of needs) {
      lines.push(...formatNeedLines(need))
    }

    if (lines.length) {
      blocks.push(steps.length > 1 ? `Step ${index + 1}\n${lines.join('\n')}` : lines.join('\n'))
    }
  }

  return blocks.join('\n\n')
}

module.exports = { formatServiceNeedMessage, getServicePlanSteps }
