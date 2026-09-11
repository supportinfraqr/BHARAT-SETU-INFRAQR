# Handoff Report: Backend Data Architecture & SQLite + Prisma Survey

**Agent:** Backend Data Explorer (`teamwork_preview_explorer`)  
**Working Directory:** `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/explorer_survey_backend`  
**Date:** 2026-08-31  
**Handoff Type:** Hard (Task Complete)  

---

## 1. Observation

1. **In-Memory State in `src/server/operations.ts` (lines 17-66, 178-216)**:
   - `operationsGlobal.__bssOperationsStore` uses an ephemeral global object initialized by `initialStore()` containing static `services`, `logs`, `tickets`, and `cases`.
   - `performOperationsAction()` mutates this in-memory object on lines 182-213, but changes are lost on server restart or across serverless process lifecycles.
   - `commandOutput()` on lines 117-162 produces hardcoded strings and updates the in-memory store without querying real data tables.

2. **Static Mock Responses in `src/server/portal.ts` (lines 10-64)**:
   - `getWorkerPortal()` returns `structuredClone(demoWorkerPortal)` (line 12).
   - `getContractorPortal()` returns `structuredClone(demoContractorPortal)` (line 19).
   - `getEmployerPortal()` returns `structuredClone(demoEmployerPortal)` (line 25).
   - `getGovernmentPortal()` returns static `governmentWorkers` and `states` (lines 31-37).
   - `mutatePortal()` simulates create/update actions by generating random strings (`DEMO-LEAVE-${crypto.randomUUID()}`) on lines 46-61 without persisting to disk or database.

3. **Upload Route in `src/app/api/portal/uploads/route.ts` (lines 20-50)**:
   - Validates file size (≤10MB) and magic bytes for PDF, JPEG, PNG (lines 11-17, 30-32).
   - In demo mode (lines 43-46), it computes SHA-256 hash `checksum` from buffer, but generates a mock return object (`DEMO-${crypto.randomUUID()}`) without saving the uploaded file to disk or recording metadata in a database.

4. **API Route Coverage (14 route files under `src/app/api/`)**:
   - `/api/auth/register`, `/api/auth/session`, `/api/portal`, `/api/portal/[resource]`, `/api/portal/uploads`, `/api/operations`, `/api/card-orders`, `/api/notifications`, `/api/worker/profile`, `/api/worker/profile/mobility`, `/api/identity/verify/[bssId]`, `/api/geography`, `/api/health`.
   - All 6 roles (`Worker`, `Contractor`, `Employer`, `IT Help Desk`, `BSS Staff`, `Government`) interact with these routes.

5. **Package and Runtime Environment**:
   - `package.json` currently lacks `prisma` and `@prisma/client`.
   - Node.js version is `v22.22.1`, npm version is `9.2.0`.
   - TypeScript check (`npx tsc --noEmit`) passes with 0 errors.

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Persistence Need**:
   - Because `demoStore()` and `mutatePortal()` rely entirely on process memory and random ID synthesis, any entity created or edited by a user (e.g. submitting leave, adding wage entries, claiming tickets, filing grievances) is ephemeral. Replacing these functions with Prisma database operations targeting SQLite will provide full persistence across restarts.

2. **From Observation 3 to Disk & Database Upload Pipeline**:
   - The upload route already implements strict binary header signature checking (`hasValidSignature`). Storing the verified buffer into `./uploads/` via `fs/promises.writeFile` and creating a `DocumentSubmission` record via Prisma directly fulfills Requirement R2 without breaking existing client forms.

3. **From Observation 1 to IT Operations & BSS Staff Live Upgrades**:
   - In `src/server/operations.ts`, `commandOutput` and `performOperationsAction` can directly execute Prisma queries on `OperationsService`, `OperationsTicket`, `SupportCase`, and `OperationsLog`. This fulfills Requirement R4 by providing genuine live application logs and functional terminal commands.

4. **From Observation 4 & 5 to Schema Design**:
   - To support all 6 roles without breaking frontend contracts, the database schema must map 1:1 to the domain interfaces in `src/types/portal.ts` and `src/types/operations.ts`. The schema provided in `analysis.md` models all entities with exact typing, relations, and default values.

---

## 3. Caveats

1. **SQLite Concurrency**: SQLite uses file-level locking for writes. In local/development mode, concurrency is low and SQLite is optimal. For production multi-instance deployments, a client might migrate SQLite to PostgreSQL using the identical Prisma models.
2. **Next.js Server Actions vs Route Handlers**: The app currently uses Next.js Route Handlers (`src/app/api/`) and React Context fetchers. Prisma queries must execute in standard Node.js server runtime (not Edge runtime).
3. **Seed Data Idempotency**: The seed script must use `upsert` or clean reset logic to avoid unique constraint collisions on re-runs.

---

## 4. Conclusion

The codebase is cleanly structured with strong validation boundaries and type safety. Migrating to SQLite + Prisma involves:
1. Adding `prisma` and `@prisma/client`.
2. Initializing `prisma/schema.prisma` with the 28 domain models outlined in `analysis.md`.
3. Creating a database seed script (`prisma/seed.ts`) populating fixtures for all 6 roles.
4. Refactoring `src/server/portal.ts` and `src/server/operations.ts` to perform Prisma queries and mutations.
5. Implementing local disk storage in `src/app/api/portal/uploads/route.ts` with database metadata indexing.

All detailed data schemas, relations, API mappings, and transformation steps are documented in `.agents/explorer_survey_backend/analysis.md`.

---

## 5. Verification Method

To independently verify this survey and findings:
1. Inspect the comprehensive analysis report:
   ```bash
   view_file .agents/explorer_survey_backend/analysis.md
   ```
2. Verify TypeScript type compatibility:
   ```bash
   npx tsc --noEmit
   ```
3. Check route locations and file structure:
   ```bash
   ls src/server/
   ls src/app/api/
   ```
