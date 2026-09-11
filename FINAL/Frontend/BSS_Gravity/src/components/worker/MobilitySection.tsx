"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Mail, MapPin, Phone, RefreshCw } from 'lucide-react';
import type { WorkerRecord } from '@/contexts/WorkerContext';
import {
  deriveMigrationType,
  type GeographyReference,
  type MobilityAddress,
  type MobilityPayload,
} from '@/lib/mobility';

export type MobilitySectionHandle = { save: () => Promise<boolean> };

type Props = {
  worker: WorkerRecord;
  updateWorker: (patch: Partial<WorkerRecord>) => void;
  onSaved: () => void;
  onSavingChange: (saving: boolean) => void;
};

const inputClass = 'w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-[14px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] disabled:bg-[#F5F5F7] disabled:text-gray-500';

function fromWorker(worker: WorkerRecord): MobilityPayload {
  return {
    email: worker.contact.email,
    mobile: worker.contact.mobile,
    alternateMobile: worker.contact.alternateMobile,
    currentAddress: { line: worker.address.current, state: worker.address.currentState, district: worker.address.currentDistrict, city: worker.address.currentCity, pin: worker.address.currentPin },
    permanentAddress: { line: worker.address.permanent, state: worker.address.permanentState, district: worker.address.permanentDistrict, city: worker.address.permanentCity, pin: worker.address.permanentPin },
  };
}

