"use client";

import { useState } from 'react';
import { Building2, ContactRound, Landmark, LayoutGrid, Lock, Network, Settings, ShieldCheck, Users } from 'lucide-react';
import StatutoryLicences from '@/components/portal/StatutoryLicences';
import { useEmployer } from '@/contexts/EmployerContext';
import type { ContractorLicence } from '@/types/portal';

// All 16 BSS_Employer.csv sections (A–P) + BSS preferences.
const tabs = [
  ['identity','A · Identity & Legal Details',Building2],
  ['business','B · Business & Industry',Landmark],
  ['contacts','C · Authorised Contacts',ContactRound],
  ['address','D · Registered & Correspondence Address',Building2],
  ['verification','E · Verification & KYC',ShieldCheck],
  ['statutory','F · Labour, Statutory & Regulatory',ShieldCheck],
  ['licences','Registrations & Licences',Landmark],
  ['workforce','G · Workforce Profile',Users],
  ['employment','H · Employment, Payroll & Wage Practices',Users],
  ['benefits','I · Social Security & Worker Benefits',ShieldCheck],
  ['safety','J · Safety, Health & Welfare',ShieldCheck],
  ['contractor-mgmt','K · Contractor Management',Network],
  ['sites-qr','L · Establishments, Sites & Workplace QR',LayoutGrid],
  ['worker-relations','M · Worker Relations, Grievance & Governance',Users],
  ['governance','N · Data Privacy, Security & BSS Governance',Lock],
  ['integration','O · Digital Integration',Network],
  ['declarations','P · Declaration & Authorisation',ShieldCheck],
  ['settings','Preferences',Settings],
] as const;

type Field = { label: string; value: string; sensitive?: boolean; note?: string; type?: string };
const isLocked = (field: Field) => (field.note ?? '').includes('System-calculated') || (field.note ?? '').includes('auto-generated') || (field.note ?? '').includes('Calculated');

