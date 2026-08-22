import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../api/client';
import { qrApi } from '../api/endpoints';
import './Workers.css';

export default function WorkerDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const w = (location.state as any)?.worker || null;
  const [cardDataUrl, setCardDataUrl] = useState('');
  const [visibility, setVisibility] = useState<'FULL' | 'GENERAL'>('FULL');
  const [general, setGeneral] = useState<any>(null);

  useEffect(() => {
    if (!w?.id) return;
    api.get(`/qr/workers/${w.id}/card/?fmt=png`, { responseType: 'blob' }).then((r) => {
      const reader = new FileReader();
      reader.onloadend = () => setCardDataUrl(reader.result as string);
      reader.readAsDataURL(r.data);
    }).catch(() => setCardDataUrl(''));
    qrApi.profileLookup('WORKER', w.id).then((r) => {
      const d = r.data?.Data;
      if (d) {
        setVisibility(d.visibility);
        setGeneral(d.profile);
      }
    }).catch(() => {});
  }, [w?.id]);

  if (!w) {
    return (
      <AppLayout title="Worker">
        <div className="workers-page">
          <p>Worker not found. <a href="#" onClick={(e) => { e.preventDefault(); navigate('/qr/workers'); }}>Back to workers</a></p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Worker Profile">
      <div className="worker-detail-page">
        <button className="btn-primary" onClick={() => navigate('/qr/workers')}>← Back to Workers</button>

        <div className="worker-detail-grid">
          {/* Profile */}
          <div className="panel worker-detail-profile">
            <div className="worker-card-header">
              <div className="worker-avatar">{w.full_name?.[0]?.toUpperCase() || 'W'}</div>
              <div>
                <h2>{w.full_name}</h2>
                <span className="worker-id">{w.worker_id}</span>
                <span
                  className={`status-badge ${visibility === 'FULL' ? 'badge-approved' : 'badge-pending'}`}
                  style={{ marginLeft: 8, fontSize: 11, verticalAlign: 'middle' }}
                >
                  {visibility === 'FULL' ? 'BOUND · FULL VIEW' : 'UNBOUND · LIMITED'}
                </span>
              </div>
            </div>
            {visibility === 'GENERAL' && (
              <div className="worker-meta" style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 8, padding: 10 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#92400e' }}>
                  You are not bound to this worker. Showing general info only (GUIDE.MD Rules 5 &amp; 6).
                </p>
                <p><b>Name:</b> {general?.Name || w.full_name || '—'}</p>
                <p><b>Age:</b> {general?.Age || '—'}</p>
                <p><b>Sex:</b> {general?.Sex || '—'}</p>
                <p><b>Company:</b> {general?.Company || '—'}</p>
                <p><b>Blood Group:</b> {general?.BloodGroup || '—'}</p>
              </div>
            )}
            {visibility === 'FULL' && (
              <div className="worker-meta">
                <p><b>Account:</b> {w.legacy_employee_code || w.email || '—'}</p>
                <p><b>Worker ID:</b> {w.worker_id || '—'}</p>
                <p><b>Name:</b> {w.full_name || '—'}</p>
                <p><b>Mobile:</b> {w.mobile || '—'}</p>
                <p><b>Aadhaar:</b> {w.aadhaar_no || '—'}</p>
                <p><b>PAN:</b> {w.pan_no || '—'}</p>
                <p><b>Status:</b> <span className={w.is_active ? 'tag-active' : 'tag-inactive'}>{w.is_active ? 'Active' : 'Inactive'}</span></p>
                <p><b>Employer:</b> {w.employer_name || (w.employer ? `#${w.employer}` : 'Unbound')}</p>
                <p><b>Contractor:</b> {w.contractor_name || (w.contractor ? `#${w.contractor}` : 'Unbound')}</p>
                <p><b>Site:</b> {w.site_name || '—'}</p>
                <p><b>Created:</b> {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</p>
              </div>
            )}
          </div>

          {/* ID Card */}
          <div className="panel worker-detail-card">
            <div className="panel-head-row">
              <h3>Worker ID Card</h3>
              {cardDataUrl && <a className="btn-primary" href={cardDataUrl} download={`${w.worker_id || w.id}-card.png`}>Download PNG</a>}
            </div>
            {cardDataUrl ? (
              <img src={cardDataUrl} alt="Worker ID Card" className="worker-id-card-img" />
            ) : (
              <div className="user-qr-loading" style={{ width: '100%', height: 200 }}>Loading ID card...</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
