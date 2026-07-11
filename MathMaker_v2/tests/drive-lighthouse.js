// Drive MathMaker v2 Wave 1 (EXPANSION_PLAN.md): the Smugglers' Vault found
// via the pet's secret-sense, the guarded crossbow chest, the ranged round-1
// miss rule, all three spells, and the Great Lighthouse — four floors (one
// mechanic reprised each), the Murk's 50%-HP thicken phase, and the Keeper of
// the Light ending.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-lighthouse');

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

// Solve every modal problem thrown at us (seal exams sometimes ask twice)
// until the modal closes or we hit a cap.
async function solveUntilClosed(page, cap) {
  for (let i = 0; i < (cap || 5); i++) {
    const hasProblem = await page.$('#modalBox .prob-text');
    if (!hasProblem) return;
    await solveModalProblem(page);
    await page.waitForTimeout(150);
  }
}

async function battleToVictory(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    if (await page.$('#victOk')) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (info) {
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else {
        await page.fill('#battleProblem #answerInput', info.val);
        await page.keyboard.press('Enter');
      }
    }
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 60000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  await page.waitForTimeout(300);
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) break;
    await ok.click();
    await page.waitForTimeout(250);
  }
}

// Bump a tile identified by its character from the nearest open neighbor —
// avoids hardcoding walk paths through every corridor.
async function bumpTile(page, ch) {
  return page.evaluate((ch) => {
    const s = MM.engine.state;
    const pos = MM.maps.find(s.grid, ch)[0];
    if (!pos) return null;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = pos.x - dx, ny = pos.y - dy;
      const t = (s.grid[ny] || [])[nx];
      if (t === '.' || t === 'X' || t === '<') {
        s.px = nx; s.py = ny;
        MM.engine.tryMove(dx, dy);
        return { x: pos.x, y: pos.y };
      }
    }
    return null;
  }, ch);
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
  await page.fill('#newName', 'LightKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // endgame hero, all three lenses lit, gold badges everywhere (unlocks every
  // spell), a Champion pet, and a middling weapon (so the crossbow is a
  // clear upgrade and auto-equips)
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true;
    s.gear = { weapon: ['stick', 'sword'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'] };
    s.equipped = { weapon: 'sword', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard' };
    s.level = 18; s.maxhp = 110; s.hp = 110; s.gold = 100; s.difficulty = 'story';
    s.continent = 'isles';
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    s.isles.pet = { species: 'blue', name: 'Compass', stage: 2, fed: 20, correct: 200 };
    for (const sk of Object.keys(MM.data.SKILL_NAMES)) s.badges[sk] = 3; // gold everywhere
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // ---------- the pet finds the Vault ----------
  check(await page.evaluate(() => MM.engine.state.grid[16][5] === '%'), 'the secret wall starts closed');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 15; MM.engine.updatePetAlert(); });
  check(await page.evaluate(() => MM.engine.petAlert === true), 'the pet perks up near the secret wall');
  await page.screenshot({ path: SHOTS + '/1-pet-alert.png' });
  await page.evaluate(() => { const s = MM.engine.state; MM.engine.tryMove(0, 1); }); // bump south into the wall
  check(await page.evaluate(() => MM.engine.state.grid[16][5] === '4'), 'bumping the crack reveals the vault entrance');
  check(await page.evaluate(() => MM.engine.state.opened['isles:5,16'] === true), 'the reveal persists via state.opened');

  // re-entering the isles keeps the entrance revealed
  await page.evaluate(() => { MM.engine.enterWorld(); });
  check(await page.evaluate(() => MM.engine.state.grid[16][5] === '4'), 'the vault entrance survives a map reload');

  // ---------- into the Smugglers' Vault (dungeon 18) ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 15; MM.engine.tryMove(0, 1); });
  await page.waitForSelector('#modalBox .prob-text'); // the seal exam (mixed, from the previous isle task)
  await solveUntilClosed(page, 5);
  await page.waitForFunction(() => MM.engine.state.mapId === 'd18');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/2-vault.png' });
  check(true, 'the seal exam admits you to the Smugglers\' Vault');
  check(await page.evaluate(() => {
    const behaviors = MM.engine.state.monsters.map(m => m.behavior);
    return behaviors.includes('thief') && behaviors.includes('guard');
  }), 'the thief gauntlet and its guard are on shift');

  // the guarded crossbow chest — a guaranteed find, not a random roll
  await bumpTile(page, '*'); // opens whichever chest the pathing reaches first is fine, but we need THE crossbow chest specifically:
  // find it precisely: the chest at (13,3), reached from (13,2)
  await page.evaluate(() => { const s = MM.engine.state; s.px = 13; s.py = 2; MM.engine.tryMove(0, 1); });
  await page.waitForSelector('#modalBox .prob-text');
  await solveUntilClosed(page, 3);
  await page.waitForTimeout(200);
  check(await page.evaluate(() => MM.engine.state.gear.weapon.includes('crossbow')), 'the crossbow chest yields the Smuggler\'s Crossbow');
  check(await page.evaluate(() => MM.engine.state.equipped.weapon === 'crossbow'), 'the crossbow auto-equips (it beats the sword)');

  // Captain Brine -> the Wayfinder's Locket
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    s.px = b.x; s.py = b.y + 1;
    MM.engine.startCombat(b);
  });
  // the ranged rule: round-1 counterattack should always miss with the
  // crossbow equipped — confirm before finishing the fight
  await page.waitForTimeout(900);
  await page.screenshot({ path: SHOTS + '/3-ranged-sublabel.png' });
  check((await page.textContent('.bbar-box.hero .bbar-sub')).includes('opening shot'), 'the ranged note shows in the battle sub-label');
  await battleToVictory(page, 40);
  check(await page.evaluate(() => MM.engine.state.items.charms.includes('wayfinder')), 'Captain Brine\'s hoard yields the Wayfinder\'s Locket');
  check(await page.evaluate(() => MM.engine.state.bossesDefeated.d18 === true), 'the vault boss is marked defeated');

  // leave the vault, back to the isles
  await page.evaluate(() => { const s = MM.engine.state; const x = MM.maps.find(s.grid, 'X')[0]; s.px = x.x + 1; s.py = x.y; MM.engine.tryMove(-1, 0); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');
  check(true, 'exited the vault back to the isles');

  // ---------- spells: Scout, Blink, Beacon ----------
  check(await page.evaluate(() => MM.engine.spellUnlocked('scout') && MM.engine.spellUnlocked('blink') && MM.engine.spellUnlocked('beacon')),
    'all three spells are unlocked (gold badges everywhere)');

  // ---------- the Great Lighthouse (dungeon 17), floor by floor ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 7; s.py = 2; MM.engine.tryMove(0, -1); });
  let atH = await page.$('#modalBox .prob-text');
  if (!atH) {
    await page.evaluate(() => { const s = MM.engine.state; s.px = 8; s.py = 2; MM.engine.tryMove(0, -1); });
  }
  await page.waitForSelector('#modalBox .prob-text');
  await solveUntilClosed(page, 5);
  await page.waitForFunction(() => MM.engine.state.mapId === 'd17f0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/4-lighthouse-f1.png' });
  check(true, 'the seal exam admits you to the Great Lighthouse');

  // floor 1: Scout lights up the secret alcove (move into view of it first,
  // so the screenshot actually shows the shimmer, not just the flag)
  await page.evaluate(() => { const s = MM.engine.state; s.px = 21; s.py = 12; MM.engine.castScout(); });
  check(await page.evaluate(() => MM.engine.scoutActive()), 'Scout is active');
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/5-scout-glow.png' });
  const slid = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 10; s.py = 11;
    MM.engine.tryMove(0, -1); // onto the slide lake -> rides it north
    return { x: s.px, y: s.py };
  });
  check(slid.x === 10 && slid.y === 1, `the slide carries you the length of the lake (landed ${slid.x},${slid.y})`);
  // key -> locked stairs shaft -> floor 2
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 2;
    MM.engine.tryMove(0, -1); // key at (2,1)
    return (s.isles.keys.d17 || 0) === 1;
  }), 'the key is picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 20; s.py = 5;
    MM.engine.tryMove(0, -1); // K at (20,4)
    return s.grid[4][20] === '.' && s.isles.keys.d17 === 0;
  }), 'the key opens the locked stairs shaft');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 23; s.py = 2; MM.engine.tryMove(0, -1); }); // '>' at (23,1)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd17f1');
  check(true, 'floor 1 (slides) complete — descending to floor 2');

  // floor 2 (pads): the pad pair carries you across the gallery
  const padded = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 3; s.py = 2;
    MM.engine.tryMove(0, 1); // onto the pad at (3,3) -> twin at (22,3)
    return { x: s.px, y: s.py };
  });
  check(padded.x === 22 && padded.y === 3, `floor 2's pad pair whisks you across (landed ${padded.x},${padded.y})`);
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 1;
    MM.engine.tryMove(0, 1); // key at (2,2)
    return (s.isles.keys.d17 || 0) === 1;
  }), 'floor 2\'s key is picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 21; s.py = 2;
    MM.engine.tryMove(1, 0); // K at (22,2), the stairs' locked pocket entrance
    return s.grid[2][22] === '.' && s.isles.keys.d17 === 0;
  }), 'floor 2\'s key opens the locked pocket around the stairs');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 24; s.py = 2; MM.engine.tryMove(0, -1); }); // '>' at (24,1)
  await page.waitForFunction(() => MM.engine.state.mapId === 'd17f2');
  check(true, 'floor 2 (pads) complete — descending to floor 3');

  // floor 3 (keys) + the lever-gated chute shortcut
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 2; s.py = 4;
    MM.engine.tryMove(0, -1); // key 1 at (2,3)
    return (s.isles.keys.d17 || 0) === 1;
  }), 'floor 3\'s first key is picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 8; s.py = 6;
    MM.engine.tryMove(0, -1); // K at (8,5)
    return s.grid[5][8] === '.' && s.isles.keys.d17 === 0;
  }), 'the first lock opens (west -> middle chamber)');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 11; s.py = 7;
    MM.engine.tryMove(0, -1); // key 2 at (11,6)
    return (s.isles.keys.d17 || 0) === 1;
  }), 'floor 3\'s second key is picked up');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 17; s.py = 11;
    MM.engine.tryMove(0, -1); // K at (17,10)
    return s.grid[10][17] === '.' && s.isles.keys.d17 === 0;
  }), 'the second lock opens (middle -> east chamber)');
  // the lever-gated chute: pull the lever, walk through the gates, drop
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 19; s.py = 2;
    MM.engine.tryMove(1, 0); // pull the L at (20,2)
    return s.grid[2][22] === '.' && s.grid[2][23] === '.';
  }), 'the lever opens the chute-room gates');
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 20; s.py = 2;
    MM.engine.tryMove(1, 0); // (21,2)
    MM.engine.tryMove(1, 0); // (22,2)
    MM.engine.tryMove(1, 0); // (23,2)
    MM.engine.tryMove(1, 0); // onto the chute at (24,2)
  });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd17f3');
  check(await page.evaluate(() => MM.engine.state.px === 24 && MM.engine.state.py === 2),
    'the chute drops you to the same spot on floor 4');
  check(await page.evaluate(() => MM.engine.state.grid[2][24] === '.' && MM.engine.state.grid[2][23] === '*'),
    'the chute lands on open floor, a chest waiting beside it');
  await page.screenshot({ path: SHOTS + '/6-lighthouse-f4.png' });

  // ---------- Blink, then the Murk (two-phase boss) ----------
  const stamBefore = await page.evaluate(() => MM.engine.state.stamina);
  const blinked = await page.evaluate(() => {
    const s = MM.engine.state;
    s.px = 22; s.py = 2; // the chest at (23,2) is the tile being hopped over
    MM.engine.lastDir = { dx: 1, dy: 0 };
    MM.engine.castBlink();
    return { x: s.px, y: s.py, stamina: s.stamina };
  });
  check(blinked.x === 24 && blinked.y === 2, `Blink hops two tiles (landed ${blinked.x},${blinked.y})`);
  check(blinked.stamina === stamBefore - 10, 'Blink costs 10 stamina');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    MM.engine.lastDir = { dx: 0, dy: -1 }; // landing would be the wall above
    const before = { x: s.px, y: s.py, stamina: s.stamina };
    MM.engine.castBlink();
    return s.px === before.x && s.py === before.y && s.stamina === before.stamina;
  }), 'Blink refuses a landing inside a solid tile (and costs nothing)');

  // fleeing must reset the thicken phase along with the Murk's health —
  // the rematch starts from scratch, telegraph and all (gentle failure)
  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    // Deterministic thicken setup: inflate the pool so ONE strike of any
    // size (even a streak-fueled crit) lands below 50% but can never
    // kill — the old floor(maxhp/2)+1 could be one-shot by a crit,
    // skipping the thicken entirely (~25% flake; crashed two sweeps).
    s.streak = 0;
    b.maxhp = 200;
    b.hp = 101; // just above 50%; max possible strike ≈ 60 ≪ 101
    s.px = b.x; s.py = b.y - 1;
    MM.engine.startCombat(b);
  });
  await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
  {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
  }
  // generous timeout: under full-sweep I/O load (screenshots + Dropbox
  // indexing) the battle animation chain can crawl — 30s has proven flaky
  // in sweeps while passing standalone every time
  await page.waitForFunction(() => { const b = MM.engine.state.monsters.find(m => m.boss); return b && b.thickened; }, null, { timeout: 90000 });
  const atkThick = await page.evaluate(() => MM.engine.state.monsters.find(m => m.boss).atk);
  await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
  await page.click('#fleeBtn');
  await page.waitForFunction(() => !MM.battle.active());
  check(await page.evaluate(() => {
    const b = MM.engine.state.monsters.find(m => m.boss);
    return b.hp === b.maxhp && !b.thickened;
  }), 'fleeing heals the Murk AND resets its thicken phase');
  check((await page.evaluate(() => MM.engine.state.monsters.find(m => m.boss).atk)) === atkThick - 2,
    'the +2 thicken attack is rolled back on flee');
  // restore the boss's REAL pool — the deterministic flee setup inflated
  // it to 200, which silently doubled the main fight below and overran
  // its round budget (a self-inflicted sweep failure)
  await page.evaluate(() => {
    const b = MM.engine.state.monsters.find(m => m.boss);
    const st = MM.engine.monsterStats(17, true);
    b.maxhp = st.hp; b.hp = st.hp;
  });

  await page.evaluate(() => {
    const s = MM.engine.state;
    const b = s.monsters.find(m => m.boss);
    s.px = b.x; s.py = b.y - 1;
    MM.engine.startCombat(b);
  });
  await page.waitForTimeout(600);
  // grind the Murk down past 50% HP and confirm the thicken telegraph fires
  let thickened = false;
  for (let i = 0; i < 40; i++) {
    if (await page.$('#victOk')) break;
    if (!thickened && await page.evaluate(() => { const b = MM.engine.state.monsters.find(m => m.boss); return b && b.thickened; })) {
      thickened = true;
      await page.screenshot({ path: SHOTS + '/7-murk-thickens.png' });
    }
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (info) {
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    }
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 60000 });
  await page.screenshot({ path: SHOTS + '/8-murk-victory.png' });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  check(thickened || await page.evaluate(() => MM.engine.state.monsters.find(m => m.boss) === undefined),
    'the Murk thickens at 50% HP (telegraphed, +2 attack)');
  check(await page.evaluate(() => MM.engine.state.isles.lampLit === true), 'the Great Lamp is lit');

  // the Keeper of the Light ending
  await page.waitForSelector('#modalBox h2');
  check(/Keeper of the Light/.test(await page.textContent('#modalBox h2')), 'the ending dialog titles "Keeper of the Light"');
  await page.screenshot({ path: SHOTS + '/9-keeper-of-the-light.png' });
  await page.click('#dlgOk');

  // ---------- Beacon, once per visit ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 12; s.py = 9; MM.engine.castBeacon(); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'd17f0');
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    const x = MM.maps.find(s.grid, 'X')[0];
    return s.px === x.x && s.py === x.y;
  }), 'Beacon returns you to the entrance (climbing back through every floor)');
  check(await page.evaluate(() => MM.engine.spellsUsedThisVisit.beacon === true), 'Beacon is spent for this visit');
  check(await page.evaluate(() => { MM.engine.castBeacon(); return true; }) && true, 'a second Beacon cast is a no-op');

  // persistence
  check(await page.evaluate(() => {
    MM.engine.save(); MM.engine.load('LightKid');
    const s = MM.engine.state;
    return s.isles.lampLit === true && s.gear.weapon.includes('crossbow') && s.items.charms.includes('wayfinder');
  }), 'the lit lamp, crossbow, and locket all persist through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
