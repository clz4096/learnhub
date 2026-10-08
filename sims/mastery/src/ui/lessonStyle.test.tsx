/**
 * The teaching style in the lesson view (mastery/TEACHING-STYLE.md, "Content fields"): the
 * new blocks render in the minimalist design, a quick check marks an answer and says why,
 * a worked example shows its examiner note, and the Cambridge stage comes after practice on
 * the main path: its gate problems first, an answer logged as soon as it shows, and Finish
 * ending the lesson as passed.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { CONTENT_IDS, dmath, math, quickCheck, t, type AutoProblem, type Block, type TopicContent, type WorkedExample } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { DEFAULT_COURSES, masteryOf, startLearner } from '@/model/learner';
import { loadPlace, savePlace } from '@/model/lessonState';
import { commit, init, progress, setClock } from '@/model/store';
import { BlockView, Example, LessonRunner, QuickCheckView } from '@/ui/views/Lesson';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  sessionStorage.clear();
  localStorage.clear();
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(startLearner(T0, DEFAULT_COURSES, 60));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

// Downloaded up front, so a lesson renders at once.
await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const block = (b: Block, i = 0) => render(<BlockView b={b} id={`b${i}`} topicId="pre.fractions" />);
const [a, b] = [3, 4];
const sum = quickCheck({ prompt: t`What is ${math`${a} + ${b}`}?`, answer: { kind: 'exact', expected: String(a + b) }, reference: String(a + b), why: t`Adding ${a} and ${b} gives ${a + b}.` });

describe('the new lesson blocks', () => {
  it('a hook opens, a takeaway closes, and a pitfall is a ruled aside with its counterexample', () => {
    block({ kind: 'hook', text: t`Here is a strange claim.` });
    expect(document.querySelector('p.hook')?.textContent).toBe('Here is a strange claim.');
    cleanup();
    block({ kind: 'takeaway', text: t`Assume it, and find the impossible.` });
    expect(document.querySelector('p.takeaway')?.textContent).toBe('Assume it, and find the impossible.');
    cleanup();
    block({ kind: 'pitfall', claim: t`Every odd number is prime.`, counterexample: t`Nine is odd and not prime.` });
    const aside = screen.getByRole('complementary', { name: 'Where it breaks' });
    expect(aside.textContent).toContain('Every odd number is prime.');
    expect(aside.querySelector('.pitfall-counter')?.textContent).toBe('Nine is odd and not prime.');
  });

  it('numbered steps: the label bold, the display equation centred, a plain line, a native "why?" expander, and a proof ends with ∎', () => {
    block({
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Square both sides`, text: t`Both sides stay equal.`, eq: [dmath`a^{${2}} = ${2} b^{${2}}`], plain: t`Squaring keeps an equation true.` },
        { label: t`Read off the parity`, text: t`The left side is even.`, why: { q: t`Why is it even?`, a: t`It is twice a whole number.` } },
      ],
    });
    const items = document.querySelectorAll('ol.steps > li');
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector('strong')?.textContent).toBe('Square both sides');
    expect(items[0]?.querySelector('.step-eq .katex-display, .step-eq .katex')).not.toBeNull();
    expect(items[0]?.querySelector('.step-plain')?.textContent).toBe('Squaring keeps an equation true.');
    const why = items[1]?.querySelector('details.why') as HTMLDetailsElement;
    expect(why.open).toBe(false);
    expect(why.querySelector('summary')?.textContent).toBe('Why is it even?');
    expect(screen.getByLabelText('End of proof').textContent).toBe('∎');
  });

  it('a paragraph or a rule can carry a "why?" expander', () => {
    block({ kind: 'rule', text: t`A rule.`, why: { q: t`Why?`, a: t`Because.` } });
    expect(document.querySelector('.rule')?.textContent).toBe('A rule.');
    expect(document.querySelector('details.why summary')?.textContent).toBe('Why?');
  });

  it('a definition reads as the notes set it: "Definition 2.1 (Name)." then the formal text, then plain words', () => {
    render(<BlockView b={{ kind: 'definition', name: t`Even`, formal: t`An integer ${math`n`} is [[even|even]] if ${math`n = ${2}k`} for some ${math`k \in \mathbb{Z}`}.`, plain: t`It splits into two equal whole halves.` }} id="d" topicId="pre.fractions" num="2.1" />);
    const def = screen.getByRole('region', { name: 'Definition 2.1' });
    expect(def.classList.contains('amsdef')).toBe(true);
    expect(def.querySelector('.ams-body')?.textContent?.startsWith('Definition 2.1 (Even). An integer')).toBe(true);
    expect(def.querySelector('.ams-body .term')?.textContent).toBe('even');
    expect(def.querySelector('.plain')?.textContent).toBe('In plain words: It splits into two equal whole halves.');
  });

  it('a theorem reads "Theorem 2.3." with its statement in italics, and a proof opens with "Proof."', () => {
    render(<BlockView b={{ kind: 'theorem', statement: t`There are infinitely many primes.` }} id="t" topicId="pre.fractions" num="2.3" />);
    const thm = screen.getByRole('region', { name: 'Theorem 2.3' });
    expect(thm.classList.contains('amsthm')).toBe(true);
    expect(thm.querySelector('.ams-body')?.textContent).toBe('Theorem 2.3. There are infinitely many primes.');
    expect(thm.querySelector('em.stmt')?.textContent).toBe('There are infinitely many primes.');
    cleanup();
    block({ kind: 'steps', proof: true, steps: [{ label: t`One`, text: t`A.` }, { label: t`Two`, text: t`B.` }] });
    expect(document.querySelector('.amspf')?.textContent).toBe('Proof.');
  });

  it('a section heading shows only its name; narrative is the reading paragraph', () => {
    block({ kind: 'section', title: t`Is root two a fraction?` });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Is root two a fraction?');
    cleanup();
    block({ kind: 'narrative', text: t`First, pin down what a fraction is.` });
    expect(document.querySelector('p.narr')?.textContent).toBe('First, pin down what a fraction is.');
  });

  it('a worked example shows what the examiner looks for once its answer is shown', () => {
    const base = contentFor('proof.contradiction')?.examples[0] as WorkedExample;
    render(<Example e={{ ...base, examiner: t`The assumption stated before it is used.` }} n={1} />);
    expect(document.querySelector('.examiner')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(document.querySelector('.examiner')?.textContent).toBe('What the examiner looks for: The assumption stated before it is used.');
  });
});

describe('a quick check', () => {
  const box = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;

  it('marks a right answer and says why', () => {
    render(<QuickCheckView b={sum} id="qc" topicId="pre.fractions" />);
    fireEvent.input(box(), { target: { value: String(a + b) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    const r = screen.getByRole('status');
    expect(r.textContent).toContain('Right.');
    expect(r.textContent).toContain(`Adding ${a} and ${b} gives ${a + b}.`);
    expect(box().disabled).toBe(true);
  });

  it('a wrong answer shows the answer and why', () => {
    render(<QuickCheckView b={sum} id="qc" topicId="pre.fractions" />);
    fireEvent.input(box(), { target: { value: String(a * b) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    const r = screen.getByRole('status');
    expect(r.textContent).toContain('Not quite.');
    expect(r.textContent).toContain(`The answer is ${a + b}.`);
  });

  it('text it cannot read is not marked', () => {
    render(<QuickCheckView b={sum} id="qc" topicId="pre.fractions" />);
    fireEvent.input(box(), { target: { value: '3 +' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(/cannot be read yet/)).toBeTruthy();
  });
});

describe('the lesson header, its sections, and numbering', () => {
  const TOPIC = 'proof.contradiction';
  const base = contentFor(TOPIC) as TopicContent;
  const d = (n: string): Block => ({ kind: 'definition', name: t`${n}`, formal: t`Formal.`, plain: t`Plain.` });
  const styled: TopicContent = {
    ...base,
    objective: t`Prove a statement by showing its opposite is impossible.`,
    why: t`The standard way to show something cannot exist.`,
    minutes: 20,
    lesson: [
      { kind: 'section', title: t`The idea` }, d('Rational'), d('Even'),
      { kind: 'section', title: t`Is root two a fraction?` }, { kind: 'theorem', statement: t`Root two is irrational.` }, d('Odd'),
    ],
  };
  const OUTLINE = ['The idea', 'Is root two a fraction?', 'Worked examples', 'Try one yourself', 'The Cambridge problem'];
  const outline = (): string[] => [...document.querySelectorAll('ol.outline li button')].map((x) => x.textContent ?? '');
  const labels = (): (string | null)[] => [...document.querySelectorAll('.amsdef, .amsthm')].map((x) => x.getAttribute('aria-label'));
  const segs = (): (string | null)[] => [...document.querySelectorAll('.segs i')].map((x) => x.getAttribute('class'));

  beforeEach(() => {
    const loaded = contentStore.loaded.bind(contentStore);
    vi.spyOn(contentStore, 'loaded').mockImplementation((id) => (id === TOPIC ? styled : loaded(id)));
  });

  it('shows the journey without counts, the title, the goal and why, the time, and the outline of named sections', () => {
    render(<LessonRunner topicId={TOPIC} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    const head = document.querySelector('header.lesson-head') as HTMLElement;
    const journey = head.querySelector('.journey')?.textContent ?? '';
    expect(journey).toMatch(/^.+ › .+$/);
    expect(journey).not.toMatch(/\d+ of \d+/);
    expect(within(head).getByRole('heading', { level: 1 }).textContent).toBe('Proof by contradiction');
    expect([...head.querySelectorAll('dl.objective dt')].map((x) => x.textContent)).toEqual(['Goal', 'Why']);
    expect(head.querySelector('dl.objective dd')?.textContent).toBe('Prove a statement by showing its opposite is impossible.');
    expect(head.querySelector('.lesson-meta')?.textContent).toBe('about 20 min');
    expect(outline()).toEqual(OUTLINE);
    expect(head.querySelector('li.cur .here')?.textContent).toBe('you are here');
    // One segment per section and no numbers in the bar or the outline.
    expect(segs()).toEqual(['cur', null, null, null, null]);
    expect(document.querySelector('.segs')?.textContent).toBe('');
    expect(head.textContent).not.toMatch(/\d+ \/ \d+|\d+ parts?\b/);
  });

  it('reads one section at a time under its name, numbers formal objects section.n, and strikes through what is done', () => {
    render(<LessonRunner topicId={TOPIC} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    expect(document.querySelector('h2.section-title')?.textContent).toBe('The idea');
    expect(labels()).toEqual(['Definition 1.1', 'Definition 1.2']);
    fireEvent.click(screen.getByRole('button', { name: 'Next: Is root two a fraction?' }));
    expect(document.querySelector('h2.section-title')?.textContent).toBe('Is root two a fraction?');
    expect(labels()).toEqual(['Theorem 2.1', 'Definition 2.2']);
    expect([...document.querySelectorAll('ol.outline li')].map((x) => x.getAttribute('class'))).toEqual(['done', 'cur', null, null, null]);
    expect(segs()).toEqual(['done', 'cur', null, null, null]);
    // The place is kept, with the section.
    expect(loadPlace(`test.${TOPIC}`)).toMatchObject({ stage: 'learn', section: 1, furthest: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Next: worked examples' }));
    expect(document.querySelector('h2.section-title')?.textContent).toBe('Worked examples');
    // The outline opens any section.
    fireEvent.click(within(document.querySelector('ol.outline') as HTMLElement).getByRole('button', { name: 'The idea' }));
    expect(labels()).toEqual(['Definition 1.1', 'Definition 1.2']);
  });
});

describe('the Cambridge stage after practice', () => {
  const TOPIC = 'prob.bayes-two-events';
  const c = contentFor(TOPIC) as TopicContent;
  // A gate problem answered by typing, so the test can answer it.
  const gateAuto = c.cambridge.find((p): p is AutoProblem => p.mode === 'auto' && c.gate.includes(p.id) && typeof p.instance.reference === 'string'
    && p.instance.problem.answer.kind !== 'choice' && p.instance.problem.answer.kind !== 'table') as AutoProblem;

  it('comes after a passed practice run: gate problems first, an answer logged when it shows, and Finish ends the lesson passed', async () => {
    expect(gateAuto).toBeDefined();
    savePlace(`test.${TOPIC}`, { stage: 'practice', practice: { attempts: 3, streak: 3, results: [true, true, true] } });
    const onEnd = vi.fn();
    render(<LessonRunner topicId={TOPIC} salt="test" onEnd={onEnd} onSkip={() => undefined} />);
    // The sections, in the order of the main path: the Cambridge problem after practice.
    expect([...document.querySelectorAll('ol.outline li button')].map((x) => x.textContent).slice(-2)).toEqual(['Try one yourself', 'The Cambridge problem']);
    // The run's end says so neutrally (mastery/APP-LANGUAGE.md): "Practice passed."
    expect((await screen.findByRole('heading', { name: 'Practice passed.' })).textContent).toBe('Practice passed.');
    expect(document.querySelector('.feedback.end')?.textContent).not.toMatch(/\byou\b/i);
    fireEvent.click(await screen.findByRole('button', { name: 'Next: the Cambridge problem' }));
    expect(onEnd).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'The Cambridge problem' })).toBeTruthy();
    const cards = [...document.querySelectorAll('.cambridge-problem')].map((x) => x.getAttribute('data-problem'));
    expect(cards.slice(0, c.gate.length)).toEqual(c.cambridge.filter((p) => c.gate.includes(p.id)).map((p) => p.id));

    const card = within(document.querySelector(`[data-problem="${gateAuto.id}"]`) as HTMLElement);
    expect(card.getByText(/gate problem/)).toBeTruthy();
    fireEvent.input(card.getByLabelText('Your answer'), { target: { value: gateAuto.instance.reference as string } });
    fireEvent.click(card.getByRole('button', { name: 'Check' }));
    await card.findByText(/^Right: .+\.$/);
    // Logged before moving on.
    await waitFor(() => expect(progress.value?.history.some((h) => h.kind === 'cambridge')).toBe(true));
    const entry = progress.value?.history.find((h) => h.kind === 'cambridge');
    expect(entry).toMatchObject({ topicId: TOPIC, correct: true, item: { id: `${TOPIC}/${gateAuto.id}`, hints: 0, attempt: 1 } });
    expect(masteryOf(progress.value!, TOPIC).evidence).toMatchObject({ kind: 'auto', problem: `${TOPIC}/${gateAuto.id}` });

    fireEvent.click(screen.getByRole('button', { name: 'Finish the lesson' }));
    expect(onEnd).toHaveBeenCalledWith({ passed: true });
  });

  it('before the practice is passed, it leads back to practice and cannot finish the lesson', async () => {
    render(<LessonRunner topicId={TOPIC} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: /Cambridge problem/ }));
    expect(screen.queryByRole('button', { name: 'Finish the lesson' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to practice' }));
    expect(document.querySelector('.practice')).not.toBeNull();
  });
});
