// Drive Wave 13 (P3): the homesick staircase. Found lost in the Cavern of
// Echoes (post-ending), it follows two moves behind (pet-follower logic,
// stiff), waits at the door of anywhere stairs can't go, survives a
// save/load mid-escort, and — delivered to the Spiral Stair tower — earns
// the PERMANENT "⤴ Start from floor 10" menu option.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-staircase');
fs.mkdirSync(SHOTS, { recursive: true });

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
  await page.fill('#newName', 'StairKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.seenBattleHelp = true; s.seenCeremony = true;
    s.level = 20; s.difficulty = 'story';
    MM.engine.MIMIC_CHANCE = 0;
    MM.engine.recalcMaxHp(); s.hp = s.maxhp;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.save();
  });

  // ---------- found: lost in the Cavern of Echoes ----------
  await ev(() => {
    MM.engine.enterDungeon(11);
    // one far-off guard: a living monster for the indifference echo, zero
    // chance of wandering into the scripted walk
    MM.engine.state.monsters = [{ name: 'Bonepile', sprite: 'slime', pal: {}, x: 20, y: 2, hp: 8, maxhp: 8, atk: 2, xp: 1, gold: 1, stun: 0, behavior: 'guard' }];
    MM.engine._mimics = new Set();
    MM.ui.refresh();
  });
  await page.waitForTimeout(200);
  const lost = await ev(() => MM.engine.staircaseDrawPos());
  const spot = await ev(() => MM.maps.STAIRCASE_SPOT);
  check(!!lost && lost.x === spot.x && lost.y === spot.y, `the lost staircase stands at its authored spot (${spot.x},${spot.y})`);
  // a tight clip: the two pixel feet must read at scale
  {
    const box = await page.locator('#canvas').boundingBox();
    const view = await ev(() => ({ cam: MM.ui._cam }));
    const canvas = await ev(() => ({ w: document.getElementById('canvas').width, cssW: document.getElementById('canvas').getBoundingClientRect().width }));
    const scale = canvas.cssW / canvas.w;
    const T = 48 * scale;
    await page.screenshot({
      path: SHOTS + '/1-feet-closeup.png',
      clip: { x: box.x + (spot.x - view.cam.x) * T - T, y: box.y + (spot.y - view.cam.y) * T - T, width: T * 3, height: T * 3 },
    });
  }

  // ---------- bump: it follows (and monsters could not care less) ----------
  await ev(s => { MM.engine.state.px = s.x - 1; MM.engine.state.py = s.y; MM.ui.refresh(); }, spot);
  await ev(() => MM.engine.tryMove(1, 0));
  await page.waitForTimeout(150);
  const following = await ev(() => ({
    st: MM.engine.state.spiral.staircase,
    pop: MM.engine._stairPop && MM.engine._stairPop.until > Date.now(),
    log: (document.getElementById('log') || {}).innerText || '',
  }));
  check(following.st === 'following', 'bumping it starts the escort (lost -> following)');
  check(following.pop, 'the 🏠 glyph pops (field channel, not the log)');
  check(/It is a staircase/.test(following.log), 'the monster-indifference echo lands for parents, once');
  // lag-follow: two moves behind, stiffly
  await ev(() => MM.engine.tryMove(1, 0));
  await ev(() => MM.engine.tryMove(1, 0));
  await ev(() => MM.engine.tryMove(1, 0));
  const lag = await ev(() => ({ p: { x: MM.engine.state.px, y: MM.engine.state.py }, st: MM.engine.stairPos }));
  check(lag.st && lag.p.x - lag.st.x === 2 && lag.p.y === lag.st.y,
    `it follows exactly two moves behind (hero ${lag.p.x},${lag.p.y}, staircase ${lag.st && lag.st.x},${lag.st && lag.st.y})`);

  // ---------- battles: it waits (nothing moves it while the fight is on) ----------
  const beforeBattle = await ev(() => ({ ...MM.engine.stairPos }));
  await ev(() => {
    const s = MM.engine.state;
    const m = s.monsters[0];
    m.x = s.px + 1; m.y = s.py;
    MM.engine.startCombat(m);
  });
  await page.waitForSelector('#fleeBtn:not([disabled])', { timeout: 10000 });
  await ev(() => MM.engine.tryMove(1, 0));   // movement is locked mid-battle
  const during = await ev(() => ({ ...MM.engine.stairPos }));
  check(during.x === beforeBattle.x && during.y === beforeBattle.y, 'it waits, unmoved, while the battle runs');
  await ev(() => document.getElementById('fleeBtn').click());
  await page.waitForTimeout(400);
  await drain();

  // ---------- out to the overworld: the escort continues ----------
  await ev(() => MM.engine.exitDungeon());
  await page.waitForTimeout(250);
  await drain();
  check(await ev(() => MM.engine.state.spiral.staircase) === 'following', 'the escort continues onto the overworld');
  // walk a few tiles west along the bank and catch it mid-escort
  await ev(() => { const s = MM.engine.state; s.px = 46; s.py = 7; MM.ui.refresh(); });
  for (const [dx, dy] of [[-1, 0], [-1, 0], [-1, 0], [0, 1]]) await ev(d => MM.engine.tryMove(d[0], d[1]), [dx, dy]);
  const wlag = await ev(() => ({ p: { x: MM.engine.state.px, y: MM.engine.state.py }, st: MM.engine.stairPos, draw: MM.engine.staircaseDrawPos() }));
  check(!!wlag.draw && Math.abs(wlag.p.x - wlag.st.x) + Math.abs(wlag.p.y - wlag.st.y) <= 3 && !(wlag.st.x === wlag.p.x && wlag.st.y === wlag.p.y),
    'mid-escort on the overworld: it trails behind, drawn on the map');
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/2-escort-overworld.png' });

  // ---------- somewhere stairs can't go: it waits at the door ----------
  await ev(() => MM.engine.enterDungeon(1));
  await page.waitForTimeout(200);
  const parked = await ev(() => MM.engine.state.spiral.staircase);
  check(!!parked.waiting, `entering a dungeon parks it at the door (waiting at ${parked.waiting && parked.waiting.x},${parked.waiting && parked.waiting.y})`);
  // save/load MID-ESCORT: the waiting spot survives
  await ev(() => MM.engine.save());
  await ev(() => MM.engine.load('StairKid'));
  await page.waitForTimeout(250);
  await drain();
  const reloaded = await ev(() => ({ st: MM.engine.state.spiral.staircase, mapId: MM.engine.state.mapId }));
  check(reloaded.st === 'following' || !!reloaded.st.waiting,
    `save/load mid-escort keeps the state machine (${JSON.stringify(reloaded.st)})`);

  // ---------- deliver it to the Spiral Stair tower ----------
  await ev(() => {
    const s = MM.engine.state;
    s.spiral.staircase = 'following';   // walked back and bumped it, fast-forwarded
    MM.engine.stairPos = { x: 21, y: 3 };
    MM.engine._stairTrail = [];
    s.px = 20; s.py = 3;
    MM.ui.refresh();
  });
  await ev(() => MM.engine.tryMove(-1, 0));   // bump the tower 'H' at (19,3)
  await page.waitForTimeout(250);
  const home = await ev(() => ({
    modal: MM.ui.modalOpen(),
    text: (document.getElementById('modalBox') || {}).innerText || '',
  }));
  check(home.modal && /staircase comes home/.test(home.text) && /one\s+flight taller/.test(home.text),
    'the once-ever homecoming moment plays at the tower');
  await page.screenshot({ path: SHOTS + '/3-homecoming.png' });
  await ev(() => { const b = document.getElementById('dlgOk'); if (b) b.click(); });   // close the homecoming ONLY — its callback opens the tower menu
  await page.waitForTimeout(300);
  const menu = await ev(() => ({
    st: MM.engine.state.spiral.staircase,
    modal: MM.ui.modalOpen(),
    text: (document.getElementById('modalBox') || {}).innerText || '',
  }));
  check(menu.st === 'home', 'delivered: the state machine ends at home');
  check(menu.modal && /Start from floor 10/.test(menu.text), 'the tower menu gains "⤴ Start from floor 10" — permanently');
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Start from floor 10/.test(b.textContent)).click(); });
  await page.waitForTimeout(400);
  await drain();
  const inSpiral = await ev(() => ({ mapId: MM.engine.state.mapId, floor: MM.engine.state.floorIndex }));
  check(inSpiral.mapId === 'd22f9' && inSpiral.floor === 9, `the shortcut lands on floor 10 (${inSpiral.mapId})`);
  check(await ev(() => MM.engine.staircaseDrawPos() === null), 'home: it is part of the tower now, drawn nowhere');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
