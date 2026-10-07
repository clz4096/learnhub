/**
 * pre.tree-diagrams: Multiplying along branches and adding across them, with and without
 * replacement. From STEP Support Assignment 12, Q2 (the preparation): the bag of mints and
 * lemon sherbets, worked in the hints by a tree (Method 1) and by counting (Method 2); the
 * apple sours and blackcurrant chews, where the second draw depends on the first; and the
 * three children and their goggles. Assignment 6 Q4(i) offers a tree for the smokers.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const pr = (r: Rational): number => Number(r.num) / Number(r.den);
const pow = (r: Rational, n: number): Rational => Array.from({ length: n }, () => r).reduce((a, b) => mul(a, b), q(1));

/** Draw k items from a bag without replacement; the colours drawn, in order. */
function drawWithout(rng: Rng, counts: readonly number[], k: number): number[] {
  const left = [...counts];
  let total = left.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  for (let j = 0; j < k; j++) {
    let at = Math.floor(rng() * total);
    let colour = 0;
    while (at >= (left[colour] as number)) { at -= left[colour] as number; colour++; }
    out.push(colour);
    left[colour] = (left[colour] as number) - 1;
    total--;
  }
  return out;
}

// ---------------------------------------------------------------- generators

type TwoEvent = 'same' | 'different' | 'both-red';
interface TwoP { r: number; b: number; e: TwoEvent }

/** P(event) for two draws without replacement, by multiplying along the tree's branches. */
function twoDraws({ r, b, e }: TwoP): { rr: Rational; rb: Rational; br: Rational; bb: Rational; ans: Rational } {
  const n = r + b;
  const rr = mul(q(r, n), q(r - 1, n - 1));
  const rb = mul(q(r, n), q(b, n - 1));
  const br = mul(q(b, n), q(r, n - 1));
  const bb = mul(q(b, n), q(b - 1, n - 1));
  const ans = e === 'same' ? add(rr, bb) : e === 'different' ? add(rb, br) : rr;
  return { rr, rb, br, bb, ans };
}

const eventText = (e: TwoEvent): string => (e === 'same' ? 'both the same colour' : e === 'different' ? 'of different colours' : 'both red');

