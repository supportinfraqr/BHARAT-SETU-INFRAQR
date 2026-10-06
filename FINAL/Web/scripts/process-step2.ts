import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const markerTag = process.argv[2];
  if (!markerTag) {
    throw new Error('Marker tag required as argument');
  }

  console.log(`[Process 2] Verifying and mutating lifecycle marker records with tag: ${markerTag}`);

  // 1. Verify User
  const user = await prisma.user.findUnique({ where: { subject: `USR_${markerTag}` } });
  if (!user) throw new Error(`User USR_${markerTag} not found in SQLite!`);
  if (user.role !== 'Worker') throw new Error(`User role mismatch: expected Worker, got ${user.role}`);

  // 2. Verify WorkerProfile
  const worker = await prisma.workerProfile.findUnique({ where: { bssId: `WRK_${markerTag}` } });
  if (!worker) throw new Error(`WorkerProfile WRK_${markerTag} not found in SQLite!`);
  if (worker.category !== 'Mason') throw new Error(`Worker category mismatch: expected Mason, got ${worker.category}`);

  // 3. Verify ContractorProfile
  const contractor = await prisma.contractorProfile.findUnique({ where: { bssId: `CON_${markerTag}` } });
  if (!contractor) throw new Error(`ContractorProfile CON_${markerTag} not found in SQLite!`);

  // 4. Verify EmployerProfile
  const employer = await prisma.employerProfile.findUnique({ where: { bssId: `EMP_${markerTag}` } });
  if (!employer) throw new Error(`EmployerProfile EMP_${markerTag} not found in SQLite!`);

  // 5. Verify OperationsLog
  const log = await prisma.operationsLog.findFirst({ where: { correlationId: `CORR_${markerTag}` } });
  if (!log) throw new Error(`OperationsLog CORR_${markerTag} not found in SQLite!`);

  // 6. Verify SupportCase
  const caseId = `CASE_${markerTag.substring(0, 15)}`;
  const supportCase = await prisma.supportCase.findUnique({ where: { id: caseId } });
  if (!supportCase) throw new Error(`SupportCase ${caseId} not found in SQLite!`);

  console.log('[Process 2] All 6 marker records verified intact. Mutating records for Step 3 verification...');

  // Update Worker
  await prisma.workerProfile.update({
    where: { bssId: `WRK_${markerTag}` },
    data: {
      category: 'Master Mason',
      availability: true,
    },
  });

  // Update SupportCase status
  await prisma.supportCase.update({
    where: { id: caseId },
    data: {
      status: 'In progress',
      assignee: 'BSS_TEST_AGENT_42',
    },
  });

  // Update Contractor
  await prisma.contractorProfile.update({
    where: { bssId: `CON_${markerTag}` },
    data: {
      rating: 5.0,
    },
  });

  console.log('[Process 2] Mutations committed successfully. Disconnecting and exiting.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[Process 2 Error]:', e);
  await prisma.$disconnect();
  process.exit(1);
});
