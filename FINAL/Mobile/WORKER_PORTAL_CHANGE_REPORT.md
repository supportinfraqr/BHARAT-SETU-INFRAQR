# Worker Portal Client Feedback — Change & Regression Report

Date: 29 August 2026

## Added

- Rozgar Setu availability control, Explore Jobs view, current requests/status view, and no-match state backed by the existing Rozgar workflow.
- Wage History & Earnings route with year/month/employer filters, summary placeholders, receipt-ready data contract, and an explicit payroll-source state.
- Leave application and Leave History with configured type, date range, reason, attachment, submission, and Pending/Approved/Rejected/Cancelled contract.
- Attendance History route with calendar/table controls, month/year filters, summary slots, and authoritative attendance-source state.
- Retirement Fund & Benefits route for UAN, PF contributions/history, official balance, contribution date, and authoritative gratuity information.
- Holiday Calendar with month/year controls and an applicable upcoming-holidays list.
- Announcements, News & Events route with publishing entity, dates, priority, category, and dashboard surfacing.
- Global Listen & Learn module on every portal route with page-specific multi-step guidance, installed-voice discovery, language matching, Play/Pause/Resume/Replay, Previous/Next, optional auto-advance, saved progress, speed and voice preferences, and accessible error states.
- Progressive profile completion indicator and rate-limited prompt with Add now/Later actions.
- Unified Notifications page linked from the existing notification bell.
- Shared API-ready record contracts and explicit source metadata for payroll, attendance, PF, holidays, and announcements.

## Modified

- Worker navigation is grouped into Dashboard, Rozgar Setu, Work, My Records, and QR / Identity. All prior destinations remain linked; mobile navigation exposes all child items.
- Worker Dashboard now uses restrained BSS blue/orange/green tints and compact links for Attendance, Leave/Wage access, Benefits, Holidays, Announcements, and Opportunities.
- Added clearly labelled BSS demo-database fixtures across attendance, wage, leave, PF and gratuity screens for stakeholder review. These remain illustrative until authoritative services respond.
- Identity Card PDF now opens in a secure new browser tab, preserving the current portal page and providing the browser PDF viewer's print/download controls. The card design and PDF generation remain unchanged.
- Worker email is trimmed and validated for a plausible address structure with an inline, plain-language error.
- Migration type is system-derived from home/current state and district and displayed read-only; incomplete inputs return the specified completion message.
- Mobility geography uses linked reference selections for state, district/city and PIN. A production-wide postal dataset/API remains a dependency.
- Existing Rozgar accept/reject and binding warning behavior remains in the same module.
- New workflow events are routed to the existing notification surface rather than a second framework.

## Unchanged & Regression Tested

- Dashboard route and existing profile/employment summary.
- Worker Profile tabs and workbook-defined sections; controlled taxonomies and read-only fields remain present.
- Skills, course catalog/detail, Compliance, Documents, Grievances, Rozgar binding requests, QR scanner, Identity Card, Settings, and authentication routes remain present.
- Contractor, employer, and binding-request access remains available through grouped QR / Identity navigation and existing profile/Rozgar destinations.
- Worker Context persistence, BSS ID validation, permissions utilities, API routes, existing language selector/translations, responsive header/mobile navigation, accessibility settings, and BSS branding remain in place.
- Navigation audit confirms functionality was moved/grouped, not deleted.
- `npx tsc --noEmit`: passed.
- Targeted ESLint over all changed/new files: passed with zero errors (legacy image/unused-import warnings remain).
- Full repository ESLint remains blocked by pre-existing errors in `src/components/ui/input.tsx`, `src/components/ui/tabs.tsx`, generated `src/i18n/*.js`, `src/lib/permissions.ts`, and the existing LanguageContext effect.
- Production build source compilation could not be certified in this WorkDrive location: Turbopack persistence creates malformed cache entries (`*.del` becomes a directory), while the Webpack fallback cannot parse TypeScript `--showConfig`. TypeScript and targeted lint validation are clean.

## Backend / Specification Dependencies

