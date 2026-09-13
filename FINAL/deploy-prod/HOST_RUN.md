# Production host run (temporary, during development)

**Status:** Production `login.bharatshramsetu.com` is **NOT running via Docker** right now.
The Docker stack is **paused** (all containers stopped). Everything runs directly on the host.

> **Do NOT run `docker compose up --build` on prod** — it will grab ports 80/443 and conflict
> with the running host setup. Docker resumes only when the user says development is done.

Server: `13.235.161.192` (Ubuntu 26.04)
SSH: `ubuntu@13.235.161.192`, key `/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem`

## What is running on the host

| Piece | How | Where |
|---|---|---|
| Postgres 18 | systemd `postgresql` | `127.0.0.1:5432`, db `bss_prod`, user `bss` |
| Redis | systemd `redis-server` | `127.0.0.1:6379` |
| nginx | systemd `nginx` | config `/etc/nginx/sites-available/bss` |
| Backend (Django) | gunicorn via nohup | `~/bss-host/backend`, `:8000` |
| Frontend (Next.js standalone) | `node server.js` via nohup | `~/bss/FINAL/Frontend/BSS_Gravity`, `:3000` |

- DB password: `~/bss/FINAL/deploy-prod/.env` → `BSS_PG_PASSWORD` (the DB data was restored from the old Docker `bss_pgdata` volume).
- Backend env: `~/bss-host/backend/.env.host`; run script `~/bss-host/backend/run.sh`; log `~/bss-host/backend/gunicorn.log`.
- Frontend env: `~/bss/FINAL/Frontend/BSS_Gravity/run-host.sh`; log `host-frontend.log`.
- nginx routing: `/` + `/api/` → `127.0.0.1:3000`; `/v1/` + `/admin/` → `127.0.0.1:8000`; `/media/` → `~/bss-host/backend/media`; `/static/` → `~/bss-host/backend/staticfiles`. TLS reuses `/etc/letsencrypt/live/login.bharatshramsetu.com/`.

## Deploy changes (no Docker)

**Backend** (no build — Django runs from source, ~seconds):

```bash
KEY=/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem
HOST=ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com
rsync -az --delete --exclude venv --exclude __pycache__ --exclude '*.pyc' \
  --exclude media --exclude staticfiles \
  /home/yasser/BSS_Project/FINAL/Backend/ $HOST:~/bss-host/backend/
# if there are migrations:
ssh -i "$KEY" $HOST 'cd ~/bss-host/backend && set -a; . ./.env.host; set +a && venv/bin/python manage.py migrate'
ssh -i "$KEY" $HOST '~/bss-host/backend/restart.sh'
```

**Frontend** (still needs a `next build`, but on the host — not Docker):

```bash
rsync -az --delete --exclude node_modules --exclude .next \
  /home/yasser/BSS_Project/FINAL/Frontend/BSS_Gravity/ $HOST:~/bss/FINAL/Frontend/BSS_Gravity/
ssh -i "$KEY" $HOST '~/bss/FINAL/Frontend/BSS_Gravity/deploy-host.sh'   # npm ci && next build && restart
```

## Rules

- Backend needs **no build**; frontend still needs `next build` (on the host).
- Do **not** modify `~/bss-host/backend/.env.host` or the env values in `run-host.sh` — the `BSS_SESSION_SECRET` must match between frontend and backend.
- Do **not** run `docker compose up` on prod while this setup is active.
- **Do not deploy until the user says so.**
- When development finishes, the user will switch back to Docker.
