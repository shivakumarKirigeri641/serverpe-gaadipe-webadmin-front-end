import ReportButtons from '../../components/ReportButtons.jsx';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useLive } from '../lib/live.jsx';
import { CopyId, Section, SourceChip, Stat, State, StatusChip, stepWords, Table } from '../components/ui.jsx';
import Timeline from '../components/Timeline.jsx';
import Journey, { ApiTrace } from '../components/Journey.jsx';
import { CustomerActions, DeviceSignOut } from '../components/SessionActions.jsx';
import { ago, customerCode, dateTime, deviceCode, deviceOf, duration, num, placeOf, rupees, sessionCode } from '../lib/format';

/**
 * THE CUSTOMER CONTROL ROOM (spec §14, §30, §62, §89, §92). One customer, all of
 * it: ONLINE now? and doing what — from the live stream; totals and behaviour;
 * the journey their latest visit reached and its timeline; every session and
 * device; vehicles, payments, reports; the API calls behind their vehicles;
 * internal notes. Website and WhatsApp are one account.
 */
const TABS = [['activity', 'Latest visit'], ['sessions', 'Sessions'], ['devices', 'Devices'], ['vehicles', 'Vehicles'], ['payments', 'Payments & reports'], ['api', 'API trace'], ['notes', 'Notes']];

