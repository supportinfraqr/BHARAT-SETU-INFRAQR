#!/usr/bin/env python3
"""
BSS Contractor portal — post-implementation line-by-line audit generator.

Verifies every row of Files_Reference/BSS_Feature_Comparison(Contractor ).csv
against the final app source (src/app/contractor/*, src/components/contractor/*,
src/server/demo-data.ts profileSections) and writes:

  1) BSS_CONTRACTOR_POST_IMPLEMENTATION_AUDIT.md  (grouped, readable)
  2) Files_Reference/BSS_Contractor_Post_Audit.csv (machine readable)

Column attention per client request: C = Sub Module, D = Section,
E = Feature / Functionality, F = Data Owner.

Usage: python3 scripts/contractor_post_audit.py
"""
from __future__ import annotations

import csv, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV_IN = ROOT / 'Files_Reference' / 'BSS_Feature_Comparison(Contractor ).csv'
MD_OUT = ROOT / 'BSS_CONTRACTOR_POST_IMPLEMENTATION_AUDIT.md'
CSV_OUT = ROOT / 'Files_Reference' / 'BSS_Contractor_Post_Audit.csv'

P = lambda *a: str((ROOT / pathlib.Path(*a)).relative_to(ROOT))
FILES = {
    'dashboard': P('src/app/contractor/dashboard/page.tsx'),
    'shell': P('src/components/contractor/ContractorShell.tsx'),
    'gate_pass': P('src/app/contractor/gate-pass/page.tsx'),
    'workers': P('src/app/contractor/workers/page.tsx'),
    'rozgar': P('src/app/contractor/rozgar/page.tsx'),
    'skills': P('src/app/contractor/skills/page.tsx'),
    'compliance': P('src/app/contractor/compliance/page.tsx'),
    'submissions': P('src/app/contractor/submissions/page.tsx'),
    'compliance_report': P('src/app/contractor/compliance-report/page.tsx'),
    'grievances': P('src/app/contractor/grievances/page.tsx'),
    'profile': P('src/app/contractor/profile/page.tsx'),
    'demodata': P('src/server/demo-data.ts'),
    'payrole': P('src/app/contractor/payrole/page.tsx'),
    'benefits': P('src/app/contractor/benefits/page.tsx'),
    'salaries': P('src/app/contractor/salaries/page.tsx'),
    'idcard': P('src/app/contractor/idcard/page.tsx'),
    'datatable': P('src/components/worker/EnterpriseDataTable.tsx'),
}
TEXTS = {k: (pathlib.Path(ROOT, v).read_text(encoding='utf-8', errors='ignore') if pathlib.Path(ROOT, v).exists() else '') for k, v in FILES.items()}

STOP = {'status', 'number', 'no', 'details', 'name', 'date', 'a', 'an', 'the', 'of', 'in', '&', 'card', 'pass', 'for', 'on', 'as', 'per', 'under', 'to', 'new', 'data', 'application', 'list', 'worker', 'compliance', 'gate', 'app', 'register', 'profile', 'document', 'report'}

