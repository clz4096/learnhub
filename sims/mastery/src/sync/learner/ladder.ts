/**
 * The timed ladder in the learner envelope: attempts unioned by id, each merged as a
 * campaign sitting is (`mergeTimed`: a finished copy beats a running one, the later marks
 * win), and discarded attempts kept as removals that win over every copy.
 *
 * The app checks attempts against the paper registry when it reads them (`parseLadder`),
 * and the registry loads on demand, so sync checks only their shape here and leaves the
 * registry's checks to the app. An attempt this build's registry does not know stays in
 * the envelope, so an older build never drops a newer one's work.
 *
 * The running attempt follows the campaign's rule (campaign.ts): two attempts started
 * offline on two devices both stay; the ladder shows the earlier first.
 */
import { parseForecast } from '@/model/campaign';
import type { LadderAttempt } from '@/model/ladder';
import { mergeTimed, resultsOf, timedDefault } from './campaign';
import { cmp, isObj, isTime, mergeStamps, parseStamps, plain, put, rec, sortedRec, stampAfter } from './join';

const RESULTS = ['answers', 'marks', 'total', 'outOf'] as const;

export interface LadderSync {
  attempts: LadderAttempt[];
  /** When each attempt's marks were last entered, by id. */
  results: Record<string, number>;
  /** Discarded attempts, by id, with when. */
  removed: Record<string, number>;
}

export const emptyLadderSync = (): LadderSync => ({ attempts: [], results: rec(), removed: rec() });

export function normalizeLadder(s: LadderSync): LadderSync {
  const removed = sortedRec(s.removed);
  const attempts = s.attempts.filter((a) => removed[a.id] === undefined).sort((x, y) => x.startedAt - y.startedAt || cmp(x.id, y.id));
  const results = rec<number>();
  for (const a of attempts) put(results, a.id, s.results[a.id] ?? timedDefault(a));
  return { attempts, results: sortedRec(results), removed };
}

export function mergeLadder(a0: LadderSync, b0: LadderSync): LadderSync {
  const a = normalizeLadder(a0);
  const b = normalizeLadder(b0);
  const out = new Map<string, LadderAttempt>();
  const results = rec<number>();
  for (const x of a.attempts) {
    out.set(x.id, x);
    put(results, x.id, a.results[x.id] as number);
  }
  for (const y of b.attempts) {
    const x = out.get(y.id);
    if (x === undefined) {
      out.set(y.id, y);
      put(results, y.id, b.results[y.id] as number);
      continue;
    }
    const j = mergeTimed(x, y, RESULTS, results[x.id] as number, b.results[y.id] as number);
    out.set(y.id, j.item);
    put(results, y.id, j.stamp);
  }
  return normalizeLadder({ attempts: [...out.values()], results, removed: mergeStamps(a.removed, b.removed) });
}

/** Takes this device's stored attempts into the state; marks that changed are stamped `now`. Missing attempts are kept. */
export function observeLadder(s0: LadderSync, cur: readonly LadderAttempt[], now: number): LadderSync {
  const s = normalizeLadder(s0);
  const results = rec<number>();
  const attempts = plain([...cur]);
  for (const x of attempts) {
    const was = s.attempts.find((y) => y.id === x.id);
    put(results, x.id, was === undefined ? timedDefault(x)
      : resultsOf(was, RESULTS) === resultsOf(x, RESULTS) ? s.results[x.id] as number : stampAfter(now, s.results[x.id]));
  }
  return mergeLadder(s, { attempts, results, removed: s.removed });
}

/** Records that the learner discarded an attempt. */
export function removeFromLadder(s: LadderSync, id: string, now: number): LadderSync {
  const removed = rec<number>();
  for (const k of Object.keys(s.removed)) put(removed, k, s.removed[k] as number);
  put(removed, id, now);
  return normalizeLadder({ ...s, removed });
}

const isMarkList = (x: unknown, ok: (y: unknown) => boolean): boolean => Array.isArray(x) && x.every((y) => y === null || ok(y));

/** An attempt's shape, without the registry; null when it is not one. */
export function parseAttemptShape(x: unknown): LadderAttempt | null {
  if (!isObj(x) || typeof x.id !== 'string' || typeof x.paperId !== 'string' || (x.rung !== 'question' && x.rung !== 'half')) return null;
  if (!isTime(x.startedAt) || (x.finishedAt !== null && !isTime(x.finishedAt))) return null;
  if (!Array.isArray(x.questions) || !x.questions.every((q) => Number.isInteger(q))) return null;
  const a: LadderAttempt = { id: x.id, paperId: x.paperId, rung: x.rung, questions: [...(x.questions as number[])], startedAt: x.startedAt, finishedAt: x.finishedAt as number | null };
  if (isMarkList(x.answers, (y) => typeof y === 'string')) a.answers = [...(x.answers as (string | null)[])];
  if (isMarkList(x.marks, (y) => Number.isInteger(y))) a.marks = [...(x.marks as (number | null)[])];
  if (Number.isInteger(x.total)) a.total = x.total as number;
  if (Number.isInteger(x.outOf)) a.outOf = x.outOf as number;
  const forecast = parseForecast(x.forecast);
  if (forecast !== undefined) a.forecast = forecast;
  return a;
}

/** Attempts as stored (`mastery.ladder.v1`), by shape only; duplicates of an id after the first are dropped. */
export function parseAttempts(x: unknown): LadderAttempt[] {
  if (!Array.isArray(x)) return [];
  const out: LadderAttempt[] = [];
  const ids = new Set<string>();
  for (const y of x) {
    const a = parseAttemptShape(y);
    if (a === null || ids.has(a.id)) continue;
    ids.add(a.id);
    out.push(a);
  }
  return out;
}

export function parseLadderSync(x: unknown): LadderSync | null {
  if (!isObj(x) || !Array.isArray(x.attempts)) return null;
  return normalizeLadder({ attempts: parseAttempts(x.attempts), results: parseStamps(x.results), removed: parseStamps(x.removed) });
}
