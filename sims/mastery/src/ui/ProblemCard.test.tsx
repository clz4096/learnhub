import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { TOPIC_CONTENT, contentFor, readAnswer, type Instance } from '@learnhub/content';
import { ENTER_GUARD_MS, ProblemCard, type CardMode } from '@/ui/ProblemCard';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const fractions = contentFor('pre.fractions');
const add = fractions?.generators.find((g) => g.id === 'add');
const sets = contentFor('pre.set-notation')?.generators.find((g) => g.id === 'union-intersection');
const combine = contentFor('pre.indices')?.generators.find((g) => g.id === 'combine');

function need<T>(x: T | undefined): T {
  if (x === undefined) throw new Error('missing fixture');
  return x;
}

/** The first seed whose reference answer is `want`. */
function seedWith(g: { instance(seed: number): Instance }, want: string): Instance {
  for (let s = 0; s < 5000; s++) {
    const inst = g.instance(s);
    if (inst.reference === want) return inst;
  }
  throw new Error(`no seed gives ${want}`);
}

function card(inst: Instance, mode: CardMode = 'practice', topicId = 'pre.fractions') {
  const done = vi.fn();
  render(<ProblemCard topicId={topicId} instance={inst} mode={mode} index={0} onDone={done} />);
  return done;
}
const input = (): HTMLInputElement => screen.getByLabelText('Your answer') as HTMLInputElement;
const type = (v: string): void => { fireEvent.input(input(), { target: { value: v } }); };
const enter = (): void => { fireEvent.submit(input().form as HTMLFormElement); };
const announced = (): string => screen.getByTestId('announce').textContent ?? '';
const block = (): HTMLElement | null => document.querySelector('.result-block');

