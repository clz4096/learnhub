/**
 * The honest report (mastery/DESIGN-ADMISSIONS.md, "The honest report"), in the minimalist
 * look: every paper sat, compared with published figures, each one cited. STEP marks on a
 * hairline scale with that year's boundary ticks and an accent marker, and among that
 * year's real candidates; A level papers on their grade boundaries; TMUA as raw marks with
 * the context scale; the interviews; then the offer, condition by condition, and the odds
 * as plain ruled lists.
 */
import { useState } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import {
  INTERVIEW_MAX, INTERVIEW_PASS, ROUTE_NAMES, SUBJECT_NAMES, aLevelRows, collegeOf, offerConditions, stepRows, tmuaRows,
  type Admissions, type Campaign, type StepRow,
} from '@/model/campaign';
import { campaign } from '@/model/campaignStore';
import { summarize } from '@/model/campaignSummary';
import { loadDays } from '@/model/dayLog';
import { now } from '@/model/store';
import { AppLink, WithAdmissions, entryLine, shortStamp } from '@/ui/campaignShared';
import { AdmissionTabs } from '@/ui/views/Campaign';

/** TMUA context, October 2024 sitting (UAT-UK TMUA technical report 2024-25), and the unverified offer-holder average. */
export const TMUA_CONTEXT = { median: 4.5, p90: 7.0, offerHolders: 6.6 } as const;

/** 2025 cycle success rates (Cambridge undergraduate admissions statistics). */
export const ODDS: readonly { rate: string; what: string }[] = [
  { rate: '7.4%', what: 'Computer Science, from 1,739 applications' },
  { rate: '12.7%', what: 'Mathematics, from 2,032 applications' },
  { rate: '5.5%', what: 'Applicants from the USA, all courses' },
  { rate: '19.4%', what: 'Applicants aged 21 and over' },
];

export function ReportView({ p }: { p: Progress }) {
  const c = campaign.value;
  if (c === null) {
    return (
      <section class="camp" aria-labelledby="report-title">
        <div class="ds-eyebrow">Admission</div>
        <h1 id="report-title">Results report</h1>
        <p class="lead">Your papers, set among the real candidates who sat them.</p>
        <AdmissionTabs />
        <p class="c-body">Nothing to report yet. Begin the campaign and sit a paper: <AppLink to={{ view: 'campaign' }}>Campaign</AppLink>.</p>
      </section>
    );
  }
  return <WithAdmissions>{(adm) => <ReportBody adm={adm} c={c} p={p} />}</WithAdmissions>;
}

function ReportBody({ adm, c, p }: { adm: Admissions; c: Campaign; p: Progress }) {
  const [log] = useState(loadDays);
  const s = summarize(adm, c, p, log, now());
  const steps = stepRows(adm, c);
  const pr = s.projection;
  return (
    <section class="camp" aria-labelledby="report-title">
      <div class="ds-eyebrow">Admission</div>
      <h1 id="report-title">Results report</h1>
      <p class="lead">Your papers, set among the real candidates who sat them. Your marks are your own; boundaries and statistics are published figures.</p>
      <AdmissionTabs />
      <p class={`c-entry${pr.slipped ? ' warn' : ''}`}>{pr.entry === null ? 'Entry: beyond ten years at this pace' : entryLine(pr)}</p>
      <ul class="ruled">
        <li><span>Route</span><span class="r">{ROUTE_NAMES[c.route]}</span></li>
        <li><span>College</span><span class="r">{collegeOf(c.college)?.name ?? 'not chosen'}</span></li>
        <li><span>A level order</span><span class="r" /><span class="s">{c.aLevelOrder.map((x) => SUBJECT_NAMES[x].replace('A level ', '')).join(', then ')}</span></li>
        <li><span>TMUA sitting</span><span class="r">{c.tmuaSitting === 'october' ? 'October' : 'January'}</span></li>
      </ul>

      {c.route === 'maths' && steps.length === 0 && (
        <section class="sec" aria-labelledby="step-none"><div class="sec-h"><h2 id="step-none">STEP</h2></div><p class="c-tiny">No STEP paper marked yet.</p></section>
      )}
      {[...steps].reverse().map((r) => <StepSection key={r.sitting.id} r={r} />)}
      <ALevelSection adm={adm} c={c} />
      <TmuaSection adm={adm} c={c} />
      <InterviewsSection c={c} />

      <section class="sec" aria-labelledby="against-offer">
        <div class="sec-h"><h2 id="against-offer">Against the offer</h2></div>
        <ul class="ruled c-cond">
          {offerConditions(adm, c).map((x) => (
            <li key={x.label}>
              <span>{x.label}</span>
              <span class={`r${x.status === 'met' ? ' cam' : ''}`}>{x.status === 'met' ? 'met' : x.status === 'short' ? 'short' : 'pending'}</span>
              <span class="s">{x.need}; you: {x.you}</span>
            </li>
          ))}
        </ul>
        <p class="note">
          Typical offers: Cambridge course pages and the Faculty of Mathematics admissions FAQ, 2027 entry. Mathematics: A*A*A plus grade 1 in STEP 2
          and STEP 3; Computer Science: A*A*A, often with A* in Mathematics or Further Mathematics. A level grades here are per paper, on that paper's
          component boundaries; a real A level grade comes from all its papers together. The latest sitting of each paper counts.
        </p>
      </section>

      <section class="sec" aria-labelledby="odds">
        <div class="sec-h"><h2 id="odds">The odds, 2025 cycle</h2></div>
        <ul class="ruled">
          {ODDS.map((o) => <li key={o.what}><span>{o.what}</span><span class="r">{o.rate}</span></li>)}
        </ul>
        <p class="note">Cambridge undergraduate admissions statistics, 2025 cycle: offers as a share of applications. For context only.</p>
      </section>
    </section>
  );
}

