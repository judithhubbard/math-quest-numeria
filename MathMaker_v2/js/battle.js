// MathMaker v2 — the battle screen.
// Real turn-based combat: you answer to strike, the monster strikes back
// every round (your armor blunts it; a correct answer may let you dodge).
// Dueling animated HP bars, damage numbers, screen shake, particles, crits.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const B = MM.battle = {};
  const W = 720, H = 270;
  const HERO = { x: 300, y: 225, scale: 6 };
  const MON = { x: 545, y: 222 };

  let bt = null; // current battle state (null = no battle)

  B.active = () => !!bt;
  // Wave 5 item 7: exposed for the Calm Mode drive check (same "exposed for
  // tests" convention as B.current) — shake amount + live particle count,
  // both of which Calm Mode should hold at zero.
  B.debugEffects = () => bt ? { shake: bt.shake, particles: bt.particles.length } : null;

  // ---------- helpers ----------
  function el(id) { return document.getElementById(id); }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  // seaweed-green hair from a dud mystery potion carries into battle. It's a look.
  function heroPal() {
    return MM.engine.state && MM.engine.state.greenHair ? { P: '#4ec449' } : {};
  }

  function silhouette(cv, color) {
    const s = document.createElement('canvas');
    s.width = cv.width; s.height = cv.height;
    const c = s.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, s.width, s.height);
    return s;
  }

  // ---------- battle lifecycle ----------
  // mon: live monster object from engine {name,sprite,pal,verb,hp,maxhp,atk,boss,...}
  // ctx: {dungeonIndex, hooks:{pickProblem, recordAnswer, playerStrike, applyMonsterHit,
  //        playerHp, playerMaxHp, playerAtkLabel, playerDefLabel, victory, onEnd}}
  B.start = function (mon, ctx) {
    MM.track('battle:start ' + mon.name);
    const theme = MM.data.THEMES[ctx.dungeonIndex - 1];
    const scale = mon.boss ? 8 : 6;
    const spriteCv = MM.sprites.get(mon.sprite, { palette: mon.pal || {}, scale });
    bt = {
      mon, ctx, theme,
      monSprite: spriteCv,
      monWhite: silhouette(spriteCv, '#ffffff'),
      heroCv: MM.sprites.get('hero', { scale: HERO.scale, palette: heroPal() }),
      heroCv2: MM.sprites.get('hero2', { scale: HERO.scale, palette: heroPal() }),
      heroRed: silhouette(MM.sprites.get('hero', { scale: HERO.scale, palette: heroPal() }), '#ff6b6b'),
      crownCv: MM.sprites.get('crown', { scale: Math.round(scale / 2) }),
      heroOx: -240, heroOy: 0, monOx: 240, monOy: 0,
      monFlash: 0, heroFlash: 0, monAlpha: 1,
      shake: 0, t0: performance.now(),
      floaters: [], particles: [], tweens: [], timeouts: [],
      over: false, locked: true, monScale: scale, rangedFirstMissUsed: false,
      // flavor: bosses stay played straight; regular monsters get personality
      enterLine: mon.boss ? null
        : MM.data.flavor(mon.sprite, 'enter', mon.name)
          + (mon.hat ? ' It is wearing a tiny hat. No one knows why.' : ''),
      hatCv: mon.hat ? MM.sprites.get('crown', { scale: 2 }) : null,
    };
    buildDom();
    setBars(true);
    banner(mon.boss ? '☠️ BOSS BATTLE ☠️' : '⚔️ BATTLE! ⚔️', mon.boss ? '#ff6b5c' : '#ffd94a');
    MM.sound.battleStart(mon.boss);
    el('battleOverlay').classList.remove('hidden');
    rafLoop();
    // entrance: fighters slide in, then first problem
    tween(v => bt.heroOx = -240 * (1 - v), 450);
    tween(v => bt.monOx = 240 * (1 - v), 450);
    after(650, nextRound);
  };

  function teardown(result) {
    MM.track('battle:end ' + JSON.stringify(result));
    if (!bt) return;
    bt.over = true;
    bt.timeouts.forEach(clearTimeout);
    el('battleOverlay').classList.add('hidden');
    const ctx = bt.ctx;
    bt = null;
    ctx.hooks.onEnd(result);
  }

  function after(ms, fn) {
    if (!bt) return;
    bt.timeouts.push(setTimeout(() => { if (bt && !bt.over) fn(); }, ms));
  }

  function tween(apply, dur, done) {
    if (!bt) return;
    bt.tweens.push({ apply, dur, start: performance.now(), done });
  }

  // ---------- DOM ----------
  function buildDom() {
    const s = bt.ctx.hooks;
    el('battleOverlay').innerHTML = `
      <div class="battle-frame">
        <div class="stage-wrap">
          <canvas id="stage" width="${W}" height="${H}"></canvas>
          <div class="bbar-box mon">
            <div class="bbar-name">${bt.mon.boss ? '👑 ' : ''}${bt.mon.name}</div>
            <div class="bbar"><div class="ghost" id="monGhost"></div><div class="fill mon" id="monFill"></div></div>
            <div class="bbar-sub">⚔️ attacks for ${bt.mon.atk} each round</div>
          </div>
          <div class="bbar-box hero">
            <div class="bbar-name">🛡 ${MM.engine.state.name}</div>
            <div class="bbar"><div class="ghost" id="heroGhost"></div><div class="fill hero" id="heroFill"></div></div>
            <div class="bbar-sub">${s.playerAtkLabel()} · ${s.playerDefLabel()}${s.rangedNote ? s.rangedNote() : ''}</div>
          </div>
          <div id="battleBanner"></div>
        </div>
        <div id="battleMsg" class="battle-msg"></div>
        <div id="battleProblem" class="battle-problem"></div>
      </div>`;
  }

  function setBars(instant) {
    const s = bt.ctx.hooks;
    const mp = Math.max(0, bt.mon.hp / bt.mon.maxhp * 100);
    const hp = Math.max(0, s.playerHp() / s.playerMaxHp() * 100);
    for (const [fillId, ghostId, pct] of [['monFill', 'monGhost', mp], ['heroFill', 'heroGhost', hp]]) {
      const f = el(fillId), g = el(ghostId);
      if (!f) continue;
      if (instant) { f.style.transition = g.style.transition = 'none'; }
      f.style.width = pct + '%';
      g.style.width = pct + '%';
      if (instant) requestAnimationFrame(() => { f.style.transition = ''; g.style.transition = ''; });
      f.classList.toggle('low', pct < 35);
    }
    const hf = el('heroFill');
    if (hf && s.playerHp() <= 0) hf.style.width = '0%';
  }

  function banner(text, color) {
    const b = el('battleBanner');
    if (!b) return;
    b.innerHTML = `<span style="color:${color}">${text}</span>`;
    b.classList.remove('pop');
    void b.offsetWidth; // restart animation
    b.classList.add('pop');
  }

  function msg(html) {
    const m = el('battleMsg');
    if (m) m.innerHTML = html;
  }

  // ---------- rounds ----------
  function nextRound() {
    if (!bt || bt.over) return;
    const prob = bt.ctx.hooks.pickProblem();
    bt.problem = prob;
    B.current = prob; // exposed for tests
    bt.locked = false;
    const intro = bt.enterLine ? `<i>${bt.enterLine}</i><br>` : '';
    bt.enterLine = null; // shown with round 1 only
    msg(`${intro}🗡 <b>Your move!</b> Solve it to strike ${MM.data.theMon(bt.mon.name)}:`);
    const box = el('battleProblem');
    box.innerHTML = `
      ${prob.svg ? `<div class="prob-svg">${prob.svg}</div>` : ''}
      <div class="prob-text battle">${prob.text.replace(/\n/g, '<br>')}</div>
      <div id="probForm"></div>
      <div id="probFeedback" class="feedback"></div>
      <details class="scratch-details"><summary>✏️ scratch space</summary>
        <canvas id="scratch" width="640" height="140"></canvas>
        <button id="scratchClear" class="mini">clear</button>
      </details>
      <div class="btnrow battle-btnrow">
        <button id="fleeBtn" class="secondary">🏃 Flee</button>
      </div>`;
    MM.ui.buildProblemForm(el('probForm'), prob, onAnswer);
    MM.ui.setupScratchpad();
    el('fleeBtn').onclick = () => { if (!bt.locked) { MM.ui.log(`You flee from ${MM.data.theMon(bt.mon.name)}.`); teardown({ fled: true }); } };
  }

  function onAnswer(correct, kidAnswer) {
    if (!bt || bt.locked) return;
    bt.locked = true;
    el('fleeBtn').disabled = true;
    bt.ctx.hooks.recordAnswer(bt.problem.skill, correct, { text: bt.problem.text, kidAnswer });
    if (correct) {
      MM.sound.correct();
      el('probFeedback').innerHTML = `<div class="right">✓ Correct!</div>`;
      // the pet cheers from the sidelines
      const pet = MM.engine.state.isles && MM.engine.state.isles.pet;
      if (pet) float(HERO.x - 80, HERO.y - 90, '♪', '#7ee0e8', 16);
      playerAttack();
    } else {
      // Ring of Retry: one absorbed miss per battle — same problem, fresh try
      if (bt.ctx.hooks.tryRetry && bt.ctx.hooks.tryRetry()) {
        MM.sound.dodge();
        el('probFeedback').innerHTML =
          `<div class="hint">💍 <b>The Ring of Retry glows!</b> Not quite — but the ring absorbs the miss. Same problem, one more try. You've got this!</div>`;
        float(HERO.x, HERO.y - 150, '💍', '#ffd94a', 26);
        MM.ui.buildProblemForm(el('probForm'), bt.problem, onAnswer);
        el('fleeBtn').disabled = false;
        bt.locked = false;
        return;
      }
      MM.sound.wrong();
      // the monster's smug reaction — the joke is on the monster's manners,
      // never on the kid (bosses get no quip; those fights stay serious)
      const quip = bt.mon.boss ? '' :
        `<div class="miss-quip">${MM.data.flavor(bt.mon.sprite, 'miss', bt.mon.name)}</div>`;
      el('probFeedback').innerHTML =
        `<div class="wrong">✗ Not quite — your attack goes wide!</div>
         <div class="solution">${bt.problem.solution}</div>${quip}`;
      after(400, () => {
        float(HERO.x - 60, HERO.y - 160, 'MISS', '#9d92c9', 20);
        MM.sound.whoosh();
        after(700, () => monsterTurn(false));
      });
    }
  }

  function playerAttack() {
    const { dmg, crit } = bt.ctx.hooks.playerStrike();
    // lunge toward the monster and back
    tween(v => { bt.heroOx = 90 * Math.sin(v * Math.PI); }, 360);
    MM.sound.whoosh();
    after(190, () => {
      bt.mon.hp -= dmg;
      bt.monFlash = 1;
      bt.shake = crit ? 14 : 8;
      tween(v => { bt.monOx = 26 * (1 - v); bt.monFlash = 1 - v; }, 300);
      float(MON.x, MON.y - bt.monSprite.height - 10, String(dmg), crit ? '#ffd94a' : '#ffffff', crit ? 34 : 26);
      if (crit) {
        banner('💥 CRITICAL HIT! 💥', '#ffd94a');
        burst(MON.x, MON.y - 60, '#ffd94a', 18);
      }
      MM.sound.hit(crit);
      setBars();
      // boss phase twists (e.g. the Murk thickening at 50% HP) telegraph via
      // the same one-shot "enterLine" the monster's entrance uses
      const note = bt.ctx.hooks.afterStrike && bt.ctx.hooks.afterStrike(bt.mon);
      if (note) bt.enterLine = note;
      if (bt.mon.hp <= 0) after(350, monsterDefeated);
      else after(650, () => monsterTurn(true));
    });
  }

  function monsterTurn(playerWasCorrect) {
    if (!bt || bt.over) return;
    // Ranged rule: the FIRST monster counterattack of the battle always
    // misses if a ranged weapon is equipped — no ammo, no aiming, just range.
    const rangedFirstMiss = !bt.rangedFirstMissUsed && bt.ctx.hooks.isRanged && bt.ctx.hooks.isRanged();
    msg(`👹 ${MM.data.theMon(bt.mon.name, true)} attacks!`);
    tween(v => { bt.monOx = -110 * Math.sin(v * Math.PI); }, 420);
    after(210, () => {
      if (rangedFirstMiss) {
        bt.rangedFirstMissUsed = true;
        tween(v => { bt.heroOx = -46 * Math.sin(v * Math.PI); }, 350);
        float(HERO.x, HERO.y - 140, 'OUT OF REACH!', '#7ee0e8', 18);
        MM.sound.dodge();
        msg(`🏹 ${MM.data.theMon(bt.mon.name, true)} swings at empty air — you're out of reach!`);
        if (playerWasCorrect) after(800, nextRound); else showContinue();
        return;
      }
      const chance = bt.ctx.hooks.dodgeChance ? bt.ctx.hooks.dodgeChance() : 0.35;
      const dodged = playerWasCorrect && Math.random() < chance;
      if (dodged) {
        tween(v => { bt.heroOx = -46 * Math.sin(v * Math.PI); }, 350);
        float(HERO.x, HERO.y - 140, 'DODGED!', '#7ee0e8', 22);
        MM.sound.dodge();
        msg(`💨 Quick thinking! You sidestep ${MM.data.theMon(bt.mon.name)}'s attack!`);
        after(800, nextRound);
        return;
      }
      const { dmg, dead } = bt.ctx.hooks.applyMonsterHit(bt.mon);
      bt.heroFlash = 1;
      bt.shake = 10;
      tween(v => { bt.heroFlash = 1 - v; bt.heroOx = -18 * (1 - v); }, 320);
      float(HERO.x, HERO.y - 140, '-' + dmg, '#ff6b6b', 26);
      MM.sound.thud();
      msg(`💥 ${MM.data.theMon(bt.mon.name, true)} ${bt.mon.verb} you for <b>${dmg}</b> damage!`);
      setBars();
      MM.ui.renderSidebar();
      if (dead) { after(700, playerDefeated); return; }
      // after a wrong answer the kid needs time to read the solution
      if (playerWasCorrect) after(850, nextRound);
      else showContinue();
    });
  }

  function showContinue() {
    const row = document.querySelector('.battle-btnrow');
    if (!row) return;
    el('fleeBtn').style.display = 'none';
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = 'Ready — next round ➜';
    btn.onclick = nextRound;
    row.appendChild(btn);
    btn.focus();
  }

  function monsterDefeated() {
    msg(`🎉 ${bt.mon.boss ? `${MM.data.theMon(bt.mon.name, true)} is defeated!` : MM.data.flavor(bt.mon.sprite, 'win', bt.mon.name)}`);
    banner('⭐ VICTORY! ⭐', '#6ee87e');
    MM.sound.fanfare();
    burst(MON.x, MON.y - 60, bt.theme.accent, 26);
    tween(v => { bt.monAlpha = 1 - v; bt.monOy = 30 * v; }, 600);
    const summary = bt.ctx.hooks.victory(bt.mon);
    after(700, () => {
      const box = el('battleProblem');
      box.innerHTML = `
        <div class="victory-panel">
          <div class="victory-title">⭐ VICTORY! ⭐</div>
          <div class="victory-lines">${summary.lines.map(l => `<div>${l}</div>`).join('')}</div>
          <div class="btnrow"><button id="victOk" class="primary">Continue ➜</button></div>
        </div>`;
      el('battleMsg').innerHTML = '';
      el('victOk').onclick = () => teardown({ won: true });
      el('victOk').focus();
    });
  }

  function playerDefeated() {
    banner('💫 DEFEATED... 💫', '#ff6b6b');
    tween(v => { bt.heroOy = 40 * v; bt.heroFlash = 0.5 * (1 - v); }, 600);
    after(900, () => teardown({ dead: true }));
  }

  // ---------- effects ----------
  function float(x, y, text, color, size) {
    if (!bt) return;
    bt.floaters.push({ x, y, text, color, size: size || 24, t: 0 });
  }

  // Wave 5 item 7: Calm Mode turns off shake + particle bursts. Floating
  // damage numbers stay — that's core combat feedback, not ambient motion.
  function calmOn() { return !!(MM.engine.state && MM.engine.state.calmMode); }

  function burst(x, y, color, n) {
    if (!bt || calmOn()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
      bt.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 1, color, size: 3 + Math.random() * 5,
      });
    }
  }

  // ---------- render loop ----------
  function rafLoop() {
    if (!bt || bt.over) return;
    const now = performance.now();
    // advance tweens
    bt.tweens = bt.tweens.filter(tw => {
      const p = Math.min(1, (now - tw.start) / tw.dur);
      tw.apply(ease(p));
      if (p >= 1 && tw.done) tw.done();
      return p < 1;
    });
    draw(now);
    requestAnimationFrame(rafLoop);
  }

  function draw(now) {
    const cv = el('stage');
    if (!cv) return;
    const c = cv.getContext('2d');
    const t = (now - bt.t0) / 1000;

    // screen shake (skipped under Calm Mode, whatever set bt.shake)
    c.save();
    if (bt.shake > 0.3 && !calmOn()) {
      c.translate((Math.random() - 0.5) * bt.shake, (Math.random() - 0.5) * bt.shake);
      bt.shake *= 0.86;
    } else {
      bt.shake = 0;
    }

    // sky + ground
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bt.theme.sky1);
    g.addColorStop(1, bt.theme.sky2);
    c.fillStyle = g;
    c.fillRect(-20, -20, W + 40, H + 40);
    c.fillStyle = bt.theme.ground;
    c.fillRect(-20, H - 52, W + 40, 72);
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(-20, H - 52, W + 40, 3);

    // boss aura
    if (bt.mon.boss && bt.monAlpha > 0.05) {
      const pulse = 0.14 + 0.07 * Math.sin(t * 3);
      const rg = c.createRadialGradient(MON.x + bt.monOx, MON.y - 60, 10, MON.x + bt.monOx, MON.y - 60, 110);
      rg.addColorStop(0, bt.theme.accent + 'aa');
      rg.addColorStop(1, 'transparent');
      c.globalAlpha = pulse * bt.monAlpha;
      c.fillStyle = rg;
      c.fillRect(MON.x - 130 + bt.monOx, MON.y - 180, 260, 200);
      c.globalAlpha = 1;
    }

    drawShadow(c, HERO.x + bt.heroOx, HERO.y, 46);
    if (bt.monAlpha > 0.02) drawShadow(c, MON.x + bt.monOx, MON.y, bt.mon.boss ? 62 : 50);

    // hero (idle bob + walk frame alternation while lunging)
    const heroBob = Math.sin(t * 2.2) * 2.5;
    const heroImg = Math.abs(bt.heroOx) > 25 ? bt.heroCv2 : bt.heroCv;
    drawActor(c, heroImg, HERO.x + bt.heroOx, HERO.y + heroBob + bt.heroOy, bt.heroFlash, bt.heroRed, 1);

    // monster (slower bob; flash white on hit; fade on death)
    if (bt.monAlpha > 0.02) {
      const monBob = Math.sin(t * 1.6 + 1) * 3.5;
      drawActor(c, bt.monSprite, MON.x + bt.monOx, MON.y + monBob + bt.monOy, bt.monFlash, bt.monWhite, bt.monAlpha);
      if (bt.mon.boss) {
        c.globalAlpha = bt.monAlpha;
        c.drawImage(bt.crownCv, MON.x + bt.monOx - bt.crownCv.width / 2,
          MON.y + monBob + bt.monOy - bt.monSprite.height - bt.crownCv.height + 22);
        c.globalAlpha = 1;
      }
      if (bt.hatCv) { // the tiny hat, worn at a jaunty angle
        c.globalAlpha = bt.monAlpha;
        c.drawImage(bt.hatCv, MON.x + bt.monOx - bt.hatCv.width / 2 + 8,
          MON.y + monBob + bt.monOy - bt.monSprite.height - bt.hatCv.height + 8);
        c.globalAlpha = 1;
      }
    }

    // particles
    bt.particles = bt.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.022;
      if (p.life <= 0) return false;
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size, p.size);
      return true;
    });
    c.globalAlpha = 1;

    // floating damage numbers
    c.textAlign = 'center';
    bt.floaters = bt.floaters.filter(f => {
      f.t += 0.016;
      if (f.t > 1.15) return false;
      c.globalAlpha = Math.max(0, 1.15 - f.t);
      c.font = `${f.size}px "Press Start 2P", monospace`;
      c.fillStyle = '#141221';
      c.fillText(f.text, f.x + 2, f.y - f.t * 44 + 2);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y - f.t * 44);
      return true;
    });
    c.globalAlpha = 1;
    c.restore();
  }

  function drawShadow(c, x, y, rx) {
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(x, y + 6, rx, rx * 0.26, 0, 0, Math.PI * 2);
    c.fill();
  }

  function drawActor(c, img, x, y, flash, flashCv, alpha) {
    c.globalAlpha = alpha;
    c.drawImage(img, x - img.width / 2, y - img.height);
    if (flash > 0.04 && flashCv) {
      c.globalAlpha = alpha * flash * 0.85;
      c.drawImage(flashCv, x - img.width / 2, y - img.height);
    }
    c.globalAlpha = 1;
  }
})();
