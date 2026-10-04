/**
 * Daily session planner: fills a time budget with reviews, new lessons, and a quiz.
 *
 * Order of priority, from the design:
 * 1. Due reviews that today's new lessons will not cover implicitly. Reviews come first
 *    because a lapse costs more than a day's delay in new material.
 * 2. A quiz, once enough topics have been learned since the last one.
 * 3. New frontier lessons, preferring ones whose practice covers due reviews.
 * Within the reviews and within the lessons, areas are interleaved.
 *
 * A review counts as covered when the credit today's lessons would bank on it, plus the
 * credit it already has, reaches a whole repetition: exactly the rule `recordLesson`
 * applies, so a covered review really is replaced by a repetition if the lesson is passed.
 * If the lesson is failed, the review is still due tomorrow and gets scheduled then.
 *
 * Several courses at once (design decision 14): the session works on the union of their
 * closures. Reviews are not split; a due review is due whichever course it came from. New
 * lessons are split by weight, as weighted fair queuing on lesson minutes: the next lesson
 * goes to the course with the least minutes per unit weight so far (earlier sessions plus
 * this one), taking that course's best candidate by the rules above. A topic in several
 * closures (a shared foundation) is charged to the course that took it, so it is learned
 * once. A course with no lesson that fits yields the time to the next one; a course with
 * weight 0 gets no new lessons.
 */
import { courseClosure, courseTopics, type Targets } from './course';
import { withDefaults } from './options';
import { frontier, topoOrder, type Topic } from './graph';
import { DAY_MS, DEFAULT_MEMORY_PARAMS, dueTopics, implicitCredits, type MemoryMap } from './memory';

export interface SchedulerOptions {
  budgetMinutes: number;
  /** One explicit review: a couple of problems on a known topic. */
  reviewMinutes: number;
  /** One quiz item: a single timed problem. */
  quizItemMinutes: number;
  /** A quiz after this many topics learned since the last one. */
  quizEvery: number;
  /** At most this many items, the most recently learned topics. */
  quizMaxItems: number;
  implicitCredit: boolean;
  creditCutoff: number;
}

/**
 * Starting constants. A lesson costs its topic's `estMinutes` (10 to 25 in probstats).
 * A review is 3 minutes and a quiz item 2: both are short retrieval of something already
 * learned, so a review is about a fifth of a lesson. A quiz every 4 topics keeps it
 * roughly every other day at the probstats pace of 2 to 4 lessons a day.
 */
export const DEFAULT_SCHEDULER_OPTIONS: Readonly<SchedulerOptions> = {
  budgetMinutes: 60,
  reviewMinutes: 3,
  quizItemMinutes: 2,
  quizEvery: 4,
  quizMaxItems: 6,
  implicitCredit: DEFAULT_MEMORY_PARAMS.implicitCredit,
  creditCutoff: DEFAULT_MEMORY_PARAMS.creditCutoff,
};

export type Task =
  | { kind: 'review'; topicId: string; minutes: number; reason: string }
  /** `course` is the course charged for the lesson, set only when the session has `courses`. */
  | { kind: 'lesson'; topicId: string; minutes: number; reason: string; covers: string[]; course?: string }
  | { kind: 'quiz'; topicIds: string[]; minutes: number; reason: string };

export interface SessionPlan {
  tasks: Task[];
  totalMinutes: number;
  budgetMinutes: number;
  /** Due reviews replaced by a lesson's implicit credit, review id to lesson ids. */
  covered: Record<string, string[]>;
  /** Due reviews (or a quiz) that did not fit, left for the next session. */
  deferred: string[];
  /** Lesson minutes charged to each course in this session, set only when the session has `courses`. */
  courseMinutes?: Record<string, number>;
}

/** One course of a multi-course session. */
export interface CourseShare {
  /** Stable id; weights, minutes, and lesson tasks refer to it. */
  id: string;
  targets: Iterable<string>;
}

export interface SessionInput {
  /** The whole shared graph. */
  topics: readonly Topic[];
  /**
   * The course: lessons and reviews come only from these and their ancestors. Default
   * every topic. Mastered topics outside the course keep their schedule and are reviewed
   * in a session for a course that contains them.
   */
  targets?: Targets;
  /**
   * Several courses taken together, instead of `targets`: the session covers the union of
   * their closures and splits new-lesson minutes between them (see the file comment).
   */
  courses?: readonly CourseShare[];
  /** Course id to a weight of 0 or more; a course not listed weighs 1, so the default is an even split. */
  courseWeights?: Readonly<Record<string, number>>;
  /** Lesson minutes charged to each course in earlier sessions, so the split evens out across days. Default none. */
  courseMinutes?: Readonly<Record<string, number>>;
  memory: MemoryMap;
  /** Session start, ms since the epoch. */
  now: number;
  /** Topics learned since the last quiz, oldest first. */
  learnedSinceQuiz?: readonly string[];
  options?: Partial<SchedulerOptions>;
}

