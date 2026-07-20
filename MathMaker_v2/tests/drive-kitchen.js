// Drive Wave 16 — "The Kitchen Garden". Post-ending, combat-free, gentle
// failure: the 'K' door is gated on endingDone; the seed bench plants an r×c
// ARRAY that records under muldiv_facts (a wrong count re-asks gently); the
// harvest yields ingredients; the kitchen scales a recipe (records under a
// fraction skill), a wrong measure makes a named DISASTER DISH (no loss) and
// the pet reacts, a correct measure makes a real dish + a food grant; the
// Gardener/Cook join the Faculty at their milestones. Screenshots: a planted
// array, the count problem, a recipe modal, a disaster dish, the sous-chef,
// a Faculty post.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/tests/shots-kitchen';

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
  // close any open modal(s) directly — bulletproof, and skips onClose/onEnd
  // side effects (the drive drives garden state through direct E.* calls).
  const clearModals = () => ev(() => { let n = 0; while (MM.ui.modalOpen() && n++ < 12) MM.ui.closeModal(); });
  const modalText = () => ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  // Answer the OPEN showProblem. right=true submits the canonical answer.
  async function answerProblem(right) {
    await page.waitForSelector('#modalBox #answerInput:enabled');
    const answer = right
      ? await ev(() => { const a = MM.ui.current.answer; return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`; })
      : '99999';
    await page.fill('#modalBox #answerInput', answer);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modalBox .btnrow button.primary');
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'GardenKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ---- (1) the 'K' door is GATED on endingDone: pre-ending = a gentle "not yet"
  await ev(() => { const s = MM.engine.state; s.enrollSeen = true; MM.engine.enterCastle(); });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 22; s.py = 9; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump 'K' at (23,9)
  await page.waitForTimeout(150);
  const notYet = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', map: MM.engine.state.mapId }));
  check(notYet.open && /not yet/i.test(notYet.text), 'pre-ending: bumping the garden door gives a gentle "not yet"');
  check(notYet.map === 'castle', 'pre-ending: the garden does not open before the crown is won');
  await clearModals();

  // ---- become the crowned MathMaker and enter the garden via its door ----
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.enrollSeen = true;
    s.isles.pet = { species: 'blue', name: 'Sprout', stage: 1, hat: null, correct: 0 };  // so dish reactions show
    MM.engine.enterCastle();
  });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 22; s.py = 9; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump 'K' → into the garden
  await page.waitForTimeout(200);
  await clearModals();
  check(await ev(() => MM.engine.state.mapId === 'garden'), 'post-ending: the garden door opens into the Kitchen Garden');
  await page.screenshot({ path: SHOTS + '/1-garden.png' });

  // ---- (2) the seed bench offers to plant; plant a 3×4 ARRAY ----
  await ev(() => { const s = MM.engine.state; s.px = 3; s.py = 3; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, -1));   // bump the seed bench 'B' at (3,2)
  await page.waitForTimeout(120);
  check(/Plant a patch/.test(await modalText()), 'the seed bench offers to plant a patch');
  await clearModals();
  const planted = await ev(() => {
    MM.engine.gardenPlant(3, 4);   // plant the rectangle (the array fills in)
    const g = MM.engine.state.garden;
    return { rows: g.plot && g.plot.rows, cols: g.plot && g.plot.cols, cells: g.plot && g.plot.cells.length, ready: g.ready };
  });
  check(planted.rows === 3 && planted.cols === 4 && planted.cells === 12, 'a 3×4 plot fills 12 seedlings (the array is planted)');
  check(planted.ready === false, 'a freshly-planted patch is not ready until counted');
  // close the "planted"→count chain WITHOUT counting yet (leave the count), so
  // the field is clear for a screenshot of the array itself
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 10; s.py = 4; MM.ui.refresh(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/2-planted-array.png' });
  check(await ev(() => !MM.ui.modalOpen() && !MM.engine.state.garden.ready), 'the array stands planted (uncounted) with the field clear');

  // ---- (3) count the array: a WRONG count re-asks gently, a RIGHT one grows it
  await ev(() => MM.engine.gardenCount());   // opens the count problem
  await page.waitForSelector('#modalBox #answerInput:enabled');
  await page.screenshot({ path: SHOTS + '/3-count-problem.png' });
  const beforeCount = await ev(() => { const s = MM.engine.state; return { hp: s.hp, att: (s.mastery.muldiv_facts || { attempts: 0 }).attempts }; });
  await answerProblem(false);
  const miscount = await ev(() => ({ fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', hp: MM.engine.state.hp, ready: MM.engine.state.garden.ready, att: (MM.engine.state.mastery.muldiv_facts || { attempts: 0 }).attempts, btn: (document.querySelector('#modalBox .btnrow button.primary') || {}).innerText || '' }));
  check(/Not quite/i.test(miscount.fb), 'a wrong count is met with a gentle "not quite", never a scold');
  check(miscount.hp === beforeCount.hp, 'a wrong count never costs HP (no loss)');
  check(miscount.ready === false, 'a wrong count does NOT grow the patch');
  check(/Next/i.test(miscount.btn), 'a wrong count re-asks (a Next button)');
  check(miscount.att === beforeCount.att + 1, 'a count records under muldiv_facts (the miss counted)');
  await page.click('#modalBox .btnrow button.primary');   // Next → re-ask the SAME count
  await answerProblem(true);
  const counted = await ev(() => ({ ready: MM.engine.state.garden.ready, att: (MM.engine.state.mastery.muldiv_facts || { attempts: 0 }).attempts, fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '' }));
  check(counted.ready === true, 'a correct count grows the patch (ready to harvest)');
  check(counted.att === beforeCount.att + 2, 'the correct count records too, under muldiv_facts');
  check(/12 seedlings/.test(counted.fb), 'the correct count is celebrated with the true total');
  await clearModals();

  // ---- (4) harvest the array → fresh ingredients + the harvests counter ----
  const harv = await ev(() => {
    const g0 = { ing: MM.engine.state.garden.ingredients, harv: MM.engine.state.garden.harvests };
    MM.engine.gardenHarvest();
    const g = MM.engine.state.garden;
    return { before: g0, ing: g.ingredients, harv: g.harvests, plot: g.plot };
  });
  await clearModals();
  check(harv.ing === harv.before.ing + 12 && harv.harv === harv.before.harv + 1, 'harvesting a 3×4 array yields 12 ingredients and bumps the harvests counter');
  check(harv.plot === null, 'harvesting clears the plot to bare soil');

  // ---- (5) the sous-chef greets you (bump 'S' at (18,2)) ----
  await ev(() => { const s = MM.engine.state; s.px = 17; s.py = 2; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump the sous-chef
  await page.waitForTimeout(120);
  check(/Sous-Chef|cook/i.test(await modalText()), 'the sous-chef greets you at the kitchen');
  await page.screenshot({ path: SHOTS + '/4-sous-chef.png' });
  await clearModals();

  // ---- (6) cook: a WRONG measure → a named DISASTER DISH, no loss, pet reacts
  await ev(() => MM.engine.cookStation());   // ingredients are stocked from the harvest
  await page.waitForSelector('#modalBox #answerInput:enabled');
  await page.screenshot({ path: SHOTS + '/5-recipe.png' });
  const cookSkill = await ev(() => MM.ui.current.skill);
  check(cookSkill === 'fractions_as' || cookSkill === 'fractions_m', 'a recipe draws a real fraction problem (records under a fraction skill)');
  const beforeCook = await ev(() => { const s = MM.engine.state; return { hp: s.hp, att: (s.mastery[MM.ui.current.skill] || { attempts: 0 }).attempts, skill: MM.ui.current.skill }; });
  await answerProblem(false);
  const disaster = await ev(() => ({ fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', hp: MM.engine.state.hp, dish: MM.engine._lastDish, emote: MM.engine.petEmote, btn: (document.querySelector('#modalBox .btnrow button.primary') || {}).innerText || '' }));
  check(disaster.dish && disaster.dish.disaster === true, 'a wrong measure makes a DISASTER dish');
  check(/Regret Soup|Sandwich|Porridge|Pudding|Loaf|Casserole/.test(disaster.fb), 'the disaster dish is gloriously named in the result');
  check(disaster.hp === beforeCook.hp, 'a disaster dish never costs HP (never a loss)');
  check(/Next/i.test(disaster.btn), 'a disaster re-asks (a Next button — still no loss)');
  check(!!disaster.emote && Date.now() < disaster.emote.until, 'the pet reacts to the disaster dish (an emote pops)');
  await page.screenshot({ path: SHOTS + '/6-disaster.png' });

  // ---- (7) cook it right → the real dish + a food grant + records the skill
  await page.click('#modalBox .btnrow button.primary');   // Next → re-ask
  const foodBefore = await ev(() => Object.values(MM.engine.state.items.food).reduce((n, v) => n + v, 0));
  await answerProblem(true);
  const dishDone = await ev(() => ({ fb: (document.querySelector('#modalBox .feedback') || {}).innerText || '', dishes: MM.engine.state.garden.dishes, food: Object.values(MM.engine.state.items.food).reduce((n, v) => n + v, 0), dish: MM.engine._lastDish }));
  const cookAtt = await ev((sk) => (MM.engine.state.mastery[sk] || { attempts: 0 }).attempts, beforeCook.skill);
  check(/made exactly right|larder/i.test(dishDone.fb), 'a correct measure makes the real dish');
  check(dishDone.dish && dishDone.dish.disaster === false, 'the correct dish is the real recipe, not a disaster');
  check(dishDone.dishes >= 1, 'a real dish bumps the dishes counter (counts up)');
  check(dishDone.food > foodBefore, 'a correct dish feeds the real food economy (a food grant)');
  check(cookAtt === beforeCook.att + 2, 'the measure records under the fraction skill (both tries)');
  await clearModals();

  // ---- (8) the Gardener + Cook join the Faculty at their milestones ----
  await ev(() => { const s = MM.engine.state; s.garden.harvests = 2; s.garden.dishes = 3; });
  const claimed = await ev(() => MM.engine.checkFaculty().map(p => p.id));
  check(claimed.includes('gardener') && claimed.includes('cook'), 'the Gardener and Cook join the Faculty at their milestones');
  check(await ev(() => MM.engine.state.faculty.includes('gardener') && MM.engine.state.faculty.includes('cook')), 'both posts are recorded in s.faculty');
  // back to the castle, walk over to the Gardener (20,10) and screenshot it
  await ev(() => MM.engine.enterCastle());
  await clearModals();
  const gardenerAt = await ev(() => { const f = MM.engine.facultyAt(20, 10); return f && f.id; });
  check(gardenerAt === 'gardener', 'the Gardener stands at its castle slot (a live overlay)');
  await ev(() => { const s = MM.engine.state; s.px = 20; s.py = 9; MM.ui.refresh(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/7-faculty.png' });
  await ev(() => { const s = MM.engine.state; s.px = 19; s.py = 10; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));   // bump the Gardener at (20,10)
  await page.waitForTimeout(120);
  check(/Gardener/.test(await modalText()), 'bumping the Gardener gives its authored bump-line');
  await clearModals();

  // ---- (9) leaving the garden lands beside its castle door ----
  await ev(() => MM.engine.enterGarden());
  await clearModals();
  await ev(() => MM.engine.exitGarden());
  await page.waitForTimeout(120);
  check(await ev(() => { const s = MM.engine.state; return s.mapId === 'castle' && s.px === 22 && s.py === 9; }), 'leaving the garden lands you beside its castle door');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
