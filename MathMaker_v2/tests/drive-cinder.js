// Drive MathMaker v2 Cinderforge Depths (dungeon 16): lens-gated entry, three
// floors, two keys, cinder shards, the lever-gated chute room, the one-way
// drop to the foundry, the Foreman lighting the Cinder Lens, the w-fog
// clearing, and the all-three-lenses lighthouse message.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-cinder');

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
  await page.fill('#newName', 'CinderKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // endgame hero on the isles; only the Tide Lens lit -> Cinderforge is sealed
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true;
    s.gear = { weapon: ['stick', 'tidal'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'] };
    s.equipped = { weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
    s.level = 17; s.maxhp = 105; s.hp = 105; s.gold = 100; s.difficulty = 'story';
    s.continent = 'isles';
    s.isles.lenses = { tidepool: true };
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });
  await page.evaluate(() => MM.engine.tryEnterDungeon(16));
  await page.waitForSelector('#modalBox h2');
  check(/choked with Murk/.test(await page.textContent('#modalBox')), 'Cinderforge is sealed before the Frost Lens');
  await page.click('#dlgOk');

  // light the frost lens, walk to the '3', pass the seal
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.isles.lenses.frostbite = true;
    MM.engine.enterWorld();
    s.px = 32; s.py = 5;
  });
  await page.keyboard.press('ArrowUp'); // bump the '3' at (32,6)... approach from above
  await page.waitForTimeout(300);
  const sealed = await page.$('#modalBox .prob-text');
  if (!sealed) { // approach from the other side if the bump missed
    await page.evaluate(() => { const s = MM.engine.state; s.px = 32; s.py = 7; });
    await page.keyboard.press('ArrowUp');
  }
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForFunction(() => MM.engine.state.mapId === 'd16f0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/1-mine-head.png' });
  check(true, 'seal exam admits you to the Cinderforge Depths');
  check(await page.evaluate(() => MM.engine.state.monsters.some(m => m.behavior === 'thief')),
    'the Coal Thief is on shift');

  // cinder shards sting
  const spiked = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 5; s.py = 13;
    const before = s.hp;
    MM.engine.tryMove(1, 0); // onto the ^ at (6,13)
    return before - s.hp;
  });
  check(spiked === 2, 'cinder shards cost 2 HP');

  // floor 1: key -> locked stairs -> floor 2
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 2;
    MM.engine.tryMove(0, -1); // key at (2,1)
    return (s.isles.keys.d16 || 0) === 1;
  }), 'first key picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 5;
    MM.engine.tryMove(0, -1); // K at (21,4)
    return s.grid[4][21] === '.' && s.isles.keys.d16 === 0;
  }), 'first key opens the stairs shaft');
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 23; s.py = 2;
    MM.engine.tryMove(0, -1); // > at (23,1)
  });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd16f1');
  check(true, 'stairs descend to the forge');

  // floor 2: second key -> caged stairs; lever -> gates -> chute room
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 4;
    MM.engine.tryMove(0, 1); // key at (2,5)
    return (s.isles.keys.d16 || 0) === 1;
  }), 'second key picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 12; s.py = 7;
    MM.engine.tryMove(0, -1); // K at (12,6), the stairs cage
    return s.grid[6][12] === '.' && s.isles.keys.d16 === 0;
  }), 'second key opens the stairs cage');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 6;
    MM.engine.tryMove(1, 0); // pull the L at (22,6)
    return s.grid[3][21] === '.' && s.grid[3][22] === '.';
  }), 'the lever opens the chute-room gates');

  // the one-way drop: chute at (22,1) lands at (22,1) on the foundry floor
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 22; s.py = 2;
    MM.engine.tryMove(0, -1); // step onto the v
  });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd16f2');
  check(await page.evaluate(() => MM.engine.state.px === 22 && MM.engine.state.py === 1),
    'the chute drops you to the same spot one floor down');
  check(await page.evaluate(() => MM.engine.state.grid[2][22] === '*'),
    'a thank-you chest waits by the chute landing');

  // the Foreman -> the Cinder Lens
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    s.px = b.x; s.py = b.y + 1;
    MM.engine.startCombat(b);
  });
  await battleToVictory(page, 40);
  await page.screenshot({ path: SHOTS + '/2-cinder-lens.png' });
  check(await page.evaluate(() => MM.engine.state.isles.lenses.cinderforge === true),
    'the Foreman yields the Cinder Lens');

  // out via the stairs (the long way home), and the island transformed
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 1; MM.engine.tryMove(-1, 0); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd16f1');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 2; s.py = 1; MM.engine.tryMove(-1, 0); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd16f0');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 11; MM.engine.tryMove(0, 1); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');
  check(await page.evaluate(() => MM.engine.state.grid[4][8] === '.'),
    'the last w-fog at the lighthouse melts');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 7; s.py = 2; });
  await page.keyboard.press('ArrowUp'); // approach H via the open neck
  await page.waitForTimeout(300);
  let hOpen = await page.$('#modalBox .prob-text');
  if (!hOpen) {
    await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 2; });
    await page.keyboard.press('ArrowUp');
  }
  // with all three lenses lit, 'H' now opens the Great Lighthouse's seal
  // exam directly (Wave 1) — full traversal is drive-lighthouse.js's job
  await page.waitForSelector('#modalBox .prob-text');
  check(/Great Lighthouse/.test(await page.textContent('#modalBox')),
    'the lighthouse admits entry once all three lenses shine');
  await page.click('#leaveBtn');
  check(await page.evaluate(() => {
    MM.engine.save(); MM.engine.load('CinderKid');
    const L = MM.engine.state.isles.lenses;
    return L.tidepool && L.frostbite && L.cinderforge;
  }), 'all three lenses persist through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
