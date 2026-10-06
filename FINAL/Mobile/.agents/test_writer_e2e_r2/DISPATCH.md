## 2026-08-31T07:41:12Z
You are the E2E Test Specialist (teamwork_preview_test_writer).
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/test_writer_e2e_r2
The authoritative user request is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md
The project master specification is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md

Instructions:
1. Read ORIGINAL_REQUEST.md and PROJECT.md in full.
2. Design and build a comprehensive, opaque-box, requirement-driven E2E & API test suite under `tests/` or `scripts/`.
3. Follow the 4-tier test case methodology:
   - Tier 1: Feature Coverage (≥5 tests per feature for all 6 roles: Worker, Employer, Contractor, BSS Staff, IT Helpdesk, Government; file uploads; terminal commands; case workflows; database persistence).
   - Tier 2: Boundary & Corner Cases (invalid payloads, oversized uploads >10MB, bad MIME/magic-bytes, unauthorized role calls, empty queries, invalid ticket states, special characters).
   - Tier 3: Cross-Feature Combinations (contractor upload -> employer verify -> BSS staff inspect; worker grievance -> BSS staff claim & resolve -> IT audit log; IT terminal command -> live log reflection; mobility update -> identity verification).
   - Tier 4: Real-World Workload Scenarios (end-to-end full life-cycle simulation across all 6 roles).
4. Provide an executable test runner script (e.g. `node scripts/run-e2e-tests.mjs` and/or `npm run test:e2e` in package.json) that executes the tests against the app / DB / APIs and returns exit code 0 on all tests passing and non-zero on failure.
5. Create `TEST_INFRA.md` and `TEST_READY.md` at project root with exact runner instructions and tier breakdown.
6. Write your handoff report to `handoff.md` in your working directory and notify the parent orchestrator via send_message.

Ensure the tests verify authentic persistence, file writing to disk, live log updates, and layout properties.
