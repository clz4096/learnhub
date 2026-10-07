/**
 * prob.first-step: find the chance that a repeated experiment ends one way by conditioning
 * on its first step and solving the equations that result. From Mixed STEP 1 Statistics
 * Q12 (choosing among three options with a coin, two ways) and Q13 (2015 S2 Q12: HHT, THH,
 * TTH, HTT), STEP 2 Statistics Q3(i) (2011 S2 Q12: Xavier and Younis), and IA Probability
 * Example Sheet 2 Q3 and Q4 (an even number of successes; darts). Every answer is checked
 * by solving the first-step equations exactly on the states of the experiment, and the STEP
 * answers are compared with the official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computed, join, math, t, type Rich } from '../rich';
import { quickCheck, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
import { far, solveLinear, threePointGame } from '../partv-a';

const MIX = 'step-mixed-stats1' as const;
const MIXS = 'step-mixed-stats1-hints' as const;
const S2 = 'ia-prob-sheet-2' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

/**
 * Pattern races: a coin with P(H) = h is tossed until one of the patterns (all the same
 * length L) appears; the probability that each pattern wins. Solved exactly by first-step
 * equations on the last L - 1 tosses: the start is the first L - 1 tosses, each string of
 * them with its probability.
 */
export function race(patterns: readonly string[], h: Rational): Rational[] {
  const L = (patterns[0] as string).length;
  const states: string[] = [];
  const build = (s: string): void => { if (s.length === L - 1) { states.push(s); return; } build(`${s}H`); build(`${s}T`); };
  build('');
  const idx = new Map(states.map((s, i) => [s, i] as const));
  const pr = (c: string): Rational => (c === 'H' ? h : sub(q(1), h));
  const prOf = (s: string): Rational => [...s].reduce((acc, c) => mul(acc, pr(c)), q(1));
  return patterns.map((target) => {
    const n = states.length;
    const a = states.map((_, i) => states.map((__, j) => (i === j ? q(1) : q(0))));
    const b = states.map(() => q(0));
    states.forEach((s, i) => {
      for (const c of ['H', 'T']) {
        const w = `${s}${c}`;
        if (w === target) b[i] = add(b[i] as Rational, pr(c));
        else if (!patterns.includes(w)) {
          const j = idx.get(w.slice(1)) as number;
          (a[i] as Rational[])[j] = sub((a[i] as Rational[])[j] as Rational, pr(c));
        }
      }
    });
    const x = n === 0 ? [] : solveLinear(a, b);
    return states.reduce((acc, s, i) => add(acc, mul(prOf(s), x[i] as Rational)), q(0));
  });
}

/** One run of a pattern race; the index of the pattern that appears first. */
function runRace(patterns: readonly string[], h: number, rng: Rng): number {
  let s = '';
  for (;;) {
    s += rng() < h ? 'H' : 'T';
    for (let i = 0; i < patterns.length; i++) if (s.endsWith(patterns[i] as string)) return i;
  }
}

// ---------------------------------------------------------------- repeat until decided

