/**
 * pre.indices: Laws of indices. No Cambridge source teaches indices from the start, so the
 * explanation is written from scratch (decision 11); STEP Support Assignment 12 Q1(iv)
 * (2^(2n) is 4^n) and CST supervision exercise 1.2.3 (2^0 = 1, and N starts at 0) supply
 * the worked example and the problems. Batch 7 adds IA Numbers and Sets Example Sheet 2, Q12
 * (second part): 2^91 - 1 is not prime, since 2^91 = (2^7)^13. CST exercise 4.2.1(a), the same idea
 * with a sum, needs sigma notation, which this topic does not assume, so it is not set.
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, frac, ident, math, t } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

const POS = { kind: 'real', min: 0.5, max: 3 } as const;
const INT = { kind: 'integer', min: -4, max: 4 } as const;
const D = { x: POS, a: POS, m: INT, n: INT };
const mx = math`x`;

// ---------------------------------------------------------------- generators

interface CombineP { a: number; b: number; c: number }

const combine = generator<CombineP>({
  id: 'combine',
  skill: 'Multiply and divide powers of the same base by adding and subtracting indices.',
  // c from 2: x^{1} would be written x.
  params: (rng) => ({ a: int(rng, 2, 9), b: int(rng, 2, 9), c: int(rng, 2, 12) }),
  sane: ({ a, b, c }) => (a >= 2 && a <= 9 && b >= 2 && b <= 9 && c >= 2 && c <= 12 ? null : 'out of range'),
  problem: ({ a, b, c }) => ({
    prompt: t`Write ${math`\frac{x^{${a}} \times x^{${b}}}{x^{${c}}}`} as a single power of ${mx}. What is the [[index|index]]?`,
    answer: { kind: 'exact', expected: String(a + b - c) },
    solution: [
      t`Multiplying powers of the same base adds the indices: ${math`x^{${a}} \times x^{${b}} = x^{${a + b}}`}.`,
      t`Dividing subtracts them: ${math`\frac{x^{${a + b}}}{x^{${c}}} = x^{${a + b} - ${c}} = x^{${a + b - c}}`}. The index is ${a + b - c}.`,
    ],
  }),
  solve: ({ a, b, c }) => {
    // Count the factors of x: a and b on top, c below; each one below cancels one on top.
    const top = Array.from({ length: a + b }, () => 'x');
    return String(top.length - c);
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: String(a * b - c), why: t`Multiplying powers adds the indices, it does not multiply them: ${math`x^{${a}} \times x^{${b}}`} is ${a} factors of ${mx} times ${b} more, so ${a + b} in all.` },
    { response: String(a + b + c), why: t`Dividing by ${math`x^{${c}}`} takes ${c} factors of ${mx} away, so subtract its index.` },
    { response: String(a + b), why: t`That is right for the product. Now divide by ${math`x^{${c}}`} too, which subtracts ${c} from the index.` },
  ],
});

interface PowerP { a: number; b: number; c: number }

const powerOfPower = generator<PowerP>({
  id: 'power-of-power',
  skill: 'Raise a power to a power by multiplying indices.',
  // c from 2: x^{1} would be written x.
  params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 2, 5), c: int(rng, 2, 9) }),
  sane: ({ a, b, c }) => (a >= 2 && a <= 6 && b >= 2 && b <= 5 && c >= 2 && c <= 9 ? null : 'out of range'),
  problem: ({ a, b, c }) => ({
    prompt: t`Write ${math`(x^{${a}})^{${b}} \times x^{${c}}`} as a single power of ${mx}. What is the index?`,
    answer: { kind: 'exact', expected: String(a * b + c) },
    solution: [
      t`A power of a power multiplies the indices: ${math`(x^{${a}})^{${b}} = x^{${a} \times ${b}} = x^{${a * b}}`}, because it is ${b} copies of ${math`x^{${a}}`}.`,
      t`Then multiply by ${math`x^{${c}}`}, adding indices: ${math`x^{${a * b}} \times x^{${c}} = x^{${a * b + c}}`}.`,
    ],
  }),
  solve: ({ a, b, c }) => {
    // Expand: b copies of a factors, then c more.
    let count = 0;
    for (let i = 0; i < b; i++) count += a;
    return String(count + c);
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: String(a + b + c), why: t`${math`(x^{${a}})^{${b}}`} is ${b} copies of ${math`x^{${a}}`} multiplied together, so its index is ${a} times ${b}, not ${a} plus ${b}.` },
    { response: String(a * b * c), why: t`Multiplying by ${math`x^{${c}}`} adds ${c} to the index; only a power of a power multiplies.` },
    { response: String(a * b), why: t`That is right for the bracket. Now multiply by ${math`x^{${c}}`} too, which adds ${c} to the index.` },
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
    const power = qq === 1 ? math`${base}^{${p}}` : math`${base}^{${p}/${qq}}`;
    const steps = [];
    if (qq > 1) steps.push(t`The denominator ${qq} of the index means a root: ${math`${base}^{${1}/${qq}} = ${qq === 2 ? math`\sqrt{${base}}` : math`\sqrt[${qq}]{${base}}`} = ${r}`}, because ${math`${r}^{${qq}} = ${base}`}.`);
    if (p === 0) steps.push(t`Any nonzero number to the power ${0} is ${1}.`);
    else if (p > 0) steps.push(t`Then raise to the power ${p}: ${math`${r}^{${p}} = ${r ** p}`}.`);
    else steps.push(t`A negative index means one over the positive power: ${math`${r}^{${p}} = \frac{${1}}{${r}^{${-p}}} = ${value}`}.`);
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
        { response: '0', why: t`Any nonzero number to the power ${0} is ${1}, not ${0}. Dividing ${math`${base}^{${1}}`} by itself gives ${math`${base}^{${0}}`}, and it equals ${1}.` },
        { response: String(base), why: t`The power ${0} does not leave the number unchanged; the power ${1} does. To the power ${0} the answer is ${1}.` },
      ];
    }
    const out: Misconception[] = [
      { response: str(q(base * p, qq)), why: t`An index is not a multiplier. ${math`${base}^{${p}}`} means ${base} multiplied by itself, and a fractional index means a root.` },
    ];
    if (p < 0) {
      out.push({ response: str(q(-(r ** -p))), why: t`A negative index does not make the answer negative. It means one over the power: ${math`${r}^{${p}} = \frac{${1}}{${r}^{${-p}}}`}.` });
      out.push({ response: str(q(r ** -p)), why: t`Right size, but a negative index means one over the power. Take the reciprocal.` });
    } else {
      out.push({ response: String(r), why: t`That is the root alone. Raise it to the power ${p} as well.` });
      out.push({ response: str(q(base, qq)), why: t`The denominator of the index means a root, not division. ${math`${base}^{${1}/${qq}}`} is the number whose power ${qq} is ${base}.` });
      out.push({ response: String(base ** p), why: t`That raises to the power ${p} but skips the root. The denominator ${qq} of the index means take the root first: ${math`${base}^{${1}/${qq}} = ${r}`}.` });
    }
    return out;
  },
});

interface BaseP { a: number; k: number; neg: boolean }

const newBase = generator<BaseP>({
  id: 'new-base',
  skill: 'Rewrite a power whose index is a multiple of n as a power of n, as 2^(2n) = 4^n in STEP Support Assignment 12 Q1(iv).',
  // Not 2 with 2 or 3 with 3, where the slips below give the right answer and would be marked right.
  params: (rng) => {
    const [a, k] = pick(rng, [[2, 3], [3, 2], [5, 2], [5, 3], [10, 2], [10, 3]] as const);
    return { a, k, neg: rng() < 0.25 };
  },
  sane: ({ a, k }) => ([2, 3, 5, 10].includes(a) && (k === 2 || k === 3) && a !== k ? null : 'out of range'),
  problem: ({ a, k, neg }) => {
    const b: Rational = neg ? q(1, a ** k) : q(a ** k);
    return {
      prompt: neg
        ? t`Write ${math`${a}^{-${k}n}`} in the form ${math`b^{n}`}, for every whole number ${math`n`}. What is ${math`b`}?`
        : t`Write ${math`${a}^{${k}n}`} in the form ${math`b^{n}`}, for every whole number ${math`n`}. What is ${math`b`}?`,
      answer: { kind: 'exact', expected: str(b) },
      solution: [
        t`A power of a power multiplies the indices, so read ${math`${neg ? '-' : ''}${k}n`} as ${math`${neg ? '-' : ''}${k} \times n`}: ${math`${a}^{${neg ? '-' : ''}${k}n} = \left(${a}^{${neg ? '-' : ''}${k}}\right)^{n}`}.`,
        neg
          ? t`${math`${a}^{-${k}} = \frac{${1}}{${a}^{${k}}} = ${b}`}, so ${math`b = ${b}`}.`
          : t`${math`${a}^{${k}} = ${a ** k}`}, so ${math`b = ${a ** k}`}.`,
      ],
    };
  },
  solve: ({ a, k, neg }) => {
    // Find b by trying n = 1, where b^1 is the value itself, then check n = 2 and 3.
    const at = (n: number): Rational => (neg ? q(1, a ** (k * n)) : q(a ** (k * n)));
    const b = at(1);
    const ok = [2, 3].every((n) => str(at(n)) === str(q(b.num ** BigInt(n), b.den ** BigInt(n))));
    return ok ? str(b) : 'none';
  },
  misconceptions: ({ a, k, neg }): Misconception[] => [
    { response: neg ? str(q(-a * k)) : String(a * k), why: t`The index multiplies, but the base does not: ${math`${a}^{${k}}`} is ${a} multiplied by itself ${k} times, not ${math`${a} \times ${k}`}.` },
    { response: String(k ** a), why: t`Base and index are swapped: the base is ${a}, so ${math`b = ${a}^{${neg ? '-' : ''}${k}}`}.` },
    ...(neg ? [{ response: String(-(a ** k)), why: t`A negative index gives a reciprocal, not a negative number: ${math`${a}^{-${k}} = \frac{${1}}{${a}^{${k}}}`}.` }] : []),
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a12Proof = workedProof({
  title: t`${math`${2}^{${2}n} - ${1}`} is divisible by ${3}`,
  prompt: t`Show that ${math`${2}^{${2}n} - ${1}`} is divisible by ${3} for every positive integer ${math`n`}.`,
  steps: [
    t`A power of a power multiplies the indices, so ${math`${2}^{${2}n} = \left(${2}^{${2}}\right)^{n} = ${4}^{n}`}. The question is about ${math`${4}^{n} - ${1}`}.`,
    t`The hints take another route through the same law: ${math`${2}^{${2}n} = \left(${2}^{n}\right)^{${2}}`}, so ${math`${2}^{${2}n} - ${1} = (${2}^{n} - ${1})(${2}^{n} + ${1})`}, a difference of two squares.`,
    t`Now ${math`${2}^{n} - ${1}`}, ${math`${2}^{n}`}, ${math`${2}^{n} + ${1}`} are three consecutive integers, so one of them is divisible by ${3}. It is not ${math`${2}^{n}`}, whose only prime factor is ${2}.`,
    t`So ${3} divides ${math`${2}^{n} - ${1}`} or ${math`${2}^{n} + ${1}`}, and hence their product ${math`${2}^{${2}n} - ${1}`}. (The hints warn against a shortcut: two consecutive odd numbers need not include a multiple of ${3}, as ${5} and ${7} show.)`,
  ],
  answer: t`${math`${2}^{${2}n} - ${1} = ${4}^{n} - ${1}`} is a multiple of ${3} for every ${math`n`}: for example ${math`${4}^{${3}} - ${1} = ${4 ** 3 - 1} = ${3} \times ${(4 ** 3 - 1) / 3}`}.`,
  source: cite('step-f12', 'Q1(iv)'),
});

const SW = 'cst-dm-sw1';
const sw123verdict = auto({
  id: 'sw-1-2-3-verdict',
  source: cite(SW, 'Exercises 1, 1.2.3'),
  title: t`Prove or disprove: ${math`${2}`} divides ${math`${2}^{n}`}`,
  prompt: t`Prove or disprove: for all natural numbers ${math`n`}, ${math`${2}`} divides ${math`${2}^{n}`}. (In this course ${math`\mathbb{N}`} starts at ${0}.)`,
  answer: {
    kind: 'choice',
    options: [{ id: 'true', label: t`True for every natural number` }, { id: 'false', label: t`False: some natural number fails` }],
    correct: 'false',
  },
  solution: [
    t`At ${math`n = ${0}`}, ${math`${2}^{${0}} = ${1}`}, the [[zero-index|zero index]] rule, and ${2} does not divide ${1}.`,
    t`So the statement is false, though it holds for every ${math`n \ge ${1}`}. The official solution adds that this is a gentle reminder that ${0} is a natural number.`,
  ],
  reference: 'false',
  verify: () => same('the first n in 0..20 with 2^n odd', Array.from({ length: 21 }, (_, n) => n).find((n) => 2 ** n % 2 !== 0), 0),
  misconceptions: [{ response: 'true', why: t`Check the smallest natural number. ${math`\mathbb{N}`} starts at ${0} here, and ${math`${2}^{${0}} = ${1}`}.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.2.3'), answer: 'false', agrees: true },
});
const sw123witness = auto({
  id: 'sw-1-2-3-witness',
  source: cite(SW, 'Exercises 1, 1.2.3', true),
  title: t`The counterexample`,
  prompt: t`Find a natural number ${math`n`} for which ${math`${2}`} does not divide ${math`${2}^{n}`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['n'], example: '0',
    check: ([v]) => {
      const n = v as Rational;
      if (n.den !== 1n || n.num < 0n) return 'A natural number is a whole number, at least 0.';
      return n.num === 0n ? null : `${n.num} is at least 1, so 2^${n.num} has 2 as a factor.`;
    },
  },
  solution: [t`${math`n = ${0}`}: ${math`${2}^{${0}} = ${1}`}, and ${2} does not divide ${1}. Every larger ${math`n`} gives a multiple of ${2}.`],
  reference: 'n = 0',
  verify: () => same('the only n in 0..30 that fails', Array.from({ length: 31 }, (_, n) => n).filter((n) => 2 ** n % 2 !== 0).join(), '0'),
  misconceptions: [{ response: '1', why: t`${math`${2}^{${1}} = ${2}`}, which ${2} divides. Try the smallest natural number.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.2.3'), answer: '0', agrees: true },
});

const a12Q1iii = supervision({
  id: 'a12-q1-iii',
  source: cite('step-f12', 'Q1(iii)'),
  title: t`${math`n^{${5}} - n^{${3}}`} and ${24}`,
  prompt: t`Show that ${math`n^{${5}} - n^{${3}}`} is divisible by ${24} for every positive integer ${math`n`}. Start by taking out the largest power of ${math`n`} you can.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(iii)'),
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q12-ii (20 marks):
 * 1. Spots 91 = 7 x 13 and writes 2^91 = (2^7)^13 = 128^13 by the power of a power law (6).
 * 2. Factor x^13 - 1 = (x - 1)(x^12 + x^11 + ... + x + 1), checked by expanding (the middle terms
 *    cancel in pairs) (6). Or: 128 leaves remainder 1 on division by 127, so 128^13 does too.
 * 3. So 127 = 2^7 - 1 divides 2^91 - 1 (4).
 * 4. 1 < 127 < 2^91 - 1, so it is a proper factor and 2^91 - 1 is not prime (4). (8191 = 2^13 - 1
 *    works the same way.)
 */
