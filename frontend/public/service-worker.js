const CACHE_NAME = "flowlyra-shell-v2";
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

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone()).catch(() => undefined);
        return response;
      }).catch(() => cached);
      return cached || networkPromise;
    })
  );
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
