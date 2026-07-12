// Drive MathMaker v2 Wave 1.5 (EXPANSION_PLAN.md §1.5): bulk potion buying
// (one money problem per transaction, thresholds gate the ×5/×10 buttons),
// the door-audit fix in dungeon 2 (the D at (14,10) now guards a chest),
// defeated monsters staying gone for the real-world day, and the Hearthmoss
// Charm healing slowly as you walk.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-qol');

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

// shop rework (carry-over): click the right tab before any .shop-buy/.shop-sell —
// the shop stays on whatever tab was last picked, defaulting to Gear.
async function shopTab(page, name) {
  await page.click(`.shop-tab-btn[data-tab="${name}"]`);
  await page.waitForSelector(`.shop-tab-btn.active[data-tab="${name}"]`);
}

// walk the player back and forth between two open overworld tiles — enough
// real tryMove() calls to rack up step count without ever hitting a wall
async function walkSteps(page, n) {
  await page.evaluate((n) => {
    const s = MM.engine.state;
    for (let i = 0; i < n; i++) MM.engine.tryMove(i % 2 === 0 ? 1 : -1, 0);
  }, n);
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
  await page.fill('#newName', 'QolKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const s = MM.engine.state;
    s.gold = 1000; s.taskIndex = 1;
    MM.engine.save();
  });

  // ---------- carry-over shop rework: bulk potions always visible ----------
  await page.keyboard.press('s'); // 's' isn't bound; open the shop via engine directly instead
  await page.evaluate(() => MM.ui.openShop());
  await page.waitForSelector('#modalBox h2');
  await shopTab(page, 'supplies');
  let bulkBtns = await page.evaluate(() => [...document.querySelectorAll('[data-kind="potion"]')].map(b => b.dataset.qty));
  check(bulkBtns.join(',') === '1,5,10', `×5/×10 always render, even before any lifetime purchases (got qtys: ${bulkBtns.join(',')})`);
  let bulkDisabled = await page.evaluate(() => [...document.querySelectorAll('[data-kind="potion"]')].map(b => b.disabled));
  check(bulkDisabled.every(d => d === false), 'with plenty of gold, none of the potion buttons are disabled');
  const quipBefore = await page.evaluate(() => document.getElementById('log').textContent.includes('crate is five potions'));
  check(!quipBefore, 'the bulk-buy quip has not fired yet (no bulk purchase made)');
  await page.click('#shopClose');

  // short on gold: the buttons stay visible, just disabled
  await page.evaluate(() => { MM.engine.state.gold = 5; MM.ui.refresh(); });
  await page.evaluate(() => MM.ui.openShop());
  await page.waitForSelector('#modalBox h2');
  await shopTab(page, 'supplies');
  bulkDisabled = await page.evaluate(() => [...document.querySelectorAll('[data-kind="potion"]')].map(b => b.disabled));
  check(bulkDisabled.every(d => d === true), 'short on gold: ×1/×5/×10 are all disabled, not hidden');
  await page.screenshot({ path: SHOTS + '/1-bulk-buttons.png' });
  await page.click('#shopClose');

  await page.evaluate(() => { MM.engine.state.gold = 1000; MM.ui.refresh(); });
  await page.evaluate(() => MM.ui.openShop());
  await page.waitForSelector('#modalBox h2');
  await shopTab(page, 'supplies');

  // buying ×5 is ONE money problem, costs exactly 5×price (minus discount),
  // adds exactly 5 potions, and fires the one-time quip on completion
  const before = await page.evaluate(() => ({ gold: MM.engine.state.gold, potions: MM.engine.state.potions, bought: MM.engine.state.potionsBought }));
  await page.click('[data-kind="potion"][data-qty="5"]');
  await page.waitForSelector('#modalBox .prob-text');
  const problemText = await page.textContent('#modalBox .prob-text');
  check(/5 Healing Potions? at/.test(problemText) || /5.*10 gold each/.test(problemText), `bulk problem mentions the quantity: "${problemText.trim()}"`);
  await solveModalProblem(page); // submits the answer AND clicks the resulting "Continue" (which re-opens the shop)
  await page.waitForSelector('#modalBox h2');
  const after = await page.evaluate(() => ({ gold: MM.engine.state.gold, potions: MM.engine.state.potions, bought: MM.engine.state.potionsBought }));
  const price = 10, qty = 5, discount = Math.floor(price * qty * 0.1), paid = price * qty - discount;
  check(after.potions === before.potions + 5, `+5 potions in one purchase (before ${before.potions}, after ${after.potions})`);
  check(after.gold === before.gold - paid, `gold down by exactly ${paid} (5×${price} minus a correct-answer discount)`);
  check(after.bought === before.bought + 5, 'potionsBought tracks the bulk purchase');
  const quipLogged = await page.evaluate(() => document.getElementById('log').textContent.includes('crate is five potions'));
  check(quipLogged, 'the one-time bulk-buy quip fires on completing the first bulk purchase');
  await page.click('#shopClose');

  // ---------- 1.5b: the door-audit fix (dungeon 2's guarded chest) ----------
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 2; s.unsealed = { d2: true }; s.seenBattleHelp = true; s.seenCeremony = true;
    MM.engine.enterDungeon(2);
  });
  check(await page.evaluate(() => MM.engine.state.grid[11][14] === '*'),
    "dungeon 2's fixed door: (14,11) is now a chest, not a wall");
  await page.evaluate(() => { const s = MM.engine.state; s.px = 14; s.py = 9; MM.engine.tryMove(0, 1); }); // bump the D at (14,10)
  await page.waitForSelector('#modalBox .prob-text'); // math doors ask a problem before opening
  await solveModalProblem(page);
  check(await page.evaluate(() => MM.engine.state.grid[10][14] === '.'), 'the door at (14,10) opens after solving its problem');

  // ---------- 1.5c: defeated monsters stay gone for the day ----------
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 1; s.py = 1; s.hp = s.maxhp;
    MM.engine.enterDungeon(1);
  });
  const homes = await page.evaluate(() => MM.engine.state.monsters.filter(m => !m.boss).slice(0, 2).map(m => ({ x: m.x, y: m.y })));
  for (const h of homes) {
    await page.evaluate((h) => {
      const s = MM.engine.state;
      const m = s.monsters.find(mm => mm.x === h.x && mm.y === h.y && mm.hp > 0);
      if (m) { m.hp = 0; MM.engine.recordKill(m); }
    }, h);
  }
  check(await page.evaluate((homes) => {
    const s = MM.engine.state;
    return homes.every(h => s.defeatedAt[`d1:${h.x},${h.y}`] === new Date().toISOString().slice(0, 10));
  }, homes), 'each kill stamps defeatedAt with today\'s date');

  await page.evaluate(() => { MM.engine.exitDungeon(); });
  await page.evaluate(() => { const s = MM.engine.state; s.px = 1; s.py = 1; MM.engine.enterDungeon(1); });
  check(await page.evaluate((homes) => {
    const s = MM.engine.state;
    return homes.every(h => !s.monsters.some(m => m.x === h.x && m.y === h.y && m.hp > 0));
  }, homes), 'the two beaten monsters do not respawn on same-day re-entry');
  check(await page.evaluate(() => document.getElementById('log').textContent.includes('haven\'t crept back yet')),
    'the quiet-halls line logs when monsters are skipped');
  await page.screenshot({ path: SHOTS + '/2-quiet-halls.png' });

  // rewrite to yesterday -> they're back
  await page.evaluate(() => {
    const s = MM.engine.state;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(s.defeatedAt)) s.defeatedAt[k] = yesterday;
    MM.engine.exitDungeon();
  });
  await page.evaluate(() => { const s = MM.engine.state; s.px = 1; s.py = 1; MM.engine.enterDungeon(1); });
  check(await page.evaluate((homes) => {
    const s = MM.engine.state;
    return homes.every(h => s.monsters.some(m => m.x === h.x && m.y === h.y && m.hp > 0));
  }, homes), 'a new real-world day brings the monsters back');
  await page.evaluate(() => MM.engine.exitDungeon());

  // ---------- 1.5d: the Hearthmoss Charm ----------
  // land back on a known-safe overworld tile (earlier steps deliberately
  // stomped state.worldPos with (1,1), off the walkable map) before walking
  await page.evaluate(() => {
    const s = MM.engine.state;
    const p = MM.maps.find(s.grid, 'P')[0];
    s.px = p.x; s.py = p.y;
    s.items.charms = ['hearthmoss'];
    s.charmsOn = ['hearthmoss'];
    s.hp = 50; s.maxhp = 100;
    s.hearthmossSteps = 0;
  });
  await walkSteps(page, 16);
  check(await page.evaluate(() => MM.engine.state.hp) === 52, 'worn Hearthmoss heals exactly +2 HP over 16 steps (8 steps/HP)');

  await page.evaluate(() => {
    const s = MM.engine.state;
    s.charmsOn = []; // take it off
    s.hp = 50; s.maxhp = 100;
    s.hearthmossSteps = 0;
  });
  await walkSteps(page, 16);
  check(await page.evaluate(() => MM.engine.state.hp) === 50, 'unworn Hearthmoss heals +0 over the same 16 steps');

  // ---------- save/load round-trip ----------
  // (load() prunes non-today defeatedAt entries by design — that's the daily
  // reset itself — so round-trip with TODAY's date, not a stale one)
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.potionsBought = 27;
    s.defeatedAt = { 'd1:2,3': MM.engine.todayStr() };
    MM.engine.save();
    MM.engine.load('QolKid');
    return MM.engine.state.potionsBought === 27 && MM.engine.state.defeatedAt['d1:2,3'] === MM.engine.todayStr();
  }), 'potionsBought and defeatedAt round-trip through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
