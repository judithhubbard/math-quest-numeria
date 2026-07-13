# ⚔️ Math Quest: Numeria 👑

A math-practice adventure game for 5th graders, inspired by the structure of
the classic 1989 Mac RPG TaskMaker. Math is the game's power system: you fight
monsters, open locked doors, and crack treasure chests by solving problems.
No timers anywhere — careful thinking is always the winning strategy.

*(Formerly "MathMaker v2" — the folder name, internal code names, and save
keys keep the old name on purpose so nothing breaks and no saved adventures
are lost. The **MathMaker** lives on as the quest-giver in the castle.)*

**v2 is a full audiovisual and combat overhaul of v1** (which lives in the
parent folder): original pixel-art sprites replace the emoji graphics, and
battles are now real turn-based duels.

## How to play

**Double-click `index.html`** — it runs in any modern browser, no install or
internet needed. Each kid types their name to get their own saved adventure
(progress auto-saves in the browser).

- **Move** with the arrow keys or WASD. Bump into things to interact.
  On a **touchscreen or with the mouse, tap/click a tile** and your hero
  walks there — tap a door, chest, monster, or villager and they'll walk
  over and knock. (Tap routes stick to plain ground; the hero stops the
  moment anything interesting happens.)
- **Quick keys:** P potion · F food · B bag · R report · M monsters ·
  1/2/3 cast spells. A **sound on/off** switch lives in Parent Settings,
  next to Calm Mode.
- **Visit the castle** to meet the MathMaker and receive your task.

### ⚔ How battles work (new in v2)

Battles happen on a dedicated battle screen with **dueling animated HP bars**:

1. **Your turn:** you get a **quick** math problem — fast, mental-math variants
   of the dungeon's topic (`40+30`, `23×10`, `23÷4 = 5 r 3`, `1/2 = ?/8`),
   so battles keep their pace. A **correct answer strikes** the monster for
   your attack power — better **weapons** hit harder.
2. **The monster's turn:** it strikes back *every round*. Your **armor
   blocks** part of its damage, and if you answered correctly you have a
   35% chance to **dodge** the hit entirely.
3. A **wrong answer misses** (the worked solution is shown so every miss
   teaches something), and the monster still gets its turn.
4. **Fleeing is always allowed** — but the monster **recovers to full health**
   while you run, so running away can't be used to skip hard problems or
   whittle a monster down for free.

**The slow, full-depth problems live at the gates**, where nothing is
attacking you and thinking time is free: **boss fights** (the dungeon topic's
real test, difficulty adapts to recent accuracy), **🚪 doors**, **🎁 chests**,
and the **🔮 seal exam** — the first time you enter each new dungeon, its seal
asks one full problem from the *previous* topic before shattering forever.

### 🗡 Equipment: five slots, real choices

You own everything you buy (it lives in your **🎒 bag**) and choose what to
equip in five slots: **weapon**, **body armor**, **helmet**, **boots**, and
one **magical ring**. Weapons set your strike power; body/helmet/boots add
up to your total **block**; some boots add dodge chance. Rings are tradeoffs —
one finger, one power: Power (+2 damage), Guard (+2 block), Vigor (+30 max
stamina), Fortune (+15% gold), or Focus (a miss only *halves* your streak).
The shop **buys back used gear at half price** (and treasures at full value) —
answer the shopkeeper's money question for a bonus.

### 🎲 Damage is rolled

Your strikes land for **80–120%** of your power (shown as a range, e.g.
"⚔️ strikes 5–7"), and monsters roll **75–110%** of their attack before your
block subtracts (minimum 1). Crits still double after the roll. Monster attack
scales with the block a well-equipped hero has at each dungeon, so gearing up
is rewarded — over-armor and hits shrink to 1s.

### 👪 Parent settings & difficulty

- **👪 Parent** (sidebar button, PIN-protected — you create a 4–8 digit PIN on
  first open): **check or uncheck each of the thirteen math topics** individually —
  math ability isn't linear, so a kid who knows place value but not long
  division gets exactly the mix they're ready for. Every problem source in the
  game respects the checklist — battles, bosses, doors, chests, seals, the
  inn, Pip, and Miscount's arena. All dungeons still play; their problems just
  stay within checked topics. If Multi-Digit Add & Subtract is unchecked, the
  shop's money quizzes are skipped too. The PIN and settings are per profile.
