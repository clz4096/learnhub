import { describe, it, expect } from 'vitest';
import {
  ancestors, descendants, formatIssues, frontier, roots, topoOrder, validateGraph,
  type IssueCode, type Level, type Topic,
} from './graph';

/** A valid topic with defaults; tests override only what they exercise. */
function T(id: string, prereqs: string[] = [], over: Partial<Topic> = {}): Topic {
  return {
    id,
    title: `Title of ${id}`,
    summary: `Summary of ${id}.`,
    level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level,
    area: 'test',
    prereqs,
    encompasses: {},
    sources: [{ doc: 'test-doc', course: 'Test course', section: 'Test section', verified: true }],
    estMinutes: 15,
    ...over,
  };
}

const codes = (issues: { code: IssueCode }[]): IssueCode[] => issues.map((i) => i.code);

/**
 * Diamond plus a tail:
 *
 *   t.a     t.b
 *     \     /
 *      t.c        (needs a and b)
 *       |
 *      t.d
 */
const diamond = (): Topic[] => [T('t.a'), T('t.b'), T('t.c', ['t.a', 't.b']), T('t.d', ['t.c'])];

describe('validateGraph: a valid graph', () => {
  it('has no errors and no warnings', () => {
    const r = validateGraph(diamond());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('accepts an empty graph', () => {
    expect(validateGraph([])).toEqual({ errors: [], warnings: [] });
  });

  it('accepts encompassing a transitive (not only direct) prerequisite', () => {
    const g = diamond();
    g[3] = T('t.d', ['t.c'], { encompasses: { 't.c': 0.5, 't.a': 0.25 } });
    expect(validateGraph(g).errors).toEqual([]);
  });

  it('accepts weight exactly 1', () => {
    const g = diamond();
    g[3] = T('t.d', ['t.c'], { encompasses: { 't.c': 1 } });
    expect(validateGraph(g).errors).toEqual([]);
  });
});

describe('validateGraph: ids', () => {
  it('reports a duplicate id once', () => {
    const r = validateGraph([T('t.a'), T('t.a'), T('t.a')]);
    expect(codes(r.errors)).toEqual(['duplicate-id']);
    expect(r.errors[0]?.message).toContain('3 times');
  });

  it.each(['plain', 'Prob.bayes', 'prob.Bayes', 'prob.bayes_formula', 'prob.-x', 'prob.x-', 'prob..x', '.x', 'prob.'])(
    'rejects the id %j', (id) => {
      expect(codes(validateGraph([T(id)]).errors)).toContain('bad-id');
    });

  it.each(['prob.bayes-formula', 'an1.series', 'a.b.c-d', 'p.x2'])('accepts the id %j', (id) => {
    expect(validateGraph([T(id)]).errors).toEqual([]);
  });
});

describe('validateGraph: missing ids', () => {
  it('reports an unknown prerequisite (and that the topic cannot be reached)', () => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.nope'])]);
    expect(codes(r.errors).sort()).toEqual(['missing-prereq', 'unreachable']);
    expect(r.errors.find((e) => e.code === 'missing-prereq')?.ids).toEqual(['t.b', 't.nope']);
  });

  it('reports an unknown encompassed id', () => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.a'], { encompasses: { 't.ghost': 0.5 } })]);
    expect(codes(r.errors)).toEqual(['missing-encompassed']);
  });

  it('reports a prerequisite listed twice', () => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.a', 't.a'])]);
    expect(codes(r.errors)).toEqual(['duplicate-prereq']);
  });
});

describe('validateGraph: encompasses', () => {
  it('rejects encompassing a topic that is not an ancestor', () => {
    const r = validateGraph([T('t.a'), T('t.b'), T('t.c', ['t.a'], { encompasses: { 't.b': 0.5 } })]);
    expect(codes(r.errors)).toEqual(['encompasses-non-ancestor']);
  });

  it('rejects encompassing a descendant', () => {
    const r = validateGraph([T('t.a', [], { encompasses: { 't.b': 0.5 } }), T('t.b', ['t.a'])]);
    expect(codes(r.errors)).toEqual(['encompasses-non-ancestor']);
  });

  it('rejects encompassing yourself', () => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.a'], { encompasses: { 't.b': 0.5 } })]);
    expect(codes(r.errors)).toEqual(['encompasses-non-ancestor']);
  });

  it.each([0, -0.1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('rejects weight %d', (w) => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.a'], { encompasses: { 't.a': w } })]);
    expect(codes(r.errors)).toEqual(['bad-weight']);
  });
});

