/**
 * logic.negating-quantifiers: Negating a quantified statement: "not for all" is "there
 * exists ... not", and "not there exists" is "for all ... not", applied quantifier by
 * quantifier. The lesson follows the TMUA notes on negating "for all" and "there exists"
 * (pages 61 to 63: S1, N1, S2, N2), Book of Proof Section 2.10 (Examples 2.12 to 2.15), and
 * the CST notes' equivalences for negation (printed page 134). The problems are Book of
 * Proof's exercises for Section 2.10, checked against the solutions to odd exercises, and
 * supervision exercise 1.1.5 with its 2023-24 official solution.
 */
import { auto, cite, same, supervision, type AutoProblem } from '../cambridge';
import { int, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, math, t, type Rich, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mx, my] = [math`x`, math`y`];
const [mS1, mN1] = [math`S_{${1}}`, math`N_{${1}}`];
const TF = (b: boolean): string => (b ? 'T' : 'F');

/** Four orders of four options, so the right one moves. */
const ORDERS: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];
function ordered(texts: readonly Rich[], order: number): ChoiceOption[] {
  const ids = ['right', 'keep-inside', 'keep-quantifiers', 'slip'];
  return (ORDERS[order] as readonly number[]).map((k) => ({ id: ids[k] as string, label: texts[k] as Rich }));
}

// ---------------------------------------------------------------- negating in symbols

type Q = 'A' | 'E';
/** A statement: its quantifiers (each with its variable and set, as LaTeX), its inside, the negated inside, and a wrong negation of the inside. */
interface QStmt { qs: readonly (readonly [Q, string])[]; body: string; neg: string; slip: string }
const Z = '\\mathbb{Z}';
const R = '\\mathbb{R}';
const N = '\\mathbb{N}';
const STMTS: readonly QStmt[] = [
  { qs: [['A', `x \\in ${Z}`], ['E', `y \\in ${Z}`]], body: 'y > x', neg: 'y \\le x', slip: 'y < x' },
  { qs: [['E', `x \\in ${Z}`], ['A', `y \\in ${Z}`]], body: 'x \\le y', neg: 'x > y', slip: 'x \\ge y' },
  { qs: [['A', `x \\in ${R}`], ['E', `y \\in ${R}`]], body: 'y^{3} = x', neg: 'y^{3} \\ne x', slip: 'y^{3} = -x' },
  { qs: [['A', `x \\in ${Z}`], ['E', `y \\in ${Z}`]], body: 'x + y = 0', neg: 'x + y \\ne 0', slip: 'x - y = 0' },
  { qs: [['E', `y \\in ${N}`], ['A', `x \\in ${N}`]], body: 'x \\mid y', neg: 'x \\nmid y', slip: 'y \\mid x' },
  { qs: [['A', `x \\in ${R}`], ['E', `y \\in ${R}`]], body: 'xy = 1', neg: 'xy \\ne 1', slip: 'xy = -1' },
  { qs: [['A', `x \\in ${Z}`]], body: 'x \\text{ odd} \\Rightarrow x^{2} \\text{ odd}', neg: 'x \\text{ odd} \\land x^{2} \\text{ even}', slip: 'x \\text{ odd} \\Rightarrow x^{2} \\text{ even}' },
  { qs: [['A', `x \\in ${R}`]], body: 'x > 2 \\Rightarrow x^{2} > 4', neg: 'x > 2 \\land x^{2} \\le 4', slip: 'x \\le 2 \\land x^{2} \\le 4' },
  { qs: [['E', `x \\in ${R}`]], body: 'x^{2} < 0', neg: 'x^{2} \\ge 0', slip: 'x^{2} > 0' },
  { qs: [['A', `x \\in ${R}`]], body: 'x^{2} > 6', neg: 'x^{2} \\le 6', slip: 'x^{2} < 6' },
  { qs: [['A', `x \\in ${Z}`], ['A', `y \\in ${Z}`]], body: 'x + y = y + x', neg: 'x + y \\ne y + x', slip: 'x + y = y - x' },
];
const flip = (q: Q): Q => (q === 'A' ? 'E' : 'A');
const qTex = (q: Q): string => (q === 'A' ? '\\forall' : '\\exists');
const stmtTex = (qs: readonly (readonly [Q, string])[], body: string): Span => computedTex(`${qs.map(([q, v]) => `${qTex(q)} ${v}`).join('\\ ')}.\\ ${body}`);
const flipped = (s: QStmt) => s.qs.map(([q, v]) => [flip(q), v] as const);

