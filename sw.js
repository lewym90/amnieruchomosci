// Kopia strony na wypadek braku internetu. Najpierw sieć, kopia tylko awaryjnie.
// Dane z programu biura (oferty, zapytania) nie są zapisywane.
const C = "am-37a55d592c";
const ROOT = "/amnieruchomosci/";
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll([ROOT, ROOT + "en/", ROOT + "uk/"])).catch(() => {}));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match(ROOT)))
  );
});
