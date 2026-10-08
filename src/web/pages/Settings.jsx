import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { usePrefs } from '../lib/prefs.jsx';
import { useSession } from '../lib/session.jsx';
import { play, SEVERITIES } from '../lib/sound';
import { Section, State, Table } from '../components/ui.jsx';
import { ago, dateTime } from '../lib/format';

/**
 * SETTINGS (spec §78–79, §94–95): alert sounds (each severity, volume,
 * cooldown, test), desktop notifications, auto-lock, this admin's sessions, and
 * who else is in the panel. Saved per admin on the server.
 */
const LOCKS = [[5, '5 minutes'], [10, '10 minutes'], [15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [0, 'Never (owner only)']];

function Switch({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-line'} disabled:opacity-50`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function Settings() {
  const { prefs, save } = usePrefs();
  const { me } = useSession();
  const s = prefs.sound;
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const sessions = useLoad(() => api.mySessions(), [], { everyMs: 0 });
  const [online, setOnline] = useState([]);
  useEffect(() => { api.presence('/settings').then((o) => setOnline(o.rows || [])).catch(() => {}); }, []);
  useEffect(() => { if (window.location.hash === '#sessions') document.getElementById('sessions')?.scrollIntoView(); }, []);

  return (
    <>
      <h1 className="text-lg font-semibold">Settings</h1>

      <Section title="Alert sounds" hint="One sound per severity per cooldown, however many alerts arrive — never a stream of noise.">
        <div className="card divide-y divide-line">
          <div className="flex items-center gap-3 px-4 py-3"><span className="flex-1 text-sm font-semibold text-ink">All sounds</span><Switch on={s.master} label="All sounds" onChange={(v) => save({ sound: { master: v } })} /></div>
          {SEVERITIES.map((sev) => (
            <div key={sev} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm capitalize">{sev}</span>
              <button type="button" className="btn-quiet !px-2.5 !py-1 text-2xs" onClick={() => play(sev, s, { force: true })}>▶ Test</button>
              <Switch on={s[sev]} label={`${sev} sound`} disabled={!s.master} onChange={(v) => save({ sound: { [sev]: v } })} />
            </div>))}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex flex-1 items-center gap-3 text-sm">Volume
              <input type="range" min="0" max="100" value={s.volume} onChange={(e) => save({ sound: { volume: Number(e.target.value) } })} className="flex-1 accent-[#0f766e]" />
              <span className="tabular w-10 text-right text-2xs">{s.volume}%</span></label>
            <label className="flex items-center gap-2 text-sm">Cooldown
              <select className="input !w-auto !py-1 text-2xs" value={s.cooldown} onChange={(e) => save({ sound: { cooldown: Number(e.target.value) } })}>
                {[[10, '10 sec'], [30, '30 sec'], [60, '1 min'], [300, '5 min']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </div>
        </div>
      </Section>

      <Section title="Desktop notifications" hint="A notice from the browser when an alert arrives while this tab is in the background.">
        <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm">{perm === 'granted' ? '✅ Allowed in this browser' : perm === 'denied' ? '⛔ Blocked in this browser’s settings' : perm === 'unsupported' ? 'This browser cannot show them' : 'Not allowed yet'}</span>
          {perm === 'default' ? <button className="btn-primary !py-1.5 text-2xs" onClick={async () => setPerm(await Notification.requestPermission())}>Allow</button> : null}
          <Switch on={prefs.desktop} label="Desktop notifications" onChange={(v) => save({ desktop: v })} />
          {perm === 'granted' ? <button className="btn-quiet !py-1.5 text-2xs" onClick={() => { try { new Notification('GaadiPe · TEST', { body: 'Desktop notifications work in this browser.' }); } catch { /* blocked */ } play('info', s, { force: true }); }}>Send a test</button> : null}
        </div>
      </Section>

      <Section title="Auto-lock" hint="After this long without a click or a key, the panel signs out and asks for the passcode again.">
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm">Lock after</span>
          <select className="input !w-auto !py-1.5 text-sm" value={prefs.lockMinutes} onChange={(e) => save({ lockMinutes: Number(e.target.value) })}>
            {LOCKS.filter(([v]) => v || me?.role === 'owner').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </Section>

      <Section title="My sessions" hint="Everywhere you are signed in to the admin panels.">
        <div id="sessions" />
        <State loading={sessions.loading} error={sessions.error}>
          {sessions.data?.rows?.length ? (
            <>
              <Table head={['Browser', 'IP', 'Signed in', 'Last used', '']}>
                {sessions.data.rows.map((x) => (
                  <tr key={x.id}>
                    <td className="td max-w-[22rem] truncate text-2xs" title={x.user_agent}>{x.current ? <span className="chip mr-1.5 bg-good-50 text-good-700">this one</span> : null}{x.user_agent}</td>
                    <td className="td font-mono text-2xs">{x.ip}</td>
                    <td className="td text-2xs">{dateTime(x.created_at)}</td>
                    <td className="td text-2xs">{ago(x.last_used_at)}</td>
                    <td className="td">{!x.current ? <button className="btn-quiet !px-2.5 !py-1 text-2xs text-wrong-700" onClick={async () => { await api.endMySessions(x.id); sessions.reload(); }}>Sign out</button> : null}</td>
                  </tr>))}
              </Table>
              {sessions.data.rows.length > 1 ? (
                <button className="btn-quiet mt-2 text-2xs text-wrong-700" onClick={async () => { if (window.confirm('Sign out every other session?')) { await api.endMySessions('others'); sessions.reload(); } }}>Sign out all other sessions</button>) : null}
            </>
          ) : null}
        </State>
      </Section>

      <Section title="Admins online now" hint="Who else has the web admin open, and on which screen.">
        <div className="card divide-y divide-line">
          {online.length ? online.map((p) => (
            <div key={`${p.admin_id}-${p.at}`} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="live-dot h-2 w-2 rounded-full bg-good-500" /><span className="flex-1 text-ink">{p.name} <span className="text-2xs text-muted">({p.role})</span></span>
              <span className="font-mono text-2xs text-muted">{p.screen}</span><span className="text-2xs text-muted">{ago(p.at)}</span>
            </div>)) : <div className="px-4 py-3 text-sm text-muted">Only you.</div>}
        </div>
      </Section>
    </>
  );
}
