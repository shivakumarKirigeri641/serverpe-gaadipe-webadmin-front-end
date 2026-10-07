import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session.jsx';
import { Confirm } from '../components/SessionActions.jsx';
import { State, Table } from '../components/ui.jsx';
import { dateTime, num } from '../lib/format';

/**
 * TRANSFERS (user, 2026-10-07): a customer changed their mobile number and asked
 * for their vehicles and reports to move with them. Approve: vehicles, reports,
 * alerts and running subscriptions move to the new number (payments and invoices
 * stay where they were made). Reject: nothing moves. Either way they are emailed.
 */
export default function Transfers() {
  const { can } = useSession();
  const [status, setStatus] = useState('pending');
  const [ask, setAsk] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data, error, loading, reload } = useLoad(() => api.transfers(status), [status], { everyMs: 60000 });
  const decide = (t, approve) => setAsk({
    title: approve ? `Move ${t.vehicles} vehicle(s) and ${t.reports} report(s) to ${t.to_mobile}?` : 'Reject this transfer?',
    danger: !approve, confirmLabel: approve ? 'Approve and move' : 'Reject', needReason: !approve,
    body: approve ? `Vehicles, reports, alerts and running subscriptions of ${t.from_mobile} move to ${t.to_mobile}. Payments and invoices stay with the old number. The customer is emailed.`
      : 'Nothing moves. The customer is emailed with your reason.',
    onConfirm: async (note) => { const o = await api.decideTransfer(t.id, approve, note); setMsg(`${approve ? 'Approved' : 'Rejected'}.${o.moved ? ` Moved ${o.moved.vehicles} vehicle(s), ${o.moved.reports} report(s).` : ''} ${o.mail?.emailed ? 'Customer emailed.' : `Not emailed (${o.mail?.why || 'no email'}).`}`); reload(); },
  });
  return (
    <>
      <h1 className="text-lg font-semibold">Transfers</h1>
      <p className="text-2xs text-muted">Customers who moved to a new mobile number and asked for their vehicles and reports to follow.</p>
      <div className="mt-3 flex gap-1.5">
        {['pending', 'approved', 'rejected', 'all'].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip border !px-3 !py-1 capitalize ${status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{s}</button>)}
      </div>
      {msg ? <div className="mt-3 rounded-lg bg-good-50 px-3 py-2 text-sm text-good-700">{msg}</div> : null}
      <div className="mt-3">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'Nothing here.' : null}>
          {data?.rows.length ? (
            <Table head={['Asked', 'From', 'To', 'Has', 'Their note', 'Status', '']}>
              {data.rows.map((t) => (
                <tr key={t.id}>
                  <td className="td whitespace-nowrap text-2xs">{dateTime(t.created_at)}</td>
                  <td className="td"><Link className="text-ink hover:underline" to={`/customers/${t.from_user_id}`}>{t.from_name || '-'}</Link><div className="tabular text-2xs text-muted">{t.from_mobile}</div></td>
                  <td className="td"><Link className="text-ink hover:underline" to={`/customers/${t.to_user_id}`}>{t.to_name || '-'}</Link><div className="tabular text-2xs text-muted">{t.to_mobile}</div></td>
                  <td className="td text-2xs">{num(t.vehicles)} vehicles · {num(t.reports)} reports</td>
                  <td className="td max-w-[16rem] text-2xs">{t.note || '-'}</td>
                  <td className="td text-2xs"><span className="chip bg-shell text-ink">{t.status}</span>{t.decided_at ? <div className="text-muted">{t.admin_name} · {dateTime(t.decided_at)}</div> : null}{t.admin_note ? <div className="text-muted">“{t.admin_note}”</div> : null}</td>
                  <td className="td">{t.status === 'pending' && can.includes('block') ? (
                    <div className="flex gap-1.5"><button className="btn-primary !px-3 !py-1 text-2xs" onClick={() => decide(t, true)}>Approve</button>
                      <button className="btn-quiet !px-3 !py-1 text-2xs text-wrong-700" onClick={() => decide(t, false)}>Reject</button></div>) : null}</td>
                </tr>))}
            </Table>) : null}
        </State>
      </div>
      {ask ? <Confirm {...ask} onClose={() => setAsk(null)} /> : null}
    </>
  );
}
