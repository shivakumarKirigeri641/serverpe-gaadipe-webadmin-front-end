import { Link, useSearchParams } from 'react-router-dom';

/* The website screens live under /web in the panel; a vehicle opens the panel's full vehicle profile. */
const webPath = (p) => (!p || /^\/(web|vehicles|payments|documents)(\/|$|\?)/.test(p) ? p || '/web' : `/web${p}`);
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { State } from '../components/ui.jsx';
import { dateTime, rupees } from '../lib/format';

/**
 * SEARCH EVERYTHING (spec §31, §103): a mobile, a vehicle number, a report or
 * payment id, or any GP-… id. Results grouped by what they are; each opens its
 * own screen here.
 */
const GROUPS = [
  ['ids', 'IDs'], ['customers', 'Customers'], ['sessions', 'Sessions'], ['vehicles', 'Vehicles'],
  ['reports', 'Reports'], ['payments', 'Payments'], ['events', 'Events'],
];

function line(group, x) {
  switch (group) {
    case 'customers': return [x.name || '-', `${x.mobile || ''}${x.paid ? ` · ${x.paid} paid` : ''}`, x.to || `/customers/${x.id}`];
    case 'vehicles': return [x.reg_no, [x.maker, x.model].filter(Boolean).join(' ') || '', x.to || `/search?q=${x.reg_no}`];
    case 'reports': return [x.report_number || `Report ${x.id}`, `${x.reg_no || ''} · ${dateTime(x.created_at)}`, x.to || `/reports`];
    case 'payments': return [`GP-T-${x.id} · ${rupees(x.amount_paise)}`, `${x.status || ''} · ${x.mobile || ''} · ${dateTime(x.created_at)}`, x.to || '/payments'];
    case 'sessions': return [`Visit ${x.session_id}`, `${x.mobile || 'anonymous'} · ${dateTime(x.started_at)}`, x.to];
    case 'events': return [x.name || x.kind || 'Event', `${x.reg_no || x.mobile || ''} · ${dateTime(x.occurred_at || x.created_at)}`, x.to || '/log'];
    default: return [`${x.type ? `${x.type} · ` : ''}${x.label || x.id}`, x.detail || '', x.to || '/'];
  }
}

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { data, error, loading } = useLoad(() => (api.webSearch ? api.webSearch(q) : api.search(q)), [q], { everyMs: 0 });
  const groups = data?.groups || {};
  const any = GROUPS.some(([k]) => (groups[k] || []).length);
  return (
    <>
      <h1 className="text-lg font-semibold">Search: “{q}”</h1>
      <div className="mt-4">
        <State loading={loading} error={error} empty={data && !any ? 'Nothing found. Try a mobile number, a vehicle number, a report or payment number, or a GP-… id.' : null}>
          {any ? (
            <div className="space-y-4">
              {GROUPS.filter(([k]) => (groups[k] || []).length).map(([k, label]) => (
                <section key={k}>
                  <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-muted">{label}</div>
                  <div className="card divide-y divide-line">
                    {groups[k].map((x, i) => {
                      const [title, sub, to] = line(k, x);
                      return (
                        <Link key={`${k}-${x.id || i}`} to={webPath(to)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-shell">
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{title}</span><span className="block truncate text-2xs text-muted">{sub}</span></span>
                          <span className="text-2xs text-brand">Open →</span>
                        </Link>);
                    })}
                  </div>
                </section>))}
            </div>
          ) : null}
        </State>
      </div>
    </>
  );
}
