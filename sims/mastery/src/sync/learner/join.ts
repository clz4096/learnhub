/**
 * Building blocks for the learner envelope's merges (envelope.ts). Each is a join: a
 * maximum under a total order, a union, or a per-key product of those, so every merge
 * built from them is idempotent, commutative, and associative (see packages/mastery
 * merge.ts for the same argument on the progress document).
 */
import { canonicalJson } from '@learnhub/mastery';

export { canonicalJson };

export type Key = readonly (number | string)[];

export const cmp = (a: number | string, b: number | string): number => (a < b ? -1 : a > b ? 1 : 0);

export function cmpKeys(a: Key, b: Key): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = cmp(a[i] as number | string, b[i] as number | string);
    if (c !== 0) return c;
  }
  return a.length - b.length;
}

/** The larger under `key`; the key must end in a value that tells any two different inputs apart. */
export function maxBy<T>(a: T, b: T, key: (x: T) => Key): T {
  return cmpKeys(key(a), key(b)) >= 0 ? a : b;
}

/**
 * A stamp for a change made now that is later than `prev`, so a change always beats the
 * value it replaced even when the device clock has gone back.
 */
export const stampAfter = (now: number, prev: number | undefined): number => Math.max(now, (prev ?? -Infinity) + 1);

/** A record with no prototype to poison: keys come from stored or remote data. */
export function rec<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/** Sets a key without ever touching the prototype (a key of "__proto__" is an ordinary key). */
export function put<T>(o: Record<string, T>, k: string, v: T): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

/** A copy with the keys in sorted order, so equal records print alike. */
export function sortedRec<T>(o: Readonly<Record<string, T>>): Record<string, T> {
  const out = rec<T>();
  for (const k of Object.keys(o).sort()) put(out, k, o[k] as T);
  return out;
}

/** Per key, the larger stamp. */
export function mergeStamps(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): Record<string, number> {
  const out = rec<number>();
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) put(out, k, Math.max(a[k] ?? -Infinity, b[k] ?? -Infinity));
  return out;
}

/** An element of a last-writer-wins set: whether it is in, and when that was last set. */
export interface Mark {
  at: number;
  on: boolean;
}

export type MarkSet = Record<string, Mark>;

/** Per key, the later mark; on a tie of times, "in" beats "out". */
export function mergeMarks(a: Readonly<MarkSet>, b: Readonly<MarkSet>): MarkSet {
  const out = rec<Mark>();
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[k];
    const y = b[k];
    put(out, k, x === undefined ? y! : y === undefined ? x : maxBy(x, y, (m) => [m.at, m.on ? 1 : 0]));
  }
  return out;
}

/**
 * Marks that make the set's members exactly `want` among keys passing `scope`: each key
 * that changes is stamped after its previous mark.
 */
export function markTo(set: Readonly<MarkSet>, want: ReadonlySet<string>, scope: (k: string) => boolean, now: number): MarkSet {
  const out = rec<Mark>();
  for (const k of Object.keys(set)) put(out, k, set[k] as Mark);
  for (const k of new Set([...Object.keys(set).filter(scope), ...want])) {
    const m = set[k];
    const on = want.has(k);
    if ((m?.on ?? false) !== on) put(out, k, { at: stampAfter(now, m?.at), on });
  }
  return sortedRec(out);
}

// ---------------------------------------------------------------- parsing remote data

export type Obj = Record<string, unknown>;
export const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
export const isTime = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** A record of finite numbers; anything else in it is dropped. */
export function parseStamps(x: unknown): Record<string, number> {
  const out = rec<number>();
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) if (isTime(v)) put(out, k, v);
  return sortedRec(out);
}

export function parseMarks(x: unknown): MarkSet {
  const out = rec<Mark>();
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) if (isObj(v) && isTime(v.at) && typeof v.on === 'boolean') put(out, k, { at: v.at, on: v.on });
  return sortedRec(out);
}

/** A plain JSON copy (drops undefined fields), for values that came from the app. */
export const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
