/**
 * A table answer: given cells are shown as text, blank cells are small inputs filled in
 * reading order (row by row, left to right), the order the table grader compares. After
 * Check the inputs are disabled, and each wrong cell is marked by colour and by text, so
 * the result never depends on colour alone.
 */
import type { AnswerSpec, Rich as RichText } from '@learnhub/content';
import { Rich } from '@/ui/Rich';
import { plain } from '@learnhub/content';

export type TableSpec = Extract<AnswerSpec, { kind: 'table' }>;

/** The blank cells' positions in reading order: [row, column]. */
export function blankCells(spec: TableSpec): [number, number][] {
  const out: [number, number][] = [];
  spec.rows.forEach((r, i) => r.forEach((c, j) => { if (c === null) out.push([i, j]); }));
  return out;
}

const header = (spec: TableSpec, j: number): string => plain(spec.columns[j] ?? []) || `column ${j + 1}`;
const rowName = (spec: TableSpec, i: number): string => {
  const first = spec.rows[i]?.find((c): c is RichText => c !== null);
  return first === undefined ? `row ${i + 1}` : plain(first);
};

export function TableAnswer({ id, spec, cells, onCell, disabled, wrong }: {
  id: string;
  spec: TableSpec;
  cells: readonly string[];
  /** One cell changed. The owner updates its state from the previous state, so quick edits in a row are all kept. */
  onCell: (index: number, value: string) => void;
  disabled: boolean;
  /** After Check: the indices of wrong cells, in reading order. */
  wrong?: readonly number[];
}) {
  let k = -1;
  const truth = spec.cell === 'truth';
  return (
    <div class="table-wrap table-answer">
      <table>
        <caption class="small muted">{truth ? 'Write T or F in each empty cell.' : 'Write a number in each empty cell.'}</caption>
        <thead><tr>{spec.columns.map((h, j) => <th key={j} scope="col"><Rich text={h} /></th>)}</tr></thead>
        <tbody>
          {spec.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => {
                if (c !== null) return <td key={j}><Rich text={c} /></td>;
                k += 1;
                const at = k;
                const bad = wrong?.includes(at) === true;
                const checked = disabled && wrong !== undefined;
                return (
                  <td key={j} class={checked ? (bad ? 'cell-wrong' : 'cell-right') : undefined}>
                    <input
                      id={`${id}-cell-${at}`}
                      class={`cell-input${truth ? ' truth' : ''}`}
                      type="text"
                      autocomplete="off"
                      autocapitalize={truth ? 'characters' : 'off'}
                      spellcheck={false}
                      inputMode={truth ? 'text' : 'decimal'}
                      size={truth ? 2 : 6}
                      value={cells[at] ?? ''}
                      disabled={disabled}
                      aria-label={`${rowName(spec, i)}, ${header(spec, j)}`}
                      aria-invalid={bad ? 'true' : undefined}
                      onInput={(e) => onCell(at, (e.currentTarget as HTMLInputElement).value)}
                    />
                    {checked && <span class={`cell-mark ${bad ? 'bad' : 'good'}`}>{bad ? <><span aria-hidden="true">✕</span><span class="visually-hidden">wrong</span></> : <span aria-hidden="true">✓</span>}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The table with every blank filled from `values` (reading order), for showing the correct answer. */
export function FilledTable({ spec, values }: { spec: TableSpec; values: readonly string[] }) {
  let k = -1;
  return (
    <div class="table-wrap">
      <table class="filled-table">
        <thead><tr>{spec.columns.map((h, j) => <th key={j} scope="col"><Rich text={h} /></th>)}</tr></thead>
        <tbody>
          {spec.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => {
                if (c !== null) return <td key={j}><Rich text={c} /></td>;
                k += 1;
                return <td key={j}><strong>{values[k] ?? ''}</strong></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
