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

  // Weakest skills first (lowest recent accuracy, unpracticed counts as weak-ish).
  function weakestFirst(state, skills) {
    return skills.slice().sort((a, b) => {
      const aa = recentAccuracy(state, a), bb = recentAccuracy(state, b);
      return (aa == null ? 0.5 : aa) - (bb == null ? 0.5 : bb);
    });
  }

  // Combat problem for dungeon i: usually the dungeon's topic,
  // sometimes review of a weak earlier topic.
  function pickCombatProblem(state, dungeonIndex) {
    const primary = MM.data.TASKS[dungeonIndex - 1].skill;
    let skill = primary;
    if (dungeonIndex > 1 && Math.random() < 0.25) {
      const earlier = MM.data.TASKS.slice(0, dungeonIndex - 1).map(t => t.skill);
      const ranked = weakestFirst(state, earlier);
      skill = Math.random() < 0.7 ? ranked[0] : ranked[Math.floor(Math.random() * ranked.length)];
    }
    return MM.problems.generate(skill, tierFor(state, skill));
  }

  // Easy review problems for resting at the inn.
  function pickReviewProblems(state, upToTask, count) {
    const skills = MM.data.TASKS.slice(0, Math.max(1, upToTask)).map(t => t.skill);
    const ranked = weakestFirst(state, skills);
    const probs = [];
    for (let i = 0; i < count; i++) {
      const skill = ranked[i % Math.min(3, ranked.length)];
      probs.push(MM.problems.generate(skill, 1));
    }
    return probs;
  }

  MM.mastery = { record, tierFor, accuracy, recentAccuracy, weakestFirst, pickCombatProblem, pickReviewProblems, ensure };
})();
