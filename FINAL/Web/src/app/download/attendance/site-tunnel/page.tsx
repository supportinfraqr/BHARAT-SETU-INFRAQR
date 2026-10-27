import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Cloud, Network, Server, ShieldCheck, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cloud Engine + Local Cameras Tunnel Guide | Bharat Shram Setu',
  description: 'Client-managed WireGuard site-to-cloud connectivity guide for running the BSS attendance engine in the cloud with local RTSP cameras.',
};

const responsibilities = [
  ['Client', 'CCTV cameras, NVR, site router, site gateway, WireGuard/tunnel, cloud VM, VPN keys, firewall, bandwidth, monitoring'],
  ['BSS', 'Attendance engine package, BSS APIs, worker gallery/enrollment, BSS-side integration guidance'],
];

const steps = [
  ['1. Prepare the site gateway', 'Use a small always-on Linux gateway on the camera LAN. It must reach the camera RTSP port and open outbound WireGuard UDP 51820.'],
  ['2. Prepare the cloud VM', 'Run the attendance engine on a cloud VM with a public Elastic IP. Open only UDP 51820 and restricted SSH. Do not expose RTSP or the engine API publicly.'],
  ['3. Create WireGuard peers', 'Generate one key pair for the cloud hub and one per client site. Assign a unique tunnel IP to each site.'],
  ['4. Add the RTSP relay', 'The site gateway proxies the camera RTSP TCP port on its tunnel IP. This avoids overlapping client LAN subnets.'],
  ['5. Configure the engine', 'Add the camera in the engine using the site tunnel IP and relay port, not the camera’s private address.'],
  ['6. Validate', 'Check WireGuard handshakes, RTSP reachability, camera SENDING state, frame processing, gallery face data, and BSS event sync.'],
];

const awsConfig = `# Cloud hub (example)
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = <CLOUD_PRIVATE_KEY>

[Peer]
# Site 001
PublicKey = <SITE_001_PUBLIC_KEY>
AllowedIPs = 10.200.1.2/32`;

const siteConfig = `# Site 001 gateway (example)
[Interface]
Address = 10.200.1.2/32
PrivateKey = <SITE_001_PRIVATE_KEY>

[Peer]
PublicKey = <CLOUD_PUBLIC_KEY>
Endpoint = <CLOUD_PUBLIC_IP>:51820
AllowedIPs = 10.200.0.1/32
PersistentKeepalive = 25`;

const relayConfig = `# Site 001 RTSP TCP relay (example)
socat TCP-LISTEN:1554,bind=10.200.1.2,fork TCP:192.168.1.50:554

# Cloud attendance engine camera URL
rtsp://10.200.1.2:1554/stream`;

