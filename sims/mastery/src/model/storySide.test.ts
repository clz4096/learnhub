/**
 * Dialogue choices that unlock side scenes, and beats when a rating rises past a threshold:
 * the triggers, the queue, the story's stored state from before both existed, and the
 * choice points written into Book One.
 */
import { describe, expect, it } from 'vitest';
import {
  NO_NUMBERS, autoPlay, completeScene, emptyStory, isChoice, newlyDue, nextScene, parseStory, relationshipsOf, strandOf, triggerText, triggered,
  type StoryFacts, type StoryState,
} from './story';
import { A_REPLY, ACT_FOUR, ACT_TWO, BEAT_OVERALL, BEAT_PROOF, BEAT_TEMPERAMENT, SCENES, THURSDAY_NIGHT, sceneById } from './storyScenes';
import { RATING_IDS, type RatingValues } from './ratings';

const T0 = Date.UTC(2026, 9, 5, 14, 0); // Monday 2026-10-05, 10:00 am in New York
const facts = (over: Partial<StoryFacts> = {}): StoryFacts => ({
  ...NO_NUMBERS, chaptersComplete: [], termShare: {}, actsComplete: null, letters: [], ...over,
});
const at = (v: number, over: Partial<Record<keyof RatingValues, number>> = {}): RatingValues =>
  ({ ...Object.fromEntries([...RATING_IDS, 'overall'].map((id) => [id, v])), ...over }) as RatingValues;

const play = (st: StoryState, id: string, chosen: Record<string, string> = {}, t = T0): StoryState => completeScene(SCENES, st, id, chosen, NO_NUMBERS, 0, t);

describe('side scenes', () => {
  it('Thursday Night unlocks only from the choice that asked for it', () => {
    let st = play(emptyStory(), 'prologue', { reply: 'already' });
    st = play(st, 'first-light', { reply: 'straight' });
    expect(newlyDue(SCENES, st, facts()).map((s) => s.id)).not.toContain('thursday-night');
    st = play(st, 'first-light', { reply: 'together' }, T0 + 1);
    expect(newlyDue(SCENES, st, facts()).map((s) => s.id)).toContain('thursday-night');
    // Without the story so far, a side trigger never holds.
    expect(triggered(THURSDAY_NIGHT.trigger, facts())).toBe(false);
  });

  it('A Reply unlocks after The Offer when Dr Lambda thinks well of him', () => {
    let st = play(emptyStory(), 'act-3', { 'first-line': 'bug' });
    st = play(st, 'the-offer', { tell: 'priya' });
    expect(st.relationships.lambda).toBe(1);
    expect(newlyDue(SCENES, st, facts()).map((s) => s.id)).not.toContain('a-reply');
    st = play(st, 'act-4', { stuck: 'aloud' });
    expect(st.relationships.lambda).toBe(2);
    expect(newlyDue(SCENES, st, facts()).map((s) => s.id)).toContain('a-reply');
    // The same regard before The Offer is seen: not yet.
    const early = play(play(emptyStory(), 'act-3', { 'first-line': 'bug' }), 'act-4', { stuck: 'aloud' });
    expect(newlyDue(SCENES, early, facts()).map((s) => s.id)).not.toContain('a-reply');
  });

  it('name a real scene, choice point, and option, and read as a clause', () => {
    for (const s of SCENES.filter((x) => x.trigger.kind === 'side')) {
      const t = s.trigger as Extract<typeof s.trigger, { kind: 'side' }>;
      expect(sceneById(t.after), s.id).toBeDefined();
      if (t.need.kind === 'choice') {
        const { scene, point, option } = t.need;
        const cp = sceneById(scene)?.script?.lines.filter(isChoice).find((c) => c.id === point);
        expect(cp?.options.some((o) => o.id === option), s.id).toBe(true);
      }
      expect(triggerText(t)).toMatch(/^plays after /);
    }
    expect(triggerText(THURSDAY_NIGHT.trigger)).toBe('plays after First Light, if you asked Priya to study together');
  });

  it('carry choices that move relationships, counted like any other', () => {
    expect(THURSDAY_NIGHT.script!.lines.filter(isChoice)).toHaveLength(1);
    const st = play(play(emptyStory(), 'thursday-night', { explain: 'ask' }), 'a-reply', { send: 'clean' });
    expect(st.relationships).toMatchObject({ priya: 2, lambda: 1 });
    expect(relationshipsOf(SCENES, st.choices)).toEqual(st.relationships);
  });

  it('are never the end card\'s "Next", and the main storyline skips over them', () => {
    expect(nextScene(SCENES, 'thursday-night')).toBeUndefined();
    expect(nextScene(SCENES, 'beat-proof-70')).toBeUndefined();
    expect(nextScene(SCENES, 'the-offer')?.id).toBe('results-day');
    expect(nextScene(SCENES, 'matriculation')).toBeUndefined();
  });

  it('wait out Shabbat like every scene', () => {
    const st: StoryState = { ...emptyStory(), queued: [{ id: 'thursday-night', at: T0, n: NO_NUMBERS }] };
    const saturdayNoon = Date.UTC(2026, 9, 10, 16, 0);
    expect(autoPlay(st, saturdayNoon, { view: 'today' })).toBeNull();
    expect(autoPlay(st, T0, { view: 'today' }, true)).toBeNull();
    expect(autoPlay(st, T0, { view: 'today' })).toBe('thursday-night');
  });
});

