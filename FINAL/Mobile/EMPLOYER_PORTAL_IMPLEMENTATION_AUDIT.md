# Bharat Shram Setu — Employer Portal Implementation & Audit

Date: 30 August 2026
Source spec: `Files_Reference/Employer.md`
Data mode: local **demo** (`BSS_DATA_MODE` unset → `demo`) — all records are demo fixtures; remote endpoints wait on the upstream API.

> Figma node `VaoqrN2GD8dnDfJgeQ0ibH/ICLWMS?node-id=4435-8842` is behind an auth wall and
> could not be inspected directly. The Employer information architecture, fields, KPIs and
> relationships were therefore derived from the spec's own section catalogue and the existing
> Worker/Contractor portals, which the spec lists as the UI/UX source of truth. Any Figma-only
> field that has no backing demo data is marked **Blocked by Backend/API**.

---

## 1. Non-regression verified

Run again after the Employer work — no regressions found:

| Area | Route(s) | Status |
|---|---|---|
| Worker profile | `/worker/Profile` | ✅ renders |
| Worker Rozgar | `/worker/rozgar` | ✅ renders |
| Worker attendance | `/worker/Attendance` | ✅ renders |
| Worker Identity Card | `/worker/idcard` | ✅ renders |
| Contractor dashboard | `/contractor/dashboard` | ✅ renders |
| Contractor Worker Master | `/contractor/workers` | ✅ renders |
| Contractor Gate Pass | `/contractor/gate-pass` | ✅ renders |
| Contractor QR workers | `/contractor/qr/workers` | ✅ renders |
| Contractor Identity Card | `/contractor/idcard` | ✅ renders |
| Contractor Compliance | `/contractor/compliance` | ✅ renders |

Authentication `/api/auth/session`, session cookie, RBAC resource gating (`/api/portal/[resource]`),
QR scanner (`/worker/scan`), shared `EnterpriseDataTable`, notifications, i18n — all unchanged.

## 2. TypeScript / lint

- `npx tsc --noEmit` — **no errors in `src/`** (the only reported errors are stale generated
  `.next/dev/types/*` route validators referencing removed pre-existing worker route paths).
- `eslint` over all changed/new Employer files — **0 errors, 0 warnings**.

## 3. Coverage audit (spec §47/§5 nav)

Legend: ✅ Implemented & Verified · 🔵 Blocked by Backend/API · ⚪ Spec Ambiguous.

### 3.1 Dashboard
| Spec | Route | Component | Status |
|---|---|---|---|
| Employer dashboard / org header + BSS ID | `/employer/dashboard` | dashboard page | ✅ |
| KPI strip — contractors / sites / workers / compliance | `/employer/dashboard` | metric cards | ✅ |
| Action Required (severity colour, click-through) | `/employer/dashboard` → filtered pages | action panel | ✅ |
| Active Sites / Site Overview section | `/employer/dashboard`, `/employer/site-overview` | site cards | ✅ |
| Approval queue | `/employer/dashboard` → `/employer/approvals` | queue panel | ✅ |
| Expiry alerts (Critical / Upcoming / Later) | `/employer/dashboard` + `/employer/admin/documents` | expiry panel | ✅ (grouped by doc status) |
| Workforce health | `/employer/dashboard` | progress rows | ✅ |
| Recent activity | `/employer/dashboard` | activity list | ✅ |
| Compliance summary / distribution | `/employer/dashboard`, `/employer/reports` | bars + score | ✅ |

### 3.2 Workforce
| Spec | Route | Status |
|---|---|---|
| Workers (read-only, site/contractor context) | `/employer/workers` | ✅ |
| Contractors (bindings, sites, workers, compliance) | `/employer/contractors`, `/employer/admin/contractors` | ✅ |
| Gate Pass approval workspace | `/employer/gate-pass` | ✅ |
| Gate Pass summary + single/bulk approve-reject + confirm dialog | `/employer/gate-pass` | ✅ |
| Site filter on gate passes | `/employer/gate-pass` | ✅ |

