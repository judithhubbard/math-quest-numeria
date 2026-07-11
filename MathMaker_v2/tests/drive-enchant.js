// Drive MathMaker v2 Wave 2 (EXPANSION_PLAN.md): Emberlyn the Enchanter —
// finding a gem in a glimmering chest, fusing it onto gear (renamed label),
// each enchant hook's numeric effect (flame/frost/guard/feather/magnet/echo/
// leech), the amulet slot (Tidewood/Keeper's/Wayfarer's), and save/load
// persistence of gems, enchants, and amulets.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-enchant');

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

async function battleToVictory(page, rounds) {
  for (let i = 0; i < rounds; i++) {
    if (await page.$('#victOk')) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(400); continue; }
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (info) {
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    }
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('#victOk', { timeout: 20000 });
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
  await page.fill('#newName', 'EnchantKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true;
    s.gear = { weapon: ['stick', 'tidal'], body: ['clothes', 'pearl'], helmet: ['coral'], boots: ['wavewalkers'], ring: ['guard'], amulet: [] };
    s.equipped = { weapon: 'tidal', body: 'pearl', helmet: 'coral', boots: 'wavewalkers', ring: 'guard', amulet: null };
    s.level = 18; s.gold = 2000; s.difficulty = 'story';
    s.continent = 'isles';
    // gold badges everywhere so the many money-quizzes below can't pop a
    // surprise badge-celebration modal mid-flow (checkBadge only fires on a
    // newly-reached tier, so pre-maxing every skill silences it for good)
    for (const sk of Object.keys(MM.data.SKILL_NAMES)) s.badges[sk] = 3;
    MM.engine.recalcMaxHp(); MM.engine.recalcMaxStamina(); s.hp = s.maxhp; s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // ---------- find a gem in the Smugglers' Vault's guaranteed chest ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 15; MM.engine.tryMove(0, 1); }); // bump the % on the south beach
  check(await page.evaluate(() => MM.engine.state.grid[16][5] === '4'), 'the vault entrance is found');
  await page.evaluate(() => { const s = MM.engine.state; s.px = 5; s.py = 15; MM.engine.tryMove(0, 1); });
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page); // the seal exam
  await page.waitForFunction(() => MM.engine.state.mapId === 'd18');
  await page.waitForTimeout(300);

  const gemsBefore = await page.evaluate(() => MM.engine.state.items.gems.length);
  await page.evaluate(() => { const s = MM.engine.state; s.px = 15; s.py = 11; MM.engine.tryMove(0, 1); }); // bump the guaranteed gem chest at (15,12)
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/1-glimmering-chest.png' });
  check(await page.evaluate((n) => MM.engine.state.items.gems.length === n + 1, gemsBefore), 'the guaranteed chest yields a gem');

  // every guaranteed-gem coordinate must point at a real chest on its map —
  // map edits move chests (the chute chest already moved once in Wave 1.5)
  check(await page.evaluate(() => {
    return Object.entries(MM.engine.GUARANTEED_GEM_CHESTS).every(([mapId, spots]) => {
      const m = mapId.match(/^d(\d+)(?:f(\d+))?$/);
      const grid = MM.maps.parse(MM.maps.dungeonFloors(+m[1])[+(m[2] || 0)], '#');
      return spots.every(p => grid[p.y][p.x] === '*');
    });
  }), 'every guaranteed gem chest coordinate holds a real chest on its map');

  // give ourselves a known gem to fuse, deterministically, and head back out
  await page.evaluate(() => { MM.engine.state.items.gems = ['flame']; MM.engine.save(); MM.engine.exitDungeon(); });
  await page.waitForFunction(() => MM.engine.state.mapId === 'isles');

  // ---------- talk to Emberlyn, fuse the Flame gem onto the weapon ----------
  await page.evaluate(() => { const s = MM.engine.state; s.px = 25; s.py = 11; MM.engine.tryMove(0, 1); }); // bump 'f' at (25,12)
  await page.waitForSelector('#modalBox h2');
  check(/Emberlyn/.test(await page.textContent('#modalBox h2')), 'bumping Emberlyn opens her dialog');
  await page.screenshot({ path: SHOTS + '/2-emberlyn.png' });
  await page.click('[data-fuse-slot="weapon"]');
  await page.waitForSelector('#modalBox .btnrow button');
  const gemBtnText = await page.textContent('#modalBox .btnrow');
  check(/Flame/.test(gemBtnText), 'the gem-picker offers the owned Flame gem');
  await page.click('#modalBox .btnrow button >> nth=0'); // the Flame Gem option (first button)
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page); // fusing always succeeds
  await page.waitForSelector('#modalBox h2'); // back at Emberlyn's dialog
  check(await page.evaluate(() => MM.engine.state.enchants['weapon:tidal'] === 'flame'), 'the Flame gem is fused onto the Tidal Blade');
  const gearText = await page.textContent('#modalBox');
  check(/Flaming Tidal Blade/.test(gearText), 'Emberlyn\'s dialog shows the renamed "Flaming Tidal Blade"');
  await page.screenshot({ path: SHOTS + '/3-fused.png' });
  await page.click('#dlgOk');

  // the renamed item shows up in the bag too
  await page.keyboard.press('b');
  await page.waitForSelector('#modalBox h2');
  check(/Flaming Tidal Blade/.test(await page.textContent('#modalBox')), 'the bag shows the renamed weapon');
  await page.click('#bagClose');

  // ---------- numeric effect of every gem hook ----------
  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.enchants = {};
    const base = MM.engine.strikePower();
    s.enchants['weapon:tidal'] = 'flame';
    return MM.engine.strikePower() === base + 2;
  }), 'Flame gem: +2 strike power');

  check(await page.evaluate(() => {
    // rollMonsterHit rolls internally, so pin Math.random to compare the
    // formula directly rather than two independent random draws
    const orig = Math.random;
    Math.random = () => 0.5;
    const a = MM.engine.rollMonsterHit(100, 0), b = MM.engine.rollMonsterHit(100, 2);
    Math.random = orig;
    return a - b === 2;
  }), 'Frost gem: rollMonsterHit\'s frostReduction subtracts exactly 2');

  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.enchants = {};
    const base = MM.engine.totalDef();
    s.enchants['helmet:coral'] = 'guard';
    return MM.engine.totalDef() === base + 1;
  }), 'Guard gem: +1 block');

  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.enchants = {};
    const base = MM.engine.dodgeChance();
    s.enchants['boots:wavewalkers'] = 'feather';
    return Math.abs(MM.engine.dodgeChance() - (base + 0.04)) < 1e-9;
  }), 'Feather gem: +4% dodge');

  check(await page.evaluate(() => {
    const s = MM.engine.state;
    const goldBefore = s.gold;
    s.enchants = {};
    s.gold = 0;
    const off = MM.engine.gainGold(100);
    s.gold = 0;
    s.enchants['ring:guard'] = 'magnet';
    const on = MM.engine.gainGold(100);
    s.gold = goldBefore; // this test zeroes gold as a side effect — restore it
    return off === 100 && on === 110;
  }), 'Magnet gem: +10% gold found');

  check(await page.evaluate(() => {
    const s = MM.engine.state;
    s.enchants = {};
    s.streak = 6; // qualifies for the +4 streak bonus
    const base = MM.engine.strikePower();
    s.enchants['weapon:tidal'] = 'echo';
    return MM.engine.strikePower() === base + 1;
  }), 'Echo gem: +1 to an active streak bonus');

  // Leech: heal 2 HP on a crit. This runs a REAL battle through the actual
  // E.startCombat hooks (not a reimplementation) — playerStrike() applies
  // the heal synchronously the instant a correct answer is submitted, well
  // before the monster's counterattack timer (650ms) fires, so we can read
  // state.hp right after answering and know only the leech has touched it.
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.enchants = { 'weapon:tidal': 'leech' };
    s.streak = 5; s.hp = 10; s.maxhp = 100;
    s.dungeonIndex = 1; s.mapId = 'd1';
    s.grid = MM.maps.parse(MM.maps.DUNGEONS[0], '#');
    s.monsters = [];
    window.__origRandom = Math.random;
    Math.random = () => 0.01; // guarantees the streak>=5 25%-chance crit check
    const mon = { name: 'Leech Test Slime', sprite: 'slime', pal: null, verb: 'squishes', x: 1, y: 1, hp: 999, maxhp: 999, atk: 1, boss: false, stun: 0, behavior: 'chase' };
    MM.engine.startCombat(mon);
  });
  await page.waitForTimeout(900); // entrance animation, then the first problem
  const hpBeforeStrike = await page.evaluate(() => MM.engine.state.hp);
  const leechInfo = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
  if (leechInfo.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${leechInfo.idx}`);
  else { await page.fill('#battleProblem #answerInput', leechInfo.val); await page.keyboard.press('Enter'); }
  await page.waitForTimeout(60); // playerStrike() already ran synchronously; monster hasn't countered yet
  const hpAfterStrike = await page.evaluate(() => { Math.random = window.__origRandom; return MM.engine.state.hp; });
  check(hpAfterStrike === hpBeforeStrike + 2, `Leech gem: +2 HP on a critical hit (before=${hpBeforeStrike}, after=${hpAfterStrike})`);
  // clean up the synthetic battle so later steps aren't left mid-fight — the
  // fleeBtn is disabled for the rest of THIS round (whichever way it went),
  // so wait for the next round's fresh (enabled) form before fleeing
  await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])', { timeout: 8000 }).catch(() => {});
  await page.click('#fleeBtn').catch(() => {});
  await page.waitForFunction(() => !MM.battle.active(), { timeout: 5000 }).catch(() => {});
  for (let i = 0; i < 4; i++) {
    const ok = await page.$('#overlay:not(.hidden) #dlgOk');
    if (!ok) break;
    await ok.click();
    await page.waitForTimeout(200);
  }

  // ---------- the amulet slot ----------
  // the leech test above hardcoded s.maxhp=100 for its own purposes — restore
  // the real level-based value (no amulet yet) before measuring from it
  await page.evaluate(() => { MM.engine.recalcMaxHp(); MM.engine.state.hp = MM.engine.state.maxhp; });
  await page.evaluate(() => { const s = MM.engine.state; s.mapId = 'isles'; MM.engine.enterWorld(); s.px = 25; s.py = 11; MM.engine.tryMove(0, 1); });
  await page.waitForSelector('#modalBox h2');
  const maxHpBefore = await page.evaluate(() => MM.engine.state.maxhp);
  await page.click('[data-buy-amulet="tidewood"]');
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalProblem(page);
  await page.waitForSelector('#modalBox h2'); // back at Emberlyn's
  check(await page.evaluate(() => MM.engine.state.gear.amulet.includes('tidewood')), 'the Tidewood Amulet is purchased');
  check(await page.evaluate(() => MM.engine.state.equipped.amulet == null), 'amulets never auto-equip (one-at-a-time, like rings)');
  await page.click('#dlgOk');
  await page.keyboard.press('b');
  await page.waitForSelector('#modalBox h2');
  await page.click('[data-equip="amulet:tidewood"]');
  await page.waitForSelector('#modalBox h2');
  check(await page.evaluate((before) => MM.engine.state.maxhp === before + 10, maxHpBefore), 'equipping the Tidewood Amulet grants +10 max HP immediately');
  await page.screenshot({ path: SHOTS + '/4-amulet-equipped.png' });
  await page.click('#bagClose');

  // ---------- save/load persistence ----------
  check(await page.evaluate((expectedMaxHp) => {
    const s = MM.engine.state;
    s.enchants = { 'weapon:tidal': 'flame' };
    s.items.gems = ['echo', 'echo'];
    MM.engine.save();
    MM.engine.load('EnchantKid');
    const s2 = MM.engine.state;
    return s2.enchants['weapon:tidal'] === 'flame'
      && s2.items.gems.length === 2
      && s2.gear.amulet.includes('tidewood')
      && s2.equipped.amulet === 'tidewood'
      && s2.maxhp === expectedMaxHp;
  }, maxHpBefore + 10), 'gems, enchants, and the amulet slot all round-trip through save/load');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
