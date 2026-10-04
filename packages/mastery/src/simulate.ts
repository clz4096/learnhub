/**
 * Simulated learners, to check the engine's behaviour before real data exists.
 *
 * The learner's true memory is separate from the engine's model of it: the engine only
 * sees review outcomes, as it would with a person. True recall of a topic is
 * exp(-elapsed / stability), with a per-topic stability drawn from the seed. Successful
 * retrieval multiplies stability; practicing a topic also partially refreshes the topics
 * it encompasses, in both the with-credit and without-credit runs, because that is what
 * happens to the learner whether or not the engine accounts for it.
 *
 * Simplifications, so the numbers are read as the engine's behaviour on a plausible
 * learner, not a forecast: stability growth does not depend on how late a review is,
 * lessons succeed with a fixed probability scaled by prerequisite recall, and every task
 * in a session happens at the session's start time.
 *
 * These are simulation results, not real-learner data.
 */
import { ancestors, descendants, type Topic } from './graph';
import {
  DAY_MS, DEFAULT_MEMORY_PARAMS, implicitCredits, recordLesson, recordLessonFailure, recordReview,
  type MemoryMap, type MemoryParams,
} from './memory';
import { courseClosure, type Targets } from './course';
import { withDefaults } from './options';
import { placementGraph, runPlacement, type PlacementGraph, type PlacementStrategy } from './placement';
import { bernoulli, mulberry32, randReal, type Rng } from './rng';
import { DEFAULT_SCHEDULER_OPTIONS, planSession, type CourseShare, type SchedulerOptions } from './scheduler';

export interface LearnerModel {
  /** Chance a lesson is passed when every prerequisite is fully recalled. */
  learnSuccess: number;
  /** Initial true stability in days, drawn uniformly per topic from [lo, hi). */
  stabilityLo: number;
  stabilityHi: number;
  /** Stability multiplier on a successful explicit retrieval. */
  stabilityGrowth: number;
  /** Stability multiplier on a failed one (the learner then sees the answer and relearns). */
  lapseFactor: number;
}

/** A learner who forgets a fresh topic to about 78% recall in a day, close to typical forgetting curves. */
export const DEFAULT_LEARNER: Readonly<LearnerModel> = {
  learnSuccess: 0.9,
  stabilityLo: 2,
  stabilityHi: 6,
  stabilityGrowth: 2.5,
  lapseFactor: 0.5,
};

export interface SimOptions {
  topics: readonly Topic[];
  /** The course; default every topic. The learner starts knowing nothing either way. */
  targets?: Targets;
  /** Several courses at once, instead of `targets`, split by `courseWeights` as `planSession` does. */
  courses?: readonly CourseShare[];
  courseWeights?: Readonly<Record<string, number>>;
  seed: number;
  days?: number;
  /** Simulation start, ms since the epoch. */
  start?: number;
  implicitCredit?: boolean;
  learner?: Partial<LearnerModel>;
  scheduler?: Partial<SchedulerOptions>;
  memory?: Partial<MemoryParams>;
}

export interface DayStats {
  day: number;
  lessonMinutes: number;
  reviewMinutes: number;
  quizMinutes: number;
  /** Explicit reviews, quiz items included. */
  reviews: number;
  failedReviews: number;
  lessons: number;
  lessonsPassed: number;
  /** Implicit credit converted to repetitions by the engine. */
  implicitReps: number;
  /** Mastered at the end of the day. */
  mastered: number;
  /** Mean true recall over mastered topics at the end of the day. */
  retention: number;
}

export interface SimResult {
  days: DayStats[];
  /** First day (1-based) after which every topic in the course is mastered, or null. */
  dayAllMastered: number | null;
  totalReviews: number;
  totalReviewMinutes: number;
  totalImplicitReps: number;
  finalRetention: number;
  /** With `courses`: the first day (1-based) after which each course's closure is mastered, or null. */
  dayCourseMastered?: Record<string, number | null>;
  /** With `courses`: lesson minutes charged to each course over the run, failed lessons included. */
  courseLessonMinutes?: Record<string, number>;
}

interface TrueMemory {
  stability: number;
  seen: number;
}

function recall(m: TrueMemory, now: number): number {
  return Math.exp(-(now - m.seen) / DAY_MS / m.stability);
}

