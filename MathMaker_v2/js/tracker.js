// MathMaker v2 — in-game bug tracker.
// Records uncaught errors to localStorage together with "breadcrumbs" (the
// last ~15 things the player did), so a bug report pinpoints what happened.
// View / copy / clear the log from the Parent Settings panel.
var MM = globalThis.MM = globalThis.MM || {};
// The one version constant (2026-07-13, stale-client confusion: "is that
// not updated yet?"): shown on the profile screen; a unit check asserts it
// matches sw.js's VERSION so the display can never drift from the cache.
MM.VERSION = 'v1.7.4';
(function () {
  'use strict';

  const KEY = 'mathmaker2_buglog';
  const MAX_ENTRIES = 20;
  const crumbs = [];

  // Sprinkled through the game: MM.track('shop:buy bread') etc.
  MM.track = function (msg) {
    crumbs.push(new Date().toISOString().slice(11, 19) + ' ' + msg);
    if (crumbs.length > 30) crumbs.shift();
  };

  function record(kind, message, stack) {
    try {
      const log = MM.bugs.list();
      const s = MM.engine && MM.engine.state;
      log.push({
        when: new Date().toISOString(),
        kind,
        message: String(message || 'unknown').slice(0, 300),
        stack: String(stack || '').split('\n').slice(0, 6).join('\n').slice(0, 900),
        crumbs: crumbs.slice(-15),
        state: s ? {
          name: s.name, mapId: s.mapId, taskIndex: s.taskIndex,
          gold: s.gold, level: s.level, save: s.version,
        } : null,
      });
      while (log.length > MAX_ENTRIES) log.shift();
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) { /* the tracker must never crash the game */ }
  }

  MM.bugs = {
    list() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch (e) { return []; }
    },
    clear() { localStorage.removeItem(KEY); },
    report() {
      return 'Math Quest: Numeria bug report — ' + new Date().toISOString() + '\n'
        + JSON.stringify(MM.bugs.list(), null, 1);
    },
    record, // exposed for manual reporting
  };

  window.addEventListener('error', ev => record('error', ev.message, ev.error && ev.error.stack));
  window.addEventListener('unhandledrejection', ev =>
    record('promise', ev.reason && (ev.reason.message || ev.reason), ev.reason && ev.reason.stack));
})();
