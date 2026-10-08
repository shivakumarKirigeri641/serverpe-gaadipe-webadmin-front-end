import { Fragment, useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Stat, State, Table } from '../components/ui.jsx';
import { dateTime, num, pct } from '../lib/format';

/**
 * The chat's checks WITHOUT signing in. Since 2026-10-08 (migration 142): one a
 * day per browser and per network address, after "Agree & check", showing make,
 * model name (variant hidden) and fuel. "Then signed in" is the chat doing its
 * job: someone tried it for free and came back with their mobile number.
 */
export default function FreeChecks() {
  const [range] = useRange();
  const { data, error, loading, reload } = useLoad((quiet) => api.freeChecks(range, quiet), [range], { everyMs: 30000 });
  const s = data?.summary;
  return (
    <State loading={loading} error={error} onRetry={reload}>
      {s ? (
        <>
          <h1 className="text-lg font-semibold">Free checks</h1>
          <p className="text-2xs text-muted">Vehicle checks in the chat without signing in — after “Agree & check”, make, model name and fuel only.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Checks" trend="free_checks" value={num(s.checks)} sub={`${num(s.vehicles)} different vehicles`} />
            <Stat label="Found" value={num(s.found)} sub={`${pct(s.found, s.checks)} of checks`} tone={s.checks && s.found / s.checks < 0.5 ? 'wrong' : undefined} />
            <Stat label="People (devices)" value={num(s.devices)} />
            <Stat label="Then signed in" value={num(s.then_signed_in)} sub={`${pct(s.then_signed_in, s.devices)} of them`} tone={s.then_signed_in ? 'good' : undefined} />
          </div>
          <Audit />
        </>
      ) : null}
    </State>
  );
}

const OUTCOME = {
  shown: ['shown', 'bg-good-50 text-good-700'],
  not_found: ['not found', 'bg-watch-50 text-watch-700'],
  failed: ['failed', 'bg-wrong-50 text-wrong-700'],
  refused: ['refused', 'bg-shell text-muted'],
};
const REFUSAL = {
  no_consent: 'did not agree', no_device_id: 'no browser id (likely a bot)', daily_limit_device: 'already used today (this browser)',
  daily_limit_ip: 'already used today (this network)', hourly_site_cap: 'site hourly cap', scraping_guard: 'scanning guard', vehicle_blocked: 'vehicle blocked',
  retry_limit: '3 failed tries this hour (records server down)',
};

/*
 * THE FULL RECORD (user, 2026-10-08: "add all complete details of device, ip,
 * session, date & time stamp, agent, ids and more"). Every attempt, refused ones
 * too; tap a row for everything recorded, including the consent words.
 */