describe('validateGraph: cycles', () => {
  it('reports a self loop', () => {
    const r = validateGraph([T('t.r'), T('t.a', ['t.r', 't.a'])]);
    const c = r.errors.filter((e) => e.code === 'cycle');
    expect(c).toHaveLength(1);
    expect(c[0]?.ids).toEqual(['t.a']);
    expect(c[0]?.message).toBe('prerequisite cycle: t.a requires t.a');
  });

  it('reports a three-node cycle in order, starting at the smallest id', () => {
    // t.x requires t.y requires t.z requires t.x; t.x also hangs off a root.
    const r = validateGraph([T('t.r'), T('t.y', ['t.z']), T('t.z', ['t.x']), T('t.x', ['t.r', 't.y'])]);
    const c = r.errors.filter((e) => e.code === 'cycle');
    expect(c).toHaveLength(1);
    expect(c[0]?.ids).toEqual(['t.x', 't.y', 't.z']);
    expect(c[0]?.message).toBe('prerequisite cycle: t.x requires t.y requires t.z requires t.x');
  });

  it('reports two disjoint cycles separately', () => {
    const r = validateGraph([
      T('t.r'),
      T('t.a', ['t.r', 't.b']), T('t.b', ['t.a']),
      T('t.c', ['t.r', 't.d']), T('t.d', ['t.c']),
    ]);
    const c = r.errors.filter((e) => e.code === 'cycle').map((e) => e.ids);
    expect(c).toEqual([['t.a', 't.b'], ['t.c', 't.d']]);
  });

  it('marks a pure cycle with no root as unreachable', () => {
    const r = validateGraph([T('t.r'), T('t.a', ['t.b']), T('t.b', ['t.a'])]);
    expect(codes(r.errors).sort()).toEqual(['cycle', 'unreachable', 'unreachable']);
  });

  it('skips the redundancy warning when there is a cycle', () => {
    const r = validateGraph([T('t.r'), T('t.a', ['t.r', 't.b']), T('t.b', ['t.a'])]);
    expect(codes(r.warnings)).toEqual([]);
  });

  it('makes topoOrder throw', () => {
    expect(() => topoOrder([T('t.a', ['t.b']), T('t.b', ['t.a'])])).toThrow(/cycle/);
  });
});

describe('validateGraph: roots and reachability', () => {
  it('rejects a root above A-level', () => {
    const r = validateGraph([T('t.a', [], { level: 'step' })]);
    expect(codes(r.errors)).toEqual(['bad-root-level']);
  });

  it('accepts an A-level root', () => {
    expect(validateGraph([T('t.a', [], { level: 'a-level' })]).errors).toEqual([]);
  });

  it('rejects an unknown level', () => {
    const r = validateGraph([T('t.a', [], { level: 'gcse' as Level })]);
    expect(codes(r.errors)).toContain('bad-level');
  });

  it('reports every topic downstream of a missing prerequisite as unreachable', () => {
    const r = validateGraph([T('t.a'), T('t.b', ['t.gone']), T('t.c', ['t.b'])]);
    const un = r.errors.filter((e) => e.code === 'unreachable').map((e) => e.ids[0]);
    expect(un).toEqual(['t.b', 't.c']);
  });
});

