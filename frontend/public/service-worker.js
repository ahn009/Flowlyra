const CACHE_NAME = "flowlyra-shell-v3";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = ["/offline.html", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isCacheable(request) {
  const url = new URL(request.url);
  // Only cache same-origin GET requests
  if (url.origin !== self.location.origin) return false;
  // Skip Vite dev server internals
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/node_modules")) return false;
  // Skip anything that looks like an API route
  if (url.pathname.startsWith("/api/")) return false;
  return request.method === "GET";
}

self.addEventListener("fetch", (event) => {
  if (!isCacheable(event.request)) return;

  if (event.request.mode === "navigate") {
    // Network-first for HTML — never serve stale page shell
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For JS/CSS assets with hashed filenames (e.g., ChatPage-abc123.js):
  // These are immutable — if the hash matches, the content is correct.
  // Use cache-first for hashed assets, network-first for everything else.
  const url = new URL(event.request.url);
  const isHashedAsset = /\/assets\/.*\.[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname);

  if (isHashedAsset) {
    // Cache-first for hashed assets — they're immutable
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone()).catch(() => undefined);
        return response;
      })
    );
  } else {
    // Network-first for non-hashed assets (fonts, icons, manifest)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || new Response("", { status: 503 });
        })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "FlowLyra", body: "You have a new notification", url: "/inbox" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_) {}
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: payload.url || "/inbox" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/inbox";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
