/**
 * api.js — the website screens' calls (2026-10-07).
 *
 * ONE PANEL, ONE SESSION (user, 2026-10-07: the web admin looks and works like
 * the main admin panel). These screens now live inside it, so every call goes
 * through the main panel's request path (src/lib/api.js): the same token, the
 * same encrypted tunnel, the same "Updating…" bar and connection light, and one
 * sign-out for the whole panel.
 */

import { available as secureAvailable, secureStream } from '../../lib/secure';
import {
  sharedCall, sharedSignedOut, API_PREFIX as P, getToken, setToken, onSignedOut, ApiError,
} from '../../lib/api';

export { getToken, setToken, onSignedOut, ApiError };
const call = sharedCall;
const signedOut = sharedSignedOut;

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
  webSessions: (params, quiet) => call(`/web/sessions${qs(params)}`, { quiet }),
  webSession: (id, quiet) => call(`/web/sessions/${encodeURIComponent(id)}`, { quiet }),
  webScreen: (id, quiet) => call(`/web/sessions/${encodeURIComponent(id)}/screen`, { quiet }),
  webCustomer: (id, quiet) => call(`/web/customers/${encodeURIComponent(id)}`, { quiet }),
  webSearch: (q) => call(`/web/search${qs({ q })}`, { quiet: true }),
  monitoring: (params, quiet) => call(`/web/monitoring${qs(params)}`, { quiet }),
  setMonitoring: (body) => call('/web/monitoring', { method: 'POST', body })
    .then((out) => { window.dispatchEvent(new Event('webadmin:monitoring')); return out; }),
  endVisit: (id, reason) => call(`/web/sessions/${encodeURIComponent(id)}/end`, { method: 'POST', body: { reason } }),
  signOutCustomer: (id, deviceKey, reason) => call(`/web/customers/${id}/sign-out`, { method: 'POST', body: { device_key: deviceKey || undefined, reason } }),
  customerFlags: (id) => call(`/web/customers/${id}/flags`),
  addFlag: (id, flag, reason) => call(`/web/customers/${id}/flags`, { method: 'POST', body: { flag, reason } }),
  clearFlag: (flagId) => call(`/web/flags/${flagId}/clear`, { method: 'POST', body: {} }),
  resendConfirmation: (id) => call(`/web/customers/${id}/resend-confirmation`, { method: 'POST', body: {} }),
  exportCustomer: (id) => call(`/web/customers/${id}/export`),
  settings: () => call('/settings'),
  saveSettings: (settings) => call('/settings', { method: 'PUT', body: { settings } }),
  customerEmails: () => call('/customer-emails'),
  emailLists: (params) => call(`/customer-emails/lists${qs(params)}`),
  compare: (quiet) => call('/web/compare', { quiet }),
  emailPreview: (body) => call('/customer-emails/preview', { method: 'POST', body }),
  emailTest: (body) => call('/customer-emails/test', { method: 'POST', body }),
  emailSend: (body) => call('/customer-emails/send', { method: 'POST', body }),
  emailCancel: (id) => call(`/customer-emails/campaigns/${id}/cancel`, { method: 'POST', body: {} }),
  askToConfirm: () => call('/customer-emails/ask-to-confirm', { method: 'POST', body: {} }),
  transfers: (status) => call(`/web/transfers${qs({ status })}`),
  decideTransfer: (id, approve, note) => call(`/web/transfers/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: { note } }),
  serverLog: (params) => call(`/web/server-log${qs(params)}`, { quiet: true }),
  leads: (params, quiet) => call(`/web/leads${qs(params)}`, { quiet }),
  stuck: (seconds, quiet) => call(`/web/stuck${qs({ seconds })}`, { quiet }),
  abandonedVisits: (range, quiet) => call(`/web/abandoned${qs({ range })}`, { quiet }),
  insights: (range, quiet) => call(`/web/insights${qs({ range })}`, { quiet }),
  breakdown: (range, quiet) => call(`/web/breakdown${qs({ range })}`, { quiet }),
  vehicle: (reg) => call(`/web/vehicles/${encodeURIComponent(reg)}`),
  series: (range, quiet) => call(`/web/analytics/series${qs({ range })}`, { quiet }),
  analyticsSummary: (range, quiet) => call(`/web/analytics/summary${qs({ range })}`, { quiet }),
  funnel: (range, quiet) => call(`/web/funnel${qs({ range })}`, { quiet }),
  funnelPeople: (params) => call(`/web/funnel/people${qs(params)}`),
  notes: (type, id) => call(`/notes/${type}/${id}`),
  addNote: (type, id, body) => call(`/notes/${type}/${id}`, { method: 'POST', body: { body } }),

  log: (params, quiet) => call(`/web/log${qs(params)}`, { quiet }),
  emails: (quiet) => call('/web/emails', { quiet }),
  setEmail: (key, on) => call(`/web/emails/${encodeURIComponent(key)}`, { method: 'PUT', body: { on } }),
};
