/**
 * Courses as data. A course is a target set over the shared graph (design decision 10):
 * its targets are the topics with a source citing the course's document and course name,
 * plus any `extraTargets`. The engine works on the closure of the targets, so a course
 * never lists its foundations; they come in as ancestors.
 */
import { courseClosure, courseTopics, type Topic } from '@learnhub/mastery';
import type { SourceDoc } from './sources';

export interface Course {
  /** Kebab case, stable: progress and settings are keyed by it. */
  id: string;
  title: string;
  /** The `doc` its topics cite. */
  doc: SourceDoc;
  /** The `course` its topics cite, exactly as in their sources. */
  course: string;
  /**
   * Topics in the course that no source of the course cites, each kept for a reason given
   * where it is listed. Use sparingly: a citation is the normal way into a course.
   */
  extraTargets?: readonly string[];
}

export const COURSES = [
  {
    id: 'ia-probability',
    title: 'IA Probability',
    doc: 'tripos-schedules-2026-27',
    course: 'IA Probability',
    // Pascal's rule is a leaf of the probability slice, kept for random walks later in the
    // course (probstats review, entry point 9). No IA Probability section names it.
    extraTargets: ['comb.binomial-identities'],
  },
  {
    id: 'cst-discrete-maths',
    title: 'CST IA Discrete Mathematics',
    doc: 'cst-courses-2026-27',
    course: 'CST IA Discrete Mathematics',
  },
] as const satisfies readonly Course[];

export type CourseId = (typeof COURSES)[number]['id'];

/** The course with this id. Throws on an unknown id. */
export function courseById(id: string): Course {
  const c = (COURSES as readonly Course[]).find((x) => x.id === id);
  if (c === undefined) throw new Error(`unknown course id: ${id}`);
  return c;
}

/** Ids of the topics that cite the course, then its extra targets, in graph order, without repeats. */
export function courseTargets(topics: readonly Topic[], course: Course): string[] {
  const cited = topics
    .filter((t) => t.sources.some((s) => s.doc === course.doc && s.course === course.course))
    .map((t) => t.id);
  return [...new Set([...cited, ...(course.extraTargets ?? [])])];
}

/** The ids the engine works on for these courses: their targets and every ancestor. */
export function coursesClosure(topics: readonly Topic[], courses: readonly Course[]): Set<string> {
  return courseClosure(topics, courses.flatMap((c) => courseTargets(topics, c)));
}

/** The topics of that closure, in graph order: the subgraph a course works on. */
export function coursesTopics(topics: readonly Topic[], courses: readonly Course[]): Topic[] {
  return courseTopics(topics, courses.flatMap((c) => courseTargets(topics, c)));
}
