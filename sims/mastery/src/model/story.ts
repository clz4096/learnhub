/**
 * Story mode (mastery/DESIGN-STORY.md): cut scenes as typed data, and the pure rules around
 * them: what triggers a scene, what the learner's REP is, how choices move relationships,
 * when a scene may play by itself, and the player's state from line to line. No clock,
 * storage, or DOM here; the store (storyStore.ts) and the player (ui/story) hold those.
 *
 * Real data drives everything: a trigger reads the learner's real progress, a scene's
 * variant and end card read real numbers, and REP is computed from real work only (one
 * table, REP_TABLE). Scenes never grant REP. Choices change relationships and can unlock
 * side scenes, never study; only the latest choice in a scene counts, so a replay with a
 * different choice replaces the old one instead of adding to it. A rating rising past a
 * threshold (ratings.ts) can play a short beat.
 */
import type { Route } from './route';
import { addDays, nyParts, sunsetMinutes } from './day';
import { restOf } from './holidays';
import { RATING_LABELS, type RatingId, type RatingValues } from './ratings';

// ---------------------------------------------------------------- the cast

export type RelId = 'lambda' | 'priya' | 'tomasz' | 'okafor';
export const REL_IDS: readonly RelId[] = ['lambda', 'priya', 'tomasz', 'okafor'];

export interface Character {
  name: string;
  role: string;
}

export const CHARACTERS: Readonly<Record<RelId, Character>> = {
  lambda: { name: 'Dr Ada Lambda', role: 'Director of Studies in Mathematics' },
  priya: { name: 'Priya Raman', role: 'Fellow mature applicant, former nurse' },
  tomasz: { name: 'Tomasz', role: 'Supervision partner in Part IA' },
  okafor: { name: 'Dr Hal Okafor', role: 'Computer Science supervisor' },
};

export type Relationships = Record<RelId, number>;

export const NO_RELATIONSHIPS: Readonly<Relationships> = { lambda: 0, priya: 0, tomasz: 0, okafor: 0 };

/** A relationship's standing in words, from the sum of the choices that moved it. */
export function relationWord(v: number): string {
  if (v <= -2) return 'distant';
  if (v === -1) return 'cooler';
  if (v === 0) return 'acquainted';
  if (v <= 2) return 'friendly';
  if (v <= 4) return 'close';
  return 'trusted';
}

// ---------------------------------------------------------------- the real numbers

/** The real numbers a scene can read, and that REP is computed from. */
export interface StoryNumbers {
  /** Book sections with at least one step, every step learned. */
  sectionsMastered: number;
  /** Timed campaign papers finished with their marks entered. */
  papersSat: number;
  /** Imported supervision results at or above the pass mark. */
  supervisionsPassed: number;
  /** Days with study: a lesson, review, quiz, or supervision, or a ticked block. */
  daysStudied: number;
  /** Hours ticked off in the day planner in the week of the scene's trigger. */
  weekHours: number;
  /** Of the two full weeks before the trigger's, those planned in the day planner whose ticked hours fell below the target. */
  weeksShort: number;
  /** The campaign's real results at the trigger, or null with no campaign or before the paper registry loads. */
  campaign: StoryCampaign | null;
}

/** A timed paper as a scene reads it: its name, the real mark, and the grade it earned where papers have grades. */
export interface StoryPaper {
  /** "9MA0/01 June 2024", "TMUA 2016 Paper 1", "STEP 2 2019". */
  name: string;
  mark: number;
  max: number;
  /** "A*", "1"; null for the TMUA, which has no grades. */
  grade: string | null;
}

export type StoryConditionStatus = 'met' | 'short' | 'pending';

/** One condition of the offer against the results, as the Report shows it. */
export interface StoryCondition {
  label: string;
  need: string;
  you: string;
  status: StoryConditionStatus;
  /** Grades below the need on the weakest paper: 0 when met, null when not sat or not gradable. */
  below: number | null;
}

/**
 * The campaign's real results, copied when a scene triggers so a replay reads them as they
 * were. Each list holds the latest sitting of each paper.
 */
