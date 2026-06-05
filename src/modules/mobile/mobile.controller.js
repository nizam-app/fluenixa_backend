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

    const [trips, requests, offers, pendingRequests, acceptedRequests, tripCount, newOffers] =
      await Promise.all([
        Trip.find({ organizer: userId }).sort({ updatedAt: -1 }).limit(5),
        ServiceRequest.find({ organizer: userId })
          .populate('trip', 'title location startDate status')
          .sort({ updatedAt: -1 })
          .limit(5),
        Offer.find({ request: { $in: requestIds } })
          .populate('provider', 'name email providerType')
          .populate({
            path: 'request',
            populate: { path: 'trip', select: 'title location startDate status' },
          })
          .sort({ createdAt: -1 })
          .limit(5),
        ServiceRequest.countDocuments({ organizer: userId, status: 'pending' }),
        ServiceRequest.countDocuments({ organizer: userId, status: 'accepted' }),
        Trip.countDocuments({ organizer: userId }),
        Offer.countDocuments({ request: { $in: requestIds }, status: 'submitted' }),
      ])

    res.json({
      success: true,
      role,
      unreadCount,
      stats: {
        trips: tripCount,
        pendingRequests,
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

    const [availableRequests, myOffers, submittedOffers] = await Promise.all([
      ServiceRequest.find(requestFilter)
        .populate('trip', 'title location startDate participants status needTypes')
        .populate('organizer', 'name organizationType')
        .sort({ createdAt: -1 })
        .limit(8),
      Offer.find({ provider: userId }).sort({ updatedAt: -1 }).limit(5),
      Offer.countDocuments({ provider: userId, status: 'submitted' }),
    ])

    res.json({
      success: true,
      role,
      unreadCount,
      stats: {
        availableRequests: await ServiceRequest.countDocuments(requestFilter),
        submittedOffers,
        acceptedOffers: await Offer.countDocuments({ provider: userId, status: 'accepted' }),
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
