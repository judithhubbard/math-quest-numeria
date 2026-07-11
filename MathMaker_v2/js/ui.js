// MathMaker v2 — world rendering (pixel sprites + animation), modals, sidebar, sound.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const UI = MM.ui = {};
  const TILE = 48;
  const VIEW_W = 15, VIEW_H = 11;

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
  function beep(freq, dur, type, delay, vol) {
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
    battleStart(boss) {
      beep(196, 0.14, 'square', 0, 0.08); beep(196, 0.14, 'square', 0.16, 0.08);
      beep(boss ? 147 : 262, 0.35, 'square', 0.32, 0.1);
      if (boss) noise(0.5, 300, 0.3, 0.2);
    },
    // Wave 4: a 5-tone scale (do-re-mi-fa-sol) for singing stones (flavor,
    // engine.js tileEffects) and echo doors (the tone-memory puzzle, below).
    tone(i, delay) { beep(TONE_FREQS[i % TONE_FREQS.length], 0.35, 'triangle', delay || 0, 0.1); },
  };
  const TONE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.00]; // C4 D4 E4 F4 G4
  const TONE_COLORS = ['#e05252', '#e0a952', '#ffd94a', '#68c470', '#52a8e0'];

  // ---------- tile → sprite mapping ----------
  function tileSprite(ch, x, y, inDungeon, waterFrame, onIsles) {
    // isle-only glyphs first: 'u' is Miscount's tile on the west map!
    if (onIsles && (ch === 'u' || ch === 'v' || ch === 'w')) return 'murk';
    if (onIsles && ch === 'H') return 'lighthouse';
    switch (ch) {
      case '~': return waterFrame ? 'water2' : 'water';
      case 'T': return 'tree';
      case 'M': return 'mountain';
      case 'C': return 'castle';
      case 'S': return 'shop';
      case 'I': return 'inn';
      case 'n': return 'board';
      case 'W': return 'pier';
      case '#': return 'wall';
      case 'D': return 'doorMagic';
      case '*': return 'chest';
      case 'X': return 'ladder';
      case '=': return 'bridge';
      // Level 2 isle tiles
      case '%': return 'wallCrack';
      case ',': return 'pool';
      case '^': return 'urchin';
      case '_': return 'slick';
      case 'o': return 'pad';
      case 'k': return 'keyTile';
      case 'K': return 'lockDoor';
      case 'L': return 'lever';
      case 'G': return 'gate';
      case '>': return 'stairsDown';
      case '<': return 'stairsUp';
      case 'v': return 'chute';
      default:
        if ('1234567890'.includes(ch) && !inDungeon) return 'hole';
        if (inDungeon) return 'floor';
        return (x + y) % 2 ? 'grass2' : 'grass';
    }
  }

  UI.init = function () {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    modalEl = document.getElementById('overlay');
    modalBox = document.getElementById('modalBox');

    document.addEventListener('keydown', (ev) => {
      // never swallow keys the user is typing into a text field (name, answers)
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      if (UI.modalOpen() || MM.battle.active()) return;
      const k = ev.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') { ev.preventDefault(); MM.engine.tryMove(0, -1); }
      else if (k === 'arrowdown' || k === 's') { ev.preventDefault(); MM.engine.tryMove(0, 1); }
      else if (k === 'arrowleft' || k === 'a') { ev.preventDefault(); MM.engine.tryMove(-1, 0); }
      else if (k === 'arrowright' || k === 'd') { ev.preventDefault(); MM.engine.tryMove(1, 0); }
      else if (k === 'p') MM.engine.usePotion();
      else if (k === 'b') UI.openBag();
      else if (k === 'r') UI.reportCard();
      else if (k === 'm') UI.monsterBook();
    });

    document.getElementById('btnPotion').onclick = () => MM.engine.usePotion();
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
  function drawWorldParticles(camX, camY) {
    if (!worldParticles.length) return;
    for (let i = worldParticles.length - 1; i >= 0; i--) {
      const p = worldParticles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.035;
      if (p.life <= 0) { worldParticles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX * TILE - p.size / 2, p.y - camY * TILE - p.size / 2, p.size, p.size);
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
    const msg = a.dest === 'isles' ? '⛵ Sailing to the Uncharted Isles...' : '⛵ Sailing home to Numeria...';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#141221';
    ctx.fillText(msg, W / 2 + 2, H * 0.16 + 2);
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(msg, W / 2, H * 0.16);
  }

  // ---------- world rendering (continuous, for water/idle animation) ----------
  function worldLoop(now) {
    requestAnimationFrame(worldLoop);
    if (MM.battle.active()) return;           // battle has its own loop
    if (sailAnim) { drawSail(now); return; }  // mid-voyage
    const s = MM.engine.state;
    if (!s || !s.grid) return;
    drawWorld(s, now);
  }

  function drawWorld(s, now) {
    const grid = s.grid;
    const H = grid.length, W = grid[0].length;
    const inDungeon = s.mapId !== 'world' && s.mapId !== 'isles';
    const waterFrame = Math.floor(now / 600) % 2;

    let camX = Math.max(0, Math.min(W - VIEW_W, s.px - Math.floor(VIEW_W / 2)));
    let camY = Math.max(0, Math.min(H - VIEW_H, s.py - Math.floor(VIEW_H / 2)));
    if (W <= VIEW_W) camX = 0;
    if (H <= VIEW_H) camY = 0;

    ctx.fillStyle = '#141221';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let vy = 0; vy < VIEW_H; vy++) {
      for (let vx = 0; vx < VIEW_W; vx++) {
        const x = camX + vx, y = camY + vy;
        if (y >= H || x >= W) continue;
        const ch = grid[y][x];
        const spr = MM.sprites.get(tileSprite(ch, x, y, inDungeon, waterFrame, s.mapId === 'isles'), { scale: 3 });
        ctx.drawImage(spr, vx * TILE, vy * TILE);
        if (!inDungeon && '1234567890'.includes(ch)) {
          const label = ch === '0' ? '10' : ch;
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#141221';
          ctx.fillText(label, vx * TILE + TILE / 2 + 1, vy * TILE + 12);
          ctx.fillStyle = '#ffd94a';
          ctx.fillText(label, vx * TILE + TILE / 2, vy * TILE + 11);
        }
        const expLabel = !inDungeon && { A: '11', B: '12', K: '13' }[ch];
        if (expLabel) {
          ctx.drawImage(MM.sprites.get('hole', { scale: 3 }), vx * TILE, vy * TILE);
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#141221';
          ctx.fillText(expLabel, vx * TILE + TILE / 2 + 1, vy * TILE + 12);
          ctx.fillStyle = '#7ee0e8';
          ctx.fillText(expLabel, vx * TILE + TILE / 2, vy * TILE + 11);
        }
        const npc = !inDungeon && MM.data.NPCS[ch];
        if (npc) {
          const nbob = Math.sin(now / 450 + x * 3) * 1.5;
          ctx.drawImage(MM.sprites.get(npc.sprite, { palette: npc.pal || {}, scale: 3 }), vx * TILE, vy * TILE + nbob);
        }
      }
    }

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
    for (const m of (s.monsters || [])) {
      if (m.hp <= 0) continue;
      const vx = m.x - camX, vy = m.y - camY;
      if (vx < 0 || vy < 0 || vx >= VIEW_W || vy >= VIEW_H) continue;
      const bob = Math.sin(now / 400 + m.x * 2 + m.y) * 2;
      const spr = MM.sprites.get(m.sprite, { palette: m.pal || {}, scale: 3 });
      ctx.drawImage(spr, vx * TILE, vy * TILE + bob);
      if (m.boss) {
        const crown = MM.sprites.get('crown', { scale: 2 });
        ctx.drawImage(crown, vx * TILE + TILE / 2 - crown.width / 2, vy * TILE + bob - 8);
      }
    }

    // hero (walk frames while moving, idle bob otherwise)
    const moving = performance.now() - lastMoveAt < 160;
    const frame = moving && UI.stepCount % 2 ? 'hero2' : 'hero';
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
    const heroSpr = MM.sprites.get(frame, { scale: 3, mirror: UI.facing < 0, palette: s.greenHair ? { P: '#4ec449' } : {} });
    ctx.drawImage(heroSpr, (s.px - camX) * TILE, (s.py - camY) * TILE + bob);

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
      (s.stamina <= 0 ? ' <b>😫 halved — you\'re exhausted! Eat 🎒</b>' : '');
    document.getElementById('statDef').innerHTML =
      `🛡️ blocks <b>${MM.engine.totalDef()}</b> of every monster hit <span class="dim">(${pieces.map(p => p.emoji).join('') || 'no armor!'})</span>`;
    document.getElementById('statPotions').textContent = `🧪 Potions: ${s.potions}`;
    document.getElementById('statStreak').innerHTML = s.streak >= 3
      ? `🔥 <b>Streak ${s.streak}!</b> +${s.streak >= 6 ? 4 : 2} dmg${s.streak >= 5 ? ' · crits unlocked!' : ''}`
      : (s.streak > 0 ? `✨ Streak: ${s.streak}` : '');

    renderSpellRow(s);

    const taskEl = document.getElementById('taskBox');
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
  };

  // Spellbook row: appears in the sidebar the moment any spell is unlocked
  // (gold badges). Buttons disable themselves outside a dungeon, out of
  // stamina, or already spent this visit — never hidden, so a kid can see
  // what they're working toward. Each disabled button carries a `title`
  // tooltip explaining exactly why (Wave 4 carry-over — these used to just
  // grey out with no explanation).
  function renderSpellRow(s) {
    const el = document.getElementById('spellRow');
    if (!el) return;
    const inDungeon = MM.engine.inDungeon();
    const used = MM.engine.spellsUsedThisVisit || {};
    const T = MM.data.SPELL_TOOLTIPS;
    const btn = (id, label, disabled, title) => `<button class="mini secondary" id="${id}" ${disabled ? 'disabled' : ''} title="${title}">${label}</button>`;
    const items = [];
    if (MM.engine.spellUnlocked('scout')) {
      const disabled = !inDungeon || used.scout;
      items.push(btn('castScout', `🔍 Scout${used.scout ? ' (used)' : ''}`, disabled, !inDungeon ? T.outside : used.scout ? T.used : ''));
    }
    if (MM.engine.spellUnlocked('blink')) {
      const disabled = !inDungeon || s.stamina < 10;
      items.push(btn('castBlink', '⚡ Blink (10🍗)', disabled, !inDungeon ? T.outside : s.stamina < 10 ? T.noStamina : ''));
    }
    if (MM.engine.spellUnlocked('beacon')) {
      const disabled = !inDungeon || used.beacon;
      items.push(btn('castBeacon', `🕯 Beacon${used.beacon ? ' (used)' : ''}`, disabled, !inDungeon ? T.outside : used.beacon ? T.used : ''));
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
    if (el) el.innerHTML = messages.map(m => `<div>${m}</div>`).join('');
  };

  // ---------- shared problem form (used by battle + modals) ----------
  // Builds the answer input (or choice buttons) into `container`.
  // Calls onAnswer(correct) exactly once.
  UI.buildProblemForm = function (container, problem, onAnswer) {
    let answered = false;
    const resolve = (correct) => {
      if (answered) return;
      answered = true;
      container.querySelectorAll('button,input').forEach(n => n.disabled = true);
      onAnswer(correct);
    };
    if (problem.kind === 'choice') {
      container.innerHTML = `<div class="choices">` +
        problem.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('') +
        `</div>`;
      container.querySelectorAll('.choice').forEach(b => {
        b.onclick = () => resolve(+b.dataset.i === problem.answer);
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
      resolve(MM.problems.checkAnswer(problem, input.value));
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
  function checkBlankModal(html, when) {
    if (modalEl.classList.contains('hidden')) return;
    if (modalBox.childElementCount > 0 && modalBox.textContent.trim().length > 0) return;
    MM.bugs.record('blank-modal',
      `modal blank (${when}); intended ${String(html || '').length} chars; showing "${modalBox.innerHTML.slice(0, 150)}"`, '');
    modalBox.innerHTML = `
      <h2>🐛 Oops — empty window!</h2>
      <div class="dialog-body">That window came up blank. The good news: it's been
      <b>recorded in the bug log</b> (👪 Parent → 🐛 Bug log → Copy bug report).<br><br>
      Nothing is lost — carry on playing!</div>
      <div class="btnrow"><button id="dlgOk" class="primary">Carry on</button></div>`;
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
  }
  function openModal(html) {
    // breadcrumb the window itself, so a blank-modal report names the culprit
    MM.track('modal: ' + String(html || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 48));
    modalBox.innerHTML = html;
    modalEl.classList.remove('hidden');
    checkBlankModal(html, 'at open');
    setTimeout(() => checkBlankModal(html, '300ms later'), 300);
  }
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
      const rows = owned.map(id => {
        const item = MM.data.gearById(slot, id);
        const on = s.equipped[slot] === id;
        return `<div class="shop-row${on ? ' equipped' : ''}">
          <span class="shop-item">${MM.data.gearLabel(slot, id)}${item.quip ? `<span class="quip">${item.quip}</span>` : ''}</span>
          <span class="shop-stat">${MM.data.gearStat(slot, item)}</span>
          ${on ? '<span class="shop-buy">✓ equipped</span>'
               : `<button class="shop-buy" data-equip="${slot}:${id}">Equip</button>`}
        </div>`;
      }).join('');
      const oneAtATime = slot === 'ring' || slot === 'amulet';
      const unequip = (oneAtATime && s.equipped[slot])
        ? `<div class="shop-row"><span class="shop-item dim">${slot === 'ring' ? 'Bare finger' : 'Bare neck'}</span><span class="shop-stat">—</span>
           <button class="shop-buy" data-equip="${slot}:">Unequip</button></div>` : '';
      return `<div class="slot-label">${MM.data.SLOT_NAMES[slot]}${owned.length ? '' : ' <span class="dim">— nothing yet</span>'}</div>${rows}${unequip}`;
    }).join('');
    // Wave 2: loose (unfused) gems — Emberlyn in Port Brightwater fuses them
    const gemCounts = {};
    (s.items.gems || []).forEach(id => gemCounts[id] = (gemCounts[id] || 0) + 1);
    const gemRows = Object.keys(gemCounts).length
      ? Object.entries(gemCounts).map(([id, n]) => {
          const g = MM.data.gemById(id);
          return `<div class="shop-row">
            <span class="shop-item">${g.emoji} ${g.name} Gem${n > 1 ? ' × ' + n : ''}<span class="quip">${g.desc}</span></span>
            <span class="bag-note">fuse at Emberlyn's</span>
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
          <span class="shop-item"><b>${pet.name}</b> the ${species.name} ${species.emoji} — <b>${stage.name}</b>
            <span class="quip">${next
              ? `Next: ${next.name} at ${next.correct} correct answers (${Math.min(pet.correct, next.correct)}/${next.correct}) and ${next.fed} meals (${Math.min(pet.fed, next.fed)}/${next.fed}).`
              : 'Fully grown, maximally proud of you.'}</span></span>
          <span class="shop-stat">🦴 × ${s.items.treats || 0}</span>
          <button class="shop-buy" id="feedPet" ${s.items.treats > 0 ? '' : 'disabled'}>Feed</button>
        </div>`;
    }
    const badgeRows = MM.data.TASKS.filter(t => !t.exp).map(t => {
      const tier = (s.badges || {})[t.skill] || 0;
      const icons = [1, 2, 3].map(k =>
        `<span class="${k <= tier ? 'badge-on' : 'badge-dim'}">${MM.data.BADGES[k].emoji}</span>`).join(' ');
      return `<div class="charm-row">${icons} ${MM.data.SKILL_NAMES[t.skill]}</div>`;
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
      </div>
      <div class="btnrow"><button id="bagClose" class="secondary">Close</button></div>`);
    document.getElementById('bagClose').onclick = () => { closeModal(); UI.refresh(); };
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

  // ---------- difficulty (kid-settable): monster health & damage ----------
  UI.difficultyDialog = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const mark = d => s.difficulty === d ? ' ✓' : '';
    const pick = (d, label) => () => {
      s.difficulty = d;
      MM.engine.save();
      UI.log(`⚙️ Difficulty set to <b>${label}</b> — it takes effect in the next dungeon you enter.`);
    };
    UI.dialogChoices('⚙️ Difficulty',
      `How tough should the monsters be? <span class="dim">(This changes their health and how hard they hit —
       never the math. It takes effect the next time you enter a dungeon.)</span>`,
      [
        { label: `🌸 Story${mark('story')}`, onClick: pick('story', 'Story'), primary: s.difficulty === 'story' },
        { label: `⚔️ Hero${mark('hero')}`, onClick: pick('hero', 'Hero'), primary: s.difficulty === 'hero' },
        { label: `🔥 Legend${mark('legend')}`, onClick: pick('legend', 'Legend'), primary: s.difficulty === 'legend' },
        { label: 'Cancel', onClick: () => {} },
      ]);
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

  function parentSettings() {
    const s = MM.engine.state;
    const topics = s.parent.topics || {};
    const checks = MM.data.PARENT_TOPICS.map(skill => {
      const m = (s.mastery || {})[skill];
      const acc = m && m.attempts ? ` <span class="dim">(${m.correct}/${m.attempts})</span>` : '';
      const tier = (s.badges || {})[skill] || 0;
      return `<label class="topic-check">
        <input type="checkbox" data-skill="${skill}" ${topics[skill] !== false ? 'checked' : ''}>
        ${MM.data.SKILL_NAMES[skill]}${tier ? ' ' + MM.data.BADGES[tier].emoji : ''}${acc}
      </label>`;
    }).join('');
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
        <p class="dim" style="font-size:12.5px;margin-top:6px">If "Multi-Digit Add & Subtract" is unchecked,
        the shop's money quizzes are skipped too. At least one topic must stay checked.</p>
        <h3>🧘 Calm Mode</h3>
        <label class="topic-check">
          <input type="checkbox" id="calmModeCheck" ${s.calmMode ? 'checked' : ''}>
          Turn off screen shake and particle bursts (battles stay just as playable — no motion, that's all)
        </label>
        <h3>Current progress</h3>
        <p style="font-size:14px">📗 On task <b>${Math.min(s.taskIndex, 13)}</b> ·
          answered <b>${s.totals.correct}/${s.totals.answered}</b> correctly overall.
          Press <b>R</b> in-game for the full per-topic report card.</p>
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
      MM.engine.save();
      closeModal();
      const n = Object.values(map).filter(Boolean).length;
      UI.log(`👪 Parent settings saved (${n}/${MM.data.PARENT_TOPICS.length} math topics enabled${anyOn ? '' : ' — kept Addition & Subtraction Facts on'}).`);
    };
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

  UI.helpDialog = function () {
    if (UI.modalOpen()) return;
    UI.dialog('📖 How to play',
      `<b>Explore:</b> arrow keys or WASD. Bump into things to interact.<br><br>
       <b>⚔ Battles:</b> each round you get a <b>quick</b> math problem. A <b>correct answer strikes</b>
       the monster for your attack power (better weapons hit harder). Then the monster strikes back —
       your <b>armor blocks</b> part of its damage, and a correct answer gives you a
       <b>chance to dodge</b> entirely. Wrong answers miss (and show you the solution).<br><br>
       <b>🏃 Fleeing:</b> always allowed — but the monster <b>fully recovers</b> while
       you run, so you can't skip the hard questions for free.<br><br>
       <b>🔥 Streaks:</b> 3 correct in a row = +2 damage, 6 = +4. At 5+ you can land
       <b>critical hits</b> for double damage!<br><br>
       <b>🥉🥈🥇 Badges:</b> every math topic has bronze, silver, and gold badges —
       earn them with correct answers. Your badge shelf lives in the 🎒 bag.<br><br>
       <b>📖 Spellbook:</b> gold badges unlock utility spells, one at a time, shown
       in a spellbook row in the sidebar the moment each becomes available —
       🔍 <b>Scout</b> (3 gold badges — hidden walls shimmer for 10 seconds, once
       per dungeon visit), ⚡ <b>Blink</b> (6 gold badges, 10 stamina — walk or bump
       TOWARD what you want to hop over, then click Blink; you land two tiles
       ahead, on the far side), and 🕯 <b>Beacon</b> (gold badges in every enabled
       topic, at least 6 — instantly return to the dungeon's entrance, once per
       visit). Spells only work <b>inside a dungeon</b> — click the sidebar button,
       there's no keyboard shortcut. They never fight for you — only mastery
       earns exploration power.<br><br>
       <b>🪢 Rope of Return:</b> sold at every shop — use it from your 🎒 bag while
       inside a dungeon to climb straight back out, no walking required. A
       convenience item, not a reward (Beacon is the free version you earn).<br><br>
       <b>📕 Monster Book (M):</b> defeat each kind of monster to fill in its card.
       Can you discover all of them?<br><br>
       <b>🪧 Notice Board:</b> next to the castle — small jobs with gold rewards,
       fresh every morning (or as soon as you finish them).<br><br>
       <b>🧠 The big questions</b> live where nothing is attacking you: <b>boss fights</b>,
       <b>🚪 doors</b>, <b>🎁 chests</b>, and the <b>🔮 seal</b> on each new dungeon.<br><br>
       <b>🍗 Stamina:</b> walking and fighting make you tired. At zero you're <b>exhausted</b>
       (half damage, no dodging) — eat food from your <b>🎒 bag</b>, or rest at the 🛏 inn.<br><br>
       <b>🎁 Chests</b> can hold gold, food, potions, <b>treasures to sell</b> at the 🏪 shop,
       and — rarely — <b>✨ magical charms</b>. You can collect every charm, but only
       <b>wear three at a time</b> — choose them in your 🎒 bag!<br><br>
       There are <b>no timers</b> — take all the time you need. Careful beats fast!`);
  };

  // ---------- the problem modal (doors, chests, inn, shop) ----------
  // opts: {header, problem, leaveLabel, onAnswer(correct)->{msg, end?}, onNext(), onEnd(kind)}
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

    UI.buildProblemForm(document.getElementById('probForm'), p, (correct) => {
      if (correct) MM.sound.correct(); else MM.sound.wrong();
      const result = opts.onAnswer(correct) || {};
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
    // Port Brightwater's Brass Compass carries the isle-tier stock; the
    // Numeria General Store carries everything else.
    const onIsles = s.mapId === 'isles';
    const gearSection = (slot, blurb) => {
      const items = MM.data.GEAR[slot].filter(it => it.price > 0 && !it.notForSale && !!it.isle === onIsles)
        .map(it => row(it, slot, (s.gear[slot] || []).includes(it.id))).join('');
      return items ? `<h3>${MM.data.SLOT_NAMES[slot]} — ${blurb}</h3>${items}` : '';
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
      ? `<h3>Isle specialties</h3>${row(MM.data.MYSTERY, 'mystery', false)}${row(MM.data.TREAT, 'treat', false)}${hearthmossRow}`
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
          if (!it || it.price <= 0) return '';
          return `<div class="shop-row">
            <span class="shop-item">${it.emoji} ${it.name}</span>
            <span class="shop-price">${Math.floor(it.price / 2)} g</span>
            <button class="shop-sell" data-sellgear="${slot}:${id}">Sell</button>
          </div>`;
        })).join('');
    const gearTab = `
        ${gearSection('weapon', 'hit harder with every correct answer')}
        ${gearSection('body', 'block more of every monster hit')}
        ${gearSection('helmet', 'a bit more block, up top')}
        ${gearSection('boots', 'block — and some help your dodging')}
        ${gearSection('ring', 'one finger, one power — choose!')}`;
    const suppliesTab = `
        <h3>Food — restores stamina (eat from your 🎒 bag)</h3>${food}
        <h3>Potions & supplies</h3>${potionRow}
        ${isleGoods}`;
    const sellTab = (treasureSell || gearSell)
      ? `<h3>💰 The shopkeeper buys treasures & used gear</h3>${treasureSell}${gearSell}`
      : `<p class="dim">Nothing to sell right now — treasures and unequipped gear show up here.</p>`;
    const tabContent = shopTab === 'supplies' ? suppliesTab : shopTab === 'sell' ? sellTab : gearTab;
    const tabBtn = (tab, label) => `<button class="shop-tab-btn${shopTab === tab ? ' active' : ''}" data-tab="${tab}">${label}</button>`;
    openModal(`
      <h2>${onIsles ? '🧭 The Brass Compass' : '🏪 Numeria General Store'}</h2>
      <div class="dialog-body">
        <div class="shop-gold">You have <b>💰 ${s.gold} gold</b>. Answer the shopkeeper's question for <b>10% off</b> (or a selling bonus)!
        <br><span class="dim">${onIsles ? 'Gear of the deep sea — nothing finer this side of the horizon.' : 'Bought gear goes to your 🎒 bag — used gear sells back for half price.'}</span></div>
        <div class="shop-tabs">${tabBtn('gear', '⚔️ Gear')}${tabBtn('supplies', '🧪 Supplies')}${tabBtn('sell', '💰 Sell')}</div>
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
  UI.reportCard = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen() || MM.battle.active()) return;
    const rows = MM.data.TASKS.filter(t => !t.exp).map((t, i) => {
      const m = (s.mastery || {})[t.skill];
      const acc = m && m.attempts ? Math.round(m.correct / m.attempts * 100) : null;
      const locked = i + 1 > s.taskIndex;
      const tier = (s.badges || {})[t.skill] || 0;
      return `<div class="report-row${locked ? ' locked' : ''}">
        <span class="report-skill">${locked ? '🔒' : s.tasksDone.includes(i + 1) ? '✅' : '📗'} ${MM.data.SKILL_NAMES[t.skill]}${tier ? ' ' + MM.data.BADGES[tier].emoji : ''}</span>
        <span class="report-acc">${m && m.attempts ? `${m.correct}/${m.attempts} (${acc}%)` : '—'}</span>
        <span class="report-bar"><span style="width:${acc || 0}%" class="${acc >= 85 ? 'great' : acc >= 60 ? 'ok' : 'work'}"></span></span>
      </div>`;
    }).join('');
    const total = s.totals || { answered: 0, correct: 0 };
    UI.dialog('📊 Report Card — ' + s.name,
      `<div class="report-total">Problems solved: <b>${total.correct}</b> of <b>${total.answered}</b>` +
      (total.answered ? ` (${Math.round(total.correct / total.answered * 100)}%)` : '') + `</div>${rows}`);
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
    const board = onIsle ? s.isleBounties : s.bounties;
    if (!board) {
      return UI.dialog('🪧 Notice Board',
        'The board is empty — the kingdom only posts jobs for <b>working heroes</b>.<br><br>' +
        'Visit the 🏰 <b>castle</b> and get your first task from the MathMaker!');
    }
    const icon = { hunt: '⚔️', solve: '✏️', streak: '🔥', spar: '🥊', gemchest: '✨', thief: '🪶', spire: '⏰' };
    const rows = board.items.map(it => `
      <div class="shop-row${it.done ? ' owned' : ''}">
        <span class="shop-item">${it.done ? '✅' : icon[it.type]} ${it.label}</span>
        <span class="shop-stat">${it.done ? 'done!' : `${it.have}/${it.need}`}</span>
        <span class="shop-price">${it.reward} g</span>
      </div>`).join('');
    UI.dialog(onIsle ? '🪧 Harbor Notice Board' : '🪧 Notice Board',
      `<div class="shop-gold">${onIsle ? 'The harbor needs help too!' : 'The kingdom needs help!'} Finish a job and the reward is paid <b>on the spot</b>.</div>
       ${rows}
       <p class="dim" style="font-size:13px;margin-top:10px">New notices are posted each morning — or as soon as you finish these.</p>
       <p class="dim" style="font-size:12px;font-style:italic">${MM.data.pick(MM.data.BOARD_LINES)}</p>`);
  };

  // ---------- the Monster Book (bestiary) ----------
  // Cards fill in as you play: never-encountered monsters are dark silhouettes
  // marked ???, encountered-but-unbeaten ones show their portrait, and a
  // defeated monster reveals its card (flavor text + defeat count) forever.
  function beastPortrait(type, revealed) {
    const cv = MM.sprites.get(type.sprite, { palette: type.pal || {}, scale: 3 });
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
    const b = MM.engine.state.bestiary || { seen: {}, kills: {}, gauntlet: {} };
    const kills = b.kills[type.name] || 0;
    const seen = !!b.seen[type.name];
    // Wave 5 item 4: a Champion's Gauntlet win marks the boss's card for good
    const gauntletWon = !!(isBoss && b.gauntlet && b.gauntlet[type.name]);
    const img = `<img class="beast-img" src="${beastPortrait(type, kills > 0)}" alt="">`;
    if (kills > 0) {
      return `<div class="beast-row">${img}<div class="beast-info">
        <div class="beast-name">${isBoss ? '👑 ' : ''}${type.name}${gauntletWon ? ' 👑✨' : ''}</div>
        <div class="beast-desc">${type.desc || ''}</div>
      </div><span class="beast-count">⚔ × ${kills}</span></div>`;
    }
    if (seen) {
      return `<div class="beast-row">${img}<div class="beast-info">
        <div class="beast-name">${isBoss ? '👑 ' : ''}${type.name}</div>
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
    const b = s.bestiary || { seen: {}, kills: {} };
    // every card in the book (regulars + bosses per dungeon, + the golem)
    const allCards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD]);
    const found = allCards.filter(t => (b.kills[t.name] || 0) > 0).length;
    // pages exist for every dungeon assigned so far; isle pages open with
    // their pass (taskIndex stops at 14 — lenses gate the later isles)
    let shownDungeons = Math.max(1, Math.min(14, s.taskIndex || 1));
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
    const blankNote = shownDungeons < 13
      ? `<p class="dim" style="font-size:13px;font-style:italic">...the rest of the pages are still blank. New places, new monsters!</p>`
      : '';
    openModal(`
      <h2>📕 Monster Book — ${s.name}</h2>
      <div class="dialog-body">
        <div class="shop-gold">Discovered: <b>${found}</b> of <b>${allCards.length}</b> monsters
          <span class="dim">(defeat a monster to fill in its card)</span></div>
        ${sections}${golemSection}${blankNote}
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
