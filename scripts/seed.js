#!/usr/bin/env node
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const API_URL = (process.env.SEED_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')
const ADMIN_BOOTSTRAP_KEY = process.env.ADMIN_BOOTSTRAP_KEY || ''
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'demo123'

function safeJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function http(method, pathname, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const json = text ? safeJSON(text) : null

  if (!res.ok) {
    const error = new Error(
      `${method} ${pathname} → ${res.status} ${json?.message || text || res.statusText}`,
    )
    error.status = res.status
    error.body = json
    throw error
  }

  return json
}

async function login(email, password) {
  const r = await http('POST', '/auth/login', { body: { email, password } })
  return { token: r.token, user: r.user }
}

async function ensureUser(adminToken, payload) {
  const { rating, reviewCount, contactPerson, companyDescription, ...createPayload } = payload
  try {
    const { user } = await http('POST', '/admin/users', {
      body: { ...createPayload, password: createPayload.password || DEMO_PASSWORD, status: 'active' },
      token: adminToken,
    })
    console.log(`  + created user ${payload.email} (${payload.role})`)
    const profilePatch = {
      ...(rating !== undefined ? { rating } : {}),
      ...(reviewCount !== undefined ? { reviewCount } : {}),
      ...(contactPerson !== undefined ? { contactPerson } : {}),
      ...(companyDescription !== undefined ? { companyDescription } : {}),
    }
    if (Object.keys(profilePatch).length > 0) {
      await http('PATCH', `/admin/users/${user._id}`, {
        token: adminToken,
        body: profilePatch,
      })
    }
    return user
  } catch (error) {
    if (error.status !== 409) throw error
    const { users } = await http('GET', `/admin/users?q=${encodeURIComponent(payload.email)}`, {
      token: adminToken,
    })
    const existing = users.find((u) => u.email === payload.email.toLowerCase())
    console.log(`  · user ${payload.email} already exists`)
    const profilePatch = {
      ...(rating !== undefined ? { rating } : {}),
      ...(reviewCount !== undefined ? { reviewCount } : {}),
      ...(contactPerson !== undefined ? { contactPerson } : {}),
      ...(companyDescription !== undefined ? { companyDescription } : {}),
    }
    if (existing && Object.keys(profilePatch).length > 0) {
      await http('PATCH', `/admin/users/${existing._id}`, {
        token: adminToken,
        body: profilePatch,
      })
    }
    return existing
  }
}

const ORGANIZERS = [
  {
    email: 'marc.dupont@flunexia.app',
    name: 'Marc Dupont',
    role: 'organizer',
    organizationType: 'Municipality',
  },
  { email: 'organizer@flunexia.org', name: 'Demo Organizer', role: 'organizer', organizationType: 'Municipality' },
  { email: 'marie@stjudes.school', name: 'Marie Laurent', role: 'organizer', organizationType: 'School' },
  { email: 'contact@goldenage.org', name: 'Antoine Bernard', role: 'organizer', organizationType: 'Association' },
  { email: 'sophie@greenvalley.edu', name: 'Sophie Martin', role: 'organizer', organizationType: 'School' },
  { email: 'lucas@metro.gov', name: 'Lucas Garcia', role: 'organizer', organizationType: 'Local Institution' },
]

const PROVIDERS = [
  {
    email: 'supplier@flunexia.org',
    name: 'Demo Provider',
    role: 'provider',
    providerType: 'Transport',
    contactPerson: 'Alex Morgan',
    companyDescription: 'Regional transport and coach hire for schools and community groups.',
  },
  {
    email: 'sales@greenbus.fr',
    name: 'GreenBus',
    role: 'provider',
    providerType: 'Transport',
    contactPerson: 'Claire Dubois',
    companyDescription: 'Eco-certified coach fleet with drivers across Île-de-France.',
  },
  {
    email: 'orders@citycatering.fr',
    name: 'City Catering Co.',
    role: 'provider',
    providerType: 'Restaurant',
    contactPerson: 'Jean-Pierre Martin',
    companyDescription: 'Group catering and on-site service for events, schools, and seniors.',
  },
  {
    email: 'hello@ecotransit.fr',
    name: 'EcoTransit',
    role: 'provider',
    providerType: 'Activity',
    contactPerson: 'Nina Keller',
    companyDescription: 'Outdoor education programs and sustainable group transport.',
  },
  {
    email: 'contact@metrofacilities.fr',
    name: 'Metro Facilities',
    role: 'provider',
    providerType: 'Other Service',
    contactPerson: 'Thomas Reed',
    companyDescription: 'Conference rooms, AV, and facility packages for corporate workshops.',
  },
  {
    email: 'luxury.linens@flunexia.app',
    name: 'Lumina Services Ltd.',
    role: 'provider',
    providerType: 'Hotel',
    contactPerson: 'Alexander Sterling',
    companyDescription:
      'Premium boutique accommodation provider specializing in sustainable luxury experiences across Western Europe.',
    rating: 4.9,
    reviewCount: 128,
  },
  {
    email: 'peak.guides@flunexia.app',
    name: 'Peak Guides Co.',
    role: 'provider',
    providerType: 'Activity',
    rating: 4.7,
    reviewCount: 84,
  },
  {
    email: 'peak.guides.int@flunexia.app',
    name: 'Peak Guides Int.',
    role: 'provider',
    providerType: 'Activity',
    rating: 4.9,
    reviewCount: 210,
  },
  {
    email: 'alpine.routes@flunexia.app',
    name: 'Alpine Routes',
    role: 'provider',
    providerType: 'Transport',
    rating: 4.6,
    reviewCount: 56,
  },
  {
    email: 'summit.solo@flunexia.app',
    name: 'Summit Solo',
    role: 'provider',
    providerType: 'Activity',
    rating: 4.5,
    reviewCount: 41,
  },
  {
    email: 'nippon.travel@flunexia.app',
    name: 'Nippon Travel Experts',
    role: 'provider',
    providerType: 'Activity',
    rating: 4.8,
    reviewCount: 92,
  },
]

/** Stitch / mobile organizer demo — login: marc.dupont@flunexia.app */
const MARC_TRIPS = [
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Weekend at Amalfi Coast',
    description:
      'Coastal tour for a group of 12 — private transfers, cliff-side dining, and a guided Amalfi walk.',
    location: 'Amalfi Coast, Italy',
    startDate: '2023-10-12',
    endDate: '2023-10-15',
    participants: 12,
    needTypes: ['Transport', 'Restaurant', 'Activity'],
    status: 'in_progress',
    image: 'https://images.unsplash.com/photo-1534113414508-0eec5c0a0f9f?w=600&q=80',
    budgetEstimate: 3200,
    budgetCurrency: 'EUR',
    bookingMode: 'multi_provider',
    category: 'Coastal Tour',
    joinedCount: 10,
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Fine Dining Experience',
    description: 'Social event with curated tasting menu and sommelier for 8 guests downtown.',
    location: 'Paris, France',
    startDate: '2023-10-15',
    participants: 8,
    needTypes: ['Restaurant'],
    status: 'published',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    budgetEstimate: 1200,
    budgetCurrency: 'EUR',
    category: 'Social Event',
    joinedCount: 6,
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Mountain Trail Hike',
    description: 'Adventure day hike with certified guide, safety briefing, and group transport.',
    location: 'Chamonix, France',
    startDate: '2023-09-30',
    participants: 10,
    needTypes: ['Activity', 'Transport'],
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
    budgetEstimate: 890,
    budgetCurrency: 'EUR',
    category: 'Adventure',
    joinedCount: 10,
    tripNote: 'Bring water',
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Alpine Expedition 2024',
    description:
      'Experience the majestic beauty of the Alps with our curated summer expedition. Guided glacier hiking, local cheese tasting in mountain huts, and premium accommodation at the base of the Matterhorn.',
    location: 'Zermatt, Switzerland',
    startDate: '2024-08-12',
    endDate: '2024-08-18',
    participants: 12,
    needTypes: ['Activity', 'Hotel', 'Transport'],
    status: 'in_progress',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    budgetEstimate: 4200,
    budgetCurrency: 'USD',
    bookingMode: 'bundled',
    itinerary: [
      { type: 'transfer', date: '2024-08-12', time: '09:00', pickup: 'Geneva Airport', destination: 'Zermatt' },
      { type: 'stay', location: 'Matterhorn Base Lodge', durationDays: 6, detail: 'Half-board included' },
    ],
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Sunset Ridge Trail',
    description: 'Half-day hiking loop — bring water and trail shoes. Entry fee applies.',
    location: 'Blue Mountains',
    startDate: '2023-10-24',
    participants: 12,
    needTypes: ['Activity'],
    status: 'scheduled',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    category: 'Hiking',
    entryFee: 15,
    entryFeeCurrency: 'USD',
    joinedCount: 8,
    tripNote: 'Bring water',
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'Weekly Supper Club',
    description: 'Social supper for 6 — appetizers potluck style, no venue fee.',
    location: 'Downtown Hub',
    startDate: '2023-10-28',
    participants: 6,
    needTypes: ['Restaurant'],
    status: 'published',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    category: 'Social',
    joinedCount: 4,
    tripNote: 'Appetizers',
  },
  {
    organizerEmail: 'marc.dupont@flunexia.app',
    title: 'UI Design Sync',
    description: 'Workshop session — bring laptop. Free internal event.',
    location: 'Studio 4B',
    startDate: '2023-10-15',
    participants: 10,
    needTypes: ['Other Service'],
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
    category: 'Workshop',
    joinedCount: 10,
    tripNote: 'Bring laptop',
  },
]

