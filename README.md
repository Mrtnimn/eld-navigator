# ELD Navigator — HOS-Compliant Trip Planner

**ELD Navigator** is a full-stack trip planning app for **property-carrying drivers** that generates a **Hours-of-Service (HOS)-compliant** multi-day plan: route + stops + ELD-style daily logs.

This project showcases end-to-end product engineering: a modern React UI, an API-driven Django backend, and real-world constraints like compliance rules, external geocoding, and production deployment.

---

## Why this project (in plain English)

Dispatch and trip planning isn’t just “maps + directions.” For CDL drivers, a route needs to be **legal and realistic**:

- driving time must fit in **11-hour / 14-hour** limits
- required **breaks** must appear at the right times
- overnight resets and multi-day trips must generate a usable log plan
- the system must handle predictable operational overhead (pickup/drop-off time, fueling cadence)

ELD Navigator takes a start/end trip request and returns a plan that accounts for those constraints.

---

## What it does (confirmed features)

### Core capabilities
- **Trip planning endpoint** that returns a plan including:
  - summary + route + stops + **ELD logs**  
  (exposed via the backend `POST /api/trip/plan`)
- **Geocoding** via a Nominatim proxy: `GET /api/trip/geocode?q=...`
- **Driver profile** persistence: `GET/PUT /api/profile` (or `/api/trip/profile` depending on deployment docs)
- **Saved trips**:
  - list/create: `GET/POST /api/trip/saved`
  - retrieve/delete: `GET/DELETE /api/trip/saved/<id>`
- **Health check**: `GET /api/healthz` returning `{"status":"ok"}`

### HOS rules modeled (property-carrying, per backend docs)
- 70 hr / 8 day cycle  
- 11 hr max driving  
- 14 hr on-duty window  
- 10 hr off-duty reset  
- 30 min break after 8 hr driving  
- 1 hr pickup + 1 hr drop-off  
- Fuel stop every 1,000 miles (30 min)

---

## Tech stack (confirmed from repo)

### Frontend
- React (modern version)
- TanStack Start / TanStack Router + TanStack Query
- Vite
- Tailwind CSS
- Leaflet + React Leaflet (map rendering)
- React Hook Form + Zod (validation)
- Radix UI component primitives + modern UI tooling

### Backend
- Django + Django REST Framework
- django-cors-headers
- dj-database-url (DB config via `DATABASE_URL`)
- gunicorn
- psycopg2-binary (Postgres)
- whitenoise

### Deployment (as documented in repo in the DEPLOYMENT.md)
- **Frontend** deploys to **Vercel** (root directory `.`)
- **Backend** deploys to **Vercel** as Python serverless (root directory `backend/`)
- Notes call out external API rate limits and Vercel function timeouts

---

## API (Django REST)

Base path: `/api`

| Method | Path | Purpose |
|-------:|------|---------|
| GET | `/api/healthz` | Health check |
| POST | `/api/trip/plan` | Trip planning + HOS calculation (returns plan + logs) |
| GET | `/api/trip/geocode?q=...` | Geocoding via Nominatim proxy |
| GET | `/api/profile` | Get driver profile |
| PUT | `/api/profile` | Upsert driver profile |
| GET | `/api/trip/saved` | List saved trips |
| POST | `/api/trip/saved` | Save a trip |
| GET | `/api/trip/saved/<id>` | Retrieve a saved trip |
| DELETE | `/api/trip/saved/<id>` | Delete a saved trip |

---

## Local development

### Backend (Django)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend (Vite)
```bash
bun install
bun run dev
```