interface NegP { i: number; order: number }

const negateSymbols = generator<NegP>({
  id: 'negate-symbols',
  skill: 'Negate a quantified statement in symbols: swap every quantifier and negate what is inside.',
  params: (rng) => ({ i: int(rng, 0, STMTS.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < STMTS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const s = STMTS[i] as QStmt;
    const texts: Rich[] = [[stmtTex(flipped(s), s.neg)], [stmtTex(flipped(s), s.body)], [stmtTex(s.qs, s.neg)], [stmtTex(flipped(s), s.slip)]];
    return {
      prompt: t`Which statement is the negation of ${stmtTex(s.qs, s.body)}?`,
      answer: { kind: 'choice', options: ordered(texts, order), correct: 'right' },
      solution: [
        t`Move the "not" in from the front, one quantifier at a time: ${math`\lnot \forall`} becomes ${math`\exists \lnot`}, and ${math`\lnot \exists`} becomes ${math`\forall \lnot`}.`,
        t`So every quantifier swaps, and the "not" lands on the inside: ${math`\lnot (${computedTex(s.body)})`} is ${computedTex(s.neg)}.`,
        t`The negation is ${stmtTex(flipped(s), s.neg)}.`,
      ],
    };
  },
  solve: ({ i }) => {
    // Rebuild the negation by pushing the "not" through each quantifier in turn, and find it among the options.
    const s = STMTS[i] as QStmt;
    let qs: (readonly [Q, string])[] = [];
    for (const [q, v] of s.qs) qs = [...qs, [flip(q), v]];
    const want = stmtTex(qs, s.neg).text;
    const texts = [stmtTex(flipped(s), s.neg), stmtTex(flipped(s), s.body), stmtTex(s.qs, s.neg), stmtTex(flipped(s), s.slip)].map((x) => x.text);
    return [['right', 'keep-inside', 'keep-quantifiers', 'slip'][texts.indexOf(want)] ?? '?'];
  },
  misconceptions: ({ i }): Misconception[] => {
    const s = STMTS[i] as QStmt;
    return [
      { response: ['keep-inside'], why: t`The quantifiers are swapped, but the inside is not negated. "Not for all" is "there exists one for which it fails".` },
      { response: ['keep-quantifiers'], why: t`The inside is negated, but the quantifiers must swap too: the negation of ${math`\forall x.\ P(x)`} is ${math`\exists x.\ \lnot P(x)`}, not ${math`\forall x.\ \lnot P(x)`}.` },
      { response: ['slip'], why: t`The quantifiers are right, but ${computedTex(s.slip)} is not the negation of ${computedTex(s.body)}: the negation must be true exactly when it is false. Here that is ${computedTex(s.neg)}.` },
    ];
  },
});

// ---------------------------------------------------------------- a statement or its negation

const RELS: readonly { tex: string; neg: string; holds: (x: number, y: number) => boolean }[] = [
  { tex: 'x \\le y', neg: 'x > y', holds: (x, y) => x <= y },
  { tex: 'x < y', neg: 'x \\ge y', holds: (x, y) => x < y },
  { tex: 'x \\mid y', neg: 'x \\nmid y', holds: (x, y) => y % x === 0 },
  { tex: 'y \\mid x', neg: 'y \\nmid x', holds: (x, y) => x % y === 0 },
  { tex: 'x + y \\text{ is even}', neg: 'x + y \\text{ is odd}', holds: (x, y) => (x + y) % 2 === 0 },
  { tex: 'x \\ne y', neg: 'x = y', holds: (x, y) => x !== y },
  { tex: 'xy \\text{ is even}', neg: 'xy \\text{ is odd}', holds: (x, y) => (x * y) % 2 === 0 },
];

interface WhichP { m: number; r: number; ae: boolean }

const whichTrue = generator<WhichP>({
  id: 'statement-or-negation',
  skill: 'On a small set, decide whether a statement or its negation is true: exactly one of them is.',
  params: (rng) => ({ m: int(rng, 3, 6), r: int(rng, 0, RELS.length - 1), ae: rng() < 0.5 }),
  sane: ({ m, r }) => (m >= 3 && m <= 6 && r >= 0 && r < RELS.length ? null : 'out of range'),
  problem: ({ m, r, ae }) => {
    const rel = RELS[r] as (typeof RELS)[number];
    const S = upTo(m);
    const set = `S`;
    const qs: [Q, string][] = ae ? [['A', `x \\in ${set}`], ['E', `y \\in ${set}`]] : [['E', `y \\in ${set}`], ['A', `x \\in ${set}`]];
    const truth = ae ? S.every((x) => S.some((y) => rel.holds(x, y))) : S.some((y) => S.every((x) => rel.holds(x, y)));
    const stmt = stmtTex(qs, rel.tex);
    const neg = stmtTex(qs.map(([q, v]) => [flip(q), v] as const), rel.neg);
    const failX = S.find((x) => !S.some((y) => rel.holds(x, y)));
    const goodY = S.find((y) => S.every((x) => rel.holds(x, y)));
    return {
      prompt: t`Let ${math`S = \{${1}, \ldots, ${m}\}`}. Write T or F for the statement ${stmt} and for its negation ${neg}.`,
      answer: { kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`], rows: [[t`the statement`, null], [t`its negation`, null]], expected: [TF(truth), TF(!truth)] },
      solution: [
        ae
          ? (truth ? t`For each ${mx} in ${math`S`} some ${my} works, so the statement is true.` : t`At ${math`x = ${failX as number}`} no ${my} in ${math`S`} works, so the statement is false: that ${mx} is the witness for the negation.`)
          : (truth ? t`${math`y = ${goodY as number}`} works for every ${mx} in ${math`S`}, so the statement is true.` : t`No single ${my} works for every ${mx}, so the statement is false, and the negation is true: each ${my} fails for some ${mx}.`),
        t`A statement and its negation always have opposite truth values: exactly one of them is true.`,
      ],
    };
  },
  solve: ({ m, r, ae }) => {
    // Through a table of the relation.
    const rel = RELS[r] as (typeof RELS)[number];
    const tab = upTo(m).map((x) => upTo(m).map((y) => rel.holds(x, y)));
    const truth = ae ? tab.every((row) => row.some(Boolean)) : upTo(m).some((_, yi) => tab.every((row) => row[yi] === true));
    return [TF(truth), TF(!truth)];
  },
  misconceptions: ({ m, r, ae }): Misconception[] => {
    const rel = RELS[r] as (typeof RELS)[number];
    const S = upTo(m);
    const truth = ae ? S.every((x) => S.some((y) => rel.holds(x, y))) : S.some((y) => S.every((x) => rel.holds(x, y)));
    return [
      { response: ['T', 'T'], why: t`A statement and its negation cannot both be true: the negation is true exactly when the statement is false.` },
      { response: ['F', 'F'], why: t`A statement and its negation cannot both be false: one of them is true.` },
      { response: [TF(!truth), TF(truth)], why: truth ? t`Check the statement again: it holds for these values.` : t`Check the statement again: it fails here, so its negation is the true one.` },
    ];
  },
});

// ---------------------------------------------------------------- negating "every ... is ..." in words

interface WordsItem { stmt: string; right: string; all: string; some: string; hyp: string }
const WORDS: readonly WordsItem[] = [
  { stmt: 'Every prime number bigger than two is odd.', right: 'There is a prime number bigger than two that is even.', all: 'Every prime number bigger than two is even.', some: 'There is a prime number bigger than two that is odd.', hyp: 'There is a number that is not a prime bigger than two and is even.' },
  { stmt: 'Every square of an odd integer is odd.', right: 'There is an odd integer whose square is even.', all: 'The square of every odd integer is even.', some: 'There is an odd integer whose square is odd.', hyp: 'There is an even integer whose square is even.' },
  { stmt: 'Every student who revised passed the test.', right: 'Some student who revised did not pass the test.', all: 'No student who revised passed the test.', some: 'Some student who revised passed the test.', hyp: 'Some student who did not revise did not pass the test.' },
  { stmt: 'Every multiple of four is even.', right: 'Some multiple of four is odd.', all: 'Every multiple of four is odd.', some: 'Some multiple of four is even.', hyp: 'Some number that is not a multiple of four is odd.' },
  { stmt: 'Every train that left on time arrived on time.', right: 'Some train that left on time arrived late.', all: 'Every train that left on time arrived late.', some: 'Some train that left on time arrived on time.', hyp: 'Some train that left late arrived late.' },
  { stmt: 'Every triangle with three equal sides has three equal angles.', right: 'Some triangle with three equal sides does not have three equal angles.', all: 'No triangle with three equal sides has three equal angles.', some: 'Some triangle with three equal sides has three equal angles.', hyp: 'Some triangle without three equal sides does not have three equal angles.' },
  { stmt: 'Every function that is differentiable is continuous.', right: 'Some differentiable function is not continuous.', all: 'No differentiable function is continuous.', some: 'Some differentiable function is continuous.', hyp: 'Some function that is not differentiable is not continuous.' },
];

interface WordsP { i: number; order: number }

const negateWords = generator<WordsP>({
  id: 'negate-in-words',
  skill: 'Negate "every A is B" in words: "some A is not B", as Book of Proof Example 2.15 negates "if x is odd, then x squared is odd".',
  params: (rng) => ({ i: int(rng, 0, WORDS.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < WORDS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const w = WORDS[i] as WordsItem;
    return {
      prompt: t`Which sentence is the negation of "${w.stmt}"?`,
      answer: { kind: 'choice', options: ordered([t`${w.right}`, t`${w.all}`, t`${w.some}`, t`${w.hyp}`], order), correct: 'right' },
      solution: [
        t`"Every A is B" is ${math`\forall x.\ A(x) \Rightarrow B(x)`}. Its negation is ${math`\exists x.\ \lnot (A(x) \Rightarrow B(x))`}, and ${math`\lnot (P \Rightarrow Q)`} is ${math`P \land \lnot Q`}.`,
        t`So the negation is "some A is not B": ${w.right}`,
      ],
    };
  },
  solve: ({ i }) => {
    // Check each option on every model with three objects, each with A and B true or false: the right one is the negation in all 64.
    const models = upTo(64).map((k) => [0, 1, 2].map((j) => ({ a: ((k - 1) >> (2 * j)) % 2 === 1, b: ((k - 1) >> (2 * j + 1)) % 2 === 1 })));
    type M = (typeof models)[number];
    const stmt = (m: M): boolean => m.every((o) => !o.a || o.b);
    const opts: Record<string, (m: M) => boolean> = {
      right: (m) => m.some((o) => o.a && !o.b),
      'keep-inside': (m) => m.every((o) => !o.a || !o.b),
      'keep-quantifiers': (m) => m.some((o) => o.a && o.b),
      slip: (m) => m.some((o) => !o.a && !o.b),
    };
    void i;
    return Object.keys(opts).filter((id) => models.every((m) => opts[id]?.(m) === !stmt(m)));
  },
  misconceptions: (): Misconception[] => [
    { response: ['keep-inside'], why: t`That is far stronger than the negation: it says every one fails. To deny "every A is B", one A that is not B is enough.` },
    { response: ['keep-quantifiers'], why: t`That one is compatible with the original; it does not deny it. The negation needs an A that is not B.` },
    { response: ['slip'], why: t`The negation keeps the condition A: it is about an A that is not B. Things that are not A say nothing about "every A is B".` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

/** Every finite model of a statement and its options: the right option is the negation in each; each wrong one differs in some model. */
function modelCheck<M>(models: readonly M[], stmt: (m: M) => boolean, options: Readonly<Record<string, (m: M) => boolean>>): string | null {
  for (const [id, f] of Object.entries(options)) {
    const negation = models.every((m) => f(m) === !stmt(m));
    if (negation !== (id === 'right')) return `option ${id} ${negation ? 'is also' : 'is not'} the negation`;
  }
  return null;
}

function negChoice(o: { id: string; at: string; doc?: 'bop' | 'tmua-logic-proof' | 'cst-dm-sw1'; title: Rich; prompt: Rich; options: readonly [Rich, Rich, Rich, Rich]; steps: Rich[]; verify: () => string | null; official?: { doc: 'bop' | 'tmua-logic-proof' | 'cst-dm-sols-2324-1'; at: string }; why: readonly [Rich, Rich, Rich] }): AutoProblem {
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite(o.doc ?? 'bop', o.at, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'choice', options: ordered(o.options, 0), correct: 'right' },
    solution: o.steps,
    reference: 'right',
    verify: o.verify,
    misconceptions: [
      { response: 'keep-inside', why: o.why[0] },
      { response: 'keep-quantifiers', why: o.why[1] },
      { response: 'slip', why: o.why[2] },
    ],
  };
  if (o.official !== undefined) spec.official = { source: cite(o.official.doc, o.official.at), answer: 'right', agrees: true };
  return auto(spec);
}

/** The primes up to n. */
const primesTo = (n: number): number[] => upTo(n).filter((p) => p > 1 && upTo(p - 1).every((d) => d === 1 || p % d !== 0));

const bop3 = negChoice({
  id: 'bop-2-10-3', at: 'Section 2.10, exercise 3',
  title: t`Another prime`,
  prompt: t`Negate: "For every prime number ${math`p`}, there is another prime number ${math`q`} with ${math`q > p`}."`,
  options: [
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q \le p`}.`,
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q > p`}.`,
    t`For every prime number ${math`p`}, there is another prime number ${math`q`} with ${math`q \le p`}.`,
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q < p`}.`,
  ],
  steps: [
    t`${math`\lnot \forall p\ \exists q.\ q > p`} is ${math`\exists p\ \forall q.\ q \le p`}: there is a largest prime. The original is true (Euclid), so this negation is false.`,
  ],
  verify: () => {
    // Finite sets of primes make the statement false, so also use every "greater than" relation on three
    // objects (64 of them): the right option is the negation in every model, and each wrong one differs in one.
    const objs = [0, 1, 2];
    const pairs = objs.flatMap((a) => objs.filter((b) => b !== a).map((b) => [a, b] as const));
    const models = upTo(64).map((k) => (q: number, p: number): boolean => ((k - 1) >> pairs.findIndex(([a, b]) => a === q && b === p)) % 2 === 1);
    const others = (p: number): number[] => objs.filter((q) => q !== p);
    return modelCheck(models, (gt) => objs.every((p) => others(p).some((q) => gt(q, p))), {
      right: (gt) => objs.some((p) => others(p).every((q) => !gt(q, p))),
      'keep-inside': (gt) => objs.some((p) => others(p).every((q) => gt(q, p))),
      'keep-quantifiers': (gt) => objs.every((p) => others(p).some((q) => !gt(q, p))),
      slip: (gt) => objs.some((p) => others(p).every((q) => gt(p, q))),
    }) ?? same('the primes up to 100, a finite model, have a largest', Math.max(...primesTo(100)), 97);
  },
  why: [
    t`The quantifiers are swapped but ${math`q > p`} is not negated.`,
    t`"For every ${math`p`}" must become "there is a ${math`p`}", and "there is a ${math`q`}" must become "for every ${math`q`}".`,
    t`The negation of ${math`q > p`} is ${math`q \le p`}, not ${math`q < p`}.`,
  ],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 3' },
});

const bop7 = negChoice({
  id: 'bop-2-10-7', at: 'Section 2.10, exercise 7',
  title: t`Anything with a face`,
  prompt: t`Negate: "I don't eat anything that has a face."`,
  options: [t`I will eat some things that have a face.`, t`I will eat anything that has a face.`, t`I don't eat some things that have a face.`, t`I will eat some things that do not have a face.`],
  steps: [
    t`The sentence is "for every thing ${mx}, if ${mx} has a face, then I don't eat ${mx}". Its negation: there is a thing with a face that I eat.`,
    t`Book of Proof's solution adds that "I will eat anything that has a face" is wrong, "both morally and mathematically": it is far stronger than the negation.`,
  ],
  verify: () => {
    // Every model with three things, each with or without a face and eaten or not.
    const models = upTo(64).map((k) => [0, 1, 2].map((j) => ({ face: ((k - 1) >> (2 * j)) % 2 === 1, eat: ((k - 1) >> (2 * j + 1)) % 2 === 1 })));
    return modelCheck(models, (m) => m.every((o) => !o.face || !o.eat), {
      right: (m) => m.some((o) => o.face && o.eat),
      'keep-inside': (m) => m.every((o) => !o.face || o.eat),
      'keep-quantifiers': (m) => m.some((o) => o.face && !o.eat),
      slip: (m) => m.some((o) => !o.face && o.eat),
    });
  },
  why: [t`That says I eat every thing with a face; denying the original needs only one.`, t`That does not deny the original: the original already says I eat none of them.`, t`Things without a face say nothing about the original.`],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 7' },
});

const bop11 = negChoice({
  id: 'bop-2-10-11', at: 'Section 2.10, exercise 11',
  title: t`Fooling people`,
  prompt: t`Negate: "You can fool all of the people all of the time."`,
  options: [t`There is a person that you can't fool all the time.`, t`You can't fool any of the people at any time.`, t`There is a person that you can fool all the time.`, t`You can fool all of the people some of the time.`],
  steps: [
    t`It is ${math`\forall x\ \forall y.\ \text{you can fool } x \text{ at time } y`}. Negating swaps both quantifiers: ${math`\exists x\ \exists y.\ \text{you cannot fool } x \text{ at time } y`}.`,
    t`In words: there is a person you can't fool all the time. (Lincoln said it better.)`,
  ],
  verify: () => {
    // Every model with two people and two times.
    const models = upTo(16).map((k) => [[(k - 1) & 1, ((k - 1) >> 1) & 1], [((k - 1) >> 2) & 1, ((k - 1) >> 3) & 1]].map((r) => r.map((v) => v === 1)));
    return modelCheck(models, (m) => m.every((r) => r.every(Boolean)), {
      right: (m) => m.some((r) => r.some((v) => !v)),
      'keep-inside': (m) => m.every((r) => r.every((v) => !v)),
      'keep-quantifiers': (m) => m.some((r) => r.every(Boolean)),
      slip: (m) => m.every((r) => r.some(Boolean)),
    });
  },
  why: [t`That says every person is never fooled, much stronger than the negation.`, t`That is consistent with the original. The negation needs a person who escapes being fooled at some time.`, t`That is another true-or-false statement about the same people, but it can hold together with the original.`],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 11' },
});

const S1 = 6;
const tmuaN1 = negChoice({
  id: 'tmua-n1', at: 'Negating "for all" and "there exists", page 61, S1 and N1', doc: 'tmua-logic-proof',
  title: t`Not every square is more than ${S1}`,
  prompt: t`${mS1} is "for all real ${mx}, ${math`x^{${2}} > ${S1}`}". Which is the simplest form of its negation, ${mN1}?`,
  options: [
    t`There exists a real ${mx} such that ${math`x^{${2}} \le ${S1}`}.`,
    t`There exists a real ${mx} such that ${math`x^{${2}} > ${S1}`}.`,
    t`For all real ${mx}, ${math`x^{${2}} \le ${S1}`}.`,
    t`There exists a real ${mx} such that ${math`x^{${2}} < ${S1}`}.`,
  ],
  steps: [
    t`${mN1} says it is not the case that ${math`x^{${2}} > ${S1}`} for all real ${mx}: so there is some ${mx} for which ${math`x^{${2}} > ${S1}`} is not the case, that is, ${math`x^{${2}} \le ${S1}`}.`,
    t`${mS1} is false (try ${math`x = ${2}`}), so ${mN1} is true.`,
  ],
  verify: () => {
    // On grids of reals, as finite models, including x^2 = 6 exactly (x = √6 is irrational, so use sets with and without that value).
    const grid = (lo: number, hi: number, step: number): number[] => upTo(Math.round((hi - lo) / step) + 1).map((k) => lo + (k - 1) * step);
    const models = [grid(-5, 5, 0.25), grid(3, 5, 0.5), [Math.sqrt(S1), 3], [Math.sqrt(S1)], [-4, 4], [0]];
    const sq = (x: number): number => Math.round(x * x * 1e9) / 1e9;
    return modelCheck(models, (m) => m.every((x) => sq(x) > S1), {
      right: (m) => m.some((x) => sq(x) <= S1),
      'keep-inside': (m) => m.some((x) => sq(x) > S1),
      'keep-quantifiers': (m) => m.every((x) => sq(x) <= S1),
      slip: (m) => m.some((x) => sq(x) < S1),
    });
  },
  why: [t`"There exists" is right, but the inequality must be negated too.`, t`"Not for all" is "there exists ... not", not "for all ... not".`, t`The negation of ${math`x^{${2}} > ${S1}`} is ${math`x^{${2}} \le ${S1}`}: it includes equality.`],
  official: { doc: 'tmua-logic-proof', at: 'page 62, N1newest' },
});

const sw115neg = negChoice({
  id: 'sw-1-1-5-negation', at: 'Exercises 1, 1.1.5', doc: 'cst-dm-sw1',
  title: t`The negation of a supervision exercise`,
  prompt: t`The supervision exercise says: for all integers ${mx} and ${my} there is an integer ${math`z`} such that ${math`x + z = y - z`}. Which statement is its negation?`,
  options: [
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \forall z \in \mathbb{Z}.\ x + z \ne y - z`],
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \forall z \in \mathbb{Z}.\ x + z = y - z`],
    [math`\forall x \in \mathbb{Z}\ \forall y \in \mathbb{Z}\ \exists z \in \mathbb{Z}.\ x + z \ne y - z`],
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \exists z \in \mathbb{Z}.\ x + z \ne y - z`],
  ],
  steps: [
    t`Push the "not" through the three quantifiers: ${math`\forall x\ \forall y\ \exists z`} becomes ${math`\exists x\ \exists y\ \forall z`}, and the equation becomes ${math`x + z \ne y - z`}.`,
    t`In words: there are integers ${mx} and ${my} for which there is no integer ${math`z`} with ${math`x + z = y - z`}. The official solution proves exactly this, with ${math`x = ${0}`} and ${math`y = ${1}`}.`,
  ],
  verify: () => {
    // Models: x and y from small ranges, z over a range wide enough to contain every solution.
    const zs = upTo(81).map((k) => k - 41);
    const models = [[0, 1], [-3, -2, -1, 0, 1, 2, 3], [0, 2, 4], [1, 3], [5], [-4, 6]];
    return modelCheck(models, (m) => m.every((x) => m.every((y) => zs.some((z) => x + z === y - z))), {
      right: (m) => m.some((x) => m.some((y) => zs.every((z) => x + z !== y - z))),
      'keep-inside': (m) => m.some((x) => m.some((y) => zs.every((z) => x + z === y - z))),
      'keep-quantifiers': (m) => m.every((x) => m.every((y) => zs.some((z) => x + z !== y - z))),
      slip: (m) => m.some((x) => m.some((y) => zs.some((z) => x + z !== y - z))),
    });
  },
  why: [t`The quantifiers are swapped, but the equation is not negated.`, t`"For all ${mx} and ${my}" must become "there are ${mx} and ${my}", and "there is ${math`z`}" must become "for every ${math`z`}".`, t`"There is an integer ${math`z`}" must become "for every integer ${math`z`}" too: every quantifier swaps.`],
  official: { doc: 'cst-dm-sols-2324-1', at: '1.1.5' },
});

const sw115 = auto({
  id: 'sw-1-1-5-witness',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.5'),
  title: t`No integer between them`,
  prompt: t`Prove or disprove: for all integers ${mx} and ${my} there is an integer ${math`z`} such that ${math`x + z = y - z`}. It is false: give integers ${mx} and ${my} for which no integer ${math`z`} works.`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: '0, 1',
    check: ([x, y]) => {
      if (x === undefined || y === undefined || x.den !== 1n || y.den !== 1n) return 'Give two integers x and y.';
      // x + z = y - z exactly when 2z = y - x: an integer z exists exactly when y - x is even.
      return (y.num - x.num) % 2n === 0n ? `With x = ${x.num} and y = ${y.num}, z = ${(y.num - x.num) / 2n} works: x + z = y - z.` : null;
    },
  },
  solution: [
    t`The negation is ${math`\exists x\ \exists y\ \forall z.\ x + z \ne y - z`}: find ${mx} and ${my} that no ${math`z`} fits.`,
    t`${math`x + z = y - z`} means ${math`${2}z = y - x`}, which has an integer solution exactly when ${math`y - x`} is even. So take ${math`y - x`} odd: ${math`x = ${0}`}, ${math`y = ${1}`}, where ${math`z = \frac{${1}}{${2}}`} is not an integer.`,
  ],
  reference: 'x = 0, y = 1',
  verify: () => {
    // For x, y from -6 to 6: an integer z exists exactly when y - x is even.
    const r = upTo(13).map((k) => k - 7);
    for (const x of r) for (const y of r) {
      const exists = upTo(41).some((k) => x + (k - 21) === y - (k - 21));
      if (exists !== ((y - x) % 2 === 0)) return `at x = ${x}, y = ${y}`;
    }
    return null;
  },
  misconceptions: [{ response: 'x = 0, y = 2', why: t`With ${math`y - x`} even there is an integer ${math`z`}: here ${math`z = ${1}`}. Choose ${mx} and ${my} so that ${math`y - x`} is odd.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.5'), answer: 'x = 0, y = 1', agrees: true },
});

const sw115proof = supervision({
  id: 'sw-1-1-5',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.5'),
  title: t`No integer ${math`z`}`,
  prompt: t`Prove that it is not the case that for all integers ${mx} and ${my} there is an integer ${math`z`} with ${math`x + z = y - z`}. Write the negation first, then prove it. Explain why "let ${math`x = ${0}`}, ${math`y = ${1}`}; then ${math`z = \frac{${1}}{${2}}`}, which is not an integer" is not yet a proof.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.5'),
});
const bop5 = supervision({
  id: 'bop-2-10-5',
  source: cite('bop', 'Section 2.10, exercise 5'),
  title: t`A limit, negated`,
  prompt: t`Negate: "For every positive number ${math`\varepsilon`} there is a positive number ${math`M`} for which ${math`|f(x) - b| < \varepsilon`} whenever ${math`x > M`}." First write it in symbols, then push the negation through each quantifier and the "whenever", and finally write the negation in words.`,
  writeUp: 'explanation',
  official: cite('bop', 'Solutions, Section 2.10, exercise 5'),
});
const bop12 = supervision({
  id: 'bop-2-10-12',
  source: cite('bop', 'Section 2.10, exercise 12'),
  title: t`Two evils`,
  prompt: t`Negate: "Whenever I have to choose between two evils, I choose the one I haven't tried yet." (Mae West.) Say what the hidden quantifier is, and explain each step of the negation.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const negatingQuantifiers: TopicContent = {
  topicId: 'logic.negating-quantifiers',
  goal: t`Negate a statement with quantifiers by swapping each "for all" and "there exists" and negating what is inside, and write the negation in plain words.`,
  lesson: [
    { kind: 'p', text: t`The TMUA notes start with ${mS1}: "for all real ${mx}, ${math`x^{${2}} > ${S1}`}". Its negation ${mN1}, "it is not the case that for all real ${mx}, ${math`x^{${2}} > ${S1}`}", says there is some ${mx} for which ${math`x^{${2}} > ${S1}`} fails: "there exists a real ${mx} such that ${math`x^{${2}} \le ${S1}`}". ${mS1} is false and ${mN1} true; ${math`x = ${2}`} shows it.` },
    { kind: 'rule', text: t`${math`\lnot \forall x.\ P(x)`} is equivalent to ${math`\exists x.\ \lnot P(x)`}, and ${math`\lnot \exists x.\ P(x)`} is equivalent to ${math`\forall x.\ \lnot P(x)`}. "Not for all" is "there is one for which it fails"; "there is none" is "for all, it fails".` },
    { kind: 'p', text: t`With several quantifiers, move the "not" inwards one quantifier at a time, swapping each. Book of Proof's Example ${2.13}: every real number has a cube root, ${math`\forall x \in \mathbb{R}\ \exists y \in \mathbb{R}.\ y^{${3}} = x`}. Its negation is ${math`\exists x \in \mathbb{R}\ \forall y \in \mathbb{R}.\ y^{${3}} \ne x`}: some real number has no cube root. The order of the quantifiers is kept; only each one swaps.` },
    { kind: 'p', text: t`Then negate the inside with what you know: ${math`\lnot (a > b)`} is ${math`a \le b`} (the equality case goes with it); ${math`\lnot (P \land Q)`} is ${math`\lnot P \lor \lnot Q`}; and ${math`\lnot (P \Rightarrow Q)`} is ${math`P \land \lnot Q`}. So the negation of "if ${mx} is odd, then ${math`x^{${2}}`} is odd", read as ${math`\forall x \in \mathbb{Z}.\ x \text{ odd} \Rightarrow x^{${2}} \text{ odd}`}, is "there is an odd integer whose square is not odd" (Book of Proof's Example ${2.15}).` },
    { kind: 'p', text: t`The [[negation-of-quantifier|negation]] of a "for all" statement is a "there exists" statement, and a witness for it is a counterexample to the original. A statement and its negation always have opposite truth values, so proving the negation is how a statement is disproved.` },
    { kind: 'p', text: t`In words, "every A is B" negates to "some A is not B", not "no A is B" (that is too strong) and not "some A is B" (that does not contradict it). Hidden quantifiers need care: "I don't eat anything that has a face" is a "for all", so its negation is "I eat some things that have a face".` },
  ],
  examples: [
    workedCambridge(bop3),
    worked(negateSymbols, { i: 2, order: 1 }, t`A cube root for every real number`),
    worked(whichTrue, { m: 4, r: 2, ae: false }, t`A statement or its negation`),
  ],
  generators: [negateSymbols, whichTrue, negateWords],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['negation-of-quantifier'],
  cambridge: [bop7, bop11, tmuaN1, sw115neg, sw115, sw115proof, bop5, bop12],
};
