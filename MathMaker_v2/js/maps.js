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
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  MM.maps = {};

  // The kingdom proper (west, cols 0-37) plus the river and Miscount's bank
  // (east, cols 38-51). The river column is impassable until the bridge ('=')
  // is laid over the BRIDGE cells — that happens when task 10 is complete.
  const WEST = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~....T.......TT..........T.......TT..',
    '~~..T...................T.........T...',
    '~~.T.....T.....TTT.............T......',
    '~~..T..........TT..C.n......T.....5...',
    '~~.....T..............T..........e.M..',
    '~~...........j.S.......I...q...M.MM...',
    '~~W.T.....T...........................',
    '~~...........TT....P..h..T...2.....T..',
    '~~..T...1..............T..............',
    '~~.......T.....T...............T....M.',
    '~~.T.......................g..M...MM..',
    '~~........TT........T....T...M.....8..',
    '~~..T....................4...a........',
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
    '#.......#........#....m..#',
    '#..m....#........D.......#',
    '#.......#...m....#.......#',
    '#..X....#....*...#....m..#',
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
    '#.*......#.t......#......#',
    '#........#........#......#',
    '#.....*..#.....*..#....*.#',
    '#X.......#%.......#......#',
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
    '########################################',
    '#.........#...............#............#',
    '#...m.....#.....K.........#............#',
    '#.........#...............#...Z........#',
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
    '########################################',
    '#....k......*..........................#',
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
    '##########################',
    '#...........#............#',
    '#.....sss...#..K.........#',
    '#...m.......#.......*....#',
    '#...........#............#',
    '#...........#............#',
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
  const BREAKWATER_F1 = [
    '##########################',
    '#X.......................#',
    '#........................#',
    '#..m................t....#',
    '#............#...........#',
    '#.....*.....g#...........#',
    '#.........i.Ur...........#',
    '#...........Ur...........#',
    '#.........l..#...........#',
    '#............#...........#',
    '#............D......m....#',
    '#........................#',
    '#......................>.#',
    '#........................#',
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
    '~~..T.......p.....................~~~~~~',
    '~~~....T.....................T...~~~~~~~',
    '~~~~..........P..................~~~~~~~',
    '~~~~~%~~~~~~~~W~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== Horologe Isle overworld (Level 3) — town-less =====
  // W dock (sail onward/home)  P arrival spot  5 the Clockwork Spire
  // (=dungeon 19). No shops, no inn, no NPCs — just the tower.
  MM.maps.HOROLOGE = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~MMMMMM.MMMMMM~~~~~~~~~~~~~',
    '~~~~~~~~~MMM........5........MMM~~~~~~~~',
    '~~~~~~MMM.......................MMM~~~~~',
    '~~~~~MM...........................MM~~~~',
    '~~~~MM.............................MM~~~',
    '~~~~M...............................M~~~',
    '~~~~MM............P................MM~~~',
    '~~~~~MM...........................MM~~~~',
    '~~~~~~MMM.......................MMM~~~~~',
    '~~~~~~~~~MMM........W........MMM~~~~~~~~',
    '~~~~~~~~~~~~~~MMMMMM.MMMMMM~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  // ===== Chime Isle overworld (Level 4, Wave 4) — town-less =====
  // W dock (sail onward/home)  P arrival spot  6 the Resonant Halls
  // (=dungeon 20). No shops, no inn, no NPCs — just the halls.
  MM.maps.CHIME = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~MMMM.6.MMMM~~~~~~~~~',
    '~~~~~~MM...............MM~~~~~',
    '~~~~MM...................MM~~~',
    '~~~~M.....................M~~~',
    '~~~~M........P............M~~~',
    '~~~~MM...................MM~~~',
    '~~~~~~MM...............MM~~~~~',
    '~~~~~~~~~~MMMM.W.MMMM~~~~~~~~~',
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

  // Every dungeon as an array of floors: 1-13 are single-floor.
  MM.maps.dungeonFloors = function (idx) {
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
})();
