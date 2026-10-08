/**
 * The Cambridge Entry campaign (mastery/DESIGN-ADMISSIONS.md): the state, the five acts and
 * their completion rules, the scoring of timed papers, the stats and their effects, the
 * offer conditions, and the letters. Pure: no clock, storage, or app state.
 *
 * The paper registry is ~120 KB of JSON, so it stays out of the main bundle: this module
 * imports only its types, and callers pass the loaded module (`Admissions`) in.
 *
 * Completion never blocks study: any paper can be sat at any time, and a later act's papers
 * count when sat early. Acts open in order: an act is complete only when its own
 * requirements are met and every act before it is complete.
 */
import type * as AdmissionsModule from '@learnhub/content/admissions';
import type { RegistryPaper, StepGrade, StepPaper } from '@learnhub/content/admissions';

export type Admissions = typeof AdmissionsModule;

export type CampaignRoute = 'maths' | 'cs';
export type CollegeId = 'st-edmunds' | 'wolfson' | 'hughes-hall';
export type Subject = 'maths' | 'further-maths' | 'cs';
export type TmuaSitting = 'october' | 'january';
/** The guide's two mock interviews: a 4-part problem with pre-reading, and three questions needing induction. */
export type InterviewShape = 'pre-reading' | 'induction';
export type LetterId = 'received' | 'invitation' | 'offer' | 'results';
export type ALevelGrade = 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'U';

/**
 * What the app predicted before a timed sitting or ladder rung began (rule 8, readinessBar.ts).
 * Recorded at the start and never changed, so the real mark can be set against it later.
 */
export interface Forecast {
  /** The predicted share of the marks, 0 to 1. */
  predicted: number;
  /** `outcome`: the outcome model's mean of timed results on this paper; `mastery`: with none, the share of the exam's syllabus mastered. */
  from: 'outcome' | 'mastery';
  /** The share of the exam's syllabus topics mastered at the start, 0 to 1. */
  mastered: number;
}

const isShare = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

/** A stored forecast, or undefined when it is missing or malformed. */
export function parseForecast(v: unknown): Forecast | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  if (!isShare(o.predicted) || !isShare(o.mastered) || (o.from !== 'outcome' && o.from !== 'mastery')) return undefined;
  return { predicted: o.predicted, from: o.from, mastered: o.mastered };
}

/** One timed sitting of a registry paper. Marks are absent until entered. */
export interface Sitting {
  id: string;
  paperId: string;
  /** The act that was open when the sitting started (6 after matriculation). */
  act: number;
  startedAt: number;
  finishedAt: number | null;
  /** TMUA: the 20 letters given, null for unanswered. */
  answers?: (string | null)[];
  /** STEP: each question's mark out of 20 from supervision, null for not attempted. */
  questionMarks?: (number | null)[];
  /** A level: the paper's total from supervision. */
  total?: number;
  /** The app's prediction at the start (rule 8); absent for a sitting begun before it was recorded. */
  forecast?: Forecast;
}

export interface InterviewRecord {
  id: string;
  shape: InterviewShape;
  college: CollegeId | null;
  copiedAt: number;
  /** Out of 20; null until recorded. */
  mark: number | null;
  notes: string;
}

export interface Campaign {
  startedAt: number;
  route: CampaignRoute;
  college: CollegeId | null;
  aLevelOrder: Subject[];
  tmuaSitting: TmuaSitting;
  sittings: Sitting[];
  interviews: InterviewRecord[];
  applicationFiledAt: number | null;
  letters: { id: LetterId; at: number }[];
}

export const ROUTE_NAMES: Readonly<Record<CampaignRoute, string>> = { maths: 'Mathematics', cs: 'Computer Science' };
export const SUBJECT_NAMES: Readonly<Record<Subject, string>> = {
  maths: 'A level Mathematics',
  'further-maths': 'A level Further Mathematics',
  cs: 'A level Computer Science',
};
export const DEFAULT_ORDER: readonly Subject[] = ['maths', 'further-maths', 'cs'];
export const SHAPE_NAMES: Readonly<Record<InterviewShape, string>> = {
  'pre-reading': 'A 4-part problem with pre-reading, about 40 minutes',
  induction: 'Three questions needing induction, about 35 minutes',
};
export const STEP_MARKS_PER_QUESTION = 20;
export const STEP_QUESTIONS = 12;
export const STEP_COUNTED = 6;
export const TMUA_QUESTIONS = 20;
export const TMUA_OPTIONS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const INTERVIEW_MAX = 20;
/** The supervision pass mark, as for every supervision in the app. */
export const INTERVIEW_PASS = 14;

