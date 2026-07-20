// Drive Wave 13 (P2): Your Own Room. The named doorway opens once the Wing
// title is earned (the v1.8.2 "masons" note is GONE); building is in-world
// (workbench hand + the mason's trail); budgets cap; the pupil VISIBLY
// attempts the room — solvable rooms celebrate (once-ever, with Miscount's
// cameo), unsolvable rooms end in the polite-stuck flow (💭 + a kind ask,
// no cost) — revise and it solves. The reset cord + wedge nudge work here.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-myroom');
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
  const modalText = () => ev(() => (document.getElementById('modalBox') || {}).innerText || '');

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'RoomKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.level = 20; s.difficulty = 'story';
    MM.engine.MIMIC_CHANCE = 0;
    MM.engine.recalcMaxHp(); s.hp = s.maxhp;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWing();
    MM.engine.save();
  });
  await page.waitForTimeout(200);
  await drain();

  // ---------- pre-title: the doorway keeps the blank-plate tease ----------
  await ev(() => { const s = MM.engine.state; s.px = 38; s.py = 11; MM.engine.tryMove(1, 0); });
  await page.waitForTimeout(200);
  const tease = await modalText();
  check(/blank brass plate/.test(tease) && !/masons/.test(tease), 'pre-title: the blank-plate tease (and no stray masons note)');
  await drain();

  // ---------- title earned: the named plate OPENS the door ----------
  await ev(() => {
    const w = MM.engine.ensureWing();
    w.rooms = { grumbold: 1, wren: 1, armory: 1, petronella: 1, pantry: 1, plate: 1 };
    w.titleGiven = true;
    MM.engine.save();
    MM.ui.refresh();
  });
  check(await ev(() => MM.maps.tileSprite('H', 39, 11, 'wing', 0)) === 'openDoorway',
    'the named doorway now DRAWS open (the sprite swap)');
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/1-opened-doorway.png' });
  await ev(() => MM.engine.tryMove(1, 0));
  await page.waitForTimeout(200);
  const opened = await modalText();
  check(/RoomKid/.test(opened) && /This one is yours/.test(opened) && /masons came and went/.test(opened),
    'the once-ever opened-doorway prose lands (name + "This one is yours")');
  await drain();
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.state.mapId) === 'myroom', 'closing the modal steps into Your Own Room');
  await page.screenshot({ path: SHOTS + '/2-bare-room.png' });

  // ---------- the workbench + the mason's trail ----------
  await ev(() => { const s = MM.engine.state; s.px = 1; s.py = 3; MM.engine.tryMove(0, -1); });
  await page.waitForTimeout(150);
  const bench = await modalText();
  check(/Wall block — carry \(10 left\)/.test(bench) && /Pressure plate — carry \(1 left\)/.test(bench),
    'the workbench shows every piece with its remaining count');
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Wall block/.test(b.textContent)).click(); });
  await page.waitForTimeout(120);
  // walk south: pieces lay on the tiles you step OFF — but never the entry tile
  await ev(() => MM.engine.tryMove(0, 1));   // (1,3) -> (1,4): lays a wall at (1,3)
  await ev(() => MM.engine.tryMove(0, 1));   // (1,4) -> (1,5): entry tile (1,4) is PROTECTED
  await ev(() => MM.engine.tryMove(0, 1));   // (1,5) -> (1,6): lays a wall at (1,5)
  const laid = await ev(() => MM.engine.ensureWing().myRoom.pieces.map(p => p.t + '@' + p.x + ',' + p.y).join(' '));
  check(laid === 'wall@1,3 wall@1,5', `the mason's trail lays walls on vacated tiles, never the entry (got: ${laid})`);
  // bump a placed piece to pick it back up
  await ev(() => MM.engine.tryMove(0, -1));   // bump the wall at (1,5)
  await page.waitForTimeout(120);
  check(await ev(() => MM.engine.ensureWing().myRoom.pieces.length) === 1, 'bumping a placed wall picks it back up');
  // budget cap: a hard 10-wall ceiling
  const capped = await ev(() => {
    const E = MM.engine;
    E.ensureWing().myRoom.hand = null;
    let ok = 0;
    for (let i = 0; i < 12; i++) if (E.myRoomPlace('wall', 3 + (i % 6), 6 + Math.floor(i / 6))) ok++;
    return ok + E.ensureWing().myRoom.pieces.filter(p => p.t === 'wall').length * 100;
  });
  check(capped === 9 + 10 * 100, `the wall budget caps at 10 (${capped})`);

  // ---------- build the solvable room (wall line + gate + plate + slab) ----------
  await ev(() => {
    const E = MM.engine;
    const mr = E.ensureWing().myRoom;
    mr.pieces = [];
    for (let y = 1; y <= 8; y++) if (y !== 4) mr.pieces.push({ t: 'wall', x: 6, y });
    mr.pieces.push({ t: 'gate', x: 6, y: 4 });
    mr.pieces.push({ t: 'plate', x: 3, y: 2 });
    mr.pieces.push({ t: 'slab', x: 3, y: 4 });
    mr.pieces.push({ t: 'chest', x: 2, y: 7 });   // a decoy prize — the pupil may glance at it
    E.buildMyRoomGrid();
    E.save();
    MM.ui.refresh();
  });
  const goldBefore = await ev(() => MM.engine.state.gold);

  // ---------- invite a pupil: it solves, visibly ----------
  await ev(() => { const s = MM.engine.state; s.px = 1; s.py = 3; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(-1, 0));   // bump the invite cord
  await page.waitForTimeout(150);
  check(/INVITE A PUPIL/.test(await modalText()), 'the pull-cord by the arch offers to invite a pupil');
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Pull it/.test(b.textContent)).click(); });
  await page.waitForTimeout(1600);
  const midSolve = await ev(() => MM.engine.pupil && { x: MM.engine.pupil.x, y: MM.engine.pupil.y, state: MM.engine.pupil.state });
  check(!!midSolve && midSolve.state === 'solving' && midSolve.x >= 1,
    `the pupil attempts the room VISIBLY, one step at a time (at ${midSolve && midSolve.x},${midSolve && midSolve.y})`);
  await page.screenshot({ path: SHOTS + '/3-pupil-mid-solve.png' });
  await page.waitForSelector('#overlay:not(.hidden)', { timeout: 20000 });
  const solveText = await modalText();
  check(/Your room works/.test(solveText) && /The room is the trophy/.test(solveText),
    'first solve: the once-ever celebration modal');
  await page.screenshot({ path: SHOTS + '/4-first-solve.png' });
  // close ONLY the celebration — its onClose brings Miscount to the doorway
  await ev(() => { const b = document.getElementById('dlgOk'); if (b) b.click(); });
  await page.waitForTimeout(250);
  const cameo = await modalText();
  check(/Miscount/.test(cameo) && /tests fairly/.test(cameo) && /RoomKid/.test(cameo),
    "Miscount drops by with his one line (he knows what it means to build a fair room)");
  await drain();
  check(await ev(() => MM.engine.ensureWing().myRoom.solveCount) === 1, 'solveCount incremented');
  check(await ev(() => MM.engine.state.gold) === goldBefore, 'the room pays no gold — the room is the trophy');

  // ---------- REBUILD to unsolvable, invite, polite-stuck ----------
  await page.waitForTimeout(2600);   // let the pupil finish its joy bounce and leave
  await ev(() => {
    const E = MM.engine;
    const mr = E.ensureWing().myRoom;
    mr.pieces = mr.pieces.filter(p => p.t !== 'gate');       // the gate comes out...
    mr.pieces.push({ t: 'wall', x: 6, y: 4 });               // ...and the line seals solid
    E.buildMyRoomGrid();
    E.save();
    MM.ui.refresh();
  });
  await ev(() => { const s = MM.engine.state; s.px = 1; s.py = 3; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(-1, 0));
  await page.waitForTimeout(150);
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Pull it/.test(b.textContent)).click(); });
  await page.waitForTimeout(600);   // the cord dialog closes; the pupil sets out
  // it tries (walks out), thinks, walks back to the arch, then asks — kindly
  await page.waitForSelector('#overlay:not(.hidden)', { timeout: 25000 });
  const stuckShot = await ev(() => MM.engine.pupil && { state: MM.engine.pupil.state, thought: MM.engine.pupil.thoughtUntil > Date.now() });
  await page.screenshot({ path: SHOTS + '/5-polite-stuck.png' });
  const stuckText = await modalText();
  check(/hint/.test(stuckText) && /hallway/.test(stuckText) && /Rooms are allowed to be revised/.test(stuckText),
    'the polite-stuck modal asks for "a hint — or a hallway" (never a scold)');
  check(!!stuckShot && stuckShot.state === 'stuck' && stuckShot.thought, 'the pupil waits at the arch with its 💭 up');
  check(await ev(() => MM.engine.state.gold) === goldBefore, 'the stuck flow costs NOTHING');
  await drain();
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.pupil === null), 'the pupil takes its leave after the ask');

  // ---------- revise and solve ----------
  await ev(() => {
    const E = MM.engine;
    const mr = E.ensureWing().myRoom;
    mr.pieces = mr.pieces.filter(p => !(p.t === 'wall' && p.x === 6 && p.y === 4));
    mr.pieces.push({ t: 'gate', x: 6, y: 4 });
    E.buildMyRoomGrid();
    E.save();
    MM.ui.refresh();
  });
  await ev(() => { const s = MM.engine.state; s.px = 1; s.py = 3; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(-1, 0));
  await page.waitForTimeout(150);
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Pull it/.test(b.textContent)).click(); });
  await page.waitForFunction(() => MM.engine.ensureWing().myRoom.solveCount === 2, null, { timeout: 25000 });
  check(true, 'revised room: the pupil solves it (solveCount = 2)');
  check(await ev(() => !MM.ui.modalOpen()), 'later solves are purely social — no repeat celebration modal');

  // ---------- the reset cord + wedge nudge live inside the kid's room ----------
  await page.waitForTimeout(2800);   // joy bounce ends, pupil leaves
  const wedge = await ev(() => {
    const E = MM.engine, s = MM.engine.state;
    E._futileSlab = 0; E._wedgeNoted = false;
    const mr = E.ensureWing().myRoom;
    // walk against the slab where it cannot go: push it to the wall first
    const sl = E._myRoomSlabs[0];
    s.grid[sl.y][sl.x] = sl.under || '.';
    sl.x = 1; sl.y = 6; sl.under = '.';
    s.grid[6][1] = 'U';
    s.px = 2; s.py = 6;
    for (let i = 0; i < 3; i++) E.tryMove(-1, 0);
    return { modal: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' };
  });
  check(wedge.modal && /Wedged tight/.test(wedge.text) && /reset lever/.test(wedge.text),
    'three futile pushes raise the wedge nudge INSIDE the kid\'s own room');
  await drain();
  const reset = await ev(() => {
    const E = MM.engine, s = MM.engine.state;
    s.px = 1; s.py = 5;
    E.tryMove(-1, 0);   // bump the reset cord in the arch wall
    const sl = E._myRoomSlabs[0];
    return { x: sl.x, y: sl.y };
  });
  check(reset.x === 3 && reset.y === 4, 'the always-present reset cord shuffles the slab back to its placed spot');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
