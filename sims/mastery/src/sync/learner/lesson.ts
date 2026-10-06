/**
 * Lesson places and write-up drafts in the learner envelope (`mastery.lessonplace.v1`,
 * `mastery.writeup.v1`; model/lessonState.ts): where the learner is inside each unfinished
 * lesson, and each supervision write-up not yet sent.
 *
 * Per key, the entry saved last wins (`updatedAt`). On a tie a cleared entry wins (a lesson
 * finished, a draft emptied), then the larger entry as canonical JSON, so the order is total
 * and the merge is a join. A cleared place stays as an entry, so an older in-progress copy
 * from another device cannot bring a finished lesson back.
 *
 * Entries are dropped once older than `horizon`, the latest cutoff any device has applied
 * (60 days before its clock). The horizon is itself a maximum and an entry dropped by one
 * copy's horizon is older than every copy's merged horizon, so dropping commutes with the
 * merge: the result is the per-key winner over all copies, cut at the largest horizon.
 *
 * A place for a lesson the progress document already shows finished is not a merge rule
 * here (the envelope does not see the document): the device clears it when it reads its
 * places (`settlePlaces`), and that clear syncs like any other.
 */
import {
  DRAFT_TTL_MS, parsePlaces, parseWriteUps, type PlaceEntry, type PlaceMap, type WriteUpEntry, type WriteUpMap,
} from '@/model/lessonState';
import { canonicalJson, isObj, isTime, maxBy, put, rec, sortedRec, type Key } from './join';

export interface LessonSync {
  /** Entries saved before this time are dropped, on every device. */
  horizon: number;
  places: PlaceMap;
  writeUps: WriteUpMap;
}

/** The two maps as the app stores them; each entry carries its own stamp. */
export interface LessonValues {
  places: PlaceMap;
  writeUps: WriteUpMap;
}

export const emptyLessonSync = (): LessonSync => ({ horizon: 0, places: rec(), writeUps: rec() });
export const emptyLessonValues = (): LessonValues => ({ places: rec(), writeUps: rec() });

const placeOrder = (e: PlaceEntry): Key => [e.updatedAt, e.place === null ? 1 : 0, canonicalJson(e.place)];
const writeUpOrder = (e: WriteUpEntry): Key => [e.updatedAt, e.text === '' ? 1 : 0, e.text];

/** Per key the larger entry, keeping only entries at or after `horizon`, keys in order. */
function joinMaps<T extends { updatedAt: number }>(
  a: Readonly<Record<string, T>>, b: Readonly<Record<string, T>>, order: (e: T) => Key, horizon: number,
): Record<string, T> {
  const out = rec<T>();
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    // Own keys only: a map from the app may be a plain object, where "__proto__" reads its prototype.
    const x = Object.hasOwn(a, k) ? a[k] : undefined;
    const y = Object.hasOwn(b, k) ? b[k] : undefined;
    const w = x === undefined ? y! : y === undefined ? x : maxBy(x, y, order);
    if (w.updatedAt >= horizon) put(out, k, w);
  }
  return out;
}

export function mergeLesson(a: LessonSync, b: LessonSync): LessonSync {
  const horizon = Math.max(a.horizon, b.horizon);
  return {
    horizon,
    places: joinMaps(a.places, b.places, placeOrder, horizon),
    writeUps: joinMaps(a.writeUps, b.writeUps, writeUpOrder, horizon),
  };
}

export const normalizeLesson = (s: LessonSync): LessonSync => mergeLesson(s, s);

/**
 * Takes this device's stored maps in. Their entries were stamped when saved, so `now` only
 * moves the horizon, and only when that drops an entry: an envelope with nothing old in it
 * is unchanged by observing it again.
 */
export function observeLesson(s: LessonSync, v: LessonValues, now: number): LessonSync {
  const m = mergeLesson(s, { horizon: s.horizon, places: v.places, writeUps: v.writeUps });
  const cut = now - DRAFT_TTL_MS;
  if (cut <= m.horizon) return m;
  const old = (e: { updatedAt: number }): boolean => e.updatedAt < cut;
  if (!Object.values(m.places).some(old) && !Object.values(m.writeUps).some(old)) return m;
  return mergeLesson(m, { horizon: cut, places: rec(), writeUps: rec() });
}

export function lessonValuesOf(s: LessonSync): LessonValues {
  return { places: sortedRec(s.places), writeUps: sortedRec(s.writeUps) };
}

/**
 * The part from untrusted JSON. Missing (an envelope from a build before lesson places
 * synced) is empty; not an object refuses the envelope; bad entries are dropped.
 */
export function parseLessonSync(x: unknown): LessonSync | null {
  if (x === undefined) return emptyLessonSync();
  if (!isObj(x)) return null;
  const horizon = isTime(x.horizon) ? x.horizon : 0;
  return normalizeLesson({ horizon, places: parsePlaces(x.places), writeUps: parseWriteUps(x.writeUps) });
}