describe('validateGraph: text, source, minutes', () => {
  it.each(['Bayes\u2014formula', 'Bayes\u2013formula'])('rejects a dash in the title %j', (title) => {
    expect(codes(validateGraph([T('t.a', [], { title })]).errors)).toEqual(['dash-in-text']);
  });

  it('accepts a hyphen in the title', () => {
    expect(validateGraph([T('t.a', [], { title: 'Inclusion-exclusion' })]).errors).toEqual([]);
  });

  it('rejects a dash or a line break in the summary', () => {
    expect(codes(validateGraph([T('t.a', [], { summary: 'a \u2014 b' })]).errors)).toEqual(['dash-in-text']);
    expect(codes(validateGraph([T('t.a', [], { summary: 'one\ntwo' })]).errors)).toEqual(['bad-summary']);
    expect(codes(validateGraph([T('t.a', [], { summary: '  ' })]).errors)).toEqual(['bad-summary']);
  });

  it('rejects missing or empty sources, and an empty section', () => {
    const noSource = { ...T('t.a') } as Partial<Topic>;
    delete noSource.sources;
    expect(codes(validateGraph([noSource as Topic]).errors)).toEqual(['missing-source']);
    const empty = validateGraph([T('t.a', [], { sources: [] })]);
    expect(codes(empty.errors)).toEqual(['missing-source']);
    expect(empty.errors[0]?.message).toBe('t.a has no sources');
    expect(codes(validateGraph([T('t.a', [], { sources: [{ doc: 'd', course: 'c', section: ' ', verified: true }] })]).errors))
      .toEqual(['missing-source']);
  });

  it('rejects a source with no course', () => {
    expect(codes(validateGraph([T('t.a', [], { sources: [{ doc: 'd', course: '', section: 's', verified: true }] })]).errors))
      .toEqual(['missing-source']);
  });

  it('accepts several sources, one per course that teaches the topic', () => {
    const sources = [
      { doc: 'step', course: 'STEP Mathematics 1', section: 'Proof', verified: true },
      { doc: 'cst', course: 'CST IA Discrete Mathematics', section: 'Numbers', verified: true },
    ];
    expect(validateGraph([T('t.a', [], { sources })])).toEqual({ errors: [], warnings: [] });
  });

  it('checks every source, not only the first, and names the bad one', () => {
    const r = validateGraph([T('t.a', [], { sources: [
      { doc: 'd', course: 'c', section: 's', verified: true },
      { doc: 'd', course: 'c', section: '', verified: true },
    ] })]);
    expect(codes(r.errors)).toEqual(['missing-source']);
    expect(r.errors[0]?.message).toBe('t.a source 2 has no document, course, and section');
  });

  it('rejects a prerequisite at a higher level than the topic that needs it', () => {
    const r = validateGraph([
      T('t.root'),
      T('t.hi', ['t.root'], { level: 'tripos-ia' }),
      T('t.lo', ['t.hi'], { level: 'a-level' }),
    ]);
    expect(codes(r.errors)).toEqual(['level-inversion']);
    expect(r.errors[0]?.ids).toEqual(['t.lo', 't.hi']);
    // Equal levels are fine.
    expect(validateGraph([T('t.root'), T('t.x', ['t.root'], { level: 'pre-a-level' })]).errors).toEqual([]);
  });

  it('warns on an unverified source and includes the note', () => {
    const r = validateGraph([T('t.a', [], { sources: [{ doc: 'd', course: 'c', section: 's', note: 'name not confirmed', verified: false }] })]);
    expect(r.errors).toEqual([]);
    expect(codes(r.warnings)).toEqual(['unverified-source']);
    expect(r.warnings[0]?.message).toContain('name not confirmed');
  });

  it('warns once per unverified source', () => {
    const r = validateGraph([T('t.a', [], { sources: [
      { doc: 'd1', course: 'c1', section: 's1', verified: false },
      { doc: 'd2', course: 'c2', section: 's2', verified: true },
      { doc: 'd3', course: 'c3', section: 's3', verified: false },
    ] })]);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.message)).toEqual([
      't.a cites "d1: c1, s1", not yet verified',
      't.a cites "d3: c3, s3", not yet verified',
    ]);
  });

  it.each([0, -5, Number.NaN])('rejects estMinutes %d', (estMinutes) => {
    expect(codes(validateGraph([T('t.a', [], { estMinutes })]).errors)).toEqual(['bad-minutes']);
  });
});

