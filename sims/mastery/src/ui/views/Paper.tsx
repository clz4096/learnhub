/**
 * Exam mode for one past paper: the official link, the time allowed, and the rules; then a
 * countdown that starts once and cannot pause; then the marks. TMUA answers are checked here
 * against the official key; STEP and A level marks come from supervision, copied out with
 * "Copy for supervision" and typed back in. No feedback until the clock is finished.
 */
import { useEffect, useState } from 'preact/hooks';
import type { RegistryPaper } from '@learnhub/content/admissions';
import {
  STEP_COUNTED, STEP_MARKS_PER_QUESTION, STEP_QUESTIONS, TMUA_OPTIONS, TMUA_QUESTIONS,
  acts, activeSitting, currentAct, finishSitting, paperLink, paperName, recordMarks, sittingScore, sourceUrls, startSitting, stepTotal,
  type Admissions, type Campaign, type Sitting,
} from '@/model/campaign';
import { paperPacket } from '@/model/campaignPackets';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { courseInputs } from '@/model/campaignSummary';
import { progress, now } from '@/model/store';
import { AppLink, CopyBlock, WithAdmissions, shortStamp } from '@/ui/campaignShared';
import { BackLink } from '@/ui/BackLink';

const update = (f: (c: Campaign) => Campaign): void => {
  const c = campaign.value;
  if (c !== null) saveCampaign(f(c));
};

export function PaperView({ paperId }: { paperId: string }) {
  const c = campaign.value;
  if (c === null) {
    return (
      <section class="camp">
        <h1>Past paper</h1>
        <p class="c-body">Begin the campaign first: <AppLink to={{ view: 'campaign' }}>Campaign</AppLink>.</p>
      </section>
    );
  }
  return <WithAdmissions>{(adm) => <PaperBody adm={adm} c={c} paperId={paperId} />}</WithAdmissions>;
}

