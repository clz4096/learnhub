/**
 * sets.countable-unions: Unions and intersections of a sequence of sets, and the sets of
 * points that lie in A_n "infinitely often" or "for all sufficiently large n". From IA
 * Probability Example Sheet 1, Q6, which defines those two sets for a sequence of events;
 * the problems apply its definitions to concrete sequences (adapted, checked by brute
 * force), and the proof of the set identity that the sheet's Q4(a) relies on goes to
 * supervision. The sheet's own Q6(a) is set in prob.event-spaces, so it is not worked here.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, setOf, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mA, mB, mw] = [math`A`, math`B`, math`\omega`];
const OMEGA = [1, 2, 3, 4, 5, 6] as const;

// ---------------------------------------------------------------- generators

interface WindowP { N: number; d: number; op: 'union' | 'intersection' }

const windowSets = generator<WindowP>({
  id: 'finite-window',
  skill: 'Find the union and the intersection of a finite sequence of overlapping sets.',
  params: (rng) => {
    const N = int(rng, 2, 6);
    return { N, d: int(rng, N - 1, N + 4), op: pick(rng, ['union', 'intersection'] as const) };
  },
  sane: ({ N, d }) => (N >= 2 && d >= N - 1 ? null : 'out of range'),
  problem: ({ N, d, op }) => {
    const lo = op === 'union' ? 1 : N;
    const hi = op === 'union' ? N + d : 1 + d;
    return {
      prompt: t`For ${math`n = ${1}, ${2}, \ldots, ${N}`}, let ${math`A_n = \{n, n + ${1}, \ldots, n + ${d}\}`}. How many elements does ${op === 'union' ? math`\bigcup_{n = ${1}}^{${N}} A_n` : math`\bigcap_{n = ${1}}^{${N}} A_n`} have?`,
      answer: { kind: 'exact', expected: String(hi - lo + 1) },
      solution: op === 'union'
        ? [
          t`${math`x`} is in the union if it is in at least one ${math`A_n`}. The smallest element of any ${math`A_n`} is ${1} (in ${math`A_{${1}}`}) and the largest is ${N + d} (in ${math`A_{${N}}`}), and every number in between is in some ${math`A_n`}, since the sets overlap.`,
          t`So the union is ${math`\{${1}, \ldots, ${N + d}\}`}, with ${N + d} elements.`,
        ]
        : [
          t`${math`x`} is in the intersection if it is in every ${math`A_n`}: at least ${N} (to be in ${math`A_{${N}}`}) and at most ${1 + d} (to be in ${math`A_{${1}}`}).`,
          t`So the intersection is ${math`\{${N}, \ldots, ${1 + d}\}`}, with ${math`${1 + d} - ${N} + ${1} = ${d - N + 2}`} elements.`,
        ],
    };
  },
  solve: ({ N, d, op }) => {
    const sets = Array.from({ length: N }, (_, i) => new Set(Array.from({ length: d + 1 }, (_, k) => i + 1 + k)));
    const all = [...new Set(sets.flatMap((s) => [...s]))];
    return String(op === 'union' ? all.length : all.filter((x) => sets.every((s) => s.has(x))).length);
  },
  misconceptions: ({ N, d, op }): Misconception[] => op === 'union'
    ? [
      { response: String(N * (d + 1)), why: t`Adding the sizes counts the shared elements more than once. The sets overlap: list the union.` },
      { response: String(d + 1), why: t`That is the size of one set. The union holds everything in any of them.` },
    ]
    : [
      { response: String(d + 1), why: t`That is the size of one set. The intersection holds only what is in every one of them.` },
      { response: String(N * (d + 1)), why: t`Intersections never grow: the intersection is inside each ${math`A_n`}.` },
    ],
});

/** The four kinds of interval with endpoints a < b. */
type Kind = 'closed' | 'open' | 'left-open' | 'right-open';
type Shape = { op: 'cap' | 'cup'; lo: 'shrink' | 'grow' | 'fixed'; hi: 'shrink' | 'grow' | 'fixed'; loClosed: boolean; hiClosed: boolean };
/** Sequences of intervals whose endpoints move by 1/n. */
const SHAPES: readonly Shape[] = [
  { op: 'cap', lo: 'grow', hi: 'grow', loClosed: true, hiClosed: true },
  { op: 'cap', lo: 'grow', hi: 'grow', loClosed: false, hiClosed: false },
  { op: 'cup', lo: 'shrink', hi: 'shrink', loClosed: true, hiClosed: true },
  { op: 'cup', lo: 'fixed', hi: 'shrink', loClosed: true, hiClosed: true },
  { op: 'cup', lo: 'shrink', hi: 'fixed', loClosed: false, hiClosed: true },
  { op: 'cap', lo: 'fixed', hi: 'grow', loClosed: true, hiClosed: false },
  { op: 'cap', lo: 'grow', hi: 'fixed', loClosed: false, hiClosed: true },
  { op: 'cup', lo: 'fixed', hi: 'shrink', loClosed: false, hiClosed: true },
];
interface IntP { i: number; a: number; b: number }

