import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

/*
 * WHO JUST CAME (user, 2026-10-07: "in Customers I don't see who all just came").
 * Customers are people who signed in; most visitors from the ads never do. This
 * strip shows every visit of the last 30 minutes — signed in or not — newest
 * first, refreshed every 20 seconds; a tap opens the visit.
 */
const SOURCE = { google_ads: 'Google Ads', meta_ads: 'Meta ads', google: 'Google', organic: 'Search', social: 'Social', referral: 'Website', direct: 'Direct' };
const ago = (t) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(t)) / 1000));
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

export default function JustCame() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    const load = () => api.webSessions({ range: 'today', limit: 40 }, true)
      .then((out) => { if (live) setRows((out.rows || []).filter((r) => Date.now() - new Date(r.started_at) < 30 * 60000)); })
      .catch(() => { if (live) setRows((r) => r || []); });
    load();
    const t = setInterval(load, 20000);
    return () => { live = false; clearInterval(t); };
  }, []);
  if (!rows) return null;
  const online = rows.filter((r) => ['ONLINE', 'IDLE'].includes(String(r.status || '').toUpperCase())).length;
  return (
    <section className="card mb-4 overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink">👀 Just came <span className="font-normal text-muted">· last 30 minutes, signed in or not</span></h2>
        <span className="text-2xs text-muted">{rows.length} visit{rows.length === 1 ? '' : 's'}{online ? ` · ${online} on the site now` : ''} · <Link to="/web/live" className="font-semibold text-brand">Live users →</Link></span>
      </div>
      {rows.length ? (
        <ul className="flex gap-2 overflow-x-auto px-3 py-3">
          {rows.map((r) => {
            const place = [r.place?.city, r.place?.region].filter(Boolean).join(', ');
            const dev = [r.device?.device_type, r.device?.os].filter(Boolean).join(' · ');
            const on = ['ONLINE', 'IDLE'].includes(String(r.status || '').toUpperCase());
            return (
              <li key={r.session_id} className="shrink-0">
                <Link to={`/web/sessions/${encodeURIComponent(r.session_id)}`}
                  className="block w-56 rounded-lg border border-line bg-white px-3 py-2 hover:border-brand">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-good-500' : 'bg-line'}`} />
                    <span className="truncate">{r.user_id ? (r.name || r.mobile || 'Customer') : 'Not signed in'}</span>
                  </div>
                  <div className="mt-0.5 truncate text-2xs text-muted">{SOURCE[r.source] || r.source || 'Direct'}{place ? ` · ${place}` : ''}</div>
                  <div className="truncate text-2xs text-muted">{dev || '—'} · {ago(r.started_at)}</div>
                  <div className="mt-1 truncate text-2xs text-body">{r.action || r.step || `${r.pages || 0} page${r.pages === 1 ? '' : 's'}`}</div>
                </Link>
              </li>);
          })}
        </ul>
      ) : <p className="px-4 py-3 text-sm text-muted">No visits in the last 30 minutes.</p>}
    </section>
  );
}
