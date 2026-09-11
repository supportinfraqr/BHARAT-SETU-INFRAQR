# Worker Portal — API Connection Map

Scope: everything rendered at `https://bharat-shram-setu-staging.bharatshramsetu.com/worker`
Goal: remove every hardcoded/mock value and wire each screen section to the real backend.

## How the data flows (single chain)

```
React page (src/app/worker/*.tsx)
   └─ useWorker() → src/contexts/WorkerContext.tsx
        └─ GET  /api/portal          (src/app/api/portal/route.ts)
             └─ src/server/portal.ts :: getWorkerPortal(session)
                  └─ GET  {config.apiBaseUrl}/v1/worker/portal   (Django)
                       └─ api/v1_bridge.py → api/v1_payloads.py :: build_worker_portal(user)

Writes:
   PATCH /api/portal/profile   → src/server/portal.ts → PATCH /v1/worker/profile
   PATCH /api/portal/settings  → PATCH /v1/worker/settings
   (both land in api/v1_bridge.py :: _persist_mutation)
```

The payload is a single JSON object returned by `build_worker_portal(user)` in
`Backend/api/v1_payloads.py`. Every key below is a key of that object.

Legend:
- ✅ REAL — backed by a DB table, no hardcoded fallback
- ⚠️ PARTIAL — DB-backed but has hardcoded fallback values
- ❌ HARDCODED — static mock list, no DB backing

---

## 1. Welcome header + place-of-birth gate

| Screen element | Payload key | Source | Status |
|---|---|---|---|
| "Welcome, {name}" | `worker.identity.name` | `WorkerIdentity.name` | ✅ REAL |
| Worker badge | `worker.identity.bssId` | `WorkerIdentity.bss_worker_id` | ✅ REAL |
| place-of-birth gate | `worker.identity.placeOfBirth` | `WorkerIdentity.place_of_birth` | ✅ REAL (migration 0009) |

Gate shows when `place_of_birth` is empty. Save → `PATCH /v1/worker/profile` →
`_persist_mutation` profile branch reads nested `identity.placeOfBirth` and writes
`WorkerIdentity.place_of_birth`. ✅ FIXED this session.

---

## 2. Profile card (photo, name, category, primary skill, status)

| Screen element | Payload key | Source | Status |
|---|---|---|---|
| Photo | `worker.identity.photoUrl` | `WorkerIdentity.photo` | ✅ REAL |
| Name | `worker.identity.name` | `WorkerIdentity.name` | ✅ REAL |
| Category | `worker.identity.category` | ❌ returns `""` always | ❌ HARDCODED (empty) |
| Primary skill | `worker.skills.primary.name` | `WorkerSkillsEmployability` | ✅ REAL |
| Employment status | `worker.employment.status` | `WorkerEmployment.status` | ✅ REAL |

---

## 3. KPI cards (Profile / Documents / Compliance / Attendance)

| Card | Payload key | Source | Status |
|---|---|---|---|
| Profile | `worker.contact.*` + `worker.address.*` | real rows | ✅ REAL |
| Documents | `worker.documents.uploaded`/`.required` | `WorkerDocument` + `WorkerDocumentMaster` | ✅ REAL |
| Compliance | `worker.compliance.medicalFitnessDaysLeft` | `WorkerWelfareSafety` | ✅ REAL |
| Attendance | `portal.attendance.records` | `Attendance` | ✅ REAL |

---

## 4. Compliance overview (appointment letter, gate pass, medical, safety kit, training)

| Element | Payload key | Source | Status |
|---|---|---|---|
| Appointment letter | `portal.documents[].name` | `WorkerDocument` | ✅ REAL |
| Gate pass | `worker.compliance.permanentGatePass` | `WorkerWelfareSafety` | ✅ REAL |
| Medical status | `complianceOverview` line 60 | ❌ `'Fit'` literal | ❌ HARDCODED |
| Safety kit | `worker.compliance.ppeIssued` | `WorkerWelfareSafety` | ✅ REAL |
| Safety training | line 62 | ❌ `'Completed'` literal | ❌ HARDCODED |

