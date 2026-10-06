/**
 * Where the learner is inside an unfinished lesson (its stage, section, furthest outline
 * entry, and practice run), and the drafts of supervision write-ups. Both are kept in
 * localStorage, so closing the tab or the Home Screen app does not lose them, and sync
 * carries them in the learner envelope (sync/learner/lesson.ts), so a lesson begun on the
 * phone resumes on the Mac.
 *
 * Each entry carries `updatedAt`, the time it was saved, which is what a merge compares.
 * Finishing a lesson does not delete its place: it leaves a cleared entry, so a merge
 * cannot bring back an older copy of the place from another device. A place saved before
 * the lesson's last finish in the progress document is stale and is never resumed; when
 * found, it is cleared. Entries untouched for 60 days are dropped.
 *
 * It is not in the progress document because it is not progress: nothing is learned until
 * the practice run ends, and that result is what the document records.
 *
 * Builds before this one kept places in sessionStorage (`mastery.lesson.<lessonKey>`);
 * those are moved here the first time this module reads its storage in that tab.
 */
import { learnerChanged } from './learnerChange';
import type { PracticeState } from './practice';
import { now, progress } from './store';

/** In order on the main path: the Cambridge stage comes after practice, as the gate does. */
export type LessonStage = 'learn' | 'examples' | 'practice' | 'cambridge';

export interface LessonPlace {
  stage: LessonStage;
  /** A passed run (its outcome is `mastered`) means the lesson waits at its Cambridge stage. */
  practice: PracticeState;
  /** At the `learn` stage, which of the lesson's sections (`lessonSections`). */
  section?: number;
  /** The furthest outline entry reached (`lessonOutline`), so the outline strikes through what is done. */
  furthest?: number;
}

/** A lesson's place as stored and synced; `place` null means the lesson was finished (or left stale). */
export interface PlaceEntry {
  updatedAt: number;
  place: LessonPlace | null;
}

/** A write-up draft as stored and synced; an empty `text` means the learner cleared it. */
export interface WriteUpEntry {
  updatedAt: number;
  text: string;
}

/** Places by lesson key (`<salt>.<topic id>`). */
export type PlaceMap = Record<string, PlaceEntry>;
/** Write-up drafts by `<topic id>.<problem id>`. */
export type WriteUpMap = Record<string, WriteUpEntry>;

export const PLACE_KEY = 'mastery.lessonplace.v1';
export const WRITEUP_KEY = 'mastery.writeup.v1';
/** The problem salt of each lesson opened from the map, by topic id. Not synced: see `learnSalt`. */
export const SALT_KEY = 'mastery.learnsalt.v1';
/** Entries untouched this long are dropped, here and in the synced envelope. */
export const DRAFT_TTL_MS = 60 * 24 * 60 * 60 * 1000;

const OLD_PREFIX = 'mastery.lesson.';
const STAGES: readonly string[] = ['learn', 'examples', 'practice', 'cambridge'];

// ---------------------------------------------------------------- parsing

const small = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1000;
const isTime = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** A record with no prototype, keys set without touching it: keys come from stored or synced data. */
function rec<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}
function put<T>(o: Record<string, T>, k: string, v: T): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}
function sorted<T>(o: Readonly<Record<string, T>>): Record<string, T> {
  const out = rec<T>();
  for (const k of Object.keys(o).sort()) put(out, k, o[k] as T);
  return out;
}

function isPractice(x: unknown): x is PracticeState {
  if (!isObj(x)) return false;
  return small(x.attempts) && small(x.streak) && Array.isArray(x.results) && x.results.every((r) => typeof r === 'boolean')
    && x.results.length === x.attempts && x.streak <= x.attempts;
}

/** A place from untrusted JSON, or null when it is not well formed. Copies only the known fields. */
export function parsePlace(x: unknown): LessonPlace | null {
  if (!isObj(x) || typeof x.stage !== 'string' || !STAGES.includes(x.stage) || !isPractice(x.practice)) return null;
  const pr = x.practice;
  const place: LessonPlace = { stage: x.stage as LessonStage, practice: { attempts: pr.attempts, streak: pr.streak, results: [...pr.results] } };
  if (small(x.section)) place.section = x.section;
  if (small(x.furthest)) place.furthest = x.furthest;
  return place;
}

/** Places from untrusted JSON; entries that are not well formed are dropped. */
export function parsePlaces(x: unknown): PlaceMap {
  const out = rec<PlaceEntry>();
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (!isObj(v) || !isTime(v.updatedAt)) continue;
    if (v.place === null) put(out, k, { updatedAt: v.updatedAt, place: null });
    else {
      const p = parsePlace(v.place);
      if (p !== null) put(out, k, { updatedAt: v.updatedAt, place: p });
    }
  }
  return sorted(out);
}

