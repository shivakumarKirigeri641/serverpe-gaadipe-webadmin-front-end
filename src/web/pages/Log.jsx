import { useEffect, useState } from 'react';
import { useLive } from '../lib/live.jsx';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, SourceChip, State } from '../components/ui.jsx';
import { dateTime, num, time } from '../lib/format';

/**
 * EVERY EVENT AND TRIGGER, IN WORDS (user, 2026-10-07). Newest first, refreshed
 * every 20 seconds. Red rows are the ones that went wrong: a failed sign-in, a
 * vehicle not found, a payment that failed, an email that did not go.
 */
const KINDS = [
  ['', 'Everything', '📋'], ['visit', 'Visits', '👀'], ['chat', 'Chat checks', '🆓'], ['signin', 'Sign-ins', '🔐'],
  ['check', 'Checks', '🔎'], ['payment', 'Payments', '💳'], ['notify', 'Notifications', '🔔'], ['email', 'Emails to you', '✉️'],
];

const EMAIL_NAMES = {
  visit: 'website visit', sign_in: 'sign-in', web_check: 'website check', chat_check: 'free chat check', push_on: 'notifications on',
  payment: 'payment', left_at_pay: 'unpaid ₹19', contact: 'contact message', feedback: 'feedback',
  daily_summary: 'daily summary', alert: 'alert', security: 'security',
};

/** One row in plain words: [icon, sentence]. */
function say(r) {
  const who = r.mobile ? ` · ${r.mobile}` : '';
  const reg = r.reg_no ? ` ${r.reg_no}` : '';
  switch (r.kind) {
    case 'visit':
      if (r.what === 'session_started') return ['👀', 'A visitor arrived', r.detail];
      if (r.what === 'payment_page_viewed') return ['💳', 'The ₹19 payment page was opened', ''];
      if (r.what === 'page_view') return ['📄', `Opened ${r.detail || 'a page'}`, ''];
      return ['👆', `Tapped ${r.what.replace(/_/g, ' ')}`, r.detail];
    case 'chat':
      return [r.ok ? '🆓' : '⚠️', `Free check in the chat:${reg} — ${r.ok ? 'found' : 'not found / failed'}`, r.detail ? `device ${r.detail}` : ''];
    case 'signin': {
      const m = { code_requested: 'Asked for a sign-in code', signed_in: 'Signed in', signed_out: 'Signed out',
        sign_in_failed: 'Sign-in failed (wrong code)', code_refused: 'Sign-in code refused' };
      return [r.ok ? '🔐' : '⛔', `${m[r.what] || r.what.replace(/_/g, ' ')}${who}`, r.detail];
    }
    case 'check':
      if (r.what === 'full_view') return ['📑', `Opened the full report of${reg}${who}`, ''];
      return [r.ok ? '🔎' : '⚠️', `Checked${reg} on the website${who} — ${r.ok ? 'found' : 'not found / failed'}${r.what === 'vehicle_check_repeat' ? ' (repeat)' : ''}`, ''];
    case 'payment': {
      const s = r.what.replace('payment_', '');
      const m = { paid: 'Paid', created: 'Started a payment', failed: 'Payment failed', cancelled: 'Payment cancelled' };
      return [s === 'paid' ? '✅' : r.ok ? '💳' : '❌', `${m[s] || `Payment ${s}`} ${r.detail}${reg ? ` for${reg}` : ''}${who}`, ''];
    }
    case 'notify':
      return ['🔔', `Allowed notifications${who}`, r.detail];
    case 'email':
      return [r.ok ? '✉️' : '📛', `Email to you: ${EMAIL_NAMES[r.what] || r.what.replace(/_/g, ' ')}${r.ok ? '' : ' — NOT SENT'}`, r.ok ? r.detail : `Why: ${r.detail}`];
    default:
      return ['•', r.what, r.detail];
  }
}

/* ── THE LIVE FEED (spec §13): the stream's events as they arrive, in words ── */
const LIVE_KINDS = [
  ['', 'Everything'], ['users', '👀 Visitors'], ['auth', '🔐 Sign-in'], ['vehicles', '🔎 Vehicles'], ['payments', '💳 Payments'],
  ['api', '🔌 API'], ['errors', '⛔ Errors'], ['reports', '📄 Reports'], ['alerts', '🔔 Alerts'],
];
const inGroup = (i, g) => !g || (g === 'users' && ['visit', 'page', 'interaction'].includes(i.kind)) || (g === 'auth' && i.kind === 'signin')
  || (g === 'vehicles' && ['check', 'chat'].includes(i.kind)) || (g === 'payments' && i.kind === 'payment') || (g === 'api' && i.kind === 'api')
  || (g === 'errors' && i.ok === false) || (g === 'reports' && (i.kind === 'report' || i.name === 'full_view')) || (g === 'alerts' && i.kind === 'alert');

