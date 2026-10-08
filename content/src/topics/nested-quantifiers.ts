/**
 * logic.nested-quantifiers: Statements with several quantifiers, and why the order matters.
 * The lesson follows the TMUA notes on combining "for all" and "there exists" (page 59:
 * the statements S1 and S2), the CST notes' strategy for "for all x there exists y"
 * (printed page 103), and Book of Proof Sections 2.7 to 2.9. The problems are TMUA
 * Exercise N and Book of Proof's exercises for Sections 2.7 and 2.9, checked against the
 * solutions to odd exercises. The gate is Exercise 12 of the CST Logic and Proof notes (batch 7);
 * their Exercise 10 (does one order of the quantifiers imply the other?) is the lesson's theorem,
 * so it is not set.
 */
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { gcd, int, pick, q, str, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Rich, type Span } from '../rich';
import { checkFrom, quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const [mx, my] = [math`x`, math`y`];
const [S1, S2] = [math`S_{${1}}`, math`S_{${2}}`];
const TF = (b: boolean): string => (b ? 'T' : 'F');

// ---------------------------------------------------------------- generators

/** Relations between x and y on a finite set {1, ..., m}. */
const RELATIONS: readonly { tex: string; holds: (x: number, y: number, m: number) => boolean }[] = [
  { tex: 'x \\le y', holds: (x, y) => x <= y },
  { tex: 'x < y', holds: (x, y) => x < y },
  { tex: 'x + y \\text{ is even}', holds: (x, y) => (x + y) % 2 === 0 },
  { tex: 'y \\mid x', holds: (x, y) => x % y === 0 },
  { tex: 'x \\mid y', holds: (x, y) => y % x === 0 },
  { tex: 'y = x', holds: (x, y) => x === y },
  { tex: 'x + y = m + 1', holds: (x, y, m) => x + y === m + 1 },
  { tex: '\\gcd(x, y) = 1', holds: (x, y) => gcd(x, y) === 1 },
  { tex: 'xy \\ge x', holds: (x, y) => x * y >= x },
];
interface OrderP { m: number; r: number }

const order = generator<OrderP>({
  id: 'order-matters',
  skill: 'Decide whether "for all x there exists y" and "there exists y for all x" are true, on a small set: the order of quantifiers matters.',
  params: (rng) => ({ m: int(rng, 3, 6), r: int(rng, 0, RELATIONS.length - 1) }),
  sane: ({ m, r }) => (m >= 3 && m <= 6 && r >= 0 && r < RELATIONS.length ? null : 'out of range'),
  problem: ({ m, r }) => {
    const R = RELATIONS[r] as (typeof RELATIONS)[number];
    const S = upTo(m);
    const P = (x: number, y: number): boolean => R.holds(x, y, m);
    const ae = S.every((x) => S.some((y) => P(x, y)));
    const ea = S.some((y) => S.every((x) => P(x, y)));
    const rel = computedTex(R.tex.replace('m + 1', `${m} + ${1}`));
    const failX = S.find((x) => !S.some((y) => P(x, y)));
    const goodY = S.find((y) => S.every((x) => P(x, y)));
    return {
      prompt: t`Let ${math`S = \{${1}, \ldots, ${m}\}`}. With ${rel} as the condition on ${mx} and ${my}, is each statement true or false? Write T or F.`,
      answer: {
        kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`],
        rows: [[t`${math`\forall x \in S.\ \exists y \in S.\ `}${rel}`, null], [t`${math`\exists y \in S.\ \forall x \in S.\ `}${rel}`, null]],
        expected: [TF(ae), TF(ea)],
      },
      solution: [
        ae ? t`For every ${mx} there is a ${my} that works, and ${my} may depend on ${mx}: so the first is true.` : t`The first is false: for ${math`x = ${failX as number}`} no ${my} in ${math`S`} works.`,
        ea ? t`The second is true: ${math`y = ${goodY as number}`} works for every ${mx} at once.` : t`The second needs one ${my} that works for every ${mx} at once, and no ${my} does: each fails for some ${mx}.`,
        ea ? t`When one ${my} works for all ${mx}, it also works for each ${mx}: so the second always implies the first.` : t`The first can be true while the second is false; never the other way round.`,
      ],
    };
  },
  solve: ({ m, r }) => {
    // Brute force over every pair, through a table of the relation.
    const R = RELATIONS[r] as (typeof RELATIONS)[number];
    const table = upTo(m).map((x) => upTo(m).map((y) => R.holds(x, y, m)));
    const ae = table.every((row) => row.some((v) => v));
    const ea = upTo(m).some((_, yi) => table.every((row) => row[yi] === true));
    return [TF(ae), TF(ea)];
  },
  misconceptions: ({ m, r }): Misconception[] => {
    const R = RELATIONS[r] as (typeof RELATIONS)[number];
    const S = upTo(m);
    const ae = S.every((x) => S.some((y) => R.holds(x, y, m)));
    const ea = S.some((y) => S.every((x) => R.holds(x, y, m)));
    const right = [TF(ae), TF(ea)].join();
    const cands: Misconception[] = [
      { response: [TF(ae), TF(ae)], why: t`The order matters: "there exists ${my} for all ${mx}" needs one ${my} for every ${mx} at once, which is much stronger.` },
      { response: [TF(ea), TF(ea)], why: t`"For all ${mx} there exists ${my}" lets ${my} change with ${mx}. Check each ${mx} on its own.` },
      { response: [TF(!ae), TF(ea)], why: ae ? t`Every ${mx} has a ${my}: check each one.` : t`Some ${mx} has no ${my} that works.` },
      { response: [TF(ae), TF(!ea)], why: ea ? t`One ${my} does work for every ${mx}: try each ${my}.` : t`No single ${my} works for every ${mx}.` },
    ];
    const out: Misconception[] = [];
    for (const c of cands) {
      const k = (c.response as string[]).join();
      if (k !== right && !out.some((o) => (o.response as string[]).join() === k)) out.push(c);
    }
    return out;
  },
});

interface SolveP { a: number; b: number; c: number }

const construct = generator<SolveP>({
  id: 'construct',
  skill: 'Prove "for all x and y there exists z" by constructing z from x and y: a witness that depends on the earlier variables.',
  params: (rng) => ({ a: pick(rng, [1, 2, 3]), b: pick(rng, [1, 2, 3, 4]), c: pick(rng, [1, 2, 3]) }),
  sane: ({ a, b, c }) => (a >= 1 && b >= 1 && c >= 1 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    // a x + b z = c y - z, so (b + 1) z = c y - a x.
    const eq = math`${a === 1 ? '' : a}x + ${b === 1 ? '' : b}z = ${c === 1 ? '' : c}y - z`;
    return {
      prompt: t`Prove that for all real numbers ${mx} and ${my} there is a real number ${math`z`} with ${eq}: give ${math`z`} in terms of ${mx} and ${my}.`,
      answer: { kind: 'expression', expected: `(${c}y - ${a}x)/${b + 1}`, variables: ['x', 'y'] },
      solution: [
        t`Let ${mx} and ${my} be arbitrary reals. The witness ${math`z`} may depend on them: solve for it.`,
        t`${eq} means ${math`${b + 1}z = ${c === 1 ? '' : c}y - ${a === 1 ? '' : a}x`}, so ${math`z = \frac{${c === 1 ? '' : c}y - ${a === 1 ? '' : a}x}{${b + 1}}`}, a real number. With this ${math`z`} the equation holds, which proves the statement.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // z from two values of (x, y), fitted to z = px + qy: z(1, 0) and z(0, 1).
    const zAt = (x: number, y: number) => q(c * y - a * x, b + 1);
    return `(${str(zAt(1, 0))})x + (${str(zAt(0, 1))})y`;
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: `(${c}y - ${a}x)/${b}`, why: t`The ${math`z`} on the right moves across too: ${math`${b}z + z = ${b + 1}z`}.` },
    { response: `(${c}y + ${a}x)/${b + 1}`, why: t`Moving ${math`${a === 1 ? '' : a}x`} to the other side changes its sign.` },
  ],
});

const SENTENCES: readonly { english: (v: string) => Rich; forms: [Span, Span, Span] }[] = [
  { english: () => t`Every integer has a larger integer.`, forms: [math`\forall x \in \mathbb{Z}.\ \exists y \in \mathbb{Z}.\ y > x`, math`\exists y \in \mathbb{Z}.\ \forall x \in \mathbb{Z}.\ y > x`, math`\forall x \in \mathbb{Z}.\ \forall y \in \mathbb{Z}.\ y > x`] },
  { english: () => t`Some integer is smaller than or equal to every natural number.`, forms: [math`\exists y \in \mathbb{Z}.\ \forall x \in \mathbb{N}.\ y \le x`, math`\forall x \in \mathbb{N}.\ \exists y \in \mathbb{Z}.\ y \le x`, math`\exists y \in \mathbb{Z}.\ \exists x \in \mathbb{N}.\ y \le x`] },
  { english: () => t`Every positive real number has a real square root.`, forms: [math`\forall x \in \mathbb{R}.\ x > ${0} \Rightarrow \exists y \in \mathbb{R}.\ y^{${2}} = x`, math`\exists y \in \mathbb{R}.\ \forall x \in \mathbb{R}.\ x > ${0} \Rightarrow y^{${2}} = x`, math`\forall x \in \mathbb{R}.\ \forall y \in \mathbb{R}.\ y^{${2}} = x`] },
  { english: () => t`There is a real number ${math`a`} with ${math`a + x = x`} for every real number ${mx}.`, forms: [math`\exists a \in \mathbb{R}.\ \forall x \in \mathbb{R}.\ a + x = x`, math`\forall x \in \mathbb{R}.\ \exists a \in \mathbb{R}.\ a + x = x`, math`\exists a \in \mathbb{R}.\ \exists x \in \mathbb{R}.\ a + x = x`] },
  { english: () => t`Every natural number has a natural number that it divides.`, forms: [math`\forall x \in \mathbb{N}.\ \exists y \in \mathbb{N}.\ x \mid y`, math`\exists y \in \mathbb{N}.\ \forall x \in \mathbb{N}.\ x \mid y`, math`\forall x \in \mathbb{N}.\ \exists y \in \mathbb{N}.\ y \mid x`] },
  { english: () => t`No integer is larger than every integer.`, forms: [math`\lnot \exists y \in \mathbb{Z}.\ \forall x \in \mathbb{Z}.\ y > x`, math`\forall y \in \mathbb{Z}.\ \lnot \forall x \in \mathbb{Z}.\ \lnot (y > x)`, math`\lnot \forall x \in \mathbb{Z}.\ \exists y \in \mathbb{Z}.\ y > x`] },
];

interface TransP { i: number; order: number }

const translate = generator<TransP>({
  id: 'translate',
  skill: 'Write an English sentence with two quantifiers in symbols, as in Book of Proof Section 2.9: which quantifier comes first.',
  params: (rng) => ({ i: int(rng, 0, SENTENCES.length - 1), order: int(rng, 0, 5) }),
  sane: ({ i }) => (i >= 0 && i < SENTENCES.length ? null : 'out of range'),
  problem: ({ i, order: o }) => {
    const s = SENTENCES[i] as (typeof SENTENCES)[number];
    const ids = ['right', 'swapped', 'other'];
    // Six orders of the three options, so the right one is not always first.
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][o] as number[];
    const options: ChoiceOption[] = perms.map((k) => ({ id: ids[k] as string, label: [s.forms[k] as Span] }));
    return {
      prompt: t`Which is a correct translation into symbols of: "${s.english('x')}"`,
      answer: { kind: 'choice', options, correct: 'right' },
      solution: [
        t`Read the sentence for its order: what is chosen first, and does the second choice depend on it?`,
        t`The translation is ${s.forms[0]}.`,
      ],
    };
  },
  // An English sentence has no computable meaning to check against: the right form is the first of each entry, by construction.
  solve: ({ i }) => (SENTENCES[i] === undefined ? ['none'] : ['right']),
  misconceptions: (): Misconception[] => [
    { response: ['swapped'], why: t`The quantifiers are in the wrong order, which changes the meaning: ${math`\forall x\, \exists y`} lets ${my} depend on ${mx}; ${math`\exists y\, \forall x`} needs one ${my} for all.` },
    { response: ['other'], why: t`Check each quantifier against the sentence: "every" is ${math`\forall`}, "some" or "there is" is ${math`\exists`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

/** TMUA Exercise N: the statements with their truth on the reals, checked on a sample of reals. */
const N_ITEMS: readonly { tex: string; value: boolean }[] = [
  { tex: '\\forall x\\ \\exists y.\\ x > y', value: true },
  { tex: '\\forall x\\ \\exists y.\\ y > x', value: true },
  { tex: '\\forall y\\ \\exists x.\\ x > y', value: true },
  { tex: '\\forall y\\ \\exists x.\\ y > x', value: true },
  { tex: '\\exists x\\ \\forall y.\\ x > y', value: false },
  { tex: '\\exists x\\ \\forall y.\\ y > x', value: false },
  { tex: '\\exists y\\ \\forall x.\\ x > y', value: false },
  { tex: '\\exists y\\ \\forall x.\\ y > x', value: false },
];
/** Checks each line on a grid of reals: the "for all, exists" lines with the witnesses x - 1 or x + 1, the others by a value that beats every candidate. */
function checkN(): boolean {
  const grid = [-3, -1.5, 0, 0.5, 2, 7];
  const forallExists = grid.every((x) => grid.concat([x - 1, x + 1]).some((y) => x > y)) && grid.every((x) => [x + 1].some((y) => y > x));
  // ∃x ∀y. x > y fails: for each candidate x, y = x + 1 (or x itself) breaks it.
  const existsForall = grid.every((x) => !(x > x + 1)) && grid.every((y) => !(y > y));
  return forallExists && existsForall;
}

const tmuaN = auto({
  id: 'tmua-n',
  source: cite('tmua-logic-proof', 'Exercise N, question 1'),
  title: t`Two quantifiers, every order`,
  prompt: t`All variables range over the real numbers. Which of the following are true and which are false? Write T or F.`,
  answer: { kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`], rows: N_ITEMS.map((s) => [[math`${s.tex}`], null]), expected: N_ITEMS.map((s) => TF(s.value)) },
  solution: [
    t`(i) to (iv) say "for each number, there is a bigger one" or "a smaller one": true, with the witness ${math`x - ${1}`} or ${math`x + ${1}`} chosen after the first variable.`,
    t`(v) to (viii) say one number is bigger, or smaller, than every real at once: false, since that number would have to beat itself plus or minus one, and itself (${math`x > x`} fails).`,
  ],
  reference: N_ITEMS.map((s) => TF(s.value)),
  verify: () => same('TMUA N, by witnesses on a grid', checkN(), true),
  misconceptions: [{ response: N_ITEMS.map(() => 'T'), why: t`With ${math`\exists`} first, one number must work for every value of the other at once: no real is bigger than every real.` }],
});

function bop27(o: { n: number; statement: Span; value: boolean; steps: Rich[]; check: () => boolean; official: boolean }): AutoProblem {
  const at = `Section 2.7, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-7-${o.n}`,
    source: cite('bop', at),
    title: t`True or false`,
    prompt: t`Write ${o.statement} as an English sentence in your head, and say whether it is true or false.`,
    answer: { kind: 'choice', options: [{ id: 'true', label: t`True` }, { id: 'false', label: t`False` }], correct: o.value ? 'true' : 'false' },
    solution: o.steps,
    reference: o.value ? 'true' : 'false',
    verify: () => (o.check() === o.value ? null : `Book of Proof ${at}: the check disagrees`),
    misconceptions: [{ response: o.value ? 'false' : 'true', why: o.value ? t`Find the witness for the "there exists", given the earlier variable.` : t`With ${math`\exists`} first, one value must work for every value of the next variable.` }],
  };
  if (o.official) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.value ? 'true' : 'false', agrees: true };
  return auto(spec);
}