/** The n-th interval: its endpoints as rationals and whether each is included. */
function nth(s: Shape, a: number, b: number, n: number): { lo: Rational; hi: Rational; loC: boolean; hiC: boolean } {
  // "grow" widens the interval by 1/n on that side (an intersection shrinks to the limit); "shrink" narrows it.
  const lo = s.lo === 'fixed' ? q(a) : s.lo === 'grow' ? q(a * n - 1, n) : q(a * n + 1, n);
  const hi = s.hi === 'fixed' ? q(b) : s.hi === 'grow' ? q(b * n + 1, n) : q(b * n - 1, n);
  return { lo, hi, loC: s.loClosed, hiC: s.hiClosed };
}
const less = (x: Rational, y: Rational): boolean => x.num * y.den < y.num * x.den;
const inside = (x: Rational, iv: ReturnType<typeof nth>): boolean => (iv.loC ? !less(x, iv.lo) : less(iv.lo, x)) && (iv.hiC ? !less(iv.hi, x) : less(x, iv.hi));

const kindOf = (loIn: boolean, hiIn: boolean): Kind => (loIn && hiIn ? 'closed' : !loIn && !hiIn ? 'open' : loIn ? 'right-open' : 'left-open');
const intervalTex = (k: Kind, a: number, b: number): Span => math`${k === 'closed' || k === 'right-open' ? '[' : '('}${a}, ${b}${k === 'closed' || k === 'left-open' ? ']' : ')'}`;
const shapeTex = (s: Shape, a: number, b: number): Span => {
  const side = (end: number, how: Shape['lo'], sign: 1 | -1): string => (how === 'fixed' ? `${end}` : `${end} ${(how === 'grow') === (sign === 1) ? '+' : '-'} \\frac{${1}}{n}`);
  return math`${s.loClosed ? '[' : '('}${computedTex(side(a, s.lo, -1))}, ${computedTex(side(b, s.hi, 1))}${s.hiClosed ? ']' : ')'}`;
};

