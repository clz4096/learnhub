/**
 * Hash routes, so the app works from any folder on GitHub Pages and the browser's Back
 * button moves between views.
 *
 *   #/            Today (or Start for a new learner)
 *   #/start       choose the course and minutes (a new learner only)
 *   #/task/3      task 3 of today's session
 *   #/learn/<id>  a lesson opened from the map, outside today's plan
 *   #/problem/<topic id>/<problem id>  one Cambridge problem, opened from a redo on Today
 *   #/map         the knowledge map; #/map/<id> with a topic open
 *   #/progress    per course, backup, settings
 *   #/glossary    every term; #/glossary/<id> at one entry
 *   #/campaign    the Cambridge Entry campaign; #/paper/<id> one past paper in exam mode
 *   #/report      the results report
 *
 * Every step a learner can take back from has its own route, so the browser's Back (and
 * Cmd+[ or a swipe on the Mac) returns to the previous view of the app, and a reload
 * shows the same view. A route the learner cannot be on yet (anything but the glossary
 * before a course is chosen) shows the Start step instead; see App.
 */
import { signal } from '@preact/signals';

export type Route =
  | { view: 'today' }
  | { view: 'start' }
  | { view: 'task'; index: number }
  | { view: 'learn'; topicId: string }
  | { view: 'problem'; topicId: string; problemId: string }
  | { view: 'map'; topicId: string | null }
  | { view: 'progress' }
  | { view: 'glossary'; termId: string | null }
  | { view: 'campaign' }
  | { view: 'paper'; paperId: string }
  | { view: 'report' };

const ID = /^[a-z0-9.-]+$/;

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
    case 'learn': return id === null ? { view: 'map', topicId: null } : { view: 'learn', topicId: id };
    case 'problem': return id !== null && arg2 !== undefined && ID.test(arg2) ? { view: 'problem', topicId: id, problemId: arg2 } : { view: 'today' };
    case 'map': return { view: 'map', topicId: id };
    case 'progress': return { view: 'progress' };
    case 'glossary': return { view: 'glossary', termId: id };
    case 'campaign': return { view: 'campaign' };
    case 'paper': return id === null ? { view: 'campaign' } : { view: 'paper', paperId: id };
    case 'report': return { view: 'report' };
    default: return { view: 'today' };
  }
}

export function hrefOf(r: Route): string {
  switch (r.view) {
    case 'today': return '#/';
    case 'start': return '#/start';
    case 'task': return `#/task/${r.index}`;
    case 'learn': return `#/learn/${encodeURIComponent(r.topicId)}`;
    case 'problem': return `#/problem/${encodeURIComponent(r.topicId)}/${encodeURIComponent(r.problemId)}`;
    case 'map': return r.topicId === null ? '#/map' : `#/map/${encodeURIComponent(r.topicId)}`;
    case 'progress': return '#/progress';
    case 'glossary': return r.termId === null ? '#/glossary' : `#/glossary/${encodeURIComponent(r.termId)}`;
    case 'campaign': return '#/campaign';
    case 'paper': return `#/paper/${encodeURIComponent(r.paperId)}`;
    case 'report': return '#/report';
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