/** Runs the learner through `days` sessions. Deterministic for a given seed and options. */
export function simulate(opts: SimOptions): SimResult {
  const topics = opts.topics;
  const days = opts.days ?? 60;
  const start = opts.start ?? 0;
  const L = withDefaults(DEFAULT_LEARNER, opts.learner);
  const credit = opts.implicitCredit ?? true;
  const mp: Partial<MemoryParams> = { ...opts.memory, implicitCredit: credit };
  const sp: Partial<SchedulerOptions> = { ...opts.scheduler, implicitCredit: credit };
  const cutoff = mp.creditCutoff ?? DEFAULT_MEMORY_PARAMS.creditCutoff;
  const rng: Rng = mulberry32(opts.seed);
  const byId = new Map(topics.map((t) => [t.id, t] as const));
  const shares = opts.courses?.map((c) => ({ id: c.id, closure: courseClosure(topics, c.targets) }));
  const course = shares === undefined ? courseClosure(topics, opts.targets) : new Set(shares.flatMap((s) => [...s.closure]));
  const courseMinutes: Record<string, number> = Object.fromEntries((shares ?? []).map((s) => [s.id, 0]));
  const dayCourseMastered: Record<string, number | null> = Object.fromEntries((shares ?? []).map((s) => [s.id, null]));

  // Drawn up front, in graph order, so both credit settings meet the same learner.
  const s0 = new Map(topics.map((t) => [t.id, randReal(rng, L.stabilityLo, L.stabilityHi)] as const));
  const credits = new Map(topics.map((t) => [t.id, implicitCredits(topics, t.id, cutoff)] as const));

  const truth = new Map<string, TrueMemory>();
  let memory: MemoryMap = {};
  let learnedSinceQuiz: string[] = [];
  const out: DayStats[] = [];
  let dayAllMastered: number | null = null;

  // Using a topic in a harder problem refreshes it in proportion to the credit weight.
  const refreshBelow = (id: string, now: number): void => {
    for (const [e, c] of credits.get(id) ?? []) {
      const m = truth.get(e);
      if (m === undefined) continue;
      truth.set(e, { stability: m.stability * L.stabilityGrowth ** c, seen: m.seen + c * (now - m.seen) });
    }
  };

  const retrieve = (id: string, now: number, st: DayStats): void => {
    const m = truth.get(id) as TrueMemory;
    const ok = bernoulli(rng, recall(m, now));
    truth.set(id, { stability: Math.max(1, m.stability * (ok ? L.stabilityGrowth : L.lapseFactor)), seen: now });
    if (ok) refreshBelow(id, now);
    const u = recordReview(memory, topics, id, ok, now, mp);
    memory = u.memory;
    st.implicitReps += u.converted.length;
    st.reviews++;
    if (!ok) st.failedReviews++;
  };

  for (let d = 0; d < days; d++) {
    const now = start + d * DAY_MS;
    const st: DayStats = {
      day: d + 1, lessonMinutes: 0, reviewMinutes: 0, quizMinutes: 0, reviews: 0, failedReviews: 0,
      lessons: 0, lessonsPassed: 0, implicitReps: 0, mastered: 0, retention: 0,
    };
    const plan = shares === undefined
      ? planSession({ topics, targets: opts.targets, memory, now, learnedSinceQuiz, options: sp })
      : planSession({ topics, courses: opts.courses, courseWeights: opts.courseWeights, courseMinutes, memory, now, learnedSinceQuiz, options: sp });
    for (const [id, m] of Object.entries(plan.courseMinutes ?? {})) courseMinutes[id] = (courseMinutes[id] ?? 0) + m;
    for (const task of plan.tasks) {
      if (task.kind === 'review') {
        st.reviewMinutes += task.minutes;
        retrieve(task.topicId, now, st);
      } else if (task.kind === 'quiz') {
        st.quizMinutes += task.minutes;
        for (const id of task.topicIds) retrieve(id, now, st);
        learnedSinceQuiz = [];
      } else {
        st.lessonMinutes += task.minutes;
        st.lessons++;
        const t = byId.get(task.topicId) as Topic;
        const pre = t.prereqs.map((p) => recall(truth.get(p) as TrueMemory, now));
        const p = L.learnSuccess * (0.5 + 0.5 * Math.min(1, ...pre));
        if (bernoulli(rng, p)) {
          truth.set(t.id, { stability: s0.get(t.id) as number, seen: now });
          refreshBelow(t.id, now);
          const u = recordLesson(memory, topics, t.id, now, mp);
          memory = u.memory;
          st.implicitReps += u.converted.length;
          st.lessonsPassed++;
          learnedSinceQuiz = [...learnedSinceQuiz, t.id];
        } else {
          memory = recordLessonFailure(memory, topics, t.id, now, mp).memory;
        }
      }
    }
    const end = now + DAY_MS - 1;
    const ids = Object.keys(memory);
    st.mastered = ids.length;
    st.retention = ids.length === 0 ? 0 : ids.reduce((a, id) => a + recall(truth.get(id) as TrueMemory, end), 0) / ids.length;
    if (dayAllMastered === null && [...course].every((id) => memory[id] !== undefined)) dayAllMastered = d + 1;
    for (const s of shares ?? []) {
      if (dayCourseMastered[s.id] === null && [...s.closure].every((id) => memory[id] !== undefined)) dayCourseMastered[s.id] = d + 1;
    }
    out.push(st);
  }

  const last = out[out.length - 1];
  const result: SimResult = {
    days: out,
    dayAllMastered,
    totalReviews: out.reduce((a, s) => a + s.reviews, 0),
    totalReviewMinutes: out.reduce((a, s) => a + s.reviewMinutes + s.quizMinutes, 0),
    totalImplicitReps: out.reduce((a, s) => a + s.implicitReps, 0),
    finalRetention: last?.retention ?? 0,
  };
  if (shares !== undefined) {
    result.dayCourseMastered = dayCourseMastered;
    result.courseLessonMinutes = courseMinutes;
  }
  return result;
}

