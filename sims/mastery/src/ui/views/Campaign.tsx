/**
 * The Cambridge Entry campaign screen (mastery/DESIGN-ADMISSIONS.md), in the minimalist
 * look: the five acts and matriculation as one timeline, the open act's requirements
 * under it; then plain ruled lists for the choices and the standing (the character sheet
 * with its effects); the calendar against the real deadlines; the papers, the application,
 * and the interviews; and the letters, which open in full on the Letters tab.
 */
import { useState } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import {
  COLLEGE_COMMON, COLLEGES, EFFECT_RULES, INTERVIEW_MAX, INTERVIEW_PASS, ROUTE_NAMES, SHAPE_NAMES, SUBJECT_NAMES,
  addInterview, collegeOf, letterText, moveSubject, newCampaign, paperName, recordInterview, removeInterview,
  type Act, type Admissions, type Campaign as CampaignState, type CampaignRoute, type CollegeId, type InterviewRecord, type InterviewShape,
  type Subject,
} from '@/model/campaign';
import { ESTIMATE_HOURS, TARGET_WEEK_HOURS, actDeadlines } from '@/model/campaignCalendar';
import { interviewPacket } from '@/model/campaignPackets';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { summarize, type Summary } from '@/model/campaignSummary';
import { loadDays } from '@/model/dayLog';
import { go } from '@/model/route';
import { now } from '@/model/store';
import { AppLink, CopyBlock, ROMAN, WithAdmissions, entryLine, longDay, shortStamp, useDeliverLetters } from '@/ui/campaignShared';

const update = (f: (c: CampaignState) => CampaignState): void => {
  const c = campaign.value;
  if (c !== null) saveCampaign(f(c));
};

const hours = (h: number): string => (Math.round(h * 10) / 10).toFixed(1);

export function CampaignView({ p }: { p: Progress }) {
  const c = campaign.value;
  if (c === null) return <BeginCampaign />;
  return <WithAdmissions>{(adm) => <CampaignBody adm={adm} c={c} p={p} />}</WithAdmissions>;
}

function BeginCampaign() {
  return (
    <section class="camp" aria-labelledby="camp-title">
      <h1 id="camp-title">Cambridge Entry</h1>
      <p class="lead">The preparation year, played by the real admissions route.</p>
      <section class="sec" aria-labelledby="choose-route">
        <div class="sec-h"><h2 id="choose-route">Choose your route</h2></div>
        <p>
          Albert, a mature applicant with a GED and six years as a software engineer, works his way to a Cambridge place by
          the real admissions route: three A levels, the TMUA, the January round at a mature college, interviews, and the offer.
          Both routes share Act I. The route can be switched until Act III.
        </p>
        <div class="c-acts">
          {(['maths', 'cs'] as const).map((r) => (
            <button key={r} type="button" class="c-btn" onClick={() => saveCampaign(newCampaign(r, now()))}>{ROUTE_NAMES[r]}</button>
          ))}
        </div>
      </section>
    </section>
  );
}

function CampaignBody({ adm, c, p }: { adm: Admissions; c: CampaignState; p: Progress }) {
  const [log] = useState(loadDays);
  const s = summarize(adm, c, p, log, now());
  useDeliverLetters(s);
  const college = collegeOf(c.college);

  return (
    <section class="camp" aria-labelledby="camp-title">
      <h1 id="camp-title">Cambridge Entry</h1>
      <p class="lead">
        {entryLine(s.projection)}. {ROUTE_NAMES[c.route]}, {college?.name ?? 'college not chosen'}, January round, TMUA in {c.tmuaSitting === 'october' ? 'October' : 'January'}.
      </p>
      <p class="meta c-status">
        <span>{ROUTE_NAMES[c.route]}</span>
        <span>{s.act > 5 ? 'Matriculated' : `Act ${ROMAN[s.act - 1]} of V`}</span>
        <span><span class="c-num">{s.daysStudied}</span> {s.daysStudied === 1 ? 'day' : 'days'} studied</span>
        <span>This week <span class="c-num">{hours(s.weekHours)} of {TARGET_WEEK_HOURS} h</span></span>
      </p>

      <Acts s={s} />

      <ChoicesSection c={c} s={s} />
      <Standing s={s} />
      <CalendarSection s={s} />
      <PapersSection adm={adm} />
      <ApplicationSection c={c} s={s} />
      <InterviewSection c={c} s={s} />
      <LettersSection adm={adm} c={c} s={s} />
      <section class="sec" aria-labelledby="how-in">
        <div class="sec-h"><h2 id="how-in">How you get in</h2></div>
        <p class="c-body">
          Finish each act's chapters and sit its papers. Completing Act V admits you and opens Part IA Michaelmas. Scores never
          block you; the <AppLink to={{ view: 'report' }}>report</AppLink> shows where they would have landed.
        </p>
      </section>
    </section>
  );
}

