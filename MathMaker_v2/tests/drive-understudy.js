// Drive Wave 13 (P1): echo plates & the Understudy. The Wing's Echo Annex
// teaches the grammar (walk the route you want copied, step on the plate);
// the Cavern of Echoes pays it (the Understudy is the only thing there that
// can hold a pressure plate while you walk to the gate). Checks: summon +
// once-ever intro, exact replay of the step buffer, the theatrical
// half-beat, plate-hold + gate-stays-open, and the polite early stop.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-understudy');
fs.mkdirSync(SHOTS, { recursive: true });

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
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

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const drain = () => ev(() => { let n = 0; while (MM.ui.modalOpen() && n++ < 8) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'EchoKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // post-ending hero, straight into the Wing
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.lampLit = true; s.isles.spireDone = true;
    s.level = 20; s.difficulty = 'story';
    MM.engine.MIMIC_CHANCE = 0;
    MM.engine.recalcMaxHp(); s.hp = s.maxhp;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWing();
    MM.engine.save();
  });
  await page.waitForTimeout(200);
  await drain();

  // ---------- the Echo Annex: choreograph and summon ----------
  // stand at the annex's east end, walk the corridor west (fills the buffer
  // with 12 W steps), then step onto the '?' at (11,23)
  await ev(() => { const s = MM.engine.state; s.px = 34; s.py = 23; MM.ui.refresh(); });
  for (let i = 0; i < 22; i++) await ev(() => MM.engine.tryMove(-1, 0));
  const preSummon = await ev(() => ({
    pos: { x: MM.engine.state.px, y: MM.engine.state.py },
    buf: MM.engine.stepBuffer.map(s => s.dx + ',' + s.dy).join(' '),
  }));
  check(preSummon.pos.x === 12 && preSummon.pos.y === 23, `walked the corridor to (12,23) (at ${preSummon.pos.x},${preSummon.pos.y})`);
  check(preSummon.buf === Array(12).fill('-1,0').join(' '), 'the rolling buffer holds exactly the last 12 steps (all west)');

  await ev(() => MM.engine.tryMove(-1, 0));   // onto the echo plate
  await page.waitForTimeout(200);
  const summoned = await ev(() => ({
    modal: MM.ui.modalOpen(),
    text: (document.getElementById('modalBox') || {}).innerText || '',
    u: MM.engine.understudy && {
      x: MM.engine.understudy.x, y: MM.engine.understudy.y,
      path: MM.engine.understudy.path.map(s => s.dx + ',' + s.dy).join(' '),
      active: MM.engine.understudy.active,
    },
    buf: MM.engine.stepBuffer.map(s => s.dx + ',' + s.dy).join(' '),
  }));
  check(summoned.modal && /Understudy/.test(summoned.text), 'first-ever summon plays the once-ever introduction (modal)');
  check(/paper crown/.test(summoned.text) && /my moment/i.test(summoned.text), 'the introduction prose landed');
  check(!!summoned.u && summoned.u.x === 11 && summoned.u.y === 23, 'the Understudy appears AT the plate');
  check(summoned.u && summoned.u.path === summoned.buf, 'the replay path is an EXACT copy of the step buffer');
  await page.screenshot({ path: SHOTS + '/1-intro-modal.png' });
  await drain();

  // replay runs from the world loop; headless rAF throttles, so wait for
  // the scene to END rather than sleeping a fixed beat
  await page.waitForFunction(() => MM.engine.understudy && !MM.engine.understudy.active, null, { timeout: 20000 });
  const done = await ev(() => ({
    u: MM.engine.understudy && { x: MM.engine.understudy.x, y: MM.engine.understudy.y, active: MM.engine.understudy.active },
    powered: MM.engine.platePowered('wing'),
  }));
  check(!!done.u && done.u.x === 10 && done.u.y === 23 && !done.u.active,
    `the wall-stop catches the overshooting Understudy ON the plate (at ${done.u && done.u.x},${done.u && done.u.y})`);
  check(done.powered, 'the held plate powers the floor (the plate-occupancy clause)');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/3-holding-plate.png' });
  // a tight clip of the Understudy tile so the crown pixels can be audited at scale
  {
    const box = await page.locator('#canvas').boundingBox();
    const view = await ev(() => ({ cam: MM.ui._cam, u: { x: MM.engine.understudy.x, y: MM.engine.understudy.y } }));
    const canvas = await ev(() => ({ w: document.getElementById('canvas').width, cssW: document.getElementById('canvas').getBoundingClientRect().width }));
    const scale = canvas.cssW / canvas.w;   // CSS px per canvas px
    const T = 48 * scale;
    await page.screenshot({
      path: SHOTS + '/4-crown-closeup.png',
      clip: {
        x: box.x + (view.u.x - view.cam.x) * T - T, y: box.y + (view.u.y - view.cam.y) * T - T,
        width: T * 3, height: T * 3,
      },
    });
  }
  // the half-beat, deterministically: a clean 2-step scene stepped by hand
  // (one evaluate = one JS task, so the world-loop pulse cannot interleave)
  const halfBeat = await ev(() => {
    const E = MM.engine;
    E.stepBuffer = [{ dx: 1, dy: 0 }, { dx: 1, dy: 0 }];
    E.summonUnderstudy(13, 23);
    E.understudyTick();                      // step 1
    const a = { x: E.understudy.x, y: E.understudy.y };
    E.understudyTick();                      // the theatrical half-beat: no movement
    const b = { x: E.understudy.x, y: E.understudy.y };
    E.understudyTick();                      // the final step lands
    const c = { x: E.understudy.x, y: E.understudy.y, active: E.understudy.active };
    return { a, b, c };
  });
  check(halfBeat.a.x === 14 && halfBeat.b.x === 14 && halfBeat.c.x === 15 && !halfBeat.c.active,
    'one theatrical half-beat pause before the final step');

  // ---------- the Cavern of Echoes: hold the plate, walk to the gate ----------
  await ev(() => {
    MM.engine.enterDungeon(11);
    MM.engine.state.monsters = [];        // scripted drive: nothing wanders into the scene
    MM.engine._mimics = new Set();
    MM.engine.state.px = 1; MM.engine.state.py = 11;
    MM.ui.refresh();
  });
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.state.mapId === 'd11' && MM.engine.understudy === null),
    'entering a map clears the old Understudy (per-map-visit, nothing saved)');
  // walk the plate-ward corridor east — the wall-stop design means the
  // whole recent history IS the choreography
  for (let i = 0; i < 2; i++) await ev(() => MM.engine.tryMove(1, 0));   // (1,11) -> (3,11) is ?, so stop at 2 steps
  const cavern = await ev(() => ({
    u: MM.engine.understudy && { x: MM.engine.understudy.x, y: MM.engine.understudy.y },
    modal: MM.ui.modalOpen(),
  }));
  check(!!cavern.u && cavern.u.y === 11 && cavern.u.x >= 3 && cavern.u.x <= 5,
    `stepping the cavern plate summons the Understudy (at ${cavern.u && cavern.u.x},${cavern.u && cavern.u.y})`);
  check(!cavern.modal, 'the introduction is once-EVER — later summons are glyph/sound only');
  // that 2-step buffer under-shoots — re-stage with a full eastward run
  await page.waitForTimeout(1500);
  await ev(() => {
    const s = MM.engine.state;
    s.px = 3; s.py = 11;   // stand on the plate tile again
    MM.engine.stepBuffer = [];
    for (let i = 0; i < 6; i++) MM.engine.recordStep(1, 0);   // the route to copy: EAST, with overshoot
    MM.engine.summonUnderstudy(3, 11);
  });
  await page.waitForFunction(() => MM.engine.understudy && MM.engine.understudy.x > 3, null, { timeout: 20000 });
  const mid = await ev(() => MM.engine.understudy && { x: MM.engine.understudy.x, y: MM.engine.understudy.y, active: MM.engine.understudy.active });
  await page.screenshot({ path: SHOTS + '/2-mid-replay.png' });
  check(!!mid && mid.x > 3 && mid.x <= 7 && mid.y === 11, `mid-replay: it is walking its copied route (at ${mid && mid.x},${mid && mid.y})`);
  await page.waitForFunction(() => MM.engine.understudy && !MM.engine.understudy.active, null, { timeout: 20000 });
  const held = await ev(() => ({
    u: MM.engine.understudy && { x: MM.engine.understudy.x, y: MM.engine.understudy.y, active: MM.engine.understudy.active },
    powered: MM.engine.platePowered('d11'),
  }));
  check(held.u && held.u.x === 7 && held.u.y === 11 && !held.u.active && held.powered,
    `cavern: the Understudy holds the (7,11) plate (at ${held.u && held.u.x},${held.u && held.u.y}, powered=${held.powered})`);
  // the gate STAYS open while it holds — walk over and through
  await ev(() => { const s = MM.engine.state; s.px = 6; s.py = 12; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, 1));   // onto the open '&' at (6,13)
  check(await ev(() => MM.engine.state.px === 6 && MM.engine.state.py === 13),
    'the plate-gate stays open while the Understudy holds the plate — walked through');
  await ev(() => MM.engine.tryMove(1, 0));   // bump the pocket chest (puzzle-locked)
  await page.waitForSelector('#modalBox #answerInput, #modalBox .choice', { timeout: 8000 });
  await solveModalProblem(page);
  await page.waitForTimeout(300);
  await drain();
  check(await ev(() => !!MM.engine.state.opened['d11:7,13']), 'the gated chest opens from the gate tile');
  await page.screenshot({ path: SHOTS + '/5-cavern-gate-open.png' });

  // ---------- the polite early stop ----------
  await ev(() => {
    const s = MM.engine.state;
    s.px = 3; s.py = 11;
    MM.engine.stepBuffer = [{ dx: 0, dy: -1 }, { dx: 0, dy: -1 }];   // straight into the wall above
    MM.engine.summonUnderstudy(3, 11);
  });
  await page.waitForFunction(() => MM.engine.understudy && !MM.engine.understudy.active, null, { timeout: 20000 });
  const stopped = await ev(() => ({
    u: MM.engine.understudy && { x: MM.engine.understudy.x, y: MM.engine.understudy.y, active: MM.engine.understudy.active, stopped: MM.engine.understudy.stopped },
    modal: MM.ui.modalOpen(),
  }));
  check(stopped.u && !stopped.u.active && stopped.u.stopped && stopped.u.x === 3 && stopped.u.y === 11,
    'a wall mid-replay stops it early, politely — it just stands there, committed');
  check(!stopped.modal, 'the early stop is never a failure state (no modal, no cost)');
  // and it never blocks: walking into it swaps places
  await ev(() => { const s = MM.engine.state; s.px = 2; s.py = 11; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(1, 0));
  check(await ev(() => MM.engine.state.px === 3 && MM.engine.understudy.x === 2),
    'walking into the Understudy swaps places — it can never wedge a route');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