export function newCampaign(route: CampaignRoute, now: number): Campaign {
  return {
    startedAt: now, route, college: null, aLevelOrder: [...DEFAULT_ORDER], tmuaSitting: 'january',
    sittings: [], interviews: [], applicationFiledAt: null, letters: [],
  };
}

// ---------------------------------------------------------------- colleges

export interface CollegeFormat {
  interviews: string;
  test: string;
  offer: string;
  source: string;
  verified: boolean;
}

export interface College {
  id: CollegeId;
  name: string;
  formats: Readonly<Record<CampaignRoute, CollegeFormat>>;
}

/** Applies to all three colleges. */
export const COLLEGE_COMMON = 'All three interview online by Zoom and require the TMUA in both rounds (January round: register by 21 December).';

/** "College interview formats (verified 2026-10-05, 2027 entry unless noted)". */
export const COLLEGES: readonly College[] = [
  {
    id: 'st-edmunds', name: 'St Edmund\'s',
    formats: {
      maths: {
        interviews: 'Usually 1, about 60 minutes, with the Director of Studies and a Faculty academic; maths problems',
        test: 'None stated', offer: 'A*A*A with STEP', source: 'st-edmunds.cam.ac.uk/course/maths', verified: true,
      },
      cs: {
        interviews: '1, about 50 minutes, with the Director of Studies and a specialist',
        test: 'A short task on the day, discussed in the interview', offer: 'A*A*A', source: 'st-edmunds.cam.ac.uk/course/computer-science', verified: true,
      },
    },
  },
  {
    id: 'wolfson', name: 'Wolfson',
    formats: {
      maths: {
        interviews: '1 or 2, 40 to 50 minutes in total; a subject interview, sometimes a general academic one; 2 or 3 interviewers (Mathematics from 2027 entry)',
        test: 'None published', offer: 'University typical offer (STEP for Mathematics inferred)', source: 'wolfson.cam.ac.uk/undergraduate-study/applying', verified: true,
      },
      cs: {
        interviews: '1 or 2, 40 to 50 minutes in total; a subject interview, sometimes a general academic one; 2 or 3 interviewers',
        test: 'None published', offer: 'University typical offer', source: 'wolfson.cam.ac.uk/undergraduate-study/applying', verified: true,
      },
    },
  },
  {
    id: 'hughes-hall', name: 'Hughes Hall',
    formats: {
      maths: {
        interviews: 'Usually 2 of 20 to 30 minutes',
        test: 'None stated', offer: 'STEP 2 and 3 grade 1, A*A*A with A* in Mathematics and Further Mathematics',
        source: 'hughes.cam.ac.uk (2026 entry, search snippets only)', verified: false,
      },
      cs: {
        interviews: 'Usually 2 of 20 to 30 minutes',
        test: 'None stated', offer: 'A*A*A', source: 'hughes.cam.ac.uk (2026 entry, search snippets only)', verified: false,
      },
    },
  },
];

export function collegeOf(id: CollegeId | null): College | undefined {
  return COLLEGES.find((c) => c.id === id);
}

// ---------------------------------------------------------------- papers

export type PaperKind = 'TMUA' | 'STEP' | 'A level';

/** The A level subject a registry paper belongs to, from its qualification. */
export function subjectOf(paper: RegistryPaper): Subject | null {
  if (paper.exam !== 'A level') return null;
  const q = paper.qualification ?? '';
  if (q.startsWith('Further Mathematics')) return 'further-maths';
  if (q.startsWith('Mathematics')) return 'maths';
  if (q.startsWith('Computer Science')) return 'cs';
  return null;
}

/** "STEP 2 2019", "TMUA 2016 Paper 1", "9MA0/01 June 2024: Paper 1: Pure Mathematics 1". */
export function paperName(paper: RegistryPaper): string {
  if (paper.exam === 'STEP') return `${paper.paper} ${paper.year}`;
  if (paper.exam === 'TMUA') return `TMUA ${paper.year} ${paper.paper}`;
  return `${paper.paper} ${paper.series ?? paper.year}${paper.title === undefined ? '' : `: ${paper.title}`}`;
}

/** The paper's question paper link, or null where the registry has a gap. A STEP paper is a file inside a zip. */
export function paperLink(paper: RegistryPaper): { url: string; file?: string } | null {
  const s = paper.sources.paper;
  const one = Array.isArray(s) ? s[0] : s;
  if (one === undefined || one === null) return null;
  return one.file === undefined ? { url: one.url } : { url: one.url, file: one.file };
}

