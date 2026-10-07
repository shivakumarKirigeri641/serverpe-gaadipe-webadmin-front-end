import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, onSignedOut } from './api';

/**
 * Who is signed in. The saved token is a claim, not proof: on load the
 * gateway is asked who it belongs to, and only then is anything drawn.
 */
const Ctx = createContext(null);

export function SessionProvider({ children }) {
  const [me, setMe] = useState(null);
  const [can, setCan] = useState([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) { setMe(null); setReady(true); return; }
    try { const out = await api.session(); setMe(out.user); setCan(out.can || []); }
    catch { setMe(null); }
    finally { setReady(true); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onSignedOut(() => { setMe(null); setCan([]); }), []);

  const signIn = useCallback(async (token, user) => {
    setToken(token); setMe(user);
    try { const out = await api.session(); setMe(out.user); setCan(out.can || []); } catch { /* the next screen will say */ }
  }, []);

  const signOut = useCallback(async () => {
    try { await api.signOut(); } catch { /* the token is going either way */ }
    setToken(null); setMe(null); setCan([]);
  }, []);

  return <Ctx.Provider value={{ me, can, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
