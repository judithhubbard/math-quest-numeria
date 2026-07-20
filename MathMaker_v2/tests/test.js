// Smoke tests for MathMaker core (problems, mastery, maps)
const path = require('path');
const ROOT = require('path').join(__dirname, '..');
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/data.js'));
require(path.join(ROOT, 'js/mastery.js'));
require(path.join(ROOT, 'js/maps.js'));
require(path.join(ROOT, 'js/engine.js'));

const MM = globalThis.MM;
let fails = 0;
function fail(msg) { fails++; console.log('FAIL: ' + msg); }

// This suite runs headless (no DOM) — stub the browser-only bits any engine
// function might touch (sound effects, UI logging/refresh) so a call like
// MM.engine.resetSite doesn't crash just because there's no <audio> tag here.
MM.sound = { fanfare() {}, thud() {}, coin() {}, correct() {}, wrong() {}, levelup() {}, tone() {}, whoosh() {}, dodge() {}, splash() {}, sigh() {}, chirp() {}, creak() {}, toot() {}, soothe() {}, fret() {}, purr() {}, tada() {} };
MM.ui = { log() {}, refresh() {}, modalOpen: () => false, dialog() {}, dialogChoices() {}, showProblem() {}, playerMoved() {} };
MM.battle = MM.battle || { active: () => false, start() {} };   // Wave 12: tryMove is exercised headlessly now
MM.track = MM.track || function () {};   // tracker.js isn't loaded headlessly
{ // Node 25's built-in `localStorage` global is read-only-ish here; replace it outright
  const store = {};
  globalThis.localStorage = { setItem: (k, v) => { store[k] = v; }, getItem: k => store[k] || null };
}

// ---------- problems ----------
function canonical(p) {
  if (p.kind === 'choice') return p.answer;
  if (p.kind === 'remainder') return `${p.answer.q} r ${p.answer.r}`;
  if (p.kind === 'clock') return `${p.answer.h}:${String(p.answer.m).padStart(2, '0')}`;
  const f = p.answer;
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

const skills = Object.keys(MM.problems.GENERATORS);
for (const skill of skills) {
  for (let tier = 1; tier <= 3; tier++) {
    for (let i = 0; i < 400; i++) {
      let p;
      try { p = MM.problems.generate(skill, tier); }
      catch (e) { fail(`${skill} t${tier} generate threw: ${e.message}`); break; }
      if (!p.text || !p.solution) { fail(`${skill} t${tier} missing text/solution: ${JSON.stringify(p)}`); break; }
      if (p.kind === 'number') {
        if (!p.answer || typeof p.answer.n !== 'number' || !p.answer.d) { fail(`${skill} t${tier} bad answer: ${JSON.stringify(p)}`); break; }
        if (p.answer.n < 0) { fail(`${skill} t${tier} negative answer: ${p.text} -> ${JSON.stringify(p.answer)}`); break; }
        if (!Number.isInteger(p.answer.n) || !Number.isInteger(p.answer.d)) { fail(`${skill} t${tier} non-integer rational: ${p.text} ${JSON.stringify(p.answer)}`); break; }
      }
      if (!MM.problems.checkAnswer(p, canonical(p))) {
        fail(`${skill} t${tier} canonical answer rejected: "${p.text}" ans=${JSON.stringify(p.answer)} canon="${canonical(p)}"`);
        break;
      }
      if (p.kind !== 'choice' && MM.problems.checkAnswer(p, '999999883')) {
        fail(`${skill} t${tier} wrong answer accepted: ${p.text}`);
        break;
      }
    }
  }
}

// parser edge cases
const pa = MM.problems.parseAnswer;
const cases = [
  ['3.50', { n: 7, d: 2 }], ['$3.50', { n: 7, d: 2 }], ['1 3/4', { n: 7, d: 4 }],
  ['6/8', { n: 3, d: 4 }], ['1,204', { n: 1204, d: 1 }], ['.5', { n: 1, d: 2 }],
];
for (const [s, want] of cases) {
  const got = pa(s);
  if (!got || got.kind !== 'num' || got.f.n !== want.n || got.f.d !== want.d) {
    fail(`parse "${s}" -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
const rem = pa('14 r 2');
if (!rem || rem.kind !== 'rem' || rem.q !== 14 || rem.r !== 2) fail('parse "14 r 2" broken');
if (pa('abc') !== null) fail('garbage should parse to null');
if (pa('3/0') !== null) fail('divide-by-zero fraction should be null');

// ---------- geometry SVGs (Wave 6): every diagram is real, and every
// dimension the question TEXT names actually appears drawn on it ----------
{
  let checked = 0;
  for (let tier = 1; tier <= 3; tier++) {
    for (let i = 0; i < 400; i++) {
      const p = MM.problems.generate('geometry', tier);
      if (!p.svg) continue; // word-problem variants have no diagram
      checked++;
      if (!p.svg.includes('<svg')) fail(`geometry t${tier} p.svg has no <svg: ${p.svg.slice(0, 40)}`);
      const nums = new Set((p.text.match(/\d+/g) || []).map(Number));
      for (const n of nums) {
        if (!p.svg.includes(`>${n}<`)) fail(`geometry t${tier} dimension ${n} from "${p.text}" not drawn in svg`);
      }
    }
  }
  if (checked === 0) fail('geometry: no SVG diagrams were generated across 1200 samples');
  for (let i = 0; i < 200; i++) {
    const p = MM.problems.generateQuick('geometry');
    if (!p.svg || !p.svg.includes('<svg')) fail(`geometry quick problem missing a valid svg: ${JSON.stringify(p)}`);
  }
}

// mastery quick check
const st = {};
for (let i = 0; i < 20; i++) MM.mastery.record(st, 'addsub_facts', true);
if (MM.mastery.tierFor(st, 'addsub_facts') !== 3) fail('mastery should reach tier 3 after 20 correct');
const st2 = {};
for (let i = 0; i < 20; i++) MM.mastery.record(st2, 'addsub_facts', i % 3 === 0);
if (MM.mastery.tierFor(st2, 'addsub_facts') !== 1) fail('mastery should drop to tier 1 when struggling');
for (let i = 0; i < 50; i++) {
  const p = MM.mastery.pickCombatProblem(st, 5);
  if (!p.text) fail('pickCombatProblem broken');
}
const revs = MM.mastery.pickReviewProblems(st, 4, 3);
if (revs.length !== 3) fail('pickReviewProblems count');

// ---------- topic badges ----------
{
  const b = {};
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 0) fail('badge: fresh skill should be tier 0');
  for (let i = 0; i < 9; i++) MM.mastery.record(b, 'addsub_facts', true);
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 0) fail('badge: 9 correct is not yet bronze');
  MM.mastery.record(b, 'addsub_facts', true);
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 1) fail('badge: 10 correct = bronze');
  for (let i = 0; i < 15; i++) MM.mastery.record(b, 'addsub_facts', true);
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 2) fail('badge: 25 correct + hot recent = silver');
  for (let i = 0; i < 24; i++) MM.mastery.record(b, 'addsub_facts', true);
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 2) fail('badge: 49 correct is not yet gold');
  MM.mastery.record(b, 'addsub_facts', true);
  if (MM.mastery.badgeTier(b, 'addsub_facts') !== 3) fail('badge: 50 correct + hot recent = gold');
  // a cold recent window blocks silver/gold eligibility but never bronze
  const b2 = {};
  for (let i = 0; i < 30; i++) MM.mastery.record(b2, 'muldiv_facts', true);
  for (let i = 0; i < 5; i++) MM.mastery.record(b2, 'muldiv_facts', false);
  if (MM.mastery.badgeTier(b2, 'muldiv_facts') !== 1) fail('badge: cold recent window should cap eligibility at bronze');
}

// ---------- parent-portal completeness ----------
// EVERY question type in the game must have a parent-panel switch and a
// display name. If you add a generator and this fails, add the skill to
// MM.data.PARENT_TOPICS (js/data.js) — parents must always see the full
// curriculum, and mastery.cappedSkills/ui.parentSettings both read that list.
{
  const parentTopics = MM.data.PARENT_TOPICS;
  for (const skill of Object.keys(MM.problems.GENERATORS)) {
    if (!MM.data.SKILL_NAMES[skill]) fail(`skill '${skill}' has no SKILL_NAMES display name`);
    if (!parentTopics.includes(skill)) fail(`skill '${skill}' has no parent-panel switch`);
  }
  for (const skill of Object.keys(MM.problems.QUICK)) {
    if (!parentTopics.includes(skill)) fail(`quick skill '${skill}' has no parent-panel switch`);
  }
  // every mainland-dungeon skill must ALSO be in the registry (the reverse
  // direction — PARENT_TOPICS must be a superset of the TASKS skills)
  for (const t of MM.data.TASKS.filter(t => !t.exp)) {
    if (!parentTopics.includes(t.skill)) fail(`TASKS skill '${t.skill}' is missing from MM.data.PARENT_TOPICS`);
  }
}

// ---------- parent switch: disabling a topic must leak nowhere ----------
// Flipping time_reading off must remove it from every pool that draws from
// cappedSkills — arena battles, mixed gates, AND capSkill's own redirect —
// not just the parent-panel checkbox list itself. music_reading is default
// OFF (Wave 4) — same fixture doubles as its cap-leak check.
{
  const capSt = { parent: { topics: { time_reading: false, music_reading: false, geometry: false } } };
  const allowed = MM.mastery.cappedSkills(capSt);
  if (allowed.includes('time_reading')) fail('cap-leak: cappedSkills still includes a disabled topic');
  if (allowed.includes('music_reading')) fail('cap-leak: cappedSkills still includes music_reading when off');
  if (allowed.includes('geometry')) fail('cap-leak: cappedSkills still includes geometry when off');
  if (MM.mastery.capSkill(capSt, 'time_reading') === 'time_reading') {
    fail('cap-leak: capSkill let a disabled topic straight through');
  }
  if (MM.mastery.capSkill(capSt, 'music_reading') === 'music_reading') {
    fail('cap-leak: capSkill let music_reading straight through when off');
  }
  if (MM.mastery.capSkill(capSt, 'geometry') === 'geometry') {
    fail('cap-leak: capSkill let geometry straight through when off');
  }
  for (let i = 0; i < 500; i++) {
    const arena = MM.mastery.pickArenaProblem(capSt);
    if (arena.skill === 'time_reading' || arena.kind === 'clock') fail('cap-leak: pickArenaProblem served a disabled topic');
    if (arena.skill === 'music_reading' || arena.kind === 'staff') fail('cap-leak: pickArenaProblem served music_reading when off');
    if (arena.skill === 'geometry') fail('cap-leak: pickArenaProblem served geometry when off');
    const gate = MM.mastery.pickMixedGate(capSt);
    if (gate.skill === 'time_reading' || gate.kind === 'clock') fail('cap-leak: pickMixedGate served a disabled topic');
    if (gate.skill === 'music_reading' || gate.kind === 'staff') fail('cap-leak: pickMixedGate served music_reading when off');
    if (gate.skill === 'geometry') fail('cap-leak: pickMixedGate served geometry when off');
    // the Clockwork Spire's own 50/50 picker must fall back to 100% review
    // when the parent has switched time_reading off — "everywhere" means
    // even the dungeon whose entire premise is clock reading. The Sunken
    // Breakwater's own 50/50 picker (Wave 6, geometry) shares the exact
    // same generalized logic (pickHalfMix*) and must behave identically.
    const spireQuick = MM.mastery.pickSpireProblem(capSt);
    if (spireQuick.skill === 'time_reading' || spireQuick.kind === 'clock') fail('cap-leak: pickSpireProblem served a disabled topic');
    const spireGate = MM.mastery.pickSpireGate(capSt);
    if (spireGate.skill === 'time_reading' || spireGate.kind === 'clock') fail('cap-leak: pickSpireGate served a disabled topic');
    const breakwaterQuick = MM.mastery.pickBreakwaterProblem(capSt);
    if (breakwaterQuick.skill === 'geometry') fail('cap-leak: pickBreakwaterProblem served geometry when off');
    const breakwaterGate = MM.mastery.pickBreakwaterGate(capSt);
    if (breakwaterGate.skill === 'geometry') fail('cap-leak: pickBreakwaterGate served geometry when off');
  }
  // and the reverse (REVISED 2026-07-11, user decision): a fresh profile
  // has EVERY topic enabled — missing from parent.topics means ON, and
  // only an explicit parent choice writes false. A fresh state must be
  // able to serve every registered topic, music included.
  const freshSt = { parent: { pin: null, topics: {} } };
  const freshEnabled = MM.mastery.cappedSkills(freshSt);
  for (const skill of MM.data.PARENT_TOPICS) {
    if (!freshEnabled.includes(skill)) fail(`default-ON: fresh profile is missing '${skill}' — nothing may seed or force a topic off`);
  }
  let sawMusic = false;
  for (let i = 0; i < 800 && !sawMusic; i++) {
    const p = MM.mastery.pickArenaProblem(freshSt);
    if (p.skill === 'music_reading') sawMusic = true;
  }
  if (!sawMusic) fail('default-ON: music_reading never appeared for a fresh profile in 800 draws');
}

// ---------- Wave 5: fractions_m coverage gaps (conversion, unlike-denom
// mixed add/sub, regrouping subtraction) ---------- all six tier-3 styles
// must actually turn up, and each must produce a mathematically sound,
// correctly-labeled problem (spot-checked by shape, not just round-trip).
{
  const tags = new Set();
  for (let i = 0; i < 8000 && tags.size < 7; i++) {
    const p = MM.problems.generate('fractions_m', 3);
    if (/as a mixed number|as an improper fraction/.test(p.text)) tags.add('conversion');
    else if (/borrow/.test(p.solution)) tags.add('regroup-sub');
    else if (/÷/.test(p.text)) tags.add('divide');
    else if (/marbles/.test(p.text)) tags.add('word');
    else if (p.text.includes('−') && /Common denominator/.test(p.solution)) tags.add('unlike-sub');
    else if (p.text.includes('+') && /Common denominator/.test(p.solution)) tags.add('unlike-add');
    else tags.add('same-denom');
  }
  ['conversion', 'regroup-sub', 'divide', 'word', 'unlike-sub', 'unlike-add', 'same-denom'].forEach(tag => {
    if (!tags.has(tag)) fail(`fractions_m t3: never saw a "${tag}" problem in 3000 draws`);
  });
  // the regrouping-subtraction worked solution must show the borrow line —
  // not just assert a tag matched, actually read the math back out
  let sawRegroup = false;
  for (let i = 0; i < 500; i++) {
    const p = MM.problems.generate('fractions_m', 3);
    if (!/borrow/.test(p.solution)) continue;
    sawRegroup = true;
    if (!/is smaller than/.test(p.solution)) fail(`regroup-sub: solution doesn't explain WHY a borrow is needed: "${p.solution}"`);
    if (p.answer.n < 0) fail(`regroup-sub: negative answer "${p.text}" -> ${JSON.stringify(p.answer)}`);
  }
  if (!sawRegroup) fail('fractions_m t3: regrouping-subtraction style never appeared in 500 draws');
  // QUICK.fractions_m must stay simple — regrouping subtraction belongs at
  // full-depth gates only, never in battle pacing
  for (let i = 0; i < 300; i++) {
    const q = MM.problems.QUICK.fractions_m();
    if (/borrow/.test(q.solution)) fail('QUICK.fractions_m leaked a regrouping-subtraction problem — too slow for combat pacing');
  }
}

// ---------- bestiary data ----------
{
  const cards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD, MM.data.MIMIC_CARD]);
  const names = new Set();
  for (const c of cards) {
    if (!c.desc) fail(`bestiary: "${c.name}" has no desc`);
    if (!c.sprite) fail(`bestiary: "${c.name}" has no sprite`);
    if (names.has(c.name)) fail(`bestiary: duplicate monster name "${c.name}" (cards are keyed by name)`);
    names.add(c.name);
  }
  if (cards.length !== 80) fail(`bestiary: expected 80 cards, found ${cards.length}`);
}

// ---------- Wave 2: enchant gems + the amulet slot ----------
{
  for (const g of MM.data.GEMS) {
    if (!g.id || !g.name || !g.emoji || !g.prefix || !g.desc) fail(`gem "${g.id}" is missing a required field`);
  }
  const gemIds = new Set(MM.data.GEMS.map(g => g.id));
  if (gemIds.size !== MM.data.GEMS.length) fail('duplicate gem ids in MM.data.GEMS');

  for (const a of MM.data.AMULETS) {
    if (!a.id || !a.name || !a.emoji || !a.bonus || !a.price) fail(`amulet "${a.id}" is missing a required field`);
  }
  if (MM.data.GEAR.amulet !== MM.data.AMULETS) fail('MM.data.GEAR.amulet is not wired to MM.data.AMULETS');
  if (!MM.data.SLOT_NAMES.amulet) fail('MM.data.SLOT_NAMES is missing amulet');
  if (MM.data.gearStat('amulet', MM.data.AMULETS[0]) !== MM.data.AMULETS[0].bonus) fail('gearStat(amulet) should show its bonus text');

  // gearLabel: plain when unenchanted, gem-prefixed once fused (temporarily
  // swaps in a fake MM.engine.state — restore the real one after, since
  // js/engine.js is now loaded in this suite too and later checks need it)
  const plain = MM.data.gearLabel('weapon', 'stick');
  if (!plain.includes('Wooden Stick') || /Flaming/.test(plain)) fail(`gearLabel (unenchanted): "${plain}"`);
  const savedEngine = globalThis.MM.engine;
  globalThis.MM.engine = { state: { enchants: { 'weapon:stick': 'flame' } } };
  const enchanted = MM.data.gearLabel('weapon', 'stick');
  if (!/Flaming/.test(enchanted)) fail(`gearLabel (enchanted): "${enchanted}"`);
  globalThis.MM.engine = savedEngine;

  // Emberlyn's map letter and NPCS entry must agree
  if (!MM.data.NPCS.f || !MM.data.NPCS.f.enchant) fail('NPCS.f should be Emberlyn (enchant:true)');
}

// ---------- maps ----------
const ow = MM.maps.parse(MM.maps.OVERWORLD, '~');
console.log(`overworld: ${ow[0].length}x${ow.length}`);
MM.maps.OVERWORLD.forEach((r, i) => { if (r.length !== 52) fail(`overworld row ${i} length ${r.length}`); });
for (const ch of ['C', 'S', 'I', 'P', 'n', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'e', 'g', 'h', 'j', 'q']) {
  const found = MM.maps.find(ow, ch);
  if (found.length !== 1) fail(`overworld has ${found.length} of '${ch}', want 1`);
}
// overworld: P must be able to reach C,S,I and all dungeon digits (walk on . and interactables)
{
  const walkable = ch => ch === '.' || ch === 'P';
  const interact = 'CSIn1234567890aeghjqY'; // Y = the Practice Yard's Tutor
  const start = MM.maps.find(ow, 'P')[0];
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  const reached = new Set();
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= ow.length || nx < 0 || nx >= ow[0].length) continue;
      const ch = ow[ny][nx];
      const k = nx + ',' + ny;
      if (seen.has(k)) continue;
      if (interact.includes(ch)) { reached.add(ch); seen.add(k); continue; }
      if (!walkable(ch)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  for (const ch of interact + '') {
    if (!reached.has(ch)) fail(`overworld: '${ch}' not reachable from P`);
  }
}

// 'Y' is shared: the Practice Yard's Tutor on an overworld, the Cavern of
// Echoes' echo door in a dungeon. A switch-order regression (the Tutor case
// shadowing the echo-door case) would render echo doors as the Tutor.
{
  if (MM.maps.tileSprite('Y', 0, 0, 'world', false) !== 'tutor') fail("'Y' on an overworld must render as the Tutor");
  if (MM.maps.tileSprite('Y', 0, 0, 'isles', false) !== 'tutor') fail("'Y' on the isles must render as the Tutor");
  if (MM.maps.tileSprite('Y', 0, 0, 'cavern', false) !== 'echoDoor') fail("'Y' in a dungeon must render as an echo door, not the Tutor");
}

MM.maps.DUNGEONS.forEach((raw, di) => {
  raw.forEach((r, i) => { if (r.length !== 26) fail(`dungeon ${di + 1} row ${i} length ${r.length}`); });
  if (raw.length !== 16) fail(`dungeon ${di + 1} has ${raw.length} rows`);
  const g = MM.maps.parse(raw, '#');
  const X = MM.maps.find(g, 'X'), b = MM.maps.find(g, 'b');
  const chests = MM.maps.find(g, '*'), mons = MM.maps.find(g, 'm'), doors = MM.maps.find(g, 'D');
  if (X.length !== 1) fail(`dungeon ${di + 1}: ${X.length} X`);
  if (b.length !== 1) fail(`dungeon ${di + 1}: ${b.length} b`);
  if (chests.length < 2) fail(`dungeon ${di + 1}: only ${chests.length} chests`);
  if (mons.length < 4) fail(`dungeon ${di + 1}: only ${mons.length} monsters`);
  if (doors.length < 1) fail(`dungeon ${di + 1}: no doors`);
  // BFS from X; doors/monsters/chests/boss passable for reachability purposes
  const seen = new Set();
  const q = [X[0]];
  seen.add(X[0].x + ',' + X[0].y);
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= g.length || nx < 0 || nx >= g[0].length) continue;
      if (g[ny][nx] === '#') continue;
      const k = nx + ',' + ny;
      if (!seen.has(k)) { seen.add(k); q.push({ x: nx, y: ny }); }
    }
  }
  const check = (list, label) => list.forEach(p => {
    if (!seen.has(p.x + ',' + p.y)) fail(`dungeon ${di + 1}: ${label} at ${p.x},${p.y} unreachable from X`);
  });
  check(b, 'boss'); check(chests, 'chest'); check(mons, 'monster'); check(doors, 'door');
  console.log(`dungeon ${di + 1}: ${mons.length} monsters, ${chests.length} chests, ${doors.length} doors — ok so far`);
});

// ---------- door audit (Wave 1.5 §1.5b; generalized Wave 6.5) ----------
// Every door-like tile must actually gate something. Flag a door if either:
//  (a) it has fewer than 2 open neighbors ('%' counts as open) — a true
//      dead end that opens onto nothing; or
//  (b) with the door itself blocked, its open neighbors are STILL mutually
//      reachable via some other route — under BOTH a sealed-% and an
//      open-% BFS — meaning it's decorative.
// Requiring BOTH % states deliberately spares door-then-secret chains and
// doors with a secret-wall bypass (those are only decorative once the
// secret is found, which is the intended design, not a bug).
//
// THE GLYPH REGISTRY (Wave 6.5): every glyph on any dungeon floor must be
// classified here or the suite FAILS — dungeons 19/20 shipped five broken
// doors because Z/Y/A/B/C were never taught to this audit and the floor
// list below was hardcoded. New glyph => classify it here first.
const DUNGEON_GLYPHS = {
  doors: 'DKZY',             // math, locked, clock (Z), echo (Y)
  solid: '#GABCUilr&',       // walls, lever-gates, gear gates, slabs,
                             // blueprint plaques, reset levers, broken
                             // floor (impassable until mended, Wave 6.5),
                             // plate-gates (& — Wave 12: shut whenever no
                             // plate is held, so the audit treats them shut).
                             // A/B/C stay SOLID here on purpose: the audit
                             // asks "does this door gate anything if it were
                             // shut", and any one gear gate can be shut. Their
                             // per-rotation reachability has its own test
                             // (the Spire block) — Wave 7 kept them in the
                             // live grid but did not change what they gate.
  open: '.mgtbk*%<>Xv^,_osRL+!? ', // floor, spawn markers, pickups, stairs,
                             // chutes, terrain effects, singing stones,
                             // gear plates (walk-on), one-shot levers
                             // (post-pull = open route), pressure plates
                             // (+, walk-on), cracked floor (!, Wave 12)
                             // and echo plates (?, walk-on — Wave 13)
};
function auditDoors(rawGrid, label) {
  const grid = MM.maps.parse(rawGrid, '#');
  const H = grid.length, W = grid[0].length;
  const known = DUNGEON_GLYPHS.doors + DUNGEON_GLYPHS.solid + DUNGEON_GLYPHS.open;
  for (const row of grid) for (const ch of row) {
    if (!known.includes(ch)) fail(`${label}: unclassified glyph '${ch}' — add it to DUNGEON_GLYPHS (tests/test.js) so the door audit understands it`);
  }
  const solid = new Set(('#' + DUNGEON_GLYPHS.doors + DUNGEON_GLYPHS.solid).split(''));
  const at = (g, x, y) => (y >= 0 && y < H && x >= 0 && x < W) ? g[y][x] : '#';
  const doors = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (DUNGEON_GLYPHS.doors.includes(grid[y][x])) doors.push({ x, y, ch: grid[y][x] });
  }
  for (const d of doors) {
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy }))
      .filter(p => !solid.has(at(grid, p.x, p.y)));
    if (neighbors.length < 2) {
      fail(`${label}: door '${d.ch}' at ${d.x},${d.y} is a dead end (${neighbors.length} open neighbor(s))`);
      continue;
    }
    const decorative = ['sealed', 'open'].every(mode => {
      const g2 = grid.map((row, y) => row.map((ch, x) => {
        if (x === d.x && y === d.y) return '#'; // simulate the door blocked/removed
        if (ch === '%') return mode === 'open' ? '.' : '#';
        return ch;
      }));
      const start = neighbors[0];
      const seen = new Set([start.x + ',' + start.y]);
      const q = [start];
      while (q.length) {
        const { x, y } = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          const ch = at(g2, nx, ny);
          const k = nx + ',' + ny;
          if (solid.has(ch) || seen.has(k)) continue;
          seen.add(k); q.push({ x: nx, y: ny });
        }
      }
      return neighbors.every(n => seen.has(n.x + ',' + n.y));
    });
    if (decorative) fail(`${label}: door '${d.ch}' at ${d.x},${d.y} is decorative (a bypass exists with it blocked, both % states)`);
  }
}
// EVERY dungeon, derived — never a hardcoded list again (Wave 6.5): the
// task table is the single source of truth for how many dungeons exist.
// The Spiral Stair (Wave 9) is exempt: its 'D' doors sit in open rooms, not
// corridor chokepoints (post-game practice stations, not lock-and-key
// gates), so the "does this door gate anything" check doesn't apply — it
// gets its own plain-reachability audit below instead.
for (let idx = 1; idx <= MM.data.TASKS.length; idx++) {
  if (idx === MM.maps.SPIRAL_INDEX) continue;
  MM.maps.dungeonFloors(idx).forEach((raw, fi) => auditDoors(raw, `dungeon ${idx} f${fi}`));
}

// ---------- Wave 5 item 1: Deep Wings (dungeons 4, 7, 9) ----------
{
  [4, 7, 9].forEach(idx => {
    const floors = MM.maps.dungeonFloors(idx);
    if (floors.length !== 2) fail(`dungeon ${idx}: expected a Deep Wing second floor, got ${floors.length}`);
    const deep = floors[1];
    deep.forEach((r, i) => { if (r.length !== 26) fail(`dungeon ${idx} deep wing row ${i} length ${r.length}`); });
    if (deep.length !== 16) fail(`dungeon ${idx} deep wing has ${deep.length} rows`);
    const g0 = MM.maps.parse(floors[0], '#');
    if (MM.maps.find(g0, 'K').length !== 1) fail(`dungeon ${idx} f0: expected exactly one Deep Wing lock`);
    if (MM.maps.find(g0, '>').length !== 1) fail(`dungeon ${idx} f0: expected exactly one Deep Wing stairs-down`);
    if (MM.maps.find(g0, 'k').length !== 1) fail(`dungeon ${idx} f0: expected exactly one Deep Wing key`);
    const g1 = MM.maps.parse(deep, '#');
    if (MM.maps.find(g1, '<').length !== 1) fail(`dungeon ${idx} deep wing: expected exactly one stairs-up`);
    if (MM.maps.find(g1, '*').length !== 1) fail(`dungeon ${idx} deep wing: expected exactly one chest`);
    if (MM.maps.find(g1, 'm').length < 2) fail(`dungeon ${idx} deep wing: expected at least 2 monsters`);
    // reachability: from X on floor 0 (with the key, K opens), '>' must be
    // reachable; from '<' on the deep wing floor, every POI must be reachable
    const reach = (grid, startCh, pois, label, openChars) => {
      const gg = grid.map(row => row.map(ch => (openChars || 'DKG%').includes(ch) ? '.' : ch));
      const start = MM.maps.find(grid, startCh)[0];
      const seen = new Set([start.x + ',' + start.y]);
      const q = [start];
      while (q.length) {
        const { x, y } = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          const ch = (gg[ny] || [])[nx];
          const k = nx + ',' + ny;
          if (ch == null || ch === '#' || seen.has(k)) continue;
          seen.add(k); q.push({ x: nx, y: ny });
        }
      }
      for (const ch of pois) for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    };
    reach(g0, 'X', ['k', 'K', '>'], `dungeon ${idx} f0`);
    reach(g1, '<', ['m', '*'], `dungeon ${idx} deep wing`);
  });

  // GUARANTEED_GEM_CHESTS coordinates must point at real chests (mirrors the
  // existing drive-enchant.js assert, checked here too so a map edit fails fast)
  Object.entries(MM.engine.GUARANTEED_GEM_CHESTS).forEach(([mapId, spots]) => {
    const m = mapId.match(/^d(\d+)(?:f(\d+))?$/);
    const grid = MM.maps.parse(MM.maps.dungeonFloors(+m[1])[+(m[2] || 0)], '#');
    spots.forEach(p => { if (grid[p.y][p.x] !== '*') fail(`${mapId}: guaranteed-gem coordinate ${p.x},${p.y} is not a chest`); });
  });

  // E.isDeepWingFloor: floor-scoped, not dungeon-scoped or task.mixed-scoped
  if (!MM.engine.isDeepWingFloor({ dungeonIndex: 4, floorIndex: 1 })) fail('isDeepWingFloor: dungeon 4 floor 1 should be a Deep Wing');
  if (MM.engine.isDeepWingFloor({ dungeonIndex: 4, floorIndex: 0 })) fail('isDeepWingFloor: dungeon 4 floor 0 is the ORIGINAL floor, not the Deep Wing');
  if (MM.engine.isDeepWingFloor({ dungeonIndex: 5, floorIndex: 1 })) fail('isDeepWingFloor: dungeon 5 has no Deep Wing');
}

