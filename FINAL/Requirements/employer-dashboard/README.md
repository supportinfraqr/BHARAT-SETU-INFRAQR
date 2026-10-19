# Employer Dashboard — frontend files

Only the files that **render the employer dashboard** (`/employer/dashboard`). Paths mirror `Web/src/`.

| File | What it shows on the dashboard |
|---|---|
| `src/app/employer/dashboard/page.tsx` | The page itself: header, **KPI cards**, **Action Required**, **Sites & Workforce** cards, **Workforce Analytics**, Contractor Oversight, Payroll, Approval Queue, Workforce Health, Recent Activity. |
| `src/components/employer/EmployerAnalytics.tsx` | The **Workforce Analytics** block (filters, tabs Live/Overview/Attendance/Workforce/Compliance, charts, export/print). |
| `src/components/analytics/WorkforceExplorer.tsx` | Worker/table explorer rendered inside analytics. |
| `src/components/charts/index.ts`, `src/components/government/Charts.tsx` | Chart primitives (`BarChart`, `HBar`, `Donut`, `Kpi`). |
| `src/components/licenses/LicensesPrompt.tsx` | Licenses adoption banner. |
| `src/components/attendance/AttendanceDetailDialog.tsx` | Worker attendance detail dialog. |
| `src/components/ui/CopyButton.tsx` | Copy-BSS-ID button. |

Data shape (for reference): `backend build_employer_portal()` in `Backend/api/v1_payloads/employer.py`, served as `GET /v1/employer/portal`.
