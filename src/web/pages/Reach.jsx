import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { Search, Stat, State, Table } from '../components/ui.jsx';
import { ago, dateTime, num } from '../lib/format';

/**
 * SMS & NOTIFICATIONS (user, 2026-10-10: "SMS template for manual sends to specific
 * users; SMS status for all users — yet to send, sent, next to send; the web
 * notifications the same"). Every customer with, per channel, what they last got,
 * how many, what is queued next and the next automatic message; tick customers and
 * send an SMS (an approved template only) or a notification, now or at a time.
 * The SMS templates are placeholders until their DLT ids are put in Settings.
 */
const KIND = {
  otp: 'Sign-in code', expiry: 'Expiry warning', challan: 'Challan alert', monitor_end: 'Monitoring ending', service: 'One-time notice',
  offers: 'Offer', manual: 'Manual', renewal: 'Renewal reminder', watch: 'Daily status', ticket: 'Ticket reply', challans: 'Challans added',
};
const kindOf = (k) => KIND[k] || (k ? k.replace(/_/g, ' ') : '—');
const TONE = { sent: 'bg-good-50 text-good-700', simulated: 'bg-shell text-muted', skipped: 'bg-watch-50 text-watch-700', failed: 'bg-wrong-50 text-wrong-700', no_device: 'bg-shell text-muted' };
const WORD = { sent: 'Sent', simulated: 'Simulated', skipped: 'Skipped', failed: 'Failed', no_device: 'No device' };
const FILTERS = {
  sms: [['all', 'Everyone'], ['sms_never', 'Yet to send'], ['sms_sent', 'Sent'], ['sms_failed', 'Failed / skipped'], ['queued', 'Next to send (queued)']],
  push: [['all', 'Everyone'], ['push_on', 'Notifications on'], ['push_never', 'Yet to send'], ['queued', 'Next to send (queued)']],
};

