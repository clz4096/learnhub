/**
 * comb.permutations: ordered selections of r objects from n, n!/(n - r)!. The lesson follows
 * STEP Support Assignment 6 (its "Arrangements Examples", Q5: Claire's 6!, and Stuart's
 * 6 x 5 x 4 x 3 = 360, which places four different letters in six positions) and the STEP
 * specification's "use n! and nCr in the context of permutations and combinations". The
 * problems are Assignment 6, Q2(i) (checked against the hints) and IA Probability Example
 * Sheet 1, Q12 (n balls into n boxes, exactly one box empty), checked by brute force.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mr] = [math`n`, math`r`];
const perm = (n: number, r: number): number => {
  let p = 1;
  for (let i = 0; i < r; i++) p *= n - i;
  return p;
};
const choose = (n: number, r: number): number => perm(n, r) / factorial(r);

/** Ordered selections of r different items from n, listed one by one. */
function countOrdered(n: number, r: number): number {
  let count = 0;
  const used = new Array<boolean>(n).fill(false);
  const go = (depth: number): void => {
    if (depth === r) { count++; return; }
    for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; go(depth + 1); used[i] = false; }
  };
  go(0);
  return count;
}

// ---------------------------------------------------------------- generators

type Ctx = 'podium' | 'officers' | 'code' | 'seats';
interface PermP { ctx: Ctx; n: number; r: number }

const permGen = generator<PermP>({
  id: 'ordered-selection',
  skill: 'Count ordered selections of r different objects from n: n!/(n - r)!.',
  quick: true,
  params: (rng) => ({ ctx: pick(rng, ['podium', 'officers', 'code', 'seats'] as const), n: int(rng, 5, 12), r: int(rng, 2, 4) }),
  sane: ({ n, r }) => (r >= 2 && r < n ? null : 'need 2 <= r < n'),
  problem: ({ ctx, n, r }) => {
    const v = perm(n, r);
    const say = {
      podium: t`${n} runners finish a race with no ties. In how many ways can the first ${r} places be filled?`,
      officers: t`A club of ${n} people elects ${r} different officers (chair, secretary, and so on), no one holding two posts. In how many ways can this be done?`,
      code: t`A code is a list of ${r} different digits chosen from ${n} available digits, in order. How many codes are there?`,
      seats: t`${r} people arrive at a row of ${n} empty seats, and each sits in a different seat. In how many ways can they be seated?`,
    }[ctx];
    return {
      prompt: say,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`Order matters and nothing repeats: ${n} choices for the first, then ${n - 1} for the second, and so on, ${r} factors in all.`,
        t`${math`${computedTex(Array.from({ length: r }, (_, i) => n - i).join(' \\times '))} = ${v}`}, which is ${math`\frac{${n}!}{${n - r}!}`}.`,
      ],
    };
  },
  solve: ({ n, r }) => String(countOrdered(n, r)),
  misconceptions: ({ n, r }): Misconception[] => [
    { response: String(choose(n, r)), why: t`That is ${math`\binom{${n}}{${r}}`}, which ignores order. Here different orders are different outcomes, so multiply by ${math`${r}! = ${factorial(r)}`}.` },
    { response: String(n ** r), why: t`That allows repeats, ${n} choices every time. Once one is used it cannot be used again, so the choices go down by one each time.` },
    { response: String(factorial(n) / factorial(r)), why: t`Divide by ${math`(n - r)! = ${n - r}!`}, the arrangements of the ${n - r} that are not chosen, not by ${math`r!`}.` },
  ],
});

interface WordP { n: number; seed: number }
const WORDS = ['CAMBRIDGE', 'LOGARITHM', 'NUMBER', 'PLANET', 'FORMULA', 'DYNAMIC', 'TRACK', 'CLAIRE', 'EULER', 'GAUSS', 'FIELD', 'WINTER'];
const distinct = (w: string): boolean => new Set(w).size === w.length;

