// The Dream Wedding — Service Worker v5
// Strategy: Cache images only. Never cache pages or API. Always network-first for HTML/JS.

const CACHE_NAME = 'tdw-v5';
const IMAGE_CACHE = 'tdw-images-v5';

// ── Install: skip waiting immediately, no pre-caching of pages ───────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate: purge all old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network-first, no caching: API, Railway backend, admin
  if (
    url.hostname.includes('railway.app') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin')
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Always network-first, no caching: Next.js pages and JS bundles
  // These are content-hashed by Next.js — caching them causes stale bundle issues
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Cache-first: images only (Cloudinary, Unsplash, static image files)
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

  // Everything else: network-first, no caching
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || new Response('', { status: 503 }))
    )
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'TDW', body: event.data.text() }; }
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'The Dream Wedding', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
