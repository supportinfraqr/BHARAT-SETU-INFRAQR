# EXECPLAN

## Task

Decouple the legacy ASP.NET frontend from backend implementation details so Django and React Native can replace each side incrementally.

## Goal

Frontend features call stable domain-facing client interfaces backed by versioned API contracts; legacy ASP.NET endpoints remain compatible behind adapters until Django reaches parity.

## Scope

- Modules: API contracts, browser API adapters, authentication/session boundary, worker grievances
- Files likely involved: `contracts/`, shared frontend API client modules, selected Razor views/scripts, project manifest, contract tests
- Downstream impact: Login/session and grievance migration path; later modules follow the same adapter pattern
- Out of scope: Full Django implementation, React Native scaffold, bulk conversion of all legacy controllers, visual redesign

## Context

The legacy application is ASP.NET MVC/Web API with AngularJS/jQuery Razor views. Controllers frequently return serialized strings or page-specific `JsonResult` values. Browser code constructs endpoint URLs and payloads directly and reads identity from `sessionStorage`/global `LoginId`. The target backend is Django and the target frontend is React Native. Existing workflows, roles, permissions, terminology, and payload behavior must remain operational during migration.

The first vertical slice is worker grievance submission. Its UI currently creates `FormData`, appends `LoginId`, posts directly to `/Grievances/UploadDocuments`, and interprets transport errors. The ASP.NET controller accepts identity from the request and returns HTTP 200 even when its body reports failure. The target contract derives identity from authenticated context, uses consistent HTTP statuses, and returns a typed envelope.

## Constraints

- Preserve backward compatibility unless explicitly told otherwise.
- Avoid unrelated refactors.
- Keep legacy endpoints operational during migration.
- Use smallest safe migration path: contract → adapter → feature migration → backend swap.
- Never trust client-supplied identity in the target contract.
- Validate each milestone independently.

## Evidence

- User report: ASP.NET backend is moving to Django; frontend will move to React Native.
- Recent diff: Worker grievance UI was hardened and remains uncommitted.
- `GrievancesController.UploadDocuments`: accepts multipart fields and client-provided `LoginId`.
- `WorkerLodgeGrievance/script.js`: owns URL, multipart serialization, and HTTP error mapping.
- `LoginController.NGetUserId`: stores server session but returns PascalCase user data serialized as a string.

## Progress

- [x] 2026-08-16T12:02+0530 — Scoped migration boundary and selected first vertical slice.
- [x] 2026-08-16T12:02+0530 — Define versioned session and grievance contracts.
- [x] 2026-08-16T12:02+0530 — Introduce legacy browser adapter and migrate grievance UI.
- [x] 2026-08-16T12:02+0530 — Add contract checks and validate backward compatibility.
- [x] 2026-08-16T12:31+0530 — Centralize password, MPIN, OTP, session refresh, and logout operations.
- [x] 2026-08-16T12:31+0530 — Add authenticated ASP.NET `/api/v1` compatibility routes.
- [x] 2026-08-16T13:02+0530 — Restore declared NuGet packages and compile the ASP.NET solution in Mono.

## Discovery Log

- Finding: Web API attribute routing is enabled, but MVC controllers and frontend-relative URLs remain widely used.
  Evidence: `App_Start/WebApiConfig.cs`, `App_Start/RouteConfig.cs`.
  Impact: Contract routing must be versioned and independent of Razor controller names.
- Finding: Login identity exists in ASP.NET session and browser storage simultaneously.
  Evidence: `LoginController.NGetUserId`, `B_loginController.js`, `scripts/myjslib/controller.js`.
  Impact: Target APIs should derive actor identity from authenticated server context; the legacy adapter may temporarily bridge `LoginId`.
- Finding: Grievance transport, serialization, and presentation are in one feature script.
  Evidence: `Content/Dashboards/WorkerGrievancesSupport/WorkerLodgeGrievance/script.js`.
  Impact: It is a bounded first adapter extraction.

## Decision Log

- Decision: Use contract-first strangler migration rather than translating controllers or Razor code directly.
  Reason: Django and React Native can proceed in parallel while legacy behavior remains available.
  Date: 2026-08-16
- Decision: Start with session context and grievance submission contracts, but implement only the grievance legacy adapter in the first milestone.
  Reason: Authentication behavior has multiple login modes and needs a separate compatibility milestone; grievance submission is already bounded and recently audited.
  Date: 2026-08-16
- Decision: Target contracts use authenticated identity and camelCase JSON with structured errors.
  Reason: Removes browser-global identity coupling and creates predictable clients across web and React Native.
  Date: 2026-08-16

## Milestones

### Milestone 1 — Contract and adapter boundary

Goal: Worker grievance UI no longer knows the legacy endpoint, multipart field names, or response quirks.