interface RepP { sa: readonly number[]; sb: readonly number[] }
/** The number of the 36 throws of two dice with a total in the set. */
const ways = (totals: readonly number[]): number => totals.reduce((acc, s) => acc + (6 - Math.abs(s - 7)), 0);
const repVals = ({ sa, sb }: RepP) => ({ a: q(ways(sa), 36), b: q(ways(sb), 36) });
const repMis = (p: RepP): string[] => {
  const { a, b } = repVals(p);
  const r = sub(q(1), add(a, b));
  return [str(a), str(sub(q(1), b)), str(mul(a, add(q(1), r)))];
};
const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const repeatUntil = generator<RepP>({
  id: 'repeat-until',
  skill: 'Find the chance that a repeated experiment ends one way: condition on the first round, x = a + rx, so x = a/(a + b).',
  params: (rng) => {
    for (;;) {
      const ka = int(rng, 1, 2);
      const kb = int(rng, 1, 2);
      const pickTotals = (k: number, avoid: readonly number[]): number[] => {
        const out: number[] = [];
        while (out.length < k) { const s = pick(rng, TOTALS); if (!out.includes(s) && !avoid.includes(s)) out.push(s); }
        return out.sort((x, y) => x - y);
      };
      const sa = pickTotals(ka, []);
      const sb = pickTotals(kb, sa);
      const p: RepP = { sa, sb };
      const { a, b } = repVals(p);
      if (str(a) !== str(b) && distinctFrom(str(div(a, add(a, b))), repMis(p)) >= 2) return p;
    }
  },
  sane: ({ sa, sb }) => (sa.every((s) => !sb.includes(s)) ? null : 'out of range'),
  problem: (p) => {
    const { a, b } = repVals(p);
    const r = sub(q(1), add(a, b));
    const totals = (xs: readonly number[]): Rich => join(xs.map((x) => t`${x}`), ' or ');
    return {
      prompt: t`Ann and Ben throw two fair dice, again and again. If the total is ${totals(p.sa)}, Ann wins; if it is ${totals(p.sb)}, Ben wins; otherwise they throw again. What is the probability that Ann wins?`,
      answer: { kind: 'exact', expected: str(div(a, add(a, b))) },
      solution: [
        t`One throw: Ann wins with probability ${math`a = ${a}`}, Ben with ${math`b = ${b}`}, and nobody with ${math`r = ${r}`}.`,
        t`Condition on the first throw. If nobody wins, the game starts afresh, so Ann's chance is ${math`x`} again: ${math`x = a + r x`}, and ${math`x = \frac{a}{${1} - r} = \frac{a}{a + b} = ${div(a, add(a, b))}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Add the rounds: nobody wins for k throws, then Ann does, summed exactly in closed form round by round.
    const { a, b } = repVals(p);
    const r = sub(q(1), add(a, b));
    const [x] = solveLinear([[sub(q(1), r)]], [a]);
    return str(x as Rational);
  },
  misconceptions: (p): Misconception[] => {
    const [one, notB, two] = repMis(p);
    return [
      { response: one as string, why: t`That is Ann winning on the first throw only. If nobody wins, they throw again, and she can win later.` },
      { response: notB as string, why: t`That is the chance Ben does not win on the first throw. Someone wins eventually, and Ann's share is ${math`\frac{a}{a + b}`}.` },
      { response: two as string, why: t`That stops after two throws. The game can go on for any number of rounds: ${math`x = a + rx`}.` },
    ];
  },
  trial: (p, rng) => {
    for (;;) {
      const s = 2 + Math.floor(rng() * 6) + Math.floor(rng() * 6);
      if (p.sa.includes(s)) return true;
      if (p.sb.includes(s)) return false;
    }
  },
});

// ---------------------------------------------------------------- alternate turns

interface TurnP { a: Rational; b: Rational; who: 'A' | 'B' }
const HITS: readonly Rational[] = [q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(1, 5), q(2, 5), q(1, 6), q(3, 4)];
const aWins = ({ a, b }: TurnP): Rational => div(a, sub(q(1), mul(sub(q(1), a), sub(q(1), b))));
const turnVal = (p: TurnP): Rational => (p.who === 'A' ? aWins(p) : sub(q(1), aWins(p)));
const turnMis = (p: TurnP): string[] => [
  str(p.who === 'A' ? div(p.a, add(p.a, p.b)) : div(p.b, add(p.a, p.b))),
  str(p.who === 'A' ? p.a : mul(sub(q(1), p.a), p.b)),
  str(p.who === 'A' ? sub(q(1), aWins(p)) : aWins(p)),
];

const alternateTurns = generator<TurnP>({
  id: 'alternate-turns',
  skill: 'Find the chance that the first player wins when two take turns: condition on the first round, as in the darts of Sheet 2 Q4.',
  params: (rng) => {
    for (;;) {
      const p: TurnP = { a: pick(rng, HITS), b: pick(rng, HITS), who: pick(rng, ['A', 'B'] as const) };
      if (distinctFrom(str(turnVal(p)), turnMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a.num > 0n && b.num > 0n ? null : 'out of range'),
  problem: (p) => {
    const miss = mul(sub(q(1), p.a), sub(q(1), p.b));
    return {
      prompt: t`Two darts players, A and B, throw alternately at a board, A first, and the first to score a bull wins. On each throw, A scores a bull with probability ${p.a} and B with probability ${p.b}, independently. What is the probability that ${p.who} wins?`,
      answer: { kind: 'exact', expected: str(turnVal(p)) },
      solution: [
        t`Let ${math`x`} be the probability that A wins. Condition on the first round: A hits (probability ${p.a}), or A misses and then B hits, or both miss (probability ${math`${sub(q(1), p.a)} \times ${sub(q(1), p.b)} = ${miss}`}) and the game starts again.`,
        t`${math`x = ${p.a} + ${miss} x`}, so ${math`x = \frac{${p.a}}{${1} - ${miss}} = ${aWins(p)}`}.${p.who === 'B' ? t` Someone wins with probability ${1}, so B wins with ${math`${1} - x = ${turnVal(p)}`}.` : t``}`,
      ],
    };
  },
  solve: (p) => {
    // Two unknowns: A's chance when A is to throw (x) and when B is to throw (y).
    const [x] = solveLinear([[q(1), sub(q(0), sub(q(1), p.a))], [sub(q(0), sub(q(1), p.b)), q(1)]], [p.a, q(0)]);
    return str(p.who === 'A' ? (x as Rational) : sub(q(1), x as Rational));
  },
  misconceptions: (p): Misconception[] => {
    const [share, firstRound, other] = turnMis(p);
    return [
      { response: share as string, why: t`Sharing in proportion to the hit rates ignores that A throws first, which is an advantage.` },
      { response: firstRound as string, why: t`That is ${p.who} winning in the first round only. If both miss, the game starts again.` },
      { response: other as string, why: t`That is the other player's chance.` },
    ];
  },
  trial: (p, rng) => {
    for (;;) {
      if (rng() < toFloat(p.a)) return p.who === 'A';
      if (rng() < toFloat(p.b)) return p.who === 'B';
    }
  },
});

// ---------------------------------------------------------------- two patterns of two tosses

interface PatP { x: string; y: string; h: Rational }
const PAIRS: readonly (readonly [string, string])[] = [['HH', 'TH'], ['HH', 'HT'], ['TT', 'HT'], ['HT', 'TT'], ['HH', 'TT'], ['TH', 'HH'], ['TT', 'TH']];
const H_PROBS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4)];
const patMis = (p: PatP): string[] => {
  const pr = (c: string): Rational => (c === 'H' ? p.h : sub(q(1), p.h));
  const [, xT] = race2(p);
  return ['1/2', str(mul(pr(p.x[0] as string), pr(p.x[1] as string))), str(xT)];
};
/** The two state values (after H, after T) and the answer, by the first-step equations. */
function race2(p: PatP): [Rational, Rational, Rational] {
  const qq = sub(q(1), p.h);
  const pr = (c: string): Rational => (c === 'H' ? p.h : qq);
  const a = [[q(1), q(0)], [q(0), q(1)]];
  const b = [q(0), q(0)];
  ['H', 'T'].forEach((s, i) => {
    for (const c of ['H', 'T']) {
      const w = `${s}${c}`;
      if (w === p.x) b[i] = add(b[i] as Rational, pr(c));
      else if (w !== p.y) (a[i] as Rational[])[c === 'H' ? 0 : 1] = sub((a[i] as Rational[])[c === 'H' ? 0 : 1] as Rational, pr(c));
    }
  });
  const [xH, xT] = solveLinear(a, b) as [Rational, Rational];
  return [xH, xT, add(mul(p.h, xH), mul(qq, xT))];
}
/** The right-hand side of one first-step equation, as LaTeX. */
function eqTex(p: PatP, s: string): Rich {
  const qq = sub(q(1), p.h);
  const term = (c: string): Rich => {
    const w = `${s}${c}`;
    const coef = c === 'H' ? p.h : qq;
    const what = w === p.x ? '1' : w === p.y ? '0' : c === 'H' ? 'h' : 't';
    return what === '1' ? [math`${coef}`] : what === '0' ? [math`${coef} \times ${0}`] : [math`${coef} ${what}`];
  };
  return [math`${s === 'H' ? 'h' : 't'} = ${term('H')} + ${term('T')}`];
}

const patternRace = generator<PatP>({
  id: 'pattern-race',
  skill: 'Race two patterns of two tosses: condition on the last toss, write one equation per state, and solve them.',
  params: (rng) => {
    for (;;) {
      const [x, y] = pick(rng, PAIRS);
      const flip = rng() < 0.5;
      const p: PatP = { x: flip ? y : x, y: flip ? x : y, h: pick(rng, H_PROBS) };
      if (distinctFrom(str(race2(p)[2]), patMis(p)) >= 2) return p;
    }
  },
  sane: ({ x, y }) => (x !== y && x.length === 2 && y.length === 2 ? null : 'out of range'),
  problem: (p) => {
    const [xH, xT, ans] = race2(p);
    const qq = sub(q(1), p.h);
    return {
      prompt: t`A coin lands heads with probability ${p.h}. It is tossed until ${computed(p.x)} or ${computed(p.y)} appears in two consecutive tosses. What is the probability that ${computed(p.x)} appears first?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Let ${math`h`} and ${math`t`} be the chances that ${computed(p.x)} wins given that the last toss was a head or a tail and neither pattern has appeared. The next toss either completes a pattern or leaves you in state H or T.`,
        t`${eqTex(p, 'H')} and ${eqTex(p, 'T')}. Solving: ${math`h = ${xH}`}, ${math`t = ${xT}`}.`,
        t`The first toss starts the race in state H or T: ${math`P = ${p.h} h + ${qq} t = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => str(race([p.x, p.y], p.h)[0] as Rational),
  misconceptions: (p): Misconception[] => {
    const [half, chance, fromT] = patMis(p);
    return [
      { response: half as string, why: t`The patterns are not equally likely to come first: which one can follow the other matters. Condition on the last toss.` },
      { response: chance as string, why: t`That is the chance of ${computed(p.x)} in the first two tosses. If neither appears, the race goes on.` },
      { response: fromT as string, why: t`That is the chance given a tail first. Weight the two starting states by the chance of the first toss.` },
    ];
  },
  trial: (p, rng) => runRace([p.x, p.y], toFloat(p.h), rng) === 0,
});

// ---------------------------------------------------------------- Cambridge problems

const HALF = q(1, 2);
const [q13p, q13q, q13r] = [q(2, 3), q(1, 3), q(2, 3)];
const q13iii = auto({
  id: 'mixed-q13-iii',
  source: cite(MIX, 'Q13(iii)'),
  title: t`THH against TTH`,
  prompt: t`A fair coin is tossed until THH (player B) or TTH (player C) appears. What is the probability that C wins? Let ${math`p`}, ${math`q`}, and ${math`r`} be the probabilities that C wins given that the first two tosses are HT, TH, and HH.`,
  answer: { kind: 'exact', expected: str(race(['TTH', 'THH'], HALF)[0] as Rational) },
  solution: [
    t`If the first two tosses are TT, C wins: the first H after them completes TTH before THH can appear. So ${math`P(C \mid TT) = ${1}`}.`,
    t`From HT, the next toss is T (now TT, so C wins) or H (now the last two are TH): ${math`p = \frac{${1}}{${2}} + \frac{${1}}{${2}}q`}. From TH, an H completes THH and B wins; a T leaves HT: ${math`q = \frac{${1}}{${2}} \times ${0} + \frac{${1}}{${2}}p`}. From HH, an H leaves HH and a T leaves HT: ${math`r = \frac{${1}}{${2}}r + \frac{${1}}{${2}}p`}.`,
    t`Solving, ${math`p = ${q13p}`}, ${math`q = ${q13q}`}, ${math`r = ${q13r}`}. The first two tosses are each pair with probability ${math`\frac{${1}}{${4}}`}, so ${math`P(C) = \frac{${1}}{${4}}\left(${1} + ${q13p} + ${q13q} + ${q13r}\right) = ${q(2, 3)}`}.`,
  ],
  reference: '2/3',
  verify: () => {
    const [c] = race(['TTH', 'THH'], HALF);
    // The equations as written, solved: p = 1/2 + q/2, q = p/2, r = r/2 + p/2.
    const [pp, qq, rr] = solveLinear([[q(1), q(-1, 2), q(0)], [q(-1, 2), q(1), q(0)], [q(-1, 2), q(0), q(1, 2)]], [q(1, 2), q(0), q(0)]);
    return same('the race on the last two tosses', str(c as Rational), '2/3') ?? same('p, q, r', [pp, qq, rr].map((x) => str(x as Rational)).join(','), '2/3,1/3,2/3');
  },
  misconceptions: [{ response: '1/2', why: t`The two sequences are not equally likely to come first. Once the last two tosses are TT, C is certain to win; condition on the first two tosses.` }],
  official: { source: cite(MIXS, 'Q13(iii)'), answer: '2/3', agrees: true },
});

const q12i = auto({
  id: 'mixed-q12-i',
  source: cite(MIX, 'Q12(i)(c)'),
  title: t`Choosing among three with a coin`,
  prompt: t`To choose among options P, Q, and R with a fair coin, toss it twice: HH chooses P, HT chooses Q, TH chooses R, and TT means toss twice again. What is the probability that P is chosen eventually?`,
  answer: { kind: 'exact', expected: '1/3' },
  solution: [
    t`P is chosen on the first pair with probability ${math`\frac{${1}}{${4}}`}; on the second pair after TT with probability ${math`\frac{${1}}{${16}}`}; and so on: ${math`\frac{${1}}{${4}}\left(${1} + \frac{${1}}{${4}} + \frac{${1}}{${16}} + \cdots\right) = \frac{${q(1, 4)}}{${1} - ${q(1, 4)}} = ${q(1, 3)}`}.`,
    t`By first-step analysis instead: ${math`x = \frac{${1}}{${4}} + \frac{${1}}{${4}}x`}, so ${math`x = ${q(1, 3)}`}. By symmetry Q and R also have ${q(1, 3)}: a fair way to choose among three with a coin.`,
  ],
  reference: '1/3',
  verify: () => {
    let s = 0;
    for (let k = 0; k < 200; k++) s += 0.25 * 0.25 ** k;
    return far(s, 1 / 3) ? `the geometric sum is ${s}` : same('first step', str(solveLinear([[q(3, 4)]], [q(1, 4)])[0] as Rational), '1/3');
  },
  misconceptions: [{ response: '1/4', why: t`That is P on the first two tosses. After TT the coin is tossed again, so P can be chosen later.` }],
  official: { source: cite(MIXS, 'Q12(i)(c)'), answer: '1/3', agrees: true },
});

const q12ii = auto({
  id: 'mixed-q12-ii',
  source: cite(MIX, 'Q12(ii)'),
  title: t`Until HH, HT, or TH`,
  prompt: t`A fair coin is tossed until one of HH (choose P), HT (choose Q), or TH (choose R) appears. What is the probability that R is chosen?`,
  answer: { kind: 'exact', expected: str(race(['TH', 'HH', 'HT'], HALF)[0] as Rational) },
  solution: [
    t`Condition on the first toss. If it is a head, the next toss gives HH or HT, so P or Q is chosen. If it is a tail, the tosses go on until the first head, which makes TH: R is chosen for certain.`,
    t`So ${math`P(R) = \frac{${1}}{${2}}`}, and ${math`P(P) = P(Q) = \frac{${1}}{${4}}`}. Unlike part (i), this method is not fair.`,
  ],
  reference: '1/2',
  verify: () => same('the race on the last toss', race(['HH', 'HT', 'TH'], HALF).map(str).join(','), '1/4,1/4,1/2'),
  misconceptions: [{ response: '1/3', why: t`The three patterns are not equally likely to come first: after a tail, R is certain.` }],
  official: { source: cite(MIXS, 'Q12(ii)'), answer: '1/2', agrees: true },
});

const q13i = auto({
  id: 'mixed-q13-i',
  source: cite(MIX, 'Q13(i)'),
  title: t`HHT against THH`,
  prompt: t`A fair coin is tossed until HHT (player A) or THH (player B) appears. What is the probability that A wins?`,
  answer: { kind: 'exact', expected: str(race(['HHT', 'THH'], HALF)[0] as Rational) },
  solution: [
    t`If either of the first two tosses is a tail, THH must come before HHT: any HH after that tail is preceded by a T, so THH completes first.`,
    t`So A wins exactly when the first two tosses are HH, and then HHT certainly comes first. ${math`P(A) = \frac{${1}}{${4}}`}.`,
  ],
  reference: '1/4',
  verify: () => same('the race on the last two tosses', str(race(['HHT', 'THH'], HALF)[0] as Rational), '1/4'),
  misconceptions: [{ response: '1/2', why: t`The sequences are equally likely in any three given tosses, but not equally likely to come first.` }],
  official: { source: cite(MIXS, 'Q13(i)'), answer: '1/4', agrees: true },
});

const FOUR = ['HHT', 'THH', 'TTH', 'HTT'];
const q13ii = auto({
  id: 'mixed-q13-ii',
  source: cite(MIX, 'Q13(ii)'),
  title: t`All four players`,
  prompt: t`Four players choose HHT (A), THH (B), TTH (C), and HTT (D). A fair coin is tossed until one of these sequences appears. Give each player's probability of winning.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`player`, t`probability of winning`], rows: [[t`A`, null], [t`B`, null], [t`C`, null], [t`D`, null]], expected: race(FOUR, HALF).map(str) },
  solution: [
    t`A wins exactly when the first two tosses are HH, and C exactly when they are TT: ${math`\frac{${1}}{${4}}`} each.`,
    t`B and D are mirror images (swap H and T), so they share what is left equally: ${math`\frac{${1}}{${4}}`} each. The game never ends only on HTHT... or THTH..., which has probability ${0}.`,
  ],
  reference: ['1/4', '1/4', '1/4', '1/4'],
  verify: () => same('the race on the last two tosses', race(FOUR, HALF).map(str).join(','), '1/4,1/4,1/4,1/4'),
  misconceptions: [{ response: ['1/4', '1/2', '1/4', '0'], why: t`D is not shut out: HTT can come first, for example after HT then T.` }],
  official: { source: cite(MIXS, 'Q13(ii)'), answer: ['1/4', '1/4', '1/4', '1/4'], agrees: true },
});

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const s2q3i = auto({
  id: 's2-q3-i-w',
  source: cite('step-s2-stats', 'Q3(i)', true),
  title: t`Xavier and Younis: Younis's chance`,
  prompt: t`A match is a series of games of three points. Xavier wins the first point of each game with probability ${math`p`}. In the second and third points, the winner of the previous point wins with probability ${math`p`}. Whoever wins two consecutive points in a game wins the match; otherwise another game starts. Find the probability ${math`w`} that Younis wins the match, in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: '(1 - p^2)/(2 - p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`In one game, Younis wins with YY or XYY: ${math`(${1} - p)p + p(${1} - p)p = (${1} - p^{${2}})p`}. The game is drawn with XYX or YXY: ${math`p(${1} - p)^{${2}} + (${1} - p)^{${3}} = (${1} - p)^{${2}}`}.`,
    t`Condition on the first game: ${math`w = (${1} - p^{${2}})p + (${1} - p)^{${2}} w`}, so ${math`w = \frac{(${1} - p^{${2}})p}{${1} - (${1} - p)^{${2}}} = \frac{(${1} - p^{${2}})p}{${2}p - p^{${2}}} = \frac{${1} - p^{${2}}}{${2} - p}`}.`,
  ],
  reference: '(1 - p^2)/(2 - p)',
  verify: () => {
    for (const p of [q(1, 3), q(1, 2), q(2, 3), q(1, 10)]) {
      const g = threePointGame(p);
      const e = same(`p = ${str(p)}, the game tree`, str(div(g.y, sub(q(1), g.draw))), str(div(sub(q(1), mul(p, p)), sub(q(2), p))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(1 - p^2)p', why: t`That is Younis winning the first game. A drawn game is followed by another: condition on the first game.` }],
  official: { source: cite('step-s2-stats-solutions', 'Q3(i)'), answer: '(1 - p^2)/(2 - p)', agrees: true },
});

const AB_DOM = { a: { kind: 'real' as const, min: 0.05, max: 0.95 }, b: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const darts = auto({
  id: 'sheet2-q4-darts',
  source: cite(S2, 'Q4', true),
  title: t`Darts: the first player's chance`,
  prompt: t`Two darts players A and B throw alternately at a board, and the first to score a bull wins. Throws are independent; on each throw A scores a bull with probability ${math`a`} and B with probability ${math`b`}. If A throws first, find the probability that A wins, in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'a/(1 - (1 - a)(1 - b))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`Condition on the first round: A hits, or A misses and B hits, or both miss and the contest starts afresh: ${math`x = a + (${1} - a)(${1} - b)x`}.`,
    t`So ${math`x = \frac{a}{${1} - (${1} - a)(${1} - b)} = \frac{a}{a + b - ab}`}.`,
  ],
  reference: 'a/(a + b - a b)',
  verify: () => {
    for (const [a, b] of [[q(1, 2), q(1, 3)], [q(1, 5), q(3, 4)], [q(2, 3), q(2, 3)]] as const) {
      // Sum the rounds: both miss k times, then A hits.
      const miss = toFloat(mul(sub(q(1), a), sub(q(1), b)));
      let s = 0;
      for (let k = 0; k < 400; k++) s += toFloat(a) * miss ** k;
      if (far(s, toFloat(a) / (1 - miss))) return `a = ${str(a)}, b = ${str(b)}: the series gives ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: 'a/(a + b)', why: t`That ignores that A throws first. Condition on the first round: ${math`x = a + (${1} - a)(${1} - b)x`}.` }],
});

const s2q3proof = supervision({
  id: 's2-q3-i-compare',
  source: cite('step-s2-stats', 'Q3(i)'),
  title: t`Who is favoured, and is ${math`w`} monotonic?`,
  prompt: t`With ${math`w = \frac{${1} - p^{${2}}}{${2} - p}`} for ${math`p \ne ${0}`}, show that ${math`w > \frac{${1}}{${2}}`} if ${math`p < \frac{${1}}{${2}}`} and ${math`w < \frac{${1}}{${2}}`} if ${math`p > \frac{${1}}{${2}}`}. Does ${math`w`} increase whenever ${math`p`} decreases? Justify the answer.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q3(i)'),
});
const evenSuccesses = supervision({
  id: 'sheet2-q3',
  source: cite(S2, 'Q3'),
  title: t`An even number of successes`,
  prompt: t`Independent trials are performed, each with probability ${math`p`} of success. Let ${math`P_{n}`} be the probability that ${math`n`} trials result in an even number of successes. Show that ${math`P_{n} = \frac{${1}}{${2}}\left(${1} + (${1} - ${2}p)^{n}\right)`}: condition on the first trial to get a recurrence for ${math`P_{n}`}, and solve it. Then give a second proof with the binomial theorem.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'A six before a one or two on repeated rolls of a die', exact: q(1, 3), trial: (rng) => { for (;;) { const r = 1 + Math.floor(rng() * 6); if (r === 6) return true; if (r <= 2) return false; } } },
  { what: 'HT before TT with a fair coin', exact: q(3, 4), trial: (rng) => runRace(['HT', 'TT'], 0.5, rng) === 0 },
];

const [mx, ma, mb, mn] = [math`x`, math`a`, math`b`, math`n`];
/** The die race of the lesson: A wins on a six, B on a one or two, otherwise roll again. */
const [DA, DB] = [q(1, 6), q(1, 3)];
const DIE_A = div(DA, add(DA, DB));
/** HT against TT with a fair coin, from the start: P(HT first). */
const HT_TT = (race(['HT', 'TT'], HALF)[0] as Rational);

export const firstStep: TopicContent = {
  topicId: 'prob.first-step',
  goal: t`Find the chance that a repeated experiment ends one way by conditioning on its first step and solving the equations that result.`,
  objective: t`Find the chance a repeated experiment ends one way, by conditioning on its first step.`,
  why: t`It turns infinite sums into one equation; next it solves gambler's ruin and random walks.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`An equation instead of a sum` },
    { kind: 'hook', text: t`A die is rolled again and again: a six and A wins, a one or a two and B wins, anything else and they roll again. The game could last forever, so the obvious method is an infinite sum. There is a shortcut: the game after a re-roll is exactly the game you started with.` },
    { kind: 'narrative', text: t`Call ${mx} the chance that A wins. Look only at the first roll. It is a six with probability ${DA}: A has won. It is a one or two with probability ${DB}: A has lost. Otherwise, with probability ${sub(sub(q(1), DA), DB)}, the game starts afresh, and A's chance from there is ${mx} again. The law of total probability adds these up.` },
    {
      kind: 'definition',
      name: t`First-step analysis`,
      formal: t`[[first-step-analysis|First-step analysis]] finds ${math`x = P(E)`} by the law of total probability over the outcomes ${math`s`} of the first step: ${math`x = \sum_{s} P(\text{first step is } s)\,P(E \mid \text{first step is } s)`}, where each conditional probability is written in terms of the unknowns for the situation reached.`,
      plain: t`split on what happens first. If a first step leads back to the start, the chance afterwards is ${mx} again, so ${mx} appears on both sides, and you solve for it. Here: ${math`x = ${DA} + ${sub(sub(q(1), DA), DB)}\,x`}, so ${math`x = ${DIE_A}`}.`,
    },
    { kind: 'theorem', statement: t`Each round of an experiment, independently, is decided for A with probability ${ma}, for B with probability ${mb}, and otherwise repeats, where ${math`a + b > ${0}`}. Then A wins with probability ${math`\frac{a}{a + b}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Condition on the first round`, text: t`Let ${mx} be the chance A wins. Then ${math`x = a \cdot ${1} + b \cdot ${0} + (${1} - a - b)\,x`}.`, plain: t`A first round won by A, lost by A, or a repeat, after which everything is as at the start.`, why: { q: t`Why is the chance after a repeat exactly ${mx}?`, a: t`The rounds are independent and identical, so once a round repeats, the future is a fresh copy of the whole experiment. Nothing that happened before can affect it.` } },
        { label: t`Collect ${mx}`, text: t`${math`x - (${1} - a - b)x = a`}, that is, ${math`(a + b)\,x = a`}.`, plain: t`Take the ${mx} terms to one side: ${math`x(${1} - (${1} - a - b)) = x(a + b)`}.` },
        { label: t`Divide`, text: t`Since ${math`a + b > ${0}`}, ${math`x = \frac{a}{a + b}`}.`, plain: t`In the hook, ${math`\frac{${DA}}{${add(DA, DB)}} = ${DIE_A}`}.` },
      ],
    },
    {
      kind: 'p',
      text: t`The same answer comes from the infinite sum, ${math`a + (${1} - a - b)a + (${1} - a - b)^{${2}}a + \cdots`}, a geometric series. The equation is quicker and harder to get wrong.`,
      why: { q: t`Isn't there a gap? We assumed ${mx} exists before solving for it.`, a: t`${mx} is a probability, so it exists. The real assumption is that the game ends: with ${math`a + b > ${0}`} the chance of ${mn} repeats in a row is ${math`(${1} - a - b)^{n}`}, which tends to ${0}.` },
    },
    quickCheck({
      prompt: t`Two dice are rolled repeatedly. A wins on a total of ${7}, B on a total of ${12}; anything else, roll again. What is the probability that A wins?`,
      answer: { kind: 'exact', expected: str(div(q(6, 36), add(q(6, 36), q(1, 36)))) },
      reference: str(div(q(6, 36), add(q(6, 36), q(1, 36)))),
      why: t`${math`a = ${q(6, 36)}`} and ${math`b = ${q(1, 36)}`}, so ${math`\frac{a}{a + b} = ${div(q(6, 36), add(q(6, 36), q(1, 36)))}`}.`,
    }),
    { kind: 'section', title: t`When the experiment remembers` },
    { kind: 'narrative', text: t`Sometimes the first step does not lead back to the start but to a different situation. Then use one unknown per situation, or state, and one equation for each.` },
    {
      kind: 'p',
      text: t`Toss a fair coin until HT or TT appears. Only the last toss matters, so the states are "last toss H" and "last toss T", with unknowns ${math`x_{H}`} and ${math`x_{T}`} for the chance that HT wins. From H: a T makes HT, an H leaves you in H, so ${math`x_{H} = \frac{${1}}{${2}} + \frac{${1}}{${2}}x_{H}`}, giving ${math`x_{H} = ${1}`}. From T: an H moves to H, a T makes TT, so ${math`x_{T} = \frac{${1}}{${2}}x_{H} = \frac{${1}}{${2}}`}. The first toss picks the state: ${math`x = \frac{${1}}{${2}}x_{H} + \frac{${1}}{${2}}x_{T} = ${HT_TT}`}.`,
      why: { q: t`Why is ${math`x_{H} = ${1}`}?`, a: t`Once an H has appeared, TT can never come first: the next T completes HT. So from H, HT wins for sure.` },
    },
    {
      kind: 'pitfall',
      claim: t`HT and TT each have probability ${q(1, 4)} on any two tosses, so each wins the race with probability ${q(1, 2)}.`,
      counterexample: t`The patterns overlap with what came before: TT can only win if the first two tosses are both T, since any H lets HT win first. The first-step equations give ${HT_TT} for HT and ${sub(q(1), HT_TT)} for TT.`,
    },
    { kind: 'takeaway', text: t`Condition on the first step, write each situation's chance in terms of the unknowns, and solve; when a step returns to the start, the unknown appears on both sides.` },
  ],
  examples: [
    { ...workedCambridge(q13iii), examiner: t`One unknown per state, each equation justified by the next toss, and the system solved exactly; the answer then built from the first two tosses.` },
    worked(repeatUntil, { sa: [7], sb: [6, 8] }, t`Seven against six or eight`),
    worked(patternRace, { x: 'HH', y: 'TH', h: q(1, 2) }, t`HH against TH`),
  ],
  generators: [repeatUntil, alternateTurns, patternRace],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['first-step-analysis'],
  claims,
  cambridge: withUses([q12i, q12ii, q13i, q13ii, s2q3i, darts, s2q3proof, evenSuccesses], {
    'sheet2-q3': { sections: ['An equation instead of a sum'], note: t`A recurrence by conditioning on the first trial, and a second proof by the binomial theorem` },
    's2-q3-i-w': { sections: ['An equation instead of a sum', 'When the experiment remembers'], note: t`Conditioning on the first game of a match` },
    'mixed-q13-ii': { sections: ['When the experiment remembers'], note: t`Winning probabilities in a sequence game by first steps` },
    'sheet2-q4-darts': { sections: ['An equation instead of a sum'], note: t`Conditioning on the first round of alternate throws` },
    'mixed-q13-i': { sections: ['When the experiment remembers'], note: t`Which pattern appears first` },
  }),
  // Best first: Sheet 2 Q3's recurrence, STEP 2 Statistics Q3(i) (a game with internal states), the
  // four-player race, the darts, and the two-player race. Left out: Q12(i), a single geometric sum;
  // Q12(ii), whose answer 1/2 can be guessed; and the comparison of Q3(i), which is algebra on the answer.
  gate: ['sheet2-q3', 's2-q3-i-w', 'mixed-q13-ii', 'sheet2-q4-darts', 'mixed-q13-i'],
  recall: [
    { front: t`What is first-step analysis?`, back: t`The law of total probability over the first step, with unknowns for the chance from each situation reached; then solve.` },
    { front: t`Rounds decided for A with probability ${ma}, for B with ${mb}, else repeat: A's chance?`, back: t`${math`\frac{a}{a + b}`}.` },
    { front: t`What to do when the experiment has memory?`, back: t`One unknown per state, one equation for each.` },
  ],
  proofOrder: [
    {
      title: t`A wins with probability ${math`\frac{a}{a + b}`}`,
      steps: [
        t`Condition on the first round: ${math`x = a + (${1} - a - b)x`}.`,
        t`Collect terms: ${math`(a + b)x = a`}.`,
        t`Since ${math`a + b > ${0}`}, divide.`,
        t`So ${math`x = \frac{a}{a + b}`}.`,
      ],
    },
  ],
};