// ---------------------------------------------------------------- placement measurement

/**
 * A random known set, closed under ancestors. Half are the closure of a few random topics
 * (scattered knowledge); half are whole levels from the bottom with a few holes knocked
 * out with everything above them (a school background with gaps).
 */
export function randomKnownSet(g: PlacementGraph, rng: Rng): Set<string> {
  const known = new Set<string>();
  const pick = (): string => g.order[Math.floor(rng() * g.order.length)] as string;
  if (rng() < 0.5) {
    const k = Math.floor(rng() * 12);
    for (let j = 0; j < k; j++) {
      const id = pick();
      known.add(id);
      for (const a of g.anc.get(id) ?? []) known.add(a);
    }
  } else {
    const levels = ['pre-a-level', 'a-level', 'step', 'tripos-ia'].slice(0, 1 + Math.floor(rng() * 4));
    for (const t of g.topics) if (levels.includes(t.level)) known.add(t.id);
    const holes = Math.floor(rng() * 3);
    for (let j = 0; j < holes; j++) {
      const id = pick();
      known.delete(id);
      for (const d of g.desc.get(id) ?? []) known.delete(d);
    }
  }
  return known;
}

export interface PlacementMeasure {
  learners: number;
  errorRate: number;
  budget: number;
  strategy: PlacementStrategy;
  /** Fraction placed with no topic misclassified. */
  exact: number;
  /** Mean and max topics misclassified per learner. */
  meanWrong: number;
  maxWrong: number;
  /** Mean topics placed as known but not known (the harmful direction), and the reverse. */
  meanOverPlaced: number;
  meanUnderPlaced: number;
  meanQuestions: number;
  maxQuestions: number;
}

/**
 * Places `learners` random learners who answer truthfully except with probability
 * `errorRate` per question, and compares the result with what they know.
 */
