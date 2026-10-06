/**
 * comb.repeated-arrangements: Arrangements of objects some of which are the same: n!
 * divided by the factorial of each repeat. From STEP Support Assignment 6: the
 * arrangements examples (Q5: Claire's six different letters, Stuart's repeated T placed
 * last, Anna's labelled copies A1, N1, N2, A2 and the division that removes the swaps),
 * the preparation (Q2: names with repeated letters, Lillian, MISSISSIPPI), and the hints'
 * general formula, checked against the hints' answers.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { computed, computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn] = [math`n`];

/** The letters of a word, case ignored, with their counts, in order of first appearance. */
function letterCounts(word: string): [string, number][] {
  const m = new Map<string, number>();
  for (const ch of word.toUpperCase()) m.set(ch, (m.get(ch) ?? 0) + 1);
  return [...m];
}
/** n! over the factorial of each count: the hints' formula. */
const multinomial = (counts: readonly number[]): number => counts.reduce((a, c) => a / factorial(c), factorial(counts.reduce((a, b) => a + b, 0)));
/** The same count another way: choose the places of each letter in turn (a product of binomial coefficients). */
function byPlaces(counts: readonly number[]): number {
  let left = counts.reduce((a, b) => a + b, 0);
  let out = 1;
  for (const c of counts) {
    let ways = 1;
    for (let i = 1; i <= c; i++) ways = (ways * (left - c + i)) / i;
    out *= Math.round(ways);
    left -= c;
  }
  return out;
}
/** Distinct orderings of a short word by listing them all. */
function listDistinct(word: string): number {
  const seen = new Set<string>();
  const go = (rest: string, acc: string): void => {
    if (rest.length === 0) { seen.add(acc); return; }
    for (let i = 0; i < rest.length; i++) go(rest.slice(0, i) + rest.slice(i + 1), acc + rest[i]);
  };
  go(word.toUpperCase(), '');
  return seen.size;
}
/** The formula as LaTeX: 6!/(2! × 2!), with only the repeats in the denominator. */
function formulaTex(counts: readonly number[]): string {
  const n = counts.reduce((a, b) => a + b, 0);
  const reps = counts.filter((c) => c > 1);
  return reps.length === 0 ? `${n}!` : `\\frac{${n}!}{${reps.map((c) => `${c}!`).join(' \\times ')}}`;
}
const repeatsText = (word: string): string => letterCounts(word).filter(([, c]) => c > 1).map(([ch, c]) => `${c} ${ch}s`).join(', ');

// ---------------------------------------------------------------- generators

const WORDS = ['BANANA', 'COMMITTEE', 'BOOKKEEPER', 'STATISTICS', 'PEPPER', 'LETTER', 'SUCCESS', 'TENNESSEE', 'COFFEE', 'GIGGLE', 'ASSESS', 'PARALLEL', 'REFERENCE', 'BALLOON'];

interface WordP { w: number }

