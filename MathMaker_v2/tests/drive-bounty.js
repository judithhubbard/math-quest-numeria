// Drive MathMaker v2 notice board: empty before task 1, three jobs after,
// real battles progressing hunt/solve/streak bounties to completion with
// instant gold payout, board regeneration when cleared, and daily rotation.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-bounty');

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
  if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
  else {
    await page.fill('#battleProblem #answerInput', info.val);
    await page.keyboard.press('Enter');
  }
  return true;
}

async function dismissDialogs(page) { // e.g. badge celebrations between battles
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) return;
    await ok.click();
    await page.waitForTimeout(250);
  }
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
  await page.fill('#newName', 'BountyKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // bump the board before meeting the MathMaker: no jobs yet
  await page.evaluate(() => { const s = MM.engine.state; s.px = 21; s.py = 5; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  let body = await page.textContent('#modalBox');
  check(/board is empty/.test(body), 'board empty before task 1');
  await page.click('#dlgOk');

  // castle intro, then the board posts three jobs
  await page.evaluate(() => { const s = MM.engine.state; s.px = 19; s.py = 5; s.seenBattleHelp = true; s.seenCeremony = true; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  await page.click('#dlgOk');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 21; s.py = 5; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  body = await page.textContent('#modalBox');
  check(/Defeat 3 monsters in the Meadow Cave/.test(body), 'hunt job targets Meadow Cave');
  check(/Answer 4 problems correctly/.test(body), 'solve job posted');
  check(/answers right in a row/.test(body), 'streak job posted (Miscount not met)');
  await page.screenshot({ path: SHOTS + '/1-board.png' });
  await page.click('#dlgOk');
  const goldBefore = await page.evaluate(() => MM.engine.state.gold);

  // three real battles in dungeon 1 — hunt, solve, and streak all progress
  await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 10; });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => MM.engine.state.mapId === 'd1');
  for (let battle = 0; battle < 3; battle++) {
    await page.evaluate(() => {
      const s = MM.engine.state;
      const m = s.monsters.find(x => x.hp > 0 && !x.boss);
      m.stun = 0;
      MM.engine.startCombat(m);
    });
    for (let i = 0; i < 24; i++) {
      if (await page.$('#victOk')) break;
      const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!hasForm) { await page.waitForTimeout(400); continue; }
      await answerCurrent(page);
      await page.waitForTimeout(700);
    }
    await page.waitForSelector('#victOk', { timeout: 15000 });
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
    await page.waitForTimeout(300);
    await dismissDialogs(page); // badge celebrations must not block the run
  }

  const state = await page.evaluate(() => ({
    items: MM.engine.state.bounties.items.map(it => ({ type: it.type, have: it.have, need: it.need, done: it.done })),
    gold: MM.engine.state.gold,
  }));
  check(state.items.every(it => it.done), `all three bounties complete: ${JSON.stringify(state.items)}`);
  check(state.gold > goldBefore + 40, `bounty gold paid on the spot (${goldBefore} -> ${state.gold})`);

  // a cleared board regenerates immediately with fresh, undone jobs
  await page.evaluate(() => { MM.engine.exitDungeon(); const s = MM.engine.state; s.px = 21; s.py = 5; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate(() => MM.engine.state.bounties.items.every(it => !it.done)),
    'cleared board regenerates with fresh jobs');
  await page.click('#dlgOk');

  // daily rotation: stale date regenerates even with unfinished jobs
  await page.evaluate(() => {
    MM.engine.state.bounties.date = '2020-01-01';
    MM.engine.state.bounties.items[0].have = 1;
  });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate(() =>
    MM.engine.state.bounties.date !== '2020-01-01' && MM.engine.state.bounties.items[0].have === 0),
    'stale board rotates to a fresh daily set');
  await page.click('#dlgOk');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
