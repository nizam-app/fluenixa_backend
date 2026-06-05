#!/usr/bin/env node
/**
 * Generates Postman collection + environments under backend/postman/
 * Run: node scripts/generate-postman.js
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.resolve(__dirname, '..', 'postman')

const TEST_OK = [
  "pm.test('Status is successful', () => pm.response.to.be.success);",
  "const json = pm.response.json();",
  "pm.test('success is true', () => pm.expect(json.success).to.eql(true));",
].join('\n')

function req(name, method, urlPath, opts = {}) {
  const {
    description = '',
    body,
    formMode,
    formFields = [],
    query = [],
    auth = null,
    tests = [],
    disabled = false,
    headers = [],
  } = opts

  const [pathOnly, queryString] = urlPath.split('?')
  const queryFromPath = queryString
    ? queryString.split('&').map((pair) => {
        const idx = pair.indexOf('=')
        const k = pair.slice(0, idx)
        const v = pair.slice(idx + 1)
        return { key: k, value: decodeURIComponent(v) }
      })
    : []

  const allQuery = [...queryFromPath, ...query]
  const pathSegments = pathOnly.replace(/^\//, '').split('/')
  const rawPath = pathOnly + (allQuery.length ? `?${allQuery.map((q) => `${q.key}=${q.value}`).join('&')}` : '')

  const item = {
    name,
    request: {
      method,
      header: [
        { key: 'Accept', value: 'application/json' },
        ...headers,
      ],
      url: {
        raw: `{{baseUrl}}${rawPath}`,
        host: ['{{baseUrl}}'],
        path: pathSegments,
        ...(allQuery.length ? { query: allQuery } : {}),
      },
      description,
    },
    response: [],
  }

  if (auth) {
    item.request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${auth}}}`, type: 'string' }],
    }
  }

  if (formMode === 'formdata' && formFields.length) {
    item.request.body = {
      mode: 'formdata',
      formdata: formFields.map((field) => ({
        key: field.key,
        value: field.value ?? '',
        type: field.type || 'text',
        ...(field.type === 'file' ? { src: field.src || [] } : {}),
      })),
    }
  } else if (body !== undefined) {
    item.request.header.push({ key: 'Content-Type', value: 'application/json' })
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    }
  }

  if (disabled) item.disabled = true

  const exec = [...tests.filter(Boolean)]
  if (exec.length) {
    item.event = [{ listen: 'test', script: { type: 'text/javascript', exec } }]
  }

  return item
}

function folder(name, description, items, authVar = null) {
  const f = { name, description, item: items }
  if (authVar) {
    f.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${authVar}}}`, type: 'string' }],
    }
  }
  return f
}

/** Stitch / mobile screen folder — e.g. `01 · Dashboard` */
function screen(order, stitchName, description, items) {
  return folder(`${String(order).padStart(2, '0')} · ${stitchName}`, description, items)
}

function account(name, description, screens, authVar) {
  return folder(name, description, screens, authVar)
}