const wordArrangements = generator<WordP>({
  id: 'word-arrangements',
  skill: 'Count the distinct arrangements of a word with repeated letters: n! divided by the factorial of each repeat, as the STEP Support hints to Assignment 6 Q2 do.',
  params: (rng) => ({ w: int(rng, 0, WORDS.length - 1) }),
  sane: ({ w }) => (w >= 0 && w < WORDS.length ? null : 'out of range'),
  problem: ({ w }) => {
    const word = WORDS[w] as string;
    const counts = letterCounts(word).map(([, c]) => c);
    const ans = multinomial(counts);
    return {
      prompt: t`In how many distinct ways can the letters of ${computed(word)} be arranged?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`${computed(word)} has ${word.length} letters, with repeats: ${computed(repeatsText(word))}.`,
        t`If every letter were different there would be ${math`${word.length}! = ${factorial(word.length)}`} arrangements. Each [[repeated-letter|repeated letter]] appearing ${math`r`} times makes every distinct arrangement appear ${math`r!`} times among them, once for each order of its copies, so divide by ${math`r!`} for each.`,
        t`${math`${computedTex(formulaTex(counts))} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ w }) => String(byPlaces(letterCounts(WORDS[w] as string).map(([, c]) => c))),
  misconceptions: ({ w }): Misconception[] => {
    const word = WORDS[w] as string;
    const counts = letterCounts(word).map(([, c]) => c);
    const n = word.length;
    return [
      { response: String(factorial(n)), why: t`That counts the copies of a repeated letter as different. Swapping two identical letters gives the same arrangement: divide by the factorial of each repeat.` },
      { response: String(counts.reduce((a, c) => a / c, factorial(n))), why: t`Divide by the factorial of each repeat, not the repeat itself: ${math`r`} copies can be ordered in ${math`r!`} ways.` },
      { response: String(factorial(n) / factorial(Math.max(...counts))), why: t`Every repeated letter needs its own division, not only the most common one.` },
    ];
  },
});

interface BeadP { r: number; b: number; g: number }

const beads = generator<BeadP>({
  id: 'beads',
  skill: 'Count rows of coloured beads where beads of one colour are identical: (r + b + g)! over r! b! g!.',
  params: (rng) => ({ r: int(rng, 2, 5), b: int(rng, 1, 3), g: int(rng, 2, 4) }),
  sane: ({ r, b, g }) => (r >= 2 && b >= 1 && g >= 2 && r + b + g <= 12 ? null : 'out of range'),
  problem: ({ r, b, g }) => {
    const n = r + b + g;
    const ans = multinomial([r, b, g]);
    return {
      prompt: t`A row of ${n} beads is made from ${r} red, ${b} blue, and ${g} green beads; beads of the same colour are identical. How many different rows are there?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`Label the beads to make them all different: ${math`${n}!`} rows. Each real row appears ${math`${r}! \times ${b}! \times ${g}!`} times, once for each way of ordering the labels within each colour.`,
        t`So there are ${math`\frac{${n}!}{${r}! \times ${b}! \times ${g}!} = \frac{${factorial(n)}}{${factorial(r) * factorial(b) * factorial(g)}} = ${ans}`} rows.`,
      ],
    };
  },
  solve: ({ r, b, g }) => String(byPlaces([r, b, g])),
  misconceptions: ({ r, b, g }): Misconception[] => {
    const n = r + b + g;
    return [
      { response: String(factorial(n)), why: t`That treats every bead as different. Beads of one colour are identical, so divide by the orders within each colour.` },
      { response: String(3 ** n), why: t`That lets each place be any colour, with no limit on how many of each. Here the numbers of each colour are fixed.` },
      { response: String(factorial(n) / factorial(r)), why: t`Divide by the factorial of every colour's count, not only the red.` },
    ];
  },
});

interface RouteP { a: number; b: number }

