#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

systemctl disable --now bss-attendance.service 2>/dev/null || true
rm -f /etc/systemd/system/bss-attendance.service
systemctl daemon-reload
rm -rf /opt/bss-attendance

if [ "${1:-}" = "--purge" ]; then
  rm -rf /var/lib/bss-attendance /etc/bss-attendance.env
  echo "Removed engine and engine data."
else
  echo "Removed engine. Data remains in /var/lib/bss-attendance."
  echo "Use --purge to remove data and /etc/bss-attendance.env."
fi
