import PublicSiteHeader from '@/components/PublicSiteHeader';
import PolicyLinks from '@/components/PolicyLinks';

type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };
type Section = { n: number; title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    n: 1,
    title: 'National Vision, Platform Purpose & Facilitator Status',
    blocks: [
      { kind: 'p', text: 'BharatShramSetu operates the National Worker Welfare Management System (NWWMS) under the national vision of "One Nation, One ID, One Platform". The Platform serves as a unified digital infrastructure designed to monitor, protect, and empower workers across India\u2019s industrial, construction, and unorganized sectors. The Platform acts strictly as a technology facilitator and digital aggregator between workers, contractors, principal employers, and government boards. BharatShramSetu does not directly employ registered site workers, nor does it act as a labour contractor or employment agency.' },
    ],
  },
  {
    n: 2,
    title: 'Key Stakeholder Registries & Digital Worker Pass',
    blocks: [
      { kind: 'p', text: 'The Platform provides distinct access portals, tools, and registries across four core workforce pillars:' },
      { kind: 'ul', items: [
        'Worker Registry & Digital Pass: Issues a Unique National Worker ID, portable Digital Worker Pass (QR + AI facial verification), portable skill passport, employment history, and statutory welfare entitlement logs (PF, ESIC, BOCW, Insurance).',
        'Contractor Registry: Tracks contractor licensing, statutory renewals, compliance ratings, and real-time workforce deployment history across sites.',
        'Principal Employer Registry: Enables enterprise site oversight, contractor governance, workplace safety compliance, and audit-ready reporting across industrial and infrastructure projects.',
        'Government & Nodal Oversight: Provides real-time workforce visibility, digital labour inspection tools, and national analytics dashboards for regulatory boards.',
      ] },
    ],
  },
  {
    n: 3,
    title: 'User Eligibility, Registration & Verification Obligations',
    blocks: [
      { kind: 'p', text: 'Access to the Platform is restricted to individuals who are at least eighteen (18) years of age or legally authorized entity representatives. Users agree to provide truthful, accurate, complete, and current information during onboarding. Contractors and Principal Employers guarantee that all worker enrollments are performed with prior explicit legal authorization. You are solely responsible for maintaining account credential confidentiality, including passwords, OTPs, and QR codes.' },
    ],
  },
  {
    n: 4,
    title: 'AI Governance & Automated Facial Verification Protocol',
    blocks: [
      { kind: 'p', text: 'BharatShramSetu incorporates Artificial Intelligence (AI) and Machine Learning (ML) engines for site operations:' },
      { kind: 'ul', items: [
        'AI Facial Verification & Liveness Detection: Utilized at site gates for contact-free entry verification and anti-spoofing proxy prevention.',
        'Facial Vector Protection: Raw facial photos captured during enrollment are immediately converted into encrypted, mathematical facial vector embeddings (numerical strings). Raw images are deleted after enrollment, and facial vectors cannot be reverse-engineered into images.',
        'Predictive Compliance & Risk Scoring: AI models analyze contractor filing histories to issue non-compliance risk alerts.',
        'Human-In-The-Loop (HITL) Governance: In strict alignment with international AI ethics standards, no adverse employment or legal decision (such as termination, blacklisting, fine imposition, or wage withholding) shall ever be executed solely by an AI algorithm. All AI outputs serve as advisory recommendations for human managers.',
      ] },
    ],
  },
  {
    n: 5,
    title: 'Compliance with DPDP Act 2023 & Statutory Identifiers',
    blocks: [
      { kind: 'p', text: 'The processing of personal data is governed under the Digital Personal Data Protection Act, 2023 (DPDP Act). Unencrypted 12-digit Aadhaar numbers are never stored in plain text. All statutory identifiers (Aadhaar, UAN, ESIC) are processed via masked formats (showing only last 4 digits), SHA-256 cryptographic hashing, and UIDAI-compliant vault isolation. Users retain statutory rights under the DPDP Act 2023, including rights to access, correction, erasure, grievance redressal, and nomination.' },
    ],
  },
  {
    n: 6,
    title: 'Mobile Application Permissions & Purpose',
    blocks: [
      { kind: 'p', text: 'The BharatShramSetu Mobile App requests specific device permissions strictly limited to core operational delivery:' },
      { kind: 'ul', items: [
        'Camera: For worker profile onboarding, AI-assisted gate facial verification, and scanning QR passes/document OCR.',
        'Location (GPS / Geo-fencing): Required exclusively for geo-fenced attendance logs, field inspector audits, and site movement monitoring. Background location is active strictly during designated shift hours with visual indicators.',
        'Storage & Notifications: To cache Digital Passes locally, store downloaded payslips, and deliver shift alerts or statutory welfare updates.',
      ] },
    ],
  },
  {
    n: 7,
    title: 'Platform License & Limited Access Rights',
    blocks: [
      { kind: 'p', text: 'BharatShramSetu grants registered users a limited, non-exclusive, non-transferable, revocable, and non-sublicensable license to access and use the Platform solely for lawful workforce management, statutory compliance tracking, license mapping, and site safety verification. This license does not grant any right to commercialize, sell, or redistribute platform services.' },
    ],
  },
  {
    n: 8,
    title: 'Comprehensive Intellectual Property Protection',
    blocks: [
      { kind: 'p', text: 'BharatShramSetu Technologies Pvt. Ltd. retains sole and exclusive ownership of all right, title, and interest in and to the Platform, including all software algorithms, AI vector models, UI/UX designs, database architectures, trademarks, logos, pre-configured compliance matrices, and related documentation.' },
    ],
  },
  {
    n: 9,
    title: 'Strict Ban on Screenshots, Screen Recordings & AI Extraction',
    blocks: [
      { kind: 'p', text: 'Users are strictly prohibited from taking screenshots, screen recordings, video captures, or photos of any dashboard interface, AI workflow, compliance report, or portal element. You shall NOT reverse engineer, decompile, disassemble, or extract AI facial vector models, platform source code, or underlying algorithms. Any unauthorized capture or extraction constitutes a material breach of law and results in immediate account termination and legal action.' },
    ],
  },
  {
    n: 10,
    title: 'Prohibited Conduct & Fraud Prevention',
    blocks: [
      { kind: 'p', text: 'Users agree NOT to: (i) submit forged, fake, or stolen Aadhaar, UAN, ESIC, or contractor license credentials; (ii) forge or tamper with Digital Worker Passes or QR codes for unauthorized site entry or proxy attendance; (iii) use location-spoofing software or fake GPS tools; (iv) bypass statutory PF/ESIC contributions; (v) deploy automated scrapers, bots, or spiders on dashboards; or (vi) transmit viruses, worms, or malicious code.' },
      { kind: 'p', text: 'Mandatory Statutory Warning: Identity falsification, fake GPS location spoofing, or illegal duplication of Digital Passes will trigger immediate Account termination, permanent registry blacklisting, and direct referral to statutory law enforcement authorities.' },
    ],
  },
  {
    n: 11,
    title: 'User Content & Data Ownership',
    blocks: [
      { kind: 'p', text: 'Users retain ownership of specific organizational documents, workforce logs, and licenses uploaded onto the Platform (\u201cUser Content\u201d). You grant BharatShramSetu a global, royalty-free, non-exclusive license to host, store, process, and display User Content solely to deliver Platform services, statutory reporting, and verification workflows. You warrant that uploaded content is lawful and non-infringing.' },
    ],
  },
  {
    n: 12,
    title: 'Subscriptions, Billing & Payment Terms',
    blocks: [
      { kind: 'p', text: 'Access to enterprise dashboards, contractor compliance modules, and advanced AI analytics is billed on a recurring subscription basis. Subscriptions automatically renew at the end of each billing cycle unless cancelled prior to renewal. Automatic payment failures reserve the right for BharatShramSetu to suspend service immediately. Account cancellations take effect at the end of the active billing cycle; accrued fees remain payable.' },
    ],
  },
  {
    n: 13,
    title: 'Third-Party Integrations & SDKs',
    blocks: [
      { kind: 'p', text: 'The Platform integrates with third-party software development kits (SDKs) and statutory government portals (including EPFO, ESIC, Shram Suvidha, UIDAI, Google Maps API, and Firebase). Third-party services operate under their respective terms and policies. BharatShramSetu disclaims liability for third-party gateway downtime, network delays, or external API failures.' },
    ],
  },
  {
    n: 14,
    title: 'Limitation of Liability & Warranty Disclaimer',
    blocks: [
      { kind: 'p', text: 'The Platform is provided on an \u201cAS IS\u201d and \u201cAS AVAILABLE\u201d basis without warranties of any kind. BharatShramSetu does not guarantee uninterrupted, error-free, or fully secure operations. To the maximum extent permitted by Indian law, BharatShramSetu, its directors, employees, and partners shall NOT be liable for indirect, incidental, consequential, or punitive damages (including loss of site operational time, wage disputes, or statutory fines).' },
    ],
  },
  {
    n: 15,
    title: 'Legal Indemnification',
    blocks: [
      { kind: 'p', text: 'You agree to defend, indemnify, and hold harmless BharatShramSetu, its directors, officers, employees, and agents from and against all claims, liabilities, damages, statutory penalties, and legal expenses arising out of: (i) your breach of these Terms; (ii) User Content uploaded by you; (iii) fraudulent usage of AI facial verification or Digital Passes; or (iv) your violation of statutory labour laws.' },
    ],
  },
  {
    n: 16,
    title: 'Account Suspension & Termination',
    blocks: [
      { kind: 'p', text: 'BharatShramSetu reserves the right to suspend, restrict, or permanently terminate your Account at its sole discretion, without prior notice, in the event of Terms breach, non-payment, suspected fraud, or statutory non-compliance. Upon termination, all platform access rights immediately cease.' },
    ],
  },
  {
    n: 17,
    title: 'Error Reporting, Feedback & IP Assignment',
    blocks: [
      { kind: 'p', text: 'Any suggestions, bug reports, or feature recommendations (\u201cFeedback\u201d) submitted to BharatShramSetu become the exclusive property of the Company. You assign all global intellectual property rights in the Feedback to BharatShramSetu to commercialize, modify, and incorporate without restriction or compensation.' },
    ],
  },
  {
    n: 18,
    title: 'Governing Law & Dispute Resolution',
    blocks: [
      { kind: 'p', text: 'These Terms shall be governed by and construed under the laws of the Republic of India. Any legal dispute, action, or proceeding arising out of or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of the competent courts located in Noida, Uttar Pradesh, India.' },
    ],
  },
  {
    n: 19,
    title: 'Amendments & Modifications to Terms',
    blocks: [
      { kind: 'p', text: 'We reserve the right to modify or replace these Terms at any time to reflect legal changes or platform updates. Revised terms will be posted on the Platform. Your continued use of BharatShramSetu following modifications constitutes full acceptance of the revised Terms.' },
    ],
  },
  {
    n: 20,
    title: 'Contacts',
    blocks: [
      { kind: 'p', text: 'If you have any comments or questions about these Terms of Service, the platform, or our related practices, please contact us by email at gdpr@bharatshramsetu.in or via the platform support desk.' },
    ],
  },
];

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'p') return <p className="text-gray-600 leading-relaxed">{block.text}</p>;
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

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicSiteHeader />
      <main className="flex-1 px-6 py-10">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-4xl w-full mx-auto">
          <h1 className="text-3xl font-bold text-[#1E3A8A]">Terms of Service</h1>
          <p className="text-xs text-gray-400 mt-2">BharatShramSetu &middot; National Worker Welfare Management System (NWWMS)</p>
          <p className="text-gray-600 leading-relaxed mt-6">
            These Terms of Service govern access to and use of the BharatShramSetu platform, its registries, digital
            worker passes, and AI-assisted site operations. By accessing or using the platform you agree to be bound
            by these Terms.
          </p>

          <div className="mt-10 space-y-8">
            {SECTIONS.map(section => (
              <section key={section.n} className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900">
                  <span className="text-[#1B365D]">{section.n}.</span> {section.title}
                </h2>
                {section.blocks.map((block, i) => <BlockView key={i} block={block} />)}
              </section>
            ))}
          </div>

          <PolicyLinks current="terms" />
        </div>
      </main>
    </div>
  );
}
