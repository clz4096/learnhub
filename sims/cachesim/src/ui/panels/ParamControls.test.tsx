import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { ParamControls } from '@/ui/panels/ParamControls';
import { WORKLOADS } from '@/workloads';
import { defaultParams, type ParamSpec } from '@/workloads/types';

afterEach(cleanup);

const specs: ParamSpec[] = [
  { key: 'N', label: 'Elements', kind: 'int', default: 256, min: 0, max: 1024, step: 64 },
  { key: 'stride', label: 'Stride', kind: 'int', default: 4, values: [1, 2, 4, 8, 16] },
  { key: 'order', label: 'Order', kind: 'choice', default: 'row', options: [{ value: 'row', label: 'Row-major' }, { value: 'col', label: 'Column-major' }] },
  { key: 'pad', label: 'Pad', kind: 'bool', default: false, help: 'pad to a line' },
];

describe('ParamControls', () => {
  it('renders one control per spec kind', () => {
    render(<ParamControls specs={specs} values={{ N: 256, stride: 4, order: 'row', pad: false }} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'Elements' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Elements (number)' })).toBeTruthy();
    const stride = screen.getByRole('slider', { name: /Stride/ }) as HTMLInputElement;
    expect(stride.max).toBe('4');
    expect(stride.value).toBe('2'); // index of 4 in values
    expect(screen.getByRole('radio', { name: 'Row-major' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Pad' })).toBeTruthy();
    expect(screen.getByText('pad to a line')).toBeTruthy();
  });

  it('reports changes with the right value types', () => {
    const onChange = vi.fn();
    render(<ParamControls specs={specs} values={{ N: 256, stride: 4, order: 'row', pad: false }} onChange={onChange} />);
    fireEvent.input(screen.getByRole('slider', { name: /Stride/ }), { target: { value: '4' } });
    expect(onChange).toHaveBeenLastCalledWith('stride', 16);
    fireEvent.click(screen.getByRole('radio', { name: 'Column-major' }));
    expect(onChange).toHaveBeenLastCalledWith('order', 'col');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pad' }));
    expect(onChange).toHaveBeenLastCalledWith('pad', true);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Elements (number)' }), { target: { value: '5000' } });
    expect(onChange).toHaveBeenLastCalledWith('N', 1024); // clamped to max
  });

  it('renders every real workload without errors', () => {
    for (const w of WORKLOADS) {
      const { unmount } = render(<ParamControls specs={w.params} values={defaultParams(w)} onChange={() => {}} />);
      for (const p of w.params) expect(screen.getAllByText(new RegExp(p.label.replace(/[()]/g, '\\$&'))).length).toBeGreaterThan(0);
      unmount();
    }
  });
});
