# Local development mode (temporary)

> **While this file is in effect: do NOT deploy to prod.** Develop locally and let
> the user review on http://localhost:3000. Prod is frozen until the user explicitly
> says **"deploy to prod"** at the end of development.

## Local stack (already running on the workstation)

| Piece | Where |
|---|---|
| Frontend (Next dev server) | http://localhost:3000 — hot-reloads on file changes, **no build needed** |
| Backend (Django) | `manage.py runserver 0.0.0.0:8000` → http://localhost:8000 (`/admin`) |
| Database | local Postgres `bss_local` via the Docker `bss-postgres` container on `127.0.0.1:5433` (user `bss`) |
| Frontend env | `Frontend/BSS_Gravity/.env.local` already points at `http://127.0.0.1:8000` |

### Demo logins (OTP `123456`)
- Worker: `1111111111` (also `2222222222`, `3333333333`)
- Contractor: `4444444444` (also `5555555555`, `6666666666`)
- Employer: `7777777777` (also `8888888888`)

## Prod — leave it alone
`login.bharatshramsetu.com` currently runs on the **host (non-Docker)** setup
(see `FINAL/deploy-prod/HOST_RUN.md`): host Postgres/Redis/nginx + gunicorn backend +
Next.js standalone frontend.

- **Do NOT** run `docker compose up` on prod — it will fight the host nginx for ports 80/443.
- **Do NOT** rsync/deploy anything to prod while local development is in progress.

## When development finishes
The user will say so; then prod is switched back to the Docker stack. Until then,
work locally only. (Pushing to GitHub is fine — push ≠ deploy.)
