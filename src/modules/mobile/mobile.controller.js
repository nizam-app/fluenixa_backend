const { Offer } = require('../offers/offer.model')
const { ServiceRequest } = require('../requests/serviceRequest.model')
const { Trip } = require('../trips/trip.model')
const { Notification } = require('../notifications/notification.model')
const { asyncHandler } = require('../../utils/asyncHandler')

const STITCH_PROJECT_ID = '9971131479177624563'

const MOBILE_CONFIG = {
  minAppVersion: '1.0.0',
  supportedRoles: ['organizer', 'provider', 'admin'],
  accountTypes: [
    { id: 'organizer', label: 'Organizer' },
    { id: 'provider', label: 'Supplier' },
  ],
  organizationTypes: [
    'Municipality',
    'School',
    'Association',
    'Local Institution',
    'Company',
    'Other',
  ],
  providerTypes: ['Transport', 'Restaurant', 'Activity', 'Hotel', 'Other Service'],
  features: {
    pushNotifications: true,
    cloudinaryUploads: true,
    passwordReset: true,
    offlineMode: false,
    /** Organizer↔provider chat is not available — use notifications + request.message in v1 */
    messaging: false,
  },
  needTypes: ['Transport', 'Activity', 'Restaurant', 'Hotel', 'Other Service'],
  stitchProjectId: STITCH_PROJECT_ID,
}

function getMobileConfig(req, res) {
  res.json({
    success: true,
    config: {
      ...MOBILE_CONFIG,
      apiVersion: 'v1',
      clientPlatform: req.clientPlatform,
    },
  })
}

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const role = req.user.role

  const unreadCount = await Notification.countDocuments({ user: userId, read: false })

  if (role === 'organizer') {
    const requestIds = await ServiceRequest.find({ organizer: userId }).distinct('_id')

    const [trips, requests, offers, pendingRequests, acceptedRequests, tripCount, newOffers, acceptedOffers, completedBookings] =
      await Promise.all([
        Trip.find({ organizer: userId }).sort({ updatedAt: -1 }).limit(5),
        ServiceRequest.find({ organizer: userId })
          .populate('trip', 'title location startDate status image needTypes budgetEstimate budgetCurrency')
          .sort({ updatedAt: -1 })
          .limit(5),
        Offer.find({ request: { $in: requestIds } })
          .populate('provider', 'name email providerType')
          .populate({
            path: 'request',
            populate: { path: 'trip', select: 'title location startDate status image needTypes' },
          })
          .sort({ createdAt: -1 })
          .limit(5),
        ServiceRequest.countDocuments({ organizer: userId, status: 'pending' }),
        ServiceRequest.countDocuments({ organizer: userId, status: 'accepted' }),
        Trip.countDocuments({ organizer: userId }),
        Offer.countDocuments({ request: { $in: requestIds }, status: 'submitted' }),
        Offer.countDocuments({ request: { $in: requestIds }, status: 'accepted' }),
        ServiceRequest.countDocuments({ organizer: userId, status: 'completed' }),
      ])

    res.json({
      success: true,
      role,
      unreadCount,
      stats: {
        trips: tripCount,
        pendingRequests,
        acceptedOffers,
        completedBookings,
        /** @deprecated use acceptedOffers — kept for older mobile builds */
        acceptedRequests,
        newOffers,
      },
      recent: {
        trips,
        requests,
        offers,
      },
    })
    return
  }

  if (role === 'provider') {
    const requestFilter = {
      status: { $in: ['pending', 'accepted', 'completed'] },
      $or: [{ provider: userId }, { provider: { $exists: false } }, { provider: null }],
    }

    const [
      availableRequests,
      myOffers,
      submittedOffers,
      availableCount,
      acceptedOffers,
      completedBookings,
      rejectedOffers,
    ] = await Promise.all([
      ServiceRequest.find(requestFilter)
        .populate('trip', 'title location startDate endDate participants status needTypes image')
        .populate('organizer', 'name organizationType avatar')
        .sort({ createdAt: -1 })
        .limit(8),
      Offer.find({ provider: userId }).sort({ updatedAt: -1 }).limit(5),
      Offer.countDocuments({ provider: userId, status: 'submitted' }),
      ServiceRequest.countDocuments(requestFilter),
      Offer.countDocuments({ provider: userId, status: 'accepted' }),
      ServiceRequest.countDocuments({ provider: userId, status: 'completed' }),
      Offer.countDocuments({ provider: userId, status: 'rejected' }),
    ])

    res.json({
      success: true,
      role,
      unreadCount,
      stats: {
        availableRequests: availableCount,
        submittedOffers,
        /** Alias for Stitch “Pending Responses” */
        pendingResponses: submittedOffers,
        acceptedOffers,
        completedBookings,
        rejectedOffers,
      },
      recent: {
        requests: availableRequests,
        offers: myOffers,
      },
    })
    return
  }

  // admin — lightweight mobile summary
  const [trips, requests, offers] = await Promise.all([
    Trip.find().sort({ updatedAt: -1 }).limit(5),
    ServiceRequest.find().sort({ updatedAt: -1 }).limit(5),
    Offer.find().sort({ createdAt: -1 }).limit(5),
  ])

  res.json({
    success: true,
    role,
    unreadCount,
    stats: {
      trips: await Trip.countDocuments(),
      requests: await ServiceRequest.countDocuments(),
      offers: await Offer.countDocuments(),
    },
    recent: { trips, requests, offers },
  })
})

const MOBILE_HELP = {
  supportEmail: 'support@flunexia.org',
  faq: [
    {
      question: 'How do I create a trip?',
      answer: 'Sign in as an organizer, open Create a Trip, fill in the details, and publish.',
    },
    {
      question: 'How do suppliers submit offers?',
      answer: 'Browse available trips or open a request, then submit your price and description as an offer.',
    },
    {
      question: 'Forgot your password?',
      answer: 'Use Forgot password on the login screen, then reset with the token (dev) or email link (when enabled).',
    },
  ],
}

function getMobileHelp(req, res) {
  res.json({
    success: true,
    help: MOBILE_HELP,
  })
}

module.exports = {
  getDashboard,
  getMobileConfig,
  getMobileHelp,
  MOBILE_CONFIG,
  STITCH_PROJECT_ID,
}
