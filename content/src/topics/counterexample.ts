/**
 * proof.counterexample: Disproof by counterexample: a claim about every case is false as
 * soon as one case fails, and for "if A then B" the case must make A true and B false. The
 * lesson follows the TMUA notes on disproof by counterexample (page 70: "all prime numbers
 * are odd"; "if x < y then x^2 < y^2") and the commentary in the CST 2023-24 official
 * solutions to Exercises 1 (sanity-check first; a counterexample must be shown to be one,
 * and must fall under the statement). The problems are TMUA Exercise P and supervision
 * exercises 1.1.1, 1.2.5, 1.2.9, and 2.2.1, checked against the official solutions. Logic and
 * Proof Exercise 12 with reasons (lp-ex-12-why) moved here from Nested quantifiers (Rule 1,
 * 2026-10-08): a counterexample for each axiom that fails.
 */
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { int, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mx, my] = [math`n`, math`x`, math`y`];
function isPrime(n: number): boolean {
  if (n < 2 || !Number.isSafeInteger(n)) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));

// ---------------------------------------------------------------- if A then B, for two integers

interface Cond2 { text: Rich; hyp: (x: number, y: number) => boolean; concl: (x: number, y: number) => boolean }
const CONDS: readonly Cond2[] = [
  { text: t`if ${math`x < y`} then ${math`x^{${2}} < y^{${2}}`}`, hyp: (x, y) => x < y, concl: (x, y) => x * x < y * y },
  { text: t`if ${math`x^{${2}} = y^{${2}}`} then ${math`x = y`}`, hyp: (x, y) => x * x === y * y, concl: (x, y) => x === y },
  { text: t`if ${math`x + y`} is even then ${mx} and ${my} are both even`, hyp: (x, y) => (x + y) % 2 === 0, concl: (x, y) => x % 2 === 0 && y % 2 === 0 },
  { text: t`if ${math`xy`} is a multiple of ${4} then ${mx} or ${my} is a multiple of ${4}`, hyp: (x, y) => (x * y) % 4 === 0, concl: (x, y) => x % 4 === 0 || y % 4 === 0 },
  { text: t`if ${math`x > y`} then ${math`x^{${2}} > y^{${2}}`}`, hyp: (x, y) => x > y, concl: (x, y) => x * x > y * y },
  { text: t`if ${math`x^{${2}} > y^{${2}}`} then ${math`x > y`}`, hyp: (x, y) => x * x > y * y, concl: (x, y) => x > y },
  { text: t`if ${mx} divides ${math`y^{${2}}`} then ${mx} divides ${my}`, hyp: (x, y) => x !== 0 && (y * y) % x === 0, concl: (x, y) => x !== 0 && y % x === 0 },
  { text: t`if ${math`x + y`} is prime then ${mx} or ${my} is prime`, hyp: (x, y) => isPrime(x + y), concl: (x, y) => isPrime(x) || isPrime(y) },
];
const R2 = upTo(21).map((k) => k - 11);
const pairs = R2.flatMap((x) => R2.map((y) => [x, y] as const));
const firstPair = (f: (x: number, y: number) => boolean): readonly [number, number] => {
  // Small numbers first, so the examples read simply.
  const sorted = [...pairs].sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
  return sorted.find(([x, y]) => f(x, y)) as readonly [number, number];
};

interface CondP { i: number }

