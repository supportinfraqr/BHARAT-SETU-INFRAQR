"use client";

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error:Error & { digest?:string }; reset:() => void }) {
  useEffect(() => { console.error('Application route failed', error); }, [error]);
  return <main className="min-h-[60vh] grid place-items-center p-6"><section className="max-w-lg bg-white border rounded-2xl p-8 text-center"><h1 className="text-xl font-semibold">This page could not be loaded</h1><p className="mt-2 text-sm text-gray-600">Your data was not changed. Try again, or return to the dashboard.</p><button type="button" onClick={reset} className="mt-5 rounded-lg bg-[#073B67] text-white px-4 py-2 text-sm font-semibold">Try again</button></section></main>;
}

