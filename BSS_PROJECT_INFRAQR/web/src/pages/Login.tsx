import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import '../assets/legacy-login.css';

type Method = 'otp' | 'mpin' | 'password';

export default function LoginPage() {
  const navigate = useNavigate();

  // view: 'login' | 'register'
  const [view, setView] = useState<'login' | 'register'>('login');
  // login method
  const [method, setMethod] = useState<Method>('password');

  // password visibility toggles
  const [showMpin, setShowMpin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // login shared
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [mpinMobile, setMpinMobile] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // register
  const [regRole, setRegRole] = useState('7'); // 5=PE 6=Contractor 7=Worker
  const [regMobile, setRegMobile] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regStep, setRegStep] = useState(1); // 1 = enter mobile, 2 = enter otp

  const saveSession = (d: any) => {
    // d is the legacy session row: {LoginId, UserName, Name, LoginType, SessionId, RPath, ...}
    localStorage.setItem('bss_legacy_login', String(d.LoginId || 3));
    localStorage.setItem('bss_legacy_user', JSON.stringify(d));
    navigate('/dashboard');
  };

  // ---------- LOGIN: OTP ----------
  const sendOtp = async () => {
    if (!username) { setError('Enter Email or Mobile'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: username, Action: '8' });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) {
        setError('Your Account is not Registered. Please Register First to Continue');
        return;
      }
      // OTP "sent" (we show it in the response for dev; real flow sends SMS/email)
      setOtpSent(true);
      startTimer();
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Failed to send OTP');
    } finally { setBusy(false); }
  };

  const loginWithOtp = async () => {
    if (!otp) { setError('Enter OTP'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: username, Password: otp, Action: '43' });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) { setError('Invalid OTP!'); return; }
      saveSession(data[0]);
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Login failed');
    } finally { setBusy(false); }
  };

  // ---------- LOGIN: MPIN ----------
  const loginWithMpin = async () => {
    if (!mpinMobile || !mpin) { setError('Enter mobile and MPIN'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: mpinMobile, Password: mpin, Action: '44' });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) { setError('Invalid MPIN!'); return; }
      saveSession(data[0]);
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Login failed');
    } finally { setBusy(false); }
  };

  // ---------- LOGIN: Username/Password ----------
  const loginWithPassword = async () => {
    if (!username || !password) { setError('Enter user name and password'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: username, Password: password, Action: '45' });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) { setError('Invalid credentials!'); return; }
      saveSession(data[0]);
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Login failed');
    } finally { setBusy(false); }
  };

  // ---------- REGISTER ----------
  const registerSendOtp = async () => {
    if (!regMobile) { setError('Enter Mobile No. or Email Id'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: regMobile, PassWord: regRole, Action: '46' });
      const data = res.data;
      const d = data && data[0];
      if (d && d.LoginId === '-1') { setError('Already Registered, Please login'); return; }
      setRegStep(2);
      startTimer();
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Registration failed');
    } finally { setBusy(false); }
  };

  const confirmRegistration = async () => {
    if (!regOtp) { setError('Enter OTP'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/Login/VLoginVerify', { Username: regMobile, Password: regOtp, Action: '47' });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) { setError('Invalid OTP!'); return; }
      saveSession(data[0]);
    } catch (e: any) {
      setError(e?.response?.data?.Message || 'Registration failed');
    } finally { setBusy(false); }
  };

  const startTimer = () => {
    setOtpTimer(30);
    const t = setInterval(() => {
      setOtpTimer((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const digilockerLogin = () => {
    // Legacy redirects to DigiLocker OAuth. For now navigate to a placeholder action.
    window.open('https://digilocker.meripehchaan.gov.in/public/oauth2/2/authorize', '_blank');
  };

  const switchMethod = (m: Method) => { setMethod(m); setError(''); };

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
                      <span></span><p>One Nation, One ID, One Platform</p><span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="newLoginHeroHeading">
                <h2>A Unified Digital Platform for Workforce Identity, Welfare and Empowerment.</h2>
              </div>
                <div className="newLoginFeatureRow">
                  <div className="newLoginFeatureBox"><img src="/legacy/NewLogin/images/icon-trust.svg" alt="" /><h4 style={{ color: '#1E3A8A' }}>Trust</h4><p>Secure &amp; Verified</p></div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox"><img src="/legacy/NewLogin/images/icon-transparency.svg" alt="" /><h4 style={{ color: '#F58220' }}>Transparency</h4><p>Clear &amp; Accountable</p></div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox"><img src="/legacy/NewLogin/images/icon-inclusivity.svg" alt="" /><h4 style={{ color: '#009245' }}>Inclusivity</h4><p>For Every Worker</p></div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox"><img src="/legacy/NewLogin/images/icon-empowerment.svg" alt="" /><h4 style={{ color: '#1E3A8A' }}>Empowerment</h4><p>Growth &amp; Welfare</p></div>
                </div>

                {/* STATS BANNER */}
                <div className="newLoginHeroBottom">
                  <div className="newLoginStatsBanner">
                    <div className="newLoginStatsItem">
                      <div className="newLoginStatsIcon"><img src="/legacy/NewLogin/images/icon-workers.svg" alt="" /></div>
                      <div className="newLoginStatsContent"><h4>50+ Crore</h4><p>Workers</p></div>
                    </div>
                    <div className="newLoginStatsDivider"></div>
                    <div className="newLoginStatsItem">
                      <div className="newLoginStatsIcon"><img src="/legacy/NewLogin/images/icon-establishments.svg" alt="" /></div>
                      <div className="newLoginStatsContent"><h4>Millions</h4><p>Establishments</p></div>
                    </div>
                    <div className="newLoginStatsDivider"></div>
                    <div className="newLoginStatsItem">
                      <div className="newLoginStatsIcon"><img src="/legacy/NewLogin/images/icon-platform.svg" alt="" /></div>
                      <div className="newLoginStatsContent"><h4>One Trusted</h4><p>Platform</p></div>
                    </div>
                    <div className="newLoginStatsDivider"></div>
                    <div className="newLoginStatsItem">
                      <div className="newLoginStatsIcon"><img src="/legacy/NewLogin/images/icon-vision.svg" alt="" /></div>
                      <div className="newLoginStatsContent"><h4>One Nation</h4><p>One Vision</p></div>
                    </div>
                  </div>

                  <div className="newLoginBottomMessage">
                    <div className="newLoginTriLine"></div>
                    <p>Building a Stronger, Safer and Empowered Bharat</p>
                    <div className="newLoginTriLine"></div>
                  </div>
                </div>
              </div>
            </div>

          {/* RIGHT CARD */}
          <div className="newLoginCardWrap">
            <div className="newLoginCard">

              {view === 'login' ? (
                <>
                  <div className="newLoginCardHeader">
                    <h3>Welcome Back!</h3>
                    <p>Log into your BharatShramSetu account</p>
                  </div>

                  {/* OTP LOGIN */}
                  {method === 'otp' && (
                    <>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Mobile Number / Email ID</span></label>
                        <div className="newLoginInputWithAction">
                          <input type="text" className="form-control" placeholder="Enter Email or Mobile"
                            value={username} onChange={(e) => setUsername(e.target.value)} />
                          {username && (
                            <button type="button" className="newPasswordToggle" style={{ color: '#ef4444' }} onClick={() => setUsername('')}>
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      {otpSent && (
                        <div className="newLoginField">
                          <label className="newLoginLabelRow"><span>OTP {otpTimer > 0 ? `(${otpTimer}s)` : ''}</span></label>
                          <input type="text" className="form-control" placeholder="Enter OTP"
                            value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loginWithOtp()} />
                        </div>
                      )}
                      {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}
                      <button className="newLoginPrimaryBtn" onClick={otpSent ? loginWithOtp : sendOtp} disabled={busy}>
                        {busy ? 'Please wait...' : otpSent ? (
                          <>Secure Login <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i></>
                        ) : 'Send OTP'}
                      </button>
                    </>
                  )}

                  {/* MPIN LOGIN */}
                  {method === 'mpin' && (
                    <>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Mobile Number / Email ID</span></label>
                        <div className="newLoginInputWithAction">
                          <input type="text" className="form-control" placeholder="Enter Email or Mobile"
                            value={mpinMobile} onChange={(e) => setMpinMobile(e.target.value)} />
                          {mpinMobile && (
                            <button type="button" className="newPasswordToggle" style={{ color: '#ef4444' }} onClick={() => setMpinMobile('')}>
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow">
                          <span>MPIN</span>
                          <a href="#" className="newLoginInlineLink" style={{ color: '#ef4444', fontWeight: 'normal', fontSize: '13px' }} onClick={(e) => e.preventDefault()}>
                            Forgot MPIN?
                          </a>
                        </label>
                        <div className="newLoginInputWithAction">
                          <input type={showMpin ? 'text' : 'password'} className="form-control" maxLength={6} placeholder="Enter MPIN"
                            value={mpin} onChange={(e) => setMpin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loginWithMpin()} />
                          <button type="button" className="newPasswordToggle" onClick={() => setShowMpin(!showMpin)}>
                            <i className={`fa-regular ${showMpin ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                      {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}
                      <button className="newLoginPrimaryBtn" onClick={loginWithMpin} disabled={busy}>
                        {busy ? 'Please wait...' : (
                          <>Secure Login <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i></>
                        )}
                      </button>
                    </>
                  )}

                  {/* PASSWORD LOGIN */}
                  {method === 'password' && (
                    <>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>User Name</span></label>
                        <div className="newLoginInputWithAction">
                          <input type="text" className="form-control" placeholder="Enter User Name"
                            value={username} onChange={(e) => setUsername(e.target.value)} />
                          {username && (
                            <button type="button" className="newPasswordToggle" style={{ color: '#ef4444' }} onClick={() => setUsername('')}>
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Password</span></label>
                        <div className="newLoginInputWithAction">
                          <input type={showPassword ? 'text' : 'password'} className="form-control" placeholder="Enter Password"
                            value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loginWithPassword()} />
                          <button type="button" className="newPasswordToggle" onClick={() => setShowPassword(!showPassword)}>
                            <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                      {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}
                      <button className="newLoginPrimaryBtn" onClick={loginWithPassword} disabled={busy}>
                        {busy ? 'Please wait...' : (
                          <>Secure Login <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i></>
                        )}
                      </button>
                    </>
                  )}

                  {/* METHOD GRID */}
                  <div className="newLoginContinueWith">
                    <span className="line"></span><p>OR CONTINUE WITH</p><span className="line"></span>
                  </div>
                  <div className="newLoginMethodGrid active">
                    {method !== 'mpin' && (
                      <button className="newLoginMethodCard" onClick={() => switchMethod('mpin')}>
                        <img src="/legacy/NewLogin/images/icon-mpin.svg" alt="" /><span>MPIN</span>
                      </button>
                    )}
                    {method !== 'password' && (
                      <button className="newLoginMethodCard" onClick={() => switchMethod('password')}>
                        <img src="/legacy/NewLogin/images/icon-password.svg" alt="" /><span>ID / Password</span>
                      </button>
                    )}
                    {method !== 'otp' && (
                      <button className="newLoginMethodCard" onClick={() => switchMethod('otp')}>
                        <img src="/legacy/NewLogin/images/icon-otp.svg" alt="" /><span>OTP</span>
                      </button>
                    )}
                  </div>

                  <div className="newLoginRegister">
                    New to BharatShramSetu?{' '}
                    <a href="#" className="newLoginInlineLink" onClick={(e) => { e.preventDefault(); setView('register'); }}>
                      Register Now
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="newLoginCardHeader">
                    <h3>Create Account</h3>
                    <p>Register to join BharatShramSetu</p>
                  </div>

                  {/* STEP 1: role + mobile */}
                  {regStep === 1 && (
                    <>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Register as</span></label>
                        <div className="newLoginRoleRow">
                          {[['7', 'Worker'], ['6', 'Contractor'], ['5', 'Principal Employer']].map(([v, label]) => (
                            <label key={v} className="newLoginRoleOption">
                              <input type="radio" name="regRole" checked={regRole === v} onChange={() => setRegRole(v)} />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Mobile Number / Email ID</span></label>
                        <input type="text" className="form-control" placeholder="Enter Email or Mobile"
                          value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
                      </div>
                      {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}
                      <button className="newLoginPrimaryBtn" onClick={registerSendOtp} disabled={busy}>
                        {busy ? 'Please wait...' : <span>Send OTP <i className="fa-solid fa-arrow-right"></i></span>}
                      </button>

                      <div className="newLoginContinueWith">
                        <span className="line"></span><p>OR REGISTER WITH</p><span className="line"></span>
                      </div>
                      <div className="registerBtnRow">
                        <button className="newRegisterWhatsappBtn whatsappBtn" type="button" onClick={() => window.open('https://wa.me/919650887008?text=Hello', '_blank')}>
                          <span className="registerBtnIcon"><img src="/legacy/NewLogin/images/whatsapp.svg" alt="WhatsApp" /></span><span>WhatsApp</span>
                        </button>
                        <button className="newRegisterWhatsappBtn digiLockerBtn" type="button" onClick={digilockerLogin}>
                          <span className="registerBtnIcon"><img src="/legacy/NewLogin/images/digilocker.svg" alt="Digilocker" /></span><span>Digilocker</span>
                        </button>
                        <button className="newRegisterWhatsappBtn callBtn" type="button" onClick={() => window.location.href = 'tel:9650887008'}>
                          <span className="registerBtnIcon"><img src="/legacy/NewLogin/images/call.svg" alt="Call Us" /></span><span>Call Us</span>
                        </button>
                      </div>
                      <div className="newRegisterTerms">
                        By continuing, you agree to our <a href="/#/terms">Terms &amp; Conditions</a> and <a href="https://ezcompliance.in/privacy-policy/" target="_blank" rel="noreferrer">Privacy Policy</a>
                      </div>
                    </>
                  )}

                  {/* STEP 2: OTP */}
                  {regStep === 2 && (
                    <>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Mobile Number / Email ID</span></label>
                        <input type="text" className="form-control" value={regMobile} disabled />
                      </div>
                      <div className="newLoginField">
                        <label className="newLoginLabelRow"><span>Enter OTP {otpTimer > 0 ? `(${otpTimer}s)` : ''}</span></label>
                        <input type="text" className="form-control" placeholder="Enter OTP"
                          value={regOtp} onChange={(e) => setRegOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmRegistration()} />
                      </div>
                      {error && <div style={{ color: '#d65e65', marginBottom: 12 }}>{error}</div>}
                      <button className="newLoginPrimaryBtn" onClick={confirmRegistration} disabled={busy}>
                        {busy ? 'Please wait...' : 'Verify & Register'}
                      </button>
                      <div className="newLoginBottomMessage">
                        Already have an account?{' '}
                        <a href="#" className="newLoginInlineLink" onClick={(e) => { e.preventDefault(); setView('login'); setRegStep(1); }}>
                          Login Here
                        </a>
                      </div>
                    </>
                  )}
                </>
              )}
             </div>
           </div>
         </div>
       </div>

       {/* FOOTER */}
       <footer className="newLoginFooter">
         <div className="newLoginFooterLeft">
           <div className="newLoginFooterItem">
             <img src="/legacy/NewLogin/images/icon-secure.svg" alt="" />
             <span>Secure Platform</span>
           </div>
           <div className="newLoginFooterItem">
             <img src="/legacy/NewLogin/images/icon-government.svg" alt="" />
             <span>Digital Governance</span>
           </div>
           <div className="newLoginFooterItem">
             <img src="/legacy/NewLogin/images/icon-accessible.svg" alt="" />
             <span>Accessible Anytime</span>
           </div>
           <div className="newLoginFooterItem">
             <img src="/legacy/NewLogin/images/icon-support.svg" alt="" />
             <span>Support</span>
           </div>
         </div>
         <div className="newLoginFooterRight">© BharatShramSetu. All rights reserved.</div>
       </footer>
     </div>
   );
 }
