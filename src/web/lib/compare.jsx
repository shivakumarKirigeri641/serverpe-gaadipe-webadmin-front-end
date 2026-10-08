import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * UP OR DOWN, AND BY HOW MUCH (user, 2026-10-08: "inc/dec % changes on every
 * value — vs yesterday, vs last week and more"). One fetch of /web/compare for
 * the whole panel (the server keeps it a minute), shared by every tile:
 *
 *   <Stat label="Visitors" value={…} trend="visitors" />
 *
 * draws, under the number:  ▲ 12% vs yesterday · ▼ 3% vs prev 7 days · ▲ 40% vs last month
 * "Yesterday" is yesterday up to this same time, so a morning is never compared
 * with a whole day.
 */
let shared = { at: 0, data: null, inflight: null };
const listeners = new Set();
async function load() {
  if (shared.inflight) return shared.inflight;
  shared.inflight = api.compare(true).then((d) => { shared = { at: Date.now(), data: d, inflight: null }; listeners.forEach((f) => f(d)); return d; })
    .catch(() => { shared.inflight = null; return shared.data; });
  return shared.inflight;
}

export function useCompare() {
  const [data, setData] = useState(shared.data);
  useEffect(() => {
    listeners.add(setData);
    if (!shared.data || Date.now() - shared.at > 60000) load();
    const t = setInterval(() => { if (Date.now() - shared.at > 60000) load(); }, 30000);
    return () => { listeners.delete(setData); clearInterval(t); };
  }, []);
  return data;
}

const COMPARE = [
  ['vs_yesterday', 'today', 'yesterday', 'vs yesterday'],
  ['vs_last_week', 'today', 'last_week', 'vs same day last week'],
  ['vs_prev7', 'd7', 'prev7', '7 days vs the 7 before'],
  ['vs_prev_month', 'mtd', 'prev_mtd', 'month vs last month'],
];

/** One change, as a small coloured chip. */
export function Change({ p, now, before, label, lowerIsBetter = false }) {
  if (now === 0 && before === 0) return <span className="whitespace-nowrap text-muted">— {label}</span>;
  if (p == null) return <span className="whitespace-nowrap text-good-700">▲ new {label}</span>;
  const up = p > 0;
  const good = p === 0 ? null : (up !== lowerIsBetter);
  const cls = good == null ? 'text-muted' : good ? 'text-good-700' : 'text-wrong-700';
  return <span className={`whitespace-nowrap ${cls}`} title={`${now} now · ${before} before`}>{p === 0 ? '＝' : up ? '▲' : '▼'} {Math.abs(p)}% {label}</span>;
}

/** The chips for one metric. `which` picks the comparisons (default: yesterday, 7 days, month). */
export function Trend({ k, which = ['vs_yesterday', 'vs_prev7', 'vs_prev_month'] }) {
  const data = useCompare();
  const m = data?.metrics?.[k];
  if (!m) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-semibold">
      {COMPARE.filter(([key]) => which.includes(key)).map(([key, now, before, label]) => (
        <Change key={key} p={m[key]} now={m[now]} before={m[before]} label={label} lowerIsBetter={m.lower_is_better} />
      ))}
    </div>
  );
}

/** Every number, every comparison — the whole picture in one table. */
export function CompareTable({ money = (v) => v }) {
  const data = useCompare();
  if (!data) return <div className="card px-4 py-4 text-sm text-muted">Working out the changes…</div>;
  const fmt = (k, v) => (k === 'revenue_paise' ? money(v) : Number(v).toLocaleString('en-IN'));
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-2xs uppercase tracking-wider text-muted">
          <th className="px-3 py-2">Number</th><th className="px-3 py-2">Today</th><th className="px-3 py-2">vs yesterday (same time)</th>
          <th className="px-3 py-2">vs same day last week</th><th className="px-3 py-2">Last 7 days</th><th className="px-3 py-2">vs the 7 before</th>
          <th className="px-3 py-2">This month</th><th className="px-3 py-2">vs last month (same days)</th>
        </tr></thead>
        <tbody>
          {Object.entries(data.metrics).map(([k, m]) => (
            <tr key={k} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-2 text-ink">{m.words}</td>
              <td className="tabular px-3 py-2 font-semibold">{fmt(k, m.today)}</td>
              <td className="px-3 py-2 text-2xs"><Change p={m.vs_yesterday} now={m.today} before={m.yesterday} label={`(${fmt(k, m.yesterday)})`} lowerIsBetter={m.lower_is_better} /></td>
              <td className="px-3 py-2 text-2xs"><Change p={m.vs_last_week} now={m.today} before={m.last_week} label={`(${fmt(k, m.last_week)})`} lowerIsBetter={m.lower_is_better} /></td>
              <td className="tabular px-3 py-2 font-semibold">{fmt(k, m.d7)}</td>
              <td className="px-3 py-2 text-2xs"><Change p={m.vs_prev7} now={m.d7} before={m.prev7} label={`(${fmt(k, m.prev7)})`} lowerIsBetter={m.lower_is_better} /></td>
              <td className="tabular px-3 py-2 font-semibold">{fmt(k, m.mtd)}</td>
              <td className="px-3 py-2 text-2xs"><Change p={m.vs_prev_month} now={m.mtd} before={m.prev_mtd} label={`(${fmt(k, m.prev_mtd)})`} lowerIsBetter={m.lower_is_better} /></td>
            </tr>))}
        </tbody>
      </table>
    </div>
  );
}