const routes = generator<RouteP>({
  id: 'grid-routes',
  skill: 'Count shortest routes on a grid as arrangements of repeated moves: a moves right and b moves up give (a + b)!/(a! b!).',
  params: (rng) => {
    const a = int(rng, 2, 7);
    let b = int(rng, 2, 7);
    if (b === a) b = a === 7 ? 6 : a + 1;
    return { a, b };
  },
  sane: ({ a, b }) => (a >= 2 && b >= 2 && a !== b && a <= 7 && b <= 7 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const ans = multinomial([a, b]);
    return {
      prompt: t`On a square grid, how many shortest routes go from one corner to the point ${a} squares to the right and ${b} squares up, moving one square right or one square up at each step?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`A shortest route is a list of ${a + b} moves: ${a} R's and ${b} U's in some order. Every such word is a route, and every route is such a word.`,
        t`So count the arrangements of ${a} identical R's and ${b} identical U's: ${math`\frac{${a + b}!}{${a}! \times ${b}!} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Count routes by adding the routes into each point from its left and from below.
    const ways = upTo(a + 1).map(() => upTo(b + 1).map(() => 0));
    for (let i = 0; i <= a; i++) for (let j = 0; j <= b; j++) {
      const row = ways[i] as number[];
      row[j] = i === 0 || j === 0 ? 1 : ((ways[i - 1] as number[])[j] as number) + (row[j - 1] as number);
    }
    return String((ways[a] as number[])[b]);
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: String(factorial(a + b)), why: t`The right moves are identical to each other, and so are the up moves: divide by ${math`${a}!`} and ${math`${b}!`}.` },
    { response: String(2 ** (a + b)), why: t`That allows any mix of moves. A shortest route has exactly ${a} right moves and ${b} up moves.` },
    { response: String(a * b), why: t`Count orders of moves, not squares: the route is a word of ${a} R's and ${b} U's.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const A6 = 'step-f06';
const H6 = 'step-f06-hints';
const nameCounts = (name: string): number[] => letterCounts(name).map(([, c]) => c);
const verifyName = (name: string): string | null => {
  // Three ways: the formula, choosing places, and (for short names) listing every arrangement.
  const f = multinomial(nameCounts(name));
  const e = same(`${name} by places`, byPlaces(nameCounts(name)), f);
  if (e !== null) return e;
  return name.length <= 8 ? same(`${name} by listing`, listDistinct(name), f) : null;
};

const STUART = 'Stuart';
const a6q5ii = auto({
  id: 'a6-q5-ii',
  source: cite(A6, 'Q5(ii), the arrangements examples'),
  title: t`Stuart's repeated T`,
  prompt: t`Stuart wants to work out the number of distinct ways in which he can arrange the letters of his name. As he has a repeated letter he has to be careful: not all arrangements are distinct. How many distinct arrangements are there?`,
  answer: { kind: 'exact', expected: String(multinomial(nameCounts(STUART))) },
  solution: [
    t`He deals with the repeated T's last. There are ${6} places to put the S, then ${5} for the U, ${4} for the A, and ${3} for the R.`,
    t`The two T's take the two places left, in only ${1} way. So there are ${math`${6} \times ${5} \times ${4} \times ${3} = ${6 * 5 * 4 * 3}`} distinct arrangements.`,
    t`This is ${math`\frac{${6}!}{${2}!}`}: the ${math`${6}!`} arrangements of six different letters, halved because swapping the two T's changes nothing.`,
  ],
  reference: String(6 * 5 * 4 * 3),
  verify: () => verifyName(STUART) ?? same('the assignment\'s product', multinomial(nameCounts(STUART)), 360),
  misconceptions: [{ response: String(factorial(6)), why: t`${factorial(6)} counts each arrangement twice, once for each order of the two T's.` }],
});

const Q2II = ['Emma', 'David', 'Stephen', 'Poppy', 'Ebenezer'];
const a6q2ii = auto({
  id: 'a6-q2-ii',
  source: cite(A6, 'Q2(ii)'),
  title: t`Names with one repeated letter`,
  prompt: t`In how many distinct ways can each of these people arrange the letters of their name?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`name`, t`arrangements`], rows: Q2II.map((nm) => [t`${nm}`, null]), expected: Q2II.map((nm) => String(multinomial(nameCounts(nm)))) },
  solution: [
    t`Each name has one letter repeated (ignoring capitals): Emma two M's, David two D's, Stephen two E's, Poppy three P's, Ebenezer four E's.`,
    t`Divide the factorial of the length by the factorial of the repeat: ${Q2II.map((nm) => [math`${computedTex(formulaTex(nameCounts(nm)))} = ${multinomial(nameCounts(nm))}`]).flatMap((r, i) => (i === 0 ? [...r] : [...t`; `, ...r]))}.`,
  ],
  reference: Q2II.map((nm) => String(multinomial(nameCounts(nm)))),
  verify: () => Q2II.map(verifyName).find((x) => x !== null) ?? null,
  misconceptions: [{ response: Q2II.map((nm) => String(factorial(nm.length))), why: t`Those count the copies of the repeated letter as different. Divide by the factorial of the repeat.` }],
  official: { source: cite(H6, 'Q2(ii)'), answer: ['12', '60', '2520', '20', '1680'], agrees: true },
});

const Q2III = ['Reggie', 'Hannah', 'Marshmallow'];
const a6q2iii = auto({
  id: 'a6-q2-iii',
  source: cite(A6, 'Q2(iii)'),
  title: t`Reggie, Hannah, and Marshmallow`,
  prompt: t`How many distinct ways are there of arranging the letters in Reggie, Hannah, and Marshmallow?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`name`, t`arrangements`], rows: Q2III.map((nm) => [t`${nm}`, null]), expected: Q2III.map((nm) => String(multinomial(nameCounts(nm)))) },
  solution: [
    t`Reggie: two G's and two E's, ${math`\frac{${6}!}{${2}! \times ${2}!} = ${multinomial(nameCounts('Reggie'))}`}. Hannah: two H's, two A's, two N's, ${math`\frac{${6}!}{${2}! \times ${2}! \times ${2}!} = ${multinomial(nameCounts('Hannah'))}`}.`,
    t`Marshmallow: ${11} letters with two M's, two A's, two L's: ${math`\frac{${11}!}{${2}! \times ${2}! \times ${2}!} = ${multinomial(nameCounts('Marshmallow'))}`}.`,
  ],
  reference: Q2III.map((nm) => String(multinomial(nameCounts(nm)))),
  verify: () => Q2III.map(verifyName).find((x) => x !== null) ?? null,
  misconceptions: [{ response: Q2III.map((nm) => String(factorial(nm.length) / 2)), why: t`Each repeated letter needs its own division: Hannah has three pairs, so divide by ${math`${2}!`} three times.` }],
  // The hints leave these as 6!/(2! × 2!), 6!/(2! × 2! × 2!), 11!/(2! × 2! × 2!): their values are 180, 90, 4989600.
  official: { source: cite(H6, 'Q2(iii)'), answer: [String(factorial(6) / 4), String(factorial(6) / 8), String(factorial(11) / 8)], agrees: true },
});

const MISS = 'MISSISSIPPI';
const a6q2v = auto({
  id: 'a6-q2-v',
  source: cite(A6, 'Q2(v)'),
  title: t`MISSISSIPPI`,
  prompt: t`In how many distinct ways can you arrange the letters in ${computed(MISS)}?`,
  answer: { kind: 'exact', expected: String(multinomial(nameCounts(MISS))) },
  solution: [
    t`${11} letters: four I's, four S's, two P's, one M.`,
    t`${math`\frac{${11}!}{${4}! \times ${4}! \times ${2}!} = \frac{${factorial(11)}}{${24 * 24 * 2}} = ${multinomial(nameCounts(MISS))}`}.`,
  ],
  reference: String(multinomial(nameCounts(MISS))),
  verify: () => verifyName(MISS),
  misconceptions: [{ response: String(factorial(11) / (4 * 4 * 2)), why: t`Divide by ${math`${4}!`}, ${math`${4}!`}, and ${math`${2}!`}, the orders of each repeated letter, not by ${4}, ${4}, and ${2}.` }],
  // The hints give 11!/(4! × 4! × 2!), which is 34650.
  official: { source: cite(H6, 'Q2(v)'), answer: String(factorial(11) / (24 * 24 * 2)), agrees: true },
});

const ANNA = 'Anna';
const a6q5iii = auto({
  id: 'a6-q5-iii',
  source: cite(A6, 'Q5(iii), the arrangements examples'),
  title: t`Anna's two pairs`,
  prompt: t`Anna has two different letters that repeat. How many distinct ways can she arrange the letters of her name?`,
  answer: { kind: 'exact', expected: String(multinomial(nameCounts(ANNA))) },
  solution: [
    t`She labels the letters as if they were distinct, ${math`A_{${1}}, N_{${1}}, N_{${2}}, A_{${2}}`}: ${math`${4}! = ${factorial(4)}`} arrangements.`,
    t`Swapping ${math`A_{${1}}`} and ${math`A_{${2}}`} gives an identical arrangement, so divide by ${2}; the same for the N's, divide by ${2} again: ${math`\frac{${4}!}{${2}! \times ${2}!} = ${multinomial(nameCounts(ANNA))}`}.`,
  ],
  reference: String(multinomial(nameCounts(ANNA))),
  verify: () => verifyName(ANNA),
  misconceptions: [{ response: '12', why: t`Both pairs repeat: divide by ${math`${2}!`} for the A's and again for the N's.` }],
});

const lillian = supervision({
  id: 'a6-q2-iv',
  source: cite(A6, 'Q2(iv)'),
  title: t`Lillian`,
  prompt: t`Lillian now wants a go. Show carefully that the number of distinct ways she can write her name is ${math`\frac{${7}!}{${3}! \times ${2}!}`}. "Show carefully" means explain every division, leaving no gaps for an examiner to fill.`,
  writeUp: 'explanation',
  official: cite(H6, 'Q2(iv)'),
});
const general = supervision({
  id: 'a6-q2-general',
  source: cite(H6, 'Q2, the general formula', true),
  title: t`Why the general formula holds`,
  prompt: t`The hints state: if you have ${mn} objects where ${math`r_{${1}}`} are identical, another ${math`r_{${2}}`} are identical, and so on up to ${math`r_{k}`}, then there are ${math`\frac{n!}{r_{${1}}! \times r_{${2}}! \times \cdots \times r_{k}!}`} distinct arrangements. Explain why, by labelling the identical objects as Anna does, and say why the divisions do not interfere with each other.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const rProd = math`r_{${1}}! \times r_{${2}}! \times \cdots \times r_{k}!`;

export const repeatedArrangements: TopicContent = {
  topicId: 'comb.repeated-arrangements',
  goal: t`Count the distinct arrangements of objects some of which are identical, such as the letters of MISSISSIPPI, by dividing ${math`n!`} by the factorial of each repeat.`,
  objective: t`Count arrangements of objects some of which are identical, by dividing out the repeats.`,
  why: t`The same count gives bead patterns, grid routes and binomial coefficients, and it recurs in probability.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`When two letters are the same` },
    { kind: 'hook', text: t`Claire, in STEP Support Assignment ${6}, can arrange the ${6} different letters of her name in ${math`${6}! = ${factorial(6)}`} ways. Stuart also has ${6} letters, but two of them are T. Swap the two T's in any arrangement and you get the same word. So Stuart has fewer than ${factorial(6)}. How many fewer?` },
    { kind: 'narrative', text: t`The assignment shows two ways in. Stuart's way is to place the different letters first and let the repeats fill whatever is left. Anna's way is to pretend the repeats are different and then correct for the pretence. The second way gives the general rule.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Place the different letters`, text: t`The S has ${6} places, then the U has ${5}, the A ${4}, the R ${3}.` },
        { label: t`Let the T's fill the gaps`, text: t`Two places are left, and the two T's fill them in exactly one way, because they look the same.` },
        { label: t`Multiply`, text: t`By the product rule,`, eq: [dmath`${6} \times ${5} \times ${4} \times ${3} = ${6 * 5 * 4 * 3} = \frac{${6}!}{${2}!}.`], plain: t`Exactly half of Claire's count: each of Stuart's words came up twice, once for each order of the T's.` },
      ],
    },
    { kind: 'section', title: t`Label, count, divide` },
    { kind: 'narrative', text: t`Anna has two A's and two N's. She labels them ${math`A_{${1}}, N_{${1}}, N_{${2}}, A_{${2}}`}, so that all four letters are different, and counts ${math`${4}! = ${factorial(4)}`} labelled arrangements. Now erase the labels. The word NAAN comes from ${math`N_{${1}}A_{${1}}A_{${2}}N_{${2}}`}, ${math`N_{${1}}A_{${2}}A_{${1}}N_{${2}}`}, ${math`N_{${2}}A_{${1}}A_{${2}}N_{${1}}`} and ${math`N_{${2}}A_{${2}}A_{${1}}N_{${1}}`}: ${2} orders of the A's times ${2} orders of the N's. Every word comes up exactly ${4} times, so there are ${math`\frac{${4}!}{${2}! \times ${2}!} = ${multinomial([2, 2])}`} words.` },
    {
      kind: 'definition',
      name: t`Arrangement with repeats`,
      formal: t`Let ${mn} objects be of ${math`k`} kinds, with ${math`r_{i}`} identical objects of kind ${math`i`}, so ${math`r_{${1}} + \cdots + r_{k} = n`}. An arrangement is a sequence of length ${mn} in which kind ${math`i`} appears exactly ${math`r_{i}`} times; two arrangements are the same if they agree in every position.`,
      plain: t`In plain words: a word made from a fixed bag of letters, where copies of a [[repeated-letter|repeated letter]] cannot be told apart. For PEPPER, ${math`n = ${6}`} with ${3} P's, ${2} E's and ${1} R.`,
    },
    { kind: 'theorem', statement: t`The number of distinct arrangements is ${dmath`\frac{n!}{r_{${1}}! \times r_{${2}}! \times \cdots \times r_{k}!}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Label the copies`, text: t`Give the ${math`r_{i}`} copies of kind ${math`i`} distinct labels, for every ${math`i`}. Now all ${mn} objects are different, so there are ${math`n!`} labelled arrangements.` },
        { label: t`Erase the labels`, text: t`Erasing labels sends each labelled arrangement to one arrangement with repeats, and every arrangement with repeats is reached.` },
        { label: t`Count what lands on one word`, text: t`The labelled arrangements that give one fixed word differ only in how the labels of each kind are ordered among that kind's places: ${math`r_{i}!`} ways for kind ${math`i`}, independently, so ${rProd} in all.`, why: { q: t`Why multiply the ${math`r_{i}!`}?`, a: t`By the product rule: choose the order of the labels for kind ${1}, then for kind ${2}, and so on; each choice can be made whatever the others were.` } },
        { label: t`Divide`, text: t`So the ${math`n!`} labelled arrangements fall into groups of exactly ${rProd}, one group per word, and the number of words is ${math`\frac{n!}{r_{${1}}! \times \cdots \times r_{k}!}`}.`, plain: t`If every word is counted the same number of times, divide by that number.` },
      ],
    },
    { kind: 'p', text: t`For MISSISSIPPI (${11} letters: ${4} I's, ${4} S's, ${2} P's, ${1} M): ${math`\frac{${11}!}{${4}! \times ${4}! \times ${2}!} = ${multinomial(nameCounts(MISS))}`}. A kind that appears once contributes ${math`${1}! = ${1}`}, so it can be left out of the bottom.` },
    checkFrom(wordArrangements, { w: 4 }, t`PEPPER has ${6} letters with ${3} P's and ${2} E's: ${math`\frac{${6}!}{${3}! \times ${2}!} = ${multinomial([3, 2, 1])}`}.`),
    { kind: 'pitfall', claim: t`BANANA has ${math`\frac{${6}!}{${3}!} = ${factorial(6) / factorial(3)}`} arrangements: divide by the repeats of A.`, counterexample: t`The N is repeated too. Every repeated kind gets its own factorial: ${math`\frac{${6}!}{${3}! \times ${2}!} = ${multinomial([3, 2, 1])}`}.` },
    { kind: 'section', title: t`The same count in disguise` },
    { kind: 'narrative', text: t`Many problems are arrangements of a few kinds of object in disguise. A row of beads of three colours is a word in three letters. A shortest route on a grid, moving right or up, is a word in R and U: going ${3} right and ${2} up is an arrangement of RRRUU, so there are ${math`\frac{${5}!}{${3}! \times ${2}!} = ${multinomial([3, 2])}`} routes.` },
    { kind: 'p', text: t`With only two kinds, the count is a binomial coefficient: ${math`\frac{n!}{r!\,(n - r)!} = \binom{n}{r}`}, the number of ways to choose which ${math`r`} of the ${mn} places get the first kind. The STEP hints add a practical note: leaving the answer as factorials is fine while you work, but be ready to give the number.` },
    checkFrom(routes, { a: 4, b: 2 }, t`A route is an arrangement of ${4} R's and ${2} U's: ${math`\frac{${6}!}{${4}! \times ${2}!} = ${multinomial([4, 2])}`}.`),
    { kind: 'takeaway', text: t`Label the copies to make them different, count ${math`n!`}, then divide by the factorial of each repeat, because each word was counted that many times.` },
  ],
  examples: [
    workedCambridge(a6q5ii),
    worked(wordArrangements, { w: 0 }, t`BANANA`),
    worked(routes, { a: 4, b: 3 }, t`Routes on a grid`),
  ],
  generators: [wordArrangements, beads, routes],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['repeated-letter'],
  cambridge: [a6q2ii, a6q2iii, a6q2v, a6q5iii, lillian, general],
  // Best first: Lillian's "show carefully" write-up, MISSISSIPPI, then the three names with several
  // repeats. The five names with one repeat each and Anna are one division each, too slight to gate.
  // The general formula comes from the hints, not a gate document.
  gate: ['a6-q2-iv', 'a6-q2-v', 'a6-q2-iii'],
  recall: [
    { front: t`How many arrangements of ${mn} objects with ${math`r_{${1}}, \ldots, r_{k}`} identical copies of each kind?`, back: t`${math`\frac{n!}{r_{${1}}! \times \cdots \times r_{k}!}`}.` },
    { front: t`Why divide by ${math`r_{i}!`}?`, back: t`Labelling the copies counts each word once for every order of the labels within each kind.` },
    { front: t`Arrangements of ${math`r`} objects of one kind and ${math`n - r`} of another?`, back: t`${math`\binom{n}{r}`}, the choices of places for the first kind.` },
  ],
  proofOrder: [
    {
      title: t`Arrangements with repeats`,
      steps: [
        t`Label the copies of each kind so all ${mn} objects differ.`,
        t`There are ${math`n!`} labelled arrangements.`,
        t`Each word comes from exactly ${rProd} labelled arrangements.`,
        t`So there are ${math`\frac{n!}{r_{${1}}! \times \cdots \times r_{k}!}`} words.`,
      ],
    },
  ],
};
