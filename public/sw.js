self.addEventListener("install", function (event) {
  console.log("[SW] Installing service worker...", event);
});

self.addEventListener("activate", function (event) {
  console.log("[SW] Activating service worker...", event);
  return self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  console.log("[SW] Fetching something...");
  event.respondWith(fetch(event.request));
});
