function computeCostPerParticipant(trip) {
  const budget = trip?.budgetEstimate
  const participants = trip?.participants
  if (budget == null || !participants || participants < 1) return null
  return Math.round((budget / participants) * 100) / 100
}

function enrichTrip(trip) {
  if (!trip) return trip
  const json = typeof trip.toJSON === 'function' ? trip.toJSON() : { ...trip }
  return {
    ...json,
    costPerParticipant: computeCostPerParticipant(json),
  }
}

function enrichTrips(trips) {
  return trips.map(enrichTrip)
}

module.exports = { computeCostPerParticipant, enrichTrip, enrichTrips }
