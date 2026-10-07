/**
 * alg.linear-recurrences: linear difference equations, u_(n+1) = a u_n + b and
 * u_(n+1) = a u_n + b u_(n-1), solved from the auxiliary equation, with a particular solution
 * for a constant term. From IA Probability Example Sheet 3 Q11 (the slot machine,
 * u_n + (1/2 - p) u_(n-1) = 1/2, whose answer the sheet states) and STEP 3 Statistics Q1(iii)
 * (2007 S3 Q13: the frog, u_n = A(-q)^(n-1) + B + Cn), and the IA schedule ("Difference
 * equations and their solution"). Answers are checked against the recurrences iterated
 * exactly and against listing every case, and compared with the stated and official answers.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, paren, t, texOfRational } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { frogMean, rpow, rx, solveLinear } from '../partv-a';

const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;
const SH3 = 'ia-prob-sheet-3' as const;
const N_DOM = { n: { kind: 'integer' as const, min: 0, max: 10 } };
/** Values of an expression-like closed form at n = 0..8, for telling candidate answers apart. */
const seqKey = (f: (n: number) => Rational): string => Array.from({ length: 9 }, (_, n) => str(f(n))).join(',');
const distinctSeqs = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** r^n for any integer n ≥ 0 and rational r, as a function. */
const pw = (r: Rational) => (n: number): Rational => rpow(r, n);
/** A coefficient before a letter: 3, or - for -1. */
const cf = (a: number): string => (a === -1 ? '-' : `${a}`);
const tex = (r: Rational): string => (r.den === 1n ? `${r.num}` : texOfRational(r));
/** "(3)(2)^n", a term of a closed form in the expression language. */
const term = (c: Rational, base: Rational, exp = 'n'): string => `${rx(c)}*${rx(base)}^(${exp})`;

// ---------------------------------------------------------------- first order

interface FirstP { a: number; b: number; c: number }
const fixed = ({ a, b }: FirstP): Rational => q(b, 1 - a);
const firstRight = (p: FirstP) => (n: number): Rational => add(mul(sub(q(p.c), fixed(p)), pw(q(p.a))(n)), fixed(p));
const firstMis = (p: FirstP): [string, (n: number) => Rational][] => {
  const k = fixed(p);
  return [
    [`${term(q(p.c), q(p.a))} + ${rx(k)}`, (n) => add(mul(q(p.c), pw(q(p.a))(n)), k)],
    [`${term(sub(q(p.c), k), q(p.a), 'n - 1')} + ${rx(k)}`, (n) => add(n === 0 ? div(sub(q(p.c), k), q(p.a)) : mul(sub(q(p.c), k), pw(q(p.a))(n - 1)), k)],
    [term(q(p.c), q(p.a)), (n) => mul(q(p.c), pw(q(p.a))(n))],
  ];
};