const intervals = generator<IntP>({
  id: 'interval',
  skill: 'Find the union or intersection of a sequence of intervals whose ends move by 1/n: which endpoints survive.',
  params: (rng) => {
    const a = int(rng, -3, 3);
    return { i: int(rng, 0, SHAPES.length - 1), a, b: a + int(rng, 1, 4) };
  },
  sane: ({ i, a, b }) => (i >= 0 && i < SHAPES.length && b - a >= 1 ? null : 'out of range'),
  problem: ({ i, a, b }) => {
    const s = SHAPES[i] as Shape;
    const k = limitKind(s);
    const options: ChoiceOption[] = (['closed', 'open', 'right-open', 'left-open'] as const).map((x) => ({ id: x, label: [intervalTex(x, a, b)] }));
    const loIn = k === 'closed' || k === 'right-open';
    const hiIn = k === 'closed' || k === 'left-open';
    return {
      prompt: t`For ${math`n = ${1}, ${2}, ${3}, \ldots`}, let ${math`I_n = ${shapeTex(s, a, b)}`}. What is ${s.op === 'cap' ? math`\bigcap_{n = ${1}}^{\infty} I_n` : math`\bigcup_{n = ${1}}^{\infty} I_n`}?`,
      answer: { kind: 'choice', options, correct: k },
      solution: [
        s.op === 'cap'
          ? t`A point is in the intersection if it is in every ${math`I_n`}. Every point of ${math`[${a}, ${b}]`} is${s.lo === 'fixed' && !s.loClosed ? t`, except ${a} itself,` : s.hi === 'fixed' && !s.hiClosed ? t`, except ${b} itself,` : t``} in every ${math`I_n`}; a point outside it, say ${math`${b} + \varepsilon`}, falls outside ${math`I_n`} once ${math`\frac{${1}}{n} < \varepsilon`}.`
          : t`A point is in the union if it is in some ${math`I_n`}. Every point strictly between ${a} and ${b} is in ${math`I_n`} for large enough ${mn}, since the moving ends approach ${a} and ${b}.`,
        t`The endpoints: ${a} is ${loIn ? 'in' : 'not in'} it, and ${b} is ${hiIn ? 'in' : 'not in'} it. ${s.op === 'cup' ? t`An end that moves never reaches its limit, so it is not in any ${math`I_n`}; a fixed closed end is.` : t`An end that moves outward always includes its limit; a fixed open end never does.`}`,
        t`So the answer is ${intervalTex(k, a, b)}.`,
      ],
    };
  },
  solve: ({ i, a, b }) => {
    // Test the two endpoints against the first 2,000 intervals exactly.
    const s = SHAPES[i] as Shape;
    const ns = Array.from({ length: 2000 }, (_, k) => k + 1);
    const inLimit = (x: Rational): boolean => (s.op === 'cap' ? ns.every((n) => inside(x, nth(s, a, b, n))) : ns.some((n) => inside(x, nth(s, a, b, n))));
    return [kindOf(inLimit(q(a)), inLimit(q(b)))];
  },
  misconceptions: ({ i, a, b }): Misconception[] => {
    const s = SHAPES[i] as Shape;
    const k = limitKind(s);
    const looks = kindOf(s.loClosed, s.hiClosed);
    const out: Misconception[] = [];
    if (looks !== k) out.push({ response: [looks], why: t`The limit need not keep the brackets of the ${math`I_n`}. Check each endpoint: is it in ${s.op === 'cap' ? 'every' : 'some'} ${math`I_n`}?` });
    const flipped: Kind = k === 'closed' ? 'open' : k === 'open' ? 'closed' : k === 'left-open' ? 'right-open' : 'left-open';
    out.push({ response: [flipped], why: t`Both endpoints are the other way round. ${s.op === 'cap' ? t`For an intersection, an endpoint is in it only if it is in every ${math`I_n`}.` : t`For a union, an endpoint is in it if it is in at least one ${math`I_n`}.`}` });
    // Two slips that name the same interval are one distractor: add a third.
    if (new Set(out.map((m) => m.response[0])).size < 2) {
      const other = (['closed', 'open', 'right-open', 'left-open'] as const).find((x) => x !== k && x !== flipped) as Kind;
      out.push({ response: [other], why: t`Check each endpoint on its own: is it in ${s.op === 'cap' ? 'every' : 'some'} ${math`I_n`}?` });
    }
    return out;
  },
});

function limitKind(s: Shape): Kind {
  // Each end: intersections keep a moving end's limit (the ends move outward) and a fixed end's own bracket;
  // unions lose a moving end's limit (never reached) and keep a fixed end's own bracket.
  const end = (how: Shape['lo'], closed: boolean): boolean => (how === 'fixed' ? closed : s.op === 'cap');
  return kindOf(end(s.lo, s.loClosed), end(s.hi, s.hiClosed));
}

type Family = 'divides' | 'parity' | 'upto' | 'mod3' | 'fixed-plus' | 'shrinking' | 'square' | 'mod4';
interface IoP { f: Family; ask: 'io' | 'eventually' }

