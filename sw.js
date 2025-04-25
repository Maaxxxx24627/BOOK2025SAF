const CACHE_NAME = "flipbook-cache-v1";
const urlsToCache = [
    "index.html",
    "animation.js",
    "style.css",
    "manifest.json",
    "images/safer192192.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("📦 Mise en cache des fichiers...");
            return cache.addAll(urlsToCache);
        })
    );
});
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});


self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log("🗑 Suppression de l'ancien cache :", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
