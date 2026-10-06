import { PrismaClient, Prisma } from '@prisma/client';
import { execSync } from 'node:child_process';
import path from 'node:path';

const prisma = new PrismaClient();

let passedTests = 0;
let failedTests = 0;
const testFailures: Array<{ name: string; error: string }> = [];

async function assertTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ▶ Running: ${name}... `);
  try {
    await fn();
    console.log('\x1b[32m✔ PASS\x1b[0m');
    passedTests++;
  } catch (err: any) {
    console.log('\x1b[31m✖ FAIL\x1b[0m');
    console.error(`    \x1b[31mError: ${err?.message || err}\x1b[0m`);
    testFailures.push({ name, error: err?.stack || err?.message || String(err) });
    failedTests++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runEmpiricalStressSuite() {
  console.log('\n======================================================================');
  console.log('   CHALLENGER EMPIRICAL STRESS & INTEGRITY SUITE (MILESTONE 1)');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const testPrefix = `STRESS_${timestamp}`;

  // ==========================================================================
  // SECTION 1: CRUD OPERATIONS FOR ALL 6 ROLES
  // ==========================================================================
  console.log('\x1b[34m[SECTION 1] CRUD Operations for All 6 Roles & Associated Relations\x1b[0m');

  // --- Role 1: Worker Domain ---
  await assertTest('Worker Domain: Full Entity Lifecycle (Parent + 11 Child Tables)', async () => {
    const bssId = `WRK_${testPrefix}_01`;

    // 1. Create WorkerProfile
    const profile = await prisma.workerProfile.create({
      data: {
        bssId,
        name: 'Stress Test Worker',
        category: 'Scaffolder',
        dob: '1992-04-10',
        gender: 'Male',
        mobile: '9876500001',
        aadhaar: 'XXXX XXXX 9999',
        pan: 'STRES1234P',
        employmentStatus: 'Active',
        skillsJson: JSON.stringify({ primary: 'Scaffolding', level: 'Level 3' }),
        personalJson: JSON.stringify({ bloodGroup: 'O+' }),
        bankingJson: JSON.stringify({ bank: 'HDFC', ifsc: 'HDFC0001234', acc: '50100200300' }),
      },
    });
    assert(profile.bssId === bssId, 'WorkerProfile created with correct bssId');

    // 2. Create Child Relations
    // WorkerDocument
    const doc = await prisma.workerDocument.create({
      data: { workerBssId: bssId, name: 'Medical Certificate', status: 'Verified', mandatory: true },
    });
    // WageRecord
    const wage = await prisma.wageRecord.create({
      data: { workerBssId: bssId, period: 'August 2026', paidOn: '2026-08-30', employer: 'Test Employer', contractor: 'Test Contractor', site: 'Test Site', gross: 25000, deductions: 2000, net: 23000 },
    });
    // AttendanceRecord
    const attendance = await prisma.attendanceRecord.create({
      data: { workerBssId: bssId, date: '2026-08-30', presence: 'Present', site: 'Test Site', shift: 'General' },
    });
    // ProvidentFundRecord
    const pf = await prisma.providentFundRecord.create({
      data: { workerBssId: bssId, period: 'August 2026', employeeContribution: 1800, employerContribution: 1800, creditedOn: '2026-08-31' },
    });
    // BonusRecord
    const bonus = await prisma.bonusRecord.create({
      data: { workerBssId: bssId, period: 'FY 2025-26', reason: 'Diwali Bonus', amount: 5000, paidOn: '2026-08-30' },
    });
    // LeaveEncashmentRecord
    const encashment = await prisma.leaveEncashmentRecord.create({
      data: { workerBssId: bssId, period: '2026', days: 10, rate: 800, amount: 8000, paidOn: '2026-08-30' },
    });
    // LeaveRecord
    const leave = await prisma.leaveRecord.create({
      data: { workerBssId: bssId, type: 'Casual', fromDate: '2026-09-01', toDate: '2026-09-03', reason: 'Personal', submitted: '2026-08-30' },
    });
    // Grievance
    const grievance = await prisma.grievance.create({
      data: { workerBssId: bssId, category: 'Wage Discrepancy', subject: 'Overtime not credited', description: 'Missing 10 hours overtime' },
    });
    // JobRequest
    const jobReq = await prisma.jobRequest.create({
      data: { workerBssId: bssId, employer: 'Test Employer', contractor: 'Test Contractor', site: 'Test Site', designation: 'Senior Scaffolder', wage: 30000, duration: '6 months', dateReceived: '2026-08-30' },
    });
    // CardOrder
    const cardOrder = await prisma.cardOrder.create({
      data: { requestId: `CARD_${testPrefix}_01`, workerBssId: bssId, provider: 'razorpay', amount: 19900, deliveryAddress: JSON.stringify({ city: 'Mumbai', pin: '400001' }) },
    });
    // WorkerCourseProgress
    const course = await prisma.workerCourseProgress.create({
      data: { workerBssId: bssId, courseId: 'COURSE_SAFETY_101', progress: 100, completedModules: JSON.stringify(['M1', 'M2', 'M3']) },
    });

    // 3. Read Worker with all 11 relations
    const fullWorker = await prisma.workerProfile.findUnique({
      where: { bssId },
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
        courseProgress: true,
      },
    });

    assert(fullWorker !== null, 'Worker found with relations');
    assert(fullWorker!.documents.length === 1, 'Documents relation count 1');
    assert(fullWorker!.wages.length === 1, 'Wages relation count 1');
    assert(fullWorker!.attendance.length === 1, 'Attendance relation count 1');
    assert(fullWorker!.pfRecords.length === 1, 'PF relation count 1');
    assert(fullWorker!.bonuses.length === 1, 'Bonus relation count 1');
    assert(fullWorker!.leaveEncashments.length === 1, 'Encashments relation count 1');
    assert(fullWorker!.leaves.length === 1, 'Leaves relation count 1');
    assert(fullWorker!.grievances.length === 1, 'Grievances relation count 1');
    assert(fullWorker!.jobRequests.length === 1, 'JobRequests relation count 1');
    assert(fullWorker!.cardOrders.length === 1, 'CardOrders relation count 1');
    assert(fullWorker!.courseProgress.length === 1, 'CourseProgress relation count 1');

    // 4. Update Worker
    const updatedWorker = await prisma.workerProfile.update({
      where: { bssId },
      data: {
        availability: true,
        category: 'Lead Scaffolder',
      },
    });
    assert(updatedWorker.availability === true, 'Worker availability updated');
    assert(updatedWorker.category === 'Lead Scaffolder', 'Worker category updated');

    // 5. Cleanup
    await prisma.workerProfile.delete({ where: { bssId } });
    const remaining = await prisma.workerProfile.findUnique({ where: { bssId } });
    assert(remaining === null, 'Worker cleanly deleted');
  });

  // --- Role 2: Contractor Domain ---
  await assertTest('Contractor Domain: Full Entity Lifecycle (Parent + Child Models)', async () => {
    const conBssId = `CON_${testPrefix}_01`;
    const wrkBssId = `WRK_CON_${testPrefix}_01`;

    // Create Contractor Profile
    const contractor = await prisma.contractorProfile.create({
      data: {
        bssId: conBssId,
        name: 'Sharma Infra Services',
        company: 'Sharma Infra Private Limited',
        rating: 4.7,
        contact: '9876511111',
        email: 'contact@sharmainfra.test',
      },
    });
    assert(contractor.bssId === conBssId, 'ContractorProfile created');

    // ContractorEmployerBinding
    const binding = await prisma.contractorEmployerBinding.create({
      data: { contractorBssId: conBssId, employerId: `EMP_${testPrefix}`, employerName: 'L&T', boundSince: '2026-01-01' },
    });
    // ContractorWorkerAssignment
    const assignment = await prisma.contractorWorkerAssignment.create({
      data: { contractorBssId: conBssId, workerBssId: wrkBssId, name: 'Assigned Worker', mobile: '9876522222', site: 'Site Alpha', employer: 'L&T', designation: 'Fitter', doj: '2026-02-01' },
    });
    // ComplianceRecord
    const compRecord = await prisma.complianceRecord.create({
      data: { contractorBssId: conBssId, item: 'Form V License', category: 'Statutory', reference: 'LIC-2026-99', employer: 'L&T', site: 'Site Alpha', issueDate: '2026-01-01', expiryDate: '2027-01-01' },
    });
    // ComplianceReport
    const compReport = await prisma.complianceReport.create({
      data: { contractorBssId: conBssId, site: 'Site Alpha', employer: 'L&T', period: 'August 2026', type: 'Monthly Audit', status: 'Compliant' },
    });
    // GatePass
    const gatePass = await prisma.gatePass.create({
      data: { workerName: 'Gate Worker', workerId: wrkBssId, contractor: conBssId, employer: 'L&T', site: 'Site Alpha', type: 'Permanent', validFrom: '2026-08-01', validTo: '2026-12-31', status: 'Pending' },
    });
    // ContractorBenefitRecord
    const benefit = await prisma.contractorBenefitRecord.create({
      data: { contractorBssId: conBssId, type: 'bonus', worker: 'Gate Worker', workerId: wrkBssId, employer: 'L&T', period: 'August 2026', amount: 3500, paidOn: '2026-08-30' },
    });
    // SalaryRecord
    const salary = await prisma.salaryRecord.create({
      data: { contractorBssId: conBssId, worker: 'Gate Worker', workerId: wrkBssId, employer: 'L&T', site: 'Site Alpha', period: 'August 2026', gross: 24000, deductions: 1500, net: 22500, paidOn: '2026-08-30' },
    });
    // RozgarApplication
    const rozgar = await prisma.rozgarApplication.create({
      data: { contractorBssId: conBssId, workerName: 'Gate Worker', workerId: wrkBssId, employer: 'L&T', trade: 'Fitter', experience: '5 years', expectedWage: 26000, location: 'Mumbai', dateApplied: '2026-08-30' },
    });
    // JobPosting
    const jobPost = await prisma.jobPosting.create({
      data: { contractorBssId: conBssId, title: 'Bar Benders Needed', trade: 'Bar Bending', site: 'Site Alpha', vacancies: 15, wage: 25000 },
    });

    // Verify Reading
    const readGatePass = await prisma.gatePass.findUnique({ where: { id: gatePass.id } });
    assert(readGatePass?.status === 'Pending', 'GatePass status pending');

    // Update GatePass
    await prisma.gatePass.update({ where: { id: gatePass.id }, data: { status: 'Approved' } });
    const updatedGatePass = await prisma.gatePass.findUnique({ where: { id: gatePass.id } });
    assert(updatedGatePass?.status === 'Approved', 'GatePass updated to Approved');

    // Cleanup
    await prisma.contractorEmployerBinding.delete({ where: { id: binding.id } });
    await prisma.contractorWorkerAssignment.delete({ where: { id: assignment.id } });
    await prisma.complianceRecord.delete({ where: { id: compRecord.id } });
    await prisma.complianceReport.delete({ where: { id: compReport.id } });
    await prisma.gatePass.delete({ where: { id: gatePass.id } });
    await prisma.contractorBenefitRecord.delete({ where: { id: benefit.id } });
    await prisma.salaryRecord.delete({ where: { id: salary.id } });
    await prisma.rozgarApplication.delete({ where: { id: rozgar.id } });
    await prisma.jobPosting.delete({ where: { id: jobPost.id } });
    await prisma.contractorProfile.delete({ where: { bssId: conBssId } });
  });

  // --- Role 3: Employer Domain ---
  await assertTest('Employer Domain: Full Entity Lifecycle (Sites, Approvals, Compliance, Users, Routes)', async () => {
    const empBssId = `EMP_${testPrefix}_01`;
    const siteCode = `SITE_${testPrefix}_01`;

    // 1. Employer Profile
    const emp = await prisma.employerProfile.create({
      data: {
        bssId: empBssId,
        name: 'Apex Infrastructure Ltd',
        company: 'Apex Infrastructure Group',
        contact: '022-28900000',
        email: 'info@apexinfra.test',
      },
    });

    // 2. Site
    const site = await prisma.site.create({
      data: {
        employerBssId: empBssId,
        code: siteCode,
        name: 'Apex Smart City Phase 1',
        location: 'Navi Mumbai',
        state: 'Maharashtra',
        startDate: '2026-01-01',
        endDate: '2028-12-31',
        workers: 120,
        compliance: 94,
      },
    });

    // 3. EmployerApproval
    const approval = await prisma.employerApproval.create({
      data: {
        employerBssId: empBssId,
        entityType: 'Contractor',
        entityId: 'CON_TEST_99',
        name: 'Subcontractor Onboarding',
        bssId: 'BSSC9999',
        site: 'Apex Smart City Phase 1',
        status: 'Pending',
      },
    });

    // 4. EmployerComplianceReport
    const compReport = await prisma.employerComplianceReport.create({
      data: {
        employerBssId: empBssId,
        contractorId: 'CON_TEST_99',
        contractor: 'Subcontractor 99',
        siteId: site.id,
        site: 'Apex Smart City Phase 1',
        period: 'August 2026',
        score: 96,
      },
    });

    // 5. EmployerUser
    const empUser = await prisma.employerUser.create({
      data: {
        employerBssId: empBssId,
        name: 'Rajesh Site Manager',
        contact: 'rajesh@apexinfra.test',
        role: 'Site Manager',
        scope: 'Apex Smart City Phase 1',
      },
    });

    // 6. EmployerAudit
    const audit = await prisma.employerAudit.create({
      data: {
        employerBssId: empBssId,
        actor: 'Rajesh Site Manager',
        action: 'APPROVED_GATE_PASS',
        entity: 'WRK_12345',
        status: 'Success',
      },
    });

    // 7. EmployerRoute
    const route = await prisma.employerRoute.create({
      data: {
        employerBssId: empBssId,
        name: 'Thane - Site Route A',
        reference: 'BUS-01',
        vehicle: 'MH-04-AB-1234',
        route: 'Thane Station -> Kalwa -> Site',
        workers: 45,
        shifts: 'Shift 1, Shift 2',
      },
    });

    // 8. EmployerWorkerDocument
    const empDoc = await prisma.employerWorkerDocument.create({
      data: {
        employerBssId: empBssId,
        worker: 'Suresh Raina',
        workerId: 'WRK_9999',
        contractor: 'Subcontractor 99',
        site: 'Apex Smart City Phase 1',
        document: 'Safety Training Certificate',
        status: 'Verified',
      },
    });

    // Read and verify
    const foundSite = await prisma.site.findUnique({ where: { code: siteCode } });
    assert(foundSite?.workers === 120, 'Site workers count is 120');

    // Update approval
    await prisma.employerApproval.update({ where: { id: approval.id }, data: { status: 'Approved' } });
    const updatedApproval = await prisma.employerApproval.findUnique({ where: { id: approval.id } });
    assert(updatedApproval?.status === 'Approved', 'Approval updated to Approved');

    // Cleanup
    await prisma.site.delete({ where: { id: site.id } });
    await prisma.employerApproval.delete({ where: { id: approval.id } });
    await prisma.employerComplianceReport.delete({ where: { id: compReport.id } });
    await prisma.employerUser.delete({ where: { id: empUser.id } });
    await prisma.employerAudit.delete({ where: { id: audit.id } });
    await prisma.employerRoute.delete({ where: { id: route.id } });
    await prisma.employerWorkerDocument.delete({ where: { id: empDoc.id } });
    await prisma.employerProfile.delete({ where: { bssId: empBssId } });
  });

  // --- Role 4: BSS Admin Domain ---
  await assertTest('BSS Admin Domain: Services, Operations Tickets & Audit Logs', async () => {
    const serviceId = `svc_${testPrefix}`;
    const ticketId = `INC_${testPrefix.substring(0, 10)}`;

    // Create Service
    const svc = await prisma.operationsService.create({
      data: { id: serviceId, name: 'Stress Test Microservice', host: 'svc.bss.internal', status: 'Operational', latencyMs: 25, uptime: 99.95 },
    });

    // Create Ticket
    const ticket = await prisma.operationsTicket.create({
      data: { id: ticketId, title: 'Database connection pool high latency', service: serviceId, priority: 'P2', status: 'Open' },
    });

    // Create OperationsLog
    const opLog = await prisma.operationsLog.create({
      data: { level: 'warning', source: 'db-monitor', message: 'Connection pool spike detected', correlationId: `CORR_${testPrefix}` },
    });

    // Verify Read
    const readTicket = await prisma.operationsTicket.findUnique({ where: { id: ticketId } });
    assert(readTicket?.status === 'Open', 'Ticket initial status Open');

    // Update Ticket
    await prisma.operationsTicket.update({ where: { id: ticketId }, data: { status: 'Resolved', assignee: 'BSSIT_TEST' } });
    const resolvedTicket = await prisma.operationsTicket.findUnique({ where: { id: ticketId } });
    assert(resolvedTicket?.status === 'Resolved', 'Ticket resolved');

    // Cleanup
    await prisma.operationsService.delete({ where: { id: serviceId } });
    await prisma.operationsTicket.delete({ where: { id: ticketId } });
    await prisma.operationsLog.delete({ where: { id: opLog.id } });
  });

  // --- Role 5: BSS Staff Domain ---
  await assertTest('BSS Staff Domain: Support Cases & Unified Notifications', async () => {
    const caseId = `BC_${testPrefix.substring(0, 10)}`;

    // Create Support Case
    const supportCase = await prisma.supportCase.create({
      data: {
        id: caseId,
        type: 'Binding',
        subject: 'Disputed contractor assignment',
        party: 'Contractor vs Employer',
        owner: 'BSS Staff',
        priority: 'High',
        status: 'Open',
        summary: 'Contractor claims unauthorized reassignment of 20 workers',
      },
    });

    // Create Notification
    const notif = await prisma.notification.create({
      data: {
        recipientRole: 'BSS Staff',
        recipientBssId: 'BSSST2026STF00001',
        category: 'Approvals',
        title: 'New Case Assigned',
        message: `Case ${caseId} assigned for review`,
        href: `/staff/cases/${caseId}`,
        priority: 'high',
      },
    });

    // Read and update case
    await prisma.supportCase.update({
      where: { id: caseId },
      data: { status: 'In progress', assignee: 'Staff Officer Sharma' },
    });
    const updatedCase = await prisma.supportCase.findUnique({ where: { id: caseId } });
    assert(updatedCase?.status === 'In progress', 'Case transitioned to In progress');
    assert(updatedCase?.assignee === 'Staff Officer Sharma', 'Case assignee updated');

    // Cleanup
    await prisma.supportCase.delete({ where: { id: caseId } });
    await prisma.notification.delete({ where: { id: notif.id } });
  });

  // --- Role 6: Government Analytics Domain ---
  await assertTest('Government Analytics Domain: Batch Insertion, Aggregations & Groupings', async () => {
    const workersData = [
      { id: `GW_${testPrefix}_01`, state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai', age: 28, gender: 'Male', category: 'Mason', occupation: 'Civil', site: 'Site A', siteType: 'Infrastructure', employer: 'L&T', contractor: 'RK Buildcon', migrant: true, stateOfOrigin: 'Bihar', attendance: 92, compliance: 'Compliant', epfoLinked: true, esicLinked: true, wage: 28000 },
      { id: `GW_${testPrefix}_02`, state: 'Maharashtra', district: 'Pune', city: 'Pune', age: 34, gender: 'Female', category: 'Helper', occupation: 'Civil', site: 'Site B', siteType: 'Commercial', employer: 'Shapoorji', contractor: 'RK Buildcon', migrant: false, stateOfOrigin: 'Maharashtra', attendance: 88, compliance: 'Compliant', epfoLinked: true, esicLinked: false, wage: 22000 },
      { id: `GW_${testPrefix}_03`, state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', age: 41, gender: 'Male', category: 'Electrician', occupation: 'Electrical', site: 'Site C', siteType: 'Tech Park', employer: 'Sobha', contractor: 'Apex Electricals', migrant: true, stateOfOrigin: 'Uttar Pradesh', attendance: 95, compliance: 'Pending', epfoLinked: false, esicLinked: false, wage: 34000 },
    ];

    for (const w of workersData) {
      await prisma.governmentWorker.create({ data: w });
    }

    // Aggregations
    const totalCount = await prisma.governmentWorker.count({ where: { id: { startsWith: `GW_${testPrefix}` } } });
    assert(totalCount === 3, 'Government worker count is 3');

    const stateGroup = await prisma.governmentWorker.groupBy({
      by: ['state'],
      where: { id: { startsWith: `GW_${testPrefix}` } },
      _count: { id: true },
      _avg: { wage: true },
    });

    const maha = stateGroup.find((g) => g.state === 'Maharashtra');
    assert(maha?._count.id === 2, 'Maharashtra count is 2');
    assert(maha?._avg.wage === 25000, 'Maharashtra average wage is 25000');

    // Cleanup
    await prisma.governmentWorker.deleteMany({ where: { id: { startsWith: `GW_${testPrefix}` } } });
  });

  // --- Core: User Authentication & ECS Binding Models ---
  await assertTest('Core Models: User Authentication & ECS 4-Tuple Binding', async () => {
    const roles = ['Worker', 'Contractor', 'Employer', 'BSS Admin', 'BSS Staff', 'Government'];
    const createdSubjects: string[] = [];

    // Create 6 role users
    for (const role of roles) {
      const subject = `USR_${role.replace(/\s+/g, '_').toUpperCase()}_${testPrefix}`;
      await prisma.user.create({
        data: {
          subject,
          role,
          contact: `+91 900000000${createdSubjects.length}`,
          passwordHash: 'argon2_fake_hash',
          mpinHash: '1234',
        },
      });
      createdSubjects.push(subject);
    }

    assert(createdSubjects.length === 6, 'Created 6 role users');

    // Create ECS Binding
    const tuple = `EMP_${testPrefix}|CON_${testPrefix}|SITE_${testPrefix}|WRK_${testPrefix}`;
    const ecs = await prisma.ecsBinding.create({
      data: {
        employerId: `EMP_${testPrefix}`,
        contractorId: `CON_${testPrefix}`,
        siteId: `SITE_${testPrefix}`,
        workerId: `WRK_${testPrefix}`,
        tuple,
        state: 'pending',
        consentJson: JSON.stringify({ employer: true, contractor: true, worker: false }),
        requestedBy: 'contractor',
      },
    });
    assert(ecs.tuple === tuple, 'ECS binding created with correct tuple');

    // Update ECS Binding
    await prisma.ecsBinding.update({
      where: { tuple },
      data: { state: 'bound', boundAt: new Date() },
    });
    const updatedEcs = await prisma.ecsBinding.findUnique({ where: { tuple } });
    assert(updatedEcs?.state === 'bound', 'ECS state transitioned to bound');

    // Cleanup
    await prisma.ecsBinding.delete({ where: { tuple } });
    await prisma.user.deleteMany({ where: { subject: { in: createdSubjects } } });
  });

  // ==========================================================================
  // SECTION 2: ADVERSARIAL EDGE CONDITIONS & STRESS TESTING
  // ==========================================================================
  console.log('\n\x1b[34m[SECTION 2] Adversarial Edge Conditions & Stress Testing\x1b[0m');

  // --- Edge 1: High Concurrency (50 Parallel Operations) ---
  await assertTest('Concurrency: 50 Parallel Operations (Writes, Reads, Aggregations)', async () => {
    const concurrencyCount = 50;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrencyCount; i++) {
      const p = (async () => {
        // Parallel write
        const log = await prisma.operationsLog.create({
          data: {
            level: 'info',
            source: 'concurrency-stress',
            message: `Concurrent log ${i} of ${concurrencyCount}`,
            correlationId: `CONCURR_${testPrefix}`,
          },
        });
        // Parallel read
        const count = await prisma.operationsLog.count({
          where: { correlationId: `CONCURR_${testPrefix}` },
        });
        return { logId: log.id, count };
      })();
      promises.push(p);
    }

    const results = await Promise.all(promises);
    assert(results.length === concurrencyCount, 'All 50 concurrent transactions completed');

    // Final count verification
    const finalCount = await prisma.operationsLog.count({
      where: { correlationId: `CONCURR_${testPrefix}` },
    });
    assert(finalCount === concurrencyCount, `Expected ${concurrencyCount} logs, found ${finalCount}`);

    // Cleanup
    await prisma.operationsLog.deleteMany({ where: { correlationId: `CONCURR_${testPrefix}` } });
  });

  // --- Edge 2: Duplicate Keys / Unique Constraint Enforcement ---
  await assertTest('Constraints: Unique Constraint Violations Throw P2002', async () => {
    const dupSubject = `DUP_USER_${testPrefix}`;
    await prisma.user.create({
      data: { subject: dupSubject, role: 'Worker' },
    });

    let caughtError: any = null;
    try {
      // Attempt duplicate user creation
      await prisma.user.create({
        data: { subject: dupSubject, role: 'Contractor' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Duplicate user creation was rejected');
    assert(caughtError instanceof Prisma.PrismaClientKnownRequestError, 'Error is PrismaClientKnownRequestError');
    assert(caughtError.code === 'P2002', `Error code must be P2002, got ${caughtError.code}`);

    // Duplicate ECS Tuple
    const dupTuple = `DUP_TUPLE_${testPrefix}`;
    await prisma.ecsBinding.create({
      data: { employerId: 'E1', contractorId: 'C1', siteId: 'S1', workerId: 'W1', tuple: dupTuple, requestedBy: 'employer' },
    });

    let tupleError: any = null;
    try {
      await prisma.ecsBinding.create({
        data: { employerId: 'E1', contractorId: 'C1', siteId: 'S1', workerId: 'W1', tuple: dupTuple, requestedBy: 'worker' },
      });
    } catch (err: any) {
      tupleError = err;
    }
    assert(tupleError?.code === 'P2002', 'Duplicate ECS tuple rejected with P2002');

    // Cleanup
    await prisma.user.delete({ where: { subject: dupSubject } });
    await prisma.ecsBinding.delete({ where: { tuple: dupTuple } });
  });

  // --- Edge 3: Null Handling & Schema Defaults ---
  await assertTest('Nullability: Default Schema Values & Nullable Field Toleration', async () => {
    const minWorkerBssId = `MIN_WRK_${testPrefix}`;
    const minWorker = await prisma.workerProfile.create({
      data: {
        bssId: minWorkerBssId,
        name: 'Minimal Worker',
      },
    });

    // Check defaults
    assert(minWorker.category === 'Construction Worker', 'Default category');
    assert(minWorker.employmentStatus === 'Active', 'Default employment status');
    assert(minWorker.shift === 'General', 'Default shift');
    assert(minWorker.siteInduction === false, 'Default site induction false');
    assert(minWorker.ppeIssued === '[]', 'Default ppeIssued empty array JSON');
    assert(minWorker.skillsJson === '{}', 'Default skillsJson empty object JSON');
    assert(minWorker.personalJson === '{}', 'Default personalJson empty object JSON');
    assert(minWorker.bankingJson === '{}', 'Default bankingJson empty object JSON');
    assert(minWorker.availability === false, 'Default availability false');
    assert(minWorker.aadhaar === null, 'Nullable aadhaar is null');
    assert(minWorker.pan === null, 'Nullable pan is null');
    assert(minWorker.mobile === null, 'Nullable mobile is null');

    // Verify querying with null filters
    const foundWithNull = await prisma.workerProfile.findFirst({
      where: { bssId: minWorkerBssId, pan: null },
    });
    assert(foundWithNull !== null, 'Worker query with pan: null works');

    // Cleanup
    await prisma.workerProfile.delete({ where: { bssId: minWorkerBssId } });
  });

  // --- Edge 4: Large Payloads & Data Volumes ---
  await assertTest('Payload Volume: 500KB JSON Payloads & 100K Character Text Fields', async () => {
    const heavyBssId = `HEAVY_WRK_${testPrefix}`;

    // Generate ~500KB JSON payload
    const largeObject: Record<string, string> = {};
    for (let i = 0; i < 5000; i++) {
      largeObject[`key_${i}`] = `Heavy payload string chunk with index ${i} - ${'X'.repeat(80)}`;
    }
    const largeJsonString = JSON.stringify(largeObject);
    assert(largeJsonString.length > 500000, `Payload length is ${largeJsonString.length} bytes`);

    // 100K character text
    const long100kText = 'A'.repeat(100000);

    const heavyWorker = await prisma.workerProfile.create({
      data: {
        bssId: heavyBssId,
        name: 'Heavy Data Worker',
        skillsJson: largeJsonString,
      },
    });

    const heavyGrievance = await prisma.grievance.create({
      data: {
        workerBssId: heavyBssId,
        category: 'Statutory Safety',
        subject: 'Extensive Site Safety Report',
        description: long100kText,
      },
    });

    // Read back and verify integrity
    const readBackWorker = await prisma.workerProfile.findUnique({ where: { bssId: heavyBssId } });
    assert(readBackWorker?.skillsJson.length === largeJsonString.length, 'Large JSON string read back with exact length');
    const parsed = JSON.parse(readBackWorker!.skillsJson);
    assert(parsed.key_4999.includes('index 4999'), 'Parsed JSON contains intact deep fields');

    const readBackGrievance = await prisma.grievance.findUnique({ where: { id: heavyGrievance.id } });
    assert(readBackGrievance?.description.length === 100000, '100K character description read back intact');

    // Cleanup
    await prisma.grievance.delete({ where: { id: heavyGrievance.id } });
    await prisma.workerProfile.delete({ where: { bssId: heavyBssId } });
  });

  // --- Edge 5: Foreign Key Cascade Deletion ---
  await assertTest('Foreign Keys: Cascade Deletion of All 11 Child Tables upon Worker Deletion', async () => {
    const cascadeBssId = `CASCADE_WRK_${testPrefix}`;

    // Create Parent Worker
    await prisma.workerProfile.create({
      data: { bssId: cascadeBssId, name: 'Cascade Parent Worker' },
    });

    // Create 11 Child Records
    await prisma.workerDocument.create({ data: { workerBssId: cascadeBssId, name: 'Doc1' } });
    await prisma.wageRecord.create({ data: { workerBssId: cascadeBssId, period: '2026-08', paidOn: '2026-08-30', employer: 'E', contractor: 'C', site: 'S', gross: 1000, deductions: 0, net: 1000 } });
    await prisma.attendanceRecord.create({ data: { workerBssId: cascadeBssId, date: '2026-08-30', presence: 'Present', site: 'S' } });
    await prisma.providentFundRecord.create({ data: { workerBssId: cascadeBssId, period: '2026-08', employeeContribution: 100, employerContribution: 100, creditedOn: '2026-08-30' } });
    await prisma.bonusRecord.create({ data: { workerBssId: cascadeBssId, period: '2026-08', reason: 'Festive', amount: 500, paidOn: '2026-08-30' } });
    await prisma.leaveEncashmentRecord.create({ data: { workerBssId: cascadeBssId, period: '2026', days: 2, rate: 500, amount: 1000, paidOn: '2026-08-30' } });
    await prisma.leaveRecord.create({ data: { workerBssId: cascadeBssId, type: 'Casual', fromDate: '2026-09-01', toDate: '2026-09-02', reason: 'Rest', submitted: '2026-08-30' } });
    await prisma.grievance.create({ data: { workerBssId: cascadeBssId, category: 'Wages', subject: 'Query', description: 'Query details' } });
    await prisma.jobRequest.create({ data: { workerBssId: cascadeBssId, employer: 'E', contractor: 'C', site: 'S', designation: 'Helper', wage: 15000, duration: '1m', dateReceived: '2026-08-30' } });
    await prisma.cardOrder.create({ data: { requestId: `CARD_${cascadeBssId}`, workerBssId: cascadeBssId, provider: 'razorpay', amount: 19900, deliveryAddress: '{}' } });
    await prisma.workerCourseProgress.create({ data: { workerBssId: cascadeBssId, courseId: 'C1' } });

    // Verify all child records exist
    const docCountBefore = await prisma.workerDocument.count({ where: { workerBssId: cascadeBssId } });
    assert(docCountBefore === 1, 'WorkerDocument exists before cascade');

    // Delete Parent WorkerProfile
    await prisma.workerProfile.delete({ where: { bssId: cascadeBssId } });

    // Verify ALL 11 Child Tables are automatically cascade-cleared
    const docCountAfter = await prisma.workerDocument.count({ where: { workerBssId: cascadeBssId } });
    const wageCountAfter = await prisma.wageRecord.count({ where: { workerBssId: cascadeBssId } });
    const attCountAfter = await prisma.attendanceRecord.count({ where: { workerBssId: cascadeBssId } });
    const pfCountAfter = await prisma.providentFundRecord.count({ where: { workerBssId: cascadeBssId } });
    const bonusCountAfter = await prisma.bonusRecord.count({ where: { workerBssId: cascadeBssId } });
    const leaveEncCountAfter = await prisma.leaveEncashmentRecord.count({ where: { workerBssId: cascadeBssId } });
    const leaveCountAfter = await prisma.leaveRecord.count({ where: { workerBssId: cascadeBssId } });
    const grievanceCountAfter = await prisma.grievance.count({ where: { workerBssId: cascadeBssId } });
    const jobReqCountAfter = await prisma.jobRequest.count({ where: { workerBssId: cascadeBssId } });
    const cardOrderCountAfter = await prisma.cardOrder.count({ where: { workerBssId: cascadeBssId } });
    const courseCountAfter = await prisma.workerCourseProgress.count({ where: { workerBssId: cascadeBssId } });

    assert(docCountAfter === 0, 'WorkerDocuments cascade-deleted');
    assert(wageCountAfter === 0, 'WageRecords cascade-deleted');
    assert(attCountAfter === 0, 'AttendanceRecords cascade-deleted');
    assert(pfCountAfter === 0, 'PFRecords cascade-deleted');
    assert(bonusCountAfter === 0, 'BonusRecords cascade-deleted');
    assert(leaveEncCountAfter === 0, 'LeaveEncashmentRecords cascade-deleted');
    assert(leaveCountAfter === 0, 'LeaveRecords cascade-deleted');
    assert(grievanceCountAfter === 0, 'Grievances cascade-deleted');
    assert(jobReqCountAfter === 0, 'JobRequests cascade-deleted');
    assert(cardOrderCountAfter === 0, 'CardOrders cascade-deleted');
    assert(courseCountAfter === 0, 'WorkerCourseProgress cascade-deleted');
  });

  // --- Edge 6: SQL Injection & Multilingual Unicode Resilience ---
  await assertTest('Security: SQL Injection Strings & Multilingual Unicode Handling', async () => {
    const maliciousStrings = [
      "'; DROP TABLE \"User\"; --",
      "' OR '1'='1",
      "<script>alert('XSS')</script>",
      "🎉 🏗️ 👷 🇮🇳 Multi-byte Unicode Emojis",
      "रवि कुमार (Hindi) | রফি আহমেদ (Bengali) | ரவி குமார் (Tamil) | రవి కుమార్ (Telugu)",
    ];

    for (let i = 0; i < maliciousStrings.length; i++) {
      const text = maliciousStrings[i];
      const log = await prisma.operationsLog.create({
        data: {
          level: 'audit',
          source: `security-test-${i}`,
          message: text,
          correlationId: `SEC_${testPrefix}_${i}`,
        },
      });

      const retrieved = await prisma.operationsLog.findUnique({ where: { id: log.id } });
      assert(retrieved?.message === text, `Stored text matches exactly for payload index ${i}`);
      await prisma.operationsLog.delete({ where: { id: log.id } });
    }

    // Verify User table is still intact after SQL injection attempt
    const userCount = await prisma.user.count();
    assert(userCount > 0, 'User table is intact and protected by parameterization');
  });

  // ==========================================================================
  // SECTION 3: PROCESS RELOAD PERSISTENCE VERIFICATION
  // ==========================================================================
  console.log('\n\x1b[34m[SECTION 3] Process Reload Persistence (Multi-Process Lifecycle)\x1b[0m');

  await assertTest('Multi-Process Reload Lifecycle: Insert (P1) -> Restart -> Verify/Mutate (P2) -> Restart -> Verify/Clean (P3)', async () => {
    const lifecycleTag = `RELOAD_${timestamp}`;
    const rootDir = path.resolve(__dirname, '..');

    console.log('\n    Executing Process 1: Separate Node Process inserting marker records...');
    const out1 = execSync(`npx tsx scripts/process-step1.ts ${lifecycleTag}`, {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '-r ./scripts/test-register.cjs' },
    });
    console.log(`    Process 1 exited with code 0:\n    ${out1.trim().replace(/\n/g, '\n    ')}`);

    console.log('    Executing Process 2: Fresh Node Process reading and updating marker records...');
    const out2 = execSync(`npx tsx scripts/process-step2.ts ${lifecycleTag}`, {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '-r ./scripts/test-register.cjs' },
    });
    console.log(`    Process 2 exited with code 0:\n    ${out2.trim().replace(/\n/g, '\n    ')}`);

    console.log('    Executing Process 3: Fresh Node Process verifying persistence and cleaning up...');
    const out3 = execSync(`npx tsx scripts/process-step3.ts ${lifecycleTag}`, {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '-r ./scripts/test-register.cjs' },
    });
    console.log(`    Process 3 exited with code 0:\n    ${out3.trim().replace(/\n/g, '\n    ')}`);
  });

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n======================================================================');
  console.log('   CHALLENGER EMPIRICAL STRESS TEST SUITE SUMMARY');
  console.log('======================================================================');
  console.log(`  Total Tests Executed: ${passedTests + failedTests}`);
  console.log(`  \x1b[32mTotal Passed:        ${passedTests}\x1b[0m`);
  console.log(`  \x1b[${failedTests > 0 ? '31' : '32'}mTotal Failed:        ${failedTests}\x1b[0m`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    console.error('\x1b[31m[VERDICT]: REJECT — Empirical stress tests encountered failures:\x1b[0m');
    for (const f of testFailures) {
      console.error(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('\x1b[32m[VERDICT]: APPROVE — All empirical stress, concurrency, constraint, cascade, and process persistence tests passed.\x1b[0m\n');
  }
}

runEmpiricalStressSuite()
  .catch(async (err) => {
    console.error('Fatal Suite Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
