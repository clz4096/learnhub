/**
 * Layered layout of the knowledge map. Each level (before A level, A level, STEP, Tripos)
 * gets its own band of rows, so the map reads top to bottom from foundations to the
 * Tripos. Inside a band, a topic sits one row below the lowest of its prerequisites from
 * the same level; prerequisites from lower levels are in the bands above. Within a row,
 * topics are grouped by area and then placed near the average position of their
 * prerequisites, which keeps most edges short.
 */
import { LEVELS, topoOrder, type Topic } from '@learnhub/mastery';

export interface Node {
  id: string;
  x: number;
  y: number;
  layer: number;
}

export interface Band {
  level: string;
  y: number;
  height: number;
}

export interface Layout {
  nodes: Map<string, Node>;
  edges: { from: string; to: string }[];
  bands: Band[];
  width: number;
  height: number;
}

export const NODE_W = 168;
/** Tall enough for three lines of the map's 15 px labels. */
export const NODE_H = 60;
const GAP_X = 16;
const GAP_Y = 36;
const BAND_GAP = 28;
const PAD = 24;

/** `topics` must be closed under prerequisites; `areas` orders areas left to right. */
export function layout(topics: readonly Topic[], areas: readonly string[]): Layout {
  const ids = new Set(topics.map((t) => t.id));
  const byId = new Map(topics.map((t) => [t.id, t] as const));
  const layer = new Map<string, number>();
  const levelOf = (id: string): number => LEVELS.indexOf((byId.get(id) as Topic).level);
  // Prerequisites first, so one pass settles each level (the graph's own order is by area, not by prerequisite).
  const ordered = topoOrder(topics).map((id) => byId.get(id) as Topic);

  // Levels in order; each band starts below everything before it.
  let next = 0;
  const bandRows: { level: string; from: number; to: number }[] = [];
  for (const level of LEVELS) {
    const inLevel = ordered.filter((t) => t.level === level);
    if (inLevel.length === 0) continue;
    const start = next;
    let maxLayer = start;
    for (const t of inLevel) {
      let l = start;
      for (const p of t.prereqs) {
        if (!ids.has(p)) continue;
        if (levelOf(p) === LEVELS.indexOf(level)) l = Math.max(l, (layer.get(p) ?? start) + 1);
      }
      layer.set(t.id, l);
      maxLayer = Math.max(maxLayer, l);
    }
    bandRows.push({ level, from: start, to: maxLayer });
    next = maxLayer + 1;
  }

  const rows = new Map<number, Topic[]>();
  for (const t of topics) {
    const l = layer.get(t.id) as number;
    rows.set(l, [...(rows.get(l) ?? []), t]);
  }
  const widest = Math.max(...[...rows.values()].map((r) => r.length));
  const width = PAD * 2 + widest * NODE_W + (widest - 1) * GAP_X;

  const bandOf = (l: number): number => bandRows.findIndex((b) => l >= b.from && l <= b.to);
  const yOf = (l: number): number => PAD + l * (NODE_H + GAP_Y) + bandOf(l) * BAND_GAP + BAND_GAP;

  const nodes = new Map<string, Node>();
  const areaIndex = (a: string): number => {
    const i = areas.indexOf(a);
    return i < 0 ? areas.length : i;
  };
  for (const l of [...rows.keys()].sort((a, b) => a - b)) {
    const row = rows.get(l) as Topic[];
    const bary = (t: Topic): number => {
      const xs = t.prereqs.map((p) => nodes.get(p)?.x).filter((x): x is number => x !== undefined);
      return xs.length === 0 ? Number.POSITIVE_INFINITY : xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    const sorted = [...row].sort((a, b) => areaIndex(a.area) - areaIndex(b.area) || bary(a) - bary(b) || a.title.localeCompare(b.title));
    const rowWidth = sorted.length * NODE_W + (sorted.length - 1) * GAP_X;
    const left = (width - rowWidth) / 2;
    sorted.forEach((t, i) => nodes.set(t.id, { id: t.id, x: left + i * (NODE_W + GAP_X), y: yOf(l), layer: l }));
  }

  const edges = topics.flatMap((t) => t.prereqs.filter((p) => ids.has(p)).map((p) => ({ from: p, to: t.id })));
  const bands: Band[] = bandRows.map((b) => {
    const top = yOf(b.from) - BAND_GAP + 4;
    return { level: b.level, y: top, height: yOf(b.to) + NODE_H + GAP_Y / 2 - top };
  });
  const height = (bands.length === 0 ? PAD : Math.max(...bands.map((b) => b.y + b.height))) + PAD;
  return { nodes, edges, bands, width, height };
}
