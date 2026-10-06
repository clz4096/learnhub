/**
 * prob.bayes-two-events: Reversing a conditional probability, at STEP level, by tables and
 * trees (batch 1 decision 7). From STEP Support Assignment 6 Q4 and its Discussion (a
 * population of 100 people; the blood test for "Mathmotitus"; false positives and
 * negatives; P(test positive | disease) is not P(disease | test positive)) and the hints'
 * note on the prosecutor's fallacy.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type AnswerSpec, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const pct = (x: number): Rational => q(x, 100);

/** P(A | B) for a two-way split: A with probability a, and B given A, B given not A. */
function reverse(a: Rational, bGivenA: Rational, bGivenNotA: Rational): Rational {
  const both = mul(a, bGivenA);
  return div(both, add(both, mul(sub(q(1), a), bGivenNotA)));
}

/** One person, sampled until the condition holds: a draw from the conditional distribution. */
function conditionalTrial(rng: Rng, a: Rational, bGivenA: Rational, bGivenNotA: Rational, wantA: boolean, wantB: boolean): boolean {
  const p = (r: Rational): number => Number(r.num) / Number(r.den);
  for (;;) {
    const isA = rng() < p(a);
    const isB = rng() < p(isA ? bGivenA : bGivenNotA);
    if (isB === wantB) return isA === wantA;
  }
}

/** Counts in a population of n, as a table: rows A and not A, columns B and not B. */
function counts(n: number, a: Rational, bGivenA: Rational, bGivenNotA: Rational): [number, number, number, number] {
  const nA = Number(mul(q(n), a).num);
  const ab = Number(mul(q(nA), bGivenA).num);
  const nb = n - nA;
  const notAb = Number(mul(q(nb), bGivenNotA).num);
  return [ab, nA - ab, notAb, nb - notAb];
}

// ---------------------------------------------------------------- generators

interface TestP { per: number; sens: number; spec: number }

const diagnostic = generator<TestP>({
  id: 'diagnostic',
  skill: 'Find P(disease | positive test) from the prevalence, sensitivity, and specificity, as in STEP Support Assignment 6 Q4(ii).',
  params: (rng) => ({ per: pick(rng, [50, 100, 200, 500, 1000]), sens: int(rng, 90, 99), spec: int(rng, 90, 99) }),
  sane: ({ per, sens, spec }) => ([50, 100, 200, 500, 1000].includes(per) && sens >= 90 && sens <= 99 && spec >= 90 && spec <= 99 ? null : 'out of range'),
  problem: ({ per, sens, spec }) => {
    const d = q(1, per);
    const ans = reverse(d, pct(sens), pct(100 - spec));
    const pop = per * 100;
    const [dPos, , hPos] = counts(pop, d, pct(sens), pct(100 - spec));
    return {
      prompt: t`A disease affects ${1} person in ${per}. A blood test gives a positive result for ${sens}% of people who have the disease, and a negative result for ${spec}% of people who do not. A person picked at random tests positive. What is the probability that they have the disease? Give it as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Imagine ${pop} people. ${math`${pop} \div ${per} = ${pop / per}`} have the disease, and ${pop - pop / per} do not.`,
        t`Of the ${pop / per} with it, ${sens}% test positive: ${dPos}. Of the ${pop - pop / per} without it, ${100 - spec}% test positive: ${hPos}. These are the [[false-positive|false positives]].`,
        t`So ${dPos + hPos} test positive, and ${dPos} of them have the disease: ${math`\frac{${dPos}}{${dPos + hPos}} = ${ans}`}. The test's [[sensitivity|sensitivity]] is ${sens}%, but a positive result means much less than that.`,
      ],
    };
  },
  solve: ({ per, sens, spec }) => {
    // By counting a population large enough that every group is whole.
    const [dPos, , hPos] = counts(per * 100, q(1, per), pct(sens), pct(100 - spec));
    return str(q(dPos, dPos + hPos));
  },
  misconceptions: ({ per, sens, spec }): Misconception[] => [
    { response: str(pct(sens)), why: t`That is ${math`P(\text{positive} \mid \text{disease})`}, the sensitivity. The question reverses it: ${math`P(\text{disease} \mid \text{positive})`}. Mixing the two up is the [[prosecutors-fallacy|prosecutor's fallacy]].` },
    { response: str(q(1, per)), why: t`That is the chance before the test. Restrict to the people who test positive and count how many of them have the disease.` },
    { response: str(mul(q(1, per), pct(sens))), why: t`That is the chance of having the disease and testing positive. Divide by the chance of testing positive at all.` },
    { response: str(pct(spec)), why: t`That is the specificity, the share of healthy people who test negative. It is not the chance asked for.` },
  ],
  trial: ({ per, sens, spec }, rng) => conditionalTrial(rng, q(1, per), pct(sens), pct(100 - spec), true, true),
});

