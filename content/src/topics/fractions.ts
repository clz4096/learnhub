/**
 * pre.fractions: Fractions and ratios. No Cambridge source teaches fractions from the start,
 * so the explanation is written from scratch (decision 11); the STEP Support assignments
 * supply the habit they ask for (cancel before multiplying, answers in lowest terms) and the
 * problems: Assignment 6 Q1(i), first part, the gate, and Q4(i)(a), worked.
 *
 * The gate needs only this lesson: its section "Cancelling across a long product" teaches the
 * cancelling on a different product. The second part of Q1(i), the same product to n factors
 * and its written proof, needs algebra with n and a general argument, so it is in
 * alg.telescoping (2026-10-06).
 *
 * The second gate is the first paragraph of 2000 STEP II Q1: guess 1/N = 1/a + 1/b from two
 * examples and prove it, so that every unit fraction is a sum of two different ones. It needs
 * only adding fractions over a common denominator, with letters for the numbers. The rest of
 * the question factorises N^2 and needs primes, so it is not set.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, gcd, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, frac, math, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/** a/b + c/d the way a learner does it: over the lowest common multiple, then cancel. */
function addByHand(a: number, b: number, c: number, d: number): { L: number; x: number; y: number; sum: number; g: number } {
  const L = lcm(b, d);
  const x = a * (L / b);
  const y = c * (L / d);
  return { L, x, y, sum: x + y, g: gcd(x + y, L) };
}

const reduced = (n: number, d: number): string => {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
};

// ---------------------------------------------------------------- generators

interface AddP { a: number; b: number; c: number; d: number }

const addFractions = generator<AddP>({
  id: 'add',
  skill: 'Add two fractions with different denominators.',
  params(rng) {
    const b = int(rng, 2, 12);
    let d = int(rng, 2, 12);
    if (d === b) d = b === 12 ? 5 : b + 1;
    return { a: int(rng, 1, b - 1), b, c: int(rng, 1, d - 1), d };
  },
  sane: ({ a, b, c, d }) => (b >= 2 && b <= 12 && d >= 2 && d <= 12 && b !== d && a >= 1 && a < b && c >= 1 && c < d ? null : 'out of range'),
  problem({ a, b, c, d }) {
    const h = addByHand(a, b, c, d);
    const total = add(q(a, b), q(c, d));
    const steps = [
      t`The denominators differ, so rewrite both fractions over a [[common-denominator|common denominator]]. The smallest one is ${h.L}, the lowest common multiple of ${b} and ${d}.`,
      t`${math`\frac{${a}}{${b}} = \frac{${h.x}}{${h.L}}`} (multiply top and bottom by ${h.L / b}) and ${math`\frac{${c}}{${d}} = \frac{${h.y}}{${h.L}}`} (multiply by ${h.L / d}).`,
      t`Add the numerators and keep the denominator: ${math`\frac{${h.x}}{${h.L}} + \frac{${h.y}}{${h.L}} = \frac{${h.sum}}{${h.L}}`}.`,
    ];
    if (h.g > 1) steps.push(t`Both ${h.sum} and ${h.L} divide by ${h.g}, so in [[lowest-terms|lowest terms]] this is ${total}.`);
    return {
      prompt: t`Work out ${math`\frac{${a}}{${b}} + \frac{${c}}{${d}}`}. Give the answer as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(total) },
      solution: steps,
    };
  },
  solve: ({ a, b, c, d }) => reduced(a * d + c * b, b * d),
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: reduced(a + c, b + d), why: t`It looks like you added the tops and added the bottoms. Fractions only add directly when they share a denominator: first rewrite both over a common denominator, then add the numerators.` },
    { response: reduced(a + c, b * d), why: t`It looks like you multiplied the denominators but did not scale the numerators. When the bottom of a fraction is multiplied by a number, the top must be multiplied by the same number.` },
    { response: reduced(a * c, b * d), why: t`It looks like you multiplied the fractions. This question adds them: rewrite both over a common denominator, then add the numerators.` },
  ],
});

interface MulP { a: number; b: number; c: number; d: number; op: 'times' | 'divide' }

const multiplyDivide = generator<MulP>({
  id: 'multiply-divide',
  skill: 'Multiply or divide two fractions and simplify.',
  params(rng) {
    const b = int(rng, 2, 9);
    const d = int(rng, 2, 9);
    return { a: int(rng, 1, b - 1), b, c: int(rng, 1, d - 1), d, op: pick(rng, ['times', 'divide'] as const) };
  },
  sane: ({ a, b, c, d }) => (b >= 2 && b <= 9 && d >= 2 && d <= 9 && a >= 1 && a < b && c >= 1 && c < d ? null : 'out of range'),
  problem({ a, b, c, d, op }) {
    const x = q(a, b);
    const y = q(c, d);
    if (op === 'times') {
      const r = mul(x, y);
      return {
        prompt: t`Work out ${math`\frac{${a}}{${b}} \times \frac{${c}}{${d}}`}. Give the answer as a fraction in lowest terms.`,
        answer: { kind: 'exact', expected: str(r) },
        solution: [
          t`Multiply the numerators and multiply the denominators: ${math`\frac{${a} \times ${c}}{${b} \times ${d}} = \frac{${a * c}}{${b * d}}`}.`,
          t`In lowest terms that is ${r}.`,
        ],
      };
    }
    const r = div(x, y);
    return {
      prompt: t`Work out ${math`\frac{${a}}{${b}} \div \frac{${c}}{${d}}`}. Give the answer as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(r) },
      solution: [
        t`Dividing by a fraction is multiplying by its [[reciprocal|reciprocal]], the fraction turned upside down. The reciprocal of ${frac(c, d)} is ${frac(d, c)}.`,
        t`${math`\frac{${a}}{${b}} \times \frac{${d}}{${c}} = \frac{${a * d}}{${b * c}}`}.`,
        t`In lowest terms that is ${r}.`,
      ],
    };
  },
  solve: ({ a, b, c, d, op }) => (op === 'times' ? reduced(a * c, b * d) : reduced(a * d, b * c)),
  misconceptions: ({ a, b, c, d, op }): Misconception[] => op === 'times'
    ? [
      { response: reduced(a * d, b * c), why: t`It looks like you flipped the second fraction. Flip only when dividing; to multiply, multiply top by top and bottom by bottom.` },
      { response: reduced(a + c, b + d), why: t`It looks like you added the tops and the bottoms. To multiply fractions, multiply them instead.` },
      { response: reduced(a * c, b + d), why: t`The tops are multiplied, but the bottoms were added. Multiply the bottoms too.` },
    ]
    : [
      { response: reduced(a * c, b * d), why: t`It looks like you multiplied without flipping. To divide by a fraction, multiply by its reciprocal: turn the second fraction upside down first.` },
      { response: reduced(b * c, a * d), why: t`It looks like you flipped the first fraction instead of the second. Keep the first fraction and turn the one you divide by upside down.` },
      { response: reduced(b * d, a * c), why: t`It looks like both fractions were flipped. Keep the first fraction as it is and turn only the one you divide by upside down.` },
    ],
});

