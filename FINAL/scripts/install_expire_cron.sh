#!/usr/bin/env bash
# Install the hourly gate-pass auto-expiry cron (Gate Pass Management System §7).
#
# Idempotent — re-running replaces the previous entry instead of duplicating it.
# Run on the target machine:
#   BSS_MODE=local   bash install_expire_cron.sh   # this dev machine
#   BSS_MODE=staging bash install_expire_cron.sh   # staging server
#   BSS_MODE=prod    bash install_expire_cron.sh   # production server (when needed)
#
# Remove with:  crontab -l | grep -v expire_gate_passes | crontab -

set -euo pipefail

MODE="${BSS_MODE:-prod}"
case "$MODE" in local|staging|prod) ;; *) echo "Unknown BSS_MODE '$MODE'." >&2; exit 2 ;; esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_SRC="$SCRIPT_DIR/expire_gate_passes.sh"
RUNNER_DST="$HOME/expire_gate_passes.sh"
LOG="$HOME/bss_gate_expiry.log"
LINE="0 * * * * BSS_MODE=$MODE bash $RUNNER_DST >> $LOG 2>&1"

cp "$RUNNER_SRC" "$RUNNER_DST"
chmod +x "$RUNNER_DST"

tmp="$(mktemp)"
crontab -l 2>/dev/null | grep -vF "$RUNNER_DST" > "$tmp" || true
echo "$LINE" >> "$tmp"
crontab "$tmp"
rm -f "$tmp"

echo "Installed hourly gate-pass expiry cron (mode=$MODE):"
echo "  $LINE"
echo
echo "Current crontab:"
crontab -l
