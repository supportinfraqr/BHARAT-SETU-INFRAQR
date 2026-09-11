# Worker Portal — Un-hardcoding Implementation Plan

Goal: make every Worker field obey its sheet-defined data owner, with a real
write path for "Worker Manual Entry" fields and locked/derived values for
Aadhaar/Contractor/System-owned fields.

Models already contain ALL required columns (verified: WorkerIdentity,
WorkerAddressMobility, WorkerSocialSecurity, WorkerWelfareSafety,
WorkerFamilyDependant, WorkerEmployment, WorkerBanking, WorkerClassification,
WorkerSkillsEmployability). So **no new schema is needed** — the work is
exposure + write path + editability + source-of-truth fixes.

## Phase 1 — Backend: expose all manual-entry fields in the payload
File: `api/v1_payloads.py`
1. `_worker_identity_section` — add `alternateMobile`, `email`, `emergencyContact{Name,Number,Relation}`, `disabilityTypePct` (real DB cols).
2. `_worker_personal_section` — already has marital/blood/father/mother/spouse/disability/religion/caste. Add `disabilityTypePct`.
3. `_worker_social_security_section` — add `lwfNo`, `wcPolicyNo`, `eShramNo` (number, not just bool), `stateWorkerId`, keep UAN/ESIC.
4. `_worker_welfare_section` (new) — expose ppeRequired, insuranceStatus, accommodationProvided, trainingDate, trainerName, safetyTrainingCompleted, plus existing gate-pass/medical.
5. `_worker_classification_section` (new) — expose the full WorkerClassification row (category, sector, industry, occupation, skill, employment status, experience, gig block, self-employment block, seasonal block).
6. `_worker_family_section` (new) — expose family_members_count, dependants_count, and the nominee/dependant rows list.
7. `_worker_banking_section` — add `upiEnabled`.
8. `_worker_employment_section` — add `campNo`, `refWorkerId`, `transportFacility`, `route`, `busNo`, `pfAccount`, `natureOfJob`, `typeOfWork`, `idCardIssueDate`, `idCardValidityTill` (from WorkerEmployment; leave empty when no row).
9. Wire all new sections into `build_worker_portal` under `worker.{...}`.

## Phase 2 — Backend: real write path for manual-entry fields
File: `api/v1_bridge.py` (`_persist_mutation`, `resource == "profile"`)
10. Extend the profile PATCH branch to persist, from `body["identity"]` / `body`:
    - WorkerIdentity: name, gender, date_of_birth, alternate_mobile, email, marital_status, father_name, mother_name, spouse_name, emergency_contact_*, disability_status, disability_type_pct, blood_group, religion, caste, pan (NOT aadhaar/photo/age — those are Aadhaar/derived).
    - WorkerAddressMobility: permanent_* + migrant_worker + migration_type (current_* stays Aadhaar).
    - WorkerSocialSecurity: epfo_uan, esic_ip_number, lwf_no, wc_policy_no, e_shram_no, bocw_reg_number, state_worker_id.
    - WorkerBanking: upi_enabled (bank fields are Auto-bank-verification → read-only).
    - WorkerWelfareSafety: manual-entry subset (ppe_required, insurance, accommodation, training date/name).
    - WorkerClassification: full manual-entry row.
    - WorkerEmployment: manual-entry subset (camp_no, nature_of_job, type_of_work, pf_account).
    - WorkerFamilyDependant: nominee/dependant rows (manual entry).
11. Use a single get-or-create per model + field mapping helper to keep it tight.

## Phase 3 — Frontend: wire Profile "Save" to the real PATCH
File: `src/app/worker/Profile/page.tsx` (and sub-sections)
12. Replace fake `handleSave` timeout with `saveWorker(patch)` → `PATCH /api/portal/profile` (already exists in WorkerContext).
13. Bind each editable input to state and include it in the patch; mark Aadhaar-owned fields `readOnly`.
14. Nominee tab: persist family rows via the profile PATCH (or a dedicated endpoint).

## Phase 4 — Editability lock-down (sheet ownership)
15. DOB → `readOnly` (Aadhaar). Name/gender/father/photo already readOnly. Age readOnly (auto).
16. Bank name/holder/acct/IFSC → readOnly (Auto bank verification); only UPI editable.
17. Gate-pass/medical fields that are "Auto after binding" → readOnly on worker side.

## Phase 5 — Dashboard source-of-truth fixes
18. Medical/Safety/Training status → source from contractor-side (binding → contractor → welfare), per sheet "Contractor Side".
19. Wage history → contractor side if not worker-owned.
20. Availability already fixed → `WorkerOther.available_for_work`.

## Phase 6 — Settings consolidation
21. Drop `WorkerSettings` (my duplicate); point Settings screen at `UserPreference`
    (sheet gap-analysis spec). Migrate the data, remove `0010` usage, keep the
    PATCH branch but write to `UserPreference`.

## Phase 7 — Static content
22. Back labour-law/holidays/announcements/courses/leave with master tables
    (ComplianceMaster exists; add HolidayMaster/Announcement/Course/LeaveType
    as minimal tables + seed). Or keep `[]` until admin masters are built.

## Phase 8 — Verify + deploy
23. `py_compile` backend, `tsc --noEmit` frontend.
24. rsync + rebuild + migrate (if any) + HTTP 200 check on AWS staging.

## Execution order
Phase 1 → 2 → 3 (core un-block), then 4 → 5 → 6 → 7, then 8. Each phase ends
compile-clean.
