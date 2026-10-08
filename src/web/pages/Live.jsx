import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../lib/live.jsx';
import { api } from '../lib/api';
import { CopyId, SourceChip, StatusChip, stepWords, Table } from '../components/ui.jsx';
import { ago, customerCode, deviceOf, duration, num, placeOf, sessionCode } from '../lib/format';

/**
 * LIVE USERS (spec §6–7, §99): everyone on gaadipe.in right now, from the live
 * stream — no reloading. Each row: who (or "anonymous"), status, the step of
 * the journey and what they last did, what is on their screen, where they came
 * from, device and place, how long they have been here. Tap one for its
 * session control room.
 */
/*
 * DAY 1 TILL TODAY (user, 2026-10-08): visitors → signed in → converted, each a
 * total since the first day, what today added against what yesterday added
 * (▲/▼ %), and how each step turns into the next. Your own visits and ₹0 test
 * buys are left out (server: admin/totals.js). Refreshed every minute.
 */
function Change({ today, yesterday }) {
  if (!yesterday && !today) return <span className="text-muted">same as yesterday (0)</span>;
  if (!yesterday) return <span className="font-semibold text-good-700">▲ new — yesterday 0</span>;
  const d = Math.round(((today - yesterday) / yesterday) * 100);
  const cls = d > 0 ? 'text-good-700' : d < 0 ? 'text-wrong-700' : 'text-muted';
  return <span className={`font-semibold ${cls}`}>{d > 0 ? '▲' : d < 0 ? '▼' : '='} {Math.abs(d)}% <span className="font-normal text-muted">vs yesterday ({num(yesterday)})</span></span>;
}

function Totals() {
  const [t, setT] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let live = true;
    const load = () => api.totals(true).then((o) => { if (live) { setT(o); setErr(null); } }).catch((e) => live && setErr(e.message));
    load();
    const id = setInterval(load, 60000);
    return () => { live = false; clearInterval(id); };
  }, []);
  const since = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const groups = t ? [
    ['Visitors', 'Everyone who opened gaadipe.in', t.visitors, null, 'text-ink'],
    ['Signed in', 'Customer accounts', t.signed_in, t.rates.sign_in_rate != null ? `${t.rates.sign_in_rate}% of visitors` : null, 'text-brand'],
    ['Converted', 'Paid at least once', t.converted, t.rates.buy_rate != null ? `${t.rates.buy_rate}% of signed in` : null, 'text-good-700'],
  ] : [];
  return (
    <div className="card rise mb-4 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Day 1 till today</h2>
        <span className="text-2xs text-muted">Your own visits and test buys left out · India time · updates every minute</span>
      </div>
      {err ? <div className="text-sm text-wrong-700">Could not load: {err}</div> : !t ? <div className="text-sm text-muted">Loading…</div> : (
        <div className="grid gap-3 md:grid-cols-3">
          {groups.map(([label, about, g, rate, cls], i) => (
            <div key={label} className="relative rounded-xl border border-line p-3">
              {i > 0 ? <span className="absolute -left-3 top-1/2 hidden -translate-y-1/2 text-muted md:block" aria-hidden="true">›</span> : null}
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{label}</div>
                {rate ? <span className="chip bg-shell text-2xs text-ink">{rate}</span> : null}
              </div>
              <div className={`tabular text-3xl font-bold ${cls}`}>{num(g.total)}</div>
              <div className="text-2xs text-muted">{about} · since {since(g.first_day)}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-2xs">
                <div><div className="text-muted">Till yesterday</div><div className="tabular text-sm font-semibold text-ink">{num(g.until_yesterday)}</div></div>
                <div><div className="text-muted">New today</div><div className="tabular text-sm font-semibold text-ink">+{num(g.today)}</div></div>
              </div>
              <div className="mt-1.5 text-2xs"><Change today={g.today} yesterday={g.yesterday} /></div>
            </div>
          ))}
        </div>
      )}
      {t ? (
        <div className="mt-2 text-2xs text-muted">
          Today: {t.rates.sign_in_rate_today != null ? `${t.rates.sign_in_rate_today}% of today's new visitors signed in` : 'no new visitors yet'}
          {t.rates.buy_rate_today != null ? ` · ${t.rates.buy_rate_today}% of today's new sign-ins paid` : ''}
        </div>
      ) : null}
    </div>
  );
}

