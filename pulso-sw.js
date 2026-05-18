const CACHE = 'pulso-v2';

// Files to cache for offline use
const SHELL = [
  './index.html',
  './pulso-manifest.json',
  './pulso-icon.svg',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      // Remove old cache versions
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for app shell, network-first for CDN assets
  const isCDN = e.request.url.includes('unpkg.com') || e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com');

  if (isCDN) {
    // Network first, fall back to cache
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first, fall back to network
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        });
      })
    );
  }
});
