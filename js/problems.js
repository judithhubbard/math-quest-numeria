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
  // Accepts: 12 | 3.5 | 3/4 | 1 3/4 | 14 r 2 | $3.50 | 1,204
  function parseAnswer(str) {
    if (str == null) return null;
    let s = String(str).trim().toLowerCase().replace(/\$/g, '').replace(/,/g, '');
    if (!s) return null;
    let m;
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

  // problem: {skill, tier, text, kind:'number'|'remainder'|'choice', answer, choices?, hint?, solution}
  //   kind 'number'    -> answer is {n,d}
  //   kind 'remainder' -> answer is {q, r}
  //   kind 'choice'    -> answer is index into choices[]
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
    return p.kind === 'num' && feq(p.f, problem.answer);
  }

  // ---------- generators ----------
  const NAMES = ['Maya', 'Jake', 'Priya', 'Leo', 'Zoe', 'Sam', 'Ava', 'Ben', 'Mia', 'Raj', 'Tess', 'Omar', 'Lily', 'Marcus', 'Nina'];

  function addsub_facts(t) {
    if (t >= 3 && R.chance(0.5)) {
      // missing addend
      const a = R.int(3, 12), b = R.int(3, 12), c = a + b;
      return num(`${a} + ▢ = ${c}\nWhat number goes in the box?`, b,
        `${c} − ${a} = ${b}, so ${a} + ${b} = ${c}.`);
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
    if (t >= 3 && R.chance(0.4)) {
      const a = R.int(3, 9), b = R.int(3, 9);
      return num(`${a} × ▢ = ${a * b}\nWhat number goes in the box?`, b,
        `${a * b} ÷ ${a} = ${b}, so ${a} × ${b} = ${a * b}.`);
    }
    const lo = t === 1 ? 2 : 3;
    const hi = t === 1 ? 5 : (t === 2 ? 9 : 12);
    const a = R.int(lo, hi), b = R.int(2, 9);
    if (t >= 2 && R.chance(0.4)) {
      return num(`${a * b} ÷ ${a} = ?`, b, `${a * b} ÷ ${a} = ${b} because ${a} × ${b} = ${a * b}.`);
    }
    return num(`${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}.`);
  }

  function multidigit_addsub(t) {
    const digits = t === 1 ? [10, 99] : t === 2 ? [100, 999] : [1000, 9999];
    let a = R.int(digits[0], digits[1]), b = R.int(digits[0], digits[1]);
    if (t === 3 && R.chance(0.4)) a = R.int(1, 9) * 1000 + R.pick([0, 1, 2]); // subtraction across zeros
    if (R.chance(0.5)) {
      return num(`${fmt(a)} + ${fmt(b)} = ?`, a + b,
        `Line up the columns: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`);
    }
    if (b > a) { const s = a; a = b; b = s; }
    if (a === b) a += R.int(1, 9);
    return num(`${fmt(a)} − ${fmt(b)} = ?`, a - b,
      `Line up the columns: ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`);
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
    if (t === 1) { dvsr = R.int(2, 9); q = R.int(11, 99); r = 0; }
    else if (t === 2) { dvsr = R.int(2, 9); q = R.int(11, 99); r = R.int(1, dvsr - 1); }
    else if (R.chance(0.5)) { dvsr = R.int(3, 9); q = R.int(101, 999); r = R.int(1, dvsr - 1); }
    else { dvsr = R.int(11, 19); q = R.int(11, 40); r = R.int(1, dvsr - 1); }
    const dividend = dvsr * q + r;
    const ansTxt = r === 0 ? String(q) : `${q} r ${r}`;
    const sol = r === 0
      ? `${dvsr} × ${q} = ${fmt(dividend)}, so the answer is ${q}.`
      : `${dvsr} × ${q} = ${fmt(dvsr * q)}, and ${fmt(dividend)} − ${fmt(dvsr * q)} = ${r} left over. Answer: ${ansTxt}.`;
    return {
      kind: 'remainder', answer: { q, r },
      text: `${fmt(dividend)} ÷ ${dvsr} = ?`,
      hint: r === 0 ? 'Type your answer (this one divides evenly).' : 'Type it like: 14 r 2',
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
        `Use denominator ${lcd}: ${a}/${dA} = ${a * lcd / dA}/${lcd} and ${b}/${dB} = ${b * lcd / dB}/${lcd}. Add: ${a * lcd / dA + b * lcd / dB}/${lcd} = ${fstr(s)}.`,
        'Type a fraction, like 5/8 or 1 1/4');
    }
    const va = a * lcd / dA, vb = b * lcd / dB;
    const [hiV, loV, hiF, loF] = va >= vb ? [va, vb, `${a}/${dA}`, `${b}/${dB}`] : [vb, va, `${b}/${dB}`, `${a}/${dA}`];
    if (hiV === loV) return fractions_as(t);
    const s = frac(hiV - loV, lcd);
    return num(`${hiF} − ${loF} = ?`, s,
      `Use denominator ${lcd}: ${hiF} = ${hiV}/${lcd} and ${loF} = ${loV}/${lcd}. Subtract: ${hiV - loV}/${lcd} = ${fstr(s)}.`,
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
    const style = R.int(1, 3);
    if (style === 1) {
      const d = R.pick([2, 3, 4]); const w1 = R.int(1, 3), n1 = R.int(1, d - 1);
      const w2 = R.int(1, 3), n2 = R.int(1, d - 1);
      const ans = fadd(frac(w1 * d + n1, d), frac(w2 * d + n2, d));
      return num(`${w1} ${n1}/${d} + ${w2} ${n2}/${d} = ?`, ans,
        `Wholes: ${w1} + ${w2} = ${w1 + w2}. Fractions: ${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d}. Together: ${fstr(ans)}.`,
        'Type it like 4 1/4');
    }
    if (style === 2) {
      const d = R.pick([2, 3, 4, 5, 6]); const n = R.int(1, d - 1);
      const group = d * R.int(2, 8);
      return num(`${R.pick(NAMES)} has ${group} marbles and gives away ${n}/${d} of them. How many marbles were given away?`,
        frac(n * group, d),
        `${group} ÷ ${d} = ${group / d}, and ${group / d} × ${n} = ${n * group / d}.`);
    }
    const d = R.pick([2, 3, 4]); const w = R.int(2, 6);
    return num(`1/${d} ÷ ${w} = ?`, frac(1, d * w),
      `Splitting 1/${d} into ${w} equal parts makes pieces of size 1/${d * w}.`,
      'Type a fraction, like 1/12');
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
    ];
    const pool = t === 1 ? one : t === 2 ? two : R.pick([two, three]);
    for (let i = 0; i < 10; i++) {
      const p = R.pick(pool)();
      if (p) return p;
    }
    return one[0]();
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
    word_problems,
  };

  function generate(skill, tier) {
    tier = Math.max(1, Math.min(3, tier || 1));
    const gen = GENERATORS[skill];
    if (!gen) throw new Error('unknown skill: ' + skill);
    const p = gen(tier);
    p.skill = skill;
    p.tier = tier;
    return p;
  }

  MM.problems = { generate, checkAnswer, parseAnswer, frac, fstr, GENERATORS };
})();
