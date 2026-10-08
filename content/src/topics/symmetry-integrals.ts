/**
 * calc.symmetry-integrals: definite integrals by symmetry. The reflection x -> a - x leaves
 * an integral over [0, a] unchanged, so the integral of f(x)/(f(x) + f(a - x)) is a/2; odd
 * functions integrate to 0 over [-a, a]. The Cambridge problems are STEP Support Foundation
 * Assignment 25, Q2(vi), Q3 (1994 STEP I Q8), and Q4(i), with the Assignment 25 hints.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { close, simpson } from '../prep-c';
import { computedMath as cm, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F25 = 'step-f25' as const;
const F25H = 'step-f25-hints' as const;

// ---------------------------------------------------------------- f/(f + f(a - x))

type Shape = 'power' | 'exp' | 'root';
interface KingP { shape: Shape; n: number; a: number }
const kingF = ({ shape, n }: KingP): ((x: number) => number) => (shape === 'power' ? (x) => x ** n : shape === 'exp' ? Math.exp : Math.sqrt);
function kingTex({ shape, n, a }: KingP): Rich {
  const fx = shape === 'power' ? (n === 1 ? math`x` : math`x^{${n}}`) : shape === 'exp' ? math`e^{x}` : math`\sqrt{x}`;
  const fax = shape === 'power' ? (n === 1 ? math`(${a} - x)` : math`(${a} - x)^{${n}}`) : shape === 'exp' ? math`e^{${a} - x}` : math`\sqrt{${a} - x}`;
  return t`${math`\int_{${0}}^{${a}} \frac{${fx}}{${fx} + ${fax}}\,dx`}`;
}
const king = generator<KingP>({
  id: 'king-ratio',
  skill: 'Evaluate the integral of f(x)/(f(x) + f(a - x)) over [0, a] by adding it to its reflection: a/2.',
  params: (rng) => ({ shape: pick(rng, ['power', 'power', 'exp', 'root'] as const), n: int(rng, 1, 4), a: int(rng, 2, 12) }),
  sane: ({ a }) => (a >= 2 ? null : 'a too small'),
  problem: (p) => ({
    prompt: t`Evaluate ${kingTex(p)}.`,
    answer: { kind: 'exact', expected: str(q(p.a, 2)) },
    solution: [
      t`Call it ${math`I`}. Substitute ${math`x = ${p.a} - u`}: ${math`dx = -du`}, and the limits ${0}, ${p.a} become ${p.a}, ${0}. Swapping the limits back absorbs the minus sign, so ${math`I`} equals the same integral with the roles of ${math`f(x)`} and ${math`f(${p.a} - x)`} exchanged in the numerator.`,
      t`Adding the two forms: ${math`${2}I = \int_{${0}}^{${p.a}} \frac{f(x) + f(${p.a} - x)}{f(x) + f(${p.a} - x)}\,dx = \int_{${0}}^{${p.a}} ${1}\,dx = ${p.a}`}, so ${math`I = ${q(p.a, 2)}`}.`,
    ],
  }),
  solve: (p) => {
    const f = kingF(p);
    return str(q(Math.round(simpson((x) => f(x) / (f(x) + f(p.a - x)), 0, p.a, 4000) * 2), 2));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(p.a), why: t`${math`${2}I = ${p.a}`}, so ${math`I`} is half of that.` },
    { response: '1/2', why: t`${q(1, 2)} is the value of the integrand at the midpoint. The integral also multiplies by the width ${p.a}.` },
  ],
});

// ---------------------------------------------------------------- odd and even parts

interface OddP { c: number[]; a: number }
const evenPart = ({ c, a }: OddP): Rational => mul(q(2), add(q((c[1] as number) * a ** 3, 3), q((c[3] as number) * a)));
const halfDoubled = ({ c, a }: OddP): Rational => mul(q(2), [q((c[0] as number) * a ** 4, 4), q((c[1] as number) * a ** 3, 3), q((c[2] as number) * a * a, 2), q((c[3] as number) * a)].reduce((s, x) => add(s, x), q(0)));
const oddEven = generator<OddP>({
  id: 'odd-even',
  skill: 'Integrate a polynomial over [-a, a]: the odd powers cancel, and the even powers give twice the integral over [0, a].',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: OddP = { c: [int(rng, -3, 3), int(rng, -3, 3), int(rng, -4, 4), int(rng, -5, 5)], a: int(rng, 1, 3) };
      const right = str(evenPart(p));
      if ((p.c[0] !== 0 || p.c[2] !== 0) && right !== '0' && right !== str(halfDoubled(p))) return p;
    }
  },
  sane: ({ a }) => (a >= 1 ? null : 'a too small'),
  problem: (p) => ({
    prompt: t`Evaluate ${math`\int_{-${p.a}}^{${p.a}} (${cm(poly(p.c))})\,dx`}.`,
    answer: { kind: 'exact', expected: str(evenPart(p)) },
    solution: [
      t`The terms ${math`x^{${3}}`} and ${math`x`} are odd: their contributions on ${math`[-${p.a}, ${0}]`} and ${math`[${0}, ${p.a}]`} cancel.`,
      t`The even terms give twice their integral over ${math`[${0}, ${p.a}]`}: ${math`${2}\int_{${0}}^{${p.a}} (${cm(poly([p.c[1] as number, 0, p.c[3] as number]))})\,dx = ${evenPart(p)}`}.`,
    ],
  }),
  solve: (p) => str(q(Math.round(simpson((x) => poly4(p.c, x), -p.a, p.a, 2) * 3), 3)),
  misconceptions: (p): Misconception[] => [
    { response: '0', why: t`Only the odd terms cancel. The even terms ${math`x^{${2}}`} and the constant are the same on both sides, so they add.` },
    { response: str(halfDoubled(p)), why: t`Doubling the integral over ${math`[${0}, a]`} is right for even terms only; odd terms must be dropped, not doubled.` },
  ],
});
const poly4 = (c: number[], x: number): number => c.reduce((acc, a) => acc * x + a, 0);

// ---------------------------------------------------------------- x times a symmetric function

interface SymP { c: number; a: number }
const symVal = ({ c, a }: SymP): Rational => q(c * a ** 4, 12);
const symmetricWeight = generator<SymP>({
  id: 'x-times-symmetric',
  skill: 'Integrate x g(x) over [0, a] when g(a - x) = g(x): it equals (a/2) times the integral of g.',
  params: (rng) => ({ c: pick(rng, [1, 2, 3, 6, -1, 4]), a: pick(rng, [1, 3, 4, 5]) }),
  sane: ({ a }) => (a >= 1 ? null : 'a too small'),
  problem: ({ c, a }) => ({
    prompt: t`Let ${math`g(x) = ${c === 1 ? '' : c === -1 ? '-' : c}x(${a} - x)`}, so that ${math`g(${a} - x) = g(x)`}. Evaluate ${math`\int_{${0}}^{${a}} xg(x)\,dx`}.`,
    answer: { kind: 'exact', expected: str(symVal({ c, a })) },
    solution: [
      t`Let ${math`J = \int_{${0}}^{${a}} xg(x)\,dx`}. Substituting ${math`x = ${a} - u`} and using ${math`g(${a} - u) = g(u)`}: ${math`J = \int_{${0}}^{${a}} (${a} - u)g(u)\,du`}.`,
      t`Add: ${math`${2}J = ${a}\int_{${0}}^{${a}} g(x)\,dx`}, and ${math`\int_{${0}}^{${a}} ${c}x(${a} - x)\,dx = ${q(c * a ** 3, 6)}`}. So ${math`J = \frac{${a}}{${2}} \cdot ${q(c * a ** 3, 6)} = ${symVal({ c, a })}`}.`,
    ],
  }),
  solve: ({ c, a }) => str(q(Math.round(simpson((x) => c * x * x * (a - x), 0, a, 2) * 12), 12)),
  misconceptions: ({ c, a }): Misconception[] => [
    { response: str(q(c * a ** 3, 6)), why: t`That is ${math`\int g`}. The weight ${math`x`} averages to ${math`\frac{a}{${2}}`} by symmetry: multiply by it.` },
    { response: str(q(c * a ** 4, 6)), why: t`${math`${2}J = a\int g`}, so ${math`J`} is half of ${math`a\int g`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const q84 = auto({
  id: 'a25-q2-vi',
  source: cite(F25, 'Assignment 25, Q2(vi)'),
  title: t`An integral with a mirror image`,
  prompt: t`Let ${math`I = \int_{${0}}^{${84}} \frac{x^{${2}}}{x^{${2}} + (${84} - x)^{${2}}}\,dx`}. Use the substitution ${math`x = ${84} - u`} to show that ${math`I = \int_{${0}}^{${84}} \frac{(${84} - u)^{${2}}}{u^{${2}} + (${84} - u)^{${2}}}\,du`}, and hence evaluate ${math`I`}.`,
  answer: { kind: 'exact', expected: '42' },
  solution: [
    t`${math`dx = -du`}; ${math`x = ${0}`} gives ${math`u = ${84}`} and ${math`x = ${84}`} gives ${math`u = ${0}`}. So ${math`I = \int_{${84}}^{${0}} \frac{(${84} - u)^{${2}}}{(${84} - u)^{${2}} + u^{${2}}}(-du) = \int_{${0}}^{${84}} \frac{(${84} - u)^{${2}}}{u^{${2}} + (${84} - u)^{${2}}}\,du`}.`,
    t`Rename ${math`u`} as ${math`x`} and add to the original: ${math`${2}I = \int_{${0}}^{${84}} \frac{x^{${2}} + (${84} - x)^{${2}}}{x^{${2}} + (${84} - x)^{${2}}}\,dx = \int_{${0}}^{${84}} ${1}\,dx = ${84}`}. So ${math`I = ${42}`}.`,
  ],
  reference: '42',
  verify: () => close('Simpson', simpson((x) => (x * x) / (x * x + (84 - x) ** 2), 0, 84, 4000), 42),
  misconceptions: [{ response: '84', why: t`Adding the two forms gives ${math`${2}I = ${84}`}; halve it.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q2(vi)'), answer: '42', agrees: true },
});

const lnTan = auto({
  id: 'a25-q3-i',
  source: cite(F25, 'Assignment 25, Q3'),
  title: t`STEP: the log of one plus tan`,
  prompt: t`By means of the change of variable ${math`\theta = \frac{\pi}{${4}} - \varphi`}, evaluate ${math`\int_{${0}}^{\frac{\pi}{${4}}} \ln(${1} + \tan\theta)\,d\theta`}.`,
  nudge: t`Not quite. Rewrite ${math`${1} + \tan\theta`} after the change of variable, and compare the result with the original integral.`,
  hints: [
    t`What is ${math`\tan\left(\frac{\pi}{${4}} - \varphi\right)`} by the compound angle formula?`,
    t`What does ${math`${1} + \tan\theta`} become, written in ${math`\varphi`}?`,
    t`After the substitution, how is the new integral related to the original one?`,
  ],
  answer: { kind: 'expression', expected: 'pi ln(2)/8', variables: [] },
  solution: [
    t`${math`\tan\left(\frac{\pi}{${4}} - \varphi\right) = \frac{${1} - \tan\varphi}{${1} + \tan\varphi}`}, so ${math`${1} + \tan\theta = \frac{${2}}{${1} + \tan\varphi}`}.`,
    t`With ${math`d\theta = -d\varphi`} and the limits swapped, ${math`I = \int_{${0}}^{\frac{\pi}{${4}}} (\ln ${2} - \ln(${1} + \tan\varphi))\,d\varphi = \frac{\pi}{${4}}\ln ${2} - I`}.`,
    t`So ${math`${2}I = \frac{\pi}{${4}}\ln ${2}`} and ${math`I = \frac{\pi\ln ${2}}{${8}}`}.`,
    t`When a substitution brings back the original integral, solve for it.`,
  ],
  reference: 'pi ln(2)/8',
  verify: () => close('Simpson', simpson((x) => Math.log(1 + Math.tan(x)), 0, Math.PI / 4), (Math.PI * Math.log(2)) / 8),
  misconceptions: [{ response: 'pi ln(2)/4', why: t`That is ${math`${2}I`}: the integral reappears on the right, so solve ${math`I = \frac{\pi}{${4}}\ln ${2} - I`}.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q3'), answer: 'pi ln(2)/8', agrees: true },
});

const zeroQ = auto({
  id: 'a25-q3-iii',
  source: cite(F25, 'Assignment 25, Q3'),
  title: t`STEP: an integral that vanishes`,
  prompt: t`Evaluate ${math`\int_{${0}}^{\frac{\pi}{${2}}} \ln\left(\frac{${1} + \sin x}{${1} + \cos x}\right)dx`}.`,
  nudge: t`Not quite. Reflect the range with ${math`x \mapsto \frac{\pi}{${2}} - x`} and compare with the original.`,
  hints: [
    t`Under ${math`x = \frac{\pi}{${2}} - u`}, what do ${math`\sin x`} and ${math`\cos x`} become?`,
    t`What do the limits become?`,
    t`How does the new integrand compare with the original, and which number equals its own negative?`,
  ],
  answer: { kind: 'expression', expected: '0', variables: [] },
  solution: [
    t`Substitute ${math`x = \frac{\pi}{${2}} - u`}: ${math`\sin x = \cos u`} and ${math`\cos x = \sin u`}, and the limits swap back. So the integral equals ${math`\int_{${0}}^{\frac{\pi}{${2}}} \ln\left(\frac{${1} + \cos u}{${1} + \sin u}\right)du`}, which is minus the original.`,
    t`An integral equal to its own negative is ${0}.`,
    t`A reflection that negates the integrand makes the integral zero.`,
  ],
  reference: '0',
  verify: () => close('Simpson', simpson((x) => Math.log((1 + Math.sin(x)) / (1 + Math.cos(x))), 0, Math.PI / 2), 0, 1e-9),
  misconceptions: [{ response: 'pi ln(2)/8', why: t`That is the first integral of the question. Here the reflection ${math`x \mapsto \frac{\pi}{${2}} - x`} turns the integrand into its own negative.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q3(ii)'), answer: '0', agrees: true },
});

const cosRatio = auto({
  id: 'a25-q4-i',
  source: cite(F25, 'Assignment 25, Q4(i)'),
  title: t`Cosine over cosine plus sine`,
  prompt: t`Given that ${math`\int_{${0}}^{a} \frac{f(x)}{f(x) + f(a - x)}\,dx = \frac{a}{${2}}`} when the denominator is never ${0}, evaluate ${math`\int_{${0}}^{\frac{\pi}{${2}}} \frac{\cos x}{\cos x + \sin x}\,dx`}.`,
  nudge: t`Not quite. Match the integrand to the given form by choosing ${math`f`} and ${math`a`}.`,
  hints: [
    t`Which ${math`f`} and ${math`a`} make ${math`f(x) = \cos x`} and ${math`f(a - x) = \sin x`}?`,
    t`Is the denominator ${math`\cos x + \sin x`} non-zero on ${math`\left[${0}, \frac{\pi}{${2}}\right]`}?`,
    t`What does the given result then say?`,
  ],
  answer: { kind: 'expression', expected: 'pi/4', variables: [] },
  solution: [
    t`${math`\sin x = \cos\left(\frac{\pi}{${2}} - x\right)`}, so with ${math`f = \cos`} and ${math`a = \frac{\pi}{${2}}`} the integrand is ${math`\frac{f(x)}{f(x) + f(a - x)}`}; and ${math`\cos x + \sin x > ${0}`} on the range.`,
    t`So the integral is ${math`\frac{a}{${2}} = \frac{\pi}{${4}}`}.`,
    t`Match a problem to a known identity by choosing its parameters.`,
  ],
  reference: 'pi/4',
  verify: () => close('Simpson', simpson((x) => Math.cos(x) / (Math.cos(x) + Math.sin(x)), 0, Math.PI / 2), Math.PI / 4),
  misconceptions: [{ response: 'pi/2', why: t`The result is half the length of the range: ${math`\frac{${1}}{${2}} \cdot \frac{\pi}{${2}}`}.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q4(i)'), answer: 'pi/4', agrees: true },
});

const stepFull = supervision({
  id: 'a25-q3',
  source: cite(F25, 'Assignment 25, Q3'),
  title: t`STEP: three integrals by substitution`,
  prompt: t`By means of the change of variable ${math`\theta = \frac{${1}}{${4}}\pi - \varphi`}, or otherwise, show that ${math`\int_{${0}}^{\frac{${1}}{${4}}\pi} \ln(${1} + \tan\theta)\,d\theta = \frac{${1}}{${8}}\pi\ln ${2}`}. Evaluate ${math`\int_{${0}}^{${1}} \frac{\ln(${1} + x)}{${1} + x^{${2}}}\,dx`} and ${math`\int_{${0}}^{\frac{${1}}{${2}}\pi} \ln\left(\frac{${1} + \sin x}{${1} + \cos x}\right)dx`}.`,
  hints: [
    t`Under ${math`\theta = \frac{\pi}{${4}} - \varphi`}, what does ${math`${1} + \tan\theta`} become, and how is the integral related to itself?`,
    t`For the second integral, which substitution turns ${math`${1} + x^{${2}}`} into ${math`\sec^{${2}}\theta`}?`,
    t`For the third, what does ${math`x \mapsto \frac{\pi}{${2}} - x`} do to the integrand?`,
  ],
  writeUp: 'proof',
  official: cite(F25H, 'Assignment 25 hints, Q3'),
});

// ---------------------------------------------------------------- lesson

export const symmetryIntegrals: TopicContent = {
  topicId: 'calc.symmetry-integrals',
  goal: t`Evaluate integrals such as ${math`\int_{${0}}^{a} \frac{f(x)}{f(x) + f(a - x)}\,dx = \frac{a}{${2}}`} with the substitution ${math`x \mapsto a - x`}.`,
  objective: t`Evaluate integrals with no elementary antiderivative by reflecting the range and adding.`,
  why: t`STEP's favourite integrals are solved this way, and the idea of symmetry recurs throughout IA.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Reflecting the range` },
    { kind: 'hook', text: t`${math`\int_{${0}}^{${84}} \frac{x^{${2}}}{x^{${2}} + (${84} - x)^{${2}}}\,dx`} looks hopeless: no antiderivative you know fits. Yet the answer is exactly ${42}, half the length of the range, and you can see it in two lines.` },
    { kind: 'narrative', text: t`Read the range ${math`[${0}, a]`} backwards: the point ${math`x`} goes to ${math`a - x`}. Area does not care which way you sweep, so integrating ${math`f(a - x)`} gives the same total as integrating ${math`f(x)`}. The trick is to use that to produce a second expression for the same integral, and add.` },
    { kind: 'theorem', name: t`Reflection`, statement: t`If ${math`f`} is continuous on ${math`[${0}, a]`}, then ${math`\int_{${0}}^{a} f(x)\,dx = \int_{${0}}^{a} f(a - x)\,dx`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Substitute`, text: t`In ${math`\int_{${0}}^{a} f(a - x)\,dx`} put ${math`u = a - x`}: ${math`du = -dx`}, and ${math`x = ${0}, a`} give ${math`u = a, ${0}`}.` },
        { label: t`Tidy the limits`, text: t`${math`\int_{a}^{${0}} f(u)(-du) = \int_{${0}}^{a} f(u)\,du`}, since swapping limits changes the sign.`, why: { q: t`Why does swapping limits change the sign?`, a: t`${math`\int_{a}^{b} = F(b) - F(a) = -(F(a) - F(b)) = -\int_{b}^{a}`}.` } },
        { label: t`Rename`, text: t`The letter is a dummy: ${math`\int_{${0}}^{a} f(u)\,du = \int_{${0}}^{a} f(x)\,dx`}.` },
      ],
    },
    { kind: 'theorem', name: t`A ratio integral`, statement: t`If ${math`f`} is continuous on ${math`[${0}, a]`} and ${math`f(x) + f(a - x) \ne ${0}`} there, then ${math`\int_{${0}}^{a} \frac{f(x)}{f(x) + f(a - x)}\,dx = \frac{a}{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Reflect`, text: t`By the reflection theorem the integral ${math`I`} also equals ${math`\int_{${0}}^{a} \frac{f(a - x)}{f(a - x) + f(x)}\,dx`}.` },
        { label: t`Add`, text: t`The two numerators add to the common denominator:`, eq: [dmath`${2}I = \int_{${0}}^{a} \frac{f(x) + f(a - x)}{f(x) + f(a - x)}\,dx = \int_{${0}}^{a} ${1}\,dx = a`] },
        { label: t`Halve`, text: t`So ${math`I = \frac{a}{${2}}`}.` },
      ],
    },
    { kind: 'p', text: t`This move, reflect and add, is the [[king-property|reflection trick]]. It explains the hook (${math`f(x) = x^{${2}}`}, ${math`a = ${84}`}). Reflection on its own helps too: it turns ${math`\int_{${0}}^{${1}} x(${1} - x)^{${9}}\,dx`}, which would need a long expansion, into ${math`\int_{${0}}^{${1}} (${1} - x)x^{${9}}\,dx = \int_{${0}}^{${1}} (x^{${9}} - x^{${10}})\,dx = \frac{${1}}{${10}} - \frac{${1}}{${11}} = ${q(1, 110)}`}.` },
    checkFrom(king, { shape: 'exp', n: 1, a: 6 }, t`Reflect and add: ${math`${2}I = ${6}`}, so ${math`I = ${3}`}.`),
    { kind: 'section', title: t`Odd and even` },
    { kind: 'narrative', text: t`The same idea on ${math`[-a, a]`}, reflecting ${math`x \mapsto -x`}: if ${math`f(-x) = -f(x)`} (an odd function, like ${math`x^{${3}}`}), the areas either side cancel and ${math`\int_{-a}^{a} f = ${0}`}; if ${math`f(-x) = f(x)`} (even, like ${math`x^{${2}}`}), ${math`\int_{-a}^{a} f = ${2}\int_{${0}}^{a} f`}.` },
    { kind: 'pitfall', claim: t`${math`\int_{-a}^{a} f(x)\,dx = ${0}`} whenever the graph looks balanced.`, counterexample: t`${math`\int_{-${1}}^{${1}} (x^{${3}} + ${1})\,dx = ${2}`}: the ${math`x^{${3}}`} part cancels, but the even part ${1} does not.` },
    { kind: 'pitfall', claim: t`The ratio theorem works whatever the denominator does.`, counterexample: t`With ${math`f(x) = x - ${1}`} on ${math`[${0}, ${2}]`}, ${math`f(x) + f(${2} - x) = ${0}`} everywhere: the integrand is undefined. The hypothesis that the denominator is never ${0} matters.` },
    { kind: 'takeaway', text: t`Reflect the range with ${math`x \mapsto a - x`} (or ${math`x \mapsto -x`}), and add the result to the original: the hard parts often cancel or combine to ${1}.` },
  ],
  examples: [
    { ...workedCambridge(q84), examiner: t`The examiner wants the substitution done in full (the minus sign and the swapped limits), then the addition, not just the answer ${42}.` },
    worked(oddEven, { c: [2, 3, -1, 4], a: 2 }, t`Odd terms cancel`),
    worked(symmetricWeight, { c: 1, a: 3 }, t`A weight that averages by symmetry`),
  ],
  generators: [king, oddEven, symmetricWeight],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['king-property'],
  cambridge: withUses([lnTan, zeroQ, cosRatio, stepFull], {
    'a25-q3': { sections: ['Reflecting the range'], note: t`Integrals by reflecting the range` },
    'a25-q3-i': { sections: ['Reflecting the range'], note: t`The log of one plus tan by reflecting the range` },
  }),
  gate: ['a25-q3', 'a25-q3-i'],
  recall: [
    { front: t`What is ${math`\int_{${0}}^{a} \frac{f(x)}{f(x) + f(a - x)}\,dx`}?`, back: t`${math`\frac{a}{${2}}`}, when the denominator is never ${0}: reflect and add.` },
    { front: t`What is the reflection identity?`, back: t`${math`\int_{${0}}^{a} f(x)\,dx = \int_{${0}}^{a} f(a - x)\,dx`}.` },
  ],
  proofOrder: [{
    title: t`The ratio integral is half the range`,
    steps: [
      t`Reflect ${math`x \mapsto a - x`}: ${math`I`} equals the integral with ${math`f(a - x)`} on top.`,
      t`Add the two forms of ${math`I`}.`,
      t`The tops add to the bottom, so the integrand is ${1}.`,
      t`So ${math`${2}I = a`}, and ${math`I = \frac{a}{${2}}`}.`,
    ],
  }],
};
