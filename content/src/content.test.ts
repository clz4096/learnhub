/// <reference types="node" />
/**
 * Content checks, run in CI. They are the course's version of the cache simulator's
 * checked-claim lessons: every number shown to the learner comes from code, every
 * generator's reference answer is accepted by its grader, every known misconception is
 * rejected, and every probability is checked exactly and by simulation.
 */
import { readFileSync, readdirSync } from 'node:fs';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { courseById, courseTargets, coursesClosure, topics } from '@learnhub/graph';
import { mulberry32, planSession, placementGraph, recordLesson, recordReview, runPlacement, DAY_MS, type MemoryMap } from '@learnhub/mastery';
import { GLOSSARY, glossaryEntry, searchGlossary } from './glossary';
import { q, toFloat } from './math';
import { answerText, grade, readAnswer, sameAnswer, type Instance } from './problem';
import { computedMath, dmath, exprTex, ident, markedTerms, math, plain, setOf, t, texToPlain, type Rich, type Span } from './rich';
import { TOPIC_CONTENT } from './topics';
import type { Block, TopicContent } from './topic';
import { contentFor } from './index';

const SEEDS = 1000;
const DIGIT = /[0-9]/;
const DASH = /[–—]/;
/**
 * Mathematics left in plain text: relation and operator signs, set and logic symbols, a
 * lone +, -, or / between words or numbers, and a factorial. All of it belongs in LaTeX.
 */
const MATH_IN_TEXT = /[=<>^*≤≥≠∈∉∪∩∧∨¬⇒⇔ξ∅÷×√π±]|(?:^|\s)[+\-/](?:\s|$)|[A-Za-z0-9]!/;
const graphIds = new Set(topics.map((t) => t.id));

/** LaTeX already rendered without error, so 1,000 seeds of repeated fragments stay fast. */
const goodTex = new Set<string>();

