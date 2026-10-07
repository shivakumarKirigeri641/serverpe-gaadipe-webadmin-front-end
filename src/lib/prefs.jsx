import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { DEFAULT_SOUND } from './sound';

/**
 * THIS ADMIN'S PREFERENCES — sounds, browser notifications, auto-lock — kept on
 * the server (admin_preferences, key "webadmin"), so they follow the admin to
 * another browser, with a local copy so the first screen does not wait.
 */
export const DEFAULT_PREFS = { sound: DEFAULT_SOUND, desktop: true, lockMinutes: 15 };
const KEY = 'webadmin.prefs';
const local = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

const Ctx = createContext({ prefs: DEFAULT_PREFS, save: () => {} });

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...(local() || {}) }));
  useEffect(() => {
    api.getPref('webadmin').then((r) => {
      if (r?.value && typeof r.value === 'object') {
        const p = { ...DEFAULT_PREFS, ...r.value, sound: { ...DEFAULT_SOUND, ...(r.value.sound || {}) } };
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
