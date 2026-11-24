// Czas pracy – prototyp. Działanie offline.
// Strategia: od razu z pamięci (szybki start także przy słabym zasięgu), w tle pobranie nowszej wersji.
// UWAGA: wszystkie apki na jakub-009.github.io dzielą jedną pamięć podręczną – kasujemy WYŁĄCZNIE własne wpisy.
const PREFIX = "czas-pracy-test-";
const CACHE = PREFIX + "6.0-test-1";
const FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css", "./js/app.js", "./js/data.js", "./js/views.js", "./js/report.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  const key = req.mode === "navigate" ? new Request("./index.html") : req;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
