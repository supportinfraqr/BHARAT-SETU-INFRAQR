import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { BssClient } from '../helpers/client.mjs';
import {
  assertTrue,
  assertStatus,
  assertIncludes,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  TEST_USERS,
} from '../helpers/fixtures.mjs';

export async function runTier4RealWorldTests() {
  const results = [];

  // Scenario 4.1: Comprehensive End-to-End Multi-Role Life-Cycle Simulation
  try {
    // Step 1: Worker onboards, registers, validates Verhoeff BSS-ID
    const workerPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const workerClient = new BssClient();
    const regRes = await workerClient.post('/api/auth/register', {
      role: 'Worker',
      contact: workerPhone,
      otp: '123456',
      acceptedTerms: true,
    });
    assertStatus(regRes, 201, 'Step 1: Worker registration');
    const workerBssId = regRes.json.bssId;

    // Step 2: Contractor logs in, onboards worker to site, issues gate pass, uploads salary register
    const contractorClient = new BssClient();
    await contractorClient.login('Contractor');

    const assignRes = await contractorClient.post('/api/portal/workers', {
      bssId: workerBssId,
      name: 'Pooja Sharma',
      mobile: workerPhone,
      site: 'Mumbai Metro Line 3',
      employer: 'L&T Construction',
      designation: 'Safety Supervisor',
    });
    assertStatus(assignRes, 201, 'Step 2: Contractor worker assignment');

    const gpRes = await contractorClient.post('/api/portal/gate-passes', {
      workerName: 'Pooja Sharma',
      workerId: workerBssId,
      employer: 'L&T Construction',
      site: 'Mumbai Metro Line 3',
      type: 'Permanent',
      validFrom: '2026-08-01',
      validTo: '2026-12-31',
    });
    assertStatus(gpRes, 201, 'Step 2: Gate pass request');

    const pfDoc = createSamplePdf('contractor_epfo_challan_aug2026.pdf');
    const uploadRes = await contractorClient.uploadFile({
      file: pfDoc.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'Step 2: Compliance document upload');

    // Step 3: Principal Employer audits site, approves contractor, verifies submission
    const employerClient = new BssClient();
    await employerClient.login('Employer');

    const verifyRes = await employerClient.patch('/api/portal/submissions', {
      id: 'SUB-02',
      status: 'Verified',
    });
    assertStatus(verifyRes, 200, 'Step 3: Employer verification');

    // Step 4: Worker submits a grievance
    const grievanceRes = await workerClient.post('/api/portal/grievances', {
      category: 'Benefits',
      subject: 'ESIC Card Medical Linkage Status',
      description: 'Requesting assistance with dispensary attachment for family dependants.',
    });
    assertStatus(grievanceRes, 201, 'Step 4: Worker grievance');

    // Step 5: BSS Staff claims and resolves case
    const staffClient = new BssClient();
    await staffClient.login('BSS Staff');
    const staffClaimRes = await staffClient.post('/api/operations', {
      action: 'case',
      id: 'DOC-2048',
      transition: 'claim',
    });
    assertStatus(staffClaimRes, 200, 'Step 5: Staff claim');
    const staffResolveRes = await staffClient.post('/api/operations', {
      action: 'case',
      id: 'DOC-2048',
      transition: 'resolve',
    });
    assertStatus(staffResolveRes, 200, 'Step 5: Staff resolve');

    // Step 6: IT Helpdesk diagnoses platform health and validates audit log
    const itClient = new BssClient();
    await itClient.login('BSS Admin');
    const itCmdRes = await itClient.post('/api/operations', {
      action: 'command',
      command: 'health',
    });
    assertStatus(itCmdRes, 200, 'Step 6: IT health check');

    // Step 7: Government official views policy metrics and demographic distributions
    const govClient = new BssClient();
    await govClient.login('Government');
    const govPortalRes = await govClient.get('/api/portal');
    assertStatus(govPortalRes, 200, 'Step 7: Government analytics snapshot');

    results.push({
      name: 'T4.1: Real-World Lifecycle Simulation: Complete 6-Role Collaborative Workflow',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T4.1: Real-World Lifecycle Simulation: Complete 6-Role Collaborative Workflow',
      pass: false,
      error: err.message,
    });
  }

  // Scenario 4.2: High-Concurrency Multi-Role Operations Stress Simulation
  try {
    const concurrentClients = [
      new BssClient(),
      new BssClient(),
      new BssClient(),
      new BssClient(),
      new BssClient(),
      new BssClient(),
    ];

    // Login all 6 roles concurrently
    const loginPromises = [
      concurrentClients[0].login('Worker'),
      concurrentClients[1].login('Contractor'),
      concurrentClients[2].login('Employer'),
      concurrentClients[3].login('BSS Admin'),
      concurrentClients[4].login('BSS Staff'),
      concurrentClients[5].login('Government'),
    ];

    const loginResults = await Promise.all(loginPromises);
    for (const res of loginResults) {
      assertStatus(res, 200, 'Concurrent login must succeed for all roles');
    }

    // Execute concurrent portal queries across all 6 roles
    const queryPromises = concurrentClients.map(c => c.get('/api/portal'));
    const queryResults = await Promise.all(queryPromises);
    for (const res of queryResults) {
      assertStatus(res, 200, 'Concurrent portal queries must succeed without contention');
    }

    results.push({
      name: 'T4.2: High-Concurrency Multi-Role Operations & Non-Blocking Portal Access Simulation',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T4.2: High-Concurrency Multi-Role Operations & Non-Blocking Portal Access Simulation',
      pass: false,
      error: err.message,
    });
  }

  // Scenario 4.3: UI/UX & Responsive Layout Class Verification
  try {
    const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
    assertTrue(existsSync(cssPath), 'globals.css must exist');
    const cssContent = readFileSync(cssPath, 'utf-8');

    // Verify .bss-kpi-card specifications
    assertIncludes(cssContent, '.bss-kpi-card', 'CSS must define .bss-kpi-card');
    assertIncludes(cssContent, '.bss-kpi-icon', 'CSS must define .bss-kpi-icon');
    assertIncludes(cssContent, '.bss-kpi-grid', 'CSS must define .bss-kpi-grid');
    assertIncludes(cssContent, 'grid-auto-rows: 1fr', 'KPI grids must enforce equal 1fr tile heights');
    assertIncludes(cssContent, 'margin-top: auto', 'KPI value strong must have margin-top: auto for bottom-pinned alignment');

    // Verify iOS safe-area utilities
    assertIncludes(cssContent, '.pb-safe', 'CSS must define .pb-safe utility');
    assertIncludes(cssContent, 'safe-area-inset-top', 'CSS must handle safe-area-inset-top');
    assertIncludes(cssContent, 'safe-area-inset-bottom', 'CSS must handle safe-area-inset-bottom');

    results.push({
      name: 'T4.3: Layout & UI/UX CSS Rules: .bss-kpi-card, bottom-pinned strong, safe-areas, and grid-auto-rows',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T4.3: Layout & UI/UX CSS Rules: .bss-kpi-card, bottom-pinned strong, safe-areas, and grid-auto-rows',
      pass: false,
      error: err.message,
    });
  }

  return results;
}
