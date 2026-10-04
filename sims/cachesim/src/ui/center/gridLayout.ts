/**
 * Layout of a sets × ways grid on a canvas. Rows wrap into side-by-side blocks so a
 * 64-set L1 or a 256-row aggregated L3 fits in a short panel. Pure, for testing.
 */
export const BLOCK_GAP = 6;
const MAX_CELL_W = 44;
const MAX_CELL_H = 22;
const MIN_CELL = 3;
/** Cells at least this tall get set-number labels and glyphs. */
export const LABEL_CELL = 12;

export interface GridLayout {
  rows: number;
  ways: number;
  blocks: number;
  blockRows: number;
  /** Width of the set-number gutter (0 when cells are too small for labels). */
  gutter: number;
  cellW: number;
  cellH: number;
  /** gutter + ways × cellW */
  blockW: number;
  width: number;
  height: number;
}

/**
 * @param labelDigits digits of the largest set number to label; 0 = never label rows.
 */
export function computeLayout(rows: number, ways: number, width: number, labelDigits: number, maxHeight = 240): GridLayout {
  const w = Math.max(60, Math.floor(width));
  let best: GridLayout | null = null;
  for (let b = 1; b <= Math.max(1, Math.min(rows, 16)); b++) {
    const blockRows = Math.ceil(rows / b);
    const avail = Math.floor((w - (b - 1) * BLOCK_GAP) / b);
    let gutter = labelDigits > 0 ? labelDigits * 7 + 8 : 0;
    let cellW = Math.floor((avail - gutter) / ways);
    if (cellW < LABEL_CELL) {
      gutter = 0;
      cellW = Math.floor(avail / ways);
    }
    if (cellW < MIN_CELL && best) break;
    cellW = Math.max(MIN_CELL, Math.min(cellW, MAX_CELL_W));
    const cellH = gutter > 0 ? Math.min(cellW, MAX_CELL_H) : Math.max(MIN_CELL, Math.min(cellW, LABEL_CELL - 1));
    const blockW = gutter + ways * cellW;
    const cand: GridLayout = {
      rows, ways, blocks: b, blockRows, gutter, cellW, cellH, blockW,
      width: b * blockW + (b - 1) * BLOCK_GAP, height: blockRows * cellH,
    };
    best = cand;
    if (cand.height <= maxHeight) break;
  }
  return best!;
}

/** Top-left of the cell at (row, way); way = -1 gives the gutter. */
export function cellOrigin(l: GridLayout, row: number, way: number): { x: number; y: number } {
  const block = Math.floor(row / l.blockRows);
  const r = row - block * l.blockRows;
  return { x: block * (l.blockW + BLOCK_GAP) + (way < 0 ? 0 : l.gutter + way * l.cellW), y: r * l.cellH };
}

/** Inverse of cellOrigin. way = -1 means the set-number gutter was hit. */
export function hitTest(l: GridLayout, x: number, y: number): { row: number; way: number } | null {
  if (x < 0 || y < 0 || y >= l.blockRows * l.cellH) return null;
  const block = Math.floor(x / (l.blockW + BLOCK_GAP));
  if (block >= l.blocks) return null;
  const lx = x - block * (l.blockW + BLOCK_GAP);
  if (lx >= l.blockW) return null;
  const row = block * l.blockRows + Math.floor(y / l.cellH);
  if (row >= l.rows) return null;
  if (lx < l.gutter) return { row, way: -1 };
  return { row, way: Math.floor((lx - l.gutter) / l.cellW) };
}