export default function Reach() {
  const [channel, setChannel] = useState('sms');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [open, setOpen] = useState(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setFilter('all'); setPicked(new Set()); }, [channel]);

  const over = useLoad((quiet) => api.reach(quiet), [], { everyMs: 30000 });
  const list = useLoad((quiet) => api.reachUsers({ filter, q: term, limit: 300 }, quiet), [filter, term], { everyMs: 30000 });
  const o = over.data;
  const rows = list.data?.rows || [];
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = rows.length > 0 && rows.every((r) => picked.has(r.id));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">SMS & notifications</h1>
          <p className="text-2xs text-muted">What each customer has had by SMS and browser notification, what is queued next, and the next automatic message. Tick customers to send by hand.</p>
        </div>
        <div className="flex gap-1">
          {[['sms', '💬 SMS'], ['push', '🔔 Notifications']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setChannel(k)} className={`chip border !px-3 !py-1.5 ${channel === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>))}
        </div>
      </div>

      <State loading={over.loading} error={over.error} onRetry={over.reload}>
        {o ? (channel === 'sms' ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="SMS provider" value={o.sms.configured ? o.sms.provider : 'Not set'} sub={o.sms.configured ? 'sign-in codes go out' : 'nothing is really sent here'} tone={o.sms.configured ? 'good' : 'watch'} />
            <Stat label="Automatic SMS" value={o.sms.alerts_enabled ? 'On' : 'Off'} sub="sms_alerts_enabled — expiry, challan, monitoring ending" tone={o.sms.alerts_enabled ? 'good' : undefined} />
            <Stat label="Sent · 30 days" value={num(o.last30.sms.sent || 0)} sub={`${num(o.last30.sms.failed || 0)} failed · ${num(o.last30.sms.skipped || 0)} skipped`} />
            <Stat label="Queued" value={num(o.queued.sms)} sub="waiting to go" />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Customers with notifications on" value={num(o.reach.push_customers)} sub={`of ${num(o.reach.customers)} customers`} tone={o.reach.push_customers ? 'good' : undefined} />
            <Stat label="Sent · 30 days" value={num(o.last30.push.sent || 0)} sub={`${num(o.last30.push.failed || 0)} failed · ${num(o.last30.push.no_device || 0)} had no device`} />
            <Stat label="Queued" value={num(o.queued.push)} sub="waiting to go" />
          </div>
        )) : null}
      </State>

      {o && channel === 'sms' ? (
        <div className="mt-3 card px-4 py-3 text-2xs">
          <div className="font-semibold text-ink">SMS templates (DLT) — each goes out only once its approved message id is in Settings</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(o.sms.templates).map(([k, ok]) => (
              <span key={k} className={`chip ${ok ? 'bg-good-50 text-good-700' : 'bg-shell text-muted'}`}>{ok ? '✓' : '○'} {kindOf(k)} · sms_tpl_{k}</span>))}
          </div>
          <div className="mt-2 text-muted">Manual SMS: {o.sms.manual.approved ? 'approved' : 'placeholder — not approved yet'} · {o.sms.manual.vars} variable{o.sms.manual.vars === 1 ? '' : 's'}
            {o.sms.manual.text ? <> · wording: <span className="text-ink">“{o.sms.manual.text}”</span></> : ' · put the approved wording in sms_tpl_manual_text'}</div>
        </div>) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS[channel].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`chip border !px-3 !py-1 ${filter === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>))}
        </div>
        <Search value={q} onChange={setQ} placeholder="Mobile or name" />
      </div>

      {picked.size ? <Compose channel={channel} ids={[...picked]} over={o} onDone={() => { setPicked(new Set()); list.reload(); over.reload(); }} onClear={() => setPicked(new Set())} /> : null}

      <div className="mt-3">
        <State loading={list.loading} error={list.error} onRetry={list.reload} empty={list.data && !rows.length ? 'No customers match.' : null}>
          {rows.length ? (
            <Table head={[<input key="all" type="checkbox" aria-label="Choose all" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(rows.map((r) => r.id)))} />,
              'Customer', 'Status', 'Last sent', 'Sent', 'Next to send', 'Next automatic']}>
              {rows.map((r) => {
                const c = channel === 'sms'
                  ? { status: r.sms_last_status, kind: r.sms_last_kind, at: r.sms_last_at, err: r.sms_last_error, sent: r.sms_sent, next: r.sms_next_at, nextKind: r.sms_next_kind, queued: r.sms_queued }
                  : { status: r.push_last_status, kind: r.push_last_kind, at: r.push_last_at, err: r.push_last_error, sent: r.push_sent, next: r.push_next_at, nextKind: r.push_next_kind, queued: r.push_queued };
                const yet = !c.sent && !c.status;
                return (
                  <tr key={r.id} className="cursor-pointer hover:bg-shell/60" onClick={() => setOpen(r)}>
                    <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Choose ${r.name || r.mobile}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="td"><Link onClick={(e) => e.stopPropagation()} className="text-brand hover:underline" to={`/web/customers/${r.id}`}>{r.name || '—'}</Link>
                      <div className="tabular text-2xs text-muted">{r.mobile}{r.is_internal ? ' · you' : ''}{channel === 'push' ? ` · ${r.push_devices ? `🔔 ${r.push_devices} device${r.push_devices === 1 ? '' : 's'}` : 'no device'}` : r.offers_ok ? ' · takes offers' : ''}</div></td>
                    <td className="td">{yet ? <span className="chip bg-shell text-muted">Yet to send</span> : <span className={`chip ${TONE[c.status] || 'bg-shell text-muted'}`}>{WORD[c.status] || c.status}</span>}</td>
                    <td className="td text-2xs">{c.at ? <>{kindOf(c.kind)} · {ago(c.at)}{c.err ? <div className="text-wrong-700">{c.err}</div> : null}</> : '—'}</td>
                    <td className="td tabular">{num(c.sent)}</td>
                    <td className="td text-2xs">{c.next ? <>{channel === 'sms' ? kindOf(c.nextKind) : c.nextKind} · {dateTime(c.next)}{c.queued > 1 ? <div className="text-muted">+{c.queued - 1} more</div> : null}</> : '—'}</td>
                    <td className="td text-2xs">{r.next_auto ? <>{r.next_auto.what}<div className="text-muted">around {r.next_auto.at}{channel === 'sms' && !o?.sms.alerts_enabled ? ' · SMS off: email / notification only' : ''}</div></> : '—'}</td>
                  </tr>);
              })}
            </Table>) : null}
        </State>
      </div>
      {open ? <History row={open} onClose={() => setOpen(null)} onChanged={() => { list.reload(); over.reload(); }} /> : null}
    </>
  );
}

