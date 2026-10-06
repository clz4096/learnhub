/**
 * pre.fractions: Fractions and ratios. No Cambridge source teaches fractions from the start,
 * so the explanation is written from scratch (decision 11); the STEP Support assignments
 * supply the habit they ask for (cancel before multiplying, answers in lowest terms) and the
 * problems: Assignment 6 Q1(i).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, gcd, int, mul, pick, q, str, upTo, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, frac, math, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

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

const a6General = auto({
  id: 'a6-q1-i-general',
  source: cite(A6, 'Q1(i), second part'),
  title: t`The same product to ${math`n`} factors`,
  prompt: t`Find, in terms of ${math`n`}, the value of ${computedTex(`\\frac{${factors('+', [2, 4, 6, 8], `${2}n`)}}{${factors('-', [2, 4, 6, 8], `${2}n`)}}`)}.`,
  answer: { kind: 'expression', expected: '2n + 1', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [
    t`As in the first part, write the brackets as fractions: the top is ${math`\frac{${3}}{${2}} \times \frac{${5}}{${4}} \times \cdots \times \frac{${2}n + ${1}}{${2}n}`} and the bottom is ${math`\frac{${1}}{${2}} \times \frac{${3}}{${4}} \times \cdots \times \frac{${2}n - ${1}}{${2}n}`}.`,
    t`The even denominators cancel, leaving ${math`\frac{${3} \times ${5} \times \cdots \times (${2}n - ${1}) \times (${2}n + ${1})}{${1} \times ${3} \times \cdots \times (${2}n - ${3}) \times (${2}n - ${1})}`}.`,
    t`Every odd number on the bottom cancels one on top, and only ${math`${2}n + ${1}`} survives.`,
  ],
  reference: '2n + 1',
  verify: () => {
    for (const n of upTo(20)) {
      const e = same(`A6 Q1(i) at n = ${n}`, str(product('a6', n)), String(2 * n + 1));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: '2n - 1', why: t`That drops the last factor. The last bracket on top is ${math`${1} + \frac{${1}}{${2}n} = \frac{${2}n + ${1}}{${2}n}`}, and its top survives.` },
    { response: '2n', why: t`The denominators cancel, so no ${math`${2}n`} is left. What survives is the last numerator, ${math`${2}n + ${1}`}.` },
  ],
  official: { source: cite('step-f06-hints', 'Q1(i)'), answer: '2n + 1', agrees: true },
});

const a6Show = supervision({
  id: 'a6-q1-i-show',
  source: cite(A6, 'Q1(i), second part', true),
  title: t`Why the general product is ${math`${2}n + ${1}`}`,
  prompt: t`Show carefully that the product in the last problem equals ${math`${2}n + ${1}`} for every positive integer ${math`n`}. Generalising from a few cases is not enough: say exactly which factors cancel and why the cancelling leaves only ${math`${2}n + ${1}`}.`,
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q1(i)'),
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
    { kind: 'p', text: t`Cancel before you multiply. In ${math`\frac{${3}}{${2}} \times \frac{${5}}{${4}} \times \frac{${2}}{${5}}`}, the ${2} and the ${5} each appear once on top and once underneath, so they cancel and leave ${math`\frac{${3}}{${4}}`}, with no large numbers on the way. The STEP Support assignments ask for this habit, and for every answer in lowest terms.` },
    { kind: 'p', text: t`A [[ratio|ratio]] compares amounts by parts. Sharing in the ratio ${math`${2} : ${3}`} cuts the whole into ${2 + 3} equal parts and gives ${2} of them to the first person, so the first share is ${q(2, 5)} of the total.` },
  ],
  examples: [
    worked(addFractions, { a: 2, b: 3, c: 1, d: 4 }, t`Adding fractions`),
    worked(multiplyDivide, { a: 3, b: 4, c: 5, d: 6, op: 'divide' }, t`Dividing by a fraction`),
    workedCambridge(a6Value),
  ],
  generators: [addFractions, multiplyDivide, simplify, ratioShare, telescope],
  cambridge: [a6General, a6Show],
  gate: ['a6-q1-i-general', 'a6-q1-i-show'],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fraction', 'numerator', 'denominator', 'lowest-terms', 'common-denominator', 'reciprocal', 'ratio'],
};
