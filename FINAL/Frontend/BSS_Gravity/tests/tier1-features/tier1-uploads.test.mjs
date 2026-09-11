import { BssClient } from '../helpers/client.mjs';
import {
  assertEqual,
  assertStatus,
  assertDefined,
} from '../helpers/assertions.mjs';
import {
  createSamplePdf,
  createSampleJpeg,
  createSamplePng,
} from '../helpers/fixtures.mjs';

export async function runTier1UploadTests() {
  const results = [];
  const client = new BssClient();

  // Step 1: Login as Contractor
  await client.login('Contractor');

  // Test 1.7.1: Contractor Valid PDF Upload with %PDF- Magic Bytes
  let pdfUploadData = null;
  try {
    const sample = createSamplePdf('statutory_pf_ecr_challan.pdf');
    const uploadRes = await client.uploadFile({
      file: sample.file,
      type: 'PF Challan',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'PDF upload should return 201 Created');
    assertDefined(uploadRes.json.data, 'Upload response must include document row data');
    pdfUploadData = uploadRes.json.data;
    assertEqual(pdfUploadData.type, 'PF Challan', 'Uploaded type must match form input');
    assertEqual(pdfUploadData.period, '2026-07', 'Compliance period must match');
    assertEqual(pdfUploadData.site, 'Mumbai Metro Line 3', 'Site must match form input');
    results.push({ name: 'T1.7.1: Contractor valid PDF upload with %PDF- binary signature', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7.1: Contractor valid PDF upload with %PDF- binary signature', pass: false, error: err.message });
  }

  // Test 1.7.2: SHA-256 Checksum Integrity
  try {
    const sample = createSamplePdf('checksum_verification_doc.pdf');
    const uploadRes = await client.uploadFile({
      file: sample.file,
      type: 'Wage Register',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'Upload for checksum test');
    const returnedChecksum = uploadRes.json.data?.checksum;
    assertDefined(returnedChecksum, 'Response must include sha256 checksum');
    assertEqual(returnedChecksum, sample.checksum, 'Calculated sha256 checksum must match binary hash');
    results.push({ name: 'T1.7.2: Upload binary SHA-256 checksum calculation & integrity', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7.2: Upload binary SHA-256 checksum calculation & integrity', pass: false, error: err.message });
  }

  // Test 1.7.3: Contractor Valid PNG Upload with 0x89 PNG Magic Bytes
  try {
    const sample = createSamplePng('safety_audit_certificate.png');
    const uploadRes = await client.uploadFile({
      file: sample.file,
      type: 'Safety Audit',
      site: 'Mumbai Metro Line 3',
      period: '2026-07',
      employer: 'L&T Construction',
    });
    assertStatus(uploadRes, 201, 'PNG upload should return 201 Created');
    assertDefined(uploadRes.json.data, 'Upload response must include document row data');
    results.push({ name: 'T1.7.3: Contractor valid PNG upload with standard 0x89 PNG header', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7.3: Contractor valid PNG upload with standard 0x89 PNG header', pass: false, error: err.message });
  }

  // Switch to Worker session
  const workerClient = new BssClient();
  await workerClient.login('Worker');

  // Test 1.7.4: Worker Valid JPEG Upload with 0xFF 0xD8 0xFF Magic Bytes
  try {
    const sample = createSampleJpeg('worker_medical_fitness.jpg');
    const uploadRes = await workerClient.uploadFile({
      file: sample.file,
      type: 'Medical Certificate',
      site: 'Mumbai Metro Line 3',
      period: '2026-08',
    });
    assertStatus(uploadRes, 201, 'Worker JPEG upload should return 201 Created');
    assertDefined(uploadRes.json.data, 'Upload response must include document row data');
    results.push({ name: 'T1.7.4: Worker valid JPEG upload with standard 0xFF 0xD8 JPEG signature', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7.4: Worker valid JPEG upload with standard 0xFF 0xD8 JPEG signature', pass: false, error: err.message });
  }

  // Test 1.7.5: Worker Leave Attachment PDF Upload
  try {
    const sample = createSamplePdf('doctor_prescription_evidence.pdf');
    const uploadRes = await workerClient.uploadFile({
      file: sample.file,
      type: 'Leave evidence',
      site: 'Mumbai Metro Line 3',
      period: '2026-09',
    });
    assertStatus(uploadRes, 201, 'Leave evidence upload should return 201 Created');
    assertDefined(uploadRes.json.data?.id, 'Response must return document identifier');
    results.push({ name: 'T1.7.5: Worker leave attachment document upload', pass: true });
  } catch (err) {
    results.push({ name: 'T1.7.5: Worker leave attachment document upload', pass: false, error: err.message });
  }

  return results;
}
