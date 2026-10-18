#!/usr/bin/env bash
# Sync audit-runner status.json files into AuditJob rows.
# The runner has no DB access; this BSS-side command does.
set -euo pipefail
MODE="${BSS_MODE:-local}"
case "$MODE" in
  local)
    cd "$(dirname "$0")/../Backend"
    exec .venv/bin/python manage.py sync_audit_jobs
    ;;
  staging)
    cd "$HOME/bss/FINAL/deploy-staging"
    exec docker compose exec -T backend python manage.py sync_audit_jobs
    ;;
  prod)
    cd "$HOME/bss/FINAL/deploy-prod"
    exec sudo docker compose exec -T backend python manage.py sync_audit_jobs
    ;;
  *)
    echo "Unknown BSS_MODE: $MODE" >&2
    exit 2
    ;;
esac
