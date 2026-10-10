import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, SourceChip, State, Table } from '../components/ui.jsx';
import { ago, dateTime, deviceOf, num, placeOf, sourceOf, time } from '../lib/format';

const SOURCES = ['', 'google_ads', 'meta_ads', 'google', 'social', 'direct', 'referral', 'organic'];

export default function Visitors() {
  const [range] = useRange();
  const [params, setParams] = useSearchParams();
  const source = params.get('source') || '';
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  // ?v=<visitor> opens that browser's trail directly (from Free checks, 2026-10-10).
  const [open, setOpen] = useState(params.get('v') || null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const { data, error, loading, reload } = useLoad((quiet) => api.visitors({ range, source, q: term, limit: 150 }, quiet), [range, source, term], { everyMs: 30000 });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Visitors</h1>
          <p className="text-2xs text-muted">Each browser that opened gaadipe.in, latest first. Tap one for everything it did.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <select className="input !w-auto !py-2 text-sm" value={source}
            onChange={(e) => setParams(e.target.value ? { source: e.target.value } : {}, { replace: true })}>
            {SOURCES.map((s) => <option key={s} value={s}>{s ? sourceOf(s).label : 'Every source'}</option>)}
          </select>
          <Search value={q} onChange={setQ} placeholder="Mobile, name or city" />
        </div>
      </div>

      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'No visitors match.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} visitor{data.total === 1 ? '' : 's'}{data.total > data.rows.length ? ` · showing the latest ${data.rows.length}` : ''}</div>
              <Table head={['Last seen', 'Source', 'Pages', 'Chat', 'Customer', 'Place', 'Device']}>
                {data.rows.map((v) => (
                  <tr key={v.visitor_id} className="cursor-pointer hover:bg-shell/60" onClick={() => setOpen(v.visitor_id)}>
                    <td className="td whitespace-nowrap"><div className="text-ink">{ago(v.last_at)}</div><div className="text-2xs text-muted">first {dateTime(v.first_seen_at)}</div></td>
                    <td className="td"><SourceChip source={v.source} />{v.campaign ? <div className="mt-1 max-w-[10rem] truncate text-2xs text-muted">{v.campaign}</div> : null}</td>
                    <td className="td tabular">{num(v.views)}</td>
                    <td className="td">{v.chat ? '💬' : ''}</td>
                    <td className="td">{v.user_id ? <><div className="text-ink">{v.name || '-'}</div><div className="tabular text-2xs text-muted">{v.mobile}{v.paid ? ` · ${v.paid} paid` : ''}</div></> : <span className="text-2xs text-muted">not signed in</span>}</td>
                    <td className="td text-2xs">{placeOf(v.place)}</td>
                    <td className="td text-2xs">{deviceOf(v.device)}</td>
                  </tr>
                ))}
              </Table>
            </>
          ) : null}
        </State>
      </div>
      {open ? <Trail id={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

const NAMES = { page_view: 'Opened', session_started: 'Arrived', payment_page_viewed: 'Opened the payment', payment_success: 'Paid', cta_clicked: 'Tapped' };
// What kind of moment, at a glance (2026-10-10): taps, typing, searches, views, errors.
const KIND_ICON = { tap: '👆', typed: '⌨️', focus: '✍️', search: '🔍', view: '👀', error: '⚠️', open: '📂' };

/*
 * PIN TO PIN (user, 2026-10-10): everything this browser did, in time order — pages,
 * every tap and what was typed (masked as the Privacy policy says), each free check
 * before signing in with the device it came from, the moment it signed in and the
 * checks were linked to the customer, and the checks made after.
 */
function storyOf(data) {
  const out = (data.rows || []).map((e) => ({
    at: e.occurred_at, icon: e.name === 'interaction' ? (KIND_ICON[e.kind] || '•') : e.name === 'payment_success' ? '💰' : e.name === 'session_started' ? '🚪' : '📄',
    text: e.name === 'interaction' ? (e.label || e.kind) : `${NAMES[e.name] || e.name.replace(/_/g, ' ')} ${e.page || ''}`.trim(),
    sub: e.reg_no || null,
  }));
  for (const f of data.free_checks || []) {
    const d = f.device || {};
    out.push({
      at: f.created_at, icon: '🆓', strong: true,
      text: `Free check ${f.reg_no} — ${f.outcome}${f.refusal ? ` (${f.refusal})` : ''}${f.shown ? ` · ${[f.shown.maker, f.shown.model].filter(Boolean).join(' ')}` : ''}`,
      sub: [[d.vendor, d.model].filter(Boolean).join(' '), [d.os, d.os_version].filter(Boolean).join(' '), d.browser, f.ip, f.place?.city].filter(Boolean).join(' · '),
      link: f.user_id ? { to: `/web/customers/${f.user_id}`, text: `→ linked to ${f.linked_name || 'customer'} · …${String(f.linked_mobile || '').slice(-4)}${f.in_my_vehicles ? ' · in My vehicles' : ''}` } : null,
    });
  }
  if (data.visitor?.linked_at) out.push({ at: data.visitor.linked_at, icon: '🔐', strong: true, text: `Signed in as ${data.visitor.name || 'a customer'} · ${data.visitor.mobile || ''} — checks on this browser linked to them` });
  for (const s of data.signed_checks || []) {
    out.push({ at: s.created_at, icon: '✅', text: `Checked ${s.reg_no} signed in${s.kind === 'vehicle_check_repeat' ? ' (again, not counted)' : ''}${s.found === false ? ' — not found' : ''}` });
  }
  return out.sort((a, b) => new Date(a.at) - new Date(b.at));
}

function Trail({ id, onClose }) {
  const { data, error, loading } = useLoad(() => api.visitor(id), [id], { everyMs: 0 });
  const v = data?.visitor;
  const d = data?.device || null;
  const line = (k, val) => (val == null || val === '' ? null : <div key={k} className="flex gap-2"><span className="w-28 shrink-0 text-muted">{k}</span><span className="break-all text-ink">{val}</span></div>);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <aside className="rise h-full w-full max-w-md overflow-y-auto bg-white px-4 py-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Visitor</h2>
          <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={onClose}>Close</button>
        </div>
        <State loading={loading} error={error}>
          {v ? (
            <>
              <div className="mt-3 space-y-1 rounded-lg bg-shell px-3 py-2.5 text-sm">
                <div><SourceChip source={v.source} /> {v.first_touch?.campaign ? <span className="text-2xs text-muted">· {v.first_touch.campaign}</span> : null}</div>
                {v.user_id
                  ? <div className="text-ink"><Link className="text-brand hover:underline" to={`/web/customers/${v.user_id}`}>{v.name || '-'} · <span className="tabular">{v.mobile}</span> →</Link>{v.linked_at ? <span className="text-2xs text-muted"> · signed in {dateTime(v.linked_at)}</span> : null}</div>
                  : <div className="text-2xs text-muted">Not signed in</div>}
                <div className="text-2xs text-muted">{placeOf(v.place)} · {deviceOf(v.device)}</div>
                <div className="text-2xs text-muted">First {dateTime(v.first_seen_at)} · landed on {v.first_touch?.landing || '—'}</div>
                <div className="text-2xs text-muted">{num((data.free_checks || []).length)} free check{(data.free_checks || []).length === 1 ? '' : 's'} before sign-in · {num((data.signed_checks || []).length)} after</div>
              </div>
              {/* The fullest device description this browser gave (its free check). */}
              {d ? (
                <details className="mt-2 rounded-lg border border-line px-3 py-2 text-2xs">
                  <summary className="cursor-pointer font-semibold text-ink">Device — full details</summary>
                  <div className="mt-1.5 space-y-0.5">
                    {[line('Device', [d.type, d.vendor, d.model].filter(Boolean).join(' · ')), line('OS', [d.os, d.os_version].filter(Boolean).join(' ')),
                      line('Browser', [d.browser, d.browser_version].filter(Boolean).join(' ')), line('Screen · view', [d.screen, d.viewport].filter(Boolean).join(' · ')),
                      line('CPU · memory', [d.cpu_cores ? `${d.cpu_cores} cores` : null, d.memory_gb ? `${d.memory_gb} GB` : null].filter(Boolean).join(' · ')),
                      line('Touch points', d.touch_points), line('Network', d.connection), line('Time zone', d.timezone), line('Languages', d.languages),
                      line('Platform', d.platform), line('IP', d.ip), line('Place', [d.place?.city, d.place?.region, d.place?.country].filter(Boolean).join(', ')),
                      line('Device id', d.device_id), line('Visitor id', v.visitor_id), line('User agent', d.user_agent)]}
                  </div>
                </details>
              ) : null}
              <ol className="mt-3 space-y-1.5">
                {storyOf(data).map((e, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${e.strong ? 'rounded-md bg-shell/70 px-1.5 py-1' : ''}`}>
                    <span className="tabular w-12 shrink-0 text-2xs text-muted">{time(e.at)}</span>
                    <span className="w-5 shrink-0 text-center" aria-hidden="true">{e.icon}</span>
                    <span className="min-w-0">
                      <span className={e.strong ? 'font-semibold text-ink' : 'text-ink'}>{e.text}</span>
                      {e.sub ? <span className="block break-all text-2xs text-muted">{e.sub}</span> : null}
                      {e.link ? <Link className="block text-2xs text-brand hover:underline" to={e.link.to}>{e.link.text}</Link> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : <div className="mt-4 text-sm text-muted">No record of this visitor.</div>}
        </State>
      </aside>
    </div>
  );
}
