import PublicSiteHeader from '@/components/PublicSiteHeader';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"><PublicSiteHeader/><main className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4 leading-relaxed">
          At Bharat Shram Setu, your privacy is our utmost priority. We are committed to protecting your personal information and ensuring transparency in how we collect, use, and store your data.
        </p>
        <p className="text-gray-600 leading-relaxed">
          This policy outlines our strict adherence to data protection laws, ensuring your identity and work records remain secure and are only accessed by authorized entities for verification purposes.
        </p>
      </div>
      </main>
    </div>
  );
}