const ints = upTo(41).map((k) => k - 21);
const bop27_3 = bop27({
  n: 3, value: true, official: true,
  statement: math`\exists a \in \mathbb{R},\ \forall x \in \mathbb{R},\ ax = x`,
  steps: [t`"There exists a real number ${math`a`} for which ${math`ax = x`} for every real number ${mx}." True: ${math`a = ${1}`}.`],
  check: () => [-2, -1, 0, 1, 2].some((a) => [-3, -0.5, 0, 2, 9].every((x) => a * x === x)),
});
const bop27_9 = bop27({
  n: 9, value: true, official: true,
  statement: math`\forall n \in \mathbb{Z},\ \exists m \in \mathbb{Z},\ m = n + ${5}`,
  steps: [t`"For every integer ${math`n`} there is an integer ${math`m`} with ${math`m = n + ${5}`}." True: given ${math`n`}, take ${math`m = n + ${5}`}.`],
  check: () => ints.every((n) => ints.concat(ints.map((x) => x + 40)).some((m) => m === n + 5)),
});
const bop27_10 = bop27({
  n: 10, value: false, official: false,
  statement: math`\exists m \in \mathbb{Z},\ \forall n \in \mathbb{Z},\ m = n + ${5}`,
  steps: [t`"There is an integer ${math`m`} with ${math`m = n + ${5}`} for every integer ${math`n`}." False: ${math`m`} would equal ${5} (at ${math`n = ${0}`}) and ${6} (at ${math`n = ${1}`}) at once.`],
  check: () => ints.some((m) => ints.every((n) => m === n + 5)),
});