export function sourceUrls(paper: RegistryPaper, key: string): { url: string; file?: string }[] {
  const s = paper.sources[key];
  if (s === undefined || s === null) return [];
  return (Array.isArray(s) ? s : [s]).map((x) => (x.file === undefined ? { url: x.url } : { url: x.url, file: x.file }));
}

const tmuaPaperNo = (paper: RegistryPaper): 1 | 2 => (paper.paper.endsWith('2') ? 2 : 1);

/** The sum of the best six STEP question marks; unattempted questions count nothing. */
export function stepTotal(marks: readonly (number | null)[]): number {
  return marks.filter((m): m is number => m !== null).sort((a, b) => b - a).slice(0, STEP_COUNTED).reduce((a, m) => a + m, 0);
}

export interface Score {
  mark: number;
  max: number;
}

/** A finished sitting's mark, or null while it is running or its marks are not entered. */
export function sittingScore(adm: Admissions, s: Sitting): Score | null {
  if (s.finishedAt === null) return null;
  const paper = adm.registryPaper(s.paperId);
  if (paper === undefined) return null;
  if (paper.exam === 'TMUA') {
    if (s.answers === undefined) return null;
    return { mark: adm.tmuaMark(paper.year, tmuaPaperNo(paper), s.answers), max: TMUA_QUESTIONS };
  }
  if (paper.exam === 'STEP') {
    if (s.questionMarks === undefined) return null;
    return { mark: stepTotal(s.questionMarks), max: STEP_COUNTED * STEP_MARKS_PER_QUESTION };
  }
  if (s.total === undefined) return null;
  return { mark: s.total, max: paper.total_marks };
}

/** Sittings whose marks are in: these count as sat. */
export function marked(adm: Admissions, c: Campaign): { s: Sitting; paper: RegistryPaper; score: Score }[] {
  const out: { s: Sitting; paper: RegistryPaper; score: Score }[] = [];
  for (const s of c.sittings) {
    const paper = adm.registryPaper(s.paperId);
    const score = sittingScore(adm, s);
    if (paper !== undefined && score !== null) out.push({ s, paper, score });
  }
  return out;
}

/** The sitting in progress, if any: one paper at a time. */
export function activeSitting(c: Campaign): Sitting | undefined {
  return c.sittings.find((s) => s.finishedAt === null);
}

export function startSitting(c: Campaign, paperId: string, act: number, now: number, forecast?: Forecast): Campaign {
  if (activeSitting(c) !== undefined) return c;
  const s: Sitting = { id: `${paperId}@${now}`, paperId, act, startedAt: now, finishedAt: null };
  if (forecast !== undefined) s.forecast = { ...forecast };
  return { ...c, sittings: [...c.sittings, s] };
}

export function finishSitting(c: Campaign, id: string, now: number): Campaign {
  return { ...c, sittings: c.sittings.map((s) => (s.id === id && s.finishedAt === null ? { ...s, finishedAt: now } : s)) };
}

/** Records a finished sitting's marks; a sitting still running is left alone. */
export function recordMarks(c: Campaign, id: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>): Campaign {
  return {
    ...c,
    sittings: c.sittings.map((s) => {
      if (s.id !== id || s.finishedAt === null) return s;
      const next: Sitting = { id: s.id, paperId: s.paperId, act: s.act, startedAt: s.startedAt, finishedAt: s.finishedAt };
      if (s.forecast !== undefined) next.forecast = s.forecast;
      if (marks.answers !== undefined) next.answers = [...marks.answers];
      if (marks.questionMarks !== undefined) next.questionMarks = [...marks.questionMarks];
      if (marks.total !== undefined) next.total = marks.total;
      return next;
    }),
  };
}

export function removeSitting(c: Campaign, id: string): Campaign {
  return { ...c, sittings: c.sittings.filter((s) => s.id !== id) };
}

/** Milliseconds left of a running sitting; negative once it is over time. */
export function timeLeft(paper: RegistryPaper, s: Sitting, now: number): number {
  return s.startedAt + paper.duration_minutes * 60_000 - now;
}

// ---------------------------------------------------------------- interviews

export function newInterview(id: string, shape: InterviewShape, c: Campaign, copiedAt: number, mark: number | null = null): InterviewRecord {
  return { id, shape, college: c.college, copiedAt, mark, notes: '' };
}

/** Adds an interview when its packet is copied; the mark comes later. */
export function addInterview(c: Campaign, shape: InterviewShape, now: number): Campaign {
  return { ...c, interviews: [...c.interviews, newInterview(`interview@${now}`, shape, c, now)] };
}

