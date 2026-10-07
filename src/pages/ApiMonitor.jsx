import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Section, Stat, State, Table } from '../components/ui.jsx';
import { ago, dateTime, num, rupees } from '../lib/format';

/**
 * API MONITOR (spec §24–25): every call GaadiPe makes to a records provider —
 * ULIP's VAHAN and e-Challan, eChallan.app, the paid RC backup — from api_calls.
 * Per provider: calls, found, failures, timeouts, latency (average and P95),
 * cost, last success and last failure; and the call log, searchable by vehicle.
 */
export default function ApiMonitor() {
  const [range] = useRange();
  const { data, error, loading, reload } = useLoad((quiet) => api.apiMonitor({ range }, quiet), [range], { everyMs: 30000 });
  const [q, setQ] = useState('');
  const [result, setResult] = useState('');
  const log = useLoad(() => api.apiLog({ range, q, result, limit: 60 }), [range, q, result], { everyMs: 0 });
  const t = data?.totals;
  return (
    <State loading={loading} error={error} onRetry={reload}>
      {t ? (
        <>
          <h1 className="text-lg font-semibold">API monitor</h1>
          <p className="text-2xs text-muted">Status: <b className={t.status === 'healthy' || t.status === 'idle' ? 'text-good-700' : 'text-wrong-700'}>{t.status}</b></p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Calls" value={num(t.calls)} sub={`${num(t.cached)} answered from cache (${t.cache_pct ?? 0}%)`} />
            <Stat label="Failed" value={num(t.failed)} sub={`${num(t.timeouts)} timeouts · ${t.error_pct ?? 0}% errors`} tone={t.failed ? 'wrong' : undefined} />
            <Stat label="Latency" value={t.avg_ms != null ? `${num(t.avg_ms)} ms` : '—'} sub={`P95 ${t.p95_ms != null ? `${num(t.p95_ms)} ms` : '—'}`} />
            <Stat label="Cost" value={rupees(t.cost_paise)} sub={`${rupees(t.cost_per_paid_paise)} per paid report`} />
          </div>

          <Section title="By provider">
            {data.by_dataset?.length ? (
              <Table head={['Provider / dataset', 'Calls', 'Found', 'Failed', 'Timeouts', 'Avg', 'P95', 'Cost', 'Last OK', 'Last failure']}>
                {data.by_dataset.map((d) => (
                  <tr key={d.dataset}>
                    <td className="td font-mono text-2xs text-ink">{d.dataset}</td>
                    <td className="td tabular">{num(d.calls)}</td>
                    <td className="td tabular">{num(d.found)}</td>
                    <td className="td tabular">{d.failed ? <span className="font-semibold text-wrong-700">{num(d.failed)}</span> : 0}</td>
                    <td className="td tabular">{num(d.timeouts)}</td>
                    <td className="td tabular">{d.avg_ms != null ? `${num(d.avg_ms)} ms` : '—'}</td>
                    <td className="td tabular">{d.p95_ms != null ? `${num(d.p95_ms)} ms` : '—'}</td>
                    <td className="td tabular">{rupees(d.cost_paise)}</td>
                    <td className="td text-2xs">{ago(d.last_ok)}</td>
                    <td className="td text-2xs">{d.last_failure ? <><div>{ago(d.last_failure)}</div><div className="max-w-[14rem] truncate text-wrong-700" title={d.last_error}>{d.last_error}</div></> : '—'}</td>
                  </tr>))}
              </Table>
            ) : <div className="card px-4 py-6 text-center text-sm text-muted">No calls in this period.</div>}
          </Section>

          {data.by_hour?.some((h) => h.calls) ? (
            <Section title="Calls by hour" hint="Indian time">
              <div className="card px-2 py-3"><div className="h-52"><ResponsiveContainer>
                <BarChart data={data.by_hour} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#e3ecea" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#6b8380' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b8380' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="calls" name="Calls" stackId="a" fill="#0f766e" />
                  <Bar dataKey="failed" name="Failed" fill="#d92d20" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div></div>
            </Section>
          ) : null}

          <Section title="Call log" hint="Every call, newest first — the trace behind a report or a failure"
            right={<div className="flex gap-2">
              <select className="input !w-auto !py-1 text-2xs" value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="">Every result</option><option value="ok">OK</option><option value="failed">Failed</option><option value="timeout">Timed out</option><option value="cached">From cache</option>
              </select>
              <input className="input !w-40 !py-1 text-2xs" placeholder="Vehicle number" value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} />
            </div>}>
            <State loading={log.loading} error={log.error} empty={log.data && !(log.data.rows || []).length ? 'No calls match.' : null}>
              {(log.data?.rows || []).length ? (
                <Table head={['When', 'Dataset', 'Vehicle', 'Result', 'Time', 'Cost', 'Error']}>
                  {log.data.rows.map((c) => (
                    <tr key={c.id}>
                      <td className="td whitespace-nowrap text-2xs">{dateTime(c.created_at)}</td>
                      <td className="td font-mono text-2xs">{c.dataset}</td>
                      <td className="td plate">{c.reg_no || '—'}</td>
                      <td className="td">{c.ok ? <span className="chip bg-good-50 text-good-700">{c.cache_hit ? 'cache' : 'ok'}</span> : <span className="chip bg-wrong-50 text-wrong-700">{c.outcome || 'failed'}</span>}</td>
                      <td className="td tabular text-2xs">{c.duration_ms != null ? `${num(c.duration_ms)} ms` : '—'}</td>
                      <td className="td tabular text-2xs">{rupees(c.cost_paise)}</td>
                      <td className="td max-w-[16rem] truncate text-2xs text-wrong-700" title={c.error_message || c.error_code || ''}>{c.error_message || c.error_code || ''}</td>
                    </tr>))}
                </Table>
              ) : null}
            </State>
          </Section>
        </>
      ) : null}
    </State>
  );
}
