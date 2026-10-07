/**
 * pre.hcf-lcm (a bridge): the highest common factor and lowest common multiple of two
 * numbers, by listing and from prime factorisations, and HCF x LCM = ab. Sources: the GCSE
 * subject content (DfE 2013), and STEP Support Foundation Assignment 10 Q2(iii). HCFs are
 * computed by Euclid's algorithm and LCMs by searching the multiples, independently of the
 * prime-power method the solutions use. The gate is IA Numbers and Sets Example Sheet 2, Q8
 * (batch 7), with HCF written for the sheet's (a, b).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { gcd, int, pick, q, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, withExaminer } from '../prep-a';

const PRIMES = [2, 3, 5, 7] as const;
const lcmOf = (a: number, b: number): number => { let m = a; while (m % b !== 0) m += a; return m; };
const powers = (n: number): number[] => PRIMES.map((p) => { let e = 0; while (n % p ** (e + 1) === 0) e++; return e; });
/** n as a product of prime powers, in LaTeX. */
const factTex = (n: number): string => PRIMES.map((p, i) => [p, powers(n)[i] as number] as const).filter(([, e]) => e > 0).map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join(' \\times ');

interface PairP { ea: number[]; eb: number[] }
const value = (es: readonly number[]): number => es.reduce((acc, e, i) => acc * (PRIMES[i] as number) ** e, 1);
const pairParams = (rng: () => number): PairP => {
  for (;;) {
    const ea = PRIMES.map(() => pick(rng, [0, 0, 1, 1, 2, 3]));
    const eb = PRIMES.map(() => pick(rng, [0, 0, 1, 1, 2, 3]));
    const a = value(ea);
    const b = value(eb);
    if (a < 6 || b < 6 || a === b || a > 3000 || b > 3000 || a % b === 0 || b % a === 0 || gcd(a, b) === 1) continue;
    return { ea, eb };
  }
};

// ---------------------------------------------------------------- HCF

const hcf = generator<PairP>({
  id: 'hcf',
  skill: 'Find the HCF of two numbers from their prime factorisations: the lower power of each prime.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p = pairParams(rng);
      const [a, b] = [value(p.ea), value(p.eb)];
      const shared = PRIMES.filter((_, i) => (p.ea[i] as number) > 0 && (p.eb[i] as number) > 0).reduce((x, y) => x * y, 1);
      if (distinctFrom(String(gcd(a, b)), [String(lcmOf(a, b)), String(shared)]) >= 2) return p;
    }
  },
  sane: (p) => (p.ea.length === 4 && p.eb.length === 4 ? null : 'bad'),
  problem: (p) => {
    const [a, b] = [value(p.ea), value(p.eb)];
    const h = gcd(a, b);
    return {
      prompt: t`Find the highest common factor of ${a} and ${b}.`,
      answer: { kind: 'exact', expected: String(h) },
      solution: [
        t`Factorise: ${math`${a} = ${computedTex(factTex(a))}`} and ${math`${b} = ${computedTex(factTex(b))}`}.`,
        t`A common factor can use each prime at most as often as it appears in both: take the lower power of each prime. That gives ${math`${computedTex(factTex(h))} = ${h}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Euclid's algorithm: no factorising.
    let [x, y] = [value(p.ea), value(p.eb)];
    while (y !== 0) [x, y] = [y, x % y];
    return String(x);
  },
  misconceptions: (p): Misconception[] => {
    const [a, b] = [value(p.ea), value(p.eb)];
    const shared = PRIMES.filter((_, i) => (p.ea[i] as number) > 0 && (p.eb[i] as number) > 0).reduce((x, y) => x * y, 1);
    return [
      { response: String(lcmOf(a, b)), why: t`That is the lowest common multiple, which takes the higher power of each prime. The HCF takes the lower power.` },
      { response: String(shared), why: t`Take the powers into account: a prime that divides both numbers twice divides their HCF twice.` },
    ];
  },
});

// ---------------------------------------------------------------- LCM

