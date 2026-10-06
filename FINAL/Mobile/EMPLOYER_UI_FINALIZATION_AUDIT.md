# Employer Portal — Multi-Agent UI/UX Finalization Audit

Requirement source of truth: `Files_Reference/BSS_Employer.csv` (16 sections A–P) + the task brief (Employer Payrole / distribution / provenance).

## 1 · Requirement counts

| Metric | Count |
|---|---|
| Rows in `BSS_Employer.csv` | 192 lines |
| Field / Data Element rows (A–P) | 160 |
| Section headers + sub-headers + blanks | 32 |
| **Actionable requirements (DONE)** | **160 + Payrole module** |
| NOT APPLICABLE | 0 |
| BLOCKED / AMBIGUOUS | 0 |

## 2 · Files modified / created

| Change | File |
|---|---|
| **NEW — Employer Payrole workspace** (Overview, Worker Payrole, Manual Entry, Bulk Upload, Distribution, Exceptions, History) | `src/app/employer/payrole/page.tsx` |
| **NEW — Employer Payrole components** | `src/components/employer/payrole/EmployerManualEntry.tsx`, `EmployerBulkUpload.tsx`, `DistributionView.tsx`, `PayroleHistory.tsx` |
| **NEW — shared provenance badges** | `src/components/contractor/payrole/PayroleProvenance.tsx` |
| **MODIFIED — Employer profile → all 16 CSV sections (A–P)** | `src/app/employer/profile/page.tsx`, `src/server/demo-data.ts` (profileSections) |
| **MODIFIED — Employer data model + demo data** (payrole, source/matchState, contractor destination) | `src/types/portal.ts`, `src/server/demo-data.ts`, `src/server/portal.ts` |
| **MODIFIED — Employer dashboard** (Payrole summary card + REVIEW REQUIRED action) | `src/app/employer/dashboard/page.tsx` |
| **MODIFIED — Employer navigation** (Payrole route) | `src/components/employer/EmployerShell.tsx` |
| **MODIFIED — Employer scan (was broken)** — old page re-exported the Worker scanner (`useWorker` outside `WorkerProvider` → runtime error). Rebuilt as a proper Employer scanner: Worker/Contractor QR → identify → relationship → confirm (never auto-bind) | `src/app/employer/scan/page.tsx` |
| **MODIFIED — Employer Manual Entry filters** — added Site + Contractor filters per brief (Site / Contractor / Worker / Period) | `src/components/employer/payrole/EmployerManualEntry.tsx` |
| **MODIFIED — Contractor Payrole (minimal provenance)** | `src/app/contractor/payrole/page.tsx` (source column, Received-from-Employer banner, drawer provenance) + demo records PR-05..PR-07 |

## 3 · Reuse map

| Item | Detail |
|---|---|
| Worker components reused | `EnterpriseDataTable`, KPI cards (`bss-kpi-card`), Action Required banner, badges, drawer, header patterns |
| Contractor components reused | `PayroleCalculator` (`computePayrole`, `validateRows`, `rowToRecord`, `writeXlsx`, `readSpreadsheet`, `downloadTableAsXls`, `formatInr`) |
| Shared Payrole schema | Same `templateColumns` + `ContractorPayroleConfig` + `PayroleWorkerRecord` (extended with optional `source` / `matchState` / `contractor`) |
| QR / Binding | Employer reuses the existing scan → identify → validate → confirm → approval flow (`employer/scan` rebuilt, `qr/workers`, `qr/contractors`, `qr/requests`, `bindings`) — no new QR system; **the previous broken re-export of the Worker scanner was fixed** |
| Contractor screens modified | `contractor/payrole/page.tsx` only — provenance column + banner + drawer. No other Contractor/Worker screens changed |

## 4 · Employer Payrole — task-brief checklist

| Check | Status |
|---|---|
| Same Worker-level Payrole schema as Contractor | ✅ same `PayroleWorkerRecord` + `templateColumns` |
| Manual Entry works visually | ✅ worker select with **Site / Contractor filters** (per brief) → earnings → deductions → live computation → Save Draft / Review / Submit |
| Bulk XLS/XLSX upload | ✅ Download Template + upload + validate + preview + confirm |
| Validation preview & errors | ✅ valid/invalid rows, missing mandatory, invalid formats, duplicate worker IDs, row-level errors, Download Error Report |
| Worker → Site → Contractor mapping shown | ✅ worker column + mapping column in bulk preview + manual entry panel |
| Automatic Contractor distribution | ✅ records routed by binding, no manual redistribution |
| Distribution preview | ✅ Total / Mapped / Unmapped / Contractors receiving + per-contractor groups with drill-down |
| Unmapped workers flagged | ✅ `MAPPING REQUIRED` (never silently assigned) |
| Payrole Source visible | ✅ `SourceBadge` (Employer Provided / Contractor Entered) in records, drawer, history, filters |
| Contractor distinguishes Employer-provided | ✅ banner "received from the Principal Employer" + source column + drawer |
| Contractor-entered remains supported | ✅ existing contractor entries keep `Contractor Entered` |
| Duplicate/conflict states | ✅ `Matched` / `Needs Review` + REVIEW REQUIRED banner showing both sources, no auto-resolution |
| History traceable | ✅ Payrole History tab (who/when/destination/source) |
| Contractor Payrole not broken | ✅ provenance is additive; build + route regression pass |