// ---------- isle dungeons (Level 2, multi-floor) ----------
{
  const floors = MM.maps.dungeonFloors(14);
  if (!floors || floors.length !== 2) fail('tidepool: expected 2 floors');
  floors.forEach((raw, fi) => {
    raw.forEach((r, i) => { if (r.length !== 26) fail(`tidepool f${fi} row ${i} length ${r.length}`); });
  });
  const f0 = MM.maps.parse(floors[0], '#');
  const f1 = MM.maps.parse(floors[1], '#');
  const count = (g, ch) => MM.maps.find(g, ch).length;
  // floor 1 (entry): stairs down behind a locked door, key behind a guard,
  // secret alcove, pad pair, thief, slide
  if (count(f0, 'X') !== 1) fail('tidepool f0: need one exit');
  if (count(f0, '>') !== 1) fail('tidepool f0: need one stairs-down');
  if (count(f0, '<') !== 0) fail('tidepool f0: no stairs-up on entry floor');
  if (count(f0, 'K') !== 1 || count(f0, 'k') !== 1) fail('tidepool f0: need one lock + one key');
  if (count(f0, '%') !== 1) fail('tidepool f0: need a secret wall');
  if (count(f0, 'o') !== 2) fail('tidepool f0: teleport pads come in pairs');
  if (count(f0, 't') !== 1 || count(f0, 'g') !== 1 || count(f0, 'm') < 2) fail('tidepool f0: marker mix wrong');
  if (count(f0, 'b') !== 0) fail('tidepool f0: boss belongs on the lens floor');
  // floor 2 (lens chamber): boss, lever + gates + gated chest, pad pair
  if (count(f1, '<') !== 1 || count(f1, '>') !== 0) fail('tidepool f1: stairs wrong');
  if (count(f1, 'b') !== 1) fail('tidepool f1: need the boss');
  if (count(f1, 'L') !== 1 || count(f1, 'G') < 1) fail('tidepool f1: need lever + gates');
  if (count(f1, 'o') !== 2) fail('tidepool f1: teleport pads come in pairs');
  if (count(f1, 'X') !== 0) fail('tidepool f1: only floor 1 has the exit');
  // reachability per floor: everything except walls is passable (doors, gates,
  // and secrets open with play), pads jump to their twin
  const reachCheck = (grid, startCh, pois, label) => {
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      if (grid[y][x] === 'o') {
        for (const p of MM.maps.find(grid, 'o')) {
          if (!seen.has(p.x + ',' + p.y)) { seen.add(p.x + ',' + p.y); q.push(p); }
        }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
        const ch = grid[ny][nx];
        const k = nx + ',' + ny;
        if (ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable from ${startCh}`);
      }
    }
  };
  reachCheck(f0, 'X', ['>', 'K', 'k', '%', 'o', 't', 'g', 'm', '*', 'D', '_', ',', '^'], 'tidepool f0');
  reachCheck(f1, '<', ['b', 'L', 'G', '*', 'o', 'g', 'm', ','], 'tidepool f1');
  // roster 14 must supply the behaviors the markers ask for
  const roster = MM.data.MONSTERS[13];
  if (!roster.types.some(t => t.behavior === 'guard')) fail('tidepool roster: no guard type');
  if (!roster.types.some(t => t.behavior === 'thief')) fail('tidepool roster: no thief type');
  if (!roster.types.some(t => t.behavior === 'wander')) fail('tidepool roster: no wander type');
  if (!MM.data.THEMES[13]) fail('tidepool: no battle theme');
}

// ---------- Frostbite Hollow (dungeon 15): slide-aware reachability ----------
// Plain BFS overstates what an ice dungeon allows: you cannot STOP on slick
// rock, so a POI can be adjacent-reachable yet impossible to land beside.
// This sim moves exactly like the engine: step, then slide until a wall or a
// floor tile; openables count as opened; pads teleport.
{
  const floors = MM.maps.dungeonFloors(15);
  if (!floors || floors.length !== 2) fail('frostbite: expected 2 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 26) fail(`frostbite f${fi} row ${i} length ${r.length}`);
  }));
  const slideReach = (rawGrid, startCh, pois, label) => {
    const orig = MM.maps.parse(rawGrid, '#');
    const grid = orig.map(row => row.map(ch => 'DKG%Lk*'.includes(ch) ? '.' : ch));
    const H = grid.length, W = grid[0].length;
    const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W) ? grid[y][x] : '#';
    const start = MM.maps.find(orig, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    const visit = (x, y) => { const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); q.push({ x, y }); } };
    while (q.length) {
      const { x, y } = q.shift();
      if (at(x, y) === 'o') for (const p of MM.maps.find(grid, 'o')) visit(p.x, p.y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = x + dx, ny = y + dy;
        if (at(nx, ny) === '#') continue;
        let g = 0;
        while (at(nx, ny) === '_' && g++ < 40) {   // the slide, engine-exact
          const tx = nx + dx, ty = ny + dy;
          if (at(tx, ty) === '#') break;
          nx = tx; ny = ty;
        }
        visit(nx, ny);
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(orig, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable (slide-aware)`);
      }
    }
  };
  slideReach(floors[0], 'X', ['k', 'g', 'm', '>', 'K', '%', '*', ','], 'frostbite f0');
  slideReach(floors[1], '<', ['g', 'o', 'L', 'G', 'b', '*', 'm', ','], 'frostbite f1');
  const roster = MM.data.MONSTERS[14];
  if (!roster || !roster.types.some(t => t.behavior === 'guard')) fail('frostbite roster: no guard type');
  if (!MM.data.THEMES[14]) fail('frostbite: no battle theme');
  if (MM.maps.find(MM.maps.parse(floors[0], '#'), 'b').length !== 0) fail('frostbite f0: boss belongs on floor 2');
  if (MM.maps.find(MM.maps.parse(floors[1], '#'), 'b').length !== 1) fail('frostbite f1: need the boss');
}

