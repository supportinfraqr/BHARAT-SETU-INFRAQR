"use client";

import React, { useState } from 'react';
import { 
  HardHat, 
  Briefcase, 
  Building2, 
  Monitor, 
  BadgeCheck, 
  Landmark, 
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Lock,
  ChevronLeft,
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import RegisterForm from '@/components/auth/RegisterForm';
import LanguageSelector from '@/components/auth/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OriginalLoginPage() {
  const [selectedRole, setSelectedRole] = useState('Worker');
  const [loginMethod, setLoginMethod] = useState('OTP'); // OTP, MPIN, Password
  const [isFlipped, setIsFlipped] = useState(false);
  const [isForgotView, setIsForgotView] = useState(false);
  const { language: lang, setLanguage: setLang, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [mpin, setMpin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const authenticate = async (method: 'otp' | 'mpin' | 'password', identifier: string, credential: string) => {
    if (!['Worker', 'Contractor', 'Employer', 'Government', 'BSS Staff', 'BSS Admin'].includes(selectedRole)) throw new Error('Select a valid portal role.');
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ role:selectedRole, method, identifier, credential }) });
      const result = await response.json() as { error?:string; redirectTo?:string };
      if (!response.ok || !result.redirectTo) throw new Error(result.error ?? 'Authentication failed.');
      window.location.replace(result.redirectTo);
    } finally { setIsAuthenticating(false); }
  };

  const handleOtpLogin = async () => {
    setLoginError('');
    if (!['Worker', 'Contractor', 'Employer', 'Government', 'BSS Staff', 'BSS Admin'].includes(selectedRole)) return setLoginError('Select a valid portal role.');
    if (!loginIdentifier.trim()) return setLoginError('Enter your registered mobile number.');
    try {
      if (!otpSent) {
        setIsAuthenticating(true);
        const response = await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'request-otp', role:selectedRole, identifier:loginIdentifier }) });
        const result = await response.json() as { error?:string };
        if (!response.ok) throw new Error(result.error ?? 'OTP could not be sent.');
        setOtpSent(true);
        return;
      }
      if (otp.length !== 6) return setLoginError('Enter the six-digit OTP.');
      await authenticate('otp', loginIdentifier, otp);
    } catch (error) { setLoginError(error instanceof Error ? error.message : 'Authentication failed.'); }
    finally { setIsAuthenticating(false); }
  };

  const handleMpinLogin = async () => {
    setLoginError('');
    if (!loginIdentifier.trim() || mpin.length !== 4) return setLoginError('Enter your registered ID and four-digit MPIN.');
    try { await authenticate('mpin', loginIdentifier, mpin); }
    catch (error) { setLoginError(error instanceof Error ? error.message : 'Authentication failed.'); }
  };

  const handleLogin = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) return setLoginError('Enter your registered ID and password.');
    try { await authenticate('password', username, password); }
    catch (error) { setLoginError(error instanceof Error ? error.message : 'Authentication failed.'); }
  };

  const mainRoles = [
    { id: 'Worker', icon: HardHat, label: t('worker') },
    { id: 'Contractor', icon: Briefcase, label: t('contractor') },
    { id: 'Employer', icon: Building2, label: t('employer') },
  ];

  const otherRoles = [
    { id: 'Government', icon: Landmark, label: t('government') },
    { id: 'BSS Staff', icon: BadgeCheck, label: t('bssStaff') },
    { id: 'BSS Admin', icon: ShieldCheck, label: t('bssAdmin') },
  ];

  return (
    <>
      <link href="/login-style.css" rel="stylesheet" />
      <div className="newLoginPage" aria-busy={isAuthenticating}>
        {/* MAIN SECTION */}
        <div className="newLoginMain">
          {/* CONTENT */}
          <div className="newLoginContent">
            {/* LEFT HERO */}
            <div className="newLoginHero">
              <div className="newLoginHeroTop">
                {/* Brand Area */}
                <div className="newLoginBrandSection">
                  <div className="newLoginBrandRow">
                    <img
                      src="/bss-original-logo.png"
                      className="newLoginBrandLogo"
                      alt="Bharat Shram Setu Logo"
                    />
                    <div className="newLoginBrandText">
                      <style>{`
                        @keyframes premiumGlow {
                          0%, 100% {
                            text-shadow: 0 0 15px rgba(255,255,255,0.1), 0 0 30px rgba(245, 130, 32, 0.1);
                          }
                          50% {
                            text-shadow: 0 0 25px rgba(255,255,255,0.7), 0 0 50px rgba(245, 130, 32, 0.5);
                          }
                        }
                        .animate-premium-glow {
                          animation: premiumGlow 4s ease-in-out infinite;
                        }
                        @media (prefers-reduced-motion: reduce) {
                          .animate-premium-glow { animation: none !important; }
                        }
                      `}</style>
                      <h1 className="newLoginBrandTitle animate-premium-glow transition-all">
                        <span className="bharat">Bharat</span>
                        <span className="shram">Shram</span>
                        <span className="setu">Setu</span>
                      </h1>
                      <div className="newLoginTagline">
                        <span></span>
                        <p>One Nation, One ID, One Platform</p>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Heading */}
                <div className="newLoginHeroHeading">
                  <h2>
                    A Unified Digital Platform for Workforce Identity,
                    Welfare and Empowerment.
                  </h2>
                </div>

                {/* Feature Row */}
                <div className="newLoginFeatureRow">
                  <div className="newLoginFeatureBox">
                    <img src="/bss-brand/icon-trust.svg" alt="Trust" />
                    <h4 style={{ color: '#1E3A8A' }}>Trust</h4>
                    <p>Secure & Verified</p>
                  </div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox">
                    <img src="/bss-brand/icon-transparency.svg" alt="Transparency" />
                    <h4 style={{ color: '#F58220' }}>Transparency</h4>
                    <p>Clear & Accountable</p>
                  </div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox">
                    <img src="/bss-brand/icon-inclusivity.svg" alt="Inclusivity" />
                    <h4 style={{ color: '#009245' }}>Inclusivity</h4>
                    <p>For Every Worker</p>
                  </div>
                  <div className="newLoginFeatureDivider"></div>
                  <div className="newLoginFeatureBox">
                    <img src="/bss-brand/icon-empowerment.svg" alt="Empowerment" />
                    <h4 style={{ color: '#1E3A8A' }}>Empowerment</h4>
                    <p>Growth & Welfare</p>
                  </div>
                </div>
              </div>

              <div className="newLoginHeroBottom">
                {/* STATS BANNER */}
                <div className="newLoginStatsBanner">
                  <div className="newLoginStatsItem">
                    <div className="newLoginStatsIcon">
                      <img src="/bss-brand/icon-workers.svg" alt="" />
                    </div>
                    <div className="newLoginStatsContent">
                      <h4>50+ Crore</h4>
                      <p>Workers</p>
                    </div>
                  </div>
                  <div className="newLoginStatsDivider"></div>
                  <div className="newLoginStatsItem">
                    <div className="newLoginStatsIcon">
                      <img src="/bss-brand/icon-establishments.svg" alt="" />
                    </div>
                    <div className="newLoginStatsContent">
                      <h4>Millions</h4>
                      <p>Establishments</p>
                    </div>
                  </div>
                  <div className="newLoginStatsDivider"></div>
                  <div className="newLoginStatsItem">
                    <div className="newLoginStatsIcon">
                      <img src="/bss-brand/icon-platform.svg" alt="" />
                    </div>
                    <div className="newLoginStatsContent">
                      <h4>One Trusted</h4>
                      <p>Platform</p>
                    </div>
                  </div>
                  <div className="newLoginStatsDivider"></div>
                  <div className="newLoginStatsItem">
                    <div className="newLoginStatsIcon">
                      <img src="/bss-brand/icon-vision.svg" alt="" />
                    </div>
                    <div className="newLoginStatsContent">
                      <h4>One Nation</h4>
                      <p>One Vision</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Message */}
                <div className="newLoginBottomMessage">
                  <div className="newLoginTriLine"></div>
                  <p>Building a Stronger, Safer and Empowered Bharat</p>
                  <div className="newLoginTriLine"></div>
                </div>
              </div>
            </div>

            {/* FLIP CONTAINER */}
            <div className="perspective-1000 w-full max-w-[540px] mx-auto relative z-10">
              <div className={`relative w-full transition-transform duration-700 preserve-3d grid ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* FRONT FACE (LOGIN) */}
                <div className={`col-start-1 row-start-1 backface-hidden w-full flex flex-col justify-center ${isFlipped ? 'pointer-events-none z-0' : 'z-10'}`}>
                  <div className="bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15),_0_0_20px_-5px_rgba(0,0,0,0.05)] ring-1 ring-black/5 w-full overflow-hidden flex flex-col relative min-h-[520px]">
                    
                    {isForgotView ? (
                      <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="px-8 pt-8 pb-6 text-center relative border-b border-gray-100">
                          <button 
                            onClick={() => setIsForgotView(false)}
                            className="cursor-pointer absolute left-6 top-8 text-gray-400 hover:text-[#1E3A8A] transition-colors"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('credentialRecovery')}</h2>
                        </div>

                        <div className="px-8 py-8 flex-1 flex flex-col justify-center">
                          <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                              <KeyRound className="h-8 w-8 text-[#1E3A8A]" />
                            </div>
                            <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                              Enter your registered BSS ID or Mobile Number. We will send you a secure OTP to reset your credentials.
                            </p>
                          </div>

                          <div className="flex flex-col gap-4">
                            <input 
                              type="text" 
                              className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" 
                              placeholder="Enter BSS ID or Mobile" 
                            />
                            <button className="cursor-pointer mt-2 w-full bg-[#1E3A8A] hover:bg-[#152960] text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98]">
                              Send Reset OTP <ArrowRight className="ml-2 h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50/80 border-t border-gray-100 text-center mt-auto">
                          <p className="text-sm text-gray-600">
                            Remembered your password? <button onClick={() => setIsForgotView(false)} className="cursor-pointer text-[#1E3A8A] font-bold hover:underline">Login Here</button>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full animate-in slide-in-from-left-4 fade-in duration-300">
                        
                        <LanguageSelector currentLang={lang} onLangChange={setLang} />
                        
                        <button 
                          onClick={() => setIsFlipped(true)}
                          className="cursor-pointer absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-[#1E3A8A] transition-colors z-20 group border border-gray-100 shadow-sm"
                          title="Flip to Register"
                        >
                          <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        
                        <div className="px-6 pt-6 pb-4 text-center mt-2">
                          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('secureAuth')}</h2>
                        </div>

              <div className="px-6 pb-6 flex-1 flex flex-col">
                {/* ROLE SELECTOR (3x2 Compact Grid) */}
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('selectRole')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[...mainRoles, ...otherRoles].map(r => (
                      <button 
                        key={r.id} 
                        onClick={() => setSelectedRole(r.id)}
                        className={`cursor-pointer flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                          selectedRole === r.id 
                            ? 'border-[#1E3A8A]/40 bg-gradient-to-b from-blue-50 to-[#e0e7ff] text-[#1E3A8A] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transform translate-y-[2px]' 
                            : 'border-gray-200 bg-gradient-to-b from-white to-gray-50 text-gray-500 shadow-[0_3px_0_0_rgba(229,231,235,1),_0_5px_10px_-2px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] hover:shadow-[0_4px_0_0_rgba(229,231,235,1),_0_6px_12px_-2px_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(229,231,235,1),_0_2px_5px_-2px_rgba(0,0,0,0.1)]'
                        }`}
                      >
                        <r.icon 
                          className="h-5 w-5 mb-1.5" 
                          strokeWidth={2} 
                          style={{ filter: selectedRole === r.id ? 'drop-shadow(0px 1px 1px rgba(30,58,138,0.4))' : 'drop-shadow(0px 2px 2px rgba(0,0,0,0.15))' }} 
                        />
                        <span className="text-[12px] font-bold text-center leading-tight tracking-wide">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* LOGIN METHOD TABS & FORM */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('authenticate')}</label>
                  </div>
                  
                  {/* Sleek Underline Tabs */}
                  <div className="flex border-b border-gray-200 mb-4">
                    {['OTP', 'MPIN', 'Password'].map(method => (
                      <button 
                        key={method}
                        onClick={() => { setLoginMethod(method); setLoginError(''); setOtpSent(false); setOtp(''); setMpin(''); setLoginIdentifier(''); }}
                        className={`cursor-pointer flex-1 pb-2 text-[13px] font-semibold transition-all border-b-2 ${
                          loginMethod === method 
                            ? 'border-[#1E3A8A] text-[#1E3A8A]' 
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Natural Height Container */}
                  <div className="mt-2">
                    {loginMethod === 'OTP' && (
                      <div className="flex flex-col gap-4 w-full animate-in fade-in zoom-in-95 duration-200">
                        <input type="text" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} disabled={otpSent} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" placeholder={t('mobileOrEmail')} />
                        {otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] text-center tracking-[0.4em] font-bold outline-none focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10" placeholder="Six-digit OTP" />}
                        <button onClick={handleOtpLogin} className="mt-1 w-full bg-[#1E3A8A] hover:bg-[#152960] text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98] group cursor-pointer">
                          {otpSent ? t('secureLogin') : t('sendOtp')}
                          <span className="ml-2 relative flex items-center justify-center h-4 w-4">
                            <ArrowRight className="h-4 w-4 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                            <Fingerprint className="h-4 w-4 absolute text-emerald-300 opacity-0 scale-75 rotate-12 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0" />
                          </span>
                        </button>
                      </div>
                    )}

                    {loginMethod === 'MPIN' && (
                      <div className="flex flex-col gap-3 w-full animate-in fade-in zoom-in-95 duration-200">
                        <input type="text" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" placeholder={t('bssIdOrMobile')} />
                        
                        <div className="flex flex-col gap-1">
                          <input type="password" value={mpin} onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-base font-bold tracking-[0.5em] text-left shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-[13px] placeholder:text-gray-400 text-gray-800" placeholder={t('enterMpin')} />
                          <div className="flex justify-end px-1">
                            <button type="button" onClick={() => setIsForgotView(true)} className="cursor-pointer text-[12px] font-medium text-[#1E3A8A] hover:text-[#F58220] transition-colors">{t('forgotMpin')}</button>
                          </div>
                        </div>

                        <button onClick={handleMpinLogin} className="mt-1 w-full bg-[#1E3A8A] hover:bg-[#152960] text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98] group cursor-pointer">
                          {t('secureLogin')}
                          <span className="ml-2 relative flex items-center justify-center h-4 w-4">
                            <ShieldCheck className="h-4 w-4 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                            <Fingerprint className="h-4 w-4 absolute text-emerald-300 opacity-0 scale-75 rotate-12 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0" />
                          </span>
                        </button>
                      </div>
                    )}

                    {loginMethod === 'Password' && (
                      <div className="flex flex-col gap-3 w-full animate-in fade-in zoom-in-95 duration-200">
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" placeholder={t('officialBssId')} />
                        
                        <div className="flex flex-col gap-1">
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" placeholder={t('enterPassword')} />
                          <div className="flex justify-end px-1">
                            <button type="button" onClick={() => setIsForgotView(true)} className="cursor-pointer text-[12px] font-medium text-[#1E3A8A] hover:text-[#F58220] transition-colors">{t('forgotPassword')}</button>
                          </div>
                        </div>

                        <button onClick={handleLogin} className="mt-1 w-full bg-[#1E3A8A] hover:bg-[#152960] text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98] group cursor-pointer">
                          {t('authBtn')}
                          <span className="ml-2 relative flex items-center justify-center h-4 w-4">
                            <Lock className="h-4 w-4 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                            <Fingerprint className="h-4 w-4 absolute text-emerald-300 opacity-0 scale-75 rotate-12 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0" />
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  {loginError && <p role="alert" className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{loginError}</p>}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50/80 border-t border-gray-100 text-center mt-auto">
                <p className="text-sm text-gray-600">
                  {t('newToBss')} <button onClick={() => setIsFlipped(true)} className="cursor-pointer text-[#1E3A8A] font-bold hover:underline">{t('registerNow')}</button>
                </p>
              </div>
            </div>
            )}
          </div>
        </div>

          {/* BACK FACE (REGISTER) */}
          <div className={`col-start-1 row-start-1 backface-hidden w-full flex flex-col justify-center rotate-y-180 ${!isFlipped ? 'pointer-events-none z-0' : 'z-10'}`}>
            <RegisterForm onSwitchToLogin={() => setIsFlipped(false)} currentLang={lang} onLangChange={setLang} t={t} />
          </div>

        </div>
      </div>
          </div>
        </div>
        
        {/* LOWER FOOTER */}
        <footer className="w-full bg-white border-t border-gray-200 py-1.5 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between z-20 relative shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          
          {/* LEFT SIDE: Features */}
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-5 text-[11px] font-semibold text-gray-500">
            <div className="flex items-center gap-1.5 hover:text-[#1E3A8A] cursor-pointer transition-colors">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              Secure Platform
            </div>
            <div className="hidden md:block h-3 w-px bg-gray-300"></div>
            <div className="flex items-center gap-1.5 hover:text-[#1E3A8A] cursor-pointer transition-colors">
              <Landmark className="h-3.5 w-3.5 text-[#F58220]" />
              Digital Governance
            </div>
            <div className="hidden md:block h-3 w-px bg-gray-300"></div>
            <div className="flex items-center gap-1.5 hover:text-[#1E3A8A] cursor-pointer transition-colors">
              <Monitor className="h-3.5 w-3.5 text-[#1E3A8A]" />
              Accessible Anytime
            </div>
          </div>
          
          {/* RIGHT SIDE: Support & Copyright */}
          <div className="flex flex-wrap justify-center items-center gap-4 mt-2 md:mt-0 text-[11px]">
            <button className="cursor-pointer flex items-center gap-1.5 bg-[#F5F5F7] hover:bg-[#e4ffd4] hover:text-green-800 hover:border-green-300 text-gray-600 px-3.5 py-1 rounded-full font-bold transition-all border border-gray-200 shadow-sm active:scale-95 group">
              <img src="/bss-brand/whatsapp.svg" alt="WhatsApp" className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              Support
            </button>
            <div className="text-gray-400 font-medium">
              © {new Date().getFullYear()} BharatShramSetu. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