export default function EmployerProfilePage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [tab, setTab] = useState('identity');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [licences, setLicences] = useState<ContractorLicence[]>(employer.licenses);
  // K · Contractor Management / L · Sites & QR / M · Worker Relations fields are stored
  // with the safety & governance questionnaire in the profile dataset; expose them under
  // their dedicated tabs so the BSS Employer profile spec sections are visible.
  const relocated: Record<string, string[]> = {
    'contractor-mgmt': ['Contractor Binding', 'Number of Active Contractors', 'Contractor Verification Required', 'Contractor Onboarding via BSS QR', 'Contractor Compliance Monitoring', 'Contractor Worker Deployment Tracking', 'Contractor Attendance Integration'],
    'sites-qr': ['Number of Establishments', 'Number of Active Sites', 'Site Registration in BSS', 'Site QR Generated', 'QR Worker Onboarding Enabled', 'QR Attendance Enabled', 'Gate Pass / Access Control', 'Emergency QR / SOS'],
    'worker-relations': ['Worker Grievance Mechanism', 'Grievance Officer', 'Internal Complaints Committee / POSH', 'Standing Orders / Service Rules', 'Worker Communication Channel'],
  };
  const safetyPool: Field[] = employer.profileSections['safety'] ?? [];
  const sourceFields: Field[] = employer.profileSections[tab] ?? [];
  const fields: Field[] = tab in relocated
    ? relocated[tab].map(label => safetyPool.find(field => field.label === label) ?? { label, value: '—', note: 'Recorded in the safety & governance questionnaire' })
    : sourceFields;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    const section = fields.map((field, index) => ({ ...field, value: isLocked(field) ? field.value : String(values.get(`field-${index}`) ?? '').trim() }));
    try {
      await mutate('profile', 'PATCH', { section: tab, fields: section });
      replaceEmployer({ ...employer, profileSections: { ...employer.profileSections, [tab]: section } });
      setEditing(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Profile could not be saved.'); }
    finally { setBusy(false); }
  }

  async function saveLicence(method: 'POST' | 'PATCH' | 'DELETE', body: { id?: string; [key: string]: unknown }): Promise<ContractorLicence | { id: string }> {
    const res = await mutate<{ success: boolean; data: ContractorLicence; deleted?: boolean; id?: string }>('licences', method, body);
    if (method === 'DELETE') {
      const id = String(res.id ?? '');
      setLicences(prev => prev.filter(r => r.id !== id));
      return { id };
    }
    const row = res.data;
    setLicences(prev => {
      const index = prev.findIndex(r => r.id === row.id);
      if (index >= 0) { const next = [...prev]; next[index] = row; return next; }
      return [...prev, row];
    });
    return row;
  }

  return <div className="space-y-6">
    <section className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-5">
      <div className="flex gap-4">
        <span className="w-16 h-16 rounded-xl bg-blue-50 text-blue-700 grid place-items-center text-2xl font-bold">{employer.identity.company.charAt(0)}</span>
        <div>
          <div className="flex gap-2 items-center"><h1 className="text-2xl font-bold">{employer.identity.company}</h1>{employer.identity.verified && <ShieldCheck className="text-green-700" size={20}/>}</div>
          <p className="font-mono text-xs text-gray-500 mt-1">{employer.identity.bssId}</p>
          <p className="text-sm text-gray-600 mt-2">{employer.identity.contact} · {employer.identity.email}</p>
        </div>
      </div>
      <div className="text-sm">
        <p><span className="text-gray-500">Authorised signatory:</span> {employer.identity.name}</p>
        <p className="mt-1"><span className="text-gray-500">Entity:</span> {employer.identity.entity}</p>
        <p className="mt-1"><span className="text-gray-500">Category:</span> Principal Employer</p>
      </div>
    </section>

    <div className="grid md:grid-cols-[260px_1fr] gap-6">
      <nav className="bg-white border border-gray-200 rounded-2xl p-2 h-fit max-h-[75vh] overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setEditing(false); setError(''); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${tab === id ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </nav>

      {tab === 'licences'
        ? <StatutoryLicences rows={licences} onSave={saveLicence} />
        : <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <header className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-4">
          <div><h2 className="font-semibold">{tabs.find(item => item[0] === tab)?.[1]}</h2><p className="text-[11px] text-gray-400 mt-0.5">{fields.length} field(s) · BSS_Employer.csv data dictionary</p></div>
          {fields.length > 0 && <button onClick={() => setEditing(value => !value)} className="text-sm text-blue-700 font-semibold">{editing ? 'Cancel' : 'Edit'}</button>}
        </header>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">
          {fields.map((field, index) => {
            const locked = isLocked(field);
            const labelLower = field.label.toLowerCase();
            const isDocField = field.label.includes('Certificate') || field.label.includes('Proof') || field.label.includes('Document') || field.label.includes('Licence') || field.label.includes('Licence');
            const isDateField = field.type === 'date' || labelLower.includes('date');

            let dropdownOptions: string[] | null = null;
            if (labelLower.includes('ownership type')) {
              dropdownOptions = ['Private Limited', 'Public Limited', 'Proprietorship', 'Partnership', 'LLP', 'Government Entity'];
            } else if (labelLower.includes('class of company')) {
              dropdownOptions = ['Company limited by Shares', 'Company limited by Guarantee', 'Unlimited Company'];
            } else if (labelLower.includes('industry / sector')) {
              dropdownOptions = ['Construction & Infrastructure', 'Manufacturing', 'Logistics & Supply Chain', 'Facility Management', 'IT & Services'];
            } else if (labelLower.includes('workforce model')) {
              dropdownOptions = ['Direct Hire', 'Contractor Deployed', 'Hybrid (Direct + Contractor)'];
            } else if (labelLower.includes('payroll frequency')) {
              dropdownOptions = ['Monthly', 'Fortnightly', 'Weekly', 'Daily'];
            } else if (labelLower.includes('wage period')) {
              dropdownOptions = ['1st to Last Day of Month', '26th to 25th of Month', '15th to 14th of Month'];
            } else if (labelLower.includes('attendance method')) {
              dropdownOptions = ['BSS QR Code / Mobile', 'Biometric Gate Access', 'RFID Smart Card', 'Manual Muster Roll'];
            } else if (labelLower.includes('onboarding method') || labelLower.includes('worker onboarding method')) {
              dropdownOptions = ['BSS Mobile Self-Onboarding', 'Contractor Assisted Import', 'Kiosk / Gate Assisted'];
            } else if (labelLower.includes('coverage') || labelLower.includes('insurance') || labelLower.includes('facility') || labelLower.includes('plan') || labelLower.includes('process') || labelLower.includes('management') || labelLower.includes('training') || labelLower.includes('induction')) {
              if (!labelLower.includes('date') && !labelLower.includes('officer') && !labelLower.includes('channel')) {
                dropdownOptions = ['Enabled / Covered', 'Not Covered / Not Applicable', 'Optional / On-Demand'];
              }
            }

            return <label key={field.label} className="text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">{field.label}{locked && <Lock size={11} className="text-gray-300"/>}{field.sensitive && <Lock size={11} className="text-amber-500"/>}</span>
              {editing && !field.sensitive && !locked ? (
                isDocField ? (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      name={`field-${index}`}
                      defaultValue={field.value}
                      placeholder="Enter document / reference number"
                      className="block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm normal-case text-gray-900 bg-white"
                    />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                ) : dropdownOptions ? (
                  <select
                    name={`field-${index}`}
                    defaultValue={field.value || dropdownOptions[0]}
                    className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm normal-case text-gray-900 bg-white"
                  >
                    {!field.value && <option value="">Select option</option>}
                    {dropdownOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={!isDateField}
                    type={isDateField ? 'date' : 'text'}
                    name={`field-${index}`}
                    defaultValue={field.value}
                    className="mt-1 block w-full h-10 border border-gray-200 rounded-lg px-3 text-sm normal-case text-gray-900 bg-white"
                  />
                )
              ) : (
                <span className="mt-1 block text-sm normal-case text-gray-900 font-medium">{field.value || '—'}</span>
              )}
              {field.note && <span className="mt-1 block text-[10px] font-normal text-gray-400">{field.note}</span>}
            </label>;
          })}
          {!fields.length && <p className="sm:col-span-2 text-sm text-gray-500 py-10 text-center">No records were returned for this section.</p>}
          {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
          {editing && <div className="sm:col-span-2 flex justify-end"><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Save changes'}</button></div>}
        </form>
        </section>}
    </div>
  </div>;
}
