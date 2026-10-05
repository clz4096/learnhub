/**
 * Lessons download on demand: the loading line, the error with Try again, and content
 * already downloaded showing at once.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import type { TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { createContentStore, type Loader } from '@/model/content';
import { ContentGate } from '@/ui/ContentGate';

const fractions = contentFor('pre.fractions') as TopicContent;

/** A loader whose downloads the test settles by hand, in order. */
function manualLoader(): { load: Loader; calls: string[]; settle: (outcome: 'ok' | 'fail' | 'none') => void } {
  const waiting: { resolve: (c: TopicContent | undefined) => void; reject: (e: Error) => void }[] = [];
  const calls: string[] = [];
  return {
    calls,
    load: (id) => {
      calls.push(id);
      return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
    },
    settle: (outcome) => {
      const w = waiting.shift();
      if (w === undefined) throw new Error('no download is waiting');
      if (outcome === 'ok') w.resolve(fractions);
      else if (outcome === 'none') w.resolve(undefined);
      else w.reject(new Error('Failed to fetch dynamically imported module'));
    },
  };
}

const show = (c: TopicContent) => <p data-testid="goal">{c.topicId}</p>;

afterEach(cleanup);

describe('ContentGate', () => {
  it('shows a loading line while the lesson downloads, then the lesson', async () => {
    const m = manualLoader();
    render(<ContentGate topicId="pre.fractions" store={createContentStore(m.load)}>{show}</ContentGate>);
    expect(screen.getByRole('status').textContent).toBe('Loading the lesson…');
    expect(screen.queryByTestId('goal')).toBeNull();
    m.settle('ok');
    expect((await screen.findByTestId('goal')).textContent).toBe('pre.fractions');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a failed download shows an error with Try again, which downloads again', async () => {
    const m = manualLoader();
    render(<ContentGate topicId="pre.fractions" what="review" store={createContentStore(m.load)}>{show}</ContentGate>);
    m.settle('fail');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/The review could not be loaded\. Check the connection, then try again\./);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('status').textContent).toBe('Loading the review…');
    expect(screen.queryByRole('alert')).toBeNull();
    // It can fail again, and be retried again.
    m.settle('fail');
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    m.settle('ok');
    expect((await screen.findByTestId('goal')).textContent).toBe('pre.fractions');
    expect(m.calls).toEqual(['pre.fractions', 'pre.fractions', 'pre.fractions']);
  });

  it('content already downloaded shows at once, with no loading line and no second download', async () => {
    const m = manualLoader();
    const store = createContentStore(m.load);
    const first = store.load('pre.fractions');
    m.settle('ok');
    await first;
    render(<ContentGate topicId="pre.fractions" store={store}>{show}</ContentGate>);
    expect(screen.getByTestId('goal').textContent).toBe('pre.fractions');
    expect(screen.queryByRole('status')).toBeNull();
    expect(m.calls).toHaveLength(1);
  });

  it('a topic with no content says so', async () => {
    const m = manualLoader();
    render(<ContentGate topicId="num.gcd" what="problem" store={createContentStore(m.load)}>{show}</ContentGate>);
    m.settle('none');
    expect((await screen.findByText(/This problem is not in the app any more/))).toBeTruthy();
  });

  it('switching topic shows the new topic loading, not the old one', async () => {
    const m = manualLoader();
    const store = createContentStore(m.load);
    const { rerender } = render(<ContentGate topicId="pre.fractions" store={store}>{show}</ContentGate>);
    m.settle('ok');
    await screen.findByTestId('goal');
    rerender(<ContentGate topicId="pre.indices" store={store}>{show}</ContentGate>);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByTestId('goal')).toBeNull();
  });
});
