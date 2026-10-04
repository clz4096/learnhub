/**
 * The Three.js side of the 3D die view: one InstancedMesh per cache (one instance per
 * drawn cell), plates for caches and core tiles, a DRAM slab, coherence arcs, and HTML
 * labels. Nothing here runs on its own clock: the app's frame loop calls frame(), which
 * renders only when colors, highlights, arrows, or the camera changed.
 */
import {
  BoxGeometry, BufferGeometry, Color, ConeGeometry, DynamicDrawUsage, EdgesGeometry, Float32BufferAttribute,
  Group, InstancedBufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh,
  MeshBasicMaterial, PerspectiveCamera, QuadraticBezierCurve3, Quaternion, Raycaster, Scene, TubeGeometry,
  Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CacheInfo } from '@/engine/types';
import { FLASH_MS, Flash, type CacheMirror } from '@/ui/mirror';
import { FLASH_STYLE, OUTLINE, STATE_FILL } from '@/ui/palette';
import { ARROW_MS } from '@/ui/controller';
import type { Arrow, PlayedAccess, Selection } from '@/ui/state';
import { cacheTitle, formatBytes } from '@/ui/center/Grid2D';
import {
  cellBox, computeFloorplan, pick, rowOfSet,
  type CachePlacement, type Floorplan, type Rect,
} from '@/ui/center/view3d/floorplan';
import { InstanceColors, STATIC_MIX, mix, packCss } from '@/ui/center/view3d/colors';
import { arcControl, arcLift, bezier, dashIndex, type Vec3 } from '@/ui/center/view3d/arcs';

export interface DieSceneHooks {
  select(sel: Selection): void;
  /** The zoomed cache changed (for the toolbar). */
  zoomChanged(z: { cacheId: number; first: number; last: number } | null): void;
  /** The WebGL context was lost; the host falls back to 2D. */
  lost(): void;
}

interface CacheMesh {
  mesh: InstancedMesh;
  colors: InstanceColors;
  attr: InstancedBufferAttribute;
  mirror: CacheMirror;
  lastVersion: number;
  wasFlashing: boolean;
  /** Recolor on the next frame regardless of version (view or highlight changed). */
  forced: boolean;
  /** Instance → lift factor currently written into the matrices. */
  lifted: Map<number, number>;
  /** Instance → flash kind of the current access, for the reduced-motion highlight. */
  statics: Map<number, number>;
}

/**
 * One coherence arc, built once per (from, to, kind) and reused: rebuilding per access
 * would free the material, and Three.js would relink its shader program on the next one.
 */
interface ArrowObj { arrow: Arrow; group: Group; mat: MeshBasicMaterial; geoms: BufferGeometry[]; label: HTMLElement; apex: Vector3 }

/** Elevation of the default camera above the die plane, and the field of view. */
const ELEVATION = (52 * Math.PI) / 180;
const FOV = 38;
const FLY_MS = 450;
const LIFT_CURRENT = 2.6;
const LIFT_SELECTED = 3.6;
const COLORS = {
  clear: '#f6f7f9', die: '#e3e7ec', tile: '#f0f2f5', plate: STATE_FILL.grid, dram: '#c9d1da',
};

/** A unit box (bottom at y = 0) whose faces are pre-shaded, so unlit materials still read as 3D. */
function shadedBox(): BoxGeometry {
  const g = new BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  const n = g.getAttribute('normal');
  const c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const y = n.getY(i);
    const z = n.getZ(i);
    const s = y > 0.5 ? 1 : y < -0.5 ? 0.55 : Math.abs(z) > 0.5 ? 0.86 : 0.74;
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = s;
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3));
  return g;
}