Create a repo-root `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## Deployment (Vercel) — practical notes

The repo includes a full deployment guide in `DEPLOYMENT.md`. Highlights:

- Backend uses `backend/vercel.json` and requires:
  - `DJANGO_SECRET_KEY`
  - `DATABASE_URL` (use Postgres in production; Vercel filesystem is read-only)
  - `DJANGO_ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`

- Frontend uses:
  - `VITE_API_BASE_URL` pointing to the deployed backend

- Operational constraints called out in the repo docs:
  - Nominatim/OSRM public endpoints can be rate-limited (e.g., 1 req/sec in docs)
  - Vercel Python function timeouts may require a paid tier for long-running planning requests

---

## What this demonstrates to recruiters

### Full-stack engineering
- Frontend ↔ backend contract design (clean `/api/...` endpoints)
- Real persistence: profiles + saved trips (not just a demo UI)
- Deployment-ready configuration (env vars, CORS/hosts, Postgres config)

### Product thinking
- Encodes real-world compliance constraints (HOS, mandated breaks, duty windows)
- Builds a workflow a user can actually complete: plan → visualize → save → revisit

### Frontend craftsmanship
- Modern routing/data-fetching patterns (TanStack Router + Query)
- Form validation and UX primitives (React Hook Form + Zod + Radix)
- Mapping UI (Leaflet) for route visualization

---

## Roadmap (reasonable next steps)
- Add automated tests (API + HOS edge cases + UI flows)
- Add observability for planning requests (timings, error categorization)
- Optional: self-host routing/geocoding services for higher throughput
- Export/printable log sheet generation UX polish

---

# ELD Navigator — HOS-Compliant Trip Planner (Full-Stack Portfolio Project)

**ELD Navigator** is a full-stack trip planning app for **property-carrying drivers** that generates a **Hours-of-Service (HOS)-compliant** multi-day plan: route + stops + ELD-style daily logs.

This project showcases end-to-end product engineering: a modern React UI, an API-driven Django backend, and real-world constraints like compliance rules, external geocoding, and production deployment.

---

## Why this project (in plain English)

Dispatch and trip planning isn’t just “maps + directions.” For CDL drivers, a route needs to be **legal and realistic**:

- driving time must fit in **11-hour / 14-hour** limits
- required **breaks** must appear at the right times
- overnight resets and multi-day trips must generate a usable log plan
- the system must handle predictable operational overhead (pickup/drop-off time, fueling cadence)

ELD Navigator takes a start/end trip request and returns a plan that accounts for those constraints.

---

## What it does (confirmed features)

### Core capabilities
- **Trip planning endpoint** that returns a plan including:
  - summary + route + stops + **ELD logs**  
  (exposed via the backend `POST /api/trip/plan`)
- **Geocoding** via a Nominatim proxy: `GET /api/trip/geocode?q=...`
- **Driver profile** persistence: `GET/PUT /api/profile` (or `/api/trip/profile` depending on deployment docs)
- **Saved trips**:
  - list/create: `GET/POST /api/trip/saved`
  - retrieve/delete: `GET/DELETE /api/trip/saved/<id>`
- **Health check**: `GET /api/healthz` returning `{"status":"ok"}`

### HOS rules modeled (property-carrying, per backend docs)
- 70 hr / 8 day cycle  
- 11 hr max driving  
- 14 hr on-duty window  
- 10 hr off-duty reset  
- 30 min break after 8 hr driving  
- 1 hr pickup + 1 hr drop-off  
- Fuel stop every 1,000 miles (30 min)

---

## Tech stack (confirmed from repo)

### Frontend
- React (modern version)
- TanStack Start / TanStack Router + TanStack Query
- Vite
- Tailwind CSS
- Leaflet + React Leaflet (map rendering)
- React Hook Form + Zod (validation)
- Radix UI component primitives + modern UI tooling

### Backend
- Django + Django REST Framework
- django-cors-headers
- dj-database-url (DB config via `DATABASE_URL`)
- gunicorn
- psycopg2-binary (Postgres)
- whitenoise

### Deployment (as documented in repo)
- **Frontend** deploys to **Vercel** (root directory `.`)
- **Backend** deploys to **Vercel** as Python serverless (root directory `backend/`)
- Notes call out external API rate limits and Vercel function timeouts

---
### Frontend (Vite)
```bash
bun install
Create a repo-root `.env`:
VITE_API_BASE_URL=http://localhost:8000

---



- Backend uses `backend/vercel.json` and requires:
  - `DJANGO_SECRET_KEY`
  - `DATABASE_URL` (use Postgres in production; Vercel filesystem is read-only)
  - `CORS_ALLOWED_ORIGINS`

- Frontend uses:
  - `VITE_API_BASE_URL` pointing to the deployed backend

- Operational constraints called out in the repo docs:
  - Nominatim/OSRM public endpoints can be rate-limited (e.g., 1 req/sec in docs)
  - Vercel Python function timeouts may require a paid tier for long-running planning requests

---

## What this demonstrates to recruiters

### Full-stack engineering
- Frontend ↔ backend contract design (clean `/api/...` endpoints)
- Real persistence: profiles + saved trips (not just a demo UI)
- Deployment-ready configuration (env vars, CORS/hosts, Postgres config)

### Product thinking

- Mapping UI (Leaflet) for route visualization


## Roadmap (reasonable next steps)
- Add automated tests (API + HOS edge cases + UI flows)
- Add observability for planning requests (timings, error categorization)
- Optional: self-host routing/geocoding services for higher throughput
- Export/printable log sheet generation UX polish

---

## Contact
If you're a recruiter or hiring manager evaluating full-stack / frontend roles, I’m happy to walk through:
- architecture decisions,
- how the HOS constraints are modeled,
- API contract design,
- and deployment tradeoffs.

Repo: `Mrtnimn/eld-navigator`---
### Frontend craftsmanship
- Form validation and UX primitives (React Hook Form + Zod + Radix)
- Modern routing/data-fetching patterns (TanStack Router + Query)
- Encodes real-world compliance constraints (HOS, mandated breaks, duty windows)
- Builds a workflow a user can actually complete: plan → visualize → save → revisit
  - `DJANGO_ALLOWED_HOSTS`
The repo includes a full deployment guide in `DEPLOYMENT.md`. Highlights:
## Deployment (Vercel) — practical notes
```
```bash

bun run dev
```

