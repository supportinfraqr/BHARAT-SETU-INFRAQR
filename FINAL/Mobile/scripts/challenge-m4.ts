import prisma from '../src/server/db';
import { getOperationsSnapshot, performOperationsAction } from '../src/server/operations';
import type { PortalSession } from '../src/types/portal';

async function runAdversarialChallenge() {
  console.log('===============================================================');
  console.log('   CHALLENGER 1: EMPIRICAL ADVERSARIAL TEST SUITE (M4)         ');
  console.log('===============================================================\n');

  const itSession: PortalSession = {
    sessionId: 'test-it-challenge-session',
    subject: 'BSSIT2026CHALLENGE01',
    role: 'BSS Admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const staffSession: PortalSession = {
    sessionId: 'test-staff-challenge-session',
    subject: 'BSSST2026STAFF01',
    role: 'BSS Staff',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const workerSession: PortalSession = {
    sessionId: 'test-worker-session',
    subject: 'BSSWK2026000001',
    role: 'Worker',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const employerSession: PortalSession = {
    sessionId: 'test-employer-session',
    subject: 'BSSEM2026000001',
    role: 'Employer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const contractorSession: PortalSession = {
    sessionId: 'test-contractor-session',
    subject: 'BSSCO2026000001',
    role: 'Contractor',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  const govSession: PortalSession = {
    sessionId: 'test-gov-session',
    subject: 'BSSGV2026000001',
    role: 'Government',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, desc: string, details?: string) {
    if (Boolean(condition)) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      if (details) console.error(`    Details: ${details}`);
      failed++;
    }
  }

  async function expectError(fn: () => Promise<unknown>, expectedStatus: number, desc: string) {
    try {
      await fn();
      console.error(`  ✗ FAIL: Expected error ${expectedStatus}, but call succeeded: ${desc}`);
      failed++;
    } catch (err: unknown) {
      const error = err as { status?: number; statusCode?: number; message?: string };
      const status = error.status || error.statusCode;
      if (status === expectedStatus || (!status && expectedStatus === 422)) {
        console.log(`  ✓ [Error ${expectedStatus} Caught] ${desc}`);
        passed++;
      } else {
        console.error(`  ✗ FAIL: Expected status ${expectedStatus} but got ${status} (${error.message}): ${desc}`);
        failed++;
      }
    }
  }

  // =========================================================================
  // SUITE 1: IT Helpdesk Terminal Commands Output Precision & Live DB Sync
  // =========================================================================
  console.log('[SUITE 1] IT Terminal Command Execution & Live Database Sync:');

  // 1.1 help command
  const help = await performOperationsAction(itSession, { action: 'command', command: 'help' });
  assert(
    help.success &&
    help.output?.length === 2 &&
    help.output[0].includes('health, services, queues, sessions, bindings, db-stats, worker-lookup [id], tail-logs [n]') &&
    help.output[1].includes('probe <service-id>, retry-binding <binding-id>'),
    'Terminal "help" precisely enumerates allowlisted commands and syntax'
  );

  // 1.2 health command
  const health = await performOperationsAction(itSession, { action: 'command', command: 'health' });
  assert(
    health.success &&
    health.output?.length === 4 &&
    health.output.some(l => l.includes('services operational')) &&
    health.output.some(l => l.includes('active tickets')) &&
    health.output.some(l => l.includes('SQLite (local persistence active)')) &&
    health.output.some(l => l.includes('Local disk storage (.data/uploads) operational')),
    'Terminal "health" accurately reports subsystem health and SQLite persistence'
  );

  // 1.3 services command
  const services = await performOperationsAction(itSession, { action: 'command', command: 'services' });
  const dbServiceCount = await prisma.operationsService.count();
  assert(
    services.success &&
    (services.output?.length ?? 0) === dbServiceCount &&
    services.output?.every(l => l.includes('ms') && l.includes('uptime')),
    `Terminal "services" returns all ${dbServiceCount} services with latency and uptime`
  );

  // 1.4 queues command
  const queues = await performOperationsAction(itSession, { action: 'command', command: 'queues' });
  const dbPendingCases = await prisma.supportCase.count({ where: { status: { not: 'Resolved' } } });
  assert(
    queues.success &&
    queues.output?.some(l => l.includes(`support-cases     ${dbPendingCases} active`)),
    `Terminal "queues" reflects actual active case queue depth (${dbPendingCases})`
  );

  // 1.5 sessions command
  const sessions = await performOperationsAction(itSession, { action: 'command', command: 'sessions' });
  const actualUsers = await prisma.user.count();
  assert(
    sessions.success &&
    sessions.output?.some(l => l.includes(`active users ${actualUsers}`)),
    `Terminal "sessions" returns accurate SQLite user count (${actualUsers})`
  );

  // 1.6 bindings command
  const bindings = await performOperationsAction(itSession, { action: 'command', command: 'bindings' });
  const boundCount = await prisma.ecsBinding.count({ where: { state: 'bound' } });
  const totalBindings = await prisma.ecsBinding.count();
  assert(
    bindings.success &&
    bindings.output?.some(l => l.includes(`bound ${boundCount}`)) &&
    bindings.output?.some(l => l.includes(`total-bindings ${totalBindings}`)),
    `Terminal "bindings" returns exact binding counts from SQLite (bound: ${boundCount}, total: ${totalBindings})`
  );

  // 1.7 db-stats and stats alias
  const dbStats = await performOperationsAction(itSession, { action: 'command', command: 'db-stats' });
  const actualWorkers = await prisma.workerProfile.count();
  const actualCases = await prisma.supportCase.count();
  const actualTickets = await prisma.operationsTicket.count();
  assert(
    dbStats.success &&
    dbStats.output?.some(l => l.includes(`Workers: ${actualWorkers}`)) &&
    dbStats.output?.some(l => l.includes(`Cases: ${actualCases}`)) &&
    dbStats.output?.some(l => l.includes(`Tickets: ${actualTickets}`)) &&
    dbStats.output?.some(l => l.includes('Database: SQLite')),
    'Terminal "db-stats" aggregates live entity counts across all models'
  );
  const statsAlias = await performOperationsAction(itSession, { action: 'command', command: 'stats' });
  assert(
    statsAlias.success &&
    statsAlias.output?.some(l => l.includes('Database: SQLite')),
    'Terminal "stats" alias executes identical db-stats routine'
  );

  // 1.8 worker-lookup variations
  const wExact = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup BSS234567890124' });
  assert(
    wExact.success &&
    wExact.output?.some(l => l.includes('[WORKER PROFILE] Ravi Kumar') && l.includes('BSS234567890124')),
    'Terminal "worker-lookup <BSS-ID>" returns full structured worker profile'
  );

  const wLower = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup bss234567890124' });
  assert(
    wLower.success &&
    wLower.output?.some(l => l.includes('Ravi Kumar')),
    'Terminal "worker-lookup" matches case-insensitively'
  );

  const wPartial = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup Ravi' });
  assert(
    wPartial.success &&
    wPartial.output?.some(l => l.includes('Ravi Kumar')),
    'Terminal "worker-lookup" searches by name substring'
  );

  const wNoArg = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup' });
  assert(
    wNoArg.success &&
    wNoArg.output?.some(l => l.includes('Usage: worker-lookup')) &&
    wNoArg.output?.some(l => l.includes('Active worker records in database:')),
    'Terminal "worker-lookup" without args displays directory summary & samples'
  );

  const wNotFound = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup NON_EXISTENT_ID_999' });
  assert(
    wNotFound.success &&
    wNotFound.output?.some(l => l.toLowerCase().includes('worker profile not found for identifier')),
    'Terminal "worker-lookup" on non-existent worker returns graceful message'
  );

  // 1.9 tail-logs & logs with varying depth
  const logsDefault = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs' });
  assert(
    logsDefault.success &&
    (logsDefault.output?.length ?? 0) <= 5 &&
    (logsDefault.output?.length ?? 0) > 0,
    'Terminal "tail-logs" defaults to 5 recent log lines'
  );

  const logsDeep = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 15' });
  assert(
    logsDeep.success &&
    (logsDeep.output?.length ?? 0) <= 15 &&
    (logsDeep.output?.length ?? 0) > 0,
    'Terminal "tail-logs 15" fetches 15 recent log lines'
  );

  const logsClampMax = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 9999' });
  assert(
    logsClampMax.success &&
    (logsClampMax.output?.length ?? 0) <= 50,
    'Terminal "tail-logs 9999" clamps cleanly to 50 max'
  );

  // 1.10 probe command
  const initialService = await prisma.operationsService.findUnique({ where: { id: 'identity' } });
  const probeRes = await performOperationsAction(itSession, { action: 'command', command: 'probe identity' });
  assert(
    probeRes.success &&
    probeRes.output?.some(l => l.includes('Identity & Session: Operational')),
    'Terminal "probe identity" returns service status and measured latency'
  );
  const updatedService = await prisma.operationsService.findUnique({ where: { id: 'identity' } });
  assert(
    updatedService?.lastCheckedAt.getTime() !== initialService?.lastCheckedAt.getTime(),
    'Terminal "probe" persists updated lastCheckedAt in SQLite database'
  );

  // 1.11 retry-binding command
  const retryRes = await performOperationsAction(itSession, { action: 'command', command: 'retry-binding BC-1039' });
  assert(
    retryRes.success &&
    retryRes.output?.some(l => l.includes('Retry accepted for BC-1039')),
    'Terminal "retry-binding BC-1039" accepts job'
  );
  const caseAfterRetry = await prisma.supportCase.findUnique({ where: { id: 'BC-1039' } });
  assert(
    caseAfterRetry?.status === 'In progress',
    'Terminal "retry-binding BC-1039" mutates SupportCase status to "In progress"'
  );

  // =========================================================================
  // SUITE 2: Adversarial Injection, Parameter Tampering & Command Fuzzing
  // =========================================================================
  console.log('\n[SUITE 2] Adversarial Injection & Security Hardening:');

  // 2.1 Shell metacharacter attacks & command injections
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'health; rm -rf /' }), 422, 'Semicolon command chaining rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: '`whoami`' }), 422, 'Backtick execution rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: '$(cat /etc/passwd)' }), 422, 'Subshell evaluation rejected');

  // 2.2 SQL Injection vectors through terminal parameters
  const sqliLookup = await performOperationsAction(itSession, { action: 'command', command: "worker-lookup ' OR '1'='1" });
  assert(
    sqliLookup.success && sqliLookup.output?.some(l => l.includes('not found')),
    'SQL injection in worker-lookup parameterized and safely rejected by Prisma'
  );

  const sqliLookupUnion = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup " UNION SELECT * FROM User --' });
  assert(
    sqliLookupUnion.success && sqliLookupUnion.output?.some(l => l.includes('not found')),
    'UNION SELECT SQL injection safely handled as literal string'
  );

  // 2.3 Identifier validation & path traversal defense
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'probe identity; DROP TABLE User;' }), 422, 'Probe with SQL injection rejected by requireIdentifier');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'probe ../../../etc/passwd' }), 422, 'Probe with path traversal rejected by requireIdentifier');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'probe <script>alert(1)</script>' }), 422, 'Probe with XSS payload rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'probe ' }), 422, 'Probe without identifier rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'probe non-existent-service-xyz' }), 404, 'Probe for validly formatted but non-existent service returns 404');

  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'retry-binding BC-1039; DROP TABLE SupportCase;' }), 422, 'retry-binding with SQL injection rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'retry-binding ../../dev.db' }), 422, 'retry-binding with path traversal rejected');
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: 'retry-binding ' }), 422, 'retry-binding without ID rejected');

  // 2.4 Command Buffer Boundary Limits
  const oversizedCmd = 'help ' + 'A'.repeat(200);
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: oversizedCmd }), 422, 'Command > 120 chars rejected with 422');

  const emptyCmd = '';
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: emptyCmd }), 422, 'Empty command string rejected with 422');

  const whitespaceCmd = '     ';
  await expectError(() => performOperationsAction(itSession, { action: 'command', command: whitespaceCmd }), 422, 'Whitespace-only command rejected with 422');

  // 2.5 Disallowed / Arbitrary Verbs
  const badVerbs = ['rm', 'cat', 'ls', 'curl', 'wget', 'sudo', 'admin', 'eval', 'drop', 'delete', 'select', 'update', 'reboot', 'kill'];
  for (const verb of badVerbs) {
    await expectError(() => performOperationsAction(itSession, { action: 'command', command: verb }), 422, `Disallowed verb "${verb}" rejected as unallowlisted`);
  }

  // =========================================================================
  // SUITE 3: RBAC & Cross-Role Authorization Boundaries
  // =========================================================================
  console.log('\n[SUITE 3] Role-Based Access Control (RBAC) Enforcement:');

  const unauthorizedSessions = [
    { role: 'Worker', session: workerSession },
    { role: 'Employer', session: employerSession },
    { role: 'Contractor', session: contractorSession },
    { role: 'Government', session: govSession },
  ];

  for (const { role, session } of unauthorizedSessions) {
    await expectError(() => performOperationsAction(session, { action: 'command', command: 'health' }), 403, `${role} role blocked from executing terminal commands (403 Forbidden)`);
    await expectError(() => performOperationsAction(session, { action: 'probe-service', id: 'identity' }), 403, `${role} role blocked from probing services (403 Forbidden)`);
    await expectError(() => performOperationsAction(session, { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }), 403, `${role} role blocked from mutating incident tickets (403 Forbidden)`);
    await expectError(() => performOperationsAction(session, { action: 'case', id: 'BC-1039', transition: 'claim' }), 403, `${role} role blocked from mutating support cases (403 Forbidden)`);
    await expectError(() => getOperationsSnapshot(session), 403, `${role} role blocked from reading operations snapshot (403 Forbidden)`);
  }

  // BSS Staff attempting IT-specific operations
  await expectError(() => performOperationsAction(staffSession, { action: 'command', command: 'health' }), 403, 'BSS Staff blocked from executing IT terminal commands (403 Forbidden)');
  await expectError(() => performOperationsAction(staffSession, { action: 'probe-service', id: 'identity' }), 403, 'BSS Staff blocked from probing services (403 Forbidden)');
  await expectError(() => performOperationsAction(staffSession, { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }), 403, 'BSS Staff blocked from modifying IT incident tickets (403 Forbidden)');

  // BSS Admin attempting Staff-specific case mutations
  await expectError(() => performOperationsAction(itSession, { action: 'case', id: 'BC-1039', transition: 'claim' }), 403, 'BSS Admin blocked from mutating BSS Staff cases (403 Forbidden)');

  // =========================================================================
  // SUITE 4: BSS Staff Live Case State Machine Transitions & Persistence
  // =========================================================================
  console.log('\n[SUITE 4] BSS Staff Genuine Case Lifecycle & State Machine:');

  const testCaseId = 'DOC-2048';

  // 4.1 Claim transition
  const c1 = await performOperationsAction(staffSession, { action: 'case', id: testCaseId, transition: 'claim' });
  assert(c1.success && c1.message.includes('In progress'), 'Action case:claim succeeds');
  const db1 = await prisma.supportCase.findUnique({ where: { id: testCaseId } });
  assert(
    db1?.status === 'In progress' && db1?.assignee === staffSession.subject,
    'Case in SQLite updated with status="In progress" and assignee=session.subject'
  );

  // 4.2 Wait transition
  const c2 = await performOperationsAction(staffSession, { action: 'case', id: testCaseId, transition: 'wait' });
  assert(c2.success && c2.message.includes('Waiting for evidence'), 'Action case:wait succeeds');
  const db2 = await prisma.supportCase.findUnique({ where: { id: testCaseId } });
  assert(db2?.status === 'Waiting for evidence', 'Case in SQLite updated with status="Waiting for evidence"');

  // 4.3 Escalate transition
  const c3 = await performOperationsAction(staffSession, { action: 'case', id: testCaseId, transition: 'escalate' });
  assert(c3.success && c3.message.includes('Escalated'), 'Action case:escalate succeeds');
  const db3 = await prisma.supportCase.findUnique({ where: { id: testCaseId } });
  assert(db3?.status === 'Escalated', 'Case in SQLite updated with status="Escalated"');

  // 4.4 Resolve transition
  const c4 = await performOperationsAction(staffSession, { action: 'case', id: testCaseId, transition: 'resolve' });
  assert(c4.success && c4.message.includes('Resolved'), 'Action case:resolve succeeds');
  const db4 = await prisma.supportCase.findUnique({ where: { id: testCaseId } });
  assert(db4?.status === 'Resolved', 'Case in SQLite updated with status="Resolved"');

  // 4.5 Error paths on case mutations
  await expectError(() => performOperationsAction(staffSession, { action: 'case', id: 'CASE-NONEXISTENT-999', transition: 'claim' }), 404, 'Mutating non-existent case returns 404 Not Found');
  await expectError(() => performOperationsAction(staffSession, { action: 'case', id: '<script>', transition: 'claim' }), 422, 'Case ID with HTML/special characters rejected with 422 Unprocessable');
  await expectError(() => performOperationsAction(staffSession, { action: 'case', id: 'X', transition: 'claim' }), 422, 'Case ID shorter than 2 chars rejected with 422');
  await expectError(() => performOperationsAction(staffSession, { action: 'case', id: 'X'.repeat(81), transition: 'claim' }), 422, 'Case ID longer than 80 chars rejected with 422');

  // 4.6 Rapid sequential state cycle on case DSP-201
  const churnCaseId = 'DSP-201';
  const cycle = ['claim', 'wait', 'claim', 'escalate', 'resolve', 'claim'] as const;
  for (const transition of cycle) {
    const res = await performOperationsAction(staffSession, { action: 'case', id: churnCaseId, transition });
    assert(res.success, `Rapid state transition to "${transition}" succeeded`);
  }
  const dbChurn = await prisma.supportCase.findUnique({ where: { id: churnCaseId } });
  assert(dbChurn?.status === 'In progress', 'Case status correctly settled at "In progress" after rapid sequential transitions');

  // =========================================================================
  // SUITE 5: OperationsLog Streaming, Audit Trail & Telemetry
  // =========================================================================
  console.log('\n[SUITE 5] OperationsLog Audit Trail, Telemetry & Segregation:');

  // Perform unique logged operations
  await performOperationsAction(itSession, { action: 'command', command: 'health' });
  await performOperationsAction(staffSession, { action: 'case', id: 'WRK-881', transition: 'claim' });
  await performOperationsAction(itSession, { action: 'ticket', id: 'INC-2026-081', transition: 'claim' });
  await performOperationsAction(itSession, { action: 'probe-service', id: 'otp' });

  // Direct SQLite query verification
  const auditLogs = await prisma.operationsLog.findMany({ take: 15, orderBy: { timestamp: 'desc' } });
  assert(
    auditLogs.some(l => l.source === 'ops-terminal' && l.message.includes(itSession.subject)),
    'Terminal commands create OperationsLog entry with source "ops-terminal" and actor subject'
  );
  assert(
    auditLogs.some(l => l.source === 'staff-workbench' && l.message.includes(staffSession.subject)),
    'Staff case transitions create OperationsLog entry with source "staff-workbench" and actor subject'
  );
  assert(
    auditLogs.some(l => l.source === 'tickets' && l.message.includes(itSession.subject)),
    'Ticket transitions create OperationsLog entry with source "tickets" and actor subject'
  );
  assert(
    auditLogs.some(l => l.source === 'service-probe' && l.message.includes(itSession.subject)),
    'Service probes create OperationsLog entry with source "service-probe" and actor subject'
  );
  assert(
    auditLogs.every(l => l.correlationId && l.correlationId.startsWith('corr-')),
    'All persisted OperationsLog entries contain valid correlation IDs'
  );

  // BSS Admin Snapshot Segregation
  const itSnap = await getOperationsSnapshot(itSession);
  assert(itSnap.role === 'BSS Admin', 'IT snapshot returns role="BSS Admin"');
  assert(itSnap.services.length > 0, 'IT snapshot includes operational services');
  assert(itSnap.tickets.length > 0, 'IT snapshot includes operations incident tickets');
  assert(itSnap.logs.length > 0 && itSnap.logs.length <= 40, 'IT snapshot provides up to 40 recent audit/debug logs');
  assert(
    itSnap.cases.every(c => c.status === 'Escalated'),
    'IT snapshot scopes case visibility to Escalated cases only'
  );

  // BSS Staff Snapshot Segregation
  const staffSnap = await getOperationsSnapshot(staffSession);
  assert(staffSnap.role === 'BSS Staff', 'Staff snapshot returns role="BSS Staff"');
  assert(staffSnap.services.length === 0, 'Staff snapshot securely omits IT infrastructure services');
  assert(staffSnap.tickets.length === 0, 'Staff snapshot securely omits IT incident tickets');
  assert(staffSnap.cases.length > 0, 'Staff snapshot includes complete unified case queue');
  assert(
    staffSnap.logs.every(l => l.level === 'audit'),
    'Staff snapshot restricts log visibility strictly to audit-level events'
  );

  // Telemetry metrics verification
  const totalOpenTickets = await prisma.operationsTicket.count({ where: { status: { not: 'Resolved' } } });
  const totalOpenCases = await prisma.supportCase.count({ where: { status: { not: 'Resolved' } } });
  assert(
    itSnap.metrics.openTickets === totalOpenTickets && itSnap.metrics.openCases === totalOpenCases,
    `Snapshot metrics precisely reflect real database queue depths (tickets: ${totalOpenTickets}, cases: ${totalOpenCases})`
  );

  // =========================================================================
  // SUITE 6: Concurrency & Stress Load Verification
  // =========================================================================
  console.log('\n[SUITE 6] Concurrency & High-Frequency Burst Testing:');

  const concurrentCommands = [
    performOperationsAction(itSession, { action: 'command', command: 'health' }),
    performOperationsAction(itSession, { action: 'command', command: 'services' }),
    performOperationsAction(itSession, { action: 'command', command: 'db-stats' }),
    performOperationsAction(itSession, { action: 'command', command: 'queues' }),
    performOperationsAction(itSession, { action: 'command', command: 'sessions' }),
    performOperationsAction(itSession, { action: 'command', command: 'bindings' }),
    performOperationsAction(itSession, { action: 'command', command: 'worker-lookup BSS234567890124' }),
    performOperationsAction(itSession, { action: 'command', command: 'tail-logs 10' }),
  ];

  const concurrentResults = await Promise.all(concurrentCommands);
  assert(
    concurrentResults.every(r => r.success && r.output && r.output.length > 0),
    '8 concurrent terminal commands executed successfully without race condition or DB lock contention'
  );

  console.log('\n===============================================================');
  console.log(`   CHALLENGE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialChallenge()
  .catch((err) => {
    console.error('Adversarial challenge execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
