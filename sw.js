const CACHE_NAME = "bible-app-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/adapter.js"
  // Note: External Google Fonts removed - they cause CORS issues when cached from service worker
  // Fonts will still load via HTML <link> tags and be cached by the browser
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.map((n) => { if(n!==CACHE_NAME) return caches.delete(n); }))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Stale-while-revalidate for Bible content
  if (url.pathname.includes("/bibles/") || url.pathname.includes("/lexicon/") || url.pathname.includes("search_index.json")) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then((net) => {
            cache.put(e.request, net.clone());
            return net;
          });
          return cached || fetched;
        });
      })
    );
  } else {
    // Cache First for app shell
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});