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
MM.sound = { fanfare() {}, thud() {}, coin() {}, correct() {}, wrong() {}, levelup() {}, tone() {}, whoosh() {} };
MM.ui = { log() {}, refresh() {}, modalOpen: () => false, dialog() {}, dialogChoices() {}, showProblem() {} };
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
  const interact = 'CSIn1234567890aeghjq';
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
  solid: '#GABCUilr',        // walls, lever-gates, gear gates, slabs,
                             // blueprint plaques, reset levers, broken
                             // floor (impassable until mended, Wave 6.5).
                             // A/B/C stay SOLID here on purpose: the audit
                             // asks "does this door gate anything if it were
                             // shut", and any one gear gate can be shut. Their
                             // per-rotation reachability has its own test
                             // (the Spire block) — Wave 7 kept them in the
                             // live grid but did not change what they gate.
  open: '.mgtbk*%<>Xv^,_osRL ', // floor, spawn markers, pickups, stairs,
                             // chutes, terrain effects, singing stones,
                             // gear plates (walk-on), one-shot levers
                             // (post-pull = open route)
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
    const interact = 'WcpSInf123H';
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
  for (const ch of ['W', 'c', 'p', 'S', 'I', 'n', 'f', '1']) {
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

// ---------- Music pass (2026-07-12): track structure audit ----------
// The composer can't hear headless Chrome — but structure is checkable:
// every note lands inside its loop, names a real frequency, and stays
// UNDER the effects volume (music is background by design-rule).
{
  require('../js/music.js');
  const tracks = MM.music.TRACKS;
  for (const [name, t] of Object.entries(tracks)) {
    if (!t.tempo || !t.loop || !t.notes.length) fail(`music: track '${name}' malformed`);
    for (const [beat, note, dur, vol, type] of t.notes) {
      if (beat < 0 || beat >= t.loop) fail(`music '${name}': note at beat ${beat} outside its ${t.loop}-beat loop`);
      if (dur <= 0) fail(`music '${name}': zero/negative duration at beat ${beat}`);
      if (!(vol > 0 && vol <= 0.05)) fail(`music '${name}': volume ${vol} breaks the background rule (0 < v <= 0.05)`);
      if (type !== 'sine' && type !== 'triangle') fail(`music '${name}': harsh oscillator '${type}'`);
    }
  }
  if (!tracks.world || !tracks.dungeon || !tracks.battle) fail('music: a moment is missing its track');
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

  // combat problems: normally QUICK (tier-less); brave swaps in a FULL-DEPTH one
  const calm = { mastery: {}, parent: { topics: {} }, brave: false };
  const bold = { mastery: {}, parent: { topics: {} }, brave: true };
  let quicks = 0, deep = 0;
  for (let i = 0; i < 200; i++) {
    if (MM.mastery.combatProblem(calm, 'addsub_facts').quick) quicks++;
    if (!MM.mastery.combatProblem(bold, 'addsub_facts').quick) deep++;
  }
  if (quicks !== 200) fail(`brave off: combat must draw QUICK problems (got ${quicks}/200)`);
  if (deep !== 200) fail(`brave on: combat must draw FULL-DEPTH problems (got ${deep}/200)`);

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

  // befriended wanderers/chasers stand down; guards still guard, thieves still
  // steal (the comedy is load-bearing), and bosses are never pacified at all
  if (!MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'wander' })) fail('a befriended wanderer should stand down');
  if (!MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'chase' })) fail('a befriended chaser should stand down');
  if (MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'guard' })) fail('a befriended GUARD still guards its post');
  if (MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', behavior: 'thief' })) fail('a befriended THIEF still steals — the joke survives the friendship');
  if (MM.engine.isPacified({ name: 'Echo Bat', sprite: 'bat', boss: true })) fail('a boss is never pacified');
  // and a monster you have NOT befriended is never pacified
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
    if (!h.id || !h.name || !h.emoji || !h.price) fail(`PET_HATS entry "${h.id}" is missing a required field`);
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
  const cheap = MM.data.PET_HATS.slice().sort((a, b) => a.price - b.price)[0];
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
  const pricey = MM.data.PET_HATS.slice().sort((a, b) => b.price - a.price)[0];
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
  MM.engine.state = null;
}

// ---------- Wave 10 (P1): the Turning Stones — data completeness ----------
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
  const xs = new Set(stones.map(s => s.x));
  if (xs.size !== 13) fail('Turning Stones: x coordinates must be unique');
  if (!stones.every(s => s.y === 7)) fail('Turning Stones: every stone should sit on row 7');
  // every stone tile must be ordinary walkable grass on the raw overworld —
  // NOT a new glyph (the whole point of the overlay recipe)
  stones.forEach(st => {
    const ch = ow[st.y][st.x];
    if (ch !== '.') fail(`Turning Stones: tile (${st.x},${st.y}) is '${ch}', not plain grass — the overlay recipe requires it stay ordinary walkable ground`);
  });
  // alignment reads s.tasksDone.length live — sanity-check the helper
  // functions never throw and stay in range
  for (let i = 0; i < 13; i++) {
    const a = MM.data.stoneTrueAngle(i);
    if (a < 0 || a >= 360 || a % 90 !== 0) fail(`Turning Stones: stoneTrueAngle(${i}) = ${a}, expected a multiple of 90`);
    const sk = MM.data.stoneSkew(i);
    if (typeof sk !== 'number' || Number.isNaN(sk)) fail(`Turning Stones: stoneSkew(${i}) is not a number`);
  }
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

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
