// Drive MathMaker v2 Wave 10 (EXPANSION_PLAN.md — "The World Notices"): the
// Turning Stones courtyard overlay (screenshots at 0/6/13 tasks done), the
// reactive cast's new post-flag lines, the mid-game fence-mending event, and
// the rare-surprise pool (golden bird, inn-cat beetle, hatted slimes) fired
// deterministically via their exposed CHANCE hooks. No new mechanics — this
// wave is reaction only, so most of this drive is reading state and dialog
// text rather than solving problems.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-notices');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  async function goto(x, y) { await ev(({ x, y }) => { const s = MM.engine.state; s.px = x; s.py = y; }, { x, y }); }
  async function bump(key) { await page.keyboard.press(key); await page.waitForTimeout(160); }
  async function dlgOk() { await page.waitForSelector('#dlgOk'); await page.click('#dlgOk'); await page.waitForTimeout(160); }
  async function log() { return page.textContent('#log'); }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Notices');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // A hero mid-adventure — the isles state exists (shape matters for the
  // reactive-cast checks below) but nothing is unlocked yet.
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 1;
    s.tasksDone = [];
    s.gold = 50;
    s.isles = { lenses: {}, keys: {}, egg: null, pet: null, metCallie: false };
    s.metMiscount = false;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // ================= The Turning Stones (P1) =================
  // 0 tasks done: every stone unaligned.
  await goto(19, 9);
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/1-stones-0tasks.png' });
  const stones0 = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.map(st => s.tasksDone.length > st.i);
  });
  check(stones0.every(a => !a), '0 tasks done: every stone reads unaligned');

  // 6 tasks done: the first six stones (sizes 1,1,2,3,5,8) align.
  await ev(() => { MM.engine.state.tasksDone = [1, 2, 3, 4, 5, 6]; MM.engine.save(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/2-stones-6tasks.png' });
  const stones6 = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.map(st => s.tasksDone.length > st.i);
  });
  check(stones6.filter(Boolean).length === 6, `6 tasks done: exactly 6 stones align (got ${stones6.filter(Boolean).length})`);
  check(stones6.slice(0, 6).every(Boolean) && stones6.slice(6).every(a => !a), 'alignment fills left-to-right, matching turn-in order');

  // 13 tasks done: the complete spiral, plus the static golden shimmer.
  await ev(() => { MM.engine.state.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; MM.engine.save(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/3-stones-13tasks.png' });
  const stones13 = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.map(st => s.tasksDone.length > st.i);
  });
  check(stones13.every(Boolean), '13 tasks done: every stone aligns (the complete spiral)');

  // no new grid glyph — every stone tile is still ordinary walkable grass
  const stoneGlyphs = await ev(() => {
    const s = MM.engine.state;
    return MM.data.TURNING_STONES.every(st => s.grid[st.y][st.x] === '.');
  });
  check(stoneGlyphs, 'no new grid glyphs — every stone tile is still plain "." grass underneath');

  // the MathMaker's dry aside is in the rotation
  check(await ev(() => MM.data.MATHMAKER_ASIDES.some(a => /opinions about geometry/.test(a))), 'the MathMaker\'s dry aside about the courtyard is in his asides pool');

  // ================= Reactive cast (P2) =================
  // Ordered post-flag / pre-flag pairs across a spread of the cast — the
  // full sweep of ~25 new lines is unit-tested in tests/test.js; this drive
  // proves the SAME mechanism through the real DOM/state for a sample.
  const reactive = await ev(() => {
    const s = MM.engine.state;
    s.isles = { lenses: { tidepool: true, frostbite: true, cinderforge: true }, metCallie: false, pet: null };
    const out = {};
    out.callieBefore = MM.data.NPCS.c.talk(s);
    s.isles.lampLit = true;
    out.callieAfterLamp = MM.data.NPCS.c.talk(s);
    s.isles.gullwrackRebuilt = true;
    out.callieAfterGullwrack = MM.data.NPCS.c.talk(s);
    s.isles.gullwrackRebuilt = false; // isolate the next check
    out.percyBefore = MM.data.NPCS.p.talk(s);
    s.isles.hallsDone = true;
    out.percyAfterHalls = MM.data.NPCS.p.talk(s);
    out.sylviaAfterHalls = MM.data.NPCS.g.talk(s);
    out.barnabyAfterHalls = MM.data.NPCS.q.talk(s);
    return out;
  });
  check(!/lamp is lit/.test(reactive.callieBefore), 'Callie: no lampLit line before the flag is set');
  check(/lamp is lit/.test(reactive.callieAfterLamp), 'Callie: lampLit line appears once the flag is set');
  check(/Gullwrack sent word/.test(reactive.callieAfterGullwrack), 'Callie: gullwrackRebuilt outranks lampLit once both are true');
  check(!/Heard bells and voices/.test(reactive.percyBefore), 'Percy: no hallsDone line before the flag is set');
  check(/Heard bells and voices/.test(reactive.percyAfterHalls), 'Percy: hallsDone line appears once the flag is set');
  check(/choir, whole again/.test(reactive.sylviaAfterHalls), 'Sylvia: hallsDone line appears once the flag is set');
  check(/voice was missing/.test(reactive.barnabyAfterHalls), 'Barnaby: hallsDone verse appears once the flag is set');

  // Miscount's greeting is UI-driving (dialogChoices) — read it from a real dialog.
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 14;
    s.isles.gullwrackRebuilt = false;
    s.metMiscount = true;
    s.sparWins = 0;
    MM.engine.miscountArena();
  });
  const miscountBefore = await page.textContent('#modalBox');
  check(!/whole town, put back/.test(miscountBefore), 'Miscount: no gullwrackRebuilt line before the flag is set');
  await ev(() => { MM.engine.state.isles.gullwrackRebuilt = true; MM.engine.miscountArena(); });
  const miscountAfter = await page.textContent('#modalBox');
  check(/whole town, put back/.test(miscountAfter), 'Miscount: gullwrackRebuilt line appears once the flag is set');
  // dialogChoices has no #dlgOk — close directly rather than risk clicking
  // "Spar!" (which would start a battle this drive doesn't want).
  await ev(() => MM.ui.closeModal());

  // ================= The mid-game event: the fence (P3) =================
  await ev(() => {
    const s = MM.engine.state;
    s.tasksDone = [1, 2, 3, 4, 5];
    s.isles = { lenses: {}, keys: {}, egg: null, pet: null, metCallie: false };
    MM.engine.save();
  });
  const fenceSpriteBefore = await ev(() => MM.maps.tileSprite('F', 33, 13, 'world', 0));
  check(fenceSpriteBefore === 'fenceBroken', 'the fence reads as broken before task 6');
  await goto(33, 12);
  await bump('ArrowDown');
  check(/MIND THE GAP/i.test(await log()), 'bumping the broken fence explains itself in the log');
  await page.screenshot({ path: SHOTS + '/4-fence-broken.png' });

  await ev(() => { MM.engine.state.tasksDone = [1, 2, 3, 4, 5, 6]; MM.engine.save(); });
  const fenceSpriteAfter = await ev(() => MM.maps.tileSprite('F', 33, 13, 'world', 0));
  check(fenceSpriteAfter === 'fenceMended', 'the fence reads as mended once task 6 is done');
  await page.screenshot({ path: SHOTS + '/5-fence-mended.png' });
  await goto(33, 12);
  await bump('ArrowDown');
  const fenceDlg = await page.textContent('#modalBox');
  check(/Fenwick/.test(fenceDlg) && /[Tt]hank you/.test(fenceDlg), 'the first mended-fence bump thanks the kid (Fenwick and his hired hand)');
  await dlgOk();
  check(await ev(() => MM.engine.state.seenFenceThanks) === true, 'seenFenceThanks is recorded');
  await goto(33, 12);
  await bump('ArrowDown');
  check(!(await ev(() => MM.ui.modalOpen())), 'the SECOND mended-fence bump is a plain log line, not another dialog');
  check(/Straight as anything/.test(await log()), 'the second bump reads as a short, quiet log line');

  // ================= The rare-surprise pool (P4) =================
  // (a) the golden bird — pin the chance to 1, force it, verify it never repeats.
  await ev(() => {
    const s = MM.engine.state;
    s.mapId = 'world';
    s.tasksDone = [1, 2, 3, 4, 5, 6];
    s.seenGoldenBird = false;
    s.items.treasures = [];
    MM.engine.GOLDEN_BIRD_CHANCE = 1;
    MM.engine.walkStamina();
  });
  check(await ev(() => MM.engine.state.items.treasures.includes('feather')), 'the golden bird leaves a feather ("Proof It Happened") when forced');
  check(await ev(() => MM.engine.state.seenGoldenBird) === true, 'seenGoldenBird is recorded');
  check(/golden bird/i.test(await log()), 'the golden bird moment logs its own line');
  await ev(() => { MM.engine.walkStamina(); });
  check((await ev(() => MM.engine.state.items.treasures)).filter(t => t === 'feather').length === 1, 'the golden bird never repeats, even with the chance still pinned to 1');

  // (b) the inn cat's beetle — pin the chance to 1, pat the cat, verify it never repeats.
  await ev(() => {
    const s = MM.engine.state;
    s.catPettedDate = null;
    s.seenCatBeetle = false;
    MM.engine.CAT_BEETLE_CHANCE = 1;
  });
  await goto(22, 6); // the Cozy Compass Inn 'I' sits at (23,6)
  await bump('ArrowRight');
  await page.waitForSelector('#modalBox .btnrow button.primary');
  await page.click('#modalBox .btnrow button.primary'); // Give it a pat
  await page.waitForTimeout(200);
  check(/live beetle/i.test(await log()), 'the inn cat brings a live beetle when forced');
  check(await ev(() => MM.engine.state.seenCatBeetle) === true, 'seenCatBeetle is recorded');
  const skipBtn = await page.$('#leaveBtn');
  if (skipBtn) await skipBtn.click(); // out of the warm-up, not needed for this check
  await page.waitForTimeout(200);
  // simulate a fresh day and pat again — must not repeat. The #log div only
  // keeps the last 10 lines, so compare COUNTS before/after the second pat
  // rather than assuming the first mention has rolled off.
  const beetleCountBefore = ((await log()).match(/live beetle/gi) || []).length;
  await ev(() => { MM.engine.state.catPettedDate = null; MM.engine.state.hp = 1; });
  await goto(22, 6);
  await bump('ArrowRight');
  const patBtn = await page.$('#modalBox .btnrow button.primary');
  if (patBtn) { await patBtn.click(); await page.waitForTimeout(200); }
  const beetleCountAfter = ((await log()).match(/live beetle/gi) || []).length;
  check(beetleCountAfter === beetleCountBefore, `the beetle moment never repeats, even with the chance still pinned to 1 (mentions ${beetleCountBefore} -> ${beetleCountAfter})`);
  const skipBtn2 = await page.$('#leaveBtn');
  if (skipBtn2) await skipBtn2.click();
  await page.waitForTimeout(200);
  await ev(() => { MM.engine.state.hp = MM.engine.state.maxhp; });

  // (c) two slimes, one hat, in the Meadow Cave — pin the chance to 1.
  await ev(() => {
    const s = MM.engine.state;
    s.seenHattedSlimes = false;
    MM.engine.HATTED_SLIMES_CHANCE = 1;
    MM.engine.enterDungeon(1);
  });
  check(await ev(() => MM.engine.state.monsters.some(m => m.hattedPair)) === true, 'the hatted-slimes pair spawns in the Meadow Cave when forced');
  // relocate the pair onto a tile CONFIRMED open next to the player's actual
  // (guaranteed-safe) entrance position — the dungeon's own layout can land
  // the camera with the pair clipped at an edge otherwise — then reuse that
  // exact spot for both the screenshot and the bump below.
  const placed = await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => m.hattedPair);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const nx = s.px + dx, ny = s.py + dy;
      if (s.grid[ny] && s.grid[ny][nx] === '.') {
        mon.x = nx; mon.y = ny;
        return { ok: true, dx, dy };
      }
    }
    return { ok: false };
  });
  check(placed.ok, 'found an open tile to place the hatted-slimes pair next to the player');
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/6-hatted-slimes.png' });
  const bumpResult = placed.ok ? await ev(({ dx, dy }) => {
    const s = MM.engine.state;
    const goldBefore = s.gold;
    MM.engine.tryMove(dx, dy);
    return { ok: true, goldBefore, goldAfter: s.gold };
  }, { dx: placed.dx, dy: placed.dy }) : { ok: false };
  check(bumpResult.ok, 'bumped the hatted-slimes pair');
  check(bumpResult.ok && bumpResult.goldAfter === bumpResult.goldBefore + 2, `bumping the pair awards exactly +2 gold (${bumpResult.goldBefore} -> ${bumpResult.goldAfter})`);
  check(/retired, with honors/.test(await log()), 'the split-apart moment logs its own line');
  check(await ev(() => MM.engine.state.monsters.some(m => m.hattedPair)) === false, 'the pair is gone from the floor after the bump — never a fight');
  check(await ev(() => MM.engine.state.seenHattedSlimes) === true, 'seenHattedSlimes is recorded');
  await ev(() => MM.engine.enterDungeon(1)); // re-enter — must never spawn a second time
  check(await ev(() => MM.engine.state.monsters.some(m => m.hattedPair)) === false, 'the hatted-slimes moment never repeats, even with the chance still pinned to 1');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
