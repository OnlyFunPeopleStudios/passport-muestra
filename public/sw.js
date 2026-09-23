// Passport Muestra - Service Worker del visitante (V0.7)
// Cachea la app (shell), los stands y los sellos para que la app siga abriendo
// sin conexión. Nunca cachea /api/admin ni sirve el panel offline.
// pm-v2: invalida el cache pm-v1 que podía servir un catálogo de stands viejo.
// pm-v3: invalida el cache pm-v2 (shell/bundle viejos que quedaron en celulares)
// y obliga a re-descargar la app actual con el catálogo resilient.
const VERSION = 'pm-v3';
const BASE = self.registration.scope;
const url = (p) => new URL(p, BASE).href;

const SHELL = [
  '',
  'index.html',
  'style.css',
  'app.js',
  'offline.js',
  'stamp-renderer.js',
  'manifest.webmanifest',
  'icon.svg',
  'vendor/html5-qrcode.min.js',
  'vendor/qrcode-generator.js',
].map(url);

// Datos públicos que el visitante necesita sin conexión (nunca datos de otros).
const PUBLIC_API = ['/api/config', '/api/stands'];

const SHELL_CACHE = VERSION + '-shell';
const DATA_CACHE = VERSION + '-data';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL);
      // Baseline de config/stands + sellos de los stands publicados.
      // Best-effort: si algo falla, la app igual funciona (los sellos caen a emoji).
      const data = await caches.open(DATA_CACHE);
      await Promise.allSettled([
        ...PUBLIC_API.map((p) => data.add(p)),
        (async () => {
          const res = await fetch('/api/stands').catch(() => null);
          if (!res || !res.ok) return;
          const data = await res.json().catch(() => null);
          const flags = [...new Set((data?.stands || []).map((s) => String(s.flag || '').toLowerCase()).filter((f) => f.length === 2))];
          await Promise.allSettled(flags.map((f) => cache.add('/stamps/' + f + '.svg')));
        })(),
      ]);
    })().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT (visitas, evaluaciones, admin) siempre a la red
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/api/admin')) return; // el panel admin nunca se cachea
  if (u.pathname.startsWith('/admin')) return; // ni sus archivos estáticos

  // Datos públicos del visitante: red primero, caché como respaldo.
  if (u.pathname.startsWith('/api/')) {
    if (!PUBLIC_API.includes(u.pathname)) return;
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // Navegación SPA: si no hay red, se sirve el shell cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(url('index.html')).then((r) => r || caches.match(url('')))));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});
