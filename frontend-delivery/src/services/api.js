// src/services/api.js
// ⚡ Dropa Delivery API client
// Auto-injeta o JWT no header Authorization e trata 401 globalmente.

export const API_URL = import.meta.env.VITE_API_URL;

const TOKEN_KEY = 'dropa_access_token';
const REFRESH_KEY = 'dropa_refresh_token';

// ─── Token store ─────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    if (access) localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    // Limpa também o legado do sistema antigo
    localStorage.removeItem('dropa_funcionario');
  }
};

// ─── Event bus (dispara logout global em 401) ─────────
const listeners = new Set();
export const onAuthEvent = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const emitAuthEvent = (event) => listeners.forEach(cb => { try { cb(event); } catch {} });

// ─── Refresh handling (single-flight) ─────────
let refreshingPromise = null;
async function tryRefresh() {
  if (refreshingPromise) return refreshingPromise;
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  refreshingPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh })
      });
      if (!res.ok) return null;
      const data = await res.json();
      tokenStore.set(data.access_token, null);
      return data.access_token;
    } catch { return null; }
    finally { refreshingPromise = null; }
  })();
  return refreshingPromise;
}

// ─── Fetch wrapper ───────────────────────────
// Uso: apiFetch('/pedidos', { method: 'GET' })
// Retorna Response nativo (compatível com o código legado que faz `.ok` e `.json()`)
export async function apiFetch(path, options = {}, { skipAuth = false, retry = true } = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!skipAuth) {
    const t = tokenStore.get();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !skipAuth && retry) {
    // Tenta refresh 1x
    const newToken = await tryRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(url, { ...options, headers });
    }
    // Falhou → dispara logout global
    tokenStore.clear();
    emitAuthEvent({ type: 'unauthorized' });
  }
  return res;
}

// Helper legado — fetch simples para rotas públicas (loja, cardápio)
export function publicFetch(path, options = {}) {
  return apiFetch(path, options, { skipAuth: true });
}

console.log('🚀 Conectado na API em:', API_URL);
