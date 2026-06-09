# ELD Navigator — HOS-Compliant Trip Planner

**ELD Navigator** is a full-stack trip planning app for **property-carrying drivers** that generates a **Hours-of-Service (HOS)-compliant** multi-day plan with route guidance, stops, and ELD-style daily logs.

This project demonstrates end-to-end product engineering: a modern React frontend, an API-driven Django backend, and real-world constraints such as compliance rules, geocoding, saved trips, and deployment readiness.

---

## Why this project exists

Trip planning for CDL drivers is more than choosing a route. A workable plan must also respect legal and operational limits such as:

- driving time restrictions
- required breaks
- overnight resets across multi-day trips
- pickup, drop-off, and fueling overhead

ELD Navigator takes a start/end trip request and returns a plan designed around those constraints.

---

## What it does

### For drivers and dispatch-style workflows
- Calculates a trip plan that includes:
  - summary
  - route
  - stops
  - ELD-style logs
- Supports geocoding through a Nominatim proxy
- Lets users save, retrieve, and delete trips
- Stores and updates a driver profile
- Exposes a health check for deployment monitoring

### Confirmed backend endpoints
- `GET /api/healthz`
- `POST /api/trip/plan`
- `GET /api/trip/geocode?q=...`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/trip/saved`
- `POST /api/trip/saved`
- `GET /api/trip/saved/<id>`
- `DELETE /api/trip/saved/<id>`

---

## HOS rules modeled

This project models standard property-carrying driver rules, including:

- 70-hour / 8-day cycle
- 11-hour driving limit
- 14-hour on-duty window
- 10-hour off-duty reset
- 30-minute break after 8 hours of driving
- 1 hour pickup + 1 hour drop-off
- Fuel stop every 1,000 miles

These rules are built into the trip planning flow so the output is useful in real-world operational settings.

---

## Tech stack

### Frontend
- React
- TanStack Start
- TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- Leaflet + React Leaflet
- React Hook Form
- Zod
- Radix UI primitives

### Backend
- Django
- Django REST Framework
- django-cors-headers
- dj-database-url
- gunicorn
- psycopg2-binary
- whitenoise

### Deployment
- Frontend deploys to **Vercel** from the repo root
- Backend deploys to **Vercel** from `backend/`
- Production setup uses environment variables and Postgres

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

Then add a repo-root `.env` file:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## Deployment notes

The repository includes a deployment guide in `DEPLOYMENT.md`. Key points:

- Backend uses `backend/vercel.json`
- Production backend requires:
  - `DJANGO_SECRET_KEY`
  - `DATABASE_URL`
  - `DJANGO_ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`
- Frontend uses `VITE_API_BASE_URL` to point to the deployed backend
- Public routing and geocoding APIs can be rate-limited
- Long planning requests may hit Vercel function timeout limits

---

## What this project demonstrates

### Full-stack engineering
- Frontend and backend contract design
- Real persistence for profiles and saved trips
- Deployment-ready configuration and production awareness

### Product thinking
- Real-world compliance rules are modeled into the workflow
- The app supports a full user flow: plan, visualize, save, and revisit trips

### Frontend craftsmanship
- Modern routing and data-fetching patterns
- Form validation and reusable UI primitives
- Map-based route visualization

### Backend craftsmanship
- API design with Django REST Framework
- Structured trip planning logic
- Support for external services and environment-driven deployment

---

## Roadmap

Potential next improvements:
- automated tests for API and HOS edge cases
- better observability for planning requests
- self-hosted routing/geocoding for higher throughput
- improved log sheet generation and export support

---

## Contact

If you're a recruiter, hiring manager, or technical visitor reviewing this repository, this project is meant to make it easy to discuss:

- architecture decisions
- HOS rule modeling
- API contract design
- frontend experience and map-based UX
- deployment tradeoffs

Repo Link:[Click here to visit thee ELD Navigator repo](https://github.com/Mrtnimn/eld-navigator)