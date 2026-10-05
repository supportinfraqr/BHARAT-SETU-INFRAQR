# BSS AI Audit — Prompts & Criteria

Two independent audits (source: `Backend/api/v1_bridge/ai_audit.py`,
`Backend/api/v1_bridge/compliance_verification.py`). Provider = the default
row in **Admin → AI Audit Settings** (`AiProviderCredential`, e.g. DeepSeek).

- **Level 1 — per file** (uploaded additional form / manual register, and each
  CLRA register at generation). Verdict + per‑checkpoint results.
- **Level 2 — per submission** (the "Contractor Report"). Master‑file C1–C8
  matrix + a structured AI executive assessment.

Both prompts demand `Reply ONLY with a compact JSON object`, are grounded in the
supplied facts, and parse via `_parse_json_block`.

---

## Level 1a — CLRA register / manual register

**System**

```
You are a strict Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. You verify that an uploaded statutory REGISTER is the correct register, that it MATCHES the required template (headings + structure), that its rows are consistent with the employer's master data, and that every listed condition is met. Reply ONLY with a compact JSON object.
```

**User prompt**

```
Required register: {templateTitle | form_name}
Table: Master file (site data) × {period} ({state})
Template columns (the register MUST contain these headings): {templateColumns | 'not specified'}
Master-data field mapping: {column ← fieldKey; ... | 'not specified'}
Required conditions (verify each):
{checks | '- none specified'}
Site: {site_name | 'n/a'}
Expected file format: {required_format | 'PDF / Excel'}

Compare the uploaded register to the template (columns + structure) AND to the employer's master data. Verify:
 - it is the correct register/form for this state & period,
 - it MATCHES the template: the required column headings are present (list any missing),
 - each required condition above is met (report per condition),
 - the rows look like the site's master data (worker names / BSS IDs / wages / dates),
 - totals/period/state are consistent.
Set "templateConformant" false if any required template column heading is missing.
Return JSON with exactly these keys: {"valid": true|false, "templateConformant": true|false, "confidence": 0-100, "summary": "one line", "matchedColumns": ["..."], "missing": ["..."], "issues": ["..."], "findings": ["..."], "checkpointResults": [{"label": "...", "passed": true|false, "detail": "..."}]}.

----- UPLOADED REGISTER TEXT (may be OCR, ignore minor noise) -----
{text}
```

`{checks}` = the form/register's **AI checkpoints** (`ai_checks`), one per line:
`- <label> (expected: <value>) [required|optional]`.

---

## Level 1b — additional / other document

**System**

```
You are a strict Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. You verify that an uploaded document genuinely is the required statutory form, that its content looks correct and complete, and that every listed condition is met. Reply ONLY with a compact JSON object.
```

**User prompt**

```
Required document: {form_name}
Expected file format: {required_format | 'not specified'}
Required conditions (verify each):
{checks | '- none specified'}
Site: {site_name | 'n/a'}

Audit the extracted document text below. Decide whether it is the correct document, whether its content is plausible/complete, and whether each required condition is met (report per condition).
Return JSON with exactly these keys: {"valid": true|false, "confidence": 0-100, "summary": "one line", "findings": ["..."], "missing": ["..."], "issues": ["..."], "checkpointResults": [{"label": "...", "passed": true|false, "detail": "..."}]}.

----- DOCUMENT TEXT (may be OCR, so ignore minor noise) -----
{text}
```

**Enforcement (`_run_ai_audit`):** the file is marked **failed** if any
**required** checkpoint fails (or a required template column is missing),
regardless of the model's `valid` flag. Status = `passed` / `failed` / `review`
(`unavailable` when no provider or no readable text).

---

## Level 2 — submission report AI executive assessment

**System**

```
You are a senior Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. Assess a contractor's submitted CLRA compliance package and reply with ONLY a compact JSON object — no prose, no markdown, no code fences. Ground every statement strictly in the numbers provided and never invent data. Use the C1-C8 classification (C1 compliant … C5 critical … C6 pending). Assign a realistic remediation owner from: Contractor, Compliance, HR, Payroll, Operations, Site Admin, Safety; and a due date within 30 days (YYYY-MM-DD).
```

