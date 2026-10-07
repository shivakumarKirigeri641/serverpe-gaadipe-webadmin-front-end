import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';
import { Confirm } from '../components/SessionActions.jsx';
import { Section, State, Table } from '../components/ui.jsx';
import { dateTime } from '../lib/format';

/**
 * PRIVACY & MONITORING (spec §72, §97–98, §113, §42). What the website records
 * and what it never does; the switches; how long each kind of detail is kept;
 * and every visit, customer or browser for which monitoring is paused.
 */
const RETENTION = [
  ['web_session_retention_days', 'Visits (who was online, on what step)'],
  ['web_interaction_retention_days', 'Taps, focused fields, searches, errors'],
  ['analytics_minute_retention_days', 'Minute-by-minute figures'],
  ['activity_retention_days', 'Signed-in page and click history (older log)'],
];

export default function Privacy() {
  const { can } = useSession();
  const mon = useLoad(() => api.monitoring({}), [], { everyMs: 0 });
  const st = useLoad(() => api.settings(), [], { everyMs: 0 });
  const [ask, setAsk] = useState(null);
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState(null);
  const val = (k) => vals[k] ?? (st.data?.settings || []).find((s) => s.key === k)?.value ?? '';
  const save = async (changes, text) => {
    try { await api.saveSettings(changes); setMsg({ tone: 'good', text }); st.reload(); mon.reload(); setVals({}); }
    catch (e) { setMsg({ tone: 'bad', text: e.message }); }
  };
  const global = mon.data?.global;

  return (
    <>
      <h1 className="text-lg font-semibold">Privacy & monitoring</h1>
      {msg ? <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.tone === 'good' ? 'bg-good-50 text-good-700' : 'bg-wrong-50 text-wrong-700'}`}>{msg.text}</div> : null}

      <Section title="What the website records">
        <div className="card grid gap-4 px-4 py-3 text-sm md:grid-cols-2">
          <div><div className="mb-1 font-semibold text-good-700">Recorded</div>
            <ul className="list-disc space-y-0.5 pl-5 text-body">
              <li>Pages opened, and where a visit came from (ads, search, direct)</li>
              <li>Which button or link was tapped, by its label (emails and long numbers masked)</li>
              <li>Which field has focus — its name only</li>
              <li>Vehicle numbers searched, sign-in steps, payments and reports</li>
              <li>Scroll depth and whether the tab is visible (the heartbeat)</li>
              <li>Device type, browser and city — never a precise location</li>
            </ul></div>
          <div><div className="mb-1 font-semibold text-wrong-700">Never recorded</div>
            <ul className="list-disc space-y-0.5 pl-5 text-body">
              <li>What is typed into any field</li>
              <li>Sign-in codes (OTP) — the field is “a protected field”</li>
              <li>Passwords, card numbers, UPI PIN, CVV — GaadiPe never sees them</li>
              <li>Session tokens or cookies</li>
              <li>The screen itself — no recording, no replay</li>
              <li>Anything outside gaadipe.in</li>
            </ul></div>
        </div>
      </Section>

      <Section title="Switches">
        <State loading={mon.loading} error={mon.error}>
          <div className="card divide-y divide-line">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink">Optional monitoring, everywhere</div>
                <div className="text-2xs text-muted">Taps, focused fields and scroll depth on every visit. Sign-ins, checks and payments are always recorded — they are how GaadiPe works.</div></div>
              <span className={`chip ${global === 'off' ? 'bg-wrong-50 text-wrong-700' : 'bg-good-50 text-good-700'}`}>{global === 'off' ? 'GLOBAL OFF' : 'ACTIVE'}</span>
              {can.includes('admins') ? (global === 'off'
                ? <button className="btn-primary !py-1.5 text-2xs" onClick={() => setAsk({ title: 'Switch optional monitoring back on everywhere?', confirmLabel: 'Switch on',
                  body: 'Visits start sending taps, focused fields and scroll depth again within 20 seconds.', onConfirm: async (reason) => { await api.setMonitoring({ scope: 'global', off: false, reason }); mon.reload(); } })}>Switch on</button>
                : <button className="btn !py-1.5 text-2xs bg-wrong-500 text-white hover:bg-wrong-700" onClick={() => setAsk({ title: 'EMERGENCY: switch optional monitoring off everywhere?', danger: true, needReason: true, confirmLabel: 'Switch off everywhere',
                  body: 'Every visit stops sending taps, focused fields and scroll depth within 20 seconds. Sign-ins, checks and payments are still recorded. This is in the audit log with your reason.',
                  onConfirm: async (reason) => { await api.setMonitoring({ scope: 'global', off: true, reason }); mon.reload(); } })}>Emergency off</button>)
                : <span className="text-2xs text-muted">Only the owner can change this.</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink">Scroll depth</div><div className="text-2xs text-muted">How far down the page a visitor has scrolled, with each heartbeat.</div></div>
              <span className={`chip ${mon.data?.scroll === 'off' ? 'bg-shell text-muted' : 'bg-good-50 text-good-700'}`}>{mon.data?.scroll === 'off' ? 'Off' : 'On'}</span>
              {can.includes('settings') ? <button className="btn-quiet !py-1.5 text-2xs" onClick={() => save({ web_track_scroll: mon.data?.scroll === 'off' ? 'on' : 'off' }, 'Scroll depth switched.')}>{mon.data?.scroll === 'off' ? 'Switch on' : 'Switch off'}</button> : null}
            </div>
          </div>
        </State>
      </Section>

      <Section title="How long each detail is kept" hint="Days. Older detail is deleted every hour; payments and invoices are kept as the law requires.">
        <div className="card divide-y divide-line">
          {RETENTION.map(([k, l]) => (
            <div key={k} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm text-ink">{l}</span>
              <input className="input !w-24 !py-1 text-right text-sm tabular" inputMode="numeric" value={val(k)} disabled={!can.includes('settings')}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              <span className="text-2xs text-muted">days</span>
            </div>))}
          {Object.keys(vals).length ? (
            <div className="flex justify-end px-4 py-2.5"><button className="btn-primary !py-1.5 text-2xs" onClick={() => save(vals, 'Retention saved.')}>Save</button></div>) : null}
        </div>
      </Section>

      <Section title="Paused for a visit, a customer or a browser">
        {(mon.data?.controls || []).length ? (
          <Table head={['Scope', 'Which', 'Why', 'By', 'Since', '']}>
            {mon.data.controls.map((c) => (
              <tr key={c.id}>
                <td className="td text-2xs">{c.scope}</td><td className="td font-mono text-2xs">{c.ref}</td><td className="td text-2xs">{c.reason || '—'}</td>
                <td className="td text-2xs">{c.admin || '—'}</td><td className="td text-2xs">{dateTime(c.created_at)}</td>
                <td className="td">{can.includes(c.scope === 'session' ? 'tasks.manage' : 'block') ? (
                  <button className="btn-quiet !px-2.5 !py-1 text-2xs" onClick={async () => { await api.setMonitoring({ scope: c.scope, ref: c.ref, off: false }); mon.reload(); }}>Resume</button>) : null}</td>
              </tr>))}
          </Table>) : <div className="card px-4 py-4 text-sm text-muted">Nothing paused.</div>}
      </Section>
      {ask ? <Confirm {...ask} onClose={() => setAsk(null)} /> : null}
    </>
  );
}
