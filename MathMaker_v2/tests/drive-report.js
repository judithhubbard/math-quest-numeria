// Drive the 2026-07-17 report-card completeness fix: the three sea-taught
// topics (clocks/geometry/music) appear on the report card and badge shelf
// once attempted — they were always recorded in s.mastery but never shown —
// and the Practice Yard's clean-run stars get their own section (read from
// s.yard, which deliberately never touches mastery).
const { chromium } = require('playwright');
const path = require('path');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';
const SHOTS = path.join(__dirname, 'shots-report');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1150, height: 900 } })).newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  const checks = [];
  const check = (ok, msg) => { checks.push((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) console.log('FAIL ' + msg); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(GAME);
  await page.waitForSelector('#newName');
  await page.fill('#newName', 'ReportKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  const openReport = async () => { await ev(() => MM.ui.reportCard()); await page.waitForTimeout(120); return ev(() => document.getElementById('modalBox').innerText); };
  const closeModal = () => ev(() => { while (MM.ui.modalOpen()) { const b = document.querySelector('#modalBox .btnrow button:last-child'); if (b) b.click(); else break; } });

  // ---- fresh profile: no sea rows, no yard section, no empty noise ----
  let rc = await openReport();
  check(!/Learned at sea/.test(rc), 'fresh profile: no "Learned at sea" section (nothing attempted)');
  check(!/Practice Yard/.test(rc), 'fresh profile: no Practice Yard section (no stars yet)');
  check(!/Clockwork Spire/.test(rc), 'fresh profile: no spire row');
  await closeModal();

  // ---- attempt the three sea topics; rows appear, labeled by where taught ----
  await ev(() => {
    const s = MM.engine.state;
    for (let i = 0; i < 5; i++) MM.mastery.record(s, 'time_reading', i > 0);
    for (let i = 0; i < 4; i++) MM.mastery.record(s, 'geometry', true);
    for (let i = 0; i < 3; i++) MM.mastery.record(s, 'music_reading', i % 2 === 0);
    s.badges = s.badges || {}; s.badges.geometry = 1;
  });
  rc = await openReport();
  check(/Learned at sea/.test(rc), 'sea section appears once a sea topic has attempts');
  check(/Reading Time \(Clocks\)/.test(rc) && /the Clockwork Spire/.test(rc), 'clocks row present, labeled with the Spire');
  check(/Geometry/.test(rc) && /the Sunken Breakwater/.test(rc), 'geometry row present, labeled with the Breakwater');
  check(/Reading Music/.test(rc) && /the Resonant Halls/.test(rc), 'music row present, labeled with the Halls');
  check(/4\/4 \(100%\)/.test(rc), 'geometry accuracy is real recorded numbers');
  check(/🥉/.test(rc), "geometry's bronze badge shows on its sea row");
  const seaLocked = await ev(() => Array.from(document.querySelectorAll('#modalBox .report-row')).some(r => /⛵/.test(r.textContent) && /🔒/.test(r.textContent)));
  check(!seaLocked, 'sea rows are never locked');
  await page.screenshot({ path: SHOTS + '/1-sea-rows.png' });
  await closeModal();

  // ---- badge shelf (bag) mirrors the rule ----
  await ev(() => MM.ui.openBag());
  await page.waitForTimeout(120);
  const bag = await ev(() => document.getElementById('modalBox').innerText);
  check(/Reading Time \(Clocks\)/.test(bag), 'badge shelf lists an attempted sea topic');
  check(/Geometry/.test(bag), 'badge shelf lists the badged sea topic');
  await closeModal();

  // ---- Practice Yard stars section ----
  await ev(() => {
    const s = MM.engine.state;
    s.yard = s.yard || { stars: {}, milestones: {}, challenge: null, seen: false };
    s.yard.stars = { doubles: 2, x2: 3, make10: 7 };  // 7 = defensive cap check
  });
  rc = await openReport();
  check(/Practice Yard/.test(rc), 'yard section appears once stars exist');
  check(/every ★ is a whole drill, all 8 right/.test(rc), 'the star legend states the clean-run rule');
  check(/Doubles[\s\S]*★★☆/.test(rc), 'a 2-star card shows ★★☆');
  const doubleRow = await ev(() => Array.from(document.querySelectorAll('#modalBox .report-row')).map(r => r.textContent).filter(t => /Make 10/.test(t))[0] || '');
  check(/★★★/.test(doubleRow) && !/★★★★/.test(doubleRow), 'stars cap at ★★★ even if state holds more');
  await page.screenshot({ path: SHOTS + '/2-yard-stars.png' });
  await closeModal();

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
