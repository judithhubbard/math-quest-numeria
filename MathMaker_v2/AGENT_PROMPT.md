# Copy-paste prompt for implementing expansion waves

Paste the block below into a Claude Code session (Sonnet 5 recommended;
Opus 4.8 for Waves 3–4 and 7 — rendered problem art and the endgame
cutscene). Replace `N` with the wave number. Run ONE wave per session, in
order.

---

Work in /Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2 (the game is
"Math Quest: Numeria"; internal names say MathMaker — never rename those).

Implement **Wave N** of EXPANSION_PLAN.md, and nothing else.

Before writing any code:
1. Read EXPANSION_PLAN.md in full — especially §0 (ground rules, testing
   discipline, known gotchas, recipes table).
2. Read the reference implementation the recipe table points to for this
   wave, in full, before copying its pattern.
3. Read LEVEL2_SPEC.md sections that Wave N references.

Rules you may not break:
- No timers, no ammo/mana/resource systems, no frameworks or build steps.
  The game must keep working by double-clicking index.html offline.
- Never rename the folder, the `MM` namespace, or localStorage keys
  (`mathmaker2_*`) — saved games must survive.
- New math topics need a parent-panel switch (a unit test enforces this).
- Follow the humor tone guide (LEVEL2_SPEC.md): jokes land on monsters and
  items, never the kid; worked solutions stay plain; bosses stay sincere.
- Old saves must migrate: add defaults in engine.js `load()` like the
  existing migrations, and test loading a save that predates your feature.

Definition of done (all mandatory):
1. `cd /Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2 && node
   tests/test.js` passes, including new unit checks for any new maps
   (row lengths + reachability — copy the existing BFS blocks; use the
   slide-aware one for any map with ice).
2. A new Playwright drive `tests/drive-<wave-name>.js` (copy the structure
   of tests/drive-cinder.js) exercises the wave's features end-to-end
   through real gameplay and passes with zero JS errors.
   Playwright is already installed at `/Users/jk/.claude/pw` — do NOT search
   the filesystem for it or reinstall. Run every drive as:
   `NODE_PATH=/Users/jk/.claude/pw/node_modules node tests/drive-<name>.js`.
3. EVERY existing drive in tests/ still passes (run them all; several
   assert exact counts — e.g. the Monster Book total — which you must bump
   when adding monsters, in tests/test.js AND any drive that asserts it).
4. Take screenshots in the drive and actually LOOK at them (Read the PNG) —
   especially any new sprites, tiles, or rendered problem art (clock faces,
   music staffs). Fix what looks wrong.
5. Update docs: README.md (player-facing description), EXPANSION_PLAN.md
   (mark Wave N "✅ SHIPPED <date>" with any deviations), tests/README.md
   (one bullet for the new drive).

When you're done, summarize: what shipped, what you deviated from and why,
test results (all drives listed PASS/FAIL), and anything you deferred.

If you get stuck on the same failure three times, stop and report the
failure clearly instead of thrashing.

---
