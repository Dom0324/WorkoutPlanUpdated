// LIFT — Service Worker
// Version must match APP_VERSION in workout_tracker.html
// Bump this string on every deploy to bust the cache
const CACHE = 'lift-v1.2.0';

const SHELL = [
  '/',
  '/index.html',
  '/sw.js',
];

// Install: cache the app shell immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: delete old caches from previous versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // For navigation requests (opening the app), serve from cache then update
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put('/index.html', clone));
          }
          return res;
        }).catch(() => cached);
        // Return cached immediately, update in background
        return cached || networkFetch;
      })
    );
    return;
  }

  // For other requests: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
