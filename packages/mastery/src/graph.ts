/**
 * Knowledge graph: topics, their prerequisites, and the checks every course graph must pass.
 *
 * Edges point from a topic to the topics it requires. A topic is learnable once every
 * prerequisite is mastered (the frontier). `encompasses` says which ancestors get partial
 * review credit when the topic is practiced; that credit only makes sense down the graph,
 * so every encompassed id must be a transitive prerequisite.
 *
 * Everything here is a pure function over a plain array of topics, so the same code runs
 * in tests, in the build checks, and in the browser.
 */

/** Ordered from the bottom of the graph upward. Only the first two may be roots. */
export const LEVELS = ['pre-a-level', 'a-level', 'step', 'tripos-ia', 'tripos-ib', 'tripos-ii'] as const;
export type Level = (typeof LEVELS)[number];

/** Levels a root (a topic with no prerequisites) may have, so placement starts below STEP. */
export const ROOT_LEVELS: readonly Level[] = ['pre-a-level', 'a-level'];

export interface TopicSource {
  /** Short id of the source document, for example `tripos-schedules-2026-27`. */
  doc: string;
  /** The course or paper within the document, for example `IA Probability` or `STEP Mathematics 1`. */
  course: string;
  /** The section name exactly as the source prints it, without the course. */
  section: string;
  note?: string;
  /** False until someone has read the section in the source and confirmed the name. */
  verified: boolean;
}

export interface Topic {
  /** Namespaced kebab case: `<namespace>.<name>`, for example `prob.bayes-formula`. */
  id: string;
  title: string;
  /** One line. */
  summary: string;
  level: Level;
  area: string;
  prereqs: string[];
  /** Ancestor id to review credit in (0, 1]. */
  encompasses: Record<string, number>;
  source: TopicSource;
  estMinutes: number;
}

export type IssueCode =
  | 'duplicate-id'
  | 'bad-id'
  | 'bad-level'
  | 'missing-prereq'
  | 'duplicate-prereq'
  | 'missing-encompassed'
  | 'encompasses-non-ancestor'
  | 'bad-weight'
  | 'cycle'
  | 'unreachable'
  | 'bad-root-level'
  | 'level-inversion'
  | 'missing-source'
  | 'dash-in-text'
  | 'bad-summary'
  | 'bad-minutes'
  | 'redundant-prereq'
  | 'unverified-source';

export interface Issue {
  code: IssueCode;
  message: string;
  /** Topic ids involved; for a cycle, the ids in cycle order. */
  ids: string[];
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

const ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
// U+2013 en dash, U+2014 em dash.
const DASH_RE = /[\u2013\u2014]/;

/** First topic wins for a duplicated id; the validator reports the duplicate. */
function index(topics: readonly Topic[]): Map<string, Topic> {
  const m = new Map<string, Topic>();
  for (const t of topics) if (!m.has(t.id)) m.set(t.id, t);
  return m;
}

/** id to the ids of topics that list it as a prerequisite. Unknown prereqs are skipped. */
function dependentsOf(byId: ReadonlyMap<string, Topic>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of byId.keys()) out.set(id, []);
  for (const t of byId.values()) {
    for (const p of new Set(t.prereqs)) out.get(p)?.push(t.id);
  }
  return out;
}

/** Every id reachable from `start` by `next`, excluding `start` itself unless on a cycle through it. */
function closure(start: string, next: (id: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...next(start)];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of next(id)) if (!seen.has(n)) stack.push(n);
  }
  return seen;
}

function requireKnown(byId: ReadonlyMap<string, Topic>, id: string): void {
  if (!byId.has(id)) throw new Error(`unknown topic id: ${id}`);
}

/** All transitive prerequisites of `id` (not including `id`). Throws on an unknown id. */
export function ancestors(topics: readonly Topic[], id: string): Set<string> {
  const byId = index(topics);
  requireKnown(byId, id);
  const s = closure(id, (x) => (byId.get(x)?.prereqs ?? []).filter((p) => byId.has(p)));
  s.delete(id);
  return s;
}

/** All topics that transitively require `id` (not including `id`). Throws on an unknown id. */
export function descendants(topics: readonly Topic[], id: string): Set<string> {
  const byId = index(topics);
  requireKnown(byId, id);
  const deps = dependentsOf(byId);
  const s = closure(id, (x) => deps.get(x) ?? []);
  s.delete(id);
  return s;
}

