/**
 * api.js — every call the website admin makes (2026-10-07).
 *
 * The same gateway, sign-in and encrypted tunnel as the main admin panel
 * (lib/secure.js is the same file): the Network tab shows ciphertext only. The
 * token is kept under its own key, and cleared the moment the gateway says the
 * session has ended.
 */

import { available as secureAvailable, secureCall, secureStream } from './secure';

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const P = `${BASE}/admin/api`;
const KEY = 'gaadipe.webadmin.token';

export const getToken = () => { try { return localStorage.getItem(KEY) || null; } catch { return null; } };
export const setToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* private mode */ }
};

const listeners = new Set();
export const onSignedOut = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const signedOut = () => { setToken(null); listeners.forEach((fn) => fn()); };

export class ApiError extends Error {
  constructor(message, { code = 'error', status = 0, body = null } = {}) {
    super(message);
    this.code = code; this.status = status; this.body = body;
  }
}

async function call(path, { method = 'GET', body, auth = true, quiet = false, timeoutMs = 25000 } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  // Auto-refreshes say so: the server does not audit them again.
  if (quiet) headers['X-Refresh'] = '1';
  let status; let ok; let data;
  try {
    if (secureAvailable()) {
      const out = await secureCall(P, { method, path, body, headers, timeoutMs });
      ({ status, ok } = out); data = out.data || {};
    } else {
      const res = await fetch(`${P}${path}`, {
        method, headers: { ...headers, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
      });
      ({ status, ok } = res); data = await res.json().catch(() => ({}));
    }
  } catch (e) {
    throw new ApiError(e.name === 'TimeoutError' ? 'The server is taking too long to answer.' : 'Cannot reach the server.', { code: 'offline' });
  }
  if (status === 401 && auth) {
    signedOut();
    throw new ApiError(data.message || 'Your session has ended. Please sign in again.', { code: 'signed_out', status });
  }
  if (!ok) throw new ApiError(data.message || 'Something went wrong.', { code: data.error || 'error', status, body: data });
  return data;
}

/**
 * The live stream (lib/live.jsx). Encrypted where the browser can (HTTPS or
 * localhost); returns false where it cannot, and the caller falls back to polling.
 */
export async function stream({ onMessage, signal }) {
  if (!secureAvailable()) return false;
  const token = getToken();
  try {
    await secureStream(P, { headers: token ? { Authorization: `Bearer ${token}` } : {}, onMessage, signal });
  } catch (e) {
    if (e.status === 401 && e.code === 'signed_out') signedOut();
    throw e;
  }
  return true;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const api = {
  // A wrong passcode, or too many, is an answer to show, not a failure.
  signInWithPasscode: (passcode) =>
    call('/session/passcode', { method: 'POST', auth: false, body: { passcode } })
      .catch((e) => { if (e.body && (e.status === 401 || e.status === 429)) return e.body; throw e; }),
  session: () => call('/session'),
  signOut: () => call('/session', { method: 'DELETE' }),

  overview: (range, quiet) => call(`/web/overview${qs({ range })}`, { quiet }),
  visitors: (params, quiet) => call(`/web/visitors${qs(params)}`, { quiet }),
  visitor: (id) => call(`/web/visitors/${encodeURIComponent(id)}`),
  customers: (params, quiet) => call(`/web/customers${qs(params)}`, { quiet }),
  freeChecks: (range, quiet) => call(`/web/free-checks${qs({ range })}`, { quiet }),
  requestCode: (mobile) => call('/session/otp', { method: 'POST', auth: false, body: { mobile } }),
  verifyCode: (mobile, code) => call('/session/verify', { method: 'POST', auth: false, body: { mobile, code } })
    .catch((e) => { if (e.body && e.status === 401) return e.body; throw e; }),

  // The main admin's endpoints, shared (2026-10-07).
  alerts: (params, quiet) => call(`/alerts${qs(params)}`, { quiet }),
  alertAck: (id) => call(`/alerts/${id}/ack`, { method: 'POST', body: {} }),
  alertResolve: (id, note) => call(`/alerts/${id}/resolve`, { method: 'POST', body: { note } }),
  alertRules: () => call('/alert-rules'),
  muteRule: (key, hours) => call(`/alert-rules/${key}/mute`, { method: 'POST', body: { hours } }),
  paymentsSummary: (params, quiet) => call(`/payments/summary${qs(params)}`, { quiet }),
  payments: (params, quiet) => call(`/payments${qs(params)}`, { quiet }),
  payment: (id) => call(`/payments/${id}`),
  abandoned: (params, quiet) => call(`/payments/abandoned${qs(params)}`, { quiet }),
  apiMonitor: (params, quiet) => call(`/api-monitor${qs(params)}`, { quiet }),
  apiLog: (params) => call(`/api-monitor/log${qs(params)}`),
  healthServices: (quiet) => call('/health/services', { quiet }),
  infrastructure: (quiet) => call('/infrastructure', { quiet }),
  jobs: (quiet) => call('/jobs', { quiet }),
  audit: (params) => call(`/audit${qs(params)}`),
  reports: (params, quiet) => call(`/reports${qs(params)}`, { quiet }),
  gpReferrals: (params, quiet) => call(`/gp-referrals${qs(params)}`, { quiet }),
  search: (q) => call(`/search${qs({ q, limit: 8 })}`, { quiet: true }),
  admins: () => call('/admins'),
  addAdmin: (body) => call('/admins', { method: 'POST', body }),
  setAdminActive: (id, active) => call(`/admins/${id}/active`, { method: 'POST', body: { active } }),
  getPref: (key) => call(`/prefs/${key}`, { quiet: true }),
  setPref: (key, value) => call(`/prefs/${key}`, { method: 'PUT', body: { value }, quiet: true }),
  mySessions: () => call('/web/me/sessions'),
  endMySessions: (which) => call(`/web/me/sessions/${which}/end`, { method: 'POST', body: {} }),
  presence: (screen, entity) => call('/web/presence', { method: 'POST', body: { screen, entity }, quiet: true }),
  live: (quiet) => call('/web/live', { quiet }),

  log: (params, quiet) => call(`/web/log${qs(params)}`, { quiet }),
  emails: (quiet) => call('/web/emails', { quiet }),
  setEmail: (key, on) => call(`/web/emails/${encodeURIComponent(key)}`, { method: 'PUT', body: { on } }),
};
