# BSS PROJECT INFRAQR — QR-based Hierarchical Workforce System

Django backend replacing the legacy ASP.NET BharatShramSetu backend, with integrated QR technology.

- **Stack:** Django 6.1 + Django REST Framework, PostgreSQL 16 (behind Pgpool-II), Redis 7 (sessions/cache), JWT auth
- **Ports:** Django `:8001`, PostgreSQL `5432` (pgpool) / `5433` (direct), Redis `6380`
- **Legacy source:** BharatShramSetu ASP.NET MVC 5 / Web API 2 (.NET Framework 4.6.1) — fully retired
- **Data:** 215 BharatSharamShetu tables migrated to PostgreSQL (~900k rows), schema-only dump at `docs/bss_schema.sql`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (TBD — React planned)                          │
│  JWT Bearer token  OR  X-Legacy-Login-Id (migration)     │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────▼────────────┐
              │   Django 6.1 + DRF      │  :8001
              │   bss_qr project        │
              └───┬───────────┬─────────┘
                  │           │
        ┌─────────▼───┐   ┌───▼───────────┐
        │  PostgreSQL │   │  Redis 7      │
        │  16 (pgpool)│   │  sessions/    │
        │  236 tables │   │  cache        │
        └─────────────┘   └───────────────┘
```

**Apps:**
| App | Purpose |
|---|---|
| `authx` | JWT auth, role-based users |
| `qr` | QR technology (codes, scan, attendance, binding, cards) |
| `api` | Legacy-compatible endpoints (167 ported routes) |
| `legacy` | Migrated BharatSharamShetu tables (PostgreSQL-owned models) |

---

## Services (Docker)

| Container | Port | Role |
|---|---|---|
| `bss-postgres` | 5433 (direct) / 5432 (via pgpool) | PostgreSQL 16 — single source of truth |
| `bss-pgpool` | 5432 | Connection pooler |
| `bss-redis` | 6380 | Sessions + cache |

> The legacy SQL Server was retired. All reference data was migrated into PostgreSQL.

---

# AUTH ENDPOINTS (`/api/auth/`)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Register user (role-selectable) |
| POST | `/api/auth/login/` | JWT login |
| POST | `/api/auth/refresh/` | Refresh JWT access token |
| GET | `/api/auth/me/` | Current user profile + role |
| POST | `/api/auth/logout/` | Logout (blacklist refresh token) |

**Roles:** `SUPER_ADMIN`, `BSS_STAFF`, `EMPLOYER`, `PRIMARY_CONTRACTOR`, `SECONDARY_CONTRACTOR`, `WORKER`

---

# QR TECHNOLOGY ENDPOINTS (`/api/qr/`)

## Entities
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/qr/employers/` | List employers |
| POST | `/api/qr/employers/` | Create employer (auto-generates QR) |
| GET | `/api/qr/contractors/` | List contractors |
| POST | `/api/qr/contractors/` | Create contractor (+geo location for verification) |
| GET | `/api/qr/workers/` | List workers |
| POST | `/api/qr/workers/` | Create worker (auto-generates QR + worker_id) |

## QR Codes
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/qr/qr/?entity_type=WORKER&entity_id=9` | Get opaque QR reference for an entity |
| POST | `/api/qr/qr/scan/` | Secure scan → geo-verified attendance |
| GET | `/api/qr/workers/<id>/card/?format=png\|pdf` | Render worker ID card with static QR |

**Scan flow:** `qr_reference` (opaque, no PII) → backend verifies HMAC → resolves worker → checks geo vs contractor location → marks attendance.

**Attendance statuses:** `PRESENT` (geo match) · `LOCATION_MISMATCH` (flagged + alert) · `VERIFICATION_FAILED` (no location/contractor).

## Binding (hierarchy)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/qr/bindings/` | Binding request (employer↔contractor / worker↔contractor) |
| POST | `/api/qr/bindings/<id>/approve/` | Employer approve/reject |
| POST | `/api/qr/contractors/reassign/` | Reassign workers, preserve history |

**Rules enforced:** 1 contractor ⇔ 1 employer · 1 worker ⇔ 1 contractor · primary can assign 1 secondary · worker binding requires geo match.

