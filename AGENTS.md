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
- **Deploy staging** = rsync + `docker compose up --build` on the staging server. Safe, testable.
- **Deploy prod** = rsync + rebuild on the production server. **LIVE.** Only on the user's explicit "deploy to prod".

## Rules (agreed with the user)

1. **Push ≠ deploy.** When the user says "push" they mean GitHub only.
2. **Big changes → staging first**, the user tests, then ask before prod. Never auto-promote.
3. **Small/urgent fixes may go straight to prod**, then report to the user:
   - Small/hotfix: text/copy, styling, a single-field bug fix, a clear 500 blocker.
   - Big (always ask first): DB migrations/schema, auth/session, binding/permission logic, payments/Aadhaar, multi-file features.
   - Unsure → ask.
4. **Back up the prod DB before ANY prod deploy** (even a small hotfix).
5. **Destructive data actions (delete/wipe) → staging only**, unless the user explicitly says "do it on prod". Never delete/modify prod data without an explicit instruction.
6. Never overwrite a server `.env`.

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

## Prod database backup (before any prod data change)

```bash
KEY=/home/yasser/BSS_Project/login-bharatshramsetu-root_key.pem
HOST=ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T db \
  pg_dump -U bss -d bss_prod | gzip > ~/bss_prod_backup_$(date +%Y%m%d_%H%M%S).sql.gz'
```
Restore (only with explicit approval):
```bash
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy-prod && gunzip -c ~/bss_prod_backup_<stamp>.sql.gz | \
  sudo docker compose exec -T db psql -U bss -d bss_prod'
```

## Seed demo accounts (staging)

```bash
ssh -i "$KEY" $HOST 'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py seed_demo_accounts'
```

## DB shell (read/inspect or staging mutations)

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py shell -c "…"'`

Prod (read-only unless explicitly approved): use `sudo docker compose exec -T backend python manage.py shell -c "…"` from `~/bss/FINAL/deploy-prod`.
