# Dispatch: Worker Milestone 4 (Fix & Polish)

- **Role**: teamwork_preview_worker
- **Working Directory**: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m4_fix`
- **Parent Orchestrator**: `76d34cfe-4c33-4e01-a296-a09cfced21d5`
- **Scope Documents**:
  - Authoritative User Request: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md`
  - Master Project Plan: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md`
  - Reviewer 1 Handoff: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/reviewer_m4_1/handoff.md`
  - Reviewer 2 Handoff: `/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/reviewer_m4_2/handoff.md`

## Objectives
1. Fix ESLint violation in `src/server/operations.ts:162:49`:
   - Replace explicit `any` with strong type (e.g. `Awaited<ReturnType<typeof prisma.workerProfile.findFirst>>` or explicit interface) to ensure `npx eslint src/` passes with 0 errors.
2. Fix type mismatches in test/challenge scripts:
   - In `scripts/test-milestone4.ts`, `scripts/challenge-m4.ts`, and `tests/adversarial-m4-stress.ts`, ensure `expiresAt` in mock session tokens aligns with `PortalSession` (`expiresAt: number`).
   - Ensure all type assertions and assertion signatures are clean.
3. Verify:
   - Run `npx eslint src/` -> 0 errors
   - Run `npx tsc --noEmit` -> 0 errors
   - Run `npm run build` -> Exit code 0
   - Run `node scripts/run-e2e-tests.mjs` -> 77/77 PASS
   - Run `node -r ./scripts/test-register.cjs -r tsx/cjs scripts/test-milestone4.ts` -> 27/27 PASS
4. Write `handoff.md` and notify parent orchestrator via `send_message`.