- **🐛 Bug log** (inside Parent Settings): the game records any error together
  with a breadcrumb trail of recent actions ("opened shop → clicked buy bread
  → …") and a state snapshot. "Copy bug report" puts it on the clipboard to
  paste into a bug report; "Clear log" resets it.
- **⚙️ Difficulty** (kid-accessible): 🌸 Story / ⚔️ Hero / 🔥 Legend scales
  monster **health and damage** (0.7× / 1× / ~1.3×) — never the math. Takes
  effect the next time a dungeon is entered.
- **Accessibility switches** (in Parent Settings, next to Calm Mode): all
  sound off, background music off (effects stay), and **larger reading
  text** for dialogs, problems, and the story log.

### 🍗 Stamina & food (TaskMaker-style)

Walking (1 per 2 steps) and battle rounds (1 each) drain a **stamina bar**.
At zero you're **exhausted** — half damage and no dodging — but never dying
from hunger, and never too tired to walk: home is always in reach. Eat from
the **🍗 Food button** (F key) — two bars, two buttons: 🧪 Potion refills
health, 🍗 Food refills stamina — bread +30, cheese +50, roast chicken +100.
Food comes from the shop and chests; the inn restores stamina fully. The
**Boots of Wandering** charm removes the walking cost entirely.

### 🎁 Chest loot & selling

Chests roll a loot table: gold (40%), food (20%), a potion + gold (15%),
a **treasure** (15%) — pearls, goblets, idols, dragon teeth that exist purely
to be **sold at the shop** (answer the shopkeeper's money question for a 10%
bonus) — or, 10% of the time, a **magical charm**.

**🎭 Beware (a little): some chests are not chests.** From the fourth dungeon
on, a rare chest may be a **Mimic** — watch closely and you'll see it
*breathe*, and your pet will stare at it with a tail that is *not* wagging.
Bump it and it grins: a completely normal battle follows (you can even
soothe it). Win either way and you get everything it was hiding **plus a
bonus treasure for your nerve** — curiosity always pays in Numeria. Its page
in the Monster Book waits under "Wandering Chests."

### ✨ Magical charms (nine to collect, three to wear)

Collect them all — but you can only **wear three at a time** (choose on the
charm shelf in your 🎒 bag; new charms are worn automatically while you have
a free slot). Never sold: 🍀 Lucky Clover (+10% dodge),
💍 **Ring of Retry** (one second-try at a problem per battle),
👢 Boots of Wandering (walking costs no stamina), 🖋️ Scholar's Quill
(streak bonuses doubled), 💖 Crystal Heart (potions heal double),
🧲 Miser's Magnet (+25% gold from everything), 🗺 Wayfinder's Locket (the
Smugglers' Vault's own find), and 🧱 **Mason's Charm** (+1 block —
Gullwrack Harbor's Guild honor, once every town repair site is rebuilt).
Found rarely in chests, and every third Homework Golem drops one — plus
🌿 Hearthmoss Charm (+1 HP every 8 steps below full health), sold outright
at the Brass Compass.

### 🌉 The expansion: across the bridge

After the tenth task, a **bridge rises across the eastern river**. On the far
bank, Miscount offers two things:

- **Three expansion dungeons (11–13)** — the Cavern of Echoes, the Sunken
  Library, and Star Peak. Miscount asks you to return the things he took
  while confused. Every problem in them is **mixed review** drawn from all
  ten topics, weighted toward the player's weakest areas (quick in combat,
  full-depth at gates, as always). Completing all three earns the true ending.
- **Endless sparring** with his Homework Golems — quick-fire mixed questions,
  golems leveling up after every win.

So the three systems visibly matter: **weapon = offense per correct answer,
armor = defense every round, math accuracy = tempo, dodges, and crits.**

**🔥 Streaks:** 3 correct in a row = +2 damage, 6 = +4, and at 5+ you can land
**CRITICAL HITS** for double damage. Damage numbers fly, the screen shakes,
bosses get crowns and auras, victory showers you in particles.

### 📖 The story (new)

A shadow called the **Lord of Confusion** has tangled every number in Numeria.
As you return each treasure, the MathMaker reveals a little more of the truth:
the villain is **Miscount**, his former star apprentice, who started guessing
instead of working things out and dissolved into confusion. The finale redeems
him — defeat the shadows and a lost student comes home, having learned the
game's real moral: *every problem can be worked out, one careful step at a time.*

### 🧑‍🌾 Townsfolk (new)

Six villagers live on the overworld — bump into them to chat. Their dialog
changes as the story advances:

- **Sage Sylvia** 🔮 — drips the deeper lore about Miscount
- **Bard Barnaby** 🎵 — sings ballads about your deeds (they improve as you do)
- **Little Pip** 🧒 — bets their allowance on a math riddle (one per task, 4 gold)
- **Trader Tessa** 🧳 — explains how weapons/armor work, nags you about gear
- **Farmer Fenwick** 🧑‍🌾 & **Old Fisher Finn** 🎣 — dungeon hints and local color