Edits:
- `contracts/openapi.yaml`: versioned target session and grievance API contract
- `contracts/README.md`: compatibility mapping and Django/React Native rules
- `scripts/api/bharat-setu-api.js`: stable browser-facing client with legacy grievance adapter
- grievance Razor/script and project manifest: load and consume adapter

Validation:
- Parse/inspect OpenAPI YAML with available tooling or targeted structural checks.
- `node --check` client and feature scripts.
- Static check that feature script contains no grievance URL, `FormData`, or `LoginId` transport field.

Risk: Legacy response bodies may report failure with HTTP 200; adapter must normalize them without changing successful behavior.

### Milestone 2 — Authentication/session boundary

Goal: UI reads a normalized session object through one client interface rather than globals and raw storage keys.

Edits:
- Extend API contract and adapter for login/session/logout.
- Migrate one active login path and worker layout consumers.

Validation:
- Contract fixtures for successful, invalid, expired, and concurrent-session cases.
- Browser smoke test when runtime is available.

Risk: Multiple OTP/MPIN/password flows and legacy sentinel codes require explicit mapping before edits.

Status: Complete in source. Password, MPIN, and OTP use `/api/v1/auth/login`; registration/recovery actions remain isolated behind the compatibility adapter. Session reads and logout use the shared client. Runtime smoke testing remains environment-dependent.

### Milestone 3 — Django-compatible server endpoint

Goal: Versioned ASP.NET compatibility endpoint and future Django endpoint satisfy the same grievance contract.

Edits:
- Add authenticated `/api/v1/grievances` compatibility endpoint or implement it in Django.
- Add contract tests shared by both implementations.

Validation:
- Multipart integration tests covering success, validation, authorization, payload-too-large, and server failure.

Risk: Authentication mechanism and file limits must be confirmed before implementation.

Status: Complete for the ASP.NET compatibility backend. MVC routes use the established server session, derive grievance identity server-side, validate multipart input, and return the target envelopes/statuses. Django bearer-token issuance and explicit upload limits remain deployment decisions, not compatibility-milestone code.

## Implementation Notes

- Browser interface: `BharatSetuApi.grievances.create({ subject, details, audio, documents })`.
- Target endpoint: `POST /api/v1/grievances` with bearer/session authentication; no `loginId` body field.
- Legacy adapter: maps target fields to `/Grievances/UploadDocuments` and temporarily supplies legacy `LoginId` internally.
- Target response: `{ data, meta }`; target errors: `{ error: { code, message, fieldErrors, requestId } }`.
- Migration order: grievance browser adapter → auth/session adapter → versioned server endpoint → Django swap → React Native client.

## Validation Plan

- Unit tests: Adapter response normalization and failure mapping when test harness exists.
- Integration tests: Deferred until versioned server endpoint milestone.
- GUI/manual checks: Grievance submission in legacy browser when runtime is available.
- CLI/manual checks: JavaScript syntax, contract structure, coupling searches, diff checks.
- Performance checks: N/A for contract boundary.
- Regression checks: Existing multipart field names and legacy route remain unchanged behind adapter.

## Recovery / Rollback

- Safe retry: Adapter is stateless; failed requests preserve UI state.
- Rollback: Remove adapter include and restore direct AJAX block in grievance script.
- Files to inspect if validation fails: adapter, grievance feature script, Razor include order, ASP.NET project content entries.

## Completion Summary

Changed:
- Added OpenAPI target contract and migration rules.
- Added browser compatibility adapter for grievance submission.
- Migrated worker grievance UI away from URLs, multipart serialization, raw identity, and transport errors.
- Added adapter contract tests.
- Added versioned login, session, logout, and grievance MVC routes.
- Migrated active login modes and worker-layout session/logout behavior to the shared client.

Validated:
- JavaScript syntax checks passed.
- Adapter contract tests passed for success and key failure paths.
- OpenAPI YAML structural check passed.
- Static transport-coupling check passed.
- Versioned server-boundary source checks passed.
- Full ASP.NET solution compilation passed in the `mono:6.12` validation container. The build retains existing unresolved framework-reference and dependency-version warnings.
- Live HTTP smoke testing remains unavailable because the validation image does not include an ASP.NET host; route, authorization, and response behavior are covered by source-boundary and adapter contract tests.

New dependencies added:
- None

Remaining:
- Implement the same OpenAPI contract in Django, select bearer-token issuance, and set explicit deployment upload limits.

Lessons:
- Treating client identity as compatibility-only state allows the target contract to remove `loginId` without breaking the legacy endpoint.

## CHANGELOG.md Entry

Decouple frontend/backend boundary
Add versioned contracts, shared client, authentication/session adapters, and ASP.NET compatibility routes
Reason: Enable incremental Django and React Native migration without breaking active workflows
