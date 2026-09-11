# BSS Feature-Comparison → Database Gap Analysis

Source: `FINAL/Requirements/BSS_Feature_Comparison.xlsx` (7 sheets)
Compared against: the current Django models / PostgreSQL schema (41 tables in `bss_core`).

This report lists **new database fields / tables / entities** the platform needs to
persist in order to store the data the feature comparison expects. Pure UI /
navigation / presentation changes (button renames, menu moves, filters, "download
XLS" buttons, dashboard metric counts) are intentionally excluded.

Legend:
- **NEW FIELD** = add a column to an existing table.
- **NEW TABLE / ENTITY** = create a new table (usually with its own child rows).
- Fields already present in the current schema are marked **EXISTS** (no work).

---

## A. WORKER (sheet "Worker")

Most worker fields already exist in the schema. Genuine additions:

| Area | Item | Action |
|---|---|---|
| Employment | `Site Code` on worker's employment card (currently only Site name; Site table HAS site_code) | Ensure `WorkerEmployment`/worker card exposes `site_code` (EXISTS on Site, wire it through) |
| Documents | Separate `Expiry Date` per worker document | **NEW FIELD** `WorkerDocument.expiry_date` (nil/date) |
| Documents | Document statuses `VERIFIED / MISSING / UNDER_VERIFICATION / REJECTED / EXPIRED` | `WorkerDocument.status` EXISTS; add `EXPIRED` to chooser + auto-expire logic |
| Documents | `Mandatory / Optional` on document upload join | **NEW FIELD** `WorkerDocument.is_mandatory` (or reuse `WorkerDocumentMaster.is_mandatory` — EXISTS, set at upload) |
| Documents | `Document Owner` (Worker/Contractor) | **NEW FIELD** `WorkerDocument.owner_role` (worker/contractor) |
| Grievance | Grievance categories (Wages/Safety/Harassment/Accommodation/Benefits/Other) | **NEW FIELD** `WorkerGrievance.category`
| Grievance | Audio recording + playback + duration | `WorkerGrievance.recording_file`/`recording_duration_secs` EXISTS; add `audio` support if not wired |
| Grievance | Attachment / letter upload | **NEW FIELD** `WorkerGrievance.attachment_file`
| Grievance | Ticket/reference number | **NEW FIELD** `WorkerGrievance.ticket_no` (auto, e.g. GV-000123) |
| Grievance | Status tracking Open/In-Progress/Resolved/Reopened + raised/updated timestamps | `WorkerGrievance.status` EXISTS; add `resolved_at`, `reopened_at`, `updated_at` |
| Grievance | Contractor/Employer reply history + assignment | **NEW TABLE** `GrievanceResponse` (grievance, actor_role, reply, attachment, created_at) + **NEW FIELD** `WorkerGrievance.assigned_to` |
| Profile Settings | Interface language, notification prefs, communication prefs, accessibility, privacy/QR share, sessions/MPIN, download-my-data, sign-out-on-device | **NEW TABLE** `UserPreference` (user, interface_language, notif_prefs JSON, comm_prefs JSON, accessibility JSON, privacy_json, mpin_* ) |
| Identity Card | Worker card `Valid Till` (currently only Valid From) | **NEW FIELD** `WorkerIdentity.card_valid_till` (or on employment) |
| Automated Docs | Auto-generate Appointment Letter on binding approved, Service Certificate on worker inactive, and auto-update Gate Pass copies into worker documents | **NEW LOGIC + optional NEW FIELD** `WorkerDocument.auto_generated` + trigger templates |
| Notification centre | Worker notifications | **NEW TABLE** `Notification` (user, type, title, body, is_read, created_at) |

---

## B. CONTRACTOR (sheet "Contractor")

The current schema's `ContractorProfile` is very thin (name, code, contact, GST,
PAN, LIN, address, approval). The sheet expects a full legal/business profile:

