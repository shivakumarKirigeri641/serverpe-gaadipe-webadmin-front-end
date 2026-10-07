import { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { count } from '../../lib/format';
import { AnimatedGauge } from '../../lib/motion.jsx';
import { SERIES, AXIS, GRID, anim, Card, Tip, Drill, People, Stats, Gauges, drill, dayLabel, sumOf } from './kit.jsx';

/*
 * Customers — the website's (2026-10-07: WhatsApp is retired): new and
 * returning website customers per day, sign-ins per day, and where new
 * customers first came from (Google Ads, search …). A click on a source lists
 * the people.
 */
export default function CustomersG({ data, days }) {
  const s = data.series;
  const [pick, setPick] = useState(null);
  const [people, setPeople] = useState(null);
  const open = (kind, value) => {
    setPick({ kind, value }); setPeople(null);
    drill('customers', { days, [kind]: value }).then((x) => setPeople(x.people)).catch(() => setPeople([]));
  };
  const xProps = { dataKey: 'd', tickFormatter: dayLabel, tick: AXIS, tickLine: false, axisLine: false, minTickGap: 16 };
  const sources = data.sources.map((x, i) => ({ ...x, fill: SERIES[i] || SERIES[7] }));
  const table = (cols) => ({ columns: [['d', 'Day', dayLabel], ...cols], rows: [...s].reverse() });
  const ads = sources.filter((x) => /Ads|ads/.test(x.source)).reduce((a, x) => a + x.n, 0);
  const allNew = sources.reduce((a, x) => a + x.n, 0);

  return (
    <>
      <Stats items={[
        ['New', count(sumOf(s, 'new')), `in ${data.days} days`],
        ['Returning', count(Math.max(0, ...s.map((x) => x.returning))), 'busiest day'],
        ['Sign-ins', count(sumOf(s, 'sign_ins')), `in ${data.days} days`],
        ['From ads', count(ads), allNew ? `${Math.round((ads / allNew) * 100)}% of new` : '—'],
      ]} />
      {(() => {
        const r = allNew ? Math.round((ads / allNew) * 1000) / 10 : null;
        return (
          <Gauges>
            <AnimatedGauge label="New customers from ads" value={r} max={100} bands={[0.25, 0.5]}
              text={r == null ? null : `${r}%`} tone={r == null ? 'muted' : 'good'}
              caption="New website customers whose first visit came from Google or Meta ads" />
          </Gauges>
        );
      })()}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="New and returning customers" note="New: signed up on the website that day. Returning: joined earlier and used the website that day."
          legend={[['New', SERIES[0]], ['Returning', SERIES[2]]]} table={table([['new', 'New'], ['returning', 'Returning']])}>
          <BarChart data={s} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid {...GRID} /><XAxis {...xProps} /><YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip content={<Tip title={dayLabel} total="People" />} cursor={{ fill: '#f3f7f6' }} />
            <Bar dataKey="new" name="New" stackId="p" fill={SERIES[0]} stroke="#fff" strokeWidth={1} {...anim()} />
            <Bar dataKey="returning" name="Returning" stackId="p" fill={SERIES[2]} radius={[4, 4, 0, 0]} stroke="#fff" strokeWidth={1} {...anim()} />
          </BarChart>
        </Card>
        <Card title="Sign-ins" note="Sign-ins on the website with a mobile number, per day."
          legend={[['Sign-ins', SERIES[3]]]} table={table([['sign_ins', 'Sign-ins']])}>
          <BarChart data={s} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid {...GRID} /><XAxis {...xProps} /><YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip content={<Tip title={dayLabel} />} cursor={{ fill: '#f3f7f6' }} />
            <Bar dataKey="sign_ins" name="Sign-ins" fill={SERIES[3]} radius={[4, 4, 0, 0]} {...anim()} />
          </BarChart>
        </Card>
        <Card className="lg:col-span-2" title="Where new customers came from" note="New website customers in the period by the source of their first visit. Click a slice for the people."
          legend={sources.map((x) => [`${x.source} · ${count(x.n)}`, x.fill])}
          table={{ columns: [['source', 'Source'], ['n', 'People']], rows: sources }}>
          <PieChart>
            <Tooltip content={<Tip title={(_, p) => p?.[0]?.name} />} />
            <Pie data={sources} dataKey="n" nameKey="source" innerRadius="55%" outerRadius="85%" paddingAngle={1} stroke="#fff" strokeWidth={2}
              onClick={(x) => open('source', x.source)} className="cursor-pointer" {...anim()}>
              {sources.map((x) => <Cell key={x.source} fill={x.fill} />)}
            </Pie>
          </PieChart>
        </Card>
      </div>
      {pick && (
        <Drill title={`New from ${pick.value}`} onClose={() => setPick(null)} loading={!people}>
          <People rows={people} />
        </Drill>
      )}
    </>
  );
}
