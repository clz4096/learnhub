/**
 * The campaign in the learner envelope: the campaign itself, when each of its choices and
 * results was last set, and what was removed.
 *
 * - Choices (route, college, A level order, TMUA sitting, application filed): last writer
 *   wins, field by field.
 * - Sittings and interviews: unioned by id. A sitting's paper, act, and start never change;
 *   a finished copy beats a running one (the earlier Finish if both finished); its marks are
 *   last writer wins. An interview's mark and notes are last writer wins together.
 * - Removed sittings and interviews: a removal is kept with its id and wins over every copy
 *   of the item. Only an explicit removal (`removeFromCampaign`) records one: an item missing
 *   from this device's copy (an older build that could not read it) is not a removal.
 * - Letters: unioned by id, the earlier delivery kept.
 * - Begun: the earlier start.
 *
 * A running sitting is the one current state here: the app runs one paper at a time. Two
 * devices that each started a paper offline both keep their sitting after a merge, both
 * running; the Paper screen shows the earlier one first, and the other's clock has run on
 * meanwhile, so it reads as over time once reached. Nothing is lost or guessed.
 */
import { parseCampaign, type Campaign, type InterviewRecord, type LetterId, type Sitting } from '@/model/campaign';
import {
  canonicalJson, cmp, isObj, maxBy, mergeStamps, parseStamps, plain, put, rec, sortedRec, stampAfter, type Obj,
} from './join';

export const CAMPAIGN_FIELDS = ['route', 'college', 'aLevelOrder', 'tmuaSitting', 'applicationFiledAt'] as const;
export type CampaignField = (typeof CAMPAIGN_FIELDS)[number];

const SITTING_RESULTS = ['answers', 'questionMarks', 'total'] as const;
const LETTER_ORDER: readonly LetterId[] = ['received', 'invitation', 'offer', 'results'];

export interface CampaignSync {
  value: Campaign | null;
  /** When each choice was last set (ms). */
  fields: Partial<Record<CampaignField, number>>;
  /** When each item's result was last entered: `s:<sitting id>`, `i:<interview id>`. */
  results: Record<string, number>;
  /** Removed items, same keys, with when. */
  removed: Record<string, number>;
}

export const emptyCampaignSync = (): CampaignSync => ({ value: null, fields: {}, results: rec(), removed: rec() });

const sKey = (id: string): string => `s:${id}`;
const iKey = (id: string): string => `i:${id}`;

// ---------------------------------------------------------------- timed items (shared with the ladder)

/**
 * Two copies of one timed sitting or attempt (same id), with the times their results were
 * entered. What it is never changes (the larger canonical copy, for determinism); a finished
 * copy beats a running one, the earlier Finish winning; the later result wins.
 */
export function mergeTimed<T extends { finishedAt: number | null }>(
  a: T, b: T, resultKeys: readonly string[], sa: number, sb: number,
): { item: T; stamp: number } {
  const split = (x: T): { fixed: Obj; result: Obj } => {
    const fixed: Obj = {};
    const result: Obj = {};
    for (const [k, v] of Object.entries(x)) {
      if (k === 'finishedAt' || v === undefined) continue;
      (resultKeys.includes(k) ? result : fixed)[k] = v;
    }
    return { fixed, result };
  };
  const x = split(a);
  const y = split(b);
  const fixed = maxBy(x.fixed, y.fixed, (f) => [canonicalJson(f)]);
  const finishedAt = maxBy(a.finishedAt, b.finishedAt, (f) => (f === null ? [0] : [1, -f]));
  const r = maxBy({ s: sa, r: x.result }, { s: sb, r: y.result }, (q) => [q.s, canonicalJson(q.r)]);
  return { item: { ...fixed, finishedAt, ...r.r } as T, stamp: r.s };
}

/** The result fields of a timed item, as canonical JSON, to tell whether they changed. */
export function resultsOf(x: object, keys: readonly string[]): string {
  const o: Obj = {};
  for (const k of keys) {
    const v = (x as Obj)[k];
    if (v !== undefined) o[k] = v;
  }
  return canonicalJson(o);
}

/** When a timed item's result counts as entered, before anything was recorded: its finish, else its start. */
export const timedDefault = (x: { startedAt: number; finishedAt: number | null }): number => x.finishedAt ?? x.startedAt;

