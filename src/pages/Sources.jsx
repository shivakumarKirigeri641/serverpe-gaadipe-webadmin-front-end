import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Section, SourceChip, State, Table } from '../components/ui.jsx';
import { num, pct, rupees, sourceOf } from '../lib/format';

/**
 * WHICH ADVERTISING PAYS (user, 2026-10-07): Google Ads and Meta ads side by
 * side — visitors, sign-ins, payments and revenue each brought, and the share
 * of visitors who went on to sign in and to pay. The spend is in Google's and
 * Meta's own pages; dividing it by "paid" here gives the cost of a customer.
 */
export default function Sources() {
  const [range] = useRange();
  const { data, error, loading, reload } = useLoad((quiet) => api.overview(range, quiet), [range]);
  const rows = data?.sources || [];
  const ads = ['google_ads', 'meta_ads'].map((k) => rows.find((r) => r.source === k) || { source: k, visitors: 0, signed_in: 0, paid: 0, revenue_paise: 0 });

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data ? (
        <>
          <h1 className="text-lg font-semibold">Ads & sources</h1>
          <p className="text-2xs text-muted">A visitor counts for the source of their first visit; a customer for the source of the first visitor linked to them.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ads.map((a) => (
              <div key={a.source} className="card rise px-4 py-4">
                <div className="flex items-center justify-between"><SourceChip source={a.source} />
                  <Link to={`/visitors?source=${a.source}`} className="text-2xs font-semibold text-brand">See visitors →</Link></div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[['Visitors', num(a.visitors)], ['Signed in', num(a.signed_in)], ['Paid', num(a.paid)], ['Revenue', rupees(a.revenue_paise)]].map(([l, v]) => (
                    <div key={l}><div className="tabular text-lg font-bold text-ink">{v}</div><div className="text-2xs text-muted">{l}</div></div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-2 text-2xs text-muted">
                  <span>Visit → sign-in <b className="text-ink">{pct(a.signed_in, a.visitors)}</b></span>
                  <span>Visit → paid <b className="text-ink">{pct(a.paid, a.visitors)}</b></span>
                </div>
              </div>
            ))}
          </div>

          <Section title="Visitors by source">
            <div className="card px-2 py-3">
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={rows.map((r) => ({ ...r, name: sourceOf(r.source).label }))} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#e3ecea" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b8380' }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b8380' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="visitors" name="Visitors" radius={[4, 4, 0, 0]}>
                      {rows.map((r) => <Cell key={r.source} fill={sourceOf(r.source).color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

          <Section title="Every source">
            {rows.length ? (
              <Table head={['Source', 'Visitors', 'New', 'Signed in', 'Paid', 'Revenue', 'Visit → paid']}>
                {rows.map((r) => (
                  <tr key={r.source}>
                    <td className="td"><Link to={`/visitors?source=${r.source}`}><SourceChip source={r.source} /></Link></td>
                    <td className="td tabular">{num(r.visitors)}</td>
                    <td className="td tabular text-muted">{num(r.new_visitors)}</td>
                    <td className="td tabular">{num(r.signed_in)}</td>
                    <td className="td tabular font-semibold text-good-700">{num(r.paid)}</td>
                    <td className="td tabular">{rupees(r.revenue_paise)}</td>
                    <td className="td tabular">{pct(r.paid, r.visitors)}</td>
                  </tr>
                ))}
              </Table>
            ) : <div className="card px-4 py-8 text-center text-sm text-muted">No visitors in this period yet.</div>}
          </Section>
        </>
      ) : null}
    </State>
  );
}
