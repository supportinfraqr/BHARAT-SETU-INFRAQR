# UI & Dashboards Architecture and Responsive Layout Analysis

**Explorer**: `teamwork_preview_explorer` (UI & Dashboards)  
**Date**: 2026-08-31  
**Scope**: Responsive styling, Tailwind CSS setup, iOS safe-area handling, `bss-kpi-grid` tile alignment across 6 roles, IT Helpdesk restricted terminal & live logs, and BSS Staff case management database integration.

---

## 1. Executive Summary

The Bharat Shram Setu (BSS) portal features a unified multi-role architecture serving 6 distinct user archetypes (`Worker`, `Employer`, `Contractor`, `BSS Staff`, `IT Help Desk`, `Government`).

This investigation analyzed:
1. **Tailwind CSS v4 & Responsive Layout Configuration**: Integration with `@tailwindcss/postcss`, CSS theme variables, iOS safe areas, and viewport adaptions.
2. **`bss-kpi-grid` and KPI Tile Consistency**: Line-by-line inspection of all 6 role dashboards revealing divergence in card CSS classes, missing vertical flex properties, clamp typography mismatches, and tablet breakpoint gaps.
3. **IT Helpdesk Restricted Terminal & Live Application Logs**: Analysis of command interpretation in `src/server/operations.ts` and `ItOperationsDashboard.tsx`, mapping out allowlisted read/write DB operations and real-time log polling.
4. **BSS Staff Workbench & Case Management**: Transition from memory-backed mock cases to a persistent SQLite/Prisma database linked to worker grievances and contractor/employer bindings.

---

## 2. UI/UX Architecture & Responsive Styling

### 2.1 Tailwind CSS Setup & Theme Design Tokens
- **Framework Version**: Tailwind CSS v4 (`"tailwindcss": "^4"`, `"@tailwindcss/postcss": "^4"`) configured via `postcss.config.mjs` (`plugins: { "@tailwindcss/postcss": {} }`).
- **Configuration Method**: `@import "tailwindcss";` in `src/app/globals.css` with an embedded `@theme` block:
  - Brand Navy: `--color-bss-navy: #073B67`, `--color-bss-deep-navy: #062D4F`, `--color-bss-interactive-blue: #155E95`
  - Accent & Semantic: `--color-bss-orange: #F47A32`, `--color-bss-green: #2F9E67`, `--color-bss-error: #D64545`
  - Surface & Background: `--color-bss-bg: #F6F8FB`, `--color-bss-card: #FFFFFF`, `--color-bss-surface: #F1F5F8`
  - Typography: `--font-sans: "Noto Sans", "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif`

### 2.2 iOS Safe Area & Viewport Adaptations
- **Root Viewport**: `src/app/layout.tsx` lines 12-17 sets:
  ```ts
  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#073B67",
  };
  ```
  `viewportFit: "cover"` enables full-bleed rendering behind the iOS notch, dynamic island, and home indicator.
- **Safe Area Classes in `src/app/globals.css`**:
  - Header: `padding-top: env(safe-area-inset-top);` (lines 120-122)
  - Navigation bar: `padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));` (lines 124-128)
  - Main container: `padding-bottom: max(2.5rem, env(safe-area-inset-bottom));` (lines 159-163)
  - Utilities: `.pb-safe` and `.pb-safe-lg` (lines 108-113)
  - Auto-zoom prevention on iOS Safari: `@supports (-webkit-touch-callout: none) { @media (max-width: 767px) { input:not([type="checkbox"]):not([type="radio"]), select, textarea { font-size: 16px !important; } } }` (lines 446-454)
  - Landscape orientation height constraint: `@media (orientation: landscape) and (max-height: 600px)` (lines 431-444).

### 2.3 Responsive Breakpoint Conflict (iPad & Tablet Viewports)
A critical conflict exists between custom CSS media queries and JSX Tailwind utility classes in all role shells:
- **`globals.css` lines 165-183**:
  ```css
  @media (max-width: 1180px) {
    .bss-desktop-nav { display: none !important; }
    .bss-mobile-trigger { display: inline-flex !important; }
  }
  @media (min-width: 1181px) {
    .bss-desktop-nav { display: flex !important; }
    .bss-mobile-menu { display: none !important; }
  }
  ```
