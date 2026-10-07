/**
 * proof.contrapositive: Proof by contrapositive: prove "if P then Q" by proving the
 * equivalent "if not Q then not P". The lesson follows the CST notes (printed pages 136 to
 * 149: Theorems 37 and 39, Corollary 40, the proof of Proposition 42), the TMUA notes on
 * proof by contrapositive (page 69: "if x cubed is odd then x is odd"), and Book of Proof
 * Sections 5.1 and 5.3. The problems are Book of Proof's Chapter 5 exercises, checked
 * against the solutions to odd exercises, supervision exercises 1.1.2 and 1.1.8 with the
 * 2023-24 official solutions, and TMUA Exercise K.
 */
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { int, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { equivalent } from '../logic';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mx] = [math`n`, math`x`];
const TF = (b: boolean): string => (b ? 'T' : 'F');
const ORDERS: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];
const IDS = ['right', 'converse', 'inverse', 'negation'] as const;
const ordered = (texts: readonly Rich[], order: number): ChoiceOption[] => (ORDERS[order] as readonly number[]).map((k) => ({ id: IDS[k] as string, label: texts[k] as Rich }));
const ifThen = (p: Rich, q: Rich): Rich => t`If ${p}, then ${q}.`;
const mod = (a: number, m: number): number => ((a % m) + m) % m;
const isPrime = (n: number): boolean => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

// ---------------------------------------------------------------- the contrapositive, in words

/** A conditional about an integer n: P and Q with their negations, and P and Q as predicates. */
interface Cond { p: Rich; notP: Rich; q: Rich; notQ: Rich; P: (n: number) => boolean; Q: (n: number) => boolean }
const CONDS: readonly Cond[] = [
  { p: t`${math`n^{${2}}`} is even`, notP: t`${math`n^{${2}}`} is odd`, q: t`${mn} is even`, notQ: t`${mn} is odd`, P: (n) => mod(n * n, 2) === 0, Q: (n) => mod(n, 2) === 0 },
  { p: t`${mn} is a multiple of ${6}`, notP: t`${mn} is not a multiple of ${6}`, q: t`${mn} is even`, notQ: t`${mn} is odd`, P: (n) => mod(n, 6) === 0, Q: (n) => mod(n, 2) === 0 },
  { p: t`${mn} is odd`, notP: t`${mn} is even`, q: t`${math`n^{${2}}`} is odd`, notQ: t`${math`n^{${2}}`} is even`, P: (n) => mod(n, 2) === 1, Q: (n) => mod(n * n, 2) === 1 },
  { p: t`${math`n^{${2}}`} is a multiple of ${3}`, notP: t`${math`n^{${2}}`} is not a multiple of ${3}`, q: t`${mn} is a multiple of ${3}`, notQ: t`${mn} is not a multiple of ${3}`, P: (n) => mod(n * n, 3) === 0, Q: (n) => mod(n, 3) === 0 },
  { p: t`${math`n > ${3}`}`, notP: t`${math`n \le ${3}`}`, q: t`${math`n^{${2}} > ${9}`}`, notQ: t`${math`n^{${2}} \le ${9}`}`, P: (n) => n > 3, Q: (n) => n * n > 9 },
  { p: t`${math`${3}n + ${7}`} is even`, notP: t`${math`${3}n + ${7}`} is odd`, q: t`${mn} is odd`, notQ: t`${mn} is even`, P: (n) => mod(3 * n + 7, 2) === 0, Q: (n) => mod(n, 2) === 1 },
  { p: t`${mn} is a multiple of ${4}`, notP: t`${mn} is not a multiple of ${4}`, q: t`${math`n^{${2}}`} is a multiple of ${8}`, notQ: t`${math`n^{${2}}`} is not a multiple of ${8}`, P: (n) => mod(n, 4) === 0, Q: (n) => mod(n * n, 8) === 0 },
  { p: t`${math`n^{${2}} - ${1}`} is a multiple of ${8}`, notP: t`${math`n^{${2}} - ${1}`} is not a multiple of ${8}`, q: t`${mn} is odd`, notQ: t`${mn} is even`, P: (n) => mod(n * n - 1, 8) === 0, Q: (n) => mod(n, 2) === 1 },
];
const NS = upTo(81).map((k) => k - 41);

interface WriteP { i: number; order: number }

