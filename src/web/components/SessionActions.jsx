import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';

/**
 * THE CONTROLS (spec §70–71, §86–90, §114): each asks first, says what it will
 * do, takes a reason, and is written to the audit log with the state before and
 * after. Buttons a role may not use are not shown.
 */
export function Confirm({ title, body, danger, needReason, confirmLabel = 'Confirm', onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={onClose}>
      <div className="rise w-full max-w-md rounded-xl bg-white px-5 py-4 shadow-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-body">{body}</p>
        <label className="mt-3 block"><span className="label">Reason{needReason ? '' : ' (optional)'}</span>
          <input className="input !py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus /></label>
        {err ? <div className="mt-2 rounded-lg bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{err}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-quiet !py-2 text-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`${danger ? 'btn bg-wrong-500 text-white hover:bg-wrong-700' : 'btn-primary'} !py-2 text-sm`} disabled={busy || (needReason && !reason.trim())}
            onClick={async () => { setBusy(true); setErr(null); try { await onConfirm(reason.trim()); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }}>
            {busy ? '…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function useAsk() {
  const [ask, setAsk] = useState(null);
  return [ask ? <Confirm {...ask} onClose={() => setAsk(null)} /> : null, setAsk];
}

/* One visit: end it; its monitoring on/off; the browser's monitoring. */
export default function SessionActions({ session: s, onDone }) {
  const { can } = useSession();
  const [dialog, ask] = useAsk();
  const mon = useLoad(() => api.monitoring({ session: s.session_id, user: s.user_id || '', visitor: s.visitor_id }), [s.session_id], { everyMs: 0 });
  const off = mon.data?.target?.off; const by = mon.data?.target?.by;
  const ended = ['ENDED', 'TERMINATED'].includes(s.status);
  if (!can.includes('tasks.manage')) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <span className={`chip ${off ? 'bg-shell text-muted' : 'bg-good-50 text-good-700'}`}>{off ? `○ Monitoring off (${by})` : '● Monitoring active'}</span>
      {!off ? (
        <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={() => ask({ title: 'Pause monitoring for this visit?', confirmLabel: 'Pause monitoring',
          body: 'Taps, focused fields and scroll depth stop being recorded for this visit. Sign-in, checks and payments are still recorded — they are how GaadiPe works.',
          onConfirm: async (reason) => { await api.setMonitoring({ scope: 'session', ref: s.session_id, off: true, reason }); mon.reload(); } })}>⏸ Pause monitoring</button>
      ) : by === 'session' ? (
        <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={async () => { await api.setMonitoring({ scope: 'session', ref: s.session_id, off: false }); mon.reload(); }}>▶ Resume monitoring</button>
      ) : null}
      {can.includes('block') && !off ? (
        <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={() => ask({ title: 'Stop monitoring this browser?', confirmLabel: 'Stop for this browser',
          body: 'Every visit from this browser, now and later, stops sending taps, focused fields and scroll depth — until it is switched back on in Settings → Privacy & monitoring.',
          onConfirm: async (reason) => { await api.setMonitoring({ scope: 'device', ref: s.visitor_id, off: true, reason }); mon.reload(); } })}>Stop for this browser</button>
      ) : null}
      {!ended ? (
        <button className="btn !px-3 !py-1.5 text-2xs border border-wrong-500/30 bg-wrong-50 text-wrong-700" onClick={() => ask({
          title: 'End this visit?', danger: true, confirmLabel: 'End the visit',
          body: `The visit is marked TERMINATED and its page signs out within 20 seconds.${s.user_id ? ' This browser’s sign-in ends now; their other devices stay signed in.' : ''}`,
          onConfirm: async (reason) => { await api.endVisit(s.session_id, reason); onDone?.(); } })}>⛔ End this visit</button>
      ) : null}
      {dialog}
    </div>
  );
}

/* One customer: flags, sign out everywhere, monitoring, resend the link, export. */
export function CustomerActions({ customer: c, onDone }) {
  const { can } = useSession();
  const [dialog, ask] = useAsk();
  const flags = useLoad(() => api.customerFlags(c.id), [c.id], { everyMs: 0 });
  const mon = useLoad(() => api.monitoring({ user: c.id }), [c.id], { everyMs: 0 });
  const [msg, setMsg] = useState(null);
  const off = mon.data?.target?.off; const by = mon.data?.target?.by;
  const say = (text, tone = 'good') => { setMsg({ text, tone }); setTimeout(() => setMsg(null), 6000); };
  const exportIt = async () => {
    const out = await api.exportCustomer(c.id);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gaadipe-customer-${c.id}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('Exported. The download has their visits, payments, reports, devices, consents and flags.');
  };
  return (
    <div className="flex max-w-xl flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {(flags.data?.rows || []).map((f) => (
          <span key={f.id} className="chip bg-watch-50 text-watch-700" title={`${f.reason || ''} — ${f.admin || ''}`}>⚑ {f.flag.replace(/_/g, ' ')}
            {can.includes('tasks.manage') ? <button className="ml-1" aria-label="Clear flag" onClick={async () => { await api.clearFlag(f.id); flags.reload(); }}>×</button> : null}</span>))}
        <span className={`chip ${off ? 'bg-shell text-muted' : 'bg-good-50 text-good-700'}`}>{off ? `○ Monitoring off (${by})` : '● Monitoring active'}</span>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {can.includes('tasks.manage') ? (
          <select className="input !w-auto !py-1 text-2xs" value="" onChange={(e) => { const f = e.target.value; if (f) ask({ title: `Flag as “${f.replace(/_/g, ' ')}”?`, confirmLabel: 'Add flag', needReason: true,
            body: 'Flags are for admins only; the customer never sees them.', onConfirm: async (reason) => { await api.addFlag(c.id, f, reason); flags.reload(); } }); }}>
            <option value="">⚑ Flag…</option>{(flags.data?.kinds || []).map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>) : null}
        {c.email && !c.email_verified_at && can.includes('tasks.manage') ? (
          <button className="btn-quiet !px-3 !py-1 text-2xs" onClick={async () => { try { const o = await api.resendConfirmation(c.id); say(`Confirmation link queued for ${o.to}.`); } catch (e) { say(e.message, 'bad'); } }}>✉️ Resend email link</button>) : null}
        <button className="btn-quiet !px-3 !py-1 text-2xs" onClick={() => exportIt().catch((e) => say(e.message, 'bad'))}>⬇ Export activity</button>
        {can.includes('block') ? (
          off && by === 'customer'
            ? <button className="btn-quiet !px-3 !py-1 text-2xs" onClick={async () => { await api.setMonitoring({ scope: 'customer', ref: c.id, off: false }); mon.reload(); }}>▶ Resume monitoring</button>
            : !off ? <button className="btn-quiet !px-3 !py-1 text-2xs" onClick={() => ask({ title: 'Stop monitoring this customer?', confirmLabel: 'Stop monitoring',
              body: 'On every device, taps, focused fields and scroll depth stop being recorded for this customer. Sign-in, checks and payments are still recorded.',
              onConfirm: async (reason) => { await api.setMonitoring({ scope: 'customer', ref: c.id, off: true, reason }); mon.reload(); } })}>⏸ Stop monitoring</button> : null
        ) : null}
        {can.includes('block') ? (
          <button className="btn !px-3 !py-1 text-2xs border border-wrong-500/30 bg-wrong-50 text-wrong-700" onClick={() => ask({ title: 'Sign this customer out everywhere?', danger: true, confirmLabel: 'Sign out everywhere', needReason: true,
            body: 'Every sign-in on every device ends now, and any open GaadiPe page signs out within 20 seconds. They can sign in again with their mobile number.',
            onConfirm: async (reason) => { const o = await api.signOutCustomer(c.id, null, reason); say(`Signed out: ${o.sign_ins_ended} sign-in${o.sign_ins_ended === 1 ? '' : 's'} ended, ${o.open_pages_ended} open page${o.open_pages_ended === 1 ? '' : 's'}.`); onDone?.(); } })}>↪ Sign out everywhere</button>) : null}
      </div>
      {msg ? <div className={`rounded-lg px-3 py-1.5 text-2xs ${msg.tone === 'good' ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>{msg.text}</div> : null}
      {dialog}
    </div>
  );
}

/* One sign-in device of a customer (spec §89–90): sign that device out. */
export function DeviceSignOut({ userId, deviceKey, onDone }) {
  const { can } = useSession();
  const [dialog, ask] = useAsk();
  if (!can.includes('block') || !deviceKey) return null;
  return (
    <>
      <button className="btn-quiet !px-2.5 !py-1 text-2xs text-wrong-700" onClick={() => ask({ title: 'Sign out this device?', danger: true, confirmLabel: 'Sign out device',
        body: 'Only this device’s sign-in ends; the customer stays signed in elsewhere.', onConfirm: async (reason) => { await api.signOutCustomer(userId, deviceKey, reason); onDone?.(); } })}>Sign out</button>
      {dialog}
    </>
  );
}
