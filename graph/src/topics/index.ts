/**
 * The shared knowledge graph: every topic of every course, defined once (design decision
 * 10). One file per area; a topic's `area` is its file name.
 *
 * Every `sources[].section` is the heading as printed in the cited document; `note` says
 * which line of the section the topic comes from, or why a topic the section does not
 * name is here. A topic taught by several courses cites each of them. Encompass weights:
 * about 0.6 to 0.7 when the topic exercises the prerequisite in every problem, about 0.3
 * to 0.5 when it leans on it in some steps, and 0.2 for a light touch.
 *
 * Order matters only for ties: the engine breaks them by input order. The probability
 * areas come first, in the order the probstats slice was reviewed in, so filtering the
 * graph to IA Probability gives exactly the reviewed array (and SIMULATION.md does not move).
 *
 * Each topic's Cambridge batch 1, batch 2, and Preparation citations (`cambridge-batch-1.ts`,
 * `cambridge-batch-2.ts`, `cambridge-prep.ts`) follow its own sources, in that order. The Part V
 * areas (random variables to limit theorems) come after the older areas and batch 2's topics in
 * older areas end their files; the Preparation areas (functions and graphs to functional
 * programming) come last and its topics in older areas end their files, so the relative order
 * of the earlier topics is unchanged.
 */
import type { Topic } from '@learnhub/mastery';
import { analysis } from './analysis';
import { CAMBRIDGE_BATCH_1 } from './cambridge-batch-1';
import { CAMBRIDGE_BATCH_2 } from './cambridge-batch-2';
import { CAMBRIDGE_PREP } from './cambridge-prep';
import { calculus } from './calculus';
import { conditioning } from './conditioning';
import { continuous } from './continuous';
import { coordinateGeometry } from './coordinate-geometry';
import { counting } from './counting';
import { distributions } from './distributions';
import { elementaryProbability } from './elementary-probability';
import { functionalProgramming } from './functional-programming';
import { functionsAndGraphs } from './functions-and-graphs';
import { furtherAlgebra } from './further-algebra';
import { generatingFunctions } from './generating-functions';
import { iaAxiomatic } from './ia-axiomatic';
import { iaBasicConcepts } from './ia-basic-concepts';
import { limitTheorems } from './limit-theorems';
import { logic } from './logic';
import { numberAndAlgebra } from './number-and-algebra';
import { numberTheory } from './number-theory';
import { proof } from './proof';
import { randomProcesses } from './random-processes';
import { randomVariables } from './random-variables';
import { sequencesAndSeries } from './sequences-and-series';
import { sets } from './sets';
import { trigonometry } from './trigonometry';

/** Area name to its topics, in graph order. */
const AREA_TOPICS: Readonly<Record<string, readonly Topic[]>> = {
  'number-and-algebra': numberAndAlgebra,
  'sequences-and-series': sequencesAndSeries,
  calculus,
  analysis,
  sets,
  counting,
  'elementary-probability': elementaryProbability,
  distributions,
  'ia-basic-concepts': iaBasicConcepts,
  'ia-axiomatic': iaAxiomatic,
  conditioning,
  logic,
  proof,
  'number-theory': numberTheory,
  'random-variables': randomVariables,
  continuous,
  'generating-functions': generatingFunctions,
  'random-processes': randomProcesses,
  'limit-theorems': limitTheorems,
  'functions-and-graphs': functionsAndGraphs,
  'coordinate-geometry': coordinateGeometry,
  trigonometry,
  'further-algebra': furtherAlgebra,
  'functional-programming': functionalProgramming,
};

const withCambridge = (t: Topic): Topic => {
  const more = [...(CAMBRIDGE_BATCH_1[t.id] ?? []), ...(CAMBRIDGE_BATCH_2[t.id] ?? []), ...(CAMBRIDGE_PREP[t.id] ?? [])];
  return more.length === 0 ? t : { ...t, sources: [...t.sources, ...more] };
};

export const AREAS: Readonly<Record<string, readonly Topic[]>> = Object.fromEntries(
  Object.entries(AREA_TOPICS).map(([area, ts]) => [area, ts.map(withCambridge)]),
);

export const topics: readonly Topic[] = Object.values(AREAS).flat();
