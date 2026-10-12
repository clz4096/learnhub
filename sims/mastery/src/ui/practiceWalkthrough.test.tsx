/**
 * A learner's walk through Rule 2 and Rule 9: the practice set of a lesson, passed with two
 * misses and no streak; more practice, which counts toward nothing; and the struggle it
 * shows: "This skill needs another look" with its section, and the lessons to revisit.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { lessonSections, plain, type Instance, type TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { titleOf } from '@/model/courses';
import { DEFAULT_COURSES, drillItemId, recordDrill, startLearner } from '@/model/learner';
import { practiceInstance, practiceSet } from '@/model/practice';
import { route } from '@/model/route';
import { commit, init, progress, setClock } from '@/model/store';
import { skillSection } from '@/model/struggle';
import { LessonRunner } from '@/ui/views/Lesson';
import { MorePracticeView } from '@/ui/views/MorePractice';
import { RevisitView } from '@/ui/views/Revisit';

const T0 = new Date(2026, 9, 12, 9, 0).getTime();
const TOPIC = 'pre.fractions';
const SALT = 'walk-1';
const c = contentFor(TOPIC) as TopicContent;
let t = T0;

await contentStore.load(TOPIC);

const flush = async (): Promise<void> => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

/** Types or picks the reference answer, and checks it. */
function answerRight(inst: Instance): void {
  const a = inst.problem.answer;
  if (a.kind === 'choice') {
    const ids = typeof inst.reference === 'string' ? [inst.reference] : inst.reference;
    for (const id of ids) fireEvent.click(document.querySelector(`.choices input[value="${id}"]`) as Element);
  } else {
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: inst.reference as string } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  const anyway = screen.queryByRole('button', { name: 'Check anyway' });
  if (anyway !== null) fireEvent.click(anyway);
}

/** Moves on from a shown result: the card's one primary button after the result. */
function next(label: RegExp | string): void {
  t += 60_000;
  fireEvent.click(screen.getByRole('button', { name: label }));
}

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
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

