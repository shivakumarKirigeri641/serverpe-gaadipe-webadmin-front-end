import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../lib/live.jsx';
import { CopyId, SourceChip, StatusChip, stepWords, Table } from '../components/ui.jsx';
import { ago, customerCode, deviceOf, duration, num, placeOf, sessionCode } from '../lib/format';

/**
 * LIVE USERS (spec §6–7, §99): everyone on gaadipe.in right now, from the live
 * stream — no reloading. Each row: who (or "anonymous"), status, the step of
 * the journey and what they last did, what is on their screen, where they came
 * from, device and place, how long they have been here. Tap one for its
 * session control room.
 */
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
                  <tr key={r.session_id} className="cursor-pointer hover:bg-shell/60" onClick={() => navigate(`/sessions/${encodeURIComponent(r.session_id)}`)}>
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
