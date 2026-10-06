"use client";
import { useRouter } from 'next/navigation';
import RegisterForm from '@/components/auth/RegisterForm';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router=useRouter(); const {language,setLanguage,t}=useLanguage();
  return <main className="min-h-screen bg-[#F3F6FA] lg:grid lg:grid-cols-[minmax(360px,0.92fr)_minmax(480px,1.08fr)]"><section className="relative hidden lg:flex overflow-hidden bg-[#082F55] px-12 py-10 text-white flex-col justify-between"><div className="absolute inset-0 opacity-20 bg-[url('/login-bg.png')] bg-cover bg-center"/><div className="absolute inset-0 bg-gradient-to-br from-[#073B67]/70 via-[#073B67]/90 to-[#041F39]"/><div className="relative flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-white p-1.5"><img src="/bss-original-logo.png" alt="Bharat Shram Setu" className="w-full h-full object-contain"/></div><div><p className="font-bold tracking-[0.08em]">BHARAT SHRAM SETU</p><p className="text-[11px] text-white/60 tracking-wider">ONE NATION · ONE WORKER ID</p></div></div><div className="relative max-w-xl"><ShieldCheck size={34} className="text-blue-200"/><h1 className="mt-6 text-4xl xl:text-5xl font-semibold tracking-[-0.035em] leading-[1.08]">Your work identity should move with you.</h1><p className="mt-5 text-base text-blue-100/75 leading-relaxed">Register once to carry verified skills, documents, compliance and employment history across opportunities.</p></div><p className="relative text-xs text-white/50">Consent-led · Role-protected · Worker controlled</p></section><section className="min-h-screen flex flex-col px-4 sm:px-8 lg:px-12 py-5 sm:py-8"><header className="w-full max-w-[560px] mx-auto flex justify-end"><LanguageSelect compact/></header><div className="flex-1 w-full max-w-[560px] mx-auto flex items-center py-8"><div className="w-full"><RegisterForm onSwitchToLogin={()=>router.push('/')} currentLang={language} onLangChange={setLanguage} t={t}/></div></div></section></main>;
}
