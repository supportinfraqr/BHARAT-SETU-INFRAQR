# BSS deployment & environment rules

## Environments

| | Staging | Production (live) |
|---|---|---|
| Host | `ec2-15-206-193-173.ap-south-1.compute.amazonaws.com` | `ec2-13-235-161-192.ap-south-1.compute.amazonaws.com` |
| SSH user | `ubuntu` | `ubuntu` |
| Key | `/home/yasser/BSS_Project/bharat-shram-setu-staging-key.pem` | `/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem` |
| App path | `~/bss/FINAL` | `~/bss/FINAL` |
| Compose dir | `~/bss/FINAL/deploy` | `~/bss/FINAL/deploy-prod` |
| Docker | `docker compose …` (no sudo) | `sudo docker compose …` |
| Database | `bss_final` | `bss_prod` |
| URL | **`bharat-shram-setu-staging.bharatshramsetu.com`** | **`login.bharatshramsetu.com`** |
| Purpose | pre-prod testing | real / demo users |

Staging and production are separate servers with separate databases. Data on one does not affect the other.

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
HOST=ubuntu@ec2-15-206-193-173.ap-south-1.compute.amazonaws.com
rsync -az -e "ssh -i $KEY" --exclude 'venv/' --exclude '.venv/' --exclude '__pycache__/' \
  --exclude '*.pyc' --exclude '.env' --exclude 'media/' --exclude 'staticfiles/' \
  /home/yasser/BSS_Project/FINAL/Backend/ $HOST:~/bss/FINAL/Backend/
rsync -az -e "ssh -i $KEY" --exclude 'node_modules/' --exclude '.next/' --exclude '.env*' \
  --exclude 'out/' --exclude 'coverage/' --exclude '*.log' --exclude '.vercel/' \
  /home/yasser/BSS_Project/FINAL/Frontend/BSS_Gravity/ $HOST:~/bss/FINAL/Frontend/BSS_Gravity/
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy && docker compose up -d --build backend frontend'
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

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py seed_demo_accounts'`

Prod (explicit approval): `ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend python manage.py seed_demo_accounts'`

## DB shell (read/inspect or staging mutations)

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py shell -c "…"'`

Prod (read-only unless explicitly approved): use `sudo docker compose exec -T backend python manage.py shell -c "…"` from `~/bss/FINAL/deploy-prod`.