export function recordInterview(c: Campaign, id: string, mark: number | null, notes: string): Campaign {
  const ok = mark === null || (Number.isInteger(mark) && mark >= 0 && mark <= INTERVIEW_MAX);
  if (!ok) return c;
  return { ...c, interviews: c.interviews.map((i) => (i.id === id ? { ...i, mark, notes } : i)) };
}

export function removeInterview(c: Campaign, id: string): Campaign {
  return { ...c, interviews: c.interviews.filter((i) => i.id !== id) };
}

// ---------------------------------------------------------------- acts

export interface Requirement {
  id: string;
  label: string;
  detail: string;
  done: number;
  need: number;
}

export interface Act {
  n: 1 | 2 | 3 | 4 | 5;
  title: string;
  short: string;
  real: string;
  requirements: Requirement[];
  /** Its own requirements are met. */
  met: boolean;
  /** Met, and every act before it complete. */
  complete: boolean;
}

/** Act I's chapter progress until the book restructure exists: the current course's topics mastered. */
export interface ActInputs {
  lessons: { mastered: number; total: number };
}

export const ACT_TITLES: readonly { title: string; short: string }[] = [
  { title: 'Recent qualifications', short: 'A levels' },
  { title: 'The admissions test', short: 'TMUA' },
  { title: 'The application', short: 'Apply' },
  { title: 'The interview', short: 'Interview' },
  { title: 'The offer and results', short: 'Offer' },
];

export const A_LEVEL_PAPERS_NEEDED = 2;
export const TMUA_PAPERS_NEEDED = 3;
/** Computer Science route, Act V: final A level papers sat during the act. */
export const FINAL_A_LEVEL_PAPERS = 2;

const req = (id: string, label: string, detail: string, done: number, need: number): Requirement => ({ id, label, detail, done: Math.min(done, need), need });

export function acts(adm: Admissions, c: Campaign, inputs: ActInputs): Act[] {
  const sat = marked(adm, c);
  const count = (f: (p: RegistryPaper, s: Sitting) => boolean): number => sat.filter((x) => f(x.paper, x.s)).length;
  const { mastered, total } = inputs.lessons;
  const subjectDetail: Record<Subject, string> = {
    maths: 'Edexcel 9MA0 papers, timed, marked by supervision',
    'further-maths': 'Edexcel 9FM0 papers, timed, marked by supervision',
    cs: 'OCR H446 papers, timed, marked by supervision',
  };
  const heard = (shape: InterviewShape): number => c.interviews.filter((i) => i.shape === shape && i.mark !== null).length;

  const own: Requirement[][] = [
    [
      req('lessons', 'Preparation Stage A chapters', 'Counted as course lessons mastered until the book is restructured', total === 0 ? 0 : mastered, Math.max(total, 1)),
      ...c.aLevelOrder.map((sub) => req(`a-${sub}`, SUBJECT_NAMES[sub], subjectDetail[sub], count((p) => subjectOf(p) === sub), A_LEVEL_PAPERS_NEEDED)),
    ],
    [req('tmua', 'TMUA past papers', 'Timed, 75 minutes each, checked by the app', count((p) => p.exam === 'TMUA'), TMUA_PAPERS_NEEDED)],
    [req('filed', 'Application filed', c.college === null ? 'Choose a college first' : `January round at ${collegeOf(c.college)?.name ?? c.college}`, c.applicationFiledAt === null ? 0 : 1, 1)],
    (['pre-reading', 'induction'] as const).map((shape) => req(`interview-${shape}`, shape === 'pre-reading' ? 'Mock interview: pre-reading' : 'Mock interview: induction', SHAPE_NAMES[shape], heard(shape), 1)),
    c.route === 'maths'
      ? (['STEP 2', 'STEP 3'] as const).map((paper) => req(`step-${paper.slice(-1)}`, paper, 'A full paper, 3 hours, marked by supervision', count((p) => p.exam === 'STEP' && p.paper === paper), 1))
      : [req('final', 'Final A level papers', 'Sat during this act, timed, marked by supervision', count((p, s) => p.exam === 'A level' && s.act === 5), FINAL_A_LEVEL_PAPERS)],
  ];
  const real: string[] = [
    'Cambridge does not accept the GED, and mature applicants need recent study at a high level. So you sit three A levels as an adult: Mathematics and Further Mathematics (Edexcel), and Computer Science (OCR).',
    `The TMUA is required for ${ROUTE_NAMES[c.route]}. Mature colleges can use the January sitting. Sit three papers, 75 minutes each, checked by the app.`,
    'The January round at a mature college: UCAS by 13 January, My Cambridge Application by 20 January.',
    'One or two problem-solving interviews, run as a supervision and marked out of 20, in your college\'s format.',
    c.route === 'maths'
      ? 'The typical offer: A*A*A plus grade 1 in STEP 2 and STEP 3. Sit both papers, 3 hours each, graded on that year\'s boundaries.'
      : 'The typical offer: A*A*A, often with A* in Mathematics or Further Mathematics. Sit the final A level papers, timed and marked.',
  ];
  let before = true;
  return own.map((requirements, i) => {
    const met = requirements.every((r) => r.done >= r.need);
    const complete = before && met;
    before = complete;
    const t = ACT_TITLES[i] as { title: string; short: string };
    return { n: (i + 1) as Act['n'], title: t.title, short: t.short, real: real[i] as string, requirements, met, complete };
  });
}

