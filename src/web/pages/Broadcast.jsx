import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';
import { Section, Stat, State, Table } from '../components/ui.jsx';
import { dateTime, num } from '../lib/format';

/**
 * BROADCAST — EMAIL (user, 2026-10-07: "bulk mails from noreply for promotions,
 * marketing, alerts, notifications; not a template, I write my own, but with
 * guidelines and professional"). The main admin's customer-email campaigns,
 * here with the rules beside the box: confirmed addresses only, promotions only
 * to people who opted in, an unsubscribe link in every email, a test to
 * yourself first, and SEND typed to confirm. RCS appears as soon as it is set up.
 */
const GUIDE = [
  ['Subject', 'Say what it is about in under 60 characters. No ALL CAPS, no “FREE!!!”, no ₹ signs in the subject — spam filters punish them.'],
  ['First line', 'Start with the one thing that matters to them: their vehicle, their report, a date. Use {name} for their first name.'],
  ['Honest', 'Never promise what GaadiPe does not do. Do not write “Government”, “official”, “VAHAN” or “Parivahan” as if GaadiPe were one of them.'],
  ['Short', 'Three short paragraphs at most. One link (gaadipe.in/chat) and one clear ask.'],
  ['Promotions', 'Offers and discounts go only to customers who ticked “tips & offers” — chosen for you when you pick “Promotion”.'],
  ['Unsubscribe', 'Added to every email automatically. Do not remove or hide it, and never mail someone who unsubscribed.'],
  ['Timing', 'Send between 10 am and 8 pm. Not more than one promotion a week to the same people.'],
  ['Test first', 'Always send a test to yourself and read it on your phone before sending to customers.'],
];

/*
 * THE LISTS BEHIND THE COUNTS (user, 2026-10-08: "can I see the list of
 * confirmed and unconfirmed mails"). Tap a count; the people in it, searchable,
 * with when they confirmed, whether they take offers and when they were last
 * asked to confirm. A CSV of what is shown, for your own records.
 */
