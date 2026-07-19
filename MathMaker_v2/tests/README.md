# MathMaker v2 — test infrastructure

## Unit/validation suite (no dependencies)

```
node tests/test.js
```

Validates: **every sprite** (Wave 7 — `MM.sprites.validate()` had existed
since day one and was never called; wiring it in immediately found two tiles,
`pool` and `keyTile`, with an uncoloured char punching a transparent hole in
them), every problem generator (full + quick) across all tiers with
canonical-answer checking (~18k problems, including `time_reading`'s clock
faces, `music_reading`'s treble-staff choices and rhythm-as-fractions,
elapsed-time word problems, `geometry`'s rectangle/L-shape/volume SVG
diagrams (every generated `p.svg` contains a real `<svg` and every
dimension named in the question text is actually drawn on it), and all six
`fractions_m` tier-3 variants — same-denominator, unlike-denominator
add/sub, improper↔mixed conversion, and regrouping subtraction, each
spot-checked by shape and confirmed absent from `QUICK.fractions_m`), the
answer parser edge cases (including `"3:15"` clock answers), mastery/
adaptive-tier logic, the parent topic switch disabling a topic everywhere
it could leak (arena, mixed gate, the Clockwork Spire's AND Sunken
Breakwater's 50/50 pickers — both thin wrappers around the shared
`pickHalfMixSkill/Problem/Gate` — and `music_reading`'s default-OFF
behavior on both a hand-built and a freshly-migrated state), map dimensions,
BFS reachability of every boss/chest/door/monster in all 13 mainland
dungeons (including the Deep Wing floors on dungeons 4/7/9 — key/lock
reachability on the original floor, then every POI on the new floor) plus
the isle dungeons (Tidepool, Frostbite, Cinderforge, Great Lighthouse,
Smugglers' Vault, Clockwork Spire — including the gear plate's
per-rotation-state reachability — the Resonant Halls, and the Sunken
Breakwater), guaranteed-gem chest coordinates across every dungeon,
`E.isDeepWingFloor`'s floor (not dungeon-wide) scoping, overworld POI
reachability (mainland, Isles, Horologe, Chime, and Gullwrack Harbor), the
east bank being unreachable without the bridge and fully reachable with
it, and every slab-tiling repair site (a real BFS over the push-state
space proving a solving sequence exists, plus a live reset-lever check
that it restores the exact start state). Wave 7 adds: the Open Castle's map
(exactly ten Gallery plinths for the ten mainland tasks, one of every other
landmark, **no monster markers anywhere**, every bumpable thing reachable
from the arrival tile, both castle NPCs registered); the castle gate's truth
table (open only with all 13 tasks + the Lamp + the Spire — and explicitly
NOT requiring the Resonant Halls); the inverted exam (all five slates, clean
and flawed: choices = one per step + "correct", the answer index always
pointing at the planted step, the final slate proven always clean, and the
whole thing proven absent from `GENERATORS`/`QUICK`); a gear gate proven to
render as two DISTINCT sprites open vs shut (the readability fix, guarded
against regression); and Golden Numeria (the kingdom resets, the hero's
level/badges/book/gear/charms/pet/crown all survive, and monsters come back
tougher). Wave 8a adds: `MM.data.SKILL_ICONS` registry-completeness (every
`PARENT_TOPICS` skill has a telegraph icon); the mon.skill cap-leak (a
monster bound to a topic falls back the instant a parent disables it, same
"disabled everywhere" contract); the Overwhelm rule's level-gap boundary
(a gap of 5 doesn't trigger, exactly 6 does, and bosses/arena/gauntlet
foes never trigger regardless of level); rust ordering (a stale-but-better
skill still outranks a fresh-but-slightly-worse one in `weakestFirst`);
"almost!" tier detection (`almostNextTier`, using the persisted best-tier-
ever so it only ever counts up); and the growth-tracking save shape
(`recordAnswer` populating `lastPracticed`/`history`/`recentMisses` in the
shape the parent panel and report card read).

