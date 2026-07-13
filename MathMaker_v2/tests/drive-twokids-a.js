// Drive MathMaker v2 Wave 8a (EXPANSION_PLAN.md — "The Two Kids Update,
// mechanical half"): monster topic telegraphs (P2), the Overwhelm rule (P7),
// growth tracking's live UI (P6 — report card + parent panel), "almost!"
// badge surfacing (DQ), and the delight-catalog leftovers (P8 — shop shelf,
// inn cat, bestiary hat counter). Rust (P5) and the growth-tracking data
// shape are covered by unit blocks in tests/test.js; this drive covers what
// needs a live page: rendering, real modal/battle wiring, and persistence.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-twokids-a');

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

  async function solveModalOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.ui.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#modalBox .choice >> nth=${info.idx}`);
    else { await page.fill('#modalBox #answerInput', info.val); await page.keyboard.press('Enter'); }
    await page.waitForSelector('#modalBox .btnrow button.primary');
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForTimeout(120);
    return true;
  }

  async function answerBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    return true;
  }

  async function winBattle() {
    for (let i = 0; i < 30; i++) {
      const victory = await page.$('#victOk');
      if (victory) break;
      const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!hasForm) { await page.waitForTimeout(300); continue; }
      await answerBattleOnce();
      await page.waitForTimeout(650);
    }
    await page.waitForSelector('#victOk', { timeout: 15000 });
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'TwoKidsA');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(500);

  // Endgame-ish hero — Wave 8a is about mechanics well past the mainland
  // curriculum, not the grind to get there. Every topic stays parent-default ON.
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.metMiscount = true; s.seenBattleHelp = true; s.seenCeremony = true; s.gold = 500;
    s.level = 1; s.maxhp = 40; s.hp = 40;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.save();
  });

  // ================= P2: monster topic telegraphs =================
  await ev(() => { MM.engine.enterDungeon(11); MM.engine.save(); });
  check(await ev(() => MM.engine.state.mapId === 'd11'), 'entered the Cavern of Echoes (dungeon 11, mixed review)');

  const boundInfo = await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => m.skill && !m.boss);
    if (!mon) return null;
    s.px = mon.x; s.py = mon.y;
    return { name: mon.name, skill: mon.skill, icon: MM.engine.monsterTopicIcon(mon) };
  });
  check(!!boundInfo, 'dungeon 11 spawned at least one skill-bound monster');
  if (boundInfo) {
    check(boundInfo.icon === await ev(sk => MM.data.SKILL_ICONS[sk], boundInfo.skill),
      `telegraph icon matches the bound skill (${boundInfo.name} -> ${boundInfo.skill} -> ${boundInfo.icon})`);
  }
  await page.waitForTimeout(150); // let the world canvas draw at least one frame
  await page.screenshot({ path: SHOTS + '/1-telegraph-icon.png' });

  const bossIconOk = await ev(() => {
    const s = MM.engine.state;
    const boss = s.monsters.find(m => m.boss) || { boss: true };
    return MM.engine.monsterTopicIcon(boss) === null;
  });
  check(bossIconOk, 'a boss never shows a topic telegraph icon, even in a mixed dungeon');

  const rate = await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => m.skill && !m.boss);
    let hit = 0;
    for (let i = 0; i < 50; i++) if (MM.engine.pickRegularMonsterProblem(mon).skill === mon.skill) hit++;
    return hit / 50;
  });
  check(rate >= 0.9, `bound monster asks its own topic >=9/10 battles (got ${Math.round(rate * 100)}%)`);

  const fallback = await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => m.skill && !m.boss);
    s.parent = s.parent || {}; s.parent.topics = s.parent.topics || {};
    s.parent.topics[mon.skill] = false;
    const iconGone = MM.engine.monsterTopicIcon(mon) === null;
    let leaked = false;
    for (let i = 0; i < 50; i++) if (MM.engine.pickRegularMonsterProblem(mon).skill === mon.skill) leaked = true;
    s.parent.topics[mon.skill] = true; // restore for the rest of the drive
    return { iconGone, leaked };
  });
  check(fallback.iconGone, 'parent-off: the telegraph icon disappears the instant its topic is switched off');
  check(!fallback.leaked, 'parent-off: the bound monster never leaks its disabled topic into a problem');

  await ev(() => { MM.engine.enterDungeon(1); MM.engine.save(); });
  const mainlandIcons = await ev(() => {
    const s = MM.engine.state;
    return s.monsters.filter(m => !m.boss).map(m => MM.engine.monsterTopicIcon(m));
  });
  // Playtest 2026-07-13: single-topic dungeons show NO icons — identical
  // icons on every monster were clutter, not information (the taskBox and
  // entry line already name the subject). Icons live in mixed dungeons only.
  check(mainlandIcons.length > 0 && mainlandIcons.every(ic => ic === null),
    'single-topic dungeon 1: no telegraph icons (they only appear where they differentiate)');

  const spireClean = await ev(() => MM.data.MONSTERS[18].types.every(t => !t.skill));
  check(spireClean, 'Clockwork Spire roster (dungeon 19) carries no mon.skill bindings (its own 50/50 picker would make one dishonest)');

  const iconRegistryComplete = await ev(() => MM.data.PARENT_TOPICS.every(sk => !!MM.data.SKILL_ICONS[sk]));
  check(iconRegistryComplete, 'SKILL_ICONS has an entry for every registered topic');

  // ================= P7: the Overwhelm rule =================
  await ev(() => { const s = MM.engine.state; s.level = 1; MM.engine.enterDungeon(1); MM.engine.save(); });
  const notOverwhelmedAtL1 = await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => !m.boss);
    return !MM.engine.isOverwhelming(mon);
  });
  check(notOverwhelmedAtL1, 'level 1 in dungeon 1: not overwhelming — a real battle is expected');

  await ev(() => { const s = MM.engine.state; s.level = 20; s.maxhp = 200; s.hp = 200; MM.engine.enterDungeon(1); MM.engine.save(); });
  const overwhelming = await ev(() => MM.engine.isOverwhelming(MM.engine.state.monsters.find(m => !m.boss)));
  check(overwhelming, 'level 20 vs dungeon 1 (expected level 1): overwhelming');

  // exactly what E.tryMove's dungeon-collision branch now does — call it
  // directly rather than fight map-specific wall adjacency with keypresses.
  // Must open the ONE-PROBLEM overwhelm modal, never the battle overlay.
  await ev(() => {
    const s = MM.engine.state;
    const mon = s.monsters.find(m => !m.boss);
    return MM.engine.isOverwhelming(mon) ? MM.engine.tryOverwhelm(mon) : MM.engine.startCombat(mon);
  });
  await page.waitForSelector('#modalBox .prob-text', { timeout: 8000 });
  const overwhelmHeader = await page.textContent('#modalBox .prob-header').catch(() => '');
  check(/hesitates/.test(overwhelmHeader), `overwhelm: a one-problem modal opened instead of a battle ("${overwhelmHeader.trim()}")`);
  check(!(await ev(() => MM.battle.active())), 'overwhelm: the battle overlay never activated for the instant-win path');
  await solveModalOnce();
  check(await ev(() => { const s = MM.engine.state; const mon = s.monsters.find(m => !m.boss); return !mon || mon.hp <= 0; }),
    'overwhelm: a correct answer is an instant win (monster defeated, no fight)');
  await page.screenshot({ path: SHOTS + '/2-overwhelm-instant-win.png' });

  // same overleveled kid vs the dungeon's BOSS: a real fight, not a skip
  await ev(() => { MM.engine.enterDungeon(1); MM.engine.save(); }); // fresh floor, boss included
  const bossOverwhelming = await ev(() => MM.engine.isOverwhelming(MM.engine.state.monsters.find(m => m.boss)));
  check(!bossOverwhelming, 'overwhelm: a boss is never "overwhelming", however overleveled the kid is');
  await ev(() => {
    const s = MM.engine.state;
    const boss = s.monsters.find(m => m.boss);
    return MM.engine.isOverwhelming(boss) ? MM.engine.tryOverwhelm(boss) : MM.engine.startCombat(boss);
  });
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 8000 });
  check(true, 'overwhelm: the same routing still opens a real battle against a boss');
  await winBattle();

  // ================= DQ: "almost!" surfacing =================
  await ev(() => {
    const s = MM.engine.state;
    s.badges = s.badges || {};
    for (let i = 0; i < 8; i++) MM.engine.recordAnswer('fractions_as', true); // 8/10 to bronze: "almost"
    MM.ui.refresh();
  });
  const bagHtml = await page.evaluate(() => document.getElementById('btnBag').innerHTML);
  check(/almost-sparkle/.test(bagHtml), 'almost!: the bag button gets a sparkle when a badge is within 3 of its next tier');
  const logText = await page.evaluate(() => document.getElementById('log').innerText);
  const nudgeLine = logText.split('\n').find(l => /THIS close/.test(l)) || '';
  check(!!nudgeLine, `almost!: a log nudge fired ("${nudgeLine}")`);
  const nudgeCount = (logText.match(/THIS close/g) || []).length;
  await ev(() => MM.ui.refresh());
  await ev(() => MM.ui.refresh());
  const logText2 = await page.evaluate(() => document.getElementById('log').innerText);
  const nudgeCount2 = (logText2.match(/THIS close/g) || []).length;
  check(nudgeCount2 === nudgeCount, 'almost!: repeated refreshes do not add a second nudge this session');

  // ================= P6: growth tracking (live UI) =================
  await ev(() => {
    for (let i = 0; i < 9; i++) MM.engine.recordAnswer('addsub_facts', true, { text: '2+2', kidAnswer: '4' });
    MM.engine.recordAnswer('addsub_facts', false, { text: '9+8', kidAnswer: '16' });
    MM.ui.refresh(); // 10 correct = bronze in addsub_facts; flush its celebration dialog now,
  });                // so it can't silently block the report-card/parent-panel opens below
  if (await ev(() => MM.ui.modalOpen())) {
    await page.waitForSelector('#modalBox h2');
    await page.click('#dlgOk');
    await page.waitForFunction(() => !MM.ui.modalOpen());
  }
  await page.keyboard.press('r');
  await page.waitForSelector('#modalBox h2');
  const reportHtml = await page.evaluate(() => document.getElementById('modalBox').innerHTML);
  check(/report-growth/.test(reportHtml) && /of your last/.test(reportHtml),
    'report card: a real-numbers growth-story line appears (no percentage)');
  await page.screenshot({ path: SHOTS + '/3-report-card-growth.png' });
  await page.click('#dlgOk');

  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234');
  await page.click('#pinOk');
  await page.waitForSelector('input[data-skill="addsub_facts"]');
  const parentHtml = await page.evaluate(() => document.getElementById('modalBox').innerHTML);
  check(/miss-details/.test(parentHtml) && /answered/.test(parentHtml),
    'parent panel: an expandable recent-misses list shows the verbatim wrong answer');
  await page.screenshot({ path: SHOTS + '/4-parent-panel-misses.png' });
  await page.click('#parentDone');
  await page.waitForFunction(() => !MM.ui.modalOpen());

  // ================= P8: delight-catalog leftovers =================
  await page.keyboard.press('m'); // Monster Book
  await page.waitForSelector('#modalBox h2');
  const bookHtml = await page.evaluate(() => document.getElementById('modalBox').innerHTML);
  check(/Hats respectfully retired/.test(bookHtml), 'bestiary footer counts hats respectfully retired');
  await page.click('#dlgOk');
  await page.waitForFunction(() => !MM.ui.modalOpen());

  await ev(() => { MM.engine.enterWorld(); MM.engine.state.gear.weapon.push('dagger'); MM.engine.sellGear('weapon', 'dagger'); });
  await page.waitForSelector('#modalBox .prob-text');
  await solveModalOnce(); // the sell quiz reopens the shop itself (onEnd)
  await page.waitForSelector('#modalBox h2');
  const shelfHtml = await page.evaluate(() => (document.querySelector('.shop-shelf') || {}).innerHTML || '');
  check(/On the shelf/.test(shelfHtml), 'the shopkeeper puts the just-sold item on the shelf, persistently');
  await page.screenshot({ path: SHOTS + '/5-shop-shelf.png' });
  await page.click('#shopClose');

  // the innkeeper's cat: bumping the inn should offer a pat before the
  // warm-up sequence, deterministic per real day, +1 stamina once
  await ev(() => { const s = MM.engine.state; s.stamina = Math.max(0, s.maxStamina - 5); s.catPettedDate = null; });
  const staminaBefore = await ev(() => MM.engine.state.stamina);
  await ev(() => MM.engine.inn(false));
  await page.waitForSelector('#modalBox h2');
  const catTitle = await page.textContent('#modalBox h2');
  check(/inn cat/i.test(catTitle), `the innkeeper's cat greets the kid before the warm-up ("${catTitle.trim()}")`);
  await page.screenshot({ path: SHOTS + '/6-inn-cat.png' });
  await page.click('#modalBox .btnrow button.primary'); // "Give it a pat"
  await page.waitForTimeout(150);
  const staminaAfter = await ev(() => MM.engine.state.stamina);
  check(staminaAfter === staminaBefore + 1, `petting the cat grants +1 stamina (${staminaBefore} -> ${staminaAfter})`);
  // clear whatever warm-up modal the pat opened next
  for (let i = 0; i < 4 && (await ev(() => MM.ui.modalOpen())); i++) {
    if (await page.$('#modalBox #answerInput, #modalBox .choice')) await solveModalOnce();
    else { await page.click('#modalBox .btnrow button').catch(() => {}); await page.waitForTimeout(100); }
  }
  // a second visit the SAME day still finds the cat (v1.7.0: a moment from
  // CAT_MOMENTS, pure delight) — but must never offer the +1-stamina pat
  // again (no farming)
  const staminaBeforeSecond = await ev(() => MM.engine.state.stamina);
  await ev(() => MM.engine.inn(false));
  await page.waitForTimeout(150);
  const secondVisitTitle = await page.textContent('#modalBox h2').catch(() => '');
  const secondVisitBody = await ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  const staminaSecond = await ev(() => MM.engine.state.stamina);
  check(/inn cat/i.test(secondVisitTitle || ''), 'a second same-day visit still finds the cat (a moment, not a snub)');
  check(!/Give it a pat/.test(secondVisitBody), 'the cat pat is once per real day, not once per visit');
  check(staminaSecond === staminaBeforeSecond, `the moment grants nothing (stamina ${staminaBeforeSecond} -> ${staminaSecond})`);

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
