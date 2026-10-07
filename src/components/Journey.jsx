/* The journey a visit reached (spec §54, §62): Arrived → Searched → Signed in → Saw a vehicle → Payment → Paid → Report. */
export default function Journey({ stages = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-2xs">
      {stages.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${s.done ? 'bg-good-50 text-good-700' : 'bg-shell text-muted'}`}>{s.done ? '✓' : '○'} {s.label}</span>
          {i < stages.length - 1 ? <span className="text-muted">→</span> : null}
        </span>
      ))}
    </div>
  );
}

/* The API calls behind a visit or a customer's vehicles (spec §25). */
export function ApiTrace({ rows = [] }) {
  if (!rows.length) return <div className="card px-4 py-4 text-sm text-muted">No records-API calls for these vehicles.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[620px]">
        <thead className="border-b border-line bg-shell/60"><tr>{['When', 'API', 'Vehicle', 'Result', 'Time', 'Error'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="td whitespace-nowrap text-2xs">{new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
              <td className="td font-mono text-2xs">{a.dataset}</td>
              <td className="td plate">{a.reg_no}</td>
              <td className="td">{a.ok ? <span className="chip bg-good-50 text-good-700">✓ {a.cache_hit ? 'cache' : 'ok'}</span> : <span className="chip bg-wrong-50 text-wrong-700">✗ {a.outcome || 'failed'}</span>}</td>
              <td className="td tabular text-2xs">{a.duration_ms != null ? `${a.duration_ms} ms` : '—'}</td>
              <td className="td max-w-[18rem] truncate text-2xs text-wrong-700" title={a.err || ''}>{a.err || ''}</td>
            </tr>))}
        </tbody>
      </table>
    </div>
  );
}
