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
| URL | (EC2 hostname only) | **`login.bharatshramsetu.com`** |
| Purpose | pre-prod testing | real / demo users |

Staging and production are separate servers with separate databases. Data on one does not affect the other.

## Rules (agreed with the user)

1. **Code changes → staging first.** Deploy to staging, the user tests, then promote the *same* code to production.
2. **Destructive data actions (delete profile, wipe test data) → staging only**, unless the user explicitly says "do it on prod".
3. **Never delete/modify data on prod without an explicit instruction.** "Don't immediately delete anything from prod."
4. **Back up the prod database before any prod data change.**
5. Never overwrite a server `.env`.

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

## DB shell (read/inspect or staging mutations)

Staging: `ssh -i "$STAGING_KEY" ubuntu@$STAGING_HOST 'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py shell -c "…"'`

Prod (read-only unless explicitly approved): use `sudo docker compose exec -T backend python manage.py shell -c "…"` from `~/bss/FINAL/deploy-prod`.
