/**
 * num.fundamental-theorem: every integer n >= 2 is a product of primes in exactly one way,
 * up to order. The lesson follows the CST notes (printed pages 291 to 305: Proposition 96,
 * existence by strong induction; Theorem 97 and its uniqueness proof by Euclid's theorem
 * and cancellation, then by induction; the restatement n = Π p^(n_p) and gcds as minimum
 * exponents, Examples 98 and 99) and Book of Proof Section 10.4 (Theorem 10.1, uniqueness
 * by a smallest counterexample).
 *
 * Source note: Example 98 prints 1224 = 2^2 · 3^2 · 17, but that product is 612; 1224 is
 * 2^3 · 3^2 · 17. Example 99's gcd(1224, 660) = 12 is right either way (the exponent of 2 in
 * 660 is 2), and Example 68's 24 divisors of 1224 agree with 2^3. Recorded as a mismatch.
 *
 * Batch 7 adds IA Numbers and Sets Example Sheet 3, Q11 (a root of a monic integer polynomial is
 * an integer or irrational) and CST supervision exercise 3.2.3 with its 2023-24 solution. CST 3.3.1
 * and 3.2.5 are set in num.euclid-theorem and num.number-systems, so they are not set again.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { divisors, factorise, gcd } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const mn = math`n`;
const PR = [2, 3, 5, 7, 11];
const factTex = (n: number): Span => computedTex(factorise(n).map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`)).join(' \\cdot '));
const expOf = (n: number, p: number): number => { let e = 0; let m = n; while (m % p === 0) { m /= p; e++; } return e; };
const build = (es: readonly number[]): number => es.reduce((x, e, i) => x * (PR[i] as number) ** e, 1);
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** n as a product over the given primes with every exponent shown, including 0. */
const expTex = (n: number, ps: readonly number[]): Span => computedTex(ps.map((p) => `${p}^{${expOf(n, p)}}`).join(' \\cdot '));

// ---------------------------------------------------------------- gcd and lcm from exponents

interface GLP { a: readonly number[]; b: readonly number[]; op: 'gcd' | 'lcm' }
const glVal = ({ a, b, op }: GLP): number => build(a.map((e, i) => (op === 'gcd' ? Math.min(e, b[i] as number) : Math.max(e, b[i] as number))));
const glMis = (p: GLP): string[] => {
  const other = glVal({ ...p, op: p.op === 'gcd' ? 'lcm' : 'gcd' });
  const commonOnce = build(p.a.map((e, i) => (e > 0 && (p.b[i] as number) > 0 ? 1 : 0)));
  return [String(other), String(commonOnce), String(build(p.a) * build(p.b))];
};

