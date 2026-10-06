import { Buffer } from 'node:buffer';

export class BssClient {
  constructor(baseUrl = process.env.BSS_TEST_BASE_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookies = new Map();
    this.session = null;
  }

  setCookie(header) {
    if (!header) return;
    const parts = header.split(';')[0].split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (value === '' || header.includes('Max-Age=0') || header.includes('Expires=Thu, 01 Jan 1970')) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clearCookies() {
    this.cookies.clear();
    this.session = null;
  }

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const maxRetries = options.retries ?? 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const headers = {
        Origin: this.baseUrl,
        'Sec-Fetch-Site': 'same-origin',
        ...options.headers,
      };

      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }

      const fetchOptions = {
        method: options.method || 'GET',
        headers,
        body: options.body,
        redirect: options.redirect || 'manual',
      };

      try {
        const res = await fetch(url, fetchOptions);

        if (typeof res.headers.getSetCookie === 'function') {
          for (const cookie of res.headers.getSetCookie()) {
            this.setCookie(cookie);
          }
        } else {
          const singleSetCookie = res.headers.get('set-cookie');
          if (singleSetCookie) {
            this.setCookie(singleSetCookie);
          }
        }

        let json = null;
        let text = null;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            json = await res.json();
          } catch {
            // ignore
          }
        } else {
          try {
            text = await res.text();
          } catch {
            // ignore
          }
        }

        // Retry if Next.js dev compiler had a transient manifest read race condition
        if (res.status === 500 && text && (text.includes('loadManifest') || text.includes('Unexpected end of JSON input')) && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        return {
          status: res.status,
          ok: res.ok,
          headers: res.headers,
          json,
          text,
          body: json ?? text,
        };
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        throw err;
      }
    }
  }

  async get(path, headers = {}) {
    return this.request(path, { method: 'GET', headers });
  }

  async post(path, body, headers = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const finalHeaders = { ...headers };
    if (!isFormData && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
    const finalBody = isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body));
    return this.request(path, { method: 'POST', body: finalBody, headers: finalHeaders });
  }

  async patch(path, body, headers = {}) {
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    const finalBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.request(path, { method: 'PATCH', body: finalBody, headers: finalHeaders });
  }

  async put(path, body, headers = {}) {
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    const finalBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.request(path, { method: 'PUT', body: finalBody, headers: finalHeaders });
  }

  async delete(path, headers = {}) {
    return this.request(path, { method: 'DELETE', headers });
  }

  async login(role, credentialOverride = {}) {
    const hasCustomCreds = Object.keys(credentialOverride).length > 0;

    // Reuse active session if client is already logged in as this role
    if (!hasCustomCreds && this.session && this.session.role === role && this.cookies.size > 0) {
      return {
        status: 200,
        ok: true,
        json: { authenticated: true, role, redirectTo: this.session.redirectTo },
        headers: new Headers(),
      };
    }

    const uniqueId = `test_${role.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const roleDefaults = {
      Worker: { method: 'otp', identifier: uniqueId, credential: '123456' },
      Contractor: { method: 'password', identifier: uniqueId, credential: '1234' },
      Employer: { method: 'password', identifier: uniqueId, credential: '1234' },
      'BSS Admin': { method: 'password', identifier: uniqueId, credential: '1234' },
      'BSS Staff': { method: 'password', identifier: uniqueId, credential: '1234' },
      Government: { method: 'password', identifier: uniqueId, credential: '1234' },
    };

    const creds = { ...roleDefaults[role], ...credentialOverride };
    const res = await this.post('/api/auth/session', {
      role,
      method: creds.method,
      identifier: creds.identifier,
      credential: creds.credential,
    });

    if (res.status === 200) {
      this.session = { role, identifier: creds.identifier, ...res.json };
    }
    return res;
  }

  async logout() {
    this.clearCookies();
  }

  async uploadFile({ file, type, site, period, employer }) {
    const form = new FormData();
    if (file) {
      form.append('file', file);
    }
    if (type !== undefined) form.append('type', type);
    if (site !== undefined) form.append('site', site);
    if (period !== undefined) form.append('period', period);
    if (employer !== undefined) form.append('employer', employer);

    return this.post('/api/portal/uploads', form);
  }
}
