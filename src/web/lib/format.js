/* Numbers, money and times as people in India read them. */

export const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
export const rupees = (paise) => `₹${((Number(paise) || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');

const IST = { timeZone: 'Asia/Kolkata' };
export const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit' }) : '—');
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export function ago(iso) {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/* Where a visitor came from, in words, with a colour that means the same everywhere. */
const SOURCES = {
  google_ads: { label: 'Google Ads', color: '#2563eb' },
  meta_ads: { label: 'Meta ads', color: '#db2777' },
  google: { label: 'Google search', color: '#0891b2' },
  organic: { label: 'Other search', color: '#0d9488' },
  social: { label: 'Social', color: '#9333ea' },
  whatsapp: { label: 'WhatsApp', color: '#16a34a' },
  referral: { label: 'Other websites', color: '#ca8a04' },
  direct: { label: 'Direct / typed', color: '#64748b' },
  unknown: { label: 'Unknown', color: '#94a3b8' },
};
export const sourceOf = (s) => SOURCES[s] || { label: s || 'Unknown', color: '#94a3b8' };

/*
 * READABLE IDS (spec §67–68): what the panel shows and searches for. Each maps
 * one-to-one to the id in the database, so a search finds the row.
 *   GP-C-000123              a customer (users.id)
 *   GP-S-20261007-K3F9QX     a website visit (web_sessions.session_id, its start day)
 *   GP-D-8F4K29              a browser (visitors.visitor_id)
 *   GP-T-44                  a payment (payments.id)
 */
export const customerCode = (id) => (id ? `GP-C-${String(id).padStart(6, '0')}` : null);
export const sessionCode = (sid, started) => {
  if (!sid) return null;
  const d = started ? new Date(new Date(started).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '') : '';
  return `GP-S-${d ? `${d}-` : ''}${String(sid).replace(/^s_/, '').slice(0, 6).toUpperCase()}`;
};
export const deviceCode = (vid) => (vid ? `GP-D-${String(vid).replace(/^v_/, '').slice(0, 6).toUpperCase()}` : null);
export const paymentCode = (id) => (id ? `GP-T-${id}` : null);

export function duration(fromIso, to = Date.now()) {
  if (!fromIso) return '—';
  const s = Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}m ${String(r).padStart(2, '0')}s`;
}

export const placeOf = (p) => [p?.city, p?.region].filter(Boolean).join(', ') || p?.country || '—';
export const deviceOf = (d) => [d?.device_type, d?.os, d?.browser].filter(Boolean).join(' · ') || '—';
