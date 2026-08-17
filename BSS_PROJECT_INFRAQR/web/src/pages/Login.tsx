import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Button } from '../components';
import '../assets/legacy-login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Worker');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async () => {
    if (!username || !password) { setError('Enter email/mobile and password'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/v1/auth/login', { username, password, method: 'password' });
      const user = res.data.data.user;
      const { accessToken, refreshToken, legacyLoginId } = res.data.meta;
      localStorage.setItem('bss_token', accessToken);
      localStorage.setItem('bss_refresh_token', refreshToken);
      localStorage.setItem('bss_user', JSON.stringify(user));
      if (legacyLoginId) localStorage.setItem('bss_legacy_login', legacyLoginId);
      else localStorage.removeItem('bss_legacy_login');
      navigate('/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="newLoginPage">
      <div className="newLoginMain">
        <div className="newLoginContent">
          {/* LEFT HERO */}
          <div className="newLoginHero">
            <div className="newLoginHeroTop">
              <div className="newLoginBrandSection">
                <div className="newLoginBrandRow">
                  <img src="/legacy/NewLogin/images/bharatshramsetu-logo.png" className="newLoginBrandLogo" alt="BharatShramSetu Logo" width="48" height="48" decoding="async" />
                  <div className="newLoginBrandText">
                    <h1 className="newLoginBrandTitle">
                      <span className="bharat">Bharat</span><span className="shram">Shram</span><span className="setu">Setu</span>
                    </h1>
                    <div className="newLoginTagline">
                      <span></span>
                      <p>One Nation, One ID, One Platform</p>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="newLoginHeroHeading">
                <h2>A Unified Digital Platform for Workforce Identity, Welfare and Empowerment.</h2>
              </div>
              <div className="newLoginFeatureRow">
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-trust.svg" alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async" />
                  <h4 style={{ color: 'var(--color-primary)' }}>Trust</h4>
                  <p>Secure &amp; Verified</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-transparency.svg" alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async" />
                  <h4 style={{ color: 'var(--color-accent)' }}>Transparency</h4>
                  <p>Clear &amp; Accountable</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-inclusivity.svg" alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async" />
                  <h4 style={{ color: 'var(--color-success)' }}>Inclusivity</h4>
                  <p>For Every Worker</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-empowerment.svg" alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async" />
                  <h4 style={{ color: 'var(--color-primary)' }}>Empowerment</h4>
                  <p>For Every Worker</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT LOGIN CARD */}
          <div className="newLoginCardWrap">
            <div className="newLoginCard">
              <div className="newLoginCardHeader">
                <h3>Welcome Back!</h3>
                <p>Login to continue to BharatShramSetu</p>
              </div>

              <div className="newLoginRoleRow" role="radiogroup" aria-label="Select Login Role">
                {['Worker', 'Contractor', 'Principal Employer'].map((r) => (
                  <label key={r} className="newLoginRoleOption">
                    <input type="radio" name="loginRole" value={r} checked={role === r} onChange={() => setRole(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div className="newLoginField">
                <label htmlFor="login-username" className="newLoginLabelRow">
                  Email or Mobile
                </label>
                <input
                  id="login-username"
                  type="text"
                  className="form-control"
                  placeholder="Enter Email or Mobile"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="newLoginField">
                <label htmlFor="login-password" className="newLoginLabelRow">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                />
              </div>

              {error && <div style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }} role="alert">{error}</div>}

              <Button
                id="btnStep1Login"
                variant="primary"
                fullWidth
                onClick={doLogin}
                loading={busy}
              >
                Login
              </Button>

              <div className="newLoginBottomMessage">
                New to BharatShramSetu? <a href="/register" className="newLoginInlineLink">Register</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
