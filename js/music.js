// Math Quest: Numeria — background music (design session, 2026-07-12).
// Hand-composed WebAudio loops in the same no-assets idiom as the sound
// effects: every note is an oscillator, nothing is downloaded, the game
// still plays from a double-clicked index.html.
//
// Design rules:
//  - QUIET. Music sits far under the effects (vol ~0.02-0.045) — a warm
//    background, never a foreground. Parents in the room matter.
//  - No urgency. Even the battle loop is a light pulse, not a war drum —
//    the game has no timers, and the music must not smuggle pressure in.
//  - Pentatonic everywhere (C major / A minor pentatonic), so nothing can
//    clash with the effect beeps, which land on the same scale family.
//  - Autoplay-safe: nothing schedules until the first user gesture has
//    created/resumed the shared AudioContext (MM.music.poke() from input
//    handlers); a suspended context schedules nothing and throws nothing.
//  - Switchable off on its own (s.musicOff, parent panel) and silenced
//    with everything else by s.soundOff.
var MM = globalThis.MM = globalThis.MM || {};
(() => {
  const M = MM.music = {};

  // note names -> Hz (equal temperament, just the ones the tracks use)
  const F = {
    A2: 110.0, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196.0, A3: 220.0,
    C4: 261.6, D4: 293.7, E4: 329.6, G4: 392.0, A4: 440.0,
    C5: 523.3, D5: 587.3, E5: 659.3, G5: 784.0,
  };

  // A track = tempo (beats/min), loop length in beats, and notes as
  // [beat, note, durBeats, volume, oscType]. Composed, not generated:
  // each is a short question-and-answer phrase that resolves home, so the
  // loop seam is a breath, not a hiccup.
  const TRACKS = {
    // The meadow: warm, unhurried, a walking song.
    world: {
      tempo: 96, loop: 32, notes: [
        // phrase A — up and over
        [0, 'C4', 1.6, .038, 'triangle'], [2, 'E4', 1.2, .034, 'triangle'],
        [4, 'G4', 1.6, .036, 'triangle'], [6, 'E4', 1.2, .030, 'triangle'],
        [8, 'A4', 2.4, .036, 'triangle'], [11, 'G4', 1.2, .032, 'triangle'],
        [13, 'E4', 2.4, .034, 'triangle'],
        // phrase B — and back home
        [16, 'D4', 1.6, .034, 'triangle'], [18, 'E4', 1.2, .032, 'triangle'],
        [20, 'D4', 1.6, .034, 'triangle'], [22, 'C4', 1.2, .030, 'triangle'],
        [24, 'D4', 2.4, .034, 'triangle'], [27, 'E4', 1.2, .028, 'triangle'],
        [28, 'C4', 3.6, .038, 'triangle'],
        // bass roots, one to a bar
        [0, 'C3', 3.6, .045, 'sine'], [4, 'G3', 3.6, .040, 'sine'],
        [8, 'A2', 3.6, .045, 'sine'], [12, 'E3', 3.6, .040, 'sine'],
        [16, 'D3', 3.6, .042, 'sine'], [20, 'G3', 3.6, .040, 'sine'],
        [24, 'C3', 3.6, .045, 'sine'], [28, 'C3', 3.6, .040, 'sine'],
        // one high sparkle per half, very soft
        [10, 'E5', 0.8, .016, 'sine'], [26, 'G5', 0.8, .014, 'sine'],
      ],
    },
    // The dungeon: sparse, low, curious — torchlight, not terror.
    dungeon: {
      tempo: 76, loop: 32, notes: [
        [0, 'A3', 2.4, .034, 'triangle'], [4, 'C4', 1.6, .030, 'triangle'],
        [7, 'D4', 2.4, .032, 'triangle'],
        [12, 'E4', 1.6, .030, 'triangle'], [14, 'D4', 1.6, .028, 'triangle'],
        [16, 'C4', 3.2, .032, 'triangle'],
        [22, 'G3', 1.6, .028, 'triangle'],
        [24, 'A3', 4.8, .034, 'triangle'],
        // slow drone, one breath per half
        [0, 'A2', 7.2, .040, 'sine'], [8, 'E3', 7.2, .036, 'sine'],
        [16, 'A2', 7.2, .040, 'sine'], [24, 'E3', 7.2, .036, 'sine'],
      ],
    },
    // Battle: a light heartbeat pulse and a small brave figure — motion
    // without menace. Short loop so it never wears out its welcome.
    battle: {
      tempo: 112, loop: 16, notes: [
        // pulse
        [0, 'C3', 0.6, .042, 'sine'], [2, 'G3', 0.6, .034, 'sine'],
        [4, 'C3', 0.6, .042, 'sine'], [6, 'G3', 0.6, .034, 'sine'],
        [8, 'A2', 0.6, .042, 'sine'], [10, 'E3', 0.6, .034, 'sine'],
        [12, 'G3', 0.6, .040, 'sine'], [14, 'G3', 0.6, .032, 'sine'],
        // the figure
        [0, 'E4', 0.9, .030, 'triangle'], [1, 'G4', 0.9, .028, 'triangle'],
        [2, 'A4', 1.8, .030, 'triangle'],
        [8, 'G4', 0.9, .028, 'triangle'], [9, 'E4', 0.9, .026, 'triangle'],
        [10, 'D4', 1.8, .028, 'triangle'],
      ],
    },
  };

  let ctx = null, timer = null, current = null, nextBeat = 0, loopStart = 0;

  // The context is created/resumed only from a user gesture (poke), per
  // browser autoplay policy — and reused by everything after that.
  M.poke = function () {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* audio is optional */ }
  };

  const off = () => {
    const s = MM.engine && MM.engine.state;
    return !s || s.soundOff || s.musicOff;
  };

  function scheduleWindow() {
    if (!ctx || ctx.state !== 'running' || !current || off()) return;
    const t = TRACKS[current];
    const spb = 60 / t.tempo;
    const horizon = ctx.currentTime + 0.6;
    while (loopStart + nextBeatTime() <= horizon) {
      for (const [beat, note, dur, vol, type] of t.notes) {
        const when = loopStart + beat * spb;
        if (when < ctx.currentTime - 0.05 || when > horizon) continue;
        if (beat < nextBeat) continue;
        playNote(F[note], when, dur * spb, vol, type);
      }
      // advance in whole-loop steps only when the horizon passes the seam
      if (loopStart + t.loop * spb <= horizon) {
        loopStart += t.loop * spb;
        nextBeat = 0;
      } else {
        nextBeat = Math.ceil(((horizon - loopStart) / spb));
        break;
      }
    }
    function nextBeatTime() { return nextBeat * spb; }
  }

  function playNote(freq, when, dur, vol, type) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.04);
      g.gain.setValueAtTime(vol, when + Math.max(0.05, dur - 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g).connect(ctx.destination);
      o.start(when); o.stop(when + dur + 0.05);
    } catch (e) { /* optional */ }
  }

  // Which track belongs to this moment? Called every frame by worldLoop —
  // must be cheap and idempotent.
  M.update = function () {
    let want = null;
    if (!off()) {
      if (MM.battle && MM.battle.active()) want = 'battle';
      else {
        const s = MM.engine && MM.engine.state;
        if (s && s.mapId) want = MM.maps.isOverworld(s.mapId) ? 'world' : 'dungeon';
      }
    }
    if (want === current) return;
    current = want;
    // restart the loop clock at a clean seam for the new track
    if (ctx && ctx.state === 'running' && current) {
      loopStart = ctx.currentTime + 0.1;
      nextBeat = 0;
    }
  };

  M.currentTrack = () => current; // exposed for tests
  M.TRACKS = TRACKS;              // exposed for tests (structure audit)

  // one scheduler, always ticking; it no-ops until poke() + a track
  timer = setInterval(scheduleWindow, 200);
})();
