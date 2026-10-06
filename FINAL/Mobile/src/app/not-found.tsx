import Link from 'next/link';

export default function NotFound() {
  return <main className="min-h-[70vh] grid place-items-center p-6"><section className="max-w-lg text-center"><p className="text-sm font-semibold text-blue-700">404</p><h1 className="mt-2 text-2xl font-semibold">Page not found</h1><p className="mt-2 text-sm text-gray-600">The link may be outdated or you may not have access.</p><Link href="/" className="mt-5 inline-flex rounded-lg bg-[#073B67] text-white px-4 py-2 text-sm font-semibold">Return to sign in</Link></section></main>;
}

