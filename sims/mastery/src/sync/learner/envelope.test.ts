import { describe, expect, it } from 'vitest';
import { canonicalJson, mulberry32, randInt, type Rng } from '@learnhub/mastery';
import { COLLEGES, newCampaign, type Campaign, type CampaignRoute } from '@/model/campaign';
import type { DayLog } from '@/model/dayLog';
import type { LadderAttempt } from '@/model/ladder';
import { completeScene, emptyStory, isChoice, type StoryNumbers } from '@/model/story';
import { SCENES } from '@/model/storyScenes';
import { removeFromCampaign } from './campaign';
import {
  LEARNER_VERSION, emptyLearner, learnerValues, mergeLearner, normalizeLearner, observeLearner, parseLearner, sameLearner,
  type LearnerState, type LearnerValues,
} from './envelope';
import { plain } from './join';
import { removeFromLadder } from './ladder';

const T0 = Date.UTC(2026, 9, 6, 13);
const MIN = 60_000;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[randInt(rng, 0, xs.length - 1)] as T;
/** Times from a small set, so devices collide on them often. */
const time = (rng: Rng): number => T0 + randInt(rng, 0, 20) * MIN;

const NUMBERS: StoryNumbers = { sectionsMastered: 1, papersSat: 0, supervisionsPassed: 0, daysStudied: 2, weekHours: 3, weeksShort: 0, campaign: null };
/** Written scenes with a choice point, and their points. */
const CHOICE_SCENES = SCENES.flatMap((s) => {
  const points = s.script?.lines.filter(isChoice) ?? [];
  return points.length === 0 ? [] : [{ id: s.id, points }];
});
const PLAIN_SCENES = SCENES.filter((s) => s.script !== null).map((s) => s.id);
const PAPERS = ['tmua-2023-p1', 'step-2024-s2', 'alevel-2023-m1'];
const DATES = ['2026-10-04', '2026-10-05', '2026-10-06'];
const WAKES = ['07:00', '08:30'];
const FLAG_IDS = ['tmua-2023-p1@100', 'step-2024-s2/question/3@200'];

const empty = (): LearnerValues => ({ campaign: null, story: emptyStory(), day: {}, ladder: [], mixed: null, flags: {} });

/** One device: its stored values and its envelope, changed only as the app changes them. */
interface Device {
  v: LearnerValues;
  s: LearnerState;
}

function campaignStep(rng: Rng, c: Campaign | null, at: number): { c: Campaign | null; removed?: { kind: 'sitting' | 'interview'; id: string } } {
  if (c === null) return { c: newCampaign(pick<CampaignRoute>(rng, ['maths', 'cs']), at) };
  const x: Campaign = plain(c);
  switch (randInt(rng, 0, 8)) {
    case 0: x.college = pick(rng, [null, ...COLLEGES.map((k) => k.id)]); break;
    case 1: x.tmuaSitting = pick(rng, ['october', 'january']); break;
    case 2: x.aLevelOrder = pick(rng, [['maths', 'further-maths', 'cs'], ['cs', 'maths', 'further-maths']]); break;
    case 3: if (x.applicationFiledAt === null) x.applicationFiledAt = at; break;
    case 4: {
      const p = pick(rng, PAPERS);
      x.sittings.push({ id: `${p}@${at}`, paperId: p, act: randInt(rng, 1, 3), startedAt: at, finishedAt: null });
      break;
    }
    case 5: {
      const open = x.sittings.filter((s) => s.finishedAt === null);
      if (open.length > 0) pick(rng, open).finishedAt = at + randInt(rng, 0, 3) * MIN;
      break;
    }
    case 6: {
      const done = x.sittings.filter((s) => s.finishedAt !== null);
      if (done.length > 0) pick(rng, done).total = randInt(rng, 0, 3) * 10;
      break;
    }
    case 7: {
      if (rng() < 0.5 || x.interviews.length === 0) {
        x.interviews.push({ id: `interview@${at}`, shape: pick(rng, ['pre-reading', 'induction']), college: x.college, copiedAt: at, mark: null, notes: '' });
      } else {
        const i = pick(rng, x.interviews);
        if (rng() < 0.3) return { c: { ...x, interviews: x.interviews.filter((y) => y !== i) }, removed: { kind: 'interview', id: i.id } };
        i.mark = randInt(rng, 10, 16);
        i.notes = pick(rng, ['', 'Clear.', 'Rushed.']);
      }
      break;
    }
    default: {
      const id = pick(rng, ['received', 'invitation', 'offer', 'results'] as const);
      if (!x.letters.some((l) => l.id === id)) x.letters.push({ id, at });
    }
  }
  return { c: x };
}

