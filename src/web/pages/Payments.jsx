import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Section, SourceChip, Stat, State, Table } from '../components/ui.jsx';
import { ago, dateTime, num, rupees } from '../lib/format';

/* WHY A TRY FAILED, in Razorpay's words made plain (2026-10-08: "is it a time out?"). */
const FAIL_WORDS = {
  payment_timeout: 'timed out — the customer did not finish in time',
  payment_cancelled: 'cancelled by the customer',
  payment_failed: 'declined by the bank / UPI app',
  incorrect_pin: 'wrong UPI PIN / card PIN',
  incorrect_otp: 'wrong OTP',
  insufficient_balance: 'not enough balance',
  authentication_failed: 'authentication failed',
  bank_technical_error: 'the bank had a technical problem',
  server_error: 'Razorpay or the bank had a server problem',
  payment_risk_check_failed: 'stopped by the risk check',
  upi_mandate_rejected: 'UPI request rejected',
};
const failText = (f) => {
  if (!f) return null;
  const why = FAIL_WORDS[f.reason] || (f.reason ? f.reason.replace(/_/g, ' ') : 'reason not given');
  return [why, f.method ? `via ${f.method}` : null, f.source ? `(${f.source})` : null].filter(Boolean).join(' ');
};

/**
 * PAYMENTS (spec §18) and the PAYMENT RECOVERY QUEUE (§123) — the main admin's
 * payment figures, for the period picked at the top. Nobody is contacted from
 * here: the recovery queue is for looking, not for messaging.
 */
const RANGE_PARAM = { today: 'today', '7d': '7d', '30d': '30d' };
const STATUS_CLS = { paid: 'bg-good-50 text-good-700', failed: 'bg-wrong-50 text-wrong-700', refunded: 'bg-watch-50 text-watch-700' };

export default function Payments() {
  const [range] = useRange();
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('');
  const sum = useLoad((quiet) => api.paymentsSummary({ range: RANGE_PARAM[range] }, quiet), [range]);
  const list = useLoad((quiet) => api.payments({ range: RANGE_PARAM[range], status, limit: 100 }, quiet), [range, status]);
  // The recovery queue looks back at most 7 days (payflow WINDOWS).
  const rec = useLoad((quiet) => api.abandoned({ window: range === 'today' ? 'today' : '7d' }, quiet), [range]);
  const t = sum.data?.totals;

  return (
    <>
      <h1 className="text-lg font-semibold">Payments</h1>
      <State loading={sum.loading} error={sum.error} onRetry={sum.reload}>
        {t ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Paid" value={num(t.paid)} sub={`${num(t.started)} started · ${t.success_pct ?? '—'}% success`} tone={t.paid ? 'good' : undefined} />
              <Stat label="Gross" value={rupees(t.gross_paise)} sub={`${num(t.payers)} payer${t.payers === 1 ? '' : 's'} · ${rupees(t.arpu_paise)} each`} />
              <Stat label="Net (after GST, fees, costs)" value={rupees(t.net_paise)} sub={`GST ${rupees(t.gst_paise)} · gateway ${rupees(t.gateway_paise)}`} />
              <Stat label="Not completed / failed" value={`${num(t.not_completed)} / ${num(t.failed)}`} sub={`${num(t.refunded)} refunded`} tone={t.failed ? 'wrong' : undefined} />
            </div>
            {sum.data.series?.length ? (
              <Section title={sum.data.grain === 'hour' ? 'Payments by hour' : 'Payments by day'}>
                <div className="card px-2 py-3"><div className="h-52"><ResponsiveContainer>
                  <BarChart data={sum.data.series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#e3ecea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b8380' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b8380' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n) => (n === 'Gross' ? rupees(v) : v)} />
                    <Bar dataKey="payments" name="Payments" fill="#12a150" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer></div></div>
              </Section>
            ) : null}
            {sum.data.by_source?.length ? (
              <Section title="Revenue by source">
                <div className="card divide-y divide-line">
                  {sum.data.by_source.map((s) => (
                    <div key={s.source} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <SourceChip source={s.source} /><span className="ml-auto tabular">{num(s.payments)} paid</span>
                      <span className="tabular w-24 text-right font-semibold">{rupees(s.gross_paise)}</span>
                    </div>))}
                </div>
              </Section>
            ) : null}
          </>
        ) : null}
      </State>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[['all', 'Transactions'], ['recovery', `Payment recovery${rec.data?.total ? ` (${rec.data.total})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip border !px-3 !py-1 ${tab === k ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{l}</button>
        ))}
        {tab === 'all' ? (
          <select className="input ml-auto !w-auto !py-1 text-2xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Every status</option><option value="paid">Paid</option><option value="created">Started, not paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
          </select>) : null}
      </div>

      <div className="mt-3">
        {tab === 'all' ? (
          <State loading={list.loading} error={list.error} empty={list.data && !list.data.rows.length ? 'No payments in this period.' : null}>
            {list.data?.rows.length ? (
              <Table head={['When', 'Customer', 'Vehicle', 'Amount', 'Status', 'Source', 'ID']}>
                {list.data.rows.map((p) => (
                  <tr key={p.id}>
                    <td className="td whitespace-nowrap">{dateTime(p.paid_at || p.created_at)}</td>
                    <td className="td"><div className="text-ink">{p.person_name || '-'}</div><div className="tabular text-2xs text-muted">{p.mobile}</div></td>
                    <td className="td plate">{p.reg_no || '—'}</td>
                    <td className="td tabular">{rupees(p.amount_paise)}</td>
                    <td className="td"><span className={`chip ${STATUS_CLS[p.status] || 'bg-shell text-muted'}`}>{p.status_label || p.status}</span>{p.had_failure ? <div className="text-2xs text-wrong-700" title={p.failure?.description || ""}>had a failed try{p.failure ? ` — ${failText(p.failure)}` : ""}</div> : null}</td>
                    <td className="td"><SourceChip source={p.source} /></td>
                    <td className="td font-mono text-2xs text-muted">GP-T-{p.id}<div>{p.razorpay_payment_id || p.order_id}</div></td>
                  </tr>))}
              </Table>
            ) : null}
          </State>
        ) : (
          <State loading={rec.loading} error={rec.error} empty={rec.data && !rec.data.rows.length ? 'Nobody left a payment unfinished in this period.' : null}>
            {rec.data?.rows.length ? (
              <>
                <p className="mb-2 text-2xs text-muted">{rec.data.note} Nobody is contacted automatically.</p>
                <Table head={['Started', 'Customer', 'Vehicle', 'Amount', 'Why', 'Source', 'Since']}>
                  {rec.data.rows.map((p) => (
                    <tr key={p.id}>
                      <td className="td whitespace-nowrap">{dateTime(p.started_at)}</td>
                      <td className="td tabular">{p.mobile}</td>
                      <td className="td plate">{p.reg_no || '—'}</td>
                      <td className="td tabular">{rupees(p.amount_paise)}</td>
                      <td className="td"><div className="text-ink">{p.reason}</div>{p.reason_detail ? <div className="text-2xs text-muted">{p.reason_detail}</div> : null}</td>
                      <td className="td"><SourceChip source={p.source} /><div className="text-2xs text-muted">{p.channel}</div></td>
                      <td className="td text-2xs text-muted">{ago(p.last_activity)}</td>
                    </tr>))}
                </Table>
              </>
            ) : null}
          </State>
        )}
      </div>
    </>
  );
}
