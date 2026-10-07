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
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
          <div className="leading-tight"><div className="text-lg font-semibold text-ink">GaadiPe Web Admin</div><div className="text-2xs text-muted">The website and the chat</div></div>
        </div>
        {lockNote ? <div className="mb-3 rounded-lg bg-watch-50 px-3 py-2 text-sm text-watch-700">🔒 Locked after {lockNote} minutes without activity. Please sign in again.</div> : null}
        <div className="mb-3 inline-flex w-full rounded-lg border border-line bg-shell p-0.5">
          {[['passcode', 'Passcode'], ['mobile', 'Code to my mobile']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setHow(k); setError(null); }} className={`flex-1 rounded-md py-1.5 text-2xs font-semibold ${how === k ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>{l}</button>))}
        </div>
        <form onSubmit={submit} className="card space-y-4 px-5 py-5">
          {how === 'passcode' ? (
            <label className="block"><span className="label">Admin passcode</span>
              <input className="input tabular text-center text-xl tracking-[0.5em]" type="password" inputMode="numeric" autoFocus autoComplete="current-password"
                maxLength={12} placeholder="••••" value={passcode} onChange={(e) => setPasscode(e.target.value.replace(/\s/g, ''))} /></label>
          ) : (
            <>
              <label className="block"><span className="label">Your mobile</span>
                <input className="input tabular" inputMode="numeric" autoComplete="tel" value={mobile} disabled={sent}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" /></label>
              {sent ? (
                <label className="block"><span className="label">Code from the SMS</span>
                  <input className="input tabular text-center text-xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label>) : null}
              {sent ? <p className="text-2xs text-muted">If this number is an admin, a code is on its way. <button type="button" className="underline" onClick={() => { setSent(false); setCode(''); }}>Change number</button></p> : null}
            </>
          )}
          {error ? <div className="rounded-lg bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{error}</div> : null}
          <button className="btn-primary w-full" disabled={busy || (how === 'passcode' ? passcode.length < 4 : !sent ? mobile.length !== 10 : code.length < 4)}>
            {busy ? 'Checking…' : how === 'passcode' || sent ? 'Sign in' : 'Send me a code'}</button>
        </form>
        <p className="mt-4 text-center text-2xs text-muted">Every sign-in is recorded.</p>
      </div>
    </div>
  );
}
