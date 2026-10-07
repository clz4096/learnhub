/**
 * prob.bayes-two-events: Reversing a conditional probability, at STEP level, by tables and
 * trees (batch 1 decision 7). From STEP Support Assignment 6 Q4 and its Discussion (a
 * population of 100 people; the blood test for "Mathmotitus"; false positives and
 * negatives; P(test positive | disease) is not P(disease | test positive)) and the hints'
 * note on the prosecutor's fallacy.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type AnswerSpec, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

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
/** The lesson's own screening test: 1 in 50 ill, sensitivity 90%, specificity 95%, over 5,000 people. */
const LT = { per: 50, sens: 90, spec: 95, pop: 5000 };
const LC = counts(LT.pop, q(1, LT.per), pct(LT.sens), pct(100 - LT.spec));

export const bayesTwoEvents: TopicContent = {
  topicId: 'prob.bayes-two-events',
  goal: t`Reverse a conditional probability with a table of counts or a tree, and never confuse ${math`P(A \mid B)`} with ${math`P(B \mid A)`}.`,
  objective: t`Turn ${math`P(B \mid A)`} into ${math`P(A \mid B)`} with a table of counts or a tree, and avoid confusing them.`,
  why: t`It is the logic of medical tests and evidence in court, and the two-cause case of Bayes's formula.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A very accurate test` },
    { kind: 'hook', text: t`A disease affects ${0.1}% of people. A blood test is right for ${99}% of people who have it and ${98}% of people who don't. You test positive. How worried should you be? Instinct says about ${99}% worried. STEP Support Assignment ${6} shows the true answer is under ${5}%.` },
    { kind: 'narrative', text: t`The test told you ${math`P(\text{positive} \mid \text{disease})`}: how often the ill test positive. You want ${math`P(\text{disease} \mid \text{positive})`}: how often the positive are ill. Same two events, opposite order, and the numbers can be wildly different. This lesson is about turning a conditional probability round correctly.` },
    { kind: 'section', title: t`Count a population` },
    { kind: 'narrative', text: t`Start with the assignment's gentler example. ${40}% of a population are men; ${50}% of the men smoke and ${30}% of the women do. Given that someone smokes, how likely is it to be a woman? The trick the assignment suggests: imagine ${100} actual people.` },
    {
      kind: 'table', caption: t`The population as ${100} people.`,
      head: [t``, t`smoker`, t`non-smoker`, t`total`],
      rows: [
        [t`men`, t`${smokeCounts[0]}`, t`${smokeCounts[1]}`, t`${40}`],
        [t`women`, t`${smokeCounts[2]}`, t`${smokeCounts[3]}`, t`${60}`],
        [t`total`, t`${smokeCounts[0] + smokeCounts[2]}`, t`${smokeCounts[1] + smokeCounts[3]}`, t`${100}`],
      ],
    },
    { kind: 'p', text: t`Each row comes straight from the data: ${50}% of the ${40} men is ${smokeCounts[0]}, and ${30}% of the ${60} women is ${smokeCounts[2]}. Now "given a smoker" means: keep only the smokers column, ${smokeCounts[0] + smokeCounts[2]} people. ${smokeCounts[2]} of them are women, so ${math`P(\text{woman} \mid \text{smoker}) = \frac{${smokeCounts[2]}}{${smokeCounts[0] + smokeCounts[2]}} = ${q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])}`}. Compare ${math`P(\text{smoker} \mid \text{woman}) = ${SMOKE_WOMEN}`}: the condition picks which total you divide by.` },
    { kind: 'section', title: t`The formula behind the table` },
    { kind: 'narrative', text: t`The table is a formula in disguise. Here it is, written for two events.` },
    { kind: 'theorem', name: t`Reversing a conditional`, statement: t`Let ${math`A`} and ${math`B`} be events with ${math`${0} < P(A) < ${1}`} and ${math`P(B) > ${0}`}. Then ${dmath`P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B \mid A)\,P(A) + P(B \mid A^{c})\,P(A^{c})}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Definition`, text: t`${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`}.`, plain: t`In the table: the cell over the column total.` },
        { label: t`The top`, text: t`${math`P(A \cap B) = P(B \mid A)\,P(A)`}, by the definition of ${math`P(B \mid A)`}, since ${math`P(A) > ${0}`}.`, plain: t`${50}% of the ${40}% who are men: the cell ${smokeCounts[0]}.` },
        { label: t`The bottom`, text: t`${math`B`} is the disjoint union of ${math`A \cap B`} and ${math`A^{c} \cap B`}, so ${math`P(B) = P(B \mid A)P(A) + P(B \mid A^{c})P(A^{c})`}.`, plain: t`The column total is the sum of its two cells.`, why: { q: t`Why is ${math`P(A^{c} \cap B) = P(B \mid A^{c})P(A^{c})`}?`, a: t`The same rule as the top, applied to ${math`A^{c}`}; it needs ${math`P(A^{c}) > ${0}`}, which is why ${math`P(A) < ${1}`} is assumed.` } },
        { label: t`Divide`, text: t`Substitute the top and bottom into the definition.` },
      ],
    },
    { kind: 'p', text: t`On a tree, the first split is ${math`A`} or ${math`A^{c}`} and the second is ${math`B`} or not. The top of the formula is the one branch through ${math`A`} and ${math`B`}; the bottom adds every branch that ends in ${math`B`}.` },
    { kind: 'section', title: t`Tests and false positives` },
    {
      kind: 'definition',
      name: t`Sensitivity, specificity, false positive`,
      formal: t`For a test for a condition ${math`D`}, the [[sensitivity|sensitivity]] is ${math`P(\text{positive} \mid D)`} and the [[specificity|specificity]] is ${math`P(\text{negative} \mid D^{c})`}. A [[false-positive|false positive]] is a positive result for someone without ${math`D`}; a false negative is a negative result for someone with it.`,
      plain: t`Sensitivity: the share of ill people the test catches. Specificity: the share of healthy people it clears.`,
    },
    { kind: 'p', text: t`Take a screening test with sensitivity ${LT.sens}% and specificity ${LT.spec}%, for a condition affecting ${1} person in ${LT.per}. Imagine ${LT.pop} people: ${LT.pop / LT.per} are ill and ${LT.pop - LT.pop / LT.per} are not. Of the ill, ${LC[0]} test positive. Of the healthy, ${100 - LT.spec}% test positive: ${LC[2]} false positives. So of ${LC[0] + LC[2]} positives only ${LC[0]} are ill: ${math`\frac{${LC[0]}}{${LC[0] + LC[2]}} = ${q(LC[0], LC[0] + LC[2])}`}. The healthy group is so much bigger that even its small error rate swamps the true positives.` },
    checkFrom(diagnostic, { per: 100, sens: 90, spec: 95 }, t`Of ${10000} people, ${100} are ill and ${90} of them test positive; ${5}% of the ${9900} healthy give ${495} false positives; ${math`\frac{${90}}{${90 + 495}} = ${q(90, 585)}`}.`),
    {
      kind: 'definition',
      name: t`Prosecutor's fallacy`,
      formal: t`The [[prosecutors-fallacy|prosecutor's fallacy]] is to treat ${math`P(E \mid I)`}, the probability of the evidence ${math`E`} if the accused is innocent, as if it were ${math`P(I \mid E)`}, the probability of innocence given the evidence.`,
      plain: t`"A match this good happens to only one innocent person in a million" does not mean "there is only a one in a million chance the accused is innocent". In a city of millions, several innocent people would match.`,
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A test that is right ${99}% of the time gives a positive that is right ${99}% of the time.`, counterexample: t`With the screening test above, a positive is right only ${q(LC[0], LC[0] + LC[2])} of the time. The answer depends on how common the condition is, not only on the test.` },
    { kind: 'pitfall', claim: t`${math`P(\text{smoker} \mid \text{woman}) = P(\text{woman} \mid \text{smoker})`}.`, counterexample: t`In the table they are ${SMOKE_WOMEN} and ${q(smokeCounts[2], smokeCounts[0] + smokeCounts[2])}: you divide ${smokeCounts[2]} by ${60} for one and by ${smokeCounts[0] + smokeCounts[2]} for the other.` },
    { kind: 'takeaway', text: t`To reverse a conditional, count: restrict to the people the condition describes, and divide by their total, not by the other one.` },
  ],
  examples: [
    { ...workedCambridge(a6Table), examiner: t`The examiner looks for every cell computed from the right percentage of the right group, and totals that check.` },
    { ...workedCambridge(a6d), examiner: t`The examiner looks for the restriction to smokers stated, and the given ${math`P(\text{smoker} \mid \text{woman})`} not mistaken for the answer.` },
    worked(diagnostic, { per: 200, sens: 95, spec: 96 }, t`A screening test`),
  ],
  generators: [diagnostic, groups, bayesTable],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['false-positive', 'sensitivity', 'specificity', 'prosecutors-fallacy'],
  cambridge: withUses([a6abc, a6e, a6ii, a6discussion], {
    'a6-q4-ii': { sections: ['Count a population', 'Tests and false positives'], note: t`Reversing a conditional probability for a test` },
    'a6-discussion': { sections: ['Tests and false positives', 'Where it breaks'], note: t`Telling the two conditional probabilities apart` },
    'a6-q4-i-e': { sections: ['Count a population', 'The formula behind the table'], note: t`Reversing a condition by counting a population` },
  }),
  gate: ['a6-q4-ii', 'a6-discussion', 'a6-q4-i-e'],
  claims,
  recall: [
    { front: t`${math`P(A \mid B)`} in terms of ${math`P(B \mid A)`}, for two events.`, back: t`${math`\frac{P(B \mid A)P(A)}{P(B \mid A)P(A) + P(B \mid A^{c})P(A^{c})}`}.` },
    { front: t`Sensitivity and specificity of a test.`, back: t`Sensitivity ${math`P(\text{positive} \mid D)`}; specificity ${math`P(\text{negative} \mid D^{c})`}.` },
    { front: t`The prosecutor's fallacy.`, back: t`Confusing ${math`P(\text{evidence} \mid \text{innocent})`} with ${math`P(\text{innocent} \mid \text{evidence})`}.` },
  ],
  proofOrder: [
    {
      title: t`Reversing a conditional`,
      steps: [
        t`By definition, ${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`}.`,
        t`The top is ${math`P(B \mid A)P(A)`}.`,
        t`Split ${math`B`} into ${math`A \cap B`} and ${math`A^{c} \cap B`}: the bottom is ${math`P(B \mid A)P(A) + P(B \mid A^{c})P(A^{c})`}.`,
        t`Substitute both into the definition.`,
      ],
    },
  ],
};