describe('a learner meets the practice set, more practice, and the struggle signal', () => {
  it('passes the set with two misses and no streak, every skill right; each answer is logged', async () => {
    const ended: boolean[] = [];
    render(<LessonRunner topicId={TOPIC} salt={SALT} onEnd={(e) => ended.push(e.passed)} onSkip={() => undefined} />);
    fireEvent.click(within(document.querySelector('ol.outline') as HTMLElement).getByRole('button', { name: 'Try one yourself' }));
    const set = practiceSet(c, SALT);
    expect(set.length).toBeGreaterThanOrEqual(10);
    const before = progress.value?.history.length ?? 0;
    // Misses at places 2 and 3, side by side; the other skills' second places are right.
    const missAt = new Set([2, 3]);
    for (const [k, item] of set.entries()) {
      expect(screen.getByText(new RegExp(`^Problem ${k + 1} of ${set.length}, easy first\\.`))).toBeTruthy();
      if (missAt.has(k)) {
        fireEvent.click(screen.getByRole('button', { name: 'Show me how (counts as a miss)' }));
      } else {
        answerRight(practiceInstance(c, item, k));
      }
      await flush();
      const last = k === set.length - 1;
      next(last ? 'Finish the lesson' : 'Next problem');
      await flush();
    }
    expect(screen.getByRole('heading', { name: 'Practice passed.' })).toBeTruthy();
    expect(document.body.textContent).toContain(`${set.length - 2} of ${set.length} right on the first try, every skill at least once`);
    expect(screen.getAllByRole('link', { name: 'More practice' }).length).toBeGreaterThan(0);
    const drills = (progress.value?.history ?? []).slice(before).filter((h) => h.kind === 'drill');
    expect(drills).toHaveLength(set.length);
    expect(drills.map((h) => h.correct)).toEqual(set.map((_, k) => !missAt.has(k)));
    expect(drills.map((h) => h.item?.id)).toEqual(set.map((x) => drillItemId(TOPIC, x.generatorId)));
    // Passing records nothing yet: the lesson's result comes when it ends.
    expect(progress.value?.history.some((h) => h.kind === 'lesson')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Next: the Cambridge problem' }));
    expect(ended).toEqual([]);
  });

  it('more practice counts toward nothing, but its misses show the skill that needs another look', async () => {
    const g = c.generators[0];
    if (g === undefined) throw new Error('no generator');
    // Earlier first answers to the first skill: 1 right of 4, not enough to judge.
    let p = progress.value;
    if (p === null) throw new Error('no progress');
    for (const [i, ok] of [true, false, false, false].entries()) p = recordDrill(p, TOPIC, ok, { id: drillItemId(TOPIC, g.id), hints: 0 }, T0 - 1000 + i);
    await commit(p);
    const memory = p.memory;
    render(<MorePracticeView topicId={TOPIC} />);
    await flush();
    expect(screen.getByRole('heading', { name: titleOf(TOPIC) })).toBeTruthy();
    expect(document.body.textContent).not.toContain('This skill needs another look');
    // The stream starts with the first generator: a miss makes 1 of 5, under 60 percent.
    fireEvent.click(screen.getByRole('button', { name: 'Show me how (counts as a miss)' }));
    await flush();
    expect(document.body.textContent).toContain('More practice counts toward nothing, so a miss changes nothing.');
    next('Next problem');
    await flush();
    expect(progress.value?.history.filter((h) => h.kind === 'drill')).toHaveLength(5);
    expect(progress.value?.history.some((h) => h.kind === 'lesson' || h.kind === 'review')).toBe(false);
    expect(progress.value?.memory).toEqual(memory);
    expect(progress.value?.session).toEqual(p.session);
    const note = await waitFor(() => {
      const el = document.querySelector('.weak-skill');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(note.textContent).toContain(`This skill needs another look: ${g.skill}`);
    expect(note.textContent).toContain('20% right on the first try (1 of 5).');
    const section = skillSection(c, g.skill);
    expect(section).not.toBeNull();
    const link = within(note).getByRole('link');
    expect(link.getAttribute('href')).toBe(`#/learn/${TOPIC}/section/${section}`);
    expect(link.textContent).toBe(`Read “${plain(lessonSections(c.lesson)[section as number]?.title ?? [])}” again`);
    fireEvent.click(link);
    expect(route.value).toEqual({ view: 'learn', topicId: TOPIC, section });
  });

  it('the lesson opens at the section a weak skill links to', () => {
    render(<LessonRunner topicId={TOPIC} salt={SALT} onEnd={() => undefined} onSkip={() => undefined} section={2} />);
    const title = plain(lessonSections(c.lesson)[2]?.title ?? []);
    expect(document.querySelector('ol.outline li.cur button')?.textContent).toBe(title);
  });

  it('lists the lesson to revisit, with accuracy and attempts, and sorts it', async () => {
    let p = progress.value;
    if (p === null) throw new Error('no progress');
    const [g0, g1] = c.generators;
    if (g0 === undefined || g1 === undefined) throw new Error('no generators');
    for (const [i, ok] of [false, true, false, false, false].entries()) p = recordDrill(p, TOPIC, ok, { id: drillItemId(TOPIC, g0.id), hints: 0 }, T0 + i);
    for (const [i, ok] of [true, true, true].entries()) p = recordDrill(p, TOPIC, ok, { id: drillItemId(TOPIC, g1.id), hints: 0 }, T0 + 10 + i);
    await commit(p);
    render(<RevisitView p={p} />);
    await waitFor(() => expect(document.querySelector('.revisit-row')).not.toBeNull());
    const row = document.querySelector('.revisit-row') as HTMLElement;
    expect(within(row).getByRole('link', { name: titleOf(TOPIC) }).getAttribute('href')).toBe(`#/learn/${TOPIC}`);
    expect(row.textContent).toContain('50% right on the first try, 8 attempts.');
    expect(row.textContent).toContain(`${g0.skill} 20% (1 of 5).`);
    expect(row.textContent).not.toContain(g1.skill);
    expect(within(row).getByRole('link', { name: 'More practice' }).getAttribute('href')).toBe(`#/more/${TOPIC}`);
    const sort = screen.getByRole('group', { name: 'Sort' });
    expect(within(sort).getByRole('button', { name: 'Lowest accuracy' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(sort).getByRole('button', { name: 'Book order' }));
    expect(within(sort).getByRole('button', { name: 'Book order' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('says so when no lesson needs revisiting', async () => {
    const p = progress.value;
    if (p === null) throw new Error('no progress');
    render(<RevisitView p={p} />);
    await waitFor(() => expect(document.body.textContent).toContain('No lesson to revisit.'));
  });
});
