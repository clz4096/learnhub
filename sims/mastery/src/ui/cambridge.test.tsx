/**
 * Cambridge problems in the app (build step 2): table, witness, and formula answers in the
 * one problem card, the Cambridge problems stage of a lesson with its citations, and the
 * supervision write-up with Copy for supervision (build step 3; see supervision.test.tsx).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import type { AutoProblem, Instance } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { hintFor, inputModeFor, keypadFor } from '@/model/keypad';
import { loadPlace, loadWriteUp } from '@/model/lessonState';
import { ProblemCard } from '@/ui/ProblemCard';
import { LessonRunner, ProblemView } from '@/ui/views/Lesson';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

function cambridge(topicId: string, id: string): Instance {
  const p = contentFor(topicId)?.cambridge.find((x) => x.id === id);
  if (p === undefined || p.mode !== 'auto') throw new Error(`missing auto problem ${topicId}/${id}`);
  return (p as AutoProblem).instance;
}

function card(inst: Instance, topicId: string) {
  const done = vi.fn();
  render(<ProblemCard topicId={topicId} instance={inst} mode="cambridge" index={0} onDone={done} />);
  return done;
}
/** The result heading's text: "Right: <answer>." holds rendered mathematics, which jsdom cannot name by role. */
const resultHead = (): string => document.querySelector('.result-head > span:last-child')?.textContent ?? '';
const submit = (): void => { fireEvent.submit(document.querySelector('form.answer') as HTMLFormElement); };
const cellInputs = (): HTMLInputElement[] => [...document.querySelectorAll('.cell-input')] as HTMLInputElement[];
const fill = (values: readonly string[]): void => cellInputs().forEach((el, i) => fireEvent.input(el, { target: { value: values[i] ?? '' } }));

