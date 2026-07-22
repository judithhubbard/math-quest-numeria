// Math Quest: Numeria — service worker (Pass F).
// Cache-first over the full static set so the game plays OFFLINE after the
// first visit. VERSION is bumped at each release deploy; the old cache is
// dropped on activate, so players get each tagged release cleanly.
const VERSION = 'v1.19.1';
const CACHE = 'mathquest-' + VERSION;
const ASSETS = [
  '.', 'index.html', 'manifest.json',
  'css/style.css',
  'js/tracker.js', 'js/problems.js', 'js/data.js', 'js/mastery.js',
  'js/maps.js', 'js/sprites.js', 'js/engine.js', 'js/battle.js',
  'js/ui.js', 'js/parlor.js', 'js/music.js', 'js/main.js',
  'assets/PressStart2P.ttf', 'assets/icon-192.png', 'assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  // Music (audio/) is NOT in ASSETS — addAll is atomic, and ~26MB of mp3s on
  // a flaky connection would fail the whole offline install. Instead each
  // track is cached the first time it actually plays, so a piece once heard
  // keeps working offline; one never heard just stays silent (music.js drops
  // a failed load from its pool — silence is honest).
  const isAudio = new URL(e.request.url).pathname.includes('/audio/');
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    // status 200 only: media elements send Range requests, and Cache.put
    // rejects a 206 partial — a partial is streamed through uncached.
    if (isAudio && res && res.status === 200) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
    }
    return res;
  })));
});
