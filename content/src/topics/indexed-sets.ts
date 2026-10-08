/**
 * sets.indexed: indexed collections of sets, and unions and intersections over an index set.
 * The lesson follows Book of Proof, Section 1.8 (where N = {1, 2, 3, ...}); the problems are
 * its exercises, checked against the book's solutions to the odd ones, and CST Discrete
 * Mathematics supervision exercises 5.1.5 (the family A_i = {i, i + 1, i - 1, 2i} over
 * I = {2, 3, 4, 5}, computed here). The proofs of exercises 5.2.6, 5.2.7, and 5.3.1 (batch 7) are
 * in proof.set-proofs (Rule 1, 2026-10-08). IA Numbers
 * and Sets Example Sheet 1, Q7 (nested non-empty sets with empty intersection) is this lesson's
 * pitfall, so it is not set.
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, setOf, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const [mI, mx] = [math`I`, math`x`];
const uniq = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
const union = (fam: readonly (readonly number[])[]): number[] => uniq(fam.flat());
const inter = (fam: readonly (readonly number[])[]): number[] => uniq((fam[0] ?? []).filter((x) => fam.every((s) => s.includes(x))));

/** A witness answer that is exactly the given set of integers. */
function setAnswer(want: readonly number[]) {
  return {
    kind: 'witness' as const,
    count: { min: 1, max: 30 },
    unordered: true,
    example: want.join(', '),
    check: (vals: readonly Rational[]): string | null => {
      const xs = vals.map((v) => (v.den === 1n ? Number(v.num) : NaN));
      if (xs.some((x) => Number.isNaN(x))) return 'Every element here is a whole number.';
      if (new Set(xs).size !== xs.length) return 'List each element once.';
      const extra = xs.find((x) => !want.includes(x));
      if (extra !== undefined) return `${extra} is not in the set.`;
      const missing = want.filter((x) => !xs.includes(x)).length;
      return missing === 0 ? null : `${missing === 1 ? 'One element is' : `${missing} elements are`} missing.`;
    },
  };
}

// ---------------------------------------------------------------- generators

/** Families A_i given by a formula in i, as in CST 5.1.5. */
const FAMILIES: readonly { tex: (k: number) => Span; make: (i: number, k: number) => number[] }[] = [
  { tex: () => math`\{i, i + ${1}, i - ${1}, ${2}i\}`, make: (i) => [i, i + 1, i - 1, 2 * i] },
  { tex: (k) => math`\{i, i + ${k}\}`, make: (i, k) => [i, i + k] },
  { tex: (k) => math`\{i - ${1}, i, i + ${1}, i + ${k}\}`, make: (i, k) => [i - 1, i, i + 1, i + k] },
  { tex: (k) => math`\{i, ${k}i\}`, make: (i, k) => [i, k * i] },
  { tex: (k) => math`\{${1}, ${2}, \ldots, i + ${k}\}`, make: (i, k) => Array.from({ length: i + k }, (_, j) => j + 1) },
];

interface FamP { f: number; k: number; lo: number; size: number; op: 'union' | 'inter' }

const famOf = ({ f, k, lo, size }: FamP): number[][] => Array.from({ length: size }, (_, j) => (FAMILIES[f] as (typeof FAMILIES)[number]).make(lo + j, k));

function famMis(p: FamP): Misconception[] {
    const fam = famOf(p);
    const out: Misconception[] = [
      { response: (p.op === 'union' ? inter(fam) : union(fam)).join(', '), why: p.op === 'union' ? t`That is the intersection, what all the sets share. The union takes what is in at least one of them.` : t`That is the union, everything in some ${math`A_{i}`}. The intersection keeps only what is in every ${math`A_{i}`}.` },
    ];
    const short = p.op === 'union' ? union(fam.slice(0, -1)) : inter(fam.slice(0, -1));
    const full = p.op === 'union' ? union(fam) : inter(fam);
    if (short.join() !== full.join()) out.push({ response: short.join(', '), why: t`That leaves out the last index, ${p.lo + p.size - 1}. The index set includes both ends.` });
    const firstOnly = uniq(fam[0] as number[]);
    if (firstOnly.join() !== full.join()) out.push({ response: firstOnly.join(', '), why: t`That is ${math`A_{${p.lo}}`} alone. Combine all ${p.size} sets.` });
    const lastOnly = uniq(fam[fam.length - 1] as number[]);
    if (lastOnly.join() !== full.join()) out.push({ response: lastOnly.join(', '), why: t`That is ${math`A_{${p.lo + p.size - 1}}`} alone. Combine all ${p.size} sets.` });
    return out.filter((m, k) => out.findIndex((x) => x.response === m.response) === k);
}

