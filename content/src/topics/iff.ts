/**
 * logic.iff: If and only if, and necessary and sufficient conditions. The lesson follows
 * the CST notes on bi-implication (printed pages 57 to 62: the proof pattern, Definition 12
 * and Proposition 16, using an iff as two implications), Book of Proof Section 2.4, and the
 * TMUA notes on swapping A and B (page 40) and on necessary and sufficient (pages 51 to 54).
 * The problems are Book of Proof's exercises for Section 2.4, supervision exercises 1.1.3 (its
 * verdict; the proof is in proof.contrapositive, Rule 1, 2026-10-08), 1.2.2, and 1.2.7 (with the
 * 2023-24 official solutions), and TMUA Exercise I. The second gate
 * (batch 9) is STEP Support Assignment 10, Q2(v): five "if and only if" statements to judge,
 * each false one by a single example, checked against the hints and by search.
 */
import { assignments, evalFormula, parseFormula } from '@learnhub/mastery';
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { int, upTo } from '../math';
import { generator, type AnswerSpec, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich, type Span } from '../rich';
import { quickCheck, worked, workedProof, type TopicContent } from '../topic';

const [mP, mQ, mn] = [math`P`, math`Q`, math`n`];
const IFF = math`P \Leftrightarrow Q`;

// ---------------------------------------------------------------- necessary and sufficient

/** A condition on a positive whole number n. */
interface Cond { text: Rich; holds: (n: number) => boolean }
const div = (d: number): Cond => ({ text: t`${mn} is divisible by ${d}`, holds: (n) => n % d === 0 });
const C = {
  d2: { text: t`${mn} is even`, holds: (n: number) => n % 2 === 0 },
  d3: div(3), d4: div(4), d5: div(5), d6: div(6), d10: div(10), d12: div(12),
  d3and4: { text: t`${mn} is divisible by ${3} and by ${4}`, holds: (n: number) => n % 3 === 0 && n % 4 === 0 },
  d2and3: { text: t`${mn} is divisible by ${2} and by ${3}`, holds: (n: number) => n % 2 === 0 && n % 3 === 0 },
  sqEven: { text: t`${math`n^{${2}}`} is even`, holds: (n: number) => (n * n) % 2 === 0 },
  odd: { text: t`${mn} is odd`, holds: (n: number) => n % 2 === 1 },
  sqOdd: { text: t`${math`n^{${2}}`} is odd`, holds: (n: number) => (n * n) % 2 === 1 },
  gt5: { text: t`${math`n > ${5}`}`, holds: (n: number) => n > 5 },
  gt10: { text: t`${math`n > ${10}`}`, holds: (n: number) => n > 10 },
  sqGt25: { text: t`${math`n^{${2}} > ${25}`}`, holds: (n: number) => n * n > 25 },
} satisfies Record<string, Cond>;
type CK = keyof typeof C;

/** Pairs (A, B): is A necessary, sufficient, both, or neither for B? Every kind occurs. */
const PAIRS: readonly [CK, CK][] = [
  ['d4', 'd2'], ['d12', 'd3'], ['d10', 'd5'], ['gt10', 'gt5'],
  ['d2', 'd4'], ['d3', 'd6'], ['d5', 'd10'], ['gt5', 'gt10'],
  ['d6', 'd2and3'], ['sqEven', 'd2'], ['d12', 'd3and4'], ['odd', 'sqOdd'], ['sqGt25', 'gt5'],
  ['d4', 'd6'], ['d3', 'd5'], ['odd', 'd10'],
];

type Verdict = 'sufficient' | 'necessary' | 'both' | 'neither';
const VERDICTS: readonly ChoiceOption[] = [
  { id: 'sufficient', label: t`Sufficient, but not necessary` },
  { id: 'necessary', label: t`Necessary, but not sufficient` },
  { id: 'both', label: t`Necessary and sufficient` },
  { id: 'neither', label: t`Neither` },
];
/** The first n in 1..300 with A true and B false, and with B true and A false, or null. */
function gaps(a: Cond, b: Cond): { aNotB: number | null; bNotA: number | null } {
  const ns = upTo(300);
  return { aNotB: ns.find((n) => a.holds(n) && !b.holds(n)) ?? null, bNotA: ns.find((n) => b.holds(n) && !a.holds(n)) ?? null };
}
const verdictOf = (a: Cond, b: Cond): Verdict => {
  const g = gaps(a, b);
  return g.aNotB === null ? (g.bNotA === null ? 'both' : 'sufficient') : g.bNotA === null ? 'necessary' : 'neither';
};

interface NsP { i: number }

