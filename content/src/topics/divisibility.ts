/**
 * num.divisibility: d | n means n = k d for an integer k; proofs about divisibility find
 * that k. The lesson follows the CST notes (Definition 12 on printed page 59; Theorem 19,
 * 6 | n iff 2 | n and 3 | n, pages 83 and 84; Theorem 23, transitivity, pages 98 and 99),
 * the 2023-24 official solutions to supervision exercises 1.2.1 to 1.2.7, STEP Support
 * Assignment 12 Q1 and its hints, and Book of Proof Section 4.2 with Chapter 4, exercises
 * 11 and 20, and Chapter 6, exercise 19.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample, upTo } from '../math';
import { gcd } from '../numbers';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { join, math, paren, t, type Rich, type Span } from '../rich';
import { worked, workedCambridge, workedProof, type TopicContent } from '../topic';

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
  solution: [
    t`${math`${0} \mid n`} means ${math`n = l \cdot ${0}`} for some integer ${math`l`}, so ${math`n = ${0}`}. Conversely ${math`${0} = ${0} \cdot ${0}`}, so ${math`${0} \mid ${0}`}.`,
    t`The only such integer is ${0}. Reading ${math`d \mid n`} as "${math`n / d`} is an integer" would wrongly rule out ${math`${0} \mid ${0}`}: the definition uses only multiplication.`,
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
  solution: [t`For every integer ${md}, ${math`${0} = ${0} \cdot d`}, so ${math`d \mid ${0}`}; this includes ${math`d = ${0}`}.`],
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
  solution: [
    t`Among five consecutive integers there is a multiple of ${5}, a multiple of ${3}, and two consecutive even numbers, one of them a multiple of ${4}. So the product is a multiple of ${math`${5} \times ${3} \times ${8} = ${120}`}.`,
    t`It is the largest: ${math`${1} \times ${2} \times ${3} \times ${4} \times ${5} = ${120}`} is itself such a product. Book of Proof's second proof: the product of ${mn} down to ${math`n - ${4}`} is ${math`${120}\binom{n}{${5}}`}.`,
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
  solution: [
    t`${math`a = ${0}`} works: ${math`${0} \mid ${0}`}. If ${math`a \ne ${0}`} and ${math`a = k a^{${2}}`}, cancel ${math`a`}: ${math`${1} = k a`}, so ${math`a`} divides ${1}, and ${math`a = ${1}`} or ${math`a = -${1}`}.`,
    t`So the integers are ${math`-${1}, ${0}, ${1}`}.`,
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
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.4'),
});
const sheet126 = supervision({
  id: 'sheet-1-2-6',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.6'),
  title: t`Sums, multiples, and combinations`,
  prompt: t`Prove that for all integers ${math`d, k, l, m, n`}: (a) ${math`d \mid m \land d \mid n \Rightarrow d \mid (m + n)`}; (b) ${math`d \mid m \Rightarrow d \mid k m`}; (c) ${math`d \mid m \land d \mid n \Rightarrow d \mid (k m + l n)`}. Prove (c) from (a) and (b) rather than from the definition.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.6'),
});
const bop411 = supervision({
  id: 'bop-4-11',
  source: cite('bop', 'Chapter 4, exercise 11'),
  title: t`Products of divisors`,
  prompt: t`Suppose ${math`a, b, c, d \in \mathbb{Z}`}. Prove that if ${math`a \mid b`} and ${math`c \mid d`}, then ${math`ac \mid bd`}.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 11'),
});
const a12q1iv = supervision({
  id: 'a12-q1-iv',
  source: cite('step-f12', 'Q1(iv)'),
  title: t`A tempting wrong argument`,
  prompt: t`Show that ${math`${2}^{${2}n} - ${1}`} is divisible by ${3} for every positive integer ${mn}. The hints warn against saying "${math`(${2}^{n} - ${1})(${2}^{n} + ${1})`} is a product of two consecutive odd numbers, so one is a multiple of ${3}": give a counterexample to that reasoning, and then a correct argument.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(iv)'),
});

// ---------------------------------------------------------------- lesson

export const divisibility: TopicContent = {
  topicId: 'num.divisibility',
  goal: t`Use the definition ${math`d \mid n \iff n = kd`} for an integer ${mk} to prove divisibility facts, by computing the witness ${mk}.`,
  lesson: [
    { kind: 'rule', text: t`[[divides|Divides]]: for integers ${md} and ${mn}, ${math`d \mid n`} when there is an integer ${mk} with ${math`n = k \cdot d`}. It is a statement about the pair, true or false, not an operation: ${math`${2} \mid ${4}`} is true and ${math`${4} \mid ${2}`} is false.` },
    { kind: 'p', text: t`The definition uses only multiplication, so zero needs no special rules: ${math`d \mid ${0}`} for every ${md}, since ${math`${0} = ${0} \cdot d`}; and ${math`${0} \mid n`} only when ${math`n = ${0}`}. Signs do not matter either, because ${mk} may be negative: ${math`-${3} \mid ${12}`}.` },
    { kind: 'p', text: t`A proof that ${math`d \mid n`} is a search for ${mk}. Using an assumption ${math`d \mid m`} means writing ${math`m = a d`} with a new name for the witness, as the notes do in Theorem ${23}: from ${math`m = i_{${0}} l`} and ${math`n = j_{${0}} m`}, the witness for ${math`l \mid n`} is ${math`j_{${0}} i_{${0}}`}.` },
    { kind: 'p', text: t`The same pattern gives the rules for combinations: if ${math`d \mid m`} and ${math`d \mid n`}, then ${math`km + ln = (ka + lb) d`}, so ${math`d \mid km + ln`}. And Theorem ${19}: if ${math`n = ${2}i = ${3}j`}, then ${math`n = ${6}(i - j)`}, so ${math`${6} \mid n`}.` },
    { kind: 'p', text: t`To show a whole family of numbers is divisible by something, factorise. STEP Support Assignment ${12}: ${math`n^{${3}} - n = (n - ${1})n(n + ${1})`} is three consecutive integers, so one is a multiple of ${3} and one is even, and ${math`${6} \mid n^{${3}} - n`}. Values for small ${mn} show nothing larger works: ${math`${2}^{${3}} - ${2} = ${6}`}.` },
  ],
  examples: [
    theorem19,
    workedCambridge(a12q1iii),
    worked(quotientWitness, { kind: 'transitive', a: 3, b: 4, c: 5, d: 2 }, t`The witness for transitivity`),
    worked(largestDivisor, { i: 2 }, t`The largest divisor of ${math`n^{${3}} - n`}`),
  ],
  generators: [quotientWitness, largestDivisor, zeroAndSigns],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['divides'],
  cambridge: [sheet121a, sheet121b, bop619, bop420, sheet124, sheet126, bop411, a12q1iv],
};