function signatureOf(infos: readonly CacheInfo[]): string {
  return infos.map((c) => `${c.level}:${c.core}:${c.sets}x${c.ways}`).join('|');
}

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class DieScene {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 1, 20000);
  private readonly controls: OrbitControls;
  private readonly cellGeom = shadedBox();
  private readonly boxGeom = shadedBox();
  private readonly cellMat = new MeshBasicMaterial({ vertexColors: true });
  private readonly outlineGeom = new EdgesGeometry(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  private readonly outlineMat = new LineBasicMaterial({ color: OUTLINE.selected });
  private readonly outline = new LineSegments(this.outlineGeom, this.outlineMat);
  private readonly world = new Group();
  private readonly arrowGroup = new Group();
  private statics: Array<{ mesh: Mesh; mat: MeshBasicMaterial }> = [];
  private dram: { mesh: Mesh; mat: MeshBasicMaterial } | null = null;
  private fp: Floorplan | null = null;
  private meshes: Array<CacheMesh | undefined> = [];
  private infos: CacheInfo[] = [];
  private signature = '';
  private readonly zooms = new Map<number, number>();
  private focused: number | null = null;
  private current: PlayedAccess | null = null;
  private selection: Selection = null;
  private dramFlash = -Infinity;
  private dramShown = -1;
  /** Every arc built for this floorplan, by key; `arrows` are the ones shown now. */
  private arrowCache = new Map<string, ArrowObj>();
  private arrows: ArrowObj[] = [];
  /**
   * HTML labels pinned to world points. Cache labels sit inside their plate's top-left
   * corner (`spanX` / `spanZ` are the plate's other corners, used to hide labels that
   * would not fit); core and DRAM labels sit above their anchor.
   */
  private labels: Array<{ el: HTMLElement; at: Vector3; spanX?: Vector3; spanZ?: Vector3; center?: boolean }> = [];
  private fly: { p0: Vector3; t0: Vector3; p1: Vector3; t1: Vector3; start: number } | null = null;
  private width = 1;
  private height = 1;
  private needsRender = true;
  private cameraMoved = true;
  private motion = true;
  visible = true;
  private readonly matrix = new Matrix4();
  private readonly raycaster = new Raycaster();
  private readonly down = new Vector2();
  private readonly detach: Array<() => void> = [];

  constructor(
    private readonly host: HTMLElement,
    private readonly overlay: HTMLElement,
    private readonly hooks: DieSceneHooks,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // The check reads the link log, which blocks until the driver finishes compiling.
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.setClearColor(new Color(COLORS.clear));
    const canvas = this.renderer.domElement;
    canvas.classList.add('view3d-canvas');
    host.prepend(canvas);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.zoomToCursor = true;
    this.controls.dampingFactor = 0.15;
    this.controls.addEventListener('change', () => { this.cameraMoved = this.needsRender = true; });
    this.outline.visible = false;
    this.outline.renderOrder = 1;
    this.scene.add(this.world, this.arrowGroup, this.outline);

    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, fn as EventListener);
      this.detach.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on(canvas, 'pointerdown', (e) => { this.down.set(e.clientX, e.clientY); });
    on(canvas, 'click', (e) => {
      if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) return;
      this.onClick(e.clientX, e.clientY);
    });
    on(canvas, 'dblclick', () => this.reset());
    const lost = (e: Event) => {
      e.preventDefault();
      this.hooks.lost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    this.detach.push(() => canvas.removeEventListener('webglcontextlost', lost));
  }

  /* ───────────────────────── inputs ───────────────────────── */

  setMotion(motion: boolean): void {
    if (motion === this.motion) return;
    this.motion = motion;
    this.controls.enableDamping = motion;
    for (const cm of this.meshes) if (cm) cm.forced = true;
    this.needsRender = true;
  }

  setSize(w: number, h: number): void {
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.cameraMoved = this.needsRender = true;
  }

  /** New run. Keeps the meshes when the hierarchy's shape is unchanged (a workload or param edit). */
  setData(mirrors: readonly CacheMirror[]): void {
    // Infos come from the mirrors themselves, so the two can never disagree mid-update.
    const infos = mirrors.map((m) => m.info);
    const sig = signatureOf(infos);
    this.infos = infos;
    if (sig === this.signature && this.fp) {
      this.zooms.clear();
      this.relayout();
      infos.forEach((c) => {
        const cm = this.meshes[c.id];
        const m = mirrors[c.id];
        if (cm && m) {
          cm.mirror = m;
          cm.lastVersion = -1;
          cm.colors.invalidate();
          cm.forced = true;
        }
      });
    } else {
      this.signature = sig;
      this.zooms.clear();
      this.focused = null;
      this.build(infos, mirrors);
      this.fitDie(false);
    }
    this.refreshHighlights();
    this.hooks.zoomChanged(null);
    this.needsRender = true;
  }

  setCurrent(cur: PlayedAccess | null): void {
    this.current = cur;
    if (cur?.servedBy === 'DRAM') this.dramFlash = performance.now();
    this.needsRender = true;
    this.refreshHighlights();
  }

  setSelection(sel: Selection): void {
    this.selection = sel;
    this.refreshHighlights();
  }

  setArrows(list: readonly Arrow[]): void {
    for (const o of this.arrows) {
      o.group.visible = false;
      o.label.hidden = true;
    }
    this.arrows = [];
    if (!this.fp) return;
    const anchor = new Map(this.fp.cores.map((t) => [t.core, t.anchor]));
    for (const a of list) {
      const key = `${a.from}>${a.to}:${a.kind}`;
      let o = this.arrowCache.get(key);
      if (!o) {
        const p = anchor.get(a.from);
        const q = anchor.get(a.to);
        if (!p || !q) continue;
        o = this.buildArrow(a, [p.x, 2, p.z], [q.x, 2, q.z]);
        this.arrowCache.set(key, o);
      }
      o.arrow = a;
      o.group.visible = true;
      o.mat.opacity = 1;
      o.label.style.opacity = '1';
      this.arrows.push(o);
    }
    // Text on every arc clutters the die; label only the newest arc of each kind.
    const newest = new Map<string, ArrowObj>();
    for (const o of this.arrows) {
      const n = newest.get(o.arrow.kind);
      if (!n || o.arrow.t >= n.arrow.t) newest.set(o.arrow.kind, o);
    }
    for (const o of newest.values()) o.label.hidden = false;
    this.cameraMoved = this.needsRender = true;
  }

  /* ───────────────────────── camera ───────────────────────── */

  /** Return to the full die (also leaves any exact-set zoom). */
  reset(): void {
    if (this.zooms.size) {
      this.zooms.clear();
      this.relayout();
      this.hooks.zoomChanged(null);
    }
    this.focused = null;
    this.fitDie(this.motion);
  }

  focusCache(id: number): void {
    const p = this.fp?.caches[id];
    if (!p) return;
    this.focused = id;
    this.flyTo(p.plate, this.motion);
  }

  /** Show one aggregated row's sets exactly (group = null: back to all sets). */
  zoomCache(id: number, group: number | null): void {
    if (group === null) this.zooms.delete(id);
    else this.zooms.set(id, group);
    this.relayout();
    const p = this.fp?.caches[id];
    const cm = this.meshes[id];
    this.hooks.zoomChanged(group !== null && p && cm
      ? { cacheId: id, first: p.view.base, last: p.view.base + p.view.rows - 1 }
      : null);
  }

  /** Keyboard control for the focused canvas container. Returns true when the key was used. */
  key(e: KeyboardEvent): boolean {
    const step = Math.PI / 18;
    if (e.key === 'Escape' || e.key === 'Home' || e.key === '0') this.reset();
    else if (e.key === '+' || e.key === '=') this.dolly(0.8);
    else if (e.key === '-' || e.key === '_') this.dolly(1.25);
    else if (e.shiftKey && e.key === 'ArrowLeft') this.orbit(-step, 0);
    else if (e.shiftKey && e.key === 'ArrowRight') this.orbit(step, 0);
    else if (e.shiftKey && e.key === 'ArrowUp') this.orbit(0, -step);
    else if (e.shiftKey && e.key === 'ArrowDown') this.orbit(0, step);
    else return false;
    return true;
  }

  private dolly(f: number): void {
    const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(f);
    const len = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, off.length()));
    this.camera.position.copy(this.controls.target).add(off.setLength(len));
    this.controls.update();
    this.cameraMoved = this.needsRender = true;
  }

  private orbit(dTheta: number, dPhi: number): void {
    const off = this.camera.position.clone().sub(this.controls.target);
    const r = off.length();
    let theta = Math.atan2(off.x, off.z) + dTheta;
    let phi = Math.acos(Math.min(1, Math.max(-1, off.y / r))) + dPhi;
    phi = Math.min(this.controls.maxPolarAngle, Math.max(0.05, phi));
    if (!Number.isFinite(theta)) theta = 0;
    off.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
    this.cameraMoved = this.needsRender = true;
  }

  private fitDie(animate: boolean): void {
    if (!this.fp) return;
    const { die, dram } = this.fp;
    this.flyTo({ x: die.x, z: die.z, w: die.w, d: dram.z + dram.d - die.z }, animate);
  }

  /**
   * Camera position that frames `r` from the default angle. A tilted perspective view
   * has no simple closed form, so binary-search the distance at which every corner of
   * the box projects inside the viewport with a margin.
   */
  private framing(r: Rect): { pos: Vector3; target: Vector3 } {
    const target = new Vector3(r.x + r.w / 2, 0, r.z + r.d / 2);
    const dir = new Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    const cam = this.camera.clone();
    const corners: Vector3[] = [];
    for (const x of [r.x, r.x + r.w]) for (const y of [-16, 8]) for (const z of [r.z, r.z + r.d]) corners.push(new Vector3(x, y, z));
    const fits = (dist: number): boolean => {
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      return corners.every((c) => {
        const p = c.clone().project(cam);
        return p.z < 1 && Math.abs(p.x) <= 0.94 && Math.abs(p.y) <= 0.9;
      });
    };
    let lo = 1;
    let hi = Math.max(r.w, r.d) * 8 + 100;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return { pos: target.clone().addScaledVector(dir, hi), target };
  }

  private flyTo(r: Rect, animate: boolean): void {
    const { pos, target } = this.framing(r);
    if (this.fp) {
      const all = this.framing(this.fp.die);
      this.controls.maxDistance = all.pos.distanceTo(all.target) * 4;
      this.controls.minDistance = 8;
      this.camera.far = this.controls.maxDistance * 3;
      this.camera.updateProjectionMatrix();
    }
    if (!animate) {
      this.fly = null;
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
    } else {
      this.fly = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, start: performance.now() };
    }
    this.cameraMoved = this.needsRender = true;
  }

  /* ───────────────────────── building ───────────────────────── */

  private aggOf = (c: CacheInfo) => {
    const m = this.meshes[c.id]?.mirror;
    return m ?? { groupSize: 1, groups: c.sets };
  };

  private build(infos: CacheInfo[], mirrors: readonly CacheMirror[]): void {
    this.disposeContent();
    // Mirrors first, so the floorplan sees each cache's aggregation.
    const fp = computeFloorplan(infos, (c) => mirrors[c.id] ?? { groupSize: 1, groups: c.sets }, (c) => this.zooms.get(c.id) ?? null);
    this.fp = fp;
    const slab = (r: Rect, y0: number, h: number, color: string): void => {
      const mat = new MeshBasicMaterial({ color: new Color(color), vertexColors: true });
      const mesh = new Mesh(this.boxGeom, mat);
      mesh.scale.set(r.w, h, r.d);
      mesh.position.set(r.x + r.w / 2, y0, r.z + r.d / 2);
      this.world.add(mesh);
      this.statics.push({ mesh, mat });
    };
    slab(fp.die, -6, 4, COLORS.die);
    for (const t of fp.cores) slab(t.rect, -2, 1, COLORS.tile);
    for (const p of fp.caches) if (p) slab(p.plate, -1, 1, COLORS.plate);
    const dramMat = new MeshBasicMaterial({ color: new Color(COLORS.dram), vertexColors: true });
    const dram = new Mesh(this.boxGeom, dramMat);
    dram.scale.set(fp.dram.w, 10, fp.dram.d);
    dram.position.set(fp.dram.x + fp.dram.w / 2, -16, fp.dram.z + fp.dram.d / 2);
    this.world.add(dram);
    this.dram = { mesh: dram, mat: dramMat };
    this.dramShown = -1;

    this.meshes = [];
    for (const info of infos) {
      const m = mirrors[info.id];
      if (!m) continue;
      const capacity = (m.groupSize > 1 ? Math.max(m.groups, m.groupSize) : info.sets) * info.ways;
      const colors = new InstanceColors(capacity);
      const mesh = new InstancedMesh(this.cellGeom, this.cellMat, capacity);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      const attr = new InstancedBufferAttribute(colors.rgb, 3);
      attr.setUsage(DynamicDrawUsage);
      mesh.instanceColor = attr;
      // Lifts and zooms move instances; culling per mesh would need bounds recomputed each time.
      mesh.frustumCulled = false;
      this.world.add(mesh);
      this.meshes[info.id] = {
        mesh, colors, attr, mirror: m, lastVersion: -1, wasFlashing: false, forced: true,
        lifted: new Map(), statics: new Map(),
      };
    }
    for (const p of fp.caches) if (p) this.writeMatrices(p);
    this.buildLabels();
  }

  /** Recompute the floorplan for the current zooms and rewrite matrices of caches whose view changed. */
  private relayout(): void {
    if (!this.fp) return;
    const old = this.fp;
    this.fp = computeFloorplan(this.infos, this.aggOf, (c) => this.zooms.get(c.id) ?? null);
    for (const p of this.fp.caches) {
      if (!p) continue;
      const o = old.caches[p.info.id];
      if (o && o.view.zoom === p.view.zoom && o.view.rows === p.view.rows) continue;
      const cm = this.meshes[p.info.id];
      if (!cm) continue;
      cm.lifted.clear();
      cm.colors.invalidate();
      cm.forced = true;
      this.writeMatrices(p);
    }
    this.refreshHighlights();
    this.cameraMoved = this.needsRender = true;
  }

  private writeMatrices(p: CachePlacement): void {
    const cm = this.meshes[p.info.id];
    if (!cm) return;
    const ways = p.info.ways;
    cm.mesh.count = p.view.rows * ways;
    for (let row = 0, i = 0; row < p.view.rows; row++) {
      for (let w = 0; w < ways; w++, i++) this.setCell(cm, p, row, w, 1);
    }
    cm.mesh.instanceMatrix.clearUpdateRanges();
    cm.mesh.instanceMatrix.needsUpdate = true;
  }

  private setCell(cm: CacheMesh, p: CachePlacement, row: number, way: number, lift: number): void {
    const b = cellBox(p, row, way);
    this.matrix.makeScale(b.sx, p.cellHeight * lift, b.sz);
    this.matrix.setPosition(b.cx, 0, b.cz);
    cm.mesh.setMatrixAt(row * p.info.ways + way, this.matrix);
  }

  /* ───────────────────────── highlights ───────────────────────── */

  /** Lift the current access's cells and the selected one; place the selection outline. */
  private refreshHighlights(): void {
    const fp = this.fp;
    if (!fp) return;
    const want = new Map<number, Map<number, number>>();
    const statics = new Map<number, Map<number, number>>();
    const add = (cache: number, inst: number, lift: number) => {
      const m = want.get(cache) ?? want.set(cache, new Map()).get(cache)!;
      m.set(inst, Math.max(lift, m.get(inst) ?? 0));
    };
    for (const ev of this.current?.events ?? []) {
      const p = fp.caches[ev.cache];
      const cm = this.meshes[ev.cache];
      if (!p || !cm || ev.set < 0 || ev.set >= p.info.sets || ev.way < 0 || ev.way >= p.info.ways) continue;
      const row = rowOfSet(p, cm.mirror.groupSize, ev.set);
      if (row < 0) continue;
      const inst = row * p.info.ways + ev.way;
      add(ev.cache, inst, LIFT_CURRENT);
      const kind = p.view.exact ? cm.mirror.flashKind[ev.set * p.info.ways + ev.way]! : cm.mirror.aggFlashKind[inst]!;
      if (kind !== Flash.None) (statics.get(ev.cache) ?? statics.set(ev.cache, new Map()).get(ev.cache)!).set(inst, kind);
    }
    const sel = this.selection;
    this.outline.visible = false;
    if (sel && sel.cacheId !== undefined) {
      const p = fp.caches[sel.cacheId];
      const cm = this.meshes[sel.cacheId];
      if (p && cm) {
        const row = sel.set !== undefined && sel.set >= 0 && sel.set < p.info.sets ? rowOfSet(p, cm.mirror.groupSize, sel.set) : -1;
        if (sel.type === 'slot' && sel.way !== undefined && sel.way >= 0 && sel.way < p.info.ways && row >= 0) {
          add(sel.cacheId, row * p.info.ways + sel.way, LIFT_SELECTED);
          const b = cellBox(p, row, sel.way);
          this.placeOutline(b.cx, b.cz, b.sx * 1.25, b.sz * 1.25, p.cellHeight * LIFT_SELECTED * 1.05);
        } else if (sel.type === 'set' && row >= 0) {
          const a = cellBox(p, row, 0);
          const b = cellBox(p, row, p.info.ways - 1);
          this.placeOutline((a.cx + b.cx) / 2, a.cz, b.cx - a.cx + b.sx * 1.3, a.sz * 1.4, p.cellHeight * 1.6);
        } else if (sel.type === 'cache') {
          const r = p.plate;
          this.placeOutline(r.x + r.w / 2, r.z + r.d / 2, r.w + 2, r.d + 2, p.cellHeight + 1);
        }
      }
    }
    fp.caches.forEach((p) => {
      if (!p) return;
      const cm = this.meshes[p.info.id];
      if (!cm) return;
      const next = want.get(p.info.id) ?? new Map<number, number>();
      const ways = p.info.ways;
      const touched: number[] = [];
      for (const [inst, f] of cm.lifted) if (next.get(inst) !== f) touched.push(inst);
      for (const [inst, f] of next) if (cm.lifted.get(inst) !== f) touched.push(inst);
      for (const inst of touched) {
        this.setCell(cm, p, Math.floor(inst / ways), inst % ways, next.get(inst) ?? 1);
        cm.mesh.instanceMatrix.addUpdateRange(inst * 16, 16);
      }
      if (touched.length) cm.mesh.instanceMatrix.needsUpdate = true;
      cm.lifted = next;
      const st = statics.get(p.info.id) ?? new Map<number, number>();
      if (!this.motion && (st.size || cm.statics.size)) cm.forced = true;
      cm.statics = st;
    });
    this.needsRender = true;
  }

  private placeOutline(cx: number, cz: number, sx: number, sz: number, h: number): void {
    this.outline.visible = true;
    this.outline.scale.set(sx, h, sz);
    this.outline.position.set(cx, 0, cz);
  }

  /* ───────────────────────── arrows ───────────────────────── */

  private buildArrow(a: Arrow, from: Vec3, to: Vec3): ArrowObj {
    const inv = a.kind === 'invalidate';
    const color = new Color(inv ? FLASH_STYLE[Flash.Invalidate]!.color : FLASH_STYLE[Flash.Prefetch]!.color);
    const dist = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const c = arcControl(from, to, arcLift(dist, a.from > a.to));
    const curve = new QuadraticBezierCurve3(new Vector3(...from), new Vector3(...c), new Vector3(...to));
    const tubular = 40;
    const radial = 6;
    const tube = new TubeGeometry(curve, tubular, 1.8, radial, false);
    if (inv) tube.setIndex(dashIndex(tube.getIndex()!.array, tubular, radial));
    const group = new Group();
    const mat = new MeshBasicMaterial({ color, transparent: true });
    group.add(new Mesh(tube, mat));
    const cone = new ConeGeometry(5, 12, 12);
    const head = new Mesh(cone, mat);
    const tan = curve.getTangent(1);
    head.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tan));
    head.position.copy(curve.getPoint(1)).addScaledVector(tan, -6);
    group.add(head);
    this.arrowGroup.add(group);
    const label = document.createElement('span');
    label.className = 'view3d-arrow-label';
    label.textContent = inv ? '⊘ invalidate' : '⇄ share';
    label.setAttribute('aria-hidden', 'true');
    this.overlay.append(label);
    return { arrow: a, group, mat, geoms: [tube, cone], label, apex: new Vector3(...bezier(from, c, to, 0.5)) };
  }

  private clearArrows(): void {
    for (const o of this.arrowCache.values()) {
      for (const g of o.geoms) g.dispose();
      o.mat.dispose();
      this.arrowGroup.remove(o.group);
      o.label.remove();
    }
    this.arrowCache.clear();
    this.arrows = [];
  }

  /* ───────────────────────── labels and picking ───────────────────────── */

  private buildLabels(): void {
    for (const l of this.labels) l.el.remove();
    this.labels = [];
    const fp = this.fp;
    if (!fp) return;
    for (const t of fp.cores) {
      const el = document.createElement('span');
      el.className = 'view3d-label view3d-core-label';
      el.textContent = `Core ${t.core}`;
      this.overlay.append(el);
      this.labels.push({ el, at: new Vector3(t.rect.x + t.rect.w / 2, 0, t.rect.z + 2), center: true });
    }
    for (const p of fp.caches) {
      if (!p) continue;
      const info = p.info;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'view3d-label view3d-cache-label';
      el.textContent = info.core >= 0 ? info.level : `${info.level} · shared · ${formatBytes(info.sizeBytes)}`;
      el.setAttribute('aria-label', `${cacheTitle(info)}, ${formatBytes(info.sizeBytes)}, ${info.ways}-way, ${info.sets} sets: focus and select`);
      el.addEventListener('click', () => {
        this.focusCache(info.id);
        this.hooks.select({ type: 'cache', cacheId: info.id });
      });
      this.overlay.append(el);
      this.labels.push({
        el, at: new Vector3(p.plate.x, p.cellHeight, p.plate.z),
        spanX: new Vector3(p.plate.x + p.plate.w, p.cellHeight, p.plate.z),
        spanZ: new Vector3(p.plate.x, p.cellHeight, p.plate.z + p.plate.d),
      });
    }
    const el = document.createElement('span');
    el.className = 'view3d-label view3d-dram-label';
    el.textContent = 'DRAM (off-chip)';
    this.overlay.append(el);
    this.labels.push({ el, at: new Vector3(fp.dram.x + 4, -6, fp.dram.z) });
  }

  private readonly proj = new Vector3();
  private toScreen(v: Vector3): { x: number; y: number; ok: boolean } {
    this.proj.copy(v).project(this.camera);
    const ok = this.proj.z < 1 && Math.abs(this.proj.x) <= 1.02 && Math.abs(this.proj.y) <= 1.02;
    return { x: ((this.proj.x + 1) / 2) * this.width, y: ((1 - this.proj.y) / 2) * this.height, ok };
  }

  private placeLabels(): void {
    // Read every label width before writing any style, so the browser lays out once.
    const sizes = this.labels.map((l) => (l.spanX ? [l.el.offsetWidth, l.el.offsetHeight] : [0, 0]));
    this.labels.forEach((l, i) => {
      const s = this.toScreen(l.at);
      // Labels on caches too small on screen to carry text stay focusable but hidden until focused.
      let tight = false;
      if (l.spanX && l.spanZ) {
        const [w, h] = sizes[i]!;
        tight = Math.abs(this.toScreen(l.spanX).x - s.x) < w! + 6 || Math.abs(this.toScreen(l.spanZ).y - s.y) < h! * 2;
      }
      const shift = l.spanX ? 'translate(2px, 2px)' : `translate(${l.center ? '-50%' : '0'}, -100%)`;
      l.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) ${shift}`;
      l.el.classList.toggle('is-off', !s.ok);
      l.el.classList.toggle('is-tight', tight);
    });
    for (const o of this.arrows) {
      const s = this.toScreen(o.apex);
      o.label.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
      o.label.classList.toggle('is-off', !s.ok);
    }
  }

  private onClick(clientX: number, clientY: number): void {
    const fp = this.fp;
    if (!fp) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin: o, direction: d } = this.raycaster.ray;
    const hit = pick(fp, [o.x, o.y, o.z], [d.x, d.y, d.z]);
    if (!hit) return;
    const p = fp.caches[hit.cacheId]!;
    if (this.focused !== hit.cacheId) this.focusCache(hit.cacheId);
    if (hit.row < 0) {
      this.hooks.select({ type: 'cache', cacheId: hit.cacheId });
    } else if (!p.view.exact) {
      this.zoomCache(hit.cacheId, hit.row);
    } else {
      this.hooks.select({ type: 'slot', cacheId: hit.cacheId, set: p.view.base + hit.row, way: hit.way });
    }
  }

  /* ───────────────────────── frame ───────────────────────── */

  /** Called once per animation frame by the app loop. Renders only when something changed. */
  frame(now: number): void {
    if (!this.visible || !this.fp) return;
    const motion = this.motion;
    if (this.fly) {
      const t = Math.min(1, (performance.now() - this.fly.start) / FLY_MS);
      const k = easeInOut(t);
      this.camera.position.lerpVectors(this.fly.p0, this.fly.p1, k);
      this.controls.target.lerpVectors(this.fly.t0, this.fly.t1, k);
      if (t >= 1) this.fly = null;
      this.cameraMoved = this.needsRender = true;
    }
    this.controls.update();

    for (const cm of this.meshes) {
      if (!cm) continue;
      const m = cm.mirror;
      const flashing = motion && now - m.lastFlash < FLASH_MS;
      if (!cm.forced && m.version === cm.lastVersion && !flashing && !cm.wasFlashing) continue;
      cm.forced = false;
      cm.lastVersion = m.version;
      cm.wasFlashing = flashing;
      const p = this.fp.caches[m.info.id];
      if (!p) continue;
      const ranges = cm.colors.update(m, p.view, now, motion, motion ? null : cm.statics);
      if (ranges.length === 0) continue;
      for (const [start, count] of ranges) cm.attr.addUpdateRange(start * 3, count * 3);
      cm.attr.needsUpdate = true;
      this.needsRender = true;
    }

    if (this.dram) {
      const age = now - this.dramFlash;
      const base = packCss(COLORS.dram);
      const miss = packCss(FLASH_STYLE[Flash.Miss]!.color);
      const c = !motion
        ? (this.current?.servedBy === 'DRAM' ? mix(base, miss, STATIC_MIX) : base)
        : age >= 0 && age < FLASH_MS ? mix(base, miss, Math.max(0.15, 1 - age / FLASH_MS)) : base;
      if (c !== this.dramShown) {
        this.dramShown = c;
        this.dram.mat.color.set(c);
        this.needsRender = true;
      }
    }

    if (this.arrows.length && motion) {
      for (const o of this.arrows) {
        const op = Math.max(0, 1 - (now - o.arrow.t) / ARROW_MS);
        o.mat.opacity = op;
        o.label.style.opacity = String(op);
      }
      this.needsRender = true;
    }

    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
    if (this.cameraMoved) {
      this.cameraMoved = false;
      this.placeLabels();
    }
  }

  /** Bump to repaint (after becoming visible again). */
  invalidate(): void {
    this.cameraMoved = this.needsRender = true;
  }

  /* ───────────────────────── teardown ───────────────────────── */

  private disposeContent(): void {
    this.clearArrows();
    for (const cm of this.meshes) {
      if (!cm) continue;
      this.world.remove(cm.mesh);
      cm.mesh.dispose();
    }
    this.meshes = [];
    for (const s of this.statics) {
      this.world.remove(s.mesh);
      s.mat.dispose();
    }
    this.statics = [];
    if (this.dram) {
      this.world.remove(this.dram.mesh);
      this.dram.mat.dispose();
      this.dram = null;
    }
    for (const l of this.labels) l.el.remove();
    this.labels = [];
    this.fp = null;
  }

  dispose(): void {
    this.disposeContent();
    for (const d of this.detach) d();
    this.controls.dispose();
    this.cellGeom.dispose();
    this.boxGeom.dispose();
    this.cellMat.dispose();
    this.outlineGeom.dispose();
    this.outlineMat.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
