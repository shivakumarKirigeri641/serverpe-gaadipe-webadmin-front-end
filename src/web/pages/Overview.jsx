import { Link } from 'react-router-dom';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAnim } from '../../lib/motion.jsx';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Section, SourceChip, Stat, State } from '../components/ui.jsx';
import { num, pct, rupees, time } from '../lib/format';
import { InsightList } from './Insights.jsx';
import { CompareTable } from '../lib/compare.jsx';

const PERIOD = { today: 'today', '7d': 'in 7 days', '30d': 'in 30 days' };

export default function Overview() {
  const [range] = useRange();
  const { data, error, loading, at, reload } = useLoad((quiet) => api.overview(range, quiet), [range]);
  const t = data?.totals;

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {t ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-2xs text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-good-50 px-2 py-0.5 font-semibold text-good-700">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-good-500" />{num(t.online_now)} signed-in customer{t.online_now === 1 ? '' : 's'} active now
            </span>
            <span>Updated {time(at)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <Stat label="Visitors" trend="visitors" value={num(t.visitors)} sub={`${num(t.new_visitors)} new ${PERIOD[range]}`} />
            <Stat label="Signed in" trend="sign_ins" value={num(t.signed_in_customers)} sub={`${num(t.new_customers)} new customers · ${num(t.codes_requested)} codes sent`} />
            <Stat label="Paid reports" trend="paid" value={num(t.paid)} sub={`${num(t.pay_opened)} payment${t.pay_opened === 1 ? '' : 's'} opened`} tone={t.paid ? 'good' : undefined} />
            <Stat label="Revenue (web)" trend="revenue_paise" value={rupees(t.revenue_paise)} sub={t.paid ? `${rupees(t.revenue_paise / t.paid)} a report` : 'no payments yet'} tone={t.paid ? 'good' : undefined} />
            <Stat label="Opened the chat" trend="chat_visitors" value={num(t.chat_visitors)} sub={`${pct(t.chat_visitors, t.visitors)} of visitors`} />
            <Stat label="Free checks" trend="free_checks" value={num(t.free_checks)} sub={`${num(t.free_found)} found · ${num(t.free_checkers)} people`} />
            <Stat label="Signed-in checks" trend="checks" value={num(t.web_checks)} sub="checks after signing in" />
            <Stat label="Notifications on" value={num(t.push_customers)} sub={`${num(t.push_devices)} phone${t.push_devices === 1 ? '' : 's'} · all time`} />
          </div>

          {/* Every number against yesterday, last week and last month (2026-10-08). */}
          <Section title="Up or down — every number, compared" hint="Today against yesterday up to this same time and the same day last week; the last 7 days against the 7 before; this month so far against the same days of last month.">
            <CompareTable money={rupees} />
          </Section>

          <Section title="What the numbers say" right={<Link to="/web/insights" className="text-2xs font-semibold text-brand">All insights →</Link>}>
            <InsightList range={range} />
          </Section>

          <Section title="From visit to payment" hint={`Each step ${PERIOD[range]}, and how many of the first step reached it`}>
            <div className="card divide-y divide-line">
              {data.funnel.map((f, i) => {
                const top = data.funnel[0].n || 1;
                const w = Math.max(2, Math.round((100 * f.n) / top));
                const prev = i ? data.funnel[i - 1].n : null;
                return (
                  <div key={f.key} className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
                    <div className="w-28 shrink-0 text-sm text-ink sm:w-44">{f.label}</div>
                    <div className="h-6 flex-1 rounded bg-shell">
                      <div className="funnel-fill h-6 rounded bg-gradient-to-r from-brand to-brand-accent" style={{ width: `${w}%` }} />
                    </div>
                    <div className="tabular w-14 text-right text-sm font-semibold text-ink">{num(f.n)}</div>
                    {/* Only a real narrowing is a share: a customer can open the payment more than once. */}
                    <div className="tabular hidden w-24 text-right text-2xs text-muted sm:block">{i && prev && f.n <= prev ? `${pct(f.n, prev)} of previous` : ''}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={range === 'today' ? 'Hour by hour' : 'Day by day'} hint="Visitors as the area; free checks, sign-ins and payments as bars">
            <div className="card plot-card px-2 py-3">
              <div className="plot-stage h-52 w-full sm:h-64">
                <ResponsiveContainer>
                  <ComposedChart data={data.series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#e3ecea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b8380' }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b8380' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="visitors" name="Visitors" fill="#0f766e22" stroke="#0f766e" strokeWidth={2} {...chartAnim()} />
                    <Bar dataKey="free_checks" name="Free checks" fill="#f59e0b" radius={[3, 3, 0, 0]} {...chartAnim()} />
                    <Bar dataKey="sign_ins" name="Sign-ins" fill="#2563eb" radius={[3, 3, 0, 0]} {...chartAnim()} />
                    <Line type="monotone" dataKey="paid" name="Paid" stroke="#12a150" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} {...chartAnim()} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

          <Section title="Where they came from" hint="By each visitor's first visit" right={<Link to="/web/sources" className="text-2xs font-semibold text-brand">Ads & sources →</Link>}>
            <div className="card divide-y divide-line">
              {data.sources.length ? data.sources.slice(0, 6).map((s) => (
                <div key={s.source} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <SourceChip source={s.source} />
                  <span className="tabular ml-auto text-ink">{num(s.visitors)} visitors</span>
                  <span className="tabular w-24 text-right text-muted">{num(s.signed_in)} signed in</span>
                  <span className="tabular w-20 text-right font-semibold text-good-700">{num(s.paid)} paid</span>
                </div>
              )) : <div className="px-4 py-6 text-center text-sm text-muted">No visitors {PERIOD[range]} yet.</div>}
            </div>
          </Section>
        </>
      ) : null}
    </State>
  );
}
