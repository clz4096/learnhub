import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import macos from '@/ui/tryit/fixtures/macos-x86_64.results.csv?raw';
import vm from '@/ui/tryit/fixtures/linux-vm-x86_64.results.csv?raw';
import { STORAGE_KEY } from '@/ui/tryit/results';

// The real model runs in a Web Worker (absent in jsdom); these are the ratios it returns.
const modelRatios = vi.fn(async (id: string): Promise<Record<string, number>> =>
  id === 'seq-sum' ? { 'l2-l1': 1.05, 'l3-l1': 1.23 } : { 'col-row': 15.1 });
vi.mock('@/ui/tryit/modelClient', () => ({ modelRatios: (id: string) => modelRatios(id) }));

const { ImportResults } = await import('@/ui/tryit/ImportResults');

beforeEach(() => {
  localStorage.clear();
  modelRatios.mockClear();
});
afterEach(cleanup);

const upload = (text: string, name = 'results.csv') => {
  const input = screen.getByLabelText(/Choose results.csv/) as HTMLInputElement;
  const file = new File([text], name, { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

describe('ImportResults', () => {
  it('compares an uploaded file with the model and stores it', async () => {
    render(<ImportResults workloadId="matrix-traverse" benchName="matrix_traverse" />);
    upload(macos);
    await screen.findByText('same direction');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('12.8x')).toBeTruthy(); // 14.2298 / 1.1126 at N=2048
    expect(screen.getAllByText('15.1x')).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).name).toBe('results.csv');
  });

  it('restores the stored file on load and reports a different direction', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'vm.csv', text: vm, savedAt: '' }));
    render(<ImportResults workloadId="seq-sum" benchName="seq_sum" />);
    // In the VM run, the 128 KiB sum was faster per element than the 16 KiB one.
    await screen.findByText('different');
    expect(screen.getByText('0.91x')).toBeTruthy();
    expect(screen.getByText(/not modeled/)).toBeTruthy();
  });

  it('rejects a file with no results and keeps nothing', async () => {
    render(<ImportResults workloadId="seq-sum" benchName="seq_sum" />);
    upload('hello world', 'notes.txt');
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toMatch(/no benchmark results/);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('says so when the file has no rows for this benchmark, and forgets on request', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'r.csv', text: 'RESULT,aos_soa,aos,N=1,10,1', savedAt: '' }));
    render(<ImportResults workloadId="seq-sum" benchName="seq_sum" />);
    expect(screen.getByText(/has no results for/)).toBeTruthy();
    expect(modelRatios).not.toHaveBeenCalledWith('seq-sum');
    fireEvent.click(screen.getByRole('button', { name: 'Forget this file' }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
  });
});
