import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../prisma/seed';
import {
  getWorkerPortal,
  getContractorPortal,
  getEmployerPortal,
  getGovernmentPortal,
  mutatePortal,
} from '../src/server/portal';
import {
  getOperationsSnapshot,
  performOperationsAction,
} from '../src/server/operations';
import type { PortalSession } from '../src/types/portal';

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
    results.push({ suite, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [${suite}] ${name} (${Date.now() - start}ms)`);
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

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Mock Portal Sessions for 6 roles
const sessions: Record<string, PortalSession> = {
  worker: {
    sessionId: 'sess-worker-1',
    subject: 'BSS234567890124',
    role: 'Worker',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
  contractor: {
    sessionId: 'sess-contractor-1',
    subject: 'BSSC198200000001',
    role: 'Contractor',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
  employer: {
    sessionId: 'sess-employer-1',
    subject: 'BSSE100210000001',
    role: 'Employer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
  itHelpdesk: {
    sessionId: 'sess-it-1',
    subject: 'BSSIT2026HDK00001',
    role: 'BSS Admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
  bssStaff: {
    sessionId: 'sess-staff-1',
    subject: 'BSSST2026STF00001',
    role: 'BSS Staff',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
  government: {
    sessionId: 'sess-gov-1',
    subject: 'BSSGOV2026ADM00001',
    role: 'Government',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  },
};

export async function runAdversarialM1Tests() {
  console.log('\n======================================================================');
  console.log('  Milestone 1: Database & Backend Data Layer Empirical Verification  ');
  console.log('======================================================================\n');

  // =========================================================================
  // SUITE 1: Seed Fixture Verification & Idempotency
  // =========================================================================
  console.log('\n--- SUITE 1: Seed Fixtures & Idempotency ---');

  await testCase('Seed Fixtures', 'Clean initial seeding executes without errors', async () => {
    await seedDatabase();
  });

  await testCase('Seed Fixtures', 'All 6 primary User records exist with correct roles', async () => {
    const users = await prisma.user.findMany();
    assertEqual(users.length, 6, 'Should have exactly 6 users');
    const roles = users.map(u => u.role).sort();
    assertEqual(
      JSON.stringify(roles),
      JSON.stringify(['BSS Staff', 'Contractor', 'Employer', 'Government', 'BSS Admin', 'Worker'].sort())
    );
  });

  await testCase('Seed Fixtures', 'WorkerProfile and all relational child entities are seeded', async () => {
    const worker = await prisma.workerProfile.findUnique({
      where: { bssId: 'BSS234567890124' },
      include: {
        documents: true,
        wages: true,
        attendance: true,
        pfRecords: true,
        bonuses: true,
        leaveEncashments: true,
        leaves: true,
        grievances: true,
        jobRequests: true,
        cardOrders: true,
      },
    });
    assert(!!worker, 'Worker profile must exist');
    assert(worker!.documents.length >= 12, 'Worker must have at least 12 documents');
    assert(worker!.wages.length >= 3, 'Worker must have at least 3 wage records');
    assert(worker!.attendance.length >= 7, 'Worker must have at least 7 attendance records');
    assert(worker!.pfRecords.length >= 3, 'Worker must have at least 3 PF records');
    assert(worker!.bonuses.length >= 3, 'Worker must have at least 3 bonus records');
    assert(worker!.leaveEncashments.length >= 2, 'Worker must have at least 2 leave encashment records');
    assert(worker!.leaves.length >= 2, 'Worker must have at least 2 leave records');
    assert(worker!.grievances.length >= 1, 'Worker must have at least 1 grievance');
    assert(worker!.jobRequests.length >= 2, 'Worker must have at least 2 job requests');
    assert(worker!.cardOrders.length >= 1, 'Worker must have at least 1 card order');
  });

  await testCase('Seed Fixtures', 'Contractor and Employer relational domain entities are seeded', async () => {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { bssId: 'BSSC198200000001' },
    });
    assert(!!contractor, 'Contractor must exist');

    const employer = await prisma.employerProfile.findUnique({
      where: { bssId: 'BSSE100210000001' },
    });
    assert(!!employer, 'Employer must exist');

    const sites = await prisma.site.findMany({ where: { employerBssId: employer!.bssId } });
    assert(sites.length >= 3, 'Employer must have at least 3 sites');

    const bindings = await prisma.contractorEmployerBinding.findMany();
    assert(bindings.length >= 3, 'Must have at least 3 contractor-employer bindings');

    const assignments = await prisma.contractorWorkerAssignment.findMany();
    assert(assignments.length >= 8, 'Must have at least 8 contractor-worker assignments');

    const submissions = await prisma.documentSubmission.findMany();
    assert(submissions.length >= 4, 'Must have at least 4 document submissions');
  });

  await testCase('Seed Fixtures', 'Government demographic dataset contains 108 records across 12 states', async () => {
    const count = await prisma.governmentWorker.count();
    assertEqual(count, 108, 'Government demographic workers count must be exactly 108');
    const states = await prisma.governmentWorker.groupBy({
      by: ['state'],
      _count: { id: true },
    });
    assertEqual(states.length, 12, 'Must cover 12 states');
    for (const s of states) {
      assertEqual(s._count.id, 9, `State ${s.state} must have 9 workers`);
    }
  });

  await testCase('Seed Fixtures', 'Operations services, tickets, logs, and BSS support cases are seeded', async () => {
    const services = await prisma.operationsService.findMany();
    assertEqual(services.length, 6, 'Must have 6 operational services');

    const tickets = await prisma.operationsTicket.findMany();
    assert(tickets.length >= 4, 'Must have at least 4 operations tickets');

    const logs = await prisma.operationsLog.findMany();
    assert(logs.length >= 5, 'Must have at least 5 operations logs');

    const cases = await prisma.supportCase.findMany();
    assert(cases.length >= 4, 'Must have at least 4 support cases');

    const ecsBindings = await prisma.ecsBinding.findMany();
    assert(ecsBindings.length >= 2, 'Must have at least 2 ECS bindings');
  });

  await testCase('Seed Fixtures', 'Idempotency: Re-running seed cleans and repopulates cleanly without error', async () => {
    await seedDatabase();
    const userCount = await prisma.user.count();
    assertEqual(userCount, 6, 'User count must remain 6 after re-seed');
    const govCount = await prisma.governmentWorker.count();
    assertEqual(govCount, 108, 'Gov count must remain 108 after re-seed');
  });

  // =========================================================================
  // SUITE 2: Portal Data Retrieval against SQLite
  // =========================================================================
  console.log('\n--- SUITE 2: Portal Queries against SQLite ---');

  await testCase('Portal Queries', 'getWorkerPortal reads live records from SQLite', async () => {
    const data = await getWorkerPortal(sessions.worker);
    assertEqual(data.worker.identity.bssId, 'BSS234567890124');
    assertEqual(data.worker.identity.name, 'Ravi Kumar');
    assert(data.wages.records.length >= 3, 'Wages must come from DB');
    assert(data.attendance.records.length >= 7, 'Attendance must come from DB');
    assert(data.providentFund.records.length >= 3, 'PF must come from DB');
    assert(data.bonus.records.length >= 3, 'Bonus must come from DB');
    assert(data.leaveEncashment.records.length >= 2, 'Leave encashment must come from DB');
    assert(data.documents.length >= 12, 'Documents must come from DB');
  });

  await testCase('Portal Queries', 'getContractorPortal reads live records from SQLite', async () => {
    const data = await getContractorPortal(sessions.contractor);
    assertEqual(data.identity.bssId, 'BSSC198200000001');
    assertEqual(data.identity.company, 'RK Buildcon Pvt. Ltd.');
    assert(data.workers.length >= 4, 'Contractor workers must come from DB');
    assert(data.compliances.length >= 4, 'Compliances must come from DB');
    assert(data.complianceReports.length >= 4, 'Compliance reports must come from DB');
    assert(data.gatePasses.length >= 3, 'Gate passes must come from DB');
    assert(data.salaries.length >= 3, 'Salaries must come from DB');
  });

  await testCase('Portal Queries', 'getEmployerPortal reads live records from SQLite', async () => {
    const data = await getEmployerPortal(sessions.employer);
    assertEqual(data.identity.bssId, 'BSSE100210000001');
    assertEqual(data.identity.company, 'L&T Construction');
    assert(data.sites.length >= 3, 'Sites must come from DB');
    assert(data.approvals.length >= 5, 'Approvals must come from DB');
    assert(data.complianceReports.length >= 6, 'Employer compliance reports must come from DB');
    assert(data.users.length >= 4, 'Employer users must come from DB');
    assert(data.routes.length >= 3, 'Employer routes must come from DB');
  });

  await testCase('Portal Queries', 'getGovernmentPortal reads live demographic records from SQLite', async () => {
    const data = await getGovernmentPortal(sessions.government);
    assertEqual(data.workers.length, 108, 'Government workers must equal 108');
  });

  // =========================================================================
  // SUITE 3: Portal Mutations & Persistence to SQLite
  // =========================================================================
  console.log('\n--- SUITE 3: Portal Mutations Persistence ---');

  await testCase('Portal Mutations', 'mutatePortal card-orders creates CardOrder & Notification in SQLite', async () => {
    const res = await mutatePortal<{ requestId: string; status: string }>(sessions.worker, 'card-orders', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'razorpay',
        amount: 19900,
        addressConfirmed: true,
        deliveryAddress: { city: 'Mumbai', pin: '400059' },
      }),
    });

    assert(!!res.requestId, 'Must return requestId');
    assertEqual(res.status, 'awaiting_payment');

    const dbOrder = await prisma.cardOrder.findUnique({
      where: { requestId: res.requestId },
    });
    assert(!!dbOrder, 'Card order must be persisted in SQLite');
    assertEqual(dbOrder!.workerBssId, sessions.worker.subject);
    assertEqual(dbOrder!.amount, 19900);

    const dbNotif = await prisma.notification.findFirst({
      where: {
        recipientBssId: sessions.worker.subject,
        category: 'Cards',
        message: { contains: res.requestId },
      },
    });
    assert(!!dbNotif, 'Notification for card order must be persisted in SQLite');
  });

  await testCase('Portal Mutations', 'mutatePortal leave creates LeaveRecord in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: { id: string } }>(sessions.worker, 'leave', {
      method: 'POST',
      body: JSON.stringify({
        type: 'Medical leave',
        from: '2026-09-10',
        to: '2026-09-12',
        reason: 'Empirical adversarial test leave reason',
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const leaveId = res.data.id;
    assert(!!leaveId, 'Must return created leave id');

    const dbLeave = await prisma.leaveRecord.findUnique({
      where: { id: leaveId },
    });
    assert(!!dbLeave, 'LeaveRecord must be persisted in SQLite');
    assertEqual(dbLeave!.workerBssId, sessions.worker.subject);
    assertEqual(dbLeave!.reason, 'Empirical adversarial test leave reason');
    assertEqual(dbLeave!.status, 'Pending');
  });

  await testCase('Portal Mutations', 'mutatePortal grievances creates Grievance in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: { id: string } }>(sessions.worker, 'grievances', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Wage Dispute',
        subject: 'Empirical Grievance Test',
        description: 'Test grievance description for persistence check.',
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const gId = res.data.id;
    assert(!!gId, 'Must return grievance id');

    const dbGrievance = await prisma.grievance.findUnique({
      where: { id: gId },
    });
    assert(!!dbGrievance, 'Grievance must be persisted in SQLite');
    assertEqual(dbGrievance!.subject, 'Empirical Grievance Test');
    assertEqual(dbGrievance!.status, 'Submitted');
  });

  await testCase('Portal Mutations', 'mutatePortal availability updates WorkerProfile in SQLite', async () => {
    await mutatePortal(sessions.worker, 'availability', {
      method: 'POST',
      body: JSON.stringify({ available: true }),
    });

    let profile = await prisma.workerProfile.findUnique({
      where: { bssId: sessions.worker.subject },
    });
    assertEqual(profile!.availability, true, 'Worker availability must be true in SQLite');

    await mutatePortal(sessions.worker, 'availability', {
      method: 'POST',
      body: JSON.stringify({ available: false }),
    });

    profile = await prisma.workerProfile.findUnique({
      where: { bssId: sessions.worker.subject },
    });
    assertEqual(profile!.availability, false, 'Worker availability must be updated to false in SQLite');
  });

  await testCase('Portal Mutations', 'mutatePortal benefits creates ContractorBenefitRecord & BonusRecord in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: Array<{ id: string }> }>(sessions.contractor, 'benefits', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bonus',
        worker: 'Ravi Kumar',
        workerId: 'BSS234567890124',
        employer: 'L&T Construction',
        period: 'September 2026',
        amount: 8500,
        reason: 'Adversarial test bonus',
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const createdId = res.data[0].id;
    assert(!!createdId, 'Must return created benefit ID');

    const dbBenefit = await prisma.contractorBenefitRecord.findUnique({
      where: { id: createdId },
    });
    assert(!!dbBenefit, 'ContractorBenefitRecord must exist in SQLite');
    assertEqual(dbBenefit!.amount, 8500);

    const dbBonus = await prisma.bonusRecord.findFirst({
      where: {
        workerBssId: 'BSS234567890124',
        reason: 'Adversarial test bonus',
      },
    });
    assert(!!dbBonus, 'BonusRecord linked to worker profile must also be created');
    assertEqual(dbBonus!.amount, 8500);
  });

  await testCase('Portal Mutations', 'mutatePortal salaries creates SalaryRecord & WageRecord in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: Array<{ id: string }> }>(sessions.contractor, 'salaries', {
      method: 'POST',
      body: JSON.stringify({
        worker: 'Ravi Kumar',
        workerId: 'BSS234567890124',
        employer: 'L&T Construction',
        site: 'Mumbai Metro Line 3',
        period: 'September 2026',
        gross: 35000,
        deductions: 3500,
        net: 31500,
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const salaryId = res.data[0].id;
    assert(!!salaryId, 'Must return created salary ID');

    const dbSalary = await prisma.salaryRecord.findUnique({
      where: { id: salaryId },
    });
    assert(!!dbSalary, 'SalaryRecord must exist in SQLite');
    assertEqual(dbSalary!.gross, 35000);

    const dbWage = await prisma.wageRecord.findFirst({
      where: {
        workerBssId: 'BSS234567890124',
        period: 'September 2026',
      },
    });
    assert(!!dbWage, 'WageRecord must also be created in SQLite');
    assertEqual(dbWage!.net, 31500);
  });

  await testCase('Portal Mutations', 'mutatePortal workers assigns worker to contractor in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: Array<{ id: string }> }>(sessions.contractor, 'workers', {
      method: 'POST',
      body: JSON.stringify({
        workerBssId: 'BSS892199299999',
        name: 'Adversarial Assigned Worker',
        mobile: '+91 99999 88888',
        site: 'Mumbai Metro Line 3',
        employer: 'L&T Construction',
        designation: 'Fitter',
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const assignmentId = res.data[0].id;
    assert(!!assignmentId, 'Must return assignment ID');

    const dbAssignment = await prisma.contractorWorkerAssignment.findUnique({
      where: { id: assignmentId },
    });
    assert(!!dbAssignment, 'Assignment must exist in SQLite');
    assertEqual(dbAssignment!.name, 'Adversarial Assigned Worker');
  });

  await testCase('Portal Mutations', 'mutatePortal compliances creates ComplianceRecord in SQLite', async () => {
    const res = await mutatePortal<{ success: boolean; data: Array<{ id: string }> }>(sessions.contractor, 'compliances', {
      method: 'POST',
      body: JSON.stringify({
        item: 'Fire Safety Clearance',
        category: 'Site Safety',
        reference: 'FSC-2026-999',
        employer: 'L&T Construction',
        site: 'Mumbai Metro Line 3',
        issue: '2026-08-01',
        expiry: '2027-07-31',
      }),
    });

    assert(res.success, 'Mutation must succeed');
    const cmpId = res.data[0].id;
    assert(!!cmpId, 'Must return compliance ID');

    const dbCmp = await prisma.complianceRecord.findUnique({
      where: { id: cmpId },
    });
    assert(!!dbCmp, 'ComplianceRecord must exist in SQLite');
    assertEqual(dbCmp!.reference, 'FSC-2026-999');
  });

  await testCase('Portal Mutations', 'mutatePortal gate-passes creates & updates GatePass in SQLite', async () => {
    const createRes = await mutatePortal<{ success: boolean; data: { id: string } }>(sessions.contractor, 'gate-passes', {
      method: 'POST',
      body: JSON.stringify({
        workerName: 'Ravi Kumar',
        workerId: 'BSS234567890124',
        employer: 'L&T Construction',
        site: 'Mumbai Metro Line 3',
        type: 'Temporary',
        validFrom: '2026-09-01',
        validTo: '2026-09-30',
      }),
    });

    assert(createRes.success, 'POST must succeed');
    const gpId = createRes.data.id;
    assert(!!gpId, 'Must return gate-pass ID');

    let dbGp = await prisma.gatePass.findUnique({ where: { id: gpId } });
    assertEqual(dbGp!.status, 'Pending');

    const patchRes = await mutatePortal<{ success: boolean }>(sessions.employer, 'gate-passes', {
      method: 'PATCH',
      body: JSON.stringify({ id: gpId, status: 'Approved' }),
    });
    assert(patchRes.success, 'PATCH must succeed');

    dbGp = await prisma.gatePass.findUnique({ where: { id: gpId } });
    assertEqual(dbGp!.status, 'Approved', 'Gate pass status must be Approved in SQLite');
  });

  await testCase('Portal Mutations', 'mutatePortal approvals updates EmployerApproval & creates EmployerAudit', async () => {
    const existingApproval = await prisma.employerApproval.findFirst({
      where: { employerBssId: sessions.employer.subject, status: 'Pending' },
    });
    assert(!!existingApproval, 'Should have a pending approval in seed');

    const res = await mutatePortal<{ success: boolean }>(sessions.employer, 'approvals', {
      method: 'PATCH',
      body: JSON.stringify({ ids: [existingApproval!.id], status: 'Approved' }),
    });
    assert(res.success, 'PATCH approvals must succeed');

    const updated = await prisma.employerApproval.findUnique({
      where: { id: existingApproval!.id },
    });
    assertEqual(updated!.status, 'Approved', 'Approval must be Approved in SQLite');

    const audit = await prisma.employerAudit.findFirst({
      where: {
        employerBssId: sessions.employer.subject,
        entity: { contains: existingApproval!.id },
      },
    });
    assert(!!audit, 'EmployerAudit record must be created in SQLite');
  });

  await testCase('Portal Mutations', 'mutatePortal submissions updates DocumentSubmission in SQLite', async () => {
    const sub = await prisma.documentSubmission.findFirst();
    assert(!!sub, 'Document submission must exist');

    const res = await mutatePortal<{ success: boolean }>(sessions.employer, 'submissions', {
      method: 'PATCH',
      body: JSON.stringify({ id: sub!.id, status: 'Verified' }),
    });
    assert(res.success, 'Submissions PATCH must succeed');

    const updated = await prisma.documentSubmission.findUnique({ where: { id: sub!.id } });
    assertEqual(updated!.status, 'Verified', 'Submission status must be Verified in SQLite');
  });

  await testCase('Portal Mutations', 'mutatePortal sites creates Site in SQLite', async () => {
    const siteCode = `SITE-TEST-${Date.now()}`;
    const res = await mutatePortal<{ success: boolean }>(sessions.employer, 'sites', {
      method: 'POST',
      body: JSON.stringify({
        code: siteCode,
        name: 'Adversarial Test Construction Site',
        location: 'Navi Mumbai',
        state: 'Maharashtra',
        startDate: '2026-09-01',
        endDate: '2028-12-31',
        contractorIds: ['CONT-001'],
      }),
    });

    assert(res.success, 'POST sites must succeed');
    const dbSite = await prisma.site.findUnique({ where: { code: siteCode } });
    assert(!!dbSite, 'Site must be persisted in SQLite');
    assertEqual(dbSite!.name, 'Adversarial Test Construction Site');
  });

  await testCase('Portal Mutations', 'mutatePortal courses upserts WorkerCourseProgress in SQLite', async () => {
    await mutatePortal(sessions.worker, 'courses', {
      method: 'POST',
      body: JSON.stringify({
        courseId: 'course-masonry-101',
        progress: 75,
        completedModules: ['mod-1', 'mod-2', 'mod-3'],
      }),
    });

    let dbProgress = await prisma.workerCourseProgress.findUnique({
      where: {
        workerBssId_courseId: {
          workerBssId: sessions.worker.subject,
          courseId: 'course-masonry-101',
        },
      },
    });
    assert(!!dbProgress, 'Course progress must be created in SQLite');
    assertEqual(dbProgress!.progress, 75);

    // Upsert update test
    await mutatePortal(sessions.worker, 'courses', {
      method: 'POST',
      body: JSON.stringify({
        courseId: 'course-masonry-101',
        progress: 100,
        completedModules: ['mod-1', 'mod-2', 'mod-3', 'mod-4'],
      }),
    });

    dbProgress = await prisma.workerCourseProgress.findUnique({
      where: {
        workerBssId_courseId: {
          workerBssId: sessions.worker.subject,
          courseId: 'course-masonry-101',
        },
      },
    });
    assertEqual(dbProgress!.progress, 100, 'Course progress must be updated to 100% in SQLite');
  });

  // =========================================================================
  // SUITE 4: Operations Layer Verification (IT Helpdesk & BSS Staff)
  // =========================================================================
  console.log('\n--- SUITE 4: Operations Actions & Live DB Logging ---');

  await testCase('Operations', 'getOperationsSnapshot returns live DB services, logs, tickets, and cases', async () => {
    const itSnap = await getOperationsSnapshot(sessions.itHelpdesk);
    assertEqual(itSnap.role, 'BSS Admin');
    assert(itSnap.services.length >= 6, 'IT Helpdesk snapshot must include all services');
    assert(itSnap.tickets.length >= 4, 'IT Helpdesk snapshot must include tickets');
    assert(itSnap.logs.length >= 5, 'IT Helpdesk snapshot must include logs');

    const staffSnap = await getOperationsSnapshot(sessions.bssStaff);
    assertEqual(staffSnap.role, 'BSS Staff');
    assert(staffSnap.cases.length >= 4, 'BSS Staff snapshot must include support cases');
    assertEqual(staffSnap.services.length, 0, 'BSS Staff should not see raw services');
  });

  await testCase('Operations', 'executeCommand executes terminal commands against SQLite and writes OperationsLog', async () => {
    const commands = ['health', 'services', 'queues', 'sessions', 'bindings', 'db-stats', 'tail-logs', 'probe identity'];

    for (const cmd of commands) {
      const res = await performOperationsAction(sessions.itHelpdesk, {
        action: 'command',
        command: cmd,
      });
      assert(res.success, `Command '${cmd}' must succeed`);
      assert(Array.isArray(res.output) && res.output.length > 0, `Command '${cmd}' must return output array`);
    }

    const logs = await prisma.operationsLog.findMany({
      where: { source: 'ops-terminal' },
    });
    assert(logs.length >= commands.length, 'Every terminal command must write to OperationsLog in SQLite');
  });

  await testCase('Operations', 'probe-service updates latencyMs and writes audit log to SQLite', async () => {
    const initialService = await prisma.operationsService.findUnique({ where: { id: 'portal' } });
    assert(!!initialService, 'Portal service must exist');

    const res = await performOperationsAction(sessions.itHelpdesk, {
      action: 'probe-service',
      id: 'portal',
    });
    assert(res.success, 'Probe action must succeed');

    const updatedService = await prisma.operationsService.findUnique({ where: { id: 'portal' } });
    assert(updatedService!.lastCheckedAt.getTime() >= initialService!.lastCheckedAt.getTime(), 'lastCheckedAt must be updated');

    const probeLog = await prisma.operationsLog.findFirst({
      where: { source: 'service-probe', message: { contains: 'probed portal' } },
    });
    assert(!!probeLog, 'Probe action must write audit log in SQLite');
  });

  await testCase('Operations', 'ticket status transitions (claim, monitor, resolve, escalate) persist in SQLite', async () => {
    const ticket = await prisma.operationsTicket.findFirst();
    assert(!!ticket, 'Ticket must exist');

    const transitions: Array<'claim' | 'monitor' | 'resolve' | 'escalate'> = ['claim', 'monitor', 'escalate', 'resolve'];
    const expectedStatuses = ['In progress', 'Monitoring', 'Escalated', 'Resolved'];

    for (let i = 0; i < transitions.length; i++) {
      const trans = transitions[i];
      const res = await performOperationsAction(sessions.itHelpdesk, {
        action: 'ticket',
        id: ticket!.id,
        transition: trans,
      });
      assert(res.success, `Transition ${trans} must succeed`);

      const dbTicket = await prisma.operationsTicket.findUnique({ where: { id: ticket!.id } });
      assertEqual(dbTicket!.status, expectedStatuses[i], `Ticket status must be ${expectedStatuses[i]} in SQLite`);
      if (trans === 'claim') {
        assertEqual(dbTicket!.assignee, sessions.itHelpdesk.subject, 'Assignee must be set on claim');
      }
    }
  });

  await testCase('Operations', 'BSS Staff support case transitions (claim, wait, escalate, resolve) persist in SQLite', async () => {
    const scCase = await prisma.supportCase.findFirst();
    assert(!!scCase, 'Support case must exist');

    const transitions: Array<'claim' | 'wait' | 'escalate' | 'resolve'> = ['claim', 'wait', 'escalate', 'resolve'];
    const expectedStatuses = ['In progress', 'Waiting for evidence', 'Escalated', 'Resolved'];

    for (let i = 0; i < transitions.length; i++) {
      const trans = transitions[i];
      const res = await performOperationsAction(sessions.bssStaff, {
        action: 'case',
        id: scCase!.id,
        transition: trans,
      });
      assert(res.success, `Transition ${trans} must succeed`);

      const dbCase = await prisma.supportCase.findUnique({ where: { id: scCase!.id } });
      assertEqual(dbCase!.status, expectedStatuses[i], `Case status must be ${expectedStatuses[i]} in SQLite`);
      if (trans === 'claim') {
        assertEqual(dbCase!.assignee, sessions.bssStaff.subject, 'Assignee must be set on claim');
      }
    }
  });

  await testCase('Operations', 'Role authorization barriers: Unauthorized roles are rejected with status 403', async () => {
    let workerBlocked = false;
    try {
      await performOperationsAction(sessions.worker, { action: 'command', command: 'health' });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
        workerBlocked = true;
      }
    }
    assert(workerBlocked, 'Worker must be blocked from operations actions with 403');

    let itBlockedFromCases = false;
    try {
      await performOperationsAction(sessions.itHelpdesk, { action: 'case', id: 'BC-1039', transition: 'resolve' });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
        itBlockedFromCases = true;
      }
    }
    assert(itBlockedFromCases, 'IT Helpdesk must be blocked from modifying BSS Staff cases');

    let staffBlockedFromTickets = false;
    try {
      await performOperationsAction(sessions.bssStaff, { action: 'ticket', id: 'INC-2026-081', transition: 'resolve' });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
        staffBlockedFromTickets = true;
      }
    }
    assert(staffBlockedFromTickets, 'BSS Staff must be blocked from modifying IT Helpdesk tickets');
  });

  // =========================================================================
  // SUITE 5: Concurrency, Race Condition & Stress Verification
  // =========================================================================
  console.log('\n--- SUITE 5: Concurrency, Race Conditions & Stress Testing ---');

  await testCase('Concurrency Stress', '50 parallel card orders create distinct orders without data loss', async () => {
    const count = 50;
    const tag = `STRESS-CARD-${Date.now()}`;

    const tasks = Array.from({ length: count }, (_, i) =>
      mutatePortal<{ requestId: string }>(sessions.worker, 'card-orders', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'razorpay',
          amount: 19900 + i,
          addressConfirmed: true,
          deliveryAddress: { tag, index: i, city: 'Mumbai' },
        }),
      })
    );

    const responses = await Promise.all(tasks);
    assertEqual(responses.length, count, 'All 50 parallel requests must complete');

    const requestIds = responses.map(r => r.requestId);
    const dbOrders = await prisma.cardOrder.findMany({
      where: { requestId: { in: requestIds } },
    });
    assertEqual(dbOrders.length, count, `All ${count} created card orders must be present in SQLite`);

    const uniqueIds = new Set(requestIds);
    assertEqual(uniqueIds.size, count, 'All 50 generated request IDs must be unique');
  });

  await testCase('Concurrency Stress', '50 parallel grievances create distinct records without deadlock', async () => {
    const count = 50;
    const tag = `STRESS-GRV-${Date.now()}`;

    const tasks = Array.from({ length: count }, (_, i) =>
      mutatePortal<{ success: boolean; data: { id: string } }>(sessions.worker, 'grievances', {
        method: 'POST',
        body: JSON.stringify({
          category: 'Concurrent Dispute',
          subject: `${tag} #${i}`,
          description: `Description for concurrent grievance item ${i}`,
        }),
      })
    );

    const responses = await Promise.all(tasks);
    assertEqual(responses.length, count, 'All 50 parallel grievance creations must complete');

    const grievanceIds = responses.map(r => r.data.id);
    const dbGrievances = await prisma.grievance.findMany({
      where: { id: { in: grievanceIds } },
    });
    assertEqual(dbGrievances.length, count, `All ${count} created grievances must be present in SQLite`);
  });

  await testCase('Concurrency Stress', '50 rapid concurrent course upserts resolve without SQLite locking errors', async () => {
    const courseId = `course-stress-${Date.now()}`;
    const tasks = Array.from({ length: 50 }, (_, i) =>
      mutatePortal(sessions.worker, 'courses', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          progress: i * 2,
          completedModules: [`mod-${i}`],
        }),
      })
    );

    await Promise.all(tasks);

    const finalProgress = await prisma.workerCourseProgress.findUnique({
      where: {
        workerBssId_courseId: {
          workerBssId: sessions.worker.subject,
          courseId,
        },
      },
    });
    assert(!!finalProgress, 'Course progress record must exist');
    assert(finalProgress!.progress >= 0 && finalProgress!.progress <= 100, 'Progress must be a valid percentage');
  });

  await testCase('Concurrency Stress', 'Rapid sequential mixed mutations across 6 roles maintain full database integrity', async () => {
    const initialLogs = await prisma.operationsLog.count();

    for (let i = 0; i < 25; i++) {
      await mutatePortal(sessions.worker, 'leave', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Casual leave',
          from: '2026-10-01',
          to: '2026-10-02',
          reason: `Sequential leave ${i}`,
        }),
      });

      await mutatePortal(sessions.contractor, 'compliances', {
        method: 'POST',
        body: JSON.stringify({
          item: `Sequential Compliance ${i}`,
          category: 'Statutory',
          reference: `SEQ-CMP-${Date.now()}-${i}`,
          employer: 'L&T Construction',
          site: 'Mumbai Metro Line 3',
          issue: '2026-09-01',
          expiry: '2027-08-31',
        }),
      });

      await performOperationsAction(sessions.itHelpdesk, {
        action: 'command',
        command: 'tail-logs',
      });
    }

    const finalLogs = await prisma.operationsLog.count();
    assert(finalLogs >= initialLogs + 25, 'Operations logs must increase by at least 25');
  });

  interface IntegrityCheckResult {
    integrity_check: string;
  }

  interface ForeignKeyViolationResult {
    table: string;
    rowid: number;
    parent: string;
    fkid: number;
  }

  await testCase('Database Integrity', 'PRAGMA integrity_check & foreign_key_check confirm SQLite database is healthy', async () => {
    const integrity = await prisma.$queryRawUnsafe<IntegrityCheckResult[]>('PRAGMA integrity_check;');
    assertEqual(integrity[0].integrity_check, 'ok', 'SQLite integrity_check must return "ok"');

    const foreignKeys = await prisma.$queryRawUnsafe<ForeignKeyViolationResult[]>('PRAGMA foreign_key_check;');
    assertEqual(foreignKeys.length, 0, 'SQLite foreign_key_check must return 0 violations');
  });

  // =========================================================================
  // Summary & Verdict
  // =========================================================================
  console.log('\n======================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`  Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================\n');

  return { results, passed, failed };
}

if (require.main === module) {
  runAdversarialM1Tests()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test runner fatal error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
