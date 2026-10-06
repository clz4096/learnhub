/**
 * A small model of OCaml's core, for the functional programming topics' reference solvers:
 * a syntax tree for the expressions the problems use, its OCaml source, and Hindley-Milner
 * type inference by unification (CS3110 Sections 10.5 and 10.6), so a problem's stated type
 * is checked against an inferred one. Types print as the toplevel prints them, with type
 * variables named 'a, 'b, ... in order of appearance.
 */

export type Ty =
  | { k: 'int' }
  | { k: 'bool' }
  | { k: 'string' }
  | { k: 'list'; t: Ty }
  | { k: 'tuple'; ts: readonly Ty[] }
  | { k: 'arrow'; a: Ty; b: Ty }
  | { k: 'var'; id: number };

export type Ex =
  | { k: 'int'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'str'; v: string }
  | { k: 'var'; name: string }
  | { k: 'list'; items: readonly Ex[] }
  | { k: 'cons'; h: Ex; t: Ex }
  | { k: 'tuple'; items: readonly Ex[] }
  | { k: 'if'; c: Ex; t: Ex; e: Ex }
  | { k: 'bin'; op: '+' | '-' | '*' | '=' | '<' | '>' | '^' | '@'; l: Ex; r: Ex }
  | { k: 'app'; f: Ex; args: readonly Ex[] }
  /** match s with [] -> nil | h :: t -> cons, with "_" for an unused name. */
  | { k: 'matchList'; s: Ex; nil: Ex; h: string; t: string; cons: Ex };

/** A declaration let [rec] name params = body. */
export interface Decl { name: string; rec?: boolean; params: readonly string[]; body: Ex }

export const ex = {
  int: (v: number): Ex => ({ k: 'int', v }),
  bool: (v: boolean): Ex => ({ k: 'bool', v }),
  str: (v: string): Ex => ({ k: 'str', v }),
  v: (name: string): Ex => ({ k: 'var', name }),
  list: (...items: Ex[]): Ex => ({ k: 'list', items }),
  cons: (h: Ex, t: Ex): Ex => ({ k: 'cons', h, t }),
  tuple: (...items: Ex[]): Ex => ({ k: 'tuple', items }),
  if: (c: Ex, t: Ex, e: Ex): Ex => ({ k: 'if', c, t, e }),
  bin: (op: '+' | '-' | '*' | '=' | '<' | '>' | '^' | '@', l: Ex, r: Ex): Ex => ({ k: 'bin', op, l, r }),
  app: (f: Ex, ...args: Ex[]): Ex => ({ k: 'app', f, args }),
  matchList: (s: Ex, nil: Ex, h: string, t: string, cons: Ex): Ex => ({ k: 'matchList', s, nil, h, t, cons }),
};

// ---------------------------------------------------------------- source

const atomic = (e: Ex): boolean => ['int', 'bool', 'str', 'var', 'list', 'tuple'].includes(e.k) && !(e.k === 'int' && e.v < 0);

/** OCaml source for an expression. */
export function source(e: Ex): string {
  const sub = (x: Ex): string => (atomic(x) ? source(x) : `(${source(x)})`);
  switch (e.k) {
    case 'int': return String(e.v);
    case 'bool': return String(e.v);
    case 'str': return JSON.stringify(e.v);
    case 'var': return e.name;
    case 'list': return `[${e.items.map(source).join('; ')}]`;
    case 'cons': return `${sub(e.h)} :: ${e.t.k === 'cons' ? source(e.t) : sub(e.t)}`;
    case 'tuple': return `(${e.items.map(source).join(', ')})`;
    case 'if': return `if ${source(e.c)} then ${source(e.t)} else ${source(e.e)}`;
    case 'bin': return `${sub(e.l)} ${e.op} ${sub(e.r)}`;
    case 'app': return [sub(e.f), ...e.args.map(sub)].join(' ');
    case 'matchList': return `match ${source(e.s)} with [] -> ${source(e.nil)} | ${e.h} :: ${e.t} -> ${source(e.cons)}`;
  }
}

/** OCaml source for a declaration. */
export function declSource(d: Decl): string {
  return `let ${d.rec === true ? 'rec ' : ''}${[d.name, ...d.params].join(' ')} = ${source(d.body)}`;
}

// ---------------------------------------------------------------- inference

export class TypeError_ extends Error {}