**User prompt**

```
Contractor: {contractor | 'n/a'} · Principal employer: {employer | 'n/a'}
Site: {site | 'n/a'} · Period: {period | 'n/a'} · FY: {fy | 'n/a'} · Ref: {refNo | 'n/a'}

Verification summary: applicable {applicable}, verified {verified}; coverage {coverage}%, overall compliance {compliance}%, exception rate {exception}%, critical rate {critical}%, pending {pending}%. Classification counts: C1 {c1}, C2 {c2}, C3 {c3}, C4 {c4}, C5 {c5}, C6 {c6}.

Per-parameter results:
- {label} ({population}): applicable {applicable}, verified {verified}, C1 {c1}, C2 {c2}, C3 {c3}, C4 {c4}, C5 {c5}, C6 {c6}, coverage {coverage}%, exception {exception}%
...

File-level level-1 AI audits:
- {name} [{kind}] — level-1 {status}, confidence {confidence}%: {summary}; {findings…}
...

Return JSON with EXACTLY these keys: {"executive_summary": "board-ready 4-6 sentences", "key_findings": ["..."], "material_exceptions": [{"parameter": "", "classification": "C3|C4|C5", "issue": "", "corrective_action": "", "owner": "", "due_date": "YYYY-MM-DD"}], "recommendations": ["..."], "verdict": "Passed|Passed with observations|Needs attention"}. Only list a material exception where the parameter actually shows C3/C4/C5.
```

If no provider is configured (or the reply isn't JSON), the section is omitted
(or falls back to a plain narrative), and the report still renders.

---

## Level 2 — scoring criteria (rule-based, computed, not AI)

**20 parameters** (`compliance_verification.PARAMETERS`). Only 10 are computed
from the master file; the rest are package-level C6 unless noted.

| Parameter | Rule |
|---|---|
| BSS ID, identity and KYC | no name+BSS→C5; no name→C4; no BSS→C3; name+BSS+DOB+(UAN/ESIC)→C1; else C2 |
| Worker-site authorization | site present→C1 else C3 |
| Attendance eligibility | DOJ present→C1 else C6 |
| Attendance completeness | 0 day-cells→C6; ≥26→C1; ≥20→C2; else C3 |
| Wage master applicability | basic&gross→C1; one→C2; none→C3 |
| 100% payroll re-performance | gross≤0→C6; net&ded≤0→C3; `|(gross−ded)−net|≤max(1, 1%)`→C1 else C4 |
| Bank payment verification | acct+bank→C2 (no payment evidence) else C3 |
| PF eligibility and contribution | PF>0 & UAN→C1; PF>0 no UAN→C2; else C6/C7 |
| ESIC eligibility and contribution | ESIC>0 & IP→C1; ESIC>0 no IP→C2; else C6/C7 |
| Cross-module reconciliation | site & gross→C1 else C3 |
| Mandatory records | any batch/file→C1 else C6 |
| Agreement/WO, Applicability/licences, Appointment docs, Gate pass, Attendance edits, Medical, Induction/PPE, Invoice, RCA/CAPA | C6 (pending) |

**Weights:** `C1 1.0 · C2 0.9 · C3 0.7 · C4 0.4 · C5 0 · C6 0 · C7 1 · C8 0`.
`verified = applicable − C6 − C7`. **Metrics:** coverage = verified/applicable;
exception = (C3+C4+C5+C8)/verified; critical = C5/verified; pending =
C6/applicable; compliance = Σ(weight×count)/verified.

**Verdict:** compliance ≥ 95 **and** C5 = 0 → `Passed`; ≥ 85 **and** C5 = 0 →
`Passed with observations`; else `Needs attention`.

Level 1 and Level 2 are **independent** — Level‑1 results are shown in the
report's file‑level section but do **not** change the C1–C8 score.
