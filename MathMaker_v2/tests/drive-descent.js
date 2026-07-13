// Drive MathMaker v2 Wave 11 ("The Grand Descent"): the crawl now looks like
// a descent. Zero gameplay changes — this drive is almost entirely eyes
// (screenshots) plus a few live sanity checks that the pure functions
// (MM.maps.wallTierSprite / decorMotif / bossVignetteAlpha,
// MM.sprites.themePalette) that drive the visuals agree with what the
// running game actually rendered. Walks into every mainland dungeon
// (d1-10), the mainland-adjacent expansion d13, and one isle dungeon (d14,
// Tidepool Grotto), screenshotting each.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-descent');

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
  await page.fill('#newName', 'DescentKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // A hero who has unsealed everything — every mainland dungeon plus
  // Tidepool Grotto — so this drive can jump straight in without fighting
  // its way through seal exams or lens gates. Wave 11 makes zero gameplay
  // changes, so it's fair for this drive to skip past all of it.
  await page.evaluate(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.seenCeremony = true;
    s.difficulty = 'story';
    s.gear = { weapon: ['stick', 'iron'], body: ['clothes', 'leather'], helmet: ['cap'], boots: ['boots'], ring: [] };
    s.level = 20; s.maxhp = 120; s.hp = 120; s.gold = 500;
    s.unsealed = {};
    for (let i = 2; i <= 14; i++) s.unsealed['d' + i] = true;
    s.isles.lenses = { tidepool: true, frostbite: true, cinderforge: true };
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.enterWorld();
    MM.engine.save();
  });

  // dungeonIndex -> [screenshot label, expected wall tier]
  const MAINLAND = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const EXPECTED_TIER = idx => (idx <= 3 ? 'wall' : idx <= 7 ? 'wallWorked' : 'wallGrand');

  for (const idx of MAINLAND) {
    await page.evaluate((i) => MM.engine.tryEnterDungeon(i), idx);
    await page.waitForFunction((i) => MM.engine.state.dungeonIndex === i, idx, { timeout: 10000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SHOTS}/d${idx}.png` });

    const info = await page.evaluate((i) => {
      const s = MM.engine.state;
      const grid = s.grid;
      // the live wall tier actually rendered for this floor
      const sprName = MM.maps.tileSprite('#', 0, 0, s.mapId, 0);
      // at least one live floor tile carries this dungeon's decor motif
      let decorSeen = false;
      for (let y = 0; y < grid.length && !decorSeen; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (MM.maps.decorMotif(i, x, y, grid[y][x])) { decorSeen = true; break; }
        }
      }
      const bossPos = MM.maps.bossSpawnPos(i, s.floorIndex || 0);
      const vignetteAtBoss = bossPos ? MM.maps.bossVignetteAlpha(i, s.floorIndex || 0, bossPos.x, bossPos.y) : 0;
      const vignetteFar = bossPos ? MM.maps.bossVignetteAlpha(i, s.floorIndex || 0, bossPos.x + 20, bossPos.y + 20) : 0;
      const theme = MM.data.THEMES[i - 1];
      const pal = MM.sprites.themePalette(sprName, theme);
      return { sprName, decorSeen, bossPos, vignetteAtBoss, vignetteFar, pal, mapId: s.mapId };
    }, idx);

    check(info.sprName === EXPECTED_TIER(idx), `d${idx}: live wall tier is '${info.sprName}' (want '${EXPECTED_TIER(idx)}')`);
    check(info.decorSeen, `d${idx}: live floor carries its decor motif somewhere`);
    check(!!info.bossPos, `d${idx}: has a boss spawn marker`);
    check(info.vignetteAtBoss > 0, `d${idx}: boss tile is vignetted`);
    check(info.vignetteFar === 0, `d${idx}: vignette does not leak far from the boss`);
    check(Object.keys(info.pal).length > 0, `d${idx}: live theme palette is non-empty`);
  }

  // d13 (Star Peak — mainland-adjacent expansion; reuses the grand-keep tier
  // with its own theme tint, per the wave's own note)
  await page.evaluate(() => MM.engine.tryEnterDungeon(13));
  await page.waitForFunction(() => MM.engine.state.dungeonIndex === 13, { timeout: 10000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/d13.png` });
  check(await page.evaluate(() => MM.maps.tileSprite('#', 0, 0, MM.engine.state.mapId, 0) === 'wallGrand'),
    'd13: reuses the grand-keep wall tier');

  // one isle dungeon — keeps its own stronger identity (custom tiles), gets
  // the theme TINT only, no new wall tier and no d1-10 decor motif.
  await page.evaluate(() => MM.engine.tryEnterDungeon(14));
  await page.waitForFunction(() => MM.engine.state.dungeonIndex === 14, { timeout: 10000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/d14-isle.png` });
  const isleInfo = await page.evaluate(() => {
    const s = MM.engine.state;
    const sprName = MM.maps.tileSprite('#', 0, 0, s.mapId, 0);
    const theme = MM.data.THEMES[13];
    const pal = MM.sprites.themePalette(sprName, theme);
    return { sprName, pal };
  });
  check(isleInfo.sprName === 'wall', 'd14 (isle): keeps the base rough-cave wall (no new tier)');
  check(Object.keys(isleInfo.pal).length > 0, 'd14 (isle): still gets a theme tint');

  // d1 vs d5 vs d9 must be genuinely distinct rooms — different tier AND
  // different tint, not just a palette swap on the same silhouette.
  const distinct = await page.evaluate(() => {
    const key = (idx) => {
      const sprName = MM.maps.wallTierSprite(idx);
      return sprName + '|' + JSON.stringify(MM.sprites.themePalette(sprName, MM.data.THEMES[idx - 1]));
    };
    const k1 = key(1), k5 = key(5), k9 = key(9);
    return k1 !== k5 && k5 !== k9 && k1 !== k9;
  });
  check(distinct, 'd1/d5/d9 wall sprite+palette combos are all distinct (unmistakably different rooms)');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
