/**
 * num.divisibility: d | n means n = k d for an integer k; proofs about divisibility find
 * that k. The lesson follows the CST notes (Definition 12 on printed page 59; Theorem 19,
 * 6 | n iff 2 | n and 3 | n, pages 83 and 84; Theorem 23, transitivity, pages 98 and 99),
 * the 2023-24 official solutions to supervision exercises 1.2.1 to 1.2.7, STEP Support
 * Assignment 12 Q1 and its hints, and Book of Proof Section 4.2 with Chapter 4, exercises
 * 11 and 20, and Chapter 6, exercise 19.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, sample, upTo } from '../math';
import { gcd } from '../numbers';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { join, math, paren, t, type Rich, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mn, md, mk] = [math`n`, math`d`, math`k`];
const divTex = (a: number, b: number): Span => math`${paren(a)} \mid ${paren(b)}`;
const divides = (d: number, n: number): boolean => (d === 0 ? n === 0 : n % d === 0);

// ---------------------------------------------------------------- the witness k

type Kind = 'product' | 'transitive' | 'combination' | 'thirty';
interface WitP { kind: Kind; a: number; b: number; c: number; d: number }

const quotientWitness = generator<WitP>({
  id: 'quotient-witness',
  skill: 'Prove a divisibility by exhibiting the witness: from n = x a and the other assumptions, compute the integer k with the target equal to k times the divisor.',
  params: (rng) => {
    const kind = pick(rng, ['product', 'transitive', 'combination', 'thirty'] as const);
    if (kind === 'thirty') return { kind, a: int(rng, 1, 9) * pick(rng, [1, -1]), b: 0, c: 0, d: 0 };
    if (kind === 'combination') {
      for (;;) {
        const p: WitP = { kind, a: int(rng, 2, 7), b: int(rng, 2, 9), c: pick(rng, [-5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9]), d: pick(rng, [2, 3, 4, 5, 6]) };
        if (p.c * p.a + (p.d - 1) * p.b !== 0 && p.a !== p.b) return p;
      }
    }
    return { kind, a: int(rng, 2, 6), b: int(rng, 2, 7), c: int(rng, 2, 6), d: int(rng, 2, 7) };
  },
  sane: ({ kind, a, b, c, d }) => (kind === 'thirty' ? (a !== 0 ? null : 'zero') : kind === 'combination' ? (c !== 0 && c !== 1 && a !== b && c * a + (d - 1) * b !== 0 ? null : 'zero') : a >= 2 && b >= 2 && c >= 2 ? null : 'out of range'),
  problem: ({ kind, a, b, c, d }) => {
    switch (kind) {
      case 'product': {
        // a | B with B = a x, c | D with D = c y; then BD = (ac)(xy).
        const [x, y] = [b, d];
        const [B, D] = [a * x, c * y];
        return {
          prompt: t`Book of Proof's exercise: if ${math`a \mid b`} and ${math`c \mid d`} then ${math`ac \mid bd`}. With ${math`a = ${a}`}, ${math`b = ${B}`}, ${math`c = ${c}`}, ${math`d = ${D}`}: find the integer ${mk} with ${math`bd = (ac) k`} that the proof produces.`,
          answer: { kind: 'exact', expected: String(x * y) },
          solution: [
            t`${math`a \mid b`} gives ${math`b = ax`} with ${math`x = ${x}`}, and ${math`c \mid d`} gives ${math`d = cy`} with ${math`y = ${y}`}.`,
            t`Then ${math`bd = (ax)(cy) = (ac)(xy)`}, so ${math`k = xy = ${x} \times ${y} = ${x * y}`}. Check: ${math`${B} \times ${D} = ${B * D} = ${a * c} \times ${x * y}`}.`,
          ],
        };
      }
      case 'transitive': {
        const [l, i, j] = [a, b, c];
        const [m, n] = [i * l, j * i * l];
        return {
          prompt: t`Theorem ${23} of the CST notes: if ${math`l \mid m`} and ${math`m \mid n`} then ${math`l \mid n`}. With ${math`l = ${l}`}, ${math`m = ${m}`}, ${math`n = ${n}`}: the proof writes ${math`m = i_{${0}} l`} and ${math`n = j_{${0}} m`}. Find the integer ${mk} with ${math`n = k l`} that it produces.`,
          answer: { kind: 'exact', expected: String(i * j) },
          solution: [
            t`${math`m = ${m} = ${i} \times ${l}`}, so ${math`i_{${0}} = ${i}`}; and ${math`n = ${n} = ${j} \times ${m}`}, so ${math`j_{${0}} = ${j}`}.`,
            t`The notes take ${math`k = j_{${0}} \cdot i_{${0}} = ${j * i}`}: ${math`k l = j_{${0}} i_{${0}} l = j_{${0}} m = n`}.`,
          ],
        };
      }
      case 'combination': {
        const [x, y, k] = [a, b, c];
        const [m, n] = [x * d, y * d];
        const l = d - 1;
        const v = k * m + l * n;
        return {
          prompt: t`If ${math`d \mid m`} and ${math`d \mid n`}, then ${math`d \mid km + ln`} for all integers ${mk} and ${math`l`}. With ${math`d = ${d}`}, ${math`m = ${m}`}, ${math`n = ${n}`}, ${math`k = ${k}`}, ${math`l = ${l}`}: ${math`km + ln = ${v}`}. Find the integer ${math`q`} with ${math`km + ln = q d`} that the proof produces.`,
          answer: { kind: 'exact', expected: String(k * x + l * y) },
          solution: [
            t`${math`m = a d`} with ${math`a = ${x}`}, and ${math`n = b d`} with ${math`b = ${y}`}.`,
            t`So ${math`km + ln = k a d + l b d = (ka + lb) d`}, and ${math`q = ka + lb = ${paren(k)} \times ${x} + ${l} \times ${y} = ${k * x + l * y}`}. Check: ${math`${k * x + l * y} \times ${d} = ${v}`}.`,
          ],
        };
      }
      case 'thirty': {
        const n = 30 * a;
        const [p, q, r] = [n / 2, n / 3, n / 5];
        return {
          prompt: t`The official solution to supervision exercise ${1}.${2}.${7} shows: if ${math`n = ${2}a = ${3}b = ${5}c`}, then ${math`n = ${30}k`} with ${math`k = -a + b + c`}. For ${math`n = ${n}`}, find this ${mk}.`,
          answer: { kind: 'exact', expected: String(a) },
          solution: [
            t`${math`a = ${p}`}, ${math`b = ${q}`}, ${math`c = ${r}`}, so ${math`k = -${paren(p)} + ${paren(q)} + ${paren(r)} = ${a}`}.`,
            t`Why it works: ${math`${30}(-a + b + c) = -${15} \cdot ${2}a + ${10} \cdot ${3}b + ${6} \cdot ${5}c = -${15}n + ${10}n + ${6}n = n`}.`,
          ],
        };
      }
    }
  },
  solve: ({ kind, a, b, c, d }) => {
    // Divide the target by the divisor directly.
    switch (kind) {
      case 'product': return String((a * b * c * d) / (a * c));
      case 'transitive': return String((c * b * a) / a);
      case 'combination': return String((c * a * d + (d - 1) * b * d) / d);
      case 'thirty': return String((30 * a) / 30);
    }
  },
  misconceptions: ({ kind, a, b, c, d }): Misconception[] => {
    switch (kind) {
      case 'product': return [
        { response: String(b + d), why: t`The witnesses multiply: ${math`bd = (ax)(cy) = (ac)(xy)`}, so ${mk} is ${math`xy`}, not ${math`x + y`}.` },
        { response: String(a * b * c * d), why: t`That is ${math`bd`} itself. ${mk} is what ${math`ac`} is multiplied by to give ${math`bd`}.` },
        { response: String(a * c), why: t`That is the divisor ${math`ac`}. ${mk} is the other factor of ${math`bd`}.` },
        { response: String(b * c * d), why: t`That divides ${math`bd`} by ${math`a`} only. Divide by the whole of ${math`ac`}.` },
      ];
      case 'transitive': return [
        { response: String(b + c), why: t`${math`n = j_{${0}} m = j_{${0}} (i_{${0}} l)`}: the factors multiply.` },
        { response: String(c * b * a), why: t`That is ${mn} itself. ${mk} is what ${math`l`} is multiplied by to give ${mn}.` },
        { response: String(c), why: t`${math`j_{${0}}`} gives ${mn} as a multiple of ${math`m`}, not of ${math`l`}: multiply by ${math`i_{${0}}`} too.` },
      ];
      case 'combination': return [
        { response: String(a + b), why: t`The coefficients ${mk} and ${math`l`} stay: ${math`q = ka + lb`}.` },
        { response: String(c * a * d + (d - 1) * b * d), why: t`That is ${math`km + ln`} itself; ${math`q`} is that number divided by ${md}.` },
        { response: String(c * b + (d - 1) * a), why: t`Match the coefficients to the right numbers: ${mk} goes with ${math`m = ad`}, and ${math`l`} with ${math`n = bd`}.` },
      ];
      case 'thirty': return [
        { response: String(31 * a), why: t`The sign matters: ${math`k = -a + b + c`}, not ${math`a + b + c`}.` },
        { response: String(-a), why: t`That is ${math`a - b - c`}. The signs are the other way round: ${math`k = -a + b + c`}.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- the largest divisor of a family

interface Fam { tex: Span; at: (n: number) => bigint; why: Rich }
const B = BigInt;
const FAMILIES: readonly Fam[] = [
  { tex: math`n(n + ${1})`, at: (n) => B(n) * B(n + 1), why: t`two consecutive integers, so one is even` },
  { tex: math`n(n + ${1})(n + ${2})`, at: (n) => B(n) * B(n + 1) * B(n + 2), why: t`three consecutive integers: one is a multiple of ${3}, at least one is even` },
  { tex: math`n^{${3}} - n`, at: (n) => B(n) ** 3n - B(n), why: t`${math`(n - ${1})n(n + ${1})`}, three consecutive integers` },
  { tex: math`n^{${5}} - n^{${3}}`, at: (n) => B(n) ** 5n - B(n) ** 3n, why: t`${math`n^{${3}}(n - ${1})(n + ${1})`}: a multiple of ${3}, and of ${8} whether ${mn} is even (from ${math`n^{${3}}`}) or odd (two consecutive even numbers)` },
  { tex: math`n^{${4}} - n^{${2}}`, at: (n) => B(n) ** 4n - B(n) ** 2n, why: t`${math`n^{${2}}(n - ${1})(n + ${1})`}: a multiple of ${3}, and of ${4} whether ${mn} is even or odd` },
  { tex: math`n^{${5}} - n`, at: (n) => B(n) ** 5n - B(n), why: t`${math`(n - ${1})n(n + ${1})(n^{${2}} + ${1})`}: a multiple of ${6}, and of ${5} since ${math`n^{${2}} + ${1}`} is a multiple of ${5} when ${mn} leaves remainder ${2} or ${3}` },
  { tex: math`(n - ${1})n(n + ${1})(n + ${2})`, at: (n) => B(n - 1) * B(n) * B(n + 1) * B(n + 2), why: t`four consecutive integers: a multiple of ${3}, and two consecutive even numbers, one a multiple of ${4}` },
  { tex: math`${2}^{${2}n} - ${1}`, at: (n) => 4n ** B(n) - 1n, why: t`${math`(${2}^{n} - ${1})${2}^{n}(${2}^{n} + ${1})`} is three consecutive integers and ${math`${2}^{n}`} is not a multiple of ${3}; and it is odd` },
  { tex: math`${5}^{${2}n} - ${1}`, at: (n) => 25n ** B(n) - 1n, why: t`${math`${25} - ${1} = ${24}`}, and ${math`${25}^{n} - ${1} = (${25} - ${1})(${25}^{n - ${1}} + \cdots + ${1})`}` },
  { tex: math`n^{${3}} + ${5}n`, at: (n) => B(n) ** 3n + 5n * B(n), why: t`${math`n^{${3}} - n + ${6}n`}, and ${math`n^{${3}} - n`} is a multiple of ${6}` },
  { tex: math`${2}n^{${3}} + ${3}n^{${2}} + n`, at: (n) => 2n * B(n) ** 3n + 3n * B(n) ** 2n + B(n), why: t`${math`n(n + ${1})(${2}n + ${1})`}, and ${math`n(n + ${1})(${2}n + ${1}) = n(n + ${1})(n + ${2}) + (n - ${1})n(n + ${1})`}` },
  { tex: math`n^{${7}} - n`, at: (n) => B(n) ** 7n - B(n), why: t`a multiple of ${2}, ${3}, and ${7}, by checking the remainders of ${mn}` },
];
const gcdBig = (a: bigint, b: bigint): bigint => { let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b]; while (y !== 0n) [x, y] = [y, x % y]; return x; };
const famGcd = (f: Fam, upToN: number): number => Number(upTo(upToN).reduce((g, n) => gcdBig(g, f.at(n)), 0n));
const largestProperDivisor = (v: number): number => { for (let d = Math.floor(v / 2); d >= 1; d--) if (v % d === 0) return d; return 1; };

interface FamP { i: number }

const largestDivisor = generator<FamP>({
  id: 'largest-divisor',
  skill: 'Find the largest integer that divides an expression for every positive integer n, by factorising it into consecutive integers, as in STEP Support Assignment 12 Q1.',
  params: (rng) => ({ i: int(rng, 0, FAMILIES.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FAMILIES.length ? null : 'out of range'),
  problem: ({ i }) => {
    const f = FAMILIES[i] as Fam;
    const g = famGcd(f, 12);
    return {
      prompt: t`What is the largest integer that divides ${f.tex} for every positive integer ${mn}?`,
      answer: { kind: 'exact', expected: String(g) },
      solution: [
        t`Every value is a multiple of ${g}: ${f.why}.`,
        t`No larger number works, because the values for ${math`n = ${1}, ${2}, ${3}`}, which are ${math`${f.at(1)}, ${f.at(2)}, ${f.at(3)}`}, have greatest common divisor ${g}.`,
      ],
    };
  },
  solve: ({ i }) => String(famGcd(FAMILIES[i] as Fam, 60)),
  misconceptions: ({ i }): Misconception[] => {
    const f = FAMILIES[i] as Fam;
    const g = famGcd(f, 12);
    return [
      { response: String(Number(f.at(2))), why: t`That is the value for ${math`n = ${2}`}. The number must divide the value for every ${mn}: compare several values.` },
      { response: String(2 * g), why: t`${2 * g} does not divide every value: check ${math`n = ${upTo(12).find((n) => f.at(n) % B(2 * g) !== 0n) ?? 1}`}.` },
      { response: String(largestProperDivisor(g)), why: t`${largestProperDivisor(g)} divides every value, but it is not the largest such number. Look for every prime power the factorisation guarantees.` },
    ];
  },
});

// ---------------------------------------------------------------- zero and signs

interface Stmt { d: number; n: number }
interface ZeroP { stmts: readonly Stmt[] }

const zeroAndSigns = generator<ZeroP>({
  id: 'zero-and-signs',
  skill: 'Decide divisibility statements from the definition, d | n when n = k d for an integer k, including zero and negative numbers.',
  params: (rng) => {
    const a = int(rng, 2, 9);
    const k = int(rng, 2, 5);
    const zeroTrue: Stmt = pick(rng, [{ d: 0, n: 0 }, { d: a, n: 0 }, { d: -a, n: 0 }]);
    const asym: Stmt = pick(rng, [{ d: a, n: k * a }, { d: k * a, n: a }]);
    const neg: Stmt = pick(rng, [{ d: -a, n: k * a }, { d: a, n: -k * a }, { d: -a, n: -(k * a + 1) }]);
    const other: Stmt = pick(rng, [{ d: 0, n: a }, { d: 1, n: -k * a }, { d: a, n: k * a + 1 }, { d: k * a, n: k * a }]);
    return { stmts: sample(rng, [zeroTrue, asym, neg, other], 4) };
  },
  sane: ({ stmts }) => (stmts.length === 4 ? null : 'out of range'),
  problem: ({ stmts }) => {
    const options: ChoiceOption[] = stmts.map((s, i) => ({ id: `s${i}`, label: [divTex(s.d, s.n)] }));
    const truth = stmts.map((s) => divides(s.d, s.n));
    return {
      prompt: t`Using the definition, ${math`d \mid n`} when ${math`n = k d`} for some integer ${mk}, which of these are true: ${join(stmts.map((s) => [divTex(s.d, s.n)]), ', ')}? Choose every true statement.`,
      answer: { kind: 'choice', options, correct: options.filter((_, i) => truth[i]).map((o) => o.id) },
      solution: stmts.map((s) => (divides(s.d, s.n)
        ? t`${divTex(s.d, s.n)} is true: ${math`${paren(s.n)} = ${s.d === 0 ? 0 : s.n / s.d} \times ${paren(s.d)}`}.`
        : s.d === 0
          ? t`${divTex(s.d, s.n)} is false: every multiple of ${0} is ${0}, and ${s.n} is not.`
          : t`${divTex(s.d, s.n)} is false: ${paren(s.n)} divided by ${paren(s.d)} is not a whole number.`)),
    };
  },
  solve: ({ stmts }) => stmts.flatMap((s, i) => (upTo(201).some((k) => (k - 101) * s.d === s.n) ? [`s${i}`] : [])),
  misconceptions: ({ stmts }): Misconception[] => {
    const ids = (f: (s: Stmt) => boolean): string[] => stmts.flatMap((s, i) => (f(s) ? [`s${i}`] : []));
    return [
      { response: ids((s) => s.d !== 0 && s.n !== 0 && divides(s.d, s.n)), why: t`Zero is not special in the definition: ${math`${0} = ${0} \times d`} for every ${md}, so every integer divides ${0}, and ${math`${0} \mid ${0}`}.` },
      { response: ids((s) => divides(s.n, s.d)), why: t`${math`d \mid n`} says ${mn} is a multiple of ${md}, not the other way round.` },
      { response: ids((s) => s.d >= 0 && s.n >= 0 && divides(s.d, s.n)), why: t`Signs do not matter for divisibility: ${math`k`} may be negative, so ${math`-d \mid n`} exactly when ${math`d \mid n`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const theorem19 = workedProof({
  title: t`${6} divides ${mn} if and only if ${2} and ${3} do`,
  prompt: t`Theorem ${19} of the CST notes: for every integer ${mn}, ${math`${6} \mid n`} if and only if ${math`${2} \mid n`} and ${math`${3} \mid n`}.`,
  steps: [
    t`Let ${mn} be an arbitrary integer. (${math`\Rightarrow`}) Assume ${math`${6} \mid n`}, that is, ${math`n = ${6}k`} for an integer ${mk}. Then ${math`n = ${2}(${3}k)`}, so ${math`${2} \mid n`}; and ${math`n = ${3}(${2}k)`}, so ${math`${3} \mid n`}.`,
    t`(${math`\Leftarrow`}) Assume ${math`n = ${2}i`} and ${math`n = ${3}j`} for integers ${math`i, j`}. We must find an integer ${mk} with ${math`n = ${6}k`}.`,
    t`The notes' witness is ${math`k = i - j`}: ${math`${6}(i - j) = ${3}(${2}i) - ${2}(${3}j) = ${3}n - ${2}n = n`}.`,
  ],
  answer: t`${math`${6} \mid n \iff ${2} \mid n \land ${3} \mid n`}.`,
  source: cite('cst-dm-notes', 'printed pages 83 and 84, Theorem 19'),
});

const sheet121a = auto({
  id: 'sheet-1-2-1-a',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.1(a)'),
  title: t`Which integers does zero divide?`,
  prompt: t`Characterise the integers ${mn} such that ${math`${0} \mid n`}: give every such ${mn}.`,
  answer: { kind: 'exact', expected: '0' },
  hints: [
    t`By the definition, what does ${math`${0} \mid n`} say as an equation?`,
    t`What is ${math`l \cdot ${0}`} for any integer ${math`l`}?`,
    t`Does the one candidate actually satisfy the definition?`,
  ],
  nudge: t`Not quite. Use the definition, ${math`n = l \cdot d`}, rather than division.`,
  solution: [
    t`${math`${0} \mid n`} means ${math`n = l \cdot ${0}`} for some integer ${math`l`}, so ${math`n = ${0}`}. Conversely ${math`${0} = ${0} \cdot ${0}`}, so ${math`${0} \mid ${0}`}.`,
    t`The only such integer is ${0}. Reading ${math`d \mid n`} as "${math`n / d`} is an integer" would wrongly rule out ${math`${0} \mid ${0}`}: the definition uses only multiplication.`,
    t`Work from the definition of divides, which uses only multiplication.`,
  ],
  reference: '0',
  verify: () => same('integers from -100 to 100 that zero divides', upTo(201).map((i) => i - 101).filter((n) => upTo(21).some((l) => (l - 11) * 0 === n)).join(), '0'),
  misconceptions: [{ response: '1', why: t`${math`${0} \mid ${1}`} would need ${math`${1} = l \cdot ${0}`}, which no integer ${math`l`} gives.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.2.1(a)'), answer: '0', agrees: true },
});

const ALL: ChoiceOption[] = [
  { id: 'all', label: t`every integer ${md}` },
  { id: 'nonzero', label: t`every integer ${md} except ${0}` },
  { id: 'zero', label: t`only ${math`d = ${0}`}` },
  { id: 'none', label: t`no integer ${md}` },
];
const sheet121b = auto({
  id: 'sheet-1-2-1-b',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.1(b)'),
  title: t`Which integers divide zero?`,
  prompt: t`Characterise the integers ${md} such that ${math`d \mid ${0}`}.`,
  answer: { kind: 'choice', options: ALL, correct: 'all' },
  hints: [
    t`By the definition, what does ${math`d \mid ${0}`} say as an equation?`,
    t`Which integer ${math`l`} makes ${math`${0} = l \cdot d`} for any ${md}?`,
    t`Does that also work when ${math`d = ${0}`}?`,
  ],
  nudge: t`Not quite. Use the definition, ${math`${0} = l \cdot d`}; it never divides by ${md}.`,
  solution: [
    t`For every integer ${md}, ${math`${0} = ${0} \cdot d`}, so ${math`d \mid ${0}`}; this includes ${math`d = ${0}`}.`,
    t`The definition of divides never divides by ${md}.`,
  ],
  reference: 'all',
  verify: () => same('integers from -50 to 50 that divide 0', upTo(101).every((i) => divides(i - 51, 0)), true),
  misconceptions: [{ response: 'nonzero', why: t`${math`d = ${0}`} divides ${0} as well: ${math`${0} = ${0} \cdot ${0}`}. The definition never divides by ${md}.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.2.1(b)'), answer: 'all', agrees: true },
});

const prod5 = (n: number): number => n * (n + 1) * (n + 2) * (n + 3) * (n + 4);
const bop619 = auto({
  id: 'bop-6-19',
  source: cite('bop', 'Chapter 6, exercise 19', true),
  title: t`Five consecutive integers`,
  prompt: t`Book of Proof Chapter ${6}, exercise ${19}: the product of any five consecutive integers is divisible by a certain number (for example ${math`${3} \times ${4} \times ${5} \times ${6} \times ${7} = ${2520}`}). What is the largest integer that divides every such product?`,
  answer: { kind: 'exact', expected: '120' },
  hints: [
    t`Which small product of five consecutive positive integers is easy to compute?`,
    t`Among five consecutive integers, which multiples of ${5}, ${3}, and ${2} must appear?`,
    t`Why must the product be a multiple of ${8}, not just ${4}?`,
  ],
  nudge: t`Not quite. The answer must divide every product, including the smallest one, ${math`${1} \times ${2} \times ${3} \times ${4} \times ${5}`}.`,
  solution: [
    t`Among five consecutive integers there is a multiple of ${5}, a multiple of ${3}, and two consecutive even numbers, one of them a multiple of ${4}. So the product is a multiple of ${math`${5} \times ${3} \times ${8} = ${120}`}.`,
    t`It is the largest: ${math`${1} \times ${2} \times ${3} \times ${4} \times ${5} = ${120}`} is itself such a product. Book of Proof's second proof: the product of ${mn} down to ${math`n - ${4}`} is ${math`${120}\binom{n}{${5}}`}.`,
    t`A divisor of every member must divide the smallest example.`,
  ],
  reference: '120',
  verify: () => same('gcd of the products from 1 to 5 up to 100 to 104', upTo(100).reduce((g, n) => gcd(g, prod5(n)), 0), 120),
  misconceptions: [{ response: '2520', why: t`${2520} is one product. ${math`${1} \times ${2} \times ${3} \times ${4} \times ${5} = ${120}`} is another, so the number must divide ${120}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 6, exercise 19'), answer: '120', agrees: true },
});

const bop420 = auto({
  id: 'bop-4-20',
  source: cite('bop', 'Chapter 4, exercise 20', true),
  title: t`When ${math`a^{${2}}`} divides ${math`a`}`,
  prompt: t`Find every integer ${math`a`} with ${math`a^{${2}} \mid a`}.`,
  answer: {
    kind: 'witness', count: { min: 1, max: 6 }, unordered: true, example: '-1, 0, 1',
    check: (vs) => {
      const got = [...new Set(vs.map((v) => (v.den === 1n ? Number(v.num) : NaN)))].sort((x, y) => x - y);
      if (got.some((x) => Number.isNaN(x))) return 'Give whole numbers.';
      const bad = got.find((x) => !divides(x * x, x));
      if (bad !== undefined) return `${bad} squared is ${bad * bad}, which does not divide ${bad}.`;
      return got.join() === '-1,0,1' ? null : 'Some integers with this property are missing.';
    },
  },
  hints: [
    t`Does ${math`a = ${0}`} satisfy ${math`a^{${2}} \mid a`}?`,
    t`If ${math`a \ne ${0}`} and ${math`a = k a^{${2}}`}, what does cancelling ${math`a`} give?`,
    t`Which integers divide ${1}?`,
  ],
  nudge: t`Not quite. Treat ${math`a = ${0}`} separately, then cancel ${math`a`} in ${math`a = k a^{${2}}`}.`,
  solution: [
    t`${math`a = ${0}`} works: ${math`${0} \mid ${0}`}. If ${math`a \ne ${0}`} and ${math`a = k a^{${2}}`}, cancel ${math`a`}: ${math`${1} = k a`}, so ${math`a`} divides ${1}, and ${math`a = ${1}`} or ${math`a = -${1}`}.`,
    t`So the integers are ${math`-${1}, ${0}, ${1}`}.`,
    t`Cancel only after setting aside the zero case.`,
  ],
  reference: '-1, 0, 1',
  verify: () => same('integers from -100 to 100', upTo(201).map((i) => i - 101).filter((a) => divides(a * a, a)).join(), '-1,0,1'),
  misconceptions: [{ response: '1', why: t`${math`-${1}`} works too, and so does ${0}: ${math`${0}^{${2}} = ${0}`} divides ${0}.` }],
  // Exercise 20 is even; its statement gives the set, {-1, 0, 1}.
  official: { source: cite('bop', 'Chapter 4, exercise 20, the statement'), answer: '-1, 0, 1', agrees: true },
});

const a12q1iii = auto({
  id: 'a12-q1-iii',
  source: cite('step-f12', 'Q1(iii)', true),
  title: t`The largest divisor of ${math`n^{${5}} - n^{${3}}`}`,
  prompt: t`STEP Support Assignment ${12} asks you to show that ${math`n^{${5}} - n^{${3}}`} is divisible by ${24} for every positive integer ${mn}. Is ${24} the largest number with this property? Give the largest.`,
  answer: { kind: 'exact', expected: '24' },
  solution: [
    t`The hints: ${math`n^{${5}} - n^{${3}} = n^{${3}}(n - ${1})(n + ${1})`} is a multiple of ${3}; if ${mn} is even, ${math`n^{${3}}`} is a multiple of ${8}, and if ${mn} is odd, ${math`n - ${1}`} and ${math`n + ${1}`} are consecutive even numbers, so their product is a multiple of ${8}.`,
    t`It is the largest: for ${math`n = ${2}`} the value is ${math`${32} - ${8} = ${24}`}.`,
  ],
  reference: '24',
  verify: () => same('gcd of the values for n from 1 to 60', famGcd(FAMILIES[3] as Fam, 60), 24),
  misconceptions: [{ response: '48', why: t`For ${math`n = ${2}`}, ${math`n^{${5}} - n^{${3}} = ${24}`}, which ${48} does not divide.` }],
  official: { source: cite('step-f12-hints', 'Q1(iii)'), answer: '24', agrees: true },
});

const sheet124 = supervision({
  id: 'sheet-1-2-4',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.4'),
  title: t`Divisibility is transitive`,
  prompt: t`Show that for all integers ${math`l, m, n`}, ${math`l \mid m \land m \mid n \Rightarrow l \mid n`}. Name the witness for ${math`l \mid n`} explicitly.`,
  hints: [
    t`What do ${math`l \mid m`} and ${math`m \mid n`} give as equations with integers?`,
    t`Substituting one into the other, what is ${mn} in terms of ${math`l`}?`,
    t`Which integer is the witness for ${math`l \mid n`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.4'),
});
const sheet126 = supervision({
  id: 'sheet-1-2-6',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.6'),
  title: t`Sums, multiples, and combinations`,
  prompt: t`Prove that for all integers ${math`d, k, l, m, n`}: (a) ${math`d \mid m \land d \mid n \Rightarrow d \mid (m + n)`}; (b) ${math`d \mid m \Rightarrow d \mid k m`}; (c) ${math`d \mid m \land d \mid n \Rightarrow d \mid (k m + l n)`}. Prove (c) from (a) and (b) rather than from the definition.`,
  hints: [
    t`For (a), with ${math`m = dx`} and ${math`n = dy`}, what is ${math`m + n`}?`,
    t`For (b), what is ${math`km`} when ${math`m = dx`}?`,
    t`For (c), which uses of (b) and then (a) give ${math`d \mid km + ln`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.6'),
});
const bop411 = supervision({
  id: 'bop-4-11',
  source: cite('bop', 'Chapter 4, exercise 11'),
  title: t`Products of divisors`,
  prompt: t`Suppose ${math`a, b, c, d \in \mathbb{Z}`}. Prove that if ${math`a \mid b`} and ${math`c \mid d`}, then ${math`ac \mid bd`}.`,
  hints: [
    t`What do ${math`a \mid b`} and ${math`c \mid d`} give, with different letters?`,
    t`What is ${math`bd`} after substituting?`,
    t`How can ${math`bd`} be regrouped as ${math`ac`} times an integer?`,
  ],
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 11'),
});
const a12q1iv = supervision({
  id: 'a12-q1-iv',
  source: cite('step-f12', 'Q1(iv)'),
  title: t`A tempting wrong argument`,
  prompt: t`Show that ${math`${2}^{${2}n} - ${1}`} is divisible by ${3} for every positive integer ${mn}. The hints warn against saying "${math`(${2}^{n} - ${1})(${2}^{n} + ${1})`} is a product of two consecutive odd numbers, so one is a multiple of ${3}": give a counterexample to that reasoning, and then a correct argument.`,
  hints: [
    t`Do any two consecutive odd numbers include a multiple of ${3}? Which small pair settles it?`,
    t`Of three consecutive integers ${math`${2}^{n} - ${1}`}, ${math`${2}^{n}`}, ${math`${2}^{n} + ${1}`}, which one can never be a multiple of ${3}?`,
    t`Alternatively, what is ${math`${4}^{n}`} modulo ${3}?`,
  ],
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(iv)'),
});

// Rule 1 (2026-10-08): set here from logic.iff, the earliest topic that teaches everything it needs.
const sw122 = supervision({
  id: 'sw-1-2-2',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.2'),
  title: t`Cancelling a common factor`,
  prompt: t`Let ${math`k, m, n`} be integers with ${math`k`} positive. Show that ${math`(k \cdot m) \mid (k \cdot n) \iff m \mid n`}.`,
  writeUp: 'proof',
  hints: [
    t`What does ${math`(k \cdot m) \mid (k \cdot n)`} mean, written with a witness?`,
    t`For the forward direction, why may ${math`k`} be cancelled from an equation of the form ${math`k \cdot n = j \cdot k \cdot m`}?`,
    t`For the backward direction, how does a witness for ${math`m \mid n`} give a witness for ${math`(k \cdot m) \mid (k \cdot n)`}?`,
  ],
  official: cite('cst-dm-sols-2324-1', '1.2.2'),
});

// Rule 1 (2026-10-08): set here from logic.iff, the earliest topic that teaches everything it needs.
const sw127 = supervision({
  id: 'sw-1-2-7',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.7'),
  title: t`Divisible by ${30}`,
  prompt: t`Prove that for all integers ${mn}, ${math`${30} \mid n \iff (${2} \mid n \land ${3} \mid n \land ${5} \mid n)`}.`,
  writeUp: 'proof',
  hints: [
    t`For the forward direction, how does a witness for ${math`${30} \mid n`} give witnesses for ${2}, ${3}, and ${5}?`,
    t`For the backward direction, with ${math`n = ${2}a`}, ${math`n = ${3}b`}, and ${math`n = ${5}c`}, what are ${math`${15}n`}, ${math`${10}n`}, and ${math`${6}n`} as multiples of ${30}?`,
    t`Which combination of ${15}, ${10}, and ${6} with integer coefficients equals ${1}, and what does it say about ${mn}?`,
  ],
  official: cite('cst-dm-sols-2324-1', '1.2.7'),
});

// Rule 1 (2026-10-08): set here from logic.quantifiers, the earliest topic that teaches everything it needs.
const prop18 = supervision({
  id: 'notes-72-prop18',
  source: cite('cst-dm-notes', 'printed page 72, Proposition 18'),
  title: t`A congruence for every ${mn}`,
  prompt: t`Fix a positive integer ${math`m`}. Prove: for integers ${math`a`} and ${math`b`}, ${math`a \equiv b \pmod{m}`} if, and only if, for all positive integers ${mn}, ${math`n \cdot a \equiv n \cdot b \pmod{n \cdot m}`}. (${math`a \equiv b \pmod{m}`} means ${math`m \mid (a - b)`}.) State where ${mn} is taken to be arbitrary, and where the "for all" assumption is used by choosing a value.`,
  writeUp: 'proof',
  official: cite('cst-dm-notes', 'printed page 73, the notes\' proof'),
  hints: [
    t`For one direction, if ${math`m`} divides ${math`a - b`}, why does ${math`nm`} divide ${math`n(a - b)`} for every positive ${mn}?`,
    t`For the other, which single value of ${mn} turns the assumption into ${math`a \equiv b \pmod{m}`}?`,
    t`Which direction introduces an arbitrary ${mn}, and which chooses one?`,
  ],
});

// ---------------------------------------------------------------- lesson

const [ma, mb] = [math`a`, math`b`];
const cube3 = (n: number): number => n ** 3 - n;

export const divisibility: TopicContent = {
  topicId: 'num.divisibility',
  goal: t`Use the definition ${math`d \mid n \iff n = kd`} for an integer ${mk} to prove divisibility facts, by computing the witness ${mk}.`,
  objective: t`Prove divisibility facts from the definition by finding the integer witness.`,
  why: t`Divisibility is the language of number theory; next come congruences and the greatest common divisor.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A statement, not a sum` },
    { kind: 'hook', text: t`Does ${0} divide ${0}? Your calculator says ${math`${0} \div ${0}`} is an error. Yet the official Cambridge solutions to the first supervision sheet say yes, ${0} divides ${0}, and they are right. The difference is all in how "divides" is defined.` },
    { kind: 'narrative', text: t`The calculator thinks of division as an operation that produces a number. Number theory asks a different question: is one number a whole multiple of another? That question uses only multiplication, and multiplication never breaks.` },
    {
      kind: 'definition',
      name: t`Divides`,
      formal: t`For integers ${md} and ${mn}, ${md} [[divides|divides]] ${mn}, written ${math`d \mid n`}, if there is an integer ${mk} with ${math`n = k \cdot d`}. Such a ${mk} is a witness for ${math`d \mid n`}.`,
      plain: t`${mn} is a whole-number multiple of ${md}. ${math`${3} \mid ${12}`} with witness ${math`k = ${4}`}, because ${math`${12} = ${4} \times ${3}`}.`,
    },
    { kind: 'p', text: t`${math`d \mid n`} is a statement, true or false, not a number. ${math`${2} \mid ${4}`} is true and ${math`${4} \mid ${2}`} is false. Do not confuse it with ${math`d / n`}, which is a number.` },
    {
      kind: 'p',
      text: t`Zero and signs need no special rules. ${math`d \mid ${0}`} for every integer ${md}, including ${0}, because ${math`${0} = ${0} \cdot d`}. Witnesses may be negative, so ${math`${-3} \mid ${12}`}, with witness ${math`${-4}`}.`,
      why: { q: t`So which numbers does ${0} divide?`, a: t`${math`${0} \mid n`} needs ${math`n = k \cdot ${0} = ${0}`}. So ${0} divides ${0} and nothing else. That settles the hook: ${math`${0} = ${1} \cdot ${0}`}, so ${math`${0} \mid ${0}`}.` },
    },
    quickCheck({
      prompt: t`${math`${-4} \mid ${12}`}. What is the witness ${mk}, the integer with ${math`${12} = k \cdot (${-4})`}?`,
      answer: { kind: 'exact', expected: String(12 / -4) },
      reference: String(12 / -4),
      why: t`${math`(${12 / -4}) \times (${-4}) = ${12}`}. Witnesses may be negative.`,
    }),
    { kind: 'section', title: t`Proofs find the witness` },
    { kind: 'narrative', text: t`Every proof that ${math`d \mid n`} comes down to one task: produce an integer ${mk} with ${math`n = k \cdot d`}. Every assumption ${math`d \mid m`} hands you a witness to use: write ${math`m = a \cdot d`}, giving it a fresh name. The CST notes do exactly this in Theorem ${23}: from ${math`m = i_{${0}} l`} and ${math`n = j_{${0}} m`}, they get ${math`n = (j_{${0}} i_{${0}}) l`}, so the witness for ${math`l \mid n`} is ${math`j_{${0}} i_{${0}}`}.` },
    { kind: 'narrative', text: t`Here is a theorem where the witnesses do something surprising: they pin themselves down completely.` },
    { kind: 'theorem', statement: t`Let ${ma} and ${mb} be positive integers. If ${math`a \mid b`} and ${math`b \mid a`}, then ${math`a = b`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Unpack both assumptions`, text: t`There are integers ${mk} and ${math`l`} with ${math`b = k a`} and ${math`a = l b`}.`, plain: t`Two assumptions, two witnesses, two different letters. If ${ma} and ${mb} were both ${5}, both witnesses would be ${1}.` },
        { label: t`Substitute one into the other`, text: t`Then ${math`a = l b = l (k a) = (l k) a`}.`, plain: t`Replace ${mb} in ${math`a = lb`} by ${math`ka`}.` },
        {
          label: t`Cancel ${ma}`, text: t`Since ${math`a > ${0}`}, ${math`a \neq ${0}`}, so dividing by ${ma} gives ${math`${1} = l k`}.`,
          plain: t`Cancelling is dividing, and dividing is allowed because ${ma} is not zero.`,
          why: { q: t`Why does it matter that ${ma} is not zero?`, a: t`With ${math`a = ${0}`}, the line ${math`${0} = (lk) \cdot ${0}`} holds for every ${mk} and ${math`l`}, so it tells us nothing about them. That is why the theorem asks for positive integers.` },
        },
        { label: t`Both witnesses are positive`, text: t`${math`b = ka`} with ${ma} and ${mb} positive, so ${mk} is positive: ${math`k \geq ${1}`}. Likewise ${math`l \geq ${1}`}.`, plain: t`A positive number times ${mk} is positive only if ${mk} is positive, and a positive integer is at least ${1}.` },
        { label: t`Conclude`, text: t`If either were ${2} or more, ${math`lk \geq ${2}`}; so ${math`k = l = ${1}`}, and ${math`b = ${1} \cdot a = a`}.`, plain: t`Two whole numbers, each at least ${1}, with product ${1}, must both be ${1}.` },
      ],
    },
    {
      kind: 'pitfall',
      claim: t`For any integers, if ${math`a \mid b`} and ${math`b \mid a`}, then ${math`a = b`}.`,
      counterexample: t`${math`a = ${3}`}, ${math`b = ${-3}`}: each divides the other, with witness ${math`${-1}`}, yet ${math`${3} \neq ${-3}`}. Without positivity, the conclusion is only ${math`a = \pm b`}.`,
    },
    { kind: 'section', title: t`Whole families at once` },
    { kind: 'narrative', text: t`STEP Support Assignment ${12} asks a different kind of question: is ${math`n^{${3}} - n`} divisible by ${6} for every integer ${mn}? Try a few: ${cube3(2)}, ${cube3(3)}, ${cube3(4)}, ${cube3(5)}. All multiples of ${6}. To prove it for every ${mn}, factorise.` },
    {
      kind: 'p',
      text: t`${math`n^{${3}} - n = n(n^{${2}} - ${1}) = (n - ${1}) n (n + ${1})`}: three integers in a row. Among any three in a row, one is a multiple of ${3}, and at least one is even. So the product is divisible by ${2} and by ${3}, and so by ${6}.`,
      why: { q: t`Why does divisible by ${2} and by ${3} give divisible by ${6}?`, a: t`That is the notes' Theorem ${19}, worked in full in the examples: if ${math`n = ${2}i`} and ${math`n = ${3}j`}, then ${math`n = ${6}(i - j)`}. It works because ${2} and ${3} share no factor; divisible by ${2} and by ${4} does not give divisible by ${8}, as ${4} shows.` },
    },
    { kind: 'p', text: t`And ${6} is the largest number that always works: at ${math`n = ${2}`} the value is ${math`${2}^{${3}} - ${2} = ${cube3(2)}`}, and nothing bigger than ${6} divides ${6}. One small case caps the answer.` },
    { kind: 'takeaway', text: t`${math`d \mid n`} means ${math`n = kd`} for an integer ${mk}; a divisibility proof unpacks each assumption into a named witness and builds the witness for the conclusion.` },
  ],
  examples: [
    { ...theorem19, examiner: t`An arbitrary ${mn} fixed first, both directions labelled, and the backward witness ${math`i - j`} checked by the one-line computation, not just asserted.` },
    workedCambridge(a12q1iii),
    worked(quotientWitness, { kind: 'transitive', a: 3, b: 4, c: 5, d: 2 }, t`The witness for transitivity`),
    worked(largestDivisor, { i: 2 }, t`The largest divisor of ${math`n^{${3}} - n`}`),
  ],
  generators: [quotientWitness, largestDivisor, zeroAndSigns],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['divides'],
  cambridge: withUses([sheet121a, sheet121b, bop619, bop420, sheet124, sheet126, bop411, a12q1iv, sw122, sw127, prop18], {
    'notes-72-prop18': { sections: ['Proofs find the witness'], note: t`Proving and using a "for all" about congruences`, needs: ['logic.iff'] },
    'sw-1-2-7': { sections: ['Proofs find the witness'], note: t`Both directions of a divisibility equivalence`, needs: ['logic.iff'] },
    'sw-1-2-2': { sections: ['Proofs find the witness'], note: t`Both directions of a divisibility equivalence`, needs: ['logic.iff'] },
    'a12-q1-iv': { sections: ['Whole families at once'], note: t`A divisibility claim for every power, and a counterexample to a tempting argument` },
    'sheet-1-2-6': { sections: ['Proofs find the witness'], note: t`Proving divisibility facts from the definition, then combining them` },
    'sheet-1-2-4': { sections: ['Proofs find the witness'], note: t`Naming the witness in a transitivity proof` },
  }),
  // STEP Support Q1(iv) first: it needs a correct proof and a counterexample to a tempting one.
  // Then the supervision proofs. The two parts of 1.2.1 are left out: a one-word answer can be guessed.
  gate: ['a12-q1-iv', 'sheet-1-2-6', 'sheet-1-2-4'],
  recall: [
    { front: t`Define ${math`d \mid n`}.`, back: t`There is an integer ${mk} with ${math`n = k \cdot d`}.` },
    { front: t`Which integers divide ${0}? Which does ${0} divide?`, back: t`Every integer divides ${0}. ${0} divides only ${0}.` },
    { front: t`How do you prove ${math`d \mid n`}?`, back: t`Find an integer ${mk} with ${math`n = k \cdot d`}, built from the witnesses of the assumptions.` },
    { front: t`If ${math`a \mid b`} and ${math`b \mid a`} for positive ${ma}, ${mb}, then?`, back: t`${math`a = b`}. For any integers, ${math`a = \pm b`}.` },
  ],
  proofOrder: [
    {
      title: t`Positive integers that divide each other are equal`,
      steps: [
        t`Write ${math`b = ka`} and ${math`a = lb`} for integers ${mk} and ${math`l`}.`,
        t`Substitute: ${math`a = (lk) a`}.`,
        t`${ma} is not zero, so ${math`lk = ${1}`}.`,
        t`${mk} and ${math`l`} are positive integers, so both are ${1}, and ${math`a = b`}.`,
      ],
    },
  ],
};
