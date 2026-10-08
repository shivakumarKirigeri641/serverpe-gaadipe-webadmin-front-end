import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useLive } from '../lib/live.jsx';
import { CopyId, Section, SourceChip, State, StatusChip, stepWords } from '../components/ui.jsx';
import Timeline from '../components/Timeline.jsx';
import Journey, { ApiTrace } from '../components/Journey.jsx';
import SessionActions from '../components/SessionActions.jsx';
import PhoneReplica from '../components/PhoneReplica.jsx';
import { ago, customerCode, dateTime, deviceCode, deviceOf, duration, num, placeOf, rupees, sessionCode } from '../lib/format';

/**
 * ONE VISIT — THE SESSION MONITOR (spec §8, §11, §39). Header: who, status,
 * duration, device, source, place, first or returning. CURRENT STATE from the
 * live stream while they are on the site: page, step, what they last did, what
 * is on their screen, scroll depth, time since the last event. Then tabs:
 * Timeline · Pages · Network/API · Vehicle & payment · Errors · Attribution.
 */
const TABS = [['timeline', 'Timeline'], ['pages', 'Pages'], ['api', 'Network / API'], ['money', 'Vehicle & payment'], ['errors', 'Errors'], ['attribution', 'Attribution']];

export default function SessionRoom() {
  const { id } = useParams();
  const live = useLive();
  const [tab, setTab] = useState('timeline');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const now = live?.presence?.rows?.find((r) => r.session_id === id) || null;
  // While they are here, the story is re-read every 5 s; afterwards it does not change.
  const { data, error, loading, reload } = useLoad((quiet) => api.webSession(id, quiet), [id], { everyMs: now ? 5000 : 0 });
  const s = data?.session;
  const cur = now || s;

  return (
    <State loading={loading} error={error} onRetry={reload} empty={data && !s ? 'No such visit.' : null}>
      {s ? (
        <div className="xl:flex xl:items-start xl:gap-5">
        <div className="min-w-0 flex-1">
          <div className="card px-4 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold">{s.user_id ? (s.name || '-') : 'Anonymous visitor'}</h1>
                  <StatusChip status={now?.status || s.status} />
                  {s.returning ? <span className="chip bg-shell text-ink">returning · {s.earlier} earlier visit{s.earlier === 1 ? '' : 's'}</span> : <span className="chip bg-shell text-muted">first visit</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <CopyId value={sessionCode(s.session_id, s.started_at)} />
                  {s.user_id ? <Link to={`/web/customers/${s.user_id}`} className="text-2xs font-semibold text-brand">{customerCode(s.user_id)} →</Link> : null}
                  <CopyId value={deviceCode(s.visitor_id)} />
                  {s.mobile ? <span className="tabular text-2xs text-muted">{s.mobile}</span> : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-2xs sm:grid-cols-4">
                <span className="text-muted">Duration</span><span className="tabular text-ink">{duration(s.started_at, now ? Date.now() : new Date(s.ended_at || s.last_seen_at).getTime())}</span>
                <span className="text-muted">Started</span><span className="text-ink">{dateTime(s.started_at)}</span>
                <span className="text-muted">Device</span><span className="text-ink">{deviceOf(s.device)}</span>
                <span className="text-muted">Place</span><span className="text-ink">{placeOf(s.place)}</span>
              </div>
            </div>
            <div className="mt-3"><Journey stages={data.stages} /></div>
            <SessionActions session={s} onDone={reload} />
          </div>

          <Section title="Current state" hint={now ? 'Live — from the visitor’s own page' : `Last known — the visit is ${String(s.status).toLowerCase()}`}>
            <div className="card grid gap-3 px-4 py-3 text-sm sm:grid-cols-3">
              <div><div className="text-2xs text-muted">Page</div><div className="font-mono text-2xs text-ink">{cur.page || '—'}</div></div>
              <div><div className="text-2xs text-muted">Journey step</div><div className="text-ink">{stepWords(cur.step)}</div></div>
              <div><div className="text-2xs text-muted">On screen</div><div className="text-ink">{cur.section || '—'}{cur.scroll_pct != null ? <span className="text-2xs text-muted"> · scrolled {cur.scroll_pct}%</span> : null}</div></div>
              <div><div className="text-2xs text-muted">Last action</div><div className="text-ink">{cur.action || '—'}</div></div>
              <div><div className="text-2xs text-muted">Since the last action</div><div className="tabular text-ink">{cur.last_action_at ? duration(cur.last_action_at) : '—'}</div></div>
              <div><div className="text-2xs text-muted">Tab</div><div className="text-ink">{cur.visible === false ? 'In the background' : now ? 'Visible' : '—'} · seen {ago(cur.last_seen_at)}</div></div>
            </div>
          </Section>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`chip border !px-3 !py-1 ${tab === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>
                {l}{k === 'errors' && data.errors.length ? ` (${data.errors.length})` : ''}{k === 'api' && data.api.length ? ` (${data.api.length})` : ''}</button>))}
          </div>
          <div className="mt-3">
            {tab === 'timeline' ? <Timeline items={data.timeline} linkedAt={s.linked_at} /> : null}
            {tab === 'pages' ? (
              <div className="card divide-y divide-line">{data.pages.length ? data.pages.map((p) => (
                <div key={p.page} className="flex items-center gap-3 px-4 py-2 text-sm"><span className="flex-1 font-mono text-2xs">{p.page}</span><span className="tabular">{num(p.views)} view{p.views === 1 ? '' : 's'}</span></div>))
                : <div className="px-4 py-4 text-sm text-muted">No pages recorded.</div>}</div>) : null}
            {tab === 'api' ? <ApiTrace rows={data.api} /> : null}
            {tab === 'money' ? (
              <div className="space-y-3">
                <div className="card px-4 py-3 text-sm">Vehicles: {data.vehicles.length ? data.vehicles.map((r) => <span key={r} className="plate mr-2">{r}</span>) : <span className="text-muted">none checked in this visit</span>}</div>
                <div className="card divide-y divide-line">{data.payments.length ? data.payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"><CopyId value={`GP-T-${p.id}`} /><span className="plate">{p.reg_no || ''}</span><span className="tabular">{rupees(p.amount_paise)}</span>
                    <span className={`chip ${p.status === 'paid' ? 'bg-good-50 text-good-700' : 'bg-shell text-muted'}`}>{p.status}</span><span className="ml-auto text-2xs text-muted">{dateTime(p.paid_at || p.created_at)}</span></div>))
                  : <div className="px-4 py-3 text-sm text-muted">No payment in this visit.</div>}</div>
                {data.reports.length ? <div className="card px-4 py-3 text-sm">Reports: {data.reports.map((r) => <span key={r.id} className="mr-3 font-mono text-2xs">{r.report_number}</span>)}</div> : null}
              </div>) : null}
            {tab === 'errors' ? (data.errors.length ? <Timeline items={data.errors} compact /> : <div className="card px-4 py-4 text-sm text-muted">✅ Nothing went wrong in this visit.</div>) : null}
            {tab === 'attribution' ? (
              <div className="card grid gap-3 px-4 py-3 text-sm sm:grid-cols-2">
                <div><div className="text-2xs text-muted">This visit came from</div><SourceChip source={s.source || 'direct'} /> {s.campaign ? <span className="text-2xs text-muted">· {s.campaign}</span> : null}</div>
                <div><div className="text-2xs text-muted">Landing page</div><div className="font-mono text-2xs">{s.landing || '—'}</div></div>
                <div><div className="text-2xs text-muted">This browser first came from</div><SourceChip source={s.first_touch?.source || 'direct'} /> {s.first_touch?.campaign ? <span className="text-2xs text-muted">· {s.first_touch.campaign}</span> : null}</div>
                <div><div className="text-2xs text-muted">Browser first seen</div><div>{dateTime(s.browser_first_seen)}</div></div>
                {s.first_touch?.referrer ? <div className="sm:col-span-2"><div className="text-2xs text-muted">Referrer</div><div className="break-all font-mono text-2xs">{s.first_touch.referrer}</div></div> : null}
              </div>) : null}
          </div>
        </div>
        {/* The chat as it is on their phone (2026-10-08) — on the right, live while they are here. */}
        <div className="mt-6 xl:sticky xl:top-4 xl:mt-0">
          <PhoneReplica sessionId={id} live={Boolean(now)} />
        </div>
        </div>
      ) : null}
    </State>
  );
}
