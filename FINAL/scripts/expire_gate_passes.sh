#!/usr/bin/env bash
# BSS gate-pass auto-expiry (Gate Pass Management System §7).
#
# Flips ACTIVE gate passes past their valid-to date to EXPIRED (invalidating the
# QR) and notifies the worker + issuing contractor. Safe to run repeatedly.
#
# Install in cron on the server (hourly is enough), e.g.:
#   PROD:    0 * * * * BSS_COMPOSE_DIR=$HOME/bss/FINAL/deploy-prod BSS_DOCKER="sudo docker" bash $HOME/expire_gate_passes.sh >> $HOME/bss_gate_expiry.log 2>&1
#   STAGING: 0 * * * * BSS_COMPOSE_DIR=$HOME/bss/FINAL/deploy BSS_DOCKER="docker" bash $HOME/expire_gate_passes.sh >> $HOME/bss_gate_expiry.log 2>&1
#
# Usage: bash expire_gate_passes.sh

set -euo pipefail

COMPOSE_DIR="${BSS_COMPOSE_DIR:-$HOME/bss/FINAL/deploy-prod}"
DOCKER="${BSS_DOCKER:-sudo docker}"

cd "$COMPOSE_DIR"
echo "[$(date -Is)] Expiring gate passes in $COMPOSE_DIR …"
# shellcheck disable=SC2086
$DOCKER compose exec -T backend python manage.py expire_gate_passes
echo "[$(date -Is)] Done."
