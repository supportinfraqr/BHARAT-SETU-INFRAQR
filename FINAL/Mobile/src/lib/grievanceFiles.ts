// Grievance files (audio / attachments) are never exposed as stable URLs. The
// client asks for a single-use, 5-minute token, then reads the file once via
// /api/grievances/file/<token>. A copied URL expires after one read.
export type GrievanceFileKind = 'audio' | 'attachment';

async function issueTokenUrl(grievanceId: string, kind: GrievanceFileKind, responseId?: string): Promise<string> {
  const response = await fetch(`/api/grievances/${grievanceId}/file-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, responseId }),
  });
  const result = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!response.ok || !result.token) throw new Error(result.error || 'A secure link could not be created.');
  return `/api/grievances/file/${encodeURIComponent(result.token)}`;
}

/** One request → blob → object URL. Used for <audio> (a single-use token would
 *  break the range requests an <audio> element normally makes). */
export async function grievanceFileBlobUrl(grievanceId: string, kind: GrievanceFileKind, responseId?: string): Promise<{ url: string; revoke: () => void }> {
  const tokenUrl = await issueTokenUrl(grievanceId, kind, responseId);
  const response = await fetch(tokenUrl);
  if (!response.ok) throw new Error('The file could not be retrieved.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

/** Single GET read → Blob URL → window.open in a new tab. */
export async function openGrievanceFileInNewTab(grievanceId: string, kind: GrievanceFileKind, responseId?: string): Promise<void> {
  const { url } = await grievanceFileBlobUrl(grievanceId, kind, responseId);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    // If popups blocked, fallback to trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.click();
  }
}

/** Single GET download (consumes the token). */
export async function downloadGrievanceFile(grievanceId: string, kind: GrievanceFileKind, responseId?: string): Promise<void> {
  const tokenUrl = await issueTokenUrl(grievanceId, kind, responseId);
  const anchor = document.createElement('a');
  anchor.href = tokenUrl;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