/**
 * Ids with every prerequisite before the topic that needs it. Ties keep input order, so
 * the result is deterministic. Throws if the graph has a cycle; validate first.
 */
export function topoOrder(topics: readonly Topic[]): string[] {
  const byId = index(topics);
  const deps = dependentsOf(byId);
  const pending = new Map<string, number>();
  for (const t of byId.values()) pending.set(t.id, new Set(t.prereqs.filter((p) => byId.has(p))).size);
  const queue = [...byId.keys()].filter((id) => pending.get(id) === 0);
  const order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i] as string;
    order.push(id);
    for (const d of deps.get(id) ?? []) {
      const left = (pending.get(d) ?? 0) - 1;
      pending.set(d, left);
      if (left === 0) queue.push(d);
    }
  }
  if (order.length !== byId.size) throw new Error('topoOrder: the graph has a cycle');
  return order;
}

/** Topics with no prerequisites, in input order. */
export function roots(topics: readonly Topic[]): string[] {
  return [...index(topics).values()].filter((t) => t.prereqs.length === 0).map((t) => t.id);
}

/**
 * Topics ready to learn: not mastered, and every prerequisite mastered. Input order.
 * Ids in `mastered` that are not in the graph are ignored.
 */
export function frontier(topics: readonly Topic[], mastered: ReadonlySet<string>): string[] {
  return [...index(topics).values()]
    .filter((t) => !mastered.has(t.id) && t.prereqs.every((p) => mastered.has(p)))
    .map((t) => t.id);
}

/** One cycle per back edge found by a depth-first search, deduplicated by rotation. */
function findCycles(byId: ReadonlyMap<string, Topic>): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const cycles: string[][] = [];
  const seenKeys = new Set<string>();
  const next = (id: string): string[] => (byId.get(id)?.prereqs ?? []).filter((p) => byId.has(p));

  for (const start of byId.keys()) {
    if ((color.get(start) ?? WHITE) !== WHITE) continue;
    // Iterative DFS: path holds the gray nodes, iters their next child position.
    const path: string[] = [start];
    const iters: number[] = [0];
    color.set(start, GRAY);
    while (path.length > 0) {
      const top = path.length - 1;
      const id = path[top] as string;
      const children = next(id);
      const i = iters[top] as number;
      if (i >= children.length) {
        color.set(id, BLACK);
        path.pop();
        iters.pop();
        continue;
      }
      iters[top] = i + 1;
      const c = children[i] as string;
      const cc = color.get(c) ?? WHITE;
      if (cc === GRAY) {
        const cyc = path.slice(path.indexOf(c));
        // Canonical rotation: start at the smallest id.
        let k = 0;
        for (let j = 1; j < cyc.length; j++) if ((cyc[j] as string) < (cyc[k] as string)) k = j;
        const rot = [...cyc.slice(k), ...cyc.slice(0, k)];
        const key = rot.join('\u0000');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          cycles.push(rot);
        }
      } else if (cc === WHITE) {
        color.set(c, GRAY);
        path.push(c);
        iters.push(0);
      }
    }
  }
  return cycles;
}

/**
 * Checks a course graph. Errors make the graph unusable; warnings are for review.
 *
 * Errors: duplicate or badly formed ids, unknown levels, missing prerequisite or
 * encompassed ids, encompassed ids that are not transitive prerequisites, weights outside
 * (0, 1], cycles, topics not reachable from a root, roots above A-level, missing sources,
 * em or en dashes in titles or summaries, multi-line summaries, non-positive minutes.
 *
 * Warnings: prerequisite edges already implied by another prerequisite (checked only when
 * the graph has no cycles), and sources not yet verified.
 */