/**
 * Greedy reorder so neighbours differ in area where possible: each step takes the first
 * remaining item whose area differs from the previous one, else the first remaining.
 * Stable for items of distinct areas, so priority order survives.
 */
export function interleaveByArea<T>(items: readonly T[], areaOf: (x: T) => string): T[] {
  const rest = [...items];
  const out: T[] = [];
  let prev: string | undefined;
  while (rest.length > 0) {
    let i = rest.findIndex((x) => areaOf(x) !== prev);
    if (i < 0) i = 0;
    const [x] = rest.splice(i, 1) as [T];
    out.push(x);
    prev = areaOf(x);
  }
  return out;
}

function daysOverdue(due: number, now: number): number {
  return Math.floor((now - due) / DAY_MS);
}

function list(ids: readonly string[], title: (id: string) => string): string {
  return ids.map(title).join(', ');
}

interface Share {
  id: string;
  weight: number;
  closure: ReadonlySet<string>;
  /** Earlier sessions plus this one. */
  spent: number;
}

/** The courses of a session, checked; null for a single course or the whole graph. Throws on bad input. */
function shares(input: SessionInput): Share[] | null {
  if (input.courses === undefined) return null;
  if (input.targets !== undefined) throw new Error('planSession: give targets or courses, not both');
  const seen = new Set<string>();
  return input.courses.map((c) => {
    if (seen.has(c.id)) throw new Error(`planSession: course ${c.id} is listed twice`);
    seen.add(c.id);
    const weight = input.courseWeights?.[c.id] ?? 1;
    if (!Number.isFinite(weight) || weight < 0) throw new Error(`planSession: course ${c.id} has weight ${weight}; weights must be finite and 0 or more`);
    const spent = input.courseMinutes?.[c.id] ?? 0;
    if (!Number.isFinite(spent) || spent < 0) throw new Error(`planSession: course ${c.id} has spent ${spent} minutes; must be finite and 0 or more`);
    return { id: c.id, weight, closure: courseClosure(input.topics, c.targets), spent };
  });
}

