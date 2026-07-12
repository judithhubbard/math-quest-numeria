// Drive MathMaker v2 Wave 4 (EXPANSION_PLAN.md §4): the Resonant Halls on
// Chime Isle — the fourth sail destination, music-reading problems (a
// treble-staff SVG + A-G choice, rhythm-as-fractions), echo doors (a tone-
// memory puzzle), singing stones, and the three carry-overs (spellbook
// tutorial + celebrations, clock numerals, Rope of Return).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-halls');

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

// shop rework (carry-over): click the right tab before any .shop-buy/.shop-sell —
// the shop stays on whatever tab was last picked, defaulting to Gear.
async function shopTab(page, name) {
  await page.click(`.shop-tab-btn[data-tab="${name}"]`);
  await page.waitForSelector(`.shop-tab-btn.active[data-tab="${name}"]`);
}

async function solveModalProblem(page) {
  const info = await page.evaluate(`(${canonicalize})(MM.ui.current)`);
  if (info.kind === 'choice') await page.click(`#modalBox .choice >> nth=${info.idx}`);
  else {
    await page.fill('#modalBox #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
}

async function answerBattle(page) {
  const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
  if (!info) return false;
  if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
  else {
    await page.fill('#battleProblem #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  return true;
}

async function winBattle(page) {
  for (let i = 0; i < 30; i++) {
    const victory = await page.$('#victOk');
    if (victory) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    await answerBattle(page);
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 15000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
}

// Solve the echo-door tone-memory modal by reading MM.ui.currentEcho (the
// same "expose the answer for drives" convention as MM.ui.current) and
// clicking the tones back in order once the buttons re-enable after playback.
async function solveEchoDoor(page) {
  await page.waitForSelector('#echoButtons .tone-btn');
  const seq = await page.evaluate(() => MM.ui.currentEcho);
  for (const tone of seq) {
    await page.waitForFunction((t) => {
      const b = document.querySelector(`.tone-btn[data-tone="${t}"]`);
      return b && !b.disabled;
    }, tone, { timeout: 10000 });
    await page.click(`.tone-btn[data-tone="${tone}"]`);
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => !MM.ui.modalOpen(), { timeout: 5000 });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'HallsKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // ---------- carry-over 1: spellbook tutorial + celebration ----------
  // 2026-07-12: help is progressive now — the Spellbook section must be
  // ABSENT before the first gold badge and appear once one exists.
  const helpHtml = () => page.evaluate(() => {
    let html = '';
    const origDialog = MM.ui.dialog;
    MM.ui.dialog = (title, body) => { html = body; };
    MM.ui.helpDialog();
    MM.ui.dialog = origDialog;
    return html;
  });
  check(!/utility spells/.test(await helpHtml()), 'Help hides the Spells section before any gold badge');

  const celebration = await page.evaluate(() => {
    const s = MM.engine.state;
    s.badges = { addsub_facts: 3, muldiv_facts: 3, multidigit_addsub: 3 };
    MM.engine.checkSpellUnlocks();
    MM.engine.save();
    MM.ui.refresh();
    return document.getElementById('modalBox').innerText;
  });
  check(/click/i.test(celebration), 'Scout unlock celebration contains the word "click"');
  await page.click('#dlgOk');
  await page.waitForTimeout(100);
  const secondPop = await page.evaluate(() => MM.ui.modalOpen());
  check(!secondPop, 'unlock celebration pops exactly once (no duplicate re-shown)');
  check(/utility spells/.test(await helpHtml()), 'Help shows the Spells section once a gold badge exists');
  const blinkTitle = await page.evaluate(() => {
    const el = document.getElementById('spellRow');
    return el ? el.innerHTML : '';
  });
  // Blink isn't unlocked yet (needs 6 gold badges) so it shouldn't render at
  // all; assert the OUTSIDE-dungeon disabled title instead, on Scout, which IS unlocked.
  check(/title="[^"]+"/.test(blinkTitle), 'a disabled spell button carries a title attribute');

  // ---------- carry-over 2: Rope of Return ----------
  await page.evaluate(() => { MM.engine.state.gold = 500; MM.engine.save(); });
  await page.evaluate(() => MM.ui.openShop());
  await page.waitForSelector('.shop-tabs');
  await shopTab(page, 'supplies');
  await page.waitForSelector('[data-kind="rope"]');
  await page.click('[data-kind="rope"]');
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(200);
  await page.evaluate(() => MM.ui.closeModal());
  const ropeCount = await page.evaluate(() => MM.engine.state.items.ropes);
  check(ropeCount === 1, `rope purchased (count=${ropeCount})`);
  await page.evaluate(() => MM.ui.openBag());
  await page.waitForSelector('#useRope');
  const ropeDisabledOverworld = await page.$eval('#useRope', b => b.disabled);
  const ropeTitleOverworld = await page.$eval('#useRope', b => b.title);
  check(ropeDisabledOverworld && ropeTitleOverworld.length > 0, 'rope Use button greyed out with a tooltip on the overworld');
  await page.click('#bagClose');

  // ---------- endgame setup: all prior lenses + Spire done, sail to Chime ----------
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.seenCeremony = true; s.difficulty = 'story';
    s.gear = { weapon: ['stick', 'tidal'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'] };
    s.equipped = { weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
    s.level = 20; s.maxhp = 120; s.hp = 120;
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.lampLit = true; s.isles.spireDone = true;
    s.unsealed = { d20: true }; // skip the seal exam — Wave 4 is about the Halls itself
    s.continent = 'horologe';
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  const dockOffersChime = await page.evaluate(() => {
    let seen = false;
    const orig = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (title, body, choices) => { seen = choices.some(c => /Chime/.test(c.label)); };
    MM.engine.horologeDock();
    MM.ui.dialogChoices = orig;
    return seen;
  });
  check(dockOffersChime, "Horologe's dock offers a fourth leg to Chime Isle once the Spire is done");

  await page.evaluate(() => {
    const s = MM.engine.state;
    s.continent = 'chime';
    MM.engine.enterWorld();
    MM.engine.save();
  });
  check(await page.evaluate(() => MM.engine.state.mapId === 'chime'), 'arrived on Chime Isle');
  await page.screenshot({ path: SHOTS + '/1-chime-overworld.png' });

  // Wave 7.1: approach from below — (14,2) was a trap tile, now sealed
  // mountain; the drive should walk a path a real kid can
  await page.evaluate(() => { const s = MM.engine.state; s.px = 15; s.py = 3; });
  await page.keyboard.press('ArrowUp'); // bump the '6' at (15,2)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f0');
  check(true, 'entered the Resonant Halls (4 floors, dungeon 20)');

  // ---------- floor 1: key/lock, singing stone, echo door ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 4; s.py = 6; });
  await page.keyboard.press('ArrowRight'); // key at (5,6)
  check(await page.evaluate(() => MM.engine.state.isles.keys.d20 === 1), 'floor 1: key picked up');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 14; s.py = 2; });
  await page.keyboard.press('ArrowRight'); // approach the locked door at (15,2) from the left
  check(await page.evaluate(() => MM.engine.state.grid[2][15] === '.' && MM.engine.state.isles.keys.d20 === 0),
    'floor 1: key opens the locked door');
  // walk across a singing stone (pure flavor — just confirm no crash/state change)
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 2; });
  await page.keyboard.press('ArrowRight'); // onto a singing stone at (6,2)
  check(true, 'singing stone stepped on without error');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 16; s.py = 6; });
  await page.keyboard.press('ArrowRight'); // bump the echo door at (17,6)
  await solveEchoDoor(page);
  check(await page.evaluate(() => MM.engine.state.grid[6][17] === '.'), 'echo door: opened after repeating the tone sequence');
  await page.screenshot({ path: SHOTS + '/2-echo-door-solved.png' });

  await page.evaluate(() => { const s = MM.engine.state; s.px = 21; s.py = 11; });
  await page.keyboard.press('ArrowRight'); // descend at (22,11)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f1');
  check(true, 'floor 1 complete — descending to floor 2');

  // ---------- floor 2: use the Rope of Return here, then come back ----------
  await page.evaluate(() => MM.ui.openBag());
  await page.waitForSelector('#useRope');
  const ropeEnabledInDungeon = await page.$eval('#useRope', b => !b.disabled);
  check(ropeEnabledInDungeon, 'rope Use button enabled inside a dungeon');
  await page.click('#useRope');
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForFunction(() => MM.engine.state.mapId === 'chime');
  const ropesAfterUse = await page.evaluate(() => MM.engine.state.items.ropes);
  check(ropesAfterUse === 0, `rope consumed on use (left=${ropesAfterUse})`);
  await page.evaluate(() => { MM.engine.save(); MM.engine.load('HallsKid'); });
  check(await page.evaluate(() => MM.engine.state.items.ropes === 0), 'rope count persists through save/load');

  // back on the Chime overworld now — re-bump '6' to re-enter the Halls;
  // floor 0's opened doors are remembered via s.opened, so this replays clean
  await page.evaluate(() => { const s = MM.engine.state; s.px = 15; s.py = 3; });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f0');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 21; s.py = 11; });
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f1');

  // ---------- floor 2: the classic one-shot lever ----------
  check(await page.evaluate(() => MM.engine.state.grid[7][8] === 'G'), 'floor 2: the gates start closed');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 3; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // pull the lever at (4,3)
  check(await page.evaluate(() => [8, 13, 18].every(x => MM.engine.state.grid[7][x] === '.')),
    'floor 2: the lever opens every gate on this floor');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 22; s.py = 3; });
  await page.keyboard.press('ArrowRight'); // descend at (23,3)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f2');
  check(true, 'floor 2 complete — descending to floor 3');

  // ---------- floor 3: second echo door + secret wall ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 13; s.py = 6; });
  await page.keyboard.press('ArrowRight'); // bump the second echo door at (14,6)
  await solveEchoDoor(page);
  check(await page.evaluate(() => MM.engine.state.grid[6][14] === '.'), 'floor 3: second echo door opened');

  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 2; });
  await page.keyboard.press('ArrowRight'); // bump the secret wall at (20,2)
  check(await page.evaluate(() => MM.engine.state.grid[2][20] === '.'), 'floor 3: secret wall opens');
  await page.keyboard.press('ArrowRight'); // walk onto now-open (20,2)
  await page.keyboard.press('ArrowRight'); // walk onto the chest at (21,2)
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(200);

  await page.evaluate(() => { const s = MM.engine.state; s.px = 22; s.py = 6; });
  await page.keyboard.press('ArrowRight'); // descend at (23,6)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd20f3');
  check(true, 'floor 3 complete — descending to floor 4, the boss floor');

  // ---------- floor 4: The Discord ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 13; s.py = 8; });
  await page.keyboard.press('ArrowUp'); // bump the boss at (13,7)
  await page.waitForSelector('#battleProblem', { timeout: 5000 });
  await page.waitForTimeout(800);
  await winBattle(page);
  check(await page.evaluate(() => MM.engine.state.isles.hallsDone === true), 'The Discord is beaten — hallsDone set');
  check(await page.evaluate(() => MM.engine.state.bossesDefeated['d20f3'] === true), 'boss recorded in bossesDefeated');
  await page.screenshot({ path: SHOTS + '/3-boss-beaten.png' });

  // ---------- music_reading: staff (choice) + rhythm (fraction) direct checks ----------
  // opt in so these render regardless of the default-off setting
  await page.evaluate(() => { MM.engine.state.parent.topics.music_reading = true; MM.engine.save(); });
  const staffProblem = await page.evaluate(() => {
    let p;
    do { p = MM.problems.generate('music_reading', 3); } while (p.kind !== 'choice');
    return p;
  });
  check(!!staffProblem.svg && /<svg/.test(staffProblem.svg), 'staff problem renders an inline SVG treble staff');
  await page.evaluate((p) => {
    MM.ui.showProblem({ header: 'Test', problem: p, onAnswer: () => ({ end: 'win' }), onNext: () => {}, onEnd: () => {} });
  }, staffProblem);
  await page.waitForSelector('#modalBox .prob-svg svg');
  await page.screenshot({ path: SHOTS + '/4-staff-problem.png' });
  await page.click(`#modalBox .choice >> nth=${staffProblem.answer}`);
  await page.waitForSelector('#modalBox .btnrow button.primary');
  const staffFeedback = await page.evaluate(() => document.querySelector('#modalBox .right') ? 'right' : 'wrong');
  check(staffFeedback === 'right', 'A-G choice flow: clicking the correct letter is accepted');
  await page.click('#modalBox .btnrow button.primary');

  const rhythmProblem = await page.evaluate(() => {
    let p;
    do { p = MM.problems.generate('music_reading', 3); } while (p.kind !== 'number');
    return p;
  });
  check(/note/.test(rhythmProblem.text), 'rhythm problem asks about note values');
  await page.evaluate((p) => {
    MM.ui.showProblem({ header: 'Test', problem: p, onAnswer: () => ({ end: 'win' }), onNext: () => {}, onEnd: () => {} });
  }, rhythmProblem);
  await page.waitForSelector('#modalBox #answerInput');
  const rhythmAnswer = await page.evaluate((p) => p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}`, rhythmProblem);
  await page.fill('#modalBox #answerInput', rhythmAnswer);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#modalBox .btnrow button.primary');
  const rhythmFeedback = await page.evaluate(() => document.querySelector('#modalBox .right') ? 'right' : 'wrong');
  check(rhythmFeedback === 'right', `rhythm-as-fractions answer "${rhythmAnswer}" accepted`);
  await page.click('#modalBox .btnrow button.primary');

  // ---------- parent switch OFF hides music problems entirely ----------
  const leakCheck = await page.evaluate(() => {
    const st = { parent: { topics: { music_reading: false } } };
    for (let i = 0; i < 500; i++) {
      const p = MM.mastery.pickArenaProblem(st);
      if (p.skill === 'music_reading' || p.kind === 'staff') return false;
    }
    return true;
  });
  check(leakCheck, 'parent switch OFF hides music_reading from 500 arena picks');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
