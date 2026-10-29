const CACHE_NAME = "training-plan-v114";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=114",
  "./app.js?v=114",
  "./manifest.webmanifest",
  "./CIT_Logo-Schwarz.png",
  "./favicon.ico",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./favicon-48x48.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];
const ASSET_URLS = new Set(
  ASSETS.map((asset) => {
    const url = new URL(asset, self.location.href);
    url.search = "";
    return url.href;
  }),
);

function cacheKeyFor(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
}

function isCacheableAppRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return ASSET_URLS.has(cacheKeyFor(request));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS.map(async (asset) => {
          const request = new Request(new URL(asset, self.location.href), { cache: "reload" });
          const response = await fetch(request);
          if (!response.ok) throw new Error(`Precache failed: ${request.url}`);
          await cache.put(cacheKeyFor(request), response);
        }),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (!isCacheableAppRequest(event.request)) return;

  const cacheKey = cacheKeyFor(event.request);
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        }
        return response;
      })
      .catch(() => caches.match(cacheKey)),
  );
});