const gcdLcm = generator<GLP>({
  id: 'gcd-lcm-exponents',
  skill: 'Read gcd and lcm off prime factorisations: the gcd takes the smaller exponent of each prime, the lcm the larger.',
  params: (rng) => {
    for (;;) {
      const a = PR.slice(0, 4).map(() => int(rng, 0, 3));
      const b = PR.slice(0, 4).map(() => int(rng, 0, 3));
      const p: GLP = { a, b, op: pick(rng, ['gcd', 'lcm'] as const) };
      if (build(a) > 1 && build(b) > 1 && build(a) !== build(b) && glVal({ ...p, op: 'lcm' }) <= 100000 && distinctFrom(String(glVal(p)), glMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (build([...a]) > 1 && build([...b]) > 1 ? null : 'out of range'),
  problem: (p) => {
    const [x, y] = [build(p.a), build(p.b)];
    const ps = PR.slice(0, 4).filter((_, i) => (p.a[i] as number) + (p.b[i] as number) > 0);
    return {
      prompt: t`${math`${x} = ${factTex(x)}`} and ${math`${y} = ${factTex(y)}`}. Find ${p.op === 'gcd' ? math`\gcd(${x}, ${y})` : math`\operatorname{lcm}(${x}, ${y})`}.`,
      answer: { kind: 'exact', expected: String(glVal(p)) },
      solution: [
        t`Write both over the same primes, with exponent ${0} where a prime is absent: ${math`${x} = ${expTex(x, ps)}`} and ${math`${y} = ${expTex(y, ps)}`}.`,
        t`The ${p.op === 'gcd' ? 'gcd takes the smaller' : 'lcm takes the larger'} exponent of each prime: ${math`${expTex(glVal(p), ps)} = ${glVal(p)}`}.`,
      ],
    };
  },
  solve: ({ a, b, op }) => {
    const [x, y] = [build(a), build(b)];
    return String(op === 'gcd' ? gcd(x, y) : (x * y) / gcd(x, y));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(glVal({ ...p, op: p.op === 'gcd' ? 'lcm' : 'gcd' })), why: t`That is the ${p.op === 'gcd' ? 'lcm' : 'gcd'}. The ${p.op} takes the ${p.op === 'gcd' ? 'smaller' : 'larger'} exponent of each prime.` },
    { response: String(build(p.a.map((e, i) => (e > 0 && (p.b[i] as number) > 0 ? 1 : 0)))), why: t`The exponents matter, not just which primes appear: take each prime to the ${p.op === 'gcd' ? 'smaller' : 'larger'} of its two exponents.` },
    { response: String(build(p.a) * build(p.b)), why: t`Multiplying the numbers adds the exponents. The ${p.op} compares them.` },
  ],
});

// ---------------------------------------------------------------- the number of divisors

interface DivP { es: readonly number[] }
const divMis = (es: readonly number[]): string[] => {
  const nz = es.filter((e) => e > 0);
  return [String(nz.reduce((x, e) => x * e, 1)), String(nz.reduce((x, e) => x + e + 1, 0)), String(nz.reduce((x, e) => x + e, 0))];
};

const countDivisors = generator<DivP>({
  id: 'count-divisors',
  skill: 'Count the divisors of n from its prime factorisation: a divisor picks an exponent from 0 to e for each prime, so there are Π (e + 1).',
  params: (rng) => {
    for (;;) {
      const es = PR.map(() => int(rng, 0, 3));
      const n = build(es);
      const d = es.reduce((x, e) => x * (e + 1), 1);
      if (n >= 12 && n <= 200000 && es.filter((e) => e > 0).length >= 2 && distinctFrom(String(d), divMis(es)) >= 2) return { es };
    }
  },
  sane: ({ es }) => (build([...es]) >= 12 ? null : 'out of range'),
  problem: ({ es }) => {
    const n = build(es);
    const nz = es.flatMap((e, i) => (e > 0 ? [[PR[i] as number, e] as const] : []));
    return {
      prompt: t`${math`${n} = ${factTex(n)}`}. How many positive divisors does ${n} have?`,
      answer: { kind: 'exact', expected: String(es.reduce((x, e) => x * (e + 1), 1)) },
      solution: [
        t`By uniqueness of factorisation, a divisor of ${n} is a product of the same primes with exponents no larger: ${nz.map(([p, e]) => [math`${p}^{j}`, ...t` with ${math`${0} \le j \le ${e}`}`]).flatMap((r, i) => (i === 0 ? r : [...t`; `, ...r]))}.`,
        t`Choosing each exponent independently: ${math`${computedTex(nz.map(([, e]) => `(${e} + 1)`).join(' \\times '))} = ${es.reduce((x, e) => x * (e + 1), 1)}`}.`,
      ],
    };
  },
  solve: ({ es }) => String(divisors(build(es)).length),
  misconceptions: ({ es }): Misconception[] => {
    const nz = es.filter((e) => e > 0);
    return [
      { response: String(nz.reduce((x, e) => x * e, 1)), why: t`Each exponent can also be ${0}: there are ${math`e + ${1}`} choices for a prime with exponent ${math`e`}, not ${math`e`}.` },
      { response: String(nz.reduce((x, e) => x + e + 1, 0)), why: t`The choices for different primes combine by the product rule: multiply the ${math`(e + ${1})`}s, do not add them.` },
      { response: String(nz.reduce((x, e) => x + e, 0)), why: t`That counts prime factors with repetition. A divisor is any product of them, including ${1} and the number itself.` },
    ];
  },
});

// ---------------------------------------------------------------- making a square

interface SqP { es: readonly number[] }
const sqVal = (es: readonly number[]): number => build(es.map((e) => e % 2));
const sqMis = (es: readonly number[]): string[] => [String(build(es)), String(build(es.map((e) => (e > 0 ? 1 : 0)))), String(build(es.map((e) => (e % 2 === 1 ? 0 : e > 0 ? 1 : 0))))];

const makeSquare = generator<SqP>({
  id: 'make-square',
  skill: 'Use unique factorisation to make a perfect square: n k is a square exactly when every prime\'s exponent is even, so k supplies the odd ones.',
  params: (rng) => {
    for (;;) {
      const es = PR.map(() => int(rng, 0, 4));
      const n = build(es);
      if (n >= 12 && n <= 300000 && es.some((e) => e % 2 === 1) && es.some((e) => e >= 2) && distinctFrom(String(sqVal(es)), sqMis(es)) >= 2) return { es };
    }
  },
  sane: ({ es }) => (es.some((e) => e % 2 === 1) ? null : 'out of range'),
  problem: ({ es }) => {
    const n = build(es);
    const k = sqVal(es);
    return {
      prompt: t`${math`${n} = ${factTex(n)}`}. What is the smallest positive integer ${math`k`} such that ${math`${n}k`} is a perfect square?`,
      answer: { kind: 'exact', expected: String(k) },
      solution: [
        t`A square's factorisation has every exponent even (its square root's exponents, doubled), and the factorisation is unique, so ${math`${n}k`} is a square exactly when each prime's total exponent is even.`,
        t`The primes with odd exponent in ${n} need one more factor each: ${math`k = ${factTex(k)} = ${k}`}, and ${math`${n} \times ${k} = ${n * k} = ${Math.round(Math.sqrt(n * k))}^{${2}}`}.`,
      ],
    };
  },
  solve: ({ es }) => {
    const n = build(es);
    for (let k = 1; k <= n; k++) { const r = Math.round(Math.sqrt(n * k)); if (r * r === n * k) return String(k); }
    return 'none';
  },
  misconceptions: ({ es }): Misconception[] => [
    { response: String(build(es)), why: t`${math`n \times n`} is a square, but a smaller ${math`k`} works: only the primes with odd exponent need another factor.` },
    { response: String(build(es.map((e) => (e > 0 ? 1 : 0)))), why: t`Primes that already have an even exponent need nothing more: multiplying by them makes their exponent odd.` },
    { response: String(build(es.map((e) => (e % 2 === 1 ? 0 : e > 0 ? 1 : 0)))), why: t`That picks the primes with even exponent. It is the odd exponents that must be made even.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const notes99 = auto({
  id: 'notes-305-example-99',
  source: cite('cst-dm-notes', 'printed pages 304 and 305, Examples 98 and 99'),
  title: t`${math`\gcd(${1224}, ${660})`} by minimum exponents`,
  prompt: t`Using ${math`\gcd\left(\prod_{p} p^{m_{p}}, \prod_{p} p^{n_{p}}\right) = \prod_{p} p^{\min(m_{p}, n_{p})}`}, find ${math`\gcd(${1224}, ${660})`}.`,
  answer: { kind: 'exact', expected: String(gcd(1224, 660)) },
  solution: [
    t`${math`${1224} = ${expTex(1224, [2, 3, 5, 11, 17])}`} and ${math`${660} = ${expTex(660, [2, 3, 5, 11, 17])}`}.`,
    t`Minimum exponents: ${math`${2}^{\min(${3}, ${2})} \cdot ${3}^{\min(${2}, ${1})} \cdot ${5}^{${0}} \cdot ${11}^{${0}} \cdot ${17}^{${0}} = ${2}^{${2}} \cdot ${3} = ${12}`}, as in the notes.`,
  ],
  reference: '12',
  verify: () => same('Euclid\'s algorithm', gcd(1224, 660), 12),
  misconceptions: [{ response: String(1224 * 660 / gcd(1224, 660)), why: t`That is the lcm, with maximum exponents. The gcd takes the minimum.` }],
  official: { source: cite('cst-dm-notes', 'printed page 305, Example 99'), answer: '12', agrees: true },
});

const notes98 = auto({
  id: 'notes-304-example-98',
  source: cite('cst-dm-notes', 'printed page 304, Example 98', true),
  title: t`The power of ${2} in ${1224}`,
  prompt: t`Example ${98} of the notes writes ${1224} as a product of prime powers. What is the exponent of ${2} in the prime factorisation of ${1224}?`,
  answer: { kind: 'exact', expected: String(expOf(1224, 2)) },
  solution: [
    t`Halve until odd: ${math`${1224} \to ${612} \to ${306} \to ${153}`}, three halvings, and ${math`${153} = ${3}^{${2}} \times ${17}`}. So ${math`${1224} = ${factTex(1224)}`}: the exponent of ${2} is ${expOf(1224, 2)}.`,
    t`The notes print ${math`${2}^{${2}} \cdot ${3}^{${2}} \cdot ${17}`}, which is ${4 * 9 * 17}: a misprint. Their Example ${68} lists ${divisors(1224).length} divisors of ${1224}, which fits ${math`(${3} + ${1})(${2} + ${1})(${1} + ${1}) = ${24}`}, not ${math`(${2} + ${1})(${2} + ${1})(${1} + ${1}) = ${18}`}.`,
  ],
  reference: String(expOf(1224, 2)),
  verify: () => same('the factorisation by trial division', factorise(1224).map(([p, e]) => `${p}^${e}`).join(' '), '2^3 3^2 17^1'),
  misconceptions: [{ response: '2', why: t`${math`${2}^{${2}} \times ${3}^{${2}} \times ${17} = ${612}`}, half of ${1224}: one factor of ${2} is missing.` }],
  // The notes print 1224 = 2^2 · 3^2 · 5^0 · 7^0 · 11^0 · 13^0 · 17^1 · 19^0 · ... (checked on the rendered page).
  official: { source: cite('cst-dm-notes', 'printed page 304, Example 98'), answer: '2', agrees: false, note: 'The notes print 2^2 · 3^2 · 17 for 1224, but that product is 612; 1224 = 2^3 · 3^2 · 17. The computed exponent, 3, is right; it also agrees with Example 68, which lists 24 divisors of 1224. Example 99 still gives gcd(1224, 660) = 12, since min(3, 2) = min(2, 2).' },
});

const notes68 = auto({
  id: 'notes-208-example-68',
  source: cite('cst-dm-notes', 'printed page 208, Example 68', true),
  title: t`How many divisors has ${1224}?`,
  prompt: t`Example ${68} of the notes lists ${math`D(${1224})`}, the divisors of ${1224}. Without listing them, how many are there?`,
  answer: { kind: 'exact', expected: String(divisors(1224).length) },
  solution: [t`${math`${1224} = ${factTex(1224)}`}, so a divisor is ${math`${2}^{a}${3}^{b}${17}^{c}`} with ${math`${0} \le a \le ${3}`}, ${math`${0} \le b \le ${2}`}, ${math`${0} \le c \le ${1}`}: ${math`${4} \times ${3} \times ${2} = ${24}`} divisors, the length of the notes' list.`],
  reference: '24',
  verify: () => same('trial division', divisors(1224).length, 24),
  misconceptions: [{ response: '18', why: t`That uses ${math`${2}^{${2}}`}; ${1224} has ${math`${2}^{${3}}`}, so the exponent of ${2} has four choices.` }],
  official: { source: cite('cst-dm-notes', 'printed page 208, Example 68'), answer: '24', agrees: true },
});

const homework302 = supervision({
  id: 'notes-302-homework',
  source: cite('cst-dm-notes', 'printed pages 297 to 302, the uniqueness proofs and Homework'),
  title: t`Uniqueness by induction`,
  prompt: t`The notes prove uniqueness of prime factorisation twice: by "iterating" (if ${math`p_{${1}} \cdots p_{\ell} = q_{${1}} \cdots q_{k}`} then ${math`p_{${1}} = q_{${1}}`} by Euclid's theorem, cancel, repeat) and by induction on ${math`\ell`}. Do the Homework: show that uniqueness also follows from ${math`\forall \ell \ge ${1}.\ P'(\ell)`}, where ${math`P'(\ell)`} quantifies over ${math`k \ge \ell`} only, and prove that statement by induction. Where is Euclid's theorem used, and why must the primes be ordered?`,
  writeUp: 'proof',
});
const bop101 = supervision({
  id: 'bop-10-4-theorem-10-1',
  source: cite('bop', 'Section 10.4, Theorem 10.1'),
  title: t`Uniqueness by a smallest counterexample`,
  prompt: t`Book of Proof proves uniqueness by assuming a smallest ${math`n > ${2}`} with two different prime factorisations and producing a smaller one. Write that proof in full. Which fact about primes does it use (Book of Proof's Proposition ${10}.${1}, the notes' Corollary ${84}), and what goes wrong in ${math`\{${1}, ${5}, ${9}, ${13}, \ldots\}`}, the numbers ${math`\equiv ${1} \pmod{${4}}`}, where ${math`${441} = ${9} \times ${49} = ${21} \times ${21}`}?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns3-q11 (20 marks):
 * 1. Suppose x is rational, x = p/q in lowest terms with q >= 1 (3).
 * 2. Multiply the equation by q^n: p^n = -q (a_(n-1) p^(n-1) + a_(n-2) p^(n-2) q + ... + a_0 q^(n-1)),
 *    so q divides p^n (6).
 * 3. If q > 1, it has a prime factor r; r divides p^n, so r divides p (Euclid's lemma, or unique
 *    factorisation) (6).
 * 4. Then r divides both p and q, against lowest terms; so q = 1 and x = p is an integer. Hence x is
 *    an integer or irrational (5).
 */
const ns3q11 = supervision({
  id: 'ns3-q11',
  source: cite('ia-ns-sheet-3', 'Q11'),
  title: t`Roots of monic integer polynomials`,
  prompt: t`Suppose that ${math`x \in \mathbb{R}`} is a root of a monic integer polynomial, that is, ${math`x^{n} + a_{n - ${1}}x^{n - ${1}} + a_{n - ${2}}x^{n - ${2}} + \cdots + a_{${0}} = ${0}`} for some integers ${math`a_{n - ${1}}, \ldots, a_{${0}}`}. Prove that ${math`x`} is either an integer or irrational.`,
  writeUp: 'proof',
});

/*
 * Outline for marking sw-3-2-3 (20 marks):
 * 1. By unique factorisation, gcd(u, v) is the product over primes p of p^min(u_p, v_p) (4).
 * 2. gcd(a, c) = 1 means no prime divides both: for each p with c_p > 0, a_p = 0 (4).
 * 3. For such p, (ab)_p = a_p + b_p = b_p, so min((ab)_p, c_p) = min(b_p, c_p) (6).
 * 4. For p with c_p = 0, both minima are 0 (3). So the products agree: gcd(ab, c) = gcd(b, c) (3).
 *    (A proof by mutual divisibility with Euclid's lemma earns the same marks.)
 */
const sw323 = supervision({
  id: 'sw-3-2-3',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.3'),
  title: t`A coprime factor does not change the gcd`,
  prompt: t`Prove that for all positive integers ${math`a, b, c`}, if ${math`\gcd(a, c) = ${1}`} then ${math`\gcd(a \cdot b, c) = \gcd(b, c)`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.3'),
});

// ---------------------------------------------------------------- lesson

const [mm, md] = [math`m`, math`d`];
const DV = 360;
const expCounts = (n: number): number[] => factorise(n).map(([, e]) => e + 1);
const [GA, GB] = [72, 120];

export const fundamentalTheorem: TopicContent = {
  topicId: 'num.fundamental-theorem',
  goal: t`Prove that every integer ${math`n \ge ${2}`} is a product of primes in exactly one way up to order, and use unique factorisation to compute gcds, lcms, and numbers of divisors.`,
  objective: t`Prove that prime factorisation exists and is unique, and use it for gcds, lcms, and divisor counts.`,
  why: t`Unique factorisation underlies nearly every argument about integers, from irrationality proofs to RSA.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Atoms of multiplication` },
    { kind: 'hook', text: t`${math`${DV} = ${factTex(DV)}`}. However you start, splitting ${DV} as ${math`${10} \times ${36}`} or ${math`${8} \times ${45}`}, you end with the same primes. That feels obvious. It is not: there are number systems where it fails, and the proof needs a real idea.` },
    {
      kind: 'theorem',
      name: t`Fundamental theorem of arithmetic`,
      statement: t`Every integer ${math`n \ge ${2}`} can be written as a product of primes ${math`n = p_{${1}} p_{${2}} \cdots p_{\ell}`} with ${math`p_{${1}} \le p_{${2}} \le \cdots \le p_{\ell}`}, and this sequence of primes is unique.`,
    },
    { kind: 'p', text: t`This is the [[fundamental-theorem-arithmetic|fundamental theorem of arithmetic]], the notes' Theorem ${97}. Sorting the primes is how "up to order" is made precise: ${math`${2} \cdot ${3} \cdot ${2}`} and ${math`${2} \cdot ${2} \cdot ${3}`} are the same factorisation, and sorting turns both into the second. A prime is its own factorisation, with ${math`\ell = ${1}`}.` },
    { kind: 'section', title: t`Existence` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Strong induction`, text: t`Let ${math`n \ge ${2}`}, and assume every integer from ${2} to ${math`n - ${1}`} is a product of primes.`, plain: t`Strong induction lets us use the claim for every smaller number, not just ${math`n - ${1}`}.` },
        { label: t`If ${mn} is prime`, text: t`Then ${mn} is a product of one prime, itself.`, plain: t`Nothing to do.` },
        { label: t`If ${mn} is composite`, text: t`Then ${math`n = ab`} with ${math`${2} \le a, b < n`}.`, plain: t`Composite means it has a divisor strictly between ${1} and ${mn}. ${math`${DV} = ${10} \times ${36}`}.` },
        { label: t`Combine`, text: t`By the hypothesis, ${math`a`} and ${math`b`} are products of primes, so ${math`n = ab`} is too. Sort the primes.`, plain: t`Put the two lists together.` },
      ],
    },
    { kind: 'section', title: t`Uniqueness` },
    { kind: 'narrative', text: t`For uniqueness, take two factorisations of the same ${mn} and show they agree, prime by prime. The key is Euclid's lemma: a prime dividing a product divides one of the factors.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Set up`, text: t`By strong induction on ${mn}: suppose every integer from ${2} to ${math`n - ${1}`} has a unique factorisation, and ${math`n = p_{${1}} \cdots p_{\ell} = q_{${1}} \cdots q_{k}`}, both sorted.`, plain: t`Two lists of primes with the same product.` },
        {
          label: t`The smallest primes agree`, text: t`${math`p_{${1}} \mid q_{${1}} \cdots q_{k}`}, so by Euclid's lemma ${math`p_{${1}} \mid q_{i}`} for some ${math`i`}, and as ${math`q_{i}`} is prime, ${math`p_{${1}} = q_{i} \ge q_{${1}}`}. In the same way ${math`q_{${1}} \ge p_{${1}}`}. So ${math`p_{${1}} = q_{${1}}`}.`,
          plain: t`The prime ${math`p_{${1}}`} must appear on the right, so it is at least the smallest prime there; and the other way round.`,
          why: { q: t`Why does ${math`p_{${1}} \mid q_{i}`} force ${math`p_{${1}} = q_{i}`}?`, a: t`A prime ${math`q_{i}`} has only the divisors ${1} and ${math`q_{i}`}, and ${math`p_{${1}}`} is not ${1}.` },
        },
        { label: t`Cancel`, text: t`Let ${math`m = n / p_{${1}}`}. If ${math`m = ${1}`}, both lists are just ${math`p_{${1}}`}. Otherwise ${math`m = p_{${2}} \cdots p_{\ell} = q_{${2}} \cdots q_{k}`} with ${math`${2} \le m < n`}.`, plain: t`Divide both sides by the common smallest prime.` },
        { label: t`Use the hypothesis`, text: t`${mm} has a unique factorisation, so the remaining lists agree: ${math`\ell = k`} and ${math`p_{i} = q_{i}`} for every ${math`i`}.`, plain: t`So the two original lists were the same list.` },
      ],
    },
    {
      kind: 'pitfall',
      claim: t`Unique factorisation is automatic in any set of numbers closed under multiplication.`,
      counterexample: t`In ${math`\{${1}, ${5}, ${9}, ${13}, \ldots\}`}, the numbers ${math`\equiv ${1} \pmod{${4}}`}, the numbers ${9}, ${21}, and ${49} cannot be split further inside the set, yet ${math`${441} = ${9} \times ${49} = ${21} \times ${21}`}. Euclid's lemma fails there: ${21} divides ${math`${9} \times ${49}`} but neither factor.`,
    },
    { kind: 'section', title: t`Using it` },
    {
      kind: 'p',
      text: t`The notes restate the theorem as ${math`n = \prod_{p} p^{n_{p}}`}, over all primes, with only finitely many exponents ${math`n_{p}`} nonzero. Then a divisor of ${mn} is exactly a product of the same primes with exponents no larger, so ${mn} has ${math`\prod_{p} (n_{p} + ${1})`} divisors. ${math`${DV} = ${factTex(DV)}`} has ${math`${computedTex(expCounts(DV).join(' \\times '))} = ${divisors(DV).length}`}.`,
      why: { q: t`Why is every divisor of that form?`, a: t`If ${math`d \mid n`}, then ${math`n = de`}, and the factorisation of ${mn} is the factorisations of ${md} and ${math`e`} put together, by uniqueness. So each prime appears in ${md} at most as often as in ${mn}.` },
    },
    { kind: 'p', text: t`The gcd takes the smaller exponent of each prime, and the lcm the larger: ${math`${GA} = ${factTex(GA)}`} and ${math`${GB} = ${factTex(GB)}`} give ${math`\gcd = ${gcd(GA, GB)}`} and ${math`\operatorname{lcm} = ${GA * GB / gcd(GA, GB)}`}.` },
    quickCheck({
      prompt: t`How many positive divisors has ${math`${2}^{${4}} \cdot ${3}^{${2}} = ${16 * 9}`}?`,
      answer: { kind: 'exact', expected: String(divisors(16 * 9).length) },
      reference: String(divisors(16 * 9).length),
      why: t`Choose the power of ${2} from ${0} to ${4} (${5} ways) and of ${3} from ${0} to ${2} (${3} ways): ${math`${5} \times ${3} = ${divisors(16 * 9).length}`}.`,
    }),
    { kind: 'takeaway', text: t`Every integer from ${2} up is a product of primes in exactly one sorted way; existence is strong induction, uniqueness is Euclid's lemma, and exponents then give gcds, lcms, and divisor counts.` },
  ],
  examples: [
    { ...workedCambridge(notes99), examiner: t`Both numbers fully factorised first, then the minimum exponent taken prime by prime, including primes missing from one number.` },
    worked(countDivisors, { es: [3, 2, 0, 0, 1] }, t`The divisors of ${build([3, 2, 0, 0, 1])}`),
    worked(makeSquare, { es: [3, 2, 1, 0, 0] }, t`Making ${build([3, 2, 1, 0, 0])} a square`),
  ],
  generators: [gcdLcm, countDivisors, makeSquare],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fundamental-theorem-arithmetic'],
  cambridge: withUses([notes98, notes68, homework302, bop101, ns3q11, sw323], {
    'ns3-q11': { sections: ['Using it'], note: t`A rational root of a monic polynomial must be an integer` },
    'notes-302-homework': { sections: ['Uniqueness'], note: t`Uniqueness of factorisation by induction` },
    'sw-3-2-3': { sections: ['Using it'], note: t`A coprime factor does not change the gcd` },
  }),
  // The IA monic polynomial question first (unique factorisation does the work), then the
  // uniqueness proof by induction and the gcd exercise. Examples 98 and 68 are single computations, left out.
  gate: ['ns3-q11', 'notes-302-homework', 'sw-3-2-3'],
  recall: [
    { front: t`State the fundamental theorem of arithmetic.`, back: t`Every integer ${math`n \ge ${2}`} is a product of primes, and the sorted list of primes is unique.` },
    { front: t`Which lemma gives uniqueness?`, back: t`Euclid's lemma: if a prime divides a product, it divides one of the factors.` },
    { front: t`How many divisors has ${math`\prod_{p} p^{n_{p}}`}?`, back: t`${math`\prod_{p} (n_{p} + ${1})`}.` },
    { front: t`The gcd and lcm in terms of exponents?`, back: t`The gcd takes the minimum exponent of each prime, the lcm the maximum.` },
  ],
  proofOrder: [
    {
      title: t`Uniqueness of prime factorisation`,
      steps: [
        t`Suppose ${math`p_{${1}} \cdots p_{\ell} = q_{${1}} \cdots q_{k}`}, both sorted.`,
        t`${math`p_{${1}}`} divides the right side, so it equals some ${math`q_{i}`}, and ${math`p_{${1}} \ge q_{${1}}`}.`,
        t`By symmetry ${math`q_{${1}} \ge p_{${1}}`}, so ${math`p_{${1}} = q_{${1}}`}.`,
        t`Cancel it; the smaller number has a unique factorisation, so the rest agree.`,
      ],
    },
  ],
};
