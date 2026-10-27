/**
 * Browser client for the payroll engine (proxied by /api/payroll-engine/*).
 *
 * Every endpoint path is the legacy payroll path (e.g. `getCompliance`,
 * `fullAndFinal/:id/calculate`). Responses use the legacy envelope
 * `{ status, success, message, data }`; `request()` unwraps it and throws a
 * `PayrollApiError` carrying the engine's message on failure.
 */

export type Envelope<T> = { status: boolean | number; success: boolean; message: string; data: T };

export class PayrollApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) { super(message); }
}

type Query = Record<string, string | number | boolean | null | undefined>;

let activeOrg: string | null = null;

/** BSS admins act on one contractor/employer org at a time (sent as X-Payroll-Org). */
export function setPayrollOrg(orgId: string | null): void { activeOrg = orgId; }
export function getPayrollOrg(): string | null { return activeOrg; }

function buildUrl(path: string, query?: Query): string {
  const clean = path.replace(/^\/+/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return `/api/payroll-engine/${clean}${qs ? `?${qs}` : ''}`;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { Accept: 'application/json', ...(extra ?? {}) };
  if (activeOrg) out['X-Payroll-Org'] = activeOrg;
  return out;
}

async function parse<T>(response: Response): Promise<Envelope<T>> {
  const type = response.headers.get('content-type') ?? '';
  const body: unknown = type.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
  if (!response.ok) {
    const record = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const message = (typeof record.message === 'string' && record.message) || (typeof record.error === 'string' && record.error)
      || (typeof body === 'string' && body.trim() && !/^</.test(body.trim()) ? body.trim() : '') || `Request failed (${response.status})`;
    if (response.status === 401 && record.reauth) window.location.href = '/login';
    throw new PayrollApiError(message, response.status, body);
  }
  if (body && typeof body === 'object' && 'success' in (body as object)) {
    const env = body as Envelope<T>;
    if (env.success === false) throw new PayrollApiError(env.message || 'Request failed', response.status, body);
    return env;
  }
  return { status: true, success: true, message: '', data: body as T };
}

export async function request<T = unknown>(method: string, path: string, options: { query?: Query; body?: unknown } = {}): Promise<Envelope<T>> {
  const init: RequestInit = { method, headers: headers(), cache: 'no-store', credentials: 'same-origin' };
  if (options.body !== undefined) {
    init.headers = headers({ 'Content-Type': 'application/json' });
    init.body = JSON.stringify(options.body);
  }
  return parse<T>(await fetch(buildUrl(path, options.query), init));
}

export const pe = {
  get: <T = unknown>(path: string, query?: Query) => request<T>('GET', path, { query }).then(r => r.data),
  post: <T = unknown>(path: string, body: unknown = {}, query?: Query) => request<T>('POST', path, { body, query }).then(r => r.data),
  put: <T = unknown>(path: string, body: unknown = {}, query?: Query) => request<T>('PUT', path, { body, query }).then(r => r.data),
  del: <T = unknown>(path: string, query?: Query, body?: unknown) => request<T>('DELETE', path, { query, body }).then(r => r.data),
  /** Full envelope (when the screen needs `message` too). */
  raw: request,
  /** Multipart upload — `form` may carry several files under the legacy field names. */
  async upload<T = unknown>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST', query?: Query): Promise<Envelope<T>> {
    return parse<T>(await fetch(buildUrl(path, query), { method, body: form, headers: headers(), cache: 'no-store', credentials: 'same-origin' }));
  },
  /** Download a binary (PDF / Excel / bank file) and hand it to the browser. */
  async download(path: string, query?: Query, fallbackName = 'download'): Promise<void> {
    const response = await fetch(buildUrl(path, query), { headers: headers({ Accept: '*/*' }), cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) { await parse(response); return; }
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('application/json')) {
      // Some legacy endpoints return file content inside JSON (e.g. bank file text).
      const env = await parse<{ content?: string; fileName?: string; mimeType?: string }>(response);
      const data = env.data ?? {};
      if (typeof data.content !== 'string') throw new PayrollApiError(env.message || 'No file content returned', 500, env);
      saveBlob(new Blob([data.content], { type: data.mimeType || 'text/plain' }), data.fileName || fallbackName);
      return;
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    saveBlob(await response.blob(), match ? decodeURIComponent(match[1]) : fallbackName);
  },
  /** Open a PDF in a new tab (payslip preview). */
  async open(path: string, query?: Query): Promise<void> {
    const response = await fetch(buildUrl(path, query), { headers: headers({ Accept: '*/*' }), cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) { await parse(response); return; }
    const url = URL.createObjectURL(await response.blob());
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  fileUrl: (url: string) => url.replace(/^\/v1\/payroll-engine\//, '/api/payroll-engine/'),
};

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
