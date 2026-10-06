/**
 * The two parts of the learner envelope that are one current state, not a log: the day's
 * mixed review and the timed-paper flags. Each has a rule that picks one state, so they
 * still merge to the same result in any order.
 *
 * Mixed review (`mastery.mixed.v1`): the later day wins. On the same day the later plan
 * wins (a fresh review asked for after the first), then the copy further through it (more
 * answers; the answers themselves are in the progress document, so none is lost), and the
 * day stays done if either copy finished it.
 *
 * Flags (`mastery.flags.v1`): the parts flagged during the running timed sitting or ladder
 * attempt. The later-started sitting wins (ids end in `@<start ms>`); for the same sitting,
 * each part's flag is last writer wins, so a part flagged on one device and another part
 * on the other both stay, and an unflag wins over the earlier flag.
 */
import { parseMixedSitting, type MixedSitting } from '@/model/mixedReview';
import { canonicalJson, isObj, isTime, markTo, maxBy, mergeMarks, parseMarks, rec, stampAfter, type MarkSet } from './join';

// ---------------------------------------------------------------- mixed review

export interface MixedSync {
  value: MixedSitting | null;
  /** When this plan was made: a fresh plan on the same day beats the one before it. */
  planAt: number;
}

export const emptyMixedSync = (): MixedSync => ({ value: null, planAt: 0 });

export function mergeMixed(a: MixedSync, b: MixedSync): MixedSync {
  const x = a.value;
  const y = b.value;
  if (x === null || y === null) return x === null ? b : a;
  if (x.day !== y.day) return x.day > y.day ? a : b;
  const w = maxBy(a, b, (m) => [m.planAt, m.value!.results.length, canonicalJson({ items: m.value!.items, results: m.value!.results })]);
  const v = w.value!;
  return { value: { day: v.day, items: v.items, results: v.results, done: x.done || y.done }, planAt: w.planAt };
}

/** Takes this device's stored sitting in: a new plan is stamped `now`; answers added to the same plan keep its stamp. */
export function observeMixed(s: MixedSync, cur: MixedSitting | null, now: number): MixedSync {
  if (cur === null) return s;
  const was = s.value;
  const samePlan = was !== null && was.day === cur.day && canonicalJson(was.items) === canonicalJson(cur.items);
  return mergeMixed(s, { value: { ...cur, items: cur.items.map((i) => ({ ...i })), results: [...cur.results] }, planAt: samePlan ? s.planAt : stampAfter(now, s.planAt) });
}

export function parseMixedSync(x: unknown): MixedSync | null {
  if (!isObj(x) || !isTime(x.planAt)) return null;
  if (x.value === null) return { value: null, planAt: x.planAt };
  const v = parseMixedSitting(JSON.stringify(x.value));
  return v === null ? null : { value: v, planAt: x.planAt };
}

// ---------------------------------------------------------------- flags

export interface FlagsSync {
  /** The sitting or attempt the flags belong to. */
  id: string | null;
  /** By part. */
  marks: MarkSet;
}

export const emptyFlagsSync = (): FlagsSync => ({ id: null, marks: rec() });

/** A sitting's start from its id (`<paper>@<ms>`), to order two sittings; -1 when the id has none. */
const startOf = (id: string): number => {
  const n = Number(id.slice(id.lastIndexOf('@') + 1));
  return id.includes('@') && Number.isFinite(n) ? n : -1;
};
const idKey = (id: string | null): (number | string)[] => (id === null ? [-Infinity] : [startOf(id), id]);

export function mergeFlags(a: FlagsSync, b: FlagsSync): FlagsSync {
  if (a.id !== b.id) return maxBy(a, b, (f) => idKey(f.id));
  return { id: a.id, marks: mergeMarks(a.marks, b.marks) };
}

/** The flags as the app stores them: `{ [id]: parts }`, in the order they were flagged. */
export function flagsOf(s: FlagsSync): Record<string, string[]> {
  if (s.id === null) return {};
  const on = Object.entries(s.marks).filter(([, m]) => m.on).sort(([x, m], [y, n]) => m.at - n.at || (x < y ? -1 : x > y ? 1 : 0));
  return { [s.id]: on.map(([k]) => k) };
}

/** Takes this device's stored flags into the state: changes are stamped `now`; flags of an older sitting are ignored. */
export function observeFlags(s: FlagsSync, cur: Readonly<Record<string, readonly string[]>>, now: number): FlagsSync {
  const ids = Object.keys(cur);
  if (ids.length === 0) return s;
  const id = ids.reduce((x, y) => (maxBy<string | null>(x, y, idKey) as string));
  const want = new Set(cur[id] ?? []);
  if (id === s.id) return { id, marks: markTo(s.marks, want, () => true, now) };
  const fresh: FlagsSync = { id, marks: markTo(rec(), want, () => true, now) };
  return mergeFlags(s, fresh);
}

/** Flags as stored locally: an object of string lists; anything else is none. */
export function parseStoredFlags(x: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) if (k !== '__proto__' && Array.isArray(v)) out[k] = v.filter((y): y is string => typeof y === 'string');
  return out;
}

export function parseFlagsSync(x: unknown): FlagsSync | null {
  if (!isObj(x) || (x.id !== null && typeof x.id !== 'string')) return null;
  return { id: x.id, marks: x.id === null ? rec() : parseMarks(x.marks) };
}