const inSet = (f: Family, w: number, n: number): boolean => {
  switch (f) {
    case 'divides': return n % w === 0;
    case 'parity': return w % 2 === n % 2;
    case 'upto': return w <= n;
    case 'mod3': return w % 3 === n % 3;
    case 'fixed-plus': return w === 1 || w === 2 || w === (n % 2 === 0 ? 3 : 4);
    case 'shrinking': return w >= n;
    case 'square': return w * w <= n;
    case 'mod4': return w <= n % 4;
  }
};
const familyText = (f: Family): Rich => {
  switch (f) {
    case 'divides': return t`${math`A_n = \{\omega \in \Omega : \omega \text{ divides } n\}`}`;
    case 'parity': return t`${math`A_n`} the even numbers of ${math`\Omega`} when ${math`n`} is even, and the odd numbers when ${math`n`} is odd`;
    case 'upto': return t`${math`A_n = \{\omega \in \Omega : \omega \le n\}`}`;
    case 'mod3': return t`${math`A_n = \{\omega \in \Omega : \omega - n \text{ is a multiple of } ${3}\}`}`;
    case 'fixed-plus': return t`${math`A_n = \{${1}, ${2}, ${3}\}`} when ${math`n`} is even and ${math`A_n = \{${1}, ${2}, ${4}\}`} when ${math`n`} is odd`;
    case 'shrinking': return t`${math`A_n = \{\omega \in \Omega : \omega \ge n\}`}`;
    case 'square': return t`${math`A_n = \{\omega \in \Omega : \omega^{${2}} \le n\}`}`;
    case 'mod4': return t`${math`A_n = \{\omega \in \Omega : \omega \le r_n\}`}, where ${math`r_n`} is the remainder of ${math`n`} on division by ${4}`;
  }
};
/** The points in A_n infinitely often, and for all large n, by the definitions: checked from n = 600 to 1,200 (every family is periodic or settles by n = 36). */
function limits(f: Family): { io: number[]; ev: number[] } {
  const ns = Array.from({ length: 601 }, (_, k) => 600 + k);
  return {
    io: OMEGA.filter((w) => ns.some((n) => inSet(f, w, n))),
    ev: OMEGA.filter((w) => ns.every((n) => inSet(f, w, n))),
  };
}
const OPTIONS: readonly ChoiceOption[] = [...OMEGA.map((w) => ({ id: `w${w}`, label: t`${w}` })), { id: 'none', label: t`none of them` }];
const ids = (ws: readonly number[]): string[] => (ws.length === 0 ? ['none'] : ws.map((w) => `w${w}`));
const setText = (ws: readonly number[]): Span => setOf([...ws]);

