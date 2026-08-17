import { useEffect, useState } from 'react';
import { qrMgmtApi } from '../api/endpoints';

interface ViewTreeModalProps {
  type: 'employer' | 'contractor' | 'worker';
  id: number;
  name: string;
  onClose: () => void;
}

const fieldRow = (label: string, value: any) => (
  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
    <b>{label}:</b> {value || '—'}
  </div>
);

export default function ViewTreeModal({ type, id, name, onClose }: ViewTreeModalProps) {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const req = type === 'employer' ? qrMgmtApi.employerTree(id)
      : type === 'contractor' ? qrMgmtApi.contractorTree(id)
      : qrMgmtApi.workerTree(id);
    req
      .then((res) => setTree(res.data?.Data || null))
      .catch((e: any) => setError(e?.response?.data?.Message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [type, id]);

  const title = type === 'employer' ? 'Employer Tree' : type === 'contractor' ? 'Contractor Tree' : 'Worker Details';

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" style={{ width: 'min(760px, 94vw)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#022B5E' }}>{title}</h3>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{name}</div>
          </div>
          <button className="qr-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="module-loading" style={{ padding: 20, textAlign: 'center' }}>Loading...</div>}
        {error && <div style={{ color: '#ef4444', padding: 16 }}>{error}</div>}

        {tree && type === 'employer' && (() => {
          const emp = tree.employer;
          return (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, color: '#022B5E', fontSize: 16 }}>
                    <i className="fa fa-building" style={{ marginRight: 6 }}></i> {emp.name}
                  </h4>
                  {tree.qr_reference && <span className="qr-mini-badge">QR issued</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {fieldRow('Email', emp.email)}
                  {fieldRow('Mobile', emp.contact_mobile)}
                  {fieldRow('Contact Person', emp.contact_person)}
                  {fieldRow('Status', emp.approval_status)}
                  {fieldRow('Plan', emp.plan_type)}
                  {fieldRow('Expiry', emp.plan_expiry ? new Date(emp.plan_expiry).toLocaleDateString() : null)}
                  {fieldRow('Industry', emp.industry)}
                  {fieldRow('City', emp.city)}
                  {fieldRow('GSTIN', emp.gstin)}
                  {fieldRow('PAN', emp.pan_no)}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                  <b>{tree.total_contractors}</b> contractors · <b>{tree.total_workers}</b> workers
                </div>
              </div>

              {tree.contractors.length === 0 && (
                <div style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>No contractors under this employer.</div>
              )}
              {tree.contractors.map((c: any) => (
                <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#eef2f7', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#022B5E' }}>
                      <i className="fa fa-user-tie" style={{ marginRight: 6 }}></i> {c.name}
                      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                        {c.is_primary ? 'Primary' : 'Secondary'}
                        {c.site_name ? ` · ${c.site_name}` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{c.workers.length} workers</span>
                  </div>
                  {c.location_address && (
                    <div style={{ padding: '6px 14px', fontSize: 12, color: '#6b7280', background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                      📍 {c.location_address}
                    </div>
                  )}
                  {c.workers.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: '#9ca3af' }}>No workers assigned.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ textAlign: 'left', padding: '6px 14px', color: '#6b7280' }}>Worker</th>
                          <th style={{ textAlign: 'left', padding: '6px 14px', color: '#6b7280' }}>Worker ID</th>
                          <th style={{ textAlign: 'left', padding: '6px 14px', color: '#6b7280' }}>Mobile</th>
                          <th style={{ textAlign: 'left', padding: '6px 14px', color: '#6b7280' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.workers.map((w: any) => (
                          <tr key={w.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 14px' }}>{w.full_name}</td>
                            <td style={{ padding: '6px 14px' }}>{w.worker_id || '—'}</td>
                            <td style={{ padding: '6px 14px' }}>{w.mobile || '—'}</td>
                            <td style={{ padding: '6px 14px' }}>
                              <span className={w.is_active ? 'tag-active' : 'tag-inactive'}>{w.is_active ? 'Active' : 'Inactive'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </>
          );
        })()}

        {tree && type === 'contractor' && (() => {
          const c = tree.contractor;
          const emp = tree.employer;
          return (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, color: '#022B5E', fontSize: 16 }}>
                    <i className="fa fa-user-tie" style={{ marginRight: 6 }}></i> {c.name}
                  </h4>
                  {tree.qr_reference && <span className="qr-mini-badge">QR issued</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {fieldRow('Employer', emp ? emp.name : 'Unbound')}
                  {fieldRow('Mobile', c.contact_mobile)}
                  {fieldRow('Type', c.is_primary ? 'Primary' : 'Secondary')}
                  {fieldRow('Site', c.site_name)}
                  {fieldRow('Industry', c.industry)}
                  {fieldRow('City', c.city)}
                  {fieldRow('GSTIN', c.gstin)}
                  {fieldRow('PAN', c.pan_no)}
                </div>
                {c.location_address && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>📍 {c.location_address}</div>
                )}
                <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                  <b>{tree.workers.length}</b> workers
                </div>
              </div>

              {tree.workers.length === 0 ? (
                <div style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>No workers under this contractor.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Worker</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Worker ID</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Mobile</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tree.workers.map((w: any) => (
                      <tr key={w.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 14px' }}>{w.full_name}</td>
                        <td style={{ padding: '8px 14px' }}>{w.worker_id || '—'}</td>
                        <td style={{ padding: '8px 14px' }}>{w.mobile || '—'}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <span className={w.is_active ? 'tag-active' : 'tag-inactive'}>{w.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          );
        })()}

        {tree && type === 'worker' && (() => {
          const w = tree.worker;
          const emp = tree.employer;
          const c = tree.contractor;
          return (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, color: '#022B5E', fontSize: 16 }}>
                    <i className="fa fa-user" style={{ marginRight: 6 }}></i> {w.full_name}
                  </h4>
                  {tree.qr_reference && <span className="qr-mini-badge">QR issued</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {fieldRow('Worker ID', w.worker_id)}
                  {fieldRow('Mobile', w.mobile)}
                  {fieldRow('Employer', emp ? emp.name : 'Unbound')}
                  {fieldRow('Contractor', c ? c.name : 'Unbound')}
                  {fieldRow('Designation', w.designation)}
                  {fieldRow('Department', w.department)}
                  {fieldRow('Aadhaar', w.aadhaar_no)}
                  {fieldRow('PAN', w.pan_no)}
                  {fieldRow('DOJ', w.doj)}
                  {fieldRow('Status', w.is_active ? 'Active' : 'Inactive')}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                  <b>{tree.bindings.length}</b> binding record(s)
                </div>
              </div>
              {tree.bindings.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Started</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px', color: '#6b7280' }}>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tree.bindings.map((b: any) => (
                      <tr key={b.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 14px' }}>{b.binding_type}</td>
                        <td style={{ padding: '8px 14px' }}>{b.status}</td>
                        <td style={{ padding: '8px 14px' }}>{b.started_at ? new Date(b.started_at).toLocaleString() : '—'}</td>
                        <td style={{ padding: '8px 14px' }}>{b.ended_at ? new Date(b.ended_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}