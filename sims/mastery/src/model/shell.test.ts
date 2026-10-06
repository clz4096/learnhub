import { describe, expect, it } from 'vitest';
import {
  RECENT_MAX, TABS, backLabel, clockText, focusOf, greeting, isPaletteKey, matchScore, naturalParent, parseRecent, pushRecent, recentOf, search, tabOf,
  type Searchable,
} from '@/model/shell';
import type { Route } from '@/model/route';

describe('the tabs', () => {
  it('are Today, Course, Admission, Story, and You, on the keys 1 to 5', () => {
    expect(TABS.map((t) => [t.label, t.key])).toEqual([['Today', '1'], ['Course', '2'], ['Admission', '3'], ['Story', '4'], ['You', '5']]);
  });

  it('every route sits under one tab', () => {
    const cases: [Route, string][] = [
      [{ view: 'today' }, 'today'], [{ view: 'task', index: 0 }, 'today'], [{ view: 'gym' }, 'today'],
      [{ view: 'book' }, 'course'], [{ view: 'chapter', chapterId: 'x' }, 'course'], [{ view: 'learn', topicId: 'x' }, 'course'], [{ view: 'map', topicId: null }, 'course'],
      [{ view: 'campaign' }, 'admission'], [{ view: 'papers' }, 'admission'], [{ view: 'paper', paperId: 'x' }, 'admission'], [{ view: 'report' }, 'admission'], [{ view: 'letters' }, 'admission'],
      [{ view: 'story' }, 'story'], [{ view: 'progress' }, 'you'], [{ view: 'glossary', termId: null }, 'you'],
    ];
    for (const [r, tab] of cases) expect(tabOf(r)).toBe(tab);
  });
});

describe('focus mode', () => {
  it('is a lesson, a problem, the gym, and only the paper whose clock runs', () => {
    expect(focusOf({ view: 'task', index: 0 }, null)).toBe('lesson');
    expect(focusOf({ view: 'learn', topicId: 'x' }, null)).toBe('lesson');
    expect(focusOf({ view: 'problem', topicId: 'x', problemId: 'y' }, null)).toBe('lesson');
    expect(focusOf({ view: 'gym' }, null)).toBe('gym');
    expect(focusOf({ view: 'paper', paperId: 'a' }, 'a')).toBe('paper');
    expect(focusOf({ view: 'paper', paperId: 'a' }, 'b')).toBeNull();
    expect(focusOf({ view: 'paper', paperId: 'a' }, null)).toBeNull();
    for (const view of ['today', 'book', 'campaign', 'story', 'progress'] as const) expect(focusOf({ view } as Route, null)).toBeNull();
  });

  it('with no remembered origin, goes back to where the screen belongs', () => {
    const chapterOf = (id: string): string | undefined => (id === 'pre.fractions' ? 'ch-1' : undefined);
    expect(naturalParent({ view: 'learn', topicId: 'pre.fractions', from: 'book' }, chapterOf)).toEqual({ view: 'chapter', chapterId: 'ch-1' });
    expect(naturalParent({ view: 'learn', topicId: 'pre.fractions' }, chapterOf)).toEqual({ view: 'map', topicId: 'pre.fractions' });
    expect(naturalParent({ view: 'task', index: 2 }, chapterOf)).toEqual({ view: 'today' });
    expect(naturalParent({ view: 'paper', paperId: 'a' }, chapterOf)).toEqual({ view: 'campaign' });
    expect(backLabel({ view: 'chapter', chapterId: 'x' })).toBe('Chapter');
    expect(backLabel({ view: 'today' })).toBe('Today');
    expect(backLabel({ view: 'report' })).toBe('Admission');
  });
});

