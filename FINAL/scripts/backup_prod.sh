#!/usr/bin/env bash
# BSS production backup — PostgreSQL dump + media volume archive, with retention.
# Run on the PROD server (ec2-13-235-161-192). Safe to run repeatedly.
#
# Usage:  bash backup_prod.sh
# Restore: see AGENTS.md ("Restore" section).

set -euo pipefail

BACKUP_DIR="${BSS_BACKUP_DIR:-$HOME/bss_backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
KEEP_DB="${BSS_KEEP_DB:-14}"       # keep the last N daily DB dumps
KEEP_MEDIA="${BSS_KEEP_MEDIA:-7}"  # keep the last N media archives
COMPOSE_DIR="${BSS_COMPOSE_DIR:-$HOME/bss/FINAL/deploy-prod}"

mkdir -p "$BACKUP_DIR"
cd "$COMPOSE_DIR"

echo "[$(date -Is)] Backing up database…"
sudo docker compose exec -T db pg_dump -U bss -d bss_prod | gzip > "$BACKUP_DIR/bss_prod_db_$STAMP.sql.gz"

echo "[$(date -Is)] Backing up media (uploads / aadhaar / digilocker)…"
sudo docker compose exec -T backend tar czf - -C /data/media . > "$BACKUP_DIR/bss_prod_media_$STAMP.tar.gz"

# Retention — newest first, delete everything past the keep count.
ls -1t "$BACKUP_DIR"/bss_prod_db_*.sql.gz 2>/dev/null | tail -n +$((KEEP_DB + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/bss_prod_media_*.tar.gz 2>/dev/null | tail -n +$((KEEP_MEDIA + 1)) | xargs -r rm -f

echo "[$(date -Is)] Done. Latest backups:"
ls -lht "$BACKUP_DIR" | head -6
