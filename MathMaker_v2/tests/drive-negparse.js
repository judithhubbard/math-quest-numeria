// Drive the Wave 19 negative-answer parser end-to-end (Looking Glass P0).
// The parser now ACCEPTS a leading sign on `num` answers; nothing generates
// negatives yet, so this injects a SYNTHETIC negative-answer problem through
// MM.ui.showProblem and drives the real input→parse→check path: a kid TYPES
// "-3" (ASCII hyphen) and "−3" (the displayed U+2212 minus) — both accepted
// as correct — while a positive typed for a negative answer is gently wrong
// (re-ask, no crash, no JS errors). Invisible in normal play: pure capability.
const { chromium } = require('playwright');
const GAME = 'file:///Users/jk/Dropbox/Claude/TaskMaker_math/MathMaker_v2/index.html';

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
  await page.fill('#newName', 'MirrorKid');
  await page.click('#btnNew');
  await page.waitForSelector('#profileScreen.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // Helper: open a synthetic negative-answer problem via the real showProblem
  // path, capturing the result of onAnswer(correct, kidAnswer) into globals.
  const openNegProblem = () => ev(() => {
    const frac = MM.problems.frac;
    window.__neg = { correct: null, kidAnswer: null, ended: false };
    MM.ui.showProblem({
      header: 'Through the Looking Glass',
      problem: { kind: 'number', skill: 'addsub_facts', tier: 1,
        text: 'What is 4 − 7?', answer: frac(-3, 1), solution: '4 − 7 = −3.' },
      onAnswer: (correct, kidAnswer) => { window.__neg = { correct, kidAnswer }; },
      onNext: () => { window.__neg.ended = 'next'; },
      onEnd: (how) => { window.__neg.ended = how; },
    });
  });

  const typeAndSubmit = async (text) => {
    // set the value directly (the input has no sanitizer; fill also can't type
    // a lone U+2212 reliably across keyboards) then click Answer ✓.
    await ev((t) => { document.getElementById('answerInput').value = t; }, text);
    await page.click('#submitBtn');
    await page.waitForTimeout(120);
  };

  // ---- 1) the input box actually accepts a typed sign (no sanitizer strips it) ----
  await openNegProblem();
  check(await ev(() => !!document.getElementById('answerInput')), 'answer input box is present for a num problem');
  await ev(() => { document.getElementById('answerInput').value = '-3'; });
  check(await ev(() => document.getElementById('answerInput').value === '-3'),
    'the input box keeps a typed hyphen "-3" (no on-input sanitizer strips it)');
  await ev(() => { document.getElementById('answerInput').value = '−3'; });
  check(await ev(() => document.getElementById('answerInput').value === '−3'),
    'the input box keeps a typed unicode-minus "−3"');

  // ---- 2) typing "-3" (ASCII hyphen) is accepted as CORRECT ----
  await typeAndSubmit('-3');
  let r = await ev(() => window.__neg);
  check(r.correct === true, 'typing "-3" (hyphen) is graded CORRECT against frac(-3,1)');
  check(r.kidAnswer === '-3', 'the verbatim kid answer "-3" is passed through to onAnswer');
  check(await ev(() => /Correct/.test((document.getElementById('feedback') || {}).innerText || '')),
    'the modal shows the ✓ Correct feedback');

  // ---- 3) typing "−3" (U+2212, the DISPLAYED glyph) is also accepted ----
  await openNegProblem();
  await typeAndSubmit('−3');
  r = await ev(() => window.__neg);
  check(r.correct === true, 'typing "−3" (unicode minus) is graded CORRECT against frac(-3,1)');

  // ---- 4) a POSITIVE typed for a negative answer is gently WRONG (re-ask, no crash) ----
  await openNegProblem();
  await typeAndSubmit('3');
  r = await ev(() => window.__neg);
  check(r.correct === false, 'typing the positive "3" for a −3 answer is graded WRONG (not accepted)');
  check(await ev(() => /Not quite/.test((document.getElementById('feedback') || {}).innerText || '')),
    'the wrong answer shows the gentle "Not quite" + solution (re-ask, never punish)');
  check(await ev(() => MM.ui.modalOpen()), 'the problem modal is still open after a wrong answer (no crash)');

  console.log('\n=== CHECKS ===');
  checks.forEach(c => console.log(c));
  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (checks.some(c => c.startsWith('FAIL')) || errors.length) process.exit(1);
})();
