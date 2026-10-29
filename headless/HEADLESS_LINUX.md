# BSS Attendance Engine — Headless Linux

This guide runs the BSS attendance engine on an Ubuntu/Debian server with no
desktop session, Tauri UI, tray, or display server. The engine connects to
local RTSP cameras, performs face detection and matching, queues attendance
events, and syncs with BSS.

The engine binds only to `127.0.0.1`. Use an SSH tunnel for live view and
administration from another machine. Never expose the engine port publicly.

## Requirements

- Ubuntu 22.04 or 24.04, x86_64
- root access for installation
- `python3` for `bss-attendancectl`
- 4 GB RAM minimum; 8 GB recommended
- 3 GB free under `/opt` and `/var/lib/bss-attendance`
- RTSP camera reachable from the server
- optional NVIDIA GPU with a supported driver for GPU inference
- outbound HTTPS access to BSS

## Bundle contents

```
attendance-engine                 Python engine and bundled ONNX models
bss-attendancectl                 local command-line control
install-headless.sh               installer
uninstall-headless.sh             uninstaller
bss-attendance.service            systemd unit
bss-attendance.env.example        environment template
backup.sh                         database/config backup helper
HEADLESS_LINUX.md                 this guide
```

## Install

```bash
tar -xzf BSS-Attendance-<version>-Headless-Linux-x86_64.tar.gz
cd bss-attendance
sudo ./install-headless.sh
```

The installer creates:

```
/opt/bss-attendance/              engine and CLI
/var/lib/bss-attendance/          data, database, gallery, models, logs
/etc/bss-attendance.env           environment
/etc/systemd/system/bss-attendance.service
```

The service starts automatically. It remains unactivated until activation.

## Service commands

```bash
sudo systemctl status bss-attendance
sudo systemctl restart bss-attendance
sudo systemctl stop bss-attendance
sudo systemctl start bss-attendance
sudo systemctl enable bss-attendance
sudo journalctl -u bss-attendance -f
sudo journalctl -u bss-attendance --since "1 hour ago"
```

Engine file log:

```bash
sudo tail -n 200 /var/lib/bss-attendance/engine.log
```

## CLI basics

```bash
sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance health
sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance status
sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance doctor
```

Optional shell shortcut:

```bash
sudo tee /usr/local/bin/bss-attendancectl >/dev/null <<'SH'
#!/usr/bin/env bash
exec sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance "$@"
SH
sudo chmod +x /usr/local/bin/bss-attendancectl
```

Then:

```bash
bss-attendancectl status
bss-attendancectl health
bss-attendancectl doctor
```

Add `--json` after `--home` for raw JSON:

```bash
sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance --json status
```

## Activate the device

Activation is required once. The employer owner receives an OTP.

```bash
bss-attendancectl activate request --phone 9999999999
bss-attendancectl activate verify --phone 9999999999 --otp 123456
```

The verify command returns an `activationToken`. Complete activation:

```bash
bss-attendancectl activate complete \
  --token '<activationToken>' \
  --name 'NOIDA attendance server'
```

Verify:

```bash
bss-attendancectl status
bss-attendancectl sites
```

The device should become activated and show the employer's sites.

## Sites and cameras

List sites:

```bash
bss-attendancectl sites
```

Test an RTSP feed before saving:

```bash
bss-attendancectl camera test --rtsp 'rtsp://user:password@192.168.1.20/stream'
```

Add a camera using the BSS site ID from `bss-attendancectl sites`:

```bash
bss-attendancectl camera add \
  --label 'Main Gate' \
  --site 'BSS...' \
  --rtsp 'rtsp://user:password@192.168.1.20/stream'
```

Optional DVR channel:

```bash
bss-attendancectl camera add \
  --label 'Main Gate' \
  --site 'BSS...' \
  --channel 1 \
  --rtsp 'rtsp://user:password@192.168.1.20/stream'
```

After approval and IP allowlisting in BSS, enable sending:

```bash
bss-attendancectl camera mode 1 SENDING
```

Set what the camera is allowed to use for attendance:

```bash
bss-attendancectl camera attendance-mode 1 FACE   # face recognition only
bss-attendancectl camera attendance-mode 1 QR     # worker QR only
bss-attendancectl camera attendance-mode 1 BOTH   # face and QR
```