class Infer {
  private next = 0;
  private subst = new Map<number, Ty>();
  fresh(): Ty { return { k: 'var', id: this.next++ }; }
  prune(t: Ty): Ty {
    if (t.k === 'var') {
      const s = this.subst.get(t.id);
      if (s !== undefined) {
        const r = this.prune(s);
        this.subst.set(t.id, r);
        return r;
      }
    }
    return t;
  }
  occurs(id: number, t: Ty): boolean {
    const p = this.prune(t);
    switch (p.k) {
      case 'var': return p.id === id;
      case 'list': return this.occurs(id, p.t);
      case 'tuple': return p.ts.some((x) => this.occurs(id, x));
      case 'arrow': return this.occurs(id, p.a) || this.occurs(id, p.b);
      default: return false;
    }
  }
  unify(a: Ty, b: Ty): void {
    const [x, y] = [this.prune(a), this.prune(b)];
    if (x.k === 'var') {
      if (y.k === 'var' && y.id === x.id) return;
      if (this.occurs(x.id, y)) throw new TypeError_('occurs check');
      this.subst.set(x.id, y);
      return;
    }
    if (y.k === 'var') return this.unify(y, x);
    if (x.k !== y.k) throw new TypeError_(`${x.k} against ${y.k}`);
    if (x.k === 'list' && y.k === 'list') return this.unify(x.t, y.t);
    if (x.k === 'arrow' && y.k === 'arrow') { this.unify(x.a, y.a); return this.unify(x.b, y.b); }
    if (x.k === 'tuple' && y.k === 'tuple') {
      if (x.ts.length !== y.ts.length) throw new TypeError_('tuple sizes');
      x.ts.forEach((t, i) => this.unify(t, y.ts[i] as Ty));
    }
  }
  /** A fresh copy of a scheme: its type variables replaced by new ones. */
  instantiate(t: Ty): Ty {
    const map = new Map<number, Ty>();
    const go = (u: Ty): Ty => {
      const p = this.prune(u);
      switch (p.k) {
        case 'var': { const m = map.get(p.id) ?? this.fresh(); map.set(p.id, m); return m; }
        case 'list': return { k: 'list', t: go(p.t) };
        case 'tuple': return { k: 'tuple', ts: p.ts.map(go) };
        case 'arrow': return { k: 'arrow', a: go(p.a), b: go(p.b) };
        default: return p;
      }
    };
    return go(t);
  }
  infer(e: Ex, env: ReadonlyMap<string, { t: Ty; poly: boolean }>): Ty {
    switch (e.k) {
      case 'int': return { k: 'int' };
      case 'bool': return { k: 'bool' };
      case 'str': return { k: 'string' };
      case 'var': {
        const b = env.get(e.name);
        if (b === undefined) throw new TypeError_(`unbound ${e.name}`);
        return b.poly ? this.instantiate(b.t) : b.t;
      }
      case 'list': {
        const a = this.fresh();
        for (const it of e.items) this.unify(a, this.infer(it, env));
        return { k: 'list', t: a };
      }
      case 'cons': {
        const h = this.infer(e.h, env);
        const t = this.infer(e.t, env);
        this.unify(t, { k: 'list', t: h });
        return t;
      }
      case 'tuple': return { k: 'tuple', ts: e.items.map((x) => this.infer(x, env)) };
      case 'if': {
        this.unify(this.infer(e.c, env), { k: 'bool' });
        const a = this.infer(e.t, env);
        this.unify(a, this.infer(e.e, env));
        return a;
      }
      case 'bin': {
        const [l, r] = [this.infer(e.l, env), this.infer(e.r, env)];
        if (e.op === '+' || e.op === '-' || e.op === '*') { this.unify(l, { k: 'int' }); this.unify(r, { k: 'int' }); return { k: 'int' }; }
        if (e.op === '^') { this.unify(l, { k: 'string' }); this.unify(r, { k: 'string' }); return { k: 'string' }; }
        if (e.op === '@') { const a: Ty = { k: 'list', t: this.fresh() }; this.unify(l, a); this.unify(r, a); return a; }
        this.unify(l, r);
        return { k: 'bool' };
      }
      case 'app': {
        let f = this.infer(e.f, env);
        for (const arg of e.args) {
          const res = this.fresh();
          this.unify(f, { k: 'arrow', a: this.infer(arg, env), b: res });
          f = res;
        }
        return f;
      }
      case 'matchList': {
        const s = this.infer(e.s, env);
        const a = this.fresh();
        this.unify(s, { k: 'list', t: a });
        const r = this.infer(e.nil, env);
        const inner = new Map(env);
        if (e.h !== '_') inner.set(e.h, { t: a, poly: false });
        if (e.t !== '_') inner.set(e.t, { t: { k: 'list', t: a }, poly: false });
        this.unify(r, this.infer(e.cons, inner));
        return r;
      }
    }
  }
  resolve(t: Ty): Ty {
    const p = this.prune(t);
    switch (p.k) {
      case 'list': return { k: 'list', t: this.resolve(p.t) };
      case 'tuple': return { k: 'tuple', ts: p.ts.map((x) => this.resolve(x)) };
      case 'arrow': return { k: 'arrow', a: this.resolve(p.a), b: this.resolve(p.b) };
      default: return p;
    }
  }
}

