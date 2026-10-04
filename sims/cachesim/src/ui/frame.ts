/** Per-frame draw callbacks (canvases). The controller's rAF loop runs them once per frame. */
export type Drawer = (now: number) => void;

const drawers = new Set<Drawer>();

export function registerDrawer(d: Drawer): () => void {
  drawers.add(d);
  return () => {
    drawers.delete(d);
  };
}

export function runDrawers(now: number): void {
  for (const d of drawers) d(now);
}
