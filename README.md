# Flunexia API (`backend/`)

Express 5 + Mongoose 9 REST API powering the Fluide / Flunexia web app. Organizers post trips, providers offer services, admins moderate everything.

## Stack

- Node.js 20+, Express 5, Mongoose 9, CommonJS
- JWT auth (bcrypt password hashing)
- Zod request validation
- helmet + CORS + morgan + express-rate-limit
- Multer + **Cloudinary** image uploads (CDN, automatic optimization)
- ESLint 10 (flat config)

## Quick start

```bash
cp .env.example .env
npm install
npm run gen-secret           # paste into JWT_SECRET in .env
npm run dev                  # nodemon src/server.js
```

The server listens on `PORT` (default 5000). Health check: `GET /api/v1/health`.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | Defaults to `5000` |
| `NODE_ENV` | no | `development` \| `production` \| `test` |
| `MONGODB_URI` | yes | Mongo connection string. Atlas/replica-set recommended (transactions) |
| `JWT_SECRET` | yes | 32+ chars in production. Generate with `npm run gen-secret` |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `CLIENT_ORIGIN` | no | Comma-separated origins or `*`. Default `http://localhost:5173` |
| `ADMIN_BOOTSTRAP_KEY` | prod | Required header value to call `POST /auth/bootstrap-admin` |
| `CLOUDINARY_URL` *(or the three split values)* | for image uploads | One-line form `cloudinary://<api_key>:<api_secret>@<cloud_name>` |
| `CLOUDINARY_CLOUD_NAME` | alternative to URL | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | alternative to URL | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | alternative to URL | Cloudinary API secret |
| `MAX_UPLOAD_BYTES` | no | Default `5242880` (5 MiB) |
| `UPLOAD_DIR` | no | Legacy. Default `uploads`. Still served at `/uploads/<file>` so any pre-Cloudinary local files keep working |
| `TRUST_PROXY` | no | Set `true` behind a reverse proxy so rate limiting sees the real IP |