describe('ProblemCard', () => {
  it('accepts the right answer, says Correct, and focuses the button that moves on', async () => {
    const inst = need(add).instance(11);
    const done = card(inst);
    type(inst.reference as string);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Correct')).toBeTruthy();
    expect(announced()).toBe('Correct.');
    const next = screen.getByRole('button', { name: 'Next problem' });
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    expect(done).toHaveBeenCalledWith({ outcome: 'correct', correct: true, response: inst.reference });
  });

  it('a wrong answer says Incorrect, shows both answers, the slip, the full solution, above the buttons, and focuses the heading', async () => {
    const inst = need(add).instance(11);
    const slip = need(inst.misconceptions[0]);
    const done = card(inst);
    type(slip.response as string);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    const head = await screen.findByRole('heading', { name: 'Incorrect' });
    expect(document.activeElement).toBe(head);
    expect([...document.querySelectorAll('.result-pair > div > span:first-child')].map((e) => e.textContent)).toEqual(['Your answer', 'Correct answer']);
    expect(screen.getByText('The likely slip:')).toBeTruthy();
    expect(screen.getByText(/It looks like you added the tops and added the bottoms/)).toBeTruthy();
    expect(document.querySelectorAll('.result-solution li')).toHaveLength(inst.problem.solution.length);
    const pair = document.querySelector('.result-pair') as HTMLElement;
    const next = screen.getByRole('button', { name: 'Next problem' });
    // The correct answer comes before the button in the page, so it is never below it.
    expect(pair.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The disabled field is marked wrong, and the hint is gone.
    expect(document.querySelector('.answer-box.result-wrong')).not.toBeNull();
    expect(screen.queryByText(/Enter checks it/)).toBeNull();
    fireEvent.click(next);
    expect(done).toHaveBeenCalledWith({ outcome: 'wrong', correct: false, response: slip.response });
  });

  it('announces one short line: "Incorrect. Your answer 10. Correct answer 5."', () => {
    const inst = seedWith(need(combine), '5');
    card(inst, 'practice', 'pre.indices');
    type('10');
    enter();
    expect(announced()).toBe('Incorrect. Your answer 10. Correct answer 5.');
    // The explanation is not in the live region.
    expect(screen.getByTestId('announce').querySelectorAll('*')).toHaveLength(1);
  });

  it('shows the runner\'s line on what the result does to progress, and its button label', () => {
    const inst = need(add).instance(11);
    render(
      <ProblemCard topicId="pre.fractions" instance={inst} mode="review" index={0} onDone={() => undefined}
        consequence={(o) => ({ effect: `effect of ${o}`, next: 'Finish the review' })} />,
    );
    type('1/1000');
    enter();
    expect(screen.getByText('effect of wrong')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish the review' })).toBeTruthy();
  });

  it('never grades unreadable input: it says so, keeps focus in the field, and records nothing', () => {
    const inst = need(add).instance(11);
    const done = card(inst);
    type('3/');
    input().focus();
    enter();
    expect(block()).toBeNull();
    expect(document.querySelector('.answer-notice')?.textContent).toBe('Could not read 3/. Finish it or use the keypad.');
    expect(announced()).toBe('Could not read 3/. Finish it or use the keypad.');
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().disabled).toBe(false);
    enter();
    expect(block()).toBeNull();
    expect(done).not.toHaveBeenCalled();
    // Finishing the answer clears the error.
    type('3/4');
    expect(document.querySelector('.answer-notice')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('a calculation where a number is asked asks first: Edit goes back, Check anyway grades', () => {
    const inst = need(add).instance(11);
    const done = card(inst);
    type('21*1');
    const reading = readAnswer(inst.problem.answer, '21*1');
    expect(reading?.note).toBeDefined();
    enter();
    expect(block()).toBeNull();
    expect(screen.getByText(/This is read as/)).toBeTruthy();
    const edit = screen.getByRole('button', { name: 'Edit' });
    expect(document.activeElement).toBe(edit);
    // A second Enter lands on Edit, which goes back to the field.
    fireEvent.click(edit);
    expect(screen.queryByText(/This is read as/)).toBeNull();
    expect(document.activeElement).toBe(input());
    enter();
    fireEvent.click(screen.getByRole('button', { name: 'Check anyway' }));
    expect(block()).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Incorrect' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(done).toHaveBeenCalledWith({ outcome: 'wrong', correct: false, response: '21*1' });
  });

  it('ignores Enter for a moment after a result, so a double press cannot skip it', () => {
    let t = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    const inst = need(add).instance(11);
    const done = card(inst);
    type(inst.reference as string);
    enter();
    const next = screen.getByRole('button', { name: 'Next problem' });
    t += 30;
    // A cancelled keydown means the browser neither activates the button nor submits the form.
    expect(fireEvent.keyDown(next, { key: 'Enter' })).toBe(false);
    expect(done).not.toHaveBeenCalled();
    t += ENTER_GUARD_MS;
    expect(fireEvent.keyDown(next, { key: 'Enter' })).toBe(true);
  });

  it('Check stays disabled until there is an answer', () => {
    card(need(add).instance(3), 'quiz');
    expect((screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('choose-all problems take several ticks, and every option says in text how it came out', async () => {
    const inst = need(sets).instance(5);
    render(<ProblemCard topicId="pre.set-notation" instance={inst} mode="review" index={0} onDone={() => undefined} />);
    const right = inst.reference as string[];
    for (const id of right) fireEvent.click(document.querySelector(`input[value="${id}"]`) as HTMLInputElement);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Correct')).toBeTruthy();
    expect(screen.getAllByText('Correct, you chose it')).toHaveLength(right.length);
  });

  it('a wrong choice labels the missed and the wrongly chosen options', () => {
    const inst = need(sets).instance(5);
    const right = inst.reference as string[];
    const a = inst.problem.answer;
    if (a.kind !== 'choice') throw new Error('not a choice problem');
    const wrong = need(a.options.find((o) => !right.includes(o.id)));
    render(<ProblemCard topicId="pre.set-notation" instance={inst} mode="review" index={0} onDone={() => undefined} />);
    fireEvent.click(document.querySelector(`input[value="${wrong.id}"]`) as HTMLInputElement);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Not correct, you chose it')).toBeTruthy();
    expect(screen.getAllByText('Correct, you missed it')).toHaveLength(right.length);
  });

  it('"Show me how" says it counts as a miss, and shows a neutral solution', () => {
    const inst = need(add).instance(4);
    const done = card(inst);
    fireEvent.click(screen.getByRole('button', { name: 'Show me how (counts as a miss)' }));
    expect(block()?.dataset.result).toBe('gave-up');
    expect(block()?.classList.contains('bad')).toBe(false);
    expect(screen.getByRole('heading', { name: 'Solution' })).toBeTruthy();
    expect(document.querySelector('.result-solution')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(done).toHaveBeenCalledWith({ outcome: 'gave-up', correct: false, response: null });
  });

  it('a broken problem is not the learner\'s miss: it says so and asks the runner for a fresh one', () => {
    const broken: Instance = {
      generatorId: 'broken',
      seed: 1,
      problem: { prompt: [{ kind: 'text', text: 'What is one?', typed: [] }], answer: { kind: 'exact', expected: 'one' }, solution: [] },
      reference: 'one',
      misconceptions: [],
      saneError: null,
    };
    const done = card(broken);
    type('1');
    enter();
    expect(screen.getByRole('heading', { name: /This problem is broken, not your answer/ })).toBeTruthy();
    expect(screen.queryByText('Incorrect')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Get a fresh problem' }));
    expect(done).toHaveBeenCalledWith({ outcome: 'problem-error', correct: false, response: '1' });
  });
});

describe('every written problem', () => {
  // The preview gates grading now, so it must read every right answer cleanly: an
  // unreadable or noted right answer would block or question the learner for no reason.
  it('reads the reference answer with no note, and every misconception answer', () => {
    for (const c of TOPIC_CONTENT) {
      for (const g of c.generators) {
        for (let seed = 0; seed < 40; seed++) {
          const inst = g.instance(seed);
          const a = inst.problem.answer;
          if (a.kind === 'choice' || a.kind === 'table') continue;
          const r = readAnswer(a, inst.reference as string);
          expect(r, `${c.topicId}/${g.id}/${seed}: ${String(inst.reference)}`).not.toBeNull();
          expect(r?.note, `${c.topicId}/${g.id}/${seed}`).toBeUndefined();
          for (const m of inst.misconceptions) {
            expect(readAnswer(a, m.response as string), `${c.topicId}/${g.id}/${seed}: ${String(m.response)}`).not.toBeNull();
          }
        }
      }
    }
  });
});
