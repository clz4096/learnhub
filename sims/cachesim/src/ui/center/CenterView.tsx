/**
 * The center view area. Renders the 2D grids; a 3D view plugs in through
 * registerCenterView3D (center/registry.ts) and is then selectable with the toggle.
 */
import { useRef } from 'preact/hooks';
import type { CacheInfo } from '@/engine/types';
import { Grid2D } from '@/ui/center/Grid2D';
import { CoherenceArrows } from '@/ui/center/CoherenceArrows';
import { Legend } from '@/ui/center/Legend';
import { centerView3D } from '@/ui/center/registry';
import { caches, config, configError, layout, showArrows, view, workerError } from '@/ui/state';
import { Term } from '@/ui/Term';

export function CenterView() {
  const View3D = centerView3D.value;
  const phone = layout.value === 'phone';
  const show3D = view.value === '3d' && View3D && !phone;
  return (
    <section class="center-view" aria-label="Cache view">
      {!phone && (
        <div class="segmented view-toggle" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view.value === '2d'} onClick={() => { view.value = '2d'; }}>2D grids</button>
          <button
            type="button"
            role="radio"
            aria-checked={view.value === '3d'}
            disabled={!View3D}
            title={View3D ? '3D die view' : '3D view coming'}
            onClick={() => { view.value = '3d'; }}
          >
            {View3D ? '3D die' : '3D view coming'}
          </button>
        </div>
      )}
      {show3D ? <View3D layout={layout.value} /> : <Grids />}
    </section>
  );
}

/** The 2D grids; also the 3D view's fallback when WebGL is unavailable. */
export function Grids() {
  const ref = useRef<HTMLDivElement>(null);
  const infos = caches.value;
  const cfg = config.value;
  if (infos.length === 0) {
    const msg = configError.value ? 'Fix the hardware configuration to start.'
      : workerError.value ? 'No simulation: fix the error above.' : 'Starting the simulator…';
    return <p class="muted empty-view">{msg}</p>;
  }
  const cores = new Map<number, CacheInfo[]>();
  const shared: CacheInfo[] = [];
  for (const c of infos) {
    if (c.core < 0) shared.push(c);
    else (cores.get(c.core) ?? cores.set(c.core, []).get(c.core)!).push(c);
  }
  return (
    <div class="grids" ref={ref}>
      <p class="small muted grids-intro">
        Each grid is one <Term id="cache">cache</Term>. A row is a <Term id="set">set</Term> (the one shelf a line may go on), a
        column is a <Term id="way">way</Term> (a slot on that shelf), and each cell holds one <Term id="cache-line">cache line</Term>
        ({cfg.l1d.lineBytes} B that always move together). Ways per set = <Term id="associativity">associativity</Term>. Click
        Explain at the top, then any cell, to learn why it holds what it holds.
      </p>
      <Legend />
      <div class="core-columns">
        {[...cores.entries()].map(([core, list]) => (
          <div class="core-column" key={core} data-core-anchor={core}>
            <h3 class="core-title">Core {core}</h3>
            {list.map((c) => <Grid2D key={c.id} info={c} maxHeight={180} />)}
          </div>
        ))}
      </div>
      {shared.map((c) => <Grid2D key={c.id} info={c} maxHeight={260} />)}
      {showArrows.value && <CoherenceArrows container={ref} />}
    </div>
  );
}
