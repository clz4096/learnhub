/**
 * A course is a target set of topic ids over one shared knowledge graph. The engine works
 * on the closure of the targets, the targets plus all their ancestors, so "IA Probability"
 * and "CS Discrete Mathematics" can share their foundations without duplicating topics.
 *
 * The closure is closed under prerequisites by construction, so every topic in it can be
 * learned without leaving it, and the frontier of a course is just the graph frontier of
 * the closure.
 */
import { ancestors, frontier, type Topic } from './graph';

/** Target ids, or undefined for every topic in the graph. */
export type Targets = Iterable<string> | undefined;

/**
 * The ids of the targets and all their ancestors. With no targets, every id. Throws on an
 * unknown target: a course naming a topic the graph lacks is a content bug to fix, not to
 * skip.
 */
export function courseClosure(topics: readonly Topic[], targets?: Targets): Set<string> {
  if (targets === undefined) return new Set(topics.map((t) => t.id));
  const out = new Set<string>();
  for (const id of targets) {
    if (out.has(id)) continue;
    // ancestors throws on an unknown id.
    for (const a of ancestors(topics, id)) out.add(a);
    out.add(id);
  }
  return out;
}

/** The topics of the closure, in graph order. */
export function courseTopics(topics: readonly Topic[], targets?: Targets): Topic[] {
  if (targets === undefined) return [...topics];
  const keep = courseClosure(topics, targets);
  return topics.filter((t) => keep.has(t.id));
}

/** Topics in the course ready to learn: in the closure, not mastered, every prerequisite mastered. */
export function courseFrontier(topics: readonly Topic[], mastered: ReadonlySet<string>, targets?: Targets): string[] {
  return frontier(courseTopics(topics, targets), mastered);
}
