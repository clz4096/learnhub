import { describe, expect, it } from 'vitest';
import { hrefOf, parseRoute, type Route } from '@/model/route';

describe('routes', () => {
  const all: Route[] = [
    { view: 'today' }, { view: 'start' }, { view: 'task', index: 3 }, { view: 'learn', topicId: 'pre.fractions' },
    { view: 'problem', topicId: 'prob.event-spaces', problemId: 'q4-definitions' },
    { view: 'map', topicId: null }, { view: 'map', topicId: 'num.gcd' }, { view: 'progress' },
    { view: 'glossary', termId: null }, { view: 'glossary', termId: 'union' },
  ];
  for (const r of all) it(`round-trips ${hrefOf(r)}`, () => expect(parseRoute(hrefOf(r))).toEqual(r));
  it('falls back to Today on anything unknown or malformed', () => {
    expect(parseRoute('')).toEqual({ view: 'today' });
    expect(parseRoute('#/nope')).toEqual({ view: 'today' });
    // The placement test is gone (design decision 20); an old link to it lands on Today.
    expect(parseRoute('#/placement')).toEqual({ view: 'today' });
    expect(parseRoute('#/task/-1')).toEqual({ view: 'today' });
    expect(parseRoute('#/map/<script>')).toEqual({ view: 'map', topicId: null });
    expect(parseRoute('#/problem/prob.event-spaces')).toEqual({ view: 'today' });
    expect(parseRoute('#/problem/prob.event-spaces/<b>')).toEqual({ view: 'today' });
  });
});
