import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * SERVER LOG (user, 2026-10-07: "every event or trigger, in the console and in a
 * separate log in the web admin"). The server's own console, live: every event,
 * sign-in step, alert, email, job and error, newest at the bottom, every 3 s.
 * Mobiles appear as their last four digits only.
 */
const LEVEL = { error: 'text-wrong-700 bg-wrong-50/60', warn: 'text-watch-700', log: 'text-ink' };

export default function ServerLog() {
  const [rows, setRows] = useState([]);
  const [tags, setTags] = useState({});
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState(null);
  const since = useRef(0);
  const box = useRef(null);
  useEffect(() => { since.current = 0; setRows([]); }, [level, q]);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (paused) return;
      try {
        const out = await api.serverLog({ since: since.current, level, q, limit: 800 });
        if (stop) return;
        since.current = out.last; setTags(out.tags || {}); setErr(null);
        if (out.rows.length) {
          setRows((cur) => [...cur, ...out.rows].slice(-2000));
          requestAnimationFrame(() => { const b = box.current; if (b && b.scrollHeight - b.scrollTop - b.clientHeight < 200) b.scrollTop = b.scrollHeight; });
        }
      } catch (e) { setErr(e.message); }
    };
    tick(); const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [level, q, paused]);
  const shown = rows.filter((r) => !tag || r.tag === tag);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold">Server log</h1><p className="text-2xs text-muted">The server’s own console, live. Since its last restart; pm2 keeps the full files.</p></div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto !py-1.5 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">All levels</option><option value="error">Errors</option><option value="warn">Warnings</option><option value="log">Info</option></select>
          <input className="input !w-56 !py-1.5 text-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-quiet !py-1.5 text-2xs" onClick={() => setPaused((v) => !v)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button onClick={() => setTag('')} className={`chip border !px-2.5 !py-0.5 ${!tag ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>everything</button>
        {Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([t, n]) => (
          <button key={t} onClick={() => setTag(tag === t ? '' : t)} className={`chip border !px-2.5 !py-0.5 ${tag === t ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{t} <span className="opacity-60">{n}</span></button>))}
      </div>
      {err ? <div className="mt-2 rounded-lg bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{err}</div> : null}
      <div ref={box} className="card mt-3 h-[65vh] overflow-auto bg-[#0b1f1c] px-3 py-2 font-mono text-[12px] leading-5">
        {shown.length ? shown.map((r) => (
          <div key={r.n} className={`whitespace-pre-wrap break-all ${r.level === 'error' ? 'text-[#ff8a80]' : r.level === 'warn' ? 'text-[#ffd180]' : 'text-[#c8e6df]'}`}>
            <span className="text-[#6b8380]">{new Date(r.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} </span>{r.text}
          </div>)) : <div className="text-[#6b8380]">Waiting for the next line…</div>}
      </div>
      <p className="mt-1 text-2xs text-muted">{shown.length} line{shown.length === 1 ? '' : 's'} shown{paused ? ' · paused' : ' · live'}</p>
      {void LEVEL}
    </>
  );
}
