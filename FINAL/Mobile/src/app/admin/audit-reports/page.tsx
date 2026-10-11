import { FileBarChart2, Sparkles, Wrench } from 'lucide-react';
import AdminPageHero from '@/components/admin/AdminPageHero';

export default function AdminAuditReportsPage() {
  return <div className="space-y-6">
    <AdminPageHero eyebrow="Compliance governance" title="Audit & Verification Reports" icon={<FileBarChart2 size={14}/>} />

    <section className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
      <span className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto"><Wrench size={30} /></span>
      <h2 className="text-xl font-bold text-gray-950 mt-4">Under development</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
        Admin-side compliance report generation has been retired. Compliance audit reports are now generated
        automatically by AI for each compliance submission and are downloadable as a branded PDF by the
        contractor who submitted them.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#073B67] bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 max-w-xl mx-auto">
        <Sparkles size={15} />
        AI audit reports appear on Contractor → Compliance → Compliance Records after a submission.
      </div>
    </section>
  </div>;
}
