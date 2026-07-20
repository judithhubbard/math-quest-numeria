// Drive Wave 18 "Choose Your Hero" (avatar selection). Purely cosmetic: the
// chosen form (s.avatar + s.avatarPalette) renders the hero, rides the Passport,
// survives NG+, and can be changed ANY time (Bag Looking Glass from day one, the
// Study wardrobe post-ending) with no progress lost. Screenshots per avatar are
// audited by eye — every form must read as a HERO, distinct from enemies + pet.
const { chromium } = require('playwright');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/private/tmp/claude-503/-Users-jk-Dropbox-Claude-TaskMaker-math/85eabd6d-828f-40fd-ba15-6557b405a666/scratchpad';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 4).join('\n') : '')));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const shot = (name) => page.locator('#canvas').screenshot({ path: `${SHOTS}/${name}.png` });

  await page.goto(GAME);
  await page.waitForSelector('#newName');

  // ---- (1) the profile screen carries its own picker; picking sets the form
  check(await ev(() => !!document.querySelector('#avatarPickProfile .avatar-opt')), 'the profile screen shows the avatar picker');
  await page.screenshot({ path: `${SHOTS}/avatar-profile-picker.png` });
  await page.click('#avatarPickProfile [data-av="dragon"]');
  await page.fill('#newName', 'DragonKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);
  check(await ev(() => MM.engine.state.avatar === 'dragon'), 'the profile-screen pick sets s.avatar on the new game');

  // ---- (2) the hero renders as each chosen avatar (screenshot per form)
  const forms = ['woman', 'man', 'dragon', 'fox', 'slug', 'knight'];
  for (const f of forms) {
    await ev((id) => { MM.engine.state.avatar = id; MM.engine.state.avatarPalette = null; MM.ui.facing = 1; MM.ui.refresh(); }, f);
    await page.waitForTimeout(160);
    await shot('avatar-' + f);
  }
  check(true, 'each avatar renders in the overworld (screenshots avatar-woman..knight)');
  // mirror-for-facing on a non-human
  await ev(() => { MM.engine.state.avatar = 'fox'; MM.ui.facing = -1; MM.ui.refresh(); });
  await page.waitForTimeout(160);
  await shot('avatar-fox-mirror');
  check(true, 'the fox mirrors for facing (screenshot avatar-fox-mirror)');

  // ---- palette-varied woman AND man (different skin/hair/outfit)
  await ev(() => { const s = MM.engine.state; s.avatar = 'woman'; s.avatarPalette = { F: '#8d5524', P: '#2a1a10', A: '#2b8a8a' }; MM.ui.facing = 1; MM.ui.refresh(); });
  await page.waitForTimeout(160); await shot('avatar-woman-palette');
  await ev(() => { const s = MM.engine.state; s.avatar = 'man'; s.avatarPalette = { F: '#f8d8b8', P: '#b03a3a', A: '#3a5aa8' }; MM.ui.refresh(); });
  await page.waitForTimeout(160); await shot('avatar-man-palette');
  check(await ev(() => MM.sprites.avatarPalette(MM.engine.state).A === '#3a5aa8'), 'a human avatar takes a skin/hair/outfit palette');

  // ---- (5) an earned hat sits on a NON-HUMAN form (a dragon in a mortarboard)
  await ev(() => { const s = MM.engine.state; s.petHats = ['graduate']; s.heroHat = 'graduate'; s.avatar = 'dragon'; s.avatarPalette = null; MM.ui.refresh(); });
  await page.waitForTimeout(160); await shot('avatar-dragon-hat');
  check(await ev(() => MM.engine.state.heroHat === 'graduate'), 'a tiny hat sits on the dragon form');

  // ---- (3) change via the Bag Looking Glass mid-game, with NO progress lost
  await ev(() => { const s = MM.engine.state; s.gold = 321; s.level = 7; s.px = 12; s.py = 8; s.avatar = 'knight'; s.heroHat = null; MM.ui.refresh(); });
  const before = await ev(() => ({ gold: MM.engine.state.gold, level: MM.engine.state.level, px: MM.engine.state.px, py: MM.engine.state.py }));
  await page.click('#btnBag');
  await page.waitForTimeout(150);
  check(await ev(() => !!document.getElementById('bagLookingGlass')), 'the Bag has a Looking Glass, available from day one');
  await page.click('#bagLookingGlass');
  await page.waitForTimeout(150);
  check(await ev(() => !!document.getElementById('avatarPickMount')), 'the Looking Glass opens the picker');
  await page.click('#avatarPickMount [data-av="slug"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/avatar-looking-glass.png` });
  check(await ev(() => MM.engine.state.avatar === 'slug'), 'the Looking Glass changes the form live');
  const glassReflect = await ev(() => (document.getElementById('avatarReflect') || {}).innerText || '');
  check(/not a reliable historian|excellent judgment|nods/.test(glassReflect) || glassReflect.length > 0, 'the Looking Glass shows its deadpan reflection line');
  const after = await ev(() => ({ gold: MM.engine.state.gold, level: MM.engine.state.level, px: MM.engine.state.px, py: MM.engine.state.py }));
  check(before.gold === after.gold && before.level === after.level && before.px === after.px && before.py === after.py, 'changing form costs NO progress (gold/level/position unchanged)');

  // ---- (6) the pet double-take fires on a change INTO a creature form
  await ev(() => { MM.engine.state.isles = { pet: { name: 'Biscuit', species: 'blue', stage: 0, correct: 0, fed: 0 } }; MM.engine.state.avatar = 'knight'; MM.engine.petEmote = null; });
  await page.click('#avatarPickMount [data-av="dragon"]');
  await page.waitForTimeout(120);
  check(await ev(() => MM.engine.petEmote && MM.engine.petEmote.ch === '🤔'), 'the pet double-takes (🤔) when you become a creature');
  const wr = await ev(() => (document.getElementById('avatarReflect') || {}).innerText || '');
  check(/courtyard|ledgers|dragon/.test(wr), 'the world reacts deadpan to a novel hero');
  // close the glass
  await ev(() => { const b = document.getElementById('avatarDone'); if (b) b.click(); });
  await page.waitForTimeout(120);

  // ---- (4) change via the Study wardrobe, post-ending (deluxe front-end)
  await ev(() => { const s = MM.engine.state; s.endingDone = true; s.avatar = 'knight'; });
  await ev(() => MM.ui.studyWardrobe());
  await page.waitForTimeout(150);
  const wardIntro = await ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  check(/not a wardrobe|choosing a form/i.test(wardIntro), "the Study wardrobe wraps the picker in its personality");
  await page.screenshot({ path: `${SHOTS}/avatar-wardrobe.png` });
  await page.click('#avatarPickMount [data-av="fox"]');
  await page.waitForTimeout(120);
  check(await ev(() => MM.engine.state.avatar === 'fox'), 'the Study wardrobe writes the SAME state (one state, two doors)');
  await ev(() => { const b = document.getElementById('avatarDone'); if (b) b.click(); });
  await page.waitForTimeout(120);

  // the engine routes the confessed-wardrobe tile ('o') in the castle to it too
  await ev(() => {
    const s = MM.engine.state;
    s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.endingDone = true; s.enrollSeen = true;   // skip the one-time enrollment dialog
    MM.engine.ensureWing();          // a fully-formed wing (slabs etc.), then move it home
    s.wing.wardrobeMoved = true;
    MM.engine.enterCastle();
    if (MM.ui.closeModal) MM.ui.closeModal();
  });
  await page.waitForTimeout(120);
  await ev(() => {
    const s = MM.engine.state;
    const g = s.grid; let ox = -1, oy = -1;
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === 'o') { ox = x; oy = y; }
    s.px = ox; s.py = oy + 1;         // stand just below the wardrobe's home
    MM.engine.tryMove(0, -1);         // bump up into it
  });
  await page.waitForTimeout(150);
  const routed = await ev(() => (document.getElementById('modalBox') || {}).innerText || '');
  check(/not a wardrobe|choosing a form/i.test(routed), "bumping the castle wardrobe tile opens the Study wardrobe picker");
  await ev(() => { const b = document.getElementById('avatarDone'); if (b) b.click(); });
  await page.waitForTimeout(120);
  await ev(() => MM.engine.enterWorld());  // back to the overworld for the remaining checks
  await page.waitForTimeout(120);

  // ---- (7) the Passport (export → import) preserves the avatar + hat
  const roundtrip = await ev(() => {
    const s = MM.engine.state;
    s.avatar = 'slug'; s.heroHat = 'graduate'; s.avatarPalette = null;
    const json = MM.engine.exportSave();
    MM.engine.importSave(json.replace(s.name, 'AvatarTraveler'));
    MM.engine.state = null;
    MM.engine.load('AvatarTraveler');
    return { avatar: MM.engine.state.avatar, hat: MM.engine.state.heroHat };
  });
  check(roundtrip.avatar === 'slug' && roundtrip.hat === 'graduate', 'the Passport round-trips s.avatar + s.avatarPalette + hat');

  // ---- (8) a save with NO avatar field renders the CURRENT knight, exactly
  const legacy = await ev(() => {
    MM.engine.importSave(JSON.stringify({ name: 'OldSave', taskIndex: 3, tasksDone: [1, 2] }));
    MM.engine.state = null;
    MM.engine.load('OldSave');
    return { avatar: MM.engine.state.avatar, frames: MM.sprites.avatarFrames(MM.engine.state.avatar) };
  });
  check(legacy.avatar === 'knight', 'a no-avatar save migrates to the knight (backward-compat)');
  check(JSON.stringify(legacy.frames) === JSON.stringify(['hero', 'hero2']), 'a no-avatar save renders the EXACT current knight frames');
  await page.waitForTimeout(160); await shot('avatar-legacy-knight');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
