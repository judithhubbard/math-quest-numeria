// Drive Golden Numeria (New Game+) and its REVERSIBILITY — a kid started NG+
// without meaning to and lost his finished kingdom, so NG+ now snapshots the
// finished kingdom, the prompt is explicit, and a parent can undo it. This
// drives: the clearer prompt (safe default), that starting NG+ keeps the hero
// but re-seals the kingdom, and that Parent Settings can restore the finished
// kingdom exactly.
const { chromium } = require('playwright');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'GoldDrive');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // set up a finished kingdom
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    Object.assign(s.isles, { lampLit: true, spireDone: true, hallsDone: true, breakwaterDone: true, gullwrackRebuilt: true, lenses: { tidepool: true, frostbite: true, cinderforge: true } });
    s.badges = { addsub_facts: 3 }; s.level = 18; s.parent.pin = '1234';
  });

  // ---- the prompt is explicit, and its SAFE choice is the default ----
  await ev(() => MM.engine.goldenPrompt());
  await page.waitForTimeout(120);
  const prompt = await ev(() => ({
    text: document.getElementById('modalBox').innerText,
    primary: (document.querySelector('#modalBox .btnrow button.primary') || {}).textContent || '',
  }));
  check(/WHOLE adventure over/i.test(prompt.text) || /restarts the entire kingdom/i.test(prompt.text), 'the prompt spells out that it restarts the entire kingdom');
  check(/Keep my finished kingdom/i.test(prompt.primary), 'the safe "Keep my finished kingdom" is the default/primary button');
  check(/Parent Settings/i.test(prompt.text), 'the prompt tells you a grown-up can undo it from Parent Settings');
  // choose the SAFE option — nothing should change
  await page.click('text=Keep my finished kingdom');
  await page.waitForTimeout(120);
  const kept = await ev(() => ({ ngPlus: MM.engine.state.ngPlus, tasks: MM.engine.state.tasksDone.length }));
  check(kept.ngPlus === 0 && kept.tasks === 13, 'declining leaves the finished kingdom untouched');
  // close the throne dialog that "Keep" routes to
  await ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child'); if (b) b.click(); else break; } });

  // ---- starting NG+ re-seals the kingdom but keeps the hero + snapshots ----
  const started = await ev(() => {
    const s = MM.engine.state;
    MM.engine.startGolden();
    return { ngPlus: s.ngPlus, tasks: s.tasksDone.length, lamp: s.isles.lampLit, level: s.level, badge: s.badges.addsub_facts, snap: !!s.goldenSnapshot, canReturn: MM.engine.canReturnToKingdom() };
  });
  check(started.ngPlus === 1, 'startGolden begins run 1');
  check(started.tasks === 0 && !started.lamp, 'startGolden re-seals the kingdom (tasks reset, isles re-locked)');
  check(started.level === 18 && started.badge === 3, 'the hero keeps level and badges through NG+');
  check(started.snap, 'startGolden snapshots the finished kingdom (the way back)');
  check(started.canReturn, 'a return becomes available');
  await ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });

  // ---- Parent Settings offers "Return to the finished kingdom" ----
  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234');
  await page.click('#pinOk');
  await page.waitForTimeout(150);
  check(await ev(() => !!document.getElementById('goldenReturn')), 'Parent Settings shows the "Return to the finished kingdom" recovery button');
  await page.click('#goldenReturn');
  await page.waitForTimeout(120);
  await page.click('text=Yes, restore the finished kingdom');
  await page.waitForTimeout(150);
  const restored = await ev(() => { const s = MM.engine.state; return { ngPlus: s.ngPlus, tasks: s.tasksDone.length, lamp: s.isles.lampLit, level: s.level, badge: s.badges.addsub_facts, snap: !!s.goldenSnapshot, castleOpen: MM.engine.castleOpen() }; });
  check(restored.ngPlus === 0, 'restoring ends the Golden Numeria run');
  check(restored.tasks === 13 && restored.lamp, 'the finished kingdom is back — every task done, the isles restored');
  check(restored.castleOpen, 'the castle (throne room) is reachable again — the kingdom reads as finished');
  check(restored.level === 18 && restored.badge === 3, 'the hero still has everything after the restore');
  check(!restored.snap, 'the snapshot is consumed once restored');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
