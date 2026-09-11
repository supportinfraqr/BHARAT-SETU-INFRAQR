import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const markerTag = process.argv[2];
  if (!markerTag) {
    throw new Error('Marker tag required as argument');
  }

  console.log(`[Process 3] Verifying mutated lifecycle marker records and cleaning up: ${markerTag}`);

  // 1. Verify Worker was updated in Step 2
  const worker = await prisma.workerProfile.findUnique({ where: { bssId: `WRK_${markerTag}` } });
  if (!worker) throw new Error(`WorkerProfile WRK_${markerTag} not found in SQLite!`);
  if (worker.category !== 'Master Mason') throw new Error(`Worker category was not updated! Got: ${worker.category}`);
  if (worker.availability !== true) throw new Error('Worker availability was not updated!');

  // 2. Verify Contractor was updated in Step 2
  const contractor = await prisma.contractorProfile.findUnique({ where: { bssId: `CON_${markerTag}` } });
  if (!contractor) throw new Error(`ContractorProfile CON_${markerTag} not found in SQLite!`);
  if (contractor.rating !== 5.0) throw new Error(`Contractor rating was not updated! Got: ${contractor.rating}`);

  // 3. Verify SupportCase was updated in Step 2
  const caseId = `CASE_${markerTag.substring(0, 15)}`;
  const supportCase = await prisma.supportCase.findUnique({ where: { id: caseId } });
  if (!supportCase) throw new Error(`SupportCase ${caseId} not found in SQLite!`);
  if (supportCase.status !== 'In progress') throw new Error(`SupportCase status was not updated! Got: ${supportCase.status}`);
  if (supportCase.assignee !== 'BSS_TEST_AGENT_42') throw new Error(`SupportCase assignee was not updated! Got: ${supportCase.assignee}`);

  console.log('[Process 3] All mutations verified persisting across process reloads! Cleaning up...');

  // Cleanup
  await prisma.user.delete({ where: { subject: `USR_${markerTag}` } });
  await prisma.workerProfile.delete({ where: { bssId: `WRK_${markerTag}` } });
  await prisma.contractorProfile.delete({ where: { bssId: `CON_${markerTag}` } });
  await prisma.employerProfile.delete({ where: { bssId: `EMP_${markerTag}` } });
  await prisma.operationsLog.deleteMany({ where: { correlationId: `CORR_${markerTag}` } });
  await prisma.supportCase.delete({ where: { id: caseId } });

  // Verify cleanup
  const remainingWorker = await prisma.workerProfile.findUnique({ where: { bssId: `WRK_${markerTag}` } });
  if (remainingWorker) throw new Error('Worker record was not cleaned up!');

  console.log('[Process 3] Cleanup completed and verified. Exiting.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[Process 3 Error]:', e);
  await prisma.$disconnect();
  process.exit(1);
});