/** Every math span parses and renders with KaTeX, strictly: an error is a content bug. */
function checkTex(r: Rich, where: string): void {
  for (const s of r as readonly Span[]) {
    if (s.kind !== 'math') continue;
    const key = `${s.display === true ? 'D' : 'I'}${s.text}`;
    if (goodTex.has(key)) continue;
    let error: string | null = null;
    try {
      katex.renderToString(s.text, { throwOnError: true, strict: 'error', displayMode: s.display === true });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    expect(error, `${where}: KaTeX cannot render "${s.text}"`).toBeNull();
    goodTex.add(key);
  }
}

function blockRich(b: Block): Rich[] {
  switch (b.kind) {
    case 'p':
    case 'rule': return [b.text];
    case 'list': return [...b.items];
    case 'table': return [b.caption, ...b.head, ...b.rows.flat()];
    case 'venn': return [b.caption, b.onlyA, b.both, b.onlyB, b.neither, [{ kind: 'text', text: `${b.a} ${b.b}`, typed: [b.a, b.b] }]];
  }
}

function instanceRich(inst: Instance): Rich[] {
  const p = inst.problem;
  return [
    p.prompt, ...p.solution, ...inst.misconceptions.map((m) => m.why),
    ...(p.answer.kind === 'choice' ? p.answer.options.map((o) => o.label) : []),
  ];
}

function topicRich(c: TopicContent): Rich[] {
  return [
    c.goal,
    ...c.lesson.flatMap(blockRich),
    ...c.examples.flatMap((e) => [e.title, e.prompt, ...e.steps, e.answer]),
  ];
}

/** Problems: the typed parts have no digit, no text has a dash, identities hold, terms exist. */
function checkRich(r: Rich, where: string): void {
  for (const s of r as readonly Span[]) {
    for (const typed of s.typed) expect(DIGIT.test(typed), `${where}: typed digit in "${typed}" (interpolate a computed value instead)`).toBe(false);
    expect(DASH.test(s.text), `${where}: em or en dash in "${s.text}"`).toBe(false);
    if (s.kind === 'text') expect(MATH_IN_TEXT.exec(s.text)?.[0], `${where}: mathematics in plain text "${s.text}" (write it with math)`).toBeUndefined();
    if (s.check) expect(s.check(), `${where}: identity`).toBeNull();
  }
  for (const id of markedTerms(r)) expect(glossaryEntry(id), `${where}: unknown glossary term "${id}"`).toBeDefined();
  checkTex(r, where);
}

describe('content topics', () => {
  it('are ten topics, each in the graph, each once', () => {
    const ids = TOPIC_CONTENT.map((c) => c.topicId);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(graphIds.has(id), id).toBe(true);
    for (const id of ids) expect(contentFor(id)?.topicId).toBe(id);
    expect(contentFor('num.gcd')).toBeUndefined();
  });

  it('are the first ten new lessons the engine schedules for a learner who knows nothing, taking both courses evenly', () => {
    const courses = ['ia-probability', 'cst-discrete-maths'].map((id) => ({ id, targets: courseTargets(topics, courseById(id)) }));
    const g = placementGraph(topics, { targets: courses.flatMap((c) => c.targets) });
    const placed = runPlacement(g, () => false, 0).result;
    expect(placed.mastered).toEqual([]);
    // Every task passed, as the app would record it: lessons, reviews, and quizzes.
    let memory: MemoryMap = {};
    const spent: Record<string, number> = {};
    let learnedSinceQuiz: string[] = [];
    const seen: string[] = [];
    for (let day = 0; seen.length < 10 && day < 10; day++) {
      const now = day * DAY_MS;
      const plan = planSession({ topics, courses, courseMinutes: spent, memory, now, learnedSinceQuiz });
      for (const task of plan.tasks) {
        if (task.kind === 'lesson') {
          memory = recordLesson(memory, topics, task.topicId, now).memory;
          learnedSinceQuiz.push(task.topicId);
          if (!seen.includes(task.topicId)) seen.push(task.topicId);
        } else if (task.kind === 'review') {
          memory = recordReview(memory, topics, task.topicId, true, now).memory;
        } else {
          for (const id of task.topicIds) memory = recordReview(memory, topics, id, true, now).memory;
          learnedSinceQuiz = [];
        }
      }
      for (const [k, v] of Object.entries(plan.courseMinutes ?? {})) spent[k] = (spent[k] ?? 0) + v;
    }
    expect(seen.slice(0, 10)).toEqual(TOPIC_CONTENT.map((c) => c.topicId));
  });

  it('are all in the closure of the two courses', () => {
    const closure = coursesClosure(topics, [courseById('ia-probability'), courseById('cst-discrete-maths')]);
    for (const c of TOPIC_CONTENT) expect(closure.has(c.topicId), c.topicId).toBe(true);
  });

  for (const c of TOPIC_CONTENT) {
    describe(c.topicId, () => {
      it('has a lesson, at least two worked examples, at least three generators, a mastery rule, and glossary terms', () => {
        expect(c.lesson.length).toBeGreaterThanOrEqual(3);
        expect(c.examples.length).toBeGreaterThanOrEqual(2);
        expect(c.generators.length).toBeGreaterThanOrEqual(3);
        expect(new Set(c.generators.map((g) => g.id)).size).toBe(c.generators.length);
        expect(c.mastery.correctInARow).toBeGreaterThanOrEqual(2);
        expect(c.mastery.maxProblems).toBeGreaterThan(c.mastery.correctInARow);
        expect(c.terms.length).toBeGreaterThan(0);
        for (const id of c.terms) expect(glossaryEntry(id)?.topic, id).toBe(c.topicId);
      });

      it('states only computed numbers, with no dashes, and marks only glossary terms', () => {
        topicRich(c).forEach((r, i) => checkRich(r, `${c.topicId} text ${i}`));
      });

      it('introduces every term it lists in its lesson', () => {
        const marked = new Set(c.lesson.flatMap(blockRich).flatMap(markedTerms));
        for (const id of c.terms) expect(marked.has(id), `${id} is not marked in the lesson`).toBe(true);
      });

      it('worked examples are graded like problems: sane, and the reference answer is accepted', () => {
        for (const e of c.examples) {
          expect(e.instance.saneError).toBeNull();
          expect(grade(e.instance.problem, e.instance.reference).correct, plain(e.prompt)).toBe(true);
        }
      });

      for (const g of c.generators) {
        it(`generator ${g.id}: ${SEEDS} seeds, sane, solver accepted, at least two misconceptions all rejected`, () => {
          for (let seed = 1; seed <= SEEDS; seed++) {
            const inst = g.instance(seed);
            const where = `${c.topicId}/${g.id} seed ${seed}`;
            expect(inst.saneError, where).toBeNull();
            const ok = grade(inst.problem, inst.reference);
            expect(ok.correct, `${where}: reference ${JSON.stringify(inst.reference)} for "${plain(inst.problem.prompt)}": ${ok.feedback}`).toBe(true);
            expect(inst.misconceptions.length, `${where}: misconceptions`).toBeGreaterThanOrEqual(2);
            for (const m of inst.misconceptions) {
              const r = grade(inst.problem, m.response, inst.misconceptions);
              expect(r.correct, `${where}: misconception ${JSON.stringify(m.response)} accepted`).toBe(false);
              // The learner who makes the slip is told about it.
              expect(r.misconception ?? r.feedback, where).toBeDefined();
            }
            if (seed <= 50) instanceRich(inst).forEach((r, i) => checkRich(r, `${where} text ${i}`));
            // Every seed: all of its mathematics, and the answer as shown after a miss, renders.
            [...instanceRich(inst), answerText(inst.problem.answer)].forEach((r, i) => checkTex(r, `${where} text ${i}`));
            // The reference answer, typed into the answer box, has a preview that renders.
            if (typeof inst.reference === 'string') {
              const read = readAnswer(inst.problem.answer, inst.reference);
              expect(read, `${where}: no preview for the reference ${inst.reference}`).not.toBeNull();
              checkTex([{ kind: 'math', text: read?.tex ?? '', typed: [] }], `${where} preview`);
              expect(read?.note, `${where}: the reference answer is read with a note`).toBeUndefined();
            }
          }
        }, 60_000); // 1,000 seeds with grading and KaTeX checks; slow runners and a busy machine need headroom

        it(`generator ${g.id}: deterministic for a seed, and varied across seeds`, () => {
          const a = g.instance(7);
          const b = g.instance(7);
          expect(plain(a.problem.prompt)).toBe(plain(b.problem.prompt));
          const prompts = new Set(Array.from({ length: 50 }, (_, i) => plain(g.instance(i + 1).problem.prompt)));
          expect(prompts.size).toBeGreaterThan(5);
        });
      }
    });
  }
});

describe('probability claims', () => {
  const N = 20_000;
  /** Within 4.5 standard errors, plus one count for the discreteness. */
  const close = (hits: number, p: number): boolean => Math.abs(hits / N - p) <= 4.5 * Math.sqrt((p * (1 - p)) / N) + 1 / N;

  it('every generator with an experiment: the exact answer agrees with a simulation of it', () => {
    let checked = 0;
    for (const c of TOPIC_CONTENT) {
      for (const g of c.generators) {
        for (let seed = 1; seed <= 40; seed++) {
          const inst = g.instance(seed);
          if (inst.trial === undefined) continue;
          expect(inst.problem.answer.kind).toBe('exact');
          if (inst.problem.answer.kind !== 'exact') continue;
          // Exact: the brute-force solver and the closed form agree.
          expect(sameAnswer(inst.problem.answer, inst.reference, inst.problem.answer.expected)).toBe(true);
          const [n, d = '1'] = inst.problem.answer.expected.split('/');
          const p = Number(n) / Number(d);
          const rng = mulberry32(seed * 7919);
          let hits = 0;
          for (let i = 0; i < N; i++) if (inst.trial(rng)) hits++;
          expect(close(hits, p), `${c.topicId}/${g.id} seed ${seed}: ${hits}/${N} against ${p}`).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(100);
  });

  it('every probability a lesson states agrees with a simulation', () => {
    const claims = TOPIC_CONTENT.flatMap((c) => c.claims ?? []);
    expect(claims.length).toBeGreaterThan(0);
    claims.forEach((cl, i) => {
      const rng = mulberry32(1000 + i);
      let hits = 0;
      for (let k = 0; k < N; k++) if (cl.trial(rng)) hits++;
      expect(close(hits, toFloat(cl.exact)), `${cl.what}: ${hits}/${N}`).toBe(true);
    });
  });
});

describe('glossary', () => {
  it('has unique ids, and every entry is checked like lesson text', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length);
    for (const e of GLOSSARY) {
      checkRich(e.definition, `glossary ${e.id} definition`);
      checkRich(e.example, `glossary ${e.id} example`);
      expect(DASH.test(e.term), e.id).toBe(false);
      expect(contentFor(e.topic), `${e.id} names topic ${e.topic}`).toBeDefined();
    }
  });

  it('defines every term a topic lists, and nothing no topic lists', () => {
    const listed = new Set(TOPIC_CONTENT.flatMap((c) => c.terms));
    expect(new Set(GLOSSARY.map((e) => e.id))).toEqual(listed);
  });

  it('searches by name, alias, and definition', () => {
    expect(searchGlossary('').length).toBe(GLOSSARY.length);
    expect(searchGlossary('exponent')[0]?.id).toBe('index');
    expect(searchGlossary('nth term')[0]?.id).toBe('position-to-term');
    expect(searchGlossary('zzzz')).toEqual([]);
  });
});

describe('LaTeX in content', () => {
  it('a digit typed into LaTeX is still a typed digit, and is rejected', () => {
    const typedDigit = (sp: Span): boolean => sp.typed.some((x) => DIGIT.test(x));
    expect(typedDigit(math`x^2`)).toBe(true);
    expect(typedDigit(math`\frac{1}{${2}}`)).toBe(true);
    expect(typedDigit(dmath`\sqrt[3]{${8}}`)).toBe(true);
    expect(typedDigit(math`x^{${2}}`)).toBe(false);
    expect(typedDigit(math`\frac{${1}}{${2}}`)).toBe(false);
    // Text interpolated into math keeps its typed parts, so a digit cannot hide in it.
    expect(typedDigit(math`${t`page 3`} + x`)).toBe(true);
    expect(() => checkRich([math`x^2`], 'probe')).toThrow(/typed digit/);
  });

  it('math is LaTeX from the raw template: backslashes need no escaping', () => {
    expect(math`\frac{${3}}{${8}} \times ${q(1, 2)}`.text).toBe('\\frac{3}{8} \\times \\frac{1}{2}');
    expect(math`${-3} + ${12345}`.text).toBe('-3 + 12{,}345');
    expect(setOf([1, 2, '...', 9]).text).toBe('\\{1, 2, \\ldots, 9\\}');
    expect(math`${t`not red`}`.text).toBe('\\text{not red}');
    expect(dmath`x`.display).toBe(true);
  });

  it('computed expressions and identities are LaTeX, and identities stay checked inside math', () => {
    expect(computedMath('2x^2 - 5x + 6').text).toBe('2 x^{2} - 5 x + 6');
    expect(exprTex('3 * (-8) = -24')).toBe('3 \\times (-8) = -24');
    expect(exprTex('(x + 2)(x + 3)')).toBe('(x + 2) (x + 3)');
    expect(ident('0!', '1').text).toBe('0! = 1');
    const wrong = math`${ident('2^3', '9')}`;
    expect(wrong.check?.()).toMatch(/does not hold/);
    expect(() => exprTex('x +')).toThrow(/cannot read/);
  });

  it('plain text of LaTeX reads naturally, for labels and tests', () => {
    expect(texToPlain('\\frac{3}{8} \\times 2^{5}')).toBe('3/8 × 2^5');
    expect(texToPlain('\\{x \\in A \\mid x > 2\\}')).toBe('{x ∈ A | x > 2}');
    expect(plain(t`so ${math`P(\text{red})`} is`)).toBe('so P(red) is');
  });

  it('the graph summaries: every $...$ fragment renders with KaTeX', () => {
    let fragments = 0;
    for (const tp of topics) {
      const parts = tp.summary.split('$');
      expect(parts.length % 2, `${tp.id}: unbalanced $ in the summary`).toBe(1);
      parts.forEach((p, i) => {
        if (i % 2 === 1) {
          checkTex([{ kind: 'math', text: p, typed: [] }], `${tp.id} summary`);
          fragments++;
        } else {
          expect(MATH_IN_TEXT.exec(p)?.[0], `${tp.id} summary: mathematics outside $...$ in "${p}"`).toBeUndefined();
        }
      });
    }
    expect(fragments).toBeGreaterThan(20);
  });
});

describe('source rules', () => {
  // `computed` and `computedMath` bypass the typed-digit check, so they must never wrap a literal with a digit in it.
  it('no computed() wrapper is given a hand-typed number', () => {
    const dir = new URL('./', import.meta.url);
    const files = ['glossary.ts', ...readdirSync(new URL('./topics/', dir)).map((f) => `topics/${f}`)];
    const quoted = /\b(?:computed|computedMath|cm)\(\s*(['"])[^'"]*\d[^'"]*\1/;
    for (const f of files) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      expect(quoted.exec(src)?.[0], f).toBeUndefined();
      for (const lit of wrappedTemplates(src)) expect(DIGIT.test(lit), `${f}: typed digit in a wrapped template: ${lit}`).toBe(false);
    }
  });

  it('the scanner finds typed digits in wrapped templates and skips interpolations', () => {
    expect(wrappedTemplates('cm(`(x + ${a})`) + cm(`x${f({ b: 1 })}y`)')).toEqual(['(x + )', 'xy']);
    expect(wrappedTemplates('computed(`n ${2}`)').some((l) => DIGIT.test(l))).toBe(false);
    expect(wrappedTemplates('computedMath(`x^2`)').some((l) => DIGIT.test(l))).toBe(true);
  });
});

/** The literal text of each template passed straight to a computed wrapper, interpolations removed. */
function wrappedTemplates(src: string): string[] {
  const out: string[] = [];
  const start = /\b(?:computed|computedMath|cm)\(\s*`/g;
  for (const m of src.matchAll(start)) {
    let i = (m.index ?? 0) + m[0].length;
    let lit = '';
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '$' && src[i + 1] === '{') {
        // Skip the interpolation, counting braces; nested templates inside it are code.
        let depth = 1;
        i += 2;
        while (i < src.length && depth > 0) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          i++;
        }
        continue;
      }
      lit += src[i];
      i++;
    }
    out.push(lit);
  }
  return out;
}