const collection = {
  info: {
    _postman_id: 'flunexia-api-collection',
    name: 'Flunexia API',
    description:
      'Flunexia API — **role → account → screen** (matches Stitch mobile nav).\n\n**Import:** `postman/Flunexia-API.local.postman_environment.json`\n\n**Run order:**\n1. `npm run dev` + `npm run seed`\n2. **00 — Setup** (sets tokens + IDs)\n3. Pick a role folder → run one account → run screens top to bottom\n\n| Role | Account | Password |\n|------|---------|----------|\n| Organizer | marie@stjudes.school / marc.dupont@flunexia.app | demo123 |\n| Provider | sales@greenbus.fr | demo123 |\n| Admin | admin@flunexia.org | demo123 |',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          "if (!pm.collectionVariables.get('runId')) {",
          "  pm.collectionVariables.set('runId', String(Date.now()));",
          '}',
        ],
      },
    },
  ],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000/api/v1' },
    { key: 'demoPassword', value: 'demo123' },
    { key: 'adminBootstrapKey', value: '' },
    { key: 'adminEmail', value: 'admin@flunexia.org' },
    { key: 'organizerEmail', value: 'marie@stjudes.school' },
    { key: 'marcOrganizerEmail', value: 'marc.dupont@flunexia.app' },
    { key: 'marcOrganizerToken', value: '' },
    { key: 'marcTripId', value: '' },
    { key: 'marcRequestId', value: '' },
    { key: 'marcOfferId', value: '' },
    { key: 'providerEmail', value: 'sales@greenbus.fr' },
    { key: 'adminToken', value: '' },
    { key: 'organizerToken', value: '' },
    { key: 'providerToken', value: '' },
    { key: 'adminUserId', value: '' },
    { key: 'organizerUserId', value: '' },
    { key: 'providerUserId', value: '' },
    { key: 'tripId', value: '' },
    { key: 'requestId', value: '' },
    { key: 'offerId', value: '' },
    { key: 'providerOfferId', value: '' },
    { key: 'rejectedOfferId', value: '' },
    { key: 'providerRejectedEmail', value: 'orders@citycatering.fr' },
    { key: 'contactMessageId', value: '' },
    { key: 'e2eTripId', value: '' },
    { key: 'e2eRequestId', value: '' },
    { key: 'e2eOfferId', value: '' },
    { key: 'e2eUserId', value: '' },
    { key: 'runId', value: '' },
    { key: 'resetToken', value: '' },
    { key: 'notificationId', value: '' },
    { key: 'providerRejectedToken', value: '' },
    { key: 'luxuryProviderToken', value: '' },
  ],
  item: [
    folder(
      '00 — Setup (run first)',
      'Health check, logins, and resolve IDs from seeded Museum Day Trip data.',
      [
        req('Health', 'GET', '/health', {
          description: 'No auth. Confirms API is up.',
          tests: [TEST_OK],
        }),
        req('Login — Admin', 'POST', '/auth/login', {
          description: 'admin@flunexia.org / demo123 (after seed)',
          body: {
            email: '{{adminEmail}}',
            password: '{{demoPassword}}',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('adminToken', j.token);",
            "pm.collectionVariables.set('adminUserId', j.user._id);",
          ],
        }),
        req('Login — Organizer (Marie)', 'POST', '/auth/login', {
          body: {
            email: '{{organizerEmail}}',
            password: '{{demoPassword}}',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('organizerToken', j.token);",
            "pm.collectionVariables.set('organizerUserId', j.user._id);",
          ],
        }),
        req('Login — Provider (GreenBus)', 'POST', '/auth/login', {
          body: {
            email: '{{providerEmail}}',
            password: '{{demoPassword}}',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('providerToken', j.token);",
            "pm.collectionVariables.set('providerUserId', j.user._id);",
          ],
        }),
        req('Resolve tripId — Museum Day Trip', 'GET', '/trips', {
          auth: 'organizerToken',
          query: [{ key: 'q', value: 'Museum' }],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "const trip = (j.trips || []).find((t) => t.title === 'Museum Day Trip');",
            "pm.test('Museum Day Trip exists (run npm run seed)', () => { pm.expect(trip).to.be.an('object'); });",
            "if (trip) pm.collectionVariables.set('tripId', trip._id);",
          ],
        }),
        req('Resolve requestId — Transport (pending)', 'GET', '/requests', {
          auth: 'organizerToken',
          query: [
            { key: 'trip', value: '{{tripId}}' },
            { key: 'needType', value: 'Transport' },
            { key: 'status', value: 'pending' },
          ],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            'const r = (j.requests || [])[0];',
            "pm.test('Pending Transport request exists', () => { pm.expect(r).to.be.an('object'); });",
            "if (r) pm.collectionVariables.set('requestId', r._id);",
          ],
        }),
        req('Resolve offerId — first submitted offer', 'GET', '/requests/{{requestId}}/offers', {
          auth: 'organizerToken',
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "const o = (j.offers || []).find((x) => x.status === 'submitted') || (j.offers || [])[0];",
            "pm.test('At least one offer exists', () => { pm.expect(o).to.be.an('object'); });",
            "if (o) pm.collectionVariables.set('offerId', o._id);",
          ],
        }),
        req('Resolve providerOfferId — my submitted offer', 'GET', '/offers', {
          auth: 'providerToken',
          query: [{ key: 'status', value: 'submitted' }],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            'const o = (j.offers || [])[0];',
            "if (o) pm.collectionVariables.set('providerOfferId', o._id);",
          ],
        }),
        req('Login — Provider (rejected sample)', 'POST', '/auth/login', {
          description: 'orders@citycatering.fr has a rejected offer on Fine Dining (after seed).',
          body: {
            email: '{{providerRejectedEmail}}',
            password: '{{demoPassword}}',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('providerRejectedToken', j.token);",
          ],
        }),
        req('Resolve rejectedOfferId', 'GET', '/offers', {
          auth: 'providerRejectedToken',
          query: [{ key: 'status', value: 'rejected' }],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            'const o = (j.offers || [])[0];',
            "if (o) pm.collectionVariables.set('rejectedOfferId', o._id);",
          ],
        }),
        req('Login — Organizer (Marc)', 'POST', '/auth/login', {
          description: 'marc.dupont@flunexia.app — Stitch mobile organizer demo.',
          body: {
            email: '{{marcOrganizerEmail}}',
            password: '{{demoPassword}}',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('marcOrganizerToken', j.token);",
          ],
        }),
        req('Resolve marcTripId — Alpine Expedition', 'GET', '/trips', {
          auth: 'marcOrganizerToken',
          query: [{ key: 'q', value: 'Alpine' }],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "const trip = (j.trips || []).find((t) => t.title === 'Alpine Expedition 2024');",
            "if (trip) pm.collectionVariables.set('marcTripId', trip._id);",
          ],
        }),
        req('Resolve marcRequestId — Activity', 'GET', '/requests', {
          auth: 'marcOrganizerToken',
          query: [
            { key: 'trip', value: '{{marcTripId}}' },
            { key: 'needType', value: 'Activity' },
          ],
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            'const r = (j.requests || [])[0];',
            "if (r) pm.collectionVariables.set('marcRequestId', r._id);",
          ],
        }),
        req('Resolve marcOfferId — first offer on Activity', 'GET', '/requests/{{marcRequestId}}/offers', {
          auth: 'marcOrganizerToken',
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            'const o = (j.offers || [])[0];',
            "if (o) pm.collectionVariables.set('marcOfferId', o._id);",
          ],
        }),
      ],
    ),
    folder('01 — Public & Auth', 'Unauthenticated — welcome, sign up, password reset, contact.', [
      screen(1, 'Welcome & Config', 'Flunexia Welcome / splash — app config on launch.', [
        req('GET /mobile/config', 'GET', '/mobile/config', {
          tests: [TEST_OK],
          headers: [{ key: 'X-Client-Platform', value: 'ios' }],
        }),
        req('GET /mobile/help', 'GET', '/mobile/help', { tests: [TEST_OK] }),
      ]),
      screen(2, 'Sign Up', 'Account type selection + register.', [
        req('POST /auth/register — organizer', 'POST', '/auth/register', {
          body: {
            email: 'postman.organizer.{{runId}}@flunexia.test',
            password: '{{demoPassword}}',
            name: 'Postman Organizer',
            accountType: 'organizer',
            organizationType: 'School',
          },
          tests: [TEST_OK],
        }),
        req('POST /auth/register — provider', 'POST', '/auth/register', {
          body: {
            email: 'postman.provider.{{runId}}@flunexia.test',
            password: '{{demoPassword}}',
            name: 'Postman Provider',
            accountType: 'provider',
            providerType: 'Transport',
            contactPerson: 'Alex Morgan',
            companyDescription: 'Regional transport provider registered via Postman.',
          },
          tests: [TEST_OK],
        }),
      ]),
      screen(3, 'Forgot / Reset Password', 'Welcome Back → Forgot password flow.', [
        req('POST /auth/forgot-password', 'POST', '/auth/forgot-password', {
          body: { email: '{{organizerEmail}}' },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "if (j.resetToken) pm.collectionVariables.set('resetToken', j.resetToken);",
          ],
        }),
        req('POST /auth/reset-password', 'POST', '/auth/reset-password', {
          body: { token: '{{resetToken}}', newPassword: '{{demoPassword}}' },
          tests: [TEST_OK],
        }),
      ]),
      screen(4, 'Contact (web)', 'Public contact form.', [
        req('POST /contact', 'POST', '/contact', {
          body: {
            name: 'Postman Tester',
            email: 'postman.contact.{{runId}}@example.com',
            role: 'organizer',
            message: 'Testing contact API from Postman.',
          },
          tests: [TEST_OK],
        }),
      ]),
    ]),
    folder('02 — Organizer', 'Organizer app — pick an account, then run screens 01→09 in order.', [
      account(
        'Marie — marie@stjudes.school',
        'School organizer — Museum Day Trip seed. Token: {{organizerToken}}',
        [
          screen(0, 'Welcome Back (login)', 'Session start.', [
            req('POST /auth/login', 'POST', '/auth/login', {
              body: { email: '{{organizerEmail}}', password: '{{demoPassword}}' },
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.collectionVariables.set('organizerToken', j.token);",
              ],
            }),
            req('GET /auth/me', 'GET', '/auth/me', { auth: 'organizerToken', tests: [TEST_OK] }),
          ]),
          screen(1, 'Dashboard', 'Organizer Dashboard — stats, recent trips, offers.', [
            req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
              auth: 'organizerToken',
              tests: [TEST_OK],
              headers: [{ key: 'X-Client-Platform', value: 'ios' }],
            }),
          ]),
          screen(2, 'My Trips', 'My Trips list — bottom nav Trips.', [
            req('GET /trips (paginated)', 'GET', '/trips', {
              auth: 'organizerToken',
              query: [
                { key: 'page', value: '1' },
                { key: 'limit', value: '20' },
              ],
              tests: [TEST_OK],
            }),
            req('GET /trips (all)', 'GET', '/trips', { auth: 'organizerToken', tests: [TEST_OK] }),
          ]),
          screen(3, 'Create Trip', 'Create a Trip — JSON or multipart.', [
            req('POST /trips (JSON)', 'POST', '/trips', {
              auth: 'organizerToken',
              body: {
                title: 'Postman Trip {{runId}}',
                description: 'Test trip from Postman organizer flow.',
                location: 'Lyon, France',
                startDate: '2026-12-01',
                participants: 20,
                needTypes: ['Transport', 'Restaurant'],
                status: 'published',
                budgetEstimate: 2500,
                budgetCurrency: 'EUR',
              },
              tests: [TEST_OK],
            }),
            req('POST /trips (multipart + image)', 'POST', '/trips', {
              auth: 'organizerToken',
              description: 'form-data + file `image`. Requires Cloudinary.',
              formMode: 'formdata',
              formFields: [
                { key: 'title', value: 'Postman Trip Image {{runId}}' },
                { key: 'description', value: 'Trip with cover image in one request.' },
                { key: 'location', value: 'Lyon, France' },
                { key: 'startDate', value: '2026-12-15' },
                { key: 'participants', value: '24' },
                { key: 'needTypes', value: '["Transport"]' },
                { key: 'status', value: 'published' },
                { key: 'budgetEstimate', value: '2500' },
                { key: 'budgetCurrency', value: 'EUR' },
                { key: 'image', type: 'file' },
              ],
              tests: [TEST_OK],
              disabled: true,
            }),
          ]),
          screen(4, 'Trip Details', 'Single trip — cover, itinerary, requests on trip.', [
            req('GET /trips/:id', 'GET', '/trips/{{tripId}}', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
            req('GET /requests?trip=', 'GET', '/requests', {
              auth: 'organizerToken',
              query: [{ key: 'trip', value: '{{tripId}}' }],
              tests: [TEST_OK],
            }),
            req('PATCH /trips/:id', 'PATCH', '/trips/{{tripId}}', {
              auth: 'organizerToken',
              body: { accessibility: 'High' },
              tests: [TEST_OK],
            }),
            req('POST /trips/:id/duplicate', 'POST', '/trips/{{tripId}}/duplicate', {
              auth: 'organizerToken',
              tests: [TEST_OK],
              disabled: true,
            }),
          ]),
          screen(5, 'Trip Details & Proposals', 'Offers on a service request.', [
            req('GET /requests/:id', 'GET', '/requests/{{requestId}}', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
            req('GET /requests/:id/offers', 'GET', '/requests/{{requestId}}/offers', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
            req('GET /trips/:id/recommended-providers', 'GET', '/trips/{{tripId}}/recommended-providers', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
            req('PATCH /offers/:id — accept', 'PATCH', '/offers/{{offerId}}/status', {
              auth: 'organizerToken',
              body: { status: 'accepted' },
              tests: [TEST_OK],
            }),
            req('PATCH /offers/:id — reject + feedback', 'PATCH', '/offers/{{offerId}}/status', {
              auth: 'organizerToken',
              description: 'Disabled — would reject live seed offer. Enable to test rejectionReason.',
              body: {
                status: 'rejected',
                rejectionReason: 'Dates do not align with our school calendar.',
              },
              tests: [TEST_OK],
              disabled: true,
            }),
            req('GET /offers/:id', 'GET', '/offers/{{offerId}}', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
          ]),
          screen(6, 'Requests / Bookings', 'All service requests — filter tabs.', [
            req('GET /requests', 'GET', '/requests', { auth: 'organizerToken', tests: [TEST_OK] }),
            req('GET /requests?status=pending', 'GET', '/requests', {
              auth: 'organizerToken',
              query: [{ key: 'status', value: 'pending' }],
              tests: [TEST_OK],
            }),
            req('POST /requests — new on trip', 'POST', '/requests', {
              auth: 'organizerToken',
              body: {
                trip: '{{tripId}}',
                needType: 'Restaurant',
                message: 'Catering for 24 participants.',
              },
              tests: [TEST_OK],
            }),
          ]),
          screen(7, 'Profile', 'Organizer Profile — name, email, org type.', [
            req('GET /users/me', 'GET', '/users/me', { auth: 'organizerToken', tests: [TEST_OK] }),
            req('PATCH /users/me', 'PATCH', '/users/me', {
              auth: 'organizerToken',
              body: { name: 'Marie Laurent', organizationType: 'School' },
              tests: [TEST_OK],
            }),
          ]),
          screen(8, 'Notifications', 'Bell icon — inbox.', [
            req('GET /notifications', 'GET', '/notifications', {
              auth: 'organizerToken',
              query: [
                { key: 'read', value: 'false' },
                { key: 'page', value: '1' },
                { key: 'limit', value: '20' },
              ],
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                'const n = (j.notifications || [])[0];',
                "if (n) pm.collectionVariables.set('notificationId', n._id);",
              ],
            }),
            req('PATCH /notifications/:id/read', 'PATCH', '/notifications/{{notificationId}}/read', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
            req('PATCH /notifications/read-all', 'PATCH', '/notifications/read-all', {
              auth: 'organizerToken',
              tests: [TEST_OK],
            }),
          ]),
          screen(9, 'Device (push)', 'FCM/APNs token registration.', [
            req('POST /devices/register', 'POST', '/devices/register', {
              auth: 'organizerToken',
              body: {
                token: 'fcm-organizer-{{runId}}',
                platform: 'ios',
                appVersion: '1.0.0',
              },
              tests: [TEST_OK],
            }),
          ]),
        ],
        'organizerToken',
      ),
      account(
        'Marc — marc.dupont@flunexia.app',
        'Stitch mobile organizer — Alpine / Amalfi trips. Token: {{marcOrganizerToken}}',
        [
          screen(0, 'Welcome Back (login)', 'Session start.', [
            req('POST /auth/login', 'POST', '/auth/login', {
              body: { email: '{{marcOrganizerEmail}}', password: '{{demoPassword}}' },
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.collectionVariables.set('marcOrganizerToken', j.token);",
              ],
            }),
            req('GET /auth/me', 'GET', '/auth/me', { auth: 'marcOrganizerToken', tests: [TEST_OK] }),
          ]),
          screen(1, 'Dashboard', 'Organizer Dashboard — Marc trips & offers.', [
            req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
              auth: 'marcOrganizerToken',
              tests: [TEST_OK],
              headers: [{ key: 'X-Client-Platform', value: 'ios' }],
            }),
          ]),
          screen(2, 'My Trips', 'My Trips — Amalfi, Alpine, Mountain Trail, etc.', [
            req('GET /trips', 'GET', '/trips', {
              auth: 'marcOrganizerToken',
              query: [
                { key: 'page', value: '1' },
                { key: 'limit', value: '20' },
              ],
              tests: [TEST_OK],
            }),
          ]),
          screen(3, 'Create Trip', 'Create a Trip.', [
            req('POST /trips (JSON)', 'POST', '/trips', {
              auth: 'marcOrganizerToken',
              body: {
                title: 'Marc Postman Trip {{runId}}',
                description: 'Stitch-style coastal outing from Postman.',
                location: 'Amalfi Coast, Italy',
                startDate: '2026-09-01',
                endDate: '2026-09-04',
                participants: 12,
                needTypes: ['Transport', 'Restaurant', 'Activity'],
                status: 'published',
                budgetEstimate: 3200,
                budgetCurrency: 'EUR',
                bookingMode: 'multi_provider',
                category: 'Coastal Tour',
              },
              tests: [TEST_OK],
            }),
          ]),
          screen(4, 'Trip Details', 'Alpine Expedition 2024 detail.', [
            req('GET /trips/:id', 'GET', '/trips/{{marcTripId}}', {
              auth: 'marcOrganizerToken',
              tests: [TEST_OK],
            }),
            req('GET /requests?trip=', 'GET', '/requests', {
              auth: 'marcOrganizerToken',
              query: [{ key: 'trip', value: '{{marcTripId}}' }],
              tests: [TEST_OK],
            }),
          ]),
          screen(5, 'Trip Details & Proposals', 'Compare provider offers on Activity request.', [
            req('GET /requests/:id', 'GET', '/requests/{{marcRequestId}}', {
              auth: 'marcOrganizerToken',
              tests: [TEST_OK],
            }),
            req('GET /requests/:id/offers', 'GET', '/requests/{{marcRequestId}}/offers', {
              auth: 'marcOrganizerToken',
              tests: [TEST_OK],
            }),
            req('GET /trips/:id/recommended-providers', 'GET', '/trips/{{marcTripId}}/recommended-providers', {
              auth: 'marcOrganizerToken',
              tests: [TEST_OK],
            }),
            req('PATCH /offers/:id — accept', 'PATCH', '/offers/{{marcOfferId}}/status', {
              auth: 'marcOrganizerToken',
              description: 'Disabled — may already be accepted/rejected in seed.',
              body: { status: 'accepted' },
              tests: [TEST_OK],
              disabled: true,
            }),
          ]),
          screen(6, 'Requests / Bookings', 'All Marc requests.', [
            req('GET /requests', 'GET', '/requests', { auth: 'marcOrganizerToken', tests: [TEST_OK] }),
            req('GET /requests?status=accepted', 'GET', '/requests', {
              auth: 'marcOrganizerToken',
              query: [{ key: 'status', value: 'accepted' }],
              tests: [TEST_OK],
            }),
          ]),
          screen(7, 'Profile', 'Organizer profile.', [
            req('GET /users/me', 'GET', '/users/me', { auth: 'marcOrganizerToken', tests: [TEST_OK] }),
            req('PATCH /users/me', 'PATCH', '/users/me', {
              auth: 'marcOrganizerToken',
              body: { name: 'Marc Dupont', organizationType: 'Municipality' },
              tests: [TEST_OK],
            }),
          ]),
          screen(8, 'Notifications', 'Bell inbox.', [
            req('GET /notifications', 'GET', '/notifications', {
              auth: 'marcOrganizerToken',
              query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
              tests: [TEST_OK],
            }),
          ]),
          screen(9, 'Device (push)', 'Push token.', [
            req('POST /devices/register', 'POST', '/devices/register', {
              auth: 'marcOrganizerToken',
              body: {
                token: 'fcm-marc-{{runId}}',
                platform: 'ios',
                appVersion: '1.0.0',
              },
              tests: [TEST_OK],
            }),
          ]),
        ],
        'marcOrganizerToken',
      ),
    ]),
    folder('03 — Provider', 'Supplier app — GreenBus account, screens 00→09 in order.', [
      account(
        'GreenBus — sales@greenbus.fr',
        'Transport provider — Museum Day Trip bid. Token: {{providerToken}}',
        [
          screen(0, 'Welcome Back (login)', 'Session start.', [
            req('POST /auth/login', 'POST', '/auth/login', {
              body: { email: '{{providerEmail}}', password: '{{demoPassword}}' },
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.collectionVariables.set('providerToken', j.token);",
              ],
            }),
            req('GET /auth/me', 'GET', '/auth/me', { auth: 'providerToken', tests: [TEST_OK] }),
          ]),
          screen(1, 'Dashboard', 'Hello Provider — stats + recent available trips.', [
            req('GET /mobile/config', 'GET', '/mobile/config', {
              auth: 'providerToken',
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.test('messaging flag', () => pm.expect(j.config.features.messaging).to.eql(false));",
              ],
              headers: [{ key: 'X-Client-Platform', value: 'android' }],
            }),
            req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
              auth: 'providerToken',
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.test('provider stats', () => {",
                "  pm.expect(j.stats).to.have.keys('availableRequests','pendingResponses','acceptedOffers','completedBookings','rejectedOffers');",
                '});',
              ],
              headers: [{ key: 'X-Client-Platform', value: 'android' }],
            }),
          ]),
          screen(2, 'Available Trips', 'Recent Available Trips — See All / marketplace browse.', [
            req('GET /trips (paginated)', 'GET', '/trips', {
              auth: 'providerToken',
              query: [
                { key: 'page', value: '1' },
                { key: 'limit', value: '20' },
              ],
              tests: [TEST_OK],
            }),
            req('GET /requests — open needs', 'GET', '/requests', {
              auth: 'providerToken',
              description: 'Explore Marketplace — open service requests.',
              tests: [TEST_OK],
            }),
            req('GET /trips/:id', 'GET', '/trips/{{tripId}}', {
              auth: 'providerToken',
              description: 'Review Details — Museum Day Trip from seed.',
              tests: [TEST_OK],
            }),
          ]),
          screen(3, 'Active Request Detail', 'Sunset Alpine / single request — organizer, dates, requirements.', [
            req('GET /requests/:id', 'GET', '/requests/{{requestId}}', {
              auth: 'providerToken',
              description: 'needType, message (requirements), trip description, organizer avatar.',
              tests: [TEST_OK],
            }),
            req('GET /trips/:id', 'GET', '/trips/{{tripId}}', {
              auth: 'providerToken',
              tests: [TEST_OK],
            }),
          ]),
          screen(4, 'Submit Proposal', 'Submit Proposal button — create / update / withdraw offer.', [
            req('POST /requests/:id/offers', 'POST', '/requests/{{e2eRequestId}}/offers', {
              auth: 'providerToken',
              description: 'Run 99 — E2E first for a fresh request id.',
              body: {
                description: '40-seat coach, driver included.',
                price: 410,
                currency: 'EUR',
              },
              tests: [TEST_OK],
              disabled: true,
            }),
            req('PATCH /offers/:id — Update response', 'PATCH', '/offers/{{providerOfferId}}', {
              auth: 'providerToken',
              body: {
                description: 'Updated proposal — 50-seat coach, driver and fuel included.',
                price: 445,
                currency: 'EUR',
              },
              tests: [TEST_OK],
            }),
            req('PATCH /offers/:id/status — Withdraw', 'PATCH', '/offers/{{providerOfferId}}/status', {
              auth: 'providerToken',
              description: 'Disabled — would withdraw live seed bid.',
              body: { status: 'withdrawn' },
              tests: [TEST_OK],
              disabled: true,
            }),
          ]),
          screen(5, 'Requests / Responses', 'Tabs: All · Pending · Accepted · Completed · Rejected.', [
            req('GET /offers — All', 'GET', '/offers', { auth: 'providerToken', tests: [TEST_OK] }),
            req('GET /offers — Pending', 'GET', '/offers', {
              auth: 'providerToken',
              query: [{ key: 'status', value: 'submitted' }],
              tests: [TEST_OK],
            }),
            req('GET /offers — Accepted', 'GET', '/offers', {
              auth: 'providerToken',
              query: [{ key: 'status', value: 'accepted' }],
              tests: [TEST_OK],
            }),
            req('GET /offers — Completed', 'GET', '/offers', {
              auth: 'providerToken',
              query: [
                { key: 'status', value: 'accepted' },
                { key: 'requestStatus', value: 'completed' },
              ],
              tests: [TEST_OK],
            }),
            req('GET /offers — Rejected', 'GET', '/offers', {
              auth: 'providerToken',
              query: [{ key: 'status', value: 'rejected' }],
              tests: [TEST_OK],
            }),
            req('GET /offers/:id — View Details', 'GET', '/offers/{{providerOfferId}}', {
              auth: 'providerToken',
              tests: [TEST_OK],
            }),
            req('GET /requests/:id/offers — my bids', 'GET', '/requests/{{requestId}}/offers', {
              auth: 'providerToken',
              tests: [TEST_OK],
            }),
          ]),
          screen(6, 'View Feedback (rejected)', 'Rejected card — rejectionReason.', [
            req('POST /auth/login — City Catering', 'POST', '/auth/login', {
              description: 'orders@citycatering.fr has rejected offer after seed.',
              body: {
                email: '{{providerRejectedEmail}}',
                password: '{{demoPassword}}',
              },
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.collectionVariables.set('providerRejectedToken', j.token);",
              ],
            }),
            req('GET /offers/:id — rejection feedback', 'GET', '/offers/{{rejectedOfferId}}', {
              auth: 'providerRejectedToken',
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.test('rejectionReason present', () => pm.expect(j.offer.rejectionReason).to.be.a('string');",
              ],
            }),
          ]),
          screen(7, 'Mark Complete', 'Accepted card — Mark Completed.', [
            req('PATCH /requests/:id/status — completed', 'PATCH', '/requests/{{e2eRequestId}}/status', {
              auth: 'providerToken',
              description: 'Run 99 — E2E workflow first.',
              body: { status: 'completed' },
              tests: [TEST_OK],
              disabled: true,
            }),
          ]),
          screen(8, 'Profile', 'Lumina-style — company, contact person, provider type.', [
            req('GET /users/me', 'GET', '/users/me', {
              auth: 'providerToken',
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.expect(j.user).to.have.property('providerType');",
              ],
            }),
            req('PATCH /users/me', 'PATCH', '/users/me', {
              auth: 'providerToken',
              body: {
                name: 'GreenBus',
                contactPerson: 'Claire Dubois',
                providerType: 'Transport',
                companyDescription:
                  'Eco-certified coach fleet with drivers across Île-de-France. Updated via Postman.',
              },
              tests: [TEST_OK],
            }),
            req('POST /users/me/avatar — multipart', 'POST', '/users/me/avatar', {
              auth: 'providerToken',
              description: 'form-data field `image`. Requires Cloudinary.',
              disabled: true,
            }),
          ]),
          screen(9, 'Notifications', 'Bell icon.', [
            req('GET /notifications', 'GET', '/notifications', {
              auth: 'providerToken',
              query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
              tests: [TEST_OK],
            }),
          ]),
          screen(10, 'Device (push)', 'FCM token.', [
            req('POST /devices/register', 'POST', '/devices/register', {
              auth: 'providerToken',
              body: {
                token: 'fcm-provider-{{runId}}',
                platform: 'android',
                appVersion: '1.0.0',
              },
              tests: [TEST_OK],
            }),
          ]),
        ],
        'providerToken',
      ),
      account(
        'Lumina — luxury.linens@flunexia.app',
        'Hotel/restaurant provider — profile demo. No separate token in Setup; login here.',
        [
          screen(8, 'Profile', 'Company description + contact person (Stitch Profile screen).', [
            req('POST /auth/login', 'POST', '/auth/login', {
              body: { email: 'luxury.linens@flunexia.app', password: '{{demoPassword}}' },
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.collectionVariables.set('luxuryProviderToken', j.token);",
              ],
            }),
            req('GET /users/me', 'GET', '/users/me', {
              auth: 'luxuryProviderToken',
              tests: [
                TEST_OK,
                'const j = pm.response.json();',
                "pm.expect(j.user.companyDescription).to.be.a('string');",
              ],
            }),
            req('PATCH /users/me', 'PATCH', '/users/me', {
              auth: 'luxuryProviderToken',
              body: {
                contactPerson: 'Alexander Sterling',
                providerType: 'Hotel',
                companyDescription:
                  'Premium boutique accommodation provider specializing in sustainable luxury experiences.',
              },
              tests: [TEST_OK],
            }),
          ]),
        ],
      ),
    ]),
    folder('04 — Admin', 'Admin panel — admin@flunexia.org. Screens 00→06.', [
      account('admin@flunexia.org', 'Platform admin. Token: {{adminToken}}', [
        screen(0, 'Welcome Back (login)', 'Session start.', [
          req('POST /auth/login', 'POST', '/auth/login', {
            body: { email: '{{adminEmail}}', password: '{{demoPassword}}' },
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              "pm.collectionVariables.set('adminToken', j.token);",
            ],
          }),
          req('GET /auth/me', 'GET', '/auth/me', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        screen(1, 'Dashboard', 'Platform stats overview.', [
          req('GET /admin/stats', 'GET', '/admin/stats', { auth: 'adminToken', tests: [TEST_OK] }),
          req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
            auth: 'adminToken',
            tests: [TEST_OK],
          }),
        ]),
        screen(2, 'Users', 'User management — organizers & providers.', [
          req('GET /admin/users', 'GET', '/admin/users', { auth: 'adminToken', tests: [TEST_OK] }),
          req('GET /admin/users?q=marie', 'GET', '/admin/users', {
            auth: 'adminToken',
            query: [{ key: 'q', value: 'marie' }],
            tests: [TEST_OK],
          }),
          req('POST /admin/users', 'POST', '/admin/users', {
            auth: 'adminToken',
            body: {
              name: 'Postman Test User',
              email: 'postman.admin.{{runId}}@flunexia.test',
              password: '{{demoPassword}}',
              role: 'organizer',
              organizationType: 'Municipality',
              status: 'active',
            },
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              "if (j.user) pm.collectionVariables.set('e2eUserId', j.user._id);",
            ],
          }),
          req('PATCH /admin/users/:id/status', 'PATCH', '/admin/users/{{e2eUserId}}/status', {
            auth: 'adminToken',
            body: { status: 'suspended' },
            tests: [TEST_OK],
          }),
        ]),
        screen(3, 'Trips', 'All trips.', [
          req('GET /admin/trips', 'GET', '/admin/trips', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        screen(4, 'Requests', 'All service requests.', [
          req('GET /admin/requests', 'GET', '/admin/requests', {
            auth: 'adminToken',
            tests: [TEST_OK],
          }),
        ]),
        screen(5, 'Offers', 'All provider offers.', [
          req('GET /admin/offers', 'GET', '/admin/offers', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        screen(6, 'Contact inbox', 'Public contact form messages.', [
          req('GET /contact', 'GET', '/contact', {
            auth: 'adminToken',
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              'const m = (j.messages || [])[0];',
              "if (m) pm.collectionVariables.set('contactMessageId', m._id);",
            ],
          }),
          req('PATCH /contact/:id/status', 'PATCH', '/contact/{{contactMessageId}}/status', {
            auth: 'adminToken',
            body: { status: 'in_review' },
            tests: [TEST_OK],
          }),
        ]),
      ], 'adminToken'),
    ]),
    folder(
      '99 — E2E workflow (writes)',
      'Creates a fresh trip → request → offer → accept → complete → cleanup. Safe to re-run.',
      [
        req('Create trip', 'POST', '/trips', {
          auth: 'organizerToken',
          body: {
            title: 'Postman E2E {{runId}}',
            description:
              'Automated Postman test trip with transport and catering needs for API validation.',
            location: 'Lyon, France',
            startDate: '2026-11-15',
            endDate: '2026-11-15',
            participants: 20,
            needTypes: ['Transport', 'Restaurant'],
            status: 'published',
            accessibility: 'Medium',
            itinerary: [
              { label: 'Pickup', detail: 'Main entrance', type: 'pickup' },
              { label: 'Venue', detail: 'Conference hall', type: 'destination' },
            ],
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('e2eTripId', j.trip._id);",
          ],
        }),
        req('Create request — Transport', 'POST', '/requests', {
          auth: 'organizerToken',
          body: {
            trip: '{{e2eTripId}}',
            needType: 'Transport',
            message: 'Need a 40-seat coach with driver for 20 participants.',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('e2eRequestId', j.request._id);",
          ],
        }),
        req('Submit offer — GreenBus', 'POST', '/requests/{{e2eRequestId}}/offers', {
          auth: 'providerToken',
          body: {
            description: '40-seat air-conditioned coach, driver and fuel included.',
            price: 420,
            currency: 'EUR',
          },
          tests: [
            TEST_OK,
            'const j = pm.response.json();',
            "pm.collectionVariables.set('e2eOfferId', j.offer._id);",
          ],
        }),
        req('Accept offer (organizer)', 'PATCH', '/offers/{{e2eOfferId}}/status', {
          auth: 'organizerToken',
          body: { status: 'accepted' },
          tests: [TEST_OK],
        }),
        req('Reject offer with feedback (organizer)', 'PATCH', '/offers/{{e2eOfferId}}/status', {
          auth: 'organizerToken',
          description: 'Disabled — alternate path instead of accept. Enable to test rejectionReason.',
          body: {
            status: 'rejected',
            rejectionReason:
              'Proposal declined due to scheduling conflict. Check feedback for more details.',
          },
          tests: [TEST_OK],
          disabled: true,
        }),
        req('Complete request (provider)', 'PATCH', '/requests/{{e2eRequestId}}/status', {
          auth: 'providerToken',
          body: { status: 'completed' },
          tests: [TEST_OK],
        }),
        req('Delete E2E trip (cleanup)', 'DELETE', '/trips/{{e2eTripId}}', {
          auth: 'organizerToken',
          tests: [TEST_OK],
        }),
      ],
      'organizerToken',
    ),
    folder(
      '98 — Optional (manual)',
      'Enable or run individually. Image upload needs Cloudinary + a file in Body → form-data.',
      [
        req('POST /trips/:id/image — multipart', 'POST', '/trips/{{tripId}}/image', {
          auth: 'organizerToken',
          description:
            'Body: form-data, key `image` (File). Requires Cloudinary env on server. Disabled in runner by default.',
          disabled: true,
        }),
        req('POST /auth/logout', 'POST', '/auth/logout', {
          auth: 'organizerToken',
          tests: [TEST_OK],
          disabled: true,
        }),
        req('PATCH /users/me/password', 'PATCH', '/users/me/password', {
          auth: 'organizerToken',
          body: {
            currentPassword: '{{demoPassword}}',
            newPassword: '{{demoPassword}}',
          },
          description: 'Disabled in runner — example only; keeps same password when run manually.',
          disabled: true,
        }),
      ],
    ),
  ],
}

function env(name, baseUrl, extra = []) {
  return {
    id: `flunexia-${name}`,
    name: `Flunexia API (${name})`,
    values: [
      { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true },
      { key: 'demoPassword', value: 'demo123', type: 'default', enabled: true },
      { key: 'adminBootstrapKey', value: '', type: 'secret', enabled: true },
      ...extra.map(([key, value, type = 'default']) => ({
        key,
        value,
        type,
        enabled: true,
      })),
    ],
    _postman_variable_scope: 'environment',
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true })

fs.writeFileSync(
  path.join(OUT_DIR, 'Flunexia-API.postman_collection.json'),
  JSON.stringify(collection, null, 2),
)

fs.writeFileSync(
  path.join(OUT_DIR, 'Flunexia-API.local.postman_environment.json'),
  JSON.stringify(env('Local', 'http://localhost:5000/api/v1'), null, 2),
)

fs.writeFileSync(
  path.join(OUT_DIR, 'Flunexia-API.production.postman_environment.json'),
  JSON.stringify(
    env('Production', 'https://fluenixa-backend.onrender.com/api/v1'),
    null,
  ),
)

console.log('Wrote postman collection + environments to', OUT_DIR)
