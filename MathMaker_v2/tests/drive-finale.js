// Drive Wave 24 (Looking Glass P4 — the FINALE): the Vantage. Two things
// worth proving end-to-end: (1) THE COMPLETED SPIRAL, the capstone — a
// discoverable wonder vantage in the mirror where bumping the plaque ARMS a
// render of the kingdom's golden spiral joined with its reflection (reversed
// chirality, meeting at the shared center stone) into one symmetric double
// spiral, and delivers the authored reveal prose; (2) a tight Carroll wonder
// cast (the Jabberwocky plaque in mirror-writing, the White Queen, Humpty
// Dumpty, the frozen always-six-o'clock Mad Tea-Party) — all look-never-test
// wonder, all gated on E.inMirror() alone (no negatives switch needed). And:
// NONE of any of it exists in normal play.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = __dirname + '/shots-finale';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const closeModals = () => ev(() => {
    for (let i = 0; i < 12 && MM.ui.modalOpen(); i++) {
      const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child');
      if (b) b.click();
      if (MM.ui.modalOpen()) MM.ui.closeModal();
    }
  });
  const modalText = () => ev(() => (document.getElementById('modalBox') || {}).innerText || '');

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'GlassKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ---- 0) BEFORE the mirror: none of Wave 24 exists in normal play ----
  const normalBefore = await ev(() => {
    MM.engine.vantageDoor();
    const opened = MM.engine.state.mapId === 'vantage';
    const text = (document.getElementById('modalBox') || {}).innerText || '';
    return { opened, text };
  });
  check(!normalBefore.opened, 'BEFORE stepping through the glass, vantageDoor() does not open the Vantage');
  check(/isn.t here|other side of the glass/i.test(normalBefore.text), 'outside the mirror the door explains itself gently, never a silent wall');
  await closeModals();

  // a finished hero, stepped through the glass
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    MM.engine.startGolden();   // ngPlus -> 1
  });
  await page.waitForTimeout(200);
  await closeModals();
  check(await ev(() => MM.engine.inMirror()), 'the hero is through the looking glass');

  // ---- 1) the throne room offers the Vantage (real UI discoverability) ----
  await ev(() => { MM.engine.enterCastle(); });
  await page.waitForTimeout(150);
  await ev(() => MM.engine.throneRoom());
  await page.waitForTimeout(120);
  const throneText = await modalText();
  check(/Visit the Vantage/i.test(throneText), 'the throne room offers "Visit the Vantage" while through the glass');
  await closeModals();

  // ---- 2) enter the Vantage; the Cheshire materializes at the threshold ----
  await ev(() => MM.engine.vantageDoor());
  await page.waitForTimeout(150);
  const cheshireText = await modalText();
  check(await ev(() => MM.data.CHESHIRE_LINES.some(l => (document.getElementById('modalBox') || {}).innerText.includes(l.slice(0, 20)))),
    'entering the Vantage materializes the Cheshire Cat with a general (non-negative) hint');
  await closeModals();
  check(await ev(() => MM.engine.state.mapId === 'vantage'), 'the Vantage is entered');

  // ---- 3) BEFORE bumping the plaque, the render is not yet armed ----
  const preArm = await ev(() => ({ revealed: !!(MM.engine.state.vantage && MM.engine.state.vantage.revealed) }));
  check(!preArm.revealed, 'arriving at the Vantage, the completed-spiral render starts UN-armed');
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${SHOTS}/fin-1-arrival.png` });

  // ---- 4) bump the Vantage plaque: the capstone reveal fires + the render ARMS ----
  await ev(() => { const s = MM.engine.state; s.px = 7; s.py = 6; });   // just south of the plaque at (7,5)
  await ev(() => MM.engine.tryMove(0, -1));
  await page.waitForTimeout(150);
  const revealText = await modalText();
  check(/only half the spiral|reflection was the other half/i.test(revealText), 'bumping the Vantage plaque delivers the authored completed-spiral REVEAL');
  await page.screenshot({ path: `${SHOTS}/fin-2-reveal-dialog.png`, clip: { x: 200, y: 120, width: 750, height: 500 } });
  await closeModals();
  const armed = await ev(() => !!(MM.engine.state.vantage && MM.engine.state.vantage.revealed));
  check(armed, 'the plaque bump ARMS the completed-spiral render (s.vantage.revealed)');

  // ---- 5) THE CAPSTONE SCREENSHOT: the completed/mirrored spiral, armed ----
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/fin-3-completed-spiral.png` });

  // ---- 6) bumping the plaque again gives the SHORT callback, not the reveal again ----
  await ev(() => { const s = MM.engine.state; s.px = 7; s.py = 6; });
  await ev(() => MM.engine.tryMove(0, -1));
  await page.waitForTimeout(120);
  const againText = await modalText();
  check(/half of a whole/i.test(againText), 'a LATER plaque bump shows the short callback, not the full reveal again');
  check(!/only half the spiral/i.test(againText), 'the later bump does NOT repeat the full authored reveal verbatim');
  await closeModals();

  // ---- 7) the Jabberwocky plaque: mirror-writing, readable both ways ----
  await ev(() => { const s = MM.engine.state; s.px = 2; s.py = 3; });   // south of the plaque at (2,2)
  await ev(() => MM.engine.tryMove(0, -1));
  await page.waitForTimeout(120);
  const jabberText = await modalText();
  check(/brillig/i.test(jabberText), 'the Jabberwocky plaque shows the TRUE stanza (held to the glass)');
  check(/gillirb/i.test(jabberText), 'the Jabberwocky plaque ALSO shows the mirror-written (printed backwards) form');
  await page.screenshot({ path: `${SHOTS}/fin-4-jabberwocky.png`, clip: { x: 200, y: 100, width: 750, height: 550 } });
  await closeModals();

  // ---- 8) the White Queen (a Carroll-cast NPC) ----
  await ev(() => { const s = MM.engine.state; s.px = 12; s.py = 3; });  // south of her at (12,2)
  await ev(() => MM.engine.tryMove(0, -1));
  await page.waitForTimeout(120);
  const queenText = await modalText();
  check(/jam to-morrow|memory works both ways|living backwards/i.test(queenText), 'the White Queen appears and reads (backwards-living / jam rule)');
  await page.screenshot({ path: `${SHOTS}/fin-5-white-queen.png`, clip: { x: 200, y: 120, width: 750, height: 500 } });
  await closeModals();

  // ---- 9) Humpty Dumpty ----
  await ev(() => { const s = MM.engine.state; s.px = 2; s.py = 7; });   // north of him at (2,8)
  await ev(() => MM.engine.tryMove(0, 1));
  await page.waitForTimeout(120);
  const humptyText = await modalText();
  check(/choose it to mean|master/i.test(humptyText), 'Humpty Dumpty appears and reads (words mean what he chooses)');
  await closeModals();

  // ---- 10) the frozen Mad Tea-Party — a cozy ANTI-timer, no hurry, no timer state ----
  await ev(() => { const s = MM.engine.state; s.px = 12; s.py = 7; });  // north of it at (12,8)
  const teaState = await ev(() => { MM.engine.tryMove(0, 1); return { hasTeaParty: !!MM.engine.state.teaParty }; });
  await page.waitForTimeout(120);
  const teaText = await modalText();
  check(/six o.clock/i.test(teaText), 'the Mad Tea-Party is frozen at always-six-o\'clock');
  // NOTE: the line itself SAYS "in any hurry" (as reassurance — nobody is),
  // so this checks for actual urgency phrasing, not the word "hurry" alone.
  check(!/hurry up|better hurry|running out of time|countdown|seconds left|you must hurry/i.test(teaText), 'the tea-party reads as an ANTI-timer — never an actual hurry');
  check(!teaState.hasTeaParty, 'the tea-party persists NO timer/time state on the save at all');
  await page.screenshot({ path: `${SHOTS}/fin-6-tea-party.png`, clip: { x: 200, y: 120, width: 750, height: 500 } });
  await closeModals();

  // ---- 11) the exit door works ----
  await ev(() => { const s = MM.engine.state; s.px = 4; s.py = 9; });   // east of the door at (3,9)
  await ev(() => MM.engine.tryMove(-1, 0));
  await page.waitForTimeout(150);
  check(await ev(() => MM.engine.state.mapId === 'castle'), 'the Vantage door returns to the castle');

  // ---- 12) step back through the glass: NONE of it is reachable again ----
  await ev(() => MM.engine.mirrorExitPrompt());
  await page.waitForTimeout(120);
  await ev(() => { const btn = [...document.querySelectorAll('#modalBox button')].find(b => /step back/i.test(b.textContent)); if (btn) btn.click(); });
  await page.waitForTimeout(150);
  await closeModals();
  const normalAfter = await ev(() => {
    if (MM.engine.inMirror()) return { ok: false, why: 'still in the mirror' };
    MM.engine.vantageDoor();
    if (MM.engine.state.mapId === 'vantage') return { ok: false, why: 'Vantage opened outside the mirror' };
    return { ok: true, text: (document.getElementById('modalBox') || {}).innerText || '' };
  });
  check(normalAfter.ok, 'AFTER stepping back, the Vantage is unreachable again (' + (normalAfter.why || 'refused') + ')');
  check(/isn.t here|other side of the glass/i.test(normalAfter.text || ''), 'outside the mirror (again) the door explains itself gently');
  await closeModals();

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