export function validateGraph(topics: readonly Topic[]): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (code: IssueCode, message: string, ids: string[]): void => { errors.push({ code, message, ids }); };
  const warn = (code: IssueCode, message: string, ids: string[]): void => { warnings.push({ code, message, ids }); };

  const counts = new Map<string, number>();
  for (const t of topics) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
  for (const [id, n] of counts) if (n > 1) err('duplicate-id', `${id} is defined ${n} times`, [id]);

  const byId = index(topics);

  for (const t of byId.values()) {
    if (!ID_RE.test(t.id)) err('bad-id', `${t.id} is not a namespaced kebab-case id like "prob.bayes-formula"`, [t.id]);
    if (!(LEVELS as readonly string[]).includes(t.level)) err('bad-level', `${t.id} has unknown level "${t.level}"`, [t.id]);
    if (DASH_RE.test(t.title)) err('dash-in-text', `${t.id} title contains an em or en dash`, [t.id]);
    if (DASH_RE.test(t.summary)) err('dash-in-text', `${t.id} summary contains an em or en dash`, [t.id]);
    if (t.summary.trim() === '' || /[\r\n]/.test(t.summary)) err('bad-summary', `${t.id} summary must be one non-empty line`, [t.id]);
    if (!Number.isFinite(t.estMinutes) || t.estMinutes <= 0) err('bad-minutes', `${t.id} estMinutes must be a positive number`, [t.id]);

    const src = t.source as TopicSource | undefined;
    if (!src || !src.doc?.trim() || !src.course?.trim() || !src.section?.trim()) {
      err('missing-source', `${t.id} has no source document, course, and section`, [t.id]);
    } else if (!src.verified) {
      warn('unverified-source', `${t.id} cites "${src.doc}: ${src.course}, ${src.section}", not yet verified${src.note ? ` (${src.note})` : ''}`, [t.id]);
    }

    const seen = new Set<string>();
    for (const p of t.prereqs) {
      if (seen.has(p)) err('duplicate-prereq', `${t.id} lists ${p} twice`, [t.id, p]);
      seen.add(p);
      const q = byId.get(p);
      if (!q) err('missing-prereq', `${t.id} requires unknown topic ${p}`, [t.id, p]);
      // A prerequisite never sits at a higher level than the topic that needs it.
      else if (LEVELS.indexOf(q.level) > LEVELS.indexOf(t.level)) {
        err('level-inversion', `${t.id} (${t.level}) requires ${p}, which is at the higher level ${q.level}`, [t.id, p]);
      }
    }

    for (const [e, w] of Object.entries(t.encompasses)) {
      if (!byId.has(e)) err('missing-encompassed', `${t.id} encompasses unknown topic ${e}`, [t.id, e]);
      if (!Number.isFinite(w) || w <= 0 || w > 1) err('bad-weight', `${t.id} encompasses ${e} with weight ${w}, outside (0, 1]`, [t.id, e]);
    }
  }

  const cycles = findCycles(byId);
  for (const c of cycles) {
    err('cycle', `prerequisite cycle: ${[...c, c[0]].join(' requires ')}`, c);
  }

  // Ancestor sets, cycle-safe (closure tolerates revisits). A topic on a cycle would
  // contain itself; drop it so encompassing yourself is never accepted.
  const anc = new Map<string, Set<string>>();
  for (const id of byId.keys()) {
    const s = closure(id, (x) => (byId.get(x)?.prereqs ?? []).filter((p) => byId.has(p)));
    s.delete(id);
    anc.set(id, s);
  }

  for (const t of byId.values()) {
    const a = anc.get(t.id) as Set<string>;
    for (const e of Object.keys(t.encompasses)) {
      if (byId.has(e) && !a.has(e)) err('encompasses-non-ancestor', `${t.id} encompasses ${e}, which is not one of its transitive prerequisites`, [t.id, e]);
    }
  }

  const rootIds = roots(topics);
  for (const id of rootIds) {
    const t = byId.get(id) as Topic;
    if (!ROOT_LEVELS.includes(t.level)) err('bad-root-level', `${id} has no prerequisites but is level ${t.level}; roots must be ${ROOT_LEVELS.join(' or ')}`, [id]);
  }

  const reached = new Set<string>(rootIds);
  const deps = dependentsOf(byId);
  for (const r of rootIds) for (const d of closure(r, (x) => deps.get(x) ?? [])) reached.add(d);
  for (const id of byId.keys()) {
    if (!reached.has(id)) err('unreachable', `${id} is not reachable from any root`, [id]);
  }

  if (cycles.length === 0) {
    for (const t of byId.values()) {
      const ps = [...new Set(t.prereqs)].filter((p) => byId.has(p));
      for (const p of ps) {
        const via = ps.find((q) => q !== p && (anc.get(q) as Set<string>).has(p));
        if (via !== undefined) warn('redundant-prereq', `${t.id} lists ${p}, already implied through ${via}`, [t.id, p, via]);
      }
    }
  }

  return { errors, warnings };
}

/** One line per issue, for test failure messages and the review doc. */
export function formatIssues(issues: readonly Issue[]): string {
  return issues.map((i) => `${i.code}: ${i.message}`).join('\n');
}
