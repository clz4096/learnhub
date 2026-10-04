import { describe, expect, it } from 'vitest';
import { hrefOf, parseRoute, type Route } from '@/model/route';

describe('routes', () => {
  const all: Route[] = [
    { view: 'today' }, { view: 'start' }, { view: 'task', index: 3 }, { view: 'learn', topicId: 'pre.fractions' },
    { view: 'map', topicId: null }, { view: 'map', topicId: 'num.gcd' }, { view: 'progress' },
    { view: 'glossary', termId: null }, { view: 'glossary', termId: 'union' },
  ];
  for (const r of all) it(`round-trips ${hrefOf(r)}`, () => expect(parseRoute(hrefOf(r))).toEqual(r));
  it('falls back to Today on anything unknown or malformed', () => {
    expect(parseRoute('')).toEqual({ view: 'today' });
    expect(parseRoute('#/nope')).toEqual({ view: 'today' });
    expect(parseRoute('#/task/-1')).toEqual({ view: 'today' });
    expect(parseRoute('#/map/<script>')).toEqual({ view: 'map', topicId: null });
  });
});
