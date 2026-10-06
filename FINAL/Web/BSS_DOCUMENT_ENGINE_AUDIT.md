# BSS Document Template & Automated Generation System — Independent Audit

Audit scope: Appointment Letter · Experience Letter · Permanent Gate Pass · Temporary Gate Pass
Implementations audited in: `src/lib/documentEngine/*`, `src/components/documentEngine/*`,
Contractor/Employer Settings, Worker Masters, Employer Gate Pass.

## 1 · Architecture verification (template ≠ issued document)

| Requirement | Status | Where |
|---|---|---|
| Structured template config model (`sections`, `styles`, `variables`, `signatories`, `numberingPattern`, version/status, owner) | DONE | `src/lib/documentEngine/types.ts` (`TemplateConfig`, `TemplateSection`, `TemplateStyles`, `TemplateVersionRecord`) |
| Separate document instance model (`resolvedData` snapshot, `instanceOverrides`, `templateVersion`, number, status, history fields, `renderedHtml`) | DONE | `GeneratedDocument` in `types.ts`; persisted via `documentService` |
| Token library mapped to actual BSS fields | DONE | `tokens.ts` (`{{worker.fullName}}`, `{{employment.designation}}`, `{{contractor.legalName}}`, `{{employer.legalName}}`, `{{site.name}}`, `{{payroll.basicWage}}`, `{{document.number}}` …) |
| Frontend-first services separated from UI | DONE | `templateService`, `documentService`, `renderNumbering`, `renderDocumentHtml` in `services.ts` / `render.ts`; `workerDataService.resolveWorkerTokens`; mocks isolated in data/service layers |
| No case-by-case hardcoding — tokens render per worker | DONE | Template text stores `{{worker.fullName}}`; preview/finalize substitute resolved values (verified Worker A/B below) |

## 2 · Settings integration

| Requirement | Status | Where |
|---|---|---|
| Contractor → Settings → Document Templates | DONE | `src/app/contractor/settings/page.tsx` + shell avatar link `/contractor/settings` |
| Employer → Settings → Document Templates | DONE | `src/app/employer/settings/page.tsx` + shell avatar link `/employer/settings` |
| Four template cards (Appointment / Experience / Permanent Gate Pass / Temporary Gate Pass) | DONE | `DocumentTemplateManager` (`TemplateManager.tsx`) |
| Card shows Name, Status, Last Updated, Updated By, Version + Edit / Duplicate / Versions & restore / Test with worker | DONE | same |
| Template owner clearly displayed (Contractor vs Employer; no cross-owner modification) | DONE | owner badge on manager + every template record carries `ownerType`/`ownerId` |
| Lifecycle Draft → (edit) → Preview → Finalize & Activate → Active; editing an Active template forks Draft vN+1 | DONE | `templateService.updateDraft/activate/setStatus/saveTemplate` + editor `Finalize & Activate` |
| Version history, restore-previous, activate-any-version | DONE | `VersionHistoryDrawer` |

## 3 · Designer

| Requirement | Status | Where |
|---|---|---|
| Left: sections list + add section (heading/sub-heading/paragraph/divider) | DONE | `TemplateEditor.tsx` |
| Center: live A4 / gate-pass preview (iframe uses the same HTML as print/PDF) | DONE | preview `renderDocumentHtml` |
| Right: section properties, alignment, visibility, **Insert BSS Field** picker with searchable categories | DONE | `FieldTokenPicker.tsx` |
| Layout controls: move up/down, hide/show, delete (non-locked sections), branding theme, base font, header/footer, numbering pattern, signatory roles | DONE | right panel of editor |
| Photo & worker-table sections kept system-controlled | DONE | photo/table section types |

## 4 · Generation workflow & integrations

