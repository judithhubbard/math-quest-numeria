// Regression guard for the blank-modal detector: if a modal's content is
// emptied without an error being thrown (the elusive "blank shop window"
// bug), the game must record a bug-log entry with breadcrumbs and show the
// recovery message instead of a stuck blank window.
const { chromium } = require('playwright');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'BlankKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // a healthy modal must NOT trip the detector
  await page.evaluate(() => MM.ui.dialog('Test', 'This modal has perfectly good content.'));
  await page.waitForTimeout(450);
  check(await page.evaluate(() => !/Oops — empty window/.test(document.getElementById('modalBox').textContent)),
    'healthy modals pass the check');
  await page.click('#dlgOk');

  // simulate the bug: open a modal, then something silently empties it
  await page.evaluate(() => {
    MM.ui.dialog('Doomed', 'This content is about to vanish without an error.');
    document.getElementById('modalBox').innerHTML = '';
  });
  await page.waitForTimeout(450); // the 300ms watchdog fires
  check(await page.evaluate(() => /Oops — empty window/.test(document.getElementById('modalBox').textContent)),
    'blanked modal is replaced by the recovery message');
  const entry = await page.evaluate(() => MM.bugs.list().find(b => b.kind === 'blank-modal'));
  check(!!entry, 'a blank-modal bug entry is recorded');
  check(entry && Array.isArray(entry.crumbs) && entry.crumbs.length > 0, 'the entry carries breadcrumbs');
  await page.click('#dlgOk');
  check(await page.evaluate(() => document.getElementById('overlay').classList.contains('hidden')),
    '"Carry on" unsticks the game');

  // the entry survives a reload (localStorage), so it can be copied later
  await page.reload();
  await page.waitForSelector('#newName');
  check(await page.evaluate(() => MM.bugs.list().some(b => b.kind === 'blank-modal')),
    'the recording survives a page reload');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
