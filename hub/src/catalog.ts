// The shape of site/catalog.json (written by scripts/assemble.mjs) and plain-language labels.

export type Level = 'visualizer' | 'simulator' | 'simulator-with-real-check' | 'build-the-model-lab' | 'research-instrument' | 'course';
export type Status = 'ready' | 'beta' | 'planned';

export interface Material {
  label: string;
  /** Relative to the site root. */
  href: string;
}

export interface Tool {
  id: string;
  title: string;
  summary: string;
  tracks: string[];
  level: Level;
  minutes: number;
  lessons: number;
  status: Status;
  /** Relative to the site root, for example "sims/cachesim/". */
  href: string;
  materials: Material[];
}

export interface Catalog {
  tools: Tool[];
}

const LEVEL_LABELS: Record<Level, string> = {
  visualizer: 'Visualizer',
  simulator: 'Simulator',
  'simulator-with-real-check': 'Simulator, checked on real hardware',
  'build-the-model-lab': 'Lab: build the model yourself',
  'research-instrument': 'Research instrument',
  course: 'Course: lessons, practice, and review',
};

const TRACK_LABELS: Record<string, string> = {
  'ML-SYS': 'ML systems',
  HFT: 'High-frequency trading',
  ALGO: 'Algorithms',
  DIST: 'Distributed systems',
  MATH: 'Math',
  STATS: 'Statistics',
  RESEARCH: 'Research',
};

export const levelLabel = (l: string): string => LEVEL_LABELS[l as Level] ?? l;
export const trackLabel = (t: string): string => TRACK_LABELS[t] ?? t;

export function minutesLabel(m: number): string {
  if (m < 120) return `About ${m} minutes`;
  const h = Math.round((m / 60) * 2) / 2;
  return `About ${h} hours`;
}

export const lessonsLabel = (n: number): string => (n === 1 ? '1 lesson' : `${n} lessons`);

/** Only ready tools reach the catalog (owner decision, DESIGN.md). assemble.mjs filters too. */
export const readyTools = (c: Catalog): Tool[] => c.tools.filter((t) => t.status === 'ready');

/** Every track used by the given tools, in first-seen order. */
export function tracksOf(tools: Tool[]): string[] {
  const seen = new Set<string>();
  for (const t of tools) for (const k of t.tracks) seen.add(k);
  return [...seen];
}

export function isCatalog(v: unknown): v is Catalog {
  return typeof v === 'object' && v !== null && Array.isArray((v as Catalog).tools);
}