type Who = 'group1-given-trait' | 'group2-given-no-trait';
interface GroupP { g: number; r1: number; r2: number; who: Who }

const groups = generator<GroupP>({
  id: 'reverse-groups',
  skill: 'Reverse a conditional probability between two groups, as in STEP Support Assignment 6 Q4(i)(d), (e).',
  params: (rng) => {
    for (;;) {
      const p: GroupP = { g: 10 * int(rng, 2, 8), r1: 10 * int(rng, 1, 8), r2: 10 * int(rng, 1, 8), who: pick(rng, ['group1-given-trait', 'group2-given-no-trait'] as const) };
      if (p.r1 !== p.r2) return p;
    }
  },
  sane: ({ g, r1, r2 }) => (g >= 20 && g <= 80 && r1 >= 10 && r1 <= 80 && r2 >= 10 && r2 <= 80 && r1 !== r2 ? null : 'out of range'),
  problem: ({ g, r1, r2, who }) => {
    const [ab, aNot, bb, bNot] = counts(100, pct(g), pct(r1), pct(r2));
    const ans = who === 'group1-given-trait' ? q(ab, ab + bb) : q(bNot, aNot + bNot);
    return {
      prompt: who === 'group1-given-trait'
        ? t`In a large population, ${g}% are adults and ${100 - g}% are children. Of the adults ${r1}% wear glasses, and of the children ${r2}%. Given that a person picked at random wears glasses, what is the probability that they are an adult?`
        : t`In a large population, ${g}% are adults and ${100 - g}% are children. Of the adults ${r1}% wear glasses, and of the children ${r2}%. Given that a person picked at random does not wear glasses, what is the probability that they are a child?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Take ${100} people, as the source suggests: ${g} adults, of whom ${ab} wear glasses, and ${100 - g} children, of whom ${bb} wear glasses.`,
        who === 'group1-given-trait'
          ? t`${ab + bb} wear glasses, and ${ab} of them are adults: ${math`\frac{${ab}}{${ab + bb}} = ${ans}`}.`
          : t`${aNot + bNot} do not wear glasses, and ${bNot} of them are children: ${math`\frac{${bNot}}{${aNot + bNot}} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ g, r1, r2, who }) => str(who === 'group1-given-trait' ? reverse(pct(g), pct(r1), pct(r2)) : reverse(pct(100 - g), pct(100 - r2), pct(100 - r1))),
  misconceptions: ({ g, r1, r2, who }): Misconception[] => who === 'group1-given-trait'
    ? [
      { response: str(pct(r1)), why: t`That is the chance an adult wears glasses. The question is the reverse: among people with glasses, the share who are adults.` },
      { response: str(pct(g)), why: t`That is the share of adults overall. Knowing the person wears glasses changes it: restrict to the glasses wearers.` },
      { response: str(mul(pct(g), pct(r1))), why: t`That is the chance of an adult with glasses among everyone. Divide by the chance of glasses.` },
    ]
    : [
      { response: str(pct(100 - r2)), why: t`That is the chance a child does not wear glasses. The question asks, among people without glasses, the share who are children.` },
      { response: str(pct(100 - g)), why: t`That is the share of children overall. Restrict to the people without glasses.` },
      { response: str(mul(pct(100 - g), pct(100 - r2))), why: t`That is the chance of a child without glasses among everyone. Divide by the chance of no glasses.` },
    ],
  trial: ({ g, r1, r2, who }, rng) => (who === 'group1-given-trait'
    ? conditionalTrial(rng, pct(g), pct(r1), pct(r2), true, true)
    : conditionalTrial(rng, pct(g), pct(r1), pct(r2), false, false)),
});

