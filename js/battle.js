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
  // v1.7.0: rarity hooks, exposed the same way E.*_CHANCE constants are —
  // drives pin these to 0/1 to force or suppress the moment deterministically.
  B.GOLEM_CRY_CHANCE = 0.12; // any golem's enter-flavor, regulars only
  // Wave 5 item 7: exposed for the Calm Mode drive check (same "exposed for
  // tests" convention as B.current) — shake amount + live particle count,
  // both of which Calm Mode should hold at zero.
  B.debugEffects = () => bt ? {
    shake: bt.shake, particles: bt.particles.length,
    shapes: [...new Set(bt.particles.map(p => p.shape).filter(Boolean))],
  } : null;

  // ---------- helpers ----------
  function el(id) { return document.getElementById(id); }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  // Wave 18: the battle portrait wears the SAME chosen avatar (form + palette)
  // as the overworld hero — one state, everywhere. Also carries the seaweed-
  // green-hair easter egg through S.avatarPalette (it applies to any form).
  function heroPal() {
    return MM.sprites.avatarPalette(MM.engine.state);
  }
  function heroFrames() {
    return MM.sprites.avatarFrames(MM.engine.state && MM.engine.state.avatar);
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
  // ---------- Wave 8b: the stances ----------
  // Soothe is not a difficulty setting and not a mercy option — it is the SAME
  // fight with the same math, the same progress and the same rewards, told the
  // other way round. So almost nothing here is new logic: it is the same numbers
  // wearing different clothes. `calm()` is how far through the fight we are,
  // which under Strike is "how hurt it is" and under Soothe is "how calm it is".
  // They are the same number. That is the whole idea.
  const soothing = () => !!(bt && bt.ctx.hooks.stance && bt.ctx.hooks.stance() === 'soothe');
  const brave = () => !!(bt && bt.ctx.hooks.brave && bt.ctx.hooks.brave());
  const calm = () => bt ? 1 - Math.max(0, bt.mon.hp) / bt.mon.maxhp : 0;
  // Wave 21 (Looking Glass P2.3): "Recognize" — through the glass, Soothe is
  // reflavored (WORDING only; every number above is untouched) because a
  // mirror monster is a reflection of a friend already made, not a stranger
  // to tame. Gated on E.inMirror() so normal play (and even a normal-play
  // Soothe fight) never sees this wording.
  const recognizing = () => soothing() && !!(MM.engine.inMirror && MM.engine.inMirror());

  B.start = function (mon, ctx) {
    MM.track('battle:start ' + mon.name);
    const theme = MM.data.THEMES[ctx.dungeonIndex - 1];
    const scale = mon.boss ? 8 : 6;
    const spriteCv = MM.sprites.get(mon.sprite, { palette: mon.pal || {}, scale });
    // the calmed twin of this monster's sprite: same art, every colour blended
    // toward a warm white. Cross-faded in as the calm rises, so the menace
    // visibly drains out of it over the course of the fight.
    const calmCv = MM.sprites.get(mon.sprite, {
      palette: MM.sprites.softPalette(mon.sprite, mon.pal || {}, 0.55), scale,
    });
    bt = {
      mon, ctx, theme,
      monSprite: spriteCv,
      monCalm: calmCv,
      monWhite: silhouette(spriteCv, '#ffffff'),
      monTeal: silhouette(spriteCv, '#7ee0e8'),
      heroCv: MM.sprites.get(heroFrames()[0], { scale: HERO.scale, palette: heroPal() }),
      heroCv2: MM.sprites.get(heroFrames()[1], { scale: HERO.scale, palette: heroPal() }),
      heroRed: silhouette(MM.sprites.get(heroFrames()[0], { scale: HERO.scale, palette: heroPal() }), '#ff6b6b'),
      crownCv: MM.sprites.get('crown', { scale: Math.round(scale / 2) }),
      heroOx: -240, heroOy: 0, monOx: 240, monOy: 0,
      monFlash: 0, heroFlash: 0, monAlpha: 1,
      shake: 0, t0: performance.now(),
      floaters: [], particles: [], tweens: [], timeouts: [],
      over: false, locked: true, monScale: scale,
      gesture: null, gestureT: 0,   // the calmed monster's send-off (see monsterDefeated)
      pendingCorrection: null,      // v1.7.0: names the true equation after a boss lie
      // flavor: bosses stay played straight; regular monsters get personality.
      // v1.7.0: golems (canonically Miscount's old wrong homework) rarely
      // bellow an ancient wrong answer instead — the COMEDY register of the
      // same idea the boss falsehoods below play straight. Never on a boss.
      // Wave 21 (Looking Glass P2.1): through the glass, EVERY regular
      // monster is a reflection first — the mirror flavor takes priority
      // over the (rarer) golem cry, gated on inMirror() so normal play never
      // sees it.
      enterLine: mon.boss ? null
        : (MM.engine.inMirror && MM.engine.inMirror()
            ? MM.data.pick(MM.data.MIRROR_ENTER_LINES)
            : (mon.sprite === 'golem' && Math.random() < B.GOLEM_CRY_CHANCE
                ? MM.data.pick(MM.data.GOLEM_BATTLE_CRIES)
                : MM.data.flavor(mon.sprite, 'enter', mon.name)))
          + (mon.hat ? ' It is wearing a tiny hat. No one knows why.' : ''),
      hatCv: mon.hat ? MM.sprites.get('crown', { scale: 2 }) : null,
    };
    buildDom();
    setBars(true);
    const s = soothing();
    const rec = recognizing();
    // the soothe banner NAMES the creature, in the calm meter's own words
    // (playtest 2026-07-13, twice: every fight opening with the same
    // "A TANGLED THING" read as the game forgetting the monster's name —
    // Miscount's line stays in the reveal, where it lands — and the 🕊
    // bookends were "too small to see clearly"; words carry this better)
    // Wave 21 (Looking Glass P2.3): "Recognize" swaps "Frightened X" for
    // "Reflected X" — the mirror-world stance label — wording only.
    banner(mon.boss ? '☠️ BOSS BATTLE ☠️'
        : rec ? MM.data.theMon('Reflected ' + mon.name, true).toUpperCase()
        : s ? MM.data.theMon('Frightened ' + mon.name, true).toUpperCase() : '⚔️ BATTLE! ⚔️',
      mon.boss ? '#ff6b5c' : (s ? '#7ee0e8' : '#ffd94a'));
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
            <div class="bbar-name" id="monBarName">${bt.mon.boss ? '👑 ' : ''}${bt.mon.name}</div>
            <div class="bbar"><div class="ghost" id="monGhost"></div><div class="fill mon" id="monFill"></div></div>
            <div class="bbar-sub" id="monBarSub">⚔️ attacks for ${bt.mon.atk} each round</div>
          </div>
          <div class="bbar-box hero">
            <div class="bbar-name">🛡 ${MM.engine.state.name}</div>
            <div class="bbar"><div class="ghost" id="heroGhost"></div><div class="fill hero" id="heroFill"></div></div>
            <div class="bbar-sub" id="heroBarSub">${s.playerAtkLabel()} · ${s.playerDefLabel()}${s.rangedNote ? s.rangedNote() : ''}</div>
          </div>
          <div id="battleBanner"></div>
        </div>
        <div id="battleMsg" class="battle-msg"></div>
        <div id="battleProblem" class="battle-problem"></div>
      </div>`;
  }

  function setBars(instant) {
    const s = bt.ctx.hooks;
    const soothe = soothing();
    // v1.7.3 (playtest 2026-07-13): BOTH bars drain. Wave 8b inverted the
    // soothe bar to "calm filling up" — but the hero's bar next to it still
    // drained, and tracking two gauges running OPPOSITE directions mid-fight
    // was confusing ("my health goes down, their calmness goes up"). Under
    // Soothe the bar now shows the monster's remaining WILDNESS draining
    // away — same number as Strike's health, same direction as the hero's
    // bar, honest color (red = aggression, and it shrinks). The calm the kid
    // GIVES still lands as "+N calm" floaters and the wildness label.
    const monPct = Math.max(0, bt.mon.hp / bt.mon.maxhp * 100);
    const hp = Math.max(0, s.playerHp() / s.playerMaxHp() * 100);
    for (const [fillId, ghostId, pct] of [['monFill', 'monGhost', monPct], ['heroFill', 'heroGhost', hp]]) {
      const f = el(fillId), g = el(ghostId);
      if (!f) continue;
      if (instant) { f.style.transition = g.style.transition = 'none'; }
      f.style.width = pct + '%';
      g.style.width = pct + '%';
      if (instant) requestAnimationFrame(() => { f.style.transition = ''; g.style.transition = ''; });
      f.classList.toggle('low', pct < 35);
    }
    const mf = el('monFill');
    if (mf) mf.classList.toggle('calm', soothe);
    const hf = el('heroFill');
    if (hf && s.playerHp() <= 0) hf.style.width = '0%';
    refreshBarLabels();
  }

  // The stance can change between rounds, so the labels are re-rendered rather
  // than baked in at build time.
  function refreshBarLabels() {
    const s = bt.ctx.hooks;
    const nm = el('monBarName'), sub = el('monBarSub'), hsub = el('heroBarSub');
    // v1.7.1 (playtest: "the bird symbol is too small to see clearly"): the
    // tiny 🕊 prefixes are gone from these small labels — the teal calm bar
    // and the words "% calm" carry the state legibly; the dove survives only
    // at sizes where it can actually be seen (the PERFECTLY CALM banner).
    if (nm) nm.innerHTML = `${bt.mon.boss ? '👑 ' : ''}${bt.mon.name}`;
    if (sub) {
      const k = calm();
      // the label speaks the BAR's language (v1.7.3: the bar drains wildness
      // now — a "64% calm" caption over a 36%-full bar would re-create the
      // exact two-directions confusion the bar swap fixed)
      // Wave 21 (Looking Glass P2.3): "Recognize" reflavors this same label —
      // the bar/number are IDENTICAL either way, only the words change.
      sub.innerHTML = !soothing()
        ? `⚔️ attacks for ${bt.mon.atk} each round`
        : recognizing()
        ? (k >= 1 ? 'Recognized.' : `${Math.max(1, Math.round((1 - k) * 100))}% still a stranger · still swinging (${bt.mon.atk})`)
        // At the end it is not frightened any more — that's the whole point,
        // and this is the line in the victory freeze-frame.
        : k >= 1 ? 'Completely calm.'
        : `${Math.max(1, Math.round((1 - k) * 100))}% wild · still frightened, still swinging (${bt.mon.atk})`;
    }
    if (hsub) hsub.innerHTML = `${s.playerAtkLabel()} · ${s.playerDefLabel()}${s.rangedNote ? s.rangedNote() : ''}`;
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
    // v1.7.0 (dual-form ⚡ toggle): which form is ACTIVE right now. For an
    // ELIGIBLE problem (prob._dualEligible — base+braveStep/tailStep both
    // computed from the same draw), this simply starts matching whichever
    // form pickProblem() already chose, and swapProblemForm() updates it
    // in place on every mid-round toggle — damage always pays for whatever
    // form is on screen when the kid answers. An INELIGIBLE problem (deep/
    // choice kinds — the music staff, decimal compares) keeps the OLD latch
    // instead: frozen at pick time, so toggling ⚡ takes effect next
    // question, never retroactively.
    bt.activeIsExtended = !!(prob._dualEligible && bt.ctx.hooks.brave && bt.ctx.hooks.brave());
    bt.braveAtPick = !!(bt.ctx.hooks.brave && bt.ctx.hooks.brave());
    bt.locked = false;
    const intro = bt.enterLine ? `<i>${bt.enterLine}</i><br>` : '';
    bt.enterLine = null; // shown with round 1 only
    // Wave 21 (Looking Glass P2.3): "Recognize" reflavors the round prompt —
    // wording only; the same pickProblem()/answer path runs underneath.
    msg(recognizing()
      ? `${intro}🪞 <b>Your move.</b> Work it out, and you recognize a little more of the friend inside ${MM.data.theMon(bt.mon.name)}:`
      : soothing()
      ? `${intro}🕊 <b>Your move.</b> Work it out, and the tangle in ${MM.data.theMon(bt.mon.name)} comes a little looser:`
      : `${intro}🗡 <b>Your move!</b> Solve it to strike ${MM.data.theMon(bt.mon.name)}:`);
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
        <div class="stance-row" id="stanceRow"></div>
        <button id="fleeBtn" class="secondary">🏃 Flee</button>
      </div>`;
    renderStanceRow();
    MM.ui.buildProblemForm(el('probForm'), prob, onAnswer);
    MM.ui.setupScratchpad();
    el('fleeBtn').onclick = () => { if (!bt.locked) { MM.ui.log(`You flee from ${MM.data.theMon(bt.mon.name)}.`); teardown({ fled: true }); } };
  }

  // ---------- the stance row (round 5: ONE track, chosen at the Ceremony) ----------
  // SACRED RULE: the steady-state combat loop gains ZERO button presses.
  // Playtest verdict on the Wave 8b version: two verbs as in-battle buttons
  // read as confusion, not choice ("it is confusing to have strike/soothe as
  // options"). The kid's WAY (bold ⚔️ / gentle 🕊) is chosen at the Ceremony
  // and lived in; battles show only ⚡ Brave and Flee. Changing your way is a
  // deliberate act, done from the ⚙️ dialog — never a mid-fight toggle.
  function renderStanceRow() {
    const row = el('stanceRow');
    if (!row) return;
    const h = bt.ctx.hooks;
    if (!h.stance) return;   // a battle context without stances (shouldn't happen)
    const br = h.brave();
    row.innerHTML =
      `<button class="mini stance-btn brave${br ? ' on' : ''}" id="stBrave" title="Brave: a harder problem for DOUBLE power. A miss costs nothing extra.">⚡ Brave${br ? ' ON' : ''}</button>`;
    const b = el('stBrave');
    if (b) b.onclick = () => { if (bt.locked) return; h.setBrave(!h.brave()); afterStanceChange('brave'); };
  }
  // v1.7.0: swap bt.problem to its dual-form sibling IN PLACE — same
  // operands either way (nothing to fish; see the anti-fishing sweep in
  // tests/test.js), only the FORM (base ⇄ extended) changes. Input text is
  // kept if it's still a valid digit-prefix of the new integer answer, else
  // cleared — a kid mid-keystroke never loses unrelated typing silently.
  function swapProblemForm(makeExtended) {
    const box = el('battleProblem');
    if (!box || !bt.problem) return;
    const dualBase = bt.problem._dualBase, dualExtended = bt.problem._dualExtended;
    const sibling = makeExtended ? dualExtended : dualBase;
    const input = box.querySelector('#answerInput');
    const typed = input ? input.value.trim() : '';
    bt.problem = Object.assign({}, sibling, { _dualBase: dualBase, _dualExtended: dualExtended, _dualEligible: true });
    bt.activeIsExtended = makeExtended;
    B.current = bt.problem; // exposed for tests, mirrors nextRound
    const textEl = box.querySelector('.prob-text');
    if (textEl) textEl.innerHTML = bt.problem.text.replace(/\n/g, '<br>');
    const svgEl = box.querySelector('.prob-svg');
    if (svgEl) svgEl.innerHTML = bt.problem.svg || '';
    MM.ui.buildProblemForm(el('probForm'), bt.problem, onAnswer);
    const keepable = typed && bt.problem.kind === 'number' && bt.problem.answer.d === 1
      && /^\d+$/.test(typed) && String(bt.problem.answer.n).startsWith(typed);
    if (keepable) {
      const ni = box.querySelector('#answerInput');
      if (ni) ni.value = typed;
    }
  }

  // Switching stance re-skins the fight in place. It does NOT re-roll the
  // problem — that would let a kid reroll a hard question by tapping a stance,
  // and (worse) it would make the toggle feel like a move you spend a turn on.
  function afterStanceChange(kind) {
    renderStanceRow();
    setBars();
    if (kind === 'brave') {
      const st = MM.engine.state;
      const on = !!(st && st.brave);
      // v1.7.0: an ELIGIBLE problem's displayed FORM swaps in place, right
      // now (base ⇄ base+step); an INELIGIBLE one (deep/choice kinds) keeps
      // the old latch — the toggle takes effect next question instead.
      const eligible = !!(bt.problem && bt.problem._dualEligible);
      if (eligible) swapProblemForm(on);
      // The button must explain ITSELF the moment it's touched (playtest
      // 2026-07-12: "how is a kid supposed to know what brave means?" — the
      // hover tooltip isn't an answer; kids don't hover). The first-ever
      // switch-on gets the full deal, spelled out; after that, short confirms.
      const firstTime = on && st && !st.seenBraveHelp;
      if (firstTime) { st.seenBraveHelp = true; MM.engine.save(); }
      if (firstTime) {
        msg(eligible
          ? `⚡ <b>Brave!</b> This very question just grew its hardest form, right where you're standing — solve it now and every right answer counts <b>double</b>. Get one wrong and it costs <b>nothing extra</b>. Press ⚡ again any time to switch back.`
          : `⚡ <b>Brave!</b> From the next question on, the monsters ask their <b>hardest</b> — and every right answer counts <b>double</b>. Get one wrong and it costs <b>nothing extra</b>. Press ⚡ again any time to switch back.`);
      } else if (eligible) {
        msg(on
          ? `⚡ <b>Brave on.</b> The SAME question, one step harder — double power, paid for what you actually solve.`
          : `⚡ <b>Brave off.</b> Back to the plain form of the same question — normal power. The choice is always yours.`);
      } else {
        msg(on
          ? `⚡ <b>Brave on.</b> Takes effect next question — hardest questions, double power. A miss still costs nothing extra.`
          : `⚡ <b>Brave off.</b> Takes effect next question — back to the usual questions.`);
      }
      return;
    }
    // (round 5: no other stance changes happen mid-battle — the kid's way is
    // chosen at the Ceremony and switched, deliberately, from the ⚙️ dialog)
  }

  function onAnswer(correct, kidAnswer) {
    if (!bt || bt.locked) return;
    bt.locked = true;
    el('fleeBtn').disabled = true;
    bt.ctx.hooks.recordAnswer(bt.problem.skill, correct, { text: bt.problem.text, kidAnswer });
    if (correct) {
      MM.sound.correct();
      let feedback = `<div class="right">✓ Correct!</div>`;
      // v1.7.0: the correction beat — the kid's own next correct strike
      // names the true equation, error and fix adjacent. Her agency does
      // the fixing; the pending lie is consumed exactly once.
      if (bt.pendingCorrection) {
        feedback += `<div class="boss-correction">…and <b>${bt.pendingCorrection}</b>. The record, corrected.</div>`;
        bt.pendingCorrection = null;
      }
      el('probFeedback').innerHTML = feedback;
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
      // The monster's reaction. Striking, it gloats (the joke is on the
      // monster's manners, never on the kid). Soothing, it FRETS — it tenses
      // back up, and the sympathy is for the monster, which was nearly calm.
      // Either way the kid is never the punchline. Bosses get no quip at all.
      const quip = bt.mon.boss ? '' :
        `<div class="miss-quip">${MM.data.flavor(bt.mon.sprite, soothing() ? 'fret' : 'miss', bt.mon.name)}</div>`;
      // Struggle pass: after a run of misses in one topic, one kind line —
      // where the kid is actually looking, under the worked solution.
      let kind = '';
      if (MM.engine.roughPatch) {
        MM.engine.roughPatch = null;
        // and the honest pointer (user decision 2026-07-13): the real
        // remedy for a topic that's truly too early is the parent switch —
        // say where it lives, information not stigma.
        kind = `<div class="miss-quip" style="color:#a8e6cf">${MM.data.pick(MM.data.ROUGH_PATCH_LINES)}<br>
          If these keep feeling too tricky, a grown-up can choose which kinds show up — 👪 Parent Settings.</div>`;
      }
      el('probFeedback').innerHTML =
        `<div class="wrong">${soothing() ? '✗ Not quite — it stays tangled.' : '✗ Not quite — your attack goes wide!'}</div>
         <div class="solution">${bt.problem.solution}</div>${quip}${kind}`;
      after(400, () => {
        float(HERO.x - 60, HERO.y - 160, soothing() ? '...' : 'MISS', '#9d92c9', 20);
        // the whoosh is a SWIPE sound — a soothing miss is just a breath
        // that didn't land, so it stays silent (playtest 2026-07-13:
        // "when I try to soothe a creature, there is still a whack sound")
        if (!soothing()) MM.sound.whoosh();
        after(700, () => monsterTurn(false));
      });
    }
  }

  function playerAttack() {
    // v1.7.0: damage follows the FORM ANSWERED. An eligible dual-form
    // problem reads bt.activeIsExtended (updated live by every ⚡ toggle,
    // see swapProblemForm) instead of the old pick-time latch; an
    // ineligible one (deep/choice kinds) still uses the original latch —
    // frozen at pick time, exactly as before.
    const braveForDamage = bt.problem._dualEligible ? bt.activeIsExtended : bt.braveAtPick;
    const strike = bt.ctx.hooks.playerStrike(braveForDamage);
    let dmg = strike.dmg; const { crit, brave } = strike;
    const soothe = soothing();
    // Ready Reckoner charm (Practice Yard): the FIRST damaging strike of the
    // battle deals +2. Once per battle, never on a soothe (calm isn't damage).
    if (!soothe && !bt.reckonerUsed && MM.engine.hasCharm('reckoner')) {
      bt.reckonerUsed = true;
      dmg += 2;
    }
    // lunge toward the monster and back — soothing, you don't lunge, you REACH:
    // a smaller, slower movement toward it rather than a strike through it.
    tween(v => { bt.heroOx = (soothe ? 46 : 90) * Math.sin(v * Math.PI); }, soothe ? 520 : 360);
    // the reach is silent — the whoosh is the strike's swipe, and "calming
    // something must never sound like hitting it" applies to the wind-up
    // too (playtest 2026-07-13). The soothe chime lands with the calm.
    if (!soothe) MM.sound.whoosh();
    after(190, () => {
      bt.mon.hp -= dmg;
      bt.monFlash = 1;
      // Calm never shakes the screen. Not even a little. The whole point of the
      // stance is that nothing about it is violent.
      bt.shake = soothe ? 0 : (crit ? 14 : 8);
      tween(v => { bt.monOx = (soothe ? 8 : 26) * (1 - v); bt.monFlash = 1 - v; }, 300);
      // "+N calm" in soft teal, never a damage number. Brave lands in gold,
      // with lightning — chosen power, visibly different from a lucky crit.
      const color = brave ? '#ffd94a' : (soothe ? '#7ee0e8' : '#ffffff');
      const text = soothe ? `+${dmg} calm` : String(dmg);
      float(MON.x, MON.y - bt.monSprite.height - 10, text, crit ? '#ffd94a' : color, crit || brave ? 32 : 26);
      if (brave) {
        float(MON.x + 46, MON.y - bt.monSprite.height - 40, '⚡', '#ffd94a', 30);
        burst(MON.x, MON.y - 60, '#ffd94a', 10);
      }
      if (crit) {
        // Wave 21 (Looking Glass P2.3): "Recognize" swaps in its own crit banner.
        banner(soothe ? (recognizing() ? '🪞 FULLY RECOGNIZED! 🪞' : '🕊 PERFECTLY CALM! 🕊') : '💥 CRITICAL HIT! 💥',
          soothe ? '#7ee0e8' : '#ffd94a');
        burst(MON.x, MON.y - 60, soothe ? '#7ee0e8' : '#ffd94a', 18);
      }
      // soothing sheds soft motes rather than a damage burst — and CHIMES
      // rather than whacks (playtest 2026-07-12: calming something should
      // never sound like hitting it)
      if (soothe && !crit) motes(MON.x, MON.y - 50, 5);
      if (soothe) MM.sound.soothe(crit); else MM.sound.hit(crit);
      setBars();
      // boss phase twists (e.g. the Murk thickening at 50% HP) telegraph via
      // the same one-shot "enterLine" the monster's entrance uses
      const note = bt.ctx.hooks.afterStrike && bt.ctx.hooks.afterStrike(bt.mon);
      if (note) bt.enterLine = note;
      if (bt.mon.hp <= 0) after(350, monsterDefeated);
      else after(650, () => monsterTurn(true));
    });
  }

  // Soft drifting motes — the calm equivalent of burst(). Same Calm Mode rule.
  // Each gentle instrument sheds its own calm (playtest 2026-07-12: "the
  // bubble pipe should blow BUBBLES") — same particle system, its own shape
  // and color. Anything else (a battle axe held out gently) sheds the
  // default teal motes.
  const INSTRUMENT_MOTES = {
    ribbon: { shape: 'ribbon', colors: ['#ff9ad5', '#ffc4e8'] },
    bubblepipe: { shape: 'bubble', colors: ['#7ee0e8', '#b8f0f4'] },
    catwand: { shape: 'fish', colors: ['#c4d8e8', '#e8f0f4'] },
    chimebells: { shape: 'note', colors: ['#ffd94a', '#ffe98a'] },
    reedflute: { shape: 'note', colors: ['#a8d8a0', '#cceac4'] },   // reedy green
    singingbowl: { shape: 'bubble', colors: ['#e8c48a', '#f4e0b8'] }, // slow warm rings
  };
  function motes(x, y, n) {
    if (!bt || calmOn()) return;
    const w = MM.engine.equippedItem && MM.engine.equippedItem('weapon');
    const style = (w && INSTRUMENT_MOTES[w.id]) || { shape: null, colors: ['#7ee0e8', '#a8e6cf'] };
    for (let i = 0; i < n; i++) {
      bt.particles.push({
        x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random() * 0.7,
        life: 1, color: style.colors[Math.random() < 0.3 ? 1 : 0],
        size: 3 + Math.random() * 4, soft: true, shape: style.shape,
      });
    }
  }

  function monsterTurn(playerWasCorrect) {
    if (!bt || bt.over) return;
    // The FIRST counterattack of a battle can be skipped outright — by a ranged
    // weapon (out of reach) or, while soothing, by the Lullaby gem (it's already
    // yawning). The engine owns which, and there is only ever one.
    // NOTE: a monster being SOOTHED still hits back. It is still tangled and
    // still frightened; calm is something you give it, not something it owes you.
    const freeMiss = bt.ctx.hooks.freeFirstMiss && bt.ctx.hooks.freeFirstMiss();
    msg(`👹 ${MM.data.theMon(bt.mon.name, true)} ${soothing() ? 'lashes out anyway!' : 'attacks!'}`);
    tween(v => { bt.monOx = -110 * Math.sin(v * Math.PI); }, 420);
    after(210, () => {
      if (freeMiss) {
        tween(v => { bt.heroOx = -46 * Math.sin(v * Math.PI); }, 350);
        float(HERO.x, HERO.y - 140, freeMiss.float, '#7ee0e8', 18);
        MM.sound.dodge();
        msg(freeMiss.msg);
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
      // gentle way (2026-07-13): a frightened flail, not a blow — soft
      // ruffle sound, small flinch instead of a full shake. Damage stays
      // fully visible (floater + bars) — character changes, honesty doesn't.
      bt.shake = soothing() ? 4 : 10;
      tween(v => { bt.heroFlash = 1 - v; bt.heroOx = -18 * (1 - v); }, 320);
      float(HERO.x, HERO.y - 140, '-' + dmg, '#ff6b6b', 26);
      if (soothing()) MM.sound.fret(); else MM.sound.thud();
      let atkMsg = `💥 ${MM.data.theMon(bt.mon.name, true)} ${bt.mon.verb} you for <b>${dmg}</b> damage!`;
      // v1.7.0: bosses attack with wrong math (canon completion — disorder
      // now ATTACKS by asserting falsehoods). Presentation only: damage was
      // already rolled above and is untouched. Regulars keep their verb
      // flavor; only bosses lie. Calm Mode needs no gate — it's text, not
      // motion — so no calmOn() check here.
      if (bt.mon.boss && Math.random() < MM.engine.WRONG_ATTACK_CHANCE) {
        const lie = MM.engine.bossFalsehood();
        bt.pendingCorrection = lie.truthText;
        float(MON.x, MON.y - bt.monSprite.height - 40, lie.text, bt.theme.accent, 24);
        // ✗ is the game's established WRONGNESS mark (the kid knows it from
        // "✗ Not quite") — a falsehood must never wear the celebration ✦.
        atkMsg += `<br><span class="boss-lie" style="color:${bt.theme.accent}">✗ <b>${lie.text}</b></span>`;
      }
      msg(atkMsg);
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
    const soothe = soothing();
    const rec = recognizing();
    if (soothe) {
      // It does not splat. It becalms, does the thing its kind does when it is
      // finally at ease, and wanders off — under its own power, in its own time.
      bt.gesture = MM.data.sootheGesture(bt.mon.sprite);
      bt.gestureT = 0;
      MM.sound.purr(); // the settling-in, under the victory notes (2026-07-13)
      // Wave 21 (Looking Glass P2.3): "Recognize" — same settling, same
      // gesture, same gold/XP path below; only the words differ. A kind
      // already befriended (in the real kingdom or an earlier reflection)
      // reads as a REUNION; a kind never befriended reads as new.
      const alreadyKnown = rec && !!(MM.engine.isBefriended && MM.engine.isBefriended(bt.mon));
      msg(rec
        ? `🪞 ${bt.mon.boss ? `${MM.data.theMon(bt.mon.name, true)} is at peace.` : MM.data.recognizeLine(bt.mon, alreadyKnown)}`
        : `🕊 ${bt.mon.boss ? `${MM.data.theMon(bt.mon.name, true)} is at peace.` : MM.data.sootheLine(bt.mon)}`);
      banner(rec ? '🪞 RECOGNIZED 🪞' : '🕊 CALMED 🕊', '#7ee0e8');
      MM.sound.fanfare();
      motes(MON.x, MON.y - 60, 22);
      tween(v => { bt.gestureT = v; }, 1500);
      // it lingers, at ease, and only THEN drifts away — no death-fade
      after(1100, () => { if (bt) tween(v => { bt.monAlpha = 1 - v; bt.monOx = 40 * v; }, 700); });
    } else {
      msg(`🎉 ${bt.mon.boss ? `${MM.data.theMon(bt.mon.name, true)} is defeated!` : MM.data.flavor(bt.mon.sprite, 'win', bt.mon.name)}`);
      banner('⭐ VICTORY! ⭐', '#6ee87e');
      MM.sound.fanfare();
      burst(MON.x, MON.y - 60, bt.theme.accent, 26);
      tween(v => { bt.monAlpha = 1 - v; bt.monOy = 30 * v; }, 600);
    }
    const summary = bt.ctx.hooks.victory(bt.mon);
    after(soothe ? 1500 : 700, () => {
      const box = el('battleProblem');
      box.innerHTML = `
        <div class="victory-panel">
          <div class="victory-title${soothe ? ' calm' : ''}">${soothe ? (rec ? '🪞 RECOGNIZED 🪞' : '🕊 CALMED 🕊') : '⭐ VICTORY! ⭐'}</div>
          <div class="victory-lines">${summary.lines.map(l => `<div>${l}</div>`).join('')}</div>
          <div class="btnrow"><button id="victOk" class="primary">Continue ➜</button></div>
        </div>`;
      el('battleMsg').innerHTML = '';
      el('victOk').onclick = () => teardown({ won: true });
      el('victOk').focus();
    });
  }

  function playerDefeated() {
    // Not "DEFEATED", and not red (playtest 2026-07-12: losing reads as
    // being carried home, never as dying) — gold, like the rescue it is.
    banner('✨ Whisked to safety! ✨', '#ffd94a');
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
      const soothe = soothing();
      const k = soothe ? calm() : 0;   // how far along the calm is, 0..1
      // Becalming, visibly: as the calm rises the monster sways SLOWER and
      // SMALLER — the menace draining out of the same sprite, no new art.
      const monBob = Math.sin(t * (1.6 - 0.9 * k) + 1) * (3.5 * (1 - 0.55 * k));
      let gx = 0, gy = 0, gsq = 1;
      // ...and when it's finally calm, it does the thing its kind does.
      if (bt.gesture && bt.gestureT > 0) {
        const g = bt.gestureT, wob = Math.sin(g * Math.PI * 4);
        if (bt.gesture === 'bounce') { gy = -Math.abs(Math.sin(g * Math.PI * 3)) * 22; gsq = 1 + 0.10 * wob; }
        else if (bt.gesture === 'nap') { gy = 10 * g; gsq = 1 - 0.22 * g; }        // settles down, flattens out
        else if (bt.gesture === 'wave') { gx = 10 * wob; gy = -6 * Math.abs(wob); }
        else if (bt.gesture === 'drift') { gy = -46 * g; }                          // sighs upward
        else if (bt.gesture === 'sit') { gy = 16 * g; gsq = 1 - 0.14 * g; }         // sits down at last
      }
      const mx = MON.x + bt.monOx + gx;
      const my = MON.y + monBob + bt.monOy + gy;
      // cross-fade the ordinary sprite into its calmed (warm-white) twin
      drawActor(c, bt.monSprite, mx, my, bt.monFlash, soothe ? bt.monTeal : bt.monWhite, bt.monAlpha, gsq);
      if (soothe && k > 0.02) drawActor(c, bt.monCalm, mx, my, 0, null, bt.monAlpha * Math.min(1, k * 1.15), gsq);
      const topY = my - bt.monSprite.height * gsq;
      if (bt.mon.boss) {
        c.globalAlpha = bt.monAlpha;
        c.drawImage(bt.crownCv, mx - bt.crownCv.width / 2, topY - bt.crownCv.height + 22);
        c.globalAlpha = 1;
      }
      if (bt.hatCv) { // the tiny hat, worn at a jaunty angle
        c.globalAlpha = bt.monAlpha;
        // A soothed monster TIPS THE HAT. This is non-negotiable.
        const tip = bt.gesture ? Math.sin(bt.gestureT * Math.PI) * 10 : 0;
        c.drawImage(bt.hatCv, mx - bt.hatCv.width / 2 + 8 + tip, topY - bt.hatCv.height + 8 - tip * 0.6);
        c.globalAlpha = 1;
      }
      // Zzz for the one that curled up to sleep
      if (bt.gesture === 'nap' && bt.gestureT > 0.45) {
        c.globalAlpha = bt.monAlpha * Math.min(1, (bt.gestureT - 0.45) * 3);
        c.font = '20px sans-serif';
        c.textAlign = 'center';
        c.fillText('💤', mx + 42, topY - 6 - bt.gestureT * 10);
        c.globalAlpha = 1;
      }
    }

    // particles — sparks fall (gravity); calm motes RISE and fade slowly
    bt.particles = bt.particles.filter(p => {
      if (p.soft) { p.x += p.vx; p.y += p.vy; p.vy -= 0.006; p.life -= 0.009; }
      else { p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.022; }
      if (p.life <= 0) return false;
      c.globalAlpha = Math.max(0, p.life) * (p.soft ? 0.85 : 1);
      c.fillStyle = p.color;
      if (p.shape === 'bubble') {          // an outline that pops, not a dot
        c.strokeStyle = p.color; c.lineWidth = 1.5;
        c.beginPath(); c.arc(p.x, p.y, p.size / 2 + 1, 0, Math.PI * 2); c.stroke();
      } else if (p.shape === 'ribbon') {   // a short streamer, drifting
        c.save(); c.translate(p.x, p.y); c.rotate(p.vx * 2);
        c.fillRect(-p.size, -1, p.size * 2, 2); c.restore();
      } else if (p.shape === 'fish') {     // a little lure-flick triangle
        c.beginPath(); c.moveTo(p.x + p.size / 2, p.y);
        c.lineTo(p.x - p.size / 2, p.y - p.size / 3);
        c.lineTo(p.x - p.size / 2, p.y + p.size / 3);
        c.fill();
      } else if (p.shape === 'note') {     // a notehead with a stem
        c.beginPath(); c.arc(p.x, p.y, p.size / 3, 0, Math.PI * 2); c.fill();
        c.fillRect(p.x + p.size / 3 - 1, p.y - p.size, 1.5, p.size);
      } else if (p.soft) { // round, soft-edged: motes, not shrapnel
        c.beginPath();
        c.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillRect(p.x, p.y, p.size, p.size);
      }
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

  // `squash` (Wave 8b) scales the sprite about its FEET, so a calmed monster can
  // settle, flatten and sink without appearing to float.
  function drawActor(c, img, x, y, flash, flashCv, alpha, squash) {
    const sq = squash == null ? 1 : squash;
    const w = img.width * sq, h = img.height * sq;
    c.globalAlpha = alpha;
    c.drawImage(img, x - w / 2, y - h, w, h);
    if (flash > 0.04 && flashCv) {
      c.globalAlpha = alpha * flash * 0.85;
      c.drawImage(flashCv, x - w / 2, y - h, w, h);
    }
    c.globalAlpha = 1;
  }
})();