// ---------- Cinderforge Depths (dungeon 16): 3 floors + drop chutes ----------
{
  const floors = MM.maps.dungeonFloors(16);
  if (!floors || floors.length !== 3) fail('cinderforge: expected 3 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 26) fail(`cinderforge f${fi} row ${i} length ${r.length}`);
  }));
  const grids = floors.map(f => MM.maps.parse(f, '#'));
  // simple pad-aware BFS (no ice down here); openables count as open
  const reach = (grid, startCh, pois, label) => {
    const g = grid.map(row => row.map(ch => 'DKG%Lk*'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      if (g[y][x] === 'o') for (const p of MM.maps.find(g, 'o')) {
        if (!seen.has(p.x + ',' + p.y)) { seen.add(p.x + ',' + p.y); q.push(p); }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (g[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  reach(grids[0], 'X', ['k', 'g', 'm', 't', '>', 'K', '%', '*', '^'], 'cinderforge f0');
  reach(grids[1], '<', ['k', 'g', 'm', 't', '>', 'K', 'G', 'L', 'v', '^'], 'cinderforge f1');
  reach(grids[2], '<', ['b', 'm', '*', '^'], 'cinderforge f2');
  // every drop chute must land on open floor one level down, same coordinates
  grids.forEach((g, fi) => {
    for (const c of MM.maps.find(g, 'v')) {
      const below = grids[fi + 1];
      if (!below) { fail(`cinderforge f${fi}: chute at ${c.x},${c.y} has no floor below`); continue; }
      if (!'.m'.includes(below[c.y][c.x])) fail(`cinderforge f${fi}: chute lands on '${below[c.y][c.x]}' at ${c.x},${c.y}`);
    }
  });
  if (MM.maps.find(grids[0], 'b').length + MM.maps.find(grids[1], 'b').length !== 0) fail('cinderforge: boss belongs on floor 3');
  if (MM.maps.find(grids[2], 'b').length !== 1) fail('cinderforge f2: need the boss');
  const roster = MM.data.MONSTERS[15];
  if (!roster || !roster.types.some(t => t.behavior === 'thief')) fail('cinderforge roster: no thief');
  if (!MM.data.THEMES[15]) fail('cinderforge: no battle theme');
}

// ---------- the Isles overworld ----------
{
  MM.maps.ISLES.forEach((r, i) => { if (r.length !== 40) fail(`isles row ${i} length ${r.length}`); });
  const raw = MM.maps.parse(MM.maps.ISLES, '~');
  for (const ch of ['W', 'P', 'c', 'p', 'S', 'I', 'n', 'f', '1', '2', '3', 'H', '%']) {
    if (MM.maps.find(raw, ch).length !== 1) fail(`isles: want exactly one '${ch}'`);
  }
  if (!MM.maps.find(raw, 'u').length) fail('isles: no Murk fog band');
  // the Vault's secret wall must sit next to a walkable tile, or it can never be bumped
  {
    const wall = MM.maps.find(raw, '%')[0];
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const ch = (raw[wall.y + dy] || [])[wall.x + dx];
      return ch === '.' || ch === 'P';
    });
    if (!adj) fail(`isles: '%' at ${wall.x},${wall.y} has no walkable neighbor to bump it from`);
  }
  // BFS from P, fog impassable; POIs are stop-tiles like on the west overworld
  const reach = (grid) => {
    const interact = 'WcpSInf123HY'; // Y = the Tutor's dockside Practice Yard
    const start = MM.maps.find(grid, 'P')[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    const got = new Set();
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
        const ch = grid[ny][nx];
        const k = nx + ',' + ny;
        if (seen.has(k)) continue;
        if (interact.includes(ch)) { got.add(ch); seen.add(k); continue; }
        if (ch !== '.' && ch !== 'P') continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    return got;
  };
  const foggy = reach(raw);
  for (const ch of ['W', 'c', 'p', 'S', 'I', 'n', 'f', '1', 'Y']) {
    if (!foggy.has(ch)) fail(`isles: '${ch}' should be reachable before any lens`);
  }
  for (const ch of ['2', '3', 'H']) {
    if (foggy.has(ch)) fail(`isles: '${ch}' should be fogged in before the Tide Lens`);
  }
  // tide lens lit: u clears; the north opens but the lighthouse stays sealed
  const cleared = raw.map(row => row.map(ch => ch === 'u' ? '.' : ch));
  const open = reach(cleared);
  for (const ch of ['2', '3']) {
    if (!open.has(ch)) fail(`isles: '${ch}' should open once the u-fog clears`);
  }
  if (open.has('H')) fail('isles: the lighthouse must stay behind v/w fog');
}

// ---------- Great Lighthouse (dungeon 17): 4 floors, one boss ----------
{
  const floors = MM.maps.dungeonFloors(17);
  if (!floors || floors.length !== 4) fail('lighthouse: expected 4 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 26) fail(`lighthouse f${fi} row ${i} length ${r.length}`);
  }));
  const grids = floors.map(f => MM.maps.parse(f, '#'));
  const count = (g, ch) => MM.maps.find(g, ch).length;
  // floor 1 (entry, slides): X, key+lock, slide lake
  if (count(grids[0], 'X') !== 1) fail('lighthouse f0: need one exit');
  if (count(grids[0], 'k') !== 1 || count(grids[0], 'K') !== 1) fail('lighthouse f0: need one key + one lock');
  if (count(grids[0], '_') < 20) fail('lighthouse f0: slide lake too small');
  if (count(grids[0], '%') !== 1) fail('lighthouse f0: need a secret alcove');
  // slide-aware reachability (copy of the frostbite harness)
  const slideReach = (rawGrid, startCh, pois, label) => {
    const orig = MM.maps.parse(rawGrid, '#');
    const grid = orig.map(row => row.map(ch => 'DKG%Lk*'.includes(ch) ? '.' : ch));
    const H = grid.length, W = grid[0].length;
    const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W) ? grid[y][x] : '#';
    const start = MM.maps.find(orig, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    const visit = (x, y) => { const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); q.push({ x, y }); } };
    while (q.length) {
      const { x, y } = q.shift();
      if (at(x, y) === 'o') for (const p of MM.maps.find(grid, 'o')) visit(p.x, p.y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = x + dx, ny = y + dy;
        if (at(nx, ny) === '#') continue;
        let g = 0;
        while (at(nx, ny) === '_' && g++ < 40) {
          const tx = nx + dx, ty = ny + dy;
          if (at(tx, ty) === '#') break;
          nx = tx; ny = ty;
        }
        visit(nx, ny);
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(orig, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable (slide-aware)`);
      }
    }
  };
  // pad/normal reachability (openables count as open)
  const reach = (grid, startCh, pois, label) => {
    const g = grid.map(row => row.map(ch => 'DKG%Lk*'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      if (g[y][x] === 'o') for (const p of MM.maps.find(g, 'o')) {
        if (!seen.has(p.x + ',' + p.y)) { seen.add(p.x + ',' + p.y); q.push(p); }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (g[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  slideReach(floors[0], 'X', ['k', 'g', 'm', '>', 'K', '%', '*'], 'lighthouse f0');
  // floor 2 (pads): two pad pairs, key+lock
  if (count(grids[1], '<') !== 1 || count(grids[1], '>') !== 1) fail('lighthouse f1: stairs wrong');
  if (count(grids[1], 'o') !== 4) fail('lighthouse f1: expected two teleport-pad pairs');
  if (count(grids[1], 'k') !== 1 || count(grids[1], 'K') !== 1) fail('lighthouse f1: need one key + one lock');
  reach(grids[1], '<', ['o', 'g', 'm', 'k', 'K', '>'], 'lighthouse f1');
  // floor 3 (keys + lever/chute shortcut)
  if (count(grids[2], '<') !== 1 || count(grids[2], '>') !== 1) fail('lighthouse f2: stairs wrong');
  if (count(grids[2], 'k') !== 2 || count(grids[2], 'K') !== 2) fail('lighthouse f2: need two keys + two locks');
  if (count(grids[2], 'L') !== 1 || count(grids[2], 'G') < 1 || count(grids[2], 'v') !== 1) fail('lighthouse f2: need lever + gate + chute');
  reach(grids[2], '<', ['k', 'g', 'm', 'K', '>', 'L', 'G', 'v'], 'lighthouse f2');
  // floor 4 (the lamp room): boss, chute landing
  if (count(grids[3], '<') !== 1) fail('lighthouse f3: need stairs up');
  if (count(grids[3], 'b') !== 1) fail('lighthouse f3: need the boss');
  if (count(grids[0], 'b') + count(grids[1], 'b') + count(grids[2], 'b') !== 0) fail('lighthouse: boss belongs on floor 4 only');
  reach(grids[3], '<', ['*', 'm', 'b'], 'lighthouse f3');
  for (const c of MM.maps.find(grids[2], 'v')) {
    if (!'.m'.includes(grids[3][c.y][c.x])) fail(`lighthouse f2: chute at ${c.x},${c.y} lands on '${grids[3][c.y][c.x]}'`);
  }
  const roster = MM.data.MONSTERS[16];
  if (!roster || !roster.types.some(t => t.behavior === 'guard')) fail('lighthouse roster: no guard type');
  if (!roster || !roster.types.some(t => t.behavior === 'thief')) fail('lighthouse roster: no thief type');
  if (roster.boss.name !== 'The Murk') fail('lighthouse roster: boss should be The Murk');
  if (!MM.data.THEMES[16]) fail('lighthouse: no battle theme');
}

// ---------- Smugglers' Vault (dungeon 18): 1 dense secret floor ----------
{
  const floors = MM.maps.dungeonFloors(18);
  if (!floors || floors.length !== 1) fail('vault: expected 1 floor');
  floors[0].forEach((r, i) => { if (r.length !== 26) fail(`vault row ${i} length ${r.length}`); });
  const g = MM.maps.parse(floors[0], '#');
  const count = ch => MM.maps.find(g, ch).length;
  if (count('X') !== 1) fail('vault: need one exit');
  if (count('t') < 2) fail('vault: expected a thief gauntlet (2+ thieves)');
  if (count('g') !== 1) fail('vault: need the guard on the crossbow chest');
  if (count('*') < 4) fail(`vault: expected dense treasure, found ${count('*')} chests`);
  if (count('%') !== 1) fail('vault: need a secret alcove');
  if (count('b') !== 1) fail('vault: need the boss');
  const reach = (grid, startCh, pois, label) => {
    const gg = grid.map(row => row.map(ch => 'DKG%Lk*'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (gg[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  reach(g, 'X', ['t', 'm', 'g', '*', '%', 'b'], 'vault');
  const roster = MM.data.MONSTERS[17];
  if (!roster || !roster.types.some(t => t.behavior === 'thief')) fail('vault roster: no thief type');
  if (!roster || !roster.types.some(t => t.behavior === 'guard')) fail('vault roster: no guard type');
  if (!MM.data.THEMES[17]) fail('vault: no battle theme');
  const task = MM.data.TASKS.find(t => t.vault);
  if (!task) fail('vault: no TASKS entry with vault:true');
  if (!MM.data.TASKS.find(t => t.finale)) fail('lighthouse: no TASKS entry with finale:true');
}

// ---------- Clockwork Spire (dungeon 19): 5 floors, 40 cols wide ----------
{
  const floors = MM.maps.dungeonFloors(19);
  if (!floors || floors.length !== 5) fail('spire: expected 5 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 40) fail(`spire f${fi} row ${i} length ${r.length}`);
  }));
  const grids = floors.map(f => MM.maps.parse(f, '#'));
  const count = (g, ch) => MM.maps.find(g, ch).length;
  if (count(grids[0], 'X') !== 1) fail('spire f0: need one exit');
  if (count(grids[0], 'Z') < 1) fail('spire f0: need at least one clock door');
  if (count(grids[1], 'R') !== 1) fail('spire f1: need the gear plate');
  if (count(grids[1], 'A') !== 1 || count(grids[1], 'B') !== 1 || count(grids[1], 'C') !== 1) {
    fail('spire f1: need exactly one each of gates A/B/C');
  }
  if (count(grids[2], 'Z') < 1) fail('spire f2: need a clock door');
  if (count(grids[3], 'L') !== 1 || count(grids[3], 'G') < 1) fail('spire f3: need lever + gates');
  if (count(grids[4], 'b') !== 1) fail('spire f4: need the boss');
  for (let i = 0; i < 4; i++) if (count(grids[i], 'b') !== 0) fail(`spire f${i}: boss belongs on the last floor`);
  for (let i = 1; i < 5; i++) if (count(grids[i], '<') !== 1) fail(`spire f${i}: needs one stairs-up`);
  for (let i = 0; i < 4; i++) if (count(grids[i], '>') !== 1) fail(`spire f${i}: needs one stairs-down`);
  if (count(grids[4], '>') !== 0) fail('spire f4: the last floor has no stairs-down');

  // generic reachability: locks/doors/levers/gates/gear-glyphs count as open
  // (mirrors every other isle dungeon's harness — actual math/lever gating
  // is exercised by drive-spire.js, not this static pass)
  const reach = (grid, startCh, pois, label) => {
    const gg = grid.map(row => row.map(ch => 'DKGZLk*ABC'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (gg[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  reach(grids[0], 'X', ['k', 'g', 'm', 'K', 'Z', '*', '>'], 'spire f0');
  reach(grids[1], '<', ['R', 'A', 'B', 'C', 'g', 't', 'm', '>'], 'spire f1');
  reach(grids[2], '<', ['t', 'm', 'Z', '%', '*', '>'], 'spire f2');
  reach(grids[3], '<', ['L', 'G', 'k', 'g', 'K', '*', 't', 'm', '>'], 'spire f3');
  reach(grids[4], '<', ['b', 'm', '*'], 'spire f4');

  // gear plate (floor 2): each alcove's CHEST (not just the gate cell itself
  // — a gate can be "reachable" while the sealed room behind it isn't) must
  // be reachable in its OWN rotation state and UNreachable in the other two;
  // the MAIN path (start -> plate -> stairs) must stay open with every gate
  // closed at once — the plate gates loot, never progress.
  {
    const raw = grids[1];
    const letters = { A: 0, B: 1, C: 2 };
    const gateReach = (startCh, targetPos, openLetter) => {
      const gg = raw.map(row => row.map(ch => (ch === 'D' || ch === 'K' || ch === 'Z' || ch === 'L' || ch === 'k' || ch === '*') ? '.' : ch));
      const start = MM.maps.find(raw, startCh)[0];
      const seen = new Set([start.x + ',' + start.y]);
      const q = [start];
      while (q.length) {
        const { x, y } = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          const ch = (gg[ny] || [])[nx];
          const k = nx + ',' + ny;
          if (ch == null || seen.has(k)) continue;
          if (ch === '#') continue;
          if (ch in letters && letters[ch] !== openLetter) continue;
          seen.add(k);
          q.push({ x: nx, y: ny });
        }
      }
      return seen.has(targetPos.x + ',' + targetPos.y);
    };
    ['A', 'B', 'C'].forEach((letter, i) => {
      const gatePos = MM.maps.find(raw, letter)[0];
      const chestPos = { x: gatePos.x, y: gatePos.y - 2 }; // alcove()'s layout: chest sits 2 rows above its gate
      if (raw[chestPos.y][chestPos.x] !== '*') fail(`spire f1: expected a chest above gate '${letter}'`);
      if (!gateReach('<', chestPos, i)) fail(`spire f1: alcove '${letter}'s chest unreachable when it's the open gate`);
      const wrongState = (i + 1) % 3;
      if (gateReach('<', chestPos, wrongState)) fail(`spire f1: alcove '${letter}'s chest reachable with the WRONG gate open`);
    });
    const stairsPos = MM.maps.find(raw, '>')[0];
    if (!gateReach('<', stairsPos, -1)) fail('spire f1: the stairs down must be reachable with EVERY gate closed');
  }
}

// ---------- Horologe Isle overworld (dungeon 19's isle, town-less) ----------
{
  MM.maps.HOROLOGE.forEach((r, i) => { if (r.length !== 40) fail(`horologe row ${i} length ${r.length}`); });
  const raw = MM.maps.parse(MM.maps.HOROLOGE, '~');
  for (const ch of ['W', 'P', '5']) {
    if (MM.maps.find(raw, ch).length !== 1) fail(`horologe: want exactly one '${ch}'`);
  }
  const start = MM.maps.find(raw, 'P')[0];
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const ch = (raw[ny] || [])[nx];
      const k = nx + ',' + ny;
      if (ch == null || ch === '~' || ch === 'M' || seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  for (const ch of ['W', '5']) {
    const p = MM.maps.find(raw, ch)[0];
    if (!seen.has(p.x + ',' + p.y)) fail(`horologe: '${ch}' unreachable from P`);
  }
}

// ---------- Resonant Halls (dungeon 20): 4 floors ----------
{
  const floors = MM.maps.dungeonFloors(20);
  if (!floors || floors.length !== 4) fail('halls: expected 4 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 26) fail(`halls f${fi} row ${i} length ${r.length}`);
  }));
  const grids = floors.map(f => MM.maps.parse(f, '#'));
  const count = (g, ch) => MM.maps.find(g, ch).length;
  if (count(grids[0], 'X') !== 1) fail('halls f0: need one exit');
  if (count(grids[0], 'Y') !== 1) fail('halls f0: need an echo door');
  if (count(grids[0], 's') < 1) fail('halls f0: need at least one singing stone');
  if (count(grids[1], 'L') !== 1 || count(grids[1], 'G') < 1) fail('halls f1: need lever + gates');
  if (count(grids[2], 'Y') !== 1) fail('halls f2: need a second echo door');
  if (count(grids[2], '%') !== 1) fail('halls f2: need a secret wall');
  if (count(grids[3], 'b') !== 1) fail('halls f3: need the boss');
  for (let i = 0; i < 3; i++) if (count(grids[i], 'b') !== 0) fail(`halls f${i}: boss belongs on the last floor`);
  for (let i = 1; i < 4; i++) if (count(grids[i], '<') !== 1) fail(`halls f${i}: needs one stairs-up`);
  for (let i = 0; i < 3; i++) if (count(grids[i], '>') !== 1) fail(`halls f${i}: needs one stairs-down`);
  if (count(grids[3], '>') !== 0) fail('halls f3: the last floor has no stairs-down');

  const reach = (grid, startCh, pois, label) => {
    const gg = grid.map(row => row.map(ch => 'DKGYLks%'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (gg[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  reach(grids[0], 'X', ['k', 'g', 'K', 'Y', '*', '>'], 'halls f0');
  reach(grids[1], '<', ['L', 'G', 't', 'm', '*', '>'], 'halls f1');
  reach(grids[2], '<', ['t', 'Y', '%', '*', 'm', '>'], 'halls f2');
  reach(grids[3], '<', ['b', '*'], 'halls f3');

  const roster = MM.data.MONSTERS[19];
  if (!roster || !roster.types.some(t => t.behavior === 'guard')) fail('halls roster: no guard type');
  if (!roster || !roster.types.some(t => t.behavior === 'thief')) fail('halls roster: no thief type');
  if (!roster || !roster.types.some(t => t.behavior === 'wander')) fail('halls roster: no wander type');
  if (!MM.data.THEMES[19]) fail('halls: no battle theme');
  if (!MM.data.TASKS.find(t => t.chime)) fail('halls: no TASKS entry with chime:true');
}

// ---------- Chime Isle overworld (dungeon 20's isle, town-less) ----------
{
  MM.maps.CHIME.forEach((r, i) => { if (r.length !== 30) fail(`chime row ${i} length ${r.length}`); });
  const raw = MM.maps.parse(MM.maps.CHIME, '~');
  for (const ch of ['W', 'P', '6']) {
    if (MM.maps.find(raw, ch).length !== 1) fail(`chime: want exactly one '${ch}'`);
  }
  const start = MM.maps.find(raw, 'P')[0];
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const ch = (raw[ny] || [])[nx];
      const k = nx + ',' + ny;
      if (ch == null || ch === '~' || ch === 'M' || seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  for (const ch of ['W', '6']) {
    const p = MM.maps.find(raw, ch)[0];
    if (!seen.has(p.x + ',' + p.y)) fail(`chime: '${ch}' unreachable from P`);
  }
}

// ---------- Gullwrack Harbor overworld (Level 5, Wave 6) — a full town ----------
{
  MM.maps.GULLWRACK.forEach((r, i) => { if (r.length !== 40) fail(`gullwrack row ${i} length ${r.length}`); });
  const raw = MM.maps.parse(MM.maps.GULLWRACK, '~');
  for (const ch of ['W', 'P', '7', 'S', 'I', 'n', 'y']) {
    if (MM.maps.find(raw, ch).length !== 1) fail(`gullwrack: want exactly one '${ch}'`);
  }
  // repair-site glyphs are interactive, not walls — passable for reachability
  const gg = raw.map(row => row.map(ch => 'rUil'.includes(ch) ? '.' : ch));
  const start = MM.maps.find(raw, 'P')[0];
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const ch = (gg[ny] || [])[nx];
      const k = nx + ',' + ny;
      if (ch == null || ch === '~' || ch === 'M' || seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  for (const ch of ['W', '7', 'S', 'I', 'n', 'y']) {
    const p = MM.maps.find(raw, ch)[0];
    if (!seen.has(p.x + ',' + p.y)) fail(`gullwrack: '${ch}' unreachable from P`);
  }
  // every repair site's plaque, lever, and every slab/broken pair must be
  // reachable too (as a bump target — checked one tile short via a POI
  // adjacency scan, since the objects themselves are impassable)
  const adjacentReachable = (p, label) => {
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((p.x + dx) + ',' + (p.y + dy)));
    if (!ok) fail(`gullwrack: ${label} at ${p.x},${p.y} has no reachable adjacent tile`);
  };
  for (const site of MM.maps.REPAIR_SITES.gullwrack) {
    adjacentReachable(site.plaque, `${site.id} plaque`);
    adjacentReachable(site.lever, `${site.id} lever`);
    for (const pair of site.pairs) adjacentReachable(pair.slab, `${site.id} slab`);
  }
  if (!MM.maps.GULLWRACK_TOWN_SITES || MM.maps.GULLWRACK_TOWN_SITES.length !== 4) {
    fail('gullwrack: GULLWRACK_TOWN_SITES should list exactly 4 town sites');
  }
}

// ---------- Sunken Breakwater (dungeon 21): 2 floors ----------
{
  const floors = MM.maps.dungeonFloors(21);
  if (!floors || floors.length !== 2) fail('breakwater: expected 2 floors');
  floors.forEach((raw, fi) => raw.forEach((r, i) => {
    if (r.length !== 26) fail(`breakwater f${fi} row ${i} length ${r.length}`);
  }));
  const grids = floors.map(f => MM.maps.parse(f, '#'));
  const count = (g, ch) => MM.maps.find(g, ch).length;
  if (count(grids[0], 'X') !== 1) fail('breakwater f0: need one exit');
  if (count(grids[0], 'D') !== 1) fail('breakwater f0: need the long-way math door');
  if (count(grids[0], '>') !== 1) fail('breakwater f0: need stairs down');
  if (count(grids[1], '<') !== 1) fail('breakwater f1: need stairs up');
  if (count(grids[1], 'b') !== 1) fail('breakwater f1: need the boss');
  if (count(grids[0], 'b') !== 0) fail('breakwater f0: boss belongs on the last floor');

  const reach = (grid, startCh, pois, label) => {
    // doors/repair-site objects count as open for reachability purposes —
    // actual door/plaque gating is exercised live by drive-gullwrack.js
    const gg = grid.map(row => row.map(ch => 'DrUil'.includes(ch) ? '.' : ch));
    const start = MM.maps.find(grid, startCh)[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const ch = (gg[ny] || [])[nx];
        const k = nx + ',' + ny;
        if (ch == null || ch === '#' || seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    for (const ch of pois) {
      for (const p of MM.maps.find(grid, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable`);
      }
    }
  };
  reach(grids[0], 'X', ['g', 't', 'm', '*', '>'], 'breakwater f0');
  reach(grids[1], '<', ['g', 't', 'b', '*'], 'breakwater f1');

  const roster = MM.data.MONSTERS[20];
  if (!roster || !roster.types.some(t => t.behavior === 'guard')) fail('breakwater roster: no guard type');
  if (!roster || !roster.types.some(t => t.behavior === 'thief')) fail('breakwater roster: no thief type');
  if (!roster || !roster.types.some(t => t.behavior === 'wander')) fail('breakwater roster: no wander type');
  if (!MM.data.THEMES[20]) fail('breakwater: no battle theme');
  const bwTask = MM.data.TASKS.find(t => t.breakwater);
  if (!bwTask) fail('breakwater: no TASKS entry with breakwater:true');
  else if (bwTask.skill !== 'geometry' || bwTask.mixed !== false) fail('breakwater: TASKS entry should be skill:geometry, mixed:false');
}

// ---------- slab-tiling repair sites (Wave 6): every site must be solvable,
// and its reset lever must restore the EXACT start state ----------
{
  // BFS over the push-state space: state = (player pos, tuple of live slab
  // positions or null for locked-in, filled[] booleans). Actions = walk one
  // step, or bump (push) in a direction. Proves SOME sequence of pushes
  // fills every broken tile — the same guarantee a kid needs, minus timing.
  function solveSite(rawGrid, site) {
    const W = rawGrid[0].length, H = rawGrid.length;
    const open = (x, y) => {
      if (y < 0 || y >= H || x < 0 || x >= W) return false;
      const ch = rawGrid[y][x];
      return ch === '.' || ch === 'r' || ch === 'U' || ch === 'i' || ch === 'l';
    };
    const startSlabs = site.pairs.map(p => `${p.slab.x},${p.slab.y}`);
    const startFilled = site.pairs.map(() => false);
    const startKey = (px, py, slabs, filled) => `${px},${py}|${slabs.join(';')}|${filled.join('')}`;
    // find a reasonable player start: any open cell adjacent to the site
    const playerStart = (() => {
      for (const p of [site.plaque, site.lever, ...site.pairs.map(pr => pr.slab)]) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (open(p.x + dx, p.y + dy)) return { x: p.x + dx, y: p.y + dy };
        }
      }
      return null;
    })();
    if (!playerStart) return false;
    const seen = new Set();
    const q = [{ px: playerStart.x, py: playerStart.y, slabs: startSlabs, filled: startFilled }];
    seen.add(startKey(playerStart.x, playerStart.y, startSlabs, startFilled));
    const isSlabAt = (slabs, x, y) => slabs.findIndex(s => s === `${x},${y}`);
    while (q.length) {
      const st = q.shift();
      if (st.filled.every(Boolean)) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = st.px + dx, ny = st.py + dy;
        const slabIdx = isSlabAt(st.slabs, nx, ny);
        if (slabIdx >= 0) {
          // a bump: push that slab one further in the same direction
          const bx = nx + dx, by = ny + dy;
          const brokenIdx = site.pairs.findIndex((p, bi) => p.broken.x === bx && p.broken.y === by && !st.filled[bi]);
          let nextSlabs = st.slabs, nextFilled = st.filled;
          if (brokenIdx >= 0) {
            nextSlabs = st.slabs.slice(); nextSlabs[slabIdx] = null;
            nextFilled = st.filled.slice(); nextFilled[brokenIdx] = true;
          } else if (open(bx, by) && isSlabAt(st.slabs, bx, by) < 0) {
            nextSlabs = st.slabs.slice(); nextSlabs[slabIdx] = `${bx},${by}`;
          } else {
            continue; // blocked push — player doesn't move either
          }
          const k = startKey(st.px, st.py, nextSlabs, nextFilled); // pushing doesn't move the player
          if (!seen.has(k)) { seen.add(k); q.push({ px: st.px, py: st.py, slabs: nextSlabs, filled: nextFilled }); }
        } else if (open(nx, ny)) {
          const k = startKey(nx, ny, st.slabs, st.filled);
          if (!seen.has(k)) { seen.add(k); q.push({ px: nx, py: ny, slabs: st.slabs, filled: st.filled }); }
        }
      }
    }
    return false;
  }

  const mapsFor = { gullwrack: MM.maps.parse(MM.maps.GULLWRACK, '~'), d21f0: MM.maps.parse(MM.maps.dungeonFloors(21)[0], '#') };
  for (const [mapId, sites] of Object.entries(MM.maps.REPAIR_SITES)) {
    const raw = mapsFor[mapId];
    if (!raw) { fail(`repair sites: no test grid registered for mapId '${mapId}'`); continue; }
    for (const site of sites) {
      if (!solveSite(raw, site)) fail(`repair site '${mapId}:${site.id}' has NO solving push sequence`);
    }
  }

  // reset restores the EXACT start state, live against the real engine
  const st = { parent: { pin: null } };
  MM.engine.state = st;
  st.repairSites = {};
  st.charmsOn = []; st.items = { charms: [] }; st.isles = { lenses: {}, keys: {} };
  st.gold = 0; st.mastery = {};
  st.grid = MM.maps.parse(MM.maps.GULLWRACK, '~');
  MM.engine.applySiteState('gullwrack');
  for (const site of MM.maps.REPAIR_SITES.gullwrack) {
    const key = 'gullwrack:' + site.id;
    const before = JSON.parse(JSON.stringify(st.repairSites[key]));
    // wedge every slab one step off its start (into whatever's open nearby)
    site.pairs.forEach((p, i) => {
      const live = st.repairSites[key];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = p.slab.x + dx, ny = p.slab.y + dy;
        const ch = st.grid[ny] && st.grid[ny][nx];
        if (ch === '.') { live.slabPos[i] = { x: nx, y: ny }; break; }
      }
    });
    MM.engine.applySiteState('gullwrack');
    MM.engine.resetSite('gullwrack', site);
    const after = st.repairSites[key];
    if (JSON.stringify(after.slabPos) !== JSON.stringify(before.slabPos)) {
      fail(`repair site '${site.id}': reset did not restore the exact start slab positions`);
    }
    if (after.filled.some(Boolean) || after.done) fail(`repair site '${site.id}': reset should never touch filled/done`);
  }
}

// ---------- renderability audit (Wave 6.5 / FINAL_PASSES Pass G1) ----------
// Every glyph on every map must draw as SOMETHING the kid can see —
// Horologe, Chime, and Gullwrack all shipped with invisible entrances,
// NPCs, and puzzle tiles because nothing enforced this. Rules:
//  (a) tileSprite must return a sprite name that exists in MM.sprites.DEFS;
//  (b) on an overworld, 'floor' is never acceptable, and grass is only
//      acceptable for plain ground / the arrival tile / NPC letters
//      (NPCs draw in their own pass — but then the letter MUST exist in
//      MM.data.NPCS, or the "person" is a patch of grass);
//  (c) on a dungeon floor, 'floor' is only acceptable for actual floor
//      and spawn markers (replaced at entry) — a mechanic tile that draws
//      as bare floor is invisible, which is how the Spire shipped
//      invisible clock doors.
{
  require(path.join(ROOT, 'js/sprites.js'));

  // Wave 7: the sprite sheet has a validator (rows equal length, every char
  // has a color) that NOTHING ever called — so two tiles (pool, keyTile) had
  // shipped for months with an uncolored 'd' punching a transparent hole in
  // them. Call it. A sprite that can't render is a tile the kid can't see.
  for (const p of MM.sprites.validate()) fail(`sprite: ${p}`);

  const GRASS_OK = new Set(['.', 'P', '=']);
  // Wave 7: A/B/C are NO LONGER whitelisted here. They used to be rewritten
  // to '#'/'.' at entry, so they never rendered at all — which is precisely
  // why the Spire's gates were invisible. They now stay in the grid and must
  // draw as real gate sprites; if that ever regresses, this fails.
  const FLOOR_OK = new Set(['.', 'm', 'g', 't', 'b']);
  const checkMap = (rows, mapId, label) => {
    const grid = MM.maps.parse(rows, mapId === 'world' || MM.maps.isOverworld(mapId) ? '~' : '#');
    const seen = new Set();
    for (const row of grid) for (const ch of row) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      const spr = MM.maps.tileSprite(ch, 0, 0, mapId, 0);
      if (!MM.sprites.DEFS[spr]) { fail(`${label}: glyph '${ch}' maps to unknown sprite '${spr}'`); continue; }
      if (MM.maps.isOverworld(mapId)) {
        if (spr === 'floor') fail(`${label}: glyph '${ch}' draws as dungeon floor on an overworld`);
        if ((spr === 'grass' || spr === 'grass2') && !GRASS_OK.has(ch) && !MM.data.NPCS[ch]) {
          fail(`${label}: glyph '${ch}' is INVISIBLE (draws as grass, not ground/NPC) — give it a tileSprite case or an NPCS entry`);
        }
      } else if (spr === 'floor' && !FLOOR_OK.has(ch)) {
        fail(`${label}: glyph '${ch}' is INVISIBLE in a dungeon (draws as bare floor) — give it a tileSprite case`);
      }
    }
  };
  checkMap(MM.maps.OVERWORLD, 'world', 'overworld');
  checkMap(MM.maps.ISLES, 'isles', 'isles');
  checkMap(MM.maps.HOROLOGE, 'horologe', 'horologe');
  checkMap(MM.maps.CHIME, 'chime', 'chime');
  checkMap(MM.maps.GULLWRACK, 'gullwrack', 'gullwrack');
  checkMap(MM.maps.CASTLE, 'castle', 'castle');   // Wave 7
  checkMap(MM.maps.WING, 'wing', 'wing');         // Wave 12
  // Wave 13: Your Own Room's grid is BUILT (template + placed pieces), so
  // audit a sample carrying every placeable piece char.
  {
    const sample = MM.maps.MYROOM.map(r => r.split(''));
    const chars = Object.values(MM.maps.MYROOM_PIECE_CHARS).concat(['v']);
    chars.forEach((ch, i) => { sample[1][2 + i] = ch; });
    checkMap(sample.map(r => r.join('')), 'myroom', 'myroom');
  }
  for (let idx = 1; idx <= MM.data.TASKS.length; idx++) {
    MM.maps.dungeonFloors(idx).forEach((raw, fi) => checkMap(raw, `d${idx}f${fi}`, `render d${idx} f${fi}`));
  }
  // Wave 7: a gear gate must render differently in each rotation — that IS
  // the fix. Prove both states resolve to real, DISTINCT sprites.
  {
    const shut = MM.maps.tileSprite('B', 0, 0, 'd19f1', 0);   // rotation 0 => A open, B shut
    MM.engine.state = { gearState: { d19f1: 1 } };            // rotation 1 => B open
    const open = MM.maps.tileSprite('B', 0, 0, 'd19f1', 0);
    MM.engine.state = null;
    if (shut === open) fail('gear gate renders identically open and shut — the readability bug is back');
    if (!MM.sprites.DEFS[shut] || !MM.sprites.DEFS[open]) fail('gear gate sprites missing');
  }
}

// ---------- Wave 11: the Grand Descent ----------
{
  // P1: palette derivation must be TOTAL over every THEMES entry — no index
  // gaps. For every dungeon 1..THEMES.length, deriving a wall/floor palette
  // must produce a complete, valid {char: hex} map covering every char the
  // base sprite defines (no missing/blank colors, which would render a
  // transparent hole per S.get's `if (!col) continue`).
  const HEX_RE = /^#[0-9a-f]{6}$/i;
  const WALL_NAMES = ['wall', 'wallWorked', 'wallGrand'];
  for (let idx = 1; idx <= MM.data.THEMES.length; idx++) {
    const theme = MM.data.THEMES[idx - 1];
    for (const name of [...WALL_NAMES, 'floor']) {
      const pal = MM.sprites.themePalette(name, theme);
      const wantKeys = Object.keys(MM.sprites.DEFS[name].colors).sort();
      const gotKeys = Object.keys(pal).sort();
      if (JSON.stringify(wantKeys) !== JSON.stringify(gotKeys)) {
        fail(`descent: themePalette('${name}', THEMES[${idx - 1}]) missing/extra keys: want ${wantKeys}, got ${gotKeys}`);
      }
      for (const ch of wantKeys) {
        if (!HEX_RE.test(pal[ch])) fail(`descent: themePalette('${name}', THEMES[${idx - 1}])['${ch}'] = '${pal[ch]}' is not a valid hex color`);
      }
    }
  }

  // P2: wall-tier assignment is a total function of dungeonIndex, and the
  // three tiers really are three different, real sprites.
  const TIER_CASES = [
    [1, 'wall'], [2, 'wall'], [3, 'wall'],
    [4, 'wallWorked'], [5, 'wallWorked'], [6, 'wallWorked'], [7, 'wallWorked'],
    [8, 'wallGrand'], [9, 'wallGrand'], [10, 'wallGrand'],
    [11, 'wallGrand'], [12, 'wallGrand'], [13, 'wallGrand'],
    [14, 'wall'], [18, 'wall'], [21, 'wall'], [22, 'wall'],
  ];
  for (const [idx, want] of TIER_CASES) {
    const got = MM.maps.wallTierSprite(idx);
    if (got !== want) fail(`descent: wallTierSprite(${idx}) = '${got}', want '${want}'`);
    if (!MM.sprites.DEFS[got]) fail(`descent: wallTierSprite(${idx}) => '${got}' has no sprite def`);
  }
  for (const name of WALL_NAMES) for (const p of MM.sprites.validate()) {
    if (p.includes(name)) fail(`descent sprite: ${p}`);
  }

  // Wall/floor sprite CACHE KEYS must actually differ between d1, d5, d9
  // (tier name difference) and between two same-tier dungeons (d1 vs d2 —
  // proves the theme TINT, not just the tier, is real).
  {
    const keyFor = (name, idx) => name + '|3||' + JSON.stringify(MM.sprites.themePalette(name, MM.data.THEMES[idx - 1]));
    const k1 = keyFor(MM.maps.wallTierSprite(1), 1);
    const k5 = keyFor(MM.maps.wallTierSprite(5), 5);
    const k9 = keyFor(MM.maps.wallTierSprite(9), 9);
    if (k1 === k5 || k5 === k9 || k1 === k9) fail('descent: d1/d5/d9 wall sprite cache keys are not all distinct — tiers/tints not real');
    const k1floor = keyFor('floor', 1);
    const k2floor = keyFor('floor', 2);
    if (k1floor === k2floor) fail('descent: d1/d2 floor cache keys match — same-tier dungeons must still be tinted differently');
  }

  // P3: decor never lands on a POI cell. Exhaustively scan every glyph of
  // every floor of every mainland dungeon (1-10) — far more than the
  // "50 regenerations" floor the wave asks for — and assert decorMotif is
  // never truthy for anything but plain open floor ('.').
  {
    let checked = 0;
    for (let idx = 1; idx <= 10; idx++) {
      const floors = MM.maps.dungeonFloors(idx);
      floors.forEach((raw, fi) => {
        const grid = MM.maps.parse(raw, '#');
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid[y].length; x++) {
            const ch = grid[y][x];
            checked++;
            if (ch !== '.' && MM.maps.decorMotif(idx, x, y, ch)) {
              fail(`descent: decor landed on POI cell d${idx} f${fi} (${x},${y}) glyph '${ch}'`);
            }
          }
        }
      });
    }
    if (checked < 50) fail('descent: decor-on-POI scan checked suspiciously few tiles');
  }

  // P4: boss-room vignette tiles must actually differ from ordinary floor —
  // every mainland dungeon's floor 0 has a boss marker.
  for (let idx = 1; idx <= 10; idx++) {
    const pos = MM.maps.bossSpawnPos(idx, 0);
    if (!pos) { fail(`descent: dungeon ${idx} floor 0 has no boss marker to vignette`); continue; }
    const atBoss = MM.maps.bossVignetteAlpha(idx, 0, pos.x, pos.y);
    const farAway = MM.maps.bossVignetteAlpha(idx, 0, pos.x + 20, pos.y + 20);
    if (!(atBoss > 0)) fail(`descent: dungeon ${idx} boss tile itself isn't vignetted`);
    if (farAway !== 0) fail(`descent: dungeon ${idx} vignette leaked far from the boss`);
  }
}

// ---------- never stranded (Wave 6.5, user question) ----------
// Every island overworld must offer a supplies source ('S' — shop or
// dockside cart) and a dock ('W') so a kid can always restock potions and
// food and always leave. Rest comes from an inn ('I') or the dock's
// bunk option — inn-less islands are listed explicitly so adding one
// without rest support fails here.
{
  const BUNK_ISLANDS = ['HOROLOGE', 'CHIME']; // rest = dock bunk, not inn
  for (const name of ['ISLES', 'HOROLOGE', 'CHIME', 'GULLWRACK']) {
    const g = new Set();
    MM.maps[name].forEach(r => [...r].forEach(c => g.add(c)));
    if (!g.has('S')) fail(`${name}: no supplies source — a kid can't restock potions/food here`);
    if (!g.has('W')) fail(`${name}: no dock — a kid can't leave`);
    if (!g.has('I') && !BUNK_ISLANDS.includes(name)) fail(`${name}: no inn and not a bunk island — no way to rest`);
  }

  // Wave 7.1: NO TRAP TILES — every standable tile on every overworld must
  // reach its dock (mainland: the arrival tile P). A tile a player can be
  // PLACED on but never walk out of strands them forever — the user hit
  // Horologe (20,2) live. Murk modeled cleared, bridge modeled laid.
  const STAND = '.P=';
  for (const [name, dockCh] of [['ISLES', 'W'], ['HOROLOGE', 'W'], ['CHIME', 'W'], ['GULLWRACK', 'W'], ['OVERWORLD', 'P']]) {
    const grid = MM.maps.parse(MM.maps[name], '~').map(row => row.map(ch => 'uvw'.includes(ch) && name === 'ISLES' ? '.' : ch));
    if (name === 'OVERWORLD') MM.maps.BRIDGE.forEach(b => { grid[b.y][b.x] = '='; });
    const dock = MM.maps.find(grid, dockCh)[0];
    const seen = new Set([dock.x + ',' + dock.y]);
    const q = [dock];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k)) continue;
        const ch = (grid[ny] || [])[nx];
        if (ch == null || !STAND.includes(ch)) continue;
        seen.add(k); q.push({ x: nx, y: ny });
      }
    }
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
      if (STAND.includes(grid[y][x]) && grid[y][x] !== dockCh && !seen.has(x + ',' + y)) {
        fail(`${name}: TRAP TILE at ${x},${y} — standable but can never reach the dock`);
      }
    }
  }
}

// ---------- sail destination registry (Wave 6.5) ----------
// Every continent the game can sail to needs a name + caption here —
// the "Sailing home to Numeria on every voyage" bug came from a
// hardcoded two-way ternary. New destination => new entry, tested here.
{
  const wanted = ['west', 'isles', 'horologe', 'chime', 'gullwrack'];
  for (const k of wanted) {
    const d = MM.data.DESTINATIONS[k];
    if (!d) { fail(`DESTINATIONS: missing entry for continent '${k}'`); continue; }
    if (!d.name || !d.caption) fail(`DESTINATIONS.${k}: needs both name and caption`);
    if (!d.caption.includes('⛵')) fail(`DESTINATIONS.${k}: caption should read as a voyage line`);
  }
  for (const k of Object.keys(MM.data.DESTINATIONS)) {
    if (!wanted.includes(k)) fail(`DESTINATIONS has unknown continent '${k}' — update this test AND enterWorld's routing`);
  }
}

// ---------- Wave 7: The Open Castle ----------
{
  const rows = MM.maps.CASTLE;
  rows.forEach((r, i) => { if (r.length !== 26) fail(`castle row ${i} length ${r.length}`); });
  if (rows.length !== 15) fail(`castle has ${rows.length} rows, want 15`);
  const g = MM.maps.parse(rows, '#');
  // exactly ten plinths — one per recovered treasure, and the Gallery's whole
  // point is that the count matches the ten tasks
  const plinths = MM.maps.find(g, 'E');
  const mainlandTasks = MM.data.TASKS.filter(t => !t.exp).length;
  if (plinths.length !== 10) fail(`castle: want 10 gallery plinths, found ${plinths.length}`);
  if (mainlandTasks !== 10) fail(`castle: the Gallery of Ten assumes 10 mainland tasks, found ${mainlandTasks}`);
  for (const ch of ['X', 'P', 'O', 'Q', 'J']) {
    if (MM.maps.find(g, ch).length !== 1) fail(`castle: want exactly one '${ch}'`);
  }
  if (!MM.maps.find(g, 'V').length) fail('castle: no Hall of Heroes board');
  // NO combat, ever: not a single monster/boss marker may exist here
  for (const ch of ['m', 'g', 't', 'b']) {
    if (MM.maps.find(g, ch).length) fail(`castle: monster marker '${ch}' — there is no combat in the castle`);
  }
  if (!MM.maps.isOverworld('castle')) fail("castle must be in OVERWORLD_IDS (or it renders as a dungeon: grey floor, no NPC pass)");
  // every bumpable thing must be reachable from the arrival tile
  const OPEN = new Set(['.', 'P']);
  const start = MM.maps.find(g, 'P')[0];
  const seen = new Set([start.x + ',' + start.y]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const ch = (g[ny] || [])[nx];
      const k = nx + ',' + ny;
      if (ch == null || seen.has(k) || !OPEN.has(ch)) continue;
      seen.add(k); q.push({ x: nx, y: ny });
    }
  }
  const adj = p => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((p.x + dx) + ',' + (p.y + dy)));
  // Wave 9 (P3): d/i/k furnishing, l the pet's wardrobe, n/w/r the statue
  // plinths — same bumpability contract as the Gallery's own plinths.
  for (const ch of ['E', 'V', 'O', 'Q', 'J', 'X', 'd', 'i', 'k', 'l', 'n', 'w', 'r']) {
    for (const p of MM.maps.find(g, ch)) {
      if (!adj(p)) fail(`castle: '${ch}' at ${p.x},${p.y} can never be bumped — nothing walkable beside it`);
    }
  }
  // the castle's two NPCs must actually exist, or they draw as bare floor
  for (const ch of ['Q', 'J']) {
    if (!MM.data.NPCS[ch]) fail(`castle: glyph '${ch}' has no NPCS entry`);
  }
  // Wave 9: the townsfolk NPC-draw pass runs on every glyph, on every
  // overworld — a NON-NPC castle glyph that happens to collide with an
  // MM.data.NPCS key (used by some OTHER map's villager) draws that
  // villager sprite right over the tile. Caught once only by screenshot;
  // this makes it impossible to silently reintroduce.
  for (const ch of ['d', 'i', 'k', 'l', 'n', 'w', 'r']) {
    if (MM.data.NPCS[ch]) fail(`castle: furnishing glyph '${ch}' collides with an MM.data.NPCS key — the townsfolk pass will draw a villager over it`);
  }
  // one Gallery memory per mainland task
  if (!MM.data.GALLERY || MM.data.GALLERY.length !== 10) {
    fail(`castle: want 10 Gallery memories, found ${(MM.data.GALLERY || []).length}`);
  }
}

// ---------- Wave 7: the castle gate ----------
{
  const mk = over => ({
    tasksDone: over.tasks ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] : [1, 2],
    isles: { lampLit: !!over.lamp, spireDone: !!over.spire, hallsDone: !!over.halls, lenses: {} },
  });
  const open = st => { MM.engine.state = st; const r = MM.engine.castleOpen(); MM.engine.state = null; return r; };
  if (open(mk({ tasks: true, lamp: true, spire: true })) !== true) fail('castle gate: should be OPEN with tasks + lamp + spire');
  if (open(mk({ tasks: false, lamp: true, spire: true }))) fail('castle gate: must stay shut without all 13 tasks');
  if (open(mk({ tasks: true, lamp: false, spire: true }))) fail('castle gate: must stay shut without the Great Lamp');
  if (open(mk({ tasks: true, lamp: true, spire: false }))) fail('castle gate: must stay shut without the Spire');
  // and the whole point: music is OPT-IN, so the Halls must NEVER be required
  if (open(mk({ tasks: true, lamp: true, spire: true, halls: false })) !== true) {
    fail('castle gate: the Resonant Halls must NOT be required — music is a parent opt-in');
  }
}

// ---------- Wave 7: the Final Exam (inverted — the kid grades the teacher) ----------
{
  const n = MM.problems.generateExam.count;
  if (n !== 5) fail(`exam: want 5 slates, found ${n}`);
  for (let w = 0; w < n; w++) {
    for (const flawed of [false, true]) {
      for (let i = 0; i < 60; i++) {
        const p = MM.problems.generateExam(w, flawed);
        if (p.kind !== 'choice') fail(`exam slate ${w}: must be kind:'choice'`);
        if (!p.steps || p.steps.length < 2) fail(`exam slate ${w}: needs a real worked solution`);
        if (!p.prompt || !p.text || !p.solution) fail(`exam slate ${w}: missing prompt/text/solution`);
        // choices = one per step, plus "every step is correct"
        if (p.choices.length !== p.steps.length + 1) fail(`exam slate ${w}: choices must be one per step + "correct"`);
        // the answer index must point AT the bad step, or at the "correct" option
        const want = p.badStep < 0 ? p.steps.length : p.badStep;
        if (p.answer !== want) fail(`exam slate ${w}: answer index ${p.answer} does not match badStep ${p.badStep}`);
        // exactly one thing is wrong, and it's where we said it was
        if (p.badStep >= p.steps.length) fail(`exam slate ${w}: badStep out of range`);
        if (!MM.problems.checkAnswer(p, p.answer)) fail(`exam slate ${w}: its own answer is rejected`);
        if (MM.problems.checkAnswer(p, (p.answer + 1) % p.choices.length)) fail(`exam slate ${w}: a wrong choice is accepted`);
        // the LAST slate is the game's first kind of problem, worked right —
        // it must never carry a planted error, even when one is demanded
        if (w === n - 1 && p.badStep !== -1) fail('exam: the final slate must always be CLEAN (the kid marks it correct)');
        if (w < n - 1 && flawed && p.badStep < 0) fail(`exam slate ${w}: asked for a flaw, got a clean slate`);
        if (!flawed && p.badStep >= 0) fail(`exam slate ${w}: asked for a clean slate, got a flaw`);
      }
    }
  }
  // the exam must NOT leak into ordinary play: no generator, no quick variant
  if (MM.problems.GENERATORS.exam || MM.problems.QUICK.exam) fail('exam: must stay out of GENERATORS/QUICK');
}

// ---------- Wave 7: Golden Numeria (NG+) keeps the hero, resets the kingdom ----------
{
  const s = {
    name: 'Ng', level: 22, xp: 40, hp: 5, maxhp: 90, stamina: 1, maxStamina: 120,
    taskIndex: 14, tasksDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], haveItem: true,
    opened: { 'd3:1,1': true }, bossesDefeated: { d1: true }, unsealed: { d2: true },
    defeatedAt: { x: 'today' }, gearState: { d19f1: 2 }, repairSites: { 'gullwrack:pier': { done: true } },
    isles: { lenses: { tidepool: true }, keys: { d14: 1 }, lampLit: true, spireDone: true, hallsDone: true, breakwaterDone: true, gullwrackRebuilt: true, pet: { name: 'Biscuit' } },
    mastery: { addsub_facts: { attempts: 9, correct: 9, recent: [1] } },
    badges: { addsub_facts: 3 }, bestiary: { seen: {}, kills: { Slime: 4 }, gauntlet: {} },
    totals: { answered: 100, correct: 90 }, items: { charms: ['clover'], gems: ['flame'], treasures: [], food: {} },
    gear: { weapon: ['star'] }, equipped: { weapon: 'star' }, enchants: { 'weapon:star': 'flame' },
    charmsOn: ['clover'], parent: { pin: '1234', topics: {} }, difficulty: 'legend', calmMode: true,
    spellsCelebrated: { scout: true }, metMiscount: true, sparWins: 7, endingDone: true,
    titles: ['The New MathMaker'], continent: 'gullwrack', enrollSeen: true,
  };
  MM.engine.state = s;
  MM.engine.startGolden();
  // the KINGDOM resets
  if (s.ngPlus !== 1) fail('golden: ngPlus not incremented');
  if (s.taskIndex !== 1 || s.tasksDone.length || s.haveItem) fail('golden: the ten tasks must be reopened');
  for (const k of ['opened', 'bossesDefeated', 'unsealed', 'defeatedAt', 'gearState', 'repairSites']) {
    if (Object.keys(s[k]).length) fail(`golden: '${k}' should be wiped so the world is fresh`);
  }
  for (const f of ['lampLit', 'spireDone', 'hallsDone', 'breakwaterDone', 'gullwrackRebuilt']) {
    if (s.isles[f]) fail(`golden: isles.${f} should reset`);
  }
  if (Object.keys(s.isles.lenses).length || Object.keys(s.isles.keys).length) fail('golden: lenses/keys should reset');
  if (s.continent !== 'west') fail('golden: should start back home');
  // the HERO does not
  if (s.level !== 22 || s.badges.addsub_facts !== 3) fail('golden: level/badges must survive');
  if (!s.mastery.addsub_facts || s.totals.correct !== 90) fail('golden: mastery/totals must survive');
  if (s.bestiary.kills.Slime !== 4) fail('golden: the Monster Book must survive');
  if (!s.items.charms.includes('clover') || !s.items.gems.includes('flame')) fail('golden: charms/gems must survive');
  if (s.equipped.weapon !== 'star' || s.enchants['weapon:star'] !== 'flame') fail('golden: gear + enchants must survive');
  if (!s.isles.pet || s.isles.pet.name !== 'Biscuit') fail('golden: the pet must survive — it is family');
  if (!s.endingDone || !s.titles.includes('The New MathMaker')) fail('golden: you are still the MathMaker');
  if (s.parent.pin !== '1234' || s.difficulty !== 'legend' || !s.calmMode) fail('golden: parent/accessibility settings must survive');
  if (s.hp !== s.maxhp || s.stamina !== s.maxStamina) fail('golden: should start rested');
  // and the kingdom comes back tougher
  const base = MM.data.monsterStats(5, false);
  const golden = MM.engine.monsterStats(5, false);
  MM.engine.state = null;
  const plain = { ...s, ngPlus: 0 };
  MM.engine.state = plain;
  const normal = MM.engine.monsterStats(5, false);
  MM.engine.state = null;
  if (!(golden.hp > normal.hp)) fail('golden: monsters should come back tougher');
  if (base.hp < 1) fail('golden: sanity');
}

// ---------- theMon: names that carry their own article ----------
{
  const t = MM.data.theMon;
  if (t('The Murk') !== 'the Murk') fail(`theMon: 'The Murk' → '${t('The Murk')}'`);
  if (t('The Murk', true) !== 'The Murk') fail(`theMon: cap 'The Murk' → '${t('The Murk', true)}'`);
  if (t('Tick Imp') !== 'the Tick Imp') fail(`theMon: 'Tick Imp' → '${t('Tick Imp')}'`);
  if (t('Tick Imp', true) !== 'The Tick Imp') fail(`theMon: cap 'Tick Imp' → '${t('Tick Imp', true)}'`);
  for (let i = 0; i < 20; i++) {
    if (/\b[Tt]he [Tt]he\b/.test(MM.data.flavor('generic', 'win', 'The Murk'))) fail('flavor: doubled article survives');
  }
}

// ---------- quick generators (combat pacing) ----------
for (const skill of skills) {
  for (let i = 0; i < 400; i++) {
    let p;
    try { p = MM.problems.generateQuick(skill); }
    catch (e) { fail(`quick ${skill} generate threw: ${e.message}`); break; }
    if (!p.text || !p.solution || !p.quick) { fail(`quick ${skill} malformed: ${JSON.stringify(p)}`); break; }
    if (!MM.problems.checkAnswer(p, canonical(p))) {
      fail(`quick ${skill} canonical rejected: "${p.text}" ans=${JSON.stringify(p.answer)}`);
      break;
    }
    if (p.kind === 'number' && (p.answer.n < 0 || !Number.isInteger(p.answer.n))) {
      fail(`quick ${skill} bad answer: ${p.text} ${JSON.stringify(p.answer)}`); break;
    }
  }
}

// ---------- bridge to Miscount ----------
{
  const g = MM.maps.parse(MM.maps.OVERWORLD, '~');
  for (const ch of ['u', 'A', 'B', 'K']) {
    const found = MM.maps.find(g, ch);
    if (found.length !== 1) fail(`overworld has ${found.length} '${ch}', want 1`);
  }
  // without the bridge, the east bank must be unreachable
  const reach = (withBridge) => {
    const grid = MM.maps.parse(MM.maps.OVERWORLD, '~');
    if (withBridge) for (const b of MM.maps.BRIDGE) grid[b.y][b.x] = '=';
    const start = MM.maps.find(grid, 'P')[0];
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    let found = 0;
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
        const ch = grid[ny][nx];
        const k = nx + ',' + ny;
        if (seen.has(k)) continue;
        if ('uABK'.includes(ch)) { found++; seen.add(k); continue; }
        if (ch !== '.' && ch !== 'P' && ch !== '=') continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    return found;
  };
  if (reach(false) > 0) fail('east bank reachable WITHOUT the bridge — river is leaky');
  if (reach(true) !== 4) fail('not all east-bank targets (u,A,B,K) reachable with the bridge: ' + reach(true));
}

// ---------- Wave 8a (P2): SKILL_ICONS registry completeness ----------
// A monster telegraph icon must exist for every topic a parent can toggle —
// same "registry-complete" contract as SKILL_NAMES/PARENT_TOPICS above.
{
  for (const skill of MM.data.PARENT_TOPICS) {
    if (!MM.data.SKILL_ICONS[skill]) fail(`skill '${skill}' has no MM.data.SKILL_ICONS entry — a future topic must ship with a telegraph icon`);
  }
}

// ---------- Wave 8a (P2): mon.skill cap-leak ----------
// A monster bound to a topic (its telegraph icon) must fall back to the
// general pool the instant a parent switches that topic off — the exact
// same "disabled everywhere" contract the rest of cap-leak above checks.
{
  const st = { parent: { topics: { long_division: false } }, mastery: {}, dungeonIndex: 11, floorIndex: 0 };
  MM.engine.state = st;
  let sawLeak = false;
  for (let i = 0; i < 300; i++) {
    const p = MM.engine.pickRegularMonsterProblem({ skill: 'long_division' });
    if (p.skill === 'long_division') sawLeak = true;
  }
  if (sawLeak) fail('cap-leak: a mon.skill-bound monster served a disabled topic (long_division)');
  MM.engine.state = null;
}

// ---------- Wave 8a (P7): the Overwhelm rule ----------
{
  const st = { level: 1, dungeonIndex: 1 };
  MM.engine.state = st;
  if (MM.engine.isOverwhelming({})) fail('overwhelm: a level-1 kid in dungeon 1 should never trigger overwhelm');
  st.level = 20;
  if (!MM.engine.isOverwhelming({})) fail('overwhelm: level 20 vs dungeon 1 (expected level 1, gap 19) should trigger overwhelm');
  if (MM.engine.isOverwhelming({ boss: true })) fail('overwhelm: bosses must never be skipped, however overleveled');
  if (MM.engine.isOverwhelming({ arena: true })) fail('overwhelm: arena golems must never be skipped');
  if (MM.engine.isOverwhelming({ gauntlet: true })) fail('overwhelm: gauntlet bosses must never be skipped');
  st.level = 6; // exactly at the gap (dungeonIndex 1 + OVERWHELM_GAP 6 - 1... check boundary)
  st.dungeonIndex = 1;
  // gap must be >= 6 to trigger — level 6 vs expected 1 is a gap of 5, not yet overwhelming
  if (MM.engine.isOverwhelming({})) fail('overwhelm: a gap of 5 should not yet trigger (boundary check)');
  st.level = 7; // gap of 6 — right at the threshold
  if (!MM.engine.isOverwhelming({})) fail('overwhelm: a gap of exactly 6 should trigger');
  MM.engine.state = null;
}

// ---------- Pedagogy pass (2026-07-12): solutions must TEACH ----------
// The worked solution is the game's only teaching moment. These checks pin
// the process-narration so a refactor can't quietly regress to "line up the
// columns: <answer>".
{
  let sawBorrow = false, sawCarry = false, sawBringDown = false, sawLateJoin = false;
  for (let i = 0; i < 400 && !(sawBorrow && sawCarry); i++) {
    const p = MM.problems.generate('multidigit_addsub', 3);
    if (/borrow/.test(p.solution)) sawBorrow = true;
    if (/carry/.test(p.solution)) sawCarry = true;
  }
  if (!sawBorrow) fail('pedagogy: subtraction solutions never narrate a borrow');
  if (!sawCarry) fail('pedagogy: addition solutions never narrate a carry');
  for (let i = 0; i < 60 && !sawBringDown; i++) {
    if (/bring down/.test(MM.problems.generate('long_division', 3).solution)) sawBringDown = true;
  }
  if (!sawBringDown) fail('pedagogy: long division solutions never walk the algorithm');
  if (/a eighth/.test(JSON.stringify(Array.from({ length: 200 }, () => MM.problems.generate('music_reading', 2).text)))) {
    fail('pedagogy: "a eighth note" regressed');
  }
  // late topics join review pools once their home dungeon is done
  const stLate = { parent: { topics: {} }, mastery: {}, isles: { spireDone: true, hallsDone: false, breakwaterDone: true } };
  const met = MM.mastery.metLateTopics(stLate);
  if (met.join(',') !== 'time_reading,geometry') fail(`pedagogy: metLateTopics wrong: ${met}`);
  for (let i = 0; i < 3000 && !sawLateJoin; i++) {
    if (MM.mastery.pickCombatProblem(stLate, 10).skill === 'time_reading') sawLateJoin = true;
  }
  if (!sawLateJoin) fail('pedagogy: a met late topic never appears in mainland review');
}

// ---------- Brave pacing rule (2026-07-13): combat stays QUICK under brave ----------
// Live playtest served 9,208 − 8,587 in a "quick" fight (sticky brave +
// full-depth jump). Pinned forever: brave combat problems never show an
// operand ≥ 100 in the multi-digit topics, and always differ from base.
{
  const st = { parent: { topics: {} }, mastery: {}, brave: true };
  for (const sk of ['multidigit_addsub', 'multidigit_mult', 'decimals_ps', 'word_problems']) {
    st.mastery[sk] = { attempts: 40, correct: 38, recent: Array(10).fill(true) }; // tier 3 kid
  }
  let heavy = 0, stepped = 0, draws = 0;
  for (let i = 0; i < 2000; i++) {
    const p = MM.mastery.combatProblem(st, 'multidigit_addsub');
    draws++;
    const nums = (p.text.match(/[\d,]+/g) || []).map(x => Number(x.replace(/,/g, '')));
    if (nums.some(n => n >= 100)) { heavy++; if (heavy === 1) console.log('   heavy brave-combat sample:', p.text.replace(/\n/g, ' ')); }
    if (/then (add|subtract)|[+−] \d+ [+−] \d+/.test(p.text)) stepped++;
  }
  if (heavy) fail(`brave pacing: ${heavy}/${draws} brave combat problems showed a 3+ digit operand`);
  if (!stepped) fail('brave pacing: brave combat problems never gained their extra step');
}

// ---------- Version stamp (2026-07-13): display never drifts from cache ----------
{
  // tracker.js isn't require()d headlessly — compare the two SOURCE files
  const fsv = require('fs');
  const swSrc = fsv.readFileSync(__dirname + '/../sw.js', 'utf8').match(/VERSION = '([^']+)'/);
  const trSrc = fsv.readFileSync(__dirname + '/../js/tracker.js', 'utf8').match(/MM\.VERSION = '([^']+)'/);
  if (!swSrc || !trSrc) fail('version: VERSION constant missing from sw.js or tracker.js');
  else if (trSrc[1] !== swSrc[1]) fail(`version drift: tracker.js ${trSrc[1]} !== sw.js ${swSrc[1]}`);
}