/** The two-way table of a population of n, given shares; the four counts to fill. */
function tableSpec(rowNames: readonly [Rich, Rich], colNames: readonly [Rich, Rich], n: number, a: Rational, bGivenA: Rational, bGivenNotA: Rational): Extract<AnswerSpec, { kind: 'table' }> {
  const c = counts(n, a, bGivenA, bGivenNotA);
  return {
    kind: 'table',
    columns: [t``, ...colNames],
    rows: [[rowNames[0], null, null], [rowNames[1], null, null]],
    expected: c.map(String),
    cell: 'exact',
  };
}

interface TableP { n: number; g: number; r1: number; r2: number }

const bayesTable = generator<TableP>({
  id: 'bayes-table',
  skill: 'Fill in a table of counts for a population, the first step of reversing a conditional by a table.',
  params: (rng) => {
    for (;;) {
      const p = { n: pick(rng, [100, 200, 500, 1000]), g: 10 * int(rng, 2, 8), r1: 10 * int(rng, 1, 9), r2: 10 * int(rng, 1, 9) };
      if (p.r1 !== p.r2) return p;
    }
  },
  sane: ({ g, r1, r2 }) => (g >= 20 && g <= 80 && r1 >= 10 && r1 <= 90 && r2 >= 10 && r2 <= 90 && r1 !== r2 ? null : 'out of range'),
  problem: ({ n, g, r1, r2 }) => {
    const [ab, aNot, bb, bNot] = counts(n, pct(g), pct(r1), pct(r2));
    return {
      prompt: t`In a town of ${n} people, ${g}% are over sixty. Of those over sixty, ${r1}% have had a flu jab; of the rest, ${r2}%. Fill in the number of people in each cell.`,
      answer: tableSpec([t`over sixty`, t`sixty or under`], [t`jab`, t`no jab`], n, pct(g), pct(r1), pct(r2)),
      solution: [
        t`Over sixty: ${g}% of ${n} is ${ab + aNot}. Of them, ${r1}% is ${ab} with a jab, leaving ${aNot}.`,
        t`Sixty or under: ${n - ab - aNot} people. Of them, ${r2}% is ${bb} with a jab, leaving ${bNot}.`,
        t`Check: ${math`${ab} + ${aNot} + ${bb} + ${bNot} = ${n}`}. From here any conditional probability is one cell over a row or column total.`,
      ],
    };
  },
  solve: ({ n, g, r1, r2 }) => {
    // Build the town person by person and count.
    const people = Array.from({ length: n }, (_, i) => {
      const old = i < (n * g) / 100;
      const within = old ? i : i - (n * g) / 100;
      const groupSize = old ? (n * g) / 100 : n - (n * g) / 100;
      return { old, jab: within < (groupSize * (old ? r1 : r2)) / 100 };
    });
    const cnt = (o: boolean, j: boolean): string => String(people.filter((p) => p.old === o && p.jab === j).length);
    return [cnt(true, true), cnt(true, false), cnt(false, true), cnt(false, false)];
  },
  misconceptions: ({ n, g, r1, r2 }): Misconception[] => {
    const wrong1 = [Math.round((n * r1) / 100), n * g / 100 - Math.round((n * r1) / 100), Math.round((n * r2) / 100), n - n * g / 100 - Math.round((n * r2) / 100)];
    const swapped = counts(n, pct(g), pct(r2), pct(r1));
    const right = counts(n, pct(g), pct(r1), pct(r2));
    return [
      { response: wrong1.map(String), why: t`The jab rates are shares of each age group, not of the whole town: take ${r1}% of the people over sixty, not of all ${n}.` },
      { response: swapped.map(String), why: t`The two jab rates are swapped between the age groups.` },
      { response: [right[1], right[0], right[3], right[2]].map(String), why: t`Check which column is which: the first column counts the people who had the jab.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const A6 = 'step-f06';
const MEN = pct(40);
const SMOKE_MEN = pct(50);
const SMOKE_WOMEN = pct(30);
const smokers = (wantMan: boolean, wantSmoker: boolean): Rational => {
  // P(man or woman, given smoker or not), from the shares, by Bayes's rule for two groups.
  const pS = (man: boolean): Rational => (man ? SMOKE_MEN : SMOKE_WOMEN);
  const joint = (man: boolean): Rational => mul(man ? MEN : sub(q(1), MEN), wantSmoker ? pS(man) : sub(q(1), pS(man)));
  return div(joint(wantMan), add(joint(true), joint(false)));
};
const smokingIntro = t`A study of a large population found that ${40}% were men and ${60}% were women. Of the men ${50}% were smokers, and of the women ${30}% were smokers. A person is picked at random (any person is as likely to be picked as any other).`;
const smokeCounts = counts(100, MEN, SMOKE_MEN, SMOKE_WOMEN);

const a6Table = auto({
  id: 'a6-q4-i-table',
  source: cite(A6, 'Q4(i), the population of 100 the question suggests', true),
  title: t`A table of ${100} people`,
  prompt: t`${smokingIntro} Model the population by ${100} people and fill in how many are in each cell.`,
  answer: tableSpec([t`men`, t`women`], [t`smokers`, t`non-smokers`], 100, MEN, SMOKE_MEN, SMOKE_WOMEN),
  solution: [
    t`${40} men, of whom ${50}% smoke: ${smokeCounts[0]} smokers and ${smokeCounts[1]} non-smokers.`,
    t`${60} women, of whom ${30}% smoke: ${smokeCounts[2]} smokers and ${smokeCounts[3]} non-smokers.`,
    t`Every probability in the question is now a count over a count.`,
  ],
  reference: smokeCounts.map(String),
  verify: () => same('A6 Q4(i) counts', smokeCounts.join(), '20,20,18,42'),
});

const a6d = auto({
  id: 'a6-q4-i-d',
  source: cite(A6, 'Q4(i)(d)'),
  title: t`A woman, given a smoker`,
  prompt: t`${smokingIntro} Given that the person picked is a smoker, show that the probability that she is a woman is ${q(9, 19)}: work it out.`,
  answer: { kind: 'exact', expected: str(smokers(false, true)) },
  solution: [
    t`In the population of ${100}: ${smokeCounts[0]} men and ${smokeCounts[2]} women smoke, so ${smokeCounts[0] + smokeCounts[2]} are smokers.`,
    t`Given a smoker, restrict to those ${smokeCounts[0] + smokeCounts[2]}: ${smokeCounts[2]} are women, so ${math`P(\text{woman} \mid \text{smoker}) = \frac{${smokeCounts[2]}}{${smokeCounts[0] + smokeCounts[2]}} = ${q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])}`}.`,
    t`The hints give the formula version: ${math`P(W \mid S) = \frac{P(W \cap S)}{P(S)} = \frac{${0.18}}{${0.38}}`}. Note ${math`P(\text{smoker} \mid \text{woman}) = ${SMOKE_WOMEN}`} is a different number.`,
  ],
  reference: str(q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])),
  verify: () => same('A6 Q4(i)(d) by counting', str(q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])), str(q(9, 19))),
  misconceptions: [{ response: str(SMOKE_WOMEN), why: t`That is ${math`P(\text{smoker} \mid \text{woman})`}. Here the condition is "smoker": among smokers, what share are women?` }],
  official: { source: cite('step-f06-hints', 'Q4(i)(d)'), answer: '18/38', agrees: true },
});

const a6e = auto({
  id: 'a6-q4-i-e',
  source: cite(A6, 'Q4(i)(e)'),
  title: t`A man, given a non-smoker`,
  prompt: t`${smokingIntro} Given that the person picked is a non-smoker, find the probability that he or she is a man.`,
  answer: { kind: 'exact', expected: str(smokers(true, false)) },
  solution: [
    t`Non-smokers: ${smokeCounts[1]} men and ${smokeCounts[3]} women, ${smokeCounts[1] + smokeCounts[3]} in all.`,
    t`So ${math`P(\text{man} \mid \text{non-smoker}) = \frac{${smokeCounts[1]}}{${smokeCounts[1] + smokeCounts[3]}} = ${q(smokeCounts[1], smokeCounts[1] + smokeCounts[3])}`}.`,
  ],
  reference: str(q(smokeCounts[1], smokeCounts[1] + smokeCounts[3])),
  verify: () => same('A6 Q4(i)(e) two ways', str(smokers(true, false)), str(q(smokeCounts[1], smokeCounts[1] + smokeCounts[3]))),
  misconceptions: [{ response: str(sub(q(1), SMOKE_MEN)), why: t`That is the chance a man does not smoke. The question asks, among non-smokers, the share who are men.` }],
  official: { source: cite('step-f06-hints', 'Q4(i)(e)'), answer: '10/31', agrees: true },
});

const a6abc = auto({
  id: 'a6-q4-i-abc',
  source: cite(A6, 'Q4(i)(a) to (c)'),
  title: t`Joint, total, and conditional`,
  prompt: t`${smokingIntro} Find each probability.`,
  answer: {
    kind: 'table', cell: 'exact', columns: [t`part`, t`probability`],
    rows: [[t`(a) a female smoker`, null], [t`(b) a non-smoker`, null], [t`(c) a smoker, given a woman`, null]],
    expected: [str(mul(sub(q(1), MEN), SMOKE_WOMEN)), str(add(mul(MEN, sub(q(1), SMOKE_MEN)), mul(sub(q(1), MEN), sub(q(1), SMOKE_WOMEN)))), str(SMOKE_WOMEN)],
  },
  solution: [
    t`(a) Women and smokers: ${smokeCounts[2]} of ${100}, ${q(smokeCounts[2], 100)}.`,
    t`(b) Non-smokers: ${math`${smokeCounts[1]} + ${smokeCounts[3]} = ${smokeCounts[1] + smokeCounts[3]}`} of ${100}, ${q(smokeCounts[1] + smokeCounts[3], 100)}.`,
    t`(c) Among the ${60} women, ${smokeCounts[2]} smoke: ${q(smokeCounts[2], 60)}, which is the given ${30}%.`,
  ],
  reference: [`${smokeCounts[2]}/${100}`, str(q(smokeCounts[1] + smokeCounts[3], 100)), str(q(smokeCounts[2], 60))],
  verify: () => same('A6 Q4(i)(a) to (c) by counting', [q(smokeCounts[2], 100), q(smokeCounts[1] + smokeCounts[3], 100), q(smokeCounts[2], 60)].map(str).join(), '9/50,31/50,3/10'),
  official: { source: cite('step-f06-hints', 'Q4(i)(a) to (c)'), answer: ['18/100', '62/100', '3/10'], agrees: true },
});

const MATH_D = q(1, 1000);
/** The hints' population of 100,000: with the disease and positive, with it and negative, without it and positive, without it and negative. */
const MC = counts(100000, MATH_D, pct(99), pct(2));
const a6ii = auto({
  id: 'a6-q4-ii',
  source: cite(A6, 'Q4(ii)'),
  title: t`How worried should you be?`,
  prompt: t`The disease "Mathmotitus" affects ${0.1}% of the population. There is a blood test that gives the correct result in ${99}% of people who do have the disease and ${98}% of people who do not have the disease. You have just tested positive. What is the probability that you have the disease? Give it as a fraction.`,
  answer: { kind: 'exact', expected: str(reverse(MATH_D, pct(99), pct(2))) },
  solution: [
    t`Take ${100000} people, as the hints do: ${MC[0] + MC[1]} have the disease and ${MC[2] + MC[3]} do not.`,
    t`Of the ${MC[0] + MC[1]}, ${99}% test positive: ${MC[0]}. Of the ${MC[2] + MC[3]}, ${2}% test positive: ${MC[2]}, the false positives.`,
    t`So ${math`${MC[0]} + ${MC[2]} = ${MC[0] + MC[2]}`} test positive, and ${MC[0]} of them have the disease: ${math`\frac{${MC[0]}}{${MC[0] + MC[2]}} \approx ${MC[0] / (MC[0] + MC[2])}`}. Under ${5}%, although the test looks very accurate.`,
  ],
  reference: '99/2097',
  verify: () => {
    const c = counts(100000, MATH_D, pct(99), pct(2));
    return same('A6 Q4(ii) by counting 100,000 people', str(q(c[0], c[0] + c[2])), str(reverse(MATH_D, pct(99), pct(2))));
  },
  misconceptions: [
    { response: '99/100', why: t`That is ${math`P(\text{positive} \mid \text{disease})`}. You need the reverse, ${math`P(\text{disease} \mid \text{positive})`}: the false positives from the much larger healthy group swamp the true ones.` },
    { response: '1/1000', why: t`That is the chance before the test. The positive result raises it, but only to under ${5}%.` },
  ],
  official: { source: cite('step-f06-hints', 'Q4(ii)'), answer: '99/2097', agrees: true },
});

const a6discussion = supervision({
  id: 'a6-discussion',
  source: cite(A6, 'Q4, Discussion', true),
  title: t`Which probability matters?`,
  prompt: t`For the blood test above, explain the difference between ${math`P(\text{positive} \mid \text{disease})`} and ${math`P(\text{disease} \mid \text{positive})`}, and which one matters to a patient who has just tested positive. Then explain, in the same terms, why a court must consider ${math`P(\text{innocent} \mid \text{matching DNA evidence})`} rather than ${math`P(\text{matching DNA evidence} \mid \text{innocent})`}: the prosecutor's fallacy.`,
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q4(ii)'),
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'P(woman | smoker) in STEP Support Assignment 6 Q4(i)', exact: smokers(false, true), trial: (rng) => conditionalTrial(rng, MEN, SMOKE_MEN, SMOKE_WOMEN, false, true) },
  { what: 'P(disease | positive) for Mathmotitus', exact: reverse(MATH_D, pct(99), pct(2)), trial: (rng) => conditionalTrial(rng, MATH_D, pct(99), pct(2), true, true) },
];

export const bayesTwoEvents: TopicContent = {
  topicId: 'prob.bayes-two-events',
  goal: t`Reverse a conditional probability with a table of counts or a tree, and never confuse ${math`P(A \mid B)`} with ${math`P(B \mid A)`}.`,
  lesson: [
    { kind: 'p', text: t`STEP Support Assignment ${6} asks: ${40}% of a population are men, ${50}% of the men smoke, and ${30}% of the women. Given that a person smokes, how likely is it to be a woman? The data give smoking given sex; the question asks sex given smoking. Reversing a conditional probability like this needs no new formula, only careful counting.` },
    {
      kind: 'table', caption: t`The assignment's suggestion: model the population by ${100} people.`,
      head: [t``, t`smoker`, t`non-smoker`, t`total`],
      rows: [
        [t`men`, t`${smokeCounts[0]}`, t`${smokeCounts[1]}`, t`${40}`],
        [t`women`, t`${smokeCounts[2]}`, t`${smokeCounts[3]}`, t`${60}`],
        [t`total`, t`${smokeCounts[0] + smokeCounts[2]}`, t`${smokeCounts[1] + smokeCounts[3]}`, t`${100}`],
      ],
    },
    { kind: 'p', text: t`Given a smoker, keep only the smokers column: ${smokeCounts[2]} of its ${smokeCounts[0] + smokeCounts[2]} are women, so ${math`P(\text{woman} \mid \text{smoker}) = ${q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])}`}. Compare ${math`P(\text{smoker} \mid \text{woman}) = ${SMOKE_WOMEN}`}: a different question, a different number.` },
    { kind: 'rule', text: t`In symbols, the count over the column total is ${dmath`P(A \mid B) = \frac{P(A \cap B)}{P(B)} = \frac{P(B \mid A)\,P(A)}{P(B \mid A)\,P(A) + P(B \mid \text{not } A)\,P(\text{not } A)}.`} The top is the branch of the tree through ${math`A`} and ${math`B`}; the bottom adds every branch that ends in ${math`B`}.` },
    { kind: 'p', text: t`Medical tests are the classic case. A test can be wrong two ways: a [[false-positive|false positive]] (positive, but no disease) or a false negative. Its [[sensitivity|sensitivity]] is ${math`P(\text{positive} \mid \text{disease})`}, the share of people with the disease it catches; its [[specificity|specificity]] is ${math`P(\text{negative} \mid \text{no disease})`}.` },
    { kind: 'p', text: t`For "Mathmotitus" (${0.1}% of people have it; sensitivity ${99}%, specificity ${98}%), only ${math`\frac{${MC[0]}}{${MC[0] + MC[2]}} = ${reverse(MATH_D, pct(99), pct(2))}`} of people who test positive have it, under ${5}%. The healthy group is so much larger that its ${2}% of false positives outnumber the true ones.` },
    { kind: 'p', text: t`Mistaking ${math`P(B \mid A)`} for ${math`P(A \mid B)`} has a name, the [[prosecutors-fallacy|prosecutor's fallacy]]: "the chance of this evidence if the accused is innocent is tiny" is not "the chance the accused is innocent, given this evidence, is tiny". A court needs the second.` },
  ],
  examples: [
    workedCambridge(a6Table),
    workedCambridge(a6d),
    worked(diagnostic, { per: 200, sens: 95, spec: 96 }, t`A screening test`),
  ],
  generators: [diagnostic, groups, bayesTable],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['false-positive', 'sensitivity', 'specificity', 'prosecutors-fallacy'],
  cambridge: [a6abc, a6e, a6ii, a6discussion],
  gate: ['a6-q4-i-abc', 'a6-q4-i-e', 'a6-q4-ii', 'a6-discussion'],
  claims,
};
