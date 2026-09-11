# Worker Portal — Deviation Analysis (Sheet vs Current Architecture)

Source sheet: `BSS_Feature_Comparison.xlsx` → "Worker" sheet (Data Owner column).
Current code: `Backend/api/v1_payloads.py` (payload), `api/v1_bridge.py` (persist),
`Frontend/BSS_Gravity/src/app/worker/*` (UI).

## Legend
- ✅ MATCHES sheet
- 🔴 WRONG SOURCE — field read from the wrong owner/table
- 🟠 MISSING — sheet field not exposed in the payload at all (even if a DB column exists)
- 🟡 FABRICATED — hardcoded/literal value instead of the real owner
- 🔵 EDITABILITY — field is editable when it should be locked (or vice-versa)

---

## A. Worker Identity (tab)

| Field | Sheet owner | Current behaviour | Verdict |
|---|---|---|---|
| BSS Worker ID | System Generated | `bss_worker_id`, readOnly | ✅ |
| Name | Aadhaar | `WorkerIdentity.name`, readOnly | ✅ |
| Gender | Aadhaar | `WorkerIdentity.gender` | ✅ |
| **Date of Birth** | **Aadhaar** | FE renders editable `<input type=date>` | 🔵 (should be locked) |
| **Age** | Auto from DOB | FE `ageFromDoB()`, readOnly | ✅ |
| Mobile | Auto (registration) | `mobile_number` | ✅ |
| Alternate Mobile | Manual Entry | `alternate_mobile` | 🟠 not persisted (save is fake) |
| Email | Manual Entry | `email` | 🟠 not persisted |
| Marital Status | Aadhaar | `marital_status` | ✅ (but save fake) |
| Father Name | Aadhaar | `father_name` | ✅ |
| Mother / Spouse | Manual Entry | `mother_name`, `spouse_name` | 🟠 not persisted |
| Emergency contact (name/num/rel) | Manual Entry | **DB has fields, payload does NOT expose them** | 🟠 MISSING |
| Disability Status/Type/% | Manual Entry | `disability_status` in DB; `disability_type_pct` NOT exposed | 🟠 partially missing |
| Blood Group / Religion / Caste | Manual Entry | exposed in `personal` section | 🟠 not persisted |
| Worker Photo | Aadhaar | `photo` | ✅ |
| PAN No. | Manual Entry | `pan` | 🟠 not persisted |
| Aadhaar No. | Aadhaar | `aadhaar` | ✅ |

### 🔴 CRITICAL: the entire Profile "Save" is fake
`Profile/page.tsx` `handleSave()` (line 93) just shows a "Persona Updated" toast after
1.5s. **There is no `saveWorker`/`fetch`/`PATCH` in the whole page.** Every
"Worker Manual Entry" field (alternate mobile, email, mother, spouse, emergency,
disability, blood group, religion, caste, PAN) is therefore write-only dead — it
shows in the UI but never reaches the DB.

## B. Address & Mobility

| Field | Sheet owner | Verdict |
|---|---|---|
| Current address/state/district/city/pin | Aadhaar | ✅ (exposed, readOnly) |
| Permanent address/state/district/city/pin | Manual Entry | 🟠 not persisted |
| Migrant Worker / Migration Type | Manual Entry | 🟠 not persisted |

## C. Employment & Work

| Field | Sheet owner | Verdict |
|---|---|---|
| Job/Designation | Contractor | 🟡 was hardcoded `"Senior Bar Bender"` (now empty) |
| Shift | Contractor | 🟡 was `"General"` (now empty) |
| Employer/Contractor/Site names + LIN | Auto after Binding | 🟡 were hardcoded (L&T / RK Buildcon / Mumbai Metro) — now real/empty |
| Camp No. | Manual Entry | 🟠 MISSING (no field) |
| Transport / Route / Bus No. | Contractor | 🟠 MISSING (no field) |
| ID Card Validity Till | Contractor | 🟠 MISSING (no field) |
| PF Account | Manual Entry | 🟠 MISSING |
| Nature of Job / Type of Work | Manual Entry | 🟠 MISSING |
| Reference Worker ID | Auto | 🟠 MISSING in payload (DB has none) |
| DOJ / Department | Auto | ✅ (real, was hardcoded fallback now removed) |

## D. Family & Dependants

All fields are "Worker Manual Entry" in the sheet. Current: **nominee data is
FE-local `useState` only — no backend persist at all.** 🟠 MISSING (whole tab
never persists).

## E. Social Security

