# MathMaker Level 2 — "The Uncharted Isles" (design spec)

Everything in the current game (tasks 1–13) is the hero's **training**. Level 2 is
the **journeyman's journey**: a second landmass where the design pillar shifts from
*guided ladder* to *exploration* — secret passages, terrain that matters, monsters
with jobs, multi-floor dungeons, and open task order. Inspired by the parts of the
original TaskMaker that v1/v2 deliberately left out.

## Design pillars (unchanged from Level 1)

1. **No timers, ever.** Careful thinking always wins.
2. **Math is the power system**, never a tax: quick problems in battle, full-depth
   at gates.
3. **Gentle failure.** Nothing in L2 is harsher than losing half your gold.
4. **No new resource systems.** No mana, no ammo, no crafting. Stamina and gold
   carry over as-is.
5. Novelty budget is spent on **the world**, not on combat rules.

## Tone & humor guide

The base game got a humor pass (item quips, monster flavor pools, running gags,
rare events); all Level 2 content is written funny **from the start**, under
these rules:

1. **Never joke at the kid's expense.** Jokes land on monsters, items, and the
   world. A miss is funny because of what the *monster* does with the moment
   ("The Skeleton uses the moment to reattach its arm"), never because the kid
   failed.
2. **Keep the math text clean.** Silliness lives in a word problem's *scenario*
   (sock-hoarding dragons, troll soup); the question sentence and the worked
   solution stay plain and unambiguous.
3. **Keep the sincere beats sincere.** Bosses get no flavor lines; the Murk's
   resolution, like Miscount's, is played straight. Comedy everywhere else
   makes those moments land harder.
4. **Variety pools, not repeated jokes** — and save the best gags for **rare
   events** (the 2% tiny-hat monster) so kids discover and share them.

