// Drive MathMaker v2 Wave 8b (EXPANSION_PLAN.md — "The Two Kids Update, the
// heart"): the 🕊 Soothe verb (a full battle, the befriended axis, the world it
// changes), the ⚡ Brave stance (double damage verified NUMERICALLY, and a brave
// miss proven to cost nothing extra), and Miscount's Academy (slate flow, daily
// rotation, parent cap).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-twokids-b');

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

  async function answerBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
    else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
    return true;
  }
  async function missBattleOnce() {
    const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
    if (!info) return false;
    if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${(info.idx + 1) % 2}`);
    else { await page.fill('#battleProblem #answerInput', '999999883'); await page.keyboard.press('Enter'); }
    return true;
  }
  async function winBattle(cap) {
    for (let i = 0; i < (cap || 40); i++) {
      if (await page.$('#victOk')) break;
      const form = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!form) {
        const cont = await page.$('.battle-btnrow button.primary');
        if (cont) { await cont.click(); }
        await page.waitForTimeout(300);
        continue;
      }
      await answerBattleOnce();
      await page.waitForTimeout(700);
    }
    await page.waitForSelector('#victOk', { timeout: 20000 });
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
  }
  async function clearModals(cap) {
    for (let i = 0; i < (cap || 8); i++) {
      if (!(await ev(() => MM.ui.modalOpen()))) return;
      const btn = await page.$('#modalBox .btnrow button');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(150);
    }
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'TwoKidsB');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // ================= The Ceremony =================
  // A brand-new hero, walked into their very first monster.
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 1; s.gold = 400;
    MM.engine.enterDungeon(1);
    const mon = s.monsters.find(m => !m.boss);
    s.px = mon.x; s.py = mon.y;      // stand on it; the next bump is a fight
    MM.engine.save();
  });
  check(await ev(() => MM.engine.state.seenCeremony === false), 'a new hero has not yet been asked the question');
  await ev(() => { const s = MM.engine.state; MM.engine.startCombat(s.monsters.find(m => !m.boss)); });
  await page.waitForSelector('#modalBox h2');
  const ceremonyTitle = await page.textContent('#modalBox h2');
  const ceremonyBody = await page.textContent('#modalBox .dialog-body');
  check(/first monster/i.test(ceremonyTitle), `the Ceremony asks before the first monster ("${ceremonyTitle.trim()}")`);
  check(/boldly, or gently/i.test(ceremonyBody), 'it asks: boldly, or gently?');
  await page.screenshot({ path: SHOTS + '/1-ceremony.png' });
  // choose GENTLY
  const btns = await page.$$('#modalBox .btnrow button');
  await btns[1].click();
  await page.waitForSelector('#modalBox h2');
  const sealBody = await page.textContent('#modalBox .dialog-body');
  check(/change your way/i.test(sealBody), 'the sealing line says the choice is not a life sentence');
  check(await ev(() => MM.engine.state.stance === 'soothe'), 'choosing gently sets the SOOTHE stance');
  check(await ev(() => MM.engine.state.equipped.weapon === 'ribbon'), '...and hands over the matching starter (Ribbon Streamer)');
  const eqStats = await ev(() => {
    const r = MM.data.WEAPONS.find(w => w.id === 'ribbon'), st = MM.data.WEAPONS.find(w => w.id === 'stick');
    return { r: r.atk, s: st.atk };
  });
  check(eqStats.r === eqStats.s, `the two starters are identical in power (${eqStats.r} vs ${eqStats.s}) — a question, not a handicap`);
  await clearModals(4);   // seal line -> the first-battle tutorial

  // ================= A full Soothe battle =================
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 15000 });
  check(true, 'the first battle begins');
  await page.waitForSelector('#stanceRow .stance-btn', { timeout: 15000 });  // built with round 1
  // round 5 (one-track design): battles show ONLY ⚡ Brave — no Strike/Soothe
  // buttons; the way was chosen at the Ceremony and lives in the ⚙️ dialog
  const soothingUi = await ev(() => ({
    calmBar: !!document.querySelector('#monFill.calm'),
    braveBtn: !!document.querySelector('#stBrave'),
    wayButtons: !!document.querySelector('#stSoothe, #stStrike'),
  }));
  check(soothingUi.calmBar, 'the monster bar is a CALM meter (teal, and it fills) rather than health draining');
  check(soothingUi.braveBtn, '⚡ Brave is in the battle');
  check(!soothingUi.wayButtons, 'NO Strike/Soothe buttons — one track, chosen at the Ceremony');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/2-soothe-battle.png' });

  // the calm bar FILLS as the fight goes on (the same number, read the other way)
  const before = await ev(() => parseFloat(document.getElementById('monFill').style.width));
  await answerBattleOnce();
  await page.waitForTimeout(900);
  const after = await ev(() => parseFloat(document.getElementById('monFill').style.width));
  check(after > before, `the calm meter FILLS with each correct answer (${before}% -> ${after}%)`);
  await winBattle();

  // victory: befriended, and the gold arrived as a gift
  check(await ev(() => MM.engine.befriendedCount() >= 1), 'soothing a monster befriends its kind');
  await clearModals(4);   // the "A friend!" ceremony
  await page.screenshot({ path: SHOTS + '/3-friend-ceremony.png' });

  // ================= Befriending changes the world =================
  const world = await ev(() => {
    const s = MM.engine.state;
    MM.engine.enterDungeon(1);
    const friendName = Object.keys(s.bestiary.befriended)[0];
    const friend = s.monsters.find(m => m.name === friendName && !m.boss);
    const hostile = s.monsters.find(m => m.name !== friendName && !m.boss);
    if (!friend) return null;
    // park the hero right next to the friend and run a monster turn
    s.px = friend.x + 1; s.py = friend.y;
    const battleBefore = MM.battle.active();
    MM.engine.monsterTurn();
    return {
      friendName,
      pacified: MM.engine.isPacified(friend),
      startedFight: MM.battle.active() && !battleBefore,
      hostileStillHunts: hostile ? !MM.engine.isPacified(hostile) : true,
    };
  });
  check(!!world, 'dungeon 1 re-entered with a befriended species in it');
  check(world.pacified, `a befriended ${world.friendName} stands down (never initiates)`);
  check(!world.startedFight, '...and standing right beside one does NOT start a fight');
  check(world.hostileStillHunts, 'a monster you have NOT befriended still hunts you');
  // guards still guard, thieves still steal — the comedy is load-bearing
  const roles = await ev(() => {
    MM.engine.state.bestiary.befriended['X'] = 1;   // a throwaway species, for the role matrix
    const r = {
      guard: MM.engine.isPacified({ name: 'X', sprite: 'bat', behavior: 'guard' }),
      thief: MM.engine.isPacified({ name: 'X', sprite: 'bat', behavior: 'thief' }),
      boss: MM.engine.isPacified({ name: 'X', sprite: 'bat', boss: true }),
    };
    delete MM.engine.state.bestiary.befriended['X'];  // ...and never leave it in the save
    return r;
  });
  check(!roles.guard, 'a befriended GUARD still guards its post');
  check(!roles.thief, 'a befriended THIEF still steals your gold');
  check(!roles.boss, 'a boss is never pacified');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/4-world-friends-and-hostiles.png' });

  // round 5: bumping a friend is NEVER a fight — it steps aside (you swap
  // places), with a friendly word ("I can still fight it, and it starts at
  // 0% calm" — accidentally erasing your own kindness, fixed)
  const swap = await ev(() => {
    const s = MM.engine.state;
    const friendName = Object.keys(s.bestiary.befriended)[0];
    const friend = s.monsters.find(m => m.name === friendName && !m.boss && m.hp > 0);
    s.px = friend.x; s.py = friend.y - 1;
    const before = { fx: friend.x, fy: friend.y, px: s.px, py: s.py };
    MM.engine.tryMove(0, 1);
    return { before, after: { fx: friend.x, fy: friend.y, px: s.px, py: s.py }, battle: MM.battle.active() };
  });
  check(!swap.battle, 'bumping a friend is never a fight');
  check(swap.after.px === swap.before.fx && swap.after.py === swap.before.fy
    && swap.after.fx === swap.before.px && swap.after.fy === swap.before.py,
    'the friend steps aside — you swap places');
  const bumpLog = await ev(() => document.getElementById('log').innerText);
  check(/shuffles aside/.test(bumpLog), 'the step-aside narrates itself');

  // ================= The bestiary's second axis =================
  await ev(() => { MM.engine.enterWorld(); });
  await page.keyboard.press('m');
  await page.waitForSelector('#modalBox h2');
  const book = await ev(() => document.getElementById('modalBox').innerHTML);
  check(/Befriended:/.test(book), 'the Monster Book counts befriended kinds as its own collection');
  check(/beast-befriended/.test(book), 'a befriended card is framed differently (a second axis, not a rank)');
  check(/🕊 ×/.test(book), '...and carries its own 🕊 count beside the ⚔ one');
  await page.screenshot({ path: SHOTS + '/5-bestiary-befriended.png' });
  await page.click('#dlgOk');
  await page.waitForFunction(() => !MM.ui.modalOpen());

  // ================= Stance persistence =================
  await ev(() => { MM.engine.save(); MM.engine.load('TwoKidsB'); });
  check(await ev(() => MM.engine.state.stance === 'soothe'), 'the stance is remembered across save/load (a profile default)');
  check(await ev(() => MM.engine.befriendedCount() >= 1), 'friendships persist across save/load');

  // ================= The shop organizes, never filters =================
  await ev(() => { const s = MM.engine.state; s.gold = 900; MM.engine.enterWorld(); MM.ui.openShop(); });
  await page.waitForSelector('#modalBox h2');
  const shopSoothe = await ev(() => {
    const h = document.getElementById('modalBox').innerHTML;
    const heads = [...document.querySelectorAll('#modalBox h3')].map(x => x.textContent);
    return {
      gentleFirst: heads.findIndex(x => /gentle hands/.test(x)) >= 0 &&
                   heads.findIndex(x => /gentle hands/.test(x)) < heads.findIndex(x => /bold arms/.test(x)),
      hasBold: /bold arms/.test(h),
      boldBuyable: [...document.querySelectorAll('#modalBox button.shop-buy')].some(b => b.dataset.id === 'sword'),
      gentleBuyable: [...document.querySelectorAll('#modalBox button.shop-buy')].some(b => b.dataset.id === 'bubblepipe'),
      greeting: /tamer/i.test(h),
    };
  });
  check(shopSoothe.gentleFirst, 'soothing: the gentle rack is listed FIRST');
  check(shopSoothe.hasBold, '...and the bold rack is still listed, in full');
  check(shopSoothe.boldBuyable && shopSoothe.gentleBuyable, 'BOTH kinds are buyable — organized, never filtered (any stance may wield anything)');
  check(shopSoothe.greeting, 'the shopkeeper greets the stance');
  await page.screenshot({ path: SHOTS + '/6-shop-by-stance.png' });
  await page.click('#shopClose');

  // flip to strike: the ORDER flips, nothing disappears
  await ev(() => { MM.engine.setStance('strike'); MM.ui.openShop(); });
  await page.waitForSelector('#modalBox h2');
  const shopStrike = await ev(() => {
    const heads = [...document.querySelectorAll('#modalBox h3')].map(x => x.textContent);
    return {
      boldFirst: heads.findIndex(x => /bold arms/.test(x)) < heads.findIndex(x => /gentle hands/.test(x)),
      gentleStillThere: [...document.querySelectorAll('#modalBox button.shop-buy')].some(b => b.dataset.id === 'bubblepipe'),
    };
  });
  check(shopStrike.boldFirst, 'striking: the bold rack is listed first instead');
  check(shopStrike.gentleStillThere, '...and the gentle instruments are STILL fully buyable. Nothing is ever hidden.');
  await page.click('#shopClose');
  await ev(() => MM.engine.setStance('soothe'));

  // ================= ⚡ Brave: double damage, verified numerically =================
  // Same monster, same weapon, same streak — measure the damage actually dealt.
  const dmg = await ev(() => {
    const s = MM.engine.state;
    s.stance = 'strike'; s.streak = 0;
    s.equipped.weapon = 'sword';
    if (!s.gear.weapon.includes('sword')) s.gear.weapon.push('sword');
    const sample = (brave, n) => {
      s.brave = brave;
      const frost = [false];
      const hooks = MM.engine.stanceHooks({ name: 'T', boss: false, maxhp: 9999 }, frost);
      let total = 0;
      for (let i = 0; i < n; i++) { s.streak = 0; total += hooks.playerStrike().dmg; }
      return total / n;
    };
    const calm = sample(false, 4000);
    const bold = sample(true, 4000);
    s.brave = false; s.streak = 0;
    return { calm, bold, ratio: bold / calm };
  });
  check(Math.abs(dmg.ratio - 2) < 0.08,
    `⚡ Brave deals DOUBLE damage, measured: ${dmg.calm.toFixed(2)} -> ${dmg.bold.toFixed(2)} (×${dmg.ratio.toFixed(3)})`);

  // ...and the lifetime counter counts exactly the brave problems SOLVED
  const counter = await ev(() => {
    const s = MM.engine.state;
    s.braveSolved = 0; s.brave = true; s.streak = 0;
    const hooks = MM.engine.stanceHooks({ name: 'T', boss: false, maxhp: 9999 }, [false]);
    for (let i = 0; i < 7; i++) hooks.playerStrike();
    const solved = s.braveSolved;
    s.brave = false;
    const hooks2 = MM.engine.stanceHooks({ name: 'T', boss: false, maxhp: 9999 }, [false]);
    for (let i = 0; i < 5; i++) hooks2.playerStrike();
    return { solved, afterNonBrave: s.braveSolved };
  });
  check(counter.solved === 7, `braveSolved counts each brave problem solved (got ${counter.solved}/7)`);
  check(counter.afterNonBrave === 7, '...and NON-brave answers never inflate it');

  // THE BOSS FLOOR: brave must not make a boss trivial
  const bossFloor = await ev(() => {
    const s = MM.engine.state;
    s.brave = true; s.streak = 9;                 // crits live here
    s.equipped.weapon = 'star';
    if (!s.gear.weapon.includes('star')) s.gear.weapon.push('star');
    const boss = { name: 'B', boss: true, maxhp: 64 };
    const hooks = MM.engine.stanceHooks(boss, [false]);
    let worst = 0;
    for (let i = 0; i < 3000; i++) worst = Math.max(worst, hooks.playerStrike().dmg);
    s.brave = false; s.streak = 0;
    return { worst, maxhp: boss.maxhp, minAnswers: Math.ceil(boss.maxhp / worst) };
  });
  check(bossFloor.minAnswers >= 3,
    `a boss still takes ≥3 correct answers even brave + crit + best gear (biggest brave strike ${bossFloor.worst} of ${bossFloor.maxhp} hp → ${bossFloor.minAnswers} answers)`);

  // A BRAVE MISS COSTS NOTHING EXTRA — bravery is never a trap.
  const braveMiss = await ev(() => {
    const s = MM.engine.state;
    const run = (brave) => {
      s.brave = brave; s.streak = 4; s.hp = 100; s.maxhp = 100;
      MM.engine.recordAnswer('addsub_facts', false, { text: 'x', kidAnswer: '0' });
      return { streak: s.streak, hp: s.hp };
    };
    const calm = run(false);
    const bold = run(true);
    s.brave = false;
    return { calm, bold };
  });
  check(braveMiss.calm.streak === braveMiss.bold.streak && braveMiss.calm.hp === braveMiss.bold.hp,
    `a BRAVE miss costs exactly a normal miss — no extra penalty (streak ${braveMiss.bold.streak}, hp ${braveMiss.bold.hp}, same as normal)`);

  // brave draws a harder problem: full-depth, not the quick slot
  const braveProb = await ev(() => {
    const s = MM.engine.state;
    s.brave = false;
    const q = MM.mastery.combatProblem(s, 'addsub_facts');
    s.brave = true;
    const b = MM.mastery.combatProblem(s, 'addsub_facts');
    s.brave = false;
    return { quick: !!q.quick, braveQuick: !!b.quick, braveTier: b.tier };
  });
  check(braveProb.quick && !braveProb.braveQuick,
    `brave swaps the quick problem for a full-depth one (tier ${braveProb.braveTier})`);

  // the stance row shows the stakes while brave is on
  await ev(() => {
    const s = MM.engine.state;
    s.brave = true; s.stance = 'strike'; s.hp = s.maxhp;
    MM.engine.enterDungeon(1);
    MM.engine.startCombat(s.monsters.find(m => !m.boss));
  });
  await page.waitForFunction(() => MM.battle.active(), null, { timeout: 10000 });
  await page.waitForSelector('#stBrave', { timeout: 10000 });   // the row is built with round 1, not at battle open
  const braveUi = await ev(() => ({
    on: !!document.querySelector('#stBrave.on'),
    label: (document.getElementById('heroBarSub') || {}).textContent || '',
  }));
  check(braveUi.on, '⚡ Brave reads as ON in the battle row');
  check(/⚡/.test(braveUi.label), `the sub-label shows the stakes while brave ("${braveUi.label.trim()}")`);
  await page.screenshot({ path: SHOTS + '/7-brave-stance.png' });
  await winBattle();
  await clearModals(4);

  // ================= Miscount's Academy =================
  await ev(() => {
    const s = MM.engine.state;
    s.brave = false;
    s.taskIndex = 12; s.tasksDone = [1,2,3,4,5,6,7,8,9,10,11];
    s.metMiscount = true; s.academy = null;
    MM.engine.enterWorld();
    MM.engine.save();
  });
  const acadOffered = await ev(() => {
    let labels = [];
    const orig = MM.ui.dialogChoices;
    MM.ui.dialogChoices = (t, b, btns) => { labels = btns.map(x => x.label); };
    MM.engine.miscountArena();
    MM.ui.dialogChoices = orig;
    return labels;
  });
  check(acadOffered.some(l => /homework/i.test(l)), `Miscount offers the Academy once he is a teacher ("${acadOffered.find(l => /homework/i.test(l))}")`);

  // Force the first slate FLAWED. Whether a slate is flawed is a deliberate
  // coin-flip in the engine (a clean slate must always be a live possibility) —
  // but the mis-mark feedback path is the single most important thing to check
  // here (it is where the shipped "Here. undefined" bug lived), so it cannot be
  // left to chance. Patch the flag, not the RNG: zeroing Math.random would
  // starve the slates' own reject-and-retry guards.
  await ev(() => {
    const orig = MM.problems.spotTheError;
    const forced = (skill) => orig(skill, true);
    forced.skills = orig.skills;
    MM.problems.spotTheError = forced;
    MM.problems.__origSpot = orig;
  });
  await ev(() => MM.engine.academy());
  await page.waitForSelector('#modalBox h2');
  const intro = await page.textContent('#modalBox .dialog-body');
  check(intro.length > 40, 'Miscount introduces the homework in his own voice');
  check(!/idiot|stupid|silly|bad student/i.test(intro), '...and never mocks his students');
  await page.click('#modalBox .btnrow button');
  await page.waitForSelector('#modalBox .slate', { timeout: 10000 });
  check(true, 'a slate is rendered');
  const slate = await ev(() => ({
    steps: document.querySelectorAll('#modalBox .slate-step').length,
    choices: document.querySelectorAll('#modalBox .choice').length,
    hasClean: [...document.querySelectorAll('#modalBox .choice')].some(b => /every step is correct/i.test(b.textContent)),
    skill: MM.ui.current.skill,
    badStep: MM.ui.current.badStep,
  }));
  check(slate.choices === slate.steps + 1, 'one choice per step, plus "every step is correct"');
  check(slate.hasClean, '"it\'s all correct" is always a live answer');
  check(slate.badStep >= 0, 'the forced slate really does carry a planted error');
  await page.screenshot({ path: SHOTS + '/8-academy-slate.png' });

  // deliberately MIS-mark it. This is the moment that matters most: a kid gets it
  // wrong, and the game must TEACH. It is exactly where the shipped Wave-7 bug
  // made the MathMaker say "Here. undefined".
  const wrong = (slate.badStep + 1) % slate.steps;
  await page.click(`#modalBox .choice >> nth=${wrong}`);
  await page.waitForSelector('#modalBox .btnrow button.primary');
  const fb = await page.textContent('#modalBox #feedback');
  check(!/undefined/.test(fb), 'a mis-marked slate NEVER renders "undefined" (the shipped Wave-7 bug, found and fixed)');
  check(/step/i.test(fb), '...it shows which step it really was');
  check(fb.replace(/went wrong|goes wrong/gi, '').match(/\b(stupid|idiot|failed|bad)\b/i) === null, '...and never scolds the kid');
  check(fb.length > 60, `...and actually explains WHY ("${fb.trim().slice(0, 70).replace(/\s+/g, ' ')}...")`);
  await page.click('#modalBox .btnrow button.primary');
  await page.waitForTimeout(200);
  // restore the real coin-flip for the remaining slates
  await ev(() => { MM.problems.spotTheError = MM.problems.__origSpot; });

  // finish the day's homework, and confirm it pays and then closes for the day
  for (let i = 0; i < 4 && (await ev(() => MM.ui.modalOpen())); i++) {
    if (await page.$('#modalBox .choice')) {
      const idx = await ev(() => MM.ui.current.answer);
      await page.click(`#modalBox .choice >> nth=${idx}`);
      await page.waitForSelector('#modalBox .btnrow button.primary');
      await page.click('#modalBox .btnrow button.primary');
      await page.waitForTimeout(200);
    } else break;
  }
  await clearModals(4);
  check(await ev(() => MM.engine.academyDoneToday()), 'three slates marked → the day\'s homework is done');
  const shut = await ev(() => {
    let body = '';
    const orig = MM.ui.dialog;
    MM.ui.dialog = (t, b) => { body = b; };
    MM.engine.academy();
    MM.ui.dialog = orig;
    return body;
  });
  check(/tomorrow/i.test(shut), 'coming back the same day: he says come back tomorrow (daily, like the boards)');
  // ...and a new real day brings fresh slates
  const tomorrow = await ev(() => {
    MM.engine.state.academy = { date: '2020-01-01', done: 3 };
    return MM.engine.academyDoneToday();
  });
  check(!tomorrow, 'a new real day rolls the homework over');

  // parent cap: a disabled topic never reaches the homework
  const cap = await ev(() => {
    const s = MM.engine.state;
    const topics = {};
    for (const sk of MM.data.PARENT_TOPICS) topics[sk] = (sk === 'geometry');
    s.parent.topics = topics;
    const offered = MM.engine.academySkills();
    s.parent.topics = {};
    return offered;
  });
  check(cap.length > 0 && cap.every(sk => sk === 'geometry'),
    `the Academy honours the parent switches (only geometry enabled → offered: ${cap.join(', ') || 'nothing'})`);

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
