/**
 * logic.quantifiers: For all and there exists. The lesson follows the CST notes on
 * universal and existential quantification (printed pages 63 to 76 and 85 to 103: proving
 * and using each, universal instantiation, witnesses, Propositions 21 and 22), the TMUA
 * notes on quantifiers (pages 56 to 58), and Book of Proof Section 2.7. The problems are
 * TMUA Exercise M, Book of Proof's exercise 1 for Section 2.7, the notes' Propositions 18,
 * 21, and 22, and supervision exercises 1.2.10 and 1.3.2 (2023-24 official solutions).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, quickCheck, worked, workedProof, type TopicContent } from '../topic';

const [mx, mn, mk] = [math`x`, math`n`, math`k`];
const TF = (b: boolean): string => (b ? 'T' : 'F');

// ---------------------------------------------------------------- domains and predicates

interface Domain { name: Rich; tex: string; sample: number[] }
const DOMAINS: readonly Domain[] = [
  { name: t`natural number`, tex: '\\mathbb{N}', sample: upTo(41).map((x) => x - 1) },
  { name: t`integer`, tex: '\\mathbb{Z}', sample: upTo(41).map((x) => x - 21) },
  { name: t`positive integer`, tex: '\\mathbb{Z}^{+}', sample: upTo(40) },
];
interface Pred { text: Rich; holds: (x: number) => boolean }
const PREDS: readonly Pred[] = [
  { text: t`${math`x^{${2}} \ge x`}`, holds: (x) => x * x >= x },
  { text: t`${math`x^{${2}} > x`}`, holds: (x) => x * x > x },
  { text: t`${math`${2}x > x`}`, holds: (x) => 2 * x > x },
  { text: t`${math`x + ${1} > x`}`, holds: (x) => x + 1 > x },
  { text: t`${math`x^{${3}} \ge x`}`, holds: (x) => x ** 3 >= x },
  { text: t`${math`x^{${2}} = ${2}x`}`, holds: (x) => x * x === 2 * x },
  { text: t`${math`x^{${2}} + ${1}`} is even`, holds: (x) => (x * x + 1) % 2 === 0 },
  { text: t`${math`x^{${2}} = x + ${2}`}`, holds: (x) => x * x === x + 2 },
  { text: t`${math`x^{${2}} = ${3}`}`, holds: (x) => x * x === 3 },
  { text: t`${math`x(x + ${1})`} is even`, holds: (x) => (x * (x + 1)) % 2 === 0 },
];

// ---------------------------------------------------------------- generators

interface FeP { d: number; p: number }

const forallExists = generator<FeP>({
  id: 'forall-exists',
  skill: 'Decide whether a "for all" statement and the matching "there exists" statement are true, over a stated set.',
  params: (rng) => ({ d: int(rng, 0, DOMAINS.length - 1), p: int(rng, 0, PREDS.length - 1) }),
  sane: ({ d, p }) => (d >= 0 && d < DOMAINS.length && p >= 0 && p < PREDS.length ? null : 'out of range'),
  problem: ({ d, p }) => {
    const D = DOMAINS[d] as Domain;
    const P = PREDS[p] as Pred;
    const all = D.sample.every(P.holds);
    const some = D.sample.some(P.holds);
    const counter = D.sample.find((x) => !P.holds(x));
    const example = D.sample.find(P.holds);
    return {
      prompt: t`Is "${P.text}" true for every ${D.name} ${mx}, and for some ${D.name} ${mx}? Write T or F for each statement.`,
      answer: {
        kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`],
        rows: [[t`${math`\forall x \in ${D.tex}.`} ${P.text}`, null], [t`${math`\exists x \in ${D.tex}.`} ${P.text}`, null]],
        expected: [TF(all), TF(some)],
      },
      solution: [
        all ? t`"For every ${D.name} ${mx}, ${P.text}" holds: no ${D.name} breaks it. (Checking examples does not prove it; here a short argument does.)` : t`"For every ${D.name} ${mx}, ${P.text}" is false: ${math`x = ${counter as number}`} is a [[counterexample|counterexample]].`,
        some ? t`"There exists a ${D.name} ${mx} with ${P.text}" is true: ${math`x = ${example as number}`} is a [[witness|witness]].` : t`"There exists" is false: no ${D.name} has ${P.text}.`,
      ],
    };
  },
  solve: ({ d, p }) => {
    // A wider search than the problem's own sample.
    const D = DOMAINS[d] as Domain;
    const P = PREDS[p] as Pred;
    const lo = Math.min(...D.sample);
    const wide = upTo(400).map((x) => x - 1 + lo).filter((x) => x >= lo);
    return [TF(wide.every(P.holds)), TF(wide.some(P.holds))];
  },
  misconceptions: ({ d, p }): Misconception[] => {
    const D = DOMAINS[d] as Domain;
    const P = PREDS[p] as Pred;
    const all = D.sample.every(P.holds);
    const some = D.sample.some(P.holds);
    const right = [TF(all), TF(some)].join();
    const cands: Misconception[] = [
      { response: [TF(some), TF(some)], why: t`One example does not make a "for all" statement true: it must hold for every ${D.name}, so look for one that breaks it.` },
      { response: [TF(all), TF(all)], why: t`"There exists" needs only one ${D.name} that works, not all of them.` },
      { response: [TF(!all), TF(some)], why: all ? t`The "for all" statement holds: try to break it, and you cannot.` : t`One ${D.name} that breaks it makes "for all" false.` },
      { response: [TF(all), TF(!some)], why: some ? t`One ${D.name} that works makes "there exists" true.` : t`No ${D.name} works, so "there exists" is false.` },
    ];
    const out: Misconception[] = [];
    for (const m of cands) {
      const k = (m.response as string[]).join();
      if (k !== right && !out.some((o) => (o.response as string[]).join() === k)) out.push(m);
    }
    return out;
  },
});

type WitKind = 'squares' | 'powers';
interface WitP { kind: WitKind; v: number }

const witness = generator<WitP>({
  id: 'witness',
  skill: 'Prove a "there exists" statement by giving a witness, as in the CST notes\' Propositions 21 and 22.',
  params: (rng) => {
    const kind = pick(rng, ['squares', 'powers'] as const);
    return { kind, v: kind === 'squares' ? int(rng, 2, 40) : int(rng, 3, 5000) };
  },
  sane: ({ kind, v }) => (kind === 'squares' ? (v >= 2 && v <= 40 ? null : 'out of range') : v >= 3 && v <= 5000 ? null : 'out of range'),
  problem: ({ kind, v }) => {
    if (kind === 'squares') {
      return {
        prompt: t`Show that there exist natural numbers ${math`i`} and ${math`j`} with ${math`${4} \cdot ${v} = i^{${2}} - j^{${2}}`}: give a witness ${math`i, j`}.`,
        answer: { kind: 'witness', count: 2, names: ['i', 'j'], example: `i = ${v + 1}, j = ${v - 1}`, check: squaresCheck(v) },
        solution: [
          t`The notes' scratch work for Proposition ${21} tries small cases: ${math`k = ${1}`} gives ${math`i = ${2}, j = ${0}`}; ${math`k = ${2}`} gives ${math`${3}, ${1}`}; the pattern is ${math`i = k + ${1}`}, ${math`j = k - ${1}`}.`,
          t`Here ${math`i = ${v + 1}`} and ${math`j = ${v - 1}`}: ${math`${v + 1}^{${2}} - ${v - 1}^{${2}} = ${(v + 1) ** 2} - ${(v - 1) ** 2} = ${4 * v}`}.`,
        ],
      };
    }
    const l = Math.floor(Math.log2(v));
    return {
      prompt: t`Show that there exists a natural number ${math`l`} with ${math`${2}^{l} \le ${v} < ${2}^{l + ${1}}`}: give the witness ${math`l`}.`,
      answer: { kind: 'witness', count: 1, names: ['l'], example: `l = ${l}`, check: powersCheck(v) },
      solution: [
        t`Double from ${1} until you pass ${v}: ${math`${2}^{${l}} = ${2 ** l} \le ${v}`} and ${math`${2}^{${l + 1}} = ${2 ** (l + 1)} > ${v}`}.`,
        t`So ${math`l = ${l}`}. The notes' proof takes ${math`l = \lfloor \log_{${2}} n \rfloor`} for a general ${mn}.`,
      ],
    };
  },
  solve: ({ kind, v }) => {
    if (kind === 'powers') {
      let l = 0;
      while (2 ** (l + 1) <= v) l++;
      return `l = ${l}`;
    }
    // Search pairs, largest j first so the search does not just find the formula's pair by construction.
    for (let i = 0; i <= 2 * v + 2; i++) for (let j = i; j >= 0; j--) if (i * i - j * j === 4 * v) return `i = ${i}, j = ${j}`;
    return 'none';
  },
  misconceptions: ({ kind, v }): Misconception[] => kind === 'squares'
    ? [
      { response: `i = ${v + 1}, j = ${v}`, why: t`Consecutive squares differ by an odd number: ${math`(k + ${1})^{${2}} - k^{${2}} = ${2}k + ${1}`}. Try ${math`i`} and ${math`j`} two apart.` },
      { response: `i = ${2 * v}, j = ${0}`, why: t`${math`(${2}k)^{${2}} = ${4}k^{${2}}`}, not ${math`${4}k`}.` },
    ]
    : [
      { response: `l = ${Math.floor(Math.log2(v)) + 1}`, why: t`${math`${2}^{l}`} must be at most ${v}. That power of ${2} is already too big.` },
      { response: `l = ${Math.floor(Math.log2(v)) - 1}`, why: t`Then ${math`${2}^{l + ${1}}`} is not more than ${v}: one step too small.` },
    ],
});

function squaresCheck(k: number) {
  return (vals: readonly Rational[]): string | null => {
    const [i, j] = vals.map((x) => (x.den === 1n && x.num >= 0n ? Number(x.num) : NaN)) as [number, number];
    if (Number.isNaN(i) || Number.isNaN(j)) return 'i and j are natural numbers: whole, zero or more.';
    return i * i - j * j === 4 * k ? null : `${i}² − ${j}² is ${i * i - j * j}, not ${4 * k}.`;
  };
}
function powersCheck(n: number) {
  return (vals: readonly Rational[]): string | null => {
    const l = vals[0] !== undefined && vals[0].den === 1n && vals[0].num >= 0n ? Number(vals[0].num) : NaN;
    if (Number.isNaN(l)) return 'l is a natural number.';
    return 2 ** l <= n && n < 2 ** (l + 1) ? null : `2^${l} = ${2 ** l} and 2^${l + 1} = ${2 ** (l + 1)}: ${n} is not between them.`;
  };
}

interface CounterP { i: number }
/** False "for all" statements, each with a domain, the claim, and its failing values. */
const FALSE_ALL: readonly { name: Rich; claim: Rich; holds: (x: number) => boolean; from: number }[] = [
  { name: t`natural number`, claim: t`${math`n^{${2}} \ge ${2}n`}`, holds: (n) => n * n >= 2 * n, from: 0 },
  { name: t`positive integer`, claim: t`${math`n^{${2}} + n + ${41}`} is prime`, holds: (n) => isPrime(n * n + n + 41), from: 1 },
  { name: t`positive integer`, claim: t`${math`${2}^{n} > n^{${2}}`}`, holds: (n) => 2 ** n > n * n, from: 1 },
  { name: t`integer`, claim: t`${math`n^{${3}} \ge n`}`, holds: (n) => n ** 3 >= n, from: -30 },
  { name: t`natural number`, claim: t`${math`${2}`} divides ${math`${2}^{n}`}`, holds: (n) => 2 ** n % 2 === 0, from: 0 },
  { name: t`positive integer`, claim: t`${math`n^{${2}} - n + ${11}`} is prime`, holds: (n) => isPrime(n * n - n + 11), from: 1 },
  { name: t`integer`, claim: t`${math`n^{${2}} > n`}`, holds: (n) => n * n > n, from: -30 },
];
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const valuesFrom = (from: number): number[] => upTo(200).map((x) => x - 1 + from);