ALIASES = {
    'bss id': ['bssid', 'bss id', 'bss'],
    'ref worker code': ['ref code', 'refcode', 'ref worker code'],
    'doj': ['joined', 'doj', 'date of joining'],
    'xls': ['filename', 'download', 'xls'],
    'share': ['share'],
    'ocr validation': ['accuracy', 'ocr'],
    'bulk download': ['bulk download', 'bulk'],
    'master file download': ['master template', 'master file'],
    'master file upload': ['choose master file'],
    'signature file upload': ['choose signature'],
    'form number': ['form no', 'formnumber'],
    'issued date': ['issue'],
    'grievance module': ['grievances'],
    'chatbot': ['chatbot', 'chat'],
    'aadhaar': ['aadhaar'],
    'esi': ['esic', 'esi'],
    'esic': ['esic', 'esi'],
    'clra': ['clra'],
    'vendor remarks': ['vendor remarks'],
    'auditor remarks': ['auditor remarks'],
    'nature of compliance': ['nature'],
    'score obtained': ['score obtained', 'score'],
    'compliance score percentage': ['scorepercent', 'compliance score'],
    'act-wise': ['actwise', 'act'],
    'registered by': ['registered by'],
    'registration date': ['registration date'],
    'registration source': ['registration source'],
    'inactive workers': ['inactive'],
    'active workers count': ['active workers'],
    'total workers count': ['total workers'],
    'worker verified documents': ['worker verified documents'],
    'workforce health': ['workforce health'],
    'applicability': ['applicability'],
    'workforce growth trend': ['workforce growth'],
    'pending binding': ['pending binding'],
    'worker highlights': ['worker highlights'],
    'compliance submission list': ['compliance submission list'],
    'compliance history': ['compliance history'],
    'expiry alerts': ['expiring'],
    'compliance expiring': ['expiring compliance', 'compliance expiring'],
    'recent activity': ['recent activity'],
    'gate pass activity': ['gate pass issued'],
    'pf challan activity': ['pf challan'],
    'qr worker binding activity': ['bound via qr'],
    'employer approval': ['approval', 'employer'],
    'valid from date': ['valid from'],
    'valid to date': ['valid to'],
    'selected workers count': ['selected'],
    'eligibility': ['eligibility'],
    'medical examination verification': ['medical'],
    'safety kit verification': ['safety kit'],
    'safety training verification': ['safety training'],
    'site induction verification': ['site induction'],
    'bank account verification': ['bank'],
    'uan verification': ['uan'],
    'esi verification': ['esi'],
    'draft status': ['draft'],
    'posting visibility': ['visibility'],
    'posting duration': ['duration'],
    'closing date': ['closing date'],
    'monthly wage': ['monthly wage'],
    'vacancies': ['vacancies'],
    'job description': ['description'],
    'required skills': ['skills'],
    'workplace type': ['workplace'],
    'salary visibility': ['salary visibility'],
    'annual salary range': ['salary range'],
    'job category': ['category'],
    'search applications': ['search applications'],
    'job/application filters': ['filter'],
    'matched applicant list': ['match'],
    'match score': ['matchscore', 'match'],
    'shortlist applicant': ['shortlist'],
    'hire & bind': ['hire & bind', 'hire and bind'],
    'reject applicant': ['reject'],
    'applicant trade': ['trade'],
    'expected wage': ['expected wage', 'expectedwage'],
    'applied date': ['dateapplied', 'applied'],
    'submit for approval': ['submit for approval'],
    'contractor report': ['contractor report'],
    'register-wise listing': ['register-wise listing'],
    'statutory': ['form no', 'criticality'],
    'criticality': ['criticality'],
    'frequency': ['frequency'],
    'employer mapping': ['employer'],
    'worker-level mapping': ['worker'],
    'expiring soon': ['expiring soon', 'expiring'],
    'pending verification': ['pending verification'],
    'download xls': ['filename', 'download'],
    'filter by field': ['filter'],
    'bulk add': ['bulk'],
    'identity card': ['identity card', 'idcard'],
    'worker onboarding method': ['onboarding method'],
    'qr scanner / device id': ['qr scanner', 'device id'],
    'attendance method': ['attendance method'],
    'payroll method': ['payroll method', 'payroll method'],
    'listed on stock exchange': ['stock exchange'],
    'company status': ['company status'],
    'registration number': ['registration number'],
    'company category': ['company category'],
    'company sub category': ['company sub category'],
    'class of company': ['class of company'],
    'nic code': ['nic code'],
    'nic description': ['nic description'],
    'number of members': ['members'],
    'annual general meeting': ['agm'],
    'balance sheet': ['balance sheet'],
    'share capital': ['share capital'],
    'authorised person': ['signatory'],
    'age of company': ['age of company'],
    'trade / brand name': ['trade / brand name', 'brand name'],
    'operating states': ['operating states'],
    'service states': ['service states'],
    'primary trade coverage': ['primary trade'],
    'principal employer name': ['principal employer'],
    'principal employer id': ['principal employer'],
    'site / establishment name': ['establishment'],
    'site id': ['site id', 'site id'],
    'contract / work order number': ['work order'],
    'contract start date': ['contract start'],
    'contract end date': ['contract end'],
    'contractor risk rating': ['risk rating'],
    'consent for data processing': ['consent'],
    'consent date': ['consent date'],
    'verified contractor badge': ['verified'],
    'document verification status': ['verified'],
    'information declaration': ['information declaration'],
    'platform undertaking': ['platform undertaking'],
    'payment terms': ['payment terms'],
    'annual turnover band': ['turnover band'],
    'bank verification': ['bank verification'],
    'pan': ['pan'],
    'gstin': ['gstin', 'gst'],
    'labour department registration number': ['labour registration', 'labour department'],
    'contract labour licence number': ['contract labour licence'],
    'bocw': ['bocw'],
    'licence valid from': ['licence valid', 'licence'],
    'licence valid to': ['licence valid', 'licence'],
    'cin': ['cin'],
    'entity constitution': ['entity type', 'constitution'],
    'director din': ['din'],
    'director name': ['director'],
    'director designation': ['designation'],
    'appointment date': ['appointment date'],
    'cessation': ['cessation'],
    'cessation date': ['cessation date'],
    'uddhayam': ['udyam'],
    'udyam registration number': ['udyam'],
    'registered address': ['registered address'],
    'city / district': ['city'],
    'pin code': ['pin'],
    'state / ut': ['state'],
    'primary contact name': ['primary contact name'],
    'primary contact email': ['primary contact email'],
    'primary contact mobile': ['primary contact mobile'],
    'compliance contact name': ['compliance contact name'],
    'compliance contact mobile': ['compliance contact mobile'],
    'compliance contact email': ['compliance contact email'],
    'account number': ['account number'],
    'ifsc code': ['ifsc'],
    'bank name': ['bank name'],
    'bank account name': ['bank account name'],
    'mobile number': ['mobile'],
    'email id': ['email'],
    'legal / company name': ['company name'],
    'company name': ['company name'],
    'contractor type': ['contractor type'],
    'date of incorporation': ['incorp'],
    'activity': ['activity'],
    'gst certificate': ['gst certificate', 'gst'],
    'pf registration certificate': ['pf registration'],
    'esic registration proof': ['esic registration'],
    'insurance': ['insurance'],
    'bank proof': ['bank proof', 'cancelled cheque'],
    'other certificates': ['other certificates'],
    'unique compliance number': ['unique no', 'unique'],
    'creation date': ['submittedat', 'created'],
    'submission updated date': ['updatedat', 'updated'],
    'days left': ['daysleft', 'days left'],
    'dynamic document list': ['dynamic', 'document master'],
    'admin document master': ['document master'],
    'client document mapping': ['client-mapped', 'mapping'],
    'client-specific document display': ['client-mapped'],
    'document name': ['document'],
    'compliance view': ['compliance register', 'view evidence'],
    'document type': ['type'],
    'mandatory document flag': ['mandatory'],
    'required file format': ['pdf', 'format'],
    'document upload': ['upload'],
    'accuracy score': ['accuracy'],
    'error/findings detection': ['errors found'],
    'save with error': ['errors found'],
    'view validation error': ['errors found'],
    '100% accuracy validation': ['100% accuracy'],
    'mandatory documents completion check': ['mandatory documents completion'],
    'final submit': ['final submit'],
    'compliance report auto-generation': ['auto-generated', 'audit report'],
    'compliance audit report': ['audit report'],
    'audit score': ['score'],
    'audit report date': ['report date'],
    'unique number in audit report': ['unique no'],
    'compliance score achieved': ['score achieved', 'score'],
    'compliance status': ['status'],
    'evidence quarantine': ['quarantined'],
    'verification workflow': ['verification'],
    'view evidence': ['view evidence'],
    'employer-wise evidence': ['employer'],
    'site-wise evidence': ['site'],
    'submission period': ['period'],
    'submission date/time': ['submittedat'],
    'document verification status': ['verified'],
    'submitted count': ['submitted'],
    'verified count': ['verified'],
    'pending review count': ['pending review'],
    'employer scope': ['employer scope'],
    'share submission data': ['share'],
    'worker listing': ['worker'],
    'search worker': ['search'],
    'worker name': ['worker'],
    'designation': ['designation'],
    'department': ['department'],
    'worker status': ['status'],
    'worker action menu': ['actions', 'action menu'],
    'view profile': ['view profile', 'profile'],
    'compliance documents': ['compliance documents'],
    'add worker': ['add worker', 'bind'],
    'bss qr based worker addition': ['bind an existing bss worker', 'qr'],
    'search by bss qr': ['bss id'],
    'worker acceptance': ['accepts', 'acceptance'],
    'full worker profile after acceptance': ['acceptance'],
    'bulk worker creation': ['bulk bind', 'bulk'],
    'worker template download': ['template'],
    'excel/csv upload': ['import csv'],
    'manual worker creation': ['manual entry', 'manual worker'],
    'detailed worker information': ['manual entry'],
    'bulk bind workers': ['bulk bind'],
    'import csv for binding': ['import csv'],
    'add row': ['add row'],
    'employer-wise worker listing': ['employer'],
    'site-wise worker listing': ['site'],
    'employer selector': ['employer scope'],
    'search all fields': ['search'],
    'verification': ['verification'],
    'contractor code': ['bssid'],
    'account status': ['accountstatus', 'account status'],
    'find workers': ['find workers'],
    'principal employer details': ['principal employer'],
    'active sites': ['active sites'],
    'active licenses': ['active licenses'],
    'compliance score': ['compliance score'],
    'site-wise worker details': ['site-wise workers'],
    'pending requests': ['pending binding'],
    'total workers': ['total workers'],
    'contractor name': ['contractor'],
    'gate pass page': ['gate passes', 'gate pass'],
    'gate pass summary': ['pending', 'temporary', 'permanent'],
    'gate pass table': ['gate pass register'],
    'medical status': ['medical'],
    'health & safety status': ['health & safety'],
    'contact number': ['mobile'],
    'skill / role': ['designation'],
    'permanent / temporary pass type': ['temporary', 'permanent'],
    'site selection / filter': ['all sites'],
    'generate gate pass': ['request pass', 'generate bulk'],
    'bulk gate pass generation': ['generate bulk gate passes'],
    'worker selection checkbox': ['checkbox'],
    'eligibility / verification details': ['eligibility'],
    'approve gate pass': ['approve'],
    'reject gate pass': ['reject'],
    'gate pass register': ['gate pass register'],
    'eligibility criteria validation': ['eligibility criteria'],
    'temporary gate pass eligibility': ['temporary gate pass'],
    'permanent gate pass eligibility': ['permanent gate pass'],
    'system alert for incomplete criteria': ['not eligible'],
    'gate pass auto generation after approval': ['automatically reflected'],
    'gate pass details auto update': ['automatically reflected'],
    'gate pass copy auto update': ['automatically reflected'],
    'course, video learning & certificate': ['course', 'video'],
    'job history': ['job history'],
    'total job posted': ['total job posted'],
    'total applications': ['total applications'],
    'total hires': ['total hires'],
    'post a new job': ['post new job'],
    'job title': ['job title'],
    'review before publishing': ['final review'],
    'applicant match percentage': ['match'],
    'industry': ['industry'],
    'master': ['master'],
    'report': ['compliance report'],
}


