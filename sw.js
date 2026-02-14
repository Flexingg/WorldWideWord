const CACHE_NAME = "bible-reader-v2";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/adapter.js",
  "https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wght@8..144,400;500&family=Roboto:wght@400;500;700&display=swap",
  "https://fonts.googleapis.com/icon?family=Material+Icons+Round"
];

// 1. INSTALL: Cache App Shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2. ACTIVATE: Cleanup old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

// 3. FETCH: Handle requests
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Strategy A: Stale-While-Revalidate for Bibles & Lexicon (Content)
  // This allows offline use but updates in the background for next time
  if (url.pathname.includes("/bibles/") || url.pathname.includes("/lexicon/")) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          const fetchPromise = fetch(e.request).then((networkResponse) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy B: Cache First for Static Assets (CSS, JS, Fonts)
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

