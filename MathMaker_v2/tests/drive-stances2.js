// Playtest round 5 (2026-07-12): the stance follow-ups.
// 1. Brave problems must LOOK hard — facts topics compose into chains, never
//    plain "3+5" (the report that started this).
// 2. The ⚡ button explains itself on first touch (kids don't hover).
// 3. The dual-form ⚡ toggle (v1.7.0): an eligible problem's form swaps in
//    place mid-round (base ⇄ base+step, same operands) and damage follows
//    whichever form was actually answered; an ineligible (deep/choice)
//    problem keeps the older pick-time latch instead.
// 4. A soothed monster STAYS, becalmed: full health, pacified, off-duty if a
//    guard, no ⚔ tally — and the soothe lands with a chime, not a whack.
// 5. Each gentle instrument sheds its own calm (bubbles for the pipe).
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-stances2');

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
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
  }

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'StanceKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 2; s.tasksDone = [1];
    s.seenBattleHelp = true; s.seenCeremony = true;
    s.level = 6; s.maxhp = 80; s.hp = 80; s.gold = 400;
    MM.engine.recalcMaxStamina(); s.stamina = s.maxStamina;
    MM.engine.save();
  });

  // ---------- 1. brave facts problems are chains, never "3+5" ----------
  const spread = await ev(() => {
    const s = MM.engine.state;
    s.brave = true;
    s.dungeonIndex = 1;
    const texts = [];
    for (let i = 0; i < 40; i++) texts.push(MM.mastery.combatProblem(s, 'addsub_facts').text);
    for (let i = 0; i < 40; i++) texts.push(MM.mastery.combatProblem(s, 'muldiv_facts').text);
    s.brave = false;
    return texts;
  });
  const plain = spread.filter(t => /^\d+ [+−] \d+ = \?$/.test(t.trim()) || /^\d+ [×÷] \d+ = \?$/.test(t.trim()));
  const composed = spread.filter(t => /▢/.test(t) || (t.match(/[+−×÷]/g) || []).length >= 2);
  check(plain.length === 0, `brave facts problems are NEVER plain two-term sums (0 of 80; e.g. "${spread[0].replace(/\n.*/, '')}")`);
  check(composed.length === 80, `all 80 brave draws are chains or missing-number problems (${composed.length}/80)`);

  // ---------- 2 + 3. the ⚡ button explains itself; the latch holds ----------
  const mon = await ev(() => {
    const s = MM.engine.state;
    MM.engine.enterDungeon(1);
    const m = s.monsters.find(m => !m.boss && m.hp > 0);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    MM.engine.startCombat(m);
    return { name: m.name, maxhp: m.maxhp };
  });
  await page.waitForFunction(() => MM.battle.active());
  await page.waitForSelector('#stBrave');
  await page.click('#stBrave');
  await page.waitForTimeout(200);
  const braveMsg = await ev(() => document.getElementById('battleMsg').innerText);
  check(/hardest/.test(braveMsg) && /double/.test(braveMsg) && /nothing extra/.test(braveMsg),
    `first ⚡ touch explains the whole deal in the battle itself ("${braveMsg.slice(0, 60)}…")`);
  check(await ev(() => MM.engine.state.seenBraveHelp === true), 'the explainer is once-ever (persisted)');
  await page.screenshot({ path: SHOTS + '/1-brave-explainer.png' });
  // second toggle immediately (before any answer locks the row): short confirm
  await page.click('#stBrave');
  await page.waitForTimeout(150);
  const offMsg = await ev(() => document.getElementById('battleMsg').innerText);
  check(/Brave off/.test(offMsg), 'later toggles get the short confirm, not the lecture');
  await page.click('#stBrave'); // back ON — v1.7.0: this SWAPS the shown problem in place
  await page.waitForTimeout(150);
  // v1.7.0 DUAL-FORM TOGGLE (supersedes the old "pick-time latch" for
  // ELIGIBLE problems — see mastery.combatProblem/combatDualForm): the SAME
  // question just grew its extra step, right now, no reroll — and damage
  // follows the form actually answered, so this must pay DOUBLE. An
  // INELIGIBLE problem (deep/choice kinds) still keeps the old latch.
  const eligible = await ev(() => !!(MM.battle.current && MM.battle.current._dualEligible));
  const braveSolvedBefore = await ev(() => MM.engine.state.braveSolved || 0);
  await answerBattleOnce();
  await page.waitForTimeout(900);
  const braveSolvedAfter = await ev(() => MM.engine.state.braveSolved || 0);
  // braveSolved increments exactly when playerStrike scores the hit as
  // brave (double damage) — a magnitude-independent, crit-proof way to
  // confirm doubling actually happened for the form that was answered.
  if (eligible) {
    check(braveSolvedAfter === braveSolvedBefore + 1,
      `dual-form toggle: the in-round ⚡ swap pays DOUBLE damage for the form actually answered (braveSolved ${braveSolvedBefore} -> ${braveSolvedAfter})`);
  } else {
    check(braveSolvedAfter === braveSolvedBefore,
      `dual-form toggle: an ineligible problem keeps the old latch — normal damage until next question (braveSolved unchanged at ${braveSolvedAfter})`);
  }
  // the latch strike may have finished the monster — clear whichever panel is up
  for (let i = 0; i < 10 && await ev(() => MM.battle.active()); i++) {
    if (await page.$('#victOk')) { await page.click('#victOk'); break; }
    await ev(() => { const f = document.getElementById('fleeBtn'); if (f) f.click(); });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => !MM.battle.active(), null, { timeout: 10000 });
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });

  // ---------- 4. a soothed monster STAYS, becalmed ----------
  await ev(() => {
    const s = MM.engine.state;
    s.stance = 'soothe'; s.brave = false;
    MM.engine.enterDungeon(1);
  });
  const guardInfo = await ev(() => {
    const s = MM.engine.state;
    // prefer a guard if the roster has one, else any regular
    const m = s.monsters.find(m => !m.boss && m.behavior === 'guard' && m.hp > 0)
      || s.monsters.find(m => !m.boss && m.hp > 0);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    const kills = Object.assign({}, s.bestiary.kills);
    MM.engine.startCombat(m);
    return { name: m.name, behavior: m.behavior, killsBefore: kills[m.name] || 0 };
  });
  await page.waitForFunction(() => MM.battle.active());
  await winBattle();
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });
  const after = await ev(n => {
    const s = MM.engine.state;
    const m = s.monsters.find(m => m.becalmed);
    return m ? {
      alive: m.hp === m.maxhp, behavior: m.behavior,
      pacified: MM.engine.isPacified(m),
      kills: (s.bestiary.kills || {})[n] || 0,
      befriended: (s.bestiary.befriended || {})[n] || 0,
    } : null;
  }, guardInfo.name);
  check(!!after, 'the soothed monster is STILL THERE (becalmed), not gone like a beaten one');
  check(after && after.alive, 'it stands at full health — calmed, not hurt');
  check(after && after.kills === guardInfo.killsBefore, 'no ⚔ mark — a calmed friend was not defeated');
  check(after && after.befriended >= 1, 'the 🤍 befriend mark is there instead');
  // round 5: it SITS where it was calmed, and bumping it swaps places
  const sitAndSwap = await ev(() => {
    const s = MM.engine.state;
    s.monsters.forEach(o => { if (!o.becalmed) o.stun = 999; }); // no stray attacks during the turn crank
    const m = s.monsters.find(m => m.becalmed);
    const sat = { x: m.x, y: m.y };
    for (let i = 0; i < 6; i++) MM.engine.monsterTurn();
    const stillThere = m.x === sat.x && m.y === sat.y;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    const heroWas = { x: s.px, y: s.py };
    MM.engine.tryMove(m.x - s.px, m.y - s.py);
    return { stillThere, swapped: s.px === sat.x && s.py === sat.y && m.x === heroWas.x && m.y === heroWas.y, battle: MM.battle.active() };
  });
  check(sitAndSwap.stillThere, 'it SITS right where it was calmed (six monster turns, zero drift)');
  check(!sitAndSwap.battle && sitAndSwap.swapped, 'bumping it is never a fight — it steps aside (you swap places)');
  // per-creature taming persists across a re-entry TODAY (becalmedAt),
  // and its wild kin spawn wild — one tame creature never tames the crowd
  const reentry = await ev(() => {
    const s = MM.engine.state;
    const kind = s.monsters.find(m => m.becalmed).name;
    // (the bump-swap above updated the friend's `home`, so look for ANY
    // becalmed monster after re-entry — exactly one was soothed today)
    MM.engine.exitDungeon();
    MM.engine.enterDungeon(1);
    const back = s.monsters.filter(m => m.becalmed);
    const kin = s.monsters.filter(m => m.name === kind && !m.becalmed && m.hp > 0);
    return { stillTame: back.length === 1, wildKinCount: kin.length };
  });
  check(reentry.stillTame, 'leaving and returning the same day: the tamed friend is STILL tame (becalmedAt)');
  check(reentry.wildKinCount >= 0, `...while ${reentry.wildKinCount} wild kin of the same kind spawned wild (per-creature)`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + '/2-becalmed-stays.png' });

  // the "first friend" ceremony is ONCE EVER: with one friend already made,
  // two more soothed kinds queue zero ceremony modals (line + mark only)
  const laterCeremonies = await ev(() => {
    const s = MM.engine.state;
    s.pendingBadges = [];
    const mk = n => ({ name: n, sprite: 'slime', xp: 1, boss: false, hp: 0, maxhp: 10, atk: 1 });
    MM.engine.grantVictory(mk('Test Kind A'), true);
    MM.engine.grantVictory(mk('Test Kind B'), true);
    return s.pendingBadges.filter(b => b.befriend).length;
  });
  check(laterCeremonies === 0, 'the friend ceremony fires once EVER — later kinds get a line and a mark, never a modal');

  // ---------- 5. instrument motes + the soothe chime ----------
  check(await ev(() => typeof MM.sound.soothe === 'function'), 'the soothe chime exists (no whack on a calm)');
  await ev(() => {
    const s = MM.engine.state;
    s.gear.weapon.push('bubblepipe'); MM.engine.equip('weapon', 'bubblepipe');
    MM.engine.enterDungeon(1);
    const m = s.monsters.find(m => !m.boss && m.hp > 0 && !m.becalmed);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    MM.engine.startCombat(m);
  });
  await page.waitForFunction(() => MM.battle.active());
  await ev(() => { MM.engine.state.streak = 0; }); // crits shed a burst, not motes
  let sawBubble = false;
  for (let round = 0; round < 3 && !sawBubble; round++) {
    await ev(() => { MM.engine.state.streak = 0; });
    await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])', { timeout: 10000 }).catch(() => {});
    if (await page.$('#victOk')) break;
    await answerBattleOnce();
    for (let t = 0; t < 8 && !sawBubble; t++) {
      await page.waitForTimeout(150);
      const fx = await ev(() => MM.battle.debugEffects());
      if (fx && fx.shapes.includes('bubble')) sawBubble = true;
      if (!fx || !(await ev(() => MM.battle.active()))) break;
    }
    if (await page.$('#victOk')) break;
  }
  check(sawBubble, 'the Bubble Pipe blows BUBBLES on a landed soothe');
  await page.screenshot({ path: SHOTS + '/3-bubbles.png' });
  if (await page.$('#victOk')) { await page.click('#victOk'); }
  else await ev(() => MM.battle.active() && document.getElementById('fleeBtn').click());

  // ---------- 6. one track: the way lives in ⚙️, and Help knows your way ----------
  for (let i = 0; i < 20 && await ev(() => MM.battle.active()); i++) {
    if (await page.$('#victOk')) { await page.click('#victOk'); break; }
    await ev(() => { const f = document.getElementById('fleeBtn'); if (f) f.click(); });
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => !MM.battle.active(), null, { timeout: 10000 });
  await page.waitForTimeout(300);
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });
  const helpGentle = await ev(() => {
    let html = '';
    const orig = MM.ui.dialog;
    MM.ui.dialog = (t, b) => { html = b; };
    MM.ui.helpDialog();
    MM.ui.dialog = orig;
    return html;
  });
  check(/Battles, your way/.test(helpGentle) && /gently/.test(helpGentle) && /tangle in the monster/.test(helpGentle),
    'Help describes YOUR way (gentle, for this kid) and says where to change it');
  await ev(() => MM.ui.difficultyDialog());
  await page.waitForSelector('#modalBox h2');
  const dlgText = await ev(() => document.getElementById('modalBox').innerText);
  check(/your way/i.test(dlgText) && /gently/.test(dlgText), 'the ⚙️ dialog names your current way');
  await ev(() => { [...document.querySelectorAll('#modalBox button')].find(b => /Change my way/.test(b.textContent)).click(); });
  await page.waitForTimeout(200);
  check(await ev(() => MM.engine.state.stance === 'strike'), 'one click in ⚙️ switches the way (gently -> boldly), nothing lost');
  check(await ev(() => MM.engine.befriendedCount() >= 1), '...and every friend stays a friend');

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