const MARC_REQUESTS = [
  {
    tripTitle: 'Weekend at Amalfi Coast',
    organizerEmail: 'marc.dupont@flunexia.app',
    needType: 'Restaurant',
    message: 'Catering for coastal tour — tasting menu for 12 guests on Oct 12.',
    offers: [
      {
        providerEmail: 'luxury.linens@flunexia.app',
        description: 'Premium coastal tasting menu with wine pairing and on-site service.',
        price: 980,
        currency: 'EUR',
      },
    ],
    finalRequestStatus: 'pending',
  },
  {
    tripTitle: 'Alpine Expedition 2024',
    organizerEmail: 'marc.dupont@flunexia.app',
    needType: 'Activity',
    message: 'Full alpine package — glacier hiking guides for 12 participants.',
    offers: [
      {
        providerEmail: 'peak.guides.int@flunexia.app',
        description: 'Mountain guide service — 6 days, glacier safety gear included.',
        price: 1250,
        currency: 'USD',
        tier: 'recommended',
      },
      {
        providerEmail: 'alpine.routes@flunexia.app',
        description: 'Full package agency — guides, transfers, and lodge coordination.',
        price: 1480,
        currency: 'USD',
      },
      {
        providerEmail: 'summit.solo@flunexia.app',
        description: 'Private coaching — 1:2 guide ratio for advanced hikers.',
        price: 950,
        currency: 'USD',
        rejectByOrganizer: true,
      },
    ],
    finalRequestStatus: 'pending',
  },
  {
    tripTitle: 'Alpine Expedition 2024',
    organizerEmail: 'marc.dupont@flunexia.app',
    needType: 'Transport',
    message: 'Swiss Alps hiking retreat transfers — airport to Zermatt.',
    offers: [
      {
        providerEmail: 'peak.guides@flunexia.app',
        description: 'Private shuttle Geneva ↔ Zermatt for 12 guests.',
        price: 620,
        currency: 'USD',
        acceptByOrganizer: true,
      },
    ],
    finalRequestStatus: 'accepted',
  },
  {
    tripTitle: 'Mountain Trail Hike',
    organizerEmail: 'marc.dupont@flunexia.app',
    needType: 'Activity',
    message: 'Guided mountain trail for 10 hikers — completed spring outing.',
    offers: [
      {
        providerEmail: 'nippon.travel@flunexia.app',
        description: 'Certified mountain guide, safety kit, and group insurance.',
        price: 720,
        currency: 'EUR',
        acceptByOrganizer: true,
      },
    ],
    finalRequestStatus: 'completed',
  },
  {
    tripTitle: 'Fine Dining Experience',
    organizerEmail: 'marc.dupont@flunexia.app',
    needType: 'Restaurant',
    message: 'Berlin-style underground art dinner tour — provider unavailable for dates.',
    offers: [
      {
        providerEmail: 'orders@citycatering.fr',
        description: 'Underground venue catering — unavailable for selected dates.',
        price: 1100,
        currency: 'EUR',
        rejectByOrganizer: true,
        rejectionReason:
          'Proposal declined due to scheduling conflict. Check feedback for more details.',
      },
    ],
    finalRequestStatus: 'rejected',
  },
]

