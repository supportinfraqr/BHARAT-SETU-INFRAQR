import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { qrMgmtApi } from '../api/endpoints';
import './QRManagement.css';

export default function MyPlan() {
  const [my, setMy] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [myRes, planRes] = await Promise.all([qrMgmtApi.myPlan(), qrMgmtApi.plans()]);
      setMy(myRes.data?.Data || null);
      setPlans(planRes.data?.Data || []);
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Could not load plan info.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const choosePlan = async (plan: string) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await qrMgmtApi.attachPlan(plan);
      setMy({ ...(my || {}), ...res.data?.Data });
      setMsg(`Plan updated to ${plan}.`);
    } catch (e: any) {
      setMsg(e?.response?.data?.Message || 'Failed to attach plan.');
    } finally { setBusy(false); }
  };

  return (
    <AppLayout title="My Plan & QR">
      <div className="qr-mgmt">
        {msg && <div className="mgmt-msg">{msg}</div>}

        {!my && <div className="mgmt-empty">No employer account linked. If you registered as a Principal Employer, wait for admin approval.</div>}

        {my && (
          <>
            <div className="my-plan-header">
              <div>
                <h2>{my.employer?.name}</h2>
                <p>Status: <span className={`status-badge ${my.employer?.approval_status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}`}>{my.employer?.approval_status}</span></p>
              </div>
              {my.qr_reference && (
                <div className="my-plan-qr">
                  <img src={`/api/qr/qr/?entity_type=EMPLOYER&entity_id=${my.employer?.id}`} alt="" style={{ display: 'none' }} />
                  <div className="muted">QR: {my.qr_reference}</div>
                </div>
              )}
            </div>

            <h3 className="plans-title">Choose your plan</h3>
            <div className="plans-grid">
              {plans.map((p) => {
                const isCurrent = my.employer?.plan_type === p.plan;
                return (
                  <div key={p.plan} className={`plan-card ${isCurrent ? 'current' : ''}`}>
                    <div className="plan-name">{p.plan}</div>
                    {isCurrent && <div className="plan-current-tag">Current</div>}
                    <ul className="plan-features">
                      {p.features.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                    <button
                      className="btn-primary"
                      disabled={busy || isCurrent || my.employer?.approval_status !== 'APPROVED'}
                      onClick={() => choosePlan(p.plan)}
                    >
                      {isCurrent ? 'Active' : `Choose ${p.plan}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
