// Pass D (ergonomics): tap/click-to-move touch support, spell number keys,
// and the all-sound-off toggle. The tap rule under test: taps only ever
// synthesize tryMove() steps, so a tapped route behaves exactly like walking
// it — and the walk stops the moment anything unexpected happens.
const { chromium } = require('playwright');
const path = require('path');

const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-touch');

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

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'TouchKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);

  // ---------- tap-to-move on the overworld ----------
  const startPos = await ev(() => ({ x: MM.engine.state.px, y: MM.engine.state.py }));
  // tap a plain floor tile a few steps away (due east, on grass)
  const target = await ev(() => {
    const s = MM.engine.state;
    for (let d = 4; d >= 2; d--) {
      if ((s.grid[s.py] || [])[s.px + d] === '.') {
        // make sure the straight-line route is plain too, so the test is fair
        let clear = true;
        for (let i = 1; i <= d; i++) if (s.grid[s.py][s.px + i] !== '.') clear = false;
        if (clear) return { x: s.px + d, y: s.py };
      }
    }
    return null;
  });
  check(!!target, 'found a plain tile east of the spawn to tap');
  await ev(t => MM.ui.tapTo(t.x, t.y), target);
  await page.waitForTimeout(1200);
  const arrived = await ev(() => ({ x: MM.engine.state.px, y: MM.engine.state.py }));
  check(arrived.x === target.x && arrived.y === target.y,
    `tap-to-move walks there (${startPos.x},${startPos.y} -> ${arrived.x},${arrived.y})`);

  // a REAL canvas click (through coordinates + camera), not just the API
  const clicked = await ev(() => {
    const s = MM.engine.state;
    const cam = MM.ui._cam || { x: 0, y: 0 };
    // one tile west of where we stand now
    return { sx: (s.px - 1 - cam.x) * 48 + 24, sy: (s.py - cam.y) * 48 + 24, expectX: s.px - 1, expectY: s.py };
  });
  await page.click('#canvas', { position: { x: clicked.sx, y: clicked.sy } });
  await page.waitForTimeout(600);
  const afterClick = await ev(() => MM.engine.state.px);
  check(afterClick === clicked.expectX, 'a real canvas click walks one tile west');

  // tapping an NPC: pathfind adjacent, then bump = the dialog opens
  const npc = await ev(() => {
    const s = MM.engine.state;
    let best = null;
    for (let y = 0; y < s.grid.length; y++) for (let x = 0; x < s.grid[0].length; x++) {
      if ('aeghjq'.includes(s.grid[y][x])) {
        const d = Math.abs(x - s.px) + Math.abs(y - s.py);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    return best;
  });
  check(!!npc, 'found an NPC on the overworld');
  await ev(t => MM.ui.tapTo(t.x, t.y), npc);
  await page.waitForFunction(() => MM.ui.modalOpen(), null, { timeout: 8000 });
  check(true, 'tapping an NPC walks over and bumps — the dialog opens');
  const dist = await ev(t => Math.abs(MM.engine.state.px - t.x) + Math.abs(MM.engine.state.py - t.y), npc);
  check(dist === 1, 'the walk stopped exactly adjacent (the bump did the talking)');
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });
  await page.waitForTimeout(150);

  // taps are ignored while a modal is open (no walking under dialogs)
  await ev(() => MM.ui.helpDialog());
  const posBefore = await ev(() => ({ x: MM.engine.state.px, y: MM.engine.state.py }));
  await ev(p => MM.ui.tapTo(p.x - 2, p.y), posBefore);
  await page.waitForTimeout(500);
  const posAfter = await ev(() => ({ x: MM.engine.state.px, y: MM.engine.state.py }));
  check(posAfter.x === posBefore.x && posAfter.y === posBefore.y, 'taps are ignored while a modal is open');
  await page.click('#dlgOk');

  // ---------- tap-to-move in a dungeon: monsters block paths, bumps fight ----------
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 2; s.tasksDone = [1]; s.seenBattleHelp = true; s.seenCeremony = true;
    s.level = 5; s.maxhp = 60; s.hp = 60;
    MM.engine.enterDungeon(1);
  });
  const mon = await ev(() => {
    const s = MM.engine.state;
    // pick a monster with two plain tiles in a straight line beside it and
    // stand there — the test is the tap-walk-bump, not door-solving (a
    // monster behind a locked door is CORRECTLY unreachable by tap)
    for (const m of s.monsters.filter(m => !m.boss && m.hp > 0)) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = (s.grid[m.y + dy] || [])[m.x + dx];
        const b = (s.grid[m.y + 2 * dy] || [])[m.x + 2 * dx];
        const blocked = (p, q) => s.monsters.some(o => o !== m && o.hp > 0 && o.x === p && o.y === q);
        if (a === '.' && b === '.' && !blocked(m.x + dx, m.y + dy) && !blocked(m.x + 2 * dx, m.y + 2 * dy)) {
          m.stun = 999; // park it: a live wanderer strolls off mid-walk
          s.px = m.x + 2 * dx; s.py = m.y + 2 * dy;
          return { x: m.x, y: m.y };
        }
      }
    }
    return null;
  });
  check(!!mon, 'found a monster with a clear two-tile approach (parked for a fair tap)');
  await ev(t => MM.ui.tapTo(t.x, t.y), mon);
  await page.waitForFunction(() => MM.battle.active() || MM.ui.modalOpen(), null, { timeout: 10000 })
    .then(() => check(true, 'tapping a monster walks over and the bump starts the battle'))
    .catch(() => check(false, 'tapping a monster should start a battle'));
  // flee to clean up (battle may still be building its first round)
  await page.waitForTimeout(800);
  if (await ev(() => MM.battle.active())) {
    await page.click('#fleeBtn').catch(() => {});
    await page.waitForFunction(() => !MM.battle.active(), null, { timeout: 8000 }).catch(() => {});
  }
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });

  // ---------- spell number keys ----------
  await ev(() => {
    const s = MM.engine.state;
    s.badges = { addsub_facts: 3, muldiv_facts: 3, multidigit_addsub: 3 }; // Scout unlocked
    MM.engine.checkSpellUnlocks();
    // flush the celebration so the keypress isn't swallowed by a modal
  });
  await page.waitForTimeout(300);
  await ev(() => { while (MM.ui.modalOpen()) document.querySelector('#modalBox .btnrow button')?.click(); });
  await page.waitForTimeout(200);
  const logBefore = await ev(() => document.getElementById('log').innerText);
  await page.keyboard.press('1');
  await page.waitForTimeout(400);
  const logAfter = await ev(() => document.getElementById('log').innerText);
  check(logAfter !== logBefore && /Scout|scout|🔍/.test(logAfter.slice(logBefore.length - 20)),
    'pressing 1 casts Scout (the spell answered in the log)');
  const hint = await ev(() => document.querySelector('.keys-hint').innerText);
  check(/1\/2\/3/.test(hint), 'the quick-keys hint teaches 1/2/3');

  // ---------- the sound toggle ----------
  check(await ev(() => MM.engine.state.soundOff === false), 'sound starts ON for a fresh profile');
  await ev(() => MM.ui.parentPanel());
  await page.waitForSelector('#pinInput');
  await page.fill('#pinInput', '1234');
  await page.click('#pinOk');
  await page.waitForSelector('#soundOffCheck');
  await page.check('#soundOffCheck');
  await page.click('#parentDone');
  await page.waitForFunction(() => !MM.ui.modalOpen());
  check(await ev(() => MM.engine.state.soundOff === true), 'the parent-panel sound toggle persists to the save');
  await ev(() => { MM.engine.save(); MM.engine.load('TouchKid'); });
  check(await ev(() => MM.engine.state.soundOff === true), '...and survives a save/load round-trip');
  // no crash when sounds fire while muted
  const muteSafe = await ev(() => { try { MM.sound.correct(); MM.sound.fanfare(); MM.sound.hit(true); return true; } catch (e) { return false; } });
  check(muteSafe, 'every sound call is a safe no-op while muted');

  // ---------- background music: right MOOD for the moment, quiet-first ----------
  // v1.7.0 (real recordings): arrival is deliberately QUIET — a 30-60s gap
  // before the mood's first piece — so the drive asserts the mood picker,
  // not audible playback. And battles have NO pool at all: silent by design.
  await ev(() => { MM.music.poke(); MM.engine.state.soundOff = false; MM.engine.state.musicOff = false; MM.engine.enterWorld(); });
  await page.waitForTimeout(300);
  check(await ev(() => { const m = MM.music._state(); return m.mood === 'world' && m.playing === null; }),
    'the overworld sets the world mood — and arrival is quiet first (weather, not wallpaper)');
  await ev(() => MM.engine.enterDungeon(1));
  await page.waitForTimeout(300);
  check(await ev(() => MM.music._state().mood === 'dungeon'), 'a dungeon switches to the dungeon mood');
  // a battle starts NO music — and a rough patch says one kind thing
  await ev(() => {
    const s = MM.engine.state;
    for (const t of MM.data.TASKS.slice(0, 10)) {           // seed a rough patch in every
      for (let i = 0; i < 4; i++) MM.engine.recordAnswer(t.skill, false, { text: 'x', kidAnswer: 'y' }); // possible battle topic
    }
    const m = s.monsters.find(m => !m.boss && m.hp > 0);
    m.stun = 999;
    s.px = m.x; s.py = m.y + (s.grid[m.y + 1] && s.grid[m.y + 1][m.x] === '.' ? 1 : -1);
    MM.engine.startCombat(m);
  });
  await page.waitForFunction(() => MM.battle.active());
  await page.waitForTimeout(400);
  check(await ev(() => { const m = MM.music._state(); return m.mood === 'dungeon' && MM.music.currentTrack() === null; }),
    'a battle starts no music — battles are silent by design, the SFX own the fight');
  // answer WRONG once: the worked solution + one kind line appear
  await page.waitForSelector('#battleProblem #answerInput:not([disabled]), #battleProblem .choice:not([disabled])');
  if (await page.$('#battleProblem #answerInput:not([disabled])')) {
    await page.fill('#battleProblem #answerInput', '999999');
    await page.keyboard.press('Enter');
  } else {
    const right = await ev(() => MM.battle.current.answer);
    await page.click(`#battleProblem .choice >> nth=${right === 0 ? 1 : 0}`);
  }
  await page.waitForTimeout(600);
  const feedback = await ev(() => (document.getElementById('probFeedback') || {}).innerText || '');
  check(/Not quite/.test(feedback) && /=/.test(feedback), 'a miss shows the worked solution');
  check(/stubborn today|meet you where you are|every hero has them/.test(feedback),
    'after a rough patch, the miss feedback says one kind thing');
  check(/Parent Settings/.test(feedback),
    '...and points honestly at the parent topic switches (the real remedy)');
  await page.screenshot({ path: SHOTS + '/2-rough-patch-kindness.png' });
  // parent side: the struggling topic wears a ⚠ in the panel; healthy ones don't
  const struggle = await ev(() => {
    const s = MM.engine.state;
    const badSkill = MM.data.TASKS[0].skill; // seeded 4 misses above, add more for "sustained"
    for (let i = 0; i < 8; i++) MM.engine.recordAnswer(badSkill, false, { text: 'x', kidAnswer: 'y' });
    return {
      bad: MM.ui.isStrugglingTopic(s, badSkill),
      healthy: MM.ui.isStrugglingTopic(s, 'geometry'),
    };
  });
  check(struggle.bad && !struggle.healthy, 'the ⚠ marks a sustained-struggle topic and never a healthy one');
  await ev(() => { const f = document.getElementById('fleeBtn'); if (f) f.click(); });
  await page.waitForFunction(() => !MM.battle.active(), null, { timeout: 8000 }).catch(() => {});
  // musicOff: even a queued gentle moment (the strongest start there is —
  // it skips the quiet gap) may not play while the switch is off
  await ev(() => { MM.engine.state.musicOff = true; MM.music.moment('gentle'); });
  await page.waitForTimeout(300);
  check(await ev(() => MM.music.currentTrack() === null), 'musicOff holds even against a queued gentle moment (SFX untouched)');

  // ---------- big text + mid-dungeon resume narration ----------
  await ev(() => { const s = MM.engine.state; s.bigText = true; MM.engine.save(); });
  await page.reload();
  await page.waitForSelector('.profile-load');
  await page.click('.profile-load[data-name="TouchKid"]');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);
  check(await ev(() => document.body.classList.contains('big-text')), 'bigText persists and applies on load');
  const probSize = await ev(() => {
    MM.ui.helpDialog();
    const sz = getComputedStyle(document.querySelector('.dialog-body')).fontSize;
    document.getElementById('dlgOk').click();
    return parseFloat(sz);
  });
  check(probSize >= 17, `big-text actually enlarges reading text (dialog body ${probSize}px)`);
  // loading ALWAYS resumes on the overworld (dungeons rebuild per visit) —
  // a save made mid-dungeon must now SAY so instead of silently relocating
  await ev(() => { MM.engine.enterDungeon(1); MM.engine.save(); });
  await page.reload();
  await page.waitForSelector('.profile-load');
  await page.click('.profile-load[data-name="TouchKid"]');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(400);
  const resumeLog2 = await ev(() => document.getElementById('log').innerText);
  check(await ev(() => MM.engine.state.mapId === 'world'), 'a mid-dungeon save still resumes on the overworld (existing rule)');
  check(/made camp outside/.test(resumeLog2) && /Meadow Cave/.test(resumeLog2),
    'and the pull-out narrates itself ("made camp outside the Meadow Cave")');

  await page.screenshot({ path: SHOTS + '/1-final-state.png' });
  console.log('=== CHECKS ===');
  console.log(checks.join('\n'));
  console.log('=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || checks.some(c => c.startsWith('FAIL'))) process.exit(1);
})();
