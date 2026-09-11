import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const markerTag = process.argv[2];
  if (!markerTag) {
    throw new Error('Marker tag required as argument');
  }

  console.log(`[Process 1] Inserting lifecycle marker records with tag: ${markerTag}`);

  // 1. User
  await prisma.user.create({
    data: {
      subject: `USR_${markerTag}`,
      role: 'Worker',
      contact: '9999999999',
      mpinHash: 'hash_123',
    },
  });

  // 2. WorkerProfile
  await prisma.workerProfile.create({
    data: {
      bssId: `WRK_${markerTag}`,
      name: `Worker ${markerTag}`,
      category: 'Mason',
      skillsJson: JSON.stringify({ skill: 'Masonry', level: 'Expert' }),
      bankingJson: JSON.stringify({ bank: 'SBI', account: '1234567890' }),
    },
  });

  // 3. ContractorProfile
  await prisma.contractorProfile.create({
    data: {
      bssId: `CON_${markerTag}`,
      name: `Contractor ${markerTag}`,
      company: `Buildcon ${markerTag} Pvt Ltd`,
      rating: 4.9,
    },
  });

  // 4. EmployerProfile
  await prisma.employerProfile.create({
    data: {
      bssId: `EMP_${markerTag}`,
      name: `Employer ${markerTag}`,
      company: `InfraCorp ${markerTag}`,
    },
  });

  // 5. OperationsLog
  await prisma.operationsLog.create({
    data: {
      level: 'audit',
      source: 'challenger-test',
      message: `Lifecycle verification write ${markerTag}`,
      correlationId: `CORR_${markerTag}`,
    },
  });

  // 6. SupportCase
  await prisma.supportCase.create({
    data: {
      id: `CASE_${markerTag.substring(0, 15)}`,
      type: 'Dispute',
      subject: `Lifecycle test case ${markerTag}`,
      party: 'Worker',
      owner: 'BSS Staff',
      summary: 'Testing process reload persistence across Node runtime shutdowns',
    },
  });

  console.log('[Process 1] All 6 marker records inserted successfully. Disconnecting and exiting.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[Process 1 Error]:', e);
  await prisma.$disconnect();
  process.exit(1);
});