/** Plans one session. Pure: the same input always gives the same plan. */
export function planSession(input: SessionInput): SessionPlan {
  const opts = withDefaults(DEFAULT_SCHEDULER_OPTIONS, input.options);
  const { memory, now } = input;
  const split = shares(input);
  const targets = split === null ? input.targets : split.flatMap((s) => [...s.closure]);
  const topics = courseTopics(input.topics, targets);
  const byId = new Map(topics.map((t) => [t.id, t] as const));
  const rank = new Map(topoOrder(topics).map((id, i) => [id, i] as const));
  const title = (id: string): string => byId.get(id)?.title ?? id;
  const area = (id: string): string => byId.get(id)?.area ?? '';
  const budget = opts.budgetMinutes;

  // Ids in memory outside the course closure, or no longer in the graph, are not reviewed here.
  const due = dueTopics(memory, now).filter((id) => byId.has(id));

  const learned = (input.learnedSinceQuiz ?? []).filter((id) => memory[id] !== undefined && byId.has(id));
  const quizIds = learned.length >= opts.quizEvery ? learned.slice(-opts.quizMaxItems) : [];
  // A quiz item is an explicit review, so a due topic in the quiz needs no separate review.
  const inQuiz = new Set(quizIds);
  const quizMinutes = quizIds.length * opts.quizItemMinutes;

  // Credit banked on each due review by the lessons chosen so far.
  const banked = new Map<string, number>();
  const isCovered = (id: string): boolean => (memory[id]?.implicitCredit ?? 0) + (banked.get(id) ?? 0) >= 1;
  const reviewCost = (): number =>
    due.filter((id) => !inQuiz.has(id) && !isCovered(id)).length * opts.reviewMinutes;

  const credits = new Map<string, Map<string, number>>();
  const creditOf = (id: string): Map<string, number> => {
    let c = credits.get(id);
    if (c === undefined) {
      c = opts.implicitCredit ? implicitCredits(topics, id, opts.creditCutoff) : new Map();
      credits.set(id, c);
    }
    return c;
  };

  const chosen: string[] = [];
  const chargedTo = new Map<string, string>();
  const areaCount = new Map<string, number>();
  let lessonMinutes = 0;
  const candidates = frontier(topics, new Set(Object.keys(memory)));

  /** The best lesson that fits among `pool`, or null. */
  const pick = (pool: readonly string[]): { id: string; newly: string[]; ac: number } | null => {
    const base = reviewCost();
    let best: { id: string; newly: string[]; ac: number } | null = null;
    for (const id of pool) {
      if (chosen.includes(id)) continue;
      const t = byId.get(id) as Topic;
      const c = creditOf(id);
      const newly = due.filter((r) => !inQuiz.has(r) && !isCovered(r) && (memory[r]?.implicitCredit ?? 0) + (banked.get(r) ?? 0) + (c.get(r) ?? 0) >= 1);
      const after = base - newly.length * opts.reviewMinutes;
      if (after + quizMinutes + lessonMinutes + t.estMinutes > budget) continue;
      const ac = areaCount.get(t.area) ?? 0;
      // More reviews covered first; then the least used area today, for interleaving;
      // then topological order, so lower topics come first.
      const better = best === null
        || newly.length > best.newly.length
        || (newly.length === best.newly.length && (ac < best.ac
          || (ac === best.ac && (rank.get(id) ?? 0) < (rank.get(best.id) ?? 0))));
      if (better) best = { id, newly, ac };
    }
    return best;
  };

  // Least minutes per unit weight first; ties keep the order the courses were given in.
  const queue = (): Share[] => (split ?? [])
    .filter((s) => s.weight > 0)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.spent / a.s.weight - b.s.spent / b.s.weight || a.i - b.i)
    .map(({ s }) => s);

  for (;;) {
    let best: { id: string; newly: string[]; ac: number } | null = null;
    if (split === null) {
      best = pick(candidates);
    } else {
      for (const s of queue()) {
        best = pick(candidates.filter((id) => s.closure.has(id)));
        if (best === null) continue;
        s.spent += (byId.get(best.id) as Topic).estMinutes;
        chargedTo.set(best.id, s.id);
        break;
      }
    }
    if (best === null) break;
    chosen.push(best.id);
    lessonMinutes += (byId.get(best.id) as Topic).estMinutes;
    areaCount.set(area(best.id), best.ac + 1);
    for (const [r, w] of creditOf(best.id)) banked.set(r, (banked.get(r) ?? 0) + w);
  }

  // Every chosen lesson that banks credit on a covered review, since the sum may be what covers it.
  const coveredBy = new Map<string, string[]>();
  for (const r of due) {
    if (!inQuiz.has(r) && isCovered(r)) coveredBy.set(r, chosen.filter((l) => creditOf(l).has(r)));
  }

  const deferred: string[] = [];
  const reviews: string[] = [];
  let used = lessonMinutes;
  for (const r of due) {
    if (inQuiz.has(r) || isCovered(r)) continue;
    if (used + opts.reviewMinutes <= budget) {
      reviews.push(r);
      used += opts.reviewMinutes;
    } else {
      deferred.push(r);
    }
  }
  const quizFits = quizIds.length > 0 && used + quizMinutes <= budget;
  if (quizFits) used += quizMinutes;
  else if (quizIds.length > 0) deferred.push(...quizIds);

  const tasks: Task[] = [];
  for (const r of interleaveByArea(reviews, area)) {
    const s = memory[r];
    const late = s === undefined ? 0 : daysOverdue(s.due, now);
    const when = late <= 0 ? 'due today' : `${late} day${late === 1 ? '' : 's'} overdue`;
    tasks.push({
      kind: 'review', topicId: r, minutes: opts.reviewMinutes,
      reason: `Review: ${when}, and none of today's new lessons practices it enough to count.`,
    });
  }
  for (const l of interleaveByArea(chosen, area)) {
    const t = byId.get(l) as Topic;
    const covers = due.filter((r) => coveredBy.get(r)?.includes(l));
    const pre = t.prereqs.length === 0 ? 'it has no prerequisites' : `its prerequisites are mastered (${list(t.prereqs, title)})`;
    const cov = covers.length === 0 ? '' : ` Its practice also counts as today's review of ${list(covers, title)}.`;
    const course = chargedTo.get(l);
    const lesson: Task = { kind: 'lesson', topicId: l, minutes: t.estMinutes, covers, reason: `New topic: ${pre}.${cov}` };
    tasks.push(course === undefined ? lesson : { ...lesson, course });
  }
  if (quizFits) {
    tasks.push({
      kind: 'quiz', topicIds: quizIds, minutes: quizMinutes,
      reason: `Quiz: ${learned.length} topics learned since the last quiz; each item also counts as a review.`,
    });
  }

  const covered: Record<string, string[]> = {};
  for (const r of due) {
    const by = coveredBy.get(r);
    if (by !== undefined) covered[r] = by;
  }
  const plan: SessionPlan = { tasks, totalMinutes: used, budgetMinutes: budget, covered, deferred };
  if (split !== null) {
    plan.courseMinutes = Object.fromEntries(split.map((s) => [s.id, s.spent - (input.courseMinutes?.[s.id] ?? 0)]));
  }
  return plan;
}