const LIST_TITLE = { confirmed: 'Confirmed emails — a broadcast reaches them', unconfirmed: 'Given, not confirmed — a broadcast cannot reach them', unsubscribed: 'Unsubscribed — never mailed' };
function EmailList({ which, onClose }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const { data, error, loading, reload } = useLoad(() => api.emailLists({ which, q: term }), [which, term]);
  const rows = data?.rows || [];
  const csv = () => {
    const head = ['Name', 'Mobile', 'Email', 'Confirmed', 'Offers', 'Last asked to confirm', 'Unsubscribed', 'Signed up via', 'Emails sent'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((x) => [x.name, x.mobile, x.email, x.email_verified_at && dateTime(x.email_verified_at), x.promo_consent_at ? 'yes' : 'no',
      x.last_asked && dateTime(x.last_asked), x.email_unsubscribed_at && dateTime(x.email_unsubscribed_at), x.signup_channel, x.emails_sent].map(esc).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    a.download = `gaadipe-emails-${which}.csv`; a.click();
  };
  return (
    <Section title={LIST_TITLE[which]} hint={`${num(rows.length)} shown`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input className="input !w-64 !py-1.5 text-sm" placeholder="Search name, mobile or email" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setTerm(q.trim()); }} />
        <button className="btn-quiet !py-1.5 text-2xs" onClick={() => setTerm(q.trim())}>Search</button>
        <button className="btn-quiet !py-1.5 text-2xs" disabled={!rows.length} onClick={csv}>Download CSV</button>
        <button className="btn-quiet ml-auto !py-1.5 text-2xs" onClick={onClose}>Close</button>
      </div>
      <State loading={loading} error={error} onRetry={reload} empty={data && !rows.length ? 'Nobody in this list.' : null}>
        {rows.length ? (
          <Table head={['Customer', 'Email', which === 'unsubscribed' ? 'Unsubscribed' : which === 'confirmed' ? 'Confirmed' : 'Last asked to confirm', 'Offers', 'Signed up', 'Emails sent']}>
            {rows.map((x) => (
              <tr key={x.id}>
                <td className="td"><div className="text-ink">{x.name || '-'}</div><div className="tabular text-2xs text-muted">{x.mobile}</div></td>
                <td className="td text-2xs break-all">{x.email}</td>
                <td className="td whitespace-nowrap text-2xs">{which === 'unsubscribed' ? dateTime(x.email_unsubscribed_at) : which === 'confirmed' ? dateTime(x.email_verified_at) : (x.last_asked ? dateTime(x.last_asked) : 'never')}</td>
                <td className="td text-2xs">{x.promo_consent_at ? <span className="chip bg-good-50 text-good-700">yes</span> : <span className="text-muted">no</span>}</td>
                <td className="td text-2xs">{x.signup_channel || '-'}<div className="text-muted">{dateTime(x.created_at)}</div></td>
                <td className="td tabular text-2xs">{num(x.emails_sent)}</td>
              </tr>))}
          </Table>) : null}
      </State>
    </Section>
  );
}

export default function Broadcast() {
  const { can } = useSession();
  const { data, error, loading, reload } = useLoad(() => api.customerEmails(), [], { everyMs: 30000 });
  const [f, setF] = useState({ category: 'service', audience: 'all', mobile: '', subject: '', body: '' });
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const may = can.includes('settings');
  const r = data?.reach;
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ tone: 'bad', text: e.message }); } finally { setBusy(false); } };
  const ready = f.subject.trim().length >= 3 && f.body.trim().length >= 10 && (f.audience !== 'one' || f.mobile.length === 10);

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data ? (
        <>
          <h1 className="text-lg font-semibold">Broadcast — email · RCS soon</h1>
          <p className="text-2xs text-muted">From noreply. Your own words, sent a few a minute. RCS will be added once it is set up.</p>
          {/* The broadcast's own switch (2026-10-07: "I switched it on, why is it off?" — it is this one). */}
          <label className={`mt-2 flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm ${data.write_enabled ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>
            <input type="checkbox" className="h-4 w-4 accent-[#0f766e]" checked={Boolean(data.write_enabled)} disabled={!may || busy}
              onChange={(e) => run(async () => { await api.saveSettings({ admin_customer_email_enabled: e.target.checked ? 'true' : 'false' }); reload(); })} />
            <span><b>Write to customers</b> — {data.write_enabled ? 'on: broadcasts can be sent.' : 'off: nothing can be sent until this is ticked.'}</span>
            <span className="text-2xs opacity-70">(setting admin_customer_email_enabled — separate from the automatic customer emails)</span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <button type="button" className="text-left" onClick={() => setList(list === 'confirmed' ? null : 'confirmed')}>
              <Stat label="Confirmed emails" value={num(r?.confirmed)} sub={list === 'confirmed' ? 'list shown below ▾' : 'can receive a broadcast · tap for the list'} tone={r?.confirmed ? 'good' : undefined} />
            </button>
            <Stat label="Opted in to offers" value={num(r?.promo_ok)} sub="can receive promotions" />
            <button type="button" className="text-left" onClick={() => setList(list === 'unconfirmed' ? null : 'unconfirmed')}>
              <Stat label="Given, not confirmed" value={num(r?.unconfirmed)} sub={list === 'unconfirmed' ? 'list shown below ▾' : `${num(r?.can_ask_now)} can be asked now · tap for the list`} />
            </button>
            <button type="button" className="text-left" onClick={() => setList(list === 'unsubscribed' ? null : 'unsubscribed')}>
              <Stat label="Unsubscribed" value={num(r?.unsubscribed)} sub={list === 'unsubscribed' ? 'list shown below ▾' : 'tap for the list'} />
            </button>
            <Stat label="RCS" value={data.rcs?.ready ? (data.rcs.enabled ? 'On' : 'Off') : 'Soon'} sub={data.rcs?.ready ? 'provider set up' : 'placeholder — not set up yet'} />
          </div>
          {list ? <EmailList which={list} onClose={() => setList(null)} /> : null}
          {r?.can_ask_now && may ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-watch-50 px-3 py-2 text-sm text-watch-700">
              {num(r.can_ask_now)} customer{r.can_ask_now === 1 ? '' : 's'} gave an email but never confirmed it — a broadcast cannot reach them.
              <button className="btn-quiet !py-1 text-2xs" disabled={busy} onClick={() => run(async () => { const o = await api.askToConfirm(); setMsg({ tone: 'good', text: `Confirmation email queued for ${o.queued}.` }); reload(); })}>Ask them to confirm</button>
            </div>) : null}
          {msg ? <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${msg.tone === 'good' ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>{msg.text}</div> : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="card space-y-3 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {[['email', 'Email', true], ['rcs', 'RCS (coming soon)', false], ['whatsapp', 'WhatsApp (disabled)', false]].map(([k, l, on]) => (
                  <span key={k} className={`chip border !px-3 !py-1 ${on ? 'border-brand bg-brand text-white' : 'border-line bg-shell text-muted'}`} title={on ? '' : 'Not available yet'}>{l}</span>))}
              </div>
              <label className="block"><span className="label">What kind of email</span>
                <select className="input !py-2" value={f.category} onChange={(e) => { setF({ ...f, category: e.target.value }); setPreview(null); }}>
                  {Object.entries(data.categories || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="label">To</span>
                  <select className="input !py-2" value={f.audience} onChange={(e) => { setF({ ...f, audience: e.target.value }); setPreview(null); }}>
                    {Object.entries(data.audiences || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select></label>
                {f.audience === 'one' ? (
                  <label className="block"><span className="label">Their mobile</span>
                    <input className="input tabular !py-2" inputMode="numeric" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>) : null}
              </div>
              <label className="block"><span className="label">Subject ({f.subject.length}/60 recommended)</span>
                <input className="input !py-2" maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Your vehicle’s PUC — a quick reminder, {name}" /></label>
              <label className="block"><span className="label">Message — blank lines make paragraphs; {'{name}'} is their first name</span>
                <textarea className="input min-h-[180px] !py-2 text-sm" maxLength={10000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
                  placeholder={'Hi {name},\n\n…\n\nOpen GaadiPe: https://gaadipe.in/chat'} /></label>
              {f.subject && /[A-Z]{6,}|!!|free!|₹/i.test(f.subject) ? <p className="text-2xs text-watch-700">⚠️ The subject has capitals, “!!”, “free!” or ₹ — spam filters may hide it.</p> : null}
              <div className="flex flex-wrap gap-2">
                <button className="btn-quiet !py-2 text-sm" disabled={!may || busy || !ready} onClick={() => run(async () => setPreview(await api.emailPreview(f)))}>Preview & count</button>
                <button className="btn-quiet !py-2 text-sm" disabled={!may || busy || !ready} onClick={() => run(async () => { const o = await api.emailTest(f); setMsg({ tone: 'good', text: `Test sent to ${o.to}. Read it on your phone before sending.` }); })}>Send a test to me</button>
              </div>
              {preview ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-shell px-3 py-2 text-sm">
                    <b>{num(preview.will_send)}</b> will receive it ({num(preview.matched)} in this audience, {num(preview.confirmed)} confirmed{f.category === 'promotion' ? ' and opted in to offers' : ''}).
                    {preview.test_mode?.length ? <div className="text-2xs text-watch-700">Test mode is on: only {preview.test_mode.join(', ')} will get it.</div> : null}
                  </div>
                  <iframe title="Preview" srcDoc={preview.html} className="h-[420px] w-full rounded-lg border border-line bg-white" sandbox="" />
                  <div className="flex flex-wrap items-center gap-2">
                    <input className="input !w-40 !py-2 text-sm" placeholder="Type SEND" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <button className="btn-primary !py-2 text-sm" disabled={!may || busy || confirm !== 'SEND' || !preview.will_send}
                      onClick={() => run(async () => { const o = await api.emailSend({ ...f, confirm: 'SEND' }); setMsg({ tone: 'good', text: `Queued for ${o.campaign?.recipients ?? 0} customer(s). It goes out a few a minute.` }); setPreview(null); setConfirm(''); reload(); })}>
                      Send to {num(preview.will_send)}</button>
                  </div>
                </div>) : null}
              {!may ? <p className="text-2xs text-muted">Your role can see broadcasts but not send them.</p> : null}
            </div>
            <div className="card px-4 py-3">
              <div className="text-[15px] font-semibold">Guidelines</div>
              <ul className="mt-2 space-y-2 text-sm">{GUIDE.map(([h, t]) => <li key={h}><b className="text-ink">{h}.</b> <span className="text-body">{t}</span></li>)}</ul>
            </div>
          </div>

          <Section title="Campaigns">
            {data.campaigns?.length ? (
              <Table head={['When', 'Subject', 'Kind', 'To', 'Sent', 'Waiting', 'Failed', '']}>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="td whitespace-nowrap text-2xs">{dateTime(c.created_at)}</td><td className="td text-sm">{c.subject}</td>
                    <td className="td text-2xs">{c.category || 'service'}</td><td className="td text-2xs">{c.audience}</td>
                    <td className="td tabular">{num(c.sent)}</td><td className="td tabular">{num(c.pending)}</td><td className="td tabular">{num(c.failed)}</td>
                    <td className="td">{c.pending && may ? <button className="btn-quiet !px-2.5 !py-1 text-2xs" onClick={() => run(async () => { await api.emailCancel(c.id); reload(); })}>Stop</button> : null}</td>
                  </tr>))}
              </Table>) : <div className="card px-4 py-4 text-sm text-muted">No broadcasts yet.</div>}
          </Section>
        </>) : null}
    </State>
  );
}