// ---------------------------------------------------------------- normal form

/**
 * Every stamp present (an item never stamped counts from its finish, copy, or the campaign's
 * start), removed items dropped, lists in canonical order. Every function here returns this
 * form, so merging a state with itself returns it unchanged.
 */
export function normalizeCampaign(s: CampaignSync): CampaignSync {
  const removed = sortedRec(s.removed);
  const c = s.value;
  if (c === null) return { value: null, fields: {}, results: rec(), removed };
  const sittings = c.sittings.filter((x) => removed[sKey(x.id)] === undefined)
    .sort((x, y) => x.startedAt - y.startedAt || cmp(x.id, y.id));
  const interviews = c.interviews.filter((x) => removed[iKey(x.id)] === undefined)
    .sort((x, y) => x.copiedAt - y.copiedAt || cmp(x.id, y.id));
  const results = rec<number>();
  for (const x of sittings) put(results, sKey(x.id), s.results[sKey(x.id)] ?? timedDefault(x));
  for (const x of interviews) put(results, iKey(x.id), s.results[iKey(x.id)] ?? x.copiedAt);
  const fields: Partial<Record<CampaignField, number>> = {};
  for (const f of CAMPAIGN_FIELDS) fields[f] = s.fields[f] ?? c.startedAt;
  const letters = [...c.letters].sort((x, y) => x.at - y.at || LETTER_ORDER.indexOf(x.id) - LETTER_ORDER.indexOf(y.id));
  return { value: { ...c, sittings, interviews, letters }, fields, results: sortedRec(results), removed };
}

// ---------------------------------------------------------------- merge

function mergeInterview(a: InterviewRecord, b: InterviewRecord, sa: number, sb: number): { item: InterviewRecord; stamp: number } {
  const fixed = maxBy(a, b, (x) => [canonicalJson({ id: x.id, shape: x.shape, college: x.college, copiedAt: x.copiedAt })]);
  const r = maxBy({ s: sa, x: a }, { s: sb, x: b }, (q) => [q.s, canonicalJson({ mark: q.x.mark, notes: q.x.notes })]);
  return { item: { id: fixed.id, shape: fixed.shape, college: fixed.college, copiedAt: fixed.copiedAt, mark: r.x.mark, notes: r.x.notes }, stamp: r.s };
}

function unionItems<T extends { id: string }>(
  a: readonly T[], b: readonly T[], key: (id: string) => string, ra: Readonly<Record<string, number>>, rb: Readonly<Record<string, number>>,
  join: (x: T, y: T, sx: number, sy: number) => { item: T; stamp: number }, results: Record<string, number>,
): T[] {
  const out = new Map<string, T>();
  for (const x of a) {
    out.set(x.id, x);
    put(results, key(x.id), ra[key(x.id)] as number);
  }
  for (const y of b) {
    const x = out.get(y.id);
    if (x === undefined) {
      out.set(y.id, y);
      put(results, key(y.id), rb[key(y.id)] as number);
      continue;
    }
    const j = join(x, y, results[key(x.id)] as number, rb[key(y.id)] as number);
    out.set(y.id, j.item);
    put(results, key(y.id), j.stamp);
  }
  return [...out.values()];
}

