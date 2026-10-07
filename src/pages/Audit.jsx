import { useState } from 'react';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { State, Table } from '../components/ui.jsx';
import { dateTime, num } from '../lib/format';

/**
 * THE AUDIT LOG (spec §41, §107): every admin action, append-only in the
 * database itself — sign-ins, views of a customer, switches, sign-outs,
 * terminations. Nothing here can be edited or deleted.
 */
export default function Audit() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useLoad(() => api.audit({ action, limit: 50, offset: page * 50 }), [action, page], { everyMs: 0 });
  const detail = (d) => {
    if (!d) return '';
    const o = typeof d === 'string' ? (() => { try { return JSON.parse(d); } catch { return { text: d }; } })() : d;
    return Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
  };
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Audit log</h1>
          <p className="text-2xs text-muted">Every admin action, as it happened. Append-only — it cannot be changed.</p>
        </div>
        <input className="input !w-56 !py-1.5 text-sm" placeholder="Action, e.g. sign_in" value={action} onChange={(e) => { setPage(0); setAction(e.target.value.trim()); }} />
      </div>
      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'Nothing recorded.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} entries</div>
              <Table head={['When', 'Admin', 'Action', 'Details', 'IP']}>
                {data.rows.map((a) => (
                  <tr key={a.id}>
                    <td className="td whitespace-nowrap text-2xs">{dateTime(a.created_at)}</td>
                    <td className="td text-2xs">{a.name || '—'}</td>
                    <td className="td font-mono text-2xs text-ink">{a.action}</td>
                    <td className="td max-w-[28rem] break-words text-2xs text-muted">{detail(a.detail)}</td>
                    <td className="td font-mono text-2xs text-muted">{a.ip}</td>
                  </tr>))}
              </Table>
              <div className="mt-3 flex justify-between">
                <button className="btn-quiet !py-1.5 text-2xs" disabled={!page} onClick={() => setPage(page - 1)}>← Newer</button>
                <button className="btn-quiet !py-1.5 text-2xs" disabled={(page + 1) * 50 >= data.total} onClick={() => setPage(page + 1)}>Older →</button>
              </div>
            </>
          ) : null}
        </State>
      </div>
    </>
  );
}