/** The acts as a timeline: past acts faded, the open act marked, with its requirements. */
function Acts({ s }: { s: Summary }) {
  return (
    <ol class="tl c-tl" aria-label="Acts">
      {s.acts.map((a, i) => {
        const cur = s.act === i + 1;
        return (
          <li key={a.n} class={`study${a.complete ? ' past' : cur ? ' now' : ''}`} aria-current={cur ? 'step' : undefined}>
            <span class="t">Act {ROMAN[i]}</span>
            <span class="n" />
            <div class="w">
              {cur && <span class="tag">current act</span>}
              <h2 class="it">{a.title}</h2>
              <div class="sub">{a.real}{a.complete ? <span class="visually-hidden">, complete</span> : null}</div>
              {cur && <Requirements act={a} s={s} />}
            </div>
          </li>
        );
      })}
      <li class={`quiet${s.act > 5 ? ' now' : ''}`}>
        <span class="t" />
        <span class="n" />
        <div class="w">
          <h2 class="it">Matriculation · Part IA Michaelmas opens</h2>
          <div class="sub">
            {s.act > 5
              ? 'Act V is complete. Part IA Michaelmas opens, and the results report is filed with your admission.'
              : 'Completing Act V admits you, and the report is filed with your admission.'}
          </div>
        </div>
      </li>
    </ol>
  );
}

function Requirements({ act, s }: { act: Act; s: Summary }) {
  return (
    <>
      <ul class="ruled c-req">
        {act.requirements.map((r) => {
          const share = r.need === 0 ? 0 : r.done / r.need;
          const done = r.done >= r.need;
          return (
            <li key={r.id}>
              <span>{r.label}</span>
              <span class={`r${done ? ' cam' : ''}`}>{r.id === 'lessons' ? `${Math.round(100 * share)}%` : `${r.done} of ${r.need}`}</span>
              <span class="s">{r.id === 'lessons' ? 'Course lessons mastered, until the book is restructured into Stage A chapters' : r.detail}</span>
            </li>
          );
        })}
      </ul>
      {s.next !== null && (
        <p class="c-next">
          Next paper: <AppLink to={{ view: 'paper', paperId: s.next.paperIds[0] as string }}>{s.next.title}</AppLink>{' '}
          <span class="c-tiny">({s.next.minutes} minutes, timed)</span>
        </p>
      )}
    </>
  );
}

function Toggle<T extends string>({ label, value, options, name, locked, set }: {
  label: string; value: T; options: readonly T[]; name: (x: T) => string; locked: string | null; set: (x: T) => void;
}) {
  return (
    <span class="c-toggle" role="group" aria-label={label}>
      {options.map((x) => (
        <button
          key={x} type="button" aria-pressed={value === x} disabled={locked !== null && value !== x}
          title={locked ?? undefined}
          onClick={() => { if (locked === null) set(x); }}
        >
          {name(x)}
        </button>
      ))}
    </span>
  );
}

