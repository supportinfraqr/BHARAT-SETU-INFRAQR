# BSS deployment & environment rules

## Environments

| | Staging | Production (live) |
|---|---|---|
| Host | `ec2-3-109-68-143.ap-south-1.compute.amazonaws.com` | `ec2-13-235-161-192.ap-south-1.compute.amazonaws.com` |
| IP | `3.109.68.143` | `13.235.161.192` |
| SSH user | `ubuntu` | `ubuntu` |
| Key | `/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem` | `/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem` |
| App path | `~/bss/FINAL` | `~/bss/FINAL` |
| Compose dir | `~/bss/FINAL/deploy-staging` | `~/bss/FINAL/deploy-prod` |
| Docker | `docker compose …` (no sudo) | `sudo docker compose …` |
| Database | `bss_final` | `bss_prod` |
| URL | **`bharat-shram-setu-staging.bharatshramsetu.com`** | **`login.bharatshramsetu.com`** |
| Purpose | pre-prod testing | real / demo users |

**Video-attendance server (separate — NOT a BSS app host):**
- Host `15.206.193.173` (`ec2-15-206-193-173.ap-south-1.compute.amazonaws.com`), same staging key.
- Runs the CCTV / face-attendance pipeline only: `~/bss/FINAL/video-attendance/deploy` (compose project **`attendance`** → `attendance-attendance-1` + `attendance-db-1`).
- The BSS backend reaches it via `ATTENDANCE_CONTROL_URL` / `ATTENDANCE_CONTROL_TOKEN`.
- **Never** deploy the BSS app stack (`deploy-staging/`, backend, frontend) here — the BSS staging app lives on `3.109.68.143`.

**Mobile frontend server (separate — frontend only), hosts BOTH mobile sites:**
- Host `43.204.194.237` (`ip-172-31-15-15`), Ubuntu 26.04, key `FINAL/Requirements/mlogin.bharatshramsetu.com.pem` (`chmod 400` first).
- Runs **mobile PROD + mobile STAGING**, frontend-only (no backend/db), from `~/bss/FINAL/deploy-mobile` (compose project **`bss-mobile`** → `frontend-prod` + `nginx`; `frontend-staging` is behind the **`staging` profile**). Built from the `Mobile/` source (a copy of `Web/`).
  - **mobile PROD** → `https://mlogin.bharatshramsetu.com` — backend = prod `login.bharatshramsetu.com`.
  - **mobile STAGING** → `https://mlogin-staging.bharatshramsetu.com` — backend = staging `bharat-shram-setu-staging.bharatshramsetu.com`. **NOT live yet**: enable the commented nginx server block only after the DNS A record → `.237` and a certbot cert exist (a missing cert otherwise crashes nginx and takes prod mobile down).
- `/media` & `/static` are proxied to the matching main app server. TLS via certbot (`/etc/letsencrypt/live/<domain>`).
- Deploy: rsync `Mobile/` + `deploy-mobile/`; prod → `sudo docker compose up -d --build frontend-prod`; staging → add `--profile staging` and enable the staging nginx block. Never touches prod backend/data.

Staging and production are separate servers with separate databases. Data on one does not affect the other.

## Repository layout (FINAL/)

```
FINAL/
  Backend/          # common backend (Django) — used by every environment
  Web/              # web frontend (Next.js)
  Mobile/           # mobile frontend (separate copy of Web/, mobile-optimised deploy)
  deploy-staging/           # STAGING deploy tree (compose + per-role folders + .env)
    backend/        #   backend image (Dockerfile)
    web/            #   web nginx conf
    mobile/         #   mobile prod + staging (compose + nginx)  — runs on the .237 host
    db/             #   DB seed
    docker-compose.yml
  deploy-prod/      # PROD deploy tree (same layout: backend/ web/ db/)
  video-attendance/ # CCTV pipeline (attendance server)
  scripts/          # ops scripts (watchdog, backups, cron installers)
```

**Where each piece runs:**

