import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { contentFor } from '@learnhub/content';
import { ProblemCard } from '@/ui/ProblemCard';

afterEach(cleanup);

const fractions = contentFor('pre.fractions');
const add = fractions?.generators.find((g) => g.id === 'add');
const sets = contentFor('pre.set-notation')?.generators.find((g) => g.id === 'union-intersection');

describe('ProblemCard', () => {
  it('accepts the right answer and reports it on Continue', async () => {
    if (add === undefined) throw new Error('no generator');
    const inst = add.instance(11);
    const done = vi.fn();
    render(<ProblemCard topicId="pre.fractions" instance={inst} mode="practice" index={0} onDone={done} />);
    const input = screen.getByLabelText('Your answer');
    fireEvent.input(input, { target: { value: inst.reference as string } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Right.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(done).toHaveBeenCalledWith({ correct: true, response: inst.reference });
  });

  it('names a known misconception kindly, and shows the worked solution', async () => {
    if (add === undefined) throw new Error('no generator');
    const inst = add.instance(11);
    const slip = inst.misconceptions[0];
    if (slip === undefined) throw new Error('no misconception');
    const done = vi.fn();
    render(<ProblemCard topicId="pre.fractions" instance={inst} mode="practice" index={0} onDone={done} />);
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: slip.response as string } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Not quite.')).toBeTruthy();
    expect(screen.getByText(/It looks like you added the tops and added the bottoms/)).toBeTruthy();
    expect(screen.getByText(/The answer:/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(done).toHaveBeenCalledWith({ correct: false, response: slip.response });
  });

  it('Check stays disabled until there is an answer', () => {
    if (add === undefined) throw new Error('no generator');
    render(<ProblemCard topicId="pre.fractions" instance={add.instance(3)} mode="quiz" index={0} onDone={() => undefined} />);
    expect((screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('choose-all problems take several ticks', async () => {
    if (sets === undefined) throw new Error('no generator');
    const inst = sets.instance(5);
    render(<ProblemCard topicId="pre.set-notation" instance={inst} mode="review" index={0} onDone={() => undefined} />);
    for (const id of inst.reference as string[]) fireEvent.click(document.querySelector(`input[value="${id}"]`) as HTMLInputElement);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Right.')).toBeTruthy();
  });

  it('placement offers "I do not know this", which counts as not known without a lecture', async () => {
    if (add === undefined) throw new Error('no generator');
    const done = vi.fn();
    render(<ProblemCard topicId="pre.fractions" instance={add.instance(2)} mode="placement" index={0} onDone={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'I do not know this' }));
    expect(await screen.findByText(/This topic will start with a lesson/)).toBeTruthy();
    expect(document.querySelector('.solution')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(done).toHaveBeenCalledWith({ correct: false, response: null });
  });
});
