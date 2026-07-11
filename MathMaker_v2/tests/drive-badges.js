// Drive MathMaker v2 topic badges: earn bronze via recorded answers, check the
// celebration dialog pops on refresh (not mid-modal), the bag badge shelf, the
// report card icon, and that badges persist through save/load.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-badges');

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
  await page.fill('#newName', 'BadgeKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // 9 correct answers: no badge yet
  await page.evaluate(() => {
    for (let i = 0; i < 9; i++) MM.engine.recordAnswer('addsub_facts', true);
    MM.ui.refresh();
  });
  check(await page.evaluate(() => !MM.engine.state.badges.addsub_facts), '9 correct -> no badge');

  // 10th correct answer: bronze earned, celebration dialog pops via refresh
  await page.evaluate(() => { MM.engine.recordAnswer('addsub_facts', true); MM.ui.refresh(); });
  await page.waitForSelector('#modalBox h2');
  const title = await page.textContent('#modalBox h2');
  check(/Bronze Badge/.test(title), 'bronze celebration dialog popped: ' + title.trim());
  check(await page.evaluate(() => MM.engine.state.badges.addsub_facts === 1), 'state.badges records bronze');
  await page.screenshot({ path: SHOTS + '/1-bronze-dialog.png' });
  await page.click('#dlgOk');

  // earn silver in a second topic while a modal is open: must queue, not pop
  await page.evaluate(() => {
    MM.ui.dialog('Test', 'blocking modal');
    for (let i = 0; i < 25; i++) MM.engine.recordAnswer('muldiv_facts', true);
    MM.ui.refresh();
  });
  check(await page.evaluate(() =>
    MM.engine.state.pendingBadges.length === 2 && MM.engine.state.badges.muldiv_facts === 2),
    'badges earned behind a modal queue instead of popping (bronze + silver)');
  // closing each dialog refreshes, popping the queue in order: bronze, then silver
  await page.click('#dlgOk'); // close blocking modal
  await page.waitForSelector('#modalBox h2');
  check(/Bronze Badge/.test(await page.textContent('#modalBox h2')), 'queued bronze pops first after modal closes');
  await page.click('#dlgOk');
  await page.waitForSelector('#modalBox h2');
  check(/Silver Badge/.test(await page.textContent('#modalBox h2')), 'queued silver pops next');
  await page.click('#dlgOk');

  // bag badge shelf
  await page.keyboard.press('b');
  await page.waitForSelector('#modalBox h2');
  const shelf = await page.evaluate(() =>
    [...document.querySelectorAll('#modalBox .charm-row')].map(r => r.textContent).join('\n'));
  check(/Addition & Subtraction Facts/.test(shelf) && /Multiplication & Division Facts/.test(shelf),
    'bag shelf lists topics');
  const onCount = await page.evaluate(() => document.querySelectorAll('#modalBox .badge-on').length);
  check(onCount === 3, `shelf shows 3 lit badges (bronze + silver pair): got ${onCount}`);
  await page.screenshot({ path: SHOTS + '/2-bag-shelf.png' });
  await page.click('#bagClose');

  // report card shows the badge next to the topic
  await page.keyboard.press('r');
  await page.waitForSelector('#modalBox h2');
  const report = await page.textContent('#modalBox .dialog-body').catch(() => '');
  const reportAll = report || await page.textContent('#modalBox');
  check(/🥉/.test(reportAll) && /🥈/.test(reportAll), 'report card shows badge emoji');
  await page.screenshot({ path: SHOTS + '/3-report-card.png' });
  await page.click('#dlgOk');

  // badges survive save/load
  await page.evaluate(() => { MM.engine.save(); MM.engine.load('BadgeKid'); });
  check(await page.evaluate(() =>
    MM.engine.state.badges.addsub_facts === 1 && MM.engine.state.badges.muldiv_facts === 2),
    'badges persist through save/load');

  // downgrade never happens: cold streak after silver keeps silver
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) MM.engine.recordAnswer('muldiv_facts', false);
    MM.ui.refresh();
  });
  check(await page.evaluate(() => MM.engine.state.badges.muldiv_facts === 2),
    'cold streak does not take a badge away');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