interface SimplifyP { a: number; b: number; k: number }

/** Smallest prime factor. */
const spf = (n: number): number => {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
};

const simplify = generator<SimplifyP>({
  id: 'simplify',
  skill: 'Write a fraction in lowest terms by dividing by the highest common factor.',
  params(rng) {
    let a = 1;
    let b = 2;
    do {
      b = int(rng, 2, 12);
      a = int(rng, 1, b - 1);
    } while (gcd(a, b) !== 1);
    return { a, b, k: pick(rng, [4, 6, 8, 9, 10, 12]) };
  },
  sane: ({ a, b, k }) => (gcd(a, b) === 1 && a >= 1 && a < b && b <= 12 && spf(k) < k && k <= 12 ? null : 'out of range'),
  problem({ a, b, k }) {
    const n = k * a;
    const m = k * b;
    return {
      prompt: t`Write ${frac(n, m)} in [[lowest-terms|lowest terms]].`,
      answer: { kind: 'exact', expected: `${a}/${b}`, requireLowestTerms: true },
      solution: [
        t`Find the highest common factor of ${n} and ${m}: the largest number that divides both. It is ${gcd(n, m)}.`,
        t`Divide top and bottom by it: ${math`\frac{${n}}{${m}} = \frac{${n / k}}{${m / k}}`}.`,
        t`Now ${n / k} and ${m / k} share no factor except ${1}, so this is in lowest terms.`,
      ],
    };
  },
  solve: ({ a, b, k }) => reduced(k * a, k * b),
  misconceptions: ({ a, b, k }): Misconception[] => {
    const p = spf(k);
    return [
      { response: `${(k * a) / p}/${(k * b) / p}`, why: t`Right idea, but you divided by a common factor that is not the highest. Look for a larger number that still divides both, or keep dividing until nothing but ${1} divides both.` },
      { response: `${a}/${k * b}`, why: t`It looks like you divided only the top. Divide the top and the bottom by the same number, or the value changes.` },
    ];
  },
});

interface RatioP { a: number; b: number; m: number; which: 'first' | 'second' }

const ratioShare = generator<RatioP>({
  id: 'ratio-share',
  skill: 'Share an amount in a given ratio.',
  params(rng) {
    let a = 1;
    let b = 1;
    do {
      a = int(rng, 1, 9);
      b = int(rng, 1, 9);
    } while (a === b || gcd(a, b) !== 1);
    return { a, b, m: int(rng, 2, 12), which: pick(rng, ['first', 'second'] as const) };
  },
  sane: ({ a, b, m }) => (a !== b && gcd(a, b) === 1 && a <= 9 && b <= 9 && m >= 2 && m <= 12 ? null : 'out of range'),
  problem({ a, b, m, which }) {
    const total = (a + b) * m;
    const part = which === 'first' ? a : b;
    return {
      prompt: t`Share ${total} sweets between Ann and Ben in the [[ratio|ratio]] ${math`${a} : ${b}`}. How many does ${which === 'first' ? 'Ann' : 'Ben'} get?`,
      answer: { kind: 'exact', expected: String(part * m) },
      solution: [
        t`The ratio ${math`${a} : ${b}`} splits the sweets into ${math`${a} + ${b} = ${a + b}`} equal parts.`,
        t`One part is ${math`${total} \div ${a + b} = ${m}`} sweets.`,
        t`${which === 'first' ? 'Ann' : 'Ben'} gets ${part} parts: ${math`${part} \times ${m} = ${part * m}`}. Check: ${math`${a * m} + ${b * m} = ${total}`}.`,
      ],
    };
  },
  solve: ({ a, b, m, which }) => {
    // Hand out the sweets in rounds of a and b until they run out.
    let ann = 0;
    let ben = 0;
    for (let left = (a + b) * m; left > 0; left -= a + b) {
      ann += a;
      ben += b;
    }
    return String(which === 'first' ? ann : ben);
  },
  misconceptions: ({ a, b, m, which }): Misconception[] => {
    const total = (a + b) * m;
    const part = which === 'first' ? a : b;
    const other = which === 'first' ? b : a;
    return [
      { response: str(q(total, part)), why: t`It looks like you divided the total by this person's number in the ratio. First find one part: divide the total by the sum of the ratio numbers.` },
      { response: String(m), why: t`That is the size of one part. This person gets several parts: multiply one part by their number in the ratio.` },
      { response: str(mul(q(part, other), q(total))), why: t`It looks like you used the fraction ${frac(part, other)}. Their share of the whole is their parts over all the parts.` },
    ];
  },
});

