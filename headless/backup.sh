#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-/var/backups/bss-attendance}"
exec /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance backup --output "$OUT"
