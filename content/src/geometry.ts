/**
 * Shared helpers for the geometry, trigonometry, and complex number topics (Preparation,
 * group B): exact values of sin, cos, and tan at the special angles, surds in the graders'
 * expression language, small vector arithmetic, and witness checks for sets of numbers and
 * of points. Every exact value here is computed from its definition, and the content checks
 * compare each with Math.sin and Math.cos (`exactValueError`). A topic that imports this
 * module pulls it into its own chunk.
 */
import { formatRational, type Rational } from '@learnhub/mastery';
import { q } from './math';

/** An exact number as text in the graders' expression language, as LaTeX, and as a float. */
export interface Exact {
  expr: string;
  tex: string;
  value: number;
}

/** The largest k with k^2 dividing n, and the rest: n = k^2 m with m square-free. For n >= 1. */
export function splitSquare(n: number): [number, number] {
  let k = 1;
  let m = n;
  for (let d = 2; d * d <= m; d++) {
    while (m % (d * d) === 0) {
      m /= d * d;
      k *= d;
    }
  }
  return [k, m];
}

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
};

/**
 * (p / d) times the square root of n, simplified: sqrt(n) = k sqrt(m), then the fraction
 * pk/d in lowest terms. For n >= 0 and d >= 1.
 */
export function surd(p: number, n: number, d = 1): Exact {
  if (n === 0 || p === 0) return { expr: '0', tex: '0', value: 0 };
  const [k, m] = splitSquare(n);
  let num = p * k;
  let den = d;
  const g = gcd(num, den);
  num /= g;
  den /= g;
  const value = (num / den) * Math.sqrt(m);
  const sign = num < 0 ? '-' : '';
  const a = Math.abs(num);
  if (m === 1) {
    const r = q(num, den);
    return { expr: formatRational(r), tex: r.den === 1n ? String(r.num) : `${sign}\\frac{${a}}{${den}}`, value };
  }
  const coef = a === 1 ? '' : `${a}`;
  const exprBody = `${coef}${a === 1 ? '' : '*'}sqrt(${m})`;
  const texBody = `${coef}\\sqrt{${m}}`;
  if (den === 1) return { expr: `${sign}${exprBody}`, tex: `${sign}${texBody}`, value };
  return { expr: `${sign}${exprBody}/${den}`, tex: `${sign}\\frac{${texBody}}{${den}}`, value };
}

/** The exact value of a rational number. */
export function exactRational(r: Rational): Exact {
  const tex = r.den === 1n ? String(r.num) : `${r.num < 0n ? '-' : ''}\\frac{${r.num < 0n ? -r.num : r.num}}{${r.den}}`;
  return { expr: formatRational(r), tex, value: Number(r.num) / Number(r.den) };
}

/** The angles (in degrees) of the special table, in the first quadrant. */
export const FIRST_QUADRANT = [0, 30, 45, 60, 90] as const;

/** sin of 0, 30, 45, 60, 90 degrees: sqrt(k)/2 for k = 0, 1, 2, 3, 4, the pattern that makes the table easy to remember. */
function sinFirst(deg: number): Exact {
  const k = [0, 30, 45, 60, 90].indexOf(deg);
  if (k < 0) throw new Error(`sinFirst: ${deg} is not a special angle`);
  return surd(1, k, 2);
}

/** The reference angle in [0, 90] and the signs of sin and cos, for an angle that is a multiple of 15 degrees. */
function quadrant(deg: number): { ref: number; sinSign: number; cosSign: number } {
  const d = ((deg % 360) + 360) % 360;
  if (d <= 90) return { ref: d, sinSign: 1, cosSign: 1 };
  if (d <= 180) return { ref: 180 - d, sinSign: 1, cosSign: -1 };
  if (d <= 270) return { ref: d - 180, sinSign: -1, cosSign: -1 };
  return { ref: 360 - d, sinSign: -1, cosSign: 1 };
}

const neg = (e: Exact): Exact => (e.value === 0 ? e : { expr: e.expr.startsWith('-') ? e.expr.slice(1) : `-${e.expr}`, tex: e.tex.startsWith('-') ? e.tex.slice(1) : `-${e.tex}`, value: -e.value });

