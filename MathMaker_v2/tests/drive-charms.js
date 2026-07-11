// Drive MathMaker v2 charm slots: own many, WEAR three. Auto-wear while
// slots are free, effects only from worn charms, bag wear/take-off flow,
// the fourth-charm block, and old-save migration.
const { chromium } = require('playwright');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

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
  await page.fill('#newName', 'CharmKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // five charms arrive; the first three are auto-worn, the rest go to the bag
  const wornStates = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(MM.engine.awardCharm().worn);
    return { out, on: MM.engine.state.charmsOn.length, owned: MM.engine.state.items.charms.length };
  });
  check(wornStates.out.join(',') === 'true,true,true,false,false' && wornStates.on === 3 && wornStates.owned === 5,
    `auto-wear fills 3 slots then stops (${wornStates.out.join(',')})`);

  // effects come from WORN charms only: magnet on vs off
  const magnet = await page.evaluate(() => {
    const s = MM.engine.state;
    s.items.charms = ['magnet', 'clover', 'quill', 'heart', 'boots'];
    s.charmsOn = ['clover', 'quill', 'heart']; // magnet owned but NOT worn
    s.gold = 0;
    const offGain = MM.engine.gainGold(100);
    s.charmsOn = ['magnet', 'quill', 'heart'];
    s.gold = 0;
    const onGain = MM.engine.gainGold(100);
    return { offGain, onGain };
  });
  check(magnet.offGain === 100 && magnet.onGain === 125,
    `only WORN charms act (magnet off: +${magnet.offGain}, on: +${magnet.onGain})`);

  // the bag: take one off, wear another, and hit the 3-slot ceiling
  await page.keyboard.press('b');
  await page.waitForSelector('#modalBox h2');
  check(/wear up to 3 \(3\/3 worn\)/i.test((await page.textContent('#modalBox')).replace(/\s+/g, ' ')),
    'bag shows the worn count');
  await page.click('[data-charm="quill"]'); // take off
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate(() => !MM.engine.state.charmsOn.includes('quill') && MM.engine.state.charmsOn.length === 2),
    'take-off frees a slot');
  await page.click('[data-charm="clover"]'); // wear into the free slot
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate(() => MM.engine.state.charmsOn.includes('clover') && MM.engine.state.charmsOn.length === 3),
    'wear fills the free slot');
  await page.click('[data-charm="boots"]'); // fourth: blocked
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate(() => !MM.engine.state.charmsOn.includes('boots') && MM.engine.state.charmsOn.length === 3),
    'a fourth charm is politely refused');
  await page.click('#bagClose');

  // old saves (no charmsOn) wear their first three on load
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    delete s.charmsOn;
    MM.engine.save();
    MM.engine.load('CharmKid');
    const t = MM.engine.state;
    return Array.isArray(t.charmsOn) && t.charmsOn.length === 3 &&
      t.charmsOn.every(id => t.items.charms.includes(id));
  }), 'old saves migrate to first-three-worn');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