const writeContrapositive = generator<WriteP>({
  id: 'write-contrapositive',
  skill: 'Write the contrapositive of "if P then Q": "if not Q then not P", not the converse or the inverse.',
  params: (rng) => ({ i: int(rng, 0, CONDS.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < CONDS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const c = CONDS[i] as Cond;
    return {
      prompt: t`${mn} is an integer. What is the contrapositive of: ${ifThen(c.p, c.q)}`,
      answer: { kind: 'choice', options: ordered([ifThen(c.notQ, c.notP), ifThen(c.q, c.p), ifThen(c.notP, c.notQ), t`${c.p}, and ${c.notQ}.`], order), correct: 'right' },
      solution: [
        t`The [[contrapositive|contrapositive]] of "if ${math`P`} then ${math`Q`}" negates both parts and swaps them: "if not ${math`Q`} then not ${math`P`}".`,
        t`Here: ${ifThen(c.notQ, c.notP)}`,
      ],
    };
  },
  solve: ({ i }) => {
    // The option that has the same truth value as the statement for every integer from -40 to 40, and is a conditional.
    const c = CONDS[i] as Cond;
    const orig = (n: number): boolean => !c.P(n) || c.Q(n);
    const cands: Record<string, (n: number) => boolean> = {
      right: (n) => c.Q(n) || !c.P(n),
      converse: (n) => !c.Q(n) || c.P(n),
      inverse: (n) => c.P(n) || !c.Q(n),
    };
    // Each candidate, as an open sentence, must agree with the statement at every n: only the contrapositive does in general.
    const agree = Object.keys(cands).filter((id) => NS.every((n) => cands[id]?.(n) === orig(n)));
    return [agree.includes('right') ? 'right' : '?'];
  },
  misconceptions: (): Misconception[] => [
    { response: ['converse'], why: t`That is the converse: it swaps the parts without negating them. It is a different statement, and can be false when the original is true.` },
    { response: ['inverse'], why: t`That negates both parts but keeps the order. The contrapositive also swaps them.` },
    { response: ['negation'], why: t`That is the negation of the statement, true exactly when it is false. The contrapositive is equivalent to it.` },
  ],
});

// ---------------------------------------------------------------- contrapositive with "and" and "or"

/** A statement whose parts contain "and" or "or", its four related forms, and each as a formula in letters for the parts, so the logic is checked. */
interface Comp { stmt: Rich; right: Rich; careless: Rich; converse: Rich; inverse: Rich; f: Readonly<Record<'stmt' | 'right' | 'careless' | 'converse' | 'inverse', string>> }
const shape = (p: string, q: string, nP: string, nQ: string, carelessNQ: string) => ({ stmt: `${p} => ${q}`, right: `${nQ} => ${nP}`, careless: `${carelessNQ} => ${nP}`, converse: `${q} => ${p}`, inverse: `${nP} => ${nQ}` });
const COMPS: readonly Comp[] = [
  { stmt: t`If ${math`ab`} and ${math`a + b`} are both even, then ${math`a`} and ${math`b`} are both even.`, right: t`If ${math`a`} or ${math`b`} is odd, then ${math`ab`} or ${math`a + b`} is odd.`, careless: t`If ${math`a`} and ${math`b`} are both odd, then ${math`ab`} or ${math`a + b`} is odd.`, converse: t`If ${math`a`} and ${math`b`} are both even, then ${math`ab`} and ${math`a + b`} are both even.`, inverse: t`If ${math`ab`} or ${math`a + b`} is odd, then ${math`a`} or ${math`b`} is odd.`,
    f: shape('(X & Y)', '(U & V)', '(~X | ~Y)', '(~U | ~V)', '(~U & ~V)') },
  { stmt: t`If ${math`x^{${2}}(y + ${3})`} is even, then ${mx} is even or ${math`y`} is odd.`, right: t`If ${mx} is odd and ${math`y`} is even, then ${math`x^{${2}}(y + ${3})`} is odd.`, careless: t`If ${mx} is odd or ${math`y`} is even, then ${math`x^{${2}}(y + ${3})`} is odd.`, converse: t`If ${mx} is even or ${math`y`} is odd, then ${math`x^{${2}}(y + ${3})`} is even.`, inverse: t`If ${math`x^{${2}}(y + ${3})`} is odd, then ${mx} is odd and ${math`y`} is even.`,
    f: shape('X', '(U | V)', '~X', '(~U & ~V)', '(~U | ~V)') },
  { stmt: t`If ${math`mn`} is even, then ${math`m`} is even or ${mn} is even.`, right: t`If ${math`m`} and ${mn} are both odd, then ${math`mn`} is odd.`, careless: t`If ${math`m`} or ${mn} is odd, then ${math`mn`} is odd.`, converse: t`If ${math`m`} is even or ${mn} is even, then ${math`mn`} is even.`, inverse: t`If ${math`mn`} is odd, then ${math`m`} and ${mn} are both odd.`,
    f: shape('X', '(U | V)', '~X', '(~U & ~V)', '(~U | ~V)') },
  { stmt: t`If ${math`a^{${2}}(b^{${2}} - ${2}b)`} is odd, then ${math`a`} and ${math`b`} are both odd.`, right: t`If ${math`a`} or ${math`b`} is even, then ${math`a^{${2}}(b^{${2}} - ${2}b)`} is even.`, careless: t`If ${math`a`} and ${math`b`} are both even, then ${math`a^{${2}}(b^{${2}} - ${2}b)`} is even.`, converse: t`If ${math`a`} and ${math`b`} are both odd, then ${math`a^{${2}}(b^{${2}} - ${2}b)`} is odd.`, inverse: t`If ${math`a^{${2}}(b^{${2}} - ${2}b)`} is even, then ${math`a`} or ${math`b`} is even.`,
    f: shape('X', '(U & V)', '~X', '(~U | ~V)', '(~U & ~V)') },
  { stmt: t`If ${mn} is prime and ${math`n > ${2}`}, then ${mn} is odd.`, right: t`If ${mn} is even, then ${mn} is not prime or ${math`n \le ${2}`}.`, careless: t`If ${mn} is even, then ${mn} is not prime and ${math`n \le ${2}`}.`, converse: t`If ${mn} is odd, then ${mn} is prime and ${math`n > ${2}`}.`, inverse: t`If ${mn} is not prime or ${math`n \le ${2}`}, then ${mn} is even.`,
    f: { stmt: '(X & Y) => U', right: '~U => (~X | ~Y)', careless: '~U => (~X & ~Y)', converse: 'U => (X & Y)', inverse: '(~X | ~Y) => ~U' } },
  { stmt: t`If ${mx} and ${math`y`} are both positive, then ${math`xy`} is positive.`, right: t`If ${math`xy \le ${0}`}, then ${math`x \le ${0}`} or ${math`y \le ${0}`}.`, careless: t`If ${math`xy \le ${0}`}, then ${math`x \le ${0}`} and ${math`y \le ${0}`}.`, converse: t`If ${math`xy`} is positive, then ${mx} and ${math`y`} are both positive.`, inverse: t`If ${math`x \le ${0}`} or ${math`y \le ${0}`}, then ${math`xy \le ${0}`}.`,
    f: { stmt: '(X & Y) => U', right: '~U => (~X | ~Y)', careless: '~U => (~X & ~Y)', converse: 'U => (X & Y)', inverse: '(~X | ~Y) => ~U' } },
  { stmt: t`If ${math`a`} is even or ${math`b`} is even, then ${math`ab`} is even.`, right: t`If ${math`ab`} is odd, then ${math`a`} and ${math`b`} are both odd.`, careless: t`If ${math`ab`} is odd, then ${math`a`} or ${math`b`} is odd.`, converse: t`If ${math`ab`} is even, then ${math`a`} or ${math`b`} is even.`, inverse: t`If ${math`a`} and ${math`b`} are both odd, then ${math`ab`} is odd.`,
    f: { stmt: '(X | Y) => U', right: '~U => (~X & ~Y)', careless: '~U => (~X | ~Y)', converse: 'U => (X | Y)', inverse: '(~X & ~Y) => ~U' } },
];
const LETTERS = ['X', 'Y', 'U', 'V'];
const ORDERS5: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 2, 0, 3], [2, 0, 3, 1], [3, 1, 2, 0]];

