import { createHash } from 'node:crypto';

// --- Verhoeff Algorithm Tables ---
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const invTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function calcVerhoeff(numStr) {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = dTable[c][pTable[(i + 1) % 8][digits[i]]];
  }
  return invTable[c];
}

export function validateVerhoeff(numStr) {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = dTable[c][pTable[i % 8][digits[i]]];
  }
  return c === 0;
}

export function generateValidBssId(prefix = 'BSS', length = 12) {
  // Generates 11 random digits + 1 Verhoeff check digit = 12 digits (prefixed by BSS)
  let raw = '';
  for (let i = 0; i < length - 1; i++) {
    raw += Math.floor(Math.random() * 10).toString();
  }
  const checkDigit = calcVerhoeff(raw);
  return `${prefix}${raw}${checkDigit}`;
}

// --- Binary File Generators ---

/**
 * Creates a valid minimal PDF buffer with standard magic bytes `%PDF-` (0x25, 0x50, 0x44, 0x46, 0x2D)
 */
export function createSamplePdf(name = 'sample_compliance_document.pdf') {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 712 Td (Bharat Shram Setu Compliance Proof) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`;
  const buffer = Buffer.from(content, 'utf-8');
  const file = new File([buffer], name, { type: 'application/pdf' });
  const hash = createHash('sha256').update(buffer).digest('hex');
  return { file, buffer, hash, checksum: `sha256:${hash}`, name, mime: 'application/pdf' };
}

/**
 * Creates a valid minimal JPEG buffer with standard magic bytes (0xFF, 0xD8, 0xFF)
 */
export function createSampleJpeg(name = 'worker_photo.jpg') {
  // Minimal valid JPEG binary structure
  const header = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00];
  const body = new Array(64).fill(0xAA);
  const trailer = [0xFF, 0xD9];
  const buffer = Buffer.from([...header, ...body, ...trailer]);
  const file = new File([buffer], name, { type: 'image/jpeg' });
  const hash = createHash('sha256').update(buffer).digest('hex');
  return { file, buffer, hash, checksum: `sha256:${hash}`, name, mime: 'image/jpeg' };
}

/**
 * Creates a valid minimal PNG buffer with standard magic bytes (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
 */
export function createSamplePng(name = 'aadhaar_card_front.png') {
  const header = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG signature
  // IHDR chunk (13 bytes data)
  const ihdr = [
    0x00, 0x00, 0x00, 0x0D, // Length: 13
    0x49, 0x48, 0x44, 0x52, // Chunk type: IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth 8, ColorType 6 (RGBA)
    0x1F, 0x15, 0xC4, 0x89  // CRC
  ];
  // IEND chunk (0 bytes data)
  const iend = [
    0x00, 0x00, 0x00, 0x00, // Length: 0
    0x49, 0x45, 0x4E, 0x44, // Chunk type: IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ];
  const buffer = Buffer.from([...header, ...ihdr, ...iend]);
  const file = new File([buffer], name, { type: 'image/png' });
  const hash = createHash('sha256').update(buffer).digest('hex');
  return { file, buffer, hash, checksum: `sha256:${hash}`, name, mime: 'image/png' };
}

/**
 * Creates a corrupt PDF (named .pdf and MIME application/pdf, but contains non-PDF bytes)
 */
export function createCorruptPdf(name = 'corrupt_fake_doc.pdf') {
  const fakeContent = 'This is plain text pretending to be a PDF file without valid %PDF- magic bytes.';
  const buffer = Buffer.from(fakeContent, 'utf-8');
  const file = new File([buffer], name, { type: 'application/pdf' });
  return { file, buffer, name, mime: 'application/pdf' };
}

/**
 * Creates an oversized buffer (e.g. 10.5 MB) to trigger 413 Payload Too Large
 */
export function createOversizedPdf(name = 'huge_oversized_evidence.pdf', sizeBytes = 10.5 * 1024 * 1024) {
  const header = Buffer.from('%PDF-1.4\n%Oversized payload for security limit testing\n', 'utf-8');
  const fill = Buffer.alloc(Math.ceil(sizeBytes - header.length), 0x20);
  const buffer = Buffer.concat([header, fill]);
  const file = new File([buffer], name, { type: 'application/pdf' });
  return { file, buffer, name, mime: 'application/pdf', size: buffer.length };
}

/**
 * Creates a file with an illegal extension / MIME type (e.g., .exe or .sh)
 */
export function createDisallowedExecutable(name = 'malicious_script.sh') {
  const buffer = Buffer.from('#!/bin/bash\necho "exploit"', 'utf-8');
  const file = new File([buffer], name, { type: 'application/x-sh' });
  return { file, buffer, name, mime: 'application/x-sh' };
}

// --- Standard Role Test Identities ---
export const TEST_USERS = {
  Worker: {
    role: 'Worker',
    subject: 'BSS234567890124',
    name: 'Ravi Kumar',
    mobile: '9876543210',
    otp: '123456',
  },
  Contractor: {
    role: 'Contractor',
    subject: 'BSSC198200000001',
    company: 'Apex Infrastructure Pvt Ltd',
    identifier: 'BSSC198200000001',
    password: '1234',
  },
  Employer: {
    role: 'Employer',
    subject: 'BSSE100210000001',
    company: 'L&T Construction',
    identifier: 'BSSE100210000001',
    password: '1234',
  },
  ItHelpDesk: {
    role: 'BSS Admin',
    subject: 'BSSIT2026HDK00001',
    identifier: 'BSSIT2026HDK00001',
    password: '1234',
  },
  BssStaff: {
    role: 'BSS Staff',
    subject: 'BSSST2026STF00001',
    identifier: 'BSSST2026STF00001',
    password: '1234',
  },
  Government: {
    role: 'Government',
    subject: 'BSSGOV2026ADM00001',
    identifier: 'BSSGOV2026ADM00001',
    password: '1234',
  },
};