### 🥉🥈🥇 Topic badges

Every math topic has three badges, earned forever (never taken away):
**bronze** at 10 correct answers, **silver** at 25 correct with a hot recent
streak (8 of your last 10), **gold** at 50 correct with 9 of your last 10.
Earning one pops a celebration; the **badge shelf** lives in the 🎒 bag,
badges show on the 📊 report card and in the parent panel — and Bard Barnaby
works your gold badges into his ballads.

### 📕 The Monster Book

Press **M** to open it. Every one of the game's **55 monsters** has a card that
fills in when you defeat one: portrait, a funny field note, and your defeat
count. Monsters you haven't found yet appear as dark silhouettes marked ??? —
monsters you've met but never beaten show their face and keep their secrets.
The discovery counter at the top is the collection goal.

### 🪧 The notice board

A wooden board stands beside the castle with **three small jobs** — defeat a
few monsters in a particular dungeon, answer problems inside another, get an
answer streak, or (after meeting Miscount) win a spar. Rewards are paid in
gold **the instant a job finishes**, and fresh notices are posted every
morning — or as soon as all three are done, so the board is never empty.
Quietly, the board picks its target dungeons from the topics the player has
been missing most, steering practice where it helps.

### ⛵ Level 2: the Uncharted Isles (first island open!)

Finish **all thirteen tasks** and a ship stops at the **western pier ⚓**.
Before you sail, **Miscount catches you at the gangplank with three eggs** —
pick one, and it **hatches on the voyage** into your very own pet (a Compass
Pup, Sprout Cat, or Ember Newt — you name it). Your pet follows you
everywhere, cheers your correct answers, **smells hidden secrets** (watch for
its ❗), and grows through three stages fed by right answers and 🦴 treats.

The ship lands at **Port Brightwater**: Keeper Callie explains the quest
(three lighthouse lenses, all dark, and the **Murk** — a wall of fog you can
see right there on the island), Old Salt Percy trades hints, and the **Brass
Compass** shop sells isle-tier gear (Tidal Blade, Pearl Mail...), 🫙 **mystery
potions** (usually great, occasionally seaweed-green hair), and pet treats.
Light the **Tide Lens** in the grotto and watch the fog physically recede
from the northern passes. The first dungeon (see `LEVEL2_SPEC.md` for the
full plan) is built on a new exploration engine:

- **Monsters with jobs:** *guard* crabs park on doorways and never chase;
  *drift jellies* wander; **Pilfer Gulls steal your gold and flee** — corner
  one and win it back with interest.
- **Terrain that matters:** tide pools drain extra stamina, urchins sting
  (2 HP, never lethal), **slick rock slides you** until something stops you,
  and paired **tide pads** teleport you across the cave.
- **Real exploration:** a **cracked wall** hides a treasure alcove, a **key**
  (behind a guard) opens the **locked door** to the stairs, a **lever** opens
  distant gates — and the dungeon has **two floors**.
- Every problem is **mixed review** across all enabled topics. Beating **The
  Old Current** re-lights the **Tide Lens** — the first of three.

Lighting the Tide Lens opens the pass to **❄️ Frostbite Hollow** (Isles map:
2): a frozen hollow where the only way across the great lake is to **slide**
— once you're moving on ice, you don't stop until something stops you. Floor
two is a proper ice-floe puzzle: pick the right columns, land on the right
islands, pull the lever, and face **The Glacier's Heart** for the **Frost
Lens**.

The Frost Lens opens **🔥 the Cinderforge Depths** (Isles map: 3) — the
game's deepest dungeon: **three floors**, two keys, a Coal Thief on shift,
cinder shards underfoot, and **drop chutes**: step on one and the floor gives
way, dropping you to the same spot one level down with no way back up that
hole. Beat **The Foreman** in the foundry for the **Cinder Lens**.