const pctOf = (v: number, max = 120): string => `${(100 * v) / max}%`;

function StepSection({ r }: { r: StepRow }) {
  const b = r.boundaries;
  const ticks: [string, number][] = [['3', b['3']], ['2', b['2']], ['1', b['1']], ['S', b.S]];
  const share = Math.round(100 * r.atOrBelow);
  const id = `step-${r.sitting.id}`;
  return (
    <section class="sec" aria-labelledby={id}>
      <div class="sec-h"><h2 id={id}>{r.paper} · {r.year} paper</h2><span>sat {shortStamp(r.sitting.startedAt)}</span></div>
      <div class="figure"><span class="c-num">{r.mark} / 120</span> · <span class={r.grade === '1' || r.grade === 'S' ? 'cam' : ''}>Grade {r.grade}</span></div>
      <div class="scale" role="img" aria-label={`${r.mark} out of 120 on the ${r.year} ${r.paper} grade boundaries: S ${b.S}, 1 ${b['1']}, 2 ${b['2']}, 3 ${b['3']}`}>
        <span class="end lo" style={{ left: '0%' }}><span>0</span></span>
        {ticks.map(([g, v]) => <span key={g} class="b" style={{ left: pctOf(v) }}><span>{g} · {v}</span></span>)}
        <span class="end hi" style={{ left: '100%' }}><span>120</span></span>
        <span class="m" style={{ left: pctOf(r.mark) }}><span>{r.mark}</span></span>
      </div>
      <p class="c-body">
        {r.grade === 'U' ? `Below grade 3 (${b['3']}).` : `${r.cumulative}% of candidates reached grade ${r.grade} or better that year.`}{' '}
        {share}% of that year's {r.candidates.toLocaleString('en-US')} candidates scored {r.mark} or less. The offer asks for grade 1, which needed {b['1']}.
      </p>
      <p class="note">
        Boundaries and grade shares: OCR, "Explanation of results for STEP {r.year}". Candidates at each mark: read from that document's
        distribution chart; the total is reconstructed, not printed. Best six answers count, 20 marks each.
      </p>
    </section>
  );
}