| Server | Role |
|---|---|
| `13.235.161.192` (`login.bharatshramsetu.com`) | **prod backend** + **prod web** (`deploy-prod/`) |
| `3.109.68.143` (staging) | **staging backend** + **staging web** (`deploy-staging/`) |
| `43.204.194.237` (`mlogin…`) | **mobile prod** + **mobile staging** (`deploy-mobile/`) |
| `15.206.193.173` | CCTV / face-attendance pipeline only |

- **Each environment is a copy of the same layout.** Staging (`3.109.68.143`) uses `deploy-staging/`; prod (`13.235.161.192`) uses `deploy-prod/`. Only `.env` and the URLs/domains differ.
- Backend runs on **both** app servers (staging + prod). The **mobile** host (`43.204.194.237`) is **frontend-only** and builds the `Mobile/` source; the **attendance** server (`15.206.193.173`) runs only the CCTV pipeline.
- Frontend compose build contexts: `../Web` (staging `deploy-staging/`, prod `deploy-prod/`) and `../Mobile` (mobile `deploy-mobile/`).

## Terminology (important)

- **Push** = `git push` to GitHub (`origin`, branch `main`). Version control only — **never** touches a server.
- **Deploy prod** = rsync + rebuild on the production server (`login.bharatshramsetu.com`). **This is the default target for every change.**

## Rules (agreed with the user — revised)

1. **Push ≠ deploy.** When the user says "push" they mean GitHub only.
2. **Deploy every change straight to PROD** (`login.bharatshramsetu.com`). The user reviews on the live site — staging is no longer part of the normal flow.
3. **Back up the prod DB before ANY prod deploy** (cheap and reversible).
4. **Destructive data actions (delete/wipe) → only with the user's explicit instruction.** Never delete/modify prod data otherwise.
5. Never overwrite a server `.env`.
6. **Other-session coordination** still applies (see below).
7. **Deploy only the service that changed.** Frontend-only change → rebuild **only `frontend`**; backend change → rebuild `backend`. Restarting the backend briefly 502s the site, so never rebuild it for a frontend-only change. (`docker compose up -d --build frontend` vs `… backend`.)
8. **Prefer `up -d --build <svc>` (NOT `--force-recreate`).** `--force-recreate` removes the container first; if the other session deploys at the same time you can end up with **no container** → nginx 502s (`Host is unreachable`). After every deploy, verify the container is running:
   `docker compose ps --format "{{.Name}} {{.Status}}"` — if the service is missing, run `up -d <svc>` again.
   Recovery for a missing frontend: `cd ~/bss/FINAL/deploy-prod && sudo docker compose up -d frontend`.
9. **Watchdog (self-heal):** prod runs `~/ensure_services.sh` (source: `FINAL/scripts/ensure_services.sh`) **every minute via cron**. It starts any missing core container (`backend/frontend/nginx/db/redis`), so a concurrent-deploy removal self-heals within ~60s instead of leaving the site 502. Log: `~/bss_watchdog.log`.
10. **Upstream retry:** `src/server/http.ts` `upstreamRequest` retries transient failures (network error / 502 / 503 / 504) for **idempotent** (GET/HEAD) requests with a 1s→4s backoff (~10s), so a brief backend restart during a deploy doesn't surface as a 502 to users.

## Coordination: another session deploys to prod

Another session/agent also deploys straight to prod and commits to the same `origin/main`. Before ANY prod deploy:
1. `git pull` (or `git fetch` + check) so the local tree includes their committed work — otherwise rsync would overwrite/revert their prod changes.
2. `git status` — if there are uncommitted files that may be theirs, STOP and flag it.
3. State the exact commit(s) being deployed.
4. Deploy, then report.

## Deploy commands

