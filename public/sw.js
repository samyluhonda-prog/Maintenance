/**
 * Intervia service worker — app-shell / static-asset availability only.
 *
 * Scope, deliberately:
 *  - Navigation requests (HTML pages): network-first, falling back to the
 *    cache when the network is unavailable, so a previously-visited page
 *    (e.g. a work order a technician opened while online) still renders
 *    when they lose signal later.
 *  - Same-origin static assets (/_next/static/*, /icons/*, /manifest.webmanifest):
 *    cache-first, falling back to network on a cache miss, since these are
 *    content-hashed / rarely-changing files.
 *  - Everything else (Supabase API calls, POST/PUT/DELETE, cross-origin
 *    requests) is left completely alone — this worker never intercepts
 *    mutations or API traffic. The offline *data* queue for work-order
 *    execution actions lives in IndexedDB (see src/lib/offline/), not here.
 */

const CACHE_VERSION = "intervia-cache-v1";

// Only a small set of stable, always-present public paths are safe to
// precache by hardcoded path — Next's own build output uses content-hashed
// filenames that aren't predictable ahead of time, so those are cached
// opportunistically as they're fetched instead (see the fetch handler).
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isSameOriginStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Never touch non-GET requests (mutations) or cross-origin calls
  // (Supabase, etc.) — those are not this worker's concern.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && request.mode !== "navigate") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isSameOriginStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match("/");
    if (fallback) return fallback;
    throw new Error("Hors ligne et aucune page en cache disponible.");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    throw err;
  }
}