## 5 · Row-by-row audit — BSS_Employer.csv sections A–P

| Sr. No. | Section | Field / Data Element | Required | Visibility / Access | Remarks | Required Change | Implemented Screen | Status |
| ------: | ------- | -------------------- | -------- | ------------------- | ------- | --------------- | ------------------ | ------ |
| 1 | A | BSS Employer ID | System | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 2 | A | Registration Status | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 3 | A | Employer Category | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 4 | A | Legal Entity Name | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 5 | A | Trade / Brand Name | No | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 6 | A | Organisation Type | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 7 | A | Ownership Type | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 8 | A | CIN / LLPIN / Registration No. | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 9 | A | Company Name | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 10 | A | Listed on Stock Exchange | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 11 | A | Company Status | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 12 | A | ROC | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 13 | A | Registration Number | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 14 | A | Company Category | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 15 | A | Company Sub Category | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 16 | A | Class of Company | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 17 | A | Date of Incorporation | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 18 | A | Age of Company | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 19 | A | Activity | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 20 | A | NIC Code | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 21 | A | NIC Description | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 22 | A | Number of Members | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 23 | A | Date of Last Annual General Meeting | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 24 | A | Date of Last Filed Balance Sheet | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 25 | A | Authorised Share Capital | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 26 | A | Paid-up Share Capital | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 27 | A | DIN | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 28 | A | Director Name | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 29 | A | Designation | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 30 | A | Appointment Date | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 31 | A | Cessation | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 32 | A | Cessation Date | If applicable | — | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 34 | A | Date of Incorporation / Constitution | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 35 | A | PAN | Yes | Highly Restricted | Never public | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 36 | A | GSTIN | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 37 | A | TAN | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 38 | A | Registered Office Address | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 39 | A | Corporate Website | No | Public | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `identity`) | DONE |
| 42 | B | Industry / Sector | Yes | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 43 | B | Industry | Yes | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 44 | B | NIC Code | Conditional | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 45 | B | Nature of Business / Activity | Yes | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 46 | B | Major Products / Services | No | Public / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 47 | B | Operational Footprint | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `business`) | DONE |
| 50 | C | Authorised Signatory Name | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 51 | C | Designation | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 52 | C | Official Email | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 53 | C | Official Mobile | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 54 | C | HR / Workforce Head | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 55 | C | HR Email | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 56 | C | Compliance Officer | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 57 | C | Compliance Email | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 58 | C | Medical Officer | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 59 | C | Medical Email | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 60 | C | Saftey officer | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 61 | C | Saftey Email | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contacts`) | DONE |
| 64 | D | Registered Address Line 1 | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 65 | D | Registered Address Line 2 | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 66 | D | City | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 67 | D | District | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 68 | D | State | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 69 | D | PIN Code | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 70 | D | Country | Yes | Public | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 71 | D | Correspondence Address Same as Registered | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 72 | D | Correspondence Address | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `address`) | DONE |
| 75 | E | Identity Verification Status | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `verification`) | DONE |
| 76 | E | Verification Date | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `verification`) | DONE |
| 77 | E | Verification Source | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `verification`) | DONE |
| 78 | E | PAN Verification Status | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `verification`) | DONE |
| 79 | E | GST Verification Status | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `verification`) | DONE |
| 82 | F | EPFO Establishment ID | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 83 | F | ESIC Employer Code | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 84 | F | Shops & Establishment Registration | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 85 | F | Factory Licence | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 86 | F | Contract Labour Registration | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 87 | F | BOCW Registration | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 88 | F | Professional Tax Registration | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 89 | F | LWF Registration | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 90 | F | Apprenticeship Establishment ID | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 91 | F | Other Regulatory Registration(s) | No | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `statutory`) | DONE |
| 94 | G | Workforce Model | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 95 | G | Total Direct Workers | No | Role-based | System calculated | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 96 | G | Total Contract Workers | No | Role-based | System calculated | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 97 | G | Total Fixed-Term / Temporary | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 98 | G | Total Apprentices / Trainees | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 99 | G | Total Gig / Platform Workers | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 100 | G | Total Workers – Current | No | Role-based | Calculated | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 101 | G | Worker Categories Engaged | Yes | Role-based | Multi-select | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `workforce`) | DONE |
| 104 | H | Employment Types Used | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 105 | H | Payroll Frequency | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 106 | H | Wage Period | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 107 | H | Attendance Method | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 108 | H | Worker Onboarding Method | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 109 | H | Minimum Wage Mapping | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 110 | H | Overtime Applicable | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 111 | H | Bonus Applicable | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 112 | H | Gratuity Applicable | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 113 | H | Salary / Wage Structure Available | Yes | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `employment`) | DONE |
| 116 | I | PF Coverage | Conditional | Restricted / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 117 | I | ESIC Coverage | Conditional | Restricted / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 118 | I | Gratuity Coverage | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 119 | I | LWF Coverage | Conditional | Restricted / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 120 | I | Group Medical Insurance | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 121 | I | Accident Insurance | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 122 | I | Other Worker Benefits | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `benefits`) | DONE |
| 125 | J | Occupational Health Facility | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 126 | J | Medical Examination Process | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 127 | J | First Aid Facility | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 128 | J | PPE Management | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 129 | J | Safety Training | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 130 | J | Site Induction | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 131 | J | Emergency Response Plan | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 132 | J | Fire Safety Certificate | Conditional | Restricted / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 133 | J | Canteen Facility | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 134 | J | Creche Facility | Conditional | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 135 | J | Transport Facility | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 136 | J | Accommodation / Camp Facility | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `safety`) | DONE |
| 139 | K | Contractor Engagement | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 140 | K | Number of Active Contractors | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 141 | K | Contractor Verification Required | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 142 | K | Contractor Onboarding via BSS QR | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 143 | K | Contractor Compliance Monitoring | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 144 | K | Contractor Worker Deployment Tracking | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 145 | K | Contractor Attendance Integration | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `contractor-mgmt`) | DONE |
| 148 | L | Number of Establishments | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 149 | L | Number of Active Sites | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 150 | L | Site Registration in BSS | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 151 | L | Site QR Generated | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 152 | L | QR Worker Onboarding Enabled | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 153 | L | QR Attendance Enabled | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 154 | L | Gate Pass / Access Control | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 155 | L | Emergency QR / SOS | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `sites-qr`) | DONE |
| 158 | M | Worker Grievance Mechanism | Yes | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `worker-relations`) | DONE |
| 159 | M | Grievance Officer | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `worker-relations`) | DONE |
| 160 | M | Internal Complaints Committee / POSH | Conditional | Restricted / role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `worker-relations`) | DONE |
| 161 | M | Standing Orders / Service Rules | Conditional | Restricted | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `worker-relations`) | DONE |
| 162 | M | Worker Communication Channel | No | Role-based | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `worker-relations`) | DONE |
| 165 | N | Privacy Policy | Yes | Public / internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 166 | N | Consent Management | Yes | Internal / audit | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 167 | N | Role-Based Access Control | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 168 | N | Audit Trail | Yes | Internal / authorised | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 169 | N | Encryption at Rest | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 170 | N | Encryption in Transit | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 171 | N | MFA for Admin Users | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 172 | N | Incident Response Process | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 173 | N | Data Retention Policy | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `governance`) | DONE |
| 176 | O | BSS API Integration Required | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 177 | O | API Setu Integration | Conditional | Internal / authorised | Only approved APIs | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 178 | O | DigiLocker Integration | Conditional | Internal / authorised | Only approved services | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 179 | O | HRMS Integration | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 180 | O | Payroll Integration | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 181 | O | Attendance Integration | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 182 | O | SSO Integration | No | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `integration`) | DONE |
| 185 | P | Information Accurate | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 186 | P | Authorised Representative Confirmation | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 187 | P | Terms & Conditions Accepted | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 188 | P | Privacy Policy Accepted | Yes | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 189 | P | Consent for Verification | Conditional | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 190 | P | Registration Date | System | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |
| 191 | P | Last Updated | System | Internal | — | Rendered as profile field with visibility note | Employer Profile · src/app/employer/profile/page.tsx (tab `declarations`) | DONE |

## 6 · Notes

- **NOT APPLICABLE = 0, BLOCKED/AMBIGUOUS = 0.** Every CSV field row is rendered on the Employer Profile page across the 16 section tabs (A–P) with its CSV visibility note (Restricted / Highly Restricted / Public / System-calculated). The two CSV spellings `Saftey officer` / `Saftey Email` are preserved verbatim (marked "CSV spelling preserved").
- **Employer Payrole** is a new workspace implemented per the task brief using the Contractor Payrole engine; it adds the Employer-specific **Distribution** tab (Worker → Site → Contractor routing) and **source provenance** across records, drawer, filters, history and distribution.
- Payrole provenance is a shared, additive model: `PayroleWorkerRecord` gained optional `source`, `matchState`, `contractor`. No duplicate record sets — one record per worker-period carries its provenance state.
- Frontend-only scope: uploads, validation and reconciliation are demonstrated with frontend state per the brief.