The setting is saved to BSS and synced to every client. The camera must be online and BSS must be reachable.

List cameras:

```bash
bss-attendancectl cameras
```

Camera connection details are immutable after saving. Remove and add again if
the RTSP URL must change.

## Existing camera ownership

A camera can belong to only one edge device. If the camera is owned by another
device, BSS will show the owner and may require takeover OTP.

```bash
bss-attendancectl camera takeover-otp 1
bss-attendancectl camera claim 1 --otp 123456
```

If the camera is owned by a retired device, remove/reassign it in BSS first.
Setting RTSP on the wrong device will not make it live.

## Workers and face data

```bash
bss-attendancectl workers
```

The table shows:

- worker name
- BSS worker ID
- site
- number of enrolled embeddings
- whether face data is ready

A worker with zero active vectors cannot be detected. Worker self-enrollment uses
five profile photos in BSS; manual client enrollment uses one camera photo.

Select the active matching source:

```bash
bss-attendancectl worker source BSSW... MANUAL
bss-attendancectl worker source BSSW... SELF
```

Capture one manual enrollment photo from a camera:

```bash
bss-attendancectl worker enroll BSSW... --camera 1
```

The command requires exactly one face in the camera frame. Use
`--confirm-mismatch` only after reviewing a wrong-worker warning.

Check gallery status:

```bash
bss-attendancectl --json status
```

Look for `gallery.status` and `gallery.ready`.

## Live view from a remote workstation

Keep the engine local and forward the port over SSH:

```bash
ssh -N -L 8765:127.0.0.1:8765 user@server
```

Then on the workstation:

```bash
curl http://127.0.0.1:8765/api/health
curl http://127.0.0.1:8765/api/status
curl -o snapshot.jpg http://127.0.0.1:8765/snapshot/1
```

MJPEG stream in a browser:

```text
http://127.0.0.1:8765/stream/1
```

Detected workers for a camera:

```bash
bss-attendancectl camera detections 1
```

Save a snapshot through the CLI:

```bash
bss-attendancectl camera snapshot 1 --output /tmp/camera-1.jpg
```

## Resources and GPU

```bash
bss-attendancectl resources get
bss-attendancectl gpu
bss-attendancectl doctor
```

Change CPU, worker concurrency, or GPU settings:

```bash
bss-attendancectl resources set --cpu-cores 4
bss-attendancectl resources set --workers 2
bss-attendancectl resources set --gpu-mode auto
bss-attendancectl resources set --gpu-memory 2048
```

GPU modes: `auto`, `off`, `required`. Restart the service after changing GPU
mode if the engine was already initialized.

NVIDIA checks:

```bash
nvidia-smi
nvidia-smi --query-gpu=name,driver_version,memory.total,memory.used --format=csv
```

CPU-only servers are supported. Face processing will be slower.

## Events and sync

```bash
bss-attendancectl events
bss-attendancectl status
```

Pending events remain in `/var/lib/bss-attendance/events.db` until BSS accepts
them. They survive restarts and internet outages. Unknown faces are not sent.

## Backup

Create a consistent backup online using SQLite backup:

```bash
sudo -u bss /opt/bss-attendance/bss-attendancectl \
  --home /var/lib/bss-attendance backup \
  --output /var/backups/bss-attendance
```

Or use the helper:

```bash
sudo /opt/bss-attendance/backup.sh /var/backups/bss-attendance
```

The zip contains `client.json`, `face_gallery.json`, and `events.db`.

Copy backups off the server.

## Restore

Stop the engine first:

```bash
sudo systemctl stop bss-attendance
sudo -u bss mkdir -p /var/lib/bss-attendance.restore
sudo -u bss unzip /var/backups/bss-attendance/backup.zip -d /var/lib/bss-attendance.restore
sudo -u bss cp -a /var/lib/bss-attendance.restore/. /var/lib/bss-attendance/
sudo chown -R bss:bss /var/lib/bss-attendance
sudo systemctl start bss-attendance
```

Back up the current folder before restoring. Do not restore while the service
is running.

## Update

Keep the data folder and replace only the engine binary:

```bash
sudo systemctl stop bss-attendance
sudo cp /opt/bss-attendance/attendance-engine /opt/bss-attendance/attendance-engine.previous
sudo install -m 0755 attendance-engine /opt/bss-attendance/attendance-engine
sudo install -m 0755 bss-attendancectl /opt/bss-attendance/bss-attendancectl
sudo systemctl start bss-attendance
bss-attendancectl status
```

