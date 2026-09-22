"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { MASTER_BY_KEY, type AdminField, type AdminRow, type MasterConfig } from '@/data/adminMasters';

const input = 'mt-1 w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';
const inputArea = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20';

export default function MasterCrudPage({ configKey }: { configKey: string }) {
  const config: MasterConfig = MASTER_BY_KEY[configKey];
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/masters/${encodeURIComponent(configKey)}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:AdminRow[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Records could not be loaded.');
      setRows(body.rows ?? []);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Records could not be loaded.'); }
    finally { setLoading(false); }
  }, [configKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
  useEffect(() => { void load(); }, [load]);

  const label = (row: AdminRow) => String(row.name ?? row.employer ?? row.username ?? row.state ?? row.id);

  const columns: DataColumn<AdminRow>[] = config.columns.map(col => ({ id: col.id, header: col.header, value: col.value, render: col.render }));
  if (!config.readOnly) {
    columns.push({ id: 'actions', header: 'Actions', filterable: false, value: r => String(r.id), render: r => (
      <div className="flex gap-1 items-center">
        <button onClick={() => { setEditing(r); setModal('edit'); setError(''); }} aria-label="Edit" className="w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-50"><Pencil size={14}/></button>
        {config.statusField && <button onClick={() => void toggleStatus(r)} aria-label="Toggle status" className="w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50" title={String(r[config.statusField]) === 'Active' ? 'Deactivate' : 'Activate'}>{String(r[config.statusField]) === 'Active' ? <CheckCircle2 size={14}/> : <ShieldCheck size={14}/>}</button>}
        {config.canDelete && <button onClick={() => setDeleteTarget(r)} aria-label="Delete" className="w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>}
      </div>
    ) });
  }

  async function toggleStatus(row: AdminRow) {
    const field = config.statusField!;
    const next = String(row[field]) === 'Active' ? 'Inactive' : 'Active';
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/masters/${encodeURIComponent(configKey)}/${row.id}`, {
        method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ [field]: next }),
      });
      const body = await response.json().catch(() => ({})) as { row?:AdminRow; error?:string };
      if (!response.ok || !body.row) throw new Error(body.error ?? 'The status could not be changed.');
      setRows(current => current.map(r => r.id === row.id ? body.row! : r));
      setNotice(`${config.title}: "${label(row)}" ${next.toLowerCase()}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The status could not be changed.'); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    const record: AdminRow = {};
    const files: File[] = [];
    config.fields.forEach(field => {
      const raw = values.get(field.name);
      if (field.type === 'file') {
        // File inputs are uploaded separately (multipart), not in the JSON body.
        if (raw instanceof File && raw.size > 0) files.push(raw);
        return;
      }
      record[field.name] = field.type === 'number' ? Number(raw || 0) : String(raw ?? '');
    });
    const isEdit = modal === 'edit' && editing;
    // On add, required fields must be filled. On edit the row already exists, so
    // blank values are fine (e.g. an empty password means "keep the current one")
    // — the backend owns validation there.
    if (modal === 'add') {
      const missing = config.fields.filter(field => field.type !== 'file' && field.required && !String(record[field.name] ?? '').trim());
      if (missing.length) {
        setError(`Complete the required fields: ${missing.map(f => f.label).join(', ')}.`);
        setBusy(false);
        return;
      }
    }
    try {
      const response = await fetch(`/api/admin/masters/${encodeURIComponent(configKey)}${isEdit ? `/${editing!.id}` : ''}`, {
        method:isEdit ? 'PATCH' : 'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(record),
      });
      const body = await response.json().catch(() => ({})) as { row?:AdminRow; error?:string };
      if (!response.ok || !body.row) throw new Error(body.error ?? 'The record could not be saved.');
      let saved: AdminRow = body.row;
      // Upload any attached file(s) to the record's file endpoint.
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const upload = await fetch(`/api/admin/masters/${encodeURIComponent(configKey)}/${saved.id}/file`, { method:'POST', body: fd });
        const uploadBody = await upload.json().catch(() => ({})) as { row?:AdminRow; error?:string };
        if (!upload.ok || uploadBody.error) throw new Error(uploadBody.error ?? 'The file could not be uploaded.');
        if (uploadBody.row) saved = uploadBody.row;
      }
      setRows(current => isEdit ? current.map(r => r.id === editing!.id ? saved : r) : [saved, ...current]);
      setNotice(`${config.title}: record ${isEdit ? 'updated' : 'created'}.`);
      setModal(null); setEditing(null);
    } catch (reason) {
      // A rejected save (e.g. a duplicate) closes the form and surfaces the
      // message on the page instead of keeping the modal open.
      setError(reason instanceof Error ? reason.message : 'The record could not be saved.');
      setModal(null); setEditing(null);
    }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/masters/${encodeURIComponent(configKey)}/${deleteTarget.id}`, { method:'DELETE' });
      const body = await response.json().catch(() => ({})) as { error?:string };
      if (!response.ok) throw new Error(body.error ?? 'The record could not be deleted.');
      setRows(current => current.filter(r => r.id !== deleteTarget.id));
      setNotice(`${config.title}: "${label(deleteTarget)}" deleted.`);
      setDeleteTarget(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The record could not be deleted.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">{config.title}</h1><p className="text-sm text-gray-500 mt-1">{config.description}</p></div>
      {!config.readOnly && <button onClick={() => { setModal('add'); setEditing(null); setError(''); }} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black"><Plus size={16}/>Add record</button>}
    </header>

    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading records…</p>
      : <EnterpriseDataTable title={config.title} rows={rows} columns={columns} rowKey={r => String(r.id)} filename={`bss-admin-${config.key}`}/>}

    {/* Add / Edit modal */}
    {modal && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" aria-label={modal === 'edit' ? 'Edit record' : 'Add record'} className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex justify-between items-center"><div><h2 className="font-semibold text-sm">{modal === 'edit' ? 'Edit record' : `Add ${config.title}`}</h2><p className="text-xs text-gray-500 mt-1">Fields follow the BSS Admin master schema.</p></div><button onClick={() => setModal(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button></header>
      <form onSubmit={save} noValidate className="p-5 grid sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
        {config.fields.map(field => <Field key={field.name} field={field} isEdit={modal === 'edit'} value={modal === 'edit' ? editing?.[field.name] : config.initial?.[field.name]}/>)}
        {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">{busy ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Save record'}</button></div>
      </form>
    </section></div>}

    {/* Delete confirmation */}
    {deleteTarget && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4"><section role="dialog" aria-modal="true" aria-label="Confirm delete" className="w-full max-w-md bg-white rounded-2xl p-6">
      <div className="flex items-start gap-3"><span className="w-10 h-10 rounded-lg bg-red-50 text-red-600 grid place-items-center flex-shrink-0"><Trash2 size={18}/></span><div><h2 className="font-semibold text-gray-950">Delete this record?</h2><p className="text-sm text-gray-500 mt-1">&ldquo;{label(deleteTarget)}&rdquo; will be permanently removed. Deletion is irreversible and will be recorded in the audit trail.</p></div></div>
      <div className="flex justify-end gap-2 mt-5"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={() => void confirmDelete()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">{busy ? 'Deleting…' : 'Delete'}</button></div>
    </section></div>}

    <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><ShieldCheck size={13}/>Every create / update / deactivate / delete action is visible in the Activity Report with actor, role and timestamp.</p>
  </div>;
}

function Field({ field, value, isEdit }: { field: AdminField; value: unknown; isEdit?: boolean }) {
  const base = field.type === 'textarea' ? inputArea : input;
  const isPassword = field.name === 'password';
  // A blank password field on edit means "keep the current password".
  const placeholder = isPassword && isEdit ? 'Leave blank to keep the current password' : field.placeholder;
  if (field.type === 'select') {
    return <label className="text-xs font-semibold text-gray-700">{field.label}<select name={field.name} required={field.required} defaultValue={String(value ?? '')} className={base + ' bg-white'}>{!field.noPlaceholder && <option value="">Select</option>}{field.options!.map(option => <option key={option}>{option}</option>)}</select></label>;
  }
  if (field.type === 'file') {
    return <label className="text-xs font-semibold text-gray-700">{field.label}{value ? <span className="ml-2 text-[11px] font-normal text-gray-500">Current: {String(value)}</span> : null}<input name={field.name} type="file" accept="application/pdf" className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#0F172A] file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold"/></label>;
  }
  if (field.type === 'textarea') {
    return <label className="text-xs font-semibold text-gray-700">{field.label}<textarea name={field.name} required={field.required} defaultValue={String(value ?? '')} rows={3} className={base} placeholder={placeholder}/></label>;
  }
  return <label className="text-xs font-semibold text-gray-700">{field.label}<input name={field.name} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} required={field.required} defaultValue={String(value ?? '')} className={base} placeholder={placeholder}/></label>;
}