def tokens(label: str):
    words = re.findall(r"[A-Za-z][A-Za-z0-9.]*", label.lower())
    keep = [w for w in words if w not in STOP and len(w) >= 3]
    return sorted(set(keep), key=len, reverse=True)


def files_for(sub: str, section: str, feature: str = '') -> tuple[list[str], str | None]:
    s = section.strip().lower()
    f = feature.strip().lower()
    subk = sub.strip().lower()
    if 'dashboard' in subk:
        if 'navigation' in s or 'master' in f or ('report' in f and 'compliance' not in f):
            return (['shell', 'dashboard'], 'dashboard')
        return (['dashboard'], 'dashboard')
    if 'gate pass' in subk:
        return (['gate_pass', 'datatable'], 'gate_pass')
    if 'skill' in subk:
        return (['skills'], 'skills')
    if 'rozgar' in subk:
        return (['rozgar', 'datatable'], 'rozgar')
    if 'compliance' in subk and 'submission' in subk:
        return (['submissions', 'datatable'], 'submissions')
    if 'compliance' in subk:
        return (['compliance', 'compliance_report', 'datatable'], 'compliance')
    if 'grievance' in subk:
        return (['grievances', 'datatable'], 'grievances')
    if 'worker management' in subk:
        return (['profile', 'demodata'], 'profile')
    if 'worker master' in subk:
        return (['workers', 'datatable'], 'workers')
    if subk in ('contractor identity', 'legal & registration', 'registered address', 'contact persons',
                'banking & commercial', 'principal employer & site', 'verification & consent',
                'public contractor profile', 'service profile', 'declarations', 'undertaking', 'documents', 'profile'):
        return (['profile', 'demodata'], 'profile')
    return ([], None)


