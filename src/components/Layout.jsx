import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session.jsx';
import { usePrefs } from '../lib/prefs.jsx';
import { api } from '../lib/api';
import { play, playMost } from '../lib/sound';
import { useLive } from '../lib/live.jsx';

/* The period every screen shows; remembered on this device. */
const RangeCtx = createContext(['today', () => {}]);
export const useRange = () => useContext(RangeCtx);
const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']];

/* Open alerts and the connection to the server, for every screen. */
const AlertsCtx = createContext({ rows: [], counts: {}, reload: () => {}, conn: { state: 'live' } });
export const useAlerts = () => useContext(AlertsCtx);

/*
 * THE MENU (spec §4). One list; `phase` marks screens that arrive in a later
 * phase and are hidden until their page exists. `need` is the permission.
 */
export const NAV = [
  ['Live', [
    ['/', 'Overview', '📊'],
    ['/live', 'Live users', '🟢'],
    ['/log', 'Event stream', '📋'],
  ]],
  ['Customers', [
    ['/customers', 'Customers', '👤'],
    ['/sessions', 'Sessions', '🧭'],
    ['/visitors', 'Visitors', '👀'],
    ['/leads', 'Leads & drop-offs', '🔥'],
    ['/free-checks', 'Free checks', '🆓'],
    ['/vehicles', 'Vehicles', '🚗'],
  ]],
  ['Business', [
    ['/payments', 'Payments', '💳'],
    ['/reports', 'Reports', '📄'],
    ['/referrals', 'Referrals', '🤝'],
    ['/sources', 'Ads & sources', '📣'],
    ['/analytics', 'Live analytics', '📈'],
    ['/insights', 'Insights', '💡'],
  ]],
  ['System', [
    ['/api', 'API monitor', '🔌'],
    ['/health', 'System health', '🩺'],
    ['/alerts', 'Alerts', '🔔'],
    ['/audit', 'Audit log', '🗂️'],
  ]],
  ['Admin', [
    ['/emails', 'Emails to you', '✉️'],
    ['/admins', 'Admins', '🛡️', 'admins'],
    ['/privacy', 'Privacy & monitoring', '🛡'],
    ['/settings', 'Settings', '⚙️'],
  ]],
];
// Every screen in the menu exists now (all phases built).
export const AVAILABLE = new Set([...NAV.flatMap(([, items]) => items.map(([to]) => to)), '/search']);

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function Layout({ children }) {
  const { me, can, signOut } = useSession();
  const { prefs } = usePrefs();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const now = useClock();
  const [range, setRangeState] = useState(() => { try { return localStorage.getItem('webadmin.range') || 'today'; } catch { return 'today'; } });
  const setRange = (r) => { setRangeState(r); try { localStorage.setItem('webadmin.range', r); } catch { /* private mode */ } };
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');

  /* ── open alerts: polled, with a sound and a desktop notice for each NEW one ── */
  const [alerts, setAlerts] = useState({ rows: [], counts: {} });
  const [conn, setConn] = useState({ state: 'live', at: Date.now(), failures: 0 });
  const seen = useRef(null);
  const loadAlerts = useCallback(async () => {
    try {
      const out = await api.alerts({ status: 'active' }, true);
      const rows = out.rows || [];
      const counts = rows.reduce((c, a) => ({ ...c, [a.severity]: (c[a.severity] || 0) + 1 }), {});
      setAlerts({ rows, counts });
      setConn({ state: 'live', at: Date.now(), failures: 0 });
      // New alert, or an old one seen again (grouped): announce once.
      const key = (a) => `${a.id}:${a.seen_count || 1}`;
      if (seen.current) {
        const fresh = rows.filter((a) => !seen.current.has(key(a)) && a.status === 'open');
        if (fresh.length) {
          playMost(fresh.map((a) => a.severity), prefs.sound);
          if (prefs.desktop && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            const top = fresh[0];
            try { new Notification(`GaadiPe · ${top.severity.toUpperCase()}`, { body: `${top.title}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, tag: `wa-${top.id}` }); } catch { /* not allowed here */ }
          }
        }
      }
      seen.current = new Set(rows.map(key));
    } catch {
      setConn((c) => ({ ...c, failures: c.failures + 1, state: c.failures + 1 >= 3 ? 'offline' : 'reconnecting' }));
    }
  }, [prefs.sound, prefs.desktop]);
  // The stream says the moment an alert is raised or repeats; this poll is the backstop.
  useEffect(() => { loadAlerts(); const t = setInterval(loadAlerts, 60000); return () => clearInterval(t); }, [loadAlerts]);

  /* ── live: alerts at once; a payment's success chime and notice (spec §100) ── */
  const live = useLive();
  useEffect(() => live?.onItems((items) => {
    if (items.some((i) => i.kind === 'alert')) loadAlerts();
    const paid = items.filter((i) => i.name === 'payment_success');
    if (paid.length) {
      play('success', prefs.sound);
      if (prefs.desktop && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const p = paid.at(-1);
        try { new Notification('GaadiPe · Payment received', { body: `₹${Math.round((p.amount_paise || 0) / 100)}${p.reg_no ? ` for ${p.reg_no}` : ''}${paid.length > 1 ? ` (+${paid.length - 1} more)` : ''}`, tag: `pay-${p.payment_id}` }); } catch { /* not allowed */ }
      }
    }
  }), [live, loadAlerts, prefs.sound, prefs.desktop]);

  /* ── is optional monitoring on? (§98) — always visible, so nobody assumes it is ── */
  const [mon, setMon] = useState(null);
  // Once a minute, and straight after any switch changes (not on every screen change — the server's loop guard).
  useEffect(() => {
    const load = () => api.monitoring({}, true).then(setMon).catch(() => {});
    load(); const t = setInterval(load, 60000);
    window.addEventListener('webadmin:monitoring', load);
    return () => { clearInterval(t); window.removeEventListener('webadmin:monitoring', load); };
  }, []);

  /* ── where this admin is (presence, §93) ── */
  useEffect(() => { api.presence(pathname).catch(() => {}); }, [pathname]);
  useEffect(() => { const t = setInterval(() => api.presence(window.location.pathname).catch(() => {}), 20000); return () => clearInterval(t); }, []);

  /* ── auto-lock after inactivity (§95): the session ends and the passcode is asked again ── */
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

  // The line's state is the stream's when there is one (pings every 10 s), else the alert poll's.
  const lc = live?.conn?.at ? live.conn : conn;
  const staleFor = Math.round((now.getTime() - (lc.at || 0)) / 1000);
  const liveChip = lc.state === 'offline' ? ['OFFLINE', 'bg-wrong-50 text-wrong-700']
    : lc.state === 'reconnecting' || !lc.at ? ['RECONNECTING', 'bg-watch-50 text-watch-700']
      : staleFor > 25 ? [`STALE · ${staleFor}s`, 'bg-watch-50 text-watch-700'] : ['LIVE', 'bg-good-50 text-good-700'];
  const activeNow = live?.presence?.counts?.active;
  const allowedNav = NAV.map(([g, items]) => [g, items.filter(([to, , , need]) => AVAILABLE.has(to) && (!need || can.includes(need)))]).filter(([, items]) => items.length);
  const go = (e) => { e.preventDefault(); if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setQ(''); } };

  const NavList = ({ onPick }) => (
    <nav className="space-y-4">
      {allowedNav.map(([group, items]) => (
        <div key={group}>
          <div className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted">{group}</div>
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onPick}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-brand/10 font-semibold text-brand' : 'text-body hover:bg-shell'}`}>
              <span className="w-5 text-center">{icon}</span>{label}
              {to === '/alerts' && (alerts.counts.critical || alerts.counts.warning)
                ? <span className="ml-auto rounded-full bg-wrong-500 px-1.5 text-[10px] font-bold text-white">{(alerts.counts.critical || 0) + (alerts.counts.warning || 0)}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <RangeCtx.Provider value={[range, setRange]}>
      <AlertsCtx.Provider value={{ ...alerts, reload: loadAlerts, conn }}>
        <div className="min-h-screen lg:pl-60">
          {/* Sidebar (desktop) */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 overflow-y-auto border-r border-line bg-white px-3 py-4 lg:block">
            <div className="mb-5 flex items-center gap-2.5 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
              <div className="leading-tight"><div className="text-[15px] font-semibold text-ink">GaadiPe</div><div className="text-2xs text-muted">Web Admin</div></div>
            </div>
            <NavList />
          </aside>

          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-xs font-bold text-white lg:hidden">GP</span>
              <form onSubmit={go} className="min-w-0 flex-1 sm:max-w-md">
                <input className="input !py-1.5 text-sm" type="search" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search mobile, vehicle, GP-… id, report, payment" aria-label="Search everything" />
              </form>
              <button type="button" onClick={() => navigate('/live')} className="chip hidden border border-good-500/30 bg-white !px-2.5 !py-1 text-ink sm:inline-flex" title="On gaadipe.in now — open Live users">
                🟢 <b className="tabular">{activeNow ?? '…'}</b> online
              </button>
              {mon ? (
                <button type="button" onClick={() => navigate('/privacy')} title="Optional interaction monitoring — open Privacy & monitoring"
                  className={`chip hidden md:inline-flex ${mon.global === 'off' ? 'bg-wrong-50 text-wrong-700' : 'bg-shell text-ink'}`}>
                  MONITORING: {mon.global === 'off' ? 'GLOBAL OFF' : mon.controls?.length ? `ACTIVE · ${mon.controls.length} paused` : 'ACTIVE'}
                </button>) : null}
              <span className={`chip ${liveChip[1]}`} title={`Last word from the server ${staleFor}s ago`}>
                {liveChip[0] === 'LIVE' ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-good-500" /> : null}{liveChip[0]}
              </span>
              <button type="button" onClick={() => navigate('/alerts')} className="relative rounded-lg px-2 py-1.5 hover:bg-shell" aria-label="Alerts">
                🔔
                {(alerts.counts.critical || alerts.counts.warning || alerts.counts.info) ? (
                  <span className={`absolute -right-0.5 -top-0.5 rounded-full px-1 text-[10px] font-bold text-white ${alerts.counts.critical ? 'bg-wrong-500' : alerts.counts.warning ? 'bg-watch-500' : 'bg-brand'}`}>
                    {(alerts.counts.critical || 0) + (alerts.counts.warning || 0) + (alerts.counts.info || 0)}
                  </span>) : null}
              </button>
              <span className="tabular hidden text-2xs text-muted md:inline">{now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <div className="relative">
                <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-shell" aria-label="Profile">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">{String(me?.name || 'A').slice(0, 1)}</span>
                  <span className="hidden max-w-[8rem] truncate sm:inline">{me?.name}</span>
                </button>
                {menu ? (
                  <div className="absolute right-0 top-10 z-40 w-52 rounded-xl border border-line bg-white py-1 shadow-pop" onMouseLeave={() => setMenu(false)}>
                    <div className="px-3 py-2 text-2xs text-muted">{me?.name} · {me?.role}</div>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-shell" onClick={() => { setMenu(false); navigate('/settings'); }}>⚙️ Settings & sounds</button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-shell" onClick={() => { setMenu(false); navigate('/settings#sessions'); }}>💻 My sessions</button>
                    <button className="block w-full px-3 py-2 text-left text-sm text-wrong-700 hover:bg-shell" onClick={signOut}>↪ Sign out</button>
                  </div>) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 pb-2">
              <div className="inline-flex rounded-lg border border-line bg-shell p-0.5" role="tablist" aria-label="Period">
                {RANGES.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}
                    className={`rounded-md px-3 py-1 text-2xs font-semibold ${range === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>{label}</button>
                ))}
              </div>
              <span className="hidden text-2xs text-muted sm:inline">Indian time</span>
            </div>
          </header>

          {lc.state === 'offline' || (lc.at && staleFor > 25) ? (
            <div className="border-b border-watch-500/30 bg-watch-50 px-4 py-1.5 text-center text-2xs font-semibold text-watch-700" role="status">
              {lc.state === 'offline' ? 'Live connection lost. Reconnecting…' : `No live update for ${staleFor} s — figures may be out of date.`}
            </div>) : null}
          <main className="mx-auto max-w-6xl px-4 py-5 pb-24 lg:pb-8">{children}</main>

          {/* Phones: the main screens at the thumb, the rest under More. */}
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white lg:hidden">
            {[['/', 'Overview', '📊'], ['/live', 'Live', '🟢'], ['/customers', 'Customers', '👤'], ['/alerts', 'Alerts', '🔔']].map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive ? 'text-brand' : 'text-muted'}`}>
                <span className="text-lg leading-none">{icon}</span>{label}
              </NavLink>
            ))}
            <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted">
              <span className="text-lg leading-none">☰</span>More
            </button>
          </nav>
          {more ? (
            <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setMore(false)}>
              <div className="rise absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white px-3 py-4" onClick={(e) => e.stopPropagation()}>
                <NavList onPick={() => setMore(false)} />
              </div>
            </div>) : null}
        </div>
      </AlertsCtx.Provider>
    </RangeCtx.Provider>
  );
}