### 3.3 Sites
| Spec | Route | Status |
|---|---|---|
| My Sites list (search/filter/status/View/QR) | `/employer/sites` | ✅ |
| Site Overview | `/employer/site-overview` | ✅ |
| Site Detail (Basic/Address/Operational/Compliance/Contact/Attendance/Billing/Facilities tabs) | `/employer/sites/[siteId]` | ✅ |
| Site relationship context (contractors + workers at site) | `/employer/sites/[siteId]` | ✅ |
| Add Site | `/employer/sites` (modal) | ✅ |
| Geo / lat-long / map | demo data only | 🔵 map/reverse-geocode needs postal API |

### 3.4 Compliance
| Spec | Route | Status |
|---|---|---|
| Contractor Compliance oversight | `/employer/compliance` | ✅ |
| Compliance Submission (review verify / return) | `/employer/compliance-submission` | ✅ |
| Compliance Report (site/contractor/period/status filters + export) | `/employer/compliance-report` | ✅ (export via EnterpriseDataTable) |
| Compliance summary (donut-free: one distribution) | `/employer/reports`, `/employer/dashboard` | ✅ |

### 3.5 QR System
| Spec | Route | Status |
|---|---|---|
| My Workers (QR) | `/employer/qr/workers` | ✅ |
| My Contractors (QR) | `/employer/qr/contractors` | ✅ |
| Binding Requests (entity → employer → site, approve/reject) | `/employer/qr/requests` | ✅ (reuses approvals) |
| My Sites (QR) — shared site model, not a second dataset | `/employer/qr/sites` | ✅ |
| Identity Card (view/download/print/QR, PDF) | `/employer/idcard` | ✅ |
| Scan / Bind QR (scan → identify → verify) | `/employer/scan` | ✅ (reuses worker scanner + identity verify API) |
| QR binding rule — never scan→instant bind | `/employer/scan` | ✅ (verify endpoint revalidates; no auto-bind) |

### 3.6 Administration (gated by `canAccessAdmin`)
| Spec | Route | Status |
|---|---|---|
| Contractor Management | `/employer/admin/contractors` | ✅ |
| User Management | `/employer/admin/users` | ✅ |
| Permissions (Role → Module → Permission) | `/employer/admin/permissions` | ✅ |
| Site Management | `/employer/admin/sites` | ✅ |
| Worker Compliance Documents | `/employer/admin/documents` | ✅ |
| Audit / Log Report | `/employer/admin/audit` | ✅ |
| Transport Management | `/employer/admin/transport` | ✅ |
| Admin gate (only permitted users) | admin layout + pages | ✅ (guarded client-side; server auth still required) |

### 3.7 Shared / Cross-cutting
| Spec | Status |
|---|---|
| Same BSS logo / navy / orange / green / surfaces / compact tables / badges / modals | ✅ (reused existing shell + EnterpriseDataTable) |
| Reuse one component system (no Employer-specific buttons/tables/modals) | ✅ |
| i18n — nav keys added to shared `portalTranslations`, English fallback | ✅ |
| Notifications — reused global framework (Employer seeds unchanged) | ✅ |
| Search & filter persisting on drill-down | ⚪ Spec Ambiguous — client-side only today; server pagination/filter carry-over needs API |
| Mobile (drawer filters / card summaries / scanner) | ✅ (responsive tables scroll; scanner reuses mobile-first path) |

## 4. Blocked by Backend/API (exact gaps)
- **Map / reverse-geocode + national PIN validation** for Site Detail address — demo subset only.
- **Server-side pagination/filtering** for large worker datasets — currently client-side in `EnterpriseDataTable`.
- **Authoritative gate-pass expiry + document-expiry dates** — demo fixtures; no live source.
- **Admin permission enforcement** — only client-side gating flag; real RBAC must be enforced at the API.
- **Transport / user / audit** — demo fixtures only; no provisioning or log-service endpoints.

