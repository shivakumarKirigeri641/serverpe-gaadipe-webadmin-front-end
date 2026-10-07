import { createContext, useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../lib/session.jsx';

/* The period every screen shows; remembered on this device. */
const RangeCtx = createContext(['today', () => {}]);
export const useRange = () => useContext(RangeCtx);
const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']];

const NAV = [
  ['/', 'Overview', '📊'],
  ['/sources', 'Ads & sources', '📣'],
  ['/visitors', 'Visitors', '👀'],
  ['/customers', 'Customers', '👤'],
  ['/free-checks', 'Free checks', '🔎'],
];

export default function Layout({ children }) {
  const { me, signOut } = useSession();
  const [range, setRangeState] = useState(() => { try { return localStorage.getItem('webadmin.range') || 'today'; } catch { return 'today'; } });
  const setRange = (r) => { setRangeState(r); try { localStorage.setItem('webadmin.range', r); } catch { /* private mode */ } };

  return (
    <RangeCtx.Provider value={[range, setRange]}>
      <div className="min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-semibold text-ink">GaadiPe Web Admin</div>
              <div className="truncate text-2xs text-muted">gaadipe.in and the chat</div>
            </div>
            <nav className="ml-6 hidden items-center gap-1 md:flex">
              {NAV.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand/10 text-brand' : 'text-body hover:bg-shell'}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-2xs text-muted sm:inline">{me?.display_name || me?.name || me?.role}</span>
              <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={signOut}>Sign out</button>
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2.5">
            <div className="inline-flex rounded-lg border border-line bg-shell p-0.5" role="tablist" aria-label="Period">
              {RANGES.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}
                  className={`rounded-md px-3 py-1.5 text-2xs font-semibold ${range === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-2xs text-muted">Indian time · refreshes every minute</span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

        {/* Phones: the screens at the thumb, as in an app. */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white md:hidden">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive ? 'text-brand' : 'text-muted'}`}>
              <span className="text-lg leading-none">{icon}</span>{label.replace(' & sources', '')}
            </NavLink>
          ))}
        </nav>
      </div>
    </RangeCtx.Provider>
  );
}
