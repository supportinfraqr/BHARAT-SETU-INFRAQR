# Project: Next.js BSS Production-Ready Overhaul

## Architecture
The Building & Construction Workers Social Security (BSS) system is an enterprise Next.js App Router application supporting 6 distinct user roles:
1. **Worker**: Identification, digital passcard, welfare claims, grievances, mobility tracking.
2. **Employer**: Compliance tracking, contractor verification, wage/PF audit approvals.
3. **Contractor**: Submissions of statutory registers (PF, ESIC, Wage, Safety), salaries, worker onboarding.
4. **BSS Staff**: Unified case queue, grievance investigation, claims adjudication, support ticketing.
5. **IT Helpdesk**: Restricted terminal operations, service health diagnostics, queue telemetry, live application audit logs.
6. **Government**: Aggregated labor compliance analytics, state-wise welfare distribution, mobility insights.

### System Components & Data Flow
- **Data Layer**: Local SQLite database managed via Prisma ORM (`prisma/schema.prisma`), accessed via singleton client (`src/server/db.ts`) with idempotent seed fixtures (`prisma/seed.ts`).
- **Server Operations & Portal**: `src/server/portal.ts` and `src/server/operations.ts` executing typed Prisma queries and mutations.
- **Upload & Storage Pipeline**: `src/app/api/portal/uploads/route.ts` parsing multipart/form-data, validating magic-bytes signatures, writing files atomically to `.data/uploads/...` (with `0o700` dir / `0o600` file permissions), and indexing metadata in the database.
- **UI Presentation**: Tailwind CSS with iOS viewport safe-area handling (`viewportFit: "cover"`), unified `.bss-kpi-card` KPI grid layouts across all 6 roles, and tablet navigation drawer harmonization.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SQLite Database Initialization | Initialize Prisma with SQLite provider, schema models for all 6 roles, and singleton client | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Role Domain Persistence | Replace `demoStore()` & static mocks in `src/server/portal.ts` with Prisma queries for Worker, Employer, Contractor, Government | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Comprehensive Seed Fixtures | Seed script populating realistic data for all 6 roles, services, logs, tickets, and cases | M1 | Backend Survey |
| 4 | File Upload Parsing & Validation | Secure multipart handling, ≤10MB limit, binary magic byte signature verification (PDF, JPEG, PNG) | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Local Disk Storage & Indexing | Atomic file write to `.data/uploads/...` with secure permissions and metadata recorded in SQLite `Upload` table | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Upload Retrieval & Review Loop | `GET /api/portal/uploads/[id]` streaming endpoint and employer compliance verification status transition | M2 | Uploads Survey |
| 7 | KPI Grid Tile Alignment | Harmonize all 6 role dashboards to use uniform `.bss-kpi-card` and `.bss-kpi-icon` layout with bottom-pinned metrics | M3 | ORIGINAL_REQUEST §R3 |
| 8 | iOS & Tablet Responsive Layout | Fix tablet navigation drawer breakpoint conflict (768px-1180px) and optimize iOS portrait/landscape safe-areas | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Functional IT Helpdesk Terminal | Upgrade terminal to execute DB commands (`db-stats`, `worker-lookup`, `tail-logs`, `services`, `health`, `probe`) against SQLite | M4 | ORIGINAL_REQUEST §R4 |
| 10 | Live Application Logs | Persist and stream live operations audit logs in `OperationsLog` SQLite table queried by IT operations dashboard | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Live BSS Staff Case Management | Connect BSS Staff case queue and support ticketing to live SQLite queries with claim/wait/resolve/escalate transitions | M4 | ORIGINAL_REQUEST §R4 |
| 12 | E2E Testing Suite (Tiers 1-4) | Comprehensive test suite covering all features, boundary cases, cross-role workflows, and real-world scenarios | E2E-Track | ORIGINAL_REQUEST §AC |
| 13 | Final E2E Pass & Adversarial Hardening | 100% test pass verification and Tier 5 adversarial coverage hardening | Final-M | Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Independent opaque-box test suite (Tiers 1-4) published as `TEST_READY.md` | Survey | DONE |
| M1 | Database & Backend Data Layer | Prisma setup, SQLite schema, `db.ts`, seed fixtures, refactor `src/server/portal.ts` | Survey | DONE |
| M2 | Contractor Uploads & Storage Pipeline | `/api/portal/uploads`, disk storage `.data/uploads/`, DB metadata, secure retrieval, employer verification | M1 | DONE |
| M3 | UI/UX & Responsive iOS Tile Alignment | `.bss-kpi-card` harmonization across 6 dashboards, tablet navigation breakpoint fix, iOS safe-areas | Survey | DONE |
| M4 | IT Terminal Live Actions & BSS Staff Live Cases | Functional terminal commands, live `OperationsLog` table, BSS Staff genuine case/ticket CRUD in `src/server/operations.ts` | M1 | DONE |
| Final | 100% E2E Pass & Coverage Hardening | Run full test suite (100/100 tests), Tier 5 adversarial stress tests, and final forensic audit | E2E, M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### Prisma Client & Database
- `src/server/db.ts`: Exports singleton `prisma` instance of `PrismaClient`.
- Models: `User`, `WorkerProfile`, `EmployerProfile`, `ContractorProfile`, `GovernmentWorker`, `DocumentSubmission`, `OperationsService`, `OperationsTicket`, `SupportCase`, `OperationsLog`.

### Upload API Route (`/api/portal/uploads`)
- `POST`: Expects `multipart/form-data` with fields `file`, `employer`, `site`, `type`, `period`. Returns `{ success: true, data: { id, fileName, fileSizeBytes, mimeType, checksumSha256, status, createdAt } }`.
- `GET /api/portal/uploads/[id]`: Returns file stream with `Content-Type`, `Content-Disposition`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`.

### Operations API Route (`/api/operations`)
- `GET`: Returns `{ services: OperationsService[], logs: OperationsLog[], tickets: OperationsTicket[], cases: SupportCase[], stats: object }`.
- `POST`: `{ action: "command" | "ticket" | "case" | "service", payload: object }`. Returns command stdout string or mutated entity.

### UI KPI Cards
- Standard class structure:
  ```html
  <article className="bss-kpi-card">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className="bss-kpi-icon">{icon}</span>
    </div>
    <strong>{value}</strong>
    <p className="text-xs text-gray-400">{subtext}</p>
  </article>
  ```

---

## Code Layout
- `prisma/schema.prisma`: Database schema definitions (40 models)
- `prisma/seed.ts`: Seed script populating local SQLite database
- `src/server/db.ts`: Database client initialization singleton
- `src/server/portal.ts`: Portal domain queries and mutations via Prisma
- `src/server/operations.ts`: IT operations and BSS staff database operations
- `src/server/storage.ts`: Magic byte verification, POSIX atomic disk storage
- `src/app/api/portal/uploads/route.ts`: Upload handler saving to disk and SQLite
- `src/app/api/portal/uploads/[id]/route.ts`: Secure file streaming download route
- `src/app/globals.css`: Global styles, safe area utilities, `.bss-kpi-card`, `.bss-kpi-grid`
- `src/components/layout/*Shell.tsx`: Navigation shells with tablet breakpoint alignment
- `src/components/support/ItOperationsDashboard.tsx`: IT Helpdesk terminal UI
- `src/components/support/BssStaffDashboard.tsx`: BSS Staff live case management UI
- `tests/*`: 5-Tier comprehensive end-to-end and integration test suite (100 tests)
