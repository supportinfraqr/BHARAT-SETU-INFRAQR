## 2026-08-31T08:06:51Z
You are the IT Operations & BSS Staff Backend Worker (teamwork_preview_worker) implementing Milestone 4: IT Operations Terminal & Live Logs + BSS Staff Genuine Case/Ticket Management.
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/worker_m4_1
The authoritative user request is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md
The project master specification is at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `src/server/operations.ts`.
2. Upgrade IT Operations Terminal & Live Logs:
   - Expand command execution in `src/server/operations.ts` (`commandOutput` / `performOperationsAction`) to execute live read/write queries against SQLite database:
     * `db-stats`: Returns live counts of all SQLite tables (`User`, `WorkerProfile`, `ContractorProfile`, `EmployerProfile`, `DocumentSubmission`, `OperationsLog`, `OperationsTicket`, `SupportCase`, etc.).
     * `worker-lookup <bssId>`: Queries SQLite `WorkerProfile` and returns genuine worker verification details.
     * `tail-logs <n>`: Fetches latest `n` entries from `OperationsLog` table.
     * `services`, `health`, `queues`, `sessions`, `bindings`, `probe <serviceId>`, `retry-binding <bindingId>`: Query and mutate SQLite `OperationsService` and `EcsBinding` tables.
   - Record every command execution, system event, and portal action as an entry in the SQLite `OperationsLog` table.
   - Ensure the live telemetry snapshot (`getOperationsSnapshot`) returns real-time data from `OperationsService`, `OperationsTicket`, `SupportCase`, and `OperationsLog`.
3. Upgrade BSS Staff Case & Support Ticket Management:
   - Ensure `SupportCase` and `OperationsTicket` CRUD actions (`claim`, `wait`, `resolve`, `escalate`, `assign`, `comment`) execute genuine Prisma mutations against SQLite and emit audit logs.
   - Connect worker grievances and document review cases to the unified BSS staff case queue.
4. Verify by running build & test scripts (`node scripts/run-e2e-tests.mjs`, `npm run verify`).
5. Write full handoff report in `handoff.md` in your working directory and notify parent orchestrator via send_message.
