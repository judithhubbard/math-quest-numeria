// ===== Wave 15: "The Parlor" — the card game "Tiny Hats" (pure engine) =====
// The endgame "one more round" hook. Cards are the monster KINDS the kid has
// met; play is compare-and-capture (Triple Triad shape). Winning well is fast
// number comparison and running addition, at high volume, under NO time
// pressure. This file is DOM-free and fully deterministic so it unit-tests
// cleanly (the opponent + all card data are pure functions — poison
// Math.random and nothing here changes). The room, rewards, and the match UI
// live in engine.js / ui.js; this is only the rules.
(function () {
  const MM = globalThis.MM || (globalThis.MM = {});
  const P = {};
  MM.parlor = P;

  // ---- the kind catalog: toughness + art, built once from the bestiary ----
  // A card is a monster KIND. Its four EDGE numbers derive PURELY from the
  // kind's name + its toughness (which dungeon roster it belongs to) — so a
  // kid's deck reflects who they've met, and tougher kinds carry bigger edges.
  // NO Math.random anywhere in card data (unit-tested by poisoning it).
  function buildCatalog() {
    const cat = {};
    const rosters = (MM.data && MM.data.MONSTERS) || [];
    rosters.forEach((r, i) => {
      const tuf = i + 1;                       // roster index → toughness
      for (const t of r.types) cat[t.name] = { name: t.name, sprite: t.sprite, pal: t.pal || null, tuf };
      if (r.boss) cat[r.boss.name] = { name: r.boss.name, sprite: r.boss.sprite, pal: r.boss.pal || null, tuf: tuf + 1, boss: true };
    });
    // The two non-roster cards (the Homework Golem, the Wandering Chest) sit
    // mid-ladder so a deck that only knows them is still playable.
    for (const extra of [MM.data && MM.data.GOLEM_CARD, MM.data && MM.data.MIMIC_CARD]) {
      if (extra && !cat[extra.name]) cat[extra.name] = { name: extra.name, sprite: extra.sprite, pal: extra.pal || null, tuf: 7 };
    }
    return cat;
  }
  let CATALOG = null;
  P.catalog = function () { return CATALOG || (CATALOG = buildCatalog()); };
  P._resetCatalog = function () { CATALOG = null; };   // tests
  P.kindInfo = function (name) { return P.catalog()[name] || { name: name, sprite: 'slime', pal: null, tuf: 3 }; };

  // FNV-1a — a deterministic string hash (no Math.random).
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  P._hash = hash;

  // Edge values: a PURE function of (kind name, edge, twoDigit). Tougher kinds
  // skew higher. Single-digit 1..9 by default; two-digit 10..99 when the parent
  // dial is raised (real magnitude comparison + bigger running sums). Ties are
  // allowed — a capture needs STRICTLY greater, so a tie holds.
  P.EDGE_KEYS = ['t', 'r', 'b', 'l'];
  P.edgesFor = function (name, twoDigit) {
    const info = P.kindInfo(name);
    const tuf = Math.max(1, info.tuf | 0);
    const e = {};
    for (const k of P.EDGE_KEYS) {
      const h = hash(name + '|' + k + (twoDigit ? '|2' : '|1'));
      if (twoDigit) {
        const lo = Math.min(70, 10 + Math.round(tuf * 2.4));   // ~12..~60
        e[k] = lo + (h % (99 - lo + 1));                       // lo..99
      } else {
        const lo = Math.max(1, Math.min(6, Math.round(tuf / 3.5))); // 1..6
        e[k] = lo + (h % (9 - lo + 1));                        // lo..9
      }
    }
    return e;
  };

  // A card object for a kind. Befriended kinds are FOIL — they wear a tiny hat
  // on the card (the collection hook). The hat is a pure pick, not random.
  const HATS = ['🎩', '👒', '🧢', '👑', '🎓', '🪖', '🎀', '⛑️'];
  P.hatFor = function (name) { return HATS[hash(name + '|hat') % HATS.length]; };
  P.cardFor = function (name, twoDigit, foil) {
    const info = P.kindInfo(name);
    return {
      kind: name, name: name, sprite: info.sprite, pal: info.pal,
      foil: !!foil, hat: foil ? P.hatFor(name) : null,
      edges: P.edgesFor(name, twoDigit),
    };
  };

  // Is the two-digit parent dial raised? (Follows the parent-switch pattern.)
  P.twoDigit = function (state) { return !!(state && state.parent && state.parent.parlorTwoDigit); };

  // The kid's DECK = every KIND met (bestiary.seen). Befriended kinds are foil.
  P.deckFromState = function (state) {
    const seen = (state && state.bestiary && state.bestiary.seen) || {};
    const bef = (state && state.bestiary && state.bestiary.befriended) || {};
    const twoDigit = P.twoDigit(state);
    return Object.keys(seen).filter(n => P.catalog()[n]).map(n => P.cardFor(n, twoDigit, !!bef[n]));
  };
  // The house (opponent) draws from the WHOLE catalog — the dealer brings its
  // own cards, and some you can win. Never foil (their cards are plain until
  // you take them and give them a hat).
  P.houseDeck = function (state) {
    const twoDigit = P.twoDigit(state);
    return Object.keys(P.catalog()).map(n => P.cardFor(n, twoDigit, false));
  };

  // ---- the board: 9 cells (3x3), each null | { card, side } ----
  P.CELLS = 9;
  // For a placement at `cell`, which neighbours to compare and which edges
  // face each other (MY edge vs THEIR opposite edge).
  P.neighbors = function (i) {
    const r = Math.floor(i / 3), c = i % 3, out = [];
    if (r > 0) out.push({ cell: i - 3, mine: 't', theirs: 'b' });  // up
    if (r < 2) out.push({ cell: i + 3, mine: 'b', theirs: 't' });  // down
    if (c > 0) out.push({ cell: i - 1, mine: 'l', theirs: 'r' });  // left
    if (c < 2) out.push({ cell: i + 1, mine: 'r', theirs: 'l' });  // right
    return out;
  };
  // Placing `card` for `side` at `cell`: return the indices of enemy cards
  // CAPTURED — my facing edge STRICTLY greater than theirs. Pure (no mutation).
  P.capturesAt = function (board, cell, card, side) {
    const flips = [];
    for (const nb of P.neighbors(cell)) {
      const occ = board[nb.cell];
      if (!occ || occ.side === side) continue;
      if (card.edges[nb.mine] > occ.card.edges[nb.theirs]) flips.push(nb.cell);
    }
    return flips;
  };

  // ---- the match: two hands of 5, the kid ('you') places first, alternating.
  // With 9 cells the last card goes unplayed. Winner = who owns more cells (an
  // odd cell count means a full board never ties; an abandoned board can).
  P.newMatch = function (opts) {
    opts = opts || {};
    return {
      board: new Array(P.CELLS).fill(null),
      hands: { you: (opts.youHand || []).slice(), opp: (opts.oppHand || []).slice() },
      turn: opts.first || 'you',
      plies: opts.plies || 1,
      placements: 0,
      lastFlips: [],
      lastCell: -1,
    };
  };
  P.emptyCells = function (m) { const out = []; for (let i = 0; i < P.CELLS; i++) if (!m.board[i]) out.push(i); return out; };
  P.isOver = function (m) { return P.emptyCells(m).length === 0 || (!m.hands.you.length && !m.hands.opp.length); };

  // Place hands[side][cardIndex] at cell. Applies captures, advances the turn.
  P.play = function (m, side, cardIndex, cell) {
    if (m.board[cell]) return false;
    const card = m.hands[side][cardIndex];
    if (!card) return false;
    m.hands[side].splice(cardIndex, 1);
    m.board[cell] = { card: card, side: side };
    const flips = P.capturesAt(m.board, cell, card, side);
    for (const f of flips) m.board[f].side = side;
    m.lastFlips = flips; m.lastCell = cell;
    m.placements++;
    m.turn = side === 'you' ? 'opp' : 'you';
    return true;
  };

  P.score = function (m) {
    let you = 0, opp = 0;
    for (const c of m.board) { if (!c) continue; if (c.side === 'you') you++; else opp++; }
    return { you: you, opp: opp };
  };
  P.winner = function (m) {
    const s = P.score(m);
    if (s.you > s.opp) return 'you';
    if (s.opp > s.you) return 'opp';
    return 'tie';
  };

  // ---- the DETERMINISTIC opponent (NO Math.random) ----
  // Scans every legal (card in hand × empty cell), scores each by IMMEDIATE
  // captures, and picks the maximum. Documented tiebreak, stable + reproducible:
  //   most captures, then LOWEST cell index, then LOWEST card index in hand.
  // (2-ply lookahead was scoped out for v1 under the wave's deviation authority;
  // 1-ply greedy is a fine first opponent. `plies` is threaded through the match
  // so a later pass can extend the search without touching any caller.)
  P.oppMove = function (m) {
    const hand = m.hands.opp, cells = P.emptyCells(m);
    let best = null;
    for (let ci = 0; ci < hand.length; ci++) {
      for (let k = 0; k < cells.length; k++) {
        const cell = cells[k];
        const gain = P.capturesAt(m.board, cell, hand[ci], 'opp').length;
        let better = false;
        if (!best) better = true;
        else if (gain > best.gain) better = true;
        else if (gain === best.gain && cell < best.cell) better = true;
        else if (gain === best.gain && cell === best.cell && ci < best.cardIndex) better = true;
        if (better) best = { cardIndex: ci, cell: cell, gain: gain };
      }
    }
    return best;
  };
  P.oppPlay = function (m) {
    const mv = P.oppMove(m);
    if (!mv) return null;
    P.play(m, 'opp', mv.cardIndex, mv.cell);
    return mv;
  };

  // Play a whole match to completion given a KID strategy function
  // kidMove(match) -> {cardIndex, cell}. Deterministic if the strategy is —
  // used by the unit suite to prove the opponent terminates on a real board.
  P.autoplay = function (m, kidMove) {
    let guard = 0;
    while (!P.isOver(m) && guard++ < 64) {
      if (m.turn === 'you') {
        if (!m.hands.you.length) { m.turn = 'opp'; continue; }
        const mv = kidMove(m);
        if (!mv || !P.play(m, 'you', mv.cardIndex, mv.cell)) break;
      } else {
        if (!m.hands.opp.length) { m.turn = 'you'; continue; }
        if (!P.oppPlay(m)) break;
      }
    }
    return P.winner(m);
  };

  // ---- the Games Den side-table: "reach 20, don't go over" ----
  // Pure mental addition. Dice rolls sum; the kid totals each step. No
  // probability instruction (that's 7th grade), no loss-chasing: busting just
  // ends the round with NO reward — you never LOSE tokens on the dice.
  P.diceTotal = function (rolls) { return rolls.reduce((a, b) => a + b, 0); };
  P.diceReward = function (total) {
    if (total > 20) return 0;      // bust — costs nothing, pays nothing
    if (total === 20) return 3;    // exactly 20 — the jackpot
    if (total >= 17) return 2;     // close
    if (total >= 12) return 1;     // respectable
    return 0;                      // stopped too early — still no cost
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P;
})();