// ---------- Music pass (v1.7.0): real-recording roster audit ----------
// Nobody can hear headless Node — but the manifest is checkable: every
// track names a real committed file, carries its attribution (the CC
// licenses REQUIRE it), sits in a known mood pool, every pool has at
// least one piece, and there is no 'battle' pool at all (battles are
// silent by design — SFX own the fight).
{
  require('../js/music.js');
  const fsm = require('fs');
  const tracks = MM.music.TRACKS;
  const MOODS = ['world', 'dungeon', 'isles', 'gentle'];
  if (!Array.isArray(tracks) || !tracks.length) fail('music: TRACKS manifest missing or empty');
  const ids = new Set();
  for (const t of tracks) {
    if (!t.id || !t.src || !t.mood || !t.title) fail(`music: track '${t.id || t.src}' malformed (needs id/src/mood/title)`);
    if (ids.has(t.id)) fail(`music: duplicate track id '${t.id}'`);
    ids.add(t.id);
    if (!MOODS.includes(t.mood)) fail(`music '${t.id}': unknown mood '${t.mood}' (battles are silent — no battle pool)`);
    if (!fsm.existsSync(__dirname + '/../' + t.src)) fail(`music '${t.id}': file ${t.src} is not in the repo`);
    if (!/public domain|CC0|CC BY/i.test(t.title)) fail(`music '${t.id}': title carries no license/attribution — CC tracks may not ship without one`);
  }
  for (const m of MOODS) {
    if (!tracks.some(t => t.mood === m)) fail(`music: the '${m}' pool is empty — that mood would be silent forever`);
  }
}

// ---------- Wave 8a (P5): rust ordering ----------
// A stale skill must outrank (sort ahead of, i.e. be treated as weaker than)
// a fresh skill even when its raw recent accuracy is slightly BETTER —
// that's the whole point of the staleness bonus: real spaced practice needs
// recency, not just accuracy.
{
  const st = { mastery: {}, lastPracticed: {} };
  for (let i = 0; i < 8; i++) MM.mastery.record(st, 'freshSkill', true);
  for (let i = 0; i < 2; i++) MM.mastery.record(st, 'freshSkill', false); // 80% recent accuracy
  st.lastPracticed.freshSkill = MM.engine.todayStr();
  for (let i = 0; i < 9; i++) MM.mastery.record(st, 'staleSkill', true);
  MM.mastery.record(st, 'staleSkill', false); // 90% recent accuracy — objectively BETTER
  const staleDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  st.lastPracticed.staleSkill = staleDate;
  if (!MM.mastery.isRusty(st, 'staleSkill')) fail('rust: a skill unpracticed 10 days should be rusty');
  if (MM.mastery.isRusty(st, 'freshSkill')) fail('rust: a skill practiced today should not be rusty');
  const ranked = MM.mastery.weakestFirst(st, ['freshSkill', 'staleSkill']);
  if (ranked[0] !== 'staleSkill') {
    fail(`rust: staleSkill (90% but stale) should outrank freshSkill (80%, not stale) in weakest-first order, got ${JSON.stringify(ranked)}`);
  }
}

// ---------- Wave 8a (DQ): "almost!" surfacing ----------
{
  const st = { mastery: {}, badges: {} };
  if (MM.mastery.almostNextTier(st, 'addsub_facts') !== null) fail('almost: a fresh skill (0 correct) should not be "almost" bronze yet');
  for (let i = 0; i < 8; i++) MM.mastery.record(st, 'addsub_facts', true); // 8 correct: 2 away from bronze (10)
  const hit = MM.mastery.almostNextTier(st, 'addsub_facts');
  if (!hit || hit.tier !== 1) fail(`almost: 8/10 correct should be "almost bronze", got ${JSON.stringify(hit)}`);
  for (let i = 0; i < 2; i++) MM.mastery.record(st, 'addsub_facts', true); // now 10 correct: bronze earned
  st.badges.addsub_facts = 1; // badgeTier is persisted separately; simulate the engine's own bookkeeping
  if (MM.mastery.almostNextTier(st, 'addsub_facts') !== null) fail('almost: exactly at a threshold (0 correct into next tier) should not still read as "almost"');
}

// ---------- Wave 8a (P6): growth tracking shape ----------
// recordAnswer must populate lastPracticed/history/recentMisses in the
// shape the parent panel and report card read — this guards the save-shape
// contract those UI reads depend on.
{
  const st = {
    mastery: {}, totals: { answered: 0, correct: 0 }, streak: 0, equipped: {},
    lastPracticed: {}, history: {}, recentMisses: {}, badges: {},
  };
  MM.engine.state = st;
  MM.engine.recordAnswer('addsub_facts', true, { text: '2+2', kidAnswer: '4' });
  if (!st.lastPracticed.addsub_facts) fail('growth tracking: recordAnswer did not set lastPracticed');
  const today = MM.engine.todayStr();
  if (!st.history[today] || !st.history[today].addsub_facts) fail('growth tracking: recordAnswer did not write a history ledger entry');
  if (st.history[today].addsub_facts.a !== 1 || st.history[today].addsub_facts.c !== 1) {
    fail(`growth tracking: history entry wrong shape: ${JSON.stringify(st.history[today].addsub_facts)}`);
  }
  MM.engine.recordAnswer('addsub_facts', false, { text: '3+3', kidAnswer: '5' });
  const misses = st.recentMisses.addsub_facts;
  if (!misses || misses.length !== 1 || misses[0].kidAnswer !== '5' || misses[0].text !== '3+3') {
    fail(`growth tracking: recentMisses did not capture the wrong answer verbatim: ${JSON.stringify(misses)}`);
  }
  MM.engine.state = null;
}

// ================= Wave 8b: the Two Kids Update, the heart =================

// ---------- P1: the Soothe flavor pools ----------
// MM.data.flavor falls back to FLAVOR.generic PER KIND — so a family missing a
// pool is fine, but `generic` missing one hands pick() an undefined array and
// throws. Every sprite family that any monster actually uses must resolve.
{
  const families = new Set();
  for (const r of MM.data.MONSTERS) {
    for (const t of r.types) families.add(t.sprite);
    families.add(r.boss.sprite);
  }
  families.add(MM.data.GOLEM_CARD.sprite);
  for (const kind of ['enter', 'miss', 'win', 'soothe', 'fret']) {
    if (!MM.data.FLAVOR.generic[kind] || !MM.data.FLAVOR.generic[kind].length) {
      fail(`FLAVOR.generic is missing the '${kind}' pool — MM.data.flavor would throw on any family that lacks it`);
    }
    for (const fam of families) {
      let line;
      try { line = MM.data.flavor(fam, kind, 'Test Monster'); }
      catch (e) { fail(`flavor('${fam}', '${kind}') threw: ${e.message}`); continue; }
      if (!line || typeof line !== 'string') fail(`flavor('${fam}', '${kind}') returned nothing`);
      if (/\{name\}/.test(line)) fail(`flavor('${fam}', '${kind}') left an unsubstituted {name}`);
    }
  }
  // every family a monster uses needs its own soothe + fret voice, not the fallback
  for (const fam of families) {
    if (!MM.data.FLAVOR[fam] || !MM.data.FLAVOR[fam].soothe) fail(`sprite family '${fam}' has no soothe pool of its own`);
    if (!MM.data.FLAVOR[fam] || !MM.data.FLAVOR[fam].fret) fail(`sprite family '${fam}' has no fret pool of its own`);
    if (!MM.data.SOOTHE_GESTURE[fam]) fail(`sprite family '${fam}' has no soothe victory gesture`);
  }
  // bespoke lines must name real monsters (a typo'd key would silently never
  // fire) — rosters plus the shared special cards (Homework Golem, Mimic)
  const realNames = new Set(MM.data.MONSTERS.flatMap(r => [...r.types.map(t => t.name), r.boss.name])
    .concat([MM.data.GOLEM_CARD.name, MM.data.MIMIC_CARD.name]));
  for (const name of Object.keys(MM.data.SOOTHE_BESPOKE)) {
    if (!realNames.has(name)) fail(`SOOTHE_BESPOKE names '${name}', which is not a monster in any roster`);
  }
  // sootheLine must work for every monster in the game
  for (const r of MM.data.MONSTERS) {
    for (const t of [...r.types, r.boss]) {
      const line = MM.data.sootheLine(t);
      if (!line || /\{name\}/.test(line)) fail(`sootheLine('${t.name}') broken: ${line}`);
    }
  }
}

// ---------- P1: gentle instruments sit at MATCHED tiers ----------
// Identity is offered, never enforced — so a gentle weapon must never be
// strictly better OR strictly worse than the bold weapon it sits beside.
{
  const gentle = MM.data.WEAPONS.filter(w => w.gentle);
  if (gentle.length < 3) fail(`expected at least 3 gentle instruments, got ${gentle.length}`);
  for (const g of gentle) {
    if (!g.verb) fail(`gentle weapon '${g.name}' has no soothing verb`);
    // a ranged gentle weapon must be one atk BELOW its melee price-peer, the
    // same trade the Smuggler's Crossbow makes (that is the whole ranged rule)
    const peers = MM.data.WEAPONS.filter(w => !w.gentle && !w.ranged && Math.abs(w.price - g.price) <= 60 && w.price > 0);
    if (g.ranged && peers.length) {
      if (!peers.some(p => g.atk < p.atk)) {
        fail(`ranged gentle weapon '${g.name}' (atk ${g.atk}) is not below its melee peer — ranged must trade power for reach`);
      }
    }
  }
  // and the starter pair must be exactly equal — the Ceremony is a question, not a handicap
  const stick = MM.data.WEAPONS.find(w => w.id === 'stick');
  const ribbon = MM.data.WEAPONS.find(w => w.id === 'ribbon');
  if (!ribbon) fail('no Ribbon Streamer — the Ceremony has nothing to hand a gentle kid');
  else if (ribbon.atk !== stick.atk || ribbon.price !== stick.price) {
    fail(`the Ceremony's two starters must be identical in power: stick atk ${stick.atk}/${stick.price}g vs ribbon atk ${ribbon.atk}/${ribbon.price}g`);
  }
  if (!MM.data.GEMS.find(g => g.id === 'lullaby')) fail('the Lullaby gem is missing');
}

// ---------- P3: Brave draws harder, and never at a gate ----------
{
  const st = { mastery: {}, parent: { topics: {} }, brave: false };
  // a settled kid at tier 3 in a topic: brave must cap, not overflow
  for (let i = 0; i < 20; i++) MM.mastery.record(st, 'addsub_facts', true);
  if (MM.mastery.tierFor(st, 'addsub_facts') !== 3) fail('fixture: expected tier 3');
  if (MM.mastery.braveTierFor(st, 'addsub_facts') !== 3) fail('brave: tier must CAP at 3, never exceed it');
  // a fresh kid at tier 1: brave lifts to 2
  const fresh = { mastery: {}, parent: { topics: {} } };
  if (MM.mastery.tierFor(fresh, 'geometry') !== 1) fail('fixture: expected tier 1');
  if (MM.mastery.braveTierFor(fresh, 'geometry') !== 2) fail('brave: tier 1 must lift to 2');

  // combat problems: normally QUICK (tier-less); brave ADDS ONE EXTRA STEP to
  // the SAME quick draw, uniformly across every topic including facts — the
  // v1.7.0 dual-form ⚡ toggle redesign (mastery.combatDualForm/combatProblem)
  // supersedes the old "brave draws an independently-random full-depth
  // problem" rule, because a mid-round toggle needs BOTH forms to share one
  // draw's operands (nothing to fish). See the dual-form block below.
  const calm = { mastery: {}, parent: { topics: {} }, brave: false };
  const bold = { mastery: {}, parent: { topics: {} }, brave: true };
  let quicks = 0, stepped = 0;
  for (let i = 0; i < 200; i++) {
    if (MM.mastery.combatProblem(calm, 'addsub_facts').quick) quicks++;
    const p = MM.mastery.combatProblem(bold, 'addsub_facts');
    if (p.quick && p._dualEligible && p.text !== p._dualBase.text) stepped++;
  }
  if (quicks !== 200) fail(`brave off: combat must draw QUICK problems (got ${quicks}/200)`);
  if (stepped < 195) fail(`brave on: combat must gain its extra step almost every draw (got ${stepped}/200)`);

  // THE PILLAR: gates are never bumped. gateTier ignores brave unless the caller
  // explicitly says "this is a boss" — a harder problem for no reward is a trap,
  // and bravery is never a trap.
  const braveSt = { mastery: {}, parent: { topics: {} }, brave: true };
  for (let i = 0; i < 20; i++) MM.mastery.record(braveSt, 'muldiv_facts', true); // tier 3 -> base gate tier 3
  const fresh2 = { mastery: {}, parent: { topics: {} }, brave: true };
  const gateNoFlag = MM.mastery.gateTier(fresh2, 'geometry');        // a door/chest/seal
  const gateBoss = MM.mastery.gateTier(fresh2, 'geometry', true);    // a boss
  if (gateNoFlag !== 2) fail(`brave must NOT lift a door/chest/seal (got tier ${gateNoFlag}, expected the normal 2)`);
  if (gateBoss !== 3) fail(`brave SHOULD lift a boss problem (got tier ${gateBoss}, expected 3)`);
}

// ---------- v1.7.0: the dual-form ⚡ toggle ----------
{
  const st = { mastery: {}, parent: { topics: {} }, brave: false };
  // combat: base and extended share the SAME first two operands (anti-fishing)
  let sweepOk = true;
  for (let i = 0; i < 50; i++) {
    const p = MM.mastery.combatProblem(st, 'multidigit_addsub');
    if (!p._dualEligible) continue;
    const baseNums = (p._dualBase.text.match(/\d+/g) || []).slice(0, 2);
    const extNums = (p._dualExtended.text.match(/\d+/g) || []).slice(0, 2);
    if (baseNums.join(',') !== extNums.join(',')) sweepOk = false;
  }
  if (!sweepOk) fail('dual-form: base and extended combat forms must share the same first two operands');
  // eligible combat problem: extended form actually differs from base
  const combatP = MM.mastery.combatProblem(st, 'addsub_facts');
  if (!combatP._dualEligible) fail('dual-form: addsub_facts combat problems must be toggle-eligible');
  if (combatP._dualExtended.text === combatP._dualBase.text) fail('dual-form: extended combat form must differ from base');
  // ineligible (deep) combat kinds fall back gracefully (no _dualEligible, no crash)
  const deepP = MM.mastery.combatProblem(st, 'time_reading');
  if (deepP._dualEligible) fail('dual-form: time_reading (clock/choice quick problems) should not claim eligibility');

  // boss tail: at a tier-3 kid, a brave boss problem's extended (tailed) form
  // must differ from its own base (untailed) form — the tier lift alone caps
  // at 3 and can otherwise deliver nothing new, per the "…and then" tail fix.
  const tier3 = { mastery: {}, parent: { topics: {} }, brave: true };
  for (let i = 0; i < 20; i++) MM.mastery.record(tier3, 'multidigit_mult', true);
  let tailOk = true, tailPresentCount = 0;
  for (let i = 0; i < 50; i++) {
    const b = MM.mastery.pickBossProblem(tier3, 4, true); // dungeon 4 = multidigit_mult
    if (!b._dualEligible) continue;
    tailPresentCount++;
    if (b._dualExtended.text === b._dualBase.text) tailOk = false;
    const baseNums = (b._dualBase.text.match(/\d+/g) || []);
    const extNums = (b._dualExtended.text.match(/\d+/g) || []).slice(0, baseNums.length);
    if (baseNums.join(',') !== extNums.join(',')) tailOk = false;
  }
  if (!tailPresentCount) fail('dual-form: boss problems at tier 3 never produced an eligible (tailed) form in 50 draws');
  if (!tailOk) fail('dual-form: boss tail must differ from base while keeping the same leading operands');
}

// ---------- P3: the boss floor ----------
// A brave strike may never take more than a third of a boss, so a boss is
// always at least three correct answers — brave, crit, best gear, all of it.
// (A flat 2x drops every boss in the game to TWO answers; this is the guard.)
{
  for (const d of [1, 5, 10, 21]) {
    const bhp = MM.data.monsterStats(d, true).hp;
    const cap = Math.ceil(bhp / 3);
    if (cap * 2 >= bhp) fail(`boss floor broken at dungeon ${d}: two capped brave strikes (${cap}x2) would already finish a ${bhp}hp boss`);
    if (cap * 3 < bhp) fail(`boss floor too harsh at dungeon ${d}: three capped strikes (${cap}x3) cannot finish a ${bhp}hp boss`);
  }
}

