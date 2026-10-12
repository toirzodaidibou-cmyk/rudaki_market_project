// Service worker-и сабуки RUDAKI MARKET (PWA).
// Ҳеҷ чиз кэш намешавад (нарх ва молҳо ҳамеша нав) — танҳо агар интернет набошад,
// ба ҷои саҳифаи хатои браузер /offline.html нишон дода мешавад.
const CACHE = "rm-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Танҳо кушодани саҳифаҳо; API, суратҳо ва файлҳо — мисли пештар, бе дахолат
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