- **Shell Components** (`WorkerShell.tsx` line 35, `EmployerShell.tsx` line 65, `ContractorShell.tsx` line 28, `SupportShell.tsx` line 23, `GovernmentShell.tsx` line 25):
  - `.bss-desktop-nav` is given `hidden md:flex`.
  - `.bss-mobile-trigger` is given `md:hidden`.
  - `.bss-mobile-menu` is given `md:hidden`.
- **The Issue**: On screens between `768px` (`md:`) and `1180px` (e.g. iPad 10.2", iPad Air, iPad Pro 11" portrait & landscape):
  1. Tailwind's `md:hidden` sets `display: none` on `.bss-mobile-menu`, preventing the mobile menu dropdown from displaying even when `.bss-mobile-trigger` is clicked (because `.bss-mobile-trigger` has `display: inline-flex !important` from CSS).
  2. Tailwind's `md:flex` tries to display `.bss-desktop-nav`, but CSS overrides it with `display: none !important`.
- **Recommended Resolution**: Remove the hardcoded `md:hidden` / `md:flex` classes from navigation containers in all shells or align CSS breakpoint with standard Tailwind (`max-width: 1023px` / `min-width: 1024px`), ensuring consistent mobile drawer and desktop nav behavior across tablets.

---

## 3. Deep-Dive Audit: `bss-kpi-grid` and KPI Tiles Across All 6 Roles

### 3.1 CSS Specification (`src/app/globals.css`)
```css
/* Dashboard primitives keep tiles aligned across every role. */
.bss-kpi-grid,
.bss-equal-grid {
  grid-auto-rows: 1fr;
  align-items: stretch;
}

.bss-kpi-grid > *,
.bss-equal-grid > * {
  height: 100%;
  min-width: 0;
}

.bss-kpi-card {
  min-height: 7.5rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  display: flex;
  flex-direction: column;
}

.bss-kpi-card strong {
  display: block;
  margin-top: auto;
  padding-top: 0.625rem;
  color: #0f172a;
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  line-height: 1.1;
  font-weight: 700;
}

.bss-kpi-card p {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.35;
}

.bss-kpi-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.625rem;
  display: grid;
  place-items: center;
}

@media (max-width: 639px) {
  .bss-kpi-card { min-height: 6.75rem; }
}

@media (max-width: 374px) {
  .bss-kpi-grid { grid-template-columns: minmax(0, 1fr) !important; }
}
```

### 3.2 Role-by-Role Comparison & Discrepancies