export default function SiteTunnelPage() {
  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#0F172A]">
      <header className="border-b border-[#DBE4F0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/bss-original-logo.png" alt="Bharat Shram Setu" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
            <span><span className="block text-sm font-bold text-[#01183A]">Bharat Shram Setu</span><span className="block text-[11px] text-[#64748B]">Client-managed camera tunnel</span></span>
          </Link>
          <Link href="/download/attendance" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#01183A]"><ArrowLeft size={14} /> Client downloads</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F7B4F]">Site-to-cloud connectivity</p>
          <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Client-managed</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#01183A]">Cloud engine with local cameras</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475569]">
          If the attendance engine runs on AWS, Azure, BigRock, or another cloud VM while the cameras remain on the client’s local network, the client must provide a tunnel from the site gateway to the cloud VM. BSS does not access local cameras and does not manage the client VPN.
        </p>

        <div className="mt-8 rounded-2xl border border-[#DBE4F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-[#01183A]"><Network size={18} className="text-[#1D4ED8]" /> Reference topology</div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-6 text-[#D7E3F4]"><code>{`Client site
  Camera 192.168.1.50:554
        │
  Site gateway (WireGuard + RTSP relay)
        │  outbound UDP 51820
        ▼
Client cloud VM
  Attendance engine
        │ HTTPS metadata
        ▼
BSS worker gallery / attendance`}</code></pre>
        </div>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Who handles what</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#EDF1F7]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F8FC] text-[10px] uppercase tracking-wide text-[#64748B]"><tr><th className="px-4 py-3">Party</th><th className="px-4 py-3">Responsibility</th></tr></thead>
              <tbody className="divide-y divide-[#EDF1F7]">
                {responsibilities.map(([party, text]) => <tr key={party}><td className="px-4 py-3 font-bold text-[#01183A]">{party}</td><td className="px-4 py-3 text-[#475569]">{text}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#64748B]">BSS support covers the engine/BSS integration. The client is responsible for its VPN, router, cloud, firewall, keys, bandwidth, and privacy policy.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Deployment steps</h2>
          <div className="mt-4 space-y-4">
            {steps.map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#0F7B4F]" />
                <div><h3 className="text-xs font-bold text-[#01183A]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#64748B]">{text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">WireGuard examples</h2>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">Placeholders only. Generate unique keys per site and keep private keys off the public web server.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div><div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#01183A]"><Cloud size={14} /> Cloud hub</div><pre className="overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{awsConfig}</code></pre></div>
            <div><div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#01183A]"><Server size={14} /> Site gateway</div><pre className="overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{siteConfig}</code></pre></div>
          </div>
          <div className="mt-4"><div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#01183A]"><Terminal size={14} /> RTSP TCP relay</div><pre className="overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{relayConfig}</code></pre></div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Multiple sites</h2>
          <p className="mt-2 text-sm leading-6 text-[#475569]">Use one tunnel IP and one relay port set per site. This avoids overlapping client LANs such as every site using 192.168.1.0/24.</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{`Site 001  10.200.1.2:1554 → camera 192.168.1.50:554
Site 002  10.200.2.2:1554 → camera 192.168.1.50:554
Site 003  10.200.3.2:1554 → camera 192.168.1.50:554`}</code></pre>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Validate connectivity</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0B1220] p-4 text-[11px] leading-5 text-[#D7E3F4]"><code>{`# On the cloud VM
wg show
nc -vz 10.200.1.2 1554
ffprobe -rtsp_transport tcp rtsp://10.200.1.2:1554/stream

# Attendance engine API
bss-attendancectl camera test --rtsp 'rtsp://10.200.1.2:1554/stream'
bss-attendancectl status
bss-attendancectl workers`}</code></pre>
          <p className="mt-3 text-xs leading-5 text-[#64748B]">The camera must show SENDING, frames processed must increase, and the worker gallery must contain face data before attendance can be recognised.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Security and troubleshooting</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 text-sm leading-6 text-[#475569] md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-[#01183A]"><ShieldCheck size={15} className="text-[#0F7B4F]" /> Security</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>One key pair per site; revoke on gateway replacement.</li>
                <li>Restrict relay access to the cloud tunnel IP.</li>
                <li>Never expose RTSP or engine port 8765 publicly.</li>
                <li>Do not put private keys or camera passwords in the website.</li>
                <li>Encrypt/secure the cloud VM and keep software patched.</li>
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-[#01183A]"><Terminal size={15} className="text-[#A15C00]" /> Common failures</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>No handshake: UDP 51820 blocked or wrong cloud IP.</li>
                <li>Tunnel up but RTSP fails: relay not running or wrong camera IP/port.</li>
                <li>Camera works locally but not from cloud: relay listen address/firewall.</li>
                <li>Overlapping site IPs: use unique tunnel IP/relay ports.</li>
                <li>No attendance: worker gallery has no embeddings or camera is not SENDING.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#DBE4F0] bg-white p-6">
          <h2 className="text-base font-bold text-[#01183A]">Support boundary</h2>
          <p className="mt-2 text-sm leading-6 text-[#475569]">This is a client-managed deployment. BSS provides the engine and BSS integration; the client provides and operates the site gateway, VPN, cloud VM, firewall, keys, and monitoring.</p>
          <Link href="/download/attendance" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#01183A] px-4 text-sm font-bold text-white hover:bg-black">Back to downloads</Link>
        </section>
      </section>
    </main>
  );
}
