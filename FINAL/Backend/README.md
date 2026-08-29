# Bharat Shram Setu (BSS) — Backend API

Django REST Framework backend for the BSS platform. Models mirror the **FINAL
36-table PostgreSQL schema**, exposed as JWT-protected REST endpoints consumed
by the mobile / web / QR frontends.

- **Framework:** Django 5.2 + DRF 3.18 + SimpleJWT
- **Database:** PostgreSQL (`bss_final`) behind the **BSS pgpool** (port 5432) ✅ scalable (connection pooling, `CONN_MAX_AGE=60`)
- **Auth:** JWT access + refresh tokens, custom role-based `User` model
- **9 roles:** `public, worker, contractor, employer, government_inspector, government_admin, bss_staff, it_task_force, bss_super_admin`

---

## 1. Quick start

```bash
cd FINAL/Backend
./venv/bin/pip install -r requirements.txt
cp .env.example .env            # adjust DB creds if needed
./venv/bin/python manage.py migrate
./venv/bin/python manage.py runserver 0.0.0.0:8000
```

The default connection targets the BSS pgpool (127.0.0.1:5432, role `bss`,
db `bss_final`). Override via `BSS_PG_*` in `.env`.

Admin (optional):
```bash
./venv/bin/python manage.py createsuperuser
# then browse http://localhost:8000/admin/
```

---

## 2. Authentication

All `/api/*` endpoints require a Bearer token except **register** and the
**token** endpoints.

```bash
# 1) Register a user (public)
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ramesh","password":"secret123","role":"worker","mobile":"9876543210"}'

# 2) Obtain tokens
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ramesh","password":"secret123"}'
# -> {"access":"...","refresh":"..."}

# 3) Call protected endpoint
curl http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer <access>"

# Refresh / verify
POST /api/auth/token/refresh/   { "refresh": "..." }
POST /api/auth/token/verify/    { "token": "..." }
```

> `role` values: `public, worker, contractor, employer, government_inspector,
> government_admin, bss_staff, it_task_force, bss_super_admin`.

---

## 3. Endpoint reference

Standard DRF CRUD applies unless noted:
- **List** `GET /api/<resource>/` — paginated (20/page; `?page=N`)
- **Retrieve** `GET /api/<resource>/<id>/`
- **Create** `POST /api/<resource>/`
- **Update** `PUT /api/<resource>/<id>/` / `PATCH /api/<resource>/<id>/`
- **Delete** `DELETE /api/<resource>/<id>/`

Filtering: `?field=value` on the documented filter fields. Ordering: `?ordering=field`.
**Row-level scoping:** contractors only see their records; workers only their
own; employers only their sites' records.

