/**
 * Polynomials as coefficient lists, highest power first, and their text in the graders'
 * expression language: [2, -5, 6] in x is "2x^2 - 5x + 6".
 */

/** Text of the polynomial, written the way a person would: no "1x", no "+ -3", no zero terms. */
export function poly(coeffs: readonly number[], v = 'x'): string {
  const deg = coeffs.length - 1;
  const parts: string[] = [];
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const p = deg - i;
    const mag = Math.abs(c);
    const body = p === 0 ? String(mag) : `${mag === 1 ? '' : mag}${v}${p === 1 ? '' : `^${p}`}`;
    if (parts.length === 0) parts.push(c < 0 ? `-${body}` : body);
    else parts.push(c < 0 ? `- ${body}` : `+ ${body}`);
  });
  return parts.length === 0 ? '0' : parts.join(' ');
}

/** Product of two polynomials, by multiplying every term by every term. */
export function times(a: readonly number[], b: readonly number[]): number[] {
  const out = Array.from({ length: a.length + b.length - 1 }, () => 0);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = (out[i + j] as number) + x * y; }));
  return out;
}

/** "x + 3" or "x - 3": a linear factor with a signed constant. */
export const factor = (r: number, v = 'x'): string => (r === 0 ? v : `${v} ${r < 0 ? '-' : '+'} ${Math.abs(r)}`);

/** A signed term after the first, "+ 3" or "- 3". */
export const signed = (n: number): string => `${n < 0 ? '-' : '+'} ${Math.abs(n)}`;
