/**
 * Cambridge problems in the app (build step 2): table, witness, and formula answers in the
 * one problem card, the Cambridge problems stage of a lesson with its citations, and the
 * supervision write-up with its "Copy for supervision" placeholder.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { contentFor, type AutoProblem, type Instance } from '@learnhub/content';
import { hintFor, inputModeFor, keypadFor } from '@/model/keypad';
import { loadPlace, loadWriteUp } from '@/model/lessonState';
import { ProblemCard } from '@/ui/ProblemCard';
import { LessonRunner } from '@/ui/views/Lesson';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
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
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
    expect(document.querySelectorAll('.cell-right')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Try it again' }));
    expect(done).toHaveBeenCalledWith({ outcome: 'correct', correct: true, response: ['18/100', '0.62', '3/10'] });
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
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
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

describe('a witness answer', () => {
  // STEP Support Assignment 7 Q4(ii)(c): any four weights that work are right; only one set does.
  it('previews the values, accepts a working witness in any order, and explains a failing one', () => {
    card(cambridge('pre.product-rule', 'a7-q4-ii-c'), 'pre.product-rule');
    const box = screen.getByLabelText('Your answer') as HTMLInputElement;
    expect(box.inputMode).toBe('text');
    fireEvent.input(box, { target: { value: '27, 9, 3, 1' } });
    expect(document.querySelector('.preview')?.getAttribute('data-state')).toBe('read');
    submit();
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
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
    expect(screen.getByRole('heading', { name: 'Correct' })).toBeTruthy();
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

describe('the Cambridge problems stage', () => {
  const open = (topicId: string): void => {
    render(<LessonRunner topicId={topicId} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Cambridge problems/ }));
  };

  it('lists every Cambridge problem with its source, auto-checked or for supervision', () => {
    open('prob.bayes-two-events');
    const c = contentFor('prob.bayes-two-events');
    expect(document.querySelectorAll('.cambridge-problem')).toHaveLength(c?.cambridge.length ?? -1);
    expect(screen.getByText(/STEP Support Assignment 6, Q4\(ii\) · checked here/)).toBeTruthy();
    expect(screen.getByText(/STEP Support Assignment 6, Q4, Discussion · for supervision/)).toBeTruthy();
    expect(loadPlace('test.prob.bayes-two-events')?.stage).toBe('cambridge');
  });

  it('a supervision problem has a write-up box kept for the tab and a placeholder copy button', () => {
    open('comb.pigeonhole');
    const box = screen.getAllByLabelText('Your write-up')[0] as HTMLTextAreaElement;
    fireEvent.input(box, { target: { value: 'Worst case: one odd sock of each colour.' } });
    expect(loadWriteUp('comb.pigeonhole', 'a5-q4-iii-show')).toBe('Worst case: one odd sock of each colour.');
    const copy = screen.getAllByRole('button', { name: 'Copy for supervision' })[0] as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    expect(screen.getAllByText(/Coming soon/).length).toBeGreaterThan(0);
  });

  it('worked examples from Cambridge say where they come from', () => {
    render(<LessonRunner topicId="comb.pigeonhole" salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Examples/ }));
    expect(screen.getByText('From STEP Support Assignment 5, Q4(i)')).toBeTruthy();
  });
});