function dayStep(rng: Rng, log: DayLog, at: number): DayLog {
  const d = pick(rng, DATES);
  const e = log[d];
  const out: DayLog = plain(log);
  if (e === undefined || rng() < 0.2) {
    const wake = pick(rng, WAKES);
    out[d] = e !== undefined && e.wake === wake ? e : { wake, ticks: [] };
  } else if (rng() < 0.8) {
    const t = pick(rng, [480, 540, 600, 660]);
    const ticks = e.ticks.includes(t) ? e.ticks.filter((x) => x !== t) : [...e.ticks, t].sort((a, b) => a - b);
    out[d] = { ...e, ticks };
  } else {
    out[d] = { ...e, replans: [...(e.replans ?? []), { at: pick(rng, [600, 720]), ticks: [...e.ticks] }] };
  }
  void at;
  return out;
}

function ladderStep(rng: Rng, xs: readonly LadderAttempt[], at: number): { ladder: LadderAttempt[]; removed?: string } {
  const out: LadderAttempt[] = plain([...xs]);
  const r = randInt(rng, 0, 3);
  if (r === 0 || out.length === 0) {
    const p = pick(rng, PAPERS);
    const q = randInt(rng, 1, 3);
    out.push({ id: `${p}/question/${q}@${at}`, paperId: p, rung: 'question', questions: [q], startedAt: at, finishedAt: null });
  } else if (r === 1) {
    const open = out.filter((a) => a.finishedAt === null);
    if (open.length > 0) pick(rng, open).finishedAt = at;
  } else if (r === 2) {
    const done = out.filter((a) => a.finishedAt !== null);
    if (done.length > 0) pick(rng, done).marks = [randInt(rng, 0, 20)];
  } else {
    const a = pick(rng, out);
    return { ladder: out.filter((x) => x !== a), removed: a.id };
  }
  return { ladder: out };
}