function ChoicesSection({ c, s }: { c: CampaignState; s: Summary }) {
  const { locks } = s;
  const college = collegeOf(c.college);
  const f = college?.formats[c.route];
  return (
    <section class="sec" aria-labelledby="choices">
      <div class="sec-h"><h2 id="choices">Choices</h2></div>
      <ul class="ruled">
        <li>
          <span>Route</span>
          <span class="r">
            <Toggle
              label="Route" value={c.route} options={['maths', 'cs'] as const} name={(r) => ROUTE_NAMES[r]} locked={locks.route}
              set={(r) => update((x) => ({ ...x, route: r as CampaignRoute }))}
            />
          </span>
          {locks.route !== null && <span class="s">{locks.route}</span>}
        </li>
        <li>
          <label class="c-field" for="college">College</label>
          <span class="r">
            <select
              id="college" value={c.college ?? ''} disabled={locks.college !== null}
              onChange={(e) => {
                const v = (e.currentTarget as HTMLSelectElement).value;
                update((x) => ({ ...x, college: v === '' ? null : (v as CollegeId) }));
              }}
            >
              <option value="">Not chosen</option>
              {COLLEGES.map((x) => <option key={x.id} value={x.id}>{x.name}{x.formats[c.route].verified ? '' : ' (unverified)'}</option>)}
            </select>
          </span>
          {locks.college !== null && <span class="s">{locks.college}</span>}
          {f !== undefined && (
            <dl class="s c-format">
              <div><dt>Interview</dt><dd>{f.interviews}</dd></div>
              <div><dt>Test at interview</dt><dd>{f.test}</dd></div>
              <div><dt>Offer</dt><dd>{f.offer}</dd></div>
              <div><dt>Source</dt><dd>{f.source}{f.verified ? ', verified 2026-10-05' : ', unverified'}</dd></div>
            </dl>
          )}
          <span class="s">{COLLEGE_COMMON}</span>
        </li>
        <li>
          <span>A level order</span>
          <span class="r">Act I</span>
          <ol class="s c-order">
            {c.aLevelOrder.map((sub: Subject, i) => (
              <li key={sub}>
                <span>{SUBJECT_NAMES[sub]}</span>
                <span class="c-arrows">
                  <button type="button" class="c-icon" disabled={locks.order !== null || i === 0} aria-label={`Move ${SUBJECT_NAMES[sub]} earlier`} onClick={() => update((x) => ({ ...x, aLevelOrder: moveSubject(x.aLevelOrder, sub, -1) }))}>↑</button>
                  <button type="button" class="c-icon" disabled={locks.order !== null || i === c.aLevelOrder.length - 1} aria-label={`Move ${SUBJECT_NAMES[sub]} later`} onClick={() => update((x) => ({ ...x, aLevelOrder: moveSubject(x.aLevelOrder, sub, 1) }))}>↓</button>
                </span>
              </li>
            ))}
          </ol>
          {locks.order !== null && <span class="s">{locks.order}</span>}
        </li>
        <li>
          <span>TMUA sitting</span>
          <span class="r">
            <Toggle
              label="TMUA sitting" value={c.tmuaSitting} options={['october', 'january'] as const}
              name={(x) => (x === 'october' ? 'October' : 'January')} locked={locks.sitting}
              set={(x) => update((y) => ({ ...y, tmuaSitting: x }))}
            />
          </span>
          <span class="s">{locks.sitting ?? 'October is three months earlier, so Act II must finish sooner. Mature colleges accept the January sitting.'}</span>
        </li>
      </ul>
    </section>
  );
}

