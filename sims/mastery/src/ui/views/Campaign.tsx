/**
 * The Cambridge Entry campaign screen (mastery/DESIGN-ADMISSIONS.md): the route, the five
 * acts and matriculation, the open act's requirements, the papers, the application and the
 * interviews, the calendar against the real deadlines, the character sheet with its effects,
 * and the letters. Layout and look from the Cambridge Entry prototype's Campaign tab.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import {
  COLLEGE_COMMON, COLLEGES, EFFECT_RULES, INTERVIEW_MAX, INTERVIEW_PASS, ROUTE_NAMES, SHAPE_NAMES, SUBJECT_NAMES,
  addInterview, collegeOf, deliverLetters, letterText, moveSubject, newCampaign, paperName, recordInterview, removeInterview,
  type Act, type Admissions, type Campaign as CampaignState, type CampaignRoute, type CollegeId, type InterviewRecord, type InterviewShape,
  type Stat, type Subject,
} from '@/model/campaign';
import { ESTIMATE_HOURS, TARGET_WEEK_HOURS, actDeadlines } from '@/model/campaignCalendar';
import { interviewPacket } from '@/model/campaignPackets';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { summarize, type Summary } from '@/model/campaignSummary';
import { loadDays } from '@/model/dayLog';
import { go } from '@/model/route';
import { now } from '@/model/store';
import { AppLink, CopyBlock, ROMAN, WithAdmissions, longDay, shortStamp } from '@/ui/campaignShared';

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

function Disclaimer() {
  return <p class="c-tiny">A personal study plan. Not affiliated with the University of Cambridge.</p>;
}

function BeginCampaign() {
  return (
    <section class="camp" aria-labelledby="camp-title">
      <div class="c-head">
        <div><div class="c-kicker">Preparation year</div><h1 id="camp-title">Cambridge Entry</h1></div>
      </div>
      <Disclaimer />
      <div class="c-card c-pad">
        <h2>Choose your route</h2>
        <p class="c-body">
          Albert, a mature applicant with a GED and six years as a software engineer, works his way to a Cambridge place by
          the real admissions route: three A levels, the TMUA, the January round at a mature college, interviews, and the offer.
          Both routes share Act I. The route can be switched until Act III.
        </p>
        <div class="c-acts">
          {(['maths', 'cs'] as const).map((r) => (
            <button key={r} type="button" class="c-btn" onClick={() => saveCampaign(newCampaign(r, now()))}>{ROUTE_NAMES[r]}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CampaignBody({ adm, c, p }: { adm: Admissions; c: CampaignState; p: Progress }) {
  const [log] = useState(loadDays);
  const s = summarize(adm, c, p, log, now());
  const due = s.lettersDue.join(',');
  useEffect(() => {
    if (s.lettersDue.length > 0) update((x) => deliverLetters(x, s.lettersDue, now()));
  }, [due]);
  const open = s.acts[s.act - 1];

  return (
    <section class="camp" aria-labelledby="camp-title">
      <div class="c-head">
        <div><div class="c-kicker">Preparation year</div><h1 id="camp-title">Cambridge Entry</h1></div>
        <RouteSwitch c={c} locked={s.locks.route} />
      </div>
      <Disclaimer />
      <StatusLine c={c} s={s} />
      <Steps s={s} />

      <div class="c-cols">
        <div class="c-stack">
          {open === undefined ? <Matriculated /> : <ActCard act={open} s={s} />}
          <PapersCard adm={adm} />
          <ApplicationCard c={c} s={s} />
          <InterviewCard c={c} s={s} />
          <div class="c-label">Still to come</div>
          <Later s={s} />
          <LettersCard adm={adm} c={c} s={s} />
        </div>
        <div class="c-stack">
          <CalendarCard s={s} />
          <CharacterCard s={s} />
          <ChoicesCard c={c} s={s} />
          <div class="c-card c-pad">
            <h2>How you get in</h2>
            <p class="c-body">
              Finish each act's chapters and sit its papers. Completing Act V admits you and opens Part IA Michaelmas. Scores never
              block you; the <AppLink to={{ view: 'report' }}>report</AppLink> shows where they would have landed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteSwitch({ c, locked }: { c: CampaignState; locked: string | null }) {
  return (
    <div class="c-seg" role="group" aria-label="Route">
      {(['maths', 'cs'] as const).map((r) => (
        <button
          key={r} type="button" aria-pressed={c.route === r} disabled={locked !== null && c.route !== r}
          title={locked ?? undefined}
          onClick={() => { if (locked === null) update((x) => ({ ...x, route: r as CampaignRoute })); }}
        >
          {ROUTE_NAMES[r]}
        </button>
      ))}
    </div>
  );
}

function StatusLine({ c, s }: { c: CampaignState; s: Summary }) {
  return (
    <dl class="c-status">
      <div><dt>Route</dt><dd>{ROUTE_NAMES[c.route]}</dd></div>
      <div><dt>Act</dt><dd>{s.act > 5 ? 'Matriculated' : `${ROMAN[s.act - 1]} of V`}</dd></div>
      <div><dt>Days studied</dt><dd class="c-num">{s.daysStudied}</dd></div>
      <div><dt>This week</dt><dd class="c-num">{hours(s.weekHours)} of {TARGET_WEEK_HOURS} h</dd></div>
    </dl>
  );
}

function Steps({ s }: { s: Summary }) {
  return (
    <ol class="c-steps" aria-label="Acts">
      {s.acts.map((a, i) => (
        <li key={a.n} class={a.complete ? 'done' : s.act === i + 1 ? 'cur' : ''} aria-current={s.act === i + 1 ? 'step' : undefined}>
          <span class="n" aria-hidden="true">{ROMAN[i]}</span>
          <span>{a.short}<span class="visually-hidden">{a.complete ? ', complete' : s.act === i + 1 ? ', current act' : ''}</span></span>
        </li>
      ))}
      <li class={s.act > 5 ? 'done' : ''}><span class="n" aria-hidden="true">M</span><span class="long">Matriculate</span></li>
    </ol>
  );
}

function Meter({ done, need, percent }: { done: number; need: number; percent?: boolean }) {
  const share = need === 0 ? 0 : done / need;
  return (
    <div class="c-meter">
      <span class="c-num c-tiny">{percent === true ? `${Math.round(100 * share)}%` : `${done} of ${need}`}</span>
      <div class="c-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, 100 * share)}%` }} /></div>
    </div>
  );
}

function ActCard({ act, s }: { act: Act; s: Summary }) {
  return (
    <div class="c-card c-act">
      <div class="c-top">
        <span class="c-seal" aria-hidden="true">{ROMAN[act.n - 1]}</span>
        <div>
          <div class="c-label">Current act</div>
          <h2>{act.title}</h2>
          <p class="c-real">{act.real}</p>
        </div>
      </div>
      <ul class="c-req">
        {act.requirements.map((r) => {
          const done = r.done >= r.need;
          return (
            <li key={r.id}>
              <span class={`c-box${done ? ' full' : r.done > 0 ? ' half' : ''}`} aria-hidden="true" />
              <div>
                <b>{r.label}</b>
                <small>{r.id === 'lessons' ? 'Course lessons mastered, until the book is restructured into Stage A chapters' : r.detail}</small>
              </div>
              <Meter done={r.done} need={r.need} percent={r.id === 'lessons'} />
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
    </div>
  );
}

function Matriculated() {
  return (
    <div class="c-card c-act">
      <div class="c-top">
        <span class="c-seal" aria-hidden="true">M</span>
        <div>
          <div class="c-label">Campaign complete</div>
          <h2>Matriculation</h2>
          <p class="c-real">Act V is complete. Part IA Michaelmas opens, and the results report is filed with your admission.</p>
        </div>
      </div>
    </div>
  );
}

function PapersCard({ adm }: { adm: Admissions }) {
  const papers = adm.registry.papers;
  const [id, setId] = useState(papers[0]?.id ?? '');
  const groups: [string, typeof papers][] = [
    ['A level', papers.filter((x) => x.exam === 'A level')],
    ['TMUA', papers.filter((x) => x.exam === 'TMUA')],
    ['STEP', papers.filter((x) => x.exam === 'STEP')],
  ];
  return (
    <div class="c-card c-pad">
      <h2>Past papers</h2>
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
    </div>
  );
}

function ApplicationCard({ c, s }: { c: CampaignState; s: Summary }) {
  const college = collegeOf(c.college);
  const canFile = s.act >= 3 && c.college !== null && c.applicationFiledAt === null;
  return (
    <div class="c-card c-pad">
      <div class="c-row"><h2>The application</h2><span class="c-tiny">Act III</span></div>
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
    </div>
  );
}

function InterviewCard({ c, s }: { c: CampaignState; s: Summary }) {
  const [shape, setShape] = useState<InterviewShape>(c.interviews.some((i) => i.shape === 'pre-reading') ? 'induction' : 'pre-reading');
  const f = collegeOf(c.college)?.formats[c.route];
  const second = s.effects.some((e) => e.id === 'second-mock');
  return (
    <div class="c-card c-pad">
      <div class="c-row"><h2>Mock interviews</h2><span class="c-tiny">Act IV</span></div>
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
        <ul class="c-list">
          {[...c.interviews].reverse().map((i) => <InterviewRow key={i.id} i={i} />)}
        </ul>
      )}
    </div>
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
      <div class="c-row">
        <b>{i.shape === 'pre-reading' ? 'Pre-reading' : 'Induction'}, {shortStamp(i.copiedAt)}</b>
        <span class="c-tiny">{i.mark === null ? 'No mark yet' : `${i.mark}/${INTERVIEW_MAX}`}</span>
      </div>
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
    </li>
  );
}

function Later({ s }: { s: Summary }) {
  const later = s.acts.filter((a) => a.n > s.act);
  return (
    <div class="c-later">
      {later.map((a) => (
        <div key={a.n} class="c-card">
          <span class="c-seal" aria-hidden="true">{ROMAN[a.n - 1]}</span>
          <div><b>{a.title}</b><p>{a.real}</p></div>
        </div>
      ))}
      {s.act <= 5 && (
        <div class="c-card">
          <span class="c-seal" aria-hidden="true">M</span>
          <div><b>Matriculation</b><p>Completing Act V admits you. Part IA Michaelmas opens, and the report is filed with your admission.</p></div>
        </div>
      )}
    </div>
  );
}

function LettersCard({ adm, c, s }: { adm: Admissions; c: CampaignState; s: Summary }) {
  if (c.letters.length === 0) return null;
  return (
    <div class="c-card c-pad">
      <h2>Letters</h2>
      <div class="c-letters">
        {[...c.letters].reverse().map((l) => {
          const t = letterText(adm, c, l.id, s.projection.entry);
          return (
            <details key={l.id} class="c-letter" open={l === c.letters[c.letters.length - 1]}>
              <summary><b>{t.title}</b> <span class="c-tiny">{shortStamp(l.at)}</span> <span class="c-sim">Simulated</span></summary>
              {t.lines.map((x, i) => <p key={i}>{x}</p>)}
              <p class="c-tiny">Simulated by this study plan from your own numbers. Not a letter from the University or a college.</p>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function CalendarCard({ s }: { s: Summary }) {
  const { projection: pr, cycle: cy } = s;
  const deadlines = actDeadlines(cy);
  const entryLine = pr.entry === null ? 'Beyond ten years at this pace'
    : pr.slipped ? `Slipped to October ${pr.entry} entry` : `On course for October ${pr.entry} entry`;
  return (
    <div class="c-card c-pad">
      <h2>The calendar</h2>
      <p class={`c-entry${pr.slipped ? ' warn' : ''}`}>{entryLine}</p>
      <p class="c-tiny">
        Pace: {hours(s.pace.hoursPerWeek)} h a week{s.pace.logged ? ', from the blocks ticked off in the day planner over the last two weeks' : `, the ${TARGET_WEEK_HOURS}-hour target (no hours ticked off in the last two weeks)`}.
      </p>
      <table class="c-table">
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
      <p class="c-cite">
        Deadlines for October {cy.entry} entry. *Estimates: 2028 dates are not published, so the 2027-entry dates (UCAS 13 January, My Cambridge
        Application 20 January, interviews from 30 March, TMUA registration by 21 December) are used a year on; the TMUA sitting, STEP, and
        results days are approximate. Hours for chapters the book does not have yet are estimates: TMUA notes {ESTIMATE_HOURS.tmuaNotes} h,
        statement {ESTIMATE_HOURS.statement} h, Stage B {ESTIMATE_HOURS.stageB} h, Stage C {ESTIMATE_HOURS.stageC} h.
      </p>
    </div>
  );
}

const shortDate = (d: string): string => (d >= '9999' ? 'never' : new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }));

function StatBar({ st }: { st: Stat }) {
  return (
    <div class="c-stat" title={st.basis}>
      <span>{st.label}</span>
      <span class="c-bar" aria-hidden="true"><i style={{ width: `${st.value ?? 0}%` }} /></span>
      <span class="v c-num">{st.value === null ? 'none' : st.value}</span>
    </div>
  );
}

function CharacterCard({ s }: { s: Summary }) {
  const on = new Set(s.effects.map((e) => e.id));
  const label = (id: string): string => s.stats.find((x) => x.id === id)?.label ?? id;
  return (
    <div class="c-card c-pad">
      <div class="c-who">
        <div class="c-av" aria-hidden="true">A</div>
        <div><b>Albert</b><div class="c-tiny">Mature applicant, GED, software engineer for 6 years, Brooklyn</div></div>
      </div>
      {s.stats.map((st) => <StatBar key={st.id} st={st} />)}
      <p class="c-tiny">From real data only: course topics mastered by area, marks in timed papers, and mock interview marks. "none": no data yet.</p>
      <h3 class="c-h3">Effects</h3>
      <table class="c-table">
        <thead><tr><th scope="col">When</th><th scope="col">Then</th></tr></thead>
        <tbody>
          {EFFECT_RULES.map((r) => (
            <tr key={r.id} class={on.has(r.id) ? 'on' : ''}>
              <td>{label(r.stat)} {r.when === 'below' ? 'below' : 'at or above'} {r.threshold}</td>
              <td>{r.effect}{on.has(r.id) ? <b class="c-pill good"> In force</b> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChoicesCard({ c, s }: { c: CampaignState; s: Summary }) {
  const { locks } = s;
  const college = collegeOf(c.college);
  const f = college?.formats[c.route];
  return (
    <div class="c-card c-pad">
      <h2>Choices</h2>
      <label class="c-field">
        <span>College</span>
        <select
          value={c.college ?? ''} disabled={locks.college !== null}
          onChange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            update((x) => ({ ...x, college: v === '' ? null : (v as CollegeId) }));
          }}
        >
          <option value="">Not chosen</option>
          {COLLEGES.map((x) => <option key={x.id} value={x.id}>{x.name}{x.formats[c.route].verified ? '' : ' (unverified)'}</option>)}
        </select>
      </label>
      {locks.college !== null && <p class="c-tiny">{locks.college}</p>}
      {f !== undefined && (
        <dl class="c-format">
          <div><dt>Interview</dt><dd>{f.interviews}</dd></div>
          <div><dt>Test at interview</dt><dd>{f.test}</dd></div>
          <div><dt>Offer</dt><dd>{f.offer}</dd></div>
          <div><dt>Source</dt><dd>{f.source}{f.verified ? ', verified 2026-10-05' : ', unverified'}</dd></div>
        </dl>
      )}
      <p class="c-tiny">{COLLEGE_COMMON}</p>

      <div class="c-label c-gap">A level order (Act I)</div>
      <ol class="c-order">
        {c.aLevelOrder.map((sub: Subject, i) => (
          <li key={sub}>
            <span>{SUBJECT_NAMES[sub]}</span>
            <span class="c-acts">
              <button type="button" class="c-icon" disabled={locks.order !== null || i === 0} aria-label={`Move ${SUBJECT_NAMES[sub]} earlier`} onClick={() => update((x) => ({ ...x, aLevelOrder: moveSubject(x.aLevelOrder, sub, -1) }))}>↑</button>
              <button type="button" class="c-icon" disabled={locks.order !== null || i === c.aLevelOrder.length - 1} aria-label={`Move ${SUBJECT_NAMES[sub]} later`} onClick={() => update((x) => ({ ...x, aLevelOrder: moveSubject(x.aLevelOrder, sub, 1) }))}>↓</button>
            </span>
          </li>
        ))}
      </ol>
      {locks.order !== null && <p class="c-tiny">{locks.order}</p>}

      <div class="c-label c-gap">TMUA sitting</div>
      <div class="c-seg" role="group" aria-label="TMUA sitting">
        {(['october', 'january'] as const).map((x) => (
          <button
            key={x} type="button" aria-pressed={c.tmuaSitting === x} disabled={locks.sitting !== null && c.tmuaSitting !== x}
            onClick={() => { if (locks.sitting === null) update((y) => ({ ...y, tmuaSitting: x })); }}
          >
            {x === 'october' ? 'October' : 'January'}
          </button>
        ))}
      </div>
      <p class="c-tiny">{locks.sitting ?? 'October is three months earlier, so Act II must finish sooner. Mature colleges accept the January sitting.'}</p>
      {locks.route !== null && <p class="c-tiny">{locks.route}</p>}
    </div>
  );
}
