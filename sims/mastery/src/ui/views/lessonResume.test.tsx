/**
 * A lesson begun on one device resumes on another: the place travels in the learner
 * envelope. Each device is simulated by its own copy of localStorage; sync is the merge of
 * the two envelopes, written back with `applyLearner` as a sync round does. A place that
 * arrives while the lesson is open is offered, not jumped to, and applies the next time
 * the lesson opens.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { CONTENT_IDS } from '@learnhub/content';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { clearPlace, loadPlace, savePlace } from '@/model/lessonState';
import { commit, init, setClock } from '@/model/store';
import { mergeLearner, type LearnerState } from '@/sync/learner/envelope';
import { applyLearner, collectLearner } from '@/sync/local';
import { LessonRunner } from '@/ui/views/Lesson';

const T0 = new Date(2026, 9, 6, 9, 0).getTime();
const MIN = 60_000;
const TOPIC = 'prob.bayes-two-events';
const SALT = 'lesson-1-0';
const KEY = `${SALT}.${TOPIC}`;
let t = T0;

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

type Disk = Record<string, string>;
const snapshot = (): Disk => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k) ?? '']));
function useDisk(d: Disk): void {
  localStorage.clear();
  for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v);
}

/** Runs `f` on the other device (its own storage), and returns that device's envelope. */
function onOtherDevice(other: Disk, f: () => void): { env: LearnerState; disk: Disk } {
  const mine = snapshot();
  useDisk(other);
  f();
  const env = collectLearner();
  const disk = snapshot();
  useDisk(mine);
  return { env, disk };
}

/** A sync round on this device: its envelope merged with the other's and written back. */
const sync = (other: LearnerState): void => { void act(() => { applyLearner(mergeLearner(collectLearner(), other)); }); };

const open = () => render(<LessonRunner topicId={TOPIC} salt={SALT} onEnd={() => undefined} onSkip={() => undefined} />);
const here = (): string => document.querySelector('ol.outline li.cur button')?.textContent ?? '';
const outline = () => within(document.querySelector('ol.outline') as HTMLElement);

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  t = T0;
  setClock(() => t);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(startLearner(T0, DEFAULT_COURSES, 60));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

describe('a lesson across two devices', () => {
  it('worked partway on the phone, closed, and opened on the Mac: the Mac resumes at the phone\'s place', () => {
    const phone = onOtherDevice({}, () => {
      open();
      fireEvent.click(outline().getByRole('button', { name: 'Try one yourself' }));
      cleanup();
      // The Home Screen app closed: its tab storage is gone, the place is not.
      sessionStorage.clear();
    });
    expect(loadPlace(KEY)).toBeNull();
    sync(phone.env);
    open();
    expect(here()).toBe('Try one yourself');
    expect(document.querySelector('.practice')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /other device/ })).toBeNull();
  });

  it('a newer place arriving while the lesson is open is offered, not jumped to', () => {
    open();
    fireEvent.click(outline().getByRole('button', { name: 'Worked examples' }));
    expect(here()).toBe('Worked examples');
    t = T0 + 5 * MIN;
    const phone = onOtherDevice({}, () => {
      savePlace(KEY, { stage: 'practice', practice: { attempts: 1, streak: 1, results: [true] }, section: 0, furthest: 4 });
    });
    sync(phone.env);
    // Still where the learner is reading.
    expect(here()).toBe('Worked examples');
    expect(screen.getByRole('status').textContent).toMatch(/On your other device, this lesson is at Try one yourself/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue where you left off on your other device' }));
    expect(here()).toBe('Try one yourself');
    expect(document.querySelector('.practice')).not.toBeNull();
    expect(loadPlace(KEY)?.practice.attempts).toBe(1);
    expect(screen.queryByRole('button', { name: /other device/ })).toBeNull();
  });

  it('declined, the learner stays; untouched, the newer place applies the next time the lesson opens', () => {
    open();
    fireEvent.click(outline().getByRole('button', { name: 'Worked examples' }));
    t = T0 + 5 * MIN;
    const phone = onOtherDevice({}, () => {
      savePlace(KEY, { stage: 'practice', practice: { attempts: 0, streak: 0, results: [] } });
    });
    sync(phone.env);
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(here()).toBe('Worked examples');
    expect(screen.queryByRole('button', { name: /other device/ })).toBeNull();
    cleanup();
    open();
    expect(here()).toBe('Try one yourself');
  });

  it('a lesson finished on the phone does not reopen at an older Mac place', () => {
    open();
    fireEvent.click(outline().getByRole('button', { name: 'Worked examples' }));
    const first = document.querySelector('ol.outline li button')?.textContent;
    cleanup();
    t = T0 + 5 * MIN;
    const phone = onOtherDevice(snapshot(), () => {
      savePlace(KEY, { stage: 'practice', practice: { attempts: 0, streak: 0, results: [] } });
      t = T0 + 6 * MIN;
      clearPlace(KEY);
    });
    sync(phone.env);
    expect(loadPlace(KEY)).toBeNull();
    open();
    expect(here()).toBe(first);
  });
});
