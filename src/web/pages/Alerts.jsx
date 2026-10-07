import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useAlerts } from '../components/Layout.jsx';
import { useSession } from '../lib/session.jsx';
import { Section, State, Table } from '../components/ui.jsx';
import { ago, dateTime, num } from '../lib/format';

/**
 * THE ALERT CENTER (spec §74–82), on the main admin's alert store: repeats are
 * grouped into one alert with a count, each can be acknowledged and resolved
 * with a note, and every rule can be muted for a while.
 */
export const SEV = {
  critical: ['🔴', 'Critical', 'bg-wrong-50 text-wrong-700'],
  warning: ['🟠', 'Warning', 'bg-watch-50 text-watch-700'],
  info: ['🔵', 'Info', 'bg-brand/10 text-brand'],
  success: ['🟢', 'Success', 'bg-good-50 text-good-700'],
};

export default function Alerts() {
  const { reload: reloadBell } = useAlerts();
  const { can } = useSession();
  const [status, setStatus] = useState('active');
  const [severity, setSeverity] = useState('');
  const [note, setNote] = useState({});
  const { data, error, loading, reload } = useLoad((quiet) => api.alerts({ status, severity }, quiet), [status, severity], { everyMs: 20000 });
  const rules = useLoad(() => api.alertRules(), [], { everyMs: 0 });

  const act = async (fn) => { await fn(); reload(); reloadBell(); };
  const rows = data?.rows || [];
  const counts = rows.reduce((c, a) => ({ ...c, [a.severity]: (c[a.severity] || 0) + 1 }), {});

  return (
    <>
      <h1 className="text-lg font-semibold">Alerts</h1>
      <p className="text-2xs text-muted">Repeats are grouped into one alert with a count. Acknowledge to say someone is on it; resolve with a note when it is over.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[['active', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`chip border !px-3 !py-1 ${status === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {[['', 'Every severity'], ...Object.entries(SEV).map(([k, v]) => [k, `${v[0]} ${v[1]}${counts[k] && !severity ? ` ${counts[k]}` : ''}`])].map(([k, l]) => (
          <button key={k || 'all'} onClick={() => setSeverity(k)} className={`chip border !px-3 !py-1 ${severity === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>
        ))}
      </div>

      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !rows.length ? (status === 'active' ? '✅ Nothing needs attention.' : 'No alerts.') : null}>
          {rows.length ? (
            <div className="space-y-2">
              {rows.map((a) => {
                const [icon, label, cls] = SEV[a.severity] || SEV.info;
                return (
                  <div key={a.id} className={`card rise px-4 py-3 ${a.status === 'open' && a.severity === 'critical' ? 'border-wrong-500/40' : ''}`}>
                    <div className="flex flex-wrap items-start gap-2">
                      <span className={`chip ${cls}`}>{icon} {label}</span>
                      <span className="chip bg-shell text-muted">{a.status}</span>
                      {a.seen_count > 1 ? <span className="chip bg-shell text-ink">×{num(a.seen_count)}</span> : null}
                      <span className="ml-auto text-2xs text-muted" title={dateTime(a.created_at)}>first {ago(a.created_at)} · last {ago(a.last_seen_at)}</span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-ink">{a.title}</div>
                    {a.description ? <div className="mt-0.5 whitespace-pre-line text-sm text-body">{a.description}</div> : null}
                    <div className="mt-1 text-2xs text-muted">
                      {a.source ? `Source: ${a.source} · ` : ''}ID A-{a.id}
                      {a.acknowledged_at ? ` · acknowledged by ${a.acknowledged_by_name || 'an admin'} ${ago(a.acknowledged_at)}` : ''}
                      {a.resolved_at ? ` · resolved by ${a.resolved_by_name || 'the system'} ${ago(a.resolved_at)}${a.resolution ? ` — “${a.resolution}”` : ''}` : ''}
                    </div>
                    {a.status !== 'resolved' ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {a.status === 'open' ? <button className="btn-quiet !px-3 !py-1.5 text-2xs" onClick={() => act(() => api.alertAck(a.id))}>Acknowledge</button> : null}
                        <input className="input !w-56 !py-1.5 text-2xs" placeholder="Resolution note (optional)" value={note[a.id] || ''}
                          onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} />
                        <button className="btn-primary !px-3 !py-1.5 text-2xs" onClick={() => act(() => api.alertResolve(a.id, note[a.id] || ''))}>Resolve</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </State>
      </div>

      <Section title="Alert rules" hint="What raises an alert, and how loud. Mute a rule while you deal with its cause.">
        <State loading={rules.loading} error={rules.error}>
          {rules.data?.rows?.length ? (
            <Table head={['Rule', 'Severity', 'Open', 'Muted until', '']}>
              {rules.data.rows.map((r) => (
                <tr key={r.key}>
                  <td className="td"><div className="text-ink">{r.label}</div><div className="text-2xs text-muted">{r.about}</div></td>
                  <td className="td"><span className={`chip ${(SEV[r.severity] || SEV.info)[2]}`}>{(SEV[r.severity] || SEV.info)[1]}</span></td>
                  <td className="td tabular">{r.open || 0}</td>
                  <td className="td text-2xs">{r.muted_until && new Date(r.muted_until) > new Date() ? dateTime(r.muted_until) : '—'}</td>
                  <td className="td">
                    {can.includes('settings') ? (
                      <select className="input !w-auto !py-1 text-2xs" defaultValue="" onChange={async (e) => { if (e.target.value) { await api.muteRule(r.key, Number(e.target.value)); rules.reload(); } }}>
                        <option value="">Mute…</option><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">1 day</option><option value="0">Unmute</option>
                      </select>) : null}
                  </td>
                </tr>
              ))}
            </Table>
          ) : null}
        </State>
      </Section>
    </>
  );
}