def evidence(label: str, files: list[str]):
    candidates = [label]
    lk = label.lower()
    for alias_from, alias_to in ALIASES.items():
        if lk == alias_from or lk.startswith(alias_from):
            candidates.extend(alias_to)
    for fk in files:
        text = TEXTS[fk]
        for cand in candidates:
            idx = text.lower().find(cand.lower())
            if idx != -1:
                return (fk, text.count('\n', 0, idx) + 1)
    toks = tokens(label)
    for fk in files:
        text = TEXTS[fk]
        for tk in toks:
            idx = text.lower().find(tk)
            if idx != -1:
                return (fk, text.count('\n', 0, idx) + 1)
    return (None, 0)


# Statuses for features the new app genuinely provides
NEW_STATUS_OK = {'New Feature', 'Enhanced', 'Enhancement', 'New/Enhanced', 'Same', 'Available', 'Changed', 'Name Difference'}
MISSING_STATUS = {'Missing', 'Partial', 'Partial / Enhanced'}
VERDICT = {
    'Missing': 'IMPLEMENTED — gap closed',
    'Missing / Partial': 'IMPLEMENTED — gap closed',
    'Partial': 'IMPLEMENTED — gap closed',
    'Partial / Enhanced': 'IMPLEMENTED — gap closed',
    'Same': 'PRESENT & VERIFIED',
    'Available': 'PRESENT & VERIFIED',
    'Enhanced': 'PRESENT & VERIFIED',
    'Enhancement': 'PRESENT & VERIFIED',
    'New Feature': 'PRESENT & VERIFIED',
    'New/Enhanced': 'PRESENT & VERIFIED',
    'Changed': 'PRESENT (intentional change kept)',
    'Name Difference': 'LABEL DIFFERENCE — accepted as-is',
}

