import ReportButtons from '../../components/ReportButtons.jsx';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { Section, State, Table } from '../components/ui.jsx';
import { ApiTrace } from '../components/Journey.jsx';
import { ago, dateTime, num } from '../lib/format';

/**
 * VEHICLES (spec §16): look one up by its number — what GaadiPe holds for it,
 * who checked it, its reports, and every records-API call made for it.
 */
export default function Vehicles() {
  const { reg } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(reg || '');
  const { data, error, loading } = useLoad(() => (reg ? api.vehicle(reg) : Promise.resolve(null)), [reg], { everyMs: 0 });
  const v = data?.vehicle;
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold">Vehicles</h1><p className="text-2xs text-muted">Owner details are not shown here.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); const r = q.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (r) navigate(`/web/vehicles/${r}`); }} className="flex gap-2">
          <input className="input !w-48 !py-1.5 uppercase tracking-wider" placeholder="KA01AB1234" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary !py-1.5 text-2xs">Look up</button>
        </form>
      </div>
      {reg ? (
        <div className="mt-4">
          <State loading={loading} error={error}>
            {data ? (
              <>
                <div className="card px-4 py-4">
                  <div className="plate text-xl">{data.reg_no}</div>
                  {v ? (
                    <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                      <div><span className="text-2xs text-muted">Make · model</span><div>{[v.maker, v.model].filter(Boolean).join(' · ') || '—'}</div></div>
                      <div><span className="text-2xs text-muted">Type · fuel</span><div>{[v.vehicle_class, v.fuel].filter(Boolean).join(' · ') || '—'}</div></div>
                      <div><span className="text-2xs text-muted">Registered</span><div>{day(v.reg_date)} · RC {v.rc_status || '—'}</div></div>
                      <div><span className="text-2xs text-muted">Insurance</span><div>{day(v.insurance_upto)}</div></div>
                      <div><span className="text-2xs text-muted">PUC</span><div>{day(v.pucc_upto)}</div></div>
                      <div><span className="text-2xs text-muted">Fitness · tax · permit</span><div>{day(v.fitness_upto)} · {day(v.tax_upto)} · {day(v.permit_upto)}</div></div>
                      <div><span className="text-2xs text-muted">Owner no. · loan</span><div>{v.owner_serial ?? '—'} · {v.financer ? 'financed' : 'no loan on record'}</div></div>
                      <div><span className="text-2xs text-muted">Blacklist</span><div>{v.blacklist_status || '—'}</div></div>
                      <div><span className="text-2xs text-muted">Last refreshed</span><div>{ago(v.last_seen_at)}</div></div>
                    </div>) : <p className="mt-2 text-sm text-muted">GaadiPe has no stored record of this vehicle.</p>}
                  <div className="mt-2 text-2xs text-muted">{num(data.checks.free)} free checks · {num(data.checks.signed_in)} signed-in checks</div>
                </div>
                <Section title="Who checked it">
                  {data.customers.length ? (
                    <Table head={['Customer', 'Checks', 'Last']}>
                      {data.customers.map((c) => <tr key={c.id}><td className="td"><Link className="text-ink hover:underline" to={`/web/customers/${c.id}`}>{c.name || '-'}</Link><div className="tabular text-2xs text-muted">{c.mobile}</div></td><td className="td tabular">{num(c.check_count)}</td><td className="td text-2xs">{ago(c.last_checked_at)}</td></tr>)}
                    </Table>) : <div className="card px-4 py-4 text-sm text-muted">No signed-in customer has checked it.</div>}
                </Section>
                <Section title="Reports">
                  {data.reports.length ? (
                    <Table head={['Report', 'Issued', 'Valid until', 'Channel', 'Customer', 'Open']}>
                      {data.reports.map((r) => <tr key={r.id}><td className="td font-mono text-2xs">{r.report_number}</td><td className="td text-2xs">{dateTime(r.created_at)}</td><td className="td text-2xs">{dateTime(r.valid_until)}</td><td className="td text-2xs">{r.channel}</td>
                        <td className="td">{r.user_id ? <Link className="text-2xs text-brand" to={`/web/customers/${r.user_id}`}>open →</Link> : '—'}</td>
                        <td className="td"><ReportButtons id={r.id} compact /></td></tr>)}
                    </Table>) : <div className="card px-4 py-4 text-sm text-muted">No reports.</div>}
                </Section>
                <Section title="Records-API calls"><ApiTrace rows={data.api} /></Section>
              </>) : null}
          </State>
        </div>) : <div className="card mt-4 px-4 py-8 text-center text-sm text-muted">Type a vehicle number above.</div>}
    </>
  );
}