export interface StoryCampaign {
  route: 'maths' | 'cs';
  /** A level papers, with `subject` the subject's name ("A level Mathematics"). */
  aLevels: (StoryPaper & { subject: string })[];
  tmua: StoryPaper[];
  step: StoryPaper[];
  /** Mock interview marks out of 20, in the order recorded. */
  interviews: number[];
  conditions: StoryCondition[];
  /** When the application was filed (ms), or null. */
  filedAt: number | null;
  /** The projected entry year, or null when beyond the horizon. */
  entry: number | null;
}

export type OfferOutcome = 'met' | 'narrow' | 'missed';

/**
 * Results against the offer: met when every condition is met; a narrow miss when exactly
 * one is short, by one grade (the College looks again and confirms); otherwise missed. A
 * condition not sat counts as missed: the College cannot confirm on a result it has not seen.
 */
export function offerOutcome(c: StoryCampaign): OfferOutcome {
  const open = c.conditions.filter((x) => x.status !== 'met');
  if (open.length === 0) return 'met';
  return open.length === 1 && open[0]?.below === 1 ? 'narrow' : 'missed';
}

export const NO_NUMBERS: Readonly<StoryNumbers> = {
  sectionsMastered: 0, papersSat: 0, supervisionsPassed: 0, daysStudied: 0, weekHours: 0, weeksShort: 0, campaign: null,
};

/** Everything a trigger can read. */
export interface StoryFacts extends StoryNumbers {
  /** Ids of book chapters with at least one step, every step learned. */
  chaptersComplete: readonly string[];
  /** `<year id>/<term name>` to the share of the term's steps learned, 0 to 1. */
  termShare: Readonly<Record<string, number>>;
  /** Campaign acts complete in order, or null when unknown (no campaign, or the paper registry not loaded). */
  actsComplete: number | null;
  /** Campaign letters delivered; empty until the campaign's results are known (`campaign` not null), since letter scenes read them. */
  letters: readonly string[];
  /** The player ratings now (ratings.ts); absent or null while unknown, and then no rating beat fires. */
  ratings?: RatingValues | null;
  /**
   * The cohort's events so far (cohortStory.ts): a classmate's decision or results
   * ("offer:marcus"), a standup missed, falling far behind. Absent: no cohort beat fires.
   */
  cohort?: readonly string[] | null;
}

// ---------------------------------------------------------------- REP

export type RepSource = 'sectionsMastered' | 'papersSat' | 'supervisionsPassed' | 'daysStudied';

/** REP, in one table: each unit of real work and what it is worth. Nothing else gives REP. */
export const REP_TABLE: readonly { source: RepSource; label: string; points: number }[] = [
  { source: 'sectionsMastered', label: 'Book sections mastered', points: 50 },
  { source: 'papersSat', label: 'Timed papers sat and marked', points: 80 },
  { source: 'supervisionsPassed', label: 'Supervisions passed', points: 30 },
  { source: 'daysStudied', label: 'Days studied', points: 10 },
];

/** The levels and the REP each starts at, in order. */
export const REP_LEVELS: readonly { name: string; at: number }[] = [
  { name: 'Applicant', at: 0 },
  { name: 'Offer Holder', at: 500 },
  { name: 'Fresher', at: 1500 },
  { name: 'Scholar', at: 3000 },
  { name: 'Senior Scholar', at: 6000 },
  { name: 'Fellow-in-Waiting', at: 10000 },
];

const count = (x: number): number => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);

export function repOf(n: StoryNumbers): number {
  return REP_TABLE.reduce((a, r) => a + count(n[r.source]) * r.points, 0);
}

export interface RepLevel {
  name: string;
  at: number;
  /** The next level, or null at the top. */
  next: { name: string; at: number } | null;
}

export function repLevel(rep: number): RepLevel {
  let i = 0;
  while (i + 1 < REP_LEVELS.length && rep >= (REP_LEVELS[i + 1] as { at: number }).at) i++;
  const l = REP_LEVELS[i] as { name: string; at: number };
  return { name: l.name, at: l.at, next: REP_LEVELS[i + 1] ?? null };
}

// ---------------------------------------------------------------- scenes as data