// ---------- P4: the Academy's slates ----------
{
  const skills = MM.problems.spotTheError.skills();
  if (skills.length < 8) fail(`the Academy covers only ${skills.length} topics — too thin to be daily practice`);
  for (const sk of skills) {
    if (!MM.data.PARENT_TOPICS.includes(sk)) fail(`spotTheError has a slate for '${sk}', which is not a parent topic`);
    if (!MM.data.SKILL_NAMES[sk]) fail(`spotTheError skill '${sk}' has no display name`);
    for (let i = 0; i < 60; i++) {
      const flawed = MM.problems.spotTheError(sk, true);
      const clean = MM.problems.spotTheError(sk, false);
      if (!flawed || !clean) { fail(`spotTheError('${sk}') returned null`); break; }
      // the contract the slate renderer + engine depend on
      if (flawed.badStep < 0) fail(`spotTheError('${sk}', true) produced no planted error`);
      if (clean.badStep !== -1) fail(`spotTheError('${sk}', false) is not clean`);
      if (flawed.answer !== flawed.badStep) fail(`'${sk}': flawed answer index must point at the bad step`);
      if (clean.answer !== clean.steps.length) fail(`'${sk}': a clean slate's answer must be the trailing "every step is correct"`);
      if (clean.steps.length !== flawed.steps.length) fail(`'${sk}': clean and flawed slates must share a shape`);
      if (!flawed.why) fail(`'${sk}': a flawed slate with no 'why' would tell the kid "Here. undefined"`);
      if (flawed.kind !== 'choice') fail(`'${sk}': slates must be kind:'choice'`);
      // the exam must never leak into battles or the smoke loop
      if (MM.problems.GENERATORS[sk] === undefined) fail(`'${sk}' is not a real generator skill`);
    }
  }
  // spot-the-error slates are AUTHORED, not sampled — they must stay out of the
  // battle/mixed-review registries entirely (same contract as the final exam)
  for (const key of Object.keys(MM.problems.QUICK)) {
    const p = MM.problems.generateQuick(key);
    if (p.exam) fail(`QUICK['${key}'] served an exam slate into combat`);
  }
  // the Wave 7 final exam still works, and its `why` is no longer undefined
  for (let i = 0; i < MM.problems.generateExam.count; i++) {
    const p = MM.problems.generateExam(i, true);
    if (p.badStep >= 0 && !p.why) fail(`final exam slate ${i}: prob.why is empty — the mis-mark feedback would read "Here. undefined"`);
  }
  const lastSlate = MM.problems.generateExam(MM.problems.generateExam.count - 1, true);
  if (lastSlate.badStep !== -1) fail('the final exam\'s LAST slate must always be clean, whatever is asked of it');
}

// ---------- P4: the Academy honours the parent cap ----------
// A disabled topic must never reach the homework, and if a family has switched
// off every topic that HAS a slate, the Academy must not appear at all rather
// than quietly serving something they turned off.
{
  const only = 'geometry';
  const topics = {};
  for (const sk of MM.data.PARENT_TOPICS) topics[sk] = (sk === only);
  const st = { parent: { topics }, mastery: {}, taskIndex: 12 };
  MM.engine.state = st;
  const avail = MM.engine.academySkills();
  if (!avail.length) fail('academy: with geometry ON, there should be a slate available');
  for (const sk of avail) {
    if (sk !== only) fail(`academy cap-leak: offered '${sk}' when only '${only}' is enabled`);
  }
  // now disable every topic that has a slate — the entry must vanish
  const noneOn = {};
  for (const sk of MM.data.PARENT_TOPICS) noneOn[sk] = !MM.problems.spotTheError.skills().includes(sk);
  MM.engine.state = { parent: { topics: noneOn }, mastery: {}, taskIndex: 12 };
  if (MM.engine.academySkills().length) fail('academy cap-leak: served a slate when every slate-bearing topic is switched off');
  // and it is closed before Miscount is a teacher at all
  MM.engine.state = { parent: { topics: {} }, mastery: {}, taskIndex: 3 };
  if (MM.engine.academySkills().length) fail('the Academy opened before Miscount became a teacher (task 10)');
  MM.engine.state = null;
}

// ---------- P1: befriending, and the world it changes ----------
{
  const st = {
    bestiary: { seen: {}, kills: {}, gauntlet: {}, befriended: {} },
    stance: 'soothe', brave: false, pendingBadges: [],
  };
  MM.engine.state = st;
  const bat = { name: 'Echo Bat', sprite: 'bat', behavior: 'wander' };
  if (MM.engine.isBefriended(bat)) fail('a fresh profile has no friends yet');
  if (!MM.engine.recordBefriend(bat)) fail('the FIRST of a kind should report as first');
  if (MM.engine.recordBefriend(bat)) fail('the second of a kind is not the first');
  if (!MM.engine.isBefriended(bat)) fail('befriending did not stick');
  if (MM.engine.befriendedCount(st) !== 1) fail('befriended count wrong');

  // Per-creature taming (user decision 2026-07-13): ONLY a personally
  // soothed (becalmed) monster is pacified — its wild kin still hunt, even
  // with the kind in the book. Bosses can never be becalmed.
  if (MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'wander' })) fail('a wild monster of a befriended KIND must still hunt (taming is per-creature)');
  if (!MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'wander', becalmed: true })) fail('a becalmed monster is pacified');
  if (!MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'guard', becalmed: true })) fail('a personally soothed guard is off duty (becalmed pacifies any behavior)');
  if (MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', boss: true, becalmed: true })) fail('a boss is never pacified');
  if (MM.engine.isPacified({ name: 'Cave Wisp', sprite: 'ghost', behavior: 'wander' })) fail('an unbefriended wanderer must still hunt');

  // befriending is monotonic — like a badge, it is never taken away
  MM.engine.recordKill(bat);
  if (!MM.engine.isBefriended(bat)) fail('killing one later must NOT un-friend the species (no punishment mechanics)');
  MM.engine.state = null;
}

// ---------- P1: the calmed palette ----------
// Every colour blended, on every family — including skeleton and mage, which
// have no A/B keys at all and would silently no-op under a naive transform.
{
  for (const fam of ['slime', 'rat', 'bat', 'spider', 'skeleton', 'ghost', 'golem', 'mage', 'snake']) {
    const base = MM.sprites.DEFS[fam].colors;
    const soft = MM.sprites.softPalette(fam, null, 0.45);
    const keys = Object.keys(soft);
    if (keys.length !== Object.keys(base).length) fail(`softPalette('${fam}') dropped or added keys`);
    for (const k of keys) {
      if (String(soft[k]).toLowerCase() === String(base[k]).toLowerCase()) {
        fail(`softPalette('${fam}') left key '${k}' untouched — a family with no A/B would render uncalmed`);
      }
    }
    // sorted keys => a stable MM.sprites cache key (the cache stringifies the palette)
    if (JSON.stringify(keys) !== JSON.stringify(keys.slice().sort())) {
      fail(`softPalette('${fam}') emits unsorted keys — the sprite cache would mint duplicate canvases`);
    }
  }
}

// ================= Wave 9: "The Tending" (post-game practice) =================

// ---------- P2: the Spiral Stair's chunk templates ----------
// Own dedicated reachability audit (not the shared door-gating one — its
// 'D' doors are practice stations in open rooms, not corridor gates).
{
  const bfsReach = (rows, label) => {
    rows.forEach((r, i) => { if (r.length !== 12) fail(`${label} row ${i} length ${r.length}, want 12`); });
    if (rows.length !== 10) fail(`${label} has ${rows.length} rows, want 10`);
    const g = MM.maps.parse(rows, '#');
    const X = MM.maps.find(g, 'X')[0];
    if (!X) return fail(`${label}: no 'X' arrival tile`);
    const seen = new Set([X.x + ',' + X.y]);
    const q = [X];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || ny >= g.length || nx < 0 || nx >= g[0].length || g[ny][nx] === '#') continue;
        const k = nx + ',' + ny;
        if (!seen.has(k)) { seen.add(k); q.push({ x: nx, y: ny }); }
      }
    }
    for (const ch of ['D', 'm', '>', '*', 'b']) {
      for (const p of MM.maps.find(g, ch)) {
        if (!seen.has(p.x + ',' + p.y)) fail(`${label}: '${ch}' at ${p.x},${p.y} unreachable from X`);
      }
    }
  };
  MM.maps.SPIRAL_REGULAR.forEach((rows, i) => bfsReach(rows, `spiral regular chunk ${i}`));
  MM.maps.SPIRAL_LANDING.forEach((rows, i) => bfsReach(rows, `spiral landing chunk ${i}`));
  if (MM.maps.SPIRAL_REGULAR.length < 6) fail('spiral: fewer than 6 regular chunks — not enough variety');
  if (MM.maps.SPIRAL_LANDING.length < 2) fail('spiral: fewer than 2 landing chunks');

  // materialization: the right length, landings on every 5th floor, and the
  // very top floor has no way further up (the tower has to end somewhere)
  const floors = MM.maps.dungeonFloors(MM.maps.SPIRAL_INDEX);
  if (floors.length !== MM.maps.SPIRAL_MAX_FLOOR) fail(`spiral: expected ${MM.maps.SPIRAL_MAX_FLOOR} floors, got ${floors.length}`);
  const isLandingFloor = f => MM.maps.find(MM.maps.parse(floors[f - 1], '#'), 'b').length > 0;
  for (let f = 5; f <= MM.maps.SPIRAL_MAX_FLOOR; f += 5) {
    if (!isLandingFloor(f)) fail(`spiral: floor ${f} should be a landing (chest + tougher tangle)`);
  }
  if (isLandingFloor(1) || isLandingFloor(4)) fail('spiral: a non-multiple-of-5 floor should not be a landing');
  const topGrid = MM.maps.parse(floors[MM.maps.SPIRAL_MAX_FLOOR - 1], '#');
  if (MM.maps.find(topGrid, '>').length) fail('spiral: the top floor still has a way further up');
  // calling it again must return the SAME array (materialized once, not
  // reshuffled on every call — floors are stable within a session)
  if (MM.maps.dungeonFloors(MM.maps.SPIRAL_INDEX) !== floors) fail('spiral: dungeonFloors(22) is not cached/stable');
}

// ---------- P2: the Spiral's world-map entrance + per-floor difficulty ----------
{
  const ow = MM.maps.parse(MM.maps.OVERWORLD, '~');
  if (MM.maps.find(ow, 'H').length !== 1) fail('overworld: want exactly one Spiral Stair tower (H)');
  MM.engine.state = { endingDone: false };
  if (MM.engine.spiralOpen()) fail('spiralOpen: must stay shut before the ending');
  MM.engine.state.endingDone = true;
  if (!MM.engine.spiralOpen()) fail('spiralOpen: should open once the ending is done');
  MM.engine.state = null;
  // roster: 2 tangle types + a tougher landing boss, no crueler than the rest
  const roster = MM.data.MONSTERS[MM.maps.SPIRAL_INDEX - 1];
  if (!roster || roster.types.length < 2 || !roster.boss) fail('spiral: MONSTERS roster incomplete');
}

// ---------- P1: Daily Tangles — placement is DERIVED, never hand-listed ----------
{
  const ow = MM.maps.parse(MM.maps.OVERWORLD, '~');
  for (let trial = 0; trial < 8; trial++) {
    MM.engine.state = { endingDone: true, tangles: null };
    MM.engine.refreshTangles();
    const s = MM.engine.state;
    if (!s.tangles || !s.tangles.items.length) { fail('refreshTangles: produced no tangles'); break; }
    if (s.tangles.items.length < 1 || s.tangles.items.length > 3) fail(`refreshTangles: expected 1-3 tangles, got ${s.tangles.items.length}`);
    for (const t of s.tangles.items) {
      if (ow[t.y][t.x] !== '.') fail(`tangle placed on non-walkable tile '${ow[t.y][t.x]}' at ${t.x},${t.y}`);
    }
  }
  // gated on endingDone, and regenerates only on a real day-flip (bounty-board recipe)
  MM.engine.state = { endingDone: false, tangles: null };
  MM.engine.refreshTangles();
  if (MM.engine.state.tangles !== null) fail('refreshTangles: must stay null before the ending');
  const today = MM.engine.todayStr();
  MM.engine.state = { endingDone: true, tangles: { date: today, items: [{ x: 1, y: 1, done: false }] } };
  MM.engine.refreshTangles();
  if (MM.engine.state.tangles.items.length !== 1 || MM.engine.state.tangles.items[0].x !== 1) {
    fail('refreshTangles: regenerated on the SAME day — should only flip on a real day change');
  }
  MM.engine.state = null;

  // nearestLandmark: a name, always — never crashes on an edge coordinate
  const name = MM.engine.nearestLandmark(0, 0);
  if (typeof name !== 'string' || !name) fail('nearestLandmark: did not return a usable name');
}

// ---------- P3: cosmetic gold sinks — data completeness ----------
{
  for (const kind of ['rug', 'garden', 'library']) {
    const it = MM.data.CASTLE_FURNISH[kind];
    if (!it || !it.name || !it.emoji || !it.price || !it.empty || !it.bought) {
      fail(`CASTLE_FURNISH.${kind} is missing a required field`);
    }
  }
  if (!MM.data.STATUE_PRICE || !MM.data.STATUE_EMPTY || typeof MM.data.STATUE_LINE('Test Boss') !== 'string') {
    fail('statue data incomplete');
  }
  const hatIds = new Set();
  for (const h of MM.data.PET_HATS) {
    // earned hats (the Practice Yard set) carry no price — they're never sold
    if (!h.id || !h.name || !h.emoji || (!h.price && !h.earned)) fail(`PET_HATS entry "${h.id}" is missing a required field`);
    hatIds.add(h.id);
  }
  if (hatIds.size !== MM.data.PET_HATS.length) fail('duplicate ids in MM.data.PET_HATS');
  for (const n of [10, 50, 100]) {
    const ms = MM.data.TANGLE_MILESTONES[n];
    if (!ms || !ms.title || !ms.body) fail(`TANGLE_MILESTONES[${n}] is missing a required field`);
  }
}

// ---------- P3: buying/wearing pet hats, and commissioning statues ----------
{
  MM.engine.state = {
    gold: 500, petHats: [], isles: { pet: { name: 'Fido', hat: null } }, castleFurnish: { statues: [] },
  };
  const cheap = MM.data.PET_HATS.filter(h => h.price).slice().sort((a, b) => a.price - b.price)[0];
  const r1 = MM.engine.petHatAction(cheap.id);
  if (!r1.ok) fail('petHatAction: buying an affordable hat should succeed');
  if (MM.engine.state.isles.pet.hat !== cheap.id) fail('petHatAction: buying a hat should wear it immediately');
  if (!MM.engine.state.petHats.includes(cheap.id)) fail('petHatAction: bought hat not recorded as owned');
  if (MM.engine.state.gold !== 500 - cheap.price) fail('petHatAction: gold not deducted correctly');
  MM.engine.petHatAction(cheap.id); // already worn -> take it off
  if (MM.engine.state.isles.pet.hat !== null) fail('petHatAction: bumping a worn (owned) hat again should take it off');
  const goldBefore = MM.engine.state.gold;
  MM.engine.petHatAction(cheap.id); // owned, not worn -> wear again, no charge
  if (MM.engine.state.gold !== goldBefore) fail('petHatAction: re-wearing an OWNED hat must be free');

  MM.engine.state.gold = 0;
  const pricey = MM.data.PET_HATS.filter(h => h.price).slice().sort((a, b) => b.price - a.price)[0];
  const r2 = MM.engine.petHatAction(pricey.id);
  if (r2.ok || !r2.msg) fail('petHatAction: buying with insufficient gold should fail with a message, not silently succeed');

  MM.engine.state.gold = 1000;
  MM.engine.commissionStatue(0, 'The Murk');
  if (MM.engine.state.castleFurnish.statues[0] !== 'The Murk') fail('commissionStatue: did not record the boss name');
  if (MM.engine.state.gold !== 1000 - MM.data.STATUE_PRICE) fail('commissionStatue: gold not deducted correctly');
  MM.engine.state = null;
}

// ---------- P4: Academy growth + Hall of Heroes plumbing ----------
{
  if (MM.data.academyGrowthLine(0) !== MM.data.ACADEMY_GROWTH[0].line) fail('academyGrowthLine(0) should be the starting line');
  if (MM.data.academyGrowthLine(9) !== MM.data.ACADEMY_GROWTH[0].line) fail('academyGrowthLine(9) should not yet show the 10-attendance line');
  if (MM.data.academyGrowthLine(10) === MM.data.ACADEMY_GROWTH[0].line) fail('academyGrowthLine(10) should have grown past the starting line');
  if (MM.data.academyGrowthLine(999) !== MM.data.ACADEMY_GROWTH[MM.data.ACADEMY_GROWTH.length - 1].line) {
    fail('academyGrowthLine: a very high count should show the LAST (biggest) growth stage');
  }
}