| Role | File & Line | Grid Classes | Card Wrapper Classes | Discrepancies / Flaws Found |
|---|---|---|---|---|
| **Worker** | `src/app/worker/page.tsx:43,73` | `bss-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3` | `<div className="bg-white border border-gray-200 rounded-xl p-4">` | ❌ Does NOT use `.bss-kpi-card` or `.bss-kpi-icon`.<br>❌ Lacks `display: flex; flex-direction: column` and `margin-top: auto` on value strong.<br>❌ Uses hardcoded `text-xl` instead of responsive clamp typography. |
| **Employer** | `src/app/employer/dashboard/page.tsx:51,52` | `bss-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3` | `<article className="h-full bg-white border border-gray-200 rounded-xl p-4">` | ❌ Does NOT use `.bss-kpi-card` or `.bss-kpi-icon`.<br>❌ Lacks `flex flex-col` for bottom-pinned alignment.<br>❌ Uses hardcoded `text-2xl` instead of clamp. Has no `<p>` description tag. |
| **Contractor** | `src/app/contractor/dashboard/page.tsx:74,76` | `bss-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3` | `<div className="h-full bg-white border border-gray-200 rounded-xl p-4">` | ❌ Does NOT use `.bss-kpi-card`.<br>❌ Inconsistent with Contractor Submissions page (`src/app/contractor/submissions/page.tsx:107` which correctly uses `.bss-kpi-card`).<br>❌ Lacks `flex flex-col` alignment. |
| **BSS Staff** | `src/components/support/BssStaffDashboard.tsx:48,49` | `bss-kpi-grid grid grid-cols-2 lg:grid-cols-5 gap-3` | `<article className="bss-kpi-card">` | ✅ Correctly uses `.bss-kpi-card` and `.bss-kpi-icon`.<br>⚠️ Tablet breakpoint gap: `grid-cols-2 lg:grid-cols-5` creates a 2-2-1 layout on tablet (768px-1023px) where the 5th tile is orphaned on its own line. Recommend `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. |
| **IT Help Desk** | `src/components/support/ItOperationsDashboard.tsx:71,72` | `bss-kpi-grid grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3` | `<article className="bss-kpi-card">` | ✅ Correctly uses `.bss-kpi-card` and `.bss-kpi-icon`.<br>✅ Clean 2-column mobile, 3-column tablet/desktop, 6-column 2xl layout. |
| **Government** | `src/app/government/page.tsx:102` & `Charts.tsx:30` | `bss-kpi-grid grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3` | `<div className="bss-kpi-card">` | ✅ Uses `.bss-kpi-card`.<br>⚠️ Uses flat color bar instead of icon (intentional design choice for 8-card density).<br>✅ Clean 2-column mobile, 4-column tablet/desktop, 8-column 2xl layout. |

### 3.3 Concrete KPI Tile Unification Pattern
To eliminate height mismatches, content overflow, and misalignments:
1. Every KPI tile should render:
   ```tsx
   <article className="bss-kpi-card">
     <div className="flex items-center justify-between gap-2">
       <span className="text-xs font-medium text-gray-500">{label}</span>
       <span className={`bss-kpi-icon ${tone}`}><Icon size={16}/></span>
     </div>
     <strong>{value}</strong>
     {note && <p>{note}</p>}
   </article>
   ```
2. By combining top row (label + icon) with `strong` having `margin-top: auto` (enforced by `.bss-kpi-card`), all metrics pin to the exact same baseline regardless of viewport height or text wrapping.

---

## 4. IT Helpdesk Restricted Command Terminal & Live Logs

### 4.1 Current Terminal Component Architecture (`ItOperationsDashboard.tsx`)
- **State & Input Handling** (lines 27-32, 46-53):
  - State: `command` (string), `terminal` (string array of last 80 lines).
  - Quick shortcuts: `['health', 'services', 'queues', 'sessions', 'bindings']`.
  - Execution: Submits `{ action:'command', command:clean }` to `/api/operations` via `useOperations.run()`.
  - Response output appended into scrollable terminal window (`bss-scroll-region`).
- **Terminal UI**:
  - Dark terminal theme: `#07111f` with emerald prompt `ops> ` and command prompt `$`.
  - Audited and allowlist-restricted badge.

### 4.2 Current Backend Command Processor (`src/server/operations.ts`)
- **`commandOutput(store, session, rawCommand)`** (lines 117-162):
  - Enforces `session.role === 'IT Help Desk'`.
  - Validates command length `<= 120`.
  - Dispatches based on verb:
    1. `help`: Lists read-only and controlled actions.
    2. `health`: Calculates operational service counts and active tickets.
    3. `services`: Lists services, status, latency.
    4. `queues`: Static mock strings (`binding-retry 18 queued`).
    5. `sessions`: Static mock strings (`active 1204`).
    6. `bindings`: Static mock strings (`pending-consent 9`).
    7. `probe <service-id>`: Updates service latency and timestamp.
    8. `retry-binding <binding-id>`: Regex validation on `BC-\d{3,12}`, returns mock queue acknowledgment.
  - Automatically logs every execution: `addLog(store, { level:'audit', source:'ops-terminal', message:`${session.subject} ran ${verb}` })`.