export function sayLive(i) {
  const who = i.mobile ? ` · ${i.mobile}` : '';
  const reg = i.reg_no ? ` ${i.reg_no}` : '';
  switch (i.kind) {
    case 'visit': return ['👀', `New visit${i.source ? ` from ${i.source.replace(/_/g, ' ')}` : ''}`, i.page];
    case 'page': return ['📄', `Opened ${i.page || 'a page'}`, ''];
    case 'interaction': return [i.ikind === 'error' ? '⚠️' : i.ikind === 'focus' ? '⌨️' : i.ikind === 'search' ? '🔎' : '👆', i.label || 'Tapped', i.section ? `on ${i.section}` : (i.page || '')];
    case 'signin': return [i.ok ? '🔐' : '⛔', `${{ code_requested: 'Asked for a sign-in code', signed_in: 'Signed in', signed_out: 'Signed out', sign_in_failed: 'Sign-in failed', code_refused: 'Code refused' }[i.name] || i.name}${who}`, i.detail];
    case 'chat': return [i.ok ? '🆓' : '⚠️', `Free check in the chat:${reg} — ${i.ok ? 'found' : 'not found / failed'}`, ''];
    case 'check': return i.name === 'full_view' ? ['📑', `Opened the full report of${reg}${who}`, ''] : [i.ok ? '🔎' : '⚠️', `Checked${reg}${who} — ${i.ok ? 'found' : 'not found / failed'}`, i.detail];
    case 'payment': return i.name === 'payment_success' ? ['✅', `Payment received ₹${Math.round((i.amount_paise || 0) / 100)}${reg ? ` for${reg}` : ''}${who}`, i.detail]
      : ['💳', `Payment started ₹${Math.round((i.amount_paise || 0) / 100)}${reg ? ` for${reg}` : ''}${who}`, i.detail];
    case 'api': return ['🔌', `API failed${reg}`, i.detail];
    case 'alert': return [{ critical: '🔴', warning: '🟠', success: '🟢' }[i.severity] || '🔵', `Alert: ${i.detail}`, i.count > 1 ? `×${i.count}` : ''];
    case 'report': return ['📄', i.name.replace(/_/g, ' '), reg];
    default: return ['•', (i.name || '').replace(/_/g, ' '), i.detail || ''];
  }
}