// ---------- migration: an old (pre-Wave-9) save gets sane defaults ----------
{
  localStorage.setItem('mathmaker2_save_wave9migrant', JSON.stringify({
    version: 4, name: 'wave9migrant', hp: 24, maxhp: 24, stamina: 100, maxStamina: 100,
    gold: 10, level: 1, xp: 0, potions: 1, difficulty: 'hero',
    parent: { pin: null, topics: {} }, taskIndex: 13, haveItem: false, tasksDone: [1,2,3,4,5,6,7,8,9,10,11,12,13],
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: {}, keys: {}, egg: null, pet: null },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true,
    endingDone: true, gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  MM.engine.load('wave9migrant');
  const s = MM.engine.state;
  if (s.daysTended !== 0) fail('migration: daysTended should default to 0');
  // this fixture has endingDone:true, so E.enterWorld's own E.refreshTangles()
  // call populates tangles immediately on load — correct behavior, not a bug;
  // just check the shape is sane rather than asserting it stayed null.
  if (s.tangles !== null && (!s.tangles.date || !Array.isArray(s.tangles.items))) {
    fail('migration: tangles should be null or a well-formed {date, items}');
  }
  if (!s.spiral || s.spiral.highest !== 0 || s.spiral.landing !== 0) fail('migration: spiral should default to {highest:0, landing:0}');
  if (s.academyTotal !== 0) fail('migration: academyTotal should default to 0');
  if (!s.castleFurnish || s.castleFurnish.rug !== false || !Array.isArray(s.castleFurnish.statues)) fail('migration: castleFurnish should default sensibly');
  if (!Array.isArray(s.petHats) || s.petHats.length) fail('migration: petHats should default to an empty array');
  // v1.7.0: every new persisted flag defaults sanely for a pre-v1.7.0 save
  if (s.spiralWalkNext !== 0) fail('migration: spiralWalkNext should default to 0');
  if (s.seenSpiralWalk !== false) fail('migration: seenSpiralWalk should default to false');
  if (s.seenStairGlimmer !== false) fail('migration: seenStairGlimmer should default to false');
  if (s.spiralGlintPending !== null) fail('migration: spiralGlintPending should default to null');
  if (s.lastCatMoment !== null) fail('migration: lastCatMoment should default to null');
  MM.engine.state = null;
}

// ---------- v1.7.5: the bridge is laid the INSTANT task 10 is turned in ----------
// Regression: the bridge to Miscount's bank was only ever laid in enterWorld,
// but turning in task 10 (E.castle, on the overworld) is followed by the ending
// cutscene, which does NOT rebuild the world grid. A kid finished the ending,
// was told "cross the eastern bridge," and found no bridge — it only appeared
// after a reload or a dungeon round-trip re-ran enterWorld. (Live playtest,
// 2026-07-15.) The turn-in now lays it directly.
{
  localStorage.setItem('mathmaker2_save_bridgeturnin', JSON.stringify({
    version: 4, name: 'bridgeturnin', hp: 100, maxhp: 100, stamina: 100, maxStamina: 100,
    gold: 500, level: 8, xp: 0, potions: 1, difficulty: 'hero',
    parent: { pin: null, topics: {} }, taskIndex: 10, haveItem: true, tasksDone: [1,2,3,4,5,6,7,8,9],
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: {}, keys: {}, egg: null, pet: null },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true,
    endingDone: false, gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  MM.engine.load('bridgeturnin');
  MM.engine.enterWorld(); // grid built while task 10 is still in hand — no bridge yet
  const bs = MM.engine.state;
  const bridgeStr = () => MM.maps.BRIDGE.map(c => bs.grid[c.y][c.x]).join('');
  if (bridgeStr() !== '~~~') fail(`bridge: should be unlaid river before task 10 is turned in (got '${bridgeStr()}')`);
  const realVictory = MM.ui.victory;
  MM.ui.victory = () => {}; // the turn-in ends in the ending; stub it out headlessly
  MM.engine.castle();       // turn in task 10 via the real code path — NO manual enterWorld after
  MM.ui.victory = realVictory;
  if (!bs.tasksDone.includes(10)) fail('bridge: turning in task 10 must record it in tasksDone');
  if (bridgeStr() !== '===') fail(`bridge: task 10 turn-in must lay all three planks immediately, without a world rebuild (got '${bridgeStr()}')`);
  MM.engine.state = null;
}

// ---------- the Practice Yard (the Tutor): drills, stars, milestones ----------
{
  // every card's drill generates a well-formed problem with a real answer
  for (const c of MM.data.YARD_CARDS) {
    for (let k = 0; k < 40; k++) {
      const p = MM.problems.yardDrill(c.id);
      if (!p || !p.text || !p.answer || p.kind !== 'number') fail(`yardDrill(${c.id}) produced a malformed problem`);
    }
  }
  // card registry: 14 unique cards, prereqs point at real cards, each has a tip
  if (MM.data.YARD_CARDS.length !== 14) fail(`YARD_CARDS: expected 14, got ${MM.data.YARD_CARDS.length}`);
  const ids = new Set(MM.data.YARD_CARDS.map(c => c.id));
  if (ids.size !== 14) fail('YARD_CARDS: duplicate ids');
  for (const c of MM.data.YARD_CARDS) {
    for (const p of c.prereq) if (!ids.has(p)) fail(`YARD_CARDS: ${c.id} prereq "${p}" is not a card`);
    if (!c.tip || !c.label || !c.track) fail(`YARD_CARDS: ${c.id} missing a field`);
  }
  for (const ms of MM.data.YARD_MILESTONES) {
    for (const cid of ms.cards) if (!ids.has(cid)) fail(`milestone ${ms.id} references unknown card "${cid}"`);
    if (!ms.reward || !ms.line || !ms.need) fail(`milestone ${ms.id} missing a field`);
  }
  // hat/charm ids the milestones grant must exist
  for (const ms of MM.data.YARD_MILESTONES) {
    if (ms.reward.hat && !MM.data.petHatById(ms.reward.hat)) fail(`milestone ${ms.id} grants unknown hat "${ms.reward.hat}"`);
    if (ms.reward.charm && !MM.data.charmById(ms.reward.charm)) fail(`milestone ${ms.id} grants unknown charm "${ms.reward.charm}"`);
  }

  // star progression + milestone firing, through the real engine
  MM.engine.state = {
    yard: { stars: {}, milestones: {}, challenge: null, seen: false },
    potions: 0, gold: 0, xp: 0, level: 1, titles: [],
    items: { food: {}, charms: [] }, petHats: [], isles: { pet: null },
  };
  const S = MM.engine.state;
  const realGainXp = MM.engine.gainXp; MM.engine.gainXp = () => {}; // skip level-up machinery
  // each star is a CLEAN RUN — a miss earns nothing, no star without 8/8
  let r = MM.engine.yardComplete('doubles', 6, 8);
  if (r.star !== 0) fail(`yard: a miss (6/8) must earn no star (got ${r.star})`);
  r = MM.engine.yardComplete('doubles', 8, 8);
  if (r.star !== 1) fail(`yard: the first clean run is bronze (got ${r.star})`);
  r = MM.engine.yardComplete('doubles', 8, 8);
  if (r.star !== 2) fail(`yard: a second clean run is silver (got ${r.star})`);
  r = MM.engine.yardComplete('doubles', 8, 8);
  if (r.star !== 3) fail(`yard: a third clean run is gold (got ${r.star})`);
  r = MM.engine.yardComplete('doubles', 8, 8);
  if (r.star !== 3) fail(`yard: gold is the cap (got ${r.star})`);
  if (MM.engine.yardStar('x6') !== 0 || MM.engine.yardUnlocked('x6')) fail('yard: x6 must be locked before x3');
  // Number Sense needs all three cards at silver = two clean runs each
  MM.engine.yardComplete('neardoubles', 8, 8); MM.engine.yardComplete('neardoubles', 8, 8);
  MM.engine.yardComplete('make10', 8, 8);
  if (S.yard.milestones.sense) fail('yard: the milestone must NOT fire before all three cards are silver');
  MM.engine.yardComplete('make10', 8, 8); // make10 -> silver, completing the cluster
  if (!S.yard.milestones.sense) fail('yard: Number Sense milestone should fire once all three cards are silver');
  if (!S.items.charms.includes('reckoner')) fail('yard: Number Sense should grant the Ready Reckoner charm');
  if (!S.petHats.includes('numberling')) fail('yard: Number Sense should grant the Numberling Cap');
  if (MM.engine.yardUnlocked('x3')) fail('yard: x3 must be locked before x2 earns a star');
  MM.engine.yardComplete('x2', 8, 8); // one clean run = bronze -> unlocks x3
  if (!MM.engine.yardUnlocked('x3')) fail('yard: x3 should unlock after x2 earns a star');
  // the daily challenge picks a real, unlocked, non-gold card
  const chal = MM.engine.yardChallenge();
  if (!chal || !ids.has(chal.card) || !MM.engine.yardUnlocked(chal.card)) fail('yard: challenge must pick an unlocked card');
  MM.engine.gainXp = realGainXp;
  MM.engine.state = null;
}

// ---------- Golden Numeria (NG+) is reversible ----------
// A kid started NG+ without meaning to and lost his finished kingdom. NG+ now
// snapshots the finished kingdom and can be undone from Parent Settings.
{
  const realEW = MM.engine.enterWorld; MM.engine.enterWorld = () => {}; // skip the world rebuild
  const finished = () => ({
    name: 'ngtest', ngPlus: 0, goldenSnapshot: null, endingDone: true,
    taskIndex: 14, tasksDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], haveItem: false,
    opened: { 'world:1,1': true }, bossesDefeated: { d1: true, d2: true }, defeatedAt: {}, unsealed: { d2: true },
    gearState: {}, repairSites: {}, enrollSeen: true, continent: 'west', worldPos: { x: 5, y: 5 },
    isles: { keys: {}, lenses: { tidepool: true, frostbite: true, cinderforge: true }, lampLit: true, spireDone: true, hallsDone: true, breakwaterDone: true, gullwrackRebuilt: true, egg: null, pet: null },
    level: 18, xp: 0, maxhp: 100, hp: 100, maxStamina: 100, stamina: 100,
    badges: { addsub_facts: 3 }, petHats: ['bow'], tangles: null, monsters: [],
  });
  MM.engine.state = finished();
  const s = MM.engine.state;
  MM.engine.startGolden();
  if (s.taskIndex !== 1 || s.tasksDone.length !== 0) fail('golden: startGolden must reset the kingdom');
  if (s.isles.lampLit || s.isles.spireDone) fail('golden: startGolden must re-seal the isles');
  if (s.ngPlus !== 1) fail('golden: startGolden increments ngPlus');
  if (s.level !== 18 || s.badges.addsub_facts !== 3 || !s.petHats.includes('bow')) fail('golden: the hero keeps level/badges/hats through NG+');
  if (!s.goldenSnapshot) fail('golden: startGolden must snapshot the finished kingdom');
  if (!MM.engine.canReturnToKingdom()) fail('golden: a return must be available once NG+ has started');
  // undo it
  MM.engine.returnToFinishedKingdom();
  if (s.taskIndex !== 14 || JSON.stringify(s.tasksDone) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])) fail('golden: return restores the finished tasks');
  if (!s.isles.lampLit || !s.isles.spireDone || !s.isles.breakwaterDone) fail('golden: return restores the isles flags');
  if (s.ngPlus !== 0) fail('golden: return ends the run (ngPlus back to 0)');
  if (s.goldenSnapshot) fail('golden: return clears the snapshot');
  if (s.level !== 18 || !s.petHats.includes('bow')) fail('golden: the hero still has everything after returning');
  if (MM.engine.canReturnToKingdom()) fail('golden: no return offered once back in the finished kingdom');

  // reconstruction (for a pre-reversibility NG+ save with no snapshot)
  const snap = MM.engine.reconstructFinishedSnapshot({ ngPlus: 1 });
  if (snap.taskIndex !== 14 || snap.tasksDone.length !== 13) fail('golden: reconstruction marks every task done');
  if (!snap.isles.lampLit || !snap.isles.spireDone) fail('golden: reconstruction restores the isles');
  if (Object.keys(snap.bossesDefeated).length < 13) fail('golden: reconstruction marks the dungeon bosses defeated');
  if (snap.prevNgPlus !== 0) fail('golden: reconstruction returns you to ngPlus 0');

  // migration: a pre-reversibility NG+ save gains a finished snapshot on load
  localStorage.setItem('mathmaker2_save_ngmigrant', JSON.stringify({
    version: 4, name: 'ngmigrant', hp: 100, maxhp: 100, stamina: 100, maxStamina: 100,
    gold: 100, level: 18, xp: 0, difficulty: 'hero', parent: { pin: null, topics: {} },
    taskIndex: 1, haveItem: false, tasksDone: [], ngPlus: 1, endingDone: true,
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: {}, keys: {}, egg: null, pet: null },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true,
    gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  MM.engine.load('ngmigrant');
  if (!MM.engine.state.goldenSnapshot) fail('golden migration: a pre-reversibility NG+ save must gain a finished-kingdom snapshot on load');
  if (!MM.engine.canReturnToKingdom()) fail('golden migration: the return option must become available for a migrated NG+ save');

  MM.engine.enterWorld = realEW;
  MM.engine.state = null;
}

// ---------- the top of the Spiral Stair: a once-ever summit moment ----------
{
  MM.engine.state = { spiral: { highest: 59, landing: 55, toppedOut: false }, gold: 0, px: 1, py: 1, titles: [], charmsOn: [], equipped: { ring: null, amulet: null } };
  const s = MM.engine.state;
  if (MM.engine.titlesFor(s).includes('Top of the Spiral')) fail('spiral summit: the title must not appear before the top is reached');
  MM.engine.spiralSummit();
  if (!s.spiral.toppedOut) fail('spiral summit: reaching the top sets toppedOut');
  if (s.gold <= 0) fail('spiral summit: reaching the top pays a reward');
  if (!MM.engine.titlesFor(s).includes('Top of the Spiral')) fail('spiral summit: the "Top of the Spiral" title appears once topped out');
  const goldAfter = s.gold;
  MM.engine.spiralSummit(); // once ever
  if (s.gold !== goldAfter || MM.engine.titlesFor(s).filter(t => t === 'Top of the Spiral').length !== 1) fail('spiral summit: the moment is once-ever, not repeatable');
  MM.engine.state = null;
}

// ---------- v1.7.0: boss wrong-math attacks — the pedagogy guard ----------
{
  let heavy = 0;
  for (let i = 0; i < 500; i++) {
    const lie = MM.engine.bossFalsehood();
    const [, truthNum] = lie.truthText.match(/= (-?\d+)$/);
    const [, wrongNum] = lie.text.match(/= (-?\d+)$/);
    const truth = +truthNum, wrong = +wrongNum;
    if (wrong === truth) { heavy++; continue; }
    const within30 = Math.abs(wrong - truth) <= Math.max(1, Math.abs(truth)) * 0.3;
    const offByOne = Math.abs(wrong - truth) === 1;
    if (within30 || offByOne) heavy++;
  }
  if (heavy) fail(`boss falsehood: ${heavy}/500 wrong-attack equations were within the pedagogy guard's forbidden zone (±30% or off-by-one)`);
}

// ---------- v1.7.0: Miscount's Tales of the Guessing Years ----------
{
  const tales = MM.data.MISCOUNT_GUESS_TALES;
  if (!Array.isArray(tales) || tales.length !== 4) fail(`guess tales: expected 4 tales, got ${tales && tales.length}`);
  const exact = [
    '"I once answered \'seven\' to everything for a full week. It worked twice." He holds up two fingers. "That was the worst part. It working twice. That\'s the whole trap, you see — a guess pays just often enough."',
    '"I told the king the new bridge wanted \'about a hundred\' planks. It wanted forty. We had a very tall bonfire that winter, and a very cross carpenter."',
    '"I guessed a soup once. Doubled the salt because it felt right." He shudders, with respect. "That soup could have stood sentry duty."',
    '"I called the stars \'roughly a thousand.\' Sylvia has been counting the ones I missed ever since. She sends me the number every winter. It has five digits, and it grows."',
  ];
  if (JSON.stringify(tales) !== JSON.stringify(exact)) fail('guess tales: prose must match the approved text EXACTLY, character for character');
  const golemCries = MM.data.GOLEM_BATTLE_CRIES;
  if (!Array.isArray(golemCries) || golemCries.length !== 3) fail(`golem cries: expected 3 cries, got ${golemCries && golemCries.length}`);
  if (!/SEVEN/.test(golemCries.join(''))) fail('golem cries: missing "SEVEN!"');
  if (!/CARRY NOTHING/.test(golemCries.join(''))) fail('golem cries: missing "CARRY NOTHING!"');
  if (!/ALWAYS TWELVE/.test(golemCries.join(''))) fail('golem cries: missing "IT IS ALWAYS TWELVE!"');
}

// ---------- v1.7.0: the Spiral Stair sealed line + inn cat moments ----------
{
  const preEnding = MM.data.SPIRAL_SEALED({ tasksDone: [] });
  if (!/A door with no keyhole, at the base of a winding tower/.test(preEnding)) fail('Spiral Stair: pre-ending sealed line does not match the approved text');
  if (!/It isn't ready\. Or you aren't\. Hard to say which\./.test(preEnding)) fail('Spiral Stair: sealed line missing its exact closing sentence');
  const deepEnding = MM.data.SPIRAL_SEALED({ tasksDone: Array(10).fill(1) });
  if (!/seems deeper lately/.test(deepEnding)) fail('Spiral Stair: task-10+ sealed line should gain the "seems deeper lately" evolution');
  const towerCh = ow[3][19];
  if (towerCh !== 'H') fail(`Spiral Stair: expected the tower glyph 'H' at (19,3) on a fresh overworld, found '${towerCh}'`);

  const cat = MM.data.CAT_MOMENTS;
  if (!Array.isArray(cat) || cat.length !== 6) fail(`cat moments: expected 6 moments, got ${cat && cat.length}`);
  if (!MM.data.CAT_ESCORT_LINE || typeof MM.data.CAT_ESCORT_LINE !== 'string') fail('cat moments: missing the door-escort line');
}

// ---------- v1.7.0: the Turning Stones — spiral-walk geometry ----------
{
  const stones = MM.data.TURNING_STONES;
  if (!Array.isArray(stones) || stones.length !== 13) fail(`Turning Stones: expected 13 stones, got ${stones && stones.length}`);
  const sizes = stones.map(s => s.size);
  // ascent only + uniform curve stones (design review 2026-07-13: a
  // mirrored descent would teach "after 13 comes 8" — the wrong exam answer)
  const wantSizes = [1, 1, 2, 3, 5, 8, 13, 6, 6, 6, 6, 6, 6];
  if (JSON.stringify(sizes) !== JSON.stringify(wantSizes)) fail(`Turning Stones: sizes ${JSON.stringify(sizes)} !== ${JSON.stringify(wantSizes)}`);
  const labels = stones.map(s => s.label);
  if (JSON.stringify(labels.slice(0, 7)) !== JSON.stringify(['1', '1', '2', '3', '5', '8', '13'])) {
    fail(`Turning Stones: the seven sequence stones must be carved 1,1,2,3,5,8,13 — got ${JSON.stringify(labels.slice(0, 7))}`);
  }
  if (labels.slice(7).some(l => l !== null)) fail('Turning Stones: curve stones carry no number');
  if (labels.includes('21')) fail('Turning Stones: 21 must never appear on a stone — it would spoil the ending exam\'s answer');
  // 13 UNIQUE positions (a golden spiral revisits x and y individually, so
  // only the (x,y) PAIR is guaranteed unique).
  const posKey = new Set(stones.map(s => `${s.x},${s.y}`));
  if (posKey.size !== 13) fail('Turning Stones: all 13 (x,y) positions must be unique');
  // Every stone tile is plain walkable grass on the raw overworld, NOT a new
  // glyph (the overlay recipe's whole point) — this also proves no NPC/POI
  // collision, since every POI in this game is a non-'.' glyph.
  stones.forEach(st => {
    const ch = ow[st.y][st.x];
    if (ch !== '.') fail(`Turning Stones: tile (${st.x},${st.y}) is '${ch}', not plain grass — the overlay recipe requires it stay ordinary walkable ground`);
  });
  // The TRUE golden spiral: seven quarter-arcs of Fibonacci radii chained
  // clockwise, then an unnumbered nub to the tower. The seven numbered
  // stones sit EXACTLY on their arc-start corners (float pos == int tile).
  const arcs = MM.data.SPIRAL_ARCS;
  if (!Array.isArray(arcs) || arcs.length !== 7) fail(`Turning Stones: expected 7 chained arcs, got ${arcs && arcs.length}`);
  const wantR = [1, 1, 2, 3, 5, 8, 13];
  arcs.forEach((a, i) => {
    if (a.r !== wantR[i]) fail(`spiral arc ${i}: radius ${a.r} !== Fibonacci ${wantR[i]}`);
    const st = stones[i];
    if (st.x !== a.sx || st.y !== a.sy || st.fx !== a.sx || st.fy !== a.sy) {
      fail(`spiral: numbered stone ${i} (${st.x},${st.y}) is not on its arc-start corner (${a.sx},${a.sy})`);
    }
    // start and end points lie on the arc's own circle (radius r from center)
    const dS = Math.hypot(a.sx - a.cx, a.sy - a.cy), dE = Math.hypot(a.ex - a.cx, a.ey - a.cy);
    if (Math.abs(dS - a.r) > 1e-9 || Math.abs(dE - a.r) > 1e-9) fail(`spiral arc ${i}: endpoints not on its circle`);
  });
  // the chain is continuous — each arc's end is the next arc's start
  for (let i = 1; i < arcs.length; i++) {
    if (Math.abs(arcs[i].sx - arcs[i - 1].ex) > 1e-9 || Math.abs(arcs[i].sy - arcs[i - 1].ey) > 1e-9) {
      fail(`spiral: arc ${i - 1} end (${arcs[i - 1].ex},${arcs[i - 1].ey}) != arc ${i} start (${arcs[i].sx},${arcs[i].sy})`);
    }
  }
  // the six curve stones ride the 13-arc's circle (arc 6), within 0.6 tile
  const a6 = arcs[6];
  for (let i = 7; i < 13; i++) {
    const st = stones[i];
    const dist = Math.hypot(st.fx - a6.cx, st.fy - a6.cy);
    if (Math.abs(dist - a6.r) > 0.6) fail(`spiral: curve stone ${i} is ${dist.toFixed(2)} from the 13-arc center, not ~${a6.r}`);
    if (st.x !== Math.round(st.fx) || st.y !== Math.round(st.fy)) fail(`spiral: curve stone ${i} int tile is not the rounded float pos`);
  }
  // the unnumbered nub ends AT the Spiral Stair's door (within 0.6 tile)
  const nub = MM.data.SPIRAL_NUB;
  const towers = MM.maps.find(ow, 'H');
  if (towers.length !== 1) fail(`Turning Stones: expected exactly one 'H' (Spiral Stair) tile on the mainland, found ${towers.length}`);
  else if (Math.hypot(nub.x1 - towers[0].x, nub.y1 - towers[0].y) > 0.6) {
    fail(`spiral: the nub endpoint (${nub.x1},${nub.y1}) must land on the Stair door (${towers[0].x},${towers[0].y})`);
  }
  // the nub begins at the 13-arc's tip (arc 6 end), so the curve is unbroken
  if (Math.abs(nub.x0 - a6.ex) > 1e-9 || Math.abs(nub.y0 - a6.ey) > 1e-9) fail('spiral: the nub must start at the 13-arc tip');
  // chain-params increase monotonically along the walk order
  for (let i = 1; i < stones.length; i++) {
    if (!(stones[i].t > stones[i - 1].t)) fail(`spiral: stone ${i} chain-param must exceed stone ${i - 1}'s (monotone walk)`);
  }
  // the center constant matches stone 0 (engine's glint-proximity check
  // and Sylvia's dialog both key off it)
  const c = MM.data.TURNING_STONES_CENTER;
  if (!c || c.x !== stones[0].x || c.y !== stones[0].y) fail('Turning Stones: TURNING_STONES_CENTER must be stone 0\'s tile');
  for (const st of stones) {
    const sk = MM.data.stoneSkew(st.i);
    if (typeof sk !== 'number' || Number.isNaN(sk)) fail(`Turning Stones: stoneSkew(${st.i}) is not a number`);
  }
}

// ---------- v1.7.0: the sequence walk (chimes, flourish, silence) ----------
{
  const tones = [];
  const realTone = MM.sound.tone;
  MM.sound.tone = (...a) => tones.push(a[0]);
  MM.engine.state = { name: 'spiraltest', spiralWalkNext: 0, seenSpiralWalk: false, endingDone: false, seenStairGlimmer: false, px: 0, py: 0 };
  const s = MM.engine.state;
  for (let i = 0; i < 13; i++) MM.engine.spiralStoneStep(i);
  if (tones.length !== 13) fail(`spiral walk: expected 13 chimes for a full in-order walk, got ${tones.length}`);
  if (!s.seenSpiralWalk) fail('spiral walk: a full in-order walk must set seenSpiralWalk');
  if (s.spiralWalkNext !== 0) fail('spiral walk: completing the walk resets spiralWalkNext to 0 (ready to walk again)');
  // once-EVER: walking it again does NOT re-fire (seenSpiralWalk stays, no crash)
  tones.length = 0;
  for (let i = 0; i < 13; i++) MM.engine.spiralStoneStep(i);
  if (tones.length !== 13) fail('spiral walk: a SECOND in-order walk should still chime every stone (only the flourish is once-ever)');
  // out of order: silence, no reset MESSAGE (silent state reset only)
  s.spiralWalkNext = 0;
  tones.length = 0;
  MM.engine.spiralStoneStep(5); // stone 0 never touched — 5 !== expected 0
  if (tones.length !== 0) fail('spiral walk: an out-of-order step must stay silent');
  if (s.spiralWalkNext !== 0) fail('spiral walk: an out-of-order step resets the attempt');
  // the Stair glimmer: only armed when the walk completes WHILE endingDone
  s.endingDone = false; s.seenStairGlimmer = false; s.spiralWalkNext = 0;
  MM.engine.stairGlintUntil = null;
  for (let i = 0; i < 13; i++) MM.engine.spiralStoneStep(i);
  if (s.seenStairGlimmer) fail('spiral walk: the Stair glimmer must NOT arm pre-ending');
  s.endingDone = true; s.seenStairGlimmer = false; s.spiralWalkNext = 0;
  for (let i = 0; i < 13; i++) MM.engine.spiralStoneStep(i);
  if (!s.seenStairGlimmer) fail('spiral walk: the Stair glimmer must arm on the first in-order walk completed post-ending');
  if (!MM.engine.stairGlinting()) fail('spiral walk: stairGlinting() should read true right after the glimmer arms');
  MM.sound.tone = realTone;
  MM.engine.state = null;
}

// ---------- Wave 10 (P3): the fence east of the farm ----------
{
  const fenceTiles = MM.maps.find(ow, 'F');
  if (fenceTiles.length !== 3) fail(`fence: expected 3 'F' tiles, found ${fenceTiles.length}`);
  fenceTiles.forEach(p => {
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = p.x + dx, ny = p.y + dy;
      return ny >= 0 && ny < ow.length && nx >= 0 && nx < ow[0].length && ow[ny][nx] === '.';
    });
    if (!adj) fail(`fence: 'F' at ${p.x},${p.y} has no walkable neighbor to bump it from`);
  });
  // tileSprite reads s.tasksDone.includes(6) live, no grid rewrite
  const savedEngine = MM.engine.state;
  MM.engine.state = { tasksDone: [1, 2, 3, 4, 5] };
  if (MM.maps.tileSprite('F', 32, 13, 'world', 0) !== 'fenceBroken') fail('fence: should read as broken before task 6');
  MM.engine.state = { tasksDone: [1, 2, 3, 4, 5, 6] };
  if (MM.maps.tileSprite('F', 32, 13, 'world', 0) !== 'fenceMended') fail('fence: should read as mended once task 6 is done');
  MM.engine.state = savedEngine;
  // 'F' must render as its own sprite everywhere, not fall back to castle's
  // banner meaning (mapId-gated, like every other reused-letter precedent)
  if (MM.maps.tileSprite('F', 5, 5, 'castle', 0) !== 'banner') fail("fence: 'F' should still mean banner inside the castle (mapId-gated)");
}

// ---------- Wave 10 (P4): the rare-surprise pool's exposed CHANCE hooks ----------
{
  for (const key of ['GOLDEN_BIRD_CHANCE', 'CAT_BEETLE_CHANCE', 'HATTED_SLIMES_CHANCE']) {
    const v = MM.engine[key];
    if (typeof v !== 'number' || v <= 0 || v > 1) fail(`Wave 10: E.${key} should be a small positive probability, got ${v}`);
  }
  if (!MM.data.treasureById('feather')) fail("Wave 10: TREASURES should include 'feather' (Proof It Happened)");
}

// ---------- Wave 10 (P1): Sylvia's rotating stones line ----------
{
  const mid = { tasksDone: [1, 2, 3, 4, 5], taskIndex: 6, isles: { lenses: {}, metCallie: false, pet: null }, endingDone: false };
  let sawIt = false;
  for (let i = 0; i < 200; i++) if (/turn, you know/.test(MM.data.NPCS.g.talk(mid))) sawIt = true;
  if (!sawIt) fail('Sylvia: the courtyard-stones aside never appeared in 200 tries mid-game (chance too low or broken)');
  const fresh = { tasksDone: [], taskIndex: 1, isles: { lenses: {}, metCallie: false, pet: null }, endingDone: false };
  for (let i = 0; i < 50; i++) if (/turn, you know/.test(MM.data.NPCS.g.talk(fresh))) fail('Sylvia: the stones aside should never appear before the first stone has turned');
  const done = { tasksDone: [1,2,3,4,5,6,7,8,9,10,11,12,13], taskIndex: 14, isles: { lenses: {}, metCallie: false, pet: null }, endingDone: false };
  for (let i = 0; i < 50; i++) if (/turn, you know/.test(MM.data.NPCS.g.talk(done))) fail('Sylvia: the stones aside should stop once all thirteen have turned');
}

// ---------- Wave 10 (P2): reactive cast — lines appear post-flag, not before ----------
{
  const base = () => ({
    tasksDone: [1,2,3,4,5,6,7,8,9,10,11,12,13], taskIndex: 14, gold: 0, badges: {},
    isles: { lenses: { tidepool: true, frostbite: true, cinderforge: true }, metCallie: false, pet: null },
    endingDone: false, sparWins: 0, metMiscount: true,
  });
  // Callie
  {
    const s = base();
    if (/lamp is lit/.test(MM.data.NPCS.c.talk(s))) fail("Callie: lampLit line shows before the flag is set");
    s.isles.lampLit = true;
    if (!/lamp is lit/.test(MM.data.NPCS.c.talk(s))) fail("Callie: lampLit line missing once the flag is set");
    s.isles.gullwrackRebuilt = true;
    if (!/Gullwrack sent word/.test(MM.data.NPCS.c.talk(s))) fail("Callie: gullwrackRebuilt should outrank lampLit");
  }
  // Percy
  {
    const s = base();
    if (/mended stone to stone/.test(MM.data.NPCS.p.talk(s))) fail("Percy: gullwrackRebuilt line shows before the flag is set");
    s.isles.gullwrackRebuilt = true;
    if (!/mended stone to stone/.test(MM.data.NPCS.p.talk(s))) fail("Percy: gullwrackRebuilt line missing once the flag is set");
  }
  // Sylvia
  {
    const s = base();
    if (/settling in the air/.test(MM.data.NPCS.g.talk(s))) fail("Sylvia: lampLit line shows before the flag is set");
    s.isles.lampLit = true;
    if (!/settling in the air/.test(MM.data.NPCS.g.talk(s))) fail("Sylvia: lampLit line missing once the flag is set");
  }
  // Barnaby
  {
    const s = base();
    if (/light that stood dark/.test(MM.data.NPCS.q.talk(s))) fail("Barnaby: lampLit verse shows before the flag is set");
    s.isles.lampLit = true;
    if (!/light that stood dark/.test(MM.data.NPCS.q.talk(s))) fail("Barnaby: lampLit verse missing once the flag is set");
  }
  // Finn
  {
    const s = base();
    if (/faster than fish/.test(MM.data.NPCS.e.talk(s))) fail("Finn: lampLit line shows before the flag is set");
    s.isles.lampLit = true;
    if (!/faster than fish/.test(MM.data.NPCS.e.talk(s))) fail("Finn: lampLit line missing once the flag is set");
  }
  // Miscount's own greeting (E.miscountArena) is UI-driving (dialogChoices),
  // not a pure string-returning function like the NPCS.*.talk() pool — it's
  // covered by tests/drive-notices.js instead, which has a real DOM to read
  // #modalBox from.
}

// ========================================================================
// ---------- Wave 12: "The Proving Rooms" ----------
// ========================================================================

// ---------- P3: the Workshop Wing map ----------
{
  const rows = MM.maps.WING;
  rows.forEach((r, i) => { if (r.length !== 40) fail(`wing row ${i} length ${r.length}, want 40`); });
  if (rows.length !== 26) fail(`wing has ${rows.length} rows, want 26`);
  const g = MM.maps.parse(rows, '#');
  // NO combat, ever — the castle rule extends to the Wing
  for (const ch of ['m', 'g', 't', 'b']) {
    if (MM.maps.find(g, ch).length) fail(`wing: monster marker '${ch}' — there is no combat in the Wing`);
  }
  if (!MM.maps.isOverworld('wing')) fail('wing must be in OVERWORLD_IDS (castle rules: NPC pass, no dungeon-grey floor)');
  // the townsfolk NPC-draw pass runs on every overworld — no wing glyph may
  // collide with an MM.data.NPCS key (the Wave 9 furnishing lesson)
  {
    const glyphs = new Set();
    for (const row of g) for (const ch of row) glyphs.add(ch);
    for (const ch of glyphs) {
      if (MM.data.NPCS[ch]) fail(`wing: glyph '${ch}' collides with an MM.data.NPCS key — a villager would draw over it`);
    }
  }
  // one of each singleton, the right number of everything else
  for (const [ch, n] of [['X', 1], ['P', 1], ['H', 1], ['w', 1], ['@', 1], ['$', 1], ['O', 1], ['<', 1]]) {
    if (MM.maps.find(g, ch).length !== n) fail(`wing: want ${n} of '${ch}', found ${MM.maps.find(g, ch).length}`);
  }
  if (MM.maps.find(g, 'T').length !== MM.data.WING_PORTRAITS.length) {
    fail(`wing: ${MM.maps.find(g, 'T').length} portraits on the map vs ${MM.data.WING_PORTRAITS.length} in WING_PORTRAITS`);
  }
  if (MM.maps.find(g, 'M').length !== MM.maps.WING_ARMORY.mirrors.length) fail('wing: mirror-stand count mismatch');
  if (MM.maps.find(g, 'S').length !== MM.maps.WING_CATS.statues.length) fail('wing: cat-statue count mismatch');
  if (MM.maps.find(g, '0').length !== MM.maps.WING_WREN.sockets.length) fail('wing: socket count mismatch');
  // every plaque tile has prose, every prose key has a tile
  {
    const tiles = new Set(MM.maps.find(g, 'i').map(p => `${p.x},${p.y}`));
    for (const key of Object.keys(MM.data.WING_PLAQUES)) {
      if (!tiles.has(key)) fail(`wing: WING_PLAQUES['${key}'] has no 'i' tile on the map`);
    }
    for (const t of tiles) if (!MM.data.WING_PLAQUES[t]) fail(`wing: plaque tile ${t} has no WING_PLAQUES entry`);
  }
  // every declared coordinate points at the right glyph
  const expect = (x, y, ch, label) => { if (g[y][x] !== ch) fail(`wing: ${label} at ${x},${y} is '${g[y][x]}', want '${ch}'`); };
  MM.maps.WING_SLABS.forEach(t => expect(t.x, t.y, 'U', `slab ${t.id}`));
  MM.maps.WING_WREN.sockets.forEach(p => expect(p.x, p.y, '0', 'socket'));
  MM.maps.WING_ARMORY.mirrors.forEach(p => expect(p.x, p.y, 'M', 'mirror'));
  expect(MM.maps.WING_ARMORY.lamp.x, MM.maps.WING_ARMORY.lamp.y, '@', 'lamp');
  expect(MM.maps.WING_ARMORY.crystal.x, MM.maps.WING_ARMORY.crystal.y, '$', 'crystal');
  MM.maps.WING_CATS.statues.forEach(p => expect(p.x, p.y, 'S', 'cat statue'));
  expect(MM.maps.WING_CATS.fountain.x, MM.maps.WING_CATS.fountain.y, 'O', 'fountain');
  expect(MM.maps.WING_WARDROBE.x, MM.maps.WING_WARDROBE.y, 'w', 'wardrobe');
  expect(MM.maps.WING_DOORWAY.x, MM.maps.WING_DOORWAY.y, 'H', 'teaser doorway');
  expect(MM.maps.WING_CELLAR_CHEST.x, MM.maps.WING_CELLAR_CHEST.y, '*', 'cellar chest');
  Object.keys(MM.maps.WING_ROOM_CHESTS).forEach(k => {
    const [x, y] = k.split(',').map(Number);
    expect(x, y, '*', `room chest (${MM.maps.WING_ROOM_CHESTS[k]})`);
  });
  Object.keys(MM.maps.WING_RESET_LEVERS).forEach(k => {
    const [x, y] = k.split(',').map(Number);
    expect(x, y, 'l', 'reset lever');
  });
  // v1.8.2: the reverse — every 'l' on the Wing floor must be a REGISTERED
  // reset lever (an unregistered lever is a wedged kid's false hope). And
  // the plate room specifically must have its own (the corner-wedge lesson).
  MM.maps.WING.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'l' && !MM.maps.WING_RESET_LEVERS[`${x},${y}`]) fail(`wing: unregistered reset lever at ${x},${y}`);
  }));
  if (!MM.maps.WING_RESET_LEVERS['31,20']) fail('wing: the plate room lost its own reset lever');
  // reachability from P: gates modeled OPEN; every bumpable adjacent-reachable
  const WALK = '.PX+0!_v<&G?';   // '?' = the Echo Annex's plate (Wave 13)
  const bfs = (sx, sy, walk) => {
    const seen = new Set([sx + ',' + sy]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        const ch = (g[ny] || [])[nx];
        if (ch == null || seen.has(k) || !walk.includes(ch)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return seen;
  };
  const start = MM.maps.find(g, 'P')[0];
  const seen = bfs(start.x, start.y, WALK);
  const inCellar = (x, y) => x <= 8 && y >= 22;   // teleport-in, ladder out
  const adjSeen = p => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((p.x + dx) + ',' + (p.y + dy)));
  for (const ch of ['T', 'i', 'w', 'M', 'S', 'O', 'U', '*', 'l', '@', '$', 'H', 'k']) {
    for (const p of MM.maps.find(g, ch)) {
      if (inCellar(p.x, p.y)) continue;
      if (!adjSeen(p)) fail(`wing: bumpable '${ch}' at ${p.x},${p.y} can never be reached`);
    }
  }
  for (const ch of ['+', '0', '!', '_', 'v', '<', '?']) {
    for (const p of MM.maps.find(g, ch)) {
      if (inCellar(p.x, p.y)) continue;
      if (!seen.has(p.x + ',' + p.y)) fail(`wing: walk-on '${ch}' at ${p.x},${p.y} unreachable`);
    }
  }
  // the cellar: the ladder must be reachable from the drop landing
  const land = MM.maps.WING_CELLAR.landing;
  if (!bfs(land.x, land.y, WALK).has('2,23')) fail('wing: the cellar ladder is unreachable from the fall landing');
  // CLOSED-GATE SAFETY: with every '&' and 'G' shut, any walkable region cut
  // off from the entrance must contain its own pressure plate — a kid inside
  // when the gates fall shut must always be able to lift them again.
  {
    const closedWalk = '.PX+0!_v<';
    const main = bfs(start.x, start.y, closedWalk);
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) {
      if (!closedWalk.includes(g[y][x]) || main.has(x + ',' + y) || inCellar(x, y)) continue;
      const region = bfs(x, y, closedWalk);
      const hasPlate = [...region].some(k => { const [rx, ry] = k.split(',').map(Number); return g[ry][rx] === '+'; });
      if (!hasPlate) fail(`wing: region at ${x},${y} is sealed behind gates with no plate of its own`);
    }
  }
}

// ---------- P3: the Armory beam is solvable, and not solved at the start ----------
{
  MM.engine.state = { mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null };
  MM.engine.ensureWing();
  if (MM.engine.wingBeamLit()) fail('armory: the beam must NOT reach the crystal in the initial mirror states');
  // solution: M1 and M3 flipped to '\'
  MM.engine.state.wing.mirrors = [1, 0, 1];
  if (!MM.engine.wingBeamLit()) fail('armory: the beam should reach the crystal with mirrors [1,0,1]');
  const pts = MM.engine.wingBeam().points;
  if (pts.length < 5) fail(`armory: expected a multi-segment beam (lamp + 3 mirrors + crystal), got ${pts.length} points`);
  const A = MM.maps.WING_ARMORY;
  if (pts[0].x !== A.lamp.x || pts[0].y !== A.lamp.y) fail('armory: beam does not start at the lamp');
  const last = pts[pts.length - 1];
  if (last.x !== A.crystal.x || last.y !== A.crystal.y) fail('armory: lit beam does not end at the crystal');
  MM.engine.state = null;
}

// ---------- P3: Petronella's cats — needed facings are derivable & initial is unsolved ----------
{
  const needed = MM.maps.WING_CATS.statues.map((c, i) => MM.engine.wingCatNeeded(i));
  if (JSON.stringify(needed) !== JSON.stringify([1, 3, 0])) fail(`cats: expected needed facings [E,W,N] = [1,3,0], got ${JSON.stringify(needed)}`);
  MM.maps.WING_CATS.statues.forEach((c, i) => {
    if (c.initial === needed[i]) fail(`cats: statue ${i} starts already facing the fountain — nothing to do`);
  });
}

