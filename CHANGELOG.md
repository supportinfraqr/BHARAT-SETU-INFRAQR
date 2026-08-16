# CHANGELOG

Append-only. Most recent entries first.

Use short, telegraphic style:
- verb + object
- no articles
- concise lines

One entry per task.

## 2026-08-16 — Decouple frontend/backend boundary

Add versioned contracts, shared client, session adapter, and ASP.NET compatibility routes
Files/Modules: API contracts, login/session, worker layout, worker grievances, MVC routing
Impact: Authentication, session lifecycle, and worker grievance transport
Reason: Enable incremental Django and React Native migration without breaking ASP.NET workflow

## 2026-08-16 — Harden worker grievance flow

Improve accessible recording, validation, uploads, and submission recovery
Files/Modules: Worker grievance Razor view, script, and styles
Impact: Worker grievance recording and submission
Reason: Prevent ambiguous controls, duplicate DOM identities, unsafe filenames, repeated submissions, and unrecoverable errors
