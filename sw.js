/* Offline cache. Everything is same-origin and small, so the whole app is
 * precached on install and served cache-first afterwards.
 *
 * Bump VERSION whenever an asset changes: activate drops every older cache,
 * so a stale build is never left behind.
 */

const VERSION = "moon-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/moon.css",
  "./js/app.js",
  "./js/astro.js",
  "./js/phase.js",
  "./js/moon-svg.js",
  "./js/scene.js",
  "./js/city.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigations go to the network first so a new build is picked up when there
  // is signal, and fall back to the cached shell when there is not.
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true }))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok){
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
