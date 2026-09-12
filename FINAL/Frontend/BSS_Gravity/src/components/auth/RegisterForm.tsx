"use client";

import { useState } from "react";
import { 
  HardHat, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  BadgeCheck, 
  Landmark, 
  ArrowRight,
  Fingerprint,
  RefreshCw
} from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { useRouter } from "next/navigation";
import type { Language } from '@/i18n';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  currentLang: Language;
  onLangChange: (code: Language) => void;
  t: (key: string) => string;
}

export default function RegisterForm({ onSwitchToLogin, currentLang, onLangChange, t }: RegisterFormProps) {
  const [selectedRole, setSelectedRole] = useState("Worker");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarRef, setAadhaarRef] = useState("");
  const [step, setStep] = useState<"details" | "otp" | "aadhaar" | "aadhaar-otp">("details");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const isSelfService = ['Worker', 'Contractor', 'Employer'].includes(selectedRole);

  const requestOtp = async () => {
    setError("");
    if (!isSelfService) return setError("This role requires administrator approval. Please contact BSS support.");
    if (!/^[6-9]\d{9}$/.test(contact.trim())) return setError("Enter a valid 10-digit Indian mobile number.");
    setIsCreating(true);
    try {
      const response = await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'request-otp', role:selectedRole, identifier:contact }) });
      const result = await response.json() as { error?:string };
      if (!response.ok) throw new Error(result.error ?? 'OTP could not be sent.');
      setStep("otp");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'OTP could not be sent.'); }
    finally { setIsCreating(false); }
  };
  const completeRegistration = async () => {
    if (otp.length !== 6) return setError("Enter the six-digit verification code.");
    setError(""); setIsCreating(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role:selectedRole, contact, otp, acceptedTerms:agreedToTerms }) });
      const result = (await response.json()) as { bssId?: string; redirectTo?:string; error?: string };
      if (!response.ok || !result.bssId) throw new Error(result.error || `${selectedRole} ID could not be issued.`);
      router.replace(result.redirectTo ?? "/");
      router.refresh();
    } catch (issuanceError) { setError(issuanceError instanceof Error ? issuanceError.message : "Registration could not be completed."); }
    finally { setIsCreating(false); }
  };
  const startAadhaar = () => {
    setError("");
    if (selectedRole !== "Worker") return setError("Aadhaar eKYC onboarding is available for workers. Organisation roles register with mobile OTP.");
    setStep("aadhaar");
  };
  const sendAadhaarOtp = async () => {
    if (selectedRole !== "Worker") return setError("Aadhaar eKYC onboarding is available for workers. Organisation roles register with mobile OTP.");
    if (!/^[6-9]\d{9}$/.test(contact.trim())) return setError("Enter a valid 10-digit Indian mobile number — it is your login and contact number.");
    if (!/^\d{12}$/.test(aadhaar)) return setError("Enter a valid 12-digit Aadhaar number.");
    setError(""); setIsCreating(true);
    try {
      const response = await fetch('/api/auth/aadhaar/otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ aadhaar }) });
      const result = await response.json() as { referenceId?: string; error?: string };
      if (!response.ok || !result.referenceId) throw new Error(result.error ?? 'Aadhaar OTP could not be sent.');
      setAadhaarRef(result.referenceId);
      setStep("aadhaar-otp");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Aadhaar OTP could not be sent.'); }
    finally { setIsCreating(false); }
  };
  const verifyAadhaar = async () => {
    if (aadhaarOtp.length !== 6) return setError("Enter the six-digit verification code.");
    setError(""); setIsCreating(true);
    try {
      const response = await fetch("/api/auth/aadhaar/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar, referenceId: aadhaarRef, otp: aadhaarOtp, acceptedTerms: agreedToTerms, contact: contact.trim() }) });
      const result = (await response.json()) as { bssId?: string; redirectTo?: string; error?: string };
      if (!response.ok || !result.bssId) throw new Error(result.error || "Worker ID could not be issued.");
      router.replace(result.redirectTo ?? "/worker/Profile");
      router.refresh();
    } catch (issuanceError) { setError(issuanceError instanceof Error ? issuanceError.message : "Worker ID could not be issued."); }
    finally { setIsCreating(false); }
  };

  const roles = [
    { id: 'Worker', icon: HardHat, label: t('worker') },
    { id: 'Contractor', icon: Briefcase, label: t('contractor') },
    { id: 'Employer', icon: Building2, label: t('employer') },
    { id: 'Government', icon: Landmark, label: t('government') },
    { id: 'BSS_Staff', icon: BadgeCheck, label: t('bssStaff') },
    { id: 'BSS_Admin', icon: ShieldCheck, label: t('bssAdmin') },
  ];

  return (
    <div className="bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15),_0_0_20px_-5px_rgba(0,0,0,0.05)] ring-1 ring-black/5 w-full overflow-hidden flex flex-col relative min-h-[520px]">
      
      <LanguageSelector currentLang={currentLang} onLangChange={onLangChange} />
      
      <button 
        onClick={onSwitchToLogin}
        className="cursor-pointer absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-[#1E3A8A] transition-colors z-20 group border border-gray-100 shadow-sm"
        title="Flip to Login"
      >
        <RefreshCw className="h-4 w-4 group-hover:-rotate-180 transition-transform duration-500" />
      </button>

      <div className="px-6 pt-6 pb-4 text-center mt-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('portalReg')}</h2>
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col">
        
        {/* ROLE SELECTOR (3x2 Compact Grid) */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t('selectRole')}</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button 
                key={r.id} 
                onClick={() => { setSelectedRole(r.id); setStep("details"); setError(""); setOtp(""); }}
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

        {/* DETAILS */}
        <div className="flex-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t('register')}</label>
          
          <div className="flex flex-col gap-3">
            {(step === "details" || step === "otp" || step === "aadhaar" || step === "aadhaar-otp") && (
              <>
                <input 
                  type="text" 
                  className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" 
                  placeholder={(step === "aadhaar" || step === "aadhaar-otp") ? "10-digit mobile number" : t('mobileOrEmail')} 
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  disabled={step === "otp" || step === "aadhaar-otp"}
                />
                {step === "otp" && (<div className="mb-4"><label className="text-[11px] font-bold text-gray-500 uppercase">Verification code</label><input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit OTP" className="mt-2 w-full bg-[#F5F5F7] border rounded-xl px-3.5 py-2.5 text-center tracking-[0.4em] font-bold"/></div>)}
              </>
            )}

            {(step === "aadhaar" || step === "aadhaar-otp") && (
              <>
                <input 
                  type="text" 
                  inputMode="numeric"
                  className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] tracking-[0.15em] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" 
                  placeholder="12-digit Aadhaar number" 
                  value={aadhaar}
                  onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0,12))}
                  disabled={step === "aadhaar-otp"}
                />
                {step === "aadhaar-otp" && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Verification code</label>
                    <input value={aadhaarOtp} onChange={e=>setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit OTP" className="mt-2 w-full bg-[#F5F5F7] border rounded-xl px-3.5 py-2.5 text-center tracking-[0.4em] font-bold"/>
                    <div className="flex justify-between items-center mt-2">
                      <button type="button" onClick={() => setStep("aadhaar")} className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-[#1E3A8A] transition-colors">‹ Edit</button>
                      <button type="button" onClick={sendAadhaarOtp} disabled={isCreating} className="cursor-pointer text-xs font-semibold text-[#1E3A8A] hover:underline">Resend OTP</button>
                    </div>
                  </div>
                )}
                {step === "aadhaar" && (
                  <button type="button" onClick={() => setStep("details")} className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-[#1E3A8A] self-start transition-colors">‹ Use mobile number instead</button>
                )}
              </>
            )}

            {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
            
            <div className="flex items-start gap-2 mt-2">
              <input 
                type="checkbox" 
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 text-[#1E3A8A] bg-gray-100 border-gray-300 rounded focus:ring-[#1E3A8A] focus:ring-2 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-500 leading-snug cursor-pointer pt-0.5">
                I agree to the <a href="/policy" target="_blank" className="text-[#1E3A8A] hover:underline">Privacy Policy</a>, <a href="/data-sharing" target="_blank" className="text-[#1E3A8A] hover:underline">Data Sharing Policy</a>, and <a href="/terms" target="_blank" className="text-[#1E3A8A] hover:underline">Terms & Conditions</a>.
              </label>
            </div>

            <button 
              disabled={!agreedToTerms || isCreating || (step === "aadhaar" && !/^\d{12}$/.test(aadhaar))}
              onClick={step === "details" ? requestOtp : step === "otp" ? completeRegistration : step === "aadhaar" ? sendAadhaarOtp : verifyAadhaar}
              type="button"
              className={`mt-1 w-full text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all group ${
                agreedToTerms 
                  ? "cursor-pointer bg-[#1E3A8A] hover:bg-[#152960] shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98]" 
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isCreating ? "Please wait…" : step === "details" ? t('sendOtp') : step === "otp" ? `Verify & create ${selectedRole} ID` : step === "aadhaar" ? "Send OTP to Aadhaar-linked mobile" : "Verify Aadhaar & create Worker ID"}
              <span className="ml-2 relative flex items-center justify-center h-4 w-4">
                <ArrowRight className="h-4 w-4 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                <Fingerprint className="h-4 w-4 absolute text-emerald-300 opacity-0 scale-75 rotate-12 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0" />
              </span>
            </button>
          </div>

          {/* ALTERNATIVE LOGIN */}
          {(step === "details" || step === "otp") && (<>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('orRegisterWith')}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => window.open('https://wa.me/919650887008?text=Hello', '_blank')} className="cursor-pointer flex flex-col items-center justify-center py-2 px-2 rounded-[14px] border border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition-all shadow-sm active:scale-95 group">
              <img src="/bss-brand/whatsapp.svg" alt="WhatsApp" className="h-6 w-6 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-[12px] font-bold">{t('whatsapp')}</span>
            </button>
            
            <button type="button" onClick={startAadhaar} className="cursor-pointer flex flex-col items-center justify-center py-2 px-2 rounded-[14px] border border-gray-200 bg-white text-gray-600 hover:border-[#1E3A8A] hover:bg-blue-50 hover:text-[#1E3A8A] transition-all shadow-sm active:scale-95 group">
              <img src="/bss-brand/aadhaar.svg" alt="Aadhaar" className="h-6 w-6 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-[12px] font-bold">{t('aadhaar')}</span>
            </button>
            
            <button type="button" onClick={() => window.location.href = 'tel:9650887008'} className="cursor-pointer flex flex-col items-center justify-center py-2 px-2 rounded-[14px] border border-gray-200 bg-white text-gray-600 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 transition-all shadow-sm active:scale-95 group">
              <img src="/bss-brand/call.svg" alt="Call Us" className="h-6 w-6 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-[12px] font-bold">{t('callUs')}</span>
            </button>
          </div>
          </>)}
        </div>
      </div>

      <div className="p-4 bg-gray-50/80 border-t border-gray-100 text-center mt-auto">
        <p className="text-sm text-gray-600">
          {t('alreadyHaveAccount')} <button onClick={onSwitchToLogin} className="cursor-pointer text-[#1E3A8A] font-bold hover:underline">{t('loginHere')}</button>
        </p>
      </div>
    </div>
  );
}