export type LineKind = 'narration' | 'inner' | 'spoken' | 'message';

/** What a line's text can read: the real numbers, as of the scene's trigger, and the relationships when it plays. */
export interface SceneContext {
  n: StoryNumbers;
  /** Absent reads as no relationships. */
  rel?: Readonly<Relationships>;
}

export type Text = string | ((ctx: SceneContext) => string);

export interface Line {
  kind: LineKind;
  /** Shown above the text; narration has none. */
  speaker?: string;
  text: Text;
  /** A hook the scene's art reacts to from this line on (a phone buzzing, a page shown). */
  fx?: string;
  /** Plays only in these variants of the scene (see `Script.variant`). */
  only?: readonly string[];
}

export interface ChoiceOption {
  id: string;
  text: string;
  /** A short note on what it means, shown beside it. */
  note: string;
  /** Relationship changes. */
  effects?: Partial<Relationships>;
  /** A line that follows this choice. */
  reply?: Line;
}

export interface ChoicePoint {
  kind: 'choice';
  id: string;
  options: readonly ChoiceOption[];
}

export type ScriptLine = Line | ChoicePoint;

/** What the end card reads. */
export interface EndContext extends SceneContext {
  rep: number;
  /** REP when the previous scene ended, or null before any scene. */
  repBefore: number | null;
  chosen: Readonly<Record<string, string>>;
  before: Readonly<Relationships>;
  after: Readonly<Relationships>;
}

export interface EndItem {
  label: string;
  value: (ctx: EndContext) => string;
}

export interface Script {
  /** The scene's variant from the real numbers (and relationships); lines with `only` play in their variants. */
  variant?: (n: StoryNumbers, rel: Readonly<Relationships>) => string;
  /** A title card per variant, where the variants are different scenes ("The Long Winter", "Momentum"). */
  titles?: Readonly<Record<string, string>>;
  lines: readonly ScriptLine[];
  endCard: readonly EndItem[];
}

export type Trigger =
  | { kind: 'firstLaunch' }
  | { kind: 'chapter'; chapterId: string; name: string }
  | { kind: 'termHalf'; term: string; name: string }
  | { kind: 'act'; n: 1 | 2 | 3 | 4 | 5; name: string }
  | { kind: 'letter'; id: string; name: string }
  /** Act V complete and the offer met or narrowly missed: the place is confirmed. */
  | { kind: 'confirmed' }
  /**
   * A side scene: `after` seen, and the choices made so far meet `need`. `name` finishes the
   * clause "plays after ...": "after First Light, if you asked Priya to study together".
   */
  | { kind: 'side'; after: string; need: SideNeed; name: string }
  /** A rating beat: the rating (or the overall) at `at` or above. */
  | { kind: 'rating'; rating: RatingId | 'overall'; at: number }
  /** A cohort beat: the event has happened. `name` finishes "plays ...": "when you miss a standup". */
  | { kind: 'cohort'; event: string; name: string };

/** What unlocks a side scene: one option taken at a choice point, or a relationship at a level. */
export type SideNeed =
  | { kind: 'choice'; scene: string; point: string; option: string }
  | { kind: 'rel'; who: RelId; atLeast: number };

/** The art a scene is drawn with; the player maps each to a component. */
export type ArtId =
  | 'kitchen-night' | 'kitchen-dawn' | 'desk-night' | 'window-winter' | 'kitchen-results' | 'train-hall' | 'kitchen-apply'
  | 'video-call' | 'kitchen-offer' | 'senate-board' | 'college-gate';

/** The main storyline, a side scene unlocked by choices, or a short beat when a rating rises past a threshold. */
export type Strand = 'main' | 'side' | 'beat';

export interface Scene {
  id: string;
  /** Absent for the main storyline. Side scenes and beats are never "Next" on an end card. */
  strand?: Strand;
  /** 0 for the Prologue, 1 for Book One: Preparation, and so on. */
  book: number;
  /** The scene's number within its book; 0 for the Prologue. */
  chapter: number;
  /** The title card's small line: "Prologue", "Chapter 1". */
  kicker: string;
  title: string;
  /** The place and time card. */
  place: string;
  art: ArtId | null;
  /** Who appears: meeting them in a seen scene shows their relationship. */
  cast: readonly RelId[];
  trigger: Trigger;
  /** Null for a scene not yet written: listed, locked, never played. */
  script: Script | null;
}