const TRIPS = [
  ...MARC_TRIPS,
  {
    organizerEmail: 'marie@stjudes.school',
    title: 'Museum Day Trip',
    description:
      'A curated educational outing for 24 students exploring ancient civilizations, natural history exhibits, and an interactive science wing. Includes guided tours and lunch coordination.',
    location: 'Lyon, France',
    startDate: '2026-10-12',
    endDate: '2026-10-12',
    participants: 24,
    needTypes: ['Transport', 'Restaurant', 'Activity'],
    status: 'published',
    image: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=600&q=80',
    accessibility: 'High',
    budgetEstimate: 2500,
    budgetCurrency: 'EUR',
    itinerary: [
      { label: 'Pickup Point', detail: 'School Main Gate', type: 'pickup' },
      { label: 'Destination', detail: 'National History Museum', type: 'destination' },
    ],
  },
  {
    organizerEmail: 'contact@goldenage.org',
    title: 'Senior Community Lunch',
    description: 'Group transport and catering coordination for the Golden Age Club monthly gathering.',
    location: 'City Center',
    startDate: '2026-10-15',
    participants: 18,
    needTypes: ['Restaurant', 'Transport'],
    status: 'in_progress',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    accessibility: 'Medium',
  },
  {
    organizerEmail: 'sophie@greenvalley.edu',
    title: 'School Nature Visit',
    description: 'Outdoor learning experience with guided nature walks and environmental workshops.',
    location: 'Green Valley Park',
    startDate: '2026-10-20',
    participants: 32,
    needTypes: ['Activity', 'Transport'],
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
  },
  {
    organizerEmail: 'lucas@metro.gov',
    title: 'Internal Workshop',
    description: 'Team-building workshop with facility booking and lunch service.',
    location: 'HQ Building',
    startDate: '2026-10-25',
    participants: 12,
    needTypes: ['Other Service', 'Restaurant'],
    status: 'scheduled',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
  },
]