/** Merges two campaign states; see the file comment for the rules. */
export function mergeCampaign(a0: CampaignSync, b0: CampaignSync): CampaignSync {
  const a = normalizeCampaign(a0);
  const b = normalizeCampaign(b0);
  const removed = mergeStamps(a.removed, b.removed);
  if (a.value === null || b.value === null) {
    const one = a.value === null ? b : a;
    return normalizeCampaign({ ...one, removed });
  }
  const ca = a.value;
  const cb = b.value;
  const fields: Partial<Record<CampaignField, number>> = {};
  const picked: Obj = {};
  for (const f of CAMPAIGN_FIELDS) {
    const w = maxBy({ s: a.fields[f] as number, v: ca[f] }, { s: b.fields[f] as number, v: cb[f] }, (q) => [q.s, canonicalJson(q.v)]);
    fields[f] = w.s;
    picked[f] = w.v;
  }
  const results = rec<number>();
  const sittings = unionItems<Sitting>(ca.sittings, cb.sittings, sKey, a.results, b.results,
    (x, y, sx, sy) => mergeTimed(x, y, SITTING_RESULTS, sx, sy), results);
  const interviews = unionItems(ca.interviews, cb.interviews, iKey, a.results, b.results, mergeInterview, results);
  const letters = new Map<LetterId, number>();
  for (const l of [...ca.letters, ...cb.letters]) letters.set(l.id, Math.min(letters.get(l.id) ?? Infinity, l.at));
  const value: Campaign = {
    startedAt: Math.min(ca.startedAt, cb.startedAt),
    route: picked.route as Campaign['route'],
    college: picked.college as Campaign['college'],
    aLevelOrder: [...(picked.aLevelOrder as Campaign['aLevelOrder'])],
    tmuaSitting: picked.tmuaSitting as Campaign['tmuaSitting'],
    sittings,
    interviews,
    applicationFiledAt: picked.applicationFiledAt as Campaign['applicationFiledAt'],
    letters: [...letters].map(([id, at]) => ({ id, at })),
  };
  return normalizeCampaign({ value, fields, results, removed });
}

// ---------------------------------------------------------------- this device's changes

/**
 * Takes this device's campaign as saved (`cur`) into the state: what changed since the state
 * was last taken is stamped `now`. Items the state has and `cur` lacks are kept, as only
 * `removeFromCampaign` removes. A state never taken before is built with the default stamps.
 */
export function observeCampaign(s0: CampaignSync, cur: Campaign | null, now: number): CampaignSync {
  const s = normalizeCampaign(s0);
  if (cur === null) return s;
  const c = plain(cur);
  const prev = s.value;
  if (prev === null) return mergeCampaign(s, normalizeCampaign({ value: c, fields: {}, results: rec(), removed: s.removed }));
  const fields: Partial<Record<CampaignField, number>> = {};
  for (const f of CAMPAIGN_FIELDS) {
    const same = canonicalJson(prev[f]) === canonicalJson(c[f]);
    fields[f] = same ? s.fields[f] : stampAfter(now, s.fields[f]);
  }
  const results = rec<number>();
  for (const x of c.sittings) {
    const was = prev.sittings.find((y) => y.id === x.id);
    const k = sKey(x.id);
    if (was === undefined) put(results, k, timedDefault(x));
    else put(results, k, resultsOf(was, SITTING_RESULTS) === resultsOf(x, SITTING_RESULTS) ? s.results[k] as number : stampAfter(now, s.results[k]));
  }
  for (const x of c.interviews) {
    const was = prev.interviews.find((y) => y.id === x.id);
    const k = iKey(x.id);
    if (was === undefined) put(results, k, x.copiedAt);
    else put(results, k, was.mark === x.mark && was.notes === x.notes ? s.results[k] as number : stampAfter(now, s.results[k]));
  }
  return mergeCampaign(s, { value: c, fields, results, removed: s.removed });
}

/** Records the explicit removal of a sitting or an interview, so it stays removed on every device. */
export function removeFromCampaign(s: CampaignSync, kind: 'sitting' | 'interview', id: string, now: number): CampaignSync {
  const removed = rec<number>();
  for (const k of Object.keys(s.removed)) put(removed, k, s.removed[k] as number);
  put(removed, kind === 'sitting' ? sKey(id) : iKey(id), now);
  return normalizeCampaign({ ...s, removed });
}

// ---------------------------------------------------------------- remote input

/** A campaign state from untrusted JSON, or null when it is not one. Bad entries are dropped, as the app's own parser drops them. */
export function parseCampaignSync(x: unknown): CampaignSync | null {
  if (!isObj(x)) return null;
  let value: Campaign | null = null;
  if (x.value !== null && x.value !== undefined) {
    value = parseCampaign(JSON.stringify(x.value));
    if (value === null) return null;
  }
  const f = parseStamps(x.fields);
  const fields: Partial<Record<CampaignField, number>> = {};
  for (const k of CAMPAIGN_FIELDS) if (f[k] !== undefined) fields[k] = f[k];
  return normalizeCampaign({ value, fields, results: parseStamps(x.results), removed: parseStamps(x.removed) });
}
