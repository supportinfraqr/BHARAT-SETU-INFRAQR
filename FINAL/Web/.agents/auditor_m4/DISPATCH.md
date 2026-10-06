# Dispatch: Forensic Auditor for Milestone 4 (IT Terminal Live Actions & BSS Staff Live Cases)

- **Role**: teamwork_preview_auditor
- **Working Directory**: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/auditor_m4`
- **Parent Orchestrator**: `76d34cfe-4c33-4e01-a296-a09cfced21d5`
- **Scope Documents**:
  - Authoritative User Request: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md`
  - Master Project Plan: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md`
  - Worker Handoff: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m4_r2/handoff.md`

## Forensic Audit Objectives
1. Perform forensic integrity analysis on all Milestone 4 code:
   - `src/server/operations.ts`
   - `src/app/api/operations/route.ts`
   - `src/components/support/ItOperationsDashboard.tsx`
   - `src/components/support/BssStaffDashboard.tsx`
2. Integrity Checks:
   - Verify that terminal commands genuinely query and mutate the SQLite database and are not hardcoded static mock strings.
   - Verify that `OperationsLog` entries are genuinely inserted into and fetched from SQLite.
   - Verify that BSS Staff cases and tickets perform real SQLite mutations with valid schema relations.
   - Check for any integrity violations, fake passes, or cheating shortcuts.
3. Provide a clear verdict: `CLEAN` or `INTEGRITY VIOLATION`. Write `handoff.md` in your working directory and notify parent via `send_message`.