const REQUESTS = [
  ...MARC_REQUESTS,
  {
    tripTitle: 'Museum Day Trip',
    organizerEmail: 'marie@stjudes.school',
    needType: 'Transport',
    message: 'Looking for a 50-seater coach with driver and AC for 24 students.',
    providerEmail: null,
    offers: [
      {
        providerEmail: 'sales@greenbus.fr',
        description: 'Air-conditioned 50-seater coach, driver and fuel included.',
        price: 450,
        currency: 'EUR',
      },
      {
        providerEmail: 'hello@ecotransit.fr',
        description: 'Hybrid 30-seater minibus with eco-certified driver.',
        price: 380,
        currency: 'EUR',
      },
    ],
    finalRequestStatus: 'pending',
  },
  {
    tripTitle: 'Senior Community Lunch',
    organizerEmail: 'contact@goldenage.org',
    needType: 'Restaurant',
    message: 'Three-course menu for 18 seniors, please include two vegetarian options.',
    providerEmail: null,
    offers: [
      {
        providerEmail: 'orders@citycatering.fr',
        description: 'Three-course menu with vegetarian options, on-site service.',
        price: 850,
        currency: 'EUR',
        acceptByOrganizer: true,
      },
    ],
    finalRequestStatus: 'accepted',
  },
  {
    tripTitle: 'School Nature Visit',
    organizerEmail: 'sophie@greenvalley.edu',
    needType: 'Activity',
    message: 'Guided nature walk for 32 students with an environmental workshop.',
    providerEmail: null,
    offers: [
      {
        providerEmail: 'hello@ecotransit.fr',
        description: 'Full-day guided nature program with two instructors and pickup transport.',
        price: 720,
        currency: 'EUR',
        acceptByOrganizer: true,
      },
    ],
    finalRequestStatus: 'completed',
  },
  {
    tripTitle: 'Internal Workshop',
    organizerEmail: 'lucas@metro.gov',
    needType: 'Other Service',
    message: 'Conference room rental for 12 people plus lunch service.',
    providerEmail: null,
    offers: [
      {
        providerEmail: 'contact@metrofacilities.fr',
        description: 'Conference room rental for 12 + buffet lunch service.',
        price: 540,
        currency: 'EUR',
        rejectByOrganizer: true,
        rejectionReason: 'Facility dates unavailable for the requested workshop week.',
      },
    ],
    finalRequestStatus: 'rejected',
  },
]

