#!/bin/sh
set -e

echo "== Applying migrations =="
python manage.py migrate --noinput

echo "== Ensuring document master catalog (mandatory seed) =="
python manage.py seed_document_master || echo "WARNING: seed_document_master failed"

echo "== Ensuring statutory compliance catalog (mandatory seed) =="
python manage.py seed_compliance_master || echo "WARNING: seed_compliance_master failed"

echo "== Ensuring leave-type catalog (mandatory seed) =="
python manage.py seed_leave_types || echo "WARNING: seed_leave_types failed"

echo "== Ensuring default letter templates (mandatory seed) =="
python manage.py seed_letter_templates || echo "WARNING: seed_letter_templates failed"

# One-time CLRA library import (state-wise register templates + applicability
# matrix). Baked into the image at data/clra-registers.zip; skipped when the
# library is already present so versions aren't churned on every deploy. Runs
# before seed_register_config so the seeded mappings target real templates.
CLRA_ZIP="${CLRA_ZIP:-/app/data/clra-registers.zip}"
if [ -f "$CLRA_ZIP" ]; then
  echo "== Ensuring CLRA register library (one-time import) =="
  python manage.py import_clra_templates --zip "$CLRA_ZIP" --only-if-empty \
    || echo "WARNING: import_clra_templates failed"
  python manage.py import_clra_applicability --zip "$CLRA_ZIP" --only-if-empty \
    || echo "WARNING: import_clra_applicability failed"
fi

echo "== Ensuring CLRA register field mappings + calculation rules (mandatory seed) =="
python manage.py seed_register_config || echo "WARNING: seed_register_config failed"

echo "== Collecting static =="
# Incremental (no --clear): only copies changed files, so the container comes
# back up fast and the site isn't briefly 502 during a deploy.
python manage.py collectstatic --noinput 2>/dev/null || echo "collectstatic skipped"

echo "== Starting gunicorn =="
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120