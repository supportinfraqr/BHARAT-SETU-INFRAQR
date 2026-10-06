import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

export async function seedDatabase() {
  console.log('--- Starting Bharat Shram Setu (BSS) Database Seed ---');

  // 1. Clean existing records in reverse dependency order
  await prisma.notification.deleteMany({});
  await prisma.supportCase.deleteMany({});
  await prisma.operationsLog.deleteMany({});
  await prisma.operationsTicket.deleteMany({});
  await prisma.operationsService.deleteMany({});
  await prisma.documentSubmission.deleteMany({});
  await prisma.employerWorkerDocument.deleteMany({});
  await prisma.employerRoute.deleteMany({});
  await prisma.employerAudit.deleteMany({});
  await prisma.employerPermissionRole.deleteMany({});
  await prisma.employerUser.deleteMany({});
  await prisma.employerComplianceReport.deleteMany({});
  await prisma.employerApproval.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.employerProfile.deleteMany({});
  await prisma.jobPosting.deleteMany({});
  await prisma.rozgarApplication.deleteMany({});
  await prisma.contractorBenefitRecord.deleteMany({});
  await prisma.salaryRecord.deleteMany({});
  await prisma.gatePass.deleteMany({});
  await prisma.complianceReport.deleteMany({});
  await prisma.complianceRecord.deleteMany({});
  await prisma.contractorWorkerAssignment.deleteMany({});
  await prisma.contractorEmployerBinding.deleteMany({});
  await prisma.contractorProfile.deleteMany({});
  await prisma.workerCourseProgress.deleteMany({});
  await prisma.cardOrder.deleteMany({});
  await prisma.jobRequest.deleteMany({});
  await prisma.grievance.deleteMany({});
  await prisma.leaveRecord.deleteMany({});
  await prisma.leaveEncashmentRecord.deleteMany({});
  await prisma.bonusRecord.deleteMany({});
  await prisma.providentFundRecord.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.wageRecord.deleteMany({});
  await prisma.workerDocument.deleteMany({});
  await prisma.workerProfile.deleteMany({});
  await prisma.ecsBinding.deleteMany({});
  await prisma.governmentWorker.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Existing records cleared.');

  // 2. Users for the active portal roles (IT Help Desk was consolidated into BSS Staff)
  const users = [
    { subject: 'BSS234567890124', role: 'Worker', contact: '9876543210' },
    { subject: 'BSSC198200000001', role: 'Contractor', contact: '+91 98765 43210' },
    { subject: 'BSSE100210000001', role: 'Employer', contact: '+91 22 6752 5656' },
    { subject: 'BSSST2026STF00001', role: 'BSS Staff', contact: 'staff.workbench@bss.gov.in' },
    { subject: 'BSSGOV2026ADM00001', role: 'Government', contact: 'director.analytics@labour.gov.in' },
  ];
  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(`Seeded ${users.length} primary users.`);

  // 3. Worker Profile & Related Records
  const workerProfile = await prisma.workerProfile.create({
    data: {
      bssId: 'BSS234567890124',
      name: 'Ravi Kumar',
      category: 'Construction Worker',
      dob: '1990-08-15',
      gender: 'Male',
      photoUrl: '/worker-profile.png',
      aadhaar: 'XXXX XXXX 4821',
      pan: 'ABCDE1234F',
      aadhaarVerified: true,
      panVerified: false,
      employmentStatus: 'Active',
      employerName: 'Larsen & Toubro',
      contractorName: 'RK Buildcon Pvt. Ltd.',
      siteName: 'Mumbai Metro Line 3',
      department: 'Civil',
      designation: 'Senior Bar Bender',
      doj: '2024-08-12',
      shift: 'General',
      siteInduction: true,
      ppeIssued: JSON.stringify(['Helmet', 'Boots']),
      policeVerification: 'Under Process',
      permanentGatePass: 'Pending Approval',
      medicalFitnessDaysLeft: 5,
      skillsJson: JSON.stringify({
        primary: { name: 'Bar Bending (Rebar)', level: 'Expert', experienceYears: 8 },
        secondary: ['Basic Masonry'],
        certification: { name: 'NSDC Level 4', verified: true },
      }),
      epfoUan: '10092837465',
      esicIp: '5400928172',
      eShramLinked: false,
      bocwRegistered: false,
      mobile: '9876543210',
      alternateMobile: '',
      email: 'ravi.kumar@example.in',
      preferredLanguage: 'Hindi',
      preferredChannel: 'SMS',
      currentAddress: 'Labour Camp A, Mumbai',
      currentState: 'Maharashtra',
      currentDistrict: 'Mumbai Suburban',
      currentCity: 'Mumbai',
      currentPin: '400059',
      permanentAddress: 'Rampur Village, Patna',
      permanentState: 'Bihar',
      permanentDistrict: 'Patna',
      permanentCity: 'Patna',
      permanentPin: '800001',
      migrant: true,
      migrationType: 'Inter-state',
      personalJson: JSON.stringify({
        maritalStatus: 'Married',
        bloodGroup: 'B+',
        fatherName: 'Mohan Kumar',
        motherName: 'Sita Devi',
        spouseName: 'Sunita Kumar',
        disabilityStatus: 'No',
        religion: 'Prefer not to say',
        caste: 'Prefer not to say',
      }),
      bankingJson: JSON.stringify({
        bankName: 'State Bank of India',
        holderName: 'Ravi Kumar',
        accountNumber: '123456789012',
        ifsc: 'SBIN0001234',
        verificationStatus: 'Verified',
        upiEnabled: true,
      }),
      preferencesJson: JSON.stringify({
        consentToPublicPhoto: true,
        consentToDataSharing: true,
      }),
      availability: false,
      gratuityJson: JSON.stringify({
        serviceStart: '12 Aug 2024',
        completedService: '2 years',
        calculationBasis: 'Last recorded eligible wage and completed service',
        indicativeAmount: 32750,
        eligibilityStatus: 'Not yet eligible',
        lastUpdated: '28 Aug 2026',
      }),
    },
  });

  // Worker Documents
  const workerDocuments = [
    { name: 'Aadhaar Card', mandatory: true, owner: 'Worker', status: 'Verified', date: '2026-08-10' },
    { name: 'PAN Card', mandatory: true, owner: 'Worker', status: 'Missing', date: null },
    { name: 'Bank Passbook Copy', mandatory: true, owner: 'Worker', status: 'Under Verification', date: '2026-08-12' },
    { name: 'Photo', mandatory: true, owner: 'Worker', status: 'Verified', date: '2026-08-10' },
    { name: 'Signature', mandatory: true, owner: 'Worker', status: 'Verified', date: '2026-08-10' },
    { name: 'UAN Card', mandatory: false, owner: 'Worker', status: 'Missing', date: null },
    { name: 'ESIC Card / TIC Card', mandatory: false, owner: 'Worker', status: 'Uploaded', date: '2026-08-13' },
    { name: 'BOCW Card', mandatory: false, owner: 'Worker', status: 'Missing', date: null },
    { name: 'Educational Certificate', mandatory: false, owner: 'Worker', status: 'Rejected', date: '2026-08-11' },
    { name: 'Medical Certificate', mandatory: true, owner: 'Contractor', status: 'Expired', date: '2025-08-10' },
    { name: 'Temporary Gate Pass', mandatory: false, owner: 'System', status: 'Expired', date: '2026-08-26' },
    { name: 'Permanent Gate Pass', mandatory: true, owner: 'System', status: 'Verified', date: '2026-08-27' },
  ];
  for (const doc of workerDocuments) {
    await prisma.workerDocument.create({
      data: {
        workerBssId: workerProfile.bssId,
        ...doc,
      },
    });
  }

  // Wage Records
  const wageRecords = [
    { period: 'August 2026', paidOn: '2026-08-28', employer: 'Larsen & Toubro', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', basis: 'Monthly', gross: 31500, deductions: 3000, net: 28500, status: 'Credited', reference: 'UTR-HDFC2608281042', receiptUrl: '#demo-receipt' },
    { period: 'July 2026', paidOn: '2026-07-31', employer: 'Larsen & Toubro', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', basis: 'Monthly', gross: 31500, deductions: 3000, net: 28500, status: 'Credited', reference: 'UTR-HDFC2607310988', receiptUrl: '#demo-receipt' },
    { period: 'June 2026', paidOn: '2026-06-30', employer: 'Larsen & Toubro', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', basis: 'Monthly', gross: 30200, deductions: 2870, net: 27330, status: 'Credited', reference: 'UTR-HDFC2606300911', receiptUrl: '#demo-receipt' },
  ];
  for (const wage of wageRecords) {
    await prisma.wageRecord.create({
      data: { workerBssId: workerProfile.bssId, ...wage },
    });
  }

  // Attendance Records
  const attendanceRecords = [
    { date: '2026-08-28', presence: 'Present', shift: 'General', site: 'Mumbai Metro Line 3', checkIn: '08:47', checkOut: '17:36', status: 'On time' },
    { date: '2026-08-27', presence: 'Present', shift: 'General', site: 'Mumbai Metro Line 3', checkIn: '09:12', checkOut: '17:42', status: 'Late' },
    { date: '2026-08-26', presence: 'Leave', shift: 'General', site: 'Mumbai Metro Line 3', status: 'Recorded' },
    { date: '2026-08-25', presence: 'Present', shift: 'General', site: 'Mumbai Metro Line 3', checkIn: '08:51', checkOut: '13:10', status: 'Half Day' },
    { date: '2026-08-24', presence: 'Weekly Off', site: 'Mumbai Metro Line 3', status: 'Recorded' },
    { date: '2026-08-23', presence: 'Absent', shift: 'General', site: 'Mumbai Metro Line 3', status: 'Recorded' },
    { date: '2026-08-22', presence: 'Present', shift: 'General', site: 'Mumbai Metro Line 3', checkIn: '08:43', checkOut: '17:31', status: 'On time' },
  ];
  for (const att of attendanceRecords) {
    await prisma.attendanceRecord.create({
      data: { workerBssId: workerProfile.bssId, ...att },
    });
  }

  // Provident Fund Records
  const pfRecords = [
    { period: 'August 2026', employeeContribution: 1800, employerContribution: 1800, creditedOn: '2026-08-28' },
    { period: 'July 2026', employeeContribution: 1800, employerContribution: 1800, creditedOn: '2026-07-31' },
    { period: 'June 2026', employeeContribution: 1800, employerContribution: 1800, creditedOn: '2026-06-30' },
  ];
  for (const pf of pfRecords) {
    await prisma.providentFundRecord.create({
      data: { workerBssId: workerProfile.bssId, ...pf },
    });
  }

  // Bonus Records
  const bonusRecords = [
    { period: 'August 2026', reason: 'Performance bonus — quarterly target', amount: 6500, paidOn: '2026-08-28', status: 'Credited' },
    { period: 'July 2026', reason: 'Attendance bonus', amount: 2500, paidOn: '2026-07-31', status: 'Credited' },
    { period: 'June 2026', reason: 'Safety compliance bonus', amount: 3000, paidOn: '2026-06-30', status: 'Credited' },
  ];
  for (const b of bonusRecords) {
    await prisma.bonusRecord.create({
      data: { workerBssId: workerProfile.bssId, ...b },
    });
  }

  // Leave Encashment Records
  const encashmentRecords = [
    { period: 'August 2026', days: 4, rate: 950, amount: 3800, paidOn: '2026-08-28', status: 'Credited' },
    { period: 'May 2026', days: 2, rate: 910, amount: 1820, paidOn: '2026-05-29', status: 'Credited' },
  ];
  for (const enc of encashmentRecords) {
    await prisma.leaveEncashmentRecord.create({
      data: { workerBssId: workerProfile.bssId, ...enc },
    });
  }

  // Leave Records
  const leaveRecords = [
    { type: 'Medical leave', fromDate: '2026-08-17', toDate: '2026-08-18', reason: 'Medical consultation and recovery', submitted: '2026-08-15', status: 'Approved', approver: 'Site HR', comment: 'Approved against submitted medical note.' },
    { type: 'Personal leave', fromDate: '2026-07-08', toDate: '2026-07-08', reason: 'Family work in Patna', submitted: '2026-07-04', status: 'Rejected', approver: 'Site HR', comment: 'Project staffing requirement; coordinate an alternate date.' },
  ];
  for (const lv of leaveRecords) {
    await prisma.leaveRecord.create({
      data: { workerBssId: workerProfile.bssId, ...lv },
    });
  }

  // Grievance Record
  await prisma.grievance.create({
    data: {
      workerBssId: workerProfile.bssId,
      category: 'Wage Dispute',
      subject: 'Wage mismatch for overtime hours',
      description: 'Discrepancy in OT hours credited for August payroll cycle.',
      status: 'Under Review',
    },
  });

  // Job Requests
  const jobRequests = [
    { employer: 'Shapoorji Pallonji', contractor: 'Shapoorji Engineering', site: 'Navi Mumbai International Airport', designation: 'Senior Bar Bender', wage: 28500, currency: 'INR', payPeriod: 'month', duration: '18 Months', facilities: JSON.stringify(['Accommodation', 'Transport', 'Medical']), status: 'Pending', dateReceived: '2026-08-14' },
    { employer: 'L&T Construction', contractor: 'RK Buildcon', site: 'Mumbai Metro Line 3', designation: 'Bar Bender', wage: 24500, currency: 'INR', payPeriod: 'month', duration: '12 Months', facilities: JSON.stringify(['Medical']), status: 'Expired', dateReceived: '2026-07-01' },
  ];
  for (const jr of jobRequests) {
    await prisma.jobRequest.create({
      data: { workerBssId: workerProfile.bssId, ...jr },
    });
  }

  // Card Order
  await prisma.cardOrder.create({
    data: {
      requestId: 'REQ-CARD-2026-001',
      workerBssId: workerProfile.bssId,
      provider: 'razorpay',
      amount: 19900,
      deliveryAddress: JSON.stringify({ address: 'Labour Camp A', city: 'Mumbai', state: 'Maharashtra', pin: '400059' }),
      addressConfirmed: true,
      status: 'awaiting_payment',
    },
  });

  console.log('Worker profile and relational records seeded.');

  // 4. Contractor Domain
  const contractor = await prisma.contractorProfile.create({
    data: {
      bssId: 'BSSC198200000001',
      name: 'Rajesh Kumar',
      company: 'RK Buildcon Pvt. Ltd.',
      incorpDate: '2010-05-12',
      entity: 'Private Limited Company',
      verified: true,
      rating: 4.8,
      contact: '+91 98765 43210',
      email: 'contact@rkbuildcon.example',
      profileSections: JSON.stringify({
        basic: [
          { label: 'Company Name', value: 'RK Buildcon Private Limited' },
          { label: 'Entity Type', value: 'Private Limited Company' },
          { label: 'Date of Incorporation', value: '2010-05-12' },
          { label: 'Director / Authorized Signatory', value: 'Rajesh Kumar' },
          { label: 'Registered Address', value: '102, Business Park, Andheri East, Mumbai, Maharashtra, 400069' },
        ],
        registration: [
          { label: 'CIN', value: 'U45200MH2010PTC123456', sensitive: true },
          { label: 'PAN', value: 'AACCR1234E', sensitive: true },
          { label: 'GSTIN', value: '27AACCR1234E1Z5', sensitive: true },
          { label: 'EPFO Registration Number', value: 'MH/BAN/1234567/000', sensitive: true },
          { label: 'ESIC Code', value: '31001234560001001', sensitive: true },
        ],
        financial: [
          { label: 'Bank verification', value: 'Verified' },
          { label: 'Payment terms', value: 'As agreed with principal employer' },
        ],
        service: [
          { label: 'Service states', value: 'Maharashtra' },
          { label: 'Primary trade coverage', value: 'Civil construction' },
        ],
        documents: [
          { label: 'Company registration', value: 'Verified' },
          { label: 'GST certificate', value: 'Verified' },
        ],
        declarations: [{ label: 'Information declaration', value: 'Accepted on 2026-08-01' }],
        undertaking: [{ label: 'Platform undertaking', value: 'Accepted on 2026-08-01' }],
      }),
    },
  });

  // Additional contractor profiles for realistic multi-contractor scenarios
  await prisma.contractorProfile.create({
    data: {
      bssId: 'BSSC198200000002',
      name: 'Pooja Sharma',
      company: 'SafeBuild Infra Services',
      incorpDate: '2014-06-18',
      entity: 'Private Limited Company',
      verified: true,
      rating: 4.6,
      contact: '+91 98765 43220',
      email: 'operations@safebuild.example',
    },
  });

  await prisma.contractorProfile.create({
    data: {
      bssId: 'BSSC198200000003',
      name: 'Sunil Verma',
      company: 'Metro Civil Works',
      incorpDate: '2018-09-22',
      entity: 'Partnership Firm',
      verified: false,
      rating: 4.2,
      contact: '+91 98765 43230',
      email: 'admin@metrocivil.example',
    },
  });

  // Contractor Employer Bindings
  const bindings = [
    { contractorBssId: contractor.bssId, employerId: 'BSSE10021000001', employerName: 'L&T Construction', sites: JSON.stringify(['Mumbai Metro Line 3', 'Coastal Road Project']), status: 'Active', boundSince: '2023-01-10' },
    { contractorBssId: contractor.bssId, employerId: 'BSSE10045000002', employerName: 'Shapoorji Pallonji', sites: JSON.stringify(['Navi Mumbai Airport']), status: 'Active', boundSince: '2023-03-15' },
    { contractorBssId: contractor.bssId, employerId: 'BSSE10088000003', employerName: 'DLF Limited', sites: JSON.stringify(['Pune IT Park Phase II']), status: 'Active', boundSince: '2023-06-20' },
  ];
  for (const b of bindings) {
    await prisma.contractorEmployerBinding.create({ data: b });
  }

  // Contractor Worker Assignments
  const contractorWorkers = [
    { contractorBssId: contractor.bssId, workerBssId: 'BSS892199210001', name: 'Ravi Kumar', mobile: '+91 98765 43210', site: 'Navi Mumbai Airport', siteId: 'SITE-002', employer: 'Shapoorji Pallonji', employerId: 'BSSE10045000002', designation: 'Senior Bar Bender', doj: '2024-01-15', compliance: 'Compliant', status: 'Active', verified: true, attendance: 96 },
    { contractorBssId: contractor.bssId, workerBssId: 'BSS892199220002', name: 'Amit Singh', mobile: '+91 98765 43211', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Mason', doj: '2024-02-20', compliance: 'Expiring', status: 'Active', verified: true, attendance: 91 },
    { contractorBssId: contractor.bssId, workerBssId: 'BSS892199230003', name: 'Suresh Patel', mobile: '+91 98765 43212', site: 'Coastal Road Project', siteId: 'SITE-003', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Electrician', doj: '2024-03-05', compliance: 'Non-compliant', status: 'Inactive', verified: false, attendance: 87 },
    { contractorBssId: contractor.bssId, workerBssId: 'BSS892199240004', name: 'Vikram Das', mobile: '+91 98765 43213', site: 'Pune IT Park Phase II', siteId: 'SITE-004', employer: 'DLF', employerId: 'BSSE10088000003', designation: 'Helper', doj: '2024-04-10', compliance: 'Compliant', status: 'Active', verified: true, attendance: 94 },
    { contractorBssId: 'BSSC198200000002', workerBssId: 'BSS892199250005', name: 'Imran Shaikh', mobile: '+91 98765 43214', site: 'Coastal Road Project', siteId: 'SITE-003', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Scaffolder', doj: '2025-01-12', compliance: 'Compliant', status: 'Active', verified: true, attendance: 92 },
    { contractorBssId: 'BSSC198200000002', workerBssId: 'BSS892199260006', name: 'Naveen Yadav', mobile: '+91 98765 43215', site: 'Pune Industrial Campus', siteId: 'SITE-005', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Welder', doj: '2026-04-22', compliance: 'Expiring', status: 'Active', verified: true, attendance: 89 },
    { contractorBssId: 'BSSC198200000002', workerBssId: 'BSS892199270007', name: 'Deepak Pawar', mobile: '+91 98765 43216', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Safety Steward', doj: '2025-09-10', compliance: 'Compliant', status: 'Active', verified: true, attendance: 98 },
    { contractorBssId: 'BSSC198200000003', workerBssId: 'BSS892199280008', name: 'Manoj Jha', mobile: '+91 98765 43217', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', employer: 'L&T Construction', employerId: 'BSSE10021000001', designation: 'Shuttering Carpenter', doj: '2026-08-25', compliance: 'Non-compliant', status: 'Active', verified: false, attendance: 90 },
  ];
  for (const cw of contractorWorkers) {
    await prisma.contractorWorkerAssignment.create({ data: cw });
  }

  // Compliance Records
  const complianceRecords = [
    { contractorBssId: contractor.bssId, item: 'Medical Fitness Certificate', category: 'Worker Health', reference: 'MED-2026-8821', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', worker: 'Ravi Kumar', issueDate: '2026-01-14', expiryDate: '2027-01-13', verification: 'Verified', status: 'Active' },
    { contractorBssId: contractor.bssId, item: 'Safety Induction', category: 'Site Safety', reference: 'SAF-2026-1190', employer: 'Shapoorji Pallonji', site: 'Navi Mumbai Airport', worker: 'Suresh Patel', issueDate: '2026-08-10', expiryDate: '2027-08-10', verification: 'Pending', status: 'Active' },
    { contractorBssId: contractor.bssId, item: 'Work at Height Permit', category: 'Specialized Permit', reference: 'WAH-2025-551', employer: 'L&T Construction', site: 'Coastal Road Project', worker: 'Amit Singh', issueDate: '2025-09-01', expiryDate: '2026-08-31', verification: 'Verified', status: 'Expiring' },
    { contractorBssId: contractor.bssId, item: 'PF Registration', category: 'Statutory', reference: 'PF-MH-192831', employer: 'All Sites', site: 'All Sites', worker: null, issueDate: '2026-04-01', expiryDate: '2027-03-31', verification: 'Verified', status: 'Active' },
  ];
  for (const cmp of complianceRecords) {
    await prisma.complianceRecord.create({ data: cmp });
  }

  // Compliance Reports
  const complianceReports = [
    { contractorBssId: contractor.bssId, site: 'Mumbai Metro Line 3', employer: 'L&T Construction', period: '2026-07', type: 'PF Challan', status: 'Compliant' },
    { contractorBssId: contractor.bssId, site: 'Navi Mumbai Airport', employer: 'Shapoorji Pallonji', period: '2026-07', type: 'ESIC Return', status: 'Pending' },
    { contractorBssId: contractor.bssId, site: 'Coastal Road Project', employer: 'L&T Construction', period: '2026-06', type: 'Wage Register', status: 'Non-compliant' },
    { contractorBssId: contractor.bssId, site: 'Pune IT Park Phase II', employer: 'DLF', period: '2026-07', type: 'Attendance Register', status: 'Compliant' },
  ];
  for (const rep of complianceReports) {
    await prisma.complianceReport.create({ data: rep });
  }

  // Gate Passes
  const gatePasses = [
    { workerName: 'Ravi Kumar', workerId: 'BSS892199210001', contractor: 'RK Buildcon Pvt. Ltd.', employer: 'L&T Construction', type: 'Permanent', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', validFrom: '2026-01-01', validTo: '2026-12-31', status: 'Approved' },
    { workerName: 'Amit Singh', workerId: 'BSS892199220002', contractor: 'RK Buildcon Pvt. Ltd.', employer: 'Shapoorji Pallonji', type: 'Temporary', site: 'Navi Mumbai Airport', siteId: 'SITE-002', validFrom: '2026-08-20', validTo: '2026-09-20', status: 'Pending' },
    { workerName: 'Suresh Patel', workerId: 'BSS892199230003', contractor: 'RK Buildcon Pvt. Ltd.', employer: 'L&T Construction', type: 'Permanent', site: 'Coastal Road Project', siteId: 'SITE-003', validFrom: '2026-02-01', validTo: '2026-11-30', status: 'Rejected' },
    { workerName: 'Imran Shaikh', workerId: 'BSS892199250005', contractor: 'SafeBuild Infra Services', employer: 'L&T Construction', type: 'Permanent', site: 'Coastal Road Project', siteId: 'SITE-003', validFrom: '2025-02-01', validTo: '2026-12-31', status: 'Approved' },
    { workerName: 'Naveen Yadav', workerId: 'BSS892199260006', contractor: 'SafeBuild Infra Services', employer: 'L&T Construction', type: 'Temporary', site: 'Pune Industrial Campus', siteId: 'SITE-005', validFrom: '2026-08-25', validTo: '2026-09-25', status: 'Pending' },
    { workerName: 'Manoj Jha', workerId: 'BSS892199280008', contractor: 'Metro Civil Works', employer: 'L&T Construction', type: 'Permanent', site: 'Mumbai Metro Line 3', siteId: 'SITE-001', validFrom: '2026-08-26', validTo: '2026-12-31', status: 'Pending' },
  ];
  for (const gp of gatePasses) {
    await prisma.gatePass.create({ data: gp });
  }

  // Contractor Benefits
  const contractorBenefits = [
    { contractorBssId: contractor.bssId, type: 'bonus', worker: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', period: 'August 2026', amount: 6500, reason: 'Performance bonus — quarterly target', paidOn: '2026-08-28', status: 'Verified', source: 'contractor' },
    { contractorBssId: contractor.bssId, type: 'bonus', worker: 'Amit Singh', workerId: 'BSS892199220002', employer: 'Shapoorji Pallonji', period: 'August 2026', amount: 4500, reason: 'Attendance bonus', paidOn: '2026-08-28', status: 'Pending verification', source: 'contractor' },
    { contractorBssId: contractor.bssId, type: 'bonus', worker: 'Suresh Patel', workerId: 'BSS892199230003', employer: 'L&T Construction', period: 'June 2026', amount: 3000, reason: 'Safety compliance bonus', paidOn: '2026-06-30', fileName: 'bonus-suresh-jun.pdf', status: 'Verified', source: 'contractor' },
    { contractorBssId: contractor.bssId, type: 'leaveEncashment', worker: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', period: 'August 2026', days: 4, amount: 3800, reason: 'Unutilised leave encashment', paidOn: '2026-08-28', status: 'Verified', source: 'contractor' },
    { contractorBssId: contractor.bssId, type: 'leaveEncashment', worker: 'Imran Shaikh', workerId: 'BSS892199250005', employer: 'Shapoorji Pallonji', period: 'June 2026', days: 2, amount: 2100, reason: 'Leave encashment', paidOn: '2026-06-28', fileName: 'enc-imran-jun.pdf', status: 'Pending verification', source: 'contractor' },
  ];
  for (const ben of contractorBenefits) {
    await prisma.contractorBenefitRecord.create({ data: ben });
  }

  // Contractor Salaries
  const salaries = [
    { contractorBssId: contractor.bssId, worker: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', period: 'August 2026', gross: 31500, deductions: 3000, net: 28500, paidOn: '2026-08-28', status: 'Verified', source: 'contractor' },
    { contractorBssId: contractor.bssId, worker: 'Amit Singh', workerId: 'BSS892199220002', employer: 'Shapoorji Pallonji', site: 'Navi Mumbai Airport', period: 'August 2026', gross: 25000, deductions: 2500, net: 22500, paidOn: '2026-08-28', fileName: 'wage-amit-aug.pdf', status: 'Pending verification', source: 'contractor' },
    { contractorBssId: contractor.bssId, worker: 'Suresh Patel', workerId: 'BSS892199230003', employer: 'L&T Construction', site: 'Coastal Road Project', period: 'June 2026', gross: 22000, deductions: 2200, net: 19800, paidOn: '2026-06-28', status: 'Verified', source: 'contractor' },
  ];
  for (const sal of salaries) {
    await prisma.salaryRecord.create({ data: sal });
  }

  // Rozgar Applications
  const rozgarApps = [
    { contractorBssId: contractor.bssId, workerName: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', trade: 'Bar Bender', experience: '5 Years', expectedWage: 25000, location: 'Mumbai', status: 'Pending', dateApplied: '2026-08-14', matchScore: 92 },
    { contractorBssId: contractor.bssId, workerName: 'Suresh Patel', workerId: 'BSS892199230003', employer: 'Shapoorji Pallonji', trade: 'Mason', experience: '8 Years', expectedWage: 28000, location: 'Navi Mumbai', status: 'Shortlisted', dateApplied: '2026-08-12', matchScore: 85 },
    { contractorBssId: contractor.bssId, workerName: 'Amit Singh', workerId: 'BSS892199220002', employer: 'L&T Construction', trade: 'Electrician', experience: '3 Years', expectedWage: 22000, location: 'Pune', status: 'Pending', dateApplied: '2026-08-10', matchScore: 78 },
  ];
  for (const app of rozgarApps) {
    await prisma.rozgarApplication.create({ data: app });
  }

  // Job Postings
  await prisma.jobPosting.create({
    data: { contractorBssId: contractor.bssId, title: 'Senior Bar Bender', trade: 'Bar Bending', site: 'Mumbai Metro Line 3', vacancies: 5, wage: 28500 },
  });
  await prisma.jobPosting.create({
    data: { contractorBssId: contractor.bssId, title: 'Mason Specialist', trade: 'Masonry', site: 'Navi Mumbai Airport', vacancies: 8, wage: 26000 },
  });

  console.log('Contractor domain seeded.');

  // 5. Employer Domain
  const employer = await prisma.employerProfile.create({
    data: {
      bssId: 'BSSE100210000001',
      name: 'Ananya Mehta',
      company: 'L&T Construction',
      entity: 'Public Limited Company',
      verified: true,
      contact: '+91 22 6752 5656',
      email: 'workforce@ltconstruction.example',
      address: 'Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089',
      canAccessAdmin: true,
      govtScope: 'central',
      profileSections: JSON.stringify({
        basic: [
          { label: 'Organisation Name', value: 'L&T Construction' },
          { label: 'Entity Type', value: 'Public Limited Company' },
          { label: 'Authorised Signatory', value: 'Ananya Mehta' },
          { label: 'Registered Address', value: 'Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089' },
        ],
        registration: [
          { label: 'CIN', value: 'L99999MH1946PLC004768', sensitive: true },
          { label: 'PAN', value: 'AAACL0140P', sensitive: true },
          { label: 'GSTIN', value: '27AAACL0140P1ZL', sensitive: true },
          { label: 'EPFO Establishment ID', value: 'MHBAN0045678000', sensitive: true },
        ],
        contact: [
          { label: 'Workforce Operations Email', value: 'workforce@ltconstruction.example' },
          { label: 'Workforce Operations Phone', value: '+91 22 6752 5656' },
          { label: 'Escalation Contact', value: 'regional.hr@ltconstruction.example' },
        ],
        settings: [
          { label: 'Default Approval SLA', value: '2 business days' },
          { label: 'Compliance Reminder Window', value: '7 days before due date' },
          { label: 'Preferred Reporting Period', value: 'Monthly' },
        ],
      }),
    },
  });

  // Sites
  const sites = [
    {
      employerBssId: employer.bssId,
      code: 'MM3-CIVIL',
      name: 'Mumbai Metro Line 3',
      location: 'Mumbai',
      state: 'Maharashtra',
      startDate: '2024-01-15',
      endDate: '2027-06-30',
      status: 'Active',
      contractorIds: JSON.stringify(['CONT-001', 'CONT-003']),
      workers: 4,
      compliance: 96,
      detailsJson: JSON.stringify({
        type: 'Infrastructure',
        category: 'Metro Rail',
        entity: 'L&T Construction',
        address: { address: 'Mount Poonamallee Road, Manapakkam', state: 'Maharashtra', district: 'Mumbai Suburban', city: 'Mumbai', pin: '400059', latitude: '19.0760° N', longitude: '72.8777° E' },
        operational: { zone: 'Civil Line 3', shiftModel: 'Two shifts · 06:00–14:00 / 14:00–22:00', workforceModel: 'Contractor managed', workingDays: 'Monday – Saturday', gateTiming: '05:45 – 22:30' },
        complianceClient: { complianceClient: 'MMRDA', induction: 'Site induction complete', statutory: 'PF / ESIC applicable', reportingPeriod: 'Monthly', preferredCalendar: 'State notified holidays' },
        contacts: [{ label: 'Site Manager', value: 'Prakash Iyer' }, { label: 'Site HR', value: 'hr.mm3@ltconstruction.example' }, { label: 'Safety Officer', value: 'safety.mm3@ltconstruction.example' }, { label: 'Security Desk', value: '+91 22 6752 5700' }],
        attendanceAccess: { enabled: 'Yes', method: 'Biometric + mobile verified', deviceCount: '6 terminals', coverage: 'All gates across shifts', dailySync: 'Scheduled' },
        billingContractor: { name: 'RK Buildcon Pvt. Ltd.', bssId: 'BSSC198200000001', label: 'Operational & billing contractor' },
        facilities: [{ label: 'Accommodation camp', enabled: true }, { label: 'Canteen', enabled: true }, { label: 'First aid station', enabled: true }, { label: 'Tool stores', enabled: true }, { label: 'Welfare room', enabled: false }, { label: 'Medical room', enabled: true }],
      }),
    },
    {
      employerBssId: employer.bssId,
      code: 'MCR-SOUTH',
      name: 'Coastal Road Project',
      location: 'Mumbai',
      state: 'Maharashtra',
      startDate: '2023-08-01',
      endDate: '2026-12-31',
      status: 'Active',
      contractorIds: JSON.stringify(['CONT-001', 'CONT-002']),
      workers: 3,
      compliance: 91,
      detailsJson: JSON.stringify({
        type: 'Infrastructure',
        category: 'Coastal Highway',
        entity: 'L&T Construction',
        address: { address: 'Worli Sea Face', state: 'Maharashtra', district: 'Mumbai City', city: 'Mumbai', pin: '400018', latitude: '19.0178° N', longitude: '72.8160° E' },
        operational: { zone: 'South section', shiftModel: 'Three shifts · 00:00–08:00 / 08:00–16:00 / 16:00–00:00', workforceModel: 'Contractor managed', workingDays: 'Monday – Sunday', gateTiming: '24 hours' },
        complianceClient: { complianceClient: 'Mumbai Municipal Corporation', induction: 'Site induction complete', statutory: 'PF / ESIC applicable', reportingPeriod: 'Monthly', preferredCalendar: 'State notified holidays' },
        contacts: [{ label: 'Project Head', value: 'Anjali Rao' }, { label: 'Site HR', value: 'hr.mcr@ltconstruction.example' }, { label: 'Safety Officer', value: 'safety.mcr@ltconstruction.example' }],
        attendanceAccess: { enabled: 'Yes', method: 'Mobile verified', deviceCount: '4 terminals', coverage: 'Main gate only', dailySync: 'Scheduled' },
        billingContractor: { name: 'SafeBuild Infra Services', bssId: 'BSSC198200000002', label: 'Billing contractor' },
        facilities: [{ label: 'Accommodation camp', enabled: true }, { label: 'Canteen', enabled: true }, { label: 'First aid station', enabled: true }, { label: 'Tool stores', enabled: false }, { label: 'Welfare room', enabled: true }, { label: 'Medical room', enabled: false }],
      }),
    },
    {
      employerBssId: employer.bssId,
      code: 'PUNE-IDC2',
      name: 'Pune Industrial Campus',
      location: 'Pune',
      state: 'Maharashtra',
      startDate: '2026-04-01',
      endDate: '2028-03-31',
      status: 'Active',
      contractorIds: JSON.stringify(['CONT-002']),
      workers: 1,
      compliance: 88,
      detailsJson: JSON.stringify({
        type: 'Industrial',
        category: 'Works Campus',
        entity: 'L&T Construction',
        address: { address: 'Hinjewadi Phase II', state: 'Maharashtra', district: 'Pune', city: 'Pune', pin: '411057', latitude: '18.5913° N', longitude: '73.7389° E' },
        operational: { zone: 'Block C', shiftModel: 'Single shift · 09:00–18:00', workforceModel: 'Contractor managed', workingDays: 'Monday – Saturday', gateTiming: '08:30 – 19:00' },
        complianceClient: { complianceClient: 'Client Owner', induction: 'Induction mandated before first entry', statutory: 'PF / ESIC applicable', reportingPeriod: 'Monthly', preferredCalendar: 'State notified holidays' },
        contacts: [{ label: 'Campus Coordinator', value: 'Meena Kulkarni' }, { label: 'Site HR', value: 'hr.puneidc2@ltconstruction.example' }],
        attendanceAccess: { enabled: 'Yes', method: 'Biometric', deviceCount: '2 terminals', coverage: 'Admin block gate', dailySync: 'Scheduled' },
        billingContractor: { name: 'SafeBuild Infra Services', bssId: 'BSSC198200000002', label: 'Operational & billing contractor' },
        facilities: [{ label: 'Accommodation camp', enabled: false }, { label: 'Canteen', enabled: true }, { label: 'First aid station', enabled: true }, { label: 'Tool stores', enabled: false }, { label: 'Welfare room', enabled: false }, { label: 'Medical room', enabled: true }],
      }),
    },
  ];
  for (const s of sites) {
    await prisma.site.create({ data: s });
  }

  // Employer Approvals
  const approvals = [
    { employerBssId: employer.bssId, entityType: 'Contractor', entityId: 'CONT-003', name: 'Metro Civil Works', bssId: 'BSSC198200000003', contractor: null, site: 'Mumbai Metro Line 3', submittedAt: new Date('2026-08-25T11:20:00+05:30'), checks: JSON.stringify(['Company identity', 'Statutory registration', 'Site allocation']), status: 'Pending' },
    { employerBssId: employer.bssId, entityType: 'Worker', entityId: 'W-08', name: 'Manoj Jha', bssId: 'BSS892199280008', contractor: 'Metro Civil Works', site: 'Mumbai Metro Line 3', submittedAt: new Date('2026-08-27T15:45:00+05:30'), checks: JSON.stringify(['Identity', 'Medical fitness', 'Safety induction']), status: 'Pending' },
    { employerBssId: employer.bssId, entityType: 'Worker', entityId: 'W-03', name: 'Suresh Patel', bssId: 'BSS892199230003', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Coastal Road Project', submittedAt: new Date('2026-08-28T10:10:00+05:30'), checks: JSON.stringify(['Identity', 'Police verification', 'Gate access']), status: 'Pending' },
    { employerBssId: employer.bssId, entityType: 'Worker', entityId: 'W-06', name: 'Naveen Yadav', bssId: 'BSS892199260006', contractor: 'SafeBuild Infra Services', site: 'Pune Industrial Campus', submittedAt: new Date('2026-08-29T09:30:00+05:30'), checks: JSON.stringify(['Medical renewal', 'Work permit']), status: 'Pending' },
    { employerBssId: employer.bssId, entityType: 'Worker', entityId: 'W-01', name: 'Ravi Kumar', bssId: 'BSS892199210001', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', submittedAt: new Date('2026-08-20T12:00:00+05:30'), checks: JSON.stringify(['Identity', 'Medical fitness', 'Safety induction']), status: 'Approved' },
  ];
  for (const apr of approvals) {
    await prisma.employerApproval.create({ data: apr });
  }

  // Employer Compliance Reports
  const empReports = [
    { employerBssId: employer.bssId, contractorId: 'CONT-001', contractor: 'RK Buildcon Pvt. Ltd.', siteId: 'SITE-001', site: 'Mumbai Metro Line 3', period: '2026-07', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 98, status: 'Compliant' },
    { employerBssId: employer.bssId, contractorId: 'CONT-003', contractor: 'Metro Civil Works', siteId: 'SITE-001', site: 'Mumbai Metro Line 3', period: '2026-07', pf: 'Pending', esic: 'Pending', wage: 'Filed', safety: 'Review', score: 82, status: 'Pending' },
    { employerBssId: employer.bssId, contractorId: 'CONT-001', contractor: 'RK Buildcon Pvt. Ltd.', siteId: 'SITE-003', site: 'Coastal Road Project', period: '2026-07', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 94, status: 'Compliant' },
    { employerBssId: employer.bssId, contractorId: 'CONT-002', contractor: 'SafeBuild Infra Services', siteId: 'SITE-003', site: 'Coastal Road Project', period: '2026-07', pf: 'Filed', esic: 'Pending', wage: 'Filed', safety: 'Review', score: 88, status: 'Pending' },
    { employerBssId: employer.bssId, contractorId: 'CONT-002', contractor: 'SafeBuild Infra Services', siteId: 'SITE-005', site: 'Pune Industrial Campus', period: '2026-07', pf: 'Overdue', esic: 'Filed', wage: 'Pending', safety: 'Compliant', score: 76, status: 'Non-compliant' },
    { employerBssId: employer.bssId, contractorId: 'CONT-001', contractor: 'RK Buildcon Pvt. Ltd.', siteId: 'SITE-001', site: 'Mumbai Metro Line 3', period: '2026-06', pf: 'Filed', esic: 'Filed', wage: 'Filed', safety: 'Compliant', score: 97, status: 'Compliant' },
  ];
  for (const rep of empReports) {
    await prisma.employerComplianceReport.create({ data: rep });
  }

  // Employer Users
  const employerUsers = [
    { employerBssId: employer.bssId, name: 'Ananya Mehta', contact: 'workforce@ltconstruction.example', role: 'Admin', scope: 'All sites', status: 'Active', lastLogin: '2026-08-29T08:05:00+05:30' },
    { employerBssId: employer.bssId, name: 'Prakash Iyer', contact: 'sites.mm3@ltconstruction.example', role: 'Site Manager', scope: 'Mumbai Metro Line 3', status: 'Active', lastLogin: '2026-08-29T07:40:00+05:30' },
    { employerBssId: employer.bssId, name: 'Anjali Rao', contact: 'sites.mcr@ltconstruction.example', role: 'Compliance Officer', scope: 'All sites', status: 'Active', lastLogin: '2026-08-28T18:30:00+05:30' },
    { employerBssId: employer.bssId, name: 'Meena Kulkarni', contact: 'sites.puneidc2@ltconstruction.example', role: 'Viewer', scope: 'Pune Industrial Campus', status: 'Pending', lastLogin: null },
  ];
  for (const eu of employerUsers) {
    await prisma.employerUser.create({ data: eu });
  }

  // Employer Permission Roles
  const permRoles = [
    { role: 'Admin', description: 'Full access across all Employer modules and sites.', modulesJson: JSON.stringify([{ module: 'Sites', permissions: ['View', 'Create', 'Edit', 'Approve'] }, { module: 'Contractors', permissions: ['View', 'Create', 'Edit', 'Approve'] }, { module: 'Workers', permissions: ['View', 'Edit'] }, { module: 'Gate Pass', permissions: ['View', 'Approve'] }, { module: 'Compliance', permissions: ['View', 'Approve', 'Export'] }, { module: 'Users', permissions: ['View', 'Create', 'Edit'] }]) },
    { role: 'Site Manager', description: 'Operational access limited to assigned Site scope.', modulesJson: JSON.stringify([{ module: 'Sites', permissions: ['View', 'Edit'] }, { module: 'Contractors', permissions: ['View'] }, { module: 'Workers', permissions: ['View'] }, { module: 'Gate Pass', permissions: ['View', 'Approve'] }, { module: 'Compliance', permissions: ['View'] }]) },
    { role: 'Compliance Officer', description: 'Compliance and document review across the ecosystem.', modulesJson: JSON.stringify([{ module: 'Compliance', permissions: ['View', 'Approve', 'Export'] }, { module: 'Workers', permissions: ['View'] }, { module: 'Documents', permissions: ['View', 'Edit'] }]) },
    { role: 'Viewer', description: 'Read-only access for review and reporting.', modulesJson: JSON.stringify([{ module: 'Sites', permissions: ['View'] }, { module: 'Contractors', permissions: ['View'] }, { module: 'Workers', permissions: ['View'] }, { module: 'Compliance', permissions: ['View'] }]) },
  ];
  for (const pr of permRoles) {
    await prisma.employerPermissionRole.create({ data: pr });
  }

  // Employer Audits
  const empAudits = [
    { employerBssId: employer.bssId, timestamp: new Date('2026-08-29T09:30:00+05:30'), actor: 'Ananya Mehta', action: 'Approved worker compliance', entity: 'Naveen Yadav / W-06', status: 'Success' },
    { employerBssId: employer.bssId, timestamp: new Date('2026-08-29T09:05:00+05:30'), actor: 'Ananya Mehta', action: 'Approved gate pass', entity: 'Ravi Kumar / GP-EM-001', status: 'Success' },
    { employerBssId: employer.bssId, timestamp: new Date('2026-08-28T17:10:00+05:30'), actor: 'Prakash Iyer', action: 'Updated site details', entity: 'Mumbai Metro Line 3 / SITE-001', status: 'Success' },
    { employerBssId: employer.bssId, timestamp: new Date('2026-08-28T12:00:00+05:30'), actor: 'System', action: 'Compliance submission received', entity: 'Metro Civil Works / SUB-02', status: 'Pending' },
    { employerBssId: employer.bssId, timestamp: new Date('2026-08-27T15:45:00+05:30'), actor: 'Ananya Mehta', action: 'Deactivated user', entity: 'Viewer / temporary', status: 'Failed' },
  ];
  for (const ea of empAudits) {
    await prisma.employerAudit.create({ data: ea });
  }

  // Employer Routes
  const empRoutes = [
    { employerBssId: employer.bssId, name: 'Crew Bus 1', reference: 'MH-01-AB-4321', vehicle: '42-seater', route: 'Labour Camp A → Mumbai Metro Line 3', workers: 28, shifts: '06:00 / 14:00', status: 'Active' },
    { employerBssId: employer.bssId, name: 'Coastal Shuttle', reference: 'MH-02-CD-9820', vehicle: '18-seater', route: 'Worli Camp → Coastal Road Project', workers: 16, shifts: '06:30 / 15:30', status: 'Active' },
    { employerBssId: employer.bssId, name: 'Pune Commute', reference: 'MH-12-EF-5510', vehicle: '30-seater', route: 'Hinjewadi → Pune Industrial Campus', workers: 21, shifts: '08:00 / 18:00', status: 'Suspended' },
  ];
  for (const er of empRoutes) {
    await prisma.employerRoute.create({ data: er });
  }

  // Employer Worker Documents
  const empWorkerDocs = [
    { employerBssId: employer.bssId, worker: 'Ravi Kumar', workerId: 'BSS892199210001', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', document: 'Medical Fitness Certificate', status: 'Expiring', expiry: '2026-09-01' },
    { employerBssId: employer.bssId, worker: 'Amit Singh', workerId: 'BSS892199220002', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', document: 'Work at Height Permit', status: 'Expiring', expiry: '2026-08-31' },
    { employerBssId: employer.bssId, worker: 'Suresh Patel', workerId: 'BSS892199230003', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Coastal Road Project', document: 'Police Verification', status: 'Missing', expiry: null },
    { employerBssId: employer.bssId, worker: 'Naveen Yadav', workerId: 'BSS892199260006', contractor: 'SafeBuild Infra Services', site: 'Pune Industrial Campus', document: 'Work Permit', status: 'Pending', expiry: null },
    { employerBssId: employer.bssId, worker: 'Imran Shaikh', workerId: 'BSS892199250005', contractor: 'SafeBuild Infra Services', site: 'Coastal Road Project', document: 'Safety Induction', status: 'Verified', expiry: '2026-12-31' },
  ];
  for (const ewd of empWorkerDocs) {
    await prisma.employerWorkerDocument.create({ data: ewd });
  }

  // Document Submissions
  const submissions = [
    { id: 'SUB-01', submittedByRole: 'Contractor', submittedByBssId: contractor.bssId, type: 'PF Challan', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', period: '2026-07', fileName: 'pf-challan-jul2026.pdf', fileSize: 1048576, mimeType: 'application/pdf', storagePath: '.data/uploads/contractor/pf-challan-jul2026.pdf', checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', status: 'Verified', submittedAt: new Date('2026-08-02T10:30:00+05:30') },
    { id: 'SUB-02', submittedByRole: 'Contractor', submittedByBssId: 'BSSC198200000003', type: 'ESIC Return', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', period: '2026-07', fileName: 'esic-return-jul2026.pdf', fileSize: 524288, mimeType: 'application/pdf', storagePath: '.data/uploads/contractor/esic-return-jul2026.pdf', checksum: 'sha256:a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', status: 'Pending verification', submittedAt: new Date('2026-08-04T13:15:00+05:30') },
    { id: 'SUB-03', submittedByRole: 'Contractor', submittedByBssId: 'BSSC198200000002', type: 'Wage Register', employer: 'L&T Construction', site: 'Coastal Road Project', period: '2026-06', fileName: 'wage-register-jun2026.pdf', fileSize: 2097152, mimeType: 'application/pdf', storagePath: '.data/uploads/contractor/wage-register-jun2026.pdf', checksum: 'sha256:9f8e7d6c5b4a3928170123456789abcdef0123456789abcdef0123456789abcd', status: 'Returned', submittedAt: new Date('2026-07-30T09:00:00+05:30') },
    { id: 'SUB-04', submittedByRole: 'Contractor', submittedByBssId: contractor.bssId, type: 'Attendance Register', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', period: '2026-07', fileName: 'attendance-jul2026.pdf', fileSize: 786432, mimeType: 'application/pdf', storagePath: '.data/uploads/contractor/attendance-jul2026.pdf', checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', status: 'Verified', submittedAt: new Date('2026-08-01T11:45:00+05:30') },
  ];
  for (const sub of submissions) {
    await prisma.documentSubmission.create({ data: sub });
  }

  console.log('Employer domain seeded.');

  // 6. Operations & Service Health Domain
  const now = new Date();
  const services = [
    { id: 'identity', name: 'Identity & Session', host: 'identity.bss.gov.in', status: 'Operational', latencyMs: 46, uptime: 99.99, lastCheckedAt: now },
    { id: 'portal', name: 'Portal / E-C-S-W API', host: 'api.bss.gov.in', status: 'Operational', latencyMs: 31, uptime: 99.97, lastCheckedAt: now },
    { id: 'benefits', name: 'EPFO / ESIC integration', host: 'benefits-gateway.bss.gov.in', status: 'Degraded', latencyMs: 820, uptime: 99.41, lastCheckedAt: now },
    { id: 'otp', name: 'SMS / OTP Gateway', host: 'sms.bss.gov.in', status: 'Operational', latencyMs: 240, uptime: 99.95, lastCheckedAt: now },
    { id: 'voice', name: 'IVR / Voice Service', host: 'ivr.bss.gov.in', status: 'Operational', latencyMs: 180, uptime: 99.91, lastCheckedAt: now },
    { id: 'notifications', name: 'Notifications stream', host: 'notify.bss.gov.in', status: 'Operational', latencyMs: 22, uptime: 99.98, lastCheckedAt: now },
  ];
  for (const s of services) {
    await prisma.operationsService.create({ data: s });
  }

  const logs = [
    { timestamp: minutesAgo(1), level: 'info', source: 'identity', message: 'Session validation completed', correlationId: 'corr-91c2' },
    { timestamp: minutesAgo(3), level: 'warning', source: 'benefits', message: 'EPFO upstream latency exceeded 750 ms', correlationId: 'corr-73ab' },
    { timestamp: minutesAgo(6), level: 'audit', source: 'bindings', message: 'Consent tuple BC-1042 moved to bound', correlationId: 'corr-0042' },
    { timestamp: minutesAgo(9), level: 'error', source: 'jobs', message: 'Benefit reconciliation job queued for retry', correlationId: 'corr-a180' },
    { timestamp: minutesAgo(12), level: 'info', source: 'notifications', message: 'Worker notification batch delivered', correlationId: 'corr-553e' },
  ];
  for (const l of logs) {
    await prisma.operationsLog.create({ data: l });
  }

  const tickets = [
    { id: 'INC-2026-081', title: 'EPFO responses exceed latency SLO', service: 'benefits', priority: 'P2', status: 'Open', assignee: null, openedAt: minutesAgo(84), updatedAt: minutesAgo(12) },
    { id: 'INC-2026-079', title: 'Binding retry queue above threshold', service: 'portal', priority: 'P2', status: 'In progress', assignee: 'BSSIT2026HDK00002', openedAt: minutesAgo(190), updatedAt: minutesAgo(18) },
    { id: 'REQ-2026-211', title: 'Audit export required for compliance review', service: 'portal', priority: 'P3', status: 'Open', assignee: null, openedAt: minutesAgo(310), updatedAt: minutesAgo(48) },
    { id: 'INC-2026-074', title: 'SMS delivery delay in Bihar circle', service: 'otp', priority: 'P3', status: 'Monitoring', assignee: 'BSSIT2026HDK00003', openedAt: minutesAgo(530), updatedAt: minutesAgo(26) },
  ];
  for (const t of tickets) {
    await prisma.operationsTicket.create({ data: t });
  }

  // 7. BSS Staff Support Cases
  const cases = [
    { id: 'BC-1039', type: 'Binding', subject: 'Physical-card consent pending', party: 'Suresh Patel · BSS892199230003', owner: 'RK Buildcon', priority: 'High', status: 'Open', assignee: null, createdAt: minutesAgo(105), updatedAt: minutesAgo(18), summary: 'Worker physical-card verification is complete; staff consent confirmation is still required.' },
    { id: 'DOC-2048', type: 'Document', subject: 'Medical certificate requires review', party: 'Ravi Kumar · BSS892199210001', owner: 'L&T Construction', priority: 'Urgent', status: 'Open', assignee: null, createdAt: minutesAgo(220), updatedAt: minutesAgo(31), summary: 'Replacement medical certificate was uploaded after the previous record expired.' },
    { id: 'DSP-201', type: 'Dispute', subject: 'June wage mismatch', party: 'Ravi Kumar vs L&T Construction', owner: 'BSS Resolution Desk', priority: 'High', status: 'Waiting for evidence', assignee: 'BSSST2026STF00002', createdAt: minutesAgo(580), updatedAt: minutesAgo(42), summary: 'Contractor wage register and worker bank statement are required before adjudication.' },
    { id: 'WRK-881', type: 'Worker record', subject: 'UAN identifier mismatch', party: 'Naveen Yadav · BSS892199260006', owner: 'SafeBuild Infra', priority: 'Normal', status: 'Escalated', assignee: 'BSSST2026STF00003', createdAt: minutesAgo(720), updatedAt: minutesAgo(75), summary: 'The verified EPFO UAN does not match the number supplied during onboarding.' },
  ];
  for (const c of cases) {
    await prisma.supportCase.create({ data: c });
  }

  // ECS Bindings
  await prisma.ecsBinding.create({
    data: {
      employerId: 'BSSE10021000001',
      contractorId: 'BSSC198200000001',
      siteId: 'SITE-001',
      workerId: 'BSS892199210001',
      tuple: 'BSSE10021000001|BSSC198200000001|SITE-001|BSS892199210001',
      state: 'bound',
      consentJson: JSON.stringify({ employer: true, contractor: true, worker: true }),
      requestedBy: 'contractor',
      boundAt: minutesAgo(2000),
    },
  });
  await prisma.ecsBinding.create({
    data: {
      employerId: 'BSSE10021000001',
      contractorId: 'BSSC198200000001',
      siteId: 'SITE-003',
      workerId: 'BSS892199230003',
      tuple: 'BSSE10021000001|BSSC198200000001|SITE-003|BSS892199230003',
      state: 'pending',
      consentJson: JSON.stringify({ employer: true, contractor: true, worker: false }),
      requestedBy: 'contractor',
    },
  });

  console.log('Operations, IT, and BSS Staff domain seeded.');

  // 8. Government Worker Demographic Dataset (108 records across 12 states)
  const statesList = ['Maharashtra', 'Bihar', 'Uttar Pradesh', 'Rajasthan', 'Tamil Nadu', 'Karnataka', 'West Bengal', 'Madhya Pradesh', 'Odisha', 'Telangana', 'Delhi', 'Gujarat'] as const;
  const occupations = ['Bar Bender', 'Mason', 'Carpenter', 'Electrician', 'Welder', 'Plumber', 'Heavy Equipment Operator', 'Scaffolder', 'Painter', 'Helper'] as const;
  const categories = ['Civil Construction', 'Industrial', 'IT/Park', 'Infrastructure', 'Residential', 'Commercial', 'Energy', 'Textile'] as const;
  const siteTypes = ['Infrastructure', 'High-rise', 'Industrial Park', 'Metro Rail', 'Road & Highway', 'Residential Campus', 'Power Plant'] as const;
  const employers = ['L&T Construction', 'Shapoorji Pallonji', 'DLF Limited', 'Tata Projects', 'Adani Infra', 'GMR Group', 'HCC', 'Lodha Group'] as const;
  const contractorsList = ['RK Buildcon', 'SafeBuild Infra', 'Metro Civil', 'Vertex Constructions', 'Nirmaan Works', 'Suraj Builders', 'Konkan Infra', 'Everest C&C'] as const;

  const districtsByState: Record<string, string[]> = {
    Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
    Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Varanasi'],
    Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
    Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
    Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'],
    Telangana: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad'],
    Delhi: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi'],
    Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  };
  const cities = ['Central Zone', 'North Zone', 'East Zone', 'West Zone'];

  function prng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
  const rand = prng(20260830);
  let govCount = 0;
  for (const state of statesList) {
    const districts = districtsByState[state];
    for (let i = 0; i < 9; i++) {
      const occ = occupations[Math.floor(rand() * occupations.length)];
      const district = districts[Math.floor(rand() * districts.length)];
      const g = rand();
      const gender = g < 0.68 ? 'Male' : g < 0.98 ? 'Female' : 'Transgender';
      const migrant = rand() < 0.55;
      govCount += 1;
      await prisma.governmentWorker.create({
        data: {
          id: `GW-${String(govCount).padStart(3, '0')}`,
          state,
          district,
          city: cities[Math.floor(rand() * cities.length)],
          age: 18 + Math.floor(rand() * 37),
          gender,
          category: categories[Math.floor(rand() * categories.length)],
          occupation: occ,
          site: `${district} ${siteTypes[Math.floor(rand() * siteTypes.length)]}`,
          siteType: siteTypes[Math.floor(rand() * siteTypes.length)],
          employer: employers[Math.floor(rand() * employers.length)],
          contractor: contractorsList[Math.floor(rand() * contractorsList.length)],
          migrant,
          stateOfOrigin: migrant ? statesList[Math.floor(rand() * statesList.length)] : state,
          attendance: 70 + Math.floor(rand() * 30),
          compliance: rand() < 0.74 ? 'Compliant' : rand() < 0.5 ? 'Pending' : 'Non-compliant',
          epfoLinked: rand() < 0.72,
          esicLinked: rand() < 0.4,
          wage: 14000 + Math.floor(rand() * 30) * 1000,
        },
      });
    }
  }
  console.log(`Seeded ${govCount} GovernmentWorker records across 12 states.`);

  // 9. Notifications
  const notifications = [
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'REQ-9921-A', category: 'Jobs', title: 'Employment request awaiting response', message: 'Review the binding request from Shapoorji Pallonji for Navi Mumbai Airport.', href: '/Rozgar/WorkerRozgar#REQ-9921-A', actionLabel: 'Review request', priority: 'critical', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'PAN Card', category: 'Documents', title: 'PAN Card is required', message: 'Upload your PAN Card to complete mandatory worker documentation.', href: '/worker/Documents#missing-documents', actionLabel: 'Upload document', priority: 'high', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'Medical Certificate', category: 'Documents', title: 'Medical Certificate is required', message: 'Upload the current Medical Certificate required for your employment record.', href: '/worker/Documents#missing-documents', actionLabel: 'Upload document', priority: 'high', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'medical-fitness', category: 'Compliance', title: 'Medical fitness expires in 5 days', message: 'Review the examination details and start the renewal process.', href: '/worker/Compliance#medical-fitness', actionLabel: 'Review compliance', priority: 'critical', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'permanent-gate-pass', category: 'Compliance', title: 'Gate pass approval is pending', message: 'Your permanent gate pass remains pending approval.', href: '/worker/Compliance#gate-pass', actionLabel: 'View status', priority: 'normal', requiresAction: false, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'GRV-2026-9123', category: 'Grievances', title: 'Grievance remains under review', message: 'Open the grievance to review its latest status.', href: '/worker/grievances#GRV-2026-9123', actionLabel: 'Track grievance', priority: 'normal', requiresAction: false, read: false, resolved: false },
    { recipientRole: 'Worker', recipientBssId: 'BSS234567890124', entityId: 'ANN-104', category: 'Announcements', title: 'Important safety briefing', message: 'Monsoon safety briefing is scheduled for 1 September.', href: '/worker/Announcements#ANN-104', actionLabel: 'Read announcement', priority: 'high', requiresAction: false, read: false, resolved: false },
    { recipientRole: 'Contractor', recipientBssId: 'BSSC198200000001', category: 'Compliance', title: 'Compliance record expires soon', message: 'A work-at-height permit for Coastal Road Project expires in two days.', href: '/contractor/compliance', actionLabel: 'Review compliance', priority: 'critical', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Contractor', recipientBssId: 'BSSC198200000001', category: 'Documents', title: 'Worker verification pending', message: 'Suresh Patel requires document verification before site access can be restored.', href: '/contractor/workers', actionLabel: 'Review worker', priority: 'high', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Employer', recipientBssId: 'BSSE100210000001', entityId: 'APR-001', category: 'Approvals', title: 'Contractor approval required', message: 'Metro Civil Works requested access to Mumbai Metro Line 3.', href: '/employer/approvals', actionLabel: 'Review request', priority: 'critical', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Employer', recipientBssId: 'BSSE100210000001', entityId: 'APR-004', category: 'Approvals', title: 'Worker compliance approval required', message: 'Naveen Yadav submitted a medical renewal and work permit.', href: '/employer/approvals', actionLabel: 'Review worker', priority: 'high', requiresAction: true, read: false, resolved: false },
    { recipientRole: 'Employer', recipientBssId: 'BSSE100210000001', entityId: 'ECR-005', category: 'Compliance', title: 'Statutory filing overdue', message: 'SafeBuild Infra has an overdue PF filing for Pune Industrial Campus.', href: '/employer/compliance', actionLabel: 'Open compliance', priority: 'critical', requiresAction: true, read: false, resolved: false },
  ];
  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log('Notifications seeded.');
  console.log('--- Bharat Shram Setu Database Seed Completed Successfully ---');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