const necSuff = generator<NsP>({
  id: 'nec-suff',
  skill: 'Decide whether a condition is necessary, sufficient, both, or neither, as in the TMUA notes on necessary and sufficient.',
  params: (rng) => ({ i: int(rng, 0, PAIRS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < PAIRS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const [ka, kb] = PAIRS[i] as [CK, CK];
    const a = C[ka] as Cond;
    const b = C[kb] as Cond;
    const g = gaps(a, b);
    const v = verdictOf(a, b);
    return {
      prompt: t`${mn} is a positive whole number. Is "${a.text}" a necessary condition, a sufficient condition, both, or neither, for "${b.text}"?`,
      answer: { kind: 'choice', options: VERDICTS, correct: v },
      solution: [
        t`Sufficient means "if ${a.text}, then ${b.text}". ${g.aNotB === null ? t`That holds.` : t`That fails: at ${math`n = ${g.aNotB}`} the first is true and the second false.`}`,
        t`Necessary means "if ${b.text}, then ${a.text}": the second cannot hold without the first. ${g.bNotA === null ? t`That holds.` : t`That fails: at ${math`n = ${g.bNotA}`} the second is true and the first false.`}`,
        t`So the condition is ${v === 'both' ? 'necessary and sufficient' : v === 'neither' ? 'neither' : t`${v}, not ${v === 'sufficient' ? 'necessary' : 'sufficient'}`}.`,
      ],
    };
  },
  solve: ({ i }) => {
    // Truth tables of the two conditions on 1..1,000, compared directly.
    const [ka, kb] = PAIRS[i] as [CK, CK];
    const ns = upTo(1000);
    const suff = ns.every((n) => !C[ka].holds(n) || C[kb].holds(n));
    const nec = ns.every((n) => !C[kb].holds(n) || C[ka].holds(n));
    return [suff && nec ? 'both' : suff ? 'sufficient' : nec ? 'necessary' : 'neither'];
  },
  misconceptions: ({ i }): Misconception[] => {
    const [ka, kb] = PAIRS[i] as [CK, CK];
    const v = verdictOf(C[ka], C[kb]);
    const swap: Record<Verdict, Verdict> = { sufficient: 'necessary', necessary: 'sufficient', both: 'sufficient', neither: 'sufficient' };
    const other: Verdict = v === 'both' ? 'neither' : 'both';
    return [
      { response: [swap[v]], why: v === 'both' || v === 'neither' ? t`Check both directions: sufficient is "if the condition, then the statement"; necessary is the converse.` : t`Necessary and sufficient are swapped. A sufficient condition guarantees the statement; a necessary one is guaranteed by it.` },
      { response: [other], why: v === 'both' ? t`Both directions hold here: try to find a number where one is true and the other false. There is none.` : t`Test both directions with numbers: one condition true and the other false shows a direction fails.` },
    ];
  },
});

// ---------------------------------------------------------------- iff truth tables

type V = 'P' | 'Q' | 'R';
type F = { op: 'var'; v: V } | { op: 'not'; a: F } | { op: 'and' | 'or' | 'imp' | 'iff'; a: F; b: F };
const Vr = (v: V): F => ({ op: 'var', v });
const not = (a: F): F => ({ op: 'not', a });
const bin = (op: 'and' | 'or' | 'imp' | 'iff', a: F, b: F): F => ({ op, a, b });
const [P, Q, R] = [Vr('P'), Vr('Q'), Vr('R')];
type Reading = 'right' | 'imp' | 'and';

function evalF(f: F, env: Readonly<Record<string, boolean>>, reading: Reading = 'right'): boolean {
  switch (f.op) {
    case 'var': return env[f.v] === true;
    case 'not': return !evalF(f.a, env, reading);
    case 'and': return evalF(f.a, env, reading) && evalF(f.b, env, reading);
    case 'or': return evalF(f.a, env, reading) || evalF(f.b, env, reading);
    case 'imp': return !evalF(f.a, env, reading) || evalF(f.b, env, reading);
    case 'iff': {
      const x = evalF(f.a, env, reading);
      const y = evalF(f.b, env, reading);
      return reading === 'imp' ? !x || y : reading === 'and' ? x && y : x === y;
    }
  }
}
const OPS = { and: ['\\land', '&'], or: ['\\lor', '|'], imp: ['\\Rightarrow', '=>'], iff: ['\\Leftrightarrow', '<=>'] } as const;
const compound = (g: F): boolean => g.op !== 'var' && g.op !== 'not';
function show(f: F, ascii = false): string {
  if (f.op === 'var') return f.v;
  if (f.op === 'not') return `${ascii ? '~' : '\\lnot '}${compound(f.a) ? `(${show(f.a, ascii)})` : show(f.a, ascii)}`;
  const side = (g: F): string => (compound(g) ? `(${show(g, ascii)})` : show(g, ascii));
  return `${side(f.a)} ${OPS[f.op][ascii ? 1 : 0]} ${side(f.b)}`;
}
const varsOf = (f: F): V[] => (['P', 'Q', 'R'] as const).filter((v) => show(f).includes(v));
const TF = (b: boolean): string => (b ? 'T' : 'F');
const fm = (f: F): Span => math`${show(f)}`;

const FORMULAS: readonly F[] = [
  bin('iff', P, Q),
  bin('iff', P, not(Q)),
  not(bin('iff', P, Q)),
  bin('iff', not(P), Q),
  bin('iff', bin('or', P, Q), bin('and', P, Q)),
  bin('iff', P, bin('or', Q, R)),
  bin('iff', bin('and', P, Q), R),
  bin('and', bin('iff', P, Q), R),
];

interface TabP { i: number }

const iffTable = generator<TabP>({
  id: 'iff-table',
  skill: 'Fill in the truth table of a statement with if and only if: true exactly when both sides agree.',
  params: (rng) => ({ i: int(rng, 0, FORMULAS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FORMULAS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    const envs = assignments(vs);
    return {
      prompt: t`Fill in the [[truth-table|truth table]] of ${fm(f)}: write T or F in each empty cell.`,
      answer: {
        kind: 'table', cell: 'truth',
        columns: [...vs.map((v) => [math`${v}`]), [fm(f)]],
        rows: envs.map((env) => [...vs.map((v) => t`${TF(env[v] === true)}`), null]),
        expected: envs.map((env) => TF(evalF(f, env))),
      } satisfies Extract<AnswerSpec, { kind: 'table' }>,
      solution: [
        t`A [[biconditional|biconditional]] ${IFF} is true when ${mP} and ${mQ} have the same truth value, both true or both false.`,
        ...envs.map((env) => t`${math`${vs.map((v) => `${v} = \\mathrm{${TF(env[v] === true)}}`).join(',\\ ')}`}: ${evalF(f, env) ? 'true' : 'false'}.`),
      ],
    };
  },
  solve: ({ i }) => {
    const f = FORMULAS[i] as F;
    const r = parseFormula(show(f, true), ['P', 'Q', 'R']);
    if (!r.ok) return ['?'];
    return assignments(varsOf(f)).map((env) => TF(evalFormula(r.value, env)));
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FORMULAS[i] as F;
    const envs = assignments(varsOf(f));
    return [
      { response: envs.map((env) => TF(evalF(f, env, 'imp'))), why: t`"If and only if" was read as "if then". ${IFF} is also false when ${mP} is false and ${mQ} is true.` },
      { response: envs.map((env) => TF(evalF(f, env, 'and'))), why: t`"If and only if" was read as "and". ${IFF} is true when both sides are false too: they agree.` },
      { response: envs.map((env) => TF(!evalF(f, env))), why: t`Every row is flipped: those are the values of its negation.` },
    ];
  },
});

// ---------------------------------------------------------------- a counterexample to an iff

const FAILS: readonly [CK, CK][] = [['d4', 'd2'], ['d12', 'd3'], ['d10', 'd5'], ['gt10', 'gt5'], ['d4', 'd6'], ['d3', 'd5'], ['sqGt25', 'gt10'], ['d6', 'd3']];
interface WitP { i: number }

const iffWitness = generator<WitP>({
  id: 'iff-counterexample',
  skill: 'Show an if and only if is false: find a number for which one side holds and the other does not.',
  params: (rng) => ({ i: int(rng, 0, FAILS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FAILS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const [ka, kb] = FAILS[i] as [CK, CK];
    const a = C[ka] as Cond;
    const b = C[kb] as Cond;
    const g = gaps(a, b);
    const ex = (g.aNotB ?? g.bNotA) as number;
    return {
      prompt: t`Show that "${a.text} if and only if ${b.text}" is false for positive whole numbers: give one ${mn} for which it fails.`,
      answer: {
        kind: 'witness', count: 1, names: ['n'], example: String(ex),
        check: ([v]) => {
          const n = v !== undefined && v.den === 1n && v.num > 0n ? Number(v.num) : NaN;
          if (Number.isNaN(n)) return 'Give a positive whole number.';
          const x = a.holds(n);
          const y = b.holds(n);
          return x !== y ? null : `At n = ${n} both sides are ${x ? 'true' : 'false'}, so the "if and only if" holds there. Find an n where one side is true and the other false.`;
        },
      },
      solution: [
        t`An "if and only if" fails at ${mn} when the two sides have different truth values there.`,
        t`At ${math`n = ${ex}`}: "${a.text}" is ${a.holds(ex) ? 'true' : 'false'} and "${b.text}" is ${b.holds(ex) ? 'true' : 'false'}. So the statement fails at ${ex}${g.aNotB !== null && g.bNotA !== null ? t`; the other direction fails too, at ${math`n = ${g.bNotA}`}` : t``}.`,
      ],
    };
  },
  solve: ({ i }) => {
    const [ka, kb] = FAILS[i] as [CK, CK];
    return `n = ${upTo(500).find((n) => C[ka].holds(n) !== C[kb].holds(n)) as number}`;
  },
  misconceptions: ({ i }): Misconception[] => {
    const [ka, kb] = FAILS[i] as [CK, CK];
    const both = upTo(500).find((n) => C[ka].holds(n) && C[kb].holds(n)) as number;
    const neither = upTo(500).find((n) => !C[ka].holds(n) && !C[kb].holds(n)) as number;
    return [
      { response: `n = ${both}`, why: t`At ${math`n = ${both}`} both sides are true, so the "if and only if" holds there. You need one side true and the other false.` },
      { response: `n = ${neither}`, why: t`At ${math`n = ${neither}`} both sides are false, and an "if and only if" with both sides false is true.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const prop16 = workedProof({
  title: t`Even means congruent to ${0}`,
  prompt: t`Proposition ${16} of the CST notes (part ${1}): for every integer ${mn}, ${mn} is even if, and only if, ${math`n \equiv ${0} \pmod{${2}}`}. Here ${math`a \equiv b \pmod{m}`} means ${math`m \mid (a - b)`}, and ${math`d \mid n`} means ${math`n = k \cdot d`} for some integer ${math`k`}.`,
  steps: [
    t`(${math`\Rightarrow`}) Assume ${mn} is even: ${math`n = ${2}k`} for some integer ${math`k`}. Then ${math`n - ${0} = k \cdot ${2}`}, so ${math`${2} \mid (n - ${0})`}, which is ${math`n \equiv ${0} \pmod{${2}}`}.`,
    t`(${math`\Leftarrow`}) Assume ${math`n \equiv ${0} \pmod{${2}}`}: ${math`${2} \mid (n - ${0})`}, so ${math`n = n - ${0} = k \cdot ${2}`} for some integer ${math`k`}. So ${mn} is even.`,
    t`Both directions hold, so the "if and only if" holds. Part ${2}, ${mn} odd iff ${math`n \equiv ${1} \pmod{${2}}`}, goes the same way with ${math`n - ${1}`}.`,
  ],
  answer: t`${mn} is even if and only if ${math`n \equiv ${0} \pmod{${2}}`}.`,
  source: cite('cst-dm-notes', 'printed page 61, Proposition 16'),
});

function bop24(o: { n: number; text: Rich; right: Rich; ifOnly: Rich; onlyIf: Rich; official: boolean; check?: () => string | null; steps: Rich[] }): AutoProblem {
  const at = `Section 2.4, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-4-${o.n}`,
    source: cite('bop', at, true),
    title: t`In the form "${mP} if and only if ${mQ}"`,
    prompt: t`Without changing its meaning, which sentence of the form "${mP} if and only if ${mQ}" says the same as: "${o.text}"`,
    answer: { kind: 'choice', options: [{ id: 'iff', label: o.right }, { id: 'if', label: o.ifOnly }, { id: 'only-if', label: o.onlyIf }], correct: 'iff' },
    solution: o.steps,
    reference: 'iff',
    verify: o.check ?? (() => null),
    misconceptions: [
      { response: 'if', why: t`That keeps only one direction. "Necessary and sufficient", or "and conversely", says both.` },
      { response: 'only-if', why: t`That keeps only one direction. The sentence asserts both implications.` },
    ],
  };
  if (o.official) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: 'iff', agrees: true };
  return auto(spec);
}

const bop24_1 = bop24({
  n: 1, official: true,
  text: t`For a matrix ${math`A`} to be invertible, it is necessary and sufficient that ${math`\det(A) \ne ${0}`}.`,
  right: t`A matrix is invertible if and only if its determinant is not zero.`,
  ifOnly: t`A matrix is invertible if its determinant is not zero.`,
  onlyIf: t`A matrix is invertible only if its determinant is not zero.`,
  steps: [t`"Necessary and sufficient" is both directions at once: ${IFF}. So: a matrix is invertible if and only if its determinant is not zero.`],
  check: () => {
    // Every 2 × 2 integer matrix with entries from -2 to 2. With det ≠ 0, the adjugate over det is a two-sided
    // inverse (checked exactly); with det = 0, some nonzero vector is sent to zero, so no inverse can exist.
    const r = [-2, -1, 0, 1, 2];
    for (const a of r) for (const b of r) for (const c of r) for (const d of r) {
      const det = a * d - b * c;
      if (det !== 0) {
        const prod = [a * d - b * c, -a * b + b * a, c * d - d * c, -c * b + d * a];
        if (prod.join() !== [det, 0, 0, det].join()) return `adjugate check at ${a} ${b} ${c} ${d}`;
      } else {
        const kills = [[d, -c], [-b, a], [1, 0], [0, 1]].some(([x, y]) => (x !== 0 || y !== 0) && a * (x as number) + b * (y as number) === 0 && c * (x as number) + d * (y as number) === 0);
        if (!kills) return `no kernel vector at ${a} ${b} ${c} ${d}`;
      }
    }
    return null;
  },
});
const bop24_3 = bop24({
  n: 3, official: true,
  text: t`If ${math`xy = ${0}`} then ${math`x = ${0}`} or ${math`y = ${0}`}, and conversely.`,
  right: t`${math`xy = ${0}`} if and only if ${math`x = ${0}`} or ${math`y = ${0}`}.`,
  ifOnly: t`${math`xy = ${0}`} if ${math`x = ${0}`} or ${math`y = ${0}`}.`,
  onlyIf: t`${math`xy = ${0}`} only if ${math`x = ${0}`} or ${math`y = ${0}`}.`,
  steps: [t`"If ${mP} then ${mQ}, and conversely" adds ${math`Q \Rightarrow P`} to ${math`P \Rightarrow Q`}: that is ${IFF}, with ${mP} "${math`xy = ${0}`}" and ${mQ} "${math`x = ${0}`} or ${math`y = ${0}`}".`],
  check: () => {
    const r = [-4, -2, -1, 0, 1, 3, 5];
    const ok = r.every((x) => r.every((y) => (x * y === 0) === (x === 0 || y === 0)));
    return ok ? null : 'xy = 0 iff x = 0 or y = 0 fails on the sample';
  },
});
const bop24_5 = bop24({
  n: 5, official: true,
  text: t`For an occurrence to become an adventure, it is necessary and sufficient for one to recount it. (Jean-Paul Sartre)`,
  right: t`An occurrence becomes an adventure if and only if one recounts it.`,
  ifOnly: t`An occurrence becomes an adventure if one recounts it.`,
  onlyIf: t`An occurrence becomes an adventure only if one recounts it.`,
  steps: [t`"Necessary and sufficient" gives both directions: an occurrence becomes an adventure if and only if one recounts it.`],
});

const sw113verdict = auto({
  id: 'sw-1-1-3-verdict',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.3'),
  title: t`Prove or disprove: ${math`n^{${2}}`} even iff ${mn} even`,
  prompt: t`Prove or disprove: for an integer ${mn}, ${math`n^{${2}}`} is even if and only if ${mn} is even. First decide: true or false?`,
  answer: { kind: 'choice', options: [{ id: 'true', label: t`True for every integer` }, { id: 'false', label: t`False for some integer` }], correct: 'true' },
  solution: [
    t`Try both directions on examples: no integer has ${math`n^{${2}}`} even and ${mn} odd, or the other way round. So try to prove it.`,
    t`(${math`\Leftarrow`}) If ${math`n = ${2}k`} then ${math`n^{${2}} = ${2}(${2}k^{${2}})`} is even. (${math`\Rightarrow`}) If ${mn} were odd, ${math`n = ${2}k + ${1}`}, then ${math`n^{${2}} = ${2}(${2}k^{${2}} + ${2}k) + ${1}`} would be odd; so if ${math`n^{${2}}`} is even, ${mn} is even. The full proof is the supervision problem.`,
  ],
  reference: 'true',
  verify: () => same('n from -200 to 200', upTo(401).map((x) => x - 201).every((n) => ((n * n) % 2 === 0) === (n % 2 === 0)), true),
  misconceptions: [{ response: 'false', why: t`Try to find an ${mn} where one side holds and the other does not: there is none. Both directions can be proved.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.3'), answer: 'true', agrees: true },
});

const tmuaNecessary = auto({
  id: 'tmua-necessary',
  source: cite('tmua-logic-proof', 'Necessary and sufficient, pages 51 to 54', true),
  title: t`"${math`A`} is necessary for ${math`B`}" in symbols`,
  prompt: t`Write "${math`A`} is necessary for ${math`B`}" in symbols, using ${math`A`}, ${math`B`}, and ${math`\Rightarrow`} (or other connectives).`,
  answer: { kind: 'formula', expected: 'B => A', variables: ['A', 'B'] },
  solution: [
    t`${math`A`} is necessary for ${math`B`} when ${math`B`} cannot hold without ${math`A`}: whenever ${math`B`} is true, ${math`A`} is true. That is ${math`B \Rightarrow A`}, which the TMUA notes also write ${math`A \Leftarrow B`}.`,
  ],
  reference: 'B => A',
  verify: () => {
    // B => A is false only when B is true and A false: exactly when A fails to be necessary.
    const f = parseFormula('B => A', ['A', 'B']);
    if (!f.ok) return f.error;
    return same('B => A against "no B without A"', assignments(['A', 'B']).every((env) => evalFormula(f.value, env) === !(env.B === true && env.A !== true)), true);
  },
  misconceptions: [{ response: 'A => B', why: t`That says ${math`A`} is sufficient for ${math`B`}. Necessary is the other direction: ${math`B`} needs ${math`A`}.` }],
  // The notes' summary table on page 54 prints "A is necessary for B: A ⇐ B", typed here with the arrow turned round.
  official: { source: cite('tmua-logic-proof', 'page 54, the summary table'), answer: 'B => A', agrees: true },
});

const tmuaBoth = auto({
  id: 'tmua-necessary-sufficient',
  source: cite('tmua-logic-proof', 'Necessary and sufficient, pages 51 to 54', true),
  title: t`Necessary and sufficient, in symbols`,
  prompt: t`Write "${math`A`} is necessary and sufficient for ${math`B`}" in symbols, using ${math`A`} and ${math`B`}.`,
  answer: { kind: 'formula', expected: 'A <=> B', variables: ['A', 'B'] },
  solution: [t`Sufficient is ${math`A \Rightarrow B`} and necessary is ${math`B \Rightarrow A`}; both together is ${math`A \Leftrightarrow B`}, "${math`A`} if and only if ${math`B`}".`],
  reference: 'A <=> B',
  verify: () => {
    const both = parseFormula('(A => B) & (B => A)', ['A', 'B']);
    const iff = parseFormula('A <=> B', ['A', 'B']);
    if (!both.ok || !iff.ok) return 'parse';
    return same('the two directions against iff', assignments(['A', 'B']).every((env) => evalFormula(both.value, env) === evalFormula(iff.value, env)), true);
  },
  misconceptions: [{ response: 'A => B', why: t`That is only sufficient. Necessary adds the converse.` }],
  official: { source: cite('tmua-logic-proof', 'page 54, the summary table'), answer: 'A <=> B', agrees: true },
});

const sw122 = supervision({
  id: 'sw-1-2-2',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.2'),
  title: t`Cancelling a common factor`,
  prompt: t`Let ${math`k, m, n`} be integers with ${math`k`} positive. Show that ${math`(k \cdot m) \mid (k \cdot n) \iff m \mid n`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.2'),
});
const sw127 = supervision({
  id: 'sw-1-2-7',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.7'),
  title: t`Divisible by ${30}`,
  prompt: t`Prove that for all integers ${mn}, ${math`${30} \mid n \iff (${2} \mid n \land ${3} \mid n \land ${5} \mid n)`}. The backward direction is the harder one: knowing ${2}, ${3}, and ${5} each divide ${mn}, find a way to combine ${math`n = ${2}a`}, ${math`n = ${3}b`}, ${math`n = ${5}c`} into a multiple of ${30}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.7'),
});
const tmuaI3 = supervision({
  id: 'tmua-i-3',
  source: cite('tmua-logic-proof', 'Exercise I, questions 1 to 3'),
  title: t`Swapping the sides`,
  prompt: t`Compare "${math`A`} only if ${math`B`}" with "${math`B`} only if ${math`A`}", and "${math`A`} iff ${math`B`}" with "${math`B`} iff ${math`A`}". Which pairs say the same thing? Explain with truth tables or diagrams, and say what the symmetry of "if and only if" means.`,
  writeUp: 'explanation',
});

// STEP Support Assignment 10, Q2(v): which of five "iff" statements are true.
const isPrimeNumber = (n: number): boolean => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
/** Integer-sided triangles with sides up to 20: is "scalene iff no two angles equal" true for all? */
function scaleneMatchesAngles(): boolean {
  // cos A = (b^2 + c^2 - a^2) / (2bc), compared exactly by cross-multiplying.
  const cosEq = (a: number, b: number, c: number, x: number, y: number, z: number): boolean =>
    (b * b + c * c - a * a) * (2 * y * z) === (y * y + z * z - x * x) * (2 * b * c);
  for (let a = 1; a <= 20; a++) for (let b = 1; b <= 20; b++) for (let c = 1; c <= 20; c++) {
    if (a + b <= c || b + c <= a || a + c <= b) continue;
    const scalene = a !== b && b !== c && a !== c;
    const twoAnglesEqual = cosEq(a, b, c, b, c, a) || cosEq(b, c, a, c, a, b) || cosEq(a, b, c, c, a, b);
    if (scalene === twoAnglesEqual) return false;
  }
  return true;
}
const IFF_TRUE = ['a', 'e'];
const a10Iff = auto({
  id: 'a10-q2-v',
  source: cite('step-f10', 'Q2(v)', true),
  title: t`Five statements with "if and only if"`,
  prompt: t`Which of the following statements are true? Choose all that are. (For each false one, be ready to say which direction fails, with an example.)`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'a', label: t`An even number is prime if and only if it is ${2}.` },
      { id: 'b', label: t`An odd number is prime if and only if it is ${3}.` },
      { id: 'c', label: t`${math`x = ${3}`} if and only if ${math`x^{${2}} - ${9} = ${0}`}.` },
      { id: 'd', label: t`A triangle with sides of lengths ${math`a`}, ${math`b`}, and ${math`c`} is right-angled if and only if ${math`a^{${2}} + b^{${2}} = c^{${2}}`}.` },
      { id: 'e', label: t`A triangle is scalene (no two sides equal) if and only if no two of its angles are the same.` },
    ],
    correct: IFF_TRUE,
  },
  solution: [
    t`Each statement is two implications, and a false one fails in at least one direction. (a) is true: ${2} is even and prime, and an even number ${math`n`} greater than ${2} has the factor ${2}, which lies strictly between ${1} and ${math`n`}, so it is not prime. (b) is false: "if it is ${3}, it is prime" holds, but the other direction fails at ${5}, an odd prime that is not ${3}.`,
    t`(c) is false: "if ${math`x = ${3}`} then ${math`x^{${2}} - ${9} = ${0}`}" holds, but ${math`x = -${3}`} also makes ${math`x^{${2}} - ${9} = ${0}`}. So ${math`x = ${3}`} is sufficient, not necessary.`,
    t`(d) is false, and the hints admit it is a little mean: the statement does not say which side is longest. With ${math`a = ${5}`}, ${math`b = ${3}`}, ${math`c = ${4}`} the triangle is right-angled, yet ${math`a^{${2}} + b^{${2}} = ${34} \neq ${16} = c^{${2}}`}. It becomes true if ${math`c`} is known to be the longest side.`,
    t`(e) is true: in a triangle, two sides are equal exactly when the angles opposite them are equal (the isosceles triangle theorem and its converse). So "no two sides equal" and "no two angles equal" say the same thing. The true statements are (a) and (e).`,
  ],
  reference: IFF_TRUE,
  verify: () => {
    const evenPrimes = upTo(1000).filter((n) => n % 2 === 0 && isPrimeNumber(n));
    const verdicts = {
      a: evenPrimes.join() === '2',
      b: !upTo(100).some((n) => n % 2 === 1 && isPrimeNumber(n) && n !== 3) && isPrimeNumber(3),
      // True only if no x other than 3 has x^2 = 9; x = -3 has.
      c: !((-3) ** 2 - 9 === 0),
      // True only if every right-angled triangle has a^2 + b^2 = c^2; sides a = 5, b = 3, c = 4 do not.
      d: !(3 ** 2 + 4 ** 2 === 5 ** 2 && 5 ** 2 + 3 ** 2 !== 4 ** 2),
      e: scaleneMatchesAngles(),
    };
    return same('the true statements', Object.entries(verdicts).filter(([, v]) => v).map(([k]) => k).join(), IFF_TRUE.join());
  },
  misconceptions: [
    { response: ['a', 'd', 'e'], why: t`(d) assumes ${math`c`} is the longest side, which the statement does not say: with ${math`a = ${5}`}, ${math`b = ${3}`}, ${math`c = ${4}`} the triangle is right-angled but ${math`a^{${2}} + b^{${2}} \neq c^{${2}}`}.` },
    { response: ['a', 'c', 'e'], why: t`(c) fails in one direction: ${math`x = -${3}`} makes ${math`x^{${2}} - ${9} = ${0}`} true and ${math`x = ${3}`} false.` },
    { response: ['a'], why: t`(e) is true: in a triangle equal sides face equal angles, and equal angles face equal sides, so "no two sides equal" and "no two angles equal" go together.` },
  ],
  official: { source: cite('step-f10-hints', 'Q2(v)'), answer: IFF_TRUE, agrees: true },
});

// ---------------------------------------------------------------- lesson

export const iff: TopicContent = {
  topicId: 'logic.iff',
  goal: t`Say whether a condition is necessary, sufficient, or both, and prove an "if and only if" in both directions.`,
  objective: t`Tell necessary from sufficient conditions, and prove an "if and only if" in both directions.`,
  why: t`Definitions and characterisations are stated as "if and only if"; next you rewrite statements by equivalences.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Two arrows at once` },
    { kind: 'hook', text: t`A library sign says: "Members may enter." So being a member is enough to get in. But is it the only way in? Could a visitor with a day pass enter too? Sometimes a condition is enough, sometimes it is needed, and sometimes it is exactly both. Mathematics keeps these three apart.` },
    { kind: 'narrative', text: t`You know ${math`P \Rightarrow Q`}: whenever ${mP} holds, ${mQ} holds. Often a theorem says more: the arrow goes both ways. Then ${mP} and ${mQ} stand or fall together.` },
    {
      kind: 'definition',
      name: t`Biconditional`,
      formal: t`For statements ${mP} and ${mQ}, the [[biconditional|biconditional]] ${IFF}, read "${mP} if and only if ${mQ}" and written "${mP} iff ${mQ}", is the statement ${math`(P \Rightarrow Q) \land (Q \Rightarrow P)`}.`,
      plain: t`each of ${mP} and ${mQ} implies the other. "${mn} is even iff ${mn} ends in ${0}, ${2}, ${4}, ${6}, or ${8}" is a true example.`,
    },
    {
      kind: 'table', caption: t`${IFF} is true exactly when ${mP} and ${mQ} have the same truth value.`,
      head: [[mP], [mQ], [IFF]],
      rows: assignments(['P', 'Q']).map((env) => [t`${TF(env.P === true)}`, t`${TF(env.Q === true)}`, t`${TF(env.P === env.Q)}`]),
    },
    {
      kind: 'p',
      text: t`The words split cleanly. "${mP} if ${mQ}" is ${math`Q \Rightarrow P`}. "${mP} only if ${mQ}" is ${math`P \Rightarrow Q`}. Put them together and you get "${mP} if and only if ${mQ}".`,
      why: { q: t`Why is "${mP} if ${mQ}" the arrow from ${mQ} to ${mP}?`, a: t`The condition comes after the word "if": "${mP} if ${mQ}" is "if ${mQ}, then ${mP}". So ${mQ} is the hypothesis. "Only if" reverses it, as in the implication lesson.` },
    },
    { kind: 'section', title: t`Necessary and sufficient` },
    { kind: 'narrative', text: t`The TMUA notes say the same thing in terms of conditions. Picture the multiples of ${4} as a small circle drawn inside a bigger circle, the even numbers. Being in the small circle is enough to be in the big one. Being in the big one is needed to be in the small one.` },
    {
      kind: 'definition',
      name: t`Sufficient and necessary conditions`,
      formal: t`${math`A`} is a [[sufficient-condition|sufficient condition]] for ${math`B`} if ${math`A \Rightarrow B`}. ${math`A`} is a [[necessary-condition|necessary condition]] for ${math`B`} if ${math`B \Rightarrow A`}. ${math`A`} is necessary and sufficient for ${math`B`} if ${math`A \Leftrightarrow B`}.`,
      plain: t`sufficient means "enough on its own"; necessary means "can't do without". "${mn} is divisible by ${4}" is sufficient for "${mn} is even", and "${mn} is even" is necessary for "${mn} is divisible by ${4}".`,
    },
    {
      kind: 'p',
      text: t`Divisible by ${4} is sufficient for even, but not necessary: ${2} is even and not divisible by ${4}. Even is necessary for divisible by ${4}, but not sufficient, for the same reason. One number settles each "not".`,
      why: { q: t`Why does a single number show a condition is not necessary?`, a: t`"Divisible by ${4} is necessary for even" would mean: every even number is divisible by ${4}. That is a claim about every even number, so one even number that fails it, ${2}, is enough to make it false.` },
    },
    quickCheck({
      prompt: t`For a whole number ${mn}, is "${mn} is divisible by ${6}" necessary, sufficient, or both, for "${mn} is divisible by ${3}"?`,
      answer: { kind: 'choice', options: [{ id: 'nec', label: t`Necessary only` }, { id: 'suf', label: t`Sufficient only` }, { id: 'both', label: t`Both` }], correct: 'suf' },
      reference: 'suf',
      why: t`If ${math`n = ${6}k`} then ${math`n = ${3}(${2}k)`}, so divisible by ${6} is enough. It is not needed: ${3} is divisible by ${3} but not by ${6}.`,
    }),
    { kind: 'section', title: t`Proving both directions` },
    { kind: 'narrative', text: t`Since ${IFF} is two implications, a proof of it is two proofs. The CST notes give the layout: write (${math`\Rightarrow`}) and prove ${math`P \Rightarrow Q`}; then write (${math`\Leftarrow`}) and prove ${math`Q \Rightarrow P`}. Each direction starts by assuming its own hypothesis.` },
    { kind: 'narrative', text: t`Here is one where the second direction needs a small idea. Recall that ${mn} is even if ${math`n = ${2}k`} for some integer ${math`k`}.` },
    { kind: 'theorem', statement: t`For every integer ${mn}: ${mn} is even if and only if ${math`${3}n`} is even.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`(${math`\Rightarrow`}) Assume ${mn} is even`, text: t`Then ${math`n = ${2}k`} for some integer ${math`k`}, so ${math`${3}n = ${3} \cdot ${2}k = ${2}(${3}k)`}.`, plain: t`Multiply ${math`n = ${2}k`} by ${3}, and regroup so the factor ${2} is at the front. With ${math`n = ${4}`}: ${math`k = ${2}`} and ${math`${12} = ${2} \times ${6}`}.` },
        { label: t`Conclude the first direction`, text: t`${math`${3}k`} is an integer, so ${math`${3}n`} is even.`, plain: t`${math`${3}n`} is ${2} times a whole number, which is what even means.` },
        { label: t`(${math`\Leftarrow`}) Assume ${math`${3}n`} is even`, text: t`Then ${math`${3}n = ${2}j`} for some integer ${math`j`}.`, plain: t`A fresh letter, because this is a new assumption. If ${mn} were ${4}, ${math`${3}n`} would be ${12} and ${math`j`} would be ${6}.` },
        {
          label: t`Peel off ${math`${2}n`}`, text: t`Then`, eq: [math`n = ${3}n - ${2}n = ${2}j - ${2}n = ${2}(j - n)`],
          plain: t`${math`${3}n`} minus ${math`${2}n`} is just ${mn}. Replace ${math`${3}n`} by ${math`${2}j`}, then take out the common factor ${2}.`,
          why: { q: t`Where did the idea of subtracting ${math`${2}n`} come from?`, a: t`We want ${mn} as ${2} times something, and we know ${math`${3}n`} is. The gap between ${math`${3}n`} and ${mn} is ${math`${2}n`}, which is already a multiple of ${2}, so removing it keeps the factor ${2}.` },
        },
        { label: t`Conclude the second direction`, text: t`${math`j - n`} is an integer, so ${mn} is even. Both directions hold, so ${mn} is even iff ${math`${3}n`} is even.`, plain: t`The difference of two integers is an integer. With both arrows proved, the "if and only if" is proved.` },
      ],
    },
    {
      kind: 'pitfall',
      claim: t`"To prove ${IFF}, prove ${math`P \Rightarrow Q`}." (and stop)`,
      counterexample: t`That proves only one arrow. "${mn} divisible by ${4} ${math`\Rightarrow`} ${mn} even" is true, yet "divisible by ${4} iff even" is false: ${math`n = ${2}`} makes one side true and the other false.`,
    },
    { kind: 'p', text: t`So to disprove an "if and only if", one number with one side true and the other false is enough. Book of Proof lists other ways to say it: "${mP} is equivalent to ${mQ}", and "if ${mP}, then ${mQ}, and conversely".` },
    { kind: 'takeaway', text: t`${IFF} is two implications: sufficient is ${math`P \Rightarrow Q`}, necessary is ${math`Q \Rightarrow P`}, and a proof needs both directions.` },
  ],
  examples: [
    { ...prop16, examiner: t`The two directions labelled, each opening with its own assumption, and the definitions of even and of congruence written out rather than quoted.` },
    worked(necSuff, { i: 0 }, t`Divisible by ${4}, and even`),
    worked(iffWitness, { i: 4 }, t`Divisible by ${4} if and only if divisible by ${6}?`),
  ],
  generators: [necSuff, iffTable, iffWitness],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['biconditional', 'sufficient-condition', 'necessary-condition'],
  cambridge: withUses([bop24_1, bop24_3, bop24_5, sw113verdict, tmuaNecessary, tmuaBoth, sw122, sw127, a10Iff, tmuaI3], {
    'sw-1-2-7': { sections: ['Proving both directions'], note: t`Both directions of a divisibility equivalence`, needs: ['num.divisibility'] },
    'sw-1-2-2': { sections: ['Proving both directions'], note: t`Both directions of a divisibility equivalence`, needs: ['num.divisibility'] },
    'a10-q2-v': { sections: ['Two arrows at once', 'Necessary and sufficient'], note: t`Testing both directions of each statement, and breaking a false one with a single example` },
  }),
  // The two-way proof of 1.1.3 is set in proof.contrapositive, where its harder direction is taught (Rule 1,
  // 2026-10-08). 1.2.7 and 1.2.2 need divisibility, taught later, so they are practice. The true-or-false
  // version of 1.1.3 is left out: a two-option guess does not test the topic. Assignment 10 Q2(v) has five
  // statements to judge, so a guess passes it one time in 32.
  gate: ['a10-q2-v'],
  recall: [
    { front: t`What does ${IFF} mean?`, back: t`${math`(P \Rightarrow Q) \land (Q \Rightarrow P)`}: true exactly when ${mP} and ${mQ} have the same truth value.` },
    { front: t`${math`A`} is sufficient for ${math`B`}: which arrow?`, back: t`${math`A \Rightarrow B`}. ${math`A`} on its own guarantees ${math`B`}.` },
    { front: t`${math`A`} is necessary for ${math`B`}: which arrow?`, back: t`${math`B \Rightarrow A`}. ${math`B`} cannot hold without ${math`A`}.` },
    { front: t`How do you prove ${IFF}?`, back: t`Two proofs: (${math`\Rightarrow`}) assume ${mP}, deduce ${mQ}; (${math`\Leftarrow`}) assume ${mQ}, deduce ${mP}.` },
  ],
  proofOrder: [
    {
      title: t`${mn} is even iff ${math`${3}n`} is even`,
      steps: [
        t`(${math`\Rightarrow`}) Assume ${math`n = ${2}k`}; then ${math`${3}n = ${2}(${3}k)`} is even.`,
        t`(${math`\Leftarrow`}) Assume ${math`${3}n = ${2}j`} for an integer ${math`j`}.`,
        t`Then ${math`n = ${3}n - ${2}n = ${2}(j - n)`}.`,
        t`So ${mn} is even, and both directions hold.`,
      ],
    },
  ],
};
