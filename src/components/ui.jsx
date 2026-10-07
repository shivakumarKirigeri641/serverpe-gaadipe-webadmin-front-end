import { sourceOf } from '../lib/format';

export function Stat({ label, value, sub, tone }) {
  const color = tone === 'good' ? 'text-good-700' : tone === 'wrong' ? 'text-wrong-700' : 'text-ink';
  return (
    <div className="card rise px-4 py-3.5">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`tabular mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-2xs text-muted">{sub}</div> : null}
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
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Search({ value, onChange, placeholder }) {
  return <input className="input !py-2 text-sm sm:max-w-xs" type="search" value={value} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)} />;
}
