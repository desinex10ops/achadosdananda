const CACHE_NAME = "achados-da-nanda-pwa-v1";
const STATIC_ASSETS = [
  "/achados",
  "/cupons-vip",
  "/vip",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore individual asset failure during initial install
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests over HTTP/HTTPS
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // Skip admin API mutations or external analytics scripts
  if (
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/public/")
  ) {
    return;
  }

  // Network-first strategy with cache fallback for public APIs and pages
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.origin === self.location.origin
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for navigation requests when offline
        if (request.mode === "navigate") {
          const fallbackPage = await caches.match("/achados");
          if (fallbackPage) return fallbackPage;
        }
        return new Response("Offline - Verifique sua conexão.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
