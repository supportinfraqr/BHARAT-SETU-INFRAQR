"use client";
import { useState } from 'react';
import { Building2, CheckCircle2, CreditCard, FileSignature, FileText, Landmark, Link2, Lock, MapPin, Phone, ShieldCheck, Users } from 'lucide-react';
import StatutoryLicences from '@/components/portal/StatutoryLicences';
import GstVerifyCard from '@/components/gst/GstVerifyCard';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorLicence } from '@/types/portal';

const tabs = [
  ['basic', 'Basic info', Building2],
  ['registration', 'Registration', ShieldCheck],
  ['directors', 'Directors', Users],
  ['contact', 'Contact Persons', Phone],
  ['financial', 'Financial', CreditCard],
  ['service', 'Service profile', MapPin],
  ['principal', 'Principal Employer & Site', Link2],
  ['licences', 'Registrations & Licences', Landmark],
  ['documents', 'Documents', FileText],
  ['declarations', 'Declarations', CheckCircle2],
  ['undertaking', 'Undertaking', FileSignature],
] as const;

type Field = { label: string; value: string; sensitive?: boolean; note?: string; type?: string };
// BSS IDs and other system-derived values are frozen — never editable on the client.
const isLocked = (field: Field) => (field.note ?? '').includes('System-calculated') || (field.note ?? '').includes('auto-generated') || (field.note ?? '').includes('Calculated');

export default function ContractorProfilePage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const [tab, setTab] = useState('basic');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [licences, setLicences] = useState<ContractorLicence[]>(contractor.licenses);
  const fields = contractor.profileSections[tab] ?? [];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    const values = new FormData(e.currentTarget);
    const section = fields.map((field, index) => ({ ...field, value: isLocked(field) ? field.value : String(values.get(`field-${index}`) ?? '').trim() }));
    try {
      await mutate('profile', 'PATCH', { section: tab, fields: section });
      replaceContractor({ ...contractor, profileSections: { ...contractor.profileSections, [tab]: section } });
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

  return (
    <div className="space-y-6">
      <GstVerifyCard role="contractor" />
      <section className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-5">
        <div className="flex gap-4">
          <span className="w-16 h-16 rounded-xl bg-blue-50 text-blue-700 grid place-items-center text-2xl font-bold">{contractor.identity.company.charAt(0)}</span>
          <div>
            <div className="flex gap-2 items-center"><h1 className="text-2xl font-bold">{contractor.identity.company}</h1>{contractor.identity.verified && <ShieldCheck className="text-green-700" size={20}/>}</div>
            <p className="font-mono text-xs text-gray-500 mt-1">{contractor.identity.bssId}</p>
            <p className="text-sm text-gray-600 mt-2">{contractor.identity.contact} · {contractor.identity.email}</p>
          </div>
        </div>
        <div className="text-sm">
          <p><span className="text-gray-500">Authorised signatory:</span> {contractor.identity.name}</p>
          <p className="mt-1"><span className="text-gray-500">Rating:</span> {contractor.identity.rating.toFixed(1)}</p>
        </div>
      </section>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <nav className="bg-white border border-gray-200 rounded-2xl p-2 h-fit overflow-x-auto space-y-0.5">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setEditing(false); setError(''); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${tab === id ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="leading-snug">{label}</span>
            </button>
          ))}
        </nav>

        {tab === 'licences' ? (
          <StatutoryLicences rows={licences} onSave={saveLicence} />
        ) : (
          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <header className="flex justify-between border-b border-gray-100 pb-4">
              <h2 className="font-semibold">{tabs.find(item => item[0] === tab)?.[1]}</h2>
              {fields.length > 0 && <button onClick={() => setEditing(v => !v)} className="text-sm text-blue-700 font-semibold">{editing ? 'Cancel' : 'Edit'}</button>}
            </header>
            <form onSubmit={save} className="grid sm:grid-cols-2 gap-6 mt-6">
              {fields.map((field, index) => {
                const locked = isLocked(field);
                const labelLower = field.label.toLowerCase();
                const isDocField = tab === 'documents' || labelLower.includes('document') || labelLower.includes('certificate') || labelLower.includes('licence') || labelLower.includes('proof');
                const isDateField = field.type === 'date' || labelLower.includes('date');
                
                // Define dropdown options based on Excel spec
                let dropdownOptions: string[] | null = null;
                if (labelLower.includes('payroll method')) {
                  dropdownOptions = ['BSS Payroll / Direct Transfer', 'External Payroll System', 'Bank Transfer', 'Manual Cash / Voucher'];
                } else if (labelLower.includes('attendance method')) {
                  dropdownOptions = ['BSS QR Code / Mobile', 'Biometric Device', 'RFID / Smart Card', 'Manual Muster Roll'];
                } else if (labelLower.includes('onboarding method')) {
                  dropdownOptions = ['BSS Mobile Self-Onboarding', 'Contractor Bulk Import', 'Kiosk / Gate Assisted'];
                } else if (labelLower.includes('consent for data processing')) {
                  dropdownOptions = ['Yes', 'No'];
                } else if (labelLower.includes('contractor type')) {
                  dropdownOptions = ['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP', 'Individual'];
                } else if (labelLower.includes('entity constitution')) {
                  dropdownOptions = ['Proprietorship', 'Partnership Firm', 'Private Limited Company', 'Public Limited Company', 'Limited Liability Partnership (LLP)'];
                } else if (labelLower.includes('annual turnover band')) {
                  dropdownOptions = ['Below ₹50 Lakhs', '₹50 Lakhs - ₹2 Crores', '₹2 Crores - ₹10 Crores', 'Above ₹10 Crores'];
                } else if (labelLower.includes('contractor risk rating')) {
                  dropdownOptions = ['Low Risk', 'Medium Risk', 'High Risk'];
                } else if (labelLower.includes('registration source')) {
                  dropdownOptions = ['Self Portal', 'BSS Assisted', 'Employer Invited', 'Bulk Import'];
                } else if (labelLower.includes('listed on stock exchange')) {
                  dropdownOptions = ['Yes', 'No'];
                } else if (labelLower.includes('company status')) {
                  dropdownOptions = ['Active', 'Strike Off', 'Dormant', 'Under Liquidation'];
                } else if (labelLower.includes('company sub category')) {
                  dropdownOptions = ['Government Company', 'Non-Government Company', 'One Person Company', 'Small Company'];
                } else if (labelLower.includes('company category')) {
                  dropdownOptions = ['Company Limited by Shares', 'Company Limited by Guarantee', 'Unlimited Company'];
                }

                return (
                  <label key={field.label} className="text-xs font-semibold text-gray-500 uppercase">
                    <span className="flex items-center gap-1.5">{field.label}{locked && <Lock size={11} className="text-gray-300" />}</span>
                    {editing && !field.sensitive && !locked ? (
                      isDocField ? (
                        <div className="mt-1 space-y-2">
                          <input
                            type="text"
                            name={`field-${index}`}
                            defaultValue={field.value}
                            placeholder="Enter document number / reference"
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
                  </label>
                );
              })}
              {!fields.length && <p className="sm:col-span-2 text-sm text-gray-500 py-10 text-center">No records were returned for this section.</p>}
              {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
              {editing && <div className="sm:col-span-2 flex justify-end"><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">{busy ? 'Saving…' : 'Save changes'}</button></div>}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}