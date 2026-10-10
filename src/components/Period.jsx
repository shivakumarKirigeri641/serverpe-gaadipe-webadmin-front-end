import { useState } from 'react';

/**
 * The period picker the command-center screens share (phase 4): a preset or
 * two custom dates, and what to compare with. Each screen remembers its own
 * choice — the preset, the comparison, and the custom from/to — in this
 * browser. The back end (src/admin/command.js resolve) owns what each preset
 * means, in India's time, so every screen counts the same days.
 */
export const RANGES = [
  ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'],
  ['this_month', 'This month'], ['last_month', 'Last month'], ['this_quarter', 'This quarter'], ['last_quarter', 'Last quarter'],
  ['this_fy', 'This financial year'], ['last_fy', 'Last financial year'], ['custom', 'Custom'],
];
export const COMPARES = [
  ['previous', 'vs previous period'], ['yesterday', 'vs day before'], ['last_week', 'vs same days last week'],
  ['last_month', 'vs same days last month'], ['none', 'No comparison'],
];

const saved = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const keep = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
export const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

/** A calendar day this picker may use: YYYY-MM-DD, not after today (IST). */
function savedDay(k) {
  const today = istToday();
  const v = saved(k, today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > today) return today;
  return v;
}

/** [params for the API, the controls to put in the page header]. */
export function usePeriod(key, { defaultRange = '7d', withCompare = true } = {}) {
  const [range, setRange] = useState(() => saved(`gp.${key}.range`, defaultRange));
  const [compare, setCompare] = useState(() => saved(`gp.${key}.compare`, 'previous'));
  const [from, setFrom] = useState(() => {
    const f = savedDay(`gp.${key}.from`);
    const t = savedDay(`gp.${key}.to`);
    return f > t ? t : f;
  });
  const [to, setTo] = useState(() => savedDay(`gp.${key}.to`));

  const setFromDay = (v) => { const day = v || istToday(); setFrom(day); keep(`gp.${key}.from`, day); };
  const setToDay = (v) => { const day = v || istToday(); setTo(day); keep(`gp.${key}.to`, day); };

  const params = { range, ...(withCompare ? { compare } : { compare: 'none' }), ...(range === 'custom' ? { from, to } : {}) };
  const controls = (
    <>
      <select className="input !w-auto !rounded-xl !py-1.5 text-sm" value={range} aria-label="Period"
        onChange={(e) => { setRange(e.target.value); keep(`gp.${key}.range`, e.target.value); }}>
        {RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {range === 'custom' && (
        <>
          <input type="date" className="input !w-auto !rounded-xl !py-1.5 text-sm" value={from} max={to} aria-label="From"
            onChange={(e) => setFromDay(e.target.value)} />
          <input type="date" className="input !w-auto !rounded-xl !py-1.5 text-sm" value={to} min={from} max={istToday()} aria-label="To"
            onChange={(e) => setToDay(e.target.value)} />
        </>
      )}
      {withCompare && (
        <select className="input !w-auto !rounded-xl !py-1.5 text-sm" value={compare} aria-label="Compare with"
          onChange={(e) => { setCompare(e.target.value); keep(`gp.${key}.compare`, e.target.value); }}>
          {COMPARES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      )}
    </>
  );
  return [params, controls, JSON.stringify(params)];
}