export const isChoice = (l: ScriptLine): l is ChoicePoint => l.kind === 'choice';

/** A trigger as a clause: "plays when you finish STEP Foundation, Block 1". */
export function triggerText(t: Trigger): string {
  switch (t.kind) {
    case 'firstLaunch': return 'plays the first time you open the app';
    case 'chapter': return `plays when you finish ${t.name}`;
    case 'termHalf': return `plays when you are halfway through ${t.name}`;
    case 'act': return `plays when ${t.name} is complete`;
    case 'letter': return `plays when ${t.name} arrives`;
    case 'confirmed': return 'plays when your place is confirmed';
    case 'side': return `plays ${t.name}`;
    case 'rating': return `plays when your ${t.rating === 'overall' ? 'overall' : RATING_LABELS[t.rating]} rating reaches ${t.at}`;
    case 'cohort': return `plays ${t.name}`;
  }
}

export const strandOf = (s: Scene): Strand => s.strand ?? 'main';

/** Whether the choices recorded so far meet a side scene's need. */
export function sideNeedMet(need: SideNeed, st: Pick<StoryState, 'choices' | 'relationships'>): boolean {
  return need.kind === 'choice' ? st.choices[need.scene]?.[need.point] === need.option : st.relationships[need.who] >= need.atLeast;
}

/** Whether a trigger holds. Side scenes also read the story so far (`st`); without it they never fire. */
export function triggered(t: Trigger, f: StoryFacts, st?: Pick<StoryState, 'seen' | 'choices' | 'relationships'>): boolean {
  switch (t.kind) {
    case 'firstLaunch': return true;
    case 'chapter': return f.chaptersComplete.includes(t.chapterId);
    case 'termHalf': return (f.termShare[t.term] ?? 0) >= 0.5;
    case 'act': return f.actsComplete !== null && f.actsComplete >= t.n;
    case 'letter': return f.letters.includes(t.id);
    case 'confirmed': return f.actsComplete !== null && f.actsComplete >= 5 && f.campaign !== null && offerOutcome(f.campaign) !== 'missed';
    case 'side': return st !== undefined && st.seen[t.after] !== undefined && sideNeedMet(t.need, st);
    case 'rating': return f.ratings != null && f.ratings[t.rating] >= t.at;
    case 'cohort': return f.cohort != null && f.cohort.includes(t.event);
  }
}

/** Relationships from the choices made: the sum of every recorded choice's effects. */
export function relationshipsOf(scenes: readonly Scene[], choices: StoryState['choices']): Relationships {
  const out: Relationships = { ...NO_RELATIONSHIPS };
  for (const s of scenes) {
    const made = choices[s.id];
    if (made === undefined || s.script === null) continue;
    for (const l of s.script.lines) {
      if (!isChoice(l)) continue;
      const o = l.options.find((x) => x.id === made[l.id]);
      for (const r of REL_IDS) out[r] += o?.effects?.[r] ?? 0;
    }
  }
  return out;
}

/** The characters met: anyone in the cast of a seen scene. */
export function metOf(scenes: readonly Scene[], seen: StoryState['seen']): Set<RelId> {
  return new Set(scenes.filter((s) => seen[s.id] !== undefined).flatMap((s) => s.cast));
}

// ---------------------------------------------------------------- the player

/** A line ready to show: its text resolved, or a choice point. */
export type PlayLine =
  | { kind: LineKind; speaker: string | null; text: string; fx: string | null }
  | ChoicePoint;

function resolve(l: Line, ctx: SceneContext): PlayLine {
  return { kind: l.kind, speaker: l.speaker ?? null, text: typeof l.text === 'string' ? l.text : l.text(ctx), fx: l.fx ?? null };
}

/** The scene's variant for these numbers and relationships, or null for a scene without variants. */
export function variantOf(script: Script, ctx: SceneContext): string | null {
  return script.variant?.(ctx.n, ctx.rel ?? NO_RELATIONSHIPS) ?? null;
}

