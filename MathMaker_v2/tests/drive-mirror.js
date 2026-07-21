// Drive Through the Looking Glass (Wave 20, Looking Glass P1) and its SACRED
// REVERSIBILITY. The post-game replay is now a MIRROR world you step INTO and
// safely BACK OUT of — reusing the old Golden Numeria machinery, reframed. A
// kid once pressed "Golden Numeria" and thought he'd lost his finished
// kingdom, so this phase makes the step EXPLICIT, VISIBLE (a cool mirror tint
// + a persistent "through the glass" indicator), and LOSSLESSLY reversible —
// both from inside the mirror (the sidebar step-back) and from Parent Settings.
// This drives: the explicit prompt (safe default); that declining changes
// nothing; that stepping through re-seals the kingdom, sets the mirror tint +
// indicator, and keeps the hero; that stepping BACK from inside restores the
// finished kingdom EXACTLY (castleOpen again); and that the parent panel
// recovery restores identically.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/private/tmp/claude-503/-Users-jk-Dropbox-Claude-TaskMaker-math/85eabd6d-828f-40fd-ba15-6557b405a666/scratchpad/shots';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const closeModals = () => ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'MirrorDrive');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // set up a finished kingdom
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    Object.assign(s.isles, { lampLit: true, spireDone: true, hallsDone: true, breakwaterDone: true, gullwrackRebuilt: true, lenses: { tidepool: true, frostbite: true, cinderforge: true } });
    s.badges = { addsub_facts: 3 }; s.level = 18; s.parent.pin = '1234';
    s.equipped.weapon = 'star';
    MM.engine.enterWorld(); MM.ui.refresh();
  });
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.castleOpen()), 'a finished kingdom reads as finished (castleOpen) before stepping through');
  check(await ev(() => !MM.engine.inMirror()), 'a finished kingdom is NOT through the glass');
  check(await ev(() => document.getElementById('mirrorBanner').classList.contains('hidden')), 'the mirror indicator is hidden in normal play');

  // ---- the explicit entry prompt, with the SAFE choice as the default ----
  await ev(() => MM.engine.goldenPrompt());
  await page.waitForTimeout(150);
  const prompt = await ev(() => ({
    text: document.getElementById('modalBox').innerText,
    primary: (document.querySelector('#modalBox .btnrow button.primary') || {}).textContent || '',
  }));
  check(/looking glass/i.test(prompt.text) && /reflection of Numeria/i.test(prompt.text), 'the prompt spells out you step into a reflection');
  check(/kept safe/i.test(prompt.text) && /Nothing is lost/i.test(prompt.text), 'the prompt promises the finished kingdom is kept safe and nothing is lost');
  check(/step back through the glass any time/i.test(prompt.text), 'the prompt says you can step back any time');
  check(/Stay in my finished kingdom/i.test(prompt.primary), 'the SAFE "Stay in my finished kingdom" is the default/primary button');
  await page.screenshot({ path: `${SHOTS}/mirror-1-entry-prompt.png` });

  // choose the SAFE option — nothing should change (a decline leaves it untouched)
  await page.click('text=Stay in my finished kingdom');
  await page.waitForTimeout(150);
  const kept = await ev(() => ({ ngPlus: MM.engine.state.ngPlus, tasks: MM.engine.state.tasksDone.length, inMirror: MM.engine.inMirror(), castle: MM.engine.castleOpen() }));
  check(kept.ngPlus === 0 && kept.tasks === 13 && !kept.inMirror && kept.castle, 'declining leaves the finished kingdom completely untouched');
  await closeModals();

  // ---- stepping through the glass: re-seal the kingdom, keep the hero, snapshot, tint + indicator ----
  const started = await ev(() => {
    const s = MM.engine.state;
    MM.engine.startGolden();
    return { ngPlus: s.ngPlus, tasks: s.tasksDone.length, lamp: s.isles.lampLit, level: s.level, badge: s.badges.addsub_facts, weapon: s.equipped.weapon, snap: !!s.goldenSnapshot, inMirror: MM.engine.inMirror(), canReturn: MM.engine.canReturnToKingdom(), castle: MM.engine.castleOpen() };
  });
  check(started.ngPlus === 1, 'stepping through begins reflection 1');
  check(started.tasks === 0 && !started.lamp && !started.castle, 'stepping through re-tangles the kingdom (tasks reset, isles re-locked, castle no longer finished)');
  check(started.level === 18 && started.badge === 3 && started.weapon === 'star', 'the hero keeps level, badges, and gear through the glass');
  check(started.snap, 'stepping through snapshots the finished kingdom FIRST (the way back)');
  check(started.inMirror, 'the mirror flag/tint is SET while through the glass');
  check(started.canReturn, 'a step-back becomes available');
  await closeModals();
  await ev(() => MM.ui.refresh());
  await page.waitForTimeout(250);

  // the persistent indicator is shown, and it carries the mirror-side exit button
  const banner = await ev(() => ({
    shown: !document.getElementById('mirrorBanner').classList.contains('hidden'),
    text: document.getElementById('mirrorBanner').innerText,
    hasExit: !!document.getElementById('mirrorStepBack'),
  }));
  check(banner.shown && /Through the looking glass/i.test(banner.text), 'the persistent "through the looking glass" indicator is shown in the sidebar');
  check(banner.hasExit, 'the indicator carries a mirror-side step-back-through-the-glass button');
  await page.screenshot({ path: `${SHOTS}/mirror-2-in-mirror-overworld.png` });
  await page.screenshot({ path: `${SHOTS}/mirror-3-indicator.png`, clip: { x: 820, y: 40, width: 330, height: 200 } });

  // ---- stepping back FROM INSIDE the mirror restores the finished kingdom EXACTLY ----
  await ev(() => document.getElementById('mirrorStepBack').click());
  await page.waitForTimeout(150);
  const exitText = await ev(() => document.getElementById('modalBox').innerText);
  check(/Step back through the glass/i.test(exitText) && /finished kingdom/i.test(exitText), 'the in-mirror exit prompt explains the step back restores the finished kingdom');
  await page.click('text=Yes, step back to my finished kingdom');
  await page.waitForTimeout(200);
  const back = await ev(() => { const s = MM.engine.state; return { ngPlus: s.ngPlus, tasks: s.tasksDone.length, lamp: s.isles.lampLit, level: s.level, badge: s.badges.addsub_facts, weapon: s.equipped.weapon, snap: !!s.goldenSnapshot, inMirror: MM.engine.inMirror(), castle: MM.engine.castleOpen() }; });
  check(back.ngPlus === 0 && !back.inMirror, 'stepping back from inside ends the reflection and clears the mirror flag/tint');
  check(back.tasks === 13 && back.lamp && back.castle, 'the finished kingdom is restored EXACTLY — every task done, the isles restored, castle finished again');
  check(back.level === 18 && back.badge === 3 && back.weapon === 'star' && !back.snap, 'the hero still has everything and the snapshot is consumed');
  await closeModals();
  await ev(() => MM.ui.refresh());
  await page.waitForTimeout(150);
  check(await ev(() => document.getElementById('mirrorBanner').classList.contains('hidden')), 'the mirror indicator is hidden again once back in the finished kingdom');

  // ---- the PARENT PANEL recovery restores identically ----
  await ev(() => { MM.engine.startGolden(); });
  await closeModals();
  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234');
  await page.click('#pinOk');
  await page.waitForTimeout(200);
  const panel = await ev(() => ({
    hasBtn: !!document.getElementById('goldenReturn'),
    text: document.getElementById('modalBox').innerText,
  }));
  check(panel.hasBtn, 'Parent Settings shows the step-back-through-the-glass recovery button');
  check(/through the looking glass/i.test(panel.text) && /step them back through/i.test(panel.text), 'the parent panel uses the mirror framing');
  await page.screenshot({ path: `${SHOTS}/mirror-4-parent-recovery.png` });
  await page.click('#goldenReturn');
  await page.waitForTimeout(150);
  await page.click('text=Yes, step back to the finished kingdom');
  await page.waitForTimeout(200);
  const restored = await ev(() => { const s = MM.engine.state; return { ngPlus: s.ngPlus, tasks: s.tasksDone.length, lamp: s.isles.lampLit, inMirror: MM.engine.inMirror(), castle: MM.engine.castleOpen(), snap: !!s.goldenSnapshot }; });
  check(restored.ngPlus === 0 && !restored.inMirror, 'the parent-panel recovery ends the reflection');
  check(restored.tasks === 13 && restored.lamp && restored.castle && !restored.snap, 'the parent-panel recovery restores the finished kingdom identically (castleOpen, snapshot consumed)');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
