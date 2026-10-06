/**
 * num.fermat-little: for a prime p, i^p ≡ i (mod p), and i^(p - 1) ≡ 1 when p does not
 * divide i. The lesson follows the CST notes: the five pirates puzzle (printed page 17,
 * answered on page 131), the Freshman's Dream and the Dropout Lemmas (pages 125 to 128),
 * Theorem 36 (page 129), part 2 from part 1 and Euclid's theorem (page 240), the proof by
 * induction (pages 280 to 282), and the Theorem of the Day sheet (page 132). The problems
 * are supervision exercises 2.2.7 to 2.2.9 and 3.2.8 with their 2023-24 official solutions.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { mod, powMod, powModSlow } from '../numbers';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mp, mi] = [math`p`, math`i`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- reduce the exponent

interface RedP { a: number; k: number; p: number }
const redMis = ({ a, k, p }: RedP): string[] => [String(powMod(a, k % p, p)), '1', String(powMod(a, (k % (p - 1)) + 1, p))];

const reduceExponent = generator<RedP>({
  id: 'reduce-exponent',
  skill: 'Use Fermat\'s little theorem to reduce an exponent modulo p - 1, then finish the small power.',
  params: (rng) => {
    for (;;) {
      const p = pick(rng, [5, 7, 11, 13, 17, 19, 23, 29, 31]);
      const P: RedP = { p, a: int(rng, 2, 50), k: int(rng, 30, 5000) };
      if (P.a % p !== 0 && P.k % (p - 1) !== 0 && distinctFrom(String(powMod(P.a, P.k, p)), redMis(P)) >= 2) return P;
    }
  },
  sane: ({ a, p }) => (a % p !== 0 ? null : 'out of range'),
  problem: ({ a, k, p }) => {
    const r = k % (p - 1);
    return {
      prompt: t`${p} is prime. Find the remainder when ${math`${a}^{${k}}`} is divided by ${p}.`,
      answer: { kind: 'exact', expected: String(powMod(a, k, p)) },
      solution: [
        t`${p} does not divide ${a}, so ${math`${a}^{${p - 1}} \equiv ${1} \pmod{${p}}`}. Write ${math`${k} = ${Math.floor(k / (p - 1))} \times ${p - 1} + ${r}`}: then ${math`${a}^{${k}} = (${a}^{${p - 1}})^{${Math.floor(k / (p - 1))}} \cdot ${a}^{${r}} \equiv ${a}^{${r}}`}.`,
        t`${math`${a} \equiv ${mod(a, p)}`}, and ${math`${mod(a, p)}^{${r}} \equiv ${powMod(a, r, p)} \pmod{${p}}`}.`,
      ],
    };
  },
  solve: ({ a, k, p }) => String(powModSlow(a, k, p)),
  misconceptions: ({ a, k, p }): Misconception[] => [
    { response: String(powMod(a, k % p, p)), why: t`Exponents repeat with period ${math`p - ${1} = ${p - 1}`}, not ${p}: reduce ${k} modulo ${p - 1}.` },
    { response: '1', why: t`${math`a^{p - ${1}} \equiv ${1}`}, but ${k} is not a multiple of ${p - 1}: a power ${math`${a}^{${k % (p - 1)}}`} is left over.` },
    { response: String(powMod(a, (k % (p - 1)) + 1, p)), why: t`Off by one: the leftover exponent is the remainder of ${k} on division by ${p - 1}, which is ${k % (p - 1)}.` },
  ],
});

// ---------------------------------------------------------------- the pirates, generalised

interface PirP { p: number; n: number }

const pirates = generator<PirP>({
  id: 'pirates',
  skill: 'Solve the notes\' pirates puzzle for other numbers: n^(p - 1) leaves remainder 0 or 1 on division by a prime p.',
  params: (rng) => ({ p: pick(rng, [3, 5, 7, 11]), n: int(rng, 2, 80) }),
  sane: ({ p }) => (p >= 3 ? null : 'out of range'),
  problem: ({ p, n }) => {
    const r = powMod(n, p - 1, p);
    return {
      prompt: t`${p} pirates sit on chairs numbered ${0} to ${p - 1}. The treasure is ${n} blocks of ${math`${n}^{${p - 2}}`} gold coins each. They take ${p} coins at a time, one each, while at least ${p} remain; the ${math`r`} coins left over go to the pirate on chair ${math`r`}. Which chair gets them?`,
      answer: { kind: 'exact', expected: String(r) },
      solution: [
        t`There are ${math`${n} \times ${n}^{${p - 2}} = ${n}^{${p - 1}}`} coins, and ${math`r`} is its remainder on division by ${p}.`,
        n % p === 0
          ? t`${p} divides ${n}, so ${p} divides ${math`${n}^{${p - 1}}`}: ${math`r = ${0}`}.`
          : t`${p} is prime and does not divide ${n}, so by Fermat's little theorem ${math`${n}^{${p - 1}} \equiv ${1} \pmod{${p}}`}: ${math`r = ${1}`}.`,
      ],
    };
  },
  solve: ({ p, n }) => String(powModSlow(n, p - 1, p)),
  misconceptions: ({ p, n }): Misconception[] => [
    { response: String(n % p), why: t`The number of coins is ${math`${n}^{${p - 1}}`}, not ${n}: raise to the power before taking the remainder.` },
    { response: n % p === 0 ? '1' : '0', why: n % p === 0 ? t`Fermat's little theorem needs ${p} not to divide ${n}. Here it does, so every power of ${n} is a multiple of ${p}.` : t`${p} does not divide ${n}, so it does not divide any power of ${n}: the remainder is not ${0}.` },
    { response: String(p - 1), why: t`The last chair is not special: compute the remainder of ${math`${n}^{${p - 1}}`} on division by ${p}.` },
  ],
});

// ---------------------------------------------------------------- a Fermat witness

interface WitP { m: number }
const ODD_COMPOSITES = [15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 85, 87, 91, 93, 95];

const fermatWitness = generator<WitP>({
  id: 'fermat-witness',
  skill: 'Prove a number composite with Fermat\'s little theorem: find i with i^m ≢ i (mod m), without factorising.',
  params: (rng) => ({ m: pick(rng, ODD_COMPOSITES) }),
  sane: ({ m }) => (ODD_COMPOSITES.includes(m) ? null : 'out of range'),
  problem: ({ m }) => {
    const i = upTo(m).find((x) => x >= 2 && powMod(x, m, m) !== x % m) as number;
    return {
      prompt: t`Show that ${m} is not prime by Fermat's little theorem: find an integer ${mi} with ${math`i^{${m}} \not\equiv i \pmod{${m}}`}.`,
      answer: {
        kind: 'witness', count: 1, names: ['i'], example: `i = ${i}`,
        check: ([v]) => {
          const x = big(v);
          if (x === null) return 'Give an integer.';
          return powMod(x, m, m) !== mod(x, m) ? null : `${x}^${m} ≡ ${x} (mod ${m}), so ${x} shows nothing.`;
        },
      },
      solution: [
        t`If ${m} were prime, every ${mi} would satisfy ${math`i^{${m}} \equiv i`}. By repeated squaring, ${math`${i}^{${m}} \equiv ${powMod(i, m, m)} \pmod{${m}}`}, which is not ${i}.`,
        t`So ${m} is not prime, and no factor was found: this is how Fermat's little theorem tests primality, as the notes remark.`,
      ],
    };
  },
  solve: ({ m }) => `i = ${upTo(m).find((x) => x >= 2 && powModSlow(x, m, m) !== x % m)}`,
  misconceptions: ({ m }): Misconception[] => [
    { response: 'i = 1', why: t`${math`${1}^{${m}} = ${1}`} for every ${m}: ${1} never shows anything.` },
    { response: 'i = 0', why: t`${math`${0}^{${m}} = ${0}`}: no information.` },
    { response: `i = ${m - 1}`, why: t`${math`(-${1})^{${m}} = -${1}`} because ${m} is odd: that holds whether or not ${m} is prime.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const piratesNotes = auto({
  id: 'notes-17-pirates',
  source: cite('cst-dm-notes', 'printed page 17, the puzzle'),
  title: t`The five pirates`,
  prompt: t`${5} pirates have a tower of ${math`n`} cubes, each of ${math`n^{${3}}`} golden dice, for an unknown large ${math`n`}. On chairs numbered ${0} to ${4}, they take a die each with every tick of the clock while five or more dice remain; the ${math`r`} dice left go to the pirate on chair ${math`r`}. What chair should a pirate sit on to maximise his gain?`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`There are ${math`n \cdot n^{${3}} = n^{${4}}`} dice, and ${math`r = \mathrm{rem}(n^{${4}}, ${5})`}.`,
    t`By Fermat's little theorem with the prime ${5}: if ${5} does not divide ${math`n`}, ${math`n^{${4}} \equiv ${1} \pmod{${5}}`}; if it does, ${math`n^{${4}} \equiv ${0}`}. So ${math`r`} is ${0} or ${1}, and only chair ${1} can win anything.`,
  ],
  reference: '1',
  verify: () => same('n^4 mod 5 for n from 1 to 1000', [...new Set(upTo(1000).map((n) => powModSlow(n, 4, 5)))].sort().join(), '0,1'),
  misconceptions: [{ response: '0', why: t`The pirate on chair ${0} gets the ${0} leftover dice: nothing. ${math`r = ${0}`} only happens when ${5} divides ${math`n`}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 131, the answer to the puzzle'), answer: '1', agrees: true },
});

const CUBES = [3, 2, 4, 5];
const totdCubes = auto({
  id: 'notes-132-totd-cubes',
  source: cite('cst-dm-notes', 'printed page 132, the Theorem of the Day sheet', true),
  title: t`Rubik's cubes, five at a time`,
  prompt: t`The Theorem of the Day sheet: a row of ${math`a`} copies of an ${math`a \times a \times a`} cube has ${math`a^{${4}}`} little cubes. Taking them ${5} at a time, how many are left over, for ${math`a = ${3}`}, ${2}, ${4}, and ${5}?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${math`a`}`, t`left over`], rows: CUBES.map((a) => [t`${a}`, null]), expected: CUBES.map((a) => String(powMod(a, 4, 5))) },
  solution: [
    t`${math`a^{${4}} = a^{${5} - ${1}}`}, so by Fermat's little theorem it leaves ${1} whenever ${5} does not divide ${math`a`}: ${math`${81}`}, ${math`${16}`}, and ${math`${256}`} each leave ${1}.`,
    t`The ${math`${5} \times ${5} \times ${5}`} "Professor's cube" fails the hypothesis: ${math`${5}^{${4}} = ${625}`} leaves ${0}.`,
  ],
  reference: CUBES.map((a) => String(powMod(a, 4, 5))),
  verify: () => same('a^4 counted and reduced', CUBES.map((a) => (a ** 4) % 5).join(), '1,1,1,0'),
  misconceptions: [{ response: ['3', '2', '4', '0'], why: t`The number of little cubes is ${math`a^{${4}}`}, not ${math`a`}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 132, the Theorem of the Day sheet'), answer: ['1', '1', '1', '0'], agrees: true },
});

const byInduction = workedProof({
  title: t`Fermat's little theorem by induction`,
  prompt: t`Theorem ${36}.${1} of the CST notes: for all natural numbers ${mi} and primes ${mp}, ${math`i^{p} \equiv i \pmod{p}`}. The notes prove it again by induction on ${mi} (printed pages ${280} to ${282}).`,
  steps: [
    t`Let ${mp} be a prime, and ${math`P(i)`} the statement ${math`i^{p} \equiv i \pmod{p}`}. Base case: ${math`${0}^{p} = ${0} \equiv ${0}`}.`,
    t`Inductive step: assume ${math`i^{p} \equiv i`}. By the binomial theorem, ${math`(i + ${1})^{p} = i^{p} + \sum_{k = ${1}}^{p - ${1}} \binom{p}{k} i^{k} + ${1}`}, and every ${math`\binom{p}{k}`} with ${math`${0} < k < p`} is a multiple of ${mp}.`,
    t`So ${math`(i + ${1})^{p} \equiv i^{p} + ${1} \equiv i + ${1} \pmod{p}`}, using the hypothesis. By induction, ${math`i^{p} \equiv i`} for every natural number ${mi}.`,
    t`Part ${2}: ${math`p \mid i^{p} - i = i(i^{p - ${1}} - ${1})`}; if ${math`p \nmid i`}, Euclid's theorem gives ${math`p \mid i^{p - ${1}} - ${1}`}, that is, ${math`i^{p - ${1}} \equiv ${1}`}.`,
  ],
  answer: t`${math`i^{p} \equiv i \pmod{p}`}, and ${math`i^{p - ${1}} \equiv ${1}`} when ${math`p \nmid i`}.`,
  source: cite('cst-dm-notes', 'printed pages 240, 241, and 280 to 282, Theorem 36'),
});

const sheet227 = supervision({
  id: 'sheet-2-2-7',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.7'),
  title: t`Exponents modulo ${math`p - ${1}`}`,
  prompt: t`Let ${mi} and ${math`n`} be positive integers and ${mp} a prime. Show that if ${math`n \equiv ${1} \pmod{p - ${1}}`} then ${math`i^{n} \equiv i \pmod{p}`} for all ${mi} not a multiple of ${mp}. Does it hold for multiples of ${mp} too?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.2.7'),
});
const sheet229 = supervision({
  id: 'sheet-2-2-9',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.9'),
  title: t`${math`n^{${7}} \equiv n \pmod{${42}}`}`,
  prompt: t`Prove that ${math`n^{${7}} \equiv n \pmod{${42}}`} for all integers ${math`n`}. A case analysis over ${42} remainders is impractical: use Fermat's little theorem modulo ${2}, ${3}, and ${7}, and a lemma combining congruences modulo coprime numbers.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.2.9'),
});
const sheet328 = supervision({
  id: 'sheet-3-2-8',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.8'),
  title: t`${math`n^{${13}} \equiv n \pmod{${10}}`}`,
  prompt: t`Prove that ${math`n^{${13}} \equiv n \pmod{${10}}`} for all integers ${math`n`}, by showing it modulo ${2} and modulo ${5} with Fermat's little theorem and combining the two.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.8'),
});
const dropout = supervision({
  id: 'notes-127-dropout',
  source: cite('cst-dm-notes', 'printed pages 125 to 129, the Freshman\'s Dream and the Dropout Lemmas'),
  title: t`The Dropout Lemmas`,
  prompt: t`Prove the Freshman's Dream, ${math`(m + n)^{p} \equiv m^{p} + n^{p} \pmod{p}`} for a prime ${mp}, from the binomial theorem and Proposition ${29}. Deduce the Dropout Lemma ${math`(m + ${1})^{p} \equiv m^{p} + ${1}`}, and then the Many Dropout Lemma ${math`(m + i)^{p} \equiv m^{p} + i`}, as an explicit induction on ${mi}, which the notes call an "iteration". Why does ${math`m = ${0}`} give Fermat's little theorem?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const fermatLittle: TopicContent = {
  topicId: 'num.fermat-little',
  goal: t`Prove Fermat's little theorem, ${math`i^{p} \equiv i \pmod{p}`} and ${math`i^{p - ${1}} \equiv ${1}`} when ${math`p \nmid i`}, and use it to reduce large powers and to test primality.`,
  lesson: [
    { kind: 'p', text: t`The CST notes open with a puzzle: ${5} pirates share ${math`n^{${4}}`} dice, five at a time, and the leftover ${math`r`} dice go to chair ${math`r`}. Whatever ${math`n`} is, the leftover is ${0} or ${1}. Why is the theorem of this topic.` },
    { kind: 'rule', text: t`[[fermats-little-theorem|Fermat's little theorem]] (Theorem ${36}): for every natural number ${mi} and prime ${mp}, ${math`i^{p} \equiv i \pmod{p}`}; and ${math`i^{p - ${1}} \equiv ${1} \pmod{p}`} whenever ${mi} is not a multiple of ${mp}.` },
    { kind: 'p', text: t`Proof of the first part: every inner binomial coefficient ${math`\binom{p}{k}`} is a multiple of ${mp}, so ${math`(m + n)^{p} \equiv m^{p} + n^{p}`}, the [[freshmans-dream|Freshman's Dream]]. Adding ${1} at a time from ${0}: ${math`(${0} + ${1} + \cdots + ${1})^{p} \equiv ${0} + ${1} + \cdots + ${1}`}, that is, ${math`i^{p} \equiv i`}. The second part follows by Euclid's theorem: ${math`p \mid i(i^{p - ${1}} - ${1})`} and ${math`p \nmid i`}.` },
    { kind: 'p', text: t`Exponents of a number not divisible by ${mp} can be reduced modulo ${math`p - ${1}`}: ${math`${3}^{${100}} = (${3}^{${6}})^{${16}} \cdot ${3}^{${4}} \equiv ${3}^{${4}} = ${81} \equiv ${powMod(3, 100, 7)} \pmod{${7}}`}. The pirates: ${math`n^{${4}} = n^{${5} - ${1}} \equiv ${1}`} unless ${5} divides ${math`n`}.` },
    { kind: 'p', text: t`The theorem tests primality without factorising: if ${math`i^{m} \not\equiv i \pmod{m}`} for some ${mi}, then ${math`m`} is not prime. ${math`${2}^{${15}} = ${32768} \equiv ${powMod(2, 15, 15)} \pmod{${15}}`}, not ${2}, so ${15} is composite. The converse fails: ${math`${2}^{${340}} \equiv ${1} \pmod{${341}}`} with ${math`${341} = ${11} \times ${31}`}.` },
  ],
  examples: [
    workedCambridge(piratesNotes),
    byInduction,
    worked(reduceExponent, { a: 3, k: 100, p: 7 }, t`${math`${3}^{${100}}`} modulo ${7}`),
  ],
  generators: [reduceExponent, pirates, fermatWitness],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fermats-little-theorem', 'freshmans-dream'],
  cambridge: [totdCubes, sheet227, sheet229, sheet328, dropout],
};
