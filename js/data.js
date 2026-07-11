// MathMaker — static game data: tasks, skills, monsters, equipment, shop.
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
  };

  // The ten tasks, in curriculum order. Dungeon i on the map uses TASKS[i-1].
  MM.data.TASKS = [
    {
      skill: 'addsub_facts', dungeon: 'Meadow Cave', item: 'Copper Coin of Counting', itemEmoji: '🪙',
      assign: 'Your first task! Deep in the <b>Meadow Cave</b> to the west lies the <b>Copper Coin of Counting</b>. The beasts there fall to anyone quick with adding and subtracting. Bring me the coin!',
      done: 'The Copper Coin of Counting! Splendid. Your sums are sharp indeed.',
    },
    {
      skill: 'muldiv_facts', dungeon: 'Rat Cellar', item: 'Stone Times Table', itemEmoji: '🪨',
      assign: 'The rats of the <b>Rat Cellar</b> have stolen the <b>Stone Times Table</b> — an actual table, carved with every times fact. Rats fear multiplication and division. Retrieve it!',
      done: 'The Stone Times Table returns! The rats never stood a chance against your facts.',
    },
    {
      skill: 'multidigit_addsub', dungeon: 'Old Mine', item: "Miner's Golden Ledger", itemEmoji: '📒',
      assign: 'In the <b>Old Mine</b>, the ghostly miners still tally enormous heaps of gold. Master adding and subtracting big numbers — with regrouping! — and recover the <b>Miner\'s Golden Ledger</b>.',
      done: 'The Golden Ledger! Every column lines up perfectly. Well regrouped!',
    },
    {
      skill: 'multidigit_mult', dungeon: 'Forest Ruin', item: 'Golden Abacus', itemEmoji: '🧮',
      assign: 'An ancient <b>Forest Ruin</b> hides the <b>Golden Abacus</b>. Its guardians multiply their strength — you must multiply better. Two digits times two digits, and more!',
      done: 'The Golden Abacus — magnificent! Your multiplication grows mighty.',
    },
    {
      skill: 'long_division', dungeon: 'River Catacombs', item: "Divider's Compass", itemEmoji: '🧭',
      assign: 'Beneath the river lie the <b>River Catacombs</b>. The <b>Divider\'s Compass</b> is hidden there, guarded by creatures that split into pieces — and leave remainders. Long division is your blade!',
      done: 'The Divider\'s Compass! You divided, conquered, and accounted for every remainder.',
    },
    {
      skill: 'decimals_ps', dungeon: 'Crystal Grotto', item: 'Decimal Crystal', itemEmoji: '💎',
      assign: 'The <b>Crystal Grotto</b> glitters with the <b>Decimal Crystal</b>. Its point splits whole from part — know your tenths from your hundredths, compare with care, and it is yours.',
      done: 'The Decimal Crystal! You see clearly on both sides of the point now.',
    },
    {
      skill: 'decimals_md', dungeon: "Merchant's Vault", item: 'Silver Scale of Truth', itemEmoji: '⚖️',
      assign: 'A greedy spirit haunts the <b>Merchant\'s Vault</b>, hoarding the <b>Silver Scale of Truth</b>. Multiply and divide decimals — count every last cent — and take back the Scale.',
      done: 'The Silver Scale! Every cent accounted for. A merchant\'s nightmare, you are.',
    },
    {
      skill: 'fractions_as', dungeon: 'Fraction Fortress', item: 'Amulet of Halves', itemEmoji: '🧿',
      assign: 'The <b>Fraction Fortress</b> was built from unequal parts. Inside waits the <b>Amulet of Halves</b>. Make unlike denominators alike, add and subtract the pieces, and claim it.',
      done: 'The Amulet of Halves, made whole! Your fractions are in perfect proportion.',
    },
    {
      skill: 'fractions_m', dungeon: "Wizard's Tower", item: "Wizard's Hourglass", itemEmoji: '⏳',
      assign: 'High in the <b>Wizard\'s Tower</b>, fractions multiply upon fractions. Seize the <b>Wizard\'s Hourglass</b> — but beware mixed numbers on the upper floors!',
      done: 'The Wizard\'s Hourglass! You multiplied fractions faster than the wizard could blink.',
    },
    {
      skill: 'word_problems', dungeon: 'Tower of Trials', item: 'Crown of Numbers', itemEmoji: '👑',
      assign: 'Your final task. The <b>Tower of Trials</b> tests everything at once — every problem wrapped in a story. Bring me the <b>Crown of Numbers</b>, and your training is complete!',
      done: 'The Crown of Numbers! You have completed every task. You are a true MathMaker now!',
    },
  ];

  // Monster rosters per dungeon (1-10). Stats come from formulas below.
  MM.data.MONSTERS = [
    { types: [['Slime', '🟢'], ['Field Mouse', '🐁']], boss: ['Giant Slime King', '👑'] },
    { types: [['Cellar Rat', '🐀'], ['Bat', '🦇']], boss: ['Rat Chieftain', '🐀'] },
    { types: [['Cave Spider', '🕷️'], ['Ghost Miner', '👻']], boss: ['Pit Ghoul', '🧟'] },
    { types: [['Wild Boar', '🐗'], ['Forest Imp', '👺']], boss: ['Ruin Golem', '🗿'] },
    { types: [['River Snake', '🐍'], ['Skeleton', '💀']], boss: ['Catacomb Kraken', '🐙'] },
    { types: [['Crystal Crab', '🦀'], ['Ice Sprite', '🧊']], boss: ['Crystal Basilisk', '🐲'] },
    { types: [['Coin Mimic', '🪙'], ['Greedy Ghost', '👻']], boss: ['Vault Keeper', '🤑'] },
    { types: [['Stone Gargoyle', '🦅'], ['Fortress Knight', '⚔️']], boss: ['Fraction Fiend', '😈'] },
    { types: [['Magic Wisp', '✨'], ['Tower Owl', '🦉']], boss: ['Archmage of Errors', '🧙‍♀️'] },
    { types: [['Chaos Imp', '👿'], ['Riddle Sphinx', '🦁'], ['Shadow', '🌑']], boss: ['Lord of Confusion', '🌀'] },
  ];

  MM.data.monsterStats = function (dungeonIdx, isBoss) {
    const i = dungeonIdx;
    if (isBoss) {
      return { hp: 10 + 4 * i, atk: 3 + Math.ceil(i * 0.7), xp: 15 + 5 * i, gold: 15 + 8 * i };
    }
    return { hp: 3 + 2 * i, atk: 1 + Math.ceil(i * 0.7), xp: 3 + 2 * i, gold: 0 };
  };

  MM.data.WEAPONS = [
    { id: 'stick', name: 'Wooden Stick', emoji: '🥢', atk: 1, price: 0 },
    { id: 'dagger', name: 'Bronze Dagger', emoji: '🗡️', atk: 3, price: 40 },
    { id: 'sword', name: 'Steel Sword', emoji: '⚔️', atk: 5, price: 120 },
    { id: 'axe', name: 'Battle Axe', emoji: '🪓', atk: 7, price: 260 },
    { id: 'star', name: 'Star Blade', emoji: '🌟', atk: 10, price: 450 },
  ];

  MM.data.ARMOR = [
    { id: 'clothes', name: 'Traveling Clothes', emoji: '👕', def: 0, price: 0 },
    { id: 'leather', name: 'Leather Armor', emoji: '🧥', def: 1, price: 30 },
    { id: 'chain', name: 'Chain Mail', emoji: '🔗', def: 3, price: 100 },
    { id: 'plate', name: 'Plate Armor', emoji: '🛡️', def: 5, price: 220 },
    { id: 'dragon', name: 'Dragon Scale', emoji: '🐉', def: 7, price: 400 },
  ];

  MM.data.POTION = { name: 'Healing Potion', emoji: '🧪', heal: 15, price: 10 };

  MM.data.weaponById = id => MM.data.WEAPONS.find(w => w.id === id) || MM.data.WEAPONS[0];
  MM.data.armorById = id => MM.data.ARMOR.find(a => a.id === id) || MM.data.ARMOR[0];

  MM.data.taskReward = i => ({ gold: 25 * i, xp: 15 * i });
  MM.data.chestGold = i => 10 + 12 * i + Math.floor(Math.random() * 10);
  MM.data.xpForLevel = level => 20 * level; // xp needed to go from `level` to the next
})();
