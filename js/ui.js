// MathMaker — rendering, modals, sidebar, scratchpad, sound.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const UI = MM.ui = {};
  const TILE = 40;
  const VIEW_W = 15, VIEW_H = 11;

  let canvas, ctx, modalEl, modalBox;
  let messages = [];

  // ---------- tiny sound effects (WebAudio, no assets) ----------
  let audioCtx = null;
  function beep(freq, dur, type, delay, vol) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime + (delay || 0);
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* sound is optional */ }
  }
  MM.sound = {
    correct() { beep(523, 0.12); beep(784, 0.2, 'triangle', 0.1); },
    wrong() { beep(180, 0.35, 'sawtooth', 0, 0.06); },
    coin() { beep(880, 0.08); beep(1175, 0.15, 'triangle', 0.07); },
    levelup() { beep(523, 0.12); beep(659, 0.12, 'triangle', 0.1); beep(784, 0.12, 'triangle', 0.2); beep(1047, 0.3, 'triangle', 0.3); },
    fanfare() { beep(523, 0.15); beep(659, 0.15, 'triangle', 0.12); beep(784, 0.15, 'triangle', 0.24); beep(1047, 0.4, 'triangle', 0.36); beep(784, 0.3, 'triangle', 0.55); beep(1047, 0.5, 'triangle', 0.7); },
  };

  // ---------- tile appearance ----------
  const TILES = {
    '~': { bg: '#2a6db8', fg: '' },
    '.': { bg: '#4a9648', fg: '' },
    'T': { bg: '#3d7c3c', fg: '🌲' },
    'M': { bg: '#7a7466', fg: '⛰️' },
    'C': { bg: '#8a8fa8', fg: '🏰' },
    'S': { bg: '#4a9648', fg: '🏪' },
    'I': { bg: '#4a9648', fg: '🛏' },
    'P': { bg: '#4a9648', fg: '' },
    '#': { bg: '#3b3549', fg: '' },
    'D': { bg: '#5a5370', fg: '🚪' },
    '*': { bg: '#4d4660', fg: '🎁' },
    'X': { bg: '#4d4660', fg: '🪜' },
  };
  const DUNGEON_FLOOR = { bg: '#4d4660', fg: '' };

  UI.init = function () {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    modalEl = document.getElementById('overlay');
    modalBox = document.getElementById('modalBox');

    document.addEventListener('keydown', (ev) => {
      // never swallow keys the user is typing into a text field (name, answers)
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      if (UI.modalOpen()) return;
      const k = ev.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') { ev.preventDefault(); MM.engine.tryMove(0, -1); }
      else if (k === 'arrowdown' || k === 's') { ev.preventDefault(); MM.engine.tryMove(0, 1); }
      else if (k === 'arrowleft' || k === 'a') { ev.preventDefault(); MM.engine.tryMove(-1, 0); }
      else if (k === 'arrowright' || k === 'd') { ev.preventDefault(); MM.engine.tryMove(1, 0); }
      else if (k === 'p') MM.engine.usePotion();
      else if (k === 'r') UI.reportCard();
    });

    document.getElementById('btnPotion').onclick = () => MM.engine.usePotion();
    document.getElementById('btnReport').onclick = () => UI.reportCard();
    document.getElementById('btnSwitch').onclick = () => {
      MM.engine.save();
      location.reload();
    };
  };

  UI.modalOpen = () => modalEl && !modalEl.classList.contains('hidden');

  // ---------- world rendering ----------
  UI.refresh = function () {
    const s = MM.engine.state;
    if (!s || !s.grid) return;
    const grid = s.grid;
    const H = grid.length, W = grid[0].length;
    const inDungeon = s.mapId !== 'world';

    let camX = Math.max(0, Math.min(W - VIEW_W, s.px - Math.floor(VIEW_W / 2)));
    let camY = Math.max(0, Math.min(H - VIEW_H, s.py - Math.floor(VIEW_H / 2)));
    if (W <= VIEW_W) camX = 0;
    if (H <= VIEW_H) camY = 0;

    ctx.fillStyle = '#141221';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let vy = 0; vy < VIEW_H; vy++) {
      for (let vx = 0; vx < VIEW_W; vx++) {
        const x = camX + vx, y = camY + vy;
        if (y >= H || x >= W) continue;
        const ch = grid[y][x];
        const t = TILES[ch] || (inDungeon ? DUNGEON_FLOOR : TILES['.']);
        ctx.fillStyle = t.bg;
        ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
        // subtle grid texture
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(vx * TILE + 0.5, vy * TILE + 0.5, TILE - 1, TILE - 1);
        if (t.fg) {
          ctx.font = '26px serif';
          ctx.fillText(t.fg, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 2);
        }
        if (!inDungeon && '1234567890'.includes(ch)) {
          ctx.font = '24px serif';
          ctx.fillText('🕳️', vx * TILE + TILE / 2, vy * TILE + TILE / 2);
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#ffd94a';
          ctx.fillText(ch, vx * TILE + TILE - 9, vy * TILE + 11);
        }
      }
    }

    // monsters
    for (const m of (s.monsters || [])) {
      if (m.hp <= 0) continue;
      const vx = m.x - camX, vy = m.y - camY;
      if (vx < 0 || vy < 0 || vx >= VIEW_W || vy >= VIEW_H) continue;
      if (m.boss) {
        ctx.fillStyle = 'rgba(255, 60, 60, 0.25)';
        ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
      }
      ctx.font = m.boss ? '30px serif' : '26px serif';
      ctx.fillText(m.emoji, vx * TILE + TILE / 2, vy * TILE + TILE / 2 + 2);
    }

    // player
    ctx.font = '28px serif';
    ctx.fillText('🧒', (s.px - camX) * TILE + TILE / 2, (s.py - camY) * TILE + TILE / 2 + 1);

    UI.renderSidebar();
  };

  UI.renderSidebar = function () {
    const s = MM.engine.state;
    if (!s) return;
    const w = MM.data.weaponById(s.weapon), a = MM.data.armorById(s.armor);
    const hpPct = Math.max(0, Math.round(s.hp / s.maxhp * 100));
    document.getElementById('statHp').innerHTML =
      `<div class="hpbar"><div class="hpfill${hpPct < 35 ? ' low' : ''}" style="width:${hpPct}%"></div></div>❤️ ${s.hp}/${s.maxhp}`;
    document.getElementById('statGold').textContent = `💰 ${s.gold} gold`;
    document.getElementById('statLevel').textContent = `⭐ Level ${s.level}  (${s.xp}/${MM.data.xpForLevel(s.level)} XP)`;
    document.getElementById('statGear').textContent = `${w.emoji} ${w.name} · ${a.emoji} ${a.name}`;
    document.getElementById('statPotions').textContent = `🧪 Potions: ${s.potions}`;
    document.getElementById('statStreak').innerHTML = s.streak >= 3
      ? `🔥 <b>Streak: ${s.streak}!</b> (bonus damage +${s.streak >= 6 ? 4 : 2})`
      : (s.streak > 0 ? `✨ Streak: ${s.streak}` : '');

    const taskEl = document.getElementById('taskBox');
    if (s.taskIndex === 0) {
      taskEl.innerHTML = '🏰 <b>Visit the castle</b> to meet the MathMaker!';
    } else if (s.taskIndex > 10) {
      taskEl.innerHTML = '👑 <b>All ten tasks complete!</b>';
    } else {
      const t = MM.data.TASKS[s.taskIndex - 1];
      taskEl.innerHTML = `📜 <b>Task ${s.taskIndex}/10:</b> ` + (s.haveItem
        ? `${t.itemEmoji} Return the <b>${t.item}</b> to the castle! 🏰`
        : `Find the <b>${t.item}</b> in the <b>${t.dungeon}</b> (map: ${s.taskIndex === 10 ? '0' : s.taskIndex})`);
    }

    document.getElementById('log').innerHTML = messages.map(m => `<div>${m}</div>`).join('');
  };

  UI.log = function (msg) {
    messages.push(msg);
    if (messages.length > 6) messages.shift();
    const el = document.getElementById('log');
    if (el) el.innerHTML = messages.map(m => `<div>${m}</div>`).join('');
  };

  // ---------- modal helpers ----------
  function openModal(html) {
    modalBox.innerHTML = html;
    modalEl.classList.remove('hidden');
  }
  function closeModal() {
    modalEl.classList.add('hidden');
    modalBox.innerHTML = '';
  }

  UI.dialog = function (title, html, onClose) {
    openModal(`
      <h2>${title}</h2>
      <div class="dialog-body">${html}</div>
      <div class="btnrow"><button id="dlgOk" class="primary">OK</button></div>`);
    document.getElementById('dlgOk').onclick = () => { closeModal(); if (onClose) onClose(); UI.refresh(); };
  };

  // ---------- the problem modal ----------
  // opts: {header, problem, leaveLabel, onAnswer(correct)->{msg, end?}, onNext(), onEnd(kind)}
  UI.showProblem = function (opts) {
    const p = opts.problem;
    let answerHtml;
    if (p.kind === 'choice') {
      answerHtml = `<div class="choices">` +
        p.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('') +
        `</div>`;
    } else {
      answerHtml = `
        <div class="answer-row">
          <input id="answerInput" type="text" autocomplete="off" placeholder="Your answer" />
          <button id="submitBtn" class="primary">Answer ✓</button>
        </div>
        ${p.hint ? `<div class="hint">💡 ${p.hint}</div>` : ''}`;
    }

    openModal(`
      <div class="prob-header">${opts.header}</div>
      <div class="prob-text">${p.text.replace(/\n/g, '<br>')}</div>
      ${answerHtml}
      <div id="feedback" class="feedback"></div>
      <div class="scratch-wrap">
        <div class="scratch-label">✏️ Scratch space — work it out here <button id="scratchClear" class="mini">clear</button></div>
        <canvas id="scratch" width="520" height="150"></canvas>
      </div>
      <div class="btnrow">
        <button id="leaveBtn" class="secondary">${opts.leaveLabel || 'Leave'}</button>
      </div>`);

    setupScratchpad();

    const feedback = document.getElementById('feedback');
    const leaveBtn = document.getElementById('leaveBtn');
    let answered = false;

    leaveBtn.onclick = () => { closeModal(); opts.onEnd && opts.onEnd('leave'); };

    function resolve(correct) {
      if (answered) return;
      answered = true;
      if (correct) MM.sound.correct(); else MM.sound.wrong();
      const result = opts.onAnswer(correct) || {};
      let html = correct
        ? `<div class="right">✓ Correct!</div>`
        : `<div class="wrong">✗ Not quite.</div><div class="solution">${p.solution}</div>`;
      if (result.msg) html += `<div class="result-msg">${result.msg}</div>`;
      feedback.innerHTML = html;
      // swap controls for a Continue button
      document.querySelectorAll('.choice, #submitBtn').forEach(b => b.disabled = true);
      const input = document.getElementById('answerInput');
      if (input) input.disabled = true;
      leaveBtn.style.display = 'none';
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = result.end ? 'Continue ➜' : 'Next ➜';
      btn.onclick = () => {
        if (result.end) { closeModal(); opts.onEnd && opts.onEnd(result.end); }
        else opts.onNext();
      };
      document.querySelector('.btnrow').appendChild(btn);
      btn.focus();
      UI.renderSidebar();
    }

    if (p.kind === 'choice') {
      document.querySelectorAll('.choice').forEach(b => {
        b.onclick = () => resolve(+b.dataset.i === p.answer);
      });
    } else {
      const input = document.getElementById('answerInput');
      const submit = () => {
        if (!input.value.trim()) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
        if (MM.problems.parseAnswer(input.value) == null && MM.problems.parseAnswer(input.value) !== 0) {
          const fb = document.getElementById('feedback');
          fb.innerHTML = `<div class="hint">Hmm, I can't read "${input.value}" — try a number like <b>12</b>, <b>3.5</b>, <b>3/4</b>, or <b>14 r 2</b>.</div>`;
          return;
        }
        resolve(MM.problems.checkAnswer(p, input.value));
      };
      document.getElementById('submitBtn').onclick = submit;
      input.addEventListener('keydown', ev => { if (ev.key === 'Enter') submit(); });
      input.focus();
    }
  };

  function setupScratchpad() {
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
    document.getElementById('scratchClear').onclick = () => sctx.clearRect(0, 0, sc.width, sc.height);
  }

  // ---------- shop ----------
  UI.openShop = function () {
    const s = MM.engine.state;
    const row = (item, kind, owned) => `
      <div class="shop-row${owned ? ' owned' : ''}">
        <span class="shop-item">${item.emoji} ${item.name}</span>
        <span class="shop-stat">${kind === 'weapon' ? '⚔️ ' + item.atk : kind === 'armor' ? '🛡 ' + item.def : '+' + item.heal + ' HP'}</span>
        <span class="shop-price">${item.price} g</span>
        ${owned ? '<span class="shop-buy">✓ owned</span>' : `<button class="shop-buy" data-kind="${kind}" data-id="${item.id || 'potion'}" ${s.gold < item.price ? 'disabled' : ''}>Buy</button>`}
      </div>`;
    const weapons = MM.data.WEAPONS.filter(w => w.price > 0).map(w => row(w, 'weapon', s.weapon === w.id || MM.data.weaponById(s.weapon).atk >= w.atk)).join('');
    const armor = MM.data.ARMOR.filter(a => a.price > 0).map(a => row(a, 'armor', s.armor === a.id || MM.data.armorById(s.armor).def >= a.def)).join('');
    openModal(`
      <h2>🏪 Numeria General Store</h2>
      <div class="dialog-body">
        <div class="shop-gold">You have <b>💰 ${s.gold} gold</b>. Answer the shopkeeper's question for <b>10% off</b>!</div>
        <h3>Weapons</h3>${weapons}
        <h3>Armor</h3>${armor}
        <h3>Supplies</h3>${row(MM.data.POTION, 'potion', false)}
      </div>
      <div class="btnrow"><button id="shopClose" class="secondary">Leave shop</button></div>`);
    document.getElementById('shopClose').onclick = () => { closeModal(); UI.refresh(); };
    document.querySelectorAll('button.shop-buy').forEach(b => {
      b.onclick = () => {
        const kind = b.dataset.kind;
        const item = kind === 'weapon' ? MM.data.weaponById(b.dataset.id)
          : kind === 'armor' ? MM.data.armorById(b.dataset.id) : MM.data.POTION;
        closeModal();
        MM.engine.buy(item, kind);
      };
    });
  };

  // ---------- report card ----------
  UI.reportCard = function () {
    const s = MM.engine.state;
    if (!s || UI.modalOpen()) return;
    const rows = MM.data.TASKS.map((t, i) => {
      const m = (s.mastery || {})[t.skill];
      const acc = m && m.attempts ? Math.round(m.correct / m.attempts * 100) : null;
      const locked = i + 1 > s.taskIndex;
      return `<div class="report-row${locked ? ' locked' : ''}">
        <span class="report-skill">${locked ? '🔒' : s.tasksDone.includes(i + 1) ? '✅' : '📗'} ${MM.data.SKILL_NAMES[t.skill]}</span>
        <span class="report-acc">${m && m.attempts ? `${m.correct}/${m.attempts} (${acc}%)` : '—'}</span>
        <span class="report-bar"><span style="width:${acc || 0}%" class="${acc >= 85 ? 'great' : acc >= 60 ? 'ok' : 'work'}"></span></span>
      </div>`;
    }).join('');
    const total = s.totals || { answered: 0, correct: 0 };
    UI.dialog('📊 Report Card — ' + s.name,
      `<div class="report-total">Problems solved: <b>${total.correct}</b> of <b>${total.answered}</b>` +
      (total.answered ? ` (${Math.round(total.correct / total.answered * 100)}%)` : '') + `</div>${rows}`);
  };

  UI.victory = function () {
    const s = MM.engine.state;
    const total = s.totals;
    openModal(`
      <h2>👑 YOU ARE THE MATHMAKER'S CHAMPION! 👑</h2>
      <div class="dialog-body" style="text-align:center">
        <div style="font-size:64px">🏆</div>
        <p>The MathMaker places the <b>Crown of Numbers</b> on your head.</p>
        <p><i>"All ten treasures returned! Numeria will sing of the hero who conquered every problem."</i></p>
        <p>You answered <b>${total.correct}</b> problems correctly out of <b>${total.answered}</b>
        (${Math.round(total.correct / total.answered * 100)}%).</p>
        <p>You can keep exploring — every dungeon stays open for more adventure and practice!</p>
      </div>
      <div class="btnrow"><button id="dlgOk" class="primary">🎉 Hooray!</button></div>`);
    MM.sound.fanfare();
    document.getElementById('dlgOk').onclick = () => { closeModal(); UI.refresh(); };
  };
})();
