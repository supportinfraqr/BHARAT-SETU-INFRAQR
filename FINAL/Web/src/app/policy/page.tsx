import PublicSiteHeader from '@/components/PublicSiteHeader';
import PolicyLinks from '@/components/PolicyLinks';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

type Section = { title: string; blocks: Block[] };
type Part = { part: string; sections: Section[] };

const PARTS: Part[] = [
  {
    part: 'Part I: Privacy Policy',
    sections: [
      {
        title: '1. Introduction & Purpose',
        blocks: [
          { kind: 'p', text: 'BharatShramSetu operates a unified digital system designed to monitor, protect, and empower workers across industrial, construction, and unorganized sectors in India. This Privacy Policy explains our practices regarding the collection, use, storage, and security of personal, professional, attendance, and identity information across our mobile app, web portal, and digital pass services.' },
        ],
      },
      {
        title: '2. Who Is Covered',
        blocks: [
          { kind: 'p', text: 'This policy applies to all users registered on the platform:' },
          { kind: 'ul', items: [
            'Workers & Labourers: Individuals registered under the Worker Registry who hold a Unique National Worker ID and Digital Worker Pass.',
            'Contractors & Sub-contractors: Agencies managing site deployments, statutory registrations, and welfare filings.',
            'Principal Employers: Site owners, developers, and enterprises overseeing safety and workplace compliance.',
            'Government & Regulatory Authorities: Labour inspectors, welfare board officials, and statutory auditors.',
          ] },
        ],
      },
      {
        title: '3. Roles & Responsibilities in Data Handling',
        blocks: [
          { kind: 'ul', items: [
            'Employer / Contractor as Primary Data Handler: When employers or contractors upload worker details, they determine the purpose of processing. The platform processes this information strictly under agreed service agreements.',
            'Platform as Independent Data Handler: BharatShramSetu independently manages data for national statistical analysis, anonymous AI safety model training, identity fraud prevention, system security, and issuance of portable Worker IDs.',
            'Registered Individuals: Workers and individual users whose information is being processed.',
          ] },
        ],
      },
      {
        title: '4. Information We Collect',
        blocks: [
          { kind: 'p', text: 'We collect only the minimum information necessary to provide welfare management, safety compliance, and site governance:' },
          { kind: 'table', head: ['Information Category', 'Details Collected', 'Primary Purpose'], rows: [
            ['Personal & Profile Information', 'Full name, parent\u2019s name, date of birth, gender, profile photo, Unique National Worker ID, employee code, designation, and department.', 'Worker registration, identity issuance, and onboarding verification.'],
            ['Government & Statutory IDs', 'National identity numbers (processed strictly through secure masked/virtual tokens, Aadhaar), Provident Fund (UAN), ESIC Insurance Number, Construction Board (BOCW) registration, Tax PAN, and bank/UPI details.', 'Direct benefit transfer, social security verification, wage payments, and statutory welfare compliance.'],
            ['Workplace & Attendance Logs', 'GPS check-in/check-out timestamps, geo-fenced entry/exit logs, shift timings, contractor deployment history, and overtime hours.', 'Automated attendance, access control, workplace safety monitoring, and wage computation.'],
            ['Skills & Safety Credentials', 'Trade certifications, medical fitness records, safety training logs, safety gear issuance, and insurance policy status.', 'Issuance of Skill Passports, site hazard clearances, and welfare scheme eligibility.'],
            ['Identity Verification Data', 'Facial mathematical models for automated QR and face attendance, camera document scans, and text extraction outputs.', 'Preventing proxy attendance, identity fraud prevention, and contactless site entry.'],
            ['Technical & Device Data', 'Device identifiers, operating system version, IP address, performance diagnostics, crash logs, and notification tokens.', 'Ensuring application stability, security protection, and system audit logs.'],
          ] },
        ],
      },
      {
        title: '5. Mobile Device Permissions',
        blocks: [
          { kind: 'ul', items: [
            'Camera Access: Used solely to take worker profile photos, perform live face verification at site entry, and scan document/pass QR codes.',
            'Location (GPS): Used exclusively to confirm physical presence within designated job sites during shift hours and for field safety audits.',
            'Storage: Used to store digital worker passes and payslips locally for offline viewing, and to attach required compliance files.',
            'Notifications: Used to send shift reminders, safety alerts, provident fund/insurance updates, and welfare scheme notices.',
          ] },
        ],
      },
      {
        title: '6. How Your Information Is Used',
        blocks: [
          { kind: 'ul', items: [
            'Digital Pass Issuance: Generating portable Digital Worker Passes and verified Skill Passports.',
            'Welfare & Contribution Tracking: Automating social security records (PF, ESIC, welfare board registrations) across contractor deployments.',
            'Safety & Compliance Monitoring: Evaluating workplace safety standards, contractor licensing, and labour law compliance.',
            'Fraud Prevention: Stopping duplicate identities, wage misappropriation, and unauthorized site entry.',
          ] },
        ],
      },
      {
        title: '7. Data Sharing & Third Parties',
        blocks: [
          { kind: 'p', text: 'We do not sell or rent personal information to advertisers or marketing agencies. Data is shared strictly with authorized entities:' },
          { kind: 'ul', items: [
            'Authorized Employers & Contractors: Only for workers deployed under their direct operational scope.',
            'Government & Statutory Portals: Integrated directly with official portals (such as EPFO, ESIC, and State Welfare Boards) for legal compliance verification.',
            'Secure Service Providers: Government-empaneled cloud data centers in India, messaging gateways, and technical infrastructure partners under strict confidentiality agreements.',
            'Law Enforcement: Only when legally mandated by a formal government order or court summons.',
          ] },
        ],
      },
    ],
  },
  {
    part: 'Part II: Data Protection & Worker Privacy Rights',
    sections: [
      {
        title: '1. Clear Notice & Informed Consent',
        blocks: [
          { kind: 'p', text: 'Whenever personal information is collected, users are provided with a clear, easy-to-understand notice explaining what information is required and why. Notices are provided in English, Hindi, and regional languages. Users must give explicit, clear consent before data collection, and consent records are maintained in a secure digital registry.' },
        ],
      },
      {
        title: '2. User Rights Over Personal Data',
        blocks: [
          { kind: 'p', text: 'Every registered worker and user possesses clear legal rights regarding their personal data:' },
          { kind: 'ul', items: [
            'Right to Know & Access: You can request a complete summary of your personal information stored on the system, the activities performed with it, and the list of third parties who have received it.',
            'Right to Correct & Update: You have the right to correct inaccurate data, complete unfinished profiles, or request removal of outdated information that is no longer required.',
            'Right to File Grievances: You have access to a fast, transparent grievance redressal system to resolve data complaints.',
            'Right to Nominate: You can nominate a family member or representative who can manage your data rights in case of death or unforeseen incapacity.',
          ] },
        ],
      },
      {
        title: '3. Protection of Government & Statutory Identifiers',
        blocks: [
          { kind: 'p', text: 'All national identity numbers and sensitive credentials are encrypted and stored in secure, restricted vaults. The platform never displays or stores full plain-text government identity numbers on general screens. Masked formats (showing only the last four digits) and secure cryptographic hashes are strictly utilized.' },
        ],
      },
    ],
  },
  {
    part: 'Part III: International Data Standards & Cross-Border Rules',
    sections: [
      {
        title: '1. Lawful Basis for Processing',
        blocks: [
          { kind: 'p', text: 'For international personnel, expatriate managers, or foreign enterprise partners using the platform, data is handled under recognized legal justifications:' },
          { kind: 'ul', items: [
            'Contractual Need: Processing required to provide platform services, issue worker passes, and fulfill workforce agreements.',
            'Legal Duty: Processing required to comply with statutory labour laws, safety codes, and tax filings.',
            'Legitimate Operational Interest: Preventing fraud, safeguarding work sites, and maintaining platform security.',
            'Explicit Consent: Freely given approval for non-essential optional features, such as background location or skill alerts.',
          ] },
        ],
      },
      {
        title: '2. Data Location & Cross-Border Transfers',
        blocks: [
          { kind: 'p', text: 'All primary databases and AI systems are hosted in secure, sovereign cloud data centers located within India. If information is accessed internationally by authorized global partners, standard contractual privacy protections are enforced to guarantee the same high level of data security.' },
        ],
      },
      {
        title: '3. International Privacy Rights',
        blocks: [
          { kind: 'p', text: 'Users covered under international data protection laws can exercise their rights to access, data correction, deletion, processing restriction, automated data transfer (data portability in standard spreadsheet/JSON formats), and objections by writing to gdpr@bharatshramsetu.in.' },
        ],
      },
    ],
  },
  {
    part: 'Part IV: Intellectual Property Rights & Proprietary Architecture',
    sections: [
      {
        title: '1. Ownership of Platform & System Architecture',
        blocks: [
          { kind: 'p', text: 'BharatShramSetu retains sole and exclusive ownership of all right, title, and interest in and to the Platform and the National Worker Welfare Management System (NWWMS). This includes, without limitation:' },
          { kind: 'ul', items: [
            'Proprietary Software & Code: All underlying algorithms, frontend/backend source code, APIs, database architectures, and digital registry frameworks (Worker Registry, Contractor Registry, and Principal Employer Registry).',
            'Digital Worker Pass & Skill Passport: The architectural design, QR-generation workflows, portable identity frameworks, and automated skill-mapping templates.',
            'AI Models & Biometric Vector Systems: All artificial intelligence models, facial liveness verification engines, anti-spoofing algorithms, and proprietary mathematical vector representations.',
            'Trademarks & Branding: All registered and unregistered trademarks, logos, brand names ("BharatShramSetu", "NWWMS", "One Nation, One ID, One Platform"), UI/UX screen workflows, icons, and graphic assets.',
          ] },
        ],
      },
      {
        title: '2. Restrictions on Extraction, Reverse Engineering & Screen Capture',
        blocks: [
          { kind: 'ul', items: [
            'Prohibition on Reverse Engineering: Users, contractors, principal employers, and third parties are strictly prohibited from copying, decompiling, reverse-engineering, disassembling, or attempting to derive the source code or underlying mathematical models of the platform.',
            'Extraction & Scraping Ban: Deploying automated scrapers, crawlers, bots, data-harvesting tools, or AI model-extraction scripts against any part of the registry or dashboard is strictly forbidden.',
            'Protection of Interface & Compliance Matrices: Capturing, copying, or duplicating the visual design, proprietary compliance matrices, risk-scoring algorithms, or audit reporting templates for commercial redistribution without written consent constitutes copyright infringement and will result in immediate legal action.',
          ] },
        ],
      },
      {
        title: '3. Ownership of User & Statutory Data',
        blocks: [
          { kind: 'ul', items: [
            'User Documents: Contractors and Principal Employers retain ownership of their proprietary business files, contracts, and company documents uploaded to the platform.',
            'Aggregated & Statistical Data: Anonymized, aggregated performance statistics, macro labour trends, and generalized system analytics generated through the platform remain the intellectual property of BharatShramSetu Technologies Pvt. Ltd. for national reporting and system improvement.',
          ] },
        ],
      },
    ],
  },
  {
    part: 'Part V: Artificial Intelligence Governance & Ethics',
    sections: [
      {
        title: '1. Core AI Capabilities',
        blocks: [
          { kind: 'ul', items: [
            'Face Verification & Anti-Spoofing: Verifies worker attendance at job sites to prevent proxy entries while checking that a live person is present.',
            'Predictive Safety & Compliance Risk: Analyzes contractor filing trends to identify safety and wage violation risks before they occur.',
            'Skill & Welfare Matching: Recommends suitable job placements and highlights government welfare schemes matching a worker\u2019s qualifications.',
            'Smart Document Scanning: Automatically reads and extracts necessary details from uploaded compliance certificates to speed up approvals.',
          ] },
        ],
      },
      {
        title: '2. Human Oversight & No Automated Penalties',
        blocks: [
          { kind: 'p', text: 'In keeping with ethical AI standards, no negative decision regarding employment, wages, fines, or worker status is ever made solely by an AI algorithm. All AI outputs are treated strictly as advisory recommendations. Final decisions are always reviewed and confirmed by qualified human HR officers, site supervisors, or compliance managers.' },
        ],
      },
      {
        title: '3. Fairness & Bias Prevention',
        blocks: [
          { kind: 'p', text: 'AI models are trained on diverse, anonymized data to ensure fair treatment across all demographics, age groups, and regions. Face verification algorithms are continuously calibrated to ensure high accuracy across diverse outdoor lighting conditions and skin tones.' },
        ],
      },
      {
        title: '4. Privacy Protection in Facial Verification',
        blocks: [
          { kind: 'p', text: 'The system does not permanently store raw face photos for daily attendance verification. Instead, images are converted into one-way mathematical numeric codes (vectors). These mathematical codes cannot be reversed into photos and are used only for secure site access.' },
        ],
      },
      {
        title: '5. Governing Law & Dispute Resolution',
        blocks: [
          { kind: 'p', text: 'This framework is governed by the laws of India. Any formal legal disputes fall under the jurisdiction of the competent courts at Noida / New Delhi. Periodic updates to this document will be posted on the portal, and continued use of the platform indicates acceptance of updated terms.' },
        ],
      },
    ],
  },
];

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'p') return <p className="text-gray-600 leading-relaxed">{block.text}</p>;
  if (block.kind === 'ul') {
    return (
      <ul className="space-y-2">
        {block.items.map(item => (
          <li key={item} className="text-gray-600 leading-relaxed flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#1E3A8A] flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#1B365D] text-white">
          <tr>{block.head.map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {block.rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-[#F4F6F9]' : 'bg-white'}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 align-top ${j === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicSiteHeader />
      <main className="flex-1 px-6 py-10">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-4xl w-full mx-auto">
          <h1 className="text-3xl font-bold text-[#1E3A8A]">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mt-2">BharatShramSetu &middot; National Worker Welfare Management System (NWWMS)</p>
          <p className="text-gray-600 leading-relaxed mt-6">
            BharatShramSetu operates a unified digital system designed to monitor, protect, and empower workers
            across industrial, construction, and unorganized sectors in India. This document sets out our privacy
            commitments, data protection and worker rights, international data standards, intellectual property,
            and AI governance.
          </p>

          <div className="mt-10 space-y-12">
            {PARTS.map(part => (
              <section key={part.part} className="space-y-8">
                <h2 className="text-xl font-bold text-[#1B365D] border-b border-gray-100 pb-3">{part.part}</h2>
                {part.sections.map(section => (
                  <div key={section.title} className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                    {section.blocks.map((block, i) => <BlockView key={i} block={block} />)}
                  </div>
                ))}
              </section>
            ))}

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1B365D] border-b border-gray-100 pb-3">Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Policy from time to time. If we make material changes, we will notify you within the
                App and/or on our website, and the &lsquo;Effective Date&rsquo; above will be revised accordingly. By
                continuing to use the App or Services after such updates, you confirm that you have read, understood,
                and agreed to the updated Policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1B365D] border-b border-gray-100 pb-3">Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                BharatShramSetu &middot; Email:{' '}
                <a href="mailto:gdpr@bharatshramsetu.in" className="text-[#1E3A8A] font-semibold hover:underline">gdpr@bharatshramsetu.in</a>
                {' '}&middot; Website:{' '}
                <a href="https://bharatshramsetu.in" className="text-[#1E3A8A] font-semibold hover:underline">bharatshramsetu.in</a>
              </p>
            </section>
          </div>

          <PolicyLinks current="policy" />
        </div>
      </main>
    </div>
  );
}
