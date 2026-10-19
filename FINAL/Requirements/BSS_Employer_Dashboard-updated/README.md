# Employer Dashboard — frontend files

Only the files that **render the employer dashboard** (`/employer/dashboard`). Paths mirror `Web/src/`.

| File | What it shows on the dashboard |
|---|---|
| `src/app/employer/dashboard/page.tsx` | The page itself: header, **KPI cards**, **Action Required**, **Sites & Workforce** cards, **Workforce Analytics**, Contractor Oversight, Payroll, Approval Queue, Workforce Health, Recent Activity. |
| `src/components/employer/EmployerAnalytics.tsx` | The **Workforce Analytics** block (filters, tabs Live/Overview/Attendance/Workforce/Compliance, charts, export/print). |
| `src/components/analytics/WorkforceExplorer.tsx` | Worker/table explorer rendered inside analytics. |
| `src/components/charts/index.ts`, `src/components/government/Charts.tsx` | Chart primitives (`BarChart`, `HBar`, `Donut`, `Kpi`). |
| `src/components/charts/BssCharts.tsx` | BSS-branded `BarChart` / `HBar` / `Donut` (same props as `government/Charts`), re-exported by `charts/index.ts`. |
| `src/components/employer/DashboardUI.tsx` | Presentation-only helpers: section titles, search box, filter chips, sortable headers, pager, inline bars. No data fetching. |
| `src/components/licenses/LicensesPrompt.tsx` | Licenses adoption banner. |
| `src/components/attendance/AttendanceDetailDialog.tsx` | Worker attendance detail dialog. |
| `src/components/ui/CopyButton.tsx` | Copy-BSS-ID button. |

Data shape (for reference): `backend build_employer_portal()` in `Backend/api/v1_payloads/employer.py`, served as `GET /v1/employer/portal`.

UI refresh (Oct 2026): restyled with the BharatShramSetu deck palette (navy `#01183A`, deep `#022B5E`, blue `#1E3A8A`, saffron `#E45D24`, green `#14843C`, mist `#F2F6FC`, line `#DBE3EF`). API calls, query params, links and data fields are unchanged. Pre-refresh files are kept in `_original_src_backup/`.