/** The open act, 1 to 5, or 6 once Act V is complete (matriculated). */
export function currentAct(list: readonly Act[]): number {
  const i = list.findIndex((a) => !a.complete);
  return i < 0 ? 6 : i + 1;
}

// ---------------------------------------------------------------- choices

export interface Locks {
  route: string | null;
  college: string | null;
  order: string | null;
  sitting: string | null;
}

/**
 * Why each choice can no longer change, or null while it can. `deadlinePassed` says whether
 * the target cycle's dates have passed (see campaignCalendar).
 */
export function choiceLocks(c: Campaign, act: number, passed: { mca: boolean; tmua: boolean }): Locks {
  return {
    route: act >= 3 ? 'The route is fixed once Act III opens.' : null,
    college: c.applicationFiledAt !== null ? 'The application is filed.' : passed.mca ? 'My Cambridge Application has closed for this cycle.' : null,
    order: act >= 2 ? 'Act I is complete.' : null,
    sitting: act >= 3 ? 'Act II is complete.' : passed.tmua ? 'This cycle\'s sitting has passed.' : null,
  };
}

export function moveSubject(order: readonly Subject[], sub: Subject, by: -1 | 1): Subject[] {
  const i = order.indexOf(sub);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return [...order];
  const out = [...order];
  [out[i], out[j]] = [out[j] as Subject, out[i] as Subject];
  return out;
}

// ---------------------------------------------------------------- stats and effects

export type StatId = 'pure' | 'probability' | 'proof' | 'programming' | 'underTime' | 'interview';

export interface Stat {
  id: StatId;
  label: string;
  /** 0 to 100, or null with no data yet. */
  value: number | null;
  basis: string;
}

/** Which graph areas feed each mastery stat. */
export const STAT_AREAS: Readonly<Record<'pure' | 'probability' | 'proof', readonly string[]>> = {
  pure: ['number-and-algebra', 'sequences-and-series', 'calculus', 'analysis', 'number-theory'],
  probability: ['counting', 'elementary-probability', 'distributions', 'ia-basic-concepts', 'ia-axiomatic', 'conditioning'],
  proof: ['logic', 'proof', 'sets'],
};

export interface StatInputs {
  /** The current course's topics: their area and whether mastered. */
  topics: readonly { area: string; mastered: boolean }[];
}

const pct = (a: number, b: number): number | null => (b === 0 ? null : Math.round((100 * a) / b));

export function stats(adm: Admissions, c: Campaign, inputs: StatInputs): Stat[] {
  const area = (id: 'pure' | 'probability' | 'proof'): number | null => {
    const ts = inputs.topics.filter((t) => STAT_AREAS[id].includes(t.area));
    return pct(ts.filter((t) => t.mastered).length, ts.length);
  };
  const sat = marked(adm, c);
  const got = sat.reduce((a, x) => a + x.score.mark, 0);
  const max = sat.reduce((a, x) => a + x.score.max, 0);
  const heard = c.interviews.filter((i) => i.mark !== null);
  return [
    { id: 'pure', label: 'Pure', value: area('pure'), basis: 'Course topics mastered in algebra, series, calculus, analysis, and number theory' },
    { id: 'probability', label: 'Probability', value: area('probability'), basis: 'Course topics mastered in counting and probability' },
    { id: 'proof', label: 'Proof', value: area('proof'), basis: 'Course topics mastered in logic, proof, and sets' },
    { id: 'programming', label: 'Programming', value: null, basis: 'No programming chapters in the book yet' },
    { id: 'underTime', label: 'Under time', value: pct(got, max), basis: 'Marks scored in timed papers, as a share of the marks available' },
    {
      id: 'interview', label: 'Interview',
      value: heard.length === 0 ? null : Math.round((100 * heard.reduce((a, i) => a + (i.mark as number), 0)) / (heard.length * INTERVIEW_MAX)),
      basis: 'Mock interview marks out of 20',
    },
  ];
}

