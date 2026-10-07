import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { Section, Stat, State, Table } from '../components/ui.jsx';
import { dateTime, num, rupees } from '../lib/format';

/** REFERRALS (spec §19): GaadiPe's own referral programme — links, joins, rewards and credits. */
export default function Referrals() {
  const { data, error, loading, reload } = useLoad((quiet) => api.gpReferrals({ limit: 100 }, quiet), []);
  const t = data?.totals;
  const keys = data?.rows?.[0] ? Object.keys(data.rows[0]).filter((k) => !/^id$|_id$/.test(k)).slice(0, 8) : [];
  return (
    <State loading={loading} error={error} onRetry={reload}>
      {t ? (
        <>
          <h1 className="text-lg font-semibold">Referrals</h1>
          <p className="text-2xs text-muted">Programme {data.enabled ? 'on' : 'off'} · at most {data.monthly_cap} rewards a month · {data.window_days}-day window · credits valid {data.credit_valid_days} days</p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Referrals" value={num(t.referrals)} sub={`${num(t.referrers)} referrer${t.referrers === 1 ? '' : 's'}`} />
            <Stat label="Waiting" value={num(t.waiting)} sub={`${num(t.expired)} expired · ${num(t.not_eligible)} not eligible`} />
            <Stat label="Rewarded" value={num(t.rewarded)} sub={`${num(t.credits_used)} credits used · ${num(t.credits_waiting)} waiting`} tone={t.rewarded ? 'good' : undefined} />
            <Stat label="Revenue from referrals" value={rupees(t.revenue_paise)} />
          </div>
          <Section title="Every referral">
            {data.rows?.length ? (
              <Table head={keys.map((k) => k.replace(/_/g, ' '))}>
                {data.rows.map((r, i) => (
                  <tr key={r.id || i}>{keys.map((k) => <td key={k} className="td text-2xs">{/_at$/.test(k) ? dateTime(r[k]) : /_paise$/.test(k) ? rupees(r[k]) : String(r[k] ?? '—')}</td>)}</tr>))}
              </Table>
            ) : <div className="card px-4 py-6 text-center text-sm text-muted">No referrals yet.</div>}
          </Section>
        </>
      ) : null}
    </State>
  );
}
