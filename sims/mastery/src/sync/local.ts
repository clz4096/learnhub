/**
 * The learner envelope on this device: kept in localStorage beside the parts it covers,
 * updated each time a store saves (so a change is stamped with the time it was made, not
 * the time it synced), and written back to the stores when sync or an import brings a
 * merged or imported copy.
 *
 * Everything is read from and written to localStorage at once, never held in memory, so two
 * tabs of the app keep one envelope between them.
 *
 * The envelope is built the first time from the parts as they are stored (`bootstrap`),
 * with default stamps (a choice counts from when the campaign began, a result from when the
 * paper finished, and so on), so data saved before sync tracked it merges sensibly.
 */
import { parseCampaign } from '@/model/campaign';
import { CAMPAIGN_KEY, saveCampaign } from '@/model/campaignStore';
import { DAY_KEY, loadDays } from '@/model/dayLog';
import { FLAG_KEY } from '@/model/flagsStore';
import { LADDER_KEY, reloadLadder } from '@/model/ladderStore';
import { learnerSynced, onLearnerChange, quietly, type LearnerChange } from '@/model/learnerChange';
import { loadPlaces, loadWriteUps, settlePlaces, storeDrafts } from '@/model/lessonState';
import { MIXED_KEY, loadMixed, saveMixed } from '@/model/mixedStore';
import { now } from '@/model/store';
import { parseStory } from '@/model/story';
import { SCENES } from '@/model/storyScenes';
import { STORY_KEY, saveStory } from '@/model/storyStore';
import { removeFromCampaign } from './learner/campaign';
import { parseStoredFlags } from './learner/current';
import {
  emptyLearner, learnerValues, observeLearner, parseLearner, type LearnerState, type LearnerValues,
} from './learner/envelope';
import { canonicalJson, plain } from './learner/join';
import { parseAttempts, removeFromLadder } from './learner/ladder';

export const LEARNER_KEY = 'mastery.learner.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = store()?.getItem(key);
    return raw === null || raw === undefined ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function readRaw(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** The parts as stored now (not the signals: a store's signal may hold a copy filtered by its reader). */
export function storedValues(): LearnerValues {
  return {
    campaign: parseCampaign(readRaw(CAMPAIGN_KEY)),
    story: parseStory(readRaw(STORY_KEY), SCENES),
    day: loadDays(),
    ladder: parseAttempts(readJson(LADDER_KEY)),
    mixed: loadMixed(),
    flags: parseStoredFlags(readJson(FLAG_KEY)),
    lesson: { places: loadPlaces(), writeUps: loadWriteUps() },
  };
}

function saveState(s: LearnerState): void {
  try {
    store()?.setItem(LEARNER_KEY, JSON.stringify(s));
  } catch {
    // Not kept: the next save builds it again from the parts, with default stamps.
  }
}

/** The stored envelope, or null when there is none or it cannot be read. */
function loadState(): LearnerState | null {
  const v = readJson(LEARNER_KEY);
  if (v === undefined) return null;
  const r = parseLearner(v);
  return r.ok ? r.value : null;
}

function bootstrap(): LearnerState {
  return observeLearner(emptyLearner(), storedValues(), 0);
}

/** The envelope with this device's latest saves taken in, and kept. */
export function collectLearner(): LearnerState {
  const s = observeLearner(loadState() ?? bootstrap(), storedValues(), now());
  saveState(s);
  return s;
}

/** Records one change a store reported: a removal first, then whatever the save changed. */
export function track(c: LearnerChange): void {
  let s = loadState() ?? bootstrap();
  const r = c.removed;
  if (r !== undefined) {
    s = r.kind === 'attempt'
      ? { ...s, ladder: removeFromLadder(s.ladder, r.id, now()) }
      : { ...s, campaign: removeFromCampaign(s.campaign, r.kind, r.id, now()) };
  }
  saveState(observeLearner(s, storedValues(), now()));
}

/** Builds the envelope from the stored parts if there is none yet; call at start, before the learner changes anything. */
export function ensureLearnerState(): void {
  if (loadState() === null) saveState(bootstrap());
}

const same = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b);

/**
 * Makes `s` this device's envelope and writes each part that differs back to its store,
 * without reporting the writes as the learner's changes. Screens holding their own copy
 * read again (`learnerSynced`).
 */
export function applyLearner(s: LearnerState): void {
  const before = storedValues();
  const v = plain(learnerValues(s));
  saveState(s);
  let wrote = false;
  quietly(() => {
    if (!same(before.campaign, v.campaign) && v.campaign !== null) {
      saveCampaign(v.campaign);
      wrote = true;
    }
    if (!same(before.story, v.story)) {
      saveStory(v.story);
      wrote = true;
    }
    if (!same(before.day, v.day)) {
      writeJson(DAY_KEY, v.day);
      wrote = true;
    }
    if (!same(before.ladder, v.ladder)) {
      writeJson(LADDER_KEY, v.ladder);
      reloadLadder();
      wrote = true;
    }
    if (!same(before.mixed, v.mixed) && v.mixed !== null) {
      saveMixed(v.mixed);
      wrote = true;
    }
    if (!same(before.flags, v.flags)) {
      writeJson(FLAG_KEY, v.flags);
      wrote = true;
    }
    // Settled as the stored copy is, so a stale place the document shows finished is not
    // written back (and counted as news) on every round.
    const lesson = { places: settlePlaces(v.lesson.places), writeUps: v.lesson.writeUps };
    if (!same(before.lesson, lesson)) {
      storeDrafts(lesson.places, lesson.writeUps);
      wrote = true;
    }
  });
  if (wrote) learnerSynced.value++;
}

function writeJson(key: string, v: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(v));
  } catch {
    // Not kept: the envelope still holds it, and the next sync writes it again.
  }
}

let unlisten: (() => void) | null = null;

/** Starts recording the stores' saves. Idempotent. */
export function startTracking(): void {
  if (unlisten !== null) return;
  ensureLearnerState();
  unlisten = onLearnerChange(track);
}

export function stopTracking(): void {
  unlisten?.();
  unlisten = null;
}
