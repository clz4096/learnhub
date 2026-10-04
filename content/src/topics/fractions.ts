/** pre.fractions: Fractions and ratios. */
import { add, div, gcd, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, frac, math, t } from '../rich';
import { worked, type TopicContent } from '../topic';

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

// ---------------------------------------------------------------- lesson

const ex = { a: 1, b: 4, c: 1, d: 6 };
const exSum: Rational = add(q(ex.a, ex.b), q(ex.c, ex.d));
const exHand = addByHand(ex.a, ex.b, ex.c, ex.d);
const wrongSum = q(ex.a + ex.c, ex.b + ex.d);
const half = q(1, 2);
const pizza = { cut: 8, eaten: 3 };
const eq = { n: 6, d: 8, g: gcd(6, 8) };
const prod = { a: 2, b: 3, c: 3, d: 5 };

export const fractions: TopicContent = {
  topicId: 'pre.fractions',
  goal: t`Add, multiply, divide, and simplify fractions, and share an amount in a ratio.`,
  lesson: [
    { kind: 'p', text: t`A [[fraction|fraction]] is a number of equal parts of a whole. Cut a pizza into ${pizza.cut} equal slices and eat ${pizza.eaten}: you ate ${frac(pizza.eaten, pizza.cut)} of it. The top number is the [[numerator|numerator]], how many parts you have. The bottom number is the [[denominator|denominator]], how many equal parts make the whole.` },
    { kind: 'p', text: t`Multiplying the top and the bottom by the same number gives the same amount cut finer, so ${math`\frac{${eq.n / eq.g}}{${eq.d / eq.g}} = \frac{${eq.n}}{${eq.d}}`}. Dividing both by a common factor goes the other way. A fraction is in [[lowest-terms|lowest terms]] when no number except ${1} divides both top and bottom.` },
    { kind: 'rule', text: t`To add or subtract, first rewrite the fractions over a [[common-denominator|common denominator]], then add the numerators: ${dmath`\frac{a}{c} + \frac{b}{c} = \frac{a + b}{c}`}` },
    { kind: 'p', text: t`For ${math`\frac{${ex.a}}{${ex.b}} + \frac{${ex.c}}{${ex.d}}`}, the smallest common denominator is ${exHand.L}. Then ${math`\frac{${ex.a}}{${ex.b}} = \frac{${exHand.x}}{${exHand.L}}`} and ${math`\frac{${ex.c}}{${ex.d}} = \frac{${exHand.y}}{${exHand.L}}`}, so the sum is ${frac(exHand.sum, exHand.L)}${exHand.g > 1 ? t`, which is ${exSum} in lowest terms` : t``}. Adding tops and bottoms instead gives ${wrongSum}, which is less than ${frac(ex.a, ex.b)} alone, so it cannot be right.` },
    { kind: 'rule', text: t`To multiply, multiply the tops and multiply the bottoms. To divide, multiply by the [[reciprocal|reciprocal]] of the second fraction: ${dmath`\frac{a}{b} \times \frac{c}{d} = \frac{ac}{bd}, \qquad \frac{a}{b} \div \frac{c}{d} = \frac{a}{b} \times \frac{d}{c}`}` },
    { kind: 'p', text: t`For example ${math`\frac{${prod.a}}{${prod.b}} \times \frac{${prod.c}}{${prod.d}} = \frac{${prod.a * prod.c}}{${prod.b * prod.d}}`}, which is ${mul(q(prod.a, prod.b), q(prod.c, prod.d))}. Dividing by ${half} is multiplying by ${div(q(1), half)}, which is why there are ${div(q(1), half)} halves in one whole.` },
    { kind: 'p', text: t`A [[ratio|ratio]] compares amounts by parts. Sharing in the ratio ${math`${2} : ${3}`} cuts the whole into ${2 + 3} equal parts and gives ${2} of them to the first person, so the first share is ${q(2, 5)} of the total.` },
  ],
  examples: [
    worked(addFractions, { a: 2, b: 3, c: 1, d: 4 }, t`Adding fractions`),
    worked(multiplyDivide, { a: 3, b: 4, c: 5, d: 6, op: 'divide' }, t`Dividing by a fraction`),
    worked(ratioShare, { a: 3, b: 5, m: 6, which: 'second' }, t`Sharing in a ratio`),
  ],
  generators: [addFractions, multiplyDivide, simplify, ratioShare],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fraction', 'numerator', 'denominator', 'lowest-terms', 'common-denominator', 'reciprocal', 'ratio'],
};
