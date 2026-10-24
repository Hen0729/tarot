/* global self, caches, fetch */
/* 版本與 js/version.js 的 CACHE_VERSION 保持一致（改程式只 bump 那一處後，請同步改這裡或跑 stamp） */
const CACHE_VERSION = "fc7d85ca";
const CACHE = "tarot-" + CACHE_VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/version.js",
  "./js/data.js",
  "./js/dialog.js",
  "./js/main.js",
  "./js/config.js",
  "./js/core.js",
  "./js/spreads.js",
  "./js/ai.js",
  "./js/sync.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // 網路優先（HTML／JS），失敗才用快取；確保版本更新後能拿到新檔
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))),
  );
});
