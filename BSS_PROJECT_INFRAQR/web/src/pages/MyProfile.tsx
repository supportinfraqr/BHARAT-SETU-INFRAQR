import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrMgmtApi } from '../api/endpoints';
import './QRManagement.css';

interface FieldDef { key: string; label: string; type?: string; textarea?: boolean }

const FIELDS: Record<string, FieldDef[]> = {
  employer: [
    { key: 'name', label: 'Company Name' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'contact_mobile', label: 'Contact Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'pan_no', label: 'PAN Number' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'cin', label: 'CIN' },
    { key: 'lin', label: 'LIN' },
    { key: 'registration_type', label: 'Registration Type' },
    { key: 'industry', label: 'Industry' },
    { key: 'state', label: 'State' },
    { key: 'city', label: 'City' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'bank_details', label: 'Bank Details', textarea: true },
    { key: 'address', label: 'Address', textarea: true },
  ],
  contractor: [
    { key: 'name', label: 'Contractor Name' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'contact_mobile', label: 'Contact Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'pan_no', label: 'PAN Number' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'registration_type', label: 'Registration Type' },
    { key: 'industry', label: 'Industry' },
    { key: 'site_name', label: 'Site Name' },
    { key: 'state', label: 'State' },
    { key: 'city', label: 'City' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'bank_details', label: 'Bank Details', textarea: true },
    { key: 'address', label: 'Address', textarea: true },
  ],
  worker: [
    { key: 'full_name', label: 'Full Name' },
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'alternative_mobile', label: 'Alternative Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'aadhaar_no', label: 'Aadhaar Number' },
    { key: 'pan_no', label: 'PAN Number' },
    { key: 'father_name', label: "Father's Name" },
    { key: 'gender', label: 'Gender' },
    { key: 'marital_status', label: 'Marital Status' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Department' },
    { key: 'state', label: 'State' },
    { key: 'city', label: 'City' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'bank_account', label: 'Bank Account No.' },
    { key: 'bank_ifsc', label: 'Bank IFSC' },
    { key: 'previous_uan', label: 'Previous UAN' },
    { key: 'previous_esi', label: 'Previous ESIC' },
    { key: 'pf_account', label: 'PF Account' },
    { key: 'gross_salary', label: 'Gross Salary' },
    { key: 'doj', label: 'Date of Joining' },
    { key: 'leaving_date', label: 'Leaving Date' },
    { key: 'present_address', label: 'Present Address', textarea: true },
    { key: 'permanent_address', label: 'Permanent Address', textarea: true },
  ],
};

export default function MyProfile() {
  const [entity, setEntity] = useState<string>('');
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await qrMgmtApi.myProfile();
      const data = res.data?.Data;
      setEntity(data?.entity || '');
      setForm(data?.profile || {});
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Could not load profile');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await qrMgmtApi.updateProfile(form);
      setForm(res.data?.Data || form);
      setMsg('Profile saved.');
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const fields = FIELDS[entity] || [];
  const title = entity === 'employer' ? 'My Employer Profile' : entity === 'contractor' ? 'My Contractor Profile' : 'My Worker Profile';

  return (
    <AppLayout title="My Profile">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}
        <div className="mgmt-toolbar">
          <h3>{title}</h3>
          <button className="btn-primary" onClick={save} disabled={saving || busy}>{saving ? 'Saving...' : 'Save'}</button>
        </div>

        <div className="profile-form">
          {fields.map((f) => (
            <div className="profile-field" key={f.key}>
              <label>{f.label}</label>
              {f.textarea ? (
                <textarea
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  rows={2}
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          {fields.length === 0 && <div className="mgmt-empty">No profile linked to this account.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