L2-specific humor channels: thief taunts, pet antics, Port Brightwater NPC
running gags (a counterpart to Finn's boots), mystery-potion duds, golem/Murk
understatement, and quips on all Brass Compass stock.

---

## 1. Unlock & story arc

- **Unlock:** completing task 13 (the true ending). The morning after the Star
  rises, a ship — *The Compass Rose* — docks at a new pier tile on the west coast
  of the existing overworld. The captain carries a letter from **Keeper Callie**
  of the Uncharted Isles: the three lighthouse lenses went dark during the years
  of confusion, ships are lost, and a fog called **the Murk** has grown thick in
  the dark.
- **The Murk is not a villain.** It's a fog that grew where light stopped
  reaching — "not wicked, just deep and dark." Relight the lenses and it shrinks.
  This keeps the tone of the Miscount arc: problems get worked out, not defeated.
- **Miscount's gift:** before you sail, Miscount gives you a speckled **egg** —
  "I found it while I was... confused. It never hatched for me. Maybe it was
  waiting for someone who shows their work." It hatches on the voyage (§6).
- **Quest structure (open order):** Callie's request is a single open goal —
  *relight the three lighthouse lenses* — held in the three lens dungeons, which
  can be done **in any order**. When all three shine, the sealed **Great
  Lighthouse** opens for the finale. A fourth, secret dungeon is never assigned
  at all; it is found only by exploring (§4.4).
- **Travel:** the ship at either pier moves you between continents any time.
  Save/profile, gear, gold, charms, badges, and mastery data all carry over.

## 2. The Isles overworld

A new hand-authored map, similar footprint to the current overworld (`~52×24`),
new palette (sand, shallows, cliffs, palms). Contents:

- **Port Brightwater** (town): Keeper Callie's house (quest giver / turn-ins),
  **The Brass Compass** shop (§8), an inn (same 3-warm-up mechanic), a
  **notice board** (bounties, §9), and 3–4 townsfolk with dialog that contains
  *real navigational hints* ("the old smuggler walled up his cave — but gulls
  still fly out of the cliff on the north beach...").
- **Three lens dungeon entrances**, visible but unnumbered — identified by look
  (a tidal cave mouth, a blue ice crevasse, a smoking mine head).
- **The Great Lighthouse**, sealed until all lenses shine.
- **One secret dungeon entrance** hidden behind a secret wall on the overworld
  itself (the pet can find it, §6).
- Murk fog tiles blanket the corners of the map and visibly recede as each lens
  is lit — the world itself is the progress bar.

## 3. New engine mechanics

### 3.1 Monster behaviors (`behavior` field on spawn)

| Behavior | Rule (one sentence each) | Used for |
|---|---|---|
| `chase` | Current behavior: pursue within 7 tiles. | Default |
| `guard` | Never moves; fights only when bumped. Parked on doorways, chests, keys. | Making treasure feel guarded |
| `wander` | Random-walks; only attacks if the player is adjacent. | Ambience, dungeon "wildlife" |
| `thief` | When adjacent, steals 3–6 gold and then **flees** from the player; catching it wins the battle stakes back **with interest** (+50%). | The chase inversion — kids hunt it |

Implementation: a `switch` in `E.monsterTurn` on `m.behavior`; thieves path *away*
using the existing greedy step with inverted sign.

### 3.2 Terrain tiles

| Tile | Char | Rule |
|---|---|---|
| Ice | `_` | Entering it slides you in the same direction until you hit a non-ice tile or obstacle (classic slide puzzles; monsters don't enter ice). |
| Spikes | `^` | Crossing costs 2 HP (floor shows it clearly; never lethal — stops at 1 HP). |
| Swamp | `,` | Each step costs 2 stamina instead of ½. |
| Teleport pad | `o` | Paired pads; stepping on one moves you to its twin (same floor). |
| One-way door | `v` (etc.) | Passable only in the marked direction. |
| Secret wall | `%` | Drawn as wall with a subtle crack (1-shade-off pixels); bumping it opens it permanently (same persistence as doors, via `state.opened`). |
| Stairs | `>` / `<` | Move between floors of the same dungeon (§3.3). |
| Locked door | `K` | Needs the matching key item; consumed on use. |
| Lever | `L` | Toggles a named gate elsewhere on the floor ("You hear stone grind somewhere..."). |
| Dig spot | (invisible) | Coordinate treasure target (§5.2); no tile drawn — that's the point. |

### 3.3 Multi-floor dungeons

`MM.maps.ISLE_DUNGEONS[n]` becomes an **array of floor grids**. State gains
`floorIndex`; stairs move between floors; monsters/opened-state are keyed per
floor (`d14f2:x,y`). Sidebar shows a floor badge ("B2"). Exit tile exists only
on floor 1.

### 3.4 Keys & levers

Keys are per-dungeon bag items (brass 🗝, silver 🔑), usually held by a `guard`
monster or behind a puzzle, consumed at the matching locked door. Levers toggle
one named gate each. Rule of thumb per dungeon: **at most 2 keys + 1 lever** —
enough for "the door is here, the key is elsewhere" structure without inventory
homework.

### 3.5 Multi-monster (pack) battles

Some encounters put **2–3 foes on the battle stage at once**. The trick is
keeping the round economics identical to single fights, so packs feel *bigger*
without being *harder rules*:

- **Still one problem per round.** A correct answer strikes the **targeted**
  foe. Target by clicking/tapping a foe or pressing 1–3; the default
  auto-target is the lowest-HP foe, so a kid who never touches targeting is
  never punished.
- **Cleave carry-over:** when a strike kills a foe, leftover damage rolls into
  the next one — packs don't drag, and big weapons + streaks feel great.
- **Only one foe attacks per round**, rotating; whoever's next is telegraphed
  with a "!" marker. Incoming damage per round is the same as a single fight —
  a pack is more HP to chew through, not triple damage taken.
- **Pack members are scaled down** (~60% HP and attack each), so a full pack
  totals ~1.8× a normal fight. Dodge, streaks, crits, fleeing: all unchanged.
- **One strategic wrinkle, one sentence:** a thief in a pack escapes with its
  stolen gold after 3 rounds unless it's downed first — "get the thief first"
  is the entire strategy layer.
- **UI:** three small HP bars; the 720px stage fits 3 foes at sprite scale 5.
- **Where:** ~25% of isle encounters, thief gangs in the Smugglers' Vault, and
  two minion waves before the Murk (the Murk itself fights alone).

This is a deliberate, contained exception to pillar 5 (novelty in the world,
not combat): the *rules* stay one-problem-one-attack per round; only the
staging gets bigger.

### 3.6 Mystery potions

Chest/shop item (12g): "🫙 Mystery Potion — who knows?" Drinking rolls:
50% heal 20 · 20% full stamina · 15% +15 gold · 10% +10% dodge for the next
battle · 5% dud — your hair turns green until the next inn stay (purely
cosmetic palette swap, played for laughs). Gentle gambling, no real downside.

## 4. The dungeons

Shared rules: entry seal asks one full-depth **mixed** problem (same as
expansion dungeons). Battle problems are mixed review across all enabled topics,
weakest-first, **plus** the new L2 topics (§5.3); each dungeon *emphasizes* one
new strand (~50% of its gate problems) so dungeons keep the topical identity
Level 1 had.

### 4.1 Tidepool Grotto (2 floors — sea cave)
- **Exploration gimmick:** teleport-pad networks between tide pools; thief crabs.
- **Monsters:** Scuttle Crab (guard), Drift Jelly (wander), Pilfer Gull (thief),
  boss **The Old Current** (a great eel).
- **Math emphasis: coordinates & geometry** (§5.2) — this is where treasure-map
  digging is introduced (Callie hands you the first fragment and explains axes).

### 4.2 Frostbite Hollow (2 floors — ice crevasse) ✅ SHIPPED (2026-07-08)
- **Gimmick:** ice-slide puzzle rooms (reach the key/lever by planning slides);
  guards parked at slide exits. Floor 1 = the frozen lake crossing; floor 2 =
  the floe puzzle (stop-islands, a gate lever, a pad-locked cache).
- **Monsters:** Snow Sprite (wander), Icebound Sentinel (guard), Frost Pup
  (chase), boss **The Glacier's Heart**.
- **Math emphasis: PLAIN MIXED REVIEW for now** — per the user's decision
  (2026-07-08), no new math strands yet; the order-of-operations emphasis
  below is DEFERRED until wanted. Entry gates on the Tide Lens (not charts);
  its lens clears the v-fog at the lighthouse neck.
- ~~Math emphasis: order of operations~~ — deferred.

### 4.3 Cinderforge Depths (3 floors — volcanic mine) ✅ SHIPPED (2026-07-10)
- **Gimmick:** cinder-shard routing, two keys (stairs shaft + stairs cage),
  a lever-gated chute room, and **one-way drop chutes** (fall to the same
  spot one floor down; no return). Torch-radius darkness was cut (scope).
- **Monsters:** Magma Rat (chase), Forge Golem (guard), Soot Wisp (wander),
  Coal Thief (thief), boss **The Foreman**.
- **Math: plain mixed review** (multi-step emphasis deferred with the other
  new-math strands, per the user's 2026-07-08 decision). Entry gates on the
  Frost Lens; its Cinder Lens clears the final w-fog at the lighthouse.
- Also shipped alongside: the **voyage scene** (UI.sailScene) for all boat
  travel. The continuation plan now lives in **EXPANSION_PLAN.md** (Wave 1 =
  this spec's Phase D).

### 4.4 The Smugglers' Vault (secret — 1 dense floor)
- Never assigned; entrance is a `%` wall on an overworld beach, findable by pet
  sniffing or by an NPC hint. Inside: thief gauntlet, the game's best treasure
  density, one unique charm (**🗺 Wayfinder's Locket** — dig spots shimmer
  faintly when you're within 2 tiles), and bestiary-only monsters.
- **Math:** pure mixed review — the reward here is loot, not curriculum.

### 4.5 The Great Lighthouse (finale — 4 floors, sealed until 3 lenses shine)
- **Gimmick:** every mechanic reprised, one floor each (slides, teleports,
  keys); the top floor is the Murk fight.
- **Boss: The Murk** — two phases: at 50% HP it "thickens" (+2 atk,
  telegraphed: "The fog presses closer..."). On defeat it doesn't die — it
  *thins into ordinary morning mist* as the lamp is lit.
- **Math emphasis:** everything, including spot-the-error at gates.
- **Ending:** the lamp sweeps the sea, the Murk recedes map-wide, harbor
  festival scene, title **"Keeper of the Light"**, and Callie's line sets up
  future content: "The sea is *full* of islands, you know."

### Monster stats

Reuse `MM.data.monsterStats(i)` with effective indices — Tidepool `i=14`,
Frostbite `15`, Cinderforge `16`, Vault `16`, Lighthouse `17`. With Tier-6 gear
(block ≈ 16–18, weapon 13) that lands regular fights at ~3 correct answers and
net incoming ~2–7 per round — same feel as late L1, one notch up. Elite
("shiny") spawns: 5% chance, sparkle overlay, +40% HP, double gold, guaranteed
treasure drop.

## 5. Math content

### 5.1 New problem formats (applied to existing topics — recorded under them)

| Format | Example | Where |
|---|---|---|
| **Multi-step gates** | "Planks cost 7g each. You buy 6 and pay with a 50g coin. How much change?" — two operations, solution shows both steps | Doors/chests in all L2 dungeons; Cinderforge emphasis |
| **Spot-the-error** | "Miscount's old page says 3/4 + 1/8 = 4/12. What should it be?" — kid types the correct answer; solution names the error ("he added the denominators") | L2 gates (~20%), Lighthouse emphasis; 2 curated error patterns per topic |
| **Reverse coordinates** | Grid image with a ⭐: "What are the star's coordinates?" → type `7,3` (parser gains a pair form) | Tidepool gates, map fragments |

### 5.2 Treasure-map digging (the coordinate mini-game)

Chests and bounties award **map fragments**: "⭐ dig at (7, 3) — count from the
mooring post." Opening the fragment overlays the current floor with labeled x/y
axes and the origin marked. The kid **walks to the tile** — reading the axes is
the exercise — and presses the **Dig** button (appears in the sidebar while a
fragment is active). Right spot: dig animation + loot (gold/treasure/charm-rare).
Wrong spot: gentle correction — "You're standing at (5, 2). The map says (7, 3) —
2 more east, 1 more north." Unlimited tries, every miss teaches the notation.

### 5.3 New topics (full generators + quick variants, 3 tiers each)

| Skill id | Content | Default | Rationale |
|---|---|---|---|
| `geometry` | Coordinate plane, perimeter, area, volume of boxes ("a crate is 3×4×5 — how many unit cubes?") | **ON** | 5th grade (5.G, 5.MD) — grade-level, not stretch |
| `order_ops` | Expressions with parentheses: `3 + 4 × 2`, `(3+4) × 2`, tier 3 mixes three ops | **ON** | 5th grade (5.OA.1) |
| `percents_ratios` | `10% of 40`, "half off 24g", "2 gold per 3 apples — 12 apples?" | **OFF** | 6th-grade stretch; parents opt in |

All three appear in the Parent Settings checklist under a new **"Isles topics"**
group (the checklist currently derives from `TASKS`; introduce a proper skill
registry so L2 skills list without fake tasks). They join the mixed-review pools
(battles, gates, golems) **only after L2 unlocks**, so L1 players never see them.

### 5.4 Selection weights in L2

Battles: 40% dungeon's emphasis strand · 60% mixed weakest-first across all
enabled topics (quick variants). Gates: 50% emphasis · 30% weakest-first
full-depth · 20% spot-the-error. Same `weakestFirst` machinery throughout.

## 6. The pet

- **Hatching:** Miscount's egg hatches on the first voyage. The kid picks one of
  three eggs sight-unseen (blue/green/rose) → species is a surprise: **Compass
  Pup** 🐕 / **Sprout Cat** 🌱 / **Ember Newt** 🔥 (three new small sprites,
  2 frames each). The kid **names it** (text input, like profiles).
- **Follows the hero** one tile behind on any overworld/dungeon (both
  continents). Never fights, never takes damage. Cheers (jump + ♪) on every
  correct battle answer.
- **The job — secret sense:** within 2 tiles of a secret wall, dig spot, or the
  hidden dungeon entrance, the pet shows a **"!"** bubble and a soft sound. This
  is the hint system that keeps exploration solvable for an 8-year-old, in
  companion's clothing.
- **Growth (stages):** Hatchling → **Companion** (40 correct answers since
  hatching + fed 5 times) → **Champion** (150 correct + fed 15; sense radius
  becomes 3). Feeding uses existing food or shop **pet treats** (8g) — a gold
  sink that touches nothing else. Sprite grows each stage; no stats anywhere.
- **Bag panel:** portrait, name, stage, answers-until-next-stage bar, Feed button.

## 7. Spells (badge rewards — utility only, never damage)

Requires the **topic badge** system: per topic, 🥉 bronze = 10 correct ·
🥈 silver = 25 correct with recent ≥ 75% · 🥇 gold = 50 correct with recent ≥ 90%
(recent = existing 10-answer window). Badges display on the report card and a
shelf in the bag.

| Spell | Unlock | Effect | Cost |
|---|---|---|---|
| 🔍 **Scout** | gold badges in 3 topics | Secret walls & dig spots on the current floor shimmer for 10 s | once per dungeon visit |
| ⚡ **Blink** | gold in 6 | Hop over one adjacent hazard/gap tile | 10 stamina |
| 🕯 **Beacon** | gold in all *enabled* topics (min 6) | Return to the dungeon entrance instantly | once per visit |

No mana. Spells reward mastery with *exploration* power — they can never answer
a problem or skip a fight.

## 8. Economy — The Brass Compass (isle shop)

One tier above everything in L1, priced for a rich post-game wallet:

| Slot | Item | Stat | Price |
|---|---|---|---|
| Weapon | 🔱 Tidal Blade | atk 13 | 700 |
| Body | 🦪 Pearl Mail | def 9 | 650 |
| Helmet | 🪸 Coral Crown | def 4 | 320 |
| Boots | 🌊 Wavewalkers | def 3, +8% dodge | 380 |
| Ring | 💍 Ring of the Compass | pet's secret-sense radius +1 | 300 |
| Ring | 💍 Ring of Sea Luck | mystery potions are never duds; treasures sell +20% | 260 |
| — | 🫙 Mystery Potion | §3.6 | 12 |
| — | 🦴 Pet Treat | feeds the pet (+bond) | 8 |

Same money-quiz mechanic as the L1 shop. Additional sink: the **Lighthouse
Fund** — donate in installments toward rebuilding the harbor statue; three
visible construction stages on the map, finishing grants a cosmetic hero cape
color.

## 9. Notice board (bounties)

Ships with L2 (and retrofits to L1 trivially): 2–3 rotating jobs — "Defeat 4
monsters in Frostbite Hollow", "Dig up the parcel at (4, 6) on the beach",
"Catch a thief". New set each real day or when cleared. Target dungeons/topics
chosen by `weakestFirst`, so the board quietly steers practice. Rewards: gold +
occasionally a map fragment or mystery potion.

## 10. Save format & migration

`state.version = 5`. New subtree, absent until unlock:

```js
isles: {
  unlocked: true,
  lenses: { tidepool: false, frostbite: false, cinderforge: false },
  pet: { species, name, stage, fed, correctSinceHatch },
  keys: {},            // per-dungeon key items
  fragments: [],       // active map fragments {mapId, floor, x, y, loot}
  dug: {},             // spent dig spots
  spellsUsed: {},      // per-visit spell locks
  fund: 0,             // lighthouse fund progress
}
```

Badges derive from existing `mastery` counts — no migration needed. Multi-floor
`opened`/monster keys use the `d14f2:` prefix scheme. Loading a v4 save just
gains the missing defaults (same pattern as current migrations).

## 11. UI additions

Floor badge in sidebar · contextual **Dig** button · fragment overlay with
labeled axes · pet panel in bag · badge shelf in bag + badges on report card ·
spellbook row in sidebar (appears at first unlock) · lens progress lamps (☀☀☀)
in sidebar while on the Isles · Murk fog tiles on the isle overworld ·
per-foe HP bars + target cursor + "next attacker" marker in pack battles.

## 12. Build order (each phase is shippable)

1. **Phase A — the exploration engine** ✅ SHIPPED (2026-07-08): behavior
   flags (guard/wander/chase/thief), terrain tiles (pools, urchins, slick-rock
   slides, teleport pads, secret walls), multi-floor dungeons, keys + locked
   doors, lever + gates — proven with the two-floor Tidepool Grotto and the
   pier on the west coast (captain of the Compass Rose; unlocks after task
   13; boss lights the Tide Lens into `state.isles.lenses`). Deferred to
   Phase C: one-way doors (no map uses them yet), dungeon emphasis weights
   (Tidepool serves plain mixed review until the geometry generator exists).
   Verified by `tests/drive-isles.js` (21 checks).
2. **Phase B — the world** ✅ SHIPPED (2026-07-08): isle overworld with
   Murk fog that recedes per lens (u/v/w tiles), Port Brightwater (Keeper
   Callie, Old Salt Percy, inn, Brass Compass with isle-tier stock + mystery
   potions + treats), continent travel (`state.continent`, sail both ways,
   save/load resume), and the pet — Miscount's three-egg gift, voyage
   hatching + naming, follow-one-behind, ❗ secret-sense (radius 2, +1 for
   Compass ring / Champion stage), stage growth from correct answers +
   feeding, bag panel, battle cheer. Deviations from this spec: pets feed on
   🦴 treats only (not general food — keeps the bag simple); Frostbite/
   Cinderforge entrances are visible teaser dialogs pending Phase C; the
   Great Lighthouse is visible but unreachable behind v/w fog.
3. **Phase C — the math:** three new generators + quick variants, parent-panel
   group, multi-step & spot-the-error formats, dig mini-game, Frostbite +
   Cinderforge. Pack battles (§3.5) land here too — Frostbite is the first
   dungeon that uses them.
4. **Phase D — the finish:** Smugglers' Vault (thief-gang packs), Great
   Lighthouse + Murk, spells, notice board, lighthouse fund, ending scene.

Testing: extend `tests/` with drive scripts for slides (enter ice → position),
thief flee/catch, multi-floor stair transitions, dig coordinate parsing, and
badge thresholds.

## 13. Explicit non-goals

No timers · no mana/ammo/crafting · no fail state harsher than L1's gold loss ·
no karma/attacking townsfolk/jail (TaskMaker features that don't fit the
audience) · no betrayal twist (Miscount's arc stays resolved) · no framework or
build step (still double-click `index.html`) · no online features.
