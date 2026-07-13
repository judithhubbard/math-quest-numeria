// Math Quest: Numeria — background music, v1.7.0: real recordings.
// Public-domain / Creative-Commons PERFORMANCES (credits in README §Music;
// the full audition record lives outside the repo), played as plain
// <audio> elements — the one path that works from a double-clicked
// index.html (fetch/decodeAudioData is blocked on file://; <audio src> is
// not). The composed WebAudio loops this file used to hold are retired
// (family verdict 2026-07-13: composition-without-ears was the wrong
// strategy).
//
// Design rules:
//  - WEATHER, NOT WALLPAPER: one piece plays through, then MINUTES of
//    plain ambience before the next fades in. Arriving somewhere new is
//    quiet first; its first piece comes ~30-60s later. The pool per mood
//    shuffles and never repeats back-to-back, so nothing reads as a loop.
//  - QUIET: music peaks at ~35% volume. The effects are FEEDBACK (the
//    chime that says "correct") and must always read over the music;
//    music is backdrop, never information.
//  - Battles are silent by design (no battle track). A piece caught
//    mid-fight DUCKS to a murmur and recovers afterward — never a hard
//    stop/start at dungeon fight frequency (~every 30-90s).
//  - TEXTURE over melody (the family's own curation principle): every
//    track is even, repeating figuration, auditioned by ear.
//  - Autoplay-safe: nothing plays until the first user gesture has been
//    seen (MM.music.poke() from the input handlers).
//  - s.musicOff (⚙️ dialog + parent panel, two doors one state) stops
//    music alone; s.soundOff silences it along with everything else.
//  - A missing/broken audio file just removes that track from its pool;
//    if a whole pool is empty, that mood simply stays quiet. Silence is
//    honest — there is no synthesized fallback anymore.
var MM = globalThis.MM = globalThis.MM || {};
(() => {
  const M = MM.music = {};

  // mood: world (mainland overworld) / dungeon / isles / gentle (inn rest,
  // the ending's quiet after). One file per entry, committed under audio/.
  const TRACKS = [
    { id: 'gymnopedie', src: 'audio/ow-gymnopedie.mp3', mood: 'world',
      title: 'Satie — Gymnopédie No. 1 (Robin Alciatore, public domain via Musopen)' },
    { id: 'prelude', src: 'audio/ow-prelude.mp3', mood: 'world',
      title: 'Bach — Prelude in C major, WTC I (Kimiko Ishizaka, Open Well-Tempered Clavier, CC0)' },
    { id: 'gnossienne', src: 'audio/dg-gnossienne.mp3', mood: 'dungeon',
      title: 'Satie — Gnossienne No. 1 (via Wikimedia Commons, CC BY-SA 3.0)' },
    { id: 'leyenda', src: 'audio/dg-leyenda.mp3', mood: 'dungeon',
      title: 'Albéniz — Leyenda (Asturias) (public domain via Musopen)' },
    { id: 'clairdelune', src: 'audio/is-clairdelune.mp3', mood: 'isles',
      title: 'Debussy — Clair de Lune (Laurens Goedhart 2011, CC BY 3.0, re-encoded)' },
    { id: 'granvals', src: 'audio/is-granvals.mp3', mood: 'isles',
      title: 'Tárrega — Gran Vals (Joni Ikäläinen, CC0)' },
    { id: 'alhambra', src: 'audio/is-alhambra.mp3', mood: 'isles',
      title: 'Tárrega — Recuerdos de la Alhambra (via Wikimedia Commons, CC BY-SA 3.0)' },
    { id: 'traumerei', src: 'audio/ge-traumerei.mp3', mood: 'gentle',
      title: 'Schumann — Träumerei, Kinderszenen (public domain via Musopen)' },
    { id: 'pavane', src: 'audio/ge-pavane.mp3', mood: 'gentle',
      title: 'Ravel — Pavane pour une infante défunte (Thérèse Dussaut, CC BY-SA 2.0)' },
    { id: 'noi', src: 'audio/ge-noi.mp3', mood: 'gentle',
      title: 'El Noi de la Mare, Catalan traditional (guitar, public domain)' },
  ];

  const BASE_VOL = 0.35;          // music's ceiling, far under the SFX
  const DUCK = 0.25;              // fraction of BASE_VOL during a battle
  const FIRST_GAP = [30, 60];     // s of quiet after arriving in a mood
  const GAP = [180, 360];         // s of quiet between pieces
  const gapMs = ([a, b]) => (a + Math.random() * (b - a)) * 1000;

  let el = null;                  // the single <audio> element, reused
  let playing = null;             // TRACKS entry currently playing
  let mood = null;                // current mood ('world'/'dungeon'/...)
  let gapUntil = 0;               // performance.now() when quiet may end
  let lastPlayed = {};            // mood -> id, never twice running
  let broken = {};                // id -> true (file failed to load)
  let poked = false;              // a user gesture has happened
  let oneShot = null;             // a queued 'gentle' moment (inn rest)

  M.poke = function () { poked = true; };

  const off = () => {
    const s = MM.engine && MM.engine.state;
    return !s || s.soundOff || s.musicOff;
  };

  function ensureEl() {
    if (el) return el;
    el = new Audio();
    el.preload = 'none';
    el.addEventListener('ended', () => {
      playing = null;
      gapUntil = performance.now() + gapMs(GAP);
    });
    el.addEventListener('error', () => {
      if (playing) broken[playing.id] = true;
      playing = null;
      gapUntil = performance.now() + gapMs(GAP);
    });
    return el;
  }

  function poolFor(m) {
    return TRACKS.filter(t => t.mood === m && !broken[t.id]);
  }

  function pick(m) {
    const pool = poolFor(m);
    if (!pool.length) return null;
    const fresh = pool.filter(t => t.id !== lastPlayed[m]);
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function start(track) {
    const a = ensureEl();
    a.src = track.src;
    a.volume = 0;
    playing = track;
    lastPlayed[track.mood] = track.id;
    const p = a.play();
    if (p && p.catch) p.catch(() => {
      // autoplay refused or file missing on this platform: back to quiet,
      // try again next window (poke() will have happened by then)
      playing = null;
      gapUntil = performance.now() + gapMs(FIRST_GAP);
    });
  }

  // Which mood does this moment live in? Battles do NOT change the mood —
  // they duck the volume instead (see below).
  function moodNow() {
    const s = MM.engine && MM.engine.state;
    if (!s || !s.mapId) return null;
    const id = String(s.mapId);
    if (MM.maps.isOverworld && MM.maps.isOverworld(id)) return 'world';
    // isle dungeons and the sea keep the isles' own colour
    const idx = s.dungeonIndex;
    const task = idx && MM.data.TASKS[idx - 1];
    if (task && task.isle) return 'isles';
    if (id.startsWith('d')) return 'dungeon';
    return 'world';
  }

  // A gentle piece, soon: called at moments the world itself turns soft
  // (the inn's lights-out, the ending's quiet after). One piece, then the
  // area's normal weather resumes.
  M.moment = function (m) { oneShot = m; };

  // Called every frame by the world loop — cheap and idempotent. All the
  // actual pacing lives on the timestamps above.
  M.update = function () {
    const a = el;
    if (off()) {
      if (a && !a.paused) { a.pause(); playing = null; }
      return;
    }
    const want = moodNow();
    if (want !== mood) {
      mood = want;
      // leaving for somewhere new: let the current piece fade out (the
      // volume ramp below heads to 0, then we stop), and start the new
      // mood's clock — quiet FIRST, music later.
      gapUntil = performance.now() + gapMs(FIRST_GAP);
    }
    const inBattle = MM.battle && MM.battle.active();
    if (playing && a) {
      // ramp toward the moment's right volume: normal, ducked, or (mood
      // changed away mid-piece) zero-then-stop
      const target = (playing.mood !== mood && !(oneShot && playing.mood === oneShot))
        ? 0 : BASE_VOL * (inBattle ? DUCK : 1);
      a.volume += (target - a.volume) * 0.08;
      if (target === 0 && a.volume < 0.01) { a.pause(); playing = null; }
      return;
    }
    if (!poked || inBattle) return;   // never START a piece mid-fight
    if (oneShot) {
      const t = pick(oneShot);
      oneShot = null;
      if (t) { start(t); return; }
    }
    if (!mood || performance.now() < gapUntil) return;
    const t = pick(mood);
    if (t) start(t); else gapUntil = performance.now() + gapMs(GAP);
  };

  M.currentTrack = () => (playing ? playing.id : null); // exposed for tests
  M.TRACKS = TRACKS;                                    // exposed for tests + credits
  M._state = () => ({ mood, playing: playing && playing.id, gapUntil, poked }); // tests
})();
