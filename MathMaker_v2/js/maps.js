// MathMaker — hand-authored tile maps.
// Overworld: ~ water  . grass  T tree  M mountain  C castle  S shop  I inn
//            n notice board (bounties)  W pier (ship to the Isles, Level 2)
//            1-9,0 dungeon entrances (0 = dungeon 10)  P player start
// Dungeons:  # wall  . floor  D math door  * chest  m monster  b boss  X exit
// Isle dungeons add:  g guard monster  t thief monster  , tide pool (stamina)
//            ^ urchins (2 HP)  _ slick rock (slide!)  o teleport pad (paired)
//            % secret wall  k key  K locked door  L lever  G gate (lever opens)
//            > stairs down  < stairs up  — multi-floor: ISLE_DUNGEONS[n] = [floors]
// Clockwork Spire (dungeon 19) adds:  Z clock door (read-a-clock puzzle)
//            R gear plate (re-lockable: cycles which of A/B/C is open)
// Resonant Halls (dungeon 20) adds:  Y echo door (tone-memory puzzle, no math)
//            s singing stone (flavor: chimes underfoot, no gameplay effect)
// Gullwrack Harbor / Sunken Breakwater (Level 5, dungeon 21) add the
// slab-tiling repair-site mechanic (MM.maps.REPAIR_SITES, engine.js's
// E.applySiteState/E.trySiteBump):
//            r broken floor (repair target)   U pushable stone slab
//            i blueprint plaque (area problem gates that site's pushing)
//            l reset lever (re-spawns that site's slabs to start)
// Wave 12 ("The Proving Rooms") adds two UNIVERSAL tiles + the Workshop Wing:
//            + pressure plate (opens this floor's plate-gates WHILE occupied
//              by the player, the pet, or a pushed slab — OR across plates)
//            & plate-gate (open only while some plate on this floor is held;
//              visibly distinct from the lever-gate G)
//            ! cracked floor (crosses once, then crumbles to a drop chute)
// Wave 13 ("The Understudy & Your Own Room") adds ONE universal tile:
//            ? echo plate — stepping on it summons the Understudy, which
//              replays the player's last 12 steps from the plate as real
//              movement (E.summonUnderstudy, engine.js). Wherever its route
//              ends it stays; on a '+' it HOLDS the plate. Non-letter glyph,
//              zero collision with the NPC alphabet; context guards in
//              tests/test.js. Also: MM.maps.MYROOM (the buildable room
//              behind the Wing's named doorway, mapId 'myroom') and the
//              homesick staircase's authored spot in the Cavern of Echoes.
// The Workshop Wing (mapId 'wing', castle-adjacent, combat-free) owns its
// own alphabet — see MM.maps.WING below.
// The mainland overworld adds  d  skip-count stepping stones (P4) and a
// pond chest '*' near Old Fisher Finn.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  MM.maps = {};

  // The kingdom proper (west, cols 0-37) plus the river and Miscount's bank
  // (east, cols 38-51). The river column is impassable until the bridge ('=')
  // is laid over the BRIDGE cells — that happens when task 10 is complete.
  const WEST = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    // Wave 12 (P4): the skip-count stepping stones — a sea-cove pond north
    // of Old Fisher Finn ('e' at 33,5), clear of the golden spiral's chain
    // (which owns cols ~19-21 up here and the whole eye further south-east).
    // Numeral-carved stones ('d', labels in MM.maps.SKIP_STONES) cross to a
    // chest at (33,2). Walk them in ×2 order (2, 4, 6, 8); a wrong stone is
    // a splash and a walk back to the bank — no HP, no cost, no scold.
    '~~....T.......TT..........T.~~~~~~TT..',
    // The grove beside the castle sits in its original pre-v1.7.1 layout
    // (the compact-spiral edits were reverted for the true golden spiral —
    // see the TURNING_STONES note in data.js). ONE decorative tree moved,
    // (35,8)→(37,7), to clear the numbered "1" stone at the chain anchor.
    '~~..T...................T...~dddd*T...',
    '~~.T.....T.....TTT.H........~ddT~~....',
    '~~..T..........TT..C.n......T.....5...',
    // Wave 7.1: (34,5) was a day-one trap pocket under dungeon 5's door
    '~~.....T..............T..........eMM..',
    '~~...........j.S.Y.....I...q...M.MM...',
    '~~W.T.....T..........................T',
    '~~...........TT....P..h..T...2........',
    '~~..T...1..............T..............',
    '~~.......T.....T...............T....M.',
    '~~.T.......................g..M...MM..',
    '~~........TT........T....T...M.....8..',
    // Wave 10 (P3): the fence east of the farm, at (32-34,13) — 'F' reads
    // its broken/mended sprite live off s.tasksDone.includes(6) (see
    // tileSprite below), the same "no grid rewrite needed" trick as the
    // Open Castle's furnishing tiles.
    '~~..T....................4...a..FFF...',
    '~~....T......T...........T....T...M...',
    '~~....3..........T....................',
    '~~.........T.................T....M...',
    '~~..T..........T...........7......MM..',
    '~~......T.............T...............',
    '~~...T......6.......T.........T...M...',
    '~~.......T...............T........MM..',
    '~~..T............9............M...0M..',
    '~~.....T.....T.........T......MM..MM..',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];
  // A = Cavern of Echoes (11), B = Sunken Library (12), K = Star Peak (13)
  const EAST = [
    '~~~~~~~~~~~~~~',
    '~~~.T.......~~',
    '~~~......T..~~',
    '~~~..T..A...~~',
    '~~~.....M...~~',
    '~~~.......M.~~',
    '~~~.T.......~~',
    '~~~.........~~',
    '~~~...T..B..~~',
    '~~~.........~~',
    '~~~....T....~~',
    '~~~...u.....~~',
    '~~~.........~~',
    '~~~..T...T..~~',
    '~~~.........~~',
    '~~~.....M...~~',
    '~~~..K.MM...~~',
    '~~~..T......~~',
    '~~~.........~~',
    '~~~...T.....~~',
    '~~~......M..~~',
    '~~~.........~~',
    '~~~..T......~~',
    '~~~~~~~~~~~~~~',
  ];
  MM.maps.OVERWORLD = WEST.map((row, i) => row + EAST[i]);

  // river cells that become walkable bridge planks after task 10
  MM.maps.BRIDGE = [{ x: 38, y: 11 }, { x: 39, y: 11 }, { x: 40, y: 11 }];

  // --- Dungeon 1: Meadow Cave (gentle intro: few monsters, simple layout)
  const D1 = [
    '##########################',
    '#........#.......#.....*.#',
    '#..m.....#..m....#.......#',
    '#........D.......D...m...#',
    '#........#.......#.......#',
    '#####.####.......####.####',
    '#........#.......#.......#',
    '#...*....#...m...#...b...#',
    '#........#.......#.......#',
    '#........####D####.......#',
    '#..m.....#.......####D####',
    '#........#.......#.......#',
    '#####D####.......D.......#',
    '#........#...m...#..m....#',
    '#...X....#.......#.......#',
    '##########################',
  ];

  // --- Dungeon 2: Rat Cellar (winding cellar corridors)
  // 1.5b fixes: the D at (14,10) used to open onto solid wall (a true dead
  // end) — it now guards a chest. The room at (1-2,7)/(4-5,7) used to flood
  // south past its own south wall via columns 1,2,4,5 (row7 was only walled
  // at column 3), letting you walk clean around the D at (7,11); row 7 is
  // now walled all the way across so that door is the only way through.
  const D2 = [
    '##########################',
    '#.....#.....m....#....*..#',
    '#..m..#..........#.......#',
    '#.....#....###...D...m...#',
    '#..#..#....#.....#....####',
    '#..#..D....#..*..#....#..#',
    '#..#..#....#.....####.#..#',
    '############.....#....D..#',
    '#..#.......#..m..#..###..#',
    '#..#####...#.....#..#....#',
    '#..m...#...###D###..#..m.#',
    '#......D......*.....#....#',
    '####...#...m..#..#######D#',
    '#..#...####...#..#.......#',
    '#..D...#..#.X.#..D...b...#',
    '##########################',
  ];

  // --- Dungeon 3: Old Mine (long shafts)
  // 1.5b fix: the D at (15,13) used to be bypassable via a loop through
  // column 10 up into the big room at row 4 and back down column 15 — (10,13)
  // is now walled so the door is the only way across.
  const D3 = [
    '##########################',
    '#..m.....................#',
    '#.....#####D#####.####...#',
    '#..*..#....m....#.#..#.m.#',
    '#.....#.........#.#..#...#',
    '####D##...###...#.#..##D##',
    '#......m..#.#...D.#......#',
    '#..........#.#..#.#...m..#',
    '#..#######.#.#..#.####...#',
    '#..#.....#.#.#..#....#...#',
    '#..#..m..D.#.#..####.##D##',
    '#..#.....#.#.m.....#.#...#',
    '#..##....#.#####...#.#.b.#',
    '#...D....##....D...#%D...#',
    '#..##....#..X..#...#*#.*.#',
    '##########################',
  ];

  // --- Dungeon 4: Forest Ruin (crumbled rooms, open center)
  // Wave 5 "Deep Wing": (1,0)/(1,1) is a new locked stairwell down into the
  // Overgrown Annex — a key (24,1) waits in the NE corner. Neither tile
  // touches the original maze's doors/rooms, so the existing puzzle is
  // untouched; the key is just an extra thing to notice on the way through.
  const D4 = [
    '#>########################',
    '#K*...#........#.....m..k#',
    '#.....#...m....#.........#',
    '#..m..D........D....###..#',
    '#.....#........#....#b#..#',
    '###.###..####..#....#D#..#',
    '#.....#..#..#..####.#.#..#',
    '#..m..#..#m.D.....#.#.#..#',
    '#.....#..#..#..m..D.#.#..#',
    '#..#####.####.....#.#.#..#',
    '#..#...#........###.#.#..#',
    '#..D.m.#...m....#...#.#m.#',
    '#..#...#........#.###.#..#',
    '#..#...####D#####.#*..D..#',
    '#..#......X.......#...#..#',
    '##########################',
  ];

  // --- Dungeon 5: River Catacombs (narrow crypt halls)
  // 1.5b fix: a side hallway at columns 6-7 ran the full height of the room,
  // letting you walk around BOTH doors at (10,7) and (14,7) via row 8. Row 7
  // now walls that hallway shut at columns 6-7 (matching its col-8 wall), so
  // each door is the only way between its own compartment and row 8 below.
  const D5 = [
    '##########################',
    '#....#..m...#...m...#..*.#',
    '#.m..#......#.......#....#',
    '#....#..##..#..##...D....#',
    '#....D..#...#...#...#....#',
    '##.###..#.m.#.m.#...######',
    '#....#..#...#...#........#',
    '#....#####D###D##....m...#',
    '#.m..#..........#........#',
    '#....####......m#..###D###',
    '#.......#.......#..#.....#',
    '####....#..m....#..#..b..#',
    '#..#....#....####..#.....#',
    '#..D....#....D.....##...##',
    '#..#..*.#.X..#......#....#',
    '##########################',
  ];

  // --- Dungeon 6: Crystal Grotto (organic caves)
  const D6 = [
    '##########################',
    '#...m....#....m...#....*.#',
    '#........#........#......#',
    '#..##....D...##...D...m..#',
    '#...##...#...##...#......#',
    '#....#...#........###D####',
    '#.m..#...####..m..#......#',
    '#....#......#.....#..m...#',
    '###D##..*...#.....#......#',
    '#....#......###D###...####',
    '#....######.#.....#...#..#',
    '#.m.......#.#..m..#...D..#',
    '#.........#.#.....##..#..#',
    '####..m...#.#..#...#..#b.#',
    '#*%X......D.#..#...#..#..#',
    '##########################',
  ];

  // --- Dungeon 7: Merchant's Vault (strongrooms and corridors)
  // Wave 5 "Deep Wing": (1,0)/(1,1) locked stairwell down into the Counting
  // House; the key sits at (24,2), well clear of the original maze's rooms.
  const D7 = [
    '#>########################',
    '#K.*..#....m...#.....#.b.#',
    '#.....#........#..m..#..k#',
    '#..m..D..###...D.....#D###',
    '#.....#..#.#...#.....#...#',
    '#######..#.#...#######...#',
    '#....m...#.#........#..m.#',
    '#........#.#....m...#....#',
    '#..####D##.######...##...#',
    '#..#......m....#....#....#',
    '#..#...........#.*..D....#',
    '#..#..######...#....#..###',
    '#..#..#....#...######..#.#',
    '#..D..#.m..D........D..#.#',
    '#..#..#....#...X....#..*.#',
    '##########################',
  ];

  // --- Dungeon 8: Fraction Fortress (nine chambers, boss vault mid-right)
  const D8 = [
    '##########################',
    '#..m....#....*...#....m..#',
    '#.......#........#.......#',
    '#.......D........D.......#',
    '#.......#........#.......#',
    '####D####........####D####',
    '#.......#........#.......#',
    '#..m....#...m....#....m..#',
    '#.......#........D.......#',
    '#....*..D........#..b....#',
    '###D#####........#########',
    '#..m....#........#.......#',
    '#.......#...m....D....m..#',
    '#.......#........#.......#',
    '#..X....#....*...#....*..#',
    '##########################',
  ];

  // --- Dungeon 9: Wizard's Tower (spiral to the boss floor, top-left)
  // Wave 5 "Deep Wing": (1,0)/(1,1) locked stairwell down into the
  // Forgotten Study; the key sits at (24,7), far from the boss's corner.
  const D9 = [
    '#>########################',
    '#K.b....#...m....#....*..#',
    '#.......#........#.......#',
    '#.......D........#.......#',
    '#.......#........D.......#',
    '#############D############',
    '#..m....%........#..m....#',
    '#..*....#...*....#......k#',
    '#.......D........D.......#',
    '#..m....#........#.......#',
    '####D################D####',
    '#.......#..m.....#....m..#',
    '#..m....D........#.......#',
    '#.......#........#.......#',
    '#...*...#...X....D....m..#',
    '##########################',
  ];

  // --- Dungeon 10: Tower of Trials (the final gauntlet, boss top-right)
  const D10 = [
    '##########################',
    '#....m..#..m.....#....b..#',
    '#.......#........#.......#',
    '#..m....D........D.......#',
    '#.......#........#.......#',
    '####D#######D#############',
    '#..m....#....m...#.......#',
    '#.......#........#...*...#',
    '#.......D........D.......#',
    '#....m..#...m....#..m....#',
    '#############D#######D####',
    '#..m....#........#....m..#',
    '#.......D...m....#.......#',
    '#.......#........#..m....#',
    '#..*....#...X....#....*..#',
    '##########################',
  ];

  // --- Expansion dungeon 11: Cavern of Echoes (mixed review of everything)
  // Wave 13 (P1 leak-back): the SW room is now the cavern's ECHO PLATE room
  // — the name finally pays. '?' at (3,11), pressure plate '+' at (7,11)
  // dead-ended against the east wall (the wall-stop catches an overshooting
  // Understudy ON the plate), and a plate-gate '&' (6,13) sealing a chest
  // pocket (7,13) with no interior floor (bumped from the gate tile — the
  // v1.8.2 rule: a closing gate can never trap anyone). There are no slabs
  // in this dungeon, so the Understudy is the only thing that can hold the
  // plate while the kid walks to the gate. The displaced monster marker
  // moved (3,12) -> (13,11) — same floor, same count.
  // Wave 13 (P3): the homesick staircase stands at MM.maps.STAIRCASE_SPOT
  // (plain floor, drawn as an entity — never a grid glyph).
  const D11 = [
    '##########################',
    '#..m....#....m...#....m..#',
    '#.......#........#.......#',
    '#....*..D........D.......#',
    '#.......#........#....m..#',
    '####D####........####D####',
    '#.......#...m....#.......#',
    '#..m....#........#....*..#',
    '#.......#........D.......#',
    '#.......D...m....#..b....#',
    '###D#####........#########',
    '#..?...+#....m...#....m..#',
    '#......##........D.......#',
    '#.....&*#...m....#.......#',
    '#..X...##....*...#....m..#',
    '##########################',
  ];

  // --- Expansion dungeon 12: Sunken Library (the ghosts have been studying)
  const D12 = [
    '##########################',
    '#..b....#...m....#..m....#',
    '#.......#........#.......#',
    '#.......D........#....*..#',
    '#.......#........D.......#',
    '#############D############',
    '#..m....#........#...m...#',
    '#.......#...*....#.......#',
    '#....m..D........D.......#',
    '#.......#...m....#....m..#',
    '####D################D####',
    '#.......#..m.....#.......#',
    '#..m....D........#...m...#',
    '#.......#........#.......#',
    '#...*...#...X....D.......#',
    '##########################',
  ];

  // --- Expansion dungeon 13: Star Peak (the hardest climb in the kingdom)
  const D13 = [
    '##########################',
    '#....m..#..m.....#....b..#',
    '#.......#........#.......#',
    '#..m....D........D.......#',
    '#.......#....m...#.......#',
    '####D#######D#############',
    '#..m....#........#...m...#',
    '#.......#...m....#...*...#',
    '#....m..D........D.......#',
    '#.......#...m....#..m....#',
    '#############D#######D####',
    '#..m....#........#....m..#',
    '#.......D...m....#.......#',
    '#..m....#........#..m....#',
    '#..*....#...X....#....*..#',
    '##########################',
  ];

  MM.maps.DUNGEONS = [D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D13];

  // ===== Wave 5 item 1: "Deep Wings" — a locked second floor tucked behind
  // a new K/k pair on dungeons 4, 7, and 9 (see the comments on those maps
  // above). Every problem here draws from ALL topics (see engine.js's
  // `E.isDeepWingFloor` — task.mixed is a whole-dungeon flag and these three
  // dungeons otherwise keep their single fixed skill, so the mixed-review
  // behavior is floor-scoped instead). One guaranteed glimmering (gem)
  // chest each (see engine.js GUARANTEED_GEM_CHESTS: d4f1/d7f1/d9f1).
  const D4_DEEP = [
    '##########################',
    '#<...........#...........#',
    '#............#...........#',
    '#....m.......#...........#',
    '#............#......m....#',
    '#............#...........#',
    '#............#...........#',
    '#............D...........#',
    '#............#.....*.....#',
    '#............#...........#',
    '#............#...........#',
    '#....m.......#...........#',
    '#............#...........#',
    '#............#...........#',
    '#............#...........#',
    '##########################',
  ];
  const D7_DEEP = [
    '##########################',
    '#<.......................#',
    '#........................#',
    '#.................m......#',
    '#.....m..................#',
    '#........................#',
    '#........................#',
    '#..............g*........#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#.........m..............#',
    '#........................#',
    '#........................#',
    '#........................#',
    '##########################',
  ];
  const D9_DEEP = [
    '##########################',
    '#<.......................#',
    '#........................#',
    '#......m.................#',
    '#..................m.....#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#...................%*...#',
    '#........................#',
    '#........m...............#',
    '#........................#',
    '#........................#',
    '#........................#',
    '##########################',
  ];
  MM.maps.DEEP_WINGS = { 4: D4_DEEP, 7: D7_DEEP, 9: D9_DEEP };

  // ===== Level 2: the Uncharted Isles (multi-floor dungeons) =====
  // Dungeon 14 — Tidepool Grotto, floor 1 (entry). Teleport pads shortcut the
  // sealed NW room; a guard crab parks in the key-room doorway; the key opens
  // the locked door to the stairs; a cracked wall hides a treasure alcove; a
  // slick-rock slide guards the SE chest.
  const TIDEPOOL_F1 = [
    '##########################',
    '#o...#.....t........#.>..#',
    '#....#....,,,.......#....#',
    '#.,,.#....,,,..m....#....#',
    '#....#..............#....#',
    '###D####.........####K####',
    '#.........^^..........#.*#',
    '######................%..#',
    '#.k..g................####',
    '#....#...m...............#',
    '######...................#',
    '#..........,,,......o....#',
    '#..X.......,,,,..........#',
    '#..........,,,...........#',
    '#..................___.*.#',
    '##########################',
  ];
  // Floor 2 (the lens chamber). A guard at the entry choke, a lever that opens
  // the gated treasure nook, a pad shortcut back toward the stairs, and The
  // Old Current coiled in the southeast.
  const TIDEPOOL_F2 = [
    '##########################',
    '#<...#.......#...........#',
    '#....#..,,,..#....GGG....#',
    '#....g.......#....#*#....#',
    '#....#.......#....###..L.#',
    '#.o..#...m...#...........#',
    '#....#...................#',
    '######..###############..#',
    '#........#......#........#',
    '#..,,,...#..o...#....b...#',
    '#.,,,....................#',
    '#........#......#........#',
    '#.m......#......#........#',
    '##########################',
  ];
  // Dungeon 15 — Frostbite Hollow, floor 1. The great frozen lake: the only
  // way between the south hall and the north gallery is to slide across it.
  // The key sits behind a Sentinel; the key door locks the stairs shaft; a
  // cracked wall in the south hides a frozen cache.
  const FROSTBITE_F1 = [
    '##########################',
    '#.k..#......,,......#..>.#',
    '#....#......,,..m...#....#',
    '#....#..............#....#',
    '#g####..............#K####',
    '#....#______________#....#',
    '#....#______________#....#',
    '#.m..#______________#.,,.#',
    '#....#______________#.,,.#',
    '#....#______________#....#',
    '#....#______________#....#',
    '#........................#',
    '#...m................##%##',
    '#..X................#...*#',
    '#....................#####',
    '##########################',
  ];
  // Floor 2 — the ice-floe puzzle. Rocks are the only brakes: pick the right
  // columns and rows to skid to a stop. The lever opens the gate to the
  // Glacier's Heart; a pad-locked cache holds treasure for careful sliders.
  const FROSTBITE_F2 = [
    '##########################',
    '#<...#______________#....#',
    '#....#___#______#__.G.b..#',
    '#.g..#______________#....#',
    '#....#___#_____#____######',
    '#.o..#______________#....#',
    '#....#____#______#....L..#',
    '#....#______________######',
    '#.,,.#___#______#___#...*#',
    '#.,,.#______________#.o..#',
    '#....#______________######',
    '#.m..#______________#.m..#',
    '#........................#',
    '##########################',
  ];
  // Dungeon 16 — Cinderforge Depths: THREE floors, the game's deepest dungeon.
  // v = drop chute: the floor gives way and you fall to the same spot one
  // floor down — no climbing back up that hole. Cinder shards (^) sting.
  // Floor 1 — the mine head: key behind the guard, locked stairs, a walled
  // furnace room with a cracked wall.
  const CINDER_F1 = [
    '##########################',
    '#.k..#......^^......#..>.#',
    '#....#......^^..m...#....#',
    '#....#..............#....#',
    '#g####..............#K####',
    '#....#...########...#....#',
    '#....#...#*.....#...#.^^.#',
    '#.m..#...%......#...#.^^.#',
    '#....#...#......#...#....#',
    '#....#...########...#....#',
    '#........................#',
    '#...m..........t.........#',
    '#..X.....................#',
    '#.....^^..........^^.....#',
    '##########################',
  ];
  // Floor 2 — the forge: a second key opens the caged stairs; the lever opens
  // the gates to a chute room — a one-way shortcut straight down to floor 3.
  const CINDER_F2 = [
    '##########################',
    '#<...#..........t...#.v..#',
    '#..........^^.......#....#',
    '#.g..#..............#GG###',
    '#....#....#####.....#....#',
    '#.k..#....#.>.#.....#....#',
    '#....#....##K##.....#.L..#',
    '#....#..............#....#',
    '######..^^......^^..#....#',
    '#....#..............#....#',
    '#.m..#....m....m....#....#',
    '#........................#',
    '##########################',
  ];
  // Floor 3 — the foundry: the Foreman waits among the cinder beds; the chute
  // from floor 2 drops you beside a thank-you chest.
  const CINDER_F3 = [
    '##########################',
    '#.<..#..............#....#',
    '#....#..^^......^^..#.*..#',
    '#...................#....#',
    '#....#......##...........#',
    '######......##......######',
    '#........................#',
    '#...........b............#',
    '#......^^........^^......#',
    '#....m..............m....#',
    '#........................#',
    '##########################',
  ];
  // Dungeon 17 — the Great Lighthouse: FOUR floors, one mechanic reprised
  // each (slides, pads, keys, chutes), finishing at the Murk's lamp room.
  // Floor 1 — "The Tideglass Stair": a slick-rock lake fills the central
  // hall; the key behind its guard opens the locked stairs shaft.
  const LIGHT_F1 = [
    '##########################',
    '#.k..#______________#..>.#',
    '#....#______________#....#',
    '#....#______________#....#',
    '#g....______________K....#',
    '#....#______________#....#',
    '#....#______________#.m..#',
    '#.m..#______________#....#',
    '#.....______________#....#',
    '#....#______________#....#',
    '#....#______________######',
    '#........................#',
    '#..Xm#..............#.#%##',
    '#....#..............#.#*##',
    '#....#..............#....#',
    '##########################',
  ];
  // Floor 2 — "The Lens Gallery": two teleport-pad shortcuts thread a
  // guarded gallery; the key past the guard opens a small locked pocket
  // (NE corner) that's the '>' stairs' only entrance — 1.5b fix: the key
  // used to stand free in open floor, gating nothing.
  const LIGHT_F2 = [
    '##########################',
    '#<..........#.........#.>#',
    '#.k.........#.........K..#',
    '#..o..................o###',
    '#...........#............#',
    '#...........#.....m......#',
    '#.g.........#............#',
    '#........................#',
    '#.............#####.######',
    '#....m...................#',
    '#........................#',
    '#........................#',
    '#..o............o........#',
    '#........................#',
    '#........................#',
    '##########################',
  ];
  // Floor 3 — "The Cage of Wicks": two keys gate the path to the stairs
  // down; a lever tucked in the NE corner opens a gated one-way chute — a
  // shortcut straight to the lamp room (mirrors Cinderforge's F2).
  const LIGHT_F3 = [
    '##########################',
    '#<......#........#..#....#',
    '#.......#........#..L.GGv#',
    '#.k.....#....m...#..#....#',
    '#.......#........#.......#',
    '#.......K........#.......#',
    '#.......#..k.....#.......#',
    '#.......#........#.......#',
    '#...g...#........#..m....#',
    '#.......#........#.......#',
    '#.......#........K.......#',
    '#.......#........#.......#',
    '#.....m.#........#.......#',
    '#.......#........#......>#',
    '#.......#........#.......#',
    '##########################',
  ];
  // Floor 4 — "The Lamp Room": reached by the stairs OR the chute (which
  // lands at the same (24,2), beside a chest); the Murk waits at the center.
  const LIGHT_F4 = [
    '##########################',
    '#<.......................#',
    '#......................*.#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#..m.....................#',
    '#........................#',
    '#...........b............#',
    '#........................#',
    '#...................m....#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#........................#',
    '##########################',
  ];
  // Dungeon 18 — the Smugglers' Vault: one dense floor, never assigned,
  // found only via the pet's nose or a nudge on the isle overworld. A thief
  // gauntlet, the game's best treasure density, a guarded chest holding the
  // first ranged weapon, and a secret alcove.
  // Wave 12 (P2): the SE room gains the game's first pressure-plate puzzle
  // in existing content — a free slab (U, MM.maps.FREE_SLABS), a plate (+)
  // and a plate-gate (&) guarding a walled chest pocket. The pocket has no
  // interior floor (the chest is bumped from the gate tile itself), so a
  // closing gate can never trap anyone. Slab-on-plate is the canonical
  // solution; a pet on the plate works too, as a delight.
  const VAULT_F1 = [
    '##########################',
    '#........#........#......#',
    '#..t.....#..g.....#......#',
    '#........#...*....#.m....#',
    '#...m....#........#......#',
    '#........#........#......#',
    '#....t...#........#......#',
    '#.................#......#',
    '#........#...........b...#',
    '#........#........#......#',
    '#.*......#.t......#.U.+..#',
    '#........#........#...#&##',
    '#.....*..#.....*..#...#*##',
    '#X.......#%.......#....#.#',
    '#........#*.......#......#',
    '##########################',
  ];
  // Dungeon 19 — the Clockwork Spire, on its own third-continent isle
  // (Horologe Isle, below): the biggest dungeon yet, five floors at 40
  // columns wide (double the mainland's 26). Two new Wave-3 mechanics:
  //   Z = clock door — like 'D', but the puzzle is always a clock reading
  //       (see E.clockDoor); solving it opens the tile for good, same as 'D'.
  //   R = gear plate — a re-lockable 3-state lever. Pulling it cycles which
  //       ONE of the three gates 'A'/'B'/'C' is open (the other two snap
  //       shut); unlike every other lever in the game this is NOT one-shot
  //       (see E.applyGearState). Here it only ever gates optional bonus
  //       loot alcoves — the main path never depends on which gate is open.
  // Floor 1 — "The Entry Gears": a guard parks on the only key in the room;
  // the key unlocks a locked door; a clock door gates the final stretch to
  // the stairs down.
  const SPIRE_F1 = [
    // Wave 6.5: the free-floating K and Z now each gate a small vault —
    // a door that opens onto nothing reads as a glitch (door audit)
    '########################################',
    '#.........#....#*#........#..###.......#',
    '#...m.....#....#K#........#..#*#.......#',
    '#.........#...............#..#Z#.......#',
    '#.........#............................#',
    '#####.#####...............#............#',
    '#.........#...............######.#######',
    '#..g.k....#...............#........m...#',
    '#...................*.....#............#',
    '#.........#...............######.#######',
    '#####.#####...............#............#',
    '#.........#............................#',
    '#.....m...#...............#........>...#',
    '#.X.......#.....m.........#............#',
    '#.........#...............#............#',
    '########################################',
  ];
  // Floor 2 — "The Rotating Vaults": the gear plate (R) cycles which of
  // three alcoves (A/B/C, each holding a chest) is open — purely bonus
  // loot, since the main corridor to the stairs never crosses a gate.
  const SPIRE_F2 = [
    '########################################',
    '#.....####......####......####.........#',
    '#.....#*.#......#*.#......#*.#.........#',
    '#.....#..#......#..#......#..#.........#',
    '#.....#A##......#B##......#C##.........#',
    '#......................................#',
    '#.............................t........#',
    '#................R.....................#',
    '#......................................#',
    '#...........g..........................#',
    '#......................................#',
    '#......................................#',
    '#..m................m..................#',
    '#.<.................................>..#',
    '#......................................#',
    '########################################',
  ];
  // Floor 3 — "The Cuckoo's Landing": Cuckoos steal gold and shout, waking
  // every other monster on the floor into a chase (E.monsterTurn). A second
  // clock door gates the stretch to the stairs; a cracked wall hides a cache.
  const SPIRE_F3 = [
    '########################################',
    '#...................#..................#',
    '#...................#..................#',
    '#....t..............#.........%*.......#',
    '#...................#..................#',
    '#...................#..................#',
    '#.............m.....#..................#',
    '#...................Z..................#',
    '#...................#................>.#',
    '#...............m...#..................#',
    '#...................#....t.............#',
    '#.......t...........#..................#',
    '#...................#..................#',
    '#.<.................#............m.....#',
    '#...................#..................#',
    '########################################',
  ];
  // Floor 4 — "The Great Escapement": a classic one-shot lever (L) opens
  // every gate (G) barring the way forward — same contract as every other
  // L/G in the game. A side key behind a guard opens a locked pocket chest.
  const SPIRE_F4 = [
    // Wave 6.5: the side key's "locked pocket chest" is now actually a
    // pocket — the K stood in open floor with the chest loose beside it
    '########################################',
    '#....k.....#*#.........................#',
    '#.....g.....K........................>.#',
    '#..L..................t................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#.........G#########G#########G........#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#..............m..................m....#',
    '#.<......................m.............#',
    '#......................................#',
    '########################################',
  ];
  // Floor 5 — "The Clock Heart": the boss floor. The Unwound King waits at
  // the center; a guaranteed gem chest sits behind the throne.
  const SPIRE_F5 = [
    '########################################',
    '#......................................#',
    '#...................................*..#',
    '#......................................#',
    '#.......m..............................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#...................b..................#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#...............................m......#',
    '#.<....................................#',
    '#......................................#',
    '########################################',
  ];

  // Dungeon 20 — the Resonant Halls, on Chime Isle (Level 4, Wave 4): four
  // floors. Two new mechanics:
  //   Y = echo door — a memory puzzle, not math: the door plays a 3-5 tone
  //       sequence and the kid repeats it on colored tone buttons (see
  //       E.echoDoor / UI.showEchoDoor). Always replayable, no timer.
  //   s = singing stone — pure flavor: chimes a scale note when stepped on,
  //       no gameplay effect (see E.tileEffects).
  // Floor 1 — "The Overture": a guard parks on the key; singing stones line
  // a side corridor; an echo door gates the final stretch to the stairs.
  const HALLS_F1 = [
    // Wave 6.5: the K and echo door Y each now gate a real pocket —
    // both stood in open floor gating nothing (door audit)
    '##########################',
    '#...........#.#*#........#',
    '#.....sss...#.#K#........#',
    '#...m.......#.......*....#',
    '#...........#....#.......#',
    '#...........#...#*#......#',
    '#..g.k......#....Y.......#',
    '#........................#',
    '#...........#............#',
    '#...........#............#',
    '#.......m...#............#',
    '#...........#.........>..#',
    '#.X.........#............#',
    '#...........#............#',
    '##########################',
  ];
  // Floor 2 — "The Gatehouse": a classic one-shot lever opens the three
  // gates barring the way to the stairs, same contract as every other L/G.
  const HALLS_F2 = [
    '##########################',
    '#...........ss...........#',
    '#.........g..............#',
    '#...L...............m..>.#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#.......G####G####G......#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#...............t....*...#',
    '#.<......................#',
    '#........................#',
    '##########################',
  ];
  // Floor 3 — "The Coda": a second echo door; a cracked wall hides a cache.
  const HALLS_F3 = [
    '##########################',
    '#.............#..........#',
    '#.............#.....%*...#',
    '#.............#..........#',
    '#....t........#..........#',
    '#.............#..........#',
    '#.............Y........>.#',
    '#.............#..........#',
    '#.............#..........#',
    '#........t....#..........#',
    '#.............#..m.......#',
    '#.............#..........#',
    '#.<...........#..........#',
    '#.............#..........#',
    '##########################',
  ];
  // Floor 4 — "The Finale": the boss floor. The Discord waits at the center.
  const HALLS_F4 = [
    '##########################',
    '#........................#',
    '#.....................*..#',
    '#.....m..................#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#............b...........#',
    '#........................#',
    '#........................#',
    '#........................#',
    '#...................m....#',
    '#.<......................#',
    '#........................#',
    '##########################',
  ];

  // Dungeon 21 — Sunken Breakwater, Gullwrack Harbor's finale. A waterlogged
  // storeroom; floor 1's rubble wall splits the room in two — the long way
  // around costs a math door, the shortcut (the dungeon's one repair site,
  // 2 slabs pushed EAST) is a free bypass once its blueprint is solved.
  // Wave 6.5: the rubble wall now actually splits the room (its top and
  // bottom thirds were open, so the D and the repair-site shortcut both
  // gated nothing — door audit); broken 'r' tiles are also impassable
  // until mended (engine), so the shortcut is a real shortcut.
  const BREAKWATER_F1 = [
    '##########################',
    '#X...........#...........#',
    '#............#...........#',
    '#..m.........#......t....#',
    '#............#...........#',
    '#.....*.....g#...........#',
    '#.........i.Ur...........#',
    '#...........Ur...........#',
    '#.........l..#...........#',
    '#............#...........#',
    '#............D......m....#',
    '#............#...........#',
    '#............#.........>.#',
    '#............#...........#',
    '##########################',
  ];
  // Floor 2 — the flooded chamber. The Undertow waits at the center.
  const BREAKWATER_F2 = [
    '##########################',
    '#........................#',
    '#........................#',
    '#...................b....#',
    '#.................g......#',
    '#........................#',
    '#.....g..................#',
    '#........................#',
    '#........................#',
    '#...........t............#',
    '#.<......*...............#',
    '#........................#',
    '##########################',
  ];
  // Repair-site descriptors (Wave 6 slab-tiling mechanic — see engine.js's
  // E.applySiteState/E.trySiteBump): plaque {x,y}, lever {x,y}, and
  // slab/broken pairs, each pair exactly one push apart along pushDir so a
  // single bump from the opposite side always solves it (verified by a BFS
  // in tests/test.js). mapId keys must match E.enterDungeon/E.enterGullwrack's
  // s.mapId for that floor/town.
  MM.maps.REPAIR_SITES = {
    d21f0: [
      { id: 'shortcut', plaque: { x: 10, y: 6 }, lever: { x: 10, y: 8 }, pushDir: 'E',
        pairs: [
          { slab: { x: 12, y: 6 }, broken: { x: 13, y: 6 } },
          { slab: { x: 12, y: 7 }, broken: { x: 13, y: 7 } },
        ] },
    ],
    gullwrack: [
      { id: 'pier', plaque: { x: 5, y: 5 }, lever: { x: 7, y: 5 }, pushDir: 'E',
        pairs: [
          { slab: { x: 6, y: 6 }, broken: { x: 7, y: 6 } },
          { slab: { x: 6, y: 7 }, broken: { x: 7, y: 7 } },
        ] },
      { id: 'bakery', plaque: { x: 30, y: 6 }, lever: { x: 32, y: 6 }, pushDir: 'S',
        pairs: [
          { slab: { x: 30, y: 8 }, broken: { x: 30, y: 9 } },
          { slab: { x: 32, y: 8 }, broken: { x: 32, y: 9 } },
        ] },
      { id: 'seawall', plaque: { x: 16, y: 11 }, lever: { x: 16, y: 10 }, pushDir: 'W',
        pairs: [
          { slab: { x: 12, y: 10 }, broken: { x: 11, y: 10 } },
          { slab: { x: 12, y: 11 }, broken: { x: 11, y: 11 } },
          { slab: { x: 12, y: 12 }, broken: { x: 11, y: 12 } },
        ] },
      { id: 'shed', plaque: { x: 22, y: 13 }, lever: { x: 24, y: 13 }, pushDir: 'N',
        pairs: [
          { slab: { x: 23, y: 11 }, broken: { x: 23, y: 10 } },
          { slab: { x: 25, y: 11 }, broken: { x: 25, y: 10 } },
          { slab: { x: 27, y: 11 }, broken: { x: 27, y: 10 } },
        ] },
    ],
  };
  // town-only site ids (the 4 that must ALL complete for the "town rebuilt"
  // payoff + Mason's Charm — the dungeon shortcut doesn't count)
  MM.maps.GULLWRACK_TOWN_SITES = ['pier', 'bakery', 'seawall', 'shed'];

  MM.maps.ISLE_DUNGEONS = {
    14: [TIDEPOOL_F1, TIDEPOOL_F2],
    15: [FROSTBITE_F1, FROSTBITE_F2],
    16: [CINDER_F1, CINDER_F2, CINDER_F3],
    17: [LIGHT_F1, LIGHT_F2, LIGHT_F3, LIGHT_F4],
    18: [VAULT_F1],
    19: [SPIRE_F1, SPIRE_F2, SPIRE_F3, SPIRE_F4, SPIRE_F5],
    20: [HALLS_F1, HALLS_F2, HALLS_F3, HALLS_F4],
    21: [BREAKWATER_F1, BREAKWATER_F2],
  };

  // ===== the Isles overworld =====
  // W dock (sail home)  P arrival spot  c Keeper Callie  p Old Salt Percy
  // S Brass Compass shop  I inn  n notice board (bounties)
  // f Emberlyn the Enchanter (Wave 2: gem fusing + amulets)
  // 1 Tidepool Grotto (=dungeon 14)  2 Frostbite Hollow  3 Cinderforge Depths
  // 4 Smugglers' Vault (=dungeon 18) — hidden behind '%' until found
  // H the Great Lighthouse (=dungeon 17, sealed until 3 lenses shine)
  // u/v/w = MURK FOG, impassable; u clears when the Tide Lens is lit,
  // v with Frostbite's lens, w with Cinderforge's (engine.enterIsles).
  // % secret wall on the south beach — a pet's nose (or a nudge) finds it;
  // opens into '4', same persistence scheme as dungeon secret walls.
  MM.maps.ISLES = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~M.H.M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~M...M~~~~~~~~~~~~~~~M....M~~~~~~~~',
    '~~~~~~MvvvM~~~~~~~....T..M...2..M~~~~~~~',
    '~~~~~~MwwwM~~~~~....................M~~~',
    '~~~~~M....M~~..T.........T.......M~~~~~~',
    '~~~~M......~....................3..M~~~~',
    '~~~M.........T.......T....M...MM..~~~~~~',
    '~~~M..............................~~~~~~',
    '~~~uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu~~~~~',
    '~~~........T..................T...~~~~~~',
    '~~..1...T.....................T...~~~~~~',
    '~~....T........c.n.S...I.f........~~~~~~',
    '~~..T.......p.......Y.............~~~~~~',
    '~~~....T.....................T...~~~~~~~',
    '~~~~..........P..................~~~~~~~',
    '~~~~~%~~~~~~~~W~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== Horologe Isle overworld (Level 3) =====
  // W dock  P arrival  5 the Clockwork Spire (=dungeon 19)
  // z Tobbin the Clocksmith (Wave 6.5 — every island gets a greeter)
  // T scattered wind-bent trees so the isle reads as a place
  MM.maps.HOROLOGE = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    // Wave 7.1: the ring gap above the Spire was a TRAP tile — a player
    // placed at (20,2) could never leave (ocean/mountains/entrance).
    '~~~~~~~~~~~~~~MMMMMMMMMMMMM~~~~~~~~~~~~~',
    '~~~~~~~~~MMM........5........MMM~~~~~~~~',
    '~~~~~~MMM......T.........T......MMM~~~~~',
    '~~~~~MM...........................MM~~~~',
    '~~~~MM....T....................T....MM~~',
    '~~~~M...............................M~~~',
    '~~~~MM............P......z.........MM~~~',
    '~~~~~MM..............T............MM~~~~',
    '~~~~~~MMM.......................MMM~~~~~',
    '~~~~~~~~~MMM......S.W........MMM~~~~~~~~',
    '~~~~~~~~~~~~~~MMMMMM.MMMMMM~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== Chime Isle overworld (Level 4, Wave 4) =====
  // W dock  P arrival  6 the Resonant Halls (=dungeon 20)
  // x Bell-keeper Brona (Wave 6.5)  s singing stones by the path
  MM.maps.CHIME = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    // Wave 7.1: the two pockets flanking the hall were trap tiles too
    '~~~~~~~~~~MMMMM6MMMMM~~~~~~~~~',
    '~~~~~~MM......s.s......MM~~~~~',
    '~~~~MM....T.........T....MM~~~',
    '~~~~M.....................M~~~',
    '~~~~M........P.....x......M~~~',
    '~~~~MM..........T........MM~~~',
    '~~~~~~MM...............MM~~~~~',
    '~~~~~~~~~~MMMM.WSMMMM~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== Gullwrack Harbor (Level 5, Wave 6) — a full town, like the Isles,
  // unlike town-less Horologe/Chime: shops, an inn, NPCs, a notice board.
  // W dock  P arrival  S shop  I inn  n notice board  y Guildmistress Maren
  // 7 the Sunken Breakwater (=dungeon 21). Wave 6 also introduces the
  // slab-tiling repair sites (see MM.maps.REPAIR_SITES.gullwrack, and
  // E.applySiteState/E.trySiteBump in engine.js):
  //   r broken floor (repair target)   U pushable stone slab
  //   i blueprint plaque (asks the site's area problem before pushing unlocks)
  //   l reset lever (re-spawns that site's slabs — a wedged slab is never fatal)
  MM.maps.GULLWRACK = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM~~~',
    '~~~M....T...............T...........M~~~',
    '~~~M...........T...............T....M~~~',
    '~~~M.i.l..S........n........I.......M~~~',
    '~~~M..Ur......................i.l...M~~~',
    '~~~M..Ur...........y................M~~~',
    '~~~M....T.....................U.UT..M~~~',
    '~~~M................P.........r.r...M~~~',
    '~~~M..T....rU...l......r.r.r........M~~~',
    '~~~M.......rU...i......U.U.U......T.M~~~',
    '~~~M..7....rU.......................M~~~',
    '~~~M........T.........i.l..T........M~~~',
    '~~~M................................M~~~',
    '~~~MMMMMMMMMMMMMMM.W..MMMMMMMMMMMMMMM~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== The Open Castle (Wave 7) — the ending's interior =====
  // Not a dungeon: NO monsters, no combat, ever. Rendered as an overworld
  // (see OVERWORLD_IDS) so the NPC pass runs and the floor isn't dungeon-grey.
  // X the great doors (back outside)  P arrival  E gallery plinth (one of the
  // ten recovered treasures)  Q the MathMaker  J Miscount  V the Hall of
  // Heroes crest board  O the throne  F a hanging banner (decor, solid)
  // Wave 9 (P3, cosmetic gold sinks): the SW room was always just empty
  // floor, reachable via the Q/J hall's own corridor at row 10 — everything
  // NEW lives in row 12 only (rows 9/11 are untouched, on purpose: Q and J
  // are solid, and their only detour route runs through those two rows —
  // furniture there silently walls off the whole room, a bug the render
  // audit's reachability check caught before it ever shipped). d a garden
  // bed  i a rug spot  k a library shelf  l the pet's wardrobe  n/w/r three
  // independent boss-statue plinths — every one bump-to-buy, like the
  // Gallery's own plinths, gated on s.endingDone (E.castleFurnishBump /
  // MM.ui.petWardrobe / MM.ui.statuePlinth). Deliberately NOT m/g/t/b (the
  // global monster-spawn-marker alphabet — the door audit checks their
  // absence everywhere as "no combat in the castle") NOR any letter already
  // claimed by MM.data.NPCS (a/c/e/f/g/h/j/p/q/u/x/y/z) — the townsfolk
  // NPC-draw pass runs on every glyph regardless of which overworld it's
  // on, and a reused NPC letter draws that villager sprite RIGHT OVER the
  // furniture (caught only by actually looking at a screenshot — the
  // automated tileSprite() checks were green the whole time).
  // Wave 12 (P3): two additions by the Study — 'H' is the door to the
  // WORKSHOP WING (E.wingDoor: a brass "not yet" plate pre-ending, the
  // proving rooms after), and 'o' is the spot where the confessed wardrobe
  // settles once it relocates from the Wing (plain floor until
  // s.wing.wardrobeMoved, then a wardrobe in a tiny hat — the same live-
  // state trick as the furnishing tiles). Neither is an MM.data.NPCS key.
  // Wave 14: 'N' (row 3, beside the throne) is the Court Herald — an
  // MM.data.NPCS entry that dispatches to E.holdCourt. 'N' is the one glyph
  // free across every map + NPCS key (never a dungeon mechanic). The three
  // Faculty posts stand on the plain throne-room floor at (21,3)/(18,5)/(22,5)
  // and are drawn as live overlays (ui.js), never grid glyphs — see FACULTY_POSTS.
  MM.maps.CASTLE = [
    '##########################',
    '##########################',
    '##........##..##.F...F..##',
    '##.EEEEE..##..##.N.O....##',
    '##......................##',
    '##.EEEEE..#F..F#........##',
    '##........#....#.F...F..##',
    '###########....###########',
    '###########....###########',
    '##o......H#....#Z..VV..K##',
    '##..Q.J.................##',
    '##.......##F..F#........##',
    '##diklnwr##....#........##',
    '###########..P.###########',
    '############X#############',
  ];

  // ===== Wave 15 (P4): the Parlor — the card game "Tiny Hats" =====
  // A combat-free room off the castle (through the 'Z' door on the castle's
  // right inner wall), gated on s.endingDone. An overworld like the castle and
  // the Wing (no monsters ever, no stamina), with its own tileSprite alphabet:
  //   X  back out to the castle        P  arrival
  //   D  Deuce the dealer (bump → the parlor hub / a match)
  //   C  the felt card table (bump → a match)
  //   T  the "reach 20" dice side-table (bump → the dice game)
  // The dealer/tables are drawn by the tile pass (D/T/C are NOT NPCS keys, so
  // the overworld NPC pass leaves them alone).
  MM.maps.PARLOR = [
    '#############',
    '#...........#',
    '#..C.....T..#',
    '#...........#',
    '#.....D.....#',
    '#...........#',
    '#...........#',
    '#.....P.....#',
    '######X######',
  ];

  // ===== Wave 16: "The Kitchen Garden" (Castle Expansion Wave C) =====
  // Two paired rooms as one supply chain, reached through the castle's 'K'
  // door. A combat-free overworld like the castle/Wing/Parlor (no monsters, no
  // stamina), with its OWN tileSprite alphabet (none of these letters is an
  // NPCS key, so the overworld NPC pass never draws them — the v1.7.9 'Y'
  // lesson). Garden on the left, kitchen on the right, one open floor between:
  //   X back out to the castle    P arrival
  //   B the seed bench (bump → plant a rectangle, count it, harvest it)
  //   , tilled soil (the plot; walkable)   Y a planted seedling (walkable)
  //   R a ripe plant, ready to harvest (walkable — the plants never judge)
  //   C the cook station (bump → pick a recipe, scale the measure)
  //   S the sous-chef (bump → talk)   V a very serious carrot (bump → talk)
  // The bench/cook/chef/carrot are drawn by the tile pass (B/C/S/V are NOT
  // NPCS keys). The plot occupies x=6..13, y=2..7 (see GARDEN_PLOT).
  MM.maps.GARDEN = [
    '######################',
    '#....................#',
    '#..B..,,,,,,,,....S..#',
    '#.....,,,,,,,,....C..#',
    '#.....,,,,,,,,.......#',
    '#.....,,,,,,,,.......#',
    '#.....,,,,,,,,.......#',
    '#.....,,,,,,,,.......#',
    '#..V.................#',
    '#....................#',
    '#.........P..........#',
    '##########X###########',
  ];
  // Geometry the garden's engine handlers read (prose lives in data.js).
  MM.maps.GARDEN_PLOT = { x0: 6, y0: 2, w: 8, h: 6 };   // the tilled plot: x 6..13, y 2..7
  MM.maps.GARDEN_BENCH = { x: 3, y: 2 };
  MM.maps.GARDEN_COOK = { x: 18, y: 3 };
  MM.maps.GARDEN_CHEF = { x: 18, y: 2 };
  MM.maps.GARDEN_CARROT = { x: 3, y: 8 };
  MM.maps.GARDEN_ARRIVAL = { x: 10, y: 10 };
  // Bigger plots as the kid's tier rises (courtCaseTier-style, via
  // MM.mastery.tierFor). Never larger than the plot itself (8 wide, 6 tall).
  MM.maps.GARDEN_MAX = { 1: { rows: 4, cols: 5 }, 2: { rows: 5, cols: 7 }, 3: { rows: 6, cols: 8 } };

  // ===== Wave 12 (P3): the Workshop Wing — the castle's proving rooms =====
  // Combat-free (s.monsters = [] — the castle rule extends here), entered
  // through the castle's 'H' door by the Study, gated on s.endingDone.
  // Rendered as an OVERWORLD (no monsters, castle-style movement, no
  // stamina) with its own tileSprite alphabet block. Every glyph here was
  // checked against MM.data.NPCS (the townsfolk draw pass runs on every
  // overworld — the Wave 9 furnishing lesson) and against the dungeon
  // alphabet where shared ('U', 'i', 'l', 'k', 'G', '_', 'v', '<', '*').
  //   X exit to the castle   P arrival   T portrait (bump-to-hear)
  //   i room plaque          w the wardrobe (an obvious mimic, terrible tell)
  //   H the empty doorway at the hall's end (the Wave 13 Your-Room teaser)
  //   ! cracked floor        v crumbled hole (drops to the cellar)
  //   < the cellar ladder    * chest      0 equation socket (Numberlings)
  //   U pushable slab (Numberlings carry nums — MM.maps.WING_SLABS)
  //   @ the lamp   M a shield-mirror stand   $ the dark crystal
  //   G the armory's beam-gate   S a cat statue   O the fish fountain
  //   k pantry shelves   + pressure plate   & plate-gate   l reset lever
  MM.maps.WING = [
    '########################################',
    '#..........#.............#..$.......####',
    '#.....*....#...0.0.......#..........G*##',
    '#..........#.............#@....M....####',
    '#!!!v!!!!!!#.............#.............#',
    '#!!!!!!v!!!#.............#.............#',
    '#..........#.U.U.U.U.UU..#..M..M.......#',
    '#..........#.............#.............#',
    '#..........#............l#.............#',
    '###T#i.#TT########i.#T#########i.#T#####',
    '#......................................#',
    '#XP....................................H',
    '#.......................w..............#',
    '#####i.#T#########i.#T#########i.#T#####',
    '#..........#...........###.......#.....#',
    '#.S.....S..#.kkkkk....#*##..+....&...*.#',
    '#..........#...........&.#.......&.....#',
    '#....O.....#.kkkkk.......#..U....#.....#',
    '#..........#.........+...#.......#.+...#',
    '#....S.....#.kkkkk...U...#._____.#.....#',
    // v1.8.2: the plate room gets its OWN reset lever at (31,20) — a kid
    // wedged the slab in a corner and the only lever was a room away.
    '#..........#............l#.....l.#.....#',
    // Wave 13 (P1): the ECHO ANNEX — a long gallery under the far room,
    // entered down the shaft at (34,21)-(34,22). The echo plate '?' (12,23)
    // sits one step short of a pressure plate '+' (11,23) dead-ended against
    // the west wall: walk the corridor west, step on the plate, and the
    // Understudy replays your steps — the wall-stop catches it ON the '+'.
    // No chest here on purpose: with the Wing's slabs resting on plates for
    // good, every '&' on this floor may already stand open — the annex is
    // the TEACHING room (the once-ever summon is the payoff); the paying
    // echo-plate puzzles live in the Cavern of Echoes and the Spiral pool,
    // where nothing but the Understudy can hold a plate. Closed-gate safety
    // holds by construction: the annex region contains its own '+'.
    '##################################.#####',
    '#........#########################.#####',
    '#.<...*..#+?.......................#####',
    '#........#######################i#######',
    '########################################',
  ];

  // Geometry the Wing's engine handlers read (prose lives in data.js).
  MM.maps.WING_CELLAR = { landing: { x: 4, y: 23 }, ladderReturn: { x: 6, y: 10 } };
  // The Numberlings (MathMaker Wren): the plaque states the equation SHAPE;
  // ANY true filling completes — 3×8 and 4×6 (either order) both work, and
  // accepting every correct answer is load-bearing. 7 and 9 are decoys
  // (and a running gag: the 9 leans 1px away from any adjacent 7 —
  // cosmetic ONLY, never a movement rule).
  MM.maps.WING_WREN = {
    target: 24, op: '×',
    sockets: [{ x: 15, y: 2 }, { x: 17, y: 2 }],
    resetLever: { x: 24, y: 8 },
  };
  // Slab start positions + numbers (the template s.wing.slabs initializes
  // from; positions then persist). The '6' starts asleep (💤 — wakes on its
  // first push; the push itself is NEVER blocked).
  MM.maps.WING_SLABS = [
    { id: 'n3', num: 3, x: 13, y: 6 },
    { id: 'n8', num: 8, x: 15, y: 6 },
    { id: 'n4', num: 4, x: 17, y: 6 },
    { id: 'n6', num: 6, x: 19, y: 6, asleep: true },
    { id: 'n9', num: 9, x: 21, y: 6 },
    { id: 'n7', num: 7, x: 22, y: 6 },
    { id: 'pantry', num: null, x: 21, y: 19 },
    { id: 'plate', num: null, x: 28, y: 17 },
  ];
  // The Armory: a lamp beam routed by two-state shield-mirrors ('/' = 0,
  // '\' = 1) to the dark crystal. Zero math. E.wingBeam walks this.
  MM.maps.WING_ARMORY = {
    lamp: { x: 26, y: 3 }, dir: [1, 0], crystal: { x: 28, y: 1 },
    mirrors: [{ x: 31, y: 3 }, { x: 31, y: 6 }, { x: 28, y: 6 }],
    initial: [0, 0, 0],   // all '/' — two toggles from lit (M1 and M3 to '\')
  };
  // Petronella's cats: bump cycles facing N(0) E(1) S(2) W(3); all facing
  // the fish fountain (dominant axis toward it) = the chime.
  MM.maps.WING_CATS = {
    fountain: { x: 5, y: 17 },
    statues: [
      { x: 2, y: 15, initial: 2 },   // needs E
      { x: 8, y: 15, initial: 0 },   // needs W
      { x: 5, y: 19, initial: 1 },   // needs N
    ],
  };
  // Which chest completes which proving room (the wardrobe, portraits and
  // per-room rewards live in engine/data).
  MM.maps.WING_ROOM_CHESTS = {
    '6,2': 'grumbold', '37,2': 'armory', '23,15': 'pantry', '37,15': 'plate',
  };
  MM.maps.WING_CELLAR_CHEST = { x: 6, y: 23 };
  MM.maps.WING_WARDROBE = { x: 24, y: 12 };
  MM.maps.WING_DOORWAY = { x: 39, y: 11 };
  MM.maps.WING_RESET_LEVERS = {
    '24,8': 'wren',     // Wren's room: loose (unlocked) Numberlings shuffle home
    '24,20': 'pantry',  // the pantry lever (resets pantry + plate slabs)
    '31,20': 'plate',   // v1.8.2: the plate room's own lever — a wedged slab
                        // must be rescuable from INSIDE the room it wedged in
  };

  // Wave 12 (P2): free-standing pushable slabs OUTSIDE repair sites/the
  // Wing — position persists in s.freeSlabs[mapId], reset by a non-site
  // 'l' lever on the same floor. d18 = the Vault's plate puzzle.
  MM.maps.FREE_SLABS = {
    d18: [{ x: 20, y: 10 }],
  };

  // ===== Wave 13 (P2): Your Own Room — behind the Wing's named doorway =====
  // A separate tiny map (mapId 'myroom', an OVERWORLD like the castle:
  // combat-free, no stamina). The TEMPLATE below is the fixed shell; the
  // kid's placed pieces (s.wing.myRoom.pieces) overlay it at build time
  // (E.buildMyRoomGrid). Alphabet (own tileSprite block; none of these are
  // MM.data.NPCS keys): X the entrance arch (back to the Wing hall)
  //   B the workbench   O the goal pedestal (chest slot on top)
  //   V the invite pull-cord   R the reset pull-cord (in the arch wall,
  //   bumpable from inside — the wedge law from day one)
  // Placed-piece chars: W wall block, U slab, + plate, & plate-gate,
  //   ! cracked tile, * chest. 'v' = a crumbled crack (per-visit).
  MM.maps.MYROOM = [
    '#############',
    '#...........#',
    '#B..........#',
    'V...........#',
    'X..........O#',
    'R...........#',
    '#...........#',
    '#...........#',
    '#...........#',
    '#############',
  ];
  MM.maps.MYROOM_ENTRY = { x: 1, y: 4 };       // the tile just inside the arch
  MM.maps.MYROOM_ARCH = { x: 0, y: 4 };
  MM.maps.MYROOM_BENCH = { x: 1, y: 2 };
  MM.maps.MYROOM_PEDESTAL = { x: 11, y: 4 };
  MM.maps.MYROOM_CORD_INVITE = { x: 0, y: 3 };
  MM.maps.MYROOM_CORD_RESET = { x: 0, y: 5 };
  // Palette v1 — tight ON PURPOSE: a budget makes it design, not sprawl.
  MM.maps.MYROOM_BUDGET = { wall: 10, slab: 2, plate: 1, gate: 1, crack: 1, chest: 1 };
  MM.maps.MYROOM_PIECE_CHARS = { wall: 'W', slab: 'U', plate: '+', gate: '&', crack: '!', chest: '*' };

  // Wave 13 (P3): where the homesick staircase stands lost (Cavern of
  // Echoes = dungeon 11, floor 1), and where it waits if you sail away.
  MM.maps.STAIRCASE_SPOT = { x: 11, y: 7 };
  MM.maps.STAIRCASE_PIER_WAIT = { x: 3, y: 7 };   // beside the Old Pier 'W' (2,7)

  // Wave 12 (P4): the skip-count stepping stones near Old Fisher Finn.
  // seq 0..3 is the crossing order (the ×2 skip-count: 2, 4, 6, 8);
  // seq -1 marks a decoy. Wrong stone = splash + back to the bank.
  MM.maps.SKIP_STONES = [
    { x: 30, y: 3, label: '2', seq: 0 },
    { x: 30, y: 2, label: '4', seq: 1 },
    { x: 31, y: 2, label: '6', seq: 2 },
    { x: 32, y: 2, label: '8', seq: 3 },
    { x: 29, y: 2, label: '5', seq: -1 },
    { x: 29, y: 3, label: '7', seq: -1 },
  ];
  MM.maps.SKIP_STONES_BANK = { x: 30, y: 4 };
  MM.maps.SKIP_STONES_CHEST = { x: 33, y: 2 };

  // ===== Wave 9 (P2): the Spiral Stair — a procedural post-game tower =====
  // "Infinite content from finite assets" (FUTURE_LEVELS.md 5c), pragmatically
  // capped at SPIRAL_MAX_FLOOR (deviation: not literally endless — see
  // EXPANSION_PLAN's Wave 9 deviations). Seven small 12x10 chunks rotate for
  // ordinary floors; every 5th floor is a bigger "landing" chunk (chest + a
  // tougher tangle) from a 2-chunk pool. Reachability for every chunk is unit-
  // tested exactly like a hand-authored dungeon (tests/test.js).
  MM.maps.SPIRAL_INDEX = 22;
  MM.maps.SPIRAL_MAX_FLOOR = 60;
  // v1.8.1 (live playtest: "lots of locked doors that serve no purpose"):
  // the original chunks scattered freestanding D doors in open floor — a
  // shut door READS as "passage, gated", so a door you can stroll around,
  // guarding nothing, is a broken promise. New rule, permanent:
  // DOORS GATE, NEVER DECORATE. Every spiral door now seals a walled vault
  // pocket with a chest behind it (or, chunk [7], gates a walk-route that a
  // teleport pad honestly bypasses). Freestanding doors are gone.
  MM.maps.SPIRAL_REGULAR = [
    [
      '############',
      '#X.........#',
      '#..#.....#.#',
      '#...####...#',
      '#...#*.D...#',
      '#...####...#',
      '#.m........#',
      '#..#.....#.#',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#.##....##.#',
      '#..........#',
      '#....m.....#',
      '#......#####',
      '#......D.*##',
      '#......#####',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#..........#',
      '#...#..#...#',
      '#....m.....#',
      '####.......#',
      '#*.D.......#',
      '####.......#',
      '#....m....>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#..######..#',
      '#..#*...D..#',
      '#..######..#',
      '#....m.....#',
      '#..........#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#..........#',
      '#.m......m.#',
      '#..........#',
      '#....#.#####',
      '#......D.*##',
      '#......#####',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#.#........#',
      '#..........#',
      '#.####.....#',
      '#.#*.D.....#',
      '#.####.....#',
      '#....m..#..#',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.........#',
      '#......#####',
      '#......D.*##',
      '#......#####',
      '#....m.....#',
      '#..........#',
      '#.m........#',
      '#.........>#',
      '############',
    ],
    // ---------- Wave 12 (P1): the stranded grammar, seeded ----------
    // Five new chunks APPENDED (floors 1-7 keep their historical chunks —
    // an old save's s.opened keys on those floors still line up). Standing
    // rule: specials (slides/pads/levers/gates) decorate OPTIONAL routes
    // only — every chunk keeps a plain-floor walk from X to '>' (unit-
    // checked below in tests/test.js with specials treated as walls).
    // [7] teleport-pair shortcut across the dividing wall (first at floor 8)
    [
      '############',
      '#X....#.o..#',
      '#.....#....#',
      '#..o..#....#',
      '#.....#....#',
      '#..m..#..*.#',
      '#.....#....#',
      '#.....#....#',
      '#......D..>#',
      '############',
    ],
    // [8] slick-rock shelves — the slides are shortcuts, never the only way
    [
      '############',
      '#X.........#',
      '#.....___..#',
      '#..#..___..#',
      '#..........#',
      '#......m...#',
      '#..___..#..#',
      '#..___.....#',
      '#.........>#',
      '############',
    ],
    // [9] tide-pool flavor — wading costs stamina; the dry route is free
    [
      '############',
      '#X.........#',
      '#..,,......#',
      '#..,,......#',
      '#.......m..#',
      '#......,,..#',
      '#....m.,,..#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    // [10] lever/gate — the gate guards a CHEST, never the stairs
    [
      '############',
      '#X......#*##',
      '#........G.#',
      '#..m.......#',
      '#..........#',
      '#..........#',
      '#..L.....m.#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    // [11] slick-rock crossing — two slides, one plain detour
    [
      '############',
      '#X.........#',
      '#.._____...#',
      '#..........#',
      '#...#..#...#',
      '#.._____...#',
      '#....m.....#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    // ---------- Wave 13 (P1): the echo-plate chunk ----------
    // [12] APPENDED (floors 1-12 keep their historical chunks; floors 13+
    // re-template once — stale s.opened keys can only open cells, the same
    // migration class as Wave 12/v1.8.1). The Understudy's choreography:
    // walk the row-6 corridor east, step on '?', and the replay carries it
    // onto the '+' (the wall at (10,6) catches an overshoot ON the plate).
    // The plate-gate '&' (10,2) seals a walled chest pocket (10,1) with no
    // interior floor. There are no slabs on the Spiral, so only the
    // Understudy can hold the plate while you climb to the gate. Optional
    // route only: the plain-floor walk X -> '>' runs down col 1 / row 8.
    [
      '############',
      '#X.......#*#',
      '#........#&#',
      '#..m.....#.#',
      '#..........#',
      '#..#####...#',
      '#....?...+##',
      '#..m.......#',
      '#.........>#',
      '############',
    ],
  ];
  MM.maps.SPIRAL_LANDING = [
    [
      '############',
      '#X.........#',
      '#..........#',
      '#....b.....#',
      '#..........#',
      '#.....*....#',
      '#..........#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    [
      '############',
      '#X.....b...#',
      '#..........#',
      '#..........#',
      '#....*.....#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#.........>#',
      '############',
    ],
    // Wave 12 (P1): the gear-plate landing — the game's single best one-shot
    // mechanic, finally recurring (first at floor 15, then every 15). The
    // rotating vault has three doors (A/B/C); whichever way the plate R is
    // wound, exactly one stands open, so the bonus chest is never locked
    // away — cycling the plate is the fun, not the key. Gear state is
    // per-floor by construction (s.gearState is keyed by mapId, 'd22f14').
    [
      '############',
      '#X.........#',
      '#......b...#',
      '#.*........#',
      '#...#B##...#',
      '#...A.*C...#',
      '#...####...#',
      '#..R.......#',
      '#.........>#',
      '############',
    ],
  ];
  // Materialized once (floors never change shape, only their spawned
  // monster instances — those come fresh from E.enterDungeon every visit,
  // same as any other dungeon).
  MM.maps._spiralCache = null;
  MM.maps.spiralFloors = function () {
    if (MM.maps._spiralCache) return MM.maps._spiralCache;
    const out = [];
    for (let f = 1; f <= MM.maps.SPIRAL_MAX_FLOOR; f++) {
      const landing = f % 5 === 0;
      const pool = landing ? MM.maps.SPIRAL_LANDING : MM.maps.SPIRAL_REGULAR;
      const i = landing ? (f / 5 - 1) % pool.length : (f - 1) % pool.length;
      const rows = pool[i].slice();
      // the tower has a top — the last floor's stairs-up simply isn't there
      out.push(f === MM.maps.SPIRAL_MAX_FLOOR ? rows.map(r => r.replace('>', '.')) : rows);
    }
    MM.maps._spiralCache = out;
    return out;
  };

  // Every dungeon as an array of floors: 1-13 are single-floor.
  MM.maps.dungeonFloors = function (idx) {
    if (idx === MM.maps.SPIRAL_INDEX) return MM.maps.spiralFloors();
    if (idx <= 13) {
      // Wave 5: dungeons 4/7/9 gained a locked second floor (a "Deep Wing").
      // Their floor 0 was single-floor before this — enterDungeon's mapId
      // scheme keys off floors.length, so its id changes from 'd4' to
      // 'd4f0' the moment this returns 2 entries (see EXPANSION_PLAN Wave 5
      // deviations: any already-opened doors/chests/boss-kill on that floor
      // reset once, a one-time cost judged worth it for new content).
      if (MM.maps.DEEP_WINGS[idx]) return [MM.maps.DUNGEONS[idx - 1], MM.maps.DEEP_WINGS[idx]];
      return [MM.maps.DUNGEONS[idx - 1]];
    }
    return MM.maps.ISLE_DUNGEONS[idx];
  };

  // Normalize a raw string map into a grid of chars, padded to a rectangle.
  MM.maps.parse = function (rows, padChar) {
    const width = Math.max(...rows.map(r => r.length));
    return rows.map(r => (r + padChar.repeat(width)).slice(0, width).split(''));
  };

  MM.maps.find = function (grid, ch) {
    const out = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === ch) out.push({ x, y });
      }
    }
    return out;
  };

  // ---------- tile → sprite (Wave 6.5: moved here from ui.js) ----------
  // Lives in maps.js because it is PURE glyph logic — which lets the unit
  // suite render-audit every map without a DOM. The old `onIsles` boolean
  // couldn't say "which island", so Horologe/Chime/Gullwrack rendered as
  // dungeons: grey ground, invisible entrances, and NO NPC pass at all
  // (the empty-island bug, three times over).
  // 'castle' (Wave 7) is an OVERWORLD, not a dungeon: no monsters, and the
  // NPC pass must run so the MathMaker and Miscount are actually drawn.
  // 'wing' (Wave 12) is an overworld like the castle: no monsters ever, the
  // NPC pass may run (its alphabet avoids every NPCS key), castle movement.
  // 'myroom' (Wave 13) is an overworld like the castle and the Wing: no
  // monsters ever, no stamina, its own alphabet block below.
  MM.maps.OVERWORLD_IDS = ['world', 'isles', 'horologe', 'chime', 'gullwrack', 'castle', 'wing', 'myroom', 'parlor', 'garden'];
  MM.maps.isOverworld = mapId => MM.maps.OVERWORLD_IDS.includes(mapId);

  // Gear gates (Clockwork Spire): exactly one of A/B/C is open at a time, and
  // which one is a saved rotation (s.gearState[mapId] = 0|1|2). Pure lookup so
  // the headless render audit can call it with no engine loaded — with no
  // state, gate A reads as the open one, which is the rotation every floor
  // starts in anyway.
  MM.maps.GEAR_LETTERS = ['A', 'B', 'C'];
  MM.maps.gearRotation = function (mapId) {
    const s = MM.engine && MM.engine.state;
    return ((s && s.gearState && s.gearState[mapId]) || 0) % 3;
  };
  MM.maps.gateOpenNow = (ch, mapId) => MM.maps.GEAR_LETTERS[MM.maps.gearRotation(mapId)] === ch;

  // Wave 12 (P2): pressure plates — same pure-lookup shape as gearRotation,
  // so tileSprite can draw live open/shut state and the headless render
  // audit (no engine state) sees everything closed. The real occupancy
  // logic lives in MM.engine.platePowered.
  MM.maps.plateOpenNow = function (mapId) {
    const E = MM.engine;
    return !!(E && E.platePowered && E.state && E.platePowered(mapId));
  };

  // ---------- Wave 11: the Grand Descent ----------
  // Pure glyph/geometry logic, same reasoning as the rest of this section:
  // no DOM, no engine state, so the render audit and the design session's
  // drive can both exercise it headlessly.

  // A dungeon mapId is always 'd<idx>' or 'd<idx>f<floor>' (see
  // E.enterDungeon) — the render audit's own convention ('d<idx>f<fi>' even
  // for single-floor dungeons) parses the same way. Overworld ids never
  // start with 'd' followed by a digit, so this doubles as "am I a dungeon?"
  MM.maps.dungeonIndexOf = function (mapId) {
    const m = typeof mapId === 'string' && /^d(\d+)/.exec(mapId);
    return m ? parseInt(m[1], 10) : null;
  };

  // P2: three wall tiers escalate depth on the mainland. d1-3 stay the
  // original rough cave (it already reads as "rough"); d4-7 get the new
  // cut-block "worked stone"; d8-13 (the three mainland-adjacent expansions
  // included, per the wave's own "expansion 11-13 reuse grand keep" note)
  // get the new large-dressed "grand keep" stone. Isle dungeons (14+) and
  // the post-game Spiral Stair (22) keep the rough-cave silhouette — they
  // already carry a stronger visual identity from their own custom tiles —
  // and rely on the theme TINT (below) alone.
  MM.maps.wallTierSprite = function (idx) {
    if (idx == null) return 'wall';
    if (idx <= 3) return 'wall';
    if (idx <= 7) return 'wallWorked';
    if (idx <= 13) return 'wallGrand';
    return 'wall';
  };

  // P4: boss-room dignity needs the boss MARKER's spawn tile, not a living
  // boss's current (chasing) position — read it off the floor's own
  // unmutated template (dungeonFloors), never the live grid (E.enterDungeon
  // overwrites the 'b' marker to '.' the moment it spawns the boss). Floor
  // shapes never change, so this is safe to memoize.
  MM.maps._bossSpawnCache = {};
  MM.maps.bossSpawnPos = function (idx, floorIndex) {
    const key = idx + ':' + floorIndex;
    if (key in MM.maps._bossSpawnCache) return MM.maps._bossSpawnCache[key];
    const floors = MM.maps.dungeonFloors(idx);
    const raw = floors && floors[floorIndex];
    let pos = null;
    if (raw) {
      const grid = MM.maps.parse(raw, '#');
      pos = MM.maps.find(grid, 'b')[0] || null;
    }
    MM.maps._bossSpawnCache[key] = pos;
    return pos;
  };
  MM.maps.BOSS_VIGNETTE_RADIUS = 3;
  MM.maps.BOSS_VIGNETTE_ALPHA = 0.34;
  // A pure "how tinted is this tile" query — drawWorld and the test suite
  // share it so the radius rule only lives in one place.
  MM.maps.bossVignetteAlpha = function (idx, floorIndex, x, y) {
    const pos = MM.maps.bossSpawnPos(idx, floorIndex);
    if (!pos) return 0;
    const d = Math.max(Math.abs(x - pos.x), Math.abs(y - pos.y));
    return d <= MM.maps.BOSS_VIGNETTE_RADIUS ? MM.maps.BOSS_VIGNETTE_ALPHA : 0;
  };

  // P3: deterministic decor overlays — one motif per mainland dungeon
  // (d1-10), drawn ON ordinary floor tiles, never a new grid glyph (nothing
  // enters the walkability/door audits) and never persisted state (no
  // s.opened entry). Placement is a pure hash of (x, y, dungeonIndex) —
  // never Date.now() or a frame counter — so it is static by construction
  // and needs no Calm Mode gate; it never moved to begin with. A fraction
  // rune's exact glyph (½ / ⅓ / ¼) is likewise a pure hash pick, not a
  // per-render random choice.
  MM.maps.DECOR_MOTIFS = {
    1: ['🌰'],           // Meadow Cave — dropped acorns
    2: ['🕸️'],           // Rat Cellar — cobwebs
    3: ['🪔'],           // Old Mine — lantern hooks
    4: ['🛤️'],           // Forest Ruin — mine-cart rail fragments
    5: ['🌿'],           // River Catacombs — fern fronds
    6: ['💎'],           // Crystal Grotto — crystal glints
    7: ['🪙'],           // Merchant's Vault — coin flecks
    8: ['½', '⅓', '¼'],  // Fraction Fortress — fraction-rune carvings
    9: ['🪶'],           // Wizard's Tower — owl feathers
    10: ['🚩'],          // Tower of Trials — faded royal banners (drawn dim)
  };
  function decorHash(x, y, salt) {
    let h = (x * 374761393 + y * 668265263 + salt * 2654435761 + 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h >>> 0;
  }
  // ~1-in-41 eligible floor tile carries decor — keeps rooms readable at
  // roughly ≤2 per 8x8 patch (per-tile odds ≈ 1.5 expected hits in 64
  // tiles). `ch` is the LIVE grid glyph: decor only ever considers plain
  // open floor ('.'), so it can never land on a POI cell — every door,
  // chest, key, lock, lever, stairs, chute, secret, slab, plaque, exit,
  // monster marker, pad, gate, and plate glyph is something other than '.'.
  MM.maps.decorMotif = function (idx, x, y, ch) {
    const set = MM.maps.DECOR_MOTIFS[idx];
    if (!set || ch !== '.') return null;
    const h = decorHash(x, y, idx);
    if (h % 41 !== 0) return null;
    return set[h % set.length];
  };

  MM.maps.tileSprite = function (ch, x, y, mapId, waterFrame) {
    const inDungeon = !MM.maps.isOverworld(mapId);
    // map-specific glyphs first — 'u' is Miscount on the west map but murk
    // fog on the isles; the island landmarks each own their digit
    if (mapId === 'castle') {
      // the castle interior owns its whole alphabet — the NPC letters (Q/J)
      // still need a FLOOR under them, or the NPC pass draws a person
      // standing on a patch of lawn indoors
      if (ch === 'E') return 'plinth';
      if (ch === 'V') return 'crestBoard';
      if (ch === 'O') return 'throne';
      if (ch === 'F') return 'banner';
      if (ch === 'X') return 'castleDoor';
      if (ch === '#') return 'wall';
      // Wave 9 (P3): furnishing reads its bought/empty state straight off
      // the live state, same trick as the Spire's gear plates — no grid
      // rewriting needed, the tile just draws differently once bought.
      {
        const cf = MM.engine && MM.engine.state && MM.engine.state.castleFurnish;
        if (ch === 'i') return (cf && cf.rug) ? 'rugFull' : 'hallFloor';
        if (ch === 'd') return (cf && cf.garden) ? 'gardenFull' : 'gardenEmpty';
        if (ch === 'k') return (cf && cf.library) ? 'shelfFull' : 'shelfEmpty';
        if (ch === 'l') return 'petBasket';
        if (ch === 'n') return (cf && cf.statues[0]) ? 'statueFull' : 'plinth';
        if (ch === 'w') return (cf && cf.statues[1]) ? 'statueFull' : 'plinth';
        if (ch === 'r') return (cf && cf.statues[2]) ? 'statueFull' : 'plinth';
      }
      // Wave 12 (P3): the Workshop Wing door by the Study, and the
      // confessed wardrobe's spot (plain floor until it moves in).
      if (ch === 'H') return 'wingDoor';
      // Wave 15 (P4): the Parlor door on the right inner wall (mirrors 'H').
      // 'Z' is the Spire's clock-door glyph in DUNGEONS — this castle block
      // returns first, so there is no collision (unit-guarded in test.js).
      if (ch === 'Z') return 'parlorDoor';
      // Wave 16: the Kitchen Garden door in the castle's east wall. 'K' is the
      // world map's expansion-entrance glyph for dungeon 13 (intercepted in the
      // 'world' block below) and unused by any dungeon mechanic; the castle
      // block returns first, so there is no collision (unit-guarded in test.js).
      if (ch === 'K') return 'gardenDoor';
      if (ch === 'o') {
        const wg = MM.engine && MM.engine.state && MM.engine.state.wing;
        return (wg && wg.wardrobeMoved) ? 'wardrobe' : 'hallFloor';
      }
      return 'hallFloor';
    }
    // Wave 12 (P3): the Workshop Wing owns its whole alphabet, castle-style
    // — several of its letters mean OTHER things elsewhere ('M' mountain,
    // 'S' shop, 'O' throne, 'T' tree, 'H' tower, 'w' murk, '0' entrance),
    // so this block must sit before every shared case (the v1.7.9 'Y'
    // lesson: a shadowed context case renders the wrong sprite). Each
    // collision has a unit guard in tests/test.js.
    if (mapId === 'wing') {
      const eng = MM.engine, st = eng && eng.state;
      if (ch === '#') return 'wall';
      if (ch === 'X') return 'castleDoor';
      if (ch === 'T') return 'portrait';
      if (ch === 'i') return 'board';
      if (ch === 'w') return 'wardrobe';
      // Wave 13: once the Wing title is earned, the named doorway stands
      // OPEN (the v1.8.2 "masons" holding-note is gone — the door delivers).
      if (ch === 'H') return (st && st.wing && st.wing.titleGiven) ? 'openDoorway' : 'teaseDoor';
      if (ch === '?') return 'echoPlate';
      if (ch === '*') return 'chest';
      if (ch === 'U') return 'slab';
      if (ch === 'l') return 'resetLever';
      if (ch === 'k') return 'shelfFull';
      if (ch === 'S') return 'catStatue';
      if (ch === 'O') return 'fountain';
      if (ch === '@') return 'lamp';
      if (ch === '$') return (eng && eng.wingBeamLit && eng.wingBeamLit()) ? 'crystalLit' : 'crystalDark';
      if (ch === 'M') return (eng && eng.wingMirrorStateAt && eng.wingMirrorStateAt(x, y)) ? 'mirrorBack' : 'mirrorSlash';
      if (ch === 'G') return (st && st.wing && st.wing.rooms && st.wing.rooms.armory) ? 'gateOpen' : 'gateShut';
      if (ch === '&') return MM.maps.plateOpenNow(mapId) ? 'plateGateOpen' : 'plateGateShut';
      if (ch === '+') return (eng && eng.plateOccupied && eng.state && eng.plateOccupied(x, y)) ? 'platePressed' : 'plate';
      if (ch === '0') return 'socket';
      if (ch === '!') return 'crackedFloor';
      if (ch === 'v') return 'chute';
      if (ch === '<') return 'stairsUp';
      if (ch === '_') return 'slick';
      return 'hallFloor';
    }
    // Wave 13 (P2): Your Own Room owns its whole alphabet, castle-style.
    // Several letters mean OTHER things elsewhere ('B'/'R' gear tiles in the
    // Spire, 'O' throne/fountain, 'V' the castle crest board, 'W' a pier,
    // 'X' varies) — this block sits before every shared case, and each
    // collision has a unit guard in tests/test.js (the v1.7.9 'Y' lesson).
    if (mapId === 'myroom') {
      const eng = MM.engine;
      if (ch === '#') return 'wall';
      if (ch === 'W') return 'wallWorked';   // a placed wall block reads as BUILT
      if (ch === 'X') return 'openDoorway';
      if (ch === 'B') return 'workbench';
      if (ch === 'O') return 'pedestal';
      if (ch === 'V') return 'pullCord';
      if (ch === 'R') return 'resetLever';
      if (ch === 'U') return 'slab';
      if (ch === '*') return 'chest';
      if (ch === '&') return MM.maps.plateOpenNow(mapId) ? 'plateGateOpen' : 'plateGateShut';
      if (ch === '+') return (eng && eng.plateOccupied && eng.state && eng.plateOccupied(x, y)) ? 'platePressed' : 'plate';
      if (ch === '!') return 'crackedFloor';
      if (ch === 'v') return 'chute';
      return 'hallFloor';
    }
    // Wave 15 (P4): the Parlor owns its whole alphabet, castle-style — a
    // combat-free overworld room off the castle. 'D'/'T'/'C' mean OTHER things
    // in dungeons ('D' door, 'T' tree/portrait, 'C' gear gate) but the Parlor
    // is an overworld with its own block sitting before every shared case, and
    // each collision has a unit guard in tests/test.js (the v1.7.9 'Y' lesson).
    // None of D/T/C is an NPCS key, so the overworld NPC pass never draws them.
    if (mapId === 'parlor') {
      if (ch === '#') return 'wall';
      if (ch === 'X') return 'castleDoor';    // back out to the castle
      if (ch === 'D') return 'dealer';         // Deuce, the house dealer (bump → play)
      if (ch === 'T') return 'diceTable';      // the "reach 20" side-table
      if (ch === 'C') return 'cardTable';      // the felt table (bump → play)
      return 'hallFloor';                      // '.', 'P'
    }
    // Wave 16 (P1/P2): the Kitchen Garden owns its whole alphabet, castle-style.
    // Several letters mean OTHER things elsewhere ('B'/'R' gear tiles + the
    // workbench, 'S' shop/cat statue, 'C' gear gate/card table, 'V' the crest
    // board, 'Y' the Tutor/echo doors) — this block sits before every shared
    // case, and each collision has a unit guard in tests/test.js. None of
    // B/Y/R/C/S/V/',' is an NPCS key, so the overworld NPC pass never draws them.
    if (mapId === 'garden') {
      if (ch === '#') return 'wall';
      if (ch === 'X') return 'castleDoor';    // back out to the castle
      if (ch === 'B') return 'seedBench';     // plant a patch, count it, harvest it
      if (ch === ',') return 'soil';          // tilled plot soil (walkable)
      if (ch === 'Y') return 'seedling';      // a planted seedling (walkable)
      if (ch === 'R') return 'ripePlant';     // ripe, ready to harvest (walkable)
      if (ch === 'C') return 'cookStation';   // the kitchen counter (bump → recipe)
      if (ch === 'S') return 'sousChef';      // the monster sous-chef in a toque
      if (ch === 'V') return 'carrot';        // a very serious carrot (bump → talk)
      return 'hallFloor';                      // '.', 'P'
    }
    if (mapId === 'isles' && (ch === 'u' || ch === 'v' || ch === 'w')) return 'murk';
    if (mapId === 'isles' && ch === 'H') return 'lighthouse';
    // the mainland's expansion entrances (A/B = dungeons 11/12, K = 13) —
    // drawWorld paints their number labels on top of the hole
    if (mapId === 'world' && (ch === 'A' || ch === 'B' || ch === 'K')) return 'hole';
    // Wave 9 (P2): the Spiral Stair's own tower, castle-adjacent. 'H' is
    // free on the world map (Isles already owns 'H' for the lighthouse,
    // intercepted above and never reaching here).
    if (mapId === 'world' && ch === 'H') return 'spiralTower';
    // Wave 10 (P3): the farm fence — reads its broken/mended state live off
    // s.tasksDone (same "no grid rewrite" trick as the Open Castle's
    // furnishing tiles), so mending it needs no persisted flag of its own.
    if (mapId === 'world' && ch === 'F') {
      const st = MM.engine && MM.engine.state;
      return (st && st.tasksDone && st.tasksDone.includes(6)) ? 'fenceMended' : 'fenceBroken';
    }
    // Wave 12 (P4): the skip-count stepping stones — 'd' is the castle's
    // garden bed on the castle map (intercepted above) and unused in every
    // dungeon; here it is a numeral-carved stone (labels painted by
    // drawWorld, same recipe as the dungeon-entrance numbers).
    if (mapId === 'world' && ch === 'd') return 'stepStone';
    if (mapId === 'horologe' && ch === '5') return 'spireTower';
    if (mapId === 'chime' && ch === '6') return 'hallTower';
    if (mapId === 'gullwrack' && ch === '7') return 'breakArch';
    // Wave 7 (gear-plate readability): the Spire's A/B/C gates STAY in the
    // grid now instead of being rewritten to '#'/'.'. A closed gate must never
    // look like an ordinary wall, and an open one must never look like bare
    // floor — that invisibility is what made the puzzle read as a glitch.
    // Which gate is which (• / •• / •••) is painted on top by drawWorld;
    // walkability lives in E.gateIsOpen.
    // This MUST sit above the switch: 'C' already means "castle" down there,
    // and a duplicate `case` silently loses to the first one — which is
    // exactly how gate C spent its first five minutes rendering as a castle.
    if (inDungeon && (ch === 'A' || ch === 'B' || ch === 'C')) {
      return MM.maps.gateOpenNow(ch, mapId) ? 'gateOpen' : 'gateShut';
    }
    // Wave 12 (P2): pressure plates + plate-gates in dungeons (the Wing's
    // own block already handled its copies above). Live state on the
    // sprite, exactly like the gear gates — a plate-gate must never look
    // like a lever-gate (different rule, different look).
    if (inDungeon && ch === '&') return MM.maps.plateOpenNow(mapId) ? 'plateGateOpen' : 'plateGateShut';
    if (inDungeon && ch === '+') {
      const eng = MM.engine;
      return (eng && eng.plateOccupied && eng.state && eng.plateOccupied(x, y)) ? 'platePressed' : 'plate';
    }
    if (inDungeon && ch === '!') return 'crackedFloor';
    // Wave 13 (P1): the echo plate — dungeon-only outside the Wing (which
    // intercepts its own '?' above). Never appears on any overworld.
    if (inDungeon && ch === '?') return 'echoPlate';
    switch (ch) {
      case '~': return waterFrame ? 'water2' : 'water';
      case 'T': return 'tree';
      case 'M': return 'mountain';
      case 'C': return 'castle';
      case 'S': return 'shop';
      case 'I': return 'inn';
      case 'n': return 'board';
      // 'Y' is the Practice Yard's Tutor on an overworld, but the Cavern of
      // Echoes reuses 'Y' for its echo doors — disambiguate by context (this
      // case sits above the dungeon-only 'echoDoor' entry below and would
      // otherwise shadow it).
      case 'Y': return inDungeon ? 'echoDoor' : 'tutor';
      case 'W': return 'pier';
      // Wave 11 (P2): mainland wall tiers escalate by dungeonIndex — see
      // wallTierSprite. Overworld/castle '#' never reaches this switch (the
      // castle intercepts its own '#' above; the overworld maps have none).
      case '#': return inDungeon ? MM.maps.wallTierSprite(MM.maps.dungeonIndexOf(mapId)) : 'wall';
      case 'D': return 'doorMagic';
      case '*': return 'chest';
      case 'X': return 'ladder';
      case '=': return 'bridge';
      // Level 2 isle tiles
      case '%': return 'wallCrack';
      case ',': return 'pool';
      case '^': return 'urchin';
      case '_': return 'slick';
      case 'o': return 'pad';
      case 'k': return 'keyTile';
      case 'K': return 'lockDoor';
      case 'L': return 'lever';
      case 'G': return 'gate';
      case '>': return 'stairsDown';
      case '<': return 'stairsUp';
      case 'v': return 'chute';
      // Waves 3/4/6 tiles that shipped handler-only and rendered as bare
      // ground (Wave 6.5 renderability pass)
      case 'Z': return 'clockDoor';
      // (echo doors: handled by the context-aware 'Y' case above)
      case 'R': return 'gearPlate';
      case 's': return 'singStone';
      case 'U': return 'slab';
      case 'r': return 'brokenFloor';
      case 'i': return 'board';   // blueprint plaque reads as a posted notice
      case 'l': return 'resetLever';  // Gullwrack's repair-site reset lever
      default:
        if ('1234567890'.includes(ch) && !inDungeon) return 'hole';
        if (inDungeon) return 'floor';
        return (x + y) % 2 ? 'grass2' : 'grass';
    }
  };
})();
