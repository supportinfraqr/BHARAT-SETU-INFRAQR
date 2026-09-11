# BSS Six-Role Portal + E-C-S-W Consent/Binding — Implementation & Audit

Date: 30 August 2026 · Mode: local demo (`BSS_DATA_MODE` unset) · Server: http://localhost:3000

## Roles now supported (6)
| Role | Route | Login subject | Auth |
|---|---|---|---|
| Worker | `/worker` | BSS234567890124 | ✅ |
| Contractor | `/contractor/dashboard` | BSSC198200000001 | ✅ |
| Employer | `/employer/dashboard` | BSSE100210000001 | ✅ |
| Government | `/government` | BSSGOV2026ADM00001 | ✅ (new) |
| BSS Staff | `/bss-staff` | BSSST2026STF00001 | ✅ (new) |
| IT Help Desk | `/it-helpdesk` | BSSIT2026HDK00001 | ✅ (new) |

- `PortalRole` extended to 6; session decrypt whitelist, demo `authenticate` subjects, API
  `roleRedirects`/`role()`, and the login role selector + validation all updated. Login now shows
  6 role cards (3 main + Government/BSS Staff/IT Task Force). RBAC resource map extended for the support roles.

## E-C-S-W hierarchy & consent state machine (`src/lib/ecsw.ts`)
- Strict rules enforced: **Site → one Employer** (S∈E), **Worker → exactly one Site** (W→S,
  rejects a worker already active on another Site), **Worker → one Contractor at that Site** (W→C),
  Contractor flexible across E/S, and the **Constant Tuple Rule** (a unique `E|C|S|W` string — no duplicate
  hierarchy).
- `createBindingStore` (add / findByTuple / resolve) + `assertEcsRules` produce the violation list,
  and `advanceConsent` implements the dual-consent handshake (bound only when the counterpart consents).

## Permission / data-visibility engine (`src/lib/permissions.ts`)
- **Pre-binding** discloses only: Name, Age (derived), Sex, **Company (Employer)**, Blood Group.
- **Post-binding** (consent complete) unlocks the full permitted record.
- `sanitizeForBinding(profile, 'pre'|'post')` implements this and is used in the IT Help Desk entity
  lookup, the BSS Staff permission-filtered access, and the consent console's live visibility panel.

## QR Binding & Consent handshake (`src/components/ecsw/BindingConsole.tsx`)
- Selectable **Flow 1 (Top-down E→C→W)** and **Flow 2 (Bottom-up W→C→E)**.
- Dual-consent popup (Approve / Disapprove) with a **60-second countdown**.
- **Fallback A — 1-Minute IVR** (physical card / no worker response): automated-call simulation
  → "Press 1 accept / Press 0 decline" via DTMF.
- **Fallback B — SMS OTP + Voice** (app-to-app network delay): SMS OTP input field, then a voice-call
  fallback for keypad confirmation.
- Live data-visibility panel (pre → post) and a handshake activity log.

## Employer binding & consent workspace (`/employer/bindings`)
- Pre-allocate a hire hierarchy (Contractor · Site · Worker), run the E-C-S-W **rule check**, then
  launch the consent handshake. Shows current active constant tuples. Added under QR System nav.

## Government portal (`/government`) — dynamic policy dashboard
- Multi-select filters: **State, Gender, Worker category, Occupation, Migrant, Site type, Principal
  employer, Contractor**, with a Clear-all control — all combinations update every chart.
- Plots (accessible SVG/CSS, empty/zero-safe): Workers by State, Gender donut, Age & Wage histograms,
  Migration donut, Compliance donut, Category bar, Occupation bar, Employer bar, Site-type donut,
  EPFO-linkage donut, Avg-wage-by-State bar, plus KPIs (workers, states, avg age/wage/attendance,
  EPFO %, compliance %, sites) and a **State→Employer→Contractor→Site→Worker** drill-down table.

## IT Help Desk portal (`/it-helpdesk`)
Operational dashboard for the BSS backend team: service/API status, KPI strip, **entity lookup with
binding-aware visibility**, the E-C-S-W constant-tuple example, and a consent/binding audit log.

## BSS Staff portal (`/bss-staff`)
Backend support work: KPI strip, permission-filtered profile access, pending consent/binding queue,
worker document verification, and disputes/escalations.

## Verification
- `npx tsc --noEmit` (src): **clean**.
- ESLint over all new/changed files: **0 errors** (a handful of pre-existing warnings remain).
- Runtime: all six role logins authenticate; `/government`, `/bss-staff`, `/it-helpdesk`,
  `/employer/bindings` render 200 with real content; `/` shows all six role cards; worker/contractor/
  employer portals still 200; **no new runtime errors** in the dev log.

## Honest limitations (demo mode)
- IVR/SMS/voice consents are **simulated UI flows**; real DTMF/OTP needs a telco/IVR + SMS provider.
- Schema "constraints" are enforced in the state-machine/rule layer (`lib/ecsw.ts`) and the API
  validation; a production deployment would mirror them in the database (FKs + unique `E|C|S|W` tuple,
  single-Site-per-Worker check) and in the upstream service.
- All figures are illustrative demo fixtures; Government/IT/Staff analytics are fed by the
  `governmentData` fixture set, not a live data warehouse.