/** One change of the kinds the app makes, saved and taken into the envelope at time `at`. */
function step(rng: Rng, dev: Device): Device {
  const at = time(rng);
  const v: LearnerValues = plain(dev.v);
  let s = dev.s;
  switch (randInt(rng, 0, 5)) {
    case 0: {
      const r = campaignStep(rng, v.campaign, at);
      v.campaign = r.c;
      if (r.removed !== undefined) s = { ...s, campaign: removeFromCampaign(s.campaign, r.removed.kind, r.removed.id, at) };
      break;
    }
    case 1: {
      if (rng() < 0.6 && CHOICE_SCENES.length > 0) {
        const sc = pick(rng, CHOICE_SCENES);
        const chosen: Record<string, string> = {};
        for (const p of sc.points) if (rng() < 0.7) chosen[p.id] = pick(rng, p.options).id;
        v.story = completeScene(SCENES, v.story, sc.id, chosen, NUMBERS, randInt(rng, 0, 50), at);
      } else if (rng() < 0.5) {
        const id = pick(rng, PLAIN_SCENES);
        if (v.story.seen[id] === undefined && !v.story.queued.some((q) => q.id === id)) v.story = { ...v.story, queued: [...v.story.queued, { id, at, n: NUMBERS }] };
      } else {
        v.story = completeScene(SCENES, v.story, pick(rng, PLAIN_SCENES), {}, NUMBERS, randInt(rng, 0, 50), at);
      }
      break;
    }
    case 2: v.day = dayStep(rng, v.day, at); break;
    case 3: {
      const r = ladderStep(rng, v.ladder, at);
      v.ladder = r.ladder;
      if (r.removed !== undefined) s = { ...s, ladder: removeFromLadder(s.ladder, r.removed, at) };
      break;
    }
    case 4: {
      const day = pick(rng, DATES);
      const n = randInt(rng, 1, 3);
      const items = Array.from({ length: 3 }, (_, i) => ({ topicId: 'pre.fractions', generatorId: 'g', id: `pre.fractions/q${i + n}`, seed: i }));
      const results = Array.from({ length: randInt(rng, 0, 3) }, () => rng() < 0.5);
      v.mixed = { day, items, results, done: results.length === 3 };
      break;
    }
    default: {
      const id = pick(rng, FLAG_IDS);
      const cur = v.flags[id] ?? [];
      const f = pick(rng, ['Q1', 'Q3 (ii)', 'Q7']);
      v.flags = { [id]: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f] };
    }
  }
  return { v, s: observeLearner(s, v, at) };
}

/** A device that ran `n` random changes from `base`; after a merge, it takes the merged values, as `applyLearner` writes them. */
function drift(rng: Rng, base: Device, n: number): Device {
  let d = base;
  for (let i = 0; i < n; i++) d = step(rng, d);
  return d;
}

const adopt = (s: LearnerState): Device => ({ v: plain(learnerValues(s)), s });

function randomTriple(seed: number): [LearnerState, LearnerState, LearnerState] {
  const rng = mulberry32(seed);
  const base = drift(rng, { v: empty(), s: emptyLearner() }, randInt(rng, 0, 12));
  return [drift(rng, base, randInt(rng, 0, 15)).s, drift(rng, base, randInt(rng, 0, 15)).s, drift(rng, base, randInt(rng, 0, 15)).s];
}

const eq = (a: LearnerState, b: LearnerState): void => expect(canonicalJson(a)).toBe(canonicalJson(b));

// Hundreds of random histories each: well within a second alone, slower under a parallel run.
describe('mergeLearner is a join', { timeout: 60_000 }, () => {
  it('idempotent, commutative, and associative on 200 random device histories', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const [a, b, c] = randomTriple(seed);
      eq(mergeLearner(a, a), normalizeLearner(a));
      eq(mergeLearner(a, b), mergeLearner(b, a));
      eq(mergeLearner(mergeLearner(a, b), c), mergeLearner(a, mergeLearner(b, c)));
      // Merging in what is already merged changes nothing (a device syncing twice).
      const ab = mergeLearner(a, b);
      eq(mergeLearner(ab, b), ab);
    }
  });

  it('a merged envelope written back to the stores and taken in again is unchanged (no change is invented)', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const [a, b] = randomTriple(seed);
      const m = mergeLearner(a, b);
      eq(observeLearner(m, plain(learnerValues(m)), T0 + 999 * MIN), m);
    }
  });

  it('survives JSON: what is stored or pushed parses back to the same envelope', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const [a, b] = randomTriple(seed);
      const m = mergeLearner(a, b);
      const r = parseLearner(JSON.parse(JSON.stringify(m)));
      expect(r.ok).toBe(true);
      if (r.ok) eq(r.value, m);
    }
  });

  it('two devices that each go on working after a merge still converge', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = mulberry32(1000 + seed);
      const [a, b] = randomTriple(seed);
      const m = mergeLearner(a, b);
      const x = drift(rng, adopt(m), 6).s;
      const y = drift(rng, adopt(m), 6).s;
      eq(mergeLearner(x, y), mergeLearner(y, x));
      eq(mergeLearner(mergeLearner(x, m), y), mergeLearner(x, y));
    }
  });
});