// ---------- P3: Numberling sockets — EVERY true filling accepted ----------
{
  const ok = MM.engine.wingEquationOk;
  for (const [a, b] of [[3, 8], [8, 3], [4, 6], [6, 4]]) {
    if (!ok(a, b)) fail(`numberlings: true filling ${a}×${b} rejected — every correct answer must be accepted`);
  }
  for (const [a, b] of [[7, 9], [3, 4], [8, 8], [null, 8]]) {
    if (ok(a, b)) fail(`numberlings: false filling ${a}×${b} accepted`);
  }
  // live: two DISTINCT true fillings, each completing the room via real pushes
  const fill = (pairA, pairB) => {
    MM.engine.state = {
      mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {},
      gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 11, items: { food: {}, charms: [] }, charmsOn: [],
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    };
    const w = MM.engine.ensureWing();
    MM.engine.applyWingState();
    const s = MM.engine.state;
    const [sa, sb] = MM.maps.WING_WREN.sockets;
    // teleport the slabs beside the sockets and push them in with real bumps
    const place = (id, sock) => {
      const slab = w.slabs.find(t => t.id === id);
      s.grid[slab.y][slab.x] = '.';
      slab.x = sock.x; slab.y = sock.y + 1; slab.under = '.';
      s.grid[slab.y][slab.x] = 'U';
      s.px = sock.x; s.py = sock.y + 2;
      MM.engine.wingSlabBump(0, -1, sock.x, sock.y + 1);
    };
    place(pairA, sa);
    place(pairB, sb);
    return !!w.rooms.wren;
  };
  if (!fill('n3', 'n8')) fail('numberlings: 3×8 did not complete the room');
  if (!fill('n4', 'n6')) fail('numberlings: 4×6 did not complete the room (a second true filling MUST work)');
  if (fill('n7', 'n9')) fail('numberlings: 7×9 completed the room — false filling accepted');
  MM.engine.state = null;
}

// ---------- P3: the 9 next to the 7 — cosmetic ONLY, never blocks a push ----------
{
  MM.engine.state = {
    mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {},
    gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 11, items: { food: {}, charms: [] }, charmsOn: [],
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
  };
  const w = MM.engine.ensureWing();
  MM.engine.applyWingState();
  const s = MM.engine.state;
  const nine = w.slabs.find(t => t.id === 'n9'), seven = w.slabs.find(t => t.id === 'n7');
  // 9 and 7 START adjacent (the gag is visible from the door)
  if (Math.abs(nine.x - seven.x) + Math.abs(nine.y - seven.y) !== 1) fail('numberlings: 9 and 7 should start adjacent');
  // push the 7 one tile north (9 stays adjacent-diagonal, then push 9 north
  // to become adjacent again) — every push must succeed
  s.px = seven.x; s.py = seven.y + 1;
  MM.engine.wingSlabBump(0, -1, seven.x, seven.y);
  if (seven.y !== 5) fail('numberlings: pushing the 7 failed');
  s.px = nine.x; s.py = nine.y + 1;
  MM.engine.wingSlabBump(0, -1, nine.x, nine.y);
  if (nine.y !== 5) fail('numberlings: pushing the 9 NEXT TO the 7 was blocked — the aversion must stay cosmetic');
  if (Math.abs(nine.x - seven.x) + Math.abs(nine.y - seven.y) !== 1) fail('numberlings: 9 should now sit adjacent to 7');
  // the asleep Numberling wakes on its first push — and the push happens
  const six = w.slabs.find(t => t.id === 'n6');
  if (!six.asleep) fail('numberlings: the 6 should start asleep');
  s.px = six.x; s.py = six.y + 1;
  MM.engine.wingSlabBump(0, -1, six.x, six.y);
  if (six.asleep) fail('numberlings: the 6 should wake on its first push');
  if (six.y !== 5) fail('numberlings: the sleeping 6\'s first push must still MOVE it (a joke is never an obstacle)');
  MM.engine.state = null;
}

// ---------- P2: pressure plates — open while occupied, closed on leave,
// slab holds, OR across plates, pet counts ----------
{
  const mkState = () => {
    MM.engine.state = {
      mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {},
      gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 11, items: { food: {}, charms: [] }, charmsOn: [],
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    };
    MM.engine.ensureWing();
    MM.engine.applyWingState();
    return MM.engine.state;
  };
  const s = mkState();
  MM.engine.petPos = null;
  if (MM.engine.platePowered('wing')) fail('plates: powered with nothing on any plate');
  // player occupies the plate room's near plate -> open
  s.px = 28; s.py = 15;
  if (!MM.engine.platePowered('wing')) fail('plates: player standing on a plate should power the gates');
  // step off -> closed
  s.px = 28; s.py = 16;
  if (MM.engine.platePowered('wing')) fail('plates: gates must close the moment the plate is released');
  // OR across plates: the pantry plate (a different plate, same floor) opens them too
  s.px = 21; s.py = 18;
  if (!MM.engine.platePowered('wing')) fail('plates: ANY held plate must power the floor (OR across plates)');
  // pet on a plate counts (the delight, not the assumption)
  s.px = 2; s.py = 11;
  s.isles.pet = { species: 'blue', name: 'Puddle', stage: 1, fed: 0, correct: 0 };
  MM.engine.petPos = { x: 28, y: 15 };
  if (!MM.engine.platePowered('wing')) fail('plates: a pet sitting on a plate should hold it');
  MM.engine.petPos = { x: 2, y: 11 };
  s.isles.pet = null;
  // a slab pushed onto the plate HOLDS it (the canonical solution)
  const w = MM.engine.state.wing;
  const slab = w.slabs.find(t => t.id === 'plate');
  s.px = slab.x; s.py = slab.y + 1;
  MM.engine.wingSlabBump(0, -1, slab.x, slab.y);   // 17 -> 16
  MM.engine.wingSlabBump(0, -1, slab.x, slab.y);   // 16 -> 15 (the plate)
  if (slab.under !== '+') fail(`plates: slab should now rest ON the plate (under='${slab.under}')`);
  if (!MM.engine.platePowered('wing')) fail('plates: a slab resting on a plate must hold the gates open');
  // ...and the hold survives the player walking away
  s.px = 2; s.py = 11;
  if (!MM.engine.platePowered('wing')) fail('plates: the slab hold must not depend on where the player stands');
  MM.engine.state = null;
}

// ---------- P2: the Vault's free slab + plate pocket ----------
{
  const grid = MM.maps.parse(MM.maps.dungeonFloors(18)[0], '#');
  if (!MM.maps.FREE_SLABS.d18 || grid[10][20] !== 'U') fail('vault: free slab missing at (20,10)');
  if (grid[10][22] !== '+') fail('vault: pressure plate missing at (22,10)');
  if (grid[11][23] !== '&') fail('vault: plate-gate missing at (23,11)');
  if (grid[12][23] !== '*') fail('vault: pocket chest missing at (23,12)');
  // the pocket has NO interior floor beyond the gate — a closing gate can
  // never trap anyone (the chest is bumped from the gate tile itself)
  const around = [[22, 12], [24, 12], [23, 13]].map(([x, y]) => grid[y][x]);
  if (around.some(ch => ch !== '#')) fail(`vault: the chest pocket must be fully walled (got ${around.join(',')})`);
  // slab -> plate is a straight two-push line with standing room
  if (grid[10][19] !== '.' || grid[10][21] !== '.') fail('vault: the slab push lane to the plate is blocked');
}

// ---------- P3: cracked floor — crosses once, crumbles, cellar-ladder return ----------
{
  MM.engine.state = {
    mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {},
    gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 6, py: 6, items: { food: {}, charms: [] }, charmsOn: [],
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    monsters: [],
  };
  MM.engine.ensureWing();
  MM.engine.applyWingState();
  const s = MM.engine.state;
  // step ONTO a cracked tile (6,5), then off it (6,4 — also cracked): the
  // tile stepped OFF of must crumble to a chute
  MM.engine.wingMove(0, -1, 6, 5, s.grid[5][6]);
  if (!(s.px === 6 && s.py === 5)) fail('cracked: could not step onto a cracked tile');
  MM.engine.wingMove(0, -1, 6, 4, s.grid[4][6]);
  if (s.grid[5][6] !== 'v') fail(`cracked: the crossed tile should crumble to a chute, got '${s.grid[5][6]}'`);
  // step onto the crumbled hole -> fall to the cellar
  MM.engine.wingMove(0, 1, 6, 5, s.grid[5][6]);
  const land = MM.maps.WING_CELLAR.landing;
  if (!(s.px === land.x && s.py === land.y)) fail(`cracked: falling should land in the cellar (at ${s.px},${s.py})`);
  // the ladder brings you home
  MM.engine.wingMove(-1, 0, 2, 23, s.grid[23][2]);
  const ret = MM.maps.WING_CELLAR.ladderReturn;
  if (!(s.px === ret.x && s.py === ret.y)) fail(`cracked: the ladder should return to the hall (at ${s.px},${s.py})`);
  MM.engine.state = null;
}

// ---------- P3: the wardrobe — three bumps, then the Study ----------
{
  MM.engine.state = {
    mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {},
    gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 23, py: 12, items: { food: {}, charms: [] }, charmsOn: [],
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
  };
  MM.engine.ensureWing();
  MM.engine.applyWingState();
  const s = MM.engine.state;
  MM.engine.wingWardrobeBump();
  MM.engine.wingWardrobeBump();
  if (s.wing.wardrobeMoved) fail('wardrobe: two bumps must not be enough');
  MM.engine.wingWardrobeBump();
  if (!s.wing.wardrobeMoved) fail('wardrobe: the third bump should trigger the confession + move');
  const wd = MM.maps.WING_WARDROBE;
  if (s.grid[wd.y][wd.x] !== '.') fail('wardrobe: its wing tile should clear once it moves');
  // the castle spot now draws a wardrobe (live state, no grid rewrite)
  if (MM.maps.tileSprite('o', 2, 9, 'castle', 0) !== 'wardrobe') fail("castle: 'o' should draw the wardrobe once it has moved in");
  MM.engine.state = null;
  if (MM.maps.tileSprite('o', 2, 9, 'castle', 0) !== 'hallFloor') fail("castle: 'o' must stay plain floor before the move");
}

// ---------- P3: castle door + title ----------
{
  const g = MM.maps.parse(MM.maps.CASTLE, '#');
  if (MM.maps.find(g, 'H').length !== 1) fail('castle: want exactly one Workshop Wing door (H)');
  if (MM.maps.find(g, 'o').length !== 1) fail("castle: want exactly one wardrobe spot (o)");
  for (const ch of ['H', 'o']) {
    if (MM.data.NPCS[ch]) fail(`castle: '${ch}' collides with an MM.data.NPCS key`);
  }
  // titlesFor derives the Wing honour from room flags
  const done = { wing: { rooms: { grumbold: 1, wren: 1, armory: 1, petronella: 1, pantry: 1, plate: 1 } } };
  if (!MM.engine.titlesFor(done).includes('Keeper of the Proving Rooms')) fail('titlesFor: full wing should grant Keeper of the Proving Rooms');
  const part = { wing: { rooms: { grumbold: 1 } } };
  if (MM.engine.titlesFor(part).includes('Keeper of the Proving Rooms')) fail('titlesFor: a partial wing must not grant the title');
}

// ---------- Wave 12: new-glyph context guards (the v1.7.9 'Y' lesson) ----------
{
  const cases = [
    ['+', 'd18', 'plate'], ['+', 'wing', 'plate'],
    ['&', 'd18', 'plateGateShut'], ['&', 'wing', 'plateGateShut'],
    ['!', 'd18', 'crackedFloor'], ['!', 'wing', 'crackedFloor'],
    ['d', 'world', 'stepStone'], ['d', 'castle', 'gardenEmpty'],
    ['w', 'wing', 'wardrobe'], ['w', 'isles', 'murk'], ['w', 'castle', 'plinth'],
    ['H', 'wing', 'teaseDoor'], ['H', 'castle', 'wingDoor'], ['H', 'world', 'spiralTower'], ['H', 'isles', 'lighthouse'],
    ['S', 'wing', 'catStatue'], ['S', 'world', 'shop'],
    ['M', 'wing', 'mirrorSlash'], ['M', 'world', 'mountain'],
    ['O', 'wing', 'fountain'], ['O', 'castle', 'throne'],
    ['T', 'wing', 'portrait'], ['T', 'world', 'tree'],
    ['0', 'wing', 'socket'], ['0', 'world', 'hole'],
    ['@', 'wing', 'lamp'], ['$', 'wing', 'crystalDark'],
    ['G', 'wing', 'gateShut'], ['G', 'd19f3', 'gate'],
    ['k', 'wing', 'shelfFull'], ['k', 'd16f0', 'keyTile'],
    ['l', 'wing', 'resetLever'], ['i', 'wing', 'board'],
    ['U', 'wing', 'slab'], ['*', 'wing', 'chest'], ['<', 'wing', 'stairsUp'],
    ['v', 'wing', 'chute'], ['_', 'wing', 'slick'], ['X', 'wing', 'castleDoor'],
  ];
  for (const [ch, mapId, want] of cases) {
    const got = MM.maps.tileSprite(ch, 0, 0, mapId, 0);
    if (got !== want) fail(`tileSprite('${ch}', ${mapId}) = '${got}', want '${want}'`);
    if (!MM.sprites.DEFS[got]) fail(`tileSprite('${ch}', ${mapId}) -> '${got}' has no sprite def`);
  }
  // state-readable sprites flip with state
  MM.engine.state = { mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), px: 28, py: 15, wing: null, isles: {} };
  if (MM.maps.tileSprite('&', 33, 15, 'wing', 0) !== 'plateGateOpen') fail('plate-gate: should draw OPEN while the player holds a plate');
  if (MM.maps.tileSprite('+', 28, 15, 'wing', 0) !== 'platePressed') fail('plate: the occupied plate should draw pressed');
  MM.engine.state.wing = { rooms: { armory: true } };
  if (MM.maps.tileSprite('G', 36, 2, 'wing', 0) !== 'gateOpen') fail('armory gate: should draw open once the room is solved');
  MM.engine.state = null;
}

// ---------- P1: the new Spiral chunks — grammar counts + plain-floor law ----------
{
  // the pool now seeds the stranded grammar: >=2 slick chunks, a teleport
  // pair, a lever/gate (gate guards a CHEST), a tide-pool flavor chunk
  const has = (rows, ch) => rows.some(r => r.includes(ch));
  const regular = MM.maps.SPIRAL_REGULAR;
  if (regular.filter(rows => has(rows, '_')).length < 2) fail('spiral: want >=2 slick-rock chunks in the regular pool');
  const padChunks = regular.filter(rows => has(rows, 'o'));
  if (padChunks.length < 1) fail('spiral: want a teleport-pair chunk');
  for (const rows of padChunks) {
    const n = MM.maps.find(MM.maps.parse(rows, '#'), 'o').length;
    if (n !== 2) fail(`spiral: a teleport chunk must hold exactly a PAIR of pads (found ${n})`);
  }
  const leverChunks = regular.filter(rows => has(rows, 'L'));
  if (leverChunks.length < 1) fail('spiral: want a lever/gate chunk');
  for (const rows of leverChunks) {
    if (!has(rows, 'G')) fail('spiral: a lever chunk needs its gate');
    if (!has(rows, '*')) fail('spiral: the gate must guard a CHEST (never the stairs)');
  }
  if (regular.filter(rows => has(rows, ',')).length < 1) fail('spiral: want a tide-pool flavor chunk');
  // one gear-plate landing (R + A/B/C) in the landing pool
  const gearLandings = MM.maps.SPIRAL_LANDING.filter(rows => has(rows, 'R'));
  if (gearLandings.length !== 1) fail('spiral: want exactly one gear-plate landing');
  for (const rows of gearLandings) {
    for (const ch of ['A', 'B', 'C']) if (!has(rows, ch)) fail(`spiral gear landing: missing gate '${ch}'`);
  }
  // THE STANDING RULE: procedural content never gates its exit on a special
  // tile — every chunk keeps a PLAIN-FLOOR walk from X to '>' with every
  // special tile treated as a wall (D doors are core practice stations and
  // stay passable; markers sit on plain floor).
  const SPECIALS = '_o,LGRABC+&!v^%?';   // '?' = echo plates (Wave 13)
  const plainPath = (rows, label) => {
    const g = MM.maps.parse(rows, '#');
    const X = MM.maps.find(g, 'X')[0];
    const target = MM.maps.find(g, '>')[0];
    if (!target) return;   // the capped top floor has none
    const seen = new Set([X.x + ',' + X.y]);
    const q = [X];
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        const ch = (g[ny] || [])[nx];
        if (ch == null || ch === '#' || SPECIALS.includes(ch) || seen.has(k)) continue;
        seen.add(k); q.push({ x: nx, y: ny });
      }
    }
    if (!seen.has(target.x + ',' + target.y)) fail(`${label}: no plain-floor walk from X to '>' (a special tile gates the exit)`);
    // monster markers must never sit on special tiles (spawn replaces them with '.')
    for (const ch of ['m', 'b']) for (const p of MM.maps.find(g, ch)) {
      if (SPECIALS.includes(rows[p.y][p.x])) fail(`${label}: marker '${ch}' sits on a special tile`);
    }
  };
  MM.maps.SPIRAL_REGULAR.forEach((rows, i) => plainPath(rows, `spiral regular chunk ${i}`));
  MM.maps.SPIRAL_LANDING.forEach((rows, i) => plainPath(rows, `spiral landing chunk ${i}`));
}

// ---------- P1: per-floor state scoping on the Spiral ----------
{
  // gear rotation is keyed by the per-floor mapId — floor 15's plate must
  // never leak to any other floor
  MM.engine.state = { gearState: { d22f14: 1 } };
  if (MM.maps.gearRotation('d22f14') !== 1) fail('spiral gears: rotation not read for its own floor');
  if (MM.maps.gearRotation('d22f19') !== 0) fail('spiral gears: floor 15\'s rotation LEAKED to floor 20');
  if (!MM.maps.gateOpenNow('B', 'd22f14')) fail('spiral gears: B should be open on the rotated floor');
  if (MM.maps.gateOpenNow('B', 'd22f19')) fail('spiral gears: B must stay shut on other floors');
  MM.engine.state = null;
  // a spiral lever writes s.opened keys that INCLUDE the floor
  {
    const floors = MM.maps.dungeonFloors(MM.maps.SPIRAL_INDEX);
    // floor 11 (index 10) is the lever/gate chunk
    const raw = floors[10];
    if (!raw.some(r => r.includes('L'))) fail('spiral: expected the lever/gate chunk at floor 11');
    MM.engine.state = {
      mapId: 'd22f10', dungeonIndex: 22, floorIndex: 10,
      grid: MM.maps.parse(raw, '#'), monsters: [], opened: {}, isles: { keys: {}, lenses: {}, pet: null },
      px: 2, py: 6, calmMode: true, stamina: 100, maxStamina: 100, items: { food: {}, charms: [] }, charmsOn: [], gold: 0,
      parent: { pin: null, topics: {} }, mastery: {}, tasksDone: [], badges: {}, totals: { answered: 0, correct: 0 },
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    };
    MM.engine.tryMove(1, 0);   // pull the L at (3,6)
    const keys = Object.keys(MM.engine.state.opened);
    if (!keys.length) fail('spiral lever: nothing was opened');
    if (!keys.every(k => k.startsWith('d22f10:'))) fail(`spiral lever: opened keys must carry the floor (got ${keys.join(' ')})`);
    MM.engine.state = null;
  }
  // the chunk rotation puts each new chunk where the drive expects it
  const floors = MM.maps.dungeonFloors(MM.maps.SPIRAL_INDEX);
  if (!floors[7].some(r => r.includes('o'))) fail('spiral: floor 8 should be the teleport chunk');
  if (!floors[8].some(r => r.includes('_'))) fail('spiral: floor 9 should be a slick chunk');
  if (!floors[14].some(r => r.includes('R'))) fail('spiral: floor 15 should be the gear-plate landing');
}

// ---------- P4: the skip-count stepping stones ----------
{
  const ow = MM.maps.parse(MM.maps.OVERWORLD, '~');
  const stones = MM.maps.SKIP_STONES;
  const seen = new Set();
  for (const st of stones) {
    if (seen.has(`${st.x},${st.y}`)) fail(`skip stones: duplicate position ${st.x},${st.y}`);
    seen.add(`${st.x},${st.y}`);
    if (ow[st.y][st.x] !== 'd') fail(`skip stones: stone '${st.label}' at ${st.x},${st.y} is '${ow[st.y][st.x]}' on the map, want 'd'`);
  }
  // the ×2 order is genuinely carved on them: 2, 4, 6, 8
  const path = stones.filter(s => s.seq >= 0).sort((a, b) => a.seq - b.seq);
  if (path.map(s => s.label).join(',') !== '2,4,6,8') fail('skip stones: path labels should read 2,4,6,8');
  // consecutive path stones are orth-adjacent (walkable one to the next)
  for (let i = 1; i < path.length; i++) {
    const d = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
    if (d !== 1) fail(`skip stones: stone ${path[i].label} is not adjacent to ${path[i - 1].label}`);
  }
  // every decoy touches the path (a temptation, not scenery), and reads odd
  for (const st of stones.filter(s => s.seq < 0)) {
    if (+st.label % 2 === 0) fail(`skip stones: decoy '${st.label}' is even — it would read as a fair next step`);
    if (!path.some(p => Math.abs(p.x - st.x) + Math.abs(p.y - st.y) === 1)) fail(`skip stones: decoy '${st.label}' touches no path stone`);
  }
  // the first stone touches the bank; the chest sits at the far end
  const bank = MM.maps.SKIP_STONES_BANK;
  if (Math.abs(path[0].x - bank.x) + Math.abs(path[0].y - bank.y) !== 1) fail('skip stones: stone 2 must touch the bank');
  if (ow[bank.y][bank.x] !== '.') fail('skip stones: the bank must be plain grass');
  const chest = MM.maps.SKIP_STONES_CHEST;
  if (ow[chest.y][chest.x] !== '*') fail('skip stones: the islet chest is missing');
  const last = path[path.length - 1];
  if (Math.abs(last.x - chest.x) + Math.abs(last.y - chest.y) !== 1) fail('skip stones: the chest must be bumpable from the last stone');

  // live behavior: in-order steps advance; a wrong stone splashes you back
  // to the bank (no HP, no gold, no text — sound only)
  MM.engine.state = {
    mapId: 'world', grid: MM.maps.parse(MM.maps.OVERWORLD, '~'), monsters: [],
    px: bank.x, py: bank.y, hp: 24, maxhp: 24, gold: 10, stamina: 100, maxStamina: 100,
    calmMode: true, isles: { lenses: {}, pet: null }, items: { food: {}, charms: [], treasures: [] }, charmsOn: [],
    opened: {}, tasksDone: [], mastery: {}, badges: {}, totals: { answered: 0, correct: 0 },
    parent: { pin: null, topics: {} }, seenGoldenBird: true,
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
  };
  const s = MM.engine.state;
  MM.engine._skipNext = 0;
  MM.engine.tryMove(0, -1);   // bank -> stone 2
  if (!(s.px === path[0].x && s.py === path[0].y)) fail('skip stones: stepping onto stone 2 failed');
  MM.engine.tryMove(-1, 0);   // stone 2 -> decoy 7 (wrong!)
  if (!(s.px === bank.x && s.py === bank.y)) fail(`skip stones: a wrong stone should splash you back to the bank (at ${s.px},${s.py})`);
  if (s.hp !== 24 || s.gold !== 10) fail('skip stones: a splash must cost nothing');
  // the full crossing, in order
  MM.engine._skipNext = 0;
  MM.engine.tryMove(0, -1);   // 2
  MM.engine.tryMove(0, -1);   // 4
  MM.engine.tryMove(1, 0);    // 6
  MM.engine.tryMove(1, 0);    // 8
  if (!(s.px === last.x && s.py === last.y)) fail(`skip stones: the in-order crossing should reach stone 8 (at ${s.px},${s.py})`);
  MM.engine.tryMove(1, 0);    // bump the chest
  if (!s.opened[`world:${chest.x},${chest.y}`]) fail('skip stones: bumping the chest from stone 8 should open it');
  if (s.gold <= 10) fail('skip stones: the chest should pay gold');
  // ...and it STAYS open through a world rebuild
  MM.engine.enterWorld();
  if (MM.engine.state.grid[chest.y][chest.x] !== '.') fail('skip stones: the opened chest should persist through enterWorld');
  MM.engine.state = null;
}

