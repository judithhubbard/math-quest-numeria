// Drive Wave 21 (Looking Glass P2: aesthetic + the Cheshire Cat + "Recognize").
// P1 (v1.15.0) shipped the mirror shell + a cool tint. This is the CONTENT
// pass — it makes the mirror world FEEL like a reflection: a curated
// reversal-comedy prose pool (gated on E.inMirror()), the Cheshire Cat (a
// guide that materializes at thresholds and fades smile-last — a pure timed
// function, no Math.random in the fade itself), and "Recognize" (the
// mirror-world WORDING reflavor of Soothe — the soothe/befriend MECHANIC is
// byte-for-byte unchanged). Drives: a reversed-greeting NPC line; the
// Cheshire materializing at TWO real thresholds (stepping through; entering
// a mirror dungeon for the first time) with its fade armed + expiring; the
// "Recognize" stance label in a real mirror battle, ending in the SAME
// becalmed/befriended mechanic as Soothe; and that NONE of this appears
// outside the mirror, before or after.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/private/tmp/claude-503/-Users-jk-Dropbox-Claude-TaskMaker-math/85eabd6d-828f-40fd-ba15-6557b405a666/scratchpad/shots';

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // bounded — a Close handler calls UI.refresh(), which can pop a QUEUED
  // celebration modal (e.g. the first-friend ceremony a Recognize battle
  // earns), so draining must also clear that queue or it can respawn.
  const closeModals = () => ev(() => {
    if (MM.engine.state) MM.engine.state.pendingBadges = [];
    for (let i = 0; i < 20 && MM.ui.modalOpen(); i++) {
      const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child');
      if (b) b.click(); else break;
    }
  });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  async function answerBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    return true;
  }
  async function winBattle() {
    for (let i = 0; i < 30; i++) {
      if (await page.$('#victOk')) break;
      const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!hasForm) { await page.waitForTimeout(300); continue; }
      await answerBattleOnce();
      await page.waitForTimeout(650);
    }
    await page.waitForSelector('#victOk', { timeout: 15000 });
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'MirrorTwoKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // set up a finished kingdom (same fixture shape as drive-mirror.js)
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    Object.assign(s.isles, { lampLit: true, spireDone: true, hallsDone: true, breakwaterDone: true, gullwrackRebuilt: true, lenses: { tidepool: true, frostbite: true, cinderforge: true } });
    s.badges = { addsub_facts: 3 }; s.level = 18; s.stance = 'soothe'; s.brave = false;
    s.seenBattleHelp = true; s.seenCeremony = true;
    MM.engine.enterWorld(); MM.ui.refresh();
  });
  await page.waitForTimeout(200);

  // ---- (0) OUTSIDE the mirror: nothing Wave 21 leaks ----
  check(!(await ev(() => MM.engine.inMirror())), 'sanity: not through the glass yet');
  await ev(() => { MM.engine.MIRROR_GREETING_CHANCE = 1; });
  await ev(() => MM.engine.talkNpc('a'));
  await page.waitForTimeout(100);
  const fenwickNormalText = await ev(() => document.getElementById('modalBox').innerText);
  check(!/Goodbye/.test(fenwickNormalText), 'OUTSIDE the mirror, Farmer Fenwick never opens with the reversed greeting (chance pinned to 1)');
  await closeModals();

  // ---- (1) step through the glass — the FIRST threshold ----
  await ev(() => MM.engine.startGolden());
  await page.waitForTimeout(150);
  // closing the "step through" dialog should immediately materialize the
  // Cheshire Cat — a real threshold, not a scripted call.
  await page.click('#modalBox .btnrow button');
  await page.waitForTimeout(150);
  const cheshireDlgText = await ev(() => document.getElementById('modalBox').innerText);
  check(/cat/i.test(cheshireDlgText) && /isn.t there any more/i.test(cheshireDlgText),
    `the Cheshire Cat materializes at the FIRST threshold — stepping through the glass ("${cheshireDlgText.replace(/\n/g, ' ').slice(0, 70)}…")`);
  await page.screenshot({ path: `${SHOTS}/mirror2-1-cheshire-line.png` });
  await page.click('#modalBox .btnrow button'); // close it — arms the fade (onClose)
  await page.waitForTimeout(80);
  check(await ev(() => !!MM.engine.cheshireFx), 'the fade is ARMED the moment the kid can see the world again (dialog close, not dialog open)');

  // ---- (2) the fade itself: a PURE function of elapsed time ----
  // Each phase re-arms a FRESH fx object with `start` backdated by a chosen
  // offset, and reads the alphas back in the SAME evaluate() round-trip —
  // arm+read are atomic, so cross-call overhead (evaluate/screenshot can
  // easily cost hundreds of ms headless) can never race the assertion. The
  // screenshot taken right after may drift a little further into the fade,
  // so offsets are chosen with a wide safety margin either side.
  // mid-fade: body faint (present, fading), smile still bright (full alpha)
  const midAlphas = await ev(() => {
    MM.engine.cheshireFx = { start: performance.now() - 400, calm: false };
    return MM.engine.cheshireAlphas(performance.now());
  });
  check(!!midAlphas && midAlphas.body > 0 && midAlphas.body < 1 && midAlphas.smile === 1,
    `mid-fade: body faint (${midAlphas && midAlphas.body.toFixed(2)}) while the smile still holds full (${midAlphas && midAlphas.smile})`);
  await page.screenshot({ path: `${SHOTS}/mirror2-2-cheshire-midfade.png` });

  // smile-lingering: body fully gone, smile alone at full alpha
  const lingerAlphas = await ev(() => {
    MM.engine.cheshireFx = { start: performance.now() - 1500, calm: false };
    return MM.engine.cheshireAlphas(performance.now());
  });
  check(!!lingerAlphas && lingerAlphas.body === 0 && lingerAlphas.smile === 1,
    'smile-lingering: the body is completely gone, the smile alone remains at full alpha');
  await page.screenshot({ path: `${SHOTS}/mirror2-3-cheshire-smile-lingers.png` });

  // the effect EXPIRES — a pure function, so this is deterministic
  const expired = await ev(() => {
    MM.engine.cheshireFx = { start: performance.now() - 5000, calm: false };
    return MM.engine.cheshireActive(performance.now());
  });
  check(!expired, 'the fade EXPIRES once its total duration has passed');
  await ev(() => { MM.engine.cheshireFx = null; });

  // ---- (3) the SECOND threshold: entering a mirror dungeon for the first time ----
  const cheshireCountBefore = await ev(() => MM.engine.state.mirrorCheshireCount || 0);
  await ev(() => MM.engine.enterDungeon(1));
  await page.waitForTimeout(150);
  const secondCheshireText = await ev(() => document.getElementById('modalBox').innerText);
  check(/cat/i.test(secondCheshireText) || /isn.t there any more/i.test(secondCheshireText),
    'the Cheshire Cat materializes AGAIN at the SECOND threshold — entering a mirror dungeon for the first time');
  check((await ev(() => MM.engine.state.mirrorCheshireCount)) === cheshireCountBefore + 1, 'each materialization advances the counter (line choice, never Math.random)');
  await closeModals();
  // a REPEAT entry to the same dungeon (same reflection) must NOT re-trigger
  const countAfterFirst = await ev(() => MM.engine.state.mirrorCheshireCount);
  await ev(() => MM.engine.enterDungeon(1));
  await page.waitForTimeout(120);
  check(!(await ev(() => MM.ui.modalOpen())), 're-entering the SAME dungeon this reflection does not re-materialize the Cheshire');
  check((await ev(() => MM.engine.state.mirrorCheshireCount)) === countAfterFirst, 'the counter holds steady on a repeat dungeon entry');

  // ---- (4) the reversal pool: a reversed-greeting NPC line, INSIDE the mirror ----
  await ev(() => { MM.engine.talkNpc('a'); });
  await page.waitForTimeout(100);
  const fenwickMirrorText = await ev(() => document.getElementById('modalBox').innerText);
  check(/Goodbye/.test(fenwickMirrorText), `INSIDE the mirror, Farmer Fenwick opens with the reversed greeting ("${fenwickMirrorText.replace(/\n/g, ' ').slice(0, 70)}…")`);
  await page.screenshot({ path: `${SHOTS}/mirror2-4-reversed-npc.png` });
  await closeModals();
  await ev(() => { MM.engine.MIRROR_GREETING_CHANCE = 0.4; }); // restore the default

  // ---- (5) "Recognize" — a real mirror battle, mechanically Soothe ----
  const combat = await ev(() => {
    const s = MM.engine.state;
    s.stance = 'soothe'; s.brave = false;
    MM.engine.enterDungeon(1);
    const m = s.monsters.find(m => !m.boss && m.hp > 0);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    MM.engine.startCombat(m);
    return { name: m.name };
  });
  await page.waitForFunction(() => MM.battle.active());
  // B.start delays the FIRST round's message (nextRound) by 650ms behind the
  // entrance tween — the banner is set synchronously, but battleMsg/monSub
  // need to wait for that first round to actually land.
  await page.waitForTimeout(900);
  const banner = await ev(() => (document.getElementById('battleBanner') || {}).innerText || '');
  const battleMsg = await ev(() => (document.getElementById('battleMsg') || {}).innerText || '');
  const monSub = await ev(() => (document.getElementById('monBarSub') || {}).innerText || '');
  check(/Reflected/i.test(banner), `the mirror battle opens with the "Reflected" stance banner, not "Frightened" ("${banner}")`);
  check(/recognize/i.test(battleMsg), `the round prompt reads as Recognize, not Soothe ("${battleMsg.replace(/\n/g, ' ').slice(0, 70)}…")`);
  check(/stranger/i.test(monSub), `the calm-bar label reads "Recognize" wording ("${monSub}")`);
  await page.screenshot({ path: `${SHOTS}/mirror2-5-recognize-battle.png` });

  await winBattle();
  await page.waitForTimeout(150);
  const victoryTitle = await ev(() => (document.querySelector('.victory-title') || {}).innerText || '');
  check(/RECOGNIZED/i.test(victoryTitle), `the victory panel reads "RECOGNIZED", not "CALMED" ("${victoryTitle}")`);
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  await closeModals();

  // the MECHANIC is untouched: same becalmed/befriended axis as Soothe
  const mech = await ev(name => {
    const s = MM.engine.state;
    const m = s.monsters.find(m => m.becalmed);
    return m ? {
      alive: m.hp === m.maxhp,
      pacified: MM.engine.isPacified(m),
      befriended: (s.bestiary.befriended || {})[name] || 0,
    } : null;
  }, combat.name);
  check(!!mech && mech.alive && mech.pacified, 'Recognize still BECALMS the monster — full health, pacified, exactly like Soothe');
  check(!!mech && mech.befriended >= 1, 'Recognize still joins the befriended axis — the same collection Soothe feeds');

  // the Settings ("Your way") label reflects Recognize too, while through the glass
  await ev(() => MM.ui.difficultyDialog());
  await page.waitForTimeout(100);
  const settingsText = await ev(() => document.getElementById('modalBox').innerText);
  check(/recognizing/i.test(settingsText), 'the ⚙️ Settings "Your way" section reads "recognizing" through the glass');
  await closeModals();

  // ---- (6) step back through the glass — Wave 21 content stops appearing ----
  await ev(() => MM.engine.mirrorExitPrompt());
  await page.waitForTimeout(100);
  await ev(() => document.querySelectorAll('#modalBox .btnrow button')[0].click());
  await page.waitForTimeout(200);
  check(!(await ev(() => MM.engine.inMirror())), 'stepping back closes the mirror');
  await ev(() => { MM.engine.MIRROR_GREETING_CHANCE = 1; });
  await ev(() => MM.engine.talkNpc('a'));
  await page.waitForTimeout(100);
  const fenwickAfterText = await ev(() => document.getElementById('modalBox').innerText);
  check(!/Goodbye/.test(fenwickAfterText), 'AFTER stepping back, Farmer Fenwick never offers the reversed greeting again');
  await closeModals();
  const noLeakBattle = await ev(() => {
    const s = MM.engine.state;
    s.stance = 'soothe'; s.brave = false;
    MM.engine.enterDungeon(1);
    const m = s.monsters.find(m => !m.boss && m.hp > 0);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    MM.engine.startCombat(m);
    return true;
  });
  await page.waitForFunction(() => MM.battle.active());
  await page.waitForTimeout(150);
  const bannerAfter = await ev(() => (document.getElementById('battleBanner') || {}).innerText || '');
  check(/Frightened/i.test(bannerAfter) && !/Reflected/i.test(bannerAfter), `back in normal play, the battle banner reads "Frightened" again, never "Reflected" ("${bannerAfter}")`);
  await ev(() => { const f = document.getElementById('fleeBtn'); if (f) f.click(); });
  await page.waitForTimeout(300);

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