/** Polymorphic bindings in scope, such as ('push', "'a -> 'a list -> 'a list"), given as types. */
export type Scope = readonly (readonly [string, Ty])[];

function envOf(scope: Scope): Map<string, { t: Ty; poly: boolean }> {
  return new Map(scope.map(([n, t]) => [n, { t, poly: true }] as const));
}

/** The type OCaml infers for an expression, printed; null for a type error. */
export function typeOfExpr(e: Ex, scope: Scope = []): string | null {
  const inf = new Infer();
  try {
    return showTy(inf.resolve(inf.infer(e, envOf(scope))));
  } catch (err) {
    if (err instanceof TypeError_) return null;
    throw err;
  }
}

/** The type OCaml infers for a declaration's name, printed; null for a type error. */
export function typeOfDecl(d: Decl, scope: Scope = []): string | null {
  const inf = new Infer();
  try {
    const env = envOf(scope);
    const params = d.params.map(() => inf.fresh());
    const res = inf.fresh();
    const fnTy = params.reduceRight<Ty>((acc, p) => ({ k: 'arrow', a: p, b: acc }), res);
    if (d.rec === true) env.set(d.name, { t: fnTy, poly: false });
    d.params.forEach((p, i) => env.set(p, { t: params[i] as Ty, poly: false }));
    inf.unify(res, inf.infer(d.body, env));
    return showTy(inf.resolve(fnTy));
  } catch (err) {
    if (err instanceof TypeError_) return null;
    throw err;
  }
}

/** A type as the toplevel prints it, with variables named in order of appearance. */
export function showTy(t: Ty): string {
  const names = new Map<number, string>();
  const go = (u: Ty, ctx: 'top' | 'arg' | 'elem'): string => {
    switch (u.k) {
      case 'int': case 'bool': case 'string': return u.k;
      case 'var': {
        if (!names.has(u.id)) names.set(u.id, `'${String.fromCharCode(97 + names.size)}`);
        return names.get(u.id) as string;
      }
      case 'list': return `${go(u.t, 'elem')} list`;
      case 'tuple': { const s = u.ts.map((x) => go(x, 'elem')).join(' * '); return ctx === 'elem' ? `(${s})` : s; }
      case 'arrow': { const s = `${go(u.a, 'arg')} -> ${go(u.b, 'top')}`; return ctx === 'top' ? s : `(${s})`; }
    }
  };
  return go(t, 'top');
}

/** Parse a printed type back, for scopes: "'a -> 'a list -> 'a list". Supports int, bool, string, 'x, list, *, ->, brackets. */
export function parseTy(s: string): Ty {
  const toks = s.match(/'[a-z]|->|\*|\(|\)|[a-z]+/g) ?? [];
  let i = 0;
  const vars = new Map<string, Ty>();
  let nextId = 1000;
  const atom = (): Ty => {
    const tk = toks[i++] as string;
    let t: Ty;
    if (tk === '(') { t = arrow(); i++; } else if (tk.startsWith("'")) {
      if (!vars.has(tk)) vars.set(tk, { k: 'var', id: nextId++ });
      t = vars.get(tk) as Ty;
    } else t = { k: tk as 'int' | 'bool' | 'string' };
    while (toks[i] === 'list') { i++; t = { k: 'list', t }; }
    return t;
  };
  const tuple = (): Ty => {
    const ts = [atom()];
    while (toks[i] === '*') { i++; ts.push(atom()); }
    return ts.length === 1 ? (ts[0] as Ty) : { k: 'tuple', ts };
  };
  const arrow = (): Ty => {
    const a = tuple();
    if (toks[i] === '->') { i++; return { k: 'arrow', a, b: arrow() }; }
    return a;
  };
  return arrow();
}