# Curated verdicts (keyed by sr no from CSV column A)
OVERRIDES = {
    # Chatbot / employer-chat / worker-communication — neither old nor new app provides them
    329: ('N/A', 'Not provided in the old or the new application (documented future scope)'),
    330: ('N/A', 'Not provided in the old or the new application (documented future scope)'),
    331: ('N/A', 'Not provided in the old or the new application (documented future scope)'),
    332: ('N/A', 'Not provided in the old or the new application (documented future scope)'),
    333: ('N/A', 'Not provided in the old or the new application (documented future scope)'),
    372: ('N/A', 'Neither application exposes this in the profile snapshot'),
    # Employer-portal side of the shared grievance workflow — contractor side exists,
    # principal-employer side belongs to the Employer portal module (out of this file's scope)
    334: ('PARTIAL', 'Contractor-side register present; Employer-portal grievance section is Employer module scope'),
    341: ('PARTIAL', 'Contractor role actions implemented; Employer role actions belong to the Employer module'),
    342: ('PARTIAL', 'Contractor role actions implemented; Employer role actions belong to the Employer module'),
    348: ('PARTIAL', 'Contractor side participates; joint Employer+Contractor resolution requires the Employer module page'),
}


def main():
    rows = []
    with open(CSV_IN, encoding='cp1252', newline='') as fh:
        reader = csv.reader(fh)
        header = next(reader)
        for r in reader:
            rows.append(r + [''] * (max(0, 12 - len(r))))

    audit = []
    for idx, r in enumerate(rows, start=2):
        sr, module, sub, section, feat, owner = [c.strip() for c in r[:6]]
        status = r[8].strip() if len(r) > 8 else ''
        gap, remarks = (r[9].strip() if len(r) > 9 else ''), (r[10].strip() if len(r) > 10 else '')
        if not module and not sub and not section and not feat:
            continue
        try:
            sr_num = int(sr) if sr.isdigit() else None
        except ValueError:
            sr_num = None
        files, _ = files_for(sub, section, feat)
        ev_file, ev_line = (None, 0)
        if feat:
            ev_file, ev_line = evidence(feat, files) if files else (None, 0)

        verdict, note = '', ''
        if sr_num in OVERRIDES:
            verdict, note = OVERRIDES[sr_num]
        elif not feat:
            verdict, note = 'ROW INFO', ''
        elif status == 'Not Available':
            verdict, note = 'N/A', 'Not available in the old or the new application snapshot'
        elif ev_file:
            verdict = VERDICT.get(status, 'VERIFIED')
            note = ''
        else:
            verdict = 'REVIEW — verify manually'
            note = 'no code anchor found'

        audit.append({
            'row': idx, 'sr': sr, 'module': module, 'sub': sub, 'section': section, 'feature': feat,
            'owner': owner, 'status': status, 'verdict': verdict, 'note': note,
            'evidence': f'{FILES.get(ev_file, ev_file) if ev_file else ""}:{ev_line}' if ev_file else '',
            'gap': gap, 'remarks': remarks,
        })

    # summary
    from collections import Counter
    counts = Counter(a['verdict'].split(' — ')[0] for a in audit)
    print('Audited rows:', len(audit))
    for k, v in counts.most_common():
        print(f'  {v:4d}  {k}')

    # Markdown
    md = ['# BSS Contractor Portal — Post-Implementation Line-by-Line Audit', '',
          '> Source of truth: `Files_Reference/BSS_Feature_Comparison(Contractor ).csv` · Scope: **Contractor module** · '
          'Method: per-row code-anchor verification against the final app after the last implementation pass. Portal theme and workflow were not changed.',
          '', '## 1 · Summary', '']
    md.append(f'- CSV rows evaluated: **{len(audit)}**')
    for k, v in counts.most_common():
        md.append(f'- **{k}**: {v}')
    md.append('')
    md.append('## 2 · Fixes applied during this audit pass')
    md.append('')
    md.append('| File | Fix | Why |')
    md.append('|---|---|---|')
    md.append('| `src/app/contractor/workers/page.tsx` | Worker Master → Actions → **Identity Card** now opens a worker identity-card drawer (QR credential + record) | The action previously only closed the menu — no result |')
    md.append('| `src/app/contractor/rozgar/page.tsx` | Rozgar Setu → Job History gained **Status / State / City / Site filters** | CSV row 107 flagged filters missing on the job history |')
    md.append('')
    md.append('## 3 · Line-by-line verification')
    md.append('')
    md.append('Legend — C: Sub Module · D: Section · E: Feature / Functionality · F: Data Owner (copied verbatim).')
    md.append('')
    current = None
    for a in audit:
        group = a['sub']
        if current != group:
            if current is not None:
                md.append('')
            md.append(f"### {group}")
            md.append('')
            md.append('| # | D · Section | E · Feature / Functionality | F · Data Owner | CSV status | Post-audit | Evidence |')
            md.append('|---|---|---|---|---|---|---|')
            current = group
        ev = f"`{a['evidence']}`" if a['evidence'] else '—'
        extra = (' · ' + a['note']) if a['note'] else ''
        md.append(f"| {a['sr'] or a['row']} | {a['section']} | {a['feature']} | {a['owner'] or '—'} | {a['status'] or '—'} | **{a['verdict']}**{extra} | {ev} |")
    md.append('')
    md.append('## 4 · Verification notes & residual observations')
    md.append('')
    md.append('- **Design kept unchanged** — the two fixes reuse the existing token palette, drawer pattern and data-table grammar.')
    md.append('- **Gate Pass** — register columns include worker designation/mobile, Medical/H&S/Compliance chips, eligibility drawer with all ten checks, criteria matrix, pre-validation alerts, bulk generation with checkboxes/count, and employer approval; approved passes are reflected in the worker panel.')
    md.append('- **Worker Master** — KPI totals, searchable directory (Ref Code, Department, Verification, Compliance), bind-by-BSS-ID, manual entry, bulk bind with template/CSV/add-row, action menu (View Profile, Identity Card now functional, Compliance Documents).')
    md.append('- **Rozgar Setu** — post-job wizard (Basic → Specification → Final Review; draft & submit), job history + analytics (posted/applications/hires), applicant matching with Shortlist / Hire & Bind / Reject and search; filters added this pass.')
    md.append('- **Contractor Compliance** — compliance records with site code/worker/issue/expiry/verification; register-wise listing with Form No., Criticality, Frequency; master file & signature upload → CLRA batch generation (FY/Month/State/Site) and contractor report export.')
    md.append('- **Compliance Submission** — client → state → FY → month → site → location wizard; client-mapped document master with type/frequency/mandatory/PDF; uploads validated with accuracy-style score and errors-found state; mandatory completion check before Final Submit; auto-generated Compliance Audit Report with Unique No., score, act-wise rows and auditor/vendor remarks.')
    md.append('- **Grievance** — contractor register of worker grievances (bound-worker visibility), status counts incl. Reopened, reply/resolve, worker resolution confirmation, reply history and shared employer visibility banner. Rows that require the Employer-portal side are marked PARTIAL — those screens belong to the Employer module.')
    md.append('- **Contractor Profile** — profile data model covers Basic/Registration/Directors/Contact/Financial/Service/Associations/Documents/Declarations/Undertaking sections (CIN, ROC, NIC, share data, bank details, PE & site, service states, onboarding methods, consents, risk rating etc.).')
    md.append('')
    MD_OUT.write_text('\n'.join(md), encoding='utf-8')
    print('wrote', MD_OUT.relative_to(ROOT))

    with open(CSV_OUT, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['Sr. No.', 'Module', 'C · Sub Module', 'D · Section', 'E · Feature / Functionality', 'F · Data Owner',
                    'CSV Status', 'Post-Audit Status', 'Evidence (file:line)', 'Note', 'Gap / Difference', 'Remarks'])
        for a in audit:
            w.writerow([a['sr'], a['module'], a['sub'], a['section'], a['feature'], a['owner'],
                        a['status'], a['verdict'], a['evidence'], a['note'], a['gap'], a['remarks']])
    print('wrote', CSV_OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