function ALevelSection({ adm, c }: { adm: Admissions; c: Campaign }) {
  const rows = aLevelRows(adm, c);
  return (
    <section class="sec" aria-labelledby="a-level-papers">
      <div class="sec-h"><h2 id="a-level-papers">A level papers</h2></div>
      {rows.length === 0 ? <p class="c-tiny">No A level paper marked yet.</p> : (
        <div class="c-scroll">
          <table class="rec">
            <thead><tr><th scope="col">Paper</th><th scope="col">Mark</th><th scope="col">Grade</th><th scope="col">A* from</th></tr></thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.sitting.id}>
                  <th scope="row">{r.paper.paper} {r.paper.series ?? r.paper.year}</th>
                  <td class="c-num">{r.mark} / {r.max}</td>
                  <td>{r.grade}</td>
                  <td class="c-num">{r.aStar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="note">Grade boundaries: Pearson Edexcel notional component boundaries (Mathematics, Further Mathematics) and OCR component boundaries (Computer Science), for that paper's June series.</p>
    </section>
  );
}

function TmuaSection({ adm, c }: { adm: Admissions; c: Campaign }) {
  const rows = tmuaRows(adm, c);
  // The scale runs from 1.0 to 9.0.
  const at = (v: number): string => pctOf(v - 1, 8);
  return (
    <section class="sec" aria-labelledby="tmua">
      <div class="sec-h"><h2 id="tmua">TMUA</h2></div>
      {rows.length === 0 ? <p class="c-tiny">No TMUA paper checked yet.</p> : (
        <ul class="ruled c-list">
          {rows.map((r) => (
            <li key={r.year}>
              <span>{r.year} papers</span>
              {r.p1 !== null && r.p2 !== null
                ? <><span class="r">{r.p1 + r.p2} / 40 raw</span><span class="s">Paper 1: {r.p1}, Paper 2: {r.p2}</span></>
                : <><span class="r">Paper {r.p1 !== null ? 1 : 2}: {r.p1 ?? r.p2} / 20 raw</span><span class="s">Sit the other paper for the full test.</span></>}
            </li>
          ))}
        </ul>
      )}
      <p class="c-body">Past papers have no official conversion to the 1.0 to 9.0 scale, so raw marks are not put on it. The scale is context.</p>
      <div class="scale context" aria-hidden="true">
        <span class="end lo" style={{ left: '0%' }}><span>1.0</span></span>
        <span class="b" style={{ left: at(TMUA_CONTEXT.median) }}><span>median {TMUA_CONTEXT.median}</span></span>
        <span class="b" style={{ left: at(TMUA_CONTEXT.offerHolders) }}><span>offers {TMUA_CONTEXT.offerHolders}*</span></span>
        <span class="b" style={{ left: at(TMUA_CONTEXT.p90) }}><span>90th {TMUA_CONTEXT.p90.toFixed(1)}</span></span>
        <span class="end hi" style={{ left: '100%' }}><span>9.0</span></span>
      </div>
      <p class="visually-hidden">On the 1.0 to 9.0 scale: median {TMUA_CONTEXT.median}, 90th percentile {TMUA_CONTEXT.p90.toFixed(1)}, Computer Science offer holders {TMUA_CONTEXT.offerHolders} (unverified).</p>
      <p class="note">
        Answer keys: UAT-UK, TMUA preparation materials (esat-tmua.ac.uk). Median and 90th percentile: October 2024 sitting, UAT-UK TMUA technical report
        2024-25. *Unverified: Computer Science offer holders averaged 6.6, applicants 4.55 to 4.6, lowest offer 3.8 (FOI-2026-413 as quoted by third-party sites).
      </p>
    </section>
  );
}

function InterviewsSection({ c }: { c: Campaign }) {
  const heard = c.interviews.filter((i) => i.mark !== null);
  return (
    <section class="sec" aria-labelledby="interviews">
      <div class="sec-h"><h2 id="interviews">Interviews</h2></div>
      {heard.length === 0 ? <p class="c-tiny">No mock interview marked yet.</p> : (
        <ul class="ruled c-list">
          {heard.map((i) => (
            <li key={i.id}>
              <span>{i.shape === 'pre-reading' ? 'Pre-reading' : 'Induction'}, {shortStamp(i.copiedAt)}</span>
              <span class="r">{i.mark} / {INTERVIEW_MAX}, {(i.mark as number) >= INTERVIEW_PASS ? 'pass' : 'below the pass'}</span>
              {i.notes !== '' && <span class="s">{i.notes}</span>}
            </li>
          ))}
        </ul>
      )}
      <p class="note">The supervision mark scale: {INTERVIEW_PASS}/{INTERVIEW_MAX} is a pass.</p>
    </section>
  );
}
