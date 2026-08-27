const CACHE_NAME = 'draftkit-cache-v1';
const ESPN_IMAGE_CACHE = 'espn-player-images-v1';

// Helper to get the correct asset path based on environment
const getAssetPath = (path) => {
  // Get the base URL from the service worker's scope
  const baseUrl = self.registration.scope;
  // Remove leading slash if it exists
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(cleanPath, baseUrl).pathname;
};

// Cache ESPN player images and handle failed requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle ESPN player image requests
  if (url.hostname === 'a.espncdn.com' && url.pathname.includes('/players/')) {
    event.respondWith(
      caches.open(ESPN_IMAGE_CACHE).then(async (cache) => {
        // Try cache first
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          // If not in cache, try network
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            // Cache successful response
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
          // Network response not ok, return fallback
          const fallbackUrl = getAssetPath('assets/images/player-fallback.png');
          return caches.match(fallbackUrl);
        } catch (error) {
          // Network error, return fallback
          const fallbackUrl = getAssetPath('assets/images/player-fallback.png');
          return caches.match(fallbackUrl);
        }
      })
    );
  }
});

// Cache fallback image and other static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Create array of assets to cache
        const assetsToCache = [
          'assets/images/player-fallback.png',
          'assets/fonts/SeuratProB.otf',
          'assets/fonts/Grandsans-Regular.otf',
          'assets/fonts/Grandsans-Rough.otf',
          'assets/fonts/RodinBokutohProEB.otf'
        ].map(getAssetPath);

        // Cache all assets
        await cache.addAll(assetsToCache);
        
        // Activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('Service worker installation failed:', error);
      }
    })()
  );
});

// Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== ESPN_IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );

        // Claim all clients
        await clients.claim();
      } catch (error) {
        console.error('Service worker activation failed:', error);
      }
    })()
  );
}); 