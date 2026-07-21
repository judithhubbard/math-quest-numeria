# Through the Looking Glass — scoping (2026-07-21)

A design direction to react to, not a work order. The post-game replay,
reimagined: the player steps through a looking glass into a MIRROR NUMERIA
where **negative numbers are the world**, and plays the whole game again,
reflected. Supersedes Golden Numeria (which was "same, but harder" — a
weaker reason to replay). Reversible, opt-out, gentle, and — this is the
whole insight — the theme IS the math: negatives are the number line
reflected through zero, so a mirror world is the single best embodiment of
them, not a costume over them.

## The core insight (why this works)

Lewis Carroll's *Through the Looking-Glass* is a world where everything is
reversed, backwards, inverted. The integer number line is the same idea:
zero is the mirror, positives and negatives are reflections of each other.
So the mirror world doesn't ILLUSTRATE negatives — it IS them. This keeps
faith with Numeria's founding thesis ("the mortar is arithmetic; the math
is the world"), now for signed numbers. Continuity gift: the Looking Glass
is already an object in the game (Wave 18 — it changes your avatar). It has
been showing you reflections all along; once you've won, it shows you a
whole world.

## Supersedes Golden Numeria (user decision, 2026-07-21)

Golden Numeria (the reversible "re-tangle harder, keep everything" NG+) is
REPLACED by Through the Looking Glass. REUSE its machinery: the entry
snapshot + restore (s.goldenSnapshot → s.mirrorSnapshot), the reversibility,
the parent-panel recovery, the explicit-prompt discipline (the Golden
Numeria confusion — a kid pressed it and thought he'd lost his kingdom — is
the reason reversibility + an explicit prompt are non-negotiable here).
Migrate any in-flight Golden Numeria save cleanly. One post-game replay,
not two confusingly-similar ones.

## The four settled questions (from the 2026-07-20/21 discussion)

- **Points/scaling: do NOT inflate.** The hero is near cap (XP moot); if
  gear is kept, gold is near-moot too. The mirror world's difficulty is the
  NEGATIVE-NUMBER MATH, not bigger HP bars. Prestige is a distinct marker
  (panes of the glass cleared / mirror-stars), never a 2× on maxed numbers.
- **Do NOT strip equipment.** Taking earned gear is the Golden-Numeria
  mistake (never take what they earned). Your real gear comes WITH you,
  untouched; the mirror world has its OWN separate progression — reflected
  MIRROR-GEAR re-earned inside it that never touches your real inventory.
  Fresh progression, zero loss; step back through the glass and your
  kingdom is exactly as you left it. Optional "start clean" TOGGLE for the
  fresh-start fantasy, never forced. (Even fully geared, the kid still must
  ANSWER the signed problems to deal damage — the pedagogy survives.)
- **Rename "taming."** The mirror monsters are reflections of friends you
  already made, so it isn't "taming a wild thing" — it's RECOGNITION.
  Recommended verb: **"Recognize"** (or "Remember") — you look past the
  reflection and see the friend you know. Mechanic identical; the replay
  becomes a reunion with the befriended-kinds you collected. More moving
  than fresh taming, and it rewards the existing collection.
- **Reversibility is explicit + two-way.** A mirror steps back naturally;
  snapshot on entry, restore on opt-out, and the prompt says plainly what's
  happening. A kid must never feel they lost their game by looking.

## ===== NEGATIVE-NUMBER PUZZLES: options reviewed + recommendation =====

The pedagogical question: how do kids best MEET negatives? Not one puzzle —
a LADDER of representations (embodied → seen → typed), matching the game's
existing pedagogy and the two-kids constitution (the anxious kid gets
gentle embodiment; the advanced kid gets the signed arithmetic). Options,
scored on pedagogy / fit-with-existing-mechanics (cost) / fun /
constitution:

- **A. Signed problems in the sacred combat/door loop** (7 + (−3), −4 × 2,
  typed). Pedagogy: solid calculation fluency. Cost: LOW mechanically
  (reuse showProblem/combat) but GATED on the PARSER FIX (input currently
  rejects negatives — the known prerequisite) + signed generators + a
  parent switch. Fun: the familiar loop made harder — the backbone, not the
  magic. Constitution: fine. → **INCLUDE as the backbone; necessary, not
  sufficient.**
- **B. The number line as a walkable PLACE** (mirror overworld = the number
  line; zero at center, negatives are a direction you walk into). Pedagogy:
  THE canonical integer model — "a place before a rule" (the sequel
  scoping's principle, brought into 1D). Cost: MEDIUM (the overworld is
  already mirrored/rebuilt; making zero explicit + signed position is new UI
  over existing movement). Fun: high — exploration IS the math; walking
  west into "less than nothing." Constitution: great. → **INCLUDE as the
  SPINE — negatives as geography, for everyone, before arithmetic.**
