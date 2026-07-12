// Drive MathMaker v2: profile -> castle -> dungeon -> full battle
// (correct answers to victory, then a wrong answer to see the counterattack).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots2');

async function answerCurrent(page, forceWrong) {
  // compute the canonical answer for the current battle problem in-page
  const info = await page.evaluate(() => {
    const p = MM.battle.current;
    if (!p) return null;
    if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
    if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
    if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
    return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
  });
  if (!info) throw new Error('no current problem');
  if (info.kind === 'choice') {
    const idx = forceWrong ? (info.idx + 1) % 3 : info.idx;
    await page.click(`#battleProblem .choice[data-i="${idx}"]`);
  } else {
    await page.fill('#battleProblem #answerInput', forceWrong ? '424242' : info.val);
    await page.click('#battleProblem #submitBtn');
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Hero');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(700); // let the font + first frames land
  await page.screenshot({ path: SHOTS + '/1-overworld.png' });

  // castle intro
  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 5; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  await page.click('#dlgOk');

  // dungeon 1
  await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 10; });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd1');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/2-dungeon.png' });

  // start combat with the nearest regular monster
  await page.evaluate(() => {
    const s = MM.engine.state;
    const m = s.monsters.find(x => x.hp > 0 && !x.boss);
    MM.engine.startCombat(m);
  });
  // Wave 8b: the CEREMONY comes first — before the very first monster, the kid
  // is asked how they'd like to face the tangles. This drive walks the classic
  // (bold) road, so it answers "⚔️ Boldly" and carries on exactly as before.
  await page.waitForSelector('#modalBox h2');
  const ceremonyH = await page.textContent('#modalBox h2');
  if (/first monster/i.test(ceremonyH)) {
    await page.screenshot({ path: SHOTS + '/3a-ceremony.png' });
    await page.click('#modalBox .btnrow button');   // ⚔️ Boldly
    await page.waitForSelector('#modalBox h2');
    await page.click('#dlgOk');                     // the sealing line
    await page.waitForSelector('#modalBox h2');     // ...then the tutorial
  }
  // first-battle explainer
  await page.screenshot({ path: SHOTS + '/3-battle-help.png' });
  await page.click('#dlgOk');

  // battle screen up
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + '/4-battle.png' });

  // answer correctly until victory (slime dies in 2 hits at strike power 3)
  for (let i = 0; i < 6; i++) {
    const victory = await page.$('#victOk');
    if (victory) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    await answerCurrent(page, false);
    await page.waitForTimeout(600);
    if (i === 0) await page.screenshot({ path: SHOTS + '/5-strike.png' });
    // wait for either next problem or victory panel
    await page.waitForFunction(() =>
      document.querySelector('#victOk') ||
      document.querySelector('#battleProblem #answerInput:not([disabled])') ||
      document.querySelector('#battleProblem .choice:not([disabled])'),
      { timeout: 8000 });
  }
  await page.waitForSelector('#victOk', { timeout: 8000 });
  await page.screenshot({ path: SHOTS + '/6-victory.png' });
  await page.click('#victOk');
  await page.waitForTimeout(300);

  // second battle: answer WRONG to see solution + monster counterattack
  await page.evaluate(() => {
    const s = MM.engine.state;
    const m = s.monsters.find(x => x.hp > 0 && !x.boss);
    MM.engine.startCombat(m);
  });
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 8000 });
  await answerCurrent(page, true);
  await page.waitForTimeout(1300); // solution shows, monster counterattacks
  await page.screenshot({ path: SHOTS + '/7-wrong-counter.png' });
  await page.waitForSelector('.battle-btnrow .primary', { timeout: 8000 });
  await page.click('.battle-btnrow .primary'); // Ready — next round
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 8000 });
  await page.click('#fleeBtn');
  await page.waitForFunction(() => !MM.battle.active());

  // boss battle screenshot (teleport to boss, big sprite + aura + crown)
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(x => x.boss && x.hp > 0);
    MM.engine.startCombat(b);
  });
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + '/8-boss.png' });
  await page.click('#fleeBtn');
  await page.waitForFunction(() => !MM.battle.active());

  const state = await page.evaluate(() => ({
    hp: MM.engine.state.hp, streak: MM.engine.state.streak,
    totals: MM.engine.state.totals, gold: MM.engine.state.gold,
  }));
  console.log('=== STATE ===', JSON.stringify(state));
  console.log('=== JS ERRORS ===\n' + (errors.length ? errors.join('\n') : 'none'));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('DRIVER FAILED:', e.message); process.exit(2); });
