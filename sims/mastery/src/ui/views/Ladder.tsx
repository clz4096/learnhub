/**
 * The timed ladder for one exam (model/ladder.ts), under Admission › Papers: the three
 * rungs (one question, half a paper, the full paper) with what opens each, the next thing
 * to sit on every open rung, the marking of finished work, and the results so far.
 *
 * Starting a rung runs its clock in the timed-paper focus screen (TimedScreen: big mono
 * timer, flags, Finish and mark). The full paper is a campaign sitting, so its rung opens
 * the paper's own exam-mode screen. Attempts are saved through the ladder store, which the
 * outcome panel reads, so a timed half paper counts there once marked.
 */
import { useState } from 'preact/hooks';
import type { RegistryPaper } from '@learnhub/content/admissions';
import { STEP_MARKS_PER_QUESTION, TMUA_OPTIONS, activeSitting, sourceUrls, type Admissions, type Campaign } from '@/model/campaign';
import { ladderPacket } from '@/model/campaignPackets';
import { campaign } from '@/model/campaignStore';
import {
  EXAMS, RUNGS, RUNG_NAMES, activeAttempt, attemptScore, countedOf, finishAttempt, ladderResults, ladderStatus, nextLadderItem,
  recordAttemptMarks, rungMinutes, startAttempt,
  type Exam, type LadderAttempt, type PartRung, type Rung, type RungStatus,
} from '@/model/ladder';
import { examOf, partName, unmarkedAttempts } from '@/model/ladderNext';
import { discardAttempt, ladder, loadLadder, saveLadder } from '@/model/ladderStore';
import { withReadiness } from '@/model/readiness';
import { forecastFor, learnedReadiness } from '@/model/readinessBar';
import { go } from '@/model/route';
import { now, progress } from '@/model/store';
import { AppLink, CopyBlock, WithAdmissions, shortStamp } from '@/ui/campaignShared';
import { AdmissionTabs } from '@/ui/views/Campaign';
import { TimedScreen } from '@/ui/views/Paper';

/** Rung names short enough for a row's narrow left column. */
const RUNG_SHORT: Readonly<Record<Rung, string>> = { question: '1 question', half: 'half', full: 'full' };

const RUNG_WHAT: Readonly<Record<PartRung, string>> = {
  question: 'One question against the clock, at the paper\'s own pace.',
  half: 'Half a paper in half the time.',
};

export function LadderView({ exam }: { exam: Exam }) {
  return <WithAdmissions>{(adm) => <LadderBody adm={adm} exam={exam} />}</WithAdmissions>;
}