/** sin of a multiple of 30 or 45 degrees, exactly. */
export function sinDeg(deg: number): Exact {
  const { ref, sinSign } = quadrant(deg);
  const v = sinFirst(ref);
  return sinSign < 0 ? neg(v) : v;
}

/** cos of a multiple of 30 or 45 degrees, exactly: cos x = sin(90 - x) on the reference angle. */
export function cosDeg(deg: number): Exact {
  const { ref, cosSign } = quadrant(deg);
  const v = sinFirst(90 - ref);
  return cosSign < 0 ? neg(v) : v;
}

/** tan of a multiple of 30 or 45 degrees, exactly, or null where cos is 0. */
export function tanDeg(deg: number): Exact | null {
  const { ref, sinSign, cosSign } = quadrant(deg);
  if (ref === 90) return null;
  // tan of the reference angle: 0, 1/sqrt 3, 1, sqrt 3.
  const base: Exact = ref === 0 ? surd(0, 0) : ref === 30 ? surd(1, 3, 3) : ref === 45 ? surd(1, 1) : surd(1, 3);
  return sinSign * cosSign < 0 ? neg(base) : base;
}

/** Null when every tabled exact value agrees with Math.sin, Math.cos, and Math.tan, else the first that does not. */
export function exactValueError(): string | null {
  for (let deg = 0; deg < 360; deg += 15) {
    if (deg % 30 !== 0 && deg % 45 !== 0) continue;
    const r = (deg * Math.PI) / 180;
    if (Math.abs(sinDeg(deg).value - Math.sin(r)) > 1e-12) return `sin ${deg}`;
    if (Math.abs(cosDeg(deg).value - Math.cos(r)) > 1e-12) return `cos ${deg}`;
    const t = tanDeg(deg);
    if (t !== null && Math.abs(t.value - Math.tan(r)) > 1e-9) return `tan ${deg}`;
  }
  return null;
}

/** Pythagorean triples (a, b, c) with a^2 + b^2 = c^2, primitive, small. */
export const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41],
];

// ---------------------------------------------------------------- vectors

export type Vec = readonly number[];
export const dot = (a: Vec, b: Vec): number => a.reduce((s, x, i) => s + x * (b[i] as number), 0);
export const norm2 = (a: Vec): number => dot(a, a);
export const sub3 = (a: Vec, b: Vec): number[] => a.map((x, i) => x - (b[i] as number));
export const add3 = (a: Vec, b: Vec): number[] => a.map((x, i) => x + (b[i] as number));
export const scale3 = (k: number, a: Vec): number[] => a.map((x) => k * x);
export const cross = (a: Vec, b: Vec): number[] => {
  const [a1, a2, a3] = a as [number, number, number];
  const [b1, b2, b3] = b as [number, number, number];
  return [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
};
/** A column vector as LaTeX. */
export const colTex = (a: Vec): string => `\\begin{pmatrix} ${a.join(' \\\\ ')} \\end{pmatrix}`;
/** A point as LaTeX, (1, -2, 3). */
export const ptTex = (a: Vec): string => `(${a.join(', ')})`;

// ---------------------------------------------------------------- witness checks

const ratKey = (r: Rational): string => `${r.num}/${r.den}`;

/** Values as a sorted key, so a set of numbers compares in any order. */
export const valuesKey = (xs: readonly Rational[]): string => xs.map(ratKey).sort().join(',');

/** Points (pairs or triples of values, flattened) as a sorted key, so a set of points compares in any order. */
export function pointsKey(flat: readonly Rational[], dim: number): string {
  const pts: string[] = [];
  for (let i = 0; i + dim <= flat.length; i += dim) pts.push(flat.slice(i, i + dim).map(ratKey).join(';'));
  return pts.sort().join('|');
}

/** Rationals from numbers, for keys. */
export const rats = (xs: readonly number[]): Rational[] => xs.map((x) => q(x));

/** Numbers as a witness answer, "3, 4, -3, 4". */
export const listText = (xs: readonly (number | Rational)[]): string => xs.map((x) => (typeof x === 'number' ? String(x) : formatRational(x))).join(', ');
