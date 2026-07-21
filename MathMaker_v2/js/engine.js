// MathMaker v2 — game state, movement, world interactions, and battle hooks.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const E = MM.engine = {};
  const SAVE_PREFIX = 'mathmaker2_save_';

  E.state = null;
  E.todayStr = () => new Date().toISOString().slice(0, 10);

  // ---------- new game / save / load ----------
  E.newGame = function (name, avatar, palette) {
    E.state = {
      version: 4,
      name,
      // Wave 18: the chosen hero form (purely cosmetic). DEFAULT is 'knight',
      // so a save with no avatar renders exactly today's hero. avatarPalette
      // (skin/hair/outfit) only applies to the human forms; heroHat is an
      // owned tiny-hat worn on ANY form (a dragon in a mortarboard).
      avatar: avatar || 'knight',
      avatarPalette: palette || null,
      heroHat: null,
      hp: 24, maxhp: 24,
      stamina: 100, maxStamina: 100,
      items: { food: { bread: 1 }, treasures: [], charms: [], gems: [] },
      gear: { weapon: ['stick'], body: ['clothes'], helmet: [], boots: [], ring: [], amulet: [] },
      equipped: { weapon: 'stick', body: 'clothes', helmet: null, boots: null, ring: null, amulet: null },
      enchants: {},         // "slot:itemId" -> gemId (Wave 2, Emberlyn's fuses)
      gold: 15, level: 1, xp: 0,
      potions: 1,
      potionsBought: 0,     // lifetime purchases — unlocks bulk-buy buttons
      seenBulkQuip: false,
      difficulty: 'hero',                    // story | hero | legend (kid-settable)
      calmMode: false,                       // Wave 5: no shakes/particles/ambient motion
      soundOff: false,                       // Pass D: silence every beep/chime/fanfare
      musicOff: false,                       // music pass: background loops off (SFX stay)
      bigText: false,                        // accessibility: larger reading text
      // parent-only, PIN-protected. topics = all-on until set, EXCEPT
      // Every topic defaults ON (user decision 2026-07-11): missing from
      // parent.topics means enabled; only an explicit parent choice in
      // the panel ever writes false. Nothing seeds or force-writes OFF.
      // from the very first session, since newGame never goes through
      // E.load()'s migration until the NEXT time this profile loads.
      parent: { pin: null, topics: {} },
      taskIndex: 0,        // 0 = has not met the MathMaker yet; 1-10 = current task
      haveItem: false,
      tasksDone: [],
      mastery: {},
      badges: {},          // skill -> best badge tier earned (1 bronze, 2 silver, 3 gold)
      pendingBadges: [],   // earned but not yet celebrated (popped by ui.refresh)
      spellsCelebrated: {},// spell name -> true once its unlock celebration has shown
      bestiary: { seen: {}, kills: {}, gauntlet: {}, befriended: {} },  // monster name -> true / defeat count / gauntlet win / soothed (Wave 8b)
      bounties: null,      // notice-board jobs {date, items:[...]}; null until task 1
      isleBounties: null,  // Wave 5: Port Brightwater's own separate board
      continent: 'west',   // which overworld you're on: 'west' | 'isles' | 'horologe' | 'chime' | 'gullwrack'
      isles: { lenses: {}, keys: {}, egg: null, pet: null },  // Level 2 state (also holds spireDone/hallsDone/breakwaterDone/lampLit/gullwrackRebuilt flags, set lazily as later waves earn them)
      charmsOn: [],        // the (up to) 3 charms currently WORN
      opened: {},          // chest/door keys like "d3:12,5"
      bossesDefeated: {},
      defeatedAt: {},      // "mapId:x,y" -> date string; today's kills stay gone today
      becalmedAt: {},      // "mapId:x,y" -> date string; today's tamed friends stay tame today
      streak: 0,
      totals: { answered: 0, correct: 0 },
      worldPos: null,
      seenBattleHelp: false,
      lastPracticed: {},   // Wave 8a (P5): skill -> date string, last real day practiced
      history: {},         // Wave 8a (P6): date string -> {skill: {a,c}}, pruned >30 days
      recentMisses: {},    // Wave 8a (P6): skill -> last 10 {text, kidAnswer}
      hatsRetired: 0,      // Wave 8a (P8): lifetime tiny-hat monsters defeated
      shopShelf: [],       // Wave 8a (P8): last few sold items, on display
      catPettedDate: null, // Wave 8a (P8): the inn cat's daily pat, once/day
      seenGearHint: false, // one-time "the shop sells sharper blades" nudge
      seenBraveHelp: false, // one-time ⚡ explainer on first brave toggle
      // ---------- Wave 8b: the two stances ----------
      // Two INDEPENDENT dials, both sticky, both the kid's to turn at will. They
      // COMPOSE — a kid can be brave and soothing at once. Neither is ever
      // auto-detected or inferred from how the kid plays (FINAL_REVIEW §5: both
      // mechanics-sets stay available to both kids at all times).
      stance: 'strike',    // 'strike' | 'soothe' — the VERB. Identical math,
                           // identical progress, identical rewards; different
                           // everything else.
      brave: false,        // ⚡ harder problems, double strike damage, never a
                           // trap: a brave miss costs exactly a normal miss.
      braveSolved: 0,      // lifetime brave problems SOLVED — pride that
                           // outlives the fight (report card + Hall of Heroes)
      seenCeremony: false, // the first-battle question: boldly, or gently?
      academy: null,       // Miscount's daily homework: {date, done}
      // ---------- Wave 9: "The Tending" (post-game practice) ----------
      // Every field below is meaningless until s.endingDone — the kid isn't
      // asked to tend a kingdom she hasn't finished putting right yet.
      daysTended: 0,        // counts UP only. Never resets, never shames.
      lastTendedDate: null, // dedupe: 2 tangles same day = still 1 day tended
      tangles: null,        // {date, items:[{x,y,done}]} — like s.bounties
      // Spiral Stair: deepest floor, highest checkpoint, reached-the-top-once
      // flag; staircase = the Wave 13 homesick staircase's state machine
      // ('lost' | 'following' | {waiting:{x,y}} | 'home').
      spiral: { highest: 0, landing: 0, toppedOut: false, staircase: 'lost' },
      academyTotal: 0,      // lifetime Academy slates checked (attendance; never resets)
      castleFurnish: { rug: false, garden: false, library: false, statues: [] },
      petHats: [],          // owned pet-hat ids; s.isles.pet.hat is which one is WORN
      // Practice Yard (the Tutor): a separate fluency track. stars keyed by
      // card id (0-3), milestones = claimed reward ids, challenge = the daily
      // Tutor-directed card {date, card, done}.
      yard: { stars: {}, milestones: {}, challenge: null, seen: false },
      ngPlus: 0,             // Golden Numeria (NG+) runs completed
      goldenSnapshot: null,  // the finished kingdom, saved so NG+ is reversible
      // ---------- Wave 10: "The World Notices" ----------
      // The Turning Stones (P1) read s.tasksDone.length live — zero new
      // state. The fence (P3) reads s.tasksDone.includes(6) live too — the
      // only new persisted field it needs is the one-time thank-you dialog.
      seenFenceThanks: false,
      // The rare-surprise pool (P4): once-EVER world moments, each its own
      // persisted seen-flag so none can ever repeat.
      seenGoldenBird: false,
      seenCatBeetle: false,
      seenHattedSlimes: false,
      // ---------- v1.7.0: "story & wonder" ----------
      spiralWalkNext: 0,      // the courtyard sequence walk's next expected stone
      seenSpiralWalk: false,  // once-EVER: a full in-order walk
      seenStairGlimmer: false, // once-EVER: first in-order walk completed post-ending
      spiralGlintPending: null, // index of the newest-turned stone, until next plaza crossing
      lastCatMoment: null,    // avoids repeating the same inn-cat moment twice in a row
      // ---------- Wave 12: "The Proving Rooms" ----------
      wing: null,             // the Workshop Wing: lazily built by E.ensureWing
      freeSlabs: {},          // Wave 12 (P2): free-standing slab positions per mapId
      // ---------- Wave 13: "The Understudy & Your Own Room" ----------
      seenUnderstudy: false,  // once-EVER: the Understudy's introduction modal
      // ---------- Wave 14: "The Court" (post-ending, renewable) ----------
      court: null,          // {date, cases:[...], celebrated} — day-keyed like s.tangles
      faculty: [],          // ids of claimed Faculty posts (counts up, never resets)
      courtSessions: 0,     // full 3/3 sessions heard — counts UP only (the milestone counter)
      casesHeard: 0,        // total cases settled — counts UP only (a teacher-flavored tally)
      magistrateVisits: 0,  // how many times the recurring Magistrate has appeared (escalation index)
      // ---------- Wave 15: "The Parlor" (post-ending, casual card play) ----------
      // Casual fluency play — does NOT touch mastery or the report card (a
      // casino that grades you is less fun). tokens (never gold, never
      // negative, a loss costs zero); games/wins count UP only; album = kinds
      // won from opponents (the collect-them-all trophies); cosmetics only.
      parlor: { tokens: 0, games: 0, wins: 0, album: {}, back: 'default', hats: {}, seenIntro: false },
      // ---------- Wave 16: "The Kitchen Garden" (post-ending, renewable) ----------
      // A plantable garden (arrays → muldiv_facts) + a kitchen (measuring →
      // fractions_as/fractions_m). Both RECORD to mastery. plot = the planted
      // rectangle {rows, cols, cells:[{x,y}]}; ready = counted+grown, ready to
      // harvest; ingredients = a simple fresh-produce counter the kitchen
      // spends; harvests/dishes count UP only (the Faculty milestones + the
      // teacher-flavored tally). seenChef = the sous-chef's once-ever intro.
      garden: { plot: null, ready: false, ingredients: 0, harvests: 0, dishes: 0, seenChef: false },
      // ---------- Wave 17: "The Menagerie" (post-ending, renewable) ----------
      // A nursery for the BEFRIENDED KINDS (s.bestiary.befriended). Tending
      // RECORDS to mastery (weakest-first across the whole curriculum — the
      // gentlest spaced-review surface in the game). pets = per befriended key
      // {tended, stage, hat} (grows like the pet, PET_STAGES-style); tends and
      // kindsTended count UP only (the Keeper milestone + a teacher-flavored
      // tally); paradeSeen guards the once-ever Parade capstone.
      menagerie: { pets: {}, tends: 0, kindsTended: 0, paradeSeen: false, seen: false },
    };
    E.enterWorld();
    E.save();
  };

  E.save = function () {
    if (!E.state) return;
    const s = E.state;
    const snapshot = { ...s, grid: undefined, monsters: undefined };
    localStorage.setItem(SAVE_PREFIX + s.name, JSON.stringify(snapshot));
  };

  E.load = function (name) {
    const raw = localStorage.getItem(SAVE_PREFIX + name);
    if (!raw) return false;
    E.state = JSON.parse(raw);
    // migrate pre-stamina saves
    const s = E.state;
    if (s.stamina == null) { s.stamina = 100; s.maxStamina = 100; }
    if (!s.items) s.items = { food: { bread: 1 }, treasures: [], charms: [] };
    // migrate pre-equip saves (old flat weapon/armor fields)
    if (!s.gear) {
      s.gear = {
        weapon: [s.weapon || 'stick'],
        body: [s.armor || 'clothes'],
        helmet: [], boots: [], ring: [],
      };
      if (!s.gear.weapon.includes('stick')) s.gear.weapon.unshift('stick');
      if (!s.gear.body.includes('clothes')) s.gear.body.unshift('clothes');
      s.equipped = { weapon: s.weapon || 'stick', body: s.armor || 'clothes', helmet: null, boots: null, ring: null };
      delete s.weapon; delete s.armor;
    }
    if (!s.difficulty) s.difficulty = 'hero';
    if (s.calmMode == null) s.calmMode = false;
    if (s.soundOff == null) s.soundOff = false;
    if (s.musicOff == null) s.musicOff = false;
    if (s.bigText == null) s.bigText = false;
    if (!s.badges) { s.badges = {}; s.pendingBadges = []; }
    if (!s.bestiary) s.bestiary = { seen: {}, kills: {}, gauntlet: {} };
    if (!s.bestiary.gauntlet) s.bestiary.gauntlet = {};
    if (!s.isles) s.isles = { lenses: {}, keys: {} };
    if (s.isles.egg === undefined) { s.isles.egg = null; s.isles.pet = null; }
    if (!s.charmsOn) s.charmsOn = (s.items.charms || []).slice(0, 3); // pre-slot saves: wear the first three
    if (!s.continent) s.continent = 'west';
    // Wave 2: gems, the amulet slot, and enchants — missing map = none yet
    if (!s.items.gems) s.items.gems = [];
    if (!s.gear.amulet) s.gear.amulet = [];
    if (s.equipped.amulet === undefined) s.equipped.amulet = null;
    if (!s.enchants) s.enchants = {};
    if (s.potionsBought == null) s.potionsBought = 0;
    if (s.seenBulkQuip == null) s.seenBulkQuip = false;
    if (s.defeatedAt == null) s.defeatedAt = {};
    if (s.becalmedAt == null) s.becalmedAt = {};
    { // prune yesterday-and-older entries so saves stay small
      const today = E.todayStr();
      for (const k of Object.keys(s.defeatedAt)) if (s.defeatedAt[k] !== today) delete s.defeatedAt[k];
      for (const k of Object.keys(s.becalmedAt)) if (s.becalmedAt[k] !== today) delete s.becalmedAt[k];
    }
    if (!s.parent) s.parent = { pin: null };
    if (!s.parent.topics) {
      // migrate the old "up to level N" cap into per-topic switches
      const cap = s.parent.topicCap || 10;
      s.parent.topics = {};
      MM.data.TASKS.filter(t => !t.exp).forEach((t, i) => { s.parent.topics[t.skill] = i < cap; });
      delete s.parent.topicCap;
    }
    // (Wave 4 force-wrote music_reading:false here. Removed 2026-07-11 by
    // user decision: every topic defaults ON — missing means enabled, and
    // only an explicit parent-panel choice writes false. Saves that were
    // seeded false keep their stored value; the panel flips it back on.)
    // Wave 4 carry-over: spell celebrations are new. A returning player who
    // already earned the gold badges for a spell shouldn't get a surprise
    // "you unlocked X!" popup for something they've had for ages — only
    // spells NOT yet unlocked should celebrate going forward.
    if (!s.spellsCelebrated) {
      s.spellsCelebrated = {};
      for (const name of ['scout', 'blink', 'beacon']) s.spellsCelebrated[name] = E.spellUnlocked(name);
    }
    // Wave 8a: rust weighting, growth tracking, and the hat counter — all
    // missing means "never tracked yet," not "reset to zero."
    if (!s.lastPracticed) s.lastPracticed = {};
    if (!s.history) s.history = {};
    if (!s.recentMisses) s.recentMisses = {};
    if (s.hatsRetired == null) s.hatsRetired = 0;
    if (!s.shopShelf) s.shopShelf = [];
    if (s.catPettedDate === undefined) s.catPettedDate = null;
    // gear-shop nudge: an old save past the stick has nothing to learn —
    // mark it seen so the hint can never fire as a non-sequitur late-game
    if (s.seenGearHint == null) s.seenGearHint = (s.equipped && s.equipped.weapon !== 'stick');
    if (s.seenBraveHelp == null) s.seenBraveHelp = false;
    // Wave 8b: the stances, the befriended axis, and the Academy.
    // A returning hero starts in ⚔️ Strike — which is exactly what they have
    // been doing all along — and is NOT stopped at the door and asked how they
    // will face their "first" monster, because they have already fought
    // hundreds. seenCeremony is therefore derived from whether they have ever
    // seen a battle at all (same idiom as seenGearHint above: an old save past
    // the stick has nothing to learn from the stick hint). They discover Soothe
    // the honest way — the stance buttons are in every battle, with tooltips.
    if (!s.stance) s.stance = 'strike';
    if (s.brave == null) s.brave = false;
    if (s.braveSolved == null) s.braveSolved = 0;
    if (s.seenCeremony == null) s.seenCeremony = !!s.seenBattleHelp;
    if (s.academy === undefined) s.academy = null;
    if (!s.bestiary.befriended) s.bestiary.befriended = {};
    // Wave 9: "The Tending" — missing means "never tended yet," not reset.
    if (s.daysTended == null) s.daysTended = 0;
    if (s.lastTendedDate === undefined) s.lastTendedDate = null;
    if (s.tangles === undefined) s.tangles = null;
    // v1.7.2: heal a non-numeric streak at load (JSON turns NaN into null;
    // a pre-streak save has undefined) — see the matching recordAnswer guard
    if (!Number.isFinite(s.streak)) s.streak = 0;
    if (!s.spiral) s.spiral = { highest: 0, landing: 0, toppedOut: false };
    if (s.spiral.toppedOut == null) s.spiral.toppedOut = (s.spiral.highest || 0) >= MM.maps.SPIRAL_MAX_FLOOR;
    if (s.academyTotal == null) s.academyTotal = 0;
    if (!s.castleFurnish) s.castleFurnish = { rug: false, garden: false, library: false, statues: [] };
    if (!s.castleFurnish.statues) s.castleFurnish.statues = [];
    if (!s.petHats) s.petHats = [];
    // Practice Yard (the Tutor): missing means "never visited yet."
    if (!s.yard) s.yard = { stars: {}, milestones: {}, challenge: null, seen: false };
    if (!s.yard.stars) s.yard.stars = {};
    if (!s.yard.milestones) s.yard.milestones = {};
    if (s.ngPlus == null) s.ngPlus = 0;
    if (s.goldenSnapshot === undefined) s.goldenSnapshot = null;
    // Golden Numeria (NG+) is reversible as of this version. A save that
    // started an NG+ run BEFORE the snapshot existed has no finished kingdom
    // to return to — reconstruct one (they finished once; endingDone proves
    // it) so the "Return to your finished kingdom" option can un-strand them.
    if (s.ngPlus > 0 && !s.goldenSnapshot && s.endingDone) {
      s.goldenSnapshot = E.reconstructFinishedSnapshot(s);
    }
    // Wave 10: "The World Notices" — missing means "never happened yet."
    if (s.seenFenceThanks == null) s.seenFenceThanks = false;
    if (s.seenGoldenBird == null) s.seenGoldenBird = false;
    if (s.seenCatBeetle == null) s.seenCatBeetle = false;
    if (s.seenHattedSlimes == null) s.seenHattedSlimes = false;
    // v1.7.0: "story & wonder" — missing means "never happened yet."
    if (s.spiralWalkNext == null) s.spiralWalkNext = 0;
    if (s.seenSpiralWalk == null) s.seenSpiralWalk = false;
    if (s.seenStairGlimmer == null) s.seenStairGlimmer = false;
    if (s.spiralGlintPending === undefined) s.spiralGlintPending = null;
    if (s.lastCatMoment === undefined) s.lastCatMoment = null;
    // Wave 12: the Workshop Wing + free slabs — missing means "never visited."
    if (s.wing === undefined) s.wing = null;
    if (!s.freeSlabs) s.freeSlabs = {};
    // Wave 13: the Understudy + the homesick staircase — missing means
    // "never happened yet" (myRoom migrates lazily inside E.ensureWing).
    if (s.seenUnderstudy == null) s.seenUnderstudy = false;
    if (!s.spiral.staircase) s.spiral.staircase = 'lost';
    // Wave 14: the Court — missing means "never held court yet." A pre-Wave-14
    // save migrates clean (no cases, no faculty, all counters at zero).
    if (s.court === undefined) s.court = null;
    if (!s.faculty) s.faculty = [];
    if (s.courtSessions == null) s.courtSessions = 0;
    if (s.casesHeard == null) s.casesHeard = 0;
    if (s.magistrateVisits == null) s.magistrateVisits = 0;
    // Wave 15: the Parlor — a pre-Wave-15 save migrates clean (no tokens, no
    // trophies, all counters at zero). The two-digit edge dial lives under
    // s.parent (missing = single-digit, the default).
    if (!s.parlor) s.parlor = { tokens: 0, games: 0, wins: 0, album: {}, back: 'default', hats: {}, seenIntro: false };
    if (s.parlor.album == null) s.parlor.album = {};
    if (s.parlor.hats == null) s.parlor.hats = {};
    if (s.parlor.back == null) s.parlor.back = 'default';
    if (s.parent && s.parent.parlorTwoDigit == null) s.parent.parlorTwoDigit = false;
    // Wave 16: the Kitchen Garden — a pre-Wave-16 save migrates clean (empty
    // plot, no ingredients, all counters at zero). The garden/kitchen record
    // under existing skills (muldiv_facts / fractions_as / fractions_m), which
    // already have their own parent switches.
    if (!s.garden) s.garden = { plot: null, ready: false, ingredients: 0, harvests: 0, dishes: 0, seenChef: false };
    if (s.garden.plot === undefined) s.garden.plot = null;
    if (s.garden.ingredients == null) s.garden.ingredients = 0;
    if (s.garden.harvests == null) s.garden.harvests = 0;
    if (s.garden.dishes == null) s.garden.dishes = 0;
    if (s.garden.seenChef == null) s.garden.seenChef = false;
    // Wave 17: the Menagerie — a pre-Wave-17 save migrates clean (no residents
    // tended, all counters at zero, the Parade unseen). A save with ZERO
    // befriended kinds simply shows the empty-pen "room for a friend" state —
    // never a crash. The nursery records under existing skills (weakest-first
    // across cappedSkills), which already have their own parent switches.
    if (!s.menagerie) s.menagerie = { pets: {}, tends: 0, kindsTended: 0, paradeSeen: false, seen: false };
    if (s.menagerie.pets == null) s.menagerie.pets = {};
    if (s.menagerie.tends == null) s.menagerie.tends = 0;
    if (s.menagerie.kindsTended == null) s.menagerie.kindsTended = 0;
    if (s.menagerie.paradeSeen == null) s.menagerie.paradeSeen = false;
    if (s.menagerie.seen == null) s.menagerie.seen = false;
    // Wave 18: the chosen avatar. A save with no s.avatar is an EXISTING
    // player — it MUST render exactly today's knight, so the default is
    // 'knight' and nothing force-writes another form. avatarPalette/heroHat
    // missing = "never customized," not reset.
    if (!s.avatar) s.avatar = 'knight';
    if (s.avatarPalette === undefined) s.avatarPalette = null;
    if (s.heroHat === undefined) s.heroHat = null;
    E.recalcMaxStamina(); // stamina now scales with level
    E.recalcMaxHp();      // max HP now scales with level + Tidewood Amulet
    // Session-shape pass (2026-07-13): resuming has ALWAYS pulled you to the
    // overworld (dungeons rebuild per visit — resuming inside one could
    // strand you among respawned monsters). Now it SAYS so, kindly, instead
    // of leaving a kid to wonder how she got outside.
    const wasInside = s.mapId && String(s.mapId).startsWith('d') && s.dungeonIndex
      ? MM.data.TASKS[s.dungeonIndex - 1] : null;
    E.enterWorld();  // always resume on the overworld
    if (wasInside) MM.ui.log(`⛺ You'd made camp outside the <b>${wasInside.dungeon}</b> — it's waiting whenever you're ready.`);
    return true;
  };

  // Wave 8a (P2, monster telegraphs): which topic icon (if any) this monster
  // should wear. Single-topic dungeons/floors show the dungeon's own topic on
  // every monster; mixed dungeons show it only on monster TYPES bound to one
  // (mon.skill) — an unbound type (including every boss) shows none, since
  // its problem really can draw from anywhere.
  E.monsterTopicIcon = function (mon) {
    const s = E.state;
    // Wave 10 (P4c): the hatted-slimes pair is never a real fight prompt —
    // no telegraph icon.
    if (!s || !s.dungeonIndex || mon.boss || mon.hattedPair) return null;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    if (!task) return null;
    const mixed = task.mixed || E.isDeepWingFloor(s);
    // Playtest 2026-07-13 ("the abacus symbol is obscure"): in a SINGLE-topic
    // dungeon every monster wore the same icon — zero information, pure
    // clutter (the taskBox and the entry line already name the subject).
    // Icons now appear only where they DIFFERENTIATE: mixed dungeons' bound
    // monster types.
    if (!mixed) return null;
    const skill = mon.skill;
    if (!skill || !MM.data.SKILL_ICONS[skill]) return null;
    // Telegraph honesty: never promise a topic pickProblem wouldn't actually
    // serve — the bound icon must vanish the instant a parent switches that
    // topic off (same fallback pickRegularMonsterProblem takes).
    if (!MM.mastery.cappedSkills(s).includes(skill)) return null;
    return MM.data.SKILL_ICONS[skill];
  };

  // ---------- difficulty (kid-settable): scales monster health & damage ----------
  E.diffMult = function () {
    const d = (E.state && E.state.difficulty) || 'hero';
    if (d === 'story') return { hp: 0.7, atk: 0.7 };
    if (d === 'legend') return { hp: 1.3, atk: 1.25 };
    return { hp: 1, atk: 1 };
  };
  E.monsterStats = function (i, isBoss) {
    const base = MM.data.monsterStats(i, isBoss);
    const m = E.diffMult();
    // Golden Numeria (Wave 7 NG+): the kingdom tangles again, harder — but the
    // hero keeps every level, gem and charm, so this stays a victory lap with
    // teeth rather than a wall. Compounds gently per run.
    const g = 1 + 0.25 * ((E.state && E.state.ngPlus) || 0);
    return {
      ...base,
      hp: Math.max(1, Math.round(base.hp * m.hp * g)),
      atk: Math.max(1, Math.round(base.atk * m.atk * g)),
      gold: base.gold ? Math.round(base.gold * g) : base.gold,
    };
  };

  // Per-topic parent switches. Missing map (fresh profile) = everything on.
  E.topicEnabled = function (skill) {
    const t = E.state && E.state.parent && E.state.parent.topics;
    return !t || t[skill] !== false;
  };
  // The shop's money quizzes are 2-digit subtraction: only ask them if that
  // topic is switched on for this player.
  E.moneyQuizOn = () => E.topicEnabled('multidigit_addsub');

  // ---------- gear & equipment ----------
  E.equippedItem = slot => MM.data.gearById(slot, E.state.equipped[slot]);
  E.hasRing = id => E.state.equipped.ring === id;
  E.hasAmulet = id => E.state.equipped.amulet === id;

  // ---------- enchant gems (Wave 2: Emberlyn the Enchanter) ----------
  // Fused to a slot+item PAIR (data.js has the full model note). Any
  // equipped slot can carry a gem — "mix-and-match" is the point.
  const ENCHANT_SLOTS = ['weapon', 'body', 'helmet', 'boots', 'ring', 'amulet'];
  E.enchantOn = function (slot) {
    const s = E.state;
    const id = s.equipped[slot];
    if (!id) return null;
    return (s.enchants || {})[`${slot}:${id}`] || null;
  };
  E.hasEnchant = gemId => ENCHANT_SLOTS.some(slot => E.enchantOn(slot) === gemId);

  // total block from body + helmet + boots (+ Ring of Guard, + Guard gems,
  // + Mason's Charm)
  E.totalDef = function () {
    let def = 0;
    for (const slot of ['body', 'helmet', 'boots']) {
      const it = E.equippedItem(slot);
      if (it) def += it.def || 0;
      if (E.enchantOn(slot) === 'guard') def += 1;
    }
    if (E.hasRing('guard')) def += 2;
    if (E.hasCharm('mason')) def += 1;
    return def;
  };

  // Max stamina grows with level, the Ring of Vigor, and the Wayfarer's Amulet.
  E.recalcMaxStamina = function () {
    const s = E.state;
    s.maxStamina = 100 + 5 * (s.level - 1) + (E.hasRing('vigor') ? 30 : 0) + (E.hasAmulet('wayfarer') ? 25 : 0);
    s.stamina = Math.min(s.stamina, s.maxStamina);
  };

  // Max HP grows with level and the Tidewood Amulet — recomputed fresh each
  // time (mirrors recalcMaxStamina) rather than incremented, so equipping/
  // unequipping the amulet takes effect immediately.
  E.recalcMaxHp = function () {
    const s = E.state;
    s.maxhp = 24 + 5 * (s.level - 1) + (E.hasAmulet('tidewood') ? 10 : 0);
    if (s.hp > s.maxhp) s.hp = s.maxhp;
  };

  E.equip = function (slot, id) {
    const s = E.state;
    if (id !== null && !s.gear[slot].includes(id)) return;
    s.equipped[slot] = id;
    if (slot === 'ring' || slot === 'amulet') { E.recalcMaxStamina(); E.recalcMaxHp(); }
    E.save();
    MM.ui.refresh();
  };

  E.ownGear = function (slot, id) {
    const s = E.state;
    if (!s.gear[slot].includes(id)) s.gear[slot].push(id);
  };

  // Wave 8a (P8, delight catalog): "the shopkeeper puts whatever you just
  // sold on the shelf behind her" — persistent, purely decorative, capped at
  // the 3 most recent so the shop modal never grows unbounded.
  E.shelveItem = function (item) {
    const s = E.state;
    s.shopShelf = s.shopShelf || [];
    s.shopShelf.unshift({ emoji: item.emoji, name: item.name });
    if (s.shopShelf.length > 3) s.shopShelf.length = 3;
  };

  // Sell unequipped gear back to the shop at half price.
  E.sellGear = function (slot, id) {
    MM.track('sellGear ' + slot + ' ' + id);
    const s = E.state;
    const item = MM.data.gearById(slot, id);
    if (!item || s.equipped[slot] === id || !s.gear[slot].includes(id)) return;
    // starter gear (price 0) sells for a sentimental 1 gold — otherwise the
    // stick and clothes clutter the bag forever with no way out (playtest)
    const v = Math.max(1, Math.floor(item.price / 2));
    if (!E.moneyQuizOn()) { // money-math topic disabled: no quiz
      s.gear[slot] = s.gear[slot].filter(x => x !== id);
      const paid = E.gainGold(v);
      E.shelveItem(item);
      MM.sound.coin();
      E.save();
      return MM.ui.dialog('🏪 Shop', `You sell the ${item.emoji} <b>${item.name}</b> for <b>${paid} gold</b>!`, () => MM.ui.openShop());
    }
    const g = s.gold;
    const keepsake = item.price <= 0; // "half of 0" would read as nonsense
    const prob = {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: keepsake
        ? `The shopkeeper turns the ${item.name} over fondly. "Every hero starts somewhere. One gold, for the memories. You have ${g} now, so how much will you walk out with?"`
        : `The shopkeeper inspects the ${item.name}. "Half of what you paid — that's ${v} gold. You have ${g} now, so how much will you walk out with?"`,
      answer: MM.problems.frac(g + v, 1),
      solution: `${g} + ${v} = ${g + v} gold.`,
    };
    MM.ui.showProblem({
      header: `🏪 Selling: ${item.emoji} <b>${item.name}</b> — ${v} gold ${keepsake ? '(for the memories)' : `(half of ${item.price})`}`,
      problem: prob,
      leaveLabel: 'Keep it',
      onAnswer(correct, kidAnswer) {
        recordAnswer('word_problems', correct, { text: prob.text, kidAnswer });
        const bonus = correct ? Math.ceil(v * 0.1) : 0;
        s.gear[slot] = s.gear[slot].filter(x => x !== id);
        const paid = E.gainGold(v + bonus);
        E.shelveItem(item);
        MM.sound.coin();
        E.save();
        return {
          msg: correct
            ? `"Quick math, quick sale! <b>${paid} gold</b> — with a ${bonus}-gold bonus." 🎉`
            : `"It's ${g + v}, dear. Here's your <b>${paid} gold</b>."`,
          end: 'win',
        };
      },
      onNext: () => {},
      onEnd() { MM.ui.openShop(); },
    });
  };

  // ---------- charms, gold, stamina ----------
  // You can OWN every charm, but only WEAR three at a time (s.charmsOn) —
  // a real choice, like the one-ring rule. Effects check what's WORN.
  E.CHARM_SLOTS = 3;
  E.PET_FETCH_CHANCE = 0.10; // stage-2+ pets fetch after victories (Wave 5)
  E.hasCharm = id => !!(E.state && E.state.charmsOn && E.state.charmsOn.includes(id));

  // Wave 10 (P4, the rare-surprise pool): each once-EVER world moment gets
  // its own exposed CHANCE hook, per eligible condition, same idiom as
  // E.MIMIC_CHANCE — drives pin these to 1 to force the moment, never touch
  // Math.random() directly.
  E.GOLDEN_BIRD_CHANCE = 0.01;   // per step walked on the mainland, once the fence is mended
  E.CAT_BEETLE_CHANCE = 0.01;    // per inn-cat pat
  E.HATTED_SLIMES_CHANCE = 0.01; // per Meadow Cave entry
  // v1.7.0 hooks, same idiom (drives pin to 0/1, never touch Math.random()):
  E.CAT_ESCORT_CHANCE = 0.3;     // per non-pat inn visit, appended to the moment
  E.GUESS_TALE_CHANCE = 0.35;    // per post-ending Academy visit, before the slates
  E.WRONG_ATTACK_CHANCE = 0.5;   // per boss counterattack (roughly half, for variety)
  // Wave 21 (Looking Glass P2.1): how often a curated NPC opens with a
  // reversed-greeting aside INSTEAD of overriding their whole conversation —
  // a bounded, occasional touch, not a permanent replacement of the reflected
  // replay's real story dialogue. Same pin-for-drives idiom as the rest.
  E.MIRROR_GREETING_CHANCE = 0.4;

  E.toggleCharm = function (id) {
    MM.track('toggleCharm ' + id);
    const s = E.state;
    if (!s.items.charms.includes(id)) return;
    const i = s.charmsOn.indexOf(id);
    if (i >= 0) {
      s.charmsOn.splice(i, 1);
      MM.ui.log(`You tuck the ${MM.data.charmById(id).emoji} ${MM.data.charmById(id).name} away.`);
    } else if (s.charmsOn.length < E.CHARM_SLOTS) {
      s.charmsOn.push(id);
      MM.sound.coin();
      MM.ui.log(`✨ You put on the ${MM.data.charmById(id).emoji} <b>${MM.data.charmById(id).name}</b>.`);
    } else {
      MM.ui.log(`✨ You can only wear <b>${E.CHARM_SLOTS} charms</b> at once — take one off first!`);
    }
    E.save();
  };

  // every gold gain flows through here so Magnet/Fortune apply everywhere
  E.gainGold = function (amount) {
    let mult = 1;
    if (E.hasCharm('magnet')) mult += 0.25;
    if (E.hasRing('fortune')) mult += 0.15;
    if (E.hasEnchant('magnet')) mult += 0.10;
    // the tiny epsilon guards against float drift (e.g. 1+0.10 * 100 landing
    // on 110.00000000000001) rounding UP to the wrong whole gold amount
    const bonus = mult > 1 ? Math.ceil(amount * mult - 1e-9) : amount;
    E.state.gold += bonus;
    return bonus;
  };

  E.dodgeChance = function () {
    const s = E.state;
    if (s.stamina <= 0) return 0;                 // too tired to sidestep
    let chance = 0.35 + (E.hasCharm('clover') ? 0.10 : 0);
    const boots = E.equippedItem('boots');
    if (boots && boots.dodge) chance += boots.dodge / 100;
    if (E.hasEnchant('feather')) chance += 0.04;
    if (s.seaLegs) chance += 0.10;                // fizzy mystery potion
    return chance;
  };

  E.spendStamina = function (n) {
    const s = E.state;
    const before = s.stamina;
    s.stamina = Math.max(0, s.stamina - n);
    if (before > 25 && s.stamina <= 25 && s.stamina > 0) {
      MM.ui.log('🍞 Your stomach growls... you\'re getting tired. Eat something — the 🍗 Food button!');
    } else if (before > 0 && s.stamina === 0) {
      MM.ui.log('😫 <b>You are exhausted!</b> Half damage and no dodging until you eat or rest — but you can always still walk.');
    }
  };

  E.eat = function (foodId) {
    MM.track('eat ' + foodId);
    const s = E.state;
    const food = MM.data.foodById(foodId);
    if (!food || !(s.items.food[foodId] > 0)) return;
    s.items.food[foodId]--;
    s.stamina = Math.min(s.maxStamina, s.stamina + food.stamina);
    MM.sound.coin();
    MM.ui.log(`${food.emoji} You eat the ${food.name}. Stamina: ${s.stamina}/${s.maxStamina}.`);
    E.save();
    MM.ui.refresh();
  };

  // Grant a random charm the player doesn't own yet (null if they have all).
  // Auto-worn if there's a free charm slot; `worn` tells the caller which.
  E.awardCharm = function () {
    const s = E.state;
    const unowned = MM.data.CHARMS.filter(c => !s.items.charms.includes(c.id));
    if (!unowned.length) return null;
    const charm = unowned[Math.floor(Math.random() * unowned.length)];
    s.items.charms.push(charm.id);
    let worn = false;
    if (s.charmsOn.length < E.CHARM_SLOTS) { s.charmsOn.push(charm.id); worn = true; }
    return { ...charm, worn };
  };

  // Gems are never "owned out" like charms — duplicates are fine, you might
  // want the same gem on two different items — so this always returns one.
  E.awardGem = function () {
    const s = E.state;
    const gem = MM.data.pick(MM.data.GEMS);
    s.items.gems = s.items.gems || [];
    s.items.gems.push(gem.id);
    return gem;
  };

  // Emberlyn fuses gemId onto whatever's currently equipped in `slot`. Always
  // succeeds — a correct answer makes it free, a miss costs 25 gold (gentle,
  // still fuses). Re-enchanting loses whatever gem was there before.
  E.fuseGem = function (slot, gemId) {
    MM.track('fuseGem ' + slot + ' ' + gemId);
    const s = E.state;
    const itemId = s.equipped[slot];
    if (!itemId) return;
    const idx = (s.items.gems || []).indexOf(gemId);
    if (idx === -1) return;
    const gem = MM.data.gemById(gemId);
    const item = MM.data.gearById(slot, itemId);
    const prob = MM.mastery.pickMixedGate(s);
    MM.ui.showProblem({
      header: `🔥 <b>Fusing the ${gem.emoji} ${gem.name} Gem</b> onto your ${item.emoji} ${item.name} — free if you get this right, 25 gold if not (it works either way)`,
      problem: prob,
      leaveLabel: 'Never mind',
      onAnswer(correct, kidAnswer) {
        recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
        s.items.gems.splice(idx, 1);
        s.enchants = s.enchants || {};
        s.enchants[`${slot}:${itemId}`] = gemId;
        let msg = correct
          ? `"Perfect technique!" The gem melts into place, free of charge.`
          : `"Close enough — I'll smooth the rough edges myself." That'll be <b>25 gold</b>.`;
        if (!correct) s.gold = Math.max(0, s.gold - 25);
        msg += `<br>✨ Your gear is now the ${MM.data.gearLabel(slot, itemId)}!`;
        E.save();
        return { msg, end: 'win' };
      },
      onNext: () => {},
      onEnd() { MM.ui.enchanterDialog(); },
    });
  };

  E.profiles = function () {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(SAVE_PREFIX)) out.push(k.slice(SAVE_PREFIX.length));
    }
    return out.sort();
  };

  // Read another adventurer's save WITHOUT loading it (the Hall of Heroes,
  // Wave 7). E.load() would replace E.state and yank the current player out
  // of their own game — this just peeks. Returns null on anything unreadable,
  // because one corrupt save must never take the whole Hall down with it.
  E.peekProfile = function (name) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + name);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  // Every honour an adventurer has actually earned, derived from their flags
  // rather than stored — so a save from before Wave 7 still shows its titles.
  E.titlesFor = function (st) {
    if (!st) return [];
    const isles = st.isles || {};
    const out = [];
    if (st.tasksDone && st.tasksDone.includes(10)) out.push('Crownbearer');
    if (isles.lampLit) out.push('Keeper of the Light');
    if (isles.gullwrackRebuilt) out.push('Guildmember of Gullwrack');
    if (st.spiral && st.spiral.toppedOut) out.push('Top of the Spiral');
    // Wave 12: derived from the room flags (not just the stored title), so
    // a save that finished the Wing always shows the honour.
    if (st.wing && st.wing.rooms && E.WING_ROOMS.every(r => st.wing.rooms[r])) out.push('Keeper of the Proving Rooms');
    if (st.endingDone) out.push('The New MathMaker');
    return out;
  };
  E.WING_ROOMS = ['grumbold', 'wren', 'armory', 'petronella', 'pantry', 'plate'];

  E.deleteProfile = function (name) {
    localStorage.removeItem(SAVE_PREFIX + name);
  };

  // ---------- the Adventurer's Passport (Pass F) ----------
  // Saves live in the browser; the passport is how they TRAVEL — a small
  // JSON file a family can back up, move to grandma's laptop, or email to
  // a cousin. No accounts, no server: the file IS the account.
  E.exportSave = function () {
    E.save();
    return localStorage.getItem(SAVE_PREFIX + E.state.name);
  };
  E.importSave = function (json) {
    let save;
    try { save = JSON.parse(json); } catch (e) { return { error: 'That file isn\'t a Math Quest passport.' }; }
    if (!save || typeof save.name !== 'string' || !save.name.trim() || typeof save.taskIndex !== 'number') {
      return { error: 'That file isn\'t a Math Quest passport.' };
    }
    const name = save.name.trim().slice(0, 24);
    const existed = !!localStorage.getItem(SAVE_PREFIX + name);
    localStorage.setItem(SAVE_PREFIX + name, JSON.stringify(save));
    return { name, existed }; // E.load(name) runs it through every migration
  };

  // ---------- Wave 18: the avatar (one state, two doors) ----------
  // The Looking Glass (Bag, day one) and the Study wardrobe (post-ending
  // deluxe) both write the SAME fields through here. Purely cosmetic — this
  // touches nothing but the look. Returns the previous form so a caller can
  // tell whether the shape actually changed (for the pet's double-take).
  E.setAvatar = function (avatar, palette) {
    const s = E.state;
    if (!s) return null;
    const prev = s.avatar || 'knight';
    if (!MM.sprites.AVATARS[avatar]) avatar = 'knight';
    s.avatar = avatar;
    // a palette only lives on the human forms; drop it on the non-human ones
    // so a later human pick starts from its own defaults, not a stale swatch
    s.avatarPalette = (MM.sprites.avatarDef(avatar).human && palette) ? palette : null;
    E.save();
    return prev;
  };
  // The pet's double-take (Wave 16's E.petEmote), fired when the kid changes
  // INTO a creature form — the pet looks at you, then at itself, then at you.
  E.petDoubleTake = function () {
    if (E.state && E.state.isles && E.state.isles.pet) {
      E.petEmote = { ch: '🤔', until: Date.now() + 2800 };
    }
  };

  // ---------- map handling ----------
  // Wave 7.1: restore a saved overworld position only if it's a tile the
  // player could STAND on today — rescues any save stranded on a since-
  // sealed trap tile (a live playtester was stuck on Horologe's (20,2))
  function safeStart(s) {
    const p = s.worldPos;
    if (p && s.grid[p.y] && '.P='.includes(s.grid[p.y][p.x])) return p;
    return MM.maps.find(s.grid, 'P')[0];
  }

  E.enterWorld = function () {
    const s = E.state;
    // Wave 13: per-map-visit transients (echo buffer, Understudy, pupil,
    // staircase trail) never survive a map change.
    if (E.resetTransientEntities) E.resetTransientEntities();
    if ((s.continent || 'west') === 'isles') return E.enterIsles();
    if (s.continent === 'horologe') return E.enterHorologe();
    if (s.continent === 'chime') return E.enterChime();
    if (s.continent === 'gullwrack') return E.enterGullwrack();
    s.mapId = 'world';
    s.grid = MM.maps.parse(MM.maps.OVERWORLD, '~');
    s.monsters = [];
    // the bridge to Miscount's bank rises once all ten tasks are done
    if (s.tasksDone && s.tasksDone.includes(10)) {
      for (const b of MM.maps.BRIDGE) s.grid[b.y][b.x] = '=';
    }
    // Wave 12 (P4): an opened overworld chest (the stepping-stone islet)
    // stays open — same persistence scheme as dungeon chests.
    for (const key of Object.keys(s.opened || {})) {
      const [mid, xy] = key.split(':');
      if (mid !== 'world') continue;
      const [x, y] = xy.split(',').map(Number);
      if (s.grid[y] && s.grid[y][x] === '*') s.grid[y][x] = '.';
    }
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    // Wave 13 (P3): a following staircase re-forms behind you; one parked
    // right where you stand (it waited at the door) falls in on its own.
    if (s.spiral && s.spiral.staircase) {
      const st = s.spiral.staircase;
      if (st === 'following') {
        E.stairPos = { x: s.px, y: s.py };
        E._stairTrail = [];
      } else if (st.waiting && st.waiting.x === s.px && st.waiting.y === s.py) {
        s.spiral.staircase = 'following';
        E.stairPos = { x: s.px, y: s.py };
        E._stairTrail = [];
        MM.ui.log('🪜 The staircase falls in behind you again.');
      }
    }
    E.refreshTangles();
    MM.ui.log('You stand in the kingdom of Numeria.');
    // Session-shape pass (2026-07-13): a returning kid should hear what's
    // new TODAY in the first second, not after walking to a board. One
    // line, only when there's genuinely something waiting.
    if (s.endingDone && s.tangles && s.tangles.items.some(t => !t.done)) {
      const n = s.tangles.items.filter(t => !t.done).length;
      MM.ui.log(`🌀 ${n === 1 ? 'A tangle was' : n + ' tangles were'} spotted overnight — the notice boards know where.`);
    }
    MM.ui.refresh();
  };

  // The Isles overworld. Murk fog tiles melt away as lenses are lit —
  // the island itself is the progress bar.
  E.enterIsles = function () {
    const s = E.state;
    s.mapId = 'isles';
    s.grid = MM.maps.parse(MM.maps.ISLES, '~');
    s.monsters = [];
    const gone = { u: !!s.isles.lenses.tidepool, v: !!s.isles.lenses.frostbite, w: !!s.isles.lenses.cinderforge };
    for (let y = 0; y < s.grid.length; y++) {
      for (let x = 0; x < s.grid[y].length; x++) {
        if (gone[s.grid[y][x]]) s.grid[y][x] = '.';
      }
    }
    // a previously-bumped Vault secret wall stays revealed forever
    for (const key of Object.keys(s.opened)) {
      const [mid, xy] = key.split(':');
      if (mid !== 'isles') continue;
      const [x, y] = xy.split(',').map(Number);
      if (s.grid[y] && s.grid[y][x] === '%') s.grid[y][x] = '4';
    }
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('Salt air and gull cries — the Uncharted Isles.');
    MM.ui.refresh();
  };

  // Horologe Isle overworld — town-less, just the Spire and a dock.
  E.enterHorologe = function () {
    const s = E.state;
    s.mapId = 'horologe';
    s.grid = MM.maps.parse(MM.maps.HOROLOGE, '~');
    s.monsters = [];
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('Gears click somewhere underfoot — Horologe Isle.');
    MM.ui.refresh();
  };

  // Chime Isle overworld — town-less, just the Resonant Halls and a dock.
  E.enterChime = function () {
    const s = E.state;
    s.mapId = 'chime';
    s.grid = MM.maps.parse(MM.maps.CHIME, '~');
    s.monsters = [];
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('A faint hum drifts on the wind — Chime Isle.');
    MM.ui.refresh();
  };

  // Gullwrack Harbor overworld (Wave 6) — a full town, like the Isles,
  // unlike town-less Horologe/Chime: shops, an inn, NPCs, a notice board,
  // and the slab-tiling repair sites (MM.maps.REPAIR_SITES.gullwrack).
  E.enterGullwrack = function () {
    const s = E.state;
    s.mapId = 'gullwrack';
    s.grid = MM.maps.parse(MM.maps.GULLWRACK, '~');
    s.monsters = [];
    E.applySiteState('gullwrack');
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('Salt-worn timbers and gull cries — Gullwrack Harbor.');
    MM.ui.refresh();
  };

  // ---------- Wave 7: The Open Castle ----------
  // The castle doors open once the kingdom is whole: all thirteen tasks, the
  // Great Lamp lit, and the Spire ticking again. Deliberately NOT gated on the
  // Resonant Halls — music is a parent opt-in, and no kid should be locked out
  // of the ending by a topic their parent switched off. (If they DID beat the
  // Discord, the choir turns up in the epilogue.)
  E.castleOpen = function () {
    const s = E.state;
    return !!(s.tasksDone && s.tasksDone.includes(13) && s.isles && s.isles.lampLit && s.isles.spireDone);
  };
  // What's still missing, in the castle's own voice — never a bare "no".
  E.castleGateHint = function () {
    const s = E.state;
    const left = [];
    if (!(s.tasksDone && s.tasksDone.includes(13))) left.push('every task returned');
    if (!(s.isles && s.isles.lampLit)) left.push('the <b>Great Lamp</b> lit');
    if (!(s.isles && s.isles.spireDone)) left.push('the <b>Clockwork Spire</b> ticking again');
    return left;
  };

  E.enterCastle = function () {
    const s = E.state;
    MM.track('enterCastle');
    // Wave 13 (P3): the staircase waits outside — stairs live in towers,
    // not castles. It knows the difference. (Bump it on the way out.)
    if (s.spiral && s.spiral.staircase === 'following' && s.mapId === 'world') {
      E.stairParkHere();
    }
    if (E.resetTransientEntities) E.resetTransientEntities();
    if (MM.maps.isOverworld(s.mapId)) s.worldPos = { x: s.px, y: s.py };
    s.mapId = 'castle';
    s.grid = MM.maps.parse(MM.maps.CASTLE, '#');
    s.monsters = [];   // no combat in the castle. Ever.
    const start = MM.maps.find(s.grid, 'P')[0];
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('🏰 The great doors swing wide. Inside, the castle is <b>warm</b>, and someone has lit every lamp.');
    E.save();
    MM.ui.refresh();
    // the one-time gag, once the story is over: a monster has enrolled
    if (s.endingDone && !s.enrollSeen) {
      s.enrollSeen = true;
      E.save();
      MM.ui.dialog('🎩 A visitor in the Study',
        'A <b>Slime</b> is sitting very politely in the Study, wearing a tiny hat.<br><br>' +
        'It has brought a slate. It has brought a pencil. It has, alarmingly, brought a <i>second</i> pencil, ' +
        'in case the first one has an accident.<br><br>' +
        '"It says it\'s here to <b>enroll</b>," Miscount reports. "I checked twice. That is genuinely what it says."<br><br>' +
        '<i>The MathMaker is already pulling up a chair.</i>');
    }
  };

  E.exitCastle = function () {
    MM.ui.log('You step back out into the daylight.');
    E.enterWorld();
    E.save();
  };

  // ---------- the Gallery of Ten ----------
  // The ten recovered treasures, on plinths, in the order you found them.
  // Bumping one replays a single line of the kid's OWN history — this room is
  // a museum of the player, which is why it costs almost nothing and lands
  // harder than anything else in the castle.
  E.galleryPlinth = function (x, y) {
    const s = E.state;
    // plinths are laid out in two rows of five; read the index off the map so
    // the numbering can never drift from the art
    const all = MM.maps.find(s.grid, 'E').sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const row = y === all[0].y ? 0 : 1;
    const col = all.filter(p => p.y === y).findIndex(p => p.x === x);
    const idx = row * 5 + col;              // 0-9
    const task = MM.data.TASKS[idx];
    if (!task) return;
    if (!s.tasksDone.includes(idx + 1)) {
      return MM.ui.dialog('🕯 An empty plinth',
        `A velvet cushion, a little brass plate, and nothing on it yet.<br><br>` +
        `<i>The plate reads: <b>${task.item}</b> — ${task.dungeon}.</i>`);
    }
    const entry = MM.data.GALLERY[idx];
    const memory = typeof entry === 'string' ? entry : (s.endingDone ? entry.after : entry.before);
    MM.ui.dialog(`${task.itemEmoji} ${task.item}`,
      `<i>${task.dungeon}</i><br><br>${memory}`);
  };

  // ---------- Wave 9 (P3): cosmetic gold sinks — castle furnishing ----------
  // Bump-to-buy, exactly like the Gallery's own plinths above. Plain gold
  // for an item — deliberately NOT routed through the shop's money-quiz
  // discount (that belongs to the shop counter; this is a fixture you walk
  // up to around the house). Permanent, cosmetic, priced to matter.
  E.castleFurnishBump = function (kind) {
    const s = E.state;
    const item = MM.data.CASTLE_FURNISH[kind];
    if (!s.endingDone) {
      return MM.ui.dialog('🏰 Not yet', 'The steward\'s ledger stays shut until the crown is truly yours.');
    }
    if (s.castleFurnish[kind]) {
      return MM.ui.dialog(`${item.emoji} ${item.name}`, item.bought);
    }
    MM.ui.dialogChoices(`${item.emoji} ${item.name}`,
      `${item.empty}<br><br>Furnish it for <b>${item.price} gold</b>?`,
      [
        { label: `Buy — ${item.price}g`, primary: true, onClick: () => {
          if (s.gold < item.price) return MM.ui.dialog('🏰 Not quite', `That's <b>${item.price} gold</b> — you have ${s.gold}.`);
          s.gold -= item.price;
          s.castleFurnish[kind] = true;
          MM.sound.fanfare();
          E.save();
          MM.ui.dialog(`${item.emoji} ${item.name}`, item.bought);
        } },
        { label: 'Not now', onClick: () => {} },
      ]);
  };

  // Buy once, then wear/take-off freely — the gold sink is the FIRST hat;
  // switching between owned hats afterward is free, same as swapping charms.
  E.petHatAction = function (id) {
    const s = E.state;
    const pet = s.isles && s.isles.pet;
    const h = MM.data.petHatById(id);
    if (!pet || !h) return { ok: false };
    if (!s.petHats.includes(id)) {
      if (s.gold < h.price) return { ok: false, msg: `That's <b>${h.price} gold</b> — you have ${s.gold}.` };
      s.gold -= h.price;
      s.petHats.push(id);
      pet.hat = id;
      MM.sound.fanfare();
    } else if (pet.hat === id) {
      pet.hat = null;
    } else {
      pet.hat = id;
    }
    E.save();
    return { ok: true };
  };

  // ---------- the Practice Yard (the Tutor) ----------
  // A separate fluency track (see MM.data.YARD_CARDS). Everything reads/writes
  // s.yard.stars (card id -> 0..3). Nothing here touches topic mastery.
  E.yardStar = id => (E.state.yard.stars[id] || 0);
  E.yardUnlocked = function (id) {
    const c = MM.data.yardCardById(id);
    if (!c) return false;
    return c.prereq.every(p => E.yardStar(p) >= 1); // a prereq at bronze+ opens it
  };
  // the Tutor's "work on this next": the lowest-order UNLOCKED card that
  // isn't gold yet (falls back to the first card once everything is gold).
  E.yardRecommended = function () {
    const open = MM.data.YARD_CARDS.filter(c => E.yardUnlocked(c.id) && E.yardStar(c.id) < 3);
    if (!open.length) return MM.data.YARD_CARDS[0].id;
    return open.sort((a, b) => a.order - b.order)[0].id;
  };
  E.hasPet = () => !!(E.state.isles && E.state.isles.pet);

  // Grant a reward bundle (any of gold/potions/food/charm/hat/title). Hats go
  // into the collection whether or not a pet exists yet — the caller narrates
  // the "for a companion you'll meet" line. Returns display parts + whether a
  // hat was newly earned (so the caller can add the pet note).
  E.yardGrantReward = function (reward) {
    const s = E.state; const parts = []; let gotHat = false;
    if (reward.gold) { const g = E.gainGold(reward.gold); parts.push(`<b>${g} gold</b>`); }
    if (reward.potions) { s.potions += reward.potions; parts.push(`<b>${reward.potions}</b> 🧪 potion${reward.potions > 1 ? 's' : ''}`); }
    if (reward.food) {
      for (let i = 0; i < reward.food; i++) { const f = MM.data.FOODS[Math.floor(Math.random() * MM.data.FOODS.length)]; s.items.food[f.id] = (s.items.food[f.id] || 0) + 1; }
      parts.push(`<b>${reward.food}</b> 🍗 food`);
    }
    if (reward.charm && !s.items.charms.includes(reward.charm)) {
      s.items.charms.push(reward.charm); const c = MM.data.charmById(reward.charm);
      parts.push(`the ${c.emoji} <b>${c.name}</b> charm`);
    }
    if (reward.hat && !s.petHats.includes(reward.hat)) {
      s.petHats.push(reward.hat); gotHat = true; const h = MM.data.petHatById(reward.hat);
      parts.push(`the ${h.emoji} <b>${h.name}</b>`);
    }
    if (reward.title) { s.titles = s.titles || []; if (!s.titles.includes(reward.title)) { s.titles.push(reward.title); parts.push(`the title <b>“${reward.title}”</b>`); } }
    return { parts, gotHat };
  };

  // After a card's star changes, award any newly-completed milestones. Returns
  // an array of {milestone, parts, gotHat} for the UI to announce in order.
  E.yardCheckMilestones = function () {
    const s = E.state; const earned = [];
    for (const ms of MM.data.YARD_MILESTONES) {
      if (s.yard.milestones[ms.id]) continue;
      if (ms.cards.every(cid => E.yardStar(cid) >= ms.need)) {
        s.yard.milestones[ms.id] = true;
        const g = E.yardGrantReward(ms.reward);
        earned.push({ milestone: ms, parts: g.parts, gotHat: g.gotHat });
        MM.sound.fanfare();
      }
    }
    if (earned.length) E.save();
    return earned;
  };

  // Record a finished drill of `total` questions with `correct` right. Each
  // star is a CLEAN RUN — all correct (user, 2026-07-16: "fluency means all 8;
  // the first star shouldn't be reachable without 8/8"). So a clean run bumps
  // the star by one (bronze → silver → gold, three clean runs to master) and a
  // miss earns nothing. Gives a little XP for a NEW star, marks the daily
  // challenge done if this was its card, returns {star, up, challengeDone, …}.
  E.yardComplete = function (cardId, correct, total) {
    const s = E.state; const before = E.yardStar(cardId); let star = before;
    const clean = correct >= total;
    if (clean && before < 3) star = before + 1;
    s.yard.stars[cardId] = star;
    const up = star > before;
    if (up) E.gainXp(5 * (star - before)); // free-practice reward: a little XP
    // the daily Tutor-directed challenge pays its consumable bundle on a solid
    // clear (>=75%) of ITS card — the Tutor chose it, so no easy-drill farm.
    let challengeDone = false, challengeParts = null;
    const ch = s.yard.challenge;
    if (ch && ch.card === cardId && !ch.done && correct >= Math.ceil(total * 0.75)) {
      ch.done = true; challengeDone = true;
      challengeParts = E.yardGrantReward(E.YARD_CHALLENGE_REWARD).parts;
    }
    E.save();
    const milestones = E.yardCheckMilestones();
    return { star, before, up, clean, challengeDone, challengeParts, milestones };
  };

  // The daily Tutor-directed challenge. The Tutor CHOOSES the card (weighted
  // to number-sense, unmastered, and low-order cards) so the consumable
  // reward can never be farmed on the easiest drill. Date-keyed like bounties.
  E.yardChallenge = function () {
    const s = E.state; const today = E.todayStr();
    if (s.yard.challenge && s.yard.challenge.date === today) return s.yard.challenge;
    const unlocked = MM.data.YARD_CARDS.filter(c => E.yardUnlocked(c.id));
    const pool = unlocked.filter(c => E.yardStar(c.id) < 3);
    const src = pool.length ? pool : unlocked;
    const bag = [];
    for (const c of src) {
      let w = 1;
      if (c.track === 'sense') w += 2;          // foundational: encouraged
      if (E.yardStar(c.id) === 0) w += 1;        // never-touched: nudge it
      for (let i = 0; i < w; i++) bag.push(c.id);
    }
    const card = bag[Math.floor(Math.random() * bag.length)];
    s.yard.challenge = { date: today, card, done: false };
    E.save();
    return s.yard.challenge;
  };
  E.YARD_CHALLENGE_REWARD = { potions: 3, food: 3, gold: 20 };

  E.tutor = function () { return MM.ui.practiceYard(); };

  // Three independent plinths (not a dependency chain, unlike the Gallery —
  // these are trophies, not a story). Picks from E.gauntletBosses(), which
  // already dedupes multi-floor mapIds down to one entry per boss.
  E.commissionStatue = function (idx, name) {
    const s = E.state;
    if (s.gold < MM.data.STATUE_PRICE) {
      return MM.ui.dialog('🗿 Not quite', `That's <b>${MM.data.STATUE_PRICE} gold</b> — you have ${s.gold}.`);
    }
    s.gold -= MM.data.STATUE_PRICE;
    s.castleFurnish.statues[idx] = name;
    MM.sound.fanfare();
    E.save();
    MM.ui.dialog(`🗿 ${name}`, MM.data.STATUE_LINE(name));
  };

  // ---------- the Study: the reveal ----------
  // The one scene the whole game has been walking toward. Teacher and former
  // student, side by side, telling the kid the truth. Sincere throughout —
  // no jokes land in this room (STORY_BIBLE hard rule 4).
  E.studyReveal = function () {
    const s = E.state;
    // Wave 21 (Looking Glass P2.1): through the glass, the Study scene is a
    // reflection too — gated on inMirror() exactly like everything else in
    // this wave; the real post-ending scene (E.studyAfter) is untouched.
    if (s.endingDone) return E.inMirror() ? E.studyAfterMirror() : E.studyAfter();
    const step3 = () => MM.ui.dialogChoices('🧙 The MathMaker',
      `"So." He folds his hands. "You have put every wrong thing right, and you did it the only way it can be done — ` +
      `<b>one careful step at a time</b>."<br><br>` +
      `"Which leaves me one last thing to teach you. And I am afraid I cannot teach it by telling you."<br><br>` +
      `<i>He crosses to a great slate on the wall, picks up the chalk — and holds it out to you, handle first.</i><br><br>` +
      `"I never needed a hero, child. Heroes leave." He smiles, and it is the smile of a man laying something down at last. ` +
      `"I needed a <b>teacher</b>. <b>Teachers multiply.</b>"<br><br>` +
      `"Sit. I will work, and <b>you</b> will mark me. Five problems. Look at my working, not just my answer — ` +
      `<i>the answer is only ever the last thing that happens.</i>"`,
      [
        { label: '✏️ Take the chalk', primary: true, onClick: () => E.finalExam() },
        { label: 'Not just yet', onClick: () => {} },
      ]);
    const step2 = () => MM.ui.dialog('🧑‍🎓 Miscount',
      `"I worked it out, eventually. What I actually did." Miscount turns a piece of chalk over in his fingers.<br><br>` +
      `"I stopped working things out. That's all. I got tired, and I guessed, and then I guessed about the guesses — ` +
      `and the tangles came in where the working should have been. Not because I was <b>wicked</b>."<br><br>` +
      `"Because I wasn't <b>tending</b> it."<br><br>` +
      `<i>He looks up.</i> "Everything you untangled out there? Somebody had stopped tending it. That's the whole secret. ` +
      `It's a very small, very ordinary secret, and it cost the kingdom nine years."`,
      step3);
    MM.ui.dialog('🧙 The MathMaker',
      `The Study is small, and full of chalk dust, and there are two chairs.<br><br>` +
      `"You asked me once why the monsters come apart when you show your work." The MathMaker does not look up from ` +
      `the slate. "I have been putting off the answer, because it is not a clever one. It is only <b>true</b>."<br><br>` +
      `"Numeria is <b>made</b> of number-stuff. Sylvia was not being poetic — the mortar really is arithmetic. ` +
      `And wherever people stop working things out, the disorder pools, and it <b>tangles</b>."<br><br>` +
      `"That is all a monster has ever been, child. A tangle, where the working should have been."<br><br>` +
      `<i>He sets down the chalk.</i> "A worked answer <b>unties</b> it. Not because you are strong. Because you are <b>right</b>, ` +
      `and you can show why."`,
      step2);
  };

  // Post-ending, the Study is just... a study. Two people who like each other,
  // doing sums.
  E.studyAfter = function () {
    MM.ui.dialog('🧙 The MathMaker & 🧑‍🎓 Miscount',
      `They have the slate between them and they are arguing, with enormous enjoyment, about the <b>tidiest</b> way to ` +
      `write out a long division.<br><br>` +
      `"Ah — the <b>MathMaker</b>," says the MathMaker, and stands aside to give you the chalk. He says the title without ` +
      `a flicker of irony, because it is simply your name now.<br><br>` +
      `<span class="dim">"Settle this for us, would you?"</span>`);
  };

  // Wave 21 (Looking Glass P2.1): the mirror Study. Per LOOKING_GLASS_SCOPING
  // ("the redeemed guesser's reflection is the guesser he used to be, OR an
  // eerily perfect worker-out"), this scene plays BOTH: the MathMaker's
  // reflection never needs correcting (which is its own kind of lonely), and
  // Miscount's reflection is the guesser the real one left behind. One
  // authored scene stands in for both the mirror-MathMaker and mirror-
  // Miscount lines (deviation: cut from two separate beats to one — the
  // pairing reads better together, and the budget stays tight).
  E.studyAfterMirror = function () {
    MM.ui.dialog('🪞 The Study, reflected',
      `The Study looks the same — chalk dust, two chairs — but the MathMaker across the table checks every step
       twice before he sets the chalk down, and never once needs to.<br><br>
       "Yes," he says, before you've asked anything. "That's right. I already know it's right — I checked." He
       does not look up. He has never once, in this reflection, been wrong. It is, somehow, the loneliest thing
       you've seen all day.<br><br>
       Beside him, Miscount's reflection guesses instead of works — fast, and wrong, and utterly delighted about
       it every single time. The real Miscount, across the table, winces on his own behalf and says nothing at
       all.<br><br>
       <span class="dim">"Come back and see us," the MathMaker's reflection says, checking that sentence too.
       "Being right isn't as good, alone."</span>`);
  };

  // ---------- The Final Exam, inverted ----------
  // No boss. No HP bars. The MathMaker works five problems on the slate and
  // the KID marks them. Getting one wrong costs nothing: the slate simply
  // shows which step it was. You cannot fail this; you can only finish it.
  E.finalExam = function () {
    const s = E.state;
    const n = MM.problems.generateExam.count;
    // exactly one of the first four slates is clean, so "it's correct" is a
    // live answer throughout and the kid can't just always hunt for an error
    const cleanOne = Math.floor(Math.random() * (n - 1));
    let i = 0, marked = 0;
    const step = () => {
      const prob = MM.problems.generateExam(i, i !== cleanOne);
      MM.ui.showProblem({
        header: `📝 <b>The Final Exam — ${i + 1} of ${n}</b><br>` +
          `<span class="dim">The MathMaker works it on the slate. You mark it. ` +
          `Which step went wrong — or is every step right?</span>`,
        problem: prob,
        leaveLabel: 'Set down the chalk',
        onAnswer(correct) {
          // the exam is not practice — it never touches mastery or badges.
          // The kid is GRADING here, not being graded.
          if (correct) marked++;
          i++;
          const last = i >= n;
          const msg = correct
            ? (prob.badStep < 0
              ? '<i>"Correct — and you checked anyway. That is the habit, right there."</i>'
              : `<i>"Caught me." He wipes the step away, grinning. "Step ${prob.badStep + 1}, and you can say <b>why</b>."</i>`)
            : (prob.badStep < 0
              ? '<i>"Look again — that step really does hold up. Every one of them does, this time."</i>'
              : `<i>"Not that one — that one's sound." He taps step ${prob.badStep + 1}. "<b>Here.</b> ${prob.why}"</i>`);
          return { msg, end: last ? 'win' : undefined };
        },
        onNext: step,
        onEnd(kind) {
          if (kind === 'win') E.coronation(marked, n);
          else MM.ui.refresh();
        },
      });
    };
    step();
  };

  // ---------- Coronation ----------
  E.coronation = function (marked, total) {
    const s = E.state;
    s.endingDone = true;
    s.titles = s.titles || [];
    if (!s.titles.includes('The New MathMaker')) s.titles.push('The New MathMaker');
    E.save();
    MM.sound.fanfare();
    if (MM.ui.worldBurst) {
      for (let i = 0; i < 4; i++) MM.ui.worldBurst(s.px, s.py, ['#ffd94a', '#7ee0e8', '#6ee87e', '#e88ac4'][i], 22);
    }
    const scored = marked === total
      ? `You marked <b>every one</b> of them — the clean slate included.`
      : `You marked <b>${marked} of ${total}</b> — and the ones you missed, you can now explain.`;
    MM.ui.dialog('👑 The Crown of Numbers',
      `${scored}<br><br>` +
      `<i>The MathMaker takes the Crown of Numbers down off its shelf, where it has been sitting since the day you ` +
      `brought it home, and where — you realise now — he never once put it on.</i><br><br>` +
      `"It was never mine to wear. I was only <b>keeping</b> it." He sets it, carefully, on your head. It is not heavy. ` +
      `Knowledge weighs nothing.<br><br>` +
      `<i>Miscount is applauding. Miscount is, in fact, crying, and pretending with great dignity that he is not.</i><br><br>` +
      `"Numeria has a <b>new MathMaker</b>," says the old one. "Which means Numeria has someone to <b>tend</b> it. ` +
      `Come — you should see what that looks like."`,
      () => E.playEnding());
  };

  // ---------- the cutscene ----------
  E.playEnding = function () {
    if (MM.music && MM.music.moment) MM.music.moment('gentle'); // the quiet after
    MM.ui.endingScene(() => {
      const s = E.state;
      E.save();
      MM.ui.log('👑 <b>You are the MathMaker now.</b> The kingdom is yours to tend.');
      MM.ui.refresh();
    });
  };

  // ---------- the throne ----------
  E.throneRoom = function () {
    const s = E.state;
    if (!s.endingDone) {
      return MM.ui.dialog('🪑 The throne',
        'Nobody is sitting in it. Nobody has sat in it for a long time.<br><br>' +
        '<i>There is chalk dust on the armrest.</i>');
    }
    MM.ui.dialogChoices('🪑 The throne',
      `It is a good chair. You could sit in it. You mostly don't — the Study has better light.<br><br>` +
      `<span class="dim">From here you can watch the whole kingdom, and remember it whole.</span>`,
      [
        { label: '🌀 Watch "The Kingdom, Untangled" again', primary: true, onClick: () => E.playEnding() },
        { label: '🪞 Step through the looking glass', onClick: () => E.goldenPrompt() },
        { label: 'Just sit a while', onClick: () => {} },
      ]);
  };

  // ---------- Through the Looking Glass (post-game replay, was Golden Numeria) ----------
  // Wave 20 (Looking Glass P1): the post-game replay is now a MIRROR world you
  // step INTO and safely BACK OUT of. It REUSES the Golden Numeria machinery
  // wholesale (the snapshot/restore, the run counter s.ngPlus, the reversibility)
  // — only the player-facing WORDS change to the looking-glass framing. The
  // INTERNAL fields (s.ngPlus, s.goldenSnapshot) are KEPT for save-compat, so
  // an in-flight Golden Numeria save loads straight into the mirror framing.
  // Reversibility is REVERSIBLE (2026-07-16, after a kid started it without
  // meaning to and lost his finished kingdom): startGolden snapshots the
  // finished kingdom FIRST, and E.returnToFinishedKingdom puts it back
  // EXACTLY. The way back lives in TWO places — a mirror-side exit in the
  // sidebar (E.mirrorExitPrompt) reachable while through the glass, AND
  // 👪 Parent Settings (the grown-up's undo). This is the sacred part: the
  // round-trip must be lossless.
  // E.inMirror(): the sticky "you are through the glass" flag — a pure
  // function of the run counter, so it survives save/load and drives both the
  // world-wide mirror tint and the sidebar indicator.
  E.inMirror = () => !!(E.state && E.state.ngPlus > 0);

  E.goldenPrompt = function () {
    MM.ui.dialogChoices('🪞 Step through the looking glass?',
      `<b>You can step through the looking glass into a reflection of Numeria</b> — the whole kingdom again, ` +
      `cool and new, every dungeon to explore afresh and the bosses back on their feet.<br><br>` +
      `Your <b>real, finished kingdom is kept safe</b> — every dungeon you cleared, the peace you won — set gently ` +
      `aside on this side of the glass while you're away. And <b>everything you earned comes with you</b>: your ` +
      `level, gear, gems, charms, badges, Monster Book, pet, and crown.<br><br>` +
      `<span class="dim">You can <b>step back through the glass any time</b> — from the 🪞 mirror in your sidebar, or ` +
      `a grown-up can bring you back from 👪 Parent Settings — and your finished kingdom returns exactly as you left ` +
      `it. <b>Nothing is lost.</b> Still — best to <b>ask a grown-up</b> first.</span>`,
      [
        { label: '↩ Stay in my finished kingdom', primary: true, onClick: () => E.throneRoom() },
        { label: '🪞 Step through the looking glass', onClick: () => E.startGolden() },
      ]);
  };

  // The mirror-side exit: a kid can step back through the glass from INSIDE
  // the mirror (the sidebar 🪞 indicator opens this), not only via the parent
  // panel. Same safe restore, same explicit confirm.
  E.mirrorExitPrompt = function () {
    if (!E.canReturnToKingdom()) return;
    MM.ui.dialogChoices('🪞 Step back through the glass?',
      `This ends your looking-glass reflection and puts your <b>finished kingdom</b> back — every dungeon cleared, ` +
      `the story complete. <b>Everything you collected stays with you.</b> You can step through the looking glass ` +
      `again any time.`,
      [
        { label: '👑 Yes, step back to my finished kingdom', primary: true, onClick: () => E.returnToFinishedKingdom() },
        { label: '🪞 Stay through the glass', onClick: () => {} },
      ]);
  };

  const GOLDEN_ISLE_FLAGS = ['lampLit', 'spireDone', 'hallsDone', 'breakwaterDone', 'gullwrackRebuilt'];
  function snapshotFinishedKingdom(s) {
    const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
    const snap = {
      prevNgPlus: s.ngPlus || 0,
      taskIndex: s.taskIndex, tasksDone: clone(s.tasksDone) || [], haveItem: !!s.haveItem,
      opened: clone(s.opened) || {}, bossesDefeated: clone(s.bossesDefeated) || {},
      defeatedAt: clone(s.defeatedAt) || {}, unsealed: clone(s.unsealed) || {},
      gearState: clone(s.gearState) || {}, repairSites: clone(s.repairSites) || {},
      freeSlabs: clone(s.freeSlabs) || {},
      enrollSeen: !!s.enrollSeen, continent: s.continent || 'west', worldPos: clone(s.worldPos),
      isles: { keys: clone(s.isles.keys) || {}, lenses: clone(s.isles.lenses) || {} },
    };
    for (const f of GOLDEN_ISLE_FLAGS) snap.isles[f] = !!s.isles[f];
    return snap;
  }

  // A finished-kingdom snapshot rebuilt from scratch — for a pre-reversible NG+
  // save with no snapshot of its own (see the migration in E.load). Marks
  // every task done and every dungeon boss defeated (every floor's mapId, so
  // the real boss floor is always covered — extra keys are harmless).
  E.reconstructFinishedSnapshot = function (s) {
    const snap = {
      prevNgPlus: Math.max(0, (s.ngPlus || 1) - 1),
      taskIndex: 14, tasksDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], haveItem: false,
      opened: {}, bossesDefeated: {}, defeatedAt: {}, unsealed: {}, gearState: {}, repairSites: {},
      freeSlabs: {},
      enrollSeen: true, continent: 'west', worldPos: null,
      isles: { keys: {}, lenses: { tidepool: true, frostbite: true, cinderforge: true } },
    };
    for (const f of GOLDEN_ISLE_FLAGS) snap.isles[f] = true;
    for (let idx = 1; idx <= 21; idx++) {
      let floors = null;
      try { floors = MM.maps.dungeonFloors(idx); } catch (e) { floors = null; }
      if (floors && floors.length > 1) { for (let f = 0; f < floors.length; f++) snap.bossesDefeated[`d${idx}f${f}`] = true; }
      else snap.bossesDefeated['d' + idx] = true;
    }
    return snap;
  };

  // Put the finished kingdom back and end the current Golden Numeria run. The
  // hero keeps everything (as always); only the kingdom returns to done.
  E.canReturnToKingdom = () => !!(E.state && E.state.ngPlus > 0 && E.state.goldenSnapshot);
  E.returnToFinishedKingdom = function () {
    const s = E.state;
    const snap = s.goldenSnapshot;
    if (!snap) return false;
    MM.track('returnToFinishedKingdom');
    s.taskIndex = snap.taskIndex;
    s.tasksDone = (snap.tasksDone || []).slice();
    s.haveItem = !!snap.haveItem;
    s.opened = snap.opened || {};
    s.bossesDefeated = snap.bossesDefeated || {};
    s.defeatedAt = snap.defeatedAt || {};
    s.unsealed = snap.unsealed || {};
    s.gearState = snap.gearState || {};
    s.repairSites = snap.repairSites || {};
    s.freeSlabs = snap.freeSlabs || {};   // Wave 12: the Vault slab goes home too
    s.enrollSeen = !!snap.enrollSeen;
    s.continent = snap.continent || 'west';
    s.worldPos = snap.worldPos || null;
    s.isles.keys = (snap.isles && snap.isles.keys) || {};
    s.isles.lenses = (snap.isles && snap.isles.lenses) || {};
    for (const f of GOLDEN_ISLE_FLAGS) s.isles[f] = !!(snap.isles && snap.isles[f]);
    s.ngPlus = snap.prevNgPlus || 0;
    s.goldenSnapshot = null;
    s.hp = s.maxhp;
    s.stamina = s.maxStamina;
    E.enterWorld();
    E.save();
    MM.sound.fanfare();
    MM.ui.dialog('👑 Your finished kingdom, restored',
      `<i>You step back through the glass. The dungeons fall quiet again, cleared as you left them. The kingdom is ` +
      `whole.</i><br><br>` +
      `Every task done, every boss at rest — and everything you collected is exactly where you left it.<br><br>` +
      `<span class="dim">The looking glass is there whenever you want it again. No rush.</span>`);
    return true;
  };

  E.startGolden = function () {
    const s = E.state;
    MM.track('startGolden');
    s.goldenSnapshot = snapshotFinishedKingdom(s); // the way back — captured FIRST
    s.ngPlus = (s.ngPlus || 0) + 1;
    // the KINGDOM resets — the hero does not.
    s.taskIndex = 1;
    s.tasksDone = [];
    s.haveItem = false;
    s.opened = {};
    s.bossesDefeated = {};
    s.defeatedAt = {};
    s.unsealed = {};
    s.gearState = {};
    s.repairSites = {};
    s.freeSlabs = {};   // Wave 12: pushed free slabs reset with the kingdom
    s.isles.keys = {};
    s.isles.lenses = {};
    s.isles.lampLit = false;
    s.isles.spireDone = false;
    s.isles.hallsDone = false;
    s.isles.breakwaterDone = false;
    s.isles.gullwrackRebuilt = false;
    s.enrollSeen = false;
    s.continent = 'west';
    s.worldPos = null;
    // Wave 21 (Looking Glass P2.2): which dungeons the Cheshire Cat has
    // already materialized for THIS reflection — reset every fresh step
    // through the glass, exactly like the other per-run trackers above.
    s.mirrorDungeonsSeen = {};
    // KEPT, deliberately: level/xp, gear/equipped/enchants, items (charms,
    // gems, treasures), charmsOn, mastery, badges, bestiary, totals, the pet,
    // parent settings, difficulty, calmMode, spellsCelebrated, metMiscount,
    // sparWins, titles, and endingDone (you are still the MathMaker).
    // Also KEPT untouched (like s.wing): the Court — s.court, s.faculty,
    // s.courtSessions, s.casesHeard, s.magistrateVisits. The castle you built
    // as teacher survives NG+; the crown does too, so the court still sits.
    // Wave 15: s.parlor (tokens + the won-card collection + cosmetics + games)
    // is likewise left untouched — snapshot/restore only ever touch the fixed
    // KINGDOM fields, so the Parlor carries through startGolden AND
    // returnToFinishedKingdom automatically (unit-tested both ways).
    // Wave 16: s.garden (the plot + ingredients + harvests/dishes counters) is
    // ALSO left untouched, for the same reason — the Kitchen Garden the kid
    // tended as teacher survives NG+ in both directions (unit-tested).
    // Wave 17: s.menagerie (the befriended residents + their growth/hats +
    // tends/kindsTended counters + paradeSeen) is likewise left untouched — the
    // nursery of friends the kid soothed survives NG+ in both directions
    // (snapshot/restore only ever touch the fixed KINGDOM fields; unit-tested).
    // s.bestiary.befriended is a KEPT field too (like mastery/badges), so the
    // roster that drives the pens carries through a Golden run intact.
    s.hp = s.maxhp;
    s.stamina = s.maxStamina;
    E.enterWorld();
    E.save();
    MM.sound.fanfare();
    MM.ui.dialog('🪞 Through the looking glass',
      `<i>You step through, and the glass closes cool and silvery behind you. Here is Numeria again — the same ` +
      `shape, turned the other way, every dungeon waiting to be explored anew.</i><br><br>` +
      `You still have your level, your gear, your charms, your badges, your book, your pet, and your crown. ` +
      `Everything you learned came with you.<br><br>` +
      `<span class="dim">Your finished kingdom is safe on the other side of the glass. Step back any time — from the ` +
      `🪞 mirror in your sidebar, or a grown-up can bring it back from 👪 Parent Settings.<br>` +
      `Through the looking glass — reflection ${s.ngPlus}. One careful step at a time.</span>`,
      () => E.armCheshire()); // Wave 21 (P2.2): the guide materializes at the FIRST threshold
  };

  // ---------- Wave 21 (Looking Glass P2.2): the Cheshire Cat ----------
  // A recurring mirror-world guide. Materializes at thresholds (stepping
  // through for the first time; entering a mirror dungeon for the first time
  // this reflection) and occasionally otherwise, drops ONE cryptic-but-kind
  // line of GENERAL mirror guidance (negatives don't exist until P3 — no
  // negative-number hints yet), then fades smile-last. Warm-cryptic, never
  // at the kid's expense. Gated on E.inMirror() so it can never appear, or
  // even advance its own counter, outside the mirror.
  E.armCheshire = function () {
    const s = E.state;
    if (!s || !E.inMirror()) return;
    s.mirrorCheshireCount = (s.mirrorCheshireCount || 0) + 1;
    const line = MM.data.CHESHIRE_LINES[(s.mirrorCheshireCount - 1) % MM.data.CHESHIRE_LINES.length];
    E.save();
    MM.sound.mew();
    MM.ui.dialog('🐱 A cat, or the memory of one',
      `<div style="text-align:center;font-size:44px">🐱</div>` +
      `<p style="text-align:center;font-size:16px"><i>"${line}"</i></p>` +
      `<p style="text-align:center" class="dim">And then, slowly — smile last — it isn't there any more.</p>`,
      // the fade's clock starts the moment the kid can actually SEE the
      // world again (on dialog close), never while it's hidden behind the
      // modal — a timer nobody can watch would defeat the whole animation.
      () => { E.cheshireFx = { start: performance.now(), calm: !!s.calmMode }; });
  };

  // THE FADE — the one novel-render bit, and a PURE function of elapsed time
  // (no Math.random anywhere in the timing; line selection above cycles by a
  // counter, not chance, for the same reason). Body fades over ~1.3s while a
  // crescent smile holds at full alpha; the smile then lingers and fades out
  // LAST. Calm Mode gets a gentler/instant cut: no materializing body, just
  // a brief held smile, then gone — same idiom, shorter and stiller.
  const CHESHIRE_BODY_MS = 1300, CHESHIRE_LINGER_MS = 700, CHESHIRE_SMILE_FADE_MS = 700;
  const CHESHIRE_CALM_MS = 900;
  E.cheshireAlphas = function (now) {
    const fx = E.cheshireFx;
    if (!fx) return null;
    const t = now - fx.start;
    if (fx.calm) {
      if (t >= CHESHIRE_CALM_MS) return null;
      return { body: 0, smile: 1, t, total: CHESHIRE_CALM_MS };
    }
    const fadeStart = CHESHIRE_BODY_MS + CHESHIRE_LINGER_MS;
    const total = fadeStart + CHESHIRE_SMILE_FADE_MS;
    if (t >= total) return null;
    const body = t >= CHESHIRE_BODY_MS ? 0 : 1 - t / CHESHIRE_BODY_MS;
    const smile = t <= fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / CHESHIRE_SMILE_FADE_MS);
    return { body, smile, t, total };
  };
  E.cheshireActive = function (now) { return !!E.cheshireAlphas(now == null ? performance.now() : now); };

  // Sailing between continents (the Compass Rose) — with the voyage scene.
  E.sail = function (dest) {
    MM.track('sail ' + dest);
    // Wave 13 (P3): stairs do not sail. A following staircase waits at the
    // pier, radiating patience, until you come back for it.
    if (E.state && E.state.spiral && E.state.spiral.staircase === 'following') {
      const p = MM.maps.STAIRCASE_PIER_WAIT;
      E.state.spiral.staircase = { waiting: { x: p.x, y: p.y } };
      E.stairPos = null;
      MM.ui.log(MM.data.STAIRCASE_PIER_LINE);
      E.save();
    }
    MM.ui.sailScene(dest, () => {
      const s = E.state;
      s.continent = dest;
      s.worldPos = null;
      E.enterWorld();
      // Wave 6.5: the captain announces every landfall (arrival-experience
      // rule) — one line per destination, from the registry
      const d = MM.data.DESTINATIONS[dest];
      if (d && d.arrival) MM.ui.log(`⛵ ${d.arrival}`);
      E.save();
      // Miscount's egg hatches somewhere out on the open water
      if (dest === 'isles' && s.isles.egg && !s.isles.pet) MM.ui.hatchScene();
    });
  };

  // The Isles dock: home is always on offer; once the Great Lamp is lit, a
  // third leg (Horologe Isle) opens up too.
  E.dock = function () {
    const s = E.state;
    const choices = [];
    if (s.isles.lampLit) {
      choices.push({ label: '⛵ Sail onward to Horologe Isle', primary: true, onClick: () => E.sail('horologe') });
    }
    choices.push({ label: '⛵ Sail home to Numeria', primary: !s.isles.lampLit, onClick: () => E.sail('west') });
    choices.push({ label: 'Stay a while', onClick: () => {} });
    // Wave 10 (P2, reactive cast): the captain gets her own once-crowned
    // acknowledgment, ahead of everything else this dock already said.
    const greeting = s.endingDone
      ? '"Crown looks good on you, you know." The captain tips her hat, and doesn\'t make it a joke. "Where to, Your Majesty?"'
      : s.isles.lampLit
        ? '"Lit her right up, didn\'t you?" the captain grins. "Found something new on the charts, too — a little isle that\'s all ticking and gears. <b>Horologe</b>, the old maps call it. Fancy a look?"'
        : '"Homeward, hero? The old kingdom\'s right where you left it."';
    MM.ui.dialogChoices('⛵ The Compass Rose', greeting, choices);
  };

  // Horologe Isle's own dock: no home-continent detour without stopping at
  // the Isles first (there's no direct Horologe-to-Numeria leg on the
  // charts). Once the Spire is done, TWO new legs open up — Chime Isle AND
  // Gullwrack Harbor (Wave 6) — independently of each other; Gullwrack's
  // gate is spireDone alone, deliberately not hallsDone (music is opt-in,
  // so a kid who skips Chime must still be able to reach Gullwrack).
  E.horologeDock = function () {
    const s = E.state;
    const choices = [];
    if (s.isles.spireDone) {
      choices.push({ label: '⛵ Sail onward to Chime Isle', primary: true, onClick: () => E.sail('chime') });
      choices.push({ label: '⛵ Sail onward to Gullwrack Harbor', onClick: () => E.sail('gullwrack') });
    }
    choices.push({ label: '⛵ Sail to the Isles', primary: !s.isles.spireDone, onClick: () => E.sail('isles') });
    choices.push({ label: '⛵ Sail home to Numeria', onClick: () => E.sail('west') });
    // Wave 6.5: no inn on this island — the bunk serves instead
    choices.push({ label: '🛏 Rest in your bunk (3 warm-ups)', onClick: () => E.inn(true) });
    choices.push({ label: "🎓 Practice with the Tutor's cards", onClick: () => MM.ui.practiceYard() });
    choices.push({ label: 'Stay a while', onClick: () => {} });
    // Wave 10 (P2, reactive cast): once Gullwrack's own dungeon is beaten,
    // this stop has heard about it too — checked above spireDone so it
    // doesn't get shadowed on a later visit.
    const greeting = s.isles.breakwaterDone
      ? '"Back through here again? Small world, once you\'ve got a boat," the captain says, not looking up from her charts. "Where to?"'
      : s.isles.spireDone
        ? '"Ticking away nicely now, isn\'t it?" the captain says. "A couple of new spots on the charts — a hum you can hear from clear out on the water (<b>Chime Isle</b>), and a storm-battered little harbor further out (<b>Gullwrack</b>). Where to?"'
        : '"Back the way you came, or straight home? Your call."';
    MM.ui.dialogChoices('⛵ The Compass Rose', greeting, choices);
  };

  // Chime Isle's own dock: sail back to either of the previous legs, all
  // the way home, or onward to Gullwrack Harbor (Wave 6) — reachable from
  // here too, since reaching Chime already implies spireDone.
  E.chimeDock = function () {
    const s = E.state;
    // Wave 10 (P2, reactive cast): once the Halls sing again, the captain's
    // greeting here says so.
    const greeting = s.isles.hallsDone
      ? '"They\'ve got a real choir going now — heard it clear from the water. Half my crew won\'t stop humming it." The captain looks almost sentimental about it. "Where to?"'
      : '"Quite the tune this place hums. Where to now?"';
    MM.ui.dialogChoices('⛵ The Compass Rose',
      greeting,
      [
        { label: '⛵ Sail onward to Gullwrack Harbor', primary: true, onClick: () => E.sail('gullwrack') },
        { label: '⛵ Sail to Horologe Isle', onClick: () => E.sail('horologe') },
        { label: '⛵ Sail to the Isles', onClick: () => E.sail('isles') },
        { label: '⛵ Sail home to Numeria', onClick: () => E.sail('west') },
        // Wave 6.5: no inn on this island — the bunk serves instead
        { label: '🛏 Rest in your bunk (3 warm-ups)', onClick: () => E.inn(true) },
        { label: "🎓 Practice with the Tutor's cards", onClick: () => MM.ui.practiceYard() },
        { label: 'Stay a while', onClick: () => {} },
      ]);
  };

  // Gullwrack Harbor's own dock (Wave 6): the end of the charted line so
  // far — sail back to any previous leg, or all the way home.
  E.gullwrackDock = function () {
    const s = E.state;
    // Wave 10 (P2, reactive cast): once the town is fully rebuilt, the
    // captain's greeting here says so.
    const greeting = s.isles.gullwrackRebuilt
      ? '"Gullwrack\'s fixed up proper now — paint, roofs, the lot. Maren\'s already talking about a second pier." The captain shakes her head, fond. "Where to?"'
      : '"Quite the harbor you\'ve been patching up. Where to?"';
    MM.ui.dialogChoices('⛵ The Compass Rose',
      greeting,
      [
        { label: '⛵ Sail to Horologe Isle', primary: true, onClick: () => E.sail('horologe') },
        { label: '⛵ Sail to Chime Isle', onClick: () => E.sail('chime') },
        { label: '⛵ Sail to the Isles', onClick: () => E.sail('isles') },
        { label: '⛵ Sail home to Numeria', onClick: () => E.sail('west') },
        { label: "🎓 Practice with the Tutor's cards", onClick: () => MM.ui.practiceYard() },
        { label: 'Stay a while', onClick: () => {} },
      ]);
  };

  E.enterDungeon = function (idx, floor) {
    floor = floor || 0;
    MM.track('enterDungeon ' + idx + (floor ? ' f' + floor : ''));
    const s = E.state;
    const task = MM.data.TASKS[idx - 1];
    // the Vault's monster stats pin to Cinderforge's tier (statIndex) even
    // though its own index (idx) drives map/roster/theme lookups — it's an
    // optional side dungeon, not meant to outscale the mandatory Lighthouse.
    // The Spiral Stair (Wave 9) is the one dungeon with PER-FLOOR difficulty
    // — every other dungeon is flat regardless of floor — ramping slowly
    // past dungeon 21's tier as the kid climbs, capped well short of silly.
    const statIdx = idx === MM.maps.SPIRAL_INDEX
      ? Math.min(30, 21 + Math.floor(floor / 4))
      : (task.statIndex || idx);
    const floors = MM.maps.dungeonFloors(idx);
    // remember the return spot when entering from ANY overworld (mainland,
    // isles, horologe, chime, or gullwrack) — but never on floor changes,
    // which must not clobber it
    if (s.mapId === 'world' || s.mapId === 'isles' || s.mapId === 'horologe' || s.mapId === 'chime' || s.mapId === 'gullwrack') s.worldPos = { x: s.px, y: s.py };
    // Wave 13: a following staircase waits at the dungeon door (it starts
    // INSIDE the Cavern of Echoes, so in-dungeon following stays; only an
    // overworld->dungeon transition parks it). Per-visit transients reset.
    if (s.spiral && s.spiral.staircase === 'following' && s.mapId === 'world') E.stairParkHere();
    if (E.resetTransientEntities) E.resetTransientEntities();
    // single-floor dungeons keep their historical 'dN' ids (saved games!)
    s.mapId = floors.length > 1 ? `d${idx}f${floor}` : 'd' + idx;
    s.dungeonIndex = idx;
    s.floorIndex = floor;
    s.grid = MM.maps.parse(floors[floor], '#');
    // strip opened chests/doors/secrets/gates from the grid
    for (const key of Object.keys(s.opened)) {
      const [mid, xy] = key.split(':');
      if (mid !== s.mapId) continue;
      const [x, y] = xy.split(',').map(Number);
      s.grid[y][x] = '.';
    }
    // Sunken Breakwater's shortcut repair site (Wave 6): re-apply persisted
    // slab/broken-tile state now that the floor's fresh grid is parsed.
    E.applySiteState(s.mapId);
    // Wave 12 (P2): free-standing slabs (the Vault's plate puzzle) — same
    // re-apply-on-entry contract.
    E.applyFreeSlabs(s.mapId);
    // gear plates (Clockwork Spire): cache this floor's A/B/C gate positions
    // (in memory only — they're static per floor template, re-scanned every
    // visit) and open whichever one matches the saved rotation state.
    E._gatePositions = E._gatePositions || {};
    E._gatePositions[s.mapId] = {
      A: MM.maps.find(s.grid, 'A'), B: MM.maps.find(s.grid, 'B'), C: MM.maps.find(s.grid, 'C'),
    };
    E.applyGearState();
    // Mimic chests (playtest round 4 — the kids asked for them): decided at
    // floor entry, not at bump time, so the WORLD can telegraph one (its
    // breathing bob, the pet's warning) — a surprise you could have spotted,
    // never a gotcha. Rules: never dungeons 1-3 (chest trust comes first),
    // never a guaranteed-gem or story chest, at most ONE per floor. Not
    // persisted: an unbumped mimic may be an ordinary chest tomorrow —
    // mimics wander, and an opened chest (s.opened) is already gone forever.
    E._mimics = new Set();
    if (idx >= 4) {
      for (const pos of MM.maps.find(s.grid, '*')) {
        if (isGuaranteedGemChest(s.mapId, pos.x, pos.y)) continue;
        if (idx === 18 && pos.x === 13 && pos.y === 3) continue; // the crossbow chest
        if (Math.random() < E.MIMIC_CHANCE) { E._mimics.add(`${pos.x},${pos.y}`); break; }
      }
    }
    // spawn monsters from map markers: m = wanderer/chaser mix, g = the
    // roster's guard type, t = its thief type (isle dungeons only)
    s.monsters = [];
    const roster = MM.data.MONSTERS[idx - 1];
    const typeFor = marker => {
      if (marker === 'g') return roster.types.find(t => t.behavior === 'guard') || roster.types[0];
      if (marker === 't') return roster.types.find(t => t.behavior === 'thief') || roster.types[0];
      const pool = roster.types.filter(t => !t.behavior || t.behavior === 'wander' || t.behavior === 'chase');
      return pool[Math.floor(Math.random() * pool.length)] || roster.types[0];
    };
    // 1.5c: a monster beaten today stays gone until a new real-world day —
    // bosses are unaffected (they use the existing permanent bossesDefeated).
    const today = E.todayStr();
    let skippedAny = false;
    for (const marker of ['m', 'g', 't']) {
      for (const pos of MM.maps.find(s.grid, marker)) {
        s.grid[pos.y][pos.x] = '.';
        if (s.defeatedAt[`${s.mapId}:${pos.x},${pos.y}`] === today) { skippedAny = true; continue; }
        const type = typeFor(marker);
        const st = E.monsterStats(statIdx, false);
        // Per-creature taming (2026-07-13): a monster the kid soothed today
        // is STILL HER FRIEND when she walks back in — same spot, heart on,
        // at peace (day-keyed exactly like defeatedAt; tomorrow is new).
        const becalmedToday = s.becalmedAt && s.becalmedAt[`${s.mapId}:${pos.x},${pos.y}`] === today;
        s.monsters.push({
          name: type.name, sprite: type.sprite, pal: type.pal, verb: type.verb,
          x: pos.x, y: pos.y, hp: st.hp, maxhp: st.hp, atk: st.atk, xp: st.xp,
          boss: false, stun: 0, behavior: type.behavior || 'chase',
          shouts: !!type.shouts, alerted: 0, becalmed: becalmedToday,
          skill: type.skill || null, // Wave 8a (P2): the telegraph icon's topic
          home: { x: pos.x, y: pos.y },
        });
      }
    }
    if (skippedAny) MM.ui.log('The halls are quiet — the monsters you drove off haven\'t crept back yet.');
    // Wave 10 (P4c, rare-surprise pool): once ever, in the Meadow Cave, two
    // slimes turn up stacked, sharing one hat. Not a fight — E.tryMove
    // intercepts mon.hattedPair the same way it intercepts a becalmed
    // friend's bump (swap-not-battle), and resolves the whole moment there.
    if (idx === 1 && !s.seenHattedSlimes && Math.random() < E.HATTED_SLIMES_CHANCE) {
      const pair = s.monsters.filter(m => !m.boss);
      if (pair.length >= 2) {
        const [a, b] = pair;
        s.monsters = s.monsters.filter(m => m !== b); // folded into a, visually
        a.hattedPair = true;
      }
    }
    const bpos = MM.maps.find(s.grid, 'b')[0];
    if (bpos) {
      s.grid[bpos.y][bpos.x] = '.';
      if (!s.bossesDefeated[s.mapId]) {
        const b = roster.boss;
        const bst = E.monsterStats(statIdx, true);
        s.monsters.push({
          name: b.name, sprite: b.sprite, pal: b.pal, verb: b.verb,
          x: bpos.x, y: bpos.y, hp: bst.hp, maxhp: bst.hp, atk: bst.atk, xp: bst.xp,
          gold: bst.gold, boss: true, stun: 0, behavior: 'chase',
        });
      }
    }
    const exit = MM.maps.find(s.grid, 'X')[0];
    if (exit) { s.px = exit.x; s.py = exit.y; }
    E.petPos = { x: s.px, y: s.py };
    // Wave 9 (P2): track the deepest floor and highest landing ever
    // reached — "highest step of the Spiral" on the Hall plaque. No
    // run-loss: this only ever counts UP, same spirit as s.daysTended.
    if (idx === MM.maps.SPIRAL_INDEX) {
      const n = floor + 1;
      if (n > s.spiral.highest) s.spiral.highest = n;
      const landing = n % 5 === 0;
      if (landing && n > s.spiral.landing) s.spiral.landing = n;
      MM.ui.log(landing ? `🌀 <b>Floor ${n}</b> — a landing. Catch your breath.` : `🌀 <b>Floor ${n}</b> of the Spiral Stair.`);
      E.save();
      // the very top: once ever, the climb gets a real destination
      if (n >= MM.maps.SPIRAL_MAX_FLOOR && !s.spiral.toppedOut) E.spiralSummit();
    }
    if (idx !== MM.maps.SPIRAL_INDEX && floor === 0) {
      MM.ui.log(`You enter the ${task.dungeon}. (${task.mixed ? 'Everything you\'ve learned!' : MM.data.SKILL_NAMES[task.skill]})`);
      // Wave 8-preview (user playtest): a bounty that applies HERE announces
      // itself — dungeon-scoped jobs were progressing invisibly (or not at
      // all) and read as broken
      for (const board of [s.bounties, s.isleBounties]) {
        if (!board || !board.items) continue;
        for (const it of board.items) {
          if (!it.done && it.dungeon === idx && (it.type === 'hunt' || it.type === 'solve')) {
            MM.ui.log(`📌 <b>Bounty active here:</b> ${it.have}/${it.need} ${it.type === 'hunt' ? 'monsters defeated' : 'problems answered'} — reward ${it.reward} gold!`);
          }
        }
      }
    }
    // Wave 21 (Looking Glass P2.2): the Cheshire Cat materializes the FIRST
    // time this reflection the kid enters a given dungeon — a threshold, not
    // every visit (floor changes within the same dungeon don't re-trigger).
    // armCheshire() itself no-ops entirely outside the mirror.
    if (floor === 0 && E.inMirror()) {
      s.mirrorDungeonsSeen = s.mirrorDungeonsSeen || {};
      if (!s.mirrorDungeonsSeen[idx]) {
        s.mirrorDungeonsSeen[idx] = true;
        E.armCheshire();
      }
    }
    MM.ui.refresh();
  };

  // Stairs between floors of an isle dungeon. Going down lands you on the
  // next floor's up-stair, and vice versa.
  E.changeFloor = function (dir) {
    const s = E.state;
    E.enterDungeon(s.dungeonIndex, s.floorIndex + dir);
    const mark = dir > 0 ? '<' : '>';
    const pos = MM.maps.find(s.grid, mark)[0];
    if (pos) { s.px = pos.x; s.py = pos.y; }
    MM.ui.log(dir > 0 ? '🪜 You climb down into the deeper dark...' : '🪜 You climb back up toward the light.');
    E.save();
    MM.ui.refresh();
  };

  E.exitDungeon = function () {
    MM.ui.log('You step back out into the daylight.');
    E.enterWorld();
    E.save();
  };

  // Wave 4 carry-over: Rope of Return — a bought convenience, not an earned
  // spell (Beacon stays the free reusable version). Only usable inside a
  // dungeon; the bag UI gates the button and confirms before calling this.
  E.useRope = function () {
    const s = E.state;
    if (!E.inDungeon() || (s.items.ropes || 0) <= 0) return;
    s.items.ropes--;
    MM.ui.log('🪢 You tug the rope, and the ground simply... lets go.');
    E.exitDungeon();
  };

  // ---------- movement ----------
  E.tryMove = function (dx, dy) {
    const s = E.state;
    if (!s || MM.ui.modalOpen() || MM.battle.active()) return;
    if (MM.ui.sailing && MM.ui.sailing()) return; // no pacing the deck
    if (MM.ui.cinematic && MM.ui.cinematic()) return; // nor during the ending
    if (dx || dy) E.lastDir = { dx, dy }; // used by the Blink spell
    const nx = s.px + dx, ny = s.py + dy;
    if (ny < 0 || ny >= s.grid.length || nx < 0 || nx >= s.grid[0].length) return;
    const ch = s.grid[ny][nx];
    MM.ui.playerMoved(dx);

    if (MM.maps.isOverworld(s.mapId)) {
      if (s.mapId === 'castle') {
        // The castle interior (Wave 7). No monsters, no combat — the only
        // things to bump into are your own history and the people in it.
        if (ch === 'X') return E.exitCastle();
        if (ch === 'E') return E.galleryPlinth(nx, ny);
        if (ch === 'V') return MM.ui.hallOfHeroes();
        if (ch === 'O') return E.throneRoom();
        if (ch === 'F') return;   // a banner. It is a very good banner.
        // Wave 9 (P3): cosmetic gold sinks, bump-to-buy like the Gallery's
        // own plinths — d/i/k furnishing, l the pet's wardrobe, n/w/r three
        // independent boss-statue plinths (any order, no dependency chain).
        if (ch === 'd') return E.castleFurnishBump('garden');
        if (ch === 'i') return E.castleFurnishBump('rug');
        if (ch === 'k') return E.castleFurnishBump('library');
        if (ch === 'l') return MM.ui.petWardrobe();
        if (ch === 'n') return MM.ui.statuePlinth(0);
        if (ch === 'w') return MM.ui.statuePlinth(1);
        if (ch === 'r') return MM.ui.statuePlinth(2);
        // Wave 12 (P3): the Workshop Wing's door by the Study, and the spot
        // the confessed wardrobe eventually calls home (floor until then).
        if (ch === 'H') return E.wingDoor();
        if (ch === 'Z') return E.parlorDoor();   // Wave 15: the card parlor
        if (ch === 'K') return E.gardenDoor();   // Wave 16: the Kitchen Garden
        if (ch === 'M') return E.menagerieDoor(); // Wave 17: the Menagerie
        if (ch === 'o' && s.wing && s.wing.wardrobeMoved) {
          // Wave 18: the confessed wardrobe is the DELUXE avatar picker — it
          // resigned from being furniture, so it deeply understands choosing
          // a form. Same state the Bag's Looking Glass writes; wrapped in its
          // personality.
          return MM.ui.studyWardrobe();
        }
        if (MM.data.NPCS[ch]) return E.talkNpc(ch);
        // Wave 14: a claimed Faculty post stands on plain floor — bump it to
        // hear its line (blocks the tile, like an NPC).
        {
          const fac = E.facultyAt(nx, ny);
          if (fac) return MM.ui.dialog(`${fac.badge} ${fac.title}`, fac.line);
        }
        if (ch === '.' || ch === 'P' || ch === 'o') {
          // no stamina cost indoors — there's nothing to fight and nothing to
          // flee, and a kid should never be able to strand themselves at home
          E.petPos = { x: s.px, y: s.py };
          s.px = nx; s.py = ny;
        }
        return;
      }
      // Wave 12 (P3): the Workshop Wing — combat-free, castle rules
      // (no monsters, no stamina), its own alphabet.
      if (s.mapId === 'wing') return E.wingMove(dx, dy, nx, ny, ch);
      // Wave 13 (P2): Your Own Room — combat-free, castle rules, buildable.
      if (s.mapId === 'myroom') return E.myRoomMove(dx, dy, nx, ny, ch);
      // Wave 15 (P4): the Parlor — combat-free, castle rules, its own alphabet.
      if (s.mapId === 'parlor') return E.parlorMove(dx, dy, nx, ny, ch);
      // Wave 16: the Kitchen Garden — combat-free, castle rules, its own alphabet.
      if (s.mapId === 'garden') return E.gardenMove(dx, dy, nx, ny, ch);
      // Wave 17: the Menagerie — combat-free, castle rules, its own alphabet.
      if (s.mapId === 'menagerie') return E.menagerieMove(dx, dy, nx, ny, ch);
      if (s.mapId === 'gullwrack') {
        if (ch === '7') return E.tryEnterDungeon(21);
        if (ch === 'W') return E.gullwrackDock();
        if (ch === 'n') return MM.ui.noticeBoard();
        if (ch === E.SITE_GLYPHS.plaque || ch === E.SITE_GLYPHS.lever || ch === E.SITE_GLYPHS.slab) {
          if (E.trySiteBump(s.mapId, dx, dy, nx, ny)) return;
        }
      } else if (s.mapId === 'isles') {
        if (ch === '1') return E.tryEnterDungeon(14);
        if (ch === '2') return E.tryEnterDungeon(15);
        if (ch === '3') return E.tryEnterDungeon(16);
        if (ch === '4') return E.tryEnterDungeon(18);
        if (ch === 'n') return MM.ui.noticeBoard();
        if (ch === 'Y') return E.tutor(); // the Tutor's dockside Practice Yard
        if (ch === '%') { // the Vault's secret wall: a nudge (or a pet's nose) finds it
          s.grid[ny][nx] = '4';
          s.opened[`isles:${nx},${ny}`] = true;
          MM.sound.fanfare();
          MM.ui.log('✨ <b>A crack in the cliffside gives way!</b> A cave mouth yawns open in the rock...');
          E.save();
          return;
        }
        if (ch === 'H') {
          const lit = Object.values(s.isles.lenses).filter(Boolean).length;
          if (lit >= 3) return E.tryEnterDungeon(17);
          return MM.ui.dialog('🗼 The Great Lighthouse',
            'It rises over the whole island, dark as a closed eye — wrapped in Murk so thick the path simply is not there.<br><br><i>Three lenses first. Then the tower.</i>');
        }
        if (ch === 'W') return E.dock();
      } else if (s.mapId === 'horologe') {
        if (ch === '5') return E.tryEnterDungeon(19);
        if (ch === 'W') return E.horologeDock();
      } else if (s.mapId === 'chime') {
        if (ch === '6') return E.tryEnterDungeon(20);
        if (ch === 'W') return E.chimeDock();
      } else {
        // Wave 9 (P1): a Daily Tangle standing on ordinary ground — not a
        // grid glyph (they move day to day), so it's checked by position,
        // same idea as a dungeon's monster array overlaid on the grid.
        const tangleHere = s.tangles && s.tangles.items.find(t => !t.done && t.x === nx && t.y === ny);
        if (tangleHere) return E.startTangleBattle(tangleHere);
        // Wave 13 (P3): a waiting staircase is bumped back into following.
        if (E.stairBumpAt(nx, ny)) return;
        if (ch === 'C') return E.castle();
        if (ch === 'H') return E.spiralMenu();
        if (ch === 'Y') return E.tutor();
        if (ch === 'n') return MM.ui.noticeBoard();
        if (ch === 'W') return E.pier();
        if (ch === 'F') return E.fencePost(); // Wave 10 (P3): the mended fence east of the farm
        // Wave 12 (P4): the skip-count stepping stones + their islet chest
        if (ch === 'd') return E.skipStoneStep(dx, dy, nx, ny);
        if (ch === '*') return E.worldChest(nx, ny);
        if ('1234567890'.includes(ch)) return E.tryEnterDungeon(ch === '0' ? 10 : +ch);
        const exp = { A: 11, B: 12, K: 13 }[ch];
        if (exp) return E.tryEnterDungeon(exp);
      }
      if (ch === 'S') return MM.ui.openShop();
      if (ch === 'I') return E.inn();
      if (MM.data.NPCS[ch]) return E.talkNpc(ch);
      // Chime Isle's singing stones (Wave 6.5): a bump, a bright note —
      // pure flavor, and no tile the kid touches stays silent
      if (ch === 's') { MM.sound.coin(); return MM.ui.log('🔔 The stone hums a round, bright note.'); }
      // Wave 6.5: broken floor is IMPASSABLE until a slab mends it — a gap
      // a kid can stroll across makes repair sites (and the Breakwater
      // shortcut) meaningless. Bumping it explains itself instead.
      if (ch === E.SITE_GLYPHS.broken) {
        return MM.ui.log('🕳 The floor here is shattered — a stone slab could mend it.');
      }
      if (ch === '.' || ch === 'P' || ch === '=') {
        const wasX = s.px, wasY = s.py;
        E.petPos = { x: s.px, y: s.py };
        s.px = nx; s.py = ny;
        E.stairStep(wasX, wasY);   // Wave 13: the following staircase trails 2 back
        E.walkStamina();
        E.updatePetAlert();
      }
      return;
    }

    // dungeon
    // Wave 13 (P1): the Understudy stands wherever its route ended,
    // committed — walking into it swaps places, like a becalmed friend
    // (it must never block a chokepoint).
    if (E.tryUnderstudySwap(nx, ny)) return;
    // Wave 13 (P3): the lost staircase in the Cavern of Echoes — bump to
    // start the escort.
    if (E.stairBumpAt(nx, ny)) return;
    const mon = s.monsters.find(m => m.x === nx && m.y === ny && m.hp > 0);
    // Wave 10 (P4c, rare-surprise pool): the hatted-slimes moment. Never a
    // fight — they split apart, embarrassed, and scurry off; the hat is
    // retired with honors.
    if (mon && mon.hattedPair) {
      s.seenHattedSlimes = true;
      MM.ui.log('🎩 Two slimes tumble apart, mortified — they\'d been sharing one hat, this whole time. It rolls to your feet.<br><br><i>The hat is retired, with honors.</i> +2 gold.');
      E.gainGold(2);
      s.monsters = s.monsters.filter(m => m !== mon);
      E.save();
      MM.ui.refresh();
      return;
    }
    // Round 5: bumping a calmed friend is never a fight ("if I bump into a
    // calmed creature, I can still fight it, and it starts at 0% calm" —
    // accidentally erasing your own kindness is the worst feeling in the
    // game). It steps aside — you swap places — with a friendly word. This
    // also means a becalmed monster can never block a chokepoint.
    if (mon && E.isPacified(mon)) {
      const ox = s.px, oy = s.py;
      s.px = mon.x; s.py = mon.y;
      mon.x = ox; mon.y = oy;
      if (mon.home) mon.home = { x: ox, y: oy };
      MM.ui.log(`🤍 ${MM.data.theMon(mon.name, true)} shuffles aside to let you through. ${MM.data.pick(MM.data.FRIEND_BUMP_LINES)}`);
      E.walkStamina();
      MM.ui.playerMoved(dx);
      MM.ui.refresh();
      return;
    }
    if (mon) return E.isOverwhelming(mon) ? E.tryOverwhelm(mon) : E.startCombat(mon);
    if (ch === 'D') return E.mathDoor(nx, ny);
    if (ch === 'Z') return E.clockDoor(nx, ny);
    if (ch === 'Y') return E.echoDoor(nx, ny);
    if (ch === '*') return E.chest(nx, ny);
    if (ch === '%') { // secret wall: bumping the crack swings it open forever
      s.grid[ny][nx] = '.';
      s.opened[`${s.mapId}:${nx},${ny}`] = true;
      MM.sound.fanfare();
      MM.ui.log('✨ <b>A secret passage!</b> The cracked wall swings open.');
      E.save();
      return;
    }
    if (ch === 'K') { // locked door: needs a key found in this dungeon
      const base = 'd' + s.dungeonIndex;
      const keys = (s.isles.keys && s.isles.keys[base]) || 0;
      if (keys > 0) {
        s.isles.keys[base] = keys - 1;
        s.grid[ny][nx] = '.';
        s.opened[`${s.mapId}:${nx},${ny}`] = true;
        MM.sound.fanfare();
        MM.ui.log('🗝 The key fits! The heavy door grinds open — for good.');
        E.save();
      } else {
        MM.ui.log('🔒 Locked tight. There must be a <b>key</b> somewhere in this place...');
      }
      return;
    }
    if (ch === 'L') { // lever: opens every gate on this floor, once and forever
      s.grid[ny][nx] = '.';
      s.opened[`${s.mapId}:${nx},${ny}`] = true;
      for (const g of MM.maps.find(s.grid, 'G')) {
        s.grid[g.y][g.x] = '.';
        s.opened[`${s.mapId}:${g.x},${g.y}`] = true;
      }
      MM.sound.fanfare();
      MM.ui.log('⚙️ You pull the old lever... stone grinds somewhere. <b>The gates are open!</b>');
      E.save();
      return;
    }
    if (ch === 'R') { // gear plate: re-lockable, unlike every other lever —
      // cycles which ONE of the three gates (A/B/C) is open.
      s.gearState = s.gearState || {};
      s.gearState[s.mapId] = ((s.gearState[s.mapId] || 0) + 1) % 3;
      E.applyGearState();
      MM.sound.fanfare();
      // Wave 7 readability: SAY which gate opened, and glint it. "A different
      // gate swings open" told the kid nothing — which gate? where? (playtest)
      const letter = E.openGateLetter(s.mapId);
      const pips = E.GATE_PIPS[letter];
      E.gateGlintUntil = performance.now() + 1600;
      MM.ui.log(`⚙️ Gears grind and shift — the <b>${pips}-gate</b> swings open, and the other two grind shut.`);
      E.save();
      MM.ui.refresh();
      return;
    }
    // Wave 7: a gear gate is walkable only in its own rotation. The glyph
    // stays put either way, so the sprite (and its pips) can say so.
    if (ch === 'A' || ch === 'B' || ch === 'C') {
      if (!E.gateIsOpen(ch, s.mapId)) {
        return MM.ui.log(`⚙️ The <b>${E.GATE_PIPS[ch]}-gate</b> is wound shut. The plate ⚙ decides which one opens.`);
      }
      // open — fall through to the ordinary move below
    }
    if (ch === E.SITE_GLYPHS.plaque || ch === E.SITE_GLYPHS.lever || ch === E.SITE_GLYPHS.slab) {
      if (E.trySiteBump(s.mapId, dx, dy, nx, ny)) return;
    }
    // Wave 12 (P2): a slab or 'l' lever that no repair site claimed is a
    // FREE slab / free-slab reset (the Vault's plate puzzle).
    if (ch === E.SITE_GLYPHS.slab) return E.tryFreeSlabBump(dx, dy, nx, ny);
    if (ch === E.SITE_GLYPHS.lever) return E.freeSlabReset(s.mapId);
    // Wave 6.5: broken floor blocks in dungeons too (see the town branch) —
    // the Breakwater's mendable wall gap is a shortcut, not an open door
    if (ch === E.SITE_GLYPHS.broken) {
      return MM.ui.log('🕳 The floor here is shattered — a stone slab could mend it.');
    }
    // Wave 12 (P2): a plate-gate opens only WHILE a pressure plate on this
    // floor is held down (player, pet, or slab). Open, it's ordinary floor.
    if (ch === '&' && !E.platePowered(s.mapId)) {
      MM.sound.thud();
      return MM.ui.log('🧱 The counterweight gate is shut — it only lifts while something rests on a pressure plate.');
    }
    if (ch === '#' || ch === 'G') return;
    // Wave 12 (P3): cracked floor holds a crossing exactly once — remember
    // what we're stepping OFF of, and crumble it behind us.
    const fromX = s.px, fromY = s.py;
    const fromCh = s.grid[fromY] && s.grid[fromY][fromX];
    E.petPos = { x: s.px, y: s.py };
    s.px = nx; s.py = ny;
    E.recordStep(dx, dy);          // Wave 13: the echo plates' rolling buffer
    E.stairStep(fromX, fromY);     // Wave 13: the following staircase trails 2 back
    E.walkStamina();
    if (fromCh === '!') E.crumbleBehind(fromX, fromY);
    if (ch === '!') E.crackCreak();
    if (ch === '+') E.platePressFeedback();
    if (ch === '?') E.echoPlateStep();
    if (ch === 'X') return E.exitDungeon();
    if (ch === '>') return E.changeFloor(1);
    if (ch === '<') return E.changeFloor(-1);
    if (ch === 'v') return E.dropChute(nx, ny);
    E.tileEffects(ch, dx, dy);
    E.updatePetAlert();
    E.monsterTurn();
  };

  // Gear plates (Clockwork Spire): the ONLY re-lockable interaction in the
  // game — every other lever/gate/door is one-shot-and-forever (s.opened).
  //
  // Wave 7 (readability carry-over): this used to REWRITE each gate cell to
  // '#' or '.', which is what made the puzzle unreadable — a closed gate was
  // pixel-identical to a wall, an open one to bare floor, and the kid saw a
  // distant nothing silently become a different nothing. The A/B/C glyphs now
  // STAY in the grid; the rotation decides only whether you may walk through
  // (E.gateIsOpen) and which sprite draws (maps.tileSprite + the pip overlay
  // in drawWorld). Nothing about the puzzle's logic changed — only whether a
  // kid can see it.
  // The three gates are told apart by pips, everywhere they're mentioned:
  // on the gate sprite, on the plate sprite, and in the log line.
  E.GATE_PIPS = { A: '•', B: '••', C: '•••' };
  E.gearRotation = mapId => MM.maps.gearRotation(mapId || (E.state && E.state.mapId));
  E.gateIsOpen = function (ch, mapId) {
    return MM.maps.gateOpenNow(ch, mapId || (E.state && E.state.mapId));
  };
  // The letter of whichever gate is currently open ('A' | 'B' | 'C').
  E.openGateLetter = mapId => MM.maps.GEAR_LETTERS[E.gearRotation(mapId)];
  // Kept as a no-op-safe shim: the grid no longer needs rewriting, but
  // enterDungeon and the plate handler both still call it, and a future
  // stateful-tile mechanic may want the hook.
  E.applyGearState = function () {};
  // The just-opened gate glints for a moment (drawWorld), so the kid sees
  // WHICH distant thing the plate changed — same idea as the Scout shimmer.
  E.gateGlinting = () => !!(E.gateGlintUntil && performance.now() < E.gateGlintUntil);

  // ---------- slab-tiling repair sites (Wave 6: Gullwrack Harbor) ----------
  // A repair site = broken-floor tiles (r) with pushable stone slabs (U)
  // nearby, gated by a blueprint plaque (i, asks a full-depth Breakwater
  // problem before pushing unlocks) and rescued by a reset lever (l,
  // re-spawns LIVE slabs to their start spots — a wedged slab can never
  // soft-lock). Sokoban rules: one slab, one tile, per bump; no chain
  // pushes. A slab pushed onto its own broken tile locks in for good. When
  // every broken tile at a site is filled, the whole footprint map-edits to
  // plain floor (the bridge/fog precedent) and — for town sites — pays out
  // gold and a Maren line.
  const SITE_BROKEN = 'r', SITE_SLAB = 'U', SITE_LEVER = 'l', SITE_PLAQUE = 'i';
  E.SITE_GLYPHS = { broken: SITE_BROKEN, slab: SITE_SLAB, lever: SITE_LEVER, plaque: SITE_PLAQUE };
  function siteTemplates(mapId) { return (MM.maps.REPAIR_SITES && MM.maps.REPAIR_SITES[mapId]) || []; }

  E.ensureSite = function (mapId, id) {
    const s = E.state;
    s.repairSites = s.repairSites || {};
    const key = mapId + ':' + id;
    if (!s.repairSites[key]) {
      const tmpl = siteTemplates(mapId).find(t => t.id === id);
      s.repairSites[key] = {
        plaqueSolved: false,
        slabPos: tmpl.pairs.map(p => ({ ...p.slab })),
        filled: tmpl.pairs.map(() => false),
        done: false,
      };
    }
    return s.repairSites[key];
  };

  // Redraw every repair site on the CURRENT grid from persisted state — call
  // on every dungeon/town entry and after every push/plaque/lever, exactly
  // like E.applyGearState (positions are re-scanned from the template every
  // time since a filled/finished tile can't remember its own glyph either).
  E.applySiteState = function (mapId) {
    const s = E.state;
    if (!s.grid) return;
    for (const tmpl of siteTemplates(mapId)) {
      const site = E.ensureSite(mapId, tmpl.id);
      if (site.done) {
        const cells = [tmpl.plaque, tmpl.lever, ...tmpl.pairs.flatMap(p => [p.slab, p.broken])];
        for (const c of cells) s.grid[c.y][c.x] = '.';
        continue;
      }
      s.grid[tmpl.plaque.y][tmpl.plaque.x] = SITE_PLAQUE;
      s.grid[tmpl.lever.y][tmpl.lever.x] = SITE_LEVER;
      tmpl.pairs.forEach((p, i) => {
        s.grid[p.broken.y][p.broken.x] = site.filled[i] ? '.' : SITE_BROKEN;
        // a locked-in slab retires (see trySiteBump) — its OLD cell reads as
        // plain floor, not a ghost slab, so only draw the ones still live
        if (!site.filled[i]) s.grid[site.slabPos[i].y][site.slabPos[i].x] = SITE_SLAB;
      });
    }
  };

  // Bumping a plaque, lever, or slab on a repair site. Returns true if it
  // handled the bump (E.tryMove stops there — none of these are walkable).
  E.trySiteBump = function (mapId, dx, dy, nx, ny) {
    const s = E.state;
    const templates = siteTemplates(mapId);
    for (const tmpl of templates) {
      if (tmpl.plaque.x === nx && tmpl.plaque.y === ny) { E.siteBlueprintProblem(mapId, tmpl); return true; }
      if (tmpl.lever.x === nx && tmpl.lever.y === ny) { E.resetSite(mapId, tmpl); return true; }
    }
    for (const tmpl of templates) {
      const site = E.ensureSite(mapId, tmpl.id);
      if (site.done) continue;
      const i = site.slabPos.findIndex((p, idx) => !site.filled[idx] && p.x === nx && p.y === ny);
      if (i < 0) continue;
      if (!site.plaqueSolved) {
        MM.ui.log('🧱 This slab won\'t budge — read the blueprint plaque first.');
        return true;
      }
      const bx = nx + dx, by = ny + dy;
      // any live slab may lock into ANY of this site's still-unfilled broken
      // tiles — not just its "own" pair — more natural sokoban play
      const brokenIdx = tmpl.pairs.findIndex((p, bi) => p.broken.x === bx && p.broken.y === by && !site.filled[bi]);
      if (brokenIdx >= 0) {
        s.grid[ny][nx] = '.'; // the vacated cell — applySiteState only overlays, never clears
        site.filled[brokenIdx] = true;
        MM.sound.fanfare();
        MM.ui.log('🧱 <b>Thunk!</b> The slab locks into place — one patch mended.');
        E.applySiteState(mapId);
        if (site.filled.every(Boolean)) E.completeSite(mapId, tmpl, site);
        E.save();
        return true;
      }
      const destRow = s.grid[by];
      if (destRow && destRow[bx] === '.') {
        s.grid[ny][nx] = '.'; // the vacated cell
        site.slabPos[i] = { x: bx, y: by };
        MM.sound.thud();
        E.slabScrape(bx, by);
        E.applySiteState(mapId);
        E.save();
      } else {
        MM.sound.thud(); // blocked — a wall, water, another slab, or an unrelated broken tile
        E.slabWedged();
      }
      return true;
    }
    return false;
  };

  // The blueprint plaque: a full-depth Breakwater problem, same shape as
  // E.mathDoor. Solving it permits pushing this site's slabs.
  E.siteBlueprintProblem = function (mapId, tmpl) {
    const s = E.state;
    const site = E.ensureSite(mapId, tmpl.id);
    if (site.done) return;
    if (site.plaqueSolved) {
      MM.ui.log('📐 "Already got the plans for this one," you think.');
      return;
    }
    const step = () => {
      const prob = MM.mastery.pickBreakwaterGate(s);
      MM.ui.showProblem({
        header: '📐 <b>A blueprint plaque.</b> Solve it to unlock the repair.',
        problem: prob,
        leaveLabel: 'Step away',
        onAnswer(correct, kidAnswer) {
          recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
          if (correct) {
            site.plaqueSolved = true;
            E.save();
            return { msg: 'The plans click into place — the slabs are ready to push! 📐', end: 'win' };
          }
          return { msg: 'That doesn\'t match the plans. It offers you a new problem...' };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    step();
  };

  // Reset lever: gentle failure — re-spawns every LIVE slab back to its
  // start position. Already-locked tiles are untouched, so real progress
  // never gets undone; only a wedged or misplaced slab does.
  E.resetSite = function (mapId, tmpl) {
    const s = E.state;
    const site = E.ensureSite(mapId, tmpl.id);
    if (site.done) { MM.ui.log('🧱 This site is already finished — nothing left to reset.'); return; }
    tmpl.pairs.forEach((p, i) => {
      if (site.filled[i]) return;
      const cur = site.slabPos[i];
      s.grid[cur.y][cur.x] = '.'; // clear wherever it currently sits — applySiteState only overlays
      site.slabPos[i] = { ...p.slab };
    });
    MM.sound.fanfare();
    MM.ui.log('⚙️ You pull the lever — the loose slabs shudder back to their starting spots.');
    E.applySiteState(mapId);
    E.save();
  };

  // A site's last broken tile just filled: map-edit the footprint to
  // finished floor (bridge/fog precedent). Town sites pay out gold and a
  // Maren line; once ALL FOUR town sites are done, the Guild honor + charm.
  E.completeSite = function (mapId, tmpl, site) {
    site.done = true;
    E.applySiteState(mapId);
    const isTownSite = mapId === 'gullwrack' && (MM.maps.GULLWRACK_TOWN_SITES || []).includes(tmpl.id);
    if (!isTownSite) {
      MM.ui.log('🌊 The rubble clears — the shortcut is open!');
      return;
    }
    const s = E.state;
    const gold = E.gainGold(15 * tmpl.pairs.length);
    MM.ui.log(`🧱 <b>The ${tmpl.id} is repaired!</b> +${gold} gold. "Fine work," Maren calls over.`);
    const allDone = (MM.maps.GULLWRACK_TOWN_SITES || []).every(id => {
      const st = s.repairSites['gullwrack:' + id];
      return st && st.done;
    });
    if (allDone && !s.isles.gullwrackRebuilt) {
      s.isles.gullwrackRebuilt = true;
      MM.ui.log('🏅 Maren claps the dust from her hands. "Every last stone, mended. You\'re an honorary Guildmember now, hero — <b>truly</b>."');
      if (!s.items.charms.includes('mason')) {
        s.items.charms.push('mason');
        let worn = false;
        if (s.charmsOn.length < E.CHARM_SLOTS) { s.charmsOn.push('mason'); worn = true; }
        MM.ui.log(`🧱 <b>She presses the Mason's Charm into your hand.</b>${worn ? ' You put it on right away.' : ''}`);
      }
    }
    E.save();
  };

  // ========== Wave 12: pressure plates, cracked floor, free slabs ==========
  // STANDING RULES (permanent, review-blocking): a joke is an observation,
  // never an obstacle; comedy channels are field/glyph/sound/modal, never
  // the log alone; no gag may ever block, slow, or invalidate a
  // mathematically correct action.

  // A plate-gate ('&') is open only WHILE some pressure plate ('+') on the
  // live floor is held down — by the player, the pet, or a pushed slab.
  // OR across plates: any one held plate opens every gate on the floor.
  E.platePowered = function (mapId) {
    const s = E.state;
    if (!s || !s.grid) return false;
    mapId = mapId || s.mapId;
    if (mapId !== s.mapId) return false;   // only the live floor has occupancy
    const at = (x, y) => s.grid[y] && s.grid[y][x];
    if (at(s.px, s.py) === '+') return true;
    const pp = E.petPos;
    if (s.isles && s.isles.pet && pp && !(pp.x === s.px && pp.y === s.py) && at(pp.x, pp.y) === '+') return true;
    if (s.wing && s.wing.slabs && mapId === 'wing' && s.wing.slabs.some(sl => sl.under === '+')) return true;
    const free = s.freeSlabs && s.freeSlabs[mapId];
    if (free && free.some(sl => sl.under === '+')) return true;
    // Wave 13 (P1): the Understudy HOLDS a plate wherever its route ended —
    // the plate-occupancy check's one new clause.
    const u = E.understudy;
    if (u && u.mapId === mapId && at(u.x, u.y) === '+') return true;
    // Wave 13 (P2): Your Own Room's live slabs (per-visit, like the grid).
    if (mapId === 'myroom' && E._myRoomSlabs && E._myRoomSlabs.some(sl => sl.under === '+')) return true;
    return false;
  };
  // Is THIS plate tile occupied right now (pressed sprite)? Slabs draw 'U'
  // over the plate cell anyway, so only player/pet/Understudy need checking.
  E.plateOccupied = function (x, y) {
    const s = E.state;
    if (!s || !s.grid) return false;
    if (s.px === x && s.py === y) return true;
    const u = E.understudy;
    if (u && u.mapId === s.mapId && u.x === x && u.y === y) return true;
    const pp = E.petPos;
    return !!(s.isles && s.isles.pet && pp && pp.x === x && pp.y === y);
  };
  E.platePressFeedback = function () {
    E.gateGlintUntil = performance.now() + 1600;   // the opened gates glint
    MM.sound.tone(4);
    if (!E._plateNoted) {
      E._plateNoted = true;
      MM.ui.log('⚙️ The plate sinks underfoot — somewhere, a counterweight gate lifts.');
    }
  };

  // Cracked floor ('!'): holds a crossing exactly once, then crumbles into
  // an ordinary drop chute ('v') behind you. In a dungeon the chute is the
  // existing one-way drop; in the Wing it drops to Grumbold's cellar —
  // never a punishment, always a place. Crumbles are per-visit (floors
  // rebuild on entry), so nothing is ever permanently lost.
  let crackNoted = false;
  E.crackCreak = function () {
    MM.sound.creak();
    if (!crackNoted) {
      crackNoted = true;
      MM.ui.log('⚠️ The floor creaks underfoot... it won\'t hold a second crossing.');
    }
  };
  E.crumbleBehind = function (x, y) {
    const s = E.state;
    if (!s.grid[y] || s.grid[y][x] !== '!') return;
    s.grid[y][x] = 'v';
    MM.sound.creak();
  };

  // ---------- v1.8.2: wedged slabs + the toot (live playtest) ----------
  // A kid pushed a slab into a corner and thought the puzzle was ruined.
  // The reset lever already existed, but only the LOG explained it — and
  // kids don't read the log. So: three futile pushes in a row (any slab
  // system) → ONE modal, kid-initiated by the pushing itself, that names
  // the lever. The counter clears on any successful push.
  E._futileSlab = 0;
  E.slabWedged = function () {
    E._futileSlab++;
    if (E._futileSlab < 3 || E._wedgeNoted) return;
    E._wedgeNoted = true;
    MM.ui.dialog('🪨 Wedged tight',
      'The slab is jammed against something — and that\'s allowed. It costs nothing.<br><br>' +
      'Every slab room keeps a <b>reset lever</b> ⚙️ on the wall: one pull, and the loose slabs ' +
      'shuffle home to their starting spots for a fresh try.<br><br>' +
      '<i>"A wedged slab is not a failed proof." — MathMaker Milla</i>');
  };
  // The toot: stone scraped over stone occasionally emits a small rude
  // noise (~1 push in 7). The slab is scandalized (💨, "it wasn't me").
  // Field + sound channels only; never louder than the thud it rides on.
  E.slabScrape = function (bx, by) {
    E._futileSlab = 0;
    if (Math.random() < 0.15) {
      MM.sound.toot();
      E._slabPop = { x: bx, y: by, until: Date.now() + 900, ch: '💨' };
      return true;
    }
    return false;
  };

  // Free-standing slabs (P2): pushable 'U' slabs OUTSIDE repair sites and
  // the Wing (MM.maps.FREE_SLABS). Position persists per mapId; a non-site
  // 'l' lever on the floor shuffles them home (gentle failure).
  E.applyFreeSlabs = function (mapId) {
    const s = E.state;
    const tmpl = MM.maps.FREE_SLABS && MM.maps.FREE_SLABS[mapId];
    if (!tmpl || !s.grid) return;
    s.freeSlabs = s.freeSlabs || {};
    if (!s.freeSlabs[mapId]) s.freeSlabs[mapId] = tmpl.map(t => ({ x: t.x, y: t.y, under: '.' }));
    for (const t of tmpl) if (s.grid[t.y][t.x] === 'U') s.grid[t.y][t.x] = '.';
    for (const sl of s.freeSlabs[mapId]) s.grid[sl.y][sl.x] = 'U';
  };
  E.tryFreeSlabBump = function (dx, dy, nx, ny) {
    const s = E.state;
    const list = s.freeSlabs && s.freeSlabs[s.mapId];
    const slab = list && list.find(sl => sl.x === nx && sl.y === ny);
    if (!slab) return;
    const bx = nx + dx, by = ny + dy;
    const destCh = s.grid[by] && s.grid[by][bx];
    const blocked = !(destCh === '.' || destCh === '+' || destCh === '_')
      || list.some(o => o !== slab && o.x === bx && o.y === by)
      || s.monsters.some(m => m.hp > 0 && m.x === bx && m.y === by);
    if (blocked) { MM.sound.thud(); E.slabWedged(); return; }
    s.grid[ny][nx] = slab.under || '.';
    slab.x = bx; slab.y = by; slab.under = destCh;
    s.grid[by][bx] = 'U';
    MM.sound.thud();
    E.slabScrape(bx, by);
    if (destCh === '+') E.platePressFeedback();
    E.save();
    MM.ui.refresh();
  };
  E.freeSlabReset = function (mapId) {
    const s = E.state;
    const tmpl = MM.maps.FREE_SLABS && MM.maps.FREE_SLABS[mapId];
    if (!tmpl) return;
    const list = (s.freeSlabs && s.freeSlabs[mapId]) || [];
    list.forEach((sl, i) => {
      if (s.grid[sl.y] && s.grid[sl.y][sl.x] === 'U') s.grid[sl.y][sl.x] = sl.under || '.';
      list[i] = { x: tmpl[i].x, y: tmpl[i].y, under: '.' };
      s.grid[tmpl[i].y][tmpl[i].x] = 'U';
    });
    MM.sound.fanfare();
    MM.ui.log('⚙️ You pull the lever — the loose slab shudders back to its starting spot.');
    E.save();
    MM.ui.refresh();
  };

  // ========== Wave 12 (P4): the skip-count stepping stones ==========
  // Walk the pond stones in ×2 order (2, 4, 6, 8) to reach the chest islet.
  // A wrong stone is a splash and a scramble back to the bank — no HP, no
  // cost, no text (the Turning-Stones discipline: discovery, never a scold).
  E._skipNext = 0;
  E.skipStoneStep = function (dx, dy, nx, ny) {
    const s = E.state;
    const stone = MM.maps.SKIP_STONES.find(st => st.x === nx && st.y === ny);
    if (!stone) return;
    if (stone.seq === 0 || stone.seq === E._skipNext) {
      E.petPos = { x: s.px, y: s.py };
      s.px = nx; s.py = ny;
      E._skipNext = stone.seq + 1;
      MM.sound.tone(stone.seq % 5);
      E.walkStamina();
      E.updatePetAlert();
      return;
    }
    E._skipNext = 0;
    MM.sound.splash();
    if (MM.ui.worldBurst && !s.calmMode) MM.ui.worldBurst(nx, ny, '#5d97e0', 10);
    const bank = MM.maps.SKIP_STONES_BANK;
    s.px = bank.x; s.py = bank.y;
    E.petPos = { x: bank.x, y: bank.y };
    MM.ui.refresh();
  };
  E.worldChest = function (x, y) {
    const s = E.state;
    const key = `world:${x},${y}`;
    if (s.opened[key]) return;
    s.opened[key] = true;
    s.grid[y][x] = '.';
    const g = E.gainGold(48);
    MM.sound.fanfare();
    E.save();
    MM.ui.dialog('🎁 The pond chest',
      `Inside: <b>${g} gold</b>.<br><br><i>Counting by twos, all the way across. Whoever carved those stones would be pleased.</i>`);
  };

  // ========== Wave 12 (P3): the Workshop Wing ==========
  // Combat-free proving rooms behind the castle's Study door, gated on
  // s.endingDone. Everything persists in s.wing; the grid rebuilds per
  // visit and E.applyWingState re-derives it (the repair-site recipe).
  E.WING_ROOM_GOLD = 80;
  E.ensureWing = function () {
    const s = E.state;
    if (!s.wing) {
      s.wing = {
        rooms: {}, slabs: null, mirrors: null, mirrorTurns: {}, cats: null,
        wardrobeBumps: 0, wardrobeMoved: false, titleGiven: false,
      };
    }
    const w = s.wing;
    if (!w.rooms) w.rooms = {};
    if (!w.slabs) w.slabs = MM.maps.WING_SLABS.map(t => ({ id: t.id, num: t.num, x: t.x, y: t.y, under: '.', asleep: !!t.asleep, locked: false }));
    if (!w.mirrors) w.mirrors = MM.maps.WING_ARMORY.initial.slice();
    if (!w.mirrorTurns) w.mirrorTurns = {};
    if (!w.cats) w.cats = MM.maps.WING_CATS.statues.map(c => c.initial);
    // Wave 13 (P2): Your Own Room — layout + solve-count persist here, so
    // they ride along with the rest of the Wing through NG+ snapshot/restore
    // (startGolden/returnToFinishedKingdom deliberately leave s.wing alone).
    if (!w.myRoom) {
      w.myRoom = { pieces: [], hand: null, solveCount: 0, seenFirstSolve: false, seenOpen: false };
    }
    return w;
  };
  E.wingOpen = () => !!(E.state && E.state.endingDone);

  // The castle door: a brass plate with the kid's own name — and "not yet."
  E.wingDoor = function () {
    const s = E.state;
    if (!E.wingOpen()) {
      return MM.ui.dialog('🚪 A door by the Study', MM.data.WING_DOOR_LOCKED(s.name));
    }
    E.enterWing();
  };

  E.enterWing = function () {
    const s = E.state;
    MM.track('enterWing');
    if (E.resetTransientEntities) E.resetTransientEntities();   // Wave 13 transients
    E.ensureWing();
    s.mapId = 'wing';
    s.grid = MM.maps.parse(MM.maps.WING, '#');
    s.monsters = [];   // the castle rule extends to the Wing: no combat, ever
    E.applyWingState();
    const start = MM.maps.find(s.grid, 'P')[0];
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log(MM.data.WING_ENTER_LINE);
    E.save();
    MM.ui.refresh();
  };
  E.exitWing = function () {
    E.enterCastle();
    // land beside the Study door rather than the castle's front hall
    const s = E.state;
    s.px = 8; s.py = 9;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.refresh();
  };

  // Re-derive the Wing's grid from persisted state (call on entry and after
  // any change): opened chests, slab positions, the wardrobe's departure.
  E.applyWingState = function () {
    const s = E.state;
    if (!s.grid || s.mapId !== 'wing') return;
    const w = E.ensureWing();
    for (const key of Object.keys(s.opened)) {
      const [mid, xy] = key.split(':');
      if (mid !== 'wing') continue;
      const [x, y] = xy.split(',').map(Number);
      if (s.grid[y]) s.grid[y][x] = '.';
    }
    if (w.wardrobeMoved) {
      const wd = MM.maps.WING_WARDROBE;
      s.grid[wd.y][wd.x] = '.';
    }
    for (const t of MM.maps.WING_SLABS) if (s.grid[t.y][t.x] === 'U') s.grid[t.y][t.x] = '.';
    for (const sl of w.slabs) s.grid[sl.y][sl.x] = 'U';
  };

  // ---------- the Wing's movement branch ----------
  E.wingMove = function (dx, dy, nx, ny, ch) {
    const s = E.state;
    const w = E.ensureWing();
    if (E.tryUnderstudySwap(nx, ny)) return;   // Wave 13: it never blocks
    if (ch === 'X') return E.exitWing();
    if (ch === 'H') return E.wingDoorway();
    if (ch === 'T') return E.wingPortrait(nx, ny);
    if (ch === 'i') return E.wingPlaque(nx, ny);
    if (ch === 'w') return E.wingWardrobeBump();
    if (ch === 'M') return E.wingMirror(nx, ny);
    if (ch === 'S') return E.wingCat(nx, ny);
    if (ch === 'U') return E.wingSlabBump(dx, dy, nx, ny);
    if (ch === 'l') return E.wingReset(nx, ny);
    if (ch === '*') return E.wingChest(nx, ny);
    if (ch === 'O') return MM.ui.dialog('⛲ The fish fountain',
      'Stone fish circle the basin, mid-leap, over water that is entirely real. The sculptor clearly liked fish. The cats clearly agree.');
    if (ch === '@') return MM.ui.log('🔦 The lamp is warm, steady, and entirely certain about which way it\'s pointing.');
    if (ch === '$') return MM.ui.log(E.wingBeamLit()
      ? '🔮 The crystal hums, full of drunk light. Deeply pleased with itself.'
      : '🔮 A dark crystal on a pedestal. It feels like an unlit room waiting for a lamp.');
    if (ch === 'k') return MM.ui.log(MM.data.pick(MM.data.WING_SHELF_LINES));
    if (ch === 'G' && !(w.rooms && w.rooms.armory)) {
      MM.sound.thud();
      return MM.ui.log('⚙️ The beam-gate is shut tight. The dark crystal, presumably, is the key.');
    }
    if (ch === '&' && !E.platePowered('wing')) {
      MM.sound.thud();
      return MM.ui.log('🧱 The counterweight gate is shut — it only lifts while something rests on a pressure plate.');
    }
    if (ch === '#') return;
    // walk (no stamina — the castle rule), with cracked-floor bookkeeping
    const fromX = s.px, fromY = s.py;
    const fromCh = s.grid[fromY] && s.grid[fromY][fromX];
    E.petPos = { x: s.px, y: s.py };
    s.px = nx; s.py = ny;
    E.recordStep(dx, dy);   // Wave 13: the echo plates' rolling buffer
    if (fromCh === '!') E.crumbleBehind(fromX, fromY);
    if (ch === '!') E.crackCreak();
    if (ch === '+') E.platePressFeedback();
    if (ch === '?') E.echoPlateStep();
    if (ch === 'v') return E.wingFall();
    if (ch === '<') return E.wingLadder();
    if (ch === '_') return E.tileEffects('_', dx, dy);
    // the wardrobe chirps when walked PAST — a two-note tell, throttled
    if (!w.wardrobeMoved) {
      const wd = MM.maps.WING_WARDROBE;
      const near = Math.abs(s.px - wd.x) + Math.abs(s.py - wd.y) === 1;
      if (near && Date.now() - (E._wardrobeChirpAt || 0) > 5000) {
        E._wardrobeChirpAt = Date.now();
        MM.sound.chirp();
      }
    }
  };

  E.wingFall = function () {
    const s = E.state;
    const c = MM.maps.WING_CELLAR.landing;
    s.px = c.x; s.py = c.y;
    E.petPos = { x: c.x, y: c.y };
    MM.sound.thud();
    MM.ui.log('🕳 The floor drops you into <b>Grumbold\'s cellar</b>. There\'s a ladder in the corner — and it smells faintly of biscuits.');
    MM.ui.refresh();
  };
  E.wingLadder = function () {
    const s = E.state;
    const r = MM.maps.WING_CELLAR.ladderReturn;
    s.px = r.x; s.py = r.y;
    E.petPos = { x: r.x, y: r.y };
    MM.ui.log('🪜 Up the ladder, back to the hall.');
    MM.ui.refresh();
  };

  // ---------- portraits, plaques, the doorway ----------
  E._wingPortraits = null;
  E.wingPortraitIndex = function (x, y) {
    if (!E._wingPortraits) {
      const grid = MM.maps.parse(MM.maps.WING, '#');
      E._wingPortraits = MM.maps.find(grid, 'T').sort((a, b) => (a.y - b.y) || (a.x - b.x));
    }
    return E._wingPortraits.findIndex(p => p.x === x && p.y === y);
  };
  E.wingPortrait = function (x, y) {
    const i = E.wingPortraitIndex(x, y);
    const p = MM.data.WING_PORTRAITS[i];
    if (!p) return;
    MM.ui.dialog(p.name, p.line);
  };
  E.wingPlaque = function (x, y) {
    const p = MM.data.WING_PLAQUES[`${x},${y}`];
    if (!p) return;
    MM.ui.dialog(p.title, p.body);
  };
  // Wave 13 (P2): the named plate now OPENS the door (the v1.8.2 "masons"
  // holding-note is gone). Pre-title, the doorway keeps the blank-plate tease.
  E.wingDoorway = function () {
    const s = E.state;
    const w = E.ensureWing();
    if (w.titleGiven) {
      if (!w.myRoom.seenOpen) {
        w.myRoom.seenOpen = true;
        E.save();
        return MM.ui.dialog('🚪 The doorway bears a name', MM.data.WING_DOORWAY_NAMED(s.name),
          () => E.enterMyRoom());
      }
      return E.enterMyRoom();
    }
    MM.ui.dialog('🚪 An empty doorway', MM.data.WING_DOORWAY_BLANK);
  };

  // ---------- the wardrobe (an obvious mimic with a terrible tell) ----------
  E.wingWardrobeBump = function () {
    const s = E.state;
    const w = E.ensureWing();
    if (w.wardrobeMoved) return;
    w.wardrobeBumps = (w.wardrobeBumps || 0) + 1;
    if (w.wardrobeBumps <= 2) {
      const b = MM.data.WING_WARDROBE_BUMPS[w.wardrobeBumps - 1];
      if (w.wardrobeBumps === 2) E._wardrobeSweatUntil = Date.now() + 2600; // 💧, in the field
      E.save();
      return MM.ui.dialog(b.title, b.body);
    }
    w.wardrobeMoved = true;
    E.applyWingState();
    E.save();
    MM.sound.fanfare();
    MM.ui.dialog(MM.data.WING_WARDROBE_CONFESSION.title, MM.data.WING_WARDROBE_CONFESSION.body,
      () => MM.ui.log('🚪 The wardrobe has moved to the Study. It seems immensely relieved.'));
  };

  // ---------- Wren's Numberlings ----------
  E.wingSlabAt = function (x, y) {
    const s = E.state;
    const w = s && s.wing;
    return (w && w.slabs && w.slabs.find(sl => sl.x === x && sl.y === y)) || null;
  };
  // Pure check, unit-tested directly: is (a, b) a TRUE filling? EVERY true
  // filling is accepted — multiple-solutions delight is load-bearing.
  E.wingEquationOk = (a, b) => a != null && b != null && a * b === MM.maps.WING_WREN.target;
  E.wingSlabBump = function (dx, dy, nx, ny) {
    const s = E.state;
    const w = E.ensureWing();
    const slab = w.slabs.find(sl => sl.x === nx && sl.y === ny);
    if (!slab) return;
    if (slab.locked) return MM.ui.log('🪨 The Numberling is set in its socket — proud, and immovable.');
    const bx = nx + dx, by = ny + dy;
    const destCh = s.grid[by] && s.grid[by][bx];
    const blocked = !(destCh === '.' || destCh === '+' || destCh === '0' || destCh === '_')
      || w.slabs.some(o => o !== slab && o.x === bx && o.y === by);
    if (blocked) { MM.sound.thud(); E.slabWedged(); return; }
    s.grid[ny][nx] = slab.under || '.';
    slab.x = bx; slab.y = by; slab.under = destCh;
    s.grid[by][bx] = 'U';
    MM.sound.thud();
    const tooted = E.slabScrape(bx, by);
    if (slab.asleep) {
      // the 💤 gag never blocks the push — the bump both wakes AND moves it
      slab.asleep = false;
      MM.sound.tone(1);
      MM.ui.log(`💤 The ${slab.num} wakes with a start and pretends it was counting the whole time.`);
    } else if (!tooted && slab.num != null && Math.random() < 0.25) {
      E._slabPop = { x: bx, y: by, until: Date.now() + 900 };   // 💢, in the field
    }
    if (destCh === '+') E.platePressFeedback();
    E.wingCheckSockets();
    E.save();
    MM.ui.refresh();
  };
  E.wingCheckSockets = function () {
    const s = E.state;
    const w = E.ensureWing();
    if (w.rooms.wren) return;
    const [sa, sb] = MM.maps.WING_WREN.sockets;
    const a = E.wingSlabAt(sa.x, sa.y), b = E.wingSlabAt(sb.x, sb.y);
    if (!a || !b) return;
    if (!E.wingEquationOk(a.num, b.num)) return;   // false filling: the slump says it all
    a.locked = true; b.locked = true;
    w.rooms.wren = true;
    const g = E.gainGold(E.WING_ROOM_GOLD);
    MM.sound.fanfare();
    if (MM.ui.worldBurst && !s.calmMode) {
      MM.ui.worldBurst(sa.x, sa.y, '#ffd94a', 14);
      MM.ui.worldBurst(sb.x, sb.y, '#ffd94a', 14);
    }
    E.save();
    MM.ui.dialog('✨ The Numberlings approve',
      `<b>${a.num} × ${b.num} = ${MM.maps.WING_WREN.target}.</b> The two Numberlings hop in place, delighted with themselves, and settle into their sockets for good.<br><br>` +
      `+${g} gold — MathMaker Wren's standing reward for <i>any</i> true answer.`,
      () => E.wingMaybeTitle());
  };

  // ---------- the Armory beam ----------
  E.wingMirrorIndexAt = function (x, y) {
    return MM.maps.WING_ARMORY.mirrors.findIndex(m => m.x === x && m.y === y);
  };
  // Read-only (tileSprite calls this): current state or the authored initial.
  E.wingMirrorStateAt = function (x, y) {
    const i = E.wingMirrorIndexAt(x, y);
    if (i < 0) return 0;
    const w = E.state && E.state.wing;
    const arr = (w && w.mirrors) || MM.maps.WING_ARMORY.initial;
    return arr[i] || 0;
  };
  E.wingBeam = function () {
    const s = E.state;
    if (!s || s.mapId !== 'wing' || !s.grid) return { points: [], lit: false };
    const A = MM.maps.WING_ARMORY;
    let x = A.lamp.x, y = A.lamp.y, dx = A.dir[0], dy = A.dir[1];
    const points = [{ x, y }];
    let lit = false, guard = 0;
    while (guard++ < 80) {
      x += dx; y += dy;
      const ch = s.grid[y] && s.grid[y][x];
      if (ch === 'M') {
        points.push({ x, y });
        if (E.wingMirrorStateAt(x, y) === 0) { const t = dx; dx = -dy; dy = -t; }   // '/'
        else { const t = dx; dx = dy; dy = t; }                                     // '\'
        continue;
      }
      if (ch === '$') { points.push({ x, y }); lit = true; break; }
      if (ch === '.' || ch === '+' || ch === '0' || ch === '!' || ch === '_') continue;
      points.push({ x: x - dx, y: y - dy });
      break;
    }
    return { points, lit };
  };
  E.wingBeamLit = () => E.wingBeam().lit;
  E.wingMirror = function (x, y) {
    const s = E.state;
    const w = E.ensureWing();
    const i = E.wingMirrorIndexAt(x, y);
    if (i < 0) return;
    w.mirrors[i] = (w.mirrors[i] + 1) % 2;
    w.mirrorTurns[i] = (w.mirrorTurns[i] || 0) + 1;
    // the Nth rotation of any one stand plays a two-note descending sigh —
    // sound-channel comedy, and never an obstacle
    if (w.mirrorTurns[i] % 7 === 0) MM.sound.sigh(); else MM.sound.tone(3);
    if (!w.rooms.armory && E.wingBeamLit()) {
      w.rooms.armory = true;
      E.gateGlintUntil = performance.now() + 1600;
      MM.sound.fanfare();
      E.save();
      MM.ui.refresh();
      return MM.ui.dialog('💡 The crystal drinks the light',
        'The beam threads the shields, corner by corner, and sinks into the dark crystal — which <b>glows</b>.<br><br><i>Across the room, the beam-gate swings open.</i>',
        () => E.wingMaybeTitle());
    }
    E.save();
    MM.ui.refresh();
  };

  // ---------- Petronella's cats ----------
  E.wingCatIndexAt = function (x, y) {
    return MM.maps.WING_CATS.statues.findIndex(c => c.x === x && c.y === y);
  };
  E.wingCatFacing = function (i) {
    const w = E.state && E.state.wing;
    const arr = (w && w.cats) || MM.maps.WING_CATS.statues.map(c => c.initial);
    return arr[i] || 0;
  };
  E.wingCatNeeded = function (i) {
    const c = MM.maps.WING_CATS.statues[i];
    const f = MM.maps.WING_CATS.fountain;
    const dx = f.x - c.x, dy = f.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 1 : 3;   // E : W
    return dy > 0 ? 2 : 0;                                     // S : N
  };
  E.wingCat = function (x, y) {
    const s = E.state;
    const w = E.ensureWing();
    const i = E.wingCatIndexAt(x, y);
    if (i < 0) return;
    w.cats[i] = (w.cats[i] + 1) % 4;
    MM.sound.tone(2);
    const allFacing = MM.maps.WING_CATS.statues.every((c, ci) => w.cats[ci] === E.wingCatNeeded(ci));
    if (allFacing && !w.rooms.petronella) {
      w.rooms.petronella = true;
      const g = E.gainGold(E.WING_ROOM_GOLD);
      MM.sound.tone(0); MM.sound.tone(2, 0.18); MM.sound.tone(4, 0.36);
      E.save();
      MM.ui.refresh();
      return MM.ui.dialog('🐈 The cats agree',
        `The last cat clicks into place — and for one long moment, all three stone cats watch the fountain together. A chime rings out from nowhere in particular, deeply satisfied.<br><br>` +
        `+${g} gold, from a hidden drawer in the fountain's base.`,
        () => E.wingMaybeTitle());
    }
    E.save();
    MM.ui.refresh();
  };

  // ---------- chests, reset levers, the title ----------
  E.wingChest = function (x, y) {
    const s = E.state;
    const w = E.ensureWing();
    const key = `wing:${x},${y}`;
    if (s.opened[key]) return;
    const room = MM.maps.WING_ROOM_CHESTS[`${x},${y}`];
    const cellar = MM.maps.WING_CELLAR_CHEST.x === x && MM.maps.WING_CELLAR_CHEST.y === y;
    s.opened[key] = true;
    s.grid[y][x] = '.';
    MM.sound.coin();
    let title = '🎁 A chest', body;
    if (cellar) {
      const g = E.gainGold(30);
      body = `Inside: <b>${g} gold</b> and a very old biscuit tin (empty). Grumbold's cellar snacks — long since enjoyed by Grumbold.`;
    } else if (room === 'grumbold') {
      const g = E.gainGold(E.WING_ROOM_GOLD);
      w.rooms.grumbold = true;
      body = `Inside: <b>${g} gold</b> — and a note in a spidery hand:<br><br><i>"You crossed. Or you fell and climbed back, which is the same thing with extra steps. Either way: proven. — G. III"</i>`;
    } else if (room === 'armory') {
      const g = E.gainGold(E.WING_ROOM_GOLD);
      body = `Inside: <b>${g} gold</b> — kept exactly where Brightwell said the light would end up.`;
    } else if (room === 'pantry') {
      const g = E.gainGold(40);
      s.items.food.cheese = (s.items.food.cheese || 0) + 3;
      w.rooms.pantry = true;
      title = '🧀 The pantry chest';
      body = `Cheese. Of course it's cheese. It has always been cheese.<br><br><b>3 Cheese Wheels</b> go in your 🎒 bag — and <b>${g} gold</b> was under the cheese. Bartleby understood heroes.`;
    } else if (room === 'plate') {
      const g = E.gainGold(E.WING_ROOM_GOLD);
      w.rooms.plate = true;
      body = `Inside: <b>${g} gold</b>, and Milla's last word on the subject, carved inside the lid: <i>"Weight is honest."</i>`;
    } else {
      const g = E.gainGold(20);
      body = `Inside: <b>${g} gold</b>.`;
    }
    E.save();
    MM.ui.dialog(title, body, () => E.wingMaybeTitle());
  };
  E.wingReset = function (x, y) {
    const s = E.state;
    const w = E.ensureWing();
    const which = MM.maps.WING_RESET_LEVERS[`${x},${y}`];
    if (!which) return;
    const ids = which === 'wren'
      ? MM.maps.WING_SLABS.filter(t => t.num != null).map(t => t.id)
      : ['pantry', 'plate'];
    for (const id of ids) {
      const slab = w.slabs.find(sl => sl.id === id);
      const tmpl = MM.maps.WING_SLABS.find(t => t.id === id);
      if (!slab || slab.locked) continue;
      if (s.grid[slab.y] && s.grid[slab.y][slab.x] === 'U') s.grid[slab.y][slab.x] = slab.under || '.';
      slab.x = tmpl.x; slab.y = tmpl.y; slab.under = '.';
      s.grid[tmpl.y][tmpl.x] = 'U';
    }
    MM.sound.fanfare();
    MM.ui.log('⚙️ You pull the lever — the loose slabs shuffle back to their starting spots.');
    E.save();
    MM.ui.refresh();
  };
  E.wingMaybeTitle = function () {
    const s = E.state;
    const w = E.ensureWing();
    if (w.titleGiven || !E.WING_ROOMS.every(r => w.rooms[r])) return;
    w.titleGiven = true;
    s.titles = s.titles || [];
    if (!s.titles.includes('Keeper of the Proving Rooms')) s.titles.push('Keeper of the Proving Rooms');
    MM.sound.fanfare();
    if (MM.ui.worldBurst && !s.calmMode) MM.ui.worldBurst(s.px, s.py, '#ffd94a', 22);
    E.save();
    MM.ui.dialog('🏅 Keeper of the Proving Rooms', MM.data.WING_TITLE_LINE);
  };

  // ========== Wave 13: "The Understudy & Your Own Room" ==========
  // STANDING RULES apply: jokes are observations, never obstacles; comedy
  // channels are field/glyph/sound/modal, never the log alone.

  // Per-map-visit transients: the echo plates' step buffer, the Understudy,
  // the pupil, and the following staircase's trail. Nothing here is saved.
  E.STEP_BUFFER_MAX = 12;
  E.stepBuffer = [];
  E.understudy = null;   // { mapId, x, y, path, i, active, pausedBeat, stopped, lastStep }
  E.pupil = null;        // Your Own Room's visiting solver (drawn as the enrolled slime)
  E.stairPos = null;     // where the following staircase stands (2 moves back)
  E._stairTrail = [];
  E._myRoomSlabs = null; // Your Own Room's live slab positions (rebuilt per visit)
  E.resetTransientEntities = function () {
    E.stepBuffer = [];
    E.understudy = null;
    E.pupil = null;
    E.stairPos = null;
    E._stairTrail = [];
    E._myRoomSlabs = null;
  };

  // ---------- P1: echo plates & the Understudy ----------
  E.recordStep = function (dx, dy) {
    if (!dx && !dy) return;
    E.stepBuffer.push({ dx, dy });
    if (E.stepBuffer.length > E.STEP_BUFFER_MAX) E.stepBuffer.shift();
  };
  E.echoPlateStep = function () {
    const s = E.state;
    E.summonUnderstudy(s.px, s.py);
  };
  E.UNDERSTUDY_STEP_MS = 220;
  E.summonUnderstudy = function (x, y) {
    const s = E.state;
    MM.track('understudy');
    // re-stepping the plate re-stages the scene with a fresh buffer copy
    E.understudy = {
      mapId: s.mapId, x, y,
      path: E.stepBuffer.slice(),
      i: 0, active: E.stepBuffer.length > 0,
      pausedBeat: false, stopped: false, lastStep: 0,
    };
    MM.sound.tada();
    E._understudyPop = { until: Date.now() + 1600 };   // 🎭, in the field
    if (!s.seenUnderstudy) {
      // once-EVER big beat: the introduction. The replay holds for its cue —
      // understudyPulse skips whole beats while any modal is up.
      s.seenUnderstudy = true;
      E.save();
      MM.ui.dialog(MM.data.UNDERSTUDY_INTRO.title, MM.data.UNDERSTUDY_INTRO.body);
    }
    MM.ui.refresh();
  };
  // Pulsed from ui.js's worldLoop — NEVER its own setInterval, so the
  // headless unit suite can drive the replay deterministically by calling
  // E.understudyTick() directly.
  E.understudyPulse = function (now) {
    const u = E.understudy;
    if (!u || !u.active) return;
    if (MM.ui.modalOpen() || MM.battle.active()) return;
    if (now - u.lastStep < E.UNDERSTUDY_STEP_MS) return;
    u.lastStep = now;
    E.understudyTick();
  };
  E.understudyTick = function () {
    const s = E.state;
    const u = E.understudy;
    if (!u || !u.active) return;
    if (!s || s.mapId !== u.mapId) { E.understudy = null; return; }
    if (u.i >= u.path.length) return E.understudyFinish();
    // one theatrical half-beat pause before the final step
    if (u.i === u.path.length - 1 && !u.pausedBeat) { u.pausedBeat = true; return; }
    const { dx, dy } = u.path[u.i];
    const nx = u.x + dx, ny = u.y + dy;
    const ch = s.grid[ny] && s.grid[ny][nx];
    const blocked = ch == null || !'.P+?'.includes(ch)
      || (nx === s.px && ny === s.py)
      || (s.monsters || []).some(m => m.hp > 0 && m.x === nx && m.y === ny);
    if (blocked) {
      // polite: no failure, no cost — it just stands there, committed
      u.stopped = true;
      return E.understudyFinish();
    }
    u.x = nx; u.y = ny; u.i++;
    if (u.i >= u.path.length) E.understudyFinish();
  };
  E.understudyFinish = function () {
    const s = E.state;
    const u = E.understudy;
    if (!u) return;
    u.active = false;
    // wherever its route ends, it stays — and if that tile is a pressure
    // plate, it HOLDS it (see the clause in E.platePowered)
    if (s.grid[u.y] && s.grid[u.y][u.x] === '+') E.platePressFeedback();
    MM.ui.refresh();
  };
  // Walking into the Understudy swaps places, like a becalmed friend — it
  // must never block a route (if it was still mid-scene, it yields the
  // stage, graciously, and stays where it lands).
  E.tryUnderstudySwap = function (nx, ny) {
    const s = E.state;
    const u = E.understudy;
    if (!u || u.mapId !== s.mapId || u.x !== nx || u.y !== ny) return false;
    const ox = s.px, oy = s.py;
    s.px = nx; s.py = ny;
    u.x = ox; u.y = oy;
    u.active = false;
    MM.sound.tone(1);
    MM.ui.refresh();
    return true;
  };

  // ---------- P2: Your Own Room ----------
  E.enterMyRoom = function () {
    const s = E.state;
    MM.track('enterMyRoom');
    E.resetTransientEntities();
    E.ensureWing();
    s.mapId = 'myroom';
    s.monsters = [];   // combat-free, forever — the castle rule
    const en = MM.maps.MYROOM_ENTRY;
    s.px = en.x; s.py = en.y;
    E.buildMyRoomGrid();
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log(MM.data.MYROOM_ENTER_LINE);
    E.save();
    MM.ui.refresh();
  };
  E.exitMyRoom = function () {
    E.enterWing();
    const s = E.state;
    s.px = 38; s.py = 11;   // back in the hall, beside the named doorway
    E.petPos = { x: s.px, y: s.py };
    MM.ui.refresh();
  };
  // Rebuild the room's grid from the persisted layout (per-visit live state:
  // slabs return to their placed spots, crumbled cracks knit whole).
  E.buildMyRoomGrid = function () {
    const s = E.state;
    if (s.mapId !== 'myroom') return;
    const mr = E.ensureWing().myRoom;
    // if the kid stands where a solid piece belongs, step them clear first
    const SOLID = { wall: 1, slab: 1, gate: 1, chest: 1 };
    if (mr.pieces.some(p => SOLID[p.t] && p.x === s.px && p.y === s.py)) {
      const en = MM.maps.MYROOM_ENTRY;
      s.px = en.x; s.py = en.y;
      E.petPos = { x: en.x, y: en.y };
    }
    s.grid = MM.maps.parse(MM.maps.MYROOM, '#');
    E._myRoomSlabs = [];
    for (const p of mr.pieces) {
      s.grid[p.y][p.x] = MM.maps.MYROOM_PIECE_CHARS[p.t];
      if (p.t === 'slab') E._myRoomSlabs.push({ x: p.x, y: p.y, under: '.' });
    }
  };
  // Placement: pure and unit-testable. False = rejected (budget spent,
  // outside the template floor, the entry tile, or an occupied cell).
  E.myRoomPlace = function (t, x, y) {
    const s = E.state;
    const mr = E.ensureWing().myRoom;
    const budget = MM.maps.MYROOM_BUDGET[t];
    if (!budget) return false;
    if (mr.pieces.filter(p => p.t === t).length >= budget) return false;
    const en = MM.maps.MYROOM_ENTRY;
    if (x === en.x && y === en.y) return false;   // the arch tile stays clear
    const tmpl = MM.maps.parse(MM.maps.MYROOM, '#');
    if (!tmpl[y] || tmpl[y][x] !== '.') return false;   // template floor only
    if (mr.pieces.some(p => p.x === x && p.y === y)) return false;
    if (s && s.mapId === 'myroom') {
      if (!s.grid[y] || s.grid[y][x] !== '.') return false;   // a pushed slab rests there
      if (x === s.px && y === s.py) return false;
    }
    mr.pieces.push({ t, x, y });
    if (s && s.mapId === 'myroom') {
      s.grid[y][x] = MM.maps.MYROOM_PIECE_CHARS[t];
      if (t === 'slab') (E._myRoomSlabs = E._myRoomSlabs || []).push({ x, y, under: '.' });
    }
    E.save();
    return true;
  };
  const pieceName = t => MM.data.MYROOM_PIECES[t].label.replace(/^\S+\s/, '');
  // The mason's trail: carrying a piece, each step sets one down on the
  // tile you just left. (Deviation, documented: the order's literal
  // "bumping an empty floor tile places it" freezes the builder in place —
  // any step IS a bump on empty floor. Laying-behind keeps walking free,
  // reads instantly, and every mislaid piece is one bump from recovery.)
  E.myRoomLay = function (x, y) {
    const mr = E.ensureWing().myRoom;
    const t = mr.hand;
    if (!t || E.pupil) return;
    if (!E.myRoomPlace(t, x, y)) return;
    MM.sound.thud();
    const left = MM.maps.MYROOM_BUDGET[t] - mr.pieces.filter(p => p.t === t).length;
    if (left <= 0) {
      mr.hand = null;
      E.save();
      MM.ui.log(`🧺 That was the last ${pieceName(t).toLowerCase()} — your hands are free.`);
    }
    MM.ui.refresh();
  };
  E.myRoomBench = function () {
    const mr = E.ensureWing().myRoom;
    if (E.pupil) return MM.ui.log('🐌 The pupil is mid-attempt — watch!');
    const buttons = [];
    for (const t of Object.keys(MM.maps.MYROOM_BUDGET)) {
      const left = MM.maps.MYROOM_BUDGET[t] - mr.pieces.filter(p => p.t === t).length;
      if (left > 0) {
        buttons.push({
          label: `${MM.data.MYROOM_PIECES[t].label} — carry (${left} left)`,
          onClick: () => {
            mr.hand = t;
            E.save();
            MM.ui.log(`🧺 Carrying: ${MM.data.MYROOM_PIECES[t].label}. Each step sets one down on the tile you leave.`);
          },
        });
      }
    }
    // walk-on and pushable pieces can't be bump-collected — the bench takes
    // them back (the always-available way out; nothing is ever stuck placed)
    for (const t of ['slab', 'plate', 'crack', 'gate']) {
      if (mr.pieces.some(p => p.t === t)) {
        buttons.push({ label: `↩ Take back a ${pieceName(t).toLowerCase()}`, onClick: () => E.myRoomTakeBack(t) });
      }
    }
    if (mr.hand) buttons.push({ label: '🖐 Carry nothing', onClick: () => { mr.hand = null; E.save(); } });
    buttons.push({ label: 'Leave it', onClick: () => {} });
    MM.ui.dialogChoices(MM.data.MYROOM_BENCH_TITLE, MM.data.MYROOM_BENCH_BODY, buttons);
  };
  E.myRoomTakeBack = function (t) {
    const mr = E.ensureWing().myRoom;
    if (E.pupil) return;
    for (let i = mr.pieces.length - 1; i >= 0; i--) {
      if (mr.pieces[i].t === t) { mr.pieces.splice(i, 1); break; }
    }
    E.buildMyRoomGrid();   // safe rebuild — also re-homes the live slabs
    MM.sound.tone(2);
    MM.ui.log('↩ Back to the bench it goes.');
    E.save();
    MM.ui.refresh();
  };
  E.myRoomPickupBump = function (nx, ny) {
    const s = E.state;
    const mr = E.ensureWing().myRoom;
    if (E.pupil) return MM.ui.log('🐌 The pupil is mid-attempt — watch!');
    const i = mr.pieces.findIndex(p => p.x === nx && p.y === ny && (p.t === 'wall' || p.t === 'chest'));
    if (i < 0) return;
    const t = mr.pieces[i].t;
    mr.pieces.splice(i, 1);
    s.grid[ny][nx] = '.';
    MM.sound.tone(2);
    MM.ui.log(`↩ You lift the ${pieceName(t).toLowerCase()} back out — it returns to the bench.`);
    E.save();
    MM.ui.refresh();
  };
  E.myRoomSlabBump = function (dx, dy, nx, ny) {
    const s = E.state;
    if (E.pupil) { MM.sound.thud(); return MM.ui.log('🐌 The pupil is mid-attempt — watch!'); }
    const list = E._myRoomSlabs || [];
    const slab = list.find(sl => sl.x === nx && sl.y === ny);
    if (!slab) return;
    const bx = nx + dx, by = ny + dy;
    const destCh = s.grid[by] && s.grid[by][bx];
    const blocked = !(destCh === '.' || destCh === '+')
      || list.some(o => o !== slab && o.x === bx && o.y === by);
    if (blocked) { MM.sound.thud(); E.slabWedged(); return; }   // the v1.8.2 nudge works here too
    s.grid[ny][nx] = slab.under || '.';
    slab.x = bx; slab.y = by; slab.under = destCh;
    s.grid[by][bx] = 'U';
    MM.sound.thud();
    E.slabScrape(bx, by);
    if (destCh === '+') E.platePressFeedback();
    MM.ui.refresh();
  };
  // The reset pull-cord: slabs shuffle home to their placed spots, crumbled
  // cracks knit whole. The wedge law, honored from day one.
  E.myRoomReset = function () {
    const s = E.state;
    const mr = E.ensureWing().myRoom;
    if (E.pupil) return MM.ui.log('🐌 The pupil is mid-attempt — watch!');
    const homes = mr.pieces.filter(p => p.t === 'slab');
    (E._myRoomSlabs || []).forEach((sl, i) => {
      const home = homes[i];
      if (!home || (home.x === sl.x && home.y === sl.y)) return;
      if (home.x === s.px && home.y === s.py) return;             // never under the kid
      if (s.grid[home.y][home.x] !== '.') return;
      s.grid[sl.y][sl.x] = sl.under || '.';
      sl.x = home.x; sl.y = home.y; sl.under = '.';
      s.grid[home.y][home.x] = 'U';
    });
    for (const p of mr.pieces) {
      if (p.t === 'crack' && s.grid[p.y][p.x] === 'v') s.grid[p.y][p.x] = '!';
    }
    MM.sound.fanfare();
    MM.ui.log('⚙️ You pull the cord — the slabs shuffle home, and the cracked tiles knit themselves whole.');
    MM.ui.refresh();
  };
  // The room's movement branch.
  E.myRoomMove = function (dx, dy, nx, ny, ch) {
    const s = E.state;
    const mr = E.ensureWing().myRoom;
    if (ch === 'X') return E.exitMyRoom();
    if (ch === 'B') return E.myRoomBench();
    if (ch === 'V') return E.myRoomInvite();
    if (ch === 'R') return E.myRoomReset();
    if (ch === 'O') return MM.ui.dialog('🏆 The pedestal', MM.data.MYROOM_PEDESTAL_LINE(mr.solveCount || 0));
    if (ch === 'U') return E.myRoomSlabBump(dx, dy, nx, ny);
    if (ch === 'W' || ch === '*') return E.myRoomPickupBump(nx, ny);
    if (ch === '&' && !E.platePowered('myroom')) {
      MM.sound.thud();
      return MM.ui.log('🧱 Your counterweight gate is shut — it lifts while something rests on a plate. (The bench can take it back.)');
    }
    if (ch === '#') return;
    if (ch === 'v') {   // a crumbled crack: a shallow pit, gently survived
      MM.sound.thud();
      const en = MM.maps.MYROOM_ENTRY;
      s.px = en.x; s.py = en.y;
      E.petPos = { x: en.x, y: en.y };
      MM.ui.log('🕳 You hop down into the little pit and clamber out by the arch. The reset cord mends cracked tiles.');
      MM.ui.refresh();
      return;
    }
    const fromX = s.px, fromY = s.py;
    const fromCh = s.grid[fromY] && s.grid[fromY][fromX];
    E.petPos = { x: s.px, y: s.py };
    s.px = nx; s.py = ny;   // no stamina — the castle rule
    if (fromCh === '!') E.crumbleBehind(fromX, fromY);
    if (ch === '!') E.crackCreak();
    if (ch === '+') E.platePressFeedback();
    if (mr.hand) E.myRoomLay(fromX, fromY);   // the mason's trail
  };

  // ---------- P2: the pupil's solver ----------
  // BFS over (pupil pos, slab positions, crack-used bits). DETERMINISTIC:
  // fixed expansion order, no Math.random anywhere in here. BOUNDED: past
  // MYROOM_SOLVER_CAP explored states it reports unsolvable — and
  // unsolvable is ALLOWED; the polite-stuck flow is the feature.
  E.MYROOM_SOLVER_CAP = 30000;
  E.myRoomSolve = function (pieces, live) {
    const base = MM.maps.parse(MM.maps.MYROOM, '#');
    const cracks = [];
    let slabs0 = [];
    for (const p of pieces) {
      if (p.t === 'slab') { slabs0.push({ x: p.x, y: p.y }); continue; }
      base[p.y][p.x] = MM.maps.MYROOM_PIECE_CHARS[p.t];
      if (p.t === 'crack') cracks.push(p.x + ',' + p.y);
    }
    if (live && live.slabs) slabs0 = live.slabs.map(sl => ({ x: sl.x, y: sl.y }));
    if (live && live.crumbled) {
      for (const k of live.crumbled) {
        const [cx, cy] = k.split(',').map(Number);
        base[cy][cx] = '#';
      }
    }
    const en = MM.maps.MYROOM_ENTRY, ped = MM.maps.MYROOM_PEDESTAL;
    const at = (x, y) => (base[y] ? base[y][x] : null);
    if (at(en.x, en.y) !== '.' || slabs0.some(sl => sl.x === en.x && sl.y === en.y)) {
      return { solvable: false, steps: [] };   // the arch is bricked over
    }
    const plateAt = new Set();
    for (let y = 0; y < base.length; y++) {
      for (let x = 0; x < base[y].length; x++) if (base[y][x] === '+') plateAt.add(x + ',' + y);
    }
    const isGoal = (x, y) => Math.abs(x - ped.x) + Math.abs(y - ped.y) === 1;
    const keyOf = st => st.x + ',' + st.y + '|' + st.slabs.map(sl => sl.x + ',' + sl.y).join(';') + '|' + st.used.join('');
    const start = { x: en.x, y: en.y, slabs: slabs0, used: cracks.map(() => 0) };
    if (isGoal(start.x, start.y)) return { solvable: true, steps: [] };
    const seen = new Set([keyOf(start)]);
    const q = [{ st: start, path: [] }];
    let explored = 0;
    while (q.length) {
      if (++explored > E.MYROOM_SOLVER_CAP) return { solvable: false, steps: [], capped: true };
      const { st, path } = q.shift();
      const powered = st.slabs.some(sl => plateAt.has(sl.x + ',' + sl.y));
      const onPlate = at(st.x, st.y) === '+';
      const curCrack = cracks.indexOf(st.x + ',' + st.y);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = st.x + dx, ny = st.y + dy;
        const ch = at(nx, ny);
        if (ch == null) continue;
        const si = st.slabs.findIndex(sl => sl.x === nx && sl.y === ny);
        let nst = null;
        if (si >= 0) {
          // a push — sokoban rules, one slab one tile, no chain pushes
          const bx = nx + dx, by = ny + dy;
          const bch = at(bx, by);
          if (!(bch === '.' || bch === '+')) continue;
          if (st.slabs.some((sl, i2) => i2 !== si && sl.x === bx && sl.y === by)) continue;
          if (!(ch === '.' || ch === '+')) continue;   // the vacated tile must hold the pupil
          nst = { x: nx, y: ny, slabs: st.slabs.map((sl, i2) => (i2 === si ? { x: bx, y: by } : sl)), used: st.used };
        } else {
          let ok = ch === '.' || ch === '+';
          if (ch === '!') {
            const ci = cracks.indexOf(nx + ',' + ny);
            ok = ci >= 0 && !st.used[ci];
          }
          // live rule mirrored: gates are checked before the step, so a
          // pupil standing ON a plate may step straight through its gate
          if (ch === '&') ok = powered || onPlate;
          if (!ok) continue;
          nst = { x: nx, y: ny, slabs: st.slabs, used: st.used };
        }
        if (curCrack >= 0 && !st.used[curCrack]) {
          nst.used = st.used.slice();
          nst.used[curCrack] = 1;   // stepping OFF a crack crumbles it
        }
        const k = keyOf(nst);
        if (seen.has(k)) continue;
        const npath = path.concat([[dx, dy]]);
        if (isGoal(nst.x, nst.y)) return { solvable: true, steps: npath };
        seen.add(k);
        q.push({ st: nst, path: npath });
      }
    }
    return { solvable: false, steps: [] };
  };

  // ---------- P2: the pupil's visit (the theater is in the pacing) ----------
  E.myRoomInvite = function () {
    if (E.pupil) return MM.ui.log('🐌 A pupil is already mid-attempt!');
    MM.ui.dialogChoices(MM.data.MYROOM_CORD_TITLE, MM.data.MYROOM_CORD_BODY, [
      { label: '🔔 Pull it', primary: true, onClick: () => E.pupilBegin() },
      { label: 'Not yet', onClick: () => {} },
    ]);
  };
  E.pupilBegin = function () {
    const mr = E.ensureWing().myRoom;
    mr.hand = null;
    E.buildMyRoomGrid();   // the pupil gets the room as DESIGNED (fresh slabs/cracks)
    MM.track('pupilInvite');
    const plan = E.myRoomSolve(mr.pieces);
    const arch = MM.maps.MYROOM_ARCH;
    MM.ui.log(MM.data.MYROOM_PUPIL_ARRIVES);
    const enterStep = [{ dx: 1, dy: 0 }];
    if (plan.solvable) {
      E.pupil = { x: arch.x, y: arch.y, state: 'solving', steps: enterStep.concat(plan.steps.map(([dx, dy]) => ({ dx, dy }))), i: 0, lastStep: 0 };
    } else {
      const t = E.myRoomTryWalk();
      E.pupil = { x: arch.x, y: arch.y, state: 'trying', steps: enterStep.concat(t.out), back: t.back, i: 0, lastStep: 0 };
    }
    MM.ui.refresh();
  };
  // The visible "it really tried" walk for an unsolvable room: plain BFS to
  // the reachable tile nearest the pedestal (deterministic, no pushes, no
  // cracks — a failed attempt must not damage the room), then back.
  E.myRoomTryWalk = function () {
    const s = E.state;
    const en = MM.maps.MYROOM_ENTRY, ped = MM.maps.MYROOM_PEDESTAL;
    const powered = E.platePowered('myroom');
    const pass = ch => ch === '.' || ch === '+' || (ch === '&' && powered);
    const W = s.grid[0].length;
    const keyOf = (x, y) => y * W + x;
    const prev = new Map([[keyOf(en.x, en.y), -1]]);
    const q = [[en.x, en.y]];
    let best = { x: en.x, y: en.y, d: Math.abs(en.x - ped.x) + Math.abs(en.y - ped.y) };
    while (q.length) {
      const [x, y] = q.shift();
      const d = Math.abs(x - ped.x) + Math.abs(y - ped.y);
      if (d < best.d) best = { x, y, d };
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k = keyOf(nx, ny);
        const ch = s.grid[ny] && s.grid[ny][nx];
        if (ch == null || prev.has(k) || !pass(ch)) continue;
        prev.set(k, keyOf(x, y));
        q.push([nx, ny]);
      }
    }
    const cells = [];
    for (let k = keyOf(best.x, best.y); k !== -1; k = prev.get(k)) cells.unshift({ x: k % W, y: (k / W) | 0 });
    const out = [];
    for (let i = 1; i < cells.length; i++) out.push({ dx: cells[i].x - cells[i - 1].x, dy: cells[i].y - cells[i - 1].y });
    const back = out.slice().reverse().map(st => ({ dx: -st.dx, dy: -st.dy }));
    back.push({ dx: -1, dy: 0 });   // the last step back under the arch
    return { out, back };
  };
  E.PUPIL_STEP_MS = 250;
  E.pupilPulse = function (now) {
    const p = E.pupil;
    if (!p) return;
    if (MM.ui.modalOpen() || MM.battle.active()) return;
    if (now - p.lastStep < E.PUPIL_STEP_MS) return;
    p.lastStep = now;
    E.pupilTick();
  };
  E.pupilTick = function () {
    const s = E.state;
    const p = E.pupil;
    if (!p) return;
    if (!s || s.mapId !== 'myroom') { E.pupil = null; return; }
    if (p.state === 'joy') {
      if (Date.now() > p.joyUntil) { E.pupil = null; MM.ui.refresh(); }
      return;
    }
    if (p.state === 'stuck') return;   // holding for the modal
    const steps = p.state === 'returning' ? p.back : p.steps;
    if (p.i >= steps.length) {
      if (p.state === 'solving') return E.pupilSolved();
      if (p.state === 'trying') { p.state = 'returning'; p.i = 0; p.thoughtUntil = Date.now() + 1400; return; }
      return E.pupilStuck();
    }
    const { dx, dy } = steps[p.i];
    const nx = p.x + dx, ny = p.y + dy;
    const list = E._myRoomSlabs || [];
    const slab = list.find(sl => sl.x === nx && sl.y === ny);
    if (slab) {
      if (p.state !== 'solving') return E.pupilAbort();
      const bx = nx + dx, by = ny + dy;
      const destCh = s.grid[by] && s.grid[by][bx];
      if (!(destCh === '.' || destCh === '+') || list.some(o => o !== slab && o.x === bx && o.y === by)) {
        return E.pupilAbort();
      }
      s.grid[ny][nx] = slab.under || '.';
      slab.x = bx; slab.y = by; slab.under = destCh;
      s.grid[by][bx] = 'U';
      MM.sound.thud();
    }
    const ch = s.grid[ny] && s.grid[ny][nx];
    const powered = E.platePowered('myroom') || (s.grid[p.y] && s.grid[p.y][p.x] === '+');
    const okTile = ch === '.' || ch === '+' || ch === 'X' || ch === '!' || (ch === '&' && powered);
    if (!okTile) return E.pupilAbort();
    const fromX = p.x, fromY = p.y;
    p.x = nx; p.y = ny;
    p.i++;
    if (s.grid[fromY] && s.grid[fromY][fromX] === '!') {   // real movement, real physics
      s.grid[fromY][fromX] = 'v';
      MM.sound.creak();
    }
    // theater: one thoughtful pause beside a placed chest — is THAT the
    // answer? (no. onward.) — pacing only, the path is the solver's own
    if (!p.pausedAtChest && p.state === 'solving') {
      const chestNear = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => {
        const c = s.grid[ny + ay] && s.grid[ny + ay][nx + ax];
        return c === '*';
      });
      if (chestNear) { p.pausedAtChest = true; p.lastStep += 600; }
    }
    if (p.state === 'solving' && p.i >= p.steps.length) return E.pupilSolved();
    if (p.state === 'trying' && p.i >= p.steps.length) { p.state = 'returning'; p.i = 0; p.thoughtUntil = Date.now() + 1400; }
    else if (p.state === 'returning' && p.i >= p.back.length) return E.pupilStuck();
  };
  // Something changed under the pupil mid-plan — no failure state: it heads
  // back to the arch and asks for a hint, exactly like an unsolvable room.
  E.pupilAbort = function () {
    const s = E.state;
    const p = E.pupil;
    if (!p) return;
    const arch = MM.maps.MYROOM_ARCH;
    const powered = E.platePowered('myroom');
    const pass = ch => ch === '.' || ch === '+' || ch === 'X' || (ch === '&' && powered);
    const W = s.grid[0].length;
    const keyOf = (x, y) => y * W + x;
    const prev = new Map([[keyOf(p.x, p.y), -1]]);
    const q = [[p.x, p.y]];
    let found = false;
    while (q.length && !found) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k = keyOf(nx, ny);
        const ch = s.grid[ny] && s.grid[ny][nx];
        if (ch == null || prev.has(k) || !pass(ch)) continue;
        prev.set(k, keyOf(x, y));
        if (nx === arch.x && ny === arch.y) { found = true; break; }
        q.push([nx, ny]);
      }
    }
    if (!found) { E.pupil = null; MM.ui.refresh(); return; }
    const cells = [];
    for (let k = keyOf(arch.x, arch.y); k !== -1; k = prev.get(k)) cells.unshift({ x: k % W, y: (k / W) | 0 });
    const back = [];
    for (let i = 1; i < cells.length; i++) back.push({ dx: cells[i].x - cells[i - 1].x, dy: cells[i].y - cells[i - 1].y });
    p.state = 'returning';
    p.back = back;
    p.i = 0;
    p.thoughtUntil = Date.now() + 1400;
  };
  E.pupilSolved = function () {
    const s = E.state;
    const mr = E.ensureWing().myRoom;
    const p = E.pupil;
    p.state = 'joy';
    p.joyUntil = Date.now() + 2400;
    mr.solveCount = (mr.solveCount || 0) + 1;
    MM.sound.fanfare();
    const ped = MM.maps.MYROOM_PEDESTAL;
    if (MM.ui.worldBurst && !s.calmMode) {
      MM.ui.worldBurst(ped.x, ped.y, '#ffd94a', 16);
      MM.ui.worldBurst(p.x, p.y, '#7ee0e8', 12);
    }
    if (!mr.seenFirstSolve) {
      // once-ever: the celebration, then Miscount drops by — he of all
      // people knows what it means to build a room that tests fairly
      mr.seenFirstSolve = true;
      E.save();
      MM.ui.dialog(MM.data.MYROOM_FIRST_SOLVE.title, MM.data.MYROOM_FIRST_SOLVE.body, () => {
        const cameo = MM.data.MYROOM_MISCOUNT_CAMEO(s.name);
        MM.ui.dialog(cameo.title, cameo.body);
      });
    } else {
      MM.ui.log(MM.data.MYROOM_SOLVE_AGAIN);
      E.save();
    }
    MM.ui.refresh();
  };
  E.pupilStuck = function () {
    const p = E.pupil;
    if (!p) return;
    p.state = 'stuck';
    p.thoughtUntil = Date.now() + 3000;   // 💭, in the field
    MM.sound.sigh();
    MM.ui.dialog(MM.data.MYROOM_PUPIL_STUCK.title, MM.data.MYROOM_PUPIL_STUCK.body,
      () => { E.pupil = null; MM.ui.refresh(); });
    MM.ui.refresh();
  };

  // ---------- P3: the homesick staircase ----------
  // State machine in s.spiral.staircase: 'lost' | 'following' |
  // { waiting: {x,y} } | 'home'. Transient position rides E.stairPos.
  E.stairStep = function (fromX, fromY) {
    const s = E.state;
    if (!s || !s.spiral || s.spiral.staircase !== 'following') return;
    E._stairTrail.push({ x: fromX, y: fromY });
    if (E._stairTrail.length > 3) E._stairTrail.shift();
    const t = E._stairTrail;
    E.stairPos = t.length >= 2 ? { x: t[t.length - 2].x, y: t[t.length - 2].y } : { x: t[0].x, y: t[0].y };
  };
  E.stairBumpAt = function (nx, ny) {
    const s = E.state;
    const st = s && s.spiral && s.spiral.staircase;
    if (!st || st === 'home') return false;
    const startFollowing = (x, y) => {
      s.spiral.staircase = 'following';
      E.stairPos = { x, y };
      E._stairTrail = [];
      E._stairPop = { until: Date.now() + 1600 };   // 🏠, in the field
      MM.sound.chirp();
      MM.ui.log(MM.data.STAIRCASE_FOLLOW_LINE);
      E.save();
      MM.ui.refresh();
    };
    if (st === 'lost') {
      const spot = MM.maps.STAIRCASE_SPOT;
      if (s.mapId !== 'd11' || !s.endingDone || nx !== spot.x || ny !== spot.y) return false;
      startFollowing(nx, ny);
      // monsters ignore it — code-level indifference is the joke; one log
      // echo for parents, once per session, with a real monster's name
      if (!E._stairEchoDone) {
        const mon = (s.monsters || []).find(m => m.hp > 0);
        if (mon) {
          E._stairEchoDone = true;
          MM.ui.log(MM.data.STAIRCASE_MONSTER_ECHO(MM.data.theMon(mon.name, true)));
        }
      }
      return true;
    }
    if (st.waiting && s.mapId === 'world' && nx === st.waiting.x && ny === st.waiting.y) {
      startFollowing(nx, ny);
      return true;
    }
    return false;
  };
  // A following staircase waits at the door of wherever you go without it.
  E.stairParkHere = function (line) {
    const s = E.state;
    if (!s || !s.spiral || s.spiral.staircase !== 'following') return;
    s.spiral.staircase = { waiting: { x: s.px, y: s.py } };
    E.stairPos = null;
    MM.ui.log(line || MM.data.STAIRCASE_WAIT_LINE);
  };
  // Where to DRAW it right now (null = nowhere on this map).
  E.staircaseDrawPos = function () {
    const s = E.state;
    const st = s && s.spiral && s.spiral.staircase;
    if (!st || st === 'home') return null;
    if (st === 'lost') return (s.mapId === 'd11' && s.endingDone) ? MM.maps.STAIRCASE_SPOT : null;
    if (st === 'following') {
      const p = E.stairPos;
      if (!p || (p.x === s.px && p.y === s.py)) return null;
      return p;
    }
    if (st.waiting) return s.mapId === 'world' ? st.waiting : null;
    return null;
  };
  // Delivery: escort it to the Spiral Stair tower and bump the tower.
  E.stairHomecoming = function () {
    const s = E.state;
    s.spiral.staircase = 'home';
    E.stairPos = null;
    MM.sound.fanfare();
    if (MM.ui.worldBurst && !s.calmMode) MM.ui.worldBurst(s.px, s.py, '#ffd94a', 18);
    E.save();
    MM.ui.dialog(MM.data.STAIRCASE_HOMECOMING.title, MM.data.STAIRCASE_HOMECOMING.body,
      () => E.spiralMenu());
  };

  // One-way drop chute: the floor gives way and you land at the SAME spot one
  // floor down. There's no climbing back up the hole — find the stairs.
  E.dropChute = function (x, y) {
    const s = E.state;
    E.enterDungeon(s.dungeonIndex, s.floorIndex + 1);
    s.px = x; s.py = y;
    E.petPos = { x, y };
    MM.sound.thud();
    MM.ui.log('🕳 The floor gives way — <b>you drop down a chute!</b> No climbing back up that hole...');
    E.save();
    MM.ui.refresh();
  };

  // What happens when you STAND on a special tile (also applied when a slide
  // lands you on one): key pickup, tide pools, urchins, slick rock, pads.
  E.tileEffects = function (ch, dx, dy) {
    const s = E.state;
    if (ch === 's') { // singing stone: pure flavor, no stamina/state change
      MM.sound.tone((s.px + s.py) % 5);
      return;
    }
    if (ch === 'k') {
      s.grid[s.py][s.px] = '.';
      s.opened[`${s.mapId}:${s.px},${s.py}`] = true;
      const base = 'd' + s.dungeonIndex;
      s.isles.keys[base] = (s.isles.keys[base] || 0) + 1;
      MM.sound.coin();
      MM.ui.log('🗝 You found a <b>key</b>! Somewhere in this place is a lock that wants it.');
      E.save();
      return;
    }
    if (ch === ',') {
      E.spendStamina(2);
      if (!toldPools) { toldPools = true; MM.ui.log('💧 Wading through tide pools is tiring — routes around them are free.'); }
      return;
    }
    if (ch === '^') {
      s.hp = Math.max(1, s.hp - 2);
      MM.sound.thud();
      MM.ui.log('🦔 Ouch — urchin spines! <b>-2 HP.</b>');
      MM.ui.refresh();
      return;
    }
    if (ch === 'o') {
      const twin = MM.maps.find(s.grid, 'o').find(p => !(p.x === s.px && p.y === s.py));
      if (twin) {
        s.px = twin.x; s.py = twin.y;
        MM.sound.dodge();
        MM.ui.log('🌀 The tide pad whisks you across the cave!');
      }
      return;
    }
    if (ch === '_') {
      // slick rock: you skid in the same direction until something stops you,
      // then whatever you land on happens
      let guard = 0;
      while (s.grid[s.py] && s.grid[s.py][s.px] === '_' && guard++ < 40) {
        const nx = s.px + dx, ny = s.py + dy;
        const t = s.grid[ny] && s.grid[ny][nx];
        if (t == null || '#DKG%*'.includes(t)) break;
        if (s.monsters.some(m => m.hp > 0 && m.x === nx && m.y === ny)) break;
        s.px = nx; s.py = ny;
        if (t !== '_') {
          if (t === 'X') return E.exitDungeon();
          if (t === '>') return E.changeFloor(1);
          if (t === '<') return E.changeFloor(-1);
          E.tileEffects(t, dx, dy);
          break;
        }
      }
      MM.ui.log('🧊 Whoa — you skid across the slick rock!');
    }
  };
  let toldPools = false; // one wading tip per session, not per step

  // walking costs 1 stamina every 2 steps (Boots of Wandering: none)
  E.walkStamina = function () {
    const s = E.state;
    // 1.5d: the Hearthmoss Charm heals slowly as you walk — silent, no log
    // spam. Counted independently of Boots of Wandering's stamina skip, so
    // wearing both still heals.
    if (E.hasCharm('hearthmoss') && s.hp < s.maxhp) {
      s.hearthmossSteps = (s.hearthmossSteps || 0) + 1;
      if (s.hearthmossSteps >= 8) {
        s.hearthmossSteps = 0;
        s.hp = Math.min(s.maxhp, s.hp + 1);
      }
    }
    // Wave 10 (P4a, rare-surprise pool): a golden bird, once ever, on the
    // mainland road — only once there's an actual fence post for it to land
    // on (s.tasksDone.includes(6), same live check the fence tiles read).
    // Never a reward you can chase: no notification if it never fires, no
    // second chance once it has.
    if (s.mapId === 'world' && !s.seenGoldenBird && s.tasksDone.includes(6) && Math.random() < E.GOLDEN_BIRD_CHANCE) {
      s.seenGoldenBird = true;
      s.items.treasures.push('feather');
      MM.ui.log('🐦 <i>A golden bird lands on a fence post, watches you pass, and is gone before you can look twice.</i><br>It left one feather. <b>Proof It Happened.</b>');
      E.save();
    }
    // v1.7.0: the Turning Stones' sequence walk + newest-segment glint —
    // both are per-mainland-step checks, same locality as the golden bird.
    if (s.mapId === 'world') {
      const stone = MM.data.TURNING_STONES.find(st => st.x === s.px && st.y === s.py);
      if (stone) E.spiralStoneStep(stone.i);
      E.checkSpiralGlint();
    }
    if (E.hasCharm('boots')) return;
    s.stepParity = !s.stepParity;
    if (s.stepParity) E.spendStamina(1);
  };

  // Monster jobs (Level 2 behaviors; everything before dungeon 14 chases):
  //   chase  — pursue within 7 tiles and attack when adjacent (the classic)
  //   guard  — never moves; fights only when the player comes to IT
  //   wander — drifts at random; only attacks if the player is right there
  //   thief  — hunts your purse: steals gold when adjacent, then FLEES.
  //            Catch it to win the gold back with interest. Broke? It bites.
  //   (Wave 3) a thief with shouts:true wakes every OTHER monster on the
  //   floor into a few turns of forced chase — m.alerted counts it down.
  // Wave 8a (P8, delight catalog): "a wanderer rarely bumps a wall and
  // shows a reaction (≤1 per few minutes)" — a log line stands in for a
  // world-canvas floater (this engine has no floating-text system outside
  // the battle screen); throttled module-wide so it can never spam.
  let lastBumpFlavorAt = 0;
  E.monsterTurn = function () {
    const s = E.state;
    let attacker = null;
    for (const m of s.monsters) {
      if (m.hp <= 0) continue;
      if (m.stun > 0) { m.stun--; continue; }
      // Wave 8b: a befriended wanderer/chaser drifts, but never initiates. It
      // does not chase, does not attack, and cannot be woken by a thief's shout
      // (that's the whole promise — a friend stays a friend even when the room
      // goes loud). Bump it and you can still spar, by choice.
      // Per-creature taming (2026-07-13): a becalmed monster — the one the
      // kid personally soothed — SITS right where it was calmed, can't be
      // woken by a thief's shout, and never acts. Wild species-mates take
      // their normal turns below, because they are still wild.
      if (m.becalmed) { m.alerted = 0; continue; }
      const forcedChase = (m.alerted || 0) > 0;
      if (forcedChase) m.alerted--;
      const beh = forcedChase ? 'chase' : (m.behavior || 'chase');
      const dist = Math.abs(m.x - s.px) + Math.abs(m.y - s.py);

      if (beh === 'guard') {
        if (dist === 1) attacker = attacker || m;
        continue;
      }
      if (beh === 'thief' && m.stolen == null && dist === 1 && s.gold > 0) {
        const amt = Math.min(s.gold, 3 + Math.floor(Math.random() * 4));
        s.gold -= amt;
        m.stolen = amt;
        MM.sound.thud();
        MM.ui.log(`🪶 ${MM.data.theMon(m.name, true)} snatches <b>${amt} gold</b> and bolts — catch it!`);
        if (m.shouts) {
          for (const o of s.monsters) if (o !== m && o.hp > 0) o.alerted = 6;
          MM.ui.log(`📣 The shout echoes through the tower — everything nearby perks up!`);
        }
        MM.ui.refresh();
        // falls through: it starts fleeing this very turn
      }

      const fleeing = beh === 'thief' && m.stolen != null;
      const opts = [];
      if (beh === 'wander') {
        if (Math.random() < 0.5) { if (dist === 1) attacker = attacker || m; continue; }
        opts.push(...[[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5));
      } else if (fleeing) {
        if (m.x < s.px) opts.push([-1, 0]);
        if (m.x > s.px) opts.push([1, 0]);
        if (m.y < s.py) opts.push([0, -1]);
        if (m.y > s.py) opts.push([0, 1]);
        opts.sort(() => Math.random() - 0.5);
      } else { // chase — and thieves still hunting a purse
        if (dist === 1) { attacker = attacker || m; continue; }
        if (dist > 7) continue;
        if (m.x < s.px) opts.push([1, 0]);
        if (m.x > s.px) opts.push([-1, 0]);
        if (m.y < s.py) opts.push([0, 1]);
        if (m.y > s.py) opts.push([0, -1]);
      }
      const startX = m.x, startY = m.y;
      for (const [dx, dy] of opts) {
        const nx = m.x + dx, ny = m.y + dy;
        const ch = s.grid[ny] && s.grid[ny][nx];
        if (ch !== '.') continue;
        if (nx === s.px && ny === s.py) continue;
        if (s.monsters.some(o => o !== m && o.hp > 0 && o.x === nx && o.y === ny)) continue;
        m.x = nx; m.y = ny;
        break;
      }
      if (beh === 'wander' && opts.length && m.x === startX && m.y === startY
          && !s.calmMode && Date.now() - lastBumpFlavorAt > 180000) {
        lastBumpFlavorAt = Date.now();
        MM.ui.log(`❓ ${MM.data.theMon(m.name, true)} bumps into the wall and looks briefly baffled.`);
      }
      if (fleeing) continue; // a laden thief never attacks
      if (Math.abs(m.x - s.px) + Math.abs(m.y - s.py) === 1) attacker = attacker || m;
    }
    if (attacker) {
      MM.ui.log(`The ${attacker.name} attacks!`);
      E.startCombat(attacker);
    }
  };

  // ---------- battle wiring ----------
  // Your strike power (the number damage rolls are based on).
  E.strikePower = function () {
    const s = E.state;
    const w = E.equippedItem('weapon') || MM.data.WEAPONS[0];
    let bonus = 0;
    if (s.streak >= 6) bonus = 4;
    else if (s.streak >= 3) bonus = 2;
    if (E.hasCharm('quill')) bonus *= 2;
    if (E.hasRing('power')) bonus += 2;
    if (E.hasEnchant('echo') && bonus > 0) bonus += 1; // Echo gem: +1 to an active streak bonus
    let power = 2 + w.atk + bonus;
    if (E.hasEnchant('flame')) power += 2;
    if (s.stamina <= 0) power = Math.max(1, Math.floor(power / 2)); // exhausted
    return power;
  };

  // Damage is ROLLED, not flat: your strike lands for 80-120% of your power.
  E.strikeRange = function () {
    const p = E.strikePower();
    return { min: Math.max(1, Math.round(p * 0.8)), max: Math.round(p * 1.2) };
  };
  E.rollStrike = function () {
    const p = E.strikePower();
    return Math.max(1, Math.round(p * (0.8 + Math.random() * 0.4)));
  };
  // Monsters roll 75-110% of their attack, then your block subtracts —
  // frostReduction is the Frost gem's one-shot -2 on the next counterattack.
  E.rollMonsterHit = function (atk, frostReduction) {
    const roll = Math.round(atk * (0.75 + Math.random() * 0.35));
    return Math.max(1, roll - E.totalDef() - (frostReduction || 0));
  };

  // ---------- the Smuggler's Crossbow: the one ranged-weapon rule ----------
  // No ammo, no aiming — striking from afar just means the monster's FIRST
  // counterattack of the battle automatically misses (battle.js applies it).
  E.isRangedEquipped = function () {
    const w = E.equippedItem('weapon');
    return !!(w && w.ranged);
  };
  E.rangedNote = function () {
    return E.isRangedEquipped() ? ' · 🏹 opening shot always lands out of reach' : '';
  };

  // meta (Wave 8a, P6 growth tracking): optional {text, kidAnswer} — the
  // problem's text and the kid's verbatim submitted answer. Only ever used
  // to grow s.recentMisses; every existing call site that doesn't pass it
  // keeps working exactly as before.
  // Struggle pass (2026-07-12): the adaptive tier already drops QUIETLY on a
  // rough patch — but silence reads as indifference to an anxious kid. When
  // the last 4 answers in a topic were all misses, the next miss's feedback
  // says one kind, true thing (once per session per topic, never a modal).
  E.roughPatch = null; // battle.js reads-and-clears this on a miss
  const roughPatchNoted = {};
  function noteRoughPatch(s, skill) {
    const m = s.mastery && s.mastery[skill];
    if (!m || !m.recent || m.recent.length < 4) return;
    if (m.recent.slice(-4).some(Boolean)) return;
    if (roughPatchNoted[skill]) return;
    roughPatchNoted[skill] = true;
    E.roughPatch = skill;
  }
  function recordAnswer(skill, correct, meta) {
    const s = E.state;
    MM.mastery.record(s, skill, correct);
    s.totals.answered++;
    // v1.7.2 hardening (streak-bounty stuck at 0 despite right answers): a
    // save whose streak ever went non-numeric would poison EVERY comparison
    // downstream (NaN >= 4 is false forever, silently — no crash, no log,
    // just crits/streak-bonuses/bounties all dead). Heal it at the one
    // place the value changes, so no save can stay stuck.
    if (!Number.isFinite(s.streak)) s.streak = 0;
    if (correct) { s.totals.correct++; s.streak++; }
    else { s.streak = E.hasRing('focus') ? Math.floor(s.streak / 2) : 0; noteRoughPatch(s, skill); }
    checkBadge(skill);
    if (correct) E.bountyEvent('correct');
    const pet = s.isles && s.isles.pet;
    if (pet && correct) { pet.correct++; E.checkPetStage(); }
    // Wave 8a (P5, rust): the last real day this topic was practiced, so
    // weakestFirst can nudge stale topics back into rotation.
    s.lastPracticed = s.lastPracticed || {};
    s.lastPracticed[skill] = E.todayStr();
    // Wave 8a (P6, growth tracking): a 30-day daily ledger per topic (for
    // the report card's "this week vs. before" line) and the last 10 misses
    // verbatim (for the parent panel — a parent diagnoses a regrouping
    // error from three real examples faster than from any percentage).
    const today = E.todayStr();
    s.history = s.history || {};
    s.history[today] = s.history[today] || {};
    const h = s.history[today][skill] || { a: 0, c: 0 };
    h.a++; if (correct) h.c++;
    s.history[today][skill] = h;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    for (const d of Object.keys(s.history)) if (d < cutoff) delete s.history[d];
    if (!correct && meta && meta.kidAnswer != null) {
      s.recentMisses = s.recentMisses || {};
      const list = s.recentMisses[skill] = s.recentMisses[skill] || [];
      list.push({ text: meta.text || '', kidAnswer: String(meta.kidAnswer).slice(0, 40) });
      if (list.length > 10) list.shift();
    }
  }
  E.recordAnswer = recordAnswer;

  // ---------- the notice board (bounties) ----------
  // Three small jobs, refreshed each real day — or the moment all are done, so
  // an eager kid never finds an empty board. Targets are picked weakest-topic-
  // first: the board quietly steers practice where it helps, while reading as
  // errands rather than homework. Rewards pay out the instant a job finishes.

  // Wave 8-preview (user playtest, 2026-07-11): a dungeon whose monsters
  // were all defeated today can't progress a hunt job until tomorrow
  // (defeatedAt, 1.5c) — the generator must avoid such targets, and the
  // board UI says so on any older job that still points at one.
  E.dungeonClearedToday = function (d) {
    const s = E.state;
    const today = E.todayStr();
    const floors = MM.maps.dungeonFloors(d);
    const grid = MM.maps.parse(floors[0], '#');
    const markers = ['m', 'g', 't'].flatMap(ch => MM.maps.find(grid, ch));
    const id = floors.length > 1 ? `d${d}f0` : `d${d}`;
    return markers.length > 0 && markers.every(p => s.defeatedAt[`${id}:${p.x},${p.y}`] === today);
  };

  E.refreshBounties = function () {
    const s = E.state;
    if (!s.taskIndex) { s.bounties = null; return; } // no jobs before the MathMaker
    const today = E.todayStr();
    if (s.bounties && s.bounties.date === today && !s.bounties.items.every(it => it.done)) return;
    const maxD = Math.max(1, Math.min(10, s.taskIndex));
    const ranked = MM.mastery.weakestFirst(s, MM.data.TASKS.filter(t => !t.exp).map(t => t.skill));
    const dgOf = sk => MM.data.TASKS.findIndex(t => t.skill === sk) + 1;
    const unlocked = ranked.map(dgOf).filter(d => d <= maxD);
    const huntable = unlocked.filter(d => !E.dungeonClearedToday(d));
    const d1 = huntable[0] || unlocked[0] || 1;
    const d2 = unlocked.find(d => d !== d1) || d1;
    const dgName = d => MM.data.TASKS[d - 1].dungeon;
    const huntNeed = Math.min(5, 2 + Math.ceil(d1 / 3));
    // Wave 8a (P5, rust): if a job's target topic has gone stale, the board
    // says so — the spacing model made visible, framed as the world (not
    // the kid) needing tending.
    const rustLine = d => {
      const sk = MM.data.TASKS[d - 1].skill;
      return MM.mastery.isRusty(s, sk) ? MM.data.RUST_LINES[sk] : null;
    };
    const items = [
      { type: 'hunt', dungeon: d1, need: huntNeed, have: 0, done: false, reward: 15 + 8 * d1,
        label: `Defeat ${huntNeed} monsters in the ${dgName(d1)}`, flavor: rustLine(d1) },
      { type: 'solve', dungeon: d2, need: 4, have: 0, done: false, reward: 12 + 6 * d2,
        label: `Answer 4 problems correctly inside the ${dgName(d2)}`, flavor: rustLine(d2) },
    ];
    if (s.metMiscount) {
      items.push({ type: 'spar', need: 1, have: 0, done: false, reward: 30,
        label: 'Win a sparring match against a Homework Golem' });
    } else {
      const n = Math.min(6, 3 + Math.floor(maxD / 3));
      items.push({ type: 'streak', need: n, have: 0, done: false, reward: 20,
        label: `Get ${n} answers right in a row (anywhere)` });
    }
    s.bounties = { date: today, items };
    E.save();
  };

  // Wave 5 item 2: a SEPARATE isle board at Port Brightwater (its own 'n'
  // tile already existed, sharing noticeBoard/refreshBounties before this —
  // now it shows its own job set, tracked independently in s.isleBounties so
  // visiting one board never disturbs progress on the other). Isle-flavored
  // job types: gemchest (open any glimmering chest), thief (catch 2 thieves
  // — thief-behavior monsters only exist in isle rosters), and, once the
  // Great Lamp is lit, a Spire-specific problem count.
  E.refreshIsleBounties = function () {
    const s = E.state;
    if (!s.taskIndex) { s.isleBounties = null; return; }
    const today = E.todayStr();
    if (s.isleBounties && s.isleBounties.date === today && !s.isleBounties.items.every(it => it.done)) return;
    const items = [
      { type: 'gemchest', need: 1, have: 0, done: false, reward: 40,
        label: 'Open a glimmering chest' },
      { type: 'thief', need: 2, have: 0, done: false, reward: 35,
        label: 'Catch 2 thieves' },
    ];
    if (s.isles.lampLit) {
      items.push({ type: 'spire', need: 6, have: 0, done: false, reward: 45,
        label: 'Answer 6 problems correctly inside the Clockwork Spire' });
    } else {
      items.push({ type: 'hunt', dungeon: 14, need: 3, have: 0, done: false, reward: 30,
        label: 'Defeat 3 monsters in the Tidepool Grotto' });
    }
    s.isleBounties = { date: today, items };
    E.save();
  };

  // ---------- Wave 9 (P1): Daily Tangles — the renewable heartbeat ----------
  // Post-game only. Mirrors refreshBounties exactly: date-keyed, regenerates
  // on a real-day flip. Placement is DERIVED from the overworld's own
  // walkability (every plain '.' grass tile), never a hand-picked list, so
  // it can never land on a building, water, or a story tile.
  E.refreshTangles = function () {
    const s = E.state;
    if (!s.endingDone) { s.tangles = null; return; }
    const today = E.todayStr();
    if (s.tangles && s.tangles.date === today) return;
    const grid = MM.maps.parse(MM.maps.OVERWORLD, '~');
    const spots = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === '.') spots.push({ x, y });
      }
    }
    const n = 1 + Math.floor(Math.random() * 3); // 1-3 a day
    const items = [];
    for (let i = 0; i < n && spots.length; i++) {
      const pick = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      items.push({ x: pick.x, y: pick.y, done: false });
    }
    s.tangles = { date: today, items };
    E.save();
  };

  // The notice board's self-narration ("A tangle was spotted near the Old
  // Mine") — the nearest dungeon entrance by Manhattan distance, derived
  // from the map itself rather than a hand-authored landmark list.
  E.nearestLandmark = function (x, y) {
    const grid = MM.maps.parse(MM.maps.OVERWORLD, '~');
    let best = null, bestD = Infinity;
    MM.data.TASKS.forEach((t, i) => {
      if (t.exp) return; // only the ten mainland entrances are on this map
      const ch = i === 9 ? '0' : String(i + 1);
      const p = MM.maps.find(grid, ch)[0];
      if (!p) return;
      const d = Math.abs(p.x - x) + Math.abs(p.y - y);
      if (d < bestD) { bestD = d; best = t.dungeon; }
    });
    return best || 'the castle';
  };

  // ---------- Wave 14: "The Court" (post-ending, renewable) ----------
  // The throne room opens for audiences. Combat-free (it's the castle), no
  // timers, gentle failure. A day-keyed queue of three CASES, each a
  // petitioner + an absurd complaint wrapping ONE applied problem that
  // RECORDS under its real skill. The Faculty thread (below) is the connective
  // system the later castle waves reuse.
  const COURT_SKILLS = ['fractions_as', 'multidigit_mult', 'decimals_md', 'word_problems'];

  // Applied problems read wordy already — keep the tier accessible (adaptive,
  // capped) so a case is a puzzle to settle, not a gauntlet.
  E.courtCaseTier = function (skill) {
    return Math.max(1, Math.min(3, MM.mastery.tierFor(E.state, skill)));
  };

  // Day-keyed like s.tangles / refreshBounties (E.todayStr, a {date, cases}
  // object, migrated in load()). ONE deliberate difference from
  // refreshBounties: the court does NOT eager-refill the same day once all
  // three are heard — a full 3/3 is the day's session, so the queue stays
  // stable until the DATE turns (the "re-rolls on date turn, not before"
  // contract). Heard or partial, same day = the same three cases.
  E.refreshCourt = function () {
    const s = E.state;
    if (!s.endingDone) { s.court = null; return; }
    const today = E.todayStr();
    if (s.court && s.court.date === today) return;
    // Weakest-first across the four applied strands (respecting parent
    // switches) so the court auto-targets the rustiest topic — the same way
    // the notice board steers practice. Fall back to all four if a parent
    // switched every one off (the court's applied review is the whole point).
    const allowed = MM.mastery.cappedSkills(s);
    let pool = COURT_SKILLS.filter(sk => allowed.includes(sk));
    if (!pool.length) pool = COURT_SKILLS.slice();
    const ranked = MM.mastery.weakestFirst(s, pool);
    const pick = i => ranked[i % ranked.length];
    // The recurring Magistrate always takes case 0 with the WEAKEST skill (the
    // running gag carries the rustiest topic); the other two petitioners take
    // the next-weakest skills from the authored pools.
    s.magistrateVisits = (s.magistrateVisits || 0) + 1;
    const sk0 = pick(0), sk1 = pick(1), sk2 = pick(2);
    s.court = {
      date: today, celebrated: false,
      cases: [
        MM.problems.courtCase(sk0, E.courtCaseTier(sk0), { magistrate: s.magistrateVisits - 1 }),
        MM.problems.courtCase(sk1, E.courtCaseTier(sk1)),
        MM.problems.courtCase(sk2, E.courtCaseTier(sk2)),
      ],
    };
    E.save();
  };

  // Bump the Herald (talkNpc → court flag). Pre-ending: a gentle "not yet".
  // Otherwise: the day's docket, or the session celebration / quiet hall.
  E.holdCourt = function () {
    const s = E.state;
    MM.track('holdCourt');
    const H = MM.data.COURT.herald;
    if (!s.endingDone) return MM.ui.dialog(H.name, H.notYet);
    E.refreshCourt();
    const court = s.court;
    const unheard = court.cases.filter(c => !c.heard);
    if (!unheard.length) {
      if (!court.celebrated) return E.courtSessionCelebration();
      return MM.ui.dialog(H.name, H.quiet);
    }
    const heard = court.cases.length - unheard.length;
    const buttons = unheard.map(c => ({
      label: `${c.petitioner} — hear the case`,
      onClick: () => E.hearCase(c),
    }));
    buttons.push({ label: 'Not just now', onClick: () => {} });
    const intro = `${H.open}<br><br><span class="dim">Cases heard today: ${heard} / ${court.cases.length}.</span>`;
    MM.ui.dialogChoices(H.name, intro, buttons);
  };

  // Present one case. A correct ruling SETTLES it (records + a gratitude gift);
  // a wrong ruling leaves the court baffled and RE-ASKS the same dispute
  // (no penalty, no scold, no loss — onNext re-presents this very case).
  E.hearCase = function (c) {
    const s = E.state;
    const p = c.problem;
    MM.ui.showProblem({
      header: `⚖️ ${c.petitioner}<br><span class="dim">${c.complaint}</span>`,
      problem: p,
      leaveLabel: 'Adjourn for now',
      onAnswer(correct, kidAnswer) {
        recordAnswer(p.skill, correct, { text: p.text, kidAnswer });
        if (!correct) {
          // gentle failure: no `end`, so the button reads "Next ➜" and
          // onNext re-asks the SAME case. The worked solution shows above.
          return { msg: MM.data.pick(MM.data.COURT.baffled) };
        }
        c.heard = true;
        s.casesHeard = (s.casesHeard || 0) + 1;
        const gift = E.courtGratitudeGift();
        E.save();
        MM.sound.coin();
        let msg = `<b>Settled.</b> ${c.settle}`;
        if (gift.parts.length) msg += `<br><br>🎁 ${MM.data.COURT.giftLine}: ${gift.parts.join(', ')}.`;
        return { msg, end: 'win' };
      },
      onNext: () => E.hearCase(c),   // the baffled re-ask
      onEnd(how) {
        if (how === 'win') return E.holdCourt();   // back to the docket / celebration
        MM.ui.refresh();
      },
    });
  };

  // Small, teacher-flavored thanks — never gold-grind, never a power reward.
  // OCCASIONALLY (and at most once ever) a tiny hat via the cosmetic path.
  E.courtGratitudeGift = function () {
    const s = E.state;
    let reward;
    if (!s.petHats.includes('courtier') && Math.random() < 0.18) reward = { hat: 'courtier' };
    else reward = Math.random() < 0.5 ? { food: 1 } : { potions: 1 };
    const g = E.yardGrantReward(reward);
    if (g.gotHat) MM.sound.fanfare();
    return g;
  };

  // A full 3/3 session: worldBurst + fanfare + one authored line (the "when
  // it's earned, show it" rule). Bumps the session counter (counts UP only)
  // and claims any Faculty post that just came due.
  E.courtSessionCelebration = function () {
    const s = E.state;
    s.court.celebrated = true;
    s.courtSessions = (s.courtSessions || 0) + 1;
    const claimed = E.checkFaculty();
    E.save();
    MM.sound.fanfare();
    if (MM.ui.worldBurst && !s.calmMode) {
      for (const col of ['#ffd94a', '#7ee0e8', '#e88ac4']) MM.ui.worldBurst(s.px, s.py, col, 16);
    }
    let body = MM.data.COURT.sessionCelebration;
    for (const post of claimed) body += `<br><br>${post.spawnLine}`;
    MM.ui.dialog('⚖️ Court adjourned', body);
  };

  // ---------- Wave 14 (P2): the Faculty — the connective thread ----------
  // The castle visibly fills as the kid teaches. Claim any post whose
  // milestone predicate is now satisfied. THE EXTENSION POINT: later castle
  // waves append posts to MM.data.FACULTY_POSTS with their OWN earned(state)
  // predicate (games played, dishes cooked, kinds tended) — this loop claims
  // them with zero changes here. Records nothing, gates nothing.
  E.checkFaculty = function () {
    const s = E.state;
    s.faculty = s.faculty || [];
    const claimed = [];
    for (const post of MM.data.FACULTY_POSTS) {
      if (s.faculty.includes(post.id)) continue;
      if (post.earned(s)) { s.faculty.push(post.id); claimed.push(post); }
    }
    return claimed;
  };

  // A claimed Faculty post standing on (x,y) in the castle — used by the
  // castle tryMove (bump-to-hear, blocks the tile like an NPC) and by the
  // ui.js overlay that draws them.
  E.facultyAt = function (x, y) {
    const s = E.state;
    if (!s || s.mapId !== 'castle' || !s.faculty || !s.faculty.length) return null;
    return MM.data.FACULTY_POSTS.find(p => s.faculty.includes(p.id) && p.x === x && p.y === y) || null;
  };

  // ---------- Wave 15: "The Parlor" — the card game "Tiny Hats" ----------
  // Post-ending, combat-free, no timers, gentle failure. The pure card engine
  // (deck, edges, capture rule, the DETERMINISTIC opponent) lives in
  // js/parlor.js (MM.parlor); this is the room, the rewards, and the wiring.
  // DESIGN DECISION (per the wave's records-to-mastery call): the Parlor does
  // NOT record to mastery or the report card — it is casual fluency play, so
  // NOTHING here calls recordAnswer. Tokens, never gold; a loss costs zero.
  E.ensureParlor = function () {
    const s = E.state;
    if (!s.parlor) s.parlor = { tokens: 0, games: 0, wins: 0, album: {}, back: 'default', hats: {}, seenIntro: false };
    if (!s.parlor.album) s.parlor.album = {};
    if (!s.parlor.hats) s.parlor.hats = {};
    if (!s.parlor.back) s.parlor.back = 'default';
    return s.parlor;
  };

  // The castle-side door ('Z'): a gentle "not yet" pre-ending (like the Wing).
  E.parlorDoor = function () {
    const s = E.state;
    if (!s.endingDone) return MM.ui.dialog('🎩 The Parlor', MM.data.PARLOR.dealer.notYet);
    E.enterParlor();
  };

  E.enterParlor = function () {
    const s = E.state;
    MM.track('enterParlor');
    if (E.resetTransientEntities) E.resetTransientEntities();
    E.ensureParlor();
    s.mapId = 'parlor';
    s.grid = MM.maps.parse(MM.maps.PARLOR, '#');
    s.monsters = [];   // the castle rule extends here: no combat, ever
    const start = MM.maps.find(s.grid, 'P')[0];
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log(MM.data.PARLOR.enterLine);
    E.save();
    MM.ui.refresh();
    if (!s.parlor.seenIntro) {   // once-ever: Deuce introduces the house
      s.parlor.seenIntro = true;
      E.save();
      MM.ui.dialog(MM.data.PARLOR.dealer.name, MM.data.PARLOR.dealer.intro);
    }
  };
  E.exitParlor = function () {
    E.enterCastle();
    const s = E.state;
    s.px = 17; s.py = 9;   // land beside the parlor door 'Z' (16,9)
    E.petPos = { x: s.px, y: s.py };
    MM.ui.refresh();
  };

  E.parlorMove = function (dx, dy, nx, ny, ch) {
    const s = E.state;
    if (ch === 'X') return E.exitParlor();
    if (ch === 'D') return MM.ui.parlorHub();     // Deuce: play / collection / tokens
    if (ch === 'C') return MM.ui.parlorPlay();    // sit at the felt table
    if (ch === 'T') return MM.ui.parlorDice();    // the "reach 20" side-table
    if (ch === '#') return;
    if (ch === '.' || ch === 'P') {
      E.petPos = { x: s.px, y: s.py };
      s.px = nx; s.py = ny;
    }
  };

  // Deal two hands of 5. Card DATA is deterministic (edges are a pure function
  // of the kind); WHICH cards you're dealt may use Math.random — that is not
  // card data and not the opponent's move, so it never touches the determinism
  // the wave requires. A drive can pass explicit hands for a reproducible game.
  E.parlorDealHands = function (opts) {
    const s = E.state;
    opts = opts || {};
    if (opts.youHand && opts.oppHand) return { you: opts.youHand.slice(), opp: opts.oppHand.slice() };
    const deck = MM.parlor.deckFromState(s);
    const house = MM.parlor.houseDeck(s);
    const sample = (pool, n) => {
      const a = pool.slice(), out = [];
      for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
      return out;
    };
    const you = sample(deck, 5);
    // If the kid has met fewer than five kinds, Deuce lends the rest (nobody is
    // ever short a hand). House cards are plain (no foil) until you win them.
    while (you.length < 5 && house.length) you.push(house[Math.floor(Math.random() * house.length)]);
    const opp = sample(house, 5);
    return { you, opp };
  };

  E.parlorNewMatch = function (opts) {
    opts = opts || {};
    const hands = E.parlorDealHands(opts);
    const m = MM.parlor.newMatch({ youHand: hands.you, oppHand: hands.opp, first: opts.first || 'you', plies: 1 });
    MM.parlor.current = m;   // exposed for the UI and drives (like MM.battle.current)
    return m;
  };

  // Settle a finished match: bank tokens (playing earns a few, winning a few
  // more; a loss costs ZERO — tokens only ever go up here), sometimes take the
  // opponent's card into the collection, bump the games counter, and claim the
  // House Dealer Faculty post if it just came due. Records nothing to mastery.
  E.parlorFinishMatch = function (m) {
    const par = E.ensureParlor();
    const result = MM.parlor.winner(m);
    par.games = (par.games || 0) + 1;
    let tokensGained = 1;            // playing earns a few
    let wonCard = null;
    if (result === 'you') {
      par.wins = (par.wins || 0) + 1;
      tokensGained += 2;            // winning, a few more
      const oppKinds = [];
      for (const c of m.board) if (c && c.side === 'opp') oppKinds.push(c.card.kind);
      for (const c of m.hands.opp) oppKinds.push(c.kind);
      const fresh = oppKinds.filter(k => !par.album[k]);
      const pool = fresh.length ? fresh : oppKinds;
      if (pool.length && Math.random() < 0.6) { wonCard = pool[0]; par.album[wonCard] = true; }
    }
    par.tokens = Math.max(0, (par.tokens || 0) + tokensGained);   // never negative
    const claimed = E.checkFaculty();   // the House Dealer post may come due
    E.save();
    return { result, tokensGained, wonCard, claimed };
  };

  // The dice side-table award — deterministic from the total; a bust (over 20)
  // pays zero and never costs anything.
  E.parlorDiceAward = function (total) {
    const par = E.ensureParlor();
    const reward = MM.parlor.diceReward(total);
    par.tokens = Math.max(0, (par.tokens || 0) + reward);
    E.save();
    return reward;
  };

  // Buy a cosmetic card-back — tokens only, never gold, never anything that
  // helps you win. Guarded so tokens can never go negative.
  E.parlorBuyBack = function (id) {
    const par = E.ensureParlor();
    const back = (MM.data.PARLOR.backs || []).find(b => b.id === id);
    if (!back || par.back === id || (par.tokens || 0) < back.price) return false;
    par.tokens = Math.max(0, par.tokens - back.price);
    par.back = id;
    E.save();
    return true;
  };

  // ---------- Wave 16: "The Kitchen Garden" (post-ending, renewable) ----------
  // Two paired rooms as one supply chain. The GARDEN plants multiplication as
  // an ARRAY (records under muldiv_facts — the array model IS times-table
  // fluency, and its parent switch already governs it); the KITCHEN scales a
  // recipe by MEASURE (records under fractions_as / fractions_m, both parent-
  // switched). Combat-free (s.monsters = []), no timers, gentle failure (a
  // wrong measure makes a FUNNY dish, never a scold, never a loss). The mason-
  // trail placement PATTERN is reused (a persisted, fully-removable plot + a
  // reset), but planting a rectangle AUTO-FILLS the array (the order's "choose
  // rows, choose columns, see the array fill in") — stepping r×c individual
  // seedlings would make the count a foregone conclusion and lose the honest
  // "how many did you plant?" surprise. Comedy channels: field / glyph / sound
  // / modal, never the log.
  E.KITCHEN_SKILLS = ['fractions_m', 'fractions_as'];
  E.KITCHEN_COST = 2;   // fresh ingredients a single dish spends (a harvest yields many)

  E.ensureGarden = function () {
    const s = E.state;
    if (!s.garden) s.garden = { plot: null, ready: false, ingredients: 0, harvests: 0, dishes: 0, seenChef: false };
    const g = s.garden;
    if (g.ingredients == null) g.ingredients = 0;
    if (g.harvests == null) g.harvests = 0;
    if (g.dishes == null) g.dishes = 0;
    if (g.seenChef == null) g.seenChef = false;
    return g;
  };
  // Bigger plots / harder recipes as the kid's tier rises (adaptive, capped).
  E.gardenTier = function (skill) {
    return Math.max(1, Math.min(3, MM.mastery.tierFor(E.state, skill)));
  };

  // The castle-side 'K' door: a gentle "not yet" pre-ending (like the Wing).
  E.gardenDoor = function () {
    const s = E.state;
    if (!s.endingDone) return MM.ui.dialog('🌱 A green door', MM.data.GARDEN.doorNotYet);
    E.enterGarden();
  };
  E.gardenOpen = () => !!(E.state && E.state.endingDone);

  E.enterGarden = function () {
    const s = E.state;
    MM.track('enterGarden');
    if (E.resetTransientEntities) E.resetTransientEntities();
    E.ensureGarden();
    s.mapId = 'garden';
    s.grid = MM.maps.parse(MM.maps.GARDEN, '#');
    s.monsters = [];   // the castle rule extends here: no combat, ever
    E.buildGardenGrid();
    const start = MM.maps.GARDEN_ARRIVAL;
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log(MM.data.GARDEN.enterLine);
    E.save();
    MM.ui.refresh();
  };
  E.exitGarden = function () {
    E.enterCastle();
    const s = E.state;
    s.px = 22; s.py = 9;   // land beside the garden door 'K' (23,9)
    E.petPos = { x: s.px, y: s.py };
    MM.ui.refresh();
  };

  // Re-derive the garden's grid: the planted plot overlays the tilled soil —
  // seedlings 'Y' while growing, ripe 'R' once counted+grown. Both walkable.
  E.buildGardenGrid = function () {
    const s = E.state;
    if (!s || s.mapId !== 'garden' || !s.grid) return;
    const g = E.ensureGarden();
    const ch = g.ready ? 'R' : 'Y';
    if (g.plot && g.plot.cells) {
      for (const c of g.plot.cells) if (s.grid[c.y]) s.grid[c.y][c.x] = ch;
    }
  };

  E.gardenMove = function (dx, dy, nx, ny, ch) {
    const s = E.state;
    if (ch === 'X') return E.exitGarden();
    if (ch === 'B') return E.gardenBench();
    if (ch === 'C') return E.cookStation();
    if (ch === 'S') return E.sousChefTalk();
    if (ch === 'V') return MM.ui.dialog(MM.data.GARDEN.carrotName, MM.data.pick(MM.data.GARDEN.carrot));
    if (ch === '#') return;
    // seedlings ('Y'/'R') and soil (',') are WALKABLE — you may stroll among
    // your own plants (they never judge), so nothing here can ever wedge.
    if (ch === '.' || ch === 'P' || ch === ',' || ch === 'Y' || ch === 'R') {
      E.petPos = { x: s.px, y: s.py };
      s.px = nx; s.py = ny;
    }
  };

  // ---------- P1: the garden plot (multiplication as an array you plant) ----------
  E.gardenBench = function () {
    const g = E.ensureGarden();
    const G = MM.data.GARDEN;
    const buttons = [];
    if (!g.plot) {
      buttons.push({ label: '🌱 Plant a patch', onClick: () => E.gardenPickRows() });
    } else if (!g.ready) {
      buttons.push({ label: '🔢 Count the seedlings', onClick: () => E.gardenCount() });
      buttons.push({ label: '🌱 Clear the plot (start over)', onClick: () => E.gardenClearPlot() });
    } else {
      buttons.push({ label: `🧺 Harvest the patch (${g.plot.rows}×${g.plot.cols})`, onClick: () => E.gardenHarvest() });
      buttons.push({ label: '🌱 Clear the plot (start over)', onClick: () => E.gardenClearPlot() });
    }
    buttons.push({ label: 'Leave it', onClick: () => {} });
    MM.ui.dialogChoices(G.benchTitle, g.plot ? (g.ready ? G.harvestReady : G.countAgain) : G.benchBody, buttons);
  };
  E.gardenPickRows = function () {
    const G = MM.data.GARDEN;
    const max = MM.maps.GARDEN_MAX[E.gardenTier('muldiv_facts')] || MM.maps.GARDEN_MAX[1];
    const buttons = [];
    for (let r = 2; r <= max.rows; r++) buttons.push({ label: `${r} rows`, onClick: () => E.gardenPickCols(r) });
    MM.ui.dialogChoices(G.benchTitle, G.plantPickRows, buttons);
  };
  E.gardenPickCols = function (rows) {
    const G = MM.data.GARDEN;
    const max = MM.maps.GARDEN_MAX[E.gardenTier('muldiv_facts')] || MM.maps.GARDEN_MAX[1];
    const buttons = [];
    for (let c = 2; c <= max.cols; c++) buttons.push({ label: `${c} in each row`, onClick: () => E.gardenPlant(rows, c) });
    MM.ui.dialogChoices(G.benchTitle, G.plantPickCols(rows), buttons);
  };
  // Plant an r×c rectangle into the top-left of the plot (the array fills in).
  // The placed cells persist in s.garden.plot and are fully removable
  // (gardenClearPlot — the reset). Returns false if it won't fit (a guard).
  E.gardenPlant = function (rows, cols) {
    const s = E.state;
    const g = E.ensureGarden();
    const P = MM.maps.GARDEN_PLOT;
    if (rows < 1 || cols < 1 || rows > P.h || cols > P.w) return false;
    const cells = [];
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) cells.push({ x: P.x0 + cx, y: P.y0 + ry });
    g.plot = { rows, cols, cells };
    g.ready = false;
    E.buildGardenGrid();
    E.save();
    MM.sound.thud();
    if (s && s.mapId === 'garden' && MM.ui.worldBurst && !s.calmMode) {
      MM.ui.worldBurst(P.x0 + Math.floor(cols / 2), P.y0 + Math.floor(rows / 2), '#5bb85f', 12);
    }
    MM.ui.refresh();
    MM.ui.dialog(MM.data.GARDEN.benchTitle, MM.data.GARDEN.planted(rows, cols), () => E.gardenCount());
    return true;
  };
  // The array made honest: "how many did you plant?" = rows × cols, RECORDED
  // under muldiv_facts. A wrong count is gently re-asked (the worked solution
  // shows the array); a correct count grows the patch, ready to harvest.
  E.gardenCount = function () {
    const g = E.ensureGarden();
    if (!g.plot) return E.gardenBench();
    const prob = MM.problems.gardenArray(g.plot.rows, g.plot.cols, E.gardenTier('muldiv_facts'));
    MM.ui.showProblem({
      header: `🌱 ${MM.data.GARDEN.benchTitle}`,
      problem: prob,
      leaveLabel: 'Come back to it',
      onAnswer(correct, kidAnswer) {
        recordAnswer('muldiv_facts', correct, { text: prob.text, kidAnswer });
        if (!correct) return { msg: MM.data.pick(MM.data.GARDEN.miscount) };
        g.ready = true;
        E.buildGardenGrid();
        E.save();
        MM.sound.tada();
        return { msg: MM.data.GARDEN.counted(g.plot.rows * g.plot.cols), end: 'win' };
      },
      onNext: () => E.gardenCount(),
      onEnd() { E.buildGardenGrid(); MM.ui.refresh(); },
    });
  };
  // The reset: lift every seedling back out (fully removable). Seedlings never
  // wedge (they walk), but the wedge-nudge law wants a reset in every placeable
  // space — this is it, so nothing planted is ever stuck.
  E.gardenClearPlot = function () {
    const s = E.state;
    const g = E.ensureGarden();
    g.plot = null;
    g.ready = false;
    if (s && s.mapId === 'garden' && s.grid) s.grid = MM.maps.parse(MM.maps.GARDEN, '#');
    E.save();
    MM.sound.tone(2);
    MM.ui.log(MM.data.GARDEN.clearPlot);
    MM.ui.refresh();
  };
  // Harvest the grown array → fresh ingredients for the kitchen (the supply
  // chain), bump the harvests counter (counts UP only), claim the Gardener
  // Faculty post if it just came due. Renewable, never on a clock.
  E.gardenHarvest = function () {
    const s = E.state;
    const g = E.ensureGarden();
    if (!g.plot || !g.ready) return E.gardenBench();
    const n = g.plot.rows * g.plot.cols;
    g.ingredients = (g.ingredients || 0) + n;
    g.harvests = (g.harvests || 0) + 1;
    g.plot = null;
    g.ready = false;
    if (s && s.mapId === 'garden' && s.grid) s.grid = MM.maps.parse(MM.maps.GARDEN, '#');
    const claimed = E.checkFaculty();
    E.save();
    MM.sound.coin();
    if (s && s.mapId === 'garden' && MM.ui.worldBurst && !s.calmMode) MM.ui.worldBurst(s.px, s.py, '#5bb85f', 14);
    MM.ui.refresh();
    E.gardenAnnounce(MM.data.GARDEN.harvested(n), claimed);
  };
  // Show a garden dialog, appending any just-claimed Faculty post's spawnLine
  // (the reformed monster who took a post — the same idiom as the Court).
  E.gardenAnnounce = function (body, claimed) {
    if (claimed && claimed.length) {
      body += `${body ? '<br><br>' : ''}${MM.data.GARDEN.facultyClaimed}`;
      for (const post of claimed) body += `<br><br>${post.spawnLine}`;
      MM.sound.fanfare();
    }
    if (body) MM.ui.dialog('🌱 The Kitchen Garden', body);
  };

  // ---------- P2: the kitchen (fractions / scaling by measure) ----------
  E.sousChefTalk = function () {
    const g = E.ensureGarden();
    const G = MM.data.GARDEN;
    if (!g.seenChef) { g.seenChef = true; E.save(); return MM.ui.dialog(G.chefName, G.chefIntro); }
    MM.ui.dialog(G.chefName, MM.data.pick(G.chef));
  };
  // Which fraction strand to serve: parent-switch aware, weakest-first between
  // the two (the kitchen auto-targets whichever is rustier). If a parent
  // switched BOTH off, cook anyway (a room is never a dead end) — the recorded
  // skill just falls back to the pair.
  E.kitchenSkill = function () {
    const s = E.state;
    let pool = E.KITCHEN_SKILLS.filter(sk => E.topicEnabled(sk));
    if (!pool.length) pool = E.KITCHEN_SKILLS.slice();
    return MM.mastery.weakestFirst(s, pool)[0];
  };
  E.cookStation = function () {
    const g = E.ensureGarden();
    const G = MM.data.GARDEN;
    if ((g.ingredients || 0) < 1) return MM.ui.dialog(G.chefName, G.chefNeedIngredients);
    const skill = E.kitchenSkill();
    const recipe = MM.problems.kitchenRecipe(skill, E.gardenTier(skill));
    E.cookRecipe(recipe);
  };
  // Present a recipe: the kid computes the scaled measure (records under the
  // fraction skill). A CORRECT measure makes the real dish → feeds the food
  // economy (E.yardGrantReward) + bumps the dishes counter. A WRONG measure
  // makes a gloriously-named DISASTER DISH — never a scold, never a loss; the
  // worked solution shows above and it re-asks. The pet has OPINIONS either way.
  E.cookRecipe = function (recipe) {
    const g = E.ensureGarden();
    const G = MM.data.GARDEN;
    const p = recipe.problem;
    E._gardenPendingFaculty = null;
    MM.ui.showProblem({
      header: G.cookHeader(recipe.dish, recipe.frame),
      problem: p,
      leaveLabel: G.cookLeave,
      onAnswer(correct, kidAnswer) {
        recordAnswer(p.skill, correct, { text: p.text, kidAnswer });
        if (!correct) {
          const dis = MM.data.pick(G.disasters);
          E._lastDish = { name: dis.name, disaster: true, petLine: MM.data.pick(G.petBad) };
          E.gardenPetReact(false);
          return { msg: `${dis.line}<br><br>${E._lastDish.petLine}` };
        }
        g.ingredients = Math.max(0, (g.ingredients || 0) - E.KITCHEN_COST);
        g.dishes = (g.dishes || 0) + 1;
        const grant = E.yardGrantReward({ food: 1 });
        E._gardenPendingFaculty = E.checkFaculty();
        E._lastDish = { name: recipe.dish, disaster: false, petLine: MM.data.pick(G.petGood) };
        E.gardenPetReact(true);
        E.save();
        MM.sound.coin();
        let msg = G.dishDone(recipe.dish);
        if (grant.parts.length) msg += `<br><br>🍽 Into the larder: ${grant.parts.join(', ')}.`;
        msg += `<br><br>${E._lastDish.petLine}`;
        return { msg, end: 'win' };
      },
      onNext: () => E.cookRecipe(recipe),   // a wrong measure re-asks (still no loss)
      onEnd(how) {
        MM.ui.refresh();
        if (how === 'win' && E._gardenPendingFaculty && E._gardenPendingFaculty.length) {
          E.gardenAnnounce('', E._gardenPendingFaculty);
          E._gardenPendingFaculty = null;
        }
      },
    });
  };
  // The pet reacts to a dish (field/glyph/sound): an emote pops over the pet
  // and a sound plays. petGood/petBad LINES are shown in the cook result modal.
  E.gardenPetReact = function (good) {
    E.petEmote = { ch: good ? '😋' : '😖', until: Date.now() + 2600 };
    if (good) MM.sound.purr(); else MM.sound.chirp();
  };

  // ---------- Wave 17: "The Menagerie" (Castle Expansion Wave D) ----------
  // A nursery in the castle grounds for the BEFRIENDED KINDS (s.bestiary
  // .befriended). The gentlest surface in the game: tend-don't-fight, no timer,
  // no failure state. TENDING draws a weakest-first review problem across the
  // WHOLE capped skill set (respecting parent switches) and RECORDS to mastery
  // under the drawn problem's real skill — genuine distributed spaced practice,
  // which is the wave's pedagogical point. A missed tend re-asks warmly (the
  // worked answer shows; the creature waits, patient) — never a scold, never a
  // loss. Creatures grow like the pet (PET_STAGES-style thresholds), collect
  // tiny hats, and have a social life. THE CAPSTONE is the once-ever Parade.
  // Comedy channels: field / glyph / sound / modal — never the log.
  E.MENAGERIE_PARADE_MIN = 3;   // fewest present kinds for the Parade to fire

  E.ensureMenagerie = function () {
    const s = E.state;
    if (!s.menagerie) s.menagerie = { pets: {}, tends: 0, kindsTended: 0, paradeSeen: false, seen: false };
    const m = s.menagerie;
    if (m.pets == null) m.pets = {};
    if (m.tends == null) m.tends = 0;
    if (m.kindsTended == null) m.kindsTended = 0;
    if (m.paradeSeen == null) m.paradeSeen = false;
    if (m.seen == null) m.seen = false;
    return m;
  };
  // Per befriended KEY: {tended, stage, hat} — grows like the pet.
  E.ensureMenageriePet = function (key) {
    const m = E.ensureMenagerie();
    if (!m.pets[key]) m.pets[key] = { tended: 0, stage: 0, hat: null };
    return m.pets[key];
  };

  // The residents = the kinds in s.bestiary.befriended, mapped to their catalog
  // cards (sprite/pal/desc) and assigned a pen slot in a STABLE order (sorted
  // by name), so a soothed kind always keeps its patch. Kinds beyond the slot
  // count still persist in s.menagerie — they just don't roam on-screen (a kid
  // with 15+ befriended already has a full house). This is what drives the
  // pens: zero befriended → an empty list → the "room for a friend" state.
  E.menagerieRoster = function (st) {
    const s = st || E.state;
    const b = s && s.bestiary && s.bestiary.befriended;
    const slots = MM.maps.MENAGERIE_SLOTS;
    if (!b) return [];
    const keys = Object.keys(b).sort();
    const out = [];
    for (let i = 0; i < keys.length && out.length < slots.length; i++) {
      const card = MM.data.beastByName(keys[i]);
      if (!card) continue;   // a befriended key with no catalog card (defensive) — skip
      out.push({
        key: keys[i], name: card.name, sprite: card.sprite, pal: card.pal || null,
        desc: card.desc || '', slot: slots[out.length], pet: E.ensureMenageriePet(keys[i]),
      });
    }
    return out;
  };
  // A resident standing on (x,y) in the nursery — used by menagerieMove (bump
  // to visit, blocks the tile like an NPC) and by the ui.js overlay.
  E.menagerieCreatureAt = function (x, y) {
    const s = E.state;
    if (!s || s.mapId !== 'menagerie') return null;
    return E.menagerieRoster().find(c => c.slot.x === x && c.slot.y === y) || null;
  };
  // Distinct befriended kinds tended at least once — the Keeper's milestone and
  // a teacher-flavored tally. Kept in s.menagerie.kindsTended (counts UP only),
  // incremented on a kind's FIRST tend; this derives it defensively too.
  E.menagerieKindsTended = function (st) {
    const m = (st || E.state || {}).menagerie;
    if (!m || !m.pets) return 0;
    return Object.values(m.pets).filter(p => (p.tended || 0) > 0).length;
  };
  // Which tiny hat a creature wears — a PURE function of its name (so it never
  // changes on it), reusing the pet-hat cosmetic path.
  E.menagerieHatFor = function (key) {
    const ids = MM.data.MENAGERIE_HAT_IDS;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return ids[h % ids.length];
  };

  // The castle-side 'M' door: a gentle "not yet" pre-ending (like the Wing).
  E.menagerieDoor = function () {
    const s = E.state;
    if (!s.endingDone) return MM.ui.dialog('🐾 A latched gate', MM.data.MENAGERIE.doorNotYet);
    E.enterMenagerie();
  };
  E.menagerieOpen = () => !!(E.state && E.state.endingDone);

  E.enterMenagerie = function () {
    const s = E.state;
    MM.track('enterMenagerie');
    if (E.resetTransientEntities) E.resetTransientEntities();
    const m = E.ensureMenagerie();
    s.mapId = 'menagerie';
    s.grid = MM.maps.parse(MM.maps.MENAGERIE, '#');
    s.monsters = [];   // the castle rule extends here: no combat, ever
    const start = MM.maps.MENAGERIE_ARRIVAL;
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    m.seen = true;
    // Empty pens are an invitation, never a failure — the "room for a friend"
    // state (order rule). A full nursery gets the warm arrival line instead.
    const empty = E.menagerieRoster().length === 0;
    MM.ui.log(empty ? '🐾 The Menagerie stands ready and empty — room for a friend, when you find one.' : MM.data.MENAGERIE.enterLine);
    E.save();
    MM.ui.refresh();
    if (empty) MM.ui.dialog(MM.data.MENAGERIE.signTitle, MM.data.MENAGERIE.emptyPen);
  };
  E.exitMenagerie = function () {
    E.enterCastle();
    const s = E.state;
    s.px = 22; s.py = 11;   // land beside the Menagerie door 'M' (23,11)
    E.petPos = { x: s.px, y: s.py };
    MM.ui.refresh();
  };

  E.menagerieMove = function (dx, dy, nx, ny, ch) {
    const s = E.state;
    if (ch === 'X') return E.exitMenagerie();
    if (ch === 'B') return E.menagerieSign();
    const cr = E.menagerieCreatureAt(nx, ny);
    if (cr) return E.bumpCreature(cr);   // a resident blocks its tile (bump to visit)
    if (ch === '#') return;
    // lawn ('.'/'P') and pen patches (',') are all WALKABLE — you may stroll
    // among your friends (they never judge), so nothing here can ever wedge.
    if (ch === '.' || ch === 'P' || ch === ',') {
      E.petPos = { x: s.px, y: s.py };
      s.px = nx; s.py = ny;
    }
  };

  // Bump the noticeboard 'B': the nursery's signage, or the empty-pen state.
  E.menagerieSign = function () {
    const M = MM.data.MENAGERIE;
    if (E.menagerieRoster().length === 0) return MM.ui.dialog(M.signTitle, M.emptyPen);
    MM.ui.dialog(M.signTitle, M.signBody);
  };

  // Bump a resident: its social-life flavor + a choice to TEND it or leave it.
  E.bumpCreature = function (cr) {
    const M = MM.data.MENAGERIE;
    let body = MM.data.pick(M.social);
    if (cr.pet.hat) {
      const hat = MM.data.petHatById(cr.pet.hat);
      if (hat) body += `<br><br>${M.hatNote(`${hat.emoji} <b>a ${hat.name}</b>`)}`;
    }
    MM.ui.dialogChoices(`🐾 ${cr.name}`, body, [
      { label: `Tend ${cr.name} (a quiet review)`, primary: true, onClick: () => E.tendCreature(cr) },
      { label: 'Leave them to it', onClick: () => {} },
    ]);
  };

  // Which skill this tend draws: weakest-first across the WHOLE capped skill
  // set (respecting parent switches) — so the nursery quietly keeps every
  // topic warm. Records under that drawn skill (the pedagogical point).
  E.menagerieTendSkill = function () {
    const s = E.state;
    const pool = MM.mastery.cappedSkills(s);
    return MM.mastery.weakestFirst(s, pool)[0];
  };
  // TEND a creature: one weakest-first review problem, RECORDED under its real
  // skill. A correct tend makes the creature happy AND advances its growth (and
  // may earn it a hat); a miss re-asks warmly (worked answer shows; the
  // creature waits) — never a loss, never a scold. No timer; tend when you like.
  E.tendCreature = function (cr) {
    const s = E.state;
    const M = MM.data.MENAGERIE;
    const skill = E.menagerieTendSkill();
    const tier = Math.max(1, Math.min(3, MM.mastery.tierFor(s, skill)));
    const prob = MM.problems.generate(skill, tier);
    E._menageriePendingFaculty = null;
    E._menageriePendingParade = false;
    MM.ui.showProblem({
      header: `🐾 Tending ${cr.name}<br><span class="dim">${MM.data.pick(M.tendFrames)}</span>`,
      problem: prob,
      leaveLabel: 'Sit with them a while',
      onAnswer(correct, kidAnswer) {
        recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
        if (!correct) {
          // gentle failure: no `end`, so the button reads "Next ➜" and onNext
          // re-asks. The worked solution shows above; the creature is patient.
          return { msg: MM.data.pick(M.patient) };
        }
        const pet = E.ensureMenageriePet(cr.key);
        const firstTend = (pet.tended || 0) === 0;
        pet.tended = (pet.tended || 0) + 1;
        const m = E.ensureMenagerie();
        m.tends = (m.tends || 0) + 1;
        if (firstTend) m.kindsTended = (m.kindsTended || 0) + 1;
        const news = E.checkMenagerieStage(cr);   // may grow + grant a hat
        E._menageriePendingFaculty = E.checkFaculty();   // the Keeper may come due
        E._menageriePendingParade = E.checkMenagerieParade();   // the capstone
        E.gardenPetReact(true);   // the pet approves (reuse the field emote)
        E.save();
        MM.sound.tada();
        let msg = MM.data.pick(M.tended);
        if (news.grew) msg += `<br><br>${M.grew(cr.name, news.grew)}`;
        if (news.hat) {
          const hat = MM.data.petHatById(news.hat);
          if (hat) msg += `<br><br>${M.hatEarned(cr.name, `${hat.emoji} <b>a ${hat.name}</b>`)}`;
        }
        return { msg, end: 'win' };
      },
      onNext: () => E.tendCreature(cr),   // the patient re-ask (still no loss)
      onEnd(how) {
        MM.ui.refresh();
        if (how !== 'win') return;
        if (E._menageriePendingParade) { E._menageriePendingParade = false; return E.fireMenagerieParade(); }
        if (E._menageriePendingFaculty && E._menageriePendingFaculty.length) {
          const claimed = E._menageriePendingFaculty; E._menageriePendingFaculty = null;
          return E.menagerieAnnounce('', claimed);
        }
      },
    });
  };

  // Growth reuses the pet model: advance a stage once `tended` clears the next
  // PET_STAGES-style threshold (MM.data.MENAGERIE_STAGES). Settling in (stage
  // >= 1) earns the creature its deterministic tiny hat. Returns the news so
  // the tend result modal can announce it (field/glyph handled by the caller).
  E.checkMenagerieStage = function (cr) {
    const pet = E.ensureMenageriePet(cr.key);
    const next = MM.data.MENAGERIE_STAGES[pet.stage + 1];
    const news = { grew: null, hat: null };
    if (next && (pet.tended || 0) >= next.tended) {
      pet.stage++;
      news.grew = next.name;
      if (!pet.hat) {   // settling in earns a hat, once (the collection hook)
        pet.hat = E.menagerieHatFor(cr.key);
        news.hat = pet.hat;
        MM.sound.purr();
      }
      MM.sound.fanfare();
      const s = E.state;
      if (s && s.mapId === 'menagerie' && MM.ui.worldBurst && !s.calmMode) MM.ui.worldBurst(cr.slot.x, cr.slot.y, '#6ee87e', 12);
    }
    return news;
  };

  // The Parade capstone: fires ONCE, day-agnostic, no mechanic — a pure
  // celebration when the nursery is thriving (every present befriended kind
  // tended, and enough of them to be a proper parade). s.menagerie.paradeSeen
  // guards the once-ever. Returns true when it should fire (the caller shows it
  // after the tend modal closes, so the beat lands on its own).
  E.checkMenagerieParade = function () {
    const m = E.ensureMenagerie();
    if (m.paradeSeen) return false;
    const present = E.menagerieRoster();
    if (present.length < E.MENAGERIE_PARADE_MIN) return false;
    if (!present.every(c => (c.pet.tended || 0) > 0)) return false;
    m.paradeSeen = true;
    E.save();
    return true;
  };
  E.fireMenagerieParade = function () {
    const s = E.state;
    MM.sound.fanfare();
    if (MM.ui.worldBurst && !s.calmMode) {
      for (const col of ['#ffd94a', '#7ee0e8', '#6ee87e', '#e88ac4']) {
        for (const c of MM.maps.MENAGERIE_SLOTS.slice(0, 8)) MM.ui.worldBurst(c.x, c.y, col, 10);
      }
    }
    E.save();
    MM.ui.dialog('🎉 The Menagerie Parade', MM.data.MENAGERIE.paradeLine);
  };

  // Show a nursery dialog, appending any just-claimed Faculty post's spawnLine
  // (the reformed monster who took the Keeper's post — the Court/Garden idiom).
  E.menagerieAnnounce = function (body, claimed) {
    if (claimed && claimed.length) {
      body += `${body ? '<br><br>' : ''}${MM.data.MENAGERIE.facultyClaimed}`;
      for (const post of claimed) body += `<br><br>${post.spawnLine}`;
      MM.sound.fanfare();
    }
    if (body) MM.ui.dialog('🐾 The Menagerie', body);
  };

  // Untangling one = a short battle drawing the same weakest-first mixed
  // pool as a Homework Golem — adaptive review wearing a story costume.
  E.startTangleBattle = function (tangle) {
    const s = E.state;
    const m = E.diffMult();
    const st = {
      hp: Math.max(1, Math.round(9 * m.hp)),
      atk: Math.max(1, Math.round(2 * m.atk)),
    };
    const roster = MM.data.MONSTERS[MM.maps.SPIRAL_INDEX - 1];
    const type = roster.types[Math.floor(Math.random() * roster.types.length)];
    const mon = {
      name: type.name, sprite: type.sprite, pal: type.pal, verb: type.verb,
      hp: st.hp, maxhp: st.hp, atk: st.atk, boss: false, stun: 0,
    };
    E.markSeen(mon);
    let retryUsed = false;
    const frostPending = [false];
    MM.battle.start(mon, {
      dungeonIndex: MM.maps.SPIRAL_INDEX,
      hooks: Object.assign(E.stanceHooks(mon, frostPending), {
        pickProblem: () => { E.spendStamina(1); return MM.mastery.pickArenaProblem(s); },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() {
          if (retryUsed || !E.hasCharm('ring')) return false;
          retryUsed = true;
          return true;
        },
        victory() {
          E.recordKill(mon);
          if (E.isSoothing() && E.recordBefriend(mon) && E.befriendedCount() === 1) {
            (s.pendingBadges = s.pendingBadges || []).push({ befriend: E.beastKey(mon), sprite: mon.sprite, pal: mon.pal || null });
          }
          tangle.done = true;
          const gold = E.gainGold(6 + Math.floor(Math.random() * 6));
          const lines = [`💰 +${gold} gold`];
          // "days tended" counts up only — two tangles the same real day is
          // still ONE day tended, never a streak that can be broken.
          const today = E.todayStr();
          if (s.lastTendedDate !== today) {
            s.lastTendedDate = today;
            s.daysTended++;
            lines.push(`🌀 <b>${s.daysTended} day${s.daysTended === 1 ? '' : 's'} tended.</b>`);
            if (MM.data.TANGLE_MILESTONES[s.daysTended]) {
              (s.pendingBadges = s.pendingBadges || []).push({ tangleMilestone: s.daysTended });
            }
          }
          petFetch(lines);
          E.save();
          return { lines };
        },
        onEnd(result) {
          if (result.dead) return E.die();
          E.save();
          MM.ui.refresh();
        },
      }),
    });
  };

  // Wave 5 item 3: "Champion" (stage 2+) pets learn to fetch. 10% chance
  // after each battle victory (dungeon or arena) they bring back a small
  // treat — mirrors chestLoot's exact reward application (food/potion/gem),
  // nothing new invented. Mutates `lines` in place, matching how every
  // other victory perk (hat gold, thief interest, level-up) already does.
  function petFetch(lines) {
    const s = E.state;
    const pet = s.isles && s.isles.pet;
    // exposed as a constant so drive-depth can pin it to 1 — a 10% roll
    // asserted probabilistically false-failed sweeps ~12% of the time
    if (!pet || pet.stage < 2 || Math.random() >= E.PET_FETCH_CHANCE) return;
    const roll = Math.random();
    if (roll < 0.08) {
      const gem = E.awardGem();
      lines.push(`🐾 ${pet.name} trots back with something shiny — a ${gem.emoji} <b>${gem.name} Gem</b>!`);
    } else if (roll < 0.5) {
      s.potions++;
      lines.push(`🐾 ${pet.name} fetched you a ${MM.data.POTION.emoji} <b>Healing Potion</b>!`);
    } else {
      const food = MM.data.FOODS[Math.floor(Math.random() * MM.data.FOODS.length)];
      s.items.food[food.id] = (s.items.food[food.id] || 0) + 1;
      lines.push(`🐾 ${pet.name} fetched you a ${food.emoji} <b>${food.name}</b>!`);
    }
  }

  // v1.7.2: a streak job whose condition is ALREADY met pays out the moment
  // the board is looked at — "get 4 in a row" is true the instant the
  // streak reads 4, and making the kid produce one more answer before the
  // reward lands read as "the board isn't working" (playtest 2026-07-13).
  E.settleStreakJobs = function () {
    const s = E.state;
    if (!Number.isFinite(s.streak)) { s.streak = 0; return; }
    for (const board of [s.bounties, s.isleBounties]) {
      if (!board) continue;
      for (const it of board.items) {
        if (!it.done && it.type === 'streak' && s.streak >= it.need) {
          it.have = it.need;
          completeBounty(it, board);
        }
      }
    }
  };

  function completeBounty(it, board) {
    it.done = true;
    const gold = E.gainGold(it.reward);
    MM.sound.fanfare();
    MM.ui.log(`📌 <b>Bounty complete!</b> ${it.label} — <b>+${gold} gold</b>!`);
    if (MM.ui.worldBurst) MM.ui.worldBurst(E.state.px, E.state.py, '#7ec850', 14); // Wave 5 item 7
    if (board.items.every(x => x.done)) {
      MM.ui.log('📌 All notices done! Fresh ones are already up on the board 🪧.');
    }
    E.save();
  }

  // Progress hook: kind = 'kill' (dungeon monster defeated), 'correct' (any
  // correct answer), 'spar' (golem beaten), 'gemchest' (a chest just
  // yielded a gem), or 'thief' (a thief-behavior monster was defeated).
  // Dungeon-scoped jobs only advance inside their target dungeon. Both
  // boards (mainland + isle) are checked every time — a kid might complete
  // an isle job while the isle board isn't even the one currently open.
  E.bountyEvent = function (kind) {
    const s = E.state;
    const dg = s.mapId && String(s.mapId).startsWith('d') ? s.dungeonIndex : 0;
    for (const board of [s.bounties, s.isleBounties]) {
      if (!board) continue;
      for (const it of board.items) {
        if (it.done) continue;
        if (kind === 'kill' && it.type === 'hunt' && it.dungeon === dg) {
          it.have++;
          if (it.have >= it.need) completeBounty(it, board);
          else MM.ui.log(`📌 Bounty: ${it.have}/${it.need} monsters in the ${MM.data.TASKS[it.dungeon - 1].dungeon}.`);
        } else if (kind === 'correct' && it.type === 'solve' && it.dungeon === dg) {
          it.have++;
          if (it.have >= it.need) completeBounty(it, board);
          else MM.ui.log(`📌 Bounty: ${it.have}/${it.need} problems in the ${MM.data.TASKS[it.dungeon - 1].dungeon}.`);
        } else if (kind === 'correct' && it.type === 'streak' && s.streak >= it.need) {
          it.have = it.need;
          completeBounty(it, board);
        } else if (kind === 'spar' && it.type === 'spar') {
          it.have = it.need;
          completeBounty(it, board);
        } else if (kind === 'gemchest' && it.type === 'gemchest') {
          it.have = it.need;
          completeBounty(it, board);
        } else if (kind === 'thief' && it.type === 'thief') {
          it.have++;
          if (it.have >= it.need) completeBounty(it, board);
          else MM.ui.log(`📌 Bounty: ${it.have}/${it.need} thieves caught.`);
        } else if (kind === 'correct' && it.type === 'spire' && dg === 19) {
          it.have++;
          if (it.have >= it.need) completeBounty(it, board);
          else MM.ui.log(`📌 Bounty: ${it.have}/${it.need} problems in the Clockwork Spire.`);
        }
      }
    }
  };

  // ---------- the pet (hatched from Miscount's egg on the voyage out) ----------
  // Never fights, never takes damage. Its job: it SENSES hidden things nearby
  // (secret walls), follows one tile behind, and grows with practice + care.
  E.petPos = null;     // transient; where the pet stands (the hero's last tile)
  E.petAlert = false;  // transient; true when the pet smells a secret
  let petAlertNoted = false;

  E.hatchPet = function (name) {
    const s = E.state;
    s.isles.pet = { species: s.isles.egg, name, stage: 0, fed: 0, correct: 0 };
    E.petPos = { x: s.px, y: s.py };
    E.save();
    MM.ui.refresh();
  };

  E.updatePetAlert = function () {
    const s = E.state;
    E.petAlert = false;
    const pet = s.isles && s.isles.pet;
    if (!pet) return;
    const r = 3 + (E.hasRing('compass') ? 1 : 0) + (pet.stage >= 2 ? 1 : 0);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const row = s.grid[s.py + dy];
        if (row && row[s.px + dx] === '%') {
          E.petAlert = true;
          if (!petAlertNoted) {
            petAlertNoted = true;
            MM.sound.dodge();
            MM.ui.log(`❗ ${pet.name} perks up and sniffs at a wall nearby... <b>something is hidden here!</b>`);
          }
          return;
        }
        // Playtest round 4: the pet smells a mimic too — the anxious kid's
        // early-warning system. Same ❗, its own line: this chest is a trick.
        if (row && row[s.px + dx] === '*' && E._mimics && E._mimics.has(`${s.px + dx},${s.py + dy}`)) {
          E.petAlert = true;
          if (!petAlertNoted) {
            petAlertNoted = true;
            MM.sound.dodge();
            MM.ui.log(`❗ ${pet.name} stares hard at that treasure chest. Its tail is <b>not</b> wagging.`);
          }
          return;
        }
      }
    }
    petAlertNoted = false;
  };

  E.feedPet = function () {
    MM.track('feedPet');
    const s = E.state;
    const pet = s.isles && s.isles.pet;
    if (!pet || !(s.items.treats > 0)) return;
    s.items.treats--;
    pet.fed++;
    MM.sound.coin();
    MM.ui.log('🦴 ' + MM.data.pick(MM.data.PET_FEED_LINES).replace(/\{name\}/g, pet.name));
    E.checkPetStage();
    E.save();
    MM.ui.refresh();
  };

  // Growing up takes BOTH practice (correct answers) and care (feeding).
  E.checkPetStage = function () {
    const s = E.state;
    const pet = s.isles && s.isles.pet;
    if (!pet) return;
    const next = MM.data.PET_STAGES[pet.stage + 1];
    if (!next || pet.correct < next.correct || pet.fed < next.fed) return;
    pet.stage++;
    (s.pendingBadges = s.pendingBadges || []).push({ pet: true, stage: pet.stage });
    MM.sound.fanfare();
    MM.ui.log(`✨ <b>${pet.name} grew!</b> Your ${MM.data.PETS[pet.species].name} is now a <b>${next.name}</b>!`);
  };

  // ---------- spells (badge rewards — utility only, never damage) ----------
  // Unlocks are counted in GOLD badges, never spent or consumed by casting.
  // s.spells is transient, per dungeon-visit (reset in tryEnterDungeon), not
  // saved — a fresh visit always gets a fresh Scout/Beacon.
  E.spellsUsedThisVisit = { scout: false, beacon: false };
  E.goldBadgeCount = function () {
    const s = E.state;
    return Object.values((s && s.badges) || {}).filter(t => t === 3).length;
  };
  E.spellUnlocked = function (name) {
    const s = E.state;
    const gold = E.goldBadgeCount();
    if (name === 'scout') return gold >= 3;
    if (name === 'blink') return gold >= 6;
    if (name === 'beacon') {
      const enabled = MM.mastery.cappedSkills(s);
      return enabled.length >= 6 && enabled.every(sk => (s.badges[sk] || 0) === 3);
    }
    return false;
  };
  E.inDungeon = () => !!(E.state && String(E.state.mapId).startsWith('d'));

  // Wave 5 "Deep Wings": dungeons 4/7/9 keep their single fixed topic on
  // floor 0, but their new locked second floor is full mixed review — same
  // treatment as an isle mixed:true dungeon, just scoped to one floor
  // instead of the whole dungeon (task.mixed itself is a per-dungeon flag
  // with no floor granularity, so this is checked alongside it everywhere
  // task.mixed is: startCombat's pickProblem, mathDoor, and chest).
  const DEEP_WING_DUNGEONS = [4, 7, 9];
  E.isDeepWingFloor = (s) => DEEP_WING_DUNGEONS.includes(s.dungeonIndex) && s.floorIndex > 0;

  // Scout: secret walls on the current floor shimmer for 10 seconds (drawn
  // by ui.js's drawWorld). Once per dungeon visit.
  // Wave 7.1: every cast ANSWERS — silent returns taught a live playtester
  // that spells "do nothing". Scout with nothing to find also says so,
  // without spending the once-per-visit cast.
  E.castScout = function () {
    const s = E.state;
    if (!s || !E.spellUnlocked('scout')) return;
    if (!E.inDungeon()) return MM.ui.log('🔍 Spells only work inside a dungeon.');
    if (E.spellsUsedThisVisit.scout) return MM.ui.log('🔍 Scout is spent for this visit — it recharges at the entrance.');
    if (!MM.maps.find(s.grid, '%').length) {
      return MM.ui.log('🔍 You cast Scout... and sense <b>no hidden walls on this floor</b>. (The cast isn\'t used up.)');
    }
    E.spellsUsedThisVisit.scout = true;
    E.scoutUntil = performance.now() + 10000;
    MM.sound.dodge();
    MM.ui.log('🔍 <b>Scout!</b> Hidden walls shimmer faintly on this floor... (10 seconds)');
    MM.ui.refresh();
  };
  E.scoutActive = () => !!(E.scoutUntil && performance.now() < E.scoutUntil);

  // Blink: hop clean over one adjacent tile in your last-moved direction —
  // 10 stamina, no other limit.
  E.castBlink = function () {
    const s = E.state;
    if (!s || !E.spellUnlocked('blink')) return;
    if (!E.inDungeon()) return MM.ui.log('⚡ Spells only work inside a dungeon.');
    if (!E.lastDir) return MM.ui.log('⚡ Take a step first — Blink hops in the direction you last moved.');
    if (s.stamina < 10) { MM.ui.log(`⚡ ${MM.data.SPELL_TOOLTIPS.noStamina}`); return; }
    const { dx, dy } = E.lastDir;
    const lx = s.px + dx, ly = s.py + dy;       // the hazard/gap being hopped
    const nx = s.px + dx * 2, ny = s.py + dy * 2; // the landing tile
    const row = s.grid[ny];
    const land = row && row[nx];
    // the landing must be a tile you could WALK onto — never inside a wall,
    // gate, locked/math door, chest, lever, or an uncracked secret wall
    if (land == null || '#GKD*%L'.includes(land)) { MM.ui.log('⚡ No room to Blink that way.'); return; }
    if (s.monsters.some(m => m.hp > 0 && m.x === nx && m.y === ny)) { MM.ui.log('⚡ Something\'s standing right where you\'d land.'); return; }
    E.spendStamina(10);
    E.petPos = { x: s.px, y: s.py };
    s.px = nx; s.py = ny;
    MM.sound.dodge();
    MM.ui.log(`⚡ <b>Blink!</b> You hop clean over ${s.grid[ly] ? s.grid[ly][lx] : '?'} and land safely.`);
    E.save();
    // landing on the exit, stairs, or a chute works exactly like stepping on it
    if (land === 'X') return E.exitDungeon();
    if (land === '>') return E.changeFloor(1);
    if (land === '<') return E.changeFloor(-1);
    if (land === 'v') return E.dropChute(nx, ny);
    E.tileEffects(land, dx, dy);
    E.updatePetAlert();
    MM.ui.refresh();
  };

  // Beacon: instantly return to the dungeon's entrance. Once per visit.
  E.castBeacon = function () {
    const s = E.state;
    if (!s || !E.spellUnlocked('beacon')) return;
    if (!E.inDungeon()) return MM.ui.log('🕯 Spells only work inside a dungeon.');
    if (E.spellsUsedThisVisit.beacon) return MM.ui.log('🕯 Beacon is spent for this visit — it recharges at the entrance.');
    E.spellsUsedThisVisit.beacon = true;
    while (s.floorIndex > 0) E.changeFloor(-1);
    const x = MM.maps.find(s.grid, 'X')[0];
    if (x) { s.px = x.x; s.py = x.y; E.petPos = { x: s.px, y: s.py }; }
    MM.sound.fanfare();
    MM.ui.log('🕯 <b>Beacon!</b> The way back to the entrance flares bright — and you\'re there.');
    E.save();
    MM.ui.refresh();
  };

  // ---------- mystery potions (Brass Compass gambling, kid-safe) ----------
  E.drinkMystery = function () {
    MM.track('drinkMystery');
    const s = E.state;
    if (!(s.items.mystery > 0)) return;
    s.items.mystery--;
    let roll = Math.random();
    if (E.hasRing('sealuck') && roll >= 0.95) roll = 0.2; // the sea has favorites
    let msg;
    if (roll < 0.50) {
      s.hp = Math.min(s.maxhp, s.hp + 20);
      msg = '...raspberries? <b>+20 HP!</b>';
    } else if (roll < 0.70) {
      s.stamina = s.maxStamina;
      msg = '...sea mint! <b>Stamina fully restored!</b>';
    } else if (roll < 0.85) {
      const g = E.gainGold(15);
      msg = `...there were <b>${g} gold coins</b> at the bottom?!`;
    } else if (roll < 0.95) {
      s.seaLegs = true;
      msg = '...fizzy! You feel nimble — <b>+10% dodge in your next battle!</b>';
    } else {
      s.greenHair = true;
      msg = '...pond water. Your hair turns <b>seaweed green</b> until your next night at the inn. It\'s a look.';
    }
    MM.sound.coin();
    MM.ui.log(`🫙 You drink the Mystery Potion. ${msg}`);
    E.save();
    MM.ui.refresh();
  };

  // ---------- the Monster Book (bestiary) ----------
  // All Homework Golem levels share one card; everyone else files under name.
  E.beastKey = mon => mon.arena ? MM.data.GOLEM_CARD.name : mon.name;
  E.markSeen = function (mon) {
    const b = E.state.bestiary;
    b.seen[E.beastKey(mon)] = true;
  };
  E.recordKill = function (mon) {
    const s = E.state;
    const b = s.bestiary;
    const key = E.beastKey(mon);
    b.seen[key] = true;
    b.kills[key] = (b.kills[key] || 0) + 1;
    // 1.5c: a regular (non-boss) kill stays cleared from its dungeon today
    if (mon.home) s.defeatedAt[`${s.mapId}:${mon.home.x},${mon.home.y}`] = E.todayStr();
  };

  // ---------- Wave 8b (P1): the Soothe verb, and the befriended axis ----------
  // Soothing a monster is not sparing it — it is FINISHING it, the gentle way.
  // Same problems, same progress, same rewards. What changes is the frame: the
  // tangle comes loose instead of coming apart. The lore always believed this
  // ("a worked answer unties them"); the mechanic is only now catching up.
  E.isSoothing = () => !!(E.state && E.state.stance === 'soothe');
  E.setStance = function (stance) {
    const s = E.state;
    if (!s || (stance !== 'strike' && stance !== 'soothe')) return;
    s.stance = stance;   // sticky: this is now the profile's default
    E.save();
  };
  E.setBrave = function (on) {
    const s = E.state;
    if (!s) return;
    s.brave = !!on;      // sticky, same as stance
    E.save();
  };

  // Befriending is per SPECIES and permanent, exactly like a badge: once earned,
  // never taken away. Beating one of the same kind later does not un-friend it —
  // a collection that could be undone would be a punishment mechanic, and there
  // are none of those in this game.
  E.isBefriended = function (mon) {
    const b = E.state && E.state.bestiary;
    return !!(b && b.befriended && b.befriended[E.beastKey(mon)]);
  };
  E.recordBefriend = function (mon) {
    const s = E.state;
    const b = s.bestiary;
    b.befriended = b.befriended || {};
    const key = E.beastKey(mon);
    const first = !b.befriended[key];
    b.befriended[key] = (b.befriended[key] || 0) + 1;
    return first;   // first of its kind — worth a ceremony
  };
  E.befriendedCount = function (st) {
    const b = (st || E.state || {}).bestiary;
    return b && b.befriended ? Object.keys(b.befriended).length : 0;
  };

  // The calmed look: a warm-white-blended palette, used by the world map, the
  // bestiary card, and (cross-faded, as the calm rises) the battle screen.
  // Materialized rather than flagged so MM.sprites' palette cache stays honest.
  E.calmPalette = function (mon, amount) {
    return MM.sprites.softPalette(mon.sprite, mon.pal || {}, amount == null ? 0.45 : amount);
  };

  // A befriended wanderer/chaser never STARTS a fight — it waves as you pass,
  // and you may still bump it to spar voluntarily. Guards still guard their
  // posts and thieves still steal (the comedy is load-bearing), and bosses are
  // unaffected. For the anxious kid this turns every soothed species from
  // ambush-anxiety into visible friendliness: her collection pays out in
  // CONTROL of her own encounters, which is the entire point of the dial.
  // Taming scope (user decision 2026-07-13, playtest: "when I tame one
  // creature, many creatures become tamed" read as a bug): taming is now
  // PER-CREATURE — only a monster the kid personally soothed is tame
  // (becalmed: sits, wears the heart, steps aside). Others of its kind stay
  // wild until soothed themselves. The Monster Book's 🤍 still records the
  // KIND (the collection is unchanged); the in-world effect is individual.
  E.isPacified = function (mon) {
    return !!(mon && !mon.boss && mon.becalmed);
  };

  // Topic badges: persist the best tier ever reached (never taken away).
  // The celebration dialog can't open mid-battle or over another modal, so
  // new badges queue in s.pendingBadges and ui.refresh() pops them when clear.
  function checkBadge(skill) {
    const s = E.state;
    s.badges = s.badges || {};
    const tier = MM.mastery.badgeTier(s, skill);
    if (tier <= (s.badges[skill] || 0)) return;
    s.badges[skill] = tier;
    (s.pendingBadges = s.pendingBadges || []).push({ skill, tier });
    const b = MM.data.BADGES[tier];
    MM.sound.fanfare();
    MM.ui.log(`${b.emoji} <b>${b.name}</b> earned in ${MM.data.SKILL_NAMES[skill]}!`);
    if (MM.ui.worldBurst) MM.ui.worldBurst(s.px, s.py, '#ffd94a', 18); // Wave 5 item 7
    E.checkSpellUnlocks();
  }

  // Wave 4 carry-over: spells used to unlock SILENTLY (the sidebar row just
  // appeared, no explanation). Every gold badge can flip a spell from locked
  // to unlocked, so this checks all three each time and queues a one-time
  // celebration (via the same pendingBadges queue badges/pet-growth already
  // use) the moment each newly qualifies. s.spellsCelebrated tracks which
  // have already had their celebration shown, so it never repeats.
  E.checkSpellUnlocks = function () {
    const s = E.state;
    s.spellsCelebrated = s.spellsCelebrated || {};
    for (const name of ['scout', 'blink', 'beacon']) {
      if (!s.spellsCelebrated[name] && E.spellUnlocked(name)) {
        s.spellsCelebrated[name] = true;
        (s.pendingBadges = s.pendingBadges || []).push({ spell: name });
      }
    }
  };

  // Shared victory payout (Wave 8a, P7): identical for a real battle win and
  // an Overwhelm instant-win (E.tryOverwhelm, below) — the reward should
  // never depend on HOW the monster went down, only on which monster it was.
  // Extracted verbatim from the old inline victory(m) hook.
  E.grantVictory = function (m, soothed) {
    const s = E.state;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    // A calmed friend was not DEFEATED (playtest 2026-07-12): a soothed
    // regular records on the befriend axis only — no ⚔ tally, no defeatedAt
    // (it isn't gone; see the becalm block below). Bosses keep recordKill
    // either way — their flags and gauntlet marks are story bookkeeping.
    if (!soothed || m.boss) E.recordKill(m); else E.markSeen(m);
    E.bountyEvent('kill'); // board jobs count EITHER verb — kindness is progress
    if (m.behavior === 'thief') E.bountyEvent('thief'); // Wave 5: "catch 2 thieves"
    // Wave 8b: a soothed monster is recorded on the SECOND collection axis, and
    // the first of each kind earns a small ceremony (queued like a badge, so it
    // never interrupts the battle it was won in).
    let firstFriend = false;
    if (soothed) {
      firstFriend = E.recordBefriend(m);
      // Round 5: the "A friend!" ceremony fires ONCE — for the very first
      // friend the kid ever makes ("having the pop-up after every fight is
      // ridiculous"). Every later kind gets its victory line and its 🕊 mark
      // in the book, no modal.
      if (firstFriend && E.befriendedCount() === 1) {
        (s.pendingBadges = s.pendingBadges || []).push({ befriend: E.beastKey(m), sprite: m.sprite, pal: m.pal || null });
      }
    }
    const baseGold = m.boss ? m.gold : Math.floor(Math.random() * (2 * s.dungeonIndex)) + s.dungeonIndex;
    const gold = E.gainGold(baseGold);
    const levelsBefore = s.level;
    E.gainXp(m.xp);
    const lines = [
      `⭐ +${m.xp} XP`,
      // Identical rewards, either way. The gold is not looted from a body — it
      // is nudged over, with a pouch, by something that has decided it likes you.
      soothed
        ? `💰 +${gold} gold${gold > baseGold ? ' 🧲' : ''} <span class="dim">— a grateful gift</span>`
        : `💰 +${gold} gold${gold > baseGold ? ' 🧲' : ''}`,
    ];
    if (m.hat) {
      s.gold += 1; s.hatsRetired = (s.hatsRetired || 0) + 1;
      // Non-negotiable.
      lines.push(soothed ? '🎩 It tips the tiny hat to you. +1 gold.' : '🎩 +1 gold — for the tiny hat.');
    }
    if (m.stolen) {
      const back = E.gainGold(Math.ceil(m.stolen * 1.5));
      lines.push(`🪶 Caught the thief! Your <b>${m.stolen} gold</b> back — with interest: <b>+${back}</b>!`);
    }
    // Playtest round 4: a Mimic IS its chest — beaten or befriended, it gives
    // up everything it was hiding, PLUS one treasure for your nerve.
    // Curiosity is always net-rewarded; a mimic is never a punishment.
    if (m.mimicChest) {
      const mx = m.mimicChest.x, my = m.mimicChest.y;
      if ((s.grid[my] || [])[mx] === '*') {
        s.grid[my][mx] = '.';
        s.opened[`${s.mapId}:${mx},${my}`] = true;
      }
      if (E._mimics) E._mimics.delete(`${mx},${my}`);
      lines.push(soothed
        ? '🎁 <i>It opens itself, and offers you everything inside.</i>'
        : '🎁 <i>Everything it was hiding spills out.</i>');
      const gemsBefore = (s.items.gems || []).length;
      lines.push(chestLoot(s.dungeonIndex, MM.data.chestGold(s.dungeonIndex)));
      if ((s.items.gems || []).length > gemsBefore) E.bountyEvent('gemchest');
      const t = MM.data.treasureForDungeon(s.dungeonIndex);
      s.items.treasures.push(t.id);
      lines.push(`…and a ${t.emoji} <b>${t.name}</b>, for your nerve. The shopkeeper would pay <b>~${t.value} gold</b>.`);
    }
    if (s.level > levelsBefore) lines.push(`🎺 <b>LEVEL UP!</b> You are now level ${s.level} (max HP ${s.maxhp})`);
    if (m.boss && task.finale) {
      // the Great Lighthouse: sincere, no jokes — the ending dialog
      // (Keeper of the Light) fires from onEnd, below
      s.bossesDefeated[s.mapId] = true;
      s.isles.lampLit = true;
      lines.push('🌫 <i>The Murk does not die. It thins into ordinary morning mist.</i>');
      lines.push('🗼 <b>The Great Lamp is lit!</b>');
    } else if (m.boss && task.vault) {
      // the Smugglers' Vault: Captain Brine's hoard yields the unique
      // charm (the ranged crossbow is a guaranteed CHEST find instead —
      // see the guard standing over it in E.chest)
      s.bossesDefeated[s.mapId] = true;
      if (!s.items.charms.includes('wayfinder')) {
        s.items.charms.push('wayfinder');
        if (s.charmsOn.length < E.CHARM_SLOTS) s.charmsOn.push('wayfinder');
        lines.push(`🗺 <b>The hoard yields a charm:</b> the Wayfinder's Locket!`);
      } else {
        lines.push(`💰 Captain Brine's hoard, fair and square.`);
      }
    } else if (m.boss && task.spire) {
      // the Clockwork Spire: Horologe Isle's own finale. spireDone is
      // the flag a later wave can gate a fourth sail destination on.
      s.bossesDefeated[s.mapId] = true;
      s.isles.spireDone = true;
      lines.push('⚙️ <i>Somewhere deep in the tower, a long-stopped gear shudders — and turns.</i>');
      lines.push('⏰ <b>The Clockwork Spire ticks again!</b>');
    } else if (m.boss && task.chime) {
      // the Resonant Halls: Chime Isle's own finale. hallsDone is the
      // flag a later wave can gate a fifth sail destination on.
      s.bossesDefeated[s.mapId] = true;
      s.isles.hallsDone = true;
      lines.push('🎵 <i>A single clear note rings out — and every hall answers it in tune.</i>');
      lines.push('🔔 <b>The Resonant Halls sing again!</b>');
    } else if (m.boss && task.breakwater) {
      // the Sunken Breakwater: Gullwrack Harbor's own finale.
      // breakwaterDone is the flag Wave 6's repair sites (and any
      // later wave) can check.
      s.bossesDefeated[s.mapId] = true;
      s.isles.breakwaterDone = true;
      lines.push('🧱 <i>Somewhere above, the last loose stone in the breakwater grinds back into place.</i>');
      lines.push('🌊 <b>The Sunken Breakwater holds again!</b>');
    } else if (m.boss && task.spiral) {
      // Wave 9: a landing's tangle-boss. Defeated forever, per landing floor
      // (s.mapId is per-floor, e.g. 'd22f4') — no need to refight it to pass
      // through on a later visit. No item, no s.haveItem: this only ever
      // gates the chest sitting right beside it.
      s.bossesDefeated[s.mapId] = true;
      lines.push('🌀 <i>The tightest knot on this landing comes loose, all at once.</i>');
    } else if (m.boss && task.isle) {
      // isle bosses guard lighthouse lenses, not quest items
      s.bossesDefeated[s.mapId] = true;
      s.isles.lenses[task.lens] = true;
      lines.push(`🔆 <b>The ${task.item} blazes back to life!</b>`);
      lines.push('<i>Far above, a beam of light sweeps across the waves for the first time in years.</i>');
      lines.push('⛵ <i>The captain will want to hear about this!</i>');
    } else if (m.boss) {
      s.bossesDefeated[s.mapId] = true;
      s.haveItem = true;
      if (s.dungeonIndex === 10) {
        lines.push(`🌫 <i>The shadows drain away like ink in water...</i>`);
        lines.push(`<i>Where the Lord of Confusion stood, a tired student in a grey robe blinks in the light.</i>`);
        lines.push(`💬 <i>"I... I remember now. You showed your work. Every single step."</i>`);
      }
      lines.push(`${task.itemEmoji} <b>You found the ${task.item}!</b>`);
      lines.push(task.exp ? `Bring it to Miscount 🧑‍🎓 across the bridge!` : `Bring it to the MathMaker at the castle! 🏰`);
    }
    // Playtest 2026-07-12 ("they seem to disappear, like ones that have been
    // fought"): a soothed regular STAYS in the room, becalmed — full health,
    // and since its species is befriended as of this very moment, the
    // existing friend rendering (softened palette, 🕊 pip) and pacify logic
    // pick it up with zero extra wiring. A soothed GUARD goes off duty and
    // drifts from its post, so soothing can never leave a chokepoint blocked
    // that defeating would have cleared — soothing is never the worse
    // choice. Bosses keep their sincere endings; a mimic IS its chest
    // (opened above); tangles dissolve — their whole self was the knot.
    // Round 5 refinement: it SITS STILL right where it was calmed ("settles
    // down right where it is" — wandering off made friends untrackable), and
    // bumping it makes it politely step aside (see tryMove), so a becalmed
    // guard can never block a chokepoint that defeating would have cleared.
    if (soothed && !m.boss && !m.mimicChest) {
      m.hp = m.maxhp;
      m.becalmed = true;
      // ...and STAYS a friend if the kid leaves and comes back today
      // (day-keyed like defeatedAt; the spawn loop re-becalms it)
      if (m.home) {
        s.becalmedAt = s.becalmedAt || {};
        s.becalmedAt[`${s.mapId}:${m.home.x},${m.home.y}`] = E.todayStr();
      }
    }
    // Wave 8b: the calmed monster's own send-off, and the friendship, spelled
    // out. Bosses keep their existing sincere endings — they were always being
    // soothed; the story just never had a word for it until now.
    // Wave 21 (Looking Glass P2.3): "Recognize" — through the glass, this is
    // the SAME machinery (soothed/firstFriend/becalmed/befriended, above, are
    // all untouched), only the WORDING changes. A mirror monster is a
    // reflection of a friend already made, so `firstFriend === false` reads
    // as a REUNION (the kind was already befriended, in the real kingdom or
    // an earlier reflection) rather than a first meeting.
    if (soothed) {
      const mirror = E.inMirror();
      if (!m.boss) {
        lines.push(mirror
          ? `🪞 <i>${MM.data.recognizeLine(m, !firstFriend)}</i>`
          : `🕊 <i>${MM.data.sootheLine(m)}</i>`);
      }
      lines.push(mirror
        ? (firstFriend
          ? `🪞 <b>You recognize this ${E.beastKey(m)}.</b> Its kind's card is marked in your 📕 Monster Book.`
          : `🪞 You recognize this ${E.beastKey(m)} — it'll stay right here, glad to be seen.`)
        : (firstFriend
          ? `🤍 <b>This ${E.beastKey(m)} is your friend now.</b> Its kind's card is marked in your 📕 Monster Book.`
          : `🤍 This ${E.beastKey(m)} is your friend now — it'll stay right here, at peace.`));
    }
    // Wave 8a (P8, delight catalog): "post-boss high-five hop" — one small
    // pet cheer on any boss win, zero design weight, no state to track.
    // Wave 8b: the pet's HAPPIEST hop is reserved for a soothe victory.
    if (m.boss && s.isles && s.isles.pet) {
      lines.push(soothed
        ? `🐾 ${s.isles.pet.name} is bouncing so hard it keeps leaving the ground. This is the happiest you have ever seen it.`
        : `🐾 ${s.isles.pet.name} hops up for a high-five. You oblige.`);
    }
    // 2026-07-12 playtest: a kid reached mid-game never realizing gear
    // upgrades exist — the sidebar NAMES the stick, but nothing SAYS the
    // shop fixes it. One line, once ever, the first win where the gold
    // could actually buy the cheapest mainland weapon upgrade.
    if (!s.seenGearHint && s.equipped.weapon === 'stick') {
      const up = MM.data.GEAR.weapon
        .filter(w => w.price > 0 && !w.isle && !w.notForSale)
        .sort((a, b) => a.price - b.price)[0];
      if (up && s.gold >= up.price) {
        s.seenGearHint = true;
        lines.push(`💡 That's enough gold for the ${up.emoji} <b>${up.name}</b> at the 🏪 shop — a better weapon makes <b>every correct answer hit harder</b>!`);
      }
    }
    petFetch(lines);
    E.save();
    return lines;
  };

  // ---------- Wave 8b: friends celebrate the boss falling ----------
  // Every living BEFRIENDED monster still on the floor bounces when the boss
  // goes down — struck or soothed, it doesn't matter, the room is free either
  // way. Hostiles stay exactly as they were, still tangled, and that contrast is
  // the whole story, told in one glance. If the boss was SOOTHED it lingers a
  // beat and joins in before it wanders off. Fires once, ~2s, never blocks
  // input; under Calm Mode the hop stays and the motes don't (a ceremony, but a
  // quiet one).
  E.friendCheer = null;   // {until, boss?} — read by ui.drawWorld; in memory only
  E.friendsCelebrate = function (boss, soothed) {
    const s = E.state;
    const friends = (s.monsters || []).filter(m => m.hp > 0 && m.becalmed);
    if (!friends.length && !soothed) return;
    E.friendCheer = {
      until: Date.now() + 2200,
      boss: soothed && boss ? { x: boss.x, y: boss.y, sprite: boss.sprite, pal: boss.pal || null } : null,
    };
    if (friends.length) {
      MM.ui.log(friends.length === 1
        ? '🕊 Across the room, your friend is bouncing.'
        : '🕊 All around the room, your friends are bouncing.');
    }
  };
  E.friendCheerActive = () => !!(E.friendCheer && Date.now() < E.friendCheer.until);

  // Shared with E.tryOverwhelm (Wave 8a, P7): the same topic-priority logic
  // startCombat uses for a live monster's regular (non-boss) quick problems —
  // factored out so the one-shot overwhelm problem asks exactly what a real
  // battle would have asked, never something easier or harder.
  E.pickRegularMonsterProblem = function (mon) {
    const s = E.state;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    if (task.spire) return MM.mastery.pickSpireProblem(s);
    if (task.breakwater) return MM.mastery.pickBreakwaterProblem(s);
    const mixed = task.mixed || E.isDeepWingFloor(s);
    if (mixed && mon.skill && MM.mastery.cappedSkills(s).includes(mon.skill)) {
      return MM.problems.generateQuick(mon.skill);
    }
    return mixed ? MM.mastery.pickArenaProblem(s) : MM.mastery.pickCombatProblem(s, s.dungeonIndex);
  };

  // ---------- Overwhelm (Wave 8a, P7): outgrown-the-dungeon relief ----------
  // A kid who lingers leveling up in early dungeons can end up WAY past what
  // they teach — grinding a full battle against something that can't scratch
  // you isn't a challenge, it's busywork. "Expected level" is deliberately
  // crude: a dungeon's position in the curriculum (1-21) IS its difficulty
  // rating, so expectedLevel(dungeonIndex) = dungeonIndex. Once the kid's
  // level clears that by OVERWHELM_GAP or more, a regular (non-boss,
  // non-arena, non-gauntlet) monster gives one quick problem instead of a
  // fight: right and it's an instant win (full normal rewards); wrong and
  // the fight just starts, exactly as if Overwhelm had never checked in —
  // this is a SKIP, never a trap, so a miss costs nothing.
  const OVERWHELM_GAP = 6;
  E.expectedLevel = dungeonIndex => dungeonIndex;
  E.isOverwhelming = function (mon) {
    const s = E.state;
    if (mon.boss || mon.arena || mon.gauntlet) return false;
    return s.level - E.expectedLevel(s.dungeonIndex) >= OVERWHELM_GAP;
  };
  E.tryOverwhelm = function (mon) {
    E.markSeen(mon);
    const prob = E.pickRegularMonsterProblem(mon);
    MM.ui.showProblem({
      header: `😮 <b>${MM.data.theMon(mon.name, true)} takes one look at you and hesitates.</b>`,
      problem: prob,
      leaveLabel: '⚔️ Just fight',
      onAnswer(correct, kidAnswer) {
        recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
        if (!correct) return { msg: 'It shakes off the hesitation — <b>the fight begins for real!</b>', end: 'fight' };
        mon.hp = 0; // defeated, same as a real battle leaves it (m.hp > 0 gates aliveness everywhere else)
        // Overwhelm honours the stance too: a gentle kid who has outgrown a
        // dungeon still befriends what she meets there.
        E.grantVictory(mon, E.isSoothing());
        return {
          msg: E.isSoothing()
            ? 'It takes one look at your worked answer and simply comes untied — and settles down right there, entirely at peace.'
            : 'It takes one look at your worked answer and unties itself on the spot.',
          end: 'won',
        };
      },
      onEnd(reason) {
        if (reason === 'won') { MM.ui.refresh(); return; }
        // 'leave' (chose to fight) or 'fight' (missed the one-shot) — either
        // way, a normal battle starts, no penalty either direction.
        E.startCombat(mon);
      },
    });
  };

  // ---------- Wave 8b: the shared stance hooks ----------
  // startCombat, startArenaBattle and startGauntletBattle each build their own
  // hooks object (they always have — their victory/pickProblem differ). The
  // STANCE behaviour is identical in all three, so it lives here once: a battle
  // is a battle, whether it's a Slime, a Homework Golem, or a boss rematch.
  //
  // `frost` is the caller's own frostPending cell (a one-element array so it can
  // be written through) — the Frost gem is per-battle state the caller owns.
  E.stanceHooks = function (mon, frost) {
    const s = E.state;
    let freeMissUsed = false;   // ONE free counterattack skip per battle, whatever grants it
    return {
      stance: () => s.stance || 'strike',
      brave: () => !!s.brave,
      setStance(v) { E.setStance(v); },
      setBrave(v) { E.setBrave(v); },
      // What your weapon DOES when you're soothing. Gentle instruments carry
      // their own verb; anything else is simply held out, gently, which is its
      // own kind of funny when it's a battle axe.
      soothingVerb() {
        const w = E.equippedItem('weapon');
        return (w && w.verb) || 'holds steady in front of';
      },
      playerStrike(braveAtPick) {
        let dmg = E.rollStrike();
        // battle.js latches the brave state each problem was PICKED under —
        // double damage only pays for a question actually asked the hard way
        const brave = braveAtPick != null ? !!braveAtPick : !!s.brave;
        // ⚡ Brave: DOUBLE damage for the harder problem. playerStrike fires
        // exactly once per CORRECT battle answer, which is precisely what
        // "brave problems solved" means — so the lifetime counter lives here.
        if (brave) { dmg *= 2; s.braveSolved = (s.braveSolved || 0) + 1; }
        const crit = s.streak >= 5 && Math.random() < 0.25;
        if (crit) dmg *= 2;
        if (crit && E.hasEnchant('leech')) s.hp = Math.min(s.maxhp, s.hp + 2);
        if (E.hasEnchant('frost')) frost[0] = true;
        // THE BOSS FLOOR. A boss must always be a real fight: no single
        // strike may take more than a third of one, so every boss needs at
        // least three correct answers — whatever the gear, whatever the
        // stance. Originally this capped only BRAVE strikes (the sim that
        // set it only walked the intended gear-per-dungeon ladder), until a
        // post-game replay one-shot the dungeon-2 boss with a plain strike
        // (playtest 2026-07-13): endgame attack against an early boss's
        // health needs the same cap for the same reason. Regular monsters
        // stay uncapped: flattening those IS earned power.
        if (mon.boss) dmg = Math.min(dmg, Math.ceil(mon.maxhp / 3));
        return { dmg, crit, brave, soothing: E.isSoothing() };
      },
      applyMonsterHit(m) {
        const dmg = E.rollMonsterHit(m.atk, frost[0] ? 2 : 0);
        frost[0] = false;
        s.hp -= dmg;
        return { dmg, dead: s.hp <= 0 };
      },
      // The FIRST counterattack of a battle can be skipped outright, by either
      // of two sources — a ranged weapon (you're simply out of reach) or the
      // Lullaby gem while soothing (it's already yawning). One flag, because
      // there is only ever one first counterattack; if a kid somehow has both,
      // they still get exactly one skip, and the message names the reason.
      freeFirstMiss() {
        if (freeMissUsed) return null;
        if (E.isRangedEquipped()) {
          freeMissUsed = true;
          return { float: 'OUT OF REACH!', msg: `🏹 ${MM.data.theMon(mon.name, true)} swings at empty air — you're out of reach!` };
        }
        if (E.isSoothing() && E.hasEnchant('lullaby')) {
          freeMissUsed = true;
          return { float: 'ALREADY YAWNING', msg: `🎐 ${MM.data.theMon(mon.name, true)} raises a claw, thinks better of it, and yawns instead.` };
        }
        return null;
      },
      playerHp: () => Math.max(0, s.hp),
      playerMaxHp: () => s.maxhp,
      playerAtkLabel: () => {
        const r = E.strikeRange();
        const b = s.brave ? 2 : 1;
        // v1.7.1: the word "calms" carries the stance — the tiny 🕊 was "too
        // small to see clearly" (playtest), so at this size, no dove
        const verb = E.isSoothing() ? 'calms' : '⚔️ strikes';
        return `${verb} ${r.min * b}–${r.max * b} per correct answer${s.brave ? ' ⚡' : ''}`;
      },
      playerDefLabel: () => `🛡️ blocks ${E.totalDef()}`,
      isRanged: () => E.isRangedEquipped(),
      rangedNote: () => E.rangedNote(),
    };
  };

  E.startCombat = function (mon) {
    MM.track('combat ' + mon.name);
    const s = E.state;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    // rare event: ~2% of regular monsters show up wearing a tiny hat.
    // Beating one earns +1 gold, for the hat. No one knows why.
    if (mon.hat == null) mon.hat = !mon.boss && Math.random() < 0.02;
    E.markSeen(mon);
    let retryUsed = false; // Ring of Retry: one second-try per battle
    const frostPending = [false]; // Frost gem: chills the monster's NEXT counterattack
    const begin = () => MM.battle.start(mon, {
      dungeonIndex: s.dungeonIndex,
      hooks: Object.assign(E.stanceHooks(mon, frostPending), {
        // regular monsters ask quick problems (pace!); bosses ask the big ones.
        // Expansion dungeons draw from every topic, weakest-first.
        pickProblem: () => {
          E.spendStamina(1); // each battle round is tiring
          if (mon.boss) {
            // `true` = this is a BOSS, so the ⚡ Brave stance may lift the tier.
            // Doors/chests/seals call these same pickers with no flag and are
            // never bumped — bravery pays in double damage, which only exists
            // in a fight, so a harder problem anywhere else would be a trap.
            if (task.spire) return MM.mastery.pickSpireGate(s, true);
            if (task.breakwater) return MM.mastery.pickBreakwaterGate(s, true);
            const mixed = task.mixed || E.isDeepWingFloor(s);
            return mixed ? MM.mastery.pickMixedGate(s, true) : MM.mastery.pickBossProblem(s, s.dungeonIndex, true);
          }
          // Wave 8a (P2, monster telegraphs): a mixed-dungeon monster bound
          // to a topic (mon.skill, its telegraph icon) asks THAT topic — the
          // icon over its head is a promise, not decoration. Falls back to
          // the general weakest-first pool if the parent has that topic
          // switched off (same "disabled everywhere" contract as capSkill).
          // Shared with E.tryOverwhelm so a one-shot problem always matches
          // what a real battle round would have asked.
          return E.pickRegularMonsterProblem(mon);
        },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() {
          if (retryUsed || !E.hasCharm('ring')) return false;
          retryUsed = true;
          return true;
        },
        // The Murk's two-phase twist: at 50% HP it "thickens" (+2 atk),
        // telegraphed via the same one-shot line the monster's entrance uses.
        afterStrike(m) {
          if (m.name === 'The Murk' && !m.thickened && m.hp > 0 && m.hp <= m.maxhp * 0.5) {
            m.thickened = true;
            m.atk += 2;
            return 'The fog presses closer... <b>the Murk thickens!</b> (+2 attack)';
          }
          return null;
        },
        victory(m) {
          return { lines: E.grantVictory(m, E.isSoothing()) };
        },
        onEnd(result) {
          s.seaLegs = false; // the fizz lasts one battle
          if (result.dead) return E.die();
          // Wave 8b: when a floor's boss falls — struck OR soothed — every
          // living friend in the room celebrates. The hostiles don't, and that
          // contrast IS the story, told in one glance.
          if (mon.boss && result.won) E.friendsCelebrate(mon, E.isSoothing());
          if (result.fled) {
            // Fleeing is always allowed (gentle failure) — but the monster
            // catches its breath and recovers FULLY, so running away can't be
            // used to skip problems or whittle a monster down for free.
            mon.stun = 1;
            mon.hp = mon.maxhp;
            // a phase-twisted boss resets with its health — the Murk's +2
            // "thicken" must not greet the rematch at full HP
            if (mon.thickened) { mon.thickened = false; mon.atk -= 2; }
            MM.ui.log(`🏃 You slip away — and ${MM.data.theMon(mon.name)} catches its breath. <b>It's back to full health!</b>`);
          }
          E.save();
          MM.ui.refresh();
          // the Murk can only ever be fought once (bossesDefeated blocks a
          // respawn), so this ending shows exactly once
          if (mon.boss && mon.name === 'The Murk' && !result.dead && !result.fled) {
            MM.ui.dialog('🗼 Keeper of the Light',
              `The lamp turns. Its beam sweeps the whole dark sea — and for the first time in nine years, the sea sweeps back, bright.<br><br>` +
              `Down in Port Brightwater, someone rings the harbor bell. Then someone else does. Soon every bell on the coast is going, and Keeper Callie ` +
              `is laughing and crying in exactly the way people do when both feel the same.<br><br>` +
              `"Keeper of the Light," she says, and it isn't a title she's making up on the spot — it's one that's been waiting.<br><br>` +
              `"The sea is <i>full</i> of islands, you know," Callie adds, watching the beam sweep past the dark water. "Full of them."`);
          }
        },
      }),
    });
    const tutorial = () => {
      if (s.seenBattleHelp) return begin();
      s.seenBattleHelp = true;
      E.save();
      const soothing = E.isSoothing();
      MM.ui.dialog('⚔️ Your first battle!',
        `Here's how battles work:<br><br>
         🗡 Each round you get a <b>math problem</b>. Answer <b>correctly</b> and you
         ${soothing ? '<b>calm the monster</b> — the tangle in it comes a little looser' : 'strike'}
         for <b>${E.strikeRange().min}–${E.strikeRange().max}</b> (your weapon decides how much).<br><br>
         👹 Then the monster ${soothing ? 'lashes out anyway — it is still tangled, and still frightened' : 'strikes back'}!
         Your <b>armor blocks</b> part of its damage — and if you answered correctly, you might <b>dodge</b> it completely.<br><br>
         ✗ A wrong answer means it <b>doesn't land</b> — but you'll be shown the solution,
         so you'll get it next time.<br><br>
         🔥 Answer streaks add bonus power, and at 5+ you can land <b>CRITICAL HITS</b>.<br><br>
         ${soothing
           ? '🕊 Every victory here is a <b>calming</b>: the monster settles down right where it is, becomes a friend, and its whole kind stops picking fights with you.'
           : '⚔️ Every victory clears the way — and the treasures, gold, and learning are yours.'}
         <i>(You chose your way at the door. The ⚙️ button can change it, any time.)</i><br><br>
         ⚡ <b>Brave</b> (in the battle) is for daredevils: the <b>hardest</b> questions, and every
         right answer counts <b>double</b>. Getting one wrong costs nothing extra.<br><br>
         🏃 You can always <b>flee</b> — but the monster <b>recovers all its health</b>
         while you run. Sticking with it is how you win!<br><br>
         Take your time — there are <b>no timers</b>. Good luck!<br><br>
         <i>Why do monsters come apart when you show your work? The Sage has theories.
         The monsters decline to comment.</i>`,
        begin);
    };
    // ---------- Wave 8b: the Ceremony ----------
    // Before their very first monster, the kid is ASKED how they'd like to face
    // the tangles. It is a question, not a class: it sets a starting stance and
    // a matching (identically-statted) starter instrument, and the sealing line
    // says out loud that it can be changed. There is no content behind either
    // door, nothing is locked, and nothing about the choice is ever measured.
    // (FINAL_REVIEW §5: never auto-detect or enforce which kid is which.)
    if (!s.seenCeremony) {
      s.seenCeremony = true;
      E.save();
      const choose = (stance, weaponId) => {
        s.stance = stance;
        if (weaponId && !s.gear.weapon.includes(weaponId)) s.gear.weapon.push(weaponId);
        if (weaponId) s.equipped.weapon = weaponId;
        E.save();
        MM.ui.dialog('🕯 Then that is how you begin',
          `${stance === 'soothe'
            ? 'The MathMaker hands you a <b>🎀 Ribbon Streamer</b>. "Gently, then. It works — I promise you it works. A tangle comes loose exactly as well as it comes apart."'
            : 'The MathMaker hands you a <b>🥢 Wooden Stick</b>. "Boldly, then. Go and meet it."'}
           <br><br>
           <i>"You can always change your way — the ⚙️ button remembers where I keep the question. Most heroes do, eventually."</i>`,
          tutorial);
      };
      return MM.ui.dialogChoices('🕯 Before your first monster',
        `The MathMaker stops you at the door.<br><br>
         "There is a thing in there, and it is <b>tangled</b> — that is all a monster has ever been. You will undo it with a
         worked answer either way; the arithmetic does not care how you hold yourself while you do it." He pauses.<br><br>
         <b>"So — how will you face the tangles: boldly, or gently?"</b>`,
        [
          { label: '⚔️ Boldly', primary: true, onClick: () => choose('strike', 'stick') },
          { label: '🕊 Gently', primary: true, onClick: () => choose('soothe', 'ribbon') },
        ]);
    }
    tutorial();
  };

  E.gainXp = function (amount) {
    const s = E.state;
    s.xp += amount;
    while (s.xp >= MM.data.xpForLevel(s.level)) {
      s.xp -= MM.data.xpForLevel(s.level);
      s.level++;
      E.recalcMaxHp();
      s.hp = s.maxhp;
      E.recalcMaxStamina();
      s.stamina = s.maxStamina; // a level-up is a second wind
      MM.ui.log(`⭐ Level up! You are now level ${s.level}. Max HP ${s.maxhp}, max stamina ${s.maxStamina}.`);
      MM.sound.levelup();
      if (MM.ui.worldBurst) MM.ui.worldBurst(s.px, s.py, '#7ee0e8', 16); // Wave 5 item 7
    }
  };

  E.die = function () {
    const s = E.state;
    const lost = Math.floor(s.gold / 2);
    s.gold -= lost;
    s.hp = s.maxhp;
    s.worldPos = null;
    MM.ui.log(`The world spins — the MathMaker's magic carries you home. (${lost} gold lost)`);
    E.enterWorld();
    E.save();
    MM.ui.dialog('😵 Rescued!',
      `Everything went dark — then you woke up outside the castle, patched up and breathing.<br><br>` +
      `The fall cost you <b>${lost} gold</b>, but you kept everything you learned. Rest at the inn 🛏 and try again!` +
      `<br><br><i>${MM.data.pick(MM.data.DEFEAT_LINES)}</i>`);
  };

  // ---------- doors and chests ----------
  E.mathDoor = function (x, y) {
    const s = E.state;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    const step = () => {
      const mixed = task.mixed || E.isDeepWingFloor(s);
      const skill = mixed ? null : MM.mastery.capSkill(s, task.skill);
      const prob = task.spire ? MM.mastery.pickSpireGate(s)
        : task.breakwater ? MM.mastery.pickBreakwaterGate(s)
        : mixed ? MM.mastery.pickMixedGate(s)
        : MM.problems.generate(skill, Math.max(2, MM.mastery.tierFor(s, skill)));
      MM.ui.showProblem({
        header: '🚪 <b>A magic lock seals this door.</b>',
        problem: prob,
        leaveLabel: 'Step away',
        onAnswer(correct, kidAnswer) {
          recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
          if (correct) {
            s.grid[y][x] = '.';
            s.opened[`${s.mapId}:${x},${y}`] = true;
            E.save();
            return { msg: 'The lock clicks open! ✨', end: 'win' };
          }
          return { msg: 'The lock holds fast. It offers you a new riddle...' };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    step();
  };

  // Clock door (Wave 3, the Clockwork Spire): a 'D' variant whose puzzle is
  // always an actual clock face to read. If a parent has switched
  // time_reading off, it falls back to the Spire's own mixed-review pool
  // instead (the "disabled everywhere" contract from the cap-leak test) —
  // the tile still opens, it just stops insisting on clocks specifically.
  E.clockDoor = function (x, y) {
    const s = E.state;
    const step = () => {
      const timeOn = MM.mastery.cappedSkills(s).includes('time_reading');
      const prob = timeOn
        ? MM.problems.generateClock(Math.max(2, MM.mastery.tierFor(s, 'time_reading')))
        : MM.mastery.pickSpireGate(s);
      MM.ui.showProblem({
        header: '⏰ <b>A clock door — read the time to open it.</b>',
        problem: prob,
        leaveLabel: 'Step away',
        onAnswer(correct, kidAnswer) {
          recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
          if (correct) {
            s.grid[y][x] = '.';
            s.opened[`${s.mapId}:${x},${y}`] = true;
            E.save();
            return { msg: 'The hands align — <b>tick!</b> ✨', end: 'win' };
          }
          return { msg: 'The hands drift back out of place. It offers you a new time...' };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    step();
  };

  // Echo door (Wave 4, the Resonant Halls): a pure memory puzzle, no math —
  // repeat a 3-5 tone sequence on the tone buttons. Always replayable.
  E.echoDoor = function (x, y) {
    const s = E.state;
    const len = 3 + Math.floor(Math.random() * 3); // 3-5 tones
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 5));
    MM.ui.showEchoDoor(seq, () => {
      s.grid[y][x] = '.';
      s.opened[`${s.mapId}:${x},${y}`] = true;
      E.save();
    });
  };

  // Two Wave-1 dungeons (the Great Lighthouse, the Smugglers' Vault) each
  // guarantee one glimmering gem chest, on top of the 6% random roll below.
  // (23,2) is the chest beside the chute landing — if a map edit moves these
  // chests, drive-enchant.js asserts every coordinate here still holds a '*'
  const GUARANTEED_GEM_CHESTS = {
    d17f3: [{ x: 23, y: 2 }], d18: [{ x: 15, y: 12 }], d19f4: [{ x: 36, y: 2 }],
    // Wave 5 Deep Wings — one guaranteed glimmering chest each
    d4f1: [{ x: 19, y: 8 }], d7f1: [{ x: 16, y: 7 }], d9f1: [{ x: 21, y: 9 }],
  };
  E.GUARANTEED_GEM_CHESTS = GUARANTEED_GEM_CHESTS; // exposed for that assert
  function isGuaranteedGemChest(mapId, x, y) {
    const list = GUARANTEED_GEM_CHESTS[mapId];
    return !!(list && list.some(p => p.x === x && p.y === y));
  }
  function gemLootMsg(gem) {
    MM.sound.fanfare();
    // Gems drop from any chest (6% roll) from dungeon 1, but fusing lives at
    // Emberlyn's in Port Brightwater — which doesn't exist for a mainland kid
    // until task 13 opens the pier. Naming an unreachable place reads as
    // broken (playtest 2026-07-12); before the pier, promise the future.
    const pierOpen = (E.state.tasksDone || []).includes(13);
    const hint = pierOpen
      ? 'Take it to Emberlyn in Port Brightwater to fuse it onto your gear!'
      : 'Tuck it away safe — far across the sea lives an enchanter who can fuse gems onto gear. One day, you\'ll sail there. ⛵';
    return `✨ <b>A glimmering chest!</b> Inside: a ${gem.emoji} <b>${gem.name} Gem</b> — <i>${gem.desc}</i>. ${hint}`;
  }

  // What's inside a chest? Gold usually — but also food, potions, treasures
  // to sell, a magical charm, or (rarely) a glimmering gem.
  function chestLoot(i, rewardGold) {
    const s = E.state;
    const roll = Math.random();
    if (roll < 0.06) {
      // most glimmering chests hold a gem; a rare few hold an amulet instead
      // (Emberlyn sells all three too — this is just a lucky shortcut)
      const unownedAmulets = MM.data.AMULETS.filter(a => !s.gear.amulet.includes(a.id));
      if (unownedAmulets.length && Math.random() < 0.15) {
        const a = MM.data.pick(unownedAmulets);
        E.ownGear('amulet', a.id);
        MM.sound.fanfare();
        return `✨ <b>A glimmering chest!</b> Inside: the ${a.emoji} <b>${a.name}</b> — <i>${a.bonus}</i>. It's in your 🎒 bag — equip it any time!`;
      }
      return gemLootMsg(E.awardGem());
    }
    if (roll < 0.40) {
      const g = E.gainGold(rewardGold);
      return `Inside: <b>${g} gold</b>! 💰`;
    }
    if (roll < 0.60) {
      const food = MM.data.FOODS[Math.floor(Math.random() * MM.data.FOODS.length)];
      s.items.food[food.id] = (s.items.food[food.id] || 0) + 1;
      return `Inside: a ${food.emoji} <b>${food.name}</b>! (Eat it from your 🎒 bag when you're tired.)`;
    }
    if (roll < 0.75) {
      s.potions++;
      const g = E.gainGold(Math.floor(rewardGold / 2));
      return `Inside: a ${MM.data.POTION.emoji} <b>Healing Potion</b> and <b>${g} gold</b>!`;
    }
    if (roll < 0.90) {
      const t = MM.data.treasureForDungeon(i);
      s.items.treasures.push(t.id);
      return `Inside: a ${t.emoji} <b>${t.name}</b>! The shopkeeper would pay <b>~${t.value} gold</b> for this.`;
    }
    const charm = E.awardCharm();
    if (charm) {
      MM.sound.fanfare();
      return `✨ Inside: <b>a magical charm!</b><br>${charm.emoji} <b>${charm.name}</b> — <i>${charm.desc}</i><br>` +
        (charm.worn ? 'You put it on right away!' : `<b>Your ${E.CHARM_SLOTS} charm slots are full</b> — swap charms in your 🎒 bag.`);
    }
    const t = MM.data.treasureForDungeon(Math.min(13, i + 1));
    s.items.treasures.push(t.id);
    return `Inside: a ${t.emoji} <b>${t.name}</b>! The shopkeeper would pay <b>~${t.value} gold</b> for this.`;
  }

  // Mimic reveal: the "chest" grins and a completely NORMAL battle starts —
  // same verbs (Strike/Soothe/Brave all work), same reward path. The mimic
  // stays in E._mimics until actually beaten or befriended (grantVictory
  // deletes it), so fleeing and re-bumping re-reveals the same mimic — it
  // can never quietly turn back into a free chest.
  E.MIMIC_CHANCE = 0.07; // per eligible chest until one hits; drives pin to 1
  E.revealMimic = function (x, y) {
    const s = E.state;
    const st = E.monsterStats(Math.min(s.dungeonIndex, 20), false);
    const card = MM.data.MIMIC_CARD;
    const mon = {
      name: card.name, sprite: card.sprite, pal: null, verb: card.verb,
      x, y, hp: st.hp, maxhp: st.hp, atk: st.atk, xp: st.xp,
      boss: false, stun: 0, behavior: 'guard', mimicChest: { x, y }, home: { x, y },
    };
    MM.ui.dialog('🎁 …a chest?',
      `The chest <b>grins</b>. Chests should not grin.<br><br>` +
      `<i>It looks absolutely delighted that someone finally knocked.</i>`,
      () => E.startCombat(mon));
  };

  E.chest = function (x, y) {
    const s = E.state;
    if (E._mimics && E._mimics.has(`${x},${y}`)) return E.revealMimic(x, y);
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    let reward = MM.data.chestGold(s.dungeonIndex);
    const step = () => {
      const prob = task.spire ? MM.mastery.pickSpireGate(s)
        : task.breakwater ? MM.mastery.pickBreakwaterGate(s)
        : (task.mixed || E.isDeepWingFloor(s)) ? MM.mastery.pickMixedGate(s)
        : MM.problems.generate(MM.mastery.capSkill(s, task.skill), 3);
      MM.ui.showProblem({
        header: '🎁 <b>A treasure chest with a puzzle lock!</b> <i>(tricky — take your time)</i>',
        problem: prob,
        leaveLabel: 'Leave it for now',
        onAnswer(correct, kidAnswer) {
          recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
          if (correct) {
            s.grid[y][x] = '.';
            s.opened[`${s.mapId}:${x},${y}`] = true;
            // the Smugglers' Vault's guarded chest: a guaranteed find, not a
            // random roll — the game's first ranged weapon
            let msg;
            const gemsBefore = (s.items.gems || []).length;
            if (s.dungeonIndex === 18 && x === 13 && y === 3 && !s.gear.weapon.includes('crossbow')) {
              E.ownGear('weapon', 'crossbow');
              const cur = E.equippedItem('weapon');
              const cross = MM.data.weaponById('crossbow');
              if (!cur || cross.atk > cur.atk) E.equip('weapon', 'crossbow');
              msg = `🏹 Inside: the <b>Smuggler's Crossbow</b>! No ammo, no aiming — just range: a monster's round-1 counterattack always misses.`;
            } else if (isGuaranteedGemChest(s.mapId, x, y)) {
              msg = gemLootMsg(E.awardGem());
            } else {
              msg = chestLoot(s.dungeonIndex, reward);
            }
            // Wave 5 item 2: "open a glimmering chest" bounty — any chest
            // that actually yielded a gem counts, guaranteed or the 6% roll
            if ((s.items.gems || []).length > gemsBefore) E.bountyEvent('gemchest');
            MM.sound.coin();
            E.save();
            return { msg, end: 'win' };
          }
          reward = Math.max(5, Math.floor(reward / 2));
          return { msg: `The chest jams and reshuffles its lock. (Its gold shrinks to ${reward}...)` };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    step();
  };

  // Sell a treasure at the shop (a correct money problem earns +10%).
  E.sellTreasure = function (index) {
    MM.track('sellTreasure ' + index);
    const s = E.state;
    const id = s.items.treasures[index];
    const t = MM.data.treasureById(id);
    if (!t) return;
    // Ring of Sea Luck: the shopkeeper pays a premium for treasures
    const value = Math.round(t.value * (E.hasRing('sealuck') ? 1.2 : 1));
    if (!E.moneyQuizOn()) { // money-math topic disabled: no quiz
      s.items.treasures.splice(index, 1);
      const paid = E.gainGold(value);
      E.shelveItem(t);
      MM.sound.coin();
      E.save();
      return MM.ui.dialog('🏪 Shop', `You sell the ${t.emoji} <b>${t.name}</b> for <b>${paid} gold</b>!`, () => MM.ui.openShop());
    }
    const g = s.gold, v = value;
    const prob = {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: `The shopkeeper turns the ${t.name} over in her hands. "I'll pay ${v} gold. Quick one for a bonus: you have ${g} gold now — how much will you have after I pay you?"`,
      answer: MM.problems.frac(g + v, 1),
      solution: `${g} + ${v} = ${g + v} gold.`,
    };
    MM.ui.showProblem({
      header: `🏪 Selling: ${t.emoji} <b>${t.name}</b> — worth ${v} gold`,
      problem: prob,
      leaveLabel: 'Keep it',
      onAnswer(correct, kidAnswer) {
        recordAnswer('word_problems', correct, { text: prob.text, kidAnswer });
        const bonus = correct ? Math.ceil(v * 0.1) : 0;
        s.items.treasures.splice(index, 1);
        const paid = E.gainGold(v + bonus);
        E.shelveItem(t);
        MM.sound.coin();
        E.save();
        return {
          msg: correct
            ? `"Sharp! Here's <b>${paid} gold</b> — that's a ${bonus}-gold bonus for quick arithmetic." 🎉`
            : `"It's ${g + v}, dear. Here's your <b>${paid} gold</b>."`,
          end: 'win',
        };
      },
      onNext: () => {},
      onEnd() { MM.ui.openShop(); },
    });
  };

  // ---------- townsfolk ----------
  E.talkNpc = function (ch) {
    const s = E.state;
    const npc = MM.data.NPCS[ch];
    if (npc.arena) return E.miscountArena();
    if (npc.enchant) return MM.ui.enchanterDialog();
    if (npc.court) return E.holdCourt();      // Wave 14: the Court Herald
    if (npc.study) return E.studyReveal();   // Wave 7: the MathMaker & Miscount
    // Wave 7 epilogue: Pip has stopped collecting riddles and started
    // GIVING them. The kid taught somebody, without ever meaning to.
    if (npc.riddle && s.endingDone) {
      return MM.ui.dialog(npc.name,
        '"I run the riddle contest now!" Little Pip is standing on a crate, so as to be taken seriously. ' +
        'It is working. There are <b>four</b> other children sitting in front of the crate.<br><br>' +
        '"I do the hard one at the end and then I show everyone <b>how it works</b>, because—" Pip goes slightly ' +
        'shy for the first time in recorded history "—because that\'s the bit that\'s actually good. You know?"<br><br>' +
        '<i>You know.</i>');
    }
    if (!npc.riddle) return MM.ui.dialog(npc.name, npc.talk(s));

    // Little Pip's riddle: one per task, small gold prize, no penalty
    s.pipAsked = s.pipAsked || {};
    if (s.pipAsked[s.taskIndex]) {
      return MM.ui.dialog(npc.name,
        '"That was my best riddle for now — I\'m still making up the next one! Come back after your next task. Race you to the castle! ...okay you win, your legs are longer."');
    }
    const prob = MM.problems.generate(MM.mastery.capSkill(s, 'word_problems'), 1);
    MM.ui.showProblem({
      header: `${npc.name} — <i>"Bet you can't get my riddle! Winner gets my allowance!"</i>`,
      problem: prob,
      leaveLabel: 'Maybe later, Pip',
      onAnswer(correct, kidAnswer) {
        recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
        s.pipAsked[s.taskIndex] = true;
        E.save();
        if (correct) {
          const g = E.gainGold(4);
          MM.sound.coin();
          return { msg: `"WHOA. Nobody ever gets that one!" Pip solemnly hands over <b>${g} gold</b> in sticky coins.`, end: 'win' };
        }
        return { msg: '"Ha! Got you! That means I keep my allowance." Pip does a little victory dance, then whispers: <i>"...you can try again after your next task."</i>', end: 'win' };
      },
      onNext: () => {},
      onEnd() { MM.ui.refresh(); },
    });
  };

  // ---------- Miscount's bank: sparring arena + the expansion tasks ----------
  E.miscountArena = function () {
    const s = E.state;
    const L = (s.sparWins || 0) + 1;
    const curTask = s.taskIndex >= 11 && s.taskIndex <= 13 ? MM.data.TASKS[s.taskIndex - 1] : null;

    // returning a quest item takes priority over everything
    if (s.haveItem && curTask && curTask.exp) return E.miscountTurnIn();

    let greeting;
    if (!s.metMiscount) {
      greeting = `"You came!" Miscount beams. "The MathMaker took me back as his student. I'm re-learning everything — <b>properly</b> this time, step by step."<br><br>
        "Two things, if you're willing! We can <b>spar</b> — I conjure Homework Golems with quick questions from every topic, tougher each time you win. And..." he hesitates, "...there are some <b>things I need to put right</b>. I'd be honored to have your help."`;
    } else if (curTask) {
      greeting = `"The <b>${curTask.item}</b> is still out there — in the <b>${curTask.dungeon}</b>. No rush. Or we could spar! Golem <b>${L}</b> is ready when you are."`;
    } else if (s.endingDone) {
      // Wave 7 epilogue: Miscount teaches now. It is the whole point of him.
      // Must be tested BEFORE the taskIndex>13 branch — by the time the ending
      // is done, taskIndex is always past 13, and this would never fire.
      greeting = MM.data.pick(MM.data.MISCOUNT_EPILOGUE);
    } else if (s.isles.gullwrackRebuilt) {
      // Wave 10 (P2, reactive cast): Miscount hears about the isles the same
      // way the mainland does — after the fact, by reputation. Ordered
      // most-advanced-flag-first, like the rest of the cast.
      greeting = `"A whole town, put back stone by stone." Miscount shakes his head, admiring. "Slower than magic. Sturdier, too, I'd bet." Golem <b>${L}</b>, if you're up for it.`;
    } else if (s.isles.hallsDone) {
      greeting = `"They found room for the one voice that didn't fit." Miscount smiles like that sentence means several things at once. "Good. Everybody deserves finding room." Golem <b>${L}</b> is ready when you are.`;
    } else if (s.isles.spireDone) {
      greeting = `"A clock that stopped, wound again." Miscount goes quiet a moment. "I know a bit about that." Then, brighter: "Golem <b>${L}</b>'s ready, if you'd rather not talk about clocks."`;
    } else if (s.isles.lampLit) {
      greeting = `"The lighthouse, they tell me!" Miscount says it like the news physically relieved him. "Something in me still doesn't love the dark. Glad someone's tending it better than I did." Golem <b>${L}</b> awaits.`;
    } else if (s.taskIndex > 13) {
      greeting = `"Everything's back where it belongs, thanks to you." Miscount smiles up at the peak, where the Star glitters. "So now we just... practice. Golem <b>${L}</b> awaits, champion."`;
    } else {
      greeting = MM.data.pick(MM.data.MISCOUNT_SMALLTALK);
    }
    s.metMiscount = true;

    const buttons = [{ label: `⚔️ Spar! (Golem Lv ${L})`, primary: true, onClick: () => E.startArenaBattle(L) }];
    if (curTask) {
      buttons.push({ label: `📜 About the ${curTask.item}...`, onClick: () => E.miscountAssign() });
    }
    // Wave 8b (P4): the Academy. Judging someone ELSE's work is the safest
    // practice there is for a kid who fears her own mistakes — the error is
    // Miscount's, finding it is a kindness, and "it's correct!" is always a
    // live answer. It opens the moment he becomes a teacher (task 10), a whole
    // act before the final exam it was originally locked behind.
    if (E.academySkills().length) {
      const done = E.academyDoneToday();
      buttons.push({
        label: done ? '📝 Homework (all marked today)' : "📝 Check my students' homework",
        onClick: () => E.academy(),
      });
    }
    // Wave 5 item 4: rematch any boss you've ever beaten, at +20% stats
    if (Object.keys(s.bossesDefeated || {}).length) {
      buttons.push({ label: "🏆 Champion's Gauntlet", onClick: () => E.gauntletMenu() });
    }
    buttons.push({ label: 'Later, Miscount', onClick: () => {} });
    MM.ui.dialogChoices('🧑‍🎓 Miscount', greeting, buttons);
  };

  // Every boss ever beaten, deduped by dungeon index (a boss's mapId key
  // carries an optional floor suffix — 'd17f3' vs 'd18' — that doesn't
  // matter here, only which dungeon/roster it maps back to).
  E.gauntletBosses = function () {
    const s = E.state;
    const seen = new Set();
    const out = [];
    for (const mapId of Object.keys(s.bossesDefeated || {})) {
      const m = mapId.match(/^d(\d+)(?:f\d+)?$/);
      if (!m) continue;
      const idx = +m[1];
      if (seen.has(idx)) continue;
      seen.add(idx);
      const roster = MM.data.MONSTERS[idx - 1];
      const task = MM.data.TASKS[idx - 1];
      if (!roster || !task) continue;
      out.push({ idx, name: roster.boss.name, dungeon: task.dungeon });
    }
    return out.sort((a, b) => a.idx - b.idx);
  };

  E.gauntletMenu = function () {
    const s = E.state;
    const bosses = E.gauntletBosses();
    const won = (s.bestiary && s.bestiary.gauntlet) || {};
    const buttons = bosses.map(b => ({
      label: `${won[b.name] ? '👑✨ ' : '⚔️ '}${b.name} (${b.dungeon})`,
      onClick: () => E.startGauntletBattle(b.idx),
    }));
    buttons.push({ label: 'Never mind', onClick: () => E.miscountArena() });
    MM.ui.dialogChoices("🏆 Champion's Gauntlet",
      'Every boss you\'ve ever beaten, back for a rematch — <b>+20% tougher</b> this time. ' +
      'Win once and 👑✨ marks that boss\'s card in your Monster Book, forever.',
      buttons);
  };

  // A rematch, not the original story fight: no quest items, no lens/lamp/
  // spire/chime flags, no s.bossesDefeated bookkeeping — those all belong
  // to the FIRST victory only. Modeled on E.startArenaBattle, not
  // E.startCombat (whose victory() branches on s.dungeonIndex/s.mapId at
  // the moment the dialog was opened — stale values here, since the player
  // triggers this from an overworld NPC, not from inside dungeon `idx`).
  E.startGauntletBattle = function (idx) {
    const s = E.state;
    const roster = MM.data.MONSTERS[idx - 1];
    const b = roster.boss;
    const base = MM.data.monsterStats(idx, true);
    const mon = {
      name: b.name, sprite: b.sprite, pal: b.pal, verb: b.verb,
      hp: Math.round(base.hp * 1.2), maxhp: Math.round(base.hp * 1.2),
      atk: Math.round(base.atk * 1.2), xp: base.xp, gold: base.gold,
      boss: true, stun: 0, behavior: 'chase', gauntlet: true,
    };
    E.markSeen(mon);
    let retryUsed = false;
    const frostPending = [false];
    MM.battle.start(mon, {
      dungeonIndex: idx,
      hooks: Object.assign(E.stanceHooks(mon, frostPending), {
        // mirrors the exact branching E.mathDoor/startCombat use for this
        // dungeon's TASKS entry — a mixed/isle/Spire boss's rematch must
        // draw from the same pool the real fight would, not a null skill
        pickProblem: () => {
          E.spendStamina(1);
          const t = MM.data.TASKS[idx - 1];
          // a rematch is still a boss fight — the ⚡ Brave stance applies
          if (t.spire) return MM.mastery.pickSpireGate(E.state, true);
          if (t.breakwater) return MM.mastery.pickBreakwaterGate(E.state, true);
          return t.mixed ? MM.mastery.pickMixedGate(E.state, true) : MM.mastery.pickBossProblem(E.state, idx, true);
        },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() { if (retryUsed || !E.hasCharm('ring')) return false; retryUsed = true; return true; },
        victory() {
          E.recordKill(mon);
          if (E.isSoothing() && E.recordBefriend(mon)) {
            (s.pendingBadges = s.pendingBadges || []).push({ befriend: E.beastKey(mon), sprite: mon.sprite, pal: mon.pal || null });
          }
          s.bestiary.gauntlet = s.bestiary.gauntlet || {};
          const firstWin = !s.bestiary.gauntlet[mon.name];
          s.bestiary.gauntlet[mon.name] = true;
          // half reward of a fresh kill — this is a trophy fight, not a first clear
          const gold = E.gainGold(Math.round(mon.gold * 0.5));
          const xp = Math.round(mon.xp * 0.5);
          const levelsBefore = s.level;
          E.gainXp(xp);
          const lines = [`⭐ +${xp} XP`, `💰 +${gold} gold`];
          if (s.level > levelsBefore) lines.push(`🎺 <b>LEVEL UP!</b> You are now level ${s.level}`);
          lines.push(firstWin
            ? `👑✨ <b>Trophy earned!</b> ${mon.name}'s card in your 📕 Monster Book is marked for good.`
            : `👑 ${mon.name}, bested again.`);
          petFetch(lines);
          E.save();
          return { lines };
        },
        onEnd(result) {
          if (result.dead) return E.die();
          E.save();
          MM.ui.refresh();
        },
      }),
    });
  };

  // ---------- Wave 8b (P4): Miscount's Academy ----------
  // 2-3 slates a real day, like the notice board. Small gold. No fail state at
  // all — a wrong mark just shows you which step it really was, and you may
  // keep going. Parent-cap aware: the slates only ever come from topics the
  // family has switched ON (spotTheError has no slate for time_reading or
  // music_reading — you READ a clock, you don't derive it — so if a parent has
  // ONLY those enabled, the menu entry doesn't appear at all rather than
  // quietly serving a disabled topic).
  const ACADEMY_SLATES = 3;
  E.academySkills = function () {
    const s = E.state;
    if (!s || s.taskIndex < 10) return [];      // he is only a teacher after his redemption
    const allowed = MM.mastery.cappedSkills(s);
    return MM.problems.spotTheError.skills().filter(sk => allowed.includes(sk));
  };
  E.academyDoneToday = function () {
    const s = E.state;
    return !!(s.academy && s.academy.date === E.todayStr() && s.academy.done >= ACADEMY_SLATES);
  };
  E.academy = function () {
    const s = E.state;
    const skills = E.academySkills();
    if (!skills.length) return;
    if (!s.academy || s.academy.date !== E.todayStr()) s.academy = { date: E.todayStr(), done: 0 };
    if (E.academyDoneToday()) {
      return MM.ui.dialog('📝 The Academy',
        '"All marked, and marked well." Miscount stacks the slates with enormous care. ' +
        '"They\'ll have fresh ones for you tomorrow — they always do."',
        () => E.miscountArena());
    }
    // weakest-first, so the homework quietly steers practice where it helps
    const ranked = MM.mastery.weakestFirst(s, skills);
    let n = s.academy.done;
    const step = () => {
      const skill = ranked[n % Math.min(3, ranked.length)];
      // a real coin-flip: a clean slate is always a live possibility, so the kid
      // can never just hunt for an error and be right by default
      const prob = MM.problems.spotTheError(skill, Math.random() < 0.6);
      if (!prob) return MM.ui.refresh();
      MM.ui.showProblem({
        header: `📝 <b>Homework — slate ${n + 1} of ${ACADEMY_SLATES}</b><br>` +
          `<span class="dim">${MM.data.SKILL_NAMES[skill]}. Which step went wrong — or is every step right?</span>`,
        problem: prob,
        leaveLabel: 'Set down the chalk',
        onAnswer(correct) {
          // The Academy is MARKING, not being marked: like the final exam, it
          // never touches mastery or badges. The kid is the grader here.
          n++;
          s.academy.done = n;
          // Wave 9 (P4): lifetime attendance — never resets, grows the room
          // (MM.data.academyGrowthLine) and the Hall of Heroes plaque.
          s.academyTotal = (s.academyTotal || 0) + 1;
          const last = n >= ACADEMY_SLATES;
          let msg = correct
            ? (prob.badStep < 0 ? MM.data.pick(MM.data.ACADEMY_CLEAN) : MM.data.pick(MM.data.ACADEMY_CAUGHT))
            : (prob.badStep < 0
              ? '<i>"Look again — that one really does hold up. Every step of it."</i>'
              : `<i>${MM.data.pick(MM.data.ACADEMY_MISSED)} "<b>Step ${prob.badStep + 1}.</b> ${prob.why}"</i>`);
          if (last) {
            const gold = E.gainGold(6 + 2 * Math.min(10, s.taskIndex));
            msg += `<br><br>🧑‍🎓 "That's the lot. Here —" he presses <b>${gold} gold</b> into your hand — ` +
              `"marking is work, and work gets paid."`;
            MM.sound.fanfare();
          }
          E.save();
          return { msg, end: last ? 'win' : undefined };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    // Wave 9 (P4): the room visibly grows with attendance — one line, shown
    // every visit, so returning kids actually SEE the desks accumulate.
    const growth = MM.data.academyGrowthLine(s.academyTotal || 0);
    // v1.7.0: Tales of the Guessing Years — post-ending only (pre-ending he
    // is still tender about it), an occasional rotating aside before the
    // day's slates. Self-told only: only Miscount laughs at his own past.
    const tale = (s.endingDone && Math.random() < E.GUESS_TALE_CHANCE)
      ? `<br><br><i>${MM.data.pick(MM.data.MISCOUNT_GUESS_TALES)}</i>` : '';
    MM.ui.dialog('📝 The Academy', `${MM.data.pick(MM.data.ACADEMY_INTRO)}${tale}<br><br><span class="dim">${growth}</span>`, step);
  };

  E.miscountAssign = function () {
    const s = E.state;
    const t = MM.data.TASKS[s.taskIndex - 1];
    MM.ui.dialog(`🧑‍🎓 Miscount — Task ${s.taskIndex} of 13`,
      `${t.assign}<br><br><i>The ${t.dungeon} is marked <b>${s.taskIndex}</b>, here on the east bank.</i>`);
  };

  E.miscountTurnIn = function () {
    const s = E.state;
    const t = MM.data.TASKS[s.taskIndex - 1];
    const reward = MM.data.taskReward(s.taskIndex);
    s.haveItem = false;
    s.tasksDone.push(s.taskIndex);
    if (s.tasksDone.length <= MM.data.TURNING_STONES.length) s.spiralGlintPending = s.tasksDone.length - 1;
    const gold = E.gainGold(reward.gold);
    E.gainXp(reward.xp);
    s.taskIndex++;
    E.save();
    MM.sound.fanfare();
    if (s.taskIndex > 13) {
      return MM.ui.dialog('⭐ Every wrong thing, put right',
        `${t.itemEmoji} ${t.done}<br><br>Your reward: <b>${gold} gold</b> and <b>${reward.xp} XP</b>.<br><br>` +
        `<hr>🌟 <i>That evening, the MathMaker crosses the bridge with a picnic basket. The three of you watch the ` +
        `Star of Numeria rise over the peak.</i><br><br>"You know what I've learned?" says Miscount. ` +
        `"Every problem — <b>every single one</b> — can be worked out, one careful step at a time."<br><br>` +
        `<i>Miscount's golems will keep training with you as long as you like. Numeria is truly at peace.</i> 🎉`);
    }
    const next = MM.data.TASKS[s.taskIndex - 1];
    return MM.ui.dialog(`🧑‍🎓 Task ${s.taskIndex - 1} of 13 complete!`,
      `${t.itemEmoji} ${t.done}<br><br>Your reward: <b>${gold} gold</b> and <b>${reward.xp} XP</b>.` +
      (t.story ? `<br><br><i>${t.story}</i>` : '') +
      `<br><br><hr>📜 <b>Miscount's next request:</b><br>${next.assign}`);
  };

  E.startArenaBattle = function (L) {
    const s = E.state;
    const i = 10 + L;
    const m = E.diffMult();
    const st = {
      hp: Math.max(1, Math.round((6 + 3 * i) * m.hp)),
      atk: Math.max(1, Math.round((1 + Math.ceil(i * 0.5)) * m.atk)),
    };
    const mon = {
      name: `Homework Golem Lv ${L}`, sprite: 'golem',
      pal: { A: '#c4c8d4', B: '#9aa0b0', m: '#767c8c', W: '#e8ecf4', E: '#7ee0e8' },
      verb: 'bonks', hp: st.hp, maxhp: st.hp, atk: st.atk,
      boss: false, arena: true, stun: 0,
      hat: Math.random() < 0.02, // even golems enjoy a tiny hat
    };
    E.markSeen(mon);
    let retryUsed = false;
    const frostPending = [false];
    MM.battle.start(mon, {
      dungeonIndex: 9, // wizard-tower purples for the sparring stage
      hooks: Object.assign(E.stanceHooks(mon, frostPending), {
        pickProblem: () => { E.spendStamina(1); return MM.mastery.pickArenaProblem(s); },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() {
          if (retryUsed || !E.hasCharm('ring')) return false;
          retryUsed = true;
          return true;
        },
        victory() {
          E.recordKill(mon);
          // A soothed Homework Golem is befriended like anything else — and it
          // is a golem conjured FROM homework, so it takes this extremely well.
          if (E.isSoothing() && E.recordBefriend(mon)) {
            (s.pendingBadges = s.pendingBadges || []).push({ befriend: E.beastKey(mon), sprite: mon.sprite, pal: mon.pal || null });
          }
          E.bountyEvent('spar');
          s.sparWins = L;
          const gold = E.gainGold(8 + 4 * L), xp = 10 + 2 * L;
          const levelsBefore = s.level;
          E.gainXp(xp);
          const lines = [`⭐ +${xp} XP`, `💰 +${gold} gold`];
          if (mon.hat) { s.gold += 1; s.hatsRetired = (s.hatsRetired || 0) + 1; lines.push('🎩 +1 gold — for the tiny hat.'); }
          if (s.level > levelsBefore) lines.push(`🎺 <b>LEVEL UP!</b> You are now level ${s.level}`);
          // every third golem coughs up a magical charm (until you own all six)
          if (L % 3 === 0) {
            const charm = E.awardCharm();
            if (charm) lines.push(`✨ The golem drops something! ${charm.emoji} <b>${charm.name}</b> — <i>${charm.desc}</i>` +
              (charm.worn ? ' (worn!)' : ' (in your 🎒 bag — you can wear three)'));
          }
          // a rare gem, independent of the every-third-win charm
          if (Math.random() < 0.08) {
            const gem = E.awardGem();
            lines.push(`✨ The golem sparkles and drops a ${gem.emoji} <b>${gem.name} Gem</b> — take it to Emberlyn!`);
          }
          lines.push(`🧑‍🎓 Miscount applauds: "Golem <b>${L}</b> down! Level <b>${L + 1}</b> will be waiting..."`);
          petFetch(lines);
          E.save();
          return { lines };
        },
        onEnd(result) {
          s.seaLegs = false;
          if (result.dead) return E.die();
          E.save();
          MM.ui.refresh();
        },
      }),
    });
  };

  // ---------- the pier: gateway to the Uncharted Isles (Level 2) ----------
  // The ship only stops for a hero who has finished all thirteen tasks.
  E.pier = function () {
    MM.track('pier');
    const s = E.state;
    if (!s.tasksDone.includes(13)) {
      return MM.ui.dialog('⚓ The Old Pier',
        'A weathered pier juts into the western sea. Far out, a ship with compass-rose sails tacks past without stopping.<br><br>' +
        '<i>Captains only stop for proven heroes, they say. Finish every task — all thirteen — and watch the horizon.</i>');
    }
    const greeting = s.isles.lenses.tidepool
      ? '"The <b>Tide Lens</b> burns bright — the Murk\'s already pulling back from the shallows!" The captain grins. ' +
        '"The grotto\'s still crawling, if you fancy the exercise. And once my charts are redrawn, there\'s a whole ' +
        '<b>archipelago</b> out there waiting for you, hero."'
      : '"So you\'re the one who brought Miscount home." The captain of the <b>Compass Rose</b> tips her hat. ' +
        '"The <b>Uncharted Isles</b> could use that kind of stubborn. Their lighthouses went dark years ago, and a fog ' +
        'called the <b>Murk</b> has grown thick in the dark. First stop: the <b>Tidepool Grotto</b> — its <b>Tide Lens</b> ' +
        'is down there somewhere. Mind the crabs. And <i>count your gold around the gulls.</i>"';
    MM.ui.dialogChoices('⛵ The Compass Rose', greeting, [
      { label: '⛵ Sail to the Isles', primary: true, onClick: () => E.boardShip() },
      { label: 'Stay ashore', onClick: () => {} },
    ]);
  };

  // First voyage only: Miscount catches you at the gangplank with three eggs.
  E.boardShip = function () {
    const s = E.state;
    if (s.isles.egg || s.isles.pet) return E.sail('isles');
    const pick = color => () => { s.isles.egg = color; E.save(); E.sail('isles'); };
    MM.ui.dialogChoices('🧑‍🎓 Miscount, out of breath',
      '"WAIT! Before you sail—" Miscount skids down the pier, holding a basket like it\'s made of glass. ' +
      'Inside: <b>three speckled eggs</b>.<br><br>"I found them while I was... confused. They never hatched for me. ' +
      'Not once, not ever." He holds the basket out. "Take one. Maybe it was waiting for someone who <b>shows their work</b>."',
      [
        { label: '🥚 The blue egg', onClick: pick('blue') },
        { label: '🥚 The green egg', onClick: pick('green') },
        { label: '🥚 The rose egg', onClick: pick('rose') },
      ]);
  };

  // ---------- Wave 9 (P2): the Spiral Stair ----------
  // Post-game volume, castle-adjacent. Explicitly NOT a roguelike: nothing
  // is ever lost on the way back down, Beacon and Rope both already work
  // (they only need E.inDungeon(), true for any 'd'-prefixed mapId — see
  // MM.maps.SPIRAL_INDEX's floor naming), and returning to your highest
  // landing costs nothing.
  E.spiralOpen = () => !!(E.state && E.state.endingDone);

  E.enterSpiral = function (n) {
    E.enterDungeon(MM.maps.SPIRAL_INDEX, n - 1);
  };

  E.spiralMenu = function () {
    const s = E.state;
    // Wave 13 (P3): delivering the homesick staircase — once ever, and then
    // the tower remembers (the ⤴ option below, permanently).
    if (s.spiral && s.spiral.staircase === 'following' && s.mapId === 'world') {
      return E.stairHomecoming();
    }
    if (!E.spiralOpen()) {
      return MM.ui.dialog('🌀 The Spiral Stair', MM.data.SPIRAL_SEALED(s));
    }
    const buttons = [];
    buttons.push({
      label: '🌀 Climb from Floor 1', primary: !s.spiral.landing,
      onClick: () => E.enterSpiral(1),
    });
    if (s.spiral.landing > 0) {
      buttons.push({
        label: `🏳 Return to your Landing (Floor ${s.spiral.landing})`, primary: true,
        onClick: () => E.enterSpiral(s.spiral.landing),
      });
    }
    if (s.spiral.staircase === 'home') {
      buttons.push({
        label: '⤴ Start from floor 10 (it knows a shortcut)',
        onClick: () => E.enterSpiral(10),
      });
    }
    buttons.push({ label: 'Not now', onClick: () => {} });
    MM.ui.dialogChoices('🌀 The Spiral Stair', MM.data.SPIRAL_INTRO, buttons);
  };

  // ---------- v1.7.0: the Turning Stones' sequence walk ----------
  // Stepping on the 13 courtyard stones in path order (center outward)
  // chimes a rising tone per stone; the full walk done in order is a small
  // ONCE-EVER flourish. Out of order: total silence, no scold, no reset
  // message — pure discovered wonder, never hinted anywhere in the game.
  E.spiralStoneStep = function (idx) {
    const s = E.state;
    if (idx === 0) { // the center stone always (re)starts an attempt
      s.spiralWalkNext = 1;
      MM.sound.tone(0);
      return;
    }
    if (idx === (s.spiralWalkNext || 0)) {
      MM.sound.tone(idx);
      s.spiralWalkNext = idx + 1;
      if (s.spiralWalkNext >= MM.data.TURNING_STONES.length) {
        s.spiralWalkNext = 0;
        if (!s.seenSpiralWalk) {
          s.seenSpiralWalk = true;
          if (MM.ui.worldBurst) MM.ui.worldBurst(s.px, s.py, '#ffd94a', 20);
          MM.sound.fanfare();
          MM.ui.log('✨ <i>Something in the courtyard settles into place, just for a moment.</i>');
        }
        // The Stair glimmer: the FIRST in-order walk completed while the
        // ending is already done — tracked independently of the once-ever
        // flourish above, so a kid who solved this puzzle BEFORE finishing
        // the game still gets the callback the first time it happens after.
        if (s.endingDone && !s.seenStairGlimmer) {
          s.seenStairGlimmer = true;
          E.stairGlintUntil = performance.now() + 2200;
        }
        E.save();
      }
      return;
    }
    s.spiralWalkNext = 0; // out of order: silent reset, never a failure
  };
  E.stairGlinting = () => !!(E.stairGlintUntil && performance.now() < E.stairGlintUntil);

  // The newly-turned stone glints once, the next time the kid actually
  // crosses the plaza (not the instant the task completes, which could be
  // anywhere on the map) — same "notice the CHANGE" idea as the gear-gate
  // glint recipe. Checked on every mainland step (E.walkStamina).
  E.checkSpiralGlint = function () {
    const s = E.state;
    if (!s || s.mapId !== 'world' || s.spiralGlintPending == null) return;
    // The true golden spiral sweeps clear across the overworld — there is no
    // single "plaza" to stand in any more. The glint arms whenever the kid
    // is within 3 tiles of ANY stone on the curl.
    const near = MM.data.TURNING_STONES.some(st => Math.abs(s.px - st.x) <= 3 && Math.abs(s.py - st.y) <= 3);
    if (!near) return;
    E.spiralGlintIndex = s.spiralGlintPending;
    E.spiralGlintUntil = performance.now() + 1800;
    s.spiralGlintPending = null;
    E.save();
  };
  E.spiralStoneGlinting = idx => !!(E.spiralGlintUntil && idx === E.spiralGlintIndex && performance.now() < E.spiralGlintUntil);

  // Reaching the top of the Spiral Stair (floor SPIRAL_MAX_FLOOR) — once ever,
  // the "endless"-feeling climb gets a real destination: a moment, a title,
  // and a reward, so a kid who grinds all the way up isn't met with silence.
  E.spiralSummit = function () {
    const s = E.state;
    if (!s.spiral || s.spiral.toppedOut) return;
    s.spiral.toppedOut = true;
    const gold = E.gainGold(300);
    E.save();
    MM.sound.fanfare();
    if (MM.ui.worldBurst) {
      const cols = ['#ffd94a', '#7ee0e8', '#e0c24a', '#fff6d8'];
      for (let i = 0; i < 4; i++) MM.ui.worldBurst(s.px, s.py, cols[i], 20);
    }
    MM.ui.dialog('🌀 The Top of the Spiral',
      `<i>You climb the last step — and there is no next one.</i><br><br>` +
      `Just open sky, and the whole of Numeria spread out far, far below: the castle, the harbor, the isles ` +
      `like stepping-stones out to the edge of the world. You have climbed as high as the stair goes. ` +
      `<b>Floor ${MM.maps.SPIRAL_MAX_FLOOR}.</b> The very top.<br><br>` +
      `<i>"Sixty floors," you can almost hear the MathMaker say. "One careful step at a time, all sixty. ` +
      `Of course you did."</i><br><br>` +
      `From this day you are <b>Top of the Spiral</b>. <span class="dim">(+${gold} gold — and the climb down is all downhill.)</span>`);
  };

  // ---------- v1.7.0: bosses attack with wrong math ----------
  // Canon completion: monsters are tangles (disorder where working
  // stopped); now disorder ATTACKS by asserting falsehoods. Presentation
  // only — damage is unaffected, and the kid's own problem selection stays
  // full-depth adaptive as always. PEDAGOGY GUARD (imprint risk): the wrong
  // value must never be plausible — always truth × 4..12 or truth plus/minus
  // several hundred, NEVER within 30% of truth and never an off-by-one/
  // carry slip (that supervised territory belongs to the Academy's
  // spot-the-error slates, never an unsupervised boss attack).
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  E.bossFalsehood = function () {
    const forms = [
      () => { const a = randInt(3, 12), b = randInt(3, 12); return { a, b, sym: '+', truth: a + b }; },
      () => { const a = randInt(12, 30), b = randInt(3, 11); return { a, b, sym: '−', truth: a - b }; },
      () => { const a = randInt(3, 9), b = randInt(3, 9); return { a, b, sym: '×', truth: a * b }; },
    ];
    const { a, b, sym, truth } = forms[randInt(0, forms.length - 1)]();
    let wrong = Math.random() < 0.5 ? truth * randInt(4, 12) : truth + randInt(200, 900) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong < 0) wrong = truth + randInt(200, 900); // never a negative "record"
    // absolute safety net, whatever path produced it
    if (Math.abs(wrong - truth) <= Math.max(1, Math.abs(truth)) * 0.3) wrong = truth * 9 + 41;
    return { text: `${a} ${sym} ${b} = ${wrong}`, truthText: `${a} ${sym} ${b} = ${truth}` };
  };

  // ---------- town ----------
  E.tryEnterDungeon = function (idx) {
    const s = E.state;
    E.spellsUsedThisVisit = { scout: false, beacon: false }; // Scout/Beacon: once per dungeon visit
    if (s.taskIndex === 0) {
      return MM.ui.dialog('🏰 Sealed', 'A magical seal covers the entrance. Perhaps the <b>MathMaker</b> at the castle knows more. Visit the castle first!');
    }
    const task = MM.data.TASKS[idx - 1];
    if (task && task.isle) {
      // isle dungeons gate on LENS progression, not the mainland task ladder
      const needs = { 15: 'tidepool', 16: 'frostbite' }[idx];
      if (needs && !s.isles.lenses[needs]) {
        return MM.ui.dialog('🔒 Sealed pass',
          `The way into the <b>${task.dungeon}</b> is choked with Murk.<br><br><i>Light the previous lens first — the fog remembers the light.</i>`);
      }
    } else if (idx > s.taskIndex) {
      return MM.ui.dialog('🔒 Sealed', `The ${task.dungeon} is sealed by the MathMaker's magic. Finish your earlier tasks first!`);
    }
    s.unsealed = s.unsealed || {};
    if (idx >= 2 && !s.unsealed['d' + idx]) return E.sealExam(idx);
    E.enterDungeon(idx);
  };

  // First entry to dungeon 2+: the seal asks ONE full-depth problem from the
  // PREVIOUS topic — proof you've kept what you learned. No combat pressure,
  // all the time in the world; once broken, the seal is gone forever.
  E.sealExam = function (idx) {
    const s = E.state;
    const prevTask = MM.data.TASKS[idx - 2];
    const task = MM.data.TASKS[idx - 1];
    const step = () => {
      const prob = prevTask.mixed ? MM.mastery.pickMixedGate(s) : MM.problems.generate(MM.mastery.capSkill(s, prevTask.skill), 2);
      MM.ui.showProblem({
        header: `🔮 <b>The seal on the ${task.dungeon}</b> — it glows with a challenge from your training
          (<i>${prevTask.mixed ? 'anything you\'ve learned' : MM.data.SKILL_NAMES[prevTask.skill]}</i>). Take all the time you need!`,
        problem: prob,
        leaveLabel: 'Come back later',
        onAnswer(correct, kidAnswer) {
          recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
          if (correct) {
            s.unsealed['d' + idx] = true;
            E.save();
            MM.sound.fanfare();
            return { msg: '✨ <b>The seal shatters!</b> This dungeon is open to you — forever.', end: 'win' };
          }
          return { msg: 'The seal holds fast... and conjures a fresh challenge.' };
        },
        onNext: step,
        onEnd(kind) {
          if (kind === 'win') E.enterDungeon(idx);
          else MM.ui.refresh();
        },
      });
    };
    step();
  };

  E.castle = function () {
    const s = E.state;
    // Wave 7: once the kingdom is whole, 'C' stops being a conversation and
    // becomes a DOOR. Everything below is the pre-ending castle.
    if (E.castleOpen()) return E.enterCastle();
    if (s.taskIndex === 0) {
      s.taskIndex = 1;
      const t = MM.data.TASKS[0];
      E.save();
      return MM.ui.dialog('🧙 The MathMaker',
        `Welcome, young adventurer! I am the <b>MathMaker</b>, keeper of the kingdom's knowledge.<br><br>` +
        `A shadow calling itself the <b>Lord of Confusion</b> has swept over Numeria. It has scattered the kingdom's ` +
        `ten treasures into ten dangerous places, muddled the monsters, and tangled every number it touched. ` +
        `Only someone sharp with numbers can put things right.<br><br>` +
        `Complete my ten tasks, and you shall wear the <b>Crown of Numbers</b>!<br><br>` + t.assign,
        () => MM.ui.refresh());
    }
    const t = MM.data.TASKS[s.taskIndex - 1];
    // Wave 7 BUGFIX (pre-existing, exposed by the castle gate): this test has
    // to come FIRST. At taskIndex 14 the "current task" is TASKS[13] — the
    // Tidepool Grotto, which carries exp:true — so the `t.exp` branch below
    // swallowed every post-task-13 visit and the "Champion of Numeria"
    // greeting had never once been reachable.
    if (s.taskIndex > 13) {
      // all thirteen done, but the sea isn't finished with you yet — say what
      // the doors are still waiting on, in his own voice
      const left = E.castleGateHint();
      return MM.ui.dialog('🧙 The MathMaker',
        `"Champion of Numeria, restorer of the Star!" The MathMaker bows deeply.<br><br>` +
        `<i>Behind him, the great doors of the castle are shut — and, you notice, freshly oiled.</i><br><br>` +
        `"There is something I mean to show you, in here. Not yet, though." He glances at the sea. ` +
        `"The kingdom is not whole while ${left.join(' and ')} is still wanting."`);
    }
    // the expansion tasks (11-13) belong to Miscount, across the bridge
    if (t && t.exp) {
      return MM.ui.dialog('🧙 The MathMaker',
        `"Helping Miscount return what he took? Nothing could make me prouder." He gazes east. ` +
        `"Cross the bridge — <b>Miscount</b> 🧑‍🎓 will tell you what he needs."`);
    }
    if (s.haveItem) {
      const reward = MM.data.taskReward(s.taskIndex);
      s.haveItem = false;
      s.tasksDone.push(s.taskIndex);
      if (s.tasksDone.length <= MM.data.TURNING_STONES.length) s.spiralGlintPending = s.tasksDone.length - 1;
      // Lay the bridge to Miscount's bank the instant task 10 is turned in.
      // The player is standing on the overworld here (E.castle is a
      // conversation, not the interior, until the ending), and the ending
      // cutscene that follows does NOT rebuild the world grid — so without
      // this the bridge would not appear until a reload or a dungeon
      // round-trip next re-ran enterWorld, stranding a kid who's just been
      // told to cross it. Same cells enterWorld lays on load; river-guarded.
      if (s.mapId === 'world' && s.tasksDone.includes(10)) {
        for (const b of MM.maps.BRIDGE) if (s.grid[b.y] && s.grid[b.y][b.x] === '~') s.grid[b.y][b.x] = '=';
      }
      const gold = E.gainGold(reward.gold);
      E.gainXp(reward.xp);
      s.taskIndex++;
      E.save();
      MM.sound.fanfare();
      if (s.taskIndex > 10) {
        return MM.ui.victory();
      }
      const next = MM.data.TASKS[s.taskIndex - 1];
      return MM.ui.dialog(`🧙 Task ${s.tasksDone.length} of 10 complete!`,
        `${t.itemEmoji} ${t.done}<br><br>Your reward: <b>${gold} gold</b> and <b>${reward.xp} XP</b>.` +
        (t.story ? `<br><br><i>The MathMaker's voice drops:</i><br>"${t.story}"` : '') +
        `<br><br><hr>📜 <b>Your next task:</b><br>${next.assign}`);
    }
    // now and then the MathMaker gets gently pompous
    const aside = Math.random() < 0.25 ? `<br><br><i>${MM.data.pick(MM.data.MATHMAKER_ASIDES)}</i>` : '';
    return MM.ui.dialog('🧙 The MathMaker',
      `Ah, back so soon? Your task awaits:<br><br>📜 ${t.assign}<br><br>` +
      `<i>The ${t.dungeon} is marked with a <b>${s.taskIndex === 10 ? '10' : s.taskIndex}</b> on the map.</i>${aside}`);
  };

  // Wave 10 (P3, the mid-game event): the fence east of the farm. Reads
  // s.tasksDone.includes(6) live (same trick as castleFurnish) — mending it
  // needs no new persisted flag at all. The one-time thank-you dialog does
  // need its own flag (s.seenFenceThanks), since it should only interrupt
  // the walk once, ever.
  E.fencePost = function () {
    const s = E.state;
    if (!s.tasksDone.includes(6)) {
      return MM.ui.log('🪵 A broken length of fence, propped up with rope and a hand-lettered sign: "MIND THE GAP (please)."');
    }
    if (s.seenFenceThanks) {
      return MM.ui.log('🪵 The mended fence. Straight as anything.');
    }
    s.seenFenceThanks = true;
    E.save();
    return MM.ui.dialog('🧑‍🌾 The Farm Fence',
      'The fence stands whole again — every post straight, every rail true. Farmer Fenwick straightens up from the last knot, wiping his hands on his trousers.<br><br>' +
      '"There. Held together with baling wire and stubbornness for a month too long." He nods at you. "Wouldn\'t have gotten to it while the ruin was still full of boars, though. Thank you, truly."<br><br>' +
      'Beside him, his hired hand — younger, quieter, permanently squinting at the sun — adds his own bit: "He means it. Doesn\'t say \'thank you\' twice in one year, usually."');
  };

  // shipboard=true (Wave 6.5): the same three-warmups rest, taken in your
  // bunk aboard the Compass Rose — for the inn-less islands, so a kid deep
  // in the Spire or Halls never has to sail two legs just to sleep
  E.inn = function (shipboard) {
    const s = E.state;
    const place = shipboard ? '⛵ Your bunk aboard the Compass Rose' : '🛏 The Cozy Compass Inn';
    if (s.hp >= s.maxhp && s.taskIndex === 0) {
      return MM.ui.dialog(place, 'The innkeeper waves. "Come back when you need a rest, dear!"');
    }
    const probs = MM.mastery.pickReviewProblems(s, Math.max(1, s.taskIndex), 3);
    let i = 0;
    const startWarmup = () => {
      const step = () => {
        const prob = probs[i];
        MM.ui.showProblem({
          header: `${shipboard ? '⛵ <b>Your bunk aboard the Compass Rose</b>' : '🛏 <b>The Cozy Compass Inn</b>'} — warm-up ${i + 1} of 3 <i>(${shipboard ? 'the sea rocks best when the mind is settled' : 'a good night\'s sleep for a good night\'s thinking'})</i>`,
          problem: prob,
          leaveLabel: 'Skip the rest',
          onAnswer(correct, kidAnswer) {
            recordAnswer(prob.skill, correct, { text: prob.text, kidAnswer });
            i++;
            const bonus = E.hasAmulet('keeper') ? E.gainGold(5) : 0;
            const msg = (correct ? '✓ Nice.' : (shipboard ? 'The captain calls down: "You\'ll get it next time, sailor."' : 'The innkeeper smiles: "You\'ll get it next time."')) +
              (bonus ? ` <span class="dim">(+${bonus} gold — your amulet hums warmly)</span>` : '');
            if (i >= probs.length) {
              s.hp = s.maxhp;
              s.stamina = s.maxStamina;
              s.greenHair = false; // a good wash fixes everything
              if (MM.music && MM.music.moment) MM.music.moment('gentle'); // lights-out: one soft piece
              E.save();
              return { msg: msg + `<br><br>😴 You sleep wonderfully — and breakfast is included. <b>HP and stamina fully restored!</b><br><br>💤 <i>${MM.data.pick(MM.data.INN_DREAMS)}</i>`, end: 'win' };
            }
            return { msg };
          },
          onNext: step,
          onEnd() { MM.ui.refresh(); },
        });
      };
      step();
    };
    // Wave 8a (P8, delight catalog): the innkeeper's cat — a new sleeping
    // spot every real day, pure cuteness, zero design weight. Mainland only
    // (the ship's bunk has no cat), and the +1 stamina pat is once per day
    // so it can never be farmed.
    if (!shipboard && s.catPettedDate !== E.todayStr()) {
      const spot = MM.data.catSpotFor(E.todayStr());
      return MM.ui.dialogChoices('🐈 The inn cat',
        `You spot the inn cat, ${spot}.`,
        [
          { label: '🐾 Give it a pat', primary: true, onClick: () => {
              s.stamina = Math.min(s.maxStamina, s.stamina + 1);
              s.catPettedDate = E.todayStr();
              MM.sound.coin();
              MM.ui.log('🐈 Purrrrr. (+1 stamina)');
              // Wave 10 (P4b, rare-surprise pool): once ever, the cat brings
              // something to show off. Log line, +nothing — the joke's on
              // the cat, not the kid.
              if (!s.seenCatBeetle && Math.random() < E.CAT_BEETLE_CHANCE) {
                s.seenCatBeetle = true;
                MM.ui.log('🪲 The cat drops something at your feet — a live beetle, presented with enormous pride. You admire it appropriately. It scuttles off, mission accomplished.');
              }
              E.save();
              startWarmup();
            } },
          { label: 'Let it sleep', onClick: startWarmup },
        ]);
    }
    // v1.7.0 (a kid's own report: "the daily-only cat taught me to stop
    // checking"): every OTHER mainland inn visit — the pat already spent
    // today — still finds the cat doing something. Pure delight, no reward;
    // avoids repeating the same moment twice running (s.lastCatMoment).
    if (!shipboard) {
      const pool = MM.data.CAT_MOMENTS;
      let idx = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && idx === s.lastCatMoment) idx = (idx + 1) % pool.length;
      s.lastCatMoment = idx;
      let html = pool[idx];
      if (Math.random() < E.CAT_ESCORT_CHANCE) html += '<br><br>' + MM.data.CAT_ESCORT_LINE;
      E.save();
      return MM.ui.dialog('🐈 The inn cat', html, startWarmup);
    }
    startWarmup();
  };

  E.usePotion = function () {
    const s = E.state;
    if (!s || MM.ui.modalOpen() || MM.battle.active()) return;
    if (s.potions <= 0) return MM.ui.log('No potions left! Buy more at the shop 🏪.');
    if (s.hp >= s.maxhp) return MM.ui.log('You are already at full health.');
    s.potions--;
    const heal = MM.data.POTION.heal * (E.hasCharm('heart') ? 2 : 1);
    s.hp = Math.min(s.maxhp, s.hp + heal);
    MM.sound.coin();
    MM.ui.log(`🧪 You drink a potion. HP: ${s.hp}/${s.maxhp}.`);
    E.save();
    MM.ui.refresh();
  };

  // Applies a completed purchase to state and returns the message fragment.
  // qty only matters for potions (bulk buying); every other kind ignores it.
  function applyPurchase(item, kind, qty) {
    qty = qty || 1;
    const s = E.state;
    let msg = '';
    if (MM.data.GEAR[kind]) {
      E.ownGear(kind, item.id);
      // auto-equip when the slot is empty or the new piece is plainly better —
      // EXCEPT rings and amulets: one-at-a-time slots are a deliberate choice
      // (Trader Tessa's "one finger, one power"), never made for the player
      const cur = E.equippedItem(kind);
      const better = !cur
        || (kind === 'weapon' && item.atk > cur.atk)
        || (kind !== 'weapon' && kind !== 'ring' && kind !== 'amulet' && (item.def || 0) > (cur.def || 0));
      if (better && kind !== 'ring' && kind !== 'amulet') {
        E.equip(kind, item.id);
        msg += `<br>You equip the ${item.emoji} <b>${item.name}</b>.`;
      } else {
        msg += `<br>${item.emoji} <b>${item.name}</b> goes in your 🎒 bag — equip it any time!`;
      }
      const r = E.strikeRange();
      msg += `<br>⚔️ You strike <b>${r.min}–${r.max}</b> · 🛡 you block <b>${E.totalDef()}</b>.`;
    } else if (kind === 'food') {
      s.items.food[item.id] = (s.items.food[item.id] || 0) + 1;
      msg += `<br>${item.emoji} <b>${item.name}</b> added to your 🎒 bag (restores ${item.stamina} stamina).`;
    } else if (kind === 'mystery') {
      s.items.mystery = (s.items.mystery || 0) + 1;
      msg += `<br>${item.emoji} <b>${item.name}</b> added to your 🎒 bag. Drink it and find out!`;
    } else if (kind === 'charm') {
      if (!s.items.charms.includes(item.id)) {
        s.items.charms.push(item.id);
        if (s.charmsOn.length < E.CHARM_SLOTS) {
          s.charmsOn.push(item.id);
          msg += `<br>✨ You put on the ${item.emoji} <b>${item.name}</b> right away!`;
        } else {
          msg += `<br>${item.emoji} <b>${item.name}</b> goes in your 🎒 bag — swap charms to wear it.`;
        }
      }
    } else if (kind === 'treat') {
      s.items.treats = (s.items.treats || 0) + 1;
      msg += `<br>${item.emoji} <b>${item.name}</b> added to your 🎒 bag${s.isles.pet ? ` — ${s.isles.pet.name} noticed` : ''}.`;
    } else if (kind === 'rope') {
      s.items.ropes = (s.items.ropes || 0) + qty;
      msg += `<br>${item.emoji} <b>${item.name}</b> added to your 🎒 bag. Use it from there to climb out of any dungeon.`;
    } else {
      s.potions += qty;
      s.potionsBought = (s.potionsBought || 0) + qty;
      msg += qty > 1
        ? `<br>+${qty} 🧪 potions! You now have ${s.potions}.`
        : `<br>You now have ${s.potions} 🧪 potion${s.potions === 1 ? '' : 's'}.`;
      // one-time shopkeeper flavor, the first time a bulk (×5/×10) buy lands
      if (qty > 1 && !s.seenBulkQuip) {
        s.seenBulkQuip = true;
        MM.ui.log('🏪 "Regulars get the crate. The crate is five potions. I\'m very proud of it."');
      }
    }
    MM.sound.coin();
    E.save();
    return msg;
  }

  // Shop purchase, optionally with a money problem for a discount.
  // kind: a gear slot ('weapon'|'body'|'helmet'|'boots'|'ring'), 'food', or 'potion'.
  // qty (potions only): buy several at once — still just ONE money problem.
  // onDone: where to land after the purchase — defaults to the general shop,
  // but Emberlyn's amulets pass () => MM.ui.enchanterDialog() instead.
  E.buy = function (item, kind, qty, onDone) {
    qty = qty || 1;
    onDone = onDone || (() => MM.ui.openShop());
    MM.track('buy ' + kind + ' ' + (item ? (item.id || item.name) : 'MISSING-ITEM') + (qty > 1 ? ' x' + qty : ''));
    const s = E.state;
    const total = item.price * qty;
    if (s.gold < total) {
      return MM.ui.dialog('🏪 Shop', `The shopkeeper shakes her head. "That's <b>${total} gold</b> — you have ${s.gold}."`);
    }
    // if multi-digit subtraction is switched off for this player, the money
    // quiz is beyond their curriculum — just complete the sale
    if (!E.moneyQuizOn()) {
      s.gold -= total;
      const msg = applyPurchase(item, kind, qty);
      return MM.ui.dialog('🏪 Shop',
        `You buy ${qty > 1 ? `${qty} ${item.emoji} ${item.name}s` : `the ${item.emoji} <b>${item.name}</b>`} for <b>${total} gold</b>.${msg}`,
        onDone);
    }
    const g = s.gold, c = total;
    const prob = qty > 1 ? {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: `The shopkeeper grins: "Quick one for a discount! You have ${g} gold. ${qty} ${item.name}s at ${item.price} gold each — how much gold will you have left if you buy them at full price?"`,
      answer: MM.problems.frac(g - c, 1),
      solution: `${qty} × ${item.price} = ${c}. ${g} − ${c} = ${g - c} gold.`,
    } : {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: `The shopkeeper grins: "Quick one for a discount! You have ${g} gold and the ${item.name} costs ${c}. If you buy it at full price, how much gold will you have left?"`,
      answer: MM.problems.frac(g - c, 1),
      solution: `${g} − ${c} = ${g - c} gold.`,
    };
    MM.ui.showProblem({
      header: `🏪 <b>${item.emoji} ${item.name}</b>${qty > 1 ? ` × ${qty}` : ''} — ${c} gold`,
      problem: prob,
      leaveLabel: 'Never mind',
      onAnswer(correct, kidAnswer) {
        recordAnswer('word_problems', correct, { text: prob.text, kidAnswer });
        // never 0 (playtest 2026-07-13): a 5g loaf floored 10% to zero gold
        // off — the "question for a discount" promise must always pay ≥ 1
        const discount = correct ? Math.max(1, Math.floor(c * 0.1)) : 0;
        const paid = c - discount;
        s.gold -= paid;
        let msg = correct
          ? `"Sharp as a tack! <b>${discount} gold off</b> — that's ${paid} gold." 🎉`
          : `"Not quite — it's ${g - c}. Full price then, ${paid} gold."`;
        msg += applyPurchase(item, kind, qty);
        return { msg, end: 'win' };
      },
      onNext: () => {},
      onEnd() { onDone(); },
    });
  };
})();
