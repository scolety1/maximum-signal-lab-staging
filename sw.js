const BASE_CACHE = "maximum-signal-base-v33";
const RUNTIME_CACHE = "maximum-signal-runtime-v33";
const CACHE_PREFIX = "maximum-signal-";
const BASE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./favicon.svg",
  "./social-card.svg",
  "./manifest.webmanifest",
  "./experiments/experiment-dock.css?v=3",
  "./experiments/loader.js?v=24",
  "./experiments/registry.js?v=24",
  "./experiments/capsule-core/project-game.js?v=9",
  "./experiments/capsule-core/capsule-core.css?v=5",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(BASE_CACHE).then((cache) => cache.addAll(BASE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .filter((key) => ![BASE_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        throw error;
      }
    }),
  );
});
