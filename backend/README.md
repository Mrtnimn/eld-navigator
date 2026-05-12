# ELD Trip Planner — Django API

Django + DRF backend that mirrors the React frontend's HOS engine and exposes the planning, geocoding, profile, and saved-trip endpoints used by the app.

## Endpoints (`/api`)

| Method | Path                      | Purpose                                     |
| ------ | ------------------------- | ------------------------------------------- |
| GET    | `/api/healthz`            | Health check                                |
| POST   | `/api/trip/plan`          | Plan trip → summary, route, stops, ELD logs |
| GET    | `/api/trip/geocode?q=...` | Geocode (Nominatim)                         |
| GET    | `/api/profile`            | Get driver profile                          |
| PUT    | `/api/profile`            | Upsert driver profile                       |
| GET    | `/api/trip/saved`         | List saved trips                            |
| POST   | `/api/trip/saved`         | Save a trip                                 |
| GET    | `/api/trip/saved/<id>`    | Get one saved trip                          |
| DELETE | `/api/trip/saved/<id>`    | Delete a saved trip                         |

## Local

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

## Deploy (Vercel)

1. Push `/backend` to its own GitHub repo (or set Vercel root dir to `backend`).
2. Add env vars in Vercel:
   - `DJANGO_SECRET_KEY` — random string
   - `DATABASE_URL` — Postgres URL (Neon, Supabase, Railway). SQLite will not persist on Vercel.
   - `NODE_ENV=production`
3. Deploy. The API will be at `https://<your-app>.vercel.app/api/...`.
4. In the React app set `VITE_API_BASE=https://<your-app>.vercel.app` and redeploy.

## Deploy (Railway)

1. Push code to GitHub.
2. Go to https://railway.app, sign in with GitHub, and create a new project.
3. Select "Deploy from GitHub repo" and choose this repo.
4. Railway auto-detects the Dockerfile and deploys.
5. Add env vars in Railway:
   - `DJANGO_SECRET_KEY` — random string
   - `DATABASE_URL` — Postgres URL (Railway, Neon, Supabase)
   - `NODE_ENV=production`
6. Railway runs `docker build` and deploys. The API will be at your Railway domain (`https://<app-name>.railway.app/api/...`).
7. For migrations, run in Railway shell: `python manage.py migrate` (or auto-run in Procfile `release` phase).

## HOS Rules

- Property-carrying driver, 70 hr / 8 day cycle
- 11 hr max driving / 14 hr on-duty window / 10 hr off-duty reset
- 30 min break after 8 hr driving
- 1 hr pickup + 1 hr drop-off
- Fuel stop every 1,000 mi (30 min)
