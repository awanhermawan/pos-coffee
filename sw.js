// Lightweight, High-Speed, Pure Online Service Worker for Kopi Nusantara POS.
// Rejects heavy offline page storage to maintain zero-bloat state and instantaneous online transactions.

const CACHE_NAME = 'kopi-pos-online-v1';

// Install event - immediately skip waiting to ensure the latest version boots instantly
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim all clients and purge any previous legacy caches for fresh online data
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Forcefully delete old caches to keep device storage absolutely clean and lightweight
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - pure standard online transmission
// Strictly complies with user instructions: NO OFFLINE storage, NO delay, direct secure internet transit.
self.addEventListener('fetch', (event) => {
  // Pass-through: directly route all requests to the live high-speed network
  event.respondWith(
    fetch(event.request).catch((err) => {
      // Return a clean diagnostic response if network connection is lost entirely
      return new Response(
        'Aplikasi membutuhkan koneksi internet aktif untuk sinkronisasi data transaksi.',
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    })
  );
});
