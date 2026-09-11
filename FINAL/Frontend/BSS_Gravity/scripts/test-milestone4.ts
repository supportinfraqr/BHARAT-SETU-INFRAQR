import prisma from '../src/server/db';
import { getOperationsSnapshot, performOperationsAction } from '../src/server/operations';
import type { PortalSession } from '../src/types/portal';

async function runM4Verification() {
  console.log('--- Starting Milestone 4 Verification Test ---');

  const itSession: PortalSession = {
    sessionId: 'test-it-session',
    subject: 'BSSIT2026HDK00001',
    role: 'BSS Admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const staffSession: PortalSession = {
    sessionId: 'test-staff-session',
    subject: 'BSSST2026STF00001',
    role: 'BSS Staff',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, desc: string) {
    if (Boolean(condition)) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ ${desc}`);
      failed++;
    }
  }

  // 1. IT Helpdesk Terminal Commands
  console.log('\n[1] Testing IT Helpdesk Restricted Terminal Commands:');

  // 1.1 help
  const helpRes = await performOperationsAction(itSession, { action: 'command', command: 'help' });
  assert(helpRes.success && helpRes.output?.some(l => l.includes('health') && l.includes('worker-lookup')), 'Terminal "help" returns allowed commands list');

  // 1.2 health
  const healthRes = await performOperationsAction(itSession, { action: 'command', command: 'health' });
  assert(healthRes.success && healthRes.output?.some(l => l.includes('services operational')), 'Terminal "health" reports operational services count');

  // 1.3 services
  const servicesRes = await performOperationsAction(itSession, { action: 'command', command: 'services' });
  assert(servicesRes.success && servicesRes.output?.some(l => l.includes('identity')), 'Terminal "services" reports identity service');

  // 1.4 db-stats / stats
  const dbStatsRes = await performOperationsAction(itSession, { action: 'command', command: 'db-stats' });
  assert(dbStatsRes.success && dbStatsRes.output?.some(l => l.includes('Users:') && l.includes('Workers:')), 'Terminal "db-stats" returns genuine database counts');
  const statsRes = await performOperationsAction(itSession, { action: 'command', command: 'stats' });
  assert(statsRes.success && statsRes.output?.some(l => l.includes('Database: SQLite')), 'Terminal "stats" alias returns database summary');

  // 1.5 worker-lookup
  const workerLookupArgRes = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup BSS234567890124' });
  assert(workerLookupArgRes.success && workerLookupArgRes.output?.some(l => l.includes('Ravi Kumar')), 'Terminal "worker-lookup BSS234567890124" finds worker profile in SQLite');
  const workerLookupNoArgRes = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup' });
  assert(workerLookupNoArgRes.success && workerLookupNoArgRes.output?.some(l => l.includes('Active worker records in database')), 'Terminal "worker-lookup" without args displays directory summary');

  // 1.6 tail-logs / logs
  const tailLogsRes = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 3' });
  assert(tailLogsRes.success && (tailLogsRes.output?.length ?? 0) <= 3 && (tailLogsRes.output?.length ?? 0) > 0, 'Terminal "tail-logs 3" returns recent log lines');

  // 1.7 probe identity
  const probeRes = await performOperationsAction(itSession, { action: 'command', command: 'probe identity' });
  assert(probeRes.success && probeRes.output?.some(l => l.includes('latency')), 'Terminal "probe identity" probes service latency');

  // 1.8 retry-binding
  const retryRes = await performOperationsAction(itSession, { action: 'command', command: 'retry-binding BC-1039' });
  assert(retryRes.success && retryRes.output?.some(l => l.includes('Retry accepted for BC-1039')), 'Terminal "retry-binding BC-1039" places job on retry queue');

  // 1.9 queues, sessions, bindings
  const queuesRes = await performOperationsAction(itSession, { action: 'command', command: 'queues' });
  assert(queuesRes.success && queuesRes.output?.some(l => l.includes('support-cases')), 'Terminal "queues" reports queue status');
  const sessionsRes = await performOperationsAction(itSession, { action: 'command', command: 'sessions' });
  assert(sessionsRes.success && sessionsRes.output?.some(l => l.includes('active users')), 'Terminal "sessions" reports user count');
  const bindingsRes = await performOperationsAction(itSession, { action: 'command', command: 'bindings' });
  assert(bindingsRes.success && bindingsRes.output?.some(l => l.includes('total-bindings')), 'Terminal "bindings" reports bindings count');

  // 2. BSS Staff Case Management Lifecycle
  console.log('\n[2] Testing BSS Staff Genuine Case Lifecycle:');

  // 2.1 Claim case
  const claimRes = await performOperationsAction(staffSession, { action: 'case', id: 'BC-1039', transition: 'claim' });
  assert(claimRes.success && claimRes.message.includes('In progress'), 'Staff case "claim" transitions state to "In progress"');
  const dbCaseAfterClaim = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  assert(dbCaseAfterClaim?.status === 'In progress' && dbCaseAfterClaim?.assignee === staffSession.subject, 'Case in SQLite has status "In progress" and assignee set');

  // 2.2 Wait for evidence
  const waitRes = await performOperationsAction(staffSession, { action: 'case', id: 'BC-1039', transition: 'wait' });
  assert(waitRes.success && waitRes.message.includes('Waiting for evidence'), 'Staff case "wait" transitions state to "Waiting for evidence"');
  const dbCaseAfterWait = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  assert(dbCaseAfterWait?.status === 'Waiting for evidence', 'Case in SQLite has status "Waiting for evidence"');

  // 2.3 Escalate case
  const escalateRes = await performOperationsAction(staffSession, { action: 'case', id: 'BC-1039', transition: 'escalate' });
  assert(escalateRes.success && escalateRes.message.includes('Escalated'), 'Staff case "escalate" transitions state to "Escalated"');
  const dbCaseAfterEsc = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  assert(dbCaseAfterEsc?.status === 'Escalated', 'Case in SQLite has status "Escalated"');

  // 2.4 Resolve case
  const resolveRes = await performOperationsAction(staffSession, { action: 'case', id: 'BC-1039', transition: 'resolve' });
  assert(resolveRes.success && resolveRes.message.includes('Resolved'), 'Staff case "resolve" transitions state to "Resolved"');
  const dbCaseAfterResolve = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  assert(dbCaseAfterResolve?.status === 'Resolved', 'Case in SQLite has status "Resolved"');

  // 3. IT Incident Ticket Lifecycle
  console.log('\n[3] Testing IT Operations Ticket Lifecycle:');

  const ticketClaimRes = await performOperationsAction(itSession, { action: 'ticket', id: 'INC-2026-081', transition: 'claim' });
  assert(ticketClaimRes.success && ticketClaimRes.message.includes('In progress'), 'Ticket "claim" transitions state to "In progress"');

  const ticketMonRes = await performOperationsAction(itSession, { action: 'ticket', id: 'INC-2026-081', transition: 'monitor' });
  assert(ticketMonRes.success && ticketMonRes.message.includes('Monitoring'), 'Ticket "monitor" transitions state to "Monitoring"');

  const ticketResolveRes = await performOperationsAction(itSession, { action: 'ticket', id: 'INC-2026-081', transition: 'resolve' });
  assert(ticketResolveRes.success && ticketResolveRes.message.includes('Resolved'), 'Ticket "resolve" transitions state to "Resolved"');

  // 4. Operations Snapshot & Log Streaming
  console.log('\n[4] Testing Operations Snapshot & Live Audit Logging:');

  const itSnapshot = await getOperationsSnapshot(itSession);
  assert(itSnapshot.role === 'BSS Admin' && itSnapshot.services.length > 0 && itSnapshot.logs.length > 0, 'IT Operations snapshot contains services, metrics, and logs from SQLite');

  const staffSnapshot = await getOperationsSnapshot(staffSession);
  assert(staffSnapshot.role === 'BSS Staff' && staffSnapshot.cases.length > 0, 'BSS Staff snapshot contains cases and staff audit logs from SQLite');

  const recentAuditLogs = await prisma.operationsLog.findMany({ take: 5, orderBy: { timestamp: 'desc' } });
  assert(recentAuditLogs.some(l => l.source === 'staff-workbench' || l.source === 'ops-terminal' || l.source === 'tickets'), 'Audit log entries were persisted in OperationsLog SQLite table for recent operations');

  console.log(`\n--- Milestone 4 Verification Summary: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runM4Verification()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
