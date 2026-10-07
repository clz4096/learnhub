/**
 * The learner envelope: everything a learner does outside the progress document, in one
 * versioned object that sync and the progress file carry beside the document, under the
 * key `learner` (`{ ...progress, learner }`).
 *
 * It holds, per part, the state as the app stores it plus what a merge needs: when each
 * choice and result was set, and what was removed. `mergeLearner` is the product of the
 * parts' merges, each a join (idempotent, commutative, associative), so devices end with
 * the same envelope whatever order their copies meet in. The rules are in each part's
 * file: campaign.ts, story.ts, day.ts, ladder.ts, current.ts, lesson.ts, standup.ts,
 * standupCfg.ts.
 *
 * Older builds read the progress document and ignore the `learner` key (an unknown field
 * is a warning, not an error), so a row or a file with an envelope still opens there.
 *
 * Lesson places and write-up drafts (`lesson`) joined version 1 without a version bump: an
 * envelope without them reads as having none, and a build before them reads the envelope
 * and ignores the field (it reads parts by name), so neither side refuses the other. Such a
 * build drops the field when it pushes; each device keeps its own copy and puts it back.
 * Standups (`standup`) and their settings (`standupCfg`) joined the same way.
 */
import type { Campaign } from '@/model/campaign';
import type { DayLog } from '@/model/dayLog';
import type { LadderAttempt } from '@/model/ladder';
import type { MixedSitting } from '@/model/mixedReview';
import type { StandupLog } from '@/model/standupLog';
import type { StandupSettings } from '@/model/standupSettings';
import type { StoryState } from '@/model/story';
import {
  emptyCampaignSync, mergeCampaign, normalizeCampaign, observeCampaign, parseCampaignSync, type CampaignSync,
} from './campaign';
import {
  emptyFlagsSync, emptyMixedSync, flagsOf, mergeFlags, mergeMixed, observeFlags, observeMixed, parseFlagsSync, parseMixedSync,
  type FlagsSync, type MixedSync,
} from './current';
import { dayLogOf, emptyDaySync, mergeDay, normalizeDay, observeDay, parseDaySync, type DaySync } from './day';
import { canonicalJson, isObj } from './join';
import { emptyLadderSync, mergeLadder, normalizeLadder, observeLadder, parseLadderSync, type LadderSync } from './ladder';
import { emptyLessonSync, lessonValuesOf, mergeLesson, normalizeLesson, observeLesson, parseLessonSync, type LessonSync, type LessonValues } from './lesson';
import {
  emptyStandupSync, mergeStandup, normalizeStandup, observeStandup, parseStandupSync, standupLogOf, type StandupSync,
} from './standup';
import {
  emptyStandupCfgSync, mergeStandupCfg, normalizeStandupCfg, observeStandupCfg, parseStandupCfgSync, standupSettingsOf,
  type StandupCfgSync,
} from './standupCfg';
import { emptyStorySync, mergeStory, normalizeStory, observeStory, parseStorySync, type StorySync } from './story';

export const LEARNER_VERSION = 1;

export interface LearnerState {
  version: typeof LEARNER_VERSION;
  campaign: CampaignSync;
  story: StorySync;
  day: DaySync;
  ladder: LadderSync;
  mixed: MixedSync;
  flags: FlagsSync;
  lesson: LessonSync;
  standup: StandupSync;
  standupCfg: StandupCfgSync;
}

/** The parts as the app's stores keep them. */
export interface LearnerValues {
  campaign: Campaign | null;
  story: StoryState;
  day: DayLog;
  ladder: LadderAttempt[];
  mixed: MixedSitting | null;
  flags: Record<string, string[]>;
  lesson: LessonValues;
  standup: StandupLog;
  standupCfg: StandupSettings;
}

export const LEARNER_PARTS = ['campaign', 'story', 'day', 'ladder', 'mixed', 'flags', 'lesson', 'standup', 'standupCfg'] as const;

export function emptyLearner(): LearnerState {
  return {
    version: LEARNER_VERSION, campaign: emptyCampaignSync(), story: emptyStorySync(), day: emptyDaySync(),
    ladder: emptyLadderSync(), mixed: emptyMixedSync(), flags: emptyFlagsSync(), lesson: emptyLessonSync(),
    standup: emptyStandupSync(), standupCfg: emptyStandupCfgSync(),
  };
}

export function normalizeLearner(s: LearnerState): LearnerState {
  return {
    version: LEARNER_VERSION, campaign: normalizeCampaign(s.campaign), story: normalizeStory(s.story), day: normalizeDay(s.day),
    ladder: normalizeLadder(s.ladder), mixed: s.mixed, flags: s.flags, lesson: normalizeLesson(s.lesson),
    standup: normalizeStandup(s.standup), standupCfg: normalizeStandupCfg(s.standupCfg),
  };
}