function bop29(o: { n: number; english: Rich; forms: [Span, Span, Span]; steps: Rich[] }): AutoProblem {
  const at = `Section 2.9, exercise ${o.n}`;
  return auto({
    id: `bop-2-9-${o.n}`,
    source: cite('bop', at, true),
    title: t`Into symbols`,
    prompt: t`Translate into symbolic logic: "${o.english}" Which is right?`,
    answer: { kind: 'choice', options: [{ id: 'swapped', label: [o.forms[1]] }, { id: 'right', label: [o.forms[0]] }, { id: 'other', label: [o.forms[2]] }], correct: 'right' },
    solution: o.steps,
    reference: 'right',
    verify: () => null,
    misconceptions: [{ response: 'swapped', why: t`The order of the quantifiers changes the meaning.` }],
    official: { source: cite('bop', `Solutions, ${at}`), answer: 'right', agrees: true },
  });
}
const bop29_7 = bop29({
  n: 7,
  english: t`There exists a real number ${math`a`} for which ${math`a + x = x`} for every real number ${mx}.`,
  forms: [math`\exists a \in \mathbb{R},\ \forall x \in \mathbb{R},\ a + x = x`, math`\forall x \in \mathbb{R},\ \exists a \in \mathbb{R},\ a + x = x`, math`\exists a \in \mathbb{R},\ \exists x \in \mathbb{R},\ a + x = x`],
  steps: [t`One ${math`a`} is chosen first and must work for every ${mx}: ${math`\exists a \in \mathbb{R},\ \forall x \in \mathbb{R},\ a + x = x`}, as in the solutions. (It is true, with ${math`a = ${0}`}.)`],
});
const bop29_5 = bop29({
  n: 5,
  english: t`For every positive number ${math`\varepsilon`}, there is a positive number ${math`\delta`} for which ${math`|x - a| < \delta`} implies ${math`|f(x) - f(a)| < \varepsilon`}.`,
  forms: [
    math`\forall \varepsilon \in \mathbb{R}, \varepsilon > ${0},\ \exists \delta \in \mathbb{R}, \delta > ${0},\ (|x - a| < \delta) \Rightarrow (|f(x) - f(a)| < \varepsilon)`,
    math`\exists \delta \in \mathbb{R}, \delta > ${0},\ \forall \varepsilon \in \mathbb{R}, \varepsilon > ${0},\ (|x - a| < \delta) \Rightarrow (|f(x) - f(a)| < \varepsilon)`,
    math`\forall \varepsilon \in \mathbb{R}, \varepsilon > ${0},\ \exists \delta \in \mathbb{R}, \delta > ${0},\ (|f(x) - f(a)| < \varepsilon) \Rightarrow (|x - a| < \delta)`,
  ],
  steps: [t`${math`\varepsilon`} is given first, then ${math`\delta`} is found, and may depend on ${math`\varepsilon`}: ${math`\forall \varepsilon\, \exists \delta`}. The implication goes from closeness of ${mx} to ${math`a`} to closeness of ${math`f(x)`} to ${math`f(a)`}. This is the definition of continuity at ${math`a`}.`],
});

