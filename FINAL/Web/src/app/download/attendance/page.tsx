import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, Monitor, ShieldCheck, Terminal, Wifi } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download Attendance Client | Bharat Shram Setu',
  description: 'Download the BSS attendance client for Windows or Linux. The client runs on the site laptop and connects directly to local RTSP cameras.',
};

const WINDOWS_DEFAULT = '/downloads/attendance/BSS-Attendance-Windows-Setup.exe';
const LINUX_DEFAULT = '/downloads/attendance/BSS-Attendance-Linux.AppImage';

export default function AttendanceDownloadPage() {
  const windowsUrl = process.env.BSS_ATTENDANCE_WINDOWS_URL || WINDOWS_DEFAULT;
  const linuxUrl = process.env.BSS_ATTENDANCE_LINUX_URL || LINUX_DEFAULT;
  const version = process.env.BSS_ATTENDANCE_VERSION || '1.1.1';

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#0F172A]">
      <header className="border-b border-[#DBE4F0] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#01183A] text-white grid place-items-center text-xs font-extrabold tracking-wide">BSS</span>
            <span>
              <span className="block text-sm font-bold text-[#01183A]">Bharat Shram Setu</span>
              <span className="block text-[11px] text-[#64748B]">Attendance client download</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#01183A]">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F7B4F]">Site attendance</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#01183A]">Download the attendance client</h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            The client runs on the site laptop and connects directly to your DVR/CCTV cameras over RTSP.
            Live video stays on the laptop. Only camera health and face embeddings are sent to BSS.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="rounded-2xl border border-[#DBE4F0] bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#EEF4FF] text-[#1D4ED8] grid place-items-center"><Monitor size={22} /></div>
            <h2 className="mt-4 text-lg font-bold text-[#01183A]">Windows</h2>
            <p className="mt-1 text-xs text-[#64748B]">Windows 10 or 11 · 64-bit · 4 GB RAM recommended</p>
            <a href={windowsUrl} target="_blank" rel="noopener noreferrer"
              className="mt-5 h-11 w-full rounded-xl bg-[#01183A] text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-black transition-colors">
              <Download size={16} /> Download Windows installer
            </a>
            <p className="mt-2 text-[11px] text-[#64748B]">64-bit installer. If the download does not start, contact BSS support.</p>
          </article>

          <article className="rounded-2xl border border-[#DBE4F0] bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#F1F5F9] text-[#0F172A] grid place-items-center"><Terminal size={22} /></div>
            <h2 className="mt-4 text-lg font-bold text-[#01183A]">Linux</h2>
            <p className="mt-1 text-xs text-[#64748B]">Ubuntu 22.04 or newer · x86_64 · AppImage / DEB</p>
            <a href={linuxUrl} target="_blank" rel="noopener noreferrer"
              className="mt-5 h-11 w-full rounded-xl border border-[#01183A]/20 bg-white text-[#01183A] text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#F8FAFC] transition-colors">
              <Download size={16} /> Download Linux package
            </a>
            <p className="mt-2 text-[11px] text-[#64748B]">x86_64 AppImage. If the download does not start, contact BSS support.</p>
          </article>
        </div>

        {version && <p className="mt-4 text-xs text-[#64748B]">Current client version: <strong className="text-[#01183A]">{version}</strong></p>}

        <section className="mt-10 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Before you start</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#475569]">
            <div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0F7B4F]" /><p><strong className="text-[#0F172A]">Activation is required.</strong><br />Use the employer-owner mobile number and OTP, then select the site from the list.</p></div>
            <div className="flex gap-3"><Wifi size={18} className="mt-0.5 shrink-0 text-[#1D4ED8]" /><p><strong className="text-[#0F172A]">Local RTSP only.</strong><br />Enter the RTSP URL of each camera on the site laptop. It is never sent to BSS.</p></div>
            <div className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#0F7B4F]" /><p><strong className="text-[#0F172A]">Two modes per camera.</strong><br />Live only shows local video. Send data enables face embeddings for attendance.</p></div>
            <div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#A15C00]" /><p><strong className="text-[#0F172A]">Set the camera IP in BSS.</strong><br />The employer must allowlist the camera&apos;s public static IPv4 and configure its capture window.</p></div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
          <span>Need help? Contact BSS support from the employer portal.</span>
        </div>
      </section>
    </main>
  );
}
