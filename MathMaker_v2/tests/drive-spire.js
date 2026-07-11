// Drive MathMaker v2 Wave 3 (EXPANSION_PLAN.md §3): the Clockwork Spire on
// Horologe Isle — the third sail destination, clock-reading problems (an
// inline SVG clock face + "3:15" answers), clock doors, the re-lockable
// gear-plate mechanic, a shouting thief, and all 5 floors ending in a boss.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-spire');

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

async function solveModalProblem(page) {
  const info = await page.evaluate(`(${canonicalize})(MM.ui.current)`);
  if (info.kind === 'choice') await page.click(`#modalBox .choice >> nth=${info.idx}`);
  else {
    await page.fill('#modalBox #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
}

async function answerBattle(page) {
  const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
  if (!info) return false;
  if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
  else {
    await page.fill('#battleProblem #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  return true;
}

async function winBattle(page) {
  for (let i = 0; i < 30; i++) {
    const victory = await page.$('#victOk');
    if (victory) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    await answerBattle(page);
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 15000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  // full-sweep I/O load (17 drives' screenshots + Dropbox indexing) can
  // slow animation chains past Playwright's 30s default — this drive and
  // drive-lighthouse both flaked in sweeps while passing standalone
  page.setDefaultTimeout(90000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'SpireKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // endgame hero, all three isle lenses + the lamp already lit, geared up so
  // the boss fight doesn't drag — Wave 3 is about the mechanics, not the grind
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.difficulty = 'story';
    s.gear = { weapon: ['stick', 'tidal'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'] };
    s.equipped = { weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
    s.level = 20; s.maxhp = 120; s.hp = 120; s.gold = 500;
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.lampLit = true;
    s.unsealed = { d19: true }; // skip the seal exam — Wave 3 is about the Spire itself
    s.continent = 'isles';
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // the Isles dock now offers a THIRD leg once the lamp is lit
  const dockOffersHorologe = await page.evaluate(() => {
    let seen = false;
    const origDialogChoices = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (title, body, choices) => { seen = choices.some(c => /Horologe/.test(c.label)); };
    MM.engine.dock();
    MM.ui.dialogChoices = origDialogChoices;
    return seen;
  });
  check(dockOffersHorologe, 'the Isles dock offers a third leg to Horologe once the lamp is lit');

  // sail there directly (bypass the animation — every other drive does this)
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.continent = 'horologe';
    MM.engine.enterWorld();
    MM.engine.save();
  });
  check(await page.evaluate(() => MM.engine.state.mapId === 'horologe'), 'arrived on Horologe Isle');
  await page.screenshot({ path: SHOTS + '/1-horologe-overworld.png' });

  // bump the '5' to enter the Clockwork Spire
  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // (19,3) -> (20,3), the Spire entrance
  await page.waitForFunction(() => MM.engine.state.mapId === 'd19f0');
  check(true, 'entered the Clockwork Spire (5 floors, dungeon 19)');

  // ---------- floor 1: clock door ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 6; s.py = 7; });
  await page.keyboard.press('ArrowLeft'); // bump the key at (5,7)
  check(await page.evaluate(() => MM.engine.state.isles.keys.d19 === 1), 'floor 1: key picked up');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 16; s.py = 4; });
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
  check(await page.evaluate(() => MM.engine.state.grid[2][16] === '.' && MM.engine.state.isles.keys.d19 === 0),
    'floor 1: the key opens the locked door');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 29; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // bump the clock door (Z) at (30,3)
  await page.waitForSelector('#modalBox .prob-svg svg', { timeout: 5000 });
  check(true, 'clock door: an SVG clock face rendered');
  await page.screenshot({ path: SHOTS + '/2-clock-door.png' });
  const clockProblem = await page.evaluate(() => MM.ui.current);
  check(clockProblem.kind === 'clock' && !!clockProblem.svg, 'clock door: problem is kind:"clock" with an svg face');
  const timeAnswer = `${clockProblem.answer.h}:${String(clockProblem.answer.m).padStart(2, '0')}`;
  check(/^\d{1,2}:\d{2}$/.test(timeAnswer), `"${timeAnswer}" is in 3:15 format`);
  await page.fill('#modalBox #answerInput', timeAnswer);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
  check(await page.evaluate(() => MM.engine.state.grid[3][30] === '.'), 'clock door: opened after a correct "h:mm" answer');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 34; s.py = 12; });
  await page.keyboard.press('ArrowRight'); // descend the stairs at (35,12)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd19f1');
  check(true, 'floor 1 complete — descending to floor 2');

  // ---------- floor 2: the gear plate (re-lockable, unlike every other lever) ----------
  check(await page.evaluate(() => MM.engine.state.grid[4][7] === '.'), 'gear plate: alcove A starts open (state 0)');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 2; });
  await page.keyboard.press('ArrowLeft'); // grab alcove A's chest at (7,2) while it's open
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(200);
  check(await page.evaluate(() => MM.engine.state.grid[2][7] === '.'), 'gear plate: alcove A\'s chest was reachable and opened');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 17; s.py = 8; });
  await page.keyboard.press('ArrowUp'); // pull the gear plate at (17,7): state 0 -> 1
  await page.waitForTimeout(100);
  check(await page.evaluate(() => MM.engine.state.grid[4][7] === '#' && MM.engine.state.grid[4][17] === '.'),
    'gear plate: one pull closes A and opens B');
  await page.screenshot({ path: SHOTS + '/3-gear-plate.png' });
  await page.evaluate(() => { const s = MM.engine.state; s.px = 17; s.py = 8; });
  await page.keyboard.press('ArrowUp'); // state 1 -> 2
  check(await page.evaluate(() => MM.engine.state.grid[4][17] === '#' && MM.engine.state.grid[4][27] === '.'),
    'gear plate: a second pull closes B and opens C');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 17; s.py = 8; });
  await page.keyboard.press('ArrowUp'); // state 2 -> 0 (wraps)
  check(await page.evaluate(() => MM.engine.state.grid[4][27] === '#' && MM.engine.state.grid[4][7] === '.'),
    'gear plate: a third pull wraps back to A — the cycle repeats, nothing is one-shot');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 35; s.py = 13; });
  await page.keyboard.press('ArrowRight'); // descend at (36,13)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd19f2');
  check(true, 'floor 2 complete — descending to floor 3');

  // ---------- floor 3: the Cuckoo shouts ----------
  const shoutResult = await page.evaluate(() => {
    const s = MM.engine.state;
    s.gold = 40;
    s.px = 4; s.py = 3; // adjacent to the Cuckoo at (5,3)
    const before = s.monsters.map(m => ({ x: m.x, y: m.y, alerted: m.alerted || 0 }));
    MM.engine.monsterTurn();
    const after = s.monsters.map(m => m.alerted || 0);
    return { goldAfter: s.gold, anyAlerted: after.some(a => a > 0), before };
  });
  check(shoutResult.goldAfter < 40, 'the Cuckoo steals gold on approach');
  check(shoutResult.anyAlerted, 'the Cuckoo\'s shout wakes other monsters on the floor into a chase');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 7; s.monsters.forEach(m => m.alerted = 0); });
  await page.keyboard.press('ArrowRight'); // bump the second clock door at (20,7)
  await page.waitForSelector('#modalBox .prob-svg svg', { timeout: 5000 });
  await solveModalProblem(page);
  await page.waitForTimeout(200);
  check(await page.evaluate(() => MM.engine.state.grid[7][20] === '.'), 'floor 3: second clock door opened');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 29; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // bump the secret wall at (30,3) — this only opens it, doesn't move you
  check(await page.evaluate(() => MM.engine.state.grid[3][30] === '.'), 'floor 3: secret wall opens');
  await page.keyboard.press('ArrowRight'); // step onto the now-open (30,3)
  await page.keyboard.press('ArrowRight'); // walk onto the chest at (31,3)
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(200);

  await page.evaluate(() => { const s = MM.engine.state; s.px = 36; s.py = 8; });
  await page.keyboard.press('ArrowRight'); // descend at (37,8)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd19f3');
  check(true, 'floor 3 complete — descending to floor 4');

  // ---------- floor 4: the classic one-shot lever ----------
  check(await page.evaluate(() => MM.engine.state.grid[8][10] === 'G'), 'floor 4: the gates start closed');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 2; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // pull the lever at (3,3)
  check(await page.evaluate(() => [10, 20, 30].every(x => MM.engine.state.grid[8][x] === '.')),
    'floor 4: the lever opens every gate on this floor');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 2; });
  await page.keyboard.press('ArrowUp'); // onto the key at (5,1)
  check(await page.evaluate(() => MM.engine.state.isles.keys.d19 === 1), 'floor 4: key picked up');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 12; s.py = 3; });
  await page.keyboard.press('ArrowUp'); // the locked pocket at (12,2)
  check(await page.evaluate(() => MM.engine.state.grid[2][12] === '.'), 'floor 4: key opens the locked pocket');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 36; s.py = 2; });
  await page.keyboard.press('ArrowRight'); // descend at (37,2)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd19f4');
  check(true, 'floor 4 complete — descending to floor 5, the boss floor');

  // ---------- floor 5: The Unwound King ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 20; s.py = 9; });
  await page.keyboard.press('ArrowUp'); // bump the boss at (20,8)
  await page.waitForSelector('#battleProblem', { timeout: 5000 });
  await page.waitForTimeout(800); // entrance animation
  await winBattle(page);
  check(await page.evaluate(() => MM.engine.state.isles.spireDone === true), 'the Unwound King is beaten — spireDone set');
  check(await page.evaluate(() => MM.engine.state.bossesDefeated['d19f4'] === true), 'boss recorded in bossesDefeated');
  await page.screenshot({ path: SHOTS + '/4-boss-beaten.png' });

  await page.evaluate(() => { MM.engine.save(); MM.engine.load('SpireKid'); });
  check(await page.evaluate(() => MM.engine.state.isles.spireDone === true), 'spireDone persists through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
