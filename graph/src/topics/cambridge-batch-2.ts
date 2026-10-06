/**
 * Cambridge batch 2 citations: where each Part V topic, each new analysis toolkit topic, and
 * the four distribution topics of the Axiomatic approach are taught or practised in the
 * sources of the second batch, from the source-to-topic map (graph/reviews/cambridge-batch-2.md,
 * 2026-10-05). Same form as `cambridge-batch-1.ts`; `topics/index.ts` appends these after
 * each topic's own sources and its batch 1 citations.
 *
 * Every `doc` is a source id of scripts/sources/batch-2.json (and of sources/manifest.json),
 * except `step-f19`, a batch 1 source the batch 2 map gives a new home. The `section` is a
 * question for the STEP Support modules (with the original paper in brackets) and the IA
 * example sheets, and a page for the STEP topic notes. Existing topics the map also cites
 * (for example `prob.independence`, `comb.combinations`) are not listed yet.
 */
import type { TopicSource } from '@learnhub/mastery';
import { CAMBRIDGE_COURSE, type CambridgeDoc } from '../sources';

const c = (doc: CambridgeDoc, section: string, note?: string): TopicSource =>
  note === undefined
    ? { doc, course: CAMBRIDGE_COURSE[doc], section, verified: true }
    : { doc, course: CAMBRIDGE_COURSE[doc], section, note, verified: true };

const mixed = (where: string, note?: string): TopicSource => c('step-mixed-stats1', where, note);
const s2 = (where: string, note?: string): TopicSource => c('step-s2-stats', where, note);
const s2notes = (where: string, note?: string): TopicSource => c('step-s2-stats-notes', where, note);
const s3 = (where: string, note?: string): TopicSource => c('step-s3-stats', where, note);
const s3notes = (where: string, note?: string): TopicSource => c('step-s3-stats-notes', where, note);
const sheet2 = (where: string, note?: string): TopicSource => c('ia-prob-sheet-2', where, note);
const sheet3 = (where: string, note?: string): TopicSource => c('ia-prob-sheet-3', where, note);
const sheet4 = (where: string, note?: string): TopicSource => c('ia-prob-sheet-4', where, note);

/**
 * The topics batch 2 adds: 38 for Part V and 8 for the analysis toolkit. None is a course
 * target yet (see `IA_PROB_PART_V` in sources.ts), so they sit outside both course closures.
 */
export const BATCH_2_NEW_TOPICS: readonly string[] = [
  // STEP statistics
  'rv.expectation', 'rv.tail-sum', 'comb.restricted-arrangements', 'prob.first-step', 'pre.quadratic-equations',
  'rv.variance', 'prob.poisson-rates', 'rv.pdf', 'rv.continuous-summaries', 'rv.cdf-method', 'prob.normal-distribution',
  'prob.normal-approximation', 'rv.expectation-algebra', 'rv.indicators', 'alg.arithmetico-geometric',
  // IA Probability: Discrete random variables
  'rv.random-variables', 'rv.expectation-general', 'rv.independence', 'rv.covariance', 'rv.conditional-expectation',
  'gf.pgf', 'gf.random-sums', 'gf.combinatorial', 'alg.linear-recurrences', 'rw.gamblers-ruin', 'rw.absorption-time',
  'bp.extinction',
  // IA Probability: Continuous random variables
  'prob.exponential-distribution', 'rv.joint-densities', 'rv.transformations', 'prob.geometric-probability',
  'rv.simulation', 'rv.bivariate-normal',
  // IA Probability: Inequalities and limits
  'ineq.markov-chebyshev', 'ineq.jensen', 'lim.weak-law', 'gf.mgf', 'lim.clt',
  // analysis toolkit
  'calc.differentiation-rules', 'calc.substitution', 'calc.improper-integrals', 'calc.convexity',
  'an.absolute-convergence', 'an.power-series', 'calc.double-integrals', 'calc.jacobians',
];

