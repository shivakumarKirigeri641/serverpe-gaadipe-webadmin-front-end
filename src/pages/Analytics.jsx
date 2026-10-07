import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { Section, SourceChip, State } from '../components/ui.jsx';
import { dateTime, duration, num, rupees } from '../lib/format';

/**
 * LIVE ANALYTICS (spec §5, §21–23, §53, §116). The graph engine: a metric, a
 * window (15 minutes … 30 days) and how often it refreshes; the unfinished
 * bucket is drawn lighter — real-time is never mistaken for history. Active
 * users is a presence figure (visits alive in the minute), never a total.
 * Then this period against the previous one, a small chart per metric, and the
 * funnel — tap a stage for the visits behind it.
 */
const METRICS = [
  ['active_sessions', 'Active users', 'max'], ['visitors', 'Visitors'], ['page_views', 'Page views'], ['searches', 'Vehicle searches'],
  ['free_checks', 'Free checks'], ['web_checks', 'Signed-in checks'], ['otp_requests', 'Sign-in codes sent'], ['otp_success', 'Sign-ins'],
  ['otp_failed', 'Failed sign-ins'], ['pay_attempts', 'Payment attempts'], ['payments', 'Payments'], ['revenue_paise', 'Revenue', 'money'],
  ['reports', 'Reports'], ['api_calls', 'API calls'], ['api_failures', 'API failures'], ['api_avg_ms', 'API latency (ms)', 'avg'], ['errors', 'Errors'],
];
const RANGES = [['15m', '15 min'], ['30m', '30 min'], ['1h', '1 hour'], ['3h', '3 hours'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7 days'], ['30d', '30 days']];
const REFRESH = [[2000, 'Live'], [5000, '5 s'], [10000, '10 s'], [30000, '30 s'], [60000, '1 min']];
const COMPARE = [['visitors', 'Visitors'], ['searches', 'Searches'], ['otp_success', 'Sign-ins'], ['new_users', 'New customers'], ['payments', 'Payments'],
  ['revenue_paise', 'Revenue', 'money'], ['reports', 'Reports'], ['api_failures', 'API failures', 'bad'], ['errors', 'Errors', 'bad']];

const label = (t, step) => {
  const d = new Date(t);
  const o = { timeZone: 'Asia/Kolkata' };
  return step >= 86400 ? d.toLocaleDateString('en-IN', { ...o, day: '2-digit', month: 'short' })
    : step >= 3600 ? d.toLocaleString('en-IN', { ...o, day: '2-digit', hour: '2-digit' })
      : d.toLocaleTimeString('en-IN', { ...o, hour: '2-digit', minute: '2-digit', hour12: false });
};
const fmt = (k, v) => (k === 'revenue_paise' ? rupees(v) : v == null ? '—' : num(v));

export default function Analytics() {
  const [metric, setMetric] = useState('active_sessions');
  const [range, setRange] = useState('1h');
  const [every, setEvery] = useState(5000);
  const { data, error, loading, reload } = useLoad((quiet) => api.series(range, quiet), [range], { everyMs: every });
  const cmpRange = ['15m', '30m', '1h', '3h'].includes(range) ? 'today' : range === 'yesterday' ? 'yesterday' : range === '7d' ? '7d' : range === '30d' ? '30d' : 'today';
  const sum = useLoad((quiet) => api.analyticsSummary(cmpRange, quiet), [cmpRange], { everyMs: 30000 });
  const rows = (data?.rows || []).map((r) => ({ ...r, x: label(r.t, data.step) }));
  const m = METRICS.find(([k]) => k === metric);
  const [stage, setStage] = useState(null);

  return (
    <>
      <h1 className="text-lg font-semibold">Live analytics</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="input !w-auto !py-1.5 text-sm" value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Metric">
          {METRICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="inline-flex flex-wrap rounded-lg border border-line bg-shell p-0.5">
          {RANGES.map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={`rounded-md px-2.5 py-1 text-2xs font-semibold ${range === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>{l}</button>)}
        </div>
        <select className="input !w-auto !py-1.5 text-2xs" value={every} onChange={(e) => setEvery(Number(e.target.value))} aria-label="Refresh">
          {REFRESH.map(([v, l]) => <option key={v} value={v}>Refresh: {l}</option>)}
        </select>
        <span className="text-2xs text-muted">{data ? `${data.step === 60 ? 'per minute' : data.step === 300 ? 'per 5 minutes' : data.step === 3600 ? 'per hour' : 'per day'} · the lighter bar is still filling` : ''}</span>
      </div>

      <div className="card mt-3 px-2 py-3">
        <State loading={loading} error={error} onRetry={reload}>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e3ecea" vertical={false} />
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6b8380' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={metric === 'api_avg_ms'} tick={{ fontSize: 11, fill: '#6b8380' }} tickFormatter={(v) => (metric === 'revenue_paise' ? `₹${Math.round(v / 100)}` : v)} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [fmt(metric, v), m?.[1]]} labelFormatter={(x, p) => `${x}${p?.[0]?.payload?.live ? ' · live, still filling' : ''}`} />
                {metric === 'active_sessions' || metric === 'api_avg_ms'
                  ? <Line type="monotone" dataKey={metric} stroke="#0f766e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  : (
                    <Bar dataKey={metric} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {rows.map((r) => <Cell key={r.t} fill={r.live ? '#99d5cf' : '#0f766e'} />)}
                    </Bar>)}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </State>
      </div>

      <Section title={`Against the previous ${cmpRange === 'today' ? 'day (to the same time)' : cmpRange === 'yesterday' ? 'day' : cmpRange === '7d' ? '7 days' : '30 days'}`}>
        {sum.data ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {COMPARE.map(([k, l, kind]) => {
              const c = sum.data.change[k];
              const good = kind === 'bad' ? c < 0 : c > 0;
              return (
                <div key={k} className="card px-3 py-2.5">
                  <div className="text-2xs text-muted">{l}</div>
                  <div className="tabular text-lg font-bold text-ink">{kind === 'money' ? rupees(sum.data.current[k]) : num(sum.data.current[k])}</div>
                  <div className={`tabular text-2xs ${c == null || c === 0 ? 'text-muted' : good ? 'text-good-700' : 'text-wrong-700'}`}>
                    {c == null ? `was ${kind === 'money' ? rupees(sum.data.previous[k]) : num(sum.data.previous[k])}` : `${c > 0 ? '▲' : c < 0 ? '▼' : '='} ${Math.abs(c)}% (was ${kind === 'money' ? rupees(sum.data.previous[k]) : num(sum.data.previous[k])})`}
                  </div>
                </div>);
            })}
          </div>) : <div className="card px-4 py-4 text-sm text-muted">Loading…</div>}
      </Section>

      <Section title="Every metric" hint="Tap one to put it on the big chart">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {METRICS.map(([k, l]) => (
            <button key={k} onClick={() => setMetric(k)} className={`card px-2 pb-1 pt-2 text-left ${metric === k ? 'ring-2 ring-brand/40' : ''}`}>
              <div className="flex items-baseline justify-between px-1"><span className="text-2xs text-muted">{l}</span>
                <span className="tabular text-2xs font-semibold text-ink">{fmt(k, k === 'active_sessions' ? rows.at(-1)?.[k] : k === 'api_avg_ms' ? rows.filter((r) => r[k] != null).at(-1)?.[k] : rows.reduce((s, r) => s + (r[k] || 0), 0))}</span></div>
              <div className="h-12"><ResponsiveContainer><LineChart data={rows}><Line type="monotone" dataKey={k} stroke="#0f766e" strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            </button>))}
        </div>
      </Section>

      <Funnel range={cmpRange} onStage={setStage} stage={stage} />
    </>
  );
}

function Funnel({ range, stage, onStage }) {
  const { data } = useLoad((quiet) => api.funnel(range, quiet), [range], { everyMs: 30000 });
  const [stopped, setStopped] = useState(false);
  const people = useLoad(() => (stage ? api.funnelPeople({ range, stage, stopped: stopped ? 1 : '' }) : Promise.resolve(null)), [range, stage, stopped], { everyMs: 0 });
  useEffect(() => { setStopped(false); }, [stage]);
  return (
    <Section title="Live funnel" hint={`Visits ${range === 'today' ? 'started today' : `in ${range}`}. Tap a stage for the visits behind it.`}>
      {data ? (
        <div className="card divide-y divide-line">
          {data.stages.map((s) => (
            <button key={s.key} onClick={() => onStage(stage === s.key ? null : s.key)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-shell/60 ${stage === s.key ? 'bg-brand/5' : ''}`}>
              <span className="w-40 shrink-0 text-sm text-ink">{s.label}</span>
              <span className="h-6 flex-1 rounded bg-shell"><span className="block h-6 rounded bg-brand/80" style={{ width: `${Math.max(2, s.pct_of_visits)}%` }} /></span>
              <span className="tabular w-12 text-right text-sm font-semibold">{num(s.count)}</span>
              <span className="tabular hidden w-16 text-right text-2xs text-muted sm:block">{s.pct_of_visits}%</span>
              <span className="tabular hidden w-40 text-right text-2xs text-muted md:block">
                {s.to_next_pct != null ? `${s.to_next_pct}% go on · ${num(s.dropped)} stop` : ''}{s.avg_seconds_to_next != null ? ` · ${duration(new Date(Date.now() - s.avg_seconds_to_next * 1000).toISOString())}` : ''}
              </span>
            </button>))}
        </div>) : <div className="card px-4 py-4 text-sm text-muted">Loading…</div>}
      {stage ? (
        <div className="mt-3">
          <label className="mb-2 inline-flex items-center gap-2 text-2xs text-muted">
            <input type="checkbox" checked={stopped} onChange={(e) => setStopped(e.target.checked)} className="accent-[#0f766e]" />Only the visits that stopped at this stage
          </label>
          <div className="card divide-y divide-line">
            {(people.data?.rows || []).length ? people.data.rows.map((p) => (
              <Link key={p.session_id} to={`/sessions/${encodeURIComponent(p.session_id)}`} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm hover:bg-shell">
                <span className="min-w-[10rem] text-ink">{p.user_id ? (p.name || p.mobile || 'Customer') : 'Anonymous visitor'}</span>
                <SourceChip source={p.source || 'direct'} /><span className="text-2xs text-muted">reached at {dateTime(p.reached_at)} · got to “{p.last_stage}”</span>
                <span className="ml-auto text-2xs text-brand">Open →</span>
              </Link>)) : <div className="px-4 py-4 text-sm text-muted">{people.loading ? 'Loading…' : 'Nobody here.'}</div>}
          </div>
        </div>) : null}
    </Section>
  );
}
