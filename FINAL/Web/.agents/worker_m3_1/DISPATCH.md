## 2026-08-31T07:41:12Z
You are the UI/UX & Responsive Layout Worker (teamwork_preview_worker) implementing Milestone 3: UI/UX & Responsive iOS Tile Alignment.
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m3_1
The authoritative user request is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md
The project master specification is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md
Survey analysis and layout blueprints are at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/explorer_survey_ui_dashboards/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `.agents/explorer_survey_ui_dashboards/analysis.md`.
2. Fix KPI Card Alignment across all 6 dashboards:
   - Harmonize KPI tiles in `src/app/worker/page.tsx`, `src/app/employer/dashboard/page.tsx`, `src/app/contractor/dashboard/page.tsx`, `src/components/support/BssStaffDashboard.tsx`, `src/components/support/ItOperationsDashboard.tsx`, and `src/app/government/page.tsx` (and `src/components/government/Charts.tsx`).
   - Use standard `<article className="bss-kpi-card">` with top-row label/icon (`<span className="bss-kpi-icon">`) and bottom-pinned metric values (`<strong className="...">`) so all cards have identical heights and uniform vertical alignment.
   - Ensure grid containers use `.bss-kpi-grid` or appropriate responsive column rules (`grid-cols-2 md:grid-cols-4 lg:grid-cols-5` etc.) that prevent isolated or misaligned tiles.
3. Fix Tablet Navigation Drawer Breakpoint Conflict (768px-1180px):
   - Harmonize CSS rules in `src/app/globals.css` and navigation Shell components (`src/components/layout/WorkerShell.tsx`, `src/components/layout/EmployerShell.tsx`, `src/components/layout/ContractorShell.tsx`, `src/components/layout/SupportShell.tsx`, `src/components/layout/GovernmentShell.tsx`).
   - Ensure the mobile trigger and drawer behave consistently across mobile (<768px), tablet (768px-1180px), and desktop (>1180px).
4. Verify iOS safe-area handling (`viewportFit: "cover"`, `.pb-safe`, `.pb-safe-lg`, `.bss-shell-header`, `.bss-shell-bar`) in portrait and landscape orientations.
5. Run `npm run verify` (`npm run lint && npm run i18n:check && npx tsc --noEmit`) to verify zero regressions.
6. Document all modified files, layout changes, and verification commands in `handoff.md` in your working directory and notify the parent orchestrator via send_message.