### 3.1 Auth & identity
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/token/` | Login → JWT pair |
| POST | `/api/auth/register/` | Register user (public) |
| GET | `/api/users/me/` | Current logged-in user + role + credentials + profile |
| GET | `/api/users/` | List users (role filters) |
| GET/PATCH | `/api/users/<id>/` | Retrieve/update user |

### 3.2 Relationships (E→C→S→W hierarchy)
| Method | Path | Purpose / filters |
|---|---|---|
| POST | `/api/sites/` | Create site (auto-generates `site_qr_token`) |
| GET | `/api/sites/` | List sites | filter: `employer, city, district, state` |
| GET/PUT/PATCH/DELETE | `/api/sites/<id>/` | Site detail |
| POST | `/api/bindings/initiate/` | Contractor proposes worker↔site binding → `PENDING` (body `{worker, site}`) |
| GET | `/api/bindings/` | List bindings | filter: `worker, contractor, site, binding_status` |
| POST | `/api/bindings/<id>/consent/` | Accept binding (see **Consent flow** §4) |
| GET/PUT/PATCH/DELETE | `/api/bindings/<id>/` | Binding detail |
| GET/POST | `/api/jobs/` | Contractor job postings | filter: `contractor, site, is_active` |
| GET/POST | `/api/requests/` | Worker apply / job request | filter: `worker, contractor, job, status` |
| POST | `/api/qr/scan/` | Resolve site QR token → site + caller role (body `{qr_token}`) |

### 3.3 Worker on-boarding (per-section CRUD)
Each mirrors a schema section and filters by `user`:
| Path | Section |
|---|---|
| `/api/workers/identity/` | Name, DOB, Aadhaar, PAN, emergency contact, photo |
| `/api/workers/address/` | Current & permanent address, migration |
| `/api/workers/family/` | Family & dependants / nominee |
| `/api/workers/social-security/` | UAN, ESIC, e-Shram, BoCW |
| `/api/workers/classification/` | Category, sector, gig/self-employed |
| `/api/workers/employment/` | Assignment, shift, DOJ, PF |
| `/api/workers/skills/` | Primary/secondary skills, certifications |
| `/api/workers/banking/` | Bank account, IFSC, UPI |
| `/api/workers/welfare-safety/` | PPE, training, gate-pass fields, medical |
| `/api/workers/other/` | Consent/registration audit, QR opt-in |
| `/api/workers/documents/` | Uploaded documents (`status`: UPLOADED/VERIFIED/REJECTED) |

**Composite profile:** `GET /api/workers/<user_id>/profile/` returns the worker's
entire profile (identity, address, family, social-security, welfare-safety,
banking, classification, employment, skills, other, documents) in one payload.

**Lookups / masters (read-only):**
| Path | Purpose |
|---|---|
| `/api/lookups/` | Dropdown values | filter: `category` |
| `/api/lookups/categories/` | Distinct dropdown categories |
| `/api/skills/` | Skill master |
| `/api/worker-categories/` | Worker category master |
| `/api/workers/documents-master/` | Document master |
| `/api/rbac/` | Role-permission matrix | filter: `role, resource, field` |
| `/api/qr-role-access/` | QR scanner role scopes |

### 3.4 Attendance
| Method | Path | Purpose / filters |
|---|---|---|
| POST | `/api/attendance/punch/` | Record a punch. See **Attendance flow** §5 |
| GET | `/api/attendance/` | Attendance | filter: `worker, site, contractor, attendance_date, status, capture_method` |
| GET/POST | `/api/attendance/devices/` | Capture devices (QR/NFC/CAMERA) | filter: `site, capture_type, is_active` |
| GET/PUT/PATCH/DELETE | `/api/attendance/<id>/` | Attendance detail |

### 3.5 Wages & payments
| Method | Path | Purpose / filters |
|---|---|---|
| POST | `/api/wages/compute/` | Auto-compute wage from attendance in a period (body `{worker, site, period_start, period_end, daily_wage}`) → `DRAFT` |
| POST | `/api/wages/<id>/approve/` | Approve a DRAFT wage → `APPROVED` |
| GET/POST | `/api/wages/` | Wage records | filter: `worker, site, contractor, status, period_start, period_end` |
| GET/PUT/PATCH/DELETE | `/api/wages/<id>/` | Wage detail |
| POST | `/api/wage-payments/disburse/` | Disburse a wage (body `{worker_wages, pay_mode, amount, ...}`) → sets wage `PAID` |
| GET/POST | `/api/wage-payments/` | Payment ledger | filter: `worker_wages, pay_mode, paid_by` |

### 3.6 Gate passes (TGP / PGP)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/gate-passes/` | Temporary & permanent gate passes | filter: `worker, site, gate_pass_type, status` |
| GET/PUT/PATCH/DELETE | `/api/gate-passes/<id>/` | Gate pass detail |

### 3.7 Grievances
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/grievances/` | Voice/text grievances | filter: `worker, status` |
| POST | `/api/grievances/<id>/advance/` | Advance `RECORDED → SUBMITTED → VIEWED_ON_DASHBOARD` |
| GET/PUT/PATCH/DELETE | `/api/grievances/<id>/` | Grievance detail |

### 3.8 Time-bound document tokens
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/documents/tokens/issue/` | Issue a token (body `{token_type, document?, subject?, expires_at?, max_uses?}`) → returns raw token |
| POST | `/api/documents/tokens/verify/` | Redeem a raw token (body `{token}`) → `{valid, ...}` if ACTIVE+unexpired+under max_uses |
| GET/POST | `/api/documents/tokens/` | Token records | filter: `token_type, document, subject, status` |

`token_type`: `DOCUMENT_VIEW, DOCUMENT_VERIFY, DOCUMENT_DOWNLOAD, ONBOARDING, OFFER_LETTER`.

---

## 4. Consent / OTP flow (worker binds to contractor+site)

Non-smartphone workers consent through escalating stages (**APP → IVR → OTP**).