const lcm = generator<PairP>({
  id: 'lcm',
  skill: 'Find the LCM of two numbers from their prime factorisations: the higher power of each prime.',
  quick: true,
  params: (rng) => pairParams(rng),
  sane: (p) => (p.ea.length === 4 ? null : 'bad'),
  problem: (p) => {
    const [a, b] = [value(p.ea), value(p.eb)];
    const l = lcmOf(a, b);
    return {
      prompt: t`Find the lowest common multiple of ${a} and ${b}.`,
      answer: { kind: 'exact', expected: String(l) },
      solution: [
        t`Factorise: ${math`${a} = ${computedTex(factTex(a))}`} and ${math`${b} = ${computedTex(factTex(b))}`}.`,
        t`A common multiple must contain each prime as often as either number does: take the higher power of each. That gives ${math`${computedTex(factTex(l))} = ${l}`}.`,
      ],
    };
  },
  solve: (p) => String(lcmOf(value(p.ea), value(p.eb))),
  misconceptions: (p): Misconception[] => {
    const [a, b] = [value(p.ea), value(p.eb)];
    return [
      { response: String(a * b), why: t`${math`${a} \times ${b}`} is a common multiple, but not the lowest: the shared factor ${gcd(a, b)} is counted twice. Divide by it.` },
      { response: String(gcd(a, b)), why: t`That is the highest common factor. A multiple of both numbers is at least as big as each.` },
    ];
  },
});

// ---------------------------------------------------------------- HCF times LCM

