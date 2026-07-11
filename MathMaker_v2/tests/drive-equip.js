// Verify: equip system, gear selling, new slots, rings, damage rolls.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots6');

// shop rework (carry-over): click the right tab before any .shop-buy/.shop-sell —
// the shop stays on whatever tab was last picked, defaulting to Gear.
async function shopTab(page, name) {
  await page.click(`.shop-tab-btn[data-tab="${name}"]`);
  await page.waitForSelector(`.shop-tab-btn.active[data-tab="${name}"]`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Gearhead');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // --- sidebar shows a damage RANGE
  const atkText = await page.textContent('#statAtk');
  if (!/2–4|2-4/.test(atkText.replace('−','-'))) errors.push('sidebar range wrong: ' + atkText);

  // --- damage rolls stay within bounds
  const rolls = await page.evaluate(() => {
    const out = { strikes: [], hits: [] };
    const r = MM.engine.strikeRange();
    for (let i = 0; i < 300; i++) out.strikes.push(MM.engine.rollStrike());
    for (let i = 0; i < 300; i++) out.hits.push(MM.engine.rollMonsterHit(10));
    return { ...out, min: r.min, max: r.max, def: MM.engine.totalDef() };
  });
  const badStrike = rolls.strikes.filter(x => x < rolls.min || x > rolls.max);
  if (badStrike.length) errors.push('strike rolls out of range: ' + badStrike.slice(0,5));
  if (new Set(rolls.strikes).size < 2) errors.push('strike rolls have no variance');
  const hitLo = Math.max(1, Math.round(10 * 0.75) - rolls.def), hitHi = Math.max(1, Math.round(10 * 1.10) - rolls.def);
  if (rolls.hits.some(x => x < hitLo || x > hitHi)) errors.push('monster rolls out of range');

  // --- buy a Leather Cap at the shop -> auto-equips, block becomes 1
  await page.evaluate(() => { const s = MM.engine.state; s.gold = 500; s.px = 15; s.py = 7; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('.shop-row');
  await page.screenshot({ path: SHOTS + '/1-shop.png' });
  await page.click('button.shop-buy[data-kind="helmet"][data-id="cap"]');
  await page.waitForSelector('#probForm #answerInput');
  const expected = await page.evaluate(() => MM.engine.state.gold - 25);
  await page.fill('#probForm #answerInput', String(expected));
  await page.click('#probForm #submitBtn');
  await page.waitForSelector('.feedback .right');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForSelector('.shop-row');
  const def1 = await page.evaluate(() => MM.engine.totalDef());
  if (def1 !== 1) errors.push('cap did not auto-equip: def=' + def1);

  // --- buy a dagger (auto-equips over stick), then downgrade to stick via bag, sell dagger
  await page.click('button.shop-buy[data-kind="weapon"][data-id="dagger"]');
  await page.waitForSelector('#probForm #answerInput');
  await page.fill('#probForm #answerInput', '999999'); // wrong on purpose: full price path
  await page.click('#probForm #submitBtn');
  await page.waitForSelector('.feedback .wrong');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForSelector('.shop-row');
  await page.click('#shopClose');
  const w1 = await page.evaluate(() => MM.engine.state.equipped.weapon);
  if (w1 !== 'dagger') errors.push('dagger did not auto-equip: ' + w1);

  await page.click('#btnBag');
  await page.waitForSelector('[data-equip="weapon:stick"]');
  await page.screenshot({ path: SHOTS + '/2-bag-equip.png' });
  await page.click('[data-equip="weapon:stick"]');
  await page.waitForSelector('[data-equip="weapon:dagger"]');
  const w2 = await page.evaluate(() => MM.engine.state.equipped.weapon);
  if (w2 !== 'stick') errors.push('equip switch failed: ' + w2);
  await page.click('#bagClose');

  // dagger now unequipped -> sellable for half (20)
  await page.evaluate(() => { const s = MM.engine.state; s.px = 15; s.py = 7; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('.shop-row');
  await shopTab(page, 'sell');
  const sellBtn = await page.$('button.shop-sell[data-sellgear="weapon:dagger"]');
  if (!sellBtn) errors.push('dagger not in sell list');
  else {
    await sellBtn.click();
    await page.waitForSelector('#probForm #answerInput');
    const exp2 = await page.evaluate(() => MM.engine.state.gold + 20);
    await page.fill('#probForm #answerInput', String(exp2));
    await page.click('#probForm #submitBtn');
    await page.waitForSelector('.feedback .right');
    await page.screenshot({ path: SHOTS + '/3-sell-gear.png' });
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForSelector('.shop-tabs'); // reopens on Sell — may now be empty
    const owned = await page.evaluate(() => MM.engine.state.gear.weapon);
    if (owned.includes('dagger')) errors.push('dagger not removed after sale');
  }
  await page.click('#shopClose');

  // --- rings: vigor raises max stamina; focus halves streak on a miss
  const ringFx = await page.evaluate(() => {
    const s = MM.engine.state;
    s.gear.ring = ['vigor', 'focus'];
    MM.engine.equip('ring', 'vigor');
    const maxSt = s.maxStamina;
    MM.engine.equip('ring', 'focus');
    const maxStAfter = s.maxStamina;
    s.streak = 8;
    MM.engine.recordAnswer('addsub_facts', false);
    return { maxSt, maxStAfter, streakAfterMiss: s.streak };
  });
  if (ringFx.maxSt !== 130) errors.push('vigor max stamina wrong: ' + ringFx.maxSt);
  if (ringFx.maxStAfter !== 100) errors.push('unequipping vigor did not reset: ' + ringFx.maxStAfter);
  if (ringFx.streakAfterMiss !== 4) errors.push('focus ring streak halving wrong: ' + ringFx.streakAfterMiss);

  // --- migration: fake an old save shape, reload it
  const migrated = await page.evaluate(() => {
    const old = JSON.parse(localStorage.getItem('mathmaker2_save_Gearhead'));
    delete old.gear; delete old.equipped;
    old.weapon = 'sword'; old.armor = 'chain';
    localStorage.setItem('mathmaker2_save_MigTest', JSON.stringify({ ...old, name: 'MigTest' }));
    MM.engine.load('MigTest');
    const s = MM.engine.state;
    return { eq: s.equipped, owned: s.gear, def: MM.engine.totalDef() };
  });
  if (migrated.eq.weapon !== 'sword' || migrated.eq.body !== 'chain') errors.push('migration equip wrong: ' + JSON.stringify(migrated.eq));
  if (migrated.def !== 3) errors.push('migrated def wrong: ' + migrated.def);

  console.log('=== CHECKS ===\n' + (errors.length ? errors.join('\n') : 'all good'));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('DRIVER FAILED:', e.message); process.exit(2); });
