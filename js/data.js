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
    multidigit_addsub: '📝', // was 🧮 — kids don't know abacuses (playtest)
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

  // Look up a monster KIND's card (name → {name, sprite, pal, desc}) across the
  // whole catalog — every roster type + boss, plus the shared Golem and Mimic
  // cards. The bestiary (s.bestiary.befriended / .kills) is keyed by this
  // `name` (E.beastKey), so this is how the Monster Book, the Parlor deck, and
  // the Wave 17 Menagerie turn a befriended KEY back into a drawable creature.
  MM.data.beastByName = function (name) {
    const all = MM.data.MONSTERS.flatMap(r => [...r.types, r.boss]).concat([MM.data.GOLEM_CARD, MM.data.MIMIC_CARD]);
    return all.find(t => t.name === name) || null;
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
    // v1.7.1 (playtest 2026-07-13, "more variety in the calming section"):
    // the gentle rack fills the two tiers it was missing — the dagger's
    // (3/40) and the Star Blade's (10/450) — so the ladder reads complete
    // whichever header a kid shops under.
    { id: 'reedflute', name: 'Reed Flute', emoji: '🪈', atk: 3, price: 40, gentle: true, verb: 'plays a low, patient note for',
      quip: 'One note, played very kindly. It is always the right note.' },
    { id: 'bubblepipe', name: 'Bubble Pipe', emoji: '🫧', atk: 5, price: 120, gentle: true, verb: 'drifts a bubble toward',
      quip: 'Blows perfect spheres. Refuses to blow anything else.' },
    // ranged, and one atk below its melee peer (the Battle Axe, 7) — exactly the
    // trade the Smuggler's Crossbow makes against the Tidal Blade. A dangled
    // lure IS a reach weapon, so it inherits the round-1-miss rule for free.
    { id: 'catwand', name: 'Cat-Fishing Wand', emoji: '🎣', atk: 6, price: 250, gentle: true, ranged: true, verb: 'dangles the lure for',
      quip: 'Irresistible to monsters. Utterly irresistible to your pet, who must be discouraged.' },
    // v1.7.3 (playtest: "the cat-fishing wand is listed after the singing
    // bowl"): the racks read in PRICE order, so the array stays in price
    // order — the bowl sits between the wand (250g) and the bells (700g).
    { id: 'singingbowl', name: 'Singing Bowl', emoji: '🥣', atk: 10, price: 450, gentle: true, verb: 'circles the rim of the bowl for',
      quip: 'One slow circle, and the whole room breathes out.' },
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
  // Wave 17: befriended creatures in the Menagerie grow exactly as the pet
  // does — a three-stage arc with ascending thresholds (PET_STAGES-style).
  // There is no "feeding" verb in the nursery, so growth is driven by a single
  // `tended` counter (a tend is both the practice AND the care). Modest
  // thresholds so a returning kid SEES a creature settle in and flourish.
  MM.data.MENAGERIE_STAGES = [
    { name: 'Newcomer' },                      // just arrived, still shy
    { name: 'Settled', tended: 3 },            // knows the place now — earns its first hat
    { name: 'Flourishing', tended: 8 },        // thriving, thoroughly at home
  ];
  // The tiny hats a settled creature may wear (reuse of the pet-hat cosmetic
  // idiom — no new art). Which one a creature wears is a PURE function of its
  // name (deterministic, so it never changes on it), granted when it settles in.
  MM.data.MENAGERIE_HAT_IDS = ['bow', 'party', 'flower', 'crown', 'numberling', 'anchor'];
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
    // Earned in the Practice Yard (the Number Sense milestone), never sold —
    // effect hook lives in battle.js's damage calc, gated on a per-battle flag.
    { id: 'reckoner', name: 'Ready Reckoner', emoji: '🧮', desc: 'Your first correct answer each battle deals +2 damage' },
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

  // ---------- Wave 21 (Looking Glass P2): mirror-world content ----------
  // Read ONLY when E.inMirror() is true (js/engine.js, js/battle.js). Bounded
  // pools, deadpan register — the reflection is the joke, never the kid.

  // P2.2 — the Cheshire Cat's cryptic-but-kind lines. GENERAL mirror
  // guidance only: negatives don't exist until P3, so nothing here hints at
  // signed numbers. Cycled by a counter (E.armCheshire), never Math.random.
  MM.data.CHESHIRE_LINES = [
    'Everything here is the same, only turned the other way. You\'ll get used to it. Or you won\'t — both are fine.',
    'A reflection never lies about the shape. Only about which hand it favors.',
    'You are still you. The kingdom only turned around to look at itself.',
    'Lost is just a place you haven\'t recognized yet.',
    'I go where I\'m needed, which is a roundabout way of saying I go everywhere, eventually.',
  ];

  // P3 — the Cheshire's NEGATIVE-number hints (read only when E.negativesOn()).
  // Cryptic-KIND, still smile-last; each is a true, useful thing about the
  // number line, said sideways. Cycled by the same counter, never Math.random.
  MM.data.CHESHIRE_NEG_LINES = [
    'To get to zero from below, you go up. From above, you go down. Everyone arrives eventually.',
    'A number and its opposite are the same distance from nothing — one to the east, one to the west.',
    'Add a thing to its very opposite and you are left holding nothing at all. The Tweedles find this endlessly funny.',
    'Less than nothing is still somewhere. West of zero is a perfectly good place to stand.',
    'Take away more than you have and you have simply walked past zero. It happens to the best of us.',
  ];

  // P3 — Tweedledum & Tweedledee: the additive-inverse room. All comedy is on
  // the twins (contradiction, "Contrariwise!"), never on the kid. Bounded pool.
  MM.data.TWEEDLE_ENTER_LINE = '🎭 Two round little figures stand back to back, each insisting the other is standing the wrong way round. A carved socket in the floor reads: ▢ + ▢ = 0.';
  MM.data.TWEEDLE_LINES = [
    '"You\'re going to push us together," says Tweedledum. "Nohow," says Tweedledee. "He\'s going to push us apart. Contrariwise — it comes to exactly the same nothing."',
    '"I\'m three to the good," says one. "And I\'m three to the bad," says the other. "Between us we are precisely nobody. We\'re very proud of it."',
    '"If it were so, it might be," says Tweedledee. "And if it was so, it would be. But as it isn\'t, it ain\'t. That\'s logic." Neither of them has said a single thing.',
    '"Put us in the right way round and we come to nothing," says Tweedledum. "Put us in the WRONG way round," says Tweedledee, "and we ALSO come to nothing. It\'s our best trick."',
  ];
  // The cancel-to-zero moment. a + b is a true inverse pair (a + b === 0); g is
  // the gold reward. Uses the displayed unicode minus (U+2212), same as combat.
  MM.data.TWEEDLE_CANCEL = function (a, b, g) {
    const sgn = n => (n < 0 ? '−' + (-n) : '+' + n);
    return {
      title: '🌀 Contrariwise — and then, nothing',
      body: `<b>(${sgn(a)}) + (${sgn(b)}) = 0.</b> The two slabs lean together, agree completely for once, and cancel — ` +
        `to exactly nothing, with a small satisfied <i>click</i>.<br><br>` +
        `"Nohow!" cry the Tweedles, delighted. "Contrariwise!" They shake hands, in perfect agreement about being ` +
        `perfect opposites.<br><br>+${g} gold — for proving that a number and its opposite make nothing at all.`,
    };
  };
  // The gentle grown-up note shown when negatives are OFF — never a locked wall.
  MM.data.NEGATIVES_OFF_NOTE = {
    title: '🚪 A door, leaning the wrong way',
    body: 'Behind it, two voices are arguing cheerfully about which of them is <i>less than nothing</i>.<br><br>' +
      'The door won\'t open just yet. <b>A grown-up can open negative numbers</b> for you in 👪 <b>Parent Settings</b> — ' +
      'and then the Tweedles will be delighted to show you how a number and its opposite add up to nothing at all.',
  };

  // ===== Wave 23 (Looking Glass P3.5): the number-line crossing =====
  // Read ONLY when E.negativesOn(). Negatives as a PLACE your feet go. All
  // gentle: a wrong stone is a nudge that names the stone and points the way,
  // never a scold. A shared signed-number formatter (U+2212 minus, like combat
  // and the Tweedles) so a −4 never reads as a stray dash.
  MM.data.signedNum = n => (n === 0 ? '0' : (n < 0 ? '−' + (-n) : '+' + n));
  const NL_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  MM.data.NUMBERLINE_ENTER_LINE =
    '🌉 A frozen channel, and a line of pale stones laid across it — each carved with a number. ' +
    'To the west they count down <i>below</i> nothing; to the east they count up above it. ' +
    'And in the very middle, marked apart and saying nothing at all: <b>0</b>.';
  // The signpost names a target. Returns just the sentence; the caller wraps it.
  // 'abs': stand on a signed number. 'zero': N east/west of zero. 'rel': N
  // steps east/west of where you stand. dir +1 = east, −1 = west.
  MM.data.numberlineTargetLine = function (t) {
    const word = NL_WORDS[t.mag] || String(t.mag);
    const way = t.dir < 0 ? 'west' : 'east';
    if (t.kind === 'abs') return `Stand on <b>${MM.data.signedNum(t.dir * t.mag)}</b>.`;
    if (t.kind === 'zero') return `Meet me <b>${word} ${way} of zero</b>.`;
    const steps = t.mag === 1 ? 'one step' : `${word} steps`;
    return `Take <b>${steps} ${way}</b> of where you stand.`;
  };
  // The gentle informative nudge on a wrong (non-target) stone: names the
  // stone you're on and how far, which way, to the one the signpost meant.
  MM.data.numberlineNudge = function (tileValue, targetValue) {
    const diff = targetValue - tileValue;
    const steps = Math.abs(diff);
    const way = diff < 0 ? 'west' : 'east';
    const word = NL_WORDS[steps] ? NL_WORDS[steps][0].toUpperCase() + NL_WORDS[steps].slice(1) : String(steps);
    const stepStr = steps === 1 ? 'One more step' : `${word} more steps`;
    return `🌉 That stone is <b>${MM.data.signedNum(tileValue)}</b>. ${stepStr} <b>${way}</b> to go.`;
  };
  // The you-stood-on-the-right-one line.
  MM.data.numberlineHitLine = tileValue =>
    `🌟 You stand on <b>${MM.data.signedNum(tileValue)}</b> — exactly where the signpost meant.`;
  // The full-crossing completion. g = gold (0 on a replay after the first).
  MM.data.NUMBERLINE_DONE = function (g) {
    return {
      title: '🌉 The crossing is yours',
      body: 'You have walked from below nothing to above it, and stood on every stone the signpost named. ' +
        'The pale stones hum, pleased with you.<br><br>' +
        '<i>West of zero was a perfectly good place to stand, after all.</i>' +
        (g > 0 ? `<br><br>+${g} gold, for learning the way of it.` : ''),
    };
  };
  // The overworld zero-meridian crossing beat (P3.5.1) — narrated once per
  // visit, the first time you step west of the glowing zero-line.
  MM.data.NUMBERLINE_BELOW_BEAT =
    '🧭 You cross the glimmering zero-line. Westward the light turns cooler — you have stepped into <b>the Below</b>, ' +
    'where every number is less than nothing.';
  // The gentle grown-up note shown when negatives are OFF at the crossing —
  // same PATTERN as MM.data.NEGATIVES_OFF_NOTE, themed to the channel, never a
  // locked wall.
  MM.data.NUMBERLINE_OFF_NOTE = {
    title: '🌉 A crossing, iced over',
    body: 'A line of numbered stones runs out across the frozen channel — but past the middle they seem to count ' +
      'into numbers <i>smaller than nothing</i>, and the ice there is too thin to cross just yet.<br><br>' +
      'A grown-up can open <b>negative numbers</b> for you in 👪 <b>Parent Settings</b> — and then the whole crossing, ' +
      'east of zero and west of it, is yours to walk.',
  };

  // ===== Wave 24 (Looking Glass P4 — the finale): the Vantage =====
  // The completed spiral (the capstone reveal) + a tight Carroll wonder cast.
  // ALL of it is WONDER — look, never test; no quiz ever fires from any of
  // this. Read only inMirror() (js/engine.js E.vantageDoor gates entry).

  // A REAL string transform: mirror-writing. A mirror reverses left-right, so
  // "printed" mirror-writing is each LINE's characters reversed (line order —
  // top to bottom — is untouched, since a vertical mirror doesn't flip that).
  // Pure + involutive: mirrorWrite(mirrorWrite(x)) === x for any line, which
  // is exactly "readable only by reflection" made into a checkable fact.
  MM.data.mirrorWrite = function (text) {
    return text.split('\n').map(line => line.split('').reverse().join('')).join('\n');
  };

  // The Jabberwocky's first stanza (Lewis Carroll, "Through the Looking-Glass",
  // 1871 — public domain), verbatim. Printed on the plaque in mirror-writing;
  // held up to the glass, it reads true.
  MM.data.JABBERWOCKY_TRUE =
    "'Twas brillig, and the slithy toves\n" +
    'Did gyre and gimble in the wabe;\n' +
    'All mimsy were the borogoves,\n' +
    'And the mome raths outgrabe.';
  MM.data.jabberwockyPlaqueText = function () {
    const printed = MM.data.mirrorWrite(MM.data.JABBERWOCKY_TRUE);
    return {
      title: '📜 A plaque, printed backwards',
      body: 'Carved into the stone, every line runs the wrong way — as if the mason copied it straight out of a ' +
        `mirror:<br><br><span style="font-family:monospace">${printed.replace(/\n/g, '<br>')}</span><br><br>` +
        `Nonsense, read straight on. But you happen to be standing in front of a looking glass — so you hold the ` +
        `plaque up to it, and the backwards words turn frontwards:<br><br>` +
        `<i>${MM.data.JABBERWOCKY_TRUE.replace(/\n/g, '<br>')}</i><br><br>` +
        `<span class="dim">It still doesn't mean anything. It means it PERFECTLY, though — that's the trick of a ` +
        `good nonsense poem, and an even better mirror.</span>`,
    };
  };

  // P4.1 — THE COMPLETED SPIRAL. The capstone: the whole game built to "the
  // kingdom was a spiral all along" (the ending's own reveal); the mirror's
  // revelation is that the spiral was only HALF the figure. Sincere register
  // (STORY_BIBLE hard rule 4 — endings stay sincere; no jokes here).
  MM.data.VANTAGE_ENTER_LINE =
    '🌀 A quiet plaza, laid out like the Turning Stones back home — but the glass has been at work on it.';
  MM.data.COMPLETED_SPIRAL_REVEAL =
    'From here, the plaza looks like it always has — the old stones, curling out from the center, one for every ' +
    'tangle you ever set right. <b>1, 1, 2, 3, 5, 8, 13.</b><br><br>' +
    'But the glass does what glasses do here. Look again, and a <b>second</b> curl grows out from that very same ' +
    'center stone — the same shape exactly, turning the <b>other</b> way, coiling out through the mirror instead of ' +
    'into it.<br><br>' +
    'Numeria told you once that the kingdom was a spiral all along. It undersold itself. <b>The kingdom was only ' +
    'half the spiral.</b> And its reflection was the other half all along — joined at the one stone that never ' +
    'moved, the two of them making a single, complete, <b>symmetric</b> whole.<br><br>' +
    '<i>Zero was never an ending. It was always the middle.</i>';
  MM.data.COMPLETED_SPIRAL_AGAIN =
    'The two curls still meet at the center stone, turning opposite ways, same as always.<br><br>' +
    '<i>Half of a whole is still whole — you only ever needed to know to look for the other half.</i>';

  // P4.2 — the Carroll wonder cast. Bounded pools, deadpan/warm register,
  // jokes always on the world (Carroll's own characters), never the kid.
  // The White Queen: lives backwards, and recites the number-line as a house
  // rule. The "jam" line is Carroll verbatim; the number-line gloss is ours.
  MM.data.WHITE_QUEEN_LINES = [
    '"The rule is, jam to-morrow and jam yesterday — but never jam to-day," the White Queen says, with the total ' +
    'serenity of someone who has never once been surprised by a Tuesday. "It\'s a simple enough rule, dear. ' +
    'To-day is the zero. Yesterday was <b>−1</b>. To-morrow is <b>+1</b>. Jam simply prefers to keep its distance."',
    '"I remember it perfectly — you\'re about to ask me what day it is." She says this before you\'ve so much as ' +
    'opened your mouth, looking rather pleased with her own foresight. "Memory works both ways, through the glass. ' +
    'It\'s only a shame it never works <i>usefully</i> both ways."',
    '"Living backwards does take practice," the White Queen admits, pouring a cup of tea that will, any moment ' +
    'now, become full. "One finds the twinges before the pin, and the crying before the pricked finger. ' +
    'One gets almost used to it. Chess helps — a pawn always knows it\'s walking toward being a queen, even before ' +
    'it\'s walked a single square."',
  ];
  // Humpty Dumpty: the contrarian rules-explainer. "When I use a word" is
  // Carroll verbatim; the "less than nothing" bluster is ours, in his voice.
  MM.data.HUMPTY_LINES = [
    '"When I use a word," Humpty Dumpty announces, before you\'ve said a single one, "it means just what I choose ' +
    'it to mean — neither more nor less." He settles, precariously, on his wall. "Take \'less than nothing.\' Most ' +
    'people act as though that\'s nonsense. I\'ve <b>decided</b> it isn\'t. So it isn\'t. That\'s really all there is to it."',
    '"The question is," he says, glowering down at a number line only he appears to be able to see, "which is to be ' +
    'master — the number, or you?" He does not wait for an answer. He is fairly confident he already knows it.',
  ];
  // The Mad Tea-Party: frozen at always-six-o'clock — a cozy, stakes-free
  // rest spot, an ANTI-timer (funny BECAUSE nothing is rushed). NO time
  // state anywhere near this — it is exactly as frozen as it claims to be.
  MM.data.TEAPARTY_LINE =
    '🕕 The table is set for a great many more guests than are sitting at it, and every single teacup is exactly ' +
    'half full. Nobody here is in any hurry — nobody here has <b>ever</b> been in any hurry.<br><br>' +
    '"It\'s always six o\'clock," the March Hare explains, topping up a cup that was never emptied. "There\'s no ' +
    'time to wash the things between courses, you understand — so we simply don\'t, and there\'s no time, and ' +
    'so we simply don\'t, and — well. You see how it goes. Round and round, like the nicest kind of spiral."<br><br>' +
    '<span class="dim">Sit as long as you like. The tea stays exactly this warm, forever.</span>';

  // P2.1 — reversed NPC greetings (a curated, occasional aside, not every
  // line — see js/engine.js E.MIRROR_GREETING_CHANCE). {name} is the NPC's
  // plain name, no emoji.
  MM.data.MIRROR_GREETINGS = [
    '"Goodbye!" {name} says warmly, tipping a hat the moment they see you. "Lovely running into you first thing." The mirror has never once said hello when it could say goodbye instead.',
    '"Farewell, dear!" {name} calls out the moment you arrive. "So glad you\'re—" a pause, a small frown. "I\'ve just wished someone well on a trip they haven\'t taken yet. This kingdom does that to a person."',
  ];
  MM.data.mirrorGreeting = function (npcName, idx) {
    const pool = MM.data.MIRROR_GREETINGS;
    return pool[((idx % pool.length) + pool.length) % pool.length].replace(/\{name\}/g, npcName);
  };

  // P2.1 — reflected-monster enter-flavor (battle.js B.start), general and
  // non-negative, same idiom as the golem battle cries.
  MM.data.MIRROR_ENTER_LINES = [
    'It looks at you exactly the way you\'re looking at it. Neither of you blinks first.',
    'Somewhere, right now, its ordinary twin has no idea any of this is happening.',
    'It already knows how this ends. It came anyway — that\'s either very brave or very silly.',
    'It tilts its head. You tilt yours. Neither of you meant to.',
  ];

  // P2.3 — "Recognize": the mirror reflavor of the Soothe victory line. Same
  // physical settling (MM.data.sootheLine is reused, unchanged) — only the
  // FRAMING differs, and it differs by whether this KIND was already
  // befriended (a reunion) or not (met for the first time, in this
  // reflection). Mechanic is identical either way (js/engine.js E.grantVictory).
  MM.data.RECOGNIZE_REUNION_LINES = [
    'You know this one.',
    'Oh — it\'s you.',
    'You\'d know that shape anywhere.',
    'The reflection remembers you remembering it.',
  ];
  MM.data.RECOGNIZE_NEW_LINES = [
    'You don\'t know this one yet. You will.',
    'A stranger\'s reflection is still, somehow, a little familiar.',
    'Not one you\'ve met. Not one who stays a stranger for long, either.',
  ];
  MM.data.recognizeLine = function (mon, alreadyKnown) {
    const base = MM.data.sootheLine(mon); // the settling itself never changes
    const pool = alreadyKnown ? MM.data.RECOGNIZE_REUNION_LINES : MM.data.RECOGNIZE_NEW_LINES;
    return `${MM.data.pick(pool)} ${base}`;
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
  // v1.7.0 (a kid's own report, 2026-07-13: "the daily-only cat taught me to
  // stop checking"): the +1 stamina pat stays once/day (it's the economy),
  // but every OTHER inn visit still finds the cat doing something — pure
  // delight, no reward, so there is always a reason to look in on her.
  MM.data.CAT_MOMENTS = [
    'The inn cat is asleep directly on top of the guest ledger, pinning three unanswered reservations under one paw. <i>"She outranks me,"</i> the innkeeper says, and does not move her.',
    'Someone has left a basket by the hearth, and the inn cat is curled in the middle of what may or may not be four kittens. <i>"The census is inconclusive,"</i> the innkeeper reports. <i>"She keeps rearranging them."</i>',
    'A crate arrived this morning, already emptied — and the inn cat has wedged herself into it anyway, several sizes too small, looking extremely satisfied about it.',
    'The inn cat sits square in front of the hearth, watching the fire the way some people watch a good story — utterly absorbed, tail twitching at the good parts.',
    'The inn cat has claimed the warm-up slate as a cushion. The innkeeper gently slides your first question out from under her; she does not wake, and does not stop purring.',
    'The inn cat looks directly at you, decides you are not, at this time, interesting, and returns to staring at the middle distance with tremendous dignity.',
  ];
  // ~30% of non-pat visits also end with the door escort, appended to
  // whichever moment fired above.
  MM.data.CAT_ESCORT_LINE = 'As you head off to bed, the inn cat trots you to the door — tail up like a flag — and peels off the moment you\'re through it, mission apparently accomplished.';
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

  // v1.7.0: Miscount's Tales of the Guessing Years — post-ending Academy
  // visits only (pre-ending he is still tender about it), shown occasionally
  // before the day's slates. TONE RULE: the comedy is SELF-TOLD — only
  // Miscount laughs at his own guessing years; nobody else may, and it never
  // mocks guessers-in-general. Prose is user-approved verbatim; do not edit.
  MM.data.MISCOUNT_GUESS_TALES = [
    '"I once answered \'seven\' to everything for a full week. It worked twice." He holds up two fingers. "That was the worst part. It working twice. That\'s the whole trap, you see — a guess pays just often enough."',
    '"I told the king the new bridge wanted \'about a hundred\' planks. It wanted forty. We had a very tall bonfire that winter, and a very cross carpenter."',
    '"I guessed a soup once. Doubled the salt because it felt right." He shudders, with respect. "That soup could have stood sentry duty."',
    '"I called the stars \'roughly a thousand.\' Sylvia has been counting the ones I missed ever since. She sends me the number every winter. It has five digits, and it grows."',
  ];

  // v1.7.0: rare golem battle cries — the comedy register of the guessing-
  // years tales above (golems ARE Miscount's old homework, canonically), so
  // the joke lands on the golem's past, never the kid. Bosses never use
  // these — bosses stay sincere.
  MM.data.GOLEM_BATTLE_CRIES = [
    'The golem draws itself up and bellows a number from deep in its stony memory: <b>"SEVEN!"</b> It has no idea why. It has never had any idea why.',
    'Before you can act, the golem roars: <b>"CARRY NOTHING!"</b> — an old, wrong instinct, worn smooth with repetition.',
    'The golem thumps its chest and declares, with total confidence: <b>"IT IS ALWAYS TWELVE!"</b> It is not always twelve.',
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
  // v1.7.0: the tower is now visible on the mainland overworld from a FRESH
  // profile (it always was, technically — 'H' has drawn 'spiralTower'
  // unconditionally since Wave 9 — but this bump line replaces the old
  // "narrow stair, half-built" text with the queue's exact, user-approved
  // line, and gives it a late-game evolution once the courtyard spiral is
  // well underway). UNLOCK TIMING UNCHANGED — endingDone still opens it.
  MM.data.SPIRAL_SEALED = function (s) {
    const deep = !!(s && s.tasksDone && s.tasksDone.length >= 10);
    return 'A door with no keyhole, at the base of a winding tower. Carved above it: the same curling line as the old stones out in the grass. It isn\'t ready. Or you aren\'t. Hard to say which.' +
      (deep ? ' <span class="dim">The carving seems deeper lately.</span>' : '');
  };
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
  // ---------- Wave 12 (P3): the Workshop Wing ----------
  // STANDING RULES (permanent): a joke is an observation, never an obstacle;
  // comedy channels are field/glyph/sound/modal, never the log alone;
  // worked math stays plain; the kid is never the punchline.
  // Portraits hang in the hall, keyed by sorted (y,x) position — bump one to
  // hear its MathMaker. Exactly ONE (Ondine) is gently wrong about math
  // history, and the portrait hung beside her shushes her.
  MM.data.WING_PORTRAITS = [
    { name: '🖼 Grumbold the Third, MathMaker',
      line: '"The cracked floors were MY idea. A floor that holds you exactly once teaches you to plan your route — and the cellar is lovely this time of year. I kept snacks down there."' },
    { name: '🖼 Ondine the Radiant, MathMaker',
      line: '"I invented zero, you know. Right here in this hall, on a Tuesday. Before me, people simply left a gap and felt uneasy about it."' },
    { name: '🖼 Hesper the Thorough, MathMaker',
      line: '"Pay no mind to Ondine, dear — <b>zero is centuries older than any of us</b>, and she knows it perfectly well. She DID invent the soup spoon with the ruler on the handle, which I grant is nearly as useful."' },
    { name: '🖼 MathMaker Wren',
      line: '"Be kind to my Numberlings. I carved the sockets to accept <b>every true filling</b> — there is never only one right way to make a number, and I will not have my own floor pretending otherwise."' },
    { name: '🖼 Brightwell the Unblinking, MathMaker',
      line: '"No arithmetic in my armory. Just one lamp, some very polished shields, and the fact — the FACT — that light always knows where it is going. Help it around the corners."' },
    { name: '🖼 MathMaker Petronella',
      line: '"The statues are of my own cats, none of whom would sit still for the sculptor. He worked from memory and fear. Turn them toward the fountain — they always did love watching the fish."' },
    { name: '🖼 Bartleby the Ample, MathMaker',
      line: '"A proving room can also be a pantry. Nobody proves anything on an empty stomach. The cheese is for whoever works the shelves — it has always been cheese, and it always will be."' },
    { name: '🖼 MathMaker Milla',
      line: '"Weight is honest. A plate does not care how clever you are — it cares whether something is standing on it. Remember that. It comes up more often than you would think."' },
  ];
  // Room plaques, keyed 'x,y' of their 'i' tile on the WING map.
  MM.data.WING_PLAQUES = {
    '5,9': { title: '📜 The Proving Room of Grumbold the Third',
      body: '"The floor ahead holds a hero exactly <b>once</b>. Cross wisely — and if you fall, enjoy the cellar. The ladder brings you home."' },
    '18,9': { title: "📜 MathMaker Wren's Numberlings",
      body: 'Carved deep beneath the signature: <b>▢ × ▢ = 24</b>.<br><br>"Push any two Numberlings into the sockets to make it TRUE. Every true answer opens the floor — there is never only one."' },
    '31,9': { title: '📜 The Armory of Brightwell the Unblinking',
      body: '"No sums here. Turn the shield-stands until the lamp\'s beam finds the dark crystal. Light knows the way; help it around the corners."' },
    '5,13': { title: "📜 MathMaker Petronella's Garden of Cats",
      body: '"Turn my cats to face the fish fountain — <b>all</b> of them. They will pretend not to care. They care enormously."' },
    '18,13': { title: "📜 Bartleby's Pantry",
      body: '"Mostly a pantry, I admit. But mind the counterweight gate: it opens only while something <b>heavy</b> rests on the pressure plate. The slab will do nicely. The cheese is real."' },
    '31,13': { title: "📜 MathMaker Milla's Plate Room",
      body: '"A pressure plate holds this floor\'s gates open only <b>while</b> it is held down — step off, and they fall shut. A pushed slab holds a plate as long as you leave it there. Any plate will do; they share the load."' },
    // Wave 13 (P1): the Echo Annex, down the shaft off the far room.
    '32,24': { title: '📜 The Echo Annex',
      body: 'Carved small and neat, low on the wall:<br><br>"The violet plate remembers your last <b>twelve steps</b>. Stand on it, and the Understudy performs them — from the plate, to the letter, and not one step more. Walk the route you want copied, take a bow, and step on.<br><br>— MathMaker Tallis, who could never be in two places at once. Until she could."' },
  };
  // The wardrobe: an obvious mimic with a terrible tell (bobs when you are
  // FAR, dead still when adjacent). Three bumps and it comes clean.
  MM.data.WING_WARDROBE_BUMPS = [
    { title: '🚪 A wardrobe', body: 'It is a perfectly ordinary wardrobe. It is standing very, very still — <i>almost aggressively still</i>.<br><br>When you are close, it does not move at all. Not even a little. That, somehow, is the strange part.' },
    { title: '🚪 The same wardrobe', body: 'The wardrobe is sweating.<br><br><i>Wardrobes do not sweat.</i>' },
  ];
  MM.data.WING_WARDROBE_CONFESSION = {
    title: '🚪 The wardrobe gives up',
    body: '"<b>ALL RIGHT,</b>" says the wardrobe, in a voice like a hinge that has spent years practicing not to creak. "I am not a wardrobe. I have never been a wardrobe. I have been pretending to be furniture for <b>forty years</b>, and I would like to say: it is <i>exhausting</i>. The standing still. The dust. A moth lived in me for a while. I let it. That is how committed I was."<br><br><i>It sighs, hugely, from somewhere behind its own doors.</i><br><br>"You knocked three times. Politely. Nobody has ever knocked. So — I resign. From furniture." A pause. "May I live in the Study? It looks warm, and the slime seems like good company."<br><br><i>It relocates before you can answer, at a pace no wardrobe should be capable of. It has, from somewhere, produced a tiny hat.</i>',
  };
  MM.data.WING_WARDROBE_HOME = 'The wardrobe stands in the Study\'s corner, wearing its tiny hat at what can only be called a jaunty angle. It is not pretending to be anything anymore.<br><br>Now and then its doors open a crack to watch the slates being marked. <i>The enrolled slime waves at it. It waves a door back.</i>';

  // ===== Wave 18: "Choose Your Hero" (the avatar picker) =====
  // Purely cosmetic. Every joke lands on the WORLD (the courtyard, the
  // chickens, the ledgers, the glass) — NEVER on the kid or the choice. Every
  // form is treated as an unimpeachably excellent decision. The human forms
  // stay neutral: they ARE the kid, so no world-reaction line fires for them.
  MM.data.AVATAR = {
    // signage shown atop every picker
    pickerHeading: 'Choose your hero',
    pickerHint: 'Pick any look — you can change it any time, so there is no wrong choice and no rush.',
    swatchLabels: { F: 'Skin', P: 'Hair', A: 'Outfit' },
    // the deadpan Looking Glass (Bag, from day one)
    lookingGlass: {
      title: '🔍 The Looking Glass',
      intro: 'A plain glass in a plain frame. It shows you whoever you are today — and is quietly certain you have always been exactly this.',
      reflect: {
        dragon: 'The glass shows you as a dragon. As far as the glass is concerned, you have always been a dragon. The glass is not a reliable historian.',
        fox: 'The glass shows you as a fox. It nods, confirming something it clearly knew all along. It knew nothing. It is a glass.',
        slug: 'The glass shows you as a slug. It regards this with total, unshakeable respect. The glass has excellent judgment and no memory whatsoever.',
        woman: 'The glass shows you as you. It always does — that is the one thing it is truly good at.',
        man: 'The glass shows you as you. It always does — that is the one thing it is truly good at.',
        knight: 'The glass shows you in your old armor, fitting exactly as it always did. Some things a glass gets right.',
      },
    },
    // the Study wardrobe — the deluxe post-ending front-end (it resigned from
    // being furniture, so it deeply understands choosing a form)
    wardrobe: {
      title: '🚪 The Wardrobe',
      intro: 'The wardrobe\'s doors swing wide, in the manner of a thing delighted to help. "Ah — choosing a form again. I understand the impulse <i>deeply.</i> I once chose \'not a wardrobe.\' Best decision of my life." <i>Its tiny hat sits at a jaunty angle.</i> "So. Who would you like to be today?"',
      done: 'The wardrobe closes its doors with immense satisfaction. "Wonderful. Wear it as long as it suits you — and not one moment longer."',
    },
    // the world reacts to a novel hero, deadpan — one SHARED pool per non-human
    // form, fired only at the change (a kid-initiated beat, never the log). The
    // reaction is admiring, never mocking: the new hero is running the kingdom.
    worldReaction: {
      dragon: [
        'There is a dragon in the courtyard. It appears to be running the kingdom. Nobody is discussing this.',
        'A dragon now keeps the kingdom\'s ledgers. They have never been so neat, nor so faintly warm to the touch.',
      ],
      fox: [
        'A fox is doing the kingdom\'s sums. The chickens have filed no complaint. The chickens are, if anything, impressed.',
        'The fox has taken up the crown\'s work and is extremely good at it, and only a little smug about the tail.',
      ],
      slug: [
        'A slug is now in charge of the numbers. It is unhurried. It is, in fact, magnificently unhurried — and every sum is flawless.',
        'There is a slug at the head of the kingdom. It arrives everywhere precisely when it means to. The math is impeccable.',
      ],
    },
    // the pet's double-take (E.petEmote fires the 🤔 glyph in the field; this is
    // the one line, shown in the change beat — never the log)
    petDoubleTake: 'Your pet looks at you. Then at itself. Then at you again. It decides, generously, to allow it.',
  };

  // ===== Wave 14 (P1-P3): "The Court" — holding audiences in the throne room =====
  // Post-ending, renewable, combat-free. The Herald ('Z' in the CASTLE map,
  // an NPCS entry that dispatches to E.holdCourt) opens a day-keyed queue of
  // three CASES. Each case = a petitioner + an absurd complaint (the comedy)
  // wrapping ONE applied problem (the math, kept plain — see LEVEL2_SPEC tone
  // guide). A correct ruling SETTLES the dispute and records the answer under
  // its REAL skill; a wrong ruling leaves the court politely baffled and
  // RE-ASKS — never a scold, never a loss (the gentle-failure rule).
  //
  // The four applied strands each record to their genuine mastery skill (the
  // pedagogical point — distributed applied review the report card shows):
  //   fair-division / sharing  -> fractions_as
  //   scaling a recipe or wage -> multidigit_mult
  //   miscounted market money  -> decimals_md
  //   measuring field / banner -> word_problems (area)
  // A case's complaint is written skill-AGNOSTIC on purpose (it bridges to
  // "the clerk has set it down as this sum:" then the generated problem), so
  // any of the four generators can sit under any frame without a mismatch.
  MM.data.COURT = {
    herald: {
      name: '📯 Herald Pomfrey',
      // Bump post-ending, court has petitioners waiting:
      open: 'The Herald unrolls a scroll rather longer than the Herald. "The court is in session, MathMaker! Today\'s petitioners are waiting — each with a dispute that only good arithmetic can settle." <i>He beams. He loves this part.</i>',
      // Bump pre-ending — a gentle "not yet", mirroring the throne's own line:
      notYet: 'The Herald bows very low. "Forgive me — the court cannot sit until the crown is truly yours. <b>Not yet.</b> But come that day, I shall have petitioners lined clear to the door." <i>He appears to have a scroll ready already, just in case.</i>',
      // Every case heard today — a full session done:
      quiet: 'The Herald gestures at a pleasantly empty hall. "Every dispute settled, every petitioner sent home content. The court is quiet." He rolls his scroll back up. "Fresh grievances tend to arrive by morning. They always do."',
    },
    // A full 3/3 session — worldBurst + fanfare + this line (the "when it's
    // earned, show it" rule from v1.7.8).
    sessionCelebration: 'The last petitioner bows out, thoroughly satisfied. The hall empties warm and content, and somewhere a clerk brings down a very final-sounding stamp.<br><br><b>A full day\'s court, fairly judged. The kingdom sleeps easier for it.</b>',
    // A wrong ruling — the comedy lands on the COURT (never the kid), which
    // is baffled, re-explains, and re-asks. Never a scold, never a loss.
    baffled: [
      'The whole court frowns as one and quietly recounts on its fingers. The Herald clears his throat and reads the dispute out once more, slowly, in case the acoustics were to blame.',
      'A confused murmur runs the length of the hall. Someone at the back says "surely not" with great feeling. The petitioner, entirely unbothered, lays the matter out again from the top.',
      'The court blinks in unison. A clerk crosses something out, then un-crosses it. "Let us hear it once more," the Herald suggests warmly. "These things are worth getting right."',
    ],
    // Gratitude gifts: a grateful petitioner presses something small on you.
    giftLine: 'The petitioner presses a small token of thanks into your hands',
    // Authored petitioner frames, keyed by skill. complaint = the comedy;
    // settle = the warm resolution on a correct ruling (deliberately never
    // hard-codes a number, so it fits any generated answer).
    cases: {
      fractions_as: [
        { petitioner: '🐺 Sir Aldric', complaint: 'Sir Aldric, Knight of the Unfinished Pie, demands to know EXACTLY how much pie remains after the feast — "a matter of honor, and also of second helpings." The clerk has set the dispute down as this sum:', settle: 'The court rules, and the fractions agree. Sir Aldric salutes you gravely, thanks the bench, and returns at once to the pie in question.' },
        { petitioner: '🟢 Two Slimes', complaint: 'Two slimes have found one cake and cannot agree how to divide it without either slime feeling wronged. "We are FRIENDS," they insist, wetly, "which is precisely why it must be exactly fair." It comes to this:', settle: 'The court divides it true. Both slimes wobble with relief, share the cake, and — briefly, movingly — share a single hat.' },
      ],
      multidigit_mult: [
        { petitioner: '👩‍🍳 Cook Bramble', complaint: 'Cook Bramble is scaling a recipe up for the whole garrison and is, in her words, "one wrong number away from a disaster with a NAME." She needs the total worked out before she starts cracking eggs:', settle: 'The court multiplies it out; the kitchen is saved. Cook Bramble exhales, and a dish that was very nearly called "Regret Soup" is called dinner instead.' },
        { petitioner: '💀 the Payroll Skeleton', complaint: 'The castle\'s payroll skeleton must pay every guard the very same wage, and keeps arriving at a figure that "rattles it — and it is ALREADY mostly rattle." Settle the total:', settle: 'The court works the multiplication clean; the wages balance to the coin. The skeleton clacks in gratitude and files the scroll under D, for Done.' },
      ],
      decimals_md: [
        { petitioner: '🧙 Wizard Fennemore', complaint: 'Wizard Fennemore bought supplies at market, paid with one enormous coin, and is CONVINCED the merchant shorted his change. "I am never wrong about money. I am occasionally wrong about everything else." The change should come to:', settle: 'The court counts the coins to the last penny. Fennemore is, this once, entirely correct — and delighted to be so, loudly, in front of witnesses.' },
        { petitioner: '🐹 Merchant Pib', complaint: 'Merchant Pib swears his till came up short today and cannot find where, and has begun to suspect the till itself of wrongdoing. He lays out the day\'s takings and asks the court for the true change owed:', settle: 'The court tallies it exactly; the till balances after all. Pib apologizes to the till, very quietly, when he believes no one is watching.' },
      ],
      word_problems: [
        { petitioner: '🚩 Banner-Master Ogg', complaint: 'Banner-Master Ogg must hang a banner the length of the great hall and needs its area settled before he cuts the cloth — "measure once, cut once, or explain yourself to the seamstress, and I would sooner measure." He offers his figures:', settle: 'The court measures true; Ogg marks his cloth with enormous satisfaction. The banner will fit. It always should have.' },
        { petitioner: '🐐 Farmer Thorne', complaint: 'Farmer Thorne is fencing a field while two goats "supervise, unhelpfully." He needs the measurement settled before the goats invent a shortcut through it:', settle: 'The court works the measurement out; the fence goes up square and true. The goats look personally betrayed. Farmer Thorne has never been happier.' },
      ],
    },
    // The running gag: a very small, very serious recurring petitioner who
    // returns every session with an escalating, impeccably-polite grievance.
    // Takes the WEAKEST of the four skills each day (so the court's rustiest
    // topic always gets practiced, wrapped in the joke). Grievances escalate
    // by s.magistrateVisits, then hold at the last one.
    magistrate: {
      name: '⚖️ Magistrate Tuppence',
      // shown as the case's petitioner label; the intro flavor is folded into
      // each grievance's complaint so a returning kid always gets the escalation
      grievances: [
        'A very small, very serious creature — a tortoise in a judicial wig two sizes too grand — approaches the bench. This is Magistrate Tuppence. It wishes it FORMALLY NOTED that a neighbor\'s hedge has crept onto its path, and requires the court settle the precise figure of the encroachment "before, and I quote, it gets ANY worse." The clerk\'s sum:',
        'Magistrate Tuppence returns, wig freshly powdered, to report that a market stall sold it a wheel of cheese of "allegedly standard size." It demands the court verify the exact amount, on principle. "I trust no one. I find it restful." The figures await:',
        'Magistrate Tuppence has escalated. It now wishes to sue the SUN, for "rising eleven minutes early and disrupting a scheduled nap," and requires the court to settle the total figure of the claim. It is entirely serious, and has brought its own tiny gavel. The clerk\'s sum:',
        'Magistrate Tuppence, having lost narrowly to the sun on a technicality, brings a fresh grievance concerning the garden committee\'s shared radish budget — of which committee it has quietly appointed itself all seven members. It requires the exact figure settled, on behalf of all seven of itself. The clerk\'s sum:',
      ],
      // settle escalation matches grievance index (holds at the last). Kept
      // quantity-AGNOSTIC (v1.10.0 review fix): the Magistrate carries the
      // WEAKEST skill each day, so a settle must fit any generated answer —
      // no "to the fraction"/"to the decimal" that presumes a skill.
      settles: [
        'The court settles the figure exactly, down to the last unit. Magistrate Tuppence bows a slow, satisfied bow. "Justice," it declares, "is merely arithmetic in a good robe." <i>It will be back.</i>',
        'The court settles it precisely — not a unit over, not a unit under. The Magistrate produces a tiny stamp, stamps its own hand entirely by accident, and departs with its dignity fully intact. <i>It will be back.</i>',
        'The court works the total with a perfectly straight face. Magistrate Tuppence nods, vindicated, and immediately files a fresh suit against the moon, on general principle. <i>It will, inevitably, be back.</i>',
        'The court settles the figure, fair and final. The Magistrate accepts the ruling personally, thanks the bench on behalf of all seven of itself, and withdraws in good order. <i>It will be back. It is always back.</i>',
      ],
    },
  };

  // ===== Wave 15: "The Parlor" — the card game "Tiny Hats" =====
  // Post-ending, combat-free (the monsters are on CARDS, never hit), no timers.
  // A becalmed monster deals; play is compare-and-capture; a lost match is
  // "good game — again?", never a scold, never a real loss. Comedy lands on the
  // cards and the courteous opponents, never the kid. Every card wears (or can
  // earn) a tiny hat. The math is the play: reading which edge is bigger, and
  // totting up the running tally — no quiz is ever bolted on.
  MM.data.PARLOR = {
    dealer: {
      name: '🎩 Deuce the Dealer',
      // Bump the parlor DOOR pre-ending — a gentle "not yet" (the room is a
      // reward for a finished kingdom, like the Wing and the Court).
      notYet: 'A curtained archway, warm light behind it, and a hand-lettered sign: <b>THE PARLOR — members only.</b><br><br>Under it, smaller: <i>Membership: one (1) finished kingdom. You\'re nearly there.</i>',
      // First time in, the dealer introduces the house (once ever).
      intro: 'A Skeleton in an improbably tiny top hat looks up from a green felt table, mid-shuffle. It has, it must be said, EXCELLENT hands for shuffling — being, as it is, mostly hands.<br><br>"Welcome, welcome! I\'m <b>Deuce</b>. This is the Parlor. We play <b>Tiny Hats</b> — you place a card, I place a card, and whoever\'s number is bigger takes the neighbor." It fans a deck like a magician. "Every card is somebody you\'ve met. No fighting in here — we settled all that. Now we just play. Care for a round?"',
      // The hub menu blurb (returning visits).
      hub: 'Deuce sets out the felt and taps the deck twice, for luck it does not believe in. "Same rules, always: bigger edge takes the neighbor, most squares wins, and losing costs you nothing but a rematch." <i>Its tiny hat is, as ever, immaculate.</i>',
      // Bump the dealer once you\'re a member but haven\'t met it yet is handled
      // by intro; this is the everyday greeting.
    },
    // The parlor room's arrival line.
    enterLine: '🎩 <b>The Parlor.</b> Green felt, warm lamps, and a faint permanent smell of card. Somewhere, someone is losing very graciously.',
    // Match result lines (never a scold on a loss — "good game, again?").
    winLines: [
      'A clean win! Deuce sweeps the felt, entirely delighted to have lost. "Beautifully counted. Beautifully."',
      'The last square flips your way and Deuce applauds with a sound like a xylophone falling downstairs. "Well PLAYED."',
      'You take the board. Deuce doffs its tiny hat, revealing a slightly smaller tiny hat underneath. "The student becomes the dealer. Almost."',
    ],
    lossLines: [
      '"Good game — again?" Deuce is already reshuffling. Nothing is lost here but the round; the felt forgets instantly, and so should you.',
      'Deuce edges you out on the last square, and immediately looks a little sorry about it. "Rematch? I insist. I\'ll even use my worse cards." <i>It will not use its worse cards. But it means well.</i>',
      '"So close! One bigger number and it was yours." Deuce fans a fresh hand. "Good news: the deck is free and the night is long."',
    ],
    tieLines: [
      'Dead even, square for square. Deuce studies the board with enormous respect. "A draw. Rare as a polite dragon. Shall we break the tie?"',
    ],
    // Winning sometimes yields the opponent's card into your collection.
    cardWon: 'Deuce slides one of its own cards across the felt with a little bow. "Yours. It\'s been wanting a hat anyway." <b>A new card joins your collection.</b>',
    // The courteous trash-talk pool (opponents are unfailingly polite — the
    // joke is the courtesy, never anything aimed at the kid).
    trashTalk: [
      '"I have been practicing. I lost anyway. But I practiced."',
      '"A bold placement. I respect it enormously. I am also about to take three of your cards."',
      '"No pressure. There is never any pressure here. That is rather the point."',
      '"My grandmother taught me this game. She cheated. I do not. It shows, frankly."',
      '"I brought my second-best cards, out of politeness. You are welcome."',
      '"If I win, I shall be gracious. If you win, I shall be gracious AND take notes."',
      '"That corner is mine now. I\'ve grown attached. We\'ve been through a lot, this turn and I."',
      '"Bigger number, bigger number… ah. Yours. Well played, genuinely, ugh."',
    ],
    // The card album (reuses the Monster Book idiom).
    album: {
      title: '🃏 Your Card Collection',
      empty: 'No trophies yet — win a match and Deuce sometimes parts with one of its own cards. That\'s the collection: cards you\'ve <i>beaten</i>, each in a tiny hat of its own.',
      intro: 'Cards you\'ve won across the felt, each retired here in a tiny hat. Deuce keeps a very similar shelf. Deuce\'s is longer. For now.',
      countLine: n => `<b>${n}</b> card${n === 1 ? '' : 's'} won and hatted.`,
    },
    // The Games Den side-table: "reach 20, don't go over."
    dice: {
      title: '🎲 The Side-Table — "Reach 20"',
      intro: 'A small felt table with two dice and a bowl of tokens. "Roll, add it up, stop when you like," says the croupier — a Slime in a visor. "Land on twenty exactly and the bowl is yours. Go over and you just… don\'t. No harm in it." <i>It nudges the bowl encouragingly.</i>',
      prompt: 'Your running total is your call — roll again, or hold. Twenty is the target; over twenty is a bust (costs you nothing).',
      bust: 'Over twenty! The visored Slime tips an imaginary hat. "The dice giveth. Rounds are free — go again?"',
      jackpotLine: 'TWENTY on the nose! The bowl slides your way with great ceremony.',
      holdLine: total => `You hold at <b>${total}</b>. A tidy number, well counted.`,
    },
    // The token shop — cosmetic ONLY (card-backs / a hat for your favorite
    // card). Tokens, never gold; never real-money framing; losing costs zero.
    shop: {
      title: '🪙 Token Table',
      intro: 'Tokens buy nothing that helps you win — Deuce is very firm about that. "Where\'s the fun in BUYING an advantage? No, no. Tokens are for looking good." What\'s on offer is purely for show:',
      backLine: 'A fresh card-back — purely how your deck looks across the felt.',
      hatLine: 'A tiny hat for your favorite card — because of course.',
      bought: name => `Deuce wraps it in tissue it produced from nowhere. "<b>${name}</b> — excellent taste." <i>Purely cosmetic. Purely wonderful.</i>`,
      cantAfford: 'Not enough tokens yet — but the felt is free, and tokens come with playing. No rush; nothing here expires.',
    },
    backs: [
      { id: 'default', name: 'House Blue', price: 0 },
      { id: 'star', name: 'Starfield Back', price: 6 },
      { id: 'spiral', name: 'Golden Spiral Back', price: 10 },
      { id: 'felt', name: 'Green-Felt Back', price: 8 },
    ],
  };

  // ===== Wave 14 (P2): the Faculty — the connective thread =====
  // As the kid teaches, the castle visibly fills with reformed monsters who
  // take up posts. Records nothing, gates nothing — a pure cumulative reward
  // (Suikoden's beloved filling-castle, "teachers multiply" made literal).
  // Drawn as OVERLAY sprites in the castle (ui.js), not grid glyphs, so no
  // new tile alphabet is needed; each stands on plain throne-room floor and
  // is bump-blocked for its one line (E.facultyAt / the castle tryMove).
  //
  // ── THE EXTENSION POINT (later castle waves depend on this) ──
  // The Parlor / Kitchen-Garden / Menagerie waves ADD their own posts by
  // APPENDING an entry to this list — nothing else changes. Each post is:
  //   { id, title, sprite, pal, badge, x, y, earned(state), line, spawnLine }
  // • id        unique string, stored in s.faculty once claimed
  // • sprite    any MM.sprites monster sprite; pal optional palette swap
  // • badge     an emoji drawn over the sprite (the post's insignia)
  // • x,y       a free floor tile in the CASTLE map to stand on
  // • earned    (state) => bool — the milestone. Wave A checks court sessions;
  //             later waves check THEIR OWN counters (games played, dishes
  //             cooked, kinds tended). E.checkFaculty iterates every post and
  //             claims any whose earned() is true — so a new wave's post just
  //             needs its own counter and predicate, no rework here.
  // • line      the bump-line (authored); spawnLine announces the claim.
  MM.data.FACULTY_POSTS = [
    {
      id: 'clerk', title: 'Court Clerk', sprite: 'slime',
      pal: { A: '#6a8ac4', a: '#4a6aa0', F: '#dfe8ff' }, badge: '📋', x: 21, y: 3,
      earned: s => (s.courtSessions || 0) >= 1,
      spawnLine: 'Word of your fair rulings travels. A reformed <b>Slime</b> has taken up the post of <b>Court Clerk</b> — and looks thrilled to finally have a desk.',
      line: 'The Court Clerk — once a Slime of no fixed address — sits behind a desk it plainly adores. "I FILE things now," it says, patting a tidy stack of scrolls. "Do you know how good it feels to be organized, after a whole life of just... oozing about?" <i>Its tiny hat sits perfectly level.</i>',
    },
    {
      id: 'bailiff', title: 'Court Bailiff', sprite: 'golem',
      pal: null, badge: '🛡', x: 18, y: 5, earned: s => (s.courtSessions || 0) >= 3,
      spawnLine: 'A reformed <b>Homework Golem</b> has taken up the post of <b>Court Bailiff</b> — it has been practicing standing very straight, and it shows.',
      line: 'The Court Bailiff stands rigidly by the wall, a reformed Homework Golem in a sash. "I keep ORDER," it announces, keeping order over a hall that is already perfectly orderly. "There has not been a single disturbance in this court. I take full credit for that."',
    },
    {
      id: 'recorder', title: 'Court Recorder', sprite: 'ghost',
      pal: null, badge: '📜', x: 22, y: 5, earned: s => (s.courtSessions || 0) >= 6,
      spawnLine: 'A reformed <b>Ghost</b> has drifted in to take up the post of <b>Court Recorder</b> — it says it has "always been good at remembering things," a touch wistfully.',
      line: 'The Court Recorder drifts above its ledger, writing down absolutely everything, including this. "Don\'t mind me," it murmurs, minding all of it. "Someone has to remember how fairly it all went. It went very fairly. I\'m writing THAT down too."',
    },
    // ── later castle waves APPEND their posts below this line ──
    // Wave 15 (P4): the House Dealer. Appended with its OWN earned(state)
    // predicate (games played) — E.checkFaculty claims it with ZERO changes
    // there, exactly the extension the Court built this list for. A reformed
    // Skeleton, visible in the castle once the kid is a parlor regular.
    {
      id: 'dealer', title: 'House Dealer', sprite: 'skeleton',
      pal: { A: '#3a3352', H: '#e0dcd0', F: '#e8c24a' }, badge: '🎩', x: 13, y: 4,
      earned: s => ((s.parlor && s.parlor.games) || 0) >= 3,
      spawnLine: 'Word of the Parlor has reached the castle. A reformed <b>Skeleton</b> — Deuce, of the excellent shuffling hands — has taken up the official post of <b>House Dealer</b>, and looks thrilled to be on the staff.',
      line: 'The House Dealer riffles a deck it does not strictly need to riffle. "I have a POST now," Deuce says, adjusting its tiny hat with evident pride. "A desk, a title, a little brass plate. I used to be a pile of bones in a catacomb. Now I run a card table in a castle." It fans the deck. "Life is mostly a matter of finding the right table."',
    },
    // Wave 16 (P4): the Kitchen Garden's two posts. Appended with their OWN
    // earned(state) predicates (harvests gathered / dishes cooked) — the Wave 14
    // E.checkFaculty loop claims them with ZERO changes there, exactly the
    // extension this list was built for. Reformed monsters, visible in the castle.
    {
      id: 'gardener', title: 'Castle Gardener', sprite: 'rat',
      pal: { A: '#6f8a48', B: '#4f6330', T: '#c7d69a' }, badge: '🌱', x: 20, y: 10,
      earned: s => ((s.garden && s.garden.harvests) || 0) >= 2,
      spawnLine: 'Word of the flourishing rows has spread. A reformed <b>Rat</b> — who once raided the vegetable stores and now grows them — has taken up the post of <b>Castle Gardener</b>, and could not be prouder of its dirt.',
      line: 'The Castle Gardener leans on a hoe with the deep contentment of a creature that has found its calling. "I used to STEAL vegetables," it admits, brushing soil from its paws. "Whole sacks of turnips. Terrible business, and honestly a lot of running." It gestures at the neat rows with the hoe. "Now I grow them in tidy little arrays. Rows and columns. It is the most peaceful thing I have ever done, and nobody chases me anymore."',
    },
    {
      id: 'cook', title: 'Castle Cook', sprite: 'slime',
      pal: { A: '#c46a4a', a: '#a04a2c', F: '#ffe4d0' }, badge: '🍲', x: 22, y: 10,
      earned: s => ((s.garden && s.garden.dishes) || 0) >= 3,
      spawnLine: 'The smell of something wonderful has reached the throne room. A reformed <b>Slime</b> in a tall white toque has taken up the post of <b>Castle Cook</b> — it says running a proper kitchen is "a dream I did not know I was allowed to have."',
      line: 'The Castle Cook adjusts its toque, which is nearly as tall as it is. "A KITCHEN," it says, savoring the word. "With measuring cups. Real ones." It stirs a pot that smells improbably good. "The trick, they tell me, is the fractions. Half of this, three-quarters of that, doubled if company comes." It offers you a spoon. "I got them all wrong at first. Made some truly alarming soups. But nothing was ever wasted — the pet ate every one, bless it."',
    },
    // Wave 17 (P4): the Menagerie's Keeper. Appended with its OWN earned(state)
    // predicate (distinct befriended kinds tended) — the Wave 14 E.checkFaculty
    // loop claims it with ZERO changes there, exactly the extension this list
    // was built for. A reformed Bat, now the gentlest soul on the staff. THIS
    // IS THE LAST FACULTY POST: after it the Faculty is full and the castle is
    // a living place. (Later work should not append below this line.)
    {
      id: 'keeper', title: 'Menagerie Keeper', sprite: 'bat',
      pal: { A: '#7a6f9a', a: '#5a5078', W: '#e6ded0', k: '#2a2438' }, badge: '🐾', x: 21, y: 11,
      earned: s => ((s.menagerie && s.menagerie.kindsTended) || 0) >= 2,
      spawnLine: 'Word of the nursery has reached the throne room. A reformed <b>Bat</b> — who used to swoop at travellers and now swoops at nothing but bedtime — has taken up the post of <b>Menagerie Keeper</b>, and has never in its life been so gently, thoroughly needed.',
      line: 'The Menagerie Keeper hangs contentedly by the door, a reformed Bat with a soft voice and a very organized clipboard. "I KNOW them all now," it says, meaning the creatures in the nursery. "Who likes the sunny patch, who naps at noon, who and who are inseparable and simply must have neighbouring pens." It consults the clipboard, though it plainly has every word by heart. "I used to frighten people for a living. Turns out I am much, much better at tucking them in."',
    },
  ];

  // ===== Wave 16: "The Kitchen Garden" (Castle Expansion Wave C) =====
  // Two paired rooms as one supply chain: a plantable GARDEN (multiplication
  // as an ARRAY you plant) and a KITCHEN (fractions / scaling by measure).
  // Both RECORD to mastery under their real skills. Combat-free (s.monsters =
  // []), no timers, gentle failure (a wrong measure makes a FUNNY dish, never
  // a scold, never a loss). Comedy channels: field / glyph / sound / modal —
  // never the log. All prose below is authored (paste for design review).
  MM.data.GARDEN = {
    // The castle-side door ('K'): a gentle "not yet" pre-ending (like the Wing).
    doorNotYet: 'A green door with a little painted trowel on it, and the warm smell of soil and something cooking beyond. It is locked, for now.<br><br><i>A kingdom has to be set right before its garden can be tended in peace. Not yet.</i>',
    enterLine: '🌱 <b>The Kitchen Garden.</b> Neat rows of soil on one side, a warm little kitchen on the other — and the smell of both drifting together.',
    // The seed bench (bump 'B'): plant a rectangle, count it, harvest it.
    benchTitle: '🌱 The seed bench',
    benchBody: 'Trays of seedlings, a watering can, and a plot of good soil laid out in rows. Plant a patch and the garden will ask you to count it — rows times columns, the honest way.',
    plantPickRows: 'How many <b>rows</b> shall we plant?',
    plantPickCols: rows => `${rows} row${rows === 1 ? '' : 's'} — and how many seedlings in <b>each row</b>?`,
    planted: (r, c) => `🌱 You press ${r} × ${c} seedlings into the soil, row by row, until a tidy green rectangle stands in the plot. Now — how many is that?`,
    countAgain: 'Your seedlings are in the ground, uncounted. Shall we count the array?',
    // Gentle-failure line on a wrong COUNT (the plants do not judge). The worked
    // solution (the array) shows above it; this re-asks, never scolds.
    miscount: [
      'Not quite — but the seedlings do not mind being counted twice. They have nowhere to be. Look at the rows and try once more.',
      'Close! The plants are very patient about this. Count the rows, then the columns, and go again.',
      'The garden waits. Nobody has ever been rushed here. Give the array another look.',
    ],
    // A correct count → the patch is grown, ready to harvest.
    counted: (n) => `✓ <b>${n} seedlings</b>, counted true. The little rectangle of green stands proud. It will be ready to harvest whenever you next come by.`,
    harvestReady: 'The patch is grown and ready — a full array of it.',
    harvested: (n) => `🧺 You gather the whole array — <b>${n} fresh ingredients</b> — into a basket and carry it toward the kitchen. The plot is bare soil again, ready for the next planting.`,
    clearPlot: '🌱 You gently lift the seedlings back into their trays. The plot is bare soil again. (Nothing is ever wasted here — they will keep.)',
    plotEmpty: 'Bare, tilled soil, waiting for a rectangle of seedlings. Plant a patch at the seed bench.',
    // The talking carrot (P3): a single squat, opinionated Numberling cousin.
    // Field/glyph/sound + bump-modal only. It believes it is in charge.
    carrotName: '🥕 A very serious carrot',
    carrot: [
      '"You there." A carrot, mostly buried, regards you with enormous authority. "I have been elected to oversee this row. By whom? By the row. Carry on. I am WATCHING."',
      '"A word of advice from management," says the carrot, which is a carrot. "Straight rows. Even columns. A garden is just multiplication that you can eat, and I will not have it done sloppily."',
      '"Do not," says the carrot, with the gravity of a much larger vegetable, "let the cook near me. We have a history. It involves a grater. I would rather not discuss it."',
      '"I could leave this soil at any time," the carrot announces, not leaving the soil. "I stay because I am NEEDED. Someone has to have standards. The turnips certainly do not."',
      '"Excellent work on the array," the carrot says, as though it planted it. "I supervised. It was exhausting. I shall require a nap and possibly a small parade."',
    ],
    // The sous-chef (bump 'S'): a monster in a tiny toque who runs the kitchen.
    chefName: '🍲 The Sous-Chef',
    chefIntro: '"AH! A fellow cook!" A round little creature in a toque three sizes too big bustles over, wooden spoon aloft. "Welcome to the kitchen! The rule here is simple: measure honestly and everything turns out lovely. Measure wrongly and — well. You will meet the results. The pet meets most of them." It beams. "Bring me a harvest from the garden and we shall make something. Or something ADJACENT to something. Both are welcome."',
    chef: [
      '"The secret to cooking," the sous-chef confides, "is that a recipe is just a fraction wearing an apron. Half of this. Three-quarters of that. Doubled, if friends are coming." It taps its nose with the spoon, leaving a small smear of flour.',
      '"I have burned water," the sous-chef says proudly. "Twice. On PURPOSE, the second time, to see if I could do it again. I could. The pet was very brave about it."',
      '"Measure twice, ladle once," it says, then reconsiders. "Or measure once and ladle with tremendous confidence. That is more my style, honestly, and it shows."',
    ],
    chefNeedIngredients: '"Ah — the cupboard is bare, chef!" The sous-chef turns its empty pot upside down and a single sad crumb falls out. "Off to the garden with you. Plant a patch, count it true, harvest the array, and bring it back. I shall keep the fire warm." <i>(No harvest yet — the kitchen waits, patiently, forever.)</i>',
    // Picking a recipe scales it; the kid computes the measure (records under
    // the fraction skill). Header shown above the plain math problem.
    cookHeader: (dish, frame) => `🍲 <b>${dish}</b><br><span class="dim">${frame}</span>`,
    cookLeave: 'Wipe your hands for now',
    // Recipe frames, per skill. The DISH is the good outcome; the FRAME is the
    // sous-chef's request. The problem itself (plain math) is generated.
    // Frames are operation-AGNOSTIC on purpose (like the Court's Magistrate):
    // the sous-chef fusses about measuring carefully, the plain math problem
    // below carries the real operation — so any variant of the skill fits the
    // frame and the "keep the math text clean" rule holds.
    recipes: {
      fractions_m: [
        { dish: 'Glimmer-Moss Stew', frame: 'The sous-chef taps the recipe. "Company\'s coming — work out the measure and tell me exactly how much."' },
        { dish: 'Honeyroot Tart', frame: '"Bigger crowd today," says the sous-chef, sleeves rolled. "Do the fractions and give me the amount."' },
        { dish: 'Sunrise Porridge', frame: '"Measure it out just right," the sous-chef says, guarding the pot. "How much do we need?"' },
        { dish: 'Thunderpepper Chili', frame: '"This one wants EXACTLY the right amount, no more," warns the sous-chef, "or the SPOONS start to worry."' },
      ],
      fractions_as: [
        { dish: 'Two-Berry Cordial', frame: '"Careful with the measures — same jug, steady pour," the sous-chef says, holding it level.' },
        { dish: 'Meadowleaf Soup', frame: '"Work out the measure and tell me the total," says the sous-chef, ladle poised over the pot.' },
        { dish: 'Frostmint Sorbet', frame: '"Get the fraction exactly right," the sous-chef says. "That is precisely how much frost we want."' },
        { dish: 'Harvest Loaf', frame: '"Measure the flour to the fraction," the sous-chef says, dusting its paws. "How much is that?"' },
      ],
    },
    // A CORRECT measure → the real dish. Feeds the food economy.
    dishDone: (dish) => `✨ <b>${dish}</b>, made exactly right! It comes out of the pot looking like the picture, which almost never happens. Into the larder it goes.`,
    // A WRONG measure → a gloriously-named DISASTER DISH. Never a loss; the
    // worked solution shows above; it re-asks. Field/glyph/sound + this modal.
    disasters: [
      { name: 'Regret Soup', line: 'The measure is off, and the pot produces <b>Regret Soup</b> — a broth so pensive it seems to be thinking about its choices. It is not a loss. Nothing here is. But it IS Regret Soup.' },
      { name: 'The Sandwich That Asks Questions', line: 'What emerges is <b>The Sandwich That Asks Questions</b>. It is unclear which questions. It is unclear how a sandwich asks anything. You feel gently interrogated. Try the measure again.' },
      { name: 'Structurally Concerning Porridge', line: 'The bowl fills with <b>Structurally Concerning Porridge</b> — porridge that a builder would want to inspect before approving. It holds a spoon upright at an angle physics has not signed off on. Have another go.' },
      { name: 'Ambitious Pudding', line: 'Out comes <b>Ambitious Pudding</b>, which is reaching for something none of you can name. You respect its dream. You do not respect its texture. The recipe waits, unbothered.' },
      { name: 'The Loaf of Mild Alarm', line: 'The oven yields <b>The Loaf of Mild Alarm</b>. Nothing is technically wrong with it. Everything about it is technically unsettling. The sous-chef salutes it. Measure once more.' },
      { name: 'Suspicious Casserole', line: 'It is a <b>Suspicious Casserole</b>. It has done nothing wrong that you can prove. You would simply prefer it did not look at you like that. No harm done — count the measure again.' },
    ],
    // The pet has OPINIONS (field/glyph/sound + this line in the result modal).
    petGood: [
      'Your pet inhales the whole dish in one heroic gulp, then looks up with the shining eyes of a creature that has tasted greatness. 💖',
      'Your pet takes one dignified bite, considers it with the seriousness of a royal taster, and then loses all composure entirely. Tail everywhere. 😋',
      'Your pet does a small, involuntary happy spin and immediately pretends it did not. The dish is a triumph and you both know it. ✨',
    ],
    petBad: [
      'Your pet sniffs the disaster dish, sneezes with tremendous force, and then — because it loves you — eats it anyway, heroically, one appalled bite at a time. 😖',
      'Your pet regards the dish. The dish regards your pet. After a long standoff, your pet eats it out of sheer loyalty and gives you a look you will remember. 🫠',
      'Your pet gamely tries the disaster dish, makes a face known to zoologists as "the flavor of a brave decision," and finishes every scrap. Nothing wasted. 😤',
    ],
    // Milestone celebration prefix when a Faculty post is claimed here.
    facultyClaimed: 'And there is news:',
  };

  // ===== Wave 17: "The Menagerie" (Castle Expansion Wave D) =====
  // The gentlest, most additive castle wave — a nursery for the BEFRIENDED
  // KINDS the kid has soothed. Tend-don't-fight: tending draws a weakest-first
  // review problem across the WHOLE curriculum and RECORDS to mastery (the
  // gentlest spaced-review surface in the game); a missed tend re-asks warmly
  // (never a scold, never a loss). Creatures grow like the pet, collect tiny
  // hats, and have a social life. Comedy channels: field / glyph / sound /
  // modal — never the log. All prose below is authored (paste for design review).
  MM.data.MENAGERIE = {
    // The castle-side 'M' door: a gentle "not yet" pre-ending (like the Wing).
    doorNotYet: 'A warm wooden gate with a little carved paw-print, and soft rustling sounds beyond — hay, and something snuffling contentedly in its sleep. It is latched, for now.<br><br><i>The kingdom has to be set right before its friends can be settled in peace. Not yet.</i>',
    // Entering with at least one befriended kind present.
    enterLine: '🐾 <b>The Menagerie.</b> A soft green field of little pens in the castle grounds, where every creature you ever soothed has come to live. They look up as you arrive, and — in their various ways — are glad.',
    // Entering (or bumping the noticeboard) with ZERO befriended kinds. NOT a
    // failure state — an invitation. The pens are empty, waiting, unhurried.
    emptyPen: '🐾 <b>The Menagerie.</b> Rows of soft, empty pens in the castle grounds, freshly raked and waiting. A hand-painted board reads:<br><br><i>"Room for a friend, when you find one. No rush. They keep the hay fresh."</i><br><br><span class="dim">Soothe a monster out in the world — face the tangles gently — and it will come to live here.</span>',
    // The Keeper's noticeboard (bump 'B'): the nursery's signage.
    signTitle: '🐾 The nursery board',
    signBody: 'A hand-painted board on a friendly post:<br><br><i>"Welcome to the Menagerie — a home for every friend you soothed instead of struck.<br><br>Bump a creature to sit with it a while. Tend it — work a little something out together — and it will settle in, grow, and (if it likes) put on a very small hat.<br><br>Nothing here can be lost, hurried, or harmed. That is the whole point."</i>',
    // A creature bump: the FLAVOR line shown above the Tend / Leave choice —
    // the social life of becalmed monsters (field/glyph/sound + this modal).
    social: [
      'It is dozing in a sunbeam it has clearly been saving all day. One eye opens, regards you fondly, and closes again.',
      'It has, at some point, become inseparable best friends with the pile of bones two pens over. Nobody planned this. Nobody could have.',
      'It looks up hopefully, then pretends it was not looking up hopefully. It was, though. It absolutely was.',
      'Your pet is supervising this pen with enormous authority it does not, strictly speaking, possess. The creature is humouring it. This is friendship.',
      'It is very carefully rearranging its hay into a shape only it understands. The shape is, on reflection, extremely reasonable hay.',
      'A slime and this creature are taking turns being the leader of a parade that is only two creatures long. They are having the time of their lives.',
      'It waddles a slow, delighted circle at the sight of you and then sits down, satisfied, as though the circle were a formal ceremony now concluded.',
    ],
    // Bump-line suffix noting the worn hat (when the creature has one).
    hatNote: hat => `It is wearing ${hat}, and could not be prouder of it.`,
    // Tend header flavor (above the plain math problem) — the creature waits.
    tendFrames: [
      'You settle in beside it and work a little something out together.',
      'It leans in to watch, patient as anything, while you two puzzle it through.',
      'No hurry, no clock — just you, this creature, and one thing worth figuring out.',
    ],
    // Gentle-failure line on a wrong TEND. The worked answer shows above it;
    // this re-asks, never scolds — the creature waits, entirely unbothered.
    patient: [
      'Not quite — but the creature does not mind in the slightest. It settles in to wait. There is all the time in the world here. Look it over and try again.',
      'Close! Nothing is lost. The creature yawns, stretches, and waits for you to have another go whenever you like.',
      'The nursery is the one place that is never in a hurry. The creature nudges you gently: take another look, and try once more.',
    ],
    // A correct TEND: the creature is happy. Pulled at random.
    tended: [
      '✓ Worked out true! The creature does a small, delighted wiggle and settles a little more deeply into its home here. 💚',
      '✓ Just right. The creature bumps its head against your hand, purring in whatever way its kind purrs, and looks thoroughly content.',
      '✓ Lovely. The creature blinks slowly at you — which, everyone knows, is how a soothed thing says it trusts you completely.',
    ],
    // A GROWTH stage-up line (appended to the tend result). {name}=creature, {stage}=new stage name.
    grew: (name, stage) => `✨ <b>${name} is settling in!</b> It has grown into a <b>${stage}</b> — plumper, calmer, and utterly at home.`,
    // A hat is granted on settling in (appended to the tend result). {name}=creature, {hat}=hat phrase.
    hatEarned: (name, hat) => `🎩 And look — ${name} has taken to wearing ${hat}. It wears it at a jaunty, deeply pleased angle.`,
    // THE CAPSTONE — the Parade. Once-ever, day-agnostic, no mechanic. Fired
    // when every present befriended kind has been tended (a thriving nursery).
    // The cut Festival, earned here, the one place it belongs.
    paradeLine: '🎉 <b>The Parade!</b><br><br>It starts, as these things do, with the slime. It hops to the front of its pen, and then — because a soothed heart is a contagious thing — every creature in the nursery falls in behind it: the bonepile and its inseparable slime, the little imps, the great gentle golem bringing up the rear at a dignified plod. Your pet leads them, of course, conducting with a stick it found and a seriousness it has earned.<br><br>They march a full, joyful lap of the Menagerie — every friend you chose to soothe instead of strike — and then, delighted with themselves, they all sit down at once.<br><br><i>You did this. Not by winning. By being kind, over and over, until kindness was just how the world worked.</i>',
    // Milestone celebration prefix when the Keeper Faculty post is claimed.
    facultyClaimed: 'And there is news:',
  };

  // The castle door ('H' by the Study) and the hall's-end teaser doorway.
  MM.data.WING_DOOR_LOCKED = name =>
    `A sturdy door with a brass plate, polished bright and freshly engraved. The plate reads: <b>${name}</b>.<br><br>Under it, in smaller letters: <i>Not yet.</i>`;
  MM.data.WING_ENTER_LINE = '🛠 <b>The Workshop Wing.</b> Six proving rooms, each signed by a MathMaker before you. Someone has dusted, recently.';
  MM.data.WING_DOORWAY_BLANK = 'At the very end of the hall: a doorway with nothing behind it yet — just clean stone, and a blank brass plate waiting for a name.<br><br><i>Whoever finishes the proving rooms, presumably.</i>';
  // Wave 13: the v1.8.2 "masons" holding-note is GONE — the named plate now
  // opens the door for real. Shown once, then the doorway just opens.
  MM.data.WING_DOORWAY_NAMED = name =>
    `The blank plate isn\'t blank anymore. It reads: <b>${name}</b>.<br><br>` +
    `And behind the doorway, where there was only clean stone — there is a <b>room</b>. Bare walls, good light, ` +
    `a workbench under the window, and a pedestal waiting at the far end. The masons came and went while nobody ` +
    `was watching. Masons are like that.<br><br>` +
    `<i>Every Keeper builds a proving room of their own. This one is yours.</i>`;
  MM.data.WING_TITLE_LINE = 'Six rooms, six signatures, six proofs — every one of them answered.<br><br>From this day you are <b>Keeper of the Proving Rooms</b>. The empty doorway at the hall\'s end has been listening. Go and see.';
  // Pantry shelf flavor (bump pool — a modal would be friction; these are
  // log echoes of a purely visual room, mechanics-free).
  MM.data.WING_SHELF_LINES = [
    '🧺 Jars. So many jars. One is labeled "DO NOT PROVE."',
    '🥫 Pickled things, alphabetized. Bartleby\'s system endures.',
    '🧂 A salt cellar the size of a helmet. It has seen use.',
  ];

  // ---------- Wave 13: "The Understudy & Your Own Room" ----------
  // STANDING RULES apply unchanged: jokes are observations, never obstacles;
  // comedy channels are field/glyph/sound/modal, never the log alone; the
  // kid is never the punchline; sincere beats stay sincere.

  // P1 — the Understudy's once-ever introduction (a big beat: modal allowed).
  MM.data.UNDERSTUDY_INTRO = {
    title: '🎭 The Understudy',
    body: '"<b>AH!</b>" A small slime pops out of — somewhere. It is wearing a paper crown, folded with tremendous care, ' +
      'and holding a stick exactly the way heroes hold swords.<br><br>' +
      '"I have watched <b>every step</b>," it announces. "The walking! The turning! The stopping — <i>magnificent</i>. ' +
      'I know your last twelve by heart." It plants the stick like a banner. "Places, everyone. <b>This is my moment.</b>"<br><br>' +
      '<i>And it sets off along your own footsteps, exactly, like an actor who has waited a hundred rehearsals ' +
      'for the lead to be out sick.</i>',
  };

  // P2 — Your Own Room: the workbench, the cords, the pupil, the visit.
  MM.data.MYROOM_ENTER_LINE = '🧱 <b>Your own room.</b> Bare stone, good light. The workbench is ready when you are.';
  MM.data.MYROOM_BENCH_TITLE = '🛠 The workbench';
  MM.data.MYROOM_BENCH_BODY =
    'Everything a room needs, in neat labeled crates. Choose what to carry — ' +
    'you\'ll set one down on each tile you <b>step off</b>, like a mason laying a course. ' +
    'Bump a placed piece to take it back; the bench takes back plates, cracked tiles and slabs.';
  MM.data.MYROOM_PIECES = {
    wall: { label: '🧱 Wall block', emoji: '🧱' },
    slab: { label: '🪨 Push-slab', emoji: '🪨' },
    plate: { label: '⚙️ Pressure plate', emoji: '⚙️' },
    gate: { label: '🚪 Counterweight gate', emoji: '🚪' },
    crack: { label: '⚠️ Cracked tile', emoji: '⚠️' },
    chest: { label: '🎁 Chest', emoji: '🎁' },
  };
  MM.data.MYROOM_PEDESTAL_LINE = solves =>
    'A stone pedestal with a chest-shaped hollow on top, waiting at the far end of the room. ' +
    'Whoever reaches it has solved whatever the room asks.' +
    (solves > 0 ? `<br><br><span class="dim">Solved by pupils: <b>${solves}</b>.</span>` : '');
  MM.data.MYROOM_CORD_TITLE = '🔔 A pull-cord by the arch';
  MM.data.MYROOM_CORD_BODY = 'A braided cord with a neat label in the MathMaker\'s hand: <b>"INVITE A PUPIL."</b>';
  MM.data.MYROOM_PUPIL_ARRIVES = '🐌 A pupil slides in under the arch — the enrolled slime, notebook face on, taking your room very seriously.';
  // The polite-stuck flow IS the feature — never a failure state, never a cost.
  MM.data.MYROOM_PUPIL_STUCK = {
    title: '💭 The pupil comes back',
    body: 'The slime slides back to the arch and looks up at you — not upset, just thinking hard.<br><br>' +
      '"I tried the long way, and the short way, and a way that turned out to be a wall," it says. ' +
      '"Could I have a <b>hint</b> — or a <b>hallway</b>?"<br><br>' +
      '<i>No hurry. Rooms are allowed to be revised. That\'s most of building them.</i>',
  };
  MM.data.MYROOM_FIRST_SOLVE = {
    title: '✨ Your room works',
    body: 'The pupil reaches the pedestal — and bounces, twice, in a way that in a slime means <b>triumph</b>.<br><br>' +
      'It solved <i>your</i> room. The one you built. Every wall where you put it, every plate doing exactly ' +
      'what you meant it to do.<br><br><i>The room pays no gold. The room is the trophy.</i>',
  };
  MM.data.MYROOM_MISCOUNT_CAMEO = name => ({
    title: '🧑‍🎓 Miscount, in the doorway',
    body: '"I heard the cheering from the hall." Miscount leans on the doorframe, looking at your room the way ' +
      'some people look at paintings.<br><br>"A room that <b>can</b> be solved, and still asks you to earn it — ' +
      'that\'s the hardest thing to build. I spent years building the other kind, by accident."<br><br>' +
      `He taps the name plate on his way out. "It\'s a good room, <b>${name}</b>. It tests fairly."`,
  });
  MM.data.MYROOM_SOLVE_AGAIN = '🎉 The pupil reaches the pedestal and does its small triumphant bounce. Your room holds up.';

  // P3 — the homesick staircase.
  MM.data.STAIRCASE_FOLLOW_LINE = '🏠 The staircase turns to follow you. It does not explain itself. It is a staircase.';
  MM.data.STAIRCASE_WAIT_LINE = '🪜 The staircase stops at the doorway and settles in to wait, radiating patience.';
  MM.data.STAIRCASE_PIER_LINE = '🪜 The staircase waits at the pier. Stairs do not sail. It knows this about itself.';
  // Monsters ignore it — code-level indifference is the joke; ONE log echo
  // for parents, once per session, with a real monster's name when possible.
  MM.data.STAIRCASE_MONSTER_ECHO = monName =>
    `👀 ${monName} looks at the staircase. The staircase looks at nothing. It is a staircase.`;
  MM.data.STAIRCASE_HOMECOMING = {
    title: '🏠 The staircase comes home',
    body: '<i>The little staircase presses itself against the tower wall — and <b>fits</b>. A seam you never noticed ' +
      'takes it in, step by step, until the wall is only a wall, and somewhere inside, the Spiral Stair is one ' +
      'flight taller. Or always was. With stairs it\'s hard to say.</i><br><br>' +
      'Two stone feet poke out under the bottom step for one last moment. Then they, too, are stairs.<br><br>' +
      '<b>The Spiral Stair remembers.</b> <span class="dim">The tower door has a new option: ' +
      '<b>⤴ Start from floor 10</b>. It knows a shortcut. Of course it does — it is one.</span>',
  };
  MM.data.STATUE_PRICE = 220;
  MM.data.STATUE_EMPTY = 'An empty plinth, waiting for someone worth remembering.';
  MM.data.STATUE_LINE = name => `A small stone likeness of ${name} — carved with more fondness than accuracy, honestly.`;
  MM.data.PET_HATS = [
    { id: 'bow', name: 'Bow', emoji: '🎀', price: 60, react: 'Your pet preens, thoroughly pleased with itself.' },
    { id: 'party', name: 'Party Hat', emoji: '🎉', price: 80, react: 'Your pet does one excited little spin.' },
    { id: 'flower', name: 'Flower Crown', emoji: '🌸', price: 100, react: 'Your pet sniffs the petals and sneezes, charmingly.' },
    { id: 'crown', name: 'Tiny Crown', emoji: '👑', price: 160, react: 'Your pet sits very regally. It knows.' },
    // Earned in the Practice Yard, never sold — a set of four to collect, one
    // per fluency milestone. `earned` marks them un-buyable in the wardrobe.
    { id: 'numberling', name: 'Numberling Cap', emoji: '🧢', earned: true, react: 'Your pet tips the cap back at a studious angle.' },
    { id: 'anchor', name: 'Anchor Topper', emoji: '🎩', earned: true, react: 'Your pet stands very tall — quite the distinguished scholar.' },
    { id: 'climber', name: "Climber's Hat", emoji: '🤠', earned: true, react: 'Your pet swaggers a little. Yeehaw, apparently.' },
    { id: 'graduate', name: 'Graduate Cap', emoji: '🎓', earned: true, react: 'Your pet sits up perfectly straight — as if it, too, has mastered its tables.' },
    // Wave 14: an occasional gratitude gift from a settled court case (the
    // pet-hat cosmetic path — never sold, never a grind, granted at most once).
    { id: 'courtier', name: "Courtier's Hat", emoji: '👒', earned: true, react: 'Your pet holds court from atop its cushion, graciously accepting imaginary petitions.' },
  ];
  MM.data.petHatById = id => MM.data.PET_HATS.find(h => h.id === id);

  // ---------- the Practice Yard (the Tutor) ----------
  // A stand-alone fluency track, separate from the ten story topics: a wall of
  // single-fact-family cards, drilled with the Tutor near the castle from
  // early game. Two little tracks — number-sense strategies (doubles →
  // near-doubles → make ten) and the times tables — each card carrying a
  // one-line strategy the Tutor teaches BEFORE testing. `prereq` soft-locks
  // the harder cards (never a dead end — a locked card is greyed with its
  // reason, and everything unlocked is always drillable); `order` drives the
  // Tutor's "recommended next". Stars: 0 none, 1 bronze (a clear, >=6/8),
  // 2 silver (a clean 8/8), 3 gold (a second clean run). Drills come from
  // MM.problems.yardDrill(id). This is a SEPARATE track — it never touches the
  // topic mastery/adaptive tiers.
  MM.data.YARD_CARDS = [
    { id: 'doubles',     label: 'Doubles',      emoji: '➕', track: 'sense',  order: 1,  prereq: [],          tip: 'A double is a number plus itself: 6 + 6. Learn these and near-doubles come almost free.' },
    { id: 'neardoubles', label: 'Near-doubles', emoji: '➕', track: 'sense',  order: 2,  prereq: ['doubles'], tip: '6 + 7 is just 6 + 6, then one more. Double the smaller number, then add one.' },
    { id: 'make10',      label: 'Make 10',      emoji: '🔟', track: 'sense',  order: 3,  prereq: ['doubles'], tip: 'The pairs that make ten: 3 + 7, 4 + 6, 8 + 2. Ten is the number everything else leans on.' },
    { id: 'x2',  label: '×2',  emoji: '✖️', track: 'tables', order: 4,  prereq: [],      tip: 'Times two is just doubling — you already know these.' },
    { id: 'x5',  label: '×5',  emoji: '✖️', track: 'tables', order: 5,  prereq: [],      tip: 'The fives always land on 5 or 0. Count them like nickels.' },
    { id: 'x10', label: '×10', emoji: '✖️', track: 'tables', order: 6,  prereq: [],      tip: 'Times ten just adds a zero: 7 becomes 70.' },
    { id: 'x3',  label: '×3',  emoji: '✖️', track: 'tables', order: 7,  prereq: ['x2'],  tip: 'Times three: double it, then add one more group.' },
    { id: 'x4',  label: '×4',  emoji: '✖️', track: 'tables', order: 8,  prereq: ['x2'],  tip: 'Times four is double, then double again.' },
    { id: 'x6',  label: '×6',  emoji: '✖️', track: 'tables', order: 9,  prereq: ['x3'],  tip: 'Times six is your threes, doubled.' },
    { id: 'x7',  label: '×7',  emoji: '✖️', track: 'tables', order: 10, prereq: ['x6'],  tip: 'The sevens are the trickiest — go slow. 7 × 8 = 56 is the famous one.' },
    { id: 'x8',  label: '×8',  emoji: '✖️', track: 'tables', order: 11, prereq: ['x4'],  tip: 'Times eight: double your fours.' },
    { id: 'x9',  label: '×9',  emoji: '✖️', track: 'tables', order: 12, prereq: ['x8'],  tip: 'Times nine is the tens minus one group: 9 × 6 = 60 − 6 = 54. And the digits always add to nine.' },
    { id: 'x11', label: '×11', emoji: '✖️', track: 'tables', order: 13, prereq: ['x10'], tip: 'Times eleven, up to nine, just repeats the digit: 11 × 4 = 44.' },
    { id: 'x12', label: '×12', emoji: '✖️', track: 'tables', order: 14, prereq: ['x11'], tip: 'Times twelve is your tens plus your twos: 12 × 7 = 70 + 14 = 84.' },
  ];
  MM.data.yardCardById = id => MM.data.YARD_CARDS.find(c => c.id === id);

  // Milestones: a cluster of cards to a star threshold (`need`: 2 silver,
  // 3 gold) grants `reward` (any of charm/hat/title/potions/food/gold) and
  // the Tutor speaks `line`. The capstone needs every card at gold.
  MM.data.YARD_MILESTONES = [
    { id: 'sense', name: 'Number Sense', cards: ['doubles', 'neardoubles', 'make10'], need: 2,
      reward: { charm: 'reckoner', hat: 'numberling', potions: 2, food: 2 },
      line: '"THIS is the ground everything else stands on," the Tutor says, eyes shining. "Doubles, near-doubles, tens — quick mathematicians all have these cold. You just joined them."' },
    { id: 'anchors', name: 'The Anchor Tables', cards: ['x2', 'x5', 'x10'], need: 2,
      reward: { hat: 'anchor', potions: 3, food: 3, gold: 40 },
      line: '"Twos, fives, tens — the tables you lean all the others against. Well anchored."' },
    { id: 'climb', name: 'The Climb', cards: ['x3', 'x4', 'x6', 'x7', 'x8', 'x9'], need: 2,
      reward: { hat: 'climber', potions: 4, food: 4, gold: 80 },
      line: '"The steep middle — threes through nines. This is where most give up. You did not."' },
    { id: 'master', name: 'Master of Tables', cards: ['doubles', 'neardoubles', 'make10', 'x2', 'x5', 'x10', 'x3', 'x4', 'x6', 'x7', 'x8', 'x9', 'x11', 'x12'], need: 3,
      reward: { hat: 'graduate', title: 'Master of Tables', potions: 5, food: 5, gold: 120 },
      line: '"Every card, gold. Every fact, instant." The Tutor has to sit down for a moment. "I have never seen it done so completely. You are a <b>Master of Tables</b>."' },
  ];

  MM.data.TUTOR = {
    intro: '"Welcome to the Practice Yard!" A wiry figure with chalk-dusted sleeves beams at you. "The MathMaker sends the sharp ones to me. Fluency is not magic — it is a muscle, built one small set at a time. Pick a card and we will drill it until it is easy. Start with your <b>doubles</b>."',
    return: '"Back for more? Good. A little every day is how it sticks."',
    // hat grant messaging — the pet is a mid-game companion, so a hat earned
    // early goes into the pack with a word about the friend still to come.
    hatNoPet: 'The Tutor tucks it into your pack. "For a companion — you will meet one out on your travels. This will be waiting when you do."',
    hatPet: 'The Tutor grins. "Your companion will look splendid in this."',
    // the daily directed challenge — the Tutor chooses the card, so the reward
    // can never be farmed on the easiest drill.
    challengeIntro: 'The Tutor claps. "Today\'s challenge, my choosing:',
    challengeDone: '"Done, and done well. Take these — you have earned them."',
    // a cheer on every clean run that lights a new star
    starCheers: [
      'Clean as a whistle!',
      'Not one wrong — listen to you!',
      'THAT is what fluency sounds like.',
      'You did not even pause. Lovely.',
      'The chalk is impressed. I am impressed.',
      'Eight for eight — the Tutor does a small, dignified dance.',
      'Snap, snap, snap. Straight through.',
    ],
  };

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

  // ---------- Turning Stones (P1) — the TRUE golden spiral ----------
  // Wave 10 shipped a horizontal ROW; v1.7.0/v1.7.1 tried a compact
  // rectangular-spiral plaza. Both failed the same playtest verdict: they
  // did not READ as a golden spiral ("Consider what a golden spiral
  // actually looks like… much larger, with a true spiral drawn across the
  // map." — user, 2026-07-13). v1.7.3-next is the real thing: the classic
  // Fibonacci-square golden spiral, quarter-circle arcs of radii
  // 1,1,2,3,5,8,13 TILES chained clockwise, sweeping right across the
  // overworld. Then an UNNUMBERED partial continuation (the 21-square,
  // begun but never finished) curves the last tip up to the Spiral Stair's
  // door — the sequence's own continuation physically leads to the tower,
  // yet 21 never appears anywhere (that is the ending exam's discovery).
  //
  // Still a pure canvas overlay on ordinary walkable grass ('.') — no new
  // grid glyphs, same "read live state off fixed tiles" recipe as the
  // dungeon-entrance labels. Never gates movement, never speaks.
  //
  // THE placement (exhaustive search — the overworld admits exactly one):
  // chain anchor P0=(35,8), start heading H0=(1,0), clockwise rotation
  // rot([x,y])=[-y,x]. Each quarter-arc i: L=rot(H) (start→center dir),
  // center C=P+L·r, end E=C+H·r, next heading H'=L, next start=E. The seven
  // numbered stones sit at the seven arc-start CORNERS; the seven radii are
  // the Fibonacci squares 1,1,2,3,5,8,13. ASCENT ONLY (design review
  // 2026-07-13: a mirrored set would let a kid read "…13, 8" and answer the
  // exam with 8 — the foreshadowing must never teach the wrong answer).
  // Six unnumbered curve stones ride the long 13-arc, marking the sweep
  // between the 13-corner and the tip at (20,5). Stone "8" at (41,10) sits
  // ACROSS the river — reachable only once the bridge rises (task 10),
  // before the ending exam ever needs it (exam-safe by construction).
  //
  // Each stone carries an INTEGER tile (x,y) for the sequence-walk stepping
  // AND a FLOAT arc position (fx,fy) so the drawn disc sits exactly ON the
  // curve, plus a chain-parameter t (arc index + fraction) so the renderer
  // knows how far along the curl each stone is (bright frontier).
  const SPIRAL = (() => {
    const rot = ([x, y]) => [-y, x];             // clockwise (screen y-down)
    const radii = [1, 1, 2, 3, 5, 8, 13];
    const arcs = [];
    let P = [35, 8], H = [1, 0];
    for (let i = 0; i < 7; i++) {
      const r = radii[i];
      const L = rot(H);
      const C = [P[0] + L[0] * r, P[1] + L[1] * r];
      const E = [C[0] + H[0] * r, C[1] + H[1] * r];
      arcs.push({
        i, r, cx: C[0], cy: C[1], sx: P[0], sy: P[1], ex: E[0], ey: E[1],
        a0: Math.atan2(P[1] - C[1], P[0] - C[0]),
        a1: Math.atan2(E[1] - C[1], E[0] - C[0]),
      });
      P = E; H = L;
    }
    return { arcs, tip: P.slice() };            // tip = (20,5), heading north
  })();
  MM.data.SPIRAL_ARCS = SPIRAL.arcs;
  // The tip-to-tower nub: a tangent-matched quadratic bezier from the
  // 13-arc's end (20,5) up to the Spiral Stair door (19,3). NOT a trued
  // 21-radius arc (that leaves a ~1.1-tile radial gap at the tip). Its
  // chain-parameter runs 7..8, just past the last real arc.
  MM.data.SPIRAL_NUB = { x0: 20, y0: 5, cx: 20, cy: 3.8, x1: 19, y1: 3 };
  MM.data.TURNING_STONES = (() => {
    const arcs = SPIRAL.arcs;
    // curve-stone fractions along the 13-arc (arc 6); k=1 slid -0.015 so
    // its rounded tile clears its neighbour (walkability).
    const curveF = [1 / 7, 2 / 7 - 0.015, 3 / 7, 4 / 7, 5 / 7, 6 / 7];
    const a6 = arcs[6];
    let d6 = a6.a1 - a6.a0;
    while (d6 > Math.PI) d6 -= 2 * Math.PI;
    while (d6 < -Math.PI) d6 += 2 * Math.PI;
    const stones = [];
    // the seven numbered corner stones — float pos == integer tile
    arcs.forEach((a, i) => {
      stones.push({
        i, x: a.sx, y: a.sy, fx: a.sx, fy: a.sy, t: i,
        size: a.r, label: String(a.r),
      });
    });
    // the six unnumbered curve stones, riding the 13-arc
    curveF.forEach((f, k) => {
      const ang = a6.a0 + d6 * f;
      const fx = a6.cx + a6.r * Math.cos(ang), fy = a6.cy + a6.r * Math.sin(ang);
      stones.push({
        i: 7 + k, x: Math.round(fx), y: Math.round(fy),
        fx, fy, t: 6 + f, size: 6, label: null,
      });
    });
    return stones;
  })();
  // stone 0's tile — Sylvia's dialog and the unit test both key off it.
  MM.data.TURNING_STONES_CENTER = { x: MM.data.TURNING_STONES[0].x, y: MM.data.TURNING_STONES[0].y };
  // The whole curl, sampled ~0.15 tile along the seven arcs then the nub,
  // each point tagged with its chain-parameter t (0..8). The renderer walks
  // these, drawing ONLY where the underlying raw tile is plain grass, so the
  // carving vanishes under the river, mountains, trees and buildings that
  // were built/grew/flow OVER it. Cached — the geometry is fixed.
  MM.data._spiralChain = null;
  MM.data.spiralChain = function () {
    if (MM.data._spiralChain) return MM.data._spiralChain;
    const pts = [];
    const STEP = 0.15;
    for (const a of MM.data.SPIRAL_ARCS) {
      let d = a.a1 - a.a0;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const n = Math.max(2, Math.ceil(Math.abs(d) * a.r / STEP));
      for (let j = 0; j <= n; j++) {
        const f = j / n, ang = a.a0 + d * f;
        pts.push({ x: a.cx + a.r * Math.cos(ang), y: a.cy + a.r * Math.sin(ang), t: a.i + f });
      }
    }
    const nb = MM.data.SPIRAL_NUB;
    for (let j = 0; j <= 16; j++) {
      const f = j / 16, mt = 1 - f;
      pts.push({
        x: mt * mt * nb.x0 + 2 * mt * f * nb.cx + f * f * nb.x1,
        y: mt * mt * nb.y0 + 2 * mt * f * nb.cy + f * f * nb.y1,
        t: 7 + f,
      });
    }
    MM.data._spiralChain = pts;
    return pts;
  };
  // An UNALIGNED stone sits at a fixed skew instead of its true geometric
  // angle: a deterministic offset derived from its own index, never from
  // Date.now() or a frame counter, so it never moves on its own
  // (Calm-Mode-safe by construction — there is nothing to turn off).
  MM.data.stoneSkew = i => ((i * 47) % 60) - 30; // degrees, always non-zero-ish

  // ---------- Wave 24 (Looking Glass P4.1): the COMPLETED spiral ----------
  // A pure reflection of the existing chain/stones — no Math.random anywhere
  // in this geometry, so it is exactly reproducible and unit-checkable. The
  // mirror axis is the vertical line through TURNING_STONES_CENTER (stone 0,
  // P0 — the spiral's own anchor): x' = 2*C.x - x, y unchanged. A LINE
  // reflection (not a 180° rotation) genuinely reverses chirality — the
  // mirrored curl really does turn the other way, a true mathematical fact,
  // not just a relabeled copy — and both curls share the one stone that sits
  // ON the mirror line, so they read as one figure, not two.
  // The last arc (radius 13, plus its six unnumbered curve stones and the
  // tip nub) is, by construction, roughly as much arc-length as ALL six
  // earlier turns combined — accurate to the true golden spiral, but at
  // "vantage plaque" scale it swamps the render into one big blank curve
  // with a small illegible tangle where the actual COILING is. Cropping the
  // vantage's icon to the six tighter turns (radii 1,1,2,3,5,8 — every
  // NUMBERED stone through "8", corner-to-corner with arc 6) keeps the
  // shape reading as a spiral at a glance; the full 13-armed curl is still
  // exactly what draws in the overworld (js/ui.js drawTurningStones is
  // untouched). Design-review note (2026-07-21 screenshot audit): the
  // uncropped version read as a big "U" with a cramped scribble, not a
  // double spiral — this crop is the fix.
  MM.data.COMPLETED_SPIRAL_CUTOFF_T = 6;
  MM.data._completedSpiralGeom = null;
  MM.data.completedSpiralGeometry = function () {
    if (MM.data._completedSpiralGeom) return MM.data._completedSpiralGeom;
    const C = MM.data.TURNING_STONES_CENTER;
    const cutoff = MM.data.COMPLETED_SPIRAL_CUTOFF_T;
    const chain = MM.data.spiralChain().filter(p => p.t <= cutoff);
    const mirrorChain = chain.map(p => ({ x: 2 * C.x - p.x, y: p.y, t: p.t }));
    const stones = MM.data.TURNING_STONES.filter(st => st.t <= cutoff);
    const mirrorStones = stones.map(st => ({
      i: st.i, x: 2 * C.x - st.x, y: st.y, fx: 2 * C.x - st.fx, fy: st.fy, t: st.t, size: st.size, label: st.label,
    }));
    const all = chain.concat(mirrorChain);
    const bbox = {
      minX: Math.min(...all.map(p => p.x)), maxX: Math.max(...all.map(p => p.x)),
      minY: Math.min(...all.map(p => p.y)), maxY: Math.max(...all.map(p => p.y)),
    };
    MM.data._completedSpiralGeom = { center: C, chain, mirrorChain, stones, mirrorStones, bbox };
    return MM.data._completedSpiralGeom;
  };

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
        // Wave 21 (Looking Glass P2.1): a BOUNDED, occasional reversal-comedy
        // aside — gated on inMirror(), and on a chance (not every bump) so
        // the reflected replay's real story dialogue below still plays out
        // normally most of the time.
        if (MM.engine.inMirror && MM.engine.inMirror()
          && Math.random() < (MM.engine.MIRROR_GREETING_CHANCE != null ? MM.engine.MIRROR_GREETING_CHANCE : 0.4)) {
          return MM.data.mirrorGreeting('Farmer Fenwick', 0);
        }
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
          return '"The old stones, out in the grass. They turn, you know. One more every time you set something right." Sage Sylvia says it like a fact of nature, not a secret. "My grandmother said they were a picture, seen from high enough."';
        }
        // v1.7.0: the tower's late-game evolution — no one explains it.
        if (s.tasksDone.length >= 10 && Math.random() < 0.15) {
          return '"That carving over the tower door," Sage Sylvia says, not quite looking at it. "It seems deeper lately. As if something is being carved from the inside." She does not explain further. She never does, with that tower.';
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
        // Wave 21 (Looking Glass P2.1): see Farmer Fenwick's note above —
        // same bounded, occasional aside.
        if (MM.engine.inMirror && MM.engine.inMirror()
          && Math.random() < (MM.engine.MIRROR_GREETING_CHANCE != null ? MM.engine.MIRROR_GREETING_CHANCE : 0.4)) {
          return MM.data.mirrorGreeting('Trader Tessa', 1);
        }
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
        // Wave 21 (Looking Glass P2.1): the compass gag — Percy's own
        // 🧭, through the glass, points confidently the wrong way, and he
        // has never once noticed. A standing bit for as long as the kid is
        // through the glass, not an occasional aside (unlike Fenwick/Tessa
        // above) — it doesn't compete with story-progression dialogue, since
        // Percy has no quest-critical lines of his own.
        if (MM.engine.inMirror && MM.engine.inMirror()) {
          return 'Old Salt Percy taps his 🧭 compass twice, squints at the horizon, and announces "North!" — pointing, with total confidence, due south. He has never once, in this reflection, been wrong. By his own count.';
        }
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
        // Wave 21 (Looking Glass P2.1): Barnaby's ballad, sung backwards —
        // literally the same verse (the first one, hero-in-the-meadow) with
        // every word in reverse order. A standing bit through the whole
        // reflection, like Percy's compass — Barnaby's lines are flavor, not
        // quest-critical, so nothing story-relevant is lost by it.
        if (MM.engine.inMirror && MM.engine.inMirror()) {
          return '🎵 <i>"...gone! All were slimes the, nonny-nonny-hey and — dawn at meadow the to down went hero the."</i> 🎵<br><br>' +
            '"I\'m singing it backwards," says Bard Barnaby, with enormous dignity. "It\'s the very same ballad — every word\'s ' +
            'exactly where it was. Only the <b>order</b>\'s changed. Try it. It\'s harder than it looks."';
        }
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
    // Wave 14: the Court Herald — 'N' near the throne in the CASTLE map. NOT a
    // talker: the `court` flag routes E.talkNpc straight to E.holdCourt (same
    // idiom as u's `arena` / the study's `study` flags). 'N' is the one glyph
    // genuinely FREE across every map (overworld AND dungeon) and every NPCS
    // key — no collision surface at all (deliberately NOT reusing 'Z', which
    // is the Clockwork Spire's clock-door glyph — the v1.7.9 'Y' lesson).
    N: { name: MM.data.COURT.herald.name, sprite: 'herald', pal: null, court: true },
  };
})();
