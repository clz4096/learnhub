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
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { divisors, factorise, gcd } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

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

// ---------------------------------------------------------------- lesson

export const fundamentalTheorem: TopicContent = {
  topicId: 'num.fundamental-theorem',
  goal: t`Prove that every integer ${math`n \ge ${2}`} is a product of primes in exactly one way up to order, and use unique factorisation to compute gcds, lcms, and numbers of divisors.`,
  lesson: [
    { kind: 'rule', text: t`The [[fundamental-theorem-arithmetic|fundamental theorem of arithmetic]] (Theorem ${97}): every positive integer is the product of a unique finite ordered sequence of primes ${math`p_{${1}} \le \cdots \le p_{\ell}`}. For ${1} the sequence is empty.` },
    { kind: 'p', text: t`Existence is Proposition ${96}, by strong induction: a composite number splits into two smaller factors, each a product of primes. Uniqueness needs Euclid's theorem: if ${math`p_{${1}} \cdots p_{\ell} = q_{${1}} \cdots q_{k}`}, then ${math`p_{${1}}`} divides the right side, so it divides, and equals, some ${math`q_{i}`}; so ${math`q_{${1}} \le p_{${1}}`}, and by symmetry ${math`p_{${1}} = q_{${1}}`}. Cancel and repeat.` },
    { kind: 'p', text: t`Uniqueness is not automatic. In ${math`\{${1}, ${5}, ${9}, ${13}, \ldots\}`}, closed under multiplication, ${9}, ${21}, and ${49} cannot be split further there, yet ${math`${441} = ${9} \times ${49} = ${21} \times ${21}`}. What fails is Euclid's theorem.` },
    { kind: 'p', text: t`The notes' restatement: ${math`n = \prod_{p} p^{n_{p}}`}, the product over all primes, with only finitely many ${math`n_{p} \ne ${0}`}. Then ${math`\gcd`} takes minimum exponents and ${math`\operatorname{lcm}`} maximum ones: ${math`${1224} = ${factTex(1224)}`} and ${math`${660} = ${factTex(660)}`} give ${math`\gcd = ${2}^{${2}} \cdot ${3} = ${12}`} (Example ${99}).` },
    { kind: 'p', text: t`Divisors of ${mn} are exactly the products of its primes with exponents no larger, so ${mn} has ${math`\prod (n_{p} + ${1})`} of them: ${1224} has ${math`${4} \times ${3} \times ${2} = ${24}`}, matching the notes' list ${math`D(${1224})`}, which begins ${listOf(divisors(1224).slice(0, 6))}.` },
  ],
  examples: [
    workedCambridge(notes99),
    worked(countDivisors, { es: [3, 2, 0, 0, 1] }, t`The divisors of ${build([3, 2, 0, 0, 1])}`),
    worked(makeSquare, { es: [3, 2, 1, 0, 0] }, t`Making ${build([3, 2, 1, 0, 0])} a square`),
  ],
  generators: [gcdLcm, countDivisors, makeSquare],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fundamental-theorem-arithmetic'],
  cambridge: [notes98, notes68, homework302, bop101],
};
