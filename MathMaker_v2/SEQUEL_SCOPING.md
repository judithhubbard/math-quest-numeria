# Math Quest: Beyond the Spiral — sequel scoping (2026-07-13)

Broad-strokes scoping for a SIBLING game to Math Quest: Numeria. Not a
work order; a design direction to react to. Nothing here is committed.

## The sibling thesis

Surveying how successful games build siblings:

- **Pokémon paired versions** — same structure, content deltas. Rejected:
  produces "Numeria with different monsters," an expansion wearing a new
  name.
- **Mario Galaxy 2** — more-of-it, refined. Rejected: that's what waves
  are for; a sibling must feel NEW.
- **Majora's Mask** — reuse engine + asset language wholesale, change the
  STRUCTURE radically, let one systemic idea drive everything. ADOPT.
- **Dragon Quest numbered entries** — new world/cast, shared GRAMMAR
  (slimes, spells, bells) so it's unmistakably kin. ADOPT.

Synthesis: **keep the grammar, change the structure — and make the new
structure BE the new pedagogy.** In Numeria, "math is the power system"
was structural. In the sequel, the new topics must be structural the same
way, not new problem types poured into old bottles.

## The fiction seed (already planted in Numeria)

- The ending reveals the kingdom IS a golden spiral seen from above.
- Sylvia's telescope tease (Wave 6); "sail onward" as an established verb.
- "The kingdom will tangle again someday. Kingdoms do."
- The kid ends the game AS the new MathMaker.

Premise: you have tended your own kingdom. Now something tangles beyond
the spiral's edge — out where no chart exists. The new MathMaker sails.

## Recommended structure: The Uncharted Quadrants

Numeria sits at the ORIGIN of a coordinate plane. The sequel's world is
the open sea in all four quadrants around it.

1. **Coordinates as traversal.** Sail to positions like (7, −3). The
   world map is a real four-quadrant grid and the kid CHARTS IT HERSELF —
   islands appear only once she fixes their position. Wrong coordinates
   are never punished: "you found… open water. Noted on the chart." The
   chart filling in is the sequel's progress bar (as island murk was
   Numeria's).
2. **Integers as geography.** Negative x and y are literally the west and
   south seas. Depth (below sea level), temperature (the ice sea), debt
   (trade ports) reprise negatives vertically and economically. The
   number line becomes a PLACE before it is ever a rule.