### 4.3 Expansion for Functional Database Actions (Requirement R4)
To make the terminal production-ready with real database execution:
1. **`db-stats` / `db:status`** (Read DB):
   - Queries SQLite via Prisma for live counts:
     - Worker profiles (`prisma.worker.count()`)
     - Employers (`prisma.employer.count()`)
     - Contractors (`prisma.contractor.count()`)
     - Active bindings (`prisma.binding.count()`)
     - Open cases & tickets (`prisma.supportCase.count({ where: { status: { not: 'Resolved' } } })`)
     - Total uploaded files (`prisma.uploadedDocument.count()`)
2. **`worker-lookup <bssId>`** (Read DB):
   - Validates BSS ID format (`BSS\d{12}`).
   - Fetches worker record, verification status, active employer/contractor/site binding from database.
3. **`tail-logs [limit]`** (Read DB):
   - Fetches the last `N` (default 10, max 50) entries from `prisma.operationsLog.findMany({ orderBy: { timestamp: 'desc' }, take: N })`.
4. **`ticket:resolve <ticketId>`** / **`ticket:claim <ticketId>`** (Write DB):
   - Directly executes database mutation to transition an IT incident ticket and records the audit log.
5. **`db:vacuum` / `db:check`** (DB Maintenance):
   - Runs `PRAGMA integrity_check` on SQLite database and reports SQLite database file size and status.

### 4.4 Live Application Logs Stream
- **Current Polling**: `useOperations(initialSnapshot, 5_000)` polls `/api/operations` every 5 seconds when tab is active (`document.visibilityState === 'visible'`).
- **Database Model**:
  ```prisma
  model OperationsLog {
    id            String   @id @default(uuid())
    timestamp     DateTime @default(now())
    level         String   // "info" | "warning" | "error" | "audit"
    source        String   // "identity" | "portal" | "uploads" | "staff-workbench" | "ops-terminal"
    message       String
    correlationId String
  }
  ```
- All portal API routes (`/api/portal/uploads`, `/api/auth/session`, `/api/operations`, `/api/worker/profile`) can insert structured entries into `OperationsLog`, providing a genuine, live log stream for both IT Operations and BSS Staff.

---

## 5. BSS Staff Dashboard: Case & Support Ticket Management

### 5.1 Current Implementation (`BssStaffDashboard.tsx`)
- **State & Hooks** (lines 8-38):
  - `useOperations(initialSnapshot, 15_000)` (15-second polling).
  - Search filter: `query` matches ID, subject, party, or owner.
  - Status filter: `Active`, `All`, `Open`, `In progress`, `Waiting for evidence`, `Escalated`, `Resolved`.
  - Type filter: `All`, `Binding`, `Document`, `Dispute`, `Worker record`.
  - Selected Case Inspector (`#case-detail`): displays metadata, party, owner, assignee, timestamps, and action buttons.
- **Transitions Supported**:
  - `claim`: assigns current staff member, sets status to `In progress`.
  - `wait`: sets status to `Waiting for evidence`.
  - `resolve`: sets status to `Resolved`.
  - `escalate`: sets status to `Escalated`.

### 5.2 Transition to Live Database Operations (Requirement R4)
- **Problem**: Currently `src/server/operations.ts` uses `initialStore().cases` in memory with 4 static cases (`BC-1039`, `DOC-2048`, `DSP-201`, `WRK-881`).
- **Database Integration Design**:
  1. **Prisma Model**:
     ```prisma
     model SupportCase {
       id          String   @id
       type        String   // "Binding" | "Document" | "Dispute" | "Worker record"
       subject     String
       party       String
       owner       String
       priority    String   // "Urgent" | "High" | "Normal" | "Low"
       status      String   // "Open" | "In progress" | "Waiting for evidence" | "Escalated" | "Resolved"
       assignee    String?
       createdAt   DateTime @default(now())
       updatedAt   DateTime @updatedAt
       summary     String
     }
     ```
  2. **Worker Grievance Linking**:
     - When a worker submits a grievance at `/worker/grievances` (`src/app/worker/grievances/page.tsx`), the mutation writes to `Grievance` and automatically spawns a `SupportCase` of type `Dispute` or `Worker record` with `party: worker.name + ' · ' + worker.bssId`.
  3. **Contractor / Employer Submissions Linking**:
     - When a contractor uploads compliance documents at `/contractor/submissions` (`src/app/contractor/submissions/page.tsx`), a `SupportCase` of type `Document` is generated for staff review.
  4. **Server Operations Mutation**:
     - `performOperationsAction` handles `action.action === 'case'` with:
       ```ts
       await prisma.supportCase.update({
         where: { id: action.id },
         data: {
           status: newStatus,
           assignee: action.transition === 'claim' ? session.subject : undefined,
         }
       });
       await prisma.operationsLog.create({
         data: {
           level: 'audit',
           source: 'staff-workbench',
           message: `${session.subject} moved ${action.id} to ${newStatus}`,
           correlationId: `corr-${crypto.randomUUID().slice(0, 8)}`,
         }
       });
       ```

