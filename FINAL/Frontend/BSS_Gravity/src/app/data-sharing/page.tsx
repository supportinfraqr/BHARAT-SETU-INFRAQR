import PublicSiteHeader from '@/components/PublicSiteHeader';

const RECIPIENTS: { who: string; detail: string }[] = [
  {
    who: 'Authorized Employers & Contractors',
    detail: 'Only for workers deployed under their direct operational scope.',
  },
  {
    who: 'Government & Statutory Portals',
    detail: 'Integrated directly with official portals (such as EPFO, ESIC, and State Welfare Boards) for legal compliance verification.',
  },
  {
    who: 'Secure Service Providers',
    detail: 'Government-empaneled cloud data centers in India, messaging gateways, and technical infrastructure partners under strict confidentiality agreements.',
  },
  {
    who: 'Law Enforcement',
    detail: 'Only when legally mandated by a formal government order or court summons.',
  },
];

const PRINCIPLES: string[] = [
  'We do not sell or rent personal information to advertisers or marketing agencies.',
  'Data is shared strictly with authorized entities and only on a strict need-to-know basis.',
  'Limited, relevant data is transmitted once you bind with an employer or contractor; the binding and its disclosures are recorded.',
  'All external integrations comply with national data sovereignty standards, and primary databases are hosted in secure, sovereign cloud data centers within India.',
  'Sensitive identifiers are masked or hashed — full plain-text government identity numbers are never shown on general screens.',
];

export default function DataSharingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicSiteHeader />
      <main className="flex-1 px-6 py-10">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-4xl w-full mx-auto">
          <h1 className="text-3xl font-bold text-[#1E3A8A]">Data Sharing Policy</h1>
          <p className="text-xs text-gray-400 mt-2">BharatShramSetu &middot; National Worker Welfare Management System (NWWMS)</p>

          <p className="text-gray-600 leading-relaxed mt-6">
            The BharatShramSetu Data Sharing framework ensures that your information is only shared on a strict
            need-to-know basis. We do not sell or rent personal information to advertisers or marketing agencies.
            Data is shared strictly with authorized entities:
          </p>

          <ul className="mt-6 space-y-4">
            {RECIPIENTS.map(item => (
              <li key={item.who} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-sm font-semibold text-gray-900">{item.who}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold text-[#1B365D] border-b border-gray-100 pb-3 mt-10">Our Commitments</h2>
          <ul className="mt-4 space-y-2">
            {PRINCIPLES.map(item => (
              <li key={item} className="text-gray-600 leading-relaxed flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#1E3A8A] flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-gray-500 mt-10">
            Read the full{' '}
            <a href="/policy" className="text-[#1E3A8A] font-semibold hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms" className="text-[#1E3A8A] font-semibold hover:underline">Terms &amp; Conditions</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
