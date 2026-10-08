import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Stat, State, Table } from '../components/ui.jsx';
import { dateTime, num, pct } from '../lib/format';

/**
 * The chat's checks WITHOUT signing in (free sources only, 3 a day per device,
 * 10 per address). "Then signed in" is the chat doing its job: someone tried it
 * for free and came back with their mobile number.
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
          <p className="text-2xs text-muted">Vehicle checks in the chat without signing in.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Checks" trend="free_checks" value={num(s.checks)} sub={`${num(s.vehicles)} different vehicles`} />
            <Stat label="Found" value={num(s.found)} sub={`${pct(s.found, s.checks)} of checks`} tone={s.checks && s.found / s.checks < 0.5 ? 'wrong' : undefined} />
            <Stat label="People (devices)" value={num(s.devices)} />
            <Stat label="Then signed in" value={num(s.then_signed_in)} sub={`${pct(s.then_signed_in, s.devices)} of them`} tone={s.then_signed_in ? 'good' : undefined} />
          </div>
          <div className="mt-5">
            {data.rows.length ? (
              <Table head={['When', 'Vehicle', 'Result', 'Device', 'Address']}>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td whitespace-nowrap">{dateTime(r.created_at)}</td>
                    <td className="td plate">{r.reg_no}</td>
                    <td className="td">{r.found ? <span className="chip bg-good-50 text-good-700">found</span> : <span className="chip bg-wrong-50 text-wrong-700">not found / failed</span>}</td>
                    <td className="td font-mono text-2xs text-muted">{r.device}</td>
                    <td className="td font-mono text-2xs text-muted">{r.ip}</td>
                  </tr>
                ))}
              </Table>
            ) : <div className="card px-4 py-8 text-center text-sm text-muted">No free checks in this period.</div>}
          </div>
        </>
      ) : null}
    </State>
  );
}
