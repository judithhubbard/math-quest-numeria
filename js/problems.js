// MathMaker — problem generators, answer parsing, and checking.
// All answers are exact rationals {n, d}; equivalent forms are accepted
// (3/4 == 6/8 == 0.75). No timers anywhere — accuracy is what counts.
var MM = globalThis.MM = globalThis.MM || {};
(function () {
  'use strict';

  // ---------- small random helpers ----------
  const R = {
    int(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    chance(p) { return Math.random() < p; },
  };

  // ---------- rational helpers ----------
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1;
  }
  function frac(n, d) {
    d = d === undefined ? 1 : d;
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function fadd(a, b) { return frac(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fsub(a, b) { return frac(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fmul(a, b) { return frac(a.n * b.n, a.d * b.d); }
  function feq(a, b) { return a.n * b.d === b.n * a.d; }

  // Pretty-print a fraction: integers plain, improper fractions as mixed numbers.
  function fstr(f, opts) {
    opts = opts || {};
    if (f.d === 1) return String(f.n);
    if (opts.money) return '$' + (f.n / f.d).toFixed(2);
    if (opts.decimal) return String(f.n / f.d);
    if (Math.abs(f.n) > f.d && !opts.improper) {
      const w = Math.trunc(f.n / f.d), r = Math.abs(f.n % f.d);
      return r === 0 ? String(w) : w + ' ' + r + '/' + f.d;
    }
    return f.n + '/' + f.d;
  }
  function money(x) { return '$' + x.toFixed(2); }
  function fmt(n) { return n.toLocaleString('en-US'); }

  // ---------- answer parsing ----------
  // Accepts: 12 | 3.5 | 3/4 | 1 3/4 | 14 r 2 | $3.50 | 1,204 | 3:15
  //   ...and, since Wave 19 (Looking Glass P0), an optional leading sign on
  //   the `num` kinds: "-3", "-1/2", "-2 1/2", "+3". A kid TYPES an ASCII
  //   hyphen "-" (U+002D); the game DISPLAYS a unicode minus "−" (U+2212) —
  //   both round-trip, along with en/em dashes and an optional following
  //   space ("- 3"). A sign is meaningful only for integers/decimals/
  //   fractions; a negative clock or a negative remainder is nonsense, so a
  //   sign in front of a time/remainder form is rejected (→ null). No problem
  //   generates a negative answer yet — this only makes the parser CAPABLE.
  function parseAnswer(str) {
    if (str == null) return null;
    let s = String(str).trim().toLowerCase().replace(/\$/g, '').replace(/,/g, '');
    if (!s) return null;
    // Optional leading sign, `num` kinds only. Strip it, parse the rest with
    // the positive-only logic, then negate. Because the rest is parsed by
    // parseUnsigned (which still requires a leading digit), a second sign
    // ("--3") or a signed time/rem falls through to null.
    const sm = s.match(/^([+\-−–—])\s*(\S.*)$/);
    if (sm) {
      const rest = parseUnsigned(sm[2]);
      if (!rest || rest.kind !== 'num') return null; // reject "--3", "-1:30", "-5 r 2", bare "-"/"−"
      return sm[1] === '+' ? rest : { kind: 'num', f: frac(-rest.f.n, rest.f.d) };
    }
    return parseUnsigned(s);
  }

  function parseUnsigned(s) {
    let m;
    if ((m = s.match(/^(\d{1,2}):(\d{2})$/))) {
      const hh = +m[1], mm = +m[2];
      if (hh > 23 || mm > 59) return null;
      return { kind: 'time', h: hh, m: mm };
    }
    if ((m = s.match(/^(\d+)\s*r\s*(\d+)$/))) {
      return { kind: 'rem', q: +m[1], r: +m[2] };
    }
    if ((m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
      const w = +m[1], n = +m[2], d = +m[3];
      if (d === 0) return null;
      return { kind: 'num', f: frac(w * d + n, d) };
    }
    if ((m = s.match(/^(\d+)\s*\/\s*(\d+)$/))) {
      if (+m[2] === 0) return null;
      return { kind: 'num', f: frac(+m[1], +m[2]) };
    }
    if ((m = s.match(/^(\d*)\.(\d+)$/))) {
      const whole = m[1] || '0', dec = m[2];
      return { kind: 'num', f: frac(+(whole + dec), Math.pow(10, dec.length)) };
    }
    if (/^\d+$/.test(s)) return { kind: 'num', f: frac(+s, 1) };
    return null;
  }

  // problem: {skill, tier, text, kind:'number'|'remainder'|'choice'|'clock', answer, choices?, hint?, solution, svg?}
  //   kind 'number'    -> answer is {n,d}
  //   kind 'remainder' -> answer is {q, r}
  //   kind 'choice'    -> answer is index into choices[]
  //   kind 'clock'     -> answer is {h, m} (h is 1-12); accepts 12-hour
  //                       equivalents (3:15 and 15:15 both match). `svg`,
  //                       when present, is an inline analog clock face to
  //                       render above the question text.
  function checkAnswer(problem, input) {
    if (problem.kind === 'choice') return input === problem.answer;
    const p = parseAnswer(input);
    if (!p) return false;
    if (problem.kind === 'remainder') {
      const a = problem.answer;
      if (p.kind === 'rem') return p.q === a.q && p.r === a.r;
      // a plain number is fine when the remainder is zero
      return a.r === 0 && p.kind === 'num' && feq(p.f, frac(a.q, 1));
    }
    if (problem.kind === 'clock') {
      if (p.kind !== 'time') return false;
      const norm = h => ((h % 12) + 12) % 12; // 12 and 0 are the same hour on a clock face
      return norm(p.h) === norm(problem.answer.h) && p.m === problem.answer.m;
    }
    return p.kind === 'num' && feq(p.f, problem.answer);
  }

  // ---------- generators ----------
  const NAMES = ['Maya', 'Jake', 'Priya', 'Leo', 'Zoe', 'Sam', 'Ava', 'Ben', 'Mia', 'Raj', 'Tess', 'Omar', 'Lily', 'Marcus', 'Nina'];

  function addsub_facts(t) {
    // Tier 3 is this topic's BRAVE tier (playtest 2026-07-12: "the brave
    // problems did not look hard — 3+5"). A facts topic can't escalate PAST
    // facts without breaking the parent switches, so it escalates by
    // COMPOSING them: chains and missing numbers, never plain small sums.
    if (t >= 3) {
      const r = R.int(0, 2);
      if (r === 0) { // missing addend
        const a = R.int(3, 12), b = R.int(3, 12), c = a + b;
        return num(`${a} + ▢ = ${c}\nWhat number goes in the box?`, b,
          `${c} − ${a} = ${b}, so ${a} + ${b} = ${c}.`);
      }
      if (r === 1) { // three addends
        const a = R.int(4, 9), b = R.int(5, 9), c = R.int(4, 9);
        return num(`${a} + ${b} + ${c} = ?`, a + b + c,
          `${a} + ${b} = ${a + b}, then ${a + b} + ${c} = ${a + b + c}.`);
      }
      // two steps, up and down
      const a = R.int(11, 18), b = R.int(3, 9), c = R.int(3, 9);
      return num(`${a} − ${b} + ${c} = ?`, a - b + c,
        `${a} − ${b} = ${a - b}, then ${a - b} + ${c} = ${a - b + c}.`);
    }
    const hi = t === 1 ? 10 : 20;
    if (R.chance(0.5)) {
      const a = R.int(2, hi - 2), b = R.int(2, hi - a);
      return num(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}.`);
    }
    const a = R.int(5, hi), b = R.int(2, a - 1);
    return num(`${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}.`);
  }

  function muldiv_facts(t) {
    // Tier 3 = the brave tier: composed facts only (see addsub_facts).
    if (t >= 3) {
      const r = R.int(0, 2);
      if (r === 0) { // missing factor
        const a = R.int(3, 9), b = R.int(3, 9);
        return num(`${a} × ▢ = ${a * b}\nWhat number goes in the box?`, b,
          `${a * b} ÷ ${a} = ${b}, so ${a} × ${b} = ${a * b}.`);
      }
      if (r === 1) { // three-factor chain, kept small
        const a = R.int(2, 4), b = R.int(2, 5), c = R.int(2, 4);
        return num(`${a} × ${b} × ${c} = ?`, a * b * c,
          `${a} × ${b} = ${a * b}, then ${a * b} × ${c} = ${a * b * c}.`);
      }
      // divide, then multiply
      const a = R.int(3, 8), b = R.int(3, 8), c = R.int(2, 5);
      return num(`${a * b} ÷ ${a} × ${c} = ?`, b * c,
        `${a * b} ÷ ${a} = ${b}, then ${b} × ${c} = ${b * c}.`);
    }
    const lo = t === 1 ? 2 : 3;
    const hi = t === 1 ? 5 : 9;
    const a = R.int(lo, hi), b = R.int(2, 9);
    if (t >= 2 && R.chance(0.4)) {
      return num(`${a * b} ÷ ${a} = ?`, b, `${a * b} ÷ ${a} = ${b} because ${a} × ${b} = ${a * b}.`);
    }
    return num(`${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}.`);
  }

  // Pedagogy pass (2026-07-12): the old solutions said "line up the columns"
  // and then just STATED the answer — hiding the regrouping step, which is
  // the exact thing a stuck kid needs shown. This narrates the first
  // carry/borrow column by column, in the words a teacher would use, and
  // stays short when no regrouping happens.
  const PLACES = ['ones', 'tens', 'hundreds', 'thousands'];
  function addSteps(a, b) {
    const da = String(a).split('').reverse().map(Number), db = String(b).split('').reverse().map(Number);
    let carry = 0;
    const steps = [];
    for (let i = 0; i < Math.max(da.length, db.length); i++) {
      const x = da[i] || 0, y = db[i] || 0, sum = x + y + carry;
      if (sum >= 10 && steps.length < 2) {
        steps.push(`${PLACES[i] || 'next column'}: ${x} + ${y}${carry ? ' + 1' : ''} = ${sum} — write ${sum % 10}, carry the 1`);
      }
      carry = sum >= 10 ? 1 : 0;
    }
    return steps.length
      ? `Line up the columns. ${steps.join('; ')}. Keep going: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`
      : `Line up the columns — no carrying needed: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`;
  }
  function subSteps(a, b) {
    const da = String(a).split('').reverse().map(Number), db = String(b).split('').reverse().map(Number);
    let borrow = 0;
    const steps = [];
    for (let i = 0; i < da.length; i++) {
      const x = da[i] - borrow, y = db[i] || 0;
      if (x < y && steps.length < 2) {
        steps.push(`${PLACES[i] || 'next column'}: ${x} − ${y} can't — borrow a ${PLACES[i + 1] ? PLACES[i + 1].replace(/s$/, '') : 'ten'}: ${x + 10} − ${y} = ${x + 10 - y}`);
      }
      borrow = x < y ? 1 : 0;
    }
    return steps.length
      ? `Line up the columns. ${steps.join('; ')}. Keep going: ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`
      : `Line up the columns — no borrowing needed: ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`;
  }
  function multidigit_addsub(t) {
    const digits = t === 1 ? [10, 99] : t === 2 ? [100, 999] : [1000, 9999];
    let a = R.int(digits[0], digits[1]), b = R.int(digits[0], digits[1]);
    if (t === 3 && R.chance(0.4)) a = R.int(1, 9) * 1000 + R.pick([0, 1, 2]); // subtraction across zeros
    if (R.chance(0.5)) {
      return num(`${fmt(a)} + ${fmt(b)} = ?`, a + b, addSteps(a, b));
    }
    if (b > a) { const s = a; a = b; b = s; }
    if (a === b) a += R.int(1, 9);
    return num(`${fmt(a)} − ${fmt(b)} = ?`, a - b, subSteps(a, b));
  }

  function multidigit_mult(t) {
    let a, b;
    if (t === 1) { a = R.int(12, 99); b = R.int(3, 9); }
    else if (t === 2) { a = R.int(12, 99); b = R.int(12, 39); }
    else { a = R.int(112, 599); b = R.int(12, 49); }
    const tens = Math.floor(b / 10) * 10, ones = b % 10;
    const sol = b >= 10 && ones > 0
      ? `${fmt(a)} × ${b} = ${fmt(a)}×${tens} + ${fmt(a)}×${ones} = ${fmt(a * tens)} + ${fmt(a * ones)} = ${fmt(a * b)}.`
      : `${fmt(a)} × ${b} = ${fmt(a * b)}.`;
    return num(`${fmt(a)} × ${b} = ?`, a * b, sol);
  }

  function long_division(t) {
    let dvsr, q, r;
    // Tier 3 is single-digit divisors ONLY (calibration, playtest 2026-07-13:
    // "463 ÷ 16" at a mainland door was judged too hard — a two-digit divisor
    // means trial-multiplying the divisor at every step, a different skill
    // from the bring-down process the ladder actually teaches; nothing else
    // in the game builds toward it. A 3-digit quotient like 463 ÷ 7 is still
    // genuinely tier-3 work. Same calibration class as v1.6.0's ×100 removal.)
    if (t === 1) { dvsr = R.int(2, 9); q = R.int(11, 99); r = 0; }
    else if (t === 2) { dvsr = R.int(2, 9); q = R.int(11, 99); r = R.int(1, dvsr - 1); }
    else { dvsr = R.int(3, 9); q = R.int(101, 999); r = R.int(1, dvsr - 1); }
    const dividend = dvsr * q + r;
    const ansTxt = r === 0 ? String(q) : `${q} r ${r}`;
    // Pedagogy pass (2026-07-12): the old solution VERIFIED the answer
    // (dvsr × q = dividend) without teaching the process. This walks the
    // actual long-division steps — divide, note the leftover, bring down —
    // digit by digit, the way it's written on paper.
    const walk = [];
    {
      const ds = String(dividend).split('').map(Number);
      let cur = 0, started = false;
      for (let i = 0; i < ds.length; i++) {
        cur = cur * 10 + ds[i];
        if (!started && cur < dvsr && i < ds.length - 1) continue;
        const qd = Math.floor(cur / dvsr), left = cur - qd * dvsr;
        walk.push(started
          ? `bring down the ${ds[i]} → ${cur}; ${dvsr} into ${cur} goes ${qd}${left ? ` (${left} left)` : ''}`
          : `${dvsr} into ${cur} goes ${qd}${left ? ` (${left} left)` : ''}`);
        started = true;
        cur = left;
      }
    }
    const sol = `${walk.join('; ')}. Answer: ${ansTxt}. Check: ${dvsr} × ${q}${r ? ` + ${r}` : ''} = ${fmt(dividend)}.`;
    return {
      kind: 'remainder', answer: { q, r },
      text: `${fmt(dividend)} ÷ ${dvsr} = ?`,
      // same wording whether or not there IS a remainder — deciding that is part of the problem!
      hint: 'Remainders are fine! If it doesn\'t divide evenly, write it like 14 r 2.',
      solution: sol,
    };
  }

  function decimals_ps(t) {
    if (t === 1) {
      const whole = R.int(3, 89);
      const tenth = R.int(1, 9), hund = R.int(1, 9);
      const numStr = `${whole}.${tenth}${hund}`;
      const places = [
        ['tenths', tenth], ['hundredths', hund], ['ones', whole % 10],
      ];
      const [place, digit] = R.pick(places);
      return num(`In the number ${numStr}, which digit is in the ${place} place?`, digit,
        `In ${numStr}: ones = ${whole % 10}, tenths = ${tenth}, hundredths = ${hund}. The ${place} digit is ${digit}.`);
    }
    if (t === 2) {
      // comparison traps: 0.7 vs 0.65, 0.30 vs 0.3, etc.
      const style = R.int(1, 3);
      let a, b, aS, bS;
      if (style === 1) { // x.Y vs x.YZ where tenths differ
        const w = R.int(0, 9);
        const t1 = R.int(2, 9), t2 = R.int(1, t1 - 1);
        aS = `${w}.${t1}`; bS = `${w}.${t2}${R.int(1, 9)}`;
        a = +(aS); b = +(bS);
      } else if (style === 2) { // equal-looking: 0.5 vs 0.50
        const w = R.int(0, 9), tn = R.int(1, 9);
        aS = `${w}.${tn}`; bS = `${w}.${tn}0`;
        a = +aS; b = +bS;
      } else {
        const w = R.int(0, 9);
        aS = `${w}.${R.int(1, 9)}${R.int(0, 9)}`; bS = `${w}.${R.int(1, 9)}${R.int(0, 9)}`;
        a = +aS; b = +bS;
      }
      const choices = ['<', '=', '>'];
      const answer = a < b ? 0 : a === b ? 1 : 2;
      return {
        kind: 'choice', choices, answer,
        text: `Compare:  ${aS}  ◯  ${bS}`,
        solution: `${aS} is ${a === b ? 'equal to' : a < b ? 'less than' : 'greater than'} ${bS}. Compare place by place, starting with the tenths.`,
      };
    }
    // t3: add/subtract decimals to hundredths (misaligned on purpose sometimes)
    const a100 = R.int(101, 899), b100 = R.chance(0.5) ? R.int(11, 99) * 10 : R.int(101, 899);
    const aS = (a100 / 100).toFixed(2).replace(/0$/, m => R.chance(0.5) ? '0' : '');
    const bS = (b100 / 100) % 0.1 === 0 && R.chance(0.5) ? (b100 / 100).toFixed(1) : (b100 / 100).toFixed(2);
    if (R.chance(0.5)) {
      return num(`${aS} + ${bS} = ?`, frac(a100 + b100, 100),
        `Line up the decimal points: ${(a100 / 100).toFixed(2)} + ${(b100 / 100).toFixed(2)} = ${((a100 + b100) / 100).toFixed(2)}.`,
        'Type a decimal, like 4.75');
    }
    const hi = Math.max(a100, b100), lo = Math.min(a100, b100);
    if (hi === lo) return decimals_ps(t);
    return num(`${(hi / 100)} − ${(lo / 100)} = ?`, frac(hi - lo, 100),
      `Line up the decimal points: ${(hi / 100).toFixed(2)} − ${(lo / 100).toFixed(2)} = ${((hi - lo) / 100).toFixed(2)}.`,
      'Type a decimal, like 4.75');
  }

  function decimals_md(t) {
    if (t === 1) {
      const style = R.int(1, 3);
      if (style === 1) {
        const a10 = R.int(11, 99); const mult = R.pick([10, 100]);
        return num(`${a10 / 10} × ${mult} = ?`, frac(a10 * mult, 10),
          `Multiplying by ${mult} moves the decimal point ${mult === 10 ? '1 place' : '2 places'} to the right: ${a10 / 10} × ${mult} = ${(a10 * mult) / 10}.`);
      }
      if (style === 2) {
        const a = R.int(101, 999);
        return num(`${a / 10} ÷ 10 = ?`, frac(a, 100),
          `Dividing by 10 moves the decimal point 1 place to the left: ${a / 10} ÷ 10 = ${a / 100}.`,
          'Type a decimal');
      }
      const c1 = R.int(125, 650), c2 = R.int(125, 650);
      return num(`${money(c1 / 100)} + ${money(c2 / 100)} = ?`, frac(c1 + c2, 100),
        `${money(c1 / 100)} + ${money(c2 / 100)} = ${money((c1 + c2) / 100)}.`, 'Type it like 3.50');
    }
    if (t === 2) {
      if (R.chance(0.5)) {
        const a10 = R.pick([12, 15, 25, 35, 4, 6, 8, 45, 75]); const b = R.int(3, 9);
        return num(`${a10 / 10} × ${b} = ?`, frac(a10 * b, 10),
          `${a10 / 10} × ${b}: think ${a10} × ${b} = ${a10 * b}, then put the decimal back: ${(a10 * b) / 10}.`, 'Type a decimal');
      }
      const price = R.pick([125, 175, 225, 250, 275, 325, 350]) , n = R.int(2, 5);
      return num(`One snack costs ${money(price / 100)}. How much do ${n} snacks cost?`, frac(price * n, 100),
        `${money(price / 100)} × ${n} = ${money(price * n / 100)}.`, 'Type it like 4.50');
    }
    const style = R.int(1, 3);
    if (style === 1) {
      const a = R.int(2, 9), b = R.int(2, 9);
      return num(`0.${a} × 0.${b} = ?`, frac(a * b, 100),
        `Multiply ${a} × ${b} = ${a * b}. Two decimal places in the problem means two in the answer: ${(a * b) / 100}.`, 'Type a decimal');
    }
    if (style === 2) {
      const cost = R.int(215, 985); const paid = cost < 500 ? 500 : 1000;
      return num(`You buy a toy for ${money(cost / 100)} and pay with a ${money(paid / 100)} bill. How much change do you get?`,
        frac(paid - cost, 100),
        `${money(paid / 100)} − ${money(cost / 100)} = ${money((paid - cost) / 100)}.`, 'Type it like 3.65');
    }
    const b = R.int(2, 9), q10 = R.int(3, 19);
    return num(`${(b * q10) / 10} ÷ ${b} = ?`, frac(q10, 10),
      `${(b * q10) / 10} ÷ ${b} = ${q10 / 10} because ${q10 / 10} × ${b} = ${(b * q10) / 10}.`, 'Type a decimal');
  }

  function fractions_as(t) {
    if (t === 1) {
      const d1 = R.pick([2, 3, 4, 5, 6]); const n1 = R.int(1, d1 - 1);
      const k = R.int(2, 5);
      return num(`Fill in the box:  ${n1}/${d1} = ▢/${d1 * k}`, n1 * k,
        `${d1} × ${k} = ${d1 * k}, so multiply the top by ${k} too: ${n1} × ${k} = ${n1 * k}. ${n1}/${d1} = ${n1 * k}/${d1 * k}.`);
    }
    if (t === 2) {
      const d = R.pick([4, 5, 6, 8, 10, 12]);
      let a = R.int(1, d - 1), b = R.int(1, d - 1);
      if (R.chance(0.5) && a + b < d + d) {
        const s = fadd(frac(a, d), frac(b, d));
        return num(`${a}/${d} + ${b}/${d} = ?`, s,
          `Same denominator — add the tops: ${a} + ${b} = ${a + b}, so ${a + b}/${d}${s.d !== d || s.n !== a + b ? ' = ' + fstr(s) : ''}.`,
          'Type a fraction, like 3/4');
      }
      if (a === b) a = Math.min(d - 1, a + 1);
      const hi = Math.max(a, b), lo = Math.min(a, b);
      const s = fsub(frac(hi, d), frac(lo, d));
      return num(`${hi}/${d} − ${lo}/${d} = ?`, s,
        `Same denominator — subtract the tops: ${hi} − ${lo} = ${hi - lo}, so ${hi - lo}/${d}${fstr(s) !== `${hi - lo}/${d}` ? ' = ' + fstr(s) : ''}.`,
        'Type a fraction, like 3/4');
    }
    // t3: unlike denominators
    const pairs = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [2, 10], [5, 10], [3, 12], [4, 12], [6, 12], [3, 4], [2, 3], [2, 5], [3, 5], [4, 6]];
    const [dA, dB] = R.pick(pairs);
    const a = R.int(1, dA - 1), b = R.int(1, dB - 1);
    const fa = frac(a, dA), fb = frac(b, dB);
    const lcd = dA * dB / gcd(dA, dB);
    if (R.chance(0.6)) {
      const s = fadd(fa, fb);
      return num(`${a}/${dA} + ${b}/${dB} = ?`, s,
        `Use denominator ${lcd}: ${a}/${dA} = ${a * lcd / dA}/${lcd} and ${b}/${dB} = ${b * lcd / dB}/${lcd}. Add: ${a * lcd / dA + b * lcd / dB}/${lcd}${fstr(s) === `${a * lcd / dA + b * lcd / dB}/${lcd}` ? "" : ` = ${fstr(s)}`}.`,
        'Type a fraction, like 5/8 or 1 1/4');
    }
    const va = a * lcd / dA, vb = b * lcd / dB;
    const [hiV, loV, hiF, loF] = va >= vb ? [va, vb, `${a}/${dA}`, `${b}/${dB}`] : [vb, va, `${b}/${dB}`, `${a}/${dA}`];
    if (hiV === loV) return fractions_as(t);
    const s = frac(hiV - loV, lcd);
    return num(`${hiF} − ${loF} = ?`, s,
      `Use denominator ${lcd}: ${hiF} = ${hiV}/${lcd} and ${loF} = ${loV}/${lcd}. Subtract: ${hiV - loV}/${lcd}${fstr(s) === `${hiV - loV}/${lcd}` ? "" : ` = ${fstr(s)}`}.`,
      'Type a fraction, like 3/8');
  }

  function fractions_m(t) {
    if (t === 1) {
      const d = R.pick([2, 3, 4, 5, 6]); const n = R.int(1, d - 1);
      const w = d * R.int(2, 6);
      const ans = frac(n * w, d);
      return num(`${n}/${d} × ${w} = ?`, ans,
        `${w} ÷ ${d} = ${w / d}, then × ${n}: ${n}/${d} of ${w} is ${fstr(ans)}.`);
    }
    if (t === 2) {
      const a = R.int(1, 4), b = R.int(a + 1, 6), c = R.int(1, 4), e = R.int(c + 1, 6);
      const ans = fmul(frac(a, b), frac(c, e));
      return num(`${a}/${b} × ${c}/${e} = ?`, ans,
        `Multiply tops and bottoms: ${a}×${c} = ${a * c} and ${b}×${e} = ${b * e}, so ${a * c}/${b * e}${fstr(ans) !== `${a * c}/${b * e}` ? ' = ' + fstr(ans) : ''}.`,
        'Type a fraction, like 6/12 or 1/2');
    }
    const style = R.int(1, 6);
    if (style === 1) {
      const d = R.pick([2, 3, 4]); const w1 = R.int(1, 3), n1 = R.int(1, d - 1);
      const w2 = R.int(1, 3), n2 = R.int(1, d - 1);
      const ans = fadd(frac(w1 * d + n1, d), frac(w2 * d + n2, d));
      // Pedagogy pass: when the fraction parts add past a whole, SHOW the
      // regroup ("2/2 = 1 more whole") — the old text jumped straight to the
      // total and hid the only interesting step.
      const overflow = n1 + n2 >= d
        ? ` ${n1 + n2}/${d} is ${n1 + n2 === d ? 'a whole 1' : `1 and ${n1 + n2 - d}/${d}`}, so add 1 more whole.`
        : '';
      return num(`${w1} ${n1}/${d} + ${w2} ${n2}/${d} = ?`, ans,
        `Wholes: ${w1} + ${w2} = ${w1 + w2}. Fractions: ${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d}.${overflow} Together: ${fstr(ans)}.`,
        'Type it like 4 1/4');
    }
    if (style === 2) {
      const d = R.pick([2, 3, 4, 5, 6]); const n = R.int(1, d - 1);
      const group = d * R.int(2, 8);
      return num(`${R.pick(NAMES)} has ${group} marbles and gives away ${n}/${d} of them. How many marbles were given away?`,
        frac(n * group, d),
        `${group} ÷ ${d} = ${group / d}, and ${group / d} × ${n} = ${n * group / d}.`);
    }
    if (style === 3) {
      const d = R.pick([2, 3, 4]); const w = R.int(2, 6);
      return num(`1/${d} ÷ ${w} = ?`, frac(1, d * w),
        `Splitting 1/${d} into ${w} equal parts makes pieces of size 1/${d * w}.`,
        'Type a fraction, like 1/12');
    }
    // Wave 5: explicit conversion between improper fractions and mixed
    // numbers — both directions. checkAnswer already accepts either form
    // for any fraction answer, so this is purely about reading/writing the
    // specific form asked for; the worked solution shows the conversion.
    if (style === 4) {
      const d = R.pick([2, 3, 4, 5, 6, 8]);
      const w = R.int(1, 4), n = R.int(1, d - 1);
      if (R.chance(0.5)) {
        const imp = w * d + n;
        return num(`Write ${imp}/${d} as a mixed number.`, frac(imp, d),
          `${imp} ÷ ${d} = ${w} remainder ${n}, so ${imp}/${d} = ${w} ${n}/${d}.`,
          'Type it like 2 1/3');
      }
      return num(`Write ${w} ${n}/${d} as an improper fraction.`, frac(w * d + n, d),
        `${w} × ${d} = ${w * d}, plus ${n} more = ${w * d + n}. So ${w} ${n}/${d} = ${w * d + n}/${d}.`,
        'Type a fraction, like 7/4');
    }
    // Wave 5: mixed-number add/sub with UNLIKE denominators (reuses
    // fractions_as's own t3 pairs list — same friendly denominator pairs).
    if (style === 5) {
      const pairs = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [2, 10], [5, 10], [3, 12], [4, 12], [6, 12], [3, 4], [2, 3], [2, 5], [3, 5], [4, 6]];
      const [dA, dB] = R.pick(pairs);
      const lcd = dA * dB / gcd(dA, dB);
      const w1 = R.int(1, 3), a = R.int(1, dA - 1), w2 = R.int(1, 3), b = R.int(1, dB - 1);
      const A = frac(w1 * dA + a, dA), B = frac(w2 * dB + b, dB);
      if (R.chance(0.6)) {
        const ans = fadd(A, B);
        return num(`${w1} ${a}/${dA} + ${w2} ${b}/${dB} = ?`, ans,
          `Common denominator ${lcd}: ${a}/${dA} = ${a * lcd / dA}/${lcd}, ${b}/${dB} = ${b * lcd / dB}/${lcd}. ` +
          `Wholes: ${w1} + ${w2} = ${w1 + w2}. Fraction parts: ${a * lcd / dA}/${lcd} + ${b * lcd / dB}/${lcd} = ${a * lcd / dA + b * lcd / dB}/${lcd}. Total: ${fstr(ans)}.`,
          'Type it like 4 1/4');
      }
      // subtraction with NO regrouping (that's its own style, below) — the
      // fraction part alone (in the shared denominator) must subtract
      // cleanly; retry with fresh numbers if this particular pair doesn't
      const fracA = a * lcd / dA, fracB = b * lcd / dB;
      if (fracA < fracB || w1 <= w2) return fractions_m(t);
      const ans = fsub(A, B);
      return num(`${w1} ${a}/${dA} − ${w2} ${b}/${dB} = ?`, ans,
        `Common denominator ${lcd}: ${a}/${dA} = ${fracA}/${lcd}, ${b}/${dB} = ${fracB}/${lcd}. ` +
        `Wholes: ${w1} − ${w2} = ${w1 - w2}. Fraction parts: ${fracA}/${lcd} − ${fracB}/${lcd} = ${fracA - fracB}/${lcd}. Total: ${fstr(ans)}.`,
        'Type it like 2 1/4');
    }
    // Wave 5: mixed-number subtraction WITH regrouping — the worked
    // solution must show the borrow step explicitly. Full-depth gates
    // only (doors/chests/bosses/seals) — deliberately NOT in QUICK, this
    // is exactly the kind of multi-step problem combat pacing rules out.
    const d = R.pick([2, 3, 4, 5, 6, 8]);
    const w2 = R.int(1, 3), w1 = R.int(w2 + 1, w2 + 3);
    const b = R.int(1, d - 1), a = R.int(0, b - 1); // a < b forces a borrow
    const borrowedA = a + d;
    const ans = fsub(frac(w1 * d + a, d), frac(w2 * d + b, d));
    // a===0 is a valid borrow case (e.g. "5 − 3 2/4") but "5 0/4" reads
    // oddly as a mixed number — show it as a plain whole number instead
    const minuendStr = a === 0 ? `${w1}` : `${w1} ${a}/${d}`;
    return num(`${minuendStr} − ${w2} ${b}/${d} = ?`, ans,
      `${a}/${d} is smaller than ${b}/${d} — borrow 1 whole from ${w1}: ${minuendStr} = ${w1 - 1} ${borrowedA}/${d}. ` +
      `Now subtract: ${w1 - 1} − ${w2} = ${w1 - 1 - w2}, and ${borrowedA}/${d} − ${b}/${d} = ${borrowedA - b}/${d}. Total: ${fstr(ans)}.`,
      'Type it like 1 3/4');
  }

  // ---------- word problems ----------
  function word_problems(t) {
    const name = R.pick(NAMES), name2 = R.pick(NAMES.filter(n => n !== name));
    const one = [
      () => {
        const pages = R.int(12, 45), days = R.int(3, 9);
        return num(`${name} reads ${pages} pages every day. How many pages does ${name} read in ${days} days?`,
          pages * days, `${pages} × ${days} = ${fmt(pages * days)} pages.`);
      },
      () => {
        const kids = R.int(3, 8), each = R.int(4, 12);
        return num(`${name} bakes ${kids * each} cookies and shares them equally among ${kids} friends. How many cookies does each friend get?`,
          each, `${kids * each} ÷ ${kids} = ${each} cookies each.`);
      },
      () => {
        const a = R.int(215, 980), b = R.int(115, a - 50);
        return num(`A dragon hoard has ${fmt(a)} gold coins. A thief steals ${fmt(b)} of them. How many coins are left?`,
          a - b, `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)} coins.`);
      },
      () => {
        const l = R.int(6, 15), w = R.int(4, 12);
        return num(`A castle courtyard is ${l} meters long and ${w} meters wide. What is its area, in square meters?`,
          l * w, `Area = length × width = ${l} × ${w} = ${l * w} square meters.`);
      },
      // silly scenarios, plain questions: the joke is the setup, never the math
      () => {
        const a = R.int(115, 489), b = R.int(112, 465);
        return num(`A dragon collects socks. Its hoard has ${fmt(a)} left socks and ${fmt(b)} right socks. How many socks does the dragon have?`,
          a + b, `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)} socks.`);
      },
      () => {
        const n = R.int(12, 45), d = R.int(3, 9);
        return num(`Sir Reginald polishes ${n} helmets every day. How many helmets does he polish in ${d} days?`,
          n * d, `${n} × ${d} = ${fmt(n * d)} helmets.`);
      },
      () => {
        const k = R.int(3, 8), m = R.int(4, 12);
        return num(`A choir of ${k} skeletons shares ${k * m} sheets of music equally. How many sheets does each skeleton get?`,
          m, `${k * m} ÷ ${k} = ${m} sheets each.`);
      },
    ];
    const two = [
      () => {
        const price = R.int(3, 9), n = R.int(2, Math.floor(45 / price)), paid = 50;
        return num(`${name} buys ${n} potions that cost ${price} gold each, and pays with a ${paid}-gold coin. How much change does ${name} get?`,
          paid - price * n, `${n} × ${price} = ${price * n} gold. ${paid} − ${price * n} = ${paid - price * n} gold change.`);
      },
      () => {
        const a = R.int(12, 28), b = R.int(12, 28), goal = R.int(70, 99);
        if (a + b >= goal) return null;
        return num(`${name} needs ${goal} gems. ${name} finds ${a} gems in one cave and ${b} in another. How many more gems does ${name} still need?`,
          goal - a - b, `${a} + ${b} = ${a + b} gems found. ${goal} − ${a + b} = ${goal - a - b} more needed.`);
      },
      () => {
        const laps = R.int(3, 8), len10 = R.pick([4, 5, 6, 8, 12, 15]);
        return num(`${name} runs ${laps} laps around a lake. Each lap is ${len10 / 10} km. How many km does ${name} run in all?`,
          frac(laps * len10, 10), `${len10 / 10} × ${laps} = ${(laps * len10) / 10} km.`, 'Type a decimal, like 3.6');
      },
      () => {
        const c1 = R.pick([125, 250, 175, 325]), c2 = R.pick([150, 275, 225, 350]);
        const total = c1 + c2, paid = total < 500 ? 500 : 1000;
        return num(`${name} buys a map for ${money(c1 / 100)} and a torch for ${money(c2 / 100)}, paying with ${money(paid / 100)}. How much change?`,
          frac(paid - total, 100),
          `${money(c1 / 100)} + ${money(c2 / 100)} = ${money(total / 100)}. Then ${money(paid / 100)} − ${money(total / 100)} = ${money((paid - total) / 100)}.`,
          'Type it like 3.75');
      },
      () => {
        const n = R.int(2, 5), p = R.int(3, 9);
        return num(`A slime buys ${n} tiny hats for ${p} gold each and pays with a 50-gold coin. How much change does the slime get?`,
          50 - n * p, `${n} × ${p} = ${n * p} gold. 50 − ${n * p} = ${50 - n * p} gold change.`);
      },
      () => {
        const k = R.int(2, 5), b = R.int(2, 6), left = R.int(2, 9);
        const a = k * b + left;
        return num(`A troll packs ${a} sandwiches for a picnic. Its ${k} cousins eat ${b} sandwiches each. How many sandwiches are left for the troll?`,
          left, `${k} × ${b} = ${k * b} eaten. ${a} − ${k * b} = ${left} left.`);
      },
      () => {
        const n = R.int(2, 6), p = R.int(4, 9), t = R.int(3, 8);
        return num(`A wizard orders ${n} pizzas for ${p} gold each, plus ${t} gold for speedy broom delivery. How much does the wizard pay in all?`,
          n * p + t, `${n} × ${p} = ${n * p} gold. ${n * p} + ${t} = ${n * p + t} gold.`);
      },
    ];
    const three = [
      () => {
        const d = R.pick([4, 6, 8]); const ate1 = R.int(1, d / 2 - 1), ate2 = R.int(1, d / 2 - 1);
        const left = frac(d - ate1 - ate2, d);
        return num(`A pizza is cut into ${d} equal slices. ${name} eats ${ate1} slice${ate1 > 1 ? 's' : ''} and ${name2} eats ${ate2}. What fraction of the pizza is left?`,
          left, `They ate ${ate1 + ate2}/${d}, so ${d - ate1 - ate2}/${d}${fstr(left) !== `${d - ate1 - ate2}/${d}` ? ' = ' + fstr(left) : ''} is left.`,
          'Type a fraction, like 3/8');
      },
      () => {
        const d = R.pick([2, 3, 4, 5]); const n = R.int(1, d - 1);
        const total = d * R.int(4, 9);
        const gave = total * n / d;
        return num(`${name} has ${total} gold coins and spends ${n}/${d} of them on a sword. How many coins does ${name} have left?`,
          total - gave, `${n}/${d} of ${total} is ${gave}. ${total} − ${gave} = ${total - gave} coins left.`);
      },
      () => {
        const weekly = R.int(3, 9), weeks = R.int(4, 9), goal = weekly * weeks + R.int(5, 25);
        return num(`${name} saves ${weekly} gold each week for ${weeks} weeks, hoping to buy a shield that costs ${goal} gold. How much more gold is needed?`,
          goal - weekly * weeks, `${weekly} × ${weeks} = ${weekly * weeks} saved. ${goal} − ${weekly * weeks} = ${goal - weekly * weeks} more needed.`);
      },
      () => {
        const per = R.pick([125, 150, 250, 225]), n = R.int(3, 6), paid = 1000;
        const total = per * n;
        if (total >= paid) return null;
        return num(`Arrows cost ${money(per / 100)} each. ${name} buys ${n} arrows and pays with ${money(paid / 100)}. How much change?`,
          frac(paid - total, 100),
          `${money(per / 100)} × ${n} = ${money(total / 100)}. ${money(paid / 100)} − ${money(total / 100)} = ${money((paid - total) / 100)}.`,
          'Type it like 2.50');
      },
      () => {
        const d = R.pick([3, 4, 6, 8]); const n = R.int(1, d - 1);
        const ans = frac(2 * n, d);
        return num(`A troll's soup recipe needs ${n}/${d} cup of swamp water. The troll doubles the recipe. How much swamp water now?`,
          ans, `Double means × 2: ${n}/${d} × 2 = ${2 * n}/${d}${fstr(ans) !== `${2 * n}/${d}` ? ' = ' + fstr(ans) : ''} cups.`,
          'Type a fraction, like 3/4 or 1 1/2');
      },
      () => {
        const d = R.pick([2, 3, 4, 5]); const n = R.int(1, d - 1);
        const total = d * R.int(4, 9);
        return num(`A goblin has ${total} shiny buttons and sews ${n}/${d} of them onto its coat. How many buttons are on the coat?`,
          total * n / d, `${n}/${d} of ${total}: ${total} ÷ ${d} = ${total / d}, then × ${n} = ${total * n / d} buttons.`);
      },
    ];
    const pool = t === 1 ? one : t === 2 ? two : R.pick([two, three]);
    for (let i = 0; i < 10; i++) {
      const p = R.pick(pool)();
      if (p) return p;
    }
    return one[0]();
  }

  // ---------- time_reading (Wave 3: the Clockwork Spire) ----------
  // An analog clock face, drawn as inline SVG (no image assets, no build
  // step — just markup). Uses the game's own palette so it reads fine
  // embedded in a dark modal or the battle problem box.
  function clockFace(h, m) {
    const size = 130, cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const toXY = (angleDeg, length) => {
      const rad = (angleDeg - 90) * Math.PI / 180; // 0deg = 12 o'clock, clockwise
      return [(cx + length * Math.cos(rad)).toFixed(1), (cy + length * Math.sin(rad)).toFixed(1)];
    };
    const minuteAngle = (m / 60) * 360;
    const hourAngle = ((h % 12) / 12) * 360 + (m / 60) * 30;
    const [hx, hy] = toXY(hourAngle, r * 0.5);
    const [mx, my] = toXY(minuteAngle, r * 0.78);
    let ticks = '';
    let numerals = '';
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = toXY(i * 30, r * 0.86);
      const [x2, y2] = toXY(i * 30, r * 0.98);
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#494073" stroke-width="${i % 3 === 0 ? 3 : 1.5}"/>`;
      // reading the HANDS is the skill, not inferring position from ticks —
      // real clock faces show the numbers, so ours does too
      const [nx, ny] = toXY(i * 30, r * 0.68);
      numerals += `<text x="${nx}" y="${ny}" font-size="13" font-family="sans-serif" fill="#262042" text-anchor="middle" dominant-baseline="middle">${i === 0 ? 12 : i}</text>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fdfaf3" stroke="#262042" stroke-width="4"/>
      ${ticks}
      ${numerals}
      <line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="#262042" stroke-width="5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="#494073" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#262042"/>
    </svg>`;
  }

  // small constructor for 'clock' problems (answer is {h, m}; h stays 1-12)
  function clockProblem(text, h, m, solution, hint, svg) {
    return { kind: 'clock', text, answer: { h: h === 0 ? 12 : h, m }, solution, hint: hint || null, svg: svg || null };
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function timeStr(h, m) { return `${h === 0 ? 12 : h}:${pad2(m)}`; }

  // one-sentence phrasing to teach the vocabulary alongside the digits
  function describeTime(h, m) {
    const hh = h === 0 ? 12 : h;
    const next = (hh % 12) + 1;
    if (m === 0) return `${hh} o'clock`;
    if (m === 15) return `quarter past ${hh}`;
    if (m === 30) return `half past ${hh}`;
    if (m === 45) return `quarter to ${next}`;
    if (m < 30) return `${m} minutes past ${hh}`;
    return `${60 - m} minutes to ${next}`;
  }

  function randomTimeForTier(t) {
    const h = R.int(1, 12);
    let m;
    if (t === 1) m = R.pick([0, 30]);
    else if (t === 2) m = R.pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    else m = R.int(0, 59);
    return { h, m };
  }

  // "What time does the clock show?" — the core exercise, an SVG face.
  function readClockProblem(t) {
    const { h, m } = randomTimeForTier(t);
    return clockProblem(
      'What time does the clock show? (type it like 3:15)',
      h, m,
      `The clock shows ${timeStr(h, m)} — ${describeTime(h, m)}.`,
      'Type the hour, a colon, then the minutes — like 3:15.',
      clockFace(h, m)
    );
  }

  // Elapsed-time word problems (no clock face — these are read, not drawn):
  // half ask for the END time (kind:'clock'), half ask for the DURATION
  // (plain kind:'number', in minutes) — matching "plain 'number'/'time' answers".
  function elapsedTimeProblem(t) {
    const name = R.pick(NAMES);
    const thing = R.pick(['forge', 'ferry', 'lesson', 'shift', 'show', 'workshop']);
    const startM = t === 1 ? R.pick([0, 30]) : t === 2 ? R.pick([0, 15, 30, 45]) : R.pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    const startH = R.int(1, 10);
    const durMin = t === 1 ? R.pick([30, 60]) : t === 2 ? R.pick([15, 20, 30, 40, 45]) : R.pick([10, 20, 25, 35, 50, 70, 90]);
    const totalMin = startH * 60 + startM + durMin;
    const endH = Math.floor(totalMin / 60) % 12;
    const endM = totalMin % 60;
    const startS = timeStr(startH, startM), endS = timeStr(endH === 0 ? 12 : endH, endM);
    if (R.chance(0.5)) {
      // Pedagogy pass: split durations past the hour ("90 min = 1 hour + 30
      // min") — hopping to the hour first is the strategy worth teaching.
      const durSol = durMin > 60
        ? `${durMin} minutes = 1 hour + ${durMin - 60} minutes. ${startS} + 1 hour = ${timeStr(startH + 1 > 12 ? 1 : startH + 1, startM)}, then + ${durMin - 60} minutes = ${endS}.`
        : `${startS} + ${durMin} minutes = ${endS}.`;
      return clockProblem(
        `The ${thing} ${R.pick(['opens', 'starts'])} at ${startS} and runs for ${durMin} minutes. What time does it end?`,
        endH, endM,
        durSol,
        'Type the time like 4:25.'
      );
    }
    return num(`${name}'s ${thing} starts at ${startS} and ends at ${endS}. How many minutes did it take?`,
      durMin, `From ${startS} to ${endS} is ${durMin} minutes.`);
  }

  function time_reading(t) {
    if (t === 1) return readClockProblem(1);
    if (t === 2) return R.chance(0.75) ? readClockProblem(2) : elapsedTimeProblem(2);
    return R.chance(0.6) ? readClockProblem(3) : elapsedTimeProblem(3);
  }

  // ---------- geometry (Wave 6: Gullwrack Harbor, the Builder's Guild) ----------
  // Plain whole-number answers throughout — no parser work. An inline SVG
  // diagram (same p.svg pattern as time_reading's clockFace) labels every
  // rectangle/box; the unit suite checks each labeled dimension's number
  // literally appears in the SVG text.
  function rectSvg(w, h) {
    const pad = 34, maxDim = 84;
    const scale = maxDim / Math.max(w, h);
    const rw = Math.max(22, w * scale), rh = Math.max(22, h * scale);
    const width = rw + pad * 2, height = rh + pad * 2;
    const x0 = pad, y0 = pad;
    // a full-canvas light background — labels sit OUTSIDE the shape itself
    // (like the width label above it), so without this they'd land on the
    // SVG's transparent backdrop and vanish against this game's dark modals.
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#fdfaf3"/>
      <rect x="${x0}" y="${y0}" width="${rw}" height="${rh}" fill="#e4ddf7" stroke="#262042" stroke-width="3"/>
      <text x="${x0 + rw / 2}" y="${y0 - 10}" font-size="15" font-family="sans-serif" fill="#262042" text-anchor="middle">${w}</text>
      <text x="${x0 - 14}" y="${y0 + rh / 2}" font-size="15" font-family="sans-serif" fill="#262042" text-anchor="middle" dominant-baseline="middle">${h}</text>
    </svg>`;
  }

  // An L-shaped room: a W×H rectangle with an a×b notch missing from the
  // top-right corner. A dashed line splits it into two rectangles —
  // (W-a)×H on the left, a×(H-b) on the right — so area = W*H - a*b either
  // way. Every edge label (W, H, a, b) sits on a real polygon edge.
  function lShapeSvg(W, H, a, b) {
    const pad = 34, maxDim = 84;
    const scale = maxDim / Math.max(W, H);
    const rw = W * scale, rh = H * scale, nw = a * scale, nh = b * scale;
    const width = rw + pad * 2, height = rh + pad * 2;
    const x0 = pad, y0 = pad;
    const pts = [
      [x0, y0], [x0 + rw - nw, y0], [x0 + rw - nw, y0 + nh], [x0 + rw, y0 + nh],
      [x0 + rw, y0 + rh], [x0, y0 + rh],
    ].map(p => p.join(',')).join(' ');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#fdfaf3"/>
      <polygon points="${pts}" fill="#e4ddf7" stroke="#262042" stroke-width="3"/>
      <line x1="${x0 + rw - nw}" y1="${y0}" x2="${x0 + rw - nw}" y2="${y0 + rh}" stroke="#262042" stroke-width="2" stroke-dasharray="4,3"/>
      <text x="${x0 + rw / 2}" y="${y0 + rh + 18}" font-size="14" font-family="sans-serif" fill="#262042" text-anchor="middle">${W}</text>
      <text x="${x0 - 14}" y="${y0 + rh / 2}" font-size="14" font-family="sans-serif" fill="#262042" text-anchor="middle" dominant-baseline="middle">${H}</text>
      <text x="${x0 + rw - nw / 2}" y="${y0 + nh + 14}" font-size="13" font-family="sans-serif" fill="#262042" text-anchor="middle">${a}</text>
      <text x="${x0 + rw - nw - 12}" y="${y0 + nh / 2}" font-size="13" font-family="sans-serif" fill="#262042" text-anchor="middle" dominant-baseline="middle">${b}</text>
    </svg>`;
  }

  // A rectangular prism in oblique projection: front face l×h, depth w
  // drawn as a shifted-back top/side face. All three dimensions labeled.
  function boxSvg(l, w, h) {
    const pad = 30, unit = 11, dep = w * unit * 0.6;
    const fw = l * unit, fh = h * unit;
    const x0 = pad, y0 = pad + dep;
    const width = fw + dep + pad * 2, height = fh + dep + pad * 2;
    const fx0 = x0, fy0 = y0, fx1 = x0 + fw, fy1 = y0 + fh;
    const bx0 = fx0 + dep, by0 = fy0 - dep, bx1 = fx1 + dep, by1 = fy1 - dep;
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#fdfaf3"/>
      <polygon points="${fx0},${fy0} ${bx0},${by0} ${bx1},${by0} ${fx1},${fy0}" fill="#e4ddf7" stroke="#262042" stroke-width="2"/>
      <polygon points="${fx1},${fy0} ${bx1},${by0} ${bx1},${by1} ${fx1},${fy1}" fill="#c9bff0" stroke="#262042" stroke-width="2"/>
      <rect x="${fx0}" y="${fy0}" width="${fw}" height="${fh}" fill="#fdfaf3" stroke="#262042" stroke-width="3"/>
      <text x="${fx0 + fw / 2}" y="${fy1 + 18}" font-size="14" font-family="sans-serif" fill="#262042" text-anchor="middle">${l}</text>
      <text x="${fx0 - 14}" y="${fy0 + fh / 2}" font-size="14" font-family="sans-serif" fill="#262042" text-anchor="middle" dominant-baseline="middle">${h}</text>
      <text x="${(fx1 + bx1) / 2 + 8}" y="${(fy0 + by0) / 2}" font-size="13" font-family="sans-serif" fill="#262042" text-anchor="middle">${w}</text>
    </svg>`;
  }

  // small constructor for a 'number' problem with an attached SVG diagram
  function numSvg(text, answer, solution, svg) {
    const p = num(text, answer, solution);
    p.svg = svg;
    return p;
  }

  // t1: read a labeled rectangle (dims 3-maxDim), find its area or perimeter.
  function rectProblem(maxDim) {
    const w = R.int(3, maxDim), h = R.int(3, maxDim);
    const svg = rectSvg(w, h);
    if (R.chance(0.5)) {
      return numSvg(`This rectangle is ${w} units wide and ${h} units tall. What is its area?`,
        w * h, `Area = width × height = ${w} × ${h} = ${w * h} square units.`, svg);
    }
    return numSvg(`This rectangle is ${w} units wide and ${h} units tall. What is its perimeter?`,
      2 * (w + h), `Perimeter = 2 × (width + height) = 2 × (${w} + ${h}) = ${2 * (w + h)} units.`, svg);
  }

  // t2a: a plain-text area/perimeter word problem (no diagram — dims ≤ 12).
  function rectWordProblem() {
    const name = R.pick(NAMES);
    const w = R.int(3, 12), h = R.int(3, 12);
    const place = R.pick(['garden', 'rug', 'sandbox', 'flag', 'banner', 'goat pen']);
    if (R.chance(0.5)) {
      return num(`${name}'s ${place} is ${w} feet by ${h} feet. What is its area, in square feet?`,
        w * h, `${w} × ${h} = ${w * h} square feet.`);
    }
    return num(`${name} is fencing a ${place} that is ${w} feet by ${h} feet. How many feet of fence are needed to go all the way around?`,
      2 * (w + h), `2 × (${w} + ${h}) = ${2 * (w + h)} feet.`);
  }

  // t2b: L-shaped area via decomposition (or its perimeter, which is just
  // the bounding rectangle's — the missing corner doesn't change the border).
  function lShapeProblem() {
    const W = R.int(6, 12), H = R.int(6, 12);
    const a = R.int(2, Math.min(5, W - 3)), b = R.int(2, Math.min(5, H - 3));
    const svg = lShapeSvg(W, H, a, b);
    if (R.chance(0.5)) {
      const left = (W - a) * H, right = a * (H - b);
      return numSvg(`This L-shaped room is ${W} by ${H} feet, with a ${a} by ${b} foot corner missing (see the dashed line — it splits the room into two rectangles). What is the total floor area, in square feet?`,
        W * H - a * b,
        `Split along the dashed line: the left rectangle is ${W - a} × ${H} = ${left} sq ft, the right rectangle is ${a} × ${H - b} = ${right} sq ft. ${left} + ${right} = ${left + right} square feet.`,
        svg);
    }
    return numSvg(`What is the perimeter of this L-shaped room, in feet?`,
      2 * (W + H),
      `Even with the corner missing, the outer edges still total the same as the full ${W}-by-${H} rectangle: 2 × (${W} + ${H}) = ${2 * (W + H)} feet.`,
      svg);
  }

  // t3a: volume of a labeled rectangular prism (dims 2-maxDim).
  function volumeProblem(maxDim) {
    const l = R.int(2, maxDim), w = R.int(2, maxDim), h = R.int(2, maxDim);
    return numSvg(`This box is ${l} units long, ${w} units wide, and ${h} units tall. What is its volume?`,
      l * w * h, `Volume = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cubic units.`, boxSvg(l, w, h));
  }

  // t3b: "how many unit crates fit" word problem (no diagram — same math).
  function crateWordProblem() {
    const name = R.pick(NAMES);
    const l = R.int(2, 8), w = R.int(2, 8), h = R.int(2, 8);
    return num(`${name} is packing a crate ${l} units long, ${w} units wide, and ${h} units tall with 1-unit boxes, no gaps. How many boxes fit inside?`,
      l * w * h, `${l} × ${w} × ${h} = ${l * w * h} unit boxes.`);
  }

  function geometry(t) {
    if (t === 1) return rectProblem(12);
    if (t === 2) return R.chance(0.4) ? lShapeProblem() : rectWordProblem();
    return R.chance(0.5) ? volumeProblem(10) : crateWordProblem();
  }

  // ---------- music_reading (Wave 4: the Resonant Halls) ----------
  // Default OFF (parent opt-in — not core 5th-grade curriculum). Two shapes:
  // 'staff' (reading pitch off a treble clef — reuses kind:'choice', no new
  // parser work) and rhythm-as-fractions (reuses the fraction checker
  // directly — a quarter/half/eighth note IS just 1/4, 1/2, 1/8 of a whole).
  //
  // Bottom-to-top staff positions, alternating line/space (the classic
  // mnemonics: lines E-G-B-D-F "Every Good Boy Does Fine", spaces F-A-C-E).
  const STAFF_NOTES = [
    { name: 'E', line: true }, { name: 'F', line: false }, { name: 'G', line: true },
    { name: 'A', line: false }, { name: 'B', line: true }, { name: 'C', line: false },
    { name: 'D', line: true }, { name: 'E', line: false }, { name: 'F', line: true },
  ];
  const NOTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  // A treble staff (5 lines) with one notehead. idx 0 = bottom line (E4),
  // 8 = top line (F5) — the whole grand-staff-free range, no ledger lines.
  function staffSvg(idx) {
    const w = 150, h = 110, left = 20, right = 130;
    const lineGap = 12, top = 24; // 5 staff lines, evenly spaced
    let lines = '';
    for (let i = 0; i < 5; i++) {
      const y = top + i * lineGap;
      lines += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#494073" stroke-width="2"/>`;
    }
    // idx 8 (top line, F5) sits AT the top staff line (y=top); idx 0 (bottom
    // line, E4) sits at the bottom staff line (y=top+4*lineGap). Each step
    // is half a line-gap, same alternating line/space logic as STAFF_NOTES.
    const noteY = top + (8 - idx) * (lineGap / 2);
    const noteX = 75;
    const stemDown = idx >= 4; // notes at/above the middle line stem downward
    const stem = stemDown
      ? `<line x1="${noteX - 6.5}" y1="${noteY}" x2="${noteX - 6.5}" y2="${noteY + 30}" stroke="#262042" stroke-width="2"/>`
      : `<line x1="${noteX + 6.5}" y1="${noteY}" x2="${noteX + 6.5}" y2="${noteY - 30}" stroke="#262042" stroke-width="2"/>`;
    // the REAL treble clef: Unicode 𝄞 (U+1D11E) as SVG text. The old hand-
    // drawn "simple curl" stand-in did not read as a clef at all (playtest,
    // 2026-07-12). Font-dependent in theory, but macOS and Windows both ship
    // the glyph in system fonts; sized so its curl wraps the G line (second
    // from the bottom), the way real notation anchors it.
    const gLineY = top + 3 * lineGap;
    const clef = `<text x="18" y="${gLineY + 2 * lineGap}" font-size="${lineGap * 6.4}"
        fill="#262042">\u{1D11E}</text>`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="8" fill="#fdfaf3" stroke="#262042" stroke-width="3"/>
      ${lines}
      ${clef}
      ${stem}
      <ellipse cx="${noteX}" cy="${noteY}" rx="7.5" ry="5.5" fill="#262042" transform="rotate(-18 ${noteX} ${noteY})"/>
    </svg>`;
  }

  // "What note is this?" — kind:'choice' (answer = index into A-G), so
  // checkAnswer needs NOTHING new; the existing choice-index comparison works.
  function readStaffProblem(t) {
    // t1: line notes only (E-G-B-D-F); t2: space notes only (F-A-C-E);
    // t3: any of the 9 positions, mixed — the full staff.
    const pool = t === 1 ? [0, 2, 4, 6, 8] : t === 2 ? [1, 3, 5, 7]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const idx = R.pick(pool);
    const letter = STAFF_NOTES[idx].name;
    const answer = NOTE_LETTERS.indexOf(letter);
    return {
      kind: 'choice', choices: NOTE_LETTERS.slice(), answer,
      text: 'What note is shown on the staff?',
      solution: `That note sits on ${STAFF_NOTES[idx].line ? 'a line' : 'a space'} — it's ${letter}.`,
      svg: staffSvg(idx),
    };
  }

  // Pedagogy pass: "A eighth note" is not English — the article helper
  // writes "an eighth note" (capitalized at sentence start, lowered inside).
  function art(name, lower) {
    const s = `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
    return lower ? s : s[0].toUpperCase() + s.slice(1);
  }
  const NOTE_VALUES = [
    { name: 'whole note', d: 1 }, { name: 'half note', d: 2 },
    { name: 'quarter note', d: 4 }, { name: 'eighth note', d: 8 },
  ];
  // Rhythm IS fraction practice: a quarter note is exactly 1/4 of a whole
  // note. Reuses fadd/fsub/fstr — no new checking logic anywhere.
  function rhythmProblem(t) {
    if (t === 1) {
      const n = R.pick(NOTE_VALUES.slice(1)); // half, quarter, or eighth
      const sum = fadd(frac(1, n.d), frac(1, n.d));
      return num(`Two ${n.name}s in a row — how much of a whole note is that?`, sum,
        `Each ${n.name} is 1/${n.d} of a whole note: 1/${n.d} + 1/${n.d} = ${fstr(sum)}.`);
    }
    if (t === 2) {
      const a = R.pick(NOTE_VALUES.slice(1, 3)); // half or quarter
      const b = R.pick(NOTE_VALUES.slice(2));    // quarter or eighth
      const sum = fadd(frac(1, a.d), frac(1, b.d));
      return num(`${art(a.name)} plus ${art(b.name, true)} — how much of a whole note is that?`, sum,
        `${a.name} = 1/${a.d}, ${b.name} = 1/${b.d}. 1/${a.d} + 1/${b.d} = ${fstr(sum)}.`);
    }
    // t3: subtraction, or three notes summed
    if (R.chance(0.5)) {
      const a = R.pick(NOTE_VALUES.slice(0, 2)); // whole or half
      const b = R.pick(NOTE_VALUES.slice(2));    // quarter or eighth
      const diff = fsub(frac(1, a.d), frac(1, b.d));
      return num(`${art(a.name)} is how much MORE of a whole note than ${art(b.name, true)}?`, diff,
        `${a.name} = 1/${a.d}, ${b.name} = 1/${b.d}. 1/${a.d} − 1/${b.d} = ${fstr(diff)}.`);
    }
    const [a, b, c] = [R.pick(NOTE_VALUES.slice(2)), R.pick(NOTE_VALUES.slice(2)), R.pick(NOTE_VALUES.slice(2))];
    const sum = fadd(fadd(frac(1, a.d), frac(1, b.d)), frac(1, c.d));
    return num(`${art(a.name)}, ${art(b.name, true)}, and ${art(c.name, true)} — how much of a whole note is that in all?`, sum,
      `1/${a.d} + 1/${b.d} + 1/${c.d} = ${fstr(sum)}.`);
  }

  function music_reading(t) {
    return R.chance(0.5) ? readStaffProblem(t) : rhythmProblem(t);
  }

  // small constructor for 'number' problems
  function num(text, answer, solution, hint) {
    return {
      kind: 'number',
      text,
      answer: typeof answer === 'number' ? frac(answer, 1) : answer,
      solution,
      hint: hint || null,
    };
  }

  const GENERATORS = {
    addsub_facts, muldiv_facts, multidigit_addsub, multidigit_mult,
    long_division, decimals_ps, decimals_md, fractions_as, fractions_m,
    word_problems, time_reading, geometry, music_reading,
  };

  // ---------- QUICK generators (combat pacing) ----------
  // Fast, mental-math variants of every topic: answerable in seconds so
  // battles keep moving. The full-depth problems live at gates — bosses,
  // doors, chests, and dungeon seals — where there's no combat pressure.
  const QUICK = {
    addsub_facts: () => addsub_facts(R.chance(0.5) ? 1 : 2),
    muldiv_facts: () => muldiv_facts(R.chance(0.5) ? 1 : 2),
    multidigit_addsub() {
      // Pedagogy calibration (user, 2026-07-13, from dungeon 3): a QUICK
      // problem must LOOK as fast as it is. "300 + 500" is mentally 3+5 but
      // READS as three-digit addition — the ×100 scale is gone; everything
      // below is visibly seconds-fast: friendly tens, or a 2-digit nudged
      // by a single digit without crossing a ten.
      const style = R.int(1, 3);
      if (style === 1) { // friendly tens only
        let a = R.int(2, 9), b = R.int(1, 9);
        if (R.chance(0.5)) {
          return num(`${a * 10} + ${b * 10} = ?`, (a + b) * 10,
            `${a} + ${b} = ${a + b}, so ${a * 10} + ${b * 10} = ${(a + b) * 10}.`);
        }
        if (b > a) { const t = a; a = b; b = t; }
        if (a === b) { if (a < 9) a++; else b--; } // never push a ten into "100"
        return num(`${a * 10} − ${b * 10} = ?`, (a - b) * 10,
          `${a} − ${b} = ${a - b}, so ${a * 10} − ${b * 10} = ${(a - b) * 10}.`);
      }
      if (style === 2) { // 2-digit ± 1-digit, never crossing a ten
        const tens = R.int(2, 8), ones = R.int(2, 8);
        const a = tens * 10 + ones;
        if (R.chance(0.5)) {
          const b = R.int(1, 9 - ones);
          return num(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}.`);
        }
        const b = R.int(1, ones);
        return num(`${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}.`);
      }
      // 2-digit ± 2-digit with NO regrouping (clean columns)
      const t1 = R.int(2, 8), o1 = R.int(1, 8);
      if (R.chance(0.5)) {
        const t2 = R.int(1, 9 - t1), o2 = R.int(0, 9 - o1);
        const a = t1 * 10 + o1, b = t2 * 10 + o2;
        return num(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b} — no carrying needed!`);
      }
      const t2 = R.int(1, t1), o2 = R.int(0, o1);
      const a = t1 * 10 + o1, b = t2 * 10 + o2;
      if (a === b) return QUICK.multidigit_addsub();
      return num(`${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b} — no borrowing needed!`);
    },
    multidigit_mult() {
      const style = R.int(1, 3);
      if (style === 1) {
        const a = R.int(12, 89), m = R.pick([10, 10, 100]);
        return num(`${a} × ${m} = ?`, a * m,
          `Multiplying by ${m} adds ${m === 10 ? 'one zero' : 'two zeros'}: ${fmt(a * m)}.`);
      }
      if (style === 2) {
        const a = R.int(11, 24), b = R.int(2, 4);
        return num(`${a} × ${b} = ?`, a * b,
          `${a} × ${b} = ${Math.floor(a / 10) * 10}×${b} + ${a % 10}×${b} = ${a * b}.`);
      }
      const a = R.int(13, 45);
      return num(`Double ${a} — what is ${a} × 2?`, a * 2, `${a} + ${a} = ${a * 2}.`);
    },
    long_division() { // table facts with remainders — quick mental math
      const dvsr = R.int(2, 9), q = R.int(2, 12), r = R.chance(0.4) ? 0 : R.int(1, dvsr - 1);
      const dividend = dvsr * q + r;
      return {
        kind: 'remainder', answer: { q, r },
        text: `${dividend} ÷ ${dvsr} = ?`,
        // same wording either way — spotting the remainder is part of the practice
        hint: 'Remainders are fine! If it doesn\'t divide evenly, write it like 5 r 2.',
        solution: r === 0
          ? `${dvsr} × ${q} = ${dividend}, so the answer is ${q}.`
          : `${dvsr} × ${q} = ${dvsr * q}, with ${r} left over: ${q} r ${r}.`,
      };
    },
    decimals_ps() {
      if (R.chance(0.4)) return decimals_ps(2);       // compare — buttons are fast
      if (R.chance(0.5)) return decimals_ps(1);       // place value digit
      const a = R.int(1, 8), b = R.int(1, 9 - a);     // tenths that stay under 1
      return num(`0.${a} + 0.${b} = ?`, frac(a + b, 10),
        `${a} tenths + ${b} tenths = ${a + b} tenths = 0.${a + b}.`, 'Type a decimal');
    },
    decimals_md() {
      const style = R.int(1, 3);
      if (style === 1) {
        const a10 = R.int(11, 99);
        return num(`${a10 / 10} × 10 = ?`, frac(a10, 1),
          `Move the decimal point one place right: ${a10 / 10} × 10 = ${a10}.`);
      }
      if (style === 2) {
        const c = R.pick([150, 250, 125, 225, 350]);
        return num(`${money(c / 100)} + ${money(c / 100)} = ?`, frac(c * 2, 100),
          `Double ${money(c / 100)} is ${money(c * 2 / 100)}.`, 'Type it like 2.50');
      }
      const b = R.pick([2, 4, 6, 8, 12, 16]);
      return num(`0.5 × ${b} = ?`, frac(b, 2),
        `0.5 is one half — half of ${b} is ${b / 2}.`, 'Type a number or decimal');
    },
    fractions_as() {
      if (R.chance(0.5)) {
        const d = R.pick([2, 3, 4, 5]); const n = R.int(1, d - 1); const k = R.int(2, 4);
        return num(`Fill in the box:  ${n}/${d} = ▢/${d * k}`, n * k,
          `Multiply top and bottom by ${k}: ${n}/${d} = ${n * k}/${d * k}.`);
      }
      const d = R.pick([4, 5, 6, 8]); const a = R.int(1, d - 2), b = R.int(1, d - a - 1);
      return num(`${a}/${d} + ${b}/${d} = ?`, frac(a + b, d),
        `Same denominator — add the tops: ${a + b}/${d}.`, 'Type a fraction, like 3/8');
    },
    fractions_m() {
      const d = R.pick([2, 3, 4, 5]); const m = R.int(2, 9);
      if (R.chance(0.5)) {
        return num(`What is 1/${d} of ${d * m}?`, m, `${d * m} ÷ ${d} = ${m}.`);
      }
      const n = R.int(1, d - 1);
      return num(`${n}/${d} × ${d * m} = ?`, n * m,
        `${d * m} ÷ ${d} = ${m}, then × ${n} = ${n * m}.`);
    },
    word_problems() {
      const name = R.pick(NAMES);
      const style = R.int(1, 3);
      if (style === 1) {
        const n = R.int(2, 9), p = R.int(2, 9);
        return num(`${name} buys ${n} apples at ${p} gold each. How much gold in all?`,
          n * p, `${n} × ${p} = ${n * p} gold.`);
      }
      if (style === 2) {
        const a = R.int(10, 20), b = R.int(2, 9);
        return num(`${name} has ${a} gold and spends ${b}. How much is left?`,
          a - b, `${a} − ${b} = ${a - b} gold.`);
      }
      const k = R.int(2, 6), m = R.int(2, 9);
      return num(`${k} friends share ${k * m} berries equally. How many does each friend get?`,
        m, `${k * m} ÷ ${k} = ${m} berries each.`);
    },
    // Quick combat version: just read the clock, no elapsed-time word problems
    // (those are slow-read gate material, not battle-pace).
    time_reading: () => readClockProblem(R.chance(0.5) ? 1 : 2),
    // Quick combat version: a single labeled rectangle, dims ≤ 9 — no
    // L-shapes or volume (those are slow-read gate material).
    geometry: () => rectProblem(9),
    // Quick combat version: just read the staff, no rhythm-fraction word
    // problems (those are slow-read gate material, not battle-pace).
    music_reading: () => readStaffProblem(R.chance(0.5) ? 1 : 2),
  };

  function generateQuick(skill) {
    const gen = QUICK[skill];
    if (!gen) throw new Error('unknown skill: ' + skill);
    const p = gen();
    p.skill = skill;
    p.tier = 1;
    p.quick = true;
    return p;
  }

  function generate(skill, tier) {
    tier = Math.max(1, Math.min(3, tier || 1));
    const gen = GENERATORS[skill];
    if (!gen) throw new Error('unknown skill: ' + skill);
    const p = gen(tier);
    p.skill = skill;
    p.tier = tier;
    return p;
  }

  // Wave 14 (the Court): wrap an applied generator with a petitioner + an
  // absurd complaint (the comedy) around ONE plain problem (the math). The
  // returned CASE is fully serializable — the same generated problem persists
  // in s.court all day, so the day-keyed queue is stable within a day.
  //   skill : one of fractions_as / multidigit_mult / decimals_md /
  //           word_problems — recorded UNDER ITSELF (the pedagogical point).
  //   tier  : caller-supplied (engine adapts it to the kid).
  //   opts.magistrate : when >= 0, this is the recurring Magistrate's case;
  //           its complaint/settle come from the escalating grievance pool at
  //           that visit index (frame is skill-agnostic, so any skill fits).
  function courtCase(skill, tier, opts) {
    opts = opts || {};
    const C = MM.data.COURT;
    const problem = generate(skill, tier);
    let petitioner, complaint, settle, magistrate = false;
    if (opts.magistrate != null && opts.magistrate >= 0) {
      const m = C.magistrate;
      const i = Math.min(opts.magistrate, m.grievances.length - 1);
      petitioner = m.name; complaint = m.grievances[i]; settle = m.settles[i];
      magistrate = true;
    } else {
      const pool = C.cases[skill];
      const frame = pool[Math.floor(Math.random() * pool.length)];
      petitioner = frame.petitioner; complaint = frame.complaint; settle = frame.settle;
    }
    return { skill, petitioner, complaint, settle, problem, heard: false, magistrate };
  }

  // Wave 16 (the Kitchen Garden, P1): the array model — multiplication AS AREA,
  // the one representation the dungeons skip. The kid plants a RECTANGLE of
  // seedlings (rows × columns) and the garden asks how many that is. RECORDS
  // under muldiv_facts (the array IS times-table fluency; a parent switch
  // already governs it). The math text stays plain (the humor lives in the
  // garden field, never the question). Answer is the exact product.
  function gardenArray(rows, cols, tier) {
    return {
      kind: 'number', skill: 'muldiv_facts', tier: tier || 1,
      text: `You planted ${rows} row${rows === 1 ? '' : 's'} with ${cols} seedling${cols === 1 ? '' : 's'} in each row.\nHow many seedlings did you plant in all?`,
      answer: frac(rows * cols, 1),
      solution: `${rows} rows of ${cols} is an array — count it as ${rows} × ${cols} = ${rows * cols} seedlings.`,
      hint: null, rows, cols,
    };
  }

  // Wave 16 (the Castle Kitchen, P2): wrap a real fraction problem (measuring /
  // scaling by measure) with a recipe frame — the same idiom as courtCase. The
  //   skill : 'fractions_as' (measuring / adding parts) or 'fractions_m'
  //           (scaling by a factor) — recorded UNDER ITSELF (the pedagogical
  //           point; parent switches govern both).
  // The dish name + the sous-chef's request are the comedy; the problem text is
  // the plain math. A serializable recipe (the generated problem persists).
  function kitchenRecipe(skill, tier) {
    const G = MM.data.GARDEN;
    const problem = generate(skill, tier);
    const pool = (G && G.recipes && G.recipes[skill]) || [];
    const r = pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : { dish: 'a plain good dish', frame: 'The sous-chef slides a recipe across the counter. "Measure carefully."' };
    return { skill, dish: r.dish, frame: r.frame, problem, cooked: false };
  }

  // Clock doors (Wave 3, the Clockwork Spire) always want an actual clock
  // FACE to read — not the plain-number "how many minutes" half of
  // time_reading(t), which never renders an svg. Exposed separately so
  // E.clockDoor gets a guaranteed screenshot-able clock every time.
  function generateClock(t) {
    const p = readClockProblem(t);
    p.skill = 'time_reading';
    p.tier = t;
    return p;
  }

  // ---------- Wave 7: the Final Exam, inverted (the kid grades the teacher) ----------
  // The MathMaker sits as the student and works a problem on his slate. Some
  // slates contain exactly ONE wrong step; the kid says which one — or says
  // it's correct. Error analysis is the summit of mastery, and "the student
  // becomes the grader" is the whole story in one mechanic.
  //
  // Deliberately NOT in GENERATORS/QUICK: these never enter battles, mixed
  // review, or the ~400-per-tier smoke loop. They're authored, not sampled —
  // each carries a CURATED error (the classic slip a real 5th grader makes),
  // and the later steps follow honestly from the bad one, so exactly one step
  // is where it went wrong. Corrupting a step and then "fixing" the total
  // would put TWO errors on the slate and make the question unanswerable.
  //
  // Returns kind:'choice' — no parser work, no checkAnswer change. `steps`
  // and `badStep` are exposed so the drive (and the slate renderer) can see
  // the structure; `badStep` is -1 when the slate is clean.
  function examSlate(o) {
    const labels = o.steps.map((_, i) => `Step ${i + 1}`);
    const choices = labels.concat(['✓ Every step is correct']);
    const answer = o.badStep < 0 ? o.steps.length : o.badStep;
    const rows = o.steps.map((st, i) =>
      `<div class="slate-step"><span class="slate-n">${i + 1}</span>${st}</div>`).join('');
    return {
      kind: 'choice', choices, answer,
      skill: o.skill, tier: o.tier || 2,
      exam: true, steps: o.steps.slice(), badStep: o.badStep, prompt: o.prompt,
      // `why` is the plain-language explanation of the slip. It was previously
      // only spliced into `solution` — but engine.js's exam AND the Academy
      // both read prob.why directly to say "Here — and here's why" when the
      // kid marks the WRONG step. Without it that read `undefined` (a real
      // shipped bug, found Wave 8b), at the single most sensitive moment the
      // game has: a miss. Wrong answers earn help, not "undefined".
      why: o.why || '',
      text: `<div class="slate"><div class="slate-prompt">${o.prompt}</div>${rows}</div>`,
      solution: o.badStep < 0
        ? 'Every step really was right — the slate is clean.'
        : `Step ${o.badStep + 1} is where it goes wrong. ${o.why}`,
    };
  }

  // Each slate builder takes `flawed` and returns a CLEAN worked solution or a
  // FLAWED one that shares the same shape, so nothing but the mistake
  // distinguishes them. Wave 8b named them (they were anonymous entries in
  // EXAM_SLATES) so Miscount's Academy can address them BY SKILL as well as by
  // the final exam's curated index order — see SPOT_SLATES below. Same
  // functions, two indexes; no slate logic is duplicated.

  // addsub_facts — the classic: the carry gets dropped.
  function slateCarry(flawed) {
    const a = R.int(24, 48), b = R.int(24, 48);
    const o1 = a % 10, o2 = b % 10;
    if (o1 + o2 < 10) return null;           // we want a carry to exist
    const ones = o1 + o2, carry = 1;
    const t1 = Math.floor(a / 10), t2 = Math.floor(b / 10);
    const tens = t1 + t2 + (flawed ? 0 : carry);   // <- the slip
    const total = tens * 10 + (ones % 10);
    return examSlate({
      skill: 'addsub_facts', tier: 1, prompt: `${a} + ${b} = ?`,
      steps: [
        `Ones: ${o1} + ${o2} = ${ones}. Write ${ones % 10}, carry 1.`,
        flawed
          ? `Tens: ${t1} + ${t2} = ${tens}.`
          : `Tens: ${t1} + ${t2} = ${t1 + t2}, plus the carried 1 makes ${tens}.`,
        `So ${a} + ${b} = ${total}.`,
      ],
      badStep: flawed ? 1 : -1,
      why: 'The 1 carried out of the ones column never made it into the tens.',
    });
  }

  // multidigit_mult — partial products, and the tens place loses its zero.
  function slatePartials(flawed) {
    const a = R.int(23, 78), b = R.int(3, 8);
    const tensDigit = Math.floor(a / 10), onesDigit = a % 10;
    const p1 = b * onesDigit;
    const p2 = flawed ? b * tensDigit : b * tensDigit * 10;   // <- the slip
    const total = p1 + p2;
    return examSlate({
      skill: 'multidigit_mult', tier: 2, prompt: `${a} × ${b} = ?`,
      steps: [
        `Split ${a} into ${tensDigit * 10} + ${onesDigit}.`,
        flawed
          ? `Tens part: ${b} × ${tensDigit} = ${p2}.`
          : `Tens part: ${b} × ${tensDigit * 10} = ${p2}.`,
        `Ones part: ${b} × ${onesDigit} = ${p1}.`,
        `Add them: ${p2} + ${p1} = ${total}.`,
      ],
      badStep: flawed ? 1 : -1,
      why: `The tens part is ${b} × ${tensDigit * 10}, not ${b} × ${tensDigit} — the zero got left behind.`,
    });
  }

  // decimals_md — the classic misplaced decimal point.
  function slateDecimalPoint(flawed) {
    const d = R.int(2, 8);            // 0.d
    const m = R.int(3, 9);
    const whole = d * m;              // e.g. 6 x 7 = 42
    if (whole % 10 === 0) return null; // 0.5 x 8 = "4.0" reads as a whole number — the point is the POINT
    const right = whole / 10;         // 4.2
    return examSlate({
      skill: 'decimals_md', tier: 2, prompt: `0.${d} × ${m} = ?`,
      steps: [
        `Ignore the point for a moment: ${d} × ${m} = ${whole}.`,
        flawed
          ? `0.${d} has no decimal places to put back, so the answer is ${whole}.`
          : `0.${d} has 1 decimal place, so the answer needs 1 too: ${right}.`,
        `So 0.${d} × ${m} = ${flawed ? whole : right}.`,
      ],
      badStep: flawed ? 1 : -1,
      why: `0.${d} has one digit after the point, so the answer needs one too — ${right}, not ${whole}.`,
    });
  }

  // fractions_as — the most famous wrong move in fifth grade: adding the
  // denominators straight across.
  function slateAddDenoms(flawed) {
    const dA = R.pick([2, 3, 4]);
    let dB = R.pick([3, 4, 5, 6]);
    if (dB === dA) dB = dA + 1;
    const lcd = dA * dB;
    const nA = 1, nB = 1;
    const cA = nA * dB, cB = nB * dA;    // over the common denominator
    const sum = frac(cA + cB, lcd);
    return examSlate({
      skill: 'fractions_as', tier: 2, prompt: `${nA}/${dA} + ${nB}/${dB} = ?`,
      steps: flawed
        ? [
          `The bottoms are different, so add them: ${dA} + ${dB} = ${dA + dB}.`,
          `Then add the tops: ${nA} + ${nB} = ${nA + nB}.`,
          `So ${nA}/${dA} + ${nB}/${dB} = ${nA + nB}/${dA + dB}.`,
        ]
        : [
          `The bottoms are different, so find a common one: ${dA} × ${dB} = ${lcd}.`,
          `Rewrite both: ${nA}/${dA} = ${cA}/${lcd}, and ${nB}/${dB} = ${cB}/${lcd}.`,
          `Now add the tops: ${cA} + ${cB} = ${cA + cB}, giving ${cA + cB}/${lcd}` +
            (fstr(sum, { improper: true }) === `${cA + cB}/${lcd}` ? '.' : ` — which is ${fstr(sum, { improper: true })}.`),
        ],
      badStep: flawed ? 0 : -1,
      why: 'Denominators are never added. They have to be made the SAME first — then only the tops add.',
    });
  }

  // THE FINAL EXAM'S LAST SLATE. A tier-1 addition fact, the same kind the game
  // opened with, worked correctly. No trick, no error. The kid marks it right.
  // Always clean (ignores `flawed`) — which is exactly why it is NOT registered
  // in SPOT_SLATES: the Academy needs slates that can go either way.
  function slateMakeTen() {
    const a = R.int(6, 9), b = R.int(4, 9);
    const need = 10 - a, rest = b - need;
    return examSlate({
      skill: 'addsub_facts', tier: 1, prompt: `${a} + ${b} = ?`,
      steps: [
        `Make ten: ${a} + ${need} = 10, taking ${need} from the ${b}.`,
        `That leaves ${rest}. And 10 + ${rest} = ${a + b}.`,
        `So ${a} + ${b} = ${a + b}.`,
      ],
      badStep: -1,
      why: '',
    });
  }

  // ---------- Wave 8b: new slates, so the Academy spans the curriculum ----------
  // Wave 7 only ever needed four distinct topics. Miscount's Academy is daily
  // practice across whatever the parent has switched ON, so every mainland
  // topic that HAS a written derivation to audit gets its own classic slip.
  // (time_reading and music_reading deliberately get none: you READ a clock
  // face or a staff, you don't DERIVE it — there are no worked steps to
  // inspect, and a spot-the-error with nothing to inspect is just a quiz.)

  // multidigit_addsub — "the flip": take the smaller digit from the bigger one
  // whichever way round they sit, rather than borrowing.
  function slateBorrowFlip(flawed) {
    const t1 = R.int(3, 9), t2 = R.int(1, t1 - 1);   // t1 > t2, so the tens work out
    const o2 = R.int(2, 9), o1 = R.int(1, o2 - 1);   // o1 < o2, so a borrow is needed
    const a = t1 * 10 + o1, b = t2 * 10 + o2;
    const total = a - b;
    return examSlate({
      skill: 'multidigit_addsub', tier: 2, prompt: `${a} − ${b} = ?`,
      steps: flawed
        ? [
          `Ones: ${o1} won't take ${o2}, so do it the other way: ${o2} − ${o1} = ${o2 - o1}.`,
          `Tens: ${t1} − ${t2} = ${t1 - t2}.`,
          `So ${a} − ${b} = ${(t1 - t2) * 10 + (o2 - o1)}.`,
        ]
        : [
          `Ones: ${o1} won't take ${o2}, so borrow a ten: ${o1 + 10} − ${o2} = ${o1 + 10 - o2}.`,
          `Tens: one ten is gone, so ${t1 - 1} − ${t2} = ${t1 - 1 - t2}.`,
          `So ${a} − ${b} = ${total}.`,
        ],
      badStep: flawed ? 0 : -1,
      why: `You can't turn the ones column around to make it easier — ${o1} really does have to take ${o2}, by borrowing a ten first.`,
    });
  }

  // muldiv_facts — the remainder is quietly dropped.
  function slateDropRemainder(flawed) {
    const d = R.int(3, 9), q = R.int(3, 9), r = R.int(1, d - 1);
    if (r === q) return null;   // "8 ÷ 3 = 2 r 2" — two identical numbers muddies the point
    const dividend = d * q + r;
    return examSlate({
      skill: 'muldiv_facts', tier: 1, prompt: `${dividend} ÷ ${d} = ?`,
      steps: [
        `${d} × ${q} = ${d * q} — as close to ${dividend} as we can get without going over.`,
        `${dividend} − ${d * q} = ${r} left over.`,
        flawed
          ? `So ${dividend} ÷ ${d} = ${q}.`
          : `So ${dividend} ÷ ${d} = ${q} r ${r}.`,
      ],
      badStep: flawed ? 2 : -1,
      why: `The ${r} left over doesn't just disappear — it's part of the answer: ${q} r ${r}.`,
    });
  }

  // long_division — the zero in the middle of the quotient never gets written,
  // so every digit after it slides one place over.
  function slateQuotientZero(flawed) {
    const d = R.pick([2, 3, 4]);
    const h = R.int(1, Math.floor(9 / d));            // keeps the hundreds digit d*h a single digit
    const u = R.int(Math.ceil(10 / d), 9);            // keeps the tens digit of d*u at least 1
    if (u > 9 || h < 1) return null;
    const q = 100 * h + u;                            // a quotient with a ZERO in the tens place
    const D = d * q;
    if (D < 100 || D > 999) return null;
    const dh = d * h;                                 // D's hundreds digit
    const dt = Math.floor((d * u) / 10);              // D's tens digit
    const dOnes = (d * u) % 10;                       // D's ones digit
    if (dt >= d || dt < 1) return null;               // "goes in zero times" must be both true and worth saying
    return examSlate({
      skill: 'long_division', tier: 3, prompt: `${D} ÷ ${d} = ?`,
      steps: [
        `${d} goes into ${dh} exactly ${h} time${h === 1 ? '' : 's'}, with nothing left over. Write ${h}.`,
        flawed
          ? `Bring down the ${dt}. ${d} won't go into ${dt}, so carry on to the next digit.`
          : `Bring down the ${dt}. ${d} goes into ${dt} zero times — write the 0.`,
        `Bring down the ${dOnes}. That makes ${d * u}, and ${d} goes into ${d * u} exactly ${u} times.`,
        flawed
          ? `So ${D} ÷ ${d} = ${10 * h + u}.`
          : `So ${D} ÷ ${d} = ${q}.`,
      ],
      badStep: flawed ? 1 : -1,
      why: `${d} goes into ${dt} zero times — and that zero has to be WRITTEN, or every digit after it slides one place to the right. The answer is ${q}, not ${10 * h + u}.`,
    });
  }

  // decimals_ps — "it has more digits, so it must be bigger."
  function slateLongerIsBigger(flawed) {
    const t = R.int(2, 8);                       // 0.t — the genuinely bigger one
    const k = R.int(1, 9);
    const bNum = 10 * (t - 1) + k;               // two digits, always numerically LESS than 0.t
    const bStr = `0.${bNum}`;
    return examSlate({
      skill: 'decimals_ps', tier: 2, prompt: `Which is greater: 0.${t} or ${bStr}?`,
      steps: flawed
        ? [
          `${bStr} has more digits after the point than 0.${t}, so it must be the bigger number.`,
          `Compare what's after the point: ${bNum} against ${t}.`,
          `${bNum} is more than ${t}, so ${bStr} is greater.`,
        ]
        : [
          `Give them the same number of decimal places: 0.${t} is the same as 0.${t}0.`,
          `Now they can be compared: ${t * 10} hundredths against ${bNum} hundredths.`,
          `${t * 10} is more than ${bNum}, so 0.${t} is greater.`,
        ],
      badStep: flawed ? 0 : -1,
      why: `More digits does not mean bigger. Line the places up: 0.${t} is 0.${t}0, which is ${t * 10} hundredths — more than ${bNum}.`,
    });
  }

  // fractions_m — a mixed number times a whole: the whole part gets multiplied
  // and the fraction part is carried along untouched.
  function slateMixedTimesWhole(flawed) {
    const w = R.int(2, 4), n = 1, d = R.pick([2, 3, 4]);
    const m = R.int(2, 4);
    const imp = w * d + n;                       // the improper numerator
    const prod = frac(imp * m, d);
    return examSlate({
      skill: 'fractions_m', tier: 3, prompt: `${w} ${n}/${d} × ${m} = ?`,
      steps: flawed
        ? [
          `Multiply the whole-number part: ${w} × ${m} = ${w * m}.`,
          `The fraction part comes along unchanged: ${n}/${d}.`,
          `So ${w} ${n}/${d} × ${m} = ${w * m} ${n}/${d}.`,
        ]
        : [
          `Make it improper first: ${w} × ${d} + ${n} = ${imp}, so ${w} ${n}/${d} is ${imp}/${d}.`,
          `Multiply: ${imp}/${d} × ${m} = ${imp * m}/${d}.`,
          `So ${w} ${n}/${d} × ${m} = ${fstr(prod)}.`,
        ],
      badStep: flawed ? 1 : -1,
      why: `The ${n}/${d} has to be multiplied too — ${m} lots of ${n}/${d} is ${fstr(frac(n * m, d), { improper: true })}, not ${n}/${d}. The answer is ${fstr(prod)}.`,
    });
  }

  // word_problems — the first step is done correctly, and then it stops.
  function slateTwoStepStop(flawed) {
    const start = R.int(6, 20), trays = R.int(2, 5), per = R.int(4, 9);
    const baked = trays * per;
    const total = start + baked;
    return examSlate({
      skill: 'word_problems', tier: 2,
      prompt: `A baker has ${start} buns. She bakes ${trays} more trays with ${per} buns on each. How many buns does she have now?`,
      steps: flawed
        ? [
          `The new buns: ${trays} × ${per} = ${baked}.`,
          `The question asks how many buns she has, and she baked ${baked}.`,
          `So she has ${baked} buns.`,
        ]
        : [
          `The new buns: ${trays} × ${per} = ${baked}.`,
          `She still has the ${start} she started with: ${baked} + ${start} = ${total}.`,
          `So she has ${total} buns.`,
        ],
      badStep: flawed ? 1 : -1,
      why: `The ${start} buns she started with never went anywhere — they have to be added on. ${baked} + ${start} = ${total}.`,
    });
  }

  // geometry — perimeter as "length plus width", forgetting there are two of each.
  function slatePerimeterTwoSides(flawed) {
    const l = R.int(7, 14);
    const w = R.int(3, l - 1);   // the LENGTH is always the longer side, or the wording reads wrong
    const p = 2 * (l + w);
    return examSlate({
      skill: 'geometry', tier: 2,
      prompt: `A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter?`,
      steps: flawed
        ? [
          `A rectangle has a length and a width: ${l} and ${w}.`,
          `Add them: ${l} + ${w} = ${l + w}.`,
          `So the perimeter is ${l + w} cm.`,
        ]
        : [
          `Perimeter is the whole way around — two lengths and two widths.`,
          `Add all four sides: ${l} + ${w} + ${l} + ${w} = ${p}.`,
          `So the perimeter is ${p} cm.`,
        ],
      badStep: flawed ? 0 : -1,
      why: `A rectangle has TWO lengths and TWO widths — you walked half of it. ${l} + ${w} + ${l} + ${w} = ${p} cm.`,
    });
  }

  // The final exam's five slates, in curriculum order — unchanged from Wave 7.
  // The LAST one is always clean, by design (see generateExam).
  const EXAM_SLATES = [slateCarry, slatePartials, slateDecimalPoint, slateAddDenoms, slateMakeTen];

  // Miscount's Academy (Wave 8b): the same machinery, indexed BY SKILL so the
  // daily homework can respect the parent's topic switches. Every slate here
  // must honour `flawed` both ways — an always-clean slate (slateMakeTen) would
  // make "is it correct?" a giveaway rather than a live answer.
  const SPOT_SLATES = {
    addsub_facts: [slateCarry],
    muldiv_facts: [slateDropRemainder],
    multidigit_addsub: [slateBorrowFlip],
    multidigit_mult: [slatePartials],
    long_division: [slateQuotientZero],
    decimals_ps: [slateLongerIsBigger],
    decimals_md: [slateDecimalPoint],
    fractions_as: [slateAddDenoms],
    fractions_m: [slateMixedTimesWhole],
    word_problems: [slateTwoStepStop],
    geometry: [slatePerimeterTwoSides],
  };

  // A spot-the-error slate for ONE topic. `flawed` forces a planted error;
  // falsy means a clean slate (and "every step is correct" is the right answer).
  // Returns null for a topic with no slate — callers must filter to
  // spotTheError.skills() first, which is also how the parent cap is honoured.
  //
  // NOTE (deviation from the work order's `spotTheError(skill, tier)`): tier is
  // NOT an input. A slate's difficulty is intrinsic to the error it plants —
  // you cannot render "forgot to carry the 1" at tier 3 — so each slate carries
  // its own authored tier, and the caller reads it off the returned problem.
  function spotTheError(skill, flawed) {
    const pool = SPOT_SLATES[skill];
    if (!pool || !pool.length) return null;
    for (let tries = 0; tries < 60; tries++) {
      const p = pool[Math.floor(Math.random() * pool.length)](!!flawed);
      if (p) return p;
    }
    return null;
  }
  spotTheError.skills = () => Object.keys(SPOT_SLATES);

  // which: 0-4 (the five slates, in order). flawed: force a planted error
  // (the last slate ignores it — it is always clean, by design).
  function generateExam(which, flawed) {
    const build = EXAM_SLATES[which];
    if (!build) throw new Error('no exam slate ' + which);
    const wantFlawed = which === EXAM_SLATES.length - 1 ? false : !!flawed;
    for (let tries = 0; tries < 60; tries++) {
      const p = build(wantFlawed);
      if (p) return p;
    }
    throw new Error('exam slate ' + which + ' never produced a problem');
  }
  generateExam.count = EXAM_SLATES.length;

  // Brave-combat step (2026-07-13, extended v1.7.0 for the mid-round ⚡
  // dual-form toggle): take a QUICK problem and add exactly one small extra
  // step — the ⚡ contract ("harder for double damage") without ever
  // breaking combat pacing. Bare "A op B = ?" texts (all four operators,
  // v1.7.0 — used to be + and − only) extend INLINE, e.g. "6 + 9 + 7 = ?" /
  // "6 × 7 × 3 = ?" / "42 ÷ 6 × 4 = ?" (division always continues with ×,
  // never a second ÷ — chaining division risks an ugly non-integer,
  // multiplying the quotient never does); other integer-answer texts gain a
  // "…then add N" tail; non-integer kinds (choice/clock/fraction answers)
  // return unchanged — their brave lift lives at bosses (see tailStep).
  //
  // v1.7.0 robustness: the dual-form toggle needs this to succeed on nearly
  // every draw (facts topics now route through here too — see
  // mastery.combatProblem — and drive-stances2.js's "never a plain two-term
  // sum under brave" sweep depends on it). The old "if the subtraction would
  // go negative, give up and return unchanged" fallback is gone; it now
  // simply adds instead, which is always safe (step > 0).
  function braveStep(q) {
    if (!q || q.kind !== 'number' || !q.answer || q.answer.d !== 1) return q;
    const base = q.answer.n;
    const inline = q.text.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);
    if (inline) {
      const [, aStr, op, bStr] = inline;
      if (op === '×') {
        const step = R.int(2, 4), ans = base * step;
        return { ...q, text: `${aStr} × ${bStr} × ${step} = ?`, answer: frac(ans, 1),
          solution: `${q.solution} Then ${base} × ${step} = ${ans}.` };
      }
      if (op === '÷') {
        const step = R.int(2, 5), ans = base * step;
        return { ...q, text: `${aStr} ÷ ${bStr} × ${step} = ?`, answer: frac(ans, 1),
          solution: `${q.solution} Then ${base} × ${step} = ${ans}.` };
      }
      const step = R.int(2, 9) * (/0$/.test(aStr) ? 10 : 1);
      let add = base < 15 ? true : R.chance(0.6);
      let ans = add ? base + step : base - step;
      if (ans < 0) { add = true; ans = base + step; } // never abort — add instead
      return { ...q, text: `${aStr} ${op} ${bStr} ${add ? '+' : '−'} ${step} = ?`, answer: frac(ans, 1),
        solution: `${q.solution} Then ${base} ${add ? '+' : '−'} ${step} = ${ans}.` };
    }
    const step = R.int(2, 9);
    let add = base < 15 ? true : R.chance(0.6);
    let ans = add ? base + step : base - step;
    if (ans < 0) { add = true; ans = base + step; }
    return { ...q, text: `${q.text}\n⚡ …then ${add ? 'add' : 'subtract'} ${step}.`,
      answer: frac(ans, 1),
      solution: `${q.solution} Then ${base} ${add ? '+' : '−'} ${step} = ${ans}.` };
  }

  // v1.7.0: the boss "…and then" tail. A full-depth GATE/BOSS problem gains
  // one extra operation on the answer, so a tier-3 brave boss problem is
  // NEVER identical to its base form (the tier lift alone caps at 3 and can
  // stop delivering anything new). Wider coverage than braveStep: number
  // (integer OR fraction answers), remainder (quotient-chain), and clock
  // kinds all tail; choice kinds (the music staff, decimal comparisons)
  // return UNCHANGED — those keep the old latch + "takes effect next
  // question" contract, per the queue's own exemption list.
  function tailStep(q) {
    if (!q) return q;
    if (q.kind === 'number') {
      if (q.answer.d === 1) return braveStep(q); // reuse: same inline/tail logic
      // fraction answer: add a whole number over the same denominator
      const step = R.int(2, 6);
      const ans = frac(q.answer.n + step * q.answer.d, q.answer.d);
      return { ...q, text: `${q.text}\n⚡ …then add ${step}.`, answer: ans,
        solution: `${q.solution} Then + ${step} = ${fstr(ans)}.` };
    }
    if (q.kind === 'remainder') {
      const step = R.int(2, 6);
      const ans = { q: q.answer.q + step, r: q.answer.r };
      const ansTxt = ans.r === 0 ? String(ans.q) : `${ans.q} r ${ans.r}`;
      return { ...q, text: `${q.text}\n⚡ …then add ${step} to the quotient.`, answer: ans,
        solution: `${q.solution} Then + ${step} to the quotient = ${ansTxt}.` };
    }
    if (q.kind === 'clock') {
      const step = R.int(5, 40);
      let total = ((q.answer.h % 12) * 60 + q.answer.m + step) % 720;
      let h = Math.floor(total / 60), m = total % 60;
      if (h === 0) h = 12;
      return { ...q, text: `${q.text}\n⚡ …then add ${step} minutes.`, answer: { h, m },
        solution: `${q.solution} Then + ${step} min = ${h}:${String(m).padStart(2, '0')}.` };
    }
    return q; // choice (staff, decimal compares): unchanged — keeps the latch
  }

  // ---------- Practice Yard drills (the Tutor) ----------
  // Narrow, single-fact-family generators, kept apart from the topic
  // generators above: each targets ONE times table or one number-sense bond,
  // for the Tutor's fluency drills. They never feed combat, gates or the
  // adaptive tiers — the Yard runs them itself as a separate fluency track.
  function yardDrill(cardId) {
    if (cardId === 'doubles') {
      const n = R.int(2, 12);
      return num(`${n} + ${n} = ?`, 2 * n, `Double ${n} is ${2 * n}.`, 'A double is a number added to itself.');
    }
    if (cardId === 'neardoubles') {
      const n = R.int(2, 11); // n + (n+1): a near-double
      return num(`${n} + ${n + 1} = ?`, 2 * n + 1, `${n} + ${n} = ${2 * n}, and one more makes ${2 * n + 1}.`, 'Double the smaller number, then add one.');
    }
    if (cardId === 'make10') {
      const a = R.int(1, 9), r = R.int(0, 2);
      if (r === 0) return num(`${a} + ▢ = 10\nWhat makes ten?`, 10 - a, `${a} + ${10 - a} = 10.`, 'What do you add to reach ten?');
      if (r === 1) return num(`${a} + ${10 - a} = ?`, 10, `${a} and ${10 - a} are a ten-pair.`, 'These two make ten.');
      return num(`10 − ${a} = ?`, 10 - a, `10 − ${a} = ${10 - a}.`, 'Count back from ten.');
    }
    const m = /^x(\d+)$/.exec(cardId);
    if (m) {
      const a = +m[1], b = R.int(1, 12);
      // sometimes the card's number leads, sometimes it trails — the kid sees
      // both 7×3 and 3×7, so commutativity comes for free.
      return R.chance(0.5)
        ? num(`${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}.`)
        : num(`${b} × ${a} = ?`, a * b, `${b} × ${a} = ${a * b}.`);
    }
    return num('2 + 2 = ?', 4, '2 + 2 = 4.'); // unknown card: a safe fallback
  }

  MM.problems = { generate, generateQuick, checkAnswer, parseAnswer, frac, fstr, GENERATORS, QUICK, generateClock, generateExam, spotTheError, braveStep, tailStep, yardDrill, courtCase, gardenArray, kitchenRecipe };
})();
