# Flunexia API (Backend)

REST API for **Flunexia** — a B2B marketplace that connects **organizers** (municipalities, schools, associations) with **suppliers** (transport, accommodation, catering, activities, equipment) to plan group trips and manage service requests, offers, and bookings.

| | |
|---|---|
| **Production base URL** | `https://api.flunexia.fr/api/v1` |
| **Repository** | [github.com/nizam-app/fluenixa_backend](https://github.com/nizam-app/fluenixa_backend) |
| **Runtime** | Node.js 20+ |
| **Stack** | Express 5 · MongoDB · JWT · Cloudinary · Brevo |

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [API surface](#api-surface)
- [User roles](#user-roles)
- [File uploads](#file-uploads)
- [Production deployment (VPS)](#production-deployment-vps)
- [Docker](#docker)
- [Demo data](#demo-data)
- [Security notes](#security-notes)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Overview

The backend powers:

- The **Flunexia web app** ([fluide-web-app](https://github.com/nizam-app/fluide_web_app))
- Optional **mobile** clients (`/api/v1/mobile`)

All authenticated routes expect a Bearer JWT unless noted otherwise. Responses are JSON with `{ success: true, ... }` on success; errors return `{ success: false, message: "..." }` with an appropriate HTTP status.

Health check:

```http
GET /api/v1/health
```

---

## Features

### Organizers
- Create and publish trips with need types, itinerary, and **service plan** (transfer, hotel, restaurant, equipment details)
- Open service requests per need type; messaging and history on requests
- Review supplier offers (with optional **quote attachments**)
- Accept / reject offers; favorite suppliers
- View supplier trust profiles (SIRET, billing summary, approved documents)

### Suppliers (providers)
- Browse trips and submit offers (description, price, optional PDF/image attachment)
- Manage profile, billing (SIRET, IBAN, Chorus Pro fields), and **trust documents**
- Upload insurance / registration / certification files (pending admin approval)

### Admins
- Platform stats, user management (suspend, approve services)
- Edit supplier profiles and approve / reject trust documents
- Trips, requests, and offers oversight

### Cross-cutting
- Auth (register, login, password reset, welcome email via Brevo)
- In-app notifications
- Rate limiting on write endpoints
- Audit log for key actions
- Destination cover images (Google Places / fallback)
- Contact form intake

---

## Architecture

```
Client (Web / Mobile)
        │
        ▼
   Express API  ──►  MongoDB Atlas
        │
        ├── Cloudinary  (avatars, trip covers, documents, offer attachments)
        ├── Brevo       (transactional email)
        └── Google Places (destination images)
```

- **Validation:** Zod schemas per route (`src/middleware/validate.js`)
- **Auth:** JWT in `Authorization: Bearer <token>` (`src/middleware/auth.middleware.js`)
- **Errors:** Central handler (`src/middleware/error.middleware.js`)

---

## Prerequisites

- **Node.js** ≥ 20
- **MongoDB** (Atlas or local)
- **npm** (lockfile committed — use `npm ci` in production)

Optional but recommended for full functionality:

- [Cloudinary](https://cloudinary.com) — image and document storage
- [Brevo](https://www.brevo.com) — email (welcome, password reset)
- Google Cloud — Places API for destination images

---

## Quick start (local)

```bash
git clone https://github.com/nizam-app/fluenixa_backend.git
cd fluenixa_backend
npm ci
cp .env.example .env   # create from template below if .env.example is missing
# Edit .env with MONGODB_URI and JWT_SECRET at minimum
npm run dev
```

API listens on **http://localhost:5000** by default.

Verify:

```bash
curl http://localhost:5000/api/v1/health
```

### Minimal `.env` (development)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=<at-least-32-random-characters-for-production>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Signing secret (≥ 32 chars in production) |
| `JWT_EXPIRES_IN` | No | Token TTL (default `7d`) |
| `PORT` | No | HTTP port (default `5000`) |
| `NODE_ENV` | No | `development` \| `production` |
| `CLIENT_ORIGIN` | No | Comma-separated CORS origins |
| `TRUST_PROXY` | No | Set `true` behind nginx / reverse proxy |
| `MAX_UPLOAD_BYTES` | No | Upload limit in bytes (default 5 MB) |
| `CLOUDINARY_URL` | No* | `cloudinary://key:secret@cloud_name` |
| `CLOUDINARY_CLOUD_NAME` | No* | Alternative to `CLOUDINARY_URL` |
| `CLOUDINARY_API_KEY` | No* | With cloud name + secret |
| `CLOUDINARY_API_SECRET` | No* | With cloud name + key |
| `BREVO_API_KEY` | No* | Brevo transactional email |
| `BREVO_FROM_EMAIL` | No | Sender email |
| `BREVO_FROM_NAME` | No | Sender display name |
| `APP_URL` | No | Public web app URL (links in emails) |
| `GOOGLE_PLACES_API_KEY` | No | Destination image lookup |
| `ADMIN_BOOTSTRAP_KEY` | No | One-time admin bootstrap (`POST /auth/bootstrap-admin`) |
| `SEED_API_URL` | No | Target API for `npm run seed` |
| `SEED_DEMO_PASSWORD` | No | Password for seeded demo users |

\*Required for the related feature to work in production (uploads, email, etc.).

### Production CORS example

```env
CLIENT_ORIGIN=http://localhost:5173,https://fluide-web-app.vercel.app,https://flunexia.fr,https://www.flunexia.fr
```

### Brevo on VPS

Whitelist the server IP in Brevo (or disable IP restriction) so welcome and reset emails are delivered.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start (`node src/server.js`) |
| `npm run check` | Syntax-check entry file |
| `npm run lint` | ESLint |
| `npm run gen-secret` | Generate a random `JWT_SECRET` |
| `npm run seed` | Seed demo users, trips, requests via HTTP API |
| `npm run postman:generate` | Generate Postman collection |

---

## API surface

Base path: **`/api/v1`**

| Prefix | Purpose |
|--------|---------|
| `/auth` | Register, login, logout, me, password reset, bootstrap admin |
| `/users` | Profile, avatar, documents, public supplier profiles |
| `/trips` | CRUD, duplicate, cover image, recommended providers |
| `/requests` | Service requests, messages, history, nested offers |
| `/offers` | List, detail, status updates, provider edits |
| `/favorites` | Organizer favorite suppliers |
| `/notifications` | User notifications |
| `/admin` | Stats, users, trips, requests, offers, supplier management |
| `/contact` | Public contact submissions |
| `/utils` | Destination image proxy, helpers |
| `/mobile` | Mobile-optimized aggregates |
| `/devices` | Push device registration |

Interactive exploration: run `npm run postman:generate` or import routes from `src/modules/**/**.routes.js`.

---

## User roles

| Role | `role` value | Description |
|------|----------------|-------------|
| Admin | `admin` | Full platform management |
| Organizer | `organizer` | Creates trips and requests |
| Supplier | `provider` | Submits offers and manages supplier profile |

Supplier **service types** (transport, accommodation, etc.) may require **admin approval** when multiple types are requested at registration.

---

## File uploads

Uploads use **multer** (in-memory) and **Cloudinary**.

| Endpoint | Field | Types |
|----------|-------|--------|
| `POST /users/me/avatar` | `image` | JPEG, PNG, WebP, GIF |
| `POST /users/me/documents` | `file` | Images + PDF |
| `POST /requests/:requestId/offers` | `attachment` | Images + PDF (quote) |
| `POST /trips` / `POST /trips/:id/image` | `image` | Trip cover |

Documents uploaded by suppliers default to **`pending`** until an admin approves them.

---

## Production deployment (VPS)

Typical flow on Ubuntu with **PM2** and **nginx**:

```bash
cd /var/www/backend
git pull origin main
npm ci
pm2 restart all --update-env
```

Checklist after deploy:

1. `.env` present with production values
2. `NODE_ENV=production`
3. `TRUST_PROXY=true` if behind nginx
4. `CLIENT_ORIGIN` includes the live web app URL
5. `pm2 logs` — no boot errors (JWT / MongoDB)
6. `curl https://api.flunexia.fr/api/v1/health`

nginx should proxy to `localhost:5000` and terminate TLS for `api.flunexia.fr`.

---

## Docker

```bash
docker build -t flunexia-api .
docker run --env-file .env -p 5000:5000 flunexia-api
```

The image includes CA certificates for outbound HTTPS (Brevo, Cloudinary, MongoDB Atlas).

---

## Demo data

With the API running and `ADMIN_BOOTSTRAP_KEY` set:

```bash
npm run seed
```

Default demo password: **`demo123`** (override with `SEED_DEMO_PASSWORD`).

| Role | Email |
|------|--------|
| Admin | `admin@flunexia.org` |
| Organizer | `organizer@flunexia.org` |
| Supplier | `supplier@flunexia.org` |

Use seed data only in **staging / demo** environments — not in production with real user data.

---

## Security notes

- Never commit `.env` or secrets to git
- Use a strong unique `JWT_SECRET` (≥ 32 characters) in production
- Restrict `ADMIN_BOOTSTRAP_KEY` and disable bootstrap after first admin exists
- Keep dependencies updated: `npm audit`
- Rate limits apply to auth and write endpoints
- IBAN is stored for suppliers; public organizer views receive a **masked** IBAN only

---

## Project structure

```
src/
├── app.js                 # Express app & route mounting
├── server.js              # HTTP server bootstrap
├── config/                # env, database
├── constants/             # Provider types, document categories
├── middleware/            # auth, upload, validate, rate limit
├── modules/
│   ├── auth/              # Users, login, register
│   ├── trips/             # Trips & itineraries
│   ├── requests/          # Service requests
│   ├── offers/            # Supplier offers
│   ├── users/             # Profiles & documents
│   ├── admin/             # Administration
│   ├── favorites/
│   ├── notifications/
│   └── ...
├── services/              # email, cloudinary, notifications, audit
└── utils/
scripts/                   # seed, postman, utilities
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| CORS error from web app | `CLIENT_ORIGIN` missing the frontend URL |
| Welcome email not sent | Brevo API key or server IP not whitelisted |
| Upload returns 503 | Cloudinary env vars not set |
| `Route not found` after git pull | PM2 not restarted (`pm2 restart all --update-env`) |
| 401 on all routes | Expired or missing JWT |

---

## Related repositories

- **Web app:** [github.com/nizam-app/fluide_web_app](https://github.com/nizam-app/fluide_web_app)  
- **Production web:** [https://fluide-web-app.vercel.app](https://fluide-web-app.vercel.app)

---

## License

ISC — see `package.json`. Proprietary to Flunexia / project owner unless otherwise agreed in contract.
