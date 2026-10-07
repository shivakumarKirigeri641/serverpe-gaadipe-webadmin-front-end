import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { useSession } from '../lib/session.jsx';
import { Section, SourceChip, Stat, State, StatusChip, stepWords, Table } from '../components/ui.jsx';
import { ago, dateTime, duration, num, rupees, sessionCode } from '../lib/format';

/**
 * LEADS & DROP-OFFS (spec §28, §120–122). Leads: customers scored by what they
 * did — a behavioural signal, never a fact about the person; the weights are
 * yours to change. Stuck now: on the site with no action for a while, by step.
 * Abandoned: visits that stopped at the search, the sign-in code, the report or
 * the payment. Nobody is contacted from here.
 */
const BAND = { very_hot: ['🔥 Very hot', 'bg-wrong-50 text-wrong-700'], hot: ['Hot', 'bg-watch-50 text-watch-700'], warm: ['Warm', 'bg-brand/10 text-brand'], cold: ['Cold', 'bg-shell text-muted'] };
const WAITS = [[30, '30 s'], [60, '1 min'], [180, '3 min'], [300, '5 min']];

export default function Leads() {
  const [tab, setTab] = useState('leads');
  return (
    <>
      <h1 className="text-lg font-semibold">Leads & drop-offs</h1>
      <p className="text-2xs text-muted">Behavioural signals from what visitors did on the site — not facts about them. Nobody is contacted from here.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[['leads', 'Leads'], ['stuck', 'Stuck now'], ['abandoned', 'Abandoned'], ['weights', 'Scoring rules']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip border !px-3 !py-1 ${tab === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>))}
      </div>
      <div className="mt-4">
        {tab === 'leads' ? <LeadList /> : tab === 'stuck' ? <Stuck /> : tab === 'abandoned' ? <Abandoned /> : <Weights />}
      </div>
    </>
  );
}

function LeadList() {
  const [band, setBand] = useState('');
  const { data, error, loading, reload } = useLoad((quiet) => api.leads({ band }, quiet), [band], { everyMs: 60000 });
  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['very_hot', 'hot', 'warm', 'cold'].map((k) => (
              <button key={k} onClick={() => setBand(band === k ? '' : k)} className={`card px-4 py-3 text-left ${band === k ? 'ring-2 ring-brand/40' : ''}`}>
                <span className={`chip ${BAND[k][1]}`}>{BAND[k][0]}</span><div className="tabular mt-1 text-2xl font-bold text-ink">{num(data.counts[k])}</div>
              </button>))}
          </div>
          <p className="mt-2 text-2xs text-muted">Customers seen in the last {data.days} days. Tap a band to filter.</p>
          <div className="mt-2">
            {data.rows.length ? (
              <Table head={['Customer', 'Score', 'Signal', 'Why', 'Came from', 'Last seen']}>
                {data.rows.map((l) => (
                  <tr key={l.user_id}>
                    <td className="td"><Link className="text-ink hover:underline" to={`/web/customers/${l.user_id}`}>{l.name || '-'}</Link><div className="tabular text-2xs text-muted">{l.mobile}</div></td>
                    <td className="td tabular text-lg font-bold">{l.score}</td>
                    <td className="td"><span className={`chip ${BAND[l.band][1]}`}>{BAND[l.band][0]}</span><div className="mt-1 text-2xs text-muted">{l.intent} (signal)</div></td>
                    <td className="td max-w-[22rem] text-2xs text-muted">{l.why.join(' · ')}</td>
                    <td className="td"><SourceChip source={l.source || 'direct'} /></td>
                    <td className="td text-2xs">{ago(l.last_seen)}</td>
                  </tr>))}
              </Table>) : <div className="card px-4 py-6 text-center text-sm text-muted">Nobody in this band.</div>}
          </div>
        </>) : null}
    </State>
  );
}

