# Beyond Wave 5 — future math levels & embodied puzzles

Design sketches only — NOT work orders yet. Written 2026-07-10 while Wave 3
was in flight. Promote a section into EXPANSION_PLAN.md as a proper wave
(with file references and acceptance tests) when its turn comes.

## 1. Where the curriculum stands

Shipped skills: arithmetic facts, multi-digit add/sub/mult, long division,
decimals (place value + mult/div/money), fractions (equiv/add/sub +
mult/mixed), word problems. Wave 3 adds time_reading; Wave 4 adds
music_reading (opt-in). Against the 5th-grade core, THREE real gaps remain,
each with a natural game hook:

| Gap (all core 5th grade → default ON) | Natural game hook |
|---|---|
| **Geometry: area, perimeter, volume** | building & repairing things |
| **Coordinate plane (first quadrant)** | treasure maps & digging |
| **Measurement conversions** (L↔mL, kg↔g, min↔s...) | potion recipes, cargo |

Also core but better as **fold-ins** than levels:
- **Numerical expressions / order of operations** `(3 + 4) × 2` — "spell
  formula" gates; zero parser work. A good theme for one of Wave 5's Deep
  Wings (the Wizard's Tower).
- **Line plots & simple graphs** — once Wave 3 lands the `p.svg` pipeline,
  chart-reading problems are cheap anywhere ("the harbor catch chart").
- **Rounding & estimation** — QUICK battle variants ("ABOUT how many?" with
  choice buttons), sprinkled into existing rosters.

**6th-grade preview tier — parent-opt-in, default OFF** (the family has
explicitly deferred harder math; these wait until asked for):
percentages (shop sale days), ratios & exchange rates (a trading post),
integers/negative numbers (thermometers, depths — NOTE: the engine currently
REJECTS negative answers: parseAnswer plus a unit test asserting
`answer.n >= 0` both need deliberate changes first), GCF/LCM (see gear
puzzles below — the mechanic can ship with the numbers kept small and
friendly at default).

## 2. Embodied puzzles — math as blocks, doors, and floors
(user request, 2026-07-10: "puzzles involving actual blocks or secret doors
that directly relate to and reinforce the math")

Principle: the modal problems train *procedures*; these puzzles put the
quantity itself in the world, so the kid manipulates it spatially. Every one
below is no-timer/no-reflex, and every block puzzle needs a visible **reset
lever** so a wedged block can't soft-lock anything (gentle failure).

Ranked by engine cost:

**Cheap (a tile handler + a check):**
- **Number-line hallways** — a corridor of tiles labeled 0..N (or 0..1 in
  fourths); a plaque says "stand at 3/4 of the way" / "stand on 0.6"; a
  pressure plate under the right tile opens the door. Embodies fractions/
  decimals on a number line — straight 5th-grade territory, and the kid
  literally walks the magnitude.
- **Walk-to-coordinates digging** — a beach/plaza area with an etched grid;
  a treasure map says "(6, 3)"; walking there and digging IS the coordinate
  skill. Strongly prefer this walk-to version over type-"(6,3)"-in-a-modal —
  zero parser work and fully embodied. (Pairs with the dig-spot mechanic the
  Wayfinder's Locket already teases.)
- **Gear-ratio dials** — two meshed gears with N and M teeth; the door opens
  when both arrows point up again; the kid computes how many turns (LCM) and
  sets a dial (a lever-cycle, like the Spire's gear plates). Multiples made
  physical. Keep N, M small (2–12) so it's friendly at default-ON; larger
  pairs can be a parent-opt-in stretch.

**Moderate (new interaction UI or a new tile behavior):**
- **Slab-tiling rooms (the "actual blocks" one)** — a marked rectangular
  region in the floor; the kid PUSHES stone slabs (sokoban-style, one push
  moves a slab one tile if free) sized 2×3, 1×4, etc. until the region is
  exactly covered. Area by decomposition: a 3×4 slab "is" 12. Push logic is
  ~15 lines in tryMove; the reset lever re-spawns slabs. The blueprint
  plaque asks the area question first (modal), then the covering confirms it
  physically.
- **Balance-scale doors** — pans and a set of weight blocks (7.5, 4.25,
  0.75...); click blocks onto pans until both sides match the target. Decimal
  addition with instant visual feedback (the beam tilts). Dialog UI, no map
  mechanics.
- **Bucket-filled tanks** — a glass tank rendered in SVG layers, l×w×h
  labeled; the kid computes the volume, then pours that many unit buckets and
  watches the layers fill — off-by-one shows immediately and kindly.
- **Plank bridges** — a gap of length 2 tiles; planks of 1/2, 3/4, 1/4...;
  choose planks summing EXACTLY to the gap (a fraction bar shows the running
  total); the bridge then physically appears in the map. Fraction addition
  with a purpose.
- **Cargo rafts** — the raft bears 20 kg; crates weigh mixed decimals; load
  crates trip by trip. Decimal addition + planning; fewer trips = small gold
  tip, but ANY correct loading works (no fail state).

## 3. Level sketches that bundle the above

- **Level 5 — The Builder's Guild (GEOMETRY, default ON).** ✅ PROMOTED
  2026-07-10 → EXPANSION_PLAN.md **Wave 6 ("Gullwrack Harbor")**, scoped to
  one session: geometry topic + SVG recipe, the Sunken Breakwater (2
  floors), slab-tiling repair sites as THE new mechanic, rebuild-the-town
  payoff. Tanks/bridges/scales deferred to the Cartographer wave (one
  embodied mechanic per wave). The ending is now EXPANSION_PLAN Wave 7.
- **Level 6 — The Cartographer's Archipelago (COORDINATES, default ON).**
  Many islets, one map. Torn map pieces give (x,y) clues; walk-to-dig grids;
  line-plot "survey charts" reuse the p.svg pipeline; number-line hallways in
  the sea caves. Extends the treasure-map mini-game rather than competing
  with it.
- **Level 7 — The Alchemist's Kitchen (MEASUREMENT, default ON).** Could be
  a full dungeon or "an Emberlyn" (an NPC system + puzzles, cheaper). Potion
  recipes in mixed units (2.5 L needed, 400 mL vials...), balance-scale
  doors, cargo rafts on the canal. If made an NPC: she buys treasures for
  unit-conversion quizzes, sells a brewing mini-game.

Recommended order: Builder's Guild first (biggest curriculum gap + the
flashiest embodied mechanics), then Cartographer, then Alchemist. Each level
follows the Wave-3-established pattern: PARENT_TOPICS registry entry,
generator + QUICK variant + 400-per-tier round-trip, drive with screenshots.

## 4. Juice & delight catalog (2026-07-10 — effects, comedy, cuteness)

The battle screen already has shake/particles/floaters/crits; the walking
game is comparatively still. Everything below is vanilla-canvas cheap (the
engine already has tweens, `burst()`, `silhouette()`, WebAudio `beep()`).

**Anti-annoyance rules (non-negotiable, add to any wave that ships these):**
- Repeated-action effects ≤ 300ms, never block input, never play while a
  problem is open (focus is sacred).
- Ambient gags fire at most once per few minutes; one-time CEREMONIES may
  be big (that contrast is what makes them land).
- No strobing/flashing, ever. Add a parent-panel **Calm Mode** toggle that
  disables shakes/particles/ambient motion (accessibility + taste).
- Every cutscene skippable per-beat with any key.

**Ambient life (drawWorld already loops — drive 2-frame variants off a slow
frame clock):** water shimmer; torch flicker; murk drift; snow motes in
Frostbite, ember motes in Cinderforge, gear-dust in the Spire; gulls
crossing the isles sky; footstep sand puffs / pool splashes / a brief trail
line on ice slides.

**Reward sparkle (achievement moments only):** generalize battle.js
`burst()` into the world canvas for badge/level/bounty dings; doors crumble
into a few particles instead of vanishing; at streak ≥ 5 the hero gets a
subtle gold outline in battle (the `silhouette()` machinery does this in
one line); boss name-cards via the existing `banner()`.

**Comedy & cuteness (jokes land on monsters/world, never the kid):**
- Monster idle life: guards snooze (Zzz motes) until approached; thieves
  polish a stolen coin; a wanderer rarely bumps a wall and shows a "?!"
  floater (≤1 per few minutes).
- Pet tricks by stage: chases gulls on beaches; curls up if the kid stands
  still 10s; sneezes a tiny snow puff in Frostbite; stares mesmerized into
  Emberlyn's forge; post-boss high-five hop.
- The innkeeper's cat: sleeps on a different piece of furniture every
  visit; bump to pet = purr beep +1 stamina. Pure cuteness, zero design
  weight.
- The shopkeeper puts whatever you just SOLD on the shelf behind her —
  persistent; kids love noticing it.
- Tiny-hat economy: bestiary footer counts "hats respectfully retired: N."
  No mechanics. Kids will chase it anyway.

Shipped as **Wave 5 item 7** (see EXPANSION_PLAN) — small, independent,
perfect between big waves. The endgame cutscene ("The Kingdom, Untangled" +
the golden-spiral reveal) is specced inside **Wave 7**.

**The sequel door:** the spiral's arc continuing past the map edge is the
sequel hook — and the deferred 6th-grade tier (§1: percentages, ratios,
integers) IS the natural sequel curriculum. "Math Quest: Numeria — Beyond
the Spiral," next year's math beyond the spiral's edge. The ending stays
warmly closed; the hook is an open door, not a cliffhanger.

## 5. "The Tending" — the post-game practice loop (designed 2026-07-11)

The problem: after the credits, every finite system is finished (badges
gold, bestiary full, bosses crowned) — but the game's whole PURPOSE is
ongoing practice. The ending itself supplies the fiction: the kid is the
New MathMaker now, tangles keep forming, and tending the kingdom IS the
job. Post-game practice must feel like that job, not like leftover chores.

Three mechanisms (a Wave 8 when its turn comes; listed by priority):

**5a. Daily Tangles — the renewable heartbeat.** Each real-world day, 1–3
"tangles" appear somewhere in the kingdom (a scribble-knot monster on an
overworld or dungeon tile — the cutscene's visual, now in-world). The
notice boards say where ("A tangle was spotted near the Old Mine").
Untangling one = a short battle/gate drawing **weakest-first mixed
problems** — it's adaptive review wearing a story costume. This is the
mechanism that answers "why open the game on a random Tuesday."
- Incentive: **"days tended" counter that only counts up** — NO streak
  loss, ever (streak-loss mechanics create dread; a kid who missed a week
  must be welcomed back, not penalized). Milestones (10, 50, 100 days)
  celebrated and displayed in the Hall of Heroes.

**5b. Miscount's Academy — the teaching loop.** The ending's inverted
exam (grade a worked solution, find the wrong step) becomes renewable:
each day a few of Miscount's students bring homework to check. Error
analysis is the deepest practice there is, and narratively it's the
"teachers multiply" promise kept. The academy VISIBLY grows with
attendance — more desks, students earning their own little badges, a
class photo on the wall.

**5c. The Spiral Stair — volume for kids who want it.** An endless tower
that appears post-game (the spiral made walkable): floor N is a small
map chunk recycled from existing dungeon pieces with 2–3 mixed problems
and a monster or two; every 5th floor is a landing with a chest and a
"come back anytime" checkpoint (Beacon home always works; return to your
highest landing freely — no run-loss, this is not a roguelike). Personal
best = "highest step of the Spiral," on the Hall of Heroes plaque.
Infinite content from finite assets.

**The incentive spine — where practice rewards go once power is capped:**
- **Cosmetic gold sinks** (also fixes the post-game gold-purpose gap the
  balance pass will flag): furnishing the open castle room by room
  (rugs, banners, gardens, a library), statues of beaten bosses, and
  **tiny hats for the pet** (the game's best-loved gag, finally
  purchasable). All cosmetic, all visible, all permanent.
- **Family visibility**: everything above lands on the Hall of Heroes
  plaque (days tended, spiral height, academy students helped) —
  sibling-comparable, parent-praisable. Pass E's parent trend view shows
  the practice is really happening.
- **Novelty cadence, gently**: the daily tangle + academy refresh daily;
  a small seasonal reskin (harbor festival bounty sets) monthly if ever
  desired. No FOMO: missed days cost nothing and expire nothing.

Design rules carried over: no timers, no streak-loss, adaptive
weakest-first problem selection everywhere, cosmetics-not-power as
rewards (power is complete; that's what "finished" means), and every
mechanism reachable in under a minute from profile load — post-game
practice competes with not-playing, so friction is the enemy.

## 6. What NOT to do

- No timers on anything above — including "the raft sinks if..." No.
- No embodied puzzle may be the ONLY route forward on a first playthrough
  until the mechanic has appeared at least once in an optional room.
- Don't convert existing modal topics wholesale to puzzles — the modal reps
  are the practice engine; puzzles are the concept anchor. Roughly one
  embodied puzzle per floor, not one per fight.
- Roman numerals, symmetry painting, magic squares: fun, but they're flavor,
  not curriculum — at most one gag room each, never a gate.
