// Playtest round 4: MIMIC CHESTS — a rare chest that is not a chest, designed
// KIND per the two-kids frame: never before dungeon 4 (chest trust first),
// never a guaranteed-gem/story chest, at most one per floor, TELEGRAPHED in
// the world (breathing bob / calm-mode grin, and the pet's warning), and the
// fight is a completely normal battle where curiosity is always net-rewarded:
// win OR soothe, the chest's own loot arrives plus a treasure for your nerve.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-mimic');

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
  const check = (ok, msg) => checks.push((ok ? 'ok   ' : 'FAIL ') + msg);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  async function answerBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    return true;
  }
  async function winBattle() {
    for (let i = 0; i < 30; i++) {
      if (await page.$('#victOk')) break;
      const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!hasForm) { await page.waitForTimeout(300); continue; }
      await answerBattleOnce();
      await page.waitForTimeout(650);
    }
    await page.waitForSelector('#victOk', { timeout: 15000 });
    const victText = await ev(() => document.querySelector('.victory-lines') ? document.querySelector('.victory-lines').innerText : document.body.innerText);
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
    return victText;
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'MimicKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // mid-game hero so dungeon 4 is a fair fight; skip ceremonies/tutorials
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 6; s.tasksDone = [1, 2, 3, 4, 5];
    s.seenBattleHelp = true; s.seenCeremony = true; s.metMiscount = true;
    s.level = 8; s.maxhp = 80; s.hp = 80; s.gold = 200;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.save();
  });

  // ---------- gating ----------
  await ev(() => { MM.engine.MIMIC_CHANCE = 1; MM.engine.enterDungeon(1); });
  check(await ev(() => MM.engine._mimics.size === 0), 'dungeons 1-3 never have mimics, even at 100% chance (chest trust first)');
  await ev(() => MM.engine.enterDungeon(4));
  check(await ev(() => MM.engine._mimics.size === 1), 'dungeon 4 at 100% chance: exactly ONE mimic (the per-floor cap)');
  // protected chests: the Vault's crossbow chest (13,3) and its guaranteed
  // gem chest (15,12) must never be mimics
  const vaultSafe = await ev(() => {
    MM.engine.enterDungeon(18);
    return { size: MM.engine._mimics.size, has: MM.engine._mimics.has('13,3') || MM.engine._mimics.has('15,12') };
  });
  check(!vaultSafe.has, `the Vault's story/gem chests are never mimics (rolled ${vaultSafe.size} elsewhere)`);
  await ev(() => { MM.engine.MIMIC_CHANCE = 0; MM.engine.enterDungeon(4); });
  check(await ev(() => MM.engine._mimics.size === 0), 'at 0% chance no mimics roll (E.MIMIC_CHANCE is the only source)');

  // ---------- the tell ----------
  await ev(() => { MM.engine.MIMIC_CHANCE = 1; MM.engine.enterDungeon(4); });
  const mimicPos = await ev(() => {
    const key = [...MM.engine._mimics][0];
    const [x, y] = key.split(',').map(Number);
    const s = MM.engine.state;
    s.px = x; s.py = y - 1 >= 0 && !'#'.includes(s.grid[y - 1][x]) ? y - 1 : y + 1; // stand beside it
    if (s.grid[s.py] === undefined || '#G'.includes(s.grid[s.py][x])) { s.px = x - 1; s.py = y; }
    return { x, y };
  });
  check(await ev(p => MM.engine.state.grid[p.y][p.x] === '*', mimicPos), 'the mimic still LOOKS like an ordinary chest tile');
  await page.waitForTimeout(700);
  await page.screenshot({ path: SHOTS + '/1-world-tell.png' });

  // pet warning: with a pet, standing near the mimic raises the alert
  const petWarn = await ev(p => {
    const s = MM.engine.state;
    s.isles.pet = { species: 'blue', name: 'Splash', stage: 1, fed: 0, correct: 0 };
    s.px = p.x; s.py = p.y + 1 < s.grid.length && s.grid[p.y + 1][p.x] === '.' ? p.y + 1 : p.y - 1;
    MM.engine.updatePetAlert();
    return MM.engine.petAlert;
  }, mimicPos);
  check(petWarn, 'the pet raises its ❗ warning beside a mimic chest');

  // ---------- bump -> grin -> a completely normal battle ----------
  await ev(p => { const s = MM.engine.state; MM.engine.chest(p.x, p.y); }, mimicPos);
  await page.waitForSelector('#modalBox h2');
  const grin = await ev(() => document.getElementById('modalBox').innerText);
  check(/grins/.test(grin) && /should not grin/.test(grin), 'bumping it: the chest grins (one dialog beat, joke on the mimic)');
  await page.click('#dlgOk');
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 8000 });
  check(true, '...and a normal battle begins');
  await page.waitForSelector('#battleProblem #answerInput, #battleProblem .choice', { timeout: 8000 });
  check(true, 'same battle loop: a problem to answer, nothing new to learn');

  // flee first: the mimic must NOT quietly become a free chest
  await page.click('#fleeBtn');
  await page.waitForFunction(() => !MM.battle.active());
  await page.waitForTimeout(300);
  await ev(p => MM.engine.chest(p.x, p.y), mimicPos);
  await page.waitForSelector('#modalBox h2');
  const grin2 = await ev(() => document.getElementById('modalBox').innerText);
  check(/grins/.test(grin2), 'after fleeing, bumping again re-reveals the SAME mimic — never a free chest');
  await page.click('#dlgOk');
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + '/2-mimic-battle.png' });

  // ---------- win: chest loot + a treasure for your nerve ----------
  const treasuresBefore = await ev(() => MM.engine.state.items.treasures.length);
  const victText = await winBattle();
  check(/spills out|offers you everything/.test(victText), `victory includes the chest opening (${victText.split('\n')[0]}...)`);
  check(/for your nerve/.test(victText), 'victory includes the bonus treasure line');
  const afterWin = await ev(p => ({
    tile: MM.engine.state.grid[p.y][p.x],
    opened: !!MM.engine.state.opened[`${MM.engine.state.mapId}:${p.x},${p.y}`],
    gone: !MM.engine._mimics.has(`${p.x},${p.y}`),
    treasures: MM.engine.state.items.treasures.length,
    kills: (MM.engine.state.bestiary.kills || {})['Mimic'] || 0,
  }), mimicPos);
  check(afterWin.tile === '.' && afterWin.opened, 'the chest tile opens for good (s.opened, like any chest)');
  check(afterWin.gone, 'the beaten mimic leaves the mimic set');
  check(afterWin.treasures > treasuresBefore, `the nerve-treasure landed in the bag (${treasuresBefore} -> ${afterWin.treasures})`);
  check(afterWin.kills === 1, 'the Monster Book records the Mimic kill');

  // book: the Wandering Chests page exists once met, counter is 77
  await page.keyboard.press('m');
  await page.waitForSelector('#modalBox h2');
  const book = await ev(() => document.getElementById('modalBox').innerText.replace(/\s+/g, ' '));
  check(/Wandering Chests/.test(book) && /Mimic/.test(book), 'the Monster Book shows the Wandering Chests page once a mimic is met');
  check(/of 77/.test(book), 'the book counts 77 kinds now');
  await page.screenshot({ path: SHOTS + '/3-book-card.png' });
  await page.click('#dlgOk');
  await page.waitForFunction(() => !MM.ui.modalOpen());

  // ---------- soothe a mimic: befriended, and it still opens ----------
  await ev(() => { MM.engine.state.stance = 'soothe'; MM.engine.enterDungeon(5); });
  const pos2 = await ev(() => {
    const key = [...MM.engine._mimics][0];
    if (!key) return null;
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
  check(!!pos2, 'dungeon 5 rolled its mimic too (chance still pinned to 1)');
  const treasures2 = await ev(() => MM.engine.state.items.treasures.length);
  await ev(p => MM.engine.chest(p.x, p.y), pos2);
  await page.waitForSelector('#modalBox h2');
  await page.click('#dlgOk');
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 8000 });
  const calmVict = await winBattle();
  check(/offers you everything/.test(calmVict), 'a SOOTHED mimic opens itself (same loot path, gentler line)');
  check(/friend now|calmed/.test(calmVict), 'soothing it counts on the befriended axis');
  const afterSoothe = await ev(p => ({
    befriended: (MM.engine.state.bestiary.befriended || {})['Mimic'] || 0,
    tile: MM.engine.state.grid[p.y][p.x],
    treasures: MM.engine.state.items.treasures.length,
  }), pos2);
  check(afterSoothe.befriended === 1, 'Mimic joins the befriended collection');
  check(afterSoothe.tile === '.', 'the soothed mimic\'s chest opens too');
  check(afterSoothe.treasures > treasures2, 'the nerve-treasure arrives either way — curiosity always net-rewarded');

  // ---------- calm mode: static tell instead of motion ----------
  await ev(() => { MM.engine.state.calmMode = true; MM.engine.enterDungeon(6); MM.ui.refresh(); });
  const calmHasMimic = await ev(() => MM.engine._mimics.size === 1);
  check(calmHasMimic, 'calm mode: the mimic still rolls (only the TELL changes, motion -> static grin)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + '/4-calm-tell.png' });

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