const ns2q12ii = supervision({
  id: 'ns2-q12-ii',
  source: cite('ia-ns-sheet-2', 'Q12, second part'),
  title: t`A large number that is not prime`,
  prompt: t`Show that ${math`${2}^{${91}} - ${1}`} is not prime.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const [mm, mn] = [math`m`, math`n`];

export const indices: TopicContent = {
  topicId: 'pre.indices',
  goal: t`Multiply, divide, and raise powers, including zero, negative, and fractional indices.`,
  objective: t`Multiply, divide, and raise powers, and say what zero, negative, and fractional indices mean.`,
  why: t`Every later topic writes numbers as powers; STEP questions turn on rewriting one power as another.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Copies of a number` },
    { kind: 'hook', text: t`${math`${2}^{${3}}`} means three ${2}s multiplied together. So what could ${math`${2}^{${0}}`} mean, zero ${2}s multiplied together? Or ${math`${2}^{-${1}}`}, minus one of them? Or ${math`${8}^{${2}/${3}}`}? None of these makes sense as counting copies. Yet each has exactly one sensible value, and the way to find it is to insist that the rules keep working.` },

    { kind: 'section', title: t`Powers and the three laws` },
    { kind: 'definition', name: t`Power`, formal: t`For a real number ${mx} and a positive integer ${mn}, ${dmath`x^{n} = \underbrace{x \times x \times \cdots \times x}_{n \text{ copies}}.`} ${mx} is the [[base|base]] and ${mn} is the [[index|index]] (or exponent).`, plain: t`A [[power|power]] is repeated multiplication: ${math`${2}^{${5}} = ${2} \times ${2} \times ${2} \times ${2} \times ${2} = ${2 ** 5}`}, five copies of the base ${2}.` },
    { kind: 'theorem', name: t`Laws of indices`, statement: t`For a real number ${mx} and positive integers ${mm}, ${mn}: (i) ${ident('x^m * x^n', 'x^(m + n)', ['x', 'm', 'n'], D)}; (ii) ${ident('(x^m)^n', 'x^(m n)', ['x', 'm', 'n'], D)}; (iii) if ${math`x \ne ${0}`} and ${math`m > n`}, ${ident('x^m / x^n', 'x^(m - n)', ['x', 'm', 'n'], D)}.` },
    { kind: 'narrative', text: t`Each law is just counting copies. Try it with numbers first: ${math`${2}^{${3}} \times ${2}^{${4}} = ${2 ** 3} \times ${2 ** 4} = ${2 ** 7}`}, and ${math`${2}^{${7}} = ${2 ** 7}`} too.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply`, text: t`${math`x^{m} \times x^{n}`} is ${mm} copies of ${mx} followed by ${mn} more copies: ${math`m + n`} copies in all, which is ${math`x^{m + n}`}.`, plain: t`${math`${2}^{${3}} \times ${2}^{${4}}`} is ${math`(${2} \times ${2} \times ${2}) \times (${2} \times ${2} \times ${2} \times ${2})`}: seven ${2}s.` },
        { label: t`Power of a power`, text: t`${math`(x^{m})^{n}`} is ${mn} blocks, each of ${mm} copies: ${math`mn`} copies in all, which is ${math`x^{mn}`}.`, plain: t`${math`(${2}^{${3}})^{${2}} = (${2} \times ${2} \times ${2}) \times (${2} \times ${2} \times ${2}) = ${2}^{${6}}`}.` },
        { label: t`Divide`, text: t`In ${math`x^{m}/x^{n}`}, each of the ${mn} copies on the bottom cancels one of the ${mm} copies on top (allowed, since ${math`x \ne ${0}`}), leaving ${math`m - n`} copies: ${math`x^{m - n}`}.`, plain: t`${math`\frac{${2}^{${6}}}{${2}^{${2}}} = \frac{${2 ** 6}}{${2 ** 2}} = ${2 ** 4} = ${2}^{${4}}`}.` },
      ],
    },
    checkFrom(combine, { a: 6, b: 3, c: 4 }, t`Add the indices on top, ${math`${6} + ${3} = ${9}`}, then subtract the bottom one: ${math`${9} - ${4} = ${5}`}.`),

    { kind: 'section', title: t`Zero and negative indices` },
    { kind: 'narrative', text: t`Law (iii) needed ${math`m > n`}. What if we want it to hold for ${math`m = n`} too? Then ${math`x^{n}/x^{n} = x^{${0}}`}. But anything nonzero divided by itself is ${1}. So if the law is to survive, there is only one choice.` },
    { kind: 'definition', name: t`Zero and negative indices`, formal: t`For ${math`x \ne ${0}`} and a positive integer ${mn}, ${math`x^{${0}} = ${1}`} and ${math`x^{-n} = \frac{${1}}{x^{n}}`}.`, plain: t`The [[zero-index|zero index]] gives ${1}; a [[negative-index|negative index]] means one over the power. So ${math`${2}^{-${3}} = \frac{${1}}{${2 ** 3}}`}: a small positive number, not a negative one.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Why ${math`x^{${0}} = ${1}`}`, text: t`Law (i) with ${math`m = ${0}`} would say ${math`x^{${0}} \times x^{n} = x^{n}`}. Divide both sides by ${math`x^{n}`}, which is not ${0}: ${math`x^{${0}} = ${1}`}.` },
        { label: t`Why ${math`x^{-n} = ${1}/x^{n}`}`, text: t`Law (i) with ${math`m = -n`} would say ${math`x^{-n} \times x^{n} = x^{${0}} = ${1}`}. Divide by ${math`x^{n}`}: ${math`x^{-n} = \frac{${1}}{x^{n}}`}.`, plain: t`Check with numbers: ${math`\frac{${2}^{${2}}}{${2}^{${5}}} = \frac{${4}}{${32}} = ${q(1, 8)}`}, and the division law says ${math`${2}^{${2} - ${5}} = ${2}^{-${3}}`}.` },
        { label: t`The laws still hold`, text: t`With these definitions, laws (i) to (iii) hold for all integers ${mm}, ${mn} and every ${math`x \ne ${0}`}, with no condition ${math`m > n`}.`, why: { q: t`Do we need to check that?`, a: t`Yes, and it is a case check: for example, if ${math`m > ${0} > -n`}, write ${math`x^{m} \times x^{-n} = x^{m}/x^{n}`} and use law (iii) or its mirror image. The definitions were chosen so that every case works.` } },
      ],
    },
    { kind: 'p', text: t`The zero index matters in proofs. A CST supervision exercise asks whether ${2} divides ${math`${2}^{n}`} for every natural number ${mn}. In that course ${math`\mathbb{N}`} starts at ${0}, and ${math`${2}^{${0}} = ${1}`}, which ${2} does not divide.` },

    { kind: 'section', title: t`Fractional indices` },
    { kind: 'narrative', text: t`Now push law (ii) further. What should ${math`${9}^{${1}/${2}}`} be? If law (ii) is to hold, ${math`\left(${9}^{${1}/${2}}\right)^{${2}} = ${9}^{${1}} = ${9}`}. So ${math`${9}^{${1}/${2}}`} is a number whose square is ${9}: we take the positive one, ${Math.sqrt(9)}.` },
    { kind: 'definition', name: t`Fractional index`, formal: t`For ${math`x > ${0}`}, integers ${mm} and ${math`n \ge ${1}`}, ${math`x^{${1}/n}`} is the positive ${mn}th root ${math`\sqrt[n]{x}`}, and ${dmath`x^{m/n} = \left(\sqrt[n]{x}\right)^{m}.`}`, plain: t`A [[fractional-index|fractional index]] is a root, then a power: the bottom of the fraction says which root, the top says which power. ${math`${8}^{${2}/${3}} = (\sqrt[${3}]{${8}})^{${2}} = ${Math.cbrt(8)}^{${2}} = ${Math.cbrt(8) ** 2}`}.` },
    { kind: 'p', text: t`Take the root first when you can: the numbers stay small. ${math`${8}^{${2}/${3}}`} the other way round is ${math`\sqrt[${3}]{${8}^{${2}}} = \sqrt[${3}]{${64}} = ${4}`}: the same, with a harder root.`, why: { q: t`Why does the definition need ${math`x > ${0}`}?`, a: t`Even roots of negative numbers are not real: there is no real ${math`(-${4})^{${1}/${2}}`}. Restricting to ${math`x > ${0}`} keeps every law true.` } },
    checkFrom(evaluate, { r: 4, qq: 2, p: -3 }, t`The ${2} in the denominator means a square root: ${math`\sqrt{${16}} = ${4}`}. Then the power ${math`-${3}`}: ${math`${4}^{-${3}} = \frac{${1}}{${64}}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`x^{m} + x^{n} = x^{m + n}`}.`, counterexample: t`${math`${2}^{${2}} + ${2}^{${3}} = ${4} + ${8} = ${4 + 8}`}, while ${math`${2}^{${5}} = ${32}`}. The laws are about multiplying powers, not adding them.` },
    { kind: 'pitfall', claim: t`A negative index makes the number negative.`, counterexample: t`${math`${2}^{-${1}} = ${q(1, 2)}`}, which is positive. A negative index means a reciprocal.` },
    { kind: 'pitfall', claim: t`${math`(a + b)^{n} = a^{n} + b^{n}`}.`, counterexample: t`${math`(${1} + ${1})^{${2}} = ${4}`}, but ${math`${1}^{${2}} + ${1}^{${2}} = ${2}`}. Powers spread over products, ${math`(ab)^{n} = a^{n}b^{n}`}, never over sums.` },
    { kind: 'narrative', text: t`The Cambridge worked example below, from STEP Support Assignment ${12}, uses law (ii) in both directions: ${math`${2}^{${2}n}`} is ${math`${4}^{n}`}, and it is also ${math`(${2}^{n})^{${2}}`}, and the second view unlocks the proof.` },
    { kind: 'takeaway', text: t`Indices add when you multiply powers, multiply when you raise a power, and zero, negative, and fractional indices mean whatever keeps those laws true.` },
  ],
  examples: [
    worked(combine, { a: 5, b: 4, c: 7 }, t`Multiplying and dividing powers`),
    worked(evaluate, { r: 3, qq: 3, p: -2 }, t`A negative fractional index`),
    worked(powerOfPower, { a: 3, b: 4, c: 2 }, t`A power of a power`),
    { ...a12Proof, examiner: t`The examiner looks for the rewrite as a difference of two squares, and a reason why one of three consecutive integers is a multiple of ${3}.` },
  ],
  generators: [combine, powerOfPower, evaluate, newBase],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['power', 'base', 'index', 'zero-index', 'negative-index', 'fractional-index'],
  cambridge: [sw123verdict, sw123witness, a12Q1iii, ns2q12ii],
  // The IA question first (it needs the power of a power law to see the factor), then the STEP proof;
  // the true or false verdict is dropped, since a guess passes it half the time.
  gate: ['ns2-q12-ii', 'a12-q1-iii'],
  recall: [
    { front: t`The three laws of indices.`, back: t`${math`x^{m}x^{n} = x^{m + n}`}, ${math`(x^{m})^{n} = x^{mn}`}, ${math`x^{m}/x^{n} = x^{m - n}`}.` },
    { front: t`What are ${math`x^{${0}}`} and ${math`x^{-n}`}, for ${math`x \ne ${0}`}?`, back: t`${math`x^{${0}} = ${1}`} and ${math`x^{-n} = ${1}/x^{n}`}: the only values that keep the laws true.` },
    { front: t`What is ${math`x^{m/n}`}, for ${math`x > ${0}`}?`, back: t`${math`(\sqrt[n]{x})^{m}`}: the ${mn}th root, raised to the power ${mm}.` },
  ],
  proofOrder: [{
    title: t`Why ${math`x^{-n} = ${1}/x^{n}`}`,
    steps: [
      t`Ask that the law ${math`x^{a}x^{b} = x^{a + b}`} hold for all integers.`,
      t`With ${math`a = ${0}`}: ${math`x^{${0}}x^{n} = x^{n}`}, so ${math`x^{${0}} = ${1}`}.`,
      t`With ${math`a = -n`}: ${math`x^{-n}x^{n} = x^{${0}} = ${1}`}.`,
      t`Divide by ${math`x^{n}`}, which is not zero: ${math`x^{-n} = ${1}/x^{n}`}.`,
    ],
  }],
};
