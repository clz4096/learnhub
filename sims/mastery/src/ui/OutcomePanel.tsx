/**
 * The outcome panel (assessment that proves learning, phase 1): for each paper with timed
 * results, the predicted mark and grade with its range, placed on the real boundaries, and
 * the evidence it rests on. The model is outcome.ts; this only shows it. It reads the
 * campaign's sittings and the timed ladder's attempts, both kept in this browser.
 *
 * Self-contained, so it can be mounted anywhere (the You tab); it loads the paper registry
 * on demand like the campaign screens.
 */
import { useEffect } from 'preact/hooks';
import { paperName, type Admissions, type Campaign } from '@/model/campaign';
import { campaign } from '@/model/campaignStore';
import { EXAMS, RUNG_NAMES, type Exam, type LadderAttempt } from '@/model/ladder';
import { ladder, loadLadder } from '@/model/ladderStore';
import { predictions, type Evidence, type Placed, type Prediction } from '@/model/outcome';
import { BAR_START, forecastResults, learnBar, meanGap, type ForecastResult } from '@/model/readinessBar';
import { WithAdmissions, shortStamp } from '@/ui/campaignShared';

export function OutcomePanel() {
  return <WithAdmissions>{(adm) => <OutcomeBody adm={adm} c={campaign.value} />}</WithAdmissions>;
}

function OutcomeBody({ adm, c }: { adm: Admissions; c: Campaign | null }) {
  useEffect(() => loadLadder(adm), [adm]);
  const list = predictions(adm, c, ladder.value);
  return (
    <section class="outcome" aria-labelledby="outcome-title">
      <h2 id="outcome-title">Predicted results</h2>
      <p class="small muted">
        From timed full and half papers only, set against the real grade boundaries. The range is where your level most likely is
        (80 percent), from how much your papers vary; it narrows as more papers agree.
      </p>
      {list.length === 0
        ? <p class="small">No timed papers yet. Sit a full or half paper against the clock and its prediction appears here.</p>
        : list.map((p) => <PredictionCard key={p.key} p={p} />)}
      <ForecastGaps adm={adm} c={c} attempts={ladder.value} />
    </section>
  );
}

const pct = (x: number): string => `${Math.round(100 * x)}%`;

/** "14 points under", "3 points over", "on the mark": a gap in shares as percentage points. */
export function gapText(gap: number): string {
  const pts = Math.round(100 * gap);
  return pts === 0 ? 'on the prediction' : `${Math.abs(pts)} ${Math.abs(pts) === 1 ? 'point' : 'points'} ${pts < 0 ? 'under' : 'over'}`;
}

/**
 * Rule 8: each timed sitting's prediction beside its real result, the mean gap, and the
 * readiness bar each exam has learned from them (readinessBar.ts).
 */
function ForecastGaps({ adm, c, attempts }: { adm: Admissions; c: Campaign | null; attempts: readonly LadderAttempt[] }) {
  const byExam = EXAMS.map((exam) => ({ exam, results: forecastResults(adm, c, attempts, exam) })).filter((x) => x.results.length > 0);
  return (
    <section class="outcome-gaps" aria-labelledby="gaps-title">
      <h2 id="gaps-title">Predicted and real</h2>
      <p class="small muted">
        Before each timed sitting the app records its prediction; after marking, the real result sits beside it. The readiness bar,
        the share of an exam's topics mastered before its first timed question, starts at {pct(BAR_START)} and moves with these results.
      </p>
      {byExam.length === 0
        ? <p class="small">No timed sitting with a prediction yet.</p>
        : byExam.map(({ exam, results }) => <ExamGaps key={exam} exam={exam} results={results} />)}
    </section>
  );
}