describe('rating beats', () => {
  it('fire when the rating reaches the threshold, and never while the ratings are unknown', () => {
    expect(triggered(BEAT_PROOF.trigger, facts())).toBe(false);
    expect(triggered(BEAT_PROOF.trigger, facts({ ratings: null }))).toBe(false);
    expect(triggered(BEAT_PROOF.trigger, facts({ ratings: at(69) }))).toBe(false);
    expect(triggered(BEAT_PROOF.trigger, facts({ ratings: at(40, { proof: 70 }) }))).toBe(true);
    expect(triggered(BEAT_TEMPERAMENT.trigger, facts({ ratings: at(40, { proof: 99 }) }))).toBe(false);
    expect(triggered(BEAT_OVERALL.trigger, facts({ ratings: at(40, { overall: 60 }) }))).toBe(true);
  });

  it('queue once, in story order after the main storyline', () => {
    const f = facts({ ratings: at(99) });
    const due = newlyDue(SCENES, play(emptyStory(), 'prologue'), f).map((s) => s.id);
    expect(due).toEqual(['beat-proof-70', 'beat-temperament-70', 'beat-overall-60']);
    expect(triggerText(BEAT_TEMPERAMENT.trigger)).toBe('plays when your Exam Temperament rating reaches 70');
    expect(triggerText(BEAT_OVERALL.trigger)).toBe('plays when your overall rating reaches 60');
    let st = play(emptyStory(), 'beat-proof-70');
    st = play(st, 'beat-proof-70', {}, T0 + 1);
    expect(newlyDue(SCENES, st, f).map((s) => s.id)).not.toContain('beat-proof-70');
  });

  it('are short, and set on a weekday from Sunday to Thursday', () => {
    for (const s of SCENES.filter((x) => strandOf(x) !== 'main')) {
      expect(s.place, s.id).toMatch(/(Sunday|Monday|Tuesday|Wednesday|Thursday)/);
      expect(s.place, s.id).toMatch(/\d{1,2}:\d{2} (am|pm)/);
    }
    for (const s of [BEAT_PROOF, BEAT_TEMPERAMENT, BEAT_OVERALL]) expect(s.script!.lines.length).toBeLessThanOrEqual(6);
  });
});

describe('choice points in Book One', () => {
  it('number at least four that move a relationship, and the new ones are wired', () => {
    const main = SCENES.filter((s) => s.book === 1 && strandOf(s) === 'main');
    const moving = main.flatMap((s) => s.script!.lines.filter(isChoice).filter((c) => c.options.some((o) => Object.values(o.effects ?? {}).some((v) => v !== 0))));
    expect(moving.length).toBeGreaterThanOrEqual(4);
    expect(ACT_TWO.script!.lines.filter(isChoice).map((c) => c.id)).toEqual(['train', 'out']);
    expect(ACT_FOUR.script!.lines.filter(isChoice).map((c) => c.id)).toEqual(['stuck', 'ask']);
    expect(play(emptyStory(), 'act-4', { stuck: 'aloud', ask: 'quicker' }).relationships.lambda).toBe(2);
  });
});

describe('the stored story', () => {
  it('reads a story saved before side scenes and beats existed, unchanged', () => {
    const old = { seen: { prologue: { first: 1, last: 1, plays: 1 } }, choices: { 'first-light': { reply: 'together' } }, relationships: { priya: 2 }, rep: 10, queued: [] };
    const st = parseStory(JSON.stringify(old), SCENES);
    expect(Object.keys(st.seen)).toEqual(['prologue']);
    expect(st.relationships.priya).toBe(2);
    expect(st.rep).toBe(10);
  });

  it('keeps side scenes and beats seen, and their choices, across a save', () => {
    let st = play(emptyStory(), 'thursday-night', { explain: 'complement' });
    st = play(st, 'beat-overall-60');
    st = { ...st, queued: [{ id: 'a-reply', at: T0, n: NO_NUMBERS }] };
    expect(parseStory(JSON.stringify(st), SCENES)).toEqual(st);
    expect(A_REPLY.cast).toContain('lambda');
  });
});
