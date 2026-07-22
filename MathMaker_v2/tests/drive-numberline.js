// Drive Wave 23 (Looking Glass P3.5): the number-line WALK. Negatives as a
// place your feet go. The things that matter, end-to-end: (1) in the mirror
// with negatives ON, the crossing shows a walkable row of SIGNED stones
// (…−4 −3 −2 −1 [0] +1 +2 +3 +4…, zero marked, a clean unicode minus); (2) a
// "stand on −4" target is satisfied by WALKING to the −4 stone, and a wrong
// stone gives a gentle nudge (no punish); (3) a relative target computes
// correctly; (4) the zero-meridian washes the overworld into "the Below"; (5)
// with negatives OFF the crossing shows a gentle grown-up note, never a locked
// wall; (6) NONE of it in normal play. Plus the Cheshire's negative hint.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = __dirname + '/shots-numberline';

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
  const logText = () => ev(() => (document.getElementById('log') || {}).innerText || '');

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'LineKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // a finished hero, stepped through the glass, with negatives switched ON
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.parent.negatives = true;
    MM.engine.startGolden();   // into the mirror (ngPlus -> 1), lands on the mirror overworld
  });
  await page.waitForTimeout(200);
  await closeModals();
  check(await ev(() => MM.engine.inMirror()), 'the hero is through the looking glass');
  check(await ev(() => MM.engine.negativesOn()), 'negativesOn() is true (mirror + switch on)');

  // ---- 1) the zero-meridian: the mirror overworld washes into the Below ----
  check(await ev(() => MM.engine.state.mapId === 'world'), 'stepping through lands on the mirror overworld');
  // centre the camera on the zero-line so the screenshot shows it plainly
  await ev(() => { const s = MM.engine.state; s.px = MM.maps.MERIDIAN_X; MM.ui.refresh(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/nl-1-meridian-wash.png` });
  const belowBeat = await ev(() => {
    MM.engine.state.mapId = 'world'; MM.engine._belowSeen = false;
    const mer = MM.maps.MERIDIAN_X;
    MM.engine.maybeCrossMeridian(mer, mer - 1);   // the real walk-hook, crossing WEST
    return (document.getElementById('log') || {}).innerText || '';
  });
  check(/Below/.test(belowBeat), 'crossing west of the zero-line narrates the "the Below" beat');

  // ---- 2) enter the number-line crossing; the Cheshire drops a negative hint ----
  await ev(() => MM.engine.numberlineDoor());
  await page.waitForTimeout(150);
  const cheshire = await ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  check(await ev(() => MM.data.CHESHIRE_NEG_LINES.some(l => (document.getElementById('modalBox') || {}).innerText.includes(l.slice(0, 24)))),
    'entering the crossing materializes the Cheshire with a NEGATIVE-number hint');
  await closeModals();
  check(await ev(() => MM.engine.state.mapId === 'numberline'), 'the number-line crossing is entered');

  // ---- 3) the crossing shows a walkable row of SIGNED stones, zero marked ----
  const row = await ev(() => MM.maps.NUMBERLINE_ROW.map(r => ({ x: r.x, y: r.y, value: r.value })));
  check(row.length === 9 && row[0].value === -4 && row[8].value === 4 && row[4].value === 0,
    'the row runs −4 … 0 … +4 with zero in the middle');
  const gridHasStones = await ev(() => MM.maps.NUMBERLINE_ROW.every(r => MM.engine.state.grid[r.y][r.x] === 'n'));
  check(gridHasStones, 'every signed stone is a real walkable tile on the grid');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/nl-2-crossing.png` });

  // ---- 4) the signpost names the first target: "stand on −4" ----
  const firstTargetLine = await ev(() => MM.data.numberlineTargetLine(MM.engine.numberlineActiveTarget()));
  check(/−4/.test(firstTargetLine) && /Stand on/.test(firstTargetLine), 'the first target is "Stand on −4"');
  await ev(() => MM.engine.numberlineSignpost());
  await page.waitForTimeout(120);
  check(await ev(() => /−4/.test((document.getElementById('modalBox') || {}).innerText || '')), 'the signpost dialog shows the −4 target');
  await page.screenshot({ path: `${SHOTS}/nl-3-target-prompt.png`, clip: { x: 250, y: 150, width: 650, height: 420 } });
  await closeModals();

  // ---- 5) WALK to the target: up onto the row, then west to −4 ----
  // start (9,8): step up to the row (value 0), then west −1 −2 −3 −4.
  await ev(() => { const s = MM.engine.state; const st = MM.maps.NUMBERLINE_META.start; s.px = st.x; s.py = st.y; });
  await ev(() => { for (let i = 0; i < 3; i++) MM.engine.tryMove(0, -1); });   // up to (9,5) = stone 0
  const onZeroNudge = await logText();
  check(/0/.test(onZeroNudge) && /west/.test(onZeroNudge), 'standing on 0 (not the target) gives a gentle westward nudge');
  await ev(() => { for (let i = 0; i < 3; i++) MM.engine.tryMove(-1, 0); });   // west to −3
  const nudge = await logText();
  check(/−3/.test(nudge) && /west/.test(nudge), 'a wrong stone (−3) nudges: names it and points one more step west');
  check(!/wrong|not allowed|lose|no!|nope/i.test(nudge), 'the nudge never scolds');
  const stillOnLine = await ev(() => MM.engine.state.mapId === 'numberline');
  check(stillOnLine, 'a wrong stone never yanks the kid off the crossing (no punish)');
  await ev(() => MM.engine.tryMove(-1, 0));   // west onto −4: the target
  const hit1 = await ev(() => ({ idx: MM.engine.state.numberline.idx, log: (document.getElementById('log') || {}).innerText || '' }));
  check(hit1.idx === 1, 'walking onto the −4 stone satisfies the target and advances the crossing');
  check(/−4/.test(hit1.log), 'landing on −4 confirms the exact stone stood on');

  // ---- 6) a relative target computes correctly (anchored to where you stand) ----
  // target 1 = "two east of zero" → +2; solve it, then target 2 = "3 steps
  // west of where you stand" (from +2) → −1.
  const t1resolves = await ev(() => MM.engine.numberlineResolve(MM.engine.numberlineActiveTarget()));
  check(t1resolves === 2, 'target 2 resolves to +2 ("two east of zero")');
  await ev(() => {
    // walk east along the row from −4 to +2 (six steps east)
    const row = MM.maps.NUMBERLINE_ROW; const p2 = row.find(r => r.value === 2);
    while (MM.engine.state.px < p2.x && !MM.ui.modalOpen()) MM.engine.tryMove(1, 0);
  });
  const relResolves = await ev(() => MM.engine.numberlineResolve(MM.engine.numberlineActiveTarget()));
  check(relResolves === -1, 'the relative target anchors to the +2 stone → −1 (exact)');
  // walk west to −1 to finish the crossing
  await ev(() => {
    const row = MM.maps.NUMBERLINE_ROW; const n1 = row.find(r => r.value === -1);
    while (MM.engine.state.px > n1.x && !MM.ui.modalOpen()) MM.engine.tryMove(-1, 0);
  });
  await page.waitForTimeout(120);
  const done = await ev(() => ({ done: !!MM.engine.state.numberline.done, gold: MM.engine.state.gold, text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(done.done, 'standing every named stone completes the whole crossing');
  check(/crossing is yours|below nothing/i.test(done.text), 'completing the crossing shows the done moment');
  await closeModals();

  // ---- 7) switch OFF: the crossing shows a gentle note, never a locked wall ----
  await ev(() => { MM.engine.enterCastle && MM.engine.enterCastle(); MM.engine.state.parent.negatives = false; });
  await closeModals();
  check(await ev(() => !MM.engine.negativesOn()), 'negativesOn() is false once the switch is off');
  await ev(() => MM.engine.numberlineDoor());
  await page.waitForTimeout(120);
  const note = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', mapId: MM.engine.state.mapId }));
  check(note.open && /grown-up can open negative numbers/i.test(note.text), 'switch OFF: the crossing shows the gentle "a grown-up can open negative numbers" note');
  check(!/locked|barred|forbidden/i.test(note.text), 'the note is gentle — never a locked wall');
  check(note.mapId !== 'numberline', 'switch OFF does NOT enter the crossing');
  await page.screenshot({ path: `${SHOTS}/nl-4-switch-off-note.png`, clip: { x: 250, y: 150, width: 650, height: 420 } });
  await closeModals();

  // ---- 8) NONE of it in normal play (outside the mirror) ----
  const normalClean = await ev(() => {
    MM.engine.returnToFinishedKingdom();      // step back out of the glass
    MM.engine.state.parent.negatives = true;  // switch on, but not in the mirror
    if (MM.engine.negativesOn()) return { ok: false, why: 'negativesOn true outside the mirror' };
    if (MM.engine.state.mapId === 'numberline') return { ok: false, why: 'on the crossing outside the mirror' };
    MM.engine.numberlineDoor();               // must refuse: "a crossing that isn't here"
    if (MM.engine.state.mapId === 'numberline') return { ok: false, why: 'crossing opened outside the mirror' };
    return { ok: true, text: (document.getElementById('modalBox') || {}).innerText || '' };
  });
  check(normalClean.ok, 'outside the mirror there is no crossing (' + (normalClean.why || 'refused') + ')');
  check(/isn.t here|other side of the glass/i.test(normalClean.text || ''), 'outside the mirror the door explains itself, never a silent wall');
  await closeModals();

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
