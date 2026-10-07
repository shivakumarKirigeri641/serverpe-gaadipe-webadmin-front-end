import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, SourceChip, State, Table } from '../components/ui.jsx';
import { ago, dateTime, num, placeOf, rupees } from '../lib/format';

/** Customers who signed in on the website and were active in the period. */
export default function Customers() {
  const [range] = useRange();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad((quiet) => api.customers({ range, q: term, limit: 150 }, quiet), [range, term]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Customers</h1>
          <p className="text-2xs text-muted">Signed in on the website and active in this period, most recent first.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Mobile, name or email" />
      </div>
      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'No website customers in this period.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} customer{data.total === 1 ? '' : 's'}</div>
              <Table head={['Customer', 'Last seen', 'Came from', 'Checks', 'Paid', 'Alerts', 'Since']}>
                {data.rows.map((c) => (
                  <tr key={c.user_id}>
                    <td className="td">
                      <div className="flex items-center gap-1.5 text-ink">{c.name || 'Customer'}{c.is_new ? <span className="chip bg-good-50 text-good-700">new</span> : null}</div>
                      <div className="tabular text-2xs text-muted">{c.mobile}{c.email ? ` · ${c.email}` : ''}</div>
                    </td>
                    <td className="td whitespace-nowrap"><div>{ago(c.last_seen)}</div><div className="text-2xs text-muted">{c.open_sessions} device{c.open_sessions === 1 ? '' : 's'} signed in</div></td>
                    <td className="td"><SourceChip source={c.source} /><div className="mt-1 text-2xs text-muted">{placeOf(c.place)}</div></td>
                    <td className="td tabular">{num(c.checks)}</td>
                    <td className="td tabular">{c.paid ? <span className="font-semibold text-good-700">{c.paid} · {rupees(c.revenue_paise)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="td">{c.push_devices ? `🔔 ${c.push_devices}` : <span className="text-2xs text-muted">off</span>}</td>
                    <td className="td whitespace-nowrap text-2xs text-muted">{dateTime(c.first_at)}</td>
                  </tr>
                ))}
              </Table>
            </>
          ) : null}
        </State>
      </div>
    </>
  );
}
