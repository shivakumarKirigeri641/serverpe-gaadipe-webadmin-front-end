import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Section, State, Table } from '../components/ui.jsx';
import { num } from '../lib/format';

/**
 * INSIGHTS (spec §33–35, §55, §117, §119): sentences computed from the figures,
 * then where visitors are (device, browser, system, state, city) and how each
 * converts; the pages (views, exits); the taps (which buttons lead to a
 * payment); the fields people use; the sign-in form from start to finish.
 */
export function InsightList({ range }) {
  const { data } = useLoad((quiet) => api.insights(range, quiet), [range], { everyMs: 120000 });
  if (!data) return null;
  return (
    <div className="space-y-1.5">
      {data.rows.map((r, i) => (
        <div key={i} className={`card flex gap-2 px-4 py-2.5 text-sm ${r.tone === 'bad' ? 'border-wrong-500/30' : r.tone === 'good' ? 'border-good-500/30' : ''}`}>
          <span>{r.tone === 'bad' ? '📉' : r.tone === 'good' ? '📈' : '💡'}</span><span className="text-ink">{r.text}</span>
        </div>))}
    </div>
  );
}

function Breakdown({ title, rows }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-shell/60 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-muted">{title}</div>
      {rows.length ? (
        <table className="w-full text-sm"><tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.name}><td className="px-4 py-1.5 text-ink">{r.name}</td><td className="tabular px-2 py-1.5 text-right">{num(r.visits)}</td>
              <td className="tabular px-2 py-1.5 text-right text-2xs text-muted">{num(r.signed_in)} in</td><td className="tabular px-4 py-1.5 text-right text-2xs font-semibold text-good-700">{r.conv}%</td></tr>))}
        </tbody></table>) : <div className="px-4 py-3 text-sm text-muted">No visits.</div>}
    </div>
  );
}

export default function Insights() {
  const [range] = useRange();
  const { data, error, loading, reload } = useLoad((quiet) => api.breakdown(range, quiet), [range], { everyMs: 120000 });
  return (
    <>
      <h1 className="text-lg font-semibold">Insights</h1>
      <p className="text-2xs text-muted">Computed from the figures — never guessed. Visits, signed in, and the share that paid.</p>
      <Section title="What the numbers say"><InsightList range={range} /></Section>
      <State loading={loading} error={error} onRetry={reload}>
        {data ? (
          <>
            <Section title="Devices and places">
              <div className="grid gap-3 md:grid-cols-3">
                <Breakdown title="Device" rows={data.devices} /><Breakdown title="Browser" rows={data.browsers} /><Breakdown title="System" rows={data.systems} />
                <Breakdown title="State" rows={data.states} /><Breakdown title="City" rows={data.cities} />
              </div>
            </Section>
            <Section title="Pages" hint="Exits: visits that ended on the page">
              <Table head={['Page', 'Views', 'Visits', 'Exits', 'Exit rate']}>
                {data.pages.map((p) => <tr key={p.page}><td className="td font-mono text-2xs">{p.page}</td><td className="td tabular">{num(p.views)}</td><td className="td tabular">{num(p.sessions)}</td><td className="td tabular">{num(p.exits)}</td><td className="td tabular">{p.exit_pct}%</td></tr>)}
              </Table>
            </Section>
            <Section title="Taps" hint="Which buttons are used, and how many of those visits paid">
              {data.clicks.length ? (
                <Table head={['Button / link', 'Taps', 'Visits', 'Then paid']}>
                  {data.clicks.map((c) => <tr key={c.label}><td className="td text-sm">{c.label}</td><td className="td tabular">{num(c.taps)}</td><td className="td tabular">{num(c.sessions)}</td><td className="td tabular font-semibold text-good-700">{num(c.then_paid)}</td></tr>)}
                </Table>) : <div className="card px-4 py-4 text-sm text-muted">No taps recorded in this period.</div>}
            </Section>
            <Section title="Forms" hint="Field names only — never what was typed">
              <div className="grid gap-3 md:grid-cols-2">
                {data.forms.map((f) => (
                  <div key={f.name} className="card px-4 py-3 text-sm">
                    <div className="font-semibold text-ink">{f.name}</div>
                    <div className="mt-2 grid grid-cols-5 gap-2 text-center">
                      {[['Started', f.started], ['Code sent', f.submitted], ['Signed in', f.completed], ['Errors', f.errors], ['Completion', f.conv_pct != null ? `${f.conv_pct}%` : '—']].map(([l, v]) => (
                        <div key={l}><div className="tabular text-lg font-bold">{typeof v === 'number' ? num(v) : v}</div><div className="text-2xs text-muted">{l}</div></div>))}
                    </div>
                  </div>))}
                <div className="card">
                  <div className="border-b border-line bg-shell/60 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-muted">Fields used</div>
                  {data.fields.map((f) => <div key={f.label} className="flex px-4 py-1.5 text-sm"><span className="flex-1">{f.label}</span><span className="tabular">{num(f.focus)}</span></div>)}
                </div>
              </div>
            </Section>
          </>) : null}
      </State>
    </>
  );
}
