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

export const placeOf = (p) => [p?.city, p?.region].filter(Boolean).join(', ') || p?.country || '—';
export const deviceOf = (d) => [d?.device_type, d?.os, d?.browser].filter(Boolean).join(' · ') || '—';
