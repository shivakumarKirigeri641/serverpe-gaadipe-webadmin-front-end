import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';

/*
 * A REPORT AS A FLIP CARD (user, 2026-10-08: "each report, can I see it like the
 * RC card with swipe / flipping? A separate button, no disturbance").
 *
 * The same vehicle summary card customers see in My vehicles, from the report's
 * own snapshot (GET /reports/:id/card) — the data as it was the day the report
 * was made, masked as in the customer's copy. Front: what the vehicle is. Back:
 * documents with their marks, challans, loan, FASTag. Swipe, ←/→, or Flip turns
 * it; Esc or the backdrop closes it. Opening it is in the audit log.
 */
const STATE = { expired: ['#c62828', '#fdecea'], due: ['#b26a00', '#fff4e0'], valid: ['#12813f', '#e7f6ec'] };
const day = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d || ''; } };
const inr = (p) => (p == null ? '—' : `₹${(Number(p) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const left = (d) => (d < 0 ? `expired ${-d} days ago` : d === 0 ? 'expires today' : `${d} days left`);

function Mark({ state }) {
  const color = state === 'expired' ? '#c62828' : state === 'due' ? '#e07b00' : '#12813f';
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0" aria-label={state}>
      <circle cx="10" cy="10" r="10" fill={color} />
      {state === 'expired' ? <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        : state === 'due' ? <><path d="M10 4.8v6.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="10" cy="14.8" r="1.4" fill="#fff" /></>
          : <path d="M5.6 10.4l3 3 5.8-6.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </svg>
  );
}

const Field = ({ k, v, wide }) => (v == null || v === '' || v === 0 ? null : (
  <div className={wide ? 'col-span-2' : ''}>
    <div className="text-[9.5px] font-bold uppercase tracking-wider text-black/40">{k}</div>
    <div className="truncate text-[13px] font-semibold text-[#0b2e2b]" title={String(v)}>{v}</div>
  </div>
));

const face = { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

export default function ReportCard({ id, onClose }) {
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const [turn, setTurn] = useState(0);
  const touch = useRef(null);
  const rear = Math.abs(Math.round(turn / 180)) % 2 === 1;

  useEffect(() => { api.reportCard(id).then(setOut).catch((e) => setErr(e.message)); }, [id]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setTurn((t) => t - 180);
      else if (e.key === 'ArrowRight') setTurn((t) => t + 180);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const v = out?.vehicle || {};
  const r = out?.report || {};
  const id_ = v.identity || {};
  const own = v.ownership || {};
  const docs = v.documents || [];
  const ch = v.challans || {};
  const attention = docs.filter((d) => d.state !== 'valid').length + (ch.pending_count ? 1 : 0);
  const head = (side) => (
    <div className="bg-gradient-to-br from-[#0a4f49] via-[#0f766e] to-[#14a08f] px-4 pb-4 pt-3 text-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">{side}</div>
          <div className="text-[15px] font-black leading-tight">Vehicle Summary</div>
          <div className="text-[10.5px] text-white/75">Report {r.number || ''} · {r.created_at ? day(r.created_at) : ''}</div>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[11px] font-black text-[#0f766e] shadow">GP</div>
      </div>
      <div className="mt-3 inline-flex items-stretch overflow-hidden rounded-lg border-[3px] border-[#111] bg-white shadow-md">
        <span className="flex w-6 flex-col items-center justify-center bg-[#1d4ed8] text-[7px] font-black leading-none text-white">IND</span>
        <span className="px-2.5 py-1 font-mono text-[19px] font-black tracking-[2px] text-[#111]">{v.reg_no || r.reg_no || ''}</span>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-[#062a27]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex w-full max-w-[380px] items-center justify-between text-white">
        <span className="text-[12px] font-semibold text-white/80">Snapshot as on the report date · masked as the customer's copy{r.mobile ? ` · customer ${r.mobile}` : ''}</span>
        <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold hover:bg-white/25">✕</button>
      </div>
      <div className="w-full max-w-[380px]" style={{ perspective: 1400 }}>
        <div style={{ position: 'relative', height: 'min(70vh, 540px)', transformStyle: 'preserve-3d', transition: 'transform .75s cubic-bezier(.3,.9,.3,1.05)', transform: `rotateY(${turn}deg)` }}
          onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
          onTouchEnd={(e) => {
            const s = touch.current; touch.current = null; if (!s) return;
            const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) setTurn((x) => x + (dx < 0 ? -180 : 180));
          }}>
          {/* Front */}
          <div style={face} className="flex flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl" aria-hidden={rear}>
            {head('1 / 2')}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {err ? <div className="text-sm text-[#c62828]">⚠️ {err}</div> : !out ? <div className="text-sm text-black/50">Opening…</div> : (
                <>
                  <div className="text-[17px] font-black leading-tight text-[#0b2e2b]">{[id_.maker, id_.model].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="mb-3 text-[12px] text-black/55">{[id_.fuel, id_.vehicle_class].filter(Boolean).join(' · ')}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <Field wide k="Owner" v={own.owner_masked ? `${own.owner_masked}${own.owner_serial != null ? ` · owner no. ${own.owner_serial}` : ''}` : null} />
                    <Field k="Registered on" v={id_.reg_date ? day(id_.reg_date) : null} />
                    <Field k="RTO" v={id_.registered_at} />
                    <Field k="Colour" v={id_.colour} />
                    <Field k="Manufactured" v={id_.manufactured} />
                    <Field k="Engine cc" v={id_.cubic_capacity} />
                    <Field k="Seats" v={id_.seats} />
                    <Field k="Emission norms" v={id_.norms} />
                    <Field k="RC status" v={id_.rc_status} />
                    <Field k="Chassis" v={own.chassis_masked} />
                    <Field k="Engine" v={own.engine_masked} />
                  </div>
                  <div className="mt-3 text-[12.5px] font-semibold" style={{ color: attention ? '#b26a00' : '#12813f' }}>{attention ? `⚠️ ${attention} need attention` : '✅ All in order'}</div>
                  {r.valid_until ? <div className="text-[11px] text-black/45">Report valid till {day(r.valid_until)}</div> : null}
                </>
              )}
            </div>
            <div className="border-t border-black/5 py-2 text-center text-[11px] font-semibold text-[#0f766e]">↔ Swipe, ←/→ or Flip for more</div>
          </div>
          {/* Back */}
          <div style={{ ...face, transform: 'rotateY(180deg)' }} className="flex flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl" aria-hidden={!rear}>
            <div className="flex items-center justify-between bg-gradient-to-r from-[#0a4f49] to-[#0f766e] px-4 py-3 text-white">
              <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">2 / 2</div><div className="text-[14px] font-black">{v.reg_no || r.reg_no || ''}</div></div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-black text-[#0f766e]">GP</div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">📋 Documents</div>
                {docs.length ? docs.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#0b2e2b]"><Mark state={d.state} /><span className="truncate">{d.name || d.label}</span></span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold" title={left(d.days)}
                      style={{ color: STATE[d.state]?.[0], background: STATE[d.state]?.[1] }}>{d.valid_until ? day(d.valid_until) : left(d.days)}</span>
                  </div>)) : <div className="text-[12px] text-black/45">No document dates in this report.</div>}
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🚨 Challans</div>
                {ch.pending_count ? (
                  <>
                    <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#c62828]"><Mark state="expired" />{ch.pending_count} pending · {inr(ch.pending_amount_paise)}</div>
                    {(ch.pending || []).slice(0, 4).map((c, i) => (
                      <div key={c.challan_no || i} className="mt-1 rounded-lg bg-[#fdecea]/60 px-2 py-1 text-[11.5px]">
                        <div className="flex justify-between gap-2 font-semibold text-[#0b2e2b]"><span className="truncate">{c.offence || 'Challan'}</span><span>{inr(c.amount_paise)}</span></div>
                        <div className="truncate text-black/50">{[c.place, c.date ? day(c.date) : null].filter(Boolean).join(' · ')}</div>
                      </div>))}
                  </>
                ) : <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#12813f]"><Mark state="valid" />No pending challans</div>}
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🏦 Loan</div>
                <div className="flex justify-between gap-2 text-[13px]"><span className="text-black/60">Loan</span>
                  <span className="text-right font-semibold" style={{ color: own.financer ? STATE.due[0] : STATE.valid[0] }}>{own.financer || 'No loan on record'}</span></div>
                {own.blacklist_status ? <div className="flex justify-between gap-2 text-[13px]"><span className="text-black/60">Blacklist</span><span className="font-semibold text-[#c62828]">{own.blacklist_status}</span></div> : null}
              </div>
              {v.fastag ? (
                <div>
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0f766e]">🛣 FASTag</div>
                  <div className="flex justify-between gap-2 text-[13px]"><span className="text-black/60">{v.fastag.active ? 'Active' : 'Not active'}</span>
                    <span className="font-semibold">{v.fastag.balance != null ? inr(Number(v.fastag.balance) * 100) : ''}</span></div>
                </div>) : null}
            </div>
            <div className="border-t border-black/5 py-2 text-center text-[11px] font-semibold text-[#0f766e]">↔ Swipe, ←/→ or Flip for more</div>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setTurn((t) => t + 180)} className="rounded-full bg-white px-6 py-2 text-[13px] font-black text-[#0a4f49] shadow hover:bg-white/90">⟲ Flip</button>
    </div>,
    document.body,
  );
}