/** A device starting from nothing, then `f` applied to its values at `at`. */
function dev(f: (v: LearnerValues) => void, at: number, from: LearnerState = emptyLearner()): LearnerState {
  const v = plain(learnerValues(from));
  f(v);
  return observeLearner(from, v, at);
}

describe('the rules', () => {
  const camp = newCampaign('maths', T0);
  const base = dev((v) => { v.campaign = camp; }, T0);

  it('sittings started on two devices are both kept; a finish beats the running copy', () => {
    const a = dev((v) => { v.campaign!.sittings.push({ id: 'p1@1', paperId: 'p1', act: 1, startedAt: T0 + 1, finishedAt: T0 + 9 }); }, T0 + 10, base);
    const b = dev((v) => { v.campaign!.sittings.push({ id: 'p2@2', paperId: 'p2', act: 1, startedAt: T0 + 2, finishedAt: null }); }, T0 + 10, base);
    const both = mergeLearner(a, b);
    expect(both.campaign.value?.sittings.map((s) => s.id)).toEqual(['p1@1', 'p2@2']);
    const bFinished = dev((v) => { v.campaign!.sittings[1]!.finishedAt = T0 + 20; }, T0 + 20, both);
    expect(mergeLearner(both, bFinished).campaign.value?.sittings[1]?.finishedAt).toBe(T0 + 20);
  });

  it('choices are last writer wins, field by field', () => {
    const a = dev((v) => { v.campaign!.college = 'wolfson'; }, T0 + 5 * MIN, base);
    const b = dev((v) => { v.campaign!.tmuaSitting = 'october'; v.campaign!.college = 'hughes-hall'; }, T0 + 3 * MIN, base);
    const m = mergeLearner(a, b).campaign.value!;
    expect(m.college).toBe('wolfson');
    expect(m.tmuaSitting).toBe('october');
  });

  it('a removed interview stays removed, even against a copy that edited it later', () => {
    const withI = dev((v) => { v.campaign!.interviews.push({ id: 'interview@1', shape: 'induction', college: null, copiedAt: T0 + 1, mark: null, notes: '' }); }, T0 + 1, base);
    const removed = { ...withI, campaign: removeFromCampaign(withI.campaign, 'interview', 'interview@1', T0 + 2 * MIN) };
    const edited = dev((v) => { v.campaign!.interviews[0]!.mark = 15; }, T0 + 9 * MIN, withI);
    expect(mergeLearner(removed, edited).campaign.value?.interviews).toEqual([]);
  });

  it('an item merely missing from a copy (an older build that dropped it) is not removed', () => {
    const withS = dev((v) => { v.campaign!.sittings.push({ id: 'p1@1', paperId: 'p1', act: 1, startedAt: T0 + 1, finishedAt: null }); }, T0 + 1, base);
    const dropped = dev((v) => { v.campaign!.sittings = []; }, T0 + 2 * MIN, withS);
    expect(dropped.campaign.value?.sittings.map((s) => s.id)).toEqual(['p1@1']);
    expect(mergeLearner(base, dropped).campaign.value?.sittings).toHaveLength(1);
  });

  it('marks entered later win; a discarded ladder attempt stays discarded', () => {
    const a0: LadderAttempt = { id: 'x/question/1@1', paperId: 'x', rung: 'question', questions: [1], startedAt: T0, finishedAt: T0 + MIN };
    const one = dev((v) => { v.ladder = [a0]; }, T0 + MIN);
    const early = dev((v) => { v.ladder[0]!.marks = [12]; }, T0 + 2 * MIN, one);
    const late = dev((v) => { v.ladder[0]!.marks = [16]; }, T0 + 4 * MIN, one);
    expect(mergeLearner(early, late).ladder.attempts[0]?.marks).toEqual([16]);
    const gone = { ...late, ladder: removeFromLadder(late.ladder, a0.id, T0 + 5 * MIN) };
    expect(mergeLearner(gone, early).ladder.attempts).toEqual([]);
  });

  it('ticks on one plan from two devices are both kept; an untick later wins; a new wake time clears the old ticks', () => {
    const d = '2026-10-06';
    const planned = dev((v) => { v.day = { [d]: { wake: '07:00', ticks: [] } }; }, T0);
    const mac = dev((v) => { v.day[d]!.ticks = [480]; }, T0 + MIN, planned);
    const phone = dev((v) => { v.day[d]!.ticks = [540]; }, T0 + 2 * MIN, planned);
    const both = mergeLearner(mac, phone);
    expect(learnerValues(both).day[d]?.ticks).toEqual([480, 540]);
    const untick = dev((v) => { v.day[d]!.ticks = [540]; }, T0 + 3 * MIN, both);
    expect(learnerValues(mergeLearner(untick, mac)).day[d]?.ticks).toEqual([540]);
    const moved = dev((v) => { v.day[d] = { wake: '08:30', ticks: [] }; }, T0 + 4 * MIN, both);
    expect(learnerValues(mergeLearner(moved, phone)).day[d]).toEqual({ wake: '08:30', ticks: [] });
    // Back to 07:00 on the same device: the old ticks do not return.
    const back = dev((v) => { v.day[d] = { wake: '07:00', ticks: [] }; }, T0 + 5 * MIN, moved);
    expect(learnerValues(mergeLearner(back, both)).day[d]).toEqual({ wake: '07:00', ticks: [] });
  });

  it('story: seen scenes and choices from both devices; the later choice at one point wins; relationships follow', () => {
    const sc = CHOICE_SCENES[0]!;
    const p = sc.points[0]!;
    const [o1, o2] = [p.options[0]!.id, (p.options[1] ?? p.options[0])!.id];
    const a = dev((v) => { v.story = completeScene(SCENES, v.story, sc.id, { [p.id]: o1 }, NUMBERS, 10, T0 + MIN); }, T0 + MIN);
    const b = dev((v) => { v.story = completeScene(SCENES, v.story, sc.id, { [p.id]: o2 }, NUMBERS, 12, T0 + 3 * MIN); }, T0 + 3 * MIN);
    const m = mergeLearner(a, b).story.value;
    expect(m.choices[sc.id]?.[p.id]).toBe(o2);
    expect(m.seen[sc.id]).toMatchObject({ first: T0 + MIN, last: T0 + 3 * MIN, plays: 1 });
    expect(m.rep).toBe(12);
    expect(m.relationships).toEqual(b.story.value.relationships);
  });

  it('a queued scene seen on the other device leaves the queue', () => {
    const id = PLAIN_SCENES[0]!;
    const a = dev((v) => { v.story = { ...v.story, queued: [{ id, at: T0, n: NUMBERS }] }; }, T0);
    const b = dev((v) => { v.story = completeScene(SCENES, v.story, id, {}, NUMBERS, 5, T0 + MIN); }, T0 + MIN);
    const m = mergeLearner(a, b).story.value;
    expect(m.queued).toEqual([]);
    expect(m.seen[id]).toBeDefined();
  });

  it('mixed review: the later day wins; on one day the further copy, and done stays done', () => {
    const items = [{ topicId: 't', generatorId: 'g', id: 't/q1', seed: 1 }, { topicId: 't', generatorId: 'g', id: 't/q2', seed: 2 }];
    const a = dev((v) => { v.mixed = { day: '2026-10-06', items, results: [true], done: false }; }, T0);
    const b = dev((v) => { v.mixed = { day: '2026-10-06', items, results: [true, false], done: true }; }, T0);
    const c = dev((v) => { v.mixed = { day: '2026-10-05', items, results: [true, true], done: true }; }, T0);
    expect(learnerValues(mergeLearner(a, b)).mixed).toEqual({ day: '2026-10-06', items, results: [true, false], done: true });
    expect(learnerValues(mergeLearner(a, c)).mixed?.results).toEqual([true]);
    // A fresh review asked for later the same day beats the finished one, and the day stays done.
    const again = dev((v) => { v.mixed = { day: '2026-10-06', items: [items[1]!, items[0]!], results: [], done: true }; }, T0 + MIN, b);
    expect(learnerValues(mergeLearner(b, again)).mixed).toEqual({ day: '2026-10-06', items: [items[1], items[0]], results: [], done: true });
    // A stale copy of the same plan, fewer answers in, does not undo answers.
    const stale = dev((v) => { v.mixed = { day: '2026-10-06', items, results: [true], done: false }; }, T0 + 2 * MIN, b);
    expect(learnerValues(stale).mixed?.results).toEqual([true, false]);
  });

  it('flags: the later sitting wins; for one sitting, parts flagged on each device are both kept', () => {
    const a = dev((v) => { v.flags = { 'p@100': ['Q1'] }; }, T0);
    const b = dev((v) => { v.flags = { 'p@100': ['Q3'] }; }, T0 + MIN);
    expect(learnerValues(mergeLearner(a, b)).flags).toEqual({ 'p@100': ['Q1', 'Q3'] });
    const later = dev((v) => { v.flags = { 'q@200': [] }; }, T0);
    expect(learnerValues(mergeLearner(a, later)).flags).toEqual({ 'q@200': [] });
  });
});