export interface EffectRule {
  id: 'timed-drill' | 'step3-early' | 'second-mock' | 'short-ocaml';
  stat: StatId;
  when: 'below' | 'at-least';
  threshold: number;
  effect: string;
}

/** The thresholds, in one table (game system 4). */
export const EFFECT_RULES: readonly EffectRule[] = [
  { id: 'timed-drill', stat: 'underTime', when: 'below', threshold: 40, effect: 'A daily timed drill: one past-paper question to the clock.' },
  { id: 'step3-early', stat: 'proof', when: 'at-least', threshold: 60, effect: 'STEP 3 questions come into the queue early.' },
  { id: 'second-mock', stat: 'interview', when: 'below', threshold: 50, effect: 'A second mock interview is scheduled before Act V.' },
  { id: 'short-ocaml', stat: 'programming', when: 'at-least', threshold: 70, effect: 'The CS-0 OCaml block shortens to its exercises.' },
];

/** The rules whose condition holds. A stat with no data triggers nothing, so the interview rule waits for the first interview. */
export function activeEffects(list: readonly Stat[], rules: readonly EffectRule[] = EFFECT_RULES): EffectRule[] {
  return rules.filter((r) => {
    const v = list.find((s) => s.id === r.stat)?.value ?? null;
    if (v === null) return false;
    return r.when === 'below' ? v < r.threshold : v >= r.threshold;
  });
}

// ---------------------------------------------------------------- the offer and the report

