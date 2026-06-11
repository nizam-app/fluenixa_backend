const API_TO_UI_NEED = {
  Transport: 'Transport',
  Hotel: 'Accommodation',
  Restaurant: 'Food & Catering',
  Activity: 'Guide & Tour',
  'Other Service': 'Equipment',
}

function findServiceNeed(servicePlan, apiNeedType) {
  if (!servicePlan?.needs?.length) return null
  const uiType = API_TO_UI_NEED[apiNeedType] || apiNeedType
  return (
    servicePlan.needs.find((item) => item.needType === uiType || item.needType === apiNeedType) ||
    null
  )
}

function formatServicePlanSchedule(servicePlan) {
  const parts = []
  if (servicePlan.serviceDate) parts.push(`Date: ${servicePlan.serviceDate}`)
  if (servicePlan.timeFrom || servicePlan.timeTo) {
    parts.push(`Time: ${servicePlan.timeFrom || '—'} to ${servicePlan.timeTo || '—'}`)
  }
  return parts.join(' · ')
}

function formatServiceNeedMessage(servicePlan, apiNeedType) {
  const need = findServiceNeed(servicePlan, apiNeedType)
  if (!need && !servicePlan?.serviceDate) return ''

  const lines = []
  const schedule = formatServicePlanSchedule(servicePlan)
  if (schedule) lines.push(schedule)

  if (need) {
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
  }

  return lines.join('\n')
}

module.exports = { formatServiceNeedMessage }
