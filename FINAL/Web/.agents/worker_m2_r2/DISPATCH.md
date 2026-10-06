# Dispatch: Worker Milestone 2 (Contractor Uploads & Storage Pipeline)

- **Role**: teamwork_preview_worker
- **Working Directory**: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m2_r2`
- **Parent Orchestrator**: `76d34cfe-4c33-4e01-a296-a09cfced21d5`
- **Scope Documents**:
  - Authoritative User Request: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md`
  - Master Project Plan: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md`

## Milestone 2 Objectives
1. Implement and verify `src/app/api/portal/uploads/route.ts`:
   - Parse `multipart/form-data` with fields `file`, `employer`, `site`, `type`, `period`.
   - Max file size ≤10MB (with early Content-Length rejection for >11MB).
   - Validate binary magic byte signatures for PDF (`%PDF`), PNG (`\x89PNG\r\n\x1a\n`), and JPEG (`\xFF\xD8\xFF`). Reject unknown/spoofed MIME with 415.
   - Atomically write files to `.data/uploads/...` with secure directory (`0o700`) and file (`0o600`) permissions.
   - Calculate SHA-256 binary checksum of the file.
   - Record metadata in SQLite database (`DocumentSubmission` / `Upload` models) via Prisma.
   - Enforce RBAC: Contractor and Worker roles allowed; Principal Employer role rejected with 403.
2. Implement and verify `src/app/api/portal/uploads/[id]/route.ts`:
   - Stream saved file from disk with correct headers (`Content-Type`, `Content-Disposition`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-transform`).
   - Handle nonexistent uploads with 404.
3. Implement Employer Verification Transition Loop:
   - Ensure Principal Employer can query contractor submissions and approve/reject/verify compliance filings in database.
4. Verify by running build (`npm run build`) and upload tests / E2E tests (`node scripts/run-e2e-tests.mjs --tier=1` or relevant tests).

## Write Ownership
- `src/app/api/portal/uploads/route.ts`
- `src/app/api/portal/uploads/[id]/route.ts`
- `src/server/storage.ts`
- `src/server/portal.ts` (upload/submission query/mutation handlers)
- `src/app/contractor/submissions/page.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Write `handoff.md` and `progress.md` in your working directory `.agents/worker_m2_r2/` with:
- Observation (what was inspected/changed)
- Logic Chain (technical implementation rationale)
- Verification (build and test commands run and exact outputs)
- Status: DONE or BLOCKED
When complete, notify parent orchestrator via `send_message`.
