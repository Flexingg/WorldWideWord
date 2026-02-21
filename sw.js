const CACHE_NAME = "bible-app-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/adapter.js",
  "./js/stats-db.js",
  "./js/stats-tracker.js",
  "./js/stats-calculator.js",
  "./js/stats-ui.js",
  "./manifest.json",
  "./offline.html",
  // Icons
  "./icons/favicon.ico",
  "./icons/icon-72x72.png",
  "./icons/icon-96x96.png",
  "./icons/icon-128x128.png",
  "./icons/icon-144x144.png",
  "./icons/icon-152x152.png",
  "./icons/icon-192x192.png",
  "./icons/icon-256x256.png",
  "./icons/icon-384x384.png",
  "./icons/icon-512x512.png"
];

// Install event - cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategies
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  
  // Skip non-GET requests
  if (e.request.method !== "GET") return;
  
  // Bible content, lexicon, and search index - stale while revalidate
  if (url.pathname.includes("/bibles/") || 
      url.pathname.includes("/lexicon/") || 
      url.pathname.includes("search_index.json") ||
      url.pathname.includes("/plans/")) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then((net) => {
            cache.put(e.request, net.clone());
            return net;
          }).catch(() => cached);
          return cached || fetched;
        });
      })
    );
    return;
  }
  
  // HTML requests - network first, fallback to offline page
  if (e.request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(e.request).then((cached) => {
            return cached || caches.match("./offline.html");
          });
        })
    );
    return;
  }
  
  // Everything else - cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