function LadderBody({ adm, exam }: { adm: Admissions; exam: Exam }) {
  // Read the stored attempts before the first render, so a running clock shows at once after a reload.
  useState(() => loadLadder(adm));
  const attempts = ladder.value;
  const c = campaign.value;
  const running = activeAttempt(attempts);
  const runningPaper = running === undefined ? undefined : adm.registryPaper(running.paperId);
  if (running !== undefined && runningPaper !== undefined && runningPaper.exam === exam) {
    return (
      <TimedScreen
        paper={runningPaper} title={partName(runningPaper, running.rung, running.questions)}
        eyebrow={`Timed ladder · ${RUNG_NAMES[running.rung]}`}
        flagsId={running.id} startedAt={running.startedAt} totalMs={rungMinutes(runningPaper, running.rung) * 60_000}
        onFinish={() => saveLadder(finishAttempt(ladder.peek(), running.id, now()))}
      />
    );
  }

  const p = progress.value;
  const ready = p === null ? null : learnedReadiness(p, exam, adm, c, attempts);
  const status = ready === null ? ladderStatus(adm, c, attempts, exam) : withReadiness(ladderStatus(adm, c, attempts, exam), ready);
  const unmarked = unmarkedAttempts(adm, attempts, exam);
  const results = ladderResults(adm, attempts, exam).reverse();
  const sitting = c === null ? undefined : activeSitting(c);
  const busy: { text: string; to: Parameters<typeof go>[0] } | null = running !== undefined
    ? { text: `A ${RUNG_NAMES[running.rung].toLowerCase()} on the ${examOf(adm, running) ?? ''} ladder is running.`, to: { view: 'ladder', exam: examOf(adm, running) ?? exam } }
    : sitting !== undefined ? { text: 'A campaign paper is running.', to: { view: 'paper', paperId: sitting.paperId } } : null;

  return (
    <section class="camp ds-admission ds-ladder" aria-labelledby="ladder-title">
      <div class="ds-eyebrow">Admission · Papers</div>
      <h1 id="ladder-title" class="ds-h1">Timed ladder: {exam}</h1>
      <p class="ds-meta">One question, then half a paper, then the full paper, each against the clock at the paper's own pace.</p>
      {ready !== null && (
        <p class="ds-note">
          {ready.ready ? 'Ready: ' : 'Not ready yet: '}{ready.mastered} of {ready.total} syllabus topics mastered ({ready.need} needed), from {ready.source}.
        </p>
      )}
      <AdmissionTabs />
      <nav class="ds-subtabs" aria-label="Exam">
        {EXAMS.map((e) => (
          <AppLink key={e} to={{ view: 'ladder', exam: e }} class={e === exam ? 'on' : undefined} aria-current={e === exam ? 'page' : undefined}>{e}</AppLink>
        ))}
      </nav>

      <ol class="ds-rail" aria-label="Rungs">
        {status.rungs.map((r, i) => <RungRow key={r.rung} r={r} n={i + 1} current={status.current === r.rung} />)}
      </ol>

      {busy !== null && (
        <p class="ds-note" role="status">{busy.text} Finish it first: <AppLink to={busy.to}>go to it</AppLink>.</p>
      )}

      {unmarked.map((a) => <MarkAttempt key={a.id} adm={adm} a={a} />)}

      <section class="ds-sect" aria-labelledby="ladder-next">
        <div class="ds-eyebrow ds-sect-h"><h2 id="ladder-next">Sit next</h2></div>
        <SitNext adm={adm} c={c} attempts={attempts} exam={exam} rungs={status.rungs} disabled={busy !== null} />
      </section>

      <section class="ds-sect" aria-labelledby="ladder-results">
        <div class="ds-eyebrow ds-sect-h"><h2 id="ladder-results">Your timed work</h2><span>{results.length}</span></div>
        {results.length === 0
          ? <p class="ds-note">Nothing marked yet. Marked half papers also count in your predicted results (You).</p>
          : (
            <ul class="ds-list plain">
              {results.map((x) => {
                const took = Math.round(((x.attempt.finishedAt as number) - x.attempt.startedAt) / 60_000);
                const verdict = !x.timed ? 'over time, not counted' : x.passed ? 'passed' : 'not passed';
                return (
                  <li key={x.attempt.id}>
                    <div class="ds-li">
                      <span class="ds-x">{partName(x.paper, x.attempt.rung, x.attempt.questions)}<small>{shortStamp(x.attempt.startedAt)} · {took} of {Math.round(rungMinutes(x.paper, x.attempt.rung))} min · {verdict}</small></span>
                      <span class={`ds-r${x.passed ? ' cam' : ''}`}>{x.score.mark} / {x.score.max}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </section>
    </section>
  );
}

function RungRow({ r, n, current }: { r: RungStatus; n: number; current: boolean }) {
  const passedEnough = r.need !== null && r.passed >= r.need;
  const line = !r.open
    ? r.why
    : r.rung === 'full'
      ? (r.done === 0 ? 'Open: sit a whole paper in exam mode.' : `${r.done} timed ${r.done === 1 ? 'sitting' : 'sittings'} marked.`)
      : `${RUNG_WHAT[r.rung]} ${r.passed} of ${r.need ?? 0} passed to open the next rung${r.done > r.passed ? `, from ${r.done} timed` : ''}.`;
  const right = !r.open ? 'locked' : current ? 'here' : passedEnough ? 'passed' : 'open';
  return (
    <li class={passedEnough && !current ? 'done' : current ? 'cur' : undefined} aria-current={current ? 'step' : undefined} data-rung={r.rung}>
      <span class="ds-rn" aria-hidden="true">{n}</span>
      <span class="ds-x">
        <h3 class="ds-rail-t">{RUNG_NAMES[r.rung]}<span class="visually-hidden">, {right}</span></h3>
        <small class="ds-why">{line}</small>
      </span>
      <span class="ds-r" aria-hidden="true">{right}</span>
    </li>
  );
}

function SitNext({ adm, c, attempts, exam, rungs, disabled }: {
  adm: Admissions; c: Campaign | null; attempts: readonly LadderAttempt[]; exam: Exam; rungs: readonly RungStatus[]; disabled: boolean;
}) {
  const open = RUNGS.filter((rung) => rungs.find((r) => r.rung === rung)?.open === true).reverse();
  const rows = open.map((rung) => ({ rung, next: nextLadderItem(adm, c, attempts, exam, rung) }));
  if (rows.length === 0) return <p class="ds-note">Nothing to sit until the first rung opens. Until then: lessons, practice, and review.</p>;
  return (
    <ul class="ds-list">
      {rows.map(({ rung, next }) => {
        if (next === null) {
          return (
            <li key={rung}>
              <div class="ds-li">
                <span class="ds-t">{RUNG_SHORT[rung]}</span>
                <span class="ds-x quiet">{rung === 'full' && c === null ? 'Begin the campaign to sit full papers in exam mode.' : 'Every paper here has been tried on this rung.'}</span>
                <span class="ds-r" />
              </div>
            </li>
          );
        }
        const minutes = Math.round(rungMinutes(next.paper, rung));
        const body = (
          <>
            <span class="ds-t">{RUNG_SHORT[rung]}</span>
            <span class="ds-x">{partName(next.paper, rung, next.questions)}<small>{minutes} min{rung === 'full' ? ' · exam mode' : ' · the clock starts at once'}</small></span>
            <span class="ds-r" aria-hidden="true">{rung === 'full' ? 'open ›' : 'start ›'}</span>
          </>
        );
        if (rung === 'full') return <li key={rung}><AppLink to={{ view: 'paper', paperId: next.paper.id }} class="ds-li">{body}</AppLink></li>;
        return (
          <li key={rung}>
            <button
              type="button" class="ds-li" disabled={disabled}
              aria-label={`Start the clock: ${RUNG_NAMES[rung]}, ${partName(next.paper, rung, next.questions)}, ${minutes} minutes`}
              onClick={() => {
                // Rule 8: the prediction is recorded before the clock starts.
                const doc = progress.peek();
                const all = ladder.peek();
                const forecast = doc === null ? undefined : forecastFor(adm, doc, campaign.peek(), all, next.paper);
                saveLadder(startAttempt(adm, all, next.paper.id, rung, next.questions, now(), forecast));
              }}
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Marking a finished attempt: TMUA letters checked by the app; STEP and A level marks from supervision. */
function MarkAttempt({ adm, a }: { adm: Admissions; a: LadderAttempt }) {
  const paper = adm.registryPaper(a.paperId) as RegistryPaper;
  const title = partName(paper, a.rung, a.questions);
  const [error, setError] = useState<string | null>(null);
  const save = (m: Parameters<typeof recordAttemptMarks>[3]): void => {
    const next = recordAttemptMarks(adm, ladder.peek(), a.id, m);
    const got = next.find((x) => x.id === a.id);
    if (got === undefined || attemptScore(adm, got) === null) { setError('Those marks do not fit this attempt. Check each one.'); return; }
    setError(null);
    saveLadder(next);
  };
  const ms = sourceUrls(paper, 'mark_scheme');
  return (
    <div class="c-card c-pad" role="group" aria-label={`Mark: ${title}`}>
      <h2>Mark: {title}</h2>
      {paper.exam === 'TMUA'
        ? <TmuaLetters a={a} onSave={(answers) => save({ answers })} />
        : (
          <>
            <p class="c-body">Send your script to supervision: copy the block, paste it into a Claude Code session with photos of your answers, and type the marks it prints here.</p>
            <CopyBlock id={`ladder-packet-${a.id}`} label="Copy for supervision" make={() => ladderPacket(paper, a)} after="Paste it into a Claude Code session with photos of your script." />
            {paper.exam === 'STEP'
              ? <StepLadderMarks a={a} counted={countedOf(paper, a.rung)} onSave={(marks) => save({ marks })} onError={setError} />
              : <TotalOutOf max={paper.total_marks} onSave={(total, outOf) => save({ total, outOf })} onError={setError} />}
            {ms.length > 0 && <p class="c-tiny">The mark scheme is for the supervisor: {ms.map((m, i) => <a key={i} href={m.url} target="_blank" rel="noopener noreferrer">{m.file ?? 'mark scheme'}</a>)}.</p>}
          </>
        )}
      {error !== null && <p class="c-error" role="alert">{error}</p>}
      <button type="button" class="linklike" onClick={() => discardAttempt(a.id)}>Discard this attempt</button>
    </div>
  );
}

function TmuaLetters({ a, onSave }: { a: LadderAttempt; onSave: (answers: (string | null)[]) => void }) {
  const [answers, setAnswers] = useState<(string | null)[]>(() => a.questions.map(() => null));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(answers); }}>
      <p class="c-body">Enter the letter you chose for each question; leave a blank for no answer. The app checks them against the official key.</p>
      <div class="c-answers">
        {a.questions.map((q, i) => (
          <label key={q} class="c-field">
            <span>Q{q}</span>
            <select value={answers[i] ?? ''} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; setAnswers((xs) => xs.map((y, j) => (j === i ? (v === '' ? null : v) : y))); }}>
              <option value="">blank</option>
              {TMUA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button type="submit" class="c-btn">Check my answers</button>
    </form>
  );
}

function StepLadderMarks({ a, counted, onSave, onError }: { a: LadderAttempt; counted: number; onSave: (marks: (number | null)[]) => void; onError: (e: string) => void }) {
  const [marks, setMarks] = useState<string[]>(() => a.questions.map(() => ''));
  const parsed = marks.map((m) => (m.trim() === '' ? null : Number(m)));
  const bad = parsed.some((m) => m !== null && (!Number.isInteger(m) || m < 0 || m > STEP_MARKS_PER_QUESTION));
  const best = parsed.filter((m): m is number => m !== null).sort((x, y) => y - x).slice(0, counted).reduce((s, m) => s + m, 0);
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (bad) { onError(`Each mark must be a whole number from 0 to ${STEP_MARKS_PER_QUESTION}, or blank for not attempted.`); return; }
      onSave(parsed);
    }}
    >
      <div class="c-label c-gap">Marks per question, from supervision</div>
      <div class="c-answers">
        {a.questions.map((q, i) => (
          <label key={q} class="c-field">
            <span>Q{q}</span>
            <input type="number" inputMode="numeric" min={0} max={STEP_MARKS_PER_QUESTION} value={marks[i]} onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setMarks((xs) => xs.map((y, j) => (j === i ? v : y))); }} />
          </label>
        ))}
      </div>
      <p class="c-tiny">Best {counted} count: {bad ? 'fix the marks above' : `${best} of ${counted * STEP_MARKS_PER_QUESTION}`}.</p>
      <button type="submit" class="c-btn">Save the marks</button>
    </form>
  );
}

function TotalOutOf({ max, onSave, onError }: { max: number; onSave: (total: number, outOf: number) => void; onError: (e: string) => void }) {
  const [total, setTotal] = useState('');
  const [outOf, setOutOf] = useState('');
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const t = Number(total);
      const o = Number(outOf);
      if (outOf.trim() === '' || !Number.isInteger(o) || o < 1 || o > max) { onError(`What the questions are worth must be a whole number from 1 to ${max}.`); return; }
      if (total.trim() === '' || !Number.isInteger(t) || t < 0 || t > o) { onError(`The mark must be a whole number from 0 to ${o}.`); return; }
      onSave(t, o);
    }}
    >
      <div class="c-inline">
        <label class="c-field c-mark">
          <span>Mark, from supervision</span>
          <input type="number" inputMode="numeric" min={0} value={total} onInput={(e) => setTotal((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="c-field c-mark">
          <span>Out of (from the mark scheme)</span>
          <input type="number" inputMode="numeric" min={1} max={max} value={outOf} onInput={(e) => setOutOf((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="c-btn">Save the mark</button>
      </div>
    </form>
  );
}

/** The ladders on Admission › Papers: each exam with its highest open rung. */
export function LadderLinks({ adm }: { adm: Admissions }) {
  useState(() => loadLadder(adm));
  const attempts = ladder.value;
  const c = campaign.value;
  return (
    <section class="sec" aria-labelledby="timed-ladder">
      <div class="sec-h"><h2 id="timed-ladder">Timed ladder</h2></div>
      <p class="c-body">One question, then half a paper, then the full paper, each opened by results on the one below.</p>
      <ul class="ds-list">
        {EXAMS.map((exam) => {
          const s = ladderStatus(adm, c, attempts, exam);
          const running = activeAttempt(attempts);
          const live = running !== undefined && examOf(adm, running) === exam;
          return (
            <li key={exam}>
              <AppLink to={{ view: 'ladder', exam }} class="ds-li">
                <span class="ds-t">{exam}</span>
                <span class="ds-x">{RUNG_NAMES[s.current]}<small>{live ? 'clock running' : `${s.rungs.filter((r) => r.open).length} of 3 rungs open`}</small></span>
                <span class="ds-r" aria-hidden="true">›</span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
