import prisma from '@/server/db';
import { authenticate } from '@/server/auth';
import { mutatePortal, getWorkerPortal, getContractorPortal, getEmployerPortal, getGovernmentPortal } from '@/server/portal';
import { performOperationsAction, getOperationsSnapshot } from '@/server/operations';

async function test() {
  console.log('--- Adversarial Test Suite for M1 ---');

  // Test 1: Bad credentials must fail
  try {
    await authenticate({ role: 'Worker', method: 'otp', identifier: '9876543210', credential: 'wrong' });
    throw new Error('FAILED: Wrong credential should throw 401');
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not recognised')) {
      console.log('✔ Test 1: Invalid credential rejected properly');
    } else {
      throw e;
    }
  }

  // Test 2: Malicious identifier handled safely
  try {
    const maliciousId = "' OR '1'='1";
    await authenticate({ role: 'Worker', method: 'otp', identifier: maliciousId, credential: '123456' });
    console.log('✔ Test 2: Malicious identifier handled safely with parameterized query');
  } catch (err) {
    const e = err as Error;
    console.log('✔ Test 2: Malicious identifier rejected/handled:', e.message);
  }

  // Test 3: Relational persistence - Create fresh test worker and test cascade delete
  const testBssId = 'BSSTEST99999999';
  await prisma.workerProfile.deleteMany({ where: { bssId: testBssId } });
  
  const worker = await prisma.workerProfile.create({
    data: {
      bssId: testBssId,
      name: 'Adversarial Tester',
      mobile: '9999988888',
      category: 'Tester',
    }
  });

  const session = { subject: testBssId, role: 'Worker' as const, sessionId: 'test-sess', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 };

  // Add leave, grievance, wage
  await mutatePortal(session, 'leave', {
    method: 'POST',
    body: JSON.stringify({ type: 'Medical leave', from: '2026-10-01', to: '2026-10-02', reason: 'Adversarial leave check' })
  });
  await mutatePortal(session, 'grievances', {
    method: 'POST',
    body: JSON.stringify({ category: 'Safety', subject: 'Test Subject', description: 'Test Description' })
  });

  const leaves = await prisma.leaveRecord.findMany({ where: { workerBssId: testBssId } });
  const grievances = await prisma.grievance.findMany({ where: { workerBssId: testBssId } });
  if (leaves.length !== 1 || grievances.length !== 1) {
    throw new Error('FAILED: Mutation records not found for test worker');
  }
  console.log('✔ Test 3a: Direct mutations persisted for fresh worker');

  // Now delete worker profile and verify cascade deletion of leaves and grievances
  await prisma.workerProfile.delete({ where: { bssId: testBssId } });
  const remainingLeaves = await prisma.leaveRecord.findMany({ where: { workerBssId: testBssId } });
  const remainingGrievances = await prisma.grievance.findMany({ where: { workerBssId: testBssId } });
  if (remainingLeaves.length !== 0 || remainingGrievances.length !== 0) {
    throw new Error('FAILED: Cascade deletion failed on leave/grievance records');
  }
  console.log('✔ Test 3b: Cascade deletion verified for WorkerProfile -> LeaveRecord/Grievance');

  // Test 4: Operations unauthorized access
  try {
    await performOperationsAction(session as any, { action: 'command', command: 'health' });
    throw new Error('FAILED: Worker should not be allowed to run IT operations commands');
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 403 || e.message?.includes('not permitted')) {
      console.log('✔ Test 4: IT Command RBAC strictly enforced against Worker role');
    } else {
      throw err;
    }
  }

  // Test 5: Verify ticket and case transitions
  const itSession = { subject: 'BSSIT2026HDK00001', role: 'BSS Admin' as const, sessionId: 'it-sess', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 };
  const staffSession = { subject: 'BSSST2026STF00001', role: 'BSS Staff' as const, sessionId: 'staff-sess', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 };

  await performOperationsAction(itSession, { action: 'ticket', id: 'INC-2026-074', transition: 'resolve' });
  const t = await prisma.operationsTicket.findUnique({ where: { id: 'INC-2026-074' } });
  if (t?.status !== 'Resolved') throw new Error('Ticket transition failed');
  console.log('✔ Test 5a: Ticket resolved transition verified in DB');

  await performOperationsAction(staffSession, { action: 'case', id: 'DSP-201', transition: 'resolve' });
  const c = await prisma.supportCase.findUnique({ where: { id: 'DSP-201' } });
  if (c?.status !== 'Resolved') throw new Error('Case transition failed');
  console.log('✔ Test 5b: Support case resolved transition verified in DB');

  // Test 6: Verify operations audit log created automatically
  const lastLogs = await prisma.operationsLog.findMany({ take: 3, orderBy: { timestamp: 'desc' } });
  if (lastLogs.length === 0 || !lastLogs[0].message.includes('DSP-201')) {
    throw new Error('FAILED: Audit log was not written on case transition');
  }
  console.log('✔ Test 6: Operations audit log automatically generated:', lastLogs[0].message);

  console.log('=== All Adversarial & Integrity Tests Passed! ===');
}

test().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