const wordGen = generator<WordP>({
  id: 'word-arrangements',
  skill: 'Arrange all n different letters of a word: n!, and the first r letters of an arrangement: n!/(n - r)!.',
  params: (rng) => {
    const words = WORDS.filter(distinct);
    const seed = int(rng, 0, words.length - 1);
    const w = words[seed] as string;
    return { n: int(rng, 2, Math.min(4, w.length - 1)), seed };
  },
  sane: ({ n, seed }) => {
    const w = WORDS.filter(distinct)[seed];
    return w !== undefined && n >= 2 && n < w.length ? null : 'out of range';
  },
  problem: ({ n, seed }) => {
    const w = WORDS.filter(distinct)[seed] as string;
    const L = w.length;
    return {
      prompt: t`The ${L} letters of ${w} are all different. How many ${n}-letter strings can be made from them, using each letter at most once? (Order matters: AB and BA are different.)`,
      answer: { kind: 'exact', expected: String(perm(L, n)) },
      solution: [
        t`Fill the ${n} positions in turn: ${L} letters for the first, ${L - 1} for the second, and so on.`,
        t`${math`${computedTex(Array.from({ length: n }, (_, i) => L - i).join(' \\times '))} = ${perm(L, n)} = \frac{${L}!}{${L - n}!}`}.`,
      ],
    };
  },
  solve: ({ n, seed }) => String(countOrdered((WORDS.filter(distinct)[seed] as string).length, n)),
  misconceptions: ({ n, seed }): Misconception[] => {
    const L = (WORDS.filter(distinct)[seed] as string).length;
    return [
      { response: String(factorial(L)), why: t`That arranges all ${L} letters. The strings use only ${n} of them, so stop after ${n} factors.` },
      { response: String(choose(L, n)), why: t`That counts which letters are used but not their order; AB and BA are different strings.` },
      { response: String(L ** n), why: t`Each letter can be used at most once, so the number of choices drops by one at each position.` },
    ];
  },
});

interface FixP { n: number; r: number }

const fixGen = generator<FixP>({
  id: 'fixed-first',
  skill: 'Count ordered selections with one position already filled: (n - 1)!/(n - r)!.',
  params: (rng) => {
    const n = int(rng, 5, 10);
    return { n, r: int(rng, 3, Math.min(5, n - 1)) };
  },
  sane: ({ n, r }) => (r >= 3 && r < n ? null : 'need 3 <= r < n'),
  problem: ({ n, r }) => ({
    prompt: t`From ${n} candidates, ${r} are chosen to give talks in order, first to last, and Ada (one of the candidates) must speak first. How many running orders are there?`,
    answer: { kind: 'exact', expected: String(perm(n - 1, r - 1)) },
    solution: [
      t`Ada's place is fixed, so only the other ${r - 1} slots are open, filled from the other ${n - 1} candidates.`,
      t`That is an ordered selection of ${r - 1} from ${n - 1}: ${math`\frac{${n - 1}!}{${n - r}!} = ${perm(n - 1, r - 1)}`}.`,
    ],
  }),
  solve: ({ n, r }) => {
    // List every running order and keep those with Ada (candidate 0) first.
    let count = 0;
    const used = new Array<boolean>(n).fill(false);
    const go = (seq: number[]): void => {
      if (seq.length === r) { if (seq[0] === 0) count++; return; }
      for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; go([...seq, i]); used[i] = false; }
    };
    go([]);
    return String(count);
  },
  misconceptions: ({ n, r }): Misconception[] => [
    { response: String(perm(n, r)), why: t`That lets anyone speak first. With Ada fixed in the first slot, only ${r - 1} slots remain.` },
    { response: String(perm(n - 1, r)), why: t`Ada takes one of the ${r} slots, so ${r - 1} slots are left for the other ${n - 1} people.` },
    { response: String(r * perm(n - 1, r - 1)), why: t`That counts the orders in which Ada speaks in any slot. She must speak first, so her slot is not a choice.` },
  ],
});

interface InclP { n: number; r: number }

