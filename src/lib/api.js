/**
 * api.js — every call the website admin makes (2026-10-07).
 *
 * The same gateway, sign-in and encrypted tunnel as the main admin panel
 * (lib/secure.js is the same file): the Network tab shows ciphertext only. The
 * token is kept under its own key, and cleared the moment the gateway says the
 * session has ended.
 */

import { available as secureAvailable, secureCall } from './secure';

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
  log: (params, quiet) => call(`/web/log${qs(params)}`, { quiet }),
  emails: (quiet) => call('/web/emails', { quiet }),
  setEmail: (key, on) => call(`/web/emails/${encodeURIComponent(key)}`, { method: 'PUT', body: { on } }),
};
