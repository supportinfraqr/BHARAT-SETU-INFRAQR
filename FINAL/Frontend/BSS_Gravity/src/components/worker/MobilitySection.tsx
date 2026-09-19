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
import { INDIA_CITY_STATES, citiesForState } from '@/data/indiaCities';

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
    currentAddress: { line: worker.address.current, state: worker.address.currentState, district: worker.address.currentDistrict, city: worker.address.currentCity, locality: worker.address.currentLocality, pin: worker.address.currentPin },
    permanentAddress: { line: worker.address.permanent, state: worker.address.permanentState, district: worker.address.permanentDistrict, city: worker.address.permanentCity, locality: worker.address.permanentLocality, pin: worker.address.permanentPin },
    sameAsPermanent: Boolean(worker.address.sameAsPermanent),
  };
}

export const MobilitySection = forwardRef<MobilitySectionHandle, Props>(function MobilitySection(
  { worker, updateWorker, onSaved, onSavingChange }, ref,
) {
  const [draft, setDraft] = useState(() => fromWorker(worker));
  const [reference, setReference] = useState<GeographyReference>({});
  const [sameAsPermanent, setSameAsPermanent] = useState(() => Boolean(worker.address.sameAsPermanent));
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
    setDraft(current => ({ ...current, [kind]: value }));
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
      setSameAsPermanent(Boolean(data.sameAsPermanent));
      updateWorker({
        contact: { ...worker.contact, email: data.email, mobile: data.mobile, alternateMobile: data.alternateMobile },
        address: {
          current: data.currentAddress.line,
          currentState: data.currentAddress.state,
          currentDistrict: data.currentAddress.district,
          currentCity: data.currentAddress.city,
          currentLocality: data.currentAddress.locality,
          currentPin: data.currentAddress.pin,
          permanent: data.permanentAddress.line,
          permanentState: data.permanentAddress.state,
          permanentDistrict: data.permanentAddress.district,
          permanentCity: data.permanentAddress.city,
          permanentLocality: data.permanentAddress.locality,
          permanentPin: data.permanentAddress.pin,
          migrant: data.migrant,
          migrationType: data.migrationType,
          sameAsPermanent: Boolean(data.sameAsPermanent),
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
        <div className="flex"><span className="bg-[#F5F5F7] border border-black/10 border-r-0 rounded-l-xl px-4 py-3 text-sm font-semibold text-[#86868B]">+91</span><input type="tel" inputMode="numeric" readOnly value={draft.mobile} className={`${inputClass} rounded-l-none bg-[#F5F5F7] text-gray-500 cursor-not-allowed`} /></div>
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
      <div>
        <div className="flex justify-between items-start gap-3 mb-4"><h3 className="text-[15px] font-semibold text-[#1D1D1F]">Current Address</h3><label className="flex items-center gap-2 text-xs text-[#68686d] cursor-pointer"><input type="checkbox" checked={sameAsPermanent} onChange={event => { const checked = event.target.checked; setSameAsPermanent(checked); setDraft(current => ({ ...current, sameAsPermanent: checked, currentAddress: checked ? { ...current.permanentAddress } : current.currentAddress })); }}/><span>Same as permanent</span></label></div>
        <AddressEditor kind="currentAddress" prefix="Current" address={draft.currentAddress} reference={reference} disabled={sameAsPermanent} error={errors['currentAddress.line'] || errors['currentAddress.location']} onChange={value => updateAddress('currentAddress', value)}/>
      </div>
      <AddressEditor title="Permanent Address" kind="permanentAddress" prefix="Permanent" address={draft.permanentAddress} reference={reference} error={errors['permanentAddress.line'] || errors['permanentAddress.location']} onChange={value => updateAddress('permanentAddress', value)}/>
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

function AddressEditor({ title, kind, prefix = '', address, reference, disabled = false, readOnly = false, error, onChange }: { title?: string; kind: string; prefix?: string; address: MobilityAddress; reference: GeographyReference; disabled?: boolean; readOnly?: boolean; error?: string; onChange: (value: MobilityAddress) => void }) {
  const label = (name: string) => prefix ? `${prefix} ${name}` : name;
  const states = [...new Set([...Object.keys(reference), ...INDIA_CITY_STATES])];
  const districts = Object.keys(reference[address.state] || {});
  const places = reference[address.state]?.[address.district] || [];
  // Prefer the full bundled state->cities list; fall back to the reference data.
  const bundledCities = citiesForState(address.state);
  const cities = bundledCities.length ? bundledCities : [...new Set(Object.values(reference[address.state] || {}).flatMap(list => list.map(place => place.city)))];
  const pins = places.find(place => place.city === address.city)?.pins || [];
  const id = kind.replace('Address', '');
  const frozen = `${inputClass} bg-[#F5F5F7] text-gray-500 cursor-not-allowed`;
  const selectState = (state: string) => { const district = Object.keys(reference[state] || {})[0] || ''; onChange({ ...address, state, district, city: '', pin: '' }); };
  const selectDistrict = (district: string) => { onChange({ ...address, district }); };
  const resolvePin = async () => {
    if (!/^\d{6}$/.test(address.pin)) return;
    const response = await fetch(`/api/geography?pin=${encodeURIComponent(address.pin)}`);
    const result = await response.json() as { data?: Omit<MobilityAddress, 'line'> };
    if (response.ok && result.data) onChange({ ...address, ...result.data });
  };
  return <div className="space-y-4">
    {title && <h3 className="text-[15px] font-semibold text-[#1D1D1F]">{title}{readOnly && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-[#0066CC]">· Aadhaar seeded</span>}</h3>}
    <Field label="Address Line">{readOnly ? <textarea rows={2} readOnly value={address.line} placeholder="—" className={`${frozen} resize-none`}/> : <textarea rows={2} value={address.line} onChange={event => onChange({ ...address, line: event.target.value })} disabled={disabled} className={`${inputClass} resize-none`}/>}</Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={label('State')}>{readOnly ? <input readOnly value={address.state} placeholder="—" className={frozen}/> : <><input list={`${id}-states`} value={address.state} onChange={event => selectState(event.target.value)} disabled={disabled} placeholder="Type or select state" className={inputClass}/><datalist id={`${id}-states`}>{states.map(state => <option key={state} value={state}/>)}</datalist></>}</Field>
      <Field label={label('District')}>{readOnly ? <input readOnly value={address.district} placeholder="—" className={frozen}/> : <><input list={`${id}-districts`} value={address.district} onChange={event => selectDistrict(event.target.value)} disabled={disabled} placeholder="Type or select district" className={inputClass}/><datalist id={`${id}-districts`}>{districts.map(district => <option key={district} value={district}/>)}</datalist></>}</Field>
      <Field label={label('City')}>{readOnly ? <input readOnly value={address.city} placeholder="—" className={frozen}/> : <><input list={`${id}-cities`} value={address.city} onChange={event => onChange({ ...address, city: event.target.value })} disabled={disabled} placeholder="Type or select city" className={inputClass}/><datalist id={`${id}-cities`}>{cities.map(city => <option key={city} value={city}/>)}</datalist></>}</Field>
      <Field label={label('Locality / Area')}>{readOnly ? <input readOnly value={address.locality} placeholder="—" className={frozen}/> : <input value={address.locality} onChange={event => onChange({ ...address, locality: event.target.value })} disabled={disabled} placeholder="Locality / area / mohalla" className={inputClass}/>}</Field>
      <Field label={label('PIN Code')}>{readOnly ? <input readOnly value={address.pin} placeholder="—" className={frozen}/> : <div className="relative"><input list={`${id}-pins`} inputMode="numeric" value={address.pin} onChange={event => onChange({ ...address, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })} onBlur={resolvePin} disabled={disabled} className={`${inputClass} pr-10`}/><RefreshCw size={15} className="absolute right-3.5 top-3.5 text-gray-400"/><datalist id={`${id}-pins`}>{pins.map(pin => <option key={pin} value={pin}/>)}</datalist></div>}</Field>
    </div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}

function Field({ label, icon, required, error, children }: { label: string; icon?: React.ReactNode; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div><label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">{icon}{label}{required && <span className="text-[#FF3B30]">*</span>}</label>{children}{error && <p role="alert" className="text-xs text-red-600 mt-1.5">{error}</p>}</div>;
}
