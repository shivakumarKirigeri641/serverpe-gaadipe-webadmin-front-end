import { useEffect, useState } from 'react';
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
  sign_in: 'sign-in', web_check: 'website check', chat_check: 'free chat check', push_on: 'notifications on',
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

export default function Log() {
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
          <h1 className="text-lg font-semibold">Log</h1>
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
