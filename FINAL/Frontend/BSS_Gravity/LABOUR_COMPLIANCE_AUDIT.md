# Labour-Law Compliance Adaptation — Post-Implementation Audit

Date: 30 August 2026 · Mode: local demo · Server: http://localhost:3000

## Scope
Adapted and enforced the ten central-government labour requirements for **workers employed by or
through a Central Government Undertaking / PSU / central-govt governed employer**, and surfaced the
result of each rule on the **worker dashboard** on occurrence/event/fulfilment. A per-rule **state-note**
is attached for state-governed employers/entities (whose rules may differ).

## Central rules (from the list) — implemented

| # | Requirement | Enforcement / validation | Worker surface |
|---|---|---|---|
| 1 | Fines displayed + limited to approved acts/omissions | `fines_display` — approved schedule posted; fines only for approved acts | Worker: "Fines notice displayed" |
| 2 | Total deductions (fines+damage+advance) ≤ 50% of wages; advance separately ≤ 50%; excess carried forward | `computeDeductionCheck(gross, deductions, advance)` — total cap, advance cap, carry-forward | Worker: deduction-cap card (9.5% < 50%, no carry-forward) |
| 3 | 7-day show-cause before damage/loss deduction; proceed only after considered reply | `validateShowCause(type, days, replyConsidered)` blocks damage/loss without ≥7-day notice + reply | Worker: exempt when no damage/loss deduction |
| 4 | OT at 2× rate beyond 8/day or 48/week; written consent; OT records | `overtimeStatus(daily, weekly, consent, otHours)` — 2× multiplier, norm check, consent | Worker: OT card (4h, 2×, consent on file) |
| 5 | Gratuity examined; 15-day notice with amount+date or rejection reasons | `gratuityDeadline(receivedAt)` — 15-day window | Worker: "Claim under examination", days-elapsed |
| 6 | Commuting accidents deemed employment-related | tracked rule `commuting_accident` | Worker: status note |
| 7 | Worksite notice: establishment name/address, hours, wage period/date, 5-yr accidents/dangerous occurrences | tracked rule `worksite_notice` | Worker: status note |
| 8 | Worker vs Non-worker: managerial/admin, or supervisory > ₹18,000/month = NOT a worker; employer maps workforce | `classifyWorker(role, salary)` with the ₹18,000 threshold | Worker: "Classified as Worker" |
| 9 | On-site emergency & disaster control plan (written, for worker health & safety), communicated to workers + nearby public | tracked rule `emergency_plan` | Worker: status note |
| 10 | Women night shift (7PM–6AM) only with written consent; transport, lighting, amenities, emergency contacts, CCTV | night-shift checklist + consent (all 5 amenities + consent) | Worker: exempt/status |

## Implementation
- **Rule engine** `src/lib/labour-compliance.ts` — `RULES` metadata (with central/state application + state note),
  `LIMITS` (50%, 8h/48h, 2×, 15-day, ₹18,000, 7PM–6AM), and pure functions for deduction cap, show-cause,
  overtime, gratuity deadline and worker classification. No fabricated section numbers; numeric rules come from the prompt.
- **Worker surface:**
  - `/worker` dashboard → new **"Labour law compliance"** panel (counts + the active attention/pending item + View all).
  - `/worker/LabourCompliance` — full module listing all 10 rules with status chips, application text,
    per-rule update date and a **state note**.
- **Employer surface:** `/employer/labour-compliance` (new nav item under Compliance) — a live workspace with
  calculators that **enforce the caps**: deduction-cap + advance-cap + carry-forward (with the damage/loss
  show-cause block), OT 2×/consent/norm, gratuity 15-day window, worker classification, and the night-shift
  amenity/consent checklist, plus the 10-rule registry whose statuses flow to the worker dashboard.
- **Central vs State:** `govtScope` ('central'|'state') on both worker & employer data. Default is central;
  the UI labels the governing scope and shows a per-rule "state note" (state rules may differ).

## Verification
- `npx tsc --noEmit` (src): **clean**. ESLint on all changed/new files: **0 errors** (one pre-existing `<img>` warning).
- Runtime: `/worker/LabourCompliance` (200, 10 rules, central scope), `/worker` dashboard panel (200, shows the
  gratuity attention item), `/employer/labour-compliance` (200, deduction-cap calculator + classification).
- Full portal regression: Worker / Contractor / Employer / Government / BSS Staff / IT Help Desk → all **200**;
  **no new runtime errors** in the dev log.

## Honest notes / not hallucinated
- Statutory legal basis is carried as the rule text from the brief; exact section numbers of the underlying
  Acts (e.g., Payment of Wages / BOCW / Factories / Payment of Gratuity) are **not** fabricated here.
- **State-governed employers** are flagged via `govtScope='state'` and per-rule state-notes, but the concrete
  state-specific differences are **not hard-coded** (they must come from the applicable state act/notified rules).
- Values are illustrative demo fixtures; the rule engine is real and will validate any provided numbers.
- Real IVR/SMS, live EPFO and authoritative statutory feeds remain backend dependencies.
