import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
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
                  <img src="/legacy/NewLogin/images/bharatshramsetu-logo.png" className="newLoginBrandLogo" alt="BharatShramSetu" />
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
                  <img src="/legacy/NewLogin/images/icon-trust.svg" alt="" />
                  <h4 style={{ color: '#1E3A8A' }}>Trust</h4>
                  <p>Secure &amp; Verified</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-transparency.svg" alt="" />
                  <h4 style={{ color: '#F58220' }}>Transparency</h4>
                  <p>Clear &amp; Accountable</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-inclusivity.svg" alt="" />
                  <h4 style={{ color: '#009245' }}>Inclusivity</h4>
                  <p>For Every Worker</p>
                </div>
                <div className="newLoginFeatureDivider"></div>
                <div className="newLoginFeatureBox">
                  <img src="/legacy/NewLogin/images/icon-empowerment.svg" alt="" />
                  <h4 style={{ color: '#1E3A8A' }}>Empowerment</h4>
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

              <div className="newLoginRoleRow">
                {['Worker', 'Contractor', 'Principal Employer'].map((r) => (
                  <label key={r} className="newLoginRoleOption">
                    <input type="radio" name="loginRole" value={r} checked={role === r} onChange={() => setRole(r)} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div className="newLoginField">
                <label className="newLoginLabelRow">
                  <span>Email or Mobile</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Email or Mobile"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="newLoginField">
                <label className="newLoginLabelRow">
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                />
              </div>

              {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}

              <button id="btnStep1Login" className="newLoginPrimaryBtn" onClick={doLogin} disabled={busy}>
                {busy ? 'Logging in...' : 'Login'}
              </button>

              <div className="newLoginBottomMessage">
                New to BharatShramSetu? <a href="#" className="newLoginInlineLink">Register</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