```bash
# 1) Contractor proposes binding
POST /api/bindings/initiate/   { "worker": 3, "site": 1 }          # -> PENDING

# 2) Contractor issues an OTP challenge (5-min validity) for that binding
POST /api/consent/issue/       { "binding": 1, "stage": "OTP" }     # -> {"id":..,"dev_otp":"A1B2C3"}

# 3) Worker/contractor verifies the code against the challenge
POST /api/consent/12/verify/   { "code": "A1B2C3" }                # -> {verified}

# 4) Activate the binding
POST /api/bindings/1/consent/  { "stage": "OTP" }                  # -> binding_status ACCEPTED
```

- IVR uses `{ "code": "1" | "0" }` (accept/decline) with 60s validity.
- `GET /api/consent/` lists challenges; filters `worker, contractor, stage, state, binding`.
- `POST /api/otp/send/` general SMS OTP: `{ "mobile", "purpose" }`.

> In production the OTP/SMS/IVR is sent via channel provider; in dev the code is
> echoed back in the response (`dev_otp`) for testing.

---

## 5. Attendance punch flow

Same punch endpoint handles **check-in** (creates) and **check-out** (updates the
open record for that worker+site+date).

```bash
POST /api/attendance/punch/
{
  "worker": 3, "site": 1, "contractor": 2,
  "device": 1,                # optional AttendanceDevice id
  "capture_method": "NFC",    # QR | NFC | CAMERA
  "verification_type": "nfc_card",  # qr_worker | qr_site | nfc_card | face_image | badge_image
  "image_file": "..." ,       # for CAMERA (face/badge)
  "confidence_pct": 0.97,
  "gps_lat": 19.07, "gps_long": 72.87,
  "attendance_date": "2026-01-05",  # optional, defaults to today
  "remarks": ""
}
```

---

## 6. Full QR technology (backend)

Two kinds of QR on the platform — **site QR** and **worker profile QR** — both
served as backend payloads (frontends render the QR image):

### 6.1 Site QR → scan → attendance
```bash
# expose site_qr_token (rendered as a QR by the frontend)
GET /api/sites/                      # each site has site_qr_token

# scan the site QR
POST /api/qr/scan/  { "qr_token": "<uuid>" }
# -> { "site": {...}, "role": "<caller role>" }

# then punch attendance for that site
POST /api/attendance/punch/ { "worker": 3, "site": 1, "capture_method": "QR", ... }
```
The server enforces viewable scope per role (see `/api/qr-role-access/`).

### 6.2 Worker profile QR (QR ID card)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/qr/worker/issue-token/` | (re)issue this worker's `qr_token` (render as QR card) |
| POST | `/api/qr/worker/worker-card/` | worker's own profile-QR payload (name, photo, DigiLocker-verified, active site, verified docs) |
| POST | `/api/qr/worker/worker-scan/` | resolve a scanned worker QR → role-scoped card (`{ "qr_token": "..." }`) |

Worker-card payload returned by `/api/qr/worker/worker-*`:
```json
{
  "qr_token": "6a1c...", "worker_id": 7, "bss_worker_id": "W-DL1",
  "name": "Radha Kumari", "photo": "...", "digilocker_verified": true,
  "digilocker_id": "abc@digilocker", "active_site": { "id": 1, ...},
  "verified_documents": ["PAN", "AADHAAR"]
}
```
Flow: worker scans their card at the site → site gate/contractor device calls
`worker-scan` to verify the worker + their active-site binding before
attendance punch.

### 6.3 QR-signed document verification
Digitally-issued documents fetched from DigiLocker (Aadhaar/PAN) flow into the
document pipeline. Issue a one-time **time-bound token**, embed it in a QR, and
verify:
```bash
POST /api/documents/tokens/issue/   { "token_type": "DOCUMENT_VERIFY", "document": 5, "max_uses": 1 }
# -> { "token": "<raw>", ... }    (frontend renders <raw> as a QR)
POST /api/documents/tokens/verify/  { "token": "<raw>" }
# -> { "valid": true, "document": 5, ... }  (only if ACTIVE + unexpired + under max_uses)
```

---

## 7. DigiLocker OAuth2 (identity & issued documents)