| Requirement | Status | Where |
|---|---|---|
| Worker → doc type → resolve Active template → fetch data → validate missing → preview → limited edit → finalize → save → print/PDF | DONE | `DocumentGeneratorModal` (`DocumentFlow.tsx`) with explicit **Using template: …** banner |
| Data resolution panel (Worker / Contractor / Employer / Site / Employment / Wage) | DONE | generator left panel |
| Missing-data validation (no `undefined`/`₹NaN` in finalised docs) | DONE | `missingForTemplate` + amber panel with "Complete profile / continue as draft" |
| 🔒 locked auto-fetched identity fields vs ✎ editable instance fields | DONE | locked values + `document.*` editable fields (date/reason/description…) |
| Save Draft / Finalize & Issue / Print / Download PDF | DONE | generator footer; PDF = print-to-PDF of the same render |
| Issued documents immutable; edits → new revision (no silent overwrite) | DONE | `documentService.upsert` new id per finalize; history keeps every copy |
| Document history per worker (View / Print / Download) | DONE | `WorkerDocumentsDrawer` history table |
| Configurable numbering patterns with defaults | DONE | `DEFAULT_NUMBERING` (`BSS/APPT/{{year}}/{{sequence}}`, `BSS/EXP/…`, `PGP/{{siteCode}}/…`, `TGP/{{siteCode}}/{{year}}/…`) |
| Worker Master integration (row action → Documents → Generate each type when applicable) | DONE | Contractor Worker Master action menu + Employer Workers "Documents" column |
| Worker detail Documents (status per type: Not Generated / Draft / Issued / Expired / Revoked) | DONE | `WorkerDocumentsDrawer` cards |
| Gate Pass module uses templates (Approved → Issue PGP / TGP from Active template) | DONE | Employer Gate Pass register per-row Issue actions |
| Bulk generation (per-worker docs; exceptions listed) | DONE | `BulkGenerateModal` (42-ready/3-missing style results + Finalize ready) |
| Bulk Temporary Gate Pass → single pass with dynamic worker table | DONE | `BulkGenerateModal` + multi-select worker table render (generator also supports multi-worker) |

## 5 · Document-by-document checklist

### Appointment Letter — PASS
Header/branding + number/worker ID/issue date; Employer details (contractor + principal employer + site); worker particulars (name, father's name, DOB, gender, nationality, permanent address); appointment & terms; wages (basic/DA/retaining/other/gross); social security; safety; conduct; transfer; termination; grievance; declaration; signatures (Worker/Contractor/Principal Employer). All implemented as configurable sections (see `DEFAULT_SECTIONS('appointment-letter')`) and demonstrated in generator preview. Editable in Settings; auto-fetch verified.

### Experience Letter — PASS
Reference ID, issue date, worker tenure (DOJ → relieving), designation, department, configurable narrative (instance-editable work description), closing statement, signatory, BSS verification footer, auto-population, history.

### Permanent Gate Pass — PASS
Photo, name, BSS ID, designation, DOB/blood group/emergency contact, employer/contractor/site, validity (auto +365 days), disclaimer + safety helpline, configured signatures, gate-pass card layout & print page (`@page 85.6mm×53.98mm landscape`).

### Temporary Gate Pass — PASS
Addressee (Chief Security Officer), subject, contractor/order reference, work area, from/to, days, reason; dynamic worker table; declaration; place/date; Contractor / HOD / HR Head / CSO signatures; single- and multi-worker rendering.

## 6 · Data auto-fetch verification (Worker A vs Worker B)

- Worker A: Ravi Kumar (`BSS892199210001`) — Fitter/Bar Bender at Mumbai Metro Line 3 · RK Buildcon · L&T
- Worker B: Suresh Patel (`BSS892199230003`) — Fitter at Pune Industrial Campus · SafeBuild · L&T

`workerDataService.resolveWorkerTokens` resolves worker/contractor/employer/site/designation/wages from the portal record + BSS-ID-keyed supplement (father's name, DOB, address, blood group, wage components). Generation uses per-worker tokens — no shared/leaked values; template unchanged between the two workers (token-driven). Verified in source and by generating each type for both workers in the demo flow.

## 7 · Independent regression

- `tsc --noEmit` ✅ · ESLint ✅ (0 errors on engine + integration files) · `next build --webpack` ✅
- Runtime route smoke (fresh production build): `/contractor/settings`, `/contractor/workers`, `/contractor/dashboard`, `/employer/settings`, `/employer/workers`, `/employer/gate-pass`, `/employer/dashboard` → **200**

## 8 · Residual limitations (recorded, not hidden)

- **PDF download** opens the print dialog with the exact preview HTML (browser "Save as PDF" gives A4 pagination / card-size pages). No server-side PDF writer yet; `pdfService` seam exists for later.
- **Persistence** is frontend-first (`localStorage`) for templates/instances, mirroring the existing portal demo mode. `templateService`/`documentService` are structured for backend swap.
- Some worker particulars (father's name, address, DOB detail, wage breakdown) come from a BSS-ID-keyed demo supplement because compact Contractor/Employer worker rows do not carry them; the Worker profile already stores the real fields (marked for the remote data pass).
- Employer "Worker Detail" is surfaced via the Worker Master Documents drawer (no separate detail page in the Employer portal).
- Bulk "Finalize N ready" drafts each ready document as `Issued`; revoke/expire lifecycle controls exist as status vocabulary in the drawer.
