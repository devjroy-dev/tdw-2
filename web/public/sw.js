// The Dream Wedding — Service Worker v3 (Session 17)
// Cache-first: images | Network-first: pages + API | Never cache: API responses

const CACHE_NAME = 'tdw-v3';
const IMAGE_CACHE = 'tdw-images-v3';

const CORE_PAGES = [
  '/',
  '/couple/today',
  '/couple/plan',
  '/couple/login',
  '/vendor/today',
  '/vendor/clients',
  '/vendor/login',
  '/manifest.json',
];

// ── Install: pre-cache core pages ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_PAGES).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== IMAGE_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache: API calls or admin routes
  if (url.pathname.startsWith('/admin')) {
    event.respondWith(fetch(request));
    return;
  }
  if (
    url.hostname.includes('railway.app') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first: images (Unsplash, Cloudinary, any image extension)
  const isImage =
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('cloudinary.com') ||
    /\.(png|jpg|jpeg|webp|avif|gif|svg)(\?|$)/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // Network-first: pages — fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 }))
      )
  );
});
