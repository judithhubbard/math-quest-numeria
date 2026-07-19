// Drive the v1.8.2 wedged-slab rescue (live playtest: a kid pushed the
// plate-room slab into a corner and thought the puzzle was ruined). Three
// futile pushes → a one-time modal that names the reset lever; the plate
// room now has its OWN lever; the occasional toot never changes control
// flow (sound + a 💨 glyph only).
const { chromium } = require('playwright');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

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

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'WedgeKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // post-ending hero, straight into the Wing
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    MM.engine.enterWing();
  });
  await page.waitForTimeout(200);
  await ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });

  // ---- wedge the plate-room slab into the left wall, then keep pushing ----
  const slab0 = await ev(() => MM.engine.ensureWing().slabs.find(sl => sl.id === 'plate'));
  check(!!slab0, 'the plate-room slab exists');
  await ev(() => {
    const s = MM.engine.state;
    const w = MM.engine.ensureWing();
    const slab = w.slabs.find(sl => sl.id === 'plate');
    // park the slab against the left wall of its room, player to its right
    s.grid[slab.y][slab.x] = slab.under || '.';
    slab.x = 26; slab.y = 17; slab.under = '.';
    s.grid[17][26] = 'U';
    s.px = 27; s.py = 17;
    MM.ui.refresh();
  });
  for (let i = 0; i < 3; i++) { await ev(() => MM.engine.tryMove(-1, 0)); await page.waitForTimeout(80); }
  const wedged = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(wedged.open && /Wedged tight/.test(wedged.text), 'three futile pushes raise the wedge modal');
  check(/reset lever/.test(wedged.text), 'the modal names the reset lever');
  check(/not a failed proof/.test(wedged.text), "Milla's line lands");
  await ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });
  // once per session — pushing again stays quiet
  await ev(() => MM.engine.tryMove(-1, 0));
  await page.waitForTimeout(80);
  check(await ev(() => !MM.ui.modalOpen()), 'the nudge fires once, not every push');

  // ---- the plate room's own lever resets the slab from INSIDE the room ----
  await ev(() => { MM.engine.state.px = 31; MM.engine.state.py = 19; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, 1));   // bump the (31,20) lever
  await page.waitForTimeout(120);
  const after = await ev(() => {
    const w = MM.engine.ensureWing();
    const slab = w.slabs.find(sl => sl.id === 'plate');
    const tmpl = MM.maps.WING_SLABS.find(t => t.id === 'plate');
    return { x: slab.x, y: slab.y, tx: tmpl.x, ty: tmpl.y };
  });
  check(after.x === after.tx && after.y === after.ty, "the plate room's own lever shuffles the slab home");

  // ---- the toot: pure flavor, never control flow ----
  check(await ev(() => { MM.sound.toot(); return true; }), 'MM.sound.toot() plays without error');
  const tootMoves = await ev(() => {
    const s = MM.engine.state;
    const w = MM.engine.ensureWing();
    const slab = w.slabs.find(sl => sl.id === 'plate');
    // push the slab right many times from its template spot; count moves
    let moves = 0;
    const rand = Math.random; Math.random = () => 0.01;   // force the toot path
    const x0 = slab.x;
    s.px = x0 - 1; s.py = slab.y;
    MM.engine.tryMove(1, 0); if (w.slabs.find(sl => sl.id === 'plate').x === x0 + 1) moves++;
    Math.random = rand;
    return { moves, pop: MM.engine._slabPop && MM.engine._slabPop.ch };
  });
  check(tootMoves.moves === 1, 'a tooting push still moves the slab (flavor, never obstacle)');
  check(tootMoves.pop === '💨', 'the toot pops the 💨 glyph over the slab');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
