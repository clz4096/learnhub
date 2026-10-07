/**
 * The app shell's rules (mastery/design-v4.html), kept pure so they can be tested without a
 * DOM: the five tabs and which one a route belongs to, focus mode (a lesson, the gym, a
 * timed paper; the tabs hide and Escape goes back to where the learner came from), the
 * keys that work everywhere, the command palette's recent items, and its search.
 */
import type { Route } from './route';

export type TabId = 'today' | 'course' | 'admission' | 'story' | 'you';

export interface Tab {
  id: TabId;
  label: string;
  /** The number key that opens it. */
  key: string;
  to: Route;
}

export const TABS: readonly Tab[] = [
  { id: 'today', label: 'Today', key: '1', to: { view: 'today' } },
  { id: 'course', label: 'Course', key: '2', to: { view: 'book' } },
  { id: 'admission', label: 'Admission', key: '3', to: { view: 'campaign' } },
  { id: 'story', label: 'Story', key: '4', to: { view: 'story' } },
  { id: 'you', label: 'You', key: '5', to: { view: 'progress' } },
];

/** The tab a route sits under. */
export function tabOf(r: Route): TabId {
  switch (r.view) {
    case 'today': case 'start': case 'task': case 'problem': case 'gym': case 'mixed': case 'standup': return 'today';
    case 'learn': case 'book': case 'chapter': case 'map': return 'course';
    case 'campaign': case 'papers': case 'paper': case 'ladder': case 'report': case 'letters': return 'admission';
    case 'story': return 'story';
    case 'progress': case 'glossary': return 'you';
  }
}

/** What a focus-mode screen is, for its bar; null when the route is not in focus mode. */
export type FocusKind = 'lesson' | 'gym' | 'paper' | 'mixed';

/**
 * Focus mode: a lesson, review, quiz, or problem; blind mixed review; the gym; a past
 * paper while its clock runs, and an exam's ladder while one of its rungs runs.
 * `timedPaperId` is the paper whose sitting is running, if any; `timedLadder` the exam
 * whose ladder attempt is running, if any. A paper or ladder with no clock running (its
 * rules, its marking) is an ordinary Admission screen.
 */
export function focusOf(r: Route, timedPaperId: string | null, timedLadder: string | null = null): FocusKind | null {
  switch (r.view) {
    case 'task': case 'learn': case 'problem': return 'lesson';
    case 'mixed': return 'mixed';
    case 'gym': return 'gym';
    case 'paper': return r.paperId === timedPaperId ? 'paper' : null;
    case 'ladder': return r.exam === timedLadder ? 'paper' : null;
    default: return null;
  }
}

/**
 * Where Escape (or the bar's back button) goes from a focus screen with no remembered
 * origin, as after a reload: the screen it naturally belongs to.
 */
export function naturalParent(r: Route, chapterOf: (topicId: string) => string | undefined): Route {
  switch (r.view) {
    case 'learn': {
      const ch = r.from === 'book' ? chapterOf(r.topicId) : undefined;
      return ch !== undefined ? { view: 'chapter', chapterId: ch } : { view: 'map', topicId: r.topicId };
    }
    case 'paper': return { view: 'campaign' };
    case 'ladder': return { view: 'papers' };
    default: return { view: 'today' };
  }
}

/** The label of the focus bar's way back, from where it goes. */
export function backLabel(to: Route): string {
  switch (tabOf(to)) {
    case 'today': return 'Today';
    case 'course': return to.view === 'chapter' ? 'Chapter' : to.view === 'map' ? 'Map' : 'Course';
    case 'admission': return 'Admission';
    case 'story': return 'Story';
    case 'you': return to.view === 'glossary' ? 'Glossary' : 'You';
  }
}

/** A key event's target is somewhere text is typed, so single keys belong to it. */
export function isTyping(target: EventTarget | null): boolean {
  if (target === null || typeof (target as { closest?: unknown }).closest !== 'function') return false;
  const el = target as Element;
  return el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
}

/** The palette shortcut: Cmd+K on a Mac, Ctrl+K elsewhere. */
export function isPaletteKey(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
}

