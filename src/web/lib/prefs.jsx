import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { DEFAULT_SOUND } from './sound';

/**
 * THIS ADMIN'S PREFERENCES — sounds, browser notifications, auto-lock — kept on
 * the server (admin_preferences, key "webadmin"), so they follow the admin to
 * another browser, with a local copy so the first screen does not wait.
 */
// Auto-lock after an hour idle (user, 2026-10-08: "make it 1 hr instead of 15 min").
export const DEFAULT_PREFS = { sound: DEFAULT_SOUND, desktop: true, lockMinutes: 60, lockV: 2 };
const KEY = 'webadmin.prefs';
/* The old 15-minute default was saved with every other preference, so a saved
   15 from before this change becomes an hour, once (lockV marks it done). A
   time chosen after this is kept as chosen. */
const upgrade = (p) => (p && !p.lockV ? { ...p, lockMinutes: Number(p.lockMinutes) === 15 ? 60 : p.lockMinutes, lockV: 2 } : p);
const local = () => { try { return upgrade(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return null; } };

const Ctx = createContext({ prefs: DEFAULT_PREFS, save: () => {} });

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...(local() || {}) }));
  useEffect(() => {
    api.getPref('webadmin').then((r) => {
      if (r?.value && typeof r.value === 'object') {
        const p = { ...DEFAULT_PREFS, ...upgrade(r.value), sound: { ...DEFAULT_SOUND, ...(r.value.sound || {}) } };
        setPrefs(p); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
      }
    }).catch(() => {});
  }, []);
  const save = useCallback((patch) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch, sound: { ...cur.sound, ...(patch.sound || {}) } };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
      api.setPref('webadmin', next).catch(() => {});
      return next;
    });
  }, []);
  return <Ctx.Provider value={{ prefs, save }}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
