// Gate-pass design — a single modern layout, rendered from live worker/token
// data. The template's appearance (pass colour, text colour, font, brand header
// + word colours, tagline, footer, logo) overrides the design defaults.

export type GatePassKind = 'permanent' | 'temporary';

export type GatePassDesignMeta = { id: number; label: string; kind: GatePassKind; layout: 'landscape' };

export const GATE_PASS_DESIGNS: GatePassDesignMeta[] = [
  { id: 1, label: 'Gate Pass', kind: 'permanent', layout: 'landscape' },
];

/** Appearance overrides from the template styles (so the editor controls apply). */
export type GatePassStyle = {
  passColor?: string; textColor?: string; fontFamily?: string; fontSize?: number;
  brandHeader?: string; brandColors?: string[]; tagline?: string; footer?: string; showLogo?: boolean; logoUrl?: string;
};

/** The only fields a gate pass carries (fixed set). */
export type GatePassValues = {
  workerName: string; bssId: string; designation: string; dob: string; bloodGroup: string;
  emergencyContact: string; employer: string; contractor: string;
  site: string; siteBssId: string; siteAddress: string;
  issueDate: string; validTo: string; days: string;
  status: string; type: 'Permanent' | 'Temporary'; photo: string; qr: string;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const WORKER_SVG = `<svg viewBox="0 0 200 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf3fb"/><stop offset="1" stop-color="#d3e4f6"/></linearGradient></defs><rect width="200" height="220" fill="url(#wph)"/><path d="M28 220 C28 168 66 148 100 148 C134 148 172 168 172 220 Z" fill="#ff7a00"/><path d="M92 148 L108 148 L112 220 L88 220 Z" fill="#ffd23f"/><rect x="66" y="186" width="68" height="9" fill="#eef4fb" opacity=".92"/><rect x="88" y="116" width="24" height="40" fill="#e2a679"/><circle cx="100" cy="94" r="42" fill="#f0b98c"/><circle cx="59" cy="97" r="7" fill="#f0b98c"/><circle cx="141" cy="97" r="7" fill="#f0b98c"/><path d="M56 86 C56 58 144 58 144 86 L144 76 C132 64 68 64 56 76 Z" fill="#3a2b22"/><path d="M47 78 C47 38 153 38 153 78 L153 84 L47 84 Z" fill="#ffcc33"/><rect x="43" y="80" width="114" height="10" rx="5" fill="#f0b400"/><path d="M100 40 L100 78" stroke="#e0a800" stroke-width="3"/><circle cx="86" cy="95" r="4.2" fill="#3a2b22"/><circle cx="114" cy="95" r="4.2" fill="#3a2b22"/><path d="M88 112 Q100 121 112 112" stroke="#a5643b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

function photoHtml(v: GatePassValues) {
  return v.photo ? `<img src="${esc(v.photo)}" alt="worker" style="width:100%;height:100%;object-fit:cover"/>` : WORKER_SVG;
}
function qrHtml(v: GatePassValues, size: number) {
  if (v.qr) return `<img src="${esc(v.qr)}" alt="QR" style="width:${size}px;height:${size}px"/>`;
  const logo = Math.round(size * 0.36);
  return `<div style="position:relative;width:${size}px;height:${size}px;border:2px solid #c9d6e6;border-radius:10px;overflow:hidden;background:repeating-conic-gradient(#0b2545 0 25%,#fff 0 50%) 0/12px 12px"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${logo}px;height:${logo}px;border-radius:6px;background:#fff;box-shadow:0 0 0 3px #fff;display:grid;place-items:center;font-weight:900;color:#074d92;font-size:${Math.round(logo * 0.42)}px">BSS</span></div>`;
}
function watermark(status: string) {
  const s = (status || '').toLowerCase();
  if (s !== 'expired' && s !== 'revoked') return '';
  return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;font:900 60px/1 Arial;color:rgba(190,20,20,.16);transform:rotate(-22deg);letter-spacing:.12em;text-transform:uppercase">${esc(status)}</div>`;
}
function signs(width: number, status: string, sColor: string, note = '') {
  const line = (label: string) => `<div style="text-align:center"><div style="width:${width}px;border-top:1px solid #90a3bb;margin:0 auto 3px"></div><span style="font-size:8.5px;color:#58697d;white-space:nowrap">${label}</span></div>`;
  const badge = `<div style="text-align:center;align-self:center"><span style="display:inline-block;font-size:9px;font-weight:800;letter-spacing:.1em;color:${sColor};border:1px solid ${sColor}55;background:${sColor}12;border-radius:999px;padding:2px 10px;white-space:nowrap">${status}</span>${note ? `<div style="font-size:8px;color:#94a3b8;margin-top:2px;white-space:nowrap">${note}</div>` : ''}</div>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${line('Contractor')}${badge}${line('Employer')}</div>`;
}
const siteLine = (v: GatePassValues) => `${v.site}${v.siteBssId ? ` (${v.siteBssId})` : ''}${v.siteAddress ? `, ${v.siteAddress}` : ''}`;
function brandWords(text: string, colors: string[] | undefined, fallback: string) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  return words.map((w, i) => `<span style="color:${(colors && colors[i]) || fallback}">${esc(w)}</span>`).join(' ');
}
function fieldPairs(v: GatePassValues): Array<[string, string]> {
  return [
    ['BSS Worker ID', v.bssId],
    ['Designation', v.designation],
    ['DOB', v.dob],
    ['Blood Group', v.bloodGroup],
    ['Emergency Contact', v.emergencyContact],
    ['Employer', v.employer],
    ['Contractor', v.contractor],
    ['Site', siteLine(v)],
    ['Issue Date', v.issueDate],
    ['Valid Up To', v.validTo],
  ];
}
function fld(k: string, val: string, color: string, fs = 12) {
  return `<div><div style="font-size:8.6px;text-transform:uppercase;letter-spacing:.1em;color:#8494a6">${esc(k)}</div><div style="font-size:${fs}px;font-weight:700;color:${color}">${esc(val)}</div></div>`;
}
const SHELL = (inner: string, font: string) => `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;font-family:${font};color:#142d4c}</style></head><body>${inner}</body></html>`;
function logoBox(style: GatePassStyle, accent: string) {
  if (style.showLogo !== false) {
    const url = style.logoUrl || '/bss-original-logo.png';
    return `<img src="${esc(url)}" alt="Bharat Shram Setu" style="width:46px;height:46px;border-radius:11px;object-fit:contain;background:#fff"/>`;
  }
  return `<div style="width:46px;height:46px;border-radius:11px;background:${accent};color:#fff;display:grid;place-items:center;font-weight:900;font-size:17px">BSS</div>`;
}