/** Write-up drafts from untrusted JSON; entries that are not well formed are dropped. */
export function parseWriteUps(x: unknown): WriteUpMap {
  const out = rec<WriteUpEntry>();
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) if (isObj(v) && isTime(v.updatedAt) && typeof v.text === 'string') put(out, k, { updatedAt: v.updatedAt, text: v.text });
  return sorted(out);
}

// ---------------------------------------------------------------- storage

function local(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function session(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = local()?.getItem(key);
    return raw === null || raw === undefined ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function writeJson(key: string, v: unknown): boolean {
  try {
    const s = local();
    if (s === null) return false;
    s.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    // Storage blocked or full: the lesson still works, it just will not resume.
    return false;
  }
}

/** A stamp after `prev`, so a save always beats the entry it replaces even if the clock went back. */
const stampAfter = (t: number, prev: number | undefined): number => Math.max(t, (prev ?? -Infinity) + 1);

const fresh = <T extends { updatedAt: number }>(m: Readonly<Record<string, T>>, t: number): Record<string, T> => {
  const out = rec<T>();
  for (const k of Object.keys(m)) if ((m[k] as T).updatedAt >= t - DRAFT_TTL_MS) put(out, k, m[k] as T);
  return out;
};

/**
 * Moves what an earlier build kept in this tab's sessionStorage into localStorage: places,
 * write-ups, and map-lesson salts. An entry already in localStorage is kept as it is.
 */
function migrateSession(): void {
  const s = session();
  if (s === null) return;
  let keys: string[];
  try {
    keys = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k !== null && k.startsWith(OLD_PREFIX)) keys.push(k);
    }
  } catch {
    return;
  }
  if (keys.length === 0) return;
  const t = now();
  const places = parsePlaces(readJson(PLACE_KEY));
  const writeUps = parseWriteUps(readJson(WRITEUP_KEY));
  const salts = readSalts();
  let moved = false;
  for (const k of keys) {
    let raw: string | null = null;
    try {
      raw = s.getItem(k);
    } catch {
      // Unreadable: dropped below.
    }
    const rest = k.slice(OLD_PREFIX.length);
    if (raw !== null) {
      if (rest.startsWith('salt.')) {
        const topic = rest.slice('salt.'.length);
        if (salts[topic] === undefined && raw !== '') put(salts, topic, raw);
      } else if (rest.startsWith('writeup.')) {
        const id = rest.slice('writeup.'.length);
        if (writeUps[id] === undefined && raw !== '') {
          put(writeUps, id, { updatedAt: t, text: raw });
          moved = true;
        }
      } else if (places[rest] === undefined) {
        let p: LessonPlace | null = null;
        try {
          p = parsePlace(JSON.parse(raw));
        } catch {
          // Not a place: dropped.
        }
        if (p !== null) {
          put<PlaceEntry>(places, rest, { updatedAt: t, place: p });
          moved = true;
        }
      }
    }
    try {
      s.removeItem(k);
    } catch {
      // Left behind; the next read tries again and keeps the localStorage copy.
    }
  }
  writeJson(SALT_KEY, sorted(salts));
  if (moved) {
    writeJson(PLACE_KEY, sorted(places));
    writeJson(WRITEUP_KEY, sorted(writeUps));
    learnerChanged('lesson');
  }
}

/** The topic id in a lesson key (`<salt>.<topic id>`; salts hold no dot, topic ids may). */
export const topicOfLessonKey = (lessonKey: string): string => lessonKey.slice(lessonKey.indexOf('.') + 1);

/** When each topic's lesson last ended (passed or not) in the progress document. */
function lessonEnds(): Map<string, number> {
  const out = new Map<string, number>();
  for (const h of progress.value?.history ?? []) {
    if (h.kind === 'lesson' && h.at > (out.get(h.topicId) ?? -Infinity)) out.set(h.topicId, h.at);
  }
  return out;
}

/**
 * Places saved no later than their lesson's last finish, cleared. A finish recorded on
 * another device reaches this one in the progress document, possibly before or without
 * the cleared place, and a place must not take the learner back into a finished lesson.
 * The cleared stamp is the place's own plus one, so every device clearing it writes the
 * same entry and a place genuinely saved later still wins.
 */
export function settlePlaces(places: Readonly<PlaceMap>, ends: ReadonlyMap<string, number> = lessonEnds()): PlaceMap {
  const out = rec<PlaceEntry>();
  for (const k of Object.keys(places)) {
    const e = places[k] as PlaceEntry;
    const end = ends.get(topicOfLessonKey(k));
    put(out, k, e.place !== null && end !== undefined && e.updatedAt <= end ? { updatedAt: e.updatedAt + 1, place: null } : e);
  }
  return out;
}

