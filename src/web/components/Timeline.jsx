import { useState } from 'react';

/**
 * A VISIT'S TIMELINE (spec §9–10): every event of one journey, oldest first, in
 * plain words — searchable and filterable. Before and after signing in are one
 * list; the moment the visitor became a known customer is marked.
 */
const GROUPS = [['', 'Everything'], ['pages', 'Pages'], ['taps', 'Taps & fields'], ['vehicles', 'Vehicles'], ['signin', 'Sign-in'], ['payments', 'Payments'], ['errors', 'Errors']];
const inGroup = (e, g) => !g || (g === 'pages' && ['page', 'visit'].includes(e.kind)) || (g === 'taps' && e.kind === 'interaction')
  || (g === 'vehicles' && (e.kind === 'check' || e.ikind === 'search')) || (g === 'signin' && e.kind === 'signin')
  || (g === 'payments' && ['payment', 'report'].includes(e.kind)) || (g === 'errors' && e.ok === false);

export function sayEvent(e) {
  const reg = e.reg_no ? ` ${e.reg_no}` : '';
  switch (e.kind) {
    case 'visit': return ['🚪', 'Opened GaadiPe', [e.page, e.source ? `from ${e.source.replace(/_/g, ' ')}` : '', e.referrer ? `via ${e.referrer}` : ''].filter(Boolean).join(' · ')];
    case 'page': return ['📄', `Opened ${e.page || 'a page'}`, ''];
    case 'interaction': return [e.ikind === 'error' ? '⚠️' : e.ikind === 'focus' ? '⌨️' : e.ikind === 'search' ? '🔎' : '👆', e.label || 'Tapped', [e.step ? `step: ${e.step.replace(/_/g, ' ')}` : '', e.section ? `on ${e.section}` : ''].filter(Boolean).join(' · ')];
    case 'signin': return [e.ok ? '🔐' : '⛔', { code_requested: 'Asked for a sign-in code (SMS)', signed_in: 'Signed in — customer identified', signed_out: 'Signed out', sign_in_failed: 'Sign-in failed (wrong code)', code_refused: 'Sign-in code refused' }[e.name] || e.name, e.label];
    case 'check': return e.name === 'full_view' ? ['📑', `Opened the full report of${reg}`, ''] : [e.ok ? '🔎' : '⚠️', `Vehicle${reg} checked — ${e.ok ? 'found' : 'not found / failed'}${e.name === 'vehicle_check_repeat' ? ' (again)' : ''}`, e.label];
    case 'payment': return [{ payment_success: '✅', payment_failed: '❌' }[e.name] || '💳',
      `${{ payment_started: 'Payment started', payment_success: 'Payment successful', payment_failed: 'Payment failed' }[e.name] || e.name} ₹${Math.round((e.amount_paise || 0) / 100)}${reg ? ` for${reg}` : ''}`, e.payment_id ? `GP-T-${e.payment_id}${e.ref ? ` · ${e.ref}` : ''}` : ''];
    case 'report': return ['📄', `Report generated${reg}`, e.label];
    default: return ['•', (e.name || '').replace(/_/g, ' '), e.page || ''];
  }
}

export default function Timeline({ items = [], linkedAt = null, compact = false }) {
  const [g, setG] = useState('');
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const rows = items.filter((e) => inGroup(e, g)).filter((e) => !t || JSON.stringify(sayEvent(e)).toLowerCase().includes(t));
  return (
    <div>
      {!compact ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {GROUPS.map(([k, l]) => <button key={k} onClick={() => setG(k)} className={`chip border !px-2.5 !py-1 ${g === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>)}
          <input className="input ml-auto !w-48 !py-1 text-2xs" placeholder="Search the timeline" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>) : null}
      <ol className="card divide-y divide-line">
        {rows.length ? rows.map((e) => {
          const [icon, text, sub] = sayEvent(e);
          const linked = linkedAt && e.kind === 'signin' && e.name === 'signed_in';
          return (
            <li key={e.key} className={`flex gap-3 px-4 py-2 ${e.ok === false ? 'bg-wrong-50/60' : linked ? 'bg-good-50/60' : ''}`}>
              <span className="tabular w-16 shrink-0 pt-0.5 text-2xs text-muted">{new Date(e.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="w-5 shrink-0 text-center">{icon}</span>
              <span className="min-w-0 flex-1 text-sm">
                <span className={e.ok === false ? 'font-semibold text-wrong-700' : 'text-ink'}>{text}</span>
                {linked ? <span className="chip ml-2 bg-good-50 text-good-700">IDENTITY LINKED</span> : null}
                {sub ? <span className="block break-words text-2xs text-muted">{sub}</span> : null}
              </span>
            </li>);
        }) : <li className="px-4 py-6 text-center text-sm text-muted">Nothing to show.</li>}
      </ol>
    </div>
  );
}