## Activity
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/qr/scans/?worker=9` | Scan logs |
| GET | `/api/qr/dashboard/` | Totals + scan activity (today/week/month) |
| GET | `/api/qr/notifications/` | Role-aware notifications |

---

# LEGACY ENDPOINTS (167 ported routes, `/api/`)

> Contract: data reads return `[ {column: value}, ... ]` (DataTable shape); writes return `{"status": true, "Result": ...}`. Auth via `X-Legacy-Login-Id: <loginId>` header (or JWT).

## Login (3)
| Endpoint | Purpose |
|---|---|
| `/api/Login/GetUserId` | Login (bcrypt + CAPTCHA) |
| `/api/Login/NGetUserId` | Login + session |
| `/api/Login/CaptchaImage` | CAPTCHA image + token |

## Dashboard (4)
| Endpoint | Purpose |
|---|---|
| `/api/Dashboard/ModuleList` | Modules |
| `/api/Dashboard/NavMenuList` | Nested module→menu→submenu tree |
| `/api/Dashboard/SubMenuList` | Submenus by menu |
| `/api/Dashboard/RoleList` | Roles |

## PartyMaster (9)
`GetPartyMasterDT`, `InsertUpdateDelPartyMaster`, `GetSearchLocation`, `InsertUpdateDelLocation`, `InsertUpdateDelLWFCompliance`, `GetNewCompliancesData`, `InsertUpdateDelMinimumWageCompliance`, `GetNewCMinmumWages`, `SaveDynamicRows`

## RetailSection (28)
`GetEmployeeMaster`, `UpdateEmpStatus`, `GetStoreMaster`, `GetMasters`, `GetStoreCodeNumber`, `UpdateStoresStatus`, `GenerateEmployeeCode`, `GetStatusMaster`, `GetStoreDataBySearch`, `StoreComplianceStatusMaster`, `GetLicenseAndRegistrationBy`, `GetNewsletter`, `RetailRolePermisssion`, `GetStoreDashboard`, `GetRetailMainDashboard`, `GetLSDashboard`, `GetLDashboard`, `bindworkerdetail`, `SendReqToWorker`, `GetWorkerJobHistory`, `ReleaseWorkerByContractor`, `ApproveorRejectRequest`, `SavePrincipleEmployer`, `ContractorDashboard`, `SearchPrincipleEmploye`, `WorkerDashboard`, `WorkerRegister` *(QR integrated)*, `GetMaintainLog`

## Retail — compliance calenders (47)
**Calendar/Industry:** `IUDRetailCreateActCalender`, `SearchRetailCreateActCalender`, `IUDActoverview`, `InsertRetailCreateIndustry`, `SearchRetailCreateIndustry`, `InsertCreateOverview`, `INUIndustryMapping`, `SearchMapping`
**Statutory:** `IUDStatutory`, `SearchStatutory`, `IUDStatutoryInternal`, `SearchStatutoryInternal`, `CategoryStatutory`, `IUDSecretarialStatutory`, `SearchSecretarialStatutory`, `IUDStatutorySetup`, `SearchStatutorySetup`, `IUDSecretarialStatutorySetup`, `SearchSecretarialStatutorySetup`
**Financial:** `IUDRetailFinacialCreateActCalender`, `SearchRetailFinacialCreateActCalender`, `SearchFinancialCreateActCalender`, `IUDFinancialStatutory`, `SearchFinacialStatutory`, `SearchFinacialStatutoryEvent`, `AddFinancialEventcompliance`, `IUDFinancialStatutorySetup`, `SearchFinancialStatutorySetup`
**Factory:** `IUDFactoryCompliance`, `SearchFactoryCompliance`, `IUDFactoryStatutory`, `SearchFactStatutory`, `AddFactoryEventcompliance`, `SearchFactoryEventcompliance`
**Labour:** `IUDLabourcodeCompliance`, `SearchLabourcodeCompliance`, `IUDLabourCodeStatutory`, `AddLabourEventcompliance`, `SearchLabourEvent`, `SearchLc`, `SearchLC`
**Dashboards:** `SearchClientDashboard`, `SearchComplianceDashboard`, `InsertMainRetailDashboard`, `SearchMainRetailDashboard`, `verifyvalid`, `verifyvalid_`

## Worker (5)
`SavePhoto`, `SaveDocument` (OCR), `AgainSaveDocument`, `getdetailocr`, `UploadName`

## Contractor (3)
`SaveBillingOrder`, `SaveLicense`, `GetSiteOverview`

## DocumentMaster (13)
`GetMapping`, `InsertUpdateDelMapping`, `VerifyMap`, `GetDocumentMaster`, `IUDDocumentMaster`, `VIUDDocumentMaster`, `GetOneTimeDocumentMaster`, `IUDOneTimeDocumentMaster`, `IUDComplianceMaster`, `GetAuditorCompliance`, `InsertUpdateDelAuditorCompliance`, `IUDAuditorComplianceQUERY`, `updateAuditorCompliance`

## VenInvoice (9)
`GetVenInvoiceListDT`, `GetInvoiceList`, `ApproveUploadDoc`, `SetINVOICEDATE`, `GetValidateInvoice`, `UploadDoc`, `InsertUpdateDelVenInvoice`, `InsertUpdateDelWithoutVenInvoice`, `NewInsertUpdateDelVenInvoice`

## Newsletter (6)
`GetNewsletterDT`, `GetNewsletterForSearchDT`, `GetDepartments`, `InsertUpdateNewsletter`, `UpdateNewsletterSummary`, `GetNewsletterClientNames`

## Communication (3)
`GetCommunication`, `IUDCommunication`, `DownloadFiles`

## Grievances (3)
`UploadDocuments`, `getGrivances`, `ApproveLetter`

## Skill (4)
`AddCourse`, `UpdateFlags`, `GetCourseDetail`, `SaveVideo`

## Rozgar (4)
`SavejobPost`, `GetRozgarDetail`, `ApplyForm`, `SearchApplyForm`

## Rating (3)
`SearchRating`, `GetValues`, `IUDRating`

## Report (2)
`SearchReport`, `SearchReminderReport`

## SendEmail (4)
`SendEmail`, `SendEmailForNewsletter`, `SendEmailApi/SendEmail`, `SendEmailApi/SendEmailBULK`

## SiteManager (2)
`GetSiteManagerListDT`, `InsertUpdateDelSiteManager`

## TimePeriod (2)
`IUDTimePeriod`, `GetSearchTimePeriod`

## ChangePasscode (3)
`checkPassCode`, `ModifyPassCode`, `UploadPhoto`

## CDM (2)
`GetCDM`, `IUDCDM`

## ClientActMapping (2)
`IUDClientActMapping`, `SearchClientActMapping`

## Chat (4)
`SaveChatMessage`, `updatechatbot`, `SearchChatbot`, `Approve`

## Payment (1)
`CreateOrder` *(stub — no real gateway)*

## NotificationReminder (1)
`SendRemainder`

---

# Setup

```bash
cd backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill secrets
./venv/bin/python manage.py migrate
./venv/bin/python manage.py createsuperuser
./venv/bin/python manage.py runserver 0.0.0.0:8001
```

# Verification

- `docs/contract_sweep.py` — all 167 legacy endpoints → HTTP 200
- `docs/contract_diff.py` — A/B diff vs old .NET backend (see `docs/CONTRACT-TESTS.md`)
- `docs/API-FRONTEND.md` — API reference for the frontend team

# Security (vs legacy)

- No hardcoded credentials — all via `.env`
- Parameterized ORM queries (no string-concatenated SQL)
- JWT + rate-limited login (10/min) — brute-force protection
- Role-based access on QR endpoints
- Security headers middleware (CSP, X-Frame-Options, nosniff)
- Opaque QR references (no PII in QR)
- Audit logging for binding/creation/reassignment/scan events

# Known stubs

- **Email** → logged to `emaillog` (SMTP not wired)
- **Payment** → logged (no Cashfree call)
- **OCR** → accepts `raw_text` input substitute
- **DigiLocker** OAuth → needs client credentials