describe('old data and versions', () => {
  it('data saved before sync tracked it gets default stamps: the campaign start, a paper\'s finish', () => {
    const c = newCampaign('cs', T0);
    c.college = 'wolfson';
    c.sittings.push({ id: 'p@1', paperId: 'p', act: 1, startedAt: T0 + MIN, finishedAt: T0 + 2 * MIN, total: 40 });
    const s = observeLearner(emptyLearner(), { ...empty(), campaign: c }, 0);
    expect(s.campaign.fields.college).toBe(T0);
    expect(s.campaign.results['s:p@1']).toBe(T0 + 2 * MIN);
    // A choice made on another device after the campaign began wins over the old one.
    const other = dev((v) => { v.campaign = { ...c, college: 'hughes-hall' }; }, T0 + 9 * MIN, s);
    expect(mergeLearner(s, other).campaign.value?.college).toBe('hughes-hall');
  });

  it('a newer version is refused whole; a malformed part is refused; bad entries inside a part are dropped', () => {
    expect(parseLearner({ ...emptyLearner(), version: LEARNER_VERSION + 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/newer build/) });
    expect(parseLearner({ ...emptyLearner(), day: 'x' })).toMatchObject({ ok: false });
    expect(parseLearner('x')).toMatchObject({ ok: false });
    const raw = JSON.parse(JSON.stringify(emptyLearner())) as Record<string, unknown>;
    raw.ladder = { attempts: [{ id: 1 }, { id: 'a@1', paperId: 'p', rung: 'question', questions: [1], startedAt: 1, finishedAt: null }], results: {}, removed: {} };
    const r = parseLearner(raw);
    expect(r.ok && r.value.ladder.attempts.map((a) => a.id)).toEqual(['a@1']);
  });

  it('a key of "__proto__" in remote data is an ordinary key, not a prototype', () => {
    const raw = JSON.parse(JSON.stringify(emptyLearner())) as { flags: unknown };
    raw.flags = JSON.parse('{"id":"p@1","marks":{"__proto__":{"at":1,"on":true}}}');
    const r = parseLearner(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(learnerValues(r.value).flags).toEqual({ 'p@1': ['__proto__'] });
      expect(sameLearner(mergeLearner(r.value, emptyLearner()), r.value)).toBe(true);
    }
  });
});
