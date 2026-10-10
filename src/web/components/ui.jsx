import { sourceOf } from '../lib/format';
import { Trend } from '../lib/compare.jsx';

/* trend: a key of /web/compare — the tile then shows ▲/▼ % vs yesterday, the 7 days before and last month (2026-10-08). */
export function Stat({ label, value, sub, tone, trend, trendWhich }) {
  const color = tone === 'good' ? 'text-good-700' : tone === 'wrong' ? 'text-wrong-700' : 'text-ink';
  return (
    <div className="card stat-fill rise px-4 py-3.5">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`tabular mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-2xs text-muted">{sub}</div> : null}
      {trend ? <Trend k={trend} which={trendWhich} /> : null}
    </div>
  );
}

export function Section({ title, hint, right, children }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {hint ? <p className="text-2xs text-muted">{hint}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function SourceChip({ source }) {
  const s = sourceOf(source);
  return <span className="chip" style={{ background: `${s.color}1a`, color: s.color }}>{s.label}</span>;
}

/* Loading, failed and empty, said the same way on every screen. */
export function State({ loading, error, empty, onRetry, children }) {
  if (error && !children) {
    return (
      <div className="card px-4 py-6 text-center text-sm">
        <div className="text-wrong-700">{error.message}</div>
        {onRetry ? <button className="btn-quiet mt-3" onClick={onRetry}>Try again</button> : null}
      </div>
    );
  }
  if (loading && !children) return <div className="card px-4 py-8 text-center text-sm text-muted">Loading…</div>;
  if (empty) return <div className="card px-4 py-8 text-center text-sm text-muted">{empty}</div>;
  return (
    <>
      {error ? <div className="mb-2 rounded-lg bg-watch-50 px-3 py-2 text-2xs text-watch-700">Could not refresh: {error.message}. Showing the last figures.</div> : null}
      {children}
    </>
  );
}

export function Table({ head, children }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-line bg-shell/60"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line [&>tr]:transition-colors [&>tr:hover]:bg-brand/[0.04]">{children}</tbody>
      </table>
    </div>
  );
}

/* An id with a small copy button (spec §104). */
export function CopyId({ value, className = '' }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-2xs text-muted ${className}`}>
      {value}
      <button type="button" title="Copy" aria-label={`Copy ${value}`} className="rounded px-1 hover:bg-shell"
        onClick={(e) => {
          e.stopPropagation(); e.preventDefault();
          navigator.clipboard?.writeText(value).catch(() => {});
          const b = e.currentTarget; const was = b.textContent; b.textContent = '✓'; setTimeout(() => { b.textContent = was; }, 1200);
        }}>⧉</button>
    </span>
  );
}

/* Where a visitor is, in words, with a colour AND a word (spec §51). */
export const STATUS = {
  ONLINE: ['● Online', 'bg-good-50 text-good-700'],
  IDLE: ['◐ Idle', 'bg-watch-50 text-watch-700'],
  HIDDEN: ['◑ Tab hidden', 'bg-shell text-muted'],
  OFFLINE: ['○ Offline', 'bg-shell text-muted'],
  ENDED: ['○ Left', 'bg-shell text-muted'],
  TERMINATED: ['⛔ Ended by admin', 'bg-wrong-50 text-wrong-700'],
};
export function StatusChip({ status }) {
  const [label, cls] = STATUS[status] || STATUS.OFFLINE;
  return <span className={`chip ${cls}`}>{label}</span>;
}

/* The journey steps the site reports, in words. */
export const STEP = {
  welcome: 'Just arrived', home: 'Home page', checking: 'Checking a vehicle', viewing: 'Looking at a vehicle',
  signing_in: 'Signing in — mobile number', code: 'Signing in — entering the code', name: 'Adding a name', email: 'Adding an email',
  paying: 'At the ₹19 payment', paid: 'Back from paying', reports: 'Reading reports', menu: 'In the menu', profile: 'In the profile',
};
export const stepWords = (s) => STEP[s] || (s ? s.replace(/_/g, ' ') : '—');

export function Search({ value, onChange, placeholder }) {
  return <input className="input !py-2 text-sm sm:max-w-xs" type="search" value={value} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)} />;
}
