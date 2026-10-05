/**
 * The honest report (mastery/DESIGN-ADMISSIONS.md, "The honest report"): every paper sat,
 * compared with published figures, each one cited. STEP marks on that year's boundaries and
 * among that year's real candidates; A level papers on their grade boundaries; TMUA as raw
 * marks with the context scale; the interviews; the offer, condition by condition; the odds.
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
import { AppLink, WithAdmissions, shortStamp } from '@/ui/campaignShared';

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
        <div class="c-head"><div><div class="c-kicker">Measured against published figures</div><h1 id="report-title">Results report</h1></div></div>
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
      <div class="c-head">
        <div><div class="c-kicker">Measured against published figures</div><h1 id="report-title">Results report</h1></div>
        <span class="c-tiny">Your marks are your own. Boundaries and statistics are published figures.</span>
      </div>
      <div class="c-card c-pad">
        <p class={`c-entry${pr.slipped ? ' warn' : ''}`}>
          {pr.entry === null ? 'Entry: beyond ten years at this pace' : pr.slipped ? `Slipped to October ${pr.entry} entry` : `On course for October ${pr.entry} entry`}
        </p>
        <dl class="c-format">
          <div><dt>Route</dt><dd>{ROUTE_NAMES[c.route]}</dd></div>
          <div><dt>College</dt><dd>{collegeOf(c.college)?.name ?? 'not chosen'}</dd></div>
          <div><dt>A level order</dt><dd>{c.aLevelOrder.map((x) => SUBJECT_NAMES[x].replace('A level ', '')).join(', then ')}</dd></div>
          <div><dt>TMUA sitting</dt><dd>{c.tmuaSitting === 'october' ? 'October' : 'January'}</dd></div>
        </dl>
      </div>
      <div class="c-cols">
        <div class="c-stack">
          {c.route === 'maths' && steps.length === 0 && (
            <div class="c-card c-pad"><h2>STEP</h2><p class="c-tiny">No STEP paper marked yet.</p></div>
          )}
          {[...steps].reverse().map((r) => <StepCard key={r.sitting.id} r={r} />)}
          <ALevelCard adm={adm} c={c} />
          <TmuaCard adm={adm} c={c} />
          <InterviewsCard c={c} />
        </div>
        <div class="c-stack">
          <div class="c-card c-pad">
            <h2>Against the offer</h2>
            <ul class="c-cond">
              {offerConditions(adm, c).map((x) => (
                <li key={x.label}>
                  <div><b>{x.label}</b><small>{x.need}; you: {x.you}</small></div>
                  <span class={`c-pill ${x.status === 'met' ? 'good' : x.status === 'short' ? 'warn' : ''}`}>{x.status === 'met' ? 'Met' : x.status === 'short' ? 'Short' : 'Pending'}</span>
                </li>
              ))}
            </ul>
            <p class="c-cite">
              Typical offers: Cambridge course pages and the Faculty of Mathematics admissions FAQ, 2027 entry. Mathematics: A*A*A plus grade 1 in STEP 2
              and STEP 3; Computer Science: A*A*A, often with A* in Mathematics or Further Mathematics. A level grades here are per paper, on that paper's
              component boundaries; a real A level grade comes from all its papers together. The latest sitting of each paper counts.
            </p>
          </div>
          <div class="c-card c-pad">
            <h2>The odds</h2>
            <div class="c-odds">
              {ODDS.map((o) => <div key={o.what}><b>{o.rate}</b><span>{o.what}</span></div>)}
            </div>
            <p class="c-cite">Cambridge undergraduate admissions statistics, 2025 cycle: offers as a share of applications. For context only.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const pctOf = (v: number): string => `${(100 * v) / 120}%`;

function StepCard({ r }: { r: StepRow }) {
  const b = r.boundaries;
  const zones: [string, number, number][] = [['U', 0, b['3']], ['3', b['3'], b['2']], ['2', b['2'], b['1']], ['1', b['1'], b.S], ['S', b.S, 120]];
  const good = r.grade === '1' || r.grade === 'S';
  const share = Math.round(100 * r.atOrBelow);
  return (
    <div class="c-card c-pad">
      <div class="c-row">
        <div><div class="c-label">{r.paper}, {r.year} paper, sat {shortStamp(r.sitting.startedAt)}</div><h2 class="c-num">{r.mark} / 120</h2></div>
        <span class={`c-pill ${good ? 'good' : 'warn'}`}>Grade {r.grade}</span>
      </div>
      <div class="c-scale" role="img" aria-label={`${r.mark} out of 120 on the ${r.year} ${r.paper} grade boundaries: S ${b.S}, 1 ${b['1']}, 2 ${b['2']}, 3 ${b['3']}`}>
        {zones.map(([g, from, to]) => <span key={g} class={`zone z${g}`} style={{ left: pctOf(from), width: pctOf(to - from) }}>{to - from >= 8 ? g : ''}</span>)}
        <span class="mark" style={{ left: pctOf(r.mark) }}>{r.mark}</span>
      </div>
      <div class="c-axis" aria-hidden="true">{[0, b['3'], b['2'], b['1'], b.S, 120].map((v) => <span key={v} style={{ left: pctOf(v) }}>{v}</span>)}</div>
      <p class="c-body">
        {r.grade === 'U' ? `Below grade 3 (${b['3']}).` : `${r.cumulative}% of candidates reached grade ${r.grade} or better that year.`}{' '}
        {share}% of that year's {r.candidates.toLocaleString('en-US')} candidates scored {r.mark} or less. The offer asks for grade 1, which needed {b['1']}.
      </p>
      <p class="c-cite">
        Boundaries and grade shares: OCR, "Explanation of results for STEP {r.year}". Candidates at each mark: read from that document's
        distribution chart; the total is reconstructed, not printed. Best six answers count, 20 marks each.
      </p>
    </div>
  );
}

function ALevelCard({ adm, c }: { adm: Admissions; c: Campaign }) {
  const rows = aLevelRows(adm, c);
  return (
    <div class="c-card c-pad">
      <h2>A level papers</h2>
      {rows.length === 0 ? <p class="c-tiny">No A level paper marked yet.</p> : (
        <div class="c-scroll">
          <table class="c-table">
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
      <p class="c-cite">Grade boundaries: Pearson Edexcel notional component boundaries (Mathematics, Further Mathematics) and OCR component boundaries (Computer Science), for that paper's June series.</p>
    </div>
  );
}

const tmuaPos = (v: number): string => `${(100 * (v - 1)) / 8}%`;

function TmuaCard({ adm, c }: { adm: Admissions; c: Campaign }) {
  const rows = tmuaRows(adm, c);
  return (
    <div class="c-card c-pad">
      <h2>TMUA</h2>
      {rows.length === 0 ? <p class="c-tiny">No TMUA paper checked yet.</p> : (
        <ul class="c-list">
          {rows.map((r) => (
            <li key={r.year}>
              <b>{r.year}</b>{' '}
              {r.p1 !== null && r.p2 !== null
                ? <span class="c-num">{r.p1 + r.p2} / 40 raw (Paper 1: {r.p1}, Paper 2: {r.p2})</span>
                : <span class="c-num">Paper {r.p1 !== null ? 1 : 2}: {r.p1 ?? r.p2} / 20 raw; sit the other paper for the full test</span>}
            </li>
          ))}
        </ul>
      )}
      <p class="c-body">Past papers have no official conversion to the 1.0 to 9.0 scale, so raw marks are not put on it. The scale is context.</p>
      <div class="c-tmua" aria-hidden="true">
        <span class="pt" style={{ left: tmuaPos(TMUA_CONTEXT.median) }}>median {TMUA_CONTEXT.median}</span>
        <span class="pt off" style={{ left: tmuaPos(TMUA_CONTEXT.offerHolders) }}>offers {TMUA_CONTEXT.offerHolders}*</span>
        <span class="pt low" style={{ left: tmuaPos(TMUA_CONTEXT.p90) }}>90th {TMUA_CONTEXT.p90.toFixed(1)}</span>
        <span class="lab" style={{ left: '0%' }}>1.0</span><span class="lab" style={{ left: '100%' }}>9.0</span>
      </div>
      <p class="visually-hidden">On the 1.0 to 9.0 scale: median {TMUA_CONTEXT.median}, 90th percentile {TMUA_CONTEXT.p90.toFixed(1)}, Computer Science offer holders {TMUA_CONTEXT.offerHolders} (unverified).</p>
      <p class="c-cite">
        Answer keys: UAT-UK, TMUA preparation materials (esat-tmua.ac.uk). Median and 90th percentile: October 2024 sitting, UAT-UK TMUA technical report
        2024-25. *Unverified: Computer Science offer holders averaged 6.6, applicants 4.55 to 4.6, lowest offer 3.8 (FOI-2026-413 as quoted by third-party sites).
      </p>
    </div>
  );
}

function InterviewsCard({ c }: { c: Campaign }) {
  const heard = c.interviews.filter((i) => i.mark !== null);
  return (
    <div class="c-card c-pad">
      <h2>Interviews</h2>
      {heard.length === 0 ? <p class="c-tiny">No mock interview marked yet.</p> : (
        <ul class="c-list">
          {heard.map((i) => (
            <li key={i.id}>
              <b class="c-num">{i.mark} / {INTERVIEW_MAX}</b> {(i.mark as number) >= INTERVIEW_PASS ? 'pass' : 'below the pass'}{', '}
              {i.shape === 'pre-reading' ? 'pre-reading' : 'induction'}, {shortStamp(i.copiedAt)}{i.notes === '' ? '' : `: ${i.notes}`}
            </li>
          ))}
        </ul>
      )}
      <p class="c-cite">The supervision mark scale: {INTERVIEW_PASS}/{INTERVIEW_MAX} is a pass.</p>
    </div>
  );
}
