import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { CopyId, Search, SourceChip, State, StatusChip, stepWords, Table } from '../components/ui.jsx';
import { ago, dateTime, deviceOf, duration, num, sessionCode } from '../lib/format';

/** SESSIONS (spec §15, §69): every website visit in the period, newest first; tap one for its whole story. */
const STATUSES = [['', 'Any status'], ['ONLINE', 'Online'], ['IDLE', 'Idle'], ['HIDDEN', 'Tab hidden'], ['OFFLINE', 'Offline'], ['ENDED', 'Left'], ['TERMINATED', 'Ended by admin']];

export default function Sessions() {
  const [range] = useRange();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad((quiet) => api.webSessions({ range, status, q: term, limit: 150 }, quiet), [range, status, term], { everyMs: 15000 });
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold">Sessions</h1><p className="text-2xs text-muted">Every visit to gaadipe.in in this period. A visit before and after signing in is one session.</p></div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto !py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <Search value={q} onChange={setQ} placeholder="Mobile, name, GP-S or s_… id" />
        </div>
      </div>
      <div className="mt-4">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'No visits match.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} visit{data.total === 1 ? '' : 's'}</div>
              <Table head={['Session', 'Customer', 'Status', 'Started', 'Duration', 'Last step', 'Source', 'Device', 'Outcome']}>
                {data.rows.map((s) => (
                  <tr key={s.session_id} className="cursor-pointer hover:bg-shell/60" onClick={() => navigate(`/sessions/${encodeURIComponent(s.session_id)}`)}>
                    <td className="td"><CopyId value={sessionCode(s.session_id, s.started_at)} /></td>
                    <td className="td">{s.user_id ? <><div className="text-ink">{s.name || '-'}</div><div className="tabular text-2xs text-muted">{s.mobile}</div></> : <span className="text-2xs text-muted">anonymous</span>}</td>
                    <td className="td"><StatusChip status={s.status} /></td>
                    <td className="td whitespace-nowrap text-2xs">{dateTime(s.started_at)}<div className="text-muted">seen {ago(s.last_seen_at)}</div></td>
                    <td className="td tabular text-2xs">{duration(s.started_at, new Date(s.ended_at || s.last_seen_at).getTime())}<div className="text-muted">{num(s.pages)} pages · {num(s.interactions)} taps</div></td>
                    <td className="td text-2xs">{stepWords(s.step)}<div className="max-w-[12rem] truncate text-muted">{s.action || ''}</div></td>
                    <td className="td"><SourceChip source={s.source || 'direct'} /></td>
                    <td className="td text-2xs">{deviceOf(s.device)}</td>
                    <td className="td text-2xs">{s.paid_in_visit ? <span className="chip bg-good-50 text-good-700">paid</span> : s.user_id ? 'signed in' : '—'}</td>
                  </tr>))}
              </Table>
            </>
          ) : null}
        </State>
      </div>
    </>
  );
}
