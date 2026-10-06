/**
 * num.modular-inverse: [n]_m has a multiplicative inverse in Z_m exactly when
 * gcd(m, n) = 1, and the extended Euclidean algorithm computes it. The lesson follows the
 * CST notes (printed page 244, Corollary 86: Z_p is a field, with inverse i^(p - 2); page
 * 258, Corollary 93 and its Remark) and the 2023-24 official solutions to supervision
 * exercises 2.2.6 (inverse tables), 3.2.10 (solving congruences), 3.2.11 (inverses of 2 in
 * Z_7, 7 in Z_40, and 13 in Z_23), and 3.2.12 (the inverse of [22^12001]_175).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { egcd, factorise, gcd, inverseBySearch, mod, phi, powMod, primesTo } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, paren, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const mm = math`m`;
const Z = (m: number | Span): Span => math`\mathbb{Z}_{${m}}`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- an inverse

interface InvP { a: number; m: number }
const invMis = ({ a, m }: InvP): string[] => [String(m - a), String(egcd(m, a).t), String(powMod(a, m - 2, m))];

const inverseMod = generator<InvP>({
  id: 'inverse-mod',
  skill: 'Find the inverse of a in Z_m with the extended Euclidean algorithm: the coefficient of a in 1 = s m + t a, reduced mod m.',
  params: (rng) => {
    for (;;) {
      const p: InvP = { m: int(rng, 7, 60), a: 0 };
      p.a = int(rng, 2, p.m - 2);
      const inv = inverseBySearch(p.a, p.m);
      if (inv !== null && inv !== p.a && distinctFrom(String(inv), invMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, m }) => (gcd(a, m) === 1 && a >= 2 ? null : 'out of range'),
  problem: ({ a, m }) => {
    const { s, t: tt } = egcd(m, a);
    const inv = mod(tt, m);
    return {
      prompt: t`Find the multiplicative inverse of ${a} in ${Z(m)}.`,
      answer: { kind: 'exact', expected: String(inv) },
      solution: [
        t`${math`\gcd(${m}, ${a}) = ${1}`}, so an inverse exists. The extended algorithm gives ${math`${s} \times ${m} + ${paren(tt)} \times ${a} = ${1}`}.`,
        t`Reading this mod ${m}: ${math`${a} \times ${paren(tt)} \equiv ${1}`}, so the inverse is ${math`[${tt}]_{${m}} = ${inv}`}. Check: ${math`${a} \times ${inv} = ${a * inv} = ${Math.floor((a * inv) / m)} \times ${m} + ${1}`}.`,
      ],
    };
  },
  solve: ({ a, m }) => String(inverseBySearch(a, m)),
  misconceptions: ({ a, m }): Misconception[] => [
    { response: String(m - a), why: t`${m - a} is the additive inverse: ${math`${a} + ${m - a} = ${m} \equiv ${0}`}. The multiplicative inverse gives a product ${math`\equiv ${1}`}.` },
    { response: String(egcd(m, a).t), why: t`That coefficient is right modulo ${m}, but an element of ${Z(m)} is between ${0} and ${m - 1}: reduce it.` },
    { response: String(powMod(a, m - 2, m)), why: t`${math`a^{p - ${2}}`} is the inverse only modulo a prime ${math`p`} (Corollary ${86}). ${m} is ${factorise(m).length === 1 && factorise(m)[0]?.[1] === 1 ? 'prime, so check your arithmetic' : 'not prime'}.` },
  ],
});

// ---------------------------------------------------------------- a linear congruence

interface LinP { a: number; b: number; m: number }
const linMis = ({ a, b, m }: LinP): string[] => [String(mod(a * b, m)), String(inverseBySearch(a, m)), String(mod(b - a, m))];

const solveCongruence = generator<LinP>({
  id: 'solve-congruence',
  skill: 'Solve a x ≡ b (mod m) when gcd(a, m) = 1: multiply both sides by the inverse of a.',
  params: (rng) => {
    for (;;) {
      const m = pick(rng, [7, 9, 11, 13, 17, 19, 20, 21, 23, 25, 26, 29, 31, 40, 41]);
      const p: LinP = { m, a: int(rng, 2, m - 1), b: int(rng, 2, m - 1) };
      if (gcd(p.a, m) !== 1) continue;
      const x = mod((inverseBySearch(p.a, m) as number) * p.b, m);
      if (distinctFrom(String(x), linMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, m }) => (gcd(a, m) === 1 ? null : 'out of range'),
  problem: ({ a, b, m }) => {
    const inv = inverseBySearch(a, m) as number;
    const x = mod(inv * b, m);
    return {
      prompt: t`Solve ${math`${a}x \equiv ${b} \pmod{${m}}`}: give the solution ${math`x`} with ${math`${0} \le x < ${m}`}.`,
      answer: { kind: 'exact', expected: String(x) },
      solution: [
        t`${math`\gcd(${a}, ${m}) = ${1}`}, so ${a} has an inverse mod ${m}: ${inv}, since ${math`${a} \times ${inv} = ${a * inv} \equiv ${1}`}.`,
        t`Multiply both sides by it: ${math`x \equiv ${inv} \times ${b} = ${inv * b} \equiv ${x} \pmod{${m}}`}. Check: ${math`${a} \times ${x} = ${a * x} \equiv ${b}`}. The solution is unique mod ${m}.`,
      ],
    };
  },
  solve: ({ a, b, m }) => String(upTo(m).map((x) => x - 1).find((x) => (a * x - b) % m === 0)),
  misconceptions: ({ a, b, m }): Misconception[] => [
    { response: String(mod(a * b, m)), why: t`Multiplying by ${a} again does not undo it. Multiply by the inverse of ${a}.` },
    { response: String(inverseBySearch(a, m)), why: t`That is the inverse of ${a}, the solution of ${math`${a}x \equiv ${1}`}. Multiply it by ${b}.` },
    { response: String(mod(b - a, m)), why: t`The ${a} multiplies ${math`x`}; it cannot be removed by subtracting.` },
  ],
});

// ---------------------------------------------------------------- how many elements have inverses

interface UnitP { m: number }
const radicalPhi = (m: number): number => factorise(m).reduce((p, [q]) => p * (q - 1), 1);
const unitMis = (m: number): string[] => [String(m - 1), String(primesTo(m - 1).length), String(radicalPhi(m))];

const countUnits = generator<UnitP>({
  id: 'count-units',
  skill: 'Count the elements of Z_m that have a multiplicative inverse: those coprime to m.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 8, 60);
      if (factorise(m).length === 1 && factorise(m)[0]?.[1] === 1) continue;
      if (distinctFrom(String(phi(m)), unitMis(m)) >= 2) return { m };
    }
  },
  sane: ({ m }) => (m >= 8 ? null : 'out of range'),
  problem: ({ m }) => {
    const units = upTo(m).map((x) => x - 1).filter((x) => gcd(x, m) === 1);
    return {
      prompt: t`How many elements of ${Z(m)} have a multiplicative inverse?`,
      answer: { kind: 'exact', expected: String(units.length) },
      solution: [
        t`${math`[n]_{${m}}`} has an inverse exactly when ${math`\gcd(${m}, n) = ${1}`} (the notes' Remark after Corollary ${93}).`,
        t`${math`${m} = ${computedTex(factorise(m).map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join(' \\times '))}`}, so an element has an inverse when it is divisible by none of ${listOf(factorise(m).map(([p]) => p))}. Counting the ${math`n`} from ${0} to ${m - 1}: there are ${units.length}.`,
      ],
    };
  },
  solve: ({ m }) => String(upTo(m).map((x) => x - 1).filter((x) => inverseBySearch(x, m) !== null).length),
  misconceptions: ({ m }): Misconception[] => [
    { response: String(m - 1), why: t`Every nonzero element has an inverse only when ${m} is prime. Elements sharing a factor with ${m} have none.` },
    { response: String(primesTo(m - 1).length), why: t`Being coprime to ${m} is not being prime: ${1} has an inverse, and so does any number with no prime factor in common with ${m}.` },
    { response: String(radicalPhi(m)), why: t`Each prime power ${math`p^{e}`} contributes ${math`p^{e - ${1}}(p - ${1})`} elements, not ${math`p - ${1}`}. Count them.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const S11: readonly [number, number][] = [[2, 7], [7, 40], [13, 23]];
const sheet3211 = auto({
  id: 'sheet-3-2-11',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.11'),
  title: t`Three inverses`,
  prompt: t`What is the multiplicative inverse of: (a) ${2} in ${Z(7)}, (b) ${7} in ${Z(40)}, and (c) ${13} in ${Z(23)}?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`element`, t`inverse`], rows: S11.map(([a, m]) => [t`${a} in ${Z(m)}`, null]), expected: S11.map(([a, m]) => String(inverseBySearch(a, m))) },
  solution: [
    t`As the official solution does, express ${1} as a combination (Corollary ${93}): ${math`${1} \times ${7} + (-${3}) \times ${2} = ${1}`}, so ${math`${2}^{-${1}} = [-${3}]_{${7}} = ${4}`}.`,
    t`${math`${3} \times ${40} + (-${17}) \times ${7} = ${1}`}, so ${math`${7}^{-${1}} = [-${17}]_{${40}} = ${23}`}; and ${math`${4} \times ${23} + (-${7}) \times ${13} = ${1}`}, so ${math`${13}^{-${1}} = [-${7}]_{${23}} = ${16}`}.`,
  ],
  reference: S11.map(([a, m]) => String(inverseBySearch(a, m))),
  verify: () => same('the extended algorithm', S11.map(([a, m]) => mod(egcd(m, a).t, m)).join(), '4,23,16'),
  misconceptions: [{ response: ['-3', '-17', '-7'], why: t`Those coefficients are right modulo ${mm}; reduce each to an element of ${Z(mm)}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.11'), answer: ['4', '23', '16'], agrees: true },
});

const sheet3210a = auto({
  id: 'sheet-3-2-10-a',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.10(a)'),
  title: t`${math`${77}x \equiv ${11} \pmod{${40}}`}`,
  prompt: t`Solve ${math`${77} \cdot x \equiv ${11} \pmod{${40}}`}: give the solution with ${math`${0} \le x < ${40}`}.`,
  answer: { kind: 'exact', expected: String(upTo(40).map((x) => x - 1).find((x) => (77 * x - 11) % 40 === 0)) },
  solution: [
    t`The official solution: since ${math`\gcd(${40}, ${11}) = ${1}`}, divide by ${11} (exercise ${3}.${2}.${4}): ${math`${7}x \equiv ${1} \pmod{${40}}`}. So ${math`x`} is the inverse of ${7}.`,
    t`${math`${40} \times ${3} + ${7} \times (-${17}) = ${1}`}, so ${math`x \equiv -${17} \equiv ${23} \pmod{${40}}`}.`,
  ],
  reference: '23',
  verify: () => same('every x from 0 to 39', upTo(40).map((x) => x - 1).filter((x) => (77 * x - 11) % 40 === 0).join(), '23'),
  misconceptions: [{ response: '17', why: t`The coefficient is ${math`-${17}`}, and ${math`[-${17}]_{${40}} = ${23}`}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(a)'), answer: '23', agrees: true },
});

const sheet3210b = auto({
  id: 'sheet-3-2-10-b',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.10(b)'),
  title: t`${math`${12}y \equiv ${30} \pmod{${54}}`}`,
  prompt: t`Solve ${math`${12} \cdot y \equiv ${30} \pmod{${54}}`}. Give the smallest solution ${math`y \ge ${0}`}, and how many solutions there are in ${Z(54)}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`quantity`, t`value`], rows: [[t`smallest solution`, null], [t`solutions in ${Z(54)}`, null]], expected: ['7', '6'] },
  solution: [
    t`${math`\gcd(${12}, ${54}) = ${6}`} divides ${30}, so divide through: ${math`${2}y \equiv ${5} \pmod{${9}}`}. The inverse of ${2} mod ${9} is ${5}, so ${math`y \equiv ${25} \equiv ${7} \pmod{${9}}`}.`,
    t`Modulo ${54} that is the ${6} classes ${math`${7}, ${16}, ${25}, ${34}, ${43}, ${52}`}: a congruence ${math`ax \equiv b \pmod{m}`} with ${math`\gcd(a, m) \mid b`} has ${math`\gcd(a, m)`} solutions in ${Z(mm)}.`,
  ],
  reference: ['7', '6'],
  verify: () => { const sols = upTo(54).map((y) => y - 1).filter((y) => (12 * y - 30) % 54 === 0); return same('every y from 0 to 53', `${sols[0]},${sols.length}`, '7,6'); },
  misconceptions: [{ response: ['7', '1'], why: t`Modulo ${54} the solution ${math`y \equiv ${7} \pmod{${9}}`} is ${6} classes: ${7}, ${16}, and so on.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(b)'), answer: ['7', '6'], agrees: true },
});

const zSys = upTo(357).find((z) => mod(z - 13, 21) === 0 && mod(3 * z - 2, 17) === 0) as number;
const sheet3210c = auto({
  id: 'sheet-3-2-10-c',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.10(c)'),
  title: t`A system of two congruences`,
  prompt: t`Solve the system ${math`${13} \equiv z \pmod{${21}}`} and ${math`${3} \cdot z \equiv ${2} \pmod{${17}}`}: give the smallest positive ${math`z`}.`,
  answer: { kind: 'exact', expected: String(zSys) },
  solution: [
    t`The first congruence: ${math`z = ${13} + ${21}k`}. The second: the inverse of ${3} mod ${17} is ${6}, so ${math`z \equiv ${12} \pmod{${17}}`}, ${math`z = ${12} + ${17}l`}.`,
    t`They meet when ${math`${21}(-k) + ${17}l = ${1}`}: ${math`${21} \times (-${4}) + ${17} \times ${5} = ${1}`}, so ${math`k = ${4}`} and ${math`z = ${13} + ${84} = ${97}`}. Every solution is ${math`${97} + ${357}i`}, as the official solution finds.`,
  ],
  reference: String(zSys),
  verify: () => same('the first z from 1 to 357 meeting both', zSys, 97),
  misconceptions: [{ response: '12', why: t`${12} solves the second congruence but ${math`${12} \not\equiv ${13} \pmod{${21}}`}. Both must hold.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(c)'), answer: '97', agrees: true },
});

const base3212 = powMod(22, 12001, 175);
const inv3212 = inverseBySearch(base3212, 175) as number;
const sheet3212 = auto({
  id: 'sheet-3-2-12-inverse',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.12', true),
  title: t`The inverse of ${math`[${22}^{${12001}}]_{${175}}`}`,
  prompt: t`Exercise ${3}.${2}.${12} asks you to prove that ${math`[${22}^{${12001}}]_{${175}}`} has a multiplicative inverse in ${Z(175)}. Go further: find it.`,
  answer: { kind: 'exact', expected: String(inv3212) },
  solution: [
    t`${math`${22} = ${2} \times ${11}`} and ${math`${175} = ${5}^{${2}} \times ${7}`} share no prime, so the power is coprime to ${175} and has an inverse. To find it, reduce the power: repeated squaring gives ${math`[${22}^{${12001}}]_{${175}} = ${base3212}`}.`,
    t`Then ${math`${175} = ${7} \times ${22} + ${21}`} and ${math`${22} = ${21} + ${1}`}, so ${math`${1} = ${22} - (${175} - ${7} \times ${22}) = ${8} \times ${22} - ${175}`}, and the inverse is ${inv3212}.`,
  ],
  reference: String(inv3212),
  verify: () => same('the power and the inverse', `${base3212},${(base3212 * inv3212) % 175}`, '22,1'),
  misconceptions: [{ response: String(inverseBySearch(22, 7)), why: t`Work modulo ${175}, not ${7}: the inverse must satisfy ${math`${22}x \equiv ${1} \pmod{${175}}`}.` }],
});

const sheet226 = auto({
  id: 'sheet-2-2-6-z7-inverses',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.6', true),
  title: t`The inverse table of ${Z(7)}`,
  prompt: t`Exercise ${2}.${2}.${6} asks for the inverse tables of ${Z(3)}, ${Z(6)}, and ${Z(7)}. Give the multiplicative inverse of each nonzero element of ${Z(7)}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${math`k`}`, t`${math`k^{-${1}}`}`], rows: upTo(6).map((k) => [t`${k}`, null]), expected: upTo(6).map((k) => String(inverseBySearch(k, 7))) },
  solution: [t`Read each from the ${1}s in the multiplication table: ${math`${2} \times ${4} = ${8} \equiv ${1}`}, ${math`${3} \times ${5} = ${15} \equiv ${1}`}, ${math`${6} \times ${6} = ${36} \equiv ${1}`}. Every nonzero element has one, because ${7} is prime: as the official solution puts it, ${Z(7)} is a field.`],
  reference: upTo(6).map((k) => String(inverseBySearch(k, 7))),
  verify: () => same('i^(p - 2) for p = 7', upTo(6).map((k) => powMod(k, 5, 7)).join(), '1,4,5,2,3,6'),
  misconceptions: [{ response: ['6', '5', '4', '3', '2', '1'], why: t`Those are the additive inverses, with ${math`k + (-k) \equiv ${0}`}. The multiplicative inverse gives ${math`k \cdot k^{-${1}} \equiv ${1}`}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.2.6'), answer: ['1', '4', '5', '2', '3', '6'], agrees: true },
});

const sheet3212proof = supervision({
  id: 'sheet-3-2-12',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.12'),
  title: t`Why the inverse exists`,
  prompt: t`Prove that ${math`[${22}^{${12001}}]_{${175}}`} has a multiplicative inverse in ${Z(175)}. First prove the lemma: ${math`[n]_{m}`} has an inverse in ${Z(mm)} if and only if ${math`\gcd(m, n) = ${1}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.12'),
});
const cor86 = supervision({
  id: 'notes-244-corollary-86',
  source: cite('cst-dm-notes', 'printed page 244, Corollary 86'),
  title: t`${Z(math`p`)} is a field`,
  prompt: t`Corollary ${86}: for a prime ${math`p`}, every nonzero ${math`i`} in ${Z(math`p`)} has inverse ${math`[i^{p - ${2}}]_{p}`}. Prove it from Fermat's little theorem, and explain why the formula fails for a composite modulus, with an example in ${Z(8)}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const modularInverse: TopicContent = {
  topicId: 'num.modular-inverse',
  goal: t`Decide when ${math`n`} has an inverse modulo ${mm} (exactly when ${math`\gcd(m, n) = ${1}`}), compute it with the extended Euclidean algorithm, and use it to solve linear congruences.`,
  lesson: [
    { kind: 'rule', text: t`A [[modular-inverse|multiplicative inverse]] of ${math`n`} in ${Z(mm)} is an ${math`x`} with ${math`n x \equiv ${1} \pmod{m}`}. It exists exactly when ${math`\gcd(m, n) = ${1}`}, and then the extended algorithm finds it: from ${math`s m + t n = ${1}`}, ${math`n t \equiv ${1}`}, so ${math`n^{-${1}} = [t]_{m}`} (Corollary ${93}).` },
    { kind: 'p', text: t`Why exactly then: if ${math`n x = ${1} + k m`}, then ${math`${1} = n x - k m`} is a combination of ${mm} and ${math`n`}, so their gcd divides ${1}. And conversely the algorithm builds such a combination. Example: ${math`${3} \times ${40} - ${17} \times ${7} = ${1}`}, so ${math`${7}^{-${1}} = [-${17}]_{${40}} = ${23}`}.` },
    { kind: 'p', text: t`For a prime ${math`p`}, every nonzero element is coprime to ${math`p`}, so every nonzero element of ${Z(math`p`)} has an inverse: ${Z(math`p`)} is a [[field|field]], where you can divide. Fermat's little theorem even gives a formula, ${math`i^{-${1}} = [i^{p - ${2}}]_{p}`} (Corollary ${86}).` },
    { kind: 'p', text: t`Inverses solve congruences. ${math`${77}x \equiv ${11} \pmod{${40}}`} becomes ${math`${7}x \equiv ${1}`} after cancelling ${11} (coprime to ${40}), so ${math`x \equiv ${23}`}. When ${math`g = \gcd(a, m) > ${1}`}, ${math`ax \equiv b`} has no solution unless ${math`g \mid b`}, and then ${math`g`} solutions in ${Z(mm)}: ${math`${12}y \equiv ${30} \pmod{${54}}`} has ${6}.` },
  ],
  examples: [
    workedCambridge(sheet3211),
    worked(inverseMod, { a: 17, m: 43 }, t`The inverse of ${17} modulo ${43}`),
    worked(solveCongruence, { a: 5, b: 3, m: 26 }, t`Solving ${math`${5}x \equiv ${3} \pmod{${26}}`}`),
  ],
  generators: [inverseMod, solveCongruence, countUnits],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['modular-inverse', 'field'],
  cambridge: [sheet3210a, sheet3210b, sheet3210c, sheet3212, sheet226, sheet3212proof, cor86],
};
