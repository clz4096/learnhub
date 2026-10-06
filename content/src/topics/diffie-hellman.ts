/**
 * num.diffie-hellman: two people agree a secret [c^(ab)]_p over an open channel, each
 * sending only a power of c; its safety rests on discrete logarithms being hard. The
 * lesson follows the CST notes (printed pages 259 to 264: the Diffie-Hellman diagram with
 * public c and p, α = [c^a]_p and β = [c^b]_p, k = [β^a]_p = [α^b]_p; key exchange by
 * modular exponentiation with d e ≡ 1 (mod p - 1), Lemma 94 and its proof from Fermat's
 * little theorem; the three-message exchange; RSA, Lemma 95, as an aside). The notes give
 * no numbers; the numerical problems here are adapted to small primes.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { egcd, gcd, inverseBySearch, mod, powMod, powModSlow } from '../numbers';
import { generator, type Misconception } from '../problem';
import { math, paren, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [ma, mb, mc, mp] = [math`a`, math`b`, math`c`, math`p`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));
const PRIMES = [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107];
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- the shared key

interface KeyP { p: number; c: number; a: number; b: number }
const keyMis = ({ p, c, a, b }: KeyP): string[] => [String(powMod(c, a + b, p)), String((powMod(c, a, p) * powMod(c, b, p)) % p), String(powMod(powMod(c, a, p), a, p))];

const sharedKey = generator<KeyP>({
  id: 'shared-key',
  skill: 'Run the Diffie-Hellman exchange: compute the public values [c^a]_p and [c^b]_p, then the shared key [β^a]_p = [α^b]_p.',
  params: (rng) => {
    for (;;) {
      const p = pick(rng, PRIMES);
      const P: KeyP = { p, c: int(rng, 2, p - 2), a: int(rng, 2, 15), b: int(rng, 2, 15) };
      if (P.a !== P.b && distinctFrom(String(powMod(P.c, P.a * P.b, p)), keyMis(P)) >= 2) return P;
    }
  },
  sane: ({ p, c }) => (c >= 2 && c <= p - 2 ? null : 'out of range'),
  problem: ({ p, c, a, b }) => {
    const [al, be] = [powMod(c, a, p), powMod(c, b, p)];
    const k = powMod(be, a, p);
    return {
      prompt: t`Alice and Bob agree in public on ${math`p = ${p}`} and ${math`c = ${c}`}. Alice chooses the secret ${math`a = ${a}`} and sends ${math`\alpha = [c^{a}]_{p}`}; Bob chooses the secret ${math`b = ${b}`} and sends ${math`\beta = [c^{b}]_{p}`}. What key ${math`k`} do they share?`,
      answer: { kind: 'exact', expected: String(k) },
      solution: [
        t`${math`\alpha = [${c}^{${a}}]_{${p}} = ${al}`} and ${math`\beta = [${c}^{${b}}]_{${p}} = ${be}`}, by repeated squaring.`,
        t`Alice computes ${math`[\beta^{a}]_{p} = [${be}^{${a}}]_{${p}} = ${k}`}; Bob computes ${math`[\alpha^{b}]_{p} = [${al}^{${b}}]_{${p}} = ${powMod(al, b, p)}`}. Both are ${math`[c^{ab}]_{p}`}, since ${math`(c^{b})^{a} = c^{ab} = (c^{a})^{b}`}.`,
      ],
    };
  },
  solve: ({ p, c, a, b }) => String(powModSlow(c, a * b, p)),
  misconceptions: ({ p, c, a, b }): Misconception[] => [
    { response: String(powMod(c, a + b, p)), why: t`The key is ${math`c^{ab}`}, not ${math`c^{a + b}`}: Alice raises Bob's ${math`\beta = c^{b}`} to the power ${ma}.` },
    { response: String((powMod(c, a, p) * powMod(c, b, p)) % p), why: t`Multiplying ${math`\alpha \beta`} gives ${math`c^{a + b}`}, which an eavesdropper could compute too. Each raises the other's value to their own secret.` },
    { response: String(powMod(powMod(c, a, p), a, p)), why: t`Alice raises Bob's value ${math`\beta`} to her secret, not her own ${math`\alpha`}.` },
  ],
});

// ---------------------------------------------------------------- the eavesdropper's problem

interface LogP { p: number; c: number; a: number }

const discreteLog = generator<LogP>({
  id: 'discrete-log',
  skill: 'Find a discrete logarithm by search: the a with [c^a]_p equal to a given value, which is what an eavesdropper must do.',
  params: (rng) => {
    for (;;) {
      const p = pick(rng, [23, 29, 31, 37, 41, 43, 47]);
      const c = int(rng, 2, p - 2);
      const a = int(rng, 2, p - 2);
      const al = powMod(c, a, p);
      if (al !== 1 && al !== c && powMod(c, al, p) !== al) return { p, c, a };
    }
  },
  sane: ({ p, c, a }) => (powMod(c, a, p) !== 1 ? null : 'out of range'),
  problem: ({ p, c, a }) => {
    const al = powMod(c, a, p);
    const first = upTo(p - 1).find((x) => powMod(c, x, p) === al) as number;
    return {
      prompt: t`Eve sees ${math`p = ${p}`}, ${math`c = ${c}`}, and Alice's ${math`\alpha = ${al}`}. Find an exponent ${ma} with ${math`[${c}^{a}]_{${p}} = ${al}`}.`,
      answer: {
        kind: 'witness', count: 1, names: ['a'], example: `a = ${first}`,
        check: ([v]) => {
          const x = big(v);
          if (x === null || x < 0) return 'Give a natural number.';
          return powMod(c, x, p) === al ? null : `${c}^${x} mod ${p} is ${powMod(c, x, p)}, not ${al}.`;
        },
      },
      solution: [
        t`There is no shortcut known in general: list ${math`[${c}^{${1}}]_{${p}}, [${c}^{${2}}]_{${p}}, \ldots`}, each the previous times ${c}, reduced.`,
        t`The first power that gives ${al} is ${math`a = ${first}`}. For a prime of hundreds of digits this search is hopeless, which is what keeps the key safe.`,
      ],
    };
  },
  solve: ({ p, c, a }) => `a = ${upTo(p - 1).find((x) => powModSlow(c, x, p) === powMod(c, a, p))}`,
  misconceptions: ({ p, c, a }): Misconception[] => {
    const al = powMod(c, a, p);
    return [
      { response: `a = ${al}`, why: t`${al} is the value ${math`\alpha`}, not its exponent: ${math`[${c}^{${al}}]_{${p}} = ${powMod(c, al, p)}`}.` },
      { response: 'a = 1', why: t`${math`[${c}^{${1}}]_{${p}} = ${c}`}. Keep multiplying by ${c} until you reach ${al}.` },
      { response: 'a = 0', why: t`${math`${c}^{${0}} = ${1}`}, not ${al}.` },
    ];
  },
});

// ---------------------------------------------------------------- the decryption exponent

interface DecP { p: number; e: number }

const decryptionExponent = generator<DecP>({
  id: 'decryption-exponent',
  skill: 'Find the decryption exponent of Lemma 94: d with d e ≡ 1 (mod p - 1), so that (k^e)^d ≡ k (mod p).',
  params: (rng) => {
    for (;;) {
      const p = pick(rng, PRIMES);
      const e = int(rng, 3, p - 2);
      const d = inverseBySearch(e, p - 1);
      if (d !== null && d !== e && d !== inverseBySearch(e, p)) return { p, e };
    }
  },
  sane: ({ p, e }) => (gcd(e, p - 1) === 1 ? null : 'out of range'),
  problem: ({ p, e }) => {
    const { s, t: tt } = egcd(p - 1, e);
    const d = mod(tt, p - 1);
    return {
      prompt: t`With ${math`p = ${p}`} and the encryption exponent ${math`e = ${e}`}, where ${math`\gcd(p - ${1}, e) = ${1}`}, find the decryption exponent ${math`d`} of Lemma ${94}: ${math`${0} < d < p - ${1}`} and ${math`(k^{e})^{d} \equiv k \pmod{p}`} for every ${math`k`}.`,
      answer: { kind: 'exact', expected: String(d) },
      solution: [
        t`Lemma ${94}: ${math`d = [\mathrm{lc}_{${2}}(p - ${1}, e)]_{p - ${1}}`}, the inverse of ${math`e`} modulo ${math`p - ${1}`}. The extended algorithm gives ${math`${s} \times ${p - 1} + ${paren(tt)} \times ${e} = ${1}`}, so ${math`d = [${tt}]_{${p - 1}} = ${d}`}.`,
        t`Why it works: ${math`ed = ${1} + c(p - ${1})`}, so ${math`k^{ed} = k \cdot (k^{p - ${1}})^{c} \equiv k`} by Fermat's little theorem (and trivially when ${math`p \mid k`}).`,
      ],
    };
  },
  solve: ({ p, e }) => String(upTo(p - 2).find((d) => upTo(p).every((k) => powModSlow(powModSlow(k - 1, e, p), d, p) === k - 1))),
  misconceptions: ({ p, e }): Misconception[] => [
    { response: String(inverseBySearch(e, p)), why: t`The inverse is taken modulo ${math`p - ${1}`}, not ${mp}: exponents work modulo ${math`p - ${1}`} by Fermat's little theorem.` },
    { response: String(e), why: t`Raising to the power ${math`e`} twice gives ${math`k^{e^{${2}}}`}, which is not ${math`k`} in general. Find ${math`d`} with ${math`ed \equiv ${1} \pmod{p - ${1}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const [P0, C0, A0, B0] = [23, 5, 6, 15];
const notesDH = auto({
  id: 'notes-260-dh-example',
  source: cite('cst-dm-notes', 'printed pages 259 and 260, the Diffie-Hellman method', true),
  title: t`The notes' diagram, with numbers`,
  prompt: t`In the notes' diagram the public values are ${mc} and ${mp}; A keeps ${ma} and sends ${math`\alpha = [c^{a}]_{p}`}, B keeps ${mb} and sends ${math`\beta = [c^{b}]_{p}`}, and both compute ${math`k`}. Take ${math`p = ${P0}`}, ${math`c = ${C0}`}, ${math`a = ${A0}`}, ${math`b = ${B0}`}. Give ${math`\alpha`}, ${math`\beta`}, and ${math`k`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`value`, t`number`], rows: [[t`${math`\alpha`}`, null], [t`${math`\beta`}`, null], [t`${math`k`}`, null]], expected: [String(powMod(C0, A0, P0)), String(powMod(C0, B0, P0)), String(powMod(C0, A0 * B0, P0))] },
  solution: [
    t`${math`\alpha = [${C0}^{${A0}}]_{${P0}} = ${powMod(C0, A0, P0)}`} and ${math`\beta = [${C0}^{${B0}}]_{${P0}} = ${powMod(C0, B0, P0)}`}.`,
    t`A computes ${math`[\beta^{a}]_{p} = [${powMod(C0, B0, P0)}^{${A0}}]_{${P0}} = ${powMod(powMod(C0, B0, P0), A0, P0)}`} and B computes ${math`[\alpha^{b}]_{p} = [${powMod(C0, A0, P0)}^{${B0}}]_{${P0}} = ${powMod(powMod(C0, A0, P0), B0, P0)}`}: the same ${math`k`}.`,
  ],
  reference: [String(powMod(C0, A0, P0)), String(powMod(C0, B0, P0)), String(powMod(C0, A0 * B0, P0))],
  verify: () => same('both sides by slow powers', [powModSlow(C0, A0, P0), powModSlow(C0, B0, P0), powModSlow(powModSlow(C0, B0, P0), A0, P0), powModSlow(powModSlow(C0, A0, P0), B0, P0)].join(), '8,19,2,2'),
  misconceptions: [{ response: ['8', '19', String((8 * 19) % 23)], why: t`${math`\alpha\beta`} is ${math`c^{a + b}`}, which Eve could compute from what she sees. The key is ${math`c^{ab}`}.` }],
});

const [PL, EL] = [23, 5];
const DL = inverseBySearch(EL, PL - 1) as number;
const lemma94 = auto({
  id: 'notes-263-lemma-94',
  source: cite('cst-dm-notes', 'printed page 263, Lemma 94', true),
  title: t`Lemma ${94} with numbers`,
  prompt: t`Lemma ${94}: for a prime ${mp} and ${math`e`} with ${math`\gcd(p - ${1}, e) = ${1}`}, let ${math`d = [\mathrm{lc}_{${2}}(p - ${1}, e)]_{p - ${1}}`}; then ${math`(k^{e})^{d} \equiv k \pmod{p}`}. For ${math`p = ${PL}`} and ${math`e = ${EL}`}, find ${math`d`}.`,
  answer: { kind: 'exact', expected: String(DL) },
  solution: [
    t`${math`\mathrm{egcd}(${PL - 1}, ${EL})`}: ${math`${egcd(PL - 1, EL).s} \times ${PL - 1} + ${paren(egcd(PL - 1, EL).t)} \times ${EL} = ${1}`}, so ${math`d = [${egcd(PL - 1, EL).t}]_{${PL - 1}} = ${DL}`}.`,
    t`Check: ${math`${EL} \times ${DL} = ${EL * DL} = ${(EL * DL - 1) / (PL - 1)} \times ${PL - 1} + ${1}`}.`,
  ],
  reference: String(DL),
  verify: () => same('(k^5)^d = k for every k mod 23', upTo(PL).every((k) => powModSlow(powModSlow(k - 1, EL, PL), DL, PL) === k - 1), true),
  misconceptions: [{ response: String(inverseBySearch(EL, PL)), why: t`That is the inverse of ${EL} modulo ${PL}. Exponents are taken modulo ${math`p - ${1} = ${PL - 1}`}.` }],
});

const [EA, EB, KEY] = [5, 7, 10];
const [DA, DB] = [inverseBySearch(EA, PL - 1) as number, inverseBySearch(EB, PL - 1) as number];
const m1 = powMod(KEY, EA, PL);
const m2 = powMod(m1, EB, PL);
const m3 = powMod(m2, DA, PL);
const threePass = auto({
  id: 'notes-265-key-exchange',
  source: cite('cst-dm-notes', 'printed page 265, the key exchange diagram', true),
  title: t`Sending a key in three messages`,
  prompt: t`The notes' key exchange with ${math`p = ${PL}`}: A has exponents ${math`(e_{A}, d_{A}) = (${EA}, ${DA})`}, B has ${math`(e_{B}, d_{B}) = (${EB}, ${DB})`}, each pair with ${math`ed \equiv ${1} \pmod{${PL - 1}}`}. A's key is ${math`k = ${KEY}`}. A sends ${math`m_{${1}} = [k^{e_{A}}]_{p}`}, B returns ${math`m_{${2}} = [m_{${1}}^{e_{B}}]_{p}`}, A sends ${math`m_{${3}} = [m_{${2}}^{d_{A}}]_{p}`}, and B computes ${math`[m_{${3}}^{d_{B}}]_{p}`}. Give the four numbers.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`step`, t`value`], rows: [[t`${math`m_{${1}}`}`, null], [t`${math`m_{${2}}`}`, null], [t`${math`m_{${3}}`}`, null], [t`B's result`, null]], expected: [String(m1), String(m2), String(m3), String(powMod(m3, DB, PL))] },
  solution: [
    t`${math`m_{${1}} = [${KEY}^{${EA}}]_{${PL}} = ${m1}`}, ${math`m_{${2}} = [${m1}^{${EB}}]_{${PL}} = ${m2}`}, ${math`m_{${3}} = [${m2}^{${DA}}]_{${PL}} = ${m3}`}.`,
    t`${math`m_{${3}} \equiv k^{e_{A} e_{B} d_{A}} \equiv k^{e_{B}}`}, since ${math`e_{A}d_{A} \equiv ${1} \pmod{${PL - 1}}`}; so B's ${math`[m_{${3}}^{d_{B}}]_{${PL}} = ${powMod(m3, DB, PL)}`} is the key. No secret exponent ever crossed the channel.`,
  ],
  reference: [String(m1), String(m2), String(m3), String(powMod(m3, DB, PL))],
  verify: () => same('B recovers the key, by slow powers', powModSlow(powModSlow(powModSlow(powModSlow(KEY, EA, PL), EB, PL), DA, PL), DB, PL), KEY),
  misconceptions: [{ response: [String(m1), String(m2), String(m3), String(m3)], why: t`B must still remove its own lock: raise ${math`m_{${3}}`} to ${math`d_{B} = ${DB}`}.` }],
});

const lemma94proof = supervision({
  id: 'notes-264-lemma-94-proof',
  source: cite('cst-dm-notes', 'printed pages 263 and 264, Lemma 94'),
  title: t`Why decryption undoes encryption`,
  prompt: t`Prove Lemma ${94}: if ${mp} is prime, ${math`\gcd(p - ${1}, e) = ${1}`}, and ${math`d = [\mathrm{lc}_{${2}}(p - ${1}, e)]_{p - ${1}}`}, then ${math`(k^{e})^{d} \equiv k \pmod{p}`} for all integers ${math`k`}. Treat the case ${math`p \mid k`} separately, and say where Fermat's little theorem enters.`,
  writeUp: 'proof',
});
const safety = supervision({
  id: 'notes-261-safety',
  source: cite('cst-dm-notes', 'printed pages 259 to 261, the Diffie-Hellman method'),
  title: t`What an eavesdropper sees`,
  prompt: t`An eavesdropper sees ${mc}, ${mp}, ${math`\alpha = [c^{a}]_{p}`}, and ${math`\beta = [c^{b}]_{p}`}. Explain why she cannot simply compute ${math`k = [c^{ab}]_{p}`} from them, what problem she would have to solve (the discrete logarithm), and why Alice's and Bob's own work stays fast even for a prime with hundreds of digits.`,
  writeUp: 'explanation',
});
const rsa = supervision({
  id: 'notes-266-rsa',
  source: cite('cst-dm-notes', 'printed page 266, Lemma 95'),
  title: t`The RSA aside`,
  prompt: t`Lemma ${95}: for distinct primes ${mp}, ${math`q`} and ${math`ed \equiv ${1} \pmod{(p - ${1})(q - ${1})}`}, ${math`(k^{e})^{d} \equiv k \pmod{pq}`} for all integers ${math`k`}. Prove it from Lemma ${94}'s argument applied modulo ${mp} and modulo ${math`q`}, and the fact that ${mp} and ${math`q`} are coprime.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const diffieHellman: TopicContent = {
  topicId: 'num.diffie-hellman',
  goal: t`Agree a shared secret ${math`[c^{ab}]_{p}`} over an open channel by the Diffie-Hellman method, and explain why its safety rests on discrete logarithms being hard.`,
  lesson: [
    { kind: 'p', text: t`Two people who have never met want a common secret key, but everything they send can be read. The notes' answer is the [[diffie-hellman|Diffie-Hellman method]], built from modular powers.` },
    { kind: 'rule', text: t`In public, agree a prime ${mp} and a number ${mc}. A picks a secret ${ma} and sends ${math`\alpha = [c^{a}]_{p}`}; B picks a secret ${mb} and sends ${math`\beta = [c^{b}]_{p}`}. Then A computes ${math`[\beta^{a}]_{p}`} and B computes ${math`[\alpha^{b}]_{p}`}: both are ${math`k = [c^{ab}]_{p}`}.` },
    { kind: 'p', text: t`With ${math`p = ${P0}`}, ${math`c = ${C0}`}, ${math`a = ${A0}`}, ${math`b = ${B0}`}: ${math`\alpha = ${powMod(C0, A0, P0)}`}, ${math`\beta = ${powMod(C0, B0, P0)}`}, and ${math`k = [${powMod(C0, B0, P0)}^{${A0}}]_{${P0}} = [${powMod(C0, A0, P0)}^{${B0}}]_{${P0}} = ${powMod(C0, A0 * B0, P0)}`}. Every step is a modular power, fast by repeated squaring.` },
    { kind: 'p', text: t`An eavesdropper knows ${mc}, ${mp}, ${math`\alpha`}, and ${math`\beta`}. Multiplying gives only ${math`c^{a + b}`}. To get ${math`c^{ab}`} she seems to need ${ma} from ${math`\alpha`}: a [[discrete-logarithm|discrete logarithm]]. For a prime of hundreds of digits no fast method is known, while the honest parties' work is a few thousand multiplications.` },
    { kind: 'p', text: t`The notes also send a key ${math`k`} directly, with exponents that undo each other: Lemma ${94} says that if ${math`ed \equiv ${1} \pmod{p - ${1}}`} then ${math`(k^{e})^{d} \equiv k \pmod{p}`}, by Fermat's little theorem. A locks with ${math`e_{A}`}, B adds a second lock ${math`e_{B}`}, A removes hers with ${math`d_{A}`}, and B removes his: powers commute, so the order of locks does not matter.` },
  ],
  examples: [
    workedCambridge(notesDH),
    worked(sharedKey, { p: 47, c: 5, a: 9, b: 14 }, t`A shared key modulo ${47}`),
    worked(decryptionExponent, { p: 29, e: 9 }, t`Undoing the power ${9} modulo ${29}`),
  ],
  generators: [sharedKey, discreteLog, decryptionExponent],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['diffie-hellman', 'discrete-logarithm'],
  cambridge: [lemma94, threePass, lemma94proof, safety, rsa],
  gate: ['notes-263-lemma-94', 'notes-265-key-exchange', 'notes-264-lemma-94-proof', 'notes-261-safety', 'notes-266-rsa'],
};