`POST /trips/:id/image` returns `503` if Cloudinary credentials are not set. Provide either `CLOUDINARY_URL` (the one-line form copied from <https://console.cloudinary.com/> → *Product Environment Credentials*) or all three `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` values. The endpoint streams the uploaded buffer to Cloudinary with `quality=auto, fetch_format=auto` and stores the returned `secure_url` + `public_id` on the trip; replacing or deleting a trip cleans up the previous Cloudinary asset.

In `production`, the server refuses to boot with placeholder values for `JWT_SECRET` / `ADMIN_BOOTSTRAP_KEY`.

## Deploy to Render

A `render.yaml` blueprint at the repo root provisions a Web Service that runs the
backend. Two ways to ship:

### One-click (recommended)

1. Push the repo to GitHub/GitLab.
2. In Render → **New → Blueprint**, point at the repo. Render reads `render.yaml`,
   creates the `flunexia-api` Web Service, and auto-generates `JWT_SECRET`.
3. Fill in the secrets marked `sync: false` in the Render dashboard:
   - `MONGODB_URI` — your Mongo Atlas connection string (whitelist `0.0.0.0/0`
     or add Render's egress IPs in Atlas → Network Access).
   - `CLOUDINARY_URL` — paste from <https://console.cloudinary.com/> →
     *Product Environment Credentials*.
   - `ADMIN_BOOTSTRAP_KEY` — any long random string. You'll send it as the
     `x-admin-bootstrap-key` header when calling `POST /auth/bootstrap-admin`
     to create the first admin.
   - `CLIENT_ORIGIN` — the deployed frontend URL (e.g. `https://flunexia.vercel.app`).
     Comma-separate multiple origins, or use `*` while testing.
4. First deploy starts automatically. Check `https://<your-service>.onrender.com/api/v1/health`.

### Manual

If you skip the blueprint:

- Service type: **Web Service** → Node, root directory `backend`.
- Build command: `npm ci`
- Start command: `node src/server.js`
- Health check path: `/api/v1/health`
- Set all env vars from the table above. `JWT_SECRET` must be ≥ 32 chars in
  production (generate locally with `npm run gen-secret`).

### Free plan caveats

The free plan sleeps after 15 minutes of inactivity (~30-second cold start on
first request). Upgrade to `starter` for always-on. Free plan also has no
persistent disk — that's fine because images go to Cloudinary, not local disk.

### Seeding the demo data on Render

Don't run `npm run seed` against production unless you actually want the demo
trips/users. To seed against the deployed API from your laptop:

```bash
cd backend
SEED_API_URL="https://<your-service>.onrender.com/api/v1" \
ADMIN_BOOTSTRAP_KEY="<the value you set on Render>" \
  npm run seed
```

## Scripts

```bash
npm run dev          # nodemon
npm start            # node src/server.js
npm run check        # node --check on the entry file
npm run lint         # eslint .
npm run gen-secret   # cryptographically random 48-byte token
npm run seed         # push the mockData fixtures through the live API
```

## Seeding demo data

`npm run seed` runs `scripts/seed.js`, which mirrors `FLUIDE_WEB_APP/src/data/mockData.js`
into the database **through the public API**. It creates the admin, organizers,
providers, four trips, their service requests, offers (including accepted /
rejected / completed transitions), and a couple of contact messages.

Requirements:
- API running locally (`npm run dev`).
- `ADMIN_BOOTSTRAP_KEY` set in `.env` if the admin doesn't exist yet (the seed
  will fall back to login if the admin is already there).
- The seed is idempotent — re-running it skips existing users / trips / offers.

Override the password or target URL via env vars:

```bash
SEED_API_URL=https://api.example.com/api/v1 SEED_DEMO_PASSWORD='S0meStr0ng!' npm run seed
```

Seeded demo logins (password defaults to `demo123`):

| Role | Email |
| --- | --- |
| Admin | `admin@flunexia.org` |
| Organizer | `organizer@flunexia.org`, `marie@stjudes.school`, `contact@goldenage.org`, `sophie@greenvalley.edu`, `lucas@metro.gov` |
| Provider | `supplier@flunexia.org`, `sales@greenbus.fr`, `orders@citycatering.fr`, `hello@ecotransit.fr`, `contact@metrofacilities.fr` |

## API surface

All endpoints sit under `/api/v1`. Auth: `Authorization: Bearer <JWT>`.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/auth/register` | Create an organizer or provider account |
| `POST` | `/auth/login` | Issue a JWT |
| `POST` | `/auth/bootstrap-admin` | Create the very first admin (once only) |
| `POST` | `/contact` | Submit a public contact-form message |

### Authenticated

| Method | Path | Role(s) | Description |
| --- | --- | --- | --- |
| `GET` | `/auth/me` | any | Current user |
| `POST` | `/auth/logout` | any | Stateless logout |
| `GET` | `/users/me` | any | Profile |
| `PATCH` | `/users/me` | any | Update name / organizationType / providerType |
| `PATCH` | `/users/me/password` | any | Change password |
| `GET` | `/trips` | any | Role-scoped listing (`status`, `needType`, `q`) |
| `POST` | `/trips` | organizer | Create trip |
| `GET` | `/trips/:id` | any | Fetch one (provider sees only public statuses) |
| `PATCH` | `/trips/:id` | organizer/admin | Update trip |
| `DELETE` | `/trips/:id` | organizer/admin | Delete trip (cascades to requests + offers) |
| `POST` | `/trips/:id/image` | organizer/admin | Multipart `image` upload (≤5 MiB, jpg/png/webp/gif) |
| `GET` | `/requests` | any | Role-scoped listing |
| `POST` | `/requests` | organizer | Create a service request on a trip you own |
| `GET` | `/requests/:id` | any | Fetch one |
| `PATCH` | `/requests/:id/status` | organizer/provider/admin | Update status (provider limited to `completed`/`cancelled`) |
| `GET` | `/requests/:requestId/offers` | any | List offers for a request |
| `POST` | `/requests/:requestId/offers` | provider | Submit an offer (one per provider per request) |
| `GET` | `/offers` | any | Role-scoped listing |
| `GET` | `/offers/:id` | any | Fetch one |
| `PATCH` | `/offers/:id/status` | organizer/provider/admin | Accept / reject / withdraw — accepting auto-rejects siblings and flips the parent request, transactionally |

### Admin

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/stats` | Counts and groupings |
| `GET` | `/admin/users` | List users (`role`, `status`, `q`) |
| `POST` | `/admin/users` | Create user |
| `PATCH` | `/admin/users/:id/status` | Suspend / reactivate |
| `GET` | `/admin/trips` | All trips |
| `GET` | `/admin/requests` | All requests |
| `GET` | `/admin/offers` | All offers |
| `GET` | `/contact` | Inbox of contact messages |
| `PATCH` | `/contact/:id/status` | Triage a message |

See `requests.http` for runnable examples.

## Error shape

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "path": "email", "message": "Email must be valid" }]
}
```

`details` is included for Zod / Mongoose validation errors. Stack traces are included in non-production environments.

## Rate limits

- `authLimiter` — 20 requests / 15 min on `/auth/register`, `/auth/login`, `/auth/bootstrap-admin`.
- `contactLimiter` — 10 requests / hour on `POST /contact`.
- `writeLimiter` — 60 requests / minute on all mutating endpoints.

Limits are disabled when `NODE_ENV=test`.

## Transactions & cascades

- Accepting an offer (`PATCH /offers/:id/status` with `accepted`) runs in a Mongoose transaction: the offer is set to `accepted`, sibling submitted offers are rejected, and the parent request is flipped to `accepted` with `provider` / `acceptedOffer` populated. Standalone (non-replica-set) MongoDB falls back to best-effort sequential writes.
- Deleting a trip cascades: dependent `ServiceRequest`s and their `Offer`s are removed.

## Docker

```bash
docker build -t flunexia-api ./backend
docker run --env-file backend/.env -p 5000:5000 flunexia-api
```

## Folder layout

```
backend/
├── Dockerfile / .dockerignore
├── eslint.config.js
├── package.json
├── requests.http
├── scripts/
│   └── gen-secret.js
├── uploads/                 # local image storage (gitignored)
└── src/
    ├── app.js               # Express factory (helmet, cors, morgan, routers, error handler)
    ├── server.js            # bootstrap + graceful shutdown
    ├── config/
    │   ├── db.js
    │   └── env.js           # loads + validates env vars
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── error.middleware.js
    │   ├── rateLimit.js
    │   ├── upload.js        # multer image uploader
    │   └── validate.js      # Zod request validator
    ├── modules/
    │   ├── auth/            controller + routes + user model + Zod schemas
    │   ├── users/
    │   ├── trips/
    │   ├── requests/
    │   ├── offers/
    │   ├── admin/
    │   └── contact/
    └── utils/
        ├── asyncHandler.js
        ├── httpError.js
        └── jwt.js
```
#   f l u e n i x a _ b a c k e n d  
 