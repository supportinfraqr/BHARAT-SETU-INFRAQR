# EXECPLAN

## Task

Integrate the stable `/api/v1` contract into the existing Django, React web, and React Native code on `infraqr-dev`.

## Goal

Django satisfies the shared authentication, session, logout, and grievance contract; clients use one authenticated identity boundary; ASP.NET compatibility remains available during verification.

## Scope

- Modules: Django `api`/`authx`, shared OpenAPI contract tests, web and Expo API clients
- Files likely involved: Django URL/view/test files and client endpoint modules
- Downstream impact: authentication/session lifecycle and grievance submission
- Out of scope: unrelated legacy endpoint conversion, UI redesign, database migrations

## Context

`origin/infraqr-dev` already contains Django and React/Expo applications. It exposes JWT endpoints under `/api/auth/` and legacy-compatible endpoints under `/api/`. The stable contract added by commit `6c55fc0` uses `/api/v1`, normalized envelopes, and authenticated server-derived grievance identity. Existing Django grievance code accepts a client `LoginId` override and permissive uploads.

## Constraints

- Preserve existing `/api/auth/` and legacy `/api/` routes.
- Do not trust client-supplied identity in `/api/v1`.
- Do not commit this plan or other workflow artifacts.
- Do not push until implementation and tests are reviewed.

## Evidence

- User report: working branch is `infraqr-dev`.
- Recent diff: corrected local branch is `origin/infraqr-dev` plus commit `6c55fc0`.
- Related tests: `tests/contracts/*.test.js` pass for the ASP.NET boundary.

## Progress

- [x] 2026-08-16T14:05+0530 — Rebase work safely by cherry-picking onto a temporary branch from `origin/infraqr-dev`.
- [x] 2026-08-16T14:06+0530 — Validate transplanted contract and establish Django integration gaps.
- [x] 2026-08-16T14:32+0530 — Implement Django `/api/v1` authentication and session lifecycle.
- [x] 2026-08-16T14:32+0530 — Implement authenticated Django grievance creation and validation.
- [x] 2026-08-16T14:41+0530 — Add Django contract tests and update clients.
- [x] 2026-08-16T14:46+0530 — Run focused and regression validation; review before any push.

## Discovery Log

- Finding: Django and both clients already exist under `BSS_PROJECT_INFRAQR/`.
  Evidence: commits `077397f` through `6f0f2eb` on `origin/infraqr-dev`.
  Impact: integrate rather than scaffold.
- Finding: Legacy grievance upload accepts `LoginId` from request data.
  Evidence: `backend/api/business_views.py:179`.
  Impact: `/api/v1/grievances` must derive identity from authentication only.
- Finding: Clients currently carry JWT and `X-Legacy-Login-Id` simultaneously.
  Evidence: web/mobile API clients.
  Impact: versioned calls must rely on JWT; legacy header remains compatibility-only.

## Decision Log

- Decision: Add versioned endpoints alongside existing routes.
  Reason: preserve compatibility while creating the replacement boundary.
  Date: 2026-08-16
- Decision: Use the existing Django JWT user as the `/api/v1` authenticated principal.
  Reason: it is already consumed by the React/Expo clients and avoids trusting a client identity header.
  Date: 2026-08-16

## Milestones

### Milestone 1 — Django contract endpoints

Goal: Django exposes all four versioned operations with normalized responses.

Validation:
- Django focused tests for login, session, logout, authorization, validation, and uploads.

Risk: legacy and Django identities are not yet mapped one-to-one.

### Milestone 2 — Client convergence

Goal: React and Expo use the versioned identity endpoints without legacy identity headers.

Validation:
- TypeScript checks/builds configured by each client.

Risk: token persistence differs between localStorage and AsyncStorage.

### Milestone 3 — Full review

Goal: corrected branch is safe to publish without deleting or bypassing `infraqr-dev` work.

Validation:
- Contract checks, Django tests, client checks, diff review, and ancestry verification.

Risk: environment services may prevent database-backed integration tests.

## Validation Plan

- Unit tests: Django API request tests.
- Integration tests: shared contract behavior where runtime permits.
- CLI/manual checks: OpenAPI parse, JavaScript syntax, TypeScript checks, `git diff --check`.
- Regression checks: existing ASP.NET adapter/source tests.

## Recovery / Rollback

- Safe retry: all work is on `decouple-frontend-backend-infraqr-dev` and unpushed.
- Rollback: discard only new integration edits; keep cherry-picked baseline commit.

## Completion Summary

Changed:
- Added versioned Django JWT/session/grievance endpoints and normalized error handling.
- Prevented legacy identity headers from authenticating versioned routes.
- Migrated React web and Expo authentication clients to the versioned contract.
- Added focused Django contract tests and missing declared runtime dependencies.

Validated:
- Nine focused Django tests pass without a database service.
- ASP.NET adapter/source contract tests pass.
- React web build/lint and Expo TypeScript checks pass.
- OpenAPI and diff checks pass.

New dependencies added:
- `bcrypt`, `Pillow`, and `reportlab` (all already imported by backend modules but previously undeclared).

Remaining:
- Database-backed success smoke test in the deployed Django environment.
- Publish corrected branch after confirming remote branch name.

## CHANGELOG.md Entry

Integrate Django API v1 boundary
Implement normalized authentication, session, logout, and grievance operations
Reason: Make existing Django and React/Expo migration conform to the decoupled contract