const A_ORDER: readonly ALevelGrade[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
const STEP_ORDER: readonly (StepGrade | 'U')[] = ['S', '1', '2', '3', 'U'];
export const aLevelAtLeast = (g: ALevelGrade, need: ALevelGrade): boolean => A_ORDER.indexOf(g) <= A_ORDER.indexOf(need);
export const stepAtLeast = (g: StepGrade | 'U', need: StepGrade): boolean => STEP_ORDER.indexOf(g) <= STEP_ORDER.indexOf(need);

export interface StepRow {
  sitting: Sitting;
  year: number;
  paper: StepPaper;
  mark: number;
  grade: StepGrade | 'U';
  boundaries: Record<StepGrade, number>;
  /** Printed share of candidates at this grade or better, percent; 100 for U. */
  cumulative: number;
  /** Share of real candidates at or below the mark, 0 to 1. */
  atOrBelow: number;
  candidates: number;
}

export function stepRows(adm: Admissions, c: Campaign): StepRow[] {
  return marked(adm, c).filter((x) => x.paper.exam === 'STEP').flatMap((x): StepRow[] => {
    const paper = x.paper.paper as StepPaper;
    const r = adm.stepPaperResults(x.paper.year, paper);
    if (r === undefined) return [];
    const grade = adm.stepGrade(x.paper.year, paper, x.score.mark);
    const at = adm.stepPlacement(x.paper.year, paper, x.score.mark);
    return [{
      sitting: x.s, year: x.paper.year, paper, mark: x.score.mark, grade, boundaries: r.boundaries,
      cumulative: r.cumulative_percent[grade], atOrBelow: at.share, candidates: at.candidates,
    }];
  });
}

export interface ALevelRow {
  sitting: Sitting;
  paper: RegistryPaper;
  subject: Subject;
  mark: number;
  max: number;
  grade: ALevelGrade;
  /** The boundary for A* on this paper. */
  aStar: number;
}

export function aLevelRows(adm: Admissions, c: Campaign): ALevelRow[] {
  return marked(adm, c).filter((x) => x.paper.exam === 'A level').flatMap((x): ALevelRow[] => {
    const sub = subjectOf(x.paper);
    const b = x.paper.boundaries;
    if (sub === null || b === undefined || !('max_mark' in b)) return [];
    return [{ sitting: x.s, paper: x.paper, subject: sub, mark: x.score.mark, max: x.score.max, grade: adm.aLevelGrade(x.paper.id, x.score.mark), aStar: b['A*'] }];
  });
}

export interface TmuaRow {
  year: number;
  /** The latest marked sitting of each paper of that year. */
  p1: number | null;
  p2: number | null;
}

export function tmuaRows(adm: Admissions, c: Campaign): TmuaRow[] {
  const by = new Map<number, TmuaRow>();
  const latest = marked(adm, c).filter((x) => x.paper.exam === 'TMUA').sort((a, b) => a.s.startedAt - b.s.startedAt);
  for (const x of latest) {
    const row = by.get(x.paper.year) ?? { year: x.paper.year, p1: null, p2: null };
    if (tmuaPaperNo(x.paper) === 1) row.p1 = x.score.mark;
    else row.p2 = x.score.mark;
    by.set(x.paper.year, row);
  }
  return [...by.values()].sort((a, b) => a.year - b.year);
}

export type ConditionStatus = 'met' | 'short' | 'pending';

export interface Condition {
  label: string;
  need: string;
  you: string;
  status: ConditionStatus;
}

/** The typical offer for the route, one line per condition, against the papers sat. A STEP or A level paper's latest sitting counts. */
export function offerConditions(adm: Admissions, c: Campaign): Condition[] {
  const latestBy = <T extends { sitting: Sitting }>(rows: T[], key: (r: T) => string): T[] => {
    const m = new Map<string, T>();
    for (const r of [...rows].sort((a, b) => a.sitting.startedAt - b.sitting.startedAt)) m.set(key(r), r);
    return [...m.values()];
  };
  const aRows = latestBy(aLevelRows(adm, c), (r) => r.paper.paper);
  const aLevel = (sub: Subject, need: ALevelGrade, often: boolean): Condition => {
    const rows = aRows.filter((r) => r.subject === sub);
    const needText = `${need} ${often ? 'often asked' : 'needed'}`;
    if (rows.length === 0) return { label: SUBJECT_NAMES[sub], need: needText, you: 'not sat yet', status: 'pending' };
    const low = rows.reduce((w, r) => (A_ORDER.indexOf(r.grade) > A_ORDER.indexOf(w.grade) ? r : w));
    const you = rows.length === 1 ? `${low.grade} on ${low.paper.paper} ${low.paper.year}` : `lowest ${low.grade} (${low.paper.paper} ${low.paper.year}) of ${rows.length} papers`;
    return { label: SUBJECT_NAMES[sub], need: needText, you, status: aLevelAtLeast(low.grade, need) ? 'met' : 'short' };
  };
  const out: Condition[] = [
    aLevel('maths', 'A*', c.route === 'cs'),
    aLevel('further-maths', 'A*', c.route === 'cs'),
    aLevel('cs', 'A', false),
  ];
  if (c.route === 'maths') {
    const sRows = latestBy(stepRows(adm, c), (r) => r.paper);
    for (const paper of ['STEP 2', 'STEP 3'] as const) {
      const r = sRows.find((x) => x.paper === paper);
      out.push(r === undefined
        ? { label: paper, need: 'grade 1 needed', you: 'not sat yet', status: 'pending' }
        : {
          label: paper, need: 'grade 1 needed',
          you: `grade ${r.grade} on the ${r.year} paper (boundary for grade 1: ${r.boundaries['1']})`,
          status: stepAtLeast(r.grade, '1') ? 'met' : 'short',
        });
    }
  }
  return out;
}

// ---------------------------------------------------------------- letters

export interface LetterText {
  id: LetterId;
  title: string;
  lines: string[];
}

/** The letters due now, in order: each milestone reached and its letter not yet delivered. */
export function lettersDue(c: Campaign, list: readonly Act[]): LetterId[] {
  const reached: Record<LetterId, boolean> = {
    received: c.applicationFiledAt !== null,
    invitation: list[2]?.complete === true,
    offer: list[3]?.complete === true,
    results: list[4]?.complete === true,
  };
  return (['received', 'invitation', 'offer', 'results'] as const).filter((id) => reached[id] && !c.letters.some((l) => l.id === id));
}

export function deliverLetters(c: Campaign, ids: readonly LetterId[], now: number): Campaign {
  const fresh = ids.filter((id) => !c.letters.some((l) => l.id === id));
  return fresh.length === 0 ? c : { ...c, letters: [...c.letters, ...fresh.map((id) => ({ id, at: now }))] };
}

const SITTING_NAMES: Readonly<Record<TmuaSitting, string>> = { october: 'October', january: 'January' };

/** A letter's text, written from the real numbers at the time it is read. */
export function letterText(adm: Admissions, c: Campaign, id: LetterId, entryYear: number | null): LetterText {
  const college = collegeOf(c.college);
  const name = college?.name ?? 'your college';
  const course = ROUTE_NAMES[c.route];
  const entry = entryYear === null ? 'a later year' : `October ${entryYear}`;
  switch (id) {
    case 'received':
      return {
        id, title: 'Application received',
        lines: [
          `Your application to read ${course} at ${name}, in the January round, has been received.`,
          `You chose the ${SITTING_NAMES[c.tmuaSitting]} TMUA sitting. Entry: ${entry}.`,
        ],
      };
    case 'invitation': {
      const f = college?.formats[c.route];
      return {
        id, title: 'Invitation to interview',
        lines: [
          `${name} invites you to interview for ${course}.`,
          f === undefined ? 'The format is set by your college.' : `Format: ${f.interviews}. Test at interview: ${f.test}.${f.verified ? '' : ' (Unverified.)'}`,
          'Interviews are online by Zoom.',
        ],
      };
    }
    case 'offer':
      return {
        id, title: 'Conditional offer',
        lines: [
          `${name} offers you a place to read ${course}, for ${entry}, on these conditions:`,
          ...offerConditions(adm, c).map((x) => `${x.label}: ${x.need.replace(' needed', '')}`),
        ],
      };
    case 'results':
      return {
        id, title: 'Results day',
        lines: [
          'Your results against each condition of the offer:',
          ...offerConditions(adm, c).map((x) => `${x.label}: ${x.you}. ${x.status === 'met' ? 'Met.' : x.status === 'short' ? 'Short.' : 'Not sat.'}`),
        ],
      };
  }
}

// ---------------------------------------------------------------- storage

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ROUTES: readonly CampaignRoute[] = ['maths', 'cs'];
const SUBJECTS: readonly Subject[] = DEFAULT_ORDER;
const LETTERS: readonly LetterId[] = ['received', 'invitation', 'offer', 'results'];

function parseSitting(v: unknown): Sitting | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.paperId !== 'string' || !isTime(v.startedAt)) return null;
  if (v.finishedAt !== null && !isTime(v.finishedAt)) return null;
  const act = Number.isInteger(v.act) && (v.act as number) >= 1 && (v.act as number) <= 6 ? (v.act as number) : 1;
  const s: Sitting = { id: v.id, paperId: v.paperId, act, startedAt: v.startedAt, finishedAt: v.finishedAt };
  if (Array.isArray(v.answers) && v.answers.length === TMUA_QUESTIONS && v.answers.every((a) => a === null || (typeof a === 'string' && TMUA_OPTIONS.includes(a)))) {
    s.answers = v.answers as (string | null)[];
  }
  if (Array.isArray(v.questionMarks) && v.questionMarks.length === STEP_QUESTIONS
    && v.questionMarks.every((m) => m === null || (Number.isInteger(m) && (m as number) >= 0 && (m as number) <= STEP_MARKS_PER_QUESTION))) {
    s.questionMarks = v.questionMarks as (number | null)[];
  }
  if (Number.isInteger(v.total) && (v.total as number) >= 0) s.total = v.total as number;
  const forecast = parseForecast(v.forecast);
  if (forecast !== undefined) s.forecast = forecast;
  return s;
}