const counterexample = generator<CounterP>({
  id: 'counterexample',
  skill: 'Disprove a "for all" statement with one value that breaks it: a counterexample.',
  params: (rng) => ({ i: int(rng, 0, FALSE_ALL.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FALSE_ALL.length ? null : 'out of range'),
  problem: ({ i }) => {
    const s = FALSE_ALL[i] as (typeof FALSE_ALL)[number];
    const bad = valuesFrom(s.from).find((n) => !s.holds(n)) as number;
    return {
      prompt: t`Disprove: for every ${s.name} ${mn}, ${s.claim}. Give one ${s.name} ${mn} for which it fails.`,
      answer: {
        kind: 'witness', count: 1, names: ['n'], example: `n = ${bad}`,
        check: ([v]) => {
          const n = v !== undefined && v.den === 1n ? Number(v.num) : NaN;
          if (Number.isNaN(n) || n < s.from || (s.from >= 0 && n < 0)) return 'Give a whole number in the stated set.';
          return s.holds(n) ? `At n = ${n} the statement holds. A counterexample is a value where it fails.` : null;
        },
      },
      solution: [
        t`A "for all" statement is false as soon as one value breaks it. Try values in order.`,
        t`At ${math`n = ${bad}`} it fails. So the statement is false.${i === 1 ? t` (It holds for ${math`n = ${1}`} to ${math`${39}`}: checking many cases proves nothing.)` : t``}`,
      ],
    };
  },
  solve: ({ i }) => {
    const s = FALSE_ALL[i] as (typeof FALSE_ALL)[number];
    // The largest failing value up to 200 above the start, to differ from the problem's search.
    const fails = valuesFrom(s.from).filter((n) => !s.holds(n));
    return `n = ${fails[fails.length - 1] as number}`;
  },
  misconceptions: ({ i }): Misconception[] => {
    const s = FALSE_ALL[i] as (typeof FALSE_ALL)[number];
    const good = valuesFrom(s.from).filter((n) => s.holds(n));
    return [
      { response: `n = ${good[0] as number}`, why: t`At that value the statement holds: it is an example, not a counterexample.` },
      { response: `n = ${good[1] as number}`, why: t`That value satisfies the statement. Look for one where it fails.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const prop21 = workedProof({
  title: t`A witness for every ${mk}`,
  prompt: t`Proposition ${21} of the CST notes: for every positive integer ${mk}, there exist natural numbers ${math`i`} and ${math`j`} such that ${math`${4} \cdot k = i^{${2}} - j^{${2}}`}.`,
  steps: [
    t`Scratch work, from small cases: ${math`k = ${1}`}: ${math`i = ${2}, j = ${0}`}; ${math`k = ${2}`}: ${math`i = ${3}, j = ${1}`}; ${math`k = ${3}`}: ${math`i = ${4}, j = ${2}`}. The pattern: ${math`i = k + ${1}`}, ${math`j = k - ${1}`}.`,
    t`Proof. For an arbitrary positive integer ${mk} (the "for all": let ${mk} be arbitrary), let ${math`i = k + ${1}`} and ${math`j = k - ${1}`} (the "there exist": name the witnesses). Both are natural, since ${math`k \ge ${1}`}.`,
    t`Then ${dmath`i^{${2}} - j^{${2}} = (k + ${1})^{${2}} - (k - ${1})^{${2}} = k^{${2}} + ${2}k + ${1} - k^{${2}} + ${2}k - ${1} = ${4} \cdot k,`} and we are done.`,
  ],
  answer: t`${math`i = k + ${1}`} and ${math`j = k - ${1}`} work for every ${mk}.`,
  source: cite('cst-dm-notes', 'printed pages 92 to 94, Proposition 21'),
});

/** TMUA Exercise M: each statement, its truth value, and the code that checks it. */
const TMUA_M: readonly { text: Rich; value: boolean; check: () => boolean }[] = [
  { text: t`for every real ${mx}, ${math`x^{${2}}`} is rational`, value: false, check: () => noSquareRoot(2) },
  { text: t`there exists a real ${mx} such that ${math`x^{${2}}`} is rational`, value: true, check: () => 1 * 1 === 1 },
  { text: t`for every real ${mx}, ${math`x^{${2}} > x`}`, value: false, check: () => !(0.5 * 0.5 > 0.5) },
  { text: t`there exists a real ${mx} such that ${math`x^{${2}} > x`}`, value: true, check: () => 2 * 2 > 2 },
  { text: t`for every real ${mx}, ${math`x^{${3}} > ${0}`}`, value: false, check: () => !(0 ** 3 > 0) },
  { text: t`there exists a real ${mx} such that ${math`x^{${3}} > ${0}`}`, value: true, check: () => 1 ** 3 > 0 },
  { text: t`for every real ${mx} and ${math`y`}, ${math`x^{${2}} + y^{${2}} > ${2}xy`}`, value: false, check: () => !(1 + 1 > 2 * 1 * 1) },
  { text: t`there exist real ${mx} and ${math`y`} such that ${math`x^{${2}} + y^{${2}} > ${2}xy`}`, value: true, check: () => 1 + 0 > 0 },
];
/** True when no fraction p/q with q up to 2,000 squares to n: evidence that the square root of n is irrational. */
function noSquareRoot(n: number): boolean {
  for (let q = 1; q <= 2000; q++) { const p = Math.round(Math.sqrt(n) * q); if (p * p === n * q * q) return false; }
  return true;
}

const tmuaM = auto({
  id: 'tmua-m',
  source: cite('tmua-logic-proof', 'Exercise M, question 1'),
  title: t`For every, and there exists`,
  prompt: t`Which of the following are true and which are false? Write T or F.`,
  answer: { kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`], rows: TMUA_M.map((s) => [s.text, null]), expected: TMUA_M.map((s) => TF(s.value)) },
  solution: [
    t`(i) False: for ${math`x = \sqrt[${4}]{${2}}`}, ${math`x^{${2}} = \sqrt{${2}}`}, which is irrational. (ii) True: ${math`x = ${1}`}.`,
    t`(iii) False: ${math`x = \frac{${1}}{${2}}`} gives ${math`\frac{${1}}{${4}} < \frac{${1}}{${2}}`}. (iv) True: ${math`x = ${2}`}.`,
    t`(v) False: ${math`x = ${0}`}. (vi) True: ${math`x = ${1}`}.`,
    t`(vii) False: ${math`x^{${2}} + y^{${2}} - ${2}xy = (x - y)^{${2}}`}, which is ${0} when ${math`x = y`}. (viii) True: ${math`x = ${1}, y = ${0}`}.`,
    t`Each "for every" needs only one counterexample to fail; each "there exists" needs only one witness to hold.`,
  ],
  reference: TMUA_M.map((s) => TF(s.value)),
  verify: () => {
    // The witness or counterexample named in each line, checked; and the square root of 2 has no fraction p/q, q up to 2,000.
    const ok = TMUA_M.every((s) => s.check()) && noSquareRoot(2);
    return same('TMUA M, each line by its witness or counterexample', ok, true);
  },
  misconceptions: [{ response: ['T', 'T', 'F', 'T', 'F', 'T', 'T', 'T'], why: t`For (i) and (vii), examples that work do not make "for every" true: one counterexample makes it false.` }],
});

const bop271 = auto({
  id: 'bop-2-7-1',
  source: cite('bop', 'Section 2.7, exercise 1'),
  title: t`Every real square is positive?`,
  prompt: t`Write ${math`\forall x \in \mathbb{R}, x^{${2}} > ${0}`} as an English sentence in your head, and say whether it is true or false.`,
  answer: { kind: 'choice', options: [{ id: 'true', label: t`True` }, { id: 'false', label: t`False` }], correct: 'false' },
  solution: [t`"For every real number ${mx}, ${math`x^{${2}} > ${0}`}." It is false: ${0} is a real number, and ${math`${0}^{${2}} > ${0}`} is not true. One counterexample is enough.`],
  reference: 'false',
  verify: () => same('a real with x² ≤ 0', [-1, -0.5, 0, 0.5, 1].some((x) => !(x * x > 0)), true),
  misconceptions: [{ response: 'true', why: t`Check ${math`x = ${0}`}: ${math`${0}^{${2}} = ${0}`}, which is not greater than ${0}.` }],
  official: { source: cite('bop', 'Solutions, Section 2.7, exercise 1'), answer: 'false', agrees: true },
});

const K = 13;
const prop21k = auto({
  id: 'notes-93-prop21',
  source: cite('cst-dm-notes', 'printed page 92, Proposition 21', true),
  title: t`A witness for ${math`k = ${K}`}`,
  prompt: t`Proposition ${21} says: for every positive integer ${mk} there are natural numbers ${math`i, j`} with ${math`${4} \cdot k = i^{${2}} - j^{${2}}`}. For ${math`k = ${K}`}, give a witness: natural numbers ${math`i`} and ${math`j`} with ${math`i^{${2}} - j^{${2}} = ${4 * K}`}.`,
  answer: { kind: 'witness', count: 2, names: ['i', 'j'], example: `i = ${K + 1}, j = ${K - 1}`, check: squaresCheck(K) },
  solution: [t`The proof's witness is ${math`i = k + ${1} = ${K + 1}`}, ${math`j = k - ${1} = ${K - 1}`}: ${math`${(K + 1) ** 2} - ${(K - 1) ** 2} = ${4 * K}`}. Any other pair that works is right too.`],
  reference: 'i = 14, j = 12',
  verify: () => {
    // Every pair of naturals up to 60 with i² − j² = 52; the proof's pair is among them.
    const pairs: string[] = [];
    for (let i = 0; i <= 60; i++) for (let j = 0; j <= i; j++) if (i * i - j * j === 52) pairs.push(`${i},${j}`);
    return same('pairs with i² − j² = 52', pairs.join(';'), '14,12');
  },
  misconceptions: [{ response: `i = ${K + 1}, j = ${K}`, why: t`${math`${K + 1}^{${2}} - ${K}^{${2}} = ${2 * K + 1}`}. The two numbers must be two apart.` }],
  official: { source: cite('cst-dm-notes', 'printed page 94, the notes\' proof'), answer: 'i = 14, j = 12', agrees: true },
});

const N22 = 1000;
const L22 = Math.floor(Math.log2(N22));
const prop22 = auto({
  id: 'notes-95-prop22',
  source: cite('cst-dm-notes', 'printed page 95, Proposition 22', true),
  title: t`Between two powers of ${2}`,
  prompt: t`Proposition ${22}: for every positive integer ${mn} there is a natural number ${math`l`} with ${math`${2}^{l} \le n < ${2}^{l + ${1}}`}. Give the witness ${math`l`} for ${math`n = ${N22}`}.`,
  answer: { kind: 'witness', count: 1, names: ['l'], example: `l = ${L22}`, check: powersCheck(N22) },
  solution: [t`${math`${2}^{${L22}} = ${2 ** L22} \le ${N22} < ${2 ** (L22 + 1)} = ${2}^{${L22 + 1}}`}, so ${math`l = ${L22}`}: the notes' witness ${math`\lfloor \log_{${2}} ${N22} \rfloor`}.`],
  reference: `l = ${L22}`,
  // By repeated doubling, not by the logarithm.
  verify: () => { let l = 0; while (2 ** (l + 1) <= N22) l++; return same('the power of 2 below 1000', l, 9); },
  misconceptions: [{ response: `l = ${L22 + 1}`, why: t`${math`${2}^{${L22 + 1}} = ${2 ** (L22 + 1)}`} is more than ${N22}.` }],
});

const prop18 = supervision({
  id: 'notes-72-prop18',
  source: cite('cst-dm-notes', 'printed page 72, Proposition 18'),
  title: t`A congruence for every ${mn}`,
  prompt: t`Fix a positive integer ${math`m`}. Prove: for integers ${math`a`} and ${math`b`}, ${math`a \equiv b \pmod{m}`} if, and only if, for all positive integers ${mn}, ${math`n \cdot a \equiv n \cdot b \pmod{n \cdot m}`}. (${math`a \equiv b \pmod{m}`} means ${math`m \mid (a - b)`}.) Say where you let ${mn} be arbitrary, and where you use the "for all" assumption by choosing a value.`,
  writeUp: 'proof',
  official: cite('cst-dm-notes', 'printed page 73, the notes\' proof'),
});
const sw132 = supervision({
  id: 'sw-1-3-2',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.3.2'),
  title: t`A "there exists" on the left of an arrow`,
  prompt: t`Let ${math`P(x)`} be a predicate on a variable ${mx} and let ${math`Q`} be a statement not mentioning ${mx}. Show that ${dmath`\big(\exists x.\ P(x)\big) \Rightarrow Q \quad\text{if and only if}\quad \forall x.\ \big(P(x) \Rightarrow Q\big).`}`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.2'),
});
const sw1210 = supervision({
  id: 'sw-1-2-10',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.10'),
  title: t`Everything up to ${mn}`,
  prompt: t`Let ${math`P(m)`} be a statement for ${math`m`} ranging over the natural numbers, and let ${math`P^{\#}(n)`} be ${math`\forall k \in \mathbb{N}.\ ${0} \le k \le n \Rightarrow P(k)`}. (a) Show that for all natural numbers ${math`\ell`}, ${math`P^{\#}(\ell) \Rightarrow P(\ell)`}. (b) Exhibit a concrete statement ${math`P(m)`} and a natural number ${mn} for which ${math`P(n) \Rightarrow P^{\#}(n)`} does not hold. (c) Prove ${math`P^{\#}(${0}) \Leftrightarrow P(${0})`}, and ${math`\big(\forall m.\ P^{\#}(m)\big) \Leftrightarrow \big(\forall m.\ P(m)\big)`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.10'),
});

// ---------------------------------------------------------------- lesson

const TF_OPTIONS = [{ id: 't', label: t`True` }, { id: 'f', label: t`False` }];
const EULER_N = 40;
const [mS, mP] = [math`S`, math`P(x)`];

export const quantifiers: TopicContent = {
  topicId: 'logic.quantifiers',
  goal: t`Read and write statements with ${math`\forall`} (for all) and ${math`\exists`} (there exists) over a stated set, and know what proves or disproves each.`,
  objective: t`Read and write statements with "for all" and "there exists", and say what proves or disproves each.`,
  why: t`Every definition in analysis, algebra and probability is written with quantifiers; next you learn to prove them.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`True or false?` },
    { kind: 'hook', text: t`Is "${math`x^{${2}}`} is an integer" true or false? You cannot say yet. It is true for ${math`x = ${7}`} and false for ${math`x = \frac{${1}}{${2}}`}. A sentence with a free letter in it has no truth value until we say which values of the letter we mean, and whether we mean all of them or just one.` },
    { kind: 'narrative', text: t`There are two natural ways to settle it. "For every integer ${mx}, ${math`x^{${2}}`} is an integer" makes a claim about all integers at once, and it is true. "There is a real ${mx} for which ${math`x^{${2}}`} is an integer" asks for just one, and it is true too: ${math`x = ${3}`} will do. Each of those words, "for every" and "there is", is a quantifier.` },
    { kind: 'section', title: t`For all and there exists` },
    {
      kind: 'definition',
      name: t`Quantifiers`,
      formal: t`Let ${mS} be a set and ${mP} a statement about ${math`x \in S`}. The statement ${math`\forall x \in S.\ P(x)`} is true if ${math`P(a)`} is true for every ${math`a \in S`}. The statement ${math`\exists x \in S.\ P(x)`} is true if ${math`P(a)`} is true for at least one ${math`a \in S`}.`,
      plain: t`In plain words: ${math`\forall`} reads "for all" (every, each) and ${math`\exists`} reads "there exists" (for some, for at least one). Each is a [[quantifier|quantifier]]. With ${mS} the integers and ${mP} "${math`x^{${2}} \ge x`}", both statements are true.`,
    },
    { kind: 'narrative', text: t`Two things change the truth of a quantified statement: the quantifier and the set. "${math`x^{${2}} > ${0}`}" is true for every positive integer, false for every real number (it fails at ${0}), and true for some real number.` },
    {
      kind: 'table',
      caption: t`What settles each kind of statement.`,
      head: [t`statement`, t`to prove it true`, t`to prove it false`],
      rows: [
        [t`${math`\forall x \in S.\ P(x)`}`, t`an argument for an arbitrary ${math`x \in S`}`, t`one ${math`x \in S`} where ${mP} fails`],
        [t`${math`\exists x \in S.\ P(x)`}`, t`one ${math`x \in S`} where ${mP} holds`, t`an argument that ${mP} fails for every ${math`x \in S`}`],
      ],
    },
    {
      kind: 'p',
      text: t`The single value that proves a "there exists" statement is a [[witness|witness]]. The single value that disproves a "for all" statement is a [[counterexample|counterexample]]: "every real ${mx} has ${math`x^{${2}} > ${0}`}" fails at ${math`x = ${0}`}.`,
      why: { q: t`Why does one value never prove a "for all" statement?`, a: t`Because the statement claims something about every element. One value that works tells you nothing about the others, which may fail. To cover them all, the argument must work for an element you know nothing special about.` },
    },
    quickCheck({
      prompt: t`True or false: ${math`\exists x \in \mathbb{R}.\ x^{${2}} = -${1}`}.`,
      answer: { kind: 'choice', options: TF_OPTIONS, correct: 'f' },
      reference: ['f'],
      why: t`Every real square is at least ${0}, so no real ${mx} has ${math`x^{${2}} = -${1}`}. To show "there exists" is false you need an argument about every ${mx}, as here.`,
    }),
    { kind: 'section', title: t`A first proof of each` },
    { kind: 'narrative', text: t`Here is a "for all" proof. The trick is to let ${mx} be an arbitrary real number: a fresh letter about which we assume nothing except that it is real. Whatever we prove about it then holds for each real number.` },
    { kind: 'theorem', statement: t`${math`\forall x \in \mathbb{R}.\ x^{${2}} - ${2}x + ${2} > ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Arbitrary element`, text: t`Let ${mx} be an arbitrary real number.` },
        { label: t`Complete the square`, text: t`${math`x^{${2}} - ${2}x + ${1} = (x - ${1})^{${2}}`}, so`, eq: [dmath`x^{${2}} - ${2}x + ${2} = (x - ${1})^{${2}} + ${1}.`] },
        { label: t`Bound it`, text: t`A real square is at least ${0}, so ${math`(x - ${1})^{${2}} + ${1} \ge ${1} > ${0}`}.` },
        { label: t`Conclude`, text: t`${mx} was arbitrary, so the inequality holds for every real ${mx}.` },
      ],
    },
    { kind: 'narrative', text: t`A "there exists" proof needs just one witness, often found by scratch work and then checked. Proposition ${21} of the Cambridge Discrete Mathematics notes, worked below, combines the two: for every positive integer ${math`k`} (arbitrary) there are ${math`i`} and ${math`j`} (witnesses, built from ${math`k`}) with ${math`${4}k = i^{${2}} - j^{${2}}`}.` },
    { kind: 'section', title: t`Using quantified statements` },
    {
      kind: 'list',
      items: [
        t`From ${math`\forall x.\ P(x)`} you may conclude ${math`P(a)`} for any value ${math`a`} you like (universal instantiation). From ${math`\forall x \in \mathbb{R}.\ x^{${2}} \ge ${0}`}, conclude ${math`\pi^{${2}} \ge ${0}`}.`,
        t`From ${math`\exists x.\ P(x)`} you may introduce a new name, say ${math`x_{${0}}`}, for some value with ${math`P(x_{${0}})`}. You do not get to choose which value it is.`,
      ],
    },
    checkFrom(counterexample, { i: 0 }, t`At ${math`n = ${1}`}, ${math`n^{${2}} = ${1}`} and ${math`${2}n = ${2}`}, so ${math`n^{${2}} \ge ${2}n`} fails: a counterexample.`),
    { kind: 'section', title: t`Two traps` },
    { kind: 'pitfall', claim: t`${math`n^{${2}} + n + ${41}`} is prime for every positive integer ${math`n`}: it is prime for ${math`n = ${1}, \ldots, ${EULER_N - 1}`}.`, counterexample: t`At ${math`n = ${EULER_N}`} it is ${EULER_N * EULER_N + EULER_N + 41}, which is ${math`${41}^{${2}}`}. Checking cases, however many, never proves a "for all" statement.` },
    { kind: 'pitfall', claim: t`"There exists a real ${mx} with ${math`x^{${2}} > -${2}`}" suggests some real ${mx} has ${math`x^{${2}} \le -${2}`}.`, counterexample: t`The TMUA notes warn against this reading. "There exists" asks for at least one, and says nothing about the rest. Here every real ${mx} works, and the statement is still true.` },
    { kind: 'takeaway', text: t`"For all" needs an argument for an arbitrary element and falls to one counterexample; "there exists" needs one witness.` },
  ],
  examples: [
    prop21,
    worked(forallExists, { d: 1, p: 1 }, t`For all, and there exists, on the integers`),
    worked(counterexample, { i: 1 }, t`A pattern that breaks`),
  ],
  generators: [forallExists, witness, counterexample],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['quantifier', 'witness', 'counterexample'],
  cambridge: withUses([tmuaM, bop271, prop21k, prop22, prop18, sw132, sw1210], {
    'sw-1-3-2': { sections: ['For all and there exists', 'Using quantified statements'], note: t`Moving a "there exists" across an arrow, both directions` },
    'notes-72-prop18': { sections: ['A first proof of each', 'Using quantified statements'], note: t`Proving and using a "for all" about congruences`, needs: ['num.divisibility'] },
    'sw-1-2-10': { sections: ['For all and there exists', 'A first proof of each', 'Two traps'], note: t`Proving and refuting statements about every number up to a bound` },
  }),
  // The supervision proofs. Proposition 18 needs divisibility and congruences, taught later, so it is practice.
  // The Proposition 21 and 22 witnesses are lookups, so they do not gate.
  gate: ['sw-1-3-2', 'sw-1-2-10'],
  recall: [
    { front: t`When is ${math`\forall x \in S.\ P(x)`} true?`, back: t`When ${math`P(a)`} is true for every ${math`a \in S`}.` },
    { front: t`When is ${math`\exists x \in S.\ P(x)`} true?`, back: t`When ${math`P(a)`} is true for at least one ${math`a \in S`}.` },
    { front: t`What proves a "there exists" statement, and what disproves a "for all"?`, back: t`A witness proves "there exists"; a counterexample disproves "for all".` },
    { front: t`What is universal instantiation?`, back: t`From ${math`\forall x.\ P(x)`}, conclude ${math`P(a)`} for any particular ${math`a`}.` },
  ],
  proofOrder: [
    {
      title: t`${math`x^{${2}} - ${2}x + ${2} > ${0}`} for every real ${mx}`,
      steps: [
        t`Let ${mx} be an arbitrary real number.`,
        t`Write ${math`x^{${2}} - ${2}x + ${2} = (x - ${1})^{${2}} + ${1}`}.`,
        t`A square is at least ${0}, so this is at least ${1}.`,
        t`Since ${mx} was arbitrary, it holds for every real ${mx}.`,
      ],
    },
  ],
};
