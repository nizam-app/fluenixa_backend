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
  try {
    const { user } = await http('POST', '/admin/users', {
      body: { ...payload, password: payload.password || DEMO_PASSWORD, status: 'active' },
      token: adminToken,
    })
    console.log(`  + created user ${payload.email} (${payload.role})`)
    return user
  } catch (error) {
    if (error.status !== 409) throw error
    const { users } = await http('GET', `/admin/users?q=${encodeURIComponent(payload.email)}`, {
      token: adminToken,
    })
    const existing = users.find((u) => u.email === payload.email.toLowerCase())
    console.log(`  · user ${payload.email} already exists`)
    return existing
  }
}

const ORGANIZERS = [
  { email: 'organizer@flunexia.org', name: 'Demo Organizer', role: 'organizer', organizationType: 'Municipality' },
  { email: 'marie@stjudes.school', name: 'Marie Laurent', role: 'organizer', organizationType: 'School' },
  { email: 'contact@goldenage.org', name: 'Antoine Bernard', role: 'organizer', organizationType: 'Association' },
  { email: 'sophie@greenvalley.edu', name: 'Sophie Martin', role: 'organizer', organizationType: 'School' },
  { email: 'lucas@metro.gov', name: 'Lucas Garcia', role: 'organizer', organizationType: 'Local Institution' },
]

const PROVIDERS = [
  { email: 'supplier@flunexia.org', name: 'Demo Provider', role: 'provider', providerType: 'Transport' },
  { email: 'sales@greenbus.fr', name: 'GreenBus', role: 'provider', providerType: 'Transport' },
  { email: 'orders@citycatering.fr', name: 'City Catering Co.', role: 'provider', providerType: 'Restaurant' },
  { email: 'hello@ecotransit.fr', name: 'EcoTransit', role: 'provider', providerType: 'Activity' },
  { email: 'contact@metrofacilities.fr', name: 'Metro Facilities', role: 'provider', providerType: 'Other Service' },
]

const TRIPS = [
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
  if (existing) {
    console.log(`  · trip already exists: ${def.title}`)
    return existing
  }

  const payload = { ...def }
  delete payload.organizerEmail

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

  const { request } = await http('POST', '/requests', { body, token: orgToken })
  console.log(`    + created request ${def.tripTitle}/${def.needType}`)
  return request
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
      body: { description: def.description, price: def.price, currency: def.currency || 'EUR' },
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
          body: { status: 'rejected' },
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
