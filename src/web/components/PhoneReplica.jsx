import { Fragment, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';

/**
 * WHAT THE VISITOR SEES (user, 2026-10-08: "a conversational view, similar to
 * mobile — just a live replica"). The gaadipe.in chat as it is on their phone
 * right now: the bubbles, vehicle cards in summary, the chips under them and
 * what the input box is asking for. Sent by the chat page after each change
 * (back end src/site/mirror.js, memory only), read here every 2 s while open.
 * Never what is being typed; a sign-in code shows as dots, as it does for them.
 */

/* *bold* and _italic_, as the chat draws them. */
function Rich({ text }) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, k) => (
        /^\*[^*]+\*$/.test(part) ? <b key={k}>{part.slice(1, -1)}</b>
          : /^_[^_]+_$/.test(part) ? <i key={k}>{part.slice(1, -1)}</i> : <Fragment key={k}>{part}</Fragment>
      ))}
      {i < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

const time = (at) => { try { return new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

function Bubble({ it }) {
  const me = it.from === 'me';
  if (it.kind === 'typing') {
    return <div className="flex"><div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-2xs text-muted shadow-sm">typing…</div></div>;
  }
  if (it.kind === 'plate') {
    return (
      <div className="flex justify-end">
        <div className="rounded-md border-2 border-ink bg-white px-2 py-1 font-mono text-xs font-bold tracking-widest text-ink">{it.text}</div>
      </div>
    );
  }
  const card = it.card || null;
  return (
    <div className={`flex ${me ? 'justify-end' : ''}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-sm ${me ? 'rounded-tr-sm bg-[#d9f3ec] text-ink' : 'rounded-tl-sm bg-white text-ink'}`}>
        {it.kind === 'vehicle' && card ? (
          <div>
            <div className="font-mono text-2xs font-bold tracking-wider">{card.reg}</div>
            <div className="font-semibold">{card.title || '—'}</div>
            <div className="text-2xs text-muted">{[card.fuel, card.view, card.attention != null ? `${card.attention} need attention` : null].filter(Boolean).join(' · ')}</div>
          </div>
        ) : ['vehicles', 'reports', 'invoices'].includes(it.kind) && card ? (
          <div>
            <div className="font-semibold">{{ vehicles: '🚗 Their vehicles', reports: '📄 Their reports', invoices: '🧾 Their invoices' }[it.kind]} ({card.count})</div>
            {(card.items || []).filter(Boolean).map((x, i) => <div key={i} className="font-mono text-2xs">{x}</div>)}
          </div>
        ) : it.kind === 'terms' ? (
          <div><div className="font-semibold">📜 Before you sign in</div>
            <div className="text-2xs">{card?.agreed === 'yes' ? '☑ Agreed to Terms, Privacy and Refund' : '☐ Not ticked yet'}</div></div>
        ) : it.kind === 'profile' ? (
          <div className="font-semibold">👤 Profile{card?.name ? ` · ${card.name}` : ''}</div>
        ) : it.kind === 'notify' ? (
          <div>🔔 Asked to allow notifications</div>
        ) : it.text ? <Rich text={it.text} /> : <span className="text-muted">[{it.kind}]</span>}
        {it.at ? <div className="mt-0.5 text-right text-[9px] text-muted">{time(it.at)}</div> : null}
      </div>
    </div>
  );
}

export default function PhoneReplica({ sessionId, live }) {
  const { data } = useLoad((quiet) => api.webScreen(sessionId, quiet), [sessionId], { everyMs: live ? 2000 : 0 });
  const s = data?.screen || null;
  const listRef = useRef(null);
  const count = s?.items?.length || 0;
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [count, s?.age_s]);
  const lastChips = s?.items?.length ? (s.items[s.items.length - 1].chips || []) : [];

  return (
    <div className="mx-auto w-[300px] shrink-0">
      <div className="mb-1.5 flex items-center justify-between text-2xs text-muted">
        <span className="font-semibold uppercase tracking-wider">What they see now</span>
        {s ? <span>{live ? (s.age_s < 5 ? <span className="text-good-700">● just changed</span> : <span><span className="text-good-700">● live</span> · last change {s.age_s < 90 ? `${s.age_s}s` : `${Math.round(s.age_s / 60)} min`} ago</span>) : 'last seen'}</span> : null}
      </div>
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink shadow-xl">
        <div className="flex items-center gap-2 bg-[#0f766e] px-3 py-2 text-white">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-white text-[10px] font-bold text-[#0f766e]">GP</div>
          <div className="leading-tight"><div className="text-xs font-bold">GaadiPe</div><div className="text-[9px] opacity-80">{s?.page || '/chat'}</div></div>
        </div>
        <div ref={listRef} className="h-[440px] space-y-1.5 overflow-y-auto bg-gradient-to-b from-[#eaf6f3] to-[#f8f6ee] px-2 py-2">
          {!s ? (
            <div className="mt-16 px-4 text-center text-2xs text-muted">
              {live ? 'Waiting for their screen — it appears as soon as the chat changes.' : 'No screen kept for this visit (it is kept for two hours, and only for the chat).'}
            </div>
          ) : s.items.map((it, i) => <Bubble key={i} it={it} />)}
        </div>
        {s ? (
          <div className="bg-white px-2 pb-2 pt-1.5">
            {lastChips.length ? <div className="mb-1.5 flex flex-wrap gap-1">{lastChips.map((c) => <span key={c} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink">{c}</span>)}</div> : null}
            <div className="rounded-xl border border-line bg-[#f6f9f9] px-3 py-2 text-[11px] text-muted">{s.input || 'Type a vehicle number…'}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