const withoutReplacement = generator<TwoP>({
  id: 'without-replacement',
  skill: 'Two draws without replacement: multiply along each branch, add the branches you want, as in STEP Support Assignment 12, Q2(ii).',
  params: (rng) => {
    for (;;) {
      const p: TwoP = { r: int(rng, 2, 9), b: int(rng, 2, 9), e: pick(rng, ['same', 'different', 'both-red'] as const) };
      if (p.r !== p.b) return p;
    }
  },
  sane: ({ r, b }) => (r >= 2 && r <= 9 && b >= 2 && b <= 9 && r !== b ? null : 'out of range'),
  problem: (p) => {
    const { r, b, e } = p;
    const n = r + b;
    const { rr, rb, br, bb, ans } = twoDraws(p);
    return {
      prompt: t`A bag holds ${r} red and ${b} blue counters. I take two out, one after the other, without putting the first back. What is the probability that they are ${eventText(e)}?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`First draw: red with probability ${math`\frac{${r}}{${n}}`}, blue with ${math`\frac{${b}}{${n}}`}. The second draw depends on the first: one counter fewer, ${n - 1} left.`,
        t`Multiply along each [[tree-diagram|branch]]: red then red ${math`\frac{${r}}{${n}} \times \frac{${r - 1}}{${n - 1}} = ${rr}`}; red then blue ${math`\frac{${r}}{${n}} \times \frac{${b}}{${n - 1}} = ${rb}`}; blue then red ${math`${br}`}; blue then blue ${math`\frac{${b}}{${n}} \times \frac{${b - 1}}{${n - 1}} = ${bb}`}.`,
        e === 'same'
          ? t`Same colour is red-red or blue-blue, so add: ${math`${rr} + ${bb} = ${ans}`}.`
          : e === 'different'
            ? t`Different colours is red-blue or blue-red, so add: ${math`${rb} + ${br} = ${ans}`}.`
            : t`Both red is the one branch: ${ans}.`,
      ],
    };
  },
  solve: ({ r, b, e }) => {
    // Count ordered pairs of distinct counters.
    const bag = [...Array(r).fill(0), ...Array(b).fill(1)] as number[];
    let good = 0;
    let all = 0;
    bag.forEach((x, i) => bag.forEach((y, j) => {
      if (i === j) return;
      all++;
      if (e === 'same' ? x === y : e === 'different' ? x !== y : x === 0 && y === 0) good++;
    }));
    return str(q(good, all));
  },
  misconceptions: ({ r, b, e }): Misconception[] => {
    const n = r + b;
    const withRep = e === 'same' ? add(mul(q(r, n), q(r, n)), mul(q(b, n), q(b, n))) : e === 'different' ? mul(q(2), mul(q(r, n), q(b, n))) : mul(q(r, n), q(r, n));
    const out: Misconception[] = [
      { response: str(withRep), why: t`That puts the first counter back. Without replacement the second draw has ${n - 1} counters, and one fewer of the colour already taken.` },
    ];
    const { rr, rb } = twoDraws({ r, b, e });
    if (e === 'same') out.push({ response: str(rr), why: t`That is only red then red. Two blues are the same colour too: add that branch.` });
    if (e === 'different') out.push({ response: str(rb), why: t`That is only red then blue. Blue then red is different colours too: add that branch.` });
    if (e === 'both-red') out.push({ response: str(add(q(r, n), q(r - 1, n - 1))), why: t`Along a branch the probabilities multiply, they do not add: both events must happen.` });
    return out;
  },
  trial: ({ r, b, e }, rng) => {
    const [x, y] = drawWithout(rng, [r, b], 2) as [number, number];
    return e === 'same' ? x === y : e === 'different' ? x !== y : x === 0 && y === 0;
  },
});

interface OneP { n: number; d: number; k: number }

const exactlyOne = generator<OneP>({
  id: 'exactly-one',
  skill: 'Two independent trials: add the branches with exactly one success; there are two orders.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [3, 4, 5, 6, 8, 10]);
      const n = int(rng, 1, d - 1);
      // At two thirds, green twice and exactly once have the same probability, so that slip would be marked right.
      if (3 * n !== 2 * d) return { n, d, k: 2 };
    }
  },
  sane: ({ n, d }) => (n >= 1 && n < d && 3 * n !== 2 * d ? null : 'out of range'),
  problem: ({ n, d }) => {
    const p = q(n, d);
    const notP = sub(q(1), p);
    const ans = mul(q(2), mul(p, notP));
    return {
      prompt: t`A spinner lands on green with probability ${p}. It is spun twice, the spins independent. What is the probability that it lands on green exactly once?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Two branches have exactly one green: green then not green, ${math`${p} \times ${notP} = ${mul(p, notP)}`}, and not green then green, ${math`${notP} \times ${p} = ${mul(p, notP)}`}.`,
        t`Add them: ${math`${2} \times ${mul(p, notP)} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ n, d }) => {
    // All d × d equally likely pairs of sectors; count those with exactly one green.
    let good = 0;
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) if ((a < n ? 1 : 0) + (b < n ? 1 : 0) === 1) good++;
    return str(q(good, d * d));
  },
  misconceptions: ({ n, d }): Misconception[] => {
    const p = q(n, d);
    return [
      { response: str(mul(p, sub(q(1), p))), why: t`That is one order only. Green can come first or second: add both branches.` },
      { response: str(mul(p, p)), why: t`That is green both times. Exactly once means one green and one other.` },
      { response: str(sub(q(1), mul(sub(q(1), p), sub(q(1), p)))), why: t`That is at least once, which includes green both times. Exactly once leaves that branch out.` },
    ];
  },
  trial: ({ n, d }, rng) => (rng() < n / d ? 1 : 0) + (rng() < n / d ? 1 : 0) === 1,
});

interface AtLeastP { n: number; d: number; k: number }

const atLeastOne = generator<AtLeastP>({
  id: 'at-least-one',
  skill: 'At least one success in several independent trials: one minus the branch where every trial fails, as in STEP Support Assignment 12, Q2(iv)(a).',
  params: (rng) => ({ d: pick(rng, [3, 4, 5, 6]), n: 1, k: int(rng, 2, 4) }),
  sane: ({ n, d, k }) => (n >= 1 && n < d && k >= 2 && k <= 4 ? null : 'out of range'),
  problem: ({ n, d, k }) => {
    const p = q(n, d);
    const none = pow(sub(q(1), p), k);
    const ans = sub(q(1), none);
    return {
      prompt: t`Each of ${k} children, independently of the others, remembers their goggles with probability ${p}. What is the probability that at least one child has goggles?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`"At least one" covers every branch but one: the branch where every child forgets.`,
        t`That branch has probability ${math`\left(${sub(q(1), p)}\right)^{${k}} = ${none}`}, multiplying along it.`,
        t`So the answer is ${math`${1} - ${none} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ n, d, k }) => {
    // Add the probabilities of every branch with at least one success.
    const p = q(n, d);
    let total = q(0);
    for (let m = 1; m < 2 ** k; m++) {
      let branch = q(1);
      for (let i = 0; i < k; i++) branch = mul(branch, ((m >> i) & 1) === 1 ? p : sub(q(1), p));
      total = add(total, branch);
    }
    return str(total);
  },
  misconceptions: ({ n, d, k }): Misconception[] => {
    const p = q(n, d);
    return [
      { response: str(mul(q(k), p)), why: t`Adding ${p} for each child counts the branches where two or more have goggles more than once. Use one minus the chance that nobody has them.` },
      { response: str(sub(q(1), pow(p, k))), why: t`That is one minus the chance that every child has goggles. "At least one" fails only when every child forgets.` },
      { response: str(pow(sub(q(1), p), k)), why: t`That is the chance that nobody has goggles. Subtract it from ${1}.` },
    ];
  },
  trial: ({ n, d, k }, rng) => Array.from({ length: k }, () => rng() < n / d).some((x) => x),
});

interface StageP { pa: number; ra: number; na: number; rb: number; nb: number }

const twoStage = generator<StageP>({
  id: 'two-stage',
  skill: 'Choose a bag, then a counter: multiply along each branch and add the branches that end in red.',
  params: (rng) => {
    for (;;) {
      // Not a two-sided choice: with equal chances, the "equally likely bags" slip would be right.
      const p: StageP = { pa: pick(rng, [3, 4, 5, 6]), ra: int(rng, 1, 5), na: int(rng, 5, 9), rb: int(rng, 1, 5), nb: int(rng, 5, 9) };
      // The bags must differ, so ignoring the first stage gives a wrong answer.
      if (p.ra < p.na && p.rb < p.nb && p.ra * p.nb !== p.rb * p.na) return p;
    }
  },
  sane: ({ pa, ra, na, rb, nb }) => (pa >= 3 && ra < na && rb < nb && ra * nb !== rb * na ? null : 'out of range'),
  problem: ({ pa, ra, na, rb, nb }) => {
    const a = q(1, pa);
    const notA = sub(q(1), a);
    const ans = add(mul(a, q(ra, na)), mul(notA, q(rb, nb)));
    return {
      prompt: t`Bag A holds ${ra} red counters out of ${na}; bag B holds ${rb} red out of ${nb}. I roll a fair ${pa}-sided die: on a ${1} I use bag A, otherwise bag B. I take one counter from that bag at random. What is the probability that it is red?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`First stage: bag A with probability ${a}, bag B with ${notA}. Second stage: red with ${math`\frac{${ra}}{${na}}`} from A, ${math`\frac{${rb}}{${nb}}`} from B.`,
        t`Multiply along the two red branches and add: ${math`${a} \times \frac{${ra}}{${na}} + ${notA} \times \frac{${rb}}{${nb}} = ${mul(a, q(ra, na))} + ${mul(notA, q(rb, nb))} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ pa, ra, na, rb, nb }) => {
    // Equally likely (die face, counter) pairs, with each bag padded to a common size.
    const L = na * nb;
    let good = 0;
    for (let f = 1; f <= pa; f++) for (let c = 0; c < L; c++) if (f === 1 ? c < ra * nb : c < rb * na) good++;
    return str(q(good, pa * L));
  },
  misconceptions: ({ pa, ra, na, rb, nb }): Misconception[] => [
    { response: str(mul(q(1, 2), add(q(ra, na), q(rb, nb)))), why: t`That treats the bags as equally likely. Bag A is used only with probability ${q(1, pa)}: weight each branch by its first stage.` },
    { response: str(add(q(ra, na), q(rb, nb))), why: t`Each red branch's probability is the product along it. Multiply by the chance of choosing the bag first.` },
    { response: str(q(ra + rb, na + nb)), why: t`Pooling the bags treats every counter as equally likely, but you only ever draw from one bag, chosen by the die.` },
  ],
  trial: ({ pa, ra, na, rb, nb }, rng) => (Math.floor(rng() * pa) === 0 ? rng() < ra / na : rng() < rb / nb),
});

// ---------------------------------------------------------------- Cambridge problems

const MINTS = 9;
const LEMONS = 6;
const sameFlavour = twoDraws({ r: MINTS, b: LEMONS, e: 'same' });
/** The number of unordered pairs from n. */
const pairs = (n: number): number => (n * (n - 1)) / 2;

const a12ii = auto({
  id: 'a12-q2-ii',
  source: cite('step-f12', 'Q2(ii)'),
  title: t`Two sweets of the same flavour`,
  prompt: t`I have a bag of sweets which contains ${MINTS} mint imperials and ${LEMONS} lemon sherbets. I take two sweets out of the bag without looking (one after the other) and eat them. What is the probability that I eat two sweets of the same flavour?`,
  answer: { kind: 'exact', expected: str(sameFlavour.ans) },
  solution: [
    t`The probabilities for the second sweet depend on the first: they are conditional. Draw the tree with ${MINTS + LEMONS} sweets, then ${MINTS + LEMONS - 1}.`,
    t`Two mints: ${math`\frac{${MINTS}}{${MINTS + LEMONS}} \times \frac{${MINTS - 1}}{${MINTS + LEMONS - 1}} = ${sameFlavour.rr}`}. Two lemons: ${math`\frac{${LEMONS}}{${MINTS + LEMONS}} \times \frac{${LEMONS - 1}}{${MINTS + LEMONS - 1}} = ${sameFlavour.bb}`}.`,
    t`Same flavour is either branch, so add: ${math`${sameFlavour.rr} + ${sameFlavour.bb} = ${sameFlavour.ans}`}.`,
    t`The hints' Method ${2} counts pairs instead: ${math`\frac{\binom{${MINTS}}{${2}} + \binom{${LEMONS}}{${2}}}{\binom{${MINTS + LEMONS}}{${2}}} = \frac{${pairs(MINTS)} + ${pairs(LEMONS)}}{${pairs(MINTS + LEMONS)}} = ${sameFlavour.ans}`}, the same answer. Taking both sweets at once or one after the other makes no difference.`,
  ],
  reference: str(sameFlavour.ans),
  verify: () => {
    return same('two methods', str(sameFlavour.ans), str(q(pairs(MINTS) + pairs(LEMONS), pairs(MINTS + LEMONS))));
  },
  misconceptions: [{ response: str(add(mul(q(MINTS, 15), q(MINTS, 15)), mul(q(LEMONS, 15), q(LEMONS, 15)))), why: t`That puts the first sweet back, but it was eaten. The second draw is from ${14} sweets.` }],
  official: { source: cite('step-f12-hints', 'Q2(ii)'), answer: '17/35', agrees: true },
});

const a12iiib = auto({
  id: 'a12-q2-iii-b',
  source: cite('step-f12', 'Q2(iii)(b)'),
  title: t`Three blackcurrant chews`,
  prompt: t`I have another bag of sweets, with ${math`a`} apple sours and ${math`b`} blackcurrant chews. I take three sweets one after the other and eat them. What is the probability that they are all blackcurrant chews? Leave it as a product of three fractions, or as one fraction, in ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'b/(a+b) * (b-1)/(a+b-1) * (b-2)/(a+b-2)', variables: ['a', 'b'], domains: { a: { kind: 'integer', min: 1, max: 30 }, b: { kind: 'integer', min: 3, max: 30 } } },
  solution: [
    t`Each sweet eaten leaves one blackcurrant chew fewer and one sweet fewer. Multiply along the branch:`,
    t`${math`\frac{b}{a + b} \times \frac{b - ${1}}{a + b - ${1}} \times \frac{b - ${2}}{a + b - ${2}}`}.`,
  ],
  reference: 'b(b - 1)(b - 2)/((a + b)(a + b - 1)(a + b - 2))',
  verify: () => {
    // Against a count of ordered triples of distinct sweets, for small bags.
    for (let a = 1; a <= 4; a++) for (let b = 3; b <= 6; b++) {
      const n = a + b;
      const want = q(b * (b - 1) * (b - 2), n * (n - 1) * (n - 2));
      let good = 0;
      let all = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        if (i === j || j === k || i === k) continue;
        all++;
        if (i >= a && j >= a && k >= a) good++;
      }
      const e = same(`a = ${a}, b = ${b}`, str(q(good, all)), str(want));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(b/(a+b))^3', why: t`That puts each sweet back. They are eaten, so each draw has one sweet fewer and one chew fewer.` }],
  official: { source: cite('step-f12-hints', 'Q2(iii)'), answer: 'b/(a + b) × (b − 1)/(a + b − 1) × (b − 2)/(a + b − 2)', agrees: true },
});

const GOGGLES = q(1, 4);
const a12iva = auto({
  id: 'a12-q2-iv-a',
  source: cite('step-f12', 'Q2(iv)(a)'),
  title: t`At least one child has goggles`,
  prompt: t`Three children have a swimming lesson. Each child, independently of the other two, has probability ${GOGGLES} of remembering to bring goggles. By considering the different possibilities, find the probability that at least one child has goggles.`,
  answer: { kind: 'exact', expected: str(sub(q(1), pow(sub(q(1), GOGGLES), 3))) },
  solution: [
    t`The tree has ${8} branches. The easiest approach is to find the probability that all three have forgotten, the one branch with no goggles, and subtract it from ${1}.`,
    t`${math`${1} - \left(${sub(q(1), GOGGLES)}\right)^{${3}} = ${1} - ${pow(sub(q(1), GOGGLES), 3)} = ${sub(q(1), pow(sub(q(1), GOGGLES), 3))}`}.`,
  ],
  reference: str(sub(q(1), pow(sub(q(1), GOGGLES), 3))),
  verify: () => same('at least one, by the eight branches', atLeastOne.at({ n: 1, d: 4, k: 3 }).reference as string, str(sub(q(1), pow(sub(q(1), GOGGLES), 3)))),
  misconceptions: [{ response: str(q(3, 4)), why: t`Adding ${GOGGLES} three times counts the branches with two or three goggles more than once.` }],
  official: { source: cite('step-f12-hints', 'Q2(iv)(a)'), answer: '37/64', agrees: true },
});

const middle = mul(sub(q(1), GOGGLES), mul(GOGGLES, GOGGLES));
const a12ivc = auto({
  id: 'a12-q2-iv-c',
  source: cite('step-f12', 'Q2(iv)(c)'),
  title: t`Only the middle child forgets`,
  prompt: t`The same three children, each remembering goggles with probability ${GOGGLES}, independently. What is the probability that the middle child has not got goggles, but the other two have?`,
  answer: { kind: 'exact', expected: str(middle) },
  solution: [
    t`This is one branch of the tree: first child has goggles, middle child forgets, last child has goggles.`,
    t`Multiply along it: ${math`${GOGGLES} \times ${sub(q(1), GOGGLES)} \times ${GOGGLES} = ${middle}`}.`,
    t`The hints point out the order is not what matters: it is that one particular child forgets. If any one of the three could be the one, there would be three such branches, and the answer would be multiplied by ${3}.`,
  ],
  reference: str(middle),
  verify: () => {
    // Enumerate the eight branches and keep the one asked for.
    let total = q(0);
    for (let m = 0; m < 8; m++) {
      const has = [0, 1, 2].map((i) => ((m >> i) & 1) === 1);
      if (!(has[0] === true && has[1] === false && has[2] === true)) continue;
      total = add(total, has.map((h) => (h ? GOGGLES : sub(q(1), GOGGLES))).reduce((x, y) => mul(x, y), q(1)));
    }
    return same('the middle child only', str(total), str(middle));
  },
  misconceptions: [{ response: str(mul(q(3), middle)), why: t`That is the chance that any one of the three forgets. The question names the middle child, so only one branch counts.` }],
  // The extracted text prints "64." here; the PDF reads 3/4 × (1/4)² = 3/64.
  official: { source: cite('step-f12-hints', 'Q2(iv)(c)'), answer: '3/64', agrees: true },
});

const a12methods = supervision({
  id: 'a12-q2-ii-methods',
  source: cite('step-f12', 'Q2(ii)', true),
  title: t`One after the other, or both at once`,
  prompt: t`A bag holds ${MINTS} mint imperials and ${LEMONS} lemon sherbets, and I eat two. Work out the probability that they are the same flavour in two ways: by a tree diagram, taking them one after the other, and by counting pairs, taking both at once. Explain why the two methods must agree.`,
  writeUp: 'explanation',
  official: cite('step-f12-hints', 'Q2(ii)'),
});

const smokers = supervision({
  id: 'a6-q4-i-tree',
  source: cite('step-f06', 'Q4(i)', true),
  title: t`A tree for the smokers`,
  prompt: t`A study of a large population found that ${40}% were men and ${60}% were women. Of the men ${50}% were smokers, and of the women ${30}%. Draw the tree diagram, with the first branches for man or woman and the second for smoker or not, and label every branch. Use it to find the probability that a person picked at random is a smoker, and explain which branches you added and why.`,
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q4(i)'),
});

// ---------------------------------------------------------------- lesson

const EX = { r: 3, b: 2 };
const ex = twoDraws({ ...EX, e: 'same' });
const exN = EX.r + EX.b;
const SPIN = q(1, 3);
const claims: ProbabilityClaim[] = [
  { what: 'two sweets of the same flavour', exact: sameFlavour.ans, trial: (rng) => { const [x, y] = drawWithout(rng, [MINTS, LEMONS], 2); return x === y; } },
  { what: 'three red and two blue: two counters of the same colour', exact: ex.ans, trial: (rng) => { const [x, y] = drawWithout(rng, [EX.r, EX.b], 2); return x === y; } },
  { what: 'a spinner green with probability 1/3, spun three times: at least one green', exact: sub(q(1), pow(sub(q(1), SPIN), 3)), trial: (rng) => [0, 1, 2].some(() => rng() < pr(SPIN)) },
];

export const treeDiagrams: TopicContent = {
  topicId: 'pre.tree-diagrams',
  goal: t`Draw a tree diagram for two or three stages, multiply along branches, and add across them, with and without replacement.`,
  objective: t`Use a tree diagram to multiply along branches and add across them, with and without replacement.`,
  why: t`Trees organise every multi-stage probability, and lead straight to conditional probability and Bayes.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`When the second draw remembers the first` },
    { kind: 'hook', text: t`A bag holds ${EX.r} red and ${EX.b} blue counters. You take one out, keep it, and take another. What is the chance both are the same colour? The second draw is not a fresh start: what is left in the bag depends on what you took first.` },
    { kind: 'narrative', text: t`The way to keep track is to draw the experiment as it happens, one stage at a time. The first counter branches into red or blue. From each of those, the second counter branches again, with probabilities that reflect what is now left. That picture is a tree.` },
    { kind: 'section', title: t`Multiplying along a path` },
    {
      kind: 'definition',
      name: t`Tree diagram`,
      formal: t`A [[tree-diagram|tree diagram]] shows an experiment in stages. Each stage branches into its possible outcomes, and each branch is labelled with the probability of that outcome given every outcome earlier on its path. The branches leaving one point add up to ${1}.`,
      plain: t`In plain words: a map of what can happen, in order. The second-stage branch "red" after a first red is labelled ${math`\frac{${EX.r - 1}}{${exN - 1}}`}, because after a red is taken, ${EX.r - 1} of the remaining ${exN - 1} counters are red.`,
    },
    { kind: 'theorem', name: t`Multiplying along a path`, statement: t`The probability of a whole path is the product of the probabilities on its branches. For two stages, ${math`P(\text{first } A \text{ and then } B) = P(A) \times P(B \text{ given } A)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`List equally likely outcomes`, text: t`Label the counters. An outcome is an ordered pair (first, second) of different counters: ${math`${exN} \times ${exN - 1} = ${exN * (exN - 1)}`} pairs, all equally likely.` },
        { label: t`Count the path`, text: t`Red then red: ${EX.r} choices for the first, then ${EX.r - 1} for the second, so ${math`${EX.r} \times ${EX.r - 1} = ${EX.r * (EX.r - 1)}`} pairs.` },
        { label: t`Divide and split`, text: t`So the probability is`, eq: [dmath`\frac{${EX.r} \times ${EX.r - 1}}{${exN} \times ${exN - 1}} = \frac{${EX.r}}{${exN}} \times \frac{${EX.r - 1}}{${exN - 1}} = ${ex.rr},`], plain: t`which is the first branch times the second: the product rule for counting, divided through.` },
      ],
    },
    { kind: 'p', text: t`Drawing [[without-replacement|without replacement]] changes the second-stage numbers; drawing with replacement, or tossing coins, does not. The STEP Support hints to Assignment ${12} stress exactly this: the probabilities for the second sweet depend on what happened to the first.` },
    { kind: 'section', title: t`Adding across paths` },
    { kind: 'narrative', text: t`Different paths are different ways the experiment can go, and no two can both happen. So the probability of an event made of several paths is the sum of the paths.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Red, red`, text: t`${math`\frac{${EX.r}}{${exN}} \times \frac{${EX.r - 1}}{${exN - 1}} = ${ex.rr}`}.` },
        { label: t`Blue, blue`, text: t`${math`\frac{${EX.b}}{${exN}} \times \frac{${EX.b - 1}}{${exN - 1}} = ${ex.bb}`}.` },
        { label: t`Add`, text: t`Both the same colour: ${math`${ex.rr} + ${ex.bb} = ${ex.ans}`}.`, plain: t`Check: all four paths together give ${math`${ex.rr} + ${ex.rb} + ${ex.br} + ${ex.bb} = ${add(add(ex.rr, ex.rb), add(ex.br, ex.bb))}`}.` },
      ],
    },
    checkFrom(withoutReplacement, { r: 4, b: 2, e: 'different' }, t`Red then blue, ${math`\frac{${4}}{${6}} \times \frac{${2}}{${5}}`}, plus blue then red, ${math`\frac{${2}}{${6}} \times \frac{${4}}{${5}}`}: ${q(16, 30)}.`),
    { kind: 'pitfall', claim: t`Two counters from ${EX.r} red and ${EX.b} blue, without replacement, are both red with probability ${math`\left(\frac{${EX.r}}{${exN}}\right)^{${2}} = ${pow(q(EX.r, exN), 2)}`}.`, counterexample: t`That puts the first counter back. Without replacement the second branch is ${math`\frac{${EX.r - 1}}{${exN - 1}}`}, giving ${ex.rr}.` },
    { kind: 'section', title: t`Independent stages and "at least one"` },
    { kind: 'narrative', text: t`When the stages do not affect each other, as with spins of a spinner, every branch at a stage carries the same numbers. Two questions come up constantly. "Exactly one success" is two paths, success then failure and failure then success. "At least one success" over several stages is many paths, but its complement is a single path: every stage fails.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The one path that fails`, text: t`A spinner lands green with probability ${SPIN}, three times independently. No green at all: ${math`\left(${sub(q(1), SPIN)}\right)^{${3}} = ${pow(sub(q(1), SPIN), 3)}`}.` },
        { label: t`Take the complement`, text: t`At least one green: ${math`${1} - ${pow(sub(q(1), SPIN), 3)} = ${sub(q(1), pow(sub(q(1), SPIN), 3))}`}.`, plain: t`One path to subtract instead of seven to add.` },
      ],
    },
    checkFrom(exactlyOne, { n: 1, d: 4, k: 2 }, t`Green then not, ${math`${q(1, 4)} \times ${q(3, 4)}`}, or not then green, the same again: ${math`${2} \times ${q(3, 16)} = ${q(3, 8)}`}.`),
    { kind: 'pitfall', claim: t`Exactly one green in two spins, each green with probability ${q(1, 4)}, is ${math`${q(1, 4)} \times ${q(3, 4)} = ${q(3, 16)}`}.`, counterexample: t`That is one path, green first. The green can also come second, so there are two paths: ${q(3, 8)}.` },
    { kind: 'takeaway', text: t`Multiply along a path, using what is left at each stage; add the paths you want; and for "at least one", subtract the single path where everything fails.` },
  ],
  examples: [
    workedCambridge(a12ii),
    worked(atLeastOne, { n: 1, d: 3, k: 3 }, t`At least one of three`),
    worked(twoStage, { pa: 3, ra: 2, na: 5, rb: 3, nb: 4 }, t`Choose a bag, then a counter`),
  ],
  generators: [withoutReplacement, exactlyOne, atLeastOne, twoStage],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['tree-diagram', 'without-replacement'],
  claims,
  cambridge: withUses([a12iiib, a12iva, a12ivc, a12methods, smokers], {
    'a12-q2-ii-methods': { sections: ['Multiplying along a path', 'Adding across paths'], note: t`One problem by a tree and by counting pairs`, needs: ['comb.combinations'] },
    'a6-q4-i-tree': { sections: ['Multiplying along a path', 'Adding across paths'], note: t`Drawing and labelling a two-stage tree and adding paths` },
    'a12-q2-iii-b': { sections: ['When the second draw remembers the first', 'Multiplying along a path'], note: t`Multiplying along a path without replacement` },
    'a12-q2-iv-a': { sections: ['Independent stages and "at least one"'], note: t`"At least one" by the complement` },
  }),
  // Best first: the two-method write-up, the labelled smokers tree, the three draws in
  // letters, then at least one child with goggles. The middle child alone (one product) is too
  // slight to gate.
  gate: ['a12-q2-ii-methods', 'a6-q4-i-tree', 'a12-q2-iii-b', 'a12-q2-iv-a'],
  recall: [
    { front: t`How do you find the probability of one path through a tree?`, back: t`Multiply the probabilities on its branches, each given what came before.` },
    { front: t`How do you combine several paths?`, back: t`Add them: different paths cannot both happen.` },
    { front: t`Quickest route to "at least one success"?`, back: t`One minus the single path where every stage fails.` },
  ],
  proofOrder: [
    {
      title: t`Red then red, by counting`,
      steps: [
        t`Label the counters; ordered pairs of different counters are equally likely.`,
        t`There are ${math`${exN} \times ${exN - 1}`} pairs in all.`,
        t`Red then red: ${math`${EX.r} \times ${EX.r - 1}`} pairs.`,
        t`Divide and split: ${math`\frac{${EX.r}}{${exN}} \times \frac{${EX.r - 1}}{${exN - 1}}`}.`,
      ],
    },
  ],
};
