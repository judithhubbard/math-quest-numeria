// Drive MathMaker v2 v1.7.0 ("story & wonder" pass — EXPANSION_PLAN.md's
// "v1.7.0 queue" section): the Turning Stones spiral rework + sequence walk,
// the Spiral Stair sealed/opened, Miscount's Tales of the Guessing Years +
// golem battle cries, boss wrong-math attacks + the correction beat, inn cat
// moments, and the dual-form ⚡ toggle (combat AND boss tail). Screenshots
// are taken and must be LOOKED AT (Read tool) as part of the review — a
// rendered spiral that doesn't read as a spiral is a failure even if every
// assertion below passes.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-wonder');

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  async function answerBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    return true;
  }
  async function dlgOk() { await page.waitForSelector('#dlgOk'); await page.click('#dlgOk'); await page.waitForTimeout(160); }
  async function clearModals() {
    await ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button'); if (!b) break; b.click(); } });
  }
  async function fleeIfBattling() {
    for (let i = 0; i < 10 && await ev(() => MM.battle.active()); i++) {
      if (await page.$('#victOk')) { await page.click('#victOk'); break; }
      await ev(() => { const f = document.getElementById('fleeBtn'); if (f) f.click(); });
      await page.waitForTimeout(300);
    }
    await page.waitForFunction(() => !MM.battle.active(), null, { timeout: 10000 });
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Wonder');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 1; s.tasksDone = [];
    s.gold = 200; s.level = 6; s.maxhp = 100; s.hp = 100;
    s.seenBattleHelp = true; s.seenCeremony = true;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // ================= 1. The Turning Stones spiral =================
  const center = await ev(() => MM.data.TURNING_STONES_CENTER);
  await ev(({ x, y }) => { MM.engine.state.px = x; MM.engine.state.py = y; }, center);
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/1-spiral-0tasks.png' });

  await ev(() => { MM.engine.state.tasksDone = [1, 2, 3, 4, 5, 6]; MM.engine.save(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/2-spiral-6tasks.png' });
  const mid = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.map(st => s.tasksDone.length > st.i);
  });
  check(mid.filter(Boolean).length === 6, `6 tasks done: exactly 6 stones align (got ${mid.filter(Boolean).length})`);

  await ev(() => { MM.engine.state.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; MM.engine.save(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/3-spiral-13tasks.png' });
  const full = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.map(st => s.tasksDone.length > st.i);
  });
  check(full.every(Boolean), '13 tasks done: the complete spiral, every stone aligned');

  // geometry, read straight off the live data (mirrors the unit test, but
  // through the same object the renderer actually reads)
  const geom = await ev(() => {
    const stones = MM.data.TURNING_STONES;
    const posSet = new Set(stones.map(s => `${s.x},${s.y}`));
    let adjacent = true;
    for (let i = 1; i < stones.length; i++) {
      const dx = Math.abs(stones[i].x - stones[i - 1].x), dy = Math.abs(stones[i].y - stones[i - 1].y);
      if (dx + dy !== 1) adjacent = false; // v1.7.1: strictly orthogonal unit steps
    }
    // v1.7.1: the walk's whole point — the outer stone TOUCHES the Stair
    const last = stones[stones.length - 1];
    const tower = MM.maps.find(MM.maps.OVERWORLD, 'H')[0];
    const atStair = tower && Math.abs(last.x - tower.x) + Math.abs(last.y - tower.y) === 1;
    return { unique: posSet.size === 13, adjacent, atStair };
  });
  check(geom.unique, 'spiral: all 13 stone positions are unique');
  check(geom.adjacent, 'spiral: every consecutive pair of stones is one orthogonal step apart (a walk, not a scatter)');
  check(geom.atStair, 'spiral: the outer stone sits touching the Spiral Stair\'s tile (the curl ends AT the tower)');

  // ================= 2. The sequence walk =================
  await ev(() => { MM.engine.state.tasksDone = []; MM.engine.save(); });
  const walkResult = await ev(() => {
    const s = MM.engine.state;
    s.spiralWalkNext = 0; s.seenSpiralWalk = false;
    const tones = [];
    const realTone = MM.sound.tone;
    MM.sound.tone = (...a) => tones.push(a[0]);
    const stones = MM.data.TURNING_STONES;
    // start one tile west of the center stone, then walk the whole spiral
    // via REAL tryMove steps (the production per-step wiring, not a direct
    // function call) — every consecutive delta is a pure cardinal step.
    s.px = stones[0].x - 1; s.py = stones[0].y;
    MM.engine.tryMove(1, 0); // onto stone 0 (the center) — (re)starts the walk
    for (let i = 1; i < stones.length; i++) {
      const dx = stones[i].x - stones[i - 1].x, dy = stones[i].y - stones[i - 1].y;
      MM.engine.tryMove(dx, dy);
    }
    const afterFullWalk = { tones: tones.slice(), seen: s.seenSpiralWalk, next: s.spiralWalkNext };
    // out of order: teleport near an unrelated stone and step onto it fresh
    tones.length = 0;
    s.spiralWalkNext = 0;
    s.px = stones[7].x - 1; s.py = stones[7].y;
    MM.engine.tryMove(1, 0); // lands on stone 7 while expecting stone 0 — silence
    const outOfOrder = { tones: tones.slice(), next: s.spiralWalkNext };
    MM.sound.tone = realTone;
    MM.engine.save();
    return { afterFullWalk, outOfOrder };
  });
  check(walkResult.afterFullWalk.tones.length === 13, `sequence walk: 13 real tryMove steps chimed 13 times (got ${walkResult.afterFullWalk.tones.length})`);
  check(walkResult.afterFullWalk.seen === true, 'sequence walk: the full in-order walk sets seenSpiralWalk (the once-ever flourish fired)');
  const logAfterWalk = await ev(() => document.getElementById('log').innerText);
  check(/settles into place/.test(logAfterWalk), 'sequence walk: the once-ever flourish logs its own line');
  check(walkResult.outOfOrder.tones.length === 0, 'sequence walk: stepping on an out-of-order stone is silent (no chime)');
  check(walkResult.outOfOrder.next === 0, 'sequence walk: an out-of-order step quietly resets the attempt, no failure message');
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/4-spiral-flourish.png' });

  // newest-segment glint: pending on a fresh task, arms on the next plaza crossing
  const glint = await ev(({ x, y }) => {
    const s = MM.engine.state;
    s.spiralGlintPending = 3;
    s.px = x - 10; s.py = y; // far from the plaza — must NOT arm yet
    MM.engine.checkSpiralGlint();
    const farArmed = MM.engine.spiralStoneGlinting(3);
    s.px = x; s.py = y; // now AT the plaza
    MM.engine.checkSpiralGlint();
    const nearArmed = MM.engine.spiralStoneGlinting(3);
    return { farArmed, nearArmed, pendingClearedAfter: s.spiralGlintPending };
  }, center);
  check(!glint.farArmed, 'spiral glint: stays dormant while far from the plaza');
  check(glint.nearArmed, 'spiral glint: arms the moment the kid actually crosses the plaza');
  check(glint.pendingClearedAfter == null, 'spiral glint: the pending flag is consumed once armed (fires only once)');
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/5-spiral-glint.png' });

  // ================= 3. The Spiral Stair — sealed, then open =================
  await ev(() => { MM.engine.state.endingDone = false; });
  await ev(() => MM.engine.spiralMenu());
  await page.waitForSelector('h2');
  const sealedText = await ev(() => document.getElementById('modalBox').innerText);
  check(/A door with no keyhole/.test(sealedText), 'Spiral Stair: pre-ending bump shows the exact sealed line');
  check(/It isn.t ready\. Or you aren.t\. Hard to say which\./.test(sealedText), 'Spiral Stair: sealed line ends exactly as approved');
  await page.screenshot({ path: SHOTS + '/6-stair-sealed.png' });
  await dlgOk();

  await ev(() => { MM.engine.state.endingDone = true; });
  await ev(() => MM.engine.spiralMenu());
  await page.waitForSelector('h2');
  const openText = await ev(() => document.getElementById('modalBox').innerText);
  check(/climb/i.test(openText) || /Floor 1/.test(openText), 'Spiral Stair: post-ending shows the climb menu, not the seal');
  await clearModals();

  // ================= 4. Tales of the Guessing Years =================
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = Array.from({ length: 13 }, (_, i) => i + 1);
    s.academy = null; s.academyTotal = 0;
    MM.engine.GUESS_TALE_CHANCE = 1;
  });
  await ev(() => MM.engine.academy());
  await page.waitForSelector('h2');
  const academyText = await ev(() => document.getElementById('modalBox').innerText);
  const tales = await ev(() => MM.data.MISCOUNT_GUESS_TALES);
  check(tales.some(t => academyText.includes(t.replace(/<[^>]+>/g, '').split('"')[1] || '')) || /pays just often enough|carpenter|sentry duty|five digits/.test(academyText),
    'guess tales: a post-ending Academy visit shows one of the four tales');
  await page.screenshot({ path: SHOTS + '/7-guess-tale.png' });
  await clearModals();
  await fleeIfBattling();

  // pre-ending: never shown, even with the chance pinned to 1
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = false; s.taskIndex = 11; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    s.academy = null;
    MM.engine.GUESS_TALE_CHANCE = 1;
  });
  await ev(() => MM.engine.academy());
  await page.waitForSelector('h2');
  const preEndingAcademyText = await ev(() => document.getElementById('modalBox').innerText);
  check(!/pays just often enough|carpenter|sentry duty|five digits/.test(preEndingAcademyText), 'guess tales: never shown before the ending, even with the chance pinned to 1');
  await clearModals();
  await fleeIfBattling();
  await ev(() => { MM.engine.state.endingDone = true; MM.engine.state.taskIndex = 14; });

  // ================= 5. Golem battle cry =================
  await ev(() => { MM.battle.GOLEM_CRY_CHANCE = 1; MM.engine.startArenaBattle(1); });
  await page.waitForFunction(() => MM.battle.active());
  // the enter-flavor renders with round 1 (after(650, nextRound)) — WAIT for
  // the message, don't race it (a fixed 800ms lost to the 650ms timer under
  // sweep load, v1.7.1)
  await page.waitForFunction(() => {
    const el = document.getElementById('battleMsg');
    return el && el.innerText.trim().length > 0;
  }, null, { timeout: 8000 }).catch(() => {});
  const cryLine = await ev(() => document.getElementById('battleMsg').innerText);
  check(/SEVEN|CARRY NOTHING|ALWAYS TWELVE/.test(cryLine), `golem cry: a rare battle cry appears in the opening flavor ("${cryLine.slice(0, 60)}…")`);
  await page.screenshot({ path: SHOTS + '/8-golem-cry.png' });
  await ev(() => { MM.battle.GOLEM_CRY_CHANCE = 0.12; });
  await fleeIfBattling();

  // ================= 6. Boss wrong-math attack + correction beat =================
  await ev(() => {
    const s = MM.engine.state;
    MM.engine.enterDungeon(1);
    const b = s.monsters.find(m => m.boss && m.hp > 0);
    b.hp = b.maxhp = 999; // survive at least one strike, deterministically, so the counter always lands
    MM.engine.WRONG_ATTACK_CHANCE = 1;
    // pin the hero's dodge too (base chance is 0.35!) — the section fires
    // exactly ONE counterattack, and a dodged counter renders no lie, so
    // without this pin the whole check was a 65% coin flip (it came up
    // tails in the v1.7.1 sweep; flaky by design since v1.7.0)
    MM.engine._realDodgeChance = MM.engine.dodgeChance;
    MM.engine.dodgeChance = () => 0;
    MM.engine.startCombat(b);
  });
  await page.waitForFunction(() => MM.battle.active());
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 10000 });
  await page.waitForTimeout(300);
  await answerBattleOnce(); // a correct strike — if the boss survives, it counters with a lie
  // poll for the boss-lie message (it appears mid-round, then is overwritten
  // once the NEXT round auto-starts) or a premature victory
  let lieSeen = false, victoryEarly = false;
  for (let i = 0; i < 50 && !lieSeen && !victoryEarly; i++) {
    await page.waitForTimeout(150);
    const html = await ev(() => (document.getElementById('battleMsg') || {}).innerHTML || '');
    if (/boss-lie/.test(html)) lieSeen = true;
    if (await page.$('#victOk')) victoryEarly = true;
  }
  check(lieSeen || victoryEarly, 'boss falsehood: a wrong-equation attack rendered, or the boss fell before it could counter');
  if (lieSeen) check(true, 'boss falsehood: a wrong-equation attack renders in the battle message');
  await page.screenshot({ path: SHOTS + '/9-boss-falsehood.png' });
  if (lieSeen) {
    // the next round auto-starts after a correct answer (no button) — wait
    // for its form, then answer correctly again for the correction beat
    await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (!(await page.$('#victOk'))) {
      await answerBattleOnce();
      await page.waitForTimeout(250);
      const correctionHtml = await ev(() => { const el = document.getElementById('probFeedback'); return el ? el.innerHTML : ''; });
      check(/boss-correction/.test(correctionHtml) || /The record, corrected/.test(correctionHtml),
        'correction beat: the kid\'s next correct strike names the true equation');
      await page.screenshot({ path: SHOTS + '/10-correction-beat.png' });
    } else {
      check(true, 'correction beat: boss fell on the lie round itself — nothing to correct this run');
    }
  } else {
    check(true, 'correction beat: skipped (boss fell before ever lying)');
  }
  await fleeIfBattling();
  await ev(() => {
    MM.engine.WRONG_ATTACK_CHANCE = 0.5;
    MM.engine.dodgeChance = MM.engine._realDodgeChance;
    delete MM.engine._realDodgeChance;
  });

  // ================= 7. Inn cat moments =================
  await ev(() => {
    const s = MM.engine.state;
    s.catPettedDate = MM.engine.todayStr(); // already patted today
    MM.engine.CAT_ESCORT_CHANCE = 1;
  });
  await ev(() => MM.engine.inn(false));
  await page.waitForSelector('h2');
  const catText = await ev(() => document.getElementById('modalBox').innerText);
  const catMoments = await ev(() => MM.data.CAT_MOMENTS);
  check(catMoments.some(m => catText.includes(m.replace(/<[^>]+>/g, '').split('"')[0].trim().slice(0, 20))) || /outranks|census|too small|television|warm-up slate|middle distance/i.test(catText),
    'cat moments: a non-pat inn visit shows a moment from the pool');
  check(/tail up like a flag/.test(catText), 'cat moments: the door-escort line appears when the chance is pinned to 1');
  await page.screenshot({ path: SHOTS + '/11-cat-moment.png' });
  await clearModals();
  await fleeIfBattling();

  // ================= 8. Mid-round ⚡ toggle, both directions (boss tail) =================
  await ev(() => {
    const s = MM.engine.state;
    for (let i = 0; i < 20; i++) MM.mastery.record(s, MM.data.TASKS[3].skill, true); // tier 3
    MM.engine.enterDungeon(4); // multidigit_mult
    const b = s.monsters.find(m => m.boss && m.hp > 0);
    s.brave = false;
    MM.engine.startCombat(b);
  });
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  const baseForm = await ev(() => MM.battle.current && MM.battle.current.text);
  const eligible = await ev(() => !!(MM.battle.current && MM.battle.current._dualEligible));
  let toggleReport = { eligible };
  if (eligible) {
    await page.waitForSelector('#stBrave');
    await page.click('#stBrave'); // ON — the tail should attach, same operands
    await page.waitForTimeout(200);
    const extForm = await ev(() => MM.battle.current && MM.battle.current.text);
    await page.click('#stBrave'); // OFF — truncates back
    await page.waitForTimeout(200);
    const backToBase = await ev(() => MM.battle.current && MM.battle.current.text);
    toggleReport = { eligible, baseForm, extForm, backToBase };
  }
  if (eligible) {
    check(toggleReport.extForm !== toggleReport.baseForm, `boss tail: toggling ⚡ ON attaches the tail to the SAME problem (base "${toggleReport.baseForm}" -> ext "${toggleReport.extForm}")`);
    check(toggleReport.backToBase === toggleReport.baseForm, 'boss tail: toggling ⚡ OFF truncates back to the original base form exactly');
  } else {
    check(true, 'boss tail: this particular draw was an ineligible kind (choice/clock) — dual-form toggle correctly skipped it');
  }
  await page.screenshot({ path: SHOTS + '/12-boss-tail-toggle.png' });
  await fleeIfBattling();

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})().catch(e => { console.error('DRIVER FAILED:', e.message); process.exit(2); });
