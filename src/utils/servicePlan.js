const API_TO_UI_NEED = {
  Transport: 'Transport',
  Hotel: 'Accommodation',
  Restaurant: 'Food & Catering',
  Activity: 'Guide & Tour',
  'Other Service': 'Equipment',
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

function findServiceNeedInStep(step, apiNeedType) {
  if (!step?.needs?.length) return null
  const uiType = API_TO_UI_NEED[apiNeedType] || apiNeedType
  return (
    step.needs.find((item) => item.needType === uiType || item.needType === apiNeedType) || null
  )
}

function formatServicePlanSchedule(step) {
  const parts = []
  if (step.serviceDate) parts.push(`Date: ${step.serviceDate}`)
  if (step.timeFrom || step.timeTo) {
    parts.push(`Time: ${step.timeFrom || '—'} to ${step.timeTo || '—'}`)
  }
  return parts.join(' · ')
}

function formatNeedLines(need, apiNeedType) {
  if (!need) return []
  const lines = []
  if (need.pickup || need.destination) {
    lines.push(`Transfer: ${[need.pickup, need.destination].filter(Boolean).join(' → ')}`)
  }
  if (need.venueName) {
    const label = apiNeedType === 'Restaurant' ? 'Restaurant' : 'Hotel'
    lines.push(`${label}: ${need.venueName}`)
  }
  if (need.details) {
    lines.push(`Equipment: ${need.details}`)
  }
  return lines
}

function formatServiceNeedMessage(servicePlan, apiNeedType) {
  const steps = getServicePlanSteps(servicePlan)
  if (!steps.length) return ''

  const blocks = []
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const need = findServiceNeedInStep(step, apiNeedType)
    if (!need && !step.serviceDate) continue

    const lines = []
    const schedule = formatServicePlanSchedule(step)
    if (schedule) lines.push(schedule)
    lines.push(...formatNeedLines(need, apiNeedType))

    if (lines.length) {
      blocks.push(steps.length > 1 ? `Step ${index + 1}\n${lines.join('\n')}` : lines.join('\n'))
    }
  }

  return blocks.join('\n\n')
}

module.exports = { formatServiceNeedMessage, getServicePlanSteps }
