import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, SourceChip, State, Table } from '../components/ui.jsx';
import { ago, dateTime, deviceOf, num, placeOf, sourceOf, time } from '../lib/format';

const SOURCES = ['', 'google_ads', 'meta_ads', 'google', 'social', 'direct', 'referral', 'organic', 'whatsapp'];

export default function Visitors() {
  const [range] = useRange();
  const [params, setParams] = useSearchParams();
  const source = params.get('source') || '';
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(null);
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

const NAMES = { page_view: 'Opened', session_started: 'Arrived', payment_page_viewed: 'Opened the ₹19 payment', payment_success: 'Paid', cta_clicked: 'Tapped' };

function Trail({ id, onClose }) {
  const { data, error, loading } = useLoad(() => api.visitor(id), [id], { everyMs: 0 });
  const v = data?.visitor;
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
                {v.user_id ? <div className="text-ink">{v.name || '-'} · <span className="tabular">{v.mobile}</span></div> : <div className="text-2xs text-muted">Not signed in</div>}
                <div className="text-2xs text-muted">{placeOf(v.place)} · {deviceOf(v.device)}</div>
                <div className="text-2xs text-muted">First {dateTime(v.first_seen_at)} · landed on {v.first_touch?.landing || '—'}</div>
              </div>
              <ol className="mt-3 space-y-1.5">
                {data.rows.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="tabular w-12 shrink-0 text-2xs text-muted">{time(e.occurred_at)}</span>
                    <span className="min-w-0">
                      <span className="text-ink">{NAMES[e.name] || e.name.replace(/_/g, ' ')}</span>{' '}
                      <span className="break-all text-2xs text-muted">{e.page || ''}{e.reg_no ? ` · ${e.reg_no}` : ''}{e.label ? ` · ${e.label}` : ''}</span>
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
