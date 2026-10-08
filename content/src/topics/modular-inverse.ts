/**
 * num.modular-inverse: [n]_m has a multiplicative inverse in Z_m exactly when
 * gcd(m, n) = 1, and the extended Euclidean algorithm computes it. The lesson follows the
 * CST notes (printed page 244, Corollary 86: Z_p is a field, with inverse i^(p - 2); page
 * 258, Corollary 93 and its Remark) and the 2023-24 official solutions to supervision
 * exercises 2.2.6 (inverse tables), 3.2.10 (solving congruences), 3.2.11 (inverses of 2 in
 * Z_7, 7 in Z_40, and 13 in Z_23), and 3.2.12 (the inverse of [22^12001]_175).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { egcd, factorise, gcd, inverseBySearch, mod, phi, powMod, primesTo } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, paren, t, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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
    t`Cancel a factor coprime to the modulus, then invert.`,
  ],
  reference: '23',
  verify: () => same('every x from 0 to 39', upTo(40).map((x) => x - 1).filter((x) => (77 * x - 11) % 40 === 0).join(), '23'),
  misconceptions: [{ response: '17', why: t`The coefficient is ${math`-${17}`}, and ${math`[-${17}]_{${40}} = ${23}`}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(a)'), answer: '23', agrees: true },
  nudge: t`Not quite. Dividing out a factor coprime to ${40} first leaves a congruence that asks for an inverse.`,
  hints: [
    t`What common factor do ${77} and ${11} share, and is it coprime to ${40}?`,
    t`After dividing it out, which simpler congruence remains?`,
    t`How does Euclid's algorithm on ${40} and ${7} give the inverse of ${7} modulo ${40}?`,
  ],
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
    t`With ${math`d = \gcd(a, m)`} dividing ${math`b`}, the congruence ${math`ax \equiv b \pmod{m}`} has exactly ${math`d`} solutions in ${Z(mm)}.`,
  ],
  reference: ['7', '6'],
  verify: () => { const sols = upTo(54).map((y) => y - 1).filter((y) => (12 * y - 30) % 54 === 0); return same('every y from 0 to 53', `${sols[0]},${sols.length}`, '7,6'); },
  misconceptions: [{ response: ['7', '1'], why: t`Modulo ${54} the solution ${math`y \equiv ${7} \pmod{${9}}`} is ${6} classes: ${7}, ${16}, and so on.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(b)'), answer: ['7', '6'], agrees: true },
  nudge: t`Not quite. The gcd of ${12} and ${54} decides both whether solutions exist and how many there are in ${Z(54)}.`,
  hints: [
    t`What is ${math`\gcd(${12}, ${54})`}, and does it divide ${30}?`,
    t`Dividing through by that gcd, which congruence with a smaller modulus remains, and what is its solution?`,
    t`How many classes modulo ${54} does one class modulo the smaller modulus split into?`,
  ],
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
    t`Write one congruence as a family, then substitute the family into the other.`,
  ],
  reference: String(zSys),
  verify: () => same('the first z from 1 to 357 meeting both', zSys, 97),
  misconceptions: [{ response: '12', why: t`${12} solves the second congruence but ${math`${12} \not\equiv ${13} \pmod{${21}}`}. Both must hold.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(c)'), answer: '97', agrees: true },
  nudge: t`Not quite. Solve each congruence on its own first, then find the number both families share.`,
  hints: [
    t`What form does every ${math`z`} with ${math`${13} \equiv z \pmod{${21}}`} take?`,
    t`What is the inverse of ${3} modulo ${17}, and so which class modulo ${17} must ${math`z`} lie in?`,
    t`Which ${math`k`} puts ${math`${13} + ${21}k`} in that class, by Euclid's algorithm on ${21} and ${17} or by trying values?`,
  ],
});

const base3212 = powMod(22, 12001, 175);
const inv3212 = inverseBySearch(base3212, 175) as number;
const sheet3212 = auto({
  id: 'sheet-3-2-12-inverse',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.12', true),
  title: t`The inverse of ${math`[${22}^{${12001}}]_{${175}}`}`,
  prompt: t`Exercise ${3}.${2}.${12} asks for a proof that ${math`[${22}^{${12001}}]_{${175}}`} has a multiplicative inverse in ${Z(175)}. Go further: find it.`,
  answer: { kind: 'exact', expected: String(inv3212) },
  solution: [
    t`${math`${22} = ${2} \times ${11}`} and ${math`${175} = ${5}^{${2}} \times ${7}`} share no prime, so the power is coprime to ${175} and has an inverse. To find it, reduce the power: repeated squaring gives ${math`[${22}^{${12001}}]_{${175}} = ${base3212}`}.`,
    t`Then ${math`${175} = ${7} \times ${22} + ${21}`} and ${math`${22} = ${21} + ${1}`}, so ${math`${1} = ${22} - (${175} - ${7} \times ${22}) = ${8} \times ${22} - ${175}`}, and the inverse is ${inv3212}.`,
    t`Shrink the number first, then invert it.`,
  ],
  reference: String(inv3212),
  verify: () => same('the power and the inverse', `${base3212},${(base3212 * inv3212) % 175}`, '22,1'),
  misconceptions: [{ response: String(inverseBySearch(22, 7)), why: t`Work modulo ${175}, not ${7}: the inverse must satisfy ${math`${22}x \equiv ${1} \pmod{${175}}`}.` }],
  nudge: t`Not quite. Reduce the huge power modulo ${175} first; the inverse of a small number is then one run of Euclid's algorithm.`,
  hints: [
    t`How can ${math`[${22}^{${12001}}]_{${175}}`} be reduced, by repeated squaring or by finding a power of ${22} that is ${1} modulo ${175}?`,
    t`What small residue does the power reduce to?`,
    t`How does Euclid's algorithm on ${175} and that residue give its inverse?`,
  ],
});

const sheet226 = auto({
  id: 'sheet-2-2-6-z7-inverses',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.6', true),
  title: t`The inverse table of ${Z(7)}`,
  prompt: t`Exercise ${2}.${2}.${6} asks for the inverse tables of ${Z(3)}, ${Z(6)}, and ${Z(7)}. Give the multiplicative inverse of each nonzero element of ${Z(7)}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${math`k`}`, t`${math`k^{-${1}}`}`], rows: upTo(6).map((k) => [t`${k}`, null]), expected: upTo(6).map((k) => String(inverseBySearch(k, 7))) },
  solution: [t`Read each from the ${1}s in the multiplication table: ${math`${2} \times ${4} = ${8} \equiv ${1}`}, ${math`${3} \times ${5} = ${15} \equiv ${1}`}, ${math`${6} \times ${6} = ${36} \equiv ${1}`}. Every nonzero element has one, because ${7} is prime: as the official solution puts it, ${Z(7)} is a field.`, t`Inverses come in pairs, and modulo a prime every nonzero element has one.`],
  reference: upTo(6).map((k) => String(inverseBySearch(k, 7))),
  verify: () => same('i^(p - 2) for p = 7', upTo(6).map((k) => powMod(k, 5, 7)).join(), '1,4,5,2,3,6'),
  misconceptions: [{ response: ['6', '5', '4', '3', '2', '1'], why: t`Those are the additive inverses, with ${math`k + (-k) \equiv ${0}`}. The multiplicative inverse gives ${math`k \cdot k^{-${1}} \equiv ${1}`}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.2.6'), answer: ['1', '4', '5', '2', '3', '6'], agrees: true },
  nudge: t`Not quite. The inverse of ${math`k`} is the element whose product with ${math`k`} is ${1} modulo ${7}, not the one whose sum with ${math`k`} is ${0}.`,
  hints: [
    t`For each ${math`k`}, which ${math`j`} in ${Z(7)} makes ${math`k \times j`} leave remainder ${1} on division by ${7}?`,
    t`Which elements are their own inverses?`,
    t`If ${math`k^{-${1}} = j`}, what is ${math`j^{-${1}}`}?`,
  ],
});

const sheet3212proof = supervision({
  id: 'sheet-3-2-12',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.12'),
  title: t`Why the inverse exists`,
  prompt: t`Prove that ${math`[${22}^{${12001}}]_{${175}}`} has a multiplicative inverse in ${Z(175)}. First prove the lemma: ${math`[n]_{m}`} has an inverse in ${Z(mm)} if and only if ${math`\gcd(m, n) = ${1}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.12'),
  hints: [
    t`If ${math`\gcd(m, n) = ${1}`}, how does Bézout's identity give an integer ${math`x`} with ${math`nx \equiv ${1} \pmod{m}`}?`,
    t`Conversely, if ${math`nx \equiv ${1} \pmod{m}`}, why must every common divisor of ${mm} and ${math`n`} divide ${1}?`,
    t`Why do ${math`${22}^{${12001}}`} and ${175} share no prime factor?`,
  ],
});
const cor86 = supervision({
  id: 'notes-244-corollary-86',
  source: cite('cst-dm-notes', 'printed page 244, Corollary 86'),
  title: t`${Z(math`p`)} is a field`,
  prompt: t`Corollary ${86}: for a prime ${math`p`}, every nonzero ${math`i`} in ${Z(math`p`)} has inverse ${math`[i^{p - ${2}}]_{p}`}. Prove it from Fermat's little theorem, and explain why the formula fails for a composite modulus, with an example in ${Z(8)}.`,
  writeUp: 'proof',
  hints: [
    t`What does Fermat's little theorem say about ${math`i^{p - ${1}}`} when ${math`p`} does not divide ${math`i`}?`,
    t`How is ${math`i \cdot i^{p - ${2}}`} related to ${math`i^{p - ${1}}`}?`,
    t`In ${Z(8)}, which elements have inverses, and does ${math`i^{${8} - ${2}}`} give the inverse for each of them?`,
  ],
});

// ---------------------------------------------------------------- lesson

const mn = math`n`;
const INV7 = inverseBySearch(7, 40) as number;

export const modularInverse: TopicContent = {
  topicId: 'num.modular-inverse',
  goal: t`Decide when ${math`n`} has an inverse modulo ${mm} (exactly when ${math`\gcd(m, n) = ${1}`}), compute it with the extended Euclidean algorithm, and use it to solve linear congruences.`,
  objective: t`Decide when a number has an inverse modulo m, compute it, and use it to solve linear congruences.`,
  why: t`Cryptography and the Chinese remainder theorem rest on division modulo m; next, Fermat's little theorem.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Dividing without fractions` },
    { kind: 'hook', text: t`Modulo ${40}, can you divide by ${7}? There are no fractions in ${Z(40)}. But ${math`${7} \times ${INV7} = ${7 * INV7} = ${4} \times ${40} + ${1}`}, so multiplying by ${INV7} undoes multiplying by ${7}: ${INV7} behaves exactly like ${math`\tfrac{${1}}{${7}}`}. Modulo ${4}, though, nothing times ${2} is ${1}. What decides it?` },

    { kind: 'section', title: t`When an inverse exists` },
    { kind: 'definition', name: t`Multiplicative inverse`, formal: t`An integer ${math`x`} is a [[modular-inverse|multiplicative inverse]] of ${mn} modulo ${mm} if ${math`nx \equiv ${1} \pmod{m}`}. In ${Z(mm)} it is written ${math`n^{-${1}}`}.`, plain: t`A number that multiplies ${mn} to ${1}, after reducing. ${math`${7}^{-${1}} = ${INV7}`} in ${Z(40)}.` },
    { kind: 'theorem', name: t`Existence`, statement: t`${mn} has a multiplicative inverse modulo ${mm} if and only if ${math`\gcd(m, n) = ${1}`}. The inverse is then unique in ${Z(mm)}.` },
    { kind: 'narrative', text: t`The idea in one line: ${math`nx \equiv ${1}`} says ${math`nx - km = ${1}`} for some integer ${math`k`}, and a combination of ${mm} and ${mn} equal to ${1} exists exactly when their gcd is ${1}. That last fact is Bézout's identity, from the extended Euclidean algorithm.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`If an inverse exists, the gcd is ${1}`, text: t`Suppose ${math`nx \equiv ${1} \pmod{m}`}, so ${math`nx = ${1} + km`} for an integer ${math`k`}. Let ${math`d = \gcd(m, n)`}. Then ${math`d \mid n`} and ${math`d \mid m`}, so ${math`d`} divides ${math`nx - km = ${1}`}, and ${math`d = ${1}`}.` },
        { label: t`If the gcd is ${1}, an inverse exists`, text: t`By the extended Euclidean algorithm there are integers ${math`s, t`} with ${math`sm + tn = ${1}`}. Reduce modulo ${mm}: ${math`sm \equiv ${0}`}, so ${math`tn \equiv ${1}`}, and ${math`t`} is an inverse.`, why: { q: t`Where do ${math`s`} and ${math`t`} come from?`, a: t`Run Euclid's algorithm on ${mm} and ${mn}, then substitute back up the chain of remainders, as in the next section. It always ends with ${math`\gcd(m, n)`} written as a combination of ${mm} and ${mn}.` } },
        { label: t`Uniqueness`, text: t`If ${math`nx \equiv ${1}`} and ${math`ny \equiv ${1}`}, then ${math`x \equiv x(ny) = (xn)y \equiv y \pmod{m}`}.`, plain: t`Two inverses are congruent, so ${Z(mm)} holds exactly one.` },
      ],
    },

    { kind: 'section', title: t`Computing an inverse` },
    {
      kind: 'steps',
      steps: [
        { label: t`Run Euclid`, text: t`${math`${40} = ${5} \times ${7} + ${5}`}, ${math`${7} = ${1} \times ${5} + ${2}`}, ${math`${5} = ${2} \times ${2} + ${1}`}. The last non-zero remainder is ${1}: ${math`\gcd(${40}, ${7}) = ${1}`}.` },
        { label: t`Work back up`, text: t`${math`${1} = ${5} - ${2} \times ${2}`}. Replace ${2} by ${math`${7} - ${5}`}: ${math`${1} = ${3} \times ${5} - ${2} \times ${7}`}. Replace ${5} by ${math`${40} - ${5} \times ${7}`}:`, eq: [dmath`${1} = ${3} \times ${40} - ${17} \times ${7}.`], plain: t`Each line is still equal to ${1}; we only rename a remainder in terms of the two numbers above it.` },
        { label: t`Read off the inverse`, text: t`Modulo ${40}, ${math`-${17} \times ${7} \equiv ${1}`}, so ${math`${7}^{-${1}} = [-${17}]_{${40}} = ${INV7}`}.` },
      ],
    },
    checkFrom(inverseMod, { a: 5, m: 37 }, t`${math`${37} = ${7} \times ${5} + ${2}`}, ${math`${5} = ${2} \times ${2} + ${1}`}, so ${math`${1} = ${5} - ${2}(${37} - ${7} \times ${5}) = ${15} \times ${5} - ${2} \times ${37}`}: the inverse is ${15}.`),

    { kind: 'section', title: t`Primes give a field` },
    { kind: 'definition', name: t`Field`, formal: t`A commutative ring in which ${math`${0} \ne ${1}`} and every non-zero element has a multiplicative inverse is a [[field|field]].`, plain: t`A number system where you can add, subtract, multiply, and divide by anything except ${0}: the rationals, the reals, and, as we now see, ${Z(math`p`)}.` },
    { kind: 'theorem', name: t`${Z(math`p`)} is a field`, statement: t`If ${math`p`} is prime, every non-zero element of ${Z(math`p`)} has a multiplicative inverse. If ${mm} is composite, ${Z(mm)} is not a field.` },
    { kind: 'p', text: t`Proof: a non-zero ${math`k < p`} shares no factor with the prime ${math`p`}, so ${math`\gcd(p, k) = ${1}`}. If ${math`m = ab`} with ${math`${1} < a < m`}, then ${math`\gcd(m, a) = a > ${1}`}, so ${math`a`} has no inverse. ∎ In ${Z(7)}: ${math`${2} \times ${4} \equiv ${1}`}, ${math`${3} \times ${5} \equiv ${1}`}, ${math`${6} \times ${6} \equiv ${1}`}.` },

    { kind: 'section', title: t`Solving linear congruences` },
    { kind: 'narrative', text: t`To solve ${math`ax \equiv b \pmod{m}`} with ${math`\gcd(a, m) = ${1}`}, multiply both sides by ${math`a^{-${1}}`}: ${math`x \equiv a^{-${1}}b`}, one solution in ${Z(mm)}. For ${math`${7}x \equiv ${3} \pmod{${40}}`}: ${math`x \equiv ${INV7} \times ${3} = ${INV7 * 3} \equiv ${mod(INV7 * 3, 40)}`}.` },
    { kind: 'theorem', name: t`Linear congruences`, statement: t`Let ${math`g = \gcd(a, m)`}. Then ${math`ax \equiv b \pmod{m}`} has a solution if and only if ${math`g \mid b`}, and then it has exactly ${math`g`} solutions in ${Z(mm)}.` },
    { kind: 'p', text: t`The recipe when ${math`g > ${1}`}: divide ${math`a`}, ${math`b`}, and ${mm} by ${math`g`}, solve the smaller congruence by an inverse, and list its ${math`g`} lifts modulo ${mm}. For ${math`${12}y \equiv ${30} \pmod{${54}}`}: ${math`g = ${6}`}, so ${math`${2}y \equiv ${5} \pmod{${9}}`}, ${math`y \equiv ${7} \pmod{${9}}`}, and modulo ${54} the solutions are ${listOf([7, 16, 25, 34, 43, 52])}.`, why: { q: t`Why no solution when ${math`g \nmid b`}?`, a: t`${math`ax - km = b`} for some ${math`k`}, and ${math`g`} divides the left side, so it must divide ${math`b`}. For example ${math`${2}x \equiv ${1} \pmod{${4}}`} is impossible: ${math`${2}x`} is even, and so is every multiple of ${4} added to it.` } },
    checkFrom(solveCongruence, { a: 3, b: 7, m: 20 }, t`${math`${3}^{-${1}} = ${7}`} in ${Z(20)}, since ${math`${21} \equiv ${1}`}; so ${math`x \equiv ${7} \times ${7} = ${49} \equiv ${9}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Every non-zero element of ${Z(mm)} has an inverse.`, counterexample: t`In ${Z(4)}, ${math`${2} \times ${0}, ${2} \times ${1}, ${2} \times ${2}, ${2} \times ${3}`} reduce to ${listOf([0, 2, 0, 2])}: never ${1}, because ${math`\gcd(${4}, ${2}) = ${2}`}.` },
    { kind: 'pitfall', claim: t`You may divide a congruence by a common factor and keep the modulus.`, counterexample: t`${math`${12}y \equiv ${30} \pmod{${54}}`} is not ${math`${2}y \equiv ${5} \pmod{${54}}`}: ${math`y = ${7}`} solves the first (${math`${84} - ${30} = ${54}`}) but not the second (${math`${14} - ${5} = ${9}`}). Divide the modulus by ${6} too.` },
    { kind: 'pitfall', claim: t`The inverse of ${7} modulo ${40} is ${math`-${17}`}, the coefficient from the algorithm.`, counterexample: t`${math`-${17}`} is right as a congruence, but the element of ${Z(40)} is ${math`-${17} + ${40} = ${INV7}`}. Reduce the coefficient.` },
    { kind: 'takeaway', text: t`${mn} is invertible modulo ${mm} exactly when ${math`\gcd(m, n) = ${1}`}; the extended Euclidean algorithm writes ${math`${1} = sm + tn`}, and ${math`t`} is the inverse.` },
  ],
  examples: [
    { ...workedCambridge(sheet3211), examiner: t`The examiner looks for ${1} written as a combination for each pair, and every coefficient reduced into ${Z(mm)}.` },
    worked(inverseMod, { a: 17, m: 43 }, t`The inverse of ${17} modulo ${43}`),
    worked(solveCongruence, { a: 5, b: 3, m: 26 }, t`Solving ${math`${5}x \equiv ${3} \pmod{${26}}`}`),
  ],
  generators: [inverseMod, solveCongruence, countUnits],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['modular-inverse', 'field'],
  cambridge: withUses([sheet3210a, sheet3210b, sheet3210c, sheet3212, sheet226, sheet3212proof, cor86], {
    'sheet-3-2-12': { sections: ['When an inverse exists'], note: t`An inverse exists exactly when coprime` },
    'sheet-3-2-10-c': { sections: ['Solving linear congruences'], note: t`A system of two congruences` },
    'sheet-3-2-10-b': { sections: ['Solving linear congruences'], note: t`A linear congruence with a common factor` },
    'sheet-3-2-12-inverse': { sections: ['Computing an inverse'], note: t`Reducing a huge power before inverting it`, needs: ['num.modular-exponentiation'] },
  }),
  // The CST proof and the multi-step congruences. Dropped: the one-step 3.2.10(a), the inverse table (drill),
  // Corollary 86, which needs Fermat's little theorem from a later lesson, and the inverse of the huge power,
  // which needs repeated squaring, also later.
  gate: ['sheet-3-2-12', 'sheet-3-2-10-c', 'sheet-3-2-10-b'],
  recall: [
    { front: t`When does ${mn} have an inverse modulo ${mm}?`, back: t`Exactly when ${math`\gcd(m, n) = ${1}`}.` },
    { front: t`How do you compute ${math`n^{-${1}}`} in ${Z(mm)}?`, back: t`Extended Euclid gives ${math`sm + tn = ${1}`}; then ${math`n^{-${1}} = [t]_{m}`}.` },
    { front: t`How many solutions has ${math`ax \equiv b \pmod{m}`}?`, back: t`With ${math`g = \gcd(a, m)`}: none unless ${math`g \mid b`}, and then ${math`g`} in ${Z(mm)}.` },
    { front: t`When is ${Z(mm)} a field?`, back: t`Exactly when ${mm} is prime.` },
  ],
  proofOrder: [{
    title: t`An inverse exists when ${math`\gcd(m, n) = ${1}`}`,
    steps: [
      t`Suppose ${math`\gcd(m, n) = ${1}`}.`,
      t`Extended Euclid gives integers with ${math`sm + tn = ${1}`}.`,
      t`Modulo ${mm}, the term ${math`sm`} vanishes.`,
      t`So ${math`tn \equiv ${1}`}, and ${math`t`} is an inverse.`,
    ],
  }],
};
