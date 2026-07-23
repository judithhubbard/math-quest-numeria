// MathMaker v2 — world rendering (pixel sprites + animation), modals, sidebar, sound.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const UI = MM.ui = {};
  const TILE = 48;
  const VIEW_W = 15, VIEW_H = 11;
  // Wave 11 (P1): only wall/floor sprites take a theme tint — everything
  // else (doors, chests, levers...) keeps its own fixed colors.
  const DESCENT_TINT_SPRITES = { wall: 1, wallWorked: 1, wallGrand: 1, floor: 1 };
  // Wave 20 (Looking Glass P1): when the kid is THROUGH THE GLASS (a mirror
  // replay run, s.ngPlus > 0), the whole world renders under a cheap cool
  // "reflection" wash at the render layer — the mirror is VISIBLE at a glance
  // even before the P2 aesthetic pass (map-flip, reversed sprites). A `color`
  // blend shifts every hue toward cool blue while keeping luminance (so it
  // stays readable), a faint multiply deepens it, and a cyan sheen adds the
  // glassy glint. Warm greens/browns read as a cool moonlit reflection.
  // v1.20.0 (live playtest: "the mirror world is too dark"): the multiply
  // colour sat at #aecbe6 — a 32% cut to every red channel — under a 60%
  // hue wash that flattened the palette. The glass now tints without
  // gloom: a lighter hue pass, a near-white multiply, a touch more sheen.
  const MIRROR_TINT = { hue: '#5a9fd4', hueAlpha: 0.38, mult: '#dfe9f4', sheen: '#cfe9ff', sheenAlpha: 0.10 };

  let canvas, ctx, modalEl, modalBox;
  let messages = [];

  UI.facing = 1;      // 1 = right, -1 = left
  UI.stepCount = 0;   // increments per move; drives walk-frame alternation
  let lastMoveAt = 0;

  // ---------- sound effects (WebAudio, no assets) ----------
  let audioCtx = null;
  function actx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    // Browsers SUSPEND the context (tab switch, laptop sleep, headphone
    // changes) and a suspended context plays nothing without throwing —
    // the "sound just stopped" bug. Resume on every use; it's a no-op
    // when already running.
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  // Pass D: one mute gate for every sound in the game — beep and noise are
  // the only two paths to the speakers, so s.soundOff silences everything.
  const soundOff = () => !!(MM.engine && MM.engine.state && MM.engine.state.soundOff);
  function beep(freq, dur, type, delay, vol) {
    if (soundOff()) return;
    try {
      const a = actx();
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* sound is optional */ }
  }
  function noise(dur, freq, delay, vol) {
    if (soundOff()) return;
    try {
      const a = actx();
      const t = a.currentTime + (delay || 0);
      const len = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = freq;
      const g = a.createGain();
      g.gain.value = vol || 0.2;
      src.connect(f).connect(g).connect(a.destination);
      src.start(t);
    } catch (e) { /* optional */ }
  }
  MM.sound = {
    correct() { beep(523, 0.12); beep(784, 0.2, 'triangle', 0.1); },
    wrong() { beep(180, 0.35, 'sawtooth', 0, 0.06); },
    coin() { beep(880, 0.08); beep(1175, 0.15, 'triangle', 0.07); },
    levelup() { beep(523, 0.12); beep(659, 0.12, 'triangle', 0.1); beep(784, 0.12, 'triangle', 0.2); beep(1047, 0.3, 'triangle', 0.3); },
    fanfare() { beep(523, 0.15); beep(659, 0.15, 'triangle', 0.12); beep(784, 0.15, 'triangle', 0.24); beep(1047, 0.4, 'triangle', 0.36); beep(784, 0.3, 'triangle', 0.55); beep(1047, 0.5, 'triangle', 0.7); },
    whoosh() { noise(0.18, 2400, 0, 0.15); },
    hit(crit) { noise(0.12, 900, 0, 0.3); beep(140, 0.18, 'square', 0, 0.1); if (crit) beep(1568, 0.25, 'triangle', 0.05, 0.14); },
    thud() { noise(0.16, 400, 0, 0.35); beep(90, 0.25, 'sine', 0, 0.22); },
    dodge() { noise(0.14, 4800, 0, 0.12); beep(1400, 0.1, 'sine', 0.04, 0.05); },
    // Wave 8b follow-up (playtest 2026-07-12): a landed SOOTHE — two soft
    // rising sine notes, like a wind chime settling; a "perfectly calm"
    // crit adds a third, higher and softer still. No percussion at all:
    // calming something must never sound like hitting it.
    soothe(crit) {
      beep(1760, 0.05, 'sine', 0, 0.05); // the tiny POP (user palette 2026-07-13)
      beep(659, 0.28, 'sine', 0.03, 0.07);
      beep(880, 0.34, 'sine', 0.15, 0.06);
      if (crit) beep(1319, 0.45, 'sine', 0.29, 0.05);
    },
    // The frightened flail (2026-07-13): the monster's counterattack in the
    // gentle way — a quick soft ruffle, NO bass thump, clearly "that cost
    // you" but nothing like a blow landing. Strike-way keeps thud().
    fret() { noise(0.1, 1800, 0, 0.16); beep(520, 0.12, 'sine', 0.02, 0.05); },
    // The final becalming: a low purr warble under the victory notes.
    purr() { beep(96, 0.5, 'sine', 0, 0.06); beep(101, 0.5, 'sine', 0.02, 0.05); },
    battleStart(boss) {
      beep(196, 0.14, 'square', 0, 0.08); beep(196, 0.14, 'square', 0.16, 0.08);
      beep(boss ? 147 : 262, 0.35, 'square', 0.32, 0.1);
      if (boss) noise(0.5, 300, 0.3, 0.2);
    },
    // Wave 4: a 5-tone scale (do-re-mi-fa-sol) for singing stones (flavor,
    // engine.js tileEffects) and echo doors (the tone-memory puzzle, below).
    tone(i, delay) { beep(TONE_FREQS[i % TONE_FREQS.length], 0.35, 'triangle', delay || 0, 0.1); },
    // ---------- Wave 12: the Proving Rooms' sound palette ----------
    // splash: a wrong stepping stone — water, never a whack (and no text).
    splash() { noise(0.22, 1000, 0, 0.22); beep(320, 0.18, 'sine', 0.02, 0.07); beep(210, 0.24, 'sine', 0.1, 0.05); },
    // sigh: the armory stand's two-note descending sigh (every 7th turn).
    sigh() { beep(392, 0.3, 'sine', 0, 0.07); beep(311, 0.45, 'sine', 0.24, 0.06); },
    // chirp: the wardrobe, when walked past. Wardrobes do not chirp. This one does.
    chirp() { beep(1319, 0.08, 'triangle', 0, 0.06); beep(1760, 0.1, 'triangle', 0.09, 0.05); },
    // creak: cracked floor underfoot — wood about to change its mind.
    creak() { beep(150, 0.22, 'sawtooth', 0, 0.045); beep(122, 0.2, 'sawtooth', 0.1, 0.035); },
    // v1.8.2 — the toot: stone slabs, scraped across a floor, occasionally
    // emit a small rude noise. Nobody in the castle will discuss it.
    // Descending contour (comedic deflation), soft, brief.
    toot() { beep(110, 0.08, 'sawtooth', 0, 0.07); beep(88, 0.09, 'sawtooth', 0.06, 0.08); beep(62, 0.18, 'sawtooth', 0.13, 0.07); noise(0.14, 300, 0.03, 0.08); },
    // Wave 13 — the Understudy's tiny ta-da: two bright notes, curtain-up.
    // (New sounds also go in the fixed stub list at tests/test.js ~line 17.)
    tada() { beep(659, 0.1, 'triangle', 0, 0.09); beep(988, 0.22, 'triangle', 0.1, 0.09); },
    // Wave 21 (Looking Glass P2.2) — the Cheshire Cat's materialize: two
    // soft, high, slightly odd notes (never a fanfare — it's a guide
    // arriving, not a reward).
    mew() { beep(1568, 0.07, 'sine', 0, 0.05); beep(1319, 0.16, 'sine', 0.08, 0.045); },
  };
  const TONE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.00]; // C4 D4 E4 F4 G4
  const TONE_COLORS = ['#e05252', '#e0a952', '#ffd94a', '#68c470', '#52a8e0'];

  // ---------- tile → sprite mapping ----------
  // tileSprite moved to MM.maps.tileSprite (Wave 6.5) — pure glyph logic,
  // so the unit suite can render-audit every map without a DOM.

  // ---------- Pass D: tap/click-to-move (touch support) ----------
  // One rule keeps this honest: the tap handler ONLY synthesizes tryMove()
  // steps, so a tapped route behaves exactly like walking it — battles,
  // doors, chests, NPCs, ice, pools, stamina, everything. BFS paths across
  // plain, predictable floor only; any other tile may be the FINAL target,
  // reached as a bump (which is how everything opens/talks/fights anyway).
  let tapTimer = null, tapPath = null;
  const TAP_PLAIN = '.P=,s'; // floor, path, bridge, tide pools, singing stones
  function stopTapWalk() { tapPath = null; if (tapTimer) { clearInterval(tapTimer); tapTimer = null; } }
  UI.tapTo = function (tx, ty) {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active() || (UI.sailing && UI.sailing())) return;
    const grid = s.grid, H = grid.length, W = grid[0].length;
    if (ty < 0 || ty >= H || tx < 0 || tx >= W) return;
    if (tx === s.px && ty === s.py) return;
    const key = (x, y) => y * W + x;
    const prev = new Int32Array(W * H).fill(-1);
    const seen = new Uint8Array(W * H);
    const start = key(s.px, s.py);
    seen[start] = 1;
    const q = [start];
    let found = -1;
    while (q.length && found < 0) {
      const k = q.shift(), x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[nk]) continue;
        if (nx === tx && ny === ty) { prev[nk] = k; found = nk; break; }
        if ((s.monsters || []).some(m => m.hp > 0 && m.x === nx && m.y === ny)) continue;
        if (!TAP_PLAIN.includes(grid[ny][nx])) continue;
        seen[nk] = 1; prev[nk] = k; q.push(nk);
      }
    }
    if (found < 0) return; // no plain-floor route — tap something nearer
    const steps = [];
    for (let k = found; prev[k] !== -1; k = prev[k]) {
      const pk = prev[k];
      steps.unshift([(k % W) - (pk % W), ((k / W) | 0) - ((pk / W) | 0)]);
    }
    stopTapWalk();
    tapPath = steps;
    let expect = { x: s.px, y: s.py };
    tapTimer = setInterval(() => {
      const st = MM.engine.state;
      // stop the moment anything unexpected happens: a battle or dialog
      // opened, or a slide/teleport/keyboard step moved us off the plan
      if (!tapPath || !tapPath.length || UI.modalOpen() || MM.battle.active()
          || st.px !== expect.x || st.py !== expect.y) { stopTapWalk(); return; }
      const [dx, dy] = tapPath.shift();
      expect = { x: st.px + dx, y: st.py + dy };
      MM.engine.tryMove(dx, dy);
      if (tapPath && !tapPath.length) stopTapWalk();
    }, 120);
  };

  UI.init = function () {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    modalEl = document.getElementById('overlay');
    modalBox = document.getElementById('modalBox');

    // music: the AudioContext may only start from a user gesture — poke it
    // from every input path once; cheap no-op afterwards
    document.addEventListener('keydown', () => MM.music && MM.music.poke());
    document.addEventListener('pointerdown', () => MM.music && MM.music.poke());

    canvas.addEventListener('click', (ev) => {
      const r = canvas.getBoundingClientRect();
      const sx = (ev.clientX - r.left) * (canvas.width / r.width);
      const sy = (ev.clientY - r.top) * (canvas.height / r.height);
      const cam = UI._cam || { x: 0, y: 0 };
      UI.tapTo(cam.x + Math.floor(sx / TILE), cam.y + Math.floor(sy / TILE));
    });

    document.addEventListener('keydown', (ev) => {
      // manual bug capture works EVERYWHERE — even over a broken modal,
      // which is exactly when it's needed (Wave 6.5)
      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 'b') { ev.preventDefault(); return UI.captureNow(); }
      // never swallow keys the user is typing into a text field (name, answers)
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      // the ending cutscene: ANY key skips the beat you're on (a kid who has
      // seen it four times should never be held hostage by it)
      if (endAnim && !UI.modalOpen()) { ev.preventDefault(); return endSkip(); }
      if (UI.modalOpen() || MM.battle.active()) return;
      const k = ev.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') { ev.preventDefault(); MM.engine.tryMove(0, -1); }
      else if (k === 'arrowdown' || k === 's') { ev.preventDefault(); MM.engine.tryMove(0, 1); }
      else if (k === 'arrowleft' || k === 'a') { ev.preventDefault(); MM.engine.tryMove(-1, 0); }
      else if (k === 'arrowright' || k === 'd') { ev.preventDefault(); MM.engine.tryMove(1, 0); }
      else if (k === 'p') MM.engine.usePotion();
      else if (k === 'f') UI.foodMenu();
      else if (k === 'b') UI.openBag();
      else if (k === 'r') UI.reportCard();
      else if (k === 'm') UI.monsterBook();
      // Pass D: number keys cast the spellbook slots (silent no-ops until
      // each spell is unlocked — the sidebar row is where they're taught)
      else if (k === '1') MM.engine.castScout();
      else if (k === '2') MM.engine.castBlink();
      else if (k === '3') MM.engine.castBeacon();
      // v1.20.0: in Your Own Room, Space sets the carried piece down
      else if (k === ' ' && MM.engine.state && MM.engine.state.mapId === 'myroom') {
        ev.preventDefault();
        MM.engine.myRoomSetDown();
      }
    });

    document.getElementById('btnPotion').onclick = () => MM.engine.usePotion();
    document.getElementById('btnFood').onclick = () => UI.foodMenu();
    document.getElementById('btnBag').onclick = () => UI.openBag();
    document.getElementById('btnReport').onclick = () => UI.reportCard();
    document.getElementById('btnBook').onclick = () => UI.monsterBook();
    document.getElementById('btnHelp').onclick = () => UI.helpDialog();
    document.getElementById('btnDifficulty').onclick = () => UI.difficultyDialog();
    document.getElementById('btnParent').onclick = () => UI.parentPanel();
    document.getElementById('btnSwitch').onclick = () => { MM.engine.save(); location.reload(); };

    requestAnimationFrame(worldLoop);
  };

  UI.modalOpen = () => modalEl && !modalEl.classList.contains('hidden');
  UI.playerMoved = function (dx) {
    if (dx) UI.facing = dx > 0 ? 1 : -1;
    UI.stepCount++;
    lastMoveAt = performance.now();
    // Wave 5 item 7: a small dust puff at the tile just left — ambient
    // texture, not a reward moment, so it's deliberately subtle (2 tiny
    // particles). worldBurst itself no-ops under Calm Mode.
    const s = MM.engine.state;
    if (s) worldBurst(s.px, s.py, '#8a7f68', 2);
  };

  // ---------- world-canvas particle bursts (Wave 5 item 7) ----------
  // A generalized version of battle.js's burst(), for achievement moments
  // (badges, level-ups, bounties) and footstep puffs on the WORLD canvas —
  // these are two separate canvases (see js/battle.js), so this can't just
  // call battle.js's burst() directly. Off entirely under Calm Mode.
  let worldParticles = [];
  function worldBurst(tileX, tileY, color, n) {
    const s = MM.engine.state;
    if (s && s.calmMode) return;
    const px = tileX * TILE + TILE / 2, py = tileY * TILE + TILE / 2;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
      worldParticles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 1, color, size: 2 + Math.random() * 4 });
    }
  }
  UI.worldBurst = worldBurst; // exposed for engine.js (badges/level-ups/bounties)
  // Celebration sparkles (playtest 2026-07-13: the teal body-height bursts
  // at cheering friends read as SPITTING WATER): warm colors, RISING drift,
  // occasional tiny heart, spawned above the celebrant's head.
  function worldSparkle(tileX, tileY) {
    const s = MM.engine.state;
    if (s && s.calmMode) return;
    const px = tileX * TILE + TILE / 2, py = tileY * TILE + TILE / 2;
    worldParticles.push({
      x: px + (Math.random() - 0.5) * 24, y: py + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random() * 0.8,
      life: 1, color: Math.random() < 0.35 ? '#ff9ad5' : '#ffd94a',
      size: 9 + Math.random() * 4, glyph: Math.random() < 0.3 ? '🤍' : '✦', rise: true,
    });
  }
  // ---------- the Turning Stones (the TRUE golden spiral) ----------
  // The whole curl is the classic Fibonacci-square golden spiral, sampled
  // in data.js (spiralChain) and stroked HERE — but only where the raw tile
  // underneath is plain grass, so the carving vanishes under the river, the
  // mountains, the trees and the buildings that were built/grew/flow OVER
  // it (the tile pass paints those first; this overlay must not paint on
  // top). A FAINT full curve is always visible ("a picture, seen from high
  // enough"); the tended prefix, up to the aligned frontier stone's
  // chain-parameter, brightens; at 13/13 the whole curl brightens, a golden
  // glow follows it, and the nub up to the tower brightens too. Alignment
  // reads s.tasksDone.length live. Numbered discs sit ON the curve at their
  // exact float positions; the glint + walk recipes are unchanged.
  function drawTurningStones(camX, camY, now) {
    const s = MM.engine.state;
    if (!s || s.mapId !== 'world') return;
    // early-out when the whole curl's bounding box is off-screen
    if (camX + VIEW_W < 18 || camX > 42 || camY + VIEW_H < 1 || camY > 19) return;
    const stones = MM.data.TURNING_STONES;
    const n = Math.min(s.tasksDone.length, stones.length);
    const gx = g => (g + 0.5 - camX) * TILE;   // geometry-float tile -> pixel
    const gy = g => (g + 0.5 - camY) * TILE;
    const onScreen = st => st.x >= camX - 1 && st.y >= camY - 1 && st.x < camX + VIEW_W + 1 && st.y < camY + VIEW_H + 1;
    // how far along the curl is tended: the aligned frontier's chain-param.
    // At 13/13 push it past the nub (8) so the tip-to-tower curve lights too.
    let brightT = -1;
    if (n >= 13) brightT = 8;
    else if (n >= 1) brightT = stones[n - 1].t;

    const chain = MM.data.spiralChain();
    const ow = MM.maps.OVERWORLD;
    // stroke the sampled chain between chain-params [fromT, toT], breaking
    // the path wherever a sample's tile is not plain grass — the carving
    // only ever shows on land.
    function strokeChain(fromT, toT, style, width, alpha) {
      if (toT < fromT) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let drawing = false;
      for (const p of chain) {
        if (p.t < fromT || p.t > toT) { if (drawing) ctx.stroke(); drawing = false; continue; }
        const row = ow[Math.round(p.y)];
        if (!row || row[Math.round(p.x)] !== '.') { if (drawing) ctx.stroke(); drawing = false; continue; }
        const X = gx(p.x), Y = gy(p.y);
        if (!drawing) { ctx.beginPath(); ctx.moveTo(X, Y); drawing = true; }
        else ctx.lineTo(X, Y);
      }
      if (drawing) ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // the newest-turned stone's glint (tile wash, under the carving)
    for (const st of stones) {
      if (!onScreen(st)) continue;
      if (MM.engine.spiralStoneGlinting && MM.engine.spiralStoneGlinting(st.i)) {
        ctx.globalAlpha = 0.30 + 0.25 * Math.sin(now / 120);
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect((st.x - camX) * TILE, (st.y - camY) * TILE, TILE, TILE);
        ctx.globalAlpha = 1;
      }
    }
    // all thirteen aligned: a wide soft golden glow follows the whole curl
    // (static, Calm-Mode-safe)
    if (n >= 13) strokeChain(0, 8, '#ffd94a', 11, 0.20);
    // the faint full curve, always present
    strokeChain(0, 8, '#d8cca6', 2.5, 0.28);
    // the bright, tended prefix
    if (brightT >= 0) strokeChain(0, brightT, '#fff6d8', 3.5, 0.95);

    // the stones themselves — round discs sitting ON the curve at their
    // exact float positions. Radius grows with the carved number so the
    // sequence reads as growth before a single numeral is read.
    for (const st of stones) {
      if (!onScreen(st)) continue;
      const cx = gx(st.fx), cy = gy(st.fy);
      const aligned = s.tasksDone.length > st.i;
      const r = 6 + st.size * 0.55;
      ctx.fillStyle = aligned ? '#fff6d8' : '#b7b2a4';
      ctx.strokeStyle = aligned ? '#8a7a58' : '#7d786c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // the seven sequence stones carry their carved number — upright once
      // aligned ("upright once turned" is the ending exam's fair-play
      // promise), crooked while untended (deterministic skew, never
      // time-driven — nothing for Calm Mode to turn off)
      if (st.label) {
        ctx.save();
        ctx.translate(cx, cy);
        if (!aligned) ctx.rotate(MM.data.stoneSkew(st.i) * Math.PI / 180);
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        if (aligned) {
          ctx.fillStyle = '#3a3020'; // carved into the pale stone
          ctx.fillText(st.label, 0, 4);
        } else {
          ctx.fillStyle = '#141221';
          ctx.fillText(st.label, 1, 5);
          ctx.fillStyle = '#4a4636';
          ctx.fillText(st.label, 0, 4);
        }
        ctx.restore();
      }
    }
  }

  function drawWorldParticles(camX, camY) {
    if (!worldParticles.length) return;
    for (let i = worldParticles.length - 1; i >= 0; i--) {
      const p = worldParticles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.rise ? -0.01 : 0.15; p.life -= p.rise ? 0.022 : 0.035;
      if (p.life <= 0) { worldParticles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.glyph) {
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.fillText(p.glyph, p.x - camX * TILE, p.y - camY * TILE);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - camX * TILE - p.size / 2, p.y - camY * TILE - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- the voyage (played whenever the Compass Rose sails) ----------
  let sailAnim = null;
  UI.sailing = () => !!sailAnim;
  UI.sailScene = function (dest, onDone) {
    sailAnim = { start: performance.now(), dest, onDone };
    MM.sound.whoosh();
  };

  function drawSail(now) {
    const a = sailAnim;
    const t = (now - a.start) / 2600;
    if (t >= 1) { const cb = a.onDone; sailAnim = null; cb(); return; }
    const W = canvas.width, H = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2c4e'); g.addColorStop(0.6, '#3a5a80'); g.addColorStop(1, '#2c6a8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd94a'; // low sun on the horizon
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.42, 26, 0, Math.PI * 2);
    ctx.fill();
    // rolling sea, scrolling against the ship's heading
    const water = MM.sprites.get(Math.floor(now / 500) % 2 ? 'water2' : 'water', { scale: 3 });
    const dir = a.dest === 'west' ? 1 : -1; // west = homeward, everything else = further out
    const scroll = ((now / 18) * -dir) % 48;
    for (let y = Math.floor(H * 0.5); y < H; y += 48) {
      for (let x = -96; x < W + 96; x += 48) ctx.drawImage(water, x + scroll, y);
    }
    // the Compass Rose, bobbing across
    const ship = MM.sprites.get('ship', { scale: 5, mirror: dir < 0 });
    const sx = dir > 0 ? -80 + (W + 160) * t : W + 80 - (W + 160) * t;
    const sy = H * 0.52 + Math.sin(now / 280) * 6 - ship.height + 30;
    ctx.drawImage(ship, sx - ship.width / 2, sy);
    ctx.strokeStyle = '#f2ede4'; // gulls
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const gx = W * (0.3 + i * 0.32) + Math.sin(now / 700 + i * 2) * 30;
      const gy = H * 0.2 + i * 26 + Math.cos(now / 600 + i) * 8;
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy);
      ctx.quadraticCurveTo(gx - 3, gy - 5, gx, gy);
      ctx.quadraticCurveTo(gx + 3, gy - 5, gx + 7, gy);
      ctx.stroke();
    }
    // Wave 6.5: captions come from the destination registry — the old
    // two-way ternary said "Sailing home to Numeria" for every new island
    const msg = (MM.data.DESTINATIONS[a.dest] || {}).caption || '⛵ Sailing...';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#141221';
    ctx.fillText(msg, W / 2 + 2, H * 0.16 + 2);
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(msg, W / 2, H * 0.16);
  }

  // ================= "The Kingdom, Untangled" (Wave 7's ending cutscene) ======
  // The game's one big scripted scene. Structured exactly like drawSail — one
  // module-level state object, painted by the shared rAF loop — but with real
  // BEATS, because it has to say something.
  //
  // Stage 1 (the untangling): each region's monster was a TANGLE where the
  // working should have been. So each vignette draws a literal knot — a bezier
  // with scrambled control points — and LERPS those control points onto an
  // orderly target. A worked line is a straight line; that's the whole thesis,
  // animated. One soft chime per beat.
  // Stage 2 (the pull-back): the kingdom redraws itself as the golden-rectangle
  // tiling (1,1,2,3,5,8), spiral sweeping through the regions IN THE ORDER THE
  // KID VISITED THEM. Then the last problem in the game — and it's a discovery,
  // not a test.
  //
  // Every beat is skippable with any key. Replayable forever from the throne.
  let endAnim = null;
  UI.cinematic = () => !!endAnim;
  const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  // A knot: N control points, scrambled -> orderly. p=0 is chaos, p=1 is order.
  function drawKnot(cx, cy, seedPts, targetPts, p, color, width) {
    const pts = seedPts.map((sp, i) => {
      const tp = targetPts[i];
      return { x: sp.x + (tp.x - sp.x) * p, y: sp.y + (tp.y - sp.y) * p };
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + pts[0].x, cy + pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = cx + (pts[i].x + pts[i + 1].x) / 2;
      const yc = cy + (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(cx + pts[i].x, cy + pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(cx + last.x, cy + last.y);
    ctx.stroke();
  }

  // deterministic pseudo-random, so a replay of the ending looks the same
  function seeded(i) { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }

  function knotSeed(n, spread) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ x: (seeded(i * 3 + 1) - 0.5) * spread, y: (seeded(i * 3 + 2) - 0.5) * spread });
    }
    return out;
  }

  // Each region's tangle resolves into the shape that region MEANT.
  function beatTargets(kind, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      if (kind === 'beam') out.push({ x: -170 + 340 * t, y: 0 });                       // the lighthouse beam: straight
      else if (kind === 'clock') out.push({ x: 0, y: -110 * (1 - t) });                  // hands at midnight: vertical
      else if (kind === 'pier') out.push({ x: -170 + 340 * t, y: (i % 2) * 26 - 13 });   // rebuilt beams: a level frame
      else if (kind === 'staff') out.push({ x: -170 + 340 * t, y: Math.round((t * 4 - 2)) * 22 }); // notes on a staff
      else out.push({ x: -150 + 300 * t, y: (i % 2 ? 34 : -34) });                       // a worked scaffold: a zigzag of steps
    }
    return out;
  }

  UI.endingScene = function (onDone) {
    const s = MM.engine.state;
    const beats = [
      { kind: 'scroll', title: 'Miscount', line: 'The largest tangle of all — a boy who stopped working things out.', tone: 0, color: '#8d88b8' },
      { kind: 'beam', title: 'The Great Lighthouse', line: 'The Murk grew where the light stopped being tended.', tone: 1, color: '#dce8ec' },
      { kind: 'clock', title: 'The Clockwork Spire', line: 'The King wound down where nobody was left to wind him.', tone: 2, color: '#e0b84a' },
      { kind: 'pier', title: 'Gullwrack Harbor', line: 'The Undertow never learned where the edges of things were.', tone: 3, color: '#7ab8b0' },
    ];
    // the choir only turns up if the kid actually met them — music is opt-in,
    // so this beat is a bonus, never a hole
    if (s.isles && s.isles.hallsDone) {
      beats.push({ kind: 'staff', title: 'The Resonant Halls', line: 'The Discord only ever wanted to be let into the song.', tone: 4, color: '#e88ac4' });
    }
    endAnim = {
      start: performance.now(), beat: 0, beatStart: performance.now(),
      beats, onDone, stage: 'untangle', asked: false, wrongShown: false, credits: 0,
    };
    MM.sound.tone(0);
  };

  const BEAT_MS = 4200, PULLBACK_MS = 7000;

  function endSkip() {
    const a = endAnim;
    if (!a) return;
    if (a.stage === 'untangle') {
      a.beat++;
      a.beatStart = performance.now();
      if (a.beat >= a.beats.length) { a.stage = 'pullback'; a.beatStart = performance.now(); }
      else MM.sound.tone(a.beats[a.beat].tone);
      return;
    }
    if (a.stage === 'pullback') { a.beatStart = performance.now() - PULLBACK_MS; return; }
    if (a.stage === 'credits') { endFinish(); }
  }

  function endFinish() {
    const a = endAnim;
    if (!a) return;
    const cb = a.onDone;
    endAnim = null;      // clear FIRST — onDone reopens the world
    if (cb) cb();
  }

  // The last problem in the game. Not a test — a discovery. A wrong answer is
  // answered by DRAWING the next square, so the kid leaves having seen why.
  function askTheSpiral() {
    const a = endAnim;
    a.asked = true;
    const prob = {
      kind: 'number', skill: 'word_problems', tier: 1,
      text: 'The kingdom writes itself along the spiral:\n\n<b>1  1  2  3  5  8  13  …</b>\n\nWhat comes next?',
      answer: MM.problems.frac(21, 1),
      hint: 'Look at any two numbers in a row. What do they make together?',
      solution: '8 + 13 = 21.',
    };
    UI.showProblem({
      header: '🌀 <b>"The kingdom looks different from far away."</b>',
      problem: prob,
      leaveLabel: 'Just look at it',
      onAnswer(correct) {
        if (!endAnim) return { end: 'win' };
        endAnim.solved = true;
        if (correct) {
          MM.sound.fanfare();
          return {
            msg: '<i>The next square blooms out past the edge of the parchment, and keeps going.</i>',
            end: 'win',
          };
        }
        // teach, never scold — the spiral shows its own working
        endAnim.wrongShown = true;
        return {
          msg: '<i>The spiral draws it for you: the last two squares, laid side by side.</i><br><br>' +
            '<b>8 + 13 = 21.</b> Each square is the two before it, added together — that is the whole rule, ' +
            'and you can see it now.<br><br><i>"Patterns usually do," says the MathMaker. "That is the trick of it: ' +
            'step back far enough, and the tangle was a shape all along."</i>',
          end: 'win',
        };
      },
      onNext: () => {},
      onEnd() {
        if (!endAnim) return;
        endAnim.stage = 'credits';
        endAnim.beatStart = performance.now();
      },
    });
  }

  // The Fibonacci square tiling, laid out so the squares ABUT exactly: each
  // new square attaches to a side of the growing rectangle whose length
  // already equals it (left, top, right, bottom, left). 1+1+4+9+25+64 = 104,
  // and the finished rectangle is 13x8 = 104 — it tiles with no gap, which is
  // the entire point and worth checking rather than eyeballing.
  const FIB = [1, 1, 2, 3, 5, 8];
  const FIB_SQ = [
    { x: 0, y: 0, s: 1 }, { x: -1, y: 0, s: 1 }, { x: -1, y: -2, s: 2 },
    { x: 1, y: -2, s: 3 }, { x: -1, y: 1, s: 5 }, { x: -9, y: -2, s: 8 },
  ];
  // One continuous quarter-arc per square, each starting exactly where the
  // last one ended — the golden spiral, sweeping the regions in visit order.
  const FIB_ARC = [
    { cx: 0, cy: 0, r: 1, a0: 0, a1: 90 },
    { cx: 0, cy: 0, r: 1, a0: 90, a1: 180 },
    { cx: 1, cy: 0, r: 2, a0: 180, a1: 270 },
    { cx: 1, cy: 1, r: 3, a0: 270, a1: 360 },
    { cx: -1, cy: 1, r: 5, a0: 0, a1: 90 },
    { cx: -1, cy: -2, r: 8, a0: 90, a1: 180 },
  ];
  const FIB_NEXT = { x: -9, y: -15, s: 13 };  // where 21's square would go
  const FIB_CENTER = { x: -2.5, y: 2 };
  const FIB_NAMES = ['the castle grounds', 'the east bank', 'the bridge lands', 'the mainland', 'the Isles', 'the far isles'];

  function drawEnding(now) {
    const a = endAnim;
    const W = canvas.width, H = canvas.height;
    const calm = !!(MM.engine.state && MM.engine.state.calmMode);

    if (a.stage === 'untangle') {
      const b = a.beats[a.beat];
      const t = Math.min(1, (now - a.beatStart) / BEAT_MS);
      // deep night, warming as the knot resolves
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0d0b1a');
      g.addColorStop(1, `rgb(${Math.round(20 + 26 * t)}, ${Math.round(18 + 20 * t)}, ${Math.round(40 + 24 * t)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const p = t < 0.25 ? 0 : ease((t - 0.25) / 0.6);
      const n = 9;
      drawKnot(W / 2, H / 2 - 10, knotSeed(n, 230), beatTargets(b.kind, n), Math.min(1, p), b.color, 5);

      ctx.textAlign = 'center';
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillStyle = '#141221';
      ctx.fillText(b.title, W / 2 + 2, H * 0.22 + 2);
      ctx.fillStyle = '#ffd94a';
      ctx.fillText(b.title, W / 2, H * 0.22);
      if (t > 0.35) {
        ctx.globalAlpha = Math.min(1, (t - 0.35) * 4);
        wrapText(b.line, W / 2, H * 0.80, W - 90, 22, '#cfc6e8', '14px sans-serif');
        ctx.globalAlpha = 1;
      }
      if (t >= 1) endSkip();
      return;
    }

    if (a.stage === 'pullback' || a.stage === 'credits') {
      const inCredits = a.stage === 'credits';
      const t = inCredits ? 1 : Math.min(1, (now - a.beatStart) / PULLBACK_MS);
      // parchment
      ctx.fillStyle = '#e8dcbf';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#dbcda8';
      for (let i = 0; i < 60; i++) {
        const x = seeded(i * 7) * W, y = seeded(i * 11) * H;
        ctx.fillRect(x, y, 2 + seeded(i * 13) * 3, 2);
      }

      // the golden-rectangle tiling, drawn in visit order as the camera rises
      const zoom = 0.4 + 0.6 * ease(Math.min(1, t / 0.55));
      const unit = Math.min((W - 70) / 13, (H - 110) / 8) * zoom;
      const cx = W / 2 - FIB_CENTER.x * unit, cy = H / 2 + 16 - FIB_CENTER.y * unit;
      const shown = inCredits ? 6 : Math.max(1, Math.min(6, Math.floor(t / 0.5 * 6) + 1));
      for (let i = 0; i < shown; i++) {
        const q = FIB_SQ[i];
        const x = cx + q.x * unit, y = cy + q.y * unit, sz = q.s * unit;
        ctx.fillStyle = ['#f5ecd4', '#efe2c0', '#e9d9b1', '#f2e6c6', '#ecdcb7', '#f5ecd4'][i];
        ctx.fillRect(x, y, sz, sz);
        ctx.strokeStyle = '#b09a63';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, sz, sz);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8a7038';
        ctx.font = `${Math.max(8, Math.round(Math.min(20, q.s * unit / 3.4)))}px "Press Start 2P", monospace`;
        const labelY = y + sz / 2 + (q.s >= 3 ? -2 : 5);
        ctx.fillText(String(FIB[i]), x + sz / 2, labelY);
        if (q.s >= 3) {
          ctx.fillStyle = '#a89468';
          ctx.font = '11px sans-serif';
          ctx.fillText(FIB_NAMES[i], x + sz / 2, labelY + 18);
        }
      }
      // the golden spiral itself, arc by arc, sweeping the regions in the
      // order the kid actually walked them
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < shown; i++) {
        const c = FIB_ARC[i];
        ctx.beginPath();
        ctx.arc(cx + c.cx * unit, cy + c.cy * unit, c.r * unit,
          c.a0 * Math.PI / 180, c.a1 * Math.PI / 180);
        ctx.stroke();
      }

      // the MathMaker's line, then the question
      if (!inCredits) {
        if (t > 0.62) {
          ctx.globalAlpha = Math.min(1, (t - 0.62) * 3);
          wrapText('"The kingdom looks different from far away. Patterns usually do — that is the whole trick of ' +
            'mathematics: step back far enough, and the tangle was a shape all along."',
            W / 2, 30, W - 80, 20, '#6b5836', '14px sans-serif');
          ctx.globalAlpha = 1;
        }
        if (t >= 1 && !a.asked && !UI.modalOpen()) askTheSpiral();
        return;
      }

      // ---- credits: they flower out of the spiral ----
      const ct = (now - a.beatStart) / 1000;
      // The next square — 21 — blooming out past the parchment's edge. It is
      // MEANT to run off the page (the kingdom keeps going), so only a sliver
      // of it is on screen: anchor the labels to that sliver rather than to
      // the square's true centre, which is far above the canvas.
      {
        const q = FIB_NEXT;
        const midX = cx + (q.x + q.s / 2) * unit;
        const baseY = cy + (q.y + q.s) * unit;   // its bottom edge = the map's top edge
        ctx.globalAlpha = calm ? 0.85 : 0.55 + 0.3 * Math.sin(now / 300);
        ctx.strokeStyle = '#c0392b';
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + q.x * unit, cy + q.y * unit, q.s * unit, q.s * unit);
        ctx.setLineDash([]);
        ctx.fillStyle = '#c0392b';
        ctx.font = '15px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('21', midX, baseY - 36);
        ctx.globalAlpha = 1;
        // a wrong answer earns the demonstration: the rule, shown, not told
        if (a.wrongShown) {
          ctx.fillStyle = '#8a5a2c';
          ctx.font = '13px sans-serif';
          ctx.fillText('8 + 13 = 21', midX, baseY - 14);
        }
      }
      // the sequel door: a glimmering '?' just past the parchment's edge
      const qx = W - 34, qy = 30;
      ctx.globalAlpha = calm ? 0.9 : 0.55 + 0.4 * Math.sin(now / 260);
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c0392b';
      ctx.fillText('?', qx, qy);
      ctx.globalAlpha = 1;

      const lines = [
        '👑  THE KINGDOM, UNTANGLED  👑',
        '',
        `${MM.engine.state.name} — the New MathMaker`,
        '',
        'Every problem can be worked out,',
        'one careful step at a time.',
        '',
        // the music: CC attribution belongs where the music was heard —
        // performer names here, full piece-by-piece list in README §Music
        '🎼 The music of Numeria was played by',
        'Robin Alciatore · Kimiko Ishizaka',
        'Laurens Goedhart · Joni Ikäläinen',
        'Thérèse Dussaut',
        'and performers via Musopen',
        'and Wikimedia Commons,',
        'who shared their recordings freely.',
        '',
        'Thank you for tending Numeria.',
      ];
      const top = H - ct * 42;
      ctx.textAlign = 'center';
      lines.forEach((ln, i) => {
        const y = top + i * 30;
        if (y < -20 || y > H + 20) return;
        ctx.font = i === 0 ? '13px "Press Start 2P", monospace' : '15px sans-serif';
        ctx.fillStyle = '#8a7038';
        ctx.fillText(ln, W / 2 + 1, y + 1);
        ctx.fillStyle = i === 0 ? '#c0392b' : '#4a3d22';
        ctx.fillText(ln, W / 2, y);
      });
      if (top + lines.length * 30 < H * 0.35) endFinish();
      return;
    }
  }

  // centred, wrapped, drop-shadowed text — used by the ending's prose beats
  function wrapText(text, cx, y, maxW, lh, color, font) {
    ctx.font = font;
    ctx.textAlign = 'center';
    const words = text.split(' ');
    const rows = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { rows.push(line); line = w; }
      else line = test;
    }
    if (line) rows.push(line);
    rows.forEach((r, i) => {
      ctx.fillStyle = color;
      ctx.fillText(r, cx, y + i * lh);
    });
  }

  // ---------- world rendering (continuous, for water/idle animation) ----------
  function worldLoop(now) {
    requestAnimationFrame(worldLoop);
    if (MM.music) MM.music.update();          // pick the moment's track (cheap)
    if (MM.battle.active()) return;           // battle has its own loop
    if (endAnim) { drawEnding(now); return; } // the ending owns the canvas
    if (sailAnim) { drawSail(now); return; }  // mid-voyage
    const s = MM.engine.state;
    if (!s || !s.grid) return;
    // Wave 13: timed entity movement is PULSED from the draw loop, never
    // from its own setInterval — so the headless unit suite can step both
    // deterministically by calling the tick functions directly.
    if (MM.engine.understudyPulse) MM.engine.understudyPulse(now);
    if (MM.engine.pupilPulse) MM.engine.pupilPulse(now);
    drawWorld(s, now);
  }

  // n pips (1-3) in a row across the top of a tile — the gear-gate ID mark.
  function drawPips(vx, vy, n, color) {
    const r = 3, gap = 9;
    const cx = vx * TILE + TILE / 2, cy = vy * TILE + 7;
    for (let i = 0; i < n; i++) {
      const px = cx + (i - (n - 1) / 2) * gap;
      ctx.beginPath();
      ctx.arc(px, cy, r + 1, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2438';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // ---------- Wave 12: the Workshop Wing's field comedy + puzzle overlays ----------
  // The wardrobe's INVERTED mimic tell (v1.7.13 flipped): a big 5px bob only
  // when the player is FAR, dead still when adjacent — pure function so the
  // drive can assert both halves of the tell without screenshot pixel-diffs.
  UI.wardrobeBob = function (dist, now) {
    return dist <= 2 ? 0 : (Math.floor(now / 900) % 2 ? 5 : 0);
  };
  const WING_SLAB_PAL = { F: '#8f819c', f: '#77697f' };   // slab bg matches hall floor
  function drawWingTile(ch, x, y, vx, vy, now, s) {
    const E = MM.engine;
    ctx.drawImage(MM.sprites.get('hallFloor', { scale: 3 }), vx * TILE, vy * TILE);
    if (ch === 'w') {
      const dist = Math.max(Math.abs(x - s.px), Math.abs(y - s.py));
      const bob = s.calmMode ? 0 : UI.wardrobeBob(dist, now);
      ctx.drawImage(MM.sprites.get('wardrobe', { scale: 3 }), vx * TILE, vy * TILE + bob);
      if (s.calmMode) { // static tell: the doors sit ever so slightly ajar
        ctx.fillStyle = '#2a1626';
        ctx.fillRect(vx * TILE + 21, vy * TILE + 9, 6, 3);
      }
      if (E._wardrobeSweatUntil && Date.now() < E._wardrobeSweatUntil) {
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧', vx * TILE + TILE - 8, vy * TILE + 8);
      }
      return;
    }
    // a Numberling (or plain) slab: lean/slump/desaturate are COSMETIC ONLY
    // (standing rule: the 9's aversion to the 7 is a 1px lean + occasional
    // 💧 — never movement or blocking logic).
    const slab = E.wingSlabAt && E.wingSlabAt(x, y);
    const w = s.wing;
    let lx = 0, ly = 0, pal = WING_SLAB_PAL;
    let sevenAdjacent = false;
    if (slab && w && w.slabs) {
      if (slab.num === 9) {
        const seven = w.slabs.find(o => o.num === 7 && Math.abs(o.x - x) + Math.abs(o.y - y) === 1);
        if (seven) { sevenAdjacent = true; lx = Math.sign(x - seven.x) || 1; }
      }
      if (slab.asleep) ly = 1;                                   // a 1px snoozing slump
      // a slab in a FALSE socket (both filled, product wrong) slumps and
      // desaturates one notch — it is embarrassed, not obstructive
      if (slab.under === '0' && !slab.locked) {
        const [sa, sb] = MM.maps.WING_WREN.sockets;
        const a = E.wingSlabAt(sa.x, sa.y), b = E.wingSlabAt(sb.x, sb.y);
        if (a && b && !E.wingEquationOk(a.num, b.num)) {
          ly = 1;
          pal = MM.sprites.softPalette('slab', WING_SLAB_PAL, 0.3);
        }
      }
    }
    ctx.drawImage(MM.sprites.get('slab', { palette: pal, scale: 3 }), vx * TILE + lx, vy * TILE + ly);
    if (slab && slab.num != null) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#141221';
      ctx.fillText(String(slab.num), vx * TILE + TILE / 2 + 1 + lx, vy * TILE + TILE / 2 + 5 + ly);
      ctx.fillStyle = '#fff6d8';
      ctx.fillText(String(slab.num), vx * TILE + TILE / 2 + lx, vy * TILE + TILE / 2 + 4 + ly);
    }
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    if (slab && slab.asleep) ctx.fillText('💤', vx * TILE + TILE - 8, vy * TILE + 6);
    if (sevenAdjacent && !s.calmMode && now % 6000 < 1500) ctx.fillText('💧', vx * TILE + 8 * (lx > 0 ? 1 : 1), vy * TILE + 6);
    const pop = E._slabPop;
    if (pop && pop.x === x && pop.y === y && Date.now() < pop.until && !s.calmMode) {
      ctx.fillText(pop.ch || '💢', vx * TILE + TILE / 2, vy * TILE - 2);
    }
  }
  function drawWingOverlays(camX, camY, now, s) {
    const E = MM.engine;
    // the lamp beam: tile-to-tile line segments, recomputed per rotation —
    // connection must be TRUE (lamp → mirrors → crystal), so we stroke one
    // polyline through the actual beam path's tile centers.
    const beam = E.wingBeam && E.wingBeam();
    if (beam && beam.points.length > 1) {
      const cx = p => (p.x - camX) * TILE + TILE / 2;
      const cy = p => (p.y - camY) * TILE + TILE / 2;
      for (const [width, color, alpha] of [[9, '#ffd94a', 0.16], [3, beam.lit ? '#fff6d8' : '#ffd94a', 0.75]]) {
        ctx.beginPath();
        ctx.moveTo(cx(beam.points[0]), cy(beam.points[0]));
        for (const p of beam.points.slice(1)) ctx.lineTo(cx(p), cy(p));
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 1;
    }
    // the Numberlings' carved equation shape: ▢ × ▢ = 24 on the floor
    {
      const wren = MM.maps.WING_WREN;
      const [sa, sb] = wren.sockets;
      const midX = ((sa.x + sb.x) / 2 - camX) * TILE + TILE / 2;
      const rowY = (sa.y - camY) * TILE + TILE / 2 + 5;
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4a4458';
      ctx.fillText(wren.op, midX, rowY);
      ctx.textAlign = 'left';
      ctx.fillText(`= ${wren.target}`, (sb.x + 1 - camX) * TILE + 6, rowY);
      ctx.textAlign = 'center';
    }
    // cat statues wear a small facing pip (gold triangle) — state readable
    // from the sprite alone, the gear-gate rule
    MM.maps.WING_CATS.statues.forEach((c, i) => {
      const f = E.wingCatFacing(i);
      const bx = (c.x - camX) * TILE, by = (c.y - camY) * TILE;
      const cxm = bx + TILE / 2, cym = by + TILE / 2;
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      if (f === 0) { ctx.moveTo(cxm, by + 2); ctx.lineTo(cxm - 5, by + 9); ctx.lineTo(cxm + 5, by + 9); }
      else if (f === 1) { ctx.moveTo(bx + TILE - 2, cym); ctx.lineTo(bx + TILE - 9, cym - 5); ctx.lineTo(bx + TILE - 9, cym + 5); }
      else if (f === 2) { ctx.moveTo(cxm, by + TILE - 2); ctx.lineTo(cxm - 5, by + TILE - 9); ctx.lineTo(cxm + 5, by + TILE - 9); }
      else { ctx.moveTo(bx + 2, cym); ctx.lineTo(bx + 9, cym - 5); ctx.lineTo(bx + 9, cym + 5); }
      ctx.closePath();
      ctx.fill();
    });
  }

  // ---------- Wave 22 (Looking Glass P3): the Tweedle room ----------
  // A signed slab: a cool-tinted stone carrying +n or −n (the minus is the
  // displayed U+2212, drawn clearly — never a stray dash). A locked slab (seated
  // in a socket) gets a soft blue glow ring so the cancelled pair reads as done.
  const TWEEDLE_SLAB_PAL = { F: '#6f7f9c', f: '#59697f' };   // cool mirror-slab
  function slabSignLabel(n) { return n < 0 ? '−' + (-n) : '+' + n; }
  function drawTweedleTile(x, y, vx, vy, s) {
    const E = MM.engine;
    ctx.drawImage(MM.sprites.get('hallFloor', { scale: 3 }), vx * TILE, vy * TILE);
    const slab = E.tweedleSlabAt && E.tweedleSlabAt(x, y);
    ctx.drawImage(MM.sprites.get('slab', { palette: TWEEDLE_SLAB_PAL, scale: 3 }), vx * TILE, vy * TILE);
    if (slab && slab.locked) {
      ctx.save();
      ctx.strokeStyle = '#8fd0ff';
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.strokeRect(vx * TILE + 3, vy * TILE + 3, TILE - 6, TILE - 6);
      ctx.restore();
    }
    if (slab && slab.num != null) {
      const label = slabSignLabel(slab.num);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#141221';
      ctx.fillText(label, vx * TILE + TILE / 2 + 1, vy * TILE + TILE / 2 + 5);
      ctx.fillStyle = '#eaf3ff';
      ctx.fillText(label, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 4);
    }
  }
  function drawTweedleOverlays(camX, camY, s) {
    // the carved equation on the floor: ▢ + ▢ = 0, drawn between the sockets
    const room = MM.maps.TWEEDLE_ROOM;
    const [sa, sb] = room.sockets;
    const midX = ((sa.x + sb.x) / 2 - camX) * TILE + TILE / 2;
    const rowY = (sa.y - camY) * TILE + TILE / 2 + 5;
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a6478';
    ctx.fillText('+', midX, rowY);
    ctx.textAlign = 'left';
    ctx.fillText('= 0', (sb.x + 1 - camX) * TILE + 6, rowY);
    ctx.textAlign = 'center';
  }

  // ---------- Wave 24 (Looking Glass P4.1): the completed spiral ----------
  // Drawn ONLY in the Vantage room, ONLY once s.vantage.revealed is true (the
  // bump-the-plaque "arm" moment) — a full-canvas overlay, fit to whatever
  // room size is on screen (the room is fixed at VIEW_W×VIEW_H so this is a
  // static, camera-free transform). PURE geometry (MM.data
  // .completedSpiralGeometry) — nothing here rolls a die. Called AFTER the
  // mirror-tint wash (like the zero-meridian glow) so the kingdom-vs-
  // reflection colour contrast isn't flattened by it — the whole point of
  // this image is telling the two halves apart. A "never-colour-alone"
  // distinction too: the reflection is DASHED, the kingdom solid, so the
  // two halves read even if a screen/eye can't tell gold from blue apart.
  function drawCompletedSpiral() {
    const geom = MM.data.completedSpiralGeometry();
    const { chain, mirrorChain, stones, mirrorStones, bbox } = geom;
    const pad = 40;
    const availW = canvas.width - pad * 2, availH = canvas.height - pad * 2;
    const bw = Math.max(0.001, bbox.maxX - bbox.minX), bh = Math.max(0.001, bbox.maxY - bbox.minY);
    const scale = Math.min(availW / bw, availH / bh);
    const offX = pad + (availW - bw * scale) / 2 - bbox.minX * scale;
    const offY = pad + (availH - bh * scale) / 2 - bbox.minY * scale;
    const px = x => x * scale + offX, py = y => y * scale + offY;
    function stroke(pts, color, width, alpha, dash) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((p, i) => { const X = px(p.x), Y = py(p.y); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
      ctx.stroke();
      ctx.restore();
    }
    // soft glow, then the bright curve — the kingdom (warm gold, SOLID) and
    // its reflection (cool cyan, DASHED), the SAME shape, turning opposite ways.
    stroke(chain, '#ffcb3d', 11, 0.20);
    stroke(mirrorChain, '#4ad8ff', 11, 0.20);
    stroke(chain, '#ffe9a8', 3.4, 1);
    stroke(mirrorChain, '#bdf3ff', 3.2, 1, [7, 6]);
    function drawStones(list, fill, strokeCol) {
      list.forEach(st => {
        const X = px(st.fx), Y = py(st.fy);
        const r = 4 + st.size * 0.42;
        ctx.fillStyle = fill;
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(X, Y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
    drawStones(stones, '#fff6d8', '#8a7a2a');
    drawStones(mirrorStones, '#dbf8ff', '#1f8fae');
    // the shared center stone (stone 0, on the mirror line itself) gets one
    // more ring, so the join reads clearly as ONE figure, not two abutting ones.
    const c = geom.center;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(c.x), py(c.y), 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // The Vantage room's Carroll-cast emoji glyphs — bumpable tiles, never
  // grid-baked sprites (the same idiom as the Menagerie/Faculty overlays).
  function drawVantageOverlays(camX, camY, now, s) {
    const grid = s.grid;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const glyph = MM.maps.VANTAGE_GLYPHS[grid[y][x]];
        if (!glyph) continue;
        const bob = Math.sin(now / 450 + x * 3) * 1.5;
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(glyph, (x - camX) * TILE + TILE / 2, (y - camY) * TILE + TILE / 2 + 9 + bob);
      }
    }
  }

  function drawWorld(s, now) {
    const grid = s.grid;
    const H = grid.length, W = grid[0].length;
    // Wave 6.5: the islands are OVERWORLDS — this single line once made
    // Horologe/Chime/Gullwrack render as dungeons (grey ground, hidden
    // entrance digits, and no NPC pass): the empty-island bug, thrice.
    const inDungeon = !MM.maps.isOverworld(s.mapId);
    const waterFrame = Math.floor(now / 600) % 2;
    // Wave 11: the Grand Descent — every dungeon's THEMES entry now tints
    // its own wall/floor sprites (P1), and the boss's room gets a static
    // vignette (P4). Both are pure functions of dungeonIndex/floorIndex, so
    // they're computed once per frame here rather than per tile.
    const descentTheme = inDungeon ? MM.data.THEMES[(s.dungeonIndex || 1) - 1] : null;
    const descentIdx = inDungeon ? s.dungeonIndex : null;
    const descentFloor = s.floorIndex || 0;

    let camX = Math.max(0, Math.min(W - VIEW_W, s.px - Math.floor(VIEW_W / 2)));
    let camY = Math.max(0, Math.min(H - VIEW_H, s.py - Math.floor(VIEW_H / 2)));
    if (W <= VIEW_W) camX = 0;
    if (H <= VIEW_H) camY = 0;
    UI._cam = { x: camX, y: camY }; // Pass D: tap-to-move maps clicks through this

    ctx.fillStyle = '#141221';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let vy = 0; vy < VIEW_H; vy++) {
      for (let vx = 0; vx < VIEW_W; vx++) {
        const x = camX + vx, y = camY + vy;
        if (y >= H || x >= W) continue;
        const ch = grid[y][x];
        const sprName = MM.maps.tileSprite(ch, x, y, s.mapId, waterFrame);
        // Wave 11 (P1): recolor wall/floor toward this dungeon's THEME —
        // the same monster-`pal` swap mechanism, just a different palette
        // source (S.themePalette derives it from THEMES instead of a
        // hand-authored roster entry).
        const sprOpts = { scale: 3 };
        if (descentTheme && DESCENT_TINT_SPRITES[sprName]) {
          sprOpts.palette = MM.sprites.themePalette(sprName, descentTheme);
        }
        const spr = MM.sprites.get(sprName, sprOpts);
        // Playtest round 4: a mimic chest BREATHES — a slow bob (the
        // telegraph rule: a surprise you could have spotted, never a gotcha).
        // Live playtest (v1.7.13): the constant bob broadcast the secret
        // across the whole room, so the tell is distance-gated — steady
        // breathing only within 2 tiles (arriving exactly when the kid is
        // deciding whether to open it), a single furtive shudder every few
        // seconds beyond that, so a sharp eye can still catch one across
        // the room and feel clever. The pet's adjacent sniff is unchanged.
        // Calm Mode swaps motion for a static tell: a dark grin at the seam.
        const isMimic = ch === '*' && MM.engine._mimics && MM.engine._mimics.has(`${x},${y}`);
        // Wave 12: the Wing's wardrobe + Numberling slabs draw with their
        // own offsets/overlays (bob, lean, slump, numeral) — handled here
        // instead of the default draw, exactly like the mimic's breathing.
        const wingSpecial = s.mapId === 'wing' && (ch === 'w' || ch === 'U');
        const tweedleSpecial = s.mapId === 'tweedle' && ch === 'U';
        if (wingSpecial) {
          drawWingTile(ch, x, y, vx, vy, now, s);
        } else if (tweedleSpecial) {
          drawTweedleTile(x, y, vx, vy, s);
        } else if (isMimic && !s.calmMode) {
          const near = Math.abs(x - s.px) <= 2 && Math.abs(y - s.py) <= 2;
          const bob = near ? (Math.floor(performance.now() / 550) % 2 ? 3 : 0)
                           : (performance.now() % 4200 < 140 ? 2 : 0);
          ctx.drawImage(spr, vx * TILE, vy * TILE + bob);
        } else {
          ctx.drawImage(spr, vx * TILE, vy * TILE);
          if (isMimic) { // calm mode: the lid sits ajar, ever so slightly
            ctx.fillStyle = '#2a1626';
            ctx.fillRect(vx * TILE + 12, vy * TILE + 19, TILE - 24, 2);
          }
        }
        // Wave 11 (P4): boss-room dignity — a static tint, no motion, no new
        // sprite; deepens the floor toward the theme's sky1 within 3 tiles
        // of the boss's SPAWN marker (not its current, possibly-chasing
        // position — see MM.maps.bossSpawnPos).
        if (descentIdx && ch !== '#') {
          const vAlpha = MM.maps.bossVignetteAlpha(descentIdx, descentFloor, x, y);
          if (vAlpha > 0) {
            ctx.globalAlpha = vAlpha;
            ctx.fillStyle = descentTheme.sky1;
            ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
            ctx.globalAlpha = 1;
          }
        }
        // Wave 11 (P3): deterministic decor overlays — one motif per
        // mainland dungeon, hash-placed, only ever on plain open floor
        // ('.'), so it can never sit on a POI cell. Drawn like the
        // hatted-slime/thief-coin emoji overlays elsewhere in this loop:
        // sans-serif font (the pixel font has no emoji glyphs).
        if (descentIdx) {
          const motif = MM.maps.decorMotif(descentIdx, x, y, ch);
          if (motif) {
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.globalAlpha = descentIdx === 10 ? 0.45 : 0.85; // d10: FADED royal banners
            ctx.fillText(motif, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 5);
            ctx.globalAlpha = 1;
          }
        }
        // (the Tweedle room's '0' tiles are equation SOCKETS, not dungeon
        // entrances — they must never wear a "10" entrance numeral)
        if (!inDungeon && s.mapId !== 'tweedle' && '1234567890'.includes(ch)) {
          const label = ch === '0' ? '10' : ch;
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#141221';
          ctx.fillText(label, vx * TILE + TILE / 2 + 1, vy * TILE + 12);
          ctx.fillStyle = '#ffd94a';
          ctx.fillText(label, vx * TILE + TILE / 2, vy * TILE + 11);
        }
        // Wave 12 (P4): the stepping stones carry their numerals — same
        // recipe as the dungeon-entrance numbers, one size smaller.
        if (s.mapId === 'world' && ch === 'd') {
          const st = MM.maps.SKIP_STONES.find(t => t.x === x && t.y === y);
          if (st) {
            ctx.font = '9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#141221';
            ctx.fillText(st.label, vx * TILE + TILE / 2 + 1, vy * TILE + TILE / 2 + 5);
            ctx.fillStyle = '#fff6d8';
            ctx.fillText(st.label, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 4);
          }
        }
        // Wave 23 (P3.5): the number-line stones carry their SIGNED numerals —
        // the same numeral-on-tile recipe as the stepping stones, drawn on a
        // 'stepStone' sprite. Zero is marked apart (a bright ring + a plain 0);
        // negatives read cool, positives warm; the minus is U+2212, never a
        // stray dash (the numeral-hazard watch that bit Waves 13/14/15/22).
        if (s.mapId === 'numberline' && ch === 'n') {
          const st = MM.maps.NUMBERLINE_ROW.find(t => t.x === x && t.y === y);
          if (st) {
            if (st.value === 0) {
              ctx.save();
              ctx.strokeStyle = '#fff6d8';
              ctx.globalAlpha = 0.85;
              ctx.lineWidth = 2;
              ctx.strokeRect(vx * TILE + 3, vy * TILE + 3, TILE - 6, TILE - 6);
              ctx.restore();
            }
            const label = MM.data.signedNum(st.value);
            ctx.font = '9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#141221';
            ctx.fillText(label, vx * TILE + TILE / 2 + 1, vy * TILE + TILE / 2 + 5);
            ctx.fillStyle = st.value === 0 ? '#fff6d8' : (st.value < 0 ? '#9fd4ff' : '#ffe1a8');
            ctx.fillText(label, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 4);
          }
        }
        // Wave 12 (P3): the confessed wardrobe wears its tiny hat in the
        // Study — non-negotiable, same emoji-overlay idiom as the pet's.
        if (s.mapId === 'castle' && ch === 'o' && s.wing && s.wing.wardrobeMoved) {
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎩', vx * TILE + TILE / 2 + 4, vy * TILE + 6);
        }
        // Wave 12 (P2): the just-lifted plate-gates glint (the gear-gate
        // recipe) so the kid sees WHICH distant thing the plate changed.
        if (ch === '&' && MM.maps.plateOpenNow(s.mapId)
            && MM.engine.gateGlinting && MM.engine.gateGlinting()) {
          ctx.globalAlpha = 0.30 + 0.25 * Math.sin(now / 120);
          ctx.fillStyle = '#ffd94a';
          ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
          ctx.globalAlpha = 1;
        }
        // Wave 13 screenshot audit: 'B' is Your Own Room's workbench — the
        // expansion-entrance labels belong to the MAINLAND map only (this
        // pass used to hole-punch a "12" over the workbench).
        const expLabel = s.mapId === 'world' && { A: '11', B: '12', K: '13' }[ch];
        if (expLabel) {
          ctx.drawImage(MM.sprites.get('hole', { scale: 3 }), vx * TILE, vy * TILE);
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#141221';
          ctx.fillText(expLabel, vx * TILE + TILE / 2 + 1, vy * TILE + 12);
          ctx.fillStyle = '#7ee0e8';
          ctx.fillText(expLabel, vx * TILE + TILE / 2, vy * TILE + 11);
        }
        // Turning Stones (P1), v1.7.0 spiral-walk rework — a canvas overlay
        // on fixed, ordinary grass tiles, never new grid glyphs (the
        // courtyard's tile audit has nothing to classify). Alignment count
        // is s.tasksDone.length, read live — zero new persisted state. An
        // ALIGNED stone's carving connects its path neighbors (straight run
        // or corner turn, per stone.shape/stone.angle — the walk's own
        // geometry); an UNALIGNED stone keeps the old deterministic skew —
        // flavor only, a pure function of its own index, never of time or a
        // frame counter, so there is nothing for Calm Mode to turn off.
        // (Turning Stones moved out of the tile loop — the curl is ONE
        // continuous stroke across tiles now; see drawTurningStones below.)
        // v1.7.0: the Spiral Stair's entrance glints once, the first time
        // the in-order courtyard walk is completed after the ending — same
        // recipe, a distant change told by a shimmer, not a popup.
        if (!inDungeon && s.mapId === 'world' && ch === 'H' && MM.engine.stairGlinting && MM.engine.stairGlinting()) {
          ctx.globalAlpha = 0.30 + 0.25 * Math.sin(now / 120);
          ctx.fillStyle = '#ffd94a';
          ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
          ctx.globalAlpha = 1;
        }
        // Wave 7 (gear-plate readability): pips say WHICH gate. A gate wears
        // its own • / •• / ••• ; the plate wears the pips of whichever gate is
        // currently open, so plate state is readable BEFORE you step on it.
        // Painted here rather than baked into sprites so one sprite pair
        // serves all three gates (and the plate doesn't need three variants).
        if (inDungeon && (ch === 'A' || ch === 'B' || ch === 'C' || ch === 'R')) {
          const letter = ch === 'R' ? MM.engine.openGateLetter(s.mapId) : ch;
          const open = ch === 'R' || MM.engine.gateIsOpen(ch, s.mapId);
          drawPips(vx, vy, MM.engine.GATE_PIPS[letter].length, open ? '#ffd94a' : '#8a7a3a');
          // the gate that just opened glints, so the change is visible even
          // when it happened across the room (copy of the Scout shimmer)
          if (ch !== 'R' && open && MM.engine.gateGlinting && MM.engine.gateGlinting()) {
            ctx.globalAlpha = 0.30 + 0.25 * Math.sin(now / 120);
            ctx.fillStyle = '#ffd94a';
            ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
            ctx.globalAlpha = 1;
          }
        }
        const npc = !inDungeon && MM.data.NPCS[ch];
        if (npc) {
          const nbob = Math.sin(now / 450 + x * 3) * 1.5;
          ctx.drawImage(MM.sprites.get(npc.sprite, { palette: npc.pal || {}, scale: 3 }), vx * TILE, vy * TILE + nbob);
        }
        // Wave 9 (P1): a Daily Tangle standing on the mainland — drawn as an
        // overlay (they move day to day, never baked into the grid glyph).
        if (s.mapId === 'world' && s.tangles) {
          const t = s.tangles.items.find(it => !it.done && it.x === x && it.y === y);
          if (t) {
            const tbob = Math.sin(now / 300 + x * 2) * 2;
            ctx.drawImage(MM.sprites.get('tangle', { scale: 3 }), vx * TILE, vy * TILE + tbob);
          }
        }
        // Wave 14: the Faculty — reformed monsters who took up court posts,
        // drawn as live overlays on plain throne-room floor (never grid
        // glyphs), each wearing its post's insignia badge (field channel).
        if (s.mapId === 'castle' && s.faculty && s.faculty.length) {
          const post = MM.data.FACULTY_POSTS.find(p => s.faculty.includes(p.id) && p.x === x && p.y === y);
          if (post) {
            const fbob = Math.sin(now / 450 + x * 3) * 1.5;
            ctx.drawImage(MM.sprites.get(post.sprite, { palette: post.pal || {}, scale: 3 }), vx * TILE, vy * TILE + fbob);
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(post.badge, vx * TILE + TILE / 2 + 5, vy * TILE + 8 + fbob);
          }
        }
        // Wave 17: the Menagerie's befriended residents — drawn as live overlays
        // on their pen slots (never grid glyphs; the roster is s.bestiary
        // .befriended). Each carries the constant friend 🖤 heart (befriended
        // state, per the never-colour-alone rule), a becalmed slow sway, a
        // stage-based size bump (growth reads at a glance), and its tiny hat.
        if (s.mapId === 'menagerie' && MM.engine.menagerieCreatureAt) {
          const cr = MM.engine.menagerieCreatureAt(x, y);
          if (cr) {
            const cbob = Math.sin(now / 900 + x * 2 + y) * 1.2;   // slow, easy — a soothed thing
            const scale = (cr.pet.stage >= 2) ? 3 : 2;            // grows as it settles in
            const spr = MM.sprites.get(cr.sprite, { palette: cr.pal || {}, scale });
            const ox = vx * TILE + (TILE - spr.width) / 2, oy = vy * TILE + (TILE - spr.height) + cbob;
            ctx.drawImage(spr, ox, oy);
            const heart = MM.sprites.get('heart', { scale: 2 });
            ctx.drawImage(heart, vx * TILE + TILE / 2 - heart.width / 2, oy - 10);
            if (cr.pet.hat) {
              const hat = MM.data.petHatById(cr.pet.hat);
              if (hat) {
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(hat.emoji, vx * TILE + TILE / 2, oy - 1);
              }
            }
          }
        }
      }
    }

    drawTurningStones(camX, camY, now);
    if (s.mapId === 'wing') drawWingOverlays(camX, camY, now, s);
    if (s.mapId === 'tweedle') drawTweedleOverlays(camX, camY, s);
    if (s.mapId === 'vantage') drawVantageOverlays(camX, camY, now, s);

    // Scout: secret walls on this floor shimmer for 10s
    if (MM.engine.scoutActive && MM.engine.scoutActive()) {
      const pulse = 0.35 + 0.25 * Math.sin(now / 180);
      for (let vy = 0; vy < VIEW_H; vy++) {
        for (let vx = 0; vx < VIEW_W; vx++) {
          const x = camX + vx, y = camY + vy;
          if (y >= H || x >= W) continue;
          if (grid[y][x] !== '%') continue;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ffd94a';
          ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
          ctx.globalAlpha = 1;
          ctx.font = '16px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('✨', vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 6);
        }
      }
    }

    // monsters (pixel sprites, bobbing)
    const cheering = MM.engine.friendCheerActive && MM.engine.friendCheerActive();
    for (const m of (s.monsters || [])) {
      if (m.hp <= 0) continue;
      const vx = m.x - camX, vy = m.y - camY;
      if (vx < 0 || vy < 0 || vx >= VIEW_W || vy >= VIEW_H) continue;
      // ---------- Wave 8b: reading a whole floor in one glance ----------
      // A befriended monster is marked THREE redundant ways, per the
      // never-colour-alone rule: (a) a softened palette, (b) a CONSTANT 🕊 pip
      // above it, and (c) a slower, becalmed sway. Any one of the three is
      // enough — so it survives colour-blindness, and it reads from the doorway.
      // Per-creature taming (2026-07-13): the heart, soft palette, and calm
      // sway belong ONLY to a monster the kid personally soothed — its wild
      // species-mates look wild, because they are.
      const friend = !!m.becalmed;
      const bob = friend
        ? Math.sin(now / 900 + m.x * 2 + m.y) * 1.2          // (c) slow, easy sway
        : Math.sin(now / 400 + m.x * 2 + m.y) * 2;
      // when the boss goes down, every living friend in the room bounces
      const hop = (cheering && friend) ? -Math.abs(Math.sin(now / 140 + m.x)) * 9 : 0;
      // Playtest 2026-07-13: the heart does the work — the washed-out calmed
      // palette read as "something's wrong with its colors," not as calm.
      // Becalmed friends keep their TRUE colors + the heart + the slow sway.
      const spr = MM.sprites.get(m.sprite, { palette: m.pal || {}, scale: 3 });
      ctx.drawImage(spr, vx * TILE, vy * TILE + bob + hop);
      // ~3 sparkles a second, not one per FRAME — at 60fps the unthrottled
      // stream stacked into a solid rising column that read as the friends
      // being ON FIRE (playtest 2026-07-13). The hop carries the joy; the
      // sparkle is a garnish.
      if (cheering && friend && !s.calmMode && Math.random() < 0.05) worldSparkle(m.x, m.y - 0.6);
      if (m.boss) {
        const crown = MM.sprites.get('crown', { scale: 2 });
        ctx.drawImage(crown, vx * TILE + TILE / 2 - crown.width / 2, vy * TILE + bob - 8);
      }
      // Wave 10 (P4c, rare-surprise pool): the hatted-slimes moment — an
      // emoji overlay, not new pixel art, same idiom as the thief's 🪙 and
      // the guard's 💤. Uses the monster's ordinary bob; no new motion.
      if (m.hattedPair) {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎩', vx * TILE + TILE / 2, vy * TILE + bob - 6);
      }
      // (b) the constant friend mark — ONE crisp pixel heart, centered above
      // the head (playtest round 5: the emoji dove was unrecognizable mush,
      // and dove + topic icon side by side was clutter; a friend carries the
      // heart INSTEAD of a topic pip — it isn't a target anymore).
      // Deliberately NOT inside the Calm Mode block below: this is STATE,
      // not decoration, and it must never be switched off.
      if (friend) {
        const heart = MM.sprites.get('heart', { scale: 2 });
        ctx.drawImage(heart, vx * TILE + TILE / 2 - heart.width / 2, vy * TILE + bob + hop - 10);
      }
      // Wave 8a (P2, monster telegraphs): a small topic icon over its head —
      // agency for the kid who wants to pick her fights, a target list for
      // the kid hunting a specific topic's brave-problem bonus. Emoji glyphs
      // ignore fillStyle (no drop-shadow trick), so a small dark disc behind
      // it does the contrast work instead — same idea as the gear-gate pips.
      // Friends carry the heart INSTEAD of a topic pip — one mark, no clutter
      // (round 5: two hovering symbols read as noise, not information).
      const topicIcon = !friend && MM.engine.monsterTopicIcon && MM.engine.monsterTopicIcon(m);
      if (topicIcon) {
        const ix = vx * TILE + TILE / 2, iy = vy * TILE + bob + hop - 2;
        ctx.beginPath();
        ctx.arc(ix, iy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#141221';
        ctx.fill();
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topicIcon, ix, iy + 1);
        ctx.textBaseline = 'alphabetic';
      }
      // Wave 8a (P8, delight catalog): monster idle life — a snoozing guard
      // (until the kid gets close) and a thief admiring its haul. Ambient
      // motion, so it's off entirely under Calm Mode, same as torch flicker
      // and footstep puffs.
      if (!s.calmMode) {
        const distToHero = Math.abs(m.x - s.px) + Math.abs(m.y - s.py);
        if (m.behavior === 'guard' && distToHero > 2 && Math.sin(now / 900 + m.x * 5) > 0.85) {
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💤', vx * TILE + TILE - 6, vy * TILE + bob - 6);
        } else if (m.behavior === 'thief' && m.stolen == null && Math.sin(now / 550 + m.x * 3) > 0.9) {
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪙', vx * TILE + 6, vy * TILE + bob - 6);
        }
      }
    }

    // Wave 8b: a boss that was SOOTHED does not simply vanish. It lingers a beat
    // in its calmed colours, bouncing along with the friends it used to guard,
    // and only then wanders off. Hostiles in the room stay exactly as they were.
    const cheer = MM.engine.friendCheer;
    if (cheering && cheer && cheer.boss) {
      const b = cheer.boss;
      const bvx = b.x - camX, bvy = b.y - camY;
      if (bvx >= 0 && bvy >= 0 && bvx < VIEW_W && bvy < VIEW_H) {
        const left = Math.max(0, cheer.until - Date.now()) / 2200;
        const bspr = MM.sprites.get(b.sprite, {
          palette: MM.sprites.softPalette(b.sprite, b.pal || {}, 0.5), scale: 3,
        });
        const bhop = -Math.abs(Math.sin(now / 160)) * 8;
        ctx.globalAlpha = Math.min(1, left * 1.6);
        ctx.drawImage(bspr, bvx * TILE, bvy * TILE + bhop);
        ctx.globalAlpha = 1;
      }
    }

    // ---------- Wave 13 entities: the Understudy, the pupil, the staircase ----------
    // Drawn like the pet: transient positions, never grid glyphs. Comedy
    // rides the field/glyph channels (🎭 💭 🏠 pops, a happy-bob) — never the log.
    {
      const u = MM.engine.understudy;
      if (u && u.mapId === s.mapId) {
        const uvx = u.x - camX, uvy = u.y - camY;
        if (uvx >= 0 && uvy >= 0 && uvx < VIEW_W && uvy < VIEW_H) {
          // a small continuous happy-bob while it HOLDS a plate; still otherwise
          const holding = !u.active && grid[u.y] && grid[u.y][u.x] === '+';
          const ubob = (holding && !s.calmMode) ? -Math.abs(Math.sin(now / 260)) * 3 : 0;
          ctx.drawImage(MM.sprites.get('understudy', { scale: 3 }), uvx * TILE, uvy * TILE + ubob);
          const upop = MM.engine._understudyPop;
          if (upop && Date.now() < upop.until && !s.calmMode) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎭', uvx * TILE + TILE / 2, uvy * TILE + ubob - 4);
          }
        }
      }
      const pu = MM.engine.pupil;
      if (pu && s.mapId === 'myroom') {
        const pvx = pu.x - camX, pvy = pu.y - camY;
        if (pvx >= 0 && pvy >= 0 && pvx < VIEW_W && pvy < VIEW_H) {
          const joy = pu.state === 'joy' && !s.calmMode ? -Math.abs(Math.sin(now / 140)) * 8 : 0;
          const pbob = s.calmMode ? 0 : Math.sin(now / 500) * 1.5;
          ctx.drawImage(MM.sprites.get('slime', { scale: 3 }), pvx * TILE, pvy * TILE + pbob + joy);
          if (pu.state === 'joy' && !s.calmMode && Math.random() < 0.06) worldSparkle(pu.x, pu.y - 0.6);
          if (pu.thoughtUntil && Date.now() < pu.thoughtUntil) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💭', pvx * TILE + TILE / 2 + 8, pvy * TILE + pbob - 4);
          }
        }
      }
      const sp = MM.engine.staircaseDrawPos && MM.engine.staircaseDrawPos();
      if (sp) {
        const svx = sp.x - camX, svy = sp.y - camY;
        if (svx >= 0 && svy >= 0 && svx < VIEW_W && svy < VIEW_H) {
          // stiff on purpose: no bob. It is a staircase.
          ctx.drawImage(MM.sprites.get('staircase', { scale: 3 }), svx * TILE, svy * TILE);
          const hpop = MM.engine._stairPop;
          if (hpop && Date.now() < hpop.until && !s.calmMode) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏠', svx * TILE + TILE / 2, svy * TILE - 4);
          }
        }
      }
    }

    // hero (walk frames while moving, idle bob otherwise)
    const moving = performance.now() - lastMoveAt < 160;
    // Wave 18: the two walk frames come from the chosen avatar (defaults to
    // the knight for a save with no s.avatar — backward-compat is sacred).
    const avFrames = MM.sprites.avatarFrames(s.avatar);
    const frame = moving && UI.stepCount % 2 ? avFrames[1] : avFrames[0];
    // the pet trails one tile behind (drawn under the hero)
    const pet = s.isles && s.isles.pet;
    const pp = MM.engine.petPos;
    if (pet && pp && !(pp.x === s.px && pp.y === s.py)) {
      const pvx = pp.x - camX, pvy = pp.y - camY;
      if (pvx >= 0 && pvy >= 0 && pvx < VIEW_W && pvy < VIEW_H) {
        const petBob = Math.sin(now / 350) * 2;
        const scale = pet.stage >= 1 ? 3 : 2;
        const spr = MM.sprites.get(MM.data.PETS[pet.species].sprite, { scale });
        ctx.drawImage(spr, pvx * TILE + (TILE - spr.width) / 2, pvy * TILE + (TILE - spr.height) + petBob);
        // Wave 9 (P3): a worn hat — an emoji overlay, not new pixel art per
        // species; drawn everywhere the pet is, including here in-world.
        if (pet.hat) {
          const hat = MM.data.petHatById(pet.hat);
          if (hat) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(hat.emoji, pvx * TILE + TILE / 2, pvy * TILE + (TILE - spr.height) + petBob - 2);
          }
        }
        // Wave 8a (P8, delight catalog): "curls up if the kid stands still
        // 10s" — pure cosmetic, off under Calm Mode like every other idle gag.
        if (!s.calmMode && now - lastMoveAt > 10000) {
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💤', pvx * TILE + TILE / 2, pvy * TILE - 4);
        }
        // Wave 16: the pet reacts to a dish — an emote pops over it (field/glyph
        // channel), briefly, then fades. Off under Calm Mode like the idle gags.
        if (!s.calmMode && MM.engine.petEmote && Date.now() < MM.engine.petEmote.until) {
          const eb = Math.abs(Math.sin(now / 200)) * 4;
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(MM.engine.petEmote.ch, pvx * TILE + TILE / 2, pvy * TILE - 4 - eb);
        }
        if (MM.engine.petAlert) {
          // big, bouncing, impossible to miss
          const jump = Math.abs(Math.sin(now / 200)) * 8;
          ctx.font = '20px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#141221';
          ctx.fillText('❗', pvx * TILE + TILE / 2 + 2, pvy * TILE - 4 - jump + 2);
          ctx.fillStyle = '#ffd94a';
          ctx.fillText('❗', pvx * TILE + TILE / 2, pvy * TILE - 4 - jump);
        }
      }
    }

    const bob = moving ? 0 : Math.sin(now / 500) * 1.5;
    const heroSpr = MM.sprites.get(frame, { scale: 3, mirror: UI.facing < 0, palette: MM.sprites.avatarPalette(s) });
    ctx.drawImage(heroSpr, (s.px - camX) * TILE, (s.py - camY) * TILE + bob);
    // Wave 18: an earned tiny hat sits on ANY form (an emoji overlay, exactly
    // like the pet's hat — a dragon in a mortarboard). Off is simply no hat.
    if (s.heroHat) {
      const hat = MM.data.petHatById(s.heroHat);
      if (hat) {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hat.emoji, (s.px - camX) * TILE + TILE / 2, (s.py - camY) * TILE + bob - 2);
      }
    }
    // v1.20.0: in Your Own Room the carried piece floats over the hero —
    // "you are holding something" must be visible, never just remembered.
    if (s.mapId === 'myroom' && s.wing && s.wing.myRoom && s.wing.myRoom.hand) {
      const carryBob = s.calmMode ? 0 : Math.sin(now / 300) * 2;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(MM.data.MYROOM_PIECES[s.wing.myRoom.hand].emoji,
        (s.px - camX) * TILE + TILE / 2, (s.py - camY) * TILE + bob + carryBob - 16);
    }

    // Wave 21 (Looking Glass P2.2): the Cheshire Cat's disappearing-smile
    // fade — a pure function of elapsed time (MM.engine.cheshireAlphas), so
    // it only ever draws while E.cheshireFx is armed (which itself only ever
    // arms through the glass — see E.armCheshire). Drawn near the hero: the
    // BODY is the cat glyph, fading; the SMILE is a drawn grin (never a
    // glyph/numeral, so it can never be mistaken for one), held at full
    // alpha and fading out LAST.
    const chesh = MM.engine.cheshireAlphas && MM.engine.cheshireAlphas(now);
    if (chesh) {
      const ccx = (s.px - camX) * TILE + TILE / 2, ccy = (s.py - camY) * TILE - 30;
      if (chesh.body > 0.01) {
        ctx.save();
        ctx.globalAlpha = chesh.body;
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐱', ccx, ccy);
        ctx.restore();
      }
      if (chesh.smile > 0.01) {
        // v1.16.0 review touch-up: the disappearing grin is the iconic beat
        // the user asked for, so it reads BOLD — a wide, warm-glowing crescent
        // (was a small pale arc that got lost). Bigger radius, thicker stroke,
        // a soft golden glow, and a brighter inner shine on top.
        ctx.save();
        ctx.globalAlpha = chesh.smile;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ffe08a';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffe680';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ccx, ccy + 5, 16, 0.06 * Math.PI, 0.94 * Math.PI);
        ctx.stroke();
        // a brighter shine on the grin so it truly floats there, last of all
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff8e0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ccx, ccy + 5, 16, 0.14 * Math.PI, 0.86 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    } else if (MM.engine.cheshireFx) {
      MM.engine.cheshireFx = null; // the fade finished — pure cleanup, no re-arm
    }

    // Wave 20 (Looking Glass P1): through the glass, wash the whole scene
    // cool — a world-wide render-layer tint, a pure function of s.ngPlus, so
    // normal play is byte-for-byte unchanged and the mirror always LOOKS like
    // a reflection. Drawn over the finished world (tiles, monsters, hero) so
    // everything reads as reflected; the sidebar/particles keep their colours.
    if (MM.engine.inMirror && MM.engine.inMirror()) {
      ctx.save();
      // (1) shift every hue toward cool blue, keeping brightness (readable)
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = MIRROR_TINT.hueAlpha;
      ctx.fillStyle = MIRROR_TINT.hue;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // (2) deepen it a touch
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 1;
      ctx.fillStyle = MIRROR_TINT.mult;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // (3) a faint glassy sheen
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = MIRROR_TINT.sheenAlpha;
      ctx.fillStyle = MIRROR_TINT.sheen;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Wave 24 (P4.1): the completed spiral — drawn ON TOP of the mirror tint
    // (like the zero-meridian below) so the kingdom/reflection colour
    // contrast survives it. Only in the Vantage room, only once armed.
    if (s.mapId === 'vantage' && s.vantage && s.vantage.revealed) drawCompletedSpiral();

    // Wave 23 (P3.5.1): the zero-meridian — drawn ON TOP of the mirror tint so
    // it reads clearly. Through the glass WITH negatives on, a glowing N–S line
    // runs down the mirror overworld's middle column (MM.maps.MERIDIAN_X); WEST
    // of it is "the Below" (a cooler, frostier wash). Pure theming, gated on
    // negativesOn() and the 'world' map — normal play and a switch-off mirror
    // run draw none of it. Geometry is never touched (a render overlay only).
    if (s.mapId === 'world' && MM.engine.negativesOn && MM.engine.negativesOn()) {
      const mx = (MM.maps.MERIDIAN_X - camX) * TILE;
      ctx.save();
      // the Below: a cool frost wash over everything west of the line
      if (mx > 0) {
        // v1.20.0: lightened with the mirror tint — frosty, not gloomy
        ctx.fillStyle = 'rgba(130,180,235,0.18)';
        ctx.fillRect(0, 0, mx, canvas.height);
      }
      // a soft glow band hugging the line, then the bright zero-line itself
      const glow = 0.5 + 0.22 * Math.sin(now / 480);
      const grad = ctx.createLinearGradient(mx - 18, 0, mx + 18, 0);
      grad.addColorStop(0, 'rgba(180,225,255,0)');
      grad.addColorStop(0.5, `rgba(190,230,255,${0.28 * glow})`);
      grad.addColorStop(1, 'rgba(180,225,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(mx - 18, 0, 36, canvas.height);
      ctx.globalAlpha = 0.7 + 0.25 * Math.sin(now / 480);
      ctx.fillStyle = '#eaf7ff';
      ctx.fillRect(mx - 1.5, 0, 3, canvas.height);
      ctx.restore();
    }

    drawWorldParticles(camX, camY);
    UI.renderSidebar();
  }

  UI.refresh = function () { // world redraws continuously; just sync the sidebar
    UI.renderSidebar();
    maybeCelebrateBadge();
  };

  // Badges (and pet stage-ups) earned mid-battle/mid-modal queue up in
  // state.pendingBadges; celebrate them as soon as the screen is clear.
  // Closing the dialog calls refresh again, so several pop one after another.
  function maybeCelebrateBadge() {
    const s = MM.engine.state;
    if (!s || !s.pendingBadges || !s.pendingBadges.length) return;
    if (UI.modalOpen() || MM.battle.active()) return;
    const entry = s.pendingBadges.shift();
    MM.engine.save();
    if (entry.spell) { // Wave 4 carry-over: a spell just unlocked
      const info = MM.data.SPELL_INFO[entry.spell];
      UI.dialog(`${info.emoji} ${info.name} unlocked!`,
        `<div style="text-align:center;font-size:56px">${info.emoji}</div>
         <p style="text-align:center;font-size:16px">You've unlocked <b>${info.name}</b>!</p>
         <p style="text-align:center">${info.howto}</p>
         <p style="text-align:center" class="dim">It only works <b>inside a dungeon</b> — look for it in the spellbook row in your sidebar.</p>`);
      MM.sound.fanfare();
      return;
    }
    if (entry.befriend) { // round 5: the kid's FIRST-EVER friend, once only
      const img = MM.sprites.get(entry.sprite, {
        palette: MM.sprites.softPalette(entry.sprite, entry.pal || {}, 0.45), scale: 6,
      }).toDataURL();
      UI.dialog('🤍 Your first friend!',
        `<div style="text-align:center"><img src="${img}" style="image-rendering:pixelated"></div>
         <p style="text-align:center;font-size:16px">The <b>${entry.befriend}</b> is calm — and it's staying right there,
         wearing a little 🤍 heart.</p>
         <p style="text-align:center" class="dim">A calmed friend never fights — bump it and it steps aside to let you
         through. Each creature is tamed one at a time, and every kind you've calmed gets its 🤍 mark in your
         📕 Monster Book, for good.</p>`);
      MM.sound.fanfare();
      return;
    }
    if (entry.tangleMilestone) { // Wave 9: 10/50/100 days tended
      const ms = MM.data.TANGLE_MILESTONES[entry.tangleMilestone];
      UI.dialog(ms.title, `<p style="text-align:center;font-size:16px">${ms.body}</p>`);
      MM.sound.fanfare();
      return;
    }
    if (entry.pet) { // a pet stage-up
      const pet = s.isles.pet;
      const species = MM.data.PETS[pet.species];
      const stage = MM.data.PET_STAGES[entry.stage];
      const img = MM.sprites.get(species.sprite, { scale: 6 }).toDataURL();
      UI.dialog(`✨ ${pet.name} grew!`,
        `<div style="text-align:center"><img src="${img}" style="image-rendering:pixelated"></div>
         <p style="text-align:center;font-size:16px"><b>${pet.name}</b> the ${species.name} ${species.emoji}<br>
         is now a <b>${stage.name}</b>!</p>
         ${entry.stage >= 2
           ? '<p style="text-align:center">🔍 A Champion\'s nose is sharper — <b>it senses hidden things from even farther away.</b></p>'
           : '<p style="text-align:center" class="dim">Raised on right answers and good snacks.</p>'}`);
      MM.sound.fanfare();
      return;
    }
    const { skill, tier } = entry;
    const b = MM.data.BADGES[tier];
    const next = MM.data.BADGES[tier + 1];
    const m = (s.mastery || {})[skill] || { correct: 0 };
    UI.dialog(`${b.emoji} ${b.name} earned!`,
      `<div style="text-align:center;font-size:56px">${b.emoji}</div>
       <p style="text-align:center;font-size:16px">You earned the <b>${b.name}</b> in<br>
       <b>${MM.data.SKILL_NAMES[skill]}</b>!</p>
       <p style="text-align:center" class="dim">${m.correct} correct answers in this topic so far.</p>
       ${next
         ? `<p style="text-align:center">Next up: ${next.emoji} <b>${next.name}</b> — ${next.req}.</p>`
         : `<p style="text-align:center">🏆 That's the top badge — <b>true mastery</b>. Bard Barnaby will hear about this.</p>`}
       <p style="text-align:center" class="dim">See all your badges on the shelf in your 🎒 bag.</p>`);
    MM.sound.fanfare();
  }

  UI.renderSidebar = function () {
    const s = MM.engine.state;
    if (!s) return;
    // Wave 20 (Looking Glass P1): the persistent "you are through the glass"
    // indicator — always visible while in a mirror run (the sticky-state rule),
    // and it doubles as the mirror-side EXIT (a glass to step back through, so
    // the kid is never trapped and never needs a grown-up to leave).
    const mirrorBanner = document.getElementById('mirrorBanner');
    if (mirrorBanner) {
      const inMirror = MM.engine.inMirror && MM.engine.inMirror();
      mirrorBanner.classList.toggle('hidden', !inMirror);
      if (inMirror) {
        mirrorBanner.innerHTML =
          `🪞 <b>Through the looking glass</b> — a reflection of Numeria (reflection ${s.ngPlus}). ` +
          `Your finished kingdom is safe.<br>` +
          `<button id="mirrorStepBack">↩ Step back through the glass</button>`;
        const back = document.getElementById('mirrorStepBack');
        if (back) back.onclick = () => MM.engine.mirrorExitPrompt();
      } else {
        mirrorBanner.innerHTML = '';
      }
    }
    const hpPct = Math.max(0, Math.round(s.hp / s.maxhp * 100));
    document.getElementById('statHp').innerHTML =
      `<div class="hpbar"><div class="hpfill${hpPct < 35 ? ' low' : ''}" style="width:${hpPct}%"></div></div>❤️ ${s.hp}/${s.maxhp}`;
    const stPct = Math.max(0, Math.round((s.stamina || 0) / (s.maxStamina || 100) * 100));
    document.getElementById('statStamina').innerHTML =
      `<div class="hpbar stamina"><div class="stfill${stPct <= 25 ? ' low' : ''}" style="width:${stPct}%"></div></div>` +
      `🍗 ${s.stamina}/${s.maxStamina}${s.stamina <= 0 ? ' — <b>exhausted!</b> Eat! 🎒' : ''}`;
    document.getElementById('statGold').textContent = `💰 ${s.gold} gold`;
    document.getElementById('statLevel').textContent = `⭐ Level ${s.level}  (${s.xp}/${MM.data.xpForLevel(s.level)} XP)`;
    const range = MM.engine.strikeRange();
    const pieces = ['body', 'helmet', 'boots'].map(sl => MM.engine.equippedItem(sl)).filter(Boolean);
    document.getElementById('statAtk').innerHTML =
      `⚔️ <b>${range.min}–${range.max}</b> dmg per correct answer <span class="dim">(${MM.data.gearLabel('weapon', s.equipped.weapon)})</span>` +
      (s.stamina <= 0 ? ' <b>😫 halved — you\'re exhausted! Eat 🍗</b>' : '');
    document.getElementById('statDef').innerHTML =
      `🛡️ blocks <b>${MM.engine.totalDef()}</b> of every monster hit <span class="dim">(${pieces.map(p => p.emoji).join('') || 'no armor!'})</span>`;
    // counts live ON the buttons (playtest 2026-07-12): the sidebar said
    // "Potions: 1" with no food line; now each supply button carries its own
    // number — the gauge and the lever are the same control.
    document.getElementById('btnPotion').textContent = `🧪 Potion ×${s.potions}`;
    const foodCount = Object.values(s.items.food || {}).reduce((a, b) => a + b, 0);
    document.getElementById('btnFood').textContent = `🍗 Food ×${foodCount}`;
    // Sticky-brave visibility (2026-07-13): brave persists across battles
    // and dungeons — the state must be one glance away OUTSIDE battle too,
    // or a kid meets mysteriously harder problems with no visible cause.
    const braveTag = s.brave ? `⚡ <b>Brave is on</b> <span class="dim">— extra steps, double power</span>` : '';
    const streakTag = s.streak >= 3
      ? `🔥 <b>Streak ${s.streak}!</b> +${s.streak >= 6 ? 4 : 2} dmg${s.streak >= 5 ? ' · crits unlocked!' : ''}`
      : (s.streak > 0 ? `✨ Streak: ${s.streak}` : '');
    document.getElementById('statStreak').innerHTML = [braveTag, streakTag].filter(Boolean).join('<br>');

    renderSpellRow(s);

    const taskEl = document.getElementById('taskBox');
    // v1.20.0: in Your Own Room the task box becomes the builder's hands —
    // the carrying state must be one glance away (the sticky-state rule),
    // and ⬇ Set it down is the room's one new verb, so it lives right here.
    if (s.mapId === 'myroom') {
      const mr = MM.engine.ensureWing().myRoom;
      if (mr.hand) {
        const info = MM.data.MYROOM_PIECES[mr.hand];
        const left = MM.maps.MYROOM_BUDGET[mr.hand] - mr.pieces.filter(p => p.t === mr.hand).length;
        taskEl.innerHTML =
          `🧺 <b>Carrying:</b> ${info.label} <span class="dim">(×${left})</span><br>` +
          `<button id="myroomLay">⬇ Set it down here</button> <span class="dim">or press Space</span>`;
        const lay = document.getElementById('myroomLay');
        if (lay) lay.onclick = () => { lay.blur(); MM.engine.myRoomSetDown(); };
      } else {
        taskEl.innerHTML = '🧱 <b>Your room.</b> The 🛠 workbench lends pieces; the 🔔 cord invites a pupil to try it.';
      }
      document.getElementById('log').innerHTML = messages.map(m => `<div>${m}</div>`).join('');
      checkAlmost(s);
      return;
    }
    if (s.taskIndex === 0) {
      taskEl.innerHTML = '🏰 <b>Visit the castle</b> to meet the MathMaker!';
    } else if (s.taskIndex > 13) {
      // continent-aware: don't point at the pier when they've already sailed
      const L = (s.isles && s.isles.lenses) || {};
      taskEl.innerHTML = L.cinderforge
        ? '🔆❄️🔥 <b>All three lenses shine!</b> The Great Lighthouse 🗼 stirs in its fog...'
        : L.frostbite
        ? '🔥 <b>Light the Cinder Lens!</b> The Cinderforge Depths are open (Isles map: 3, to the east).'
        : L.tidepool
          ? '❄️ <b>Light the Frost Lens!</b> The pass to <b>Frostbite Hollow</b> is open (Isles map: 2, to the northeast).'
          : (s.continent === 'isles')
            ? '🌫 <b>Light the Tide Lens!</b> It waits deep in the <b>Tidepool Grotto</b> (map: 1, west of town). Keeper Callie 🕯 can tell you more.'
            : '⭐ <b>Every task complete!</b> A ship waits at the western pier ⚓ — or spar with Miscount 🧑‍🎓.';
    } else if (s.taskIndex > 10) {
      const t = MM.data.TASKS[s.taskIndex - 1];
      taskEl.innerHTML = `📜 <b>Task ${s.taskIndex}/13:</b> ` + (s.haveItem
        ? `${t.itemEmoji} Return the <b>${t.item}</b> to Miscount 🧑‍🎓!`
        : s.metMiscount
          ? `Find the <b>${t.item}</b> in the <b>${t.dungeon}</b> (east bank, map: ${s.taskIndex})`
          : `👑 Ten tasks done! Cross the 🌉 <b>eastern bridge</b> — Miscount needs your help.`);
    } else {
      const t = MM.data.TASKS[s.taskIndex - 1];
      taskEl.innerHTML = `📜 <b>Task ${s.taskIndex}/10:</b> ` + (s.haveItem
        ? `${t.itemEmoji} Return the <b>${t.item}</b> to the castle! 🏰`
        : `Find the <b>${t.item}</b> in the <b>${t.dungeon}</b> (map: ${s.taskIndex === 10 ? '10' : s.taskIndex})`);
    }

    document.getElementById('log').innerHTML = messages.map(m => `<div>${m}</div>`).join('');
    checkAlmost(s);
  };

  // Wave 8a (DQ, "almost!"): a badge within 3 correct of its next tier gets
  // a small ✨ on the bag button — and ONE log nudge for the whole browser
  // session (not persisted; a fresh page load can nudge again, but reruns of
  // renderSidebar this same session must not spam the log every answer).
  let almostNudgedThisSession = false;
  function checkAlmost(s) {
    const btn = document.getElementById('btnBag');
    if (!btn) return;
    const hits = MM.data.PARENT_TOPICS
      .map(sk => ({ sk, hit: MM.mastery.almostNextTier(s, sk) }))
      .filter(x => x.hit);
    btn.innerHTML = hits.length ? '🎒 Bag <span class="almost-sparkle">✨</span>' : '🎒 Bag';
    if (hits.length && !almostNudgedThisSession) {
      almostNudgedThisSession = true;
      const { sk, hit } = hits[0];
      const tierWord = MM.data.BADGES[hit.tier].name.split(' ')[0].toLowerCase();
      MM.ui.log(`${MM.data.BADGES[hit.tier].emoji} ${MM.data.SKILL_NAMES[sk]} is THIS close to ${tierWord}!`);
    }
  }

  // Spellbook row: appears in the sidebar the moment any spell is unlocked
  // (gold badges). Buttons disable themselves outside a dungeon, out of
  // stamina, or already spent this visit — never hidden, so a kid can see
  // what they're working toward. Each disabled button carries a `title`
  // tooltip explaining exactly why (Wave 4 carry-over — these used to just
  // grey out with no explanation).
  // Wave 7.1: spell buttons are NEVER disabled — a greyed button ignores
  // clicks silently, and kids don't hover tooltips ("I have not been able
  // to make the spells do anything", live playtest). Every click now
  // reaches the engine, which answers in the log with exactly why.
  // The dimmed look + tooltip stay as a visual hint only.
  function renderSpellRow(s) {
    const el = document.getElementById('spellRow');
    if (!el) return;
    const inDungeon = MM.engine.inDungeon();
    const used = MM.engine.spellsUsedThisVisit || {};
    const T = MM.data.SPELL_TOOLTIPS;
    const btn = (id, label, dim, title) => `<button class="mini secondary${dim ? ' spell-dim' : ''}" id="${id}" title="${title}">${label}</button>`;
    const items = [];
    if (MM.engine.spellUnlocked('scout')) {
      const dim = !inDungeon || used.scout;
      items.push(btn('castScout', `🔍 Scout${used.scout ? ' (used)' : ''}`, dim, !inDungeon ? T.outside : used.scout ? T.used : ''));
    }
    if (MM.engine.spellUnlocked('blink')) {
      const dim = !inDungeon || s.stamina < 10;
      items.push(btn('castBlink', '⚡ Blink (10🍗)', dim, !inDungeon ? T.outside : s.stamina < 10 ? T.noStamina : ''));
    }
    if (MM.engine.spellUnlocked('beacon')) {
      const dim = !inDungeon || used.beacon;
      items.push(btn('castBeacon', `🕯 Beacon${used.beacon ? ' (used)' : ''}`, dim, !inDungeon ? T.outside : used.beacon ? T.used : ''));
    }
    if (!items.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="dim" style="margin-bottom:4px">📖 Spellbook</div><div style="display:flex;gap:6px;flex-wrap:wrap">${items.join('')}</div>`;
    const wire = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
    wire('castScout', () => MM.engine.castScout());
    wire('castBlink', () => MM.engine.castBlink());
    wire('castBeacon', () => MM.engine.castBeacon());
  }

  UI.log = function (msg) {
    messages.push(msg);
    if (messages.length > 10) messages.shift();
    const el = document.getElementById('log');
    if (el) {
      el.innerHTML = messages.map(m => `<div>${m}</div>`).join('');
      el.scrollTop = el.scrollHeight; // the log scrolls itself; newest always visible
    }
  };

  // ---------- shared problem form (used by battle + modals) ----------
  // Builds the answer input (or choice buttons) into `container`.
  // Calls onAnswer(correct, kidAnswer) exactly once — kidAnswer is the raw
  // submitted text (or the chosen button's label, for kind:'choice'). Wave 8a
  // (P6 growth tracking) needs the verbatim wrong answer for the parent
  // panel's "recent misses" list; existing callers that only take `correct`
  // keep working unchanged (JS ignores the extra argument).
  UI.buildProblemForm = function (container, problem, onAnswer) {
    let answered = false;
    const resolve = (correct, kidAnswer) => {
      if (answered) return;
      answered = true;
      container.querySelectorAll('button,input').forEach(n => n.disabled = true);
      onAnswer(correct, kidAnswer);
    };
    if (problem.kind === 'choice') {
      container.innerHTML = `<div class="choices">` +
        problem.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('') +
        `</div>`;
      container.querySelectorAll('.choice').forEach(b => {
        b.onclick = () => resolve(+b.dataset.i === problem.answer, problem.choices[+b.dataset.i]);
      });
      return;
    }
    const placeholder = problem.kind === 'remainder' ? 'like 6 r 8 — or just 7 if it divides evenly' : 'Your answer';
    container.innerHTML = `
      <div class="answer-row">
        <input id="answerInput" type="text" autocomplete="off" placeholder="${placeholder}" />
        <button id="submitBtn" class="primary">Answer ✓</button>
      </div>
      ${problem.hint ? `<div class="hint${problem.kind === 'remainder' ? ' hint-strong' : ''}">💡 ${problem.hint}</div>` : ''}
      <div class="parse-warn" id="parseWarn"></div>`;
    const input = container.querySelector('#answerInput');
    const submit = () => {
      if (answered) return;
      if (!input.value.trim()) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
      }
      if (MM.problems.parseAnswer(input.value) == null) {
        container.querySelector('#parseWarn').innerHTML =
          `Hmm, I can't read "<b>${input.value.replace(/</g, '&lt;')}</b>" — try a number like <b>12</b>, <b>3.5</b>, <b>3/4</b>, or <b>14 r 2</b>.`;
        return;
      }
      resolve(MM.problems.checkAnswer(problem, input.value), input.value);
    };
    container.querySelector('#submitBtn').onclick = submit;
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') submit(); });
    setTimeout(() => input.focus(), 30);
  };

  UI.setupScratchpad = function () {
    const sc = document.getElementById('scratch');
    if (!sc) return;
    const sctx = sc.getContext('2d');
    sctx.strokeStyle = '#ffe27a';
    sctx.lineWidth = 2.5;
    sctx.lineCap = 'round';
    let drawing = false;
    const pos = ev => {
      const r = sc.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * (sc.width / r.width), y: (ev.clientY - r.top) * (sc.height / r.height) };
    };
    sc.addEventListener('pointerdown', ev => { drawing = true; const p = pos(ev); sctx.beginPath(); sctx.moveTo(p.x, p.y); sc.setPointerCapture(ev.pointerId); });
    sc.addEventListener('pointermove', ev => { if (!drawing) return; const p = pos(ev); sctx.lineTo(p.x, p.y); sctx.stroke(); });
    sc.addEventListener('pointerup', () => { drawing = false; });
    const clear = document.getElementById('scratchClear');
    if (clear) clear.onclick = (ev) => { ev.preventDefault(); sctx.clearRect(0, 0, sc.width, sc.height); };
  };

  // ---------- modal helpers ----------
  // The recurring "blank shop window" bug never throws, so the error tracker
  // can't see it. Instead: verify every modal actually has content — at open
  // AND shortly after (in case something empties it) — and if it's blank,
  // record a full bug entry (breadcrumbs + state, survives reload) and show a
  // friendly recovery message so nobody is ever stuck.
  // Wave 6.5 hardening: "blank" now means what a KID means by it — no
  // readable body (buttons don't count: a lone OK button in an empty box
  // is still blank) or a collapsed box. Checked at open, shortly after,
  // AND continuously while any overlay is visible (the recurring blank-
  // shop bug evaded the old two-moment check).
  function modalBodyText() {
    let text = '';
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) text += child.textContent;
        else if (child.nodeType === 1 && child.tagName !== 'BUTTON'
                 && !(child.classList && child.classList.contains('btnrow'))) walk(child);
      }
    };
    if (modalBox) walk(modalBox);
    return text.trim();
  }
  function checkBlankModal(html, when) {
    if (modalEl.classList.contains('hidden')) return;
    const collapsed = modalBox.getBoundingClientRect().height < 40;
    if (modalBox.childElementCount > 0 && modalBodyText().length > 0 && !collapsed) return;
    MM.bugs.record('blank-modal',
      `modal blank (${when}); intended ${String(html || '').length} chars; height ${Math.round(modalBox.getBoundingClientRect().height)}; showing "${modalBox.innerHTML.slice(0, 150)}"`, '');
    modalBox.innerHTML = `
      <h2>🐛 Oops — empty window!</h2>
      <div class="dialog-body">That window came up blank. The good news: it's been
      <b>recorded in the bug log</b> (👪 Parent → 🐛 Bug log → Copy bug report).<br><br>
      Nothing is lost — carry on playing!</div>
      <div class="btnrow"><button id="dlgOk" class="primary">Carry on</button></div>`;
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
  }
  let lastModalHtml = '';
  function openModal(html) {
    // breadcrumb the window itself, so a blank-modal report names the culprit
    MM.track('modal: ' + String(html || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 48));
    lastModalHtml = String(html || '');
    modalBox.innerHTML = html;
    modalEl.classList.remove('hidden');
    checkBlankModal(html, 'at open');
    setTimeout(() => checkBlankModal(html, '300ms later'), 300);
  }
  // the continuous watchdog — catches blanking that happens OUTSIDE the
  // two per-open checks (e.g. content emptied mid-flow), plus a visible-
  // but-empty battle overlay, which looks identical to a blank shop
  setInterval(() => {
    try {
      if (modalEl && !modalEl.classList.contains('hidden')) checkBlankModal(lastModalHtml, 'watchdog');
      const bo = document.getElementById('battleOverlay');
      if (bo && !bo.classList.contains('hidden') && bo.innerHTML.trim().length === 0) {
        MM.bugs.record('blank-battle', 'battle overlay visible but empty', '');
        bo.classList.add('hidden');
        UI.log('🐛 A blank battle window was recorded in the bug log — carry on!');
      }
    } catch (e) { /* the watchdog must never hurt the game */ }
  }, 750);
  // manual capture (Ctrl+Shift+B): when ANYTHING looks wrong, press it —
  // snapshots exactly what is on screen into the bug log, even mid-modal
  UI.captureNow = function () {
    const snap = {
      overlayVisible: modalEl ? !modalEl.classList.contains('hidden') : null,
      modalHeight: modalBox ? Math.round(modalBox.getBoundingClientRect().height) : null,
      bodyTextLen: modalBox ? modalBodyText().length : null,
      battleVisible: !!(document.getElementById('battleOverlay') && !document.getElementById('battleOverlay').classList.contains('hidden')),
      activeEl: document.activeElement && (document.activeElement.id || document.activeElement.tagName),
      modalHtml: modalBox ? modalBox.innerHTML.slice(0, 600) : null,
    };
    MM.bugs.record('manual-capture', JSON.stringify(snap), '');
    UI.log('📸 Captured! It\'s in the bug log (👪 Parent → 🐛 Bug log → Copy).');
  };
  function closeModal() {
    modalEl.classList.add('hidden');
    modalBox.innerHTML = '';
  }
  UI.closeModal = closeModal;

  // Safety net: if anything throws unexpectedly, never strand the player in a
  // blank/broken modal — recover the UI and note it in the log.
  window.addEventListener('error', (ev) => {
    try {
      if (modalEl && !modalEl.classList.contains('hidden') && modalBox.innerHTML.trim().length < 40) {
        closeModal();
      }
      UI.log('⚠️ Something glitched — if it keeps happening, refresh the page (progress is saved).');
      console.error('MathMaker recovered from:', ev.message);
    } catch (e) { /* never let the safety net itself throw */ }
  });

  UI.dialog = function (title, html, onClose) {
    openModal(`
      <h2>${title}</h2>
      <div class="dialog-body">${html}</div>
      <div class="btnrow"><button id="dlgOk" class="primary">OK</button></div>`);
    document.getElementById('dlgOk').onclick = () => { closeModal(); if (onClose) onClose(); UI.refresh(); };
  };

  // Dialog with multiple choice buttons: [{label, primary, onClick}]
  UI.dialogChoices = function (title, html, buttons) {
    openModal(`
      <h2>${title}</h2>
      <div class="dialog-body">${html}</div>
      <div class="btnrow">${buttons.map((b, i) =>
        `<button data-i="${i}" class="${b.primary ? 'primary' : 'secondary'}">${b.label}</button>`).join('')}</div>`);
    document.querySelectorAll('#modalBox .btnrow button').forEach(btn => {
      btn.onclick = () => {
        const b = buttons[+btn.dataset.i];
        closeModal();
        if (b.onClick) b.onClick();
        UI.refresh();
      };
    });
  };

  // ---------- echo door (Wave 4, Resonant Halls): a memory puzzle, not a
  // math problem. Plays a 3-5 tone sequence; the kid clicks it back in
  // order. A wrong click resets progress and replays after a LONGER pause —
  // always replayable, no penalty beyond "listen again." The sequence is
  // exposed as MM.ui.currentEcho (same convention as MM.ui.current /
  // MM.battle.current) so drives can read the right answer directly.
  UI.showEchoDoor = function (seq, onSolved) {
    MM.ui.currentEcho = seq;
    let progress = 0;
    openModal(`
      <h2>🔔 An echo door hums with a tune.</h2>
      <div class="dialog-body">
        <p>Listen closely, then click the tones back — in the same order.</p>
        <div id="echoButtons" style="display:flex;gap:10px;justify-content:center;margin:18px 0">
          ${TONE_COLORS.map((c, i) => `<button class="tone-btn" data-tone="${i}"
            style="background:${c};width:48px;height:48px;border-radius:50%;border:3px solid #262042;transition:transform .15s" disabled></button>`).join('')}
        </div>
        <div id="echoStatus" class="dim" style="text-align:center">Listen...</div>
      </div>
      <div class="btnrow">
        <button id="echoReplay" class="secondary">▶ Replay</button>
        <button id="echoLeave" class="secondary">Step away</button>
      </div>`);
    const leaveBtn = document.getElementById('echoLeave');
    if (leaveBtn) leaveBtn.onclick = () => { closeModal(); UI.refresh(); };
    const status = (msg) => { const el = document.getElementById('echoStatus'); if (el) el.textContent = msg; };
    const tones = () => document.querySelectorAll('.tone-btn');
    const setListening = (on) => tones().forEach(b => b.disabled = !on);

    function playSequence(gapMs) {
      setListening(false);
      status('Listen...');
      seq.forEach((tone, i) => {
        setTimeout(() => {
          MM.sound.tone(tone);
          const b = tones()[tone];
          if (b) { b.style.transform = 'scale(1.25)'; setTimeout(() => { if (b) b.style.transform = ''; }, 220); }
          if (i === seq.length - 1) {
            setTimeout(() => { setListening(true); status('Your turn — repeat it back!'); }, 500);
          }
        }, i * gapMs);
      });
    }
    tones().forEach(b => {
      b.onclick = () => {
        const tone = +b.dataset.tone;
        MM.sound.tone(tone);
        if (tone === seq[progress]) {
          progress++;
          if (progress === seq.length) {
            setListening(false);
            status("That's it! ✨");
            MM.sound.fanfare();
            setTimeout(() => { closeModal(); onSolved(); UI.refresh(); }, 500);
          }
        } else {
          progress = 0;
          status('Not quite — listen again...');
          setTimeout(() => playSequence(650), 900); // a longer pause before it repeats
        }
      };
    });
    const replayBtn = document.getElementById('echoReplay');
    if (replayBtn) replayBtn.onclick = () => { progress = 0; playSequence(650); };
    playSequence(650);
  };

  // ---------- the bag (equipment, food, treasures, charms) ----------
  UI.openBag = function () {
    MM.track('openBag');
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const gearRows = Object.keys(MM.data.GEAR).map(slot => {
      const owned = s.gear[slot] || [];
      // rings/amulets are one-at-a-time AND fine to wear none of — the worn
      // one gets a "take off" action right on its row (the old separate
      // "Bare finger / Unequip" pseudo-item row read like an equippable
      // item called Bare Finger — playtest 2026-07-12)
      const oneAtATime = slot === 'ring' || slot === 'amulet';
      const rows = owned.map(id => {
        const item = MM.data.gearById(slot, id);
        const on = s.equipped[slot] === id;
        return `<div class="shop-row${on ? ' equipped' : ''}">
          <span class="shop-item">${MM.data.gearLabel(slot, id)}${item.quip ? `<span class="quip">${item.quip}</span>` : ''}</span>
          <span class="shop-stat">${MM.data.gearStat(slot, item)}</span>
          ${on ? (oneAtATime ? `<button class="shop-buy" data-equip="${slot}:">✓ On — take off</button>`
                             : '<span class="shop-buy">✓ equipped</span>')
               : `<button class="shop-buy" data-equip="${slot}:${id}">Equip</button>`}
        </div>`;
      }).join('');
      return `<div class="slot-label">${MM.data.SLOT_NAMES[slot]}${owned.length ? '' : ' <span class="dim">— nothing yet</span>'}</div>${rows}`;
    }).join('');
    // Wave 2: loose (unfused) gems — Emberlyn in Port Brightwater fuses them.
    // Before the pier opens (task 13), don't name a place the kid can't
    // reach and has never heard of — promise the future instead.
    const pierOpen = (s.tasksDone || []).includes(13);
    const gemNote = pierOpen ? 'fuse at Emberlyn\'s' : 'for the enchanter across the sea ⛵';
    const gemCounts = {};
    (s.items.gems || []).forEach(id => gemCounts[id] = (gemCounts[id] || 0) + 1);
    const gemRows = Object.keys(gemCounts).length
      ? Object.entries(gemCounts).map(([id, n]) => {
          const g = MM.data.gemById(id);
          return `<div class="shop-row">
            <span class="shop-item">${g.emoji} ${g.name} Gem${n > 1 ? ' × ' + n : ''}<span class="quip">${g.desc}</span></span>
            <span class="bag-note">${gemNote}</span>
          </div>`;
        }).join('')
      : '<div class="bag-empty">No gems yet — glimmering chests sometimes hold them. ✨</div>';
    const foodRows = MM.data.FOODS
      .filter(f => (s.items.food[f.id] || 0) > 0)
      .map(f => `<div class="shop-row">
        <span class="shop-item">${f.emoji} ${f.name} × ${s.items.food[f.id]}</span>
        <span class="shop-stat">+${f.stamina} 🍗</span>
        <button class="shop-buy" data-eat="${f.id}">Eat</button>
      </div>`).join('') || '<div class="bag-empty">No food — buy some at the 🏪 shop!</div>';
    const counts = {};
    s.items.treasures.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const treasureRows = Object.entries(counts).map(([id, n]) => {
      const t = MM.data.treasureById(id);
      return `<div class="shop-row">
        <span class="shop-item">${t.emoji} ${t.name}${n > 1 ? ' × ' + n : ''}${t.quip ? `<span class="quip">${t.quip}</span>` : ''}</span>
        <span class="shop-stat">~${t.value} g</span>
        <span class="bag-note">sell at 🏪</span>
      </div>`;
    }).join('') || '<div class="bag-empty">No treasures yet — check dungeon chests!</div>';
    const charmRows = s.items.charms.map(id => {
      const c = MM.data.charmById(id);
      const on = (s.charmsOn || []).includes(id);
      return `<div class="shop-row${on ? ' equipped' : ''}">
        <span class="shop-item">${c.emoji} <b>${c.name}</b><span class="quip">${c.desc}</span></span>
        <button class="shop-buy" data-charm="${id}">${on ? 'Take off' : 'Wear'}</button>
      </div>`;
    }).join('') || '<div class="bag-empty">No magical charms yet... they say chests sometimes hold them. ✨</div>';
    // mystery potions (drinkable from the bag)
    const mysteryRow = (s.items.mystery > 0)
      ? `<div class="shop-row">
          <span class="shop-item">${MM.data.MYSTERY.emoji} ${MM.data.MYSTERY.name} × ${s.items.mystery}<span class="quip">${MM.data.MYSTERY.quip}</span></span>
          <button class="shop-buy" id="drinkMystery">Drink</button>
        </div>` : '';
    // Wave 4 carry-over: Rope of Return — usable only inside a dungeon
    const ropeCount = s.items.ropes || 0;
    const inDungeonForRope = MM.engine.inDungeon();
    const ropeRow = (ropeCount > 0)
      ? `<div class="shop-row">
          <span class="shop-item">${MM.data.ROPE.emoji} ${MM.data.ROPE.name} × ${ropeCount}<span class="quip">${MM.data.ROPE.quip}</span></span>
          <button class="shop-buy" id="useRope" ${inDungeonForRope ? '' : 'disabled'} title="${inDungeonForRope ? '' : "You're already outside!"}">Use</button>
        </div>` : '';
    // the pet panel
    const pet = s.isles && s.isles.pet;
    let petPanel = '';
    if (pet) {
      const species = MM.data.PETS[pet.species];
      const stage = MM.data.PET_STAGES[pet.stage];
      const next = MM.data.PET_STAGES[pet.stage + 1];
      const img = MM.sprites.get(species.sprite, { scale: 4 }).toDataURL();
      petPanel = `
        <h3>Your pet</h3>
        <div class="shop-row">
          <img src="${img}" class="beast-img" style="width:44px;height:44px" alt="">
          <span class="shop-item"><b>${pet.name}</b> the ${species.name} ${species.emoji}${pet.hat ? ' ' + (MM.data.petHatById(pet.hat) || {}).emoji : ''} — <b>${stage.name}</b>
            <span class="quip">${next
              ? `Next: ${next.name} at ${next.correct} correct answers (${Math.min(pet.correct, next.correct)}/${next.correct}) and ${next.fed} meals (${Math.min(pet.fed, next.fed)}/${next.fed}).`
              : 'Fully grown, maximally proud of you.'}</span></span>
          <span class="shop-stat">🦴 × ${s.items.treats || 0}</span>
          <button class="shop-buy" id="feedPet" ${s.items.treats > 0 ? '' : 'disabled'}>Feed</button>
        </div>`;
    }
    // 2026-07-17 audit fix: the shelf shows the three sea-taught topics too
    // (clocks/geometry/music) once the kid has attempted them — same rule as
    // the report card, and for the same reason (recorded but never displayed).
    const shelfSkills = MM.data.TASKS.filter(t => !t.exp).map(t => t.skill)
      .concat(['time_reading', 'geometry', 'music_reading'].filter(k => {
        const m = (s.mastery || {})[k];
        return (m && m.attempts) || (s.badges || {})[k];
      }));
    const badgeRows = shelfSkills.map(skill => {
      const tier = (s.badges || {})[skill] || 0;
      const icons = [1, 2, 3].map(k =>
        `<span class="${k <= tier ? 'badge-on' : 'badge-dim'}">${MM.data.BADGES[k].emoji}</span>`).join(' ');
      return `<div class="charm-row">${icons} ${MM.data.SKILL_NAMES[skill]}</div>`;
    }).join('');
    const r = MM.engine.strikeRange();
    openModal(`
      <h2>🎒 Your Bag</h2>
      <div class="dialog-body">
        <div class="shop-gold">⚔️ strikes <b>${r.min}–${r.max}</b> · 🛡 blocks <b>${MM.engine.totalDef()}</b> ·
          🍗 <b>${s.stamina}/${s.maxStamina}</b> · 🧪 <b>${s.potions}</b></div>
        <h3>Equipment — choose what to wield and wear</h3>${gearRows}
        <h3>Gems — bring these to Emberlyn to fuse</h3>${gemRows}
        ${petPanel}
        <h3>Food — eat to restore stamina</h3>${foodRows}${mysteryRow}${ropeRow}
        <h3>Treasures — sell them at the shop</h3>${treasureRows}
        <h3>Magical charms — wear up to ${MM.engine.CHARM_SLOTS} (${(s.charmsOn || []).length}/${MM.engine.CHARM_SLOTS} worn)</h3>${charmRows}
        <h3>Badge shelf — earn 🥉🥈🥇 in every topic</h3>${badgeRows}
        <h3>Your look</h3>
        <div class="shop-row">
          <span class="shop-item">🔍 The Looking Glass<span class="quip">Change your hero's form any time — it never costs a thing.</span></span>
          <button class="shop-buy" id="bagLookingGlass">Open</button>
        </div>
      </div>
      <div class="btnrow"><button id="bagClose" class="secondary">Close</button></div>`);
    document.getElementById('bagClose').onclick = () => { closeModal(); UI.refresh(); };
    document.getElementById('bagLookingGlass').onclick = () => { closeModal(); UI.lookingGlass(); };
    document.querySelectorAll('[data-eat]').forEach(b => {
      b.onclick = () => { closeModal(); MM.engine.eat(b.dataset.eat); UI.openBag(); };
    });
    const drinkBtn = document.getElementById('drinkMystery');
    if (drinkBtn) drinkBtn.onclick = () => { closeModal(); MM.engine.drinkMystery(); UI.openBag(); };
    const useRopeBtn = document.getElementById('useRope');
    if (useRopeBtn) useRopeBtn.onclick = () => {
      closeModal();
      if (!MM.engine.inDungeon()) return;
      const task = MM.data.TASKS[MM.engine.state.dungeonIndex - 1];
      UI.dialogChoices('🪢 Rope of Return',
        `Climb out of the <b>${task.dungeon}</b>? <span class="dim">(You'll land right back at the entrance.)</span>`,
        [
          { label: '🪢 Use it', primary: true, onClick: () => MM.engine.useRope() },
          { label: 'Never mind', onClick: () => {} },
        ]);
    };
    const feedBtn = document.getElementById('feedPet');
    if (feedBtn) feedBtn.onclick = () => { closeModal(); MM.engine.feedPet(); UI.openBag(); };
    document.querySelectorAll('[data-charm]').forEach(b => {
      b.onclick = () => { closeModal(); MM.engine.toggleCharm(b.dataset.charm); UI.openBag(); };
    });
    document.querySelectorAll('[data-equip]').forEach(b => {
      b.onclick = () => {
        const [slot, id] = b.dataset.equip.split(':');
        MM.engine.equip(slot, id || null);
        closeModal();
        UI.openBag();
      };
    });
  };

  // ---------- the ⚙️ Settings dialog (kid-facing) ----------
  // v1.7.3 reorg (playtest 2026-07-13: "the Difficulty menu is poorly
  // organized"): it had grown into seven identical buttons in one flat list
  // — a three-way monster-toughness pick, the way switch, and two sound
  // toggles all dressed alike, and every click CLOSED the dialog so a kid
  // couldn't watch a choice stick. Now: three labelled rooms (the same
  // tinted-block recipe as the shop), the current choice visibly marked,
  // and changes apply IN PLACE — the dialog re-renders so the ✓ moves
  // under your finger. One Close.
  UI.difficultyDialog = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const diffBtn = (d, emoji, label, blurb) => `
      <button class="set-choice${s.difficulty === d ? ' primary' : ''}" data-diff="${d}" data-label="${label}">
        ${emoji} ${label}${s.difficulty === d ? ' ✓' : ''}<span class="quip">${blurb}</span>
      </button>`;
    // Wave 21 (Looking Glass P2.3): "Recognize" reflavors this label through
    // the glass — wording only, the stance value itself is still 'soothe'.
    const mirror = MM.engine.inMirror && MM.engine.inMirror();
    const way = s.stance === 'soothe' ? (mirror ? 'recognizing 🪞' : 'gently 🕊') : 'boldly ⚔️';
    openModal(`
      <h2>⚙️ Settings</h2>
      <div class="dialog-body">
        <div class="shop-sec shop-sec-bold">
          <h3>🐉 How tough are the monsters?</h3>
          <p class="dim">Changes their health and how hard they hit — never the math. Takes effect in the next dungeon you enter.</p>
          <div class="set-row">
            ${diffBtn('story', '🌸', 'Story', 'gentler fights')}
            ${diffBtn('hero', '⚔️', 'Hero', 'the standard adventure')}
            ${diffBtn('legend', '🔥', 'Legend', 'for heroes who like a scrap')}
          </div>
        </div>
        <div class="shop-sec shop-sec-gentle">
          <h3>${s.stance === 'soothe' ? (mirror ? '🪞' : '🕊') : '⚔️'} Your way</h3>
          <p>You face the tangles <b>${way}</b>. <span class="dim">${mirror && s.stance === 'soothe'
            ? 'A reflection isn\'t a stranger — you just have to look. Everything you\'ve befriended stays befriended.'
            : 'Most heroes change their way eventually — it costs nothing, and everything you\'ve befriended stays befriended.'}</span></p>
          <div class="set-row">
            <button id="setWay">${s.stance === 'soothe' ? '⚔️ Change my way: boldly' : (mirror ? '🪞 Change my way: recognizing' : '🕊 Change my way: gently')}</button>
          </div>
        </div>
        <div class="shop-sec shop-sec-ring">
          <h3>🎵 Sound</h3>
          <div class="set-row">
            <button id="setMusic">${s.musicOff ? '🎵 Music is OFF — turn on' : '🎵 Music is ON — turn off'}</button>
            <button id="setSound">${s.soundOff ? '🔇 Sound is OFF — turn on' : '🔊 Sound is ON — turn off'}</button>
          </div>
          <p class="dim">Music is the background tunes. Sound is everything — chimes included. Parents have the same switches.</p>
        </div>
        <div class="shop-sec shop-sec-credits">
          <h3>🎼 Music credits</h3>
          <p class="dim">The music is real recordings of public-domain and Creative-Commons performances — thank you to the musicians who shared them.</p>
          <ul class="credits-list">
            ${(MM.music && MM.music.TRACKS || []).map(t => `<li>${t.title}</li>`).join('')}
          </ul>
        </div>
      </div>
      <div class="btnrow"><button id="setClose" class="secondary">Close</button></div>`);
    const rerender = () => { closeModal(); UI.difficultyDialog(); };
    document.querySelectorAll('.set-choice').forEach(b => {
      b.onclick = () => {
        if (s.difficulty !== b.dataset.diff) {
          s.difficulty = b.dataset.diff;
          MM.engine.save();
          UI.log(`⚙️ Difficulty set to <b>${b.dataset.label}</b> — it takes effect in the next dungeon you enter.`);
        }
        rerender();
      };
    });
    document.getElementById('setWay').onclick = () => {
      const other = s.stance === 'soothe' ? 'strike' : 'soothe';
      MM.engine.setStance(other);
      UI.log(other === 'soothe'
        ? (mirror
          ? `🪞 <b>Recognizing, then.</b> A reflection isn't a stranger — you just have to look.`
          : `🕊 <b>Gently, then.</b> The MathMaker's voice, from memory: "A tangle comes loose exactly as well as it comes apart."`)
        : `⚔️ <b>Boldly, then.</b> The MathMaker's voice, from memory: "Go and meet it."`);
      rerender();
    };
    document.getElementById('setMusic').onclick = () => {
      s.musicOff = !s.musicOff; MM.engine.save();
      UI.log(s.musicOff ? '🎵 Music off — the sound effects stay.' : '🎵 Music on.');
      rerender();
    };
    document.getElementById('setSound').onclick = () => {
      s.soundOff = !s.soundOff; MM.engine.save();
      UI.log(s.soundOff ? '🔇 All sound off.' : '🔊 Sound on.');
      rerender();
    };
    document.getElementById('setClose').onclick = () => { closeModal(); UI.refresh(); };
  };

  // ---------- parent settings (PIN-protected) ----------
  UI.parentPanel = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    if (!s.parent.pin) return pinSetup();
    pinEntry();
  };

  function pinForm(title, blurb, buttonLabel, onSubmit) {
    openModal(`
      <h2>${title}</h2>
      <div class="dialog-body">${blurb}</div>
      <div class="answer-row" style="margin-top:12px">
        <input id="pinInput" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN" />
        <button id="pinOk" class="primary">${buttonLabel}</button>
      </div>
      <div class="parse-warn" id="pinWarn"></div>
      <div class="btnrow"><button id="pinCancel" class="secondary">Cancel</button></div>`);
    const input = document.getElementById('pinInput');
    const go = () => onSubmit(input.value.trim());
    document.getElementById('pinOk').onclick = go;
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
    document.getElementById('pinCancel').onclick = () => closeModal();
    setTimeout(() => input.focus(), 30);
  }

  function pinSetup() {
    pinForm('👪 Parent Settings — first visit',
      `Create a <b>parent PIN</b> (4+ digits). You'll need it to open these settings later.<br>
       <span class="dim">Tip: write it down — it's stored per player profile.</span>`,
      'Create',
      (pin) => {
        if (!/^\d{4,8}$/.test(pin)) {
          document.getElementById('pinWarn').textContent = 'Please use 4 to 8 digits.';
          return;
        }
        MM.engine.state.parent.pin = pin;
        MM.engine.save();
        parentSettings();
      });
  }

  function pinEntry() {
    pinForm('👪 Parent Settings', 'Enter the parent PIN.', 'Unlock',
      (pin) => {
        if (pin !== MM.engine.state.parent.pin) {
          const w = document.getElementById('pinWarn');
          w.textContent = 'That\'s not it — ask a grown-up!';
          const input = document.getElementById('pinInput');
          input.value = '';
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 400);
          return;
        }
        parentSettings();
      });
  }

  // Wave 8a (P6, growth tracking): last 7 real days vs lifetime accuracy.
  // The arrow answers "how's THIS topic going lately" — never a comparison
  // to anyone else, and hidden entirely until there's enough data to mean
  // something (5+ lifetime attempts, 3+ this week).
  function weeklyTrend(s, skill) {
    const m = (s.mastery || {})[skill];
    if (!m || m.attempts < 5) return '';
    const cutoff = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    let a = 0, c = 0;
    for (const d of Object.keys(s.history || {})) {
      if (d < cutoff) continue;
      const h = s.history[d][skill];
      if (h) { a += h.a; c += h.c; }
    }
    if (a < 3) return '';
    const weekAcc = c / a, lifeAcc = m.correct / m.attempts;
    if (weekAcc >= lifeAcc + 0.1) return ` <span class="trend-up">▲ this week</span>`;
    if (weekAcc <= lifeAcc - 0.1) return ` <span class="trend-down">▼ this week</span>`;
    return '';
  }
  // An expandable list of the actual last few wrong answers per topic — a
  // parent spots a regrouping slip from three real examples faster than
  // from any percentage (that's the whole reason recentMisses exists).
  function missesBlock(s, skill) {
    const list = (s.recentMisses || {})[skill];
    if (!list || !list.length) return '';
    const rows = list.slice(-5).reverse().map(m =>
      `<div class="miss-row">${String(m.text || '').replace(/</g, '&lt;')} — answered <b>${String(m.kidAnswer || '').replace(/</g, '&lt;')}</b></div>`).join('');
    return `<details class="miss-details"><summary>Recent misses (${list.length})</summary>${rows}</details>`;
  }
  // Parent alert (user decision 2026-07-13): sustained struggle in a topic
  // is a PARENT decision point, not a kid problem — the honest remedy is
  // the topic switch, because the game gives practice; it does not teach a
  // topic from scratch. "Sustained" = last-10 accuracy ≤ 30% with at least
  // 10 lifetime attempts — one bad battle can't trip it.
  function isStrugglingTopic(s, skill) {
    const m = (s.mastery || {})[skill];
    if (!m || (m.attempts || 0) < 10 || !m.recent || m.recent.length < 10) return false;
    return m.recent.filter(Boolean).length / m.recent.length <= 0.3;
  }
  MM.ui.isStrugglingTopic = (s, skill) => isStrugglingTopic(s, skill); // for tests
  function parentSettings() {
    const s = MM.engine.state;
    const topics = s.parent.topics || {};
    let anyStruggling = false;
    const checks = MM.data.PARENT_TOPICS.map(skill => {
      const m = (s.mastery || {})[skill];
      const acc = m && m.attempts ? ` <span class="dim">(${m.correct}/${m.attempts})</span>` : '';
      const tier = (s.badges || {})[skill] || 0;
      const hard = isStrugglingTopic(s, skill);
      if (hard) anyStruggling = true;
      return `<div class="topic-row">
        <label class="topic-check">
          <input type="checkbox" data-skill="${skill}" ${topics[skill] !== false ? 'checked' : ''}>
          ${MM.data.SKILL_NAMES[skill]}${hard ? ' <b style="color:#ff9d5c">⚠</b>' : ''}${tier ? ' ' + MM.data.BADGES[tier].emoji : ''}${acc}${weeklyTrend(s, skill)}
        </label>
        ${missesBlock(s, skill)}
      </div>`;
    }).join('');
    const struggleNote = anyStruggling
      ? `<p style="font-size:13px;color:#ff9d5c;margin-top:4px">⚠ means your child has been finding that topic genuinely
         hard recently. If it hasn't been covered at school yet, consider unchecking it — the game gives
         <b>practice</b>; it doesn't teach a topic from scratch.</p>`
      : '';
    const bugs = MM.bugs.list();
    const bugRows = bugs.length
      ? bugs.slice(-3).reverse().map(b =>
          `<div class="bug-row">🐛 <b>${b.when.slice(0, 16).replace('T', ' ')}</b> — ${String(b.message).replace(/</g, '&lt;').slice(0, 90)}</div>`).join('')
        + (bugs.length > 3 ? `<div class="dim" style="font-size:12px">…and ${bugs.length - 3} more in the full report.</div>` : '')
      : '<div class="dim" style="font-size:13px">No errors recorded. 🎉</div>';
    openModal(`
      <h2>👪 Parent Settings — ${s.name}</h2>
      <div class="dialog-body">
        <h3>Math topics — check what your child is ready for</h3>
        <p style="font-size:13.5px">Every problem in the game (battles, bosses, doors, chests, seals) comes
        only from <b>checked topics</b>. All dungeons still play — problems just stay within what's allowed.
        Difficulty inside each topic still adapts automatically.</p>
        <div class="topic-grid">${checks}</div>
        ${struggleNote}
        <p class="dim" style="font-size:12.5px;margin-top:6px">If "Multi-Digit Add & Subtract" is unchecked,
        the shop's money quizzes are skipped too. At least one topic must stay checked.</p>
        <h3>🧘 Calm Mode</h3>
        <label class="topic-check">
          <input type="checkbox" id="calmModeCheck" ${s.calmMode ? 'checked' : ''}>
          Turn off screen shake and particle bursts (battles stay just as playable — no motion, that's all)
        </label>
        <label class="topic-check">
          <input type="checkbox" id="soundOffCheck" ${s.soundOff ? 'checked' : ''}>
          Turn off all sound (every beep, chime, and fanfare — the game plays silently)
        </label>
        <label class="topic-check">
          <input type="checkbox" id="musicOffCheck" ${s.musicOff ? 'checked' : ''}>
          Turn off the background music (sound effects stay)
        </label>
        <label class="topic-check">
          <input type="checkbox" id="bigTextCheck" ${s.bigText ? 'checked' : ''}>
          Larger reading text (dialogs, problems, and the story log)
        </label>
        <h3>🃏 Card Parlor</h3>
        <label class="topic-check">
          <input type="checkbox" id="parlorTwoDigitCheck" ${s.parent.parlorTwoDigit ? 'checked' : ''}>
          Two-digit cards (harder) — the post-game card game "Tiny Hats" uses bigger edge numbers,
          for real magnitude comparison and larger running sums. <span class="dim">Off = single-digit (default).
          The Parlor is casual play; it is never graded.</span>
        </label>
        <h3>🪞 Negative numbers (Looking Glass)</h3>
        <label class="topic-check">
          <input type="checkbox" id="negativesCheck" ${s.parent.negatives !== false ? 'checked' : ''}>
          Negative numbers in the Looking Glass — once your child steps through the looking glass, the mirror
          world includes <b>negatives</b>: signed problems in battles and doors (−3, 7 + (−2), −4 × 2) and the
          Tweedles' cancel-to-zero puzzle. <span class="dim">On by default — the mirror world is where negatives
          live. They appear ONLY through the looking glass, never in the ordinary kingdom, and a wrong signed
          answer just shows the worked solution, as always. Integers are about 6th-grade, the top of Numeria's
          range — uncheck this to keep the mirror world to familiar numbers.</span>
        </label>
        <h3>Current progress</h3>
        <p style="font-size:14px">📗 On task <b>${Math.min(s.taskIndex, 13)}</b> ·
          answered <b>${s.totals.correct}/${s.totals.answered}</b> correctly overall.
          Press <b>R</b> in-game for the full per-topic report card.</p>
        ${MM.engine.canReturnToKingdom() ? `
        <h3>🪞 Through the looking glass</h3>
        <p style="font-size:13px">Your child stepped <b>through the looking glass</b> (reflection ${s.ngPlus}) — a fresh
          reflection of the whole kingdom to explore. Everything they collected is safe. If they'd rather have their
          <b>finished kingdom</b> back — every dungeon cleared, the story complete — you can step them back through
          the glass here. <span class="dim">(Their level, gear, badges, Monster Book, and pet all stay either way.)</span></p>
        <div style="margin:6px 0 2px"><button id="goldenReturn" class="secondary">↩ Step back through the glass</button></div>` : ''}
        <h3>🛂 Adventurer's Passport</h3>
        <p style="font-size:13px" class="dim">Saves live in this browser. The passport is how they travel —
        download a file to back this adventurer up, move them to another computer, or send them to a cousin.
        Loading a passport on another machine brings them back exactly as they are.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 2px">
          <button id="passportExport" class="secondary">💾 Download ${s.name}'s passport</button>
          <button id="passportImport" class="secondary">📂 Load a passport file</button>
          <input id="passportFile" type="file" accept=".json,application/json" style="display:none">
        </div>
        <h3>🐛 Bug log (${bugs.length})</h3>
        ${bugRows}
      </div>
      <div class="btnrow">
        ${bugs.length ? '<button id="bugCopy" class="secondary">📋 Copy bug report</button><button id="bugClear" class="secondary">Clear log</button>' : ''}
        <button id="pinChange" class="secondary">Change PIN</button>
        <button id="parentDone" class="primary">Save & close</button>
      </div>`);
    document.getElementById('parentDone').onclick = () => {
      const map = {};
      let anyOn = false;
      // [data-skill] excludes the Calm Mode checkbox, which shares this
      // class purely for visual styling
      document.querySelectorAll('.topic-check input[data-skill]').forEach(cb => {
        map[cb.dataset.skill] = cb.checked;
        if (cb.checked) anyOn = true;
      });
      if (!anyOn) map.addsub_facts = true; // never zero topics
      s.parent.topics = map;
      s.calmMode = document.getElementById('calmModeCheck').checked;
      s.soundOff = document.getElementById('soundOffCheck').checked;
      s.musicOff = document.getElementById('musicOffCheck').checked;
      s.bigText = document.getElementById('bigTextCheck').checked;
      document.body.classList.toggle('big-text', s.bigText);
      s.parent.parlorTwoDigit = document.getElementById('parlorTwoDigitCheck').checked;   // Wave 15
      s.parent.negatives = document.getElementById('negativesCheck').checked;             // Wave 22
      // A choice made HERE is deliberate — mark it so the one-time default-ON
      // migration (engine.js load) never overrides a grown-up's real OFF.
      s.parent.negativesChosen = true;
      MM.engine.save();
      closeModal();
      const n = Object.values(map).filter(Boolean).length;
      UI.log(`👪 Parent settings saved (${n}/${MM.data.PARENT_TOPICS.length} math topics enabled${anyOn ? '' : ' — kept Addition & Subtraction Facts on'}).`);
    };
    // passport buttons wire unconditionally — they must never depend on
    // the bug log having entries (they were briefly inside that guard)
    {
      document.getElementById('passportExport').onclick = () => {
        const json = MM.engine.exportSave();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = `MathQuest-${MM.engine.state.name}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        UI.log(`🛂 ${MM.engine.state.name}'s passport downloaded — keep it somewhere safe!`);
      };
      document.getElementById('passportImport').onclick = () => document.getElementById('passportFile').click();
      document.getElementById('passportFile').onchange = (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const res = MM.engine.importSave(String(r.result));
          if (res.error) return UI.dialog('🛂 Passport', res.error);
          UI.dialog('🛂 Passport accepted!',
            `<b>${res.name}</b> has arrived${res.existed ? ' (replacing the adventurer of the same name here)' : ''}.<br><br>` +
            `Switch adventurers from the title screen (👥 Switch) to play as them.`);
        };
        r.readAsText(f);
      };
    }
    if (MM.engine.canReturnToKingdom()) {
      document.getElementById('goldenReturn').onclick = () => {
        closeModal();
        UI.dialogChoices('👑 Step back through the looking glass?',
          `This steps ${s.name} back through the glass and puts the finished kingdom back — every dungeon cleared, ` +
          `the story complete. <b>Everything ${s.name} collected stays.</b> You can step through the looking glass again any time.`,
          [
            { label: '👑 Yes, step back to the finished kingdom', primary: true, onClick: () => MM.engine.returnToFinishedKingdom() },
            { label: 'Not now', onClick: () => {} },
          ]);
      };
    }
    if (bugs.length) {
      document.getElementById('bugCopy').onclick = () => {
        const report = MM.bugs.report();
        const done = () => { document.getElementById('bugCopy').textContent = '✓ Copied!'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(report).then(done).catch(() => showReportFallback(report));
        } else showReportFallback(report);
      };
      document.getElementById('bugClear').onclick = () => { MM.bugs.clear(); closeModal(); parentSettings(); };
    }
    document.getElementById('pinChange').onclick = () => {
      closeModal();
      pinForm('👪 Change PIN', 'Enter a new parent PIN (4-8 digits).', 'Save', (pin) => {
        if (!/^\d{4,8}$/.test(pin)) {
          document.getElementById('pinWarn').textContent = 'Please use 4 to 8 digits.';
          return;
        }
        s.parent.pin = pin;
        MM.engine.save();
        parentSettings();
      });
    };
  }

  // clipboard can be unavailable on file:// — show the report for manual copy
  function showReportFallback(report) {
    openModal(`
      <h2>🐛 Bug report</h2>
      <div class="dialog-body">
        <p style="font-size:14px">Select all (Cmd/Ctrl-A inside the box) and copy:</p>
        <textarea id="bugText" class="bug-text" readonly>${report.replace(/</g, '&lt;')}</textarea>
      </div>
      <div class="btnrow"><button id="dlgOk" class="primary">Done</button></div>`);
    const ta = document.getElementById('bugText');
    ta.focus(); ta.select();
    document.getElementById('dlgOk').onclick = () => { closeModal(); parentSettings(); };
  }

  // Food button (2026-07-12 playtest): two bars, two buttons — 🧪 Potion
  // refills the ❤️ bar, 🍗 Food refills the stamina bar. Potions are one
  // kind so P is instant; food comes in kinds, so F opens a small chooser.
  // (The 🎒 bag still lists food too — this is a shortcut, not a move.)
  UI.foodMenu = function () {
    if (UI.modalOpen() || MM.battle.active()) return;
    const s = MM.engine.state;
    const rows = MM.data.FOODS
      .filter(f => (s.items.food[f.id] || 0) > 0)
      .map(f => `
        <div class="shop-row">
          <span class="shop-item">${f.emoji} ${f.name} <span class="dim">× ${s.items.food[f.id]}</span></span>
          <span class="shop-stat">+${f.stamina} 🍗</span>
          <button class="shop-buy" data-eat="${f.id}" ${s.stamina >= s.maxStamina ? 'disabled title="Stamina is already full"' : ''}>Eat</button>
        </div>`).join('');
    openModal(`
      <h2>🍗 Food</h2>
      <div class="dialog-body">
        <div class="shop-gold">Stamina: <b>${s.stamina}/${s.maxStamina}</b>${s.stamina <= 0 ? ' — <b>exhausted!</b> (You can always still walk.)' : ''}</div>
        ${rows || `<p class="dim">Your bag has no food right now — the 🏪 shop sells plenty.
          ${s.stamina < s.maxStamina ? 'Resting at the 🛏 inn also restores you, no snacks required.' : ''}</p>`}
      </div>
      <div class="btnrow"><button id="foodClose" class="secondary">Close</button></div>`);
    document.getElementById('foodClose').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('[data-eat]').forEach(b => {
      b.onclick = () => { MM.engine.eat(b.dataset.eat); closeModal(); UI.foodMenu(); };
    });
  };

  // Progressive help (2026-07-12 playtest, twice revised): the old help was
  // one wall of everything at once — Spire gear-gates explained to a kid
  // still in the first meadow, while the thing she actually needed ("the
  // shop sells power") drowned in the middle. Two rules now:
  // 1. Sections wait for their system to exist in the kid's world (gates
  //    only ever ADD as the save progresses — nothing she's read ever
  //    disappears on her).
  // 2. Visual calm: grouped under h3 headings, ONE bolded lead term per
  //    entry (it works as a mini-heading), no bold scattered mid-sentence.
  // "If you lose" sits in the basics on purpose: it's the first question
  // the failure-averse kid brings to this menu, and the answer is kind.
  UI.helpDialog = function () {
    if (UI.modalOpen()) return;
    const s = MM.engine.state || {};
    const goldBadges = Object.values(s.badges || {}).filter(t => t >= 3).length;
    const groups = [
      { title: 'The basics', entries: [
        { when: true, html: `<b>🧭 Explore.</b> Arrow keys or WASD. Bump into things to talk,
           open, and search.` },
        { when: true, html: s.stance === 'soothe'
        ? `<b>🕊 Battles, your way.</b> Each round is one quick math problem. Get it right and
           the tangle in the monster comes a little looser. Then it lashes out anyway — it's
           still frightened — your armor blocks part of that, and a right answer may dodge the
           rest. A wrong answer just misses, and shows you the worked solution. Fully calmed
           monsters <b>settle down right there as friends</b>, wearing a little 🤍.
           <span class="dim">(You face the tangles gently — the ⚙️ button can change your way.)</span>`
        : `<b>⚔ Battles, your way.</b> Each round is one quick math problem. Get it right
           and your strike lands. Then the monster swings back — your armor blocks part of it,
           and a right answer may dodge the rest. A wrong answer just misses, and shows you the
           worked solution.
           <span class="dim">(You face the tangles boldly — the ⚙️ button can change your way,
           and the gentle way turns monsters into friends.)</span>` },
      { when: true, html: `<b>⚡ Brave.</b> A toggle in every battle: the <b>hardest</b> questions,
           and every right answer counts <b>double</b>. Getting one wrong costs nothing extra —
           bravery is never a trap.` },
        { when: true, html: `<b>😵 If you lose a fight…</b> nothing you've earned is lost. You
           wake up outside the castle, patched up, keeping every level, badge, and item — it
           only costs half the gold in your pocket. The monster will still be there. Next time,
           you'll be readier.` },
        { when: true, html: `<b>🏃 Running away</b> is always allowed — but the monster fully
           recovers while you run, so you can't skip the hard questions for free.` },
        { when: true, html: `<b>🐢 No timers.</b> Take all the time you need — careful beats
           fast.` },
      ]},
      { title: 'Growing stronger', entries: [
        { when: true, html: `<b>🗡 Gear.</b> Your weapon decides how hard every correct answer
           hits; your armor decides how much of every monster hit gets blocked. The 🏪 shop
           sells better gear as you earn gold — upgrading is how you grow stronger between
           levels.` },
        { when: true, html: `<b>🔥 Streaks.</b> 3 correct in a row = +2 damage, 6 = +4. At 5+
           you can land critical hits for double damage!` },
        { when: true, html: `<b>🥉 Badges.</b> Every math topic has bronze, silver, and gold
           badges — earn them with correct answers. Your badge shelf lives in the 🎒 bag${
             goldBadges ? '.' : ', and gold badges unlock something special…'}` },
        { when: goldBadges >= 1, html: `<b>📖 Spells.</b> Gold badges unlock utility spells,
           shown in the sidebar as each arrives: 🔍 Scout (3 gold badges — hidden walls shimmer,
           once per dungeon visit), ⚡ Blink (6 gold badges, 10 stamina — walk toward what you
           want to hop over, then click Blink to land on the far side), 🕯 Beacon (gold in every
           enabled topic — return to the dungeon entrance, once per visit). Spells only work
           inside a dungeon, and they never fight for you — only mastery earns exploration
           power.` },
      ]},
      { title: 'Out in the world', entries: [
        { when: true, html: `<b>🍗 Stamina.</b> Walking and fighting make you tired — at zero,
           you hit for half and can't dodge, but you can always still walk. Home is never out
           of reach. The 🍗 Food button (F) has snacks, and the 🛏 inn restores everything.` },
        { when: true, html: `<b>🧠 The big questions</b> live where nothing is attacking you:
           boss fights, doors, chests, and the seal on each new dungeon.` },
        { when: true, html: `<b>🎁 Chests</b> hold gold, food, potions, and treasures to sell at
           the shop${(s.items && s.items.charms || []).length
             ? ` — and, rarely, ✨ magical charms. Collect them all, wear three at a time
                (choose them in your 🎒 bag).`
             : ` — and, just maybe, something rarer.`}` },
        { when: true, html: `<b>🪧 The notice board</b> by the castle posts small jobs with gold
           rewards, fresh every morning.` },
        { when: true, html: `<b>📕 The Monster Book (M)</b> fills in a card for each kind of
           monster you defeat. Can you discover them all?` },
        { when: (s.taskIndex || 1) >= 2, html: `<b>🪢 The Rope of Return</b> is sold at every
           shop — use it from your 🎒 bag inside a dungeon to climb straight back out.` },
        { when: !!(s.isles && s.isles.lampLit), html: `<b>⚙ Gear plates &amp; gates.</b> In the
           Clockwork Spire, three brass gates are marked •, •• and ••• — only one is open at a
           time. Bump the ⚙ gear plate to turn the mechanism: it always shows the pips of the
           gate that's open now, and the gate that just opened glints. Nothing is ever lost —
           cycle it as many times as you like.` },
      ]},
    ];
    const body = groups.map(g => {
      const entries = g.entries.filter(e => e.when);
      if (!entries.length) return '';
      return `<h3>${g.title}</h3>` + entries.map(e => `<p class="help-p">${e.html}</p>`).join('');
    }).join('');
    UI.dialog('📖 How to play', body);
  };

  // ---------- the problem modal (doors, chests, inn, shop) ----------
  // opts: {header, problem, leaveLabel, onAnswer(correct)->{msg, end?}, onNext(), onEnd(kind)}
  // ---------- the Practice Yard (the Tutor) ----------
  function listParts(parts) {
    if (!parts || !parts.length) return 'nothing';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }
  function yardResultMsg(card, correct, N, res) {
    const starWord = ['no star yet', 'a <b>Bronze ★</b>', 'a <b>Silver ★★</b>', 'a <b>Gold ★★★</b>'][res.star];
    const stars = '★'.repeat(res.star) + '☆'.repeat(3 - res.star);
    // a celebratory banner when something is actually earned
    let banner = '';
    if (res.milestones && res.milestones.length) {
      banner = `<div class="yard-cheer big">🎉 ${res.milestones.map(m => m.milestone.name).join(' + ')}! 🎉</div>`;
    } else if (res.star === 3 && res.up) {
      banner = `<div class="yard-cheer">🌟 GOLD! ${card.label} mastered! 🌟</div>`;
    } else if (res.up) {
      banner = `<div class="yard-cheer">⭐ New star! ⭐</div>`;
    }
    let msg = banner + `<b>${correct}/${N} correct.</b> `;
    if (res.up) msg += `You earned ${starWord} on ${card.label}! <i>${MM.data.pick(MM.data.TUTOR.starCheers)}</i>`;
    else if (res.clean) msg += `${card.label} is already <b>gold ★★★</b> — mastered.`;
    else msg += `${card.label}: ${stars}. <span class="dim">A clean run — all ${N} right — earns the next ★.</span>`;
    if (res.challengeDone && res.challengeParts) {
      msg += `<br><br>🎯 <b>Challenge complete!</b> ${MM.data.TUTOR.challengeDone} You get ${listParts(res.challengeParts)}.`;
    }
    for (const m of (res.milestones || [])) {
      msg += `<br><br>🏆 <b>${m.milestone.name}!</b> ${m.milestone.line}<br>You receive ${listParts(m.parts)}.`;
      if (m.gotHat) msg += ` <i>${MM.engine.hasPet() ? MM.data.TUTOR.hatPet : MM.data.TUTOR.hatNoPet}</i>`;
    }
    return msg;
  }
  function runYardDrill(cardId) {
    const card = MM.data.yardCardById(cardId);
    const N = 8;
    let i = 0, correct = 0;
    const step = () => {
      const prob = MM.problems.yardDrill(cardId);
      UI.showProblem({
        header: `🎓 <b>${card.emoji} ${card.label}</b> — question ${i + 1} of ${N}`,
        problem: prob,
        leaveLabel: 'Stop for now',
        onAnswer(ok) {
          if (ok) correct++;
          i++;
          if (i >= N) {
            const res = MM.engine.yardComplete(cardId, correct, N);
            // a bright jingle for a new star; milestones already fanfare (engine)
            if (!(res.milestones && res.milestones.length) && res.up) MM.sound.levelup();
            return { msg: yardResultMsg(card, correct, N, res), end: 'done' };
          }
          return { msg: ok ? '✓ Nice.' : "That's okay — next one." };
        },
        onNext: step,
        onEnd() { UI.practiceYard(); },
      });
    };
    step();
  }
  UI.yardCardIntro = function (cardId, isChallenge) {
    const c = MM.data.yardCardById(cardId);
    const stars = MM.engine.yardStar(cardId);
    UI.dialogChoices(`${c.emoji} ${c.label}`,
      `<b>The Tutor:</b> "${c.tip}"<br><br>` +
      (isChallenge ? "<i>This is today's challenge — clear it for a reward.</i><br><br>" : '') +
      `Your stars: <b>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</b> &nbsp; <span class="dim">(8 quick questions)</span>`,
      [
        { label: '✏️ Start the drill', primary: true, onClick: () => runYardDrill(cardId) },
        { label: 'Back to the wall', onClick: () => UI.practiceYard() },
      ]);
  };
  UI.practiceYard = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const D = MM.data;
    const firstVisit = !s.yard.seen;
    if (firstVisit) { s.yard.seen = true; MM.engine.save(); }
    const rec = MM.engine.yardRecommended();
    const ch = MM.engine.yardChallenge();
    const chCard = D.yardCardById(ch.card);
    const cardBtn = c => {
      const unlocked = MM.engine.yardUnlocked(c.id);
      const n = MM.engine.yardStar(c.id);
      const stars = '★'.repeat(n) + '☆'.repeat(3 - n);
      if (!unlocked) {
        const need = c.prereq.map(p => D.yardCardById(p).label).join(' & ');
        return `<button class="yard-card locked" disabled>${c.emoji} ${c.label}<span class="yard-lock">🔒 after ${need}</span></button>`;
      }
      const isRec = c.id === rec;
      return `<button class="yard-card${isRec ? ' rec' : ''}" data-card="${c.id}">${c.emoji} ${c.label}<span class="yard-stars">${stars}</span>${isRec ? '<span class="yard-rec">next ◀</span>' : ''}</button>`;
    };
    const sense = D.YARD_CARDS.filter(c => c.track === 'sense').map(cardBtn).join('');
    const tables = D.YARD_CARDS.filter(c => c.track === 'tables').map(cardBtn).join('');
    const cr = MM.engine.YARD_CHALLENGE_REWARD;
    const rewardStr = `🧪 ${cr.potions} potion${cr.potions > 1 ? 's' : ''}, 🍗 ${cr.food} food and 💰 ${cr.gold} gold`;
    const challengeLine = ch.done
      ? `<p class="dim">✓ Today's challenge is done — come back tomorrow for a fresh one.</p>`
      : `<p>${D.TUTOR.challengeIntro} <b>${chCard.emoji} ${chCard.label}</b>." <button id="yardChallenge" class="primary">Take it on</button></p>
         <p class="dim">Clear it and the Tutor pays you <b>${rewardStr}</b>.</p>`;
    openModal(`
      <h2>🎓 The Practice Yard</h2>
      <div class="dialog-body">
        <p>${firstVisit ? D.TUTOR.intro : D.TUTOR.return}</p>
        <div class="shop-sec shop-sec-bold">
          <h3>🎯 The Tutor's daily challenge</h3>
          ${challengeLine}
        </div>
        <div class="shop-sec shop-sec-gentle">
          <h3>➕ Number sense <span class="dim">— the foundations</span></h3>
          <div class="yard-wall">${sense}</div>
        </div>
        <div class="shop-sec shop-sec-ring">
          <h3>✖️ Times tables</h3>
          <div class="yard-wall">${tables}</div>
        </div>
        <p class="dim">The Tutor points you at your <b>next</b> card, but drill any unlocked one you like. Every ★ is a <b>clean run</b> — all 8 right. Three clean runs (★★★) masters a card.</p>
      </div>
      <div class="btnrow"><button id="yardClose" class="secondary">Close</button></div>`);
    document.querySelectorAll('.yard-card[data-card]').forEach(b => {
      b.onclick = () => { const id = b.dataset.card; closeModal(); UI.yardCardIntro(id, id === ch.card && !ch.done); };
    });
    const chBtn = document.getElementById('yardChallenge');
    if (chBtn) chBtn.onclick = () => { closeModal(); UI.yardCardIntro(ch.card, true); };
    document.getElementById('yardClose').onclick = () => { closeModal(); UI.refresh(); };
  };

  // ================= Wave 15: "The Parlor" — the card game UI =================
  // The board and cards are rendered as HTML in the modal (legible at any
  // scale, and the edge numbers sit clearly ON a bordered card with a creature
  // in the middle — never loose digits on the floor, the numeral-hazard the
  // wave warns about). The pure rules live in MM.parlor; the rewards in engine.
  const PARLOR_STYLE = `<style>
    .pboard{display:grid;grid-template-columns:repeat(3,64px);grid-gap:6px;justify-content:center;margin:12px auto}
    .pcell{width:64px;height:64px;border-radius:8px;box-sizing:border-box;display:flex;align-items:center;justify-content:center}
    .pcell.empty{border:2px dashed #57506a;background:#221d38;cursor:pointer}
    .pcell.empty.armed:hover{border-color:#ffd94a;background:#2c2648}
    .pcard{position:relative;width:60px;height:60px;border:2px solid #8a7f68;border-radius:8px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
    .pcard img{image-rendering:pixelated}
    .pcard.sel{outline:3px solid #ffd94a;outline-offset:1px}
    .pcard.flip{animation:pflip .4s ease}
    @keyframes pflip{0%{transform:scale(1)}50%{transform:scale(1.18) rotate(3deg)}100%{transform:scale(1)}}
    .pedge{position:absolute;font-size:12px;font-weight:bold;color:#f4f0e6;text-shadow:0 1px 2px #000;line-height:1}
    .pe-t{top:1px;left:50%;transform:translateX(-50%)}
    .pe-b{bottom:1px;left:50%;transform:translateX(-50%)}
    .pe-l{left:3px;top:50%;transform:translateY(-50%)}
    .pe-r{right:3px;top:50%;transform:translateY(-50%)}
    .phat{position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:15px}
    .phand{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:10px 0}
    .phand .pcard{cursor:pointer}
    .ptally{text-align:center;font-size:15px;margin:4px 0}
    .ptally .you{color:#7ea8ff}.ptally .opp{color:#e88aa0}
  </style>`;

  function parlorCardHTML(card, side, opts) {
    opts = opts || {};
    let img = '';
    try { img = MM.sprites.get(card.sprite, { palette: card.pal || {}, scale: 3 }).toDataURL(); } catch (e) { img = ''; }
    const border = side === 'you' ? '#3d6bb8' : side === 'opp' ? '#a83a4a' : '#8a7f68';
    const bg = side === 'you' ? '#25314a' : side === 'opp' ? '#3a2430' : '#2a2438';
    const e = card.edges;
    const hat = card.hat ? `<div class="phat">${card.hat}</div>` : '';
    return `<div class="pcard${opts.sel ? ' sel' : ''}${opts.flip ? ' flip' : ''}" ` +
      `style="background:${bg};border-color:${border}" ${opts.attr || ''}>` +
      hat +
      `<div class="pedge pe-t">${e.t}</div><div class="pedge pe-r">${e.r}</div>` +
      `<div class="pedge pe-b">${e.b}</div><div class="pedge pe-l">${e.l}</div>` +
      `<img src="${img}" width="40" height="40" alt="">` +
      `</div>`;
  }

  // The parlor hub — Deuce's menu (bump the dealer 'D').
  UI.parlorHub = function () {
    const s = MM.engine.state;
    const par = MM.engine.ensureParlor();
    const D = MM.data.PARLOR.dealer;
    const talk = MM.data.pick(MM.data.PARLOR.trashTalk);
    const body = `${D.hub}<br><br><span class="dim">🪙 Tokens: <b>${par.tokens}</b> · ` +
      `🎴 Games: <b>${par.games}</b> · 🏆 Won cards: <b>${Object.keys(par.album).length}</b></span>` +
      `<br><br><i>"${talk}"</i>`;
    UI.dialogChoices(D.name, body, [
      { label: '🃏 Play a round', primary: true, onClick: () => UI.parlorPlay() },
      { label: '🏆 My collection', onClick: () => UI.parlorAlbum() },
      { label: '🪙 Token table', onClick: () => UI.parlorShop() },
      { label: '🎲 Reach 20 (dice)', onClick: () => UI.parlorDice() },
      { label: 'Maybe later', onClick: () => {} },
    ]);
  };

  // Start (or resume) a match and render the board.
  UI.parlorPlay = function () {
    const m = (MM.parlor.current && !MM.parlor.isOver(MM.parlor.current)) ? MM.parlor.current : MM.engine.parlorNewMatch();
    UI.parlorShowBoard(m);
  };

  // Render the current match. Kid selects a hand card, then clicks an empty
  // cell; the deterministic opponent replies; captures animate; on a full
  // board the match settles (tokens, sometimes a card — never a scold).
  UI.parlorShowBoard = function (m) {
    MM.parlor.current = m;
    let sel = -1;                 // selected hand index
    let flipCells = [];           // cells that just flipped (for the animation)
    const render = () => {
      const tally = MM.parlor.score(m);
      const armed = sel >= 0 && m.turn === 'you';
      const cells = [];
      for (let i = 0; i < 9; i++) {
        const occ = m.board[i];
        if (occ) cells.push(`<div class="pcell">${parlorCardHTML(occ.card, occ.side, { flip: flipCells.includes(i) })}</div>`);
        else cells.push(`<div class="pcell empty${armed ? ' armed' : ''}" data-cell="${i}"></div>`);
      }
      const hand = m.hands.you.map((c, i) =>
        parlorCardHTML(c, 'you', { sel: i === sel, attr: `data-hand="${i}"` })).join('');
      openModal(`${PARLOR_STYLE}
        <h2>🃏 Tiny Hats</h2>
        <div class="ptally"><span class="you">You ${tally.you}</span> &nbsp;·&nbsp; <span class="opp">Deuce ${tally.opp}</span></div>
        <div class="dialog-body" style="text-align:center">
          <div class="dim" style="font-size:13px">${m.turn === 'you' ? (sel < 0 ? 'Pick a card, then tap a square. Bigger edge takes the neighbor.' : 'Now tap an empty square.') : 'Deuce is thinking…'}</div>
          <div class="pboard">${cells.join('')}</div>
          <div class="phand">${hand}</div>
        </div>
        <div class="btnrow"><button id="pLeave" class="secondary">Leave the table</button></div>`);
      document.getElementById('pLeave').onclick = () => { closeModal(); UI.refresh(); };
      document.querySelectorAll('#modalBox .phand .pcard').forEach(el => {
        el.onclick = () => { sel = +el.dataset.hand; flipCells = []; render(); };
      });
      document.querySelectorAll('#modalBox .pcell.empty').forEach(el => {
        el.onclick = () => {
          if (sel < 0 || m.turn !== 'you') return;
          onKidPlace(+el.dataset.cell);
        };
      });
    };
    const onKidPlace = (cell) => {
      const idx = sel; sel = -1;
      if (!MM.parlor.play(m, 'you', idx, cell)) { sel = -1; return render(); }
      flipCells = m.lastFlips.slice();
      if (m.lastFlips.length) MM.sound.coin(); else MM.sound.whoosh();
      render();
      if (MM.parlor.isOver(m)) return setTimeout(finish, 450);
      // the deterministic opponent replies after a short beat
      setTimeout(() => {
        if (m.turn === 'opp' && m.hands.opp.length) {
          MM.parlor.oppPlay(m);
          flipCells = m.lastFlips.slice();
          if (m.lastFlips.length) MM.sound.coin();
          render();
        }
        if (MM.parlor.isOver(m)) setTimeout(finish, 450);
      }, 420);
    };
    const finish = () => {
      const res = MM.engine.parlorFinishMatch(m);
      const P = MM.data.PARLOR;
      let body;
      if (res.result === 'you') { MM.sound.fanfare(); body = MM.data.pick(P.winLines); }
      else if (res.result === 'opp') { MM.sound.thud(); body = MM.data.pick(P.lossLines); }
      else { body = MM.data.pick(P.tieLines); }
      body += `<br><br><span class="dim">🪙 +${res.tokensGained} token${res.tokensGained === 1 ? '' : 's'} for playing` +
        `${res.result === 'you' ? ' and winning' : ''}. (A loss never costs a thing.)</span>`;
      if (res.wonCard) body += `<br><br>${P.cardWon}`;
      for (const post of (res.claimed || [])) body += `<br><br>${post.spawnLine}`;
      MM.parlor.current = null;
      UI.dialogChoices('🃏 ' + (res.result === 'you' ? 'You win!' : res.result === 'opp' ? 'Good game' : 'A draw'), body, [
        { label: '🔁 Another round', primary: true, onClick: () => UI.parlorPlay() },
        { label: 'Back to the felt', onClick: () => {} },
      ]);
    };
    render();
  };

  // The card album — trophies won from opponents (reuses the Monster Book idiom).
  UI.parlorAlbum = function () {
    const par = MM.engine.ensureParlor();
    const A = MM.data.PARLOR.album;
    const kinds = Object.keys(par.album);
    const twoDigit = MM.parlor.twoDigit(MM.engine.state);
    let grid;
    if (!kinds.length) grid = `<p class="dim">${A.empty}</p>`;
    else {
      const cards = kinds.map(k => {
        const card = MM.parlor.cardFor(k, twoDigit, true);   // won cards wear a hat
        return `<div style="text-align:center"><div style="display:inline-block">${parlorCardHTML(card, null, {})}</div>` +
          `<div style="font-size:11px" class="dim">${k}</div></div>`;
      }).join('');
      grid = `<p class="dim">${A.intro}</p><p>${A.countLine(kinds.length)}</p>` +
        `<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">${cards}</div>`;
    }
    openModal(`${PARLOR_STYLE}
      <h2>${A.title}</h2>
      <div class="dialog-body">${grid}</div>
      <div class="btnrow"><button id="pAlbumClose" class="primary">Close</button></div>`);
    document.getElementById('pAlbumClose').onclick = () => { closeModal(); UI.refresh(); };
  };

  // The token table — cosmetic card-backs only (tokens, never gold).
  UI.parlorShop = function () {
    const par = MM.engine.ensureParlor();
    const S = MM.data.PARLOR.shop;
    const rows = (MM.data.PARLOR.backs || []).map(b => {
      const owned = par.back === b.id;
      const canBuy = !owned && par.tokens >= b.price;
      return `<div class="shop-row${owned ? ' owned' : ''}">
        <span class="shop-item">🂠 ${b.name}<span class="quip">${S.backLine}</span></span>
        <span class="shop-price">${b.price === 0 ? 'free' : b.price + ' 🪙'}</span>
        ${owned ? '<span class="shop-buy">✓ in use</span>' : `<button class="shop-buy pback" data-id="${b.id}" ${canBuy ? '' : 'disabled'}>Use</button>`}
      </div>`;
    }).join('');
    openModal(`
      <h2>${S.title}</h2>
      <div class="dialog-body">
        <p style="font-size:13.5px">${S.intro}</p>
        <p class="dim">🪙 Tokens: <b>${par.tokens}</b></p>
        ${rows}
      </div>
      <div class="btnrow"><button id="pShopClose" class="primary">Close</button></div>`);
    document.getElementById('pShopClose').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('#modalBox .pback').forEach(btn => {
      btn.onclick = () => {
        const ok = MM.engine.parlorBuyBack(btn.dataset.id);
        if (ok) { MM.sound.coin(); UI.log(MM.data.PARLOR.shop.bought((MM.data.PARLOR.backs.find(b => b.id === btn.dataset.id) || {}).name)); }
        UI.parlorShop();
      };
    });
  };

  // The Games Den side-table: "reach 20, don't go over" — pure mental addition.
  UI.parlorDice = function () {
    const D = MM.data.PARLOR.dice;
    let rolls = [];
    const roll = () => 1 + Math.floor(Math.random() * 6);
    const render = () => {
      const total = MM.parlor.diceTotal(rolls);
      const bust = total > 20;
      const faces = rolls.length ? rolls.map(r => `<span style="font-size:26px">${'⚀⚁⚂⚃⚄⚅'[r - 1]}</span>`).join(' ') : '<span class="dim">— roll to begin —</span>';
      openModal(`
        <h2>${D.title}</h2>
        <div class="dialog-body" style="text-align:center">
          <p style="font-size:13.5px">${D.intro}</p>
          <div style="margin:14px 0">${faces}</div>
          <div style="font-size:22px">Running total: <b style="color:${bust ? '#e88aa0' : '#7ee0e8'}">${total}</b>${bust ? ' — bust!' : ''}</div>
          <p class="dim" style="font-size:12.5px">${D.prompt}</p>
        </div>
        <div class="btnrow">
          ${bust ? '' : '<button id="pRoll" class="primary">🎲 Roll</button>'}
          ${rolls.length && !bust ? '<button id="pHold" class="secondary">✋ Hold</button>' : ''}
          <button id="pDiceClose" class="secondary">Leave</button>
        </div>`);
      const rb = document.getElementById('pRoll');
      if (rb) rb.onclick = () => { rolls.push(roll()); MM.sound.whoosh(); render(); };
      const hb = document.getElementById('pHold');
      if (hb) hb.onclick = () => settle(total);
      document.getElementById('pDiceClose').onclick = () => {
        if (bust) settle(total); else { closeModal(); UI.refresh(); }
      };
      if (bust) { MM.sound.thud(); }
    };
    const settle = (total) => {
      const reward = MM.engine.parlorDiceAward(total);
      const P = MM.data.PARLOR.dice;
      let msg = total > 20 ? P.bust : total === 20 ? P.jackpotLine : P.holdLine(total);
      if (reward) { msg += `<br><br><span class="dim">🪙 +${reward} token${reward === 1 ? '' : 's'}.</span>`; MM.sound.coin(); }
      UI.dialogChoices('🎲 Reach 20', msg, [
        { label: '🔁 Again', primary: true, onClick: () => UI.parlorDice() },
        { label: 'Back to the felt', onClick: () => {} },
      ]);
    };
    render();
  };

  UI.showProblem = function (opts) {
    MM.track('problem ' + (opts.problem && opts.problem.skill) + '/' + (opts.problem && opts.problem.kind));
    const p = opts.problem;
    UI.current = p; // exposed for tests (like MM.battle.current)
    openModal(`
      <div class="prob-header">${opts.header}</div>
      ${p.svg ? `<div class="prob-svg">${p.svg}</div>` : ''}
      <div class="prob-text">${p.text.replace(/\n/g, '<br>')}</div>
      <div id="probForm"></div>
      <div id="feedback" class="feedback"></div>
      <div class="scratch-wrap">
        <div class="scratch-label">✏️ Scratch space — work it out here <button id="scratchClear" class="mini">clear</button></div>
        <canvas id="scratch" width="520" height="150"></canvas>
      </div>
      <div class="btnrow">
        <button id="leaveBtn" class="secondary">${opts.leaveLabel || 'Leave'}</button>
      </div>`);

    UI.setupScratchpad();
    const feedback = document.getElementById('feedback');
    const leaveBtn = document.getElementById('leaveBtn');
    leaveBtn.onclick = () => { closeModal(); opts.onEnd && opts.onEnd('leave'); };

    UI.buildProblemForm(document.getElementById('probForm'), p, (correct, kidAnswer) => {
      if (correct) MM.sound.correct(); else MM.sound.wrong();
      const result = opts.onAnswer(correct, kidAnswer) || {};
      let html = correct
        ? `<div class="right">✓ Correct!</div>`
        : `<div class="wrong">✗ Not quite.</div><div class="solution">${p.solution}</div>`;
      if (result.msg) html += `<div class="result-msg">${result.msg}</div>`;
      feedback.innerHTML = html;
      leaveBtn.style.display = 'none';
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = result.end ? 'Continue ➜' : 'Next ➜';
      btn.onclick = () => {
        if (result.end) { closeModal(); opts.onEnd && opts.onEnd(result.end); }
        else opts.onNext();
      };
      document.querySelector('#modalBox .btnrow').appendChild(btn);
      // Defer focus: focusing synchronously inside the Enter keydown handler
      // lets the SAME keystroke click this button — skipping the feedback (and
      // the worked solution after a miss) before the kid can read it.
      setTimeout(() => btn.focus(), 80);
      UI.renderSidebar();
    });
  };

  // ---------- shop ----------
  // Tabs (carry-over rework, playtest 2026-07-11): the shop got big enough
  // that everything on one screen was a wall. shopTab is module state, not
  // s.-persisted — it just remembers the active tab while the shop stays
  // open this session (every buy/sell reopens via UI.openShop() with no
  // args, so the tab sticks through a purchase); defaults to Gear.
  let shopTab = 'gear';
  const compareToEquipped = (slot, item) => {
    if (!MM.data.GEAR[slot]) return '';
    const eq = MM.engine.equippedItem(slot);
    if (!eq) return '';
    if (slot === 'ring' || slot === 'amulet') {
      return ` <span class="shop-compare">wearing: ${eq.name}</span>`;
    }
    const curVal = slot === 'weapon' ? eq.atk : (eq.def || 0);
    const newVal = slot === 'weapon' ? item.atk : (item.def || 0);
    const arrow = newVal > curVal ? '▲' : newVal < curVal ? '▼' : '=';
    const cls = newVal > curVal ? 'better' : newVal < curVal ? 'worse' : '';
    const dodge = (item.dodge || eq.dodge) ? ` · +${eq.dodge || 0}% dodge` : '';
    return ` <span class="shop-compare ${cls}">· you: ${curVal}${dodge} ${arrow}</span>`;
  };
  UI.openShop = function () {
    MM.track('openShop');
    const s = MM.engine.state;
    const row = (item, kind, owned) => `
      <div class="shop-row${owned ? ' owned' : ''}">
        <span class="shop-item">${item.emoji} ${item.name}${item.quip ? `<span class="quip">${item.quip}</span>` : ''}</span>
        <span class="shop-stat">${MM.data.GEAR[kind] ? MM.data.gearStat(kind, item) : kind === 'food' ? '+' + item.stamina + ' 🍗' : kind === 'mystery' ? '???' : kind === 'treat' ? '🐾' : kind === 'rope' ? 'exit any dungeon' : '+' + item.heal + ' HP'}${owned ? '' : compareToEquipped(kind, item)}</span>
        <span class="shop-price">${item.price} g</span>
        ${owned ? '<span class="shop-buy">✓ owned</span>' : `<button class="shop-buy" data-kind="${kind}" data-id="${item.id || 'potion'}" ${s.gold < item.price ? 'disabled' : ''}>Buy</button>`}
      </div>`;
    // Wave 6.5: shops key off "is this the mainland?", not "is this
    // specifically the Isles" — the old check made Gullwrack's shop sell
    // MAINLAND stock under the mainland's name. Horologe and Chime get
    // dockside supply CARTS (buy-only, no gear, no sell counter) so no
    // island leaves a kid unable to restock potions and food.
    const isleTier = s.mapId !== 'world';
    const cart = s.mapId === 'horologe' || s.mapId === 'chime';
    const SHOP_NAMES = {
      world: '🏪 Numeria General Store', isles: '🧭 The Brass Compass',
      gullwrack: '⚓ The Gullwrack Chandlery',
      horologe: '🛒 The Dockside Cart', chime: '🛒 The Dockside Cart',
    };
    const onIsles = isleTier; // legacy name used below
    // v1.7.1 (playtest 2026-07-13, "looking at the shop is overwhelming"):
    // every section sits in its own softly tinted block, so the rack reads
    // as rooms in a shop rather than one long ledger. Pure presentation —
    // ordering, rows, and buttons are untouched.
    const sec = (tint, inner) => inner ? `<div class="shop-sec shop-sec-${tint}">${inner}</div>` : '';
    const gearSection = (slot, blurb, tint) => {
      // v1.7.3: racks always read cheapest-first, whatever the data array's
      // order (playtest caught the Singing Bowl filed before the cheaper
      // wand — sorting at render makes that class of slip impossible)
      const items = MM.data.GEAR[slot].filter(it => it.price > 0 && !it.notForSale && !!it.isle === onIsles)
        .sort((a, b) => a.price - b.price)
        .map(it => row(it, slot, (s.gear[slot] || []).includes(it.id))).join('');
      return items ? sec(tint || 'armor', `<h3>${MM.data.SLOT_NAMES[slot]} — ${blurb}</h3>${items}`) : '';
    };
    // ---------- Wave 8b: the weapon rack, organized by stance ----------
    // ORGANIZED, never FILTERED. The kid's own kind of instrument is listed
    // first under a warm header; everything else sits right below it, fully
    // visible and fully buyable. Any stance may wield any weapon — a gentle kid
    // who wants the battle axe gets the battle axe, and it works exactly as
    // well. Identity is offered here, never enforced.
    const weaponRack = () => {
      const all = MM.data.GEAR.weapon.filter(it => it.price > 0 && !it.notForSale && !!it.isle === onIsles);
      if (!all.length) return '';
      const owned = it => (s.gear.weapon || []).includes(it.id);
      const byPrice = (a, b) => a.price - b.price; // cheapest first, always (v1.7.3)
      const gentle = all.filter(it => it.gentle).sort(byPrice);
      const bold = all.filter(it => !it.gentle).sort(byPrice);
      if (!gentle.length || !bold.length) return gearSection('weapon', 'hit harder with every correct answer', 'bold');
      const softFirst = MM.engine.isSoothing();
      const groups = [
        { on: softFirst, head: '🕊 For gentle hands', items: gentle, tint: 'gentle' },
        { on: !softFirst, head: '⚔️ For bold arms', items: bold, tint: 'bold' },
      ].sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0));   // the kid's kind, first
      return groups.map(g =>
        sec(g.tint, `<h3>${g.head}</h3>${g.items.map(it => row(it, 'weapon', owned(it))).join('')}`)).join('');
    };
    const food = MM.data.FOODS.map(f => row(f, 'food', false)).join('');
    // Bulk potion buying: ×5 / ×10 always shown now (carry-over rework —
    // previously gated on lifetime-purchase thresholds), disabled only when
    // gold is short — one money problem per transaction no matter the
    // quantity (1.5a).
    const bulkQtys = [5, 10];
    const potionRow = `
      <div class="shop-row">
        <span class="shop-item">${MM.data.POTION.emoji} ${MM.data.POTION.name}${MM.data.POTION.quip ? `<span class="quip">${MM.data.POTION.quip}</span>` : ''}</span>
        <span class="shop-stat">+${MM.data.POTION.heal} HP</span>
        <span class="shop-price">${MM.data.POTION.price} g</span>
        <button class="shop-buy" data-kind="potion" data-id="potion" data-qty="1" ${s.gold < MM.data.POTION.price ? 'disabled' : ''}>Buy</button>
        ${bulkQtys.map(q => `<button class="shop-buy" data-kind="potion" data-id="potion" data-qty="${q}" ${s.gold < MM.data.POTION.price * q ? 'disabled' : ''}>×${q}</button>`).join('')}
      </div>${row(MM.data.ROPE, 'rope', false)}`;
    // the Hearthmoss Charm (1.5d): sold here, deterministic for a kid who
    // wants it — it also drops from chests like any other charm
    const hearthmoss = MM.data.charmById('hearthmoss');
    const ownsHearthmoss = (s.items.charms || []).includes('hearthmoss');
    const hearthmossRow = `
      <div class="shop-row${ownsHearthmoss ? ' owned' : ''}">
        <span class="shop-item">${hearthmoss.emoji} ${hearthmoss.name}<span class="quip">${hearthmoss.desc}</span></span>
        <span class="shop-price">${hearthmoss.price} g</span>
        ${ownsHearthmoss ? '<span class="shop-buy">✓ owned</span>' : `<button class="shop-buy" data-kind="charm" data-id="hearthmoss" ${s.gold < hearthmoss.price ? 'disabled' : ''}>Buy</button>`}
      </div>`;
    const isleGoods = onIsles
      ? sec('isle', `<h3>Isle specialties</h3>${row(MM.data.MYSTERY, 'mystery', false)}${row(MM.data.TREAT, 'treat', false)}${hearthmossRow}`)
      : '';
    // sellables: treasures at full value, unequipped gear at half price
    const treasureSell = (s.items.treasures || []).map((id, i) => {
      const t = MM.data.treasureById(id);
      return `<div class="shop-row">
        <span class="shop-item">${t.emoji} ${t.name}</span>
        <span class="shop-price">${t.value} g</span>
        <button class="shop-sell" data-sell="${i}">Sell</button>
      </div>`;
    }).join('');
    const gearSell = Object.keys(MM.data.GEAR).flatMap(slot =>
      (s.gear[slot] || [])
        .filter(id => id !== s.equipped[slot])
        .map(id => {
          const it = MM.data.gearById(slot, id);
          if (!it) return '';
          // starter gear (price 0) is sellable too — 1 sentimental gold —
          // so the stick and clothes never clutter the bag forever
          return `<div class="shop-row">
            <span class="shop-item">${it.emoji} ${it.name}</span>
            <span class="shop-price">${Math.max(1, Math.floor(it.price / 2))} g</span>
            <button class="shop-sell" data-sellgear="${slot}:${id}">Sell</button>
          </div>`;
        })).join('');
    const gearTab = `
        ${weaponRack()}
        ${gearSection('body', 'block more of every monster hit')}
        ${gearSection('helmet', 'a bit more block, up top')}
        ${gearSection('boots', 'block — and some help your dodging')}
        ${gearSection('ring', 'one finger, one power — choose!', 'ring')}`;
    const suppliesTab = `
        ${sec('food', `<h3>Food — restores stamina (eat from your 🎒 bag)</h3>${food}`)}
        ${sec('potion', `<h3>Potions & supplies</h3>${potionRow}`)}
        ${isleGoods}`;
    const sellTab = (treasureSell || gearSell)
      ? sec('sell', `<h3>💰 The shopkeeper buys treasures & used gear</h3>${treasureSell}${gearSell}`)
      : `<p class="dim">Nothing to sell right now — treasures and unequipped gear show up here.</p>`;
    // carts are supplies-only: no gear tab, no sell counter
    // carts sell supplies AND buy treasures/gear (user decision 2026-07-11:
    // every sell counter is a word-problem dispenser — buy-only carts
    // withheld math practice, not just convenience). No gear tab, though.
    if (cart && shopTab === 'gear') shopTab = 'supplies';
    const tabContent = shopTab === 'supplies' ? suppliesTab : shopTab === 'sell' ? sellTab : gearTab;
    const tabBtn = (tab, label) => `<button class="shop-tab-btn${shopTab === tab ? ' active' : ''}" data-tab="${tab}">${label}</button>`;
    // Wave 8a (P8, delight catalog): "the shopkeeper puts whatever you just
    // sold on the shelf behind her" — pure decoration, persistent, no carts
    // (they have no sell counter, so nothing to shelve).
    const shelf = (!cart && s.shopShelf && s.shopShelf.length)
      ? `<div class="shop-shelf dim">🗄 On the shelf: ${s.shopShelf.map(it => `${it.emoji} ${it.name}`).join(' · ')}</div>` : '';
    openModal(`
      <h2>${SHOP_NAMES[s.mapId] || SHOP_NAMES.world}</h2>
      <div class="dialog-body">
        <div class="shop-gold">You have <b>💰 ${s.gold} gold</b>. Answer the shopkeeper's question for <b>10% off</b> (or a selling bonus)!
        <br><span class="dim">${cart ? 'A biscuit-tin till and the essentials. The till has learned to count — treasures welcome.' : onIsles ? 'Gear of the deep sea — nothing finer this side of the horizon.' : 'Bought gear goes to your 🎒 bag — used gear sells back for half price.'}</span>
        ${!cart && MM.engine.isSoothing() ? '<br><span class="dim">🕊 "A tamer, are you?" The shopkeeper nods at the rack. "The wand came in Tuesday. Nobody else has looked at it."</span>' : ''}</div>
        ${shelf}
        <div class="shop-tabs">${cart ? tabBtn('supplies', '🧪 Supplies') + tabBtn('sell', '💰 Sell') : tabBtn('gear', '⚔️ Gear') + tabBtn('supplies', '🧪 Supplies') + tabBtn('sell', '💰 Sell')}</div>
        ${tabContent}
      </div>
      <div class="btnrow"><button id="shopClose" class="secondary">Leave shop</button></div>`);
    document.getElementById('shopClose').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('.shop-tab-btn').forEach(b => {
      b.onclick = () => { shopTab = b.dataset.tab; UI.openShop(); };
    });
    document.querySelectorAll('button.shop-buy').forEach(b => {
      b.onclick = () => {
        const qty = +(b.dataset.qty || 1);
        MM.track('shop-click buy ' + b.dataset.kind + ' ' + b.dataset.id + (qty > 1 ? ' x' + qty : ''));
        const kind = b.dataset.kind;
        const item = MM.data.GEAR[kind] ? MM.data.gearById(kind, b.dataset.id)
          : kind === 'food' ? MM.data.foodById(b.dataset.id)
          : kind === 'mystery' ? MM.data.MYSTERY
          : kind === 'treat' ? MM.data.TREAT
          : kind === 'charm' ? MM.data.charmById(b.dataset.id)
          : kind === 'rope' ? MM.data.ROPE
          : MM.data.POTION;
        closeModal();
        MM.engine.buy(item, kind, qty);
      };
    });
    document.querySelectorAll('button.shop-sell').forEach(b => {
      b.onclick = () => {
        MM.track('shop-click sell ' + (b.dataset.sellgear || b.dataset.sell));
        closeModal();
        if (b.dataset.sellgear) {
          const [slot, id] = b.dataset.sellgear.split(':');
          MM.engine.sellGear(slot, id);
        } else {
          MM.engine.sellTreasure(+b.dataset.sell);
        }
      };
    });
  };

  // ---------- Emberlyn the Enchanter (Wave 2: gems + amulets) ----------
  const ENCHANT_SLOTS = ['weapon', 'body', 'helmet', 'boots', 'ring', 'amulet'];
  UI.enchanterDialog = function () {
    MM.track('enchanterDialog');
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const gemCounts = {};
    (s.items.gems || []).forEach(id => gemCounts[id] = (gemCounts[id] || 0) + 1);
    const ownedGemIds = Object.keys(gemCounts);
    const gemSummary = ownedGemIds.length
      ? ownedGemIds.map(id => { const g = MM.data.gemById(id); return `${g.emoji} ${g.name} ×${gemCounts[id]}`; }).join(' &nbsp; ')
      : '<span class="dim">No gems yet — chests sometimes glimmer...</span>';
    const gearRows = ENCHANT_SLOTS.map(slot => {
      const id = s.equipped[slot];
      if (!id) return `<div class="shop-row"><span class="shop-item dim">${MM.data.SLOT_NAMES[slot]} — nothing equipped</span></div>`;
      return `<div class="shop-row">
        <span class="shop-item">${MM.data.SLOT_NAMES[slot]}: ${MM.data.gearLabel(slot, id)}</span>
        <button class="shop-buy" data-fuse-slot="${slot}" ${ownedGemIds.length ? '' : 'disabled'}>Fuse ✨</button>
      </div>`;
    }).join('');
    const amuletRows = MM.data.AMULETS.map(a => {
      const owned = (s.gear.amulet || []).includes(a.id);
      return `<div class="shop-row${owned ? ' owned' : ''}">
        <span class="shop-item">${a.emoji} ${a.name}<span class="quip">${a.bonus} — ${a.quip}</span></span>
        <span class="shop-price">${a.price} g</span>
        ${owned ? '<span class="shop-buy">✓ owned</span>' : `<button class="shop-buy" data-buy-amulet="${a.id}" ${s.gold < a.price ? 'disabled' : ''}>Buy</button>`}
      </div>`;
    }).join('');
    // Wave 3 carry-over: Emberlyn's own ranged weapon
    const bowRows = MM.data.WEAPONS.filter(w => w.id === 'horologebow').map(w => {
      const owned = (s.gear.weapon || []).includes(w.id);
      return `<div class="shop-row${owned ? ' owned' : ''}">
        <span class="shop-item">${w.emoji} ${w.name}<span class="quip">⚔️ ${w.atk} · ranged (round-1 counterattacks always miss) — ${w.quip}</span></span>
        <span class="shop-price">${w.price} g</span>
        ${owned ? '<span class="shop-buy">✓ owned</span>' : `<button class="shop-buy" data-buy-weapon="${w.id}" ${s.gold < w.price ? 'disabled' : ''}>Buy</button>`}
      </div>`;
    }).join('');
    openModal(`
      <h2>🔥 Emberlyn the Enchanter</h2>
      <div class="dialog-body">
        <p>"Bring me a gem and I'll fuse it onto whatever you're wearing. Fair warning — a new gem always replaces the old one, and the old one's gone for good."</p>
        <h3>Your gems</h3>
        <p>${gemSummary}</p>
        <h3>Your gear</h3>
        ${gearRows}
        <h3>Amulets</h3>
        ${amuletRows}
        <h3>Ranged weapons</h3>
        ${bowRows}
      </div>
      <div class="btnrow"><button id="dlgOk" class="secondary">Maybe later</button></div>`);
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('[data-fuse-slot]').forEach(b => {
      b.onclick = () => { closeModal(); UI.enchanterPickGem(b.dataset.fuseSlot); };
    });
    document.querySelectorAll('[data-buy-weapon]').forEach(b => {
      b.onclick = () => {
        closeModal();
        MM.engine.buy(MM.data.gearById('weapon', b.dataset.buyWeapon), 'weapon', 1, () => UI.enchanterDialog());
      };
    });
    document.querySelectorAll('[data-buy-amulet]').forEach(b => {
      b.onclick = () => {
        closeModal();
        MM.engine.buy(MM.data.gearById('amulet', b.dataset.buyAmulet), 'amulet', 1, () => UI.enchanterDialog());
      };
    });
  };

  // Second step: pick WHICH owned gem to fuse onto the chosen slot.
  UI.enchanterPickGem = function (slot) {
    const s = MM.engine.state;
    const itemId = s.equipped[slot];
    const gemCounts = {};
    (s.items.gems || []).forEach(id => gemCounts[id] = (gemCounts[id] || 0) + 1);
    const current = (s.enchants || {})[`${slot}:${itemId}`];
    const warn = current
      ? `<p class="dim">Fusing a new gem replaces the current ${MM.data.gemById(current).emoji} ${MM.data.gemById(current).name} gem — it'll be lost.</p>`
      : '';
    const buttons = Object.keys(gemCounts).map(id => {
      const g = MM.data.gemById(id);
      return { label: `${g.emoji} ${g.name} ×${gemCounts[id]} — ${g.desc}`, onClick: () => MM.engine.fuseGem(slot, id) };
    });
    buttons.push({ label: 'Never mind', onClick: () => UI.enchanterDialog() });
    UI.dialogChoices('🔥 Fuse a gem', `Fusing onto your ${MM.data.gearLabel(slot, itemId)}.${warn}`, buttons);
  };

  // ---------- report card ----------
  // ---------- the Hall of Heroes (Wave 7) ----------
  // Every adventurer on this machine, side by side: siblings, parents, the
  // cousin who played once. Read-only, and deliberately NOT a leaderboard —
  // there is no ranking and no score, just each hero's own crest and honours.
  // (Absorbed from Wave 5's cut "Hall of Heroes" item; it belongs in a room.)
  UI.hallOfHeroes = function () {
    if (UI.modalOpen() || MM.battle.active()) return;
    MM.track('hallOfHeroes');
    const me = MM.engine.state;
    const allCards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD, MM.data.MIMIC_CARD]);
    const rows = MM.engine.profiles().map(name => {
      const st = name === me.name ? me : MM.engine.peekProfile(name);
      if (!st) return '';
      const b = st.bestiary || { kills: {}, befriended: {} };
      const bf = b.befriended || {};
      const found = allCards.filter(t => ((b.kills || {})[t.name] || 0) > 0 || (bf[t.name] || 0) > 0).length;
      const pct = Math.round(found / allCards.length * 100);
      const badges = Object.values(st.badges || {});
      const medals = [3, 2, 1].map(tier => {
        const n = badges.filter(t => t === tier).length;
        return n ? `${MM.data.BADGES[tier].emoji}×${n}` : '';
      }).filter(Boolean).join(' ') || '<span class="dim">no badges yet</span>';
      const titles = MM.engine.titlesFor(st);
      const crest = st.endingDone ? '👑' : st.tasksDone && st.tasksDone.includes(13) ? '⭐' : st.isles && st.isles.lampLit ? '🗼' : '🗡';
      const gold = (st.ngPlus || 0) ? ` <span class="hero-ng">✨ Golden ×${st.ngPlus}</span>` : '';
      // Wave 8b (FINAL_REVIEW P6 guardrail): celebrate DIFFERENT bests, so two
      // very different kids both have a full-looking plaque and there is no
      // single number to line up side by side. Each honour appears only for the
      // hero who has it — never as a "0" that reads like a deficit.
      const honours = [
        (st.braveSolved || 0) > 0 ? `⚡ ${st.braveSolved} brave` : '',
        Object.keys(bf).length ? `🕊 ${Object.keys(bf).length} befriended` : '',
        (st.hatsRetired || 0) > 0 ? `🎩 ${st.hatsRetired} hats` : '',
        // Wave 9 (P4): the post-game plaque — days tended, Spiral height,
        // students helped. Same rule as everything else here: shown only
        // once it exists, never as a "0" that reads like a deficit.
        (st.daysTended || 0) > 0 ? `🌀 ${st.daysTended} days tended` : '',
        (st.spiral && st.spiral.highest > 0) ? `🌀 Floor ${st.spiral.highest} of the Spiral` : '',
        (st.academyTotal || 0) > 0 ? `📝 ${st.academyTotal} students helped` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="hero-row${name === me.name ? ' hero-me' : ''}">
        <span class="hero-crest">${crest}</span>
        <span class="hero-info">
          <span class="hero-name">${name}${name === me.name ? ' <span class="dim">(you)</span>' : ''}${gold}</span>
          <span class="hero-titles">${titles.length ? titles.join(' · ') : '<span class="dim">an adventure in progress</span>'}</span>
          <span class="hero-stats">Level ${st.level || 1} · ${medals} · 📕 ${pct}% of the book</span>
          ${honours ? `<span class="hero-honours">${honours}</span>` : ''}
        </span>
      </div>`;
    }).join('');
    UI.dialog('🏆 The Hall of Heroes',
      `<div class="report-total">Every adventurer who has walked Numeria from this castle.</div>` +
      `${rows}<div class="dim" style="margin-top:10px">No ranks, no scores. Everyone here got here their own way — and there is more than one way.</div>`);
  };

  UI.reportCard = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const rows = MM.data.TASKS.filter(t => !t.exp).map((t, i) => {
      const m = (s.mastery || {})[t.skill];
      const acc = m && m.attempts ? Math.round(m.correct / m.attempts * 100) : null;
      // Golden Numeria (Wave 7 NG+) resets taskIndex to 1 — but a hero who
      // has already finished the game must never see their own report card
      // re-locked. Same for the Monster Book's pages, below.
      const locked = !s.ngPlus && !s.endingDone && i + 1 > s.taskIndex;
      const tier = (s.badges || {})[t.skill] || 0;
      // Wave 8a (P6, growth tracking): a real-numbers "how you're doing
      // LATELY" line, from the same last-10 rolling window the difficulty
      // adapter already tracks — deliberately never a percentage (a raw
      // fraction like "9 of your last 10" reads as progress, not a grade).
      const recent = m && m.recent ? m.recent : [];
      const growthLine = !locked && recent.length >= 3
        ? `<span class="report-growth">${recent.reduce((a, b) => a + b, 0)} of your last ${recent.length} ✨</span>`
        : '';
      return `<div class="report-row${locked ? ' locked' : ''}">
        <span class="report-skill">${locked ? '🔒' : s.tasksDone.includes(i + 1) ? '✅' : '📗'} ${MM.data.SKILL_NAMES[t.skill]}${tier ? ' ' + MM.data.BADGES[tier].emoji : ''}</span>
        <span class="report-acc">${m && m.attempts ? `${m.correct}/${m.attempts} (${acc}%)` : '—'}</span>
        <span class="report-bar"><span style="width:${acc || 0}%" class="${acc >= 85 ? 'great' : acc >= 60 ? 'ok' : 'work'}"></span></span>
        ${growthLine}
      </div>`;
    }).join('');
    // 2026-07-17 audit fix: the isles TEACH three topics (Spire → clocks,
    // Breakwater → geometry, Halls → music) that were always recorded into
    // s.mastery but never displayed — the card iterated only the 10 mainland
    // task topics. Shown once attempted (no attempts = the kid hasn't met the
    // topic, or its parent switch is off — either way, no empty row).
    const SEA_TOPICS = [
      ['time_reading', 'the Clockwork Spire'],
      ['geometry', 'the Sunken Breakwater'],
      ['music_reading', 'the Resonant Halls'],
    ];
    const seaRows = SEA_TOPICS.map(([skill, place]) => {
      const m = (s.mastery || {})[skill];
      if (!m || !m.attempts) return '';
      const acc = Math.round(m.correct / m.attempts * 100);
      const tier = (s.badges || {})[skill] || 0;
      const recent = m.recent || [];
      const growthLine = recent.length >= 3
        ? `<span class="report-growth">${recent.reduce((a, b) => a + b, 0)} of your last ${recent.length} ✨</span>`
        : '';
      return `<div class="report-row">
        <span class="report-skill">⛵ ${MM.data.SKILL_NAMES[skill]}${tier ? ' ' + MM.data.BADGES[tier].emoji : ''}
          <span class="dim">· ${place}</span></span>
        <span class="report-acc">${m.correct}/${m.attempts} (${acc}%)</span>
        <span class="report-bar"><span style="width:${acc}%" class="${acc >= 85 ? 'great' : acc >= 60 ? 'ok' : 'work'}"></span></span>
        ${growthLine}
      </div>`;
    }).join('');
    const seaBlock = seaRows ? `<div class="report-total">⛵ Learned at sea</div>${seaRows}` : '';
    // Practice Yard (v1.7.7): its drills deliberately never touch mastery, so
    // the card reads s.yard directly — stars, not accuracy, because a ★ IS the
    // record (a clean 8-of-8 run).
    const yard = s.yard || { stars: {} };
    const starCards = (MM.data.YARD_CARDS || []).filter(c => (yard.stars || {})[c.id] > 0);
    const yardRows = starCards.map(c => {
      const n = Math.min(3, yard.stars[c.id]);
      return `<div class="report-row">
        <span class="report-skill">${c.emoji} ${c.label}</span>
        <span class="report-acc">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>
      </div>`;
    }).join('');
    const yardBlock = starCards.length
      ? `<div class="report-total">🎓 Practice Yard — clean-run stars
           <span class="dim">(every ★ is a whole drill, all 8 right)</span></div>${yardRows}`
      : '';
    const total = s.totals || { answered: 0, correct: 0 };
    // Wave 8b: pride that outlives the fight. Shown only once it exists — a kid
    // who has never taken a brave problem is not told she has zero of them.
    const brave = (s.braveSolved || 0) > 0
      ? `<div class="report-total">⚡ Brave problems solved: <b>${s.braveSolved}</b>
         <span class="dim">— harder than you had to. Every one of them.</span></div>` : '';
    const friends = MM.engine.befriendedCount(s) > 0
      ? `<div class="report-total">🕊 Kinds befriended: <b>${MM.engine.befriendedCount(s)}</b></div>` : '';
    UI.dialog('📊 Report Card — ' + s.name,
      `<div class="report-total">Problems solved: <b>${total.correct}</b> of <b>${total.answered}</b>` +
      (total.answered ? ` (${Math.round(total.correct / total.answered * 100)}%)` : '') + `</div>${brave}${friends}${rows}${seaBlock}${yardBlock}`);
  };

  // ---------- the hatching (first voyage to the Isles) ----------
  UI.hatchScene = function () {
    const s = MM.engine.state;
    const species = MM.data.PETS[s.isles.egg];
    const img = MM.sprites.get(species.sprite, { scale: 6 }).toDataURL();
    openModal(`
      <h2>🥚 ...crack. Crack-crack!</h2>
      <div class="dialog-body">
        <p>Halfway across the open water, the ${s.isles.egg} egg wobbles, rocks... and <b>hatches!</b></p>
        <div style="text-align:center"><img src="${img}" style="image-rendering:pixelated"></div>
        <p style="text-align:center">A tiny <b>${species.name}</b> ${species.emoji} blinks up at you like you
        personally arranged the sunrise.</p>
        <p><b>What will you name it?</b></p>
      </div>
      <div class="answer-row">
        <input id="petName" type="text" maxlength="16" autocomplete="off" placeholder="${species.name}">
        <button id="petOk" class="primary">Name it!</button>
      </div>`);
    const input = document.getElementById('petName');
    const done = () => {
      const name = input.value.trim().replace(/</g, '') || species.name;
      closeModal();
      MM.engine.hatchPet(name);
      UI.dialog(`${species.emoji} ${name}!`,
        `<b>${name}</b> wobbles to its feet and immediately falls over. Then gets up. Then falls over again — with confidence.<br><br>
         It will follow you <b>everywhere</b> now. And here's the thing about a ${species.name}:
         <b>it can smell hidden secrets</b>. If it perks up with a <b>❗</b>, something is concealed nearby...<br><br>
         <span class="dim">Feed it 🦴 treats from the Brass Compass, and it grows as you answer problems — check on it in your 🎒 bag.</span>`);
      MM.sound.fanfare();
    };
    document.getElementById('petOk').onclick = done;
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(); });
    setTimeout(() => input.focus(), 30);
  };

  // ---------- the notice board (bounties) ----------
  // Wave 5 item 2: Port Brightwater has its OWN board (isle-flavored job
  // types) tracked independently in s.isleBounties — the mainland board's
  // progress is never disturbed by visiting it, and vice versa.
  UI.noticeBoard = function () {
    MM.track('noticeBoard');
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const onIsle = s.mapId === 'isles';
    if (onIsle) MM.engine.refreshIsleBounties(); else MM.engine.refreshBounties();
    if (MM.engine.settleStreakJobs) MM.engine.settleStreakJobs(); // v1.7.2: an already-earned streak pays on sight
    const board = onIsle ? s.isleBounties : s.bounties;
    // Wave 9 (P1): the mainland board self-narrates the day's Daily Tangles —
    // "A tangle was spotted near X" — the bounty-board recipe, one more time.
    let tangleSection = '';
    if (!onIsle) {
      MM.engine.refreshTangles();
      if (s.tangles && s.tangles.items.some(t => !t.done)) {
        const lines = s.tangles.items.filter(t => !t.done).map(t =>
          `<div class="shop-row"><span class="shop-item">🌀 ${MM.data.pick(MM.data.TANGLE_LINES)(MM.engine.nearestLandmark(t.x, t.y))}</span></div>`).join('');
        tangleSection = `<h3>🌀 Today's tangles</h3>${lines}`;
      }
    }
    if (!board) {
      return UI.dialog('🪧 Notice Board',
        'The board is empty — the kingdom only posts jobs for <b>working heroes</b>.<br><br>' +
        'Visit the 🏰 <b>castle</b> and get your first task from the MathMaker!' + tangleSection);
    }
    const icon = { hunt: '⚔️', solve: '✏️', streak: '🔥', spar: '🥊', gemchest: '✨', thief: '🪶', spire: '⏰' };
    const rows = board.items.map(it => {
      // an old hunt job can point at a dungeon cleared today — say so
      // instead of leaving the kid to discover an empty dungeon (Wave 8-
      // preview; new boards avoid such targets at generation time)
      const napping = !it.done && it.type === 'hunt' && it.dungeon && MM.engine.dungeonClearedToday(it.dungeon);
      // Wave 8a (P5, rust): a job whose topic has gone stale says so
      const rusty = !it.done && !napping && it.flavor;
      // the streak job reads the LIVE streak — its stored counter only ever
      // jumps 0→done at completion, so a kid three-right-in-a-row still saw
      // "0/4" and reasonably concluded the board was broken (playtest
      // 2026-07-13). A miss resets the streak; the board shows that too.
      const have = it.type === 'streak' && !it.done ? Math.min(s.streak || 0, it.need) : it.have;
      return `
      <div class="shop-row${it.done ? ' owned' : ''}">
        <span class="shop-item">${it.done ? '✅' : icon[it.type]} ${it.label}${napping ? '<span class="quip">cleared for today — the monsters creep back tomorrow</span>' : ''}${rusty ? `<span class="quip">${it.flavor}</span>` : ''}</span>
        <span class="shop-stat">${it.done ? 'done!' : `${have}/${it.need}`}</span>
        <span class="shop-price">${it.reward} g</span>
      </div>`;
    }).join('');
    UI.dialog(onIsle ? '🪧 Harbor Notice Board' : '🪧 Notice Board',
      `<div class="shop-gold">${onIsle ? 'The harbor needs help too!' : 'The kingdom needs help!'} Finish a job and the reward is paid <b>on the spot</b>.</div>
       ${rows}${tangleSection}
       <p class="dim" style="font-size:13px;margin-top:10px">New notices are posted each morning — or as soon as you finish these.</p>
       <p class="dim" style="font-size:12px;font-style:italic">${MM.data.pick(MM.data.BOARD_LINES)}</p>`);
  };

  // ---------- Wave 9 (P3): the pet's wardrobe ----------
  UI.petWardrobe = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    if (!s.endingDone) {
      return UI.dialog('🎩 The pet\'s wardrobe', 'A little wardrobe, still locked. Perhaps once the crown is truly yours.');
    }
    const pet = s.isles && s.isles.pet;
    if (!pet) {
      return UI.dialog('🎩 The pet\'s wardrobe', 'Tiny, empty, hopeful. There\'s no pet to dress up yet.');
    }
    const rows = MM.data.PET_HATS.map(h => {
      const owned = s.petHats.includes(h.id);
      const worn = pet.hat === h.id;
      // earned hats (the Practice Yard set) are never bought — an unearned one
      // shows greyed so the collection is visible ("collect them all").
      if (h.earned && !owned) {
        return `<div class="shop-row"><span class="shop-item" style="opacity:.5">${h.emoji} ${h.name}</span><span class="shop-price dim">not yet earned</span><button class="shop-buy" disabled>—</button></div>`;
      }
      const price = owned ? (worn ? '✓ worn' : 'owned') : (h.earned ? 'earned' : h.price + ' g');
      return `<div class="shop-row${worn ? ' owned' : ''}">
        <span class="shop-item">${h.emoji} ${h.name}</span>
        <span class="shop-price">${price}</span>
        <button class="shop-buy" data-hat="${h.id}">${owned ? (worn ? 'Take off' : 'Wear') : 'Buy'}</button>
      </div>`;
    }).join('');
    openModal(`
      <h2>🎩 ${pet.name}'s Wardrobe</h2>
      <div class="dialog-body">
        <div class="shop-gold">You have 💰 ${s.gold} gold.</div>
        ${rows}
      </div>
      <div class="btnrow"><button id="wardrobeClose" class="secondary">Close</button></div>`);
    document.getElementById('wardrobeClose').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('[data-hat]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.hat;
        const r = MM.engine.petHatAction(id);
        if (!r.ok && r.msg) { closeModal(); return UI.dialog('🎩 Not quite', r.msg, () => UI.petWardrobe()); }
        // the pet reacts to the hat it's now wearing (cuteness, zero weight)
        const petNow = MM.engine.state.isles.pet, hat = MM.data.petHatById(id);
        if (petNow && petNow.hat === id && hat && hat.react) UI.log(`🐾 ${hat.react}`);
        UI.petWardrobe();
      };
    });
  };

  // ---------- Wave 18: "Choose Your Hero" (the avatar picker) ----------
  // ONE reusable picker, mounted into any container. Purely cosmetic. Works in
  // two modes via the cfg.get/apply pair: LIVE (Looking Glass / Study wardrobe,
  // writes s.avatar immediately) and DRAFT (the profile / new-game screen,
  // mutates a plain object before the save exists). cfg.onChange fires after any
  // pick so a host can react (the Looking Glass updates its deadpan reflection).
  function defaultHumanPalette(id) {
    const c = MM.sprites.DEFS[MM.sprites.avatarDef(id).frames[0]].colors;
    return { F: c.F, P: c.P, A: c.A };
  }
  UI.renderAvatarPicker = function (mount, cfg) {
    if (!mount) return;
    const AV = MM.sprites;
    const cur = cfg.get();
    const grid = AV.AVATAR_ORDER.map(id => {
      const def = AV.avatarDef(id);
      const pal = (id === cur.avatar && def.human) ? (cur.palette || {}) : {};
      const img = AV.get(def.frames[0], { scale: 3, palette: pal }).toDataURL();
      const sel = id === cur.avatar;
      return `<button type="button" class="avatar-opt${sel ? ' sel' : ''}" data-av="${id}" title="${def.label}" aria-pressed="${sel}">
        <img src="${img}" alt="${def.label}"></button>`;
    }).join('');
    let html = `<div class="avatar-grid">${grid}</div>`;
    const def = AV.avatarDef(cur.avatar);
    if (def.human) {
      const pal = cur.palette || {};
      const swRow = ch => {
        const opts = AV.AVATAR_PALETTE_OPTIONS[ch].map(hex =>
          `<button type="button" class="avatar-sw${pal[ch] === hex ? ' sel' : ''}" data-sw="${ch}" data-hex="${hex}" style="background:${hex}" title="${MM.data.AVATAR.swatchLabels[ch]}"></button>`).join('');
        return `<div class="avatar-swrow"><span class="avatar-swlabel">${MM.data.AVATAR.swatchLabels[ch]}</span>${opts}</div>`;
      };
      html += `<div class="avatar-swatches">${swRow('F')}${swRow('P')}${swRow('A')}</div>`;
    }
    if (cfg.showHats && cfg.ownedHats && cfg.ownedHats.length) {
      const hatBtns = [`<button type="button" class="avatar-hat${cur.heroHat ? '' : ' sel'}" data-hat="" title="No hat">🚫</button>`]
        .concat(cfg.ownedHats.map(id => {
          const h = MM.data.petHatById(id);
          return h ? `<button type="button" class="avatar-hat${cur.heroHat === id ? ' sel' : ''}" data-hat="${id}" title="${h.name}">${h.emoji}</button>` : '';
        })).join('');
      html += `<div class="avatar-swrow"><span class="avatar-swlabel">Hat</span>${hatBtns}</div>`;
    }
    mount.innerHTML = html;
    const rerender = () => { UI.renderAvatarPicker(mount, cfg); if (cfg.onChange) cfg.onChange(); };
    mount.querySelectorAll('[data-av]').forEach(b => b.onclick = () => {
      const id = b.dataset.av;
      const humanNow = AV.avatarDef(id).human;
      const nextPal = humanNow ? (cur.palette || defaultHumanPalette(id)) : null;
      cfg.apply(id, nextPal, cur.heroHat);
      rerender();
    });
    mount.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
      const pal = Object.assign({}, cur.palette || defaultHumanPalette(cur.avatar));
      pal[b.dataset.sw] = b.dataset.hex;
      cfg.apply(cur.avatar, pal, cur.heroHat);
      rerender();
    });
    mount.querySelectorAll('[data-hat]').forEach(b => b.onclick = () => {
      cfg.apply(cur.avatar, cur.palette, b.dataset.hat || null);
      rerender();
    });
  };

  // The shared modal front-end (both the Looking Glass and the Study wardrobe
  // route here — one state, two doors). mode 'glass' shows the deadpan mirror
  // reflection; both show the world's deadpan reaction the moment you become a
  // novel (non-human) hero, plus the pet's double-take. The humans stay neutral
  // — they ARE the kid, so no world line and no joke ever lands on them.
  UI.avatarPickerModal = function (opts) {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    let justBecame = null;   // a non-human form freshly picked THIS visit
    openModal(`
      <h2>${opts.title}</h2>
      <div class="dialog-body">
        <p style="font-size:14px">${opts.intro}</p>
        <div style="text-align:center"><small class="dim">${MM.data.AVATAR.pickerHint}</small></div>
        <div id="avatarPickMount" class="avatar-pick"></div>
        <p id="avatarReflect" class="dim" style="font-size:13px;min-height:2.6em;font-style:italic;text-align:center"></p>
      </div>
      <div class="btnrow"><button id="avatarDone" class="primary">Done</button></div>`);
    const updateReflect = () => {
      const el = document.getElementById('avatarReflect');
      if (!el) return;
      const form = s.avatar;
      let parts = [];
      if (justBecame === form && MM.data.AVATAR.worldReaction[form]) {
        parts.push(MM.data.pick(MM.data.AVATAR.worldReaction[form]));
        if (s.isles && s.isles.pet) parts.push(MM.data.AVATAR.petDoubleTake);
      }
      if (opts.mode === 'glass' && MM.data.AVATAR.lookingGlass.reflect[form]) {
        parts.push(MM.data.AVATAR.lookingGlass.reflect[form]);
      }
      el.innerHTML = parts.join('<br><br>');
    };
    UI.renderAvatarPicker(document.getElementById('avatarPickMount'), {
      get: () => ({ avatar: s.avatar, palette: s.avatarPalette, heroHat: s.heroHat }),
      apply: (avatar, palette, heroHat) => {
        const prev = MM.engine.setAvatar(avatar, palette);
        s.heroHat = heroHat || null;
        MM.engine.save();
        const def = MM.sprites.avatarDef(avatar);
        if (avatar !== prev && !def.human && avatar !== 'knight') {
          MM.engine.petDoubleTake();
          justBecame = avatar;
        } else if (avatar !== prev) {
          justBecame = null;
        }
        MM.sound.chirp();
      },
      onChange: updateReflect,
      showHats: true,
      ownedHats: s.petHats || [],
    });
    updateReflect();
    document.getElementById('avatarDone').onclick = () => {
      closeModal();
      if (opts.done) UI.log(opts.done);
      UI.refresh();
    };
  };

  // Door one: the plain Looking Glass, reachable from the Bag on day one — the
  // safety valve so no kid is ever stuck with a regretted form. Deadpan.
  UI.lookingGlass = function () {
    const lg = MM.data.AVATAR.lookingGlass;
    UI.avatarPickerModal({ title: lg.title, intro: lg.intro, mode: 'glass' });
  };
  // Door two: the Study wardrobe — the DELUXE post-ending version, same picker
  // wrapped in the confessed wardrobe's personality.
  UI.studyWardrobe = function () {
    const wd = MM.data.AVATAR.wardrobe;
    UI.avatarPickerModal({ title: wd.title, intro: wd.intro, mode: 'wardrobe', done: wd.done });
  };

  // ---------- Wave 9 (P3): boss statues — three independent plinths ----------
  UI.statuePlinth = function (idx) {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    if (!s.endingDone) {
      return UI.dialog('🗿 An empty plinth', 'The steward\'s ledger stays shut until the crown is truly yours.');
    }
    const filled = s.castleFurnish.statues[idx];
    if (filled) {
      return UI.dialog(`🗿 ${filled}`, MM.data.STATUE_LINE(filled));
    }
    const taken = new Set(s.castleFurnish.statues.filter(Boolean));
    const options = MM.engine.gauntletBosses().filter(b => !taken.has(b.name));
    if (!options.length) {
      return UI.dialog('🗿 An empty plinth',
        `${MM.data.STATUE_EMPTY}<br><br><span class="dim">Every champion you've bested already has a statue elsewhere in this room. Beat a few more, or wait for a rematch.</span>`);
    }
    const buttons = options.map((b, i) => ({
      label: `${b.name} — ${MM.data.STATUE_PRICE}g`,
      primary: i === 0,
      onClick: () => MM.engine.commissionStatue(idx, b.name),
    }));
    buttons.push({ label: 'Not now', onClick: () => {} });
    UI.dialogChoices('🗿 An empty plinth',
      `${MM.data.STATUE_EMPTY}<br><br>Commission a statue of a champion you've bested?`, buttons);
  };

  // ---------- the Monster Book (bestiary) ----------
  // Cards fill in as you play: never-encountered monsters are dark silhouettes
  // marked ???, encountered-but-unbeaten ones show their portrait, and a
  // defeated monster reveals its card (flavor text + defeat count) forever.
  function beastPortrait(type, revealed, befriended) {
    // Wave 8b: a befriended species sits for its portrait in its CALMED colours —
    // the same warm-white blend it wears out in the corridors, so the card and
    // the creature you pass plainly look like the same friend.
    const pal = befriended
      ? MM.sprites.softPalette(type.sprite, type.pal || {}, 0.45)
      : (type.pal || {});
    const cv = MM.sprites.get(type.sprite, { palette: pal, scale: 3 });
    if (revealed) return cv.toDataURL();
    const s = document.createElement('canvas');
    s.width = cv.width; s.height = cv.height;
    const c = s.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#453a78'; // visible tease of the shape, no colors given away
    c.fillRect(0, 0, s.width, s.height);
    return s.toDataURL();
  }

  function beastRow(type, isBoss) {
    const b = MM.engine.state.bestiary || { seen: {}, kills: {}, gauntlet: {}, befriended: {} };
    const kills = b.kills[type.name] || 0;
    const seen = !!b.seen[type.name];
    // Wave 8b: the SECOND collection axis. A species can be on both — struck
    // some days, soothed others — and the card says both, without ranking them.
    const friends = (b.befriended && b.befriended[type.name]) || 0;
    // Wave 5 item 4: a Champion's Gauntlet win marks the boss's card for good
    const gauntletWon = !!(isBoss && b.gauntlet && b.gauntlet[type.name]);
    const img = `<img class="beast-img" src="${beastPortrait(type, kills > 0 || friends > 0, friends > 0)}" alt="">`;
    // Wave 8a (P2, monster telegraphs): the same icon that floats over its
    // head in the dungeon, so the book doubles as a "who asks what" index.
    const topicIcon = type.skill && MM.data.SKILL_ICONS[type.skill] ? ` ${MM.data.SKILL_ICONS[type.skill]}` : '';
    const counts = [
      kills > 0 ? `<span class="beast-count">⚔ × ${kills}</span>` : '',
      friends > 0 ? `<span class="beast-friend">🕊 × ${friends}</span>` : '',
    ].join('');
    if (kills > 0 || friends > 0) {
      // A boss you SOOTHED was helped, not beaten — and its card should say so.
      const note = (isBoss && friends > 0 && kills === 0)
        ? `<div class="beast-helped">🕊 Helped, not beaten.</div>` : '';
      return `<div class="beast-row${friends > 0 ? ' beast-befriended' : ''}">${img}<div class="beast-info">
        <div class="beast-name">${isBoss ? '👑 ' : ''}${friends > 0 ? '🕊 ' : ''}${type.name}${gauntletWon ? ' 👑✨' : ''}${topicIcon}</div>
        <div class="beast-desc">${type.desc || ''}</div>${note}
      </div>${counts}</div>`;
    }
    if (seen) {
      return `<div class="beast-row">${img}<div class="beast-info">
        <div class="beast-name">${isBoss ? '👑 ' : ''}${type.name}${topicIcon}</div>
        <div class="beast-desc">Not yet defeated — its story stays hidden...</div>
      </div></div>`;
    }
    return `<div class="beast-row beast-unknown">${img}<div class="beast-info">
      <div class="beast-name">???</div>
      <div class="beast-desc">Undiscovered.</div>
    </div></div>`;
  }

  UI.monsterBook = function () {
    MM.track('monsterBook');
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const b = s.bestiary || { seen: {}, kills: {}, befriended: {} };
    // every card in the book (regulars + bosses per dungeon, + the golem)
    const allCards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD, MM.data.MIMIC_CARD]);
    // Wave 8b: a card is FILLED IN by either verb. A kid who soothes her way
    // through the whole game must be able to complete the book — soothing is a
    // real way to finish a monster, not a way to skip one.
    const bf = b.befriended || {};
    const found = allCards.filter(t => (b.kills[t.name] || 0) > 0 || (bf[t.name] || 0) > 0).length;
    // pages exist for every dungeon assigned so far; isle pages open with
    // their pass (taskIndex stops at 14 — lenses gate the later isles)
    let shownDungeons = (s.ngPlus || s.endingDone) ? 14 : Math.max(1, Math.min(14, s.taskIndex || 1));
    if (s.isles && s.isles.lenses.tidepool) shownDungeons = 15;
    if (s.isles && s.isles.lenses.frostbite) shownDungeons = 16;
    shownDungeons = Math.min(shownDungeons, MM.data.MONSTERS.length);
    const sections = MM.data.MONSTERS.slice(0, shownDungeons).map((r, i) => {
      const rows = r.types.map(t => beastRow(t, false)).join('') + beastRow(r.boss, true);
      return `<h3>${MM.data.TASKS[i].dungeon}</h3>${rows}`;
    }).join('');
    const golemSection = s.metMiscount
      ? `<h3>Miscount's Sparring Ground</h3>${beastRow(MM.data.GOLEM_CARD, false)}`
      : '';
    // Playtest round 4: the Mimic's page appears only once a kid has MET one
    // (seen/beaten/befriended) — a secret the book keeps until then.
    const b8 = s.bestiary || { seen: {}, kills: {}, befriended: {} };
    const metMimic = b8.seen[MM.data.MIMIC_CARD.name] || (b8.kills || {})[MM.data.MIMIC_CARD.name] > 0
      || ((b8.befriended || {})[MM.data.MIMIC_CARD.name] || 0) > 0;
    const mimicSection = metMimic
      ? `<h3>Wandering Chests</h3>${beastRow(MM.data.MIMIC_CARD, false)}`
      : '';
    const blankNote = shownDungeons < 13
      ? `<p class="dim" style="font-size:13px;font-style:italic">...the rest of the pages are still blank. New places, new monsters!</p>`
      : '';
    // Wave 8a (P8, delight catalog): "hats respectfully retired: N." No
    // mechanics — pure cuteness, tracked in E.grantVictory / the arena hook.
    const hatFooter = `<p class="dim" style="font-size:12.5px;margin-top:8px">🎩 Hats respectfully retired: <b>${s.hatsRetired || 0}</b></p>`;
    // Wave 8b: the second collection axis, counted in its own right and never
    // ranked against the first. Two ways to fill a book; neither is the score.
    const friendCount = MM.engine.befriendedCount(s);
    const friendLine = `<div class="shop-gold">🕊 Befriended: <b>${friendCount}</b> of <b>${allCards.length}</b> kinds
      <span class="dim">(soothe a monster to make a friend of its kind)</span></div>`;
    openModal(`
      <h2>📕 Monster Book — ${s.name}</h2>
      <div class="dialog-body">
        <div class="shop-gold">Discovered: <b>${found}</b> of <b>${allCards.length}</b> monsters
          <span class="dim">(defeat a monster to fill in its card)</span></div>
        ${friendLine}
        ${sections}${golemSection}${mimicSection}${blankNote}${hatFooter}
      </div>
      <div class="btnrow"><button id="dlgOk" class="primary">Close the book</button></div>`);
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
  };

  UI.victory = function () {
    const s = MM.engine.state;
    const total = s.totals;
    openModal(`
      <h2>👑 YOU ARE THE MATHMAKER'S CHAMPION! 👑</h2>
      <div class="dialog-body" style="text-align:center">
        <div style="font-size:64px">🏆</div>
        <p>The MathMaker places the <b>Crown of Numbers</b> on your head — and beside him stands
        a boy in a grey robe, scrubbed clean of shadows.</p>
        <p><i>"This is Miscount," says the MathMaker, a hand on the boy's shoulder. "My apprentice,
        who got lost in confusion — until a hero showed him that <b>every problem can be worked out,
        one careful step at a time.</b>"</i></p>
        <p>Miscount grins shyly. <i>"Next time I don't know an answer... I'll show my work
        instead of guessing. Promise."</i></p>
        <p>You answered <b>${total.correct}</b> problems correctly out of <b>${total.answered}</b>
        (${Math.round(total.correct / total.answered * 100)}%).</p>
        <p>🌉 As the shadows lift, a <b>wooden bridge rises across the eastern river</b>.
        Miscount waves from the far bank: <i>"Come spar with me sometime!"</i></p>
        <p>Numeria is at peace — but every dungeon stays open, and Miscount's
        Homework Golems grow tougher with every win!</p>
      </div>
      <div class="btnrow"><button id="dlgOk" class="primary">🎉 Hooray!</button></div>`);
    MM.sound.fanfare();
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
  };
})();
