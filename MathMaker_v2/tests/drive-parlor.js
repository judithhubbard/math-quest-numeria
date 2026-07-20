// Drive Wave 15 — "The Parlor" (the card game "Tiny Hats"). Post-ending,
// combat-free, no timers, gentle failure: the parlor is gated on endingDone
// (pre-ending "not yet"); the deck is the kinds you've met; play is
// compare-and-capture with a DETERMINISTIC opponent; a capture flips a card;
// winning banks a token + sometimes the opponent's card; a LOSS costs zero;
// the two-digit parent dial widens the edges; the dice side-table totals
// correctly; the House Dealer joins the Faculty at its milestone. Screenshots:
// the board mid-match, a capture, a card's tiny hat at scale, the dealer, the
// dice table.
const { chromium } = require('playwright');
const fs = require('fs');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = '/Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/tests/shots-parlor';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const clearModals = () => ev(() => { let n = 0; while (MM.ui.modalOpen() && n++ < 8) { const b = document.querySelector('#modalBox .btnrow button:last-child, #modalBox button:last-child'); if (b) b.click(); else break; } });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'ParlorKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // seed a hero who has MET a spread of kinds (so the deck exists), two of them
  // befriended (foil, hatted cards)
  await ev(() => {
    const s = MM.engine.state;
    s.bestiary.seen = { Slime: true, Bat: true, Skeleton: true, 'Cave Spider': true, 'River Snake': true, 'Ice Sprite': true, 'Wild Boar': true };
    s.bestiary.befriended = { Slime: true, Bat: true };
  });

  // ---- (1) the parlor is GATED on endingDone: pre-ending = a gentle "not yet"
  await ev(() => { MM.engine.enterCastle(); });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 17; s.py = 9; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(-1, 0));   // bump the parlor door 'Z' at (16,9)
  await page.waitForTimeout(120);
  const notYet = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', map: MM.engine.state.mapId }));
  check(notYet.open && /not yet|members only/i.test(notYet.text), 'pre-ending: the parlor door gives a gentle "not yet"');
  check(notYet.map === 'castle', 'pre-ending: the door does not open the parlor');
  await clearModals();

  // ---- become the crowned MathMaker; the door now opens ----
  await ev(() => {
    const s = MM.engine.state;
    s.endingDone = true; s.taskIndex = 14; s.tasksDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    s.enrollSeen = true;
    MM.engine.enterCastle();
  });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 17; s.py = 9; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(-1, 0));    // bump 'Z' → enter the parlor
  await page.waitForTimeout(200);
  const entered = await ev(() => ({ map: MM.engine.state.mapId, open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', seen: MM.engine.state.parlor.seenIntro }));
  check(entered.map === 'parlor', 'post-ending: the door opens the Parlor');
  check(entered.open && /Deuce/.test(entered.text), 'first visit: Deuce introduces the house (once-ever intro)');
  check(entered.seen === true, 'the intro flag is set (never repeats)');
  await clearModals();
  await page.screenshot({ path: SHOTS + '/4-dealer.png' });   // the dealer NPC in the room

  // ---- (2) the dealer hub opens (bump 'D' at (6,4)) ----
  await ev(() => { const s = MM.engine.state; s.px = 6; s.py = 5; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, -1));    // bump the dealer
  await page.waitForTimeout(120);
  const hub = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '', n: document.querySelectorAll('#modalBox .btnrow button').length }));
  check(hub.open && /Play a round/.test(hub.text), 'the dealer hub offers a round');
  check(/Tokens/.test(hub.text) && /Won cards/.test(hub.text), 'the hub shows the token + collection counters');
  await clearModals();

  // ---- (3) a scripted match with a CAPTURE that flips a card (board + hat) ----
  // Build a match by hand: a strong FOIL (hatted) card in hand vs a weak opp
  // card on the board, so placing it captures and flips.
  await ev(() => {
    const strong = { kind: 'Slime', name: 'Slime', sprite: 'slime', pal: null, foil: true, hat: '🎩', edges: { t: 9, r: 9, b: 9, l: 9 } };
    const filler = { kind: 'Bat', name: 'Bat', sprite: 'bat', pal: null, foil: true, hat: '👒', edges: { t: 2, r: 2, b: 2, l: 2 } };
    const weak = { kind: 'Rat', name: 'Rat', sprite: 'rat', pal: null, foil: false, hat: null, edges: { t: 1, r: 1, b: 1, l: 1 } };
    const m = MM.parlor.newMatch({ youHand: [strong, filler], oppHand: [] });
    m.board[1] = { card: weak, side: 'opp' };   // top-mid enemy
    MM.ui.parlorShowBoard(m);
  });
  await page.waitForSelector('#modalBox .pboard');
  const midMatch = await ev(() => ({ cards: document.querySelectorAll('#modalBox .pcard').length, hats: document.querySelectorAll('#modalBox .phat').length, edges: document.querySelectorAll('#modalBox .pedge').length }));
  check(midMatch.cards >= 3, 'the board renders the placed + hand cards');
  check(midMatch.hats >= 1, 'a foil card wears a tiny hat on the board');
  check(midMatch.edges >= 12, 'every card shows its four edge numbers (the comparison math)');
  await page.screenshot({ path: SHOTS + '/1-board.png' });   // the board mid-match (hats + edges)
  await page.click('#modalBox .phand .pcard[data-hand="0"]');   // select the strong foil card
  await page.waitForTimeout(80);
  await page.click('#modalBox .pcell[data-cell="4"]');          // place it in the center (below the enemy)
  await page.waitForTimeout(200);
  const flipped = await ev(() => {
    const m = MM.parlor.current;
    return { owner: m.board[1] && m.board[1].side, placed: !!(m.board[4] && m.board[4].side === 'you'), tally: MM.parlor.score(m) };
  });
  check(flipped.placed, 'the kid card is placed on the board');
  check(flipped.owner === 'you', 'a bigger edge CAPTURES the neighbour (it flips to your side)');
  check(flipped.tally.you === 2 && flipped.tally.opp === 0, 'the running tally updates after the capture');
  await page.screenshot({ path: SHOTS + '/2-capture.png' });   // the capture
  await clearModals();

  // ---- (4) a full match to a WIN banks a token + (forced) the opponent's card
  const winRes = await ev(() => {
    const s = MM.engine.state;
    const P = MM.parlor;
    const C = (k, e) => ({ kind: k, name: k, sprite: 'slime', pal: null, foil: false, hat: null, edges: e });
    const m = P.newMatch({ youHand: [], oppHand: [C('Ice Sprite', { t: 5, r: 5, b: 5, l: 5 })] });
    m.board[0] = { card: C('Bat', { t: 3, r: 3, b: 3, l: 3 }), side: 'you' };
    m.board[1] = { card: C('Bat', { t: 3, r: 3, b: 3, l: 3 }), side: 'you' };
    m.board[2] = { card: C('River Snake', { t: 4, r: 4, b: 4, l: 4 }), side: 'opp' };
    const before = s.parlor.tokens, albumBefore = Object.keys(s.parlor.album).length;
    const real = Math.random; Math.random = () => 0.01;   // force the card award
    const res = MM.engine.parlorFinishMatch(m);
    Math.random = real;
    return { result: res.result, gained: res.tokensGained, wonCard: res.wonCard, before, after: s.parlor.tokens, albumBefore, albumAfter: Object.keys(s.parlor.album).length, wins: s.parlor.wins };
  });
  check(winRes.result === 'you', 'a full match settles as a win');
  check(winRes.after > winRes.before, 'winning banks tokens');
  check(!!winRes.wonCard && winRes.albumAfter > winRes.albumBefore, 'winning sometimes yields the opponent\'s card into the album');
  check(winRes.wins === 1, 'the wins counter counts up');

  // ---- (5) a LOSS costs ZERO tokens (never a real loss, never a scold) ----
  const lossRes = await ev(() => {
    const s = MM.engine.state;
    const P = MM.parlor;
    const C = (k) => ({ kind: k, name: k, sprite: 'slime', pal: null, foil: false, hat: null, edges: { t: 3, r: 3, b: 3, l: 3 } });
    const m = P.newMatch({ youHand: [], oppHand: [] });
    m.board[0] = { card: C('Bat'), side: 'you' };
    m.board[1] = { card: C('Bat'), side: 'opp' };
    m.board[2] = { card: C('Bat'), side: 'opp' };
    const before = s.parlor.tokens;
    const res = MM.engine.parlorFinishMatch(m);
    return { result: res.result, wonCard: res.wonCard, before, after: s.parlor.tokens };
  });
  check(lossRes.result === 'opp', 'a lost match settles as a loss');
  check(lossRes.after >= lossRes.before, 'a loss NEVER reduces tokens (costs zero)');
  check(!lossRes.wonCard, 'a loss never yields a card');

  // ---- (6) the two-digit parent dial widens the edges ----
  const dial = await ev(() => {
    const s = MM.engine.state;
    const one = MM.parlor.deckFromState(s);
    s.parent = s.parent || {}; s.parent.parlorTwoDigit = true;
    const two = MM.parlor.deckFromState(s);
    s.parent.parlorTwoDigit = false;
    const allSmall = one.every(c => Object.values(c.edges).every(v => v >= 1 && v <= 9));
    const allBig = two.every(c => Object.values(c.edges).every(v => v >= 10 && v <= 99));
    return { allSmall, allBig, n: one.length };
  });
  check(dial.n > 0, 'the deck is sourced from the kinds the kid has met');
  check(dial.allSmall, 'single-digit dial: every edge is 1..9');
  check(dial.allBig, 'two-digit dial: every edge is 10..99 (bigger comparison + sums)');

  // ---- (7) the dice side-table totals correctly ----
  await ev(() => { const s = MM.engine.state; s.px = 9; s.py = 3; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, -1));   // bump the dice table 'T' at (9,2)
  await page.waitForTimeout(150);
  const diceOpen = await ev(() => ({ open: MM.ui.modalOpen(), text: (document.getElementById('modalBox') || {}).innerText || '' }));
  check(diceOpen.open && /Reach 20/i.test(diceOpen.text), 'the dice side-table opens');
  await page.screenshot({ path: SHOTS + '/5-dice.png' });   // the dice table
  const diceMath = await ev(() => ({ sum: MM.parlor.diceTotal([4, 5, 6]), bust: MM.parlor.diceReward(23), jackpot: MM.parlor.diceReward(20) }));
  check(diceMath.sum === 15, 'the dice totals correctly (mental addition)');
  check(diceMath.bust === 0 && diceMath.jackpot === 3, 'a bust pays zero; exactly-20 jackpots');
  await clearModals();

  // ---- (8) the House Dealer joins the Faculty at its milestone ----
  const faculty = await ev(() => {
    const s = MM.engine.state;
    s.parlor.games = 3;                  // the milestone
    const claimed = MM.engine.checkFaculty();
    return { has: s.parlor.games >= 3 && s.faculty.includes('dealer'), claimed: claimed.some(p => p.id === 'dealer') };
  });
  check(faculty.has, 'the House Dealer post is claimed at 3 games');
  check(faculty.claimed, 'checkFaculty claims the dealer post (via the Wave 14 extension point)');
  // walk to the castle and screenshot the spawned Faculty NPC (it's a live
  // castle overlay, so facultyAt only resolves once you're on the castle map)
  await ev(() => { MM.engine.enterCastle(); });
  await clearModals();
  const facAt = await ev(() => { const f = MM.engine.facultyAt(13, 4); return f && f.id; });
  check(facAt === 'dealer', 'the dealer stands as a live castle overlay at its post');
  await ev(() => { const s = MM.engine.state; s.px = 13; s.py = 6; MM.ui.refresh(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: SHOTS + '/6-faculty.png' });   // the House Dealer in the castle

  // ---- (9) leaving the parlor lands you back beside the door ----
  await ev(() => { MM.engine.enterParlor(); });
  await clearModals();
  await ev(() => { const s = MM.engine.state; s.px = 6; s.py = 7; MM.ui.refresh(); });
  await ev(() => MM.engine.tryMove(0, 1));   // step onto the exit 'X' at (6,8)
  await page.waitForTimeout(150);
  const back = await ev(() => ({ map: MM.engine.state.mapId }));
  check(back.map === 'castle', 'leaving the parlor returns to the castle');

  // ---- tokens can never go negative (the shop guards it) ----
  const guard = await ev(() => {
    const s = MM.engine.state;
    s.parlor.tokens = 1;
    const blocked = MM.engine.parlorBuyBack('spiral');   // too dear
    return { blocked: blocked === false, tokens: s.parlor.tokens };
  });
  check(guard.blocked && guard.tokens === 1, 'the token shop refuses what you cannot afford (tokens never go negative)');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