- Payroll API: payment period/date, parties/site, basis, gross/deductions/net, status, receipt and transaction reference. No payroll values are fabricated.
- Attendance API/device source: daily presence, shift/site, check-in/out, late/half-day/leave/holiday/weekly-off status and working-day rules.
- Leave API and business configuration: authoritative leave types, approvers/comments, file storage, status transitions, cancellation rules and notification events. No entitlement/accrual is assumed.
- EPFO/employer benefits integration: official PF contribution history/balance and last contribution date.
- Approved gratuity business service: eligibility and official/indicative calculation labeling.
- Authoritative India postal/reference API or full managed dataset for nationwide State → District/City → PIN validation and reverse lookup. The included reference subset demonstrates the contract only.
- Holiday applicability API keyed to employer, site and state.
- Announcement attachment/link service and audience targeting.
- Rozgar discovery/matching API and persistence for the worker availability flag.
- Backend notification event stream for leave, payroll, attendance discrepancies, PF updates, holidays and announcements.
- Professionally reviewed translations for the complete tutorial catalogue beyond the implemented English and priority Hindi worker flows. The engine already follows the selected portal locale and selects matching installed voices; device voice availability varies by operating system/browser.

---

# Worker Benefits — Bonus & Leave Encashment (audit)

Date: 30 August 2026

## What was added
- **Worker portal** (`/worker/Benefits`): two new cards — **Bonus** and **Leave Encashment** — each
  with a summary panel and a history table, sitting alongside the existing PF and Gratuity cards.
- **Provenance banner** clarifies the sourcing rule: **PF (UAN) and Gratuity are autofetched from
  government/business sources (EPFO)**, while **Bonus and Leave Encashment are filled and uploaded by the contractor**.
- **Contractor portal** (`/contractor/benefits`): a dedicated **Worker Benefits** workspace with
  **Bonus / Leave Encashment** tabs and **single + bulk upload** options:
  - **Single**: pick a bound worker, period, amount (and days for leave encashment), reason, paid-on
    date, and optional uploaded evidence (validated PDF/JPEG/PNG via the shared uploads service).
  - **Bulk**: editable multi-row grid (Worker · Period · Amount · Days · Reason · Paid on) with
    add/remove rows and **CSV import** (header: BSS ID, Worker Name, Period, Amount, Days, Reason, Paid On).
  - Records are validated server-side (valid worker BSS ID, amount bounds, day count) and any invalid
    row is rejected before persistence.
- New JSON resource `benefits` wired through the existing RBAC-gated `/api/portal/[resource]` mutation
  path (Contractor scope) with demo-mode handling for both single and array (`bulk`) payloads.

## Data / provenance model
- `WorkerPortalData` gains `bonus` and `leaveEncashment` (`DataState<BonusRecord>` / `DataState<LeaveEncashmentRecord>`).
- `ContractorPortalData` gains `workerBenefits` (`{ bonus; leaveEncashment }` of `ContractorBenefitRecord[]`).
- Sources are labelled distinctly: autofetch (EPFO) vs contractor-uploaded.

## Verification
- `npx tsc --noEmit` (src) — clean.
- ESLint over all changed/new files — 0 errors, 0 warnings.
- Runtime (dev server :3000):
  - `POST /api/portal/benefits` single → 201, returns record with `source:'contractor'`, `status:'Pending verification'`.
  - `POST /api/portal/benefits` bulk → 201, returns array of records.
  - Invalid BSS ID → 422 `Enter a valid worker BSS ID.`
  - `/contractor/benefits` → 200 (heading, single + bulk controls, register table).
  - `/worker/Benefits` → 200 (Bonus + Leave Encashment cards, history tables, provenance banner).
  - Regression: `/contractor/dashboard`, `/contractor/workers`, `/employer/dashboard` → 200; no runtime errors in the dev log.

## Notes / dependencies
- Bonus and Leave Encashment values remain illustrative demo fixtures until an authoritative benefits
  service responds; the provenance label is shown in the UI.
- Live file evidence currently resolves to the demo upload responder; real storage needs the file service.

---

# Employer-wise Contractor Scope · Invoicing Removal · Portal Label — audit

Date: 30 August 2026

## 1. Employer-wise contractor views & documents
A contractor can be bound to multiple principal employers, so the contractor portal now has an
**Employer scope**:
- Added `employerScope` (`'all'` or an employer name) + `setEmployerScope` + a `scoped(rows, employerOf)`
  helper to `ContractorContext`.
- Added an **Employer selector** in the ContractorShell header (desktop) and in the mobile menu,
  listing All Employers + each bound employer.
- Data model now carries an `employer` on each contractor record: `workers`→`employer`, `sites`→`employer`,
  `compliances`→`employer`, `gatePasses`→`employer`, `applications`→`employer`,
  `complianceReports`→`employer`, `submissions.documents`→`employer`, `workerBenefits`→`employer`.
- Every data-page filters by the selected scope and shows a "Showing … for {employer}" banner:
  `dashboard` (KPIs/lists recomputed per scope), `workers`, `gate-pass`, `compliance`,
  `compliance-report`, `submissions`, `benefits`, `qr/employers`, `qr/workers`.
