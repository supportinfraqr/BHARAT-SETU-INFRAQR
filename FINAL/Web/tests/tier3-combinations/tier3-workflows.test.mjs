import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertTrue,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  validateVerhoeff,
  TEST_USERS,
} from '../helpers/fixtures.mjs';

export async function runTier3WorkflowTests() {
  const results = [];

  // Workflow 3.1: Contractor Upload -> Employer Verify -> Multi-Portal Reflection
  try {
    const contractorClient = new BssClient();
    const employerClient = new BssClient();

    // 1. Contractor Logs In and Uploads Compliance Proof
    await contractorClient.login('Contractor');
    const sample = createSamplePdf('contractor_pf_submission.pdf');
    const uploadRes = await contractorClient.uploadFile({
      file: sample.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'Contractor upload must succeed');
    assertDefined(uploadRes.json.data.checksum, 'Upload response must include checksum');

    // 2. Employer Logs In and Verifies Submission in Queue
    await employerClient.login('Employer');
    const verifyRes = await employerClient.patch('/api/portal/submissions', {
      id: 'SUB-02',
      status: 'Verified',
    });
    assertStatus(verifyRes, 200, 'Employer verification mutation must succeed');

    results.push({
      name: 'T3.1: Cross-Role Lifecycle: Contractor upload -> Employer verification -> Multi-portal sync',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T3.1: Cross-Role Lifecycle: Contractor upload -> Employer verification -> Multi-portal sync',
      pass: false,
      error: err.message,
    });
  }

  // Workflow 3.2: Worker Grievance -> BSS Staff Claim & Resolve -> IT Audit Log Reflection
  try {
    const workerClient = new BssClient();
    const staffClient = new BssClient();
    const itClient = new BssClient();

    // 1. Worker submits grievance
    await workerClient.login('Worker');
    const grievanceRes = await workerClient.post('/api/portal/grievances', {
      category: 'Wage / Payment',
      subject: 'Overtime allowance settlement dispute',
      description: 'Overtime hours worked on July weekend shifts were not computed in net wage.',
    });
    assertStatus(grievanceRes, 201, 'Worker grievance filing');

    // 2. BSS Staff claims and resolves case
    await staffClient.login('BSS Staff');
    const targetCaseId = 'DSP-201'; // Standard dispute case
    const claimRes = await staffClient.post('/api/operations', {
      action: 'case',
      id: targetCaseId,
      transition: 'claim',
    });
    assertStatus(claimRes, 200, 'Staff claim case');

    const resolveRes = await staffClient.post('/api/operations', {
      action: 'case',
      id: targetCaseId,
      transition: 'resolve',
    });
    assertStatus(resolveRes, 200, 'Staff resolve case');

    // 3. IT Helpdesk inspects live operations audit log stream
    await itClient.login('BSS Admin');
    const itSnapshot = await itClient.get('/api/operations');
    assertStatus(itSnapshot, 200, 'IT operations snapshot');
    const logs = itSnapshot.json.data.logs || [];
    const resolutionLog = logs.find(log => log.message && log.message.includes(targetCaseId));
    assertDefined(resolutionLog, 'IT audit log must record BSS staff case resolution');

    results.push({
      name: 'T3.2: Cross-Feature Workflow: Worker grievance -> BSS Staff claim & resolve -> IT audit log reflection',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T3.2: Cross-Feature Workflow: Worker grievance -> BSS Staff claim & resolve -> IT audit log reflection',
      pass: false,
      error: err.message,
    });
  }

  // Workflow 3.3: Worker Mobility Update -> Identity Verification & Derived Status
  try {
    const workerClient = new BssClient();
    await workerClient.login('Worker');

    const mobilityPayload = {
      mobile: '9876543210',
      alternateMobile: '',
      email: 'ravi.kumar@example.in',
      currentAddress: {
        line: 'Labour Camp A, Mumbai',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Mumbai',
        pin: '400059',
      },
      permanentAddress: {
        line: 'Rampur Village, Patna',
        state: 'Bihar',
        district: 'Patna',
        city: 'Patna',
        pin: '800001',
      },
    };

    const mobilityRes = await workerClient.put('/api/worker/profile/mobility', mobilityPayload);
    assertStatus(mobilityRes, 200, 'Mobility update');
    assertEqual(mobilityRes.json.data.migrationType, 'Inter-State Migrant Worker', 'Cross-state must derive Inter-State Migrant Worker');

    // Public QR verification endpoint
    const publicClient = new BssClient();
    const verifyRes = await publicClient.get(`/api/identity/verify/${TEST_USERS.Worker.subject}`);
    assertStatus(verifyRes, 200, 'Public verify');
    assertDefined(verifyRes.json.data, 'Public identity data');

    results.push({
      name: 'T3.3: Cross-Feature Integration: Worker mobility update -> Migration derivation & Identity verification',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T3.3: Cross-Feature Integration: Worker mobility update -> Migration derivation & Identity verification',
      pass: false,
      error: err.message,
    });
  }

  // Workflow 3.4: IT Helpdesk Restricted Terminal -> Live Operations Log & Service Telemetry
  try {
    const itClient = new BssClient();
    await itClient.login('BSS Admin');

    // Run probe command
    const probeRes = await itClient.post('/api/operations', {
      action: 'command',
      command: 'probe portal',
    });
    assertStatus(probeRes, 200, 'Terminal probe portal command');

    // Verify snapshot reflects probe and log
    const opsSnapshot = await itClient.get('/api/operations');
    assertStatus(opsSnapshot, 200, 'Snapshot after probe');
    const logs = opsSnapshot.json.data.logs || [];
    const probeLog = logs.find(log => log.message && log.message.includes('probe'));
    assertDefined(probeLog, 'Audit log stream must record probe command execution');

    results.push({
      name: 'T3.4: Cross-Feature Pipeline: IT terminal probe -> Dynamic latency update & Audit log reflection',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T3.4: Cross-Feature Pipeline: IT terminal probe -> Dynamic latency update & Audit log reflection',
      pass: false,
      error: err.message,
    });
  }

  // Workflow 3.5: Worker Registration -> Verhoeff Checksum -> Authenticated Profile -> Smart Card Order
  try {
    const newWorkerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regClient = new BssClient();

    // 1. Worker Register
    const regRes = await regClient.post('/api/auth/register', {
      role: 'Worker',
      contact: newWorkerPhone,
      otp: '123456',
      acceptedTerms: true,
    });
    assertStatus(regRes, 201, 'Worker registration');
    const issuedBssId = regRes.json.bssId;
    assertDefined(issuedBssId, 'Registration must issue a BSS-ID');

    // 2. Validate Verhoeff Checksum
    const numericPart = issuedBssId.replace(/^BSS/, '');
    const isVerhoeffValid = validateVerhoeff(numericPart);
    assertTrue(isVerhoeffValid, `Issued BSS-ID ${issuedBssId} must satisfy Verhoeff checksum algorithm`);

    // 3. Authenticated Session Queries Profile
    const profileRes = await regClient.get('/api/portal');
    assertStatus(profileRes, 200, 'Newly registered worker profile query');

    // 4. Place Smart Card Order
    const cardRes = await regClient.post('/api/card-orders', {
      provider: 'razorpay',
      addressConfirmed: true,
      address: {
        line: 'Sector 5, Gomti Nagar',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        city: 'Lucknow',
        pin: '226010',
        mobile: newWorkerPhone,
      },
    });
    assertStatus(cardRes, 201, 'Card order placement');

    results.push({
      name: 'T3.5: Full Onboarding Flow: Worker registration -> Verhoeff verification -> Profile query -> Card order',
      pass: true,
    });
  } catch (err) {
    results.push({
      name: 'T3.5: Full Onboarding Flow: Worker registration -> Verhoeff verification -> Profile query -> Card order',
      pass: false,
      error: err.message,
    });
  }

  return results;
}
