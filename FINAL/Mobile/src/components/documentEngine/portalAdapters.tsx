"use client";

import { useMemo } from 'react';
import { useContractor } from '@/contexts/ContractorContext';
import { useEmployer } from '@/contexts/EmployerContext';
import type { OwnerScope } from '@/lib/documentEngine/types';
import type { PortalView, WorkerLike } from '@/lib/documentEngine/workerDataService';

/** Contractor portal → document-engine view (data service separation). */
export function useContractorDocView(): { owner: OwnerScope; view: PortalView; workers: WorkerLike[] } {
  const { contractor } = useContractor();
  return useMemo(() => {
    const owner: OwnerScope = { ownerType: 'contractor', ownerId: contractor.identity.bssId, ownerName: contractor.identity.company, bssId: contractor.identity.bssId };
    const workers: WorkerLike[] = contractor.workers.map(worker => ({
      id: worker.id, name: worker.name, bssId: worker.bssId, mobile: worker.mobile,
      site: worker.site, siteId: worker.site,
      employer: worker.employer, designation: worker.designation, department: worker.department,
      doj: worker.doj, category: worker.category, gender: worker.gender, age: worker.age,
      photoUrl: worker.photoUrl, status: worker.status, skills: worker.skills, refCode: worker.refCode,
    }));
    const employers = contractor.employers.map(emp => ({ id: emp.id, name: emp.name, bssId: emp.id }));
    const self: { name: string; bssId: string; contact?: string; signatory?: string; address?: string } = { name: contractor.identity.company, bssId: contractor.identity.bssId, contact: contractor.identity.contact, signatory: contractor.identity.name };
    const view: PortalView = {
      owner,
      workers,
      sites: contractor.sites.map(site => ({ id: site.id, bssId: site.bssId, name: site.name, location: site.location, state: site.location.includes(',') ? site.location.split(',').pop()?.trim() : '', employer: site.employer })),
      contractors: [self],
      employers,
      payroll: contractor.payroll?.records?.map(record => ({ workerId: record.workerId, workerName: record.workerName, employer: record.employer, site: record.site, period: record.period, netPay: record.netPay, gross: record.gross, earnings: record.earnings })) ?? [],
    };
    return { owner, view, workers };
  }, [contractor]);
}

/** Employer portal → document-engine view. */
export function useEmployerDocView(): { owner: OwnerScope; view: PortalView; workers: WorkerLike[] } {
  const { employer } = useEmployer();
  return useMemo(() => {
    const owner: OwnerScope = { ownerType: 'employer', ownerId: employer.identity.bssId, ownerName: employer.identity.company, bssId: employer.identity.bssId };
    const seen = new Set<string>();
    const workers: WorkerLike[] = employer.workers.filter(worker => {
      // One entry per worker — a re-bind can leave duplicate rows behind.
      if (seen.has(worker.bssId)) return false;
      seen.add(worker.bssId);
      return true;
    }).map(worker => ({
      id: worker.id, name: worker.name, bssId: worker.bssId, mobile: worker.mobile, site: worker.site, siteId: worker.siteId,
      employer: employer.identity.company, employerId: employer.identity.bssId,
      contractor: worker.contractor, contractorId: worker.contractorId,
      designation: worker.designation, doj: worker.doj, status: worker.status, verified: worker.verified,
    }));
    const self = { name: employer.identity.company, bssId: employer.identity.bssId, contact: employer.identity.contact, signatory: employer.identity.name, address: employer.identity.address };
    const view: PortalView = {
      owner,
      workers,
      sites: employer.sites.map(site => ({ id: site.id, bssId: site.bssId, name: site.name, location: site.location, state: site.state, address: site.details?.address?.address, department: site.details?.address?.district, medicalOfficer: site.details?.contacts?.find(contact => /medical/i.test(contact.label))?.value, employer: employer.identity.company })),
      contractors: employer.contractors.map(item => ({ id: item.id, name: item.name, bssId: item.bssId, contact: item.contact, signatory: item.name })),
      employers: [self],
      payroll: employer.payroll?.records?.map(record => ({ workerId: record.workerId, workerName: record.workerName, employer: record.employer, site: record.site, period: record.period, netPay: record.netPay, gross: record.gross, earnings: record.earnings })) ?? [],
    };
    return { owner, view, workers };
  }, [employer]);
}
