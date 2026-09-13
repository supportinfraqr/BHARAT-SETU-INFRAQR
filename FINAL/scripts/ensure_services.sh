#!/usr/bin/env bash
# BSS prod service watchdog.
# Ensures the core containers are running; idempotent (no-op when all are up).
# Installed on the prod server and run every minute from cron, so if a
# concurrent deploy removes a container (nginx then 502s), it self-heals.

set -u

COMPOSE_DIR="${BSS_COMPOSE_DIR:-$HOME/bss/FINAL/deploy-prod}"
cd "$COMPOSE_DIR" || exit 0

SERVICES="bss-backend-1 bss-frontend-1 bss-nginx-1 bss-db-1 bss-redis-1"

for name in $SERVICES; do
  if [ -z "$(sudo docker ps -q -f "name=^/${name}$" -f status=running)" ]; then
    svc="${name#bss-}"
    svc="${svc%-1}"
    echo "[$(date -Is)] $name not running — starting '$svc'"
    sudo docker compose up -d "$svc" 2>&1 | tail -2
  fi
done
