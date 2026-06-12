// DAR × Yalla Bites kiosk service worker.
// Network-first for navigations + API (always want fresh votes), with a
// cached app-shell fallback so a brief Wi-Fi blip doesn't blank the screen.

const CACHE = "dar-vote-v3";
const SHELL = ["/", "/kiosk", "/board", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache the live API — always go to network.
  if (url.pathname.startsWith("/api/")) return;

  const isNav = request.mode === "navigate";

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNav) return caches.match("/");
        return Response.error();
      })
  );
});
