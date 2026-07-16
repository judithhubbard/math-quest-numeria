// Drive the Practice Yard (the Tutor) — the fluency-drill feature: the NPC on
// the overworld, the card wall (soft-locks + recommended-next), a real drill
// run earning a star, an unlock cascade, a milestone granting the charm + a
// pet hat, and the daily Tutor-directed challenge paying consumables. Every
// screenshot is meant to be LOOKED AT — a wall that doesn't read as a wall is
// a failure even if the assertions pass.
const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-yard');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 860 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'YardDrive');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ---- sprite + world placement ----
  const spriteErr = await ev(() => { try { MM.sprites.validate(); return null; } catch (e) { return e.message; } });
  check(!spriteErr, 'every sprite validates (incl. the Tutor)' + (spriteErr ? ' — ' + spriteErr : ''));

  const place = await ev(() => {
    const s = MM.engine.state; s.seenBattleHelp = true; s.seenCeremony = true;
    MM.engine.enterWorld();
    const tut = MM.maps.find(MM.maps.OVERWORLD, 'Y');
    s.px = tut[0].x - 1; s.py = tut[0].y;
    MM.engine.tryMove(1, 0); // bump the Tutor -> opens the Yard
    return { count: tut.length, open: MM.ui.modalOpen() };
  });
  check(place.count === 1, `exactly one Tutor ('Y') on the overworld (got ${place.count})`);
  check(place.open, 'bumping the Tutor opens the Practice Yard');
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/1-yard-panel.png' });

  // ---- the card wall ----
  const wall = await ev(() => ({
    h2: (document.querySelector('#modalBox h2') || {}).textContent || '',
    cards: document.querySelectorAll('.yard-card').length,
    unlocked: document.querySelectorAll('.yard-card[data-card]').length,
    rec: document.querySelectorAll('.yard-card.rec').length,
    challenge: !!document.getElementById('yardChallenge'),
  }));
  check(/Practice Yard/.test(wall.h2), 'the panel is titled the Practice Yard');
  check(wall.cards === 14, `14 cards on the wall (got ${wall.cards})`);
  check(wall.unlocked === 4, `4 cards unlocked at the start — doubles + the three anchor tables (got ${wall.unlocked})`);
  check(wall.rec === 1, `exactly one card is flagged as the recommended next (got ${wall.rec})`);
  check(wall.challenge, "the Tutor's daily challenge offers a Take-it-on button");

  // ---- run a real drill on the recommended card, answering all 8 right ----
  const recId = await ev(() => MM.engine.yardRecommended());
  await page.click('.yard-card.rec');
  await page.waitForTimeout(150);
  await page.click('text=Start the drill');
  await page.waitForTimeout(150);
  for (let q = 0; q < 8; q++) {
    const val = await ev(() => MM.ui.current ? String(MM.ui.current.answer.n) : null);
    if (val == null) { check(false, `drill ended early at question ${q}`); break; }
    await page.fill('#answerInput', val);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const btn = await page.$('#modalBox .btnrow button.primary');
    if (btn) await btn.click();
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: SHOTS + '/2-drill-result.png' });
  const afterDrill = await ev(id => ({ star: MM.engine.yardStar(id), unlockedNear: MM.engine.yardUnlocked('neardoubles') }), recId);
  // recommended-next is 'doubles' at a fresh start; each star is a clean run,
  // so a first clean 8/8 = bronze (1)
  check(afterDrill.star === 1, `a clean 8/8 earns Bronze (1 star) on ${recId} (got ${afterDrill.star})`);
  check(afterDrill.unlockedNear, "earning a star on Doubles unlocks its dependents (Near-doubles no longer locked)");

  // ---- a milestone: drive the three Number Sense cards to silver ----
  const ms = await ev(() => {
    const s = MM.engine.state;
    s.yard.stars.doubles = 2; s.yard.stars.neardoubles = 2; s.yard.stars.make10 = 1;
    // the completing clear pushes make10 to silver -> the milestone should fire
    const res = MM.engine.yardComplete('make10', 8, 8);
    return {
      claimed: !!s.yard.milestones.sense,
      charm: s.items.charms.includes('reckoner'),
      hat: s.petHats.includes('numberling'),
      milestonesInResult: (res.milestones || []).map(m => m.milestone.id),
    };
  });
  check(ms.claimed, 'the Number Sense milestone fires when its three cards reach silver');
  check(ms.charm, 'Number Sense grants the Ready Reckoner charm');
  check(ms.hat, 'Number Sense grants the Numberling Cap (a collectible pet hat)');
  check(ms.milestonesInResult.includes('sense'), 'yardComplete reports the newly-earned milestone');

  // ---- the daily challenge pays consumables on a solid clear of ITS card ----
  const chal = await ev(() => {
    const s = MM.engine.state;
    // Force a FRESH challenge: opening the panel already set today's, and an
    // earlier drill may have cleared it if the Tutor happened to pick that
    // card (correct behavior — clearing the card by any route counts). Reset
    // so this checks a first-time challenge clear deterministically.
    s.yard.challenge = null;
    const ch = MM.engine.yardChallenge();          // Tutor picks the card
    const potBefore = s.potions;
    const res = MM.engine.yardComplete(ch.card, 8, 8); // clear it cleanly
    return { card: ch.card, done: s.yard.challenge.done, gotPots: s.potions > potBefore, challengeDone: res.challengeDone };
  });
  check(!!chal.card, 'the Tutor chooses a daily challenge card');
  check(chal.challengeDone && chal.done, 'clearing the challenge card marks it done');
  check(chal.gotPots, 'the challenge pays out consumables (potions)');

  // ---- the Ready Reckoner charm: +2 on the first strike of a battle ----
  const reck = await ev(() => {
    const s = MM.engine.state;
    if (!s.charmsOn) s.charmsOn = [];
    if (!s.charmsOn.includes('reckoner')) s.charmsOn.push('reckoner');
    return { has: MM.engine.hasCharm('reckoner') };
  });
  check(reck.has, 'the Ready Reckoner charm can be worn (its +2 first-strike hook lives in battle.js)');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
