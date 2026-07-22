// Drive Wave 22 (Looking Glass P3): negatives enter GAMEPLAY. The two things
// that matter most, end-to-end: (1) signed arithmetic is EXACT and a typed
// negative grades correctly; (2) the gate is AIRTIGHT — with the switch ON in
// the mirror a signed combat problem appears; with the switch OFF (or outside
// the mirror) there are ZERO negatives and the Tweedle room shows a gentle
// grown-up note, never a locked wall. Also: the Tweedle additive-inverse room
// cancels an inverse pair to zero, and the Cheshire gives a negative hint.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = __dirname + '/shots-negatives';

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
  // Robust close: click through button-driven dialogs, but fall back to
  // MM.ui.closeModal() and a hard cap so a showProblem "Next" button (which does
  // NOT itself close the modal) can never spin the loop forever.
  const closeModals = () => ev(() => {
    for (let i = 0; i < 12 && MM.ui.modalOpen(); i++) {
      const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child');
      if (b) b.click();
      if (MM.ui.modalOpen()) MM.ui.closeModal();
    }
  });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'NegKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // a finished hero, stepped through the glass, with negatives switched ON
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.parent.negatives = true;
    MM.engine.startGolden();   // into the mirror (ngPlus -> 1)
  });
  await page.waitForTimeout(200);
  await closeModals();

  check(await ev(() => MM.engine.inMirror()), 'the hero is through the looking glass');
  check(await ev(() => MM.engine.negativesOn()), 'negativesOn() is true (mirror + switch on)');

  // ---- 1) the gate: signed combat problems DO appear in the mirror ----
  const sawSigned = await ev(() => {
    let n = 0; for (let i = 0; i < 300; i++) { const p = MM.mastery.combatProblem(MM.engine.state, 'addsub_facts'); if (p.signed) n++; } return n;
  });
  check(sawSigned > 0, 'with the switch ON, signed combat problems appear in the mirror loop');

  // ---- 2) a REAL generated signed problem renders + grades correctly ----
  const openSigned = () => ev(() => {
    // a deterministic signed problem so the drive can type its exact answer
    const p = MM.problems.signedBuild(7, -3, '+');   // 7 + (−3) = 4
    p.skill = 'addsub_facts'; p.tier = 1;
    window.__sp = p;
    window.__res = null;
    MM.ui.showProblem({
      header: '🗡 <b>A reflected Slime blocks the way.</b>',
      problem: p,
      onAnswer: (correct, kidAnswer) => { window.__res = { correct, kidAnswer }; },
      onNext: () => {}, onEnd: () => {},
    });
  });
  await openSigned();
  const probText = await ev(() => (document.querySelector('.prob-text') || {}).innerText || '');
  check(/7/.test(probText) && /−3|\(−3\)/.test(probText), 'the signed problem shows "7 + (−3)" with a clear unicode minus');
  check(!/[^−]-|--/.test(probText), 'no stray ASCII hyphen in the rendered signed problem');
  await page.screenshot({ path: `${SHOTS}/neg-1-signed-combat.png`, clip: { x: 250, y: 150, width: 650, height: 420 } });

  // type the negative-aware CORRECT answer (4)
  await ev(() => { document.getElementById('answerInput').value = '4'; });
  await page.click('#submitBtn');
  await page.waitForTimeout(120);
  let res = await ev(() => window.__res);
  check(res && res.correct === true, 'typing "4" for 7 + (−3) grades CORRECT (exact signed math)');

  // a problem whose ANSWER is negative: type "−3", accepted
  await ev(() => {
    const p = MM.problems.signedBuild(2, -5, '+');   // 2 + (−5) = −3
    p.skill = 'addsub_facts'; p.tier = 1;
    window.__res = null;
    MM.ui.showProblem({ header: 'x', problem: p, onAnswer: (c, k) => { window.__res = { correct: c, kidAnswer: k }; }, onNext: () => {}, onEnd: () => {} });
  });
  await ev(() => { document.getElementById('answerInput').value = '−3'; });
  await page.click('#submitBtn');
  await page.waitForTimeout(120);
  res = await ev(() => window.__res);
  check(res && res.correct === true, 'typing the unicode-minus "−3" for a negative answer is accepted');

  // ---- 3) a wrong sign re-asks GENTLY (shows the worked solution, never punishes) ----
  await ev(() => {
    const p = MM.problems.signedBuild(-4, 2, '×');   // −4 × 2 = −8
    p.skill = 'muldiv_facts'; p.tier = 1;
    window.__res = null;
    MM.ui.showProblem({ header: 'x', problem: p, onAnswer: (c, k) => { window.__res = { correct: c, kidAnswer: k }; }, onNext: () => {}, onEnd: () => {} });
  });
  await ev(() => { document.getElementById('answerInput').value = '8'; });   // wrong sign
  await page.click('#submitBtn');
  await page.waitForTimeout(120);
  res = await ev(() => window.__res);
  check(res && res.correct === false, 'typing "8" for −4 × 2 (wrong sign) is graded WRONG');
  check(await ev(() => /Not quite/.test((document.getElementById('feedback') || {}).innerText || '')), 'a wrong sign shows the gentle "Not quite" feedback');
  check(await ev(() => /−8/.test((document.getElementById('feedback') || {}).innerText || '')), 'the worked solution (…= −8) is shown after a miss');
  check(await ev(() => MM.ui.modalOpen()), 'the problem stays open after a wrong answer (re-ask, no crash, no punish)');
  await closeModals();

  // ---- 4) the Tweedle additive-inverse room: enter, cancel a pair to zero ----
  await ev(() => MM.engine.tweedleDoor());   // negativesOn -> enters the room
  await page.waitForTimeout(150);
  // entering fires the Cheshire's NEGATIVE hint (armCheshire({negative:true}))
  const cheshire = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(cheshire.open, 'entering the Tweedle room materializes the Cheshire');
  check(await ev(() => MM.data.CHESHIRE_NEG_LINES.some(l => (document.getElementById('modalBox') || {}).innerText.includes(l.slice(0, 24)))), 'the Cheshire gives a NEGATIVE-number hint at the threshold');
  await closeModals();

  check(await ev(() => MM.engine.state.mapId === 'tweedle'), 'the Tweedle room is entered');
  const socketReads = await ev(() => {
    // the carved socket equation renders "▢ + ▢ = 0" — the overlay draws "+"/"= 0"
    const r = MM.maps.TWEEDLE_ROOM; return !!(r && r.sockets.length === 2);
  });
  check(socketReads, 'the room has the two "▢ + ▢ = 0" sockets');
  await page.screenshot({ path: `${SHOTS}/neg-2-tweedle-room.png` });

  // Seat −5 by walking it straight up into socket (6,3). The engine pushes with
  // a push/walk rhythm (the player doesn't ride the slab, like the Wing), so we
  // press up and STOP the moment it lands on the socket — never over-push it off.
  const pushUpToSocket = (num, sockIdx) => ev(({ num, sockIdx }) => {
    const s = MM.engine.state; const t = MM.engine.ensureTweedle();
    const slab = t.slabs.find(sl => sl.num === num);
    const sock = MM.maps.TWEEDLE_ROOM.sockets[sockIdx];
    s.px = slab.x; s.py = slab.y + 1;
    for (let i = 0; i < 10; i++) {
      const cur = t.slabs.find(sl => sl.num === num);
      if (cur.x === sock.x && cur.y === sock.y) break;
      MM.engine.tryMove(0, -1);
      if (MM.ui.modalOpen()) break;   // the cancel dialog may fire on the seating push
    }
  }, { num, sockIdx });
  await pushUpToSocket(-5, 0);
  const firstSeated = await ev(() => {
    const t = MM.engine.state.tweedle; const neg5 = t.slabs.find(sl => sl.num === -5);
    const [sa] = MM.maps.TWEEDLE_ROOM.sockets; return neg5.x === sa.x && neg5.y === sa.y;
  });
  check(firstSeated, 'walking the −5 slab straight up seats it in the first socket');
  await page.screenshot({ path: `${SHOTS}/neg-3-tweedle-midsolve.png` });

  // seat +5 into socket (12,3): the pair now reads −5 + 5 → cancels to zero
  await pushUpToSocket(5, 1);
  const solved = await ev(() => ({ solved: !!MM.engine.state.tweedle.solved, open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(solved.solved, 'pushing +5 up to meet −5 cancels the pair — the room completes');
  check(/= 0|Contrariwise|nothing/.test(solved.text), 'the cancel-to-zero moment shows (Contrariwise / = 0)');
  await page.screenshot({ path: `${SHOTS}/neg-4-cancel-to-zero.png` });
  await closeModals();

  // ---- 5) switch OFF: ZERO negatives + the Tweedle room shows the gentle note ----
  await ev(() => { MM.engine.state.parent.negatives = false; });
  check(await ev(() => !MM.engine.negativesOn()), 'negativesOn() is false once the switch is off');
  const noNeg = await ev(() => {
    for (let i = 0; i < 800; i++) {
      const p = MM.mastery.combatProblem(MM.engine.state, 'addsub_facts');
      if (p.signed || (p.answer && p.answer.n < 0) || p.a < 0 || p.b < 0) return false;
      const q = MM.mastery.combatProblem(MM.engine.state, 'muldiv_facts');
      if (q.signed || (q.answer && q.answer.n < 0) || q.a < 0 || q.b < 0) return false;
    }
    return true;
  });
  check(noNeg, 'with the switch OFF, 1600 mirror combat draws produce ZERO negatives (airtight)');
  await ev(() => { MM.engine.enterCastle && MM.engine.enterCastle(); });
  await closeModals();
  await ev(() => MM.engine.tweedleDoor());   // negatives off -> the gentle note, not the room
  await page.waitForTimeout(120);
  const note = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', mapId: MM.engine.state.mapId }));
  check(note.open && /grown-up can open negative numbers/i.test(note.text), 'switch OFF: the Tweedle door shows the gentle "a grown-up can open negative numbers" note');
  check(!/locked|barred|forbidden/i.test(note.text), 'the note is gentle — never a locked wall');
  check(note.mapId !== 'tweedle', 'switch OFF does NOT enter the room');
  await page.screenshot({ path: `${SHOTS}/neg-5-switch-off-note.png`, clip: { x: 250, y: 150, width: 650, height: 420 } });
  await closeModals();

  // ---- 6) outside the mirror, the switch (even on) produces NO negatives ----
  const outsideClean = await ev(() => {
    MM.engine.returnToFinishedKingdom();          // step back out of the glass
    MM.engine.state.parent.negatives = true;      // switch on, but not in the mirror
    if (MM.engine.negativesOn()) return false;
    for (let i = 0; i < 600; i++) { const p = MM.mastery.combatProblem(MM.engine.state, 'addsub_facts'); if (p.signed || p.a < 0 || p.b < 0) return false; }
    return true;
  });
  check(outsideClean, 'outside the mirror, even with the switch on, there are ZERO negatives');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
