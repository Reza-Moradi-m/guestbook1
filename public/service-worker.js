const CACHE_NAME = "stellarious-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/CSS/chatroom.css",
  "/CSS/responsive.css",
  "/JS/chatroom.js",
  "/images/logo-192x192.png",
  "/images/logo-512x512.png"
];

// Install Service Worker and cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch assets from cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});