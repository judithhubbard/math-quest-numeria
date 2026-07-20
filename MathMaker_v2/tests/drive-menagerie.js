// Drive Wave 17 — "The Menagerie". Post-ending, combat-free, the gentlest
// castle wave: the 'M' door is gated on endingDone; the befriended kinds
// populate the pens; bumping a creature offers to TEND it (a weakest-first
// review problem that RECORDS under its real skill — a wrong tend re-asks
// warmly, no loss); a creature settles in, grows, and earns a tiny hat; the
// Parade fires once at its milestone and not again; the Keeper joins the
// Faculty; a no-friends save shows the empty-pen "room for a friend" state.
// Screenshots: the nursery with creatures, a tending problem, a creature in a
// tiny hat, the parade, the keeper.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/tests/shots-menagerie';

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
  const clearModals = () => ev(() => { let n = 0; while (MM.ui.modalOpen() && n++ < 12) MM.ui.closeModal(); });
  const modalText = () => ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  // Answer the OPEN showProblem, then click Continue/Next to run its onEnd.
  async function answerProblem(right) {
    await page.waitForSelector('#modalBox #answerInput:enabled');
    const answer = right
      ? await ev(() => { const p = MM.ui.current; if (p.kind === 'remainder') return `${p.answer.q} r ${p.answer.r}`; const a = p.answer; return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`; })
      : '99999';
    await page.fill('#modalBox #answerInput', answer);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modalBox .btnrow button.primary');
  }
  const clickPrimary = async () => { await page.click('#modalBox .btnrow button.primary'); await page.waitForTimeout(120); };
  // A full correct tend of the kind `key`: open its tend, answer right, run onEnd.
  async function tendRight(key) {
    await ev((k) => { const cr = MM.engine.menagerieRoster().find(c => c.key === k); MM.engine.tendCreature(cr); }, key);
    await answerProblem(true);
    await clickPrimary();   // "Continue ➜" runs onEnd (faculty spawn / parade)
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'ZooKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ---- (1) the 'M' door is GATED on endingDone: pre-ending = a gentle "not yet"
  await ev(() => { const s = MM.engine.state; s.enrollSeen = true; MM.engine.enterCastle(); });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 22; s.py = 11; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump 'M' at (23,11)
  await page.waitForTimeout(150);
  const notYet = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', map: MM.engine.state.mapId }));
  check(notYet.open && /not yet/i.test(notYet.text), 'pre-ending: bumping the Menagerie door gives a gentle "not yet"');
  check(notYet.map === 'castle', 'pre-ending: the Menagerie does not open before the crown is won');
  await clearModals();

  // ---- become the crowned MathMaker WITH befriended kinds, enter via the door
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.enrollSeen = true;
    // Respecting parent switches (the tend contract): switch OFF the choice/
    // clock skills so every drawn tend is a plain typed-answer problem the drive
    // can answer deterministically. Tending honours these switches, so the pool
    // is now the typed-answer strands (weakest-first still steers within them).
    s.parent = { pin: null, topics: { decimals_ps: false, time_reading: false, music_reading: false, geometry: false } };
    s.bestiary.befriended = { Slime: 1, Bat: 1, Skeleton: 1 };   // three residents
    s.isles.pet = { species: 'blue', name: 'Sprout', stage: 1, hat: null, correct: 0 };  // the supervising pet
    MM.engine.enterCastle();
  });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 22; s.py = 11; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump 'M' → into the Menagerie
  await page.waitForTimeout(200);
  await clearModals();
  check(await ev(() => MM.engine.state.mapId === 'menagerie'), 'post-ending: the Menagerie door opens into the nursery');

  // ---- (2) the befriended roster POPULATES the pens: 3 kinds → 3 residents ----
  const roster = await ev(() => MM.engine.menagerieRoster().map(c => ({ key: c.key, sprite: c.sprite, x: c.slot.x, y: c.slot.y })));
  check(roster.length === 3, `the 3 befriended kinds appear as 3 residents (got ${roster.length})`);
  check(roster.every(c => c.sprite), 'every resident maps to a real catalog sprite');
  check(new Set(roster.map(c => `${c.x},${c.y}`)).size === 3, 'residents occupy distinct pen slots');
  await page.screenshot({ path: SHOTS + '/1-nursery.png' });

  // ---- (3) bump a creature → its social flavor + a Tend choice (blocks the tile)
  const first = roster[0];
  await ev((cr) => { const s = MM.engine.state; s.px = cr.x - 1; s.py = cr.y; MM.ui.refresh(); }, first);
  await ev(() => MM.engine.tryMove(1, 0));   // bump the resident
  await page.waitForTimeout(120);
  check(/Tend/.test(await modalText()), 'bumping a resident offers to TEND it');
  check(await ev((cr) => MM.engine.state.px === cr.x - 1, first), 'a resident blocks its pen tile (you cannot walk through it)');
  await clearModals();

  // ---- (4) TEND correct: records under the REAL skill + growth + happy;
  //          TEND wrong: a warm re-ask, no loss
  await ev((k) => { const cr = MM.engine.menagerieRoster().find(c => c.key === k); MM.engine.tendCreature(cr); }, first.key);
  await page.waitForSelector('#modalBox #answerInput:enabled');
  await page.screenshot({ path: SHOTS + '/2-tending.png' });
  const before = await ev(() => { const s = MM.engine.state; const sk = MM.ui.current.skill; return { hp: s.hp, skill: sk, att: (s.mastery[sk] || { attempts: 0 }).attempts, capped: MM.mastery.cappedSkills(s).includes(sk) }; });
  check(before.capped, 'a tend draws a weakest-first problem from the capped skill set (whole curriculum)');
  await answerProblem(false);
  const wrong = await ev(() => ({ fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', hp: MM.engine.state.hp, btn: (document.querySelector('#modalBox .btnrow button.primary') || {}).innerText || '' }));
  check(/patient|does not mind|never in a hurry|Nothing is lost/i.test(wrong.fb), 'a wrong tend is met with a warm re-ask, never a scold');
  check(wrong.hp === before.hp, 'a wrong tend never costs HP (no loss)');
  check(/Next/i.test(wrong.btn), 'a wrong tend re-asks (a Next button)');
  const afterWrong = await ev((sk) => ({ att: (MM.engine.state.mastery[sk] || { attempts: 0 }).attempts, tended: (MM.engine.state.menagerie.pets[MM.engine.menagerieRoster()[0].key] || { tended: 0 }).tended }), before.skill);
  check(afterWrong.att === before.att + 1, 'a tend records under its real skill (the miss counted)');
  check(afterWrong.tended === 0, 'a wrong tend does NOT advance growth');
  await page.click('#modalBox .btnrow button.primary');   // Next → re-ask the same tend
  await answerProblem(true);
  const afterRight = await ev((sk) => ({ fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', att: (MM.engine.state.mastery[sk] || { attempts: 0 }).attempts, tended: MM.engine.state.menagerie.pets[MM.engine.menagerieRoster()[0].key].tended, tends: MM.engine.state.menagerie.tends, kinds: MM.engine.state.menagerie.kindsTended }), before.skill);
  check(afterRight.att === before.att + 2, 'the correct tend records too, under the real skill');
  check(afterRight.tended === 1, 'a correct tend advances the creature (tended++)');
  check(afterRight.tends === 1 && afterRight.kinds === 1, 'a correct tend bumps the up-only counters (tends, kinds tended)');
  await clickPrimary();
  await clearModals();

  // ---- (5) grow the creature to Settled → it earns a tiny hat; screenshot it
  await tendRight(first.key);   // tended = 2
  await clearModals();
  await tendRight(first.key);   // tended = 3 → Settled + a hat
  await clearModals();
  const grown = await ev((k) => { const p = MM.engine.state.menagerie.pets[k]; return { stage: p.stage, hat: p.hat }; }, first.key);
  check(grown.stage >= 1, 'a creature stages up (Settled) at the PET_STAGES-style threshold');
  check(!!grown.hat && await ev((id) => !!MM.data.petHatById(id), grown.hat), 'a settled creature earns a real tiny hat');
  // stand beside the hatted creature and screenshot the field (hat legible at scale)
  await ev((cr) => { const s = MM.engine.state; s.px = cr.x - 1; s.py = cr.y; MM.engine.petPos = { x: cr.x - 1, y: cr.y + 1 }; MM.ui.refresh(); }, first);
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/3-hat.png' });

  // ---- (6) tend the other two kinds → Keeper joins the Faculty, then the Parade
  await tendRight(roster[1].key);   // kindsTended → 2: the Keeper comes due (spawn dialog in onEnd)
  const keeperNews = await modalText();
  check(/Keeper/i.test(keeperNews), 'reaching 2 kinds tended announces the Menagerie Keeper joining the Faculty');
  check(await ev(() => MM.engine.state.faculty.includes('keeper')), 'the Keeper post is recorded in s.faculty');
  await clearModals();
  await tendRight(roster[2].key);   // all present kinds tended → the Parade fires in onEnd
  await page.waitForTimeout(150);
  const parade = await ev(() => ({ text: (document.getElementById('modalBox') || {}).innerText || '', seen: MM.engine.state.menagerie.paradeSeen }));
  check(/Parade/i.test(parade.text), 'tending every present kind fires the once-ever Parade');
  check(parade.seen === true, 'the Parade sets paradeSeen (guards a re-fire)');
  await page.screenshot({ path: SHOTS + '/4-parade.png' });
  await clearModals();
  check(await ev(() => MM.engine.checkMenagerieParade() === false), 'the Parade never fires again (paradeSeen guard)');

  // ---- (7) the Keeper stands in the castle at its slot; bump it for its line
  await ev(() => MM.engine.enterCastle());
  await clearModals();
  const keeperAt = await ev(() => { const f = MM.engine.facultyAt(21, 11); return f && f.id; });
  check(keeperAt === 'keeper', 'the Keeper stands at its castle slot (a live overlay)');
  await ev(() => { const s = MM.engine.state; s.px = 21; s.py = 10; MM.engine.petPos = { x: 21, y: 9 }; MM.ui.refresh(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/5-keeper.png' });
  await ev(() => { const s = MM.engine.state; s.px = 20; s.py = 11; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump the Keeper at (21,11)
  await page.waitForTimeout(120);
  check(/Keeper/.test(await modalText()), 'bumping the Keeper gives its authored bump-line');
  await clearModals();

  // ---- (8) leaving the Menagerie lands beside its castle door ----
  await ev(() => MM.engine.enterMenagerie());
  await clearModals();
  await ev(() => MM.engine.exitMenagerie());
  await page.waitForTimeout(120);
  check(await ev(() => { const s = MM.engine.state; return s.mapId === 'castle' && s.px === 22 && s.py === 11; }), 'leaving the Menagerie lands you beside its castle door');

  // ---- (9) the empty-pen state on a NO-FRIENDS save (not a crash) ----
  await ev(() => {
    const s = MM.engine.state;
    s.bestiary.befriended = {};   // a kid who has soothed no one
    s.menagerie = { pets: {}, tends: 0, kindsTended: 0, paradeSeen: false, seen: false };
    MM.engine.enterMenagerie();
  });
  await page.waitForTimeout(150);
  const empty = await ev(() => ({ map: MM.engine.state.mapId, roster: MM.engine.menagerieRoster().length, text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(empty.map === 'menagerie' && empty.roster === 0, 'a no-friends save opens the nursery with an empty roster (no crash)');
  check(/room for a friend/i.test(empty.text), 'the empty nursery shows the "room for a friend" state, never a failure');
  await page.screenshot({ path: SHOTS + '/6-empty.png' });
  await clearModals();

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