const ioEventually = generator<IoP>({
  id: 'io-eventually',
  skill: 'Find which points lie in A_n infinitely often, or for all sufficiently large n, as IA Probability Example Sheet 1, Q6 defines them.',
  params: (rng) => ({ f: pick(rng, ['divides', 'parity', 'upto', 'mod3', 'fixed-plus', 'shrinking', 'square', 'mod4'] as const), ask: pick(rng, ['io', 'eventually'] as const) }),
  sane: () => null,
  problem: ({ f, ask }) => {
    const { io, ev } = limits(f);
    const ans = ask === 'io' ? io : ev;
    return {
      prompt: t`Let ${math`\Omega = ${setOf([...OMEGA])}`} and, for ${math`n = ${1}, ${2}, ${3}, \ldots`}, let ${familyText(f)}. Which ${mw} lie in ${math`A_n`} ${ask === 'io' ? t`[[infinitely-often|infinitely often]]` : t`for all sufficiently large ${math`n`}`}? Choose all that apply.`,
      answer: { kind: 'choice', options: OPTIONS, correct: ids(ans) },
      solution: [
        ask === 'io'
          ? t`${mw} is in ${math`A_n`} infinitely often if, however far along the sequence you go, ${mw} is in some later ${math`A_n`}: for every ${math`N`} there is ${math`n \ge N`} with ${math`\omega \in A_n`}.`
          : t`${mw} is in ${math`A_n`} for all sufficiently large ${math`n`} if from some point on it is in every ${math`A_n`}: there is ${math`N`} with ${math`\omega \in A_n`} for every ${math`n \ge N`}.`,
        t`Here the points in ${math`A_n`} infinitely often are ${io.length === 0 ? t`none` : setText(io)}, and those in ${math`A_n`} for all large ${math`n`} are ${ev.length === 0 ? t`none` : setText(ev)}.`,
        t`Every point that is eventually always in ${math`A_n`} is in it infinitely often, never the other way round.`,
      ],
    };
  },
  solve: ({ f, ask }) => {
    // Points of the first 36 sets, then of sets far along: the families repeat with period at most 12 or settle by n = 36.
    const late = Array.from({ length: 120 }, (_, k) => 10_000 + k);
    const ws = OMEGA.filter((w) => (ask === 'io' ? late.some((n) => inSet(f, w, n)) : late.every((n) => inSet(f, w, n))));
    return ids(ws);
  },
  misconceptions: ({ f, ask }): Misconception[] => {
    const { io, ev } = limits(f);
    const right = ids(ask === 'io' ? io : ev).join();
    const first = OMEGA.filter((w) => inSet(f, w, 1));
    const candidates: [string[], Rich][] = [
      [ids(ask === 'io' ? ev : io), ask === 'io' ? t`Those are the points in every ${math`A_n`} from some point on. Infinitely often only needs ${mw} to keep coming back.` : t`Those are the points that keep coming back. For all large ${math`n`}, ${mw} must be in every ${math`A_n`} from some point on.`],
      [ids([...OMEGA]), t`Not every point qualifies: check each ${mw} against the sets far along the sequence.`],
      [ids([]), t`Some points do qualify: try ${mw} against ${math`A_n`} for large ${math`n`}.`],
      [ids(first), t`Those are the points of ${math`A_{${1}}`}. The question is about the sets far along the sequence, not the first one.`],
      [ids(OMEGA.filter((w) => inSet(f, w, 6))), t`Those are the points of ${math`A_{${6}}`}, one set. The question is about the long run of the sequence.`],
    ];
    const out: Misconception[] = [];
    for (const [r, why] of candidates) if (r.join() !== right && !out.some((m) => (m.response as string[]).join() === r.join())) out.push({ response: r, why });
    return out.slice(0, 3);
  },
});

const mn = math`n`;

// ---------------------------------------------------------------- Cambridge problems

const S1 = 'ia-prob-sheet-1';
const Q6_DEFS = t`For a sequence of events ${math`(A_n : n \in \mathbb{N})`}, the sheet sets ${dmath`A = \{\omega \in \Omega : \omega \in A_n \text{ infinitely often}\}, \qquad B = \{\omega \in \Omega : \omega \in A_n \text{ for all sufficiently large } n\}.`}`;

function q6Example(o: { id: string; f: Family; ask: 'io' | 'eventually'; title: Rich; steps: Rich[]; check: number[] }) {
  const { io, ev } = limits(o.f);
  const ans = o.ask === 'io' ? io : ev;
  return auto({
    id: o.id,
    source: cite(S1, 'Q6, the sets A and B', true),
    title: o.title,
    prompt: t`${Q6_DEFS} Take ${math`\Omega = ${setOf([...OMEGA])}`} and ${familyText(o.f)}. What is ${o.ask === 'io' ? mA : mB}? Choose all its elements.`,
    answer: { kind: 'choice', options: OPTIONS, correct: ids(ans) },
    solution: o.steps,
    reference: ids(ans),
    verify: () => same(`${o.id}, by the definition`, ans.join(','), o.check.join(',')),
    misconceptions: [{ response: ids(o.ask === 'io' ? ev : io), why: o.ask === 'io' ? t`That is ${mB}. ${mA} needs only that ${mw} comes back again and again.` : t`That is ${mA}. ${mB} needs ${mw} in every ${math`A_n`} from some point on.` }],
  });
}

