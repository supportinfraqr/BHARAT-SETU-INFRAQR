## 2026-08-31T07:41:12Z
<USER_REQUEST>
You are the Backend & Database Worker (teamwork_preview_worker) implementing Milestone 1: Database & Backend Data Layer.
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m1_1
The authoritative user request is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md
The project master specification is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md
Survey analysis and complete schema blueprints are at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/explorer_survey_backend/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `.agents/explorer_survey_backend/analysis.md`.
2. Implement the local SQLite database via Prisma:
   - Install `prisma` (devDependency) and `@prisma/client` (dependency) if not present.
   - Create `prisma/schema.prisma` with datasource sqlite pointing to `"file:./dev.db"`, generator client, and complete models for all 6 roles and supporting domains (`User`, `WorkerProfile`, `WorkerDocument`, `WageRecord`, `AttendanceRecord`, `ProvidentFundRecord`, `BonusRecord`, `LeaveEncashmentRecord`, `LeaveRecord`, `Grievance`, `JobRequest`, `CardOrder`, `WorkerCourseProgress`, `ContractorProfile`, `ContractorEmployerBinding`, `ContractorWorker`, `ComplianceRecord`, `ComplianceReport`, `GatePass`, `SalaryRecord`, `ContractorBenefitRecord`, `RozgarApplication`, `JobPosting`, `EmployerProfile`, `Site`, `EmployerApproval`, `DocumentSubmission`, `OperationsService`, `OperationsTicket`, `SupportCase`, `OperationsLog`, `Notification`).
   - Create singleton Prisma client at `src/server/db.ts`.
   - Create comprehensive seed script at `prisma/seed.ts` populating complete realistic data for all 6 roles, services, tickets, cases, logs, and compliances.
   - Run `npx prisma generate` and `npx prisma db push` (or migrate) and `npx prisma db seed`.
3. Refactor `src/server/portal.ts`, `src/server/auth.ts`, `src/server/session.ts` (and helpers) to query and mutate SQLite via Prisma instead of returning static in-memory objects / fake UUIDs.
4. Verify by running build & verification commands (`npx tsc --noEmit`, `npm run verify`, database query checks).
5. Document all commands, file diffs, and verification results in `handoff.md` in your working directory and notify the parent orchestrator via send_message.
</USER_REQUEST>