const firstOrder = generator<FirstP>({
  id: 'first-order',
  skill: 'Solve u_(n+1) = a u_n + b: subtract the fixed point k = b/(1 - a), and what is left is geometric.',
  params: (rng) => {
    for (;;) {
      const p: FirstP = { a: pick(rng, [2, 3, -2, -1, 4]), b: pick(rng, [-6, -4, -3, -1, 1, 2, 3, 5, 6]), c: int(rng, -3, 6) };
      const right = seqKey(firstRight(p));
      if (str(fixed(p)) !== String(p.c) && distinctSeqs(right, firstMis(p).map(([, f]) => seqKey(f))) >= 2) return p;
    }
  },
  sane: ({ a }) => (a !== 1 && a !== 0 ? null : 'out of range'),
  problem: (p) => {
    const k = fixed(p);
    const expr = `${term(sub(q(p.c), k), q(p.a))} + ${rx(k)}`;
    return {
      prompt: t`The sequence has ${math`u_{${0}} = ${p.c}`} and ${math`u_{n + ${1}} = ${computedTex(cf(p.a))}u_{n} ${computedTex(p.b < 0 ? `- ${-p.b}` : `+ ${p.b}`)}`} for ${math`n \ge ${0}`}. Find ${math`u_{n}`} in terms of ${math`n`}.`,
      answer: { kind: 'expression', expected: expr, variables: ['n'], domains: N_DOM },
      solution: [
        t`The fixed point ${math`k`} satisfies ${math`k = ${computedTex(cf(p.a))}k ${computedTex(p.b < 0 ? `- ${-p.b}` : `+ ${p.b}`)}`}, so ${math`k = ${k}`}. Then ${math`v_{n} = u_{n} - k`} satisfies ${math`v_{n + ${1}} = ${computedTex(cf(p.a))}v_{n}`}: the constant cancels.`,
        t`So ${math`v_{n} = v_{${0}} \times ${paren(p.a)}^{n} = ${sub(q(p.c), k)} \times ${paren(p.a)}^{n}`}, and ${math`u_{n} = ${computedTex(tex(sub(q(p.c), k)))} \times ${paren(p.a)}^{n} ${computedTex(k.num < 0n ? `- ${tex(sub(q(0), k))}` : `+ ${tex(k)}`)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Iterate to u_0 and u_1, then fit A a^n + B to them.
    const u0 = q(p.c);
    const u1 = add(mul(q(p.a), u0), q(p.b));
    const [A, B] = solveLinear([[q(1), q(1)], [q(p.a), q(1)]], [u0, u1]) as [Rational, Rational];
    return `${term(A, q(p.a))} + ${rx(B)}`;
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = firstMis(p).map(([e]) => e) as [string, string, string];
    return [
      { response: x, why: t`The geometric part starts from ${math`u_{${0}} - k`}, not ${math`u_{${0}}`}: subtract the fixed point before scaling.` },
      { response: y, why: t`At ${math`n = ${0}`} the power should be ${math`a^{${0}} = ${1}`}, so the exponent is ${math`n`}, not ${math`n - ${1}`}.` },
      { response: z, why: t`That ignores the constant term ${p.b}, which adds the fixed point ${fixed(p)} to the solution.` },
    ];
  },
});

// ---------------------------------------------------------------- second order, distinct roots

interface SecP { al: number; be: number; u0: number; u1: number }
const secFit = (p: SecP): [Rational, Rational] => solveLinear([[q(1), q(1)], [q(p.al), q(p.be)]], [q(p.u0), q(p.u1)]) as [Rational, Rational];
const secRight = (p: SecP) => (n: number): Rational => { const [A, B] = secFit(p); return add(mul(A, pw(q(p.al))(n)), mul(B, pw(q(p.be))(n))); };
const secMis = (p: SecP): [string, (n: number) => Rational][] => {
  const [A, B] = secFit(p);
  const [Ap, Bp] = solveLinear([[q(1), q(1)], [q(-p.al), q(-p.be)]], [q(p.u0), q(p.u1)]) as [Rational, Rational];
  const [As, Bs] = solveLinear([[q(p.al), q(p.be)], [q(p.al * p.al), q(p.be * p.be)]], [q(p.u0), q(p.u1)]) as [Rational, Rational];
  return [
    [`${term(B, q(p.al))} + ${term(A, q(p.be))}`, (n) => add(mul(B, pw(q(p.al))(n)), mul(A, pw(q(p.be))(n)))],
    [`${term(Ap, q(-p.al))} + ${term(Bp, q(-p.be))}`, (n) => add(mul(Ap, pw(q(-p.al))(n)), mul(Bp, pw(q(-p.be))(n)))],
    [`${term(As, q(p.al), 'n - 1')} + ${term(Bs, q(p.be), 'n - 1')}`, (n) => add(mul(As, div(pw(q(p.al))(n), q(p.al))), mul(Bs, div(pw(q(p.be))(n), q(p.be))))],
  ];
};

const secondOrder = generator<SecP>({
  id: 'second-order',
  skill: 'Solve u_(n+1) = a u_n + b u_(n-1) from the roots of the auxiliary equation λ^2 = aλ + b, fitting the constants to u_0 and u_1.',
  params: (rng) => {
    for (;;) {
      const al = pick(rng, [-3, -2, -1, 2, 3, 4]);
      const be = pick(rng, [-2, -1, 1, 2, 3, 5]);
      if (al === be || al === -be) continue;
      const p: SecP = { al, be, u0: int(rng, -2, 4), u1: int(rng, -5, 9) };
      const [A, B] = secFit(p);
      if (A.num === 0n || B.num === 0n) continue;
      if (distinctSeqs(seqKey(secRight(p)), secMis(p).map(([, f]) => seqKey(f))) >= 2) return p;
    }
  },
  sane: ({ al, be }) => (al !== be && al !== 0 && be !== 0 ? null : 'out of range'),
  problem: (p) => {
    const [A, B] = secFit(p);
    const s = p.al + p.be;
    const pr = p.al * p.be;
    const first = s === 1 ? 'u_{n}' : s === -1 ? '-u_{n}' : `${s}u_{n}`;
    const second = `${-pr < 0 ? '-' : '+'} ${Math.abs(pr) === 1 ? '' : Math.abs(pr)}u_{n - ${1}}`;
    const rhs = computedTex(`${first} ${second}`);
    const lin = (r: number): string => `(\\lambda ${r < 0 ? '+' : '-'} ${Math.abs(r)})`;
    const mid = `${-s < 0 ? '-' : '+'} ${Math.abs(s) === 1 ? '' : Math.abs(s)}\\lambda`;
    const aux = computedTex(`\\lambda^{${2}} ${mid} ${pr < 0 ? '-' : '+'} ${Math.abs(pr)} = ${lin(p.al)}${lin(p.be)}`);
    return {
      prompt: t`The sequence has ${math`u_{${0}} = ${p.u0}`}, ${math`u_{${1}} = ${p.u1}`}, and ${math`u_{n + ${1}} = ${rhs}`} for ${math`n \ge ${1}`}. Find ${math`u_{n}`} in terms of ${math`n`}.`,
      answer: { kind: 'expression', expected: `${term(A, q(p.al))} + ${term(B, q(p.be))}`, variables: ['n'], domains: N_DOM },
      solution: [
        t`Try ${math`u_{n} = \lambda^{n}`}: the auxiliary equation is ${aux}, with roots ${p.al} and ${p.be}. So ${math`u_{n} = A ${paren(p.al)}^{n} + B ${paren(p.be)}^{n}`}.`,
        t`From ${math`n = ${0}`} and ${math`n = ${1}`}: ${math`A + B = ${p.u0}`} and ${math`${p.al}A + ${paren(p.be)}B = ${p.u1}`}, so ${math`A = ${A}`} and ${math`B = ${B}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Iterate the recurrence to u_2 and fit A al^n + B be^n to u_1 and u_2 instead of u_0 and u_1.
    const u2 = (p.al + p.be) * p.u1 - p.al * p.be * p.u0;
    const [A, B] = solveLinear([[q(p.al), q(p.be)], [q(p.al * p.al), q(p.be * p.be)]], [q(p.u1), q(u2)]) as [Rational, Rational];
    return `${term(A, q(p.al))} + ${term(B, q(p.be))}`;
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = secMis(p).map(([e]) => e) as [string, string, string];
    return [
      { response: x, why: t`The constants are swapped. Fit ${math`A`} and ${math`B`} to ${math`u_{${0}}`} and ${math`u_{${1}}`} with each attached to its own root.` },
      { response: y, why: t`The roots have the wrong signs. Rearrange to ${math`\lambda^{${2}} - a\lambda - b = ${0}`} before factorising.` },
      { response: z, why: t`The exponent should be ${math`n`}: the constants come from ${math`u_{${0}} = A + B`}, the ${math`n = ${0}`} case.` },
    ];
  },
});

// ---------------------------------------------------------------- a repeated root

interface RepP { al: number; u0: number; u1: number }
const repB = (p: RepP): Rational => sub(q(p.u1, p.al), q(p.u0));
const repRight = (p: RepP) => (n: number): Rational => mul(add(q(p.u0), mul(repB(p), q(n))), pw(q(p.al))(n));
const repMis = (p: RepP): [string, (n: number) => Rational][] => [
  [term(q(p.u0), q(p.al)), (n) => mul(q(p.u0), pw(q(p.al))(n))],
  [`(${p.u0} + ${rx(q(p.u1 - p.u0))}n)*${rx(q(p.al))}^n`, (n) => mul(add(q(p.u0), mul(q(p.u1 - p.u0), q(n))), pw(q(p.al))(n))],
  [`(${p.u0} + ${rx(q(p.u1 - p.al * p.u0))}n)*${rx(q(p.al))}^n`, (n) => mul(add(q(p.u0), mul(q(p.u1 - p.al * p.u0), q(n))), pw(q(p.al))(n))],
];

const repeatedRoot = generator<RepP>({
  id: 'repeated-root',
  skill: 'Solve a recurrence whose auxiliary equation has a repeated root α: u_n = (A + Bn)α^n.',
  params: (rng) => {
    for (;;) {
      const p: RepP = { al: pick(rng, [2, 3, -2, -3]), u0: int(rng, -2, 4), u1: int(rng, -6, 9) };
      if (repB(p).num === 0n) continue;
      if (distinctSeqs(seqKey(repRight(p)), repMis(p).map(([, f]) => seqKey(f))) >= 2) return p;
    }
  },
  sane: ({ al }) => (Math.abs(al) >= 2 ? null : 'out of range'),
  problem: (p) => {
    const B = repB(p);
    return {
      prompt: t`The sequence has ${math`u_{${0}} = ${p.u0}`}, ${math`u_{${1}} = ${p.u1}`}, and ${math`u_{n + ${1}} = ${2 * p.al}u_{n} - ${p.al * p.al}u_{n - ${1}}`} for ${math`n \ge ${1}`}. Find ${math`u_{n}`} in terms of ${math`n`}.`,
      answer: { kind: 'expression', expected: `(${p.u0} + ${rx(B)}n)*${rx(q(p.al))}^n`, variables: ['n'], domains: N_DOM },
      solution: [
        t`The auxiliary equation ${math`\lambda^{${2}} ${computedTex(p.al < 0 ? `+ ${-2 * p.al}` : `- ${2 * p.al}`)}\lambda + ${p.al * p.al} = (\lambda ${computedTex(p.al < 0 ? `+ ${-p.al}` : `- ${p.al}`)})^{${2}} = ${0}`} has the repeated root ${p.al}, so ${math`u_{n} = (A + Bn)${paren(p.al)}^{n}`}: ${math`n${paren(p.al)}^{n}`} is a second solution.`,
        t`${math`u_{${0}} = A = ${p.u0}`} and ${math`u_{${1}} = (A + B)${paren(p.al)} = ${p.u1}`}, so ${math`B = ${q(p.u1, p.al)} - ${paren(p.u0)} = ${B}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Fit (A + Bn) al^n to u_1 and u_2, iterating the recurrence once.
    const u2 = 2 * p.al * p.u1 - p.al * p.al * p.u0;
    const [A, B] = solveLinear([[q(p.al), q(p.al)], [q(p.al * p.al), q(2 * p.al * p.al)]], [q(p.u1), q(u2)]) as [Rational, Rational];
    return `(${rx(A)} + ${rx(B)}n)*${rx(q(p.al))}^n`;
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = repMis(p).map(([e]) => e) as [string, string, string];
    return [
      { response: x, why: t`With a repeated root, ${math`A\alpha^{n}`} alone cannot fit two starting values: the second solution is ${math`n\alpha^{n}`}.` },
      { response: y, why: t`At ${math`n = ${1}`}, ${math`(A + B)\alpha = u_{${1}}`}: divide ${math`u_{${1}}`} by ${math`\alpha`} before subtracting ${math`A`}.` },
      { response: z, why: t`${math`(A + B)\alpha = u_{${1}}`} gives ${math`B = \frac{u_{${1}}}{\alpha} - A`}, not ${math`u_{${1}} - \alpha A`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const NP_DOM = { n: { kind: 'integer' as const, min: 1, max: 12 }, p: { kind: 'real' as const, min: 0.01, max: 0.49 } };
/** The slot machine's u_n, by listing every win-or-lose history of n turns. */
function slotByHistories(n: number, p: Rational): Rational {
  let total = q(0);
  for (let m = 0; m < 2 ** n; m++) {
    let pr = q(1);
    let lastWin = false;
    for (let i = 0; i < n; i++) {
      const win = ((m >> i) & 1) === 1;
      const pw1 = i === 0 || !lastWin ? q(1, 2) : p;
      pr = mul(pr, win ? pw1 : sub(q(1), pw1));
      lastWin = win;
    }
    if (lastWin) total = add(total, pr);
  }
  return total;
}
const slotClosed = (n: number, p: Rational): Rational => div(add(q(1), mul(q(n % 2 === 1 ? 1 : -1), rpow(sub(q(1, 2), p), n))), sub(q(3), mul(q(2), p)));

const q11 = auto({
  id: 'sheet3-q11-slot-machine',
  source: cite(SH3, 'Q11'),
  title: t`The slot machine`,
  prompt: t`A slot machine operates so that at the first turn the probability of winning is ${q(1, 2)}. Thereafter the probability of winning is ${q(1, 2)} after a loss, but ${math`p < \frac{${1}}{${2}}`} after a win. If ${math`u_{n}`} is the probability of winning at the ${math`n`}th turn, then ${math`u_{n} + \left(\frac{${1}}{${2}} - p\right)u_{n - ${1}} = \frac{${1}}{${2}}`} for ${math`n \ge ${1}`}, with ${math`u_{${0}} = ${0}`}. Solve for ${math`u_{n}`}.`,
  answer: { kind: 'expression', expected: '(1 + (-1)^(n - 1) (1/2 - p)^n)/(3 - 2p)', variables: ['n', 'p'], domains: NP_DOM },
  solution: [
    t`Total probability over the last turn: ${math`u_{n} = \frac{${1}}{${2}}(${1} - u_{n - ${1}}) + p \, u_{n - ${1}}`}, which is the equation given. Write ${math`c = \frac{${1}}{${2}} - p`}, so ${math`u_{n} = \frac{${1}}{${2}} - c \, u_{n - ${1}}`}.`,
    t`The fixed point ${math`k`} has ${math`k = \frac{${1}}{${2}} - ck`}, so ${math`k = \frac{${1}}{${2}(${1} + c)} = \frac{${1}}{${3} - ${2}p}`}. Then ${math`u_{n} - k = (-c)^{n}(u_{${0}} - k) = -(-c)^{n}k`}.`,
    t`So ${math`u_{n} = k\left(${1} - (-c)^{n}\right) = \frac{${1} + (-${1})^{n - ${1}}\left(\frac{${1}}{${2}} - p\right)^{n}}{${3} - ${2}p}`}.`,
  ],
  reference: '(1 - (p - 1/2)^n)/(3 - 2p)',
  verify: () => {
    for (const p of [q(1, 3), q(1, 5), q(0), q(2, 5)]) {
      for (let n = 1; n <= 9; n++) {
        const e = same(`p = ${str(p)}, n = ${n}, every history`, str(slotByHistories(n, p)), str(slotClosed(n, p)));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: '1/(3 - 2p)', why: t`That is the fixed point, the limit as ${math`n \to \infty`}. The geometric part ${math`(-c)^{n}`} fits ${math`u_{${0}} = ${0}`}.` }],
  official: { source: cite(SH3, 'Q11, the statement'), answer: '(1 + (-1)^(n - 1) (1/2 - p)^n)/(3 - 2p)', agrees: true },
});

const NQ_DOM = { n: { kind: 'integer' as const, min: 1, max: 12 }, q: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const frogClosed = (n: number, qq: Rational): Rational => {
  const one = add(q(1), qq);
  const A = div(mul(qq, qq), mul(one, one));
  const B = div(qq, mul(one, one));
  return add(add(mul(A, rpow(sub(q(0), qq), n - 1)), B), div(q(n), one));
};
const frog = auto({
  id: 's3-q1-iii-closed-form',
  source: cite(S3, 'Q1(iii)'),
  title: t`The frog: a closed form`,
  prompt: t`The frog's expected number of jumps from ${math`n - \frac{${1}}{${2}}`} m satisfies ${math`u_{n} = ${1} + p u_{n - ${1}} + q u_{n - ${2}}`}, with ${math`u_{${1}} = ${1}`}, ${math`u_{${2}} = ${2} - q`}, ${math`u_{${3}} = ${3} - ${2}q + q^{${2}}`}, and ${math`p + q = ${1}`}. Given that ${math`u_{n} = A(-q)^{n - ${1}} + B + Cn`}, find ${math`u_{n}`} in terms of ${math`n`} and ${math`q`}.`,
  answer: { kind: 'expression', expected: '(q/(1 + q))^2 (-q)^(n - 1) + q/(1 + q)^2 + n/(1 + q)', variables: ['n', 'q'], domains: NQ_DOM },
  solution: [
    t`The auxiliary equation of ${math`u_{n} = p u_{n - ${1}} + q u_{n - ${2}}`} is ${math`\lambda^{${2}} - p\lambda - q = (\lambda - ${1})(\lambda + q) = ${0}`}, using ${math`p = ${1} - q`}: roots ${1} and ${math`-q`}. Since ${1} is a root, the constant ${1} needs the particular solution ${math`Cn`}: ${math`Cn = ${1} + pC(n - ${1}) + qC(n - ${2})`} gives ${math`C(p + ${2}q) = ${1}`}, ${math`C = \frac{${1}}{${1} + q}`}.`,
    t`Fitting ${math`u_{${1}}`}, ${math`u_{${2}}`}, ${math`u_{${3}}`} gives ${math`A = \left(\frac{q}{${1} + q}\right)^{${2}}`} and ${math`B = \frac{q}{(${1} + q)^{${2}}}`}: ${math`u_{n} = \left(\frac{q}{${1} + q}\right)^{${2}}(-q)^{n - ${1}} + \frac{q}{(${1} + q)^{${2}}} + \frac{n}{${1} + q}`}.`,
  ],
  reference: '(q/(1 + q))^2 (-q)^(n - 1) + q/(1 + q)^2 + n/(1 + q)',
  verify: () => {
    for (const qq of [q(1, 2), q(1, 3), q(3, 4), q(1, 10)]) {
      for (let n = 1; n <= 9; n++) {
        const e = same(`q = ${str(qq)}, n = ${n}, every jump sequence`, str(frogMean(n, qq)), str(frogClosed(n, qq)));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'n/(1 + q)', why: t`That is only the particular solution, the large-${math`n`} approximation. The constants ${math`A`} and ${math`B`} fit the first values exactly.` }],
  official: { source: cite(S3S, 'Q1(iii)'), answer: '(q/(1 + q))^2 (-q)^(n - 1) + q/(1 + q)^2 + n/(1 + q)', agrees: true },
});

const P_DOM = { p: { kind: 'real' as const, min: 0.01, max: 0.49 } };
const slotLimit = auto({
  id: 'sheet3-q11-long-run',
  source: cite(SH3, 'Q11', true),
  title: t`The slot machine in the long run`,
  prompt: t`For the slot machine (win with probability ${q(1, 2)} after a loss and ${math`p < \frac{${1}}{${2}}`} after a win), find the limit of ${math`u_{n}`}, the probability of winning at turn ${math`n`}, as ${math`n \to \infty`}.`,
  answer: { kind: 'expression', expected: '1/(3 - 2p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`In ${math`u_{n} = \frac{${1} + (-${1})^{n - ${1}}\left(\frac{${1}}{${2}} - p\right)^{n}}{${3} - ${2}p}`}, the power tends to ${0} because ${math`${0} < \frac{${1}}{${2}} - p < \frac{${1}}{${2}}`}.`,
    t`So ${math`u_{n} \to \frac{${1}}{${3} - ${2}p}`}, the fixed point of the recurrence: the long-run fraction of turns won. With ${math`p = \frac{${1}}{${2}}`} it would be ${q(1, 2)}, as for a fair machine.`,
  ],
  reference: '1/(3 - 2p)',
  verify: () => {
    for (const p of [q(1, 3), q(1, 5), q(0)]) {
      const u = slotClosed(40, p);
      if (Math.abs(Number(u.num) / Number(u.den) - 1 / (3 - 2 * (Number(p.num) / Number(p.den)))) > 1e-9) return `p = ${str(p)}: u_40 is not near the limit`;
    }
    return null;
  },
  misconceptions: [{ response: '1/2', why: t`After a win the chance drops to ${math`p`}, so in the long run the machine pays out less than half the time.` }],
});

const frogExplain = supervision({
  id: 's3-q1-iii-explain',
  source: cite(S3, 'Q1(iii)'),
  title: t`Why ${math`u_{n} \approx \frac{n}{p + ${2}q}`}`,
  prompt: t`From the closed form, show that for large ${math`n`}, ${math`u_{n} \approx \frac{n}{p + ${2}q}`}, and explain carefully why this result is to be expected, using the expected length of one jump.`,
  writeUp: 'explanation',
  official: cite(S3S, 'Q1(iii)'),
});
const slotDerive = supervision({
  id: 'sheet3-q11-derive',
  source: cite(SH3, 'Q11'),
  title: t`Derive the slot machine's equation`,
  prompt: t`Show that, for ${math`n > ${1}`}, ${math`u_{n} + \left(\frac{${1}}{${2}} - p\right)u_{n - ${1}} = \frac{${1}}{${2}}`}, and that it also holds for ${math`n = ${1}`} if ${math`u_{${0}} = ${0}`}. Which event do you condition on?`,
  writeUp: 'proof',
});
const theory = supervision({
  id: 'schedule-difference-equations',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Difference equations and their solution"', true),
  title: t`Why the auxiliary equation works`,
  prompt: t`Suppose ${math`\lambda^{${2}} = a\lambda + b`} has distinct roots ${math`\alpha`} and ${math`\beta`}. Prove that every solution of ${math`u_{n + ${1}} = a u_{n} + b u_{n - ${1}}`} is ${math`A\alpha^{n} + B\beta^{n}`} for some constants: show these are solutions, that the constants can match any ${math`u_{${0}}`} and ${math`u_{${1}}`}, and that two values determine the rest. What changes when ${math`\alpha = \beta`}?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

/** The hook's sequence: u_(n+1) = 5u_n - 6u_(n-1), u_0 = 2, u_1 = 5, which is 2^n + 3^n. */
const hookSeq = (count: number): number[] => { const u = [2, 5]; while (u.length < count) u.push(5 * (u[u.length - 1] as number) - 6 * (u[u.length - 2] as number)); return u; };
const H = hookSeq(6);
const H20 = 2 ** 20 + 3 ** 20;
const [mk, mn, mathA, mathB] = [math`k`, math`n`, math`A`, math`B`];

export const linearRecurrences: TopicContent = {
  topicId: 'alg.linear-recurrences',
  goal: t`Solve ${math`u_{n + ${1}} = au_{n} + b`} and ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`} from the auxiliary equation, with a particular solution for a constant term.`,
  objective: t`Solve first and second order linear recurrences in closed form, from the auxiliary equation.`,
  why: t`First-step analysis in probability ends in a recurrence: ruin chances, expected times, and the frog of STEP.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A formula for the twentieth term` },
    { kind: 'hook', text: t`The sequence ${listOf(H)}, and so on, is built by one rule: each term is ${5} times the one before minus ${6} times the one before that. What is the twentieth term? You could grind out ${19} steps. Or you could notice that ${listOf(H.slice(0, 4))} are ${math`${1} + ${1}, ${2} + ${3}, ${4} + ${9}, ${8} + ${27}`}: powers of ${2} plus powers of ${3}. This lesson explains where those powers come from.` },
    { kind: 'definition', name: t`Linear difference equation`, formal: t`A [[difference-equation|difference equation]] (or recurrence) of order ${2} with constant coefficients is ${dmath`u_{n + ${1}} = a\,u_{n} + b\,u_{n - ${1}} + c \qquad (n \ge ${1}),`} with constants ${math`a, b, c`}. It is homogeneous if ${math`c = ${0}`}. With ${math`b = ${0}`} it is of order ${1}.`, plain: t`Each term is a fixed combination of the previous one or two, plus a constant. The hook's rule is ${math`a = ${5}`}, ${math`b = -${6}`}, ${math`c = ${0}`}.` },

    { kind: 'section', title: t`First order` },
    { kind: 'theorem', name: t`First order`, statement: t`If ${math`a \ne ${1}`}, the solution of ${math`u_{n + ${1}} = a u_{n} + c`} is ${dmath`u_{n} = (u_{${0}} - k)\,a^{n} + k, \qquad \text{where } k = \frac{c}{${1} - a}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Find the fixed point`, text: t`A constant solution ${math`u_{n} = k`} needs ${math`k = ak + c`}, that is ${math`k = \frac{c}{${1} - a}`}.`, plain: t`For ${math`u_{n + ${1}} = ${3}u_{n} - ${4}`}: ${math`k = ${3}k - ${4}`}, so ${math`k = ${2}`}.`, why: { q: t`Why does ${math`a \ne ${1}`} matter?`, a: t`Solving ${math`k - ak = c`} divides by ${math`${1} - a`}. If ${math`a = ${1}`}, the recurrence just adds ${math`c`} each time: ${math`u_{n} = u_{${0}} + cn`}.` } },
        { label: t`Measure from it`, text: t`Let ${math`v_{n} = u_{n} - k`}. Subtract ${math`k = ak + c`} from ${math`u_{n + ${1}} = au_{n} + c`}:`, eq: [dmath`v_{n + ${1}} = a\,v_{n}.`], plain: t`The constants cancel, leaving a geometric sequence.` },
        { label: t`Solve the geometric sequence`, text: t`So ${math`v_{n} = a^{n}v_{${0}}`}, and adding ${mk} back gives ${math`u_{n} = (u_{${0}} - k)a^{n} + k`}.` },
      ],
    },
    checkFrom(firstOrder, { a: 2, b: 3, c: 1 }, t`The fixed point is ${math`k = \frac{${3}}{${1} - ${2}} = -${3}`}, and ${math`u_{${0}} - k = ${4}`}.`),

    { kind: 'section', title: t`Second order: the auxiliary equation` },
    { kind: 'narrative', text: t`For a homogeneous second order recurrence, guess a geometric sequence ${math`u_{n} = \lambda^{n}`}. Put it in ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`}: ${math`\lambda^{n + ${1}} = a\lambda^{n} + b\lambda^{n - ${1}}`}. Divide by ${math`\lambda^{n - ${1}}`} (with ${math`\lambda \ne ${0}`}), and the ${mn} disappears.` },
    { kind: 'definition', name: t`Auxiliary equation`, formal: t`The [[auxiliary-equation|auxiliary equation]] of ${math`u_{n + ${1}} = a u_{n} + b u_{n - ${1}}`} is ${dmath`\lambda^{${2}} = a\lambda + b.`}`, plain: t`For the hook's rule, ${math`\lambda^{${2}} = ${5}\lambda - ${6}`}, that is ${math`(\lambda - ${2})(\lambda - ${3}) = ${0}`}: roots ${2} and ${3}.` },
    { kind: 'theorem', name: t`Distinct roots`, statement: t`Let ${math`b \ne ${0}`}, and suppose the auxiliary equation has distinct roots ${math`\alpha \ne \beta`}. Then every solution of ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`} is ${math`u_{n} = A\alpha^{n} + B\beta^{n}`}, for constants ${math`A, B`} fixed by ${math`u_{${0}}`} and ${math`u_{${1}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Each root gives a solution`, text: t`If ${math`\alpha^{${2}} = a\alpha + b`}, multiply by ${math`\alpha^{n - ${1}}`}: ${math`\alpha^{n + ${1}} = a\alpha^{n} + b\alpha^{n - ${1}}`}. So ${math`\alpha^{n}`} is a solution, and so is ${math`\beta^{n}`}.` },
        { label: t`Combinations are solutions`, text: t`The recurrence is linear: if ${math`x_{n}`} and ${math`y_{n}`} solve it, so does ${math`Ax_{n} + By_{n}`}, by adding ${mathA} times the first equation to ${mathB} times the second.` },
        { label: t`Match the start`, text: t`We need ${math`A + B = u_{${0}}`} and ${math`A\alpha + B\beta = u_{${1}}`}. Subtract ${math`\alpha`} times the first from the second:`, eq: [dmath`B(\beta - \alpha) = u_{${1}} - \alpha u_{${0}},`], plain: t`and ${math`\beta - \alpha \ne ${0}`}, so ${mathB} is determined, and then ${math`A = u_{${0}} - B`}.` },
        { label: t`Two values fix the rest`, text: t`The recurrence computes ${math`u_{${2}}, u_{${3}}, \ldots`} from ${math`u_{${0}}, u_{${1}}`} one at a time. Two solutions that agree at ${math`n = ${0}`} and ${math`n = ${1}`} therefore agree everywhere, by induction. So ${math`u_{n} = A\alpha^{n} + B\beta^{n}`} for all ${mn}.` },
      ],
    },
    {
      kind: 'steps',
      steps: [
        { label: t`The hook, solved`, text: t`Roots ${2} and ${3}, so ${math`u_{n} = A \cdot ${2}^{n} + B \cdot ${3}^{n}`}.` },
        { label: t`Fit the start`, text: t`${math`u_{${0}} = A + B = ${2}`} and ${math`u_{${1}} = ${2}A + ${3}B = ${5}`}. Subtract twice the first from the second: ${math`B = ${1}`}, then ${math`A = ${1}`}.` },
        { label: t`The twentieth term`, text: t`${math`u_{n} = ${2}^{n} + ${3}^{n}`}, so ${math`u_{${20}} = ${2}^{${20}} + ${3}^{${20}} = ${H20}`}.` },
      ],
    },
    { kind: 'p', text: t`When the roots coincide, ${math`\alpha = \beta`}, the formula has only one constant and cannot fit two starting values. The fix: ${math`n\alpha^{n}`} is then a second solution, and ${math`u_{n} = (A + Bn)\alpha^{n}`}.`, why: { q: t`Why is ${math`n\alpha^{n}`} a solution for a double root?`, a: t`A double root means ${math`\lambda^{${2}} - a\lambda - b = (\lambda - \alpha)^{${2}}`}, so ${math`a = ${2}\alpha`} and ${math`b = -\alpha^{${2}}`}. Then ${math`a\,n\alpha^{n} + b(n - ${1})\alpha^{n - ${1}} = ${2}n\alpha^{n + ${1}} - (n - ${1})\alpha^{n + ${1}} = (n + ${1})\alpha^{n + ${1}}`}.` } },
    checkFrom(secondOrder, { al: 3, be: -1, u0: 2, u1: 2 }, t`Roots ${3} and ${math`-${1}`}: ${math`A + B = ${2}`} and ${math`${3}A - B = ${2}`} give ${math`A = B = ${1}`}.`),

    { kind: 'section', title: t`A constant term` },
    { kind: 'narrative', text: t`With a constant ${math`c`}, the method has two parts. Find any one particular solution of the full equation, then add the general solution of the homogeneous equation (with ${math`c = ${0}`}). The difference of two solutions solves the homogeneous one, so this catches every solution.` },
    { kind: 'p', text: t`Try a constant first. That fails exactly when ${1} is a root of the auxiliary equation, since then constants solve the homogeneous equation. Then try ${math`Cn`}, and if ${1} is a double root, ${math`Cn^{${2}}`}. Fit ${mathA} and ${mathB} to the starting values last, after adding the particular solution.` },
    { kind: 'p', text: t`The frog of STEP ${3} Statistics question ${1} is of this kind: ${math`u_{n} = ${1} + pu_{n - ${1}} + qu_{n - ${2}}`} with ${math`p + q = ${1}`}. Its auxiliary equation has roots ${1} and ${math`-q`}, so the particular solution is ${math`Cn`}, which is why the question offers the form ${math`A(-q)^{n - ${1}} + B + Cn`}.` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`u_{n + ${1}} = au_{n} + c`} has solution ${math`u_{n} = u_{${0}}a^{n} + k`}.`, counterexample: t`For ${math`u_{n + ${1}} = ${3}u_{n} - ${4}`} with ${math`u_{${0}} = ${5}`}: ${math`u_{${1}} = ${11}`}, but ${math`${5} \times ${3} + ${2} = ${17}`}. The geometric part starts from ${math`u_{${0}} - k = ${3}`}, not ${math`u_{${0}}`}.` },
    { kind: 'pitfall', claim: t`With a double root ${math`\alpha`}, ${math`u_{n} = A\alpha^{n} + B\alpha^{n}`}.`, counterexample: t`That is just ${math`(A + B)\alpha^{n}`}, one constant. For ${math`u_{n + ${1}} = ${4}u_{n} - ${4}u_{n - ${1}}`} with ${math`u_{${0}} = ${1}`}, ${math`u_{${1}} = ${4}`}, no ${math`C \cdot ${2}^{n}`} fits both; ${math`(${1} + n)${2}^{n}`} does.` },
    { kind: 'pitfall', claim: t`Fit the constants to the starting values, then add the particular solution.`, counterexample: t`Adding the particular solution afterwards changes ${math`u_{${0}}`} and ${math`u_{${1}}`}, so they no longer match. Add it first, then fit.` },
    { kind: 'takeaway', text: t`Guess ${math`\lambda^{n}`}: the roots of the auxiliary equation give the general solution, a particular solution handles a constant, and the starting values fix the constants last.` },
  ],
  examples: [
    { ...workedCambridge(q11), examiner: t`The examiner looks for the fixed point found first, the geometric part fitted to ${math`u_{${0}} = ${0}`}, and the answer checked at ${math`n = ${1}`}.` },
    worked(firstOrder, { a: 3, b: -4, c: 5 }, t`A first-order equation`),
    worked(secondOrder, { al: 2, be: -1, u0: 1, u1: 5 }, t`Two distinct roots`),
  ],
  generators: [firstOrder, secondOrder, repeatedRoot],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['difference-equation', 'auxiliary-equation'],
  cambridge: withUses([frog, slotLimit, frogExplain, slotDerive, theory], {
    's3-q1-iii-closed-form': { sections: ['A constant term'], note: t`Fitting a closed form with a constant term` },
    's3-q1-iii-explain': { sections: ['A constant term'], note: t`Reading off the growth and explaining it by the mean jump`, needs: ['rv.expectation'] },
    'sheet3-q11-derive': { sections: ['First order'], note: t`Deriving a recurrence by conditioning on the last turn`, needs: ['prob.total-probability'] },
  }),
  // The STEP frog first. The slot machine's limit is dropped: the worked example's closed form gives it at once.
  gate: ['s3-q1-iii-closed-form', 's3-q1-iii-explain', 'sheet3-q11-derive'],
  recall: [
    { front: t`Solve ${math`u_{n + ${1}} = au_{n} + c`}, for ${math`a \ne ${1}`}.`, back: t`${math`u_{n} = (u_{${0}} - k)a^{n} + k`} with ${math`k = c/(${1} - a)`}.` },
    { front: t`The auxiliary equation of ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`}, and the solution.`, back: t`${math`\lambda^{${2}} = a\lambda + b`}; ${math`A\alpha^{n} + B\beta^{n}`} for distinct roots, ${math`(A + Bn)\alpha^{n}`} for a double root.` },
    { front: t`Which particular solution for a constant term?`, back: t`A constant; ${math`Cn`} if ${1} is a root of the auxiliary equation; ${math`Cn^{${2}}`} if it is a double root.` },
  ],
  proofOrder: [{
    title: t`Every solution is ${math`A\alpha^{n} + B\beta^{n}`}`,
    steps: [
      t`Each root ${math`\alpha`} makes ${math`\alpha^{n}`} a solution.`,
      t`Linearity: any ${math`A\alpha^{n} + B\beta^{n}`} is a solution.`,
      t`Since ${math`\alpha \ne \beta`}, ${mathA} and ${mathB} can match ${math`u_{${0}}`} and ${math`u_{${1}}`}.`,
      t`Two starting values determine the sequence, so it is this one.`,
    ],
  }],
};