const CONTACT_MESSAGES = [
  {
    name: 'Curious Municipality',
    email: 'mayor@example-town.fr',
    role: 'organizer',
    message: 'We are interested in piloting Flunexia for a spring program for seniors.',
  },
  {
    name: 'Local Coach Operator',
    email: 'fleet@regionalbus.fr',
    role: 'supplier',
    message: 'How can we get verified as a supplier for school transport requests?',
  },
]

async function bootstrapOrLoginAdmin() {
  try {
    const result = await http('POST', '/auth/bootstrap-admin', {
      body: {
        email: 'admin@flunexia.org',
        password: DEMO_PASSWORD,
        name: 'Flunexia Admin',
        bootstrapKey: ADMIN_BOOTSTRAP_KEY || undefined,
      },
    })
    console.log('Bootstrapped admin admin@flunexia.org')
    return { token: result.token, user: result.user }
  } catch (error) {
    if (error.status === 409) {
      console.log('Admin already exists — logging in')
      return login('admin@flunexia.org', DEMO_PASSWORD)
    }
    throw error
  }
}

async function ensureTrip(orgToken, def) {
  const { trips } = await http('GET', '/trips', { token: orgToken })
  const existing = trips?.find((t) => t.title === def.title)

  const payload = { ...def }
  delete payload.organizerEmail

  if (existing) {
    try {
      const { trip } = await http('PATCH', `/trips/${existing._id}`, { body: payload, token: orgToken })
      console.log(`  · trip synced: ${def.title}`)
      return trip
    } catch (error) {
      console.log(`  · trip already exists (sync skipped): ${def.title}`)
      return existing
    }
  }

  const { trip } = await http('POST', '/trips', { body: payload, token: orgToken })
  console.log(`  + created trip: ${def.title}`)
  return trip
}

async function ensureRequest(orgToken, tripId, def) {
  const { requests } = await http(
    'GET',
    `/requests?trip=${tripId}&needType=${encodeURIComponent(def.needType)}`,
    { token: orgToken },
  )
  if (requests && requests.length > 0) {
    console.log(`    · request already exists for ${def.tripTitle}/${def.needType}`)
    return requests[0]
  }

  const body = { trip: tripId, needType: def.needType, message: def.message }
  if (def.providerId) body.provider = def.providerId

  try {
    const { request } = await http('POST', '/requests', { body, token: orgToken })
    console.log(`    + created request ${def.tripTitle}/${def.needType}`)
    return request
  } catch (error) {
    if (error.status === 400 && String(error.message || '').includes('needTypes')) {
      console.log(
        `    ! skipped request ${def.tripTitle}/${def.needType} — trip needTypes mismatch (re-run seed after trip sync)`,
      )
      return null
    }
    throw error
  }
}

async function findExistingOffer(providerToken, requestId, providerEmail) {
  const { offers } = await http('GET', `/requests/${requestId}/offers`, { token: providerToken })
  return offers?.find((o) => (o.provider?.email || '').toLowerCase() === providerEmail.toLowerCase())
}

async function ensureOffer(providerToken, requestId, def) {
  const preExisting = await findExistingOffer(providerToken, requestId, def.providerEmail)
  if (preExisting) {
    console.log(`      · offer from ${def.providerEmail} already exists (${preExisting.status})`)
    return preExisting
  }

  try {
    const { offer } = await http('POST', `/requests/${requestId}/offers`, {
      body: {
        description: def.description,
        price: def.price,
        currency: def.currency || 'EUR',
        ...(def.tier ? { tier: def.tier } : {}),
      },
      token: providerToken,
    })
    console.log(`      + offer from ${def.providerEmail} (€${def.price})`)
    return offer
  } catch (error) {
    // Race or the request has since left `pending` (re-run after a previous
    // organizer action). Re-check before giving up.
    if (error.status === 400 || error.status === 409) {
      const recovered = await findExistingOffer(providerToken, requestId, def.providerEmail)
      if (recovered) {
        console.log(`      · offer from ${def.providerEmail} already exists (${recovered.status})`)
        return recovered
      }
      console.log(
        `      ! cannot submit offer from ${def.providerEmail} — ${error.body?.message || error.message}`,
      )
      return null
    }
    throw error
  }
}

async function ping() {
  try {
    const r = await http('GET', '/health')
    return r
  } catch (error) {
    const wrapped = new Error(
      `Cannot reach API at ${API_URL}. Make sure the server is running (npm run dev).`,
      { cause: error },
    )
    throw wrapped
  }
}