3. **Ratios/proportion as the crafting spine.** Alchemist recipes that
   scale ("cures one sailor; you have five"); map scale ("one finger =
   four leagues"); exchange rates on trade routes.
4. **Percents as the port game.** Discounts, the harbor bank's interest,
   "20% of the catch to the crew" — Numeria's money quizzes, grown up.
5. **Statistics as weather.** Read the barometer log to choose a sailing
   day — mean/median as a decision tool (the honest use of statistics).

Structural changes (the Majora move):
- Task ladder → NONLINEAR DISCOVERY. Home base is your ship, not a
  castle. Islands found in any order; curriculum order enforced gently by
  DISTANCE FROM ORIGIN (farther = later topics), never by locked doors.
- "Untangle the kingdom" → "chart the unknown."
- The combat loop stays IDENTICAL (type answer, Enter; bold/gentle;
  ⚡ Brave) — the loop is the grammar; changing it would break kinship.

Shared grammar (the Dragon Quest move):
- Slimes-with-hats, mimics, the pet, Barnaby as a wandering ship's bard,
  badges/bestiary/boards, worked-solutions-on-every-miss.
- **The Adventurer's Passport imports a Numeria hero** — level, stance,
  pet, befriended kinds greeting you on far shores. (Already built; this
  is Pokémon trading / Zelda's carried items, for free.)

## Pedagogy notes

- 6th-grade core: ratios/proportions, percents, integers/rationals,
  coordinate plane, expressions & one-step equations (a natural "spell
  formula" system), intro statistics. Exponents optional late.
- New topics live IN THE SEQUEL rather than as opt-in toggles bolted onto
  Numeria — cleaner than the old percents-toggle sketch in FUTURE_LEVELS.
- Parent topic switches, mastery model, tiers, weakest-first review, and
  the practice-not-teaching stance all carry over unchanged.
- The two-kids constitution is non-negotiable inheritance: no timers,
  gentle failure, bold/gentle identity, never auto-detect which kid.

## Alternatives considered, set aside

- **Sky tower** (vertical world; elevation integers): one axis is thinner
  than four quadrants; weaker exploration.
- **Run the Academy** (management game; percents-rich): drops exploration,
  which is the fun engine of the family.
- **Seasons/time cycle** (Majora's literal mechanic): flirts with time
  pressure — forbidden in this family.

## Practical prerequisites

- Answer parser rejects negative numbers today (small, known fix; needs
  unit tests for "−3" vs "-3" input forms).
- Engine/idiom carries wholesale: no build step, canvas sprites, WebAudio
  music, drives + marathon + evidence discipline. That is most of a year
  of infrastructure, free.
- Separate repo/folder, separate save keys — the Passport is the bridge.

## Session 2 additions (2026-07-13): logic grids + the full 6th-grade map

(Khan's cc-sixth-grade-math page is a JS app and wouldn't render for
fetching; the mapping below follows the Common Core 6th-grade structure
its course mirrors — 11 units. Spot-check against the live page when
convenient.)

### Logic grid puzzles: YES, as physical deduction

Not a content unit — the mathematical PRACTICE of deductive reasoning.
Their special value: ZERO arithmetic, so they're a gift to the anxious
kid (nothing to be "behind" in) while genuinely deep for the advanced
one. NEVER the abstract grid chart. Instead: **harbor-office disputes** —
N crates, N merchants, clues as NPC testimony ("Mine isn't the
heaviest"), and the kid WALKS the crates to the docks. Self-checking
world: satisfied clues glow warm, contradicted ones amber with the
witness politely repeating themselves. No timer, no failure state.
Renewable daily (the sequel's Academy-equivalent), scaling 3×3 → 5×4.
Face: a recurring magistrate NPC (a very serious seagull in a tiny wig).

### The 11 units, embedded as verbs (test: "is the math inside something
### the kid's hands are doing?")

1. **Ratios** → galley + paint-mixing stations: pour real measures; wrong
   ratios make funny colors, never failure.
2. **Rational arithmetic** → sailcloth cutting ("how many ¾-yard patches
   from 6 yards?" — cut it and SEE the division).
3. **Rates & percent** → harbor market unit-price comparisons (walking to
   the better stall IS the math), bank interest, crew shares.
4. **Exponents & order of ops** → spell formulas / pulley rigging where
   operation ORDER is visible and physical; doubling chest for growth.
5. **Negative numbers** → dead reckoning (user's example, made central):
   "from (3, −2), sail 5 west, 4 north — set the heading marker on your
   computed destination BEFORE you sail." Canal locks: −4 → +3. The
   world is the number line.
6. **Expressions & variables** → the sealed crate that weighs w; reason
   about it without opening it.
7. **Equations & inequalities** → BALANCE-SCALE DOORS (the single best
   embodiment: same-weight-off-both-pans IS one-step equations, felt in
   the hands); inequalities as harbor drafts read off tide boards
   ("needs depth > 7 — pick your hour"; picking an hour ≠ a timer).
8. **Plane figures** → sail-making (triangle = half a rectangle, visibly)
   and deck-planking by decomposition — heir to Numeria's slab-tiling.
9. **Coordinate plane** → the world structure itself + plotted treasure +
   REFLECTIONS ("the twin wreck lies mirrored across the meridian").
10. **3D figures** → cargo-hold packing (volume), hull-painting quotes
    (surface area), and NETS as a fold-the-cutout puzzle.
11. **Statistics** → data the kid GENERATED: her own fishing hauls as dot
    plots; "which ground is more consistent" as spread reasoning; the
    weather-log sailing decision (mean/median as a tool).

### The structural shift vs Numeria

Numeria: math guards GATES (problems at doors/chests/combat). Sequel:
math becomes the VERB (pour, cut, balance, fold, chart, deduce) — the
embodied-puzzle direction FUTURE_LEVELS sketched becomes the default.
Typed problems remain for combat, which keeps the sacred unchanged loop
(type answer, Enter; bold/gentle; Brave). Every embodied puzzle keeps
the constitution: no timers, self-narrating, reset levers, wrong moves
cost nothing but the doing-over.

### Advanced-but-accessible content: two tiers (2026-07-13)

**Tier 1 — "deep water" curriculum (lines qualify).** Equations of lines
are nominally 8th grade, but slope is a RATIO wearing a heading ("every
3 east, 2 north") — within the sequel's own ratio unit. Embodiments:
course-plotting (a straight course IS a line), reef-crossing predictions
(intercepts), and RENDEZVOUS puzzles (two ships, two courses — where do
they meet? A system of equations, seen years before it's named). Lives
in the far late-game waters (distance-gating handles placement), full
parent switch, adaptive as always.

**Tier 2 — wonder (the Mandelbrot set qualifies).** Numeria already
invented this tier: the golden spiral and the Turning Stones are not
curriculum — they're wonder: discoverable, never tested, never gated.
The sequel's flagship: **the Dreaming Reef** at the world's far edge — a
live-rendered Mandelbrot coastline (≈20 lines of canvas, pure no-assets
idiom) explored by sailing closer and diving-bell zoom. The kid-level
hook is ITERATION, not complex numbers: "a very small rule, followed
very many times" — rhyming with the Fibonacci stones (each number from
the two before). One Sylvia-voice plaque says that much and no more.

**The guardrail: wonder never becomes a problem generator.** The moment
the Reef asks a quiz question it stops being wonder and becomes a lie
about age-appropriateness. Lines may cross into real problems
(slope-as-ratio is honestly in reach); complex iteration may not — it
stays beautiful instead. Generalizes: primes as a sieve carved in a
temple floor, Pascal's triangle in a tiled ceiling. Look, never test.

### THE CROSS-CUTTING THEME (user insight, 2026-07-13): model → predict → verify

Promotion: modeling is not a topic in the sequel — it is the CORE LOOP.
Observe data points (each one a PLACE, sailed to and witnessed: the
whale surfacing, a beacon flash, a tide mark) → fit a model → PREDICT →
set your heading on the prediction → sail there and be right. Numeria's
thesis was "a worked answer unties things"; the sequel's is "a good
model tells you where to look." Foresight is the power fantasy.

Continuity gift: Numeria's final exam (1,1,2,3,5,8,13 — what comes
next?) IS this loop. The sequel makes the first game's final question a
way of life. The Turning Stones were the tutorial all along.

Embodiment — the Chartwright's Table: collected observations plot onto
the chart; the kid lays a ROPE through them by dragging two pins — the
pins ARE slope and intercept, chosen by hand, no formula asked. Read
off the prediction, commit the heading marker, sail, verify.

Honest curriculum laddering:
- ENTRY (core 6th): proportional y = kx from tables — "3 crates cost
  12g, 5 cost 20g; you need 8" — unit rates ARE the first models.
- DEEP WATER: intercepts (y = ax + b), then gentle curves.
- STATISTICS, natively: noisy sightings that sit on no line — rope
  "through the middle" is informal best-fit; noise honestly costs
  SEARCH RADIUS at the predicted spot, never punishment.
- Interpolation vs extrapolation, FELT: predictions far beyond your
  data sail you into fog; near your data, clear water. One more
  observation thins the fog.

Gentle failure = residuals: a missed prediction lands in open water
with information ("two leagues south of your reckoning — the current,
maybe?"); refining the model is the natural next move.

Two kids: the anxious one gets a no-combat, no-wrong-answers mode where
verified prediction is a confidence engine; the advanced one gets fewer
points, noisier data, curves, farther extrapolation.

Fiction fusion: the old charts are gone; the world is re-known only by
observation and model. Everything in the far seas MOVES BY RULE — "find
the rule, and you'll be there before it is."

### Persistence of Numeria's math (user requirement, 2026-07-13)

All 13 Numeria topics remain live practice in the sequel: review pools
span old + new, weakest-first and RUST keep old topics rotating forever
(the spacing model was built for this), and the Passport carries
MASTERY DATA — an imported hero's review starts informed about what's
rusty. Fresh profiles get the old topics too (prerequisites, not
nostalgia). Parent switches span both sets.

### Visuals & engine (2026-07-13): no engine — grow our renderer

Rejected: Godot/Unity web (build step, huge payloads, breaks
double-click-offline — three constitution violations); Phaser (provides
scenes/physics/input we already have, proven by 27 drives + marathon —
engines pay when they replace undone work; ours is done); Three.js/3D
(breaks the pixel grammar; 3D asset pipeline is the "huge lift" this
project structurally avoids).

Fallback kept on the shelf: PixiJS vendored as a single classic-build
file (like the font — no build step). GOTCHA recorded: modern Pixi is
ESM-first and ES modules DO NOT LOAD from file:// — only the classic
IIFE build is vendorable. Adopt only if the hand-rolled path falls short.

RECOMMENDED: "exploration and wonder" is mostly WATER, LIGHT, and FOG —
achievable dependency-free:
1. WebGL water/sky layer UNDER the existing 2D sprite canvas — raw
   WebGL, one ~80-line shader, no library. Luminous animated ocean.
2. Sprite format grows 16×16 → 24×24 or 32×32, new nautical palette —
   the WIND WAKER move: same grammar, unmistakably new skin; the
   cheapest way a sequel "looks like a sequel."
3. Light compositor: dawn/dusk ambience tinting (never a clock
   mechanic), lighthouse beams, bioluminescent southern water, aurora
   on the ice sea.
4. Parallax horizon + distance haze: unexplored sea LOOKS unknown;
   islands resolve from fog as charted — atmosphere as progress bar.
All keeps: Playwright drives, render audits, Calm Mode discipline
(water gets a calm-safe gentle mode), double-click-offline.

Tone references: Wind Waker (visual jump, kept grammar); Outer Wilds
(wonder tone — THE "knowledge is the only progression" game, which is
what the modeling loop is for math).

### Fishing & reach reasoning (user idea, 2026-07-13)

"You're on a rock, your line is length 8 — will it reach the magical
fish?" — spans three honest tiers, and the game respects them:

- ENTRY (core 6th, literally CC 6.NS.C.8): AXIS-ALIGNED casts — from
  (3, −2) to a shimmer at (3, 4) is |4 − (−2)| = 6; line is 8; reach?
  Absolute value + signed subtraction as a DECISION: compute, commit,
  cast (the heading-marker commitment pattern again). Origin-rock
  fishing makes |x| = "distance from zero" literal.
- MIDDLE (seen, not tested): each rod draws its CIRCLE OF REACH as a
  soft overlay — radius felt before any formula. Diagonal casts are
  never computed at this tier (that's 8th-grade Pythagoras): the kid
  reasons inside-vs-outside visually. Hidden discoverable: PERFECT
  CASTS — a 5-line reaches (3,4) away; a 13-line reaches (5,12) —
  Pythagorean triples as fishing lore ("the 3-4-5 cast"), never
  explained. Wonder-rule applied to geometry.
- DEEP WATER (7th, parent-switched): circles proper — net AREA ("how
  many fish-shadows inside?"), ripple CIRCUMFERENCE, radius by name.

The generalized style: REACH REASONING — distance + inequality fused
into a decision made before acting (mooring ropes, lighthouse beam
range, telescope sight radius). Same grammar as the modeling loop:
commit, then test against the world.

Ecosystem fit: magical fish are CLUE-GIVERS feeding the modeling loop
(the fish names the next observable); hauls are the kid's own
statistics data (dot plots). One system, three curriculum strands,
inherently calm — no combat, no timer; another gift to the anxious kid.
# QUEUED: SEQUEL_SCOPING.md additions (fold in at Wave 11 review; agent owns tree)

## Story & emotion (2026-07-13 session 3)
- The Cartographer: charts DESTROYED, not lost — after one catastrophic
  failed prediction she concluded "if you cannot know perfectly, do not
  sail." Perfectionism as the villain-shaped wound; redemption thesis =
  "roughly right and honest about uncertainty beats certain and wrong"
  (the statistics unit AS the emotional arc). Brackets Miscount: he
  guessed without working; she refused to guess at all; the game IS the
  healthy middle (work it out, commit, revise).
- Emotional beats attach to CHART MILESTONES: charted regions visibly
  reconnect (mail boats, reunions, trade lines drawn on the kid's map).

## Answers of record
- LENGTH: ~30-35h main arc (11 units × 2-4h island clusters) + the
  renewable layer (daily disputes, fishing/statistics, endless deep
  water). Depth-per-island over island count; do not out-bulk Numeria.
- CHARACTERS: a CREW of 3-5 travels with you (navigator/cook/
  quartermaster/lookout/magistrate seagull — one curriculum strand and
  one emotional thread each); fixes mid-game story sag structurally.
  Cameos by correspondence (Miscount teacher-to-teacher, Sylvia's
  telescope notes).
- PLAYING OTHERS: 2-3 short palette-shifted MEMORY VIGNETTES (sail the
  doomed voyage as the young Cartographer) at emotional pivots. Single
  scene, no progression bleed. Never a second track.
- MATH FOCUS: modeling is the SPINE (appears everywhere, like Numeria's
  quick combat problems), the 11 units are the breadth as island verbs.
  Hard ceiling: deep water ends at lines/gentle curves; beyond = wonder,
  looked at never tested.
- LEVELS: RINGS — concentric named sea regions ("charted 4/7"), the
  chart itself is the level structure; islands are the Mario-sense
  levels; nonlinear within a ring; XP/hero levels carry via Passport.
- ALSO: befriended sea creatures FEED the modeling loop (a soothed
  whale surfaces data points — the gentle verb becomes chart
  knowledge); the residual sentence pattern is the game's most
  important kindness; interaction-primitive budget (drag pins, pour,
  cut, place, walk-to — no minigame sprawl); process inheritance from
  wave 1 (drives-first, evidence discipline, self-narration,
  gauge↔lever, screenshots-are-review); parent panel shows the 6th
  grade map day one with the practice-not-teaching line.
