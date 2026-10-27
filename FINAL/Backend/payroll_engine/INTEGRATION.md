# Integrating the payroll engine into production BSS

This branch (`feature/payroll-engine`) adds a complete payroll system to BSS — a
Python/Django port of the legacy payroll in `FINAL/legacy_payroll` (Node/Express +
MongoDB, which stays untouched as the reference). It is built to be lifted into the
real BSS codebase with a small, well-defined footprint.

## What the change touches

| Area | Files | Notes |
|---|---|---|
| New Django app | `FINAL/Backend/payroll_engine/**` | Self-contained: models, services, views, tests, migrations |
| BSS settings | `FINAL/Backend/config/settings.py` | `"payroll_engine"` added to `INSTALLED_APPS` |
| BSS URLs | `FINAL/Backend/config/urls.py` | one line: `path("v1/payroll-engine/", include("payroll_engine.urls"))` |
| Web proxy | `FINAL/Web/src/app/api/payroll-engine/[...path]/route.ts` | same-origin proxy using the existing BSS session |
| Web app | `FINAL/Web/src/components/payroll-engine/**`, `FINAL/Web/src/lib/payroll-engine/**` | the payroll UI |
| Web pages | `app/{contractor,employer,admin}/payroll/page.tsx`, `app/worker/Payroll/page.tsx` | render the payroll app |
| Worker nav | `components/worker/WorkerShell.tsx`, `locales/*` | "My Payroll" menu entry + translations |

No existing BSS table is altered. All payroll tables are new and prefixed `pe_`.

## The one integration seam: `payroll_engine/bss_adapter.py`

It is the **only** payroll module that reads BSS tables. If production BSS differs
from this snapshot (renamed fields, different binding rules, a different holiday
source), change it there and nothing else:

| Function | Reads | Purpose |
|---|---|---|
| `org_profile(owner)` | `ContractorProfile` / `EmployerProfile` | org name, address, PAN/TAN, logo on payslips / Form 16 / bank files |
| `sync_employees(owner)` | `WorkerContractorBinding`, `WorkerIdentity`, `WorkerBanking`, `WorkerSocialSecurity`, `WorkerAddressMobility`, `WorkerEmployment`, `Site` | builds the payroll employee master from bound workers |
| `attendance_rows` | `Attendance` | present / half-day / absent days for LOP |
| `approved_leaves`, `leave_types`, `leave_usage` | `LeaveRequest`, `LeaveType` | paid leave, leave encashment |
| `holidays`, `employee_shift` | `SiteHoliday`, `Site.weekly_off_days` | working days, week-offs |
| `notify` | `Notification` | in-app notifications |

Payroll org = a contractor or employer user. Employees = workers with an ACCEPTED
binding (contractor directly, employer via the binding's site). Employer-staff
sessions act as their employer (existing BSS auth behaviour). BSS admins pick an org
in the UI (sent as `X-Payroll-Org`).

## Deploy steps

1. Merge the branch (or copy the files listed above).
2. Backend: `python manage.py migrate payroll_engine` (creates the `pe_*` tables).
3. Auto payroll (legacy `scheduleAutoPayroll` cron): add a cron entry, e.g. every
   15 minutes: `python manage.py run_auto_payroll` (runs each org's payroll on its
   configured pay day/time exactly once per period).
4. Web: no new dependencies; `npm run build` as usual.
5. Media: attachments are stored under `MEDIA_ROOT/payroll_engine/<org id>/` and
   served only through the authenticated `/v1/payroll-engine/files/...` endpoint.

## Running the tests

```bash
cd FINAL/Backend
python manage.py test payroll_engine
```

Calculation-parity tests also execute the original JavaScript (to prove identical
results). They run only when Node and an installed copy of the legacy payroll exist:

```bash
cp -r FINAL/legacy_payroll /tmp/legacy_run && (cd /tmp/legacy_run && npm ci --ignore-scripts)
LEGACY_PAYROLL_JS_DIR=/tmp/legacy_run NODE_BIN=$(which node) python manage.py test payroll_engine
```

Without them those tests are skipped; everything else still runs.