const famGen = generator<FamP>({
  id: 'finite-family',
  skill: 'List the union or intersection of a finite indexed family, as in CST exercise 5.1.5.',
  params: (rng) => {
    for (;;) {
      const p: FamP = { f: int(rng, 0, FAMILIES.length - 1), k: int(rng, 2, 3), lo: int(rng, 1, 4), size: int(rng, 3, 4), op: pick(rng, ['union', 'inter'] as const) };
      const fam = famOf(p);
      const ans = p.op === 'union' ? union(fam) : inter(fam);
      const other = p.op === 'union' ? inter(fam) : union(fam);
      if (ans.length >= 1 && ans.length <= 12 && ans.join() !== other.join() && other.length >= 1 && famMis(p).length >= 2) return p;
    }
  },
  sane: (p) => {
    const ans = p.op === 'union' ? union(famOf(p)) : inter(famOf(p));
    return ans.length >= 1 && ans.length <= 12 ? null : 'the answer must have one to twelve elements';
  },
  problem: (p) => {
    const fam = famOf(p);
    const idx = Array.from({ length: p.size }, (_, j) => p.lo + j);
    const ans = p.op === 'union' ? union(fam) : inter(fam);
    const sym = p.op === 'union' ? math`\bigcup_{i \in I} A_{i}` : math`\bigcap_{i \in I} A_{i}`;
    return {
      prompt: t`Let ${math`I = ${setOf(idx)}`} and, for each ${math`i \in I`}, let ${math`A_{i} = ${(FAMILIES[p.f] as (typeof FAMILIES)[number]).tex(p.k)}`}. List the elements of ${sym}, separated by commas.`,
      answer: setAnswer(ans),
      solution: [
        t`List the sets one index at a time: ${idx.map((i, j) => t`${math`A_{${i}} = ${setOf(uniq(fam[j] as number[]))}`}`).flatMap((r, j) => (j === 0 ? [...r] : [...t`, `, ...r]))}.`,
        p.op === 'union'
          ? t`The union collects everything that is in at least one of them: ${math`${setOf(ans)}`}.`
          : t`The intersection keeps only what is in every one of them: ${math`${setOf(ans)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Membership straight from the definitions, testing every candidate number.
    const fam = famOf(p).map((s) => new Set(s));
    const out: number[] = [];
    for (let x = -5; x <= 40; x++) {
      const hits = fam.filter((s) => s.has(x)).length;
      if (p.op === 'union' ? hits > 0 : hits === fam.length) out.push(x);
    }
    return out.join(', ');
  },
  misconceptions: famMis,
});

type IvKind = 'chain' | 'grow' | 'shrinkTop' | 'window';
interface IvP { kind: IvKind; n: number; k: number }

/** The interval answer [a, b] of each kind, computed by sampling points. */
function ivAnswer({ kind, n, k }: IvP): [number, number] {
  const sets = Array.from({ length: n }, (_, j) => j + 1).map((i): [number, number] => (kind === 'chain' ? [i, i + 1] : kind === 'grow' ? [0, i * k] : kind === 'shrinkTop' ? [-i, k] : [i, i + k]));
  if (kind === 'chain' || kind === 'grow') return [Math.min(...sets.map((s) => s[0])), Math.max(...sets.map((s) => s[1]))];
  return [Math.max(...sets.map((s) => s[0])), Math.min(...sets.map((s) => s[1]))];
}

const ivGen = generator<IvP>({
  id: 'intervals',
  skill: 'Find a union or intersection of a finite family of intervals, and say why it is an interval.',
  params: (rng) => {
    const kind = pick(rng, ['chain', 'grow', 'shrinkTop', 'window'] as const);
    const n = int(rng, 3, 9);
    return { kind, n, k: kind === 'window' ? int(rng, n, n + 4) : int(rng, 1, 4) };
  },
  sane: ({ kind, n, k }) => (n >= 3 && (kind !== 'window' || k >= n) ? null : 'the intersection must not be empty'),
  problem: (p) => {
    const { kind, n, k } = p;
    const [a, b] = ivAnswer(p);
    const what = {
      chain: math`\bigcup_{i = ${1}}^{${n}} [i, i + ${1}]`,
      grow: math`\bigcup_{i = ${1}}^{${n}} [${0}, ${k === 1 ? '' : k}i]`,
      shrinkTop: math`\bigcap_{i = ${1}}^{${n}} [-i, ${k}]`,
      window: math`\bigcap_{i = ${1}}^{${n}} [i, i + ${k}]`,
    }[kind];
    const why = {
      chain: t`Neighbouring intervals ${math`[i, i + ${1}]`} and ${math`[i + ${1}, i + ${2}]`} meet at ${math`i + ${1}`}, so together they cover ${math`[${1}, ${n + 1}]`} with no gap.`,
      grow: t`The intervals are nested, each inside the next, so the union is the largest, ${math`[${0}, ${k * n}]`}.`,
      shrinkTop: t`As ${math`i`} grows the left end moves left, so each interval contains the one before. The intersection is the smallest, the first: ${math`[-${1}, ${k}]`}.`,
      window: t`A point is in every ${math`[i, i + ${k}]`} when it is at least every left end, so at least ${n}, and at most every right end, so at most ${1 + k}.`,
    }[kind];
    return {
      prompt: t`The set ${what} is a closed interval ${math`[a, b]`}. Give ${math`a`} and ${math`b`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['a', 'b'], example: `a = ${a}, b = ${b}`,
        check: ([x, y]) => (x !== undefined && y !== undefined && x.den === 1n && y.den === 1n && Number(x.num) === a && Number(y.num) === b ? null : 'Those are not the ends of the interval.'),
      },
      solution: [why, t`So ${math`a = ${a}`} and ${math`b = ${b}`}.`],
    };
  },
  solve: (p) => {
    // Sample a fine grid of points and keep those in the union or in the intersection.
    const { kind, n, k } = p;
    const sets = Array.from({ length: n }, (_, j) => j + 1).map((i) => (kind === 'chain' ? [i, i + 1] : kind === 'grow' ? [0, i * k] : kind === 'shrinkTop' ? [-i, k] : [i, i + k]) as [number, number]);
    const isUnion = kind === 'chain' || kind === 'grow';
    const pts: number[] = [];
    for (let x = -20; x <= 60; x += 0.5) {
      const hits = sets.filter(([lo, hi]) => x >= lo && x <= hi).length;
      if (isUnion ? hits > 0 : hits === sets.length) pts.push(x);
    }
    return `a = ${Math.min(...pts)}, b = ${Math.max(...pts)}`;
  },
  misconceptions: (p): Misconception[] => {
    const { kind, n, k } = p;
    const [a, b] = ivAnswer(p);
    const swapped = kind === 'chain' ? [n, n + 1] : kind === 'grow' ? [0, k] : kind === 'shrinkTop' ? [-n, k] : [1, n + k];
    return [
      { response: `a = ${swapped[0]}, b = ${swapped[1]}`, why: kind === 'chain' || kind === 'grow' ? t`That is a single member of the family. The union collects all of them.` : t`That is the union, or a single member. The intersection keeps only the points in every interval.` },
      { response: `a = ${b}, b = ${a}`, why: t`The left end ${math`a`} is the smaller number.` },
    ];
  },
});

type InfKind = 'mult' | 'closedShrink' | 'openShrink' | 'rays' | 'grow' | 'upto';
interface InfP { kind: InfKind; k: number; op: 'union' | 'inter' }

const INF: Record<InfKind, { family: (k: number) => Span; options: (k: number) => Span[] }> = {
  mult: { family: (k) => math`A_{n} = \{-${k}n, ${0}, ${k}n\}`, options: (k) => [math`\{${0}\}`, math`\{${k}m : m \in \mathbb{Z}\}`, math`\varnothing`, math`\{-${k}, ${0}, ${k}\}`] },
  closedShrink: { family: () => math`A_{n} = \left[${0}, \tfrac{${1}}{n}\right]`, options: () => [math`\{${0}\}`, math`[${0}, ${1}]`, math`\varnothing`, math`(${0}, ${1}]`] },
  openShrink: { family: () => math`A_{n} = \left(${0}, \tfrac{${1}}{n}\right)`, options: () => [math`\varnothing`, math`(${0}, ${1})`, math`\{${0}\}`, math`[${0}, ${1})`] },
  rays: { family: (k) => math`A_{n} = [${k}n, \infty)`, options: (k) => [math`\varnothing`, math`[${k}, \infty)`, math`\{${0}\}`, math`[${0}, \infty)`] },
  grow: { family: (k) => math`A_{n} = [-${k}n, ${k}n]`, options: (k) => [math`\mathbb{R}`, math`[-${k}, ${k}]`, math`\varnothing`, math`[${0}, \infty)`] },
  upto: { family: () => math`A_{n} = \{${0}, ${1}, ${2}, \ldots, n\}`, options: () => [math`\{${0}, ${1}\}`, math`\{${0}\} \cup \mathbb{N}`, math`\{${0}\}`, math`\mathbb{N}`] },
};

/** For each kind and operation: the index of the right option and of two tempting wrong ones. */
const INF_KEY: Record<InfKind, Record<'union' | 'inter', [number, number, number]>> = {
  mult: { inter: [0, 1, 2], union: [1, 3, 0] },
  closedShrink: { inter: [0, 2, 1], union: [1, 3, 0] },
  openShrink: { inter: [0, 2, 1], union: [1, 3, 0] },
  rays: { inter: [0, 2, 1], union: [1, 3, 0] },
  grow: { inter: [1, 2, 0], union: [0, 1, 3] },
  upto: { inter: [0, 2, 1], union: [1, 3, 0] },
};

const infGen = generator<InfP>({
  id: 'infinite-family',
  skill: 'Find the union or intersection of an infinite family indexed by N = {1, 2, 3, ...}.',
  params: (rng) => ({ kind: pick(rng, ['mult', 'closedShrink', 'openShrink', 'rays', 'grow', 'upto'] as const), k: int(rng, 2, 5), op: pick(rng, ['union', 'inter'] as const) }),
  sane: ({ k }) => (k >= 2 && k <= 5 ? null : 'out of range'),
  problem: ({ kind, k, op }) => {
    const opts = INF[kind].options(k);
    const [right] = INF_KEY[kind][op];
    const options: ChoiceOption[] = opts.map((o, i) => ({ id: `o${i}`, label: t`${o}` }));
    const sym = op === 'union' ? math`\bigcup_{n \in \mathbb{N}} A_{n}` : math`\bigcap_{n \in \mathbb{N}} A_{n}`;
    const sol: Record<InfKind, Record<'union' | 'inter', ReturnType<typeof t>>> = {
      mult: { inter: t`${0} is in every ${math`A_{n}`}, and a nonzero ${mx} is in ${math`A_{n}`} only for ${math`n = |x|/${k}`}, not for every ${math`n`}.`, union: t`Every nonzero multiple ${math`${k}m`} lies in ${math`A_{|m|}`}, and ${0} lies in all of them.` },
      closedShrink: { inter: t`${0} is in every ${math`[${0}, ${1}/n]`}. A positive ${mx} fails once ${math`${1}/n < x`}, that is for ${math`n > ${1}/x`}. So only ${0} is in all of them.`, union: t`The intervals shrink, so the union is the first one, ${math`[${0}, ${1}]`}.` },
      openShrink: { inter: t`${0} is in none of them, and a positive ${mx} drops out once ${math`n > ${1}/x`}. Nothing is in all of them: the intersection is empty, though every ${math`A_{n}`} is non-empty.`, union: t`The intervals shrink, so the union is the first one, ${math`(${0}, ${1})`}.` },
      rays: { inter: t`Any ${mx} fails to be in ${math`[${k}n, \infty)`} once ${math`${k}n > x`}. So no number is in all of them.`, union: t`The rays shrink as ${math`n`} grows, so the union is the first, ${math`[${k}, \infty)`}.` },
      grow: { inter: t`The intervals grow, so the intersection is the first, ${math`[-${k}, ${k}]`}.`, union: t`Any real ${mx} lies in ${math`[-${k}n, ${k}n]`} once ${math`n \ge |x|/${k}`}, so the union is all of ${math`\mathbb{R}`}.` },
      upto: { inter: t`${0} and ${1} are in every ${math`A_{n}`} (the smallest is ${math`A_{${1}} = \{${0}, ${1}\}`}); larger numbers are missing from ${math`A_{${1}}`}.`, union: t`Every natural number ${math`m`} is in ${math`A_{m}`}, and ${0} is in all of them.` },
    };
    return {
      prompt: t`For each ${math`n \in \mathbb{N} = \{${1}, ${2}, ${3}, \ldots\}`}, let ${INF[kind].family(k)}. Which set is ${sym}?`,
      answer: { kind: 'choice', options, correct: `o${right}` },
      solution: [op === 'union' ? t`A point is in the union when it is in at least one ${math`A_{n}`}.` : t`A point is in the intersection when it is in every ${math`A_{n}`}.`, sol[kind][op]],
    };
  },
  solve: ({ kind, k, op }) => {
    // Test sample points against the first 200 sets; the patterns settle long before that.
    const inA = (n: number, x: number): boolean => {
      switch (kind) {
        case 'mult': return x === 0 || Math.abs(x) === k * n;
        case 'closedShrink': return x >= 0 && x <= 1 / n;
        case 'openShrink': return x > 0 && x < 1 / n;
        case 'rays': return x >= k * n;
        case 'grow': return Math.abs(x) <= k * n;
        case 'upto': return Number.isInteger(x) && x >= 0 && x <= n;
      }
    };
    const pts = [-7, -k, -1, 0, 0.01, 0.3, 1, 1.5, 2, k, 7, 10, 50];
    const member = (x: number): boolean => (op === 'union' ? Array.from({ length: 200 }, (_, i) => inA(i + 1, x)).some(Boolean) : Array.from({ length: 200 }, (_, i) => inA(i + 1, x)).every(Boolean));
    const inOpt = (i: number, x: number): boolean => {
      const lists: Record<InfKind, ((x: number) => boolean)[]> = {
        mult: [(y) => y === 0, (y) => Number.isInteger(y / k), () => false, (y) => [-k, 0, k].includes(y)],
        closedShrink: [(y) => y === 0, (y) => y >= 0 && y <= 1, () => false, (y) => y > 0 && y <= 1],
        openShrink: [() => false, (y) => y > 0 && y < 1, (y) => y === 0, (y) => y >= 0 && y < 1],
        rays: [() => false, (y) => y >= k, (y) => y === 0, (y) => y >= 0],
        grow: [() => true, (y) => Math.abs(y) <= k, () => false, (y) => y >= 0],
        upto: [(y) => y === 0 || y === 1, (y) => Number.isInteger(y) && y >= 0, (y) => y === 0, (y) => Number.isInteger(y) && y >= 1],
      };
      return (lists[kind][i] as (x: number) => boolean)(x);
    };
    const i = [0, 1, 2, 3].find((j) => pts.every((x) => inOpt(j, x) === member(x)));
    return [`o${i ?? -1}`];
  },
  misconceptions: ({ kind, k, op }): Misconception[] => {
    const [, w1, w2] = INF_KEY[kind][op];
    void k;
    return [
      { response: [`o${w1}`], why: op === 'union' ? t`Look for the points in at least one ${math`A_{n}`}; that set misses some, or includes points in none.` : t`Check one point of that set against a late ${math`A_{n}`}, with ${math`n`} large: it must be in every one of them.` },
      { response: [`o${w2}`], why: op === 'union' ? t`A union is at least as big as each set in it. Compare with ${math`A_{${1}}`}.` : t`An intersection can be empty even when every set is non-empty, and it can contain an endpoint that every set shares. Test the endpoints separately.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const LET = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const B181: string[][] = [['a', 'b', 'd', 'e', 'g', 'f'], ['a', 'b', 'c', 'd'], ['b', 'd', 'a'], ['a', 'b', 'h']];
const letterOpts: ChoiceOption[] = LET.map((l) => ({ id: l, label: t`${computedTex(l)}` }));
const b181Prompt = (op: 'union' | 'inter') => t`Suppose ${math`A_{${1}} = \{a, b, d, e, g, f\}`}, ${math`A_{${2}} = \{a, b, c, d\}`}, ${math`A_{${3}} = \{b, d, a\}`} and ${math`A_{${4}} = \{a, b, h\}`}. Choose every element of ${op === 'union' ? math`\bigcup_{i = ${1}}^{${4}} A_{i}` : math`\bigcap_{i = ${1}}^{${4}} A_{i}`}.`;

const b181a = auto({
  id: 'b1-8-1-a',
  source: cite('bop', 'Section 1.8, exercise 1(a)'),
  title: t`A union of four sets`,
  prompt: b181Prompt('union'),
  answer: { kind: 'choice', options: letterOpts, correct: LET },
  solution: [
    t`${math`\bigcup_{i = ${1}}^{${4}} A_{i} = A_{${1}} \cup A_{${2}} \cup A_{${3}} \cup A_{${4}}`}: everything in at least one of the four.`,
    t`${math`A_{${1}}`} gives ${math`a, b, d, e, f, g`}; ${math`A_{${2}}`} adds ${math`c`}; ${math`A_{${3}}`} adds nothing new; ${math`A_{${4}}`} adds ${math`h`}. So the union is ${math`\{a, b, c, d, e, f, g, h\}`}.`,
  ],
  reference: LET,
  verify: () => same('union', [...new Set(B181.flat())].sort().join(''), 'abcdefgh'),
  misconceptions: [
    { response: ['a', 'b'], why: t`That is the intersection: what all four share. The union takes what is in any of them.` },
    { response: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], why: t`${math`h`} is in ${math`A_{${4}}`}, so it is in the union.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.8, exercise 1(a)'), answer: LET, agrees: true },
});

const b181b = auto({
  id: 'b1-8-1-b',
  source: cite('bop', 'Section 1.8, exercise 1(b)'),
  title: t`An intersection of four sets`,
  prompt: b181Prompt('inter'),
  answer: { kind: 'choice', options: letterOpts, correct: ['a', 'b'] },
  solution: [t`An element of the intersection is in all four sets. ${math`A_{${4}} = \{a, b, h\}`} leaves only ${math`a, b, h`} to test; ${math`h`} is not in ${math`A_{${1}}`}; ${math`a`} and ${math`b`} are in all four. So the intersection is ${math`\{a, b\}`}.`],
  reference: ['a', 'b'],
  verify: () => same('intersection', LET.filter((l) => B181.every((s) => s.includes(l))).join(''), 'ab'),
  misconceptions: [
    { response: ['a', 'b', 'd'], why: t`${math`d`} is not in ${math`A_{${4}} = \{a, b, h\}`}, so it is not in every set.` },
    { response: LET, why: t`That is the union. The intersection keeps only what all four share.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.8, exercise 1(b)'), answer: ['a', 'b'], agrees: true },
});

const b185 = auto({
  id: 'b1-8-5',
  source: cite('bop', 'Section 1.8, exercise 5'),
  title: t`Unit intervals end to end`,
  prompt: t`With ${math`\mathbb{N} = \{${1}, ${2}, ${3}, \ldots\}`}, find ${math`\bigcup_{i \in \mathbb{N}} [i, i + ${1}]`} and ${math`\bigcap_{i \in \mathbb{N}} [i, i + ${1}]`}.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'r', label: t`${math`[${1}, \infty)`} and ${math`\varnothing`}` },
      { id: 'w1', label: t`${math`[${1}, \infty)`} and ${math`\{${2}\}`}` },
      { id: 'w2', label: t`${math`\mathbb{N}`} and ${math`\varnothing`}` },
      { id: 'w3', label: t`${math`[${1}, ${2}]`} and ${math`\varnothing`}` },
    ],
    correct: 'r',
  },
  solution: [
    t`Union: each ${math`[i, i + ${1}]`} lies in ${math`[${1}, \infty)`}. Conversely, if ${math`x \ge ${1}`}, let ${math`i`} be the largest natural number with ${math`i \le x`}; then ${math`x < i + ${1}`}, so ${math`x \in [i, i + ${1}]`}. So the union is ${math`[${1}, \infty)`}.`,
    t`Intersection: a point in every ${math`[i, i + ${1}]`} would be in ${math`[${1}, ${2}]`} and in ${math`[${3}, ${4}]`}, which share nothing. So it is ${math`\varnothing`}. (Neighbours such as ${math`[${1}, ${2}]`} and ${math`[${2}, ${3}]`} share ${2}, but ${2} is not in ${math`[${3}, ${4}]`}.)`,
  ],
  reference: 'r',
  verify: () => {
    const inU = (x: number) => Array.from({ length: 100 }, (_, i) => i + 1).some((i) => x >= i && x <= i + 1);
    const inI = (x: number) => Array.from({ length: 100 }, (_, i) => i + 1).every((i) => x >= i && x <= i + 1);
    const pts = [0.5, 1, 1.5, 2, 2.5, 7.25, 50];
    return same('union [1, inf) and empty intersection', pts.every((x) => inU(x) === x >= 1) && pts.every((x) => !inI(x)), true);
  },
  misconceptions: [
    { response: 'w1', why: t`${2} is in ${math`[${1}, ${2}]`} and ${math`[${2}, ${3}]`} but not in ${math`[${3}, ${4}]`}: the intersection needs every interval.` },
    { response: 'w2', why: t`The union holds the whole intervals, so non-integers such as ${math`${1}.${5}`} too.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.8, exercise 5'), answer: 'r', agrees: true },
});

const b189 = auto({
  id: 'b1-8-9',
  source: cite('bop', 'Section 1.8, exercise 9'),
  title: t`All the subsets of the natural numbers`,
  prompt: t`Find ${math`\bigcup_{X \in \mathcal{P}(\mathbb{N})} X`} and ${math`\bigcap_{X \in \mathcal{P}(\mathbb{N})} X`}. (Here the index set is ${math`\mathcal{P}(\mathbb{N})`}, and each set is indexed by itself.)`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'r', label: t`${math`\mathbb{N}`} and ${math`\varnothing`}` },
      { id: 'w1', label: t`${math`\mathcal{P}(\mathbb{N})`} and ${math`\varnothing`}` },
      { id: 'w2', label: t`${math`\mathbb{N}`} and ${math`\{${1}\}`}` },
    ],
    correct: 'r',
  },
  solution: [
    t`Every ${math`X`} is a subset of ${math`\mathbb{N}`}, so the union is inside ${math`\mathbb{N}`}; and ${math`\mathbb{N}`} itself is one of the ${math`X`}, so the union is ${math`\mathbb{N}`}.`,
    t`${math`\varnothing`} is one of the ${math`X`}, and nothing is in it, so nothing is in every ${math`X`}: the intersection is ${math`\varnothing`}.`,
  ],
  reference: 'r',
  verify: () => {
    // The same argument on N cut down to {1, 2, 3, 4}.
    const N = [1, 2, 3, 4];
    const subs = N.reduce<number[][]>((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]]);
    return same('union and intersection', `${union(subs).join()}|${inter(subs).join()}`, '1,2,3,4|');
  },
  misconceptions: [
    { response: 'w1', why: t`The union collects elements of the sets ${math`X`}, which are numbers. It is a set of numbers, not of sets.` },
    { response: 'w2', why: t`The empty set is one of the ${math`X`}, so the intersection must be inside it.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.8, exercise 9'), answer: 'r', agrees: true },
});

const SW515: number[][] = [2, 3, 4, 5].map((i) => [i, i + 1, i - 1, 2 * i]);

const sw515u = auto({
  id: 'sw-5-1-5-union',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.5'),
  title: t`The CST family: its union`,
  prompt: t`Let ${math`I = \{${2}, ${3}, ${4}, ${5}\}`} and, for each ${math`i \in I`}, let ${math`A_{i} = \{i, i + ${1}, i - ${1}, ${2}i\}`}. List the elements of each ${math`A_{i}`}, then give ${math`\bigcup_{i \in I} A_{i}`}, its elements separated by commas.`,
  answer: setAnswer(union(SW515)),
  solution: [
    t`${math`A_{${2}} = ${setOf(uniq(SW515[0] as number[]))}`}, ${math`A_{${3}} = ${setOf(uniq(SW515[1] as number[]))}`}, ${math`A_{${4}} = ${setOf(uniq(SW515[2] as number[]))}`}, ${math`A_{${5}} = ${setOf(uniq(SW515[3] as number[]))}`}.`,
    t`The union is everything that appears at least once: ${math`${setOf(union(SW515))}`}.`,
  ],
  reference: union(SW515).join(', '),
  verify: () => same('union', union(SW515).join(','), '1,2,3,4,5,6,8,10'),
  misconceptions: [
    { response: '4', why: t`That is the intersection. The union keeps everything that is in some ${math`A_{i}`}.` },
    { response: '1, 2, 3, 4, 5, 6', why: t`The doubles ${math`${2}i`} are in the sets too: ${8} and ${10}.` },
  ],
});

const sw515i = auto({
  id: 'sw-5-1-5-inter',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.5'),
  title: t`The CST family: its intersection`,
  prompt: t`With ${math`I = \{${2}, ${3}, ${4}, ${5}\}`} and ${math`A_{i} = \{i, i + ${1}, i - ${1}, ${2}i\}`}, give ${math`\bigcap_{i \in I} A_{i}`}, its elements separated by commas.`,
  answer: setAnswer(inter(SW515)),
  solution: [
    t`${math`A_{${2}} = ${setOf(uniq(SW515[0] as number[]))}`} and ${math`A_{${5}} = ${setOf(uniq(SW515[3] as number[]))}`} share only ${4}.`,
    t`${4} is also in ${math`A_{${3}}`} (as ${math`${3} + ${1}`}) and in ${math`A_{${4}}`}. So the intersection is ${math`\{${4}\}`}.`,
  ],
  reference: '4',
  verify: () => same('intersection', inter(SW515).join(','), '4'),
  misconceptions: [{ response: '3, 4', why: t`${3} is not in ${math`A_{${5}} = \{${4}, ${5}, ${6}, ${10}\}`}.` }],
});

const b1811 = supervision({
  id: 'b1-8-11',
  source: cite('bop', 'Section 1.8, exercise 11'),
  title: t`Is the intersection inside the union?`,
  prompt: t`Is ${math`\bigcap_{\alpha \in I} A_{\alpha} \subseteq \bigcup_{\alpha \in I} A_{\alpha}`} always true for any collection of sets ${math`A_{\alpha}`} with index set ${mI}? Explain, and say what goes wrong if ${mI} is allowed to be empty.`,
  writeUp: 'explanation',
  official: cite('bop', 'Solutions, Section 1.8, exercise 11'),
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

// ---------------------------------------------------------------- lesson

const EXF = [1, 2, 3].map((i) => [i, i + 1, 2 * i]);

export const indexedSets: TopicContent = {
  topicId: 'sets.indexed',
  goal: t`Write unions and intersections over an index set, such as ${math`\bigcup_{n \in \mathbb{N}} [n, n + ${1}]`}, and compute them.`,
  objective: t`Read and compute unions and intersections of a whole family of sets.`,
  why: t`Limits, events in probability, and topology all speak in unions over infinite families.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Many sets at once` },
    { kind: 'hook', text: t`Take the intervals ${math`(${0}, ${1})`}, ${math`(${0}, \tfrac{${1}}{${2}})`}, ${math`(${0}, \tfrac{${1}}{${3}})`}, and so on forever. Every one of them contains infinitely many numbers. Which numbers are in all of them? The answer is: none at all.` },
    { kind: 'narrative', text: t`To ask that question we need to talk about infinitely many sets at once, and ${math`A_{${1}} \cap A_{${2}} \cap A_{${3}} \cap \cdots`} with dots is too vague to reason with. So we label the sets by the elements of another set, the index set, and define union and intersection over all the labels in one go.` },
    {
      kind: 'definition',
      name: t`Indexed family, union, intersection`,
      formal: t`Let ${mI} be a set, and for each ${math`\alpha \in I`} let ${math`A_{\alpha}`} be a set. This is an [[indexed-family|indexed family]] with [[index-set|index set]] ${mI}. Its union and intersection are ${dmath`\bigcup_{\alpha \in I} A_{\alpha} = \{x : x \in A_{\alpha} \text{ for some } \alpha \in I\}, \qquad \bigcap_{\alpha \in I} A_{\alpha} = \{x : x \in A_{\alpha} \text{ for every } \alpha \in I\}.`} When ${math`I = \{${1}, \ldots, n\}`} we also write ${math`\bigcup_{i = ${1}}^{n} A_{i}`}, and similarly for ${math`\bigcap`}.`,
      plain: t`The union is everything in at least one of the sets; the intersection is what all of them share. With ${math`A_{i} = \{i, i + ${1}, ${2}i\}`} for ${math`i \in \{${1}, ${2}, ${3}\}`}: the sets are ${EXF.map((s, j) => t`${math`${setOf(uniq(s))}`}${j < 2 ? t`, ` : t``}`).flatMap((r) => [...r])}, the union is ${math`${setOf(union(EXF))}`}, and the intersection is ${math`${setOf(inter(EXF))}`}.`,
    },
    { kind: 'p', text: t`Notice the two quantifiers: "for some" in the union, "for every" in the intersection. Every computation below is one of those two checks, done carefully. In this lesson ${math`\mathbb{N} = \{${1}, ${2}, ${3}, \ldots\}`}, as in Book of Proof.` },
    quickCheck({ prompt: t`For ${math`i \in \{${1}, ${2}, ${3}\}`} let ${math`A_{i} = \{${0}, i\}`}. How many elements does ${math`\bigcup_{i = ${1}}^{${3}} A_{i}`} have?`, answer: { kind: 'exact', expected: '4' }, reference: '4', why: t`The union is ${math`\{${0}, ${1}, ${2}, ${3}\}`}: ${0} is shared, and each set adds its own ${math`i`}.` }),
    { kind: 'section', title: t`Infinite families` },
    { kind: 'narrative', text: t`With infinitely many sets you cannot list them all, so you argue. To show a set ${mx} is in the union, find one index that works. To show ${mx} is not in the intersection, find one index where it fails. Here is the hook made precise.` },
    { kind: 'theorem', name: t`Shrinking open intervals`, statement: t`${math`\bigcap_{n \in \mathbb{N}} \left(${0}, \tfrac{${1}}{n}\right) = \varnothing`}, while ${math`\bigcap_{n \in \mathbb{N}} \left[${0}, \tfrac{${1}}{n}\right] = \{${0}\}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Nothing at or below zero`, text: t`If ${math`x \le ${0}`}, then ${math`x \notin (${0}, ${1})`}, the set with ${math`n = ${1}`}, so ${mx} is not in the first intersection.` },
        { label: t`A positive number drops out`, text: t`If ${math`x > ${0}`}, choose a natural number ${math`n > \tfrac{${1}}{x}`}. Then ${math`\tfrac{${1}}{n} < x`}, so ${math`x \notin \left(${0}, \tfrac{${1}}{n}\right)`}.`, why: { q: t`Why does such an ${math`n`} exist?`, a: t`The natural numbers are unbounded: for any real number there is a larger natural number. For ${math`x = ${q(1, 100)}`} take ${math`n = ${101}`}.` } },
        { label: t`So the first is empty`, text: t`No real number is in every ${math`\left(${0}, \tfrac{${1}}{n}\right)`}: the intersection is ${math`\varnothing`}.` },
        { label: t`The closed version keeps zero`, text: t`${0} lies in every ${math`\left[${0}, \tfrac{${1}}{n}\right]`}, and the same two arguments remove every other number. So that intersection is ${math`\{${0}\}`}.` },
      ],
    },
    { kind: 'p', text: t`Unions go the other way. ${math`\bigcup_{n \in \mathbb{N}} [-n, n] = \mathbb{R}`}: each interval lies in ${math`\mathbb{R}`}, and any real ${mx} lies in ${math`[-n, n]`} as soon as the natural number ${math`n`} is at least ${math`|x|`} (for ${math`x = -${7}.${5}`}, take ${math`n = ${8}`}). Two inclusions, as always for set equality. For the union one index that works is enough; there is no need for ${mx} to be in every interval.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If every set in a family is non-empty, so is their intersection.`, counterexample: t`Each ${math`\left(${0}, \tfrac{${1}}{n}\right)`} is non-empty, but their intersection is empty, as proved above. A nested family of non-empty sets can still shrink to nothing.` },
    { kind: 'pitfall', claim: t`${5} is in ${math`\bigcap_{n \in \mathbb{N}} [n, n + ${3}]`}, since it is in ${math`[${3}, ${6}]`}, ${math`[${4}, ${7}]`} and ${math`[${5}, ${8}]`}.`, counterexample: t`The intersection needs every index: ${math`${5} \notin [${6}, ${9}]`}. So ${5} is not in it; in fact every number drops out once ${math`n`} passes it, and the intersection is empty.` },
    { kind: 'pitfall', claim: t`${math`\bigcup_{n \in \mathbb{N}} \{n\} = \{\{${1}\}, \{${2}\}, \{${3}\}, \ldots\}`}.`, counterexample: t`The union collects the elements of the sets ${math`\{n\}`}, which are numbers, so the union is ${math`\{${1}, ${2}, ${3}, \ldots\} = \mathbb{N}`}, a set of numbers. The set of sets ${math`\{\{${1}\}, \{${2}\}, \ldots\}`} is the family itself, not its union.` },
    { kind: 'takeaway', text: t`A union over ${mI} asks "in some ${math`A_{\alpha}`}?"; an intersection asks "in every ${math`A_{\alpha}`}?"; answer each with one witness index or a general argument.` },
  ],
  examples: [
    workedCambridge(b181a),
    worked(famGen, { f: 0, k: 2, lo: 1, size: 3, op: 'inter' }, t`An intersection by hand`),
    worked(infGen, { kind: 'rays', k: 2, op: 'inter' }, t`Rays that run away`),
  ],
  generators: [famGen, ivGen, infGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['indexed-family', 'index-set'],
  cambridge: withUses([sw515u, sw515i, b181b, b185, b189, b1811], {
    'sw-5-1-5-inter': { sections: ['Many sets at once'], note: t`Listing each set of a family, then what every one of them shares` },
    'sw-5-1-5-union': { sections: ['Many sets at once'], note: t`Listing each set of a family, then everything in at least one of them` },
  }),
  // The CST proofs (5.2.6, 5.2.7, 5.3.1) are set in proof.set-proofs, where proofs about sets are taught
  // (Rule 1, 2026-10-08); the intersection and union of the 5.1.5 family gate.
  gate: ['sw-5-1-5-inter', 'sw-5-1-5-union'],
  recall: [
    { front: t`Define ${math`\bigcup_{\alpha \in I} A_{\alpha}`} and ${math`\bigcap_{\alpha \in I} A_{\alpha}`}.`, back: t`The ${mx} in ${math`A_{\alpha}`} for some ${math`\alpha \in I`}; the ${mx} in ${math`A_{\alpha}`} for every ${math`\alpha \in I`}.` },
    { front: t`What is ${math`\bigcap_{n \in \mathbb{N}} (${0}, \tfrac{${1}}{n})`}, and why?`, back: t`${math`\varnothing`}: a positive ${mx} is not in ${math`(${0}, \tfrac{${1}}{n})`} once ${math`n > \tfrac{${1}}{x}`}.` },
  ],
  proofOrder: [
    {
      title: t`Why ${math`\bigcap_{n} (${0}, \tfrac{${1}}{n})`} is empty`,
      steps: [
        t`Take any real ${mx}; we show it misses some ${math`(${0}, \tfrac{${1}}{n})`}.`,
        t`If ${math`x \le ${0}`}, it misses ${math`(${0}, ${1})`}.`,
        t`If ${math`x > ${0}`}, choose a natural number ${math`n > \tfrac{${1}}{x}`}.`,
        t`Then ${math`\tfrac{${1}}{n} < x`}, so ${mx} misses ${math`(${0}, \tfrac{${1}}{n})`}.`,
      ],
    },
  ],
};
