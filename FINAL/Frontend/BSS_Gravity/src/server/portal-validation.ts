import 'server-only';

import type { PortalRole } from '@/types/portal';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const bssId = /^(?:BSS-W[A-Z0-9]{10,11}|BSS\d{12})$/;
const contractorBssId = /^(?:BSS-C[A-Z0-9]{10,11}|BSSC\d{12})$/;

function fail(message: string): never {
  throw Object.assign(new Error(message), { status: 422 });
}

function requiredString(body: Record<string, unknown>, key: string, max = 500): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${key} is invalid.`);
  return value.trim();
}

/** Accepts a string or a numeric id and returns it as a bounded string. */
function requiredId(body: Record<string, unknown>, key: string, max = 40): string {
  const value = body[key];
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value)
    : typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) fail(`${key} is invalid.`);
  return text;
}

function assertBounded(value: unknown, depth = 0): void {
  if (depth > 8) fail('Request data is too deeply nested.');
  if (typeof value === 'string' && value.length > 10_000) fail('A request field is too long.');
  if (typeof value === 'number' && !Number.isFinite(value)) fail('A numeric field is invalid.');
  if (Array.isArray(value)) {
    if (value.length > 500) fail('A request list is too large.');
    value.forEach((entry) => assertBounded(entry, depth + 1));
  } else if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 100) fail('The request contains too many fields.');
    for (const [key, entry] of entries) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('The request contains an unsafe field.');
      assertBounded(entry, depth + 1);
    }
  }
}

export function validatePortalMutation(role: PortalRole, resource: string, method: string, body?: Record<string, unknown>): void {
  if (!body) return;
  assertBounded(body);

  if (resource === 'availability' && typeof body.available !== 'boolean') fail('available must be true or false.');
  if (resource === 'applications' && method === 'PATCH') {
    requiredString(body, 'id', 120);
    const allowed = role === 'Worker' ? ['Accepted', 'Rejected'] : ['Shortlisted', 'Hired', 'Rejected'];
    if (!allowed.includes(String(body.status))) fail('The requested application status is not allowed.');
  }
  if (resource === 'leave' && method === 'POST' && role === 'Worker') {
    requiredString(body, 'type', 120);
    const from = requiredString(body, 'from', 10);
    const to = requiredString(body, 'to', 10);
    if (!isoDate.test(from) || !isoDate.test(to) || from > to) fail('Enter a valid leave date range.');
  }
  if (role === 'Contractor' && resource === 'leave' && method === 'PATCH') {
    requiredString(body, 'id', 40);
    if (!['Approved', 'Rejected'].includes(String(body.status))) fail('Select a valid leave decision.');
  }
  if (role === 'Worker' && resource === 'courses' && method === 'POST') {
    requiredString(body, 'courseId', 40);
    if (!['complete-lesson', 'submit-assignment'].includes(String(body.action ?? '').toLowerCase())) fail('Unsupported course action.');
  }
  if (role === 'Contractor' && resource === 'worker-compliance' && method !== 'DELETE') {
    requiredString(body, 'workerId', 20);
  }
  if (role === 'Contractor' && resource === 'worker-site' && method !== 'DELETE') {
    requiredId(body, 'bindingId');
    requiredId(body, 'siteId');
  }
  if ((role === 'Contractor' || role === 'Employer') && resource === 'grievances' && method !== 'DELETE') {
    requiredString(body, 'id', 40);
    const gAction = String(body.action ?? '').toLowerCase();
    if (!['reply', 'resolve', 'reopen', 'view'].includes(gAction)) fail('Unsupported grievance action.');
    if (gAction === 'reply') requiredString(body, 'body', 2_000);
  }
  if (role === 'Worker' && resource === 'grievances' && method === 'PATCH') {
    requiredString(body, 'id', 40);
    const gAction = String(body.action ?? '').toLowerCase();
    if (!['reply', 'confirm', 'reopen'].includes(gAction)) fail('Unsupported grievance action.');
    if (gAction === 'reply') requiredString(body, 'body', 2_000);
  }
  if (role === 'Worker' && resource === 'gratuity' && method === 'POST') {
    if (body.reason !== undefined) requiredString(body, 'reason', 500);
  }
  if (role === 'Contractor' && resource === 'benefits' && method !== 'DELETE') {
    if (Array.isArray(body.bulk)) {
      if (!body.bulk.length || body.bulk.length > 500) fail('Provide between 1 and 500 benefit records.');
    } else {
      requiredString(body, 'workerId', 20);
    }
  }
  if (resource === 'advances' && method !== 'DELETE') {
    const advanceAction = requiredString(body, 'action', 30).toLowerCase();
    if (advanceAction === 'request') {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) fail('Enter a valid advance amount.');
    }
    if (advanceAction !== 'request') requiredString(body, 'id', 40);
  }
  if (role === 'Contractor' && resource === 'site-calendar' && method !== 'DELETE') {
    const kind = String(body.kind ?? 'holiday').toLowerCase();
    if (kind === 'leavepolicy') {
      requiredString(body, 'leaveType', 80);
    } else if (kind === 'restrictedpolicy' || kind === 'rhpolicy') {
      // Restricted Holiday policy carries only numeric allotment / maxAvail.
    } else if (kind === 'copy' || kind === 'copytosites') {
      // Copy setup to other sites carries only siteId / targetSiteIds.
    } else if (kind === 'weeklyoff') {
      // Weekly off carries only a list of day codes.
    } else {
      requiredString(body, 'name', 120);
      if (!isoDate.test(requiredString(body, 'date', 10))) fail('Enter a valid holiday date.');
    }
  }
  if (resource === 'workers' && method === 'POST') {
    const rows = Array.isArray(body.bulk) ? body.bulk : [body];
    if (!rows.length || rows.length > 500) fail('Provide between 1 and 500 worker records.');
    rows.forEach(row => {
      if (!bssId.test(requiredString(row as Record<string, unknown>, 'bssId', 15))) fail('Enter a valid worker BSS ID.');
      requiredString(row as Record<string, unknown>, 'site'); requiredString(row as Record<string, unknown>, 'employer'); requiredString(row as Record<string, unknown>, 'designation');
    });
  }
  if (resource === 'compliances' && method === 'POST') {
    const kind = String(body.kind ?? '').toLowerCase();
    // Register-batch generation carries only period/site metadata.
    if (!['generatebatch', 'generate-batch', 'clra', 'register', 'submit', 'finalsubmit', 'final-submit'].includes(kind)) {
      const rows = Array.isArray(body.bulk) ? body.bulk : [body];
      if (!rows.length || rows.length > 500) fail('Provide between 1 and 500 compliance records.');
      rows.forEach(row => {
        const r = row as Record<string, unknown>;
        requiredString(r, 'item'); requiredString(r, 'site');
        const issue = requiredString(r, 'issue', 10); const expiry = requiredString(r, 'expiry', 10);
        if (!isoDate.test(issue) || !isoDate.test(expiry) || issue > expiry) fail('Enter a valid compliance date range.');
      });
    }
  }
  if (resource === 'salaries' && method === 'POST') {
    const rows = Array.isArray(body.bulk) ? body.bulk : [body];
    if (!rows.length || rows.length > 500) fail('Provide between 1 and 500 salary records.');
    rows.forEach(row => {
      const r = row as Record<string, unknown>;
      if (!bssId.test(requiredString(r, 'workerId', 15))) fail('Enter a valid worker BSS ID.');
      requiredString(r, 'worker', 200); requiredString(r, 'site'); requiredString(r, 'period', 80); requiredString(r, 'paidOn', 10);
      if (typeof r.gross !== 'number' || r.gross < 0 || r.gross > 1_000_000_000) fail('Enter a valid gross wage.');
      if (typeof r.deductions !== 'number' || r.deductions < 0 || r.deductions > 1_000_000_000) fail('Enter valid deductions.');
      if (typeof r.net !== 'number' || r.net < 0 || r.net > 1_000_000_000) fail('Enter a valid net wage.');
    });
  }
  if (resource === 'gate-passes') {
    if (method === 'PATCH') {
      const editsDates = body.validFrom !== undefined || body.validTo !== undefined;
      const togglesBlock = body.blocked !== undefined;
      if (togglesBlock) {
        requiredString(body, 'workerId', 20);
        if (typeof body.blocked !== 'boolean') fail('Blocked must be true or false.');
      } else if (editsDates) {
        requiredString(body, 'id', 120);
        for (const key of ['validFrom', 'validTo']) {
          const value = body[key];
          if (value !== undefined && value !== null && value !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            fail('Dates must be in YYYY-MM-DD format.');
          }
        }
      } else {
        if (role === 'Employer') {
          if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100
            || body.ids.some(id => (typeof id !== 'string' && typeof id !== 'number') || !String(id).trim())) {
            fail('Select one or more valid gate passes.');
          }
        } else {
          requiredString(body, 'id', 120);
        }
        if (!['Approved', 'Rejected'].includes(String(body.status))) fail('The requested gate-pass status is not allowed.');
      }
    } else if (method === 'POST') {
      const check = (row: Record<string, unknown>) => {
        if (!bssId.test(String(row.workerId ?? ''))) fail('Enter a valid worker BSS ID.');
        if (!['Temporary', 'Permanent'].includes(String(row.type))) fail('Select a valid gate-pass type.');
      };
      if (Array.isArray(body.bulk)) {
        if (!body.bulk.length || body.bulk.length > 500) fail('Select one or more workers.');
        body.bulk.forEach(row => check((row ?? {}) as Record<string, unknown>));
      } else {
        check(body as Record<string, unknown>);
      }
    }
  }
  if (resource === 'benefits' && method === 'POST') {
    const rows = Array.isArray(body.bulk) ? body.bulk : [body];
    if (!rows.length || rows.length > 500) fail('Provide between 1 and 500 bonus or leave encashment records.');
    rows.forEach(row => {
      if (typeof row !== 'object' || row === null) fail('Each benefits row must be an object.');
      const r = row as Record<string, unknown>;
      if (!bssId.test(requiredString(r, 'workerId', 15))) fail('Enter a valid worker BSS ID.');
      requiredString(r, 'worker', 200);
      requiredString(r, 'period', 80);
      requiredString(r, 'paidOn', 10);
      if (typeof r.amount !== 'number' || r.amount < 0 || r.amount > 1_000_000_000) fail('Enter a valid benefit amount.');
      if (typeof r.days !== 'undefined' && (typeof r.days !== 'number' || r.days < 0 || r.days > 365)) fail('Enter a valid leave encashment day count.');
    });
  }
  if (resource === 'job-postings' && method === 'POST') {
    // Drafts may be incomplete; only a published posting must be fully specified.
    if (String(body.status ?? '').toLowerCase() !== 'draft') {
      requiredString(body, 'title'); requiredString(body, 'trade'); requiredString(body, 'site');
      const vacancies = Number(body.vacancies); const wage = Number(body.monthlyWage ?? body.wage);
      if (!Number.isInteger(vacancies) || vacancies < 1 || vacancies > 100_000 || !Number.isFinite(wage) || wage <= 0) fail('Enter valid vacancy and wage values.');
    }
  }
  if (role === 'Contractor' && resource === 'attendance' && method === 'POST') {
    if (!bssId.test(requiredString(body, 'bssId', 20))) fail('Enter a valid worker BSS ID.');
  }
  if (role === 'Employer' && resource === 'contractors' && method === 'POST') {
    requiredString(body, 'name', 200);
    if (!contractorBssId.test(requiredString(body, 'bssId', 16))) fail('Enter a valid contractor BSS ID.');
    requiredString(body, 'contact', 30);
    requiredString(body, 'email', 254);
    requiredString(body, 'siteId', 120);
  }
  if (role === 'Employer' && resource === 'sites' && method === 'POST') {
    requiredString(body, 'name', 200);
    requiredString(body, 'code', 40);
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    if (location.length > 200 || state.length > 120) fail('Site location is too long.');
    const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate.trim() : '';
    if (startDate && !isoDate.test(startDate)) fail('Enter a valid start date.');
    if (endDate && !isoDate.test(endDate)) fail('Enter a valid end date.');
    if (startDate && endDate && startDate > endDate) fail('End date cannot be before the start date.');
    if (body.status && !['Active', 'Planned'].includes(String(body.status))) fail('Select a valid site status.');
  }
  if (role === 'Employer' && resource === 'approvals' && method === 'PATCH') {
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some(id => typeof id !== 'string' || !id.trim())) {
      fail('Select one or more valid approval requests.');
    }
    if (!['Approved', 'Rejected'].includes(String(body.status))) fail('Select a valid approval action.');
  }
  if (role === 'Employer' && resource === 'submissions' && method === 'PATCH') {
    requiredString(body, 'id', 120);
    if (!['Verified', 'Rejected', 'Returned'].includes(String(body.status))) fail('Select a valid submission decision.');
  }
  if (role === 'Worker' && resource === 'restricted-holiday' && method === 'POST') {
    if (!isoDate.test(requiredString(body, 'holidayDate', 10))) fail('Choose a valid restricted holiday date.');
  }
  if (role === 'Contractor' && resource === 'restricted-holiday' && method === 'PATCH') {
    requiredString(body, 'id', 40);
    if (!['Approved', 'Rejected'].includes(String(body.status))) fail('Select a valid decision.');
  }
  if ((role === 'Contractor' || role === 'Employer') && resource === 'licences') {
    const kinds = ['EPFO','ESIC','SHOPS_EST','FACTORY','CLRA','BOCW','PT','LWF','APPRENTICE','OTHER'];
    if (method === 'POST') {
      if (!kinds.includes(requiredString(body, 'kind', 40).toUpperCase())) fail('Select a valid registration kind.');
      if (typeof body.number !== 'undefined' && String(body.number).length > 80) fail('Registration number is too long.');
      if (typeof body.authority !== 'undefined' && String(body.authority).length > 120) fail('Authority is too long.');
    }
    if (method === 'PATCH' || method === 'DELETE') requiredString(body, 'id', 60);
    for (const key of ['issuedAt', 'expiryAt']) {
      if (body[key] !== undefined && body[key] !== '' && !isoDate.test(String(body[key]))) fail(`Enter a valid ${key === 'issuedAt' ? 'issue' : 'expiry'} date.`);
    }
  }
}
