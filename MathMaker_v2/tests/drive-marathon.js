// FINAL_PASSES Pass A1: THE MARATHON — one continuous playthrough from a
// brand-new profile to the credits, granting NOTHING. Position teleports
// are used to walk corridors quickly, but every flag, level, badge, coin,
// item, gate, exam, battle, and dialog is earned through the real code
// path: 13 mainland tasks in order, the bridge, Miscount, the pier, the
// egg, three lenses, the Lighthouse, the Spire, the Halls (music enabled
// through the real parent-panel UI), and the castle ending — asserting the
// gate chain at every seam. Deliberately NOT covered (their own drives own
// them): the Smugglers' Vault and Gullwrack (both optional content).
// Expect a LONG runtime (~20-40 min): ~30 real battles at story pace.
const { chromium } = require('playwright');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

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
  page.setDefaultTimeout(120000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const S = () => page.evaluate(() => MM.engine.state);
  const ev = (fn, arg) => page.evaluate(fn, arg);

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
  // solve any stack of problems/dialogs until every modal is closed.
  // CRITICAL: a battle can start underneath us — walking back into a
  // dungeon lands next to a chaser, which attacks on the entry step, and
  // then the battle overlay swallows every click meant for the modal.
  // Fight first, clear second.
  async function clearModals(cap) {
    for (let i = 0; i < (cap || 12); i++) {
      if (await page.evaluate(() => MM.battle.active())) { await winBattle(); continue; }
      if (!(await page.evaluate(() => MM.ui.modalOpen()))) return;
      // an echo door is a tone-memory puzzle, not a math problem — repeat
      // the sequence the way drive-halls proved
      if (await page.$('#echoButtons .tone-btn')) {
        const seq = await page.evaluate(() => MM.ui.currentEcho);
        for (const tone of seq) {
          await page.waitForFunction((t) => { const b = document.querySelector(`.tone-btn[data-tone="${t}"]`); return b && !b.disabled; }, tone, { timeout: 15000 });
          await page.click(`.tone-btn[data-tone="${tone}"]`);
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(400);
        continue;
      }
      // only treat it as a problem if it can still be ANSWERED — after the
      // final spiral answer the input disables while the credits bloom,
      // and re-solving a solved problem crashed the last three feet of an
      // otherwise-complete playthrough
      if (await page.$('#modalBox .prob-text') &&
          await page.$('#modalBox #answerInput:not([disabled]), #modalBox .choice:not([disabled])')) {
        await solveModalOnce();
        continue;
      }
      const ok = await page.$('#modalBox #dlgOk, #modalBox .btnrow button');
      if (ok) { await ok.click().catch(() => {}); await page.waitForTimeout(120); continue; }
      await page.waitForTimeout(200);
    }
  }
  async function winBattle(cap) {
    let calm = 0; // consecutive ticks with no battle AND no modal
    for (let i = 0; i < (cap || 60); i++) {
      if (await page.$('#victOk')) break;
      // dialogs can sit in FRONT of a battle — including BEFORE it starts
      // (the first-battle tutorial fires before battle.active() is true,
      // which silently no-op'ed two whole marathon attempts) — dismiss
      // them first, and only then judge whether the battle is over
      // Wave 8b: the CEREMONY ("boldly, or gently?") fires before the very first
      // monster — a two-button dialogChoices, so it has no #dlgOk at all. Match
      // any PRIMARY button: that covers the tutorial's OK, the ceremony's two
      // choices, and every celebration — but never an unanswered problem modal,
      // whose only button at that point is the secondary "Leave".
      const overlayOk = await page.$('#overlay:not(.hidden) #dlgOk, #overlay:not(.hidden) .btnrow button.primary');
      if (overlayOk) { await overlayOk.click(); await page.waitForTimeout(250); calm = 0; continue; }
      if (!(await page.evaluate(() => MM.battle.active() || MM.ui.modalOpen()))) {
        if (++calm >= 2) return 'over'; // genuinely no battle happening
        await page.waitForTimeout(300);
        continue;
      }
      calm = 0;
      const hasForm = await page.$('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
      if (!hasForm) {
        await page.waitForTimeout(350);
        continue;
      }
      const info = await page.evaluate(`(${canonicalize})(MM.battle.current)`);
      if (info) {
        if (info.kind === 'choice') await page.click(`#battleProblem .choice >> nth=${info.idx}`);
        else { await page.fill('#battleProblem #answerInput', info.val); await page.keyboard.press('Enter'); }
      }
      await page.waitForTimeout(600);
    }
    if (!(await page.$('#victOk'))) {
      // the battle ended without a victory panel — the kid DIED (gentle
      // failure: whisked to safety, gold halved, progress kept). Report
      // it so the caller can walk back in, the way a real kid does.
      await clearModals();
      return 'died';
    }
    await page.click('#victOk');
    await page.waitForFunction(() => !MM.battle.active());
    await clearModals(); // badge/pet celebrations queue behind battles
    return 'won';
  }
  // fight every regular monster on the floor — the XP, gold, and streaks a
  // real playthrough runs on. Potion when low; if death happens, re-enter
  // (defeated monsters stay gone for the day, so progress sticks).
  async function clearRegulars(reenter) {
    for (let guard = 0; guard < 20; guard++) {
      if (!(await ev(() => String(MM.engine.state.mapId).startsWith('d')))) await reenter();
      await ev(() => { const s = MM.engine.state; if (s.hp < s.maxhp * 0.4 && s.potions > 0) MM.engine.usePotion(); });
      const target = await ev(() => {
        const s = MM.engine.state;
        let sawUnreachable = false;
        for (const m of s.monsters) {
          if (m.boss || m.hp <= 0) continue;
          let engaged = false;
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const t = (s.grid[m.y + dy] || [])[m.x + dx];
            if (t && !'#GKDZY*U%il'.includes(t) && !s.monsters.some(o => o !== m && o.hp > 0 && o.x === m.x + dx && o.y === m.y + dy)) {
              s.px = m.x + dx; s.py = m.y + dy;
              MM.engine.tryMove(-dx, -dy);
              engaged = true;
              break;
            }
          }
          if (engaged) return true;
          sawUnreachable = true; // cornered spawn — leave it be, honestly
        }
        return sawUnreachable ? 'onlyUnreachable' : null;
      });
      if (!target || target === 'onlyUnreachable') return;
      await page.waitForTimeout(200);
      await winBattle();
    }
  }
  // teleport next to a target and step into it (bump or walk-on)
  async function stepInto(x, y, fromDx, fromDy) {
    await ev(({ x, y, fromDx, fromDy }) => {
      const s = MM.engine.state;
      s.px = x + fromDx; s.py = y + fromDy;
      MM.engine.tryMove(-fromDx, -fromDy);
    }, { x, y, fromDx, fromDy });
    await page.waitForTimeout(120);
  }
  // find an open neighbor of a glyph and step into it, fighting if a
  // battle starts and solving whatever modal opens
  async function bumpGlyph(ch) {
    const pos = await ev((ch) => {
      const s = MM.engine.state;
      const p = MM.maps.find(s.grid, ch)[0];
      if (!p) return null;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const t = (s.grid[p.y + dy] || [])[p.x + dx];
        if (t && '.Pk_o,^sr'.includes(t) && !s.monsters.some(m => m.hp > 0 && m.x === p.x + dx && m.y === p.y + dy)) {
          s.px = p.x + dx; s.py = p.y + dy;
          MM.engine.tryMove(-dx, -dy);
          return p;
        }
      }
      return null;
    }, ch);
    await page.waitForTimeout(150);
    if (await page.evaluate(() => MM.battle.active())) await winBattle();
    if (await page.evaluate(() => MM.ui.modalOpen())) await clearModals();
    return pos;
  }
  // the generic floor-runner: keys -> locks -> lever -> puzzle doors ->
  // (boss if present) -> stairs down. Every interaction is the real one.
  async function runFloor(opts) {
    opts = opts || {};
    for (let guard = 0; guard < 8; guard++) {
      const k = await ev(() => MM.maps.find(MM.engine.state.grid, 'k')[0] || null);
      if (!k) break;
      await bumpGlyph('k'); // stepping onto a key picks it up
    }
    for (let guard = 0; guard < 8; guard++) {
      const K = await ev(() => MM.maps.find(MM.engine.state.grid, 'K')[0] || null);
      if (!K) break;
      const before = await ev(() => MM.maps.find(MM.engine.state.grid, 'K').length);
      await bumpGlyph('K');
      const after = await ev(() => MM.maps.find(MM.engine.state.grid, 'K').length);
      if (after >= before) break; // out of keys — fine, locks are optional under teleports
    }
    if (await ev(() => !!MM.maps.find(MM.engine.state.grid, 'L')[0])) await bumpGlyph('L');
    if (opts.clockDoor && await ev(() => !!MM.maps.find(MM.engine.state.grid, 'Z')[0])) await bumpGlyph('Z');
    if (opts.boss) {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (!(await ev(() => String(MM.engine.state.mapId).startsWith('d'))) && opts.reenter) {
          await opts.reenter(); // died on a previous attempt — walk back in
        }
        // some bosses sit in sealed one-tile rooms behind a math door
        // (dungeon 4's is) — solve any door adjoining the boss first, the
        // way a real kid has to
        const sealDoor = await ev(() => {
          const s = MM.engine.state;
          const m = s.monsters.find(m => m.boss && m.hp > 0);
          if (!m) return null;
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const t = (s.grid[m.y + dy] || [])[m.x + dx];
            if (t && 'DKZY'.includes(t)) {
              // bump that door from ITS open side
              const doorX = m.x + dx, doorY = m.y + dy;
              for (const [ex, ey] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const u = (s.grid[doorY + ey] || [])[doorX + ex];
                if (u && '.k_o,^sr'.includes(u)) {
                  s.px = doorX + ex; s.py = doorY + ey;
                  MM.engine.tryMove(-ex, -ey);
                  return true;
                }
              }
            }
          }
          return null;
        });
        if (sealDoor) { await page.waitForTimeout(200); await clearModals(); }
        const engaged = await ev(() => {
          const s = MM.engine.state;
          const m = s.monsters.find(m => m.boss && m.hp > 0);
          if (!m) return 'gone';
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const t = (s.grid[m.y + dy] || [])[m.x + dx];
            if (t && !'#GKDZY*U'.includes(t) && !s.monsters.some(o => o !== m && o.hp > 0 && o.x === m.x + dx && o.y === m.y + dy)) {
              s.px = m.x + dx; s.py = m.y + dy; MM.engine.tryMove(-dx, -dy); return true;
            }
          }
          return false;
        });
        if (engaged === 'gone') return; // beaten on an earlier attempt
        if (!engaged) { await page.waitForTimeout(300); continue; }
        await page.waitForTimeout(200);
        const outcome = await winBattle(90);
        if (outcome === 'won') return;
        // 'died': gentle failure healed us — retry. 'over': the engage
        // fizzled (blocked bump) — loop re-checks whether the boss lives.
      }
      return;
    }
    // descend
    if (await ev(() => !!MM.maps.find(MM.engine.state.grid, '>')[0])) {
      const floorBefore = await ev(() => MM.engine.state.floorIndex);
      await bumpGlyph('>');
      await page.waitForFunction((fb) => MM.engine.state.floorIndex === fb + 1, floorBefore);
    }
  }
  async function runDungeon(floors, opts) {
    opts = opts || {};
    if (opts.clearFirst) await clearRegulars(opts.reenter); // level like a real kid
    for (let f = 0; f < floors - 1; f++) await runFloor({ clockDoor: opts.clockDoor });
    await runFloor({ boss: true, reenter: opts.reenter });
  }
  async function exitDungeonReal() {
    // Beacon-free, rope-free: climb to floor 0 and walk out the X
    for (let guard = 0; guard < 6; guard++) {
      const fi = await ev(() => MM.engine.state.floorIndex || 0);
      if (!fi) break;
      await bumpGlyph('<');
    }
    await bumpGlyph('X');
    await page.waitForFunction(() => MM.maps.isOverworld(MM.engine.state.mapId));
    await clearModals();
  }
  async function upgradeGear() {
    // buy the best affordable weapon + body armor through the REAL buy flow
    for (const slot of ['weapon', 'body']) {
      const target = await ev((slot) => {
        const s = MM.engine.state;
        const onIsle = s.mapId !== 'world';
        const cur = MM.engine.equippedItem(slot);
        const curVal = cur ? (slot === 'weapon' ? cur.atk : cur.def || 0) : 0;
        const options = MM.data.GEAR[slot]
          .filter(it => it.price > 0 && !it.notForSale && !!it.isle === onIsle && it.price <= s.gold)
          .filter(it => (slot === 'weapon' ? it.atk : it.def || 0) > curVal)
          .sort((a, b) => (slot === 'weapon' ? b.atk - a.atk : (b.def || 0) - (a.def || 0)));
        if (!options.length) return null;
        MM.engine.buy(options[0], slot);
        return options[0].id;
      }, slot);
      if (target) await clearModals();
    }
  }
  async function restIfNeeded() {
    const s = await S();
    if (s.hp > s.maxhp * 0.6 && s.stamina > 30) return;
    await ev(() => MM.engine.inn());
    await clearModals(8);
  }

  // ================= THE PLAYTHROUGH =================
  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'MarathonKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);
  await ev(() => { MM.engine.state.difficulty = 'story'; MM.engine.save(); });

  // gate: dungeon 1 sealed before meeting the MathMaker
  await ev(() => MM.engine.tryEnterDungeon(1));
  check(/MathMaker/.test(await page.textContent('#modalBox')), 'gate: dungeons sealed before the castle visit');
  await clearModals();
  await ev(() => MM.engine.castle());
  await clearModals();
  check((await S()).taskIndex === 1, 'the MathMaker assigns task 1');

  // ---------- the 13 mainland tasks, in order, for real ----------
  for (let i = 1; i <= 13; i++) {
    if (i === 2) { // spot-check forward gating once
      // Wave 8b: by now the kid has fought a whole dungeon, so the Ceremony has
      // been asked and winBattle answered it with the first PRIMARY button —
      // "⚔️ Boldly". This marathon therefore walks the whole game in the Strike
      // stance, exactly as every pre-8b run did, which is what makes it a fair
      // regression of the old path. (Asserted HERE, not before the loop: at that
      // point the kid has met the MathMaker but not yet met a monster.)
      check(await ev(() => MM.engine.state.seenCeremony === true), 'the Ceremony was asked and answered at the first monster');
      check(await ev(() => MM.engine.state.stance === 'strike'), '...and this run walks it boldly (the pre-8b path, kept honest)');
      await ev(() => MM.engine.tryEnterDungeon(7));
      check(/[Ss]ealed/.test(await page.textContent('#modalBox')), 'gate: dungeon 7 refuses while task 2 is current');
      await clearModals();
    }
    // Wave 8b acceptance: SOOTHE at least two battles en route, in the middle of
    // a real playthrough — the alternate verb has to survive the whole engine
    // (rewards, bestiary, bounties, the monster turn), not just its own drive.
    if (i === 3) {
      await ev(() => { MM.engine.setStance('soothe'); });
      await ev((i) => MM.engine.tryEnterDungeon(i), i);
      await clearModals();
      await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d'));
      let soothed = 0;
      for (let n = 0; n < 2; n++) {
        const started = await ev(() => {
          const s = MM.engine.state;
          const mon = s.monsters.find(m => !m.boss && m.hp > 0);
          if (!mon) return false;
          MM.engine.startCombat(mon);
          return true;
        });
        if (!started) break;
        if ((await winBattle()) === 'won') soothed++;
        await clearModals();
      }
      check(soothed === 2, `soothed ${soothed} of 2 battles mid-playthrough (the alternate verb, end to end)`);
      check(await ev(() => MM.engine.befriendedCount() >= 1), '...and the befriended axis filled in for real');
      check(await ev(() => MM.engine.state.totals.correct > 0), '...through the ordinary answer path (same math, same records)');
      await ev(() => { MM.engine.setStance('strike'); });   // back to the bold road
      await exitDungeonReal();
    }
    const reenter = async () => {
      await ev((i) => MM.engine.tryEnterDungeon(i), i);
      await clearModals(); // the seal exam (dungeon 2+; already-broken seals skip)
      await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d'));
    };
    await reenter();
    // dungeons 1-6: fight everything, like a kid leveling up for real;
    // from 7 on the gear economy carries the boss fights (documented cap)
    await runDungeon(1, { clearFirst: i <= 6, reenter });
    check((await S()).haveItem === true, `dungeon ${i}: boss beaten, treasure in hand`);
    await exitDungeonReal();
    if (i <= 10) { await ev(() => MM.engine.castle()); await clearModals(); }
    else { await ev(() => MM.engine.miscountArena()); await clearModals(); }
    const s = await S();
    check(s.tasksDone.includes(i), `task ${i} turned in (taskIndex now ${s.taskIndex})`);
    if (i === 10) {
      // the bridge is laid during enterWorld — refresh the grid first
      await ev(() => MM.engine.enterWorld());
      check(await ev(() => MM.engine.state.grid[11][38] === '='), 'the bridge rises after task 10');
      await ev(() => MM.engine.talkNpc('u'));
      await clearModals();
    }
    if (i % 2 === 0) { await upgradeGear(); }
    await restIfNeeded();
  }

  // ---------- to the Isles: pier, egg, hatching ----------
  const preS = await S();
  check(preS.tasksDone.length === 13, 'all thirteen tasks done');
  await ev(() => MM.engine.pier());
  await page.waitForSelector('#modalBox h2');
  await page.click('#modalBox .btnrow button.primary'); // sail
  await page.waitForSelector('#modalBox h2', { timeout: 30000 });
  await page.click('#modalBox .btnrow button >> nth=0'); // the first egg
  await page.waitForSelector('#petName');
  await page.fill('#petName', 'Journey');
  await page.click('#petOk');
  await clearModals();
  check((await S()).mapId === 'isles', 'arrived on the Isles');
  check(await ev(() => !!MM.engine.state.isles.pet), 'the egg hatched on the voyage');

  // ---------- three lenses, gated in order ----------
  await ev(() => MM.engine.tryEnterDungeon(16));
  check(/Murk/.test(await page.textContent('#modalBox')), 'gate: Cinderforge choked with Murk before the Frost Lens');
  await clearModals();

  const lensRuns = [[14, 2, 'tidepool'], [15, 2, 'frostbite'], [16, 3, 'cinderforge']];
  for (const [idx, floors, lens] of lensRuns) {
    const reenterIsle = async () => {
      await ev((idx) => MM.engine.tryEnterDungeon(idx), idx);
      await clearModals();
      await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d'));
    };
    await reenterIsle();
    await runDungeon(floors, { reenter: reenterIsle });
    check(await ev((lens) => MM.engine.state.isles.lenses[lens] === true, lens), `the ${lens} lens is lit`);
    await exitDungeonReal();
    await restIfNeeded();
  }
  check(await ev(() => !MM.maps.find(MM.engine.state.grid, 'u').length), 'all Murk fog bands receded');

  // gear up at the Brass Compass with sixty fights' worth of earned gold —
  // isle-tier gear is what makes the Lighthouse/Spire bosses a fair fight
  // (attempt 8 lost the Unwound King in mainland gear; a real kid shops)
  await upgradeGear();
  await ev(() => MM.engine.inn());
  await clearModals(8);

  // ---------- the Great Lighthouse ----------
  await stepInto(8, 1, 0, 1); // bump the 'H'
  await clearModals();
  await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d17'));
  const reenterLight = async () => { await stepInto(8, 1, 0, 1); await clearModals(); await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d17')); };
  await runDungeon(4, { reenter: reenterLight });
  check(await ev(() => MM.engine.state.isles.lampLit === true), 'the Great Lamp is lit');
  await clearModals();
  await exitDungeonReal();

  // castle gate must still be CLOSED (no Spire yet)
  await ev(() => { const s = MM.engine.state; s.continent = 'west'; s.worldPos = null; MM.engine.enterWorld(); });
  await ev(() => MM.engine.castle());
  check(!(await ev(() => MM.engine.state.endingDone)) && !(await page.evaluate(() => /Gallery/.test(document.getElementById('modalBox').textContent))),
    'gate: the castle does NOT open before the Spire');
  await clearModals();

  // ---------- the Clockwork Spire ----------
  await ev(() => { const s = MM.engine.state; s.continent = 'horologe'; s.worldPos = null; MM.engine.enterWorld(); });
  await bumpGlyph('5');
  await clearModals();
  await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d19'));
  await ev(() => MM.engine.inn(true)); // bunk rest: arrive at the Spire fresh
  await clearModals(8);
  const reenterSpire = async () => { await bumpGlyph('5'); await clearModals(); await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d19')); };
  await runDungeon(5, { clockDoor: true, reenter: reenterSpire });
  check(await ev(() => MM.engine.state.isles.spireDone === true), 'spireDone — the Spire ticks again');
  await exitDungeonReal();

  // ---------- the Resonant Halls, with music enabled the REAL way ----------
  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234'); // first visit: creates the PIN
  await page.click('#pinOk');
  await page.waitForSelector('input[data-skill="music_reading"]');
  // REVISED 2026-07-11 (user decision): every topic arrives ON — the
  // panel is the OFF-switch. Exercise it both ways: toggle music off,
  // save, reopen, toggle back on — proving a parent's choice sticks.
  const wasOn = await page.evaluate(() => document.querySelector('input[data-skill="music_reading"]').checked);
  check(wasOn, 'music_reading arrives ON in the parent panel (default-ON respected)');
  await page.click('input[data-skill="music_reading"]'); // off
  await page.click('#parentDone');
  await clearModals();
  check(await ev(() => MM.engine.state.parent.topics.music_reading === false), 'the parent OFF-switch persists');
  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234');
  await page.click('#pinOk');
  await page.waitForSelector('input[data-skill="music_reading"]');
  await page.click('input[data-skill="music_reading"]'); // back on
  await page.click('#parentDone');
  await clearModals();
  check(await ev(() => MM.engine.state.parent.topics.music_reading === true), 'music_reading enabled through the real parent panel and persisted');

  await ev(() => { const s = MM.engine.state; s.continent = 'chime'; s.worldPos = null; MM.engine.enterWorld(); });
  await bumpGlyph('6');
  await clearModals();
  await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d20'));
  const reenterHalls = async () => { await bumpGlyph('6'); await clearModals(); await page.waitForFunction(() => String(MM.engine.state.mapId).startsWith('d20')); };
  await runDungeon(4, { reenter: reenterHalls });
  check(await ev(() => MM.engine.state.isles.hallsDone === true), 'hallsDone — the choir is whole');
  await exitDungeonReal();

  // ---------- the ending ----------
  await ev(() => { const s = MM.engine.state; s.continent = 'west'; s.worldPos = null; MM.engine.enterWorld(); });
  await ev(() => MM.engine.castle());
  await clearModals(4); // any door-opening fanfare dialog
  await page.waitForFunction(() => String(MM.engine.state.mapId).includes('castle'));
  check(true, 'the castle doors open — walkable interior');
  // the Study reveal lives at (4,10), bumped from (4,11) — drive-castle's
  // proven coordinates; three dialogs, then "take the chalk"
  await ev(() => { const s = MM.engine.state; s.px = 4; s.py = 11; });
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#modalBox h2', { timeout: 20000 });
  check(/mortar really is arithmetic/.test(await page.textContent('#modalBox')), 'the reveal names the pattern');
  for (let i = 0; i < 2; i++) { await page.click('#dlgOk'); await page.waitForSelector('#modalBox h2'); }
  await page.click('#modalBox .btnrow button.primary'); // take the chalk
  // the inverted exam: five slates
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('#modalBox .choice', { timeout: 30000 });
    const idx = await page.evaluate(() => MM.ui.current.answer);
    await page.click(`#modalBox .choice >> nth=${idx}`);
    await page.waitForSelector('#modalBox .btnrow button.primary');
    await page.click('#modalBox .btnrow button.primary');
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('#modalBox h2', { timeout: 20000 });
  check(/new MathMaker/.test(await page.textContent('#modalBox')), 'coronation: the new MathMaker is named');
  check(await ev(() => MM.engine.state.endingDone === true), 'endingDone is set');
  await page.click('#dlgOk');
  // the cutscene: skip beats, answer the spiral with the RIGHT answer
  await page.waitForFunction(() => MM.ui.cinematic(), null, { timeout: 30000 });
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(150); }
  await page.waitForSelector('#modalBox #answerInput', { timeout: 60000 });
  await page.fill('#modalBox #answerInput', '21');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await clearModals(8);
  check(true, 'the spiral answered 21 — the pattern discovered, the credits reached');

  const fin = await S();
  check(fin.tasksDone.length === 13 && fin.isles.lampLit && fin.isles.spireDone && fin.isles.hallsDone && fin.endingDone,
    `MARATHON COMPLETE: level ${fin.level}, ${fin.gold} gold, ${Object.values(fin.badges).filter(b => b === 3).length} gold badges — every flag earned, none granted`);

  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