describe('validateGraph: transitive reduction warnings', () => {
  it('warns when a prerequisite is implied through another', () => {
    // t.d needs t.c, and t.c needs t.a, so listing t.a on t.d is redundant.
    const g = diamond();
    g[3] = T('t.d', ['t.c', 't.a']);
    const r = validateGraph(g);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([{
      code: 'redundant-prereq',
      message: 't.d lists t.a, already implied through t.c',
      ids: ['t.d', 't.a', 't.c'],
    }]);
  });

  it('finds redundancy through a long chain', () => {
    const g = [T('t.a'), T('t.b', ['t.a']), T('t.c', ['t.b']), T('t.d', ['t.c']), T('t.e', ['t.d', 't.a'])];
    expect(validateGraph(g).warnings.map((w) => w.ids)).toEqual([['t.e', 't.a', 't.d']]);
  });

  it('does not warn for two independent prerequisites', () => {
    expect(validateGraph(diamond()).warnings).toEqual([]);
  });

  it('lists every redundant edge', () => {
    const g = [T('t.a'), T('t.b', ['t.a']), T('t.c', ['t.b']), T('t.d', ['t.c', 't.b', 't.a'])];
    const w = validateGraph(g).warnings.map((x) => x.ids.slice(0, 2));
    expect(w).toEqual([['t.d', 't.b'], ['t.d', 't.a']]);
  });
});

describe('helpers', () => {
  it('ancestors returns every transitive prerequisite', () => {
    expect([...ancestors(diamond(), 't.d')].sort()).toEqual(['t.a', 't.b', 't.c']);
    expect([...ancestors(diamond(), 't.a')]).toEqual([]);
  });

  it('descendants returns every topic that needs it', () => {
    expect([...descendants(diamond(), 't.a')].sort()).toEqual(['t.c', 't.d']);
    expect([...descendants(diamond(), 't.d')]).toEqual([]);
  });

  it('ancestors and descendants throw on an unknown id', () => {
    expect(() => ancestors(diamond(), 't.zz')).toThrow(/unknown/);
    expect(() => descendants(diamond(), 't.zz')).toThrow(/unknown/);
  });

  it('topoOrder puts every prerequisite first and keeps input order on ties', () => {
    const g = [T('t.d', ['t.c']), T('t.c', ['t.a', 't.b']), T('t.b'), T('t.a')];
    const order = topoOrder(g);
    expect(order).toEqual(['t.b', 't.a', 't.c', 't.d']);
    const pos = new Map(order.map((id, i) => [id, i]));
    for (const t of g) for (const p of t.prereqs) expect(pos.get(p)!).toBeLessThan(pos.get(t.id)!);
  });

  it('roots lists topics with no prerequisites', () => {
    expect(roots(diamond())).toEqual(['t.a', 't.b']);
  });

  it('frontier starts at the roots', () => {
    expect(frontier(diamond(), new Set())).toEqual(['t.a', 't.b']);
  });

  it('frontier needs every prerequisite mastered', () => {
    expect(frontier(diamond(), new Set(['t.a']))).toEqual(['t.b']);
    expect(frontier(diamond(), new Set(['t.a', 't.b']))).toEqual(['t.c']);
    expect(frontier(diamond(), new Set(['t.a', 't.b', 't.c']))).toEqual(['t.d']);
  });

  it('frontier is empty when everything is mastered, and ignores unknown ids', () => {
    expect(frontier(diamond(), new Set(['t.a', 't.b', 't.c', 't.d', 't.zz']))).toEqual([]);
  });

  it('frontier takes the mastered set literally', () => {
    // Placement credits a topic together with its ancestors, so this set would not
    // arise from placement; frontier does not close it under ancestors itself.
    expect(frontier(diamond(), new Set(['t.c']))).toEqual(['t.a', 't.b', 't.d']);
  });

  it('formatIssues prints one line per issue', () => {
    const r = validateGraph([T('t.a', [], { level: 'step' }), T('t.a')]);
    expect(formatIssues(r.errors).split('\n')).toHaveLength(2);
  });
});