export function measurePlacement(
  topics: readonly Topic[],
  o: { learners: number; errorRate: number; budget: number; strategy: PlacementStrategy; seed: number; targets?: Targets },
): PlacementMeasure {
  const g = placementGraph(topics, { targets: o.targets });
  // Separate streams, so the learners are the same whatever the strategy asks.
  const who = mulberry32(o.seed);
  const noise = mulberry32(o.seed ^ 0x9e3779b9);
  let exact = 0, wrong = 0, maxWrong = 0, over = 0, under = 0, q = 0, maxQ = 0;
  for (let n = 0; n < o.learners; n++) {
    const known = randomKnownSet(g, who);
    const r = runPlacement(g, (id) => (bernoulli(noise, o.errorRate) ? !known.has(id) : known.has(id)), 0, {
      budget: o.budget, strategy: o.strategy,
    }).result;
    const placed = new Set(r.mastered);
    let w = 0;
    for (const id of g.order) {
      if (placed.has(id) === known.has(id)) continue;
      w++;
      if (placed.has(id)) over++;
      else under++;
    }
    if (w === 0) exact++;
    wrong += w;
    maxWrong = Math.max(maxWrong, w);
    q += r.questions;
    maxQ = Math.max(maxQ, r.questions);
  }
  const N = o.learners;
  return {
    learners: N, errorRate: o.errorRate, budget: o.budget, strategy: o.strategy,
    exact: exact / N, meanWrong: wrong / N, maxWrong, meanOverPlaced: over / N, meanUnderPlaced: under / N,
    meanQuestions: q / N, maxQuestions: maxQ,
  };
}

/** Whether `known` is closed under ancestors, the shape every placement learner must have. */
export function isAncestorClosed(topics: readonly Topic[], known: ReadonlySet<string>): boolean {
  return [...known].every((id) => [...ancestors(topics, id)].every((a) => known.has(a)));
}

/** Whether `unknown` is closed under descendants. */
export function isDescendantClosed(topics: readonly Topic[], unknown: ReadonlySet<string>): boolean {
  return [...unknown].every((id) => [...descendants(topics, id)].every((d) => unknown.has(d)));
}

// ---------------------------------------------------------------- report

const f1 = (x: number): string => x.toFixed(1);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;

function windows(r: SimResult, size: number): { from: number; to: number; mean: number; max: number }[] {
  const out: { from: number; to: number; mean: number; max: number }[] = [];
  for (let i = 0; i < r.days.length; i += size) {
    const w = r.days.slice(i, i + size).map((d) => d.reviewMinutes + d.quizMinutes);
    out.push({ from: i + 1, to: i + w.length, mean: w.reduce((a, b) => a + b, 0) / w.length, max: Math.max(...w) });
  }
  return out;
}

export interface ReportInput {
  seeds: readonly number[];
  withCredit: readonly SimResult[];
  withoutCredit: readonly SimResult[];
  placement: readonly PlacementMeasure[];
  topicCount: number;
  /** Which graph was run, for example `the probstats slice`. */
  graphName: string;
  /** Where the graph's topics live, shown as code. */
  graphPath: string;
  /** The test file that generates the report, and the package to run `npm test` in. */
  generator: { file: string; pkg: string };
}

