// Drive Wave 14 — "The Court". Post-ending, combat-free, gentle failure:
// the Herald opens a day-keyed queue of three applied cases that record under
// their real skill; a wrong ruling leaves the court baffled and re-asks (no
// scold, no loss); a full 3/3 session celebrates and grows the Faculty; the
// recurring Magistrate returns each session. Screenshots: the herald, a
// petitioner mid-case, the 3/3 celebration, a spawned Faculty NPC.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/tests/shots-court';

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
  const clearModals = () => ev(() => { let n = 0; while (MM.ui.modalOpen() && n++ < 8) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });
  // Answer the OPEN showProblem case. right=true submits the canonical answer.
  async function answerCase(right) {
    await page.waitForSelector('#modalBox #answerInput');
    const answer = right
      ? await ev(() => { const a = MM.ui.current.answer; return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`; })
      : '99999';
    await page.fill('#modalBox #answerInput', answer);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modalBox .btnrow button.primary');
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'CourtKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ---- (1) the herald is GATED on endingDone: pre-ending = a gentle "not yet"
  await ev(() => { const s = MM.engine.state; s.enrollSeen = true; MM.engine.enterCastle(); });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 17; s.py = 4; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, -1));    // bump the herald 'N' at (17,3)
  await page.waitForTimeout(150);
  const notYet = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(notYet.open && /not yet/i.test(notYet.text), 'pre-ending: bumping the herald gives a gentle "not yet"');
  check(!/petitioner/i.test(notYet.text) || /cannot sit/i.test(notYet.text), 'pre-ending: no court is held before the crown is won');
  await clearModals();

  // ---- become the crowned MathMaker ----
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.enrollSeen = true;
    MM.engine.enterCastle();
  });
  await clearModals();

  // ---- (2) bump the herald post-ending → the day's docket (3 cases) ----
  await ev(() => { const s = MM.engine.state; s.px = 17; s.py = 4; MM.ui.refresh(); });
  await page.screenshot({ path: SHOTS + '/1-herald.png' });   // the herald sprite, beside the throne
  await ev(() => MM.engine.tryMove(0, -1));    // bump the herald
  await page.waitForTimeout(150);
  const docket = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', n: document.querySelectorAll('#modalBox .btnrow button').length }));
  check(docket.open && /session/i.test(docket.text), 'post-ending: the herald opens the court');
  check(docket.n === 4, 'the docket lists 3 cases + a "not just now" button');
  const petitioners = await ev(() => MM.engine.state.court.cases.map(c => c.petitioner));
  check(/Magistrate/.test(petitioners[0]), 'the recurring Magistrate leads the docket');

  // record the day's problems, to prove day-keyed stability later
  const day0 = await ev(() => ({ date: MM.engine.state.court.date, texts: MM.engine.state.court.cases.map(c => c.problem.text) }));

  // ---- (3) hear the first case WRONG → baffled re-ask, no scold, no loss ----
  const before = await ev(() => { const s = MM.engine.state; const sk = s.court.cases[0].problem.skill; return { hp: s.hp, sk, att: (s.mastery[sk] || { attempts: 0 }).attempts }; });
  await page.click('#modalBox .btnrow button:nth-child(1)');   // hear the magistrate's case
  await page.waitForSelector('#modalBox #answerInput');
  await page.screenshot({ path: SHOTS + '/2-petitioner.png' });   // a petitioner mid-case
  await answerCase(false);
  const baffled = await ev(() => {
    const s = MM.engine.state;
    const sk = s.court.cases[0].problem.skill;
    return { fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', hp: s.hp, heard: s.court.cases[0].heard, att: (s.mastery[sk] || { attempts: 0 }).attempts, btn: (document.querySelector('#modalBox .btnrow button.primary') || {}).innerText || '' };
  });
  check(/Not quite/i.test(baffled.fb) && !/scold/i.test(baffled.fb), 'a wrong ruling is never a scold');
  check(baffled.hp === before.hp, 'a wrong ruling never costs HP (no loss)');
  check(baffled.heard === false, 'a wrong ruling does NOT settle the case');
  check(/Next/i.test(baffled.btn), 'a wrong ruling re-asks (a Next button, not Continue)');
  check(baffled.att === before.att + 1, 'a ruling records under the case\'s real skill (the miss counted)');

  // the Next button re-asks the SAME dispute
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForSelector('#modalBox #answerInput');
  const reasked = await ev(() => (MM.ui.current && MM.ui.current.text) || '');
  check(reasked === day0.texts[0], 'the re-ask presents the SAME case, not a new one');

  // ---- now rule correctly → settles + records + gratitude gift ----
  await answerCase(true);
  const settled = await ev(() => {
    const s = MM.engine.state;
    return { fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', heard: s.court.cases[0].heard, cases: s.casesHeard };
  });
  check(/Settled/.test(settled.fb), 'a correct ruling settles the dispute');
  check(/token of thanks/i.test(settled.fb), 'settling a case brings a gratitude gift');
  check(settled.heard === true && settled.cases >= 1, 'settling bumps the cases-heard counter (counts up)');
  await page.click('#modalBox .btnrow button.primary');   // Continue → back to the docket
  await page.waitForTimeout(150);

  // ---- (4) hear the remaining two → full 3/3 session celebration ----
  for (let i = 0; i < 2; i++) {
    // the docket dialog is open; click the first remaining case
    await ev(() => { if (!MM.ui.modalOpen()) MM.engine.holdCourt(); });
    await page.waitForTimeout(120);
    await page.click('#modalBox .btnrow button:nth-child(1)');
    await answerCase(true);
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForTimeout(150);
  }
  // after the third, re-opening the court fires the once-per-day celebration
  await ev(() => { if (!MM.ui.modalOpen()) MM.engine.holdCourt(); });
  await page.waitForTimeout(150);
  const celebrate = await ev(() => ({ text: (document.getElementById('modalBox') || {}).innerText || '', sessions: MM.engine.state.courtSessions }));
  check(/adjourned|well judged|full day/i.test(celebrate.text), 'a full 3/3 session triggers the celebration');
  check(celebrate.sessions === 1, 'a full session bumps courtSessions (counts up)');
  await page.screenshot({ path: SHOTS + '/3-celebration.png' });   // the 3/3 celebration
  await clearModals();

  // ---- (5) a Faculty post spawns at its milestone (Clerk at 1 session) ----
  const clerk = await ev(() => ({ has: MM.engine.state.faculty.includes('clerk'), at: MM.engine.facultyAt(21, 3) && MM.engine.facultyAt(21, 3).id }));
  check(clerk.has, 'the Court Clerk joins the Faculty at the first-session milestone');
  check(clerk.at === 'clerk', 'the Clerk stands at its castle slot (drawn as a live overlay)');
  // walk over to see the spawned Faculty NPC and screenshot it
  await ev(() => { const s = MM.engine.state; s.px = 20; s.py = 4; MM.ui.refresh(); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: SHOTS + '/4-faculty.png' });   // a spawned Faculty NPC in the castle
  // bumping the Clerk gives its authored line (blocks the tile like an NPC)
  await ev(() => { const s = MM.engine.state; s.px = 21; s.py = 4; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, -1));   // bump (21,3) = the Clerk
  await page.waitForTimeout(150);
  const clerkLine = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(clerkLine.open && /Clerk/.test(clerkLine.text), 'bumping the Clerk gives its authored bump-line');
  await clearModals();

  // ---- (6) the day-keyed queue is stable within a day, re-rolls across days ----
  const stable = await ev(() => {
    const s = MM.engine.state;
    const before = JSON.stringify(s.court.cases.map(c => c.problem.text));
    MM.engine.refreshCourt();
    return before === JSON.stringify(s.court.cases.map(c => c.problem.text));
  });
  check(stable, 'the queue is stable within a day (heard cases and all)');
  const rerolled = await ev(() => {
    const s = MM.engine.state;
    s.court.date = '2000-01-01';
    MM.engine.refreshCourt();
    return { newDate: s.court.date !== '2000-01-01', fresh: !s.court.cases.every(c => c.heard) };
  });
  check(rerolled.newDate && rerolled.fresh, 'a new day re-rolls a fresh queue');

  // ---- (7) the recurring petitioner returns, with an escalated grievance ----
  const magistrate = await ev(() => {
    const s = MM.engine.state;
    const first = s.court.cases[0];
    return { name: first.petitioner, isMag: first.magistrate, visits: s.magistrateVisits };
  });
  check(/Magistrate/.test(magistrate.name) && magistrate.isMag, 'the Magistrate returns in the next session');
  check(magistrate.visits >= 2, 'the Magistrate\'s visit counter climbs across sessions (grievances escalate)');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
