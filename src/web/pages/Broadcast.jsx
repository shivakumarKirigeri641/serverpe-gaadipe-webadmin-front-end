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

export default function Broadcast() {
  const { can } = useSession();
  const { data, error, loading, reload } = useLoad(() => api.customerEmails(), [], { everyMs: 30000 });
  const [f, setF] = useState({ category: 'service', audience: 'all', mobile: '', subject: '', body: '' });
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const may = can.includes('settings');
  const r = data?.reach;
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ tone: 'bad', text: e.message }); } finally { setBusy(false); } };
  const ready = f.subject.trim().length >= 3 && f.body.trim().length >= 10 && (f.audience !== 'one' || f.mobile.length === 10);

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data ? (
        <>
          <h1 className="text-lg font-semibold">Broadcast — email</h1>
          <p className="text-2xs text-muted">From noreply. Your own words, sent a few a minute. WhatsApp broadcasts are off while the account is disabled.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Confirmed emails" value={num(r?.confirmed)} sub="can receive a broadcast" tone={r?.confirmed ? 'good' : undefined} />
            <Stat label="Opted in to offers" value={num(r?.promo_ok)} sub="can receive promotions" />
            <Stat label="Given, not confirmed" value={num(r?.unconfirmed)} sub={`${num(r?.can_ask_now)} can be asked now`} />
            <Stat label="Unsubscribed" value={num(r?.unsubscribed)} />
            <Stat label="RCS" value={data.rcs?.ready ? (data.rcs.enabled ? 'On' : 'Off') : 'Soon'} sub={data.rcs?.ready ? 'provider set up' : 'placeholder — not set up yet'} />
          </div>
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