interface CompP { i: number; order: number }

const withDeMorgan = generator<CompP>({
  id: 'contrapositive-de-morgan',
  skill: 'Write the contrapositive of a statement with "and" or "or" in it: negating each part needs De Morgan\'s laws.',
  params: (rng) => ({ i: int(rng, 0, COMPS.length - 1), order: int(rng, 0, ORDERS5.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < COMPS.length && order >= 0 && order < ORDERS5.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const c = COMPS[i] as Comp;
    const ids = ['right', 'careless', 'converse', 'inverse'];
    const texts = [c.right, c.careless, c.converse, c.inverse];
    return {
      prompt: t`All letters stand for integers. What is the contrapositive of: ${c.stmt}`,
      answer: { kind: 'choice', options: (ORDERS5[order] as readonly number[]).map((k) => ({ id: ids[k] as string, label: texts[k] as Rich })), correct: 'right' },
      solution: [
        t`Negate the "then" part to make the new "if" part, and negate the "if" part to make the new "then" part. By De Morgan's laws, "not (A and B)" is "not A or not B", and "not (A or B)" is "not A and not B".`,
        t`So the contrapositive is: ${c.right}`,
      ],
    };
  },
  solve: ({ i }) => {
    // With a letter for each part, the one form equivalent to the statement as a formula.
    const f = (COMPS[i] as Comp).f;
    const hits = (['right', 'careless', 'converse', 'inverse'] as const).filter((k) => equivalent(f[k], f.stmt, LETTERS));
    return hits.length === 1 ? [...hits] : ['?'];
  },
  misconceptions: (): Misconception[] => [
    { response: ['careless'], why: t`Each part was negated word by word, keeping "and" or "or". Negating "and" gives "or", and the other way round (De Morgan).` },
    { response: ['converse'], why: t`That is the converse: the parts are swapped but not negated.` },
    { response: ['inverse'], why: t`That negates the parts but keeps them in their places. The contrapositive swaps them too.` },
  ],
});

// ---------------------------------------------------------------- four related statements

interface FourP { i: number }

const fourStatements = generator<FourP>({
  id: 'four-statements',
  skill: 'Decide the truth of a conditional, its converse, its contrapositive, and its inverse: the contrapositive always matches the statement, and the inverse matches the converse.',
  params: (rng) => ({ i: int(rng, 0, CONDS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < CONDS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const c = CONDS[i] as Cond;
    const s = NS.every((n) => !c.P(n) || c.Q(n));
    const v = NS.every((n) => !c.Q(n) || c.P(n));
    const failS = NS.find((n) => c.P(n) && !c.Q(n));
    const failV = NS.find((n) => c.Q(n) && !c.P(n));
    return {
      prompt: t`For every integer ${mn}: ${ifThen(c.p, c.q)} Write T or F for this statement and for each related statement.`,
      answer: {
        kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`],
        rows: [[t`the statement`, null], [t`its converse: ${ifThen(c.q, c.p)}`, null], [t`its contrapositive: ${ifThen(c.notQ, c.notP)}`, null], [t`its inverse: ${ifThen(c.notP, c.notQ)}`, null]],
        expected: [TF(s), TF(v), TF(s), TF(v)],
      },
      solution: [
        s ? t`The statement holds for every integer.` : t`The statement fails at ${math`n = ${failS as number}`}.`,
        v ? t`The converse holds for every integer.` : t`The converse fails at ${math`n = ${failV as number}`}.`,
        t`The contrapositive is equivalent to the statement, and the inverse is the contrapositive of the converse, so it is equivalent to the converse.`,
      ],
    };
  },
  solve: ({ i }) => {
    // Each of the four, checked directly on every integer from -40 to 40.
    const c = CONDS[i] as Cond;
    return [
      NS.every((n) => !c.P(n) || c.Q(n)),
      NS.every((n) => !c.Q(n) || c.P(n)),
      NS.every((n) => c.Q(n) || !c.P(n)),
      NS.every((n) => c.P(n) || !c.Q(n)),
    ].map(TF);
  },
  misconceptions: ({ i }): Misconception[] => {
    const c = CONDS[i] as Cond;
    const s = NS.every((n) => !c.P(n) || c.Q(n));
    const v = NS.every((n) => !c.Q(n) || c.P(n));
    return [
      { response: [TF(s), TF(s), TF(s), TF(s)], why: t`A statement and its converse can differ: check the converse on its own.` },
      { response: [TF(s), TF(v), TF(!s), TF(v)], why: t`The contrapositive always has the same truth value as the statement.` },
      { response: [TF(s), TF(v), TF(s), TF(!v)], why: t`The inverse is the contrapositive of the converse, so it has the converse's truth value.` },
      { response: [TF(s), TF(v), TF(v), TF(s)], why: t`The contrapositive goes with the statement, and the inverse with the converse, not the other way round.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** A contrapositive to choose, checked as open sentences on a grid of integers: the right one agrees with the statement everywhere; the others do not. */
function bopChoice(o: { n: number; title: Rich; stmt: Rich; options: readonly [Rich, Rich, Rich, Rich]; vars: 1 | 2; P: (a: number, b: number) => boolean; Q: (a: number, b: number) => boolean; steps: Rich[]; official: boolean }): AutoProblem {
  const at = `Chapter 5, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-5-${o.n}`,
    source: cite('bop', at, true),
    title: o.title,
    prompt: t`To prove "${o.stmt}" by contrapositive, which statement do you prove?`,
    answer: { kind: 'choice', options: ordered(o.options, 0), correct: 'right' },
    solution: o.steps,
    reference: 'right',
    verify: () => {
      // The exercise is a theorem: on a grid of integers the statement and its contrapositive hold everywhere,
      // and the negation (the last option) holds nowhere. The forms themselves are checked as formulas.
      const r = upTo(21).map((k) => k - 11);
      const grid = o.vars === 1 ? r.map((a) => [a, 0] as const) : r.flatMap((a) => r.map((b) => [a, b] as const));
      const holds = grid.every(([a, b]) => !o.P(a, b) || o.Q(a, b));
      const contra = grid.every(([a, b]) => o.Q(a, b) || !o.P(a, b));
      const negation = grid.some(([a, b]) => o.P(a, b) && !o.Q(a, b));
      const forms = equivalent('~Q => ~P', 'P => Q', ['P', 'Q']) && !equivalent('Q => P', 'P => Q', ['P', 'Q']) && !equivalent('~P => ~Q', 'P => Q', ['P', 'Q']);
      return same('statement, contrapositive, negation, forms', [holds, contra, negation, forms].join(), 'true,true,false,true');
    },
    misconceptions: [
      { response: 'converse', why: t`That is the converse, a different statement.` },
      { response: 'inverse', why: t`That negates both parts but does not swap them.` },
      { response: 'negation', why: t`That is the negation. Proving it would disprove the statement.` },
    ],
  };
  if (o.official) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: 'right', agrees: true };
  return auto(spec);
}
const even = (n: number): boolean => mod(n, 2) === 0;

const bop1 = bopChoice({
  n: 1, title: t`${math`n^{${2}}`} even`, vars: 1, official: true,
  stmt: t`if ${math`n^{${2}}`} is even, then ${mn} is even`,
  options: [ifThen(t`${mn} is odd`, t`${math`n^{${2}}`} is odd`), ifThen(t`${mn} is even`, t`${math`n^{${2}}`} is even`), ifThen(t`${math`n^{${2}}`} is odd`, t`${mn} is odd`), t`${math`n^{${2}}`} is even and ${mn} is odd.`],
  P: (n) => even(n * n), Q: (n) => even(n),
  steps: [
    t`Not "${mn} is even" is "${mn} is odd"; not "${math`n^{${2}}`} is even" is "${math`n^{${2}}`} is odd". So prove: if ${mn} is odd, then ${math`n^{${2}}`} is odd.`,
    t`That is easy directly: ${math`n = ${2}a + ${1}`} gives ${math`n^{${2}} = ${2}(${2}a^{${2}} + ${2}a) + ${1}`}, as Book of Proof's solution does.`,
  ],
});
const bop9 = bopChoice({
  n: 9, title: t`${3} and squares`, vars: 1, official: true,
  stmt: t`if ${3} does not divide ${math`n^{${2}}`}, then ${3} does not divide ${mn}`,
  options: [ifThen(t`${math`${3} \mid n`}`, t`${math`${3} \mid n^{${2}}`}`), ifThen(t`${math`${3} \nmid n`}`, t`${math`${3} \nmid n^{${2}}`}`), ifThen(t`${math`${3} \mid n^{${2}}`}`, t`${math`${3} \mid n`}`), t`${math`${3} \nmid n^{${2}}`} and ${math`${3} \mid n`}.`],
  P: (n) => mod(n * n, 3) !== 0, Q: (n) => mod(n, 3) !== 0,
  steps: [
    t`The contrapositive: if ${3} divides ${mn}, then ${3} divides ${math`n^{${2}}`}. Both negations remove a "not".`,
    t`Proof, as in Book of Proof's solution: ${math`n = ${3}a`} gives ${math`n^{${2}} = ${3}(${3}a^{${2}})`}.`,
  ],
});
const bop7 = bopChoice({
  n: 7, title: t`Both even`, vars: 2, official: true,
  stmt: t`if both ${math`ab`} and ${math`a + b`} are even, then both ${math`a`} and ${math`b`} are even`,
  options: [ifThen(t`${math`a`} or ${math`b`} is odd`, t`${math`ab`} or ${math`a + b`} is odd`), ifThen(t`${math`a`} and ${math`b`} are both even`, t`${math`ab`} and ${math`a + b`} are both even`), ifThen(t`${math`ab`} or ${math`a + b`} is odd`, t`${math`a`} or ${math`b`} is odd`), t`${math`ab`} and ${math`a + b`} are even, and ${math`a`} or ${math`b`} is odd.`],
  P: (a, b) => even(a * b) && even(a + b), Q: (a, b) => even(a) && even(b),
  steps: [
    t`Not "both ${math`a`} and ${math`b`} even" is "at least one of them is odd", and not "both ${math`ab`} and ${math`a + b`} even" is "one of them is odd", by De Morgan.`,
    t`So prove: if ${math`a`} or ${math`b`} is odd, then ${math`ab`} or ${math`a + b`} is odd. Book of Proof's solution does it in three cases.`,
  ],
});

const tmuaCube = auto({
  id: 'tmua-p69',
  source: cite('tmua-logic-proof', 'Proof by contrapositive, page 69'),
  title: t`If ${math`x^{${3}}`} is odd`,
  prompt: t`Prove, using the contrapositive: for any nonzero integer ${mx}, if ${math`x^{${3}}`} is odd then ${mx} is odd. Which statement does the proof establish?`,
  answer: { kind: 'choice', options: ordered([ifThen(t`${mx} is even`, t`${math`x^{${3}}`} is even`), ifThen(t`${mx} is odd`, t`${math`x^{${3}}`} is odd`), ifThen(t`${math`x^{${3}}`} is even`, t`${mx} is even`), t`${math`x^{${3}}`} is odd and ${mx} is even.`], 0), correct: 'right' },
  solution: [
    t`The contrapositive says: if ${mx} is not odd then ${math`x^{${3}}`} is not odd. For integers "not odd" means "even", so it is: if ${mx} is even then ${math`x^{${3}}`} is even.`,
    t`Proof, as in the notes: if ${math`x = ${2}p`} then ${math`x^{${3}} = ${8}p^{${3}} = ${2}(${4}p^{${3}})`}, which is even. So "if ${math`x^{${3}}`} is odd then ${mx} is odd" is true.`,
  ],
  reference: 'right',
  verify: () => {
    const r = upTo(41).map((k) => k - 21).filter((x) => x !== 0);
    return same('statement and contrapositive agree, and hold', [r.every((x) => !(mod(x ** 3, 2) === 1) || mod(x, 2) === 1), r.every((x) => !even(x) || even(x ** 3))].join(), 'true,true');
  },
  misconceptions: [
    { response: 'converse', why: t`That is the converse. It is true too, but proving it does not prove the statement.` },
    { response: 'inverse', why: t`That negates both parts without swapping them.` },
  ],
  official: { source: cite('tmua-logic-proof', 'page 69'), answer: 'right', agrees: true },
});

const sw112 = auto({
  id: 'sw-1-1-2-verdict',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.2'),
  title: t`If ${math`x^{${2}} + y = ${13}`} and ${math`y \ne ${4}`}`,
  prompt: t`Prove or disprove: if ${math`x^{${2}} + y = ${13}`} and ${math`y \ne ${4}`}, then ${math`x \ne ${3}`}. First decide: true or false?`,
  answer: { kind: 'choice', options: [{ id: 'true', label: t`True` }, { id: 'false', label: t`False` }], correct: 'true' },
  solution: [
    t`Prove the contrapositive of the last part, as the official solution does: assume ${math`x^{${2}} + y = ${13}`}; then if ${math`x = ${3}`}, ${math`y = ${13} - ${9} = ${4}`}.`,
    t`So with ${math`y \ne ${4}`}, ${mx} cannot be ${3}. True.`,
  ],
  reference: 'true',
  verify: () => {
    // For every integer x from -10 to 10, the y with x^2 + y = 13: whenever y is not 4, x is not 3.
    const xs = upTo(21).map((k) => k - 11);
    return same('no counterexample', xs.every((x) => { const y = 13 - x * x; return y === 4 || x !== 3; }), true);
  },
  misconceptions: [{ response: 'false', why: t`A counterexample would need ${math`x = ${3}`} with ${math`y \ne ${4}`}, but ${math`x = ${3}`} forces ${math`y = ${13} - ${9} = ${4}`}.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.2'), answer: 'true', agrees: true },
});

const sw118 = auto({
  id: 'sw-1-1-8-verdict',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.8'),
  title: t`${math`mn`} even`,
  prompt: t`Prove or disprove: for all integers ${math`m`} and ${mn}, if ${math`m \cdot n`} is even, then either ${math`m`} is even or ${mn} is even. First decide: true or false?`,
  answer: { kind: 'choice', options: [{ id: 'true', label: t`True` }, { id: 'false', label: t`False` }], correct: 'true' },
  solution: [
    t`The contrapositive: if ${math`m`} and ${mn} are both odd, then ${math`mn`} is odd. That holds: ${math`(${2}a + ${1})(${2}b + ${1}) = ${2}(${2}ab + a + b) + ${1}`}.`,
    t`So the statement is true. The official solution notes this is Proposition ${8} of the notes, and that the contrapositive turns an "or" goal into an "and" assumption.`,
  ],
  reference: 'true',
  verify: () => {
    const r = upTo(41).map((k) => k - 21);
    return same('no counterexample from -20 to 20', r.every((m) => r.every((n) => !even(m * n) || even(m) || even(n))), true);
  },
  misconceptions: [{ response: 'false', why: t`Look for a counterexample: ${math`mn`} even with ${math`m`} and ${mn} both odd. There is none, since odd times odd is odd.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.8'), answer: 'true', agrees: true },
});

const N25 = 15;
const bop25 = auto({
  id: 'bop-5-25',
  source: cite('bop', 'Chapter 5, exercise 25', true),
  title: t`${math`${2}^{n} - ${1}`} for a composite ${mn}`,
  prompt: t`Book of Proof proves "if ${math`${2}^{n} - ${1}`} is prime, then ${mn} is prime" by contrapositive: if ${math`n = ab`} with ${math`a, b > ${1}`}, then ${math`${2}^{b} - ${1}`} divides ${math`${2}^{n} - ${1}`}. Use this for ${math`n = ${N25}`}: give a factor of ${math`${2}^{${N25}} - ${1} = ${2 ** N25 - 1}`} other than ${1} and itself.`,
  answer: {
    kind: 'witness', count: 1, names: ['d'], example: String(2 ** 3 - 1),
    check: ([v]) => {
      if (v === undefined || v.den !== 1n) return 'Give a whole number.';
      const d = Number(v.num);
      if (d <= 1 || d >= 2 ** N25 - 1) return 'Give a factor other than 1 and the number itself.';
      return (2 ** N25 - 1) % d === 0 ? null : `${d} does not divide ${2 ** N25 - 1}.`;
    },
  },
  solution: [
    t`${math`${N25} = ${3} \times ${5}`}, so ${math`${2}^{${3}} - ${1} = ${7}`} and ${math`${2}^{${5}} - ${1} = ${31}`} both divide ${math`${2}^{${N25}} - ${1}`}: ${math`${2 ** N25 - 1} = ${7} \times ${(2 ** N25 - 1) / 7}`}.`,
    t`The reason: with ${math`x = ${2}^{b}`}, ${math`x^{a} - ${1} = (x - ${1})(x^{a - ${1}} + \cdots + x + ${1})`}. So a composite ${mn} makes ${math`${2}^{n} - ${1}`} composite, which is the contrapositive of the exercise.`,
  ],
  reference: 'd = 7',
  verify: () => {
    // For every composite n up to 30, 2^b - 1 divides 2^n - 1 for each factor b of n with 1 < b < n.
    for (let n = 4; n <= 30; n++) {
      if (isPrime(n)) continue;
      for (let b = 2; b < n; b++) if (n % b === 0 && (2 ** n - 1) % (2 ** b - 1) !== 0) return `n = ${n}, b = ${b}`;
    }
    return same('a factor of 2^15 - 1', (2 ** N25 - 1) % 7, 0);
  },
  misconceptions: [{ response: 'd = 15', why: t`${N25} divides ${mn}, not ${math`${2}^{n} - ${1}`}: ${math`${2 ** N25 - 1} \div ${N25}`} is not a whole number. Try ${math`${2}^{b} - ${1}`} for a factor ${math`b`} of ${N25}.` }],
});

const sw112proof = supervision({
  id: 'sw-1-1-2',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.2'),
  title: t`A partial contrapositive`,
  prompt: t`Prove: if ${math`x^{${2}} + y = ${13}`} and ${math`y \ne ${4}`}, then ${math`x \ne ${3}`}. The contrapositive of the whole statement would turn the useful assumption ${math`x^{${2}} + y = ${13}`} into a goal. Instead assume only ${math`x^{${2}} + y = ${13}`}, and prove ${math`y \ne ${4} \Rightarrow x \ne ${3}`} by its contrapositive. Explain why this is a valid proof of the original.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.2'),
});
const sw118proof = supervision({
  id: 'sw-1-1-8',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.8'),
  title: t`${math`mn`} even means one factor is even`,
  prompt: t`Prove that for all integers ${math`m`} and ${mn}, if ${math`m \cdot n`} is even, then either ${math`m`} is even or ${mn} is even. Use the contrapositive, and say what De Morgan's law does to the "or".`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.8'),
});
const corollary41 = supervision({
  id: 'cst-corollary-41',
  source: cite('cst-dm-notes', 'printed page 147, Corollary 41'),
  title: t`Square roots of irrationals`,
  prompt: t`Corollary ${41} of the CST notes: for every positive irrational number ${mx}, the real number ${math`\sqrt{x}`} is irrational. Prove it by contrapositive: state the contrapositive first, then prove it.`,
  writeUp: 'proof',
});
const tmuaK3 = supervision({
  id: 'tmua-k-3',
  source: cite('tmua-logic-proof', 'Exercise K, questions 1 and 3'),
  title: t`The converse of the contrapositive`,
  prompt: t`What is the converse of the contrapositive of "if ${math`A`} then ${math`B`}"? Is it logically equivalent to "if ${math`A`} then ${math`B`}"? Then take two conditionals from earlier lessons ("if", "only if", "if and only if") and say what their contrapositives state, and why each is equivalent to the original.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const [mP, mQ] = [math`P`, math`Q`];
const TT: readonly [boolean, boolean][] = [[true, true], [true, false], [false, true], [false, false]];
const imp = (a: boolean, b: boolean): boolean => !a || b;

export const contrapositive: TopicContent = {
  topicId: 'proof.contrapositive',
  goal: t`Prove "if ${math`P`} then ${math`Q`}" by proving its contrapositive "if not ${math`Q`} then not ${math`P`}", and choose it when the negated statements are easier to work with.`,
  objective: t`Prove "if ${mP} then ${mQ}" by proving "if not ${mQ} then not ${mP}", when that is easier.`,
  why: t`Many statements are hard forwards and easy backwards; this is the standard way round them.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`Stuck going forwards` },
    { kind: 'hook', text: t`Prove: if ${math`n^{${2}}`} is even, then ${mn} is even. Try it directly. ${math`n^{${2}} = ${2}k`}, so ${math`n = \sqrt{${2}k}`}, and now what? A square root of an even number tells you nothing useful. The direct road is blocked. But there is another road to the same place.` },
    { kind: 'narrative', text: t`Think about it the other way round. The statement says an even square never comes from an odd number. So it is enough to show that odd numbers always have odd squares, and that is a one-line calculation. Turning a statement round like this is always allowed, provided you turn it round the right way.` },
    { kind: 'section', title: t`The contrapositive` },
    {
      kind: 'definition',
      name: t`Contrapositive, converse, inverse`,
      formal: t`For the implication ${math`P \Rightarrow Q`}, the [[contrapositive|contrapositive]] is ${math`\lnot Q \Rightarrow \lnot P`}, the converse is ${math`Q \Rightarrow P`}, and the inverse is ${math`\lnot P \Rightarrow \lnot Q`}.`,
      plain: t`Contrapositive: swap the two parts and negate both. For "if it is raining, the ground is wet": the contrapositive is "if the ground is not wet, it is not raining"; the converse is "if the ground is wet, it is raining", a different claim.`,
    },
    { kind: 'theorem', statement: t`${math`P \Rightarrow Q`} and ${math`\lnot Q \Rightarrow \lnot P`} are logically equivalent: they have the same truth value for every truth value of ${mP} and ${mQ}.` },
    {
      kind: 'table', caption: t`An implication is false only when its hypothesis is true and its conclusion false. The two columns agree in every row.`,
      head: [[mP], [mQ], [math`P \Rightarrow Q`], [math`\lnot Q \Rightarrow \lnot P`]],
      rows: TT.map(([p, qq]) => [t`${p ? 'T' : 'F'}`, t`${qq ? 'T' : 'F'}`, t`${imp(p, qq) ? 'T' : 'F'}`, t`${imp(!qq, !p) ? 'T' : 'F'}`]),
    },
    { kind: 'p', text: t`In words: both say exactly that ${mP} true with ${mQ} false never happens. The CST notes prove each from the other (Theorems ${37} and ${39}, Corollary ${40}).` },
    { kind: 'section', title: t`Proof by contrapositive` },
    {
      kind: 'definition',
      name: t`Proof by contrapositive`,
      formal: t`A [[proof-by-contrapositive|proof by contrapositive]] of ${math`P \Rightarrow Q`} assumes ${math`\lnot Q`} and deduces ${math`\lnot P`}.`,
      plain: t`Prove the turned-round statement; by the theorem, that proves the original.`,
    },
    { kind: 'theorem', statement: t`For every integer ${mn}, if ${math`n^{${2}}`} is even, then ${mn} is even.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`State the contrapositive`, text: t`We prove: if ${mn} is not even, then ${math`n^{${2}}`} is not even. For integers, "not even" is "odd".`, plain: t`Swap the parts, negate both.` },
        { label: t`Assume not ${mQ}`, text: t`Suppose ${mn} is odd: ${math`n = ${2}a + ${1}`} for some ${math`a \in \mathbb{Z}`}.`, plain: t`If ${mn} were ${7}, ${math`a`} would be ${3}.` },
        { label: t`Compute`, text: t`${math`n^{${2}} = ${4}a^{${2}} + ${4}a + ${1} = ${2}(${2}a^{${2}} + ${2}a) + ${1}`}.` },
        { label: t`Conclude not ${mP}`, text: t`${math`${2}a^{${2}} + ${2}a`} is an integer, so ${math`n^{${2}}`} is odd. This proves the contrapositive, and hence the statement.` },
      ],
    },
    checkFrom(writeContrapositive, { i: 4, order: 1 }, t`Swap and negate both parts: "if ${math`n^{${2}} \le ${9}`}, then ${math`n \le ${3}`}".`),
    { kind: 'section', title: t`Negating compound parts` },
    { kind: 'p', text: t`When a part contains "and" or "or", negate it with De Morgan's laws: not (${math`A`} and ${math`B`}) is (not ${math`A`}) or (not ${math`B`}), and the other way round. Example: "if ${math`a + b \ge ${10}`}, then ${math`a \ge ${5}`} or ${math`b \ge ${5}`}". Its contrapositive is "if ${math`a < ${5}`} and ${math`b < ${5}`}, then ${math`a + b < ${10}`}", which is immediate by adding. The "or" in the goal, which would need cases, became an "and" you get to assume, a gain the official CST solutions point out.` },
    checkFrom(withDeMorgan, { i: 5, order: 1 }, t`Negate both parts and swap: not "${math`xy`} positive" is ${math`xy \le ${0}`}, and not "both positive" is "${math`x \le ${0}`} or ${math`y \le ${0}`}".`),
    { kind: 'p', text: t`Contrapositive or contradiction? A contrapositive proof assumes ${math`\lnot Q`} and has a definite target, ${math`\lnot P`}. A contradiction proof assumes ${math`P`} and ${math`\lnot Q`} and looks for anything impossible. If the impossible thing it finds is ${math`\lnot P`}, it was really a contrapositive proof, and is clearer written as one.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`An implication and its converse say the same thing.`, counterexample: t`"If ${mn} is a multiple of ${6}, then ${mn} is even" is true, but its converse "if ${mn} is even, then ${mn} is a multiple of ${6}" fails at ${math`n = ${2}`}.` },
    { kind: 'pitfall', claim: t`The contrapositive of "if ${mn} is prime and ${math`n > ${2}`}, then ${mn} is odd" is "if ${mn} is even, then ${mn} is not prime and ${math`n \le ${2}`}".`, counterexample: t`That negates "and" wrongly. Take ${math`n = ${4}`}: it is even, but ${math`n \le ${2}`} is false. The right contrapositive ends "${mn} is not prime or ${math`n \le ${2}`}".` },
    { kind: 'takeaway', text: t`To prove "if ${mP} then ${mQ}", you may assume not ${mQ} and prove not ${mP}, negating each part exactly.` },
  ],
  examples: [
    { ...workedCambridge(tmuaCube), examiner: t`The examiner looks for the contrapositive stated before the proof starts, and "not odd" turned into "even" explicitly.` },
    worked(writeContrapositive, { i: 3, order: 2 }, t`A contrapositive in words`),
    worked(fourStatements, { i: 1 }, t`Four related statements`),
  ],
  generators: [writeContrapositive, withDeMorgan, fourStatements],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['proof-by-contrapositive'],
  cambridge: withUses([bop1, bop9, bop7, sw112, sw118, bop25, sw112proof, sw118proof, corollary41, tmuaK3], {
    'cst-corollary-41': { sections: ['The contrapositive', 'Proof by contrapositive'], note: t`Stating and proving the contrapositive about irrational numbers` },
    'sw-1-1-8': { sections: ['Proof by contrapositive', 'Negating compound parts'], note: t`The contrapositive of an implication with an "or", by De Morgan's law` },
    'sw-1-1-2': { sections: ['Proof by contrapositive', 'Negating compound parts'], note: t`Taking the contrapositive of only part of a statement` },
  }),
  gate: ['cst-corollary-41', 'sw-1-1-8', 'sw-1-1-2'],
  recall: [
    { front: t`The contrapositive of ${math`P \Rightarrow Q`}.`, back: t`${math`\lnot Q \Rightarrow \lnot P`}, logically equivalent to it.` },
    { front: t`The converse and the inverse of ${math`P \Rightarrow Q`}.`, back: t`Converse ${math`Q \Rightarrow P`}; inverse ${math`\lnot P \Rightarrow \lnot Q`}. They are equivalent to each other, not to the original.` },
    { front: t`Proof by contrapositive.`, back: t`To prove ${math`P \Rightarrow Q`}, assume ${math`\lnot Q`} and deduce ${math`\lnot P`}.` },
  ],
  proofOrder: [
    {
      title: t`If ${math`n^{${2}}`} is even, then ${mn} is even`,
      steps: [
        t`Prove the contrapositive: if ${mn} is odd, then ${math`n^{${2}}`} is odd.`,
        t`Suppose ${math`n = ${2}a + ${1}`} for an integer ${math`a`}.`,
        t`Then ${math`n^{${2}} = ${2}(${2}a^{${2}} + ${2}a) + ${1}`}, which is odd.`,
        t`The contrapositive holds, so the statement does.`,
      ],
    },
  ],
};