describe('a table answer', () => {
  // STEP Support Assignment 6 Q4(i), adapted: a population of 100 people.
  const inst = (): Instance => cambridge('prob.bayes-two-events', 'a6-q4-i-abc');

  it('has one labelled input per blank cell and marks a right table correct', () => {
    const done = card(inst(), 'prob.bayes-two-events');
    expect(cellInputs()).toHaveLength(3);
    expect(cellInputs()[0]?.getAttribute('aria-label')).toMatch(/female smoker, probability/);
    fill(['18/100', '0.62', '3/10']);
    submit();
    expect(resultHead()).toMatch(/^Right/);
    expect(document.querySelectorAll('.cell-right')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Try it again' }));
    expect(done).toHaveBeenCalledWith({ outcome: 'correct', correct: true, response: ['18/100', '0.62', '3/10'], ms: expect.any(Number) });
  });

  it('marks the wrong cells by text as well as colour, and shows the filled table', () => {
    card(inst(), 'prob.bayes-two-events');
    fill(['18/100', '1/2', '3/10']);
    submit();
    expect(screen.getByRole('heading', { name: 'Incorrect' })).toBeTruthy();
    expect(document.querySelectorAll('.cell-wrong')).toHaveLength(1);
    expect(document.querySelector('.cell-wrong')?.textContent).toMatch(/wrong/);
    expect(document.querySelector('.filled-table')?.textContent).toMatch(/31\/50/);
  });

  it('keeps every cell when several change before a re-render (autofill, fast typing)', () => {
    card(inst(), 'prob.bayes-two-events');
    act(() => {
      ['18/100', '0.62', '3/10'].forEach((v, i) => {
        const el = cellInputs()[i] as HTMLInputElement;
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    submit();
    expect(resultHead()).toMatch(/^Right/);
  });

  it('never marks a table with an empty or unreadable cell', () => {
    const done = card(inst(), 'prob.bayes-two-events');
    fill(['18/100', '', '3/10']);
    submit();
    expect(document.querySelector('.result-block')).toBeNull();
    expect(document.querySelector('.error-text')?.textContent).toBe('Fill in the empty cell first.');
    fill(['18/100', 'lots', '3/10']);
    submit();
    expect(document.querySelector('.result-block')).toBeNull();
    expect(document.querySelector('.error-text')?.textContent).toMatch(/Cell 2 reads "lots"/);
    expect(done).not.toHaveBeenCalled();
  });
});

describe('the italic lesson line (mastery/APP-LANGUAGE.md: "keep the italic one-line lesson at the end")', () => {
  // The real stylesheet, so the test fails if the rule is dropped or no longer matches.
  // Read from disk: vitest stubs CSS imports, even with ?raw.
  const css = readFileSync(join(import.meta.dirname, '../styles/app.css'), 'utf8');
  const styled = (): void => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
  };
  afterEach(() => document.head.querySelectorAll('style').forEach((s) => s.remove()));
  const steps = (): HTMLElement[] => [...document.querySelectorAll('.result-solution li')] as HTMLElement[];
  const missTable = (): void => {
    fill(['1/2', '1/2', '1/2']);
    submit();
  };

  it('sets the last step of a Cambridge solution in italics, and only that step', () => {
    styled();
    const inst = cambridge('prob.bayes-two-events', 'a6-q4-i-abc');
    card(inst, 'prob.bayes-two-events');
    missTable();
    const li = steps();
    expect(li).toHaveLength(inst.problem.solution.length);
    expect(li.at(-1)?.textContent).toBe('Count a population: every probability becomes a count over a count.');
    expect(li.map((el) => getComputedStyle(el).fontStyle)).toEqual([...li.slice(0, -1).map(() => 'normal'), 'italic']);
  });

  it('leaves a practice solution upright: only a Cambridge solution ends on a lesson line', () => {
    styled();
    render(<ProblemCard topicId="prob.bayes-two-events" instance={cambridge('prob.bayes-two-events', 'a6-q4-i-abc')} mode="practice" index={0} onDone={vi.fn()} />);
    missTable();
    expect(steps().length).toBeGreaterThan(0);
    expect(steps().map((el) => getComputedStyle(el).fontStyle)).not.toContain('italic');
  });
});

describe('a witness answer', () => {
  // STEP Support Assignment 7 Q4(ii)(c): any four weights that work are right; only one set does.
  it('previews the values, accepts a working witness in any order, and explains a failing one', () => {
    card(cambridge('pre.product-rule', 'a7-q4-ii-c'), 'pre.product-rule');
    const box = screen.getByLabelText('Your answer') as HTMLInputElement;
    expect(box.inputMode).toBe('text');
    fireEvent.input(box, { target: { value: '27, 9, 3, 1' } });
    expect(document.querySelector('.preview')?.getAttribute('data-state')).toBe('read');
    submit();
    expect(resultHead()).toMatch(/^Right/);
  });

  it('a failing witness gets the check\'s reason', () => {
    card(cambridge('pre.product-rule', 'a7-q4-ii-c'), 'pre.product-rule');
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: '1, 2, 4, 8' } });
    submit();
    expect(screen.getByRole('heading', { name: 'Incorrect' })).toBeTruthy();
    expect(document.querySelector('.result-block')?.textContent).toMatch(/Powers of 2 reach only/);
  });
});

describe('a formula answer', () => {
  it('accepts an equivalent formula typed with ASCII signs', () => {
    // Book of Proof Section 2.2, exercise 9: x in A - B is P and not Q.
    card(cambridge('logic.connectives', 'bop-2-2-9'), 'logic.connectives');
    const box = screen.getByLabelText('Your answer') as HTMLInputElement;
    fireEvent.input(box, { target: { value: '~(~P | Q)' } });
    expect(document.querySelector('.preview .katex')).not.toBeNull();
    submit();
    expect(resultHead()).toMatch(/^Right/);
  });

  it('a wrong formula is told a row where it differs', () => {
    card(cambridge('logic.connectives', 'bop-2-2-9'), 'logic.connectives');
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: 'P & Q' } });
    submit();
    expect(document.querySelector('.result-block')?.textContent).toMatch(/negates the second statement|Not equivalent/);
  });

  it('the keypad and hint fit the kind of answer', () => {
    const formula = { kind: 'formula', expected: 'P & Q', variables: ['P', 'Q'] } as const;
    expect(keypadFor(formula, 'logic.connectives').map((k) => k.label)).toEqual(['∧', '∨', '¬', '⇒', '⇔', '(', ')']);
    expect(hintFor(formula)).toMatch(/A formula in P, Q/);
    expect(inputModeFor(formula)).toBe('text');
    const witness = { kind: 'witness', example: '1, 3', count: 2, check: () => null } as const;
    expect(keypadFor(witness, 'pre.product-rule').map((k) => k.name)).toContain('comma');
    expect(hintFor(witness)).toMatch(/Any answer that works is right/);
  });
});

