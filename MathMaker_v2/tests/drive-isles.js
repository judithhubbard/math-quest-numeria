// Drive MathMaker v2 Level 2 (Phases A+B): pier gating, Miscount's egg, the
// hatching + naming, the Isles overworld with Murk fog, Port Brightwater
// (Callie, Percy, the Brass Compass), mystery potions, pet feeding/following/
// secret-sense, the Tidepool Grotto (behaviors, terrain, keys, floors), the
// boss lighting the Tide Lens, fog clearing, and sailing home & back.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-isles');

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

async function solveModalProblem(page) { // seals / shop quizzes
  const info = await page.evaluate(`(${canonicalize})(MM.ui.current)`);
  if (info.kind === 'choice') await page.click(`#modalBox .choice >> nth=${info.idx}`);
  else {
    await page.fill('#modalBox #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
}

// shop rework (carry-over): click the right tab before any .shop-buy/.shop-sell —
// the shop stays on whatever tab was last picked, defaulting to Gear.
async function shopTab(page, name) {
  await page.click(`.shop-tab-btn[data-tab="${name}"]`);
  await page.waitForSelector(`.shop-tab-btn.active[data-tab="${name}"]`);
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

async function dismissDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) return;
    await ok.click();
    await page.waitForTimeout(250);
  }
}

