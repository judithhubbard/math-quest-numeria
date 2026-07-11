// Drive Wave 6.5: shop stress + blank-modal hardening. Hammers buy/sell
// cycles (tabs, bulk, double-clicks, Enter noise), verifies the dockside
// carts and the shipboard bunk rest, exercises the manual capture hotkey,
// and asserts the blank-modal watchdog stayed silent throughout — after
// EVERY step the modal must be either hidden or showing readable body text.
const { chromium } = require('playwright');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

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
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'StressKid');
  await page.click('#btnNew');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1,2,3,4,5,6,7,8,9,10,11,12,13];
    s.metMiscount = true; s.seenBattleHelp = true;
    s.gold = 5000; s.difficulty = 'story';
    s.items.treasures = ['pearl', 'pearl', 'pearl'];
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.lampLit = true; s.isles.spireDone = true; s.isles.hallsDone = true;
    MM.engine.save();
  });

  // health invariant checked after every single step below
  const healthy = () => page.evaluate(() => {
    const overlay = document.getElementById('overlay');
    if (overlay.classList.contains('hidden')) return true;
    const box = document.getElementById('modalBox');
    let text = '';
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) text += child.textContent;
        else if (child.nodeType === 1 && child.tagName !== 'BUTTON'
                 && !(child.classList && child.classList.contains('btnrow'))) walk(child);
      }
    };
    walk(box);
    return text.trim().length > 0 && box.getBoundingClientRect().height >= 40;
  });
  let healthFailures = 0;
  const step = async (label) => { if (!(await healthy())) { healthFailures++; checks.push(`FAIL blank/collapsed modal after: ${label}`); } };

  const solveModal = async () => {
    const info = await page.evaluate(`(${canonicalize})(MM.ui.current)`);
    if (!info) return;
    if (info.kind === 'choice') await page.click(`#modalBox .choice >> nth=${info.idx}`);
    else { await page.fill('#modalBox #answerInput', info.val); await page.keyboard.press('Enter'); }
    await page.waitForSelector('#modalBox .btnrow button.primary');
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForTimeout(120);
  };

  // ---------- mainland shop: 15 noisy buy/sell rounds ----------
  for (let round = 0; round < 15; round++) {
    await page.evaluate(() => { const s = MM.engine.state; s.continent = 'west'; s.mapId = 'world'; MM.engine.enterWorld(); MM.ui.openShop(); });
    await step(`open shop round ${round}`);
    const tab = ['gear', 'supplies', 'sell'][round % 3];
    await page.click(`.shop-tab-btn[data-tab="${tab}"]`);
    await step(`switch to ${tab}`);
    if (tab === 'supplies') {
      const qtyBtn = round % 2 ? '[data-qty="5"]' : '[data-qty="1"]';
      const btn = await page.$(`button.shop-buy[data-kind="potion"]${qtyBtn}:not([disabled])`);
      if (btn) {
        await btn.click();
        await btn.click().catch(() => {}); // deliberate double-click on a detached button
        await page.keyboard.press('Enter').catch(() => {}); // stray Enter mid-transition
        await step('potion buy click + noise');
        if (await page.$('#modalBox .prob-text')) await solveModal();
        await step('potion purchase resolved');
      }
    } else if (tab === 'sell') {
      const sellBtn = await page.$('button.shop-sell:not([disabled])');
      if (sellBtn) {
        await sellBtn.click();
        await step('sell click');
        if (await page.$('#modalBox .prob-text')) await solveModal();
        await step('sell resolved');
        // selling reopens the shop; give it a treasure back for later rounds
        await page.evaluate(() => { MM.engine.state.items.treasures.push('pearl'); });
      }
    } else {
      const buyBtn = await page.$('button.shop-buy[data-kind]:not([disabled])');
      if (buyBtn) {
        await buyBtn.click();
        await step('gear buy click');
        if (await page.$('#modalBox .prob-text')) await solveModal();
        await step('gear purchase resolved');
      }
    }
    await page.evaluate(() => MM.ui.closeModal());
  }
  check(healthFailures === 0, `no blank/collapsed modal in 15 noisy shop rounds (${healthFailures} failures)`);

  // ---------- the dockside cart (Horologe): supplies-only ----------
  await page.evaluate(() => { const s = MM.engine.state; s.continent = 'horologe'; s.worldPos = null; MM.engine.enterWorld(); MM.ui.openShop(); });
  await step('open horologe cart');
  check(/Dockside Cart/.test(await page.textContent('#modalBox h2')), 'the Horologe cart has its own name');
  check(!(await page.$('.shop-tab-btn')), 'the cart shows no tabs (supplies only)');
  check(!(await page.$('button.shop-sell')), 'the cart has no sell counter');
  check(!!(await page.$('button.shop-buy[data-kind="potion"]')), 'the cart sells potions');
  check(!!(await page.$('button.shop-buy[data-kind="food"]')), 'the cart sells food');
  await page.evaluate(() => MM.ui.closeModal());

  // Gullwrack's shop now carries ISLE stock under its own name
  await page.evaluate(() => { const s = MM.engine.state; s.continent = 'gullwrack'; s.worldPos = null; MM.engine.enterWorld(); MM.ui.openShop(); });
  check(/Gullwrack Chandlery/.test(await page.textContent('#modalBox h2')), 'Gullwrack shop is the Chandlery (not the mainland store)');
  await page.click('.shop-tab-btn[data-tab="gear"]');
  const gearText = await page.textContent('#modalBox');
  check(/Tidal Blade|Pearl Mail|Coral Crown/.test(gearText), 'the Chandlery sells isle-tier gear');
  await page.evaluate(() => MM.ui.closeModal());

  // ---------- the shipboard bunk rest (inn-less islands) ----------
  await page.evaluate(() => { const s = MM.engine.state; s.hp = 5; s.continent = 'chime'; s.worldPos = null; MM.engine.enterWorld(); MM.engine.chimeDock(); });
  await page.click('text=Rest in your bunk');
  await page.waitForSelector('#modalBox .prob-text');
  check(/Compass Rose/.test(await page.textContent('#modalBox')), 'the bunk rest is shipboard-flavored');
  for (let i = 0; i < 3; i++) await solveModal();
  check(await page.evaluate(() => MM.engine.state.hp === MM.engine.state.maxhp), 'bunk rest fully heals after 3 warm-ups');

  // ---------- manual capture hotkey ----------
  const bugsBefore = await page.evaluate(() => MM.bugs.list().length);
  await page.keyboard.press('Control+Shift+KeyB');
  await page.waitForTimeout(200);
  const bugs = await page.evaluate(() => MM.bugs.list());
  check(bugs.length === bugsBefore + 1 && bugs[bugs.length - 1].kind === 'manual-capture',
    'Ctrl+Shift+B records a manual capture snapshot');

  // ---------- the watchdog stayed silent ----------
  check(await page.evaluate(() => MM.bugs.list().every(b => b.kind !== 'blank-modal' && b.kind !== 'blank-battle')),
    'no blank-modal/blank-battle entries were recorded during the stress run');

  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
