import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load something, and load it again every `everyMs` while the tab is open
 * (quietly, so the server does not audit each refresh). A failed refresh keeps
 * the last good answer on screen and says so.
 */
export function useLoad(fn, deps, { everyMs = 60000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [at, setAt] = useState(null);
  const fnRef = useRef(fn); fnRef.current = fn;

  const run = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { setData(await fnRef.current(quiet)); setError(null); setAt(new Date()); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setData(null); run(false); }, deps);
  useEffect(() => {
    if (!everyMs) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') run(true); }, everyMs);
    return () => clearInterval(t);
  }, [everyMs, run]);

  return { data, error, loading, at, reload: () => run(false) };
}
