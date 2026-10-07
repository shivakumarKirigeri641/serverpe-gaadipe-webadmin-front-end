import ReportButtons from '../../components/ReportButtons.jsx';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, State, Table } from '../components/ui.jsx';
import { dateTime, num } from '../lib/format';

/** REPORTS (spec §17): every full report issued, with its customer, channel and validity. */
export default function Reports() {
  const [range] = useRange();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad((quiet) => api.reports({ range, q: term, limit: 100 }, quiet), [range, term]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold">Reports</h1><p className="text-2xs text-muted">Every full report issued, newest first (all time — the period above does not apply here).</p></div>
        <Search value={q} onChange={setQ} placeholder="Report number, vehicle or mobile" />
      </div>
      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'No reports.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} report{data.total === 1 ? '' : 's'}</div>
              <Table head={['Issued', 'Report', 'Vehicle', 'Customer', 'Channel', 'Valid until', 'PDF']}>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td whitespace-nowrap text-2xs">{dateTime(r.created_at)}</td>
                    <td className="td font-mono text-2xs text-ink">{r.report_number}</td>
                    <td className="td plate">{r.reg_no}</td>
                    <td className="td"><div className="text-ink">{r.requester_name || '-'}</div><div className="tabular text-2xs text-muted">{r.mobile}</div></td>
                    <td className="td"><span className="chip bg-shell text-ink">{r.channel || '—'}</span></td>
                    <td className="td text-2xs">{new Date(r.valid_until) > new Date() ? dateTime(r.valid_until) : <span className="text-muted">ended</span>}</td>
                    <td className="td"><ReportButtons id={r.id} hasPdf={r.has_pdf} compact /></td>
                  </tr>))}
              </Table>
            </>
          ) : null}
        </State>
      </div>
    </>
  );
}
