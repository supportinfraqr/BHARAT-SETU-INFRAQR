import PublicSiteHeader from '@/components/PublicSiteHeader';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"><PublicSiteHeader/><main className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">Terms & Conditions</h1>
        <p className="text-gray-600 mb-4 leading-relaxed">
          By accessing and using the Bharat Shram Setu portal, you agree to comply with our core terms of service. 
        </p>
        <p className="text-gray-600 leading-relaxed">
          These terms govern the use of your BSS Identity, your responsibilities as a user (whether you are a worker, contractor, or employer), and our commitment to maintaining a robust, reliable, and secure infrastructure.
        </p>
      </div>
      </main>
    </div>
  );
}
