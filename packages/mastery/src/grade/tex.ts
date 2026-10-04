/**
 * LaTeX for an expression tree, so the learner sees exactly how an answer was read (a
 * live preview under the answer box) and content can show computed expressions in the
 * same typography as hand-written mathematics.
 *
 * The output keeps the tree's structure: nothing is simplified or reordered. Division
 * becomes \frac (or a/b inside an exponent, where a stacked fraction is too small),
 * multiplication is shown by juxtaposition where that is unambiguous (2x, n(n - 1)) and
 * by \times where it is not (2 \times 3, 2 \times \frac{1}{2}), and parentheses appear
 * only where the tree needs them, as in formatExpression.
 *
 * Learner input reaches the output only as numbers, declared variable names, and the
 * fixed function and constant names, so the result is safe to hand to KaTeX.
 */
import type { BinOp, Expr } from './expr';

const PREC: Readonly<Record<BinOp, number>> = { '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 };
const NEG_PREC = 25;
const ATOM_PREC = 100;

function prec(e: Expr): number {
  if (e.kind === 'bin') return PREC[e.op];
  if (e.kind === 'neg') return NEG_PREC;
  return ATOM_PREC;
}

const GREEK: ReadonlySet<string> = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
  'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Sigma',
  'Phi', 'Psi', 'Omega',
]);

/** A number as LaTeX: 3, 0.375, or 1.5 \times 10^{-3} where JavaScript would print an exponent. */
export function texNumber(x: number): string {
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : x < 0 ? '-\\infty' : '\\text{NaN}';
  const s = String(x);
  const m = /^(-?[\d.]+)e([+-]\d+)$/.exec(s);
  if (m === null) return s;
  const exp = Number(m[2]);
  return `${m[1]} \\times 10^{${exp}}`;
}

/** A variable name: x, \lambda, x_{1}, or a multi-letter name upright as one symbol. */
function texName(name: string): string {
  if (GREEK.has(name)) return `\\${name}`;
  const sub = /^([A-Za-z]+)_?(\d+)$/.exec(name);
  if (sub !== null) return `${texName(sub[1] as string)}_{${sub[2]}}`;
  return name.replace(/_/g, '\\_');
}

const isFrac = (e: Expr): boolean => e.kind === 'bin' && e.op === '/';
const hasVariable = (e: Expr): boolean => {
  switch (e.kind) {
    case 'var': return true;
    case 'neg': return hasVariable(e.arg);
    case 'bin': return hasVariable(e.left) || hasVariable(e.right);
    case 'call': return e.args.some(hasVariable);
    default: return false;
  }
};

function parens(body: string): string {
  return body.includes('\\frac') ? `\\left(${body}\\right)` : `(${body})`;
}

/** Whether `right` can follow `left` with no sign, as in 2x or n(n - 1), without misreading. */
function juxtaposes(left: Expr, right: Expr, rightTex: string): boolean {
  // 2\frac{1}{2} reads as a mixed number, and 2 3 or 2 -3 as one number.
  if (isFrac(right) || /^[\d.\-]/.test(rightTex)) return false;
  if (left.kind === 'num' && right.kind === 'num') return false;
  // Plain arithmetic is shown with signs, except before pi and roots (2\pi, 3\sqrt{2}).
  if (!hasVariable(left) && !hasVariable(right)) return right.kind === 'const' || (right.kind === 'call' && right.fn === 'sqrt');
  return true;
}

function tex(e: Expr, inExponent: boolean): string {
  switch (e.kind) {
    case 'num': return texNumber(e.value);
    case 'var': return texName(e.name);
    case 'const': return e.name === 'pi' ? '\\pi' : 'e';
    case 'neg': {
      const inner = tex(e.arg, inExponent);
      const wrap = prec(e.arg) < NEG_PREC || e.arg.kind === 'neg' || (e.arg.kind === 'num' && e.arg.value < 0);
      return `-${wrap ? parens(inner) : inner}`;
    }
    case 'bin': {
      const l = tex(e.left, inExponent);
      const r = tex(e.right, inExponent);
      switch (e.op) {
        case '+':
        case '-': {
          const wrapR = prec(e.right) <= PREC[e.op] || e.right.kind === 'neg';
          return `${l} ${e.op} ${wrapR ? parens(r) : r}`;
        }
        case '*': {
          const wrapL = prec(e.left) < PREC['*'];
          // A product on the right only exists when the author bracketed it; keep the brackets.
          const wrapR = prec(e.right) < PREC['*'] || e.right.kind === 'neg' || (e.right.kind === 'bin' && e.right.op === '*');
          const L = wrapL ? parens(l) : l;
          const R = wrapR ? parens(r) : r;
          return juxtaposes(e.left, e.right, R) ? `${L} ${R}` : `${L} \\times ${R}`;
        }
        case '/': {
          // (-3)/8 is shown as -3/8 is written: the sign in front of the fraction.
          if (!inExponent) return e.left.kind === 'neg' ? `-\\frac{${tex(e.left.arg, false)}}{${r}}` : `\\frac{${l}}{${r}}`;
          const wrapL = prec(e.left) < PREC['/'];
          const wrapR = prec(e.right) <= PREC['/'];
          return `${wrapL ? parens(l) : l}/${wrapR ? parens(r) : r}`;
        }
        case '^': {
          const base = e.left;
          const plainBase = base.kind === 'var' || base.kind === 'const' || (base.kind === 'num' && base.value >= 0)
            || (base.kind === 'call' && base.fn !== 'factorial' && base.fn !== 'sqrt' && base.fn !== 'exp');
          return `${plainBase ? l : parens(l)}^{${tex(e.right, true)}}`;
        }
      }
      break;
    }
    case 'call': {
      const [a, b] = e.args as [Expr, Expr | undefined];
      const x = tex(a, inExponent);
      switch (e.fn) {
        case 'factorial': {
          const plainArg = a.kind === 'var' || (a.kind === 'num' && Number.isInteger(a.value) && a.value >= 0) || a.kind === 'call';
          return `${plainArg ? x : parens(x)}!`;
        }
        case 'sqrt': return `\\sqrt{${x}}`;
        case 'abs': return `\\left|${x}\\right|`;
        case 'exp': return `e^{${tex(a, true)}}`;
        case 'ln': return `\\ln\\left(${x}\\right)`;
        case 'choose': return `\\binom{${x}}{${b === undefined ? '' : tex(b, inExponent)}}`;
      }
    }
  }
  return '';
}

/** LaTeX for an expression, for KaTeX. */
export function texOfExpression(e: Expr): string {
  return tex(e, false);
}
