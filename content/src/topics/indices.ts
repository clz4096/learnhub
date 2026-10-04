/** pre.indices: Laws of indices. */
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { ident, math, t } from '../rich';
import { worked, type TopicContent } from '../topic';

const POS = { kind: 'real', min: 0.5, max: 3 } as const;
const INT = { kind: 'integer', min: -4, max: 4 } as const;
const D = { x: POS, a: POS, m: INT, n: INT };

// ---------------------------------------------------------------- generators

interface CombineP { a: number; b: number; c: number }

const combine = generator<CombineP>({
  id: 'combine',
  skill: 'Multiply and divide powers of the same base by adding and subtracting indices.',
  params: (rng) => ({ a: int(rng, 2, 9), b: int(rng, 2, 9), c: int(rng, 1, 12) }),
  sane: ({ a, b, c }) => (a >= 2 && a <= 9 && b >= 2 && b <= 9 && c >= 1 && c <= 12 ? null : 'out of range'),
  problem: ({ a, b, c }) => ({
    prompt: t`Write ${math`x^${a} * x^${b} / x^${c}`} as a single power of x. What is the [[index|index]]?`,
    answer: { kind: 'exact', expected: String(a + b - c) },
    solution: [
      t`Multiplying powers of the same base adds the indices: ${math`x^${a} * x^${b} = x^${a + b}`}.`,
      t`Dividing subtracts them: ${math`x^${a + b} / x^${c} = x^(${a + b} - ${c}) = x^${a + b - c}`}. The index is ${a + b - c}.`,
    ],
  }),
  solve: ({ a, b, c }) => {
    // Count the factors of x: a and b on top, c below; each one below cancels one on top.
    const top = Array.from({ length: a + b }, () => 'x');
    return String(top.length - c);
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: String(a * b - c), why: t`Multiplying powers adds the indices, it does not multiply them: ${math`x^${a} * x^${b}`} is ${a} factors of x times ${b} more, so ${a + b} in all.` },
    { response: String(a + b + c), why: t`Dividing by ${math`x^${c}`} takes ${c} factors of x away, so subtract its index.` },
    { response: String(a + b), why: t`That is right for the product. Now divide by ${math`x^${c}`} too, which subtracts ${c} from the index.` },
  ],
});

interface PowerP { a: number; b: number; c: number }

const powerOfPower = generator<PowerP>({
  id: 'power-of-power',
  skill: 'Raise a power to a power by multiplying indices.',
  params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 2, 5), c: int(rng, 1, 9) }),
  sane: ({ a, b, c }) => (a >= 2 && a <= 6 && b >= 2 && b <= 5 && c >= 1 && c <= 9 ? null : 'out of range'),
  problem: ({ a, b, c }) => ({
    prompt: t`Write ${math`(x^${a})^${b} * x^${c}`} as a single power of x. What is the index?`,
    answer: { kind: 'exact', expected: String(a * b + c) },
    solution: [
      t`A power of a power multiplies the indices: ${math`(x^${a})^${b} = x^(${a} * ${b}) = x^${a * b}`}, because it is ${b} copies of ${math`x^${a}`}.`,
      t`Then multiply by ${math`x^${c}`}, adding indices: ${math`x^${a * b} * x^${c} = x^${a * b + c}`}.`,
    ],
  }),
  solve: ({ a, b, c }) => {
    // Expand: b copies of a factors, then c more.
    let count = 0;
    for (let i = 0; i < b; i++) count += a;
    return String(count + c);
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: String(a + b + c), why: t`${math`(x^${a})^${b}`} is ${b} copies of ${math`x^${a}`} multiplied together, so its index is ${a} times ${b}, not ${a} plus ${b}.` },
    { response: String(a * b * c), why: t`Multiplying by ${math`x^${c}`} adds ${c} to the index; only a power of a power multiplies.` },
    { response: String(a * b), why: t`That is right for the bracket. Now multiply by ${math`x^${c}`} too, which adds ${c} to the index.` },
  ],
});

interface EvalP { r: number; qq: number; p: number }

