/**
 * Hash routes, so the app works from any folder on GitHub Pages and the browser's Back
 * button moves between views.
 *
 *   #/            Today (or Start for a new learner)
 *   #/start       choose courses and minutes (prefilled when coming back from placement)
 *   #/placement   the placement test: its introduction, the questions, then the result
 *   #/task/3      task 3 of today's session
 *   #/learn/<id>  a lesson opened from the map, outside today's plan
 *   #/map         the knowledge map; #/map/<id> with a topic open
 *   #/progress    per course, backup, settings
 *   #/glossary    every term; #/glossary/<id> at one entry
 *
 * Every step a learner can take back from has its own route, so the browser's Back (and
 * Cmd+[ or a swipe on the Mac) returns to the previous view of the app, and a reload
 * shows the same view. A route the learner cannot be on yet (anything but the glossary
 * before placement is done) shows the Start step instead; see App.
 */
import { signal } from '@preact/signals';

export type Route =
  | { view: 'today' }
  | { view: 'start' }
  | { view: 'placement' }
  | { view: 'task'; index: number }
  | { view: 'learn'; topicId: string }
  | { view: 'map'; topicId: string | null }
  | { view: 'progress' }
  | { view: 'glossary'; termId: string | null };

const ID = /^[a-z0-9.-]+$/;

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter((x) => x !== '').map(decodeURIComponent);
  const [head, arg] = parts;
  const id = arg !== undefined && ID.test(arg) ? arg : null;
  switch (head) {
    case 'start': return { view: 'start' };
    case 'placement': return { view: 'placement' };
    case 'task': {
      const i = Number(arg);
      return Number.isInteger(i) && i >= 0 ? { view: 'task', index: i } : { view: 'today' };
    }
    case 'learn': return id === null ? { view: 'map', topicId: null } : { view: 'learn', topicId: id };
    case 'map': return { view: 'map', topicId: id };
    case 'progress': return { view: 'progress' };
    case 'glossary': return { view: 'glossary', termId: id };
    default: return { view: 'today' };
  }
}

export function hrefOf(r: Route): string {
  switch (r.view) {
    case 'today': return '#/';
    case 'start': return '#/start';
    case 'placement': return '#/placement';
    case 'task': return `#/task/${r.index}`;
    case 'learn': return `#/learn/${encodeURIComponent(r.topicId)}`;
    case 'map': return r.topicId === null ? '#/map' : `#/map/${encodeURIComponent(r.topicId)}`;
    case 'progress': return '#/progress';
    case 'glossary': return r.termId === null ? '#/glossary' : `#/glossary/${encodeURIComponent(r.termId)}`;
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
