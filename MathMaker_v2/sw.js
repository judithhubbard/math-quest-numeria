// Math Quest: Numeria — service worker (Pass F).
// Cache-first over the full static set so the game plays OFFLINE after the
// first visit. VERSION is bumped at each release deploy; the old cache is
// dropped on activate, so players get each tagged release cleanly.
const VERSION = 'v1.5.0';
const CACHE = 'mathquest-' + VERSION;
const ASSETS = [
  '.', 'index.html', 'manifest.json',
  'css/style.css',
  'js/tracker.js', 'js/problems.js', 'js/data.js', 'js/mastery.js',
  'js/maps.js', 'js/sprites.js', 'js/engine.js', 'js/battle.js',
  'js/ui.js', 'js/music.js', 'js/main.js',
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
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