const conditional = generator<CondP>({
  id: 'conditional',
  skill: 'Disprove "if A then B" about two integers: find values that make A true and B false.',
  params: (rng) => ({ i: int(rng, 0, CONDS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < CONDS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const c = CONDS[i] as Cond2;
    const [x, y] = firstPair((a, b) => c.hyp(a, b) && !c.concl(a, b));
    return {
      prompt: t`Find integers ${mx} and ${my} that are a [[counterexample|counterexample]] to: ${c.text}.`,
      answer: {
        kind: 'witness', count: 2, names: ['x', 'y'], example: `${x}, ${y}`,
        check: ([a, b]) => {
          const xa = big(a);
          const yb = big(b);
          if (xa === null || yb === null) return 'Give two integers.';
          if (!c.hyp(xa, yb)) return `With x = ${xa}, y = ${yb} the "if" part is false, so the statement says nothing there. A counterexample needs the "if" part true.`;
          return c.concl(xa, yb) ? `With x = ${xa}, y = ${yb} the "then" part is true as well, so the statement holds there.` : null;
        },
      },
      solution: [
        t`A counterexample to "if A then B" must make A true and B false: that is the only way an implication fails.`,
        t`Try small integers, negative ones too. ${math`x = ${x}`}, ${math`y = ${y}`}: the "if" part holds and the "then" part fails, so the statement is false.`,
      ],
    };
  },
  solve: ({ i }) => {
    const c = CONDS[i] as Cond2;
    const found = pairs.find(([x, y]) => c.hyp(x, y) && !c.concl(x, y));
    return found === undefined ? '?' : `x = ${found[0]}, y = ${found[1]}`;
  },
  misconceptions: ({ i }): Misconception[] => {
    const c = CONDS[i] as Cond2;
    const [hx, hy] = firstPair((a, b) => !c.hyp(a, b));
    const [bx, by] = firstPair((a, b) => c.hyp(a, b) && c.concl(a, b));
    return [
      { response: `x = ${hx}, y = ${hy}`, why: t`There the "if" part is false, and an implication with a false "if" part is true. A counterexample needs the "if" part true and the "then" part false.` },
      { response: `x = ${bx}, y = ${by}`, why: t`There both parts are true, so the statement holds for these values. Look for values where the "then" part fails.` },
    ];
  },
});

// ---------------------------------------------------------------- "for every n" claims

interface Claim { text: Rich; holds: (n: number) => boolean; from: number }
const CLAIMS: readonly Claim[] = [
  { text: t`${math`n^{${2}} + n + ${41}`} is prime`, holds: (n) => isPrime(n * n + n + 41), from: 1 },
  { text: t`${math`n^{${2}} - n + ${11}`} is prime`, holds: (n) => isPrime(n * n - n + 11), from: 1 },
  { text: t`${math`n^{${2}} + n + ${17}`} is prime`, holds: (n) => isPrime(n * n + n + 17), from: 1 },
  { text: t`${math`${6}n - ${1}`} is prime`, holds: (n) => isPrime(6 * n - 1), from: 1 },
  { text: t`${math`${2}^{n} > n^{${2}}`}`, holds: (n) => 2 ** n > n * n, from: 1 },
  { text: t`${math`n^{${2}} + ${1}`} is not a multiple of ${5}`, holds: (n) => (n * n + 1) % 5 !== 0, from: 1 },
  { text: t`${math`${2}^{n} + ${1}`} is prime`, holds: (n) => isPrime(2 ** n + 1), from: 1 },
  { text: t`${math`n^{${2}} + n + ${11}`} is prime`, holds: (n) => isPrime(n * n + n + 11), from: 1 },
  { text: t`${math`n^{${2}} - n + ${17}`} is prime`, holds: (n) => isPrime(n * n - n + 17), from: 1 },
];
/** The smallest n at or after `from` where the claim fails. Every claim fails before 60. */
const firstFail = (c: Claim): number => upTo(60).find((n) => n >= c.from && !c.holds(n)) as number;
/** The smallest positive n where the claim fails. */
const smallest = (c: Claim): number => upTo(60).find((n) => !c.holds(n)) as number;

interface ClaimP { i: number }

const smallestFail = generator<ClaimP>({
  id: 'smallest-counterexample',
  skill: 'Test a claim about every positive integer case by case, and find its smallest counterexample.',
  params: (rng) => ({ i: int(rng, 0, CLAIMS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < CLAIMS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const c = CLAIMS[i] as Claim;
    const n = smallest(c);
    const ok = upTo(n - 1);
    return {
      prompt: t`Claim: for every positive integer ${mn}, ${c.text}. The claim is false. What is the smallest positive integer ${mn} for which it fails?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        ok.length === 0 ? t`It already fails at ${math`n = ${1}`}.` : t`Check ${math`n = ${1}, \ldots, ${n - 1}`} in turn: the claim holds for each.`,
        t`At ${math`n = ${n}`} it fails, so ${n} is the smallest counterexample. Holding for many cases proves nothing: one failure disproves a "for every" claim.`,
      ],
    };
  },
  solve: ({ i }) => {
    const c = CLAIMS[i] as Claim;
    let n = 1;
    while (c.holds(n)) n++;
    return String(n);
  },
  misconceptions: ({ i }): Misconception[] => {
    const c = CLAIMS[i] as Claim;
    const n = smallest(c);
    const out: Misconception[] = [{ response: String(n + 1), why: t`Check the numbers before it too: the claim already fails at ${math`n = ${n}`}.` }];
    if (n > 1) out.push({ response: String(n - 1), why: t`At ${math`n = ${n - 1}`} the claim still holds. The first failure comes one later.` });
    else out.push({ response: String(firstFail({ ...c, from: n + 1 })), why: t`That is a counterexample, but not the smallest: the claim fails at ${math`n = ${n}`} already.` });
    return out;
  },
});

// ---------------------------------------------------------------- one counterexample to a "for every n" claim

const anyFail = generator<ClaimP>({
  id: 'any-counterexample',
  skill: 'Disprove a claim about every positive integer by exhibiting one n where it fails, and check that it really fails.',
  params: (rng) => ({ i: int(rng, 0, CLAIMS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < CLAIMS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const c = CLAIMS[i] as Claim;
    const n = smallest(c);
    return {
      prompt: t`Disprove: for every positive integer ${mn}, ${c.text}. Give one ${mn}, at most ${40}, for which it fails.`,
      answer: {
        kind: 'witness', count: 1, names: ['n'], example: String(n),
        check: ([v]) => {
          const k = big(v);
          if (k === null || k < 1) return 'Give a positive integer n.';
          if (k > 40) return 'Give a smaller n, at most 40: there is one.';
          return c.holds(k) ? `At n = ${k} the claim holds, so it is not a counterexample.` : null;
        },
      },
      solution: [t`Try ${math`n = ${1}, ${2}, ${3}, \ldots`} until the claim fails. At ${math`n = ${n}`} it does: one counterexample is enough to disprove a "for every" claim.`],
    };
  },
  solve: ({ i }) => `n = ${smallest(CLAIMS[i] as Claim)}`,
  misconceptions: ({ i }): Misconception[] => {
    const c = CLAIMS[i] as Claim;
    const goods = upTo(12).filter((n) => c.holds(n));
    return [
      { response: `n = ${goods[0] as number}`, why: t`The claim holds at ${math`n = ${goods[0] as number}`}. A counterexample is a value where it fails.` },
      { response: `n = ${goods[1] as number}`, why: t`The claim holds at ${math`n = ${goods[1] as number}`}. Keep trying until it fails.` },
      { response: 'n = 0', why: t`${0} is not a positive integer, so it is not covered by the claim. A counterexample must fall under the statement.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const tmuaExample = auto({
  id: 'tmua-p70',
  source: cite('tmua-logic-proof', 'Disproof by counterexample, page 70, the second example'),
  title: t`If ${math`x < y`} then ${math`x^{${2}} < y^{${2}}`}?`,
  prompt: t`Find a counterexample to the statement: if ${math`x < y`} then ${math`x^{${2}} < y^{${2}}`}. Give real numbers ${mx} and ${my}.`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: '-2, 1',
    check: ([a, b]) => {
      if (a === undefined || b === undefined) return 'Give two numbers.';
      // Exact, for fractions too: x < y and x^2 >= y^2.
      const lt = a.num * b.den < b.num * a.den;
      const sqGe = a.num * a.num * b.den * b.den >= b.num * b.num * a.den * a.den;
      if (!lt) return 'For a counterexample x must be less than y: the "if" part must be true.';
      return sqGe ? null : 'Here x squared is less than y squared, so the statement holds for these values.';
    },
  },
  solution: [
    t`The notes: to disprove "if A then B", find values that make A true and B false. Here: ${math`x < y`} but ${math`x^{${2}} \ge y^{${2}}`}.`,
    t`Squaring a negative number can make it bigger than a positive one: ${math`x = -${2}`}, ${math`y = ${1}`} gives ${math`-${2} < ${1}`} and ${math`${4} \ge ${1}`}.`,
  ],
  reference: 'x = -2, y = 1',
  verify: () => {
    // Among integer pairs from -5 to 5, the counterexamples are exactly those with x < y and |x| >= |y|; there are some.
    const r = upTo(11).map((k) => k - 6);
    const ce = r.flatMap((x) => r.filter((y) => x < y && x * x >= y * y).map((y) => [x, y]));
    return ce.length > 0 && ce.every(([x, y]) => Math.abs(x as number) >= Math.abs(y as number)) ? null : 'counterexample search';
  },
  misconceptions: [
    { response: 'x = 1, y = 2', why: t`Here ${math`x^{${2}} = ${1} < ${4} = y^{${2}}`}: the statement holds. Try a negative ${mx}.` },
    { response: 'x = 2, y = -3', why: t`Here ${math`x > y`}, so the "if" part is false and the statement says nothing.` },
  ],
  official: { source: cite('tmua-logic-proof', 'page 70'), answer: 'x = -2, y = 1', agrees: true },
});

function witnessProblem(o: {
  id: string; doc: 'cst-dm-sw1' | 'tmua-logic-proof'; at: string; adapted?: boolean; title: Rich; prompt: Rich; names: readonly string[]; example: string;
  check: (vals: readonly number[]) => string | null; steps: Rich[]; verify: () => string | null; wrong: readonly { response: string; why: Rich }[];
  official?: { doc: 'cst-dm-sols-2324-1' | 'cst-dm-sols-2324-2'; at: string; answer: string };
  hints: Rich[]; nudge: Rich;
}): AutoProblem {
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite(o.doc, o.at, o.adapted === true),
    title: o.title,
    prompt: o.prompt,
    answer: {
      kind: 'witness', count: o.names.length, names: o.names, example: o.example,
      check: (vs) => {
        const ns = vs.map(big);
        if (ns.some((x) => x === null) || ns.length !== o.names.length) return `Give ${o.names.length === 1 ? 'a whole number' : `${o.names.length} whole numbers`}: ${o.names.join(', ')}.`;
        return o.check(ns as number[]);
      },
    },
    hints: o.hints,
    nudge: o.nudge,
    solution: o.steps,
    reference: o.names.map((nm, k) => `${nm} = ${o.example.split(',')[k]?.trim() ?? ''}`).join(', '),
    verify: o.verify,
    misconceptions: o.wrong,
  };
  if (o.official !== undefined) spec.official = { source: cite(o.official.doc, o.official.at), answer: o.official.answer, agrees: true };
  return auto(spec);
}

const sw111 = witnessProblem({
  id: 'sw-1-1-1', doc: 'cst-dm-sw1', at: 'Exercises 1, 1.1.1',
  title: t`Not prime, then ${math`${2}n + ${13}`} not prime?`,
  prompt: t`Prove or disprove: suppose ${mn} is a natural number larger than ${2}, and ${mn} is not a prime number. Then ${math`${2}n + ${13}`} is not a prime number. (It is false: give a counterexample ${mn}.)`,
  names: ['n'], example: '8',
  check: ([n]) => {
    const k = n as number;
    if (k <= 2) return 'n must be larger than 2.';
    if (isPrime(k)) return `${k} is prime, so the statement does not cover it.`;
    return isPrime(2 * k + 13) ? null : `2n + 13 = ${2 * k + 13} is not prime, so the statement holds here.`;
  },
  steps: [
    t`A counterexample is an ${mn} larger than ${2}, not prime, with ${math`${2}n + ${13}`} prime. Try the non-primes ${math`${4}, ${6}, ${8}, \ldots`}: ${math`n = ${4}`} gives ${21}, ${math`n = ${6}`} gives ${25}, ${math`n = ${8}`} gives ${29}, which is prime.`,
    t`So ${math`n = ${8}`} disproves the statement. The official solution uses ${math`n = ${9}`}, which gives ${31}, also prime: any one counterexample will do, as long as it is checked.`,
    t`A counterexample meets every hypothesis and breaks the conclusion; check both.`,
  ],
  hints: [
    t`Which values of ${mn} does the statement cover?`,
    t`For a counterexample, what must be true of ${math`${2}n + ${13}`}?`,
    t`Testing the covered values of ${mn} in order, which is the first that works?`,
  ],
  nudge: t`Not quite. A counterexample must satisfy the hypothesis, larger than ${2} and not prime, and break the conclusion.`,
  verify: () => {
    const ce = upTo(40).filter((n) => n > 2 && !isPrime(n) && isPrime(2 * n + 13));
    return same('the counterexamples below 16', ce.filter((n) => n < 16).join(), '8,9,12,14,15');
  },
  wrong: [
    { response: 'n = 7', why: t`${7} is prime, so the statement says nothing about it: it covers only ${mn} that are not prime.` },
    { response: 'n = 6', why: t`${math`${2} \times ${6} + ${13} = ${25}`} is not prime, so the statement holds at ${6}.` },
  ],
  official: { doc: 'cst-dm-sols-2324-1', at: '1.1.1', answer: 'n = 9' },
});

const sw125 = witnessProblem({
  id: 'sw-1-2-5', doc: 'cst-dm-sw1', at: 'Exercises 1, 1.2.5',
  title: t`${math`m \mid k`} and ${math`n \mid k`}, but not ${math`mn \mid k`}`,
  prompt: t`Find a counterexample to the statement: for all positive integers ${math`k, m, n`}, ${math`(m \mid k \land n \mid k) \Rightarrow (m \cdot n) \mid k`}. Give ${math`k`}, ${math`m`}, and ${mn}.`,
  names: ['k', 'm', 'n'], example: '2, 2, 2',
  check: ([k, m, n]) => {
    const [a, b, c] = [k as number, m as number, n as number];
    if (a < 1 || b < 1 || c < 1) return 'k, m, n must be positive integers.';
    if (a % b !== 0 || a % c !== 0) return 'The "if" part needs m and n both to divide k.';
    return a % (b * c) === 0 ? `${b * c} divides ${a}, so the statement holds here.` : null;
  },
  steps: [
    t`Take ${math`k = m = n = ${2}`}: ${math`${2} \mid ${2}`} twice, so the "if" part holds, yet ${math`${2} \cdot ${2} = ${4}`} does not divide ${2}.`,
    t`As the official solution stresses, say why it is a counterexample, not only what it is.`,
    t`Shared factors break the product rule for divisibility.`,
  ],
  hints: [
    t`What must hold of ${math`k`}, ${math`m`}, and ${mn} for the "if" part to be true?`,
    t`When can ${math`mn`} fail to divide ${math`k`} even though ${math`m`} and ${mn} both do?`,
    t`What happens when ${math`m`} and ${mn} share a factor?`,
  ],
  nudge: t`Not quite. Try ${math`m`} and ${mn} with a common factor; coprime choices always make the statement hold.`,
  verify: () => same('k = m = n = 2 is a counterexample', 2 % 2 === 0 && 2 % 4 !== 0, true),
  wrong: [
    { response: 'k = 6, m = 2, n = 3', why: t`${2} and ${3} divide ${6}, and so does ${6}: the statement holds here. Try ${math`m`} and ${mn} sharing a factor.` },
    { response: 'k = 4, m = 3, n = 2', why: t`${3} does not divide ${4}, so the "if" part is false.` },
  ],
  official: { doc: 'cst-dm-sols-2324-1', at: '1.2.5', answer: 'k = 2, m = 2, n = 2' },
});

const sw129 = witnessProblem({
  id: 'sw-1-2-9', doc: 'cst-dm-sw1', at: 'Exercises 1, 1.2.9',
  title: t`${math`k \mid mn`}, but ${math`k`} divides neither`,
  prompt: t`Prove or disprove: for all positive integers ${math`k, m, n`}, ${math`k \mid (m \cdot n) \Rightarrow (k \mid m \lor k \mid n)`}. It is false: give a counterexample ${math`k`}, ${math`m`}, ${mn}.`,
  names: ['k', 'm', 'n'], example: '4, 2, 2',
  check: ([k, m, n]) => {
    const [a, b, c] = [k as number, m as number, n as number];
    if (a < 1 || b < 1 || c < 1) return 'k, m, n must be positive integers.';
    if ((b * c) % a !== 0) return `${a} does not divide ${b * c}, so the "if" part is false.`;
    return b % a === 0 || c % a === 0 ? `${a} divides ${b % a === 0 ? b : c}, so the "then" part holds.` : null;
  },
  steps: [
    t`Take ${math`k = ${4}`}, ${math`m = n = ${2}`}: ${math`${4} \mid ${4}`}, yet ${4} divides neither ${2} nor ${2}.`,
    t`It does hold when ${math`k`} is prime (that is Euclid's lemma, a later topic), so a counterexample must use a ${math`k`} that is not prime.`,
    t`A composite divisor can split between the factors; a prime cannot.`,
  ],
  hints: [
    t`For which kind of ${math`k`} might ${math`k \mid mn`} force ${math`k \mid m`} or ${math`k \mid n`}?`,
    t`So what kind of ${math`k`} must a counterexample use?`,
    t`With such a ${math`k`}, how can its factors be split between ${math`m`} and ${mn}?`,
  ],
  nudge: t`Not quite. Split a composite ${math`k`} between ${math`m`} and ${mn}.`,
  verify: () => {
    // No prime k below 30 has a counterexample with m, n below 30; k = 4 does.
    for (const k of upTo(29).filter(isPrime)) for (const m of upTo(29)) for (const n of upTo(29)) if ((m * n) % k === 0 && m % k !== 0 && n % k !== 0) return `prime ${k}`;
    return same('k = 4, m = n = 2', 4 % 4 === 0 && 2 % 4 !== 0, true);
  },
  wrong: [
    { response: 'k = 3, m = 6, n = 1', why: t`${3} divides ${6}, so the "then" part holds.` },
    { response: 'k = 5, m = 2, n = 2', why: t`${5} does not divide ${4}, so the "if" part is false.` },
  ],
  official: { doc: 'cst-dm-sols-2324-1', at: '1.2.9', answer: 'k = 4, m = 2, n = 2' },
});

/** i^k mod m, exactly. */
const powMod = (i: number, k: number, m: number): number => {
  let r = 1n;
  for (let j = 0; j < k; j++) r = (r * BigInt(i)) % BigInt(m);
  return Number(((r % BigInt(m)) + BigInt(m)) % BigInt(m));
};
const sw221 = witnessProblem({
  id: 'sw-2-2-1', doc: 'cst-dm-sw1', at: 'Exercises 2, 2.2.1',
  title: t`Congruent exponents, different powers`,
  prompt: t`Here ${math`a \equiv b \pmod{m}`} means ${math`m`} divides ${math`a - b`}. Find an integer ${math`i`}, natural numbers ${math`k`} and ${math`l`}, and a positive integer ${math`m`} for which ${math`k \equiv l \pmod{m}`} holds while ${math`i^{k} \equiv i^{l} \pmod{m}`} does not. Give ${math`i`}, ${math`k`}, ${math`l`}, ${math`m`}, with ${math`k`} and ${math`l`} at most ${60}.`,
  names: ['i', 'k', 'l', 'm'], example: '2, 0, 3, 3',
  check: ([i, k, l, m]) => {
    const [a, b, c, d] = [i as number, k as number, l as number, m as number];
    if (b < 0 || c < 0 || b > 60 || c > 60) return 'k and l must be natural numbers, at most 60.';
    if (d < 1) return 'm must be a positive integer.';
    if ((b - c) % d !== 0) return `${b} and ${c} are not congruent modulo ${d}.`;
    return powMod(a, b, d) === powMod(a, c, d) ? `${a} to the ${b} and ${a} to the ${c} leave the same remainder, ${powMod(a, b, d)}, modulo ${d}.` : null;
  },
  steps: [
    t`Exponents do not work modulo ${math`m`}. The official solution takes ${math`i = ${2}`}, ${math`k = ${0}`}, ${math`l = ${3}`}, ${math`m = ${3}`}: ${math`${0} \equiv ${3} \pmod{${3}}`}, yet ${math`${2}^{${0}} = ${1}`} and ${math`${2}^{${3}} = ${8}`} leave remainders ${1} and ${2}.`,
    t`Exponents do not reduce modulo ${math`m`}.`,
  ],
  hints: [
    t`What must ${math`k`} and ${math`l`} satisfy, and what must ${math`i^{k}`} and ${math`i^{l}`} fail to satisfy?`,
    t`Which small modulus ${math`m`}, and which small exponents congruent modulo ${math`m`}, are worth trying?`,
    t`Is ${math`i = ${1}`} any use, or is an ${math`i`} whose powers change modulo ${math`m`} needed?`,
  ],
  nudge: t`Not quite. Exponents do not reduce modulo ${math`m`}; try small numbers with ${math`i \ne ${1}`}.`,
  verify: () => same('2^0 and 2^3 modulo 3', [powMod(2, 0, 3), powMod(2, 3, 3), (0 - 3) % 3 === 0].join(), '1,2,true'),
  wrong: [
    { response: 'i = 1, k = 0, l = 3, m = 3', why: t`Every power of ${1} is ${1}, so the powers agree. Try ${math`i = ${2}`}.` },
    { response: 'i = 2, k = 1, l = 2, m = 3', why: t`${1} and ${2} are not congruent modulo ${3}: the "if" part fails.` },
  ],
  official: { doc: 'cst-dm-sols-2324-2', at: '2.2.1', answer: 'i = 2, k = 0, l = 3, m = 3' },
});

/** TMUA Exercise P, question 2, parts (a) to (e): positive whole numbers x, and the statement as a predicate on x. */
function tmuaP2(o: { part: string; title: Rich; statement: Rich; holds: (x: number) => boolean; covers?: (x: number) => boolean; example: string; steps: Rich[]; wrong: readonly { response: string; why: Rich }[]; hints: Rich[]; nudge: Rich }): AutoProblem {
  return witnessProblem({
    id: `tmua-p-2-${o.part}`, doc: 'tmua-logic-proof', at: `Exercise P, question 2(${o.part})`, adapted: true,
    title: o.title,
    prompt: t`Find a counterexample to: ${o.statement}. Here ${mx} is a positive whole number; give one ${mx}.`,
    names: ['x'], example: o.example,
    check: ([x]) => {
      const k = x as number;
      if (k < 1 || k > 500) return 'Give a positive whole number up to 500.';
      if (o.covers !== undefined && !o.covers(k)) return `The statement is not about ${k}.`;
      return o.holds(k) ? `The statement holds for ${k}.` : null;
    },
    steps: o.steps,
    hints: o.hints,
    nudge: o.nudge,
    verify: () => {
      const ce = upTo(500).filter((x) => (o.covers?.(x) ?? true) && !o.holds(x));
      return ce.includes(Number(o.example)) ? null : `${o.example} is not a counterexample`;
    },
    wrong: o.wrong,
  });
}
const odd = (x: number): boolean => x % 2 === 1;
const p2a = tmuaP2({
  part: 'a', title: t`Odd and greater than ${4}`,
  statement: t`all prime numbers are odd and greater than ${4}`,
  covers: isPrime, holds: (x) => odd(x) && x > 4, example: '2',
  steps: [
    t`A counterexample to "all primes are A and B" is a prime that fails A or fails B: one failure is enough. ${2} is even; ${3} is not greater than ${4}. Either works.`,
    t`To break an "and", one failure is enough.`,
  ],
  hints: [
    t`Which numbers does the statement cover?`,
    t`Must a counterexample fail one of the two conditions, or both?`,
    t`Which primes are even, or at most ${4}?`,
  ],
  nudge: t`Not quite. A counterexample must be prime and fail at least one of the two conditions.`,
  wrong: [{ response: 'x = 9', why: t`${9} is not prime, so the statement is not about it.` }, { response: 'x = 5', why: t`${5} is prime, odd, and greater than ${4}: the statement holds for it.` }],
});
const p2b = tmuaP2({
  part: 'b', title: t`Odd or greater than ${37}`,
  statement: t`all prime numbers are odd or greater than ${37}`,
  covers: isPrime, holds: (x) => odd(x) || x > 37, example: '2',
  steps: [
    t`A counterexample to "A or B" must fail both: a prime that is even and at most ${37}. The only even prime is ${2}, so ${2} is the only counterexample.`,
    t`To break an "or", both parts must fail.`,
  ],
  hints: [
    t`Which numbers does the statement cover?`,
    t`What must a counterexample to an "or" fail?`,
    t`Which primes are even and at most ${37}?`,
  ],
  nudge: t`Not quite. To break an "or", a prime must fail both conditions at once.`,
  wrong: [{ response: 'x = 3', why: t`${3} is odd, so "odd or greater than ${37}" holds for it.` }, { response: 'x = 41', why: t`${41} is odd and greater than ${37}: the statement holds.` }],
});
const p2c = tmuaP2({
  part: 'c', title: t`Prime if and only if odd`,
  statement: t`${mx} is prime if and only if ${mx} is odd`,
  holds: (x) => isPrime(x) === odd(x), example: '9',
  steps: [
    t`An "if and only if" fails where one side holds and the other does not: a prime that is even (${2}), or an odd number that is not prime (${1}, ${9}, ${15}, ...).`,
    t`An "if and only if" fails where the two sides differ.`,
  ],
  hints: [
    t`When does an "if and only if" fail?`,
    t`Is there a prime that is not odd?`,
    t`Is there an odd number that is not prime?`,
  ],
  nudge: t`Not quite. An "if and only if" fails where exactly one side holds.`,
  wrong: [{ response: 'x = 7', why: t`${7} is prime and odd: both sides hold.` }, { response: 'x = 4', why: t`${4} is neither prime nor odd: both sides fail, so the "if and only if" holds.` }],
});
const p2d = tmuaP2({
  part: 'd', title: t`Odd only if prime`,
  statement: t`${mx} is odd only if ${mx} is prime`,
  holds: (x) => !odd(x) || isPrime(x), example: '9',
  steps: [
    t`"A only if B" is "if A then B": here, if ${mx} is odd then ${mx} is prime. A counterexample is odd and not prime: ${9}, or ${1}.`,
    t`"A only if B" means "if A, then B".`,
  ],
  hints: [
    t`What does "A only if B" mean, written as "if A, then B"?`,
    t`Which values of ${mx} make "if ${mx} is odd, then ${mx} is prime" false?`,
    t`Which odd numbers are not prime?`,
  ],
  nudge: t`Not quite. Rewrite "odd only if prime" as "if odd, then prime" first.`,
  wrong: [{ response: 'x = 2', why: t`${2} is even, so "if ${mx} is odd" is false and the statement holds.` }, { response: 'x = 11', why: t`${11} is odd and prime: the statement holds.` }],
});
const p2e = tmuaP2({
  part: 'e', title: t`Prime only if odd`,
  statement: t`${mx} is prime only if ${mx} is odd`,
  holds: (x) => !isPrime(x) || odd(x), example: '2',
  steps: [
    t`"Prime only if odd" is "if prime then odd". A counterexample is a prime that is not odd, and there is exactly one: ${2}.`,
    t`Rewrite "only if" with "if" and "then" before looking for a counterexample.`,
  ],
  hints: [
    t`What does "prime only if odd" mean, written with "if" and "then"?`,
    t`What must a counterexample be?`,
    t`Which primes are not odd?`,
  ],
  nudge: t`Not quite. Rewrite it as "if prime, then odd", then look for a prime that breaks it.`,
  wrong: [{ response: 'x = 9', why: t`${9} is not prime, so the "if" part is false and the statement holds. That would be a counterexample to the converse.` }, { response: 'x = 3', why: t`${3} is prime and odd: the statement holds.` }],
});

const p1 = supervision({
  id: 'tmua-p-1',
  source: cite('tmua-logic-proof', 'Exercise P, question 1'),
  title: t`What counts as a counterexample`,
  prompt: t`What would constitute a counterexample to a statement of the form (a) ${math`A`} and ${math`B`}; (b) ${math`A`} or ${math`B`}; (c) ${math`A`} only if ${math`B`}; (d) ${math`A`} iff ${math`B`}? For each, say which truth values of ${math`A`} and ${math`B`} a counterexample must give, and why.`,
  hints: [
    t`When is ${math`A`} and ${math`B`} false?`,
    t`When is ${math`A`} or ${math`B`} false?`,
    t`What are ${math`A`} only if ${math`B`} and ${math`A`} iff ${math`B`} as implications, and when is each false?`,
  ],
  writeUp: 'explanation',
});
const p2f = supervision({
  id: 'tmua-p-2-f',
  source: cite('tmua-logic-proof', 'Exercise P, question 2(f)'),
  title: t`Prime, or divisible by something smaller`,
  prompt: t`Find a counterexample, if one exists, to: for all positive odd integers ${mx}, ${mx} is prime or ${mx} is divisible by some integer ${math`k < x`}. Does the answer depend on whether ${math`k`} may be negative, or must be positive, or must be bigger than ${1}? Explain.`,
  hints: [
    t`Which positive odd integers are not prime?`,
    t`For ${math`x = ${1}`}, is there a positive integer ${math`k < x`} that divides ${mx}?`,
    t`If ${math`k`} may be negative, or must exceed ${1}, how does the answer for ${math`x = ${1}`} change?`,
  ],
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- Cambridge problems moved here (Rule 1, 2026-10-08)

// From Nested quantifiers, which set it before disproof by counterexample was taught. The prompt is
// the one beside the auto-checked verdicts there (lp-ex-12), written out in full.
/*
 * Outline for marking lp-ex-12-why (20 marks): for each of the 6 relations, the verdict on each
 * axiom (1 mark each, 18) with the reason: a counterexample for every failure (empty: 0 ~ 0 fails;
 * sum 100: 0 ~ 0 fails, then 0 ~ 100 and 100 ~ 0 without 0 ~ 0; x <= y: 0 <= 1 but not 1 <= 0) and a
 * line for every success (vacuous truth for the empty relation; x + z = (x + y) + (y + z) - 2y for
 * the even sums). 2 marks for saying why the empty relation passes (2) and (3) vacuously.
 */
const lp12Why = supervision({
  id: 'lp-ex-12-why',
  source: cite('cst-lp-notes', 'Section 4, Exercise 12 (page 11)'),
  title: t`Which axioms hold, with reasons`,
  prompt: t`Let ${math`\approx`} be a two-place predicate symbol, written ${math`x \approx y`}. Consider the axioms ${math`(${1})\ \forall x.\ x \approx x`}, ${math`(${2})\ \forall x\, y.\ (x \approx y \Rightarrow y \approx x)`}, and ${math`(${3})\ \forall x\, y\, z.\ (x \approx y \land y \approx z \Rightarrow x \approx z)`}. Let the universe be the set of natural numbers, ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}. Which axioms hold if ${math`\approx`} is interpreted as: the empty relation ${math`\varnothing`}; the universal relation ${math`\{(x, y) \mid x, y \in \mathbb{N}\}`}; the equality relation ${math`\{(x, x) \mid x \in \mathbb{N}\}`}; the relation ${math`\{(x, y) \mid x, y \in \mathbb{N} \land x + y \text{ is even}\}`}; the relation ${math`\{(x, y) \mid x, y \in \mathbb{N} \land x + y = ${100}\}`}; the relation ${math`\{(x, y) \mid x, y \in \mathbb{N} \land x \le y\}`}? For every axiom that fails give a counterexample, and for every axiom that holds say why.`,
  hints: [
    t`For each relation, what does axiom (${1}) require of every ${mx}?`,
    t`Which relations satisfy symmetry or transitivity vacuously, because the "if" part is never true?`,
    t`For ${math`x + y = ${100}`} and ${math`x \le y`}, which particular numbers break the axioms that fail?`,
  ],
  writeUp: 'proof',
});

const DB06 = 'stepdb-06-s1' as const;
// Rule 1 (2026-10-08): set here from ineq.linear-quadratic, the earliest topic that teaches everything it needs.
const db06q3 = supervision({
  id: 'step06-q3',
  source: cite(DB06, 'Q3(i), (ii)'),
  title: t`Sufficient, necessary, and both`,
  prompt: t`In this question ${math`b`} and ${math`c`} are real numbers. (i) By considering the graph ${math`y = x^{${2}} + bx + c`} show that ${math`c < ${0}`} is a sufficient condition for the equation ${math`x^{${2}} + bx + c = ${0}`} to have distinct real roots. Determine whether ${math`c < ${0}`} is a necessary condition for the equation to have distinct real roots. (ii) Determine necessary and sufficient conditions for the equation ${math`x^{${2}} + bx + c = ${0}`} to have distinct positive real roots.`,
  writeUp: 'proof',
  hints: [
    t`If ${math`c < ${0}`}, what is the value of ${math`x^{${2}} + bx + c`} at ${math`x = ${0}`}, and what does that force on the graph of an upward parabola?`,
    t`Is there an example with ${math`c > ${0}`} and two distinct real roots?`,
    t`For distinct positive roots, what must hold for the discriminant, for the sum of the roots ${math`-b`}, and for their product ${math`c`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const EULER = CLAIMS[0] as Claim;
const EF = firstFail(EULER);
const MERSENNE = 11;

export const counterexample: TopicContent = {
  topicId: 'proof.counterexample',
  goal: t`Disprove a claim about every case with one [[counterexample|counterexample]], chosen so the claim really fails there, and checked.`,
  objective: t`Disprove a claim about every case by finding one case where it fails, and checking it.`,
  why: t`Half of "prove or disprove" questions are false; one checked counterexample settles them.`,
  minutes: 10,
  lesson: [
    { kind: 'section', title: t`Forty successes, then a failure` },
    { kind: 'hook', text: t`Is ${math`n^{${2}} + n + ${41}`} always prime? Try ${math`n = ${1}`}: ${1 + 1 + 41}, prime. ${math`n = ${2}`}: ${4 + 2 + 41}, prime. Keep going and it stays prime all the way to ${math`n = ${EF - 1}`}. Then at ${math`n = ${EF}`} it is ${EF * EF + EF + 41}, which is ${math`${41}^{${2}}`}. ${EF - 1} successes proved nothing; one failure settled it.` },
    { kind: 'narrative', text: t`A claim about every case is fragile. To prove it you need an argument covering all cases at once. To kill it you need just one case where it fails, written down and checked. That case has a name.` },
    { kind: 'section', title: t`What a counterexample is` },
    {
      kind: 'definition',
      name: t`Counterexample`,
      formal: t`A [[counterexample|counterexample]] to the statement ${math`\forall x.\ P(x)`} is a value ${math`x_{${0}}`} for which ${math`P(x_{${0}})`} is false. Exhibiting one is a [[disproof|disproof]] of the statement.`,
      plain: t`"Every prime is odd" is disproved by ${2}, which is prime but even. It works because ${math`\lnot \forall x.\ P(x)`} is the same as ${math`\exists x.\ \lnot P(x)`}: to deny "always", find one exception.`,
    },
    { kind: 'theorem', statement: t`A value ${math`x_{${0}}`} is a counterexample to ${math`\forall x.\ (A(x) \Rightarrow B(x))`} exactly when ${math`A(x_{${0}})`} is true and ${math`B(x_{${0}})`} is false.` },
    { kind: 'p', text: t`An implication ${math`A \Rightarrow B`} is false only when ${math`A`} is true and ${math`B`} is false; in the other three rows of its truth table it is true. So a value with ${math`A`} false can never be a counterexample: the statement makes no promise there.` },
    { kind: 'p', text: t`Example: "if ${math`n`} is prime, then ${math`${2}^{n} - ${1}`} is prime". It holds for ${math`n = ${2}, ${3}, ${5}, ${7}`}. At ${math`n = ${MERSENNE}`}, which is prime, ${math`${2}^{${MERSENNE}} - ${1} = ${2 ** MERSENNE - 1} = ${23} \times ${89}`}. Hypothesis true, conclusion false: a counterexample.` },
    checkFrom(conditional, { i: 4 }, t`Take ${mx} larger than ${my} but smaller in size, with ${my} negative: then ${math`x > y`} holds and ${math`x^{${2}} > y^{${2}}`} fails.`),
    { kind: 'section', title: t`Compound statements` },
    { kind: 'p', text: t`What must a counterexample break? For "${math`A`} and ${math`B`}", just one of the parts. For "${math`A`} or ${math`B`}", both parts. For "${math`A`} if and only if ${math`B`}", it must make one side true and the other false. Each is read off from when the compound is false.` },
    checkFrom(anyFail, { i: 3 }, t`${math`${6}n - ${1}`} is prime for ${math`n = ${1}, ${2}, ${3}, ${4}, ${5}`}, but at ${math`n = ${6}`} it is ${35}, which is ${math`${5} \times ${7}`}.`),
    { kind: 'section', title: t`Writing it up` },
    { kind: 'p', text: t`The official solutions to the CST exercises insist on three habits. First, sanity-check a "prove or disprove" with a few small cases before trying to prove it: a false claim often fails early. Second, show that the counterexample is one: name the values and check them against the statement in full. Third, make sure it falls under the statement: for a claim about natural numbers "larger than ${2} and not prime", the number ${7} is no use, because it is prime. Edge cases such as ${0}, ${1}, ${2}, and negative numbers are often where claims fail.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`x = ${3}`}, ${math`y = ${2}`} is a counterexample to "if ${math`x < y`} then ${math`x^{${2}} < y^{${2}}`}", since ${math`x^{${2}} > y^{${2}}`}.`, counterexample: t`Here ${math`x < y`} is false, so the implication is true for these values. A counterexample needs ${math`x < y`} true too: ${math`x = -${2}`}, ${math`y = ${1}`}.` },
    { kind: 'pitfall', claim: t`A claim checked for a hundred cases is true.`, counterexample: t`${math`n^{${2}} + n + ${41}`} passes ${EF - 1} cases in a row and fails at ${EF}. Only a proof covers every case.` },
    { kind: 'takeaway', text: t`One checked case with the hypothesis true and the conclusion false disproves a "for all" claim; no number of successes proves one.` },
  ],
  examples: [
    { ...workedCambridge(tmuaExample), examiner: t`The examiner looks for values that make the hypothesis true and the conclusion false, both checked explicitly.` },
    worked(conditional, { i: 1 }, t`Equal squares`),
    worked(smallestFail, { i: 3 }, t`The first failure`),
  ],
  generators: [conditional, smallestFail, anyFail],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['disproof'],
  cambridge: withUses([sw111, sw125, sw129, sw221, p2a, p2b, p2c, p2d, p2e, p1, p2f, lp12Why, db06q3], {
    'step06-q3': { sections: ['What a counterexample is'], note: t`Conditions for distinct real roots, stated as necessary and sufficient`, needs: ['ineq.linear-quadratic', 'logic.iff'] },
    'lp-ex-12-why': { sections: ['What a counterexample is', 'Writing it up'], note: t`Checking reflexive, symmetric, and transitive axioms, with a counterexample for each failure`, needs: ['logic.nested-quantifiers'] },
    'sw-2-2-1': { sections: ['What a counterexample is'], note: t`Finding numbers that break a claim about powers` },
    'sw-1-1-1': { sections: ['What a counterexample is'], note: t`Finding a counterexample among non-primes` },
    'sw-1-2-9': { sections: ['What a counterexample is', 'Compound statements'], note: t`A counterexample to an implication with an "or"` },
    'sw-1-2-5': { sections: ['What a counterexample is', 'Compound statements'], note: t`A counterexample to an implication with an "and"` },
  }),
  gate: ['sw-2-2-1', 'sw-1-1-1', 'sw-1-2-9', 'sw-1-2-5'],
  recall: [
    { front: t`A counterexample to ${math`\forall x.\ (A(x) \Rightarrow B(x))`}.`, back: t`A value with ${math`A`} true and ${math`B`} false.` },
    { front: t`What must a counterexample to "${math`A`} or ${math`B`}" do?`, back: t`Make both ${math`A`} and ${math`B`} false.` },
  ],
};
