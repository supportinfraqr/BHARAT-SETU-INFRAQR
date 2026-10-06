# Handoff Report: Contractor Uploads & File Management Architecture

## 1. Observation

1. **Contractor Submissions Page (`src/app/contractor/submissions/page.tsx`)**:
   - Lines 11-19 define document types (`PF Challan`, `ESIC Return`, `Wage Register`, `Attendance Register`, `Safety Audit`, `Medical & Insurance`) and table columns.
   - Lines 34-40 enforce client-side constraints: max size 10 MB (`next.size > 10 * 1024 * 1024`), types `application/pdf`, `image/jpeg`, `image/png`.
   - Lines 48-57 post multipart form data (`file`, `employer`, `site`, `type`, `period`) to `/api/portal/uploads`.
   - Line 54 updates state: `replaceContractor({ ...contractor, submissions:{ ...contractor.submissions, documents:[result.data, ...contractor.submissions.documents] } })`.

2. **Existing Upload API Route (`src/app/api/portal/uploads/route.ts`)**:
   - Line 23 enforces session role check: `if (session.role !== 'Worker' && session.role !== 'Contractor') return NextResponse.json(...)`.
   - Lines 25-26 enforce Content-Length limit: `if (contentLength > 11 * 1024 * 1024) ...`.
   - Lines 28-32 enforce file existence, 10MB limit, allowed types (`application/pdf`, `image/jpeg`, `image/png`), and signature validation (`hasValidSignature(file)`).
   - Lines 43-46: In `demo` mode, computes SHA-256 hash from in-memory ArrayBuffer and returns mock response `DEMO-${crypto.randomUUID()}` without writing to disk or database.
   - Line 47: In `remote` mode, proxies upstream to `/v1/${portalRolePath(session.role)}/submissions`.

3. **Related Upload Callers in the Codebase**:
   - `src/app/contractor/salaries/page.tsx:45-58`: Uploads wage proof with type `'Salary / Wage'` and captures `result.data.fileName`.
   - `src/app/contractor/benefits/page.tsx:46-60`: Uploads benefit proof with type `'Worker Benefits'` and captures `result.data.fileName`.
   - `src/app/worker/Documents/page.tsx:2`: Uploads KYC/worker documents to `/api/portal/uploads`.
   - `src/app/worker/Leave/page.tsx:3`: Uploads leave attachments and stores `result.data.id` as `attachmentId`.

4. **Review & Governance Workflows**:
   - `src/app/employer/compliance-submission/page.tsx:20`: Employer reviews submissions via `mutate('submissions', 'PATCH', { id: row.id, status })`.
   - `src/server/portal-validation.ts:142-145`: Enforces valid status `'Verified' | 'Returned'` for employer submission review mutations.
   - `src/server/portal.ts:42-64`: Handles portal mutations, currently generating mock objects in demo mode.

5. **Existing Local Storage Patterns**:
   - `src/lib/bssIdIssuer.ts:8`: Stores local state at `path.join(process.cwd(), ".data", "bss-identities.json")` with directory creation `0o700` and file permissions `0o600`.

---

## 2. Logic Chain

1. **Step 1 (Requirement vs Observation)**: Requirement R2 specifies that contractor submissions must parse, validate, and securely store uploaded files to local disk storage (e.g. private uploads directory) and record metadata in the database.
2. **Step 2 (Gap Identification)**: Observation 2 proves that `POST /api/portal/uploads` currently discards file buffers in memory in `demo` mode and relies on mock IDs, while relying on an external upstream server in `remote` mode.
3. **Step 3 (Storage Strategy Formulation)**: Following the local storage pattern observed in `src/lib/bssIdIssuer.ts` (Observation 5), uploaded files must be saved under `.data/uploads/{role}/{year}/{month}/` with `0o700` directory and `0o600` file permissions outside of the public root.
4. **Step 4 (Database Schema Model)**: An `Upload` / `Submission` database model in Prisma/SQLite must record `id`, `uploadedBy`, `contractorId`, `employerName`, `siteName`, `documentType`, `compliancePeriod`, `originalFileName`, `storagePath`, `mimeType`, `fileSizeBytes`, `checksumSha256`, and `status`.
5. **Step 5 (Cross-Role Integration)**: Linking the contractor uploads to the employer review page (`src/app/employer/compliance-submission/page.tsx` as observed in Observation 4) ensures that when a contractor uploads a document, it is immediately queryable by the bound employer, who can update its status to `'Verified'` or `'Returned'`, closing the compliance governance loop.
6. **Step 6 (Retrieval & Download Support)**: To allow reviewers and contractors to inspect uploaded documents, a dedicated streaming endpoint `GET /api/portal/uploads/[id]` with role-based authorization and security headers (`nosniff`, `sandbox` CSP) is required.

---

## 3. Caveats

- **External Virus / Malware Scanning**: Investigation focused on local magic-byte and MIME validation. ClamAV or external antivirus engine integration is omitted as an external dependency not specified in the project requirements.
- **Large Video / Multi-Gigabyte Streaming**: The upload architecture is sized and optimized for PDF and image documents up to 10 MB.
- **Database Engine Dependency**: Implementation of database models depends on the parallel database migration task (Prisma / SQLite initialization).

---

## 4. Conclusion

The contractor uploads workflow is fully mapped across all frontend consumers (`submissions`, `salaries`, `benefits`, `worker documents`, `worker leave`) and backend handlers.
To make contractor uploads production-ready:
1. Update `/api/portal/uploads/route.ts` to write incoming files atomically to a private directory (`.data/uploads/...`) and insert metadata records into SQLite via Prisma.
2. Provide a secure `GET /api/portal/uploads/[id]` streaming endpoint with strict access control.
3. Wire `getContractorPortal` and `getEmployerPortal` in `src/server/portal.ts` to query and update the persistent `Upload` table.

A full technical blueprint and code templates are documented in `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/explorer_survey_uploads/analysis.md`.

---

## 5. Verification Method

1. **File Integrity Verification**:
   - Inspect `.agents/explorer_survey_uploads/analysis.md` for complete data contracts and code architecture.
2. **Project Build & Type Checks**:
   - Run `npm run verify` (`npm run lint && npm run i18n:check && tsc --noEmit`) to verify that all existing TypeScript types and routes are sound.
3. **Downstream Implementation Verification**:
   - When the backend implementation is applied, upload a sample 1 MB PDF at `/contractor/submissions`.
   - Verify file is written to `.data/uploads/contractor/...` with `0o600` permissions.
   - Verify record exists in SQLite `Upload` table with matching SHA-256 checksum.
   - Verify employer can review at `/employer/compliance-submission` and change status to `Verified`.