/** Merges two envelopes, part by part. Pure and deterministic. */
export function mergeLearner(a: LearnerState, b: LearnerState): LearnerState {
  return {
    version: LEARNER_VERSION,
    campaign: mergeCampaign(a.campaign, b.campaign),
    story: mergeStory(a.story, b.story),
    day: mergeDay(a.day, b.day),
    ladder: mergeLadder(a.ladder, b.ladder),
    mixed: mergeMixed(a.mixed, b.mixed),
    flags: mergeFlags(a.flags, b.flags),
    lesson: mergeLesson(a.lesson, b.lesson),
    standup: mergeStandup(a.standup, b.standup),
    standupCfg: mergeStandupCfg(a.standupCfg, b.standupCfg),
  };
}

export function sameLearner(a: LearnerState, b: LearnerState): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/** Whether the envelope holds nothing: a device that never used any of these parts. */
export function isEmptyLearner(s: LearnerState): boolean {
  return sameLearner(normalizeLearner(s), normalizeLearner(emptyLearner()));
}

/**
 * Takes the stores' current values into the envelope, stamping what changed with `now`.
 * With `now` 0 and an empty envelope, this builds the first envelope from data saved before
 * sync tracked it, every stamp at its default.
 */
export function observeLearner(s: LearnerState, v: LearnerValues, now: number): LearnerState {
  return {
    version: LEARNER_VERSION,
    campaign: observeCampaign(s.campaign, v.campaign, now),
    story: observeStory(s.story, v.story, now),
    day: observeDay(s.day, v.day, now),
    ladder: observeLadder(s.ladder, v.ladder, now),
    mixed: observeMixed(s.mixed, v.mixed, now),
    flags: observeFlags(s.flags, v.flags, now),
    lesson: observeLesson(s.lesson, v.lesson, now),
    standup: observeStandup(s.standup, v.standup),
    standupCfg: observeStandupCfg(s.standupCfg, v.standupCfg, now),
  };
}

/** The values the stores should hold for an envelope. */
export function learnerValues(s: LearnerState): LearnerValues {
  return {
    campaign: s.campaign.value,
    story: s.story.value,
    day: dayLogOf(s.day),
    ladder: s.ladder.attempts,
    mixed: s.mixed.value,
    flags: flagsOf(s.flags),
    lesson: lessonValuesOf(s.lesson),
    standup: standupLogOf(s.standup),
    standupCfg: standupSettingsOf(s.standupCfg),
  };
}

export type LearnerParse = { ok: true; value: LearnerState } | { ok: false; error: string };

/**
 * An envelope from untrusted JSON (a synced row or a progress file). A newer version is
 * refused whole, as a newer progress document is: merging what this build cannot read
 * could lose it. Within a part, entries that are not well formed are dropped, as the app's
 * own readers drop them; a part that is not even the right shape refuses the envelope.
 */
export function parseLearner(x: unknown): LearnerParse {
  if (!isObj(x)) return { ok: false, error: 'learner: expected an object' };
  const v = x.version;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, error: `learner.version: expected a version number, got ${JSON.stringify(v)}` };
  if (v > LEARNER_VERSION) return { ok: false, error: `learner.version: ${v} was written by a newer build (this one reads up to ${LEARNER_VERSION}); update the app` };
  const campaign = parseCampaignSync(x.campaign);
  const story = parseStorySync(x.story);
  const day = parseDaySync(x.day);
  const ladder = parseLadderSync(x.ladder);
  const mixed = parseMixedSync(x.mixed);
  const flags = parseFlagsSync(x.flags);
  const lesson = parseLessonSync(x.lesson);
  const standup = parseStandupSync(x.standup);
  const standupCfg = parseStandupCfgSync(x.standupCfg);
  const bad = [
    campaign === null && 'campaign', story === null && 'story', day === null && 'day', ladder === null && 'ladder',
    mixed === null && 'mixed', flags === null && 'flags', lesson === null && 'lesson', standup === null && 'standup',
    standupCfg === null && 'standupCfg',
  ].filter((p): p is string => p !== false);
  if (bad.length > 0) return { ok: false, error: `learner: unreadable ${bad.join(', ')}` };
  return {
    ok: true,
    value: {
      version: LEARNER_VERSION, campaign: campaign!, story: story!, day: day!, ladder: ladder!, mixed: mixed!, flags: flags!, lesson: lesson!,
      standup: standup!, standupCfg: standupCfg!,
    },
  };
}