Staging:
```bash
KEY=/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem
HOST=ubuntu@ec2-3-109-68-143.ap-south-1.compute.amazonaws.com
rsync -az -e "ssh -i $KEY" --exclude 'venv/' --exclude '.venv/' --exclude '__pycache__/' \
  --exclude '*.pyc' --exclude '.env' --exclude 'media/' --exclude 'staticfiles/' \
  --exclude 'audit_jobs/' --exclude 'audit_agent/cache/' --exclude 'audit_agent/output/' \
  /home/yasser/BSS_Project/FINAL/Backend/ $HOST:~/bss/FINAL/Backend/
rsync -az -e "ssh -i $KEY" --exclude 'node_modules/' --exclude '.next/' --exclude '.env*' \
  --exclude 'out/' --exclude 'coverage/' --exclude '*.log' --exclude '.vercel/' \
  /home/yasser/BSS_Project/FINAL/Web/ $HOST:~/bss/FINAL/Web/
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-staging && docker compose up -d --build backend frontend'
```

Production (only after staging is verified):
```bash
KEY=/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem
HOST=ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com
# same two rsyncs …
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose up -d --build backend frontend'
```
The backend entrypoint runs `migrate` + `collectstatic` on start.

## Backups (prod) — automatic + manual

The prod server runs `~/backup_bss_prod.sh` (source: `FINAL/scripts/backup_prod.sh`) **daily at 02:30 UTC** via cron. It writes to `~/bss_backups/`:
- `bss_prod_db_<stamp>.sql.gz` — PostgreSQL dump (keeps last 14)
- `bss_prod_media_<stamp>.tar.gz` — media volume: uploads / Aadhaar / DigiLocker (keeps last 7)

Run it manually any time (do this before a risky change or a prod deploy):
```bash
KEY=/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem
HOST=ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com
ssh -i "$KEY" $HOST 'bash ~/backup_bss_prod.sh'
```

Off-server copy (pull the newest DB dump to the laptop; `backups/` is git-ignored):
```bash
mkdir -p /home/yasser/BSS_Project/backups
LATEST=$(ssh -i "$KEY" $HOST 'ls -1t ~/bss_backups/bss_prod_db_*.sql.gz | head -1')
scp -i "$KEY" "$HOST:$LATEST" /home/yasser/BSS_Project/backups/
```

### Restore (only with explicit approval)
```bash
# Database
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && gunzip -c ~/bss_backups/bss_prod_db_<stamp>.sql.gz | \
  sudo docker compose exec -T db psql -U bss -d bss_prod'

# Media volume
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend sh -c \
  "rm -rf /data/media/* && tar xzf - -C /data/media" < ~/bss_backups/bss_prod_media_<stamp>.tar.gz'
```

## Seed demo accounts

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy-staging && docker compose exec -T backend python manage.py seed_demo_accounts'`

Prod (explicit approval): `ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend python manage.py seed_demo_accounts'`

## Gate-pass auto-expiry cron (Gate Pass Management System §7)

`FINAL/scripts/expire_gate_passes.sh` flips ACTIVE gate passes past their valid-to date to EXPIRED (invalidating the QR) and notifies the worker + issuing contractor. Install the **hourly** cron with `FINAL/scripts/install_expire_cron.sh` (idempotent — re-running replaces the entry, never duplicates):

- **This dev machine** (installed): `BSS_MODE=local bash FINAL/scripts/install_expire_cron.sh`
- **Staging** (installed): copy both scripts to `~/bss_scripts/`, then `BSS_MODE=staging bash ~/bss_scripts/install_expire_cron.sh`
- **Prod** (enable when needed): copy both scripts to `~/bss_scripts/`, then `BSS_MODE=prod bash ~/bss_scripts/install_expire_cron.sh`

The runner picks its mode from `BSS_MODE` (`local` = venv `manage.py`; `staging` = `docker compose`; `prod` = `sudo docker compose`). Log: `~/bss_gate_expiry.log`. Remove: `crontab -l | grep -v expire_gate_passes | crontab -`.

## DB shell (read/inspect or staging mutations)

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy-staging && docker compose exec -T backend python manage.py shell -c "…"'`

Prod (read-only unless explicitly approved): use `sudo docker compose exec -T backend python manage.py shell -c "…"` from `~/bss/FINAL/deploy-prod`.
