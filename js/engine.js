// MathMaker v2 — game state, movement, world interactions, and battle hooks.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const E = MM.engine = {};
  const SAVE_PREFIX = 'mathmaker2_save_';

  E.state = null;
  E.todayStr = () => new Date().toISOString().slice(0, 10);

  // ---------- new game / save / load ----------
  E.newGame = function (name) {
    E.state = {
      version: 4,
      name,
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
      // parent-only, PIN-protected. topics = all-on until set, EXCEPT
      // music_reading (Wave 4: opt-in, not core 5th-grade) — explicitly off
      // from the very first session, since newGame never goes through
      // E.load()'s migration until the NEXT time this profile loads.
      parent: { pin: null, topics: { music_reading: false } },
      taskIndex: 0,        // 0 = has not met the MathMaker yet; 1-10 = current task
      haveItem: false,
      tasksDone: [],
      mastery: {},
      badges: {},          // skill -> best badge tier earned (1 bronze, 2 silver, 3 gold)
      pendingBadges: [],   // earned but not yet celebrated (popped by ui.refresh)
      spellsCelebrated: {},// spell name -> true once its unlock celebration has shown
      bestiary: { seen: {}, kills: {}, gauntlet: {} },  // monster name -> true / defeat count / gauntlet win
      bounties: null,      // notice-board jobs {date, items:[...]}; null until task 1
      isleBounties: null,  // Wave 5: Port Brightwater's own separate board
      continent: 'west',   // which overworld you're on: 'west' | 'isles' | 'horologe' | 'chime' | 'gullwrack'
      isles: { lenses: {}, keys: {}, egg: null, pet: null },  // Level 2 state (also holds spireDone/hallsDone/breakwaterDone/lampLit/gullwrackRebuilt flags, set lazily as later waves earn them)
      charmsOn: [],        // the (up to) 3 charms currently WORN
      opened: {},          // chest/door keys like "d3:12,5"
      bossesDefeated: {},
      defeatedAt: {},      // "mapId:x,y" -> date string; today's kills stay gone today
      streak: 0,
      totals: { answered: 0, correct: 0 },
      worldPos: null,
      seenBattleHelp: false,
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
    else { // prune yesterday-and-older entries so saves stay small
      const today = E.todayStr();
      for (const k of Object.keys(s.defeatedAt)) if (s.defeatedAt[k] !== today) delete s.defeatedAt[k];
    }
    if (!s.parent) s.parent = { pin: null };
    if (!s.parent.topics) {
      // migrate the old "up to level N" cap into per-topic switches
      const cap = s.parent.topicCap || 10;
      s.parent.topics = {};
      MM.data.TASKS.filter(t => !t.exp).forEach((t, i) => { s.parent.topics[t.skill] = i < cap; });
      delete s.parent.topicCap;
    }
    // Wave 4: music_reading is the first topic that must default OFF (every
    // existing default reads "missing from the map" as enabled) — force it
    // false exactly once, for saves that predate this topic entirely.
    if (s.parent.topics.music_reading === undefined) s.parent.topics.music_reading = false;
    // Wave 4 carry-over: spell celebrations are new. A returning player who
    // already earned the gold badges for a spell shouldn't get a surprise
    // "you unlocked X!" popup for something they've had for ages — only
    // spells NOT yet unlocked should celebrate going forward.
    if (!s.spellsCelebrated) {
      s.spellsCelebrated = {};
      for (const name of ['scout', 'blink', 'beacon']) s.spellsCelebrated[name] = E.spellUnlocked(name);
    }
    E.recalcMaxStamina(); // stamina now scales with level
    E.recalcMaxHp();      // max HP now scales with level + Tidewood Amulet
    E.enterWorld();  // always resume on the overworld
    return true;
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

  // Sell unequipped gear back to the shop at half price.
  E.sellGear = function (slot, id) {
    MM.track('sellGear ' + slot + ' ' + id);
    const s = E.state;
    const item = MM.data.gearById(slot, id);
    if (!item || s.equipped[slot] === id || !s.gear[slot].includes(id)) return;
    const v = Math.floor(item.price / 2);
    if (!E.moneyQuizOn()) { // money-math topic disabled: no quiz
      s.gear[slot] = s.gear[slot].filter(x => x !== id);
      const paid = E.gainGold(v);
      MM.sound.coin();
      E.save();
      return MM.ui.dialog('🏪 Shop', `You sell the ${item.emoji} <b>${item.name}</b> for <b>${paid} gold</b>!`, () => MM.ui.openShop());
    }
    const g = s.gold;
    const prob = {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: `The shopkeeper inspects the ${item.name}. "Half of what you paid — that's ${v} gold. You have ${g} now, so how much will you walk out with?"`,
      answer: MM.problems.frac(g + v, 1),
      solution: `${g} + ${v} = ${g + v} gold.`,
    };
    MM.ui.showProblem({
      header: `🏪 Selling: ${item.emoji} <b>${item.name}</b> — ${v} gold (half of ${item.price})`,
      problem: prob,
      leaveLabel: 'Keep it',
      onAnswer(correct) {
        recordAnswer('word_problems', correct);
        const bonus = correct ? Math.ceil(v * 0.1) : 0;
        s.gear[slot] = s.gear[slot].filter(x => x !== id);
        const paid = E.gainGold(v + bonus);
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
      MM.ui.log('🍞 Your stomach growls... you\'re getting tired. Eat something from your bag!');
    } else if (before > 0 && s.stamina === 0) {
      MM.ui.log('😫 <b>You are exhausted!</b> Half damage and no dodging until you eat or rest.');
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
      onAnswer(correct) {
        recordAnswer(prob.skill, correct);
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
    if (st.endingDone) out.push('The New MathMaker');
    return out;
  };

  E.deleteProfile = function (name) {
    localStorage.removeItem(SAVE_PREFIX + name);
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
    const start = safeStart(s);
    s.px = start.x; s.py = start.y;
    E.petPos = { x: s.px, y: s.py };
    MM.ui.log('You stand in the kingdom of Numeria.');
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

  // ---------- the Study: the reveal ----------
  // The one scene the whole game has been walking toward. Teacher and former
  // student, side by side, telling the kid the truth. Sincere throughout —
  // no jokes land in this room (STORY_BIBLE hard rule 4).
  E.studyReveal = function () {
    const s = E.state;
    if (s.endingDone) return E.studyAfter();
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
        { label: '✨ Golden Numeria (start over, keep everything)', onClick: () => E.goldenPrompt() },
        { label: 'Just sit a while', onClick: () => {} },
      ]);
  };

  // ---------- Golden Numeria (NG+) ----------
  E.goldenPrompt = function () {
    const s = E.state;
    MM.ui.dialogChoices('✨ Golden Numeria',
      `"The kingdom will tangle again someday. Kingdoms do." The MathMaker does not sound sad about it. ` +
      `"That is not a <b>failure</b>. That is just what a kingdom is: a thing that needs tending, over and over, ` +
      `by somebody who knows how."<br><br>` +
      `<i>Walk it once more, in gold?</i><br><br>` +
      `<span class="dim">Every dungeon re-seals and every boss returns, <b>tougher</b>. You keep everything you are: ` +
      `your level, your gear, your gems and charms, your badges, your Monster Book, your pet — and your crown. ` +
      `Only the kingdom starts again.</span>`,
      [
        { label: '✨ Begin Golden Numeria', primary: true, onClick: () => E.startGolden() },
        { label: 'Not yet', onClick: () => E.throneRoom() },
      ]);
  };

  E.startGolden = function () {
    const s = E.state;
    MM.track('startGolden');
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
    // KEPT, deliberately: level/xp, gear/equipped/enchants, items (charms,
    // gems, treasures), charmsOn, mastery, badges, bestiary, totals, the pet,
    // parent settings, difficulty, calmMode, spellsCelebrated, metMiscount,
    // sparWins, titles, and endingDone (you are still the MathMaker).
    s.hp = s.maxhp;
    s.stamina = s.maxStamina;
    E.enterWorld();
    E.save();
    MM.sound.fanfare();
    MM.ui.dialog('✨ Golden Numeria',
      `<i>The kingdom takes a breath, and begins again — every dungeon sealed, every boss back on its feet ` +
      `and <b>stronger</b> for the rest.</i><br><br>` +
      `You still have your level, your gear, your charms, your badges, your book, your pet, and your crown. ` +
      `You have everything you learned. That, it turns out, is the only thing that was ever really yours.<br><br>` +
      `<span class="dim">Golden Numeria — run ${s.ngPlus}. One careful step at a time.</span>`);
  };

  // Sailing between continents (the Compass Rose) — with the voyage scene.
  E.sail = function (dest) {
    MM.track('sail ' + dest);
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
    const greeting = s.isles.lampLit
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
    choices.push({ label: 'Stay a while', onClick: () => {} });
    const greeting = s.isles.spireDone
      ? '"Ticking away nicely now, isn\'t it?" the captain says. "A couple of new spots on the charts — a hum you can hear from clear out on the water (<b>Chime Isle</b>), and a storm-battered little harbor further out (<b>Gullwrack</b>). Where to?"'
      : '"Back the way you came, or straight home? Your call."';
    MM.ui.dialogChoices('⛵ The Compass Rose', greeting, choices);
  };

  // Chime Isle's own dock: sail back to either of the previous legs, all
  // the way home, or onward to Gullwrack Harbor (Wave 6) — reachable from
  // here too, since reaching Chime already implies spireDone.
  E.chimeDock = function () {
    MM.ui.dialogChoices('⛵ The Compass Rose',
      '"Quite the tune this place hums. Where to now?"',
      [
        { label: '⛵ Sail onward to Gullwrack Harbor', primary: true, onClick: () => E.sail('gullwrack') },
        { label: '⛵ Sail to Horologe Isle', onClick: () => E.sail('horologe') },
        { label: '⛵ Sail to the Isles', onClick: () => E.sail('isles') },
        { label: '⛵ Sail home to Numeria', onClick: () => E.sail('west') },
        // Wave 6.5: no inn on this island — the bunk serves instead
        { label: '🛏 Rest in your bunk (3 warm-ups)', onClick: () => E.inn(true) },
        { label: 'Stay a while', onClick: () => {} },
      ]);
  };

  // Gullwrack Harbor's own dock (Wave 6): the end of the charted line so
  // far — sail back to any previous leg, or all the way home.
  E.gullwrackDock = function () {
    MM.ui.dialogChoices('⛵ The Compass Rose',
      '"Quite the harbor you\'ve been patching up. Where to?"',
      [
        { label: '⛵ Sail to Horologe Isle', primary: true, onClick: () => E.sail('horologe') },
        { label: '⛵ Sail to Chime Isle', onClick: () => E.sail('chime') },
        { label: '⛵ Sail to the Isles', onClick: () => E.sail('isles') },
        { label: '⛵ Sail home to Numeria', onClick: () => E.sail('west') },
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
    // optional side dungeon, not meant to outscale the mandatory Lighthouse
    const statIdx = task.statIndex || idx;
    const floors = MM.maps.dungeonFloors(idx);
    // remember the return spot when entering from ANY overworld (mainland,
    // isles, horologe, chime, or gullwrack) — but never on floor changes,
    // which must not clobber it
    if (s.mapId === 'world' || s.mapId === 'isles' || s.mapId === 'horologe' || s.mapId === 'chime' || s.mapId === 'gullwrack') s.worldPos = { x: s.px, y: s.py };
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
    // gear plates (Clockwork Spire): cache this floor's A/B/C gate positions
    // (in memory only — they're static per floor template, re-scanned every
    // visit) and open whichever one matches the saved rotation state.
    E._gatePositions = E._gatePositions || {};
    E._gatePositions[s.mapId] = {
      A: MM.maps.find(s.grid, 'A'), B: MM.maps.find(s.grid, 'B'), C: MM.maps.find(s.grid, 'C'),
    };
    E.applyGearState();
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
        s.monsters.push({
          name: type.name, sprite: type.sprite, pal: type.pal, verb: type.verb,
          x: pos.x, y: pos.y, hp: st.hp, maxhp: st.hp, atk: st.atk, xp: st.xp,
          boss: false, stun: 0, behavior: type.behavior || 'chase',
          shouts: !!type.shouts, alerted: 0,
          home: { x: pos.x, y: pos.y },
        });
      }
    }
    if (skippedAny) MM.ui.log('The halls are quiet — the monsters you drove off haven\'t crept back yet.');
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
    if (floor === 0) {
      MM.ui.log(`You enter the ${task.dungeon}. (${task.mixed ? 'Everything you\'ve learned!' : MM.data.SKILL_NAMES[task.skill]})`);
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
        if (MM.data.NPCS[ch]) return E.talkNpc(ch);
        if (ch === '.' || ch === 'P') {
          // no stamina cost indoors — there's nothing to fight and nothing to
          // flee, and a kid should never be able to strand themselves at home
          E.petPos = { x: s.px, y: s.py };
          s.px = nx; s.py = ny;
        }
        return;
      }
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
        if (ch === 'C') return E.castle();
        if (ch === 'n') return MM.ui.noticeBoard();
        if (ch === 'W') return E.pier();
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
        E.petPos = { x: s.px, y: s.py };
        s.px = nx; s.py = ny;
        E.walkStamina();
        E.updatePetAlert();
      }
      return;
    }

    // dungeon
    const mon = s.monsters.find(m => m.x === nx && m.y === ny && m.hp > 0);
    if (mon) return E.startCombat(mon);
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
    // Wave 6.5: broken floor blocks in dungeons too (see the town branch) —
    // the Breakwater's mendable wall gap is a shortcut, not an open door
    if (ch === E.SITE_GLYPHS.broken) {
      return MM.ui.log('🕳 The floor here is shattered — a stone slab could mend it.');
    }
    if (ch === '#' || ch === 'G') return;
    E.petPos = { x: s.px, y: s.py };
    s.px = nx; s.py = ny;
    E.walkStamina();
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
        E.applySiteState(mapId);
        E.save();
      } else {
        MM.sound.thud(); // blocked — a wall, water, another slab, or an unrelated broken tile
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
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
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
  E.monsterTurn = function () {
    const s = E.state;
    let attacker = null;
    for (const m of s.monsters) {
      if (m.hp <= 0) continue;
      if (m.stun > 0) { m.stun--; continue; }
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
      for (const [dx, dy] of opts) {
        const nx = m.x + dx, ny = m.y + dy;
        const ch = s.grid[ny] && s.grid[ny][nx];
        if (ch !== '.') continue;
        if (nx === s.px && ny === s.py) continue;
        if (s.monsters.some(o => o !== m && o.hp > 0 && o.x === nx && o.y === ny)) continue;
        m.x = nx; m.y = ny;
        break;
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

  function recordAnswer(skill, correct) {
    const s = E.state;
    MM.mastery.record(s, skill, correct);
    s.totals.answered++;
    if (correct) { s.totals.correct++; s.streak++; }
    else s.streak = E.hasRing('focus') ? Math.floor(s.streak / 2) : 0;
    checkBadge(skill);
    if (correct) E.bountyEvent('correct');
    const pet = s.isles && s.isles.pet;
    if (pet && correct) { pet.correct++; E.checkPetStage(); }
  }
  E.recordAnswer = recordAnswer;

  // ---------- the notice board (bounties) ----------
  // Three small jobs, refreshed each real day — or the moment all are done, so
  // an eager kid never finds an empty board. Targets are picked weakest-topic-
  // first: the board quietly steers practice where it helps, while reading as
  // errands rather than homework. Rewards pay out the instant a job finishes.
  E.refreshBounties = function () {
    const s = E.state;
    if (!s.taskIndex) { s.bounties = null; return; } // no jobs before the MathMaker
    const today = E.todayStr();
    if (s.bounties && s.bounties.date === today && !s.bounties.items.every(it => it.done)) return;
    const maxD = Math.max(1, Math.min(10, s.taskIndex));
    const ranked = MM.mastery.weakestFirst(s, MM.data.TASKS.filter(t => !t.exp).map(t => t.skill));
    const dgOf = sk => MM.data.TASKS.findIndex(t => t.skill === sk) + 1;
    const unlocked = ranked.map(dgOf).filter(d => d <= maxD);
    const d1 = unlocked[0] || 1;
    const d2 = unlocked.find(d => d !== d1) || d1;
    const dgName = d => MM.data.TASKS[d - 1].dungeon;
    const huntNeed = Math.min(5, 2 + Math.ceil(d1 / 3));
    const items = [
      { type: 'hunt', dungeon: d1, need: huntNeed, have: 0, done: false, reward: 15 + 8 * d1,
        label: `Defeat ${huntNeed} monsters in the ${dgName(d1)}` },
      { type: 'solve', dungeon: d2, need: 4, have: 0, done: false, reward: 12 + 6 * d2,
        label: `Answer 4 problems correctly inside the ${dgName(d2)}` },
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

  E.startCombat = function (mon) {
    MM.track('combat ' + mon.name);
    const s = E.state;
    const task = MM.data.TASKS[s.dungeonIndex - 1];
    // rare event: ~2% of regular monsters show up wearing a tiny hat.
    // Beating one earns +1 gold, for the hat. No one knows why.
    if (mon.hat == null) mon.hat = !mon.boss && Math.random() < 0.02;
    E.markSeen(mon);
    let retryUsed = false; // Ring of Retry: one second-try per battle
    let frostPending = false; // Frost gem: chills the monster's NEXT counterattack
    const begin = () => MM.battle.start(mon, {
      dungeonIndex: s.dungeonIndex,
      hooks: {
        // regular monsters ask quick problems (pace!); bosses ask the big ones.
        // Expansion dungeons draw from every topic, weakest-first.
        pickProblem: () => {
          E.spendStamina(1); // each battle round is tiring
          if (task.spire) return mon.boss ? MM.mastery.pickSpireGate(s) : MM.mastery.pickSpireProblem(s);
          if (task.breakwater) return mon.boss ? MM.mastery.pickBreakwaterGate(s) : MM.mastery.pickBreakwaterProblem(s);
          const mixed = task.mixed || E.isDeepWingFloor(s);
          if (mon.boss) return mixed ? MM.mastery.pickMixedGate(s) : MM.mastery.pickBossProblem(s, s.dungeonIndex);
          return mixed ? MM.mastery.pickArenaProblem(s) : MM.mastery.pickCombatProblem(s, s.dungeonIndex);
        },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() {
          if (retryUsed || !E.hasCharm('ring')) return false;
          retryUsed = true;
          return true;
        },
        playerStrike() {
          let dmg = E.rollStrike();
          const crit = s.streak >= 5 && Math.random() < 0.25;
          if (crit) dmg *= 2;
          if (crit && E.hasEnchant('leech')) s.hp = Math.min(s.maxhp, s.hp + 2);
          if (E.hasEnchant('frost')) frostPending = true;
          return { dmg, crit };
        },
        applyMonsterHit(m) {
          const dmg = E.rollMonsterHit(m.atk, frostPending ? 2 : 0);
          frostPending = false;
          s.hp -= dmg;
          return { dmg, dead: s.hp <= 0 };
        },
        playerHp: () => Math.max(0, s.hp),
        playerMaxHp: () => s.maxhp,
        playerAtkLabel: () => { const r = E.strikeRange(); return `⚔️ strikes ${r.min}–${r.max} per correct answer`; },
        playerDefLabel: () => `🛡️ blocks ${E.totalDef()}`,
        isRanged: () => E.isRangedEquipped(),
        rangedNote: () => E.rangedNote(),
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
          E.recordKill(m);
          E.bountyEvent('kill');
          if (m.behavior === 'thief') E.bountyEvent('thief'); // Wave 5: "catch 2 thieves"
          const baseGold = m.boss ? m.gold : Math.floor(Math.random() * (2 * s.dungeonIndex)) + s.dungeonIndex;
          const gold = E.gainGold(baseGold);
          const levelsBefore = s.level;
          E.gainXp(m.xp);
          const lines = [
            `⭐ +${m.xp} XP`,
            `💰 +${gold} gold${gold > baseGold ? ' 🧲' : ''}`,
          ];
          if (m.hat) { s.gold += 1; lines.push('🎩 +1 gold — for the tiny hat.'); }
          if (m.stolen) {
            const back = E.gainGold(Math.ceil(m.stolen * 1.5));
            lines.push(`🪶 Caught the thief! Your <b>${m.stolen} gold</b> back — with interest: <b>+${back}</b>!`);
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
          petFetch(lines);
          E.save();
          return { lines };
        },
        onEnd(result) {
          s.seaLegs = false; // the fizz lasts one battle
          if (result.dead) return E.die();
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
      },
    });
    if (!s.seenBattleHelp) {
      s.seenBattleHelp = true;
      E.save();
      MM.ui.dialog('⚔️ Your first battle!',
        `Here's how battles work:<br><br>
         🗡 Each round you get a <b>math problem</b>. Answer <b>correctly</b> and you strike
         for <b>${E.strikeRange().min}–${E.strikeRange().max} damage</b> (your weapon decides how hard you hit).<br><br>
         👹 Then the monster strikes back! Your <b>armor blocks</b> part of its damage —
         and if you answered correctly, you might <b>dodge</b> it completely.<br><br>
         ✗ A wrong answer means your attack <b>misses</b> — but you'll be shown the solution,
         so you'll get it next time.<br><br>
         🔥 Answer streaks add bonus damage, and at 5+ you can land <b>CRITICAL HITS</b>.<br><br>
         Regular monsters ask <b>quick</b> questions. Save your deep thinking for
         <b>bosses</b>, <b>doors</b> 🚪 and <b>chests</b> 🎁 — they ask the big ones.<br><br>
         🏃 You can always <b>flee</b> — but the monster <b>recovers all its health</b>
         while you run. Sticking with it is how you win!<br><br>
         Take your time — there are <b>no timers</b>. Good luck!<br><br>
         <i>Why do monsters come apart when you show your work? The Sage has theories.
         The monsters decline to comment.</i>`,
        begin);
    } else {
      begin();
    }
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
    MM.ui.log(`You collapse... The MathMaker's magic whisks you to safety. (${lost} gold lost)`);
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
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
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
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
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
    return `✨ <b>A glimmering chest!</b> Inside: a ${gem.emoji} <b>${gem.name} Gem</b> — <i>${gem.desc}</i>. Take it to Emberlyn in Port Brightwater to fuse it onto your gear!`;
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

  E.chest = function (x, y) {
    const s = E.state;
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
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
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
      onAnswer(correct) {
        recordAnswer('word_problems', correct);
        const bonus = correct ? Math.ceil(v * 0.1) : 0;
        s.items.treasures.splice(index, 1);
        const paid = E.gainGold(v + bonus);
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
      onAnswer(correct) {
        recordAnswer(prob.skill, correct);
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
    let frostPending = false;
    MM.battle.start(mon, {
      dungeonIndex: idx,
      hooks: {
        // mirrors the exact branching E.mathDoor/startCombat use for this
        // dungeon's TASKS entry — a mixed/isle/Spire boss's rematch must
        // draw from the same pool the real fight would, not a null skill
        pickProblem: () => {
          E.spendStamina(1);
          const t = MM.data.TASKS[idx - 1];
          if (t.spire) return MM.mastery.pickSpireGate(E.state);
          if (t.breakwater) return MM.mastery.pickBreakwaterGate(E.state);
          return t.mixed ? MM.mastery.pickMixedGate(E.state) : MM.mastery.pickBossProblem(E.state, idx);
        },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() { if (retryUsed || !E.hasCharm('ring')) return false; retryUsed = true; return true; },
        playerStrike() {
          let dmg = E.rollStrike();
          const crit = s.streak >= 5 && Math.random() < 0.25;
          if (crit) dmg *= 2;
          if (crit && E.hasEnchant('leech')) s.hp = Math.min(s.maxhp, s.hp + 2);
          if (E.hasEnchant('frost')) frostPending = true;
          return { dmg, crit };
        },
        applyMonsterHit(m) {
          const dmg = E.rollMonsterHit(m.atk, frostPending ? 2 : 0);
          frostPending = false;
          s.hp -= dmg;
          return { dmg, dead: s.hp <= 0 };
        },
        playerHp: () => Math.max(0, s.hp),
        playerMaxHp: () => s.maxhp,
        playerAtkLabel: () => { const r = E.strikeRange(); return `⚔️ strikes ${r.min}–${r.max} per correct answer`; },
        playerDefLabel: () => `🛡️ blocks ${E.totalDef()}`,
        isRanged: () => E.isRangedEquipped(),
        rangedNote: () => E.rangedNote(),
        victory() {
          E.recordKill(mon);
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
      },
    });
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
    let frostPending = false;
    MM.battle.start(mon, {
      dungeonIndex: 9, // wizard-tower purples for the sparring stage
      hooks: {
        pickProblem: () => { E.spendStamina(1); return MM.mastery.pickArenaProblem(s); },
        recordAnswer,
        dodgeChance: () => E.dodgeChance(),
        tryRetry() {
          if (retryUsed || !E.hasCharm('ring')) return false;
          retryUsed = true;
          return true;
        },
        playerStrike() {
          let dmg = E.rollStrike();
          const crit = s.streak >= 5 && Math.random() < 0.25;
          if (crit) dmg *= 2;
          if (crit && E.hasEnchant('leech')) s.hp = Math.min(s.maxhp, s.hp + 2);
          if (E.hasEnchant('frost')) frostPending = true;
          return { dmg, crit };
        },
        applyMonsterHit(m) {
          const dmg = E.rollMonsterHit(m.atk, frostPending ? 2 : 0);
          frostPending = false;
          s.hp -= dmg;
          return { dmg, dead: s.hp <= 0 };
        },
        playerHp: () => Math.max(0, s.hp),
        playerMaxHp: () => s.maxhp,
        playerAtkLabel: () => { const r = E.strikeRange(); return `⚔️ strikes ${r.min}–${r.max} per correct answer`; },
        playerDefLabel: () => `🛡️ blocks ${E.totalDef()}`,
        isRanged: () => E.isRangedEquipped(),
        rangedNote: () => E.rangedNote(),
        victory() {
          E.recordKill(mon);
          E.bountyEvent('spar');
          s.sparWins = L;
          const gold = E.gainGold(8 + 4 * L), xp = 10 + 2 * L;
          const levelsBefore = s.level;
          E.gainXp(xp);
          const lines = [`⭐ +${xp} XP`, `💰 +${gold} gold`];
          if (mon.hat) { s.gold += 1; lines.push('🎩 +1 gold — for the tiny hat.'); }
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
      },
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
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
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
    const step = () => {
      const prob = probs[i];
      MM.ui.showProblem({
        header: `${shipboard ? '⛵ <b>Your bunk aboard the Compass Rose</b>' : '🛏 <b>The Cozy Compass Inn</b>'} — warm-up ${i + 1} of 3 <i>(${shipboard ? 'the sea rocks best when the mind is settled' : 'a good night\'s sleep for a good night\'s thinking'})</i>`,
        problem: prob,
        leaveLabel: 'Skip the rest',
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
          i++;
          const bonus = E.hasAmulet('keeper') ? E.gainGold(5) : 0;
          const msg = (correct ? '✓ Nice.' : (shipboard ? 'The captain calls down: "You\'ll get it next time, sailor."' : 'The innkeeper smiles: "You\'ll get it next time."')) +
            (bonus ? ` <span class="dim">(+${bonus} gold — your amulet hums warmly)</span>` : '');
          if (i >= probs.length) {
            s.hp = s.maxhp;
            s.stamina = s.maxStamina;
            s.greenHair = false; // a good wash fixes everything
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
      onAnswer(correct) {
        recordAnswer('word_problems', correct);
        const discount = correct ? Math.floor(c * 0.1) : 0;
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
