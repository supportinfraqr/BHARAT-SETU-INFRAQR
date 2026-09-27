"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, TriangleAlert, ShieldCheck, UserRound, Building2 } from 'lucide-react';

type WorkerVerifyData = {
  identity?: { name?: string; bssId?: string; category?: string; aadhaarVerified?: boolean; photoUrl?: string };
  employment?: { status?: string };
  skills?: { primary?: { name?: string; level?: string; experienceYears?: string } };
};
type ContractorVerifyData = { id?: number; name?: string; company?: string; bssId?: string; verified?: boolean; bssMemberSince?: string; consentDate?: string; bindingDate?: string; identity?: { bssMemberSince?: string; consentDate?: string; bindingDate?: string } };

export default function VerifyPage({ params }: { params: Promise<{ bssId: string }> }) {
  const { bssId } = use(params);
  const [data, setData] = useState<(WorkerVerifyData & ContractorVerifyData) | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/identity/verify/' + encodeURIComponent(bssId))
      .then(async response => {
        const result = await response.json() as { data?: WorkerVerifyData & ContractorVerifyData; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error ?? 'Identity could not be verified.');
        setData(result.data);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Identity could not be verified.'));
  }, [bssId]);

  const isWorker = Boolean(data?.identity);
  const photo = data?.identity?.photoUrl;
  const name = isWorker ? data?.identity?.name : data?.name;
  const id = isWorker ? data?.identity?.bssId : data?.bssId;

  return (
    <main className="min-h-[70vh] grid place-items-center p-6 bg-gray-50">
      <section className="w-full max-w-md bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-7 text-center">
            <TriangleAlert className="text-red-600 mx-auto" size={32} />
            <h1 className="text-xl font-semibold mt-3 text-gray-900">Verification failed</h1>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="bg-[#073B67] text-white p-5 flex items-center gap-3">
              <ShieldCheck size={22} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Bharat Shram Setu</p>
                <h1 className="text-lg font-bold">{isWorker ? 'Verified Worker Identity' : 'Verified Contractor Identity'}</h1>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                {isWorker ? (
                  photo ? (
                    <img src={photo} alt={name ?? 'Worker'} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <span className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-400"><UserRound size={28} /></span>
                  )
                ) : (
                  <span className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-400"><Building2 size={28} /></span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{name || '—'}</p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">{id || bssId}</p>
                  {isWorker
                    ? data?.identity?.aadhaarVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 mt-1.5"><BadgeCheck size={12} /> Aadhaar Verified</span>
                      )
                    : data?.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 mt-1.5"><BadgeCheck size={12} /> Verified</span>
                      )}
                </div>
              </div>

              {isWorker ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Category</dt>
                    <dd className="font-semibold text-gray-800 mt-0.5">{data?.identity?.category || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Employment</dt>
                    <dd className="font-semibold text-gray-800 mt-0.5">{data?.employment?.status || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Primary Skill</dt>
                    <dd className="font-semibold text-gray-800 mt-0.5">{data?.skills?.primary?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Experience</dt>
                    <dd className="font-semibold text-gray-800 mt-0.5">{data?.skills?.primary?.experienceYears || '—'}</dd>
                  </div>
                </dl>
              ) : (
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Company / Trade name</dt>
                    <dd className="font-semibold text-gray-800 mt-0.5">{data?.company || '—'}</dd>
                  </div>
                  {((data as ContractorVerifyData)?.bssMemberSince || data?.identity?.bssMemberSince) && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Member of BSS since</dt>
                      <dd className="font-semibold text-gray-800 mt-0.5">{data.bssMemberSince || data.identity?.bssMemberSince}</dd>
                    </div>
                  )}
                  {((data as ContractorVerifyData)?.consentDate || data?.identity?.consentDate) && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Consent accepted</dt>
                      <dd className="font-semibold text-gray-800 mt-0.5">{data.consentDate || data.identity?.consentDate}</dd>
                    </div>
                  )}
                  {((data as ContractorVerifyData)?.bindingDate || data?.identity?.bindingDate) && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Bound to you since</dt>
                      <dd className="font-semibold text-gray-800 mt-0.5">{data.bindingDate || data.identity?.bindingDate}</dd>
                    </div>
                  )}
                </dl>
              )}

              <p className="text-[11px] text-gray-400 text-center border-t border-gray-100 pt-4">This identity was verified against the Bharat Shram Setu registry.</p>
            </div>
          </>
        ) : (
          <p role="status" className="p-7 text-center text-sm text-gray-500">Verifying identity…</p>
        )}
        <div className="px-6 pb-6 text-center">
          <Link href="/" className="text-sm text-blue-700 font-semibold">Bharat Shram Setu</Link>
        </div>
      </section>
    </main>
  );
}
