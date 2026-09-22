#!/usr/bin/env bash
# Local dev watchdog: keep the BSS frontend running on the expected port.
#
# Runs from cron every minute. If nothing is listening on the target port it
# stops any stale/other Next dev server (only one can run per project) and
# starts the frontend there. Override the port with BSS_FRONTEND_PORT.
set -u

APP_DIR="/home/oem/BSS_Project/FINAL/Frontend/BSS_Gravity"
PORT="${BSS_FRONTEND_PORT:-3003}"
LOG="/tmp/bss_frontend.log"
WATCH_LOG="/tmp/bss_frontend_watchdog.log"

# cron has a minimal PATH — resolve the nvm node binary explicitly.
NODE_BIN="$(ls -d /home/oem/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
[ -x "$NODE_BIN" ] || exit 0
export PATH="$(dirname "$NODE_BIN"):$PATH"

# Already serving on the target port? Nothing to do.
if ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
  exit 0
fi

# Stop any stale/other Next dev server so the port cannot drift.
pkill -f "next dev --webpack" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 1

cd "$APP_DIR" || exit 0
# Run the local next binary directly (no npm, so no PATH/shebang issues).
setsid "$NODE_BIN" node_modules/next/dist/bin/next dev --webpack --port "${PORT}" \
  >"${LOG}" 2>&1 </dev/null &
echo "$(date -Is) started frontend on port ${PORT} (node ${NODE_BIN})" >> "$WATCH_LOG"
