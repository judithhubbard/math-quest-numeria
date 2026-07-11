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
tougher).

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

Testing conventions: the current battle problem is exposed as
`MM.battle.current` so drives can compute correct answers; engine state is
reachable via `MM.engine.state` in `page.evaluate`. Wave 7 adds
`MM.ui.cinematic()` (true while the ending cutscene owns the canvas, the same
convention as `MM.ui.sailing()`), and the exam's structure is readable off
`MM.ui.current` (`.steps`, `.badStep`, `.answer`). The unit suite also
enforces: the door audit + glyph registry, the renderability audit (every
glyph draws visibly), the never-stranded audit (every island has supplies,
a dock, and rest), and the sail-destination registry.
