import { useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session.jsx';

/**
 * SIGN IN: the owner's passcode, or — for any admin, including the ones added
 * later — a code sent by SMS to their own mobile. Both are checked on the
 * server and audited there. After an auto-lock it says so.
 */
export default function SignIn() {
  const { signIn } = useSession();
  const [how, setHow] = useState('passcode');
  const [passcode, setPasscode] = useState('');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const locked = (() => { try { const m = sessionStorage.getItem('webadmin.locked'); sessionStorage.removeItem('webadmin.locked'); return m; } catch { return null; } })();
  const [lockNote] = useState(locked);

  const done = async (out) => {
    if (!out.ok) { setError(out.message || 'That is not right.'); return; }
    await signIn(out.token, out.user);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (how === 'passcode') { const out = await api.signInWithPasscode(passcode.trim()); if (!out.ok) setPasscode(''); await done(out); }
      else if (!sent) { await api.requestCode(mobile); setSent(true); }
      else { await done(await api.verifyCode(mobile, code.trim())); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-stage grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,40rem)]">
      <aside className="relative hidden overflow-hidden px-14 py-16 text-cream lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="auth-mark grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white">GP</span>
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold tracking-tight">GaadiPe</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-cream/45">Web Admin</div>
            </div>
          </div>
          <h1 className="mt-16 max-w-md font-display text-5xl font-medium leading-[1.12] tracking-tight">
            Har gaadi ki <span className="italic text-copper">kundli.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-cream/65">
            The desk for gaadipe.in — visitors, payments, reports and the chat, read with the same care as the vehicle itself.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cream/35">Every sign-in is recorded</p>
      </aside>

      <div className="grid place-items-center bg-paper px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="auth-mark grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white">GP</span>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold text-ink">GaadiPe Web Admin</div>
              <div className="text-2xs text-muted">The website and the chat</div>
            </div>
          </div>
          <p className="hidden font-display text-2xl font-medium tracking-tight text-ink lg:block">Sign in</p>
          <p className="mt-1 hidden text-sm text-muted lg:block">Passcode, or a code to your mobile.</p>
          {lockNote ? <div className="mb-4 mt-4 rounded-xl border border-watch-500/25 bg-watch-50 px-3 py-2 text-sm text-watch-700">Locked after {lockNote} minutes without activity. Please sign in again.</div> : null}
          <div className={`mb-4 inline-flex w-full rounded-xl border border-line bg-shell p-0.5 ${lockNote ? '' : 'mt-6'}`}>
            {[['passcode', 'Passcode'], ['mobile', 'Code to my mobile']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setHow(k); setError(null); }} className={`flex-1 rounded-lg py-2 text-2xs font-semibold ${how === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>{l}</button>))}
          </div>
          <form onSubmit={submit} className="card space-y-4 px-5 py-6 shadow-glow">
            {how === 'passcode' ? (
              <label className="block"><span className="label">Admin passcode</span>
                <input className="input tabular text-center font-display text-2xl tracking-[0.45em]" type="password" inputMode="numeric" autoFocus autoComplete="current-password"
                  maxLength={12} placeholder="••••" value={passcode} onChange={(e) => setPasscode(e.target.value.replace(/\s/g, ''))} /></label>
            ) : (
              <>
                <label className="block"><span className="label">Your mobile</span>
                  <input className="input tabular" inputMode="numeric" autoComplete="tel" value={mobile} disabled={sent}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" /></label>
                {sent ? (
                  <label className="block"><span className="label">Code from the SMS</span>
                    <input className="input tabular text-center font-display text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                      value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label>) : null}
                {sent ? <p className="text-2xs text-muted">If this number is an admin, a code is on its way. <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => { setSent(false); setCode(''); }}>Change number</button></p> : null}
              </>
            )}
            {error ? <div className="rounded-xl bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{error}</div> : null}
            <button className="btn-primary w-full" disabled={busy || (how === 'passcode' ? passcode.length < 4 : !sent ? mobile.length !== 10 : code.length < 4)}>
              {busy ? 'Checking…' : how === 'passcode' || sent ? 'Sign in' : 'Send me a code'}</button>
          </form>
          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.16em] text-muted lg:hidden">Every sign-in is recorded</p>
        </div>
      </div>
    </div>
  );
}
