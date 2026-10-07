import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useRange } from '../components/Layout.jsx';
import { Search, SourceChip, Stat, State, Table } from '../components/ui.jsx';
import JustCame from '../components/JustCame.jsx';
import { ago, dateTime, num, placeOf, rupees } from '../lib/format';

/**
 * EVERY CUSTOMER, WEBSITE AND WHATSAPP (2026-10-07). One account per mobile;
 * each tagged by where they used GaadiPe and by how an alert can reach them now
 * that WhatsApp is disabled — browser notifications, a confirmed email, or
 * nothing (they only hear from GaadiPe when they open the site).
 */
const CHANNELS = [['all', 'Everyone'], ['web', 'Website only'], ['whatsapp', 'WhatsApp only'], ['both', 'Both']];
const REACH = [['all', 'Any'], ['push', '🔔 Notifications'], ['email', '✉️ Email'], ['none', '⚠️ Cannot be reached']];
const CH_CHIP = {
  web: ['Website', 'bg-brand/10 text-brand'],
  whatsapp: ['WhatsApp', 'bg-good-50 text-good-700'],
  both: ['Website + WhatsApp', 'bg-[#eef2ff] text-[#3730a3]'],
};

export default function Customers() {
  const [range] = useRange();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [channel, setChannel] = useState('all');
  const [reach, setReach] = useState('all');
  const [everyone, setEveryone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 400); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad(
    (quiet) => api.customers({ range, q: term, channel, reach, active: everyone ? 'all' : '', limit: 150 }, quiet),
    [range, term, channel, reach, everyone]);
  const s = data?.summary;

  return (
    <>
      <JustCame />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Customers</h1>
          <p className="text-2xs text-muted">Website and WhatsApp customers together — one account per mobile number.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Mobile, name or email" />
      </div>

      {s ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="All customers" value={num(s.total)} sub={`${num(s.web_only)} website · ${num(s.whatsapp_only)} WhatsApp · ${num(s.both)} both`} />
          <Stat label="Get notifications" value={num(s.push)} sub="browser alerts on a phone" tone={s.push ? 'good' : undefined} />
          <Stat label="Confirmed email" value={num(s.email)} sub="alerts by email" tone={s.email ? 'good' : undefined} />
          <Stat label="Cannot be reached" value={num(s.unreachable)} sub={`${num(s.whatsapp_unreachable)} of them came on WhatsApp`} tone={s.unreachable ? 'wrong' : undefined} />
        </div>
      ) : null}
      {s?.whatsapp_unreachable ? (
        <p className="mt-2 rounded-lg bg-watch-50 px-3 py-2 text-2xs text-watch-700">
          {num(s.whatsapp_unreachable)} WhatsApp customer{s.whatsapp_unreachable === 1 ? '' : 's'} have no notifications and no confirmed email, so alerts cannot reach them
          until they sign in at gaadipe.in and add an email or allow notifications. The chat asks them to as soon as they sign in.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select className="input !w-auto !py-1.5 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Where they came">
          {CHANNELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="input !w-auto !py-1.5 text-sm" value={reach} onChange={(e) => setReach(e.target.value)} aria-label="How alerts reach them">
          {REACH.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-2xs text-muted">
          <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} className="accent-[#0f766e]" />
          Everyone ever (not only active in this period)
        </label>
      </div>

      <div className="mt-3">
        <State loading={loading} error={error} onRetry={reload} empty={data && !data.rows.length ? 'No customers match.' : null}>
          {data?.rows.length ? (
            <>
              <div className="mb-2 text-2xs text-muted">{num(data.total)} customer{data.total === 1 ? '' : 's'}</div>
              <Table head={['Customer', 'Used', 'Last seen', 'Alerts reach them', 'Came from', 'Vehicles', 'Paid', 'Since']}>
                {data.rows.map((c) => {
                  const [chLabel, chCls] = CH_CHIP[c.channel] || CH_CHIP.web;
                  return (
                    <tr key={c.user_id} className="cursor-pointer hover:bg-shell/60" onClick={() => navigate(`/web/customers/${c.user_id}`)}>
                      <td className="td">
                        <div className="flex items-center gap-1.5 text-ink">{c.name || '-'}{c.is_new ? <span className="chip bg-good-50 text-good-700">new</span> : null}</div>
                        <div className="tabular text-2xs text-muted">{c.mobile}{c.email ? ` · ${c.email}` : ''}</div>
                      </td>
                      <td className="td"><span className={`chip ${chCls}`}>{chLabel}</span>{c.wa_stop ? <div className="mt-1 text-2xs text-wrong-700">replied STOP</div> : null}</td>
                      <td className="td whitespace-nowrap">
                        <div>{ago(c.last_seen)}</div>
                        <div className="text-2xs text-muted">{c.web_last ? `web ${ago(c.web_last)}` : ''}{c.web_last && c.wa_last ? ' · ' : ''}{c.wa_last ? `WhatsApp ${ago(c.wa_last)}` : ''}</div>
                      </td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1">
                          {c.push_devices ? <span className="chip bg-good-50 text-good-700">🔔 {c.push_devices}</span> : null}
                          {c.email_ok ? <span className="chip bg-good-50 text-good-700">✉️ email</span>
                            : c.email ? <span className="chip bg-watch-50 text-watch-700">✉️ not confirmed</span> : null}
                          {!c.push_devices && !c.email_ok ? <span className="chip bg-wrong-50 text-wrong-700">⚠️ none</span> : null}
                        </div>
                      </td>
                      <td className="td"><SourceChip source={c.source} /><div className="mt-1 text-2xs text-muted">{placeOf(c.place)}</div></td>
                      <td className="td tabular">{num(c.vehicles)}{c.watching ? <div className="text-2xs text-muted">{c.watching} watched</div> : null}</td>
                      <td className="td tabular">{c.paid ? <span className="font-semibold text-good-700">{c.paid} · {rupees(c.revenue_paise)}</span> : <span className="text-muted">—</span>}</td>
                      <td className="td whitespace-nowrap text-2xs text-muted">{dateTime(c.first_at)}</td>
                    </tr>
                  );
                })}
              </Table>
            </>
          ) : null}
        </State>
      </div>
    </>
  );
}
