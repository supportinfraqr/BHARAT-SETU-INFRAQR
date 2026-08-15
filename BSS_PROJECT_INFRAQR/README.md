# BSS PROJECT INFRAQR — QR-based Hierarchical Workforce System (Django)

Django backend replacing the legacy ASP.NET BharatShramSetu backend, with integrated QR technology.

## Stack
- **Django 6.1 + Django REST Framework** (API-only, frontend decided later)
- **PostgreSQL 16** (primary) behind **Pgpool-II 4.4** connection pooler
- **Redis 7** — sessions + cache
- **JWT auth** (SimpleJWT) with role-based access
- **QR**: opaque HMAC-signed references, static on worker ID cards

## Services (Docker)
| Container | Port | Role |
|---|---|---|
| `bss-postgres` | 5433 (direct), 5432 (via pgpool) | PostgreSQL 16 — single source of truth |
| `bss-pgpool` | 5432 | Connection pooler |
| `bss-redis` | 6380 | Sessions/cache |

> The legacy SQL Server was retired. All BharatSharamShetu reference data
> (EmployeeMaster, LoginTable, StoreMaster, PartyMaster, MaintainLog) was
> migrated into PostgreSQL and is served by the `legacy` app.

## Apps
- `authx` — JWT auth, roles (Super Admin / BSS Staff / Employer / Primary / Secondary Contractor / Worker)
- `qr` — QR codes, Employer/Contractor/Worker, binding, attendance+geo-verify, scan logs, audit, notifications
- `legacy` — reference tables migrated from SQL Server, now owned by PostgreSQL
- `api` — legacy-contract-compatible endpoints (same routes + JSON shape)

## Key Endpoints
```
POST /api/auth/login/            JWT login
POST /api/auth/register/         register (role-selectable)
GET  /api/qr/qr/?entity_type=WORKER&entity_id=9     QR lookup
POST /api/qr/qr/scan/            secure scan + geo-verified attendance
POST /api/qr/bindings/           binding request (employer<->contractor / worker<->contractor)
POST /api/qr/bindings/<id>/approve/   employer approve/reject
POST /api/qr/contractors/reassign/    reassign workers, preserve history
GET  /api/qr/dashboard/          totals + scan activity
GET  /api/qr/scans/              scan logs
GET  /api/qr/notifications/      role-aware notifications
# Legacy-compatible (existing frontend)
POST /api/Login/GetUserId
GET  /api/RetailSection/GetEmployeeMaster   (X-Legacy-Login-Id header)
GET  /api/RetailSection/GetStoreMaster
GET  /api/RetailSection/GetMaintainLog
```

## Setup
```bash
cd backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill secrets
./venv/bin/python manage.py migrate
./venv/bin/python manage.py createsuperuser
./venv/bin/python manage.py import_legacy_data   # copy SQL Server ref data -> Postgres
./venv/bin/python manage.py runserver 0.0.0.0:8001
```

## Security hardening (vs legacy)
- No hardcoded credentials — all via `.env`/env vars
- Parameterized ORM queries (no string-concatenated SQL)
- JWT with rate-limited login (10/min) — brute-force protection
- Role-based access control on every QR endpoint
- Security headers middleware (CSP, X-Frame-Options, nosniff, referrer-policy)
- Scan logs sanitize legacy SQL-injection artifact rows (MaintainLog)
- Opaque QR references (no PII in the QR itself)
- Audit logging for binding/creation/reassignment/scan events