| Area | Item | Action |
|---|---|---|
| Identity | Trade/Brand name, Entity/Constitution, Authorised person designation, Listed on stock exchange, Company status, ROC, Company/Registration number, Category/sub-category, Class, Age of company, Activity, NIC code, No. of members, AGM date, Balance-sheet date, Authorised/paid-up capital | **NEW FIELDS** on `ContractorProfile` (or **NEW TABLE** `ContractorRegistration`) |
| Directors | DIN, name, designation, appointment date, cessation, cessation date (multiple) | **NEW TABLE** `ContractorDirector` |
| Registration | Udyam/MSME no., Labour dept registration no., Contract Labour licence no., BOCW/other labour reg, Licence Valid From/To | **NEW FIELDS** `ContractorProfile.udyam_no`, `.labour_dept_reg_no`, `.clra_licence_no`, `.bocw_reg_no`, `.licence_valid_from`, `.licence_valid_to` |
| Address | Registered address + Operating/Service states | `ContractorProfile` address EXISTS; add **NEW FIELD** `.operating_states` (or JSON) |
| Contacts | Primary contact (name/email/mobile), Compliance contact (name/mobile/email) | **NEW TABLE** `ContractorContact` (type=primary/compliance, name, email, mobile) |
| Banking | Bank account name, bank name, account no., IFSC, annual turnover band | `ContractorProfile` has none → **NEW TABLE** `ContractorBank` |
| Assoc | Principal Employer (name+id), Site (name+id), Contract/Work-order no., start/end date | **NEW TABLE** `ContractorContract` (principal_employer, site, work_order_no, start_date, end_date) |
| Documents | PAN, GST, CLRA licence, PF cert, ESIC proof, Insurance/Workmen, Bank proof, Other (each w/ verification + expiry) | **NEW TABLE** `ContractorDocument` (doc_type, file, verification_status, issued_at, expiry_at) |
| Worker mgmt | Onboarding method, QR scanner/device ID, attendance method, payroll method | **NEW FIELDS** on `ContractorProfile` (or `ContractorWorkerConfig`) |
| Verification | Consent for data processing + date, Registration source/registered-by/date, risk rating, verified badge | **NEW FIELDS** `ContractorProfile.consent_date`, `.registration_source`, `.registered_by`, `.risk_rating`, `.is_verified_badge` |
| Compliance (contractor) | Financial year, month/period, state, site code, site/location, unique compliance no., created/updated dates, days-left, mandatory flag, Form number, frequency, criticality, document master + client mapping | **NEW TABLE** `ComplianceDocument` + **NEW FIELD** `financial_year`; a **document/master config** (see BSS Admin) |
| Compliance audit | Audit score, score %, act-wise item breakdown, nature, achieved score, auditor remarks, vendor remarks, report dates + unique no. | **NEW TABLE** `ComplianceReport` + `ComplianceReportItem` (act, form, nature, max/achieved score, status, remarks) |
| OCR | OCR accuracy score on uploaded compliance documents | **NEW FIELD** `ComplianceDocument.ocr_accuracy` |

---

## C. EMPLOYER (sheet "Employer" + "Employer Profile")

Current `EmployerProfile` is thin (name, code, contact, industry, GST, PAN, LIN,
address, approval). The sheet expects a full legal registry profile:

| Area | Item | Action |
|---|---|---|
| Identity/Registry | Employer category, trade/brand, ownership, CIN, listed, status, ROC, reg no., category/sub-category, class, incorporation date, AGM date, balance-sheet date, NIC code, members, authorised/paid-up capital, DIN, TAN, corporate website | **NEW FIELDS** on `EmployerProfile` (or **NEW TABLE** `EmployerRegistration`) |
| Directors | Multi-director details | **NEW TABLE** `EmployerDirector` |
| KYC/Verification | Verification status/date/source, PAN & GST verification status | **NEW FIELDS** `EmployerProfile.verification_status`, `.verification_date`, `.verification_source` |
| Statutory regs | EPFO est. ID, ESIC code, Shops & Est., Factory licence, CLRA, BOCW, PT, LWF, Apprenticeship (+expiry) | **NEW TABLE** `EmployerStatutoryRegistration` |
| Workforce | Workforce model + headcounts by category | **NEW FIELDS** `EmployerProfile.workforce_model` + category counts |
| Payroll/wage | Payroll frequency, wage period, attendance method, onboarding method, min-wage mapping, OT/bonus/gratuity flags, salary structure | **NEW FIELDS** `EmployerProfile.payroll_*` |
| Social security | PF/ESIC/gratuity/LWF coverage, medical/accident insurance | **NEW FIELDS** `EmployerProfile.*_coverage` |
| Safety/welfare | Occupational health, medical exam, first aid, PPE, safety training, site induction, emergency plan, fire cert, canteen/creche/transport/accommodation | **NEW FIELDS** `EmployerProfile.safety_*` / facility flags |
| Governance | Grievance mechanism, grievance officer, POSH ICC, standing orders, comm channel | **NEW FIELDS** `EmployerProfile.governance_*` |
| Preferences | Default approval SLA, compliance reminder window, preferred reporting period, escalation contact | **NEW TABLE** `EmployerPreference` |
| Declarations | Information-accurate, authorised-rep confirmation, terms, privacy, consent-for-verification + timestamps | **NEW TABLE** `EmployerConsent` (each type + accepted_at) |
| Sites | Site type/category, shift model, working days, gate timing, workforce model, compliance client, statutory applicability, reporting period, preferred calendar, project head / site HR / safety officer, attendance (enabled/method/device count/coverage/daily sync), billing contractor, facilities (accommodation camp/canteen/tool store/welfare room/medical room) | **NEW FIELDS** on `Site` (site_type, shift_model, working_days, gate_timing, facility flags, site contacts) — `site_code`, `latitude`, `longitude` already EXISTS |

---

## D. BSS ADMIN / MASTER DATA (sheet "BSS Admin")

The current schema has only a few masters (`LookupValue`, `WorkerCategoryMaster`,
`SkillMaster`, `WorkerDocumentMaster`, `RbacPermission`, `QrRoleAccess`). The
sheet's admin masters are almost entirely absent:

