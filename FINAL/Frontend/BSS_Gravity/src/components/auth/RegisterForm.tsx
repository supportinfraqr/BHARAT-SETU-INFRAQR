"use client";

import { useEffect, useState } from "react";
import { 
  HardHat, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  BadgeCheck, 
  Landmark, 
  ArrowRight,
  Fingerprint,
  RefreshCw,
  Building,
  KeyRound,
  Lock,
  UserCheck,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { ResendOtp } from "@/components/auth/ResendOtp";
import { useRouter } from "next/navigation";
import type { Language } from '@/i18n';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  currentLang: Language;
  onLangChange: (code: Language) => void;
  t: (key: string) => string;
}

const DEMO_MOBILES = ['2222222222', '3333333333', '4444444444'];

export default function RegisterForm({ onSwitchToLogin, currentLang, onLangChange, t }: RegisterFormProps) {
  const [selectedRole, setSelectedRole] = useState("Contractor");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarRef, setAadhaarRef] = useState("");
  
  // EntityLocker state for Contractor & Employer
  const [entityAuthType, setEntityAuthType] = useState<"GSTIN" | "MCA21" | "PAN">("GSTIN");
  const [entityNumber, setEntityNumber] = useState("");
  const [entityOrgName, setEntityOrgName] = useState("");
  const [isEntityVerified, setIsEntityVerified] = useState(false);

  // Set up Username and MPIN state
  const [username, setUsername] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");

  const [step, setStep] = useState<"entity-locker" | "setup-mpin" | "details" | "otp" | "aadhaar" | "aadhaar-otp">("entity-locker");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const isOrgRole = ['Contractor', 'Employer'].includes(selectedRole);
  const isSelfService = ['Worker', 'Contractor', 'Employer'].includes(selectedRole);

  const handleEntityLockerVerify = async () => {
    setError(""); setNotice("");
    const val = entityNumber.trim().toUpperCase();
    if (!val) {
      return setError(`Please enter a valid ${entityAuthType} number.`);
    }

    if (entityAuthType === "GSTIN" && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(val)) {
      return setError("Invalid GSTIN format. Example: 27AAAAA0000A1Z5");
    }
    if (entityAuthType === "MCA21" && !/^[LU]\d{5}[A-Z]{2}\d{4}[PLC]{3}\d{6}$/.test(val)) {
      return setError("Invalid MCA21 CIN format. Example: L12345MH2020PLC123456");
    }
    if (entityAuthType === "PAN" && !/^[A-Z]{3}[CFFHLAJPT]{1}[A-Z]{1}\d{4}[A-Z]{1}$/.test(val)) {
      return setError("Invalid Company PAN format. Example: ABCDE1234F");
    }

    setIsCreating(true);
    try {
      // Persist the draft so it survives the EntityLocker consent redirect.
      try {
        sessionStorage.setItem('bss_entity_draft', JSON.stringify({
          selectedRole, entityAuthType, entityNumber: val,
        }));
        sessionStorage.removeItem('bss_entity_result');
      } catch { /* storage unavailable — continue */ }
      const response = await fetch('/api/entitylocker/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole.toLowerCase(), idType: entityAuthType, idValue: val }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { url?: string }; error?: string };
      if (!response.ok || !body.data?.url) throw new Error(body.error || 'EntityLocker could not be started.');
      window.location.href = body.data.url;   // browser goes to EntityLocker consent
    } catch (err) {
      setError(err instanceof Error ? err.message : "EntityLocker verification failed. Please re-check the number.");
      setIsCreating(false);
    }
  };

  // Resume after the EntityLocker consent redirect (?entityVerified=1&entityName=…).
  /* eslint-disable react-hooks/set-state-in-effect -- one-time resume after the OAuth redirect */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('entityVerified');
    if (!flag) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem('bss_entity_draft') || 'null') as
        { selectedRole?: string; entityAuthType?: "GSTIN" | "MCA21" | "PAN"; entityNumber?: string } | null;
      if (draft) {
        if (draft.selectedRole) setSelectedRole(draft.selectedRole);
        if (draft.entityAuthType) setEntityAuthType(draft.entityAuthType);
        if (draft.entityNumber) setEntityNumber(draft.entityNumber);
      }
      if (flag === '1') {
        const name = params.get('entityName') || '';
        const by = params.get('verifiedBy') || '';
        setEntityOrgName(name);
        setIsEntityVerified(true);
        setNotice(`EntityLocker Verified: ${name}${by ? ` (${by})` : ''}`);
        setStep('setup-mpin');
      } else {
        setError(params.get('message') || 'EntityLocker verification failed.');
      }
      sessionStorage.removeItem('bss_entity_draft');
    } catch { /* ignore */ }
    // Strip the query so a refresh doesn't re-trigger.
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSetupUsernameMpin = async () => {
    setError("");
    const userTrim = username.trim();
    if (userTrim.length < 4) return setError("Username must be at least 4 characters.");
    if (!/^\d{4,6}$/.test(mpin)) return setError("MPIN must be 4 to 6 digits.");
    if (mpin !== confirmMpin) return setError("MPIN and Confirm MPIN do not match.");
    if (!agreedToTerms) return setError("You must accept the terms and privacy policy.");

    setIsCreating(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          contact: userTrim,
          otp: "111111", // Auto-validated for EntityLocker onboarded accounts
          acceptedTerms: agreedToTerms,
          entityAuthType,
          entityNumber: entityNumber.trim().toUpperCase(),
          entityOrgName,
          username: userTrim,
          mpin,
        })
      });
      const result = (await response.json()) as { bssId?: string; redirectTo?: string; error?: string };
      if (!response.ok || !result.bssId) throw new Error(result.error || `${selectedRole} Registration failed.`);
      
      // Save session MPIN if endpoint available
      await fetch('/api/auth/mpin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', mpin })
      }).catch(() => null);

      setNotice("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.replace(selectedRole === "Employer" ? "/employer/dashboard" : "/contractor/dashboard");
        router.refresh();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setIsCreating(false);
    }
  };

  const sendRegisterOtp = async () => {
    const response = await fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'request-otp', mode:'register', role:selectedRole, identifier:contact }) });
    const result = await response.json() as { error?:string };
    if (!response.ok) throw new Error(result.error ?? 'OTP could not be sent.');
  };
  const requestOtp = async () => {
    setError("");
    if (!isSelfService) return setError("This role requires administrator approval. Please contact BSS support.");
    if (!/^[6-9]\d{9}$/.test(contact.trim()) && !DEMO_MOBILES.includes(contact.trim())) return setError("Enter a valid 10-digit Indian mobile number.");
    setIsCreating(true);
    try {
      await sendRegisterOtp();
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
    if (selectedRole !== "Worker") return setError("Aadhaar eKYC onboarding is available for workers.");
    setStep("aadhaar");
  };
  const sendAadhaarOtp = async () => {
    if (!/^\d{12}$/.test(aadhaar)) return setError("Enter a valid 12-digit Aadhaar number.");
    setError(""); setNotice(""); setIsCreating(true);
    try {
      const response = await fetch('/api/auth/aadhaar/otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ aadhaar }) });
      const result = await response.json() as { referenceId?: string; error?: string; message?: string; reused?: boolean };
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
      const response = await fetch("/api/auth/aadhaar/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aadhaar, referenceId: aadhaarRef, otp: aadhaarOtp, acceptedTerms: agreedToTerms }) });
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
                onClick={() => { 
                  setSelectedRole(r.id); 
                  setStep(['Contractor', 'Employer'].includes(r.id) ? "entity-locker" : "details"); 
                  setError(""); setNotice(""); setOtp(""); 
                }}
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

        {/* DETAILS SECTION */}
        <div className="flex-1">

          {/* CONTRACTOR / EMPLOYER ENTITYLOCKER REGISTRATION */}
          {isOrgRole && step === "entity-locker" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                <Building className="h-5 w-5 text-[#1E3A8A] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#1E3A8A]">EntityLocker Business Verification</p>
                  <p className="text-[10.5px] text-gray-600">Register {selectedRole} using official Government Organization Credentials.</p>
                </div>
              </div>

              {/* THREE ENTITY OPTIONS */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Select Entity Verification Document</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEntityAuthType("GSTIN")}
                    className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      entityAuthType === "GSTIN"
                        ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <FileCheck size={14} />
                    <span>GSTN Number</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntityAuthType("MCA21")}
                    className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      entityAuthType === "MCA21"
                        ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Building size={14} />
                    <span>MCA21 (CIN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntityAuthType("PAN")}
                    className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      entityAuthType === "PAN"
                        ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <BadgeCheck size={14} />
                    <span>Company PAN</span>
                  </button>
                </div>
              </div>

              {/* INPUT VALUE */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">
                  Enter {entityAuthType === "GSTIN" ? "15-Digit GSTN Number" : entityAuthType === "MCA21" ? "21-Digit Corporate Identity Number (CIN)" : "10-Digit Company PAN Card"}
                </label>
                <input
                  type="text"
                  value={entityNumber}
                  onChange={e => setEntityNumber(e.target.value.toUpperCase())}
                  placeholder={entityAuthType === "GSTIN" ? "e.g. 27AAAAA0000A1Z5" : entityAuthType === "MCA21" ? "e.g. L12345MH2020PLC123456" : "e.g. ABCDE1234F"}
                  className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] tracking-wide font-mono uppercase font-semibold text-gray-800 focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 outline-none"
                />
              </div>

              {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}

              <button
                type="button"
                onClick={handleEntityLockerVerify}
                disabled={isCreating || !entityNumber.trim()}
                className="w-full text-white bg-[#1E3A8A] hover:bg-[#152960] rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isCreating ? "Verifying with EntityLocker…" : `Verify ${entityAuthType} & Continue`}
                <ArrowRight size={16} />
              </button>

              <p className="text-[11px] text-gray-400 text-center">Powered by API Setu · EntityLocker Business Gateway</p>
            </div>
          )}

          {/* STEP 2 FOR CONTRACTOR & EMPLOYER: SET UP MPIN & USERNAME */}
          {isOrgRole && step === "setup-mpin" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Entity Verified: {entityOrgName}</p>
                  <p className="text-[10.5px] text-emerald-700">{entityAuthType}: {entityNumber}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-[#1E3A8A]" />
                  Set up Username and Secure MPIN
                </p>

                {/* USERNAME */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Create Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="e.g. buildwell_admin"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#1E3A8A]/20 outline-none"
                    />
                  </div>
                </div>

                {/* MPIN */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Create MPIN (4-6 digits)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={mpin}
                      onChange={e => setMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4-6 Digits"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-center tracking-[0.3em] font-bold text-xs focus:ring-2 focus:ring-[#1E3A8A]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Confirm MPIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmMpin}
                      onChange={e => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Re-enter"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-center tracking-[0.3em] font-bold text-xs focus:ring-2 focus:ring-[#1E3A8A]/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
              {notice && <p role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">{notice}</p>}

              <div className="flex items-start gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="terms-org"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#1E3A8A] rounded border-gray-300 focus:ring-[#1E3A8A] cursor-pointer"
                />
                <label htmlFor="terms-org" className="text-xs text-gray-500 leading-snug cursor-pointer">
                  I accept the <a href="/policy" target="_blank" className="text-[#1E3A8A] hover:underline">Privacy Policy</a> and <a href="/terms" target="_blank" className="text-[#1E3A8A] hover:underline">Terms & Conditions</a>.
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("entity-locker")}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  ‹ Change Details
                </button>
                <button
                  type="button"
                  disabled={!agreedToTerms || isCreating || !username || mpin.length < 4 || mpin !== confirmMpin}
                  onClick={handleSetupUsernameMpin}
                  className="flex-1 bg-[#1E3A8A] hover:bg-[#152960] text-white rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? "Setting up Account…" : `Complete Setup & Login`}
                  <KeyRound size={15} />
                </button>
              </div>
            </div>
          )}

          {/* WORKER / STANDARD MOBILE REGISTRATION */}
          {!isOrgRole && (step === "details" || step === "otp") && (
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all placeholder:text-[13px] placeholder:text-gray-400 font-medium text-gray-800" 
                placeholder={t('mobileOrEmail')} 
                value={contact}
                onChange={e => setContact(e.target.value)}
                disabled={step === "otp"}
              />
              {step === "otp" && (
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Verification code</label>
                  <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit OTP" className="mt-2 w-full bg-[#F5F5F7] border rounded-xl px-3.5 py-2.5 text-center tracking-[0.4em] font-bold"/>
                  <ResendOtp onSend={sendRegisterOtp} className="mt-1 text-center"/>
                </div>
              )}

              {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
              {notice && <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg p-2.5">{notice}</p>}
              
              <div className="flex items-start gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 text-[#1E3A8A] bg-gray-100 border-gray-300 rounded focus:ring-[#1E3A8A] focus:ring-2 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-snug cursor-pointer pt-0.5">
                  I agree to the <a href="/policy" target="_blank" className="text-[#1E3A8A] hover:underline">Privacy Policy</a> and <a href="/terms" target="_blank" className="text-[#1E3A8A] hover:underline">Terms & Conditions</a>.
                </label>
              </div>

              <button 
                disabled={!agreedToTerms || isCreating}
                onClick={step === "details" ? requestOtp : completeRegistration}
                type="button"
                className={`mt-1 w-full text-white rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center transition-all group ${
                  agreedToTerms 
                    ? "cursor-pointer bg-[#1E3A8A] hover:bg-[#152960] shadow-[0_4px_14px_0_rgba(30,58,138,0.39)] hover:shadow-[0_6px_20px_rgba(30,58,138,0.23)] hover:-translate-y-[1px] active:scale-[0.98]" 
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {isCreating ? "Please wait…" : step === "details" ? t('sendOtp') : `Verify & create ${selectedRole} ID`}
                <span className="ml-2 relative flex items-center justify-center h-4 w-4">
                  <ArrowRight className="h-4 w-4 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" />
                  <Fingerprint className="h-4 w-4 absolute text-emerald-300 opacity-0 scale-75 rotate-12 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0" />
                </span>
              </button>
            </div>
          )}

          {/* WORKER AADHAAR eKYC */}
          {!isOrgRole && (step === "aadhaar" || step === "aadhaar-otp") && (
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                inputMode="numeric"
                className="w-full bg-[#F5F5F7] border border-gray-200/80 rounded-[12px] px-3.5 py-2.5 text-[13px] tracking-[0.15em] shadow-[inset_0_2px_5px_rgba(0,0,0,0.04)] focus:bg-white focus:ring-[3px] focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A]/30 outline-none transition-all font-medium text-gray-800" 
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
                    <ResendOtp onSend={sendAadhaarOtp} />
                  </div>
                </div>
              )}
              {step === "aadhaar" && (
                <button type="button" onClick={() => setStep("details")} className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-[#1E3A8A] self-start transition-colors">‹ Use mobile number instead</button>
              )}

              {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}

              <div className="flex items-start gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="terms-aadhaar"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#1E3A8A] bg-gray-100 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="terms-aadhaar" className="text-xs text-gray-500 leading-snug cursor-pointer pt-0.5">
                  I agree to the <a href="/policy" target="_blank" className="text-[#1E3A8A] hover:underline">Privacy Policy</a> and <a href="/terms" target="_blank" className="text-[#1E3A8A] hover:underline">Terms & Conditions</a>.
                </label>
              </div>

              <button 
                disabled={!agreedToTerms || isCreating || (step === "aadhaar" && !/^\d{12}$/.test(aadhaar))}
                onClick={step === "aadhaar" ? sendAadhaarOtp : verifyAadhaar}
                type="button"
                className="mt-1 w-full text-white bg-[#1E3A8A] hover:bg-[#152960] rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold flex items-center justify-center"
              >
                {isCreating ? "Please wait…" : step === "aadhaar" ? "Send OTP to Aadhaar-linked mobile" : "Verify Aadhaar & create Worker ID"}
              </button>
            </div>
          )}

          {/* ALTERNATIVE LOGIN FOR WORKERS */}
          {!isOrgRole && (step === "details" || step === "otp") && (
            <>
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
            </>
          )}

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

