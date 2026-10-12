#!/bin/sh
set -e

echo "== Applying migrations =="
python manage.py migrate --noinput

# Single seeder entrypoint — see bss_core/seeders/. Idempotent; seeds the full
# mandatory catalogue (documents, compliance, leave types, letter templates,
# register config, CLRA register library) on every start / fresh deployment.
echo "== Seeding mandatory catalogs =="
python manage.py seed_all || echo "WARNING: seed_all reported failures"

echo "== Collecting static =="
# Incremental (no --clear): only copies changed files, so the container comes
# back up fast and the site isn't briefly 502 during a deploy.
python manage.py collectstatic --noinput 2>/dev/null || echo "collectstatic skipped"

echo "== Starting gunicorn =="
# gthread (threaded workers) so slow provider I/O (Aadhaar/Sandbox waits of up
# to ~12s) does not hog a whole sync worker: concurrency = workers × threads.
# Tunable via GUNICORN_WORKERS / GUNICORN_THREADS.
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 \
  --worker-class gthread \
  --workers "${GUNICORN_WORKERS:-3}" \
  --threads "${GUNICORN_THREADS:-8}" \
  --timeout 180
