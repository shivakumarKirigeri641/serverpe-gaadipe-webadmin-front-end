import { useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session.jsx';

/** The same passcode as the main admin panel, checked on the server; every try is audited there. */
export default function SignIn() {
  const { signIn } = useSession();
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api.signInWithPasscode(passcode.trim());
      if (!out.ok) { setError(out.message || 'That passcode is not right.'); setPasscode(''); return; }
      await signIn(out.token, out.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-sm font-bold text-white">GP</span>
          <div className="leading-tight">
            <div className="text-lg font-semibold text-ink">GaadiPe Web Admin</div>
            <div className="text-2xs text-muted">The website and the chat</div>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4 px-5 py-5">
          <label className="block">
            <span className="label">Admin passcode</span>
            <input className="input tabular text-center text-xl tracking-[0.5em]" type="password" inputMode="numeric"
              autoFocus autoComplete="current-password" maxLength={12} placeholder="••••" value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\s/g, ''))} />
          </label>
          {error ? <div className="rounded-lg bg-wrong-50 px-3 py-2 text-sm text-wrong-700">{error}</div> : null}
          <button className="btn-primary w-full" disabled={busy || passcode.length < 4}>{busy ? 'Checking…' : 'Sign in'}</button>
        </form>
        <p className="mt-4 text-center text-2xs text-muted">The same passcode as the main admin panel. Every sign-in is recorded.</p>
      </div>
    </div>
  );
}
