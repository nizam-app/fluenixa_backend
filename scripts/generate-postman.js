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

const collection = {
  info: {
    _postman_id: 'flunexia-api-collection',
    name: 'Flunexia API',
    description:
      'Flunexia API — organized **by role** (Organizer / Provider / Admin) and **by app screen** (Dashboard, My Trips, etc.).\n\n1. Import environment (Local or Production).\n2. `npm run seed` with API running.\n3. Run **00 — Setup** then pick a role folder.\n\nSee `docs/POSTMAN_ROLE_SCREEN.md` for the full screen map.',
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
    { key: 'contactMessageId', value: '' },
    { key: 'e2eTripId', value: '' },
    { key: 'e2eRequestId', value: '' },
    { key: 'e2eOfferId', value: '' },
    { key: 'e2eUserId', value: '' },
    { key: 'runId', value: '' },
    { key: 'resetToken', value: '' },
    { key: 'notificationId', value: '' },
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
      ],
    ),
    folder('Public — shared screens', 'No JWT. Mobile Welcome + web contact.', [
      req('[Welcome] GET /mobile/config', 'GET', '/mobile/config', {
        tests: [TEST_OK],
        headers: [{ key: 'X-Client-Platform', value: 'ios' }],
      }),
      req('[Help] GET /mobile/help', 'GET', '/mobile/help', { tests: [TEST_OK] }),
      req('[Sign Up] POST /auth/register — organizer', 'POST', '/auth/register', {
        body: {
          email: 'postman.organizer.{{runId}}@flunexia.test',
          password: '{{demoPassword}}',
          name: 'Postman Organizer',
          accountType: 'organizer',
          organizationType: 'School',
        },
        tests: [TEST_OK],
      }),
      req('[Sign Up] POST /auth/register — provider', 'POST', '/auth/register', {
        body: {
          email: 'postman.provider.{{runId}}@flunexia.test',
          password: '{{demoPassword}}',
          name: 'Postman Provider',
          accountType: 'provider',
          providerType: 'Transport',
        },
        tests: [TEST_OK],
      }),
      req('[Forgot password] POST /auth/forgot-password', 'POST', '/auth/forgot-password', {
        body: { email: '{{organizerEmail}}' },
        tests: [
          TEST_OK,
          'const j = pm.response.json();',
          "if (j.resetToken) pm.collectionVariables.set('resetToken', j.resetToken);",
        ],
      }),
      req('[Reset password] POST /auth/reset-password', 'POST', '/auth/reset-password', {
        body: { token: '{{resetToken}}', newPassword: '{{demoPassword}}' },
        tests: [TEST_OK],
      }),
      req('[Contact] POST /contact', 'POST', '/contact', {
        body: {
          name: 'Postman Tester',
          email: 'postman.contact.{{runId}}@example.com',
          role: 'organizer',
          message: 'Testing contact API from Postman.',
        },
        tests: [TEST_OK],
      }),
    ]),
    folder(
      'Organizer — marie@stjudes.school',
      'Mobile/web organizer flows. Uses {{organizerToken}} from Setup.',
      [
        folder('Auth & onboarding', '', [
          req('[Welcome Back] POST /auth/login', 'POST', '/auth/login', {
            body: { email: '{{organizerEmail}}', password: '{{demoPassword}}' },
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              "pm.collectionVariables.set('organizerToken', j.token);",
            ],
          }),
          req('[Session] GET /auth/me', 'GET', '/auth/me', { auth: 'organizerToken', tests: [TEST_OK] }),
        ]),
        folder('Dashboard', 'Organizer Dashboard screen', [
          req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
            auth: 'organizerToken',
            tests: [TEST_OK],
            headers: [{ key: 'X-Client-Platform', value: 'ios' }],
          }),
        ]),
        folder('My Trips', 'My Trips list screen', [
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
        folder('Create Trip', 'Create a Trip screen — JSON or multipart', [
          req('POST /trips (JSON)', 'POST', '/trips', {
            auth: 'organizerToken',
            description: 'application/json — no cover image.',
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
            description:
              'multipart/form-data: text fields + file field `image`. needTypes as JSON string. Requires Cloudinary. Pick a file in Body before Send.',
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
        folder('Trip Details', 'Trip Details screen', [
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
        ]),
        folder('Trip Details & Proposals', 'Offers on a request', [
          req('GET /requests/:id', 'GET', '/requests/{{requestId}}', {
            auth: 'organizerToken',
            tests: [TEST_OK],
          }),
          req('GET /requests/:id/offers', 'GET', '/requests/{{requestId}}/offers', {
            auth: 'organizerToken',
            tests: [TEST_OK],
          }),
          req('PATCH /offers/:id — accept', 'PATCH', '/offers/{{offerId}}/status', {
            auth: 'organizerToken',
            body: { status: 'accepted' },
            description: 'Use a submitted offer on pending request (seeded Museum/Transport).',
            tests: [TEST_OK],
          }),
          req('GET /offers/:id', 'GET', '/offers/{{offerId}}', {
            auth: 'organizerToken',
            tests: [TEST_OK],
          }),
        ]),
        folder('Requests / Bookings', 'Requests list screen', [
          req('GET /requests', 'GET', '/requests', { auth: 'organizerToken', tests: [TEST_OK] }),
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
        folder('Profile', 'Organizer Profile screen', [
          req('GET /users/me', 'GET', '/users/me', { auth: 'organizerToken', tests: [TEST_OK] }),
          req('PATCH /users/me', 'PATCH', '/users/me', {
            auth: 'organizerToken',
            body: { name: 'Marie Laurent' },
            tests: [TEST_OK],
          }),
        ]),
        folder('Notifications', 'Bell / inbox', [
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
        folder('Device (push)', '', [
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
    folder(
      'Provider — sales@greenbus.fr',
      'Supplier flows. Uses {{providerToken}} from Setup.',
      [
        folder('Auth & onboarding', '', [
          req('[Welcome Back] POST /auth/login', 'POST', '/auth/login', {
            body: { email: '{{providerEmail}}', password: '{{demoPassword}}' },
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              "pm.collectionVariables.set('providerToken', j.token);",
            ],
          }),
          req('[Session] GET /auth/me', 'GET', '/auth/me', { auth: 'providerToken', tests: [TEST_OK] }),
        ]),
        folder('Dashboard', 'Provider home', [
          req('GET /mobile/dashboard', 'GET', '/mobile/dashboard', {
            auth: 'providerToken',
            tests: [TEST_OK],
            headers: [{ key: 'X-Client-Platform', value: 'android' }],
          }),
        ]),
        folder('Available Trips', 'Browse open trips', [
          req('GET /trips (paginated)', 'GET', '/trips', {
            auth: 'providerToken',
            query: [
              { key: 'page', value: '1' },
              { key: 'limit', value: '20' },
            ],
            tests: [TEST_OK],
          }),
          req('GET /trips/:id', 'GET', '/trips/{{tripId}}', {
            auth: 'providerToken',
            tests: [TEST_OK],
          }),
        ]),
        folder('Requests / Responses', 'My bids & open requests', [
          req('GET /requests', 'GET', '/requests', { auth: 'providerToken', tests: [TEST_OK] }),
          req('GET /offers', 'GET', '/offers', { auth: 'providerToken', tests: [TEST_OK] }),
          req('GET /requests/:id/offers', 'GET', '/requests/{{requestId}}/offers', {
            auth: 'providerToken',
            tests: [TEST_OK],
          }),
        ]),
        folder('Submit proposal', 'Trip Details & Proposal — submit offer', [
          req('POST /requests/:id/offers', 'POST', '/requests/{{e2eRequestId}}/offers', {
            auth: 'providerToken',
            description: 'Use E2E request id, or replace with {{requestId}} on pending seed request.',
            body: {
              description: '40-seat coach, driver included.',
              price: 410,
              currency: 'EUR',
            },
            tests: [TEST_OK],
            disabled: true,
          }),
          req('POST /requests/:id/offers (seed)', 'POST', '/requests/{{requestId}}/offers', {
            auth: 'providerToken',
            description: 'Fails with 409 if GreenBus already bid — use E2E folder instead.',
            body: {
              description: 'Alternate bid from Postman.',
              price: 395,
              currency: 'EUR',
            },
            tests: [TEST_OK],
            disabled: true,
          }),
        ]),
        folder('Profile', 'Provider Profile', [
          req('GET /users/me', 'GET', '/users/me', { auth: 'providerToken', tests: [TEST_OK] }),
          req('PATCH /users/me', 'PATCH', '/users/me', {
            auth: 'providerToken',
            body: { name: 'GreenBus' },
            tests: [TEST_OK],
          }),
        ]),
        folder('Notifications', '', [
          req('GET /notifications', 'GET', '/notifications', {
            auth: 'providerToken',
            query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
            tests: [TEST_OK],
          }),
        ]),
        folder('Device (push)', '', [
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
    folder(
      'Admin — admin@flunexia.org',
      'Admin panel. Uses {{adminToken}} from Setup.',
      [
        folder('Auth', '', [
          req('[Welcome Back] POST /auth/login', 'POST', '/auth/login', {
            body: { email: '{{adminEmail}}', password: '{{demoPassword}}' },
            tests: [
              TEST_OK,
              'const j = pm.response.json();',
              "pm.collectionVariables.set('adminToken', j.token);",
            ],
          }),
          req('GET /auth/me', 'GET', '/auth/me', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        folder('Dashboard', 'Admin stats', [
          req('GET /admin/stats', 'GET', '/admin/stats', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        folder('Users', 'User management', [
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
        folder('Trips', 'All trips', [
          req('GET /admin/trips', 'GET', '/admin/trips', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        folder('Requests', 'All requests', [
          req('GET /admin/requests', 'GET', '/admin/requests', {
            auth: 'adminToken',
            tests: [TEST_OK],
          }),
        ]),
        folder('Offers', 'All offers', [
          req('GET /admin/offers', 'GET', '/admin/offers', { auth: 'adminToken', tests: [TEST_OK] }),
        ]),
        folder('Contact inbox', '', [
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
      ],
      'adminToken',
    ),
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
