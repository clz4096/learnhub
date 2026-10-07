/**
 * num.prime-binomial: for a prime p and 0 < k < p, p divides C(p, k), from
 * k C(p, k) = p C(p - 1, k - 1) and Euclid's theorem. The lesson follows the CST notes
 * (printed pages 116 to 121: Lemma 27, Lemma 28 with its footnote asking for the missing
 * argument, Proposition 29; pages 242 and 243: Corollary 85, p | C(p, m) and
 * (p - m) | C(p - 1, m), from p C(p - 1, m) = (p - m) C(p, m)) and Book of Proof Chapter 4,
 * exercise 21, whose solution argues with prime factorisations instead.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { chooseBig, isPrime } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mp, mk] = [math`p`, math`k`];
const C = (n: number, k: number): bigint => chooseBig(n, k);
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));
const PRIMES = [5, 7, 11, 13, 17, 19, 23];

// ---------------------------------------------------------------- the quotient C(p, k) / p

interface QuoP { p: number; k: number }

const quotient = generator<QuoP>({
  id: 'quotient',
  skill: 'Compute C(p, k) / p for a prime p from k C(p, k) = p C(p - 1, k - 1): the quotient is C(p - 1, k - 1) / k, a whole number.',
  params: (rng) => { const p = pick(rng, PRIMES); return { p, k: int(rng, 1, p - 1) }; },
  sane: ({ p, k }) => (isPrime(p) && k >= 1 && k < p ? null : 'out of range'),
  problem: ({ p, k }) => {
    const v = C(p, k) / BigInt(p);
    return {
      prompt: t`${mp} ${math`= ${p}`} is prime, so ${math`${p} \mid \binom{${p}}{${k}}`}. What is ${math`\binom{${p}}{${k}} / ${p}`}?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`} (both count ways to choose ${mk} of ${mp} people with a leader among them). So ${math`\binom{${p}}{${k}} / ${p} = \binom{${p - 1}}{${k - 1}} / ${k} = ${C(p - 1, k - 1)} / ${k}`}.`,
        t`That is ${v}. It is a whole number because ${mp} divides ${math`k \binom{p}{k}`} but not ${mk}: Euclid's theorem.`,
      ],
    };
  },
  solve: ({ p, k }) => String(C(p, k) / BigInt(p)),
  misconceptions: ({ p, k }): Misconception[] => [
    { response: String(C(p - 1, k - 1)), why: t`${math`\binom{${p - 1}}{${k - 1}}`} is ${math`k \binom{p}{k} / p`}: divide by ${mk} as well.` },
    { response: String(C(p - 1, k)), why: t`${math`\binom{${p - 1}}{${k}}`} is the number of choices that leave out one fixed person. Use ${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`}.` },
    { response: String(C(p, k)), why: t`That is ${math`\binom{${p}}{${k}}`} itself. Divide it by ${p}.` },
  ],
});

// ---------------------------------------------------------------- composite rows

interface CompP { n: number }
const COMPOSITES = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 26, 27];

const compositeWitness = generator<CompP>({
  id: 'composite-witness',
  skill: 'See that primality is needed: for a composite n, find 0 < k < n with n not dividing C(n, k).',
  params: (rng) => ({ n: pick(rng, COMPOSITES) }),
  sane: ({ n }) => (!isPrime(n) ? null : 'out of range'),
  problem: ({ n }) => {
    const p = upTo(n).find((d) => d > 1 && n % d === 0) as number;
    return {
      prompt: t`${n} is not prime. Find ${mk} with ${math`${0} < k < ${n}`} such that ${n} does not divide ${math`\binom{${n}}{k}`}.`,
      answer: {
        kind: 'witness', count: 1, names: ['k'], example: `k = ${p}`,
        check: ([v]) => {
          const k = big(v);
          if (k === null || k <= 0 || k >= n) return `Give k between 1 and ${n - 1}.`;
          return C(n, k) % BigInt(n) !== 0n ? null : `C(${n}, ${k}) = ${C(n, k)} is a multiple of ${n}.`;
        },
      },
      solution: [
        t`Try ${mk} equal to the smallest prime factor of ${n}, ${p}: ${math`\binom{${n}}{${p}} = ${C(n, p)}`}, and ${math`${C(n, p)} = ${C(n, p) / BigInt(n)} \times ${n} + ${C(n, p) % BigInt(n)}`}.`,
        t`The proof for primes breaks here: from ${math`k\binom{n}{k} = n\binom{n - ${1}}{k - ${1}}`}, ${n} divides ${math`k\binom{n}{k}`}, but ${mk} and ${n} share the factor ${p}, so Euclid's theorem does not apply.`,
      ],
    };
  },
  solve: ({ n }) => `k = ${upTo(n - 1).find((k) => C(n, k) % BigInt(n) !== 0n)}`,
  misconceptions: ({ n }): Misconception[] => [
    { response: 'k = 1', why: t`${math`\binom{${n}}{${1}} = ${n}`}, which ${n} divides. Try a ${mk} sharing a factor with ${n}.` },
    { response: `k = ${n - 1}`, why: t`${math`\binom{${n}}{${n - 1}} = ${n}`} too. Try a ${mk} sharing a factor with ${n}.` },
    { response: 'k = 0', why: t`${mk} must be strictly between ${0} and ${n}; ${math`\binom{${n}}{${0}} = ${1}`} is an end of the row.` },
  ],
});

// ---------------------------------------------------------------- how many entries are multiples

interface RowP { n: number }
const multiplesInRow = (n: number): number => upTo(n - 1).filter((k) => C(n, k) % BigInt(n) === 0n).length;

const rowCount = generator<RowP>({
  id: 'row-count',
  skill: 'Count the entries C(n, k), 0 < k < n, that n divides: all n - 1 of them when n is prime, fewer when it is not.',
  params: (rng) => ({ n: pick(rng, [...PRIMES, ...COMPOSITES.filter((x) => x >= 6)]) }),
  sane: ({ n }) => (n >= 5 ? null : 'out of range'),
  problem: ({ n }) => {
    const c = multiplesInRow(n);
    return {
      prompt: t`In row ${n} of Pascal's triangle, how many of the inner entries ${math`\binom{${n}}{k}`}, ${math`${0} < k < ${n}`}, are multiples of ${n}?`,
      answer: { kind: 'exact', expected: String(c) },
      solution: isPrime(n)
        ? [t`${n} is prime, so by Lemma ${28} of the notes every inner entry is a multiple of ${n}: all ${n - 1} of them.`]
        : [
          t`${n} is not prime. Whenever ${math`\gcd(k, ${n}) = ${1}`}, ${n} divides ${math`\binom{${n}}{k}`}, by ${math`k\binom{n}{k} = n\binom{n - ${1}}{k - ${1}}`} and Euclid's theorem; for other ${mk} it may or may not.`,
          t`Checking each ${mk}: ${c} of the ${n - 1} inner entries are multiples of ${n}.`,
        ],
    };
  },
  solve: ({ n }) => String(upTo(n - 1).filter((k) => Number(C(n, k) % BigInt(n)) === 0).length),
  misconceptions: ({ n }): Misconception[] => {
    const out: Misconception[] = [
      { response: '0', why: t`${math`\binom{${n}}{${1}} = ${n}`} is a multiple of ${n} already. Check the others.` },
      { response: String(n + 1), why: t`The row has ${n + 1} entries, but the end ones are ${1}, and only the inner ones, ${math`${0} < k < ${n}`}, are asked about.` },
    ];
    if (!isPrime(n)) out.push({ response: String(n - 1), why: t`That would be true for a prime. ${n} is not prime: check, for example, ${math`k = ${upTo(n).find((d) => d > 1 && n % d === 0) as number}`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const lemma28 = workedProof({
  title: t`Lemma ${28}, with the missing argument`,
  prompt: t`Lemma ${28} of the CST notes: for all integers ${mp} and ${math`m`}, if ${mp} is prime and ${math`${0} < m < p`} then ${math`\binom{p}{m} \equiv ${0} \pmod{p}`}. The notes write ${math`\binom{p}{m} = p \cdot \frac{(p - ${1})!}{m!\,(p - m)!}`} and ask the reader to supply why the fraction is a natural number.`,
  steps: [
    t`Corollary ${85} gives the missing argument. Count the ways to choose a set of ${math`m`} from ${mp} people and one more person from the other ${math`p - m`}: it is ${math`\binom{p}{m}(p - m)`}; choosing that person first and then ${math`m`} of the remaining ${math`p - ${1}`}, it is ${math`p \binom{p - ${1}}{m}`}. So ${math`(p - m)\binom{p}{m} = p\binom{p - ${1}}{m}`}.`,
    t`So ${mp} divides ${math`(p - m)\binom{p}{m}`}. Since ${math`${0} < p - m < p`} and ${mp} is prime, ${math`\gcd(p, p - m) = ${1}`}, and Euclid's theorem (Theorem ${83}) gives ${math`p \mid \binom{p}{m}`}.`,
    t`Primality is used exactly once, for ${math`\gcd(p, p - m) = ${1}`}. For ${math`p = ${4}`}, ${math`m = ${2}`}: ${math`\binom{${4}}{${2}} = ${6}`}, not a multiple of ${4}.`,
  ],
  answer: t`${math`p \mid \binom{p}{m}`} for a prime ${mp} and ${math`${0} < m < p`}.`,
  source: cite('cst-dm-notes', 'printed pages 118, 119, 242, and 243, Lemma 28 and Corollary 85'),
});

const P29 = 7;
const prop29 = auto({
  id: 'notes-120-proposition-29',
  source: cite('cst-dm-notes', 'printed pages 120 and 121, Proposition 29', true),
  title: t`Row ${P29} modulo ${P29}`,
  prompt: t`Proposition ${29}: for a prime ${mp} and ${math`${0} \le m \le p`}, ${math`\binom{p}{m}`} is congruent to ${0} or ${1} modulo ${mp}. Fill in ${math`\binom{${P29}}{m} \bmod ${P29}`} for ${math`m = ${0}, \ldots, ${P29}`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${math`m`}`, t`${math`\binom{${P29}}{m} \bmod ${P29}`}`], rows: upTo(P29 + 1).map((m) => [t`${m - 1}`, null]), expected: upTo(P29 + 1).map((m) => String(C(P29, m - 1) % BigInt(P29))) },
  solution: [
    t`The proof is by three cases: ${math`m = ${0}`} and ${math`m = p`} give ${1} (Lemma ${27}), and ${math`${0} < m < p`} gives ${0} (Lemma ${28}).`,
    t`Row ${P29} is ${math`${C(P29, 0)}, ${C(P29, 1)}, ${C(P29, 2)}, ${C(P29, 3)}, ${C(P29, 4)}, ${C(P29, 5)}, ${C(P29, 6)}, ${C(P29, 7)}`}: every inner entry is a multiple of ${P29}.`,
  ],
  reference: upTo(P29 + 1).map((m) => String(C(P29, m - 1) % BigInt(P29))),
  verify: () => same('the row by Pascal\'s rule, reduced', (() => { let row = [1]; for (let i = 0; i < P29; i++) row = Array.from({ length: row.length + 1 }, (_, k) => (row[k] ?? 0) + (row[k - 1] ?? 0)); return row.map((x) => x % P29).join(); })(), '1,0,0,0,0,0,0,1'),
  misconceptions: [{ response: upTo(P29 + 1).map((m) => String(C(P29, m - 1))), why: t`Those are the entries themselves. Reduce each modulo ${P29}.` }],
  official: { source: cite('cst-dm-notes', 'printed pages 116 to 121, Lemmas 27 and 28'), answer: ['1', '0', '0', '0', '0', '0', '0', '1'], agrees: true },
});

const [P85, M85] = [11, 4];
const cor85 = auto({
  id: 'notes-242-corollary-85',
  source: cite('cst-dm-notes', 'printed page 242, Corollary 85', true),
  title: t`The second half of Corollary ${85}`,
  prompt: t`Corollary ${85} also says ${math`(p - m) \mid \binom{p - ${1}}{m}`}. For ${math`p = ${P85}`} and ${math`m = ${M85}`}, compute ${math`\binom{${P85 - 1}}{${M85}} / ${P85 - M85}`}.`,
  answer: { kind: 'exact', expected: String(C(P85 - 1, M85) / BigInt(P85 - M85)) },
  solution: [
    t`${math`\binom{${P85 - 1}}{${M85}} = ${C(P85 - 1, M85)}`}, and ${math`${C(P85 - 1, M85)} / ${P85 - M85} = ${C(P85 - 1, M85) / BigInt(P85 - M85)}`}.`,
    t`It is no accident that this is ${math`\binom{${P85}}{${M85}} / ${P85} = ${C(P85, M85)} / ${P85}`}: both are the two sides of ${math`p\binom{p - ${1}}{m} = (p - m)\binom{p}{m}`}, divided by ${math`p(p - m)`}.`,
  ],
  reference: String(C(P85 - 1, M85) / BigInt(P85 - M85)),
  verify: () => same('the identity p C(p - 1, m) = (p - m) C(p, m)', BigInt(P85) * C(P85 - 1, M85), BigInt(P85 - M85) * C(P85, M85)),
  misconceptions: [{ response: String(C(P85 - 1, M85)), why: t`Divide ${math`\binom{${P85 - 1}}{${M85}}`} by ${math`p - m = ${P85 - M85}`}.` }],
});

const bop421 = supervision({
  id: 'bop-4-21',
  source: cite('bop', 'Chapter 4, exercise 21'),
  title: t`Book of Proof's version`,
  prompt: t`If ${mp} is prime and ${math`${0} < k < p`}, then ${math`p \mid \binom{p}{k}`}. Book of Proof's solution writes ${math`p! = \binom{p}{k}(p - k)!\,k!`} and argues with prime factorisations: ${mp} appears in the factorisation of the left side but not in those of ${math`k!`} and ${math`(p - k)!`}. Write that proof, and say which theorem justifies "appears in the factorisation of a product, so appears in that of a factor".`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 21'),
});
const lemma27 = supervision({
  id: 'notes-116-lemmas-27-29',
  source: cite('cst-dm-notes', 'printed pages 116 to 121, Lemma 27 and Proposition 29'),
  title: t`The ends of the row and the proof by cases`,
  prompt: t`Prove Lemma ${27} (for positive ${mp} and natural ${math`m`}, if ${math`m = ${0}`} or ${math`m = p`} then ${math`\binom{p}{m} \equiv ${1} \pmod{p}`}) using the strategy for a disjunctive assumption, and then Proposition ${29} by the three cases ${math`m = ${0}`}, ${math`${0} < m < p`}, ${math`m = p`}. Why does Lemma ${27} not need ${mp} prime?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const row = (n: number): bigint[] => Array.from({ length: n + 1 }, (_, k) => C(n, k));
const rowTex = (n: number) => math`${computedTex(row(n).map(String).join(',\\ '))}`;

export const primeBinomial: TopicContent = {
  topicId: 'num.prime-binomial',
  goal: t`Prove that a prime ${mp} divides ${math`\binom{p}{k}`} for ${math`${0} < k < p`}, from ${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`} and Euclid's theorem, and see why primality is needed.`,
  objective: t`Prove that a prime p divides every inner entry of row p of Pascal's triangle, and see why p must be prime.`,
  why: t`It is the key step in Fermat's little theorem, which underlies primality tests and RSA.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A pattern in Pascal's triangle` },
    { kind: 'hook', text: t`Row ${7} of Pascal's triangle is ${rowTex(7)}. Every entry except the ${1}s at the ends is a multiple of ${7}. Row ${5}, ${rowTex(5)}: the same with ${5}. But row ${6} is ${rowTex(6)}, and ${15} and ${20} are not multiples of ${6}. What is special about the rows with a prime number?` },
    { kind: 'narrative', text: t`Recall ${math`\binom{n}{k}`}, "${math`n`} choose ${mk}", the number of ways to choose ${mk} things from ${math`n`}. Row ${math`n`} of Pascal's triangle lists ${math`\binom{n}{${0}}, \binom{n}{${1}}, \ldots, \binom{n}{n}`}.` },

    { kind: 'section', title: t`The theorem` },
    { kind: 'theorem', name: t`A prime divides its inner binomial coefficients`, statement: t`If ${mp} is prime and ${math`${0} < k < p`}, then ${math`p \mid \binom{p}{k}`}.` },
    { kind: 'p', text: t`This is [[prime-divides-binomial|the prime row lemma]], Lemma ${28} of the CST notes. The proof needs two facts. First an identity, then Euclid's lemma: if a prime divides a product ${math`ab`} and shares no factor with ${math`a`}, it divides ${math`b`}.` },
    { kind: 'theorem', name: t`Leader identity`, statement: t`For ${math`${1} \le k \le n`}, ${math`k\binom{n}{k} = n\binom{n - ${1}}{k - ${1}}`}.` },
    { kind: 'p', text: t`Proof by counting: both sides count the ways to choose a team of ${mk} from ${math`n`} people with a leader in the team. Choose the team (${math`\binom{n}{k}`} ways) then its leader (${mk} ways); or choose the leader (${math`n`} ways) then the other ${math`k - ${1}`} members from the remaining ${math`n - ${1}`}. ∎ Check with ${math`n = ${7}`}, ${math`k = ${3}`}: ${math`${3} \times ${C(7, 3)} = ${3n * C(7, 3)}`} and ${math`${7} \times ${C(6, 2)} = ${7n * C(6, 2)}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Use the identity`, text: t`With ${math`n = p`}: ${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`}, so ${mp} divides ${math`k\binom{p}{k}`}.` },
        { label: t`p shares no factor with k`, text: t`Since ${math`${0} < k < p`} and ${mp} is prime, the only positive divisors of ${mp} are ${1} and ${mp}, and ${mp} does not divide ${mk}. So ${math`\gcd(p, k) = ${1}`}.` },
        { label: t`Euclid's lemma`, text: t`${mp} divides the product ${math`k \cdot \binom{p}{k}`} and is coprime to ${mk}, so ${math`p \mid \binom{p}{k}`}.`, why: { q: t`Why does that follow?`, a: t`This is [[euclids-lemma|Euclid's lemma]]: from ${math`\gcd(p, k) = ${1}`}, write ${math`${1} = sp + tk`}; multiply by ${math`b = \binom{p}{k}`}: ${math`b = spb + t(kb)`}, and ${mp} divides both terms.` } },
      ],
    },
    checkFrom(quotient, { p: 7, k: 3 }, t`${math`\binom{${7}}{${3}} = ${C(7, 3)}`}, and ${math`${C(7, 3)} = ${7} \times ${C(7, 3) / 7n}`}.`),

    { kind: 'section', title: t`Why the prime matters` },
    { kind: 'p', text: t`Primality was used once, to get ${math`\gcd(p, k) = ${1}`}. For a composite ${math`n`} that step fails when ${mk} shares a factor with ${math`n`}: ${math`${2} \times \binom{${6}}{${2}} = ${6} \times \binom{${5}}{${1}}`}, that is ${math`${2} \times ${15} = ${30}`}, so ${6} divides ${30} without dividing ${15}. The factor ${2} of ${6} was absorbed by ${mk}.` },
    checkFrom(compositeWitness, { n: 9 }, t`${math`\binom{${9}}{${3}} = ${C(9, 3)}`}, not a multiple of ${9}: ${3} shares the factor ${3} with ${9}.`),
    checkFrom(rowCount, { n: 10 }, t`Only the ${mk} coprime to ${10} are guaranteed, and a direct check finds ${upTo(9).filter((k) => C(10, k) % 10n === 0n).length} in all.`),

    { kind: 'section', title: t`What it is for` },
    { kind: 'p', text: t`With the binomial theorem, ${math`(a + b)^{p} = \sum_{k} \binom{p}{k}a^{k}b^{p - k}`}, and every middle coefficient is a multiple of ${mp}. So for a prime ${mp} and integers ${math`a, b`}, ${dmath`(a + b)^{p} \equiv a^{p} + b^{p} \pmod{p}.`} This "Freshman's Dream" is false for ordinary arithmetic, true modulo a prime, and the key step in Fermat's little theorem.` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`n \mid \binom{n}{k}`} for every ${math`n`} and ${math`${0} < k < n`}.`, counterexample: t`${math`\binom{${6}}{${2}} = ${15}`}, not a multiple of ${6}. The rows with this property are exactly the prime rows.` },
    { kind: 'pitfall', claim: t`${mp} divides every entry of row ${mp}.`, counterexample: t`The ends ${math`\binom{p}{${0}} = \binom{p}{p} = ${1}`} are not multiples of ${mp}. Only the inner entries, ${math`${0} < k < p`}, are.` },
    { kind: 'pitfall', claim: t`The identity also shows ${math`p \mid \binom{p - ${1}}{k - ${1}}`}.`, counterexample: t`${math`\binom{${6}}{${2}} = ${15}`}, which ${7} does not divide. The identity says ${mp} divides ${math`k\binom{p}{k}`}; it says nothing about ${mp} dividing ${math`\binom{p - ${1}}{k - ${1}}`}.` },
    { kind: 'takeaway', text: t`${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`} and Euclid's lemma show a prime ${mp} divides ${math`\binom{p}{k}`} for ${math`${0} < k < p`}; for composite rows it can fail.` },
  ],
  examples: [
    { ...lemma28, examiner: t`The examiner looks for the counting identity justified, and the single use of primality, ${math`\gcd(p, p - m) = ${1}`}, stated.` },
    workedCambridge(prop29),
    worked(quotient, { p: 13, k: 5 }, t`${math`\binom{${13}}{${5}} / ${13}`}`),
  ],
  generators: [quotient, compositeWitness, rowCount],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['prime-divides-binomial'],
  cambridge: withUses([cor85, bop421, lemma27], {
    'notes-116-lemmas-27-29': { sections: ['The theorem', 'Why the prime matters'], note: t`The ends of a row and the inner coefficients, case by case` },
  }),
  // The notes' proof by cases. Corollary 85 with numbers is a division sum, and Book of Proof is not Cambridge standard.
  gate: ['notes-116-lemmas-27-29'],
  recall: [
    { front: t`Which entries of row ${mp} does a prime ${mp} divide?`, back: t`Every ${math`\binom{p}{k}`} with ${math`${0} < k < p`}.` },
    { front: t`The identity behind it.`, back: t`${math`k\binom{n}{k} = n\binom{n - ${1}}{k - ${1}}`}: a team of ${mk} with a leader, counted two ways.` },
    { front: t`The Freshman's Dream.`, back: t`${math`(a + b)^{p} \equiv a^{p} + b^{p} \pmod{p}`} for a prime ${mp}.` },
  ],
  proofOrder: [{
    title: t`A prime divides its inner binomial coefficients`,
    steps: [
      t`${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`}, so ${mp} divides ${math`k\binom{p}{k}`}.`,
      t`Since ${math`${0} < k < p`} and ${mp} is prime, ${math`\gcd(p, k) = ${1}`}.`,
      t`By Euclid's lemma, ${mp} divides ${math`\binom{p}{k}`}.`,
    ],
  }],
};