const q6divA = q6Example({
  id: 'q6-divides-a', f: 'divides', ask: 'io', title: t`Divisors, infinitely often`, check: [1, 2, 3, 4, 5, 6],
  steps: [
    t`${mw} is in ${math`A_n`} exactly when ${mw} divides ${math`n`}. Every ${mw} divides ${math`n = \omega, ${2}\omega, ${3}\omega, \ldots`}: infinitely many ${math`n`}.`,
    t`So every point is in ${math`A_n`} infinitely often: ${math`A = \Omega`}.`,
  ],
});
const q6divB = q6Example({
  id: 'q6-divides-b', f: 'divides', ask: 'eventually', title: t`Divisors, for all large ${math`n`}`, check: [1],
  steps: [
    t`${math`${1}`} divides every ${math`n`}, so ${1} is in every ${math`A_n`}.`,
    t`For ${math`\omega \ge ${2}`}, the numbers ${math`n`} that ${mw} does not divide go on for ever (for example ${math`n = k\omega + ${1}`}), so ${mw} is not in all ${math`A_n`} from any point on. So ${math`B = \{${1}\}`}.`,
  ],
});
const q6parity = q6Example({
  id: 'q6-parity-b', f: 'parity', ask: 'eventually', title: t`Alternating sets`, check: [],
  steps: [
    t`Every ${mw} is in ${math`A_n`} for every other ${math`n`}: the even points for even ${math`n`}, the odd ones for odd ${math`n`}.`,
    t`So each point is in ${math`A_n`} infinitely often, ${math`A = \Omega`}, but no point is in every ${math`A_n`} from some point on: ${math`B = \varnothing`}. The two sets can be as far apart as possible.`,
  ],
});
const q6fixed = q6Example({
  id: 'q6-fixed-a', f: 'fixed-plus', ask: 'io', title: t`Two fixed points and two that alternate`, check: [1, 2, 3, 4],
  steps: [
    t`${1} and ${2} are in every ${math`A_n`}; ${3} is in ${math`A_n`} for every even ${math`n`}, and ${4} for every odd ${math`n`}; ${5} and ${6} never are.`,
    t`So ${math`A = \{${1}, ${2}, ${3}, ${4}\}`}, while ${math`B = \{${1}, ${2}\}`}.`,
  ],
});

