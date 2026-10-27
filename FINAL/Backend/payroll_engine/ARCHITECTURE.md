# Payroll Engine — architecture & porting contract

`payroll_engine` is a Django port of the legacy Node/Express + MongoDB payroll in
`FINAL/legacy_payroll` (which stays **unchanged** — it is the reference). The goal is
**100% functional parity**: every legacy payroll endpoint, calculation, PDF, import,
export and status transition exists here, wired to real BSS data.

## Layout

```
payroll_engine/
  bss_adapter.py      ONLY module that reads bss_core tables (workers, bindings, sites,
                      attendance, leave, holidays, org profile, notifications)
  context.py          @payroll_view decorator, PayrollContext, send_response/handle_error,
                      PayrollError, employee_queryset/get_employee
  models/             one module per legacy schema group (DocModel base, see below)
  services/           ports of legacy utils/ and utils/payroll/ (pure logic, PDFs, parsers)
  views/              ports of legacy controller/payroll/*.js  (each exposes ROUTES)
  urls.py             registers every views module's ROUTES under /v1/payroll-engine/
  management/commands run_auto_payroll (legacy scheduleAutoPayroll cron)
  tests/              Django tests + differential tests vs the legacy JS
```

## Legacy -> port name mapping (deterministic — every agent relies on it)

| Legacy | Port |
|---|---|
| `controller/payroll/fooBar.js` | `views/foo_bar.py` |
| `utils/payroll/fooBar.js`, `utils/fooBar.js` | `services/foo_bar.py` |
| exported function `doThing` | `do_thing` (same module mapping) |
| route `/payroll/<path>` | `/v1/payroll-engine/<path>` (identical `<path>`, `:param` -> `<str:param>`) |
| `models/payroll/fooBar.js` (schema `FooBar`) | `models/foo_bar.py`, class `FooBar` |
| `EmployeeModel` | `models.PayrollEmployee` (see employee.py) |
| `OrganizationModel.findById(org_uuid)` | `bss_adapter.org_profile(ctx.org)` |
| `AttendanceModel` | `bss_adapter.attendance_rows(emp, start, end)` |
| `LeaveRequestModel` (approved) | `bss_adapter.approved_leaves(emp, start, end)` / `leave_usage` |
| `LeaveTypeModel` / balances | `bss_adapter.leave_types()` + `leave_usage()` |
| `HolidayModel` | `bss_adapter.holidays(emp, start, end)` |
| `ShiftModel.findById(emp.shiftId)` | `bss_adapter.employee_shift(emp)` |
| `uploadFile(...)` (cloud) | `services.files.save_upload(org_id, file, folder)` |
| socket / in-app notification | `bss_adapter.notify(user, title, body)` |
| `req.headers.org_uuid` | `ctx.org` (`ctx.require_org()`) |
| `req.userId` | `ctx.actor` / `ctx.actor_id` |
| logged-in employee (`/employee/*` "my" routes) | `ctx.employee` (`ctx.require_employee()`) |
| `sendResponse(res, s, ok, msg, data)` | `return send_response(s, ok, msg, data)` |
| `handleError(res, err, code)` | `raise PayrollError(msg, code)` (or let it bubble -> 500) |
| `Math.round`, `toFixed`, `Number(x)\|\|0`, `parseFloat` | `services.jsmath` (`js_round`, `to_fixed`, `num`, `parse_float`) — **never** Python `round()` |
| `pdfkit` | `reportlab` |
| `xlsx` / `csv-parser` | `openpyxl` / `csv` |

## Model field naming rule

Every model subclasses `models.base.DocModel` (UUID pk `id`, `org` FK to the owning BSS
user, `created_at`, `updated_at`, `to_dict()`). For each top-level legacy schema field:

* scalar -> column `snake_case(field)`: String -> `CharField`/`TextField`, Number ->
  `FloatField`, Boolean -> `BooleanField`, Date -> `DateTimeField(null=True)`.
  Enum defaults are kept exactly (e.g. `pay_status` default `"pending"`).
* nested object / array -> `JSONField` named `snake_case(field)` holding the **legacy
  camelCase shape** (defaults equal to the Mongoose defaults).
* `employeeId` -> `employee = FK(PayrollEmployee)` (column `employee_id`).
* `organizationId` -> the base `org` FK (do not redeclare).
* refs to another payroll document (`payrollRunId`, `loanTypeId`, `loanId`, ...) ->
  FK named without the `Id` suffix (`payroll_run`, `loan_type`, `loan`).
* refs to users / system users / approvers (`createdBy`, `approvedBy`, `userId`) ->
  `CharField(max_length=64, blank=True)` storing the BSS user id as a string.
* `DOC_FIELDS` maps every legacy camelCase key -> attribute so `to_dict()` emits the
  exact legacy JSON (FKs emit the id string, e.g. `employeeId`).
* Mongo unique indexes become `UniqueConstraint`s; `db_table = "pe_<snake_name>"`.

Money is `FloatField` on purpose (legacy used JS numbers + `Math.round`).

## Views

```python
from ..context import PayrollError, get_employee, payroll_view, send_response

@payroll_view(["GET"])                 # access="hr" (default) | "employee" | "any"
def get_compliance(ctx):
    org = ctx.require_org()
    ...
    return send_response(200, True, "Compliance fetched successfully", data)

ROUTES = [("getCompliance", get_compliance, "get_compliance")]
```

* Response messages, status codes and `data` shapes must match the legacy controller
  exactly (the legacy docs + frontend contracts depend on them).
* Access: HR/admin endpoints use the default `access="hr"`. Employee self-service
  (`/employee/*`, `/tds/tax-report`, investment declaration/proof submit, claims submit,
  VPF start/stop) use `access="employee"` or `"any"`. Endpoints taking `:employeeId`
  that employees also call use `"any"` + `get_employee(ctx, id)` (scopes a worker to
  their own row automatically).
* File downloads return `context.file_response(bytes, filename, content_type)`.
* Mutations call `services.audit_log.log_payroll_action(...)` (port of the legacy
  `logPayrollAction`) so the Audit Log screens show real history.
* After adding a views module, append its name to `VIEW_MODULES` in `urls.py`.

## BSS data rules (implemented in bss_adapter)

* Payroll org = a contractor or employer user. Admins choose the org with header
  `X-Payroll-Org: <user id>` (or `?orgId=`).
* Employees = workers with an ACCEPTED binding to the org (contractor directly; employer
  via site). Previously-accepted, now cancelled/transferred bindings stay as
  `status="Inactive"` employees with `exitData` (for F&F, Form 16, history).
* Attendance `PRESENT`/`LATE` -> `Present`, `HALF_DAY` -> `HalfDay`, `ABSENT` -> `Absent`,
  `LEAVE` -> `Leave`. Approved leave with `LeaveType.is_paid` -> legacy `Paid`.
* Weekly offs come from `Site.weekly_off_days`; holidays from `SiteHoliday`
  (PUBLIC / WEEKLY_OFF; restricted holidays excluded like legacy "Optional").

## Testing

* Fast tests: SQLite + migrations disabled (see INTEGRATION.md). Each services module
  has **differential tests**: the same inputs are run through the legacy JS function
  (via Node, `FINAL/legacy_payroll` copy with node_modules) and the Python port, and the
  JSON outputs must be identical.
* Views have API tests through the DRF test client with a real worker/contractor/
  binding fixture (`tests/fixtures.py`).
