# BSS Portal — UX / Transition / Authentication Experience Audit

## 1 · Roles tested
Worker · Contractor · Employer · BSS Staff · BSS Admin · Public/Landing · Login · Registration

## 2 · Routes tested (authenticated, all 200)
Worker: `/worker`, `/worker/scan`, `/worker/binding`, `/worker/grievances`, `/worker/idcard` · Contractor: `/contractor/dashboard`, `/contractor/payrole`, `/contractor/skills`, `/contractor/gate-pass`, `/contractor/idcard` · Employer: `/employer/dashboard`, `/employer/payrole`, `/employer/scan`, `/employer/profile`, `/employer/idcard` · Staff: `/bss-staff` · Admin: `/admin`, `/admin/permissions`, `/admin/users`, `/admin/activity`, all masters + mappings

## 3 · Navigation issues discovered
| Issue | Likely cause | Fix |
|---|---|---|
| Logout → crash/unauthorized flash before landing | `SignOutButton` called `router.refresh()` after deleting the session cookie → protected layout re-fetched with no session → `requireSession` throw → error-boundary splash | Full document navigation after DELETE (see §6) |
| Route changes felt abrupt | No content transition; instant swap | Subtle 180 ms content fade (§4) |
| Header active-pill changes were instant | Nav items had no color transition | `transition-colors duration-150` on all shell nav controls |
| Login brand relied on a remote image host | `login.bharatshramsetu.com` logo URL (could fail/block) | Switched to local `/bss-original-logo.png` |

## 4 · Transition improvements made
- New `.bss-content-fade` (180 ms fade + 4 px rise, `both`) applied to the changing content region (`<main key={pathname}>`) in **all 5 shells** (Worker, Contractor, Employer, Support, Admin). The persistent header/shell stays mounted and stable; only content fades in. No full-screen effects, no heavy slides.
- Reduced-motion users get zero animation (global media query).

## 5 · Logout issue root cause
`router.replace('/')` + `router.refresh()`: after the session cookie is cleared, `refresh()` re-executes the current protected route's server components → `requireSession` throws while the old dashboard is still visible → "unauthorized flash" / error-boundary splash before the landing page.

## 6 · Logout fix (FIXED & VERIFIED)
`SignOutButton` now: disabled/`Signing out…` state → `DELETE /api/auth/session` → `window.location.assign('/')` (single full navigation to landing; no re-render of the protected route, no second redirect). Verified for **all 5 roles**: DELETE returns `authenticated:false`; post-logout session check `authenticated:false`.

## 7 · Login improvements
- Brand logo served locally (reliable).
- Premium glow animation gated behind `prefers-reduced-motion: reduce`.
- OTP / MPIN / Password segmented tabs, role selector, validation, forgot-flow, registration flip — all preserved unchanged.

## 8 · Registration improvements
Already progressive (details → OTP), fully `w-full` responsive, no fixed widths — **NO CHANGE REQUIRED** (nothing removed).

## 9 · Portrait-mode issues identified
`login-style.css` already provides: ≤767 px column stack (branding above card, marketing hidden), 768–991 px portrait column stack, ≤480 px compaction, `overflow-y:auto` on the main wrapper. The login card is `max-w-[540px]`/`w-full` (no fixed width). **NO CHANGE REQUIRED** beyond the logo/reliability fix.

## 10 · Responsive fixes
- Content-fade keyed to route (no layout jump on navigation).
- Nav pill transitions without width change (consistent padding/radius; active state swaps background only).
- No horizontal-overflow sources introduced; all shells keep `overflow-x` safe mobile menus.

## 11 · Shared components modified
- `src/components/auth/SignOutButton.tsx` (logout flow)
- `src/components/worker/WorkerShell.tsx`, `contractor/ContractorShell.tsx`, `employer/EmployerShell.tsx`, `support/SupportShell.tsx`, `admin/AdminShell.tsx` (content-fade + nav transitions; Employer/Support gained `usePathname`)
- `src/app/globals.css` (`.bss-content-fade`, `.bss-interactive`, reduced-motion block)
- `src/app/page.tsx` (local logo, glow reduced-motion gate)

## 12 · Accessibility / motion
Global `prefers-reduced-motion: reduce` disables animations/transitions/scroll-behavior; login glow gated; `aria-busy` on sign-out; all transitions ≤180 ms and non-essential.

## 13 · Remaining issues
- Some hero feature icons on the login still load from the remote `login.bharatshramsetu.com` host (decorative, hidden on mobile). **BLOCKED / NEEDS CLARIFICATION** — remote assets are part of the approved login artwork; swapping would alter approved visuals.

## 14 · Regression audit result
`tsc` ✅ · `next build` ✅ (97 routes) · authenticated route matrix across all 5 roles → 200 · logout clean for all roles · **0 runtime errors** · no functional module removed.

## 15 · Final classifications
| Item | Classification |
|---|---|
| Logout (all roles) | **FIXED & VERIFIED** |
| Route content transition | **FIXED & VERIFIED** |
| Header nav micro-interactions | **FIXED & VERIFIED** |
| Reduced-motion support | **FIXED & VERIFIED** |
| Login logo reliability | **FIXED & VERIFIED** |
| Login portrait layout | **NO CHANGE REQUIRED** (already responsive) |
| Registration flow | **NO CHANGE REQUIRED** |
| Remote decorative login icons | **BLOCKED / NEEDS CLARIFICATION** |