## 5. Specification Ambiguous
- Distinction between "My Sites" and "Site Overview" (both lean on `/employer/sites` + `/employer/site-overview`).
- Figma node unreachable, so exact Figma-only field lists, card sets and drill-down labels could not be
  confirmed verbatim; implemented content follows the spec's section catalogue and Worker/Contractor parity.
- Employer "Reports" (workforce intelligence) is retained as a top-level item even though the §5 tree omits it,
  to keep the pre-existing `/employer/reports` route reachable.

## 6. Reused / Extended / New
- **Reused:** `EnterpriseDataTable`, `WorkerQr`, worker QR scanner page, global shell/header/nav, i18n, notification framework, employer Context + mutate API path, `requireApiSession`/`requireSession`.
- **Extended:** `EmployerPortalData` + `EmployerSite` types (gate passes, submissions, site `details`, admin entities); `demo-data.ts` fixtures; `resourcesByRole` + `validatePortalMutation` (Employer gate-passes bulk, submissions); `portalTranslations` nav keys.
- **New (only genuinely Employer-specific):** Employer Gate Pass workspace, Site Detail tab view, Compliance Submission, QR-system Employer pages, Employer Identity Card, and the gated Administration area.

## 7. Relationship audit
- Employer → Sites → Contractors → Workers hierarchy is preserved and displayed as nested context (site detail shows its contractors + workers; worker/contractor tables show site/contractor context).
- No duplicate site dataset (QR sites reuse `employer.sites`); no instant-scan-bind path.
- Demo fixture note: the worker-portal subject (`BSS234567890124`) and the Ravi Kumar on the contractor/employer side (`BSS892199210001`) remain different demo records — pre-existing, not introduced here.

## 8. Delivery status
- Employer portal expanded to the spec's navigation + all listed modules, on the shared BSS design system.
- Verified on `http://localhost:3000` (dev server running, `next dev --webpack`).
- Worker/Contractor regression-tested; tsc + eslint clean for all changed/new source.

## 9. iOS / iPad / iPhone responsive audit (fixed)
The portal is now optimized for WebKit on iPhone/iPad, with the ID-card flip corrected:

| Issue | Fix |
|---|---|
| ID card back side distorted / mirrored on iOS | Added `-webkit-` prefixes and a `bss-flip-card` GPU-composited wrapper (`will-change`, `preserve-3d`). Replaced reliance on fragile `backface-visibility` with **opacity + `pointer-events` face switching** on all three cards (worker/contractor/employer), so WebKit always shows exactly the intended face while keeping the 3D flip animation. |
| PDF export of the hidden face | Capture options now force `opacity: '1'` (+ `WebkitBackfaceVisibility`) so html-to-image renders the front/back even when a face is currently `opacity:0`. |
| Safe-area / home indicator overlap | Added `viewport-fit=cover` (root `viewport` export) and `env(safe-area-inset-bottom)` helpers (`.pb-safe`, `.pb-safe-lg`). Applied to the fixed bottom action bars in `/employer/approvals` and `/employer/gate-pass`, and to the floating Listen & Learn control in `VoiceGuide`. |
| WebKit 3D flattening / blur | Faces opt into GPU composition (`data-bss-face` + `will-change`); `perspective`/`preserve-3d`/`backface-visibility`/`rotateY` all carry `-webkit-` in `globals.css` and the per-page `<style jsx global>` blocks. |
| Card width on narrow phones | Card remains `w-full max-w-[400px]` (fluid width, responsive), content uses flex + `min-w-0`, so it fits iPhone widths. |

**Verified:** root viewport now emits `viewport-fit=cover`; worker/contractor/employer ID cards render with `bss-flip-card`, `data-bss-face`, `perspective-1000`, `rotate-y-180`; `.pb-safe` and the VoiceGuide `bottom-[max(1rem,env(safe-area-inset-bottom))]` utility are served in the CSS; all three ID-card routes return 200; `tsc` clean; no new lint errors.