const inclGen = generator<InclP>({
  id: 'includes-one',
  skill: 'Count ordered selections that include a given object: choose its position, then fill the rest.',
  params: (rng) => {
    const n = int(rng, 5, 10);
    return { n, r: int(rng, 2, Math.min(4, n - 1)) };
  },
  sane: ({ n, r }) => (r >= 2 && r < n ? null : 'need 2 <= r < n'),
  problem: ({ n, r }) => ({
    prompt: t`A ${r}-character password uses ${r} different symbols from a set of ${n} symbols, one of which is ${math`\#`}. How many such passwords contain ${math`\#`}?`,
    answer: { kind: 'exact', expected: String(r * perm(n - 1, r - 1)) },
    solution: [
      t`Choose the position of ${math`\#`}: ${r} ways. Fill the other ${r - 1} positions, in order, from the other ${n - 1} symbols: ${math`\frac{${n - 1}!}{${n - r}!} = ${perm(n - 1, r - 1)}`} ways.`,
      t`Total ${math`${r} \times ${perm(n - 1, r - 1)} = ${r * perm(n - 1, r - 1)}`}. Check: all passwords minus those without ${math`\#`} is ${math`${perm(n, r)} - ${perm(n - 1, r)} = ${perm(n, r) - perm(n - 1, r)}`}.`,
    ],
  }),
  solve: ({ n, r }) => String(countOrdered(n, r) - countOrdered(n - 1, r)),
  misconceptions: ({ n, r }): Misconception[] => [
    { response: String(perm(n - 1, r - 1)), why: t`That puts ${math`\#`} in one fixed place. It can go in any of the ${r} positions.` },
    { response: String(perm(n - 1, r)), why: t`That counts the passwords without ${math`\#`}. Subtract it from the total, ${perm(n, r)}.` },
    { response: String(perm(n, r)), why: t`That is every password, including those that never use ${math`\#`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a6q5 = auto({
  id: 'a6-q5-ii',
  source: cite('step-f06', 'Assignment 6, Q5(ii)', true),
  title: t`Stuart's letters`,
  prompt: t`Stuart arranges the letters of his name. The letters S, U, A, R are all different; the two T's are the same. He places S, then U, then A, then R into the ${6} positions, and the T's take the two positions left over. How many distinct arrangements are there?`,
  answer: { kind: 'exact', expected: String(perm(6, 4)) },
  solution: [
    t`There are ${6} places for the S, then ${5} for the U, ${4} for the A and ${3} for the R. The T's fill the remaining two places in exactly one way.`,
    t`So the count is ${math`${6} \times ${5} \times ${4} \times ${3} = ${perm(6, 4)}`}: an ordered selection of ${4} positions from ${6}, ${math`\frac{${6}!}{${2}!}`}.`,
  ],
  reference: '360',
  verify: () => {
    // Brute force: all orderings of S, T, U, A, R, T, counted as distinct strings.
    const letters = ['S', 'T', 'U', 'A', 'R', 'T'];
    const out = new Set<string>();
    const go = (rest: string[], acc: string): void => {
      if (rest.length === 0) { out.add(acc); return; }
      rest.forEach((l, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], acc + l));
    };
    go(letters, '');
    return same('distinct arrangements of STUART', out.size, 360);
  },
  misconceptions: [
    { response: '720', why: t`${math`${6}! = ${720}`} treats the two T's as different. Swapping them gives the same name, so each arrangement was counted twice.` },
    { response: '15', why: t`That is ${math`\binom{${6}}{${2}}`}, the places for the T's alone. The other four letters still have to be arranged in the remaining places: ${math`${4}! = ${24}`} ways.` },
  ],
  official: { source: cite('step-f06', 'Assignment 6, Q5(ii)'), answer: '360', agrees: true },
});

const a6q2 = auto({
  id: 'a6-q2-i',
  source: cite('step-f06', 'Assignment 6, Q2(i)'),
  title: t`Charlie's letters`,
  prompt: t`In how many ways can Charlie arrange the letters of his name? (The ${7} letters C, H, A, R, L, I, E are all different.)`,
  answer: { kind: 'exact', expected: String(factorial(7)) },
  solution: [t`All ${7} letters are different, and an arrangement uses all of them: ${math`${7}! = ${factorial(7)}`}. (Ben has ${math`${3}! = ${6}`} and Elsa ${math`${4}! = ${24}`}.)`],
  reference: '5040',
  verify: () => same('7! by listing', countOrdered(7, 7), 5040),
  misconceptions: [{ response: '49', why: t`That is ${math`${7} \times ${7}`}. Each letter used reduces the choices: ${math`${7} \times ${6} \times \cdots \times ${1}`}.` }],
  official: { source: cite('step-f06-hints', 'Assignment 6, Q2(i)'), answer: '5040', agrees: true },
});

/** Exactly one of n boxes empty when n balls are tossed independently and uniformly, by listing all n^n outcomes. */
function oneEmptyBrute(n: number): number {
  let hits = 0;
  const total = n ** n;
  for (let code = 0; code < total; code++) {
    let x = code;
    const used = new Array<number>(n).fill(0);
    for (let b = 0; b < n; b++) { used[x % n] = (used[x % n] as number) + 1; x = Math.floor(x / n); }
    if (used.filter((u) => u === 0).length === 1) hits++;
  }
  return hits / total;
}

const ia12 = auto({
  id: 'ia1-q12',
  source: cite('ia-prob-sheet-1', 'Q12'),
  title: t`Exactly one empty box`,
  prompt: t`Suppose that ${mn} balls are tossed independently and at random into ${mn} boxes, where ${math`n \ge ${2}`}. What is the probability that exactly one box is empty? Give a formula in ${mn}; you may write ${math`\binom{n}{${2}}`} as C(n, ${2}) and type ${math`n!`} with an exclamation mark, as on a calculator.`,
  answer: { kind: 'expression', expected: 'choose(n, 2) * factorial(n) / n^n', variables: ['n'], domains: { n: { kind: 'integer', min: 2, max: 9 } }, binomial: true },
  solution: [
    t`All ${math`n^{n}`} ways of placing the balls (ball ${1} to some box, ball ${2} to some box, ...) are equally likely.`,
    t`Exactly one box empty means: one box is empty, one box holds two balls, and every other box holds one. Choose the empty box: ${mn} ways. Choose the box with two: ${math`n - ${1}`} ways. Choose which two balls share it: ${math`\binom{n}{${2}}`} ways.`,
    t`The remaining ${math`n - ${2}`} balls go one each into the remaining ${math`n - ${2}`} boxes, in order: ${math`(n - ${2})!`} ways.`,
    t`So the count is ${math`n(n - ${1})\binom{n}{${2}}(n - ${2})! = \binom{n}{${2}}\,n!`}, and the probability is ${dmath`\frac{\binom{n}{${2}}\,n!}{n^{n}}.`} Check: ${math`n = ${2}`} gives ${math`\frac{${1} \times ${2}}{${4}} = \frac{${1}}{${2}}`} (both balls in the same box), and ${math`n = ${3}`} gives ${math`\frac{${3} \times ${6}}{${27}} = \frac{${2}}{${3}}`}.`,
  ],
  reference: 'C(n, 2) n!/n^n',
  verify: () => {
    for (let n = 2; n <= 6; n++) {
      const formula = (choose(n, 2) * factorial(n)) / n ** n;
      if (Math.abs(formula - oneEmptyBrute(n)) > 1e-12) return `n = ${n}: formula ${formula}, brute force ${oneEmptyBrute(n)}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'n * choose(n, 2) * factorial(n - 2) / n^n', why: t`Choosing the empty box and then the doubled box are two separate choices: ${mn} and then ${math`n - ${1}`}. You have left out one of them.` },
    { response: 'factorial(n) / n^n', why: t`That is the probability that no box is empty. Exactly one empty box means one box gets two balls.` },
  ],
});

const ia12proof = supervision({
  id: 'ia1-q12-check',
  source: cite('ia-prob-sheet-1', 'Q12'),
  title: t`Check the small cases`,
  prompt: t`Derive the probability that exactly one box is empty when ${mn} balls are tossed independently and at random into ${mn} boxes, explaining each factor in your count. Check your answer for ${math`n = ${2}`} and ${math`n = ${3}`} directly, by listing outcomes.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const EX = { n: 8, r: 3 };

export const permutations: TopicContent = {
  topicId: 'comb.permutations',
  goal: t`Count ordered selections of ${mr} objects from ${mn} as ${math`\frac{n!}{(n - r)!}`}.`,
  objective: t`Count ordered selections without repeats, and tell them from unordered ones.`,
  why: t`Ordered counting underlies every probability with equally likely outcomes, from STEP to the Tripos.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Ordered choices` },
    { kind: 'hook', text: t`${EX.n} runners, three medals: gold, silver, bronze. How many different podiums can there be? Not ${math`${EX.n}^{${3}}`}, since nobody wins two medals; and not "the number of groups of three", since gold for Ann and bronze for Bo is a different podium from the reverse.` },
    { kind: 'narrative', text: t`Fill the podium one step at a time. Gold can go to any of the ${EX.n}. Whoever wins gold, silver can go to any of the other ${EX.n - 1}. Then bronze to any of the remaining ${EX.n - 2}. By the product rule there are ${math`${EX.n} \times ${EX.n - 1} \times ${EX.n - 2} = ${perm(EX.n, EX.r)}`} podiums. The pattern: start at ${mn} and count down, one factor per place.` },
    {
      kind: 'definition',
      name: t`Permutation of r from n`,
      formal: t`Let ${math`${0} \le r \le n`}. A [[permutation|permutation]] of ${mr} objects from a set of ${mn} is an ordered list ${math`(a_{${1}}, \ldots, a_{r})`} of ${mr} different elements of the set. Their number is written ${math`{}^{n}P_{r}`} or ${math`P(n, r)`}.`,
      plain: t`An ordered selection without repeats: who comes first, second, and so on. The podium above is a permutation of ${3} from ${EX.n}, and ${math`P(${EX.n}, ${3}) = ${perm(EX.n, EX.r)}`}.`,
    },
    { kind: 'theorem', name: t`Counting permutations`, statement: t`For integers ${math`${0} \le r \le n`}, ${dmath`P(n, r) = n(n - ${1})(n - ${2})\cdots(n - r + ${1}) = \frac{n!}{(n - r)!}.`} In particular ${math`P(n, n) = n!`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Fill the places in order`, text: t`The first entry can be any of the ${mn} objects. Whatever it is, the second can be any of the other ${math`n - ${1}`}. In general, once ${math`i - ${1}`} entries are chosen, the ${math`i`}th can be any of the ${math`n - (i - ${1})`} objects not yet used.` },
        { label: t`Multiply`, text: t`The number of choices at each step does not depend on the earlier choices, so by the product rule ${math`P(n, r) = n(n - ${1})\cdots(n - r + ${1})`}, a product of ${mr} factors.`, why: { q: t`Why is the last factor ${math`n - r + ${1}`}?`, a: t`The ${mr}th place is filled after ${math`r - ${1}`} objects are used, leaving ${math`n - (r - ${1}) = n - r + ${1}`}. For the podium, ${math`n = ${8}`}, ${math`r = ${3}`}: the last factor is ${6}.` } },
        { label: t`Write it with factorials`, text: t`Multiply and divide by ${math`(n - r)! = (n - r)(n - r - ${1})\cdots ${1}`}: the top becomes ${math`n(n - ${1})\cdots ${1} = n!`}. So ${math`P(n, r) = \frac{n!}{(n - r)!}`}.`, plain: t`With ${math`r = n`} this is ${math`\frac{n!}{${0}!} = n!`}, because ${math`${0}! = ${1}`}: arranging all ${mn} objects.` },
      ],
    },
    { kind: 'p', text: t`STEP Support's Stuart counts this way. His name has the different letters S, U, A, R and two identical T's. Placing S, U, A, R into ${6} positions in turn gives ${math`${6} \times ${5} \times ${4} \times ${3} = ${perm(6, 4)}`} ways, and the T's go in the two gaps: an ordered selection of ${4} positions from ${6}.` },
    checkFrom(permGen, { ctx: 'officers', n: 10, r: 3 }, t`Chair, then secretary, then treasurer: ${math`${10} \times ${9} \times ${8} = ${720}`}.`),
    { kind: 'section', title: t`Order or no order` },
    { kind: 'narrative', text: t`A permutation is a choice plus an order. Choose which ${mr} objects, in ${math`\binom{n}{r}`} ways, then arrange them, in ${math`r!`} ways. So ${math`P(n, r) = r!\binom{n}{r}`}. For the podium: ${math`\binom{${8}}{${3}} = ${choose(8, 3)}`} groups of three finalists, each in ${6} orders, ${math`${choose(8, 3)} \times ${6} = ${perm(8, 3)}`}. Ask of every problem: would swapping two chosen objects give a different outcome? If yes, use ${math`P`}; if no, use ${math`\binom{n}{r}`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A ${3}-digit code from the digits ${0} to ${9} can be chosen in ${math`P(${10}, ${3}) = ${720}`} ways.`, counterexample: t`Only if the digits must differ. If repeats are allowed, such as ${math`${0}${0}${7}`}, each place has ${10} choices: ${math`${10}^{${3}} = ${1000}`}. ${math`P(n, r)`} is for lists without repeats.` },
    { kind: 'pitfall', claim: t`The number of ways to pick ${3} of ${8} people for a committee is ${math`P(${8}, ${3}) = ${perm(8, 3)}`}.`, counterexample: t`A committee has no order: ${math`\{A, B, C\}`} is the same committee as ${math`\{C, A, B\}`}. Each committee was counted ${math`${3}! = ${6}`} times, so the answer is ${math`\binom{${8}}{${3}} = ${choose(8, 3)}`}.` },
    { kind: 'pitfall', claim: t`${math`P(n, r) = \frac{n!}{r!}`}.`, counterexample: t`For the podium, ${math`\frac{${8}!}{${3}!} = ${factorial(8) / factorial(3)}`}, far more than ${perm(8, 3)}. The divisor is ${math`(n - r)!`}, the orders of the objects you did not choose.` },
    { kind: 'takeaway', text: t`Ordered, no repeats: count down from ${mn}, one factor per place, ${math`P(n, r) = \frac{n!}{(n - r)!}`}.` },
  ],
  examples: [
    workedCambridge(a6q5),
    worked(permGen, { ctx: 'podium', n: 8, r: 3 }, t`A podium of three`),
    worked(inclGen, { n: 6, r: 3 }, t`Passwords that use a given symbol`),
  ],
  generators: [permGen, wordGen, fixGen, inclGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['permutation'],
  cambridge: [ia12, ia12proof, a6q2],
  gate: ['ia1-q12', 'ia1-q12-check'],
  recall: [
    { front: t`What is ${math`P(n, r)`}, and what does it count?`, back: t`${math`\frac{n!}{(n - r)!} = n(n - ${1})\cdots(n - r + ${1})`}: ordered selections of ${mr} different objects from ${mn}.` },
    { front: t`How are ${math`P(n, r)`} and ${math`\binom{n}{r}`} related?`, back: t`${math`P(n, r) = r!\binom{n}{r}`}: choose the objects, then order them.` },
  ],
  proofOrder: [
    {
      title: t`Why ${math`P(n, r) = \frac{n!}{(n - r)!}`}`,
      steps: [
        t`The first place can take any of the ${mn} objects.`,
        t`Each later place can take any object not yet used: one fewer each time.`,
        t`By the product rule, ${math`P(n, r) = n(n - ${1})\cdots(n - r + ${1})`}.`,
        t`Multiplying and dividing by ${math`(n - r)!`} gives ${math`\frac{n!}{(n - r)!}`}.`,
      ],
    },
  ],
};