interface ProdP { h: number; m: number; n: number }
const product = generator<ProdP>({
  id: 'hcf-times-lcm',
  skill: 'Use HCF times LCM equals the product of the two numbers to find a missing number.',
  params: (rng) => {
    for (;;) {
      const p: ProdP = { h: int(rng, 2, 12), m: int(rng, 2, 9), n: int(rng, 2, 9) };
      if (gcd(p.m, p.n) === 1 && p.m !== p.n) return p;
    }
  },
  sane: (p) => (gcd(p.m, p.n) === 1 ? null : 'not coprime'),
  problem: ({ h, m, n }) => {
    const [a, b, l] = [h * m, h * n, h * m * n];
    return {
      prompt: t`Two positive integers have highest common factor ${h} and lowest common multiple ${l}. One of them is ${a}. Find the other.`,
      answer: { kind: 'exact', expected: String(b) },
      solution: [
        t`For any two positive integers, ${math`\text{HCF} \times \text{LCM} = ab`}. So ${math`${h} \times ${l} = ${a} \times b`}.`,
        t`${math`b = \frac{${h * l}}{${a}} = ${b}`}. Check: ${math`\gcd(${a}, ${b}) = ${gcd(a, b)}`}.`,
      ],
    };
  },
  solve: ({ h, m, n }) => {
    // Search b among the divisors of the LCM.
    const [a, l] = [h * m, h * m * n];
    for (let b = 1; b <= l; b++) if (l % b === 0 && gcd(a, b) === h && lcmOf(a, b) === l) return String(b);
    return 'none';
  },
  misconceptions: ({ h, m, n }): Misconception[] => [
    { response: String(n), why: t`${math`\frac{\text{LCM}}{a}`} gives ${n}, but then the HCF of ${h * m} and ${n} is not ${h}. Use ${math`\text{HCF} \times \text{LCM} = ab`}.` },
    { response: String(h * m * m * n), why: t`Divide, do not multiply: ${math`b = \frac{\text{HCF} \times \text{LCM}}{a}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a10hcf = auto({
  id: 'a10-q2-iii',
  source: cite('step-f10', 'Q2(iii)'),
  title: t`The HCF of two five-digit numbers`,
  prompt: t`Write ${39600} and ${52920} as products of prime numbers. Hence find the highest common factor of ${39600} and ${52920}.`,
  answer: { kind: 'exact', expected: '360' },
  solution: [
    t`${math`${39600} = ${2}^{${4}} \times ${3}^{${2}} \times ${5}^{${2}} \times ${11}`} and ${math`${52920} = ${2}^{${3}} \times ${3}^{${3}} \times ${5} \times ${7}^{${2}}`}.`,
    t`Take the lower power of each prime: ${math`${2}^{${3}}`}, ${math`${3}^{${2}}`}, ${math`${5}^{${1}}`}, and ${math`${7}^{${0}}`}, ${math`${11}^{${0}}`} (a prime missing from one number has power ${0} there).`,
    t`HCF ${math`= ${8} \times ${9} \times ${5} = ${360}`}.`,
  ],
  reference: '360',
  verify: () => same('Euclid', gcd(39600, 52920), 360),
  misconceptions: [{ response: '5821200', why: t`That is the LCM, from the higher powers. The HCF takes the lower power of each prime.` }],
  official: { source: cite('step-f10-hints', 'Q2(iii)'), answer: '360', agrees: true },
});

const a10lcm = auto({
  id: 'a10-q2-iii-lcm',
  source: cite('step-f10', 'Q2(iii)', true),
  title: t`The LCM of the same pair`,
  prompt: t`Using ${math`${39600} = ${2}^{${4}} \times ${3}^{${2}} \times ${5}^{${2}} \times ${11}`} and ${math`${52920} = ${2}^{${3}} \times ${3}^{${3}} \times ${5} \times ${7}^{${2}}`}, find the lowest common multiple of ${39600} and ${52920}.`,
  answer: { kind: 'exact', expected: '5821200' },
  solution: [
    t`Take the higher power of each prime: ${math`${2}^{${4}} \times ${3}^{${3}} \times ${5}^{${2}} \times ${7}^{${2}} \times ${11}`}.`,
    t`That is ${math`${16} \times ${27} \times ${25} \times ${49} \times ${11} = ${5821200}`}. Check: ${math`${360} \times ${5821200} = ${39600} \times ${52920}`}.`,
  ],
  reference: '5821200',
  verify: () => same('LCM by HCF', (39600 * 52920) / gcd(39600, 52920), 5821200),
  misconceptions: [{ response: '2095632000', why: t`That is the product of the two numbers, which counts the common factor ${360} twice.` }],
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

const HCF = (x: string, y: string) => math`\text{HCF}(${x}, ${y})`;

/*
 * Outline for marking ns2-q8 (20 marks):
 * 1. Not always equal: a = d = 2, b = c = 1 gives HCF(2, 1) HCF(1, 2) = 1 but HCF(2, 2) = 2 (5).
 * 2. HCF(a, b) HCF(c, d) always divides HCF(ac, bd): HCF(a, b) | a and HCF(c, d) | c, so the product
 *    divides ac; likewise bd; a common divisor divides the HCF (by prime powers: each prime's
 *    power in the product is min(a_p, b_p) + min(c_p, d_p) <= min(a_p + c_p, b_p + d_p)) (6). The other
 *    direction fails (the example in 1) (1).
 * 3. Yes: if a prime p divided a and bc, then p | b or p | c (unique factorisation), so p would
 *    divide HCF(a, b) or HCF(a, c), both 1. So no prime divides both a and bc: HCF(a, bc) = 1 (8).
 */
const ns2q8 = supervision({
  id: 'ns2-q8',
  source: cite('ia-ns-sheet-2', 'Q8', true),
  title: t`Highest common factors of products`,
  prompt: t`Let ${math`a, b, c, d`} be positive integers. Must the numbers ${math`\text{HCF}(a, b) \cdot \text{HCF}(c, d)`} and ${HCF('ac', 'bd')} be equal? If not, must one be a factor of the other? If ${math`\text{HCF}(a, b) = \text{HCF}(a, c) = ${1}`}, must we have ${math`\text{HCF}(a, bc) = ${1}`}? Prove each answer, or give a counterexample.`,
  writeUp: 'proof',
});

/** Searches every a, b, c, d up to n: does the product of HCFs always divide the HCF of products, and coprimality pass to bc? */
const ns2q8Facts = (n: number): string | null => {
  for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) for (let c = 1; c <= n; c++) for (let d = 1; d <= n; d++) {
    if (gcd(a * c, b * d) % (gcd(a, b) * gcd(c, d)) !== 0) return `HCF(a, b) HCF(c, d) does not divide HCF(ac, bd) at ${a}, ${b}, ${c}, ${d}`;
    if (gcd(a, b) === 1 && gcd(a, c) === 1 && gcd(a, b * c) !== 1) return `HCF(a, bc) is not 1 at ${a}, ${b}, ${c}`;
  }
  return null;
};

const ns2q8Witness = auto({
  id: 'ns2-q8-unequal',
  source: cite('ia-ns-sheet-2', 'Q8, first question', true),
  title: t`Not always equal`,
  prompt: t`Give positive integers ${math`a, b, c, d`} for which ${math`\text{HCF}(a, b) \cdot \text{HCF}(c, d) \ne \text{HCF}(ac, bd)`}.`,
  answer: {
    kind: 'witness', count: 4, names: ['a', 'b', 'c', 'd'], example: 'a = 2, b = 1, c = 1, d = 2',
    check: (vals: readonly Rational[]) => {
      const v = vals.map((x) => (x.den === 1n && x.num >= 1n && x.num <= 1_000_000n ? Number(x.num) : NaN));
      if (v.some(Number.isNaN)) return 'Give four positive whole numbers, each at most a million.';
      const [a, b, c, d] = v as [number, number, number, number];
      const left = gcd(a, b) * gcd(c, d);
      const right = gcd(a * c, b * d);
      return left !== right ? null : `Both sides are ${left} for these numbers.`;
    },
  },
  solution: [
    t`Make ${math`a`} and ${math`d`} share a factor that neither pair sees: ${math`a = d = ${2}`} and ${math`b = c = ${1}`}.`,
    t`Then ${math`\text{HCF}(${2}, ${1}) \cdot \text{HCF}(${1}, ${2}) = ${1}`}, but ${math`\text{HCF}(${2}, ${2}) = ${2}`}.`,
    t`In general the left side divides the right side, but the right side can be larger.`,
  ],
  reference: 'a = 2, b = 1, c = 1, d = 2',
  verify: () => {
    const e = same('HCF(2, 1) HCF(1, 2) against HCF(2, 2)', `${gcd(2, 1) * gcd(1, 2)} ${gcd(2, 2)}`, '1 2');
    return e ?? ns2q8Facts(12);
  },
  misconceptions: [{ response: 'a = 2, b = 2, c = 3, d = 3', why: t`Here both sides are ${6}: when ${math`a = b`} and ${math`c = d`} nothing is lost. Look for a factor shared across the pairs, between ${math`a`} and ${math`d`}.` }],
});

// ---------------------------------------------------------------- lesson

export const hcfLcm: TopicContent = {
  topicId: 'pre.hcf-lcm',
  goal: t`Find the HCF and LCM of two numbers by listing and from their prime factorisations.`,
  objective: t`Find the HCF and LCM of two numbers from their prime factorisations.`,
  why: t`Common factors and multiples underlie fractions, divisibility proofs, and Euclid's algorithm.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Two lighthouses flash every ${12} and every ${18} seconds, together at midnight. When do they next flash together? After ${36} seconds: the lowest common multiple. And ${math`${12} \times ${18} = ${216} = ${6} \times ${36}`}, where ${6} is the highest common factor. Coincidence?` },
    { kind: 'narrative', text: t`No. Write each number as a product of primes and both the HCF and the LCM can be read off, prime by prime. The product rule then falls out in one line.` },
    { kind: 'section', title: t`Definitions` },
    {
      kind: 'definition',
      name: t`HCF and LCM`,
      formal: t`For positive integers ${math`a`} and ${math`b`}, the [[hcf|highest common factor]] ${math`\text{HCF}(a, b)`} is the largest positive integer dividing both, and the [[lcm|lowest common multiple]] ${math`\text{LCM}(a, b)`} is the smallest positive integer divisible by both.`,
      plain: t`For ${12} and ${18}: the common factors are ${1}, ${2}, ${3}, ${6}, so the HCF is ${6}; the common multiples are ${36}, ${72}, and so on, so the LCM is ${36}. The HCF is also written ${math`\gcd(a, b)`}, as in the [[gcd|gcd]].`,
    },
    { kind: 'section', title: t`From prime factorisations` },
    { kind: 'theorem', name: t`HCF and LCM from prime powers`, statement: t`If ${math`a = \prod p^{\alpha_{p}}`} and ${math`b = \prod p^{\beta_{p}}`} (over the primes ${math`p`}, with powers ${math`\ge ${0}`}), then ${math`\text{HCF}(a, b) = \prod p^{\min(\alpha_{p}, \beta_{p})}`} and ${math`\text{LCM}(a, b) = \prod p^{\max(\alpha_{p}, \beta_{p})}`}. Consequently ${math`\text{HCF}(a, b) \times \text{LCM}(a, b) = ab`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Divisors as prime powers`, text: t`By unique factorisation, ${math`d`} divides ${math`a`} exactly when each prime appears in ${math`d`} at most as often as in ${math`a`}.`, plain: t`${12} divides ${math`${72} = ${2}^{${3}} \times ${3}^{${2}}`} because ${math`${12} = ${2}^{${2}} \times ${3}`} uses no prime more often.` },
        { label: t`The HCF`, text: t`A common divisor has power at most ${math`\alpha_{p}`} and at most ${math`\beta_{p}`} of each ${math`p`}; the largest takes exactly ${math`\min(\alpha_{p}, \beta_{p})`}.` },
        { label: t`The LCM`, text: t`A common multiple needs power at least ${math`\alpha_{p}`} and at least ${math`\beta_{p}`}; the smallest takes exactly ${math`\max(\alpha_{p}, \beta_{p})`}.` },
        { label: t`The product`, text: t`${math`\min(\alpha, \beta) + \max(\alpha, \beta) = \alpha + \beta`} for any two numbers, so multiplying prime by prime, ${math`\text{HCF} \times \text{LCM} = \prod p^{\alpha_{p} + \beta_{p}} = ab`}.` },
      ],
    },
    checkFrom(hcf, { ea: [3, 2, 0, 1], eb: [1, 3, 1, 0] }, t`${math`${504} = ${2}^{${3}} \times ${3}^{${2}} \times ${7}`} and ${math`${270} = ${2} \times ${3}^{${3}} \times ${5}`}; the lower powers give ${math`${2} \times ${3}^{${2}} = ${18}`}.`),
    { kind: 'pitfall', claim: t`The LCM of two numbers is their product.`, counterexample: t`${math`\text{LCM}(${12}, ${18}) = ${36}`}, not ${216}. The product is the LCM only when the HCF is ${1}.` },
    checkFrom(product, { h: 6, m: 2, n: 3 }, t`${math`b = \frac{${6} \times ${36}}{${12}} = ${18}`}.`),
    { kind: 'takeaway', text: t`Factorise into primes: the HCF takes the lower power of each prime, the LCM the higher, and their product is ${math`ab`}.` },
  ],
  examples: [
    withExaminer(workedCambridge(a10hcf), t`Both factorisations written in full, and the rule of the lower power stated, including primes that appear in only one number.`),
    worked(lcm, { ea: [2, 1, 1, 0], eb: [1, 2, 0, 1] }, t`The LCM from prime powers`),
    worked(product, { h: 4, m: 3, n: 5 }, t`A missing number from the HCF and LCM`),
  ],
  generators: [hcf, lcm, product],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['hcf', 'lcm'],
  cambridge: withUses([a10lcm, ns2q8, ns2q8Witness], {
    'ns2-q8': { sections: ['Definitions', 'From prime factorisations'], note: t`Testing claims about highest common factors, proving or giving a counterexample`, needs: ['proof.counterexample'] },
  }),
  // The IA question: three claims about HCFs of products, each proved or refuted. The LCM from given
  // factorisations is a single step, and the counterexample alone is the question's first line.
  gate: ['ns2-q8'],
  recall: [
    { front: t`HCF and LCM from prime factorisations?`, back: t`HCF: the lower power of each prime. LCM: the higher power.` },
    { front: t`How are the HCF and LCM of ${math`a`} and ${math`b`} related?`, back: t`${math`\text{HCF}(a, b) \times \text{LCM}(a, b) = ab`}.` },
  ],
  proofOrder: [{
    title: t`HCF times LCM is the product`,
    steps: [
      t`Write ${math`a`} and ${math`b`} as products of prime powers.`,
      t`The HCF takes the lower power of each prime, the LCM the higher.`,
      t`For each prime, lower power plus higher power is the sum of the two powers.`,
      t`So the HCF times the LCM has the prime powers of ${math`ab`}, and equals ${math`ab`}.`,
    ],
  }],
};
