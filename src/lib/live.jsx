import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, stream } from './api';

/**
 * THE LIVE LINE (spec §43, §110–111). One encrypted stream for the whole panel:
 *   presence   who is on the website now, and the counts
 *   feed       the latest events (newest first, the last 500)
 *   conn       LIVE / RECONNECTING / OFFLINE, and when the last word came —
 *              the header turns STALE when nothing has arrived for 25 s
 * Reconnects by itself (1 s, 2 s, 5 s, 10 s…). Where the browser cannot hold a
 * stream (plain http), it asks for the presence every 5 s instead.
 * `onItems(fn)` lets a screen hear each batch as it arrives (sounds, toasts).
 */
const Ctx = createContext(null);
export const useLive = () => useContext(Ctx);

export function LiveProvider({ children }) {
  const [presence, setPresence] = useState(null);
  const [feed, setFeed] = useState([]);
  const [conn, setConn] = useState({ state: 'reconnecting', at: 0, mode: 'stream', watchers: 0 });
  const [apiMinute, setApiMinute] = useState([]);           // [{ t, calls, failed }] — the API's own pulse
  const listeners = useRef(new Set());

  useEffect(() => {
    let stop = false; let ctrl = null; let tries = 0; let poll = null;
    const heard = (extra = {}) => setConn((c) => ({ ...c, ...extra, state: 'live', at: Date.now() }));
    const onMessage = (m) => {
      if (m.type === 'presence') { setPresence(m); heard(); }
      else if (m.type === 'feed') {
        if (m.items?.length) {
          setFeed((cur) => [...m.items.slice().reverse(), ...cur].slice(0, 500));
          listeners.current.forEach((fn) => { try { fn(m.items); } catch { /* a screen's own problem */ } });
        }
        if (m.api) {
          const t = Math.floor(Date.now() / 60000) * 60000;
          setApiMinute((cur) => {
            const last = cur.at(-1);
            const next = last && last.t === t ? [...cur.slice(0, -1), { t, calls: last.calls + m.api.calls, failed: last.failed + m.api.failed }]
              : [...cur, { t, calls: m.api.calls, failed: m.api.failed }];
            return next.slice(-180);
          });
        }
        heard();
      } else if (m.type === 'ping' || m.type === 'hello') heard({ watchers: m.watchers || 1 });
    };
    async function run() {
      while (!stop) {
        ctrl = new AbortController();
        try {
          const ok = await stream({ onMessage: (m) => { tries = 0; onMessage(m); }, signal: ctrl.signal });
          if (ok === false) { startPolling(); return; }      // cannot stream here
          if (stop) return;
          setConn((c) => ({ ...c, state: 'reconnecting' }));  // the server closed it (key renewal): straight back
        } catch {
          if (stop) return;
          tries += 1;
          setConn((c) => ({ ...c, state: tries >= 3 ? 'offline' : 'reconnecting' }));
          await new Promise((r) => setTimeout(r, [1000, 2000, 5000, 10000][Math.min(tries - 1, 3)]));
        }
      }
    }
    function startPolling() {
      setConn((c) => ({ ...c, mode: 'poll' }));
      const once = () => api.live(true).then((p) => { setPresence(p); heard(); }).catch(() => setConn((c) => ({ ...c, state: 'reconnecting' })));
      once(); poll = setInterval(once, 5000);
    }
    run();
    return () => { stop = true; ctrl?.abort(); clearInterval(poll); };
  }, []);

  const onItems = (fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); };
  return <Ctx.Provider value={{ presence, feed, conn, apiMinute, onItems }}>{children}</Ctx.Provider>;
}
