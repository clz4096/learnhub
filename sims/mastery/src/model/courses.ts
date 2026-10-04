/**
 * The courses and the shared graph as the app sees them: which topics a choice of courses
 * covers, in graph order, and lookups by id.
 */
import { COURSES, SOURCE_DOCS, courseTargets, coursesClosure, topics, type Course } from '@learnhub/graph';
import type { CourseShare, Topic } from '@learnhub/mastery';

export const ALL_TOPICS: readonly Topic[] = topics;
export const TOPIC_BY_ID: ReadonlyMap<string, Topic> = new Map(topics.map((t) => [t.id, t] as const));
export const ALL_COURSES: readonly Course[] = COURSES;

/** Short names for small screens and per-course labels. */
export const COURSE_SHORT: Readonly<Record<string, string>> = {
  'ia-probability': 'Probability',
  'cst-discrete-maths': 'Discrete Maths',
};

export function courseOf(id: string): Course | undefined {
  return ALL_COURSES.find((c) => c.id === id);
}

export const shortName = (id: string): string => COURSE_SHORT[id] ?? courseOf(id)?.title ?? id;

export function topicOf(id: string): Topic | undefined {
  return TOPIC_BY_ID.get(id);
}

export const titleOf = (id: string): string => TOPIC_BY_ID.get(id)?.title ?? id;

/** Known course ids from a stored list, in the stored order; unknown ids are dropped. */
export function chosen(ids: readonly string[]): Course[] {
  return ids.map(courseOf).filter((c): c is Course => c !== undefined);
}

/** The planner's view of the chosen courses. */
export function shares(ids: readonly string[]): CourseShare[] {
  return chosen(ids).map((c) => ({ id: c.id, targets: courseTargets(topics, c) }));
}

/** Topic ids in the closure of the chosen courses. */
export function closureOf(ids: readonly string[]): Set<string> {
  return coursesClosure(topics, chosen(ids));
}

/** The closure of the chosen courses, in graph order. */
export function closureTopics(ids: readonly string[]): Topic[] {
  const keep = closureOf(ids);
  return topics.filter((t) => keep.has(t.id));
}

/** The courses whose closure contains a topic. */
export function coursesWith(topicId: string, ids: readonly string[]): Course[] {
  return chosen(ids).filter((c) => coursesClosure(topics, [c]).has(topicId));
}

export interface SourceLink {
  label: string;
  section: string;
  url: string | null;
  note?: string;
}

/** A topic's sources as links to the documents they cite. */
export function sourceLinks(t: Topic): SourceLink[] {
  return t.sources.map((s) => {
    const doc = (SOURCE_DOCS as Record<string, { title: string; url: string } | undefined>)[s.doc];
    const link: SourceLink = { label: s.course, section: s.section, url: doc?.url ?? null };
    if (s.note !== undefined) link.note = s.note;
    return link;
  });
}

export const LEVEL_NAMES: Readonly<Record<string, string>> = {
  'pre-a-level': 'Before A level',
  'a-level': 'A level',
  step: 'STEP',
  'tripos-ia': 'Tripos Part IA',
  'tripos-ib': 'Tripos Part IB',
  'tripos-ii': 'Tripos Part II',
};

export const AREA_NAMES: Readonly<Record<string, string>> = {
  'number-and-algebra': 'Number and algebra',
  'sequences-and-series': 'Sequences and series',
  calculus: 'Calculus',
  analysis: 'Analysis',
  sets: 'Sets',
  counting: 'Counting',
  'elementary-probability': 'Elementary probability',
  distributions: 'Distributions',
  'ia-basic-concepts': 'IA: basic concepts',
  'ia-axiomatic': 'IA: axiomatic approach',
  conditioning: 'Conditioning',
  logic: 'Logic',
  proof: 'Proof',
  'number-theory': 'Number theory',
};
