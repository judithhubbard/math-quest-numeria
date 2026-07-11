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
MM.sound = { fanfare() {}, thud() {}, coin() {} };
MM.ui = { log() {}, refresh() {}, modalOpen: () => false };
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
  // and the reverse: a fresh, fully-migrated state (E.load's path) must
  // default music_reading OFF on its own, with no test fixture spoon-feeding it
  const freshSt = { parent: { pin: null, topics: { music_reading: false } } };
  for (let i = 0; i < 500; i++) {
    const p = MM.mastery.pickArenaProblem(freshSt);
    if (p.skill === 'music_reading' || p.kind === 'staff') fail('cap-leak: music_reading leaked into a fresh default-migrated state');
  }
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
  const cards = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD]);
  const names = new Set();
  for (const c of cards) {
    if (!c.desc) fail(`bestiary: "${c.name}" has no desc`);
    if (!c.sprite) fail(`bestiary: "${c.name}" has no sprite`);
    if (names.has(c.name)) fail(`bestiary: duplicate monster name "${c.name}" (cards are keyed by name)`);
    names.add(c.name);
  }
  if (cards.length !== 76) fail(`bestiary: expected 76 cards, found ${cards.length}`);
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
                             // floor (impassable until mended, Wave 6.5)
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
for (let idx = 1; idx <= MM.data.TASKS.length; idx++) {
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
  const GRASS_OK = new Set(['.', 'P', '=']);
  const FLOOR_OK = new Set(['.', 'm', 'g', 't', 'b', 'A', 'B', 'C']); // A/B/C rewritten to #/. at entry
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
  for (let idx = 1; idx <= MM.data.TASKS.length; idx++) {
    MM.maps.dungeonFloors(idx).forEach((raw, fi) => checkMap(raw, `d${idx}f${fi}`, `render d${idx} f${fi}`));
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

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
