/**
 * Address breakdown: how a byte address maps to a cache's tag | set index | offset.
 *
 * offset = addr mod lineBytes; line = floor(addr / lineBytes); set = line mod sets;
 * tag = floor(line / sets). When sets is a power of two these are plain bit fields
 * of the address; otherwise (for example a 12-way 9 MiB L3 with 12,288 sets) the set
 * index is a modulo, not a bit field. Real large L3s also hash the address across
 * slices, which this model does not.
 */
export interface AddressBreakdown {
  addr: number;
  line: number;
  offset: number;
  set: number;
  tag: number;
  offsetBits: number;
  /** Bit width of the set index, or null when sets is not a power of two. */
  indexBits: number | null;
  /** True when tag | index | offset are contiguous bit fields of the address. */
  bitFields: boolean;
}

export function isPow2(n: number): boolean {
  return n > 0 && Number.isInteger(n) && (n & (n - 1)) === 0;
}

export function log2(n: number): number {
  return Math.round(Math.log2(n));
}

export function breakdown(addr: number, lineBytes: number, sets: number): AddressBreakdown {
  const line = Math.floor(addr / lineBytes);
  const offset = addr - line * lineBytes;
  const set = line % sets;
  const tag = Math.floor(line / sets);
  const pow2 = isPow2(sets);
  return {
    addr, line, offset, set, tag,
    offsetBits: log2(lineBytes),
    indexBits: pow2 ? log2(sets) : null,
    bitFields: pow2,
  };
}

/** Binary string of `value` padded to `bits` (for the UI's bit-field view). */
export function bits(value: number, width: number): string {
  if (width <= 0) return '';
  return value.toString(2).padStart(width, '0').slice(-width);
}

export function hex(addr: number): string {
  return '0x' + addr.toString(16).padStart(8, '0');
}