function parseInterview(v: unknown): InterviewRecord | null {
  if (!isObj(v) || typeof v.id !== 'string' || (v.shape !== 'pre-reading' && v.shape !== 'induction') || !isTime(v.copiedAt)) return null;
  const mark = Number.isInteger(v.mark) && (v.mark as number) >= 0 && (v.mark as number) <= INTERVIEW_MAX ? (v.mark as number) : null;
  const college = COLLEGES.some((c) => c.id === v.college) ? (v.college as CollegeId) : null;
  return { id: v.id, shape: v.shape, college, copiedAt: v.copiedAt, mark, notes: typeof v.notes === 'string' ? v.notes : '' };
}

/** A stored campaign, or null when there is none or it is unreadable. Malformed entries are dropped one by one. */
export function parseCampaign(raw: string | null): Campaign | null {
  if (raw === null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || !isTime(v.startedAt) || !ROUTES.includes(v.route as CampaignRoute)) return null;
  const order = Array.isArray(v.aLevelOrder) && v.aLevelOrder.length === SUBJECTS.length && SUBJECTS.every((s) => (v.aLevelOrder as unknown[]).includes(s))
    ? (v.aLevelOrder as Subject[]) : [...DEFAULT_ORDER];
  const list = <T>(x: unknown, f: (y: unknown) => T | null): T[] => (Array.isArray(x) ? x.map(f).filter((y): y is T => y !== null) : []);
  return {
    startedAt: v.startedAt,
    route: v.route as CampaignRoute,
    college: COLLEGES.some((c) => c.id === v.college) ? (v.college as CollegeId) : null,
    aLevelOrder: order,
    tmuaSitting: v.tmuaSitting === 'october' ? 'october' : 'january',
    sittings: list(v.sittings, parseSitting),
    interviews: list(v.interviews, parseInterview),
    applicationFiledAt: isTime(v.applicationFiledAt) ? v.applicationFiledAt : null,
    letters: list(v.letters, (l) => (isObj(l) && LETTERS.includes(l.id as LetterId) && isTime(l.at) ? { id: l.id as LetterId, at: l.at } : null)),
  };
}
