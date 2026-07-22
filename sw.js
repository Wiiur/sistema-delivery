/* Dropa Delivery — Service Worker (offline-first cache do cardápio) */
const CACHE_VERSION = 'dropa-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_API = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = ['/', '/manifest.webmanifest'];
const API_STALE_PATHS = ['/produtos', '/config']; // Cardápio e config: stale-while-revalidate

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Estratégia 1: API do backend (produtos/config) → stale-while-revalidate
  if (API_STALE_PATHS.some(p => url.pathname.endsWith(p) || url.pathname.endsWith(p + '/'))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_API);
      const cached = await cache.match(request);
      const networkPromise = fetch(request).then(res => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || networkPromise;
    })());
    return;
  }

  // Estratégia 2: assets estáticos (JS/CSS/imagens) → cache-first
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      } catch { return cached || Response.error(); }
    })());
    return;
  }

  // Padrão: network-first (com fallback ao cache)
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || caches.match('/')))
  );
});
