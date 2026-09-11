# Dispatch: Forensic Auditor for Milestone 2 (Contractor Uploads & Storage Pipeline)

- **Role**: teamwork_preview_auditor
- **Working Directory**: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/auditor_m2`
- **Parent Orchestrator**: `76d34cfe-4c33-4e01-a296-a09cfced21d5`
- **Scope Documents**:
  - Authoritative User Request: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md`
  - Master Project Plan: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md`
  - Worker Handoff: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m2_r2/handoff.md`

## Forensic Audit Objectives
1. Perform forensic integrity analysis on all Milestone 2 code:
   - `src/app/api/portal/uploads/route.ts`
   - `src/app/api/portal/uploads/[id]/route.ts`
   - `src/server/storage.ts`
   - `src/server/portal.ts` (upload/submission handling)
2. Integrity Checks:
   - Check for hardcoded test results, fake mocks, dummy returns, or cheated checks.
   - Verify that files are genuinely written to disk at `.data/uploads/...` and metadata is genuinely persisted to SQLite.
   - Verify that magic byte inspection is genuine binary verification and not just checking file extensions or mock flags.
   - Verify that download streaming reads genuine bytes from disk and computes true checksums.
3. Provide a clear verdict: `CLEAN` or `INTEGRITY VIOLATION`. Write `handoff.md` in your working directory and notify parent via `send_message`.
