// MathMaker v2 — static game data: tasks, skills, monsters, equipment, themes.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  MM.data = {};

  MM.data.SKILL_NAMES = {
    addsub_facts: 'Addition & Subtraction Facts',
    muldiv_facts: 'Multiplication & Division Facts',
    multidigit_addsub: 'Multi-Digit Add & Subtract',
    multidigit_mult: 'Multi-Digit Multiplication',
    long_division: 'Long Division',
    decimals_ps: 'Decimals: Place Value, Compare, Add & Subtract',
    decimals_md: 'Decimals: Multiply, Divide & Money',
    fractions_as: 'Fractions: Equivalence, Add & Subtract',
    fractions_m: 'Fractions: Multiply & Mixed Numbers',
    word_problems: 'Word Problems',
    time_reading: 'Reading Time (Clocks)',
    geometry: 'Geometry: Perimeter, Area & Volume',
    music_reading: 'Reading Music (Notes & Rhythm)',
  };

  // Wave 3: the parent-panel checklist used to derive itself from TASKS (the
  // ten mainland dungeon topics) — that broke down once a topic (time_reading)
  // needed to exist WITHOUT a mainland dungeon of its own. This is now the
  // one source of truth for "every topic a parent can see/toggle" — used by
  // mastery.cappedSkills and ui.parentSettings. Order here is display order.
  // Every topic defaults ON, no exceptions (2026-07-11 user decision):
  // missing from state.parent.topics reads as enabled (mastery.cappedSkills),
  // and nothing may seed a topic to false — the parent panel is the one
  // OFF-switch. (Wave 4 briefly force-wrote music_reading to false on load;
  // that migration is gone.)
  // Wave 8a (P2, monster telegraphs): a small icon drawn over every monster's
  // head (drawWorld) and shown on its bestiary card — "which fight is this?"
  // is agency for the anxious kid and a target list for the brave one.
  // Registry-complete: a unit test cross-checks this against PARENT_TOPICS,
  // so a new topic can never ship without a matching icon.
  MM.data.SKILL_ICONS = {
    addsub_facts: '➕',
    muldiv_facts: '✖️',
    multidigit_addsub: '🧮',
    multidigit_mult: '🔢',
    long_division: '➗',
    decimals_ps: '📏',
    decimals_md: '💰',
    fractions_as: '🍕',
    fractions_m: '🎂',
    word_problems: '📖',
    time_reading: '🕐',
    geometry: '📐',
    music_reading: '🎵',
  };

  MM.data.PARENT_TOPICS = [
    'addsub_facts', 'muldiv_facts', 'multidigit_addsub', 'multidigit_mult',
    'long_division', 'decimals_ps', 'decimals_md', 'fractions_as', 'fractions_m',
    'word_problems', 'time_reading', 'geometry', 'music_reading',
  ];

  // The ten tasks, in curriculum order. Dungeon i on the map uses TASKS[i-1].
  MM.data.TASKS = [
    {
      skill: 'addsub_facts', dungeon: 'Meadow Cave', item: 'Copper Coin of Counting', itemEmoji: '🪙',
      assign: 'Your first task! Deep in the <b>Meadow Cave</b> to the west lies the <b>Copper Coin of Counting</b>. The beasts there fall to anyone quick with adding and subtracting. Bring me the coin!',
      done: 'The Copper Coin of Counting! Splendid. Your sums are sharp indeed.',
      story: 'Strange, though... the beasts of the Meadow Cave were gentle once. Something — or someone — is stirring confusion into every corner of Numeria.',
    },
    {
      skill: 'muldiv_facts', dungeon: 'Rat Cellar', item: 'Stone Times Table', itemEmoji: '🪨',
      assign: 'The rats of the <b>Rat Cellar</b> have stolen the <b>Stone Times Table</b> — an actual table, carved with every times fact. Rats fear multiplication and division. Retrieve it!',
      done: 'The Stone Times Table returns! The rats never stood a chance against your facts.',
      story: 'Torn pages in the rats\' nests, you say? Pages of unfinished arithmetic, every answer a guess... I have seen handwriting like that before. Long ago.',
    },
    {
      skill: 'multidigit_addsub', dungeon: 'Old Mine', item: "Miner's Golden Ledger", itemEmoji: '📒',
      assign: 'In the <b>Old Mine</b>, the ghostly miners still tally enormous heaps of gold. Master adding and subtracting big numbers — with regrouping! — and recover the <b>Miner\'s Golden Ledger</b>.',
      done: 'The Golden Ledger! Every column lines up perfectly. Well regrouped!',
      story: 'The ghost miners whispered a name? <b>Miscount</b>... no. No, it cannot be. Forgive me, hero — I must think. Bring me the next treasure.',
    },
    {
      skill: 'multidigit_mult', dungeon: 'Forest Ruin', item: 'Golden Abacus', itemEmoji: '🧮',
      assign: 'An ancient <b>Forest Ruin</b> hides the <b>Golden Abacus</b>. Its guardians multiply their strength — you must multiply better. Two digits times two digits, and more!',
      done: 'The Golden Abacus — magnificent! Your multiplication grows mighty.',
      story: 'You deserve the truth. <b>Miscount was my apprentice</b> — the brightest I ever taught. But he began to guess instead of working things out, and when his answers crumbled around him, he fled into the wild. I never saw him again.',
    },
    {
      skill: 'long_division', dungeon: 'River Catacombs', item: "Divider's Compass", itemEmoji: '🧭',
      assign: 'Beneath the river lie the <b>River Catacombs</b>. The <b>Divider\'s Compass</b> is hidden there, guarded by creatures that split into pieces — and leave remainders. Long division is your blade!',
      done: 'The Divider\'s Compass! You divided, conquered, and accounted for every remainder.',
      story: 'The compass needle will not point north — it spins toward the <b>Tower of Trials</b>. Whatever became of Miscount, the confusion flooding Numeria flows from that tower.',
    },
    {
      skill: 'decimals_ps', dungeon: 'Crystal Grotto', item: 'Decimal Crystal', itemEmoji: '💎',
      assign: 'The <b>Crystal Grotto</b> glitters with the <b>Decimal Crystal</b>. Its point splits whole from part — know your tenths from your hundredths, compare with care, and it is yours.',
      done: 'The Decimal Crystal! You see clearly on both sides of the point now.',
      story: 'A vision in the crystal? A boy in a grey robe, weeping over a slate of errors... oh, Miscount. He was never wicked, you understand. Only lost, and too ashamed to ask for help.',
    },
    {
      skill: 'decimals_md', dungeon: "Merchant's Vault", item: 'Silver Scale of Truth', itemEmoji: '⚖️',
      assign: 'A greedy spirit haunts the <b>Merchant\'s Vault</b>, hoarding the <b>Silver Scale of Truth</b>. Multiply and divide decimals — count every last cent — and take back the Scale.',
      done: 'The Silver Scale! Every cent accounted for. A merchant\'s nightmare, you are.',
      story: 'He hoards what he cannot count. Coins, scales, silver — the Lord of Confusion cannot bear to see numbers put right, because once, he believed they betrayed him.',
    },
    {
      skill: 'fractions_as', dungeon: 'Fraction Fortress', item: 'Amulet of Halves', itemEmoji: '🧿',
      assign: 'The <b>Fraction Fortress</b> was built from unequal parts. Inside waits the <b>Amulet of Halves</b>. Make unlike denominators alike, add and subtract the pieces, and claim it.',
      done: 'The Amulet of Halves, made whole! Your fractions are in perfect proportion.',
      story: 'Listen to what the amulet hums: <i>even what is broken can be made whole.</i> Hold onto those words when you reach the tower.',
    },
    {
      skill: 'fractions_m', dungeon: "Wizard's Tower", item: "Wizard's Hourglass", itemEmoji: '⏳',
      assign: 'High in the <b>Wizard\'s Tower</b>, fractions multiply upon fractions. Seize the <b>Wizard\'s Hourglass</b> — but beware mixed numbers on the upper floors!',
      done: 'The Wizard\'s Hourglass! You multiplied fractions faster than the wizard could blink.',
      story: 'The hourglass cannot turn time backward — but anyone may begin again. Go to the Tower of Trials. Face the Lord of Confusion. And remember: beneath those shadows is a student. Like you, once.',
    },
    {
      skill: 'word_problems', dungeon: 'Tower of Trials', item: 'Crown of Numbers', itemEmoji: '👑',
      assign: 'Your final task. The <b>Tower of Trials</b> tests everything at once — every problem wrapped in a story. Bring me the <b>Crown of Numbers</b>, and your training is complete!',
      done: 'The Crown of Numbers! And something far greater: you have brought Miscount home.',
    },

    // ===== the expansion: Miscount's tasks, east of the bridge =====
    // mixed:true means problems draw from ALL ten topics (weakest-first).
    // These are assigned and turned in by MISCOUNT, not the castle.
    {
      exp: true, mixed: true, skill: null,
      dungeon: 'Cavern of Echoes', item: 'Echoing Bell', itemEmoji: '🔔',
      assign: 'Miscount shuffles his feet. "While I was... confused... I took things that weren\'t mine. The valley folk\'s <b>Echoing Bell</b> is hidden in the <b>Cavern of Echoes</b>. Its guardians ask questions from <i>everywhere</i> — everything you\'ve ever learned. Help me return it?"',
      done: '"The Echoing Bell! The valley folk will hear their morning chimes again. Thank you — one wrong thing put right."',
      story: 'Miscount rings the bell softly. "Funny. When I took it, it sounded like nonsense. Now it just sounds... clear."',
    },
    {
      exp: true, mixed: true, skill: null,
      dungeon: 'Sunken Library', item: 'Grand Book of Problems', itemEmoji: '📖',
      assign: '"The <b>Grand Book of Problems</b> belongs to the royal library — I dropped it in the <b>Sunken Library</b> when the confusion took me. The ghosts there have been reading it ever since. They\'ve gotten <i>good</i>. Be ready for anything."',
      done: '"The Grand Book! Look — my old homework is still tucked inside. Every answer guessed... I think I\'ll redo them all. Properly."',
      story: 'Miscount hugs the book to his chest. "Two returned. One left. The big one."',
    },
    {
      exp: true, mixed: true, skill: null,
      dungeon: 'Star Peak', item: 'Star of Numeria', itemEmoji: '⭐',
      assign: '"The last one. The <b>Star of Numeria</b> used to shine from the top of <b>Star Peak</b> — sailors and travelers steered by it. I hid it because... because I couldn\'t stand anything that pointed the right way. The climb asks the hardest questions in the kingdom. I believe in you."',
      done: '"The Star of Numeria — back where it belongs." That night, the star rises over the peak, and the whole kingdom glows. "You know," Miscount says quietly, "you didn\'t just fix my mistakes. You showed me how to fix them myself."',
    },

    // ===== the Uncharted Isles (Level 2, LEVEL2_SPEC.md) =====
    // isle:true — not a castle/Miscount task: reached by ship, and the boss
    // re-lights a lighthouse LENS instead of dropping a quest item.
    {
      exp: true, isle: true, mixed: true, skill: null, lens: 'tidepool',
      dungeon: 'Tidepool Grotto', item: 'Tide Lens', itemEmoji: '🔆',
      assign: 'The Tide Lens of the Tidepool Grotto has gone dark.',
      done: 'The Tide Lens shines again!',
    },
    {
      exp: true, isle: true, mixed: true, skill: null, lens: 'frostbite',
      dungeon: 'Frostbite Hollow', item: 'Frost Lens', itemEmoji: '❄️',
      assign: 'The Frost Lens of Frostbite Hollow has gone dark.',
      done: 'The Frost Lens shines again!',
    },
    {
      exp: true, isle: true, mixed: true, skill: null, lens: 'cinderforge',
      dungeon: 'Cinderforge Depths', item: 'Cinder Lens', itemEmoji: '🔥',
      assign: 'The Cinder Lens of the Cinderforge Depths has gone dark.',
      done: 'The Cinder Lens shines again!',
    },
    // dungeon 17 — the finale. finale:true (not `lens`) tells startCombat's
    // victory() to run the Keeper-of-the-Light ending instead of the usual
    // "a lens blazes to life" text.
    {
      exp: true, isle: true, mixed: true, skill: null, finale: true,
      dungeon: 'Great Lighthouse', item: 'Great Lamp', itemEmoji: '🗼',
      assign: 'The Great Lighthouse stands sealed behind the last of the Murk.',
      done: 'The lamp is lit!',
    },
    // dungeon 18 — the Smugglers' Vault: never assigned, found only by
    // exploring. statIndex pins its monster STATS to Cinderforge's tier (16)
    // even though its dungeon index (18, for map/theme/roster lookups) is
    // higher — it's an optional side dungeon, not meant to outscale the
    // mandatory Lighthouse. vault:true routes its boss reward in victory().
    {
      exp: true, isle: true, mixed: true, skill: null, vault: true, statIndex: 16,
      dungeon: "Smugglers' Vault", item: null, itemEmoji: null,
      assign: 'A smugglers\' cave, walled up and forgotten — until a pet\'s nose found the crack.',
      done: '',
    },
    // dungeon 19 — the Clockwork Spire, Horologe Isle's own finale. spire:true
    // (not `lens` or `finale`, both already spoken for) tells startCombat's
    // victory() to run its own ending text and set s.isles.spireDone — the
    // flag a later wave can gate a fourth sail destination on.
    {
      exp: true, isle: true, mixed: true, skill: null, spire: true,
      dungeon: 'Clockwork Spire', item: 'Gearheart Cog', itemEmoji: '⚙️',
      assign: "Horologe Isle's Clockwork Spire has run down and stopped, its gears frozen mid-turn.",
      done: 'The Spire ticks again!',
    },
    // dungeon 20 — the Resonant Halls, Chime Isle's finale. chime:true (not
    // `spire`, `finale`, `lens`, or `vault` — all spoken for) tells
    // startCombat's victory() to run its own ending text and set
    // s.isles.hallsDone.
    {
      exp: true, isle: true, mixed: true, skill: null, chime: true,
      dungeon: 'Resonant Halls', item: 'Silent Bell', itemEmoji: '🔔',
      assign: "Chime Isle's Resonant Halls have gone quiet — not a single note left in them.",
      done: 'The Halls sing again!',
    },
    // dungeon 21 — the Sunken Breakwater, Gullwrack Harbor's finale.
    // breakwater:true (not `spire`, `chime`, `finale`, `lens`, or `vault` —
    // all spoken for) tells startCombat's victory() to run its own ending
    // text and set s.isles.breakwaterDone. Wave 6: the ONE isle dungeon
    // with mixed:false + a real skill — its monsters draw from the
    // Breakwater's own 50/50 picker (pickBreakwaterProblem/Gate in
    // mastery.js), not the generic all-topics mixed pool every other isle
    // dungeon uses.
    {
      exp: true, isle: true, mixed: false, skill: 'geometry', breakwater: true,
      dungeon: 'Sunken Breakwater', item: "Mason's Level", itemEmoji: '📐',
      assign: "Gullwrack Harbor's Sunken Breakwater has crumbled into the sea, and something's nesting in the wreckage.",
      done: 'The Breakwater holds again!',
    },
    // dungeon 22 — Wave 9: the Spiral Stair. Post-game only (gated on
    // s.endingDone, not on this entry — see E.spiralOpen). No quest item,
    // no Miscount turn-in: item:null routes startCombat.victory() away from
    // the generic "you found the X" text (see the `spiral` branch there),
    // exactly like the Vault's item:null. `spiral:true` (not `vault`,
    // `finale`, `spire`, `chime`, or `breakwater` — all spoken for) marks a
    // landing's tangle-boss as defeated-forever without setting s.haveItem.
    // Its floors are NOT hand-authored: MM.maps.dungeonFloors special-cases
    // idx 22 to build a long procedural run from a small chunk pool (see
    // maps.js). statIndex is likewise special-cased per-floor in
    // E.enterDungeon (a slow ramp past 21), not read from here.
    {
      exp: true, mixed: true, skill: null, spiral: true,
      dungeon: 'The Spiral Stair', item: null, itemEmoji: null,
      assign: '', done: '',
    },
  ];

  // Battle-scene colors per dungeon (sky gradient + ground).
  MM.data.THEMES = [
    { sky1: '#2c4a6e', sky2: '#3d6b52', ground: '#2e5231', accent: '#7ec850' },
    { sky1: '#241c33', sky2: '#3d3050', ground: '#2a2438', accent: '#a88ad4' },
    { sky1: '#2b2114', sky2: '#4a3a24', ground: '#332818', accent: '#e0a952' },
    { sky1: '#16301c', sky2: '#2c5232', ground: '#1d3a22', accent: '#68c470' },
    { sky1: '#101c2e', sky2: '#234261', ground: '#152638', accent: '#52a8e0' },
    { sky1: '#152838', sky2: '#2a5468', ground: '#1a3344', accent: '#7ee0e8' },
    { sky1: '#332a10', sky2: '#5c4c20', ground: '#403614', accent: '#ffd94a' },
    { sky1: '#33141e', sky2: '#5c2838', ground: '#401a26', accent: '#f47a9a' },
    { sky1: '#1c1433', sky2: '#38285c', ground: '#241a40', accent: '#b08aff' },
    { sky1: '#1a0f14', sky2: '#3d1a24', ground: '#26141a', accent: '#ff6b5c' },
    { sky1: '#0f2626', sky2: '#1f4a44', ground: '#143330', accent: '#5ce8d0' },  // 11 echoes
    { sky1: '#0f1a33', sky2: '#20365c', ground: '#142440', accent: '#6ba8f0' },  // 12 library
    { sky1: '#140f2b', sky2: '#2c2152', ground: '#1c1438', accent: '#ffe27a' },  // 13 star peak
    { sky1: '#0e2438', sky2: '#1d5a5e', ground: '#14383c', accent: '#5ee8c8' },  // 14 tidepool grotto
    { sky1: '#0e1e33', sky2: '#2c5a78', ground: '#16344a', accent: '#9adcf0' },  // 15 frostbite hollow
    { sky1: '#2b0f0e', sky2: '#5c2418', ground: '#38160f', accent: '#ff8a4a' },  // 16 cinderforge depths
    { sky1: '#1c2430', sky2: '#3a4a58', ground: '#242e38', accent: '#dce8ec' },  // 17 great lighthouse
    { sky1: '#1a1c2e', sky2: '#2c2440', ground: '#201c34', accent: '#ffd94a' },  // 18 smugglers' vault
    { sky1: '#241c14', sky2: '#4a3a20', ground: '#2e2414', accent: '#e0b84a' },  // 19 clockwork spire
    { sky1: '#1c1430', sky2: '#3d2a5c', ground: '#241c3a', accent: '#e88ac4' },  // 20 resonant halls
    { sky1: '#0e1f2b', sky2: '#1f3f4a', ground: '#152d34', accent: '#7ab8b0' },  // 21 sunken breakwater
    { sky1: '#211c33', sky2: '#3a3050', ground: '#241f38', accent: '#cfc6e8' },  // 22 the Spiral Stair
  ];

  // Monster rosters per dungeon (1-10): sprite + palette swap + attack verb.
  // Palettes recolor the base sprite's body chars (see sprites.js DEFS).
  const P = {
    mouse: { A: '#c4a888', B: '#a0876b' },
    boar: { A: '#6b4a38', B: '#523829', F: '#b08868', T: '#a88a70' },
    paleGhost: { A: '#d4e4dc', B: '#a8c4b8' },
    iceGhost: { A: '#c8ecf4', B: '#90ccdd', k: '#1c3a44' },
    goldGhost: { A: '#f0e0b0', B: '#d4bc80', k: '#443c1c' },
    brightGhost: { A: '#fff4c4', B: '#ffd94a', k: '#5c4a10' },
    voidGhost: { A: '#4a4066', B: '#332c4d', E: '#ff5c5c', k: '#12101f' },
    crystalSpider: { A: '#7ecfe0', B: '#57a8bc', L: '#3d7488', W: '#d4f2f8', E: '#1a5c6e' },
    krakenSpider: { A: '#7a4fa8', B: '#5c3a80', L: '#43285e', E: '#ffd94a' },
    stoneBat: { A: '#8a8578', B: '#6b665a', m: '#524e44', E: '#e05252' },
    owlBat: { A: '#a8845c', B: '#86653f', m: '#6b4e2c', E: '#ffd94a' },
    steelSkeleton: { W: '#b8c4d8', w: '#8b97b0', E: '#e05252' },
    ghoulSkeleton: { W: '#c4d8a8', w: '#9ab080', E: '#7a1f1f' },
    goldGolem: { A: '#d8b04a', B: '#b08a2c', m: '#8a6a1c', W: '#f0d888', E: '#ffffff' },
    sandGolem: { A: '#d4b888', B: '#b0945f', m: '#8a7248', W: '#ecd8b0', E: '#2c8a8a' },
    redMage: { H: '#c04a3c', h: '#96352a', A: '#66332c' },
    darkMage: { H: '#3d3050', h: '#2a2138', A: '#241c33', E: '#ff5c5c' },
    kingSlime: { A: '#48b854', B: '#338a3e', W: '#a5e8a9', M: '#26702f' },
    iceSnake: { A: '#8ad4e0', B: '#5ca8bc', W: '#d8f4f8', k: '#1c4450', T: '#5cc4e0' },
  };

  // desc = the monster's card in the 📕 Monster Book (revealed when defeated).
  // Humor rule: the joke is always on the monster. Story-boss entries stay sincere.
  MM.data.MONSTERS = [
    { types: [
        { name: 'Slime', sprite: 'slime', pal: null, verb: 'squishes',
          desc: 'Numeria\'s most common monster. Mostly water, partly attitude.' },
        { name: 'Field Mouse', sprite: 'rat', pal: P.mouse, verb: 'nibbles',
          desc: 'Not really a monster — just extremely confused and surprisingly bitey.' }],
      boss: { name: 'Giant Slime King', sprite: 'slime', pal: P.kingSlime, verb: 'body-slams',
          desc: 'Royalty among slimes — a low bar, cleared magnificently.' } },
    { types: [
        { name: 'Cellar Rat', sprite: 'rat', pal: null, verb: 'bites',
          desc: 'Enjoys cheese, naps, and multiplying. Not the math kind. Well — also the math kind.' },
        { name: 'Bat', sprite: 'bat', pal: null, verb: 'swoops at',
          desc: 'Sleeps all day, screeches all night. A teenager, basically.' }],
      boss: { name: 'Rat Chieftain', sprite: 'rat', pal: P.boar, verb: 'gnaws',
          desc: 'Chief by size. The election was brief and one-sided.' } },
    { types: [
        { name: 'Cave Spider', sprite: 'spider', pal: null, verb: 'snares',
          desc: 'Eight legs, eight eyes, zero interest in your excuses.' },
        { name: 'Ghost Miner', sprite: 'ghost', pal: P.paleGhost, verb: 'chills',
          desc: 'Still tallying gold that isn\'t there. Refuses to clock out.' }],
      boss: { name: 'Pit Ghoul', sprite: 'skeleton', pal: P.ghoulSkeleton, verb: 'claws',
          desc: 'Lives at the very bottom of the mine. Housing down there is very affordable.' } },
    { types: [
        { name: 'Wild Boar', sprite: 'rat', pal: P.boar, verb: 'charges',
          desc: 'Charges first, thinks never.' },
        { name: 'Forest Imp', sprite: 'mage', pal: P.redMage, verb: 'jabs',
          desc: 'Small, quick, and rude in at least three languages.' }],
      boss: { name: 'Ruin Golem', sprite: 'golem', pal: null, verb: 'smashes',
          desc: 'The ruin\'s original security system. Nobody told it the job ended centuries ago.' } },
    { types: [
        { name: 'River Snake', sprite: 'snake', pal: null, verb: 'strikes',
          desc: 'Swims beautifully, sulks constantly.' },
        { name: 'Skeleton', sprite: 'skeleton', pal: null, verb: 'slashes',
          desc: 'All that remains of a warrior who skipped math practice. Draw your own conclusions.' }],
      boss: { name: 'Catacomb Kraken', sprite: 'spider', pal: P.krakenSpider, verb: 'grabs',
          desc: 'Too big for the river, too stubborn to leave.' } },
    { types: [
        { name: 'Crystal Crab', sprite: 'spider', pal: P.crystalSpider, verb: 'pinches',
          desc: 'Its pinch is precise to the hundredth.' },
        { name: 'Ice Sprite', sprite: 'ghost', pal: P.iceGhost, verb: 'freezes',
          desc: 'Cold hands, colder heart, weirdly good manners.' }],
      boss: { name: 'Crystal Basilisk', sprite: 'snake', pal: P.iceSnake, verb: 'crunches',
          desc: 'Its icy stare is famous. Its crunch is what you should worry about.' } },
    { types: [
        { name: 'Coin Mimic', sprite: 'golem', pal: P.goldGolem, verb: 'clobbers',
          desc: 'Pretends to be treasure. Has never once considered pretending to be something that isn\'t immediately grabbed.' },
        { name: 'Greedy Ghost', sprite: 'ghost', pal: P.goldGhost, verb: 'swindles',
          desc: 'Haunts its own money. Won\'t spend it, won\'t share it, won\'t stop counting it — badly.' }],
      boss: { name: 'Vault Keeper', sprite: 'golem', pal: P.goldGolem, verb: 'slams',
          desc: 'Guards the vault. Also the hallway, the doormat, and one particular coin it likes.' } },
    { types: [
        { name: 'Stone Gargoyle', sprite: 'bat', pal: P.stoneBat, verb: 'dives at',
          desc: 'Sits perfectly still for years, then dives at exactly the wrong moment. For you.' },
        { name: 'Fortress Knight', sprite: 'skeleton', pal: P.steelSkeleton, verb: 'strikes',
          desc: 'Sworn to guard the fortress. Nobody remembers who it swore to.' }],
      boss: { name: 'Fraction Fiend', sprite: 'mage', pal: P.redMage, verb: 'zaps',
          desc: 'Splits everything into unequal parts and keeps the bigger ones.' } },
    { types: [
        { name: 'Magic Wisp', sprite: 'ghost', pal: P.brightGhost, verb: 'shocks',
          desc: 'A spark that escaped a spell and never looked back.' },
        { name: 'Tower Owl', sprite: 'bat', pal: P.owlBat, verb: 'pecks',
          desc: 'Knows exactly how wise it looks. Leans into it.' }],
      boss: { name: 'Archmage of Errors', sprite: 'mage', pal: null, verb: 'blasts',
          desc: 'Every mistake ever made in the tower, wearing one robe.' } },
    { types: [
        { name: 'Chaos Imp', sprite: 'mage', pal: P.darkMage, verb: 'jabs',
          desc: 'Files everything in the wrong place. On purpose. With joy.' },
        { name: 'Riddle Sphinx', sprite: 'golem', pal: P.sandGolem, verb: 'swipes',
          desc: 'Asks riddles it doesn\'t know the answers to. Gets very upset when you do.' },
        { name: 'Shadow', sprite: 'ghost', pal: P.voidGhost, verb: 'engulfs',
          desc: 'A patch of dark that learned to be a nuisance.' }],
      boss: { name: 'Lord of Confusion', sprite: 'ghost', pal: P.voidGhost, verb: 'warps reality around',
          desc: 'Not a villain — a student who got lost and forgot that help exists. You know how this story ends: you ended it well.' } },
    // 11: Cavern of Echoes
    // Wave 8a (P2): mixed dungeons bind each regular TYPE to a topic — its
    // telegraph icon is a promise the battle honors (see E.monsterTopicIcon /
    // startCombat's pickProblem). Bosses stay unbound (they're the real test —
    // full mixed review). The Spire (19) is the one exception: its own 50/50
    // picker already overrides per-monster skill, so binding it there would
    // make the icon a LIE the picker ignores half the time.
    { types: [
        { name: 'Echo Bat', sprite: 'bat', pal: { A: '#7ed4c8', B: '#57a89c', m: '#3d7c72', E: '#e8fff8' }, verb: 'shrieks at', skill: 'long_division',
          desc: 'Argues with its own echo. Loses.' },
        { name: 'Cave Wisp', sprite: 'ghost', pal: { A: '#b8f0e4', B: '#84ccbc', k: '#1c443c' }, verb: 'echoes through', skill: 'word_problems',
          desc: 'Repeats everything you say in a spookier voice.' }],
      boss: { name: 'Echo Warden', sprite: 'golem', pal: { A: '#6ba89c', B: '#4d8478', m: '#38635a', W: '#c4f0e4', E: '#5ce8d0' }, verb: 'booms at',
          desc: 'Booms every sentence three times. Three times. Three times.' } },
    // 12: Sunken Library
    { types: [
        { name: 'Ink Ghost', sprite: 'ghost', pal: { A: '#8aa4d4', B: '#5f7cb0', k: '#141f38', E: '#0e1626' }, verb: 'smudges', skill: 'word_problems',
          desc: 'Smudges your work out of professional jealousy. Its own handwriting is terrible.' },
        { name: 'Page Golem', sprite: 'golem', pal: { A: '#e8e4d4', B: '#c4bfa8', m: '#9a957e', W: '#fffcf0', E: '#3a6bb0' }, verb: 'papercuts', skill: 'decimals_md',
          desc: 'Built entirely of overdue books. The fines alone are terrifying.' }],
      boss: { name: 'The Librarian', sprite: 'mage', pal: { H: '#2c4a8a', h: '#1f3666', A: '#1a2844', E: '#8ac4ff' }, verb: 'shushes',
          desc: 'Has shushed emperors. You are no exception.' } },
    // 13: Star Peak
    { types: [
        { name: 'Star Wisp', sprite: 'ghost', pal: { A: '#fff4c4', B: '#ffd94a', k: '#5c4a10' }, verb: 'flares at', skill: 'addsub_facts',
          desc: 'A bit of starlight that missed the sky and made do.' },
        { name: 'Comet Bat', sprite: 'bat', pal: { A: '#8a7cc8', B: '#665a9e', m: '#4a4076', E: '#ffe27a' }, verb: 'streaks past', skill: 'multidigit_mult',
          desc: 'Fast, bright, and gone before the apology.' },
        { name: 'Night Shade', sprite: 'ghost', pal: { A: '#4a4066', B: '#332c4d', E: '#ffe27a', k: '#12101f' }, verb: 'dims', skill: 'time_reading',
          desc: 'The dark between the stars, with opinions.' }],
      boss: { name: 'The Fallen Star', sprite: 'mage', pal: { H: '#d8a03c', h: '#b0812c', A: '#66551c', E: '#fff4c4', F: '#2b230e' }, verb: 'blazes at',
          desc: 'It fell so far, it forgot it was made to shine. You reminded it.' } },
    // 14: Tidepool Grotto (the Isles) — first roster with BEHAVIORS:
    // guard = parks on a chokepoint, wander = drifts, thief = steals gold & flees.
    { types: [
        { name: 'Scuttle Crab', sprite: 'spider', pal: { A: '#e07a5c', B: '#b85a40', L: '#8a3d2c', W: '#f4d8b0', E: '#2b1a14' }, verb: 'pinches',
          behavior: 'guard', skill: 'muldiv_facts',
          desc: 'Found a spot it likes. The spot is the doorway. It knows what it\'s doing.' },
        { name: 'Drift Jelly', sprite: 'ghost', pal: { A: '#f0b8d8', B: '#c488b0', k: '#44203a' }, verb: 'stings',
          behavior: 'wander', skill: 'decimals_ps',
          desc: 'Goes wherever the tide says. The tide is very indecisive.' },
        { name: 'Pilfer Gull', sprite: 'bat', pal: { A: '#f0f0ec', B: '#c4c4bc', m: '#8a8a80', E: '#ffb02c' }, verb: 'pecks',
          behavior: 'thief', skill: 'word_problems',
          desc: 'Steals gold, buttons, sandwiches, and once an entire hat. Zero remorse.' }],
      boss: { name: 'The Old Current', sprite: 'snake', pal: { A: '#2c8a8a', B: '#1d6468', W: '#a8ecdc', k: '#0c2a2e', T: '#4ec4b4' }, verb: 'sweeps over',
          desc: 'It has pushed ships off course for a hundred years. Yours was the first to push back.' } },
    // 15: Frostbite Hollow — guards parked at the slide exits; no thieves
    // (gulls hate the cold)
    { types: [
        { name: 'Snow Sprite', sprite: 'ghost', pal: { A: '#eaf6ff', B: '#b8d8ec', k: '#27455c' }, verb: 'chills',
          behavior: 'wander', skill: 'fractions_as',
          desc: 'Made of snow that refused to melt. Stubbornness is a building material.' },
        { name: 'Frost Pup', sprite: 'rat', pal: { A: '#e8f0f4', B: '#bcd0dc', F: '#8aa8bc', T: '#9cc0d4' }, verb: 'nips',
          behavior: 'chase', skill: 'addsub_facts',
          desc: 'Adorable. Freezing. Will absolutely nip you. But adorable.' },
        { name: 'Icebound Sentinel', sprite: 'golem', pal: { A: '#9cc8e0', B: '#6898b8', m: '#48708c', W: '#e4f4fc', E: '#1d3d54' }, verb: 'hammers',
          behavior: 'guard', skill: 'multidigit_addsub',
          desc: 'Frozen mid-guard a century ago. Sees no reason to stop now.' }],
      boss: { name: 'The Glacier\'s Heart', sprite: 'golem', pal: { A: '#bce4f4', B: '#84b8d8', m: '#5888ac', W: '#ffffff', E: '#7adcf0' }, verb: 'avalanches into',
          desc: 'The cold core of the hollow. It beats once a winter. You made it skip one.' } },
    // 16: Cinderforge Depths — the deep mine: three floors, drop chutes, a
    // thief who loves anything shiny
    { types: [
        { name: 'Magma Rat', sprite: 'rat', pal: { A: '#e0603c', B: '#b8442c', F: '#ffd94a', T: '#ff8a4a' }, verb: 'scorches',
          behavior: 'chase', skill: 'muldiv_facts',
          desc: 'Runs warm. Sleeps in the forge. The forge has complained.' },
        { name: 'Soot Wisp', sprite: 'ghost', pal: { A: '#565058', B: '#3d383f', k: '#16141a', E: '#ff8a4a' }, verb: 'smothers',
          behavior: 'wander', skill: 'decimals_md',
          desc: 'What\'s left when a chimney dreams. Leaves fingerprints on everything.' },
        { name: 'Forge Golem', sprite: 'golem', pal: { A: '#8a4a34', B: '#66341f', m: '#4a2312', W: '#ffb02c', E: '#ffe27a' }, verb: 'brands',
          behavior: 'guard', skill: 'multidigit_mult',
          desc: 'Still guarding the anvil it was built beside. Employee of the century. Several centuries.' },
        { name: 'Coal Thief', sprite: 'bat', pal: { A: '#3d383f', B: '#28242c', m: '#16141a', E: '#ffd94a' }, verb: 'swipes at',
          behavior: 'thief', skill: 'long_division',
          desc: 'Steals coal, gold, and once a whole lantern. Insists it\'s "collecting."' }],
      boss: { name: 'The Foreman', sprite: 'golem', pal: { A: '#66341f', B: '#4a2312', m: '#301508', W: '#ff8a4a', E: '#ffe27a' }, verb: 'clocks',
          desc: 'Kept the forge burning long after everyone went home. You finally gave it the day off.' } },
    // 17: Great Lighthouse — every mechanic reprised, one floor each; the
    // fog itself has jobs now
    { types: [
        { name: 'Fog Wisp', sprite: 'ghost', pal: { A: '#c8d4dc', B: '#98a8b4', k: '#2c3844' }, verb: 'chills',
          behavior: 'wander', skill: 'time_reading',
          desc: 'A stray curl of Murk that wandered off to find itself. Still looking.' },
        { name: 'Beacon Golem', sprite: 'golem', pal: { A: '#8a95a0', B: '#69737e', m: '#4c5560', W: '#eef4f8', E: '#ffd94a' }, verb: 'hammers',
          behavior: 'guard', skill: 'geometry',
          desc: 'Built to polish the lens. Has not been asked to in nine years. Deeply offended by dust.' },
        { name: 'Wreck Gull', sprite: 'bat', pal: { A: '#dce6ea', B: '#b0bcc4', m: '#7d8a92', E: '#ffb02c' }, verb: 'dives at',
          behavior: 'chase', skill: 'word_problems',
          desc: 'Nests in the rafters. Extremely opinionated about ship routes it has never sailed.' },
        { name: 'Lantern Moth', sprite: 'spider', pal: { A: '#e8dcc4', B: '#c4b490', L: '#8a7a5c', W: '#fff4c4', E: '#3a3428' }, verb: 'flutters at',
          behavior: 'thief', skill: 'decimals_ps',
          desc: 'Drawn to anything shiny, including — regrettably — your coin purse.' }],
      boss: { name: 'The Murk', sprite: 'ghost', pal: { A: '#4a5460', B: '#333c47', E: '#dce8ec', k: '#181e26' }, verb: 'engulfs',
          desc: 'Not wicked. Just deep, and dark, and terribly patient — fog that grew where the light stopped reaching.' } },
    // 18: Smugglers' Vault — never assigned, found by exploring; the thief
    // gauntlet, and the game's best treasure density
    { types: [
        { name: 'Vault Watchman', sprite: 'skeleton', pal: { W: '#8a95a0', w: '#69737e', E: '#ffd94a' }, verb: 'strikes',
          behavior: 'guard', skill: 'decimals_md',
          desc: 'Guards a crossbow it has never once been allowed to fire. The resentment shows.' },
        { name: "Sticky-Fingered Gull", sprite: 'bat', pal: { A: '#3a3428', B: '#241f18', m: '#141210', E: '#ffd94a' }, verb: 'pecks',
          behavior: 'thief', skill: 'muldiv_facts',
          desc: 'A cousin of the honest gulls up the coast. The family does not discuss it.' },
        { name: 'Wharf Cat', sprite: 'rat', pal: { A: '#403a4a', B: '#2c2838', F: '#5c5468', T: '#4a4458' }, verb: 'swipes at',
          behavior: 'wander', skill: 'fractions_m',
          desc: 'Technically a stray. Technically owns this entire cave, actually.' }],
      boss: { name: 'Captain Brine', sprite: 'mage', pal: { H: '#3a2e1c', h: '#2b2114', A: '#1c1830', E: '#ffd94a', S: '#5c4a2c', s: '#443a20' }, verb: 'plunders',
          desc: 'Ran this vault for a decade on a strict policy of taking everything and asking nothing.' } },
    // 19: Clockwork Spire — the Cuckoo is the roster's first `shouts: true`
    // thief: stealing gold near it wakes every guard/wander monster on the
    // floor into a chase for a few turns (see E.monsterTurn's alerted timer).
    { types: [
        { name: 'Tick Imp', sprite: 'rat', pal: { A: '#c49a52', B: '#9c7838', F: '#e8c87a', T: '#b88a3e', E: '#52c4c4' }, verb: 'nips',
          behavior: 'chase',
          desc: 'Ticks when it walks. Ticks when it stands still. Never once been on time for anything.' },
        { name: 'Pendulum Knight', sprite: 'skeleton', pal: { W: '#9c8a52', w: '#786838', E: '#52c4c4' }, verb: 'swings at',
          behavior: 'guard',
          desc: 'Sways side to side, forever, like a metronome nobody asked for. Extremely punctual about hitting things.' },
        { name: 'Cuckoo', sprite: 'bat', pal: { A: '#8a5a34', B: '#6b4426', m: '#4a2e1a', E: '#ffd94a' }, verb: 'pecks',
          behavior: 'thief', shouts: true,
          desc: 'Pops out, steals your gold, announces it to the entire tower at the top of its little wooden lungs.' }],
      boss: { name: 'The Unwound King', sprite: 'golem', pal: { A: '#d4a83e', B: '#a8802c', m: '#7a5c1c', W: '#f4e0a0', E: '#e05252' }, verb: 'grinds against',
          desc: 'Once kept every clock on the isle in perfect time. Something inside him slipped, years ago, and nobody was left who knew how to wind him back.' } },
    // 20: Resonant Halls — the Piccolo Pixie is a thief like any other (no
    // shouts:true here; one loud monster per game is plenty).
    { types: [
        { name: 'Off-Key Sprite', sprite: 'ghost', pal: { A: '#e88ac4', B: '#b85c94', k: '#4a1c38' }, verb: 'shrieks at',
          behavior: 'wander', skill: 'fractions_as',
          desc: 'Every note it hums is very slightly wrong. It has never noticed. It never will.' },
        { name: 'Bass Golem', sprite: 'golem', pal: { A: '#3d3050', B: '#241c38', m: '#16101f', W: '#8d75d8', E: '#e88ac4' }, verb: 'booms at',
          behavior: 'guard', skill: 'multidigit_addsub',
          desc: 'Hums one note, very low, forever. The floor tiles have gotten used to it.' },
        { name: 'Piccolo Pixie', sprite: 'bat', pal: { A: '#f4d8b0', B: '#d4a860', m: '#8a6a3c', E: '#e88ac4' }, verb: 'pecks',
          behavior: 'thief', skill: 'word_problems',
          desc: 'Steals gold, then plays a little victory tune about it. The tune is, frankly, better than the theft.' }],
      boss: { name: 'The Discord', sprite: 'ghost', pal: { A: '#a85cc4', B: '#7a3d94', k: '#2c1638', E: '#7ee85c' }, verb: 'clashes against',
          desc: "Every note in the Halls used to fit together. It just wanted to sing along — nobody ever taught it where it fit. Someone finally did." } },
    // 21: Sunken Breakwater — Gullwrack Harbor's finale, a waterlogged
    // storeroom of a dungeon; the roster's only skill:'geometry' floor.
    { types: [
        { name: 'Soggy Crate-Mimic', sprite: 'golem', pal: { A: '#8a6a48', B: '#664e34', m: '#4a3824', W: '#c4a878', E: '#5ce8d0' }, verb: 'thumps',
          behavior: 'wander',
          desc: 'Pretends to be driftwood cargo. Forgot it was pretending several years ago.' },
        { name: 'Barnacle Bruiser', sprite: 'skeleton', pal: { W: '#7c8a80', w: '#5c685f', E: '#e8b04a' }, verb: 'clamps',
          behavior: 'guard',
          desc: 'Encrusted head to foot in barnacles. Has strong feelings about anyone touching its rock.' },
        { name: 'Tidepocket Filch', sprite: 'bat', pal: { A: '#3a5a5c', B: '#284042', m: '#182c2d', E: '#ffd94a' }, verb: 'pecks',
          behavior: 'thief',
          desc: 'Keeps its loot in a coat made entirely of pockets. Nobody has counted the pockets. Nobody dares.' }],
      boss: { name: 'The Undertow', sprite: 'ghost', pal: { A: '#1f4a52', B: '#153338', E: '#9adcd4', k: '#0a1f22' }, verb: 'drags at',
          desc: 'Never learned where the edges of things are — the shore, the harbor wall, its own temper. You showed it, gently, where the lines go.' } },
    // 22: the Spiral Stair (Wave 9) — post-game practice. Every "monster" in
    // this game has always narratively BEEN a tangle (see the Study reveal);
    // here, for the first time, one just looks like it. The landing boss
    // is a bigger, tighter knot — no crueler than the rest, just slower to
    // work loose.
    { types: [
        { name: 'Loose Tangle', sprite: 'tangle', pal: null, verb: 'snags',
          behavior: 'wander',
          desc: 'A small unfinished sum, wandering. Doesn\'t mean any harm — it just hasn\'t been worked out yet.' },
        { name: 'Snarled Tangle', sprite: 'tangle', pal: { T: '#8a6ab0', W: '#e0d4f4' }, verb: 'wraps around',
          behavior: 'chase',
          desc: 'A little more knotted than most. Give it time. Give it a worked answer, really.' }],
      boss: { name: 'The Knot', sprite: 'tangle', pal: { T: '#4a3d68', k: '#150f22', W: '#8a7ab0' }, verb: 'coils around',
          desc: 'Every landing has one — the tightest tangle on the stair, holding the whole knot together out of sheer stubbornness.' } },
  ];

  // Miscount's sparring partner gets a card too (all golem levels share it).
  MM.data.GOLEM_CARD = {
    name: 'Homework Golem', sprite: 'golem',
    pal: { A: '#c4c8d4', B: '#9aa0b0', m: '#767c8c', W: '#e8ecf4', E: '#7ee0e8' },
    desc: 'Conjured from enchanted homework. Gets a little tougher every time it loses — the healthiest attitude in Numeria.',
  };
  // Playtest round 4 (the kids asked): a rare chest that is not a chest.
  // One shared card, GOLEM_CARD-style, since a mimic can turn up in any
  // dungeon past the third — it belongs to no single roster.
  MM.data.MIMIC_CARD = {
    name: 'Mimic', sprite: 'mimic', verb: 'chomps at',
    desc: 'Practiced being a chest for years. The giggle still needs work — real chests don\'t.',
  };

  // Balance: monsters attack EVERY round; their attack is a MAXIMUM that gets
  // rolled (75-110%) and then reduced by the player's total block. Attack
  // tracks the block a reasonably-geared kid has at that dungeon (armor +
  // helmet + boots + ring can reach ~13 late), so net damage stays ~3 early
  // and ~5 late — and over-armoring is rewarded with 1s. HP pools are sized
  // so regulars take ~2-3 correct answers, bosses ~4-6.
  MM.data.monsterStats = function (dungeonIdx, isBoss) {
    const i = dungeonIdx;
    const atk = 2 + Math.round(1.35 * (i - 1)) + Math.ceil(i / 4);
    if (isBoss) {
      return { hp: 14 + 5 * i, atk: atk + 3, xp: 15 + 5 * i, gold: 15 + 8 * i };
    }
    return { hp: 6 + 3 * i, atk, xp: 4 + 2 * i, gold: 0 };
  };

  // Every item carries a one-line `quip` — shop & bag flavor. Rule: jokes land
  // on the item or the world, never on the player.
  MM.data.WEAPONS = [
    { id: 'stick', name: 'Wooden Stick', emoji: '🥢', atk: 1, price: 0, quip: 'Technically a weapon.' },
    { id: 'dagger', name: 'Bronze Dagger', emoji: '🗡️', atk: 3, price: 40, quip: 'Pointier than it looks. It looks quite pointy.' },
    { id: 'sword', name: 'Steel Sword', emoji: '⚔️', atk: 5, price: 120, quip: 'The classic. Monsters respect the classic.' },
    { id: 'axe', name: 'Battle Axe', emoji: '🪓', atk: 7, price: 260, quip: 'For when the problem is big and the answer is chop.' },
    { id: 'star', name: 'Star Blade', emoji: '🌟', atk: 10, price: 450, quip: 'Hums a little tune when you get one right.' },
    // isle:true stock is sold only at the Brass Compass in Port Brightwater
    { id: 'tidal', name: 'Tidal Blade', emoji: '🔱', atk: 13, price: 700, isle: true, quip: 'Smells faintly of victory and moderately of fish.' },
    // found, not sold (notForSale) — the Smugglers' Vault's one guaranteed
    // treasure. Ranged rule: in battle, the monster's ROUND-1 counterattack
    // automatically misses ("you're out of reach!") — no ammo, no aiming.
    { id: 'crossbow', name: "Smuggler's Crossbow", emoji: '🏹', atk: 12, price: 650, isle: true, notForSale: true, ranged: true, quip: 'Smuggled in a barrel labeled "PICKLES." Nobody checked.' },
    // Wave 3 carry-over: Emberlyn's own ranged weapon (sold only by HER, not
    // the Brass Compass — notForSale keeps it out of the general isle shop).
    // Same atk tier and one-rule ranged behavior as the crossbow, so melee-
    // vs-ranged stays a real choice for anyone who never found the Vault.
    { id: 'horologebow', name: 'Horologe Longbow', emoji: '🏹', atk: 12, price: 750, isle: true, notForSale: true, ranged: true, quip: 'Keeps perfect time. Also, perfect aim.' },
    // ---------- Wave 8b: gentle instruments (P1) ----------
    // `gentle: true` is an IDENTITY tag, not a rule: any stance may wield any
    // weapon, and atk is atk whether you call it damage or calm. Each one is
    // pinned to an existing atk/price tier so choosing your identity never
    // costs (or buys) you power — the shop merely LISTS them under a warm
    // header. `verb` is what the weapon does in the 🕊 Soothe stance's
    // battle line; plain weapons fall back to a generic soothing verb.
    { id: 'ribbon', name: 'Ribbon Streamer', emoji: '🎀', atk: 1, price: 0, gentle: true, verb: 'sweeps a slow ribbon around',
      quip: 'Technically a weapon. Mostly a very long ribbon.' },
    { id: 'bubblepipe', name: 'Bubble Pipe', emoji: '🫧', atk: 5, price: 120, gentle: true, verb: 'drifts a bubble toward',
      quip: 'Blows perfect spheres. Refuses to blow anything else.' },
    // ranged, and one atk below its melee peer (the Battle Axe, 7) — exactly the
    // trade the Smuggler's Crossbow makes against the Tidal Blade. A dangled
    // lure IS a reach weapon, so it inherits the round-1-miss rule for free.
    { id: 'catwand', name: 'Cat-Fishing Wand', emoji: '🎣', atk: 6, price: 250, gentle: true, ranged: true, verb: 'dangles the lure for',
      quip: 'Irresistible to monsters. Utterly irresistible to your pet, who must be discouraged.' },
    { id: 'chimebells', name: 'Chime Bells', emoji: '🔔', atk: 13, price: 700, isle: true, gentle: true, verb: 'rings a long clear note over',
      quip: 'Rings in a key nobody can name but everybody recognises.' },
  ];

  MM.data.ARMOR = [
    { id: 'clothes', name: 'Traveling Clothes', emoji: '👕', def: 0, price: 0, quip: 'Blocks wind, compliments, and nothing else.' },
    { id: 'leather', name: 'Leather Armor', emoji: '🧥', def: 1, price: 30, quip: 'Smells like adventure. Mostly like cow.' },
    { id: 'chain', name: 'Chain Mail', emoji: '🔗', def: 3, price: 100, quip: 'A thousand tiny rings, all doing their best.' },
    { id: 'plate', name: 'Plate Armor', emoji: '🛡️', def: 5, price: 220, quip: 'Shiny enough to check your hair in.' },
    { id: 'dragon', name: 'Dragon Scale', emoji: '🐉', def: 7, price: 400, quip: 'The dragon donated it. We didn\'t ask follow-up questions.' },
    { id: 'pearl', name: 'Pearl Mail', emoji: '🦪', def: 9, price: 650, isle: true, quip: 'A thousand oysters\' finest work. They insisted.' },
  ];

  // Head, feet, and finger slots. Boots can add dodge; rings are tradeoffs.
  MM.data.HELMETS = [
    { id: 'cap', name: 'Leather Cap', emoji: '🧢', def: 1, price: 25, quip: 'Keeps your thoughts warm.' },
    { id: 'ironhelm', name: 'Iron Helm', emoji: '🪖', def: 2, price: 90, quip: 'Rings like a bell when bonked. You\'ll get used to it.' },
    { id: 'winged', name: 'Winged Helm', emoji: '⛑️', def: 3, price: 200, quip: 'The wings are decorative. Probably.' },
    { id: 'coral', name: 'Coral Crown', emoji: '🪸', def: 4, price: 320, isle: true, quip: 'Grown, not forged. Please don\'t ask how long it took.' },
  ];
  MM.data.BOOTS = [
    { id: 'sturdy', name: 'Sturdy Boots', emoji: '🥾', def: 1, price: 30, quip: 'Boots of standing very firmly in mud.' },
    { id: 'nimble', name: 'Nimble Boots', emoji: '👟', def: 1, dodge: 5, price: 110, quip: 'Squeak on every third step. Monsters find it distracting.' },
    { id: 'dragonhide', name: 'Dragonhide Boots', emoji: '🐾', def: 2, dodge: 5, price: 240, quip: 'The dragon had spares.' },
    { id: 'wavewalkers', name: 'Wavewalkers', emoji: '🌊', def: 3, dodge: 8, price: 380, isle: true, quip: 'Walk on water? No. Walk NEAR water with tremendous confidence? Yes.' },
  ];
  MM.data.RINGS = [
    { id: 'vigor', name: 'Ring of Vigor', emoji: '💍', bonus: '+30 max stamina', price: 100, quip: 'Wearing it feels like a second breakfast.' },
    { id: 'power', name: 'Ring of Power', emoji: '💍', bonus: '+2 damage per strike', price: 150, quip: 'Slightly too big. Punches way above its size.' },
    { id: 'guard', name: 'Ring of Guard', emoji: '💍', bonus: '+2 block', price: 150, quip: 'Hums smugly whenever a hit bounces off.' },
    { id: 'fortune', name: 'Ring of Fortune', emoji: '💍', bonus: '+15% gold found', price: 180, quip: 'Coins just... like you more.' },
    { id: 'focus', name: 'Ring of Focus', emoji: '💍', bonus: 'a miss only halves your streak', price: 250, quip: 'Whispers "you\'ve got this" at helpful moments.' },
    { id: 'compass', name: 'Ring of the Compass', emoji: '💍', bonus: 'your pet senses secrets from farther away', price: 300, isle: true, quip: 'Always points toward interesting walls.' },
    { id: 'sealuck', name: 'Ring of Sea Luck', emoji: '💍', bonus: 'mystery potions are never duds · treasures sell +20%', price: 260, isle: true, quip: 'The sea likes you now. The sea has favorites.' },
  ];
  // Wave 2: the amulet slot — copied end-to-end from the ring slot (one at a
  // time, never auto-equipped on purchase; see applyPurchase in engine.js).
  // Sold only by Emberlyn the Enchanter, not the general shops.
  MM.data.AMULETS = [
    { id: 'tidewood', name: 'Tidewood Amulet', emoji: '🌊', bonus: '+10 max HP', price: 260, quip: 'Smells like low tide and second chances.' },
    { id: 'keeper', name: "Keeper's Amulet", emoji: '🕯️', bonus: 'inn warm-ups pay +5 gold each', price: 240, quip: 'Hums the same tune Keeper Callie does.' },
    { id: 'wayfarer', name: "Wayfarer's Amulet", emoji: '🧭', bonus: '+25 max stamina', price: 260, quip: 'Points toward wherever you were already headed.' },
  ];

  // slot -> catalog; every equippable lives here
  MM.data.GEAR = {
    weapon: MM.data.WEAPONS,
    body: MM.data.ARMOR,
    helmet: MM.data.HELMETS,
    boots: MM.data.BOOTS,
    ring: MM.data.RINGS,
    amulet: MM.data.AMULETS,
  };
  MM.data.SLOT_NAMES = { weapon: '🗡 Weapon', body: '🛡 Body', helmet: '🪖 Helmet', boots: '🥾 Boots', ring: '💍 Ring', amulet: '📿 Amulet' };
  MM.data.gearById = (slot, id) => id == null ? null : (MM.data.GEAR[slot].find(g => g.id === id) || null);
  MM.data.gearStat = (slot, item) =>
    !item ? '—'
      : slot === 'weapon' ? `⚔️ ${item.atk}`
      : (slot === 'ring' || slot === 'amulet') ? item.bonus
      : `🛡 ${item.def}${item.dodge ? ` · +${item.dodge}% dodge` : ''}`;

  // ---------- enchant gems (Wave 2: Emberlyn the Enchanter) ----------
  // Fused onto a slot+item PAIR, not an item instance — s.enchants['weapon:tidal']
  // = 'flame'. One gem per item; re-enchanting replaces (old gem lost).
  // Effect hooks live in engine.js: strikePower (flame, echo), rollMonsterHit
  // (frost), totalDef (guard), dodgeChance (feather), gainGold (magnet), and
  // crit handling in startCombat's playerStrike (leech).
  MM.data.GEMS = [
    { id: 'flame', name: 'Flame', prefix: 'Flaming', emoji: '🔥', desc: '+2 damage per strike', quip: 'Warm to the touch. Suspiciously warm.' },
    { id: 'frost', name: 'Frost', prefix: 'Frosted', emoji: '❄️', desc: "chills the monster's next counterattack (-2 damage)", quip: 'Never quite thaws. Nobody minds.' },
    { id: 'guard', name: 'Guard', prefix: 'Guarded', emoji: '🔰', desc: '+1 block', quip: 'Stands between you and trouble. Literally.' },
    { id: 'feather', name: 'Feather', prefix: 'Feathered', emoji: '🪶', desc: '+4% dodge chance', quip: 'Light as an idea.' },
    { id: 'leech', name: 'Leech', prefix: 'Leeching', emoji: '🩸', desc: 'heal 2 HP on a critical hit', quip: 'Polite, as leeches go.' },
    { id: 'magnet', name: 'Magnet', prefix: 'Magnetic', emoji: '🧲', desc: '+10% gold found', quip: 'Coins lean toward it when no one\'s looking.' },
    { id: 'echo', name: 'Echo', prefix: 'Echoing', emoji: '🔔', desc: '+1 to streak damage bonuses', quip: 'Repeats your best answers, just to itself.' },
    // Wave 8b: the one soothe-native gem — the calm twin of the ranged rule,
    // riding the exact same "first counterattack is skipped" battle hook.
    // Every OTHER gem works unchanged in either stance (damage IS calm).
    { id: 'lullaby', name: 'Lullaby', prefix: 'Lulling', emoji: '🎐', desc: "while soothing, the monster's first counterattack is skipped", quip: 'Hums something your grandmother would recognise.' },
  ];
  MM.data.gemById = id => MM.data.GEMS.find(g => g.id === id);
  // "🔥 Flaming Tidal Blade" when enchanted, plain "🔱 Tidal Blade" otherwise —
  // used everywhere a gear name is shown (bag, shop, sidebar).
  MM.data.gearLabel = function (slot, id) {
    const item = MM.data.gearById(slot, id);
    if (!item) return '';
    const s = MM.engine && MM.engine.state;
    const gemId = s && s.enchants && s.enchants[`${slot}:${id}`];
    const gem = gemId && MM.data.gemById(gemId);
    return gem ? `${gem.emoji} ${gem.prefix} ${item.name}` : `${item.emoji} ${item.name}`;
  };

  // Wave 6.5: every sail destination in one registry — the caption bug
  // ("Sailing home to Numeria" on every voyage) came from a two-way
  // ternary that predated the third destination. A new destination means
  // ONE entry here; the sail scene and captain dialogs read from it.
  MM.data.DESTINATIONS = {
    west: { name: 'Numeria', caption: '⛵ Sailing home to Numeria...',
      arrival: '"Home again. The old kingdom kept your spot warm."' },
    isles: { name: 'the Uncharted Isles', caption: '⛵ Sailing to the Uncharted Isles...',
      arrival: '"The Uncharted Isles — chart them gently, they\'re shy."' },
    horologe: { name: 'Horologe Isle', caption: '⛵ Sailing to Horologe Isle...',
      arrival: '"Horologe Isle. Listen — the whole place is holding its breath. Old Tobbin by the path can tell you why."' },
    chime: { name: 'Chime Isle', caption: '⛵ Sailing to Chime Isle...',
      arrival: '"Chime Isle. Mind the stones — they sing back. Brona the bell-keeper knows every note."' },
    gullwrack: { name: 'Gullwrack Harbor', caption: '⛵ Sailing to Gullwrack Harbor...',
      arrival: '"Gullwrack Harbor — or what the storm left of it. Guildmistress Maren could use a steady pair of hands."' },
  };

  MM.data.POTION = { name: 'Healing Potion', emoji: '🧪', heal: 15, price: 10, quip: 'Tastes like raspberries and progress.' };
  // Brass Compass specials (the Isles)
  MM.data.MYSTERY = { name: 'Mystery Potion', emoji: '🫙', price: 12, quip: 'Who knows! (Usually something good. Usually.)' };
  MM.data.TREAT = { name: 'Pet Treat', emoji: '🦴', price: 8, quip: 'Approved by pups, cats, newts, and one opinionated gull.' };
  // Wave 4 carry-over: a convenience item, not a reward — Beacon (earned via
  // gold badges) is the free reusable version; this is just hygiene you can
  // buy early. Sold at every shop, both continents.
  MM.data.ROPE = { id: 'rope', name: 'Rope of Return', emoji: '🪢', price: 30, quip: "One end is tied to 'here.' Nobody has ever found the other end." };

  // ---------- pets (hatched from Miscount's eggs on the voyage out) ----------
  MM.data.PETS = {
    blue: { name: 'Compass Pup', emoji: '🐕', sprite: 'petPup' },
    green: { name: 'Sprout Cat', emoji: '🌱', sprite: 'petCat' },
    rose: { name: 'Ember Newt', emoji: '🔥', sprite: 'petNewt' },
  };
  // stage 0 = Hatchling; growth needs BOTH practice and care
  MM.data.PET_STAGES = [
    { name: 'Hatchling' },
    { name: 'Companion', correct: 40, fed: 5 },
    { name: 'Champion', correct: 150, fed: 15 },
  ];
  MM.data.PET_FEED_LINES = [
    '{name} munches happily. Tail status: wagging.',
    '{name} does a little spin before eating. The spin is mandatory.',
    '{name} eats it in one bite, then checks your pockets for more.',
    '{name} savors it slowly, watching you with enormous approval.',
  ];

  // ---------- food (restores stamina) ----------
  MM.data.FOODS = [
    { id: 'bread', name: 'Bread Loaf', emoji: '🍞', stamina: 30, price: 5, quip: 'It\'s bread. Heroes run on bread; this is well documented.' },
    { id: 'cheese', name: 'Cheese Wheel', emoji: '🧀', stamina: 50, price: 8, quip: 'Aged to perfection, then a little past it.' },
    { id: 'roast', name: 'Roast Chicken', emoji: '🍗', stamina: 100, price: 15, quip: 'Somehow still warm. Don\'t question it.' },
  ];
  MM.data.foodById = id => MM.data.FOODS.find(f => f.id === id);

  // ---------- treasures (found in chests, exist to be SOLD) ----------
  MM.data.TREASURES = [
    { id: 'ruby', name: 'Rough Ruby', emoji: '🔴', value: 18, quip: 'Rough around the edges. Aren\'t we all.' },
    { id: 'pearl', name: 'River Pearl', emoji: '⚪', value: 26, quip: 'An oyster worked very hard on this.' },
    { id: 'emerald', name: 'Gleaming Emerald', emoji: '🟢', value: 38, quip: 'Green as a slime, worth considerably more.' },
    { id: 'goblet', name: 'Silver Goblet', emoji: '🏆', value: 55, quip: 'Kings drank from it. Then dropped it, apparently.' },
    { id: 'idol', name: 'Ancient Idol', emoji: '🗿', value: 75, quip: 'It\'s watching you. Approvingly.' },
    { id: 'tooth', name: 'Dragon Tooth', emoji: '🦷', value: 100, quip: 'The dragon says it\'s fine. It grew right back.' },
    // Wave 6: a seventh treasure, reachable once treasureForDungeon's clamp
    // was raised — a small nod to the new geometry topic's spirals.
    { id: 'shell', name: 'Spiral Shell', emoji: '🐚', value: 130, quip: 'It repeats itself, but bigger each time. Rude, but beautiful.' },
    // Wave 10 (P4a, rare-surprise pool): never sold from a shop or dropped
    // from a chest roll — pushed directly into s.items.treasures by the
    // once-ever golden-bird moment (E.walkStamina). Deliberately worth very
    // little; the point was never the gold.
    { id: 'feather', name: 'Proof It Happened', emoji: '🪶', value: 3, quip: 'A single golden feather. Nobody else saw the bird. You do not mind one bit.' },
  ];
  MM.data.treasureById = id => MM.data.TREASURES.find(t => t.id === id);
  MM.data.treasureForDungeon = function (i) {
    const base = Math.min(6, Math.floor((i - 1) / 2));
    const idx = Math.max(0, Math.min(6, base + (Math.random() < 0.3 ? 1 : 0)));
    return MM.data.TREASURES[idx];
  };

  // ---------- magical charms (rare finds; passive powers, never sold) ----------
  MM.data.CHARMS = [
    { id: 'clover', name: 'Lucky Clover', emoji: '🍀', desc: '+10% chance to dodge monster attacks' },
    { id: 'ring', name: 'Ring of Retry', emoji: '💍', desc: 'One second try at a problem, once per battle' },
    { id: 'boots', name: 'Boots of Wandering', emoji: '👢', desc: 'Walking never uses stamina' },
    { id: 'quill', name: "Scholar's Quill", emoji: '🖋️', desc: 'Streak damage bonuses are doubled' },
    { id: 'heart', name: 'Crystal Heart', emoji: '💖', desc: 'Potions heal twice as much' },
    { id: 'magnet', name: "Miser's Magnet", emoji: '🧲', desc: 'All gold you find is worth 25% more' },
    // the Smugglers' Vault's unique find. Its real trick (shimmering dig
    // spots) arrives with the treasure-map mini-game — not yet built.
    { id: 'wayfinder', name: "Wayfinder's Locket", emoji: '🗺', desc: 'Hums faintly near hidden things (its full trick awaits a coming treasure map...)' },
    // 1.5d: sold at the Brass Compass (price set) AND findable in any chest
    // (awardCharm draws from every id in this list with no price set) —
    // heals slowly as you walk, so deep dungeons drain less over a long visit.
    { id: 'hearthmoss', name: 'Hearthmoss Charm', emoji: '🌿', price: 220, desc: 'Moss from a hearthstone. It likes a walk; so do your bruises. (+1 HP every 8 steps, below full health)' },
    // Wave 6: Gullwrack Harbor's Builder's Guild honors — awarded for
    // rebuilding every repair site in town, never sold. Effect hook lives
    // in E.totalDef, same one-line pattern as Ring of Guard.
    { id: 'mason', name: "Mason's Charm", emoji: '🧱', desc: '+1 block' },
  ];
  MM.data.charmById = id => MM.data.CHARMS.find(c => c.id === id);

  // ---------- topic badges (indexed by tier; tier 0 = none) ----------
  // Earned per topic and kept forever; requirements checked in mastery.badgeTier.
  MM.data.BADGES = [
    null,
    { name: 'Bronze Badge', emoji: '🥉', req: 'answer 10 correctly' },
    { name: 'Silver Badge', emoji: '🥈', req: 'answer 25 correctly, with a hot recent streak (8 of your last 10)' },
    { name: 'Gold Badge', emoji: '🥇', req: 'answer 50 correctly, with 9 of your last 10 right' },
  ];

  // Wave 4 carry-over: the exact strings behind a greyed-out spell button's
  // `title` tooltip (ui.js renderSpellRow) — also reused verbatim by
  // castBlink's no-op log lines (engine.js) so the button and the log agree
  // on why nothing happened.
  MM.data.SPELL_TOOLTIPS = {
    outside: 'Only inside dungeons',
    used: 'Used this visit — back at the entrance it recharges',
    noStamina: 'Need 10 stamina — eat something!',
  };

  // Wave 4 carry-over: one-time unlock-celebration text per spell (the
  // celebration IS the tutorial — see maybeCelebrateBadge in ui.js).
  MM.data.SPELL_INFO = {
    scout: {
      name: 'Scout', emoji: '🔍',
      howto: 'Inside any dungeon, <b>click 🔍 Scout</b> in the sidebar — hidden walls shimmer for 10 seconds. Once per visit.',
    },
    blink: {
      name: 'Blink', emoji: '⚡',
      howto: 'Walk or bump <b>toward</b> whatever you want to hop over, then <b>click ⚡ Blink</b> — you land two tiles ahead, on the far side. Costs 10 stamina, no limit per visit.',
    },
    beacon: {
      name: 'Beacon', emoji: '🕯',
      howto: '<b>Click 🕯 Beacon</b> in the sidebar to return to the dungeon\'s entrance instantly. Once per visit.',
    },
  };

  // ---------- battle flavor lines ----------
  // Humor rules: jokes land on the MONSTER, never the kid. A miss is funny
  // because of what the monster does with the moment, not because the kid
  // failed. Bosses get no flavor lines — boss fights (and the story's sincere
  // beats) stay played straight. {name} is replaced with the monster's name.
  MM.data.FLAVOR = {
    mimic: {
      enter: ['The {name} snaps its lid, delighted. It has waited SO long for this.',
              'The {name} does its best chest impression mid-fight. It is not fooling anyone now.',
              'The {name} rattles happily. Something inside rattles back.'],
      miss: ['The {name} giggles. Chests should not giggle.',
             'The {name} taps its lid, like a customer waiting at a counter.'],
      win: ['The {name} sighs, and finally sits still — an honest chest at last.',
            'The {name} gives up the act, and everything else besides.'],
      soothe: ['The {name} stops pretending. Being a chest was lonely work anyway.'],
      fret: ['The {name} clacks its lid softly. It isn\'t sure how to be calmed. No one has ever tried.'],
    },
    slime: {
      enter: ['The {name} jiggles menacingly. Menacingly-ish.',
              'The {name} squares up. It has no shoulders, but it squares up.',
              'The {name} makes a sound like a wet sneeze. A battle cry, probably.'],
      miss: ['The {name} celebrates by jiggling. It\'s not a good celebration.',
             'The {name} wobbles smugly.',
             'The {name} slow-claps. Somehow.'],
      win: ['The {name} retires to a quieter puddle.',
            'The {name} goes splat — politely.',
            'The {name} evaporates with a small, embarrassed pop.'],
    },
    rat: {
      enter: ['The {name} has been training for this.',
              'The {name} bares its teeth. All of them. It\'s very proud of them.',
              'The {name} sniffs your backpack. This is about your snacks now.'],
      miss: ['The {name} does a taunting little spin.',
             'The {name} snickers into its whiskers.',
             'The {name} files that one away for later gloating.'],
      win: ['The {name} scurries off to reconsider its choices.',
            'The {name} flops over dramatically. Twice.',
            'The {name} is defeated — and honestly a little impressed.'],
    },
    bat: {
      enter: ['The {name} swoops in upside-down. Show-off.',
              'The {name} flutters in like it owns the ceiling. It does own the ceiling.',
              'The {name} screeches a screech that means business.'],
      miss: ['The {name} does a victory loop-the-loop.',
             'The {name} pretends it dodged on purpose.',
             'The {name} hangs upside down to enjoy the moment.'],
      win: ['The {name} flaps off to file a complaint.',
            'The {name} drops like a dropped glove.',
            'The {name} is out — its echo keeps flapping a moment longer.'],
    },
    spider: {
      enter: ['The {name} descends on a single dramatic thread.',
              'The {name} waves three legs at once. It\'s a threat. Probably.',
              'The {name} has eight eyes, and all of them are judging your stance.'],
      miss: ['The {name} knits a tiny victory banner.',
             'The {name} counts your misses on its legs. Plenty of legs left.',
             'The {name} does a smug little tap dance. All eight feet.'],
      win: ['The {name} curls up like a closed umbrella.',
            'The {name} scuttles off to a long retirement.',
            'The {name} is defeated — that web was due for a redesign anyway.'],
    },
    ghost: {
      enter: ['The {name} goes "oooOOOooo," which is ghost for "let\'s begin."',
              'The {name} drifts in fashionably late to its own ambush.',
              'The {name} floats through a wall just to prove it can.'],
      miss: ['The {name} high-fives another ghost you can\'t see.',
             'The {name} felt the breeze from that one. It liked it.',
             'The {name} does a slow, spooky twirl of triumph.'],
      win: ['The {name} fades out, waving a tiny white flag.',
            'The {name} whooshes off to haunt someone easier.',
            'The {name} evaporates — with grudging respect.'],
    },
    skeleton: {
      enter: ['The {name} rattles into a fighting stance. A few pieces are in the wrong order.',
              'The {name} cracks its knuckles. And its elbows. And everything else.',
              'The {name} grins. It has no choice, but it grins.'],
      miss: ['The {name} uses the moment to reattach its arm.',
             'The {name} applauds — loudly, being all bones.',
             'The {name} rattles out something that is definitely a chuckle.'],
      win: ['The {name} clatters into a neat, apologetic pile.',
            'The {name} takes itself apart and calls it a day.',
            'The {name} is defeated — it needed the lie-down anyway.'],
    },
    golem: {
      enter: ['The {name} takes a full three seconds to turn around. Dramatic effect.',
              'The {name} cracks its stone knuckles. Pebbles everywhere.',
              'The {name} stands very still. That IS its battle stance.'],
      miss: ['The {name} would smile, if its face moved.',
             'The {name} shows no reaction. Stone-cold.',
             'Somewhere deep inside, the {name} is delighted.'],
      win: ['The {name} crumbles into very orderly gravel.',
            'The {name} powers down with a dusty sigh.',
            'The {name} falls over. The floor complains.'],
    },
    mage: {
      enter: ['The {name} clears its throat and mispronounces a spell.',
              'The {name} twirls its staff and very nearly drops it.',
              'The {name} opens with some dramatic sleeve-billowing.'],
      miss: ['The {name} scribbles your miss into a tiny notebook.',
             'The {name} awards that swing no points.',
             'The {name} cackles — then coughs, then cackles again.'],
      win: ['The {name} vanishes in a puff of misspelled smoke.',
            'The {name} retires to study easier opponents.',
            'The {name} is defeated — its last spell was "oh no."'],
    },
    snake: {
      enter: ['The {name} coils up like a spring with opinions.',
              'The {name} rises and sways. Hypnotic? No. Rude? Slightly.',
              'The {name} spells out a threat in cursive.'],
      miss: ['The {name} sssnickers.',
             'The {name} limbo-dances under it. No limbs, all limbo.',
             'The {name} ties a small celebratory knot in itself.'],
      win: ['The {name} unties itself and slinks away.',
            'The {name} curls into a very apologetic spiral.',
            'The {name} hisses "well played" and flops.'],
    },
    generic: {
      enter: ['The {name} looks ready. Ready-ish.'],
      miss: ['The {name} will be telling this story for weeks.'],
      win: ['The {name} is defeated!'],
      // generic MUST carry every sub-pool: MM.data.flavor falls back to it per
      // KIND, and a missing key there would hand pick() an undefined pool.
      soothe: ['The {name} loosens, sighs, and settles down happily right where it is.'],
      fret: ['The {name} tenses up again. So nearly calm, though.'],
    },
    // Wave 9: the Spiral Stair's tangles — the game's oldest metaphor,
    // finally just standing there looking like one.
    tangle: {
      enter: ['The {name} knots itself tighter, unsure of you.',
              'The {name} loops and re-loops, working itself into a state.'],
      miss: ['The {name} snags you and looks rather pleased about it.'],
      win: ['The {name} comes loose all at once, and the mess simply resolves.'],
      soothe: ['The {name} loosens, slips free of itself, and drifts off as a single unknotted thread.'],
      fret: ['The {name} snarls back up, still not sure of you.'],
    },
  };

  // ---------- Wave 8b (P1): the Soothe verb ----------
  // Two new sub-pools alongside enter/miss/win, drawn when the kid fights in the
  // 🕊 Soothe stance instead of ⚔️ Strike:
  //   soothe — the VICTORY line: the tangle comes loose and the monster relaxes.
  //   fret   — the MISS line: it tenses back up. The sympathy is for the MONSTER
  //            (it was nearly calm), never a comment on the kid. Same hard rule
  //            as `miss`: the joke lands on the monster, and a wrong answer is
  //            never the punchline.
  // The lore already believed this — "a worked answer unties them" — so a
  // soothed monster is not spared, it is FINISHED, the gentle way.
  Object.assign(MM.data.FLAVOR.slime, {
    soothe: ['The {name} un-tenses all at once and becomes a deeply relaxed puddle.',
             'The {name} does one happy little bounce and squelches off to nap in the sun.',
             'The {name} wobbles — gently, this time — and goes to find someone to sit near.'],
    fret: ['The {name} tightens back up with a nervous squelch.',
           'The {name} wobbles anxiously. It was so close to calm.',
           'The {name} re-tenses. Almost, though. Almost.'],
  });
  Object.assign(MM.data.FLAVOR.rat, {
    soothe: ['The {name} rolls over. It would like its tummy scratched, please.',
             'The {name} stops bristling, yawns enormously, and curls up right there.',
             'The {name} tucks its nose under its tail. The whiskers finally stop twitching.'],
    fret: ['The {name} startles and bristles all over again.',
           'The {name}\'s whiskers start up again. It really was nearly dozing.',
           'The {name} tenses. It had almost forgotten to be worried.'],
  });
  Object.assign(MM.data.FLAVOR.bat, {
    soothe: ['The {name} lands. It preens one wing, then the other, entirely at peace.',
             'The {name} flutters down, settles, and gives you a small, dignified nod.',
             'The {name} hangs itself up quietly and closes its eyes.'],
    fret: ['The {name} flaps back up, unsettled.',
           'The {name} loses the thread and goes back to fretting.',
           'The {name} circles anxiously. It had wanted to land.'],
  });
  Object.assign(MM.data.FLAVOR.spider, {
    soothe: ['The {name} folds its legs up, one at a time, and settles in for a long think.',
             'The {name} lies back on its own web like a hammock. All eight feet, off duty.',
             'The {name} unknots itself and drowses. Even the eyes go sleepy — all of them.'],
    fret: ['The {name} pulls its legs back in, tangled up again.',
           'The {name} fusses at a knot in its own web.',
           'The {name} draws itself back up. So many legs, all of them worried.'],
  });
  Object.assign(MM.data.FLAVOR.ghost, {
    soothe: ['The {name} sighs — upward, softly — and drifts off somewhere brighter.',
             'The {name} stops moaning mid-moan and simply floats. Peacefully. At last.',
             'The {name} goes quiet, waves once, and thins like a curtain letting the light in.'],
    fret: ['The {name} shivers and goes back to its moaning. It had nearly gone quiet.',
           'The {name} drifts back into its worrying.',
           'The {name} wavers, still restless.'],
  });
  Object.assign(MM.data.FLAVOR.skeleton, {
    soothe: ['The {name} sits down and stops rattling. Every bone lands where it belongs.',
             'The {name} settles into a comfortable heap and lets out a long, bony sigh.',
             'The {name} stops clattering. In the quiet, it seems relieved.'],
    fret: ['The {name} rattles anxiously. Nothing sits right yet.',
           'The {name} clatters back into a nervous heap.',
           'The {name} won\'t stop rattling. Not quite yet.'],
  });
  Object.assign(MM.data.FLAVOR.golem, {
    soothe: ['The {name} sits down. It has been standing for four hundred years.',
             'The {name} lowers itself, very slowly, and finally rests.',
             'The {name} powers down gently — not broken. Off duty, at last.'],
    fret: ['The {name} stays standing. It has forgotten how to stop.',
           'The {name} does not move. It is still wound much too tight.',
           'The {name} grinds quietly to itself. Not yet.'],
  });
  Object.assign(MM.data.FLAVOR.mage, {
    soothe: ['The {name} lowers its staff, bows politely, and goes off to read something calming.',
             'The {name} stops mid-incantation, thinks better of it, and takes the afternoon off.',
             'The {name} puts its notebook away and gives you a small, gracious wave.'],
    fret: ['The {name} mutters and re-checks its notes, flustered.',
           'The {name} loses its place and starts over, fretting.',
           'The {name} fidgets with its staff, unsettled.'],
  });
  Object.assign(MM.data.FLAVOR.snake, {
    soothe: ['The {name} untangles itself — all the way — and pours off into the grass, unhurried.',
             'The {name} uncoils, loop by loop, until nothing is knotted anywhere.',
             'The {name} lowers its head, sways once, gently, and slides away at peace.'],
    fret: ['The {name} knots itself back up, anxiously.',
           'The {name} coils tighter. It was so nearly loose.',
           'The {name} tangles again with a worried hiss.'],
  });

  // Bespoke soothe-victory lines for the monsters with the most personality —
  // keyed by NAME, checked before the family pool (MM.data.sootheLine, below).
  // A Cuckoo deserves better than "the bat lands."
  // Struggle pass: said once per session per topic, after a run of misses,
  // under the worked solution. True, kind, and never about the kid's worth.
  MM.data.ROUGH_PATCH_LINES = [
    'This kind is being stubborn today. Every worked answer above is the practice — that\'s how it comes loose.',
    'Tricky ones lately. The problems will meet you where you are — they always do.',
    'A hard stretch — every hero has them. Read the working above; next one starts fresh.',
  ];

  // Round 5: the little courtesies of a calmed friend when you bump it.
  MM.data.FRIEND_BUMP_LINES = [
    'It seems glad you stopped by.',
    'It hums something. Probably a thank-you.',
    'It pats the floor where it was sitting, in case you want the warm spot.',
    'It waves with whatever it waves with.',
  ];

  MM.data.SOOTHE_BESPOKE = {
    'Slime': ['The Slime does one small, delighted bounce. It has never once been calm before. It likes it.'],
    'Cuckoo': ['The Cuckoo pops out one last time — and instead of shouting, says "cuckoo" very quietly, the way a good clock should.'],
    'Tick Imp': ['The Tick Imp stops ticking. For the first time in its life, it is exactly on time.'],
    'Pendulum Knight': ['The Pendulum Knight swings slower, and slower, and comes to rest exactly in the middle.'],
    'Frost Pup': ['The Frost Pup flops over in the snow, all four paws in the air. Still freezing. Still adorable.'],
    'Wharf Cat': ['The Wharf Cat decides you may stay. It resumes owning the entire cave, graciously.'],
    'Coal Thief': ['The Coal Thief shows you its collection. It is, honestly, a very good collection.'],
    'Pilfer Gull': ['The Pilfer Gull returns a button, a sandwich crust, and — after a long pause — the hat.'],
    'Sticky-Fingered Gull': ['The Sticky-Fingered Gull gives everything back. The family will be told. The family will be amazed.'],
    'Off-Key Sprite': ['The Off-Key Sprite hums its wrong note one more time. Calm, it somehow fits.'],
    'Lantern Moth': ['The Lantern Moth settles on your lantern, content now just to look at it.'],
    'Ink Ghost': ['The Ink Ghost blots gently, and the smudges settle into something almost like handwriting.'],
    'Star Wisp': ['The Star Wisp brightens, softly, and stays — a little piece of sky that has decided it likes it here.'],
    'Soot Wisp': ['The Soot Wisp settles into the warm ash by the forge and stays there, sooty and content.'],
    'Mimic': ['The Mimic opens wide and offers you everything it was hiding. It keeps one shiny button, for sentimental reasons.'],
  };
  // The soothe-victory line for a monster: its own, if it has one; else its family's.
  MM.data.sootheLine = function (mon) {
    const bespoke = MM.data.SOOTHE_BESPOKE[mon.name];
    if (bespoke) return MM.data.pick(bespoke);
    return MM.data.flavor(mon.sprite, 'soothe', mon.name);
  };

  // How a calmed monster physically reacts, by sprite family. Five reusable
  // gestures, animated in battle.js: bounce (a contented wiggle), nap (curl up,
  // Zzz), wave (a goodbye, or a preen), drift (a slow easeful float upward),
  // sit (lowering down to rest at last).
  MM.data.SOOTHE_GESTURE = {
    slime: 'bounce', rat: 'nap', bat: 'wave', spider: 'nap', ghost: 'drift',
    skeleton: 'sit', golem: 'sit', mage: 'wave', snake: 'drift', tangle: 'drift',
  };
  MM.data.sootheGesture = sprite => MM.data.SOOTHE_GESTURE[sprite] || 'bounce';

  MM.data.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  // Some monsters carry their own article ("The Murk", Wave 3's "The Unwound
  // King") — theMon() prepends "the"/"The" only when the name lacks one, so
  // battle text never reads "the The Murk".
  MM.data.theMon = function (name, cap) {
    if (/^the /i.test(name)) return (cap ? 'The' : 'the') + name.slice(3);
    return (cap ? 'The ' : 'the ') + name;
  };
  MM.data.flavor = function (sprite, kind, name) {
    const f = MM.data.FLAVOR[sprite] || MM.data.FLAVOR.generic;
    const pool = (f[kind] && f[kind].length) ? f[kind] : MM.data.FLAVOR.generic[kind];
    return MM.data.pick(pool).replace(/(\b[Tt]he )?\{name\}/g,
      (m, art) => art ? MM.data.theMon(name, art[0] === 'T') : name);
  };

  // Rotating flavor for the inn, defeat screen, and the MathMaker's asides.
  MM.data.INN_DREAMS = [
    'You dream of remainders. They\'re friendly.',
    'You dream that 7 × 8 finally admits it\'s 56, and everyone cheers.',
    'You dream of a pie chart. It\'s blueberry.',
    'You dream you\'re carrying the one. It\'s heavy, but you manage.',
    'You dream of long division. It divides evenly. Bliss.',
    'You dream of a decimal point hopping happily from place to place.',
  ];
  // Wave 8a (P8, delight catalog): the innkeeper's cat — a different spot
  // every visit, deterministic per real day so it's stable within one visit
  // but genuinely different the next time the kid checks in.
  MM.data.CAT_SPOTS = [
    'curled up on the windowsill',
    'sprawled across a stack of folded quilts',
    'perched on top of the tallest bookshelf',
    'asleep in the innkeeper\'s own rocking chair',
    'nested in a warm laundry basket',
    'stretched out on the hearthside rug',
    'wedged into an empty flower pot, somehow',
    'curled around a teapot that has long since gone cold',
  ];
  MM.data.catSpotFor = function (dateStr) {
    let h = 0;
    for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
    return MM.data.CAT_SPOTS[h % MM.data.CAT_SPOTS.length];
  };
  // ---------- Wave 8b (P4): Miscount's Academy ----------
  // He teaches now. These are the lines he says handing over a slate, and the
  // ones he says when the kid finds the slip. Bible rule: Miscount is PROUD of
  // his students — never scornful, never "look what this idiot did." The kid is
  // being asked for a kindness, not a judgment. And a clean slate is a real
  // possibility every time, so "it's all correct" is a live answer, not a trap.
  MM.data.ACADEMY_INTRO = [
    '"They\'re good, my students. But they hurry." Miscount fans out a few slates. "Would you look these over? A second pair of eyes is the whole trick — I never had one."',
    '"Homework day." He hands you the chalk without being asked. "Find where it slipped, if it slipped. Some of them are perfect and I want you to say so."',
    '"I mark these myself, of course," says Miscount. "But I mark them like a man who once got everything wrong. I miss things. Help?"',
    '"Fresh from the Academy." He sets the slates down carefully, like they matter. "Be kind. Be exact. Those are the same thing, mostly."',
  ];
  MM.data.ACADEMY_CAUGHT = [
    '"There it is." Miscount taps the step, delighted. "She almost had it — and you saw exactly where it slipped."',
    '"Ha! Yes." He circles it. "He\'ll be pleased, honestly. Knowing WHERE is the whole battle."',
    '"Caught." Miscount writes a note in the margin — not a cross, a note. "That\'s the one line she needs to see again."',
    '"You found it faster than I did." He does not sound at all put out about this.',
  ];
  MM.data.ACADEMY_CLEAN = [
    '"Nothing wrong with it," Miscount agrees, beaming. "Every step honest. I make them show their work, you know. All of it."',
    '"Correct — and you checked anyway." He taps his temple. "That is the habit. That is the whole habit."',
    '"Clean as a bell." Miscount looks quietly thrilled. "I\'ll tell her you said so."',
  ];
  MM.data.ACADEMY_MISSED = [
    '"Not that one — that one holds up." He points to the real slip, gently. "Here."',
    '"Look again at that step; it\'s sound." Miscount taps a different line. "It went wrong HERE."',
    '"Close. That step\'s fine." He underlines the true one. "This is the one that wobbles."',
  ];
  MM.data.DEFEAT_LINES = [
    'Some of your gold rolled into a drain. The drain seems happy.',
    'A passing crow watched the whole thing. It will tell no one, out of respect.',
    'The monsters split your gold, then argued about the division. They should practice.',
    'The innkeeper heard about it already. She believes in you. Loudly.',
  ];
  MM.data.MATHMAKER_ASIDES = [
    '"I once added an eleven-digit number in my head. In the rain."',
    '"In my day, we regrouped uphill. Both directions."',
    '"I don\'t play favorites among the numbers. But between us: seven."',
    '"The Crown of Numbers isn\'t heavy. Knowledge weighs nothing. The gold, admittedly, weighs a bit."',
    // Wave 10 (P1, the Turning Stones): the MathMaker's one dry aside about
    // the courtyard out front. Never explains the sequence — just admits
    // the floor is older than he is.
    '"The floor out front? Older than me. It has opinions about geometry."',
  ];
  // Wave 6: Miscount's post-redemption small talk (the generic "nothing
  // pending, just visiting" greeting at his bank) — a pool now, mixing the
  // original line with one sincere aside (story-seed for Wave 7's ending).
  MM.data.MISCOUNT_SMALLTALK = [
    '"Back for more?" Miscount grins and rolls up his sleeves.',
    '"Ready when you are." He\'s already summoning a golem.',
    '"I didn\'t make the dark places, you know," Miscount says quietly, testing a golem\'s arm before it\'s finished forming. "I just stopped tending my corner of them... and tangles grow wherever nobody\'s working things out."',
  ];

  // Wave 7 epilogue: Miscount is a teacher now. He is, predictably and
  // wonderfully, insufferable about it — which is the healthiest thing that
  // has ever happened to him.
  MM.data.MISCOUNT_EPILOGUE = [
    '"My students show their work <b>twice</b>," says Miscount, with the terrible serenity of a reformed man. "Once for the answer. Once for the person who reads it after them."',
    '"Three of the valley children come out on Thursdays now." He is trying not to look proud and it is going extremely badly for him. "One of them argued with me about a remainder. She was <b>right</b>. It was the best day of my life."',
    '"I keep the golems on, you know. Not for you — you don\'t need them." Miscount pats one fondly. "For the next one who turns up not knowing they can do it yet."',
    '"Spar? Always." He rolls up his sleeves. "And afterwards you can tell me if my <i>explaining</i> is any good. That\'s the part I\'m still learning."',
  ];

  // ---------- Wave 7: the Gallery of Ten ----------
  // One line per recovered treasure, on its plinth in the castle. These are
  // the kid's OWN memories played back — so they are written from the far
  // side of the adventure, warm and specific, and every one of them is about
  // what the kid DID, never about the item's stats.
  MM.data.GALLERY = [
    // 1 Copper Coin of Counting
    'The very first thing you ever brought home. It is the least valuable object in this room by a wide margin, ' +
    'and it is under the best glass.<br><br><i>You were afraid of a slime, once. It seems important to remember that.</i>',
    // 2 Stone Times Table
    'Carved with every times fact, and far too heavy for a person your size, which did not stop you.<br><br>' +
    '<i>The rats have not been back to the cellar. The cellar is, by all accounts, thrilled.</i>',
    // 3 Miner\'s Golden Ledger
    'Every column lines up. Somewhere in the Old Mine a crew of ghosts finally closed their books and, presumably, ' +
    'went to bed.<br><br><i>This was the one where a name first surfaced. You carried it home without knowing what it meant.</i>',
    // 4 Golden Abacus
    'Its beads still slide like they are pleased with themselves.<br><br>' +
    '<i>Farmer Fenwick\'s boars are gentle again. He tells everyone it was the turnips. It was not the turnips.</i>',
    // 5 Divider\'s Compass
    'The needle never did point north. It pointed at the trouble, which was more useful.<br><br>' +
    '<i>You learned to account for what was left over. In more than one sense, it turned out.</i>',
    // 6 Decimal Crystal
    'Hold it up and the light splits — whole on one side of the point, parts on the other, and no argument ' +
    'between them.<br><br><i>You saw a boy in a grey robe in it, weeping over a slate. You did not look away.</i>',
    // 7 Silver Scale of Truth
    'It balances. It took a greedy spirit nine years and one determined child to get it to do that.<br><br>' +
    '<i>Every last cent, counted. He could not bear to see numbers put right. You did it anyway, gently.</i>',
    // 8 Amulet of Halves
    'Still humming, faintly, the thing it always hummed.<br><br>' +
    '<i>"Even what is broken can be made whole." You held onto those words all the way to the tower. ' +
    'You are holding onto them now.</i>',
    // 9 Wizard\'s Hourglass
    'It cannot turn time backward. Nothing can, and the ones who most wish it could were the ones you helped.<br><br>' +
    '<i>But anyone may begin again. That part was never a spell. That part was just true.</i>',
    // 10 Crown of Numbers — the only plinth that changes, because the only
    // treasure that stops being an exhibit. An entry may be a plain string or
    // {before, after} around the ending (engine.galleryPlinth picks).
    {
      before:
        'It sits under glass, exactly where the MathMaker set it down the day you brought it to him, and it has ' +
        'not moved since.<br><br><i>You have never seen him wear it. You have never seen anyone wear it.</i>',
      after:
        'The plinth is empty. The little brass plate has been polished until it shines, and it still says ' +
        '<b>CROWN OF NUMBERS</b>.<br><br><i>You are wearing it. That is where it lives now.</i>',
    },
  ];

  // Rotating small print at the bottom of the notice board.
  MM.data.BOARD_LINES = [
    'The nails holding this board up are very proud of their work.',
    'Small print: rewards paid in gold, gratitude, and one (1) firm nod.',
    'Please do not feed the notices to goats. Again.',
    'LOST: one boot. If found, return to Old Fisher Finn. He knows which one.',
    'The board is not responsible for monsters reading their own bounties.',
  ];

  // Wave 8a (P5, rust): a bounty targeting a topic the kid hasn't practiced
  // in a while gets one of these instead of nothing — framed as the WORLD
  // needing tending (fitting, after Wave 7), never as a scold. Keyed by
  // skill; only the ten mainland topics ever anchor a bounty dungeon.
  MM.data.RUST_LINES = {
    addsub_facts: 'The Meadow Cave misses you — its slimes have gotten sloppy with their sums again.',
    muldiv_facts: 'The Rat Cellar misses you — the rats have started multiplying without permission.',
    multidigit_addsub: 'The Old Mine misses you — its ghosts are miscounting again.',
    multidigit_mult: 'The Forest Ruin misses you — the guardians keep losing track of their own strength.',
    long_division: 'The River Catacombs miss you — something down there keeps dividing unevenly.',
    decimals_ps: 'The Crystal Grotto misses you — its light has gone a little uneven at the edges.',
    decimals_md: 'The Merchant\'s Vault misses you — the spirit in there is hoarding again, badly.',
    fractions_as: 'The Fraction Fortress misses you — its walls have drifted out of proportion.',
    fractions_m: 'The Wizard\'s Tower misses you — the fractions upstairs have started multiplying unsupervised.',
    word_problems: 'The Tower of Trials misses you — the stories up there have gotten tangled again.',
  };

  // Old Fisher Finn's running gag: a different catch after every task.
  MM.data.FINN_BOOTS = [
    'a boot',
    'the same boot',
    'a fancier boot',
    'a boot full of minnows',
    'two boots — a matched pair, tragically',
    'a boot with a crab in it (the crab is keeping it)',
    'a wizard\'s boot — it won\'t stop floating',
    'a boot that fits perfectly (suspicious)',
    'a golden boot (fake, probably... probably)',
    'a tiny boot for a mouse (he\'s keeping that one)',
    'the first boot again — they\'re old friends now',
  ];

  // ---------- Wave 9: "The Tending" (post-game practice) ----------
  // All of the below gates on s.endingDone — the kid is the New MathMaker
  // now, and tending the kingdom (not finishing it) is the whole point.

  // 5a. Daily Tangles: the notice board's self-narrating line, and the
  // milestone celebrations for s.daysTended (counts UP only, never resets).
  MM.data.TANGLE_LINES = [
    l => `A tangle was spotted near ${l} — it isn't hurting anyone, just... snarled.`,
    l => `Something's tangled up near ${l} again. Someone ought to see to it.`,
    l => `A knot of old confusion has drifted near ${l}. It happens, now and then.`,
  ];
  MM.data.TANGLE_MILESTONES = {
    10: { title: '🌀 10 days tended',
      body: 'Ten different days, you came back and untangled something. <span class="dim">Numeria doesn\'t keep score. But it is, undeniably, easier to tend than it used to be.</span>' },
    50: { title: '🌀 50 days tended',
      body: 'Fifty days of small, ordinary care. <span class="dim">The MathMaker never called Numeria "finished." Only "tended."</span>' },
    100: { title: '🌀 100 days tended',
      body: 'One hundred days. <span class="dim">Miscount, told the number, is not embarrassed about the crying this time.</span>' },
  };

  // 5c. The Spiral Stair — entrance flavor.
  MM.data.SPIRAL_SEALED = 'A narrow stair, half-built, coiled tight as a shell — and going nowhere yet. <span class="dim">Perhaps once the crown is truly yours.</span>';
  MM.data.SPIRAL_INTRO = 'A staircase coiled tight as a shell, climbing further than the tower has any right to hold. <span class="dim">Numeria writes itself along the spiral — you\'ve known that since the credits. Now you get to climb it.</span>';
  MM.data.SPIRAL_LANDING_LINES = [
    'The stair widens into a landing — a good place to catch your breath and look back down at everything you\'ve climbed.',
    'A landing, a chest, and a long clear view of the kingdom below.',
    'The stair opens out here. Someone left a chest. Someone always does.',
  ];

  // Cosmetic gold sinks: castle furnishing, boss statues, pet hats. All
  // purchased at fixed spots in the Open Castle (E.galleryPlinth's
  // neighbors); each renders permanently once bought.
  MM.data.CASTLE_FURNISH = {
    rug: { name: 'a good rug', emoji: '🧶', price: 120,
      empty: 'Bare stone floor here. It echoes a bit, honestly.',
      bought: 'A thick, warm rug — the kind that makes a room stop being just a hallway.' },
    garden: { name: 'a garden bed', emoji: '🌻', price: 150,
      empty: 'An empty patch of dirt by the window. It could be something.',
      bought: 'Sunflowers, mostly, with a few stubborn daisies that turned up uninvited and stayed.' },
    library: { name: 'a library shelf', emoji: '📚', price: 200,
      empty: 'An empty wall niche. It looks like it\'s waiting for something.',
      bought: 'Shelves, floor to ceiling, with every book you\'d expect a MathMaker to keep — and a few you wouldn\'t.' },
  };
  MM.data.STATUE_PRICE = 220;
  MM.data.STATUE_EMPTY = 'An empty plinth, waiting for someone worth remembering.';
  MM.data.STATUE_LINE = name => `A small stone likeness of ${name} — carved with more fondness than accuracy, honestly.`;
  MM.data.PET_HATS = [
    { id: 'bow', name: 'Bow', emoji: '🎀', price: 60 },
    { id: 'party', name: 'Party Hat', emoji: '🎉', price: 80 },
    { id: 'flower', name: 'Flower Crown', emoji: '🌸', price: 100 },
    { id: 'crown', name: 'Tiny Crown', emoji: '👑', price: 160 },
  ];
  MM.data.petHatById = id => MM.data.PET_HATS.find(h => h.id === id);

  // 5b growth visuals: Miscount's Academy visibly grows with attendance
  // (s.academyTotal — a lifetime "slates checked" counter, never resets).
  MM.data.ACADEMY_GROWTH = [
    { at: 0, line: 'A single slate-board and two stools.' },
    { at: 10, line: 'A second row of desks has appeared. Nobody remembers ordering them.' },
    { at: 25, line: 'The room is properly full now: real desks, a real chalkboard, a jar of spare chalk.' },
    { at: 50, line: 'Benches line both walls, and somebody has started a wall chart of "tricky steps we caught."' },
    { at: 100, line: 'A class photo hangs by the door — Miscount, beaming, surrounded by every slate he\'s ever marked.' },
  ];
  MM.data.academyGrowthLine = n => {
    const rows = MM.data.ACADEMY_GROWTH.filter(g => n >= g.at);
    return rows[rows.length - 1].line;
  };

  // ---------- Wave 10 (P1): the Turning Stones ----------
  // A courtyard of 13 arc-carved paving stones on the mainland overworld,
  // just south of the castle (world row 7, columns 13-25 — directly on the
  // walk from the player's spawn up to the castle door, so a kid crosses it
  // on every single turn-in without needing to seek it out). NOT new grid
  // glyphs — every tile underneath is ordinary walkable grass ('.'); the
  // stones are a pure canvas overlay drawn in drawWorld (ui.js), the same
  // "read live state off fixed tiles" recipe as the dungeon-entrance number
  // labels and the gear-gate pips. They never gate movement, never speak,
  // never react to a bump.
  //
  // Sizes: the seven squares of the classic spiral diagram (1, 1, 2, 3, 5,
  // 8, 13), each CARVED with its number so the sequence is literally
  // readable once its stone has turned — reading the courtyard left to
  // right IS the ending exam's question. ASCENT ONLY (design review
  // 2026-07-13: the first draft mirrored the sizes back down to fill 13
  // stones, and a kid who studied that would read "…13, 8" and answer the
  // exam's "what comes next?" with 8 — the foreshadowing must never teach
  // the wrong answer). Stones 8-13 are unnumbered, uniform curve segments
  // that continue the spiral's sweep — tasks 8-13 turn those. 21 never
  // appears anywhere; that is the exam's own discovery.
  MM.data.TURNING_STONES = (() => {
    const sizes = [1, 1, 2, 3, 5, 8, 13];
    const y = 7, baseX = 13;
    return Array.from({ length: 13 }, (_, i) => ({
      x: baseX + i, y, i,
      size: i < 7 ? sizes[i] : 6,
      label: i < 7 ? String(sizes[i]) : null,
    }));
  })();
  // A stone's "true angle" (once its task is done) rotates a quarter turn
  // per position, so aligned stones trace a continuous curve — the classic
  // spiral-arc look. An UNALIGNED stone sits at a fixed skew instead: a
  // deterministic offset derived from its own index, never from Date.now()
  // or a frame counter, so it never moves on its own (Calm-Mode-safe by
  // construction — there is nothing to turn off).
  MM.data.stoneTrueAngle = i => (i * 90) % 360;
  MM.data.stoneSkew = i => ((i * 47) % 60) - 30; // degrees, always non-zero-ish

  MM.data.weaponById = id => MM.data.WEAPONS.find(w => w.id === id) || MM.data.WEAPONS[0];
  MM.data.armorById = id => MM.data.ARMOR.find(a => a.id === id) || MM.data.ARMOR[0];

  MM.data.taskReward = i => ({ gold: 25 * i, xp: 15 * i });
  MM.data.chestGold = i => 10 + 12 * i + Math.floor(Math.random() * 10);
  MM.data.xpForLevel = level => 20 * level; // xp needed to go from `level` to the next

  // ---------- townsfolk (overworld NPCs, keyed by map letter) ----------
  // Each NPC's talk(state) returns dialog that evolves with story progress.
  MM.data.NPCS = {
    a: {
      name: '🧑‍🌾 Farmer Fenwick', sprite: 'villager', pal: null,
      talk(s) {
        // Wave 10 (P3, the mid-game event): the fence east of the farm gets
        // its own bump dialog (E.fencePost) — this is just Fenwick's own
        // small-talk acknowledging it, above the older boar-related lines.
        if (s.tasksDone.includes(6)) return '"The fence held fine through the last storm — first time in months." Farmer Fenwick tips his hat toward the mended rail east of here. "My hired hand keeps saying he did all the work fixing it. He did not do all the work."';
        if (s.tasksDone.includes(4)) return '"The boars have gone calm as lambs since you cleared the old ruin. The farm\'s in your debt, hero! Say — you look stronger every time I see you."';
        if (s.taskIndex >= 4) return '"The ruin\'s the one marked <b>4</b> on the map. Mind the boars — and whatever\'s making them so angry. Never seen \'em like this in thirty years."';
        return '"Boars trampled my turnips again last night! They came from the old ruin in the forest. Something\'s got \'em all stirred up — they were gentle as puppies before this confusion business began."';
      },
    },
    e: {
      name: '🎣 Old Fisher Finn', sprite: 'villager', pal: { A: '#3a6b8a', a: '#2c5068', H: '#b0aec4' },
      talk(s) {
        // the running gag: Finn's catch changes after every completed task
        const boots = MM.data.FINN_BOOTS;
        const haul = `<br><br>🎣 <i>Today's catch: <b>${boots[Math.min(s.tasksDone.length, boots.length - 1)]}</b>.</i>`;
        // Wave 10 (P2, reactive cast): word travels down the river faster
        // than fish do, some days.
        if (s.endingDone) return '"Crown fits, don\'t it." Old Fisher Finn nods like he called it years back. "Knew you had it in you, back when you were just a kid who couldn\'t catch a fish to save your life."' + haul;
        if (s.isles.lampLit) return '"Heard the lighthouse is lit again, clear out on the isles." Old Fisher Finn squints at the water, like it might confirm it. "Word travels down the river faster than fish do, some days."' + haul;
        if (s.tasksDone.includes(5)) return '"You caught a whole compass, I hear! The river runs quieter now. Even the fish seem to be countin\' themselves again."' + haul;
        if (s.taskIndex >= 5) return '"The catacombs? Under the river, marked <b>5</b>. The creatures down there split into pieces when you strike \'em — and mind you count what\'s <i>left over</i>. Remainders, lad. Remainders."' + haul;
        return '"Fish aren\'t bitin\'. River\'s all confused — flows left, flows right, can\'t make up its mind. Started when the shadows came, same as everything else."' + haul;
      },
    },
    g: {
      name: '🔮 Sage Sylvia', sprite: 'sage', pal: null,
      talk(s) {
        // Wave 7 epilogue: she finally hands over the telescope.
        if (s.endingDone) return '"You have earned the view." Sage Sylvia puts the telescope into your hands and does not take it back.<br><br>"Keep it. A MathMaker ought to be able to step back and see the shape of things — that is most of the job, and nobody ever tells you."<br><br><i>She is already looking at something else. She is always already looking at something else.</i>';
        // Wave 6/7 seeds: the mortar line rewards the Breakwater; the
        // telescope line (Wave 7 spiral seed) rewards the whole harbor rebuilt.
        if (s.isles.gullwrackRebuilt) return '"The kingdom looks different from far away. I keep a telescope for the day you\'ve earned the view."';
        if (s.isles.breakwaterDone) return '"Look closely at the castle stones sometime, hero. The mortar is arithmetic. The whole kingdom is — though most folk never squint."';
        // Wave 10 (P2, reactive cast): Sylvia hears about the isles the way
        // she hears about everything — before the letters arrive.
        if (s.isles.hallsDone) return '"A choir, whole again, out on Chime Isle." Sylvia hums half a note, gets it right, and looks briefly delighted with herself. "Every voice was always supposed to fit somewhere. Somebody simply had to go looking."';
        if (s.isles.spireDone) return '"A clockwork tower, ticking again, somewhere past the horizon." Sylvia tilts her head, listening to nothing you can hear. "Numbers keep their own time, even when nobody is counting. It is rather the whole point of them."';
        if (s.isles.lampLit) return '"The Great Lamp is lit. I felt it before Percy\'s letter ever arrived — a kind of settling in the air over the water." Sage Sylvia looks quietly pleased with herself for noticing. "Patterns don\'t stay hidden from someone who is looking."';
        // Wave 10 (P1, the Turning Stones): Sylvia's one rotating line about
        // the courtyard — a small chance, only while the stones still have
        // some turning left to do (>=1 done, <13 — once they're complete the
        // ending's own reveal takes over the job of explaining them).
        if (s.tasksDone.length >= 1 && s.tasksDone.length < 13 && Math.random() < 0.2) {
          return '"The courtyard stones. They turn, you know. One more every time you set something right." Sage Sylvia says it like a fact of nature, not a secret. "My grandmother said they were a picture, seen from high enough."';
        }
        if (s.taskIndex > 10) return '"You did what no sword could do: you showed a lost student the way home. Numeria will remember, hero. And so, I think, will Miscount."';
        if (s.taskIndex >= 8) return '"Every problem you have solved, every step you have shown your work — Miscount feels them like sunlight through fog. You are closer than you know. When you face him, be brave. And be kind."';
        if (s.taskIndex >= 5) return '"Confusion is not evil, child. It is what fear becomes when nobody helps. When you meet the Lord of Confusion, bring your courage — and your patience."';
        if (s.taskIndex >= 3) return '"So the name has surfaced at last. <b>Miscount.</b> I warned the MathMaker that grief buried is not grief gone. Ask him — he owes you the truth of it."';
        return '"Long ago, the MathMaker had an apprentice. Brilliant boy. But that is an old story, and the wind is cold tonight. Come back when you have seen more of the world, little hero."';
      },
    },
    h: {
      name: '🧒 Little Pip', sprite: 'kid', pal: null, riddle: true,
    },
    j: {
      name: '🧳 Trader Tessa', sprite: 'villager', pal: { A: '#8a4a8a', a: '#6b3a6b', H: '#2a2438' },
      talk(s) {
        const def = MM.engine.totalDef();
        if (def <= 0) return '"Traveling clothes? In monster country?? Get yourself to the shop, dear — <b>armor blocks part of every hit you take</b>. Even leather is better than laundry. And if the shopkeeper quizzes you, answer right for a discount!"';
        if (def < 4) return '"Good start on the armor, dear — but don\'t forget your <b>head and feet</b>! A helmet and boots each block a bit more. It all adds up."';
        if (s.gold >= 150) return '"That\'s a heavy coin purse, dear. Gold doesn\'t fight monsters — <b>gear does</b>. And have you seen the <b>magical rings</b>? One on your finger at a time, so choose what suits you."';
        return '"Smart shopper! Remember: <b>weapons</b> make your correct answers hit harder, <b>armor, helmets and boots</b> blunt what the monsters do back. The math between, that part\'s all you."';
      },
    },
    u: {
      // Miscount, redeemed — waits across the bridge after task 10.
      // Bumping him starts a sparring match (handled in engine.miscountArena).
      name: '🧑‍🎓 Miscount', sprite: 'mage',
      pal: { H: '#8d88b8', h: '#6e6a94', A: '#4a4660', E: '#7ee0e8', F: '#3a3352' },
      arena: true,
    },
    // ===== Port Brightwater (the Isles) =====
    c: {
      name: '🕯 Keeper Callie', sprite: 'sage', pal: { A: '#2c6a8a', a: '#1f4e68', H: '#e8d8b0' },
      talk(s) {
        s.isles.metCallie = true;
        const L = s.isles.lenses;
        // Wave 7 epilogue: the bells, and a keeper who no longer keeps watch alone.
        if (s.endingDone) return '"They ring the bells for you now, you know. Every evening." Keeper Callie says this to her charts, not to you, which is how she says the things she means.<br><br>"Two of the harbour children have asked me to teach them the lenses. I said yes." She finally looks up. "That is <i>your</i> fault, MathMaker. I hope you are pleased."<br><br><i>She is smiling. She does not hide it this time.</i>';
        // Wave 10 (P2, reactive cast): the harbormistress hears about every
        // harbor. Ordered most-advanced-flag-first, same convention as the
        // rest of the cast.
        if (s.isles.gullwrackRebuilt) return '"Gullwrack sent word — every stone mended, roof to pier." Keeper Callie allows herself a real smile this time. "A harbor looking after a harbor. I approve enormously."';
        if (s.isles.hallsDone) return '"They say you can hear the Resonant Halls clear across the water some evenings, all in tune." Keeper Callie almost smiles. "I always did like a choir that knows where every voice belongs."';
        if (s.isles.spireDone) return '"Ships came through with the oddest report — a tower on Horologe Isle, ticking, like it never stopped." Keeper Callie taps her own pocket-watch fondly. "Mine\'s been six minutes slow for years. I have opinions about which of us needed the help more."';
        if (s.isles.lampLit) return '"The lamp is lit." Keeper Callie says it plainly, the way you say a thing you have waited nine years to say without your voice breaking on it. "The bells rang themselves silly last night. I let them."';
        if (L.cinderforge) return '"Three lenses. THREE." Keeper Callie is quietly crying and not hiding it well. "Nine years I kept one lamp burning in a window, and now the whole sky is stitched with light. The Murk around the <b>Great Lighthouse</b> is thinning by the hour — when the tower opens its doors, hero, it will be because of you."';
        if (L.frostbite) return '"Two beams cross over the water every night now. I leave the curtains open on purpose." She slides the final chart across the table. "The pass to the <b>Cinderforge Depths</b> is drawn — east, past the smoke. Its <b>Cinder Lens</b> is three floors down. Mind the drop chutes: <i>the mine only lets you fall one way.</i>"';
        if (L.tidepool) return '"The Tide Lens shines and the shallows are clear — first light on this coast in nine years, hero." She slides a fresh chart across the table. "The pass to <b>Frostbite Hollow</b> is drawn — northeast, past where the fog was. Its <b>Frost Lens</b> sleeps under the ice. Dress warm, and mind the frozen lake: <i>once you\'re sliding, you don\'t stop until something stops you.</i>"';
        return '"So the Compass Rose finally brought help." Keeper Callie sets down her chart pen. "Three lighthouses guard these isles, and all three lenses went dark. In the dark, the <b>Murk</b> grew — that grey wall you see across the island. It isn\'t wicked. Just deep, and dark, and terribly patient.<br><br>Light the <b>Tide Lens</b> in the grotto west of town, and you\'ll see what light does to it. The other two passes are fogged in until then — one lens at a time, hero."';
      },
    },
    // Wave 6.5: the island hermits — every new region ships with at least
    // one speaking character (arrival-experience rule, FINAL_PASSES G3)
    z: {
      name: '🕰 Tobbin the Clocksmith', sprite: 'sage', pal: { R: '#7a6a52', r: '#5e5140', H: '#c8c2b4' },
      talk(s) {
        if (s.isles.spireDone) return '"Hear that? <i>Tick. Tock.</i> Nine floors of it, steady as rain on a roof." He wipes an eye with a polishing cloth. "A stopped heart isn\'t a dead one, I always said. It just wants someone patient enough to wind it. That was you, friend. That was you."';
        if (s.taskIndex) return '"Mind the tower, traveler. The <b>Clockwork Spire</b> stopped, oh... years back. Nobody wound it. Nobody worked at it. Things that stop and stay stopped go <i>strange</i>."<br><br>He measures your shoulders with a string, twice. "Hm. Sturdy. Inside you\'ll find doors that want a clock READ to them — read carefully, the hands don\'t repeat themselves. And plates that turn the gates: step, look, step again."';
        return '"A visitor! Measure twice, greet once — hello."';
      },
    },
    x: {
      name: '🔔 Bell-keeper Brona', sprite: 'sage', pal: { R: '#5e4579', r: '#4a3660', H: '#e0d8ec' },
      talk(s) {
        if (s.isles.hallsDone) return 'She hums a full, round chord before she speaks — and this time nothing wavers. "The choir is <b>whole</b>. Every voice in it, even the one we... mislaid." A bell answers from the Halls, right on pitch. "Especially that one."';
        return 'She hums a little tune before she speaks, and the last note wobbles like it misses someone. "The <b>Resonant Halls</b> sang once — a choir of stones, if you can believe it. One voice got left out of the arrangement. Left-out voices don\'t go quiet, dear. They go <i>wrong</i>."<br><br>"If you go in: the echo doors only want you to <b>listen, then repeat</b>. Take all the time you like. Music waits."';
      },
    },
    p: {
      name: '⚓ Old Salt Percy', sprite: 'villager', pal: { A: '#4a6b3a', a: '#38522c', H: '#d8d4c4' },
      talk(s) {
        const pet = s.isles.pet;
        // Wave 7 epilogue: Percy gets the sequel door, because of course he does.
        if (s.endingDone) return '"So the charts DID know something." Old Salt Percy is enormously pleased with himself, and has clearly been waiting weeks to be.<br><br>"Past the spiral\'s edge, they curl right off the paper. There\'s a sea out there nobody\'s finished drawing."<br><br><i>He taps the blank corner of the map, twice.</i> "Needs someone good at working things out."';
        // Wave 7 spiral seed: the charts themselves start hinting at something.
        if (s.isles.breakwaterDone) return '"Charts of this sea always want to curl at the edges. Like they know something."';
        // Wave 10 (P2, reactive cast): the old salt hears everything, and is
        // always accidentally right about it.
        if (s.isles.gullwrackRebuilt) return '"Gullwrack, mended stone to stone? Ha!" Old Salt Percy slaps his knee. "Told \'em the sea gives back what you\'re willing to rebuild. Nobody believes the old salt till it happens."';
        if (s.isles.hallsDone) return '"Heard bells and voices both, out past Chime Isle, singing in step." He squints at the horizon like he\'s proud of it personally. "Knew that hum wanted company. Everything tangled just wants company, if you ask me — which nobody does."';
        if (s.isles.spireDone) return '"That clocktower\'s keeping proper time again, they tell me." Percy checks the sun instead of a watch, same as always. "Never trusted gears myself. Still — good on it. Good on you."';
        if (s.isles.lenses.frostbite) return '"Two lenses lit! The fish are practically navigating themselves into my net."<br><br>"That smoky pass east is the last one before the tower. Callie\'s been up three nights charting it. Bring her a kind word, would you?"';
        if (s.isles.lenses.tidepool) return '"Saw the beam sweep past my window last night. Cried a bit. Don\'t tell the gulls."<br><br>"The cold pass northeast is open — <b>Frostbite Hollow</b>. Word to the wise: on that lake ice, <b>you slide till you hit something</b>. Them frozen Sentinels? They don\'t chase. They just <i>wait</i>. Rude, honestly."';
        return '"Word to the wise, sailor: in the grotto, them <b>gulls will lift the gold right off you</b> — chase \'em down, they always keep it on \'em. And if a wall looks <b>cracked</b>, give it a shove."' + (pet ? `<br><br>"That little ${MM.data.PETS[pet.species].name} of yours has a nose for hidden things. Watch when it perks up!"` : '');
      },
    },
    q: {
      name: '🎵 Bard Barnaby', sprite: 'bard', pal: null,
      talk(s) {
        const n = s.tasksDone.length;
        // Wave 7 epilogue: the ballad is finished, and it does not rhyme.
        if (s.endingDone) return '🎵 <i>"Sing of the one who untangled it all — not with a sword, but with chalk on a wall! Not with a blow, but by showing the way — the MathMaker learns, and the MathMaker <b>stays</b>!"</i> 🎵<br><br>"That last line doesn\'t scan and I don\'t care," says Bard Barnaby, with feeling. "It\'s the <b>true</b> one."';
        // gold badges are ballad-worthy
        const golds = Object.values(s.badges || {}).filter(t => t >= 3).length;
        const goldLine = golds
          ? `<br><br>🥇 <i>"And ${golds} gold badge${golds > 1 ? 's' : ''}! I'm working ${golds > 1 ? 'them' : 'it'} into the next verse. Nothing rhymes with 'badge.' I'll manage."</i>`
          : '';
        // Wave 10 (P2, reactive cast): the isles are only ever reachable
        // once every mainland/east-bank task is done (n is already 10+ by
        // then) — so these sit above the numeric verses, most-advanced-flag
        // first, or they'd never be reachable.
        if (s.isles.gullwrackRebuilt) return '🎵 <i>"Stone by stone and slab by slab, a harbor stands that a hero built up — never once needing a sword to win, just chalk, and math, and showing them in!"</i> 🎵<br><br>"That last bit\'s a stretch. I stand by it."' + goldLine;
        if (s.isles.hallsDone) return '🎵 <i>"One voice was missing from the choir\'s great song — the hero went looking, and it wasn\'t gone long!"</i> 🎵' + goldLine;
        if (s.isles.spireDone) return '🎵 <i>"Tick, tock, the old tower wound down slow — the hero showed up and the gears turned, you know!"</i> 🎵<br><br>"Doesn\'t scan, I know. The gears don\'t much care about scansion."' + goldLine;
        if (s.isles.lampLit) return '🎵 <i>"A light that stood dark for nine long years, now sweeps \'cross the water and calms every fear!"</i> 🎵<br><br>"That one\'s got a proper chorus. Wrote it in a night."' + goldLine;
        if (n >= 10) return '🎵 <i>"Sing, Numeria, sing of the day — the hero who counted the shadows away! The student came home and the sums all came right — Barnaby\'s ballads shall run through the night!"</i> 🎵<br><br>"That one\'s about YOU, you know."' + goldLine;
        if (n >= 7) return '🎵 <i>"Three tasks left, the tower looms tall, fractions and stories and shadows and all! But heroes who show every step of their work — no Lord of Confusion can lurk!"</i> 🎵' + goldLine;
        if (n >= 4) return '🎵 <i>"Halfway there, with treasures in hand — the bravest young counter in all of the land!"</i> 🎵<br><br>"Getting good material out of you, hero. Keep it up!"' + goldLine;
        if (n >= 1) return '🎵 <i>"The hero went down to the meadow at dawn, and hey-nonny-nonny, the slimes were all gone!"</i> 🎵<br><br>"First verse of many, I hope!"' + goldLine;
        return '🎵 <i>"A hero arrived with boots full of clay, and hasn\'t done anything famous... yet... hey!"</i> 🎵<br><br>"No offense. The song improves when you do — go do something ballad-worthy!"' + goldLine;
      },
    },
    // Wave 2's enchanter. Bumping her opens the fuse-a-gem / buy-an-amulet
    // dialog (handled in engine.talkNpc -> ui.enchanterDialog).
    f: {
      name: '🔥 Emberlyn the Enchanter', sprite: 'villager',
      pal: { A: '#8a3d2c', a: '#66352a', H: '#e0a952' },
      enchant: true,
    },
    // ===== Wave 7: inside the Open Castle =====
    // The MathMaker, finally standing somewhere the kid can walk up to him.
    // 'Q' is the Study; bumping him is the reveal (engine.studyReveal).
    Q: {
      name: '🧙 The MathMaker', sprite: 'mathmaker', pal: null,
      study: true,
    },
    // Miscount, in the Study beside his old teacher. Not a villain, not a
    // penitent — a colleague. He gets the last word on what went wrong.
    J: {
      name: '🧑‍🎓 Miscount', sprite: 'mage',
      pal: { H: '#8d88b8', h: '#6e6a94', A: '#4a4660', E: '#7ee0e8', F: '#3a3352' },
      study: true,
    },
    // Wave 6: Gullwrack Harbor's Guildmistress — the slab-tiling repair
    // sites' narrator. Checks live repairSites progress, not a stored count.
    y: {
      name: '🧱 Guildmistress Maren', sprite: 'villager',
      pal: { A: '#6b5a3d', a: '#4f4128', H: '#c4915c' },
      talk(s) {
        const townSites = MM.maps.GULLWRACK_TOWN_SITES || [];
        const done = townSites.filter(id => {
          const st = s.repairSites && s.repairSites['gullwrack:' + id];
          return st && st.done;
        }).length;
        // Wave 7 epilogue: the Guild is taking apprentices again.
        if (s.endingDone && s.isles.gullwrackRebuilt) return '"Guild\'s taking apprentices again. First time in nine years." Guildmistress Maren says it like a weather report and means it like a hymn.<br><br>"Six of them. Six! I have had to make a <b>rota</b>." She brandishes it. It is a truly magnificent rota. "There is paperwork now, MathMaker. Real paperwork. I have never been happier in my <i>life</i>."';
        if (s.isles.gullwrackRebuilt) return '"Every stone in this town, mended by a hero who shows their work. The Guild\'s never had a member like you." Maren taps the wall fondly. "Go on — the harbor\'s yours as much as anyone\'s now."';
        if (done > 0) return `"${done} of ${townSites.length} sites mended — the pier, the roofs, whatever\'s cracked. Read the blueprint plaque, push the slabs onto the broken patch, and mind you push straight — a stone only moves the way you bump it." She nods at the harbor. "Slow and square. That's the whole trade."`;
        return '"Gullwrack took a beating in the last storm — half the town\'s still broken floor and loose slabs." Maren wipes her hands on her apron. "Find a blueprint plaque, solve what it asks, then push the stone onto the crack. One tile at a time — no rushing masonry. Made a mess? There\'s a lever by every site. Pulls the stones right back to where they started."';
      },
    },
  };
})();
