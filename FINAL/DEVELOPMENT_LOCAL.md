# Local development (active phase)

**Development is now LOCAL. Do NOT deploy to prod during development.**

The user reviews changes on a **local instance** on the workstation
(`/home/yasser/BSS_Project`). Make all changes locally; the user reviews on
`http://localhost:3000`. **Do not deploy to prod until the user explicitly says
"deploy to prod"** at the end of development.

## Local stack (already running on this machine)

| Piece | How | URL |
|---|---|---|
| Frontend | Next **dev** server (`next dev --webpack`) — hot-reloads, no build | `http://localhost:3000` |
| Backend | `manage.py runserver 0.0.0.0:8000 --noreload` | `http://localhost:8000` (admin `/admin`) |
| Database | local Postgres `bss_local` via Docker `bss-postgres` | `127.0.0.1:5433`, user `bss` |

- Frontend env `Frontend/BSS_Gravity/.env.local` already points at `http://127.0.0.1:8000`.
- To run a Django management command locally with the right env, reuse the running
  backend process env: `tr '\0' '\n' < /proc/<runserver-pid>/environ > /tmp/bss_local_env`
  then `set -a; . /tmp/bss_local_env; set +a`.

## Demo logins (OTP `123456`)

| Role | Mobile | Account |
|---|---|---|
| Worker | `1111111111` | Ramesh Kumar (also 2222222222, 3333333333) |
| Contractor | `4444444444` | BuildWell Contractors (also 5555555555, 6666666666) |
| Employer | `7777777777` | Adani Infra Pvt Ltd (also 8888888888) |

Password login also works with the seeded passwords.

---

# Session snapshot — 2026-09-20 (addendum)

Everything below this line documents the **current** transport + deploy state that
an earlier session set up and the work shipped this session. Read it whenever you
touch deployment.

## Core architecture (at a glance)

Monorepo: `FINAL/Backend` (Django + Django REST Framework, one base URL
`/api/v1`) and `FINAL/Frontend/BSS_Gravity` (Next.js 14 App Router, TypeScript;
reaches backend at `/api/v1`, proxied same-origin in prod by `nginx`).

- Backend start chain: `migrate` → `collectstatic` → runserver. Same entrypoint
  under Docker and host runs.
- Every route is under `/api/v1/…`; the app itself is served as a **static
  SPA** from `Frontend/BSS_Gravity/out/` in prod/staging (Next `output: export`),
  plus an **SSR** set served by the Next server for the worker app.
- DB: PostgreSQL (`bss_final` local/staging, `bss_prod` prod). Media/uploads
  (Aadhaar, DigiLocker, gate-pass photos) stored on a persistent
  `username:db` NAS mount in prod.
- OCR: **self-hosted** (RapidOCR + pypdfium2) — `Backend/api/ocr_engine.py`,
  `Backend/api/ocr_client.py` (`extract_text` / `verify_document_text` /
  `extract_fields`). Used on the **compliance/CLRA evidence** path
  (`Backend/api/clra.py` + `v1_bridge/submissions.py` `validate_evidence`) —
  NOT on the worker Documents page (worker OCR was removed this session and is
  the only OCR that is off; evidence OCR is live).
- Gate-pass expiry: `FINAL/scripts/expire_gate_passes.sh` run hourly by cron
  (`install_expire_cron.sh`, `BSS_MODE=local|staging|prod`) → flips ACTIVE→EXPIRED.

## Environments — current (this session's ground truth)

| | Staging | Production (live) |
|---|---|---|
| Public host | `ec2-15-206-193-173.ap-south-1.compute.amazonaws.com` | `ec2-13-235-161-192.ap-south-1.compute.amazonaws.com` |
| Tailscale tailnet | `presqription` (this deploy box re-homed from `infraqr`→`presqription` on Sep 20) | `presqription` |
| SSH user | `ubuntu` | `ubuntu` |
| SSH key | `/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem` | `/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem` (+ `login-bharathshramsetu-root_key.pem` duplicate) |
| App path (prod) | `~/bss/FINAL` | `~/bss/FINAL` |
| Compose dir | `~/bss/FINAL/deploy` | `~/bss/FINAL/deploy-prod` |
| Docker | `docker compose …` (no sudo) | `sudo docker compose …` |
| Database | `bss_final` | `bss_prod` |
| URL | `bharat-shram-setu-staging.bharatshramsetu.com` | `login.bharatshramsetu.com` |

Local (this machine): `http://localhost:3000` (Next dev) + `http://localhost:8000`
(backend; admin `/admin`), Postgres `bss_local` in Docker `bss-postgres`
(`127.0.0.1:5433`, user `bss`).

## Tailnet transport — this session switched us to `presqription`

Earlier deploys rode the public-EC2 IP + PEM. This session the deploy box was
**re-homed from the `infraqr` tailnet onto `presqription`** so `100.88.4.48` is a
*desktop* peer (previously unreachable). Facts that are now true:

