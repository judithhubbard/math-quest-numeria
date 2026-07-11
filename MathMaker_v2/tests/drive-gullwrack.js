// Drive MathMaker v2 Wave 6: Gullwrack Harbor (Level 5, the Builder's Guild)
// — the geometry topic's SVG diagrams, the shop rework (tabs, compare-to-
// equipped, always-visible bulk potions live elsewhere in drive-equip.js/
// drive-qol.js/drive-isles.js/drive-halls.js), the fifth sail destination
// gated on spireDone, the slab-tiling repair-site mechanic (blueprint
// plaque, sokoban pushes, reset lever, town rebuilt + Mason's Charm), and
// the Sunken Breakwater (2 floors, a free shortcut, The Undertow).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-gullwrack');

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
  for (let i = 0; i < 50; i++) {
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

async function dismissDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) return;
    await ok.click();
    await page.waitForTimeout(250);
  }
}

// bump one tile in a direction; equivalent to a keypress but coordinate-driven
async function goto(page, x, y) { await page.evaluate(({ x, y }) => { const s = MM.engine.state; s.px = x; s.py = y; }, { x, y }); }
async function bump(page, key) { await page.keyboard.press(key); await page.waitForTimeout(150); }

// solve a repair site's blueprint plaque + push every slab along pushDir
const DELTA = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
const KEY = { E: 'ArrowRight', W: 'ArrowLeft', N: 'ArrowUp', S: 'ArrowDown' };
async function solveSite(page, mapId, site) {
  const [dx, dy] = DELTA[site.pushDir];
  const key = KEY[site.pushDir];
  const already = await page.evaluate((k) => {
    const st = MM.engine.state.repairSites && MM.engine.state.repairSites[k];
    return st && st.plaqueSolved;
  }, `${mapId}:${site.id}`);
  if (!already) {
    await goto(page, site.plaque.x - dx, site.plaque.y - dy);
    await bump(page, key);
    await page.waitForSelector('#modalBox .prob-text');
    await solveModalProblem(page);
    await page.waitForTimeout(150);
  }
  for (const pair of site.pairs) {
    await goto(page, pair.slab.x - dx, pair.slab.y - dy);
    await bump(page, key);
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
  await page.fill('#newName', 'Mason');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // ---------- geometry SVGs (screenshot t1/t2/t3 + quick) ----------
  const svgSamples = await page.evaluate(() => {
    let rect, lshape, box;
    for (let i = 0; i < 200 && (!rect || !lshape); i++) {
      const p = MM.problems.generate('geometry', i % 2 === 0 ? 1 : 2);
      if (!rect && p.tier === 1) rect = p;
      if (!lshape && /L-shaped/.test(p.text)) lshape = p;
    }
    for (let i = 0; i < 200 && !box; i++) {
      const p = MM.problems.generate('geometry', 3);
      if (/box is/.test(p.text)) box = p;
    }
    const quick = MM.problems.generateQuick('geometry');
    return { rect, lshape, box, quick };
  });
  check(svgSamples.rect && svgSamples.rect.svg && svgSamples.rect.svg.includes('<svg'), 't1 rectangle renders an inline SVG');
  check(svgSamples.lshape && svgSamples.lshape.svg && svgSamples.lshape.svg.includes('<svg'), 't2 L-shape renders an inline SVG (with a decomposition line)');
  check(svgSamples.box && svgSamples.box.svg && svgSamples.box.svg.includes('<svg'), 't3 volume box renders an inline SVG');
  check(svgSamples.quick && svgSamples.quick.svg && svgSamples.quick.svg.includes('<svg'), 'QUICK geometry problems render an SVG too');
  await page.evaluate((s) => {
    document.body.insertAdjacentHTML('beforeend',
      `<div id="svgPreview" style="position:fixed;top:0;left:0;background:#1a1533;padding:10px;z-index:9999;display:flex;gap:10px">${s.rect.svg}${s.lshape.svg}${s.box.svg}</div>`);
  }, svgSamples);
  await page.screenshot({ path: SHOTS + '/1-geometry-svgs.png' });
  await page.evaluate(() => document.getElementById('svgPreview').remove());

  // ---------- sail gate: locked before spireDone ----------
  await page.evaluate(() => { MM.engine.state.continent = 'horologe'; MM.engine.enterWorld(); });
  const lockedBefore = await page.evaluate(() => {
    let seen = false;
    const orig = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (title, body, choices) => { seen = choices.some(c => /Gullwrack/.test(c.label)); };
    MM.engine.horologeDock();
    MM.ui.dialogChoices = orig;
    return seen;
  });
  check(!lockedBefore, 'Gullwrack is NOT offered from Horologe before spireDone');

  await page.evaluate(() => { MM.engine.state.isles.spireDone = true; });
  const unlockedAfter = await page.evaluate(() => {
    let seen = false;
    const orig = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (title, body, choices) => { seen = choices.some(c => /Gullwrack/.test(c.label)); };
    MM.engine.horologeDock();
    MM.ui.dialogChoices = orig;
    return seen;
  });
  check(unlockedAfter, 'Gullwrack IS offered from Horologe once spireDone');

  // ---------- sail there for real, land in a full town ----------
  await page.evaluate(() => { MM.engine.state.gold = 500; MM.engine.state.hp = MM.engine.state.maxhp = 999; MM.engine.state.seenBattleHelp = true; });
  await page.evaluate(() => MM.engine.sail('gullwrack'));
  await page.waitForFunction(() => MM.engine.state.mapId === 'gullwrack', { timeout: 10000 });
  check(true, 'arrived at Gullwrack Harbor');
  await page.screenshot({ path: SHOTS + '/2-gullwrack-town.png' });

  // ---------- Guildmistress Maren, Sylvia, and Percy story seeds ----------
  const marenLine = await page.evaluate(() => MM.data.NPCS.y.talk(MM.engine.state));
  check(/blueprint plaque/.test(marenLine), 'Maren explains the repair-site mechanic before any site is done');
  const sylviaBefore = await page.evaluate(() => { const s = MM.engine.state; return MM.data.NPCS.g.talk(s); });
  check(!/mortar is arithmetic/.test(sylviaBefore), 'Sylvia\'s castle-stones line is not shown before breakwaterDone');
  await page.evaluate(() => { MM.engine.state.isles.breakwaterDone = true; });
  const sylviaAfter = await page.evaluate(() => MM.data.NPCS.g.talk(MM.engine.state));
  check(/mortar is arithmetic/.test(sylviaAfter), 'Sylvia\'s new castle-stones line appears once breakwaterDone');
  const percyAfter = await page.evaluate(() => MM.data.NPCS.p.talk(MM.engine.state));
  check(/curl at the edges/.test(percyAfter), 'Percy\'s Wave 7 spiral-seed line appears once breakwaterDone');
  await page.evaluate(() => { MM.engine.state.isles.breakwaterDone = false; }); // restore for the real boss-fight check later

  // ---------- pier site: plaque -> push -> complete ----------
  const pier = await page.evaluate(() => MM.maps.REPAIR_SITES.gullwrack.find(s => s.id === 'pier'));
  await solveSite(page, 'gullwrack', pier);
  await page.waitForTimeout(200);
  const pierDone = await page.evaluate(() => MM.engine.state.repairSites['gullwrack:pier']);
  check(pierDone && pierDone.done, 'the pier repair site completes after solving + pushing both slabs');
  check((await page.evaluate(() => MM.engine.state.gold)) > 500, 'completing a town site pays out gold');
  await page.screenshot({ path: SHOTS + '/3-pier-done.png' });

  // persists through save/load
  await page.evaluate(() => { MM.engine.save(); MM.engine.load('Mason'); });
  const pierAfterLoad = await page.evaluate(() => MM.engine.state.repairSites['gullwrack:pier']);
  check(pierAfterLoad && pierAfterLoad.done, 'the pier site stays done through save/load');

  // persists through re-entry (leave the map, come back)
  await page.evaluate(() => { MM.engine.state.continent = 'horologe'; MM.engine.enterWorld(); });
  await page.evaluate(() => { MM.engine.state.continent = 'gullwrack'; MM.engine.enterWorld(); });
  check(await page.evaluate(() => MM.engine.state.grid[6][6] === '.' && MM.engine.state.grid[6][7] === '.'),
    'the pier site\'s footprint stays finished floor on re-entry (no stale slab/broken glyphs)');

  // ---------- reset lever: mangle bakery, then rescue it ----------
  const bakery = await page.evaluate(() => MM.maps.REPAIR_SITES.gullwrack.find(s => s.id === 'bakery'));
  await goto(page, bakery.plaque.x, bakery.plaque.y - 1);
  await bump(page, 'ArrowDown');
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(150);
  // push slab 1 sideways into a neutral cell (NOT its target) — a "wedge"
  await goto(page, bakery.pairs[0].slab.x - 1, bakery.pairs[0].slab.y);
  await bump(page, 'ArrowRight');
  const wedged = await page.evaluate(() => MM.engine.state.repairSites['gullwrack:bakery']);
  check(!wedged.filled[0] && !wedged.done, 'a sideways push wedges the slab instead of solving the site');
  await goto(page, bakery.lever.x - 1, bakery.lever.y);
  await bump(page, 'ArrowRight');
  const afterReset = await page.evaluate(() => MM.engine.state.repairSites['gullwrack:bakery']);
  const bakeryTmpl = bakery;
  check(JSON.stringify(afterReset.slabPos) === JSON.stringify(bakeryTmpl.pairs.map(p => p.slab)),
    'the reset lever restores every live slab to its exact start position');
  check(!afterReset.filled.some(Boolean), 'reset never marks anything filled');

  // now actually solve bakery, seawall, and shed for the town-rebuilt payoff
  await solveSite(page, 'gullwrack', bakery);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => MM.engine.state.repairSites['gullwrack:bakery'].done)), 'bakery site completes');

  const seawall = await page.evaluate(() => MM.maps.REPAIR_SITES.gullwrack.find(s => s.id === 'seawall'));
  await solveSite(page, 'gullwrack', seawall);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => MM.engine.state.repairSites['gullwrack:seawall'].done)), 'seawall site completes');

  const shed = await page.evaluate(() => MM.maps.REPAIR_SITES.gullwrack.find(s => s.id === 'shed'));
  await solveSite(page, 'gullwrack', shed);
  await page.waitForTimeout(200);
  const shedSite = await page.evaluate(() => MM.engine.state.repairSites['gullwrack:shed']);
  check(shedSite && shedSite.done, 'shed site completes');

  check(await page.evaluate(() => MM.engine.state.isles.gullwrackRebuilt), 'all 4 town sites done -> gullwrackRebuilt flag set');
  check(await page.evaluate(() => MM.engine.state.items.charms.includes('mason')), 'the Mason\'s Charm is awarded');
  check((await page.evaluate(() => MM.engine.totalDef())) >= 1, 'the Mason\'s Charm grants +1 block once worn');
  await page.screenshot({ path: SHOTS + '/4-town-rebuilt.png' });

  // ---------- shop compare-to-equipped (carry-over rework, spot-check) ----------
  await goto(page, 10, 6);
  await bump(page, 'ArrowUp');
  await page.waitForSelector('.shop-row');
  const compareText = await page.textContent('#modalBox');
  check(/you:/.test(compareText), 'the shop shows a "you: N ▲/▼" compare-to-equipped label on gear rows');
  await page.click('#shopClose');

  // ---------- the Sunken Breakwater: 2 floors, the shortcut, the boss ----------
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 20; s.unsealed = s.unsealed || {}; s.unsealed.d21 = true;
    // top-tier gear so a 119 HP boss dies within winBattle's round budget
    // (mirrors drive-halls.js's own boss-fight setup)
    for (const slot of ['weapon', 'body', 'helmet', 'boots', 'ring']) s.gear[slot] = s.gear[slot] || [];
    s.gear.weapon.push('tidal'); s.gear.body.push('pearl'); s.gear.helmet.push('coral');
    s.gear.boots.push('wavewalkers'); s.gear.ring.push('guard');
    s.equipped = { ...s.equipped, weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
  });
  await goto(page, 7, 12);
  await bump(page, 'ArrowLeft');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd21f0', { timeout: 10000 });
  check(true, 'entered the Sunken Breakwater (dungeon 21)');

  const shortcut = await page.evaluate(() => MM.maps.REPAIR_SITES.d21f0[0]);
  await solveSite(page, 'd21f0', shortcut);
  await page.waitForTimeout(200);
  check(await page.evaluate(() => MM.engine.state.grid[6][13] === '.' && MM.engine.state.grid[7][13] === '.'),
    'the dungeon shortcut clears the rubble wall once solved');

  await page.evaluate(() => MM.engine.changeFloor(1));
  await page.waitForFunction(() => MM.engine.state.mapId === 'd21f1');
  check(true, 'floor 2 reached (26x13, the flooded chamber)');
  await page.evaluate(() => { const s = MM.engine.state; s.hp = s.maxhp = 999; }); // survive the boss regardless of level/HP drift so far
  const bossPos = await page.evaluate(() => { const m = MM.engine.state.monsters.find(m => m.boss); return { x: m.x, y: m.y }; });
  await goto(page, bossPos.x, bossPos.y - 1);
  await bump(page, 'ArrowDown');
  await winBattle(page);
  check(await page.evaluate(() => MM.engine.state.isles.breakwaterDone), 'The Undertow is beaten — breakwaterDone set');
  check(await page.evaluate(() => !!MM.engine.state.bossesDefeated['d21f1']), 'boss recorded in bossesDefeated');

  // ---------- parent switch OFF removes geometry everywhere ----------
  await page.evaluate(() => {
    MM.engine.state.parent = { pin: null, topics: { geometry: false } };
    MM.engine.save();
  });
  const leaks = await page.evaluate(() => {
    let n = 0;
    for (let i = 0; i < 500; i++) {
      const p = MM.mastery.pickArenaProblem(MM.engine.state);
      if (p.skill === 'geometry') n++;
      const g = MM.mastery.pickBreakwaterProblem(MM.engine.state);
      if (g.skill === 'geometry') n++;
    }
    return n;
  });
  check(leaks === 0, `parent switch OFF: geometry never leaks (0/1000 draws, got ${leaks})`);

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
