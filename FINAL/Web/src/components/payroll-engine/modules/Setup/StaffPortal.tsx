"use client";

/**
 * Staff portal (legacy controller/payroll/staffPortal.js):
 * GET/POST staffPortal/settings, GET staffPortal/webTabs, POST staffPortal/webTab,
 * PUT/DELETE staffPortal/webTab/:tabId.
 */

import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Btn, Confirm, DataTable, Field, FormGrid, Modal, Section, TextInput, Toggle, isoDate, useAction, useLoad } from '../../ui';

type Settings = { _id?: string; enablePortalAccess?: boolean; bannerMessage?: string; bannerEndDate?: string | null; portalContactEmail?: string; updatedAt?: string };
type WebTab = { _id: string; title: string; url: string; isVisible: boolean };

export default function StaffPortal({ notify }: Pick<ModuleProps, 'notify'>) {
  const settings = useLoad(() => pe.get<Settings>('staffPortal/settings'), []);
  const tabs = useLoad(() => pe.get<WebTab[]>('staffPortal/webTabs'), []);
  const [editing, setEditing] = useState<WebTab | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WebTab | null>(null);
  const { busy, run } = useAction(notify);

  return <div className="space-y-4">
    <Async state={settings}>{s => <SettingsForm key={s.updatedAt ?? 'new'} initial={s} notify={notify} onSaved={settings.reload} />}</Async>
    <Section title="Portal web tabs" subtitle="Extra links shown to employees in their payroll portal (policies, handbook, helpdesk…)" right={<Btn onClick={() => setEditing('new')}><Plus size={14} />Add tab</Btn>}>
      <Async state={tabs}>
        {rows => <DataTable rows={rows} rowKey={r => r._id} empty="No web tabs yet — add links employees should see in their portal."
          columns={[
            { key: 'title', label: 'Title', render: r => <span className="font-semibold">{r.title}</span> },
            { key: 'url', label: 'URL', render: r => <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-bss-interactive-blue)] hover:underline break-all">{r.url}<ExternalLink size={12} /></a> },
            { key: 'isVisible', label: 'Visible', render: r => <Toggle checked={r.isVisible} label={r.isVisible ? 'Shown' : 'Hidden'} onChange={async isVisible => {
              const ok = await run(() => pe.put(`staffPortal/webTab/${r._id}`, { isVisible }), 'Web tab updated successfully');
              if (ok !== undefined) tabs.reload();
            }} /> },
            { key: 'a', label: '', align: 'right', render: r => <div className="flex justify-end gap-1">
              <Btn variant="ghost" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}><Pencil size={14} /></Btn>
              <Btn variant="ghost" aria-label={`Delete ${r.title}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={14} /></Btn>
            </div> },
          ]} />}
      </Async>
    </Section>
    {editing && <TabForm tab={editing === 'new' ? null : editing} notify={notify} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); tabs.reload(); }} />}
    {deleting && <Confirm danger title="Delete web tab" busy={busy} message={<>Remove <b>{deleting.title}</b> from the staff portal?</>} onClose={() => setDeleting(null)}
      onConfirm={async () => { const ok = await run(() => pe.del(`staffPortal/webTab/${deleting._id}`), 'Web tab deleted successfully'); if (ok !== undefined) { setDeleting(null); tabs.reload(); } }} />}
  </div>;
}

function SettingsForm({ initial, notify, onSaved }: { initial: Settings; notify: ModuleProps['notify']; onSaved: () => void }) {
  const [f, setF] = useState({ enablePortalAccess: !!initial.enablePortalAccess, bannerMessage: initial.bannerMessage ?? '', bannerEndDate: isoDate(initial.bannerEndDate), portalContactEmail: initial.portalContactEmail ?? '' });
  const { busy, run } = useAction(notify);
  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));
  return <Section title="Staff portal settings" subtitle="Controls employee self-service access to payslips, claims and tax declarations.">
    <form className="p-5 space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (f.portalContactEmail && !/^\S+@\S+\.\S+$/.test(f.portalContactEmail)) { notify('Enter a valid contact email', 'error'); return; }
      const ok = await run(() => pe.post('staffPortal/settings', { ...f, bannerEndDate: f.bannerEndDate || null }), 'Staff portal settings updated successfully');
      if (ok !== undefined) onSaved();
    }}>
      <Toggle checked={f.enablePortalAccess} onChange={enablePortalAccess => set({ enablePortalAccess })} label="Enable staff portal access" />
      <FormGrid cols={2}>
        <Field label="Portal contact email" hint="Shown to employees for payroll queries"><TextInput type="email" value={f.portalContactEmail} onChange={portalContactEmail => set({ portalContactEmail })} /></Field>
        <Field label="Banner end date" hint="Banner hides after this date"><TextInput type="date" value={f.bannerEndDate} onChange={bannerEndDate => set({ bannerEndDate })} /></Field>
      </FormGrid>
      <Field label="Banner message"><textarea rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={f.bannerMessage} onChange={e => set({ bannerMessage: e.target.value })} placeholder="e.g. Submit investment proofs by 15 January" /></Field>
      <div className="flex justify-end"><Btn type="submit" busy={busy}>Save settings</Btn></div>
    </form>
  </Section>;
}

function TabForm({ tab, notify, onClose, onSaved }: { tab: WebTab | null; notify: ModuleProps['notify']; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: tab?.title ?? '', url: tab?.url ?? '', isVisible: tab?.isVisible ?? true });
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!f.title.trim() || !f.url.trim()) { notify('Title and URL are required', 'error'); return; }
    const body = { ...f, title: f.title.trim(), url: f.url.trim() };
    const ok = tab ? await run(() => pe.put(`staffPortal/webTab/${tab._id}`, body), 'Web tab updated successfully') : await run(() => pe.post('staffPortal/webTab', body), 'Web tab added successfully');
    if (ok !== undefined) onSaved();
  };
  return <Modal title={tab ? 'Edit web tab' : 'Add web tab'} onClose={onClose} width="max-w-lg" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <Field label="Title *"><TextInput value={f.title} onChange={title => setF(p => ({ ...p, title }))} /></Field>
      <Field label="URL *"><TextInput type="url" value={f.url} onChange={url => setF(p => ({ ...p, url }))} placeholder="https://" /></Field>
      <Toggle checked={f.isVisible} onChange={isVisible => setF(p => ({ ...p, isVisible }))} label="Visible to employees" />
      {!tab && <p className="text-[11px] text-gray-400"><Badge status="active">Tip</Badge> Tabs open in a new browser tab from the employee portal.</p>}
    </div>
  </Modal>;
}