- This deploy box: `presqription` tailnet, direct peer of `100.88.4.48`.
- Target machine for mirrors: **`oem@100.88.4.48`** (hostname `ub`, Linux).
  **Password: `oem`/`123`** (password auth only; none of this box's PEMs are
  authorized on it, so use the password, not a key).
- Mirror transport over the tailnet (already run successfully this session):

```bash
sshpass -p '123' rsync -azE --delete -e \
  "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=1" \
  /home/yasser/BSS_Project/FINAL/ oem@100.88.4.48:/home/oem/BSS_Project/FINAL/
```

Verified byte-for-byte on both ends (sha256 sentinels: `ocr_engine.py`,
`ocr_client.py`, `submissions.py`, worker `Documents/page.tsx`, PEM keys,
`Requirements/BSS_Session_Summary_2026-09-20.md`).

> Reverting the tailnet change: re-join the box to `infraqr`; the old
> `tailb59a73` authkey was retained as a safety net (documented in the session
> summary in `Requirements/`). Default is now `presqription`.

## Keys on disk (AWS / deploy)

- `/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem` — **prod** PEM.
- `/home/yasser/BSS_Project/login-bharathshramsetu-root_key.pem` — duplicate copy.
- `/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem` — **staging** PEM.
- `/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem` — duplicate copy.
- `~/.ssh/id_ed25519` (+`id_ed25519_infraqr`) — dev machine keys.
- `~/BSS_Project/FINAL/Backend/venv/…/certifi/cacert.pem` — CA bundle (not a key).

## What this session did (2026-09-20)

1. **Removed worker-page OCR** — reverted `worker_verify_document` from
   `Backend/api/v1_bridge/submissions.py` and the Verify/Autofill button from
   `Frontend/BSS_Gravity/src/app/worker/Documents/page.tsx` (commit `c9fbf70`,
   pushed `origin/main`, deployed to prod same day over public EC2+PEM, prod
   containers rebuilt + verified healthy: nginx/frontend/backend/db/redis).
   Compliance/CLRA evidence OCR stays live.
2. **Mapped the full CLRA 13-step pipeline** to code (register-templates,
   submissions evidence validation, employer pack, worker register render,
   correction/resubmit, notification, compliance report) — coverage items
   flagged in `Requirements/BSS_Session_Summary_2026-09-20.md`.
3. **Tailnet re-home** to `presqription` (described above).
4. **Full byte-identical mirror** of `FINAL/` (incl. `.git`, `.next`, PEMs)
   → `oem@100.88.4.48:/home/oem/BSS_Project/FINAL/` (rsync + sha256 gate).
5. **Backups**: DB dump + media tar to `~/bss_backups/` (`bss_prod_db_*.sql.gz`,
   `bss_prod_media_*.tar.gz`) taken before the prod deploy; retained 7–14 days.

Full detail (CLRA pipeline map, OCR architecture, deploy transcript): see
`FINAL/Requirements/BSS_Session_Summary_2026-09-20.md`.

## Ops runbook (unchanged, authoritative)

- **Push ≠ deploy.** "Push" => GitHub only. Deploy default = prod.
- **Back up prod DB before any prod deploy** (`~/backup_bss_prod.sh` daily
  02:30 UTC via cron; manual: `bash ~/backup_bss_prod.sh` → `~/bss_backups/`).
- Never overwrite a server `.env`.
- Deploy only the changed service: frontend-only => `up -d --build frontend`;
  backend change => `backend`. Prefer `up -d --build <svc>`, NOT
  `--force-recreate` (can 502 via watchdog race).
- Watchdog `~/ensure_services.sh` every minute re-raises missing containers
  (log `~/bss_watchdog.log`).
- Upstream retry with 1s→4s backoff on idempotent requests
  (`src/server/http.ts`) hides brief backend restarts.
- Staging/prod rsync commands with their PEM keys and `rsync`+compose refresh
  snippets are in this file's earlier sections (staging `~/bss/FINAL/deploy`,
  prod `~/bss/FINAL/deploy-prod`).

## Restore (with approval)

```bash
# prod DB
KEY=/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem
HOST=ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && gunzip -c ~/bss_backups/bss_prod_db_<stamp>.sql.gz | sudo docker compose exec -T db psql -U bss -d bss_prod'
# media
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend sh -c "rm -rf /data/media/* && tar xzf - -C /data/media" < ~/bss_backups/bss_prod_media_<stamp>.tar.gz'
```

## Prod status — leave it alone

- Prod `login.bharatshramsetu.com` is back on the **Docker** stack (all
  containers up: `nginx`, `frontend`, `backend`, `db`, `redis`). The temporary
  host run has been stopped (host `nginx` disabled; host `postgresql`/`redis`
  stopped).
- See `FINAL/deploy-prod/HOST_RUN.md` for the host run (historical / fallback).
- **Do not deploy anything to prod** while local development is in progress —
  only the user says "deploy to prod" when ready.

## When development finishes

The user will host properly on prod; then a normal Docker deploy applies. Until
then, work locally only.