describe('keys', () => {
  it('Cmd+K or Ctrl+K opens the palette; other combinations do not', () => {
    const k = (o: Partial<KeyboardEvent>) => ({ key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o });
    expect(isPaletteKey(k({ metaKey: true }))).toBe(true);
    expect(isPaletteKey(k({ ctrlKey: true, key: 'K' }))).toBe(true);
    expect(isPaletteKey(k({}))).toBe(false);
    expect(isPaletteKey(k({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteKey(k({ metaKey: true, key: 'j' }))).toBe(false);
  });
});

describe('recent items', () => {
  it('come from lessons, terms, and papers opened, newest first, without repeats, at most six', () => {
    expect(recentOf({ view: 'learn', topicId: 'a' }, 1)).toEqual({ kind: 'lesson', id: 'a', at: 1 });
    expect(recentOf({ view: 'glossary', termId: 'union' }, 1)).toEqual({ kind: 'term', id: 'union', at: 1 });
    expect(recentOf({ view: 'glossary', termId: null }, 1)).toBeNull();
    expect(recentOf({ view: 'paper', paperId: 'p' }, 1)).toEqual({ kind: 'paper', id: 'p', at: 1 });
    expect(recentOf({ view: 'today' }, 1)).toBeNull();
    let list = pushRecent([], { kind: 'lesson', id: 'a', at: 1 });
    list = pushRecent(list, { kind: 'term', id: 'a', at: 2 });
    list = pushRecent(list, { kind: 'lesson', id: 'a', at: 3 });
    expect(list.map((x) => `${x.kind}:${x.id}:${x.at}`)).toEqual(['lesson:a:3', 'term:a:2']);
    for (let i = 0; i < 10; i++) list = pushRecent(list, { kind: 'lesson', id: `t${i}`, at: 10 + i });
    expect(list).toHaveLength(RECENT_MAX);
    expect(parseRecent(JSON.stringify(list))).toEqual(list);
    expect(parseRecent('not json')).toEqual([]);
    expect(parseRecent(JSON.stringify([{ kind: 'nope', id: 'x', at: 1 }]))).toEqual([]);
  });
});

describe('search', () => {
  const items: Searchable[] = [
    { kind: 'lesson', id: 'l1', label: 'Proof by contradiction', to: { view: 'learn', topicId: 'l1' } },
    { kind: 'term', id: 'rational', label: 'Rational number', also: ['rational'], to: { view: 'glossary', termId: 'rational' } },
    { kind: 'paper', id: 'p', label: 'STEP 3 2022', to: { view: 'paper', paperId: 'p' } },
    { kind: 'lesson', id: 'l2', label: 'Rational functions', to: { view: 'learn', topicId: 'l2' } },
  ];

  it('scores exact names, then prefixes, then word starts, then substrings', () => {
    expect(matchScore('rational', ['rational'])).toBe(3);
    expect(matchScore('rat', ['Rational number'])).toBe(2);
    expect(matchScore('contra', ['Proof by contradiction'])).toBe(1.5);
    expect(matchScore('adict', ['Proof by contradiction'])).toBe(1);
    expect(matchScore('', ['x'])).toBe(0);
    expect(matchScore('zzz', ['x'])).toBe(0);
  });

  it('finds lessons, terms, and papers, best first, each labelled by kind', () => {
    expect(search('rational', items).map((h) => [h.id, h.hint])).toEqual([['rational', 'term'], ['l2', 'lesson']]);
    expect(search('step', items).map((h) => h.id)).toEqual(['p']);
    expect(search('   ', items)).toEqual([]);
  });
});

describe("Today's clock and greeting", () => {
  it('reads New York time to the second, in 12-hour form', () => {
    // 11:42:07 am in New York (EDT, UTC-4).
    expect(clockText(Date.UTC(2026, 9, 6, 15, 42, 7))).toBe('11:42:07 am');
    expect(clockText(Date.UTC(2026, 9, 6, 4, 5, 9))).toBe('12:05:09 am');
    expect(clockText(Date.UTC(2026, 9, 6, 17, 0, 0))).toBe('1:00:00 pm');
  });

  it('greets by the time of day; before 5 am is still the evening', () => {
    expect([0, 4, 5, 11, 12, 17, 18, 23].map(greeting)).toEqual([
      'Good evening', 'Good evening', 'Good morning', 'Good morning', 'Good afternoon', 'Good afternoon', 'Good evening', 'Good evening',
    ]);
  });
});