async function battleToVictory(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    if (await page.$('#victOk')) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    await answerBattle(page);
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 20000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  await page.waitForTimeout(300);
  await dismissDialogs(page);
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
  await page.fill('#newName', 'IsleKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // the ship doesn't stop for a brand-new hero
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 7; });
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#modalBox h2');
  check(/tacks past without stopping/.test(await page.textContent('#modalBox')), 'pier is gated before task 13');
  await page.click('#dlgOk');

  // fabricate a game-complete, well-geared hero (story difficulty for speed)
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true;
    s.gear = { weapon: ['stick', 'star'], body: ['clothes', 'dragon'], helmet: ['winged'], boots: ['dragonhide'], ring: ['guard'] };
    s.equipped = { weapon: 'star', body: 'dragon', helmet: 'winged', boots: 'dragonhide', ring: 'guard' };
    s.level = 15; s.maxhp = 94; s.hp = 94; s.gold = 100; s.difficulty = 'story';
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.save();
  });

  // sail: captain -> Miscount's eggs -> the hatching -> Port Brightwater
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#modalBox h2');
  await page.click('#modalBox .btnrow button.primary'); // Sail
  await page.waitForSelector('#modalBox h2');
  check(/Miscount/.test(await page.textContent('#modalBox h2')), 'Miscount arrives with the eggs');
  await page.click('#modalBox .btnrow button >> nth=0'); // the blue egg
  await page.waitForSelector('#petName');
  await page.screenshot({ path: SHOTS + '/1-hatch.png' });
  await page.fill('#petName', 'Biscuit');
  await page.click('#petOk');
  await page.waitForSelector('#modalBox h2');
  await page.click('#dlgOk'); // welcome dialog
  check(await page.evaluate(() => MM.engine.state.mapId === 'isles'), 'arrived on the Isles overworld');
  check(await page.evaluate(() => {
    const p = MM.engine.state.isles.pet;
    return p && p.name === 'Biscuit' && p.species === 'blue' && p.stage === 0;
  }), 'Biscuit the Compass Pup hatched');
  check(await page.evaluate(() => MM.engine.state.grid[9][10] === 'u'), 'Murk fog bank blocks the north');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/2-isles.png' });

  // the townsfolk
  await page.evaluate(() => { const s = MM.engine.state; s.px = 15; s.py = 13; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  check(/Tide Lens/.test(await page.textContent('#modalBox')), 'Keeper Callie frames the quest');
  await page.click('#dlgOk');
  check(await page.evaluate(() => MM.engine.state.isles.metCallie === true), 'meeting Callie is remembered');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 12; s.py = 14; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  check(/gulls/.test(await page.textContent('#modalBox')), 'Old Salt Percy drops hints');
  await page.click('#dlgOk');

  // the Brass Compass: isle stock only; buy a mystery potion and a treat
  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 13; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  const shopBody = await page.textContent('#modalBox');
  check(/Brass Compass/.test(shopBody), 'Brass Compass opens');
  check(/Tidal Blade/.test(shopBody) && /Pearl Mail/.test(shopBody), 'isle-tier gear on the shelves');
  check(!/Steel Sword/.test(shopBody), 'mainland stock stays on the mainland');
  await page.screenshot({ path: SHOTS + '/3-brass-compass.png' });
  await shopTab(page, 'supplies');
  await page.click('button[data-kind="mystery"]');
  await page.waitForSelector('#modalBox .prob-text'); // money quiz
  await solveModalProblem(page);
  await page.waitForSelector('#modalBox h2'); // shop reopens
  await page.click('button[data-kind="treat"]');
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForSelector('#modalBox h2');
  await page.click('#shopClose');
  await dismissDialogs(page);
  check(await page.evaluate(() => MM.engine.state.items.mystery === 1 && MM.engine.state.items.treats === 1),
    'mystery potion and pet treat purchased');

  // feed the pet, drink the mystery (the bag reopens itself after each action)
  await page.keyboard.press('b');
  await page.waitForSelector('#modalBox h2');
  check(/Biscuit/.test(await page.textContent('#modalBox')), 'pet panel lives in the bag');
  await page.click('#feedPet');
  await page.waitForSelector('#drinkMystery');
  check(await page.evaluate(() => MM.engine.state.isles.pet.fed === 1 && MM.engine.state.items.treats === 0),
    'feeding consumes a treat');
  await page.click('#drinkMystery');
  await page.waitForSelector('#bagClose');
  check(await page.evaluate(() => MM.engine.state.items.mystery === 0), 'mystery potion drunk (something happened)');
  await page.click('#bagClose');
  await dismissDialogs(page);

  // the pet follows one tile behind
  const follow = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 17; s.py = 15;
    MM.engine.tryMove(1, 0);
    const p = MM.engine.petPos;
    return p.x === 17 && p.y === 15 && s.px === 18;
  });
  check(follow, 'pet follows one tile behind');

  // into the grotto (seal exam on first entry)
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 11; });
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForFunction(() => MM.engine.state.mapId === 'd14f0');

  const roster = await page.evaluate(() => MM.engine.state.monsters.map(m => m.behavior));
  check(roster.includes('guard') && roster.includes('thief') && roster.includes('wander'),
    `spawned behaviors: ${JSON.stringify([...new Set(roster)])}`);

  // guard stays put
  const guardMoved = await page.evaluate(() => {
    const s = MM.engine.state;
    const g = s.monsters.find(m => m.behavior === 'guard');
    s.px = 10; s.py = 10;
    const x0 = g.x, y0 = g.y;
    for (let i = 0; i < 6; i++) MM.engine.monsterTurn();
    return g.x !== x0 || g.y !== y0;
  });
  check(!guardMoved, 'guard never leaves its post');

  // thief: steal, flee, catch, interest
  const theft = await page.evaluate(() => {
    const s = MM.engine.state;
    const t = s.monsters.find(m => m.behavior === 'thief');
    s.px = 8; s.py = 10; s.gold = 60;
    t.x = 9; t.y = 10; t.stun = 0;
    MM.engine.monsterTurn();
    const r = { gold: s.gold, stolen: t.stolen };
    MM.engine.monsterTurn();
    r.dist = Math.abs(t.x - s.px) + Math.abs(t.y - s.py);
    return r;
  });
  check(theft.stolen > 0 && theft.gold === 60 - theft.stolen, `thief steals gold (${theft.stolen})`);
  check(theft.dist > 1, `laden thief flees (now ${theft.dist} away)`);
  const goldPostSteal = 60 - theft.stolen;
  await page.evaluate(() => {
    const t = MM.engine.state.monsters.find(m => m.behavior === 'thief');
    MM.engine.startCombat(t);
  });
  await battleToVictory(page, 24);
  check(await page.evaluate(() => MM.engine.state.gold) >= goldPostSteal + Math.ceil(theft.stolen * 1.5),
    'caught thief pays back with interest');

  // terrain: pool, urchins, slide, pad
  const swam = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 11; s.py = 10;
    const before = s.stamina;
    MM.engine.tryMove(0, 1);
    return before - s.stamina;
  });
  check(swam >= 2, `tide pool tires you (-${swam} stamina)`);
  const spiked = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 9; s.py = 6;
    const before = s.hp;
    MM.engine.tryMove(1, 0);
    return before - s.hp;
  });
  check(spiked === 2, 'urchins cost 2 HP');
  const slid = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 18; s.py = 14;
    MM.engine.tryMove(1, 0);
    return { x: s.px, y: s.py };
  });
  check(slid.x === 22 && slid.y === 14, `slide carries you across (landed ${slid.x},${slid.y})`);
  const padded = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 20; s.py = 12;
    MM.engine.tryMove(0, -1);
    return { x: s.px, y: s.py };
  });
  check(padded.x === 1 && padded.y === 1, 'tide pad teleports to its twin');

  // the pet smells the secret before the kid finds it
  const alerted = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 20; s.py = 7;
    MM.engine.tryMove(1, 0); // step to (21,7), one tile from the cracked wall
    return MM.engine.petAlert;
  });
  check(alerted, 'pet senses the secret wall (❗)');
  const secret = await page.evaluate(() => {
    const s = MM.engine.state;
    MM.engine.tryMove(1, 0); // bump the % at (22,7)
    return s.grid[7][22] === '.' && !!s.opened['d14f0:22,7'];
  });
  check(secret, 'secret wall opens and is remembered');

  // key -> lock -> stairs -> lever -> boss -> lens
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 3; s.py = 8;
    MM.engine.tryMove(-1, 0);
    return s.isles.keys.d14 === 1;
  }), 'key picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 6;
    MM.engine.tryMove(0, -1);
    return s.grid[5][21] === '.' && s.isles.keys.d14 === 0;
  }), 'key opens the locked door');
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 2;
    MM.engine.tryMove(0, -1);
    MM.engine.tryMove(1, 0);
  });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd14f1');
  check(await page.evaluate(() => MM.engine.state.px === 1 && MM.engine.state.py === 1),
    'stairs descend to floor 2');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 22; s.py = 4;
    MM.engine.tryMove(1, 0);
    return [s.grid[2][18], s.grid[2][19], s.grid[2][20]].every(t => t === '.');
  }), 'lever opens the gates');
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    s.px = b.x; s.py = b.y + 1;
    MM.engine.startCombat(b);
  });
  await battleToVictory(page, 40);
  check(await page.evaluate(() => MM.engine.state.isles.lenses.tidepool === true),
    'boss defeat lights the Tide Lens');

  // out: stairs up, exit to the ISLES (not the mainland), fog receded
  await page.evaluate(() => { const s = MM.engine.state; s.px = 2; s.py = 1; MM.engine.tryMove(-1, 0); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd14f0');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 13; MM.engine.tryMove(0, -1); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');
  check(await page.evaluate(() => MM.engine.state.px === 5 && MM.engine.state.py === 11),
    'exiting the grotto returns you beside its entrance, not the dock');
  check(await page.evaluate(() => MM.engine.state.grid[9][10] === '.'), 'Murk fog receded with the lens');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 29; s.py = 4; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox .prob-text'); // Frostbite's seal exam
  check(/Frostbite Hollow/.test(await page.textContent('#modalBox')), 'northern pass opens Frostbite Hollow');
  await page.click('#leaveBtn');
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');

  // sail home, then back (no second egg), and survive save/load
  await page.evaluate(() => { const s = MM.engine.state; s.px = 14; s.py = 15; });
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('#modalBox h2');
  await page.click('#modalBox .btnrow button.primary'); // sail home
  await page.waitForFunction(() => MM.engine.state.mapId === 'world');
  check(true, 'sailed home to Numeria');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 7; });
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#modalBox h2');
  check(/burns bright/.test(await page.textContent('#modalBox')), 'captain celebrates the lit lens');
  await page.click('#modalBox .btnrow button.primary'); // sail (no egg scene this time)
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');
  check(await page.evaluate(() => !document.getElementById('petName')), 'no second egg ceremony');
  check(await page.evaluate(() => {
    MM.engine.save();
    MM.engine.load('IsleKid');
    const s = MM.engine.state;
    return s.mapId === 'isles' && s.isles.pet.name === 'Biscuit' && s.isles.lenses.tidepool;
  }), 'continent, pet, and lens persist through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