Wave 8b adds: the Soothe flavor pools (every sprite family a monster actually
uses must resolve `soothe` and `fret` — and `FLAVOR.generic` must carry BOTH,
because `MM.data.flavor` falls back to it per-kind and `pick(undefined)` would
throw; plus every `SOOTHE_BESPOKE` key is proven to name a real monster, so a
typo can't silently never fire); the gentle instruments sitting at MATCHED tiers
(a ranged gentle weapon must be one atk BELOW its melee peer, and the Ceremony's
two starters must be *identical* in power — a question, not a handicap); Brave's
tier lift (capping at 3, swapping the quick problem for a full-depth one) and
**the pillar that it never lifts a door/chest/seal** — bravery pays in double
damage, which only exists in a fight, so a harder problem anywhere else would be
a trap; **the boss floor** (a brave strike may never take more than ⌈maxhp/3⌉ off
a boss, so a boss is always ≥3 correct answers — a flat 2× drops every boss in
the game to two); the Academy's eleven slates (each proven to plant exactly one
error when flawed, be clean when not, share a shape between the two, and carry a
non-empty `why` — the absence of which was a *real shipped bug*, see below) and
its parent-cap contract (a disabled topic never reaches the homework; if every
slate-bearing topic is off, the menu entry vanishes rather than serving one);
befriending (per-species, monotonic — killing one later must NOT un-friend the
kind; guards still guard, thieves still steal, bosses are never pacified); and
the calmed palette (every colour blended on every family — including `skeleton`
and `mage`, which have no `A`/`B` keys and would silently no-op under a naive
transform — with sorted keys so the sprite cache doesn't mint duplicate canvases).

It also now guards a **real bug this wave found in shipped code**: `examSlate()`
never put `why` on the problem object, but `engine.js` reads `prob.why` when the
kid marks the WRONG step — so since Wave 7 the final exam has said *"Here.
undefined"* on a miss, at the most sensitive moment the game has.
`drive-castle.js` missed it because it only asserts the feedback doesn't scold.

Wave 9 ("The Tending") adds: the Spiral Stair's own reachability audit (every
regular and landing chunk, X to every D/m/>/*/b — deliberately NOT folded into
the shared door-gating audit, since these doors are open-room practice
stations, not corridor gates) plus materialization checks (the right floor
count, a landing on every multiple of 5 and nowhere else, the top floor with
no way further up, and the array proven stable/cached across calls); Daily
Tangle placement DERIVED from the overworld's own walkable tiles across many
regenerations (never a hand-listed spot); the day-flip and same-day dedup
contract (two tangles one real day is still one day tended); castle
furnishing/pet-hat/statue data completeness; pet-hat buy/wear/take-off/
insufficient-gold branches and statue commissioning; the Academy's growth-line
thresholds; and a migration test for a save that predates all of it. It also
guards the **real bug this wave found by screenshot, not by any automated
check**: three of the castle's first-draft furnishing glyphs collided with
existing `MM.data.NPCS` keys used by townsfolk on OTHER maps — the NPC-draw
pass runs on every glyph regardless of map, so it drew a villager sprite right
over the furniture. Every `tileSprite()`-level check stayed green throughout
(they only prove a glyph maps to *some* sprite); only looking at a screenshot
caught it. A permanent unit check now asserts no castle glyph is an NPCS key.

Wave 11 ("The Grand Descent", visual-only) adds: theme-palette derivation
proven TOTAL over every one of `MM.data.THEMES`' 22 entries (every dungeon
1-22, wall AND floor, every char the base sprite defines present with a
valid hex color — no index gaps, no transparent-hole colors); the wall-tier
assignment (`MM.maps.wallTierSprite`) proven correct at every tier boundary
(d1-3 rough, d4-7 worked, d8-13 grand, d14+ back to rough) and that all
three tier sprites pass `MM.sprites.validate()`; wall/floor sprite cache
keys proven genuinely distinct between d1/d5/d9 (tier) and between two
same-tier dungeons like d1/d2 (tint alone); an exhaustive decor-never-on-a-
POI-cell scan (every glyph of every floor of every mainland dungeon, not a
sample); and the boss-room vignette proven nonzero exactly at the boss's
spawn tile and zero far away, for every mainland dungeon's floor 0. This is
the first wave with literally zero gameplay-file edits — only
`js/maps.js`, `js/sprites.js`, and `js/ui.js`'s `drawWorld` changed, and
the unit suite's existing render/door/reachability audits (which already
exercise every map through `tileSprite()`) stayed green throughout without
a single one needing to change, which is itself a check that nothing about
walkability moved.

## Browser drives (need Playwright + Chrome)

One-time setup in any folder:

```
npm init -y && npm install playwright
```

Then edit the `GAME` constant at the top of a drive script if the repo path
differs, and run e.g. `node tests/drive-battle.js`. They launch headless
Chrome via the installed Google Chrome (`channel: 'chrome'` — no browser
download needed), drive real gameplay, screenshot to a `shots*/` folder, and
fail on any page error.

- `drive-battle.js` — profile creation, castle intro, dungeon, full battle
  (correct + wrong answers), boss encounter, shop, report card.
- `drive-equip.js` — damage-roll bounds, buy/auto-equip, bag equip switching,
  selling gear at half price, ring effects, old-save migration.
- `drive-badges.js` — topic badges: bronze at exactly 10 correct, celebration
  dialog queueing behind open modals (pops in earn order on close), bag badge
  shelf, report-card icons, save/load persistence, no-downgrade rule.
- `drive-book.js` — Monster Book: ??? silhouettes when undiscovered, the
  seen-but-not-defeated state after fleeing, card reveal (flavor + kill count)
  after a real battle victory, discovery counter, save/load persistence.
- `drive-bounty.js` — notice board: empty pre-task-1, three posted jobs, real
  battles progressing hunt/solve/streak to completion with instant payout,
  cleared-board regeneration, daily date rotation.
- `drive-blankmodal.js` — the blank-modal watchdog: healthy modals pass, a
  silently-emptied modal is recorded to the bug log (with breadcrumbs,
  surviving reload) and replaced by a recovery message.
- `drive-frost.js` — Frostbite Hollow: lens-gated entry, the frozen-lake
  crossing, key/lock/stairs, the two-slide floe route to the boss gate, the
  lever island, the pad-locked cache, the Glacier's Heart lighting the Frost
  Lens, v-fog recession, persistence.
- `drive-charms.js` — charm slots: auto-wear while slots free, effects from
  WORN charms only, bag wear/take-off, fourth-charm refusal, old-save
  migration to first-three-worn.
- `drive-cinder.js` — Cinderforge Depths: lens gating, three floors, both
  keys, cinder shards, the lever-gated chute room, the one-way drop (same
  coordinates, one floor down), the Foreman lighting the Cinder Lens, the
  final fog clearing, the all-lenses lighthouse message, persistence.
- `drive-isles.js` — Level 2 Phases A+B: pier gating, Miscount's eggs, the
  hatching + naming, Isles overworld with Murk fog, Port Brightwater (Callie,
  Percy, Brass Compass isle stock + money quizzes), mystery potion, pet
  feed/follow/secret-sense, guard/wander/thief behaviors (steal, flee, catch
  with interest), tide pools, urchins, slides, teleport pads, secret walls,
  key + locked door, lever + gates, two-floor stairs, boss lighting the Tide
  Lens, fog recession, sailing both ways, save/load continent resume.
- `drive-lighthouse.js` — Wave 1: the Smugglers' Vault found via the pet's
  secret-sense (bump reveals `4`, persists through a map reload), the thief
  gauntlet, the guarded chest yielding the Smuggler's Crossbow (auto-equips
  over a worse weapon), the ranged round-1-miss rule (sub-label + battle
  behavior), Captain Brine yielding the Wayfinder's Locket; then the Great
  Lighthouse's four floors (slide lake, teleport-pad pair, two keys, the
  lever-gated chute landing on floor 4 at matching coordinates), Scout's
  shimmer overlay, Blink's two-tile hop (and its stamina cost), the Murk's
  50%-HP thicken phase, the Great Lamp lighting, the "Keeper of the Light"
  ending, Beacon's climb-and-return (and its once-per-visit lock),
  save/load persistence.
- `drive-qol.js` — Wave 1.5 (bulk-buy behavior updated by Wave 6's shop
  rework, see `drive-gullwrack.js`'s note below): the ×5/×10 potion buttons
  always render under the Supplies tab, even before any lifetime purchase,
  disabled only by gold — one money problem per transaction regardless of
  quantity, exact gold/potion math — and the one-time bulk-buy shopkeeper
  quip fires on completing the first bulk purchase rather than on the
  button first appearing. Also: the dungeon-2 door-audit fix played live
  (bump opens the door onto its new chest), defeated monsters staying gone
  for the real-world day (with the quiet-halls log line) and returning the
  next day, and the Hearthmoss Charm's slow walking heal (worn vs.
  unworn), plus `potionsBought` / `defeatedAt` save/load persistence.
- `drive-enchant.js` — Wave 2: finding a gem in the Smugglers' Vault's
  guaranteed glimmering chest, talking to Emberlyn, fusing a gem onto the
  equipped weapon (renamed label shown in her dialog and the bag), the
  numeric effect of every gem hook (flame/frost/guard/feather/magnet/echo/
  leech — leech via a real battle through the actual combat hooks, not a
  reimplementation), the amulet slot (purchase, never auto-equips, +10 max
  HP takes effect the instant it's equipped), and save/load persistence of
  gems, enchants, and amulets.
- `drive-spire.js` — Wave 3: sailing the newly-lit-lamp third leg to Horologe
  Isle, entering the Clockwork Spire (5 floors), a clock door rendering an
  actual SVG clock face and accepting a `"h:mm"` answer (screenshotted), the
  gear plate cycling A→B→C→A (each pull opening one alcove chest and closing
  the other two, never one-shot), the Cuckoo stealing gold and shouting
  (waking every other monster on the floor into a chase), the classic
  one-shot lever opening its gates, and The Unwound King's defeat setting
  `s.isles.spireDone` (persists through save/load).
- `drive-halls.js` — Wave 4: the spellbook carry-over (Help mentions
  "Spellbook", a spell's first unlock pops a one-time celebration containing
  "click", a disabled spell button carries a `title` tooltip), the Rope of
  Return (buy, greyed-out-with-tooltip on the overworld, usable and
  consumed inside a dungeon, save/load persistence), sailing the
  Spire-done-gated fourth leg to Chime Isle, entering the Resonant Halls (4
  floors), an echo door solved by reading `MM.ui.currentEcho` and clicking
  the tones back in order, a singing stone stepped on without error, the
  classic one-shot lever, The Discord's defeat setting `s.isles.hallsDone`,
  a treble-staff problem rendering an SVG (screenshotted) with a correct
  A–G choice accepted, a rhythm-as-fractions answer accepted, and 500 arena
  picks confirming `music_reading` never leaks out when the parent switch
  is off.
- `drive-depth.js` — Wave 5: dungeon 4 becoming two floors (`d4` → `d4f0`),
  the Deep Wing's key/lock/stairs and mixed-review floor
  (`E.isDeepWingFloor` checked live, not mocked) with its guaranteed
  glimmering chest; the separate Harbor Notice Board at Port Brightwater
  (new job types, proven independent of the mainland board by diffing it
  before/after), a real chest completing the "open a glimmering chest" isle
  job; a stage-3 (Champion) pet fetching a bonus item within 20 real arena
  victories (read from `.victory-lines`, not the persistent world log);
  Miscount offering the Champion's Gauntlet once a boss is beaten,
  `E.gauntletBosses()`, a full rematch win marking the boss's bestiary card
  (👑✨) while leaving `s.bossesDefeated` untouched; and Calm Mode holding
  `MM.battle.debugEffects()` at zero shake/particles through a live battle.
- `drive-gullwrack.js` — Wave 6: the `geometry` topic's three SVG diagram
  shapes screenshotted (a labeled rectangle, an L-shape with its
  decomposition line, a 3D volume box); the fifth sail destination gated on
  `s.isles.spireDone` (asserted locked before, offered from both Horologe's
  and Chime's docks after); arriving at Gullwrack Harbor (a full town,
  unlike town-less Horologe/Chime); the story seeds (Guildmistress Maren's
  intro line, Sage Sylvia's and Old Salt Percy's new lines gated on
  `breakwaterDone`); a full repair-site loop (blueprint plaque → pushing
  both slabs → site completes → gold paid) surviving save/load AND leaving-
  and-re-entering the map; the reset lever rescuing a slab wedged off-target
  (restoring its EXACT start position, live) before the site is solved for
  real; all 4 town sites completing → `s.isles.gullwrackRebuilt` → the
  Mason's Charm awarded and its +1 block confirmed via `E.totalDef()`; the
  shop rework's compare-to-equipped label spot-checked live; the Sunken
  Breakwater (2 floors, its one shortcut repair site clearing a rubble
  wall, The Undertow beaten, `breakwaterDone` set); and 1000 live
  `pickArenaProblem`/`pickBreakwaterProblem` draws confirming geometry never
  leaks when the parent switch is off.

- `drive-shopstress.js` (Wave 6.5) — 15 noisy buy/sell rounds (tabs, bulk,
  deliberate double-clicks and stray Enters) asserting the modal is never
  blank or collapsed after any step; the Horologe/Chime dockside carts
  (supplies-only, no tabs, no sell counter); the Gullwrack Chandlery's
  isle-tier stock; the shipboard bunk rest; the Ctrl+Shift+B manual bug
  capture; and that the blank-modal watchdog stayed silent throughout.

- `drive-castle.js` — Wave 7 (the ending): the castle gate (shut for a new
  hero; shut with all 13 tasks but no Lamp/Spire — and the shut door SAYS
  what it's waiting for; open WITHOUT the Resonant Halls, since music is a
  parent opt-in); the interior as a monster-free overworld; a Gallery plinth
  replaying the kid's own memory, and the Crown's plinth reading differently
  before and after it's worn; the Hall of Heroes listing every profile with
  its derived titles; the Study's three-beat reveal ("Heroes leave. Teachers
  multiply."); the **inverted final exam** — one choice button per step plus
  "every step is correct", a planted wrong step caught, a clean slate
  accepted, a mis-mark answered by SHOWING the real step rather than
  scolding, the last problem confirmed to be a plain addition fact, and the
  exam proven never to touch `s.mastery` (the kid is the grader, not the
  graded); the coronation setting `endingDone` + the title; "The Kingdom,
  Untangled" (beats skippable, the spiral question asked, a WRONG answer
  drawing `8 + 13 = 21` and then proceeding, the scene handing the world
  back); the epilogue pools (Sylvia's telescope, Percy's sequel door,
  Callie teaching, Maren's apprentices, Barnaby's finished ballad, Miscount
  teaching, Pip's riddle contest); the post-credits monster in a tiny hat;
  replay-from-throne; and Golden Numeria (the kingdom resets, the hero keeps
  everything, and the report card never re-locks).

- `drive-twokids-a.js` — Wave 8a (mechanical half of "The Two Kids Update"):
  monster topic telegraphs (a bound monster's icon rendered live, screenshot;
  ≥9/10 of its problems match its topic; the icon AND the problem selection
  both fall back the instant a parent switches the topic off; a single-topic
  mainland dungeon telegraphs the same topic on every monster; the Clockwork
  Spire roster proven free of `mon.skill` bindings); the Overwhelm rule
  (not overwhelming at level 1, overwhelming at level 20 in dungeon 1, the
  one-problem modal opening instead of the battle overlay, a correct answer
  as an instant win with no fight, and the same overleveled kid still
  getting a real battle against the dungeon's boss); "almost!" (the bag
  button's sparkle and the one-per-session log nudge, confirmed NOT to
  repeat on further refreshes); growth tracking's live UI (the report
  card's real-numbers growth line, the parent panel's expandable recent-
  misses list); and the delight-catalog leftovers (the bestiary's hat
  counter, the shopkeeper's shelf persisting a just-sold item, and the
  innkeeper's cat — greets before the warm-up, pats for +1 stamina, once
  per real day).

- `drive-twokids-b.js` — Wave 8b (the heart of "The Two Kids Update"): **the
  Ceremony** (asked before the first monster; "boldly, or gently?"; the answer
  sets the stance AND hands over a matching starter proven identical in power;
  the sealing line says it can be changed); **a full Soothe battle** (the monster
  bar rendered as a teal CALM meter that FILLS rather than health draining, the
  sticky stance row, the calm rising with each correct answer, the befriended
  axis filling in, the "A friend!" ceremony); **the world befriending changes**
  (a befriended wanderer stands down and standing beside one does not start a
  fight, a monster you haven't befriended still hunts you, a befriended GUARD
  still guards and a befriended THIEF still steals, a boss is never pacified, and
  bumping a friend deliberately still starts a fight — the choice stays yours);
  **the bestiary's second axis** (its own count, its own card frame, 🕊 beside ⚔);
  **stance persistence** across save/load; **the shop organizing but never
  filtering** (the kid's rack first, the other one still fully listed and fully
  buyable in BOTH stances — asserted both ways round — and the shopkeeper greets
  the stance); **⚡ Brave verified numerically** (4000 sampled strikes: ×1.999
  damage; the lifetime counter counting exactly the brave problems solved and
  never inflating on non-brave ones; the boss floor holding at ≥3 answers with
  crit + best gear; **a brave miss costing exactly a normal miss** — same streak,
  same HP, no extra penalty; and brave swapping the quick problem for a
  full-depth one); and **Miscount's Academy** (offered only once he is a teacher,
  the slate flow, one choice per step plus a live "every step is correct", a
  **deliberately mis-marked slate** proven never to render "undefined" and to
  show which step it really was *and why* without scolding — the shipped Wave-7
  bug, driven live — the day's homework closing with "come back tomorrow", the
  daily rollover, and the parent cap).

Testing conventions: the current battle problem is exposed as
`MM.battle.current` so drives can compute correct answers; engine state is
reachable via `MM.engine.state` in `page.evaluate`. Wave 7 adds
`MM.ui.cinematic()` (true while the ending cutscene owns the canvas, the same
convention as `MM.ui.sailing()`), and the exam's structure is readable off
`MM.ui.current` (`.steps`, `.badStep`, `.answer`). The unit suite also
enforces: the door audit + glyph registry, the renderability audit (every
glyph draws visibly), the never-stranded audit (every island has supplies,
a dock, and rest), and the sail-destination registry.

- `drive-mimic.js` — playtest round 4: **mimic chests** (25 checks — the
  dungeon-1-to-3 trust window, the one-per-floor cap, protected story/gem
  chests never roll, the pet's not-wagging warning, the grin reveal into a
  completely normal battle, flee-and-rebump re-reveals the same mimic,
  victory opens the chest for good plus a "for your nerve" treasure,
  soothing befriends the Mimic and opens the chest all the same, the
  "Wandering Chests" book page and the (now 80-kind, post-Wave-9) count, and
  Calm Mode's static grin standing in for the breathing bob).

- `drive-touch.js` — Pass D ergonomics (15 checks): tap/click-to-move
  (plain-floor BFS + synthesized tryMove steps; a real coordinate click
  through the camera; NPC and monster taps end in a bump that opens the
  dialog/battle; taps ignored under modals), spell number keys 1/2/3,
  and the parent-panel all-sound-off toggle (persists, round-trips,
  every sound call a safe no-op while muted).

- `drive-tending.js` — Wave 9 ("The Tending", post-game practice, 39 checks):
  **Daily Tangles** (auto-generated 1-3 a day on entering the world post-
  ending, every one on a walkable tile, a stale date regenerating the set, a
  full battle, the days-tended counter incrementing once — and staying put
  for a SECOND tangle the same real day — the 10-day milestone firing exactly
  once, and the notice board self-narrating); **the Spiral Stair** (sealed
  before the ending, the entrance menu, climbing floor by floor, a real
  battle against the roster INSIDE the tower, floor 5's landing verified to
  carry a chest and its own tougher tangle boss, that boss's dedicated
  victory branch marking it defeated-forever, the highest-floor and
  highest-landing counters, Beacon returning to the tower's own floor 1,
  leaving the tower entirely, and returning to exactly the saved landing);
  **cosmetic gold sinks** (an unbought garden/rug/library reading as empty,
  buying one confirmed both by its dialog AND by `tileSprite()` now returning
  the bought sprite, the pet's wardrobe buying-and-immediately-wearing a hat,
  and a boss statue commissioned from a boss the profile ACTUALLY beat — the
  Spiral's own landing guardian, a nice cross-system check); and **the Hall
  of Heroes plaque** showing all three new counters together. `drive-castle.js`
  gained two lines of its own in the post-ending epilogue section (the Spiral
  open, Daily Tangles already populated) since `drive-marathon.js` never
  reaches `endingDone` and so can never exercise this wave on its own.

- `drive-stances2.js` — playtest round 5 (19 checks): brave facts problems
  are always chains/missing-number (never "3+5"), the ⚡ button explains
  itself on first touch (persisted once-ever) with short confirms after,
  the brave latch (a problem picked before ⚡ pays normal damage), a
  soothed monster STAYS becalmed exactly where it was calmed (full
  health, 🤍 not ⚔ in the book, bumping it swaps places instead of
  fighting), the friend ceremony fires once EVER, the soothe chime and
  per-instrument motes (the Bubble Pipe blows bubbles), and the
  one-track design (no Strike/Soothe battle buttons; Help describes your
  way; the ⚙️ dialog switches it in one click with every friend kept).

- `drive-notices.js` — Wave 10 ("The World Notices", reaction-only content,
  37 checks): **the Turning Stones** (screenshots at 0/6/13 tasks done —
  looked at all three; alignment count tracks `s.tasksDone.length` exactly,
  fills center-outward by walk index (spiral geometry rework in v1.7.0 —
  see `drive-wonder.js` below), and every stone tile is still plain `.`
  grass underneath — no new grid glyph); **the reactive cast** (a sample across
  Callie, Percy, Sylvia, Barnaby, Finn, and Miscount's own UI-driving
  greeting, each toggled flag-off/flag-on to prove the new line is absent
  before and present after — the full ~25-line sweep across all seven
  characters and six flags is unit-tested in `tests/test.js`); **the mended
  fence** (broken before task 6, mended after, both readable straight off
  `tileSprite()`, the first mended bump's two-line thank-you dialog, the
  second bump's plain log line, and `seenFenceThanks` persisted); and **the
  rare-surprise pool** (`E.GOLDEN_BIRD_CHANCE` / `E.CAT_BEETLE_CHANCE` /
  `E.HATTED_SLIMES_CHANCE` each pinned to 1 to force the moment, each
  verified to fire exactly once and never again with the chance still
  pinned — the golden bird's feather treasure, the inn cat's beetle log
  line, and the hatted-slimes pair's screenshot, +2 gold, and log line on
  the bump that splits them apart without a fight).

- `drive-descent.js` — Wave 11 ("The Grand Descent", visual-only — zero
  gameplay changes): walks a maxed-out hero straight into every mainland
  dungeon (d1-10), the mainland-adjacent expansion d13, and one isle
  dungeon (d14, Tidepool Grotto), screenshotting all 12 (into
  `tests/shots-descent/`, actually opened and looked at, per the wave's own
  "screenshots ARE the review" instruction — not just asserted on). Live
  checks per dungeon: the wall tier actually rendered matches the expected
  tier bucket (`wall` d1-3/isles, `wallWorked` d4-7, `wallGrand` d8-13), at
  least one live floor tile carries that dungeon's decor motif, the boss's
  spawn tile carries a non-zero vignette alpha that doesn't leak past its
  3-tile radius, and the derived theme palette is non-empty; plus one
  cross-dungeon check that d1/d5/d9's wall-sprite-name + palette combo are
  all pairwise distinct (the tier + tint together, not just one or the
  other). The corresponding unit checks — palette derivation is total over
  every `MM.data.THEMES` entry (all 22, one per dungeon, no gaps), decor
  never lands on a POI cell (an exhaustive scan of every glyph of every
  floor of every mainland dungeon, not just a 50-sample spot-check), and
  the boss vignette is provably nonzero at the boss tile and zero far away
  — live in `tests/test.js` under its own "Wave 11: the Grand Descent"
  block.

- `drive-wonder.js` — v1.7.0 ("story & wonder" pass, 26 checks): the
  **Turning Stones spiral rework** (screenshots at 0/6/13 tasks done, looked
  at — 5 corner turns + 8 straight runs, all 13 positions unique and
  path-adjacent); the **sequence walk** (13 real `tryMove` steps chime in
  order, the once-ever flourish fires and logs its own line, an
  out-of-order step is silent, the newest-segment glint arms only once the
  kid actually crosses the plaza); the **Spiral Stair** (the exact sealed
  bump line pre-ending, the climb menu post-ending); **Tales of the
  Guessing Years** (a post-ending Academy visit shows one, pinned via
  `E.GUESS_TALE_CHANCE`; never shown pre-ending even pinned to 1) and a
  **golem battle cry** (`MM.battle.GOLEM_CRY_CHANCE` pinned to 1); a
  **boss wrong-math attack** (`E.WRONG_ATTACK_CHANCE` pinned to 1,
  screenshot looked at) and its **correction beat** on the kid's next
  correct strike; an **inn cat moment** plus the door-escort line
  (`E.CAT_ESCORT_CHANCE` pinned to 1); and the **dual-form ⚡ toggle**
  exercised on a boss's "…and then" tail (toggling ON attaches the tail to
  the SAME problem, toggling OFF truncates back to the exact original
  text) — the combat-form half of the same mechanism is exercised end to
  end in `drive-stances2.js`'s latch section (rewritten for v1.7.0: an
  eligible problem's mid-round ⚡ swap now pays double damage for the form
  actually answered, verified via the `braveSolved` counter rather than
  raw damage magnitude, which a low roll could false-negative).

- `drive-wing.js` — Wave 12 ("The Proving Rooms", 53 checks): the
  **Workshop Wing's endingDone gate** (the brass name-plate "Not yet"
  modal pre-ending, the same bump entering post-ending), **all six proving
  rooms completed end-to-end** — Grumbold's cracked floors (crumble behind
  you, fall to the cellar, ladder home), **Wren's Numberlings with TWO
  distinct true fillings accepted** (4×6 then a rewound 3×8 — multiple
  solutions are load-bearing) plus the **9-adjacent-7 regression** (the
  lean is cosmetic; the push always succeeds), the Armory's mirror-routed
  lamp beam (screenshot LOOKED at: segments visibly connect lamp → three
  mirrors → crystal), Petronella's cats, Bartleby's pantry (slab holds the
  plate, gate walkable, cheese), and Milla's plate room
  (**open-while-occupied / close-on-leave / slab-holds**, plus a
  slick-rock ride) — then the **wardrobe's inverted mimic tell** (far
  frames 5px apart, near frame dead still, screenshots), its three-bump
  confession and relocation to the Study (tiny hat verified in a cropped
  screenshot), the portrait bump-modals (Ondine wrong about zero, Hesper
  shushing her), the hall's-end doorway bearing the kid's name, the
  **Keeper of the Proving Rooms** title, a full save/load round-trip, and
  a **forced-chunk Spiral Stair leg** (the chunk rotation is deterministic
  by floor, so entering the floor IS pinning the roll): floor 8's teleport
  pads, floor 9's slide, floor 11's lever-gated chest with per-floor
  `s.opened` keys, and floor 15's gear-plate landing (one pull opens the
  ••-door on THAT floor only, rotating vault chest solved).

Operational note (2026-07-11): do NOT run drives while Dropbox is
indexing a big file operation (e.g. right after refreshing the play
copy) — the I/O contention can starve headless Chrome past even 90s
timeouts. Every "mystery" drive failure to date has occurred under
sync load and passed under quiet conditions.
- drive-report.js — report-card completeness (2026-07-17): the three sea-taught topics (clocks/geometry/music) appear on the card and badge shelf once attempted, labeled by where they're taught; Practice Yard clean-run stars get their own section, capped at ★★★.
- drive-wedge.js — wedged-slab rescue (v1.8.2): 3 futile pushes raise the one-time lever-naming modal; the plate room's own reset lever shuffles the slab home; the toot is flavor only (slab still moves, 💨 glyph pops).