export const CAMBRIDGE_BATCH_2: Readonly<Record<string, readonly TopicSource[]>> = {
  // ---------------------------------------------------------------- the Axiomatic approach's distributions
  'prob.point-mass-spaces': [sheet2('Q13', 'The zeta distribution on the positive integers.')],
  'prob.poisson-distribution': [
    s2notes('pages 2 and 4', 'Mean equals variance; the conditions for a Poisson model; the probabilities sum to 1 by the exponential series.'),
    s2('Q1 (2003 S2 Q13)', 'The zero-truncated Poisson.'),
  ],
  'prob.geometric-distribution': [
    s3notes('pages 1 and 2', 'Given "for interest": not on the 2019 STEP specification.'),
    s3('Q2 (2010 S3 Q12)'),
    sheet2('Q11', 'The coupon collector, as a sum of geometric waits.'),
    sheet3('Q5', 'The negative binomial as a sum of geometrics.'),
  ],
  'prob.poisson-binomial-limit': [s2notes('page 2', 'The Poisson approximation to the binomial.')],

  // ---------------------------------------------------------------- STEP: Mixed STEP 1, STEP 2, STEP 3 Statistics
  'rv.expectation': [
    mixed('Q1(i), Q2 (2010 S1 Q12), Q4 (2009 S1 Q13)', 'Q1 defines expectation: it "used to be on most A-level specifications".'),
    s2notes('pages 2 and 4'),
    s2('Q3(ii), (iii) (2011 S2 Q12)', 'A fair stake: zero expected gain.'),
    s3('Q1 (2007 S3 Q13), Q2 (2010 S3 Q12)'),
    c('step-f19', 'Assignment 19, Q4(ii)', 'The bet, expected gain 17/216: left without a topic in batch 1.'),
  ],
  'rv.tail-sum': [mixed('Q2 (2010 S1 Q12)', 'Show E(X) is the sum of P(X >= n); the penguins.')],
  'comb.restricted-arrangements': [
    mixed('Q3', 'Six women and four men in a line: blocks, gaps, and ends.'),
    mixed('Q4 (2009 S1 Q13), Q5 (1995 S1 Q12)'),
  ],
  'prob.first-step': [
    mixed('Q12, Q13 (2015 S2 Q12)'),
    s2('Q3(i) (2011 S2 Q12)'),
    s3('Q1 (2007 S3 Q13), Q2 (2010 S3 Q12)'),
    sheet2('Q3, Q4'),
  ],
  'pre.quadratic-equations': [s2('Q5 (2010 S1 Q13)', 'Assumed, not taught: a quadratic in e^lambda.')],
  'rv.variance': [s2('Q1 (2003 S2 Q13)'), s2notes('page 2')],
  'prob.poisson-rates': [
    s2('Q4 (2012 S2 Q13), Q5 (2010 S1 Q13)'),
    s2notes('page 2', 'Scaling with the interval; sums of independent Poissons.'),
    sheet2('Q6, Q7'),
    sheet4('Q13'),
  ],
  'rv.pdf': [s2('Q2 (2007 S2 Q14), Q6 (2010 S2 Q13)'), s2notes('page 3')],
  'rv.continuous-summaries': [
    s2('Q2(iii) (2007 S2 Q14), Q4 (2012 S2 Q13), Q6 (2010 S2 Q13)'),
    s2notes('page 3'),
    s3('Q4 (2005 S3 Q14)'),
    sheet4('Q9'),
  ],
  'rv.cdf-method': [
    s2('Q4 (2012 S2 Q13)'),
    s3('Q4 (2005 S3 Q14)'),
    s3notes('page 1', 'The density of Y = X^2 from its distribution function.'),
    sheet4('Q3, Q10'),
  ],
  'prob.normal-distribution': [s2notes('page 3'), sheet4('Q5, Q6(a)')],
  'prob.normal-approximation': [s2('Q1 (2003 S2 Q13)', 'With a continuity correction.'), s2notes('page 3')],
  'rv.expectation-algebra': [s3notes('page 1'), s3('Q3 (2013 S3 Q12)')],
  'rv.indicators': [s3('Q3 (2013 S3 Q12)'), sheet2('Q9, Q10, Q12')],
  'alg.arithmetico-geometric': [
    s3('Q2 (2010 S3 Q12)'),
    s3notes('pages 1 and 2', 'E(X) = 1/p for the geometric distribution, by differentiating the geometric series.'),
  ],

  // ---------------------------------------------------------------- IA Probability: Discrete random variables
  'rv.random-variables': [sheet2('Q5')],
  'rv.expectation-general': [sheet2('Q8, Q10, Q11'), sheet3('Q6, Q7')],
  'rv.independence': [sheet2('Q5, Q7(b), Q12'), sheet3('Q7')],
  'rv.covariance': [sheet2('Q8, Q9, Q12'), sheet3('Q4'), sheet4('Q5, Q12')],
  'rv.conditional-expectation': [sheet2('Q6, Q7(b)'), sheet3('Q8')],
  'gf.pgf': [sheet3('Q5')],
  'gf.random-sums': [sheet3('Q8(a), (b), Q10')],
  'alg.linear-recurrences': [sheet3('Q11'), s3('Q1(iii) (2007 S3 Q13)')],
  'rw.gamblers-ruin': [sheet3('Q8(c)')],
  'rw.absorption-time': [sheet3('Q8(c)', 'T is unbounded, so part (a) needs a truncation step (batch 2, question 8).'), s3('Q1 (2007 S3 Q13)')],
  'bp.extinction': [sheet3('Q9, Q12')],

  // ---------------------------------------------------------------- IA Probability: Continuous random variables
  'prob.exponential-distribution': [sheet4('Q3, Q4, Q8')],
  'rv.joint-densities': [sheet4('Q1, Q2, Q4')],
  'rv.transformations': [sheet4('Q7, Q8, Q9')],
  'prob.geometric-probability': [sheet4('Q1, Q2, Q10')],
  'rv.bivariate-normal': [sheet4('Q7, Q12')],

  // ---------------------------------------------------------------- IA Probability: Inequalities and limits
  'ineq.markov-chebyshev': [sheet3('Q2, Q3(a), Q4')],
  'ineq.jensen': [sheet3('Q1')],
  'lim.weak-law': [sheet3('Q13')],
  'gf.mgf': [sheet3('Q2, Q3(a)'), sheet4('Q6(a)')],
  'lim.clt': [sheet4('Q6(b), Q11, Q13')],

  // ---------------------------------------------------------------- analysis toolkit
  'calc.differentiation-rules': [s2('Q3(i) (2011 S2 Q12)')],
  'calc.substitution': [s2('Q4 (2012 S2 Q13)'), s3('Q4 (2005 S3 Q14)', 'The substitution u = k^2/x.')],
  'calc.improper-integrals': [s2('Q4 (2012 S2 Q13)'), s3('Q4 (2005 S3 Q14)')],
};
