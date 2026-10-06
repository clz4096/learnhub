/**
 * alg.linear-recurrences: linear difference equations, u_(n+1) = a u_n + b and
 * u_(n+1) = a u_n + b u_(n-1), solved from the auxiliary equation, with a particular solution
 * for a constant term. From IA Probability Example Sheet 3 Q11 (the slot machine,
 * u_n + (1/2 - p) u_(n-1) = 1/2, whose answer the sheet states) and STEP 3 Statistics Q1(iii)
 * (2007 S3 Q13: the frog, u_n = A(-q)^(n-1) + B + Cn), and the IA schedule ("Difference
 * equations and their solution"). Answers are checked against the recurrences iterated
 * exactly and against listing every case, and compared with the stated and official answers.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, paren, t, texOfRational } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
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

export const linearRecurrences: TopicContent = {
  topicId: 'alg.linear-recurrences',
  goal: t`Solve ${math`u_{n + ${1}} = au_{n} + b`} and ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`} from the auxiliary equation, with a particular solution for a constant term.`,
  lesson: [
    { kind: 'p', text: t`A [[difference-equation|difference equation]] gives each term of a sequence from earlier ones. First-step analysis produces them: a probability or an expected time from one state is written in terms of those from neighbouring states.` },
    { kind: 'rule', text: t`First order: ${math`u_{n + ${1}} = au_{n} + b`} with ${math`a \ne ${1}`} has the fixed point ${math`k = \frac{b}{${1} - a}`}, and ${math`u_{n} = (u_{${0}} - k)a^{n} + k`}.` },
    { kind: 'p', text: t`Why: ${math`v_{n} = u_{n} - k`} satisfies ${math`v_{n + ${1}} = av_{n}`}, since the constants cancel. Example Sheet ${3} Q${11} is of this kind: ${math`u_{n} = \frac{${1}}{${2}} - \left(\frac{${1}}{${2}} - p\right)u_{n - ${1}}`} gives ${math`u_{n} = \frac{${1} + (-${1})^{n - ${1}}\left(\frac{${1}}{${2}} - p\right)^{n}}{${3} - ${2}p}`}.` },
    { kind: 'rule', text: t`Second order: for ${math`u_{n + ${1}} = au_{n} + bu_{n - ${1}}`}, try ${math`u_{n} = \lambda^{n}`}. The [[auxiliary-equation|auxiliary equation]] ${math`\lambda^{${2}} = a\lambda + b`} has roots ${math`\alpha`}, ${math`\beta`}. If they differ, ${math`u_{n} = A\alpha^{n} + B\beta^{n}`}; if ${math`\alpha = \beta`}, ${math`u_{n} = (A + Bn)\alpha^{n}`}. Two starting values fix ${math`A`} and ${math`B`}.` },
    { kind: 'p', text: t`A constant term needs a particular solution added: a constant if ${1} is not a root of the auxiliary equation, ${math`Cn`} if it is a simple root, ${math`Cn^{${2}}`} if it is a double root. The frog of STEP ${3} Statistics Q${1} has ${math`u_{n} = ${1} + pu_{n - ${1}} + qu_{n - ${2}}`}, with roots ${1} and ${math`-q`}, so ${math`u_{n} = A(-q)^{n - ${1}} + B + Cn`}, and ${math`C = \frac{${1}}{${1} + q}`}.` },
  ],
  examples: [
    workedCambridge(q11),
    worked(firstOrder, { a: 3, b: -4, c: 5 }, t`A first-order equation`),
    worked(secondOrder, { al: 2, be: -1, u0: 1, u1: 5 }, t`Two distinct roots`),
  ],
  generators: [firstOrder, secondOrder, repeatedRoot],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['difference-equation', 'auxiliary-equation'],
  cambridge: [frog, slotLimit, frogExplain, slotDerive, theory],
  gate: ['s3-q1-iii-closed-form', 'sheet3-q11-long-run', 's3-q1-iii-explain', 'sheet3-q11-derive'],
};