/**
 * Products that cancel, the structure of STEP Support Assignment 6 Q1(i): write each factor
 * as one fraction, and the top of each cancels the bottom of a neighbour.
 */
type Telescope = 'a6' | 'minus' | 'plus' | 'square';
interface TelescopeP { form: Telescope; m: number }

/** The k-th factor as a fraction, and the k range, for each form. */
const FORMS: Readonly<Record<Telescope, { lo: number; factor: (k: number) => Rational }>> = {
  // (1 + 1/(2k)) / (1 - 1/(2k)) = (2k + 1)/(2k - 1)
  a6: { lo: 1, factor: (k) => div(add(q(1), q(1, 2 * k)), add(q(1), q(-1, 2 * k))) },
  minus: { lo: 2, factor: (k) => add(q(1), q(-1, k)) },
  plus: { lo: 1, factor: (k) => add(q(1), q(1, k)) },
  square: { lo: 2, factor: (k) => add(q(1), q(-1, k * k)) },
};

const product = (form: Telescope, m: number): Rational =>
  Array.from({ length: m - FORMS[form].lo + 1 }, (_, i) => FORMS[form].factor(FORMS[form].lo + i)).reduce(mul, q(1));

/** The closed form, found by cancelling by hand. */
function telescoped(form: Telescope, m: number): Rational {
  switch (form) {
    case 'a6': return q(2 * m + 1);
    case 'minus': return q(1, m);
    case 'plus': return q(m + 1);
    case 'square': return q(m + 1, 2 * m);
  }
}

/** The factor (1 + 1/k) as LaTeX, with k computed. */
const bracket = (sign: '+' | '-', d: number | string): string => `\\left(${1} ${sign} \\frac{${1}}{${d}}\\right)`;

/** The product for k from the form's start to m, three factors, then dots, then the last; `last` is LaTeX for the last k. */
function factors(sign: '+' | '-', ks: readonly (number | string)[], last: number | string): string {
  return [...ks.map((k) => bracket(sign, k)), '\\cdots', bracket(sign, last)].join('');
}

function telescopeTex(form: Telescope, m: number): Span {
  const { lo } = FORMS[form];
  const ks = [lo, lo + 1, lo + 2];
  switch (form) {
    case 'a6': return computedTex(`\\frac{${factors('+', ks.map((k) => 2 * k), 2 * m)}}{${factors('-', ks.map((k) => 2 * k), 2 * m)}}`);
    case 'minus': return computedTex(factors('-', ks, m));
    case 'plus': return computedTex(factors('+', ks, m));
    case 'square': return computedTex(factors('-', ks.map((k) => `${k}^{${2}}`), `${m}^{${2}}`));
  }
}

