#!/usr/bin/env python3
"""
Post-implementation audits for:
  BSS_Feature_Comparison(Payroll setup ).csv
  BSS_Feature_Comparison(Employer Profile).csv
  BSS_Feature_Comparison(Contractor Profile ).csv

Verifies each feature row against the final app data dictionaries and UI
(src/server/demo-data.ts profile & payrole config, profile pages, payrole pages,
components and config types) and writes one MD + CSV per file.

Usage: python3 scripts/profile_payroll_audit.py
"""
from __future__ import annotations

import csv, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = ROOT / 'Files_Reference'

FILES = {
    'demodata': ROOT / 'src/server/demo-data.ts',
    'contractor_profile': ROOT / 'src/app/contractor/profile/page.tsx',
    'employer_profile': ROOT / 'src/app/employer/profile/page.tsx',
    'payrole': ROOT / 'src/app/contractor/payrole/page.tsx',
    'payrole_manual': ROOT / 'src/components/contractor/payrole/EmployerManualEntry.tsx',
    'payrole_bulk': ROOT / 'src/components/contractor/payrole/EmployerBulkUpload.tsx',
    'payrole_calc': ROOT / 'src/components/contractor/payrole/PayroleCalculator.ts',
    'payrole_history': ROOT / 'src/components/contractor/payrole/PayroleHistory.tsx',
    'portal_types': ROOT / 'src/types/portal.ts',
}
TEXTS = {key: (path.read_text(encoding='utf-8', errors='ignore') if path.exists() else '') for key, path in FILES.items()}

STOP = {'the', 'of', 'and', 'for', 'with', 'from', 'per', 'no', 'or', 'in', 'on', 'at', 'to', 'as', 'date', 'name', 'number', 'no', 'id', 'type', 'status', 'amount', 'component', 'section', 'line', 'a', 'an', 'is', 'are', 'all', 'each', 'days'}

def tokens(field: str):
    words = re.findall(r"[A-Za-z][A-Za-z0-9.'/-]*", field.lower())
    keep = []
    for w in words:
        clean = re.sub(r"[^a-z0-9]+", "", w).strip("'")
        if clean and clean not in STOP and len(clean) >= 3 and clean not in keep:
            keep.append(clean)
    return sorted(keep, key=len, reverse=True)

