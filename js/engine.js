// MathMaker — game state, movement, combat, and world interactions.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  const E = MM.engine = {};
  const SAVE_PREFIX = 'mathmaker_save_';

  E.state = null;

  // ---------- new game / save / load ----------
  E.newGame = function (name) {
    E.state = {
      version: 1,
      name,
      hp: 20, maxhp: 20,
      gold: 15, level: 1, xp: 0,
      potions: 1,
      weapon: 'stick', armor: 'clothes',
      taskIndex: 0,        // 0 = has not met the MathMaker yet; 1-10 = current task
      haveItem: false,
      tasksDone: [],
      mastery: {},
      opened: {},          // chest/door keys like "d3:12,5"
      bossesDefeated: {},
      streak: 0,
      totals: { answered: 0, correct: 0 },
      worldPos: null,      // remembered overworld position
    };
    E.enterWorld();
    E.save();
  };

  E.save = function () {
    if (!E.state) return;
    const s = E.state;
    const snapshot = { ...s, map: undefined, monsters: undefined, grid: undefined };
    localStorage.setItem(SAVE_PREFIX + s.name, JSON.stringify(snapshot));
  };

  E.load = function (name) {
    const raw = localStorage.getItem(SAVE_PREFIX + name);
    if (!raw) return false;
    E.state = JSON.parse(raw);
    E.enterWorld();  // always resume on the overworld (dungeon monsters respawn anyway)
    return true;
  };

  E.profiles = function () {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(SAVE_PREFIX)) out.push(k.slice(SAVE_PREFIX.length));
    }
    return out.sort();
  };

  E.deleteProfile = function (name) {
    localStorage.removeItem(SAVE_PREFIX + name);
  };

  // ---------- map handling ----------
  E.enterWorld = function () {
    const s = E.state;
    s.mapId = 'world';
    s.grid = MM.maps.parse(MM.maps.OVERWORLD, '~');
    s.monsters = [];
    const start = s.worldPos || MM.maps.find(s.grid, 'P')[0];
    s.px = start.x; s.py = start.y;
    MM.ui.log('You stand in the kingdom of Numeria.');
    MM.ui.refresh();
  };

  E.enterDungeon = function (idx) {
    const s = E.state;
    const task = MM.data.TASKS[idx - 1];
    s.worldPos = { x: s.px, y: s.py };
    s.mapId = 'd' + idx;
    s.dungeonIndex = idx;
    s.grid = MM.maps.parse(MM.maps.DUNGEONS[idx - 1], '#');
    // strip opened chests/doors from the grid
    for (const key of Object.keys(s.opened)) {
      const [mid, xy] = key.split(':');
      if (mid !== s.mapId) continue;
      const [x, y] = xy.split(',').map(Number);
      s.grid[y][x] = '.';
    }
    // spawn monsters from map markers
    s.monsters = [];
    const roster = MM.data.MONSTERS[idx - 1];
    for (const pos of MM.maps.find(s.grid, 'm')) {
      s.grid[pos.y][pos.x] = '.';
      const [name, emoji] = roster.types[Math.floor(Math.random() * roster.types.length)];
      const st = MM.data.monsterStats(idx, false);
      s.monsters.push({ name, emoji, x: pos.x, y: pos.y, hp: st.hp, maxhp: st.hp, atk: st.atk, xp: st.xp, boss: false, stun: 0 });
    }
    const bpos = MM.maps.find(s.grid, 'b')[0];
    s.grid[bpos.y][bpos.x] = '.';
    if (!s.bossesDefeated[s.mapId]) {
      const [bname, bemoji] = roster.boss;
      const bst = MM.data.monsterStats(idx, true);
      s.monsters.push({ name: bname, emoji: bemoji, x: bpos.x, y: bpos.y, hp: bst.hp, maxhp: bst.hp, atk: bst.atk, xp: bst.xp, gold: bst.gold, boss: true, stun: 0 });
    }
    const exit = MM.maps.find(s.grid, 'X')[0];
    s.px = exit.x; s.py = exit.y;
    MM.ui.log(`You enter the ${task.dungeon}. (${MM.data.SKILL_NAMES[task.skill]})`);
    MM.ui.refresh();
  };

  E.exitDungeon = function () {
    MM.ui.log('You step back out into the daylight.');
    E.enterWorld();
    E.save();
  };

  // ---------- movement ----------
  E.tryMove = function (dx, dy) {
    const s = E.state;
    if (!s || MM.ui.modalOpen()) return;
    const nx = s.px + dx, ny = s.py + dy;
    if (ny < 0 || ny >= s.grid.length || nx < 0 || nx >= s.grid[0].length) return;
    const ch = s.grid[ny][nx];

    if (s.mapId === 'world') {
      if ('C'.includes(ch)) return E.castle();
      if (ch === 'S') return MM.ui.openShop();
      if (ch === 'I') return E.inn();
      if ('1234567890'.includes(ch)) return E.tryEnterDungeon(ch === '0' ? 10 : +ch);
      if (ch === '.' || ch === 'P') { s.px = nx; s.py = ny; MM.ui.refresh(); }
      return;
    }

    // dungeon
    const mon = s.monsters.find(m => m.x === nx && m.y === ny && m.hp > 0);
    if (mon) return E.startCombat(mon);
    if (ch === 'D') return E.mathDoor(nx, ny);
    if (ch === '*') return E.chest(nx, ny);
    if (ch === '#') return;
    s.px = nx; s.py = ny;
    if (ch === 'X') {
      MM.ui.refresh();
      return E.exitDungeon();
    }
    E.monsterTurn();
    MM.ui.refresh();
  };

  E.monsterTurn = function () {
    const s = E.state;
    let attacker = null;
    for (const m of s.monsters) {
      if (m.hp <= 0) continue;
      if (m.stun > 0) { m.stun--; continue; }
      const dist = Math.abs(m.x - s.px) + Math.abs(m.y - s.py);
      if (dist === 1) { attacker = attacker || m; continue; }
      if (dist > 7) continue;
      // greedy step toward the player
      const opts = [];
      if (m.x < s.px) opts.push([1, 0]);
      if (m.x > s.px) opts.push([-1, 0]);
      if (m.y < s.py) opts.push([0, 1]);
      if (m.y > s.py) opts.push([0, -1]);
      for (const [dx, dy] of opts) {
        const nx = m.x + dx, ny = m.y + dy;
        const ch = s.grid[ny] && s.grid[ny][nx];
        if (ch !== '.') continue;
        if (nx === s.px && ny === s.py) continue;
        if (s.monsters.some(o => o !== m && o.hp > 0 && o.x === nx && o.y === ny)) continue;
        m.x = nx; m.y = ny;
        break;
      }
      if (Math.abs(m.x - s.px) + Math.abs(m.y - s.py) === 1) attacker = attacker || m;
    }
    if (attacker) {
      MM.ui.log(`The ${attacker.name} attacks!`);
      E.startCombat(attacker);
    }
  };

  // ---------- combat ----------
  function playerDamage() {
    const s = E.state;
    const w = MM.data.weaponById(s.weapon);
    let bonus = 0;
    if (s.streak >= 6) bonus = 4;
    else if (s.streak >= 3) bonus = 2;
    return 2 + w.atk + bonus;
  }

  function recordAnswer(skill, correct) {
    const s = E.state;
    MM.mastery.record(s, skill, correct);
    s.totals.answered++;
    if (correct) { s.totals.correct++; s.streak++; }
    else s.streak = 0;
  }

  E.startCombat = function (mon) {
    const s = E.state;
    const step = () => {
      const prob = MM.mastery.pickCombatProblem(s, s.dungeonIndex);
      MM.ui.showProblem({
        header: `${mon.emoji} <b>${mon.name}</b> — ${'❤'.repeat(Math.max(1, Math.ceil(mon.hp / mon.maxhp * 5)))} ${mon.hp}/${mon.maxhp} HP`,
        problem: prob,
        leaveLabel: 'Flee 🏃',
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
          if (correct) {
            const dmg = playerDamage();
            mon.hp -= dmg;
            if (mon.hp <= 0) {
              const gold = mon.boss ? mon.gold : Math.floor(Math.random() * (2 * s.dungeonIndex)) + s.dungeonIndex;
              s.gold += gold;
              E.gainXp(mon.xp);
              let msg = `You defeat the ${mon.name}! +${mon.xp} XP, +${gold} gold.`;
              if (mon.boss) {
                s.bossesDefeated[s.mapId] = true;
                s.haveItem = true;
                const task = MM.data.TASKS[s.dungeonIndex - 1];
                msg += `<br><br>${task.itemEmoji} <b>You found the ${task.item}!</b><br>Bring it to the MathMaker at the castle! 🏰`;
                MM.sound.fanfare();
              }
              E.save();
              return { msg, end: 'win' };
            }
            return { msg: `⚔️ You strike the ${mon.name} for ${dmg} damage!` };
          }
          const dmg = Math.max(1, mon.atk - MM.data.armorById(s.armor).def);
          s.hp -= dmg;
          if (s.hp <= 0) return { msg: `💥 The ${mon.name} hits you for ${dmg}!`, end: 'dead' };
          return { msg: `💥 The ${mon.name} hits you for ${dmg} damage. Careful!` };
        },
        onNext: step,
        onEnd(kind) {
          if (kind === 'dead') return E.die();
          if (kind === 'leave') { mon.stun = 1; MM.ui.log(`You flee from the ${mon.name}.`); }
          MM.ui.refresh();
        },
      });
    };
    step();
  };

  E.gainXp = function (amount) {
    const s = E.state;
    s.xp += amount;
    while (s.xp >= MM.data.xpForLevel(s.level)) {
      s.xp -= MM.data.xpForLevel(s.level);
      s.level++;
      s.maxhp += 5;
      s.hp = s.maxhp;
      MM.ui.log(`⭐ Level up! You are now level ${s.level}. Max HP is ${s.maxhp}.`);
      MM.sound.levelup();
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
      `The fall cost you <b>${lost} gold</b>, but you kept everything you learned. Rest at the inn 🛏 and try again!`);
  };

  // ---------- doors and chests ----------
  E.mathDoor = function (x, y) {
    const s = E.state;
    const skill = MM.data.TASKS[s.dungeonIndex - 1].skill;
    const step = () => {
      const prob = MM.problems.generate(skill, Math.max(2, MM.mastery.tierFor(s, skill)));
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

  E.chest = function (x, y) {
    const s = E.state;
    const skill = MM.data.TASKS[s.dungeonIndex - 1].skill;
    let reward = MM.data.chestGold(s.dungeonIndex);
    const step = () => {
      const prob = MM.problems.generate(skill, 3);
      MM.ui.showProblem({
        header: '🎁 <b>A treasure chest with a puzzle lock!</b> <i>(tricky — take your time)</i>',
        problem: prob,
        leaveLabel: 'Leave it for now',
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
          if (correct) {
            s.grid[y][x] = '.';
            s.opened[`${s.mapId}:${x},${y}`] = true;
            let msg;
            if (Math.random() < 0.3) {
              s.potions++;
              msg = `Inside: a ${MM.data.POTION.emoji} <b>Healing Potion</b> and <b>${Math.floor(reward / 2)} gold</b>!`;
              s.gold += Math.floor(reward / 2);
            } else {
              s.gold += reward;
              msg = `Inside: <b>${reward} gold</b>! 💰`;
            }
            MM.sound.coin();
            E.save();
            return { msg, end: 'win' };
          }
          reward = Math.max(5, Math.floor(reward / 2));
          return { msg: `The chest jams and reshuffles its lock. (Its treasure shrinks to ${reward} gold...)` };
        },
        onNext: step,
        onEnd() { MM.ui.refresh(); },
      });
    };
    step();
  };

  // ---------- town ----------
  E.tryEnterDungeon = function (idx) {
    const s = E.state;
    if (s.taskIndex === 0) {
      return MM.ui.dialog('🏰 Sealed', 'A magical seal covers the entrance. Perhaps the <b>MathMaker</b> at the castle knows more. Visit the castle first!');
    }
    if (idx > s.taskIndex) {
      const task = MM.data.TASKS[idx - 1];
      return MM.ui.dialog('🔒 Sealed', `The ${task.dungeon} is sealed by the MathMaker's magic. Finish your earlier tasks first!`);
    }
    E.enterDungeon(idx);
  };

  E.castle = function () {
    const s = E.state;
    if (s.taskIndex === 0) {
      s.taskIndex = 1;
      const t = MM.data.TASKS[0];
      E.save();
      return MM.ui.dialog('🧙 The MathMaker',
        `Welcome, young adventurer! I am the <b>MathMaker</b>, keeper of the kingdom's knowledge.<br><br>` +
        `Ten treasures have been scattered into ten dangerous places, and only someone sharp with numbers can win them back. ` +
        `Complete my ten tasks and you shall wear the <b>Crown of Numbers</b>!<br><br>` + t.assign,
        () => MM.ui.refresh());
    }
    const t = MM.data.TASKS[s.taskIndex - 1];
    if (s.haveItem) {
      const reward = MM.data.taskReward(s.taskIndex);
      s.haveItem = false;
      s.tasksDone.push(s.taskIndex);
      s.gold += reward.gold;
      E.gainXp(reward.xp);
      s.taskIndex++;
      E.save();
      MM.sound.fanfare();
      if (s.taskIndex > 10) {
        return MM.ui.victory();
      }
      const next = MM.data.TASKS[s.taskIndex - 1];
      return MM.ui.dialog(`🧙 Task ${s.tasksDone.length} of 10 complete!`,
        `${t.itemEmoji} ${t.done}<br><br>Your reward: <b>${reward.gold} gold</b> and <b>${reward.xp} XP</b>.<br><br>` +
        `<hr>📜 <b>Your next task:</b><br>${next.assign}`);
    }
    return MM.ui.dialog('🧙 The MathMaker',
      `Ah, back so soon? Your task awaits:<br><br>📜 ${t.assign}<br><br>` +
      `<i>The ${t.dungeon} is marked with a <b>${s.taskIndex === 10 ? '0' : s.taskIndex}</b> on the map.</i>`);
  };

  E.inn = function () {
    const s = E.state;
    if (s.hp >= s.maxhp && s.taskIndex === 0) {
      return MM.ui.dialog('🛏 The Cozy Compass Inn', 'The innkeeper waves. "Come back when you need a rest, dear!"');
    }
    const probs = MM.mastery.pickReviewProblems(s, Math.max(1, s.taskIndex), 3);
    let i = 0;
    const step = () => {
      const prob = probs[i];
      MM.ui.showProblem({
        header: `🛏 <b>The Cozy Compass Inn</b> — warm-up ${i + 1} of 3 <i>(a good night's sleep for a good night's thinking)</i>`,
        problem: prob,
        leaveLabel: 'Skip the rest',
        onAnswer(correct) {
          recordAnswer(prob.skill, correct);
          i++;
          const msg = correct ? '✓ Nice.' : 'The innkeeper smiles: "You\'ll get it next time."';
          if (i >= probs.length) {
            s.hp = s.maxhp;
            E.save();
            return { msg: msg + '<br><br>😴 You sleep wonderfully. <b>HP fully restored!</b>', end: 'win' };
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
    if (!s || MM.ui.modalOpen()) return;
    if (s.potions <= 0) return MM.ui.log('No potions left! Buy more at the shop 🏪.');
    if (s.hp >= s.maxhp) return MM.ui.log('You are already at full health.');
    s.potions--;
    s.hp = Math.min(s.maxhp, s.hp + MM.data.POTION.heal);
    MM.sound.coin();
    MM.ui.log(`🧪 You drink a potion. HP: ${s.hp}/${s.maxhp}.`);
    E.save();
    MM.ui.refresh();
  };

  // Shop purchase, optionally with a money problem for a discount.
  E.buy = function (item, kind) {
    const s = E.state;
    if (s.gold < item.price) {
      return MM.ui.dialog('🏪 Shop', `The shopkeeper shakes her head. "That ${item.name} costs <b>${item.price} gold</b> — you have ${s.gold}."`);
    }
    // money word problem -> 10% discount
    const g = s.gold, c = item.price;
    const prob = {
      kind: 'number', skill: 'word_problems', tier: 2,
      text: `The shopkeeper grins: "Quick one for a discount! You have ${g} gold and the ${item.name} costs ${c}. If you buy it at full price, how much gold will you have left?"`,
      answer: MM.problems.frac(g - c, 1),
      solution: `${g} − ${c} = ${g - c} gold.`,
    };
    MM.ui.showProblem({
      header: `🏪 <b>${item.emoji} ${item.name}</b> — ${item.price} gold`,
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
        if (kind === 'weapon') { s.weapon = item.id; msg += `<br>You equip the ${item.emoji} <b>${item.name}</b>.`; }
        else if (kind === 'armor') { s.armor = item.id; msg += `<br>You put on the ${item.emoji} <b>${item.name}</b>.`; }
        else { s.potions++; msg += `<br>You now have ${s.potions} 🧪 potion${s.potions === 1 ? '' : 's'}.`; }
        MM.sound.coin();
        E.save();
        return { msg, end: 'win' };
      },
      onNext: () => {},
      onEnd() { MM.ui.openShop(); },
    });
  };
})();