With all three lenses lit, the **Great Lighthouse** (isle map: `H`) finally
opens — the game's biggest dungeon, **four floors**, one exploration
mechanic reprised per floor (slick-rock slides, teleport pads, two keys, and
a lever-gated one-way chute), finishing at the lamp room and **The Murk**
itself: at half health it *thickens* (+2 attack, telegraphed — "the fog
presses closer...") before thinning into ordinary morning mist. Lighting the
lamp earns the title **Keeper of the Light** and a proper harbor-festival
ending.

Somewhere on the isle's south beach, a **cracked wall** hides the secret
**Smugglers' Vault** — never assigned, findable only by a nudge or your
pet's nose. It's a thief gauntlet with the game's densest treasure,
including the first **ranged weapon**: the 🏹 **Smuggler's Crossbow**,
guarded by a none-too-pleased Vault Watchman. Ranged combat has exactly one
rule — no ammo, no aiming — a monster's very first counterattack of the
battle always misses, because you're striking from afar. Beat **Captain
Brine** and the vault's hoard also yields the **Wayfinder's Locket** charm.

Earning enough **topic badges** (🥇 gold, on the report card) unlocks three
utility **spells**, shown in a spellbook row in the sidebar the moment any
of them is available: 🔍 **Scout** (secret walls shimmer for 10 seconds, once
per dungeon visit), ⚡ **Blink** (hop clean over one hazard tile for 10
stamina), and 🕯 **Beacon** (instantly return to the entrance, once per
visit). They never fight for you — only mastery earns exploration power.

Sailing anywhere now plays a proper **voyage scene** — the Compass Rose
bobbing across a rolling sea, gulls overhead.

### 🔥 Emberlyn the Enchanter (mix-and-match gear magic)

Port Brightwater has a new resident: **Emberlyn the Enchanter**, who fuses
**enchant gems** onto whatever gear you're wearing — 🔥 Flame (+2 damage),
❄️ Frost (chills a monster's next counterattack), 🔰 Guard (+1 block),
🪶 Feather (+4% dodge), 🩸 Leech (heal 2 HP on a crit), 🧲 Magnet (+10% gold),
and 🔔 Echo (+1 to streak bonuses). Gems turn up as a rare "glimmering chest"
find (and occasionally from a Homework Golem), and fusing one is always a
math problem — free if you get it right, a modest 25 gold if you don't, but
it **always succeeds**. One gem per item; re-enchanting replaces the old one
(gone for good), and enchanted gear gets a new name everywhere it's shown —
your ⚔️ **Tidal Blade** becomes the 🔥 **Flaming Tidal Blade**.

Emberlyn also sells a brand-new **amulet slot** — one at a time, like rings:
the 🌊 **Tidewood Amulet** (+10 max HP), 🕯️ **Keeper's Amulet** (inn warm-ups
pay +5 gold each), and 🧭 **Wayfarer's Amulet** (+25 max stamina). She also
keeps her own ranged weapon in stock, the 🏹 **Horologe Longbow** — same
one-rule ranged behavior as the Smuggler's Crossbow, for anyone who never
found the Vault.

### ⏰ Level 3: Horologe Isle and the Clockwork Spire

Once the Great Lamp is lit, the captain of the **Compass Rose** has one more
leg on her charts: **Horologe Isle**, a small town-less island that's all
ticking gears. Its one landmark is the **Clockwork Spire** — the game's
biggest dungeon yet, **five floors**.

- **New topic: reading time** (default on, its own line in the parent
  settings). Problems show an actual **analog clock face** and take answers
  in `3:15` format; harder tiers add 5-minute marks, "quarter past/to"
  wording, and elapsed-time word problems ("opens at 3:40, runs 45 minutes —
  what time does it close?"). The whole Spire is a 50/50 mix of clock
  problems and review of everything else you've learned.
- **Clock doors** ⏰ — like the Isles' locked doors, but the puzzle is always
  a clock to read.
- **Gear plates** — a re-lockable lever: pulling it cycles which ONE of
  three gates is open (the other two swing shut). Unlike every other lever
  in the game, it's never used up — pull it as many times as you like.
- New residents: the **Tick Imp** (chases), the swaying **Pendulum Knight**
  (guards), and the **Cuckoo**, a thief that steals gold and **shouts** —
  waking every other monster on the floor for a few tense turns. At the
  bottom of the tower: **The Unwound King**, once the isle's timekeeper,
  now just... stopped.

### 🎵 Level 4: Chime Isle and the Resonant Halls

Once the Clockwork Spire is done, the captain's charts show one more stop:
**Chime Isle**, another town-less island — this one hums. The **Resonant
Halls** inside are four floors deep.

- **New topic: reading music** (off by default — turn it on in Parent
  Settings if you'd like). Problems show a note on a **treble staff** and
  ask you to pick the letter (A–G), or turn rhythm into fraction practice
  ("a quarter note plus a half note — how much of a whole note is that?").
- **Echo doors** 🔔 — not math at all: the door hums a short tune (3–5
  tones) and you click it back on colored buttons. Get it wrong and it just
  plays it again, a little slower — no penalty, ever.
- **Singing stones** — floor tiles that chime a note when you step on them.
  Pure flavor, nothing to solve.
- New residents: the **Off-Key Sprite** (wanders, every note slightly
  wrong), the **Bass Golem** (guards, hums one very low note forever), and
  the **Piccolo Pixie**, a thief that steals gold and celebrates about it.
  At the heart of the Halls: **The Discord** — it never learned where its
  note fit in. Someone finally showed it.

**Also this update:**
- The **spellbook** finally explains itself: Help now has a Spellbook
  section, and unlocking Scout, Blink, or Beacon for the first time pops a
  one-time celebration that doubles as the how-to-cast tutorial. Greyed-out
  spell buttons now say why (hover for a tooltip).
- Clock faces gained **numerals** — reading the hands is the skill, not
  guessing position from the tick marks.
- A new consumable, the 🪢 **Rope of Return** (sold everywhere, ~30 gold):
  use it from your bag to climb straight out of any dungeon. It's a
  convenience you can buy early — Beacon is still the free version you earn.

### ⛏ Depth & endgame

A round of smaller, independent additions — no new math topics, just more
reasons to keep playing:

- **Deep Wings.** Three familiar dungeons — the Forest Ruin, Merchant's
  Vault, and Wizard's Tower — turned out to have a second floor all along,
  behind a new locked door. A key waits somewhere in the dungeon you
  already know; the Wing itself is full **mixed review** (every topic
  you've learned, not just that dungeon's own), with one guaranteed
  glimmering chest.
- **A second notice board.** Port Brightwater has its own **Harbor Notice
  Board**, tracked completely separately from the mainland's — new isle
  job types: open a glimmering chest, catch 2 thieves, and (once the Great
  Lamp is lit) answer 6 problems inside the Clockwork Spire.
- **Pet fetch.** A **Champion**-stage pet (the highest growth tier) has a
  1-in-10 chance after any battle victory to trot back with a small
  treat — food, a potion, or rarely a gem.
- **The Champion's Gauntlet.** Ask Miscount for a rematch against any boss
  you've ever beaten, at +20% stats, for a trophy. Win once and 👑✨ marks
  that boss's card in your Monster Book forever — the fight itself is a
  bonus round, not a repeat of the story (no quest items, no lens/lamp
  flags, just a tougher fight and a keepsake).
- **A calmer option.** Parent Settings now has a **🧘 Calm Mode** toggle —
  turns off screen shake and particle bursts. Battles stay exactly as
  playable, just without the motion.
- Small ambient touches throughout: a soft dust puff with every step, and a
  little sparkle wherever you earn a badge, level up, or finish a bounty.

### 🧱 Level 5: Gullwrack Harbor and the Sunken Breakwater

Once the Clockwork Spire is done, a fifth stop appears on the charts:
**Gullwrack Harbor** — a storm-battered fishing town, and the game's first
full-service isle town besides Port Brightwater itself (a shop, an inn, a
notice board, real townsfolk).

- **New topic: geometry** (perimeter, area, and volume — on by default,
  core 5th-grade curriculum). Problems show a labeled diagram: a rectangle
  for perimeter/area, an L-shaped room split by a dashed line to solve by
  decomposition, or a 3D box for volume — plus word problems ("how many
  1-unit crates fit in the hold?"). Every answer is a plain whole number.
- **Slab-tiling repair sites** — the town's new embodied puzzle. Half of
  Gullwrack is still broken floor from the storm. Find a **blueprint
  plaque**, solve the area problem it asks, then **push the stone slabs**
  onto the cracked patches — bump a slab and it slides exactly one tile,
  sokoban-style. A slab that lands on a broken tile locks in for good; fill
  every crack at a site and it's repaired, with gold and a word from
  **Guildmistress Maren**. Made a mess? A **reset lever** by every site
  puts its loose stones back where they started — nothing is ever
  unsolvable. Rebuild all four sites in town and Maren makes you an
  honorary Guildmember, with the **Mason's Charm** 🧱 (+1 block) to prove it.
- **The Sunken Breakwater** — a waterlogged storeroom of a dungeon, two
  floors deep, with its own repair site tucked inside as a free shortcut.
  New residents: the **Soggy Crate-Mimic**, the barnacle-crusted **Barnacle
  Bruiser**, and the light-fingered **Tidepocket Filch**. At the bottom:
  **The Undertow** — it never learned where the edges of things are.

### 👑 The Open Castle — the ending

When the kingdom is whole — every task returned, the Great Lamp lit, and the
Clockwork Spire ticking again — the castle doors finally **open**, and you can
walk inside. (The Resonant Halls are deliberately *not* required: music is a
parent opt-in, and no one should be locked out of the ending by a topic that's
switched off.)

- **The Gallery of Ten** — the ten treasures you recovered, on plinths, each
  one replaying a memory of the day you found it. It's a museum of *you*.
- **The Hall of Heroes** — every adventurer who has played on this computer,
  side by side, with the titles they earned. No ranks and no scores.
- **The Study — the reveal.** The MathMaker and Miscount, together, finally
  tell you why math has been defeating monsters all along.
- **The Final Exam, inverted.** No boss. No health bars. **The MathMaker sits
  down as the student and you mark his work** — he solves five problems on a
  slate, and some of them contain exactly one wrong step. Your job is to find
  it, and say why. (Getting one wrong costs nothing: the slate just shows you
  which step it really was.) The last problem is a plain addition fact, worked
  correctly — the same kind the game opened with.
- **The coronation**, and then **"The Kingdom, Untangled"** — the game's one
  big cutscene, in which every monster you ever beat unravels back into the
  straight, worked line it should have been, the kingdom pulls back into a
  golden spiral, and the **last problem in the game** asks you what comes after
  1, 1, 2, 3, 5, 8, 13. Get it wrong and the spiral simply *draws* you the
  answer. Every beat is skippable, and the throne will replay it any time.
- **Afterwards, the world is better and — more importantly — it is
  *tended*.** Pip runs a riddle contest for other kids. Miscount teaches
  ("my students show their work *twice*"). Callie is training two harbour
  children on the lenses. Maren has apprentices and, thrillingly, a rota.
- **✨ Golden Numeria** (from the throne): walk the whole kingdom again, with
  every dungeon re-sealed and every boss back and tougher — while you keep
  your level, gear, gems, charms, badges, Monster Book, pet, and crown.

### 🌀 The Tending — life after the ending

You're the MathMaker now, which means tending the kingdom *is* the job. A few
small, renewable reasons to open the game on any random Tuesday:

- **Daily Tangles** — each real day, one to three little scribble-knot
  monsters turn up somewhere in the kingdom (the notice board says roughly
  where). Untangling one is a short, easy battle drawing from everything
  you've learned. The reward is small gold and a counter — **"days
  tended," which only ever counts up.** Missing a week costs nothing; there
  is no streak to lose. Milestones at 10, 50, and 100 days are celebrated
  and shown on your Hall of Heroes plaque.
- **The Spiral Stair** — a tower beside the castle, climbing as far as
  you're willing to go. Every floor is a small room with a couple of
  problems and a tangle or two; every fifth floor is a landing — a
  breather, a chest, and a checkpoint. Beacon always brings you back to
  the tower's own entrance, and you can jump straight to your highest
  landing any time — nothing is ever lost, and this is deliberately *not*
  a roguelike.
- **Furnish the castle** — a rug, a garden bed, a library shelf, statues of
  bosses you've beaten, and — at long last — **tiny hats for the pet**,
  all bought at fixed spots around the castle, all permanent, all
  genuinely visible the moment you buy them.
- **The Hall of Heroes plaque** grows to match: days tended, your highest
  Spiral floor, and how many of Miscount's students you've helped. Miscount's
  Academy itself visibly grows with attendance too — more desks, then a
  proper chalkboard, then (at 100 slates checked) a class photo by the door.

### 🐣🗡 The Two Kids Update

Some kids want the fight. Some kids want it gentle. Numeria now leans a
little further toward both, at once:

- **Monster telegraphs** — in the mixed-review dungeons (11+), many monsters
  carry a small topic icon over their head. It's a promise, not decoration:
  that monster asks about that topic. (Switch the topic off in Parent
  Settings and the icon disappears — it never lies about what's coming.)
- **Overwhelm** — outlevel a dungeon badly enough (the game notices) and its
  regular monsters give you a break: one quick problem, answered correctly,
  is an instant win — full rewards, no fight. Miss it and the battle just
  starts normally, no penalty either way. Bosses never skip.
- **Rust** — a topic you haven't touched in a while quietly moves back
  toward the front of the practice queue, and the notice board says so
  ("the Old Mine misses you"). Spaced practice, framed as the world needing
  a little tending rather than a nag.
- **Growth, not grades** — the report card now shows a plain-English line
  per topic ("9 of your last 10"), never a percentage. The parent panel adds
  a quiet weekly trend (▲/▼) per topic and an expandable peek at the last
  few actual wrong answers — the fastest way to spot a real pattern (like a
  regrouping slip) without a single scary number.
- **"Almost!"** — get within a few correct answers of your next badge and
  the bag icon gets a little sparkle, with one gentle nudge in the log.
- **A little more life in the world** — the shopkeeper keeps whatever you
  just sold on the shelf behind her, the inn cat sleeps somewhere new every
  day (give it a pat for +1 stamina), guards snooze until you get close,
  thieves admire their loot, and the Monster Book now keeps count of every
  tiny hat respectfully retired.

### 🕊 Your way: boldly, or gently

Before your very first monster, the MathMaker stops you at the door and asks
one question: **"How will you face the tangles — boldly, or gently?"**

Your answer is your **way** — one path, lived in, not a button to juggle
mid-fight. Battles show just your problem, ⚡ Brave, and Flee. Changing your
way is always allowed and always free: it's right there in the **⚙️ menu**,
one click, nothing lost, every friend kept. *("You can always change your
way. Most heroes do, eventually.")*

- **⚔️ Boldly** — the classic. Answer correctly, hit the monster.
- **🕊 Gently** — **exactly the same math, exactly the same rewards.** A correct
  answer doesn't wound the monster; it *loosens the tangle in it* — with a soft
  chime, and each gentle instrument sheds its own calm (the bubble pipe blows
  actual bubbles). The bar fills with calm instead of draining with damage, and
  when it's full the monster doesn't splat — it un-tenses, does whatever its kind
  does when it's finally at ease (the slime bounces, the frost pup rolls over,
  the golem sits down at last after four hundred years), nudges a pouch of gold
  over as a *gift* — **and then it stays**, right where you calmed it, at full
  health in its soft colours with a little 🤍 heart above its head. No ⚔ mark
  goes in the book for a calmed friend — only the 🤍. If it was wearing a tiny
  hat, it tips it to you.

Taming is **one creature at a time**: the monster you calm stays calm —
heart above its head, settled where you soothed it, politely stepping aside
if you bump it — while its wild kin stay wild until you calm them too. Your
Monster Book still collects the **kinds** you've befriended on a second
collection page (🤍), for good. When a floor's boss goes down, every calmed
friend in the room bounces.

The shop lays its weapons out under **🕊 For gentle hands** and **⚔️ For bold
arms** — your kind first, everything else right below it, all of it always
buyable. There are four gentle instruments (a ribbon streamer, a bubble pipe, a
cat-fishing wand, a set of chime bells), each exactly as strong as the sword or
axe it sits beside. Any stance can wield anything. The identity is offered, never
enforced.

### ⚡ Brave problems

A sticky **⚡ Brave** toggle sits in every battle — and the first time you touch
it, the battle itself tells you the deal. Turn it on and every problem comes
harder than you'd normally get (in the facts topics that means *chains* —
`6 + 9 + 7`, `36 ÷ 4 × 5` — never plain small sums) — and every correct answer
hits for **double damage**, in gold lightning. The double only ever pays for a
question that was actually asked the hard way.

Get one wrong and *nothing extra happens*. It's an ordinary miss. Bravery is
never a trap. Your lifetime count of brave problems solved is kept on your report
card and your plaque in the Hall of Heroes — pride that outlives the fight.

(Bosses stay real fights: no brave strike can take more than a third of one.)

### 📝 Miscount's Academy

Once Miscount is a teacher again (after the tenth task), he'll start bringing you
his students' homework — two or three slates a day. **You mark it.** Some of them
have exactly one wrong step in them, and some of them are perfect, and saying
"it's all correct" is always a real answer.

Finding someone *else's* mistake is the safest, kindest practice there is —
especially for a kid who's frightened of making her own. Miscount is enormously
proud of his students, and quietly delighted every time you catch something he
missed.

### 🌍 The World Notices

The mid-game used to feel quiet between big dungeons. Now the kingdom
visibly notices what you've done, in small ways that never gate anything
and never require you to go looking for them.

- **The courtyard, out front of the castle.** Thirteen worn paving stones,
  laid in a row you cross every single time you walk up to turn in a task.
  Each one turns a little straighter every time you set something right —
  by the time all thirteen line up, they've traced a complete spiral. Sage
  Sylvia has a line about them if you ask; the MathMaker has exactly one
  dry remark ("the floor out front has opinions about geometry"). Neither
  of them explains it further. Nobody has to notice the stones at all —
  the ending works just fine without them — but a kid who *does* count
  them has, quietly, already been handed the answer to the game's very
  last question.
- **The cast remembers you.** Callie, Percy, the captain, Miscount, Sylvia,
  Barnaby, and old Fisher Finn each pick up new lines once the lighthouse
  is lit, the Spire ticks again, the Halls sing, or a harbor gets rebuilt —
  word travels, even to people who were never there.
- **A fence gets mended.** Sometime around the middle of the mainland
  quest, the gap in Farmer Fenwick's fence — the one you've walked past
  since task one — finally gets fixed. He and his hired hand say thank you,
  once, and then it's just a fence again.
- **Three things that happen, at most, once.** Somewhere out there: a bird
  that isn't native to Numeria, a very proud cat, and two slimes who have
  clearly been sharing a hat for far too long. None of them are worth
  chasing — if you never see one, you haven't missed anything, and the
  game will never tell you that you did.

### A few playtest fixes

A real play session turned up some friction, since fixed: every locked door
and math door in the game now actually guards something (a few old ones
didn't); **monsters you clear out of a dungeon stay gone for the rest of
the real day**, so ducking out to heal doesn't undo your work (bosses are
unaffected — beating one is permanent, same as always); and a new
**Hearthmoss Charm** 🌿 (sold at the Brass Compass, or found in any chest)
heals a little as you simply walk, making long dungeon crawls gentler.

A later playtest turned up more: the **shop** now has tabs (⚔️ Gear, 🧪
Supplies, 💰 Sell) instead of one long scroll, gear rows show how the item
compares to what you're already wearing ("⚔️ 12 · you: 10 ▲"), and **bulk
potions** (×5, ×10) are always on the shelf now — just greyed out if you're
short on gold, instead of staying hidden until you'd bought enough to
"unlock" them.

And the Clockwork Spire's **gear-plate puzzle can now be read**. The three
brass gates are marked **•**, **••** and **•••**, only one is open at a time,
and the ⚙ plate always shows the pips of whichever gate is currently open —
so you can tell what it will do *before* you step on it. Pull it and the log
says which gate opened, and that gate **glints** so you can see what changed
across the room. (Before, a closed gate was drawn as a plain wall and an open
one as bare floor, which is exactly why it read as a glitch rather than a
puzzle.)

The long-term roadmap (bigger dungeons, and much
more) lives in `EXPANSION_PLAN.md`.

### Everything else

- **Locked doors 🚪 and chests 🎁** open with harder problems (no combat).
- **The shop 🏪** sells weapons/armor/potions; answer a money question for 10% off.
- **The inn 🛏** fully heals you after three easy warm-up problems.
- Press **P** for a potion, **R** for the report card, **Help** for the rules.
- Defeat is gentle: you're rescued, lose half your gold, keep all progress.

## The ten tasks (5th-grade ladder)

1. Meadow Cave — addition & subtraction facts
2. Rat Cellar — multiplication & division facts
3. Old Mine — multi-digit addition & subtraction
4. Forest Ruin — multi-digit multiplication
5. River Catacombs — long division (answers like `14 r 2`)
6. Crystal Grotto — decimals: place value, comparing, add & subtract
7. Merchant's Vault — decimals: multiply, divide & money
8. Fraction Fortress — fractions: equivalence, add & subtract
9. Wizard's Tower — fractions: multiply & mixed numbers
10. Tower of Trials — mixed word problems

Later dungeons mix in review of earlier topics, weighted toward whatever the
player has been missing. Difficulty adapts (3 tiers per topic) to recent
accuracy. Answers accept equivalent forms: `3/4`, `6/8`, `0.75`, `1 3/4`,
`$3.50`, `14 r 2` all parse.

**For parents/teachers:** the 📊 Report Card shows per-topic accuracy.

## Code layout

| File | What it does |
|---|---|
| `js/problems.js` | Problem generators (10 skills × 3 tiers), exact-rational answer checking, input parser |
| `js/mastery.js` | Per-skill accuracy tracking, adaptive tier selection, review mixing |
| `js/data.js` | Tasks, story text, monster rosters + palettes, equipment, battle themes |
| `js/maps.js` | Overworld + ten dungeon maps (ASCII tile art) |
| `js/sprites.js` | Original pixel-art sprites as character maps (terrain, hero, 9 monster archetypes, palette swaps) |
| `js/battle.js` | Turn-based battle screen: HP bars, tweens, particles, screen shake, damage numbers, crits, victory panel |
| `js/engine.js` | Movement, monster AI, battle hooks, doors/chests, town, save/load |
| `js/ui.js` | Animated world rendering, problem modal + scratchpad, shop, report card, WebAudio sounds |
| `js/main.js` | Boot + player profiles |
| `assets/` | Press Start 2P pixel font (SIL Open Font License — see OFL.txt) |

No dependencies, no build step — plain HTML/CSS/JS. All sprite art is
original, drawn as character-map pixel grids in `sprites.js`.

### Why no game framework?

Phaser/PixiJS and downloadable asset packs were considered and rejected on
purpose: browsers block XHR asset loading from `file://` URLs, so a framework
build would break the double-click-to-play, works-offline property. The
effects that make battles exciting (tweens, particles, shake, floating text)
are small enough to own directly — see `battle.js`.
