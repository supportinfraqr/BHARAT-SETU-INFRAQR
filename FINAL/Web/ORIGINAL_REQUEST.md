# Original User Request

## Initial Request — 2026-08-31T07:01:47Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (multiple sub-agents in parallel)

Overhaul the Next.js BSS project to make it production-ready. This includes migrating 6 roles from dummy data to functional backend APIs, implementing contractor data upload logic, optimizing UI/UX and tile alignment for iOS devices, and upgrading the IT Task team and BSS staff dashboards with live logs and actionable capabilities.

Working directory: /home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity
Integrity mode: development

## Requirements

### R1. Production-Ready Roles & Backend Integration
- Replace the mock `demoStore()` and dummy data in `src/server/operations.ts` (and related files) with robust, production-ready backend integrations.
- Implement a local database (e.g., SQLite via Prisma) within the app to persist data for all 6 roles (`worker`, `employer`, `contractor`, `bss-staff`, `it-helpdesk`, `government`).

### R2. Contractor Data Upload Logic
- The contractor submissions page (`src/app/contractor/submissions/page.tsx`) currently posts to `/api/portal/uploads` with mock responses.
- Implement backend logic to securely parse, validate, and store uploaded files to local disk storage (e.g., a private `/uploads` directory).

### R3. UI/UX & Tile Alignment Fixes
- Optimize the UI for iOS devices in both landscape and portrait modes using responsive Tailwind classes.
- Fix the `bss-kpi-grid` tile alignments across all dashboards to ensure consistent heights and proper flex properties.

### R4. IT Task Team & BSS Staff Dashboard Upgrades
- Expand the IT Helpdesk (`ItOperationsDashboard.tsx`) restricted terminal to support functional actions and fetch live application logs from the new database.
- Upgrade the BSS Staff dashboard to manage genuine cases and support tickets, reading and writing to the database rather than displaying mock data.

## Acceptance Criteria

### Backend & Database Verification
- [ ] A local database (SQLite/Prisma) is initialized and successfully replaces `demoStore()` without build errors.
- [ ] The `/api/portal/uploads` endpoint successfully writes a valid uploaded file to the local disk and records its metadata in the database. 
- [ ] Automated verification script or Next.js API tests confirm that API routes for the 6 roles fetch and mutate data from the database correctly.

### UI/UX & Layout Verification
- [ ] The `bss-kpi-grid` elements have uniform heights and do not overflow or misalign content when tested at mobile (`sm:`), tablet (`md:`), and desktop (`lg:`) breakpoints.
- [ ] The IT Helpdesk terminal successfully executes at least one functional read/write command against the database and displays the result.
