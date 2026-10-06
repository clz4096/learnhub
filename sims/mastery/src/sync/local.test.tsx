/**
 * The learner envelope on a device (sync/local.ts) and in the progress file (sync/backup.ts):
 * built from data saved before sync tracked it, stamped on each save, written back quietly,
 * and carried by Export and Import. Runs in the DOM project for localStorage.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportProgress } from '@learnhub/mastery';
import { newCampaign } from '@/model/campaign';
import { CAMPAIGN_KEY, campaign, discardFromCampaign, reloadCampaign, saveCampaign } from '@/model/campaignStore';
import { DAY_KEY, loadDays, saveDay } from '@/model/dayLog';
import { FLAG_KEY, loadFlags, saveFlags } from '@/model/flagsStore';
import { LADDER_KEY, discardAttempt, saveLadder } from '@/model/ladderStore';
import { learnerSynced, onLearnerChange } from '@/model/learnerChange';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { MIXED_KEY } from '@/model/mixedStore';
import { KNOWN_IDS, setClock } from '@/model/store';
import { STORY_KEY } from '@/model/storyStore';
import { backupText, readBackup } from './backup';
import { LEARNER_VERSION, emptyLearner, learnerValues, mergeLearner, observeLearner } from './learner/envelope';
import { plain } from './learner/join';
import { LEARNER_KEY, applyLearner, collectLearner, startTracking, stopTracking } from './local';

const T0 = new Date(2026, 9, 6, 9, 0).getTime();
const MIN = 60_000;
let t = T0;

beforeEach(() => {
  localStorage.clear();
  reloadCampaign();
  t = T0;
  setClock(() => t);
});
afterEach(() => {
  stopTracking();
  saveLadder([]);
});

describe('this device\'s envelope', () => {
  it('is built from data saved by an earlier build, with default stamps, and nothing in it is lost', () => {
    const c = { ...newCampaign('maths', T0 - 60 * MIN), college: 'wolfson' as const };
    c.sittings.push({ id: `tmua-2016-p1@${T0 - 50 * MIN}`, paperId: 'tmua-2016-p1', act: 1, startedAt: T0 - 50 * MIN, finishedAt: T0 - 10 * MIN, total: 3 });
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(c));
    localStorage.setItem(STORY_KEY, JSON.stringify({ seen: { prologue: { first: T0 - 5 * MIN, last: T0 - 5 * MIN, plays: 1, n: {} } }, choices: {}, rep: 3, queued: [] }));
    localStorage.setItem(DAY_KEY, JSON.stringify({ '2026-10-05': { wake: '07:00', ticks: [480, 540] } }));
    localStorage.setItem(LADDER_KEY, JSON.stringify([{ id: 'x/question/1@1', paperId: 'x', rung: 'question', questions: [1], startedAt: 1, finishedAt: 2, answers: ['A'] }]));
    localStorage.setItem(MIXED_KEY, JSON.stringify({ day: '2026-10-05', items: [], results: [], done: true }));
    localStorage.setItem(FLAG_KEY, JSON.stringify({ 'p@1': ['Q2'] }));

    startTracking();
    const s = collectLearner();
    expect(JSON.parse(localStorage.getItem(LEARNER_KEY) ?? 'null')).toEqual(JSON.parse(JSON.stringify(s)));
    expect(s.campaign.fields.college).toBe(T0 - 60 * MIN);
    expect(s.campaign.results[`s:tmua-2016-p1@${T0 - 50 * MIN}`]).toBe(T0 - 10 * MIN);
    const v = learnerValues(s);
    expect(v.campaign?.college).toBe('wolfson');
    expect(v.story.seen.prologue?.plays).toBe(1);
    expect(v.day['2026-10-05']?.ticks).toEqual([480, 540]);
    // An attempt this build's registry may not know is kept as it is.
    expect(v.ladder.map((a) => a.id)).toEqual(['x/question/1@1']);
    expect(v.mixed?.done).toBe(true);
    expect(v.flags).toEqual({ 'p@1': ['Q2'] });
  });

  it('stamps each save with the time it was made, and reports it so sync can schedule a round', () => {
    startTracking();
    const seen: string[] = [];
    const off = onLearnerChange((c) => seen.push(c.part));
    saveCampaign(newCampaign('cs', T0));
    t = T0 + 7 * MIN;
    saveCampaign({ ...(campaign.value!), college: 'hughes-hall' });
    t = T0 + 8 * MIN;
    saveDay(loadDays(), '2026-10-06', { wake: '08:00', ticks: [] });
    saveFlags('p@1', ['Q1']);
    off();
    expect(seen).toEqual(['campaign', 'campaign', 'day', 'flags']);
    const s = JSON.parse(localStorage.getItem(LEARNER_KEY) ?? 'null') as ReturnType<typeof collectLearner>;
    expect(s.campaign.fields.college).toBe(T0 + 7 * MIN);
    expect(s.campaign.fields.route).toBe(T0);
    expect(s.day.days['2026-10-06']?.wakeAt).toBe(T0 + 8 * MIN);
  });

  it('a removal on purpose is kept, so it reaches the other device; an attempt discarded likewise', () => {
    startTracking();
    const c = newCampaign('maths', T0);
    c.interviews.push({ id: 'interview@1', shape: 'induction', college: null, copiedAt: T0, mark: 12, notes: '' });
    saveCampaign(c);
    saveLadder([{ id: 'x/question/1@1', paperId: 'x', rung: 'question', questions: [1], startedAt: 1, finishedAt: 2 }]);
    const before = collectLearner();
    t = T0 + MIN;
    discardFromCampaign('interview', 'interview@1');
    discardAttempt('x/question/1@1');
    const after = collectLearner();
    expect(after.campaign.removed['i:interview@1']).toBe(T0 + MIN);
    expect(after.ladder.removed['x/question/1@1']).toBe(T0 + MIN);
    // The other device still had both: the merge removes them there too.
    const m = mergeLearner(before, after);
    expect(m.campaign.value?.interviews).toEqual([]);
    expect(m.ladder.attempts).toEqual([]);
  });

  it('a merged copy is written back to the stores without being reported as the learner\'s change', () => {
    startTracking();
    saveCampaign(newCampaign('maths', T0));
    const other = observeLearner(collectLearner(), {
      ...plain(learnerValues(collectLearner())),
      campaign: { ...newCampaign('maths', T0), college: 'wolfson' },
      day: { '2026-10-06': { wake: '07:30', ticks: [600] } },
      flags: { [`p@${T0}`]: ['Q4'] },
    }, T0 + MIN);
    const seen: string[] = [];
    const off = onLearnerChange((c) => seen.push(c.part));
    const bumps = learnerSynced.value;
    applyLearner(mergeLearner(collectLearner(), other));
    off();
    expect(seen).toEqual([]);
    expect(learnerSynced.value).toBe(bumps + 1);
    expect(campaign.value?.college).toBe('wolfson');
    expect(loadDays()['2026-10-06']?.ticks).toEqual([600]);
    expect(loadFlags(`p@${T0}`)).toEqual(['Q4']);
    // Taking the stores in again finds nothing new.
    expect(collectLearner()).toEqual(mergeLearner(emptyLearner(), JSON.parse(localStorage.getItem(LEARNER_KEY) ?? 'null')));
  });

  it('a stale day planner\'s save does not overwrite days sync wrote for other dates', () => {
    const stale = loadDays();
    localStorage.setItem(DAY_KEY, JSON.stringify({ '2026-10-05': { wake: '07:00', ticks: [480] } }));
    saveDay(stale, '2026-10-06', { wake: '08:00', ticks: [] });
    expect(Object.keys(loadDays())).toEqual(['2026-10-05', '2026-10-06']);
  });
});

describe('the progress file', () => {
  const p = startLearner(T0, DEFAULT_COURSES, 60);

  it('carries the envelope, and reads back to the same progress and envelope', () => {
    startTracking();
    saveCampaign(newCampaign('cs', T0));
    const env = collectLearner();
    const r = readBackup(backupText(p, env), KNOWN_IDS);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings).toEqual([]);
      expect(r.progress).toEqual(p);
      expect(r.learner).toEqual(env);
    }
  });

  it('an older build\'s file (progress only) still imports, with no envelope', () => {
    const r = readBackup(exportProgress(p), KNOWN_IDS);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.learner).toBeNull();
      expect(r.progress).toEqual(p);
    }
  });

  it('a file from a newer build\'s envelope is refused, nothing changed', () => {
    const text = JSON.stringify({ ...JSON.parse(exportProgress(p)), learner: { ...emptyLearner(), version: LEARNER_VERSION + 1 } });
    expect(readBackup(text, KNOWN_IDS)).toMatchObject({ ok: false, errors: [expect.stringMatching(/newer build/)] });
    expect(readBackup('{', KNOWN_IDS)).toMatchObject({ ok: false, errors: [expect.stringMatching(/not valid JSON/)] });
  });
});
