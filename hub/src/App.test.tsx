import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { App, Catalog, ToolCard } from '@/App';
import { readyTools, type Catalog as CatalogDoc, type Tool } from '@/catalog';

const tool = (over: Partial<Tool>): Tool => ({
  id: 'cachesim',
  title: 'Cache Hierarchy Simulator',
  summary: 'Watch memory accesses move through the caches.',
  tracks: ['ML-SYS', 'HFT'],
  level: 'simulator-with-real-check',
  minutes: 90,
  lessons: 10,
  status: 'ready',
  href: 'sims/cachesim/',
  materials: [
    { label: 'Guide', href: 'sims/cachesim/materials/GUIDE.html' },
    { label: 'Simulator vs real hardware', href: 'sims/cachesim/materials/VERIFY.html' },
  ],
  ...over,
});

const FIXTURE: CatalogDoc = {
  tools: [
    tool({}),
    tool({ id: 'raft', title: 'Raft Visualizer', tracks: ['DIST'], level: 'visualizer', minutes: 150, lessons: 1, href: 'sims/raft/', materials: [] }),
    tool({ id: 'gemm', title: 'GEMM Tiling Lab', tracks: ['ML-SYS', 'ALGO'], status: 'beta', href: 'sims/gemm/' }),
    tool({ id: 'sched', title: 'Scheduler Sim', tracks: ['HFT'], status: 'planned', href: 'sims/sched/' }),
  ],
};

const cardTitles = () => screen.getAllByRole('article').map((a) => within(a).getByRole('heading', { level: 3 }).textContent);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Catalog', () => {
  it('renders one card per ready tool with its details', () => {
    render(<Catalog tools={readyTools(FIXTURE)} />);
    expect(cardTitles()).toEqual(['Cache Hierarchy Simulator', 'Raft Visualizer']);

    const card = screen.getByRole('article', { name: 'Cache Hierarchy Simulator' });
    const c = within(card);
    expect(c.getByText('Simulator, checked on real hardware')).toBeTruthy();
    expect(c.getByText('About 90 minutes')).toBeTruthy();
    expect(c.getByText('10 lessons')).toBeTruthy();
    expect(within(c.getByRole('list', { name: 'Tracks' })).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(['ML systems', 'High-frequency trading']);

    const open = c.getByRole('link', { name: 'Open Cache Hierarchy Simulator' });
    expect(open.getAttribute('href')).toBe('sims/cachesim/');
    expect(open.hasAttribute('target')).toBe(false);
    const mats = within(c.getByRole('navigation', { name: 'Materials for Cache Hierarchy Simulator' })).getAllByRole('link');
    expect(mats.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Guide', 'sims/cachesim/materials/GUIDE.html'],
      ['Simulator vs real hardware', 'sims/cachesim/materials/VERIFY.html'],
    ]);

    const raft = within(screen.getByRole('article', { name: 'Raft Visualizer' }));
    expect(raft.getByText('Visualizer')).toBeTruthy();
    expect(raft.getByText('About 2.5 hours')).toBeTruthy();
    expect(raft.getByText('1 lesson')).toBeTruthy();
    expect(raft.queryByRole('navigation')).toBeNull();
  });

  it('filters by track with pressed-state buttons', () => {
    render(<Catalog tools={readyTools(FIXTURE)} />);
    const group = screen.getByRole('group', { name: 'Filter by track' });
    // Tracks of ready tools only; the beta and planned tools add none.
    expect(within(group).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['All tracks', 'ML systems', 'High-frequency trading', 'Distributed systems']);
    const all = within(group).getByRole('button', { name: 'All tracks' });
    expect(all.getAttribute('aria-pressed')).toBe('true');

    const dist = within(group).getByRole('button', { name: 'Distributed systems' });
    fireEvent.click(dist);
    expect(dist.getAttribute('aria-pressed')).toBe('true');
    expect(all.getAttribute('aria-pressed')).toBe('false');
    expect(cardTitles()).toEqual(['Raft Visualizer']);
    expect(screen.getByRole('status').textContent).toBe('1 of 2 tools');

    fireEvent.click(all);
    expect(cardTitles()).toEqual(['Cache Hierarchy Simulator', 'Raft Visualizer']);
  });

  it('shows no filter for a single tool', () => {
    render(<Catalog tools={[tool({})]} />);
    expect(screen.queryByRole('group', { name: 'Filter by track' })).toBeNull();
    expect(cardTitles()).toEqual(['Cache Hierarchy Simulator']);
  });
});

describe('App', () => {
  it('loads catalog.json relative to the page and shows only ready tools', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(FIXTURE)));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'learnhub' })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(2));
    expect(fetchMock).toHaveBeenCalledWith('./catalog.json');
    expect(screen.queryByRole('heading', { name: 'GEMM Tiling Lab' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Scheduler Sim' })).toBeNull();
  });

  it('reports a failed load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Could not load/));
  });
});

describe('progress on the card', () => {
  const put = (v: unknown) => vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'learnhub.progress.cachesim' ? JSON.stringify(v) : null) });

  it('shows nothing before the tool reports progress', () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    render(<ToolCard tool={tool({})} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows lessons done with an accessible bar', () => {
    put({ done: 3, total: 10, updated: '2026-10-04T12:00:00.000Z' });
    render(<ToolCard tool={tool({})} />);
    const bar = screen.getByRole('progressbar', { name: '3 of 10 lessons done' });
    expect(bar.getAttribute('value')).toBe('3');
    expect(bar.getAttribute('max')).toBe('10');
  });

  it('updates when the page is shown again', () => {
    put({ done: 0, total: 10, updated: '2026-10-04T12:00:00.000Z' });
    render(<ToolCard tool={tool({})} />);
    expect(screen.getByText('Not started')).toBeTruthy();
    put({ done: 10, total: 10, updated: '2026-10-04T13:00:00.000Z' });
    fireEvent(window, new Event('pageshow'));
    expect(screen.getByText('All 10 lessons done')).toBeTruthy();
  });
});