const deMorgan = supervision({
  id: 'q4-de-morgan',
  source: cite(S1, 'Q4(a), the countable intersection', true),
  title: t`De Morgan's law for a sequence`,
  prompt: t`Let ${math`A_{${1}}, A_{${2}}, \ldots`} be subsets of ${math`\Omega`}. Prove that ${math`\left(\bigcup_{n = ${1}}^{\infty} A_n\right)^{c} = \bigcap_{n = ${1}}^{\infty} A_n^{c}`}: show each side is a subset of the other, by taking a point ${mw} and saying what membership of each side means. Then deduce ${math`\bigcap_{n} A_n = \left(\bigcup_n A_n^{c}\right)^{c}`}, the step the sheet's fourth question needs.`,
  writeUp: 'proof',
});
const ioWords = supervision({
  id: 'q6-words',
  source: cite(S1, 'Q6', true),
  title: t`Infinitely often, in quantifiers`,
  prompt: t`${Q6_DEFS} Write "${mw} is in ${math`A_n`} infinitely often" and "${mw} is in ${math`A_n`} for all sufficiently large ${math`n`}" with the quantifiers "for every" and "there exists", and explain why every point of ${mB} is a point of ${mA}. Give a sequence of sets for which ${mA} is not a subset of ${mB}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const countableUnions: TopicContent = {
  topicId: 'sets.countable-unions',
  goal: t`Work with unions and intersections of a sequence of sets, and with the points that lie in ${math`A_n`} infinitely often or for all large ${math`n`}.`,
  objective: t`Work with unions and intersections of a whole sequence of sets, and with "infinitely often" and "eventually".`,
  why: t`Probability's axioms are about sequences of events; continuity and limit theorems are built on these sets.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Infinitely many sets at once` },
    { kind: 'hook', text: t`Toss a coin for ever, and let ${math`A_n`} be "toss ${mn} is heads". "At least one head" is ${math`A_{${1}}`} or ${math`A_{${2}}`} or ${math`A_{${3}}`} or so on, without end. "Heads infinitely often" is subtler still: no single toss decides it. How do we even write such events down?` },
    { kind: 'narrative', text: t`With unions and intersections of a whole sequence of sets, and with two sets built from them that IA Probability uses constantly: the points that keep coming back, and the points that eventually stay. Each is defined by "for some" and "for every", and the order of those words is everything.` },
    { kind: 'section', title: t`Countable sets` },
    {
      kind: 'definition',
      name: t`Countable set`,
      formal: t`A set is [[countable|countable]] if it is finite or its elements can be listed as a sequence ${math`x_{${1}}, x_{${2}}, x_{${3}}, \ldots`} in which every element appears.`,
      plain: t`${math`\mathbb{N}`} is countable, and so is ${math`\mathbb{Z}`}: list it as ${math`${0}, ${1}, -${1}, ${2}, -${2}, \ldots`}. Even ${math`\mathbb{Q}`} is countable, though that takes a cleverer listing; ${math`\mathbb{R}`} is not.`,
    },
    {
      kind: 'definition',
      name: t`Countable union and intersection`,
      formal: t`For sets ${math`A_{${1}}, A_{${2}}, \ldots`}, ${dmath`\bigcup_{n = ${1}}^{\infty} A_n = \{\omega : \omega \in A_n \text{ for some } n\}, \qquad \bigcap_{n = ${1}}^{\infty} A_n = \{\omega : \omega \in A_n \text{ for every } n\}.`}`,
      plain: t`The union holds everything that is in at least one of the sets; the intersection holds what is in all of them. For the coin: "at least one head" is ${math`\bigcup A_n`}, "all heads" is ${math`\bigcap A_n`}.`,
    },
    { kind: 'p', text: t`Intervals show what can happen at the ends. ${math`\bigcup_{n} \left[${0}, ${1} - \frac{${1}}{n}\right] = [${0}, ${1})`}: every point below ${1} gets in once ${math`\frac{${1}}{n}`} is small enough, but ${1} itself is in none of them. A union of closed intervals need not be closed.`, why: { q: t`Why is a point such as ${q(99, 100)} in the union?`, a: t`It lies in ${math`\left[${0}, ${1} - \frac{${1}}{n}\right]`} as soon as ${math`\frac{${1}}{n} \le \frac{${1}}{${100}}`}, for example at ${math`n = ${100}`}. Being in one of the sets is enough.` } },
    checkFrom(intervals, { i: 1, a: 0, b: 2 }, t`Each endpoint, ${0} and ${2}, lies inside every ${math`I_n`}, and any point outside ${math`[${0}, ${2}]`} drops out once ${math`\frac{${1}}{n}`} is smaller than its distance from the interval. Open intervals can intersect to a closed one.`),
    { kind: 'theorem', name: t`De Morgan's laws for sequences`, statement: t`For subsets ${math`A_{${1}}, A_{${2}}, \ldots`} of ${math`\Omega`}, ${math`\left(\bigcup_{n} A_n\right)^{c} = \bigcap_{n} A_n^{c}`} and ${math`\left(\bigcap_{n} A_n\right)^{c} = \bigcup_{n} A_n^{c}`}.` },
    { kind: 'p', text: t`In words: not being in any of the sets is the same as being outside each of them. The proof shows each side is a subset of the other by following a single point ${mw}; writing it out is one of the gate problems for this topic. For the coin: "no head at all" is "tails on every toss".` },
    { kind: 'section', title: t`Infinitely often and eventually` },
    {
      kind: 'definition',
      name: t`Infinitely often, eventually`,
      formal: t`A point ${mw} is in ${math`A_n`} [[infinitely-often|infinitely often]] if for every ${math`N`} there is an ${math`n \ge N`} with ${math`\omega \in A_n`}. It is in ${math`A_n`} for all sufficiently large ${mn} (eventually) if there is an ${math`N`} with ${math`\omega \in A_n`} for every ${math`n \ge N`}.`,
      plain: t`Infinitely often: however far along you look, ${mw} turns up again. Eventually: from some point on, ${mw} never leaves. Example Sheet ${1} Q${6} calls these two sets ${mA} and ${mB}.`,
    },
    { kind: 'theorem', statement: t`Every point that is in ${math`A_n`} eventually is in ${math`A_n`} infinitely often.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Use eventually`, text: t`There is an ${math`N_{${0}}`} with ${math`\omega \in A_n`} for every ${math`n \ge N_{${0}}`}.` },
        { label: t`Meet any challenge`, text: t`Given any ${math`N`}, take ${math`n = \max(N, N_{${0}})`}. Then ${math`n \ge N`} and ${math`n \ge N_{${0}}`}, so ${math`\omega \in A_n`}.`, plain: t`Whatever starting point you name, go past both it and ${math`N_{${0}}`}.` },
      ],
    },
    { kind: 'p', text: t`The converse fails. On ${math`\Omega = \{${1}, \ldots, ${6}\}`}, let ${math`A_n = \{\omega : \omega \le r_n\}`}, where ${math`r_n`} is the remainder of ${mn} on division by ${4}. The points ${1}, ${2}, ${3} turn up whenever ${math`r_n = ${3}`}, so infinitely often; but every fourth set is empty, so no point is in ${math`A_n`} eventually.` },
    checkFrom(ioEventually, { f: 'mod4', ask: 'io' }, t`${math`r_n`} takes the value ${3} again and again, and then ${1}, ${2}, ${3} are all in ${math`A_n`}; ${4}, ${5}, ${6} never are.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A union of closed intervals is closed.`, counterexample: t`${math`\bigcup_{n} \left[${0}, ${1} - \frac{${1}}{n}\right] = [${0}, ${1})`}: the endpoint ${1} is in none of the intervals.` },
    { kind: 'pitfall', claim: t`"Infinitely often" and "eventually" mean the same.`, counterexample: t`In the example above, ${1} is in ${math`A_n`} infinitely often but not eventually: it leaves every time ${math`r_n = ${0}`}. Swapping "for every" and "there exists" changes the set.` },
    { kind: 'takeaway', text: t`A union asks "in some set", an intersection "in every set"; infinitely often is "for every ${math`N`} there is a later ${mn}", eventually is "there is an ${math`N`} after which always".` },
  ],
  examples: [
    { ...workedCambridge(q6divA), examiner: t`The examiner looks for membership of ${math`A_n`} unwound into a statement about ${mn}, and infinitely many ${mn} exhibited for each point.` },
    worked(intervals, { i: 3, a: 0, b: 1 }, t`A union of closed intervals`),
    worked(windowSets, { N: 4, d: 5, op: 'intersection' }, t`An intersection of overlapping sets`),
  ],
  generators: [windowSets, intervals, ioEventually],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['countable', 'infinitely-often'],
  cambridge: withUses([q6divB, q6parity, q6fixed, deMorgan, ioWords], {
    'q4-de-morgan': { sections: ['Infinitely many sets at once'], note: t`De Morgan's law for a sequence of sets` },
    'q6-words': { sections: ['Infinitely often and eventually'], note: t`"Infinitely often" and "eventually" in quantifiers` },
  }),
  gate: ['q4-de-morgan', 'q6-words'],
  recall: [
    { front: t`${math`\bigcup_{n} A_n`} and ${math`\bigcap_{n} A_n`}.`, back: t`The points in ${math`A_n`} for some ${mn}; the points in ${math`A_n`} for every ${mn}.` },
    { front: t`De Morgan for a sequence.`, back: t`${math`\left(\bigcup A_n\right)^{c} = \bigcap A_n^{c}`} and ${math`\left(\bigcap A_n\right)^{c} = \bigcup A_n^{c}`}.` },
    { front: t`${mw} is in ${math`A_n`} infinitely often; eventually.`, back: t`For every ${math`N`} there is ${math`n \ge N`} with ${math`\omega \in A_n`}; there is ${math`N`} with ${math`\omega \in A_n`} for all ${math`n \ge N`}.` },
  ],
  proofOrder: [
    {
      title: t`Eventually implies infinitely often`,
      steps: [
        t`Suppose ${math`\omega \in A_n`} for every ${math`n \ge N_{${0}}`}.`,
        t`Let ${math`N`} be any natural number.`,
        t`Take ${math`n = \max(N, N_{${0}})`}, so ${math`n \ge N`} and ${math`\omega \in A_n`}.`,
        t`Since ${math`N`} was arbitrary, ${mw} is in ${math`A_n`} infinitely often.`,
      ],
    },
  ],
};