describe('the Cambridge stage', () => {
  const open = async (topicId: string): Promise<void> => {
    render(<LessonRunner topicId={topicId} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    // The lesson downloads its content first.
    fireEvent.click(await screen.findByRole('button', { name: /Cambridge problem/ }));
  };

  it('lists every Cambridge problem with its source, auto-checked or for supervision', async () => {
    await open('prob.bayes-two-events');
    const c = contentFor('prob.bayes-two-events');
    expect(document.querySelectorAll('.cambridge-problem')).toHaveLength(c?.cambridge.length ?? -1);
    expect(screen.getByText(/STEP Support Assignment 6, Q4\(ii\) · checked here/)).toBeTruthy();
    expect(screen.getByText(/STEP Support Assignment 6, Q4, Discussion · for supervision/)).toBeTruthy();
    expect(loadPlace('test.prob.bayes-two-events')?.stage).toBe('cambridge');
  });

  it('gives every element id on the page once, so each auto-checked card describes its own input', async () => {
    // Regression: every auto-checked card used to take the id prefix p0 (all at round 0).
    await open('comb.pigeonhole');
    const autos = contentFor('comb.pigeonhole')?.cambridge.filter((p) => p.mode === 'auto') ?? [];
    expect(autos.length).toBeGreaterThan(1);
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(document.querySelector('[id^="p0"]')).toBeNull();
    for (const p of autos) {
      const card = document.querySelector(`[data-problem="${p.id}"]`) as HTMLElement;
      const input = card.querySelector('input') as HTMLInputElement | null;
      expect(input?.id, p.id).toBe(`cam-${p.id}-answer-input`);
      // Everything the input points at is in its own card.
      for (const ref of (input?.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x !== '')) {
        expect(document.getElementById(ref)?.closest('[data-problem]')?.getAttribute('data-problem'), `${p.id}: ${ref}`).toBe(p.id);
      }
    }
  });

  it('a supervision problem has a write-up box kept on the device, Copy for supervision, and Paste result', async () => {
    await open('comb.pigeonhole');
    const box = screen.getAllByLabelText('Your write-up')[0] as HTMLTextAreaElement;
    fireEvent.input(box, { target: { value: 'Worst case: one odd sock of each colour.' } });
    expect(loadWriteUp('comb.pigeonhole', 'a5-q4-iii-show')).toBe('Worst case: one odd sock of each colour.');
    const copy = screen.getAllByRole('button', { name: 'Copy for supervision' })[0] as HTMLButtonElement;
    expect(copy.disabled).toBe(false);
    expect(screen.getAllByRole('button', { name: 'Paste result' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Coming soon/)).toEqual([]);
  });

  it('worked examples from Cambridge say where they come from', () => {
    render(<LessonRunner topicId="comb.pigeonhole" salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Worked examples/ }));
    expect(screen.getByText('From STEP Support Assignment 5, Q4(i)')).toBeTruthy();
  });
});

