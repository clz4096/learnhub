/**
 * Hash routes, so the app works from any folder on GitHub Pages and the browser's Back
 * button moves between views.
 *
 *   #/            Today (or Start for a new learner)
 *   #/start       choose the course and minutes (a new learner only)
 *   #/task/3      task 3 of today's session
 *   #/learn/<id>  a lesson opened from the map, outside today's plan; #/learn/<id>/book from the book
 *   #/problem/<topic id>/<problem id>  one Cambridge problem, opened from a redo on Today
 *   #/book        the Course tab: the degree as a book, its contents; #/book/<chapter id> one chapter
 *   #/map         the prerequisite map; #/map/<id> with a topic open
 *   #/progress    per course, backup, settings
 *   #/glossary    every term; #/glossary/<id> at one entry
 *   #/campaign    the Cambridge Entry campaign; #/paper/<id> one past paper in exam mode
 *   #/papers      the campaign's past papers (Admission's Papers tab)
 *   #/ladder/<exam>  the timed ladder for step, tmua, or a-level (under Papers); its clock runs here
 *   #/mixed       blind mixed review: interleaved problems, the topic hidden until answered
 *   #/gym         gym mode: recall cards, proof orders, drills, and listening
 *   #/report      the results report
 *   #/letters     the campaign's letters
 *   #/story       story mode: the chapters, scenes to replay, REP, relationships
 *
 * Every step a learner can take back from has its own route, so the browser's Back (and
 * Cmd+[ or a swipe on the Mac) returns to the previous view of the app, and a reload
 * shows the same view. A route the learner cannot be on yet (anything but the glossary
 * before a course is chosen) shows the Start step instead; see App.
 */
import { signal } from '@preact/signals';
import type { Exam } from './ladder';

export type Route =
  | { view: 'today' }
  | { view: 'start' }
  | { view: 'task'; index: number }
  /** `from: 'book'`: opened from a chapter page, so Back returns there. */
  | { view: 'learn'; topicId: string; from?: 'book' }
  | { view: 'book' }
  | { view: 'chapter'; chapterId: string }
  | { view: 'problem'; topicId: string; problemId: string }
  | { view: 'map'; topicId: string | null }
  | { view: 'progress' }
  | { view: 'glossary'; termId: string | null }
  | { view: 'campaign' }
  | { view: 'paper'; paperId: string }
  | { view: 'papers' }
  | { view: 'ladder'; exam: Exam }
  | { view: 'mixed' }
  | { view: 'gym' }
  | { view: 'report' }
  | { view: 'letters' }
  | { view: 'story' };

const ID = /^[a-z0-9.-]+$/;

/** Each exam's name in a URL: #/ladder/a-level. */
export const EXAM_SLUGS: Readonly<Record<Exam, string>> = { STEP: 'step', TMUA: 'tmua', 'A level': 'a-level' };
const examOfSlug = (slug: string | undefined): Exam | undefined =>
  (Object.keys(EXAM_SLUGS) as Exam[]).find((e) => EXAM_SLUGS[e] === slug);

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter((x) => x !== '').map(decodeURIComponent);
  const [head, arg, arg2] = parts;
  const id = arg !== undefined && ID.test(arg) ? arg : null;
  switch (head) {
    case 'start': return { view: 'start' };
    case 'task': {
      const i = Number(arg);
      return Number.isInteger(i) && i >= 0 ? { view: 'task', index: i } : { view: 'today' };
    }
    case 'learn':
      if (id === null) return { view: 'map', topicId: null };
      return arg2 === 'book' ? { view: 'learn', topicId: id, from: 'book' } : { view: 'learn', topicId: id };
    case 'book': return id === null ? { view: 'book' } : { view: 'chapter', chapterId: id };
    case 'problem': return id !== null && arg2 !== undefined && ID.test(arg2) ? { view: 'problem', topicId: id, problemId: arg2 } : { view: 'today' };
    case 'map': return { view: 'map', topicId: id };
    case 'progress': return { view: 'progress' };
    case 'glossary': return { view: 'glossary', termId: id };
    case 'campaign': return { view: 'campaign' };
    case 'paper': return id === null ? { view: 'campaign' } : { view: 'paper', paperId: id };
    case 'papers': return { view: 'papers' };
    case 'ladder': {
      const exam = examOfSlug(arg);
      return exam === undefined ? { view: 'papers' } : { view: 'ladder', exam };
    }
    case 'mixed': return { view: 'mixed' };
    case 'gym': return { view: 'gym' };
    case 'report': return { view: 'report' };
    case 'letters': return { view: 'letters' };
    case 'story': return { view: 'story' };
    default: return { view: 'today' };
  }
}

export function hrefOf(r: Route): string {
  switch (r.view) {
    case 'today': return '#/';
    case 'start': return '#/start';
    case 'task': return `#/task/${r.index}`;
    case 'learn': return `#/learn/${encodeURIComponent(r.topicId)}${r.from === 'book' ? '/book' : ''}`;
    case 'book': return '#/book';
    case 'chapter': return `#/book/${encodeURIComponent(r.chapterId)}`;
    case 'problem': return `#/problem/${encodeURIComponent(r.topicId)}/${encodeURIComponent(r.problemId)}`;
    case 'map': return r.topicId === null ? '#/map' : `#/map/${encodeURIComponent(r.topicId)}`;
    case 'progress': return '#/progress';
    case 'glossary': return r.termId === null ? '#/glossary' : `#/glossary/${encodeURIComponent(r.termId)}`;
    case 'campaign': return '#/campaign';
    case 'paper': return `#/paper/${encodeURIComponent(r.paperId)}`;
    case 'papers': return '#/papers';
    case 'ladder': return `#/ladder/${EXAM_SLUGS[r.exam]}`;
    case 'mixed': return '#/mixed';
    case 'gym': return '#/gym';
    case 'report': return '#/report';
    case 'letters': return '#/letters';
    case 'story': return '#/story';
  }
}

export const route = signal<Route>(typeof location === 'undefined' ? { view: 'today' } : parseRoute(location.hash));

/**
 * Moves to a route, adding a history entry. `replace` swaps the current entry instead,
 * for a URL that only names where the learner already is (see App), so Back skips it.
 */
export function go(r: Route, options: { replace?: boolean } = {}): void {
  const href = hrefOf(r);
  if (typeof location !== 'undefined' && location.hash !== href) {
    if (options.replace === true) history.replaceState(history.state, '', href);
    else location.hash = href;
  }
  route.value = r;
}

export function listen(): () => void {
  const on = (): void => { route.value = parseRoute(location.hash); };
  window.addEventListener('hashchange', on);
  return () => window.removeEventListener('hashchange', on);
}