| Master | Action |
|---|---|
| Professional Tax master (+ slab, state mapping) | **NEW TABLE** `PtMaster` + `PtSlab` |
| LWF master (state, min/max, employer/employee share, month/type, designation) | **NEW TABLE** `LwfMaster` |
| License master (name, state, govt fee, security deposit, industry, min wages, payment freq, bonus %, wage zone) | **NEW TABLE** `LicenseMaster` |
| Minimum wage matrix (state + industry + grade + employment category + wage zone + basic/VDA/total + effective dates) | **NEW TABLE** `MinimumWage` |
| Document / Register master (name, type, frequency, state, form number, criticality, act mapping, mandatory) | **NEW TABLE** `DocumentMaster` / `RegisterDocumentMaster` (extend or replace `WorkerDocumentMaster`) |
| Compliance master (act, form, nature, remark, max score) | **NEW TABLE** `ComplianceMaster` |
| Employer↔Document, Employer↔Register, Employer↔Act mappings | **NEW TABLES** `EmployerDocumentMapping`, `EmployerRegisterMapping`, `EmployerActMapping` |
| Party master (type, name, address, contact, limits: store/contractor/site/user, month-expired, state/city) | **NEW TABLE** `PartyMaster` |
| Menu permission matrix | **NEW TABLE** `MenuPermission` (role, menu, allowed) |

---

## E. PAYROLL SETUP (sheet "Payroll setup")

Entirely absent from the current schema — a new payroll configuration cluster:

| Config | Suggested table | Notes |
|---|---|---|
| Company/EPF/ESI/PT/LWF/Bonus statutory config | `PayrollConfig` + per-statutory (`EpfConfig`, `EsiConfig`, `PtConfig`, `LwfConfig`, `BonusConfig`) | EPF/ESI rates, PF/ESI numbers, deduction cycles, `consider-for-PF/ESI` flags |
| PT slabs per work location | `PtSlab` (linked to PT config) | Multiple locations/states |
| Salary components: Earnings | `SalaryComponent` | name, type, calc, amount, consider-for-PF/ESI flags |
| Salary components: Deductions | `SalaryDeduction` | name, type, frequency (one-time/recurring) |
| Benefits (VPF, NPS) | `SalaryBenefit` | frequency |
| Reimbursements (fuel, driver, leave, etc.) | `SalaryReimbursement` | max amount/month |
| Full & Final settlement rules | `FfsConfig` | leave encashment, gratuity encashment, notice-penalty, excess-leave recovery, assume-days |
| Staff portal prefs | `StaffPortalConfig` | portal access, banner, contact, doc visibility |
| Upcoming payroll periods / runs | `PayrollPeriod` | granted periods + pay dates |

---

## F. CROSS-CUTTING / NEW ENTITIES (all sheets)

1. **Grievance workflow (Employer/Contractor side)** — `GrievanceResponse`,
   `WorkerGrievance.ticket_no`, `.category`, `.attachment`, `.assigned_to`,
   `.resolved_at`; makes the Worker grievance module usable by Employer and
   Contractor (currently worker-only).
2. **Approval queue / workflow** — `ApprovalQueue` (entity_type, entity_id,
   status, approver, requested/decided at) used by bindings, gate passes, jobs,
   compliance submissions, employer approvals.
3. **Compliance reporting cluster** — `ComplianceDocument`, `ComplianceReport`,
   `ComplianceReportItem`, `financial_year`, `unique_no`, OCR accuracy.
4. **Activity feed / audit log** — append-only `AuditLog` (actor, action,
   entity, before/after, timestamp) for RBAC + dispute resolution + DPDP.
5. **Notification centre** — `Notification` per user.
6. **User preferences & account security** — `UserPreference` (language,
   notifications, comms, accessibility, privacy/QR sharing, MPIN/sessions).
7. **Employer/Contractor registry** — directors, statutory registrations,
   contacts, contracts, banks, documents, declarations (all NEW tables above).
8. **Payroll config cluster** — all NEW tables in section E.

---

## G. ALREADY COVERED (no work needed)

The following from the Excel are already captured in the current schema:
- Worker identity / address / family / social security / welfare / banking /
  classification / employment / skills / other (all present, incl. gig, seasonal,
  self-employment fields).
- Worker QRs, site QR + geo (lat/long), document tokens, DigiLocker profile/docs.
- Deposit/payment, site bindings, consents/OTP, RBAC, QR role access, lookups,
  worker categories, skills, attendance + devices, wages + payments, gate passes
  (TGP/PGP), worker grievances.

---

## Priority recommendation

1. **High** — Grievance workflow (ticket, category, attachments, response table)
   because the Excel flags it as a major multi‑sheet gap and it touches DPDP
   (worker voice + resolution).
2. **High** — Compliance cluster (financial year, form number, report/audit tables)
   — statutory, recurring, audit-critical.
3. **Medium** — Employer & Contractor full registry (directors, registrations,
   contacts, contracts, banks, documents, declarations) + preferences.
4. **Medium** — Payroll config cluster.
5. **Medium** — BSS-admin masters (PT/LWF/licence/min-wage/document/compliance/
   party/menu).
6. **Low/UX** — Notifications, user preferences, activity/audit log, automated
   document generation, worker document expiry.
