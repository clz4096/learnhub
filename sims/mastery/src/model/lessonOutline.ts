/**
 * A lesson as the learner moves through it (TEACHING-STYLE.md, "How it looks"): a list of
 * named sections, read one at a time. The lesson's own sections come first (its `section`
 * blocks; a lesson written before sections is one section, "The idea"), then the worked
 * examples, the practice ("Try one yourself"), and the Cambridge problem. The header lists
 * them as the outline and the top bar shows one segment for each; neither shows counts.
 */
import { lessonSections, t, type Rich, type TopicContent } from '@learnhub/content';
import type { LessonStage } from './lessonState';

export interface OutlineEntry {
  stage: LessonStage;
  /** For a `learn` entry, the index of its section in `lessonSections`; 0 otherwise. */
  section: number;
  title: Rich;
}

/** The names of the stages after the lesson's own sections. */
export const STAGE_TITLES: Readonly<Record<Exclude<LessonStage, 'learn'>, string>> = {
  examples: 'Worked examples',
  practice: 'Try one yourself',
  cambridge: 'The Cambridge problem',
};

/** The name of a lesson written before sections, which is one section. */
export const UNTITLED_SECTION = 'The idea';

export function lessonOutline(c: TopicContent): OutlineEntry[] {
  const out: OutlineEntry[] = lessonSections(c.lesson).map((s, i) => ({ stage: 'learn', section: i, title: s.title ?? t`${UNTITLED_SECTION}` }));
  if (c.examples.length > 0) out.push({ stage: 'examples', section: 0, title: t`${STAGE_TITLES.examples}` });
  out.push({ stage: 'practice', section: 0, title: t`${STAGE_TITLES.practice}` });
  if (c.cambridge.length > 0) out.push({ stage: 'cambridge', section: 0, title: t`${STAGE_TITLES.cambridge}` });
  return out;
}

/** The entry for a stage (and, for `learn`, a section); the nearest entry when it is not in the outline. */
export function outlineIndex(outline: readonly OutlineEntry[], stage: LessonStage, section = 0): number {
  const exact = outline.findIndex((e) => e.stage === stage && (stage !== 'learn' || e.section === section));
  if (exact >= 0) return exact;
  // A saved section past the end (the lesson was rewritten), or a stage this lesson lacks: the last entry before it.
  const order: readonly LessonStage[] = ['learn', 'examples', 'practice', 'cambridge'];
  let best = 0;
  outline.forEach((e, i) => {
    if (order.indexOf(e.stage) < order.indexOf(stage) || (e.stage === stage && e.section <= section)) best = i;
  });
  return best;
}
