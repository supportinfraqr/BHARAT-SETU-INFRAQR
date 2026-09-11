#!/bin/sh
set -e

echo "== Applying migrations =="
python manage.py migrate --noinput

echo "== Collecting static =="
python manage.py collectstatic --noinput --clear 2>/dev/null || echo "collectstatic skipped"

echo "== Starting gunicorn =="
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120