function Audit() {
  const [days, setDays] = useState(7);
  const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useLoad((quiet) => api.freeChecksAudit(days, quiet), [days], { everyMs: 30000 });
  const t = data?.totals;
  const line = (k, v) => (v == null || v === '' ? null : <div key={k} className="flex gap-2"><span className="w-36 shrink-0 text-muted">{k}</span><span className="break-all text-ink">{v}</span></div>);
  return (
    <div className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Full record — every attempt</h2>
          <p className="text-2xs text-muted">{t ? `${num(t.attempts)} attempts · ${num(t.shown)} shown · ${num(t.refused)} refused · ${num(t.then_signed_in)} then signed in` : '…'}</p>
        </div>
        <div className="flex gap-1">
          {[1, 7, 30].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={`chip border !px-3 !py-1 ${days === d ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{d === 1 ? 'Today' : `${d} days`}</button>
          ))}
        </div>
      </div>
      <State loading={loading} error={error} onRetry={reload}>
        {data?.rows?.length ? (
          <Table head={['When', 'Vehicle', 'Result', 'Shown', 'Device', 'IP · place', 'Came from', 'Signed in later']}>
            {data.rows.map((r) => {
              const [word, cls] = OUTCOME[r.outcome] || [r.outcome, 'bg-shell text-muted'];
              const d = r.device || {};
              const p = r.place || {};
              return (
                <Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-shell/60" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className="td whitespace-nowrap">{dateTime(r.created_at)}</td>
                    <td className="td plate">{r.reg_no || '—'}</td>
                    <td className="td"><span className={`chip ${cls}`}>{word}</span>{r.outcome === 'refused' ? <div className="text-2xs text-muted">{REFUSAL[r.refusal] || r.refusal}</div> : null}</td>
                    <td className="td text-2xs">{r.shown ? [r.shown.maker, r.shown.model ? `${r.shown.model}${r.shown.variant_hidden ? ' •••' : ''}` : null, r.shown.fuel].filter(Boolean).join(' · ') : '—'}</td>
                    <td className="td text-2xs">{[d.type, [d.vendor, d.model].filter(Boolean).join(' '), [d.os, d.os_version].filter(Boolean).join(' '), d.browser].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="td text-2xs"><span className="font-mono">{r.ip || '—'}</span><div className="text-muted">{[p.city, p.region].filter(Boolean).join(', ')}</div></td>
                    <td className="td text-2xs">{r.source || 'direct'}{r.campaign ? <div className="text-muted">{r.campaign}</div> : null}</td>
                    <td className="td text-2xs">{r.linked_mobile ? `…${String(r.linked_mobile).slice(-4)}` : '—'}</td>
                  </tr>
                  {open === r.id ? (
                    <tr><td className="td bg-shell/40" colSpan={8}>
                      <div className="grid gap-1 text-2xs md:grid-cols-2">
                        <div className="space-y-0.5">
                          {[line('Record id', r.id), line('Date & time', new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })),
                            line('Device id', r.device_id), line('Visitor id', r.visitor_id), line('Session id', r.session_id),
                            line('IP', r.ip), line('IP chain', r.ip_chain), line('Place', [p.city, p.region, p.country].filter(Boolean).join(', ')),
                            line('Came from', r.referrer), line('Page', r.page), line('Source · campaign', [r.source, r.campaign].filter(Boolean).join(' · ')),
                            line('Data from', r.data_source), line('Took', r.latency_ms != null ? `${r.latency_ms} ms` : null)]}
                        </div>
                        <div className="space-y-0.5">
                          {[line('Device', [d.type, d.vendor, d.model].filter(Boolean).join(' · ')), line('OS', [d.os, d.os_version].filter(Boolean).join(' ')),
                            line('Browser', [d.browser, d.browser_version].filter(Boolean).join(' ')), line('Screen · viewport', [d.screen, d.viewport].filter(Boolean).join(' · ')),
                            line('Time zone', d.timezone), line('Languages', d.languages), line('Network', d.connection), line('Platform', d.platform),
                            line('CPU · memory', [d.cpu_cores ? `${d.cpu_cores} cores` : null, d.memory_gb ? `${d.memory_gb} GB` : null].filter(Boolean).join(' · ')),
                            line('User agent', r.user_agent)]}
                        </div>
                        <div className="md:col-span-2 mt-1 rounded-lg bg-white p-2">
                          <div className="font-semibold text-ink">Consent</div>
                          {r.consent ? (
                            <div className="space-y-0.5">
                              {[line('Agreed', `${r.consent.agreed ? 'Yes' : 'No'} — ${r.consent.method || ''}`), line('Language', r.consent.language),
                                line('Words shown', r.consent.words), line('Policy versions', r.consent.versions ? Object.entries(r.consent.versions).map(([k, v]) => `${k} ${v}`).join(' · ') : null),
                                line('Free check terms', r.consent.free_check_terms_version), line('Lawful purpose', r.consent.lawful_purpose_confirmed ? 'confirmed' : null), line('At', r.consent.at)]}
                            </div>
                          ) : <div className="text-muted">No consent given — nothing was looked up.</div>}
                        </div>
                      </div>
                    </td></tr>
                  ) : null}
                </Fragment>
              );
            })}
          </Table>
        ) : <div className="card px-4 py-8 text-center text-sm text-muted">No free-check attempts in this period.</div>}
      </State>
    </div>
  );
}