/** The title card: the variant's title where the script names one, else the scene's. */
export function titleOf(scene: Scene, ctx: SceneContext): string {
  const v = scene.script === null ? null : variantOf(scene.script, ctx);
  return (v === null ? undefined : scene.script?.titles?.[v]) ?? scene.title;
}

/** The scene's lines for its variant, texts resolved. */
export function expand(script: Script, ctx: SceneContext): PlayLine[] {
  const v = variantOf(script, ctx);
  return script.lines
    .filter((l) => isChoice(l) || l.only === undefined || (v !== null && l.only.includes(v)))
    .map((l) => (isChoice(l) ? l : resolve(l, ctx)));
}

export interface PlayerState {
  phase: 'title' | 'lines' | 'end';
  /** The line shown; -1 before the first. */
  i: number;
  seq: PlayLine[];
  /** Choice point id to option id, for the choices made in this play. */
  chosen: Record<string, string>;
  /** Skipped to the end: choices not made keep their earlier values. */
  skipped: boolean;
}

export function startPlayer(seq: PlayLine[]): PlayerState {
  return { phase: 'title', i: -1, seq, chosen: {}, skipped: false };
}

/** From the title card to the first line, or from a line to the next (never past an open choice). */
export function advance(s: PlayerState): PlayerState {
  if (s.phase === 'end') return s;
  const cur = s.seq[s.i];
  if (s.phase === 'lines' && cur !== undefined && cur.kind === 'choice' && s.chosen[cur.id] === undefined) return s;
  const i = s.i + 1;
  return i >= s.seq.length ? { ...s, phase: 'end', i } : { ...s, phase: 'lines', i };
}

/** Takes an option at the choice shown, puts its reply next, and moves on. */
export function choose(s: PlayerState, optionId: string, ctx: SceneContext): PlayerState {
  const cur = s.seq[s.i];
  if (s.phase !== 'lines' || cur === undefined || cur.kind !== 'choice' || s.chosen[cur.id] !== undefined) return s;
  const o = cur.options.find((x) => x.id === optionId);
  if (o === undefined) return s;
  const seq = o.reply === undefined ? s.seq : [...s.seq.slice(0, s.i + 1), resolve(o.reply, ctx), ...s.seq.slice(s.i + 1)];
  return advance({ ...s, seq, chosen: { ...s.chosen, [cur.id]: o.id } });
}

export function skip(s: PlayerState): PlayerState {
  return s.phase === 'end' ? s : { ...s, phase: 'end', skipped: true };
}

/** The art hooks fired up to the line shown. */
export function firedFx(s: PlayerState): string[] {
  const upto = s.phase === 'end' ? s.seq.length - 1 : s.i;
  return s.seq.slice(0, upto + 1).flatMap((l) => (l.kind !== 'choice' && l.fx !== null ? [l.fx] : []));
}

// ---------------------------------------------------------------- story state

export interface Seen {
  /** ms since the epoch: first and latest time the scene ended. */
  first: number;
  last: number;
  plays: number;
  /** The real numbers when it first played: a replay reads these, so it plays as it did. */
  n: StoryNumbers;
}

export interface StoryState {
  seen: Record<string, Seen>;
  /** Scene id to choice point id to option id: the latest choice made. */
  choices: Record<string, Record<string, string>>;
  /** Kept equal to `relationshipsOf(scenes, choices)`. */
  relationships: Relationships;
  /** REP when the last scene ended, for the end card's change; null before any. */
  rep: number | null;
  /** Triggered and waiting to play, in order, with when each was triggered. */
  queued: { id: string; at: number; n: StoryNumbers }[];
}

export function emptyStory(): StoryState {
  return { seen: {}, choices: {}, relationships: { ...NO_RELATIONSHIPS }, rep: null, queued: [] };
}

/** Written scenes, not seen and not queued, whose trigger holds, in story order. */
export function newlyDue(scenes: readonly Scene[], st: StoryState, f: StoryFacts): Scene[] {
  return scenes.filter((s) => s.script !== null && st.seen[s.id] === undefined && !st.queued.some((q) => q.id === s.id) && triggered(s.trigger, f, st));
}