export default function CustomerRoom() {
  const { id } = useParams();
  const live = useLive();
  const [tab, setTab] = useState('activity');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const nowRows = (live?.presence?.rows || []).filter((r) => r.user_id === String(id));
  const { data, error, loading, reload } = useLoad((quiet) => api.webCustomer(id, quiet), [id], { everyMs: nowRows.length ? 5000 : 30000 });
  const c = data?.customer;
  const now = nowRows[0] || null;

  return (
    <State loading={loading} error={error} onRetry={reload} empty={data && !c ? 'No such customer.' : null}>
      {c ? (
        <>
          <div className="card px-4 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold">{c.name || '-'}</h1>
                  {now ? <StatusChip status={now.status} /> : <span className="chip bg-shell text-muted">○ Not on the site</span>}
                  {c.deactivated_at ? <span className="chip bg-wrong-50 text-wrong-700">Deactivated</span> : null}
                  {c.wa_messages ? <span className="chip bg-good-50 text-good-700">WhatsApp customer</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <CopyId value={customerCode(c.id)} /><span className="tabular text-2xs text-muted">{c.mobile}</span>
                  {c.email ? <span className="text-2xs text-muted">{c.email} {c.email_verified_at ? '✓' : '(not confirmed)'}</span> : null}
                  <span className="text-2xs text-muted">customer since {dateTime(c.created_at)}</span>
                </div>
              </div>
              <CustomerActions customer={c} onDone={reload} />
            </div>
            {now ? (
              <div className="mt-3 grid gap-2 rounded-lg bg-good-50/60 px-3 py-2.5 text-sm sm:grid-cols-4">
                <div><div className="text-2xs text-muted">Session</div><Link className="font-mono text-2xs text-brand" to={`/web/sessions/${encodeURIComponent(now.session_id)}`}>{sessionCode(now.session_id, now.started_at)} →</Link></div>
                <div><div className="text-2xs text-muted">Current page · step</div><div className="text-ink">{stepWords(now.step)} <span className="font-mono text-2xs text-muted">{now.page}</span></div></div>
                <div><div className="text-2xs text-muted">Doing now</div><div className="text-ink">{now.action || '—'}</div>{now.section ? <div className="text-2xs text-muted">On screen: {now.section}</div> : null}</div>
                <div><div className="text-2xs text-muted">Session duration</div><div className="tabular text-ink">{duration(now.started_at)}</div><div className="text-2xs text-muted">{deviceOf(now.device)}</div></div>
              </div>) : null}
            {data.latest ? <div className="mt-3"><Journey stages={data.latest.stages} /></div> : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Revenue" value={rupees(c.revenue_paise)} sub={`${num(c.purchases)} purchase${c.purchases === 1 ? '' : 's'} · ${num(c.unpaid_attempts)} unpaid`} tone={c.purchases ? 'good' : undefined} />
            <Stat label="Vehicles" value={num(c.vehicles)} sub={`${num(c.searches)} searches · ${num(c.watching)} watched`} />
            <Stat label="Visits" value={num(c.sessions)} sub={`avg ${duration(new Date(Date.now() - c.avg_seconds * 1000).toISOString())} · ${num(c.pages)} pages`} />
            <Stat label="Report conversion" value={c.conversion_pct != null ? `${c.conversion_pct}%` : '—'} sub={`${num(c.reports)} reports`} />
            <Stat label="Alerts reach them" value={c.push_devices ? `🔔 ${c.push_devices}` : c.email_verified_at && !c.email_unsubscribed_at ? '✉️ email' : '⚠️ no way'} sub={c.push_devices && c.email_verified_at ? 'and email' : ''} tone={!c.push_devices && !c.email_verified_at ? 'wrong' : undefined} />
            <Stat label="First visit" value={c.first_visit ? ago(c.first_visit) : '—'} sub={c.first_visit ? dateTime(c.first_visit) : 'no website visit recorded'} />
            <Stat label="Last visit" value={c.last_visit ? ago(c.last_visit) : '—'} sub={c.last_visit ? dateTime(c.last_visit) : ''} />
            <Stat label="WhatsApp" value={num(c.wa_messages)} sub="messages, before the ban" />
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip border !px-3 !py-1 ${tab === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>)}
          </div>
          <div className="mt-3">
            {tab === 'activity' ? (data.latest ? <Timeline items={data.latest.timeline} linkedAt /> : <div className="card px-4 py-4 text-sm text-muted">No website visit recorded yet.</div>) : null}
            {tab === 'sessions' ? (
              <Table head={['Session', 'Status', 'Started', 'Duration', 'Last step', 'Source', 'Device']}>
                {data.sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td className="td"><Link className="font-mono text-2xs text-brand" to={`/web/sessions/${encodeURIComponent(s.session_id)}`}>{sessionCode(s.session_id, s.started_at)} →</Link></td>
                    <td className="td"><StatusChip status={s.status} /></td>
                    <td className="td text-2xs">{dateTime(s.started_at)}</td>
                    <td className="td tabular text-2xs">{duration(s.started_at, new Date(s.ended_at || s.last_seen_at).getTime())}</td>
                    <td className="td text-2xs">{stepWords(s.step)}</td>
                    <td className="td"><SourceChip source={s.source || 'direct'} /></td>
                    <td className="td text-2xs">{deviceOf(s.device)}</td>
                  </tr>))}
              </Table>) : null}
            {tab === 'devices' ? (
              <div className="space-y-3">
                <Table head={['Browser (device)', 'Type', 'Place', 'Came from', 'Visits', 'First seen', 'Last seen']}>
                  {data.devices.map((d) => (
                    <tr key={d.visitor_id}><td className="td"><CopyId value={deviceCode(d.visitor_id)} /></td><td className="td text-2xs">{deviceOf(d.device)}</td><td className="td text-2xs">{placeOf(d.place)}</td>
                      <td className="td"><SourceChip source={d.source} /></td><td className="td tabular">{num(d.sessions)}</td><td className="td text-2xs">{dateTime(d.first_seen_at)}</td><td className="td text-2xs">{ago(d.last_seen_at)}</td></tr>))}
                </Table>
                <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Signed in on</div>
                <Table head={['Device', 'Browser', 'City', 'Sign-ins', 'Last', '']}>
                  {data.sign_in_devices.map((d, i) => (
                    <tr key={d.device_id || i}><td className="td text-2xs">{d.model || d.os || '—'}</td><td className="td text-2xs">{d.browser}</td><td className="td text-2xs">{d.city || '—'}</td><td className="td tabular">{num(d.sign_ins)}</td><td className="td text-2xs">{ago(d.last_at)}</td><td className="td"><DeviceSignOut userId={c.id} deviceKey={d.device_id} onDone={reload} /></td></tr>))}
                </Table>
                <p className="text-2xs text-muted">{num(data.open_sign_ins.length)} sign-in{data.open_sign_ins.length === 1 ? '' : 's'} still open (they stay signed in for up to a year unless signed out).</p>
              </div>) : null}
            {tab === 'vehicles' ? (
              <Table head={['Vehicle', 'Make · model', 'Type · fuel', 'Insurance', 'PUC', 'Tax', 'Fitness', 'Owner · loan', 'Report', 'Checked']}>
                {data.vehicles.map((v) => (
                  <tr key={v.reg_no}>
                    <td className="td"><Link className="plate hover:underline" to={`/vehicles/${v.reg_no}`}>{v.reg_no}</Link>{v.watched ? <div className="text-2xs text-good-700">👁 watched</div> : null}</td>
                    <td className="td text-2xs">{[v.maker, v.model].filter(Boolean).join(' · ') || '-'}</td>
                    <td className="td text-2xs">{[v.vehicle_class, v.fuel].filter(Boolean).join(' · ') || '-'}</td>
                    {['insurance_upto', 'pucc_upto', 'tax_upto', 'fitness_upto'].map((k) => <td key={k} className="td text-2xs"><DocDate d={v[k]} /></td>)}
                    <td className="td text-2xs">{v.owner_serial != null ? `Owner ${v.owner_serial}` : '-'}{v.financed ? <div className="text-watch-700">loan</div> : null}{v.blacklist_status ? <div className="text-wrong-700">{v.blacklist_status}</div> : null}</td>
                    <td className="td text-2xs">{v.has_report ? (v.report_valid_until && new Date(v.report_valid_until) > new Date() ? <span className="text-good-700">valid to {dateTime(v.report_valid_until)}</span> : 'bought') : '-'}</td>
                    <td className="td text-2xs">{num(v.check_count)}× · {ago(v.last_checked_at)}</td>
                  </tr>))}
              </Table>) : null}
            {tab === 'payments' ? (
              <div className="space-y-3">
                <Table head={['Payment', 'Vehicle', 'Amount', 'Status', 'Channel', 'When']}>
                  {data.payments.map((p) => (
                    <tr key={p.id}><td className="td"><CopyId value={`GP-T-${p.id}`} /></td><td className="td plate">{p.reg_no || '—'}</td><td className="td tabular">{rupees(p.amount_paise)}</td>
                      <td className="td"><span className={`chip ${p.status === 'paid' ? 'bg-good-50 text-good-700' : 'bg-shell text-muted'}`}>{p.status}</span></td><td className="td text-2xs">{p.channel || '—'}</td><td className="td text-2xs">{dateTime(p.paid_at || p.created_at)}</td></tr>))}
                </Table>
                <Table head={['Report', 'Vehicle', 'Issued', 'Valid until', 'Open']}>
                  {data.reports.map((r) => (
                    <tr key={r.id}><td className="td font-mono text-2xs">{r.report_number}</td><td className="td plate">{r.reg_no}</td><td className="td text-2xs">{dateTime(r.created_at)}</td><td className="td text-2xs">{dateTime(r.valid_until)}</td>
                      <td className="td"><ReportButtons id={r.id} compact /></td></tr>))}
                </Table>
              </div>) : null}
            {tab === 'api' ? <ApiTrace rows={data.api} /> : null}
            {tab === 'notes' ? <Notes id={c.id} /> : null}
          </div>
        </>
      ) : null}
    </State>
  );
}

