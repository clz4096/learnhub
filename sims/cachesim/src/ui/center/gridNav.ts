/**
 * Keyboard navigation over a 2D cache grid: a cursor (row, way) moved by arrow keys, and
 * the text a screen reader announces for the cell under it. Pure, for testing.
 */
import type { CacheMirror } from '@/ui/mirror';
import type { GridView } from '@/ui/center/gridDirty';

export interface Cursor { row: number; way: number }

/** Rows moved by Page Up / Page Down. */
export const PAGE_ROWS = 8;

/** The cursor after `key`, or null when the key does not move it. Always inside the grid. */
export function moveCursor(c: Cursor, key: string, rows: number, ways: number): Cursor | null {
  let { row, way } = c;
  switch (key) {
    case 'ArrowUp': row--; break;
    case 'ArrowDown': row++; break;
    case 'ArrowLeft': way--; break;
    case 'ArrowRight': way++; break;
    case 'Home': way = 0; break;
    case 'End': way = ways - 1; break;
    case 'PageUp': row -= PAGE_ROWS; break;
    case 'PageDown': row += PAGE_ROWS; break;
    default: return null;
  }
  return clampCursor({ row, way }, rows, ways);
}

export function clampCursor(c: Cursor, rows: number, ways: number): Cursor {
  return {
    row: Math.max(0, Math.min(rows - 1, c.row)),
    way: Math.max(0, Math.min(ways - 1, c.way)),
  };
}

const PRIVATE_STATE = ['invalid', 'S (shared)', 'E (exclusive)', 'M (modified)'];

/** What the cell under the cursor holds, in words. `hex` formats a byte address. */
export function describeCell(m: CacheMirror, v: GridView, c: Cursor, hex: (addr: number) => string): string {
  const ways = m.info.ways;
  const shared = m.info.core < 0;
  if (v.exact) {
    const set = v.base + c.row;
    const slot = set * ways + c.way;
    const st = m.state[slot]!;
    if (st === 0) return `Set ${set}, way ${c.way}: empty.`;
    const state = shared ? (st === 3 ? 'dirty' : 'clean') : PRIVATE_STATE[st] ?? String(st);
    return `Set ${set}, way ${c.way}: line at ${hex(m.lines[slot]! * m.info.lineBytes)}, ${state}.`;
  }
  const first = c.row * m.groupSize;
  const n = m.groupSets(c.row);
  const cell = c.row * ways + c.way;
  return `Sets ${first} to ${first + n - 1}, way ${c.way}: ${m.aggValid[cell]} of ${n} hold a line, `
    + `${m.aggDirty[cell]} dirty. Enter zooms in.`;
}
