/**
 * Story mode in the learner envelope.
 *
 * - Scenes seen (beats and side scenes included), by scene: the first time and its numbers
 *   from the earlier first play, the latest time from the later, and the larger play
 *   count (plays on two devices offline are under-counted, never double counted).
 * - Choices, by scene and choice point: last writer wins, by when the choice was made.
 *   Relationships are recomputed from the merged choices, as the app keeps them.
 * - REP at the last scene: from the copy whose last scene ended later.
 * - The queue: unioned by scene, the earlier trigger kept; a scene seen on either device
 *   leaves the queue.
 */
import { emptyStory, parseStory, relationshipsOf, type Scene, type Seen, type StoryState } from '@/model/story';
import { SCENES } from '@/model/storyScenes';
import { canonicalJson, cmp, isObj, maxBy, parseStamps, plain, put, rec, sortedRec, stampAfter } from './join';

export interface StorySync {
  value: StoryState;
  /** When each choice was last made: `<scene id>\n<choice point id>`. */
  choiceAt: Record<string, number>;
}

export const emptyStorySync = (): StorySync => ({ value: emptyStory(), choiceAt: rec() });

const cKey = (scene: string, point: string): string => `${scene}\n${point}`;

const lastOf = (st: StoryState): number => Math.max(-1, ...Object.values(st.seen).map((x) => x.last));

/**
 * Stamps present for every choice (a choice never stamped counts from its scene's latest
 * play), the queue without seen scenes in trigger then story order, relationships recomputed.
 */
export function normalizeStory(s: StorySync, scenes: readonly Scene[] = SCENES): StorySync {
  const v = s.value;
  const seen = sortedRec(v.seen);
  const choices = rec<Record<string, string>>();
  const choiceAt = rec<number>();
  for (const id of Object.keys(v.choices).sort()) {
    const made = sortedRec(v.choices[id] as Record<string, string>);
    if (Object.keys(made).length === 0) continue;
    put(choices, id, made);
    for (const p of Object.keys(made)) put(choiceAt, cKey(id, p), s.choiceAt[cKey(id, p)] ?? seen[id]?.last ?? 0);
  }
  const order = (id: string): number => {
    const i = scenes.findIndex((x) => x.id === id);
    return i < 0 ? scenes.length : i;
  };
  const queued = v.queued.filter((q) => seen[q.id] === undefined)
    .sort((x, y) => x.at - y.at || order(x.id) - order(y.id) || cmp(x.id, y.id));
  return {
    value: { seen, choices, relationships: relationshipsOf(scenes, choices), rep: v.rep, queued },
    choiceAt: sortedRec(choiceAt),
  };
}

function mergeSeen(a: Seen, b: Seen): Seen {
  const first = maxBy(a, b, (x) => [-x.first, canonicalJson(x.n)]);
  return { first: first.first, last: Math.max(a.last, b.last), plays: Math.max(a.plays, b.plays), n: first.n };
}

export function mergeStory(a0: StorySync, b0: StorySync, scenes: readonly Scene[] = SCENES): StorySync {
  const a = normalizeStory(a0, scenes);
  const b = normalizeStory(b0, scenes);
  const va = a.value;
  const vb = b.value;
  const seen = rec<Seen>();
  for (const id of new Set([...Object.keys(va.seen), ...Object.keys(vb.seen)])) {
    const x = va.seen[id];
    const y = vb.seen[id];
    put(seen, id, x === undefined ? y! : y === undefined ? x : mergeSeen(x, y));
  }
  const choices = rec<Record<string, string>>();
  const choiceAt = rec<number>();
  for (const id of new Set([...Object.keys(va.choices), ...Object.keys(vb.choices)])) {
    const ca = va.choices[id] ?? {};
    const cb = vb.choices[id] ?? {};
    const made = rec<string>();
    for (const p of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      const k = cKey(id, p);
      const x = ca[p] === undefined ? null : { s: a.choiceAt[k] as number, o: ca[p] as string };
      const y = cb[p] === undefined ? null : { s: b.choiceAt[k] as number, o: cb[p] as string };
      const w = x === null ? y! : y === null ? x : maxBy(x, y, (q) => [q.s, q.o]);
      put(made, p, w.o);
      put(choiceAt, k, w.s);
    }
    put(choices, id, made);
  }
  const rep = maxBy(va, vb, (v) => [lastOf(v), v.rep ?? -1]).rep;
  const queued = new Map<string, StoryState['queued'][number]>();
  for (const q of [...va.queued, ...vb.queued]) {
    const was = queued.get(q.id);
    queued.set(q.id, was === undefined ? q : maxBy(was, q, (x) => [-x.at, canonicalJson(x.n)]));
  }
  return normalizeStory({ value: { seen, choices, relationships: va.relationships, rep, queued: [...queued.values()] }, choiceAt }, scenes);
}

/** Takes this device's saved story into the state; a choice that changed is stamped `now`. Nothing is removed. */
export function observeStory(s0: StorySync, cur: StoryState, now: number, scenes: readonly Scene[] = SCENES): StorySync {
  const s = normalizeStory(s0, scenes);
  const v = plain(cur);
  const choiceAt = rec<number>();
  for (const [id, made] of Object.entries(v.choices)) {
    for (const [p, o] of Object.entries(made)) {
      const k = cKey(id, p);
      const was = s.value.choices[id]?.[p];
      put(choiceAt, k, was === undefined ? v.seen[id]?.last ?? now : was === o ? s.choiceAt[k] as number : stampAfter(now, s.choiceAt[k]));
    }
  }
  return mergeStory(s, { value: v, choiceAt }, scenes);
}

export function parseStorySync(x: unknown, scenes: readonly Scene[] = SCENES): StorySync | null {
  if (!isObj(x) || !isObj(x.value)) return null;
  return normalizeStory({ value: parseStory(JSON.stringify(x.value), scenes), choiceAt: parseStamps(x.choiceAt) }, scenes);
}