/* A document's last date, coloured by how soon it runs out — words, not colour alone. */
function DocDate({ d }) {
  if (!d) return <span className="text-muted">-</span>;
  const days = Math.floor((new Date(d) - Date.now()) / 86400e3);
  const txt = new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  return days < 0 ? <span className="font-semibold text-wrong-700">{txt} · expired</span>
    : days <= 30 ? <span className="font-semibold text-watch-700">{txt} · {days} d left</span> : <span>{txt}</span>;
}

/* Internal notes on this customer (spec §40), shared with the main admin panel. */
function Notes({ id }) {
  const { data, reload } = useLoad(() => api.notes('customer', id), [id], { everyMs: 0 });
  const [body, setBody] = useState('');
  const rows = data?.rows || data?.notes || [];
  return (
    <div className="space-y-2">
      <form className="card flex gap-2 px-3 py-3" onSubmit={async (e) => { e.preventDefault(); if (body.trim()) { await api.addNote('customer', id, body.trim()); setBody(''); reload(); } }}>
        <input className="input !py-2 text-sm" placeholder="Add an internal note (customers never see these)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        <button className="btn-primary !py-2 text-2xs" disabled={!body.trim()}>Add</button>
      </form>
      {rows.length ? rows.map((nt) => (
        <div key={nt.id} className="card px-4 py-2.5 text-sm"><div className="whitespace-pre-line text-ink">{nt.body}</div>
          <div className="mt-1 text-2xs text-muted">{nt.admin || 'Admin'} · {dateTime(nt.created_at)}{nt.withdrawn_at ? ` · withdrawn by ${nt.withdrawn_by || 'an admin'}` : ''}</div></div>))
        : <div className="card px-4 py-4 text-sm text-muted">No notes yet.</div>}
    </div>
  );
}