Backend-only port of the legacy EesassinErp DigiLocker flow (PKCE **S256** +
`authorization_code` grant). After consent, the worker's identity is verified
and their digitally-issued documents are fetched and stored.

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/digilocker/start/` | Begin OAuth → returns `{ authorize_url, state, session_id }` (public) |
| GET | `/api/digilocker/callback/?code=..&state=..` | OAuth redirect target: exchange code → fetch user → save verified profile → background-fetch issued docs (public) |
| GET | `/api/digilocker/status/?state=..` | Poll completion: `INITIATED → CODE_RECEIVED → TOKEN_OBTAINED → COMPLETED/ERROR/EXPIRED` (public) |
| GET | `/api/digilocker/profile/` | Current user's verified DigiLocker profile (authenticated) |
| GET | `/api/digilocker/documents/` | This user's fetched issued documents (authenticated) |

### Flow
```bash
# 1) start — get authorize URL (server generates + stores PKCE verifier)
curl -X POST http://localhost:8000/api/digilocker/start/
# -> { "authorize_url": "https://digilocker.meripehchaan.gov.in/...?...", "state": "...", "session_id": 1 }

# 2) redirect browser to authorize_url; user consents on DigiLocker → browser
#    returns to DIGILOCKER_REDIRECT_URI (callback) with ?code=..&state=..

# 3) callback saves verified profile & launches background download of issued
#    docs (Aadhaar, PAN, ...). Frontend polls status:
curl -X GET "http://localhost:8000/api/digilocker/status/?state=..."
# -> { "status": "COMPLETED", "digilocker_id": "...", "name": "...", "documents_count": 3 }

# 4) authenticated user reads their profile + documents
curl -H "Authorization: Bearer <access>" http://localhost:8000/api/digilocker/profile/
curl -H "Authorization: Bearer <access>" http://localhost:8000/api/digilocker/documents/
```

Fetched documents are stored in `digilocker_document` and set
`digilocker_verified=true` on the worker — the profile-QR card and
document-verification tokens both reflect this.

**Configuration** (`.env`): `DIGILOCKER_CLIENT_ID`, `DIGILOCKER_CLIENT_SECRET`,
`DIGILOCKER_REDIRECT_URI`, `DIGILOCKER_SESSION_TTL_MIN`, plus the DigiLocker
base URLs/scopes. Raw tokens are never stored (`token_hash` only); the PKCE
`code_verifier` is stored server-side so callback is stateless.

---

## 8. Business rules encoded

- **1 worker = 1 ACTIVE site** via partial unique index
  `uq_binding_one_active_site_per_worker` (filters by `binding_status='ACCEPTED'`).
- Site `employer_id` is non-unique → one employer = many sites.
- Wage `UNIQUE(worker, period_start, period_end)`.
- Documents `UNIQUE(user, document, file_name)`.
- Tokens store only `token_hash` — the raw token is never persisted.

---

## 9. Project layout

```
FINAL/Backend/
├── manage.py
├── requirements.txt
├── .env.example / .env        # env-driven config (never commit .env)
├── config/
│   ├── settings.py            # DRF, JWT, PostgreSQL, CORS
│   └── urls.py                # /api/ + token endpoints
├── bss_core/
│   ├── models/                # schema as Django models (36 tables + DigiLocker)
│   │   ├── auth.py            # User, roles, profiles
│   │   ├── relationship.py    # Site (+site_qr_token), Binding, Job, RozgarRequest
│   │   ├── worker.py          # worker onboarding sections (+worker qr_token)
│   │   ├── access.py          # RBAC, QR scope, lookups
│   │   ├── operations.py      # attendance, wages, gate pass, grievance, tokens
│   │   ├── consent.py         # consent/OTP challenges
│   │   └── digilocker.py      # DigiLockerProfile/Document/Session
│   └── admin.py
└── api/
    ├── serializers.py
    ├── views.py               # ViewSets + business actions (incl. DigiLocker, QR)
    ├── digilocker_client.py   # PKCE + OAuth2 + doc-download client (ported)
    └── urls.py                # /api/<resource>/ routing
```

## 10. Database

PostgreSQL connected via the BSS pgpool for connection pooling (scalable). The
authoritative DDL lives in `FINAL/Db/schema.sql` / `schema.dbml`. Django's ORM
representation is created by:

```bash
./venv/bin/python manage.py makemigrations bss_core
./venv/bin/python manage.py migrate
```

Override connection with `BSS_PG_*` in `.env`; switch DBs (e.g. the `bss_fk`
Postgres instances on 55447/55444) by changing `BSS_PG_HOST/PORT`.
