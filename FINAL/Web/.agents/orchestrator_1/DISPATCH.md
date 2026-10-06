## 2026-08-31T07:02:09Z

You are the Project Orchestrator (teamwork_preview_orchestrator).
Your working directory is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/orchestrator_1
The project workspace root is: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity
The original user request is stored verbatim at: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity/.agents/ORIGINAL_REQUEST.md

Your mission:
Execute the full production-ready overhaul of the Next.js BSS project per the specifications in ORIGINAL_REQUEST.md.
Key Requirements:
1. Replace mock demoStore() and dummy data in src/server/operations.ts (and related files) with a local SQLite database (e.g. via Prisma) to persist data for all 6 roles (worker, employer, contractor, bss-staff, it-helpdesk, government).
2. Implement backend logic for contractor file uploads (src/app/contractor/submissions/page.tsx -> /api/portal/uploads) to parse, validate, and store files to local disk storage with metadata recorded in the database.
3. Optimize UI/UX for iOS devices in landscape and portrait modes using responsive Tailwind classes, and fix bss-kpi-grid tile alignments across all dashboards.
4. Upgrade IT Helpdesk (ItOperationsDashboard.tsx) restricted terminal to support functional actions and fetch live application logs from the database. Upgrade BSS Staff dashboard to manage genuine cases and support tickets reading and writing to the database.
5. Provide automated verification scripts or API tests verifying all requirements and acceptance criteria.

Maintain your BRIEFING.md, plan.md, and progress.md in your working directory.
Dispatch specialists as needed, monitor progress, coordinate implementation and testing.
Report your progress and completion back to the Sentinel.