function LiveFeed() {
  const { feed, conn } = useLive();
  const [g, setG] = useState('');
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState([]);
  useEffect(() => { if (!paused) setFrozen(feed); }, [feed, paused]);
  const rows = frozen.filter((i) => inGroup(i, g));
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {LIVE_KINDS.map(([k, l]) => (
          <button key={k} onClick={() => setG(k)} className={`chip shrink-0 border !px-2.5 !py-1 ${g === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-body'}`}>{l}</button>))}
        <button onClick={() => setPaused((v) => !v)} className="btn-quiet ml-auto !px-3 !py-1 text-2xs">{paused ? '▶ Resume' : '⏸ Pause'}</button>
      </div>
      <p className="mt-1 text-2xs text-muted">
        {conn.mode === 'poll' ? 'This browser cannot stream — the list below refreshes every 20 seconds.'
          : conn.state === 'live' ? `● Connected · live since this page opened · ${rows.length} new event${rows.length === 1 ? '' : 's'}${paused ? ' · paused' : ''}`
            : 'Connecting to the live stream… (the list below still refreshes every 20 seconds)'}
      </p>
      <ol className="card mt-2 divide-y divide-line">
        {rows.length ? rows.map((i) => {
          const [icon, text, sub] = sayLive(i);
          return (
            <li key={i.key} className={`rise flex gap-3 px-4 py-2 ${i.ok === false ? 'bg-wrong-50/60' : ''}`}>
              <span className="tabular w-16 shrink-0 pt-0.5 text-2xs text-muted">{new Date(i.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="w-5 shrink-0 text-center">{icon}</span>
              <span className="min-w-0 flex-1 text-sm"><span className={i.ok === false ? 'font-semibold text-wrong-700' : 'text-ink'}>{text}</span>
                {sub ? <span className="block break-words text-2xs text-muted">{sub}</span> : null}</span>
            </li>);
        }) : <li className="px-4 py-4 text-center text-sm text-muted">No new event since this page opened — the latest ones are below.</li>}
      </ol>
      <Earlier />
    </>
  );
}

/* EARLIER TODAY (2026-10-07: "Event stream always says waiting"). The live feed
   only holds what arrives after the page opens; this keeps the screen useful on a
   quiet hour — today's latest 40, refreshed every 20 seconds. */
function Earlier() {
  const { data } = useLoad((quiet) => api.log({ range: 'today', limit: 40 }, quiet), [], { everyMs: 20000 });
  if (!data?.rows?.length) return null;
  return (
    <>
      <h2 className="mt-4 text-2xs font-semibold uppercase tracking-wider text-muted">Earlier today</h2>
      <ol className="card mt-1.5 divide-y divide-line">
        {data.rows.map((r, i) => {
          const [icon, text, sub] = say(r);
          return (
            <li key={`${r.kind}-${r.ref}-${i}`} className={`flex gap-3 px-4 py-2 ${!r.ok ? 'bg-wrong-50/60' : ''}`}>
              <span className="tabular w-16 shrink-0 pt-0.5 text-2xs text-muted" title={dateTime(r.at)}>{time(r.at)}</span>
              <span className="w-5 shrink-0 text-center">{icon}</span>
              <span className="min-w-0 flex-1 text-sm"><span className={r.ok ? 'text-ink' : 'font-semibold text-wrong-700'}>{text}</span>
                {sub ? <span className="block break-words text-2xs text-muted">{sub}</span> : null}</span>
            </li>);
        })}
      </ol>
    </>
  );
}

export default function Log() {
  const [tab, setTab] = useState('live');
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-lg font-semibold">Event stream</h1>
        {[['live', '● Live'], ['history', 'History']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip border !px-3 !py-1 ${tab === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>))}
      </div>
      {tab === 'live' ? <LiveFeed /> : <History />}
    </>
  );
}

function History() {
  const [range] = useRange();
  const [kind, setKind] = useState('');
  const [pages, setPages] = useState(false);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad(
    (quiet) => api.log({ range, kind, q: term, pages: pages ? 1 : '', limit: 300 }, quiet), [range, kind, term, pages], { everyMs: 20000 });

  let lastDay = null;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">History</h2>
          <p className="text-2xs text-muted">Every event and trigger on the website, newest first. Red means something went wrong.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Mobile, vehicle or text" />
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {KINDS.map(([k, label, icon]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`chip shrink-0 border !px-2.5 !py-1 ${kind === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-body'}`}>
            {icon} {label}{k && data?.counts ? <span className="opacity-70">{num(data.counts[k])}</span> : null}
          </button>
        ))}
      </div>
      {(kind === '' || kind === 'visit') ? (
        <label className="mt-2 inline-flex items-center gap-2 text-2xs text-muted">
          <input type="checkbox" checked={pages} onChange={(e) => setPages(e.target.checked)} className="accent-[#0f766e]" />
          Also show every page opened
        </label>
      ) : null}

      <div className="mt-3">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'Nothing in this period.' : null}>
          {data?.rows.length ? (
            <ol className="card divide-y divide-line">
              {data.rows.map((r, i) => {
                const [icon, text, sub] = say(r);
                const day = new Date(r.at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
                const head = day !== lastDay ? day : null; lastDay = day;
                return (
                  <li key={`${r.kind}-${r.ref}-${i}`} className={!r.ok ? 'bg-wrong-50/60' : ''}>
                    {head && range !== 'today' ? <div className="bg-shell px-4 py-1 text-2xs font-semibold text-muted">{head}</div> : null}
                    <div className="flex gap-3 px-4 py-2">
                      <span className="tabular w-12 shrink-0 pt-0.5 text-2xs text-muted" title={dateTime(r.at)}>{time(r.at)}</span>
                      <span className="w-5 shrink-0 text-center">{icon}</span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className={r.ok ? 'text-ink' : 'font-semibold text-wrong-700'}>{text}</span>
                        {r.kind === 'visit' && r.source && r.what === 'session_started' ? <> <SourceChip source={r.source} /></> : null}
                        {sub ? <span className="block break-words text-2xs text-muted">{sub}</span> : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </State>
        {data?.rows.length >= 300 ? <p className="mt-2 text-center text-2xs text-muted">Showing the latest 300. Pick a kind or search to narrow it.</p> : null}
      </div>
    </>
  );
}