// ---------- Wave 12: migration — an old save gets sane defaults ----------
{
  localStorage.setItem('mathmaker2_save_wave12migrant', JSON.stringify({
    version: 4, name: 'wave12migrant', hp: 24, maxhp: 24, stamina: 100, maxStamina: 100,
    gold: 10, level: 1, xp: 0, potions: 1, difficulty: 'hero',
    parent: { pin: null, topics: {} }, taskIndex: 3, haveItem: false, tasksDone: [1, 2],
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: {}, keys: {}, egg: null, pet: null },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true,
    gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  MM.engine.load('wave12migrant');
  const s = MM.engine.state;
  if (s.wing !== null) fail('migration: wing should default to null (never visited)');
  if (!s.freeSlabs || Object.keys(s.freeSlabs).length) fail('migration: freeSlabs should default to {}');
  // and the wing builds itself cleanly on first touch
  MM.engine.ensureWing();
  if (!s.wing || !s.wing.slabs || s.wing.slabs.length !== MM.maps.WING_SLABS.length) fail('migration: ensureWing did not build a full wing state');
  MM.engine.state = null;
}

// ========================================================================
// ---------- Wave 13: "The Understudy & Your Own Room" ----------
// ========================================================================

// ---------- new-glyph context guards (the v1.7.9 'Y' lesson) ----------
{
  MM.engine.state = null;
  const cases = [
    ['?', 'wing', 'echoPlate'], ['?', 'd11', 'echoPlate'], ['?', 'd22f12', 'echoPlate'],
    ['B', 'myroom', 'workbench'], ['B', 'd19f1', 'gateShut'],
    ['R', 'myroom', 'resetLever'], ['R', 'd19f1', 'gearPlate'],
    ['O', 'myroom', 'pedestal'], ['O', 'castle', 'throne'], ['O', 'wing', 'fountain'],
    ['V', 'myroom', 'pullCord'], ['V', 'castle', 'crestBoard'],
    ['W', 'myroom', 'wallWorked'], ['W', 'world', 'pier'],
    ['X', 'myroom', 'openDoorway'], ['X', 'wing', 'castleDoor'],
    ['U', 'myroom', 'slab'], ['+', 'myroom', 'plate'], ['&', 'myroom', 'plateGateShut'],
    ['!', 'myroom', 'crackedFloor'], ['*', 'myroom', 'chest'], ['v', 'myroom', 'chute'],
    ['#', 'myroom', 'wall'], ['H', 'wing', 'teaseDoor'],
  ];
  for (const [ch, mapId, want] of cases) {
    const got = MM.maps.tileSprite(ch, 0, 0, mapId, 0);
    if (got !== want) fail(`W13 tileSprite('${ch}', ${mapId}) = '${got}', want '${want}'`);
    if (!MM.sprites.DEFS[got]) fail(`W13 tileSprite('${ch}', ${mapId}) -> '${got}' has no sprite def`);
  }
  // the named doorway OPENS once the title is given (the masons note is gone)
  MM.engine.state = { wing: { titleGiven: true } };
  if (MM.maps.tileSprite('H', 0, 0, 'wing', 0) !== 'openDoorway') fail("W13: the wing doorway should draw OPEN once titleGiven");
  MM.engine.state = null;
  // '?' must never leak onto an overworld alphabet
  const owSpr = MM.maps.tileSprite('?', 0, 0, 'world', 0);
  if (owSpr !== 'grass' && owSpr !== 'grass2') fail("W13: '?' has no overworld meaning and should fall through to ground");
}

// ---------- Wing annex + Cavern + Spiral geometry ----------
{
  const g = MM.maps.parse(MM.maps.WING, '#');
  if (g[23][11] !== '?') fail('annex: echo plate should sit at (11,23)');
  if (g[23][10] !== '+') fail('annex: pressure plate should sit at (10,23)');
  if (g[23][9] !== '#') fail('annex: the wall-stop west of the plate is missing (an overshooting Understudy must be caught ON the plate)');
  for (const y of [21, 22, 23]) if (g[y][34] !== '.') fail(`annex: the entry shaft is blocked at (34,${y})`);
  if (g[24][32] !== 'i') fail('annex: the Tallis plaque is missing at (32,24)');
  if (!MM.data.WING_PLAQUES['32,24']) fail('annex: the Tallis plaque has no prose entry');
  // exactly one echo plate in the Wing; NO chest in the annex (with slabs
  // resting on plates for good, every '&' on the floor may already stand
  // open — the annex teaches, the Cavern and the Spiral pay)
  if (MM.maps.find(g, '?').length !== 1) fail('annex: want exactly one echo plate in the Wing');

  const d11 = MM.maps.parse(MM.maps.DUNGEONS[10], '#');
  if (d11[11][3] !== '?') fail('cavern: echo plate should sit at (3,11)');
  if (d11[11][7] !== '+') fail('cavern: pressure plate should sit at (7,11)');
  if (d11[11][8] !== '#') fail('cavern: the wall-stop east of the plate is missing');
  if (d11[13][6] !== '&') fail('cavern: plate-gate should sit at (6,13)');
  if (d11[13][7] !== '*') fail('cavern: the gated chest should sit at (7,13)');
  // the chest pocket has NO other way in (bumped from the gate tile itself)
  if (d11[12][7] !== '#' || d11[14][7] !== '#' || d11[13][8] !== '#') fail('cavern: the chest pocket must be walled on every non-gate side');
  // no slabs in the cavern — only the Understudy can hold the plate
  if (MM.maps.find(d11, 'U').length) fail('cavern: a slab here would trivialize the echo-plate puzzle');
  // the staircase's authored spot is plain floor
  const sp = MM.maps.STAIRCASE_SPOT;
  if (d11[sp.y][sp.x] !== '.') fail(`cavern: STAIRCASE_SPOT (${sp.x},${sp.y}) is '${d11[sp.y][sp.x]}', want '.'`);

  // the echo-plate chunk: appended (historical floors keep their chunks),
  // materializing at floor 13; gate guards a chest, never the stairs
  const floors = MM.maps.dungeonFloors(MM.maps.SPIRAL_INDEX);
  if (!floors[12].some(r => r.includes('?'))) fail('spiral: floor 13 should be the echo-plate chunk');
  const ch12 = MM.maps.parse(floors[12], '#');
  if (MM.maps.find(ch12, '?').length !== 1 || MM.maps.find(ch12, '+').length !== 1) fail('spiral echo chunk: want one ? and one +');
  if (MM.maps.find(ch12, '&').length !== 1 || MM.maps.find(ch12, '*').length !== 1) fail('spiral echo chunk: want one & and one *');
  if (MM.maps.find(ch12, 'U').length) fail('spiral echo chunk: no slabs on the Spiral');
  // floors 1-12 unchanged by the append (an old save\'s opened keys line up)
  if (floors[7].some(r => r.includes('?')) || floors[0].some(r => r.includes('?'))) fail('spiral: the echo chunk must be APPENDED, not inserted');
}

// ---------- step-buffer record/replay determinism ----------
{
  const E = MM.engine;
  const mkWing = () => {
    E.state = {
      mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {}, monsters: [],
      name: 'w13unit', gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 11,
      items: { food: {}, charms: [] }, charmsOn: [], seenUnderstudy: true,
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    };
    E.ensureWing();
    E.applyWingState();
    E.resetTransientEntities();
    return E.state;
  };
  mkWing();
  // rolling buffer keeps exactly the last 12 steps
  for (let i = 0; i < 15; i++) E.recordStep(1, 0);
  E.recordStep(0, 1);
  if (E.stepBuffer.length !== 12) fail(`buffer: want 12 entries, got ${E.stepBuffer.length}`);
  if (E.stepBuffer[11].dy !== 1) fail('buffer: newest step should be at the tail');
  if (E.stepBuffer[0].dy !== 0) fail('buffer: oldest surplus steps should have rolled off');
  // deterministic replay: run the annex choreography twice, identical traces
  const runReplay = () => {
    const s = mkWing();
    s.px = 24; s.py = 23;   // mid-corridor in the annex
    for (let i = 0; i < 12; i++) E.recordStep(-1, 0);
    E.summonUnderstudy(12, 23);
    const trace = [];
    let guard = 0;
    while (E.understudy && E.understudy.active && guard++ < 40) {
      E.understudyTick();
      trace.push(E.understudy.x + ',' + E.understudy.y);
    }
    return { trace: trace.join(' '), end: { x: E.understudy.x, y: E.understudy.y }, stopped: E.understudy.stopped };
  };
  const r1 = runReplay(), r2 = runReplay();
  if (r1.trace !== r2.trace) fail('understudy: replay is not deterministic');
  // 12 W steps from the plate: one onto '+', then the wall-stop catches it ON the plate
  if (!(r1.end.x === 10 && r1.end.y === 23)) fail(`understudy: wall-stop should catch it ON the annex plate (ended ${r1.end.x},${r1.end.y})`);
  if (!r1.stopped) fail('understudy: the overshoot should have been stopped by the wall (politely)');
  // the half-beat: with a 2-step path, the tick before the final step is a pause
  {
    const s = mkWing();
    s.px = 14; s.py = 23;
    E.recordStep(-1, 0); E.recordStep(-1, 0);
    E.summonUnderstudy(12, 23);
    E.understudyTick();   // step 1
    const afterOne = { x: E.understudy.x, y: E.understudy.y };
    E.understudyTick();   // the theatrical half-beat: NO movement
    if (E.understudy.x !== afterOne.x || E.understudy.y !== afterOne.y) fail('understudy: expected a half-beat pause before the final step');
    E.understudyTick();   // the final step lands
    if (E.understudy.x !== 10 || E.understudy.y !== 23) fail('understudy: final step after the half-beat should land on the plate');
    if (E.understudy.active) fail('understudy: route complete should end the replay');
  }
  E.resetTransientEntities();
  E.state = null;
}

// ---------- the Understudy holds a plate (the plate-occupancy clause) ----------
{
  const E = MM.engine;
  E.state = {
    mapId: 'wing', grid: MM.maps.parse(MM.maps.WING, '#'), wing: null, opened: {}, monsters: [],
    gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 11,
    items: { food: {}, charms: [] }, charmsOn: [],
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
  };
  E.ensureWing();
  E.applyWingState();
  E.resetTransientEntities();
  E.petPos = null;
  if (E.platePowered('wing')) fail('understudy-hold: nothing should power the plates yet');
  E.understudy = { mapId: 'wing', x: 10, y: 23, path: [], i: 0, active: false };
  if (!E.platePowered('wing')) fail('understudy-hold: an Understudy standing on a plate must HOLD it');
  if (!E.plateOccupied(10, 23)) fail('understudy-hold: the held plate should draw pressed');
  E.understudy.x = 12;
  if (E.platePowered('wing')) fail('understudy-hold: off the plate, the gates must fall shut');
  // and the walk-into swap never leaves it blocking
  E.understudy = { mapId: 'wing', x: 3, y: 11, path: [], i: 0, active: false };
  E.state.px = 2; E.state.py = 11;
  if (!E.tryUnderstudySwap(3, 11)) fail('understudy-swap: walking into it should swap');
  if (!(E.state.px === 3 && E.state.py === 11 && E.understudy.x === 2 && E.understudy.y === 11)) fail('understudy-swap: positions should exchange');
  E.resetTransientEntities();
  E.state = null;
}

// ---------- Your Own Room: budget, illegal placement, serialization ----------
{
  const E = MM.engine;
  const mkRoom = pieces => {
    E.state = {
      mapId: 'myroom', wing: null, opened: {}, monsters: [], name: 'w13room',
      gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 1, py: 4,
      items: { food: {}, charms: [] }, charmsOn: [],
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
    };
    const w = E.ensureWing();
    w.titleGiven = true;
    if (pieces) w.myRoom.pieces = pieces.map(p => ({ ...p }));
    E.buildMyRoomGrid();
    E.resetTransientEntities.name; // (transients were reset by grid build path)
    return w.myRoom;
  };
  const mr = mkRoom([]);
  // budget: 10 walls place, the 11th is rejected
  let placed = 0;
  for (let i = 0; i < 11; i++) if (E.myRoomPlace('wall', 3 + (i % 8), 1 + Math.floor(i / 8) * 5)) placed++;
  if (placed !== 10) fail(`myroom: wall budget should cap at 10 (placed ${placed})`);
  // illegal placements: the entry tile, solid template tiles, occupied cells, OOB
  if (E.myRoomPlace('plate', MM.maps.MYROOM_ENTRY.x, MM.maps.MYROOM_ENTRY.y)) fail('myroom: the entry tile must stay clear');
  if (E.myRoomPlace('plate', MM.maps.MYROOM_PEDESTAL.x, MM.maps.MYROOM_PEDESTAL.y)) fail('myroom: cannot place on the pedestal');
  if (E.myRoomPlace('plate', MM.maps.MYROOM_BENCH.x, MM.maps.MYROOM_BENCH.y)) fail('myroom: cannot place on the workbench');
  if (E.myRoomPlace('plate', 3, 1)) fail('myroom: cannot place on an occupied cell');
  if (E.myRoomPlace('plate', 0, 0)) fail('myroom: cannot place on the border wall');
  if (E.myRoomPlace('plate', 40, 40)) fail('myroom: cannot place out of bounds');
  if (!E.myRoomPlace('plate', 6, 6)) fail('myroom: a legal plate placement was rejected');
  if (E.myRoomPlace('plate', 7, 7)) fail('myroom: plate budget is 1');
  // serialization round-trip: pieces survive save/load byte-for-byte
  E.state.taskIndex = 1; E.state.tasksDone = []; E.state.mastery = {}; E.state.badges = {};
  E.state.totals = { answered: 0, correct: 0 }; E.state.parent = { pin: null, topics: {} };
  E.state.bestiary = { seen: {}, kills: {}, gauntlet: {} }; E.state.hp = 24; E.state.maxhp = 24;
  E.state.stamina = 100; E.state.maxStamina = 100; E.state.level = 1; E.state.xp = 0;
  E.state.gear = { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] };
  E.state.continent = 'west'; E.state.worldPos = null; E.state.streak = 0;
  const savedPieces = JSON.stringify(E.state.wing.myRoom.pieces);
  E.save();
  E.load('w13room');
  const loaded = JSON.stringify(E.state.wing.myRoom.pieces);
  if (savedPieces !== loaded) fail('myroom: pieces did not survive a save/load round-trip');
  if (E.state.wing.myRoom.solveCount !== 0) fail('myroom: solveCount should round-trip');
  E.state = null;
}

// ---------- the pupil's solver: fixtures + determinism ----------
{
  const E = MM.engine;
  const realRandom = Math.random;
  Math.random = () => { throw new Error('THE SOLVER MUST NOT USE Math.random'); };
  let empty, walled, gated, gated2;
  try {
    // solvable: an empty room — a straight walk to the pedestal
    empty = E.myRoomSolve([]);
    // unsolvable: a full wall line across the room (within the 10-wall budget)
    const wallLine = [];
    for (let y = 1; y <= 8; y++) wallLine.push({ t: 'wall', x: 6, y });
    walled = E.myRoomSolve(wallLine);
    // solvable: wall line pierced by a plate-gate, with a plate + slab to hold it
    const fix = [];
    for (let y = 1; y <= 8; y++) if (y !== 4) fix.push({ t: 'wall', x: 6, y });
    fix.push({ t: 'gate', x: 6, y: 4 });
    fix.push({ t: 'plate', x: 3, y: 2 });
    fix.push({ t: 'slab', x: 3, y: 4 });
    gated = E.myRoomSolve(fix);
    gated2 = E.myRoomSolve(fix);
  } finally {
    Math.random = realRandom;
  }
  if (!empty.solvable || !empty.steps.length) fail('solver: an empty room must be solvable');
  if (walled.solvable) fail('solver: a fully walled-off pedestal must be unsolvable');
  if (!gated.solvable) fail('solver: the slab-on-plate room must be solvable');
  if (JSON.stringify(gated) !== JSON.stringify(gated2)) fail('solver: two runs on the same room must return the SAME plan');
  // simulate the plan against the same rules: it must genuinely reach the goal
  const simulate = (pieces, steps) => {
    const base = MM.maps.parse(MM.maps.MYROOM, '#');
    const slabs = [];
    for (const p of pieces) {
      if (p.t === 'slab') { slabs.push({ x: p.x, y: p.y }); continue; }
      base[p.y][p.x] = MM.maps.MYROOM_PIECE_CHARS[p.t];
    }
    let { x, y } = MM.maps.MYROOM_ENTRY;
    for (const [dx, dy] of steps) {
      const nx = x + dx, ny = y + dy;
      const si = slabs.findIndex(sl => sl.x === nx && sl.y === ny);
      if (si >= 0) { slabs[si] = { x: nx + dx, y: ny + dy }; }
      x = nx; y = ny;
    }
    const ped = MM.maps.MYROOM_PEDESTAL;
    return Math.abs(x - ped.x) + Math.abs(y - ped.y) === 1;
  };
  if (!simulate([], empty.steps)) fail('solver: the empty-room plan does not reach the pedestal');
  // the cap defends against a state-space blowup: force it tiny and confirm
  // cap-hit reads as unsolvable, never a hang or a throw
  const realCap = E.MYROOM_SOLVER_CAP;
  E.MYROOM_SOLVER_CAP = 3;
  const capped = E.myRoomSolve([]);
  E.MYROOM_SOLVER_CAP = realCap;
  if (capped.solvable || !capped.capped) fail('solver: hitting the state cap must read as unsolvable (capped)');
}

// ---------- wedge-nudge coverage inside Your Own Room ----------
{
  const E = MM.engine;
  E.state = {
    mapId: 'myroom', wing: null, opened: {}, monsters: [], name: 'w13wedge',
    gold: 0, calmMode: true, isles: { lenses: {}, pet: null }, px: 2, py: 6,
    items: { food: {}, charms: [] }, charmsOn: [],
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
  };
  const w = E.ensureWing();
  w.myRoom.pieces = [{ t: 'slab', x: 1, y: 6 }];
  E.buildMyRoomGrid();
  E.pupil = null;
  E._futileSlab = 0;
  E._wedgeNoted = false;
  let dialogTitle = null;
  const realDialog = MM.ui.dialog;
  MM.ui.dialog = t => { dialogTitle = t; };
  // the slab is against the west border: three futile pushes raise the nudge
  for (let i = 0; i < 3; i++) E.myRoomSlabBump(-1, 0, 1, 6);
  MM.ui.dialog = realDialog;
  if (!dialogTitle || !/Wedged/.test(dialogTitle)) fail('myroom: three futile pushes must raise the wedge nudge in the kid\'s own room');
  // and the reset cord shuffles a pushed slab home
  E._myRoomSlabs[0].x = 4; E._myRoomSlabs[0].y = 6;
  E.state.grid[6][1] = '.'; E.state.grid[6][4] = 'U';
  E.state.px = 8; E.state.py = 8;
  E.myRoomReset();
  if (!(E._myRoomSlabs[0].x === 1 && E._myRoomSlabs[0].y === 6)) fail('myroom: the reset cord must shuffle slabs back to their placed spots');
  if (E.state.grid[6][1] !== 'U' || E.state.grid[6][4] !== '.') fail('myroom: the reset cord must redraw the grid');
  E.resetTransientEntities();
  E.state = null;
  E._futileSlab = 0;
  E._wedgeNoted = false;
}

// ---------- the homesick staircase: state machine + save/load + NG+ ----------
{
  const E = MM.engine;
  // build a full valid save to exercise load/startGolden/return
  localStorage.setItem('mathmaker2_save_w13stair', JSON.stringify({
    version: 4, name: 'w13stair', hp: 24, maxhp: 24, stamina: 100, maxStamina: 100,
    gold: 10, level: 1, xp: 0, potions: 1, difficulty: 'hero',
    parent: { pin: null, topics: {} }, taskIndex: 14, haveItem: false,
    tasksDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: { tidepool: true, frostbite: true, cinderforge: true }, keys: {}, egg: null, pet: null, lampLit: true, spireDone: true },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true, endingDone: true,
    gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  E.load('w13stair');
  const s = E.state;
  if (s.spiral.staircase !== 'lost') fail('staircase: a pre-Wave-13 save should migrate to lost');
  if (s.seenUnderstudy !== false) fail('migration: seenUnderstudy should default to false');
  // lost -> following (bump at the authored spot, post-ending, in d11)
  E.enterDungeon(11);
  s.monsters = [{ name: 'Bonepile', x: 20, y: 2, hp: 5, maxhp: 5, atk: 1, stun: 0, behavior: 'wander' }];
  const spot = MM.maps.STAIRCASE_SPOT;
  if (!E.staircaseDrawPos() || E.staircaseDrawPos().x !== spot.x) fail('staircase: lost should draw at the authored spot in d11');
  if (!E.stairBumpAt(spot.x, spot.y)) fail('staircase: bumping the spot should start the escort');
  if (s.spiral.staircase !== 'following') fail('staircase: bump should set following');
  // following: lags two moves behind
  E.stairStep(5, 5);
  if (!(E.stairPos.x === 5 && E.stairPos.y === 5)) fail('staircase: first step seeds the trail');
  E.stairStep(6, 5);
  if (!(E.stairPos.x === 5 && E.stairPos.y === 5)) fail('staircase: should lag TWO moves behind (still at the older tile)');
  E.stairStep(7, 5);
  if (!(E.stairPos.x === 6 && E.stairPos.y === 5)) fail('staircase: the trail should advance one behind the pet');
  // save/load MID-ESCORT: following survives
  E.save();
  E.load('w13stair');
  if (E.state.spiral.staircase !== 'following') fail('staircase: following must survive a save/load mid-escort');
  // following -> waiting when you go somewhere stairs cannot
  E.state.mapId = 'world';
  E.state.px = 12; E.state.py = 9;
  E.stairParkHere();
  const st2 = E.state.spiral.staircase;
  if (!st2.waiting || st2.waiting.x !== 12 || st2.waiting.y !== 9) fail('staircase: parking should record the waiting spot');
  E.save();
  E.load('w13stair');
  const st3 = E.state.spiral.staircase;
  if (!st3.waiting || st3.waiting.x !== 12) fail('staircase: waiting must survive a save/load');
  // waiting -> following on a bump
  E.state.mapId = 'world';
  if (!E.stairBumpAt(12, 9)) fail('staircase: bumping the waiting spot should resume the escort');
  if (E.state.spiral.staircase !== 'following') fail('staircase: resume should set following');
  // following -> home at the tower (via the homecoming), and the menu option
  {
    let choiceLabels = null, dialogSeen = null;
    const realDialog = MM.ui.dialog, realChoices = MM.ui.dialogChoices;
    MM.ui.dialog = (t, b, cb) => { dialogSeen = t; if (cb) cb(); };
    MM.ui.dialogChoices = (t, b, buttons) => { choiceLabels = buttons.map(x => x.label).join(' | '); };
    E.spiralMenu();   // following + world = the homecoming, then the menu
    MM.ui.dialog = realDialog; MM.ui.dialogChoices = realChoices;
    if (!/staircase comes home/.test(dialogSeen || '')) fail('staircase: bumping the tower mid-escort should play the homecoming');
    if (E.state.spiral.staircase !== 'home') fail('staircase: the homecoming should set home');
    if (!/floor 10/.test(choiceLabels || '')) fail('staircase: home should add the ⤴ Start from floor 10 option');
  }
  // NG+ snapshot: myRoom + staircase state survive startGolden AND the return
  {
    const w = E.ensureWing();
    w.myRoom.pieces = [{ t: 'wall', x: 5, y: 5 }, { t: 'plate', x: 6, y: 6 }];
    w.myRoom.solveCount = 3;
    const stash = JSON.stringify({ p: w.myRoom.pieces, c: w.myRoom.solveCount, st: E.state.spiral.staircase });
    E.startGolden();
    const after = JSON.stringify({ p: E.state.wing.myRoom.pieces, c: E.state.wing.myRoom.solveCount, st: E.state.spiral.staircase });
    if (stash !== after) fail('NG+: startGolden must carry myRoom + staircase state through');
    if (!E.returnToFinishedKingdom()) fail('NG+: returnToFinishedKingdom should succeed');
    const back = JSON.stringify({ p: E.state.wing.myRoom.pieces, c: E.state.wing.myRoom.solveCount, st: E.state.spiral.staircase });
    if (stash !== back) fail('NG+: the return must carry myRoom + staircase state through');
  }
  E.resetTransientEntities();
  E.state = null;
}

// ---------- Wave 14: "The Court" ----------
{
  require(path.join(ROOT, 'js/sprites.js'));
  const E = MM.engine;

  // (a) herald tileSprite context guard + sprite + dispatch flag. 'N' is the
  // herald glyph — chosen because it is FREE across every map + NPCS key (the
  // v1.7.9 'Y' collision is the cautionary tale; 'Z' is the Spire's clock
  // door and is deliberately NOT reused).
  if (!MM.data.NPCS.N || !MM.data.NPCS.N.court) fail("court: 'N' must be an NPCS entry flagged court:true (the herald)");
  if (MM.data.NPCS.N.sprite !== 'herald') fail("court: the herald must use the 'herald' sprite");
  if (!MM.sprites.DEFS.herald) fail('court: the herald sprite has no DEFS entry');
  // the herald stands on a FLOOR inside the castle (NPC pass draws the person
  // on top) — never bare grass; and the castle owns the 'N' context.
  if (MM.maps.tileSprite('N', 17, 3, 'castle', 0) !== 'hallFloor') fail("court: 'N' under the herald must draw hallFloor, not grass");
  // and 'N' collides with nothing: neutral in a dungeon, neutral on the world
  if (MM.maps.tileSprite('N', 0, 0, 'd19f1', 0) !== 'floor') fail("court: 'N' must stay neutral (floor) in a dungeon — no glyph collision");
  // the Spire's own clock-door glyph is untouched by the new herald
  if (MM.maps.tileSprite('Z', 0, 0, 'd19f1', 0) !== 'clockDoor') fail("court: the Spire's 'Z' clock door must be unaffected");
  // 'N' really is in the CASTLE map, beside (not on) the throne 'O'
  {
    const g = MM.maps.parse(MM.maps.CASTLE, '#');
    const z = MM.maps.find(g, 'N');
    if (z.length !== 1) fail("court: the CASTLE map must contain exactly one herald 'N'");
    const o = MM.maps.find(g, 'O')[0];
    if (z[0] && o && z[0].x === o.x && z[0].y === o.y) fail("court: the herald must NOT overload the throne 'O'");
  }

  // (b) courtCase generates a valid problem per skill AND stamps the real skill
  const COURT_SKILLS = ['fractions_as', 'multidigit_mult', 'decimals_md', 'word_problems'];
  for (const sk of COURT_SKILLS) {
    for (let i = 0; i < 40; i++) {
      const c = MM.problems.courtCase(sk, 2);
      if (c.problem.skill !== sk) { fail(`court: courtCase(${sk}) must record under its own skill (got ${c.problem.skill})`); break; }
      if (!c.problem.text || !c.problem.answer) { fail(`court: courtCase(${sk}) produced an invalid problem`); break; }
      if (!c.petitioner || !c.complaint || !c.settle) { fail(`court: courtCase(${sk}) missing petitioner/complaint/settle`); break; }
      if (JSON.stringify(c).length < 10) { fail('court: a case must be serializable'); break; }
    }
  }
  // the magistrate frame is skill-agnostic and escalates by visit index
  {
    const m0 = MM.problems.courtCase('decimals_md', 2, { magistrate: 0 });
    const m1 = MM.problems.courtCase('fractions_as', 2, { magistrate: 1 });
    if (!m0.magistrate || m0.petitioner !== MM.data.COURT.magistrate.name) fail('court: magistrate case must carry the magistrate petitioner');
    if (m0.complaint === m1.complaint) fail('court: magistrate grievance must escalate by visit index');
  }

  // ---- build a pre-Wave-14 save (no court fields) and load it ----
  localStorage.setItem('mathmaker2_save_w14', JSON.stringify({
    version: 4, name: 'w14', hp: 24, maxhp: 24, stamina: 100, maxStamina: 100,
    gold: 10, level: 1, xp: 0, potions: 1, difficulty: 'hero',
    parent: { pin: null, topics: {} }, taskIndex: 14, haveItem: false,
    tasksDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    mastery: {}, badges: {}, bestiary: { seen: {}, kills: {}, gauntlet: {} },
    continent: 'west', isles: { lenses: { tidepool: true, frostbite: true, cinderforge: true }, keys: {}, egg: null, pet: null, lampLit: true, spireDone: true },
    charmsOn: [], opened: {}, bossesDefeated: {}, defeatedAt: {}, streak: 0,
    totals: { answered: 0, correct: 0 }, worldPos: null, seenBattleHelp: true, endingDone: true,
    petHats: [],
    gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
    equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null }, enchants: {},
    items: { food: {}, treasures: [], charms: [], gems: [] },
  }));
  E.load('w14');
  const s = E.state;
  // (e) migration: a pre-Wave-14 save defaults clean
  if (s.court !== null) fail('court: a pre-Wave-14 save should migrate to court=null');
  if (!Array.isArray(s.faculty) || s.faculty.length) fail('court: faculty should migrate to []');
  if (s.courtSessions !== 0 || s.casesHeard !== 0 || s.magistrateVisits !== 0) fail('court: session/case/magistrate counters should migrate to 0');

  // capture UI for the flow
  const realDialog = MM.ui.dialog, realChoices = MM.ui.dialogChoices, realShow = MM.ui.showProblem, realBurst = MM.ui.worldBurst;
  let dialog = null, choices = null, prob = null;
  MM.ui.dialog = (t, b) => { dialog = { t, b }; };
  MM.ui.dialogChoices = (t, b, btns) => { choices = { t, b, btns }; };
  MM.ui.showProblem = (o) => { prob = o; };
  MM.ui.worldBurst = () => {};

  s.mapId = 'castle';
  // (c) day-keyed roll — three cases, weakest-first, magistrate leads
  E.refreshCourt();
  if (!s.court || s.court.cases.length !== 3) fail('court: refreshCourt should produce a 3-case queue');
  if (!s.court.cases[0].magistrate) fail('court: case 0 should be the recurring magistrate');
  const day = s.court.date, roll0 = JSON.stringify(s.court.cases.map(c => c.problem.text));
  // re-rolls on date turn, NOT before (stable same-day, heard or partial)
  E.refreshCourt();
  if (JSON.stringify(s.court.cases.map(c => c.problem.text)) !== roll0) fail('court: same-day refresh must NOT re-roll');
  s.court.date = '2000-01-01';
  E.refreshCourt();
  if (s.court.date === '2000-01-01') fail('court: a date turn must re-roll the queue');

  // hearing a case wrong = baffled re-ask (no scold, no loss, not heard)
  E.refreshCourt();
  const c0 = s.court.cases[0], skill0 = c0.problem.skill;
  const attemptsBefore = (s.mastery[skill0] || { attempts: 0 }).attempts;
  const hpBefore = s.hp, casesBefore = s.casesHeard;
  E.hearCase(c0);
  const wrong = prob.onAnswer(false, '999999');
  if (wrong.end) fail('court: a wrong ruling must not end the case (it re-asks)');
  if (!MM.data.COURT.baffled.includes(wrong.msg)) fail('court: a wrong ruling shows a baffled re-ask line');
  if (c0.heard) fail('court: a wrong ruling must NOT settle the case');
  if (s.hp !== hpBefore) fail('court: a wrong ruling must never cost HP (gentle failure)');
  // (d, part 1) recording under the REAL skill happens on every ruling
  if ((s.mastery[skill0] || { attempts: 0 }).attempts !== attemptsBefore + 1) fail('court: a ruling must record under the case\'s real skill');

  // hearing correct = settles + records + a gratitude gift
  const a0 = c0.problem.answer, canon0 = a0.d === 1 ? String(a0.n) : `${a0.n}/${a0.d}`;
  const right = prob.onAnswer(true, canon0);
  if (right.end !== 'win' || !/Settled/.test(right.msg)) fail('court: a correct ruling settles the dispute');
  if (!c0.heard || s.casesHeard !== casesBefore + 1) fail('court: settling bumps the cases-heard counter (counts up)');
  if ((s.mastery[skill0] || {}).attempts !== attemptsBefore + 2) fail('court: the correct ruling records too, under the real skill');

  // settle the rest → full session → celebration + faculty spawn at cadence
  for (const c of s.court.cases.filter(x => !x.heard)) {
    E.hearCase(c);
    const a = c.problem.answer;
    prob.onAnswer(true, a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);
  }
  dialog = null;
  E.holdCourt();
  if (!dialog || !/adjourned/i.test(dialog.t)) fail('court: a full 3/3 session triggers the celebration');
  if (s.courtSessions !== 1) fail('court: a full session bumps courtSessions (counts up)');
  // (d, part 2) the milestone fired: the Clerk spawns at 1 session
  if (!s.faculty.includes('clerk')) fail('court: the first Faculty post (Clerk) should spawn at its milestone');
  if (!E.facultyAt(21, 3) || E.facultyAt(21, 3).id !== 'clerk') fail('court: the spawned Clerk should stand at its castle slot');
  // re-opening after all-heard shows the quiet hall (celebration once)
  dialog = null;
  E.holdCourt();
  if (!dialog || !/quiet/i.test(dialog.b)) fail('court: re-opening after a full session shows the quiet hall');

  // faculty milestone cadence: 3 → bailiff, 6 → recorder
  s.courtSessions = 3;
  let claimed = E.checkFaculty();
  if (!s.faculty.includes('bailiff') || !claimed.some(p => p.id === 'bailiff')) fail('court: the Bailiff should spawn at 3 sessions');
  s.courtSessions = 6;
  claimed = E.checkFaculty();
  if (!s.faculty.includes('recorder')) fail('court: the Recorder should spawn at 6 sessions');
  if (E.checkFaculty().length) fail('court: checkFaculty must not re-claim an already-taken post');

  // (f) NG+ carries s.court + s.faculty + cases-heard through both directions
  s.casesHeard = 12; s.magistrateVisits = 5;
  const stash = JSON.stringify({ court: s.court, faculty: s.faculty, sessions: s.courtSessions, cases: s.casesHeard, mag: s.magistrateVisits });
  E.startGolden();
  const afterGolden = JSON.stringify({ court: s.court, faculty: s.faculty, sessions: s.courtSessions, cases: s.casesHeard, mag: s.magistrateVisits });
  if (stash !== afterGolden) fail('court: startGolden must carry court/faculty/cases-heard through untouched');
  if (!s.endingDone) fail('court: the crown (endingDone) survives NG+, so the court can still sit');
  E.returnToFinishedKingdom();
  const afterReturn = JSON.stringify({ court: s.court, faculty: s.faculty, sessions: s.courtSessions, cases: s.casesHeard, mag: s.magistrateVisits });
  if (stash !== afterReturn) fail('court: returnToFinishedKingdom must carry court/faculty/cases-heard through untouched');

  MM.ui.dialog = realDialog; MM.ui.dialogChoices = realChoices; MM.ui.showProblem = realShow; MM.ui.worldBurst = realBurst;
  E.state = null;
}

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
