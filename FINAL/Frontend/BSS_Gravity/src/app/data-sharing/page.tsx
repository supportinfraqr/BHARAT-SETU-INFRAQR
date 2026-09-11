import PublicSiteHeader from '@/components/PublicSiteHeader';

export default function DataSharingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"><PublicSiteHeader/><main className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">Data Sharing Policy</h1>
        <p className="text-gray-600 mb-4 leading-relaxed">
          The Bharat Shram Setu Data Sharing framework ensures that your information is only shared on a strict need-to-know basis. 
        </p>
        <p className="text-gray-600 leading-relaxed">
          When you bind with an employer or contractor, limited and relevant data is securely transmitted. We do not sell your data to third parties, and all external APIs comply with national data sovereignty standards.
        </p>
      </div>
      </main>
    </div>
  );
}