/** Queues scenes that have just triggered, with the numbers at that moment. Returns `st` itself when nothing is new. */
export function enqueue(st: StoryState, due: readonly Scene[], f: StoryFacts, now: number): StoryState {
  if (due.length === 0) return st;
  const n = numbersOf(f);
  return { ...st, queued: [...st.queued, ...due.map((s) => ({ id: s.id, at: now, n }))] };
}

export function numbersOf(f: StoryNumbers): StoryNumbers {
  return {
    sectionsMastered: f.sectionsMastered, papersSat: f.papersSat, supervisionsPassed: f.supervisionsPassed, daysStudied: f.daysStudied,
    weekHours: f.weekHours, weeksShort: f.weeksShort, campaign: f.campaign,
  };
}

/** Records a play that reached its end card. */
export function completeScene(
  scenes: readonly Scene[], st: StoryState, sceneId: string, chosen: Readonly<Record<string, string>>, n: StoryNumbers, rep: number, now: number,
): StoryState {
  const was = st.seen[sceneId];
  const seen: Seen = was === undefined ? { first: now, last: now, plays: 1, n } : { ...was, last: now, plays: was.plays + 1 };
  const made = { ...(st.choices[sceneId] ?? {}), ...chosen };
  const choices = Object.keys(made).length === 0 ? st.choices : { ...st.choices, [sceneId]: made };
  return {
    seen: { ...st.seen, [sceneId]: seen },
    choices,
    relationships: relationshipsOf(scenes, choices),
    rep,
    queued: st.queued.filter((q) => q.id !== sceneId),
  };
}

// ---------------------------------------------------------------- when a scene may play by itself

/**
 * The rest under way at a moment, by name ("Shabbat", "Pesach"), or null: Shabbat from
 * Friday sundown to Saturday sundown, a yom tov from sundown the evening before to sundown
 * on the day, in Brooklyn (the app's sunset function).
 */
export function restNow(ms: number): string | null {
  const { date, minutes } = nyParts(ms);
  return minutes < sunsetMinutes(date) ? restOf(date) : restOf(addDays(date, 1));
}

/** Whether a rest day is under way: Shabbat or a yom tov (`restNow`). */
export function isShabbat(ms: number): boolean {
  return restNow(ms) !== null;
}

/**
 * Whether a scene may play over this view: anywhere but a past paper's screen, where a
 * timed sitting may be running (design v4: scenes play as soon as they trigger, except
 * during a timed paper and on Shabbat).
 */
export function calmView(r: Route): boolean {
  return r.view !== 'paper';
}

/**
 * The queued scene to play by itself now, or null: never on Shabbat, never during a timed
 * paper (`timedRunning`: a sitting's clock is running, whatever the screen).
 */
export function autoPlay(st: StoryState, now: number, r: Route, timedRunning = false): string | null {
  if (st.queued.length === 0 || isShabbat(now) || timedRunning || !calmView(r)) return null;
  return st.queued[0]?.id ?? null;
}

/** The main-storyline scene after this one, for the end card's "Next"; none after a side scene or a beat. */
export function nextScene(scenes: readonly Scene[], id: string): Scene | undefined {
  const i = scenes.findIndex((s) => s.id === id);
  if (i < 0 || strandOf(scenes[i] as Scene) !== 'main') return undefined;
  return scenes.slice(i + 1).find((s) => strandOf(s) === 'main');
}

// ---------------------------------------------------------------- parsing

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isStr = (v: unknown): v is string => typeof v === 'string';
const list = <T>(x: unknown, f: (y: unknown) => T | null): T[] | null => {
  if (!Array.isArray(x)) return null;
  const out = x.map(f);
  return out.every((y): y is T => y !== null) ? out : null;
};

function parsePaper(v: unknown): StoryPaper | null {
  if (!isObj(v) || !isStr(v.name) || !isNum(v.mark) || !isNum(v.max) || (v.grade !== null && !isStr(v.grade))) return null;
  return { name: v.name, mark: v.mark, max: v.max, grade: v.grade };
}