/* Sending by hand: an approved SMS template, or a notification — now or at a time; SEND typed to confirm. */
function Compose({ channel, ids, over, onDone, onClear }) {
  const [kind, setKind] = useState('manual');
  const vars = kind === 'manual' ? (over?.sms.manual.vars ?? 1) : 0;
  const [vals, setVals] = useState(['']);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/chat');
  const [when, setWhen] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const approved = channel === 'push' || over?.sms.templates?.[kind];
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      const out = await api.reachSend({ channel, kind: channel === 'sms' ? kind : 'manual', user_ids: ids, vals: vals.slice(0, vars), title, body, url,
        send_at: when ? new Date(when).toISOString() : undefined });
      setMsg({ ok: true, text: `Queued for ${out.queued} customer${out.queued === 1 ? '' : 's'} — ${when ? `at ${dateTime(out.send_at)}` : 'going out within a minute'}.` });
      setConfirm(''); setTimeout(onDone, 1200);
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };
  return (
    <div className="mt-3 card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">{channel === 'sms' ? '💬 Send an SMS' : '🔔 Send a notification'} to {num(ids.length)} customer{ids.length === 1 ? '' : 's'}</div>
        <button type="button" className="btn-quiet !px-3 !py-1 text-2xs" onClick={onClear}>Clear choice</button>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {channel === 'sms' ? (
          <>
            <label className="text-2xs text-muted">Template
              <select className="input mt-1 !py-2 text-sm" value={kind} onChange={(e) => { setKind(e.target.value); setVals(['']); }}>
                <option value="manual">Manual SMS {over?.sms.templates?.manual ? '' : '(not approved yet)'}</option>
                <option value="service">One-time notice {over?.sms.templates?.service ? '' : '(not approved yet)'}</option>
              </select>
              {kind === 'manual' && over?.sms.manual.text ? <div className="mt-1 text-ink">“{over.sms.manual.text}”</div> : null}
            </label>
            <div className="space-y-1">
              {Array.from({ length: vars }).map((_, i) => (
                <label key={i} className="block text-2xs text-muted">Value {i + 1} (up to 30 characters)
                  <input className="input mt-1 !py-2 text-sm" maxLength={30} value={vals[i] || ''} onChange={(e) => setVals((v) => { const n = [...v]; n[i] = e.target.value; return n; })} />
                </label>))}
              {!vars ? <div className="pt-5 text-2xs text-muted">This template has no values to fill.</div> : null}
            </div>
          </>
        ) : (
          <>
            <label className="text-2xs text-muted">Title<input className="input mt-1 !py-2 text-sm" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="GaadiPe: …" /></label>
            <label className="text-2xs text-muted">Line<input className="input mt-1 !py-2 text-sm" maxLength={300} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            <label className="text-2xs text-muted">Opens<input className="input mt-1 !py-2 text-sm" maxLength={200} value={url} onChange={(e) => setUrl(e.target.value)} /></label>
          </>
        )}
        <label className="text-2xs text-muted">When (empty = now)<input type="datetime-local" className="input mt-1 !py-2 text-sm" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
        <label className="text-2xs text-muted">Type SEND to confirm<input className="input mt-1 !py-2 text-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      </div>
      {!approved ? <div className="mt-2 rounded-lg bg-watch-50 px-3 py-2 text-2xs text-watch-700">This template is a placeholder: put its approved DLT message id in Settings (sms_tpl_{kind}) and it can be sent.</div> : null}
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="btn-primary !py-2 text-2xs" disabled={busy || confirm !== 'SEND' || !approved || (channel === 'push' && (!title.trim() || !body.trim()))} onClick={send}>{busy ? 'Queuing…' : when ? 'Schedule' : 'Send now'}</button>
        {msg ? <span className={`text-2xs ${msg.ok ? 'text-good-700' : 'text-wrong-700'}`}>{msg.text}</span> : null}
      </div>
    </div>
  );
}

/* One customer: every SMS and notification, and what is queued (cancel before it goes). */
function History({ row, onClose, onChanged }) {
  const { data, error, loading, reload } = useLoad(() => api.reachUser(row.id), [row.id], { everyMs: 0 });
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <aside className="rise h-full w-full max-w-md overflow-y-auto bg-white px-4 py-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{row.name || row.mobile}</h2>
          <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={onClose}>Close</button>
        </div>
        <div className="text-2xs text-muted">{row.mobile} · {row.push_devices ? `🔔 ${row.push_devices} device(s)` : 'no notification device'}{row.next_auto ? ` · next automatic: ${row.next_auto.what} (${row.next_auto.at})` : ''}</div>
        <State loading={loading} error={error}>
          {data ? (
            <>
              <div className="mt-3 text-2xs font-semibold uppercase tracking-wider text-muted">Queued</div>
              {data.queue.length ? data.queue.map((q) => (
                <div key={q.id} className="mt-1.5 flex items-start justify-between gap-2 rounded-lg bg-shell px-3 py-2 text-sm">
                  <div className="min-w-0"><div className="text-ink">{q.channel === 'sms' ? `💬 ${kindOf(q.kind)}` : `🔔 ${q.title}`}</div>
                    <div className="text-2xs text-muted">{dateTime(q.send_at)} · {q.status}{q.result ? ` · ${q.result}` : ''}</div></div>
                  {q.status === 'queued' ? <button type="button" className="btn-quiet !px-2 !py-1 text-2xs" onClick={async () => { await api.reachCancel(q.id); reload(); onChanged(); }}>Cancel</button> : null}
                </div>)) : <div className="mt-1 text-2xs text-muted">Nothing queued.</div>}
              <div className="mt-4 text-2xs font-semibold uppercase tracking-wider text-muted">Sent and tried</div>
              {data.log.length ? data.log.map((l) => (
                <div key={l.id} className="mt-1.5 flex gap-2 text-sm">
                  <span className="w-5 shrink-0 text-center">{l.channel === 'sms' ? '💬' : '🔔'}</span>
                  <div className="min-w-0">
                    <div className="text-ink">{kindOf(l.kind)} <span className={`chip ml-1 ${TONE[l.status] || ''}`}>{WORD[l.status] || l.status}</span></div>
                    <div className="text-2xs text-muted">{dateTime(l.created_at)}{l.preview ? ` · ${l.preview}` : ''}{l.error ? ` · ${l.error}` : ''}</div>
                  </div>
                </div>)) : <div className="mt-1 text-2xs text-muted">No SMS or notification yet — yet to send.</div>}
            </>
          ) : null}
        </State>
      </aside>
    </div>
  );
}
