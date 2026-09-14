"use client";

import { MapPin, Building2 } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';

export default function ContractorSitesPage() {
  const { contractor, employerScope, scoped } = useContractor();
  const sites = scoped(contractor.sites, s => s.employer);
  const pendingSites = scoped(contractor.pendingSites ?? [], s => s.employer);

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-950">Sites · Site-wise Workers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {employerScope === 'all' ? 'All bound principal employers' : employerScope} · sites allotted to you by the employer
          </p>
        </div>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Allotted Sites</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Site / Code</th>
                <th className="px-5 py-3">By state</th>
                <th className="px-5 py-3">Employer</th>
                <th className="px-5 py-3">Workers</th>
                <th className="px-5 py-3">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sites.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-sm text-gray-400 text-center">No sites allotted yet. Once an employer approves a site for you, it appears here.</td></tr>
              )}
              {sites.map(site => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900">{site.name}</p>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">{site.code}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600"><span className="inline-flex items-center gap-1 text-xs"><MapPin size={12}/>{site.location}</span></td>
                  <td className="px-5 py-3 text-gray-600">{site.employer}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{site.workers}</td>
                  <td className="px-5 py-3">
                    {site.compliance != null ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${site.compliance >= 95 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                        {site.compliance}%
                      </span>
                    ) : <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-50 text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(pendingSites.length > 0) && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Building2 size={15} className="text-gray-400"/>Pending site requests</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingSites.map(site => (
              <div key={site.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{site.name} <span className="font-mono text-[11px] text-gray-400">{site.code}</span></p>
                  <p className="text-xs text-gray-500">{site.employer} · {site.location}</p>
                </div>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0">Waiting approval</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}