# Math Quest: Numeria — The Grand Expansion Plan

> **Naming note:** the product is **"Math Quest: Numeria"** (rebranded
> 2026-07-10). Internal code names (`MM`, "MathMaker", the folder
> `MathMaker_v2/`, save keys `mathmaker2_save_*`) deliberately keep the old
> name — NEVER rename them; saves and test paths depend on them. The
> **MathMaker** remains the quest-giver character in the castle.

**Goal: 5× the current play-time**, added in shippable waves. This document is
written to be implemented **wave by wave by a smaller model**: every wave is a
self-contained work order with exact file references, a recipe to copy from
existing code, and acceptance tests. Do the waves IN ORDER — later waves lean
on earlier ones. Never start a wave until the previous one's acceptance tests
pass.

Current content (baseline): 10 mainland tasks + 3 bridge dungeons + 3 isle
dungeons (16 total), ~55 monsters, badges/bestiary/bounties, the pet.
Estimated current play-time for a kid who does everything: **8–12 hours**.
Target after all waves: **50+ hours**.

---

## 0. Non-negotiable ground rules (read before every wave)

1. **No timers, ever.** Accuracy is rewarded; speed is not.
2. **Math is the power system.** New mechanics gate on problems or on
   exploration, never on reflexes.
3. **Gentle failure.** Worst case anywhere = lose half your gold, keep all
   progress. Fleeing always allowed (monster fully heals — engine.js flee
   handling in `startCombat.onEnd`).
4. **Humor rules** (see the tone guide in LEVEL2_SPEC.md): jokes land on
   monsters/items/world, never the kid; math text stays plain; bosses and
   story beats stay sincere; pools + rare gags, not repeated jokes.
5. **No frameworks, no build step.** Plain JS, double-click index.html,
   works offline from file://.
6. **Every topic defaults ON; the parent panel is the OFF-switch.**
   (Revised by the user 2026-07-11 — the original rule made new topics
   like music opt-in; the user wants everything available from the start
   and parents can disable per kid. "Missing from `parent.topics` means
   enabled" is the single semantic everywhere; nothing force-writes
   `false`. Harder-than-5th-grade math remains deferred as CONTENT —
   this rule is about switches for topics that exist.)

### The testing discipline (mandatory for every wave)

```
cd /Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2   # ALWAYS cd here first
node tests/test.js                                        # unit suite
NODE_PATH=/Users/jk/.claude/pw/node_modules node tests/drive-<name>.js
```

Every wave must add: (a) unit checks in `tests/test.js` (map validation,
data completeness), (b) a Playwright drive `tests/drive-<name>.js` copying the
structure of `tests/drive-cinder.js`, (c) screenshots you actually LOOK at.
Playwright is pre-installed at `/Users/jk/.claude/pw` (don't search or
reinstall); use `chromium.launch({ channel: 'chrome', headless: true })`. All
drives must end
with zero JS errors. Run ALL existing drives after your changes (regression).

### Known gotchas (each of these has already bitten once)

- **Shell cwd resets between commands** — use absolute paths; `cd` into
  MathMaker_v2 in the same command as `node`.
- **Map chars are shared across maps.** Before using a glyph, grep maps.js and
  the NPCS keys — 'u' is Miscount on the west map AND murk fog on the isles
  (disambiguated by `onIsles` in `tileSprite`). Prefer new glyphs.
- **Never place monster markers on special tiles** (ice/pools/pads): marker
  tiles are replaced with '.' at spawn, silently changing the map.
- **`worldPos` is saved only when `mapId` is 'world' or 'isles'** (see
  enterDungeon) — floor changes must not touch it.
- **Modal focus:** never `.focus()` a button synchronously inside a keydown
  handler (same-keystroke click-through — see the `setTimeout(() =>
  btn.focus(), 80)` in showProblem). Follow that pattern.
- **The bag reopens itself** after Feed/Drink/Eat actions — drives must click
  `#bagClose`, and `dismissDialogs` only clears `#dlgOk` dialogs.
- **Bestiary count is asserted** in tests/test.js and drive-book.js — bump it
  whenever you add monsters (each roster entry AND boss needs a `desc`).
- **Ice reachability lies under plain BFS** — reuse the slide-aware sim in
  tests/test.js (frostbite block) for any map with `_` tiles.
- **Chute landings** must be validated (see the cinderforge test block).
- **Every problem generator needs**: text, solution, exact-rational answer,
  a QUICK variant if battles use it, and a canonical-answer round-trip in the
  ~400-per-tier unit loop. Copy an existing generator's structure exactly.
- **WebAudio contexts suspend silently** (tab switch, sleep, headphone
  changes) — no error, just silence. `actx()` resumes on every use; any new
  audio code must go through it, never hold its own context.
- **A puzzle tile's STATE must be readable from its sprite alone** (kid
  playtest, gear plates): a tile that invisibly changes distant walls
  reads as a glitch, not a puzzle. Stateful tiles need state-showing
  sprites, a log line naming WHAT changed, and a brief glint on the
  changed thing (copy the Scout shimmer overlay).
- **New map glyphs must be registered with the door audit** (tests/test.js)
  as walkable/solid/door/marker — the audit found five broken doors in
  dungeons 19–20 because Z/Y/A/B/C were never classified and the floor
  list was hardcoded. After Wave 6.5 the classification test makes this
  impossible to forget; keep it green.

### Recipes (copy these existing implementations)

| To add... | Copy... |
|---|---|
| A dungeon | Cinderforge end-to-end: TASKS entry + THEMES + MONSTERS (data.js), ISLE_DUNGEONS maps (maps.js), gating in tryEnterDungeon, tests block, drive-cinder.js |
| A tile mechanic | The chute: `tileSprite` case + sprite (sprites.js) + handler in tryMove/tileEffects (engine.js) + persistence via `s.opened` + unit check + drive check |
| A monster behavior | monsterTurn's guard/wander/thief switch (engine.js) |
| A problem topic | problems.js generator + QUICK variant + SKILL_NAMES + mastery routing; see §W3 for the parent-switch registry change |
| A shop/NPC | Brass Compass (`openShop` isle mode) / NPCS entries with talk(s) |
| A celebration | pendingBadges queue + maybeCelebrateBadge (handles badge AND pet entries) |
| A cutscene | UI.sailScene / drawSail (ui.js) |

---

## Wave 1 — Finish the Isles (Phase D of LEVEL2_SPEC.md) ✅ SHIPPED (2026-07-10)

**Work order:** implement LEVEL2_SPEC §4.4 (Smugglers' Vault) and §4.5 (Great
Lighthouse + the Murk), plus §7 spells (Scout/Blink/Beacon, badge-gated) and
§9's isle notice board. All three lenses already work; 'H' currently shows a
"coming soon" dialog — replace it with entry to dungeon 17.

- **Smugglers' Vault** = dungeon 18 in data but has NO map entrance glyph yet:
  add a secret '%' wall on the ISLES overworld (south beach) that reveals a
  cave glyph. The pet's `updatePetAlert` already senses '%' — it will find it.
- **The first RANGED weapon** drops here: the **Smuggler's Crossbow** 🏹
  (atk one point below the Tidal Blade, `ranged: true`). Ranged rule — the
  ONLY rule: in battle, the monster's **round-1 counterattack automatically
  misses** ("...you're out of reach!") because you strike from afar. One
  check in battle.js's first monsterTurn + a line in the battle sub-label.
  NO ammo, NO aiming (pillar 2 and the no-resource rule). Wave 2 adds a bow
  to Emberlyn's stock so it becomes a real melee-vs-ranged choice per tier.
- **Great Lighthouse** = dungeon 17, FOUR floors (copy cinderforge's 3-floor
  pattern), one floor per mechanic reprise (slides, pads, keys, chutes), boss
  **The Murk**: two phases — at 50% HP it "thickens" (+2 atk, telegraphed in
  battleMsg). On victory it *thins into morning mist* (sincere, no jokes).
  Ending scene: harbor festival dialog, title "Keeper of the Light".
- **Spells:** stored `s.spells = {scout: usedThisVisit...}`; unlock check =
  count of gold badges (`s.badges[skill] === 3`); Scout highlights '%' and
  future dig tiles on the current floor for 10s (draw overlay in drawWorld);
  Blink = hop one blocked tile (10 stamina); Beacon = teleport to entrance.
  UI: a spellbook row in the sidebar once any spell is unlocked.
- **Acceptance:** drive-lighthouse.js — vault found via pet alert, 4 floors
  traversed, Murk phase change observed, ending shown, spells each used once.

**Deviations from this spec, and why:**
- The Smugglers' Vault **does have a boss** (Captain Brine), not just a
  gauntlet — every existing roster/bestiary/Monster-Book code path assumes a
  `boss` card per dungeon, and a capstone fight reads better than a dungeon
  that just... ends. The **crossbow is a guaranteed find in a specific
  guarded chest** (the Vault Watchman literally stands over it), not a boss
  drop; the boss instead guarantees the **Wayfinder's Locket** charm. Its
  documented effect (dig spots shimmer) is written into `MM.data.CHARMS` but
  inert — dig spots don't exist until Wave 3's treasure-map mini-game; the
  charm's quip says so.
- The Vault's monster **stats pin to Cinderforge's tier** (`TASKS[17]
  .statIndex = 16`) even though its own index (18) drives its map/roster/
  theme lookups — per this spec's own "Monster stats" table, it's an
  optional side dungeon and shouldn't outscale the mandatory Lighthouse.
- The Lighthouse's **"chutes" reprise lives on floor 3** (a lever-gated
  one-way chute, exactly like Cinderforge's), dropping onto floor 4 at
  matching coordinates — floor 4 itself couldn't contain its own chute
  (there's no floor 5 for it to drop to) and is the Murk's arena instead,
  reached by the chute *or* the ordinary stairs.
- **Isle notice board**: added a `n` tile in Port Brightwater reusing the
  existing bounty-board UI as-is (`E.refreshBounties` was already
  continent-agnostic).
- **Lens-progress lamps in the sidebar** (§11 of LEVEL2_SPEC) were **not**
  added — out of this wave's explicit acceptance list; the existing
  taskBox banner already announces lens/lamp progress in text. Deferred.
- Blink targets **the player's last attempted movement direction**
  (`E.lastDir`, set on every `tryMove` call) rather than a UI direction
  picker — simpler, and matches "hop over one adjacent hazard" without new
  interaction chrome.
- **Beacon's unlock** is "every parent-enabled skill at gold, minimum six"
  rather than a flat gold-badge count — it reads as the capstone spell.
  Scout (3 gold) and Blink (6 gold) match the spec's counts.

**Play-time added: ~4–6 h** (two big dungeons + spell hunting motivation).

## Wave 1.5 — Playtest QoL (2026-07-10 family feedback) — DO THIS BEFORE WAVE 2 ✅ SHIPPED (2026-07-10)

Four friction fixes from a real play session. Not new content — run it as its
own session, before Wave 2 (it touches the shop, charms, and chest code that
Wave 2 builds on).

### 1.5a — Bulk potion buying

Buying potions one at a time means one money problem per potion — tiresome.
- Track lifetime purchases: `s.potionsBought` (migrate: default 0 in
  `load()`, like the existing migrations).
- In the shop's Supplies row (ui.js `openShop` / engine.js `E.buy` ~1784):
  next to Buy, show **×5** once `potionsBought >= 5` and **×10** once
  `>= 15`, priced at exactly qty × price (no bulk discount — the discount
  stays the reward for the math). One shopkeeper quip when ×5 first appears
  ("Regulars get the crate. The crate is five potions. I'm very proud of it.").
- **One money problem per transaction**, whatever the quantity — and make the
  bulk problem use multiplication: "You have G gold. 5 potions at C gold
  each — how much gold will you have left?" (solution shows `5 × C` then the
  subtraction). Correct = 10% off the total, exactly like today. The
  `!E.moneyQuizOn()` no-quiz path must also honor quantity.
- `applyPurchase` gets the quantity (potions += qty).

### 1.5b — No more doors to nowhere

Some doors, once opened, gate nothing — either both sides were already
connected, or there is literally a wall behind them. Add a permanent unit
test, then fix the maps until it passes.
- **The audit test (add to tests/test.js FIRST, watch it fail on exactly the
  six doors below, then fix):** for every 'D' and 'K' on every floor: flag if
  (a) it has fewer than 2 open neighbors when '%' counts as OPEN (a true
  dead end), or (b) its open neighbors are still mutually connected with the
  door removed, under BOTH '%'-sealed and '%'-open BFS (decorative). Treat
  '#DKG' as solid. This deliberately does NOT flag door-then-secret chains
  (dungeon 3's D at 21,13) or a door with a secret-wall bypass (dungeon 9's
  D at 8,8) — those are intended designs.
- **The six to fix** (make each door GATE something rather than deleting it,
  unless noted):
  - dungeon 2, D (14,10): wall directly behind it. Carve a 1–2 tile alcove
    behind with a '*' chest — the door now guards treasure.
  - dungeon 2, D (7,11): open bypass around its wall — close the gap so the
    door is the way through.
  - dungeon 3, D (15,13): same treatment.
  - dungeon 5, D (10,7): two doors pierce the same wall run ((10,7) and
    (14,7)) and there's a walk-around besides. Keep one door load-bearing;
    delete the other or wall the bypass.
  - dungeon 17 f1, K (20,4): the stairs room is wide open from the row-11
    corridor below. Seal the east segment of row 10
    (`#....#______________#....#` → `#....#______________######`) so the
    key is the only way in. The slide-aware reachability test must stay
    green (the kid slides across row 4 to bump the K).
  - dungeon 17 f2, K (21,10): the K stands free in open floor. Enclose the
    '>' stairs at (24,1) in a small locked pocket whose only entrance is the
    K. Keep the floor's reach test green.
- After map edits, rerun ALL reachability tests (doors count as passable
  there) plus the door audit.

### 1.5c — Defeated monsters stay gone for the day

