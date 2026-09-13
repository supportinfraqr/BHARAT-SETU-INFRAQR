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

## Prod status — leave it alone

- Prod `login.bharatshramsetu.com` currently runs on the **host (non-Docker)**
  setup — see `FINAL/deploy-prod/HOST_RUN.md`.
- **Do NOT run `docker compose up` on prod** (it fights the host nginx for ports
  80/443).
- Do not rsync/deploy anything to prod while local development is in progress.

## When development finishes

The user will say so; then we switch prod back to the Docker stack. Until then,
work locally only.