---

## 5. "Needs your attention"

| Element | Payload key | Source | Status |
|---|---|---|---|
| Missing documents | `portal.documents[].status` | `WorkerDocument` | ✅ REAL |
| Medical fitness days | `worker.compliance.medicalFitnessDaysLeft` | `WorkerWelfareSafety` | ✅ REAL |
| Pending binding | `portal.jobRequests[].status` | `RozgarRequest` | ✅ REAL |

---

## 6. Labour law compliance

| Payload key | Source | Status |
|---|---|---|
| `portal.labourLaw` | `_worker_labour_law()` returns a **static list** | ❌ HARDCODED |

Needs: a `LabourLaw`/`ComplianceMaster` table (see gap analysis §D).

---

## 7. Profile completion %

| Payload key | Source | Status |
|---|---|---|
| computed FE-side from `worker.contact/identity/socialSecurity/banking` | real rows | ✅ REAL |

---

## 8. Current employment details (designation, employer, contractor, site, shift, dept, doj, + expandable contractor/employer/site details)

| Element | Payload key | Source | Status |
|---|---|---|---|
| Designation | `worker.employment.designation` | `WorkerEmployment.designation` | ⚠️ fallback `"Senior Bar Bender"` |
| Employer | `worker.employment.employer` | binding→`EmployerProfile` | ⚠️ fallback `"Larsen & Toubro Construction"` |
| Contractor | `worker.employment.contractor` | binding→`ContractorProfile` | ⚠️ fallback `"RK Buildcon Pvt. Ltd."` |
| Site | `worker.employment.site` | binding→`Site` | ⚠️ fallback `"Mumbai Metro Line 3"` |
| Shift | `worker.employment.shift` | `WorkerEmployment.shift` | ⚠️ fallback `"General"` |
| Dept | `worker.employment.department` | `WorkerEmployment.department` | ⚠️ fallback `"Civil"` |
| DOJ | `worker.employment.doj` | `WorkerEmployment.doj` | ⚠️ fallback `"2024-08-12"` |
| `contractorDetails` | `worker.employment.contractorDetails` | `ContractorProfile` | ⚠️ fallback codes `BSS-CON-1029`, `LIN-MH-12938` |
| `employerDetails` | `worker.employment.employerDetails` | `EmployerProfile` | ⚠️ fallback `BSS-EMP-98921`, `LIN-MH-77412` |
| `siteDetails` | `worker.employment.siteDetails` | `Site` | ⚠️ fallback `MM3-CIVIL`, `Dr. Shalini Sharma`, `+91 99887 76655` |

**Root cause of every fallback:** the worker has **no active `WorkerContractorBinding`**
(`emp.assignment_id` is null), so `binding` is `None` and `_worker_employment_section`
returns hardcoded strings. Fix = seed a real binding (or stop fabricating).

---

## 9. Identity verification list (Aadhaar / PAN / UAN / ESIC / Bank)

| Element | Payload key | Source | Status |
|---|---|---|---|
| Aadhaar | `worker.identity.aadhaar` | `WorkerIdentity.aadhaar` | ✅ REAL |
| PAN | `worker.identity.pan` + `.panVerified` | `WorkerIdentity` | ✅ REAL |
| UAN | `worker.socialSecurity.epfoUan` | `WorkerSocialSecurity` | ✅ REAL |
| ESIC | `worker.socialSecurity.esicIp` | `WorkerSocialSecurity` | ✅ REAL |
| Bank verification | `worker.banking.verificationStatus` | `WorkerBanking` | ✅ REAL |

---

## 10. Quick access grid (16 tiles)

