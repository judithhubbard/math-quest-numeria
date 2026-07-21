// Drive MathMaker v2 Wave 7 (EXPANSION_PLAN.md §7): The Open Castle — the
// ending. The gate (all 13 tasks + the Lamp + the Spire, and deliberately NOT
// the Halls), the four rooms, the Gallery of Ten, the Hall of Heroes, the
// Study's reveal, the INVERTED final exam (the kid grades the teacher), the
// coronation, "The Kingdom, Untangled" (skippable, replayable, and the last
// problem in the game), the epilogue pools, and Golden Numeria.
// Plus the carry-over: gear-plate readability (pips + a named gate + a glint).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-castle');

async function goto(page, x, y) { await page.evaluate(({ x, y }) => { const s = MM.engine.state; s.px = x; s.py = y; }, { x, y }); }
async function bump(page, key) { await page.keyboard.press(key); await page.waitForTimeout(160); }
async function dlgOk(page) { await page.waitForSelector('#dlgOk'); await page.click('#dlgOk'); await page.waitForTimeout(160); }

// Make an endgame hero: every task returned, the Lamp lit, the Spire ticking.
async function makeChampion(page) {
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14;
    s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.isles.lampLit = true;
    s.isles.spireDone = true;
    s.isles.gullwrackRebuilt = true;
    s.isles.breakwaterDone = true;
    s.level = 20; s.hp = s.maxhp = 200;
    s.seenBattleHelp = true; s.seenCeremony = true; s.metMiscount = true;
    MM.engine.save();
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  page.setDefaultTimeout(90000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Numeria');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // ---------- the gate ----------
  check(!(await page.evaluate(() => MM.engine.castleOpen())), 'the castle is shut for a brand-new hero');

  // 13 tasks alone is NOT enough — the sea has to be finished too
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  });
  check(!(await page.evaluate(() => MM.engine.castleOpen())), 'all 13 tasks alone does NOT open the castle');
  await goto(page, 19, 5);
  await bump(page, 'ArrowUp');   // bump 'C'
  const shutMsg = await page.textContent('#modalBox');
  check(/Great Lamp/.test(shutMsg) && /Clockwork Spire/.test(shutMsg),
    'the shut door SAYS what it is still waiting for (the Lamp, the Spire)');
  await dlgOk(page);

  // music must never be required — the Halls stay unbeaten for this whole run
  await makeChampion(page);
  check(await page.evaluate(() => MM.engine.castleOpen() && !MM.engine.state.isles.hallsDone),
    'the castle opens WITHOUT the Resonant Halls (music is a parent opt-in)');

  // ---------- the doors ----------
  await goto(page, 19, 5);
  await bump(page, 'ArrowUp');
  await page.waitForFunction(() => MM.engine.state.mapId === 'castle');
  check(true, 'bumping the castle now ENTERS it');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/1-castle.png' });
  check(await page.evaluate(() => MM.engine.state.monsters.length === 0), 'no monsters in the castle');

  // ---------- the Gallery of Ten ----------
  await goto(page, 3, 4);
  await bump(page, 'ArrowUp');            // plinth (3,3) — the first treasure
  const plinth1 = await page.textContent('#modalBox');
  check(/Copper Coin/.test(plinth1), 'a Gallery plinth replays the treasure you found there');
  check(/afraid of a slime/.test(plinth1), "...and it's the kid's OWN memory, not the item's stats");
  await dlgOk(page);
  await page.screenshot({ path: SHOTS + '/2-gallery.png' });

  // the crown's plinth reads differently before and after you wear it
  await goto(page, 7, 6);
  await bump(page, 'ArrowUp');            // plinth (7,5) — the tenth, the Crown
  const crownBefore = await page.textContent('#modalBox');
  check(/Crown of Numbers/.test(crownBefore) && /never seen him wear it/.test(crownBefore),
    'before the ending, the Crown still sits under glass');
  await dlgOk(page);

  // ---------- the Hall of Heroes ----------
  await goto(page, 19, 10);
  await bump(page, 'ArrowUp');
  const heroes = await page.textContent('#modalBox');
  check(/Hall of Heroes/.test(heroes) && /Numeria/.test(heroes), 'the Hall of Heroes lists this adventurer');
  check(/Keeper of the Light/.test(heroes), '...with the titles they actually earned');
  check(/No ranks, no scores/.test(heroes), '...and it is explicitly not a leaderboard');
  await page.screenshot({ path: SHOTS + '/3-heroes.png' });
  await dlgOk(page);

  // ---------- the throne, before ----------
  await goto(page, 19, 4);
  await bump(page, 'ArrowUp');
  check(/chalk dust/.test(await page.textContent('#modalBox')), 'the throne sits empty until the story is done');
  await dlgOk(page);

  // ---------- the Study: the reveal ----------
  await goto(page, 4, 11);
  await bump(page, 'ArrowUp');
  const reveal1 = await page.textContent('#modalBox');
  check(/mortar really is arithmetic/.test(reveal1) && /tangle/.test(reveal1),
    'the reveal NAMES the pattern: the kingdom is number-stuff, and monsters are tangles');
  await page.screenshot({ path: SHOTS + '/4-reveal.png' });
  await dlgOk(page);
  const reveal2 = await page.textContent('#modalBox');
  check(/Miscount/.test(reveal2) && /tending/.test(reveal2), 'Miscount says what actually went wrong: he stopped tending it');
  await dlgOk(page);
  const reveal3 = await page.textContent('#modalBox');
  check(/Heroes leave/.test(reveal3) && /Teachers multiply/.test(reveal3), '"Heroes leave. Teachers multiply."');
  await page.click('#modalBox .btnrow button.primary');   // take the chalk

  // ---------- the Final Exam, inverted ----------
  let flawedSeen = 0, cleanSeen = 0, lastSkill = null;
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('#modalBox .choice');
    const p = await page.evaluate(() => {
      const c = MM.ui.current;
      return { steps: c.steps.length, bad: c.badStep, ans: c.answer, skill: c.skill, nChoices: c.choices.length };
    });
    if (i === 0) await page.screenshot({ path: SHOTS + '/5-exam.png' });
    check(p.nChoices === p.steps + 1, `exam ${i + 1}: one button per step, plus "every step is correct"`);
    if (p.bad >= 0) flawedSeen++; else cleanSeen++;
    lastSkill = p.skill;
    if (i === 0) {
      // prove a WRONG mark is taught, never scolded — pick a good step on purpose
      const wrong = (p.ans + 1) % p.nChoices;
      await page.click(`#modalBox .choice >> nth=${wrong}`);
      await page.waitForSelector('.feedback');
      const fb = await page.textContent('#modalBox .feedback');
      // the point is that a mis-mark TEACHES: it points at the real step (or
      // confirms the slate really is clean). It never blames the kid.
      check(/that one's sound|really does hold up/i.test(fb),
        'a mis-mark is answered by SHOWING the real step — never by scolding');
      check(!/you (were|are) wrong|bad|stupid|failed/i.test(fb),
        '...and the feedback never blames the kid');
      await page.click('#modalBox .btnrow button.primary');
      await page.waitForTimeout(150);
      continue;
    }
    await page.click(`#modalBox .choice >> nth=${p.ans}`);
    await page.waitForSelector('#modalBox .btnrow button.primary');
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForTimeout(150);
  }
  check(flawedSeen >= 1, 'the exam plants a wrong step to be caught');
  check(cleanSeen >= 1, '...and serves a fully-correct slate, so "it\'s correct" is a live answer');
  check(lastSkill === 'addsub_facts', 'the LAST problem is a plain addition fact — the kind the game opened with');

  // the exam is grading, not practice: it must never touch the kid's mastery
  check(await page.evaluate(() => {
    const m = MM.engine.state.mastery || {};
    return !Object.keys(m).length;
  }), 'the exam never records against mastery — the kid is the GRADER here');

  // ---------- coronation ----------
  await page.waitForSelector('#modalBox h2');
  const crown = await page.textContent('#modalBox');
  check(/Crown of Numbers/.test(crown) && /new MathMaker/.test(crown), 'the coronation names you the new MathMaker');
  check(await page.evaluate(() => MM.engine.state.endingDone === true), 'endingDone is set');
  check(await page.evaluate(() => (MM.engine.state.titles || []).includes('The New MathMaker')), 'the title is stored');
  await page.screenshot({ path: SHOTS + '/6-coronation.png' });
  await page.click('#dlgOk');

  // ---------- "The Kingdom, Untangled" ----------
  await page.waitForFunction(() => MM.ui.cinematic());
  check(true, 'the cutscene starts from the coronation');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: SHOTS + '/7-untangle.png' });
  // every beat is skippable
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(140); }
  check(await page.evaluate(() => MM.ui.cinematic()), 'skipping beats does not tear the scene down');
  await page.keyboard.press('Space');   // finish the pull-back
  await page.waitForSelector('#modalBox #answerInput');
  await page.screenshot({ path: SHOTS + '/8-spiral.png' });
  const spiralQ = await page.textContent('.prob-text');
  check(/1  1  2  3  5  8  13/.test(spiralQ.replace(/\s+/g, '  ')) || /1 1 2 3 5 8 13/.test(spiralQ.replace(/\s+/g, ' ')),
    'the last problem in the game is the spiral: 1 1 2 3 5 8 13 ...');

  // a WRONG answer must teach, then accept — never block the ending
  await page.fill('#modalBox #answerInput', '9');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.feedback');
  const taught = await page.textContent('#modalBox .feedback');
  check(/8 \+ 13 = 21/.test(taught) && /two before it/.test(taught),
    'a wrong answer DRAWS the rule (8 + 13 = 21) instead of scolding');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOTS + '/9-credits.png' });
  await page.waitForFunction(() => !MM.ui.cinematic(), { timeout: 40000 });
  check(true, 'the cutscene ends cleanly and hands the world back');

  // ---------- the epilogue ----------
  await page.evaluate(() => { MM.engine.state.continent = 'west'; MM.engine.enterWorld(); });
  // Wave 9 ("The Tending"): the post-game practice loop wakes up the moment
  // the ending is done — marathon.js never reaches endingDone, so this is
  // the one place a full playthrough exercises it at all.
  check(await page.evaluate(() => MM.engine.spiralOpen()), 'post-ending: the Spiral Stair is open');
  check(await page.evaluate(() => !!(MM.engine.state.tangles && MM.engine.state.tangles.items.length)), 'post-ending: Daily Tangles start appearing on entering the world');
  const epi = await page.evaluate(() => ({
    sylvia: MM.data.NPCS.g.talk(MM.engine.state),
    percy: MM.data.NPCS.p.talk(MM.engine.state),
    callie: MM.data.NPCS.c.talk(MM.engine.state),
    maren: MM.data.NPCS.y.talk(MM.engine.state),
    barnaby: MM.data.NPCS.q.talk(MM.engine.state),
  }));
  check(/telescope/i.test(epi.sylvia), 'epilogue: Sylvia finally hands over the telescope');
  check(/nobody's finished drawing|working things out/i.test(epi.percy), 'epilogue: Percy opens the sequel door');
  check(/teach/i.test(epi.callie), 'epilogue: Callie is teaching the harbour children');
  check(/apprentices/i.test(epi.maren), 'epilogue: Maren has apprentices (and a rota)');
  check(/MathMaker/.test(epi.barnaby), 'epilogue: Barnaby finishes the ballad');
  const miscount = await page.evaluate(() => {
    let body = '';
    const orig = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (t, b) => { body = b; };
    MM.engine.miscountArena();
    MM.ui.dialogChoices = orig;
    return body;
  });
  check(/students|golems|Thursdays|explaining/i.test(miscount), 'epilogue: Miscount teaches now');

  // Pip runs the riddle contest
  const pip = await page.evaluate(() => {
    let body = '';
    const orig = MM.ui.dialog;
    MM.ui.dialog = (t, b) => { body = b; };
    MM.engine.talkNpc('h');
    MM.ui.dialog = orig;
    return body;
  });
  check(/riddle contest/i.test(pip), 'epilogue: Pip runs the riddle contest for other kids');

  // ---------- back in the castle, after ----------
  await page.evaluate(() => MM.engine.enterCastle());
  await page.waitForTimeout(200);
  // the one-time gag
  const enroll = await page.textContent('#modalBox');
  check(/tiny hat/.test(enroll) && /enroll/.test(enroll), 'post-credits: a monster in a tiny hat turns up to enrol');
  await dlgOk(page);

  await goto(page, 7, 6);
  await bump(page, 'ArrowUp');
  check(/You are wearing it/.test(await page.textContent('#modalBox')), 'the Crown\'s plinth is now empty — you are wearing it');
  await dlgOk(page);

  await goto(page, 4, 11);
  await bump(page, 'ArrowUp');
  check(/tidiest/.test(await page.textContent('#modalBox')), 'the Study is just a study now — two people arguing happily about long division');
  await dlgOk(page);

  // ---------- the throne: replay + the looking glass (Wave 20) ----------
  await goto(page, 19, 4);
  await bump(page, 'ArrowUp');
  const throne = await page.textContent('#modalBox');
  check(/Untangled/.test(throne), 'the throne offers a replay of the ending');
  check(/looking glass/i.test(throne), 'the throne offers to step through the looking glass');
  // replay works
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForFunction(() => MM.ui.cinematic());
  check(true, 'the ending is replayable from the throne');
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(120); }
  await page.waitForSelector('#modalBox #answerInput');
  await page.fill('#modalBox #answerInput', '21');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForFunction(() => !MM.ui.cinematic(), { timeout: 40000 });
  check(true, 'the replay accepts 21 and finishes');

  // Golden Numeria
  const before = await page.evaluate(() => {
    const s = MM.engine.state;
    return { level: s.level, badges: JSON.stringify(s.badges), kills: JSON.stringify(s.bestiary.kills), weapon: s.equipped.weapon };
  });
  await page.evaluate(() => MM.engine.startGolden());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const s = MM.engine.state;
    return {
      ngPlus: s.ngPlus, taskIndex: s.taskIndex, tasksDone: s.tasksDone.length,
      lamp: !!s.isles.lampLit, bosses: Object.keys(s.bossesDefeated).length,
      level: s.level, badges: JSON.stringify(s.badges), kills: JSON.stringify(s.bestiary.kills),
      weapon: s.equipped.weapon, stillMathMaker: !!s.endingDone,
    };
  });
  check(after.ngPlus === 1 && after.taskIndex === 1 && after.tasksDone === 0 && !after.lamp && after.bosses === 0,
    'Golden Numeria: the kingdom starts again (tasks, lamp, bosses all reset)');
  check(after.level === before.level && after.badges === before.badges && after.kills === before.kills && after.weapon === before.weapon,
    'Golden Numeria: the hero keeps everything (level, badges, book, gear)');
  check(after.stillMathMaker, 'Golden Numeria: you are still the MathMaker');
  // and the report card / book must NOT re-lock
  await page.evaluate(() => MM.ui.reportCard());
  const rc = await page.textContent('#modalBox');
  check(!/🔒/.test(rc), 'Golden Numeria never re-locks the report card');
  await dlgOk(page);

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
