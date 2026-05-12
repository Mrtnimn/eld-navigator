FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files (skip database operations during build)
ENV DJANGO_SETTINGS_MODULE=eld_planner.settings
ENV DATABASE_URL=sqlite:////tmp/db.sqlite3
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Run migrations (optional, can be done separately)
# RUN python manage.py migrate

# Expose port (Railway will set $PORT)
EXPOSE 8000

# Run gunicorn on the port Railway provides (default 8000)
CMD exec gunicorn eld_planner.wsgi:application --bind 0.0.0.0:${PORT:-8000}
