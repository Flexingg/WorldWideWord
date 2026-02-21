const CACHE_NAME = "bible-app-v9";
const CONTENT_CACHE = "bible-content-v1";
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
        keys.filter((key) => key !== CACHE_NAME && key !== CONTENT_CACHE)
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
  
  // Skip cross-origin requests (except for same-origin content)
  if (url.origin !== location.origin) {
    // Let external resources (fonts, CDN) pass through without caching
    return;
  }
  
  // Bible content, lexicon, and search index - cache first, then network
  // This ensures content is available offline once it's been read
  if (url.pathname.includes("/bibles/") || 
      url.pathname.includes("/lexicon/") || 
      url.pathname.includes("search_index.json") ||
      url.pathname.includes("/plans/")) {
    e.respondWith(
      caches.open(CONTENT_CACHE).then((cache) => {
        return cache.match(e.request).then((cached) => {
          // Return cached version immediately if available
          if (cached) {
            // Fetch in background to update cache
            fetch(e.request).then((net) => {
              if (net.ok) {
                cache.put(e.request, net.clone());
              }
            }).catch(() => {}); // Ignore network errors
            return cached;
          }
          
          // No cache - try network, then cache
          return fetch(e.request)
            .then((net) => {
              if (net.ok) {
                cache.put(e.request, net.clone());
              }
              return net;
            })
            .catch(() => {
              // Network failed and no cache - return offline message for content
              console.log('[SW] Offline and no cache for:', url.pathname);
              return new Response(
                JSON.stringify({ 
                  error: "offline", 
                  message: "This content hasn't been cached yet. Please connect to the internet and try again." 
                }),
                { 
                  headers: { "Content-Type": "application/json" } 
                }
              );
            });
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

// Listen for messages from the main app
self.addEventListener("message", (e) => {
  // Allow the app to trigger cache clearing
  if (e.data === "clear-content-cache") {
    caches.delete(CONTENT_CACHE);
  }
  
  // Allow the app to pre-cache specific chapters
  if (e.data && e.data.type === "cache-urls") {
    caches.open(CONTENT_CACHE).then((cache) => {
      cache.addAll(e.data.urls);
    });
  }
});
