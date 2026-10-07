/**
 * alg.exponential-equations: solve equations in a^x by substituting y = a^x to get a
 * polynomial, keeping only positive y, and solve a^x = b with logarithms. Sources: STEP
 * Support Foundation Assignment 11 Q2(i) and Q4. Integer answers are found by searching
 * integers exactly; logarithmic answers by bisection, independently of the log formula.
 */
import { auto, cite, same, withUses } from '../cambridge';
import { int, pick, q } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { namedAnswer, setAnswer, withExaminer } from '../prep-a';

/** Bisection for an increasing or decreasing f on [lo, hi] with a sign change. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let [a, b] = [lo, hi];
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (Math.sign(f(m)) === Math.sign(f(a))) a = m; else b = m; }
  return (a + b) / 2;
}
const sig = (x: number): number => Number(x.toPrecision(4));

// ---------------------------------------------------------------- a quadratic in a^x

interface HqP { base: number; m: number; n: number; neg: boolean }
const ys = (p: HqP): [number, number] => [p.base ** p.m, p.neg ? -(p.base ** p.n) : p.base ** p.n];
const sols = (p: HqP): number[] => (p.neg ? [p.m] : [p.m, p.n]);

const hiddenQuadratic = generator<HqP>({
  id: 'hidden-quadratic',
  skill: 'Solve an equation in a^(2x) and a^x by substituting y = a^x, rejecting any negative value of y.',
  params: (rng) => {
    for (;;) {
      const base = pick(rng, [2, 3]);
      const p: HqP = { base, m: int(rng, 0, base === 2 ? 4 : 3), n: int(rng, 0, base === 2 ? 4 : 3), neg: rng() < 0.4 };
      if (!p.neg && p.m === p.n) continue;
      if (p.neg && p.m === 0) continue;
      const [y1, y2] = ys(p);
      if (p.neg ? y1 !== p.m : !(y1 === p.m && y2 === p.n) && !(y1 === p.n && y2 === p.m)) return p;
    }
  },
  sane: ({ m, n }) => (m >= 0 && n >= 0 ? null : 'out of range'),
  problem: (p) => {
    const [y1, y2] = ys(p);
    const s = y1 + y2;
    const pr = y1 * y2;
    const B = p.base;
    const mid = s === 0 ? '' : `${s > 0 ? '-' : '+'} ${Math.abs(s) === 1 ? '' : `${Math.abs(s)} \\times `}${B}^{x}`;
    const eq = computedTex(`${B}^{${2}x} ${mid} ${pr < 0 ? '-' : '+'} ${Math.abs(pr)} = ${0}`);
    const lin = (r: number): string => (r < 0 ? `y + ${-r}` : `y - ${r}`);
    return {
      prompt: t`Find every real ${math`x`} with ${eq}.`,
      answer: setAnswer(sols(p).map((x) => q(x)), 'Put y = a^x, solve for y, then turn each positive y back into x.'),
      solution: [
        t`${math`${B}^{${2}x} = (${B}^{x})^{${2}}`}, so put ${math`y = ${B}^{x}`}: ${computedTex(`(${lin(y1)})(${lin(y2)}) = ${0}`)}, so ${math`y = ${y1}`} or ${math`y = ${y2}`}.`,
        p.neg
          ? t`${math`${B}^{x} > ${0}`} for every real ${math`x`}, so ${math`y = ${y2}`} is impossible. ${math`${B}^{x} = ${y1}`} gives ${math`x = ${p.m}`}.`
          : t`${math`${B}^{x} = ${y1}`} gives ${math`x = ${p.m}`}, and ${math`${B}^{x} = ${y2}`} gives ${math`x = ${p.n}`}.`,
      ],
    };
  },
  solve: (p) => {
    const [y1, y2] = ys(p);
    const out: number[] = [];
    for (let x = -6; x <= 8; x++) { const u = p.base ** x; if (u * u - (y1 + y2) * u + y1 * y2 === 0) out.push(x); }
    return out.join(', ');
  },
  misconceptions: (p): Misconception[] => {
    const [y1, y2] = ys(p);
    return p.neg
      ? [
          { response: String(y1), why: t`${y1} is the value of ${math`y = ${p.base}^{x}`}; turn it back into ${math`x`}.` },
          { response: String(-p.m), why: t`${math`${p.base}^{x} = ${y1}`} gives ${math`x = ${p.m}`}, a positive power.` },
        ]
      : [
          { response: `${y1}, ${y2}`, why: t`Those are the values of ${math`y = ${p.base}^{x}`}. Find the powers: ${math`${p.base}^{x} = ${y1}`} means ${math`x = ${p.m}`}.` },
          { response: `${-p.m}, ${-p.n}`, why: t`${math`${p.base}^{${p.m}} = ${y1}`}: the power is ${p.m}, not ${-p.m}.` },
        ];
  },
});

// ---------------------------------------------------------------- a^(x + b) = c

interface ShP { a: number; b: number; c: number }
const shAns = ({ a, b, c }: ShP): number => Math.log(c) / Math.log(a) - b;

const shifted = generator<ShP>({
  id: 'shifted-power',
  skill: 'Solve a^(x + b) = c by taking logarithms, then subtracting b.',
  params: (rng) => {
    for (;;) {
      const p: ShP = { a: pick(rng, [2, 3, 5, 7]), b: pick(rng, [-3, -2, -1, 1, 2, 3]), c: int(rng, 3, 60) };
      const x = shAns(p);
      const far = (m: number): boolean => Math.abs(m - x) > 0.01 * Math.max(1, Math.abs(x));
      if (!Number.isInteger(Math.round(Math.log(p.c) / Math.log(p.a) * 1e9) / 1e9) && far(x + 2 * p.b) && far(Math.log(p.c / p.a) - p.b)) return p;
    }
  },
  sane: (p) => (p.a > 1 && p.c > 0 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`Solve ${math`${p.a}^{x ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b)}} = ${p.c}`}, giving ${math`x`} to ${4} significant figures.`,
    answer: { kind: 'numeric', expected: sig(shAns(p)), relTol: 1e-3 },
    solution: [
      t`Take logarithms: ${math`(x ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b)})\ln ${p.a} = \ln ${p.c}`}, so ${math`x ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b)} = \frac{\ln ${p.c}}{\ln ${p.a}}`}.`,
      t`So ${math`x = \frac{\ln ${p.c}}{\ln ${p.a}} ${p.b < 0 ? '+' : '-'} ${Math.abs(p.b)} \approx ${sig(shAns(p))}`}.`,
    ],
  }),
  solve: (p) => String(Number(bisect((x) => p.a ** (x + p.b) - p.c, -20, 20).toPrecision(6))),
  misconceptions: (p): Misconception[] => [
    { response: String(sig(shAns(p) + 2 * p.b)), why: t`To undo ${math`x ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b)}`}, ${p.b < 0 ? 'add' : 'subtract'} ${Math.abs(p.b)}: the sign changes as it moves across.` },
    { response: String(sig(Math.log(p.c / p.a) - p.b)), why: t`${math`\frac{\ln ${p.c}}{\ln ${p.a}}`} is not ${math`\ln\frac{${p.c}}{${p.a}}`}: divide the logarithms.` },
  ],
});

// ---------------------------------------------------------------- two bases

interface TbP { a: number; b: number; k: number }
/** a^x = b^(x - k): x ln a = (x - k) ln b, x = k ln b / (ln b - ln a). */
const tbAns = ({ a, b, k }: TbP): number => (k * Math.log(b)) / (Math.log(b) - Math.log(a));