// ---------------------------------------------------------------- recent items

export type RecentKind = 'lesson' | 'term' | 'paper';

export interface Recent {
  kind: RecentKind;
  /** The topic, term, or paper id. */
  id: string;
  at: number;
}

export const RECENT_KEY = 'mastery.recent.v1';
export const RECENT_MAX = 6;

/** What a route adds to the recent list, if anything. */
export function recentOf(r: Route, at: number): Recent | null {
  switch (r.view) {
    case 'learn': return { kind: 'lesson', id: r.topicId, at };
    case 'problem': return { kind: 'lesson', id: r.topicId, at };
    case 'glossary': return r.termId === null ? null : { kind: 'term', id: r.termId, at };
    case 'paper': return { kind: 'paper', id: r.paperId, at };
    default: return null;
  }
}

/** The list with `x` first, an older visit to the same item dropped, at most `RECENT_MAX` long. */
export function pushRecent(list: readonly Recent[], x: Recent): Recent[] {
  return [x, ...list.filter((y) => y.kind !== x.kind || y.id !== x.id)].slice(0, RECENT_MAX);
}

export function parseRecent(raw: string | null): Recent[] {
  if (raw === null) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is Recent => typeof x === 'object' && x !== null
      && ['lesson', 'term', 'paper'].includes((x as Recent).kind)
      && typeof (x as Recent).id === 'string' && typeof (x as Recent).at === 'number').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- search

export type HitKind = 'lesson' | 'term' | 'paper' | 'action';

export interface Hit {
  kind: HitKind;
  id: string;
  label: string;
  /** The small grey word on the right: "lesson", "term", "paper", or a shortcut. */
  hint: string;
  to: Route | null;
}

export interface Searchable {
  kind: Exclude<HitKind, 'action'>;
  id: string;
  label: string;
  /** Other names it can be found by. */
  also?: readonly string[];
  to: Route;
}

/** 3 for an exact name, 2 for a prefix, 1.5 for a word prefix, 1 for a substring, 0 for no match. */
export function matchScore(query: string, names: readonly string[]): number {
  const q = query.trim().toLowerCase();
  if (q === '') return 0;
  let best = 0;
  for (const raw of names) {
    const n = raw.toLowerCase();
    if (n === q) return 3;
    if (n.startsWith(q)) best = Math.max(best, 2);
    else if (n.split(/[\s,:;()/-]+/).some((w) => w.startsWith(q))) best = Math.max(best, 1.5);
    else if (n.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

const KIND_ORDER: Readonly<Record<Searchable['kind'], number>> = { lesson: 0, term: 1, paper: 2 };

/** The best `limit` matches, best first; ties go lessons, then terms, then papers, then by name. */
export function search(query: string, items: readonly Searchable[], limit = 12): Hit[] {
  return items
    .map((x) => ({ x, s: matchScore(query, [x.label, ...(x.also ?? [])]) }))
    .filter((y) => y.s > 0)
    .sort((a, b) => b.s - a.s || KIND_ORDER[a.x.kind] - KIND_ORDER[b.x.kind] || a.x.label.localeCompare(b.x.label))
    .slice(0, limit)
    .map(({ x }) => ({ kind: x.kind, id: x.id, label: x.label, hint: x.kind, to: x.to }));
}

// ---------------------------------------------------------------- Today's clock

/** The hour (0 to 23) and minute in New York, where the planner's day is. */
export function nyClock(ms: number): { h: number; m: number; s: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get('hour') % 24, m: get('minute'), s: get('second') };
}

/** "11:42:07 am": 12-hour, to the second. */
export function clockText(ms: number): string {
  const { h, m, s } = nyClock(ms);
  const p2 = (n: number): string => String(n).padStart(2, '0');
  return `${h % 12 || 12}:${p2(m)}:${p2(s)} ${h >= 12 ? 'pm' : 'am'}`;
}

/** The greeting for an hour: before 5 am is still the evening before. */
export function greeting(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Whose app this is: the greeting's name. */
export const LEARNER_NAME = 'Albert';