const telescope = generator<TelescopeP>({
  id: 'telescope',
  skill: 'Cancel a long product of fractions before multiplying, as in STEP Support Assignment 6 Q1(i).',
  params: (rng) => ({ form: pick(rng, ['a6', 'minus', 'plus', 'square'] as const), m: int(rng, 6, 15) }),
  sane: ({ m }) => (m >= 6 && m <= 15 ? null : 'out of range'),
  problem: ({ form, m }) => {
    const v = telescoped(form, m);
    const { lo, factor } = FORMS[form];
    const first = [lo, lo + 1, lo + 2].map(factor);
    const last = factor(m);
    const kept: Record<Telescope, Span> = {
      a6: math`\frac{${2 * m + 1}}{${1}}`,
      minus: math`\frac{${1}}{${m}}`,
      plus: math`\frac{${m + 1}}{${1}}`,
      square: math`\frac{${1}}{${2}} \times \frac{${m + 1}}{${m}}`,
    };
    return {
      prompt: t`Find the value of ${telescopeTex(form, m)}. Give it as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`Write each bracket as a single fraction first. The first few are ${math`${first[0] as Rational}, ${first[1] as Rational}, ${first[2] as Rational}`}, and the last is ${last}.`,
        form === 'square'
          ? t`Each ${math`${1} - \frac{${1}}{k^{${2}}} = \frac{k - ${1}}{k} \times \frac{k + ${1}}{k}`}. In the first fractions every top cancels the bottom of the one after it; in the second, every bottom cancels the top of the one before it.`
          : t`Each top cancels the bottom of a neighbouring fraction, so do no multiplication until the cancelling is done.`,
        t`What is left is ${kept[form]}, so the product is ${v}.`,
      ],
    };
  },
  solve: ({ form, m }) => str(product(form, m)),
  misconceptions: ({ form, m }): Misconception[] => {
    const v = telescoped(form, m);
    const off = telescoped(form, m - 1);
    return [
      { response: str(off), why: t`That stops one factor early. Count the factors: the last one is the bracket with ${m} in it.` },
      { response: str(div(q(1), v)), why: t`That is the answer turned upside down. Check which tops and which bottoms survive the cancelling.` },
      { response: str(q(m)), why: t`That keeps only the last number. Write each bracket as one fraction and cancel carefully: what survives is one top and one bottom.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const A6 = 'step-f06';
const a6Value = auto({
  id: 'a6-q1-i-value',
  source: cite(A6, 'Q1(i)'),
  title: t`A product that cancels`,
  prompt: t`Find the value of ${telescopeTex('a6', 4)}.`,
  answer: { kind: 'exact', expected: str(telescoped('a6', 4)) },
  solution: [
    t`Cancelling first is far easier than multiplying (the hint in the source: with complete cancelling no multiplication is needed). Write each bracket as one fraction: the top is ${math`${q(3, 2)} \times ${q(5, 4)} \times ${q(7, 6)} \times ${q(9, 8)}`} and the bottom is ${math`${q(1, 2)} \times ${q(3, 4)} \times ${q(5, 6)} \times ${q(7, 8)}`}.`,
    t`The denominators ${2}, ${4}, ${6}, ${8} appear on both, so they cancel, leaving ${math`\frac{${3} \times ${5} \times ${7} \times ${9}}{${1} \times ${3} \times ${5} \times ${7}}`}.`,
    t`Now ${3}, ${5}, and ${7} cancel too, and the value is ${telescoped('a6', 4)}.`,
  ],
  reference: str(product('a6', 4)),
  verify: () => same('A6 Q1(i) by multiplying out', str(product('a6', 4)), str(telescoped('a6', 4))),
  misconceptions: [
    { response: str(q(1, 9)), why: t`That is the bottom over the top. The fractions with ${math`+`} are on top.` },
  ],
  official: { source: cite('step-f06-hints', 'Q1(i)'), answer: '9', agrees: true },
});

/**
 * Q4(i)(a) as a fraction of a fraction: the assignment asks for a probability, and its hint
 * counts a population of 100, so it is worked here as "what fraction of the population".
 */
const SMOKERS = { women: 60, smokeOfWomen: 30, per: 100 } as const;
const a6Smokers = auto({
  id: 'a6-q4-i-a',
  source: cite(A6, 'Q4(i)(a)', true),
  title: t`A fraction of a fraction`,
  prompt: t`A study of a large population found that ${SMOKERS.women}% were women, and of the women ${SMOKERS.smokeOfWomen}% were smokers. What fraction of the whole population are women who smoke? Give it as a fraction.`,
  answer: { kind: 'exact', expected: str(mul(q(SMOKERS.smokeOfWomen, SMOKERS.per), q(SMOKERS.women, SMOKERS.per))) },
  solution: [
    t`${SMOKERS.women}% means ${SMOKERS.women} out of every ${SMOKERS.per}: the fraction ${frac(SMOKERS.women, SMOKERS.per)}, which is ${q(SMOKERS.women, SMOKERS.per)} in lowest terms. Likewise ${SMOKERS.smokeOfWomen}% is ${frac(SMOKERS.smokeOfWomen, SMOKERS.per)}, which is ${q(SMOKERS.smokeOfWomen, SMOKERS.per)}.`,
    t`The smokers are ${q(SMOKERS.smokeOfWomen, SMOKERS.per)} of the women, and the women are ${q(SMOKERS.women, SMOKERS.per)} of everyone. Taking a fraction of an amount multiplies the amount by that fraction, so the women who smoke are ${math`${q(SMOKERS.smokeOfWomen, SMOKERS.per)} \times ${q(SMOKERS.women, SMOKERS.per)} = ${mul(q(SMOKERS.smokeOfWomen, SMOKERS.per), q(SMOKERS.women, SMOKERS.per))}`} of the population.`,
    t`Check by counting, as the assignment suggests: of ${SMOKERS.per} people, ${SMOKERS.women} are women, and ${SMOKERS.smokeOfWomen}% of ${SMOKERS.women} is ${(SMOKERS.women * SMOKERS.smokeOfWomen) / SMOKERS.per}. And ${frac((SMOKERS.women * SMOKERS.smokeOfWomen) / SMOKERS.per, SMOKERS.per)} is ${q((SMOKERS.women * SMOKERS.smokeOfWomen) / SMOKERS.per, SMOKERS.per)} in lowest terms.`,
  ],
  reference: str(mul(q(SMOKERS.smokeOfWomen, SMOKERS.per), q(SMOKERS.women, SMOKERS.per))),
  verify: () => {
    // A population of 1000 counted person by person: people 0 to 599 are the women, and
    // within each run of ten women the first three smoke.
    let both = 0;
    for (let i = 0; i < 1000; i++) if (i < 600 && i % 10 < 3) both++;
    return same('A6 Q4(i)(a) by counting', str(q(both, 1000)), str(mul(q(SMOKERS.smokeOfWomen, SMOKERS.per), q(SMOKERS.women, SMOKERS.per))));
  },
  misconceptions: [
    { response: str(sub(q(SMOKERS.women, SMOKERS.per), q(SMOKERS.smokeOfWomen, SMOKERS.per))), why: t`That subtracts the percentages. The smokers are a fraction of the women, so take that fraction of the women's share: multiply.` },
  ],
  official: { source: cite('step-f06-hints', 'Q4(i)(a)'), answer: '18/100', agrees: true },
});

// 2000 STEP II Q1, first paragraph: two unit fractions for every unit fraction.
const unitPair = supervision({
  id: 'step00-q1-unit',
  source: cite('stepdb-00-s2', 'Q1, first paragraph'),
  title: t`A unit fraction as two unit fractions`,
  prompt: t`A number of the form ${math`\frac{${1}}{N}`}, where ${math`N`} is an integer greater than ${1}, is called a unit fraction. Noting that ${dmath`\frac{${1}}{${2}} = \frac{${1}}{${3}} + \frac{${1}}{${6}} \quad\text{and}\quad \frac{${1}}{${3}} = \frac{${1}}{${4}} + \frac{${1}}{${12}},`} guess a general result of the form ${math`\frac{${1}}{N} = \frac{${1}}{a} + \frac{${1}}{b}`}, and hence prove that any unit fraction can be expressed as the sum of two distinct unit fractions.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const ex = { a: 1, b: 4, c: 1, d: 6 };
const exSum: Rational = add(q(ex.a, ex.b), q(ex.c, ex.d));
const exHand = addByHand(ex.a, ex.b, ex.c, ex.d);
const wrongSum = q(ex.a + ex.c, ex.b + ex.d);
const half = q(1, 2);
const pizza = { cut: 8, eaten: 3 };
const eq = { n: 6, d: 8, g: gcd(6, 8) };
const prod = { a: 2, b: 3, c: 3, d: 5 };

// Cancelling across a long product: the lesson's own product, (1 + 1/k) for k = 2 to 9, never the gate's.
const longKs: readonly number[] = Array.from({ length: 8 }, (_, i) => i + 2);
const longFirst = longKs[0] as number;
const longLast = longKs[longKs.length - 1] as number;
const longValue = longKs.map((k) => add(q(1), q(1, k))).reduce(mul, q(1));
const plusBracket = (k: number): string => `\\left(${1} + \\frac{${1}}{${k}}\\right)`;
const longTex = longKs.map(plusBracket).join('');
const longShortTex = [...longKs.slice(0, 3).map(plusBracket), '\\cdots', plusBracket(longLast)].join('');
const longTops = longKs.map((k) => k + 1);
const longFracTex = `\\frac{${longTops.join(' \\times ')}}{${longKs.join(' \\times ')}}`;
/** The theorem's example: k = 2 is a factor of the top of the first fraction and the bottom of the second. */
const cancelEx = { a: 2, b: 3, c: 9, d: 4, k: 2 };
/** A quotient of two products, turned into one product. */
const quot = { top: [q(3, 4), q(10, 9)], bottom: [q(5, 6), q(2, 3)] };
const quotValue = div(quot.top.reduce(mul, q(1)), quot.bottom.reduce(mul, q(1)));
const flip = (r: Rational): Rational => div(q(1), r);
const timesTex = (rs: readonly Rational[]): Span => math`${rs[0] as Rational} \times ${rs[1] as Rational}`;
/** The quick check: (1 - 1/k) for k = 2 to 6. */
const checkKs: readonly number[] = Array.from({ length: 5 }, (_, i) => i + 2);
const checkValue = checkKs.map((k) => sub(q(1), q(1, k))).reduce(mul, q(1));
const checkTex = checkKs.map((k) => `\\left(${1} - \\frac{${1}}{${k}}\\right)`).join('');
/** The pitfall: a sum on top and underneath. */
const sumTrap = { x: 3, y: 2, z: 5 };

export const fractions: TopicContent = {
  topicId: 'pre.fractions',
  goal: t`Add, multiply, divide, and simplify fractions, and share an amount in a ratio.`,
  objective: t`Add, multiply, divide, and simplify fractions, cancel across a long product, and share in a ratio.`,
  why: t`Fractions run through all of probability and algebra; probabilities themselves are fractions.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`What a fraction is` },
    { kind: 'hook', text: t`Is ${math`\frac{${ex.a}}{${ex.b}} + \frac{${ex.c}}{${ex.d}}`} equal to ${math`\frac{${ex.a + ex.c}}{${ex.b + ex.d}}`}? Adding tops and bottoms looks natural. But ${math`\frac{${ex.a + ex.c}}{${ex.b + ex.d}}`} is smaller than ${math`\frac{${ex.a}}{${ex.b}}`} on its own, and adding a positive amount cannot make something smaller. So what is the right rule, and why?` },
    { kind: 'narrative', text: t`Cut a pizza into ${pizza.cut} equal slices and eat ${pizza.eaten}: you ate ${frac(pizza.eaten, pizza.cut)} of it. That picture is good for intuition. For proofs we need a definition that works with any whole numbers, negative ones included.` },
    {
      kind: 'definition',
      name: t`Fraction`,
      formal: t`For integers ${math`a`} and ${math`b`} with ${math`b \neq ${0}`}, the [[fraction|fraction]] ${math`\frac{a}{b}`} is the number ${math`x`} with ${math`bx = a`}. Here ${math`a`} is the [[numerator|numerator]] and ${math`b`} the [[denominator|denominator]].`,
      plain: t`${math`\frac{a}{b}`} is the number that, multiplied by ${math`b`}, gives ${math`a`}. ${math`\frac{${pizza.eaten}}{${pizza.cut}}`} is the number with ${math`${pizza.cut}x = ${pizza.eaten}`}: ${pizza.eaten} of ${pizza.cut} equal slices.`,
    },
    {
      kind: 'p',
      text: t`The bottom may not be ${0}.`,
      why: { q: t`Why can't the denominator be ${0}?`, a: t`${math`\frac{a}{${0}}`} would be a number ${math`x`} with ${math`${0} \cdot x = a`}. If ${math`a \neq ${0}`}, no number works, because ${math`${0} \cdot x = ${0}`}. If ${math`a = ${0}`}, every number works. Either way there is no single answer.` },
    },
    { kind: 'section', title: t`When are two fractions equal?` },
    { kind: 'narrative', text: t`${math`\frac{${eq.n / eq.g}}{${eq.d / eq.g}}`} and ${math`\frac{${eq.n}}{${eq.d}}`} are the same amount: the second is the first cut into finer slices. Here is the test that decides it for any two fractions.` },
    { kind: 'theorem', statement: t`Let ${math`a, b, c, d`} be integers with ${math`b \neq ${0}`} and ${math`d \neq ${0}`}. Then ${math`\frac{a}{b} = \frac{c}{d}`} if and only if ${math`ad = bc`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the two numbers`, text: t`Let ${math`x = \frac{a}{b}`} and ${math`y = \frac{c}{d}`}, so ${math`bx = a`} and ${math`dy = c`}.`, plain: t`Straight from the definition of a fraction.` },
        { label: t`(${math`\Rightarrow`}) Assume ${math`x = y`}`, text: t`Then ${math`ad = (bx)d = bdx = bdy = b(dy) = bc`}.`, plain: t`Replace ${math`a`} by ${math`bx`}, swap ${math`x`} for ${math`y`}, and put ${math`c = dy`} back. With ${math`\frac{${3}}{${4}} = \frac{${6}}{${8}}`}: ${math`${3} \times ${8} = ${4} \times ${6} = ${24}`}.` },
        { label: t`(${math`\Leftarrow`}) Assume ${math`ad = bc`}`, text: t`Then ${math`bd \cdot x = d(bx) = da = bc = b(dy) = bd \cdot y`}.`, plain: t`The same substitutions, read the other way.` },
        { label: t`Cancel ${math`bd`}`, text: t`${math`bd \neq ${0}`}, so dividing by ${math`bd`} gives ${math`x = y`}.`, plain: t`A product of two nonzero numbers is nonzero, so the division is allowed.` },
      ],
    },
    {
      kind: 'p',
      text: t`So multiplying top and bottom by the same nonzero ${math`k`} never changes a fraction: ${math`\frac{ka}{kb} = \frac{a}{b}`}, because ${math`ka \cdot b = kb \cdot a`}. Dividing both by a common factor goes the other way. A fraction is in [[lowest-terms|lowest terms]] when no whole number except ${1} divides both top and bottom: ${math`\frac{${eq.n}}{${eq.d}} = \frac{${eq.n / eq.g}}{${eq.d / eq.g}}`}, dividing both by ${eq.g}.`,
    },
    { kind: 'section', title: t`Adding and subtracting` },
    { kind: 'narrative', text: t`Thirds and quarters cannot be added directly, just as ${3} metres and ${4} centimetres are not ${7} of anything. First cut both into slices of the same size.` },
    { kind: 'rule', text: t`To add or subtract, rewrite the fractions over a [[common-denominator|common denominator]], then add the numerators: ${dmath`\frac{a}{c} + \frac{b}{c} = \frac{a + b}{c}`}` },
    {
      kind: 'p',
      text: t`For ${math`\frac{${ex.a}}{${ex.b}} + \frac{${ex.c}}{${ex.d}}`}, the smallest common denominator is ${exHand.L}. Then ${math`\frac{${ex.a}}{${ex.b}} = \frac{${exHand.x}}{${exHand.L}}`} and ${math`\frac{${ex.c}}{${ex.d}} = \frac{${exHand.y}}{${exHand.L}}`}, so the sum is ${frac(exHand.sum, exHand.L)}${exHand.g > 1 ? t`, which is ${exSum} in lowest terms` : t``}.`,
      why: { q: t`Why is ${exHand.L} the smallest common denominator?`, a: t`It is the smallest number that both ${ex.b} and ${ex.d} divide, their lowest common multiple. Any common multiple works; the smallest keeps the numbers small.` },
    },
    {
      kind: 'pitfall',
      claim: t`${math`\frac{a}{b} + \frac{c}{d} = \frac{a + c}{b + d}`}.`,
      counterexample: t`${math`\frac{${ex.a}}{${ex.b}} + \frac{${ex.c}}{${ex.d}} = ${exSum}`}, but ${math`\frac{${ex.a + ex.c}}{${ex.b + ex.d}} = ${wrongSum}`}, which is less than ${frac(ex.a, ex.b)} alone. Tops add only when the slices are the same size.`,
    },
    quickCheck({
      prompt: t`Work out ${math`\frac{${2}}{${3}} - \frac{${1}}{${4}}`} in lowest terms.`,
      answer: { kind: 'exact', expected: str(sub(q(2, 3), q(1, 4))), requireLowestTerms: true },
      reference: str(sub(q(2, 3), q(1, 4))),
      why: t`Over ${12}: ${math`\frac{${8}}{${12}} - \frac{${3}}{${12}} = ${sub(q(2, 3), q(1, 4))}`}.`,
    }),
    { kind: 'section', title: t`Multiplying and dividing` },
    { kind: 'rule', text: t`To multiply, multiply the tops and multiply the bottoms. To divide, multiply by the [[reciprocal|reciprocal]] of the second fraction, the fraction turned upside down: ${dmath`\frac{a}{b} \times \frac{c}{d} = \frac{ac}{bd}, \qquad \frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \times \frac{d}{c}`}` },
    {
      kind: 'p',
      text: t`For example ${math`\frac{${prod.a}}{${prod.b}} \times \frac{${prod.c}}{${prod.d}} = \frac{${prod.a * prod.c}}{${prod.b * prod.d}}`}, which is ${mul(q(prod.a, prod.b), q(prod.c, prod.d))}. Dividing by ${half} is multiplying by ${div(q(1), half)}: there are ${div(q(1), half)} halves in one whole.`,
      why: { q: t`Why does multiplying tops and bottoms work?`, a: t`If ${math`bx = a`} and ${math`dy = c`}, then ${math`(bd)(xy) = (bx)(dy) = ac`}. So ${math`xy`} is the number that, times ${math`bd`}, gives ${math`ac`}: that is ${math`\frac{ac}{bd}`}. Dividing by ${math`\frac{c}{d}`} means finding the number that, times ${math`\frac{c}{d}`}, gives ${math`\frac{a}{b}`}, and ${math`\frac{a}{b} \times \frac{d}{c}`} does it.` },
    },
    { kind: 'section', title: t`Cancelling across a long product` },
    { kind: 'narrative', text: t`How would you work out ${computedTex(longTex)}? Multiplying one bracket at a time works, but the tops and bottoms grow at every step. There is a better way, and the STEP Support assignments expect it: cancel before you multiply.` },
    { kind: 'p', text: t`Start small. In ${math`\frac{${3}}{${2}} \times \frac{${5}}{${4}} \times \frac{${2}}{${5}}`}, the ${2} and the ${5} each appear once on top and once underneath, so they cancel and leave ${math`\frac{${3}}{${4}}`}, with no large numbers on the way. Here is why that is allowed.` },
    { kind: 'theorem', name: t`Cancelling across a product`, statement: t`Let ${math`\frac{a}{b}`} and ${math`\frac{c}{d}`} be fractions, and let ${math`k \neq ${0}`} be a whole number with ${math`a = ka'`} and ${math`d = kd'`} for whole numbers ${math`a'`} and ${math`d'`}. Then ${math`\frac{a}{b} \times \frac{c}{d} = \frac{a'}{b} \times \frac{c}{d'}`}.` },
    {
      kind: 'p',
      text: t`In plain words: a number that divides the top of one fraction and the bottom of another may be divided out of both before you multiply. With ${math`\frac{${cancelEx.a}}{${cancelEx.b}} \times \frac{${cancelEx.c}}{${cancelEx.d}}`}, ${math`k = ${cancelEx.k}`} divides the top ${cancelEx.a} and the bottom ${cancelEx.d}, so the product is ${math`\frac{${cancelEx.a / cancelEx.k}}{${cancelEx.b}} \times \frac{${cancelEx.c}}{${cancelEx.d / cancelEx.k}} = ${mul(q(cancelEx.a, cancelEx.b), q(cancelEx.c, cancelEx.d))}`}. Multiplying first gives ${math`\frac{${cancelEx.a * cancelEx.c}}{${cancelEx.b * cancelEx.d}}`}, the same number.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply`, text: t`${math`\frac{a}{b} \times \frac{c}{d} = \frac{ac}{bd} = \frac{k a' c}{b k d'}`}.`, plain: t`The rule for multiplying, then ${math`a = ka'`} on top and ${math`d = kd'`} underneath.` },
        { label: t`Divide top and bottom by k`, text: t`${math`\frac{k \cdot a'c}{k \cdot bd'} = \frac{a'c}{bd'}`}.`, plain: t`Multiplying top and bottom by the same nonzero number never changes a fraction, so dividing both by ${math`k`} does not either.`, why: { q: t`Why is ${math`k \neq ${0}`} needed?`, a: t`Dividing by ${0} has no meaning, and the rule ${math`\frac{ka}{kb} = \frac{a}{b}`} was proved only for ${math`k \neq ${0}`}.` } },
        { label: t`Split again`, text: t`${math`\frac{a'c}{bd'} = \frac{a'}{b} \times \frac{c}{d'}`}.`, plain: t`The rule for multiplying, read from right to left.` },
      ],
    },
    {
      kind: 'p',
      text: t`A product of many fractions is worked out two at a time, so the same cancelling works between any top and any bottom in it, however far apart they stand.`,
      why: { q: t`Why may a top cancel a bottom that is not next to it?`, a: t`Multiplication can be done in any order and grouped in any way: ${math`x \times y = y \times x`} and ${math`(x \times y) \times z = x \times (y \times z)`}. So the two fractions can be brought side by side, cancelled, and put back.` },
    },
    {
      kind: 'steps',
      steps: [
        { label: t`One fraction per bracket`, text: t`${math`${1} + \frac{${1}}{${2}} = \frac{${3}}{${2}}`}, ${math`${1} + \frac{${1}}{${3}} = \frac{${4}}{${3}}`}, and so on, up to ${math`${1} + \frac{${1}}{${longLast}} = \frac{${longLast + 1}}{${longLast}}`}.`, why: { q: t`Why is ${math`${1} + \frac{${1}}{${2}} = \frac{${3}}{${2}}`}?`, a: t`${math`${1} = \frac{${2}}{${2}}`}, so ${math`${1} + \frac{${1}}{${2}} = \frac{${2}}{${2}} + \frac{${1}}{${2}} = \frac{${3}}{${2}}`}: add over the common denominator.` } },
        { label: t`Tops over bottoms`, text: t`So the product is ${computedTex(longFracTex)}.`, plain: t`Multiplying fractions multiplies the tops and multiplies the bottoms.` },
        { label: t`Cancel`, text: t`Every whole number from ${longFirst + 1} to ${longLast} is once on top and once underneath, so each cancels, leaving ${math`\frac{${longLast + 1}}{${longFirst}}`}.`, plain: t`By the theorem, one pair at a time.` },
        { label: t`Finish`, text: t`${math`\frac{${longLast + 1}}{${longFirst}} = ${longValue}`}.`, plain: t`No multiplication was needed at all.` },
      ],
    },
    { kind: 'p', text: t`Written short, the product is ${computedTex(longShortTex)}. The dots stand for the brackets left out: one for every whole number from ${longFirst} to ${longLast}.` },
    {
      kind: 'p',
      text: t`A fraction bar means divide, so a fraction whose top and bottom are both products is the top divided by the bottom, and that is one more product. Dividing by a product of fractions is multiplying by each of them turned upside down: ${math`\frac{${timesTex(quot.top)}}{${timesTex(quot.bottom)}} = ${quot.top[0] as Rational} \times ${quot.top[1] as Rational} \times ${flip(quot.bottom[0] as Rational)} \times ${flip(quot.bottom[1] as Rational)}`}, and cancelling finishes it: the value is ${quotValue}.`,
      why: { q: t`Why may each fraction underneath be turned upside down?`, a: t`${math`${timesTex(quot.bottom)} \times ${flip(quot.bottom[0] as Rational)} \times ${flip(quot.bottom[1] as Rational)} = ${1}`}, since every number cancels. So ${math`${flip(quot.bottom[0] as Rational)} \times ${flip(quot.bottom[1] as Rational)}`} is the reciprocal of the bottom, and dividing by a number is multiplying by its reciprocal.` },
    },
    quickCheck({
      prompt: t`Work out ${computedTex(checkTex)} in lowest terms.`,
      answer: { kind: 'exact', expected: str(checkValue), requireLowestTerms: true },
      reference: str(checkValue),
      why: t`As fractions the brackets are ${computedTex(checkKs.map((k) => `\\frac{${k - 1}}{${k}}`).join(' \\times '))}; each top from ${2} to ${checkKs[checkKs.length - 2] as number} cancels the bottom before it, leaving ${checkValue}.`,
    }),
    {
      kind: 'pitfall',
      claim: t`Cancelling works in a sum too: ${math`\frac{${sumTrap.x} + ${sumTrap.y}}{${sumTrap.x} + ${sumTrap.z}} = \frac{${sumTrap.y}}{${sumTrap.z}}`}.`,
      counterexample: t`${math`\frac{${sumTrap.x} + ${sumTrap.y}}{${sumTrap.x} + ${sumTrap.z}} = ${q(sumTrap.x + sumTrap.y, sumTrap.x + sumTrap.z)}`}, not ${q(sumTrap.y, sumTrap.z)}. Only a factor of the whole top and of the whole bottom may be cancelled; in a sum, ${sumTrap.x} is a term, not a factor.`,
    },
    { kind: 'section', title: t`Ratios` },
    {
      kind: 'definition',
      name: t`Ratio`,
      formal: t`Amounts are shared in the [[ratio|ratio]] ${math`m : n`} (with ${math`m, n > ${0}`}) when the first share is ${math`\frac{m}{m + n}`} of the total and the second is ${math`\frac{n}{m + n}`}.`,
      plain: t`cut the whole into ${math`m + n`} equal parts; the first person gets ${math`m`} of them. In the ratio ${math`${2} : ${3}`} the first share is ${q(2, 5)} of the total.`,
    },
    { kind: 'takeaway', text: t`${math`\frac{a}{b}`} is the number that times ${math`b`} gives ${math`a`}; two fractions are equal when ${math`ad = bc`}, add over a common denominator, multiply tops and bottoms, and in a long product cancel before you multiply.` },
  ],
  examples: [
    worked(addFractions, { a: 2, b: 3, c: 1, d: 4 }, t`Adding fractions`),
    worked(multiplyDivide, { a: 3, b: 4, c: 5, d: 6, op: 'divide' }, t`Dividing by a fraction`),
    { ...workedCambridge(a6Smokers), examiner: t`Each percentage written as a fraction first, the product taken because the smokers are a fraction of a fraction, and the answer checked by counting ${SMOKERS.per} people, as the assignment's hint suggests.` },
  ],
  generators: [addFractions, multiplyDivide, simplify, ratioShare, telescope],
  cambridge: withUses([a6Value, unitPair], {
    'a6-q1-i-value': { sections: ['Multiplying and dividing', 'Cancelling across a long product'], note: t`Writing each bracket as one fraction, then cancelling across the whole product before multiplying` },
    'step00-q1-unit': { sections: ['Adding and subtracting'], note: t`Spotting a pattern in two examples, then proving it for every whole number by adding fractions with letters` },
  }),
  gate: ['a6-q1-i-value', 'step00-q1-unit'],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fraction', 'numerator', 'denominator', 'lowest-terms', 'common-denominator', 'reciprocal', 'ratio'],
  recall: [
    { front: t`Define the fraction ${math`\frac{a}{b}`}.`, back: t`For integers with ${math`b \neq ${0}`}: the number ${math`x`} with ${math`bx = a`}.` },
    { front: t`When is ${math`\frac{a}{b} = \frac{c}{d}`}?`, back: t`Exactly when ${math`ad = bc`}.` },
    { front: t`How do you add ${math`\frac{a}{b} + \frac{c}{d}`}?`, back: t`Rewrite both over a common denominator, then add the numerators.` },
    { front: t`How do you divide by ${math`\frac{c}{d}`}?`, back: t`Multiply by its reciprocal, ${math`\frac{d}{c}`}.` },
    { front: t`In a product of fractions, what may you cancel?`, back: t`A factor of any top against the same factor of any bottom, before multiplying.` },
  ],
  proofOrder: [
    {
      title: t`If ${math`ad = bc`}, then ${math`\frac{a}{b} = \frac{c}{d}`}`,
      steps: [
        t`Let ${math`x = \frac{a}{b}`} and ${math`y = \frac{c}{d}`}, so ${math`bx = a`} and ${math`dy = c`}.`,
        t`Then ${math`bd \cdot x = da`} and ${math`bd \cdot y = bc`}.`,
        t`Since ${math`ad = bc`}, ${math`bd \cdot x = bd \cdot y`}.`,
        t`${math`bd \neq ${0}`}, so ${math`x = y`}.`,
      ],
    },
  ],
};