const twoBases = generator<TbP>({
  id: 'two-bases',
  skill: 'Solve an equation with two different bases by taking logarithms of both sides and collecting the x terms.',
  params: (rng) => {
    for (;;) {
      const [a, b] = [pick(rng, [2, 3, 5]), pick(rng, [3, 5, 7])];
      const p: TbP = { a, b, k: pick(rng, [1, 2, 3, -1, -2]) };
      if (a === b) continue;
      const x = tbAns(p);
      const far = (m: number): boolean => Math.abs(m - x) > 0.01 * Math.max(1, Math.abs(x));
      if (far((p.k * Math.log(b)) / (Math.log(b) + Math.log(a))) && far((p.k * Math.log(a)) / (Math.log(b) - Math.log(a)))) return p;
    }
  },
  sane: (p) => (p.a !== p.b ? null : 'same base'),
  problem: (p) => ({
    prompt: t`Solve ${math`${p.a}^{x} = ${p.b}^{x ${p.k < 0 ? '+' : '-'} ${Math.abs(p.k)}}`}, giving ${math`x`} to ${4} significant figures.`,
    answer: { kind: 'numeric', expected: sig(tbAns(p)), relTol: 1e-3 },
    solution: [
      t`Take logarithms: ${math`x\ln ${p.a} = (x ${p.k < 0 ? '+' : '-'} ${Math.abs(p.k)})\ln ${p.b}`}.`,
      t`Collect the ${math`x`} terms: ${math`x(\ln ${p.b} - \ln ${p.a}) = ${p.k}\ln ${p.b}`}, so ${math`x = \frac{${p.k}\ln ${p.b}}{\ln ${p.b} - \ln ${p.a}} \approx ${sig(tbAns(p))}`}.`,
    ],
  }),
  solve: (p) => String(Number(bisect((x) => x * Math.log(p.a) - (x - p.k) * Math.log(p.b), -100, 100).toPrecision(6))),
  misconceptions: (p): Misconception[] => [
    { response: String(sig((p.k * Math.log(p.b)) / (Math.log(p.b) + Math.log(p.a)))), why: t`Moving ${math`x\ln ${p.a}`} across changes its sign: the bracket is ${math`\ln ${p.b} - \ln ${p.a}`}.` },
    { response: String(sig((p.k * Math.log(p.a)) / (Math.log(p.b) - Math.log(p.a)))), why: t`The constant term comes from ${math`(x - k)\ln ${p.b}`}: it is ${math`k\ln ${p.b}`}, with the base on the shifted side.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a11q2 = auto({
  id: 'a11-q2-i',
  source: cite('step-f11', 'Q2(i)'),
  title: t`A quadratic in ${math`${2}^{x}`}`,
  prompt: t`By using the substitution ${math`y = ${2}^{x}`}, find the real value of ${math`x`} that satisfies ${math`${4}^{x} - ${7} \times ${2}^{x} - ${8} = ${0}`}.`,
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`${math`${4}^{x} = (${2}^{${2}})^{x} = (${2}^{x})^{${2}} = y^{${2}}`}, so ${math`y^{${2}} - ${7}y - ${8} = (y - ${8})(y + ${1}) = ${0}`}.`,
    t`${math`y = ${2}^{x}`} is positive, so ${math`y = -${1}`} is impossible. ${math`${2}^{x} = ${8}`} gives ${math`x = ${3}`}.`,
  ],
  reference: '3',
  verify: () => same('integer solutions', [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].filter((x) => 4 ** x - 7 * 2 ** x - 8 === 0).join(','), '3'),
  misconceptions: [{ response: '8', why: t`${8} is the value of ${math`y = ${2}^{x}`}; the question asks for ${math`x`}.` }],
  official: { source: cite('step-f11-hints', 'Q2(i)'), answer: '3', agrees: true },
});

const a11q4i = auto({
  id: 'a11-q4-i',
  source: cite('step-f11', 'Q4(i)'),
  title: t`Powers of ${2} and ${3}`,
  prompt: t`Given that ${math`${2}^{m + ${1}} + ${2}^{m} = ${3}^{n + ${2}} - ${3}^{n}`}, where ${math`m`} and ${math`n`} are integers, find ${math`m`} and ${math`n`}.`,
  answer: namedAnswer(['m', 'n'], [q(3), q(1)], 'Factor out 2^m and 3^n.'),
  solution: [
    t`Factorise: ${math`${2}^{m}(${2} + ${1}) = ${3}^{n}(${9} - ${1})`}, that is ${math`${3} \times ${2}^{m} = ${8} \times ${3}^{n}`}.`,
    t`So ${math`${2}^{m - ${3}} = ${3}^{n - ${1}}`}. A power of ${2} equals a power of ${3} only when both are ${1}, by unique factorisation: ${math`m - ${3} = ${0}`} and ${math`n - ${1} = ${0}`}.`,
    t`So ${math`m = ${3}`} and ${math`n = ${1}`}: ${math`${16} + ${8} = ${24} = ${27} - ${3}`}.`,
  ],
  reference: 'm = 3, n = 1',
  verify: () => {
    const found: string[] = [];
    for (let m = -8; m <= 12; m++) for (let n = -8; n <= 12; n++) if (Math.abs(2 ** (m + 1) + 2 ** m - (3 ** (n + 2) - 3 ** n)) < 1e-12) found.push(`${m},${n}`);
    return same('integer pairs', found.join(';'), '3,1');
  },
  misconceptions: [{ response: 'm = 1, n = 3', why: t`${math`m`} goes with the powers of ${2}: ${math`${2}^{${1} + ${1}} + ${2}^{${1}} = ${6}`}, but ${math`${3}^{${5}} - ${3}^{${3}} = ${216}`}.` }],
  official: { source: cite('step-f11-hints', 'Q4(i)'), answer: 'm = 3, n = 1', agrees: true },
});

const a11q4ii = auto({
  id: 'a11-q4-ii',
  source: cite('step-f11', 'Q4(ii)'),
  title: t`Three bases at once`,
  prompt: t`Find the values of ${math`x`} that satisfy ${math`${3}^{${2}x} - ${34} \times ${15}^{x - ${1}} + ${5}^{${2}x} = ${0}`}.`,
  answer: setAnswer([q(1), q(-1)], 'Write 15^(x - 1) as 3^x 5^x / 15 and divide through by 5^(2x).'),
  solution: [
    t`${math`${15}^{x - ${1}} = \frac{${3}^{x}${5}^{x}}{${15}}`}. Multiply by ${15}: ${math`${15}(${3}^{x})^{${2}} - ${34} \times ${3}^{x}${5}^{x} + ${15}(${5}^{x})^{${2}} = ${0}`}.`,
    t`Divide by ${math`(${5}^{x})^{${2}}`}, which is positive, and put ${math`u = \left(\frac{${3}}{${5}}\right)^{x}`}: ${math`${15}u^{${2}} - ${34}u + ${15} = (${3}u - ${5})(${5}u - ${3}) = ${0}`}.`,
    t`${math`u = \frac{${5}}{${3}}`} gives ${math`x = -${1}`}, and ${math`u = \frac{${3}}{${5}}`} gives ${math`x = ${1}`}.`,
  ],
  reference: '1, -1',
  verify: () => {
    const f = (x: number): number => 3 ** (2 * x) - 34 * 15 ** (x - 1) + 5 ** (2 * x);
    const roots = [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter((x) => Math.abs(f(x)) < 1e-9);
    return same('integer roots', roots.join(','), '-1,1');
  },
  misconceptions: [{ response: '5/3, 3/5', why: t`Those are the values of ${math`u = \left(\frac{${3}}{${5}}\right)^{x}`}. Turn each back into ${math`x`}.` }],
  official: { source: cite('step-f11-hints', 'Q4(ii)'), answer: '1, -1', agrees: true },
});

// ---------------------------------------------------------------- lesson

export const exponentialEquations: TopicContent = {
  topicId: 'alg.exponential-equations',
  goal: t`Solve equations in ${math`a^{x}`} by substituting ${math`y = a^{x}`} to get a polynomial, keeping only positive ${math`y`}, and solve ${math`a^{x} = b`} with logarithms.`,
  objective: t`Solve exponential equations by substitution and by taking logarithms.`,
  why: t`Exponential equations in disguise appear in STEP pure and statistics questions alike.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`${math`${4}^{x} - ${7} \times ${2}^{x} - ${8} = ${0}`} looks nothing like a quadratic. But ${math`${4}^{x}`} is ${math`(${2}^{x})^{${2}}`}. Call ${math`${2}^{x}`} by a new name, ${math`y`}, and the equation becomes ${math`y^{${2}} - ${7}y - ${8} = ${0}`}.` },
    { kind: 'narrative', text: t`That gives ${math`y = ${8}`} or ${math`y = -${1}`}. The first gives ${math`x = ${3}`}. The second gives nothing at all, because a power of ${2} is never negative. Spotting the hidden polynomial, and then throwing away the impossible roots, is the whole method.` },
    { kind: 'section', title: t`Substitution` },
    {
      kind: 'definition',
      name: t`Exponential equation`,
      formal: t`An [[exponential-equation|exponential equation]] is an equation in which the unknown appears in an exponent, such as ${math`a^{x} = b`} or ${math`a^{${2}x} + pa^{x} + q = ${0}`} with ${math`a > ${0}`}, ${math`a \ne ${1}`}.`,
      plain: t`The unknown is in the power. ${math`${2}^{x} = ${8}`} is one; ${math`x^{${2}} = ${8}`} is not.`,
    },
    { kind: 'theorem', name: t`Positivity and one-to-one`, statement: t`For ${math`a > ${0}`}, ${math`a \ne ${1}`}: ${math`a^{x} > ${0}`} for every real ${math`x`}, and ${math`a^{x} = a^{t}`} only when ${math`x = t`}. For ${math`b > ${0}`}, ${math`a^{x} = b`} has the unique solution ${math`x = \frac{\ln b}{\ln a}`}; for ${math`b \le ${0}`} it has none.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write it with e`, text: t`${math`a^{x} = e^{x\ln a}`}, and ${math`e^{u} > ${0}`} for every ${math`u`}, so ${math`a^{x} > ${0}`}.`, why: { q: t`Why is ${math`a^{x} = e^{x\ln a}`}?`, a: t`${math`a = e^{\ln a}`}, so ${math`a^{x} = (e^{\ln a})^{x} = e^{x\ln a}`} by the index law.` } },
        { label: t`One-to-one`, text: t`If ${math`a^{x} = a^{t}`}, take ${math`\ln`}: ${math`x\ln a = t\ln a`}, and ${math`\ln a \ne ${0}`} because ${math`a \ne ${1}`}, so ${math`x = t`}.` },
        { label: t`Solving`, text: t`If ${math`b > ${0}`}: ${math`a^{x} = b`} exactly when ${math`x\ln a = \ln b`}, that is ${math`x = \frac{\ln b}{\ln a}`}. If ${math`b \le ${0}`}, the first step rules out every ${math`x`}.` },
      ],
    },
    checkFrom(hiddenQuadratic, { base: 2, m: 3, n: 0, neg: true }, t`With ${math`y = ${2}^{x}`}: ${math`(y - ${8})(y + ${1}) = ${0}`}. Only ${math`y = ${8}`} is possible, so ${math`x = ${3}`}.`),
    { kind: 'pitfall', claim: t`${math`${2}^{x} = -${1}`} has the solution ${math`x = \frac{\ln(-${1})}{\ln ${2}}`}.`, counterexample: t`${math`\ln(-${1})`} does not exist, and ${math`${2}^{x}`} is positive for every real ${math`x`}. The equation has no real solution.` },
    { kind: 'section', title: t`Logarithms, and two bases` },
    { kind: 'narrative', text: t`When the power is not a whole number, take logarithms. ${math`${3}^{x + ${1}} = ${20}`} gives ${math`(x + ${1})\ln ${3} = \ln ${20}`}, so ${math`x = \frac{\ln ${20}}{\ln ${3}} - ${1}`}. With two bases, such as ${math`${2}^{x} = ${3}^{x - ${1}}`}, take logarithms of both sides and collect the ${math`x`} terms. A third trick handles terms like ${math`${15}^{x}`}: write it as ${math`${3}^{x}${5}^{x}`} and divide through by a power, so a single ratio such as ${math`\left(\frac{${3}}{${5}}\right)^{x}`} is left.` },
    checkFrom(shifted, { a: 3, b: 1, c: 20 }, t`${math`x = \frac{\ln ${20}}{\ln ${3}} - ${1} \approx ${sig(Math.log(20) / Math.log(3) - 1)}`}.`),
    { kind: 'takeaway', text: t`Spot ${math`a^{${2}x} = (a^{x})^{${2}}`} and substitute ${math`y = a^{x}`}; discard any ${math`y \le ${0}`}; and use ${math`\ln`} to bring a power down.` },
  ],
  examples: [
    withExaminer(workedCambridge(a11q2), t`The substitution stated, both roots for ${math`y`} found, and the negative one explicitly rejected with the reason.`),
    worked(twoBases, { a: 2, b: 3, k: 1 }, t`Two different bases`),
    worked(hiddenQuadratic, { base: 3, m: 2, n: 0, neg: false }, t`Two solutions`),
  ],
  generators: [hiddenQuadratic, shifted, twoBases],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exponential-equation'],
  cambridge: withUses([a11q4i, a11q4ii], {
    'a11-q4-ii': { sections: ['Substitution'], note: t`Turning three bases into a quadratic by a substitution` },
    'a11-q4-i': { sections: ['Logarithms, and two bases'], note: t`Factorising powers of two bases and matching them` },
  }),
  gate: ['a11-q4-ii', 'a11-q4-i'],
  recall: [
    { front: t`How do you solve ${math`a^{${2}x} + pa^{x} + q = ${0}`}?`, back: t`Put ${math`y = a^{x}`}, solve the quadratic in ${math`y`}, keep only ${math`y > ${0}`}, then ${math`x = \frac{\ln y}{\ln a}`}.` },
    { front: t`Solve ${math`a^{x} = b`}.`, back: t`For ${math`b > ${0}`}, ${math`x = \frac{\ln b}{\ln a}`}; for ${math`b \le ${0}`}, no real solution.` },
  ],
  proofOrder: [{
    title: t`Why ${math`a^{x}`} is never negative`,
    steps: [
      t`${math`a = e^{\ln a}`}, so ${math`a^{x} = e^{x\ln a}`}.`,
      t`The exponential function takes only positive values.`,
      t`So ${math`a^{x} > ${0}`} for every real ${math`x`}.`,
    ],
  }],
};