const evaluate = generator<EvalP>({
  id: 'evaluate',
  skill: 'Evaluate zero, negative, and fractional powers exactly.',
  params(rng) {
    const qq = pick(rng, [1, 2, 3]);
    const r = qq === 3 ? int(rng, 2, 4) : int(rng, 2, 6);
    // Indices in lowest terms, and never 1/qq alone, where every slip below lands on the root by accident.
    const p = pick(rng, qq === 1 ? [-3, -2, -1, 0] : qq === 2 ? [-3, -1, 3] : [-2, -1, 2]);
    return { r, qq, p };
  },
  sane: ({ r, qq, p }) => (r >= 2 && r <= 6 && qq >= 1 && qq <= 3 && Math.abs(p) <= 3 && r ** qq <= 64 && r ** Math.abs(p) <= 1000 && (qq === 1 || p % qq !== 0) ? null : 'out of range'),
  problem: ({ r, qq, p }) => {
    const base = r ** qq;
    const value = p >= 0 ? q(r ** p) : q(1, r ** -p);
    const power = qq === 1 ? math`${base}^${p}` : math`${base}^(${p}/${qq})`;
    const steps = [];
    if (qq > 1) steps.push(t`The denominator ${qq} of the index means a root: ${math`${base}^(${1}/${qq}) = ${r}`}, because ${math`${r}^${qq} = ${base}`}.`);
    if (p === 0) steps.push(t`Any nonzero number to the power ${0} is ${1}.`);
    else if (p > 0) steps.push(t`Then raise to the power ${p}: ${math`${r}^${p} = ${r ** p}`}.`);
    else steps.push(t`A negative index means one over the positive power: ${math`${r}^${p} = ${1}/${r}^${-p} = ${value}`}.`);
    return {
      prompt: t`Work out ${power} exactly. Give a whole number or a fraction.`,
      answer: { kind: 'exact', expected: str(value) },
      solution: steps,
    };
  },
  solve: ({ r, qq, p }) => {
    // Floating point, then the nearest whole number or unit fraction: independent of the exact route.
    const v = (r ** qq) ** (p / qq);
    return v >= 1 ? String(Math.round(v)) : `1/${Math.round(1 / v)}`;
  },
  misconceptions: ({ r, qq, p }): Misconception[] => {
    const base = r ** qq;
    if (p === 0) {
      return [
        { response: '0', why: t`Any nonzero number to the power ${0} is ${1}, not ${0}. Dividing ${math`${base}^${1}`} by itself gives ${math`${base}^${0}`}, and it equals ${1}.` },
        { response: String(base), why: t`The power ${0} does not leave the number unchanged; the power ${1} does. To the power ${0} the answer is ${1}.` },
      ];
    }
    const out: Misconception[] = [
      { response: str(q(base * p, qq)), why: t`An index is not a multiplier. ${math`${base}^${p}`} means ${base} multiplied by itself, and a fractional index means a root.` },
    ];
    if (p < 0) {
      out.push({ response: str(q(-(r ** -p))), why: t`A negative index does not make the answer negative. It means one over the power: ${math`${r}^${p} = ${1}/${r}^${-p}`}.` });
      out.push({ response: str(q(r ** -p)), why: t`Right size, but a negative index means one over the power. Take the reciprocal.` });
    } else {
      out.push({ response: String(r), why: t`That is the root alone. Raise it to the power ${p} as well.` });
      out.push({ response: str(q(base, qq)), why: t`The denominator of the index means a root, not division. ${math`${base}^(${1}/${qq})`} is the number whose power ${qq} is ${base}.` });
      out.push({ response: String(base ** p), why: t`That raises to the power ${p} but skips the root. The denominator ${qq} of the index means take the root first: ${math`${base}^(${1}/${qq}) = ${r}`}.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- lesson

export const indices: TopicContent = {
  topicId: 'pre.indices',
  goal: t`Multiply, divide, and raise powers, including zero, negative, and fractional indices.`,
  lesson: [
    { kind: 'p', text: t`A [[power|power]] is repeated multiplication: ${math`${2}^${5} = ${2} * ${2} * ${2} * ${2} * ${2} = ${2 ** 5}`}. The ${2} is the [[base|base]] and the ${5} is the [[index|index]] (also called the exponent): how many copies of the base are multiplied.` },
    { kind: 'p', text: t`Multiplying powers of the same base puts the copies together: ${math`${2}^${3} * ${2}^${4} = ${2 ** 3} * ${2 ** 4} = ${2 ** 7} = ${2}^${7}`}. Dividing takes copies away: ${math`${2}^${6} / ${2}^${2} = ${2 ** 6 / 2 ** 2} = ${2}^${4}`}.` },
    {
      kind: 'list',
      items: [
        t`Multiply: ${ident('x^m * x^n', 'x^(m + n)', ['x', 'm', 'n'], D)}.`,
        t`Divide: ${ident('x^m / x^n', 'x^(m - n)', ['x', 'm', 'n'], D)}.`,
        t`Power of a power: ${ident('(x^m)^n', 'x^(m n)', ['x', 'm', 'n'], D)}.`,
      ],
    },
    { kind: 'p', text: t`The division rule explains the [[zero-index|zero index]]: ${math`${2}^${3} / ${2}^${3}`} is ${1}, and the rule gives ${math`${2}^${0}`}. So ${ident('x^0', '1', ['x'], D)} for every nonzero x.` },
    { kind: 'p', text: t`It also explains [[negative-index|negative indices]]: ${math`${2}^${2} / ${2}^${5} = ${2 ** 2}/${2 ** 5} = ${q(2 ** 2, 2 ** 5)}`}, and the rule gives ${math`${2}^${-3}`}. So ${ident('x^(-n)', '1/x^n', ['x', 'n'], D)}. A negative index never makes the number negative.` },
    { kind: 'p', text: t`A [[fractional-index|fractional index]] is a root. Since ${math`(${9}^(${1}/${2}))^${2} = ${9}^${1} = ${9}`}, the number ${math`${9}^(${1}/${2})`} is the square root of ${9}, which is ${Math.sqrt(9)}. In general ${math`x^(m/n)`} is the n-th root of x, raised to the power m: ${math`${8}^(${2}/${3}) = ${Math.cbrt(8)}^${2} = ${Math.cbrt(8) ** 2}`}.` },
  ],
  examples: [
    worked(combine, { a: 5, b: 4, c: 7 }, t`Multiplying and dividing powers`),
    worked(evaluate, { r: 3, qq: 3, p: -2 }, t`A negative fractional index`),
    worked(powerOfPower, { a: 3, b: 4, c: 2 }, t`A power of a power`),
  ],
  generators: [combine, powerOfPower, evaluate],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['power', 'base', 'index', 'zero-index', 'negative-index', 'fractional-index'],
};