function ExamGaps({ exam, results }: { exam: Exam; results: ForecastResult[] }) {
  const { bar, steps } = learnBar(results);
  const mean = meanGap(results);
  return (
    <article class="c-card c-pad outcome-card" aria-label={`${exam} predictions and results`}>
      <h3>{exam}</h3>
      <p class="small">
        {mean === null ? 'Nothing marked yet.' : `Real results average ${gapText(mean)} the prediction.`}
        {' '}Readiness bar: <b class="c-num">{pct(bar)}</b>{steps.length === 0 ? ' (the starting bar; no timed result has moved it).' : `, from ${steps.length} timed ${steps.length === 1 ? 'result' : 'results'}.`}
      </p>
      <ul class="ruled">
        {[...results].reverse().map((r) => (
          <li key={r.id}>
            <span>{paperName(r.paper).split(':')[0]}, {RUNG_NAMES[r.rung].toLowerCase()}, {shortStamp(r.at)}</span>
            <span class="r c-num">predicted {pct(r.forecast.predicted)}{r.real === null ? ', not marked yet' : `, real ${pct(r.real)}`}</span>
            <span class="s">
              {r.gap === null ? '' : `${gapText(r.gap)}. `}
              {r.forecast.from === 'outcome' ? 'Predicted from earlier timed papers' : 'Predicted from topics mastered'}; {pct(r.forecast.mastered)} of the syllabus mastered at the start.
              {r.met === null ? '' : !r.timed ? ' Over time: not counted.' : r.rung === 'question' ? (r.met ? ' Passed: 14 of 20 or better.' : ' Below 14 of 20.') : r.met ? ' Met the offer grade.' : ' Below the offer grade.'}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

const marks = (x: number): string => String(Math.round(x));
const gradeText = (p: Prediction, g: string | null): string => (g === null ? '' : p.exam === 'STEP' ? (g === 'U' ? 'unclassified' : `grade ${g}`) : g);

function placed(p: Prediction, x: Placed): string {
  const g = gradeText(p, x.grade);
  return `${marks(x.mark)} of ${p.max}${g === '' ? '' : `, ${g}`}`;
}

/** "Likely 58 to 86 of 120: grade 2 to grade S", or why there is no range yet. */
export function rangeText(p: Prediction): string {
  if (p.predicted === null) return 'No timed result yet: untimed papers are listed, not counted.';
  if (p.low === null || p.high === null) return 'Sit one more timed paper to see a range.';
  const lo = gradeText(p, p.low.grade);
  const hi = gradeText(p, p.high.grade);
  const grades = lo === '' ? '' : lo === hi ? `: ${lo} throughout` : `: ${lo} to ${hi}`;
  return `Likely ${marks(p.low.mark)} to ${marks(p.high.mark)} of ${p.max}${grades}.`;
}

function PredictionCard({ p }: { p: Prediction }) {
  return (
    <article class="c-card c-pad outcome-card" aria-label={`${p.key} prediction`}>
      <h3>{p.key}</h3>
      {p.predicted !== null && <p class="outcome-mark"><b class="c-num">{placed(p, p.predicted)}</b> predicted, from {p.n} timed {p.n === 1 ? 'paper' : 'papers'}</p>}
      <p class="small">{rangeText(p)}</p>
      {p.atOrBelow !== null && p.reference !== null && (
        <p class="small muted">About {Math.round(100 * p.atOrBelow)} percent of {p.reference} candidates scored this mark or less.</p>
      )}
      {p.boundaries.length > 0 && p.reference !== null
        ? <p class="small muted">Boundaries, {p.reference}: {p.boundaries.map((b) => `${p.exam === 'STEP' ? `grade ${b.grade}` : b.grade} from ${b.mark}`).join(', ')}.</p>
        : <p class="small muted">No official grade boundaries or score conversion exist for past TMUA papers, so this is a raw mark only.</p>}
      <details>
        <summary>Evidence ({p.evidence.length})</summary>
        <ul class="ruled">{p.evidence.map((e, i) => <EvidenceRow key={i} p={p} e={e} />)}</ul>
      </details>
    </article>
  );
}

function EvidenceRow({ p, e }: { p: Prediction; e: Evidence }) {
  const g = gradeText(p, e.grade);
  return (
    <li>
      <span>{paperName(e.paper).split(':')[0]}, {e.kind === 'full' ? 'full paper' : 'half paper'}, {shortStamp(e.at)}</span>
      <span class="r c-num">{e.mark} of {e.max}{g === '' ? '' : `, ${g}${e.kind === 'half' ? ' scaled to the paper' : ''}`}</span>
      <span class="s">{e.timed ? 'Timed: counted.' : 'Over time: listed, not counted.'}</span>
    </li>
  );
}