const s1s2 = supervision({
  id: 'tmua-p59-s1-s2',
  source: cite('tmua-logic-proof', 'Combining the two phrases together, page 59', true),
  title: t`${S1} and ${S2}`,
  prompt: t`Explain why ${S1}: "for all positive real ${mx} there exists a real ${my} such that ${math`y^{${2}} = x`}" is true, and ${S2}: "there exists a real ${my} such that for all positive real ${mx}, ${math`y^{${2}} = x`}" is false. In ${S1}, what does the choice of ${my} depend on?`,
  writeUp: 'explanation',
});
const bop29_13 = supervision({
  id: 'bop-2-9-13',
  source: cite('bop', 'Section 2.9, exercise 13'),
  title: t`Funny, as long as`,
  prompt: t`Translate into symbolic logic: "Everything is funny as long as it is happening to somebody else." (Will Rogers.) Say what each predicate you use means, and which quantifier comes first.`,
  writeUp: 'explanation',
  official: cite('bop', 'Solutions, Section 2.9, exercise 13'),
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/** Logic and Proof Exercise 12: six relations on N against reflexivity, symmetry, and transitivity. */
const LP12: readonly { rel: Span; holds: (x: number, y: number) => boolean; answers: readonly [boolean, boolean, boolean] }[] = [
  { rel: math`\varnothing`, holds: () => false, answers: [false, true, true] },
  { rel: math`\{(x, y) \mid x, y \in \mathbb{N}\}`, holds: () => true, answers: [true, true, true] },
  { rel: math`\{(x, x) \mid x \in \mathbb{N}\}`, holds: (x, y) => x === y, answers: [true, true, true] },
  { rel: math`\{(x, y) \mid x, y \in \mathbb{N} \land x + y \text{ is even}\}`, holds: (x, y) => (x + y) % 2 === 0, answers: [true, true, true] },
  { rel: math`\{(x, y) \mid x, y \in \mathbb{N} \land x + y = ${100}\}`, holds: (x, y) => x + y === 100, answers: [false, true, false] },
  { rel: math`\{(x, y) \mid x, y \in \mathbb{N} \land x \le y\}`, holds: (x, y) => x <= y, answers: [true, false, true] },
];
/** Checked on 0 .. 120, which holds a counterexample to every axiom that fails (100 + 0 = 100 needs 100). */
const LP12_RANGE = Array.from({ length: 121 }, (_, i) => i);
const lp12Check = (r: (x: number, y: number) => boolean): [boolean, boolean, boolean] => {
  const N = LP12_RANGE;
  const refl = N.every((x) => r(x, x));
  const sym = N.every((x) => N.every((y) => !r(x, y) || r(y, x)));
  const trans = N.every((x) => N.every((y) => !r(x, y) || N.every((z) => !r(y, z) || r(x, z))));
  return [refl, sym, trans];
};
const AXIOMS = math`(${1})\ \forall x.\ x \approx x`;
const AXIOMS2 = math`(${2})\ \forall x\, y.\ (x \approx y \Rightarrow y \approx x)`;
const AXIOMS3 = math`(${3})\ \forall x\, y\, z.\ (x \approx y \land y \approx z \Rightarrow x \approx z)`;
const LP12_PROMPT = t`Let ${math`\approx`} be a two-place predicate symbol, written ${math`x \approx y`}. Consider the axioms ${AXIOMS}, ${AXIOMS2}, and ${AXIOMS3}. Let the universe be the set of natural numbers, ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}.`;

const lp12 = auto({
  id: 'lp-ex-12',
  source: cite('cst-lp-notes', 'Section 4, Exercise 12 (page 11)'),
  title: t`Which axioms hold?`,
  prompt: t`${LP12_PROMPT} Which axioms hold if ${math`\approx`} is interpreted as each relation below? Write T if the axiom holds and F if it fails.`,
  answer: {
    kind: 'table', columns: [t`the relation`, [math`(${1})`], [math`(${2})`], [math`(${3})`]], cell: 'truth',
    rows: LP12.map(({ rel }) => [[rel], null, null, null]),
    expected: LP12.flatMap(({ answers }) => answers.map(TF)),
  },
  solution: [
    t`The empty relation: ${math`x \approx x`} is false, so (${1}) fails. In (${2}) and (${3}) the hypothesis is never true, so both hold vacuously.`,
    t`The universal relation and equality satisfy all three, and so does "${math`x + y`} is even": ${math`x + x = ${2}x`} is even; the sum is symmetric; and if ${math`x + y`} and ${math`y + z`} are even then ${math`x + z = (x + y) + (y + z) - ${2}y`} is even.`,
    t`"${math`x + y = ${100}`}": (${1}) fails at ${math`x = ${0}`}; (${2}) holds since addition is symmetric; (${3}) fails: ${math`${0} + ${100} = ${100}`} and ${math`${100} + ${0} = ${100}`}, but ${math`${0} + ${0} \ne ${100}`}.`,
    t`${math`x \le y`}: (${1}) and (${3}) hold; (${2}) fails, since ${math`${0} \le ${1}`} but not ${math`${1} \le ${0}`}.`,
  ],
  reference: LP12.flatMap(({ answers }) => answers.map(TF)),
  verify: () => {
    for (const { rel, holds, answers } of LP12) {
      const e = same(`axioms for ${rel.text}`, lp12Check(holds).map(TF).join(''), answers.map(TF).join(''));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{
    response: LP12.flatMap(({ answers }, i) => (i === 0 ? [false, false, false] : answers).map(TF)),
    why: t`For the empty relation, (${2}) and (${3}) are implications whose hypothesis is never true, so they hold: there is no pair to break them.`,
  }],
});

// ---------------------------------------------------------------- lesson

const TRUE_FALSE: ChoiceOption[] = [{ id: 'true', label: t`True` }, { id: 'false', label: t`False` }];
const S3 = upTo(3);
const ex3 = S3.some((y) => S3.every((x) => x <= y));
const parity3 = S3.some((y) => S3.every((x) => (x + y) % 2 === 0));

export const nestedQuantifiers: TopicContent = {
  topicId: 'logic.nested-quantifiers',
  goal: t`Read statements with several quantifiers, and see why ${math`\forall x\, \exists y`} differs from ${math`\exists y\, \forall x`}.`,
  objective: t`Read statements with two quantifiers, and say why swapping "for all" and "there exists" changes the meaning.`,
  why: t`Every definition in analysis, such as a limit or continuity, is a nested quantifier statement.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Same words, different order` },
    { kind: 'hook', text: t`Compare two sentences from the TMUA notes. ${S1}: "for every positive real ${mx} there is a real ${my} with ${math`y^{${2}} = x`}". ${S2}: "there is a real ${my} such that for every positive real ${mx}, ${math`y^{${2}} = x`}". The same pieces in a different order. ${S1} says every positive number has a square root, which is true. ${S2} says one number is the square root of every positive number at once, which is absurd.` },
    { kind: 'narrative', text: t`The difference is about who chooses first. Think of a statement with quantifiers as a game. "For all ${mx}" is a move by a sceptic, who picks any ${mx} they like. "There exists ${my}" is your move: you must produce a ${my} that works. Read left to right, each player sees the moves already made.` },

    { kind: 'section', title: t`Who chooses first` },
    { kind: 'p', text: t`In ${math`\forall x\ \exists y.\ P(x, y)`}, the sceptic picks ${mx} first, and you choose ${my} knowing ${mx}. So ${my} may depend on ${mx}: a [[dependent-witness|witness that depends]] on ${mx}, such as ${math`y = \sqrt{x}`} in ${S1}.` },
    { kind: 'p', text: t`In ${math`\exists y\ \forall x.\ P(x, y)`}, you must commit to ${my} first, and then the sceptic picks any ${mx} to try to break it. One ${my} must work for every ${mx}. In ${S2}, whatever ${my} you pick, the sceptic chooses ${math`x = y^{${2}} + ${1}`}, and ${math`y^{${2}} \ne x`}.` },
    { kind: 'theorem', name: t`Order of quantifiers`, statement: t`For any statement ${math`P(x, y)`}, ${dmath`\exists y\ \forall x.\ P(x, y) \implies \forall x\ \exists y.\ P(x, y),`} but the converse can fail. Quantifiers of the same kind commute: ${math`\forall x\ \forall y`} means the same as ${math`\forall y\ \forall x`}, and likewise for ${math`\exists`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Take the single witness`, text: t`Suppose ${math`\exists y\ \forall x.\ P(x, y)`}, and let ${math`y_{${0}}`} be a ${my} with ${math`P(x, y_{${0}})`} for every ${mx}.` },
        { label: t`Use it for each x`, text: t`Let ${mx} be arbitrary. Then ${math`P(x, y_{${0}})`} holds, so there exists a ${my} (namely ${math`y_{${0}}`}) with ${math`P(x, y)`}.`, plain: t`One ${my} that works for everyone certainly works for each person separately.` },
        { label: t`Conclude`, text: t`Since ${mx} was arbitrary, ${math`\forall x\ \exists y.\ P(x, y)`}.` },
        { label: t`The converse fails`, text: t`${S1} and ${S2} are a counterexample: ${S1}, of the form ${math`\forall x\ \exists y`}, is true, and ${S2}, of the form ${math`\exists y\ \forall x`}, is false.` },
      ],
    },
    quickCheck({
      prompt: t`Let ${math`S = \{${1}, ${2}, ${3}\}`}. Is ${math`\exists y \in S\ \forall x \in S.\ x \le y`} true or false?`,
      answer: { kind: 'choice', options: TRUE_FALSE, correct: ex3 ? 'true' : 'false' },
      reference: ex3 ? 'true' : 'false',
      why: t`True: commit to ${math`y = ${3}`} first, and every ${mx} in ${math`S`} has ${math`x \le ${3}`}.`,
    }),
    quickCheck({
      prompt: t`With the same ${math`S`}, is ${math`\exists y \in S\ \forall x \in S.\ x + y \text{ is even}`} true or false?`,
      answer: { kind: 'choice', options: TRUE_FALSE, correct: parity3 ? 'true' : 'false' },
      reference: parity3 ? 'true' : 'false',
      why: t`False: any ${my} has the wrong parity for some ${mx}. Yet ${math`\forall x\ \exists y`} is true here: take ${math`y = x`}.`,
    }),

    { kind: 'section', title: t`Proving a for all, there exists` },
    { kind: 'narrative', text: t`The CST notes give the strategy for proving ${math`\forall x\ \exists y.\ P(x, y)`}: let ${mx} be arbitrary, construct the witness ${my} from ${mx}, and check ${math`P(x, y)`}. The construction is usually found by working backwards.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The claim`, text: t`For all real ${mx} and ${my} there is a real ${math`z`} with ${math`x + z = y - z`}.` },
        { label: t`Take arbitrary values`, text: t`Let ${mx} and ${my} be any real numbers. We must produce ${math`z`}, and it may depend on both.` },
        { label: t`Work backwards`, text: t`${math`x + z = y - z`} means ${math`${2}z = y - x`}, so try ${math`z = \frac{y - x}{${2}}`}.` },
        { label: t`Check forwards`, text: t`${math`x + \frac{y - x}{${2}} = \frac{x + y}{${2}}`} and ${math`y - \frac{y - x}{${2}} = \frac{x + y}{${2}}`}: equal, so this ${math`z`} works.` },
      ],
    },
    checkFrom(construct, { a: 2, b: 1, c: 1 }, t`${math`${2}x + z = y - z`} gives ${math`${2}z = y - ${2}x`}, so ${math`z = \frac{y - ${2}x}{${2}}`}.`),

    { kind: 'section', title: t`From words to symbols` },
    { kind: 'p', text: t`English hides the order. "Every integer has a larger integer" is ${math`\forall x\ \exists y.\ y > x`}: for each integer, a larger one (it depends on ${mx}). "Some integer is larger than every integer" is ${math`\exists y\ \forall x.\ y > x`}: one integer beating all. Ask: is one object chosen for all, or a new one for each?` },
    { kind: 'p', text: t`Continuity at ${math`a`} reads ${math`\forall \varepsilon > ${0}\ \exists \delta > ${0}`} and so on: ${math`\delta`} is chosen after ${math`\varepsilon`}, so it may depend on it. Putting ${math`\exists \delta`} first would demand one ${math`\delta`} for every ${math`\varepsilon`}, a much stronger claim.` },
    checkFrom(translate, { i: 0, order: 3 }, t`For each integer ${mx} there is a larger one, chosen after ${mx}: ${math`\forall x\ \exists y`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\forall x\ \exists y.\ P(x, y)`} and ${math`\exists y\ \forall x.\ P(x, y)`} say the same thing.`, counterexample: t`On the integers, ${math`\forall x\ \exists y.\ y > x`} is true (take ${math`y = x + ${1}`}), and ${math`\exists y\ \forall x.\ y > x`} is false (it fails at ${math`x = y`}).` },
    { kind: 'pitfall', claim: t`In ${math`\forall x\ \exists y`}, the witness must be the same for every ${mx}.`, counterexample: t`For ${S1}, the witness for ${math`x = ${4}`} is ${math`${2}`} and for ${math`x = ${9}`} it is ${math`${3}`}. Different ${mx}, different ${my}, and that is allowed.` },
    { kind: 'pitfall', claim: t`To prove ${math`\forall x\ \exists y`}, checking a few values of ${mx} is enough.`, counterexample: t`Checking ${math`x = ${1}, ${2}, ${3}`} says nothing about ${math`x = ${4}`}. Take ${mx} arbitrary and give ${my} as a formula in ${mx}.` },
    { kind: 'takeaway', text: t`Read quantifiers left to right as moves in a game: in ${math`\forall x\ \exists y`} the witness may depend on ${mx}; in ${math`\exists y\ \forall x`} one witness must work for all.` },
  ],
  examples: [
    { ...workedCambridge(bop27_3), examiner: t`The marker looks for the witness ${math`a = ${1}`} named, and a check that it works for every ${mx}.` },
    worked(order, { m: 4, r: 1 }, t`Order on the set ${math`\{${1}, \ldots, ${4}\}`}`),
    worked(construct, { a: 1, b: 1, c: 1 }, t`A witness that depends on ${mx} and ${my}`),
  ],
  generators: [order, construct, translate],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['dependent-witness'],
  cambridge: withUses([tmuaN, bop27_9, bop27_10, bop29_7, bop29_5, s1s2, bop29_13, lp12], {
    'lp-ex-12': { sections: ['Who chooses first', 'From words to symbols'], note: t`Checking which axioms hold for each relation` },
  }),
  // Logic and Proof Exercise 12: nested quantifiers in the axioms, checked on six interpretations. Its written
  // justification is a proof, so it is set in proof.counterexample (Rule 1, 2026-10-08).
  gate: ['lp-ex-12'],
  recall: [
    { front: t`What may the witness depend on in ${math`\forall x\ \exists y.\ P(x, y)`}?`, back: t`On ${mx}: ${my} is chosen after ${mx}.` },
    { front: t`Which implies which: ${math`\exists y\ \forall x`} or ${math`\forall x\ \exists y`}?`, back: t`${math`\exists y\ \forall x.\ P \implies \forall x\ \exists y.\ P`}; not conversely.` },
    { front: t`How do you prove ${math`\forall x\ \exists y.\ P(x, y)`}?`, back: t`Take ${mx} arbitrary, construct ${my} from ${mx}, and check ${math`P(x, y)`}.` },
  ],
  proofOrder: [{
    title: t`One witness for all gives a witness for each`,
    steps: [
      t`Suppose ${math`\exists y\ \forall x.\ P(x, y)`}, with witness ${math`y_{${0}}`}.`,
      t`Let ${mx} be arbitrary.`,
      t`Then ${math`P(x, y_{${0}})`} holds, so some ${my} works for this ${mx}.`,
      t`As ${mx} was arbitrary, ${math`\forall x\ \exists y.\ P(x, y)`}.`,
    ],
  }],
};
