/**
 * sets.cartesian-product: ordered pairs and the Cartesian product, |A x B| = |A||B|, and
 * products of intervals drawn in the plane. The lesson follows Book of Proof, Section 1.2;
 * the problems are its exercises (checked against the book's solutions to the odd ones),
 * CST Discrete Mathematics supervision exercises 5.1.4 and 5.2.4 (prove or disprove five
 * statements about products, checked by brute force over small sets), and Book of Proof
 * Chapter 8, exercise 16.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, sample } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, paren, t, type Span } from '../rich';
import { quickCheck, worked, workedProof, type TopicContent } from '../topic';

const [mA, mB, mC] = [math`A`, math`B`, math`C`];
type Item = number | string;
const texSet = (xs: readonly Item[]): Span => computedTex(xs.length === 0 ? '\\varnothing' : `\\{${xs.join(', ')}\\}`);
const texPair = (a: Item, b: Item): Span => computedTex(`(${a}, ${b})`);
const product = <X, Y>(xs: readonly X[], ys: readonly Y[]): [X, Y][] => xs.flatMap((x) => ys.map((y): [X, Y] => [x, y]));

// ---------------------------------------------------------------- generators

type SizeKind = 'AxB' | 'AxA' | 'AxBxC' | 'power';
interface SizeP { kind: SizeKind; a: number; b: number; c: number }
const NUMS = [1, 2, 3, 4, 5, 6, 7];
const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const firstN = (xs: readonly Item[], n: number): Item[] => xs.slice(0, n);

const sizeGen = generator<SizeP>({
  id: 'size',
  skill: 'Count a Cartesian product: |A x B| = |A||B|, and |A^n| = |A|^n.',
  quick: true,
  params: (rng) => {
    const kind = pick(rng, ['AxB', 'AxA', 'AxBxC', 'power'] as const);
    const b = int(rng, 2, 5);
    // With two choices in two places, adding and multiplying agree, so the slip would not show.
    return { kind, a: int(rng, 3, 6), b, c: b === 2 ? int(rng, 3, 4) : int(rng, 2, 4) };
  },
  sane: ({ a, b, c }) => (a >= 3 && a <= 6 && b >= 2 && b <= 5 && c >= 2 && c <= 7 && !(b === 2 && c === 2) ? null : 'out of range'),
  problem: ({ kind, a, b, c }) => {
    const A = firstN(NUMS, a);
    const B = firstN(LETTERS, b);
    const C = firstN(['x', 'y', 'z', 'w'], c);
    const [what, v, sol] = {
      AxB: [math`|A \times B|`, a * b, t`Each of the ${a} first entries pairs with each of the ${b} second entries: ${math`${a} \times ${b} = ${a * b}`} ordered pairs.`],
      AxA: [math`|A \times A|`, a * a, t`Both entries come from ${mA}, independently, and ${math`(${1}, ${2}) \neq (${2}, ${1})`}: ${math`${a} \times ${a} = ${a * a}`}.`],
      AxBxC: [math`|A \times B \times C|`, a * b * c, t`Ordered triples, one entry from each set: ${math`${a} \times ${b} \times ${c} = ${a * b * c}`}.`],
      power: [math`|B^{${c}}|`, b ** c, t`${math`B^{${c}}`} is the set of ordered lists of length ${c} with entries in ${mB}: ${math`${b}^{${c}} = ${b ** c}`}.`],
    }[kind] as [Span, number, ReturnType<typeof t>];
    return {
      prompt: t`Let ${math`A = ${texSet(A)}`}, ${math`B = ${texSet(B)}`} and ${math`C = ${texSet(C)}`}. Find ${what}.`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [sol],
    };
  },
  solve: ({ kind, a, b, c }) => {
    const A = firstN(NUMS, a);
    const B = firstN(LETTERS, b);
    const C = firstN(['x', 'y', 'z', 'w'], c);
    if (kind === 'AxB') return String(product(A, B).length);
    if (kind === 'AxA') return String(product(A, A).length);
    if (kind === 'AxBxC') return String(product(product(A, B), C).length);
    let lists: Item[][] = [[]];
    for (let i = 0; i < c; i++) lists = lists.flatMap((l) => B.map((x) => [...l, x]));
    return String(lists.length);
  },
  misconceptions: ({ kind, a, b, c }): Misconception[] => {
    const v = kind === 'AxB' ? a * b : kind === 'AxA' ? a * a : kind === 'AxBxC' ? a * b * c : b ** c;
    const add = kind === 'AxB' ? a + b : kind === 'AxA' ? a + a : kind === 'AxBxC' ? a + b + c : b * c;
    const out: Misconception[] = [{ response: String(add), why: kind === 'power' ? t`That multiplies ${b} by ${c}. Each of the ${c} places has ${b} choices, so the choices multiply: ${math`${b}^{${c}}`}.` : t`A product multiplies the sizes: every element of one set pairs with every element of the other.` }];
    if (kind === 'AxA') out.push({ response: String((a * (a + 1)) / 2), why: t`That counts pairs as if ${math`(x, y)`} and ${math`(y, x)`} were the same. In an ordered pair the order matters.` });
    if (kind === 'power') out.push({ response: String(b ** (c - 1)), why: t`There are ${c} places, each with ${b} choices: the exponent is ${c}.` });
    if (kind === 'power') out.push({ response: String(c ** b), why: t`The base is the number of choices for one place, ${b}, and the exponent the number of places, ${c}.` });
    if (kind === 'AxBxC') out.push({ response: String(a * b), why: t`A triple has an entry from ${mC} as well: multiply by ${c}.` });
    if (kind === 'AxB') out.push({ response: String(a * b * 2), why: t`${math`A \times B`} holds only pairs with first entry in ${mA}. The pairs ${math`(b, a)`} belong to ${math`B \times A`}.` });
    return out;
  },
});

interface PairsP { A: number[]; B: string[]; cands: [Item, Item][] }

const pairsGen = generator<PairsP>({
  id: 'which-pairs',
  skill: 'Decide which ordered pairs belong to A x B: first entry from A, second from B.',
  params: (rng) => {
    const A = sample(rng, NUMS, 3).sort((x, y) => x - y);
    const B = sample(rng, LETTERS.slice(0, 4), 2).sort();
    const notA = NUMS.filter((x) => !A.includes(x));
    const good = sample(rng, product(A, B), 2) as [Item, Item][];
    const rev = (sample(rng, product(B, A), 2) as [Item, Item][]);
    const bad: [Item, Item] = [pick(rng, notA), pick(rng, B)];
    const cands = sample(rng, [...good, ...rev, bad], 5);
    return { A, B, cands };
  },
  sane: ({ cands }) => (cands.length === 5 ? null : 'five candidate pairs'),
  problem: ({ A, B, cands }) => {
    const options: ChoiceOption[] = cands.map(([x, y], i) => ({ id: `p${i}`, label: t`${math`${texPair(x, y)}`}` }));
    const ok = (x: Item, y: Item): boolean => typeof x === 'number' && A.includes(x) && typeof y === 'string' && B.includes(y);
    return {
      prompt: t`Let ${math`A = ${texSet(A)}`} and ${math`B = ${texSet(B)}`}. Which of these are elements of ${math`A \times B`}? Choose all that are.`,
      answer: { kind: 'choice', options, correct: cands.flatMap(([x, y], i) => (ok(x, y) ? [`p${i}`] : [])) },
      solution: [
        t`${math`A \times B = \{(a, b) : a \in A, b \in B\}`}: the first entry must come from ${mA} and the second from ${mB}.`,
        t`A pair with a letter first belongs to ${math`B \times A`}, not ${math`A \times B`}; a pair whose first entry is not in ${mA} belongs to neither.`,
      ],
    };
  },
  solve: ({ A, B, cands }) => {
    const all = product(A, B).map(([x, y]) => `${x}|${y}`);
    return cands.flatMap(([x, y], i) => (all.includes(`${x}|${y}`) ? [`p${i}`] : []));
  },
  misconceptions: ({ A, B, cands }): Misconception[] => [
    { response: cands.flatMap(([x, y], i) => ((A.includes(x as number) && B.includes(y as string)) || (A.includes(y as number) && B.includes(x as string)) ? [`p${i}`] : [])), why: t`Order matters in a pair: ${math`(a, ${1})`} is not ${math`(${1}, a)`}. In ${math`A \times B`} the first entry comes from ${mA}.` },
    { response: cands.flatMap(([x, y], i) => (B.includes(x as string) && A.includes(y as number) ? [`p${i}`] : [])), why: t`Those are elements of ${math`B \times A`}. The first set named gives the first entry.` },
  ],
});

interface RectP { a: number; b: number; c: number; d: number }

const rectGen = generator<RectP>({
  id: 'rectangle',
  skill: 'Draw a product of two intervals as a rectangle in the plane and find its area.',
  params: (rng) => {
    const a = int(rng, -3, 2);
    const c = int(rng, -3, 2);
    for (;;) {
      const [w, h] = [int(rng, 1, 4), int(rng, 1, 4)];
      // A two by two or four by four square has area equal to its half perimeter or perimeter; skip them.
      if (w !== h || w === 1 || w === 3) return { a, b: a + w, c, d: c + h };
    }
  },
  sane: ({ a, b, c, d }) => (b > a && d > c ? null : 'intervals must have positive length'),
  problem: ({ a, b, c, d }) => ({
    prompt: t`Sketch ${math`[${a}, ${b}] \times [${c}, ${d}]`} in the ${math`xy`}-plane. What is the area of the region?`,
    answer: { kind: 'exact', expected: String((b - a) * (d - c)) },
    solution: [
      t`The product is ${math`\{(x, y) : ${a} \le x \le ${b},\ ${c} \le y \le ${d}\}`}: the first interval gives the ${math`x`} values, the second the ${math`y`} values. That is a filled rectangle.`,
      t`Its width is ${math`${b} - ${paren(a)} = ${b - a}`} and its height ${math`${d} - ${paren(c)} = ${d - c}`}, so the area is ${math`${b - a} \times ${d - c} = ${(b - a) * (d - c)}`}.`,
    ],
  }),
  solve: ({ a, b, c, d }) => {
    // Count unit squares [i, i + 1] x [j, j + 1] inside the rectangle.
    let n = 0;
    for (let i = a; i < b; i++) for (let j = c; j < d; j++) n++;
    return String(n);
  },
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: String((b - a) + (d - c)), why: t`That adds the side lengths. Area is width times height.` },
    { response: String(b * d - a * c), why: t`Use the lengths of the intervals, ${math`b - a`} and ${math`d - c`}, not products of their endpoints.` },
    { response: String(2 * ((b - a) + (d - c))), why: t`That is the perimeter. The product is the filled rectangle, so its size is the area.` },
  ],
});

interface DistP { a: number; b: number; c: number; both: number }

const distGen = generator<DistP>({
  id: 'product-of-union',
  skill: 'Count A x (B union C) by the distributive law: |A| times |B union C|.',
  params: (rng) => {
    const b = int(rng, 2, 6);
    const c = int(rng, 2, 6);
    return { a: int(rng, 2, 5), b, c, both: int(rng, 1, Math.min(b, c) - 1) };
  },
  sane: ({ b, c, both }) => (both >= 1 && both < Math.min(b, c) ? null : 'overlap out of range'),
  problem: ({ a, b, c, both }) => {
    const u = b + c - both;
    return {
      prompt: t`${math`|A| = ${a}`}, ${math`|B| = ${b}`}, ${math`|C| = ${c}`} and ${math`|B \cap C| = ${both}`}. Find ${math`|A \times (B \cup C)|`}.`,
      answer: { kind: 'exact', expected: String(a * u) },
      solution: [
        t`First ${math`|B \cup C| = |B| + |C| - |B \cap C| = ${b} + ${c} - ${both} = ${u}`}: the shared elements were counted twice.`,
        t`Then ${math`|A \times (B \cup C)| = |A| \cdot |B \cup C| = ${a} \times ${u} = ${a * u}`}. Equivalently ${math`A \times (B \cup C) = (A \times B) \cup (A \times C)`}, and the overlap ${math`A \times (B \cap C)`} has ${a * both} pairs.`,
      ],
    };
  },
  solve: ({ a, b, c, both }) => {
    // Build B and C on integers with the given overlap, then count pairs.
    const B = Array.from({ length: b }, (_, i) => i);
    const C = Array.from({ length: c }, (_, i) => i + b - both);
    const U = [...new Set([...B, ...C])];
    return String(product(Array.from({ length: a }, (_, i) => i), U).length);
  },
  misconceptions: ({ a, b, c, both }): Misconception[] => [
    { response: String(a * (b + c)), why: t`The ${both} shared elements of ${mB} and ${mC} are counted twice. Use ${math`|B \cup C| = ${b + c - both}`}.` },
    { response: String(a + b + c - both), why: t`A product multiplies: each element of ${mA} pairs with each of the ${b + c - both} elements of ${math`B \cup C`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const b121 = workedProof({
  title: t`Listing products`,
  prompt: t`Book of Proof, Section ${1}.${2}, exercise ${1}: suppose ${math`A = \{${1}, ${2}, ${3}, ${4}\}`} and ${math`B = \{a, c\}`}. Write out (a) ${math`A \times B`}, (d) ${math`B \times B`}, (e) ${math`\varnothing \times B`}, and (h) ${math`B^{${3}}`}, listing elements between braces.`,
  steps: [
    t`(a) First entries from ${mA}, second from ${mB}: ${math`A \times B = \{(${1}, a), (${1}, c), (${2}, a), (${2}, c), (${3}, a), (${3}, c), (${4}, a), (${4}, c)\}`}, ${math`${4} \times ${2} = ${8}`} pairs.`,
    t`(d) ${math`B \times B = \{(a, a), (a, c), (c, a), (c, c)\}`}. Both ${math`(a, c)`} and ${math`(c, a)`} appear: order matters.`,
    t`(e) A pair ${math`(x, b)`} would need ${math`x \in \varnothing`}, and there is no such ${math`x`}. So ${math`\varnothing \times B = \varnothing`}.`,
    t`(h) ${math`B^{${3}} = B \times B \times B`}, the ordered triples from ${mB}: ${math`(a, a, a), (a, a, c), (a, c, a), (a, c, c), (c, a, a), (c, a, c), (c, c, a), (c, c, c)`}, ${math`${2}^{${3}} = ${8}`} of them.`,
  ],
  answer: t`${8} pairs; ${4} pairs; the empty set; ${8} triples, as listed.`,
  source: cite('bop', 'Section 1.2, exercise 1'),
});

const b128 = auto({
  id: 'b1-2-8',
  source: cite('bop', 'Section 1.2, exercise 8'),
  title: t`A Cartesian power`,
  prompt: t`How many elements does ${math`\{${0}, ${1}\}^{${4}}`} have? (The exercise asks for them listed; count them first.)`,
  answer: { kind: 'exact', expected: String(2 ** 4) },
  solution: [
    t`${math`\{${0}, ${1}\}^{${4}}`} is the set of ordered lists of length ${4} with entries ${0} or ${1}, from ${math`(${0}, ${0}, ${0}, ${0})`} to ${math`(${1}, ${1}, ${1}, ${1})`}.`,
    t`Two choices in each of ${4} places: ${math`${2}^{${4}} = ${16}`}.`,
  ],
  reference: '16',
  verify: () => {
    let lists: number[][] = [[]];
    for (let i = 0; i < 4; i++) lists = lists.flatMap((l) => [[...l, 0], [...l, 1]]);
    return same('size of {0,1}^4', lists.length, 16);
  },
  misconceptions: [
    { response: '8', why: t`That is ${math`${2} \times ${4}`}. The choices multiply: ${math`${2} \times ${2} \times ${2} \times ${2}`}.` },
    { response: '4', why: t`The set has ordered lists of length ${4} as its elements, not ${4} elements.` },
  ],
});

const b125 = auto({
  id: 'b1-2-5',
  source: cite('bop', 'Section 1.2, exercise 5'),
  title: t`Products of solution sets`,
  prompt: t`Which of these are elements of ${math`\{x \in \mathbb{R} : x^{${2}} = ${2}\} \times \{x \in \mathbb{R} : |x| = ${2}\}`}? Choose all that are.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'a', label: t`${math`(\sqrt{${2}}, ${2})`}` },
      { id: 'b', label: t`${math`(-\sqrt{${2}}, -${2})`}` },
      { id: 'c', label: t`${math`(${2}, \sqrt{${2}})`}` },
      { id: 'd', label: t`${math`(\sqrt{${2}}, -${2})`}` },
      { id: 'e', label: t`${math`(${2}, ${2})`}` },
    ],
    correct: ['a', 'b', 'd'],
  },
  solution: [
    t`The first set is ${math`\{-\sqrt{${2}}, \sqrt{${2}}\}`} and the second is ${math`\{-${2}, ${2}\}`}.`,
    t`So the product has ${4} pairs: ${math`(-\sqrt{${2}}, -${2}), (\sqrt{${2}}, ${2}), (-\sqrt{${2}}, ${2}), (\sqrt{${2}}, -${2})`}. The pair ${math`(${2}, \sqrt{${2}})`} has its entries the wrong way round, and ${math`(${2}, ${2})`} has a first entry whose square is ${4}, not ${2}.`,
  ],
  reference: ['a', 'b', 'd'],
  verify: () => {
    const X = [-Math.SQRT2, Math.SQRT2];
    const Y = [-2, 2];
    const cand: Record<string, [number, number]> = { a: [Math.SQRT2, 2], b: [-Math.SQRT2, -2], c: [2, Math.SQRT2], d: [Math.SQRT2, -2], e: [2, 2] };
    const inX = (v: number) => X.some((x) => Math.abs(x - v) < 1e-12);
    return same('members', Object.entries(cand).filter(([, [x, y]]) => inX(x) && Y.includes(y)).map(([k]) => k).join(','), 'a,b,d');
  },
  misconceptions: [
    { response: ['a', 'b', 'c', 'd'], why: t`${math`(${2}, \sqrt{${2}})`} has its entries swapped: the first entry must satisfy ${math`x^{${2}} = ${2}`}.` },
    { response: ['a', 'b'], why: t`Signs can be chosen independently in the two entries, so ${math`(\sqrt{${2}}, -${2})`} is in the product too.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.2, exercise 5'), answer: ['a', 'b', 'd'], agrees: true },
});

const sw514 = auto({
  id: 'sw-5-1-4',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.4'),
  title: t`The product of two five-element sets`,
  prompt: t`Find the size of the Cartesian product ${math`\{${1}, ${2}, ${3}, ${4}, ${5}\} \times \{-${1}, ${1}, ${3}, ${5}, ${7}\}`}. Does it contain ${math`(${3}, ${3})`}? Does it contain ${math`(${7}, ${1})`}? Answer with the size.`,
  answer: { kind: 'exact', expected: '25' },
  solution: [
    t`Each of the ${5} first entries pairs with each of the ${5} second entries: ${math`${5} \times ${5} = ${25}`} pairs.`,
    t`The numbers ${1}, ${3}, ${5} lie in both sets, but that does not merge any pairs: ${math`(${3}, ${3})`} is one pair, and it is in the product. ${math`(${7}, ${1})`} is not, as ${7} is not in the first set.`,
  ],
  reference: '25',
  verify: () => same('size', product([1, 2, 3, 4, 5], [-1, 1, 3, 5, 7]).length, 25),
  misconceptions: [
    { response: '7', why: t`That is the size of the union ${math`\{-${1}, ${1}, \ldots, ${7}\}`}. The product holds pairs: ${math`${5} \times ${5}`}.` },
    { response: '10', why: t`A product multiplies the sizes; it does not add them.` },
  ],
});

/** For every A, B, C, D among the subsets of {1, 2}, which of the five statements of 5.2.4 hold. */
function sw524Holds(): string {
  const subs = [[], [1], [2], [1, 2]];
  const k = (p: [number, number]) => `${p[0]},${p[1]}`;
  const prodSet = (X: number[], Y: number[]) => new Set(product(X, Y).map(k));
  const uni = (X: number[], Y: number[]) => [...new Set([...X, ...Y])];
  const within = (S: Set<string>, T: Set<string>) => [...S].every((x) => T.has(x));
  const both = (S: Set<string>, T: Set<string>) => new Set([...S, ...T]);
  const ok = { a: true, b: true, c: true, d: true, e: true };
  for (const A of subs) for (const B of subs) for (const C of subs) for (const D of subs) {
    const AinC = A.every((x) => C.includes(x));
    const BinD = B.every((x) => D.includes(x));
    if (AinC && BinD && !within(prodSet(A, B), prodSet(C, D))) ok.a = false;
    if (!within(prodSet(uni(A, C), uni(B, D)), both(prodSet(A, B), prodSet(C, D)))) ok.b = false;
    if (!within(both(prodSet(A, C), prodSet(B, D)), prodSet(uni(A, B), uni(C, D)))) ok.c = false;
    if (!within(prodSet(A, uni(B, C)), both(prodSet(A, B), prodSet(A, C)))) ok.d = false;
    if (!within(both(prodSet(A, B), prodSet(A, D)), prodSet(A, uni(B, D)))) ok.e = false;
  }
  return Object.entries(ok).filter(([, v]) => v).map(([id]) => id).join(',');
}

