// Drive MathMaker v2 Frostbite Hollow (dungeon 15): lens-gated entry, the
// frozen-lake crossing on floor 1, key -> locked stairs, the floor-2 ice-floe
// puzzle (landing at the lever gap, the pad-locked cache), the gate, and the
// Glacier's Heart lighting the Frost Lens (v-fog clears at the lighthouse).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-frost');

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

async function battleToVictory(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    if (await page.$('#victOk')) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (info) {
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else {
        await page.fill('#battleProblem #answerInput', info.val);
        await page.keyboard.press('Enter');
      }
    }
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 20000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  await page.waitForTimeout(300);
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) break;
    await ok.click();
    await page.waitForTimeout(250);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'FrostKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // endgame hero on the isles, Tide Lens NOT yet lit
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.seenCeremony = true;
    s.gear = { weapon: ['stick', 'tidal'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'] };
    s.equipped = { weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
    s.level = 16; s.maxhp = 100; s.hp = 100; s.gold = 100; s.difficulty = 'story';
    s.continent = 'isles';
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // gate: no entry before the Tide Lens
  await page.evaluate(() => { const s = MM.engine.state; s.isles.lenses = {}; MM.engine.tryEnterDungeon(15); });
  await page.waitForSelector('#modalBox h2');
  check(/choked with Murk/.test(await page.textContent('#modalBox')), 'Frostbite is sealed before the Tide Lens');
  await page.click('#dlgOk');

  // light the tide lens; fog clears; enter through the seal
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.isles.lenses.tidepool = true;
    MM.engine.enterWorld();
    s.px = 29; s.py = 4;
  });
  await page.keyboard.press('ArrowUp'); // bump the '2'
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForFunction(() => MM.engine.state.mapId === 'd15f0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/1-hollow-f1.png' });
  check(true, 'seal exam admits you to Frostbite Hollow');
  check(await page.evaluate(() => {
    const names = MM.engine.state.monsters.map(m => m.name);
    return names.includes('Icebound Sentinel') || names.includes('Snow Sprite') || names.includes('Frost Pup');
  }), 'frostbite roster spawned');

  // the frozen lake: step north from the south hall, slide the whole way
  const crossed = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 12; s.py = 11;
    MM.engine.tryMove(0, -1); // onto the lake at (12,10)
    return { x: s.px, y: s.py };
  });
  check(crossed.x === 12 && crossed.y === 4, `the lake slides you across (landed ${crossed.x},${crossed.y})`);

  // key (behind the Sentinel's post) -> locked door -> stairs down
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 2;
    MM.engine.tryMove(0, -1); // pick up the key at (2,1)
    return (s.isles.keys.d15 || 0) === 1;
  }), 'key picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 5;
    MM.engine.tryMove(0, -1); // unlock the K at (21,4)
    return s.grid[4][21] === '.' && s.isles.keys.d15 === 0;
  }), 'key opens the stairs shaft');
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 23; s.py = 2;
    MM.engine.tryMove(0, -1); // onto the > at (23,1)
  });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd15f1');
  check(true, 'stairs descend to the floe floor');

  // the floe puzzle: slide up column 19 lands beside the gate; the lever
  // requires landing on the (18,6) island
  const gateStop = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 19; s.py = 12;
    MM.engine.tryMove(0, -1); // slide up column 19 -> island at (19,6)
    const mid = { x: s.px, y: s.py };
    MM.engine.tryMove(0, -1); // slide again -> lands beside the gate (19,2)
    return { mid, x: s.px, y: s.py };
  });
  check(gateStop.mid.y === 6 && gateStop.x === 19 && gateStop.y === 2,
    `two slides up column 19 reach the boss gate (via ${gateStop.mid.x},${gateStop.mid.y} to ${gateStop.x},${gateStop.y})`);
  check(await page.evaluate(() => MM.engine.state.grid[2][20] === 'G'), 'the gate is still shut');
  const leverStop = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 18; s.py = 12;
    MM.engine.tryMove(0, -1); // slide up column 18: the island at (18,6) stops you
    return { x: s.px, y: s.py };
  });
  check(leverStop.x === 18 && leverStop.y === 6, `the island catches you by the lever gap (landed ${leverStop.x},${leverStop.y})`);
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    MM.engine.tryMove(1, 0); // (19,6)
    MM.engine.tryMove(1, 0); // (20,6)
    MM.engine.tryMove(1, 0); // (21,6)
    MM.engine.tryMove(1, 0); // pull the L at (22,6)
    return s.grid[2][20] === '.';
  }), 'the lever opens the boss gate');

  // the pad-locked cache
  const cache = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 6;
    MM.engine.tryMove(0, -1); // onto the pad at (2,5) -> twin (22,9)
    return { x: s.px, y: s.py, chest: s.grid[8][24] };
  });
  check(cache.x === 22 && cache.y === 9 && cache.chest === '*', 'the pad guards a hidden cache');

  // the Glacier's Heart -> the Frost Lens
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    s.px = b.x; s.py = b.y + 1;
    MM.engine.startCombat(b);
  });
  await battleToVictory(page, 40);
  await page.screenshot({ path: SHOTS + '/2-frost-lens.png' });
  check(await page.evaluate(() => MM.engine.state.isles.lenses.frostbite === true),
    'the Glacier\'s Heart yields the Frost Lens');

  // out and home: the v-fog at the lighthouse neck has melted
  await page.evaluate(() => { const s = MM.engine.state; s.px = 2; s.py = 1; MM.engine.tryMove(-1, 0); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd15f0');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 12; MM.engine.tryMove(0, 1); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');
  check(await page.evaluate(() => MM.engine.state.px === 29 && MM.engine.state.py === 4),
    'exiting returns you beside the hollow, not the dock');
  check(await page.evaluate(() => MM.engine.state.grid[3][8] === '.'),
    'the v-fog at the lighthouse neck recedes');
  check(await page.evaluate(() => MM.engine.state.grid[4][8] === 'w'),
    'the final w-fog still guards the tower');
  check(await page.evaluate(() => {
    MM.engine.save(); MM.engine.load('FrostKid');
    return MM.engine.state.isles.lenses.frostbite === true;
  }), 'the Frost Lens persists through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