- New record creation (gate pass, compliance, benefits, submission) stamps the correct `employer`
  (from the selected worker / site / scope). New submissions upload route passes `employer` through.

## 2. Invoicing removed
- Removed `submissions.invoices` from `ContractorPortalData` and the demo fixtures, the "invoices"
  tab / "Register invoice" modal / invoice columns from the contractor Compliance Submission page
  (now documents-only), the `invoices` mutation resource from the Contractor RBAC set, and the
  `invoices` validation rule. Replaced the dashboard mock activity "Invoice #INV-293 submitted"
  with a non-invoice item ("PF challan verified").
- Verified: no `invoice` references remain in `src/`.

## 3. Portal label moved from the header to the dashboard
- Removed the "Worker Portal" / "Contractor Portal" / "Employer Portal" text that sat next to the BSS
  logo in WorkerShell, ContractorShell and EmployerShell.
- Added a concise **portal label pill** next to the "Welcome …" heading on each dashboard:
  `/worker` (Worker Portal), `/contractor/dashboard` (Contractor Portal), `/employer/dashboard`
  (Employer Portal).

## Verification
- `npx tsc --noEmit` (src): clean.
- ESLint over changed contractor/context/shell/dashboard files: 0 errors (only pre-existing idcard/image warnings).
- Runtime (:3000, dev server): all contractor routes (`dashboard, submissions, gate-pass, compliance,
  compliance-report, benefits, qr/employers, qr/workers, workers`) → 200; employer selector renders
  "All Employers" + bound employers; no invoices on dashboard/submissions; worker/contractor/employer
  dashboards each show their portal pill; worker + employer portal regression → 200.

---

# Contractor Data Entry — Where to add workers, bulk data, compliance & salary (audit)

Date: 30 August 2026

## Where the contractor adds each type of record

| Record type | Location | Single | Bulk (grid / CSV) |
|---|---|---|---|
| Bind a worker to a site/employer | `/contractor/workers` → **Add worker** | ✅ | ✅ via **Bind worker** + **Bulk bind** |
| Worker compliance | `/contractor/compliance` → **Add compliance** | ✅ | ✅ via **Add compliance** + **Bulk add** |
| Bonus / Leave Encashment | `/contractor/benefits` → **Bonus / Leave Encashment** | ✅ | ✅ |
| **Salary / Wages** (NEW) | `/contractor/salaries` → **Salary & Wages** (new nav item) | ✅ | ✅ |
| Compliance evidence documents | `/contractor/submissions` → **Submit document** | ✅ | ✅ (multi-row CSV on each upload) |

## What was added
1. **Bulk worker binding** (`/contractor/workers`): "Bulk bind" — add rows for BSS ID, Name, Mobile,
   Designation, Site, Employer (+ CSV import), submitted to `POST /api/portal/workers` with a `bulk`
   array. Stats (total workers) update by the number bound.
2. **Bulk worker compliance** (`/contractor/compliance`): "Bulk add" — Item, Category, Reference,
   Site, Worker, Issue, Expiry (+ CSV import) → `POST /api/portal/compliances` with `bulk`.
3. **NEW Salary & Wages workspace** (`/contractor/salaries`, new `nav.salaries` "Salary & Wages"):
   - Single: worker, period, gross, deductions (net auto = gross − deductions), paid-on date, optional wage slip.
   - Bulk: editable rows (Worker, Period, Gross, Deductions, Paid on) + CSV import.
   - Employer-scoped (uses the top-bar employer selector), validated server-side, tagged `source:'contractor'`.
   - Backed by a new `salaries` Contractor resource; type `ContractorSalaryRecord` + demo fixtures.

## Behaviour / data
- Salary and compliance records are stamped with the correct `employer` (from the worker/site or the
  active employer scope), so a contractor bound to multiple employers keeps data separated per employer.
- Every new entry is `Pending verification` in demo mode until an authoritative service verifies it.

## Verification
- `npx tsc --noEmit` (src) — clean. ESLint over new/changed files — 0 errors.
- Runtime (:3000): `/contractor/salaries`, `/contractor/workers`, `/contractor/compliance` → 200;
  `POST /api/portal/salaries` (single + bulk) → 201; `POST /api/portal/workers` bulk → 201;
  `POST /api/portal/compliances` bulk → 201; nav shows "Salary & Wages"; worker/contractor/employer
  dashboards regression → 200; no new runtime errors.
