#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi
command -v python3 >/dev/null || { echo "python3 is required for bss-attendancectl." >&2; exit 1; }
command -v tar >/dev/null || { echo "tar is required." >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR=/opt/bss-attendance
DATA_DIR=/var/lib/bss-attendance
SERVICE_FILE=/etc/systemd/system/bss-attendance.service
ENV_FILE=/etc/bss-attendance.env

if ! id bss >/dev/null 2>&1; then
  useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin bss
fi
install -d -m 0750 -o bss -g bss "$DATA_DIR"
install -d -m 0755 "$INSTALL_DIR"
install -m 0755 "$HERE/attendance-engine" "$INSTALL_DIR/attendance-engine"
install -m 0755 "$HERE/bss-attendancectl" "$INSTALL_DIR/bss-attendancectl"
install -m 0644 "$HERE/bss-attendance.service" "$SERVICE_FILE"
if [ ! -f "$ENV_FILE" ]; then
  install -m 0600 "$HERE/bss-attendance.env.example" "$ENV_FILE"
fi

systemctl daemon-reload
systemctl enable --now bss-attendance.service
sleep 2
systemctl --no-pager --full status bss-attendance.service || true
echo
echo "Installed. Next:"
echo "  1. sudo -u bss $INSTALL_DIR/bss-attendancectl --home $DATA_DIR status"
echo "  2. sudo -u bss $INSTALL_DIR/bss-attendancectl --home $DATA_DIR activate request --phone <employer-phone>"
echo "  3. Verify OTP and add cameras. See HEADLESS_LINUX.md."
