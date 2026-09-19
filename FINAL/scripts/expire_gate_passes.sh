#!/usr/bin/env bash
# BSS gate-pass auto-expiry (Gate Pass Management System §7).
#
# Flips ACTIVE gate passes past their valid-to date to EXPIRED (invalidating the
# QR) and notifies the worker + issuing contractor. Safe to run repeatedly.
#
# Mode is chosen with BSS_MODE (default prod):
#   local   — this dev machine (venv manage.py)
#   staging — staging server (docker compose, no sudo)
#   prod    — production server (sudo docker compose)
#
# Usage:
#   BSS_MODE=local   bash expire_gate_passes.sh
#   BSS_MODE=staging bash expire_gate_passes.sh
#   BSS_MODE=prod    bash expire_gate_passes.sh
#
# Install the hourly cron with install_expire_cron.sh.

set -euo pipefail

MODE="${BSS_MODE:-prod}"

run_manage() {
  # $1 = command to run (without the manage.py prefix)
  case "$MODE" in
    local)
      local backend="${BSS_BACKEND_DIR:-$HOME/BSS_Project/FINAL/Backend}"
      cd "$backend"
      ./venv/bin/python manage.py "$@"
      ;;
    staging)
      local compose="${BSS_COMPOSE_DIR:-$HOME/bss/FINAL/deploy}"
      cd "$compose"
      docker compose exec -T backend python manage.py "$@"
      ;;
    prod)
      local compose="${BSS_COMPOSE_DIR:-$HOME/bss/FINAL/deploy-prod}"
      cd "$compose"
      sudo docker compose exec -T backend python manage.py "$@"
      ;;
    *)
      echo "Unknown BSS_MODE '$MODE' (expected local|staging|prod)." >&2
      exit 2
      ;;
  esac
}

echo "[$(date -Is)] Expiring gate passes (mode=$MODE) …"
run_manage expire_gate_passes
echo "[$(date -Is)] Done."
