// FINAL_PASSES Pass A2: THE TORTURE SAVE — a hand-written save in the
// OLDEST shape this game ever wrote (day-one flat weapon/armor fields,
// nothing that any later wave added) is planted in localStorage, loaded
// through the real E.load() path, and every accumulated migration is
// asserted at once. Then the migrated save actually PLAYS one real fight,
// because "shaped right" and "playable" are different claims.
const { chromium } = require('playwright');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

const ANCIENT = {
  name: 'AncientKid',
  hp: 30, maxhp: 30, gold: 121, level: 6, xp: 40,
  taskIndex: 6, tasksDone: [1, 2, 3, 4, 5],
  weapon: 'sword', armor: 'leather',       // the flat pre-gear fields
  px: 20, py: 8, mapId: 'world',
  potions: 2, streak: 0,
  totals: { answered: 220, correct: 180 },
  unsealed: { d2: true, d3: true, d4: true, d5: true, d6: true },
  opened: {}, bossesDefeated: {}, haveItem: false,
  seenBattleHelp: true,   // NOT seenCeremony — the migration must derive it (Wave 8b)
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 800 } })).newPage();
  page.setDefaultTimeout(90000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.evaluate((save) => {
    localStorage.setItem('mathmaker2_save_' + save.name, JSON.stringify(save));
  }, ANCIENT);
  await page.reload();
  await page.waitForSelector('.profile-load');
  await page.click(`.profile-load[data-name="${ANCIENT.name}"]`);
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  const s = await page.evaluate(() => MM.engine.state);
  check(s.name === 'AncientKid' && s.gold === 121 && s.taskIndex === 6, 'the ancient save loaded with its identity intact');
  check(s.stamina === 100 && s.maxStamina >= 100, 'stamina system grafted on');
  check(!!s.items && Array.isArray(s.items.treasures) && Array.isArray(s.items.charms), 'items containers created');
  check(Array.isArray(s.gear.weapon) && s.gear.weapon.includes('sword') && s.gear.weapon.includes('stick'), 'flat weapon became an owned list (plus the starter)');
  check(s.equipped.weapon === 'sword' && s.equipped.body === 'leather', 'the old equipped pieces stayed equipped');
  check(s.equipped.helmet === null && s.equipped.boots === null && s.equipped.ring === null, 'new slots arrive empty');
  check(s.difficulty === 'hero', 'difficulty defaults for old saves');
  check(s.calmMode === false, 'calm mode defaults off');
  check(!!s.badges && Array.isArray(s.pendingBadges), 'badge system grafted on');
  check(!!s.bestiary && !!s.bestiary.gauntlet, 'bestiary (with gauntlet marks) grafted on');
  check(!!s.isles && !!s.isles.lenses && s.isles.egg === null && s.isles.pet === null, 'isles state grafted on');
  check(Array.isArray(s.charmsOn) && s.charmsOn.length === 0, 'charm slots grafted on (nothing worn)');
  check(s.continent === 'west', 'continent defaults to the mainland');
  check(Array.isArray(s.items.gems) && s.items.gems.length === 0, 'gem pouch grafted on');
  check(Array.isArray(s.gear.amulet) && s.equipped.amulet === null, 'amulet slot grafted on');
  check(typeof s.enchants === 'object' && !Array.isArray(s.enchants), 'enchant map grafted on');
  check(s.potionsBought === 0 && s.seenBulkQuip === false, 'bulk-potion tracking grafted on');
  check(typeof s.defeatedAt === 'object', 'day-persistent kills grafted on');
  // 2026-07-11 user decision reversed the old Wave-4 "music defaults off"
  // migration: every topic now defaults ON (missing means enabled), even
  // for saves this ancient — music_reading isn't one of the 10 mainland
  // TASKS skills the topicCap migration seeds, so it stays unset (= on).
  check(!!s.parent && !!s.parent.topics && s.parent.topics.music_reading !== false, 'parent panel grafted on, music_reading left enabled (default-ON)');
  check(!!s.spellsCelebrated && s.spellsCelebrated.scout === false, 'spell celebrations grafted on (nothing falsely marked seen)');
  // Wave 8b: the stances graft on. A hero six dungeons deep must NOT be stopped
  // at a door and asked how she will face her "first" monster — she has fought
  // hundreds. seenCeremony is derived from seenBattleHelp, so an old save is
  // left alone and simply finds the stance buttons waiting in its next battle.
  check(s.stance === 'strike', 'stance grafted on (an old save keeps doing what it was doing)');
  check(s.brave === false && s.braveSolved === 0, 'brave stance + its lifetime counter grafted on');
  check(s.seenCeremony === true, 'an already-fighting save is NOT re-asked the first-monster question');
  check(!!s.bestiary.befriended && Object.keys(s.bestiary.befriended).length === 0, 'the befriended axis grafted on, empty');

  // and now PLAY: enter the current task's dungeon and win one real fight
  await page.evaluate(() => MM.engine.tryEnterDungeon(6));
  // seal already broken in the ancient save — should drop straight in
  await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d6'));
  const fought = await page.evaluate(() => {
    const s = MM.engine.state;
    const m = s.monsters.find(m => !m.boss && m.hp > 0);
    if (!m) return false;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const t = (s.grid[m.y + dy] || [])[m.x + dx];
      if (t && !'#GKD*%'.includes(t) && !s.monsters.some(o => o !== m && o.hp > 0 && o.x === m.x + dx && o.y === m.y + dy)) {
        s.px = m.x + dx; s.py = m.y + dy;
        MM.engine.tryMove(-dx, -dy);
        return true;
      }
    }
    return false;
  });
  check(fought, 'the migrated save walks into a real battle');
  for (let i = 0; i < 20; i++) {
    if (await page.$('#victOk')) break;
    const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
    if (!hasForm) { await page.waitForTimeout(350); continue; }
    const info = await page.evaluate(() => {
      const p = MM.battle.current;
      if (!p) return null;
      if (p.kind === 'choice') return { kind: 'choice', idx: p.answer };
      if (p.kind === 'remainder') return { kind: 'text', val: p.answer.r ? `${p.answer.q} r ${p.answer.r}` : String(p.answer.q) };
      if (p.kind === 'clock') return { kind: 'text', val: `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}` };
      return { kind: 'text', val: p.answer.d === 1 ? String(p.answer.n) : `${p.answer.n}/${p.answer.d}` };
    });
    if (info) {
      if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
      else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    }
    await page.waitForTimeout(600);
  }
  await page.waitForSelector('#victOk', { timeout: 60000 });
  await page.click('#victOk');
  await page.waitForFunction(() => !MM.battle.active());
  check(true, '...and wins it — the ancient save is fully alive');
  // and the save round-trips in the NEW shape
  await page.evaluate(() => { MM.engine.save(); MM.engine.load('AncientKid'); });
  check(await page.evaluate(() => MM.engine.state.stamina != null && MM.engine.state.parent.topics.music_reading !== false),
    'saved and reloaded in the modern shape');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
