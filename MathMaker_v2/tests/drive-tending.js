// Drive MathMaker v2 Wave 9 (EXPANSION_PLAN.md — "The Tending"): the
// post-game practice loop. Daily Tangles (day-flip regeneration, one battle,
// the days-tended counter deduped per real day, a milestone), the Spiral
// Stair (climb to a landing, the checkpoint, return-to-landing, Beacon),
// cosmetic gold sinks (one furnishing + one pet hat, both rendered), and the
// Hall of Heroes plaque showing all three new counters.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-tending');

function canonicalize(p) {
  if (!p) return null;
  if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
  if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
  if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
  return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
}

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
  async function clearModals(cap) {
    for (let i = 0; i < (cap || 8); i++) {
      if (!(await ev(() => MM.ui.modalOpen()))) return;
      const btn = await page.$('#modalBox .btnrow button');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(150);
    }
  }
  async function winBattle(cap) {
    for (let i = 0; i < (cap || 40); i++) {
      if (await page.$('#victOk')) break;
      const form = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!form) {
        const cont = await page.$('.battle-btnrow button.primary');
        if (cont) await cont.click();
        await page.waitForTimeout(300);
        continue;
      }
      const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
      await page.waitForTimeout(700);
    }
    await page.waitForSelector('#victOk', { timeout: 20000 });
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'Tending');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // Make an endgame hero directly — Wave 7's own drive already proves the
  // coronation flow; this drive tests what comes AFTER it.
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 14;
    s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.isles.lampLit = true; s.isles.spireDone = true;
    s.isles.gullwrackRebuilt = true; s.isles.breakwaterDone = true;
    s.isles.pet = { species: 'blue', name: 'Rex', stage: 2, fed: 5, correct: 20, hat: null };
    s.endingDone = true;
    s.gold = 3000; s.level = 25; s.hp = s.maxhp = 300;
    s.seenBattleHelp = true; s.seenCeremony = true; s.metMiscount = true;
    // gold badges everywhere -> Beacon unlocked, for the Spiral-exit test
    for (const sk of MM.mastery.cappedSkills(s)) s.badges[sk] = 3;
    MM.engine.enterWorld();
    MM.engine.save();
  });
  check(await ev(() => MM.engine.spellUnlocked('beacon')), 'setup: Beacon is unlocked for the exit test');

  // ================= Daily Tangles =================
  const t0 = await ev(() => MM.engine.state.tangles);
  check(!!t0 && t0.items.length >= 1 && t0.items.length <= 3, `entering the world post-ending auto-generates 1-3 tangles (got ${t0 ? t0.items.length : 0})`);
  const onWalkable = await ev(() => {
    const ow = MM.maps.parse(MM.maps.OVERWORLD, '~');
    return MM.engine.state.tangles.items.every(t => ow[t.y][t.x] === '.');
  });
  check(onWalkable, 'every tangle sits on a plain walkable tile — placement is DERIVED, never on a building/water/story tile');
  await page.screenshot({ path: SHOTS + '/1-tangle-on-map.png' });

  // day-flip regenerates (fake a stale date, exactly like the bounty drives)
  await ev(() => { MM.engine.state.tangles.date = '2020-01-01'; });
  await ev(() => MM.engine.refreshTangles());
  const t1 = await ev(() => MM.engine.state.tangles);
  check(t1.date !== '2020-01-01', 'a stale date regenerates the day\'s tangles');

  // untangle one: draws the same weakest-first mixed pool as a Homework Golem
  await ev(() => {
    const s = MM.engine.state;
    MM.engine.startTangleBattle(s.tangles.items[0]);
  });
  await page.waitForFunction(() => MM.battle.active());
  check(true, 'bumping a tangle starts a battle');
  await winBattle();
  check(await ev(() => MM.engine.state.tangles.items[0].done), 'the tangle is marked untangled after victory');
  check(await ev(() => MM.engine.state.daysTended) === 1, 'the FIRST tangle of the day sets days-tended to 1');

  // a second tangle the SAME day must NOT double-count
  if ((await ev(() => MM.engine.state.tangles.items.length)) < 2) {
    await ev(() => { MM.engine.state.tangles.items.push({ x: 5, y: 6, done: false }); });
  }
  await ev(() => {
    const s = MM.engine.state;
    const t = s.tangles.items.find(x => !x.done);
    MM.engine.startTangleBattle(t);
  });
  await page.waitForFunction(() => MM.battle.active());
  await winBattle();
  check(await ev(() => MM.engine.state.daysTended) === 1, 'a SECOND tangle the same real day is still only ONE day tended (no double-count)');

  // the milestone: force 9 tended days, flip to a fresh day, untangle #10
  await ev(() => {
    const s = MM.engine.state;
    s.daysTended = 9;
    s.lastTendedDate = '2020-01-01';
    s.tangles.date = '2020-01-01';
    MM.engine.refreshTangles();
    MM.engine.startTangleBattle(s.tangles.items[0]);
  });
  await page.waitForFunction(() => MM.battle.active());
  await winBattle();
  check(await ev(() => MM.engine.state.daysTended) === 10, 'the 10th day-tended fires');
  await page.waitForSelector('#modalBox h2', { timeout: 8000 });
  const msTitle = await page.textContent('#modalBox h2');
  check(/10 days tended/.test(msTitle), `the 10-day milestone celebrates once ("${msTitle.trim()}")`);
  await page.screenshot({ path: SHOTS + '/2-milestone.png' });
  await dlgOk();
  // milestone fires exactly ONCE — clearing pendingBadges must not leave another queued
  check(!(await ev(() => MM.ui.modalOpen())), 'the milestone celebration does not repeat itself');

  // notice board self-narrates the day's tangles — force a fresh day so
  // there is an UNDONE tangle left to narrate (the ones above are all spent)
  await ev(() => {
    const s = MM.engine.state;
    s.tangles.date = '2020-01-01';
    MM.engine.refreshTangles();
  });
  await ev(() => { MM.ui.noticeBoard(); });
  const board = await page.textContent('#modalBox');
  check(/tangle/i.test(board), 'the Notice Board self-narrates the day\'s tangles');
  await dlgOk();

  // ================= The Spiral Stair =================
  // sealed before the ending
  await ev(() => { MM.engine.state.endingDone = false; });
  await goto(19, 4);
  await bump('ArrowUp'); // bump 'H' (the tower sits just north of the castle)
  check(/no keyhole/i.test((await page.textContent('#modalBox')).replace(/\s+/g, ' ')),
    'the Spiral is sealed before the ending');
  await dlgOk();
  await ev(() => { MM.engine.state.endingDone = true; });

  await goto(19, 4);
  await bump('ArrowUp');
  const spiralMenu1 = await page.textContent('#modalBox');
  check(/Climb from Floor 1/.test(spiralMenu1), 'the Spiral offers to climb from floor 1');
  check(!/Return to your Landing/.test(spiralMenu1), 'no landing yet — nothing to return to');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForFunction(() => MM.engine.state.mapId.startsWith('d22'));
  check(true, 'climbing enters the Spiral (dungeon 22)');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/3-spiral-floor1.png' });
  check(await ev(() => MM.engine.state.spiral.highest) === 1, 'floor 1 sets the highest-step counter to 1');

  // fight the one monster on floor 1 — proves the tangle roster works INSIDE the tower too.
  // Floors this deep carry dungeon-21+ tier stats (E.enterDungeon's per-floor
  // ramp) — trim HP down to a quick, deterministic fight; the ramp formula
  // itself is unit-tested separately, this drive is checking the FLOW.
  const hadMonster = await ev(() => MM.engine.state.monsters.length > 0);
  check(hadMonster, 'floor 1 has at least one tangle to meet');
  if (hadMonster) {
    await ev(() => { const s = MM.engine.state; s.monsters.forEach(m => { m.hp = 4; }); MM.engine.startCombat(s.monsters[0]); });
    await page.waitForFunction(() => MM.battle.active());
    await winBattle();
  }

  // climb straight to floor 5 — a landing
  await ev(() => { for (let i = 0; i < 4; i++) MM.engine.changeFloor(1); });
  check(await ev(() => MM.engine.state.floorIndex) === 4, 'now on floor 5 (index 4)');
  const landing = await ev(() => {
    const s = MM.engine.state;
    return { hasChest: MM.maps.find(s.grid, '*').length > 0, hasBoss: s.monsters.some(m => m.boss) };
  });
  check(landing.hasChest, 'floor 5 (a landing) has a chest');
  check(landing.hasBoss, 'floor 5 (a landing) has its tougher tangle boss');
  await page.screenshot({ path: SHOTS + '/4-spiral-landing.png' });

  // defeat the landing boss — verify the dedicated victory branch, not the generic one
  await ev(() => {
    const s = MM.engine.state;
    const boss = s.monsters.find(m => m.boss);
    boss.hp = 4;
    MM.engine.startCombat(boss);
  });
  await page.waitForFunction(() => MM.battle.active());
  await winBattle();
  check(await ev(() => MM.engine.state.bossesDefeated[MM.engine.state.mapId]) === true, 'the landing boss is marked defeated (never has to be refought to pass through)');
  check(await ev(() => MM.engine.state.spiral.landing) === 5, 'floor 5 is now the checkpoint ("highest landing")');

  // one floor further: floor 6
  await ev(() => MM.engine.changeFloor(1));
  check(await ev(() => MM.engine.state.spiral.highest) === 6, 'climbing to floor 6 updates the highest-step counter');
  await page.screenshot({ path: SHOTS + '/5-spiral-floor6.png' });

  // Beacon: already unlocked, already works inside any 'd'-prefixed dungeon —
  // no special-casing needed, and this proves it
  await ev(() => MM.engine.castBeacon());
  check((await ev(() => MM.engine.state.mapId)) === 'd22f0', 'Beacon returns to the tower\'s own floor 1 — "home", not stranded 5 floors up');

  // leave the tower entirely, then return to the checkpoint — no run-loss
  await ev(() => MM.engine.exitDungeon());
  check((await ev(() => MM.engine.state.mapId)) === 'world', 'the tower can be left entirely, any time');
  await goto(19, 4);
  await bump('ArrowUp');
  const spiralMenu2 = await page.textContent('#modalBox');
  check(/Return to your Landing \(Floor 5\)/.test(spiralMenu2), 'the entrance now offers to return to the highest landing');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForFunction(() => MM.engine.state.mapId.startsWith('d22'));
  check((await ev(() => MM.engine.state.floorIndex)) === 4, 'returning to the landing lands exactly on floor 5 — nothing lost, nothing to re-climb');
  await ev(() => MM.engine.exitDungeon());

  // ================= Cosmetic gold sinks =================
  await ev(() => MM.engine.enterCastle());
  await page.waitForTimeout(200);
  await clearModals(2); // the one-time "a visitor enrolls" gag, post-ending

  // a furnishing: the garden bed at (2,12)
  await goto(2, 11);
  await bump('ArrowDown');
  const gardenBefore = await page.textContent('#modalBox');
  check(/empty patch of dirt/.test(gardenBefore), 'an unbought garden reads as an empty patch');
  await page.click('#modalBox .btnrow button.primary'); // Buy
  await page.waitForTimeout(150);
  const gardenAfter = await page.textContent('#modalBox');
  check(/Sunflowers/.test(gardenAfter), 'buying the garden confirms with its bought line');
  await dlgOk();
  check(await ev(() => MM.engine.state.castleFurnish.garden) === true, 'the garden purchase is recorded');
  const gardenSprite = await ev(() => MM.maps.tileSprite('d', 2, 12, 'castle', 0));
  check(gardenSprite === 'gardenFull', 'the garden tile now RENDERS as bought, not empty');
  await page.screenshot({ path: SHOTS + '/6-garden-bought.png' });

  // the pet's wardrobe
  await goto(5, 11);
  await bump('ArrowDown'); // 'l'
  await page.waitForSelector('#modalBox');
  const wardrobe1 = await page.textContent('#modalBox');
  check(/Wardrobe/.test(wardrobe1), 'the pet wardrobe opens');
  const buyBtn = await page.$('[data-hat]');
  await buyBtn.click();
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.state.petHats.length) > 0, 'buying a hat records ownership');
  check(await ev(() => !!MM.engine.state.isles.pet.hat), 'buying a hat wears it immediately');
  const closeBtn = await page.$('#wardrobeClose');
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/7-pet-hat.png' });

  // a boss statue — commissioned from a boss actually beaten (The Knot, from
  // the Spiral's own landing) — a nice cross-system integration check
  await goto(6, 11);
  await bump('ArrowDown'); // 'n', the first statue plinth
  const statue1 = await page.textContent('#modalBox');
  check(/empty plinth/i.test(statue1), 'an unbought statue plinth reads as empty');
  check(/The Knot/.test(statue1), 'the plinth offers to commission a boss actually defeated (the Spiral\'s landing guardian)');
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForTimeout(200);
  check((await ev(() => MM.engine.state.castleFurnish.statues[0])) === 'The Knot', 'commissioning the statue records the boss name');
  const statueSprite = await ev(() => MM.maps.tileSprite('n', 6, 12, 'castle', 0));
  check(statueSprite === 'statueFull', 'the statue plinth now renders filled');
  await page.screenshot({ path: SHOTS + '/8-statue.png' });
  await dlgOk(); // the commission's own confirmation dialog

  // ================= Hall of Heroes plaque =================
  await ev(() => { MM.engine.state.academyTotal = 12; });
  await ev(() => MM.ui.hallOfHeroes());
  const plaque = await page.textContent('#modalBox');
  check(/days tended/.test(plaque), 'the plaque shows days tended');
  check(/Floor 6 of the Spiral/.test(plaque), 'the plaque shows the Spiral\'s highest floor');
  check(/12 students helped/.test(plaque), 'the plaque shows Academy attendance');
  await page.screenshot({ path: SHOTS + '/9-hall-of-heroes.png' });
  await dlgOk();

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