/** The single modern gate-pass layout. */
export function renderGatePassDesign(_designId: number | undefined, v: GatePassValues, style: GatePassStyle = {}): string {
  const temp = v.type === 'Temporary';
  // Default colour by type (Temporary = red, Permanent = green); the pass colour
  // control overrides it.
  const accent = style.passColor || (temp ? '#B91C1C' : '#14843C');
  const nameColor = style.textColor || '#0b2545';
  const font = style.fontFamily || 'Arial,Helvetica,sans-serif';
  const brand = style.brandHeader || 'BHARAT SHRAM SETU';
  const tagline = (style.tagline === undefined
    ? `${v.type} Gate Pass · One Nation · One ID · One Platform`
    : style.tagline).trim();
  const sColor = /expire|revok/i.test(v.status || '') ? '#b91c1c' : '#14843C';
  const fs = 12;
  const pairs = fieldPairs(v);
  const left = pairs.slice(0, 5).map(([k, val]) => fld(k, val, nameColor, fs)).join('');
  const right = pairs.slice(5).map(([k, val]) => fld(k, val, nameColor, fs)).join('');
  return SHELL(`<div style="width:680px;height:438px;background:#fff;border-radius:16px;overflow:hidden;position:relative;box-shadow:0 12px 34px rgba(0,0,0,.18);display:flex;flex-direction:column">
    <img src="/bss-construction-watermark.png" alt="" aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:100%;object-fit:cover;object-position:center bottom;opacity:.06;filter:brightness(0) saturate(0);pointer-events:none;z-index:0"/>
    <div style="position:relative;z-index:1;height:6px;background:linear-gradient(90deg,${accent},${accent}88)"></div>
    <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;border-bottom:1px solid #eef2f7">
      <div style="display:flex;align-items:center;gap:12px">
        ${logoBox(style, accent)}
        <div><div style="font-size:16.5px;font-weight:800;letter-spacing:.4px">${brandWords(brand, style.brandColors, nameColor)}</div>${tagline ? `<div style="font-size:9px;color:#8494a6;text-transform:uppercase;letter-spacing:.16em;margin-top:2px">${esc(tagline)}</div>` : ''}</div>
      </div>
      <span style="display:inline-block;background:${accent};color:#fff;font-weight:900;font-size:11.5px;letter-spacing:.16em;padding:5px 13px;border-radius:999px;white-space:nowrap">${esc(v.type.toUpperCase())}</span>
    </div>
    <div style="position:relative;z-index:1;flex:1;display:grid;grid-template-columns:118px 1fr 150px;gap:18px;padding:16px 22px">
      <div style="width:118px;height:140px;border:3px solid ${accent};border-radius:12px;overflow:hidden">${photoHtml(v)}</div>
      <div>
        <div style="font-size:${Math.round(21 * fs / 12)}px;font-weight:800;color:${nameColor};margin:0 0 9px">${esc(v.workerName)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px 20px">
          <div style="display:grid;gap:9px">${left}</div>
          <div style="display:grid;gap:9px">${right}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">
        ${qrHtml(v, 136)}
        <div style="font-size:9px;color:#58697d;text-align:center">Scan at gate to verify<br/>identity &amp; validity</div>
      </div>
    </div>
    <div style="position:relative;z-index:1;flex-shrink:0;padding:9px 22px;border-top:1px solid #eef2f7;background:#f8fafc">
      ${signs(120, esc((v.status || 'ACTIVE').toUpperCase()), sColor, temp && v.days ? `${esc(v.days)} day(s), max 7` : '')}
      ${style.footer ? `<div style="font-size:8px;color:#94a3b8;margin-top:7px;text-align:center">${esc(style.footer)}</div>` : ''}
    </div>
    <div style="position:relative;z-index:1;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 22px;border-top:1px solid #eef2f7;background:#fff">
      <img src="/bss-original-logo.png" alt="Bharat Shram Setu" style="height:24px;width:auto;display:block"/>
      <span style="font-size:11px;font-weight:800;letter-spacing:.2em">${brandWords('BHARAT SHRAM SETU', style.brandColors, nameColor)}</span>
    </div>
    ${watermark(v.status)}
  </div>`, font);
}
