# ELD Trip Planner — Deployment Guide

End-to-end deployment of the **TanStack Start (React) frontend** and the
**Django backend** to Vercel, with source hosted on GitHub.

---

## 1. Prerequisites

- Node.js 20+ and [Bun](https://bun.sh) (or npm)
- Python 3.11+
- A GitHub account
- A Vercel account (free tier is fine)
- (Optional) A managed Postgres database — Neon, Supabase, or Vercel Postgres

## 2. Project layout

```
/                    → TanStack Start frontend (deploys to Vercel)
/backend             → Django API (deploys as Vercel Python serverless)
```

The frontend talks to the backend through these endpoints:

- `GET  /api/trip/geocode?q=…`        Nominatim proxy
- `POST /api/trip/plan`               trip planning + HOS calculation
- `GET/PUT /api/trip/profile`         driver profile
- `GET/POST /api/trip/saved`          saved trips

## 3. Push the code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/eld-trip-planner.git
git branch -M main
git push -u origin main
```

## 4. Deploy the backend (Django) to Vercel

The backend ships with `backend/vercel.json` configured for the Python runtime.

1. Go to https://vercel.com/new → Import your GitHub repo.
2. **Root Directory**: `backend`
3. **Framework Preset**: Other
4. **Install Command**: `pip install -r requirements.txt`
5. **Environment Variables**:
   - `DJANGO_SECRET_KEY` — long random string
   - `DATABASE_URL` — Postgres connection string
   - `DJANGO_ALLOWED_HOSTS` — `*.vercel.app,<your-frontend-domain>`
   - `CORS_ALLOWED_ORIGINS` — `https://<your-frontend>.vercel.app`
6. Deploy. You'll get a URL like `https://eld-backend-xyz.vercel.app`.
7. Run migrations once locally against the production DB:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgres://…"
python manage.py migrate
```

## 5. Deploy the frontend (TanStack Start) to Vercel

1. In Vercel, **Add New → Project** and import the same GitHub repo a second time.
2. **Root Directory**: repo root (`.`)
3. **Framework Preset**: Vite
4. **Build Command**: `bun run build` (or `npm run build`)
5. **Output Directory**: `dist`
6. **Environment Variables**:
   - `VITE_API_BASE_URL` → `https://eld-backend-xyz.vercel.app`
7. Deploy.

If the frontend fetches the backend via relative `/api/...`, add a rewrite in
`vercel.json` at the repo root:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://eld-backend-xyz.vercel.app/api/:path*" }
  ]
}
```

## 6. Local development

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**Frontend**

```bash
bun install
bun run dev      # http://localhost:3000
```

Set `VITE_API_BASE_URL=http://localhost:8000` in `.env` at the repo root.

## 7. Post-deploy checklist

- [ ] Backend `/healthz` returns `{"status":"ok"}`
- [ ] Frontend loads, location autocomplete returns suggestions
- [ ] "Calculate Compliance Route" returns a plan and renders the map
- [ ] Driver profile saves and reloads
- [ ] CORS headers include your frontend domain

## 8. Notes & caveats

- **Nominatim/OSRM** are free public APIs with a 1 req/sec rate limit.
  For production traffic, self-host or switch to Mapbox/Google.
- Vercel Python functions have a 10s timeout on the Hobby plan; upgrade
  to Pro (60s) if planning requests time out.
- The Django app uses SQLite by default. **Always** set `DATABASE_URL`
  in production — the Vercel filesystem is read-only.