const FILTERS = [['all', 'Everyone'], ['ONLINE', 'Online'], ['IDLE', 'Idle'], ['HIDDEN', 'Tab hidden'], ['signed', 'Signed in'], ['anon', 'Anonymous'], ['pay', 'At payment']];

export default function Live() {
  const { presence, conn } = useLive();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const c = presence?.counts || {};
  const rows = (presence?.rows || []).filter((r) => filter === 'all' || r.status === filter
    || (filter === 'signed' && r.user_id) || (filter === 'anon' && !r.user_id) || (filter === 'pay' && /pay/.test(r.step || '')));

  return (
    <>
      <Totals />
      <div className="flex flex-wrap items-end gap-4">
        <div className="card rise flex items-center gap-4 px-5 py-4">
          <div>
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Active now</div>
            <div className="tabular text-4xl font-bold text-ink">{presence ? num(c.active) : '…'}</div>
          </div>
          <span className={`h-3 w-3 rounded-full ${conn.state === 'live' ? 'live-dot bg-good-500' : 'bg-watch-500'}`} aria-hidden="true" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[['Online', c.online, 'text-good-700'], ['Idle', c.idle, 'text-watch-700'], ['Tab hidden', c.hidden], ['Signed in', c.signed_in],
            ['Anonymous', c.anonymous], ['Checking a vehicle', c.checking], ['Signing in', c.signing_in], ['At payment', c.at_payment, 'text-brand']].map(([l, v, cls]) => (
            <div key={l} className="card px-3 py-2"><div className="text-2xs text-muted">{l}</div><div className={`tabular text-lg font-bold ${cls || 'text-ink'}`}>{presence ? num(v) : '…'}</div></div>))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`chip border !px-3 !py-1 ${filter === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>))}
        <span className="ml-auto text-2xs text-muted">{conn.mode === 'poll' ? 'Updating every 5 s' : 'Live — updates as it happens'}</span>
      </div>

      <div className="mt-3">
        {!presence ? <div className="card px-4 py-8 text-center text-sm text-muted">Connecting…</div>
          : !rows.length ? <div className="card px-4 py-8 text-center text-sm text-muted">{c.active ? 'Nobody matches this filter.' : 'Nobody is on gaadipe.in right now.'}</div>
            : (
              <Table head={['Visitor', 'Status', 'Journey step', 'Doing now', 'Came from', 'Device · place', 'Here for']}>
                {rows.map((r) => (
                  <tr key={r.session_id} className="cursor-pointer hover:bg-shell/60" onClick={() => navigate(`/web/sessions/${encodeURIComponent(r.session_id)}`)}>
                    <td className="td">
                      <div className="text-ink">{r.user_id ? (r.name || '-') : 'Anonymous visitor'}{r.returning ? <span className="ml-1.5 chip bg-shell text-muted">returning</span> : null}</div>
                      <div className="tabular text-2xs text-muted">{r.mobile || ''}</div>
                      <CopyId value={sessionCode(r.session_id, r.started_at)} />
                      {r.user_id ? <CopyId value={customerCode(r.user_id)} className="ml-2" /> : null}
                    </td>
                    <td className="td"><StatusChip status={r.status} /><div className="mt-1 text-2xs text-muted">seen {ago(r.last_seen_at)}</div></td>
                    <td className="td text-sm text-ink">{stepWords(r.step)}<div className="max-w-[12rem] truncate font-mono text-2xs text-muted">{r.page}</div></td>
                    <td className="td text-sm">{r.action || <span className="text-muted">—</span>}
                      <div className="text-2xs text-muted">{r.section ? `On screen: ${r.section}` : ''}{r.scroll_pct != null ? ` · scrolled ${r.scroll_pct}%` : ''}</div>
                      {r.last_action_at ? <div className="text-2xs text-muted">{ago(r.last_action_at)}</div> : null}</td>
                    <td className="td"><SourceChip source={r.source || 'direct'} />{r.campaign ? <div className="max-w-[9rem] truncate text-2xs text-muted">{r.campaign}</div> : null}</td>
                    <td className="td text-2xs">{deviceOf(r.device)}<div className="text-muted">{placeOf(r.place)}</div></td>
                    <td className="td tabular text-sm">{duration(r.started_at)}<div className="text-2xs text-muted">{num(r.pages)} pages · {num(r.interactions)} taps</div></td>
                  </tr>))}
              </Table>
            )}
      </div>
    </>
  );
}
