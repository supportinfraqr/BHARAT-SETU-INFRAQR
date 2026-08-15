# BSS QR System — Frontend API Reference

Base URL: `http://<server>:8001`
All endpoints return JSON. Auth uses **JWT Bearer tokens** unless noted.

---

## Authentication

### Register — `POST /api/auth/register/`
```json
{ "username": "emp1", "password": "Secret@123", "email": "e@x.com",
  "role": "EMPLOYER" }
```
Roles: `SUPER_ADMIN`, `BSS_STAFF`, `EMPLOYER`, `PRIMARY_CONTRACTOR`, `SECONDARY_CONTRACTOR`, `WORKER`
```json
{ "Result": "Success", "Data": { "user": {...}, "access": "<jwt>", "refresh": "<jwt>" } }
```

### Login — `POST /api/auth/login/`
```json
{ "username": "admin", "password": "..." }
```
Returns `Data.access` + `Data.refresh`. Use `Authorization: Bearer <access>` on all calls.

### Refresh token — `POST /api/auth/refresh/`
```json
{ "refresh": "<refresh_token>" }
```

### Current user — `GET /api/auth/me/`
```json
{ "Result": "Success", "Data": { "id":1, "username":"admin", "role":"SUPER_ADMIN", ... } }
```

### Logout — `POST /api/auth/logout/`
```json
{ "refresh": "<refresh_token>" }
```

---

## Employers

### List — `GET /api/qr/employers/`
Roles: SUPER_ADMIN, BSS_STAFF, EMPLOYER

### Create — `POST /api/qr/employers/`
```json
{ "name": "Tata Motors", "contact_person": "A", "contact_mobile": "99...", "email": "a@tata.in", "address": "Mumbai" }
```
Auto-generates an employer QR.

---

## Contractors

### List — `GET /api/qr/contractors/`
### Create — `POST /api/qr/contractors/`
```json
{ "name": "ABC Contractors", "employer": 1, "is_primary": true,
  "location_lat": 28.6139, "location_lng": 77.2090, "site_name": "Site A" }
```
`location_lat/lng` = the contractor's permitted geo-location (used for geo-verification).

---

## Workers

### List — `GET /api/qr/workers/`
### Create — `POST /api/qr/workers/`
```json
{ "full_name": "Ramesh Kumar", "mobile": "9876...", "aadhaar_no": "1234...", "pan_no": "ABCDE1234F" }
```
Auto-generates worker QR + `worker_id`.

---

## QR

### Get QR for entity — `GET /api/qr/qr/?entity_type=WORKER&entity_id=9`
entity_type: `EMPLOYER` | `CONTRACTOR` | `WORKER`
```json
{ "Result": "Success", "Data": { "qr_reference": "<opaque>", "entity_type": "WORKER", "entity_id": 9, "status": "UNBOUND", "scan_count": 0 } }
```
**The printed ID-card QR encodes only `qr_reference`** (opaque, no PII).

### Scan / verify — `POST /api/qr/qr/scan/`
```json
{ "qr_reference": "<opaque>", "latitude": 28.6139, "longitude": 77.2090 }
```
Worker scan → attendance flow:
- Location matches contractor → `attendance_status: "PRESENT"`
- Location mismatch → `attendance_status: "LOCATION_MISMATCH"`, `location_mismatch: true`
- No location / no contractor → `VERIFICATION_FAILED`

```json
{ "Result": "Success",
  "Data": {
    "worker": { "id": 9, "full_name": "Salu", "worker_id": "AK0826GJ3" },
    "attendance": { "id": 3, "date": "2026-08-15", "time": "12:12:14", "attendance_status": "PRESENT", "location_status": "MATCH", "location_mismatch": false },
    "location_status": "MATCH" } }
```

---

## Binding (hierarchy)

### Create binding — `POST /api/qr/bindings/`

Employer↔Contractor (needs employer approval):
```json
{ "binding_type": "EMPLOYER_CONTRACTOR", "employer": 1, "contractor": 2, "site_name": "Site A" }
```
→ status `PENDING`

Worker↔Contractor (geo-verified, auto-approved):
```json
{ "binding_type": "WORKER_CONTRACTOR", "worker": 9, "contractor": 1,
  "latitude": 28.6139, "longitude": 77.2090 }
```
- Geo must match contractor's location
- One worker ⇔ one contractor rule enforced (409 if already bound)

### Approve/reject — `POST /api/qr/bindings/<id>/approve/`
```json
{ "decision": "APPROVE" }   // or "REJECT"
```
Roles: SUPER_ADMIN, EMPLOYER

### Reassign contractor — `POST /api/qr/contractors/reassign/`
```json
{ "from_contractor": 1, "to_contractor": 5 }
```
Preserves worker/attendance/binding history; marks old contractor inactive.

---

## Activity / Dashboard

### Scan logs — `GET /api/qr/scans/?worker=9`
### Dashboard — `GET /api/qr/dashboard/`
```json
{ "Result": "Success",
  "Data": {
    "total_workers": 420,
    "total_scans": 6,
    "active_sites": 1,
    "scan_activity": { "today": 3, "this_week": 3, "this_month": 3 } } }
```

### Notifications — `GET /api/qr/notifications/`
Role-aware notification list.

---

## Legacy-compatible endpoints (existing frontend)

These match the old ASP.NET app's contract for migration. Use header `X-Legacy-Login-Id: <loginId>`.

| Endpoint | Method | Response |
|---|---|---|
| `/api/Login/GetUserId` | POST | `[{LoginId,UserName,Name,LoginType,...}]` |
| `/api/Login/NGetUserId` | POST | same |
| `/api/RetailSection/GetEmployeeMaster` | GET | JSON array of employees |
| `/api/RetailSection/GetStoreMaster` | GET | JSON array of stores |
| `/api/RetailSection/GetMaintainLog` | GET | JSON array of activity logs |

---

## Error format
All errors: `{ "Result": "Error", "Message": "<reason>" }`
- 401 = not authenticated / session expired
- 403 = role not permitted
- 409 = conflict (e.g. worker already bound)
- 429 = rate limited

## Notes for frontend
- **QR on ID card = `qr_reference` string** → render as a QR code (frontend QR lib) → scan endpoint returns worker + attendance.
- Login throttled to 10/min; scan throttled to 120/min.
- Worker/Contractor/Employer each get one unique QR automatically on creation.