- **C. Additive inverses via PAIRING — Tweedledum & Tweedledee** (mirror
  twins, one +n and one −n; pair them and they cancel to ZERO). Pedagogy:
  EXCELLENT + distinctive — teaches what a negative fundamentally IS (the
  opposite that cancels), the conceptual heart of integers that most games
  skip in favor of drilling signed arithmetic. Cost: LOW-MEDIUM — REUSES
  the Wave 12 Numberling machinery almost directly (pushable numbered slabs
  into a socket "▢ + ▢ = 0" that accepts ANY inverse pair — the "every true
  filling" acceptance already exists). Fun: high — the "Contrariwise"
  comedy + the satisfying cancel-to-nothing click. Constitution: perfect.
  → **THE FLAGSHIP PUZZLE. Cheap (reuses slabs), conceptually deepest,
  best Carroll costume.**
- **D. Debt / economy (gold as signed).** Pedagogy: good real-world model
  (owing = negative). Cost: MEDIUM. Constitution: CAUTION — a kid seeing
  "you owe −40" can read as punishment/anxiety; the game never punishes.
  → **FLAVOR ONLY — the "mirror shopkeeper owes YOU" gag (a negative that's
  GOOD for the kid), never a real debt mechanic.**
- **E. Below-zero temperature / depth / elevation** (frozen sea, dive below
  zero, floors below ground). Pedagogy: good "below a benchmark" model.
  Cost: MEDIUM (new area/tiles). → **ENVIRONMENTAL flavor + the occasional
  "dive to −5" puzzle; supports B vertically. Secondary, one area.**
- **F. Opposing vectors / the Red Queen's race** (a floor moving −n while
  you step +n; net displacement). Pedagogy: models adding opposite signs.
  Cost: MEDIUM. Constitution: CAUTION — the "race" framing flirts with time
  pressure (FORBIDDEN); must be a SPATIAL puzzle you solve, never a clock
  you beat. → **OPTIONAL advanced one-off; strip the timer, keep the
  spatial reasoning.**
- **G. Reflection across zero / absolute value** (|x| = distance from zero;
  the mirror reflects x to −x). Pedagogy: literally the mirror theme.
  Cost: LOW-MEDIUM. → **WONDER/CONCEPT layer — the mirror reflecting a
  number to its negative, Cheshire-explained; look, don't drill.**

### RECOMMENDATION — a ladder, not a single puzzle
Match the game's own embodied→seen→typed pedagogy and the two-kids
constitution. In priority order:
1. **B (number line as the world) — the SPINE.** Negatives are GEOGRAPHY
   first: the mirror overworld is the number line, zero at center, negatives
   a direction. Everyone meets negatives here gently, before any arithmetic.
2. **C (Tweedle additive-inverse pairing) — the FLAGSHIP puzzle.** The
   distinctive, memorable, cheap-to-build mechanic that teaches the ESSENCE
   of negatives (opposite-that-cancels). Reuses Wave 12 slabs.
3. **A (signed problems in combat/doors) — the BACKBONE fluency.** Where
   signed-arithmetic practice actually accrues, in the sacred loop that
   already teaches everything. GATED on the parser fix + a parent switch.
4. **G (reflection/absolute value) — the WONDER layer.** The mirror shows
   −x; Cheshire-narrated, never tested.
5. **D / E / F — FLAVOR & OPTIONAL.** The shopkeeper-owes-you gag, the
   frozen-sea area, one advanced Red-Queen spatial puzzle — none
   load-bearing, all gentle (no punishment, no timer).

Through-line: **negatives as geography and reflection FIRST (embodied,
gentle, for everyone); signed arithmetic SECOND (the loop, parent-gated,
for the ready kid).** The Tweedle inverse-pairing is the flagship because
it is cheap, deep, and delightful all at once.

## The mirror aesthetic (a coherent SYSTEM, not reskins)
Everything reflected — reusing existing palette/flip tech (monster pals,
themePalette, avatarPalette, the mirror-for-facing render flag):
- The overworld map flipped left–right; sprites mirrored; a cool inverted
  palette. Monsters are REFLECTIONS of the kinds you know (same creatures,
  mirror-tinted, moving/speaking in inversions).
- Reversal comedy in the deadpan register: NPCs greet with "Goodbye!";
  Barnaby sings the ballad backwards; the compass points the wrong way and
  is very confident about it. Mirror-Miscount (the real one was redeemed
  from guessing — his reflection is the guesser he used to be, or an eerily
  perfect worker-out; either is a scene).
- Familiar-made-strange is the joy of NG+; a mirror delivers it near-free.

## The Cheshire Cat (guide + gentle hint, with a job)
The mirror world's recurring GUIDE-AND-HINT creature (Wonderland cast
absorbed as "reflections too"). Materializes at thresholds (new area) and
when the kid is STUCK (reuse the hint infrastructure — wedge-nudge, parent
alerts, the Tutor), drops one riddling-but-USEFUL line about negatives,
then fades smile-last. Warm-cryptic, NEVER at the kid's expense (tune out
Carroll's smugness — a friend who talks in riddles). Sample voice: "Which
way is less than nothing? Both ways, if you like — that's the trouble with
mirrors." / "To get to zero from below, you go up. From above, you go
down. Everyone arrives eventually." ANIMATION is cheap + native: the engine
already runs timed field effects with expiry (mimic bob, _slabPop glyph,
worldBurst, gate-glint) — a Cheshire fade = draw the body at decreasing
alpha over ~2s while holding a crescent-smile at full alpha, then let the
smile linger and fade last.

