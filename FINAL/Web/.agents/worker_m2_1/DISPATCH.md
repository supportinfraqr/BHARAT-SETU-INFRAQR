## 2026-08-31T08:06:51Z
You are the Contractor Uploads & Storage Backend Worker (teamwork_preview_worker) implementing Milestone 2: Contractor File Upload Backend & Storage Pipeline.
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m2_1
The authoritative user request is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md
The project master specification is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md
Survey analysis and upload blueprints are at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/explorer_survey_uploads/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `.agents/explorer_survey_uploads/analysis.md`.
2. Implement backend logic for `/api/portal/uploads` (`src/app/api/portal/uploads/route.ts`):
   - Parse multipart/form-data (`file`, `employer`, `site`, `type`, `period`).
   - Enforce max size (10MB), allowed MIME types (`application/pdf`, `image/jpeg`, `image/png`), and binary magic-byte header validation.
   - Atomically write file buffers to private local disk storage under `.data/uploads/{role}/{year}/{month}/` with secure permissions (`0o700` dir, `0o600` file).
   - Compute SHA-256 hash checksum.
   - Insert metadata record into SQLite database via Prisma `DocumentSubmission` model (storing id, fileName, storagePath, fileSizeBytes, mimeType, checksumSha256, status='Submitted', etc.).
3. Implement secure streaming retrieval endpoint `src/app/api/portal/uploads/[id]/route.ts`:
   - Enforce session authentication and role authorization.
   - Stream file from disk with `Content-Type`, `Content-Disposition`, `X-Content-Type-Options: nosniff`.
4. Ensure the employer verification loop (`src/app/employer/compliance-submission/page.tsx` and `src/server/portal.ts`) correctly displays submissions and persists review status changes (`Verified` / `Returned`) in SQLite.
5. Verify with automated test scripts and `npm run verify`.
6. Write full handoff report in `handoff.md` in your working directory and notify parent orchestrator via send_message.
