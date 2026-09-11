import prisma from '@/server/db';
import { authenticate } from '@/server/auth';
import { getWorkerPortal, getContractorPortal, getEmployerPortal, getGovernmentPortal, mutatePortal } from '@/server/portal';
import { getOperationsSnapshot, performOperationsAction } from '@/server/operations';

async function runTests() {
  console.log('=== Starting Milestone 1 Integration & Integrity Tests ===');

  // 1. Auth tests for all 6 roles
  console.log('Testing authentication for 6 roles against SQLite...');
  const workerAuth = await authenticate({ role: 'Worker', method: 'otp', identifier: '9876543210', credential: '123456' });
  console.log('✔ Worker authenticated:', workerAuth.subject);
  const contractorAuth = await authenticate({ role: 'Contractor', method: 'mpin', identifier: 'BSSC198200000001', credential: '1234' });
  console.log('✔ Contractor authenticated:', contractorAuth.subject);
  const employerAuth = await authenticate({ role: 'Employer', method: 'password', identifier: 'BSSE100210000001', credential: '1234' });
  console.log('✔ Employer authenticated:', employerAuth.subject);
  const itAuth = await authenticate({ role: 'BSS Admin', method: 'mpin', identifier: 'BSSIT2026HDK00001', credential: '1234' });
  console.log('✔ BSS Admin authenticated:', itAuth.subject);
  const staffAuth = await authenticate({ role: 'BSS Staff', method: 'mpin', identifier: 'BSSST2026STF00001', credential: '1234' });
  console.log('✔ BSS Staff authenticated:', staffAuth.subject);
  const govAuth = await authenticate({ role: 'Government', method: 'password', identifier: 'BSSGOV2026ADM00001', credential: '1234' });
  console.log('✔ Government authenticated:', govAuth.subject);

  // 2. Portal Data Tests
  console.log('\nTesting Portal Data reading from SQLite...');
  const workerData = await getWorkerPortal({ subject: workerAuth.subject, role: 'Worker', sessionId: 's-1', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 });
  console.log('✔ Worker portal loaded:', workerData.worker.identity.name, '| Wages count:', workerData.wages.records.length, '| Docs count:', workerData.documents.length);

  const contractorData = await getContractorPortal({ subject: contractorAuth.subject, role: 'Contractor', sessionId: 's-2', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 });
  console.log('✔ Contractor portal loaded:', contractorData.identity.company, '| Workers count:', contractorData.workers.length, '| Sites count:', contractorData.sites.length);

  const employerData = await getEmployerPortal({ subject: employerAuth.subject, role: 'Employer', sessionId: 's-3', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 });
  console.log('✔ Employer portal loaded:', employerData.identity.company, '| Sites count:', employerData.sites.length, '| Approvals count:', employerData.approvals.length);

  const govData = await getGovernmentPortal({ subject: govAuth.subject, role: 'Government', sessionId: 's-4', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 });
  console.log('✔ Government portal loaded | GovWorkers count:', govData.workers.length);

  // 3. Mutation Tests
  console.log('\nTesting Portal Mutations persisting to SQLite...');
  // Worker leave
  const leaveRes = await mutatePortal<{ success: boolean; data: { id: string } }>({ subject: workerAuth.subject, role: 'Worker', sessionId: 's-1', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, 'leave', {
    method: 'POST',
    body: JSON.stringify({ type: 'Personal leave', from: '2026-09-10', to: '2026-09-12', reason: 'Family festival' }),
  });
  console.log('✔ Leave created:', leaveRes.data.id);
  const dbLeave = await prisma.leaveRecord.findFirst({ where: { reason: 'Family festival' } });
  if (!dbLeave) throw new Error('Leave record not found in SQLite!');
  console.log('✔ DB Leave verified in SQLite:', dbLeave.id, dbLeave.fromDate, dbLeave.status);

  // Worker availability
  await mutatePortal({ subject: workerAuth.subject, role: 'Worker', sessionId: 's-1', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, 'availability', {
    method: 'PATCH',
    body: JSON.stringify({ available: true }),
  });
  const dbWorker = await prisma.workerProfile.findUnique({ where: { bssId: workerAuth.subject } });
  if (!dbWorker?.availability) throw new Error('Worker availability was not updated in SQLite!');
  console.log('✔ Worker availability in SQLite:', dbWorker.availability);

  // Contractor adds salary
  const salaryRes = await mutatePortal<{ success: boolean; data: Array<{ id: string }> }>({ subject: contractorAuth.subject, role: 'Contractor', sessionId: 's-2', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, 'salaries', {
    method: 'POST',
    body: JSON.stringify({
      worker: 'Ravi Kumar',
      workerId: 'BSS234567890124',
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      period: 'September 2026',
      gross: 32000,
      deductions: 3000,
      net: 29000,
      paidOn: '2026-09-28',
    }),
  });
  console.log('✔ Salary created in DB:', salaryRes.data[0]?.id);
  const dbSal = await prisma.salaryRecord.findFirst({ where: { period: 'September 2026' } });
  if (!dbSal) throw new Error('Salary record not found in SQLite!');
  console.log('✔ DB Salary verified in SQLite:', dbSal.id, 'Net:', dbSal.net);

  // 4. Operations Snapshot & Action Tests
  console.log('\nTesting Operations Snapshot & Actions with SQLite...');
  const opsSnapshot = await getOperationsSnapshot({ subject: itAuth.subject, role: 'BSS Admin', sessionId: 's-5', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 });
  console.log('✔ Ops Snapshot loaded | Services:', opsSnapshot.services.length, '| Tickets:', opsSnapshot.tickets.length, '| Logs:', opsSnapshot.logs.length);

  const cmdRes = await performOperationsAction({ subject: itAuth.subject, role: 'BSS Admin', sessionId: 's-5', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, {
    action: 'command',
    command: 'health',
  });
  console.log('✔ Command output (health):', cmdRes.output);

  const dbStatsRes = await performOperationsAction({ subject: itAuth.subject, role: 'BSS Admin', sessionId: 's-5', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, {
    action: 'command',
    command: 'db-stats',
  });
  console.log('✔ Command output (db-stats):', dbStatsRes.output);

  const probeRes = await performOperationsAction({ subject: itAuth.subject, role: 'BSS Admin', sessionId: 's-5', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, {
    action: 'probe-service',
    id: 'identity',
  });
  console.log('✔ Probe result:', probeRes.message);

  const ticketRes = await performOperationsAction({ subject: itAuth.subject, role: 'BSS Admin', sessionId: 's-5', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, {
    action: 'ticket',
    id: 'INC-2026-081',
    transition: 'claim',
  });
  console.log('✔ Ticket action result:', ticketRes.message);
  const dbTicket = await prisma.operationsTicket.findUnique({ where: { id: 'INC-2026-081' } });
  if (dbTicket?.status !== 'In progress') throw new Error('Ticket status was not updated in SQLite!');
  console.log('✔ DB Ticket verified in SQLite:', dbTicket.id, dbTicket.status, dbTicket.assignee);

  const caseRes = await performOperationsAction({ subject: staffAuth.subject, role: 'BSS Staff', sessionId: 's-6', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, {
    action: 'case',
    id: 'BC-1039',
    transition: 'claim',
  });
  console.log('✔ Case action result:', caseRes.message);
  const dbCase = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  if (dbCase?.status !== 'In progress') throw new Error('Case status was not updated in SQLite!');
  console.log('✔ DB Case verified in SQLite:', dbCase.id, dbCase.status, dbCase.assignee);

  console.log('\n=== All Milestone 1 Integration Tests Passed Successfully! ===');
}

runTests()
  .catch(e => { console.error('Test error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