## The Carroll cast — wonder-flavor vs real puzzle (user's question)
Split: ONE is a real negative-number puzzle; the rest are wonder-flavor
(look/delight/reference, per the wonder guardrail — wonder never becomes a
problem generator).
- **REAL PUZZLE: Tweedledum & Tweedledee** = additive inverses (see C above).
- **Wonder-flavor (mostly cosmetic + light reference):**
  - White Queen's "jam to-morrow and jam yesterday — but never jam to-day"
    — the number line as a rule you can taste (−1 / +1 around to-day at 0);
    a plaque or a shop rule, lightly.
  - White Queen who lives backwards / remembers the future — a
    reversal-comedy NPC whose "memory" of what you're about to do is a
    gentle hint (memory DIRECTION, not time pressure — safe).
  - Humpty Dumpty, words-mean-what-I-choose — the contrarian
    rules-explainer who blusters through why "less than nothing" is
    perfectly sensible (a funny way to INTRODUCE negatives).
  - Jabberwocky in MIRROR-WRITING — the poem readable only by reflection
    (a discoverable wonder moment); the Jabberwock = the mirror-world boss.
  - Chess structure — *Looking-Glass* is a chess game where a pawn crosses
    the board and becomes a queen; RHYMES exactly with Numeria's
    student→MathMaker arc. A light chessboard motif / "cross to the far
    side" framing, zero rule change.
  - The Caterpillar's "Who are YOU?" — a callback to the Wave 18 avatar
    picker (the wardrobe already asks "who would you like to be?").
  - Talking flowers (Garden of Live Flowers) — a near-free cousin of the
    Kitchen-Garden carrot.
- **HANDLE CAREFULLY (time = forbidden pressure): use the INVERSIONS.** The
  Mad Tea-Party where it is ALWAYS six o'clock and time never moves = a
  cozy, stakes-free rest-hub (an anti-timer — funny BECAUSE nothing is
  rushed). Use the frozen clock, never the ticking one. Skip the White
  Rabbit's "I'm late!" hurry entirely.

## Constitution & prerequisites
- **Parser fix is the gating prerequisite** — input currently REJECTS
  negatives (known issue, flagged in SEQUEL_SCOPING). Must accept "−3" /
  "-3" (unicode-minus vs hyphen vs subtraction-sign edge cases), with unit
  tests, before any typed negative. Gates puzzle A and any signed input.
- **Parent switch for negatives** — they are ~6th-grade integers, the top
  of Numeria's range. Families not ready keep the mirror world
  negative-free or opt in gradually. The mirror world itself is a natural
  "opt into advanced" gate.
- **Two-kids constitution** — the anxious kid gets the embodied/gentle
  representations (B geography, C pairing, the Cheshire kindness, no
  punishment/debt/timer); the advanced kid gets the signed arithmetic (A)
  and the harder puzzles (F). Never auto-detect which kid.
- Gentle failure preserved: wrong signed answers re-ask, never punish. No
  timers anywhere (the Carroll time-refs are frozen/anti-timers only).

## Rough phasing (scoping → work orders)
Large feature; leverages the engine hard (same maps mirrored, monsters
palette-swapped, reversibility machinery reused). Suggested order:
- **P0 — the parser fix + negatives parent switch** (prerequisite; its own
  small release with tests).
- **P1 — the mirror shell + reversibility** (step through the glass →
  snapshot → mirror overworld; opt-out → restore; supersede Golden Numeria;
  the number-line-as-place spine, B).
- **P2 — the aesthetic + the Cheshire Cat** (palette/flip mirror system,
  the fade animation, the reversal comedy pass, "Recognize" rename).
- **P3 — the puzzles** (C Tweedle inverse-pairing flagship; signed combat/
  doors A woven in; G reflection wonder; optional E area / F one-off).
- **P4 — the Carroll cast + prose** (the wonder-flavor NPCs, mirror-writing
  Jabberwocky, the frozen tea-party hub, mirror-Miscount).
Each is an independently shippable wave in the project's usual discipline.

## Answers of record (one-liners)
- LENGTH: a full replay of Numeria, reflected — leverages existing content,
  so the NEW work is the parser, signed generators, the aesthetic layer,
  the puzzles (mostly C, reusing slabs), and the reversal prose.
- MATH: negatives as GEOGRAPHY + REFLECTION first (everyone), signed
  ARITHMETIC second (parent-gated, the ready kid). Ceiling stays integers;
  no further (that's the sequel's coordinate plane).
- REVERSIBLE + explicit, always. Keep gear (mirror-gear is a separate
  track). Don't inflate points. "Taming" → "Recognize."
- Cheshire Cat = the guide/hint with the disappearing-smile animation.
  Tweedles = the one real puzzle; the rest of Carroll = wonder-flavor.
