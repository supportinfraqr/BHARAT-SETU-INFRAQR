# BSS Government Dashboard — Enterprise Upgrade Audit

Scope: Government analytics redesign, worker place-of-birth mapping, social security view,
consent registry (Worker / Contractor / Employer / Staff). Portal theme unchanged.

## Requested improvements → implementation status

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | **State-level locked dashboard**; one demo Government account may switch state | DONE | `src/app/government/page.tsx` — scope is locked to a state (persisted `bss-gov-state`); the demo account gets an explicit "switch state" control with a state/UT picker. All panels compute against the locked state. |
| 2 | **Real-address mapping → mandatory Place of Birth for workers; migration (immigrant/emigrant) per state** | DONE | `WorkerRecord.identity.placeOfBirth` added (type, demo seeds, portal mapping); Worker dashboard shows a blocking **Place of Birth gate** until declared; field added under Worker Profile → Identity. Government migration panel maps: Local (born in state & working in state), In-migrants (born elsewhere → working in state), Out-migration (born in state → working elsewhere), plus "where in-migrants come from". |
| 3 | **Social Security view = PF & ESIC + derivatives only** (no gratuity/bonus) | DONE | "Social Security — PF & ESIC" section: PF/UAN coverage, ESIC coverage, coverage mix (both/none), PF by category, ESIC by occupation, average wages of covered workers. Explicitly excludes gratuity & bonus. |
| 4 | **Time analytics both ways** (year-by-year trend + within-year monthly comparisons) | DONE | "Time Analytics" section: registrations by year, PF & ESIC coverage trend by year, within-year month-wise registrations + PF/ESIC joins per month with a year selector. |
| 5 | **Header wording "By State" → "By Demography"** | DONE | Section titles switch: unlocked All-India view → "By State"; locked state view → "By Demography" (gender, age, category, occupation). |
| 6 | **Compliance status removed** | DONE | Compliance KPI, compliance donut and the trailing compliance table were removed; export no longer includes the compliance field. |
| 7 | **Coherent panel ordering** | DONE | Order: Scope header → KPIs → Demography → Migration & Origin → Social Security (PF/ESIC) → Time Analytics → Employer & Contractor Landscape → notes. |
| 8 | **Use "Employer", not "Principal Employer"** | DONE | All government UI copy now uses Employer only. |
| 9 | **Contractor details like Employer** | DONE | "Employer & Contractor Landscape" — symmetric Top employers and Top contractors panels with worker concentration + average wage. |
| 10 | **PF & ESIC richer detail** | DONE | Donuts, category/occupation coverage bars, coverage-trend group bars, month-wise PF/ESIC joins, average wage by cover. |
| 11 | **Remove the table at the end** | DONE | Last sample table removed. |
| 12 | **Consent list for Worker / Contractor / Employer / Staff (not Government) with revoke in Settings** | DONE | New consent registry (`src/lib/consents.ts` + `src/components/ConsentPanel.tsx`) seeded per role; panels added to Worker Settings, Contractor Settings (Consents tab), Employer Settings (Consents tab) and new `/bss-staff/settings`. Users can revoke (and re-grant) consents. |

## Data coverage
- Government scope extended from 12 states to **all 28 States + 8 Union Territories** (`src/data/governmentData.ts` `states`); the deterministic generator falls back to district names for any state without an explicit district list, so no module-level crashes.

## Regression
- `tsc --noEmit` ✅ · ESLint 0 errors on changed files · `next build --webpack` ✅ (clean rebuild)
- Runtime smoke (fresh build): `/government`, `/worker`, `/worker/Settings`, `/worker/Profile`, `/contractor/settings`, `/contractor/profile`, `/employer/settings`, `/employer/profile`, `/bss-staff`, `/bss-staff/settings` → **200**

## Demo notes
- The government dataset is illustrative/deterministic; month/year attributes are derived deterministically per worker to demonstrate both trend modes. The same analytics surface binds to the persistent worker repository when a real data source is connected.
- The worker Place-of-Birth gate appears only when the field is empty (demo workers are seeded with a place of birth so the portal stays usable; clearing the field demonstrates the gate).
