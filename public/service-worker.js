const CACHE_NAME = "stellarious-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/CSS/styles.css",
  "/CSS/responsive.css",
  "/JS/app.js",
  "/JS/common.js",
  "/images/logo.png"
];

// Install Service Worker and Cache Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch Requests and Serve from Cache When Offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});