function Stuck() {
  const [secs, setSecs] = useState(60);
  const { data, error, loading } = useLoad((quiet) => api.stuck(secs, quiet), [secs], { everyMs: 10000 });
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-2xs text-muted">No action for at least
        {WAITS.map(([v, l]) => <button key={v} onClick={() => setSecs(v)} className={`chip border !px-2.5 !py-1 ${secs === v ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>)}
        · updates every 10 s</div>
      <div className="mt-3">
        <State loading={loading} error={error} empty={data && !data.rows.length ? 'Nobody looks stuck right now.' : null}>
          {data?.rows.length ? (
            <Table head={['Visitor', 'Status', 'Stuck on', 'Doing nothing for', 'Last action', 'Source']}>
              {data.rows.map((r) => (
                <tr key={r.session_id}>
                  <td className="td"><Link className="text-ink hover:underline" to={`/web/sessions/${encodeURIComponent(r.session_id)}`}>{r.user_id ? (r.name || '-') : 'Anonymous visitor'}</Link>
                    <div className="font-mono text-2xs text-muted">{sessionCode(r.session_id, r.started_at)}</div></td>
                  <td className="td"><StatusChip status={r.status} /></td>
                  <td className="td text-sm">{stepWords(r.step)}<div className="text-2xs text-muted">{r.section || r.page}</div></td>
                  <td className="td tabular font-semibold text-watch-700">{duration(new Date(Date.now() - r.idle_seconds * 1000).toISOString())}</td>
                  <td className="td text-2xs">{r.action || '—'}</td>
                  <td className="td"><SourceChip source={r.source || 'direct'} /></td>
                </tr>))}
            </Table>) : null}
        </State>
      </div>
    </>
  );
}

function Abandoned() {
  const [range] = useRange();
  const { data, error, loading } = useLoad((quiet) => api.abandonedVisits(range, quiet), [range], { everyMs: 60000 });
  return (
    <State loading={loading} error={error}>
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Search abandoned" value={num(data.counts.search)} sub="searched, saw nothing more" />
            <Stat label="At the sign-in code" value={num(data.counts.otp)} sub="asked for a code, did not sign in" />
            <Stat label="Saw it, did not buy" value={num(data.counts.report)} />
            <Stat label="Payment abandoned" value={num(data.counts.payment)} tone={data.counts.payment ? 'wrong' : undefined} />
            <Stat label="Could have paid" value={rupees(data.potential_paise)} sub={`at ${rupees(data.price_paise)} a report`} />
          </div>
          <Section title="Visits">
            {data.rows.length ? (
              <Table head={['When', 'Visitor', 'Stopped', 'Vehicle', 'Source']}>
                {data.rows.map((r) => (
                  <tr key={r.session_id}>
                    <td className="td whitespace-nowrap text-2xs">{dateTime(r.last_seen_at)}</td>
                    <td className="td"><Link className="text-ink hover:underline" to={`/web/sessions/${encodeURIComponent(r.session_id)}`}>{r.user_id ? (r.name || r.mobile || '-') : 'Anonymous visitor'}</Link></td>
                    <td className="td"><span className={`chip ${r.kind === 'payment' ? 'bg-wrong-50 text-wrong-700' : 'bg-watch-50 text-watch-700'}`}>{r.label}</span></td>
                    <td className="td plate">{r.reg_no || '—'}</td>
                    <td className="td"><SourceChip source={r.source || 'direct'} /></td>
                  </tr>))}
              </Table>) : <div className="card px-4 py-6 text-center text-sm text-muted">No abandoned visits in this period.</div>}
          </Section>
        </>) : null}
    </State>
  );
}

const W_LABELS = [['landing', 'Visited'], ['vehicle_search', 'Each vehicle search (up to 3)'], ['vehicle_details', 'Each vehicle seen (up to 3)'], ['report_cta', 'Tapped Full report'],
  ['payment_page', 'Opened the payment'], ['payment_failed', 'A payment failed'], ['payment_success', 'Paid'], ['returning', 'Came back'], ['signed_in', 'Signed in']];
function Weights() {
  const { can } = useSession();
  const { data } = useLoad(() => api.leads({}), [], { everyMs: 0 });
  const [w, setW] = useState(null);
  const [msg, setMsg] = useState(null);
  const cur = w || data?.weights;
  if (!cur) return <div className="card px-4 py-4 text-sm text-muted">Loading…</div>;
  const set = (k, v) => setW({ ...cur, [k]: Number(String(v).replace(/\D/g, '').slice(0, 3)) || 0 });
  const setB = (k, v) => setW({ ...cur, bands: { ...cur.bands, [k]: Number(String(v).replace(/\D/g, '').slice(0, 3)) || 0 } });
  return (
    <div className="card max-w-xl divide-y divide-line">
      {W_LABELS.map(([k, l]) => (
        <div key={k} className="flex items-center gap-3 px-4 py-2"><span className="flex-1 text-sm">{l}</span>
          <input className="input !w-20 !py-1 text-right tabular" value={cur[k]} disabled={!can.includes('settings')} onChange={(e) => set(k, e.target.value)} /><span className="text-2xs text-muted">points</span></div>))}
      {[['warm', 'Warm from'], ['hot', 'Hot from'], ['very_hot', 'Very hot from']].map(([k, l]) => (
        <div key={k} className="flex items-center gap-3 px-4 py-2"><span className="flex-1 text-sm">{l}</span>
          <input className="input !w-20 !py-1 text-right tabular" value={cur.bands[k]} disabled={!can.includes('settings')} onChange={(e) => setB(k, e.target.value)} /><span className="text-2xs text-muted">points</span></div>))}
      <div className="flex items-center gap-3 px-4 py-2"><span className="flex-1 text-sm">Look back</span>
        <input className="input !w-20 !py-1 text-right tabular" value={cur.days} disabled={!can.includes('settings')} onChange={(e) => set('days', e.target.value)} /><span className="text-2xs text-muted">days</span></div>
      {can.includes('settings') && w ? (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5">
          {msg ? <span className="text-2xs text-good-700">{msg}</span> : null}
          <button className="btn-primary !py-1.5 text-2xs" onClick={async () => { try { await api.saveSettings({ web_lead_scoring: JSON.stringify(cur) }); setMsg('Saved.'); setW(null); } catch (e) { setMsg(e.message); } }}>Save rules</button>
        </div>) : null}
    </div>
  );
}
