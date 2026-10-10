import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Shell from '../../components/Shell.jsx';
import { useSession } from '../lib/session.jsx';
import { usePrefs } from '../lib/prefs.jsx';
import { api } from '../lib/api';
import { useLive } from '../lib/live.jsx';

/* The period every website screen shows; remembered on this device. */
const RangeCtx = createContext(['today', () => {}]);
export const useRange = () => useContext(RangeCtx);
const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']];

/* Open alerts, for the Alerts screen's "reload the bell". */
const AlertsCtx = createContext({ rows: [], counts: {}, reload: () => {} });
export const useAlerts = () => useContext(AlertsCtx);

/*
 * THE WEBSITE SCREENS, INSIDE THE MAIN PANEL (user, 2026-10-07: "the title bar
 * must be as per the WhatsApp admin panel"). The sidebar, title bar, quick
 * find, search, notifications and pop-ups are the main panel's Shell; this adds
 * what only the website screens need — the period, whether optional monitoring
 * is on, the live line, presence and the auto-lock.
 * Titles: the screen's name in the Website group (components/Shell.jsx NAV).
 */
export const WEB_TITLES = [
  ['/web/live', 'Live users'], ['/web/log', 'Event stream'], ['/web/customers/', 'Website customer'], ['/web/customers', 'Website customers'],
  ['/web/sessions/', 'Visit'], ['/web/sessions', 'Sessions'], ['/web/visitors', 'Visitors'], ['/web/leads', 'Leads & drop-offs'],
  ['/web/free-checks', 'Free checks'], ['/web/vehicles', 'Website vehicle lookup'], ['/web/transfers', 'Number-change transfers'],
  ['/web/payments', 'Website payments'], ['/web/reports', 'Website reports'], ['/web/referrals', 'Website referrals'],
  ['/web/sources', 'Ads & sources'], ['/web/analytics', 'Live analytics'], ['/web/insights', 'Insights'], ['/web/api', 'API monitor (website)'],
  ['/web/health', 'System health (website)'], ['/web/alerts', 'Website alerts'], ['/web/audit', 'Website audit'], ['/web/server-log', 'Server log'],
  ['/web/broadcast', 'Broadcast (email)'], ['/web/reach', 'SMS & notifications'], ['/web/emails', 'Emails to you'], ['/web/admins', 'Admins'], ['/web/privacy', 'Privacy & monitoring'],
  ['/web/settings', 'Web admin settings'], ['/web/search', 'Search'], ['/web', 'Website overview'],
];
const titleOf = (p) => (WEB_TITLES.find(([k]) => (k.endsWith('/') ? p.startsWith(k) : p === k || p.startsWith(`${k}/`))) || [, 'Website'])[1];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function Layout({ children }) {
  const { signOut } = useSession();
  const { prefs } = usePrefs();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const now = useClock();
  const [range, setRangeState] = useState(() => { try { return localStorage.getItem('webadmin.range') || 'today'; } catch { return 'today'; } });
  const setRange = (r) => { setRangeState(r); try { localStorage.setItem('webadmin.range', r); } catch { /* private mode */ } };

  /* Open alerts (the main panel's bell and pop-ups announce them; this keeps the counts for the screens). */
  const [alerts, setAlerts] = useState({ rows: [], counts: {} });
  const loadAlerts = useCallback(async () => {
    try {
      const out = await api.alerts({ status: 'active' }, true);
      const rows = out.rows || [];
      setAlerts({ rows, counts: rows.reduce((c, a) => ({ ...c, [a.severity]: (c[a.severity] || 0) + 1 }), {}) });
    } catch { /* the connection light says so */ }
  }, []);
  useEffect(() => { loadAlerts(); const t = setInterval(loadAlerts, 60000); return () => clearInterval(t); }, [loadAlerts]);
  const live = useLive();
  useEffect(() => live?.onItems((items) => { if (items.some((i) => i.kind === 'alert')) loadAlerts(); }), [live, loadAlerts]);

  /* Is optional monitoring on? (§98) — always visible, so nobody assumes it is. */
  const [mon, setMon] = useState(null);
  useEffect(() => {
    const load = () => api.monitoring({}, true).then(setMon).catch(() => {});
    load(); const t = setInterval(load, 60000);
    window.addEventListener('webadmin:monitoring', load);
    return () => { clearInterval(t); window.removeEventListener('webadmin:monitoring', load); };
  }, []);

  /* Where this admin is (presence, §93). */
  useEffect(() => { api.presence(pathname).catch(() => {}); }, [pathname]);
  useEffect(() => { const t = setInterval(() => api.presence(window.location.pathname).catch(() => {}), 20000); return () => clearInterval(t); }, []);

  /* Auto-lock after inactivity (§95). */
  useEffect(() => {
    const mins = Number(prefs.lockMinutes) || 0;
    if (!mins) return undefined;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const evs = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      if (Date.now() - last > mins * 60000) {
        try { sessionStorage.setItem('webadmin.locked', String(mins)); } catch { /* private mode */ }
        signOut();
      }
    }, 15000);
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, bump)); };
  }, [prefs.lockMinutes, signOut]);

  // The live line: the stream's pings every 10 s.
  const lc = live?.conn || { state: 'reconnecting' };
  const staleFor = Math.round((now.getTime() - (lc.at || 0)) / 1000);
  const liveChip = lc.state === 'offline' ? ['OFFLINE', 'bg-wrong-50 text-wrong-700']
    : lc.state === 'reconnecting' || !lc.at ? ['CONNECTING', 'bg-watch-50 text-watch-700']
      : staleFor > 25 ? [`STALE · ${staleFor}s`, 'bg-watch-50 text-watch-700'] : ['LIVE', 'bg-good-50 text-good-700'];
  const activeNow = live?.presence?.counts?.active;

  const actions = (
    <>
      <button type="button" onClick={() => navigate('/web/live')} className="chip hidden border border-good-500/30 bg-white !px-2.5 !py-1 text-ink xl:inline-flex" title="On gaadipe.in now — open Live users">
        🟢 <b className="tabular">{activeNow ?? '…'}</b> online
      </button>
      {mon ? (
        <button type="button" onClick={() => navigate('/web/privacy')} title="Optional interaction monitoring — open Privacy & monitoring"
          className={`chip hidden xl:inline-flex ${mon.global === 'off' ? 'bg-wrong-50 text-wrong-700' : 'bg-shell text-ink'}`}>
          MONITORING: {mon.global === 'off' ? 'GLOBAL OFF' : mon.controls?.length ? `ACTIVE · ${mon.controls.length} paused` : 'ACTIVE'}
        </button>) : null}
      {/* The main panel's own LIVE light sits next to these; this one speaks only when the website stream is not live. */}
      {liveChip[0] !== 'LIVE' ? <span className={`chip hidden lg:inline-flex ${liveChip[1]}`} title={`Website stream: last word ${staleFor}s ago`}>{liveChip[0]}</span> : null}
    </>
  );
  const tabs = (
    <div className="flex items-center gap-2 py-2">
      <div className="inline-flex rounded-xl border border-line bg-shell p-0.5" role="tablist" aria-label="Period">
        {RANGES.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}
            className={`rounded-lg px-3 py-1 text-2xs font-semibold ${range === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>{label}</button>
        ))}
      </div>
      <span className="hidden text-2xs text-muted sm:inline">Indian time · website</span>
    </div>
  );

  return (
    <RangeCtx.Provider value={[range, setRange]}>
      <AlertsCtx.Provider value={{ ...alerts, reload: loadAlerts }}>
        <Shell title={titleOf(pathname)} subtitle="gaadipe.in — website & chat" actions={actions} tabs={tabs}>
          {lc.state === 'offline' || (lc.at && staleFor > 25) ? (
            <div className="mb-3 rounded-lg border border-watch-500/30 bg-watch-50 px-4 py-1.5 text-center text-2xs font-semibold text-watch-700" role="status">
              {lc.state === 'offline' ? 'Live connection lost. Reconnecting…' : `No live update for ${staleFor} s — figures may be out of date.`}
            </div>) : null}
          {children}
        </Shell>
      </AlertsCtx.Provider>
    </RangeCtx.Provider>
  );
}
