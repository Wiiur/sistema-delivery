// src/hooks/useApiCache.js
// ⚡ SWR-like hook — in-memory cache + revalidate on focus + auto-refresh
// Muito mais leve que react-query (~100 linhas vs 30KB)
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch, publicFetch } from '../services/api';

const cache = new Map(); // key -> { data, timestamp }
const CACHE_TTL = 5000;   // 5s stale

/**
 * useApiCache('/produtos', { auth: false, refreshMs: 15000, enabled: true })
 */
export function useApiCache(path, { auth = true, refreshMs = 0, enabled = true, transform } = {}) {
  const [data, setData] = useState(() => cache.get(path)?.data);
  const [loading, setLoading] = useState(!cache.has(path));
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const revalidate = useCallback(async () => {
    if (!enabled) return;
    try {
      const fn = auth ? apiFetch : publicFetch;
      const res = await fn(path);
      if (!mounted.current) return;
      if (res && res.ok) {
        let payload = await res.json();
        if (transform) payload = transform(payload);
        cache.set(path, { data: payload, timestamp: Date.now() });
        setData(payload);
        setError(null);
      } else if (res) {
        setError(new Error(`HTTP ${res.status}`));
      }
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path, auth, enabled, transform]);

  // Initial fetch
  useEffect(() => {
    mounted.current = true;
    if (!enabled) { setLoading(false); return; }
    const cached = cache.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
    } else {
      revalidate();
    }
    return () => { mounted.current = false; };
  }, [path, enabled, revalidate]);

  // Auto-refresh + pausa quando aba oculta (Page Visibility API)
  useEffect(() => {
    if (!refreshMs || !enabled) return;
    let intId = null;
    const start = () => {
      if (intId) return;
      intId = setInterval(revalidate, refreshMs);
    };
    const stop = () => {
      if (intId) { clearInterval(intId); intId = null; }
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [refreshMs, enabled, revalidate]);

  // Revalidate on window focus
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => revalidate();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, revalidate]);

  return { data, loading, error, revalidate };
}

/** Invalida cache manualmente (após um POST/PUT/DELETE) */
export function invalidateCache(path) {
  if (path) cache.delete(path);
  else cache.clear();
}
