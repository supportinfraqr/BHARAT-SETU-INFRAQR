#!/usr/bin/env node

/**
 * Bharat Shram Setu (BSS) — 4-Tier Comprehensive E2E & API Test Runner
 *
 * Usage:
 *   node scripts/run-e2e-tests.mjs
 *   node scripts/run-e2e-tests.mjs --tier=1
 *   node scripts/run-e2e-tests.mjs --tier=2
 *   node scripts/run-e2e-tests.mjs --tier=3
 *   node scripts/run-e2e-tests.mjs --tier=4
 *   node scripts/run-e2e-tests.mjs --filter="Worker"
 */

import { runTier1WorkerTests } from '../tests/tier1-features/tier1-worker.test.mjs';
import { runTier1ContractorTests } from '../tests/tier1-features/tier1-contractor.test.mjs';
import { runTier1EmployerTests } from '../tests/tier1-features/tier1-employer.test.mjs';
import { runTier1BssStaffTests } from '../tests/tier1-features/tier1-bss-staff.test.mjs';
import { runTier1ItHelpdeskTests } from '../tests/tier1-features/tier1-admin.test.mjs';
import { runTier1GovernmentTests } from '../tests/tier1-features/tier1-government.test.mjs';
import { runTier1UploadTests } from '../tests/tier1-features/tier1-uploads.test.mjs';
import { runTier1IdentitySystemTests } from '../tests/tier1-features/tier1-identity-system.test.mjs';
import { runTier2SecurityBoundaryTests } from '../tests/tier2-boundary-corner/tier2-security-boundary.test.mjs';
import { runTier3WorkflowTests } from '../tests/tier3-combinations/tier3-workflows.test.mjs';
import { runTier4RealWorldTests } from '../tests/tier4-scenarios/tier4-real-world.test.mjs';
import { runTier5AdversarialTests } from '../tests/tier5-adversarial/tier5-adversarial-hardening.test.mjs';

// ANSI Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const DIM = '\x1b[2m';

const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='))?.split('=')[1];
const filterArg = args.find(a => a.startsWith('--filter='))?.split('=')[1]?.toLowerCase();
const baseUrl = process.env.BSS_TEST_BASE_URL || 'http://localhost:3000';

async function verifyServerReady() {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) {
      console.warn(`${YELLOW}[WARNING] Server health returned HTTP ${res.status}${RESET}`);
    }
  } catch (err) {
    console.error(`${RED}[ERROR] Could not connect to Next.js server at ${baseUrl}.${RESET}`);
    console.error(`Please ensure the server is running with: ${BOLD}npm run dev${RESET} or ${BOLD}npm start${RESET}\n`);
    process.exit(1);
  }
}

async function runSuite(tierName, suiteName, runnerFn) {
  const startTime = Date.now();
  console.log(`\n${BOLD}${CYAN}▶ Running ${tierName}: ${suiteName}${RESET}`);
  let results = [];
  try {
    results = await runnerFn();
  } catch (err) {
    results = [{ name: `${suiteName} Suite Failure`, pass: false, error: err.stack || err.message }];
  }
  const duration = Date.now() - startTime;

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (filterArg && !r.name.toLowerCase().includes(filterArg)) {
      continue;
    }
    if (r.pass) {
      passed++;
      console.log(`  ${GREEN}✓${RESET} ${r.name}`);
    } else {
      failed++;
      console.log(`  ${RED}✗${RESET} ${BOLD}${r.name}${RESET}`);
      if (r.error) {
        console.log(`    ${RED}${r.error}${RESET}`);
      }
    }
  }

  console.log(`  ${DIM}(${passed} passed, ${failed} failed in ${duration}ms)${RESET}`);
  return { tierName, suiteName, passed, failed, duration, results };
}

async function main() {
  console.log(`\n${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${BLUE}       Bharat Shram Setu (BSS) — 4-Tier E2E & API Test Runner        ${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${DIM}Target Server: ${baseUrl}${RESET}\n`);

  await verifyServerReady();

  const allSummary = [];
  const startOverall = Date.now();

  const shouldRunTier = (tierNum) => !tierArg || tierArg === String(tierNum);

  // --- TIER 1: Feature Coverage ---
  if (shouldRunTier(1)) {
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Worker Domain', runTier1WorkerTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Contractor Domain', runTier1ContractorTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Employer Domain', runTier1EmployerTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'BSS Staff Domain', runTier1BssStaffTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'IT Helpdesk Domain', runTier1ItHelpdeskTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Government Analytics', runTier1GovernmentTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Document Uploads', runTier1UploadTests));
    allSummary.push(await runSuite('Tier 1: Feature Coverage', 'Identity & System Endpoints', runTier1IdentitySystemTests));
  }

  // --- TIER 2: Boundary & Corner Cases ---
  if (shouldRunTier(2)) {
    allSummary.push(await runSuite('Tier 2: Boundary & Security', 'Security & Boundary Controls', runTier2SecurityBoundaryTests));
  }

  // --- TIER 3: Cross-Feature Combinations ---
  if (shouldRunTier(3)) {
    allSummary.push(await runSuite('Tier 3: Cross-Feature Workflows', 'Multi-Role Workflows', runTier3WorkflowTests));
  }

  // --- TIER 4: Real-World Scenarios ---
  if (shouldRunTier(4)) {
    allSummary.push(await runSuite('Tier 4: Real-World Scenarios', 'Full Life-Cycle & Concurrency', runTier4RealWorldTests));
  }

  // --- TIER 5: Adversarial Coverage Hardening ---
  if (shouldRunTier(5)) {
    allSummary.push(await runSuite('Tier 5: Adversarial Hardening', 'Adversarial & Stress Controls', runTier5AdversarialTests));
  }

  const totalDuration = Date.now() - startOverall;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log(`\n${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${BLUE}                           TEST SUITE SUMMARY                         ${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}`);

  for (const s of allSummary) {
    totalPassed += s.passed;
    totalFailed += s.failed;
    const statusIcon = s.failed === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`  [${statusIcon}] ${s.tierName.padEnd(30)} :: ${s.suiteName.padEnd(30)} (${s.passed}/${s.passed + s.failed})`);
  }

  console.log(`${DIM}----------------------------------------------------------------------${RESET}`);
  console.log(`  ${BOLD}Total Tests:${RESET}   ${totalPassed + totalFailed}`);
  console.log(`  ${BOLD}${GREEN}Total Passed:${RESET}  ${totalPassed}`);
  console.log(`  ${BOLD}${totalFailed > 0 ? RED : GREEN}Total Failed:${RESET}  ${totalFailed}`);
  console.log(`  ${BOLD}Total Time:${RESET}    ${totalDuration}ms`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}\n`);

  if (totalFailed > 0) {
    console.error(`${RED}${BOLD}✖ TEST SUITE FAILED with ${totalFailed} failure(s).${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}✔ ALL ${totalPassed} TESTS PASSED SUCCESSFULLY!${RESET}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${RED}Fatal runner error:${RESET}`, err);
  process.exit(1);
});