const STATUSES: readonly StoryConditionStatus[] = ['met', 'short', 'pending'];

function parseCondition(v: unknown): StoryCondition | null {
  if (!isObj(v) || !isStr(v.label) || !isStr(v.need) || !isStr(v.you) || !STATUSES.includes(v.status as StoryConditionStatus)) return null;
  if (v.below !== null && !(isNum(v.below) && v.below >= 0)) return null;
  return { label: v.label, need: v.need, you: v.you, status: v.status as StoryConditionStatus, below: v.below };
}

/** A stored campaign snapshot, or null when any part of it is unreadable: a scene never reads half a result. */
function parseStoryCampaign(v: unknown): StoryCampaign | null {
  if (!isObj(v) || (v.route !== 'maths' && v.route !== 'cs')) return null;
  const aLevels = list(v.aLevels, (x) => {
    const p = parsePaper(x);
    return p === null || !isObj(x) || !isStr(x.subject) ? null : { ...p, subject: x.subject };
  });
  const tmua = list(v.tmua, parsePaper);
  const step = list(v.step, parsePaper);
  const interviews = list(v.interviews, (x) => (isNum(x) && x >= 0 ? x : null));
  const conditions = list(v.conditions, parseCondition);
  const time = (x: unknown): number | null | undefined => (x === null ? null : isNum(x) ? x : undefined);
  const filedAt = time(v.filedAt);
  const entry = time(v.entry);
  if (aLevels === null || tmua === null || step === null || interviews === null || conditions === null || filedAt === undefined || entry === undefined) return null;
  return { route: v.route, aLevels, tmua, step, interviews, conditions, filedAt, entry };
}

function parseNumbers(v: unknown): StoryNumbers {
  const o = isObj(v) ? v : {};
  const g = (k: 'sectionsMastered' | 'papersSat' | 'supervisionsPassed' | 'daysStudied' | 'weekHours' | 'weeksShort'): number =>
    (isNum(o[k]) && (o[k] as number) >= 0 ? (o[k] as number) : 0);
  return {
    sectionsMastered: g('sectionsMastered'), papersSat: g('papersSat'), supervisionsPassed: g('supervisionsPassed'), daysStudied: g('daysStudied'),
    weekHours: g('weekHours'), weeksShort: g('weeksShort'), campaign: parseStoryCampaign(o.campaign),
  };
}

/**
 * A stored story, or an empty one when there is none or it is unreadable. Malformed entries
 * are dropped one by one; relationships are recomputed from the choices.
 */
export function parseStory(raw: string | null, scenes: readonly Scene[]): StoryState {
  const st = emptyStory();
  if (raw === null) return st;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return st;
  }
  if (!isObj(v)) return st;
  const known = new Set(scenes.map((s) => s.id));
  if (isObj(v.seen)) {
    for (const [id, e] of Object.entries(v.seen)) {
      if (!known.has(id) || !isObj(e) || !isNum(e.first) || !isNum(e.last) || !isNum(e.plays) || e.plays < 1) continue;
      st.seen[id] = { first: e.first, last: e.last, plays: Math.floor(e.plays), n: parseNumbers(e.n) };
    }
  }
  if (isObj(v.choices)) {
    for (const [id, c] of Object.entries(v.choices)) {
      if (!known.has(id) || !isObj(c)) continue;
      const made = Object.fromEntries(Object.entries(c).filter((x): x is [string, string] => typeof x[1] === 'string'));
      if (Object.keys(made).length > 0) st.choices[id] = made;
    }
  }
  st.relationships = relationshipsOf(scenes, st.choices);
  st.rep = isNum(v.rep) && v.rep >= 0 ? v.rep : null;
  if (Array.isArray(v.queued)) {
    for (const q of v.queued) {
      if (!isObj(q) || typeof q.id !== 'string' || !known.has(q.id) || !isNum(q.at)) continue;
      if (st.seen[q.id] !== undefined || st.queued.some((x) => x.id === q.id)) continue;
      st.queued.push({ id: q.id, at: q.at, n: parseNumbers(q.n) });
    }
  }
  return st;
}
