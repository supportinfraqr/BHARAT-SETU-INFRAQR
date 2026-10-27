# Payroll engine — web app

UI for `FINAL/Backend/payroll_engine` (Django port of `FINAL/legacy_payroll`).

```
src/app/api/payroll-engine/[...path]/route.ts   same-origin proxy -> Django /v1/payroll-engine/*
src/lib/payroll-engine/api.ts                   pe.get / post / put / del / upload / download / open
src/lib/payroll-engine/types.ts                 shared types (PayrollEmployee, ModuleProps, ...)
src/components/payroll-engine/
  PayrollEngineApp.tsx   shell: org picker (BSS admin), module nav, toasts; mode="hr" | "employee"
  registry.tsx           module list (key, label, group, icon, component)
  ui.tsx                 shared UI kit — Section, Kpi, DataTable, Field, inputs, Modal, Confirm,
                         PeriodPicker, FinancialYearPicker, EmployeePicker, FileInput, Tabs,
                         Badge, useLoad, useAction, useEmployees, money/fmtDate helpers
  modules/*.tsx          HR modules (contractor / employer / admin)
  employee/*.tsx         worker self-service modules ("My Payroll")
```

Pages: `/contractor/payroll`, `/employer/payroll`, `/admin/payroll` (mode="hr"),
`/worker/Payroll` (mode="employee").

## API contract

Every endpoint is the legacy payroll route with the `/payroll/` prefix dropped, e.g.
legacy `GET /payroll/getCompliance` -> `pe.get('getCompliance')`,
legacy `PUT /payroll/fullAndFinal/:id/gratuity` -> `pe.put(\`fullAndFinal/${id}/gratuity\`, body)`.
Request bodies, query params and response `data` shapes are exactly the legacy ones, so
the legacy controller source (`FINAL/legacy_payroll/controller/payroll/*.js`) and docs
(`FINAL/legacy_payroll/*.md`, `postman/`) are the API spec. `pe.*` unwraps
`{ status, success, message, data }` and throws `PayrollApiError(message)` on failure.

BSS-specific endpoints (no legacy equivalent): `context`, `organizations`,
`employees` (list, `?status=&search=`), `employees/:id`, `employees/sync`,
`employees/:id/profile` (PUT bank/statutory/PAN corrections), `employees/:id/exit`
(PUT exitStatus/lastWorkingDay/reason — the input to Full & Final), `files/<key>`
(authenticated attachment download; use `pe.fileUrl(url)`).

Employee ids are payroll employee UUIDs (`PayrollEmployee._id`), not BSS user ids.

## Module conventions

* Default export `function X({ ctx, notify, navigate, params }: ModuleProps)`.
* Load with `useLoad(() => pe.get(...), [deps])`, render via `<Async state={...}>`.
* Mutate with `const { busy, run } = useAction(notify); await run(() => pe.post(...), 'Saved')`
  then `reload()`.
* Every legacy endpoint of the module's domain must be reachable from the UI (that is the
  parity requirement) — list views, detail views, create/edit forms, status actions,
  downloads.
* No hard-coded demo data. Empty states must explain what to do next.
* Keep each module in its own file; put sub-components in the same file or in
  `modules/<module>/` when large.