async function seed() {
  console.log(`Seeding via ${API_URL}\n`)
  await ping()

  console.log('Admin')
  const admin = await bootstrapOrLoginAdmin()
  const adminToken = admin.token

  console.log('\nUsers')
  for (const u of ORGANIZERS) await ensureUser(adminToken, u)
  for (const u of PROVIDERS) await ensureUser(adminToken, u)

  console.log('\nLogins')
  const auths = {}
  for (const u of [...ORGANIZERS, ...PROVIDERS]) {
    auths[u.email] = await login(u.email, DEMO_PASSWORD)
    console.log(`  · token cached for ${u.email}`)
  }

  console.log('\nTrips')
  const tripsByTitle = {}
  for (const def of TRIPS) {
    const orgToken = auths[def.organizerEmail].token
    const trip = await ensureTrip(orgToken, def)
    tripsByTitle[def.title] = trip
  }

  console.log('\nRequests + offers')
  for (const def of REQUESTS) {
    const trip = tripsByTitle[def.tripTitle]
    if (!trip) {
      console.warn(`  ! skipping request — trip not found: ${def.tripTitle}`)
      continue
    }

    const orgToken = auths[def.organizerEmail].token
    const request = await ensureRequest(orgToken, trip._id, def)
    if (!request) continue

    for (const offerDef of def.offers || []) {
      const providerAuth = auths[offerDef.providerEmail]
      if (!providerAuth) continue

      const offer = await ensureOffer(providerAuth.token, request._id, offerDef)
      if (!offer) continue

      if (offerDef.acceptByOrganizer && offer.status !== 'accepted') {
        await http('PATCH', `/offers/${offer._id}/status`, {
          body: { status: 'accepted' },
          token: orgToken,
        })
        console.log(`      ✓ organizer accepted offer ${offer._id}`)
      }

      if (offerDef.rejectByOrganizer && offer.status !== 'rejected') {
        await http('PATCH', `/offers/${offer._id}/status`, {
          body: {
            status: 'rejected',
            ...(offerDef.rejectionReason ? { rejectionReason: offerDef.rejectionReason } : {}),
          },
          token: orgToken,
        })
        console.log(`      ✗ organizer rejected offer ${offer._id}`)
      }
    }

    if (def.finalRequestStatus === 'completed') {
      // Pull the current request and only flip if it's already accepted.
      const { request: latest } = await http('GET', `/requests/${request._id}`, { token: orgToken })
      if (latest.status === 'accepted') {
        const providerToken = auths[latest.provider?.email]?.token || orgToken
        await http('PATCH', `/requests/${request._id}/status`, {
          body: { status: 'completed' },
          token: providerToken,
        })
        console.log(`    ✓ request ${def.tripTitle} marked completed`)
      }
    }

    if (def.finalRequestStatus === 'rejected') {
      const { request: latest } = await http('GET', `/requests/${request._id}`, { token: orgToken })
      if (latest.status !== 'rejected') {
        await http('PATCH', `/requests/${request._id}/status`, {
          body: { status: 'rejected' },
          token: orgToken,
        })
        console.log(`    ✗ request ${def.tripTitle} marked rejected`)
      }
    }
  }

  console.log('\nContact messages')
  for (const msg of CONTACT_MESSAGES) {
    try {
      await http('POST', '/contact', { body: msg })
      console.log(`  + contact message from ${msg.email}`)
    } catch (error) {
      if (error.status === 429) {
        console.log(`  · rate-limited, skipping ${msg.email}`)
      } else {
        throw error
      }
    }
  }

  console.log('\nDone.\n')
  console.log('Demo logins (password is the same for all):')
  console.log(`  password: ${DEMO_PASSWORD}\n`)
  for (const [label, email] of [
    ['Admin            ', 'admin@flunexia.org'],
    ['Organizer (Marc) ', 'marc.dupont@flunexia.app'],
    ['Organizer (demo) ', 'organizer@flunexia.org'],
    ['Provider (demo)  ', 'supplier@flunexia.org'],
    ['Organizer (Marie)', 'marie@stjudes.school'],
    ['Provider (GreenBus)', 'sales@greenbus.fr'],
  ]) {
    console.log(`  ${label}  ${email}`)
  }
}

seed().catch((error) => {
  console.error('\nSeed failed:', error.message)
  if (error.body) console.error(JSON.stringify(error.body, null, 2))
  process.exitCode = 1
})
