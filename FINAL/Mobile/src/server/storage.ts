import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_CONTENT_LENGTH_BYTES = 11 * 1024 * 1024; // 11 MB

/**
 * Validates binary magic-byte headers for allowed file formats:
 * - PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
 * - JPEG: 0xFF, 0xD8, 0xFF
 * - PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
 */
export async function verifyFileSignature(file: File): Promise<{ valid: boolean; detectedMime: string | null }> {
  try {
    const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    // PDF check: %PDF-
    if (
      file.type === 'application/pdf' &&
      headerBytes[0] === 0x25 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x44 &&
      headerBytes[3] === 0x46 &&
      headerBytes[4] === 0x2d
    ) {
      return { valid: true, detectedMime: 'application/pdf' };
    }

    // JPEG check: 0xFF 0xD8 0xFF
    if (
      (file.type === 'image/jpeg' || file.type === 'image/jpg') &&
      headerBytes[0] === 0xff &&
      headerBytes[1] === 0xd8 &&
      headerBytes[2] === 0xff
    ) {
      return { valid: true, detectedMime: 'image/jpeg' };
    }

    // PNG check: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      file.type === 'image/png' &&
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47 &&
      headerBytes[4] === 0x0d &&
      headerBytes[5] === 0x0a &&
      headerBytes[6] === 0x1a &&
      headerBytes[7] === 0x0a
    ) {
      return { valid: true, detectedMime: 'image/png' };
    }

    return { valid: false, detectedMime: null };
  } catch {
    return { valid: false, detectedMime: null };
  }
}

/**
 * Sanitizes original filename to prevent path traversal and unsafe characters.
 */
export function sanitizeFileName(rawName: string): { safeDisplayName: string; safeExtension: string } {
  const base = path.basename(rawName).trim();
  const ext = path.extname(base).toLowerCase();
  const validExts: Record<string, string> = {
    '.pdf': '.pdf',
    '.jpg': '.jpg',
    '.jpeg': '.jpeg',
    '.png': '.png',
  };
  const safeExt = validExts[ext] ?? '.pdf';
  const nameWithoutExt = base.slice(0, base.length - ext.length);
  const safeStem =
    nameWithoutExt
      .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 120) || 'document';

  return {
    safeDisplayName: `${safeStem}${safeExt}`,
    safeExtension: safeExt,
  };
}

export function getUploadsBaseDirectory(): string {
  return process.env.BSS_UPLOADS_DIR ?? path.join(process.cwd(), '.data', 'uploads');
}

/**
 * Atomically writes file buffer to local disk storage with 0o700 directory and 0o600 file permissions.
 * Computes SHA-256 hash checksum.
 */
export async function saveUploadedFileToDisk(options: {
  file: File;
  role: string;
  uploadId: string;
  safeExtension: string;
}): Promise<{
  storagePath: string;
  checksumSha256: string;
  fileSizeBytes: number;
}> {
  const uploadsBase = getUploadsBaseDirectory();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const roleSegment = options.role.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'general';

  const targetDir = path.join(uploadsBase, roleSegment, year, month);
  const tmpDir = path.join(uploadsBase, 'tmp');

  await mkdir(targetDir, { recursive: true, mode: 0o700 });
  await mkdir(tmpDir, { recursive: true, mode: 0o700 });

  const finalFileName = `${options.uploadId}${options.safeExtension}`;
  const finalStoragePath = path.join(targetDir, finalFileName);
  const tmpStoragePath = path.join(tmpDir, `${options.uploadId}.${process.pid}.${Date.now()}.${randomUUID().slice(0, 6)}.tmp`);

  const arrayBuf = await options.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const hash = createHash('sha256').update(buffer).digest('hex');
  const checksumSha256 = `sha256:${hash}`;

  try {
    await writeFile(tmpStoragePath, buffer, { mode: 0o600 });
    await rename(tmpStoragePath, finalStoragePath);
  } catch (error) {
    await unlink(tmpStoragePath).catch(() => undefined);
    throw error;
  }

  return {
    storagePath: finalStoragePath,
    checksumSha256,
    fileSizeBytes: buffer.byteLength,
  };
}

/**
 * Resolves absolute storage path and verifies file exists.
 */
export async function getStorageFileStat(storagePath: string): Promise<{ absolutePath: string; size: number } | null> {
  try {
    const resolvedPath = path.isAbsolute(storagePath)
      ? storagePath
      : path.join(process.cwd(), storagePath);
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) return null;
    return { absolutePath: resolvedPath, size: fileStat.size };
  } catch {
    return null;
  }
}