| Field | Sheet owner | Verdict |
|---|---|---|
| EPFO UAN / ESIC IP | Manual Entry + Auto | ✅ exposed (but not persisted) |
| LWF No. | Manual Entry | 🟠 MISSING |
| WC Policy No. | Manual Entry | 🟠 MISSING |
| e-Shram No. | Manual Entry | 🟡 only boolean `eShramLinked`, number not exposed |
| BOCW Reg No. | Manual Entry | 🟡 only boolean `bocwRegistered` |
| State Worker ID | Manual Entry | 🟠 MISSING |

## F. Welfare & Safety

| Field | Sheet owner | Verdict |
|---|---|---|
| PPE Required | Manual Entry | 🟠 MISSING (only "PPE given" exposed) |
| Safety Training Completed | Manual Entry | 🟡 FE reads `medicalExaminationStatus` (wrong field) |
| Site Induction / Police Verification | Manual Entry | ✅ exposed |
| Insurance / Accommodation | Manual Entry | 🟠 MISSING |
| Training Date / Trainer Name | Manual Entry | 🟠 MISSING |
| Medical exam status/fitness/dates | Manual Entry | ✅ exposed (medicalFitnessStatus etc.) |
| TGP/PGP (status/no/dates) | Auto after Binding | 🟠 MISSING (gate pass not in worker payload) |

## G. Banking

| Field | Sheet owner | Verdict |
|---|---|---|
| Bank name/holder/acct/IFSC | Auto Bank verification | ✅ exposed (bank_verification_status) |
| Bank Verification Status | Auto Bank verification | ✅ exposed |
| UPI Enabled | Manual Entry | 🟠 MISSING |

## H. Worker Classification

All "Worker Manual Entry". The `WorkerClassification` model **has all fields**
(sector, industry, occupation, gig, self-employment, seasonal), but the worker
payload **does not expose any of them** (only `identity.category` reads
`worker_category`). 🟠 MISSING (whole tab).

## I. Skills & Employability

All "Worker Manual Entry". Exposed: primary/secondary skill + certification
(name/verified). Missing: qualification, board, passing year, certification
number/authority/expiry, languages. 🟠 partially missing.

## J. Dashboard derived fields

| Field | Sheet owner | Verdict |
|---|---|---|
| Identity Verification | Aadhaar | 🔴 was hardcoded `VERIFIED` + UAN/ESIC always `done` → now reads real flags |
| Medical / Safety Kit / Training status | Contractor Side | 🔴 reads `WorkerWelfareSafety` (worker row), should come from contractor |
| Wage History | Contractor Side | 🟡 reads `WorkerWages` (worker's own) |
| Gate Pass status | Auto after employer approve | 🟡 reads `permanentGatePass` (worker row) |
| Availability banner | (Rozgar Setu toggle) | 🔴 was `localStorage` → now `WorkerOther.available_for_work` |

## K. Static content (no DB owner in sheet)

| Item | Verdict |
|---|---|
| Labour law list | 🟡 was 3 fabricated rows → now empty (needs `ComplianceMaster`) |
| Holidays | 🟡 fabricated → empty (no table) |
| Announcements | 🟡 fabricated → empty (no table) |
| Courses ("Contractor Side") | 🟡 fabricated → empty (no table) |
| Leave types | 🟡 fabricated → empty (no table) |
| Gratuity block | 🟡 entirely fabricated (serviceStart, completedService, eligible) |

## L. Settings screen

| Item | Verdict |
|---|---|
| Interface language / notifications / comms / accessibility / privacy | 🔴 wired to a NEW `WorkerSettings` table I created, but sheet's gap-analysis specifies **`UserPreference`** (which already existed). Duplicate table. |
| "Consents you have given" list | 🔴 `lib/consents.ts` `consentService` is a hardcoded client list |

## M. Cross-cutting (from gap-analysis)

- `GrievanceResponse` + `assigned_to` + `ticket_no` + `category` + `attachment` — ✅ model exists, but UI grievance flow is demo.
- Notification centre — `Notification` model exists; FE `NotificationContext` is local state, not wired to `/v1/worker/notifications`.

---

## Priority deviation fixes

1. **🔴 Profile save is fake** — wire every Manual-Entry field to a real PATCH.
2. **🔵 Lock Aadhaar-owned fields** (DOB, name, gender, father, photo) — read-only.
3. **🟠 Expose missing fields** — classification, family/nominee, social-security
   (LWF/WC/eShram/State ID), welfare (insurance/accommodation/training), banking UPI,
   employment (transport/route/bus/PF/camp).
4. **🔴 Dashboard contractor-owned statuses** — source medical/safety/wage from
   contractor, not worker rows.
5. **🔴 Consolidate settings** — drop `WorkerSettings`, keep `UserPreference`.
6. **🟡 Back static lists with master tables** (ComplianceMaster, HolidayMaster, etc.).
