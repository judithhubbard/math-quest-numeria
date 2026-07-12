// Drive MathMaker v2 Monster Book: undiscovered ??? cards, the seen-but-not-
// defeated state after fleeing, card reveal (flavor + count) after a real
// battle victory, discovery counter, and save/load persistence.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-book');

async function answerCurrent(page) {
  const info = await page.evaluate(() => {
    const p = MM.battle.current;
    if (!p) return null;
    if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
    if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
    if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
    return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
  });
  if (!info) return false;
  if (info.kind === 'choice') {
    await page.click(`#battleProblem .choice >> nth=${info.idx}`);
  } else {
    await page.fill('#battleProblem #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  return true;
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
  await page.fill('#newName', 'BookKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // fresh book: everything undiscovered
  await page.keyboard.press('m');
  await page.waitForSelector('#modalBox h2');
  let body = await page.textContent('#modalBox');
  check(/Discovered: 0 of 77/.test(body.replace(/\s+/g, ' ')), 'fresh book: 0 of 77 discovered');
  check(/\?\?\?/.test(body), 'fresh book: cards show ???');
  check(!/Sparring Ground/.test(body), 'golem page hidden before meeting Miscount');
  check(/pages are still blank/.test(body), 'blank-pages note shown early');
  await page.screenshot({ path: SHOTS + '/1-fresh-book.png' });
  await page.click('#dlgOk');

  // castle intro (get task 1), then into dungeon 1; skip first-battle help
  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 5; s.seenBattleHelp = true; s.seenCeremony = true; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  await page.click('#dlgOk');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 10; });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd1');

  // encounter + flee: monster becomes "seen" but stays undefeated —
  // and heals back to FULL (fleeing must not be a free problem-skip)
  const beastName = await page.evaluate(() => {
    const s = MM.engine.state;
    const m = s.monsters.find(x => x.hp > 0 && !x.boss);
    m.hp = m.maxhp - 4; // pretend we'd already hurt it
    MM.engine.startCombat(m);
    return m.name;
  });
  await page.waitForSelector('#fleeBtn');
  await page.waitForTimeout(800); // entrance animation unlock
  await page.click('#fleeBtn');
  await page.waitForFunction(() => !MM.battle.active());
  check(await page.evaluate((name) => {
    const m = MM.engine.state.monsters.find(x => x.name === name);
    return m.hp === m.maxhp;
  }, beastName), 'fled monster recovers to full health');
  await page.keyboard.press('m');
  await page.waitForSelector('#modalBox h2');
  body = await page.textContent('#modalBox');
  check(body.includes(beastName) && /Not yet defeated/.test(body),
    `fled monster is seen but not defeated: ${beastName}`);
  await page.click('#dlgOk');

  // real battle to victory: the card fills in
  await page.evaluate(() => {
    const s = MM.engine.state;
    const m = s.monsters.find(x => x.hp > 0 && !x.boss);
    m.stun = 0;
    MM.engine.startCombat(m);
  });
  for (let i = 0; i < 24; i++) {
    const victory = await page.$('#victOk');
    if (victory) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    await answerCurrent(page);
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 15000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());

  const killed = await page.evaluate(() => Object.keys(MM.engine.state.bestiary.kills)[0]);
  await page.keyboard.press('m');
  await page.waitForSelector('#modalBox h2');
  body = await page.textContent('#modalBox');
  check(/Discovered: 1 of 77/.test(body.replace(/\s+/g, ' ')), 'counter shows 1 of 77 after first kill');
  check(body.includes('⚔ × 1'), 'defeated card shows kill count');
  const desc = await page.evaluate((name) => {
    const cards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]);
    return cards.find(c => c.name === name).desc;
  }, killed);
  check(body.includes(desc), `defeated card reveals its flavor text (${killed})`);
  await page.screenshot({ path: SHOTS + '/2-revealed-card.png' });
  await page.click('#dlgOk');

  // persistence
  await page.evaluate(() => { MM.engine.save(); MM.engine.load('BookKid'); });
  check(await page.evaluate((name) =>
    MM.engine.state.bestiary.kills[name] === 1, killed),
    'bestiary persists through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