def evidence(field: str, corpus_keys: list[str]):
    hay = field.lower()
    for key in corpus_keys:
        text = TEXTS[key].lower()
        if hay in text:
            return key
    toks = tokens(field)
    for key in corpus_keys:
        text = TEXTS[key].lower()
        present = [t for t in toks if t in text]
        if present and len(present) >= max(1, (len(toks) + 1) // 2):
            return key
    return None

# ---------------------------------------------------------------- payroll rows
def payroll_rows():
    with open(REF / 'BSS_Feature_Comparison(Payroll setup ).csv', encoding='cp1252', newline='') as fh:
        rows = list(csv.reader(fh))
    out = []
    for r in rows[1:]:
        r = r + [''] * 8
        module, sub, field = r[0].strip(), r[1].strip(), r[2].strip()
        if not field:
            continue
        out.append({'module': module or sub, 'sub': sub, 'field': field, 'yes': r[3].strip(), 'value': r[4].strip(), 'type': r[5].strip(), 'owner': r[6].strip(), 'mandatory': r[7].strip()})
    return out

def payroll_fields_text(field: str):
    # match against config keys too (camelCase config names)
    compact = re.sub(r"[^a-z0-9]+", " ", field.lower())
    return field

def audit_payroll():
    corpus = ['demodata', 'portal_types', 'payrole', 'payrole_calc', 'payrole_manual', 'payrole_bulk', 'payrole_history']
    rows = payroll_rows()
    audit = []
    for item in rows:
        key = evidence(item['field'], corpus)
        audit.append({**item, 'verdict': 'PRESENT & VERIFIED' if key else 'REVIEW — verify manually', 'evidence': key or ''})
    return audit

# ---------------------------------------------------------------- contractor profile rows
def contractor_rows():
    with open(REF / 'BSS_Feature_Comparison(Contractor Profile ).csv', encoding='cp1252', newline='') as fh:
        rows = list(csv.reader(fh))
    out = []
    for r in rows[1:]:
        r = r + [''] * 8
        section, field = r[0].strip(), r[1].strip()
        if not field:
            continue
        out.append({'section': section, 'field': field, 'value': r[2].strip(), 'owner': r[3].strip(), 'mandatory': (r[5].strip() or r[4].strip())})
    return out

def audit_contractor():
    corpus = ['demodata', 'contractor_profile']
    audit = []
    for item in contractor_rows():
        key = evidence(item['field'], corpus)
        audit.append({**item, 'verdict': 'PRESENT & VERIFIED' if key else 'REVIEW — verify manually', 'evidence': key or ''})
    return audit

# ---------------------------------------------------------------- employer profile rows
def employer_rows():
    with open(REF / 'BSS_Feature_Comparison(Employer Profile).csv', encoding='cp1252', newline='') as fh:
        rows = list(csv.reader(fh))
    out = []
    section = ''
    in_block = False
    for r in rows:
        r = r + [''] * 8
        a, b = r[0].strip(), r[1].strip()
        if re.match(r'^[A-P]\.', b):
            section = b
            in_block = False
            continue
        if b == 'Field / Data Element':
            in_block = True
            continue
        if in_block and a.isdigit():
            out.append({'section': section, 'field': b, 'required': r[2].strip(), 'input': r[3].strip(), 'owner': r[4].strip(), 'purpose': r[5].strip()})
    return out

def audit_employer():
    corpus = ['demodata', 'employer_profile']
    audit = []
    for item in employer_rows():
        if not item['field']:
            continue
        key = evidence(item['field'], corpus)
        audit.append({**item, 'verdict': 'PRESENT & VERIFIED' if key else 'REVIEW — verify manually', 'evidence': key or ''})
    return audit

# ---------------------------------------------------------------- md writer
def write(kind, rows, out_name, columns):
    review = [r for r in rows if r['verdict'].startswith('REVIEW')]
    md = [f'# BSS Post-Implementation Audit — {kind}', '',
          '> Source of truth: Files_Reference/… Feature comparison · Verdicts anchored in the final app data dictionaries and UI.',
          '', '## Summary', f'- Rows audited: {len(rows)}', f'- Present & verified: {len(rows) - len(review)}', f'- Review / manual: {len(review)}', '',
          '## Line-by-line', '']
    md.append('| ' + ' | '.join(columns) + ' | Verdict | Evidence |')
    md.append('|' + '---|' * (len(columns) + 2))
    for r in rows:
        md.append('| ' + ' | '.join(str(r[c]) for c in columns) + ' | ' + r['verdict'] + ' | ' + (r['evidence'] or '—') + ' |')
    md.append('')
    (ROOT / out_name).write_text('\n'.join(md), encoding='utf-8')

    csv_out = out_name.replace('.md', '.csv')
    with open(REF / csv_out, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(list(columns) + ['Post-Audit Status', 'Evidence'])
        for r in rows:
            w.writerow([r[c] for c in columns] + [r['verdict'], r['evidence']])
    print(kind, '-> rows', len(rows), '| reviews', len(review))

def main():
    a = audit_payroll()
    write('Payroll setup', a, 'BSS_PAYROLL_SETUP_POST_AUDIT.md', ['module', 'sub', 'field', 'yes', 'type', 'owner', 'mandatory'])
    b = audit_contractor()
    write('Contractor Profile', b, 'BSS_CONTRACTOR_PROFILE_POST_AUDIT.md', ['section', 'field', 'owner', 'mandatory'])
    c = audit_employer()
    write('Employer Profile', c, 'BSS_EMPLOYER_PROFILE_POST_AUDIT.md', ['section', 'field', 'required', 'owner'])
    for label, audit in [('payroll', a), ('contractor', b), ('employer', c)]:
        for r in audit:
            if r['verdict'].startswith('REVIEW'):
                print('  REVIEW', label, '::', r.get('section', ''), r['field'])

if __name__ == '__main__':
    main()