export const MobilitySection = forwardRef<MobilitySectionHandle, Props>(function MobilitySection(
  { worker, updateWorker, onSaved, onSavingChange }, ref,
) {
  const [draft, setDraft] = useState(() => fromWorker(worker));
  const [reference, setReference] = useState<GeographyReference>({});
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/geography')
      .then(async response => {
        const result = await response.json() as { data?: GeographyReference; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error || 'Geographic reference could not be loaded.');
        if (active) setReference(result.data);
      })
      .catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Geographic reference could not be loaded.'); });
    return () => { active = false; };
  }, []);

  const updateAddress = (kind: 'currentAddress' | 'permanentAddress', value: MobilityAddress) => {
    setDraft(current => {
      const next = { ...current, [kind]: value };
      if (kind === 'currentAddress' && sameAsCurrent) next.permanentAddress = { ...value };
      return next;
    });
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(kind))));
  };

  const save = async () => {
    onSavingChange(true);
    setErrors({});
    setSaveError('');
    try {
      const response = await fetch('/api/worker/profile/mobility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as {
        error?: string;
        fieldErrors?: Record<string, string>;
        data?: MobilityPayload & { migrationType: string; migrant: boolean };
      };
      if (!response.ok || !result.data) {
        setErrors(result.fieldErrors || {});
        setSaveError(result.error || 'Mobility information could not be saved.');
        return false;
      }
      const data = result.data;
      setDraft(data);
      updateWorker({
        contact: { ...worker.contact, email: data.email, mobile: data.mobile, alternateMobile: data.alternateMobile },
        address: {
          current: data.currentAddress.line,
          currentState: data.currentAddress.state,
          currentDistrict: data.currentAddress.district,
          currentCity: data.currentAddress.city,
          currentPin: data.currentAddress.pin,
          permanent: data.permanentAddress.line,
          permanentState: data.permanentAddress.state,
          permanentDistrict: data.permanentAddress.district,
          permanentCity: data.permanentAddress.city,
          permanentPin: data.permanentAddress.pin,
          migrant: data.migrant,
          migrationType: data.migrationType,
        },
      });
      onSaved();
      return true;
    } catch {
      setSaveError('Unable to reach the profile service. Check your connection and try again.');
      return false;
    } finally {
      onSavingChange(false);
    }
  };

  useImperativeHandle(ref, () => ({ save }));

  const migrationType = deriveMigrationType(
    draft.permanentAddress.state,
    draft.permanentAddress.district,
    draft.currentAddress.state,
    draft.currentAddress.district,
  );

  return <div className="space-y-8 animate-in fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
      <Field label="Mobile Number" icon={<Phone size={14}/>} required error={errors.mobile}>
        <div className="flex"><span className="bg-[#F5F5F7] border border-black/10 border-r-0 rounded-l-xl px-4 py-3 text-sm font-semibold text-[#86868B]">+91</span><input type="tel" inputMode="numeric" value={draft.mobile} onChange={event => setDraft(current => ({ ...current, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} className={`${inputClass} rounded-l-none`} /></div>
      </Field>
      <Field label="Alternate Mobile Number" icon={<Phone size={14}/>} error={errors.alternateMobile}>
        <input type="tel" inputMode="numeric" value={draft.alternateMobile} onChange={event => setDraft(current => ({ ...current, alternateMobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="Optional" className={inputClass}/>
      </Field>
      <Field label="Email ID" icon={<Mail size={14}/>} error={errors.email}>
        <input type="email" value={draft.email} onChange={event => { setDraft(current => ({ ...current, email: event.target.value })); setErrors(current => ({ ...current, email: '' })); }} onBlur={() => setDraft(current => ({ ...current, email: current.email.trim() }))} placeholder="Optional" aria-invalid={Boolean(errors.email)} className={inputClass}/>
      </Field>
    </div>

    {loadError && <p role="alert" className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{loadError} Reload the page before editing an address.</p>}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-black/5">
      <AddressEditor title="Current Address" kind="currentAddress" prefix="Current" address={draft.currentAddress} reference={reference} error={errors['currentAddress.line'] || errors['currentAddress.location']} onChange={value => updateAddress('currentAddress', value)}/>
      <div>
        <div className="flex justify-between items-start gap-3 mb-4"><h3 className="text-[15px] font-semibold text-[#1D1D1F]">Permanent Address</h3><label className="flex items-center gap-2 text-xs text-[#68686d] cursor-pointer"><input type="checkbox" checked={sameAsCurrent} onChange={event => { const checked = event.target.checked; setSameAsCurrent(checked); if (checked) updateAddress('permanentAddress', { ...draft.currentAddress }); }}/><span>Same as current</span></label></div>
        <AddressEditor kind="permanentAddress" prefix="Permanent" address={draft.permanentAddress} reference={reference} disabled={sameAsCurrent} error={errors['permanentAddress.line'] || errors['permanentAddress.location']} onChange={value => updateAddress('permanentAddress', value)}/>
      </div>
    </div>

    <div className="pt-6 border-t border-black/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        <div>
          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Migrant Worker</label>
          <div className="flex items-center gap-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-3">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${worker.address.migrant ? 'bg-[#FFF8F0] text-[#F47A32]' : 'bg-[#EDF8F2] text-[#2F9E67]'}`}>{worker.address.migrant ? 'Yes — migrant worker' : 'No'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Determined from your permanent/home and current work location.</p>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">Migration Type · system calculated</label>
          <div className="relative"><MapPin size={17} className="absolute left-4 top-3.5 text-[#0066CC]"/><input readOnly value={migrationType} className="w-full bg-[#F5F5F7] border border-transparent rounded-xl pl-11 pr-4 py-3 text-[14px] font-semibold text-[#1D1D1F]"/></div>
          <p className="text-xs text-gray-500 mt-2">Derived automatically from the permanent/home and current work State and District. It cannot be selected manually.</p>
        </div>
      </div>
    </div>
    {saveError && <p role="alert" className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{saveError}</p>}
  </div>;
});

function AddressEditor({ title, kind, prefix = '', address, reference, disabled = false, error, onChange }: { title?: string; kind: string; prefix?: string; address: MobilityAddress; reference: GeographyReference; disabled?: boolean; error?: string; onChange: (value: MobilityAddress) => void }) {
  const label = (name: string) => prefix ? `${prefix} ${name}` : name;
  const states = Object.keys(reference);
  const districts = Object.keys(reference[address.state] || {});
  const places = reference[address.state]?.[address.district] || [];
  const cities = [...new Set(places.map(place => place.city))];
  const pins = places.find(place => place.city === address.city)?.pins || [];
  const id = kind.replace('Address', '');
  const selectState = (state: string) => { const district = Object.keys(reference[state] || {})[0] || ''; const place = reference[state]?.[district]?.[0]; onChange({ ...address, state, district, city: place?.city || '', pin: place?.pins[0] || '' }); };
  const selectDistrict = (district: string) => { const place = reference[address.state]?.[district]?.[0]; onChange({ ...address, district, city: place?.city || '', pin: place?.pins[0] || '' }); };
  const selectCity = (city: string) => { const place = places.find(entry => entry.city === city); onChange({ ...address, city, pin: place?.pins[0] || '' }); };
  const resolvePin = async () => {
    if (!/^\d{6}$/.test(address.pin)) return;
    const response = await fetch(`/api/geography?pin=${encodeURIComponent(address.pin)}`);
    const result = await response.json() as { data?: Omit<MobilityAddress, 'line'> };
    if (response.ok && result.data) onChange({ ...address, ...result.data });
  };
  return <div className="space-y-4">
    {title && <h3 className="text-[15px] font-semibold text-[#1D1D1F]">{title}</h3>}
    <Field label="Address Line"><textarea rows={2} value={address.line} onChange={event => onChange({ ...address, line: event.target.value })} disabled={disabled} className={`${inputClass} resize-none`}/></Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={label('State')}><select value={address.state} onChange={event => selectState(event.target.value)} disabled={disabled || !states.length} className={inputClass}>{!states.length ? <option value="">Loading…</option> : <><option value="">Select state</option>{states.map(state => <option key={state}>{state}</option>)}</>}</select></Field>
      <Field label={label('District')}><select value={address.district} onChange={event => selectDistrict(event.target.value)} disabled={disabled || !districts.length} className={inputClass}><option value="">Select district</option>{districts.map(district => <option key={district}>{district}</option>)}</select></Field>
      <Field label={label('City')}><select value={address.city} onChange={event => selectCity(event.target.value)} disabled={disabled || !cities.length} className={inputClass}><option value="">Select city</option>{cities.map(city => <option key={city}>{city}</option>)}</select></Field>
      <Field label={label('PIN Code')}><div className="relative"><input list={`${id}-pins`} inputMode="numeric" value={address.pin} onChange={event => onChange({ ...address, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })} onBlur={resolvePin} disabled={disabled} className={`${inputClass} pr-10`}/><RefreshCw size={15} className="absolute right-3.5 top-3.5 text-gray-400"/><datalist id={`${id}-pins`}>{pins.map(pin => <option key={pin} value={pin}/>)}</datalist></div></Field>
    </div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}

function Field({ label, icon, required, error, children }: { label: string; icon?: React.ReactNode; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div><label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">{icon}{label}{required && <span className="text-[#FF3B30]">*</span>}</label>{children}{error && <p role="alert" className="text-xs text-red-600 mt-1.5">{error}</p>}</div>;
}
