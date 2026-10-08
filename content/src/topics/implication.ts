/**
 * logic.implication: If P then Q. The lesson follows the CST notes on implication (printed
 * pages 42 to 56: proving an implication by assuming P, using one by modus ponens,
 * Proposition 8, Theorem 11), Book of Proof Sections 2.3 and 2.5 (the promise, the ways of
 * saying P implies Q), and the TMUA notes on "if A then B" and swapping A and B (pages 28
 * to 30, 38, and 46). The problems are Book of Proof's exercises for Sections 2.3 and 2.5,
 * TMUA Exercises E and J, the TMUA examples of page 29, and the notes' Proposition 10. The
 * second gate (batch 9) is STEP Support Assignment 4, Q4(i): which cards to turn over to test
 * "if a card has an even number on one side, it has a vowel on the other", checked against the
 * hints and by trying every possible hidden face.
 */
import { assignments, evalFormula, parseFormula, type Formula } from '@learnhub/mastery';
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, sample, upTo } from '../math';
import { generator, type AnswerSpec, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, workedProof, type TopicContent } from '../topic';

type V = 'P' | 'Q' | 'R' | 'S';
type F =
  | { op: 'var'; v: V }
  | { op: 'not'; a: F }
  | { op: 'and' | 'or' | 'imp' | 'iff'; a: F; b: F };

const Vr = (v: V): F => ({ op: 'var', v });
const not = (a: F): F => ({ op: 'not', a });
const and = (a: F, b: F): F => ({ op: 'and', a, b });
const or = (a: F, b: F): F => ({ op: 'or', a, b });
const imp = (a: F, b: F): F => ({ op: 'imp', a, b });
const [P, Q, R] = [Vr('P'), Vr('Q'), Vr('R')];

type Env = Readonly<Record<string, boolean>>;
/** How an arrow is read: rightly, or by one of the three slips the misconceptions model. */
type Reading = 'right' | 'and' | 'converse' | 'iff';

function evalF(f: F, env: Env, reading: Reading = 'right'): boolean {
  switch (f.op) {
    case 'var': return env[f.v] === true;
    case 'not': return !evalF(f.a, env, reading);
    case 'and': return evalF(f.a, env, reading) && evalF(f.b, env, reading);
    case 'or': return evalF(f.a, env, reading) || evalF(f.b, env, reading);
    case 'imp': {
      const x = evalF(f.a, env, reading);
      const y = evalF(f.b, env, reading);
      return reading === 'and' ? x && y : reading === 'converse' ? !y || x : reading === 'iff' ? x === y : !x || y;
    }
    case 'iff': return evalF(f.a, env, reading) === evalF(f.b, env, reading);
  }
}

function varsOf(f: F): V[] {
  const out = new Set<V>();
  const go = (g: F): void => { if (g.op === 'var') out.add(g.v); else if (g.op === 'not') go(g.a); else { go(g.a); go(g.b); } };
  go(f);
  return (['P', 'Q', 'R', 'S'] as const).filter((v) => out.has(v));
}

const isCompound = (g: F): boolean => g.op !== 'var' && g.op !== 'not';
const TEX_OP = { and: '\\land', or: '\\lor', imp: '\\Rightarrow', iff: '\\Leftrightarrow' } as const;
const ASCII_OP = { and: '&', or: '|', imp: '=>', iff: '<=>' } as const;
function show(f: F): string {
  switch (f.op) {
    case 'var': return f.v;
    case 'not': return isCompound(f.a) ? `\\lnot (${show(f.a)})` : `\\lnot ${show(f.a)}`;
    default: {
      const side = (g: F): string => (isCompound(g) ? `(${show(g)})` : show(g));
      return `${side(f.a)} ${TEX_OP[f.op]} ${side(f.b)}`;
    }
  }
}
/** The formula grader's syntax, for the independent second evaluation. */
function ascii(f: F): string {
  switch (f.op) {
    case 'var': return f.v;
    case 'not': return isCompound(f.a) ? `~(${ascii(f.a)})` : `~${ascii(f.a)}`;
    default: {
      const side = (g: F): string => (isCompound(g) ? `(${ascii(g)})` : ascii(g));
      return `${side(f.a)} ${ASCII_OP[f.op]} ${side(f.b)}`;
    }
  }
}
function formulaOf(text: string, vars: readonly string[]): Formula {
  const r = parseFormula(text, vars);
  if (!r.ok) throw new Error(`implication: content formula "${text}": ${r.error}`);
  return r.value;
}

const fm = (f: F): Span => math`${show(f)}`;
const TF = (b: boolean): string => (b ? 'T' : 'F');
const yn = (b: boolean): Rich => t`${TF(b)}`;
const [mP, mQ] = [math`P`, math`Q`];
const IMP = math`P \Rightarrow Q`;

/** Truth-table rows in the usual order, all true first. */
const rowsOf = (vars: readonly V[]): Env[] => assignments(vars) as Env[];

/** A truth table with the letters given and the listed columns to fill (cells for which `given` holds are shown). */
function fillTable(vars: readonly V[], cols: readonly F[], given: (row: number, col: number) => boolean = () => false): Extract<AnswerSpec, { kind: 'table' }> {
  const rows: (Rich | null)[][] = [];
  const expected: string[] = [];
  rowsOf(vars).forEach((env, r) => {
    rows.push([
      ...vars.map((v) => yn(env[v] === true)),
      ...cols.map((f, c) => {
        const b = evalF(f, env);
        if (given(r, c)) return yn(b);
        expected.push(TF(b));
        return null;
      }),
    ]);
  });
  return { kind: 'table', columns: [...vars.map((v) => [math`${v}`]), ...cols.map((f) => [fm(f)])], rows, expected, cell: 'truth' };
}

// ---------------------------------------------------------------- generators

const FORMULAS: readonly F[] = [
  imp(P, Q),
  imp(not(P), Q),
  imp(P, not(Q)),
  not(imp(P, Q)),
  and(imp(P, Q), not(Q)),
  imp(and(P, Q), R),
  imp(P, or(Q, R)),
  imp(or(P, Q), not(R)),
  imp(P, imp(Q, R)),
  imp(imp(P, Q), R),
];

interface TableP { i: number }