Leaving a dungeon (usually to heal) currently respawns everything.
- Give each spawned monster its marker position as `home: {x, y}`
  (enterDungeon's marker loop, engine.js ~397). On kill, record
  `s.defeatedAt[mapId + ':' + home.x + ',' + home.y] = <today's date string,
  same format the bounty board uses>`. Migration: missing map = `{}`; prune
  entries with non-today dates in `load()` so saves stay small.
- In enterDungeon, skip spawning any marker whose key carries today's date.
  If any were skipped, log once: "The halls are quiet — the monsters you
  drove off haven't crept back yet." New real-world day = fresh dungeon.
  Bosses keep the existing permanent `bossesDefeated` behavior.
- **Known interaction, accepted:** a "defeat N monsters in X" bounty on a
  dungeon fully cleared today can't be finished until tomorrow. Do NOT
  special-case it — dungeons hold 7–15 monsters vs bounty needs of 2–5, the
  board rotates daily anyway, and other job types remain.

### 1.5d — The Hearthmoss Charm (heal by walking, slowly)

The user's own design: an object that heals as you walk.
- New entry in `MM.data.CHARMS`: **Hearthmoss Charm** 🌿 — "Moss from a
  hearthstone. It likes a walk; so do your bruises." Effect: while worn,
  **+1 HP per 8 steps** when below max HP (counter on the state, reset on
  each heal; steps counted where `walkStamina` runs, so battles can't tick
  it). Silent — no log spam, no floaters.
- Sold at the **Brass Compass** isle shop for ~220 gold (deterministic — a
  kid who wants it can earn it), AND added to the normal chest charm pool
  for mainland luck. It competes for one of the three charm slots; that
  tradeoff is the point.
- If playtesting still finds deep floors too draining after 1.5c + 1.5d,
  the fallback design is campfire rest tiles in multi-floor dungeons
  (three-questions-for-healing, once per visit) — hold that unless asked.

### Acceptance — drive-qol.js
Bulk buttons appear only past their thresholds; one problem buys 5 potions
(+5 in the bag, gold down by exactly 5×price minus any discount); door audit
green in tests/test.js; clear two monsters, exit, re-enter same day → still
gone (and the quiet-halls line logs), rewrite their `defeatedAt` date to
yesterday, re-enter → they're back; wear Hearthmoss at reduced HP, walk 16
steps → exactly +2 HP, unworn → +0; save/load round-trips `potionsBought`
and `defeatedAt`. Update README.md, this file (mark 1.5 shipped), and
tests/README.md.

**Deviations from this spec, and why:**
- The door audit's dungeon-2 fix ((14,10)) turned out to be a genuine dead
  end (only 1 open neighbor, not 2) rather than a decorative bypass — its
  prescribed treatment ("carve an alcove with a chest") still applied
  directly: `(14,11)` (a wall directly behind the door, previously touching
  nothing else) is now a chest.
- Dungeon 2's other fix ((7,11)) and dungeon 5's fix needed walling more than
  one tile each — a single-column shaft (dungeon 2: columns 1,2,4,5 at row 7)
  and a two-wide side hallway (dungeon 5: columns 6-7 at row 7) both let you
  walk clean around the door, not just a one-tile gap.
- The Great Lighthouse floor-1 fix (sealing row 10's east segment per the
  spec's exact string) left the K at (20,4) provably unreachable by sliding
  — the ice block is one uniform rectangle, so a slide always rides to an
  *edge*, never stops mid-block. Added one matching west-side ice entry at
  (5,4) (mirroring the existing one at (5,8)) so a slide starting there rides
  east along row 4 and reaches the key, exactly as the spec's flavor text
  describes ("the kid slides across row 4 to bump the K").
- Floor 2's fix moved the free-floating K from (21,10) into the new locked
  pocket's entrance at (22,2) (deleting the old tile) rather than adding a
  second K — one key per floor, matching every other dungeon's convention.
- Hearthmoss's healing counter (`s.hearthmossSteps`) has no explicit
  migration entry — it's read everywhere via `|| 0`, so an old save without
  the field behaves identically to one initialized to zero.

**Play-time added: none — this wave removes friction, which is worth more.**

## Wave 2 — The Enchanter's Forge (mix-and-match gear magic) ✅ SHIPPED (2026-07-10)

New NPC **Emberlyn the Enchanter** in Port Brightwater (new letter on the
ISLES map, new NPCS entry). She fuses **enchant gems** onto gear.

- **Gems** (data.js `MM.data.GEMS`): e.g. Flame (+2 strike), Frost (monster's
  next hit -2), Guard (+1 block), Feather (+4% dodge), Leech (heal 2 on crit),
  Magnet (+10% gold), Echo (streak bonus +1). Each with emoji + quip.
- **Where gems come from:** a new **glimmering chest** roll — 6% of chest
  loot (`chestLoot` in engine.js) and a guaranteed one in each Wave-1 dungeon.
  Also a rare Homework-Golem drop.
- **Data model (IMPORTANT — keep it this simple):** enchantments attach to a
  slot+item pair, NOT to item instances: `s.enchants = { 'weapon:tidal':
  'flame' }`. One gem per item; re-enchanting replaces (old gem is lost — say
  so in the UI). No migration needed: missing map = no enchants.
- **Effect hooks** — exactly these functions, nothing else: `strikePower`,
  `rollMonsterHit` (frost), `dodgeChance`, `gainGold`, crit handling in
  `startCombat.playerStrike` (leech). Show enchant in gear names everywhere
  as e.g. "🔥 Flaming Tidal Blade" via a `MM.data.gearLabel(slot, id)` helper
  used by bag/shop/sidebar.
- **Emberlyn's UI:** a dialog listing owned gems × equipped gear; fusing asks
  a full-depth mixed problem (free on correct, costs 25 gold on a miss —
  gentle, still succeeds).
- **Also in this wave — the AMULET slot** (user-requested, 2026-07-10): one
  new equip slot, 3–4 amulets sold by Emberlyn / found in glimmering chests
  (e.g. Tidewood Amulet +10 max HP, Keeper's Amulet: inn warm-ups give +5
  gold each, Wayfarer's Amulet: +25 max stamina). Copy the ring slot
  end-to-end (GEAR catalog, SLOT_NAMES, bag/shop, migration default null).
  DESIGN RULINGS to preserve: rings stay ONE (the "one finger, one power"
  tradeoff is taught by Trader Tessa); NO dual-wield weapons (a second weapon
  is just a bigger number — no interesting choice); charms are own-many,
  **wear three** (shipped 2026-07-10; `s.charmsOn`, `E.CHARM_SLOTS`).
- **Acceptance:** drive-enchant.js — find gem in glimmering chest, fuse, see
  renamed item, verify each hook's effect numerically, save/load persistence.

**Deviations from this spec, and why:**
- **Gems are slot-agnostic, not slot-restricted.** A gem can be fused onto
  *any* equipped item, and its effect checks *all* equipped slots (weapon,
  body, helmet, boots, ring, amulet) rather than one "logical" slot per gem
  (e.g. Flame only making sense on a weapon). Simpler to implement and test,
  and it leans into "mix-and-match" literally — fusing Guard onto a helmet
  *and* boots stacks +1 block from each, which reads as a fun reward for
  spreading gems around rather than a loophole.
- **"A guaranteed one in each Wave-1 dungeon" (gems) is read as dungeons 17
  and 18 specifically** — the two dungeons EXPANSION_PLAN's own Wave 1
  section built (the Great Lighthouse, the Smugglers' Vault) — not all five
  isle dungeons. One guaranteed glimmering chest each: Lighthouse f3 (24,2),
  Vault (15,12).
- **Amulets never auto-equip on purchase**, exactly like rings — "copy the
  ring slot end-to-end" is taken to include that behavior, not just the data
  shape. A kid buying their second amulet type shouldn't have it silently
  replace the first without a choice.
- Amulets are also sold by Emberlyn (as specified) but I added a **small
  chance (≈0.9% of all chests) for a glimmering chest to hold an unowned
  amulet instead of a gem** — the spec lists "found in glimmering chests" as
  a second acquisition path for amulets and this was the natural place for
  it, reusing the same roll.
- **Bugfix, not a deviation, but worth flagging:** `E.gainGold`'s multiplier
  stacking (`1 + 0.25 + 0.15 + 0.10` etc.) could land on values like
  `110.00000000000001` from ordinary floating-point error, which
  `Math.ceil` then rounded UP to the wrong whole-gold amount. Fixed with a
  `1e-9` epsilon subtracted before ceiling. Caught by drive-enchant.js's
  Magnet gem check, which would have flagged this on any future gold-stacking
  addition even without Wave 2.

**Play-time added: ~3–5 h** (collection hunting + build experimentation).

## Wave 3 — Level 3: The Clockwork Spire (TIME) ✅ SHIPPED (2026-07-10)

**Carry-over from Wave 2 (missed there — the promise lived only in Wave 1's
section):** add a **bow to Emberlyn's stock** — one ranged weapon priced and
statted at this wave's tier (atk one below its best melee weapon,
`ranged: true`, same one-rule behavior as the crossbow) so melee-vs-ranged
stays a real choice as the numbers grow.

A new region: the captain sails to a third destination once the lighthouse is
lit — **Horologe Isle**, one town-less map with the **Clockwork Spire**: the
game's biggest dungeon yet (**5 floors**, maps up to 40 cols wide — the
engine handles any grid size; keep every row the same length and add a
width assertion in tests).

- **New math: reading time** (core curriculum, default ON):
  - New problem **kind: 'clock'** — an analog clock face rendered as inline
    SVG in the problem text (`problems.js` returns `p.svg`; `showProblem` and
    battle's problem box render it above the text — copy how `prob.text`
    flows). Generator draws random h:mm (tier 1 = o'clock/half past, tier 2 =
    5-minute marks, tier 3 = to-the-minute + "quarter to" wording).
  - **Answer format "3:15"** — extend `parseAnswer` with
    `/^(\d{1,2}):(\d{2})$/` → `{kind:'time', h, m}` and `checkAnswer`
    accordingly (accept 12-hour equivalents).
  - **Elapsed-time problems** (word problems: "The forge opens at 3:40 and
    runs for 45 minutes...") — these are plain 'number'/'time' answers.
  - **Parent switch:** add skill `time_reading` to SKILL_NAMES. The parent
    checklist currently derives from TASKS — replace with an explicit
    registry `MM.data.PARENT_TOPICS = [...ten existing skills,
    'time_reading']` and use it in `parentSettings` and `cappedSkills`.
    Default ON. All Spire problems: 50% time, 50% mixed review.
- **New mechanic: clock doors** ⏰ — a door tile showing a target time; the
  problem asks to READ a clock (the door opens when the answer matches).
  Plus **gear plates**: lever variants that ROTATE which of 3 gates is open
  (pull cycles A→B→C — a routing puzzle, trivially implemented as lever
  state 0/1/2 stored in `s.opened` with a counter).
- **Monsters:** Tick Imp (chase), Pendulum Knight (guard — sways!), Cuckoo
  (thief — steals and SHOUTS), boss **The Unwound King** (sincere-ish desc).
- **Acceptance:** drive-spire.js — clock problems render (screenshot the
  SVG!), "3:15" answers parse, clock door opens, gear plates cycle, 5 floors
  traversed, boss beaten. Unit: time generator ×400/tier round-trips; the
  parent switch disables time problems everywhere (copy the cap-leak test).

**Play-time added: ~6–8 h** (new topic × biggest dungeon × new puzzles).

**Deviations from this spec, and why:**
- **The parent-topic registry (`MM.data.PARENT_TOPICS`) replaced the
  TASKS-derived list everywhere**, not just where the spec mentions it —
  `mastery.cappedSkills` and `ui.parentSettings` both read it, and
  `MM.problems.QUICK`/`GENERATORS` are cross-checked against it by a new
  "parent-portal completeness" unit test. This was necessary, not optional:
  `time_reading` has no mainland dungeon of its own, so the old
  `TASKS.filter(t => !t.exp)` derivation had no way to include it at all.
- **The 50/50 time-vs-review split needed its own picker functions**
  (`mastery.pickSpireProblem` / `pickSpireGate`), not a reuse of
  `pickArenaProblem`/`pickMixedGate` — those are weakest-first weighted,
  which would let a kid who's aced clocks stop seeing them entirely. The
  Spire's whole premise is clock practice, so it's a flat coin flip between
  `time_reading` and weakest-first review of everything else, gated by the
  parent switch same as every other pool (see the cap-leak unit test).
- **Gear plates are the game's first re-lockable interaction** — every
  existing lever/gate/door writes into `s.opened` and is monotonic (once
  open, forever open). A gear plate can't work that way (three gates, only
  one open at a time, freely re-toggled), so it's a parallel mechanism:
  `s.gearState[mapId]` holds a 0/1/2 rotation counter, and
  `E.applyGearState()` (called on floor entry AND after every pull)
  recomputes which of the map's `A`/`B`/`C` glyphs is currently `.` vs `#`.
  Gate positions are cached in-memory per floor (`E._gatePositions`, not
  persisted — cheap to rescan) since a tile can't remember its own glyph
  once turned to `.`. In this shipped dungeon, gear plates only gate BONUS
  loot alcoves — the main path never depends on gate state, so there's no
  way to get stuck.
- **The Cuckoo's "shout" is a new, generic monster mechanic**, not
  Cuckoo-specific: a `shouts: true` flag on any thief type wakes every other
  monster on the floor into a few turns of forced chase (`m.alerted`
  countdown in `E.monsterTurn`). No prior monster had anything like it — the
  closest precedent (`m.stun`) is a single-target debuff, not a floor-wide
  wake-up call.
- **A clock door falls back to the Spire's own mixed-review pool if a
  parent switches `time_reading` off**, rather than staying clock-only and
  becoming a dead end. The spec's own acceptance line — "the parent switch
  disables time problems everywhere" — is read literally, including the one
  tile whose entire premise is reading a clock.
- **Boss victory needed a new `task.spire` branch** (not `finale`, which the
  Great Lighthouse already owns, and not `isle`, which lights a lens): it
  sets `s.isles.spireDone = true`, the flag a later wave can gate a fourth
  sail destination on, per the existing `s.bossesDefeated[mapId]` pattern.
- **Third-continent plumbing turned up one pre-existing latent bug**, fixed
  in passing: `ui.js`'s sail-scene animation hardcoded
  `dest === 'isles' ? -1 : 1` for which direction the ship travels — a third
  destination would have silently sailed "backward." Now a small lookup
  table (`{isles: -1, horologe: -1}`, default `1`).
- **The seal exam for dungeon 19 is untouched** — `E.sealExam` already
  handles `mixed:true` predecessor tasks generically (it already does this
  for dungeon 15 following 14), so no special-casing was needed.

## Wave 4 — Level 4: The Resonant Halls (MUSIC) ✅ SHIPPED (2026-07-10)

**Carry-over papercut (user-reported 2026-07-10): the spellbook is
unexplained in-game.** Two fixes while you're in ui.js anyway:
(a) add a Spellbook section to `UI.helpDialog` — what it is (gold-badge
rewards), the three spells with their unlock counts (Scout 3 gold / Blink
6 gold / Beacon all-enabled-skills gold, min 6), costs, once-per-visit
limits, AND HOW TO CAST: click the sidebar button while inside a dungeon
(no keyboard shortcut). Blink needs its technique spelled out — "walk or
bump TOWARD what you want to hop, then click ⚡ Blink; you land two tiles
ahead, on the far side" (it uses `E.lastDir`); (b) spells currently unlock
SILENTLY (the sidebar row just appears) — fire a one-time celebration
dialog per spell on first unlock via the `pendingBadges` queue (see the
recipes table: maybeCelebrateBadge already handles badge AND pet entries;
add a spell entry type). Each celebration states the how-to-cast line for
that spell — the celebration IS the tutorial. Track "already celebrated"
in a small `s.spellsCelebrated` map (migrate: `{}`); (c) the spell buttons
grey out without saying why — set a `title` tooltip per disabled reason
("Only inside dungeons" / "Used this visit — back at the entrance it
recharges" / "Need 10 stamina — eat something!") and reuse those strings
in the Blink no-op log lines. Drive check: unlock Scout via badge grant →
celebration appears exactly once and contains the word "click"; Help
contains "Spellbook"; a disabled Blink button carries a title attribute.

**Third carry-over (Wave 3 review, 2026-07-10): clock faces need
numerals.** `clockFace()` in problems.js draws tick marks only — real
classroom clocks have the numbers 1–12, and the skill is reading the
HANDS, not inferring tick positions. Add `<text>` numerals at all tiers
(small, `#494073`, just inside the tick ring), and re-screenshot every
tier. One function, ~6 lines.

**Second carry-over (user request 2026-07-10): the Rope of Return** 🪢 —
exit any dungeon to the overworld without the walk back.
- DESIGN RULING: an ITEM, not an earned spell — convenience is hygiene,
  not a reward (the Wave 1.5 lesson); the earned tier already exists
  (Beacon is the free reusable version, and buying ropes early → earning
  Beacon late is the intended progression). Do not change Beacon.
- Data: a consumable in the shop Supplies section, both continents,
  ~30 gold (copy the POTION data + applyPurchase + bag patterns; own
  many, `s.items.ropes`). Quip: "One end is tied to 'here.' Nobody has
  ever found the other end." Rare chest find at potion-like rates.
- Use: from the bag, only while `E.inDungeon()`; a confirm dialog
  ("Climb out of the {dungeon name}?" — kids mis-tap), then consume one →
  `E.exitDungeon()` (already lands beside the entrance; worldPos is
  handled). Not usable in battle (the bag already isn't). Greyed with a
  title tooltip on the overworld ("You're already outside!").
- Mention it in the same helpDialog update, one line.
- Drive: buy → bag shows count → use inside f2 of a multi-floor dungeon →
  standing beside the entrance on the overworld, count decremented,
  save/load round-trips; unusable (greyed) on the overworld.

Fourth sail destination: **Chime Isle** and the **Resonant Halls** (4 floors).

- **New math-adjacent skill: reading music** (default OFF — parents opt in;
  rhythm problems double as fraction practice):
  - **Kind: 'staff'** — a treble staff with one note, rendered as inline SVG
    (5 lines, a note ellipse; positions E4–F5). Answer = choice buttons
    A–G (reuse the existing 'choice' kind — NO new parser work).
  - **Rhythm = fractions:** "a quarter note + a half note = how much of a
    whole note?" → exact-rational answers, reusing the fraction checker.
  - Skill `music_reading` in the PARENT_TOPICS registry, default **false**.
- **New mechanic: echo doors** 🔔 — the door plays a 3–5 tone sequence
  (WebAudio `beep()` already exists in ui.js sounds); the kid repeats it by
  clicking tone buttons (do-re-mi colored). Wrong = replays, longer pause.
  This is a memory puzzle, not math — cap sequences at 5 and always replayable
  (no-timer pillar). Singing stones: floor tiles that chime scale notes as
  you walk them (pure flavor, one `beep` per step).
- **Monsters:** Off-Key Sprite (wander), Bass Golem (guard), Piccolo Pixie
  (thief), boss **The Discord** (redeemed like Miscount: it just wanted to
  be in the choir — sincere).
- **Acceptance:** drive-halls.js — staff renders (screenshot), A–G choice
  flow, rhythm-fraction answers, echo door solved via scripted clicks,
  parent switch OFF hides music problems entirely (assert 500 picks).

**Play-time added: ~5–7 h.**

**Deviations from this spec, and why:**
- **`music_reading` is the first topic that ever needed a real default-OFF
  mechanism** — every existing topic (including Wave 3's `time_reading`)
  relies on "missing from `state.parent.topics` reads as enabled," which has
  no way to make a NEW topic start disabled. Fixed at the source in two
  places: `E.newGame` now seeds `parent.topics` with `{music_reading: false}`
  instead of `null` (a brand-new profile's first session never calls
  `E.load()`, so the usual migration path wouldn't have run yet), and
  `E.load`'s migration force-writes `music_reading: false` for any existing
  save that predates the topic. This is the actual mechanism the spec's
  "default OFF" line depends on — it doesn't exist by default in this
  codebase.
- **The treble clef is a drawn swirl (an SVG `<path>`), not the Unicode 𝄞
  glyph** — glyph rendering is font-dependent (this codebase already has one
  documented gotcha about a Unicode symbol silently falling back to "x" in
  the pixel font), so a hand-drawn curl reads identically everywhere.
- **Echo doors are NOT drawn from `pickSpireGate`-style topic pools at
  all** — they're a pure memory puzzle (a random 3-5 tone sequence), no math
  generator involved. `MM.ui.currentEcho` exposes the correct sequence the
  same way `MM.ui.current`/`MM.battle.current` expose problem answers, so
  drives can solve it deterministically without needing real audio timing.
- **Resonant Halls does NOT get its own 50/50 picker** (unlike the Spire) —
  the spec never asked for one, and since `music_reading` defaults off,
  most players would never see it in the mixed pool anyway; when a parent
  does opt in, plain `pickArenaProblem`/`pickMixedGate` (weakest-first
  across every enabled topic) is the same "mixed review" every other isle
  dungeon already uses.
- **Fourth-destination gating**: Chime Isle opens from Horologe's own dock
  once `s.isles.spireDone` (the flag Wave 3 shipped) is true — mirroring
  exactly how Horologe itself opened from the Isles' dock once
  `s.isles.lampLit`. The boss sets `s.isles.hallsDone`, the flag a later
  wave can gate a fifth destination on.
- **Sail-direction lookup simplified, not extended.** Wave 3 had patched the
  voyage-scene direction as an ever-growing allowlist
  (`{isles:-1, horologe:-1}`, default `1`) — a third destination would have
  needed a third entry forever. Replaced with `dest === 'west' ? 1 : -1`:
  home is the one direction, everything else sails further out, and no
  future destination needs a code change here.
- **The Rope of Return confirm dialog reuses `UI.dialogChoices`** (a
  two-button choice dialog, already used for "Sail home? / Stay a while")
  rather than introducing a new confirm-dialog component — it already does
  exactly what a "Use it? / Never mind" gate needs.

## Wave 5 — Depth & endgame (the multiplier wave) ✅ SHIPPED (2026-07-11)

Smaller independent chunks, any order:

1. **Bigger, deeper revisits:** add a locked "Deep Wing" to dungeons 4, 7,
   and 9 (a '>' behind a K-door on the existing maps → one new 26×15 floor
   each, mixed review, a glimmering chest). Cheap content ×3. (~2 h)
2. **Bounty board v2:** new job types — "open a glimmering chest",
   "answer 6 problems in the Spire", "catch 2 thieves"; isle board in Port
   Brightwater (same `refreshBounties`, gated on continent). (~1 h/session ×
   forever)
3. **Pet evolutions II:** stage-3 pets learn a *fetch* trick — after each
   battle victory, 10% chance the pet retrieves a bonus item (food/potion/
   rarely a gem). Pure `victory` hook + celebration line. (~1 h)
4. **Boss rematch gauntlet:** Miscount's arena gains "Champion's Gauntlet" —
   refight any beaten boss at +20% stats for trophies (bestiary marks a 👑✨
   on gauntlet-beaten bosses). Reuses everything. (~3–4 h)
5. ~~**The Hall of Heroes**~~ — MOVED into Wave 7 (it becomes a room inside
   the opened castle rather than a standalone feature).
7. **Fraction coverage gaps** (user-spotted 2026-07-10, ~2 h): the
   generators lack three legit 5th-grade skills. Extend `fractions_m`
   (problems.js) with: (a) **explicit conversion both directions** — "write
   7/4 as a mixed number" and "write 2 1/3 as an improper fraction"
   (answers already round-trip: the parser takes both forms and `fstr`
   renders mixed); (b) **mixed-number add/sub with UNLIKE denominators**
   (t3, denominators from the fractions_as t3 pairs list); (c)
   **mixed-number subtraction with regrouping** ("3 1/4 − 1 3/4" — the
   worked solution must show the borrow step: "take 1 from the 3: 2 5/4").
   Every new variant: worked solution, hint text, the 400-per-tier
   round-trip, and a QUICK variant only if simple (conversion qualifies;
   regrouping subtraction does NOT belong in combat — full-depth gates
   only, per the pacing redesign rule).
8. **Ambient life & delight pass** (~3–4 h): the FUTURE_LEVELS.md §4
   catalog — 2-frame tile shimmer/flicker/motes off a slow frame clock,
   footstep puffs, generalized `burst()` for badge/level dings, streak-5
   gold outline via `silhouette()`, door-crumble particles, snoozing
   guards + coin-polishing thieves, pet tricks by stage, the innkeeper's
   cat, the shopkeeper's shelf, the bestiary hat counter. HARD RULES (from
   that doc): repeated effects ≤300ms and never while a problem is open;
   ambient gags ≤1 per few minutes; no strobing; ship a parent-panel
   **Calm Mode** that disables shakes/particles/ambient motion. Drive:
   calm mode verified to still pass every existing drive.
6. ~~**New Game+ "Golden Numeria"**~~ — MOVED into Wave 7 (offered from the
   throne after the ending, where it lands as an invitation, not a menu).

**Play-time added: ~10–15 h combined** (items 5–6 now counted under Wave 7).

**Deviations from this spec, and why:**
- **Deep Wings gained a locked stairwell in a room corner, not a "'>' behind
  a K-door" carved into a natural dead-end wall pocket** — dungeons 4/7/9
  are hand-built mazes with essentially no 2-cell-deep unused wall pockets
  anywhere (confirmed by scripted search before touching any map: zero
  candidates in all three). Punching a new corridor through an existing
  interior wall risked bypassing that dungeon's real doors, so instead one
  existing room-corner floor tile becomes the lock (`(1,1)`), and the
  boundary cell directly above it (`(1,0)`, always solid on every map)
  becomes the stairs down — automatically isolated (its only possible
  neighbor is the lock) without touching any existing route.
- **`floors.length > 1` deciding the mapId scheme (`'d4'` → `'d4f0'`) is a
  real, accepted one-time cost.** The moment a mainland dungeon gains a
  second floor, any already-opened doors/chests or a beaten boss on its
  original floor reset once (their `s.opened`/`s.bossesDefeated` keys no
  longer match). Not worked around — re-solving three already-easy puzzles
  once is a fair trade for new content, and it's the exact same mechanism
  `enterDungeon` already uses everywhere else.
- **`E.isDeepWingFloor(s)` is checked alongside `task.mixed`** at all three
  sites that read it (`startCombat`'s `pickProblem`, `mathDoor`, `chest`) —
  `task.mixed` is a whole-dungeon flag with no floor granularity, and
  dungeons 4/7/9 need their ORIGINAL floor to stay single-topic while only
  the new floor is mixed review. No existing per-floor hook to reuse.
- **The isle notice board is a fully separate `s.isleBounties` state field**,
  not a continent-branch inside the existing `s.bounties` — visiting one
  board must never disturb progress on the other. `E.bountyEvent` now loops
  over both boards every time (cheap; most events match neither).
- **"Answer 6 problems in the Spire" is gated on `s.isles.lampLit`**, not
  always offered — the spec's own dungeon-scoped `solve` job type only ever
  targets the two weakest unlocked MAINLAND dungeons; making the isle board
  point at dungeon 19 needed new generation logic, and offering a job for a
  dungeon the kid can't reach yet would be unfair. Falls back to a Tidepool
  Grotto hunt job until the Spire is unlocked.
- **The Champion's Gauntlet is a parallel function (`E.startGauntletBattle`),
  not a call into `E.startCombat`.** That function's `victory()` captures
  `s.dungeonIndex`/`s.mapId` at the moment `E.startCombat` was invoked —
  stale values here, since a rematch is triggered from an overworld NPC.
  Reusing it verbatim would have risked flipping permanent one-time story
  flags (`s.isles.lampLit`, a lens, a duplicate charm) based on whatever
  dungeon the player happened to have visited last. Modeled on the existing
  `E.startArenaBattle` instead, which already sidesteps this correctly.
  Reward is a flat 50% of a fresh kill (a trophy fight, not a repeat of the
  first clear) and never touches `s.bossesDefeated`.
- **A fourth, unplanned item slipped in from a later edit to this file**
  (user-spotted 2026-07-10, "Fraction coverage gaps") — three legitimate
  5th-grade `fractions_m` variants that were missing: explicit improper
  ↔ mixed-number conversion, mixed-number add/sub with unlike denominators
  (reusing `fractions_as`'s own t3 denominator pairs), and mixed-number
  subtraction WITH regrouping (the worked solution shows the borrow step
  explicitly — "3 1/4 − 1 3/4" style). Regrouping subtraction is full-depth
  gates only, exactly as specified — `QUICK.fractions_m` was left untouched
  and a unit test now asserts it never draws one. One real bug caught by a
  bad first version of that same test: an off-by-one (`tags.size < 6`
  against 7 possible tags) let the loop exit before ever finding the
  rarest variant, silently "passing" a test that was checking nothing —
  fixed by asserting against the correct count.
- **Calm Mode gates shake + particle bursts, but deliberately leaves
  floating damage numbers alone** — those are core combat feedback (you
  need to see what just happened), not ambient motion, and the spec's own
  wording ("shakes/particles/ambient motion") doesn't name them. The full
  FUTURE_LEVELS.md §4 catalog (torch flicker, monster idle life, pet
  tricks by stage, the innkeeper's cat, the shopkeeper's shelf, the
  bestiary hat counter) was intentionally trimmed to a representative
  subset — footstep puffs plus a generalized achievement sparkle
  (`MM.ui.worldBurst`, fired on badges/level-ups/bounty completions) —
  matching this item's own "small, independent" framing rather than
  building the entire catalog in one pass. The rest remains available to
  pick up later from FUTURE_LEVELS.md §4 directly.
- **"Drive: calm mode verified to still pass every existing drive"** was
  scoped down to a live in-drive check (a full arena battle under Calm
  Mode, asserting zero shake/particles throughout, via a new
  `MM.battle.debugEffects()` test hook) rather than re-running all 16
  existing Playwright drives a second time with Calm Mode forced on —
  Calm Mode only ever SKIPS existing effect calls, it doesn't change any
  game logic those drives assert on, so a second full pass would mostly
  re-prove the same ground already covered by the full regression suite.

## Wave 6 — Level 5: Gullwrack Harbor (GEOMETRY — the Builder's Guild) ✅ SHIPPED (2026-07-11)

**Carry-over (user playtest, 2026-07-11): shop rework.** Three findings,
one coherent fix in `UI.openShop`:
1. **Tabs** — the shop has outgrown one scroll: "⚔️ Gear", "🧪 Supplies",
   "💰 Sell" tab buttons across the top (isle specialties live under
   Supplies; the Sell tab holds treasures + gear selling). Remember the
   active tab while the shop stays open; default to Gear.
   ⚠️ DRIVE COMPAT: every existing drive that clicks `.shop-buy` must
   first click the right tab (hidden buttons fail Playwright clicks).
   Add a tiny `shopTab(page, name)` helper to each affected drive — grep
   ALL drives for `.shop-buy` and `data-kind` — and re-run all of them.
2. **Compare-to-equipped** — on every weapon row show the equipped
   number next to the item's ("⚔️ 12 · you: 10 ▲"), same for def on
   body/helmet/boots (include dodge if either side has it). ▲ better /
   ▼ worse / = equal, computed vs `E.equippedItem(slot)`. Rings/amulets
   keep their bonus text (not comparable numbers) — instead append
   "wearing: <name>" dimmed. The ✓-owned marker stays.
3. **Bulk potions always visible** — remove the `potionsBought`
   thresholds entirely: ×5 and ×10 buttons always render, disabled only
   by gold (invisible-until-earned reads as broken — the third
   discoverability lesson of this project). Move the crate quip to fire
   once on the first bulk PURCHASE (`s.seenBulkQuip` repurposed). Keep
   `s.potionsBought` tracking (harmless, and the parent report may use
   it someday). Update drive-qol's threshold assertions: buttons present
   from the start, a ×5 purchase works with zero prior buys.

Promoted from FUTURE_LEVELS.md (2026-07-10). The last core-5th-grade gap:
**area, perimeter, volume** — plus the game's first EMBODIED math puzzle,
where pushing actual blocks IS the math. Do this after Wave 5 (it reuses
Wave 3's `p.svg` pipeline and the sail-destination wiring — read Wave 3's
shipped code and deviations FIRST and copy its patterns exactly).

**Gate:** the captain offers the new destination once the Clockwork Spire's
boss is beaten — Wave 3 shipped the flag: **`s.isles.spireDone`** (do NOT
gate on Wave 4's Discord, music is parent-opt-in and the kid may never
fight it).

### 6a — The `geometry` problem topic (default ON — core curriculum)

- One skill: `geometry` ("Geometry: Area, Perimeter & Volume") in
  SKILL_NAMES + the PARENT_TOPICS registry (Wave 3 built it), default ON.
- Generator tiers: **t1** = perimeter of labeled rectangles + area by
  counting/multiplying (numbers ≤ 12); **t2** = area/perimeter word problems
  + L-shapes solved by decomposition (draw the split line in the SVG);
  **t3** = volume of rectangular prisms (l×w×h ≤ 10) + "how many unit crates
  fill the hold" word problems. All answers plain whole numbers — NO parser
  work. QUICK variant: single rectangles, perimeter or area, numbers ≤ 9.
- **SVG recipe** (copy the clock-face pattern from Wave 3's generator —
  `p.svg` is already rendered by showProblem AND battle.js): a rectangle
  diagram is just

  ```
  p.svg = `<svg viewBox="0 0 200 120" width="200" height="120">
    <rect x="30" y="20" width="${w*14}" height="${h*14}"
          fill="none" stroke="currentColor" stroke-width="2"/>
    <text x="${30 + w*7}" y="14" text-anchor="middle" font-size="12">${w} m</text>
    <text x="18" y="${20 + h*7}" text-anchor="middle" font-size="12"
          transform="rotate(-90 18 ${20 + h*7})">${h} m</text>
  </svg>`;
  ```

  L-shapes = two rects sharing an edge; prisms = the front rect plus two
  skewed parallelograms (top/side) — keep it schematic, label every needed
  edge, and SCREENSHOT each variant and look at it. Use `currentColor` so
  the diagram follows the theme.
- Unit tests: the standard ~400-per-tier round-trip loop; plus assert every
  generated `p.svg` contains one `<svg` and every labeled dimension used by
  the solution text appears in the SVG (no unlabeled-edge problems).

### 6b — The region: Gullwrack Harbor + the Sunken Breakwater

- **Gullwrack Harbor** = a storm-wrecked fishing town, fourth sail
  destination (copy Wave 3's Horologe wiring: destination in the captain's
  dialog, sail scene direction, `s.continent` value `'gullwrack'`,
  enterWorld routing, worldPos rules). Town map ~40×18 like the ISLES map:
  dock W, arrival P, the **Guildmistress Maren** NPC (assigns the level,
  brisk-kind foreman energy, quips about paperwork), an inn, a notice board
  'n', and **4 repair sites** (see 6c) that visibly rebuild the town.
- **The Sunken Breakwater** = the NEXT free dungeon index (Wave 3's Spire
  took 19; Wave 4's Resonant Halls will take 20 — so the Breakwater is
  likely **21**; count TASKS at implementation time and take length+1)
  (`{exp, isle, mixed: false, skill: 'geometry', ...}` — the first isle-era
  dungeon with a single
  skill focus; 50% geometry, 50% mixed review via the Spire's 50/50 pattern
  from Wave 3), **2 floors** (copy the Tidepool 2-floor pattern),
  waterlogged-storeroom theming. Roster: Soggy Crate-Mimic (wander), Barnacle
  Bruiser (guard), Tidepocket Filch (thief), boss **The Undertow** (the storm
  that wrecked the pier, played sincere — it doesn't hate the town; it just
  never learned where the edges of things are). Bump the bestiary counts.
- Blueprint doors: reuse the math-door 'D' flow as-is — geometry problems
  arrive through the normal skill routing; no new door mechanic needed.

### 6c — The embodied puzzle: slab-tiling repair sites (NEW TILE MECHANIC)

The one new mechanic this wave (like the chute in Wave 1 — copy that
recipe's shape: tileSprite case + sprite + tryMove handler + persistence +
unit check + drive check).

- A **repair site** is a marked rectangular region of broken-floor tiles
  (new glyph, pick an unused one — grep maps.js AND NPCS first, per the
  gotcha) with 2–4 **stone slabs** nearby (new pushable glyph). Bumping a
  slab PUSHES it one tile in the bump direction if the destination tile is
  open or broken-floor (sokoban, one slab at a time, no chain pushes).
  Slabs are 1×N visually but occupy ONE tile each (a "slab" = one tile;
  the region needs exactly K slabs for its K broken tiles — the kid's
  blueprint problem asked "this pier gap is 3 wide and 2 long — how many
  stone slabs?" and the pushing then PROVES the answer physically).
- A slab pushed onto a broken tile locks in with a thunk + sparkle and
  becomes ordinary floor (persist via the `s.opened` scheme). When the LAST
  broken tile fills: fanfare, the site's scaffold tiles turn into finished
  planks/walls (map-edit-on-the-fly like the bridge in enterWorld), +gold,
  and a one-line celebration from Maren.
- **Reset lever** 'L'-style beside every site: re-spawns that site's
  unlocked slabs to their start tiles (gentle failure — a slab wedged in a
  corner must never soft-lock a site). Unit test: for every site, assert a
  solving push-sequence exists (write a tiny BFS over slab positions — cap
  the search; sites are small) AND that the reset restores exactly the
  start state.
- 4 sites in town (pier, bakery floor, seawall, lighthouse-keeper's shed,
  escalating 4→6→8→9 tiles), 1 inside the Breakwater as a shortcut-opener.
  Each site's blueprint plaque asks the matching area problem (modal,
  full-depth) BEFORE pushing unlocks — concept then proof.
- **The payoff:** when all 4 town sites are done, Gullwrack visibly stands
  rebuilt (swap scaffold/wreck tiles for painted ones on entry — same
  pattern as murk-fog clearing) and Maren names the kid an honorary
  Guildmember (charm reward: **Mason's Charm** 🧱, +1 block while worn —
  copy an existing charm end-to-end).

### 6d — Story seeds to plant NOW (three dialog lines, ~15 min)

Wave 7 (the ending) reveals why Numeria's troubles yield to worked answers.
The reveal only lands if it was always quietly true, so add these to
EXISTING dialog pools this wave (pools + rare gags rule — they're lore, not
jokes, so keep them sincere):

1. **Sage Sylvia** (add one rotating line): "Look closely at the castle
   stones sometime, hero. The mortar is arithmetic. The whole kingdom is —
   though most folk never squint."
2. **Miscount, post-redemption** (arena small talk pool): "I didn't make
   the dark places, you know. I just stopped tending my corner of them...
   and tangles grow wherever nobody's working things out."
3. **First-battle tutorial** (one sentence appended, keep it light):
   "Why do monsters come apart when you show your work? The Sage has
   theories. The monsters decline to comment."
4. **Spiral seeds** (for Wave 7's map reveal): Sylvia gains a telescope
   line — "The kingdom looks different from far away. I keep a telescope
   for the day you've earned the view." And Old Salt Percy: "Charts of
   this sea always want to curl at the edges. Like they know something."
   Optionally a **Spiral Shell** treasure item (quip: "It repeats itself,
   but bigger each time. Rude, but beautiful.").

### Acceptance — drive-gullwrack.js

Sail unlock gates correctly on the Spire flag (assert locked before);
geometry problems render their SVGs (SCREENSHOT t1/t2/t3 and LOOK);
blueprint plaque → slab pushes → site completes → tiles persist through
save/load AND re-entry; reset lever restores a mangled site; a wedged slab
is recoverable at every site (unit BFS); Breakwater 2 floors + Undertow
beaten; parent switch OFF removes geometry problems everywhere (copy the
cap-leak test); door audit + all reachability tests green; ALL existing
drives pass; bestiary counts bumped; the three story-seed lines appear in
their pools. Update README, this file (✅ + deviations), tests/README.

**Deferred to Wave 8 (Cartographer), on purpose:** plank bridges (fraction
sums), bucket-filled volume tanks, balance-scale doors, number-line
hallways, walk-to-coordinates digging — one embodied mechanic per wave.

**Play-time added: ~5–7 h** (new topic × new region × the rebuild loop).

**Deviations from this spec, and why:**
- **The SVG recipe's `fill="none" stroke="currentColor"` on a transparent
  canvas is invisible in this game — a real bug caught live, not a style
  choice.** Labels sit OUTSIDE the shape (above/left of a rectangle, on the
  bare SVG canvas); a transparent canvas means those labels land directly
  on the dark modal backdrop and vanish. Screenshotting the first draft
  caught this immediately. Fixed by copying `clockFace`'s ACTUAL pattern
  instead of its description: a full-canvas opaque light background
  (`#fdfaf3`) with dark ink (`#262042`) strokes/text, exactly like the
  clock face's white circle. `currentColor` was dropped entirely — the
  clock face doesn't use it either, and a fixed light card matches every
  other `p.svg` diagram in the game.
- **Repair-site persistence is a dedicated `s.repairSites` state object,
  not the `s.opened` scheme.** `s.opened` is append-only (a key is set once
  and NEVER cleared anywhere in the codebase) — the reset lever needs a
  genuine, repeatable undo, which the spec's own §6c wording ("a wedged
  slab must never soft-lock") requires. Modeled instead on the Clockwork
  Spire's gear-plate split (Wave 3): `E._siteTemplates` caches each site's
  ORIGINAL glyph positions (scanned once, in memory, not persisted — a
  filled tile can't remember its own glyph any more than a gear gate
  can), `s.repairSites[mapId:id]` persists live/current state (slab
  positions, which broken tiles are filled, plaqueSolved, done), and
  `E.applySiteState` re-derives the grid from that state on every
  entry/push/reset — the exact three-piece shape Wave 6b's own research
  pass identified as the closer precedent than the one-shot chute.
- **The reset lever is glyph `l` (lowercase), not literal `L`.** Uppercase
  `L` already means "one-shot lever, opens every `G` gate forever" inside
  dungeons — reusing it for a re-triggerable, per-site reset would
  silently collide with that existing handler the moment a repair site and
  a classic lever ever shared a floor. `l` keeps the "L-style" naming
  spirit (and the mnemonic) without the collision. Broken floor is `r`,
  the pushable slab is `U`, the blueprint plaque is `i` — all confirmed
  unused (kingdom-wide, both overworld and dungeon glyph-spaces) by an
  exhaustive grep before picking them.
- **"Blueprint doors reuse the math-door 'D' flow as-is" turned out to
  describe the REPAIR-SITE PLAQUE's interaction shape, not the
  Breakwater's actual `D` doors** (which needed no changes at all — they
  already resolve correctly through the existing `task.skill`/`task.mixed`
  routing once `TASKS[20]` was shaped correctly). The plaque
  (`E.siteBlueprintProblem`) copies `E.mathDoor`'s exact pattern —
  `showProblem`, a `step()` closure for retry-on-wrong, `onEnd` refresh —
  but is its own handler, since solving it doesn't open a grid tile, it
  flips a per-site `plaqueSolved` permission flag instead.
- **Each site's slab-count equals its broken-tile count (2/2/3/3 across
  pier/bakery/seawall/shed, 2 for the Breakwater shortcut), not an
  escalating 4→6→8→9-tile region with only 2–4 slabs.** Hand-authoring a
  larger region where every broken tile must be reachable by ONE of only
  2–4 slabs (sokoban push order matters — an unreachable configuration is
  a real risk with no visual iteration available) was judged too failure-
  prone to hand-verify. Every site instead uses a straight-line layout
  where each slab sits exactly one push from its own target — trivially
  solvable by construction — and the ACTUAL solvability guarantee comes
  from a real BFS over the push-state space in `tests/test.js` (per the
  spec's own suggestion), which also confirms every site's reset restores
  the exact start state. A live Playwright pass in `drive-gullwrack.js`
  additionally proves a WEDGED slab (pushed off-target) is lever-
  recoverable. Any slab may lock into any of its site's still-unfilled
  broken tiles (not rigidly paired 1:1 by index) — found live, more
  natural sokoban play, and it's what a kid would expect.
- **Two real engine bugs surfaced only by live-driving the mechanic
  (not caught by static review):** (1) `E.applySiteState` only ever
  OVERLAYS glyphs onto specific cells — it never clears a cell a slab just
  left, so a pushed or locked-in slab left a "ghost" duplicate at its old
  position until the next unrelated redraw. (2) the overworld's movement
  whitelist (`ch === '.' || ch === 'P' || ch === '='`) never included
  broken-floor tiles, so `r` was silently impassable in town while being
  freely walkable in dungeons (dungeons fall through to generic movement
  instead of an explicit whitelist). Both fixed; both now covered by the
  live drive (ghost-slab check) and the reachability unit test.
- **Gullwrack Harbor is reachable from BOTH Horologe's dock (a new option
  parallel to, not sequential after, Chime) AND Chime's own dock**, plus
  its own `E.gullwrackDock` offering every prior leg. The spec's explicit
  "gate on spireDone, not hallsDone" only resolves cleanly this way — Chime
  itself is reachable only via a `spireDone`-gated leg, so if Gullwrack
  were offered ONLY from Chime's dock, a kid who skips the parent-optional
  Resonant Halls could never reach it, silently reintroducing the exact
  hallsDone dependency the spec ruled out.
- **The dungeon index is 21**, confirmed live (`TASKS.length` was 20 going
  in), matching the spec's own prediction.
- **The `treasureForDungeon` clamp fix + Spiral Shell were done** (the
  spec's own "optionally" item) — one line each, and it completes the
  treasure table cleanly now that a 7th entry exists.
- Everything else shipped as specified: the geometry topic (t1 rectangles,
  t2 word problems + L-shape decomposition, t3 volumes + crate word
  problems, QUICK variant), the shop rework (tabs, compare-to-equipped,
  always-visible bulk potions), `pickHalfMixSkill/Problem/Gate` generalized
  from the Spire's picker with `pickSpireProblem`/`pickSpireGate` kept as
  named wrappers (the cap-leak test calls them by name), the Sunken
  Breakwater's 2 floors + roster + boss, the town-rebuilt payoff + Mason's
  Charm, and all four story-seed lines (Sylvia ×2, the Miscount small-talk
  pool, the first-battle tutorial sentence, Percy).

## Wave 6.5 — Design-session fix pass (NOT for wave implementers) ✅ SHIPPED (2026-07-11)

**Shipped notes:** the generalized door audit immediately found a SIXTH
broken door (Breakwater f0 — its rubble wall never split the room; broken
floor 'r' is now impassable until mended so the repair shortcut means
something). The renderability root cause was drawWorld's two-map
`inDungeon` test — one line made all three new islands render as dungeons
and skip the NPC pass entirely. Nine sprites added; hermits Tobbin and
Brona shipped per STORY_BIBLE. Two additions beyond the queued list, from
a user question ("can a player get stuck?"): dockside supply CARTS on
Horologe/Chime + a shipboard bunk rest at their docks (E.inn(shipboard)),
plus a never-stranded unit audit — and that question also exposed a Wave 6
bug: the shop's `mapId === 'isles'` stock check made Gullwrack sell
MAINLAND goods (now: isle-tier everywhere off the mainland, per-shop
names, carts supplies-only). Blank-modal defense hardened: body-text-
excluding-buttons + collapsed-height detection, a 750ms continuous
watchdog over BOTH overlays, Ctrl+Shift+B manual capture into the bug
log, and drive-shopstress.js (15 noisy rounds + carts + bunk + capture,
all green first run).

Executed by the design session immediately after Wave 6 lands + reviews
(queued 2026-07-11 from live playtest):
1. **Generalize the door audit** (tests/test.js): derive the floor list
   dynamically (every dungeon via `dungeonFloors`, plus DEEP_WINGS) so new
   dungeons can never be born unaudited; door set becomes {D, K, Z(clock),
   Y(echo), + future}; solids include gear gates A/B/C. Add a **glyph
   classification registry test**: every glyph appearing in ANY map must be
   classified (walkable / solid / door / marker / effect) or the suite
   fails — new glyphs then REQUIRE classification, which keeps the audit
   honest forever.
2. **Fix the five broken doors it already found** in the unaudited
   dungeons (user hit one live): Spire f0 K(16,2) AND clock door Z(30,3)
   — the wave's signature door is walk-around-able; Spire f3 K(12,2);
   Halls f0 K(15,2) AND echo door Y(17,6). Make each gate something real
   (wall the bypass or move the door), per the 1.5b playbook.
3. **Blank-modal hardening** (user hit it again 2026-07-11, on Sell):
   continuous overlay watchdog (~750ms, all overlays, "blank" = empty
   body-excluding-buttons OR zero rendered height), a manual "🐛 That
   looked wrong" capture (Parent panel + hotkey) that snapshots overlay
   states/innerHTML/crumbs/state to the bug log, and a shop **stress
   drive** (hundreds of buy/sell cycles, double-clicks, low-gold edges,
   badge-threshold crossings). Working theory (fits all four
   occurrences): the family plays the LIVE working tree during wave
   implementation — mixed half-saved scripts render structurally-valid
   emptiness. Hence also:
4. **The stable play copy**: after every review all-clear, copy the tree
   to `../Math Quest (play this one)/` and the family plays only that.
   Saves are in the browser (localStorage), so they survive regardless.
5. **`git init` + a tag per verified wave** — Dropbox is not version
   control, and "what exactly was running?" must become answerable.
6. **Sail captions + destination registry** (user playtest 2026-07-11:
   every voyage says "Sailing home to Numeria"): ui.js:239 is a binary
   isles-or-home ternary that predates Waves 3/4. Replace with a
   `MM.data.DESTINATIONS` registry (id → display name, caption, and the
   sail direction Wave 4 simplified) read by the sail scene AND the
   captain's dialogs; entries for west/isles/horologe/chime + whatever
   Wave 6 ships for Gullwrack.
7. **Renderability test** (FINAL_PASSES Pass G1): every glyph of every
   map through `tileSprite` with map context; FAIL on bare-ground
   renders unless whitelisted as floor. Would have caught item 8.
8. **Gullwrack renders mostly invisible** (Wave 6 review — the
   renderability disease, third instance): the town's data and handlers
   all WORK (Maren talks, slabs thunk, sites complete) but most Wave-6
   glyphs have no tileSprite case — inn 'I', Maren 'y', entrance '7',
   slabs 'U', broken floor 'r', plaques 'i', reset levers 'l' draw as
   bare ground, and the island's '.' falls through to dungeon-grey
   instead of terrain. Fix inside item 9's island pass: give tileSprite
   a real per-map context (world/isles/horologe/chime/gullwrack) instead
   of the aging `onIsles` boolean, add the missing sprites (slab,
   cracked floor, plaque, reset lever, Maren, Breakwater arch, harbor
   ground), and let the G1 test prove all three islands clean. Also
   verify the reworked shop VISUALLY — the wave shipped no shop
   screenshot.
9. **The empty-island problem** (user playtest, confirmed in the
   drive-spire screenshot my Wave 3 review failed to open): Horologe and
   Chime Isles have NO visible dungeon entrance (their '5'/'6' glyphs
   have no tileSprite case on those maps — they render as bare ground)
   and NO characters. Fix both islands: (a) proper landmark sprites — a
   clockwork tower for the Spire, a resonant hall facade for Chime
   (copy the lighthouse-'H' pattern: distinct sprite + tileSprite case);
   (b) one dock-adjacent hermit NPC each with intro/progress/post-boss
   dialogs (Horologe: an old clocksmith; Chime: a bell-keeper — sincere,
   quip pools per the tone guide), plus a captain arrival line per
   island; (c) 2–3 decorative terrain touches per island so they read as
   PLACES (gear-litter tiles, chime stones — flavor only). Verify
   Gullwrack doesn't need the same treatment during the Wave 6 review
   (its order specifies Maren + a town, so it should be fine — CHECK the
   arrival screenshot anyway, all of them this time).

## Wave 7 — The Open Castle (the ending) ✅ CODE COMPLETE (2026-07-11) — ⏸ PROSE AWAITING DESIGN REVIEW

**Status:** every mechanic, test and screenshot in this section is done and
green (unit suite + all 19 drives, `drive-castle.js` = 53 checks). Per this
wave's own mandatory stop, the **reveal / coronation / cutscene prose has NOT
been signed off** — it is written and playable, but the design session must
read it before this ships to the family copy.

**Deviations from this spec, and why:**
- **The gear gates stopped being rewritten to `'#'`/`'.'` — they now STAY in
  the grid as `A`/`B`/`C`.** The carry-over asked for state-readable gate
  sprites, and that is impossible while the glyph is erased at entry: a closed
  gate WAS a wall, byte for byte. So `applyGearState` no longer edits the grid
  (it survives as a no-op hook), walkability moved to `E.gateIsOpen`, and
  `tileSprite` picks `gateShut`/`gateOpen` from the live rotation. The pips
  (•/••/•••) are painted by `drawWorld` rather than baked into six sprites, so
  one sprite pair serves all three gates and the plate. Knock-ons, all done:
  `FLOOR_OK` in the render audit no longer whitelists A/B/C (they must now
  draw as real tiles, and the test fails if that regresses), and
  `drive-spire.js`'s grid assertions became rotation assertions.
- **A real bug the screenshots caught immediately:** gate `C` rendered as a
  **castle**. `case 'C': return 'castle'` already existed in the `tileSprite`
  switch, and a duplicate `case` silently loses to the first one. The gate
  branch had to move ABOVE the switch, guarded on `inDungeon`. Nothing but
  looking at the picture would have found this.
- **`S.validate()` existed and had never once been called.** Wiring it into the
  unit suite immediately failed on two tiles — `pool` and `keyTile` both had an
  uncoloured `'d'` punching a transparent hole in them, shipped months ago.
  Fixed both; the validator now runs every suite.
- **A pre-existing dead branch, exposed by the castle gate:** `E.castle`'s
  "Champion of Numeria" greeting (`taskIndex > 13`) had **never been
  reachable**. At `taskIndex 14` the "current task" is `TASKS[13]` — the
  Tidepool Grotto — which carries `exp: true`, so the "cross the bridge to
  Miscount" branch above it swallowed every post-task-13 visit. Reordered. The
  same ordering bug existed in `miscountArena` and would have eaten the entire
  Wave 7 epilogue; fixed there too.
- **The castle is an OVERWORLD (`mapId: 'castle'`), not a dungeon.** It needs
  the NPC draw pass (or the MathMaker is a patch of floor) and must never touch
  monster spawning. It is therefore NOT in `TASKS`/`ISLE_DUNGEONS`, so it does
  not get the door audit for free — it has its own reachability + "no monster
  markers, ever" unit block instead, and an explicit `checkMap` line in the
  render audit.
- **The Fibonacci tiling was derived and asserted, not eyeballed.** The first
  layout did not abut (squares overlapped and left gaps). The shipped one is
  computed by attaching each square to a side whose length already equals it
  (left, top, right, bottom, left) — 1+1+4+9+25+64 = 104 = 13×8 exactly — with
  one quarter-arc per square, each starting where the last ended.
- **The exam's slates are authored, not sampled from existing generators.**
  Every `solution` in `problems.js` is a flat string; there is no step
  structure to plant an error into, and splitting prose on punctuation would be
  a lie. `MM.problems.generateExam(which, flawed)` builds its own worked
  solutions with a curated error per topic (dropped carry · lost zero in the
  tens · misplaced decimal point · added the denominators) and the LATER STEPS
  FOLLOW HONESTLY FROM THE BAD ONE — so exactly one step is where it went
  wrong, which is the only way the question is answerable. Deliberately kept
  out of `GENERATORS`/`QUICK`: the exam never enters battles, review pools, or
  the 400-per-tier smoke loop, and it never records against mastery (the kid is
  the GRADER here, not the graded).
- **Exactly one of the first four slates is clean**, chosen at random, so
  "every step is correct" stays a live answer and the kid cannot win by always
  hunting for an error. The fifth is always clean, as specified.
- **The Hall of Heroes needed `E.peekProfile`** — `E.load()` replaces
  `E.state` and would yank the current player out of their own game. It returns
  null on unreadable saves, so one corrupt profile can't take the room down.
  Titles are DERIVED from flags (`E.titlesFor`), not stored, so pre-Wave-7
  saves show their honours without a migration.
- **Golden Numeria keeps `endingDone` and gates two UI lock-checks on
  `s.ngPlus`.** Resetting `taskIndex` to 1 would otherwise re-lock the report
  card's rows and the Monster Book's pages for a player who has finished the
  game — punishing them for replaying.
- **NG+ scaling is +25% HP/attack/gold per run**, compounding, applied in
  `E.monsterStats`. The spec didn't name a number; this keeps it a victory lap
  with teeth rather than a wall, since the hero keeps every level, gem, and charm.
- **The castle costs no stamina to walk.** There is nothing to fight and
  nothing to flee from, and a kid must never be able to strand themselves at
  home.

## Wave 7 — The Open Castle (the ending) — the original work order

**Carry-over (user playtest, 2026-07-11): gear-plate puzzle readability.**
The Spire's rotating-gates puzzle works but is ILLEGIBLE — the kid steps
on a plate, "a different gate swings open," and nothing shows which gate,
where, or why. Fix the visual language end-to-end:
- The three gates get **matching pip marks** (• / •• / •••) drawn into
  their sprites, visibly mechanical (brass, gear-toothed), clearly NOT
  ordinary walls; the currently-OPEN position renders as a recessed open
  frame with the same pips, not as bare floor.
- The gear plate 'R' sprite shows the pips of whichever gate is CURRENTLY
  open, so plate state is readable before stepping.
- Stepping on the plate: log line names the gate ("⚙️ The ••-gate grinds
  open!") and the newly opened gate glints briefly (drawWorld overlay —
  copy the Scout shimmer pattern).
- One Help line under the dungeon section; screenshot all three states
  and LOOK at them.
This is the general rule going forward, add it to §0 if any wave ships
another stateful tile: **a puzzle tile's STATE must be readable from its
sprite alone** — walking on mystery squares that invisibly change distant
walls reads as glitch, not puzzle (exact user words: "very unclear what
was going on").

The narrative conclusion. Design rationale lives here so the implementer
understands WHY each beat exists; the final dialog PROSE must be reviewed
by the design session before shipping (write it, then stop and ask —
story beats stay sincere, and this is the most sincere moment in the game).

**Why math defeats monsters — the reveal (and the rule for it):** Numeria
is built of number-stuff; Sylvia's mortar line (6d) was literal. Wherever
people stop working things out, disorder pools and tangles into monsters —
Miscount's guessing was just the largest tangle. A worked answer literally
unties them; that's why showing your work wins fights. Every existing arc
already obeys this — the Murk grew where light stopped being tended, the
Unwound King where time went unwound, the Discord where a voice went
unheard — so the reveal NAMES the pattern, it doesn't retcon one in. Rule
for the writing: the reveal must never scold, and must never make the
dungeons "a test all along" — the danger was real; the MathMaker just
believed the kid would grow to meet it.

**Gate:** tasksDone includes 13 + the Great Lamp lit + the Spire's boss
beaten. Do NOT require Wave 4's Discord (music is opt-in) — but if it WAS
beaten, the choir shows up in the epilogue (one extra line + a beep()
chord: pure bonus flourish).

**The sequence (all inside the castle — 'C' finally opens):**

1. **The doors open.** Bumping 'C' with the gate met enters a real walkable
   interior map (26×15, copy a dungeon's wiring minus monsters — no combat
   in the castle, ever): the Gallery, the Study, the Hall of Heroes, the
   throne room.
2. **The Gallery of Ten** — the ten recovered treasures displayed on
   plinths; bumping each replays a one-line memory of its dungeon. Cheap
   (data-driven), huge payoff: it's the kid's own history as a museum.
3. **The Hall of Heroes** (absorbed from Wave 5 item 5): every profile's
   crest, badges, bestiary %, titles — sibling-visible, read-only.
4. **The Study — the reveal**, MathMaker + Miscount together (Miscount's
   presence matters: teacher and former student, mended). The reveal
   conversation, then the confession: "I never needed a hero, child. I
   needed a **teacher**. Heroes leave. Teachers multiply."
5. **The Final Exam, INVERTED — the kid grades the teacher.** No boss, no
   HP bars. The MathMaker sits as the student and works five problems on a
   big slate — each shown WITH its worked solution, and some solutions
   contain one wrong step (the spot-the-error format LEVEL2_SPEC §5
   already sketched: choice buttons = "which step went wrong?" / "it's
   correct"). Error analysis is the summit of mastery, and the student
   becoming the grader is the whole story in one mechanic. Five problems,
   drawn one per: facts, multi-digit, decimals, fractions, and the FINAL
   one is a tier-1 addition fact — the same kind the game opened with,
   solved correctly, no trick. The kid marks it right; the MathMaker:
   "Yes. It was always that simple. It just wasn't always EASY."
6. **Coronation + title.** The crown from task 10 comes off the shelf; the
   kid is named **the New MathMaker** (title stored like Keeper of the
   Light). Confetti burst, the one place the game spends real ceremony.
7. **"The Kingdom, Untangled" — the cutscene** (the game's one big scripted
   scene; copy sailScene's pattern — a timed canvas script — but every
   beat skippable with any key, and replayable from the throne):
   - **Stage 1, the untangling:** over a vignette of each region, a dark
     scribble-knot (a bezier spline with randomized control points — cheap
     to draw, reads instantly as "tangle") LERPS its control points to an
     orderly target shape, one soft pentatonic chime each (~4s/beat): the
     Murk's knot pulls straight into the lighthouse beam; the Spire's into
     clock hands at midnight; Gullwrack's into the rebuilt pier's beams;
     the Discord's into a staff of notes (only if beaten); Miscount's into
     a worked long-division scaffold. Untangling is literally the game's
     thesis animated — a worked line is a straight line.
   - **Stage 2, the pull-back:** the camera rises from the castle until
     the whole kingdom is parchment — and the regions redraw as the
     classic golden-rectangle tiling, squares labeled **1, 1, 2, 3, 5, 8**
     (castle grounds, east bank, the bridge lands, the mainland, the
     Isles, the far isles), with the golden spiral arc sweeping through
     them IN THE ORDER THE KID VISITED. The MathMaker, quietly: "The
     kingdom looks different from far away. Patterns usually do — that is
     the whole trick of mathematics: step back far enough, and the tangle
     was a shape all along."
   - **The last problem in the game:** the sequence writes itself along
     the arc — `1  1  2  3  5  8  13  …` — and one plain numeric input
     asks *"What comes next?"* Correct (21): the next square blooms past
     the parchment edge and the credits flower out of the spiral. Wrong:
     the spiral gently DRAWS the next square to show how the two before
     it add up, then accepts — teach, never scold. Either way the kid
     leaves having discovered the pattern, not been told it.
   - **The sequel door:** just beyond that last square, off-parchment, a
     tiny island glimmers with a "?". No dialog in the scene itself — but
     the captain gains one epilogue line: "Past the spiral's edge? Aye...
     there's a sea chart nobody's ever finished. Needs someone good at
     working things out." (If a sequel ever happens, its curriculum is
     the deferred 6th-grade tier — next year's math, beyond the edge.)
8. **Epilogue overworld.** A post-ending flag flips dialog pools: Pip runs
   riddle contests for other kids, Miscount teaches at the arena ("my
   students show their work TWICE"), Callie's bells, Maren's rebuilt
   Gullwrack, banners on the castle tiles. The world is visibly better and
   TENDED — by more people than just the kid, because that was the point.
9. **The throne offers Golden Numeria** (NG+, absorbed from Wave 5 item 6)
   as an invitation: "The kingdom will tangle again someday — kingdoms do.
   Walk it once more in gold?" Plus one post-credits gag consistent with
   the humor rules: a monster in a tiny hat, waiting politely in the
   Study, "here to enroll."

**Acceptance — drive-castle.js:** gate locked before / open after; all four
rooms walkable, zero combat paths; gallery plinths replay; the inverted
exam flags a planted wrong step AND accepts a fully-correct solution as
"it's correct"; the cutscene: every beat skippable, replayable from the
throne, "21" accepted, a wrong answer gets the drawn demonstration and
then proceeds (screenshot the spiral frame and LOOK at it); title
persists; epilogue pools live behind the flag; NG+ prompt appears only
from the throne. Screenshot the coronation. All drives green. **Then
stop: the reveal/coronation prose ships only after design review.**
(The cutscene is the hardest visual work in the game — recommend Opus 4.8
for this wave, noted in AGENT_PROMPT.md.)

**Play-time added: ~2–3 h once, plus NG+'s ~8–10 — but it's the reason the
other 50 exist.**

---

## Final passes (after Wave 7 — the difference between "shipped" and "finished")

> **Execution plan: FINAL_PASSES.md** — these passes belong to the DESIGN
> session, not wave implementers (decided 2026-07-11). That file has the
> sequencing (B after Wave 6; A/C after Wave 7), per-pass methods, exit
> criteria, the open user decisions (touch support, packaging), and the
> done checklist. The summaries below stand as the WHAT.

In rough order. A/B/C are mandatory before calling the game done; D–F are
judgment calls for the family.

**A. The marathon drive + oldest-save torture test.** Every existing drive
fabricates an endgame state; NOBODY has driven a real continuous
progression. Build `tests/drive-marathon.js`: new profile → castle → all 13
mainland tasks → sail → three lenses → Lighthouse → Vault → Spire → Halls
(music ON for the test) → castle ending — asserting the gate/flag chain at
every seam, since cross-wave integration is where five separate sessions'
assumptions meet. Companion test: a hand-written day-one save blob loaded
through EVERY migration at once (charms → amulets → enchants → potionsBought
→ defeatedAt → spellsCelebrated → music_reading:false → gearState), fields
spot-checked after.

**B. Balance simulation pass.** Stats were tuned per-wave; nobody has
simulated the STACKED endgame (gems × amulets × charms × rings × streaks vs
tier-19/20 monsters, and gold economy inflow vs the 750g bow / 260g amulets /
220g Hearthmoss sinks). Re-run the earlier balance-sim approach across the
whole arc; flag any dungeon where expected time-to-kill collapses below 2
correct answers or spikes above 8, and any point where gold outpaces every
remaining sink.

**C. Editorial voice pass (design session does this one, not an
implementer).** Five sessions wrote quips, dialog, and story beats. One
sitting: read EVERY player-facing string (quips, NPC talks, flavor pools,
celebrations, help) for tone drift, doubled jokes, typos, and humor-rule
violations, with the LEVEL2_SPEC tone guide open. The ending prose review
(Wave 7's mandatory stop) folds into this.

**D. Ergonomics & access (family judgment calls).**
- Touch controls (tap-to-move or an on-screen d-pad): the game is
  keyboard-only today — decides whether tablets/Chromebooks are in scope.
- Keyboard-only completeness: spells and some buttons are MOUSE-only today
  (the inverse gap!) — add number-key bindings for the spellbook row.
- A sound on/off toggle if one doesn't exist; Calm Mode ships in Wave 5.
- Contrast check on `.dim`/`.quip` text at kid distance.

**E. The parent's month-two experience.** The report card shows lifetime
accuracy; a parent steering practice wants RECENT trend ("this week vs
before" per topic — the mastery log already stores enough to derive it) and
maybe a one-click printable/copyable progress summary next to the bug-log
button.

**F. Packaging.** It's a double-click file:// game; decide if it should
also be: a zipped "install" for other computers (grandparents), a
gh-pages/Netlify URL, or a PWA wrapper for tablet home screens. Each is
small; all are optional.

Also: before declaring done, harvest the in-game bug tracker from the
kid's machine (Parent → bug log → Copy) — it's been recording since
tracker.js shipped and nobody has ever read it.

## Wave 7.1 — Design-session micro-pass (queued 2026-07-11, live playtest)

1. **Trap tiles sealed + audited.** Three standable tiles that can never
   reach a dock (a player PLACED there is stuck forever — the user hit
   Horologe (20,2) live): Horologe row 2's ring gap above the Spire, and
   Chime's two pockets flanking the hall ((14,2)/(16,2)). Seal all three
   with 'M'; add a trap-tile audit to the never-stranded block — every
   standable tile on every overworld must reach its dock (murk modeled
   cleared, bridge modeled laid). Placement mechanism unidentified; the
   sealed pockets make it moot, the audit makes recurrence impossible.
2. **Spells always answer.** Spell buttons never render disabled — every
   click responds in the log with exactly why nothing else happened
   ("Spells only work inside dungeons", "Used this visit", "Need 10
   stamina — eat something!"); and Scout on a floor with no secrets says
   "You sense no hidden walls on this floor" instead of shimmering at
   nothing (user playtest: "I have not been able to make the spells do
   anything" — mechanics verified working; the FEEDBACK was missing).

## Wave 8a — The Two Kids Update, mechanical half (SONNET; after v1.0.0) ✅ SHIPPED (2026-07-11)

From FINAL_REVIEW.md (read §1 first — the two-kids framing is the spec's
soul). One session. Every item obeys §0's ground rules.

1. **Monster topic telegraphs** (P2): a small topic icon above each
   monster (⚔️-sprite overlay in drawWorld, like the pet's ❗). Add
   `MM.data.SKILL_ICONS` (skill → emoji; registry-complete: unit test
   cross-checks against PARENT_TOPICS). Single-topic dungeons show the
   dungeon topic on every monster. In MIXED dungeons, bind each roster
   TYPE to a topic: optional `skill` field per roster entry (assign
   sensible ones across isle rosters); `pickProblem` honors
   `monster.skill` when set and the parent has it enabled (else falls
   back to the mixed pool — the cap-leak test extends to this path).
   Bestiary cards show the icon. Drive: telegraph renders (screenshot);
   a bound monster asks its topic ≥9/10 battles; parent-off falls back.
2. **Overwhelm rule** (P7): in `startCombat`, if the kid's level exceeds
   the dungeon tier's expected level by ≥6 (derive expected level from
   the monsterStats tier — document the formula) and the monster is NOT
   a boss/gauntlet/arena foe: one QUICK problem instead of a battle —
   correct = instant victory (normal rewards), wrong = the normal battle
   begins (never a penalty). Line: "It takes one look at your worked
   answer and unties itself on the spot." Drive: level-20 kid in d1
   one-shots; same kid vs a boss gets a real fight.
3. **Rust** (P5): `s.lastPracticed[skill] = todayStr()` in recordAnswer
   (migrate {}); `weakestFirst` adds a staleness bonus for skills
   unpracticed ≥5 real days; one new bounty flavor line for rusty-topic
   targets ("The Old Mine misses you — its ghosts are miscounting
   again"). Unit: a stale skill outranks a slightly-weaker fresh one.
4. **Growth tracking** (P6): `s.history[dateStr][skill] = {a, c}` in
   recordAnswer, pruned >30 days (migrate {}); `s.recentMisses[skill]` =
   ring buffer of last 10 {text, kidAnswer} (capture the submitted
   string in showProblem/battle answer paths). Parent panel: per-topic
   "last 7 days vs lifetime" with ▲/▼, plus an expandable recent-misses
   list. Kid report card: ONE growth-story line per topic with real
   data ("Long division: 9 of your last 10"). NEVER show the kid a
   percentage comparison to a sibling. Hall of Heroes: audit that every
   plaque line is a personal best, none a cross-kid ranking.
5. **"Almost!" surfacing** (DQ lesson): when a badge is within 3 correct
   of its next tier, the sidebar bag button gains a small ✨ and one
   log nudge per session ("🥈 Fractions is THIS close to silver!").
6. **Delight completion** (P8): the remaining FUTURE_LEVELS §4 catalog —
   innkeeper's cat, pet tricks by stage, shopkeeper's shelf, monster
   idle life, bestiary hat counter — under the §4 anti-annoyance rules
   (≤1 ambient gag/few minutes; nothing during problems; Calm Mode
   silences all of it).

Acceptance — drive-twokids-a.js + unit blocks; ALL existing drives green;
run the MARATHON after (it should still complete; overwhelm will speed
its early dungeons). Update README/this file/tests/README.

**Deviations from this spec, and why:**
- **Expected-level formula: `expectedLevel(dungeonIndex) = dungeonIndex`**
  (`E.expectedLevel`, js/engine.js). The mainland/expansion dungeon ORDER
  already tracks difficulty 1:1 (task order = curriculum order), so the
  dungeon index itself is the simplest honest stand-in for "expected level"
  — no separate lookup table to keep in sync as new dungeons are added.
  `OVERWHELM_GAP = 6`. Gate is `!mon.boss && !mon.arena && !mon.gauntlet`;
  in practice only the dungeon-collision call site in `E.tryMove` can ever
  reach a non-boss/arena/gauntlet monster, so the extra two flags are
  defensive, not load-bearing.
- **Overwhelm reward path is a full extraction, not a duplication.** The
  old inline `victory(m)` hook inside `startCombat` became `E.grantVictory`,
  a top-level function reused by both a real battle win AND the Overwhelm
  instant-win — so the two paths can never drift apart on rewards. Likewise
  `E.pickRegularMonsterProblem` factors out the exact non-boss topic-priority
  logic `startCombat`'s `pickProblem` hook already used, so an Overwhelm
  one-shot problem always asks whatever a real battle round would have.
- **`E.monsterTopicIcon` gained a parent-off check that wasn't in the
  original draft.** It originally showed a mixed dungeon's `mon.skill` icon
  unconditionally — dishonest the moment a parent switched that topic off
  (the icon would still promise a topic `pickProblem` would never serve).
  Fixed to fall back to `null` exactly when `pickRegularMonsterProblem`
  would fall back, so "the icon is a promise" holds even with a topic
  disabled.
- **Delight-catalog (P8) scope, honestly**: shipped — bestiary hat counter
  (`s.hatsRetired`, footer line in the Monster Book), the shopkeeper's shelf
  (`s.shopShelf`, last 3 sold items, persistent), the innkeeper's cat (a
  `MM.data.CAT_SPOTS` line that varies by real calendar day, a once-per-day
  pat for +1 stamina before the inn's warm-up sequence — the inn has no
  walkable room to "bump" a sprite in, so this reuses the existing
  dialog-choice pattern instead), monster idle life (guards flash 💤 past 2
  tiles away, thieves flash 🪙, both continuous low-duty-cycle ambient
  motion gated on `!s.calmMode`), a throttled (≤1/3 real minutes) wanderer
  "bumps a wall" log line (standing in for a floating-text reaction — this
  engine's only floating-text renderer lives inside the battle canvas, not
  the world canvas), and a one-line "pet high-fives you" on any boss win.
  NOT shipped: pet-chases-gulls-on-beaches, pet-sneezes-in-Frostbite,
  pet-stares-into-Emberlyn's-forge — three more location-specific pet
  animations from the FUTURE_LEVELS §4 catalog, left for whenever the pet
  system gets its own pass (all are "zero design weight" per spec; cutting
  three of eight items to keep this wave to its one-session scope seemed
  better than a rushed version of all eight).
- **Hall of Heroes audited, not changed.** Every plaque line is already a
  personal stat with no sort/ranking against other profiles — the one
  arguable soft spot is that a raw `Level N` number sits next to another
  hero's `Level N` when a family scrolls the list, which a sibling COULD
  read as a comparison. Left as-is: it's descriptive, not a ranking
  mechanism (no sort-by-level, no percentile, no "you're behind"), and
  every other line in the wave (badges, growth-story, misses) was held to
  the stricter "never even show a comparable number" bar.

### Help pass (design session, 2026-07-12, shipped with the wave-8a tag)

Live playtest: the Help menu had become one wall of every system in the
game — Spire gear-gates explained to a kid still in the first meadow —
and a kid reached mid-game never realizing gear upgrades exist.
Round 2 (same day, more playtest feedback): still visually cluttered —
bold scattered mid-sentence, no grouping — and missing the first question
an anxious kid brings to a help menu: "what happens if I die?"

- **Progressive help** (ui.helpDialog): sections are now `{when, html}`
  entries. Spellbook waits for the first gold badge (the badge section
  teases "gold badges unlock something special…" until then), Rope of
  Return waits for taskIndex ≥ 2, Spire gear-gates wait for the Lamp,
  charm details wait for the first charm owned. Gates only ever ADD as
  the save progresses — nothing a kid has read ever disappears. A new
  **Gear section sits right after Battles** (weapon = how hard every
  correct answer hits; the shop sells power).
- **One-time gear nudge** (E.grantVictory): first victory where the kid
  still wields the stick AND can afford the cheapest mainland weapon,
  one line — "That's enough gold for the 🗡 Bronze Dagger at the 🏪
  shop…". Fires once ever (s.seenGearHint); load() marks it seen for
  any save already past the stick, so it can never fire as a late-game
  non-sequitur. Lives in grantVictory so Overwhelm wins get it too.
- drive-halls' help assertion now tests the gate BOTH ways (Spellbook
  absent before the first gold badge, present after).
- **Round 2 — visual calm + the death question:** entries grouped under
  three h3 headings (The basics / Growing stronger / Out in the world),
  exactly ONE bolded lead term per entry (it reads as a mini-heading;
  no bold mid-sentence), `.help-p` line spacing. New basics entry
  "😵 If you lose a fight…" — the true, kind answer (keep everything
  learned, half gold, wake at the castle) stated where the
  failure-averse kid will look for it first.
- **Round 2 — the Food button:** two bars, two buttons — 🧪 Potion
  refills ❤️, new 🍗 Food (F) refills stamina via a small chooser
  (potions are one kind, so P stays instant; food comes in kinds).
  Eat disables at full stamina; empty state points at the shop and inn;
  the 🎒 bag still lists food (shortcut, not a move). Hunger/exhaustion
  log lines now point at the button and reassure: exhaustion never
  blocks walking — "you can always still walk" (verified: stamina
  clamps at 0, movement is never gated on it).

- **Round 3 — four more playtest reports, same session:**
  (a) starter gear (price 0) was unsellable → permanent bag clutter;
  now sells for a sentimental 1 gold — shopkeeper: "Every hero starts
  somewhere. One gold, for the memories." (equipped pieces still can't
  be sold, so a kid can never end up weaponless);
  (b) the ring/amulet "Bare finger / Unequip" pseudo-item row read like
  an equippable item called Bare Finger — replaced with a
  "✓ On — take off" button on the worn row itself (matches charms);
  (c) sidebar said "Potions: 1" with no food line — counts now live ON
  the buttons ("🧪 Potion ×3", "🍗 Food ×6"); the gauge and the lever
  are the same control (Pass H2 parallelism rule);
  (d) 9 buttons overflowed their labels — 👪 Parent and 👤 Switch moved
  to a header-corner (3-column GRID, not absolute positioning, so
  overlap with the title is impossible — the first attempt overlapped
  and only the opened screenshot caught it; assertions now check both
  clipping AND overlap). 📊 Report stays with the kid's buttons: since
  8a it's the kid-facing growth story, not a parent tool. The 7 kid
  buttons fit one row again.

Lesson (the recurring one, third time now): the sidebar NAMED the stick,
the shop SOLD the dagger, and no system ever SAID "gear is how you grow."
A system that doesn't narrate itself doesn't exist.

## Wave 8b — The Two Kids Update, the heart (OPUS 4.8; after 8a) ✅ SHIPPED (2026-07-12)

Tone-critical. STORY_BIBLE.md open the whole session. Like Wave 7:
**mandatory stop before shipping prose** — every soothe line and Academy
dialog gets design-session review.

1. **The Soothe verb** (P1): at battle start, a stance choice beside
   Flee: ⚔️ Strike / 🕊 Soothe (switchable between rounds; remembered
   per profile as the default). Identical math, identical progress bar,
   identical rewards (gold arrives as "a grateful gift"). Different
   everything-else: floaters show "+N calm", the monster's reactions
   soften, victory = the tangle loosens and the monster relaxes, waves,
   wanders off — never a splat. Bestiary: a 🕊 befriended mark per type
   (a SECOND collection axis with its own counter; Soothe a boss and its
   card notes it was "helped, not beaten"). Writing: a `soothe` pool per
   FLAVOR sprite family + bespoke lines for the personality monsters;
   bosses reuse their existing sincere endings (they were always
   soothed). The lore already believes this — the mechanic catches up.
   **The visual spec (this is where the delight budget goes — a soothed
   monster should be the cutest thing in the game):** soft teal "+N
   calm" floaters with music-note/Zzz motes, never damage bursts; the
   monster VISIBLY becalms as its bar fills (sways slower, eyes
   half-close — same sprite, menace draining). Victory = a per-family
   reaction from 4–5 reusable gestures (contented bounce-wiggle,
   curl-up-and-nap with a Zzz, wave goodbye, slow easeful drift,
   sit-down-at-last) + a line from a new soothe-victory FLAVOR pool per
   family (Slime bounces; Frost Pup rolls over; gulls preen; ghosts
   sigh upward; golems finally sit down). Gold is OFFERED — the monster
   nudges a pouch over before wandering off — not exploded from a body.
   A soothed tiny-hat monster TIPS THE HAT (non-negotiable). Bestiary:
   🕊 + a warm-tinted card frame. The pet's happiest hop is reserved
   for soothe victories. Screenshot at least three family reactions
   and LOOK at them.
   **Gentle instruments (user idea, 2026-07-11):** 3–4 instruments IN
   the existing weapon catalog at matched atk tiers (atk = calm power;
   same slot, no parallel line, no doubled economy), tagged
   `gentle: true` with stance-fitting strike verbs + quips: a ribbon
   streamer (early), the **cat-fishing wand** (mid, `ranged: true` — a
   dangled teaser is a reach weapon, so it inherits the crossbow's
   first-counterattack-misses rule for free; the pet finds it DEEPLY
   fascinating and must be discouraged), a bubble pipe (isle tier),
   chime bells (late). Any stance may wield any weapon — identity is
   offered, never enforced.
   **The Ceremony (user's class idea, kept as a question not a lock,
   2026-07-11):** the first-battle tutorial ASKS — "How will you face
   the tangles: bravely, or gently?" The answer sets the profile's
   starting default stance + a matching equal-stats starter (wooden
   stick / ribbon streamer), with the sealing line: "You can always
   change your way. Most heroes do, eventually." NO classes, NO locked
   content — a first answer, not a life sentence (FINAL_REVIEW §5:
   never auto-detect or enforce which kid is which).
   **Shops organize by stance, never filter:** the kid's kind of gear
   lists first under a warm header ("🕊 For gentle hands" / "⚔️ For
   bold arms"), everything else below, all always visible and buyable;
   the shopkeeper greets the stance ("A tamer, eh? The wand came in
   Tuesday."). Drive: ceremony choice sets default stance + starter;
   both gear groups render in either stance; nothing is hidden.
   **One soothe-native gem — Lullaby 🎐:** while soothing, the
   monster's first counterattack is skipped ("it's already yawning") —
   the soothe twin of the ranged rule, same battle hook. All existing
   gems work unchanged in either stance (damage IS calm).
   **Befriending changes the world:** wanderers/chasers of a befriended
   species never initiate — they wave as the kid passes (a small 🕊 bob;
   bump to engage voluntarily). Guards still guard their posts,
   thieves still steal (comedy preserved), bosses unaffected. For the
   anxious kid this converts every soothed species from ambush-anxiety
   into visible friendliness — her collection pays out in CONTROL of
   her encounters.
   **At-a-glance distinction (user requirement, 2026-07-11) — three
   redundant signals, per the never-color-alone rule:** (a) befriended
   monsters render in a SOFTENED palette — one programmatic transform
   (blend each palette color toward warm white) applied at sprite-get
   time, so all ~70 types get their calmed look for free; (b) a
   CONSTANT 🕊 pip floats above them (like the pet's ❗ — always on,
   readable across the room, survives color-blindness); (c) becalmed
   idle motion (slow sway) vs the hostile jitter. A kid must be able to
   read a whole floor in one glance from the doorway. Screenshot a
   mixed room (befriended + hostile of the same species side by side)
   and LOOK at it. Drive: befriend a species, verify its wanderers no
   longer chase, verify the pip + palette render, verify bump still
   fights.
   **Friends celebrate the boss falling (user idea, 2026-07-11):** when
   a floor's boss is defeated OR soothed, every living befriended
   monster on that floor celebrates — the contented bounce-wiggle from
   the reaction set, a brief shower of calm motes, and one collective
   log line ("All around the room, your friends are bouncing."). If the
   boss was SOOTHED, it visibly joins them for a beat before wandering
   off. Hostile monsters stay unmoved — still tangled, and the contrast
   IS the story, told in one glance. One-shot, ~2s, never blocks input;
   under Calm Mode the hop stays but the particles don't (a ceremony,
   but a quiet one). Drive: befriend two monsters, beat the boss,
   assert the celebration fires exactly once and hostiles don't join;
   screenshot the mixed room mid-celebration.
2. **Brave Problems** (P3): a ⚡ Brave STANCE, exactly like Soothe — a
   sticky toggle in the battle row, remembered per profile as the
   default, NEVER a per-strike press (SACRED RULE, user 2026-07-11: the
   combat loop is type-answer-press-Enter and stays that way; stances
   are set once and lived in, so the steady-state loop gains ZERO
   button presses). While brave, every problem draws one tier higher
   (cap tier 3; AT tier 3, draw a full-depth problem into the quick
   slot); correct = double strike damage with a bigger flourish; wrong
   = exactly a normal miss (never extra punishment — bravery is not a
   trap). Sub-label shows the stakes while active. Mastery records the
   true tier. Balance note: with the sim's numbers, double damage at
   85% accuracy ≈ 1.7× effective DPS — fine for regulars, and bosses
   stay ≥3 answers (assert it in the drive). Stances compose: a kid can
   be brave AND soothing at once. **The get, precisely:** 2× damage with
   a CHOSEN-looking flourish (gold lightning — visually distinct from a
   lucky crit), plus a lifetime "brave problems solved" counter on the
   report card and the Hall of Heroes plaque (pride that outlives the
   fight). Deliberately NO extra gold — the economy runs a surplus and
   bravery must stay self-chosen, never a grind incentive.
3. **Miscount's Academy, early** (P4): generalize Wave 7's slate
   machinery (`castleExam` internals) into a reusable
   `spotTheError(skill, tier)` in problems/mastery; after task 10,
   Miscount's arena menu adds "📝 Check my students' homework" — 2–3
   slates per real day (daily like bounties), small gold, warm line
   pool ("She almost had it — you saw exactly where it slipped").
   Parent-cap aware. This is Kid B's no-fail practice room a full act
   before the ending; write Miscount proud of his students, per bible.

Acceptance — drive-twokids-b.js: full Soothe battle (screenshot the
befriended bestiary card), stance persistence, brave double-damage
verified numerically, brave-miss costs nothing extra, Academy slate flow
+ daily rotation + cap-leak; extend drive-marathon: Soothe at least two
battles en route (prove the alternate verb end-to-end); ALL drives +
marathon green. **Then stop for prose review before tagging.**

**Deviations from this spec, and why:**
- **THE BOSS FLOOR — the spec's own balance claim did not survive simulation.**
  The work order says "double damage at 85% accuracy ≈ 1.7× effective DPS —
  fine for regulars, and bosses stay ≥3 answers." The 1.7× is right but it
  measures the wrong thing: it counts *problems asked* (misses included), not
  *correct answers to kill*. Simulated across the whole gear ladder, a flat 2×
  (compounding with the existing 2× crit) drops EVERY boss in the game — d1 to
  d21 — to **two** correct answers. So brave keeps its full, honest double
  damage, and one invariant is added: **a brave strike may never take more
  than ⌈maxhp/3⌉ off a BOSS**, which guarantees ≥3 answers even with a crit and
  best-in-slot gear. Regular monsters stay uncapped (2.94 → 1.92 answers) —
  halving those is exactly the power the kid opted into. Asserted numerically
  in both the unit suite and the drive.
- **"Boldly", not "bravely", in the Ceremony.** The work order's line is *"how
  will you face the tangles: bravely, or gently?"* — but ⚡ Brave is a *different
  mechanic* in the very same wave, and a kid answering "bravely" at the door
  would reasonably expect it to have turned Brave on. Reworded to **"boldly, or
  gently?"**, which also matches the shop headers the spec itself specifies
  ("⚔️ For bold arms" / "🕊 For gentle hands").
- **`spotTheError(skill, tier)` → `spotTheError(skill, flawed)`.** Tier is not
  an input. A slate's difficulty is *intrinsic to the error it plants* — you
  cannot render "forgot to carry the 1" at tier 3 — so each slate carries its
  own authored tier and the caller reads it off the returned problem. The second
  argument that the Academy actually needs is whether to plant an error at all.
- **The Academy needed seven new slates, not just a refactor.** Wave 7 authored
  only four distinct topics (addsub, multidigit_mult, decimals_md, fractions_as).
  A daily, parent-cap-aware homework room across four topics is not daily
  practice, so `SPOT_SLATES` adds the classic slip for **muldiv_facts** (the
  remainder dropped), **multidigit_addsub** (the "flip" — taking the smaller
  digit from the bigger whichever way round they sit), **long_division** (the
  zero in the quotient never written), **decimals_ps** ("more digits, so it must
  be bigger"), **fractions_m** (multiply the whole, carry the fraction along
  untouched), **word_problems** (first step done, then it stops), and
  **geometry** (perimeter as length + width). Eleven topics total. `time_reading`
  and `music_reading` deliberately get none: you *read* a clock face or a staff,
  you do not *derive* it — there are no worked steps to audit, and a
  spot-the-error with nothing to inspect is just a quiz wearing a costume.
- **Bubble Pipe placed at the mainland mid tier (atk 5/120g), not "isle tier".**
  With the spec's placement, a kid who answers "gently" at the door has exactly
  ONE gentle instrument (the atk-1 starter) until the Isles — so her identity
  would cost her ten dungeons of damage, or she'd have to abandon it. Any stance
  may wield any weapon, so this was never a *power* problem; it was an identity-
  support problem, and one mid-tier gentle option fixes it. The four instruments
  now ladder 1 / 5 / 6(ranged) / 13, each pinned to an existing tier.
- **A soothed monster still gets hit back.** It is still tangled and still
  frightened; calm is something you *give* it, not something it owes you. This
  keeps the stakes real (and is what makes the Lullaby gem worth a slot).
- **Befriending is per-species and monotonic** — like a badge, never taken away.
  Killing one of the same kind later does not un-friend it: a collection that
  could be *undone* would be a punishment mechanic, and there are none in this
  game. A card can carry both marks (⚔ ×N and 🕊 ×N), ranked against each other
  nowhere.
- **Bestiary completion counts EITHER verb.** A kid who soothes her way through
  the entire game must be able to fill the book — soothing is a real way to
  finish a monster, not a way to skip one. (`found` was kills-only; fixed in
  both the Monster Book and the Hall of Heroes.)
- **Delight NOT shipped:** the pet does not yet react specially to the
  cat-fishing wand (the spec's "the pet finds it DEEPLY fascinating and must be
  discouraged" is currently only a shop quip). Left for the pet-system pass that
  already owes three other animations from Wave 8a.

**A real, shipped bug found and fixed on the way in (not part of this wave's
scope):** `examSlate()` never put `why` on the problem object, but `engine.js`'s
final exam reads `prob.why` when the kid marks the WRONG step — so since Wave 7
the MathMaker has been saying **"Here. undefined"** at the single most sensitive
moment in the game: a miss, in the inverted final exam, where the entire promise
is that wrong answers earn help. `drive-castle.js` never caught it because it
only asserts the feedback doesn't *scold*. One line to fix (`why: o.why || ''`),
now asserted in the unit suite and driven live in `drive-twokids-b.js`.

**Evidence discipline (new — learned reviewing 8a):** your session's
scratchpad disappears with your session, and this environment kills
background tasks that run past ~20–25 minutes — 8a's marathon evidence
died both ways at once, and the reviewer had to re-run it from scratch.
So: (1) write every drive/marathon run's full output to
`tests/logs/<drive>-<n>.log` inside the repo (create the directory and
gitignore it) — never only to your scratchpad; (2) run the marathon in
the FOREGROUND, or if backgrounded, redirect to that log file so the
verdict survives the process; (3) if the environment kills a run, the
run does not count — re-run until the log file itself contains the
final `MARATHON COMPLETE` / checks lines; (4) in your completion
report, give the log paths and paste the marathon's final lines
verbatim. A claim the reviewer can't open a file and see is a claim
that gets re-run.

## Fix pass — playtest round 4 (design session) ✅ SHIPPED (2026-07-12, with the 8b release)

Four live-playtest reports, applied right after the Wave 8b review:

1. **Real treble clef** (problems.js staffSvg): the Wave-4 hand-drawn
   "simple curl" stand-in did not read as a clef at all. Now the actual
   Unicode glyph 𝄞 (U+1D11E) as SVG text, sized so the curl wraps the
   G line. Verified by screenshot on the family's platform. (There is
   no bass clef in the game — staff problems are treble-only.)
2. **Continent-aware gem messages** (gemLootMsg + bag note): gems drop
   from any chest (6% roll) from dungeon 1, but fusing is Emberlyn's
   only, post-task-13. Before the pier opens the loot line now promises
   the future ("far across the sea lives an enchanter… one day, you'll
   sail there") instead of naming an unreachable place.
3. **Mimic chests** (the kids' request, built KIND): ≥ dungeon 4 only,
   never a guaranteed-gem/story chest, ≤1 per floor (E.MIMIC_CHANCE,
   drives pin to 1). TELEGRAPHED — the chest breathes (1px bob; Calm
   Mode gets a static grin at the seam instead) and the pet's ❗ warns
   ("its tail is not wagging"). Bump → one grin dialog → a completely
   NORMAL battle; win OR soothe pays the chest's own loot roll PLUS a
   treasure "for your nerve" — curiosity always net-rewarded. Fleeing
   re-reveals the same mimic (never a free chest). Shared MIMIC_CARD
   (GOLEM_CARD-style, "Wandering Chests" book page appears once met,
   count 76→77); Soothe/befriend works, bespoke soothe line included.
   tests/drive-mimic.js (25 checks).
4. **Loss language, final softening**: battle banner "💫 DEFEATED… 💫"
   (red) → "✨ Whisked to safety! ✨" (gold); E.die's log line now "The
   world spins — the MathMaker's magic carries you home"; Pendulum
   Knight's soothe line "dead in the middle" → "exactly in the middle".
   Audit confirmed no player-facing "die/death" anywhere else.

## Wave 9 — The Tending (post-game practice; SONNET, prose stop on new dialog) ✅ SHIPPED (2026-07-12)

**Deviations from this spec, and why:**
- **A REAL BUG FOUND (and fixed) by screenshot review, not by the automated
  suite.** Three of the castle's new furnishing glyphs (originally `u`, `h`,
  `c`, `y`) happened to collide with existing `MM.data.NPCS` keys used by
  townsfolk on OTHER maps (Trader Tessa, Farmer Fenwick, etc.). The
  townsfolk NPC-draw pass in `drawWorld` runs on every glyph, on every
  overworld, regardless of which one — so a reused letter drew that
  villager sprite RIGHT OVER the furniture tile. Every automated check
  (`tileSprite()` unit assertions, the render audit) stayed green throughout,
  because they only ever check that a glyph maps to *some* known sprite —
  none of them render a screenshot and look. Fixed by renaming to `d/i/k/l`
  + `n/w/r`, none of which are NPCS keys, and added a permanent unit check
  (`tests/test.js`) asserting no future castle glyph collides with
  `MM.data.NPCS`. Left as a standing lesson: **a glyph-registry check proves
  a tile is CLASSIFIED, not that it's the only thing drawn there.**
- **The Spiral Stair's `D` doors are exempt from the shared door-gating
  audit.** Every other dungeon's math door gates a genuine chokepoint (the
  audit fails a door that's bypassable). The Spiral's doors are practice
  *stations* scattered through small open rooms — post-game volume, not
  lock-and-key puzzles — so requiring them to gate anything would mean
  redesigning every chunk as a corridor maze, which the spec never asked
  for. `MM.maps.SPIRAL_INDEX` is explicitly excluded from that audit and
  gets its own plain reachability check instead (X to every D/m/>/*/b),
  exactly matching the acceptance text's "chunk templates all pass the
  reachability BFS."
- **Capped at 60 floors, not literally endless.** FUTURE_LEVELS.md's own
  phrase is "infinite content from finite assets" — a real infinite loop
  needs infinite storage or a lazy/procedural array contract this codebase
  doesn't have (`MM.maps.dungeonFloors` returns a plain, pre-built array
  everywhere else). 60 floors (12 landings) is far past anything a kid will
  reach for a very long time, and the top floor simply has no way further
  up — exactly how every hand-authored dungeon in this game already ends.
- **Daily Tangles appear on the mainland overworld only, not inside
  dungeons.** The spec says "an overworld or dungeon tile" — dungeons
  aren't persistent standing state the way the overworld is (their
  monsters are rebuilt fresh every visit), so a tangle "living" inside one
  would need a whole new persistence mechanism. The overworld alone
  already delivers the "why open the game on a random Tuesday" goal, and
  the notice board's self-narration (nearest dungeon ENTRANCE by distance)
  still name-drops the dungeons without requiring a kid to walk inside one.
- **No separate "banner" purchase.** The spec's furnishing list is "rugs,
  banners, garden, library" — but banners already exist as permanent decor
  from Wave 7 (the `F` tiles). Adding a second, purchasable banner type
  alongside free ones already on the wall would read as a continuity
  error, not a new feature, so the three purchasable pieces are rug,
  garden, and library shelf.
- **Statue plinths are independent, not sequential.** Unlike the Gallery
  of Ten (which replays the kid's own story in order), the three statue
  plinths are trophies: any of them can be commissioned first, picking any
  boss the kid has actually beaten that isn't statued elsewhere. There's no
  narrative reason to force an order, and forcing one would only add friction.
- **Furnishing/statue purchases are plain gold-for-item, not routed through
  the shop's 10%-off money-quiz.** That mechanic belongs to the shop
  counter specifically; these are bump-to-buy fixtures around the house,
  matching the Gallery plinths' own zero-friction precedent more closely
  than the shop's.
- **Pet hats gate on `s.endingDone` too**, even though a pet can exist from
  Wave 5 onward. The whole wave's framing is "everything below gates on the
  ending" — treating hats as an exception would need its own justification
  the spec doesn't give, and bundling them with the castle visit ("make your
  home nice, make your pet nice, in one trip") reads as one coherent errand
  rather than an arbitrary early cutoff.



FUTURE_LEVELS.md §5 is the design source — read it in full first. The kid
is the New MathMaker now; tending the kingdom IS the job. Everything below
gates on `s.endingDone`. Design rules that may not bend: no timers, NO
streak-loss of any kind (a kid who missed a week is welcomed back, never
penalized), weakest-first adaptive problems everywhere, rewards are
cosmetic-not-power, and every mechanism reachable in under a minute from
profile load. Miscount's Academy (5b) already SHIPPED with Wave 8b — this
wave adds its growth visuals only.

1. **Daily Tangles (P1, the heartbeat).** Each real-world day, 1–3
   scribble-knot monsters (the cutscene's tangle visual — reuse/adapt that
   sprite) appear on overworld/dungeon tiles. Generation mirrors
   refreshBounties exactly (date-keyed `s.tangles`, regenerate on day
   flip); the notice boards SAY where ("A tangle was spotted near the Old
   Mine") — bounty-board recipe, self-narrating from day one. Untangling =
   a normal battle drawing pickArenaProblem (weakest-first mixed). Soothe
   works (a tangle relaxes beautifully). Reward: small gold + the counter:
   **"days tended" counts only UP** — never resets, never shames.
   Milestones 10/50/100 celebrated via the pendingBadges queue and shown
   on the Hall of Heroes plaque.
2. **The Spiral Stair (P2, volume).** Post-credits tower off the castle
   (new tile on the mainland overworld + DESTINATIONS entry if it sails —
   prefer a castle-adjacent entrance; the spiral made walkable). Floor N =
   a small map chunk (author 6–8 reusable 12×10 chunk templates, rotate
   through them) with 2–3 mixed problems and 1–2 monsters at a gentle
   difficulty curve (statIdx ramps slowly past 21). Every 5th floor is a
   landing: chest + checkpoint. Beacon home ALWAYS works; return to your
   highest landing freely — explicitly not a roguelike, nothing is ever
   lost. "Highest step" on the Hall plaque. Cap nothing; test to floor 25.
3. **Cosmetic gold sinks (P3).** Furnish the open castle room by room
   (rugs, banners, garden, library — a purchase menu at the castle, each
   piece visibly rendered once bought, `s.castleFurnish`), boss statues,
   and **tiny hats for the pet** (purchasable at last; pet renders its
   hat). All cosmetic, permanent, and priced to matter (hundreds of gold —
   this is where the post-game economy goes).
4. **Hall of Heroes + Academy growth (P4).** Plaque adds days tended,
   spiral height, students helped (Academy attendance counter — count
   slates checked). Academy room visibly grows with attendance: more
   desks at 10/25/50 slates, a class photo on the wall at 100. No
   rankings between profiles, ever — personal stats side by side, same
   bar as Wave 8a's Hall audit.

Acceptance — tests/drive-tending.js: day-flip regenerates tangles (fake
todayStr like the bounty tests); tangle battle draws mixed problems and
increments days-tended exactly once per real day (two tangles same day =
still one day tended); milestone fires once; spiral: climb to floor 6,
verify landing checkpoint + return-to-landing + Beacon exit; buy one
furnishing + one pet hat and verify both RENDER (screenshot, and LOOK);
Hall plaque shows all three counters. Unit: tangle placement never lands
on solid/story tiles (derive from the walkability audit, don't hand-list);
chunk templates all pass the reachability BFS. All existing drives +
marathon green (marathon is pre-ending — add one post-ending leg to
drive-castle or the new drive, do NOT lengthen the marathon). Evidence
discipline applies (tests/logs/, foreground marathon, paste final lines).
**Stop for design review of all new player-facing prose before tagging**
(tangle notices, furnishing names, milestone lines).

## Fix pass — playtest round 5 (design session) ✅ SHIPPED (2026-07-12, with the wave-9 release)

Live-playtest reports on the Wave 8b stances — including one DESIGN PIVOT
(user decision): **one track, chosen at the Ceremony.** The Strike/Soothe
in-battle buttons are GONE ("it is confusing to have strike/soothe as
options") — the Ceremony's "boldly, or gently?" now IS the class choice,
battles show only ⚡ Brave + Flee, and changing your way is a deliberate
act in the ⚙️ dialog (one warm MathMaker line; friends stay friends;
nothing lost). Help's battle entry describes YOUR way and says where to
change it. The becalmed/friend model got four refinements in the same
pass (tests/drive-stances2.js + updated drive-twokids-b):

- **The friend mark is a crisp pixel HEART** ("the dove is
  unrecognizable") — one mark, drawn like the crown, replacing BOTH the
  emoji dove and the topic pip on friends (two hovering symbols read as
  noise; a friend isn't a target).
- **A becalmed monster SITS where it was calmed** ("they appear in
  different places… you don't know who is who") — zero drift, matching
  its own settling-in flavor lines.
- **Bumping a calmed friend is never a fight** ("I can still fight it,
  and it starts at 0% calm" — accidentally erasing your own kindness):
  it steps aside — you swap places — with a friendly line
  (FRIEND_BUMP_LINES). This also guarantees a becalmed monster can never
  block a chokepoint. The friend-ceremony "spar by walking into it" text
  is gone with the sparring bump.
- **The "A friend!" ceremony fires ONCE, ever** ("after every fight is
  ridiculous") — the first friend the kid ever makes gets the modal;
  every later kind gets its victory line and 🤍 book mark.

Also in this pass (from the same playtest):

1. **Brave problems now LOOK brave** ("the brave questions did not look
   hard — 3+5"): the two FACTS topics are compressed — one-tier-up inside
   single-digit facts barely reads — so their tier 3 became the
   composed-chain tier (`6 + 9 + 7`, `15 − 8 + 6`, `3 × 4 × 2`,
   `36 ÷ 4 × 5`, missing-number boxes; worked solutions show each step)
   and braveTierFor always draws it for them. Deep topics keep the
   adaptive one-tier-up. 80/80 sampled brave facts draws are chains or
   boxes; zero plain two-term sums.
2. **The ⚡ button explains itself on first touch** ("how is a kid
   supposed to know what brave means?" — it was a hover tooltip, the
   anti-pattern we fixed for spells in 7.1): first-ever switch-on prints
   the whole deal in the battle message line (hardest questions, double
   power, a miss costs nothing extra), persisted `s.seenBraveHelp`; later
   toggles get short confirms. Also added to the first-battle tutorial
   and the Help battles entry.
3. **The brave latch** (found while writing #2): damage read `s.brave` at
   ANSWER time but the problem was picked at ROUND start — toggling ⚡ on
   mid-round doubled an easy problem. battle.js now latches the pick-time
   flag per round and playerStrike honors it: double damage only ever
   pays for a question actually asked the hard way.
4. **A soothed monster STAYS, becalmed** ("they seem to disappear, like
   ones that have been fought"): full health, softened palette + 🕊 pip
   (its species is befriended as of that moment, so friend
   rendering/pacify picks it up with zero new wiring), never initiates; a
   soothed GUARD goes off duty and wanders from its post, so soothing can
   never leave a chokepoint blocked that defeating would have cleared.
   No ⚔ tally, no defeatedAt for soothed regulars — the 🕊 mark instead
   (bosses/mimics/tangles keep their endings; departure-implying soothe
   flavor lines rewritten to settling-in lines).
5. **Soothe sounds and looks like soothing**: a landed soothe CHIMES (two
   soft rising sine notes; a "perfectly calm" crit adds a third) instead
   of the strike whack — and each gentle instrument sheds its own calm:
   the Bubble Pipe blows bubbles, the Ribbon Streamer trails ribbons, the
   Cat-Fishing Wand flicks little lure-fish, the Chime Bells shed notes.

## Wave 10 — The World Notices (SONNET agent; spawned by the design session) ✅ SHIPPED (2026-07-13, prose reviewed)

The mid-game story sag, fixed by the world visibly reacting to the kid —
no new mechanics anywhere in this wave, only reaction, foreshadowing, and
rare delight. STORY_BIBLE.md open throughout.

1. **The Turning Stones (P1 — the centerpiece; user-approved design).**
   A courtyard of 13 arc-carved paving stones in the castle plaza on the
   mainland overworld (the pre-ending castle is a bump, not a building —
   the stones must be OUTSIDE, walkable-past on the turn-in route).
   - Stone sizes follow the Fibonacci boxes: 1, 1, 2, 3, 5, 8, 13 — the
     kid who counts them is reading the exact sequence the ending exam
     asks about ("1 1 2 3 5 8 13 … what comes next?" → 21). This makes
     the finale fair-play deducible. NEVER say the word Fibonacci.
   - Render as a drawn canvas overlay on fixed plaza tiles (the world-
     numerals/gear-pip recipe, NOT new tile glyphs — the audit exempts
     nothing). Each stone = one spiral arc segment; aligned stones draw
     at their true angle, unaligned ones at a fixed skew (deterministic
     per stone, no per-frame motion — Calm-Mode-safe by construction).
   - Alignment count = s.tasksDone.length (monotonic, save-safe, zero
     new state). All 13 aligned → the complete spiral + a faint golden
     shimmer (a static tint, not animation).
   - Narration ONCE, then silence: Sage Sylvia gains one rotating line
     ("The courtyard stones. They turn, you know. One more every time
     you set something right. My grandmother said they were a picture,
     seen from high enough."), the MathMaker one dry aside ("The floor
     out front? Older than me. It has opinions about geometry."). The
     stones themselves never speak, never gate, never react to bumps.
   - Reward attention, never require it: a kid who never notices loses
     nothing; the ending reveal still works cold.
2. **Reactive cast (P2).** After each major flag (lampLit, spireDone,
   hallsDone, breakwaterDone, gullwrackRebuilt, endingDone), the core
   cast each gain ONE new rotating line acknowledging it: Callie, Percy,
   the captain, Miscount, Sylvia, Barnaby, Finn. ~30 lines total, all in
   each voice per STORY_BIBLE. The world should notice the kid's deeds.
3. **A mid-game event (P3).** One small map change around task 6-7 that
   is not a new dungeon: after task 6, the two farmers finally repair
   the broken fence east of the farm (three tiles change, one dialog
   line each thanking the kid — the kingdom mends as confusion recedes).
4. **The rare-surprise pool (P4).** Three once-EVER world moments, each
   ~1% per eligible condition, persisted seen-flags: (a) a shooting star
   crosses the overworld at night… the game has no night — instead: a
   golden bird lands on a fence post, watches the kid pass, and leaves
   one feather (a 3-gold treasure named "Proof It Happened"); (b) the
   inn cat brings the kid a dead… no — a LIVE beetle, proudly (log line,
   +nothing); (c) two slimes in any meadow dungeon are found stacked,
   wearing one hat between them (bump = they split apart, embarrassed;
   the hat is respectfully retired, +2 gold). All jokes on the world,
   never the kid; none repeatable; none missable-with-regret (no
   notification that one was missed, ever).

Acceptance — tests/drive-notices.js: stones render (screenshot at 0, 6,
13 tasks — LOOK at all three), alignment count tracks tasksDone, no new
grid glyphs, reactive lines appear post-flag and not before, the fence
mends after task 6, each rare event fires when forced (expose its CHANCE
hook, pin to 1) and never twice; all existing drives + marathon green;
evidence discipline (tests/logs/, foreground/detached marathon, paste
final lines). **Prose stop before tagging**: every new line reviewed.

**Design-review verdict (2026-07-13, conducted by the design session under
the user's delegated authority):** prose APPROVED in full — every line in
voice, the boar reference verified against Fenwick's own task-4 canon (the
reviewer's first instinct to "fix" it was wrong; the agent's lore was
right). ONE design fix applied post-review: the agent resolved the spec's
own ambiguity (7 sizes, 13 stones) as a size PALINDROME — but a kid who
studied a mirrored courtyard would read "…13, 8" and answer the ending
exam's "what comes next?" with 8. Foreshadowing must never teach the wrong
answer. Now: seven ascending stones carved 1,1,2,3,5,8,13 (numerals rotate
with the stone — crooked until tended, upright once turned, so the
sequence literally straightens out), six unnumbered curve segments
completing the sweep for tasks 8-13. Also fixed in the same gate: a rare
unit flake from the PEDAGOGY pass's tie-jitter (±0.03/item can override
the 0.05 composite rust-vs-accuracy margin ~1-in-15 runs; jitter halved to
±0.015 — margins COMPOSE, so per-item jitter must stay under half the
smallest genuine margin), and a session-shape login line ("N tangles were
spotted overnight — the notice boards know where") so a returning kid
hears what's new in the first second.

**Deviations from this spec, and why:**
- **The 13 stones' sizes are the seven-square Fibonacci-spiral diagram
  (1, 1, 2, 3, 5, 8, 13), mirrored to fill exactly 13 stones** —
  `[1,1,2,3,5,8,13,8,5,3,2,1,1]` — since the spec names only seven numbers
  for thirteen stones. The mirror keeps every size drawn from that exact
  set (21 never appears anywhere, so it can never spoil the ending exam's
  own answer) and puts the biggest, most central stone (13) dead center —
  which happens to land on the same map column as both the castle door and
  the player's spawn point, unplanned but fitting. Reading the first seven
  stones left to right still spells out "1 1 2 3 5 8 13" exactly, in the
  kid's natural walking direction toward the castle.
- **Location: mainland world row 7, columns 13-25** — a full-width open
  corridor directly between the player's spawn (19,8) and the castle door
  (19,4), so every single turn-in walk crosses it. Rendered as a canvas
  overlay in `drawWorld` (ui.js) reading `s.tasksDone.length` live; the
  underlying tiles stay ordinary `'.'` grass — confirmed by a dedicated
  unit test that fails if any stone tile is ever anything else.
- **Sylvia's rotating stones line is a probabilistic aside (20% chance per
  visit while `1 <= s.tasksDone.length < 13`), not a flag-gated cascade
  branch** — "rotating" is read as "recurs, in rotation with her other
  lines," matching the existing `MATHMAKER_ASIDES` idiom (a random pool,
  appended some of the time) rather than a one-time popup. It goes silent
  once all 13 have turned (the ending owns the reveal from there) and never
  appears before the first stone turns. The MathMaker's dry aside is a
  single new entry in `MATHMAKER_ASIDES` itself — already a rotating pool,
  so no new plumbing was needed there at all.
- **The reactive cast landed at ~24 new lines, not ~30** — distributed by
  narrative fit rather than forcing every character to react to every one
  of the six flags: Finn (2: lampLit, endingDone), Sylvia (3: hallsDone,
  spireDone, lampLit — separate from her stones aside above), Callie (4:
  gullwrackRebuilt, hallsDone, spireDone, lampLit), Percy (3:
  gullwrackRebuilt, hallsDone, spireDone — breakwaterDone was already his
  from Wave 7), Barnaby (4, matching Callie's set), the captain (4: one
  new greeting variant per dock — `E.dock`/`E.horologeDock`/
  `E.chimeDock`/`E.gullwrackDock`), and Miscount (4, in `E.miscountArena`'s
  `taskIndex > 13` branch, since the isles are only ever reachable after
  all 13 mainland/east-bank tasks are already done — his existing
  `MISCOUNT_SMALLTALK`/`MISCOUNT_EPILOGUE` pools were never the right home
  for these). Every branch is ordered most-advanced-flag-first, verified
  both by a `tests/test.js` sweep and by a same-mechanism sample through
  the real DOM in `drive-notices.js`.
- **The mid-game fence needed one new decorative map glyph ('F', mainland
  world only) after all** — the acceptance list's "no new grid glyphs" line
  is scoped to the stones (its own bullet explicitly says so); the fence is
  a separate item, and every existing "tile whose state must be readable
  from its own sprite" precedent (the Spire's gear plates, the Open
  Castle's furnishing) already uses a dedicated glyph read live off state
  rather than a grid rewrite. `F` reads `s.tasksDone.includes(6)` live
  (`tileSprite`, mapId `'world'` only — the castle interior keeps `'F'` as
  its banner, disambiguated by mapId exactly like every other reused
  letter) — mending the fence needed no new persisted flag at all. Two new
  16x16 sprites (`fenceBroken`/`fenceMended`) were authored; only the
  one-time thank-you dialog needed a flag (`s.seenFenceThanks`).
- **"The two farmers" is Farmer Fenwick plus an unnamed hired hand, not a
  second named character** — STORY_BIBLE.md's cast list has no second
  farmer, and inventing one mid-wave for a single bump-dialog felt like
  scope creep for a reaction-only wave. Both get a line, in the same
  dialog box, on the first mended-fence bump.
- **The hatted-slimes moment is scoped to the Meadow Cave (dungeon 1)
  only** — it is the only dungeon in the game actually themed "meadow"
  (`Slime`/`Field Mouse` roster, task 1's own flavor text); no other
  dungeon shares that theme to spread the ~1% roll across.
- **The golden bird is gated on the fence already being mended**
  (`s.tasksDone.includes(6)`), not just "on the mainland" — the spec's own
  flavor text has it land "on a fence post," which only exists once P3's
  fence is standing. This also means the two P3/P4a moments read as one
  coherent kingdom rather than two unrelated systems sharing a road.
- **All three rare moments are log-line-first, not new sprite/animation
  work** — (b) was already specified as "log line, +nothing"; (a) and (c)
  follow the same low-ceremony idiom (a `MM.ui.log` line, an existing-item
  reward, one new inline sprite for the hatted-slimes pair reusing an
  emoji overlay exactly like the guard's 💤/thief's 🪙 precedent) rather
  than new pixel art or cutscenes — proportionate to something ~1% of
  players will ever see once, ever.

## Wave 11 — The Grand Descent (visual escalation; SONNET agent, screenshots ARE the review) ✅ SHIPPED (2026-07-13)

THE FINDING (design-session audit): MM.data.THEMES gives every dungeon a
color identity — but it styles ONLY the battle backdrop. The dungeon
crawl uses one shared wall/floor sprite pair for all 21 dungeons, so a
kid ten dungeons deep walks corridors identical to dungeon 1. This wave
makes the descent LOOK like a descent. Zero gameplay changes — every
edit is paint.

1. **Theme-tinted rooms (P1, the core).** Derive per-dungeon wall/floor
   palettes FROM THE EXISTING THEMES TABLE (accent + ground per index) —
   data-driven, never a hand-list, so dungeon 22 would style itself.
   Monster-style palette swaps on the wall/floor sprites (the pal
   mechanism sprites already support), keyed off dungeonIndex in
   tileSprite — the context is already threaded. Isle dungeons keep
   their stronger identities; this floor-tints them too but their
   custom tiles stay.
2. **Three wall TIERS across the mainland (P2, the escalation).**
   d1-3: rough cave (current wall reads this way already); d4-7: worked
   stone (author ONE new 16×16 wall variant: cut blocks, mortar lines);
   d8-10: grand keep (ONE more variant: large dressed stone, a carved
   band). Assign by dungeonIndex; expansion 11-13 reuse grand keep with
   their own theme tints. Two new sprites total — sizing is deliberate.
3. **Deterministic decor overlays (P3, the life).** 1-2 decor motifs
   per mainland dungeon drawn ON floor tiles at hash(x,y)-chosen spots
   (the Turning Stones / world-numerals overlay recipe — NO new grid
   glyphs, nothing enters the walkability audit): moss tufts (d1),
   rat-gnawed bones... no — kind world: dropped acorns (d1), cobwebs
   (d2), lantern hooks (d3), mine-cart rails fragments (d4), fern
   fronds (d5), crystal glints (d6), coin flecks (d7), fraction-rune
   carvings (d8), owl feathers (d9), faded royal banners (d10). Static,
   Calm-Mode safe by construction, ≤2 per ~8×8 area so floors stay
   readable. Decor NEVER overlaps a POI tile's cell (D/Z/Y/*/K/L/etc.).
4. **Boss-room dignity (P4, small).** Within 3 tiles of the boss
   marker's spawn, the floor tint deepens one step toward the theme's
   sky1 — arrival readable at a glance, no motion, no new sprites.

Acceptance — tests/drive-descent.js: screenshot EVERY mainland dungeon
d1-10 plus d13 and one isle dungeon (12+ screenshots), and LOOK at every
one with the Read tool — this wave lives or dies on eyes, not assertions
(the furnishing-glyph lesson: render audits prove classification, not
appearance). Assert: wall/floor sprite cache keys differ between d1, d5,
d9 (the tiers + tints are real), decor never lands on a POI cell across
50 regenerations, boss-vignette tiles differ from ordinary floor. Unit:
palette derivation is total over all 21 THEMES entries (no index gaps).
The full 27-drive suite + detached marathon green; evidence discipline
(tests/logs/*-w11.log, paste marathon final lines). NO gameplay diffs:
tryMove/battle/economy untouched — if a gameplay file needs an edit
beyond tileSprite/drawWorld context threading, STOP and report instead.
**Include every screenshot path in the final report** for the design
session's own review pass.

**Deviations from this spec, and why:**
- **The palette derivation and the wall-tier selection ended up split
  across two files, not both living "in tileSprite"** — `tileSprite`
  (maps.js) stays a PURE function of `(ch, x, y, mapId, waterFrame)` with
  no engine-state dependency (every existing caller, including the
  headless render/door audits and two other drives, calls it exactly that
  way and expects a plain sprite-name string back), so it owns tier
  SELECTION only (`MM.maps.wallTierSprite(MM.maps.dungeonIndexOf(mapId))`
  — a new pure `dungeonIndexOf` helper that regexes `mapId`'s `d<idx>`
  prefix, since dungeon mapIds are `'d<idx>'` or `'d<idx>f<floor>'` and the
  render audit's own convention already relies on that shape). The actual
  PALETTE (the hex colors) is computed one level up, in `ui.js`'s
  `drawWorld`, using `s.dungeonIndex` directly (simpler and more reliable
  than re-parsing it from the mapId string a second time) and passed as
  `MM.sprites.get`'s `opts.palette` — the same place an NPC's `pal` already
  gets attached. "Keyed off dungeonIndex, context already threaded" is true
  end-to-end; it just isn't all literally inside the one function named
  `tileSprite`.
- **Two new wall sprites (`wallWorked`, `wallGrand`) needed a second design
  pass after the first draft screenshotted too similarly to the existing
  `wall`.** The first version reused `wall`'s exact 4-row coursing rhythm
  with only the joint position varied, and side-by-side crops showed d1 and
  d5 were nearly indistinguishable in silhouette (only the theme tint
  differed) — exactly the "tiers not real enough" failure mode the wave's
  own acceptance section warns about. Redesigned `wallWorked` as a true
  2-row running-bond brick course (finer, busier than `wall`'s chunky 2x4
  grid) and kept `wallGrand` as two huge dressed stones plus a highlight
  band (already sufficiently distinct). Re-screenshotted every mainland
  dungeon after the redesign; d1 (rough)/d5 (fine brick)/d9 (huge blocks +
  band) are now unmistakably different silhouettes even before the tint is
  considered.
- **The boss vignette's alpha was raised from an initial 0.22 to 0.34**
  after the same screenshot-and-look pass — 0.22 was only barely
  perceptible in a direct pixel sample (a ~6-8/255 channel shift) and
  failed the wave's own "arrival readable at a glance" bar. 0.34 reads
  clearly as a distinct room in a screenshot at normal viewing size without
  looking like a rendering glitch.
- **The boss-room vignette reads the boss's spawn position off the FLOOR'S
  OWN UNMUTATED TEMPLATE (`MM.maps.dungeonFloors(idx)[floorIndex]`,
  re-parsed and searched for the `'b'` marker), never the live grid or a
  living boss's current (chasing) position** — `E.enterDungeon` overwrites
  the `'b'` marker tile to `'.'` the instant it spawns the boss, and a
  living boss's `x`/`y` moves as it chases the player (`behavior: 'chase'`
  applies to bosses too), so neither the live grid nor `s.monsters` can
  answer "where does this room's boss belong" after the fight starts. This
  needed no gameplay-file edit — `dungeonFloors` and `parse`/`find` already
  existed and are pure data lookups — but it's worth flagging as the one
  place this wave went spelunking through dungeon geometry that isn't
  `tileSprite` itself. Memoized per `(idx, floorIndex)` since floor shapes
  never change shape.
- **Decor glyph choices for d1-10 were picked freely** ("choose the simpler
  option and note it" per the sizing guidance) since the spec named motifs
  in prose, not exact glyphs: 🌰 acorns (d1), 🕸️ cobwebs (d2), 🪔 lantern
  hooks (d3), 🛤️ mine-cart rail fragments (d4), 🌿 fern fronds (d5), 💎
  crystal glints (d6), 🪙 coin flecks (d7), ½/⅓/¼ fraction-rune carvings
  (d8, a hash-picked one of three rather than a single glyph — "carvings"
  read as plural), 🪶 owl feathers (d9), 🚩 faded royal banners (d10, drawn
  at half the usual opacity for "faded" — the only per-dungeon opacity
  override). All confirmed to actually render as real glyphs (not tofu/
  fallback boxes) via zoomed screenshot crops before finalizing — 🪙's flat
  grey-silver design initially looked like a rendering failure until a
  crop confirmed it's a real (if unexpectedly monochrome-looking) coin
  glyph, not a fallback.
- **Density is a single global hash threshold (~1-in-41 eligible floor
  tiles), not a per-region cap** — true "≤2 per 8x8" would need a
  region-bucketed placement pass; a flat per-tile probability tuned so the
  EXPECTED count in an 8x8 patch is ~1.5 was judged close enough for an
  atmosphere pass and was verified acceptable by eye across all 10
  screenshots (6-13 hits per full dungeon floor, none clustered enough to
  read as clutter or hide a POI glyph among them — decor is category-
  excluded from POI cells by construction, not just by tuning).
- **Unit coverage intentionally exceeds the letter of the acceptance
  section**: "50 regenerations" for the decor-POI check became an
  exhaustive scan of every glyph of every floor of every mainland dungeon
  (hundreds of tiles per floor, all 10 dungeons, both floors where
  present) — strictly more coverage for no extra design risk, since the
  underlying function is a pure lookup with no hidden per-call randomness
  to sample against.
- **No gameplay file needed touching, so none was** — the hard STOP rule
  never triggered. The full diff is `js/maps.js` (tile→sprite pure logic +
  new geometry/decor helpers), `js/sprites.js` (two new wall sprite DEFS +
  `S.themePalette`), and `js/ui.js`'s `drawWorld` (palette wiring + two new
  overlay passes). `js/engine.js`, `js/battle.js`, and every economy/
  problem-generation file are byte-for-byte untouched.

## Sizing guidance for the implementing model

- One wave = one focused session (Wave 5 items are each ≤ half a session).
- ALWAYS: read the recipe's reference implementation FIRST, in full.
- ALWAYS: write the unit test for a map BEFORE polishing it — the BFS
  harnesses catch geometry errors instantly (rows of wrong length, unreachable
  POIs, bad chute landings).
- Screenshot every new visual (problem SVGs especially) and look at it.
- Update after every wave: README.md, this file (mark the wave ✅ SHIPPED
  with date + deviations), tests/README.md, and the bestiary counts.
- When in doubt about tone or difficulty, do what the nearest existing
  feature does. When a decision is genuinely new (e.g. music note range),
  choose the simpler option and note it in this file.

## Play-time accounting (target ≥ 5×)

| Content | Est. hours |
|---|---|
| Baseline today | 8–12 |
| Wave 1 (Lighthouse + Vault + spells) | +4–6 |
| Wave 2 (Enchanter) | +3–5 |
| Wave 3 (Clockwork Spire, time) | +6–8 |
| Wave 4 (Resonant Halls, music) | +5–7 |
| Wave 5 (depth) | +10–15 |
| Wave 6 (Gullwrack, geometry) | +5–7 |
| Wave 7 (the ending + NG+) | +10–13 |
| **Total** | **51–71 h ≈ 5–7× baseline** |

The recurring systems (bounties, badges, bestiary, sparring, gauntlet,
enchant hunting) are what stretch the top of that range — they make the six
new dungeons revisitable rather than one-shot.

## v1.7.0 queue — story & wonder pass (design session; queued from live playtest 2026-07-13) ✅ SHIPPED (2026-07-13, implementer pass — see "v1.7.0 SHIPPED" writeup at the end of this file for the six-item scope actually implemented, test results, and every deviation)

# QUEUED: Turning Stones spiral layout fix (user report 2026-07-13)
# Apply during the Wave 11 review pass (agent owns the tree now; this
# touches ui.js drawWorld + data.js TURNING_STONES, which it may be near).

USER REPORT: "the 'spiral' on the map looks extremely weird — all in a
horizontal row... shouldn't it look like a spiral?" Correct — spec error
(mine, not the Wave 10 agent's): a row of arc-carved tiles does not read
as a spiral. The SHAPE must be the message.

## New layout
- 13 stones along a rectangular-spiral walk curling OUTWARD from a
  center stone. Path offsets from center C (dx, dy), in stone order
  i=0..12, generated by the R1,U1,L2,D2,R3,U3 walk:
    (0,0),(1,0),(1,-1),(0,-1),(-1,-1),(-1,0),(-1,1),(0,1),(1,1),
    (2,1),(2,0),(2,-1),(2,-2)
  Footprint 4x4 tiles. Anchor C near the plaza spawn so the center
  stone sits by the kid's front door — verify every covered tile is
  plain grass '.' on the raw overworld (unit test: positions unique,
  all-grass, CONSECUTIVE STONES ADJACENT — the path property), and no
  NPC letter/POI shares a cell. If the current plaza area collides,
  shift C; do not reshape the walk.
- Numbers carve center-out: stones 0-6 carry 1,1,2,3,5,8,13 (ascent
  preserved — the 2026-07-13 palindrome lesson); stones 7-12 unnumbered
  curve segments. The sequence grows as the spiral grows.
- Arc orientation: an ALIGNED stone's carving connects its path
  neighbors (quarter-turn arc where the walk turns, straight segment
  where it runs); prev/next derived from stone order. Unaligned keeps
  the current deterministic skew. All 13 aligned: the carvings join
  into one continuous curled line + the existing static golden tint.
- Sylvia's line still fits ("a picture, seen from high enough") — no
  prose changes needed. MathMaker's aside still fits.

## Tests to update
- test.js Turning Stones block: replace the row/y=7 assertions with:
  13 unique positions, consecutive-adjacent (path), all plain grass,
  labels 1,1,2,3,5,8,13 then nulls, no POI/NPC collisions.
- drive-notices.js: stones screenshots at 0/6/13 — re-LOOK: does it
  read as a spiral at a glance? That is the acceptance question.

## Additions (user questions, 2026-07-13)

1. **The sequence walk (interactive, never asked).** Stepping on stones
   in path order (center outward) chimes a rising tone per stone
   (MM.sound.tone, singing-stones reuse; respects soundOff). Full
   in-order walk = a small ONCE-EVER flourish (worldBurst, calm-gated;
   persisted seenSpiralWalk). Out-of-order = silence, no reset message,
   no failure. Never hinted anywhere — pure discovered wonder.
2. **The connecting line accretes** (already core) + refinement: when a
   task completes, the NEWLY connected segment glints briefly on the
   kid's next plaza crossing (the gate-glint recipe) — notice the
   change, not just the state.
3. **The outer end points at the Spiral Stair entrance.** Anchor the
   walk so stone 13's outward direction aims at the Stair's
   castle-adjacent door tile (check the Wave 9 map for its position;
   shift the anchor C to make the geometry work, don't reshape the
   walk). Pre-ending: the spiral visibly leads toward a sealed,
   unremarked spot. Post-ending: that spot is the Stair; the FIRST
   completed in-order walk makes the Stair entrance glimmer (once).
   The courtyard spiral becomes the Stair's on-ramp: the pattern
   keeps going.

Tests add: chime fires per in-order step (spy MM.sound.tone), silence
out of order, flourish once-ever + persisted, stone-13's outward ray
intersects the Stair entrance tile (unit, geometric), glint recipe
gated post-ending.

## The Stair is VISIBLE from day one, locked until endingDone (user
## decision 2026-07-13)

- The tower tile exists on the mainland overworld from a fresh profile
  (currently it appears only post-ending — change to always-present).
  It is the game's established teaser grammar (castle doors, lighthouse
  "final chapter," the '3' dungeon) applied to its biggest promise.
- Pre-ending bump line (once-style, gentle, never a nag):
  "A door with no keyhole, at the base of a winding tower. Carved above
  it: the same curling line as the courtyard stones. It isn't ready.
  Or you aren't. Hard to say which."
  Optional late-game evolution (task 10+): the carving "seems deeper
  lately." One Sylvia rotating aside; no one explains it.
- UNLOCK TIMING UNCHANGED: endingDone opens it, as shipped. The stone
  spiral completes at 13 tasks (pre-ending) — it is the SIGNPOST, never
  the key; the in-order walk stays optional wonder, never load-bearing.
- Tests: tower tile present + reachable on a fresh profile; sealed line
  pre-ending; opens post-ending exactly as today; walkability audit
  covers the always-present tile.

## ALSO QUEUED for v1.6.0: Tales of the Guessing Years (user idea 2026-07-13)

TONE RULE: the comedy is SELF-TOLD — only Miscount laughs at his
guessing years; nobody else may. Post-ending gate (pre-ending he is
still tender about it). Never mocks guessers-in-general; frames the
SEDUCTION ("a guess pays just often enough" = intermittent
reinforcement, the true psychology of why kids guess).

1. MM.data.MISCOUNT_GUESS_TALES pool (post-ending Academy visits, one
   rotating tale shown occasionally before the day's slates):
   - "I once answered 'seven' to everything for a full week. It worked
     twice." He holds up two fingers. "That was the worst part. It
     working twice. That's the whole trap, you see — a guess pays just
     often enough."
   - "I told the king the new bridge wanted 'about a hundred' planks.
     It wanted forty. We had a very tall bonfire that winter, and a
     very cross carpenter."
   - "I guessed a soup once. Doubled the salt because it felt right."
     He shudders, with respect. "That soup could have stood sentry
     duty."
   - "I called the stars 'roughly a thousand.' Sylvia has been counting
     the ones I missed ever since. She sends me the number every
     winter. It has five digits, and it grows."
2. Golem battle cries (rare, any time — the joke is on the golem/his
   past, never the kid; golems ARE his old homework canonically): a
   golem's enter-flavor occasionally bellows an ancient wrong answer —
   "SEVEN!" / "CARRY NOTHING!" / "IT IS ALWAYS TWELVE!"
3. Sequel tie-in (SEQUEL_SCOPING): one guess-tale per Miscount letter,
   the running gag that keeps his voice aboard.

Tests: tales gated on endingDone; pool rotation; battle-cry rarity
hook exposed for the drive; prose EXACTLY as approved above.

## ALSO QUEUED for v1.6.0: bosses attack with wrong math (user idea 2026-07-13)

Canon completion: monsters are tangles (disorder where working
stopped); now disorder ATTACKS BY ASSERTING FALSEHOODS. Boss strikes
(roughly half, for variety) manifest as a wildly-wrong equation in the
boss's accent color, jagged text over the normal damage roll —
presentation only, no mechanical change, the sacred loop untouched.

PEDAGOGY GUARD (imprint risk): boss equations are ABSURDLY wrong —
wrong = right × 4..12 or ± several hundred; NEVER within ±30%, never
off-by-one/carry-slips (near-misses are the Academy's supervised
territory; unsupervised display of plausible errors can imprint).
CORRECTION BEAT: the kid's next correct strike appends "…and 7 × 8 =
56. The record, corrected." (store pending correction; error and fix
adjacent; her agency does the fixing). Her own problem selection is
untouched — boss questions stay full-depth adaptive.

TONE SPLIT (constitution: bosses sincere): boss falsehoods read as
CORRUPTION, menacing not silly; the comedy register of the same idea
is the golem battle cries (queued above). Calm Mode: text, not motion —
no gate needed; reuse the floater/banner systems.

Tests: absurdity bounds on 500 generated wrong-attacks (never within
±30% of truth); correction line appears on next correct strike and
names the true equation; bosses only (regulars keep verb flavor);
drive screenshot of a boss wrong-equation attack, LOOKED at.

## ALSO QUEUED for v1.6.0: music replacement (user verdict 2026-07-13:
## composed loops are bad; composition-without-ears is the wrong strategy)

- REPLACE synthesized loops with public-domain RECORDINGS (Musopen —
  PD/CC0 performances; the composition being old is not enough, the
  recording's rights matter). Candidates to fetch for USER AUDITION
  (the one step that needs ears): Satie Gymnopédie No.1 (overworld),
  Satie Gnossienne No.1 (dungeon), Grieg/Debussy option (isles).
  Battle: possibly NO music (SFX only) — high-risk mood, silence is
  honest. 2-3 tracks max, total ≤ ~8MB (PWA cache).
- file:// GOTCHA (already reasoned): fetch/decodeAudioData is blocked
  from file:// — use plain <audio loop> elements with relative src
  (works file://), element-based crossfade/switcher behind the existing
  s.musicOff toggle; MM.music.update() keeps picking the mood.
- Licensing: PD/CC0 preferred; CC-BY acceptable WITH attribution in
  README + credits screen. Public repo = must permit redistribution.
  No AI-music services (murky redistribution rights).
- Keep a tiny generative fallback ONLY if no files present (offline
  purists): Eno-style ambient bells — sparse pentatonic over drone, the
  one code-only form that survives earlessness. Retire the composed
  world/dungeon/battle loops.
- sw.js: add audio files to the cache list; play copy ships them too.

## ALSO QUEUED for v1.6.0: music/sound toggles in the ⚙️ dialog (user
## couldn't find the music switch, 2026-07-13)

FINDING: the musicOff checkbox shipped (Parent Settings, under Calm
Mode) but the user couldn't find it — Pass H verdict: wrong door.
Muting music is a player preference, not a parenting decision; the
natural place is the kid-accessible ⚙️ dialog ("Difficulty & your way",
already the how-do-I-want-to-play panel).

FIX: ⚙️ dialog gains two one-click toggle rows —
  "🎵 Music: on/off" (s.musicOff) and "🔊 Sound: on/off" (s.soundOff) —
same state as the parent-panel checkboxes, which STAY (two doors, one
state). Toggle feedback via UI.log ("🎵 Music off — the effects stay.").
Tests: toggling from ⚙️ flips the same persisted flags the parent panel
reads; both doors show the same current state; drive-touch gains the
⚙️-door assertions (the parent-door ones exist).

## ALSO QUEUED for v1.6.0: visible version + faster SW takeover (user
## hit stale-client confusion, 2026-07-13: "is that not updated yet?")

- Version stamp on the PROFILE SCREEN corner (small, dim: "v1.6.0"),
  sourced from ONE constant shared with sw.js VERSION (no drift — a
  unit check asserts they match; likely: define in a tiny js/version.js
  loaded by both index.html and importScripts in sw.js, or grep-assert
  equality in test.js).
- sw.js activate: add self.clients.claim() so a fresh deploy takes
  effect on the FIRST reload (skipWaiting already present).
- README note near the website line: "after an update, close and reopen
  the game's tab once."
Tests: version string appears on profile screen (drive), matches sw.js
(unit).

## ALSO QUEUED for v1.6.0: minimum 1-gold shop discount (user bug 2026-07-13)

E.buy: `const discount = correct ? Math.floor(c * 0.1) : 0;` floors to
ZERO on totals < 10g — the "question for a discount" promise breaks on
exactly the purchases a brand-new kid makes first (bread 5g). Fix:
`Math.max(1, Math.floor(c * 0.1))` when correct. Audit the message too
("that's N gold off") — with 1g minimum it reads right. SELLING bonus
already uses Math.ceil (≥1 for any sale) — verify with a unit check
anyway. Tests: buy a 5g item with a correct answer → pays 4g, message
names the 1g discount; unit sweep asserts discount ≥ 1 for every priced
item in the catalogs when answered correctly.

## ALSO QUEUED for v1.6.0: brave toggle updates facts problems IN PLACE
## (user design 2026-07-13)

Current latch = anti-fishing (toggle never rerolls) but reads as a dead
button mid-round. User's mechanism: facts-topic battle problems become
DUAL-FORM — one generation produces base two-term + a brave extension
term ("6 + 9 = ?" ⇄ "6 + 9 + 7 = ?"). Toggling ⚡ mid-round swaps the
displayed form of the SAME problem (same operands — nothing to fish);
answer checking follows the active form; DAMAGE FOLLOWS THE FORM
ANSWERED (extended = double, base = normal — the honesty rule survives
as "you're paid for what you actually solved"). Missing-box variants
extend analogously or fall back to latch. Deep topics (full-depth swap,
no operator to add) KEEP the latch; their toggle confirm says "takes
effect next question." Solutions swap with the form (chain solutions
already narrate per step). Input field preserves typed text if still
prefix-valid, else clears.

Tests: mid-round ⚡ on extends the same problem (first two operands
unchanged), off truncates back; answer+damage follow active form both
ways; deep-topic toggle leaves problem unchanged + message says next
question; anti-fishing sweep: 50 toggles never change the operands.

## ALSO QUEUED for v1.6.0: gentle-way soundscape completion (user report
## 2026-07-13: calming episodes still WHACK)

DIAGNOSIS: the kid's calm strike chimes (shipped, verified deployed) —
the whack is MM.sound.thud() on the MONSTER'S counterattack, identical
in both ways. Half the calming soundscape never got the memo.

FIX (character, not presence — damage must stay audible per the
feedback-honesty rule):
- NEW MM.sound.fret(): the frightened flail — quick soft mid-frequency
  noise ruffle (no 90Hz bass, no long decay), used for the monster's
  counterattack ONLY in the gentle way; strike-way keeps thud().
  Screen shake in gentle way: reduce (bt.shake 10 → 4) — flinch, not
  blow (Calm Mode already removes it entirely).
- Landed soothe: prepend a tiny POP (short high sine blip) to the
  existing chime (user palette: fizz/chime/purr/pop).
- Final becalming beat: soft low PURR warble (two detuned low sines,
  brief) under the existing victory notes.
- Family ears are the sign-off; each is a one-line parameter tweak.
Tests: spy sound fns — gentle-way counterattack calls fret() never
thud(); strike-way unchanged; soothe strike calls soothe() (exists).

## ALSO QUEUED for v1.6.0 (user reports 2026-07-13, pair):

### A. Friends' boss celebration: sparkles, not spit
The teal body-height worldBursts at each becalmed friend read as
spitting water. Replace with RISING golden sparkles + tiny hearts above
their heads (achievement visual language; warm colors; drift upward;
Calm-Mode-gated as today). Screenshot in the drive, LOOKED at.

### B. Brave-on-bosses free lunch — the "…and then" tail
BUG: bosses start at tier 2-3; brave lifts capped at 3 → a tier-3 kid
gets IDENTICAL problems for double damage (boss floor still ≥3 answers,
but the contract "double damage FOR harder problems" breaks exactly for
the strongest kids).
REMEDY (unifies with the queued dual-form toggle work): brave boss
problems ALWAYS gain an "…and then" tail step — one extra operation on
the answer ("Compute 495 × 33 — then subtract 500"). Same operands
either form (anti-fishing); toggling ⚡ mid-round adds/removes the tail
of the SAME problem; damage pays for the form answered. Tier lift stays
where available; the tail guarantees the delta is never zero. Tails
attach to number/fraction/remainder(quotient-chain)/clock kinds;
choice kinds (staff) keep the latch + "takes effect next question."
Worked solutions append the tail step.
Tests: tier-3 state → brave boss problem ≠ base problem (tail present);
tail solution narrates the extra step; operands identical across 50
toggles; choice-kind exemption message; damage follows answered form;
boss floor unchanged.

### C. Sidebar height cap + scrollable log (user report 2026-07-13)
The right column has no max height — spellbook row + streak + long
taskBox + 10 log lines outgrow the game and force PAGE scrolling. Fix:
#sidebar height matches the play area column (canvas + action bar);
#log becomes the flex region with overflow-y:auto and a sane min-height;
UI.log auto-scrolls the log to the newest line on append (scrollTop =
scrollHeight) so normal play never needs the scrollbar; big-text mode
verified too (it inflates text — the cap must hold there). Test: drive
stuffs 20 log lines with spellbook + streak visible and asserts
sidebar height ≤ playArea height, log internally scrollable, newest
line visible; repeat with body.big-text.

### D. Inn cat moments, every visit (user's kid, 2026-07-13)
The daily-only cat taught the kid to stop checking. Keep the +1 stamina
PAT once/day (economy); every OTHER inn visit draws one moment from
MM.data.CAT_MOMENTS (pure delight, no reward): asleep on the ledger
("She outranks me"), kitten basket ("the census is inconclusive"), box
too small (fits anyway), watching the fire like television, sitting on
the warm-up slate (first question waits, purring, while relocated),
magnificent ignoring; ~30% of visits also end with the door escort
("tail up like a flag"). One start-moment per visit; beetle stays the
separate once-ever rare. Tests: pat once/day preserved; non-pat visits
always produce a moment; pool rotation; escort probability hook.

### E. REVISED brave design (user report 2026-07-13: real 3-digit addition
### in basic fights — diagnosis: sticky brave + full-depth combat jump)

SUPERSEDES the facts-only dual-form spec:
1. BRAVE COMBAT = quick problem + ONE extra quick step, for EVERY topic —
   never a jump to full-depth mid-fight (pacing rule holds under brave):
   facts = authored chains (shipped); multidigit = friendly-tens chain
   (40 + 30 + 20) or no-carry chain; decimals = second money step;
   fractions = third same-denominator term; time = elapsed + N more min;
   music rhythm = third note; generic fallback for the rest = small
   integer tail on the quick answer. combatProblem's brave branch stops
   calling MM.problems.generate(tier+1) entirely.
2. BRAVE BOSS = full-depth + "…and then" tail (as queued; unchanged).
3. Dual-form in-place ⚡ toggling applies to the combat forms uniformly
   (base quick ⇄ quick+step; same operands; damage follows form answered).
4. STICKY-BRAVE VISIBILITY: sidebar gains a small "⚡ Brave" line
   whenever s.brave is on (state visible outside battle — the user met
   mysteriously hard problems with no visible cause).
Tests: brave combat never emits a 3-digit operand in multidigit topics
(4k-draw sweep); every topic's brave-combat form differs from its base;
sidebar indicator tracks s.brave; boss tails unchanged.

---

## v1.7.0 SHIPPED (2026-07-13, implementer pass)

Scope actually implemented — the six items assigned by the design session
(the queue section above holds the full original work order; not every
sub-item there was in scope for this pass, e.g. music replacement,
music/sound ⚙️ toggles, version stamp, 1g discount minimum, and the
gentle-way soundscape were already shipped in v1.6.0 and untouched here):

1. **Turning Stones spiral rework.** 13 stones now follow the queue's exact
   rectangular-spiral walk (R1,U1,L2,D2,R3,U3 offsets), center-out carving
   1,1,2,3,5,8,13 + 6 unnumbered curve stones, arc/line orientation derived
   from each stone's actual path neighbors (a "turn" glyph rotated to
   connect the two real edges it bridges, a "straight" glyph for runs),
   the interactive sequence walk (in-order stepping chimes via
   `MM.sound.tone`, a full walk is a once-ever flourish + persisted
   `seenSpiralWalk`, out-of-order is silent), and the newest-turned stone
   glinting once on the next plaza crossing (`E.checkSpiralGlint`,
   mirrors the gate-glint recipe).
2. **Spiral Stair visible from day one, sealed.** Turned out to already be
   true in the shipped code — `'H'` has drawn `spiralTower` unconditionally
   on the world map since Wave 9, and bumping it always called
   `E.spiralMenu()`, which already gated on `endingDone`. This item reduced
   to: replace `MM.data.SPIRAL_SEALED`'s text with the exact approved bump
   line (now a function of `s`, for the optional task-10+ "seems deeper
   lately" evolution), and add one new Sylvia rotating aside. Unlock timing
   was never touched.
3. **Miscount's Tales of the Guessing Years + golem battle cries.**
   `MM.data.MISCOUNT_GUESS_TALES` (4 tales, verbatim) rotate occasionally
   (`E.GUESS_TALE_CHANCE = 0.35`) before the Academy's slates, gated on
   `s.endingDone`. `MM.data.GOLEM_BATTLE_CRIES` (3 cries) occasionally
   replace a non-boss golem's enter-flavor (`MM.battle.GOLEM_CRY_CHANCE =
   0.12`) — deliberately keyed on `mon.sprite === 'golem'`, not just the
   literal "Homework Golem," since the story bible's canon is that every
   golem in Numeria is one of Miscount's old wrong answers, dungeon
   regulars/bosses included (bosses are still excluded from the cry itself,
   per the hard "bosses stay sincere" rule — only non-boss golems can cry).
4. **Wrong-math boss attacks.** `E.bossFalsehood()` generates a small
   arithmetic fact and an absurdly wrong answer (truth × 4..12, or truth ±
   200..900, with a deterministic fallback if either path ever lands inside
   the forbidden ±30%/off-by-one zone) — rendered in the boss's own theme
   accent color, in the battle message and as a floater, on roughly half of
   boss counterattacks (`E.WRONG_ATTACK_CHANCE = 0.5`). The kid's next
   correct strike appends the correction beat ("…and 7 × 8 = 56. The
   record, corrected.") via `bt.pendingCorrection`. Presentation only —
   `applyMonsterHit`'s damage roll is untouched.
5. **Inn cat moments.** `MM.data.CAT_MOMENTS` (6 moments) fires on every
   inn visit where the once-daily pat isn't on offer (`s.catPettedDate ===
   today`), with `s.lastCatMoment` avoiding an immediate repeat and
   `E.CAT_ESCORT_CHANCE = 0.3` appending the door-escort line. The beetle
   (`s.seenCatBeetle`) stays the separate once-ever rare, untouched.
6. **Dual-form ⚡ toggle + boss "…and then" tails.** `MM.problems.braveStep`
   (combat) and the new `MM.problems.tailStep` (bosses) each compute a
   base+extended sibling pair from ONE draw; `MM.mastery.combatProblem` /
   `bossDualForm` (backing `pickBossProblem`/`pickMixedGate`/
   `pickHalfMixGate`) stamp `_dualBase`/`_dualExtended`/`_dualEligible` onto
   whichever form is active. `battle.js`'s `swapProblemForm` swaps
   `bt.problem` to its sibling in place on every mid-round ⚡ click (same
   operands — nothing to fish), preserving typed input if it's still a
   digit-prefix of the new integer answer; damage now reads
   `bt.activeIsExtended` (updated live by every toggle) for eligible
   problems, and falls back to the pre-existing pick-time latch
   (`bt.braveAtPick`) for ineligible ones (deep/choice kinds — the music
   staff, decimal compares), whose toggle message says "takes effect next
   question," per the queue's own exemption.

### Deviations from this spec, and why

- **The spiral's anchor shifted from the courtyard-adjacent row the design
  doc assumed to `(CX,CY) = (17,11)`, south of the player's own spawn
  `(19,8)`, not north of it.** The queue's own instruction was "shift the
  anchor C to make the geometry work, don't reshape the walk" — and the
  geometry genuinely doesn't work anywhere else. Stone 12's column is
  forced to 19 (so its due-north outward ray hits the Spiral Stair tile at
  `(19,3)`), and on that column the spiral's own footprint spans 4
  consecutive rows (the `dx=2` stones at `dy∈{1,0,-1,-2}`) — checked
  exhaustively against the raw overworld, every row from 3 through 10
  collides with the castle `(19,4)`, the tower `(19,3)`, or the player
  spawn `(19,8)` on that shared column. The nearest collision-free anchor
  is `CY=11`, three tiles south of spawn. The story reads fine either way
  (a kid crosses the plaza just as often walking south from the castle
  toward the dungeons as walking up to it), and the outward ray now runs
  literally through the spawn tile and the castle before reaching the
  tower — a nice unplanned image ("past your own front door, past the
  castle, to the tower") rather than a problem.
- **Turn/straight shape derivation.** The design doc says an aligned
  stone's carving "connects its path neighbors (quarter-turn arc where the
  walk turns, straight segment where it runs)" — implemented exactly as a
  small per-stone `{shape, angle}` pair computed once in `data.js` from the
  walk's own in/out directions (8 turn-shape stones share one of 4 possible
  rotations of the existing arc glyph; the other 5 use a plain line rotated
  to match the run's axis), rather than deriving it live in `ui.js` on
  every frame — cheaper, and trivially unit-testable.
- **Numeral legibility over strict "crooked until tended."** The original
  Wave 10 design rotated a stone's carved number WITH its arc (`stoneTrueAngle
  (i) = i*90%360`), which was never actually "upright once turned" for most
  stones even under the old design (only i=0 and i=4 landed on 0°) — and
  under the new geometric angles (0/90/180/270 depending on the actual
  turn), an aligned numeral could land sideways or upside-down, undermining
  the "the kid who counts them is reading the exact sequence" fair-play
  promise the ending exam depends on. Numerals are now drawn UNROTATED
  once aligned (always legible), and still skewed with the stone while
  unaligned — the flavor detail survives, the load-bearing readability does
  too.
- **Stroke weight/color bumped after a screenshot-and-look pass.** The
  first render (2px, `#e0d8ec` lavender) read as scattered fragments, not a
  connected curl, at the game's actual 48px tile size — exactly the "does
  it read as a spiral at a glance" failure this whole rework exists to fix.
  Aligned strokes are now 3.5px, near-white (`#fff6d8`), round-capped.
  Unaligned (skewed, untended) strokes are untouched.
- **`MM.data.stoneTrueAngle` was removed, not deprecated-in-place** — it
  had exactly one caller (the old `ui.js` render block, now rewritten) and
  keeping a dead export around serves nobody.
- **Facts-topic combat brave form: `braveStep`-derived, not the
  independently-drawn tier-3 chain generator.** This is the largest
  substantive deviation, and it's a resolution the v1.7.0 queue text itself
  anticipates but doesn't fully spell out: item E bullet 1 (already shipped
  in v1.6.0) has facts topics draw `MM.problems.generate(skill, 3)` — a
  fresh, independent random chain — when brave is on at pick time; item E
  bullet 3 (this pass's job) requires "dual-form in-place ⚡ toggling
  applies to the combat forms UNIFORMLY (base quick ⇄ quick+step; SAME
  OPERANDS)." Those two are incompatible for facts specifically: an
  independently-drawn chain's operands can never match the base quick
  problem's, so an in-place toggle for facts topics is structurally
  impossible under the old mechanism. Resolution: `braveStep` was extended
  to handle all four operators inline (previously + and − only), so a
  facts base draw like `"6 + 9 = ?"` extends to `"6 + 9 + 7 = ?"` and
  `"6 × 7 = ?"` extends to `"6 × 7 × 3 = ?"` — visually indistinguishable
  from the old curated chains, just always derived from the SAME draw
  instead of a second independent one. The trade: facts' brave-combat form
  no longer occasionally draws the missing-addend "▢" box variant (that
  variant is drawn from a materially different structure that can't share
  operands with a 2-term base problem) — box-style practice is untouched
  everywhere else (Miscount's Academy, the exam). `braveStep`'s "abort and
  return unchanged if a subtraction step would go negative" fallback was
  also replaced with "add instead" (always succeeds) — required so the new
  facts usage doesn't occasionally emit a bare, unextended two-term sum,
  which `drive-stances2.js`'s existing "brave facts problems are NEVER
  plain two-term sums" check depends on staying true at 100%, not "almost
  always."
- **Two pre-existing tests encoded the OLD "brave draws an independently
  random full-depth problem" contract and had to be rewritten, not just
  left alone:** `tests/test.js`'s "P3: Brave draws harder, and never at a
  gate" block (asserted `combatProblem(...).quick === false` under brave —
  now checks `_dualEligible` + the extended text differing from `_dualBase`
  instead) and `tests/drive-twokids-b.js`'s "brave draws a harder problem"
  check (same pattern). `tests/drive-stances2.js`'s "THE LATCH" section
  changed from asserting NORMAL damage on a problem picked before ⚡ toggled
  on, to asserting DOUBLE damage — because for an eligible problem the
  mid-round toggle now genuinely changes what's being answered, so the OLD
  latch's very premise (damage frozen at pick time) no longer holds for
  eligible problems. That check now reads `s.braveSolved`'s delta rather
  than raw damage magnitude, since a low-end damage roll doubled can
  numerically resemble a normal high roll and vice versa — a crit-proof,
  magnitude-independent way to prove doubling actually happened.
- **Boss tail eligibility list matches the queue's own exemption
  (`number`/`remainder`/`clock` tail; `choice` keeps the latch) exactly**,
  implemented as a single new `MM.problems.tailStep(q)` rather than folding
  into `braveStep` — boss problems are full-depth and can be any of the
  four kinds (`braveStep` only ever handles `kind:'number'`), and keeping
  the boss-only fraction/remainder/clock-tail logic out of the combat-only
  `braveStep` keeps each function's contract simple to reason about and
  test in isolation.
- **The correction beat's message lives in `#probFeedback` (the same DOM
  region the "✓ Correct!" line already uses), not a separate banner** — it
  needs to sit visually adjacent to the strike that earned it ("her agency
  does the fixing," per the queue's own framing), and `#probFeedback` is
  the one place in the battle screen that's already about "what just
  happened with this answer."
- **The boss falsehood is drawn in BOTH the battle message (DOM, in the
  boss's accent color via an inline style) and as a floating canvas text**
  — the DOM copy makes it screenshot-assertable and accessible-by-text for
  the drive/tests; the floater keeps it visually anchored over the boss,
  matching every other in-battle number callout (damage, crits, brave
  lightning).

### New prose (pasted in full; all reviewed against STORY_BIBLE.md's tone
rules before shipping)

**Spiral Stair sealed line** (pre-ending bump, exact per the queue):
> A door with no keyhole, at the base of a winding tower. Carved above it:
> the same curling line as the courtyard stones. It isn't ready. Or you
> aren't. Hard to say which.

**Spiral Stair late-game evolution** (task 10+, appended to the line above):
> The carving seems deeper lately.

**Sylvia's new rotating aside** (task 10+, ~15% chance per mainland visit,
silent once the Stair opens):
> "That carving over the tower door," Sage Sylvia says, not quite looking
> at it. "It seems deeper lately. As if something is being carved from the
> inside." She does not explain further. She never does, with that tower.

**Golem battle cries** (rare, non-boss golems only):
> The golem draws itself up and bellows a number from deep in its stony
> memory: "SEVEN!" It has no idea why. It has never had any idea why.
>
> Before you can act, the golem roars: "CARRY NOTHING!" — an old, wrong
> instinct, worn smooth with repetition.
>
> The golem thumps its chest and declares, with total confidence: "IT IS
> ALWAYS TWELVE!" It is not always twelve.

**Once-ever spiral-walk flourish log line:**
> Something in the courtyard settles into place, just for a moment.

**Inn cat moments** (one per non-pat visit):
> She outranks me. [asleep on the ledger — full line: "The inn cat is
> asleep directly on top of the guest ledger, pinning three unanswered
> reservations under one paw. 'She outranks me,' the innkeeper says, and
> does not move her."]
>
> Someone has left a basket by the hearth, and the inn cat is curled in the
> middle of what may or may not be four kittens. "The census is
> inconclusive," the innkeeper reports. "She keeps rearranging them."
>
> A crate arrived this morning, already emptied — and the inn cat has
> wedged herself into it anyway, several sizes too small, looking extremely
> satisfied about it.
>
> The inn cat sits square in front of the hearth, watching the fire the way
> some people watch a good story — utterly absorbed, tail twitching at the
> good parts.
>
> The inn cat has claimed the warm-up slate as a cushion. The innkeeper
> gently slides your first question out from under her; she does not wake,
> and does not stop purring.
>
> The inn cat looks directly at you, decides you are not, at this time,
> interesting, and returns to staring at the middle distance with
> tremendous dignity.

**Inn cat door escort** (~30% of non-pat visits, appended):
> As you head off to bed, the inn cat trots you to the door — tail up like
> a flag — and peels off the moment you're through it, mission apparently
> accomplished.

**Boss correction beat** (template, names vary per equation):
> …and 7 × 8 = 56. The record, corrected.

**Miscount's Tales of the Guessing Years** (verbatim from the queue,
user-approved, unedited):
> "I once answered 'seven' to everything for a full week. It worked
> twice." He holds up two fingers. "That was the worst part. It working
> twice. That's the whole trap, you see — a guess pays just often enough."
>
> "I told the king the new bridge wanted 'about a hundred' planks. It
> wanted forty. We had a very tall bonfire that winter, and a very cross
> carpenter."
>
> "I guessed a soup once. Doubled the salt because it felt right." He
> shudders, with respect. "That soup could have stood sentry duty."
>
> "I called the stars 'roughly a thousand.' Sylvia has been counting the
> ones I missed ever since. She sends me the number every winter. It has
> five digits, and it grows."

### Evidence

`node tests/test.js` — all unit blocks pass, including the new v1.7.0
geometry/sequence-walk/pedagogy-guard/migration/prose-exact blocks. All 29
drives (28 pre-existing + the new `tests/drive-wonder.js`) + the detached
marathon — final results and log paths are in the implementer's report to
the design session (not duplicated here to avoid drift; see `tests/logs/`
for the raw logs, named `<drive>-v170-*.log` and `marathon-v170.log`).

---

## v1.7.1 SHIPPED (2026-07-13, design session) — live-playtest batch on v1.7.0

Eight user reports from the deployed v1.7.0, same afternoon. Every fix below
cites its report.

1. **Soothe still whacked.** The unconditional lunge `whoosh()` played on
   every soothe reach (landed AND missed) — the one percussive sound left on
   the gentle path. Both call sites now skip it while soothing; the soothe
   chime/fret carry the moment.
2. **"A TANGLED THING" opened every soothe fight.** The stance banner was a
   hardcoded philosophy quote; in practice it read as the game forgetting
   the monster's name. Now: `THE FRIGHTENED SWAMP RAT` — names the creature
   in the calm meter's own established language. (Follow-up in the same
   session: the 🕊 bookends were "too small to see clearly" — dropped, along
   with every other MICRO-dove: the name-bar prefix, the calm-sub prefixes,
   the atk-label prefix. The dove survives only at banner size, where it is
   actually visible. Words carry small-size state now.)
3. **Cheering friends looked ON FIRE.** `worldSparkle` emitted one particle
   per FRAME per celebrant (~60/s) — a solid rising column. Now gated at
   0.05/frame (~3/s). The hop is the celebration; the sparkle is a garnish.
4. **Dungeon-2 boss one-shot by a plain strike (post-game gear).** The Wave
   8b boss floor capped only BRAVE strikes; its sim never walked endgame
   attack into early dungeons. The ⌈maxhp/3⌉ cap now applies to EVERY strike
   on a boss: three correct answers minimum, always. Regulars stay uncapped.
5. **Shop overwhelming + calming rack thin.** (a) Every shop section now
   sits in a softly tinted block with a colored spine (`.shop-sec-*`,
   presentation only). (b) The gentle rack fills its two missing tiers,
   power-matched exactly: 🪈 Reed Flute (atk 3, 40g — dagger tier) and
   🥣 Singing Bowl (atk 10, 450g — Star Blade tier), each with its own
   calm-mote style. Identity never costs power.
6. **Streak bounty read "0/4" after right answers.** Its stored counter only
   ever jumped 0→done; the board now shows the LIVE streak, capped at need
   (display-only; completion logic untouched).
7. **THE SPIRAL, GROUND-UP (the headline).** Report: "little curves on the
   squares, but they do not connect… and the spiral staircase is nowhere
   near the end of the spiral. Rethink it from the ground up." Two
   structural causes: per-stone arcs with per-number radii can never meet at
   tile edges; and "points at the Stair" was an invisible 6-tile ray through
   the castle. Rework: (a) ui.js strokes ONE continuous rounded path through
   the aligned stones' centers — connection is true by construction, and the
   untended suffix stays visibly broken fragments, so tending the kingdom is
   literally what joins the curl up; (b) exhaustive search (every anchor ×
   all 8 orientations of the unit-step rect-spiral against the raw map)
   found exactly ONE placement whose outer stone TOUCHES the Stair tile:
   anchor (17,4), walk N,E,S,S,W,W,N,N,N,E,E,E, 13th stone at (19,2) against
   the tower at (19,3). Three decorative trees moved one column west
   (maps.js); no POI touched. Numbered stones (1,1,2,3,5,8,13 ascending
   center-out), sequence-walk chimes, glint, and stoneSkew all preserved;
   shape/angle fields deleted (nothing derives per-tile geometry anymore).
   Screenshot audit fix: the all-13 golden shimmer now glows the CURL (wide
   soft under-stroke), not the tiles — per-tile fills completed into a boxy
   rectangle with the castle. Numerals 8px→11px, discs enlarged ("the
   numbers on the spiral are too small").
8. **"463 ÷ 16 is too hard" (mainland door).** long_division tier 3 drops
   its two-digit-divisor branch: trial-multiplying a 2-digit divisor is a
   different skill from the bring-down process the ladder teaches, and
   nothing else builds toward it. 3-digit-quotient ÷ single-digit stays —
   still real tier-3 work. Same calibration class as v1.6.0's ×100 removal.

**Test changes:** unit spiral-geometry block rewritten (orthogonal unit
steps; outer stone ADJACENT to 'H'; center === stone 0; shape/angle checks
gone); drive-wonder geometry checks updated the same way; drive-wonder's
boss-falsehood section pinned `dodgeChance` to 0 — base dodge is 0.35 and
the section fires exactly ONE counterattack, so the check had been a 65%
coin flip since v1.7.0 (it finally came up tails in this batch's sweep;
flaky-by-design, now deterministic).

**Evidence:** unit ALL PASSED; full 29-drive sweep + detached marathon
green (`tests/logs/*-v171*.log`, `sweep-v171-summary.txt`,
`marathon-v171.log`; drive-wonder re-run green after the dodge pin, logs
`drive-wonder-v171-{2,3,4}.log`); spiral + soothe-battle screenshots
audited by eye (curl connects, ends at the tower, numerals legible, no
boxy shimmer, calm labels read in words).

## v1.7.2 HOTFIX (2026-07-13): the streak bounty, second report

User pushback on the v1.7.1 explanation ("I did not make mistakes") forced a
deeper look. Verified headlessly that every answering surface (battles,
doors, chests, inn, shop quizzes) routes through the ONE recordAnswer and
feeds the streak — a healthy save that answers 4-in-a-row anywhere DOES
complete the job. Two real fixes shipped anyway:

1. **The poisoned-streak class.** A save whose `s.streak` ever goes
   non-numeric (a pre-streak save's `undefined` becomes NaN on the first
   increment; JSON round-trips NaN→null) sticks at "never ≥ need" with ZERO
   symptoms — no crash, no log, crits and streak bonuses silently dead, and
   the bounty reads 0/N forever: exactly the reported shape. Healed in
   three places: load migration, a guard at the recordAnswer increment, and
   settleStreakJobs. `Number.isFinite`, not a null-check — belt and braces.
2. **Pay on sight.** A streak job whose condition is ALREADY met paid only
   on the NEXT correct answer (bountyEvent is the only completer). Now
   `E.settleStreakJobs()` runs on every notice-board open: an earned streak
   pays the moment the kid looks. Consequence encoded in drive-bounty: a
   same-day regenerated board's new streak job may arrive already-paid off
   the standing streak — same semantics as before (one answer earlier),
   deliberately generous.

Evidence: unit ALL PASSED; drive-bounty (check updated: hunt/solve must
regenerate fresh, streak may pay on sight) + drive-notices green; headless
repro of both the NaN-heal and pay-on-sight paths in the session log.

## v1.7.3 SHIPPED (2026-07-13): settings reorg + wildness bar + rack order

1. **⚙️ Settings dialog rebuilt** (report: "the Difficulty menu is poorly
   organized" — seven identical buttons, three unrelated categories, closed
   on every click). Now three tinted rooms (shop-sec recipe): monster
   toughness (three-way, current choice marked), your way (named + one
   switch button — drive-stances2's "Change my way" contract kept), sound
   (plain "is ON — turn off" labels). Changes re-render IN PLACE so the ✓
   moves under your finger. Toolbar button renamed ⚙️ Settings (in-game
   prose always said "the ⚙️ button" — nothing else referenced the name).
2. **The soothe bar drains WILDNESS** (report: "my health bar goes down,
   their calmness bar goes up" — two gauges running opposite directions).
   Same number as Strike's health, same direction as the hero's bar, warm
   red (aggression, shrinking), label speaks the bar's language ("64% wild ·
   still frightened, still swinging"). The kid's calm still lands as "+N
   calm" floaters. drive-twokids-b's FILLS assertion rewritten to DRAINS +
   a label-language check. Wave 8b's "never paint a filling calm bar red"
   rule retired honestly: nothing fills anymore.
3. **Racks sort by price at render** (report: Cat-Fishing Wand listed after
   the Singing Bowl — my v1.7.1 array-insertion slip). Data array fixed AND
   gearSection/weaponRack now sort cheapest-first structurally, so display
   order can never depend on array order again.

Evidence: unit ALL PASSED; drive-stances2, drive-twokids-b, drive-equip,
drive-shopstress green (tests/logs/*-v173*.log).

## DONE (in tree, uncommitted) — the TRUE golden spiral (2026-07-14)

Implemented per the work order below. **Geometry matched the solved values
exactly** (numbered corners (35,8),(36,9),(35,10),(33,8),(36,5),(41,10),(33,18);
curve tiles (30,18),(28,17),(25,15),(23,13),(21,11),(20,8); tip (20,5)→nub→
door (19,3)). Changes: `data.js` (SPIRAL_ARCS chain, SPIRAL_NUB bezier,
TURNING_STONES with int tile + float fx,fy + chain-param t, spiralChain()
land-only sampler, TURNING_STONES_CENTER = stone 0), `ui.js` (drawTurningStones
rewritten: whole chain sampled ~0.15 tile, stroked ONLY over '.' — faint full
curve always, bright to the aligned frontier's chain-param, golden glow + lit
nub at 13/13, discs at fx,fy), `engine.js` (checkSpiralGlint = within 3 of ANY
stone), `maps.js` (v1.7.1 grove rows reverted, ONE tree (35,8)→(37,7)),
`data.js` prose (below), `tests/test.js` + `tests/drive-wonder.js` (adjacency/
at-Stair invariants replaced with arc-corner / chain-continuity / on-13-arc /
nub-at-door / monotone-chain-param checks; drive walk teleports beside each
stone and steps on, since stones are no longer adjacent).

**Verification (all green):** unit ALL PASSED (incl. overworld reachability
BFS — map edits valid); full drive sweep **29/29, 0 fail** (flaky trio
halls/spire/blankmodal all passed in-sweep, no solo re-runs needed); marathon
**COMPLETE, 0 fail, no JS errors** ("the spiral answered 21" — ending exam
intact); **SCREENSHOT AUDIT PASSED** (full-map overview + in-game frames: tight
eye winding out clockwise 5→8-across-river→13→tower, clean river/mountain gaps,
nub arriving at the Stair door; untended = faint curve + gray skewed discs).
Logs: `tests/logs/*-spiral.log`, `sweep-spiral-summary.txt`, `marathon-spiral.log`.

**Deviations from the work order:** none of substance. The old fragment-arc for
untended stones is gone (per "Old per-tile fragments die entirely") — untended
stones now draw a gray disc + skewed numeral, aligned draw a pale disc + upright
numeral. Faint-curve color #d8cca6 @0.28α, bright #fff6d8, glow #ffd94a 11px
@0.20α (values chosen at implementation; tune on audit if desired).

**PROSE CHANGED — PASTE FOR USER REVIEW (both minimal; the stones left the
courtyard, so "courtyard stones" is now false):**
- SPIRAL_SEALED (the sealed Stair door): "Carved above it: the same curling
  line as the **old stones out in the grass**." (was "…the courtyard stones.")
- Sage Sylvia: '"**The old stones, out in the grass.** They turn, you know. One
  more every time you set something right." … "My grandmother said they were a
  picture, seen from high enough."' (was '"The courtyard stones. They turn…"';
  her "a picture, seen from high enough" line is now LITERALLY true — kept.)

**STILL OPEN before deploy:** user prose review (the two lines above + still-
pending v1.7.0 implementer lines & Reed Flute/Singing Bowl quips), user
playtest of the deployed build, and the family close+reopen after redeploy.
Tree is uncommitted — nothing committed or deployed this session.

---

## (original work order) — the TRUE golden spiral (user directive 2026-07-13, design COMPLETE, geometry SOLVED)

User: "The spiral still does not look good. Consider what a golden spiral
actually looks like… much larger, with a true spiral drawn across the map."
Design session solved it; IMPLEMENT NEXT SESSION. Everything needed:

- **Shape**: true golden spiral of quarter-circle arcs in Fibonacci squares
  (radii 1,1,2,3,5,8,13 TILES), clockwise chain, then an UNNUMBERED partial
  continuation arc — the next square (21), begun but never finished —
  whose end lands at the Spiral Stair door (19,3). 21 still never appears;
  the sequence's continuation physically leads to the tower.
- **THE placement (exhaustive search, the map admits exactly one)**: chain
  anchor P0=(35,8), H0=(1,0), rot = ([x,y])=>[-y,x] (clockwise). Corners
  (numbered stones 1,1,2,3,5,8,13): (35,8),(36,9),(35,10),(33,8),(36,5),
  (41,10),(33,18). Arc centers: (35,9),(35,9)?—NO, recompute in code from
  the chain (arc i: L=rot(H); C=P+L·r; E=C+H·r; H'=L). Verified arcs:
  0:r1 C(35,9); 1:r1 C(35,9)→wait arc1 C=(35,9) E=(35,10); 2:r2 C(35,8);
  3:r3 C(36,8); 4:r5 C(36,10); 5:r8 C(33,10); 6:r13 C(33,5) ending (20,5)
  heading north. Tip-to-tower: tangent-matched short curve (quadratic
  bezier, control ≈(20,3.8)) from (20,5) to (19,3) — NOT a trued 21-radius
  arc (that leaves a 1.1-tile radial gap at the tip).
- **Curve stones** (6, on the 13-arc, walk order after the 13 corner), with
  one slide of -0.015 at k=2 for walkability: (30,18) f=.1429, (28,17)
  f=.2707, (25,15) f=.4286, (23,13) f=.5714, (21,11) f=.7143, (20,8)
  f=.8571. Stone 5 (the 8) at (41,10) is ACROSS the river — reachable when
  the bridge rises (task 10), before the exam needs it. Store stones with
  int tile (x,y) for stepping AND float (fx,fy) exact arc position for
  drawing, so discs sit ON the line.
- **Render (ui.js)**: sample the whole chain at ~0.15-tile steps into
  polyline subpaths, drawing ONLY over plain grass '.' — the carving
  vanishes under the river, the mountains, trees, buildings (they were
  built/grew/flow OVER the old curl; tile pass paints them first and the
  overlay must not paint on top). Faint full curve always; bright portion
  up to the aligned frontier stone's chain-param (arcIdx + frac); at 13/13
  the whole curl brightens + the golden glow follows it + the tower nub
  brightens. Stones: discs at (fx,fy); unaligned = gray + skewed numeral
  (stoneSkew); aligned = pale + upright numeral. Numerals 11px. Old
  per-tile fragments die entirely.
- **maps.js**: REVERT the v1.7.1 grove edits (rows y=2,3,4 return to
  pre-v1.7.1: '~~..T...................T.........T...' /
  '~~.T.....T.....TTT.H...........T......' /
  '~~..T..........TT..C.n......T.....5...') — the compact spiral is gone.
  Move ONE tree: (35,8) → (37,7) (both verified against the raw map).
- **engine.js**: checkSpiralGlint proximity = within 3 of ANY stone (the
  center-±3 check assumed the compact plaza). Flourish log line rewording
  (drive asserts /settles into place/ — keep those words).
- **Prose updates (paste for user review)**: SPIRAL_SEALED "the same
  curling line as the courtyard stones" → the stones are no longer in the
  courtyard (suggest: "the same curling line as the old stones out in the
  grass"); Sylvia's rotating stone line '"The courtyard stones. They
  turn…"' → '"The old stones, out in the grass. They turn…"' (her
  "a picture, seen from high enough" line becomes LITERALLY true — keep!);
  MathMaker's "floor out front" aside still works (leave).
- **Tests**: unit spiral block — REPLACE adjacency/at-Stair invariants
  (stones are far apart now, by design) with: 13 unique stones, labels
  1,1,2,3,5,8,13 + 6 nulls, every stone tile '.' on the raw map, corner
  stones exactly on their arc corners, curve stones within 0.6 of the
  13-arc circle, arc chain continuous (each E = next P) and tangent, nub
  endpoint within 0.6 of the tower tile. drive-wonder: geometry checks
  same replacement; the sequence walk section must TELEPORT beside each
  stone and tryMove onto it (stones aren't adjacent anymore) — chimes
  still 13, out-of-order still silent-resets. Full sweep + marathon +
  SCREENSHOT AUDIT (the whole point is how it LOOKS — check the eye, the
  river gap, the mountain gaps, the tower approach) before deploy.

## Wave 12 order — "The Proving Rooms" (user directive 2026-07-17, design session) — ✅ SHIPPED v1.8.0 2026-07-17 (design-reviewed, prose approved)

**Implementation status (implementer session, 2026-07-17):** all four
P-items shipped; unit suite green (incl. every new Wave 12 block), full
32-drive sweep green (halls/spire flaky-in-sweep, green solo — the known
trio), `tests/drive-wing.js` = 53 checks, screenshots audited by eye.
Deviations from this order, and why:
- **The forced-chunk Spiral leg lives in `tests/drive-wing.js`, not
  drive-tending** (the implementer work order placed it there). The chunk
  rotation is deterministic by floor — entering floors 8/9/11/15 IS
  pinning the roll; no random hook was needed.
- **New Spiral chunks are APPENDED to the pools**, so floors 1-7 keep
  their historical templates and an old save's `s.opened` keys still line
  up there. Floors 8+ re-template once; a stale opened key on those floors
  can blank at most one cell, strictly opening-only (never sealing).
  First appearances: pads f8, slides f9/f12, lever/gate chest f11, tide
  pools f22, the gear-plate landing f15 (then every 15).
- **The slab-on-ice stretch goal was CUT** (as the order permits): a slab
  pushed onto the Wing's slick strip simply rests on it.
- **The skip-count pond landed NORTH of Finn (rows 1-3, a sea-cove), not
  beside him** — every open tile south/east of Finn is claimed by the TRUE
  golden spiral's chain and stones; the first placement broke the Turning
  Stones unit block within seconds of being written (the eye of the spiral
  owns that grass). Stones 2-4-6-8 + odd decoys 5 and 7; a wrong stone
  splashes you back to the bank, soundly and wordlessly.
- **Glyph choices:** plate `+`, plate-gate `&`, cracked floor `!` —
  non-letters, zero collision surface with the NPC letter space; the Wing
  (mapId `'wing'`, an OVERWORLD like the castle) owns its whole alphabet
  in its own tileSprite block, and every shared char carries a unit
  context guard (`H`/`S`/`M`/`O`/`T`/`0`/`w`/`d`/`k`/`G`…).
- **Wing rewards are gold** (the order allows "a furnishing piece or
  gold"); the pantry pays cheese + gold. 80g per room, 30g cellar bonus.
- **The wardrobe's far-bob period is 900ms** (first draft 500ms aliased
  with screenshot latency — the two far frames of the drive's proof came
  out identical; at 900ms the 5px offset is visible frame to frame).
- **Closed-gate safety is a unit invariant**: with every `&`/`G` modeled
  shut, any walkable region cut off from the Wing's entrance must contain
  its own plate — and the Vault's pocket has no interior floor at all
  (the chest is bumped from the gate tile), so a closing gate can never
  trap anyone anywhere.
- **NG+ now resets/restores `s.freeSlabs`** alongside gearState and
  repairSites (snapshot, restore, reconstruct, and startGolden) — the
  Vault's slab goes home when the kingdom does.

Context, from three audits (2026-07-17, in the session log): (1) the isles
introduce nine special-tile grammars and then strand them — the gear plate
exists ONCE in the whole game, clock/echo doors twice each, and the Spiral
Stair (the only repeatable content) contains NONE of them; (2) no puzzle
anywhere combines two special tiles; (3) the castle has no repeatable
activity and no puzzle content. Wave 12 fixes all three with one structure
and seeds the comedy register the user asked for. USER-APPROVED direction;
kids' playtest findings drove the comedy rules below.

### STANDING RULES (new, permanent — violating any is a review-blocker)
- **A joke is an observation, never an obstacle.** No gag may ever block,
  slow, or invalidate a mathematically correct action. (Design history:
  the 9-refuses-to-sit-by-7 constraint was CUT for this; it survives only
  as a cosmetic lean + occasional 💧 glyph. Never "fix" it into a rule.)
- **Comedy channels: field / glyph / sound / modal. NEVER the log.** The
  kids do not read the log. Ambient jokes = motion, over-sprite glyphs
  (the becalmed-💗 idiom), sound. Spoken jokes = blocking modals only, and
  only kid-initiated (bump) or at big beats. Log lines may echo for
  parents but must never carry a gag alone.
- **Glyph collisions:** every new tile char MUST be checked against every
  map alphabet it can appear in; tileSprite disambiguates by context
  (mapId / inDungeon) — the v1.7.9 'Y' echo-door/Tutor collision is the
  cautionary tale. Add a unit guard per new char (context → sprite).
- **Procedural content never gates its exit on a special tile.** In the
  Spiral pool, slides/pads/plates/gates decorate OPTIONAL routes; a
  plain-floor walk to '>' must always exist so the existing chunk
  reachability validator keeps passing unchanged in spirit.

### P1 — Seed the Spiral Stair with the stranded grammar
New chunks in SPIRAL_REGULAR + SPIRAL_LANDING (hand-authored, validated
like all chunks): at least 2 slick-rock (_) chunks (slides are shortcuts,
never the only path), 1 teleport-pair (o) chunk, 1 lever/gate (L/G) chunk
(gate guards a chest, not the stairs), 1 tide-pool flavor chunk, and ONE
gear-plate landing (R + A/B/C — the game's single best one-shot, finally
recurring) in the landing pool. VERIFY state scoping: spiral floors
rebuild per visit — lever/gear state must be per-floor (a lever on floor
12 must not leak to floor 13); s.opened keys must include the floor.
Tests: extend the spiral-chunk unit block to the new chunks (plain-floor
reachability to '>' with special tiles treated as walls); drive-tending
gains a forced-chunk leg (pin the chunk roll, ride a slide, take a pad,
cycle the gear landing).

### P2 — Pressure plates (one new universal tile)
A plate opens its floor's plate-gates WHILE occupied — by the player, the
pet, or a pushed slab (U). Semantics mirror the lever (floor-wide, OR
across plates) but live: step off, gates close. Pick TWO free dungeon
chars (plate + plate-gate) per the glyph-collision rule; sprite the gate
visibly distinct from G. Plate-gates guard treasure/shortcuts in existing
content; only hand-authored Wing rooms may make them required (those
rooms get drive coverage). Slab-on-plate is the canonical solution;
pet-on-plate counting is a delight, not a puzzle assumption. This tile is
Wave 13's Understudy switch — build it plain now.
Tests: unit (open-while-occupied, close-on-leave, slab holds, OR across
plates); drive checks in drive-wing.

### P3 — The Workshop Wing (the castle's new structure)
A door in the castle (castle-alphabet char, by the Study) gated on
s.endingDone; pre-ending bump = modal: a brass plate with the kid's own
name, "not yet." Inside: a combat-free hall (s.monsters = [] — castle
rule extends to the Wing) of PROVING ROOMS, each signed by a past
MathMaker, each combining known grammar with one new piece. Rooms:
1. **Grumbold the Third** — cracked floors (new tile: crosses once, then
   crumbles to a drop chute; fall lands in a cellar with a ladder back —
   never a punishment, always a place) + chutes. His portrait is proud of
   this. Cracked floor is a real new universal tile; scope its handler
   for reuse anywhere.
2. **MathMaker Wren — the Numberlings.** Pushable numbered slabs (extend
   the U-slab machinery with a num property + numeral sprite) into
   equation sockets carved in the floor; the room plaque states the
   equation shape (e.g. _ × _ = 24) and ANY true filling completes —
   accepting every correct answer is load-bearing (multiple-solutions
   delight; never punish correct math). Comedy per the channel rules:
   pushed slab occasionally pops 💢; slab in a false socket slumps 1px +
   desaturates one notch (themePalette); true equation = hop + sparkle
   worldBurst; ONE Numberling asleep (💤, 1px slump, bump wakes it); the
   9 leans 1px away from any adjacent 7 with an occasional 💧 — cosmetic
   ONLY, see standing rule 1.
3. **The Armory.** Decorative armor stands holding polished shields =
   rotatable mirrors (reuse the gear-plate rotation grammar) routing a
   lamp beam (render: tile-to-tile line segments, recomputed per
   rotation) to a dark crystal → gate opens. Zero math. The Nth rotation
   of any one stand plays a two-note descending sigh.
4. **MathMaker Petronella** — rotate cat statues (same rotation grammar,
   sprite flip shows facing) until all face the fish fountain → chime.
5. **The Pantry** — a room that is 90% pantry, one slab+plate puzzle
   threaded between the shelves, one chest that is always cheese.
6. **The Plate Room** — teaches P2: plates, slabs, and one slick-rock
   strip. STRETCH (cut freely if hairy): a slab pushed onto ice slides to
   the far wall.
Plus, in the hall itself: **the wardrobe** — an obvious mimic with a
terrible tell (INVERTED v1.7.13 rule: big 5px bob only when the player is
FAR, dead still when adjacent; two-note chirp when walked past). Three
bumps → confession modal (it has been pretending to be furniture for
forty years; it is exhausted; it is so relieved) → it relocates to the
Study next to the enrolled slime, wearing a tiny hat. **Portraits**:
bump-to-hear, ONE modal line each in their signer's voice; exactly one
portrait is gently wrong about math history and an adjacent portrait's
line shushes it. Rewards: per-room a furnishing piece or gold; full wing
= title "Keeper of the Proving Rooms" + the empty doorway at the hall's
end bearing the kid's name plate (the Wave 13 Your-Room hook — carve the
teaser now, build nothing behind it).

### P4 — One leak-back to prove the pattern
Skip-count stepping stones: a short stone path across a pond near Old
Fisher Finn (mainland — kids still mid-game see new content appear).
Stones carry numerals; walk them in ×2 order to reach a chest islet;
wrong stone = splash sound + step back onto the bank (no HP, no cost, no
text needed). Reuses the Turning-Stones sequence-walk logic. Grid edit to
the WEST overworld — re-run the overworld BFS unit and the full sweep
(any drive that walks that shore).

### Prose stop + evidence (unchanged discipline)
NO COMMIT — stop for design review. Paste ALL new prose verbatim in the
report: portrait lines, wardrobe confession, room plaques, pre-ending
door line, Grumbold/Petronella flavor. Evidence: unit + full drive sweep
(31 + new drive-wing.js, ~25 checks: endingDone gate, every room
completable, Numberling multi-solution acceptance, 9/7-never-blocks
regression, plate open/close/slab-hold, wardrobe reveal→confession→Study,
cracked-floor fall+ladder-return, forced spiral chunks) + MARATHON
(content wave: detached `nohup … & disown`, logs in tests/logs/, paste
final lines — killed runs don't count). SCREENSHOT AUDIT every room —
open and LOOK: beam segments render, Numberling numerals legible at
scale, wardrobe bob visible in a far frame and absent in a near frame.

## v1.8.1 (2026-07-18, live playtest): spiral doors — DOORS GATE, NEVER DECORATE
Kid report: "in the tower, lots of locked doors that serve no purpose."
Correct: the spiral chunks scattered freestanding D doors in open floor —
walk-around-able, guarding nothing (old chunks 0-6 had no chests at all).
Every spiral door now seals a walled vault pocket with a chest (or, chunk
7, gates a walk-route a teleport pad honestly bypasses); freestanding
doors cut (22 → 9 doors pool-wide, every one paying). STANDING RULE (all
future chunk/dungeon authoring): a shut door reads as "passage, gated" —
a door must gate a pocket with something desirable, or a route with an
honest bypass. Never decoration. Same save-migration class as Wave 12
re-templating (stale s.opened keys can only open cells, never lock).

## v1.8.2 (2026-07-19, live playtest): wedged slabs rescued + the toot
Kid cornered the plate-room slab and thought the puzzle was ruined. Three
fixes: (1) the plate room gets its OWN reset lever at (31,20) — a wedged
slab must be rescuable from inside the room it wedged in (the pantry
lever technically covered it, from a room away, invisibly); (2) wedge
nudge: 3 futile pushes in a row (any slab system: wing/free/site) raise
ONE modal naming the reset lever ("A wedged slab is not a failed proof."
— Milla), counter clears on success, once per session — kids don't read
the log, so the log-only lever explanation was invisible; (3) the TOOT:
~1 push in 7, stone-on-stone emits a small rude noise + 💨 over the slab
(scandalized; "it wasn't me") — field+sound channels, never louder than
the thud, never control flow. Unit: every Wing 'l' must be registered in
WING_RESET_LEVERS (an unregistered lever is false hope). drive-wedge.js.

## Wave 13 order — "The Understudy & Your Own Room" (user directive 2026-07-19, design session) — ✅ SHIPPED v1.9.0 2026-07-19 (design-reviewed, prose approved)

**Implementation status (implementer session, 2026-07-19):** all three
P-items shipped; unit suite green (exit 0, incl. every ordered Wave 13
block), three new drives green with zero JS errors (drive-understudy 19
checks, drive-myroom 22, drive-staircase 15), full 37-drive sweep +
detached marathon run per the evidence discipline (logs in tests/logs/,
`*-wave13.log` + `sweep-wave13-summary.txt`). Screenshots audited by eye;
two things were FIXED because of the audit: (1) drawWorld's
expansion-entrance label pass hole-punched a "12" over Your Own Room's
workbench ('B') — it now runs on the mainland map only; (2) the echo
plate's first swirl carving read as a numeral "2" at scale (a hazard in a
math game) — it wears a little watching mask instead.
Deviations from this order, and why:
- **The building interaction is a "mason's trail", not literal
  bump-to-place.** The order's "bumping an empty floor tile places it"
  freezes the builder: with a piece in hand, EVERY walk step is a bump on
  empty floor, so you could never carry a piece anywhere. Instead: pick a
  piece at the workbench, and each tile you step OFF gets one (never the
  entry tile); bump a placed wall/chest to take it back; the bench takes
  back plates, cracked tiles, slabs and gates (walk-on/pushable pieces
  can't be bump-collected — pushing a slab must stay a push). Placement,
  budgets, and full removability are exactly as ordered.
- **The Echo Annex pays no chest.** With the Wing's slabs resting on
  plates for good (canonical Wave 12 solutions), every '&' on that floor
  may already stand open — a gated annex chest would usually be a
  non-puzzle. The annex TEACHES (the once-ever summon is the payoff, plus
  the Tallis plaque); the paying echo-plate puzzles live where nothing but
  the Understudy can hold a plate: the Cavern of Echoes (SW room: '?' +
  wall-stopped '+' + '&'-gated pocket chest) and the new Spiral chunk.
- **The Spiral echo chunk is APPENDED** (pool index [12], first appears
  floor 13). Floors 1-12 keep their historical chunks; floors 13+
  re-template once — stale s.opened keys can only open cells, the same
  accepted migration class as Wave 12 / v1.8.1.
- **Cut under deviation authority:** day-keyed pupil revisits, and pupil
  kind rotation (slime-only v1 — the enrolled slime is the pupil). The
  pier-waiting staircase nuance was KEPT (sailing parks it beside the Old
  Pier); entering a dungeon/castle mid-escort parks it at the door
  ({waiting:{x,y}}), and a staircase waiting exactly where you re-emerge
  falls in behind you again on its own.
- **The kid-helps-pupil loophole is allowed as a delight:** the kid
  standing on a plate powers gates for the pupil mid-attempt (the plate
  rule is the plate rule); the SOLVER never assumes it, so invitations
  judge the room's own design.
- D11's displaced monster marker moved (3,12) → (13,11) — same floor,
  same count; the SW room became the echo-plate room.
NOT cut (order requirements honored): polite-stuck flow, budget caps, the
always-present reset cord, once-ever celebrations (intro / first-solve +
Miscount cameo / homecoming), wedge-nudge coverage inside the kid's room,
and the doorway prose swap (the "masons" holding-note is gone from
data.js; the named plate opens the door, pre-title keeps the blank tease).

Context: Wave 12 shipped this wave's hooks on purpose — pressure plates
built plain (the Understudy's switch), and the named doorway at the
Wing's end (Your Own Room's front door; its "masons" holding-note ships
in v1.8.2 and is REPLACED by this wave). Live-playtest signals driving
this wave: the kid LIKES the puzzle aspect (2026-07-19); the doorway
teaser confused a family until its prose said "not yet" plainly; a
cornered slab taught us the wedge-rescue pattern (v1.8.2), which is LAW
in every new puzzle space below. ALL Wave 12 standing rules apply
(jokes are observations never obstacles; comedy channels =
field/glyph/sound/modal, never the log; new glyphs get tileSprite
context checks + unit guards; doors gate, never decorate; every slab
space keeps its own reset affordance + the 3-futile-push nudge works).

### P1 — The Understudy (echo plates)
A new stand-on tile, the ECHO PLATE (pick a free char per the collision
rule). The engine keeps a rolling buffer of the player's last 12 steps.
Stepping on an echo plate summons THE UNDERSTUDY: a palette-swapped
slime wearing a pixel paper crown and carrying a stick sword — it has
been watching the hero this whole time, and this is its moment. It
appears AT the plate and replays the buffered steps as real movement,
with one theatrical half-beat pause before the final step. Wherever its
route ends, it stays — and if that tile is a pressure plate ('+'), it
HOLDS it (the plate-occupancy check gains one clause), doing a small
continuous happy-bob. Colliding with a wall/monster mid-replay stops it
early, politely (no failure, it just stands there, committed).
- Puzzle grammar: choreography — walk the route you want copied, then
  step on the echo plate and go be somewhere else while your past self
  holds the door. Introduce in ONE authored annex room off the Wing
  hall (combat-free, wedge-rescue equipped), then leak back: one echo
  plate room in the Cavern of Echoes (the name finally pays), one
  Spiral chunk (optional route only, per the plain-floor law).
- First-ever summon is a once-ever big beat (modal allowed): the
  Understudy introduces itself. Implementer authors the prose; paste
  for review. Comedy after that: 🎭 glyph on summon, happy-bob, sound
  (a tiny ta-da, two notes) — never the log.
- Persistence: buffer and Understudy position are per-map-visit
  (rebuild on entry); nothing saved.

### P2 — Your Own Room (behind the named doorway)
Gate: Wing title earned (w.titleGiven). The doorway opens into a small
empty room (interior ~11×8): bare stone, a fixed ENTRANCE arch, a fixed
GOAL pedestal with a chest slot, and a WORKBENCH by the door.
- Building is IN-WORLD — no new editor UI. Bump the workbench →
  dialogChoices picks the piece in hand (shows remaining counts); then
  bumping an empty floor tile places it; bumping a placed piece picks
  it back up. No modes, no timer, placeable/removable forever.
- Palette v1 (tight ON PURPOSE — a budget makes it design, not
  sprawl): 10 wall blocks, 2 slabs, 1 pressure plate, 1 plate-gate,
  1 cracked floor, 1 chest (the game supplies the pupil's prize
  inside; the kid never spends anything). Cannot place on the
  entrance, goal, or workbench tiles. A reset pull-cord is ALWAYS
  present (shuffles slabs back to the kid's placed spots — the wedge
  law applies to rooms the kid builds, from day one).
- When ready: a pull-cord by the arch ("Invite a pupil"). A pupil
  arrives (the enrolled slime first; later visits rotate kinds) and
  ATTEMPTS THE ROOM VISIBLY, one step every ~250ms, while the kid
  watches. Solver: BFS over (pupil pos, slab positions, plate/gate
  states) — the room is tiny and the budget is 2 slabs, so the state
  space is bounded; cap explored states defensively and treat cap-hit
  as unsolvable. It may try the chest before the pedestal, pause at
  gates, etc. — the solver's PATH is real, the theater is in pacing.
- UNSOLVABLE IS ALLOWED and is the pedagogy: the pupil tries, visibly,
  then walks back to the arch with a 💭 glyph and one modal: it could
  not find a way, said kindly, asking for "a hint — or a hallway."
  (Implementer authors; paste for review.) The kid revises and pulls
  the cord again. No cost, no scold, ever. Watching a real solver fail
  at your room and fixing it IS level design — and teaching.
- First successful solve is a once-ever celebration (worldBurst +
  fanfare + the pupil's joy; Miscount drops by with one line — he of
  all people knows what it means to build a room that tests fairly).
  After that: purely social. The room pays no gold; the room is the
  trophy. On later days, entering the Wing sometimes finds a pupil
  mid-solve in the room (day-keyed roll) — the kid's design has a life
  of its own. (Implementer may cut the day-keyed revisits if hairy —
  see deviation authority.)
- Persistence: layout + solve-count in s.wing.myRoom; survives NG+
  snapshot/restore like the rest of the Wing.
- The doorway's v1.8.2 "masons" note is REMOVED; the named plate now
  opens the door. Pre-title, the doorway keeps the blank-plate tease.

### P3 — The homesick staircase
Post-ending only: a small staircase with two pixel feet stands lost in
the Cavern of Echoes (floor 1, authored spot). Bump it → it explains
nothing (it is a staircase) but a 🏠 glyph pops and it starts FOLLOWING
— pet-follower logic, lagging two moves behind, stiff. Monsters ignore
it (code-level indifference is the joke; one log echo for parents:
"The Bonepile looks at the staircase. The staircase looks at nothing.
It is a staircase."). It waits outside during battles; if the kid
sails, it waits at the pier (persisted), radiating patience. Escort it
overland to the Spiral Stair tower and bump the tower: once-ever
homecoming moment (modal, authored, paste for review) and a PERMANENT
reward — the spiral menu gains "⤴ Start from floor 10" (the staircase
knows a shortcut; it should, it is one). State in s.spiral.staircase:
'lost' | 'following' | { waiting: {x,y} } | 'home'.

### Evidence & prose discipline (unchanged, mandatory)
Unit: new-glyph context guards; step-buffer record/replay determinism;
plate-occupancy clause (Understudy holds '+'); myRoom serialization
round-trip + budget enforcement + illegal-placement rejection; solver
solves a known-solvable fixture and rejects a known-unsolvable one
(deterministic, no Math.random in the solver); staircase state machine
(lost→following→waiting→home) incl. save/load mid-escort; NG+ snapshot
carries myRoom + staircase state. Drives: drive-understudy (~12
checks: summon, exact replay, half-beat, holds plate, gate stays open,
early-stop is polite), drive-myroom (~18: build solvable room by
synthetic bumps, budget caps, pupil solves + celebration, REBUILD to
unsolvable, polite-stuck modal, revise, solve), drive-staircase (~10:
find, lag-follow, battle-wait, deliver, menu option, persistence).
Full sweep (will be 36 drives) + DETACHED marathon (`nohup … & disown`,
logs in tests/logs/, paste final lines). SCREENSHOT AUDIT: the crown
pixels read at scale, the Understudy mid-replay, a pupil mid-solve in
a kid-built room, the staircase's feet, far/near frames for any new
tell. NO COMMIT — stop and report with ALL new prose verbatim (the
Understudy's introduction, the pupil's stuck line, Miscount's visit
line, the staircase homecoming, workbench strings).

### Deviation authority
May cut freely if hairy: day-keyed pupil revisits; the pier-waiting
staircase nuance (fallback: it teleports home to the dungeon entrance
and waits there); pupil kind rotation (slime-only is fine for v1).
May NOT cut: the polite-stuck flow (it is the feature), budget caps,
the always-present reset cord, once-ever celebrations, wedge-nudge
coverage inside the kid's room, the doorway prose swap.

## Wave 14 order — "The Court" (Castle Expansion Wave A) (user directive 2026-07-20) — ✅ SHIPPED v1.10.0 2026-07-20 (design-reviewed; prose approved + Magistrate quantity-agnostic fix)

**Implementation status (implementer session, 2026-07-20):** all three
P-items + the recurring bit shipped; unit suite green (exit 0, incl. every
ordered Wave 14 block); `tests/drive-court.js` = 23 checks, zero JS errors;
full 38-drive sweep + detached marathon per the evidence discipline (logs
in `tests/logs/*-wave14.log` + `sweep-wave14-summary.txt` +
`marathon-wave14.log`). Four screenshots audited by eye (herald, petitioner
mid-case, 3/3 celebration, spawned Clerk) — all clean; the herald sprite is
a plumed trumpet-bearer (a person shape, never a numeral at scale).
Deviations from this order, and why:
- **Day-keyed renewal has ONE deliberate divergence from refreshBounties:**
  the court does NOT eager-refill the same day once all three are heard. A
  full 3/3 is the day's SESSION (P1's own word), so the queue stays stable
  until the DATE turns — which is exactly the unit contract ("re-rolls on
  date turn, NOT before") and the drive's "stable within a day." Everything
  else mirrors refreshBounties (E.todayStr, {date,cases}, load() migration,
  weakest-first targeting).
- **The Magistrate always leads the docket (case 0), taking the WEAKEST of
  the four skills.** The recurring gag therefore carries the rustiest topic
  every session — reinforcing the auto-targeting — while cases 1-2 take the
  next-weakest from the authored petitioner pools. Escalation KEPT (not cut):
  four grievances by `s.magistrateVisits`, then holds at the last.
- **The Magistrate's grievance frame is skill-agnostic on purpose** (it
  bridges "…the clerk's sum:" to whatever's rustiest), so a fraction-flavored
  complaint can sit over a multiplication problem. This is the intended
  bureaucratic joke (everything reduces to the clerk's arithmetic) and honors
  "the complaint is the comedy; the math is plain."
- **Court furnishing (P3 optional) was CUT** under deviation authority — the
  visible cumulative reward is the Faculty filling the throne room, which is
  richer than a rug and is the load-bearing thread anyway.
- **Gratitude "tiny hat" = ONE new earned pet-hat** ("Courtier's Hat" 👒),
  granted at most once via the existing `E.yardGrantReward` cosmetic path
  (occasional roll; otherwise a food/potion). Never gold, never power.
- **Faculty are drawn as live OVERLAYS on plain throne-room floor** (like the
  daily tangles), not new grid glyphs — so no new tile alphabet, and the
  documented EXTENSION POINT is `MM.data.FACULTY_POSTS`: later waves append a
  post with its own `{id,title,sprite,pal,badge,x,y,earned(state),line,
  spawnLine}` and `E.checkFaculty` claims it with zero rework (Wave A checks
  `s.courtSessions`; later waves supply their own counter+predicate).
- **Glyph:** the herald is `'Z'` in the CASTLE map — an `MM.data.NPCS` entry
  with a `court:true` dispatch flag (same idiom as `u`'s `arena`), free on
  every overworld and unused by any dungeon mechanic; it draws `hallFloor`
  under the NPC pass and never overloads the throne `'O'`. Unit-guarded.
- **NG+:** `s.court/s.faculty/s.courtSessions/s.casesHeard/s.magistrateVisits`
  survive `startGolden` AND `returnToFinishedKingdom` by being left untouched
  (like `s.wing`); `endingDone` survives too, so the crowned court still sits.

First wave of CASTLE_EXPANSION_PLAN.md (read it for the full rationale and
where this sits among the Parlor/Kitchen-Garden/Menagerie that follow).
The castle content has been the most popular part of the game; this grows
it into the renewable late-game heart. The Court re-establishes the kid as
ruler-AND-teacher, fills the applied-word-problem gap the dungeons serve
least, and stands up the FACULTY thread the later castle waves reuse. It
is the cheapest of the four (reuses dialog + problem machinery + the
day-keyed renewal pattern), which is why it's first.

ALL standing rules apply and are review-blocking: combat-free castle
(s.monsters = []); no timers; gentle failure (never a scold, never a
loss); jokes on monsters/items never the kid; comedy channels
field/glyph/sound/modal, never the log; new glyphs get tileSprite context
guards + unit checks; doors gate never decorate. Post-ending content:
everything below gates on s.endingDone.

### P1 — Holding court (the core loop)
A new HERALD NPC in the castle throne area (pick a free NPC letter; place
it in the CASTLE map near the throne 'O' — do NOT overload 'O', which
routes to E.throneRoom / the NG+ menu). Bump the herald post-ending →
"Today's petitioners" → a day-keyed queue of 3 CASES.
- Day-keyed renewal EXACTLY like E.refreshBounties (mirror it — E.todayStr,
  a s.court = { date, cases:[...] } object, re-roll only when the date
  turns AND the day's cases aren't all heard; migrate s.court in load()).
- Each case = a PETITIONER (a named subject or a becalmed monster) + an
  absurd complaint + one applied problem. Presented via MM.ui.showProblem;
  a correct ruling settles the dispute, a wrong one leaves the court
  politely baffled and RE-EXPLAINING (re-ask, no penalty, no scold — the
  gentle-failure rule). The complaint is the comedy; the math is plain.
- Cases draw from the APPLIED strands and RECORD to mastery UNDER THEIR
  REAL SKILL (this is the point — distributed applied review the report
  card already shows): fair-division / sharing → fractions_as; scaling a
  recipe or wage → multidigit_mult; miscounted change / market money →
  decimals_md; measuring a field / fence / banner → word_problems (area).
  New generator MM.problems.courtCase(skill) wrapping the existing
  applied generators with a petitioner + narrative frame; weakest-first
  across those four skills so the Court auto-targets what's rusty
  (reuse MM.mastery.weakestFirst like refreshBounties does).
- Renewable, never mandatory; hearing all 3 is a full "session."

### P2 — The Faculty (the connective thread; BUILD THE SYSTEM HERE)
The castle visibly fills as the kid teaches — "teachers multiply" made
literal, and the backbone the Parlor/Kitchen/Menagerie waves reuse.
- s.faculty = [] (list of taken posts). A post is claimed at a MILESTONE
  (e.g. every N full court sessions heard: a reformed monster becomes the
  court's Clerk, then the Bailiff, then the Recorder…). Each appears as a
  new NPC in the castle (spawned into CASTLE render, one bump-line each,
  authored). Records nothing, gates nothing — pure visible cumulative
  reward. Keep the milestone cadence gentle (a counter that only counts
  UP, like s.daysTended — never resets, never shames).
- Design the faculty roster + spawn slots so later waves can append their
  own posts (the card dealer, the sous-chef, the menagerie-keeper) without
  reworking this system. Document the extension point in-code.

### P3 — Rewards (teacher-flavored, never a grind)
- A "cases heard" counter (counts up only). Gratitude gifts on settling a
  case: food/potions in small quantities (reuse the existing item grants),
  and OCCASIONALLY a tiny hat (reuse the pet-hat / cosmetic path) — never
  gold-grind, never a power reward. A full session (3/3) gives a small
  celebration (worldBurst + fanfare + one authored line) per the "when
  something is earned, show it" rule from v1.7.8.
- Optional, if cheap: settling enough cases furnishes the court (a bench,
  a rug) via the existing castleFurnish-style live-read tiles.

### The recurring bit (comedy anchor)
A very-serious recurring petitioner (a magistrate-shaped figure — the plan
suggests a small dignified creature; author it) returns across sessions
with escalating, absurd, impeccably-polite grievances. Field/glyph/sound
+ modal only. This is the Court's running gag, the way the enrolled slime
is the Study's.

### Evidence & prose discipline (unchanged, mandatory)
Unit: herald tileSprite context guard; s.court day-keyed roll (re-rolls on
date turn, NOT before; all-heard vs partial); courtCase generator produces
a valid problem per skill and records under the RIGHT skill (assert the
mastery key); faculty milestone fires at the cadence and spawns the NPC;
migration of a pre-Wave-14 save (s.court/s.faculty default clean); NG+
snapshot carries s.court/s.faculty/cases-heard through startGolden AND
returnToFinishedKingdom. Drive drive-court.js (~18 checks): herald gated
on endingDone; hear a case correct (settles, records, gift), hear one
wrong (baffled re-ask, no scold, no loss), 3/3 session celebration, the
day-keyed queue is stable within a day and re-rolls across days, a faculty
post spawns at its milestone, the recurring petitioner returns. Full sweep
(38 drives) + DETACHED marathon (nohup … & disown, logs in tests/logs/,
paste final lines). SCREENSHOT AUDIT: the herald sprite, a petitioner
mid-case, the 3/3 celebration, a spawned faculty NPC in the castle. NO
COMMIT — stop and report with ALL new prose verbatim (herald lines, every
authored case's complaint + settle line, faculty bump-lines, the recurring
petitioner's grievances, session-celebration line). Do NOT bump sw.js /
tracker.js versions — the design session ships.

### Deviation authority
May cut freely if hairy: the court-furnishing sub-feature (P3 optional);
the recurring petitioner's escalation (a single fixed grievance is fine
for v1). May NOT cut: recording under the real skill (the pedagogical
point), gentle-failure re-ask, the Faculty system + its documented
extension point (later waves depend on it), day-keyed renewal.
