const CACHE_VERSION = 'dompetku-v14-premium';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => {
      return c.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
        return Promise.all(
          ASSETS.map(asset => c.add(asset).catch(() => console.warn(`Failed to cache ${asset}`)))
        );
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k.startsWith('dompetku-'))
          .map(k => {
            console.log('Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (!resp || resp.status !== 200) {
            return resp;
          }
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(c => {
            c.put(e.request, clone);
          });
          return resp;
        })
        .catch(() => {
          return caches.match(e.request).then(cached => {
            if (cached) return cached;
            return caches.match('./index.html').catch(() => {
              return new Response('You are offline. Please check your connection.', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
          });
        })
    );
    return;
  }

  if (e.request.destination === 'image' || 
      e.request.destination === 'font' ||
      e.request.destination === 'style') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (!resp || resp.status !== 200 || resp.type === 'opaque') {
            return resp;
          }
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(c => {
            c.put(e.request, clone);
          });
          return resp;
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') {
          return resp;
        }
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then(c => {
          c.put(e.request, clone);
        });
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