| Tile | Payload key | Source | Status |
|---|---|---|---|
| View card / identity / profile / attendance / leave / skills | UI nav | real rows | ✅ REAL |
| Holiday calendar | `portal.holidays[0]` | `_worker_holidays()` static list | ❌ HARDCODED |
| Wage history | `portal.wages.records[0]` | `WorkerWages` | ✅ REAL |
| Retirement benefits | `portal.providentFund.records` | `_worker_financial_records()` → **returns empty** | ❌ EMPTY (no data) |
| Documents / compliance / announcements | `portal.announcements` | `_worker_announcements()` static | ❌ HARDCODED |
| Notifications | `NotificationContext.actionCount` | FE-local | ⚠️ not DB-backed |
| Grievances / binding / settings | nav | real rows | ✅ REAL |

---

## 11. Contractor binding popup (demo, fires on login)

| Element | Source | Status |
|---|---|---|
| "RK Buildcon wants to bind with you" + popup | `worker/page.tsx` lines 22-31, 89-94 — **hardcoded demo** | ❌ HARDCODED |

Should be driven by `portal.jobRequests` where `status === 'Pending'` (binding request)
instead of a fake `BIND-2026-118` notification. Remove the `sessionStorage` demo timer.

---

## 12. Availability banner ("Available for work — ON")

| Payload key | Source | Status |
|---|---|---|
| `availableForWork` | `localStorage['bss-worker-availability']` | ❌ HARDCODED (localStorage) |

Backend already returns `portal.availability` (hardcoded `True`). Should map to
`WorkerOther.qr_opt_in` / a real `availability` field.

---

## 13. Settings screen (`/worker/Settings`)

| Section | Payload key | Source | Status |
|---|---|---|---|
| Interface language | `worker.settings.interfaceLanguage` | `WorkerSettings` | ✅ REAL (this session) |
| Notification prefs | `worker.settings.jobAlerts/…` | `WorkerSettings` | ✅ REAL |
| Communication channel | `worker.settings.preferredChannel` | `WorkerSettings` | ✅ REAL |
| Accessibility | `worker.settings.largeText/highContrast/reduceMotion` | `WorkerSettings` | ✅ REAL |
| Privacy/QR | `worker.settings.consentToPublicPhoto/consentToDataSharing` | `WorkerSettings` | ✅ REAL |
| Consents you have given (Aadhaar/NPCI/EPFO/ESIC/QR) | `lib/consents.ts` → `consentService` | ❌ hardcoded client list | ❌ HARDCODED |

**Note:** `WorkerSettings` (worker.py) is a **duplicate** I created this session.
The gap-analysis sheet already specified `UserPreference` (engagement.py). One of the
two must be removed and the Settings screen pointed at the survivor.

---

## API endpoint summary (worker role)

| Method | Path | Backs | Status |
|---|---|---|---|
| GET | `/v1/worker/portal` | whole dashboard payload | ✅ REAL |
| PATCH | `/v1/worker/profile` | identity, settings, preferences | ✅ REAL |
| PATCH | `/v1/worker/settings` | WorkerSettings row | ✅ REAL |
| GET | `/v1/worker/notifications` | notification centre | ⚠️ needs `Notification` wiring |
| POST/PATCH | `/v1/worker/binding` | contractor binding accept/decline | ❌ demo only |
| POST | `/v1/worker/grievances` | raise grievance | ✅ model exists, UI demo |

---

## Priority fix order

1. **Remove hardcoded employment fallbacks** (`_worker_employment_section`) — the biggest
   visible mock on the dashboard (L&T / RK Buildcon / Mumbai Metro).
2. **Remove FE demo popup** (binding request) + **availability banner** localStorage.
3. **Back static lists with tables** — `labourLaw`, `holidays`, `announcements`,
   `courses`, `leave_types` (gap analysis §D masters).
4. **Consolidate settings** — drop `WorkerSettings`, keep `UserPreference`.
5. **Wire notification centre + binding workflow** to real `Notification` /
   `RozgarRequest` / `WorkerContractorBinding`.
