// Drive MathMaker v2 Wave 12 — "The Proving Rooms": the Workshop Wing's
// endingDone gate, all six proving rooms end-to-end, Numberling
// multi-solution acceptance + the 9-adjacent-7 cosmetic-only regression,
// plate/slab/gate flow, the wardrobe's inverted tell + confession +
// relocation, cracked-floor fall + ladder return, portrait bump-modals,
// and a forced-chunk Spiral Stair leg (floors 8/9/11/15 — the chunk
// rotation is deterministic by floor, so entering the floor IS pinning
// the roll: pads, slides, lever/gate chest, and the gear-plate landing).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-wing');

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

// dismiss any stacked plain dialogs (#dlgOk), returning the LAST body text seen
async function drainDialogs(page) {
  let last = '';
  for (let i = 0; i < 6; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) break;
    last = await page.textContent('#modalBox');
    await ok.click();
    await page.waitForTimeout(200);
  }
  return last;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const ev = fn => page.evaluate(fn);

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'ProverKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // a hero with the castle open but the ending NOT yet done
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.seenCeremony = true;
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.lampLit = true; s.isles.spireDone = true;
    s.level = 20; s.gold = 500; s.difficulty = 'story';
    MM.engine.MIMIC_CHANCE = 0;   // scripted drives never meet a mimic
    MM.engine.recalcMaxHp(); s.hp = s.maxhp;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.enterCastle();
    MM.engine.save();
  });
  await page.waitForTimeout(300);

  // ---------- the endingDone gate ----------
  await ev(() => { const s = MM.engine.state; s.px = 8; s.py = 9; MM.engine.tryMove(1, 0); });
  await page.waitForSelector('#modalBox h2');
  const lockedText = await page.textContent('#modalBox');
  check(/ProverKid/.test(lockedText) && /Not yet/.test(lockedText),
    'pre-ending: the Wing door shows a brass plate with the kid\'s own name and "Not yet"');
  await drainDialogs(page);
  check(await ev(() => MM.engine.state.mapId) === 'castle', 'pre-ending: the door does not open');

  await ev(() => { const s = MM.engine.state; s.endingDone = true; MM.engine.save(); s.px = 8; s.py = 9; MM.engine.tryMove(1, 0); });
  await page.waitForTimeout(400);
  check(await ev(() => MM.engine.state.mapId) === 'wing', 'post-ending: the same bump enters the Workshop Wing');
  await page.screenshot({ path: SHOTS + '/1-hall.png' });

  // ---------- portraits (bump-modals; Ondine is wrong, Hesper shushes) ----------
  await ev(() => { const s = MM.engine.state; s.px = 3; s.py = 10; MM.engine.tryMove(0, -1); });
  await page.waitForSelector('#modalBox h2');
  check(/Grumbold/.test(await page.textContent('#modalBox')) && /cracked floors were MY idea/.test(await page.textContent('#modalBox')),
    'portrait: Grumbold the Third is proud of the cracked floors');
  await drainDialogs(page);
  await ev(() => { const s = MM.engine.state; s.px = 8; s.py = 10; MM.engine.tryMove(0, -1); });
  await page.waitForSelector('#modalBox h2');
  check(/Ondine/.test(await page.textContent('#modalBox')) && /invented zero/.test(await page.textContent('#modalBox')),
    'portrait: Ondine is gently wrong about math history');
  await drainDialogs(page);
  await ev(() => { const s = MM.engine.state; s.px = 9; s.py = 10; MM.engine.tryMove(0, -1); });
  await page.waitForSelector('#modalBox h2');
  check(/Hesper/.test(await page.textContent('#modalBox')) && /centuries older/.test(await page.textContent('#modalBox')),
    'portrait: the adjacent portrait shushes her (zero is centuries older)');
  await drainDialogs(page);

  // ---------- Room 1: Grumbold (cracked floors + chutes + the cellar) ----------
  await ev(() => { const s = MM.engine.state; s.px = 6; s.py = 8; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/2-grumbold.png' });
  await ev(() => { // cross the cracked band at column 6 (rows 5 then 4), ending at (6,3)
    for (let i = 0; i < 5; i++) MM.engine.tryMove(0, -1);
  });
  check(await ev(() => MM.engine.state.grid[5][6] === 'v' && MM.engine.state.grid[4][6] === 'v'),
    'grumbold: crossed cracked tiles crumble to chutes behind you');
  await ev(() => MM.engine.tryMove(0, -1)); // bump the chest at (6,2) from (6,3)
  await page.waitForSelector('#modalBox h2');
  check(/proven. — G. III/.test(await page.textContent('#modalBox')), 'grumbold: the chest note is signed G. III');
  await drainDialogs(page);
  check(await ev(() => !!MM.engine.state.wing.rooms.grumbold), 'grumbold: the room is proven');
  // fall through a crumbled hole into the cellar, take the treat, climb home
  await ev(() => { const s = MM.engine.state; s.px = 6; s.py = 3; MM.engine.tryMove(0, 1); });
  await page.waitForTimeout(200);
  check(await ev(() => { const s = MM.engine.state, c = MM.maps.WING_CELLAR.landing; return s.px === c.x && s.py === c.y; }),
    'grumbold: falling lands in the cellar — a place, not a punishment');
  await page.screenshot({ path: SHOTS + '/3-cellar.png' });
  await ev(() => { const s = MM.engine.state; s.px = 5; s.py = 23; MM.engine.tryMove(1, 0); });
  await drainDialogs(page);
  await ev(() => { const s = MM.engine.state; s.px = 3; s.py = 23; MM.engine.tryMove(-1, 0); }); // the ladder
  check(await ev(() => { const s = MM.engine.state, r = MM.maps.WING_CELLAR.ladderReturn; return s.px === r.x && s.py === r.y; }),
    'grumbold: the cellar ladder returns you to the hall');

  // ---------- Room 2: Wren's Numberlings ----------
  // the field glyphs: 💤 over the sleeping 6, 💧 near the 9 leaning from the 7
  await ev(() => { const s = MM.engine.state; s.px = 19; s.py = 8; });
  await page.waitForFunction(() => performance.now() % 6000 < 1200);
  await page.waitForTimeout(120);
  await page.screenshot({ path: SHOTS + '/4-wren.png' });
  // 9-adjacent-7 regression: pushing the 9 right next to the 7 always works
  check(await ev(() => {
    const s = MM.engine.state, w = s.wing;
    const seven = w.slabs.find(t => t.id === 'n7'), nine = w.slabs.find(t => t.id === 'n9');
    s.px = seven.x; s.py = seven.y + 1; MM.engine.tryMove(0, -1);   // push 7 north
    s.px = nine.x; s.py = nine.y + 1; MM.engine.tryMove(0, -1);     // push 9 north, back beside it
    return nine.y === 5 && seven.y === 5 && Math.abs(nine.x - seven.x) === 1;
  }), 'wren: the 9 can always be pushed right next to the 7 (the lean is cosmetic only)');
  // solve with 4 × 6 — one true filling
  await ev(() => {
    const s = MM.engine.state, w = s.wing;
    const [sa, sb] = MM.maps.WING_WREN.sockets;
    const place = (id, sock) => {
      const slab = w.slabs.find(t => t.id === id);
      s.grid[slab.y][slab.x] = '.';
      slab.x = sock.x; slab.y = sock.y + 1; slab.under = '.';
      s.grid[slab.y][slab.x] = 'U';
      s.px = sock.x; s.py = sock.y + 2;
      MM.engine.tryMove(0, -1);
    };
    place('n4', sa); place('n6', sb);
  });
  await page.waitForSelector('#modalBox h2');
  check(/4 × 6 = 24/.test(await page.textContent('#modalBox')), 'wren: 4 × 6 completes the equation');
  await drainDialogs(page);
  check(await ev(() => !!MM.engine.state.wing.rooms.wren), 'wren: the room is proven');
  await page.screenshot({ path: SHOTS + '/5-wren-solved.png' });
  // multi-solution acceptance: a FRESH numberling room accepts 3 × 8 too
  check(await ev(() => {
    const s = MM.engine.state, w = s.wing;
    // rewind just this room (the reviewer's "two distinct true fillings"
    // proof) — reparse the grid so the locked slabs' cells rebuild clean
    w.rooms.wren = false; w.titleGiven = false;
    w.slabs = null; MM.engine.ensureWing();
    s.grid = MM.maps.parse(MM.maps.WING, '#');
    MM.engine.applyWingState();
    const [sa, sb] = MM.maps.WING_WREN.sockets;
    const place = (id, sock) => {
      const slab = s.wing.slabs.find(t => t.id === id);
      s.grid[slab.y][slab.x] = '.';
      slab.x = sock.x; slab.y = sock.y + 1; slab.under = '.';
      s.grid[slab.y][slab.x] = 'U';
      s.px = sock.x; s.py = sock.y + 2;
      MM.engine.tryMove(0, -1);
    };
    place('n3', sa); place('n8', sb);
    return !!s.wing.rooms.wren;
  }), 'wren: 3 × 8 — a DIFFERENT true filling — is accepted too');
  await drainDialogs(page);

  // ---------- Room 3: the Armory (beam, zero math) ----------
  check(await ev(() => {
    const s = MM.engine.state;
    const [m1] = MM.maps.WING_ARMORY.mirrors;
    s.px = m1.x - 1; s.py = m1.y; MM.engine.tryMove(1, 0);   // toggle M1 to '\'
    return !MM.engine.wingBeamLit();
  }), 'armory: one mirror alone does not light the crystal');
  await ev(() => {
    const s = MM.engine.state;
    const m3 = MM.maps.WING_ARMORY.mirrors[2];
    s.px = m3.x - 1; s.py = m3.y; MM.engine.tryMove(1, 0);   // toggle M3 to '\'
  });
  await page.waitForSelector('#modalBox h2');
  check(/crystal drinks the light/.test(await page.textContent('#modalBox')), 'armory: the routed beam lights the crystal');
  await drainDialogs(page);
  check(await ev(() => !!MM.engine.state.wing.rooms.armory), 'armory: the room is proven (the beam-gate opens)');
  await ev(() => { const s = MM.engine.state; s.px = 30; s.py = 3; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/6-armory-beam.png' });
  await ev(() => { const s = MM.engine.state; s.px = 35; s.py = 2; MM.engine.tryMove(1, 0); MM.engine.tryMove(1, 0); });
  await page.waitForSelector('#modalBox h2');
  check(/Brightwell said the light/.test(await page.textContent('#modalBox')), 'armory: the chest behind the beam-gate opens');
  await drainDialogs(page);

  // ---------- Room 4: Petronella's cats ----------
  await ev(() => {
    const s = MM.engine.state;
    const bump = (x, y, times) => {
      for (let i = 0; i < times; i++) {
        s.px = x; s.py = y - 1;
        if (s.grid[y - 1][x] !== '.') { s.px = x - 1; s.py = y; MM.engine.tryMove(1, 0); }
        else MM.engine.tryMove(0, 1);
      }
    };
    const cats = MM.maps.WING_CATS.statues;
    bump(cats[0].x, cats[0].y, 3);   // S -> W -> N -> E
    bump(cats[1].x, cats[1].y, 3);   // N -> E -> S -> W
  });
  await drainDialogs(page);
  await ev(() => {
    const s = MM.engine.state;
    const c = MM.maps.WING_CATS.statues[2];
    for (let i = 0; i < 3; i++) { s.px = c.x - 1; s.py = c.y; MM.engine.tryMove(1, 0); }   // E -> S -> W -> N
  });
  await page.waitForSelector('#modalBox h2');
  check(/cats watch the fountain together/.test(await page.textContent('#modalBox')), 'petronella: all cats facing the fountain rings the chime');
  await drainDialogs(page);
  check(await ev(() => !!MM.engine.state.wing.rooms.petronella), 'petronella: the room is proven');
  await ev(() => { const s = MM.engine.state; s.px = 5; s.py = 15; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/7-petronella.png' });

  // ---------- Room 5: the Pantry (slab + plate + cheese) ----------
  check(await ev(() => !MM.engine.platePowered('wing')), 'pantry: nothing on a plate — the gates are down');
  await ev(() => { const s = MM.engine.state; s.px = 21; s.py = 20; MM.engine.tryMove(0, -1); }); // push the slab onto the plate
  check(await ev(() => {
    const w = MM.engine.state.wing;
    return w.slabs.find(t => t.id === 'pantry').under === '+' && MM.engine.platePowered('wing');
  }), 'pantry: the slab rests on the plate and holds the gates open');
  await ev(() => { const s = MM.engine.state; s.px = 23; s.py = 17; MM.engine.tryMove(0, -1); }); // step onto the open gate
  check(await ev(() => MM.engine.state.px === 23 && MM.engine.state.py === 16), 'pantry: the held gate is walkable');
  await ev(() => MM.engine.tryMove(0, -1)); // bump the cheese chest
  await page.waitForSelector('#modalBox h2');
  check(/always been cheese/.test(await page.textContent('#modalBox')), 'pantry: the chest is, of course, cheese');
  await drainDialogs(page);
  check(await ev(() => MM.engine.state.wing.rooms.pantry && (MM.engine.state.items.food.cheese || 0) >= 3),
    'pantry: proven, and three Cheese Wheels are in the bag');
  await ev(() => { const s = MM.engine.state; s.px = 19; s.py = 17; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/8-pantry.png' });

  // ---------- Room 6: the Plate Room (open-while-occupied / close-on-leave) ----------
  // NOTE: the pantry slab still holds a plate on this same floor (OR across
  // plates is real!) — pull it off first so this room's open/close checks
  // read honestly.
  await ev(() => MM.engine.wingReset(24, 20));
  await ev(() => { const s = MM.engine.state; s.px = 32; s.py = 15; MM.engine.tryMove(1, 0); }); // bump the shut gate
  check(await ev(() => MM.engine.state.px === 32 && MM.engine.state.py === 15), 'plate room: a shut plate-gate blocks');
  await ev(() => { const s = MM.engine.state; s.px = 28; s.py = 16; MM.engine.tryMove(0, -1); });
  check(await ev(() => MM.engine.state.grid[15][28] === '+' && MM.engine.platePowered('wing')),
    'plate room: standing on the plate powers the gates (open while occupied)');
  await ev(() => MM.engine.tryMove(0, 1)); // step off
  check(await ev(() => !MM.engine.platePowered('wing')), 'plate room: stepping off closes them again');
  await ev(() => { // the canonical solution: push the slab up onto the plate
    const s = MM.engine.state;
    s.px = 28; s.py = 18;
    MM.engine.tryMove(0, -1);   // push: slab 17 -> 16
    MM.engine.tryMove(0, -1);   // walk up behind it
    MM.engine.tryMove(0, -1);   // push: slab 16 -> 15 (the plate)
  });
  check(await ev(() => MM.engine.platePowered('wing')), 'plate room: the pushed slab holds the plate');
  await ev(() => { // walk around and through the held-open gates to the chest
    const s = MM.engine.state;
    s.px = 32; s.py = 15; MM.engine.tryMove(1, 0); MM.engine.tryMove(1, 0);
  });
  check(await ev(() => MM.engine.state.px === 34 && MM.engine.state.py === 15), 'plate room: the held gates let you through');
  await ev(() => { const s = MM.engine.state; s.px = 36; s.py = 15; MM.engine.tryMove(1, 0); });
  await page.waitForSelector('#modalBox h2');
  check(/Weight is honest/.test(await page.textContent('#modalBox')), 'plate room: Milla\'s chest opens');
  const titleText = await drainDialogs(page);
  check(/Keeper of the Proving Rooms/.test(titleText), 'the sixth room grants Keeper of the Proving Rooms');
  check(await ev(() => (MM.engine.state.titles || []).includes('Keeper of the Proving Rooms')), 'the title is recorded');
  // ride the slick-rock strip
  check(await ev(() => {
    const s = MM.engine.state;
    s.px = 26; s.py = 19;
    MM.engine.tryMove(1, 0);
    return s.px === 32 && s.py === 19;
  }), 'plate room: the slick-rock strip slides you across');
  await ev(() => { const s = MM.engine.state; s.px = 30; s.py = 16; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/9-plateroom.png' });

  // ---------- the wardrobe: inverted tell, three bumps, the Study ----------
  check(await ev(() => MM.ui.wardrobeBob(5, 0) === 0 && MM.ui.wardrobeBob(5, 900) === 5),
    'wardrobe: FAR, the bob swings a full 5px');
  check(await ev(() => MM.ui.wardrobeBob(1, 0) === 0 && MM.ui.wardrobeBob(1, 900) === 0 && MM.ui.wardrobeBob(2, 1330) === 0),
    'wardrobe: NEAR, it is dead still at every moment');
  await ev(() => { const s = MM.engine.state; s.px = 18; s.py = 11; });
  await page.waitForFunction(() => Math.floor(performance.now() / 900) % 2 === 0 && performance.now() % 900 < 250);
  await page.screenshot({ path: SHOTS + '/10-wardrobe-far-a.png' });
  await page.waitForFunction(() => Math.floor(performance.now() / 900) % 2 === 1 && performance.now() % 900 < 250);
  await page.screenshot({ path: SHOTS + '/11-wardrobe-far-b.png' });
  await ev(() => { const s = MM.engine.state; s.px = 23; s.py = 12; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/12-wardrobe-near.png' });
  await ev(() => MM.engine.tryMove(1, 0));
  await page.waitForSelector('#modalBox h2');
  check(/aggressively still/.test(await page.textContent('#modalBox')), 'wardrobe bump 1: it is a perfectly ordinary wardrobe');
  await drainDialogs(page);
  await ev(() => MM.engine.tryMove(1, 0));
  await page.waitForSelector('#modalBox h2');
  check(/Wardrobes do not sweat/.test(await page.textContent('#modalBox')), 'wardrobe bump 2: it is sweating');
  await drainDialogs(page);
  await ev(() => MM.engine.tryMove(1, 0));
  await page.waitForSelector('#modalBox h2');
  const confession = await page.textContent('#modalBox');
  check(/forty years/.test(confession) && /resign. From furniture/.test(confession),
    'wardrobe bump 3: the full confession (forty years; it resigns from furniture)');
  await drainDialogs(page);
  check(await ev(() => {
    const s = MM.engine.state, wd = MM.maps.WING_WARDROBE;
    return s.wing.wardrobeMoved && s.grid[wd.y][wd.x] === '.';
  }), 'wardrobe: it has left the Wing');

  // ---------- the hall's-end doorway: the kid's name plate ----------
  await ev(() => { const s = MM.engine.state; s.px = 38; s.py = 11; MM.engine.tryMove(1, 0); });
  await page.waitForSelector('#modalBox h2');
  check(/ProverKid/.test(await page.textContent('#modalBox')), 'the empty doorway now bears the kid\'s name (the Wave 13 tease)');
  await drainDialogs(page);

  // ---------- the wardrobe at home in the Study ----------
  await ev(() => MM.engine.exitWing());
  await page.waitForTimeout(300);
  await drainDialogs(page);   // the post-ending castle greets with the enrolled-slime gag
  check(await ev(() => MM.engine.state.mapId === 'castle'), 'the Wing exit returns to the castle');
  check(await ev(() => MM.maps.tileSprite('o', 2, 9, 'castle', 0) === 'wardrobe'),
    'the Study corner now draws the wardrobe (live state, no grid rewrite)');
  await ev(() => { const s = MM.engine.state; s.px = 4; s.py = 10; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/13-castle-wardrobe.png' });
  // Wave 18: the confessed wardrobe is now the DELUXE avatar picker — bumping it
  // at home opens the Study wardrobe (same state the Bag's Looking Glass writes),
  // wrapped in its personality, instead of the old flavor-only dialog.
  await ev(() => { const s = MM.engine.state; s.px = 3; s.py = 9; MM.engine.tryMove(-1, 0); });
  await page.waitForSelector('#avatarPickMount');
  check(/choosing a form|not a wardrobe|jaunty angle/.test(await page.textContent('#modalBox'))
    && await ev(() => !!document.getElementById('avatarPickMount')),
    'bumping the wardrobe at home opens the Study wardrobe avatar picker (Wave 18)');
  await ev(() => { const b = document.getElementById('avatarDone'); if (b) b.click(); });
  await page.waitForTimeout(150);
  await drainDialogs(page);

  // ---------- save/load round-trip ----------
  check(await ev(() => {
    MM.engine.save(); MM.engine.load('ProverKid');
    const w = MM.engine.state.wing;
    return w && w.wardrobeMoved && MM.engine.WING_ROOMS.every(r => w.rooms[r])
      && (MM.engine.state.titles || []).includes('Keeper of the Proving Rooms');
  }), 'save/load: the whole Wing survives the round-trip');

  // ---------- the forced-chunk Spiral leg ----------
  // floor 8 = the teleport-pair chunk (deterministic chunk rotation)
  await ev(() => { MM.engine.enterSpiral(8); MM.engine.state.monsters = []; });
  await page.waitForTimeout(300);
  check(await ev(() => {
    const s = MM.engine.state;
    if (s.mapId !== 'd22f7') return false;
    s.px = 3; s.py = 4;
    MM.engine.tryMove(0, -1);   // step onto the pad at (3,3)
    return s.px === 8 && s.py === 1;   // whisked to its twin
  }), 'spiral floor 8: the teleport pad whisks you across the chunk');
  // floor 9 = a slick-rock chunk: ride a slide
  await ev(() => { MM.engine.enterSpiral(9); MM.engine.state.monsters = []; });
  await page.waitForTimeout(300);
  check(await ev(() => {
    const s = MM.engine.state;
    if (s.mapId !== 'd22f8') return false;
    s.px = 5; s.py = 2;
    MM.engine.tryMove(1, 0);    // onto the ice at (6,2) — skid to (9,2)
    return s.px === 9 && s.py === 2;
  }), 'spiral floor 9: the slick rock slides you across');
  // floor 11 = the lever/gate chunk: the gate guards a CHEST, never the stairs
  await ev(() => { MM.engine.enterSpiral(11); MM.engine.state.monsters = []; });
  await page.waitForTimeout(300);
  check(await ev(() => {
    const s = MM.engine.state;
    if (s.mapId !== 'd22f10') return false;
    s.px = 2; s.py = 6;
    MM.engine.tryMove(1, 0);    // pull the L at (3,6)
    return s.grid[2][9] === '.' && !!s.opened['d22f10:9,2'];
  }), 'spiral floor 11: the lever opens the chest gate, keyed to ITS floor');
  // floor 15 = the gear-plate landing: cycle the plate, per-floor state
  await ev(() => { MM.engine.enterSpiral(15); MM.engine.state.monsters = []; });
  await page.waitForTimeout(300);
  check(await ev(() => MM.engine.state.mapId === 'd22f14' && MM.engine.openGateLetter('d22f14') === 'A'),
    'spiral floor 15: the gear landing starts with gate A open');
  await ev(() => { const s = MM.engine.state; s.px = 2; s.py = 7; MM.engine.tryMove(1, 0); }); // wind the plate
  check(await ev(() => {
    return MM.engine.openGateLetter('d22f14') === 'B'
      && MM.engine.gateIsOpen('B', 'd22f14') && !MM.engine.gateIsOpen('B', 'd22f19');
  }), 'spiral floor 15: one pull opens the B-door — and the rotation never leaks to another floor');
  await ev(() => { const s = MM.engine.state; s.px = 5; s.py = 3; MM.engine.tryMove(0, 1); }); // walk through the open B door
  check(await ev(() => MM.engine.state.px === 5 && MM.engine.state.py === 4), 'spiral floor 15: the open vault door is walkable');
  await ev(() => { const s = MM.engine.state; s.px = 5; s.py = 5; MM.engine.tryMove(1, 0); }); // the vault chest
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await drainDialogs(page);
  check(await ev(() => !!MM.engine.state.opened['d22f14:6,5']), 'spiral floor 15: the rotating vault yields its chest');
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/14-spiral-gear-landing.png' });

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
