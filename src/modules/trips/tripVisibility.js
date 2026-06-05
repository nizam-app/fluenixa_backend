const { HttpError } = require('../../utils/httpError')

function assertOrganizerOwnsTrip(user, trip) {
  if (user.role !== 'organizer') return
  if (String(trip.organizer._id || trip.organizer) !== String(user._id)) {
    throw new HttpError('You can only manage your own trips', 403)
  }
}

function assertCanViewTrip(user, trip) {
  if (!trip) throw new HttpError('Trip not found', 404)

  if (user.role === 'provider' && !['published', 'scheduled', 'in_progress'].includes(trip.status)) {
    throw new HttpError('Trip not found', 404)
  }

  assertOrganizerOwnsTrip(user, trip)
}

module.exports = { assertCanViewTrip, assertOrganizerOwnsTrip }