/** h:mm:ss, or m:ss under an hour. */
export function clock(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p2 = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p2(m)}:${p2(s)}` : `${m}:${p2(s)}`;
}

function PaperBody({ adm, c, paperId }: { adm: Admissions; c: Campaign; paperId: string }) {
  const paper = adm.registryPaper(paperId);
  if (paper === undefined) {
    return (
      <section class="camp">
        <div><BackLink to={{ view: 'campaign' }} label="Back to the campaign" /></div>
        <h1>No such paper</h1>
        <p class="c-body">There is no paper {paperId} in the registry.</p>
      </section>
    );
  }
  const running = activeSitting(c);
  const mine = c.sittings.filter((s) => s.paperId === paperId);
  const unmarked = [...mine].reverse().find((s) => s.finishedAt !== null && sittingScore(adm, s) === null);
  const link = paperLink(paper);
  const p = progress.value;
  const act = p === null ? 1 : currentAct(acts(adm, c, courseInputs(p)));
  if (running !== undefined && running.paperId === paperId) return <TimedPaper paper={paper} s={running} />;

  return (
    <section class="camp" aria-labelledby="paper-title">
      <div><BackLink to={{ view: 'campaign' }} label="Back to the campaign" /></div>
      <div class="c-head">
        <div>
          <div class="c-kicker">{paper.exam}, {paper.board}{paper.qualification === undefined ? '' : `, ${paper.qualification}`}</div>
          <h1 id="paper-title">{paperName(paper)}</h1>
        </div>
      </div>
      <div class="c-cols">
        <div class="c-stack">
          <div class="c-card c-pad">
            <dl class="c-format">
              <div><dt>Time allowed</dt><dd>{paper.duration_minutes} minutes</dd></div>
              <div><dt>Questions</dt><dd>{paper.questions}</dd></div>
              <div><dt>Marks</dt><dd>{paper.exam === 'STEP' ? `${STEP_COUNTED * STEP_MARKS_PER_QUESTION} (best ${STEP_COUNTED} of ${STEP_QUESTIONS})` : paper.total_marks}</dd></div>
              <div><dt>Rules</dt><dd>{paper.rules}</dd></div>
            </dl>
            {paper.gap !== undefined && <p class="c-note">{paper.gap}</p>}
            {link !== null && (
              <p class="c-body">
                Question paper: <a href={link.url} target="_blank" rel="noopener noreferrer">{link.file === undefined ? 'the official PDF' : 'the official zip'}</a>
                {link.file === undefined ? '' : `; open ${link.file} inside it`}. Open it when the clock starts.
              </p>
            )}
          </div>

          {running !== undefined && running.paperId !== paperId ? (
            <div class="c-card c-pad">
              <p class="c-body">Another paper is running: <AppLink to={{ view: 'paper', paperId: running.paperId }}>{adm.registryPaper(running.paperId) === undefined ? running.paperId : paperName(adm.registryPaper(running.paperId) as RegistryPaper)}</AppLink>. Finish it first.</p>
            </div>
          ) : unmarked !== undefined ? (
            <Marks adm={adm} paper={paper} s={unmarked} />
          ) : (
            <div class="c-card c-pad">
              <h2>Sit it timed</h2>
              <p class="c-body">The clock runs from Start to Finish with no pause, as in the exam hall. Nothing is marked until you finish.</p>
              <button type="button" class="c-btn" disabled={link === null} onClick={() => update((x) => startSitting(x, paperId, act, now()))}>Start the clock</button>
              {link === null && <p class="c-tiny">This paper is not published yet.</p>}
            </div>
          )}
        </div>
        <div class="c-stack">
          <Sittings adm={adm} paper={paper} list={mine} />
        </div>
      </div>
    </section>
  );
}

const FLAG_KEY = 'mastery.flags.v1';

/** The parts flagged to come back to, per sitting, in this browser only. */
function loadFlags(sittingId: string): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(FLAG_KEY) ?? '{}');
    const xs = typeof v === 'object' && v !== null ? (v as Record<string, unknown>)[sittingId] : undefined;
    return Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveFlags(sittingId: string, flags: readonly string[]): void {
  try {
    // One sitting runs at a time, so only its flags are kept.
    localStorage.setItem(FLAG_KEY, JSON.stringify({ [sittingId]: flags }));
  } catch {
    // Not kept; the flags last for this page.
  }
}

/**
 * A paper while its clock runs (mastery/design-v4.html, "Timed problem"), in focus mode: the
 * source in mono, a large timer, the parts flagged to come back to, and two actions.
 */
function TimedPaper({ paper, s }: { paper: RegistryPaper; s: Sitting }) {
  return (
    <TimedScreen
      paper={paper} title={paperName(paper)} flagsId={s.id} startedAt={s.startedAt} totalMs={paper.duration_minutes * 60_000}
      onFinish={() => update((x) => finishSitting(x, s.id, now()))}
    />
  );
}

/**
 * The timed screen for any timed work on a paper: a whole paper sat in the campaign, or a
 * rung of the timed ladder (part of a paper, at the paper's pace). `flagsId` names the
 * attempt the flags belong to; `onFinish` stops the clock.
 */
export function TimedScreen({ paper, title, eyebrow, flagsId, startedAt, totalMs, onFinish }: {
  paper: RegistryPaper;
  title: string;
  /** Defaults to "STEP · 2025 · STEP 2". */
  eyebrow?: string;
  flagsId: string;
  startedAt: number;
  totalMs: number;
  onFinish: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const [flags, setFlags] = useState(() => loadFlags(flagsId));
  const [adding, setAdding] = useState(false);
  const [part, setPart] = useState('');
  const left = startedAt + totalMs - now();
  const over = left <= 0;
  const link = paperLink(paper);
  const setAll = (xs: string[]): void => { setFlags(xs); saveFlags(flagsId, xs); };
  const add = (): void => {
    const x = part.trim();
    if (x !== '' && !flags.includes(x)) setAll([...flags, x]);
    setPart('');
    setAdding(false);
  };
  return (
    <section class="ds-page ds-timed" aria-labelledby="paper-title">
      <div class="ds-eyebrow">{eyebrow ?? `${paper.exam} · ${paper.year} · ${paper.paper}`}</div>
      <h1 id="paper-title" class="ds-h1">{title}</h1>
      <div class={`ds-big${over ? ' over' : ''}`} role="timer" aria-live="off" aria-label={over ? `Time is up, ${clock(-left)} over` : `${clock(left)} left`}>
        {over ? `+${clock(-left)}` : clock(left)}
      </div>
      <p class="ds-meta ds-center">{over ? 'time is up · put the pen down and finish' : `remaining of ${clock(totalMs)}`}</p>
      <div class="ds-flags">
        <span class="ds-eyebrow">Flagged to come back to</span>
        <div>
          {flags.map((f) => (
            <button key={f} type="button" class="ds-chip" onClick={() => setAll(flags.filter((y) => y !== f))} aria-label={`${f}, flagged. Press to unflag.`}>{f}</button>
          ))}
          {adding
            ? (
              <form class="ds-flag-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
                <label class="visually-hidden" for="flag-part">Part to flag, for example Q3 (ii)</label>
                <input id="flag-part" type="text" value={part} placeholder="Q3 (ii)" autoFocus onInput={(e) => setPart((e.currentTarget as HTMLInputElement).value)} />
                <button type="submit" class="ds-chip">Flag</button>
              </form>
            )
            : <button type="button" class="ds-chip ds-ghostchip" onClick={() => setAdding(true)}>+ flag a part</button>}
        </div>
      </div>
      <div class="ds-stack">
        {link !== null && (
          <a class="ds-btn wide ghost" href={link.url} target="_blank" rel="noopener noreferrer">
            Open the paper <span aria-hidden="true">↗</span><span class="visually-hidden">(opens in a new tab{link.file === undefined ? '' : `; open ${link.file} inside the zip`})</span>
          </a>
        )}
        <button type="button" class="ds-btn wide" onClick={() => { onFinish(); setAll([]); }}>Finish and mark</button>
      </div>
      <p class="c-tiny">Started {new Date(startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. No pause; leaving this screen does not stop the clock.</p>
    </section>
  );
}

function Marks({ adm, paper, s }: { adm: Admissions; paper: RegistryPaper; s: Sitting }) {
  if (paper.exam === 'TMUA') return <TmuaAnswers s={s} />;
  return (
    <div class="c-card c-pad">
      <h2>Marking</h2>
      <p class="c-body">
        Send your script to supervision: copy the block, paste it into a Claude Code session with photos of your answers, and type the marks it
        prints here.
      </p>
      <CopyBlock id={`packet-${s.id}`} label="Copy for supervision" make={() => paperPacket(paper, s)} after="Paste it into a Claude Code session with photos of your script." />
      {paper.exam === 'STEP' ? <StepMarks s={s} /> : <TotalMark s={s} max={paper.total_marks} />}
      <MarkScheme adm={adm} paper={paper} />
    </div>
  );
}

function MarkScheme({ paper }: { adm: Admissions; paper: RegistryPaper }) {
  const ms = sourceUrls(paper, 'mark_scheme');
  if (ms.length === 0) return null;
  return <p class="c-tiny">The mark scheme is for the supervisor: {ms.map((m, i) => <a key={i} href={m.url} target="_blank" rel="noopener noreferrer">{m.file ?? 'mark scheme'}</a>)}.</p>;
}

function TmuaAnswers({ s }: { s: Sitting }) {
  const [answers, setAnswers] = useState<(string | null)[]>(() => Array<null>(TMUA_QUESTIONS).fill(null));
  return (
    <form class="c-card c-pad" onSubmit={(e) => { e.preventDefault(); update((x) => recordMarks(x, s.id, { answers })); }}>
      <h2>Your answers</h2>
      <p class="c-body">Enter the letter you chose for each question; leave a blank for no answer. The app checks them against the official key.</p>
      <div class="c-answers">
        {answers.map((a, i) => (
          <label key={i} class="c-field">
            <span>Q{i + 1}</span>
            <select value={a ?? ''} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; setAnswers((xs) => xs.map((y, j) => (j === i ? (v === '' ? null : v) : y))); }}>
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

function StepMarks({ s }: { s: Sitting }) {
  const [marks, setMarks] = useState<string[]>(() => Array<string>(STEP_QUESTIONS).fill(''));
  const [error, setError] = useState<string | null>(null);
  const parsed = marks.map((m) => (m.trim() === '' ? null : Number(m)));
  const bad = parsed.some((m) => m !== null && (!Number.isInteger(m) || m < 0 || m > STEP_MARKS_PER_QUESTION));
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (bad) { setError(`Each mark must be a whole number from 0 to ${STEP_MARKS_PER_QUESTION}, or blank for not attempted.`); return; }
      update((x) => recordMarks(x, s.id, { questionMarks: parsed }));
    }}
    >
      <div class="c-label c-gap">Marks per question, from supervision</div>
      <div class="c-answers">
        {marks.map((m, i) => (
          <label key={i} class="c-field">
            <span>Q{i + 1}</span>
            <input type="number" inputMode="numeric" min={0} max={STEP_MARKS_PER_QUESTION} value={m} onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setMarks((xs) => xs.map((y, j) => (j === i ? v : y))); }} />
          </label>
        ))}
      </div>
      <p class="c-tiny">Best {STEP_COUNTED} count: {bad ? 'fix the marks above' : `${stepTotal(parsed)} of ${STEP_COUNTED * STEP_MARKS_PER_QUESTION}`}.</p>
      {error !== null && <p class="c-error" role="alert">{error}</p>}
      <button type="submit" class="c-btn">Save the marks</button>
    </form>
  );
}

function TotalMark({ s, max }: { s: Sitting; max: number }) {
  const [v, setV] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const n = Number(v);
      if (v.trim() === '' || !Number.isInteger(n) || n < 0 || n > max) { setError(`The total must be a whole number from 0 to ${max}.`); return; }
      update((x) => recordMarks(x, s.id, { total: n }));
    }}
    >
      <div class="c-inline">
        <label class="c-field c-mark">
          <span>Total out of {max}, from supervision</span>
          <input type="number" inputMode="numeric" min={0} max={max} value={v} onInput={(e) => setV((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <button type="submit" class="c-btn">Save the mark</button>
      </div>
      {error !== null && <p class="c-error" role="alert">{error}</p>}
    </form>
  );
}

function Sittings({ adm, paper, list }: { adm: Admissions; paper: RegistryPaper; list: Sitting[] }) {
  const done = list.filter((s) => sittingScore(adm, s) !== null);
  return (
    <div class="c-card c-pad">
      <h2>Your sittings</h2>
      {done.length === 0 ? <p class="c-tiny">None marked yet.</p> : (
        <ul class="c-list">
          {[...done].reverse().map((s) => {
            const sc = sittingScore(adm, s) as { mark: number; max: number };
            const took = Math.round(((s.finishedAt as number) - s.startedAt) / 60_000);
            return (
              <li key={s.id}>
                <b class="c-num">{sc.mark} / {sc.max}</b> <span class="c-tiny">{shortStamp(s.startedAt)}, {took} of {paper.duration_minutes} minutes</span>
                {paper.exam === 'TMUA' && s.answers !== undefined && <TmuaCheck adm={adm} paper={paper} answers={s.answers} />}
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && <p class="c-tiny">Grades and comparisons: the <AppLink to={{ view: 'report' }}>report</AppLink>.</p>}
    </div>
  );
}

function TmuaCheck({ adm, paper, answers }: { adm: Admissions; paper: RegistryPaper; answers: readonly (string | null)[] }) {
  const key = adm.tmuaKey(paper.year, paper.paper.endsWith('2') ? 2 : 1) ?? '';
  return (
    <ol class="c-check" aria-label="Answers against the key">
      {answers.map((a, i) => {
        const right = a !== null && a === key[i];
        return <li key={i} class={right ? 'right' : 'wrong'}>Q{i + 1} {a ?? 'blank'}{right ? '' : `, key ${key[i]}`}</li>;
      })}
    </ol>
  );
}