/** SIMULATION.md, from the runs in the content's simulate test. Deterministic, so the file only changes when the engine or the graph does. */
export function renderReport(x: ReportInput): string {
  const L = DEFAULT_LEARNER;
  const M = DEFAULT_MEMORY_PARAMS;
  const S = DEFAULT_SCHEDULER_OPTIONS;
  const days = x.withCredit[0]?.days.length ?? 0;
  const lines: string[] = [];
  const p = (s = ''): void => { lines.push(s); };

  p('# Mastery engine: simulation results');
  p();
  p(`**Simulation results, not real-learner data.** Generated by \`${x.generator.file}\` (\`npm test\` in \`${x.generator.pkg}\`); do not edit by hand. The learner is a model; these numbers show how the engine behaves on it, not how fast a person will learn.`);
  p();
  p('## Setup');
  p();
  p(`- Graph: ${x.graphName}, ${x.topicCount} topics (\`${x.graphPath}\`). The learner starts knowing nothing, with no placement.`);
  p(`- ${days} days, one session a day, ${S.budgetMinutes} minutes. Lesson cost is the topic's \`estMinutes\`; a review costs ${S.reviewMinutes} minutes, a quiz item ${S.quizItemMinutes}; a quiz after every ${S.quizEvery} topics learned.`);
  p(`- Engine: first interval ${M.firstIntervalDays} day, growth x${M.earlyGrowth} for the first ${M.earlyReps} successes then x${M.lateGrowth}, x${M.failShrink} on failure, cap ${M.maxIntervalDays} days; credit cutoff ${M.creditCutoff}; failure check weight ${M.checkWeight}.`);
  p(`- Learner: recall is exp(-days since practice / stability). Initial stability uniform in [${L.stabilityLo}, ${L.stabilityHi}) days per topic; x${L.stabilityGrowth} on a successful retrieval, x${L.lapseFactor} on a failed one (minimum 1 day). A lesson passes with probability ${L.learnSuccess} x (0.5 + 0.5 x the lowest prerequisite recall). Practicing a topic refreshes each encompassed topic in proportion to its credit weight, in both runs.`);
  p(`- "Without credit" turns implicit credit off in the engine only (scheduler and memory). The learner is the same. Seeds: ${x.seeds.join(', ')}.`);
  p();
  p('## With and without implicit credit');
  p();
  p('| seed | credit | days to master all | explicit reviews | review and quiz minutes | implicit reps | recall at day ' + days + ' |');
  p('|---|---|---|---|---|---|---|');
  x.seeds.forEach((seed, i) => {
    for (const [label, r] of [['on', x.withCredit[i]], ['off', x.withoutCredit[i]]] as const) {
      if (r === undefined) continue;
      p(`| ${seed} | ${label} | ${r.dayAllMastered ?? 'not reached'} | ${r.totalReviews} | ${r.totalReviewMinutes} | ${r.totalImplicitReps} | ${pct(r.finalRetention)} |`);
    }
  });
  const mean = (rs: readonly SimResult[], f: (r: SimResult) => number): number => rs.reduce((a, r) => a + f(r), 0) / rs.length;
  const on = mean(x.withCredit, (r) => r.totalReviews);
  const off = mean(x.withoutCredit, (r) => r.totalReviews);
  p();
  p(`Mean explicit reviews over ${x.seeds.length} seeds: ${f1(on)} with credit, ${f1(off)} without, ${pct(1 - on / off)} fewer with credit. Mean days to master all ${x.topicCount} topics: ${f1(mean(x.withCredit, (r) => r.dayAllMastered ?? Infinity))} with credit, ${f1(mean(x.withoutCredit, (r) => r.dayAllMastered ?? Infinity))} without.`);
  p();
  p(`## Review and quiz minutes per day, seed ${x.seeds[0]}`);
  p();
  p('Bounded means the load levels off as mastered topics accumulate, instead of growing with them.');
  p();
  p('| days | mean, credit on | max, credit on | mean, credit off | max, credit off |');
  p('|---|---|---|---|---|');
  const wOn = x.withCredit[0] ? windows(x.withCredit[0], 10) : [];
  const wOff = x.withoutCredit[0] ? windows(x.withoutCredit[0], 10) : [];
  wOn.forEach((w, i) => {
    const o = wOff[i];
    p(`| ${w.from} to ${w.to} | ${f1(w.mean)} | ${w.max} | ${o ? f1(o.mean) : ''} | ${o ? o.max : ''} |`);
  });
  p();
  p(`## Day by day, seed ${x.seeds[0]}, credit on`);
  p();
  p('| day | lessons passed / tried | mastered | lesson min | review min | quiz min | reviews (failed) | implicit reps | recall |');
  p('|---|---|---|---|---|---|---|---|---|');
  for (const d of x.withCredit[0]?.days ?? []) {
    p(`| ${d.day} | ${d.lessonsPassed} / ${d.lessons} | ${d.mastered} | ${d.lessonMinutes} | ${d.reviewMinutes} | ${d.quizMinutes} | ${d.reviews} (${d.failedReviews}) | ${d.implicitReps} | ${pct(d.retention)} |`);
  }
  p();
  p('## Placement accuracy');
  p();
  p('Random learners whose known set is closed under ancestors: half the closure of a few random topics, half whole levels from the bottom with a few gaps. Each answers truthfully except with the given error rate. Unclassified topics at the budget count as not known.');
  p();
  p('| strategy | budget | error rate | learners | placed exactly | mean wrong topics | max wrong | mean over-placed | mean under-placed | mean questions | max questions |');
  p('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of x.placement) {
    p(`| ${m.strategy} | ${m.budget} | ${pct(m.errorRate)} | ${m.learners} | ${pct(m.exact)} | ${m.meanWrong.toFixed(2)} | ${m.maxWrong} | ${m.meanOverPlaced.toFixed(2)} | ${m.meanUnderPlaced.toFixed(2)} | ${f1(m.meanQuestions)} | ${m.maxQuestions} |`);
  }
  p();
  return lines.join('\n');
}