describe('what a Cambridge problem draws on', () => {
  const open = async (topicId: string): Promise<void> => {
    render(<LessonRunner topicId={topicId} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: /Cambridge problem/ }));
  };
  const uses = (problemId: string): HTMLElement => {
    const card = document.querySelector(`[data-problem="${problemId}"]`) as HTMLElement;
    return within(card).getByLabelText('What this problem uses');
  };

  it('says above the gate what it tests, which sections of the lesson it uses, and that fractions build on nothing', async () => {
    await open('pre.fractions');
    const block = uses('a6-q1-i-value');
    expect(within(block).getByText('This tests')).toBeTruthy();
    expect(block.textContent).toMatch(/cancelling across the whole product before multiplying/);
    expect(within(block).getByRole('button', { name: 'Multiplying and dividing' })).toBeTruthy();
    expect(within(block).getByText('Nothing before this lesson')).toBeTruthy();
    // The block sits above the problem itself.
    const card = document.querySelector('[data-problem="a6-q1-i-value"]') as HTMLElement;
    const form = card.querySelector('form') as HTMLElement;
    expect(block.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a section link opens that section of the lesson', async () => {
    await open('pre.fractions');
    fireEvent.click(within(uses('a6-q1-i-value')).getByRole('button', { name: 'Cancelling across a long product' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Cancelling across a long product' })).toBeTruthy();
    expect(loadPlace('test.pre.fractions')?.stage).toBe('learn');
    expect(document.querySelector('[data-problem]')).toBeNull();
  });

  it('links the prerequisites, and names what a practice problem needs beyond them', async () => {
    await open('alg.telescoping');
    const gate = uses('a6-q1-i-general');
    const sigma = within(gate).getByRole('link', { name: 'Sigma notation' });
    expect(sigma.getAttribute('href')).toMatch(/^#\/learn\/alg\.sigma-notation/);
    // Fractions come through sigma notation since the gatefit prerequisites (2026-10-06), so only the direct prerequisite is linked.
    expect(within(gate).queryByRole('link', { name: 'Fractions and ratios' })).toBeNull();
    expect(within(gate).queryByText('Also needs')).toBeNull();
    const practice = uses('a24-q3');
    expect(within(practice).getByText('Also needs')).toBeTruthy();
    expect(within(practice).getByRole('link', { name: 'Integration by parts' })).toBeTruthy();
  });

  it('a proof shows what a proof needs, and before the first proof lesson says that lesson comes later', async () => {
    // Laws of indices sets a proof as further practice, before the book reaches Direct proof.
    await open('pre.indices');
    const proof = uses('a12-q1-iii');
    expect(within(proof).getByText('A proof needs')).toBeTruthy();
    const points = [...proof.querySelectorAll('ol.proof-needs li')].map((li) => li.textContent);
    expect(points).toEqual([
      'State the general claim you are proving.',
      'Argue with letters, not examples: an example checks one case, a proof covers every case.',
      'Check every condition the question sets, such as distinct, whole number, or positive.',
      'End by stating what you have proved.',
    ]);
    expect(proof.textContent).toMatch(/Writing proofs is taught in Direct proof, which comes later in the course\./);
    expect(within(proof).queryByRole('link', { name: 'Direct proof' })).toBeNull();
    expect(document.querySelector('[data-problem="a12-q1-iii"] .citation')?.textContent).not.toMatch(/gate problem/);
    expect(within(uses('nst-a1')).queryByText('A proof needs')).toBeNull();
  });

  it('after the first proof lesson in the book, a proof links to it', async () => {
    await open('proof.contradiction');
    const card = [...document.querySelectorAll('[data-problem]')].find((el) => el.querySelector('ol.proof-needs') !== null) as HTMLElement;
    expect(card).toBeDefined();
    const block = within(card).getByLabelText('What this problem uses');
    expect(block.textContent).toMatch(/How to write one: Direct proof\./);
    const needs = [...block.querySelectorAll('dd')].find((dd) => dd.querySelector('ol.proof-needs') !== null) as HTMLElement;
    expect(within(needs).getByRole('link', { name: 'Direct proof' }).getAttribute('href')).toMatch(/^#\/learn\/proof\.direct/);
  });

  it('on its own page a problem names the sections without jumping', async () => {
    render(<ProblemView topicId="pre.fractions" problemId="a6-q1-i-value" />);
    const block = await screen.findByLabelText('What this problem uses');
    expect(within(block).getByText('Cancelling across a long product')).toBeTruthy();
    expect(within(block).queryByRole('button')).toBeNull();
  });
});