/** This device's places: moved from sessionStorage if needed, stale ones cleared, old ones dropped. */
export function loadPlaces(): PlaceMap {
  migrateSession();
  return sorted(settlePlaces(fresh<PlaceEntry>(parsePlaces(readJson(PLACE_KEY)), now())));
}

/** This device's write-up drafts, old ones dropped. */
export function loadWriteUps(): WriteUpMap {
  migrateSession();
  return sorted(fresh(parseWriteUps(readJson(WRITEUP_KEY)), now()));
}

/** Writes places and write-ups as sync merged them, old ones dropped. Does not report a change. */
export function storeDrafts(places: Readonly<PlaceMap>, writeUps: Readonly<WriteUpMap>): void {
  const t = now();
  writeJson(PLACE_KEY, sorted(fresh(places, t)));
  writeJson(WRITEUP_KEY, sorted(fresh(writeUps, t)));
}

/** The stored entry for a lesson, cleared or not, or null when there is none. */
export function placeEntry(lessonKey: string): PlaceEntry | null {
  return loadPlaces()[lessonKey] ?? null;
}

/** The saved place, or null when there is none, the lesson was finished, or it does not parse. */
export function loadPlace(lessonKey: string): LessonPlace | null {
  return placeEntry(lessonKey)?.place ?? null;
}

function setPlace(lessonKey: string, place: LessonPlace | null): void {
  const places = loadPlaces();
  put<PlaceEntry>(places, lessonKey, { updatedAt: stampAfter(now(), places[lessonKey]?.updatedAt), place });
  if (writeJson(PLACE_KEY, sorted(places))) learnerChanged('lesson');
}

export function savePlace(lessonKey: string, place: LessonPlace): void {
  const p = parsePlace(place);
  if (p !== null) setPlace(lessonKey, p);
}

/** The lesson ended: its place is cleared on this device and, through sync, on the others. */
export function clearPlace(lessonKey: string): void {
  if (placeEntry(lessonKey) === null) return;
  setPlace(lessonKey, null);
}

// ---------------------------------------------------------------- map-lesson salt

function readSalts(): Record<string, string> {
  const out = rec<string>();
  const v = readJson(SALT_KEY);
  if (isObj(v)) for (const [k, s] of Object.entries(v)) if (typeof s === 'string' && s !== '' && !s.includes('.')) put(out, k, s);
  return out;
}

/**
 * The problem salt for a lesson opened from the map: fixed until the lesson ends, so a
 * learner who leaves and comes back meets the same problems in the same order instead of
 * a run that no longer matches the saved count. The salt is part of the lesson key, so a
 * lesson begun on another device is found by its synced place: the most recently saved
 * unfinished place of a map lesson for the topic gives the salt. Otherwise the salt this
 * device chose, or a fresh one.
 */
export function learnSalt(topicId: string, t: number): string {
  const places = loadPlaces();
  let best: { salt: string; at: number } | null = null;
  for (const k of Object.keys(places)) {
    const e = places[k] as PlaceEntry;
    if (e.place === null || !k.startsWith('learn-') || topicOfLessonKey(k) !== topicId) continue;
    const salt = k.slice(0, k.indexOf('.'));
    if (best === null || e.updatedAt > best.at || (e.updatedAt === best.at && salt > best.salt)) best = { salt, at: e.updatedAt };
  }
  const salts = readSalts();
  const mine = salts[topicId];
  // A salt whose lesson was finished (on another device, so this one never cleared it) starts afresh.
  const finished = mine !== undefined && places[`${mine}.${topicId}`]?.place === null;
  const salt = best?.salt ?? (finished ? undefined : mine) ?? `learn-${t}`;
  if (salts[topicId] !== salt) {
    put(salts, topicId, salt);
    writeJson(SALT_KEY, sorted(salts));
  }
  return salt;
}

export function clearLearnSalt(topicId: string): void {
  const salts = readSalts();
  if (salts[topicId] === undefined) return;
  delete salts[topicId];
  writeJson(SALT_KEY, sorted(salts));
}

// ---------------------------------------------------------------- write-ups

const writeUpKey = (topicId: string, problemId: string): string => `${topicId}.${problemId}`;

/**
 * A supervision problem's write-up, kept like the lesson's place, so leaving the lesson or
 * closing the app does not lose it, and synced, so it can be finished on another device.
 */
export function loadWriteUp(topicId: string, problemId: string): string {
  return loadWriteUps()[writeUpKey(topicId, problemId)]?.text ?? '';
}

export function saveWriteUp(topicId: string, problemId: string, text: string): void {
  const k = writeUpKey(topicId, problemId);
  const all = loadWriteUps();
  const was = all[k];
  if (was === undefined && text === '') return;
  if (was !== undefined && was.text === text) return;
  put(all, k, { updatedAt: stampAfter(now(), was?.updatedAt), text });
  if (writeJson(WRITEUP_KEY, sorted(all))) learnerChanged('lesson');
}