const fillColumn = generator<TableP>({
  id: 'fill-table',
  skill: 'Fill in the truth table of a statement with an implication, as in Book of Proof Section 2.5.',
  params: (rng) => ({ i: int(rng, 0, FORMULAS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FORMULAS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    return {
      prompt: t`Fill in the [[truth-table|truth table]] of ${fm(f)}: write T or F in each empty cell.`,
      answer: fillTable(vs, [f]),
      solution: [
        t`An [[implication|implication]] is false in one case only: its left side true and its right side false. In every other row it is true.`,
        ...rowsOf(vs).map((env) => t`${math`${vs.map((v) => `${v} = \\mathrm{${TF(env[v] === true)}}`).join(',\\ ')}`}: ${fm(f)} is ${evalF(f, env) ? 'true' : 'false'}.`),
      ],
    };
  },
  solve: ({ i }) => {
    // A second evaluation, through the formula grader's parser and evaluator.
    const f = FORMULAS[i] as F;
    const g = formulaOf(ascii(f), ['P', 'Q', 'R']);
    return assignments(varsOf(f)).map((env) => TF(evalFormula(g, env)));
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FORMULAS[i] as F;
    const col = (reading: Reading): string[] => rowsOf(varsOf(f)).map((env) => TF(evalF(f, env, reading)));
    return [
      { response: col('and'), why: t`Some rows with a false left side were marked false. An implication only promises something when its left side is true: with the left side false, it is true whatever the right side is.` },
      { response: col('converse'), why: t`The arrow was read backwards. ${IMP} is false when ${mP} is true and ${mQ} is false, not the other way round; ${math`Q \Rightarrow P`} is its [[converse|converse]], a different statement.` },
      { response: col('iff'), why: t`The arrow was read as "if and only if". ${IMP} is true when ${mP} is false and ${mQ} is true.` },
      { response: rowsOf(varsOf(f)).map((env) => TF(!evalF(f, env))), why: t`Every row is flipped: those are the values of its negation.` },
    ];
  },
});

/** One side of a statement known to be false: a conjunction of literals (forced true) or a disjunction (forced false). */
type Lit = { v: V; neg: boolean };
interface FalseP { left: Lit[]; right: Lit[] }

const litF = (l: Lit): F => (l.neg ? not(Vr(l.v)) : Vr(l.v));
const conj = (ls: readonly Lit[]): F => ls.slice(1).reduce<F>((acc, l) => and(acc, litF(l)), litF(ls[0] as Lit));
const disj = (ls: readonly Lit[]): F => ls.slice(1).reduce<F>((acc, l) => or(acc, litF(l)), litF(ls[0] as Lit));
const falseFormula = ({ left, right }: FalseP): F => imp(conj(left), disj(right));

const findValues = generator<FalseP>({
  id: 'find-values',
  skill: 'Find the truth values that make an implication false, as in Book of Proof Section 2.5, exercise 10.',
  params: (rng) => {
    const n = int(rng, 3, 4);
    const vs = sample(rng, ['P', 'Q', 'R', 'S'] as const, n).sort() as V[];
    const k = int(rng, 1, n - 1);
    const lit = (v: V): Lit => ({ v, neg: rng() < 0.35 });
    return { left: vs.slice(0, k).map(lit), right: vs.slice(k).map(lit) };
  },
  sane: ({ left, right }) => (left.length >= 1 && right.length >= 1 && left.length + right.length <= 4 ? null : 'out of range'),
  problem: (p) => {
    const f = falseFormula(p);
    const vs = varsOf(f);
    const value = (l: Lit, sideTrue: boolean): boolean => (l.neg ? !sideTrue : sideTrue);
    const env: Record<string, boolean> = {};
    for (const l of p.left) env[l.v] = value(l, true);
    for (const l of p.right) env[l.v] = value(l, false);
    return {
      prompt: t`Suppose the statement ${fm(f)} is false. Find the truth values of ${math`${vs.join(', ')}`}. (This can be done without a truth table.)`,
      answer: { kind: 'table', columns: [t`letter`, t`truth value`], rows: vs.map((v) => [[math`${v}`], null]), expected: vs.map((v) => TF(env[v] === true)), cell: 'truth' },
      solution: [
        t`An implication is false only when its left side is true and its right side is false.`,
        t`The left side ${fm(conj(p.left))} is ${p.left.length === 1 ? 'a single letter or its negation' : t`an "and"`}: for it to be true, ${p.left.length === 1 ? 'it' : 'every part'} must be true.`,
        t`The right side ${fm(disj(p.right))} is ${p.right.length === 1 ? 'a single letter or its negation' : t`an "or"`}: for it to be false, ${p.right.length === 1 ? 'it' : 'every part'} must be false.`,
        t`So ${math`${vs.map((v) => `${v} = \\mathrm{${TF(env[v] === true)}}`).join(',\\ ')}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Brute force: the rows of the truth table where the statement is false; there is exactly one.
    const f = falseFormula(p);
    const vs = varsOf(f);
    const g = formulaOf(ascii(f), ['P', 'Q', 'R', 'S']);
    const rows = assignments(vs).filter((env) => !evalFormula(g, env));
    return rows.length === 1 ? vs.map((v) => TF((rows[0] as Env)[v] === true)) : ['none'];
  },
  misconceptions: (p): Misconception[] => {
    const f = falseFormula(p);
    const vs = varsOf(f);
    const pick2 = (leftTrue: boolean, rightTrue: boolean): string[] => vs.map((v) => {
      const l = [...p.left, ...p.right].find((x) => x.v === v) as Lit;
      const sideTrue = p.left.includes(l) ? leftTrue : rightTrue;
      return TF(l.neg ? !sideTrue : sideTrue);
    });
    return [
      { response: pick2(false, true), why: t`That makes the left side false and the right side true, so the implication is true. It is false only with the left side true and the right side false.` },
      { response: pick2(false, false), why: t`With the left side false the implication is true, whatever the right side is. Make the left side true.` },
      { response: pick2(true, true), why: t`With both sides true the implication holds. Make the right side false.` },
    ];
  },
});

/** A true implication about a whole number n whose converse is false, with its parts in three grammatical forms. */
interface Fact { p: Rich; q: Rich; notP: Rich; notQ: Rich; pTo: Rich; qTo: Rich; holdsP: (n: number) => boolean; holdsQ: (n: number) => boolean }
const mn = math`n`;
const divFact = (a: number, b: number): Fact => ({
  p: t`${mn} is divisible by ${a}`, q: t`${mn} is divisible by ${b}`,
  notP: t`${mn} is not divisible by ${a}`, notQ: t`${mn} is not divisible by ${b}`,
  pTo: t`${mn} to be divisible by ${a}`, qTo: t`${mn} to be divisible by ${b}`,
  holdsP: (n) => n % a === 0, holdsQ: (n) => n % b === 0,
});
const FACTS: readonly Fact[] = [
  divFact(6, 3), divFact(8, 4), divFact(10, 5), divFact(12, 4), divFact(9, 3),
  {
    p: t`${mn} is a multiple of ${4}`, q: t`${mn} is even`, notP: t`${mn} is not a multiple of ${4}`, notQ: t`${mn} is odd`,
    pTo: t`${mn} to be a multiple of ${4}`, qTo: t`${mn} to be even`, holdsP: (n) => n % 4 === 0, holdsQ: (n) => n % 2 === 0,
  },
  {
    p: t`${math`n > ${5}`}`, q: t`${math`n > ${2}`}`, notP: t`${math`n \le ${5}`}`, notQ: t`${math`n \le ${2}`}`,
    pTo: t`${mn} to be greater than ${5}`, qTo: t`${mn} to be greater than ${2}`, holdsP: (n) => n > 5, holdsQ: (n) => n > 2,
  },
];

type Phrase = 'if' | 'only-if' | 'whenever' | 'sufficient' | 'necessary' | 'provided';
const PHRASES: readonly Phrase[] = ['if', 'only-if', 'whenever', 'sufficient', 'necessary', 'provided'];
const sentence = (f: Fact, ph: Phrase): Rich => {
  switch (ph) {
    case 'if': return t`${f.q} if ${f.p}.`;
    case 'only-if': return t`${f.p} only if ${f.q}.`;
    case 'whenever': return t`${f.q} whenever ${f.p}.`;
    case 'sufficient': return t`For ${f.qTo}, it is sufficient that ${f.p}.`;
    case 'necessary': return t`For ${f.pTo}, it is necessary that ${f.q}.`;
    case 'provided': return t`${f.q}, provided that ${f.p}.`;
  }
};
const WHY: Readonly<Record<Phrase, Rich>> = {
  if: t`"${mQ} if ${mP}" puts the condition after the "if": it says ${IMP}.`,
  'only-if': t`"${mP} only if ${mQ}" says ${mP} cannot be true without ${mQ}: if ${mP}, then ${mQ}. The "only" changes the direction.`,
  whenever: t`"${mQ} whenever ${mP}" says that each time ${mP} holds, ${mQ} does: ${IMP}.`,
  sufficient: t`A sufficient condition is enough on its own: ${mP} being true is enough for ${mQ}, so ${IMP}.`,
  necessary: t`A necessary condition must hold for the other to hold: ${mP} cannot be true unless ${mQ} is, so ${IMP}.`,
  provided: t`"${mQ}, provided that ${mP}" means ${mQ} holds on the condition ${mP}: ${IMP}.`,
};

interface RewriteP { k: number; ph: Phrase }

const rewrite = generator<RewriteP>({
  id: 'rewrite',
  skill: 'Rewrite a sentence as "If P, then Q", as in Book of Proof Section 2.3.',
  params: (rng) => ({ k: int(rng, 0, FACTS.length - 1), ph: pick(rng, PHRASES) }),
  sane: ({ k }) => (k >= 0 && k < FACTS.length ? null : 'out of range'),
  problem: ({ k, ph }) => {
    const f = FACTS[k] as Fact;
    const options: ChoiceOption[] = [
      { id: 'right', label: t`If ${f.p}, then ${f.q}.` },
      { id: 'converse', label: t`If ${f.q}, then ${f.p}.` },
      { id: 'inverse', label: t`If ${f.notP}, then ${f.notQ}.` },
    ];
    return {
      prompt: t`${mn} is a whole number. Which sentence has the same meaning as "${sentence(f, ph)}"`,
      answer: { kind: 'choice', options, correct: 'right' },
      solution: [WHY[ph], t`So it is "If ${f.p}, then ${f.q}." Check with numbers: the other two fail for ${mn} equal to ${firstConverseFailure(f)}.`],
    };
  },
  solve: ({ k }) => {
    // Brute force on 1 to 200: the one option that holds for every n.
    const f = FACTS[k] as Fact;
    const ns = upTo(200);
    const holds: Record<string, boolean> = {
      right: ns.every((n) => !f.holdsP(n) || f.holdsQ(n)),
      converse: ns.every((n) => !f.holdsQ(n) || f.holdsP(n)),
      inverse: ns.every((n) => f.holdsP(n) || !f.holdsQ(n)),
    };
    const ok = Object.keys(holds).filter((x) => holds[x]);
    return ok.length === 1 ? ok : ['none'];
  },
  misconceptions: ({ ph }): Misconception[] => [
    { response: ['converse'], why: t`That is the [[converse|converse]]: the parts are swapped. ${WHY[ph]}` },
    { response: ['inverse'], why: t`Negating both parts gives a statement equivalent to the converse, not to the original. ${WHY[ph]}` },
  ],
});

const firstConverseFailure = (f: Fact): number => upTo(200).find((n) => f.holdsQ(n) && !f.holdsP(n)) as number;

// ---------------------------------------------------------------- Cambridge problems

function bopTable(n: number, f: F, helpers: readonly F[], steps: Rich[], official?: readonly string[]): AutoProblem {
  const at = `Section 2.5, exercise ${n}`;
  const vs = varsOf(f);
  const answer = fillTable(vs, [...helpers, f]);
  const second = (): string[] => {
    const gs = [...helpers, f].map((h) => formulaOf(ascii(h), ['P', 'Q', 'R']));
    return assignments(vs).flatMap((env) => gs.map((g) => TF(evalFormula(g, env))));
  };
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-5-${n}`,
    source: cite('bop', at),
    title: t`A truth table with an implication`,
    prompt: t`Write a truth table for ${fm(f)}${helpers.length > 0 ? t`, with a column for ${helpers.length === 1 ? fm(helpers[0] as F) : t`each part`} first` : t``}.`,
    answer,
    solution: steps,
    reference: second(),
    verify: () => same(`Book of Proof ${at}, two evaluators`, answer.expected.join(''), second().join('')),
  };
  if (official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: official, agrees: true };
  return auto(spec);
}

const bop25_1 = bopTable(1, or(P, imp(Q, R)), [imp(Q, R)], [
  t`${math`Q \Rightarrow R`} is false only when ${math`Q`} is true and ${math`R`} is false: rows ${2} and ${6}.`,
  t`${math`P \lor (Q \Rightarrow R)`} is then false only where both parts are false: row ${6}, where ${mP} is false, ${mQ} true, and ${math`R`} false.`,
], ['T', 'T', 'F', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'F', 'F', 'T', 'T', 'T', 'T']);

const bop25_3 = bopTable(3, not(imp(P, Q)), [imp(P, Q)], [
  t`${IMP} is false only in row ${2}, where ${mP} is true and ${mQ} is false.`,
  t`Its negation is true only in that row: ${math`\lnot (P \Rightarrow Q)`} says "${mP} and not ${mQ}".`,
], ['T', 'F', 'F', 'T', 'T', 'F', 'T', 'F']);

const bop25_7 = bopTable(7, imp(and(P, not(P)), Q), [and(P, not(P))], [
  t`${math`P \land \lnot P`} is false in every row: a statement and its negation are never both true.`,
  t`So the implication has a false left side in every row, and is true in every row. A false statement implies anything.`,
], ['F', 'T', 'F', 'T', 'F', 'T', 'F', 'T']);

/** Truth values of named letters as a table answer. */
function valuesProblem(o: { n: number; f: F; given: Record<string, boolean>; truth: boolean; ask: readonly V[]; steps: Rich[]; derived: readonly string[]; official?: readonly string[] }): AutoProblem {
  const at = `Section 2.5, exercise ${o.n}`;
  const vs = varsOf(o.f);
  // Brute force: the rows consistent with what is given, and the values they share.
  const solve = (): string[] => {
    const g = formulaOf(ascii(o.f), ['P', 'Q', 'R', 'S']);
    const rows = assignments(vs).filter((env) => evalFormula(g, env) === o.truth && Object.entries(o.given).every(([k, v]) => env[k] === v));
    return o.ask.map((v) => {
      const vals = new Set(rows.map((r) => r[v]));
      return vals.size === 1 ? TF([...vals][0] === true) : '?';
    });
  };
  const values = solve();
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-5-${o.n}`,
    source: cite('bop', at),
    title: t`Truth values from a ${o.truth ? 'true' : 'false'} statement`,
    prompt: Object.keys(o.given).length === 0
      ? t`Suppose the statement ${fm(o.f)} is false. Find the truth values of ${math`${o.ask.join(', ')}`}. (This can be done without a truth table.)`
      : t`Suppose ${mP} is false and that the statement ${fm(o.f)} is true. Find the truth values of ${math`${o.ask.join(', ')}`}. (This can be done without a truth table.)`,
    answer: { kind: 'table', columns: [t`letter`, t`truth value`], rows: o.ask.map((v) => [[math`${v}`], null]), expected: values, cell: 'truth' },
    solution: o.steps,
    reference: values,
    // Brute force over the truth table against the values derived by hand in the steps.
    verify: () => (values.includes('?') ? `Book of Proof ${at}: the values are not determined` : same(`Book of Proof ${at}`, values.join(''), o.derived.join(''))),
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official, agrees: true };
  return auto(spec);
}

const S = Vr('S');
const bop25_10 = valuesProblem({
  n: 10, f: imp(or(and(P, Q), R), or(R, S)), given: {}, truth: false, ask: ['P', 'Q', 'R', 'S'], derived: ['T', 'T', 'F', 'F'],
  steps: [
    t`The implication is false, so its left side ${math`(P \land Q) \lor R`} is true and its right side ${math`R \lor S`} is false.`,
    t`${math`R \lor S`} false means ${math`R`} and ${math`S`} are both false.`,
    t`Then ${math`(P \land Q) \lor R`} true with ${math`R`} false means ${math`P \land Q`} is true: ${mP} and ${mQ} are both true.`,
  ],
});
const bop25_11 = valuesProblem({
  n: 11, f: { op: 'iff', a: imp(Vr('R'), S), b: and(P, Q) }, given: { P: false }, truth: true, ask: ['R', 'S'], derived: ['T', 'F'],
  steps: [
    t`${math`\Leftrightarrow`} (if and only if) is true when both sides have the same truth value.`,
    t`${mP} is false, so ${math`P \land Q`} is false. For the "if and only if" to be true, ${math`R \Rightarrow S`} must be false too.`,
    t`The only way for ${math`R \Rightarrow S`} to be false is ${math`R`} true and ${math`S`} false.`,
  ],
  official: ['T', 'F'],
});

/** A Book of Proof Section 2.3 sentence: the "If P, then Q" form, its converse, and its inverse. */
type Kind = 'necessary' | 'only-if' | 'whenever' | 'provided';
/** Which clause is the hypothesis, read from the sentence's construction alone. */
const hypothesisIsFirst = (k: Kind): boolean => k === 'necessary' || k === 'only-if';

function bop23(o: { n: number; kind: Kind; text: Rich; first: [Rich, Rich]; second: [Rich, Rich]; right: Rich; official: boolean; check?: () => boolean }): AutoProblem {
  const at = `Section 2.3, exercise ${o.n}`;
  // first and second: the two clauses as they appear, each as [positive, negative].
  const [hyp, concl] = hypothesisIsFirst(o.kind) ? [o.first, o.second] : [o.second, o.first];
  const options: ChoiceOption[] = [
    { id: 'right', label: t`If ${hyp[0]}, then ${concl[0]}.` },
    { id: 'converse', label: t`If ${concl[0]}, then ${hyp[0]}.` },
    { id: 'inverse', label: t`If ${hyp[1]}, then ${concl[1]}.` },
  ];
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-3-${o.n}`,
    source: cite('bop', at, true),
    title: t`In the form "If ${mP}, then ${mQ}"`,
    prompt: t`Without changing its meaning, which sentence of the form "If ${mP}, then ${mQ}" says the same as: "${o.text}"`,
    answer: { kind: 'choice', options, correct: 'right' },
    solution: [o.right],
    reference: 'right',
    // The construction decides the hypothesis; with numbers, check the implication holds and its converse does not.
    verify: () => (o.check === undefined || o.check() ? null : `Book of Proof ${at}: the numbers disagree`),
    misconceptions: [
      { response: 'converse', why: t`That is the converse, with the parts swapped. ${o.right}` },
      { response: 'inverse', why: t`Negating both parts gives a statement equivalent to the converse. ${o.right}` },
    ],
  };
  if (o.official) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: 'right', agrees: true };
  return auto(spec);
}

const bop23_3 = bop23({
  n: 3, kind: 'necessary', official: true,
  text: t`For a function to be continuous, it is necessary that it is integrable.`,
  first: [t`a function is continuous`, t`a function is not continuous`], second: [t`it is integrable`, t`it is not integrable`],
  right: t`A necessary condition is one the other cannot hold without: a continuous function must be integrable. So: if a function is continuous, then it is integrable.`,
});
const bop23_5 = bop23({
  n: 5, kind: 'only-if', official: true,
  text: t`An integer is divisible by ${8} only if it is divisible by ${4}.`,
  first: [t`an integer is divisible by ${8}`, t`an integer is not divisible by ${8}`], second: [t`it is divisible by ${4}`, t`it is not divisible by ${4}`],
  right: t`"${mP} only if ${mQ}" means ${IMP}: an integer cannot be divisible by ${8} without being divisible by ${4}.`,
  check: () => upTo(400).every((n) => n % 8 !== 0 || n % 4 === 0) && upTo(400).some((n) => n % 4 === 0 && n % 8 !== 0),
});
const bop23_7 = bop23({
  n: 7, kind: 'whenever', official: true,
  text: t`A series converges whenever it converges absolutely.`,
  first: [t`a series converges`, t`a series does not converge`], second: [t`it converges absolutely`, t`it does not converge absolutely`],
  right: t`"${mQ} whenever ${mP}" means ${IMP}. The condition is converging absolutely: if a series converges absolutely, then it converges.`,
});
const bop23_11 = bop23({
  n: 11, kind: 'only-if', official: true,
  text: t`You fail only if you stop writing. (Ray Bradbury)`,
  first: [t`you fail`, t`you do not fail`], second: [t`you have stopped writing`, t`you have not stopped writing`],
  right: t`"${mP} only if ${mQ}": you cannot fail without having stopped writing. So: if you fail, then you have stopped writing.`,
});

/** TMUA Exercise E, question 4, as a table: the truth of if A then (A or B), and if A then (A and B). */
const tmuaE4 = (() => {
  const cols = [imp(P, or(P, Q)), imp(P, and(P, Q))];
  const answer = fillTable(['P', 'Q'], cols);
  const second = (): string[] => {
    const gs = cols.map((h) => formulaOf(ascii(h), ['P', 'Q']));
    return assignments(['P', 'Q']).flatMap((env) => gs.map((g) => TF(evalFormula(g, env))));
  };
  return auto({
    id: 'tmua-e-4',
    source: cite('tmua-logic-proof', 'Exercise E, question 4', true),
    title: t`If ${mP} then (${mP} or ${mQ})`,
    prompt: t`What can you say about the truth of "if ${mP} then (${mP} or ${mQ})" and "if ${mP} then (${mP} and ${mQ})"? Fill in both columns. (TMUA writes A and B; the course writes ${mP} and ${mQ}.)`,
    answer,
    solution: [
      t`When ${mP} is true, ${math`P \lor Q`} is true too, so the first implication never has a true left side and a false right side: it is true in every row, whatever ${mP} and ${mQ} are.`,
      t`The second fails in one row: ${mP} true and ${mQ} false, where ${math`P \land Q`} is false. It says the same as ${IMP}.`,
    ],
    reference: second(),
    verify: () => same('TMUA E4, two evaluators', answer.expected.join(''), second().join('')),
  });
})();

/** The TMUA examples of page 29, each a statement with its truth value checked by code. */
const tmua29 = auto({
  id: 'tmua-p29',
  source: cite('tmua-logic-proof', 'Combining statements, if A then B, page 29', true),
  title: t`True or false implications`,
  prompt: t`Write T or F: is each statement true or false?`,
  answer: {
    kind: 'table', cell: 'truth', columns: [t`statement`, t`true or false`],
    rows: [
      [t`if ${math`x = ${4}`}, then ${math`x^{${2}} = ${8}`}`, null],
      [t`if ${math`${0} = ${1}`}, then ${math`${2} + ${2} = ${5}`}`, null],
      [t`if ${math`a`} and ${math`b`} are odd integers, then ${math`a + b`} is an even integer`, null],
    ],
    expected: ['F', 'T', 'T'],
  },
  solution: [
    t`The first is false: when ${math`x = ${4}`} is true, ${math`x^{${2}} = ${4 * 4}`}, so ${math`x^{${2}} = ${8}`} is false. A true left side with a false right side.`,
    t`The second is true, because ${math`${0} = ${1}`} is false: an implication with a false left side is true, even though ${math`${2} + ${2} = ${5}`} is false too.`,
    t`The third is true: whenever ${math`a`} and ${math`b`} are odd, ${math`a + b`} is even.`,
  ],
  reference: ['F', 'T', 'T'],
  verify: () => {
    const implies = (p: boolean, q: boolean): boolean => !p || q;
    const first = [-5, -4, 0, 4, 5].every((x) => implies(x === 4, x * x === 8));
    const lhs: number = 0;
    const rhs: number = 1;
    const second = implies(lhs === rhs, 2 + 2 === 5);
    const odds = [-7, -3, -1, 1, 3, 9];
    const third = odds.every((a) => odds.every((b) => Math.abs(a + b) % 2 === 0));
    return same('TMUA page 29', [first, second, third].map(TF).join(''), 'FTT');
  },
  misconceptions: [{ response: ['F', 'F', 'T'], why: t`An implication with a false left side is true: "if ${math`${0} = ${1}`}" promises nothing, so it cannot be broken.` }],
});

const prop8: Parameters<typeof workedProof>[0] = {
  title: t`Odd times odd is odd`,
  prompt: t`Proposition ${8} of the CST notes: if ${math`m`} and ${math`n`} are odd integers, then so is ${math`m \cdot n`}.`,
  steps: [
    t`Assume ${math`m`} and ${math`n`} are odd integers. That is the left side of the implication, now added to the assumptions.`,
    t`By definition, ${math`m = ${2}i + ${1}`} for some integer ${math`i`}, and ${math`n = ${2}j + ${1}`} for some integer ${math`j`}.`,
    t`Then ${math`m \cdot n = (${2}i + ${1})(${2}j + ${1}) = ${2}(${2}ij + i + j) + ${1}`}, so ${math`m \cdot n = ${2}k + ${1}`} for the integer ${math`k = ${2}ij + i + j`}.`,
    t`So ${math`m \cdot n`} is odd, which was to be shown.`,
  ],
  answer: t`${math`m \cdot n`} is odd.`,
  source: cite('cst-dm-notes', 'printed pages 47 and 48, Proposition 8'),
};

const prop10 = supervision({
  id: 'notes-50-prop10',
  source: cite('cst-dm-notes', 'printed page 50, Proposition 10'),
  title: t`If ${math`\sqrt{x}`} is rational, so is ${math`x`}`,
  prompt: t`Let ${math`x`} be a positive real number. Prove that if ${math`\sqrt{x}`} is rational, then so is ${math`x`}. Say what you assume, and what you show.`,
  writeUp: 'proof',
  official: cite('cst-dm-notes', 'printed page 51, the notes\' proof'),
});
const thm11 = supervision({
  id: 'notes-54-thm11',
  source: cite('cst-dm-notes', 'printed pages 54 and 55, Theorem 11'),
  title: t`Implication is transitive`,
  prompt: t`Let ${math`P_{${1}}`}, ${math`P_{${2}}`}, and ${math`P_{${3}}`} be statements. Prove that if ${math`P_{${1}} \Rightarrow P_{${2}}`} and ${math`P_{${2}} \Rightarrow P_{${3}}`}, then ${math`P_{${1}} \Rightarrow P_{${3}}`}. Name each use of modus ponens.`,
  writeUp: 'proof',
  official: cite('cst-dm-notes', 'printed pages 54 and 55, the scratch work'),
});
const tmuaE1 = supervision({
  id: 'tmua-e-1-2',
  source: cite('tmua-logic-proof', 'Exercise E, questions 1 and 2', true),
  title: t`If ${mP} then ${mQ}, with and, or, not`,
  prompt: t`The truth table of "if ${mP} then ${mQ}" has three trues and one false. Write it using only and, or, and not, without the arrow, and justify that your statement has the same truth table.`,
  writeUp: 'explanation',
});
const tmuaJ = supervision({
  id: 'tmua-j-3-4',
  source: cite('tmua-logic-proof', 'Exercise J, questions 3 and 4'),
  title: t`Converses`,
  prompt: t`Write the converse of each statement, and say which converses are true: (a) if two triangles are congruent then they have the same area; (b) if two triangles are similar then they have the same internal angles; (c) if I am human then I am mortal; (d) if I am a bachelor then I am an unmarried man.`,
  writeUp: 'explanation',
});

// STEP Support Assignment 4, Q4(i): four cards, a number on one side and a letter on the other.
const CARDS = [
  { id: 'six', shown: 6 as number | string },
  { id: 'e', shown: 'E' as number | string },
  { id: 'q', shown: 'Q' as number | string },
  { id: 'seven', shown: 7 as number | string },
] as const;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
/** The claim on one card: if its number is even, its letter is a vowel. */
const claimHolds = (num: number, letter: string): boolean => num % 2 !== 0 || VOWELS.has(letter);
/** The cards whose hidden face could make the claim false: the ones that must be turned. */
const mustTurn = (): string[] => CARDS.filter((c) => {
  if (typeof c.shown === 'number') return ['E', 'Q'].some((letter) => !claimHolds(c.shown as number, letter));
  return [6, 7].some((num) => !claimHolds(num, c.shown as string));
}).map((c) => c.id);
const a4Cards = auto({
  id: 'a4-q4-i',
  source: cite('step-f04', 'Q4(i)'),
  title: t`Four cards and a claim`,
  prompt: t`I have ${4} double-sided cards in front of me. Each has a number on one side and a letter on the other. The faces that are up show ${6}, E, Q, and ${7}. I claim that if there is an even number on one side of a card, then there is a vowel on the other. Which cards do you need to turn over in order to check my claim? Choose all that you must turn over.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'six', label: t`The card showing ${6}` },
      { id: 'e', label: t`The card showing E` },
      { id: 'q', label: t`The card showing Q` },
      { id: 'seven', label: t`The card showing ${7}` },
    ],
    correct: ['six', 'q'],
  },
  solution: [
    t`For one card the claim is an implication ${math`P \Rightarrow V`}, where ${math`P`} is "this card has an even number" and ${math`V`} is "this card has a vowel". An implication is false only when ${math`P`} is true and ${math`V`} is false. So the claim fails exactly on a card with an even number and a consonant, and a card needs turning only if it could be such a card.`,
    t`The ${6}: its number is even, so ${math`P`} is true. A consonant on the back would break the claim: turn it. The Q: its letter is a consonant, so ${math`V`} is false. An even number on the back would break the claim: turn it.`,
    t`The E: its letter is a vowel, so ${math`V`} is true and the implication holds whatever the number. The ${7}: its number is odd, so ${math`P`} is false and the implication holds whatever the letter, as the umbrella promise does on a sunny day. Neither can break the claim. Turning the E would test the converse, "a vowel has an even number behind it", which was never claimed.`,
  ],
  reference: ['six', 'q'],
  verify: () => same('the cards whose hidden face could break the claim', mustTurn().join(), 'six,q'),
  misconceptions: [
    { response: ['six', 'e'], why: t`The E cannot break the claim: a vowel makes the conclusion true. Checking it tests the converse. The Q can break it, if an even number is on its back.` },
    { response: ['six'], why: t`The Q matters too: if its other side is an even number, the card has an even number and a consonant, and the claim is false.` },
    { response: ['six', 'e', 'q', 'seven'], why: t`An implication with a true conclusion (the E) or a false hypothesis (the ${7}) holds whatever is on the back. Only the ${6} and the Q could break the claim.` },
  ],
  official: { source: cite('step-f04-hints', 'Q4(i)'), answer: ['six', 'q'], agrees: true },
});

