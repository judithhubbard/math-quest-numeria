// MathMaker — per-skill mastery tracking and adaptive problem selection.
// Difficulty adapts to recent accuracy; weak earlier skills get review time.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  function ensure(state, skill) {
    state.mastery = state.mastery || {};
    if (!state.mastery[skill]) {
      state.mastery[skill] = { attempts: 0, correct: 0, recent: [] };
    }
    return state.mastery[skill];
  }

  function record(state, skill, correct) {
    const m = ensure(state, skill);
    m.attempts++;
    if (correct) m.correct++;
    m.recent.push(correct ? 1 : 0);
    if (m.recent.length > 10) m.recent.shift();
  }

  function recentAccuracy(state, skill) {
    const m = ensure(state, skill);
    if (!m.recent.length) return null;
    return m.recent.reduce((a, b) => a + b, 0) / m.recent.length;
  }

  // Pick a difficulty tier (1-3) from recent performance.
  // New skills start gentle and ramp up as the kid succeeds.
  function tierFor(state, skill) {
    const m = ensure(state, skill);
    if (m.attempts < 4) return 1;
    const acc = recentAccuracy(state, skill);
    if (m.attempts < 8) return acc >= 0.75 ? 2 : 1;
    if (acc < 0.6) return 1;
    if (acc < 0.85) return 2;
    return 3;
  }

  function accuracy(state, skill) {
    const m = ensure(state, skill);
    return m.attempts ? m.correct / m.attempts : null;
  }

  // ----- topic badges -----
  // The highest badge tier the current numbers justify: 0 none, 1 bronze,
  // 2 silver, 3 gold. Bronze is pure volume; silver and gold also demand hot
  // recent accuracy (last-10 window). The ENGINE persists the best tier ever
  // reached (state.badges) — a badge, once earned, is never taken away.
  function badgeTier(state, skill) {
    const m = ensure(state, skill);
    const recent = recentAccuracy(state, skill);
    if (m.correct >= 50 && recent != null && recent >= 0.90) return 3;
    if (m.correct >= 25 && recent != null && recent >= 0.75) return 2;
    if (m.correct >= 10) return 1;
    return 0;
  }

  // ---------- "almost!" surfacing (Wave 8a, DQ) ----------
  // badgeTier (above) gates on a correct-count volume threshold. This checks
  // how close the kid is to the NEXT tier, using the persisted best-tier-
  // ever (state.badges) rather than the instantaneous (recent-accuracy-
  // gated, so it can dip) tier — "almost" only ever counts up, never flickers.
  const TIER_THRESHOLD = { 1: 10, 2: 25, 3: 50 };
  function almostNextTier(state, skill) {
    const cur = (state.badges && state.badges[skill]) || 0;
    if (cur >= 3) return null;
    // read-only: this runs on every sidebar render for every topic, so it
    // must NOT call ensure() and seed a real mastery entry just from being
    // asked "is this almost?" — a topic the kid has never touched should
    // stay entirely absent from state.mastery, not show up as {attempts:0}.
    const m = (state.mastery && state.mastery[skill]) || { correct: 0 };
    const need = TIER_THRESHOLD[cur + 1] - m.correct;
    return (need > 0 && need <= 3) ? { tier: cur + 1, need } : null;
  }

  // ---------- rust (Wave 8a, P5): the spacing model the arc was missing ----------
  // weakestFirst alone only ever looks at ACCURACY — a topic the kid nailed
  // three weeks ago and hasn't touched since looks just as "mastered" as one
  // practiced yesterday. Real spaced-practice needs recency too: a topic
  // unpracticed for RUST_DAYS+ real days gets a one-time nudge toward the
  // front of the queue, framed (in the bounty board) as the WORLD needing
  // tending — which, after Wave 7, is literally the kid's job.
  const RUST_DAYS = 5;
  const RUST_BONUS = 0.15; // enough to outrank a SLIGHTLY weaker fresh topic,
                            // never enough to leapfrog a genuinely struggling one
  function daysSincePracticed(state, skill) {
    const d = state.lastPracticed && state.lastPracticed[skill];
    if (!d) return 0; // never recorded a practice date — nothing to go stale
    const ms = Date.now() - new Date(d + 'T00:00:00').getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }
  function isRusty(state, skill) {
    return daysSincePracticed(state, skill) >= RUST_DAYS;
  }

  // Weakest skills first (lowest recent accuracy, unpracticed counts as
  // weak-ish, and a stale topic gets a staleness bonus toward the front).
  function weakestFirst(state, skills) {
    return skills.slice().sort((a, b) => {
      const aa = recentAccuracy(state, a), bb = recentAccuracy(state, b);
      let av = aa == null ? 0.5 : aa, bv = bb == null ? 0.5 : bb;
      if (isRusty(state, a)) av -= RUST_BONUS;
      if (isRusty(state, b)) bv -= RUST_BONUS;
      return av - bv;
    });
  }

  // ----- parent topic switches -----
  // Parents opt each topic in or out (math isn't linear — a kid might know
  // place value but not long division). Everything below routes its skill
  // through capSkill(), so any dungeon still plays — it just serves problems
  // from topics the kid has been allowed.
  function cappedSkills(state) {
    const topics = state.parent && state.parent.topics;
    const base = MM.data.PARENT_TOPICS;
    let list = topics ? base.filter(sk => topics[sk] !== false) : base;
    if (!list.length) list = [base[0]]; // never zero topics
    return list.slice();
  }
  function capSkill(state, skill) {
    const allowed = cappedSkills(state);
    if (allowed.includes(skill)) return skill;
    const ranked = weakestFirst(state, allowed);
    return ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
  }

  // Combat problem for dungeon i: usually the dungeon's topic,
  // sometimes review of a weak earlier topic. QUICK problems only, so battles
  // keep their pace — the slow, full-depth problems live at the gates
  // (bosses, doors, chests, and dungeon seals).
  function pickCombatProblem(state, dungeonIndex) {
    const primary = MM.data.TASKS[dungeonIndex - 1].skill;
    let skill = primary;
    if (dungeonIndex > 1 && Math.random() < 0.25) {
      const earlier = MM.data.TASKS.slice(0, dungeonIndex - 1).map(t => t.skill);
      const ranked = weakestFirst(state, earlier);
      skill = Math.random() < 0.7 ? ranked[0] : ranked[Math.floor(Math.random() * ranked.length)];
    }
    return MM.problems.generateQuick(capSkill(state, skill));
  }

  // Boss battles are the dungeon's real test: full-depth problems of its
  // topic, at a tier that adapts to how the kid has been doing.
  function pickBossProblem(state, dungeonIndex) {
    const skill = capSkill(state, MM.data.TASKS[dungeonIndex - 1].skill);
    return MM.problems.generate(skill, Math.max(2, tierFor(state, skill)));
  }

  // Quick problems from ALL ten topics, weighted toward whatever the kid is
  // weakest at. Used by Miscount's sparring golems AND regular monsters in
  // the expansion dungeons (11+), where every dungeon is mixed review.
  function pickArenaProblem(state) {
    const skills = cappedSkills(state);
    const ranked = weakestFirst(state, skills);
    const skill = Math.random() < 0.5
      ? ranked[Math.floor(Math.random() * Math.min(3, ranked.length))]
      : ranked[Math.floor(Math.random() * ranked.length)];
    return MM.problems.generateQuick(skill);
  }

  // Full-depth mixed problem for gates in the expansion dungeons
  // (bosses, doors, chests, seals): weakest topic, adaptive tier.
  function pickMixedGate(state) {
    const ranked = weakestFirst(state, cappedSkills(state));
    const skill = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
    return MM.problems.generate(skill, Math.max(2, tierFor(state, skill)));
  }

  // ---------- 50/50 own-topic vs. everything else ----------
  // weakestFirst weighting would let a kid who's aced the dungeon's own
  // topic stop seeing it at all — a topic dungeon's whole point is practicing
  // THAT skill, so every non-gate problem in it is a flat coin flip between
  // ownSkill and review of the rest (itself still weakest-first, so review
  // time stays useful). If a parent has switched ownSkill off, cappedSkills()
  // already excludes it and this falls back to 100% review — same
  // "disabled everywhere" contract as capSkill. Generalized from the
  // Clockwork Spire's original time_reading-only picker (Wave 3) so the
  // Sunken Breakwater (Wave 6, geometry) can reuse the exact same logic.
  function pickHalfMixSkill(state, ownSkill) {
    const allowed = cappedSkills(state);
    const others = allowed.filter(sk => sk !== ownSkill);
    if (!allowed.includes(ownSkill)) return weakestFirst(state, others.length ? others : allowed)[0];
    if (!others.length || Math.random() < 0.5) return ownSkill;
    const ranked = weakestFirst(state, others);
    return ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
  }
  function pickHalfMixProblem(state, ownSkill) {
    return MM.problems.generateQuick(pickHalfMixSkill(state, ownSkill));
  }
  // Full-depth version for a topic dungeon's doors, chests, and boss.
  function pickHalfMixGate(state, ownSkill) {
    const skill = pickHalfMixSkill(state, ownSkill);
    return MM.problems.generate(skill, Math.max(2, tierFor(state, skill)));
  }

  // Clockwork Spire (Wave 3): time_reading. Kept as named wrappers — tests
  // and engine.js call these by name for the cap-leak contract.
  const pickSpireSkill = state => pickHalfMixSkill(state, 'time_reading');
  const pickSpireProblem = state => pickHalfMixProblem(state, 'time_reading');
  const pickSpireGate = state => pickHalfMixGate(state, 'time_reading');

  // Sunken Breakwater (Wave 6): geometry.
  const pickBreakwaterSkill = state => pickHalfMixSkill(state, 'geometry');
  const pickBreakwaterProblem = state => pickHalfMixProblem(state, 'geometry');
  const pickBreakwaterGate = state => pickHalfMixGate(state, 'geometry');

  // Easy warm-ups for resting at the inn.
  function pickReviewProblems(state, upToTask, count) {
    const allowed = cappedSkills(state);
    const skills = MM.data.TASKS.slice(0, Math.max(1, upToTask)).map(t => t.skill)
      .filter(sk => allowed.includes(sk));
    const ranked = weakestFirst(state, skills.length ? skills : allowed);
    const probs = [];
    for (let i = 0; i < count; i++) {
      const skill = ranked[i % Math.min(3, ranked.length)];
      probs.push(MM.problems.generateQuick(skill));
    }
    return probs;
  }

  MM.mastery = { record, tierFor, accuracy, recentAccuracy, badgeTier, weakestFirst, capSkill, cappedSkills, pickCombatProblem, pickBossProblem, pickArenaProblem, pickMixedGate, pickReviewProblems, pickHalfMixSkill, pickHalfMixProblem, pickHalfMixGate, pickSpireProblem, pickSpireGate, pickBreakwaterProblem, pickBreakwaterGate, ensure, isRusty, daysSincePracticed, almostNextTier };
})();