---

## 6. Layout & Responsiveness Recommendations Table

| Component / File | Viewport / Breakpoint | Issue | Recommended Fix |
|---|---|---|---|
| `src/app/globals.css:165-183` vs All Shells | Tablet (`768px` - `1180px`) | CSS `.bss-desktop-nav` is hidden at `<=1180px` while JSX has `hidden md:flex`; mobile menu has `md:hidden`. | Harmonize breakpoint to `1024px` (`lg`) or remove `md:hidden` / `md:flex` from JSX and let CSS `.bss-desktop-nav` / `.bss-mobile-trigger` control display consistently. |
| `src/app/worker/page.tsx:43,73` | Mobile & Desktop | `Status` function uses plain `div` without `bss-kpi-card` or flex column. | Refactor to `.bss-kpi-card` with flex column layout and clamp typography. |
| `src/app/employer/dashboard/page.tsx:51,52` | Mobile & Desktop | `article` missing `.bss-kpi-card`, lacks vertical flex alignment. | Wrap metric in `.bss-kpi-card` with `flex flex-col` and standard layout. |
| `src/app/contractor/dashboard/page.tsx:74,76` | Mobile & Desktop | `div` missing `.bss-kpi-card`, inconsistent with `submissions/page.tsx`. | Unify with `submissions/page.tsx` using `<article className="bss-kpi-card">`. |
| `src/components/support/BssStaffDashboard.tsx:48` | Tablet (`768px` - `1023px`) | `grid-cols-2 lg:grid-cols-5` leaves 5th card orphaned on tablet. | Update grid classes to `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. |
| `src/app/government/page.tsx:102` | Small Mobile (`<375px`) | 8 KPIs in `grid-cols-2` can wrap text awkwardly on 320px screens. | Already handled by `globals.css:426` (`@media (max-width: 374px) { grid-template-columns: minmax(0, 1fr) !important; }`), ensure min-height is preserved. |
| `src/components/support/ItOperationsDashboard.tsx:88` | Mobile & iOS | Fixed `h-64` terminal height might overflow in short landscape. | Use `h-56 sm:h-64` with `overscroll-behavior: contain` and `.bss-scroll-region`. |

---

## 7. Next Steps for Implementation Team

1. **Implement Prisma / SQLite Schema**: Include models for `OperationsLog`, `OperationsService`, `OperationsTicket`, `SupportCase`, `UploadedDocument`, and role data.
2. **Standardize `bss-kpi-card` in JSX**: Apply consistent `<article className="bss-kpi-card">` markup across Worker, Employer, Contractor, BSS Staff, IT Helpdesk, and Government dashboards.
3. **Resolve Shell Navigation Breakpoints**: Harmonize CSS `.bss-desktop-nav` and JSX classes across all 5 shells for iPad viewports.
4. **Expand IT Helpdesk Terminal Handlers**: Wire allowlisted `db-stats`, `worker-lookup`, and `tail-logs` to Prisma queries in `src/server/operations.ts`.
5. **Connect BSS Staff Cases to Live DB**: Hook up case status transitions to SQLite mutations and feed worker grievances/uploads into the queue.