// ---------------------------------------------------------------- lesson

const two = rowsOf(['P', 'Q']);

export const implication: TopicContent = {
  topicId: 'logic.implication',
  goal: t`Read ${IMP} as "if ${mP} then ${mQ}", know it is false only when ${mP} is true and ${mQ} is false, and tell it apart from its converse.`,
  objective: t`Read ${IMP} exactly, prove one by assuming ${mP}, and tell it apart from its converse.`,
  why: t`Nearly every theorem is an implication; next come if and only if, quantifiers, and direct proof.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A promise` },
    { kind: 'hook', text: t`A friend says: "If it rains tomorrow, I'll bring you an umbrella." Tomorrow is sunny, and no umbrella arrives. Did your friend break the promise?` },
    { kind: 'narrative', text: t`Almost everyone says no. The promise was only about rainy days, and there wasn't one. Hold on to that instinct: it is the whole of this lesson, made precise.` },
    { kind: 'narrative', text: t`Most theorems have this shape: "if these assumptions hold, then this conclusion holds". The CST notes say the first job with any theorem is to identify exactly what is assumed and what is concluded. So we need a precise meaning for "if ... then".` },
    {
      kind: 'definition',
      name: t`Implication`,
      formal: t`Let ${mP} and ${mQ} be statements. The [[implication|implication]] ${IMP}, read "if ${mP} then ${mQ}" or "${mP} implies ${mQ}", is the statement that is false when ${mP} is true and ${mQ} is false, and true in the other three cases. ${mP} is its hypothesis and ${mQ} its conclusion.`,
      plain: t`a promise that is broken only when ${mP} happens and ${mQ} does not. "If ${math`n = ${4}`}, then ${math`n^{${2}} = ${16}`}" is true: whenever ${math`n = ${4}`}, the square really is ${16}.`,
    },
    {
      kind: 'table', caption: t`The [[truth-table|truth table]] of ${IMP}: one row for each way ${mP} and ${mQ} can be true (T) or false (F).`,
      head: [[mP], [mQ], [IMP]],
      rows: two.map((r) => [yn(r.P === true), yn(r.Q === true), yn(evalF(imp(P, Q), r))]),
    },
    {
      kind: 'p',
      text: t`Read the last two rows slowly. When ${mP} is false, ${IMP} is true, whatever ${mQ} is. So "if ${math`${0} = ${1}`}, then ${math`${2} + ${2} = ${5}`}" is a true statement, as the TMUA notes point out.`,
      why: { q: t`Why should a false hypothesis make the implication true?`, a: t`The implication is false in one situation only: ${mP} true and ${mQ} false. If ${mP} is false, that situation cannot occur, so there is nothing to make it false. In the umbrella story: no rain, so nothing was promised.` },
    },
    {
      kind: 'p',
      text: t`And "if ${math`x = ${4}`}, then ${math`x^{${2}} = ${8}`}" is false: take ${math`x = ${4}`}. The hypothesis is true, but ${math`x^{${2}} = ${4 * 4}`}, so the conclusion is false. One row of the table where T leads to F is enough to break it.`,
    },
    quickCheck({
      prompt: t`Is "if ${math`${2} + ${2} = ${5}`}, then the moon is made of cheese" true or false?`,
      answer: { kind: 'choice', options: [{ id: 'T', label: t`True` }, { id: 'F', label: t`False` }], correct: 'T' },
      reference: 'T',
      why: t`The hypothesis ${math`${2} + ${2} = ${5}`} is false, and an implication with a false hypothesis is true: the only false row needs a true hypothesis.`,
    }),
    { kind: 'section', title: t`Many ways to say it` },
    { kind: 'narrative', text: t`English has many ways to say ${IMP}. Each one below means exactly the same thing. Test each against "if ${mn} is a multiple of ${6}, then ${mn} is even".` },
    {
      kind: 'list', items: [
        t`"if ${mP}, then ${mQ}"; "${mQ} if ${mP}"; "${mQ} whenever ${mP}"; "${mQ}, provided that ${mP}"`,
        t`"${mP} only if ${mQ}": ${mP} cannot be true unless ${mQ} is. So "${mn} is a multiple of ${6} only if ${mn} is even".`,
        t`"${mP} is sufficient for ${mQ}": ${mP} on its own is enough to guarantee ${mQ}.`,
        t`"${mQ} is necessary for ${mP}": without ${mQ}, you cannot have ${mP}.`,
      ],
    },
    {
      kind: 'p',
      text: t`"Only if" is the one that trips people up. "${mP} only if ${mQ}" puts ${mP} first, and it is ${mP} that implies ${mQ}.`,
      why: { q: t`Why does "${mP} only if ${mQ}" mean ${IMP}, and not the other way round?`, a: t`It says the only way ${mP} can be true is with ${mQ} true. So whenever ${mP} is true, ${mQ} is true: that is ${IMP}. Example: "you pass only if you sit the exam" means if you pass, then you sat the exam. Sitting the exam does not promise a pass.` },
    },
    {
      kind: 'definition',
      name: t`Converse`,
      formal: t`The [[converse|converse]] of ${IMP} is ${math`Q \Rightarrow P`}.`,
      plain: t`swap the hypothesis and the conclusion. The converse of "if ${mn} is a multiple of ${6}, then ${mn} is even" is "if ${mn} is even, then ${mn} is a multiple of ${6}".`,
    },
    { kind: 'narrative', text: t`An implication and its converse are different statements, and one can be true while the other is false. The table makes this plain: ${IMP} is false only in the row ${mP} T, ${mQ} F, while ${math`Q \Rightarrow P`} is false only in the row ${mP} F, ${mQ} T.` },
    {
      kind: 'pitfall',
      claim: t`"If ${IMP} is true, then so is its converse ${math`Q \Rightarrow P`}."`,
      counterexample: t`"If ${mn} is a multiple of ${6}, then ${mn} is even" is true. Its converse fails at ${math`n = ${4}`}: ${4} is even, but ${4} is not a multiple of ${6}.`,
    },
    { kind: 'section', title: t`Proving and using an implication` },
    { kind: 'narrative', text: t`How do you prove ${IMP}? The table tells you. The only way it can fail is ${mP} true and ${mQ} false. So suppose ${mP} is true, and show that ${mQ} must then be true too. If you manage it, the bad row can never happen.` },
    {
      kind: 'rule',
      text: t`To prove ${IMP}: assume ${mP}, and deduce ${mQ}. To use ${IMP}: establish ${mP}, then conclude ${mQ}.`,
      why: { q: t`Isn't assuming ${mP} cheating? We don't know ${mP} is true.`, a: t`We are not claiming ${mP}. The CST notes put it this way: assuming ${mP} adds it to your list of hypotheses for the rest of the proof. If ${mP} turns out false, the implication is true anyway, by the table.` },
    },
    {
      kind: 'definition',
      name: t`Modus ponens`,
      formal: t`From ${mP} and ${IMP}, deduce ${mQ}. This rule of deduction is called [[modus-ponens|modus ponens]].`,
      plain: t`if the hypothesis holds and the implication holds, the conclusion holds. From "${12} is a multiple of ${6}" and "multiples of ${6} are even", deduce "${12} is even".`,
    },
    { kind: 'narrative', text: t`Here is a first proof built exactly this way. You will need one definition: an integer ${mn} is even if ${math`n = ${2}k`} for some integer ${math`k`}. For example, ${6} is even because ${math`${6} = ${2} \times ${3}`}.` },
    { kind: 'theorem', statement: t`For every integer ${mn}: if ${mn} is even, then ${math`n^{${2}}`} is even.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Assume the hypothesis`, text: t`Let ${mn} be an integer, and assume ${mn} is even.`, plain: t`This is the ${mP} of ${IMP}. We add it to what we know; the goal is ${mQ}: ${math`n^{${2}}`} is even.` },
        { label: t`Unpack the definition`, text: t`So ${math`n = ${2}k`} for some integer ${math`k`}.`, plain: t`"Even" means exactly this. If ${mn} were ${6}, ${math`k`} would be ${3}.` },
        { label: t`Square both sides`, text: t`Then`, eq: [math`n^{${2}} = (${2}k)^{${2}} = ${4}k^{${2}} = ${2}(${2}k^{${2}})`], plain: t`Squaring ${math`${2}k`} squares both factors: ${math`${2}^{${2}} = ${4}`} and ${math`k^{${2}}`}. Then write ${4} as ${2} times ${2} to pull out a factor ${2}.` },
        { label: t`Reach the conclusion`, text: t`${math`${2}k^{${2}}`} is an integer, so ${math`n^{${2}}`} is ${2} times an integer: ${math`n^{${2}}`} is even.`, plain: t`That is the definition of even again, read backwards. With ${math`n = ${6}`}: ${math`${36} = ${2} \times ${18}`}.`, why: { q: t`Why is ${math`${2}k^{${2}}`} an integer?`, a: t`${math`k`} is an integer, and products of integers are integers, so ${math`k^{${2}} = k \times k`} and then ${math`${2} \times k^{${2}}`} are integers.` } },
      ],
    },
    { kind: 'narrative', text: t`Long proofs are often a chain ${math`P \Rightarrow P_{${1}} \Rightarrow P_{${2}} \Rightarrow Q`}, each link one manageable step. The notes' Theorem ${11} says such chains are valid: implication is transitive. You prove it yourself in the Cambridge problems.` },
    { kind: 'p', text: t`Notation: Book of Proof writes ${math`\sim P`} for "not ${mP}", which the course writes ${math`\lnot P`}; the CST notes write ${math`\Longrightarrow`} for ${math`\Rightarrow`}. They mean the same.` },
    { kind: 'takeaway', text: t`${IMP} is false only when ${mP} is true and ${mQ} is false; prove it by assuming ${mP} and deducing ${mQ}, and never confuse it with its converse.` },
  ],
  examples: [
    { ...workedProof(prop8), examiner: t`The assumption stated first, the definition of odd written out with a named integer for each number, and the product shown in the form ${math`${2}k + ${1}`} with ${math`k`} an integer.` },
    workedCambridge(bop25_3),
    worked(rewrite, { k: 1, ph: 'only-if' }, t`"Only if" in the form "If ${mP}, then ${mQ}"`),
    worked(findValues, { left: [{ v: 'P', neg: false }, { v: 'Q', neg: false }], right: [{ v: 'R', neg: false }] }, t`When is ${math`(P \land Q) \Rightarrow R`} false?`),
  ],
  generators: [fillColumn, findValues, rewrite],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['implication', 'converse', 'modus-ponens'],
  cambridge: withUses([bop25_1, bop25_7, bop25_10, bop25_11, bop23_3, bop23_5, bop23_7, bop23_11, tmuaE4, tmua29, prop10, thm11, a4Cards, tmuaE1, tmuaJ], {
    'notes-50-prop10': { sections: ['Proving and using an implication'], note: t`Proving an implication about rational numbers`, needs: ['num.number-systems'] },
    'notes-54-thm11': { sections: ['Proving and using an implication'], note: t`Proving an implication by chaining modus ponens`, needs: ['proof.direct'] },
    'a4-q4-i': { sections: ['A promise', 'Many ways to say it'], note: t`Finding the only cases in which an implication can be false` },
  }),
  // The cards test when an implication is false. Theorem 11 is a written proof, which proof.direct teaches later
  // in the book, so it is practice (2026-10-08). Proposition 10 needs rational numbers, taught later, so it is practice.
  gate: ['a4-q4-i'],
  recall: [
    { front: t`When is ${IMP} false?`, back: t`Only when ${mP} is true and ${mQ} is false. In the other three cases it is true.` },
    { front: t`What is the converse of ${IMP}?`, back: t`${math`Q \Rightarrow P`}. It is a different statement: one can be true and the other false.` },
    { front: t`How do you prove ${IMP}?`, back: t`Assume ${mP}, and deduce ${mQ}.` },
    { front: t`State modus ponens.`, back: t`From ${mP} and ${IMP}, deduce ${mQ}.` },
    { front: t`What does "${mP} only if ${mQ}" mean?`, back: t`${IMP}: ${mP} cannot be true unless ${mQ} is.` },
  ],
  proofOrder: [
    {
      title: t`If ${mn} is even, then ${math`n^{${2}}`} is even`,
      steps: [
        t`Assume ${mn} is an even integer.`,
        t`Then ${math`n = ${2}k`} for some integer ${math`k`}.`,
        t`So ${math`n^{${2}} = ${4}k^{${2}} = ${2}(${2}k^{${2}})`}.`,
        t`${math`${2}k^{${2}}`} is an integer, so ${math`n^{${2}}`} is even.`,
      ],
    },
    {
      title: t`Odd times odd is odd`,
      steps: [
        t`Assume ${math`m`} and ${mn} are odd integers.`,
        t`Write ${math`m = ${2}i + ${1}`} and ${math`n = ${2}j + ${1}`} with ${math`i`}, ${math`j`} integers.`,
        t`Multiply out: ${math`mn = ${2}(${2}ij + i + j) + ${1}`}.`,
        t`${math`${2}ij + i + j`} is an integer, so ${math`mn`} is odd.`,
      ],
    },
  ],
};