const sw524 = auto({
  id: 'sw-5-2-4',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.2.4'),
  title: t`Products against unions`,
  prompt: t`For sets ${mA}, ${mB}, ${mC}, ${math`D`}, which of these statements hold for all sets? Choose all that do.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'a', label: t`${math`(A \subseteq C \wedge B \subseteq D) \implies A \times B \subseteq C \times D`}` },
      { id: 'b', label: t`${math`(A \cup C) \times (B \cup D) \subseteq (A \times B) \cup (C \times D)`}` },
      { id: 'c', label: t`${math`(A \times C) \cup (B \times D) \subseteq (A \cup B) \times (C \cup D)`}` },
      { id: 'd', label: t`${math`A \times (B \cup C) \subseteq (A \times B) \cup (A \times C)`}` },
      { id: 'e', label: t`${math`(A \times B) \cup (A \times D) \subseteq A \times (B \cup D)`}` },
    ],
    correct: ['a', 'c', 'd', 'e'],
  },
  solution: [
    t`(a) If ${math`(x, y) \in A \times B`}, then ${math`x \in A \subseteq C`} and ${math`y \in B \subseteq D`}, so ${math`(x, y) \in C \times D`}. True.`,
    t`(b) False. Take ${math`A = \{${1}\}`}, ${math`B = \varnothing`}, ${math`C = \varnothing`}, ${math`D = \{${1}\}`}. The left side contains ${math`(${1}, ${1})`}, but ${math`A \times B`} and ${math`C \times D`} are both empty.`,
    t`(c) A pair in ${math`A \times C`} has first entry in ${math`A \subseteq A \cup B`} and second in ${math`C \subseteq C \cup D`}; likewise for ${math`B \times D`}. True.`,
    t`(d) If ${math`x \in A`} and ${math`y \in B \cup C`}, then ${math`y \in B`}, giving ${math`(x, y) \in A \times B`}, or ${math`y \in C`}, giving ${math`(x, y) \in A \times C`}. True. (e) is the reverse inclusion with ${math`D`} for ${mC}: true.`,
  ],
  reference: ['a', 'c', 'd', 'e'],
  verify: () => same('statements that hold', sw524Holds(), 'a,c,d,e'),
  misconceptions: [
    { response: ['a', 'b', 'c', 'd', 'e'], why: t`(b) fails: with ${math`A = \{${1}\}`}, ${math`D = \{${1}\}`} and ${math`B = C = \varnothing`}, the left side has the pair ${math`(${1}, ${1})`} and the right side is empty.` },
    { response: ['a', 'd', 'e'], why: t`(c) holds: each of ${math`A \times C`} and ${math`B \times D`} sits inside ${math`(A \cup B) \times (C \cup D)`}.` },
  ],
});

const sw524Proof = supervision({
  id: 'sw-5-2-4-proof',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.2.4'),
  title: t`Prove or disprove three product statements`,
  prompt: t`For sets ${mA}, ${mB}, ${mC}, ${math`D`}, prove or disprove at least three of: (a) ${math`(A \subseteq C \wedge B \subseteq D) \implies A \times B \subseteq C \times D`}; (b) ${math`(A \cup C) \times (B \cup D) \subseteq (A \times B) \cup (C \times D)`}; (c) ${math`(A \times C) \cup (B \times D) \subseteq (A \cup B) \times (C \cup D)`}; (d) ${math`A \times (B \cup C) \subseteq (A \times B) \cup (A \times C)`}; (e) ${math`(A \times B) \cup (A \times D) \subseteq A \times (B \cup D)`}.`,
  writeUp: 'proof',
});

const b816 = supervision({
  id: 'b8-16',
  source: cite('bop', 'Chapter 8, exercise 16'),
  title: t`The distributive law for products`,
  prompt: t`Prove that if ${mA}, ${mB} and ${mC} are sets, then ${math`A \times (B \cup C) = (A \times B) \cup (A \times C)`}.`,
  writeUp: 'proof',
});

const b127 = auto({
  id: 'b1-2-7',
  source: cite('bop', 'Section 1.2, exercise 7'),
  title: t`A product with the empty set inside`,
  prompt: t`How many elements does ${math`\{\varnothing\} \times \{${0}, \varnothing\} \times \{${0}, ${1}\}`} have?`,
  answer: { kind: 'exact', expected: '4' },
  solution: [
    t`${math`\{\varnothing\}`} has one element, the empty set, so it is not empty. The sizes are ${1}, ${2} and ${2}.`,
    t`So the product has ${math`${1} \times ${2} \times ${2} = ${4}`} triples: ${math`(\varnothing, ${0}, ${0}), (\varnothing, ${0}, ${1}), (\varnothing, \varnothing, ${0}), (\varnothing, \varnothing, ${1})`}.`,
  ],
  reference: '4',
  verify: () => same('size', product(product(['E'], [0, 'E']), [0, 1]).length, 4),
  misconceptions: [
    { response: '0', why: t`${math`\{\varnothing\}`} is not the empty set: it has one element. Only a product with ${math`\varnothing`} itself as a factor is empty.` },
    { response: '5', why: t`A product multiplies the sizes ${1}, ${2}, ${2}.` },
  ],
  official: { source: cite('bop', 'Solutions, Section 1.2, exercise 7'), answer: '4', agrees: true },
});

// ---------------------------------------------------------------- lesson

const EXA = [1, 2, 3];
const EXB = ['x', 'y'];

export const cartesianProduct: TopicContent = {
  topicId: 'sets.cartesian-product',
  goal: t`Form ${math`A \times B`} as the set of ordered pairs, count ${math`|A \times B| = |A||B|`}, and draw products of intervals in the plane.`,
  objective: t`Build the Cartesian product of sets, count it, and draw products of intervals.`,
  why: t`Products are how the plane, relations, and functions are all built out of sets.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Order matters` },
    { kind: 'hook', text: t`On a map grid, the square ${math`(${3}, ${5})`} and the square ${math`(${5}, ${3})`} are in different places. Yet the sets ${math`\{${3}, ${5}\}`} and ${math`\{${5}, ${3}\}`} are the same set. Sets forget order. To build the plane out of sets, we need an object that remembers it.` },
    {
      kind: 'definition',
      name: t`Ordered pair`,
      formal: t`An [[ordered-pair|ordered pair]] ${math`(a, b)`} has a first entry ${math`a`} and a second entry ${math`b`}, and ${dmath`(a, b) = (c, d) \iff a = c \text{ and } b = d.`} More generally an ordered list ${math`(a_{${1}}, \ldots, a_{n})`} has ${math`n`} entries in order, and two lists are equal when they agree entry by entry.`,
      plain: t`A pair is a set of two slots, labelled first and second. ${math`(${3}, ${5}) \neq (${5}, ${3})`}, because the first entries differ. Repeats are allowed: ${math`(${2}, ${2})`} is a perfectly good pair.`,
    },
    {
      kind: 'definition',
      name: t`Cartesian product`,
      formal: t`The [[cartesian-product|Cartesian product]] of sets ${mA} and ${mB} is ${dmath`A \times B = \{(a, b) : a \in A,\ b \in B\}.`} Similarly ${math`A_{${1}} \times \cdots \times A_{n}`} is the set of lists ${math`(a_{${1}}, \ldots, a_{n})`} with ${math`a_{i} \in A_{i}`}, and ${math`A^{n} = A \times \cdots \times A`} with ${math`n`} factors.`,
      plain: t`Every way to pick a first entry from ${mA} and a second from ${mB}. With ${math`A = ${texSet(EXA)}`} and ${math`B = ${texSet(EXB)}`}: ${math`A \times B = ${computedTex(`\\{${product(EXA, EXB).map(([a, b]) => `(${a}, ${b})`).join(', ')}\\}`)}`}.`,
    },
    { kind: 'narrative', text: t`Count that example: ${EXA.length} choices for the first entry, and for each of them ${EXB.length} for the second, so ${EXA.length * EXB.length} pairs. Lay them out as a grid, rows for ${mA} and columns for ${mB}, and the count is just rows times columns.` },
    { kind: 'theorem', name: t`Size of a product`, statement: t`If ${mA} and ${mB} are finite, then ${math`|A \times B| = |A| \cdot |B|`}. More generally ${math`|A_{${1}} \times \cdots \times A_{n}| = |A_{${1}}| \cdots |A_{n}|`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split by first entry`, text: t`For each ${math`a \in A`}, let ${math`R_{a} = \{(a, b) : b \in B\}`}, the pairs with first entry ${math`a`}. These ${math`|A|`} sets have no pair in common, and together they make up ${math`A \times B`}.`, plain: t`One row of the grid for each element of ${mA}.` },
        { label: t`Each row has the size of B`, text: t`The map ${math`b \mapsto (a, b)`} matches ${mB} with ${math`R_{a}`} one to one, since ${math`(a, b) = (a, b')`} forces ${math`b = b'`}. So ${math`|R_{a}| = |B|`}.` },
        { label: t`Add the rows`, text: t`So ${math`|A \times B| = \sum_{a \in A} |R_{a}| = |A| \cdot |B|`}. The general case follows by applying this ${math`n - ${1}`} times, as ${math`A_{${1}} \times \cdots \times A_{n}`} matches ${math`(A_{${1}} \times \cdots \times A_{n - ${1}}) \times A_{n}`} one to one.` },
      ],
    },
    { kind: 'p', text: t`For example, tossing a coin seven times has outcomes in ${math`\{H, T\}^{${7}}`}, a set of ${math`${2}^{${7}} = ${2 ** 7}`} ordered lists.` },
    quickCheck({ prompt: t`${math`|A| = ${4}`} and ${math`|B| = ${3}`}. How many elements does ${math`B \times A`} have?`, answer: { kind: 'exact', expected: String(12) }, reference: String(12), why: t`${math`|B \times A| = |B| \cdot |A| = ${3} \times ${4} = ${12}`}. It has the same size as ${math`A \times B`}, though the two sets are different.` }),
    { kind: 'section', title: t`Pictures in the plane` },
    { kind: 'narrative', text: t`The plane itself is a product: ${math`\mathbb{R}^{${2}} = \mathbb{R} \times \mathbb{R}`}, every pair of real numbers. So a product of two sets of real numbers is a region of the plane. The first factor says which ${math`x`} values are allowed, the second which ${math`y`} values.` },
    { kind: 'list', items: [
      t`${math`[${0}, ${1}] \times [${0}, ${1}]`}: all ${math`(x, y)`} with both coordinates between ${0} and ${1}, the filled unit square.`,
      t`${math`\{${1}, ${2}, ${3}\} \times [${0}, ${1}]`}: ${math`x`} is ${1}, ${2} or ${3}, and ${math`y`} is anything from ${0} to ${1}: three vertical segments.`,
      t`${math`\{${1}, ${2}, ${3}\} \times \{-${1}, ${0}, ${1}\}`}: nine dots, a three by three grid.`,
      t`${math`[${0}, ${1}] \times \{${1}\}`}: a horizontal segment at height ${1}, while ${math`\{${1}\} \times [${0}, ${1}]`} is a vertical one. Swapping the factors reflects the picture in the line ${math`y = x`}.`,
    ] },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`A \times B = B \times A`}.`, counterexample: t`With ${math`A = \{${1}\}`} and ${math`B = \{${2}\}`}: ${math`A \times B = \{(${1}, ${2})\}`} and ${math`B \times A = \{(${2}, ${1})\}`}, different sets. They are equal only when ${math`A = B`} or one of them is empty.` },
    { kind: 'pitfall', claim: t`${math`A \times \varnothing`} has ${math`|A|`} elements, one for each ${math`a`}.`, counterexample: t`A pair ${math`(a, b)`} needs some ${math`b \in \varnothing`}, and there is none. So ${math`A \times \varnothing = \varnothing`}, as ${math`|A| \cdot ${0} = ${0}`} says.` },
    { kind: 'pitfall', claim: t`${math`(A \times B) \times C`} and ${math`A \times (B \times C)`} are the same set.`, counterexample: t`With ${math`A = \{${1}\}`}, ${math`B = \{a\}`}, ${math`C = \{c\}`}: the first has the element ${math`((${1}, a), c)`}, a pair whose first entry is a pair; the second has ${math`(${1}, (a, c))`}. Different objects, though the sets have the same size and the same information.` },
    { kind: 'takeaway', text: t`${math`A \times B`} is every ordered pair with first entry from ${mA} and second from ${mB}, and it has ${math`|A| \cdot |B|`} elements.` },
  ],
  examples: [
    b121,
    worked(sizeGen, { kind: 'power', a: 3, b: 2, c: 7 }, t`Seven coin tosses`),
    worked(rectGen, { a: -1, b: 2, c: 1, d: 3 }, t`A rectangle as a product`),
  ],
  generators: [sizeGen, pairsGen, rectGen, distGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['ordered-pair', 'cartesian-product'],
  cambridge: withUses([sw524, sw524Proof, sw514, b125, b127, b128, b816], {
    'sw-5-2-4-proof': { sections: ['Order matters', 'Where it breaks'], note: t`Proving or disproving inclusions between products, unions, and subsets` },
  }),
  gate: ['sw-5-2-4-proof'],
  recall: [
    { front: t`When is ${math`(a, b) = (c, d)`}?`, back: t`Exactly when ${math`a = c`} and ${math`b = d`}.` },
    { front: t`Define ${math`A \times B`} and give its size.`, back: t`${math`\{(a, b) : a \in A, b \in B\}`}, with ${math`|A| \cdot |B|`} elements.` },
    { front: t`What is ${math`A \times \varnothing`}?`, back: t`The empty set: no pair can take its second entry from ${math`\varnothing`}.` },
  ],
  proofOrder: [
    {
      title: t`Why ${math`|A \times B| = |A| \cdot |B|`}`,
      steps: [
        t`Group the pairs by their first entry, one row for each ${math`a \in A`}.`,
        t`The rows share no pair and together give all of ${math`A \times B`}.`,
        t`Each row matches ${mB} one to one, so has ${math`|B|`} pairs.`,
        t`Adding ${math`|A|`} rows of size ${math`|B|`} gives ${math`|A| \cdot |B|`}.`,
      ],
    },
  ],
};
