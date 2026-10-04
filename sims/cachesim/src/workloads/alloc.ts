/**
 * Bump allocator for workload address layout. Every allocation is aligned (64 B by
 * default, or 4096 for page alignment) and followed by a gap, so two arrays never
 * share a cache line for line sizes up to 128 B.
 */

export const HEAP_BASE = 0x10000000;
const GAP_BYTES = 128;

/** A named address range; `idents` are the C++ identifiers that access it. */
export interface Region {
  name: string;
  idents: string[];
  base: number;
  bytes: number;
}

function alignUp(x: number, align: number): number {
  return Math.ceil(x / align) * align;
}

export class BumpAllocator {
  private next = HEAP_BASE;
  readonly regions: Region[] = [];

  /** Returns the base address. `idents` defaults to `[name]`. */
  alloc(name: string, bytes: number, opts: { align?: number; idents?: string[] } = {}): number {
    const base = alignUp(this.next, opts.align ?? 64);
    this.regions.push({ name, idents: opts.idents ?? [name], base, bytes });
    this.next = base + Math.max(bytes, 1) + GAP_BYTES;
    return base;
  }

  /** Records a sub-range of an existing allocation (a struct member) for tests and tooling. */
  label(name: string, base: number, bytes: number, idents?: string[]): void {
    this.regions.push({ name, idents: idents ?? [name], base, bytes });
  }
}
