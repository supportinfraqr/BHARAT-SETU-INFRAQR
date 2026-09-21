# BSS Session Summary — 2026-09-20 (opencode OCR + CLRA compliance session)

Self-hosted deploy box: `yasser@BSS_Project/FINAL` (tailb59a73). Target: prod `ubuntu@ec2-13-235-161-192.ap-south-1.compute.amazonaws.com` (public EC2, PEM transport — this is what ships this file too).

## OCR — what was built, then where it ended up
- **Self-hosted OCR engine shipped to prod**: `Backend/api/ocr_engine.py` (RapidOCR/ONNX + pypdfium2, ~300MB self-contained) + `Backend/api/ocr_client.py` (paste/serach + field extraction). Runs inside the backend container via RapidOCR on ONNX, pypdfium2 for PDF-raster; no third-party API. Deployed to prod (backend + frontend rebuilt, DB backed up first).
- **Reverted today (commit c9fbf70)**: OCR was also placed on the **worker Documents page** ("Verify & Autofill" — uploaded PAN/UAN/ESIC/Aadhaar, backend autofilled number from card). Per request, OCR was removed from there COMPLETELY (worker Documents page + backend worker autofill reverted to pre-OCR state); the OCR engine itself remains for the **compliance/CLRA register document evidence** side where it belongs (CLRA registers / compliance evidence validation uses the same self-hosted engine).
- So today's final state: OCR lives on the **CLRA register compliance side** (register documents RD01–RD15 evidence, validation `validate_evidence`), NOT on worker Documents. Overflow of the whole session: worker OCR removed, compliance OCR intact.

## CLRA compliance pipeline (13-step) — the full audit/pipeline map
1. BSS Admin → create master compliance (Create/configure)
2. Legal / rule engine → statutory source + applicability
3. Compliance Template definition (fields/calc/validation/evidence/workflow)
4. Employer adoption (compliance pack)
5. Contractor mapping (compliance ↔ contractor/site/worker)
6. Worker / site / payroll locked captured data
7. Auto-compliance engine (applicability → auto-compliance instance)
8. Registers / returns / forms render (statutory documents, statewise)
9. Contractor submission (review, evidence, declare, submit)
10. Auto-audit (checklist + exceptions)
11. Correction / resubmit workflow
12. Final submission (lock)
13. Compliance report / dashboard

## Verified against shipped code
- 1: `WorkerLegalCompliance` / admin master seeding (partial—admin authoring UI pending)
- 2: `StateFormApplicability` / `applicable_form_codes` — shipped
- 3: `RegisterTemplate` (columns, calc rules, validation, evidence) — shipped (author admin UI pending)
- 4: Employer compliance pack — backend routes exist; feature adoption UI pending
- 5: Contractor mapping — `contractor_register_templates` shipped
- 6: Worker/site/payroll locked capture — shipped
- 7: `applicable_templates(state)` → compliance instance — shipped
- 8: `register_template_file` render + register workbook/HTML render — shipped (render coverage partial)
- 9: `_submissions` evidence submission — shipped (OCR evidence validation included)
- 10: `compliance_checklists` / auto-audit — shipped (advance UI)
- 11: correction/resubmit — backend; UI partial
- 12: final submission lock — backend; `final_submission` UI partial
- 13: compliance report/dashboard — **missing UI** (biggest gap; backend partial)

## Deploy / transport notes for this box
This box can deploy prod two ways:
- **Public EC2 + PEM** (this session's transport, Recommended for now): `rsync -e "ssh -i <pem>" ... ubuntu@ec2-13-235-161-192`.
- Tailscale join to presqription tailnet was explored (authkey provided; joins returned exit 0 but tailnet did not change — key garbling on my side). Status still on tailb59a73 (peers: desktop-ptnu38e, infraqr-1, laptop-leadupbu, desktop-bss). Tailnet switching is REVERTIBLE via re-home to tailb59a73. Deferred until a clean key paste.

## Safety / backup (prod, done this session)
- Prod DB + media backup: `~/bss/backups/` (per-commit before each deploy), sha256 integrity on sent core files (submissions.py, worker Documents page, OCR client/engine).

## Generated artifacts (this folder's contents)
- FINAL/Requirements/ → BSS_Findings.xlsx, CLRA state templates xlsx/zip, session summary (this file), OCR revert runbook.