function Standing({ s }: { s: Summary }) {
  const on = new Set(s.effects.map((e) => e.id));
  const label = (id: string): string => s.stats.find((x) => x.id === id)?.label ?? id;
  return (
    <section class="sec" aria-labelledby="standing">
      <div class="sec-h"><h2 id="standing">Standing</h2><span>Albert, mature applicant, Brooklyn</span></div>
      <ul class="ruled">
        {s.stats.map((st) => (
          <li key={st.id} class="c-stat" title={st.basis}>
            <span>{st.label}</span>
            <span class="r v c-num">{st.value === null ? 'none' : st.value}</span>
          </li>
        ))}
      </ul>
      <p class="note">From real data only: course topics mastered by area, marks in timed papers, and mock interview marks. "none": no data yet.</p>
      <h3 class="c-h3">Effects</h3>
      <ul class="ruled">
        {EFFECT_RULES.map((r) => (
          <li key={r.id} class={on.has(r.id) ? 'here' : ''}>
            <span>{r.effect}</span>
            <span class={`r${on.has(r.id) ? ' cam' : ''}`}>{on.has(r.id) ? 'in force' : ''}</span>
            <span class="s">When {label(r.stat)} is {r.when === 'below' ? 'below' : 'at or above'} {r.threshold}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const shortDate = (d: string): string => (d >= '9999' ? 'never' : new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }));

function CalendarSection({ s }: { s: Summary }) {
  const { projection: pr, cycle: cy } = s;
  const deadlines = actDeadlines(cy);
  return (
    <section class="sec" aria-labelledby="calendar">
      <div class="sec-h"><h2 id="calendar">The calendar</h2></div>
      <p class={`c-entry${pr.slipped ? ' warn' : ''}`}>{entryLine(pr)}</p>
      <p class="c-tiny">
        Pace: {hours(s.pace.hoursPerWeek)} h a week{s.pace.logged ? ', from the blocks ticked off in the day planner over the last two weeks' : `, the ${TARGET_WEEK_HOURS}-hour target (no hours ticked off in the last two weeks)`}.
      </p>
      <div class="c-scroll">
        <table class="rec">
          <thead><tr><th scope="col">Act</th><th scope="col">Hours left</th><th scope="col">Projected</th><th scope="col">Deadline</th></tr></thead>
          <tbody>
            {s.acts.map((a, i) => {
              const d = deadlines[i] ?? null;
              const miss = d !== null && (pr.finishes[i] as string) > d.date;
              return (
                <tr key={a.n} class={a.complete ? 'done' : miss ? 'miss' : ''}>
                  <th scope="row">{ROMAN[i]}</th>
                  <td class="c-num">{a.complete ? 'done' : hours(s.remaining[i] ?? 0)}</td>
                  <td class="c-num">{a.complete ? '' : shortDate(pr.finishes[i] as string)}</td>
                  <td>{d === null ? 'none of its own' : <>{d.label}, {shortDate(d.date)}{d.basis === 'published' ? '' : '*'}</>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="note">
        Deadlines for October {cy.entry} entry. *Estimates: 2028 dates are not published, so the 2027-entry dates (UCAS 13 January, My Cambridge
        Application 20 January, interviews from 30 March, TMUA registration by 21 December) are used a year on; the TMUA sitting, STEP, and
        results days are approximate. Hours for chapters the book does not have yet are estimates: TMUA notes {ESTIMATE_HOURS.tmuaNotes} h,
        statement {ESTIMATE_HOURS.statement} h, Stage B {ESTIMATE_HOURS.stageB} h, Stage C {ESTIMATE_HOURS.stageC} h.
      </p>
    </section>
  );
}

function PapersSection({ adm }: { adm: Admissions }) {
  const papers = adm.registry.papers;
  const [id, setId] = useState(papers[0]?.id ?? '');
  const groups: [string, typeof papers][] = [
    ['A level', papers.filter((x) => x.exam === 'A level')],
    ['TMUA', papers.filter((x) => x.exam === 'TMUA')],
    ['STEP', papers.filter((x) => x.exam === 'STEP')],
  ];
  return (
    <section class="sec" aria-labelledby="past-papers">
      <div class="sec-h"><h2 id="past-papers">Past papers</h2></div>
      <p class="c-body">Any paper can be sat at any time; it counts for its act. Each runs to the clock with no pause.</p>
      <div class="c-inline">
        <label class="c-field c-grow">
          <span>Paper</span>
          <select value={id} onChange={(e) => setId((e.currentTarget as HTMLSelectElement).value)}>
            {groups.map(([g, list]) => (
              <optgroup key={g} label={g}>
                {list.map((x) => <option key={x.id} value={x.id}>{paperName(x)}{x.gap === undefined ? '' : ' (not published)'}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="button" class="c-btn" onClick={() => go({ view: 'paper', paperId: id })}>Open</button>
      </div>
    </section>
  );
}

function ApplicationSection({ c, s }: { c: CampaignState; s: Summary }) {
  const college = collegeOf(c.college);
  const canFile = s.act >= 3 && c.college !== null && c.applicationFiledAt === null;
  return (
    <section class="sec" aria-labelledby="application">
      <div class="sec-h"><h2 id="application">The application</h2><span>Act III</span></div>
      {c.applicationFiledAt !== null ? (
        <p class="c-body">Filed on {shortStamp(c.applicationFiledAt)}: {ROUTE_NAMES[c.route]} at {college?.name ?? 'your college'}, January round.</p>
      ) : (
        <>
          <p class="c-body">
            The January round at a mature college: UCAS by {longDay(s.cycle.ucas.date)}, My Cambridge Application by {longDay(s.cycle.mca.date)}
            {s.cycle.entry === 2027 ? '' : ' (the 2027-entry dates a year on, as estimates)'}. The optional 1,200-character statement goes to supervision for feedback.
          </p>
          <button type="button" class="c-btn" disabled={!canFile} onClick={() => update((x) => ({ ...x, applicationFiledAt: now() }))}>File the application</button>
          <p class="c-tiny">{s.act < 3 ? 'Opens in Act III.' : c.college === null ? 'Choose a college first.' : ''}</p>
        </>
      )}
    </section>
  );
}

function InterviewSection({ c, s }: { c: CampaignState; s: Summary }) {
  const [shape, setShape] = useState<InterviewShape>(c.interviews.some((i) => i.shape === 'pre-reading') ? 'induction' : 'pre-reading');
  const f = collegeOf(c.college)?.formats[c.route];
  const second = s.effects.some((e) => e.id === 'second-mock');
  return (
    <section class="sec" aria-labelledby="mock-interviews">
      <div class="sec-h"><h2 id="mock-interviews">Mock interviews</h2><span>Act IV</span></div>
      <p class="c-body">
        {f === undefined ? 'Choose a college to use its real format.' : `${collegeOf(c.college)?.name}: ${f.interviews}. Test at interview: ${f.test}.${f.verified ? '' : ' Unverified.'}`}
        {' '}Copy the packet into a Claude Code session; it runs the interview and prints a mark out of {INTERVIEW_MAX} ({INTERVIEW_PASS} is a pass) with notes.
      </p>
      {second && <p class="c-note">Interview is below 50, so a second mock is scheduled before Act V.</p>}
      <fieldset class="c-radios">
        <legend class="c-label">This interview</legend>
        {(['pre-reading', 'induction'] as const).map((x) => (
          <label key={x} class="c-radio">
            <input type="radio" name="interview-shape" checked={shape === x} onChange={() => setShape(x)} />
            <span>{SHAPE_NAMES[x]}</span>
          </label>
        ))}
      </fieldset>
      <CopyBlock
        id="interview-packet" label="Copy interview packet"
        make={() => {
          const t = now();
          const cur = campaign.value ?? c;
          saveCampaign(addInterview(cur, shape, t));
          return interviewPacket(cur, shape, t);
        }}
        after="Paste it into a Claude Code session, then record the mark below."
      />
      {c.interviews.length > 0 && (
        <ul class="ruled c-list">
          {[...c.interviews].reverse().map((i) => <InterviewRow key={i.id} i={i} />)}
        </ul>
      )}
    </section>
  );
}

function InterviewRow({ i }: { i: InterviewRecord }) {
  const [mark, setMark] = useState(i.mark === null ? '' : String(i.mark));
  const [notes, setNotes] = useState(i.notes);
  const [error, setError] = useState<string | null>(null);
  const save = (): void => {
    const t = mark.trim();
    const m = t === '' ? null : Number(t);
    if (m !== null && (!Number.isInteger(m) || m < 0 || m > INTERVIEW_MAX)) {
      setError(`The mark must be a whole number from 0 to ${INTERVIEW_MAX}.`);
      return;
    }
    setError(null);
    update((x) => recordInterview(x, i.id, m, notes.trim()));
  };
  return (
    <li class="c-interview">
      <span>{i.shape === 'pre-reading' ? 'Pre-reading' : 'Induction'}, {shortStamp(i.copiedAt)}</span>
      <span class="r">{i.mark === null ? 'No mark yet' : `${i.mark}/${INTERVIEW_MAX}`}</span>
      <div class="s">
        <div class="c-inline">
          <label class="c-field c-mark">
            <span>Mark out of {INTERVIEW_MAX}</span>
            <input type="number" inputMode="numeric" min={0} max={INTERVIEW_MAX} value={mark} onInput={(e) => setMark((e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="c-field c-grow">
            <span>Notes</span>
            <input type="text" value={notes} onInput={(e) => setNotes((e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        {error !== null && <p class="c-error" role="alert">{error}</p>}
        <div class="c-acts">
          <button type="button" class="c-btn" onClick={save}>Save</button>
          <button type="button" class="c-btn quiet" onClick={() => update((x) => removeInterview(x, i.id))}>Remove</button>
        </div>
      </div>
    </li>
  );
}

function LettersSection({ adm, c, s }: { adm: Admissions; c: CampaignState; s: Summary }) {
  return (
    <section class="sec" aria-labelledby="letters">
      <div class="sec-h"><h2 id="letters">Letters</h2></div>
      {c.letters.length === 0
        ? <p class="c-body">None yet. The first arrives when your application is filed.</p>
        : (
          <ul class="ruled">
            {[...c.letters].reverse().map((l) => (
              <li key={l.id}>
                <span><AppLink to={{ view: 'letters' }}>{letterText(adm, c, l.id, s.projection.entry).title}</AppLink></span>
                <span class="r">{shortStamp(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