Rollback:

```bash
sudo systemctl stop bss-attendance
sudo mv /opt/bss-attendance/attendance-engine.previous /opt/bss-attendance/attendance-engine
sudo systemctl start bss-attendance
```

There is no Tauri auto-updater in headless mode.

## Security

- The engine API has no authentication and binds only to `127.0.0.1`.
- Never publish port `8765` directly.
- Use an SSH tunnel or an authenticated reverse proxy for remote access.
- Restrict `/etc/bss-attendance.env` to root.
- Run the engine as the unprivileged `bss` user.
- Protect `/var/lib/bss-attendance`; it contains activation and face data.
- Configure the firewall to allow only required RTSP/BSS traffic.
- Keep the NVIDIA driver and OS patched.

## API reference

The CLI uses these local endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | engine health |
| GET | `/api/status` | device, cameras, gallery, heartbeat |
| GET | `/api/system` | CPU/RAM/GPU/disk/network |
| GET | `/api/events` | recent local events |
| GET | `/api/detections/{id}` | current detected workers |
| GET | `/snapshot/{id}` | current JPEG |
| GET | `/stream/{id}` | MJPEG stream |
| POST | `/api/test-rtsp` | test a camera |
| POST | `/api/activate/request-otp` | request activation OTP |
| POST | `/api/activate/verify-otp` | verify OTP |
| POST | `/api/activate/complete` | activate device |
| POST | `/api/config/refresh` | refresh BSS config |
| POST | `/api/resources` | save resource settings |
| POST | `/api/cameras` | add camera |
| POST | `/api/cameras/{id}/mode` | set LIVE/SENDING |
| POST | `/api/cameras/{id}/attendance-mode` | set FACE/QR/BOTH |
| POST | `/api/workers/{bssId}/face-source` | set MANUAL/SELF source |
| POST | `/api/cameras/{id}/manual-enroll/start` | start one-photo enrollment |
| POST | `/api/cameras/{id}/manual-enroll/capture-one` | capture the enrollment photo |
| POST | `/api/cameras/{id}/manual-enroll/confirm` | sync embeddings to BSS |
| POST | `/api/cameras/{id}/claim` | claim camera |
| POST | `/api/cameras/{id}/takeover-otp` | request takeover OTP |
| POST | `/api/cameras/{id}/test` | test RTSP |
| DELETE | `/api/cameras/{id}` | remove camera |
| POST | `/api/logout` | deactivate local device |

## Troubleshooting

### Engine not reachable

```bash
sudo systemctl status bss-attendance
sudo journalctl -u bss-attendance -n 200 --no-pager
sudo ss -ltnp | grep 8765
```

### Not activated

```bash
bss-attendancectl status
bss-attendancectl sites
```

Complete activation before adding cameras.

### Camera not connecting

```bash
bss-attendancectl camera test --rtsp 'rtsp://...'
sudo journalctl -u bss-attendance -f
```

Check RTSP credentials, network routing, TCP reachability, and BSS allowed IP.

### Camera owned by another device

The client cannot use it until BSS removes/reassigns it or takeover OTP is
completed. Check `bss-attendancectl cameras` for the owner.

### No workers detected

```bash
bss-attendancectl workers
bss-attendancectl status
```

0 embeddings means photos are not enrolled in BSS. Five face photos are
required. After enrollment, wait for gallery sync and restart the service if
needed.

### GPU detected but CPU fallback

```bash
bss-attendancectl gpu
nvidia-smi
```

If the face engine has never initialized because no camera is sending or the
gallery is empty, the provider remains CPU. Check `bss-attendancectl doctor`.
If a camera is sending and GPU still falls back, inspect:

```bash
sudo journalctl -u bss-attendance -n 300 --no-pager
sudo grep -i 'onnx\|gpu\|cuda\|dml' /var/lib/bss-attendance/engine.log | tail -100
```

### Disk or database

```bash
df -h /var/lib/bss-attendance
ls -lh /var/lib/bss-attendance
bss-attendancectl events
```

## Uninstall

```bash
sudo ./uninstall-headless.sh
```

Data remains in `/var/lib/bss-attendance`. To remove data too:

```bash
sudo ./uninstall-headless.sh --purge
```
