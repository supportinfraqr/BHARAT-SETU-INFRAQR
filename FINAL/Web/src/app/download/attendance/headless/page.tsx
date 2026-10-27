import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, HardDrive, Server, ShieldCheck, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Headless Linux Attendance Engine | Bharat Shram Setu',
  description: 'Run the BSS attendance engine on a headless Ubuntu server with systemd and a local CLI.',
};

const HEADLESS_DEFAULT = '/downloads/attendance/BSS-Attendance-Headless-Linux-x86_64.tar.gz';

const commands = [
  ['Install', 'tar -xzf BSS-Attendance-<version>-Headless-Linux-x86_64.tar.gz\ncd bss-attendance\nsudo ./install-headless.sh'],
  ['Check status', 'sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance status'],
  ['Activation', 'bss-attendancectl activate request --phone 9999999999\nbss-attendancectl activate verify --phone 9999999999 --otp 123456\nbss-attendancectl activate complete --token <token> --name "NOIDA server"'],
  ['Add camera', 'bss-attendancectl camera test --rtsp "rtsp://user:pass@camera/stream"\nbss-attendancectl camera add --label "Main Gate" --site BSS... --rtsp "rtsp://user:pass@camera/stream"'],
  ['Live view', 'ssh -N -L 8765:127.0.0.1:8765 user@server\n# then open http://127.0.0.1:8765/stream/1'],
  ['Backup', 'sudo -u bss /opt/bss-attendance/bss-attendancectl --home /var/lib/bss-attendance backup --output /var/backups/bss-attendance'],
];

export default function HeadlessAttendancePage() {
  const headlessUrl = process.env.BSS_ATTENDANCE_HEADLESS_URL || HEADLESS_DEFAULT;
  const version = process.env.BSS_ATTENDANCE_VERSION || '';
  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#0F172A]">
      <header className="border-b border-[#DBE4F0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/bss-original-logo.png" alt="Bharat Shram Setu" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
            <span><span className="block text-sm font-bold text-[#01183A]">Bharat Shram Setu</span><span className="block text-[11px] text-[#64748B]">Headless attendance engine</span></span>
          </Link>
          <Link href="/download/attendance" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#01183A]"><ArrowLeft size={14} /> Client downloads</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F7B4F]">Linux server deployment</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#01183A]">Headless attendance engine</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475569]">
          Run the BSS attendance engine on an Ubuntu server without a desktop, Tauri UI, tray, or display server. The engine handles RTSP cameras, face matching, local event storage, and BSS sync. The local API stays bound to 127.0.0.1.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={headlessUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#01183A] px-5 text-sm font-bold text-white hover:bg-black"><Download size={16} /> Download Linux headless bundle</a>
          <span className="inline-flex h-11 items-center rounded-xl border border-[#DBE4F0] bg-white px-5 text-sm font-bold text-[#01183A]">{version ? `Version ${version}` : 'Linux x86_64'}</span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Server, title: 'Engine only', text: 'Sidecar, models, CLI, systemd unit, installer, and backup helper. No desktop UI.' },
            { icon: Terminal, title: 'Local control', text: 'bss-attendancectl wraps activation, cameras, resources, workers, diagnostics, and backups.' },
            { icon: ShieldCheck, title: 'Server-safe', text: 'Binds to localhost by default. Live view is accessed through an SSH tunnel.' },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm">
              <Icon size={21} className="text-[#0F7B4F]" />
              <h2 className="mt-3 text-sm font-bold text-[#01183A]">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{text}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Requirements</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#475569] md:grid-cols-2">
            <p><strong className="text-[#0F172A]">OS:</strong> Ubuntu 22.04/24.04 x86_64</p>
            <p><strong className="text-[#0F172A]">Resources:</strong> 4 GB RAM minimum, 3 GB free disk</p>
            <p><strong className="text-[#0F172A]">Network:</strong> outbound HTTPS to BSS and local RTSP reachability</p>
            <p><strong className="text-[#0F172A]">GPU:</strong> optional NVIDIA GPU; CPU fallback supported</p>
            <p><strong className="text-[#0F172A]">Access:</strong> root for install; SSH tunnel for remote live view</p>
            <p><strong className="text-[#0F172A]">Camera:</strong> employer-approved and public-IP allowlisted in BSS</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Quick start</h2>
          <div className="mt-4 space-y-4">
            {commands.map(([title, command]) => (
              <div key={title}>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#01183A]"><CheckCircle2 size={14} className="text-[#0F7B4F]" />{title}</div>
                <pre className="overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{command}</code></pre>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#64748B]"><HardDrive size={15} className="mt-0.5 shrink-0 text-[#A15C00]" />Data is stored in <code className="rounded bg-[#F1F5F9] px-1">/var/lib/bss-attendance</code>. Keep the old folder when changing storage; back it up before upgrades.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Cameras on a local network?</h2>
          <p className="mt-2 text-sm leading-6 text-[#475569]">If the attendance engine runs in the cloud but the cameras stay on the client’s local network, the client must provide a site-to-cloud tunnel. This is a client-managed deployment.</p>
          <Link href="/download/attendance/site-tunnel" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#01183A] px-4 text-sm font-bold text-white hover:bg-black">Read the site-tunnel guide</Link>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Security</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#475569]">
            <li>Never expose port <code className="rounded bg-[#F1F5F9] px-1">8765</code> to the internet.</li>
            <li>The local API has no authentication; use SSH tunneling or an authenticated reverse proxy.</li>
            <li>The archive contains a full command, API, backup, restore, update, and troubleshooting guide.</li>
            <li>Face photos and embeddings stay on the site server; only attendance metadata syncs to BSS.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
