# ELD Navigator — HOS-Compliant Trip Planner

**ELD Navigator** is a full-stack trip planning app for **property-carrying drivers** that generates a **Hours-of-Service (HOS)-compliant** multi-day plan: route, stops, and ELD-style daily logs.

This project showcases end-to-end product engineering: a modern React UI, an API-driven Django backend, and real-world constraints like compliance rules, external geocoding, and production deployment.

---

## What the app is for

Trip planning for CDL drivers is more than maps and directions. A route has to stay within legal and operational limits, including:

- driving time constraints
- required breaks
- overnight resets across multi-day trips
- predictable overhead such as pickup/drop-off time and fueling cadence

ELD Navigator takes a start/end trip request and returns a plan designed around those constraints.

---

## What it does

### Core capabilities
- **Trip planning** endpoint that returns a plan with summary, route, stops, and **ELD logs**
  - `POST /api/trip/plan`
- **Geocoding** through a Nominatim proxy
  - `GET /api/trip/geocode?q=...`
- **Driver profile** persistence
  - `GET/PUT /api/profile` or `GET/PUT /api/trip/profile` depending on deployment wiring
- **Saved trips**
  - `GET/POST /api/trip/saved`
  - `GET/DELETE /api/trip/saved/<id>`
- **Health check**
  - `GET /api/healthz` returning `{"status":"ok"}`

### HOS rules modeled
- 70 hr / 8 day cycle
- 11 hr max driving
- 14 hr on-duty window
- 10 hr off-duty reset
- 30 min break after 8 hr driving
- 1 hr pickup + 1 hr drop-off
- Fuel stop every 1,000 miles (30 min)

---

## Tech stack

### Frontend
- React
- TanStack Start / TanStack Router / TanStack Query
- Vite
- Tailwind CSS
- Leaflet + React Leaflet
- React Hook Form + Zod
- Radix UI primitives

### Backend
- Django + Django REST Framework
- django-cors-headers
- dj-database-url
- gunicorn
- psycopg2-binary
- whitenoise

### Deployment
- Frontend deploys to **Vercel** from the repo root
- Backend deploys to **Vercel** from `backend/`
- Repo docs call out external API rate limits and Vercel function timeouts as operational considerations

---

## API overview

Base path: `/api`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/healthz` | Health check |
| POST | `/api/trip/plan` | Trip planning + HOS calculation |
| GET | `/api/trip/geocode?q=...` | Geocoding via Nominatim proxy |
| GET | `/api/profile` | Get driver profile |
| PUT | `/api/profile` | Upsert driver profile |
| GET | `/api/trip/saved` | List saved trips |
| POST | `/api/trip/saved` | Save a trip |
| GET | `/api/trip/saved/<id>` | Retrieve a saved trip |
| DELETE | `/api/trip/saved/<id>` | Delete a saved trip |

---

## Local development

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend
```bash
bun install
bun run dev
```

Create a repo-root `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## Deployment notes

The repository includes a full deployment guide in `DEPLOYMENT.md`. The important pieces are:

- Backend uses `backend/vercel.json`
- Production backend requires:
  - `DJANGO_SECRET_KEY`
  - `DATABASE_URL` (Postgres recommended; Vercel filesystem is read-only)
  - `DJANGO_ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`
- Frontend uses `VITE_API_BASE_URL` to point to the deployed backend
- Public geocoding/routing APIs can be rate-limited
- Long-running planning requests may hit Vercel function timeout limits

---

## What this project demonstrates

### Full-stack engineering
- Clear frontend ↔ backend contract design
- Real persistence for profiles and saved trips
- Deployment-ready configuration with env vars, CORS, hosts, and database setup

### Product thinking
- Real compliance constraints are modeled directly in the workflow
- The app solves a realistic user problem: plan, visualize, save, and revisit trips

### Frontend craftsmanship
- Modern routing and data-fetching patterns
- Form validation and reusable UI primitives
- Map-based route visualization

---

## Roadmap

Reasonable next steps for this app:
- automated tests for API and HOS edge cases
- better observability for planning requests
- self-hosted routing/geocoding for higher throughput
- printable or exportable log-sheet generation improvements

---

## Contact

If you're a recruiter or hiring manager evaluating full-stack or frontend roles, this repo is intended to make it easy to discuss:
- architecture decisions
- how the HOS rules are modeled
- API contract design
- deployment tradeoffs

Repo link: [ELD Navigator Repo](https://github.com/Mrtnimn/eld-navigator "Electronic Logging Device (ELD) Navigator Repo")

Repo link: [ELD Navigator Repo](https://github.com/Mrtnimn/eld-navigator "Electronic Logging Device (ELD) Navigator Repo")