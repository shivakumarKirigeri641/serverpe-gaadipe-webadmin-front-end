import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { Section, Stat, State, Table } from '../components/ui.jsx';
import { ago, num } from '../lib/format';

/**
 * SYSTEM HEALTH (spec §26): every service GaadiPe depends on (website, API,
 * database, ULIP, payments, SMS, email…) as Healthy / Warning / Critical, the
 * server itself (CPU, memory, disk, Node, PostgreSQL, SSL, domain) and the
 * background jobs. Words beside every colour, never colour alone.
 */
const LEVEL = {
  operational: ['✅ Healthy', 'bg-good-50 text-good-700'], ok: ['✅ Healthy', 'bg-good-50 text-good-700'],
  degraded: ['⚠️ Warning', 'bg-watch-50 text-watch-700'], warning: ['⚠️ Warning', 'bg-watch-50 text-watch-700'],
  down: ['⛔ Critical', 'bg-wrong-50 text-wrong-700'], critical: ['⛔ Critical', 'bg-wrong-50 text-wrong-700'],
  unknown: ['❔ Unknown', 'bg-shell text-muted'], off: ['○ Off', 'bg-shell text-muted'],
};
const level = (l) => LEVEL[l] || [l || 'Unknown', 'bg-shell text-muted'];

export default function Health() {
  const svc = useLoad((quiet) => api.healthServices(quiet), [], { everyMs: 30000 });
  const infra = useLoad((quiet) => api.infrastructure(quiet), [], { everyMs: 60000 });
  const jobs = useLoad((quiet) => api.jobs(quiet), [], { everyMs: 60000 });
  const i = infra.data;
  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">System health</h1>
        {svc.data ? <span className={`chip ${level(svc.data.overall)[1]}`}>{level(svc.data.overall)[0]}</span> : null}
      </div>
      <Section title="Services">
        <State loading={svc.loading} error={svc.error} onRetry={svc.reload}>
          {svc.data?.services?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {svc.data.services.map((s) => (
                <div key={s.key} className="card flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{s.name}</div>
                    <div className="text-2xs text-muted">{s.message}</div>
                  </div>
                  <div className="text-right">
                    <span className={`chip ${level(s.level)[1]}`}>{level(s.level)[0]}</span>
                    {s.response_ms != null ? <div className="tabular mt-1 text-2xs text-muted">{num(s.response_ms)} ms</div> : null}
                  </div>
                </div>))}
            </div>
          ) : null}
        </State>
      </Section>

      <Section title="Server">
        <State loading={infra.loading} error={infra.error}>
          {i ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="CPU" value={i.cpu?.load_pct != null ? `${i.cpu.load_pct}%` : '—'} sub={`${i.cpu?.cores || '?'} cores · load ${i.cpu?.load_1m ?? '—'}`} tone={i.cpu?.load_pct > 85 ? 'wrong' : undefined} />
              <Stat label="Memory" value={`${i.memory?.used_pct ?? '—'}%`} sub={`${num(i.memory?.used_mb)} of ${num(i.memory?.total_mb)} MB`} tone={i.memory?.used_pct > 90 ? 'wrong' : undefined} />
              <Stat label="Disk" value={`${i.disk?.used_pct ?? '—'}%`} sub={`${i.disk?.free_gb ?? '—'} GB free`} tone={i.disk?.used_pct > 80 ? 'wrong' : undefined} />
              <Stat label="Uptime" value={`${i.server_uptime_h ?? '—'} h`} sub={`app ${i.node?.uptime_min ?? '—'} min · Node ${i.node?.version || ''}`} />
              <Stat label="PostgreSQL" value={i.postgres ? `${i.postgres.active}/${i.postgres.connections}` : '—'} sub={i.postgres ? `active / open · ${i.postgres.size_mb} MB` : 'not readable'} />
              <Stat label="SSL" value={i.ssl?.days_left != null ? `${i.ssl.days_left} d` : '—'} sub={i.ssl?.issuer || ''} tone={i.ssl?.days_left < 14 ? 'wrong' : undefined} />
              <Stat label="Domain" value={i.domain?.days_left != null ? `${i.domain.days_left} d` : '—'} sub={i.domain?.domain || ''} />
              <Stat label="PM2" value={i.pm2 ? `${(i.pm2 || []).length || 'ok'}` : '—'} sub={i.pm2 ? 'processes' : 'not available here'} />
            </div>
          ) : null}
        </State>
      </Section>

      <Section title="Background jobs" hint="What runs on a timer: alerts, emails, the watchdog, reconciliation…">
        <State loading={jobs.loading} error={jobs.error} empty={jobs.data && !(jobs.data.rows || []).length ? 'No job history on this server yet.' : null}>
          {(jobs.data?.rows || []).length ? (
            <Table head={['Job', 'Status', 'Last run', 'Every', 'Runs', 'Last error']}>
              {jobs.data.rows.map((j) => (
                <tr key={j.name}>
                  <td className="td"><div className="text-ink">{j.label || j.name}</div><div className="text-2xs text-muted">{j.about}</div></td>
                  <td className="td"><span className={`chip ${level(j.status === 'ok' ? 'ok' : j.status === 'failed' ? 'critical' : j.status === 'missed' ? 'warning' : j.status)[1]}`}>{j.status}</span></td>
                  <td className="td text-2xs">{ago(j.last_run || j.last_end)}</td>
                  <td className="td text-2xs">{j.every_s ? `${Math.round(j.every_s / 60) || 1} min` : '—'}</td>
                  <td className="td tabular text-2xs">{num(j.runs_since_start)}</td>
                  <td className="td max-w-[16rem] truncate text-2xs text-wrong-700" title={j.last_error || ''}>{j.last_error || ''}</td>
                </tr>))}
            </Table>
          ) : null}
        </State>
      </Section>
    </>
  );
